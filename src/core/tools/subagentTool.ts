import { ToolUse, AskApproval, HandleError, PushToolResult, RemoveClosingTag } from "../../shared/tools"
import { Task } from "../task/Task"
import { formatResponse } from "../prompts/responses"
import { t } from "../../i18n"
import { validateSubAgentParams } from "../../roo_subagent/src/subagentValidation"
import delay from "delay"

interface SubAgentParams {
	description?: string
	message?: string
	/**
	 * Optional predefined agent type name (e.g., "code-reviewer", "bug-investigator").
	 * When provided, the system will look up the specific agent across all discovery locations
	 * (system -> project -> global priority) and prepend its system prompt to the task message.
	 */
	subagent_type?: string | null
	outputSchema?: any
	_text?: string // For JSON-style parameters
}

const SUBAGENT_SYSTEM_MESSAGE =
	"You are a subagent. You work autonomously and return the result to the parent agent. You cannot ask any questions to the user or parent agent.\nYou cannot ask follow up questions."

export async function subagentTool(
	cline: Task,
	block: ToolUse,
	askApproval: AskApproval,
	handleError: HandleError,
	pushToolResult: PushToolResult,
	removeClosingTag: RemoveClosingTag,
) {
	try {
		// Check if the current task is a subagent (parallel task)
		if (cline.isParallel) {
			cline.consecutiveMistakeCount++
			cline.recordToolError("subagent")
			pushToolResult(
				formatResponse.toolError(
					"You are a subagent. Remember, Subagents cannot launch other subagents or tasks. This operation is restricted to the main agent only. Please do the task by yourself.",
				),
			)
			return
		}

		if (block.partial) {
			const partialMessage = JSON.stringify({
				tool: "subagent",
				message: removeClosingTag("message", block.params._text),
			})

			await cline.ask("tool", partialMessage, block.partial).catch(() => {})
			return
		}

		if (!block.params._text) {
			cline.consecutiveMistakeCount++
			cline.recordToolError("subagent")
			pushToolResult(
				formatResponse.toolError("Subagent tool requires a JSON object or array of objects in its body."),
			)
			return
		}

		let subagentParams: SubAgentParams[] = []
		try {
			const parsedJson = JSON.parse(block.params._text)
			if (Array.isArray(parsedJson)) {
				subagentParams = parsedJson
			} else if (typeof parsedJson === "object" && parsedJson !== null) {
				subagentParams = [parsedJson]
			} else {
				throw new Error("Input must be a JSON object or an array of JSON objects.")
			}

			for (let i = 0; i < subagentParams.length; i++) {
				const params = subagentParams[i]
				if (!params.description || !params.message) {
					throw new Error(`Subagent at index ${i}: Missing required parameters 'description' and 'message'.`)
				}
			}
		} catch (e: any) {
			cline.consecutiveMistakeCount++
			cline.recordToolError("subagent")
			pushToolResult(formatResponse.toolError(`Invalid JSON for subagent tool: ${e.message}`))
			return
		}

		cline.consecutiveMistakeCount = 0

		//const didApprove = await askApproval("tool", toolMessage)
		// if (!didApprove) {
		// 	return
		// }

		const provider = cline.providerRef.deref()
		if (!provider) {
			return
		}

		if (cline.enableCheckpoints) {
			await cline.checkpointSave(true)
		}

		// Clear any remaining tasks and asks from previous runs
		if (typeof (provider as any).clearAllPendingTasksAndAsks === "function") {
			await (provider as any).clearAllPendingTasksAndAsks()
		} else {
			console.log("[SubagentTool] clearAllPendingTasksAndAsks method not found, skipping cleanup")
		}

		await delay(500)

		// Initialize empty parallel tasks state
		;(provider as any).parallelTasksState = []

		// Get discovered agents from Task cache if any subagent specifies a type
		let discovered: any = null
		const needsDiscovery = subagentParams.some((p) => p && p.subagent_type)
		if (needsDiscovery) {
			try {
				// Use the Task's cached discovered agents
				discovered = await cline.getDiscoveredAgents()
			} catch (error) {
				console.warn(
					"[SubagentTool] Failed to get discovered agents from Task cache. Proceeding without composition.",
					error,
				)
				discovered = null
			}
		}

		const createdTasks: string[] = []
		const failedTasks: string[] = []

		for (let i = 0; i < subagentParams.length; i++) {
			const params = subagentParams[i]

			// Base task message with necessary unescaping
			let finalMessage = params.message!.replace(/\\\\@/g, "\\@")

			// If a specific agent type is specified, find and prepend its system prompt
			if (params.subagent_type && discovered) {
				try {
					// Dynamic import to get the findAgentByName function
					const mod = await import("../../roo_subagent/src/agentDiscovery")
					const foundAgent = mod.findAgentByName(discovered.agents, params.subagent_type)

					if (foundAgent && foundAgent.systemPrompt) {
						const systemPrompt = String(foundAgent.systemPrompt).trim()
						if (systemPrompt.length > 0) {
							finalMessage = `${systemPrompt}\n\n${finalMessage}`
							console.log(`[SubagentTool] Using predefined agent '${params.subagent_type}' system prompt`)
						}
					} else {
						console.warn(
							`[SubagentTool] No predefined agent found for subagent_type='${params.subagent_type}'. Using task message only.`,
						)
					}
				} catch (e) {
					console.warn("[SubagentTool] Error composing predefined agent prompt. Using task message only.", e)
				}
			}

			try {
				// Add a small random delay to stagger the start of subtasks
				// to mitigate potential race conditions with concurrent API requests.
				await delay(Math.random() * 500 + 50) // 50-550 ms
				console.log(`[SubagentTool] Creating subagent task ${i + 1}/ with  message:`, finalMessage)
				const newCline = await provider.createTask(finalMessage, undefined, cline, {}, true)
				if (newCline) {
					cline.emit("taskSpawned" as any, newCline.taskId)
					createdTasks.push(`'${params.description}' (ID: ${newCline.taskId})`)

					// Add the new task to parallelTasksState
					const newTask = {
						taskId: newCline.taskId,
						description: params.description!,
						status: "running" as const,
						subagent_type: params.subagent_type || undefined,
					}
					;(provider as any).parallelTasksState.push(newTask)

					// Send targeted update for parallelTasks only
					await provider.postMessageToWebview({
						type: "parallelTasksUpdate",
						payload: (provider as any).parallelTasksState,
					})
				} else {
					failedTasks.push(`'${params.description}': Policy restriction prevented task creation.`)
				}
			} catch (error) {
				cline.consecutiveMistakeCount++
				cline.recordToolError("subagent")
				console.error("[SubagentTool] Error creating subagent task:", error)
				// Handle error gracefully and continue with the next task
				failedTasks.push(`'${params.description}': ${error instanceof Error ? error.message : String(error)}`)
			}
		}

		let resultMessage = ""
		if (createdTasks.length > 0) {
			resultMessage += `Successfully created ${createdTasks.length} parallel subagent(s):\n- ${createdTasks.join("\n- ")}`
		}

		if (failedTasks.length > 0) {
			if (resultMessage) resultMessage += "\n\n"
			resultMessage += `Failed to create ${failedTasks.length} subagent(s):\n- ${failedTasks.join("\n- ")}`
		}

		pushToolResult(resultMessage)

		if (createdTasks.length > 0) {
			cline.isPaused = true
			cline.emit("taskPaused" as any)
		}
	} catch (error) {
		await handleError("creating subagent tasks", error)
	}
}
