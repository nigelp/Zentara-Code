import cloneDeep from "clone-deep"
import { serializeError } from "serialize-error"
import { outputChannel } from "../../zentara_debug/src/vscodeUtils"
import { logIncomingMessage } from "../logging/messageLogger"
import type { ToolName, ClineAsk, ToolProgressStatus, ModeConfig } from "@zentara-code/types"
import { TelemetryService } from "@zentara-code/telemetry"

import { defaultModeSlug, getModeBySlug } from "../../shared/modes"
import type {
	ToolParamName,
	ToolResponse,
	ToolUse,
	DebugToolUse,
	LspToolUse,
	AskApproval,
	HandleError,
	PushToolResult,
} from "../../shared/tools"
import { trackToolUsage } from "../../zentara_tool_prompt_management/tool-optimization-integration"

import { fetchInstructionsTool } from "../tools/fetchInstructionsTool"
import { listFilesTool } from "../tools/listFilesTool"
import { globTool } from "../tools/globTool"
import { getReadFileToolDescription, readFileTool } from "../tools/readFileTool"
import { getSimpleReadFileToolDescription, simpleReadFileTool } from "../tools/simpleReadFileTool"
import { shouldUseSingleFileRead } from "@zentara-code/types"
import { writeToFileTool } from "../tools/writeToFileTool"
import { applyDiffTool } from "../tools/multiApplyDiffTool"
import { insertContentTool } from "../tools/insertContentTool"
import { searchAndReplaceTool } from "../tools/searchAndReplaceTool"
import { listCodeDefinitionNamesTool } from "../tools/listCodeDefinitionNamesTool"
import { searchFilesTool } from "../tools/searchFilesTool"
import { browserActionTool } from "../tools/browserActionTool"
import { executeCommandTool } from "../tools/executeCommandTool"
import { useMcpToolTool } from "../tools/useMcpToolTool"
import { accessMcpResourceTool } from "../tools/accessMcpResourceTool"
import { askFollowupQuestionTool } from "../tools/askFollowupQuestionTool"
import { switchModeTool } from "../tools/switchModeTool"
import { attemptCompletionTool } from "../tools/attemptCompletionTool"
import { newTaskTool } from "../tools/newTaskTool"
import { debugTool } from "../tools/debugTool"
import { lspTool } from "../tools/lspTool"
import { subagentTool } from "../tools/subagentTool"
import { fetchToolDescriptionTool } from "../tools/fetchToolDescriptionTool"

import { updateTodoListTool } from "../tools/updateTodoListTool"
import { generateImageTool } from "../tools/generateImageTool"

import { formatResponse } from "../prompts/responses"
import { validateToolUse } from "../tools/validateToolUse"
import { Task } from "../task/Task"
import { codebaseSearchTool } from "../tools/codebaseSearchTool"
import { experiments, EXPERIMENT_IDS } from "../../shared/experiments"
import { applyDiffToolLegacy } from "../tools/applyDiffTool"
const DEBUG_RACE = process.env.DEBUG_RACE === "true" || false
const raceLog = (context: string, taskId: string, data: any = {}) => {
	if (!DEBUG_RACE) return
	const timestamp = new Date().toISOString()
	const hrTime = process.hrtime.bigint()
	console.log(`[RACE ${timestamp}] [${hrTime}] [TASK ${taskId}] ${context}:`, JSON.stringify(data))
}

/**
 * Processes and presents assistant message content to the user interface.
 *
 * This function is the core message handling system that:
 * - Sequentially processes content blocks from the assistant's response.
 * - Displays text content to the user.
 * - Executes tool use requests with appropriate user approval.
 * - Manages the flow of conversation by determining when to proceed to the next content block.
 * - Coordinates file system checkpointing for modified files.
 * - Controls the conversation state to determine when to continue to the next request.
 *
 * The function uses a locking mechanism to prevent concurrent execution and handles
 * partial content blocks during streaming. It's designed to work with the streaming
 * API response pattern, where content arrives incrementally and needs to be processed
 * as it becomes available.
 */

import pWaitFor from "p-wait-for"

export async function presentAssistantMessage(cline: Task) {
	raceLog("START_PRESENT_ASSISTANT_MESSAGE", cline.taskId, {
		didCompleteReadingStream: cline.didCompleteReadingStream,
		currentStreamingContentIndex: cline.currentStreamingContentIndex,
		assistantMessageContent: cline.assistantMessageContent.length,
		AMcontent: cline.assistantMessageContent,
	})
	if (cline.abort) {
		return
		//throw new Error(`[Task#presentAssistantMessage] task ${cline.taskId}.${cline.instanceId} aborted`)
	}

	if (cline.presentAssistantMessageLocked) {
		cline.presentAssistantMessageHasPendingUpdates = true
		raceLog("PRESENT_ASSISTANT_MESSAGE_RETURN_presentAssistantMessageLocked_72", cline.taskId, {})
		return
	}

	cline.presentAssistantMessageLocked = true
	cline.presentAssistantMessageHasPendingUpdates = false
	raceLog("CHECK_USER_MESSAGE_CONTENT_READY", cline.taskId, {
		didCompleteReadingStream: cline.didCompleteReadingStream,
		currentStreamingContentIndex: cline.currentStreamingContentIndex,
		assistantMessageContent: cline.assistantMessageContent.length,
		AMcontent: cline.assistantMessageContent,
	})

	if (cline.currentStreamingContentIndex >= cline.assistantMessageContent.length) {
		// This may happen if the last content block was completed before
		// streaming could finish. If streaming is finished, and we're out of
		// bounds then this means we already  presented/executed the last
		// content block and are ready to continue to next request.
		if (cline.didCompleteReadingStream) {
			cline.userMessageContentReady = true
		}

		cline.presentAssistantMessageLocked = false
		raceLog("PRESENT_ASSISTANT_MESSAGE_RETURN_streaming_index_more_than_content_92", cline.taskId, {})
		return
	}

	const block = cloneDeep(cline.assistantMessageContent[cline.currentStreamingContentIndex]) // need to create copy bc while stream is updating the array, it could be updating the reference block properties too

	switch (block.type) {
		case "text": {
			if (cline.didRejectTool || cline.didAlreadyUseTool) {
				break
			}

			let content = block.content

			if (content) {
				// Have to do this for partial and complete since sending
				// content in thinking tags to markdown renderer will
				// automatically be removed.
				// Remove end substrings of <thinking or </thinking (below xml
				// parsing is only for opening tags).
				// Tthis is done with the xml parsing below now, but keeping
				// here for reference.
				// content = content.replace(/<\/?t(?:h(?:i(?:n(?:k(?:i(?:n(?:g)?)?)?$/, "")
				//
				// Remove all instances of <thinking> (with optional line break
				// after) and </thinking> (with optional line break before).
				// - Needs to be separate since we dont want to remove the line
				//   break before the first tag.
				// - Needs to happen before the xml parsing below.
				content = content.replace(/<thinking>\s?/g, "")
				content = content.replace(/\s?<\/thinking>/g, "")

				// Remove partial XML tag at the very end of the content (for
				// tool use and thinking tags), Prevents scrollview from
				// jumping when tags are automatically removed.
				const lastOpenBracketIndex = content.lastIndexOf("<")

				if (lastOpenBracketIndex !== -1) {
					const possibleTag = content.slice(lastOpenBracketIndex)

					// Check if there's a '>' after the last '<' (i.e., if the
					// tag is complete) (complete thinking and tool tags will
					// have been removed by now.)
					const hasCloseBracket = possibleTag.includes(">")

					if (!hasCloseBracket) {
						// Extract the potential tag name.
						let tagContent: string

						if (possibleTag.startsWith("</")) {
							tagContent = possibleTag.slice(2).trim()
						} else {
							tagContent = possibleTag.slice(1).trim()
						}

						// Check if tagContent is likely an incomplete tag name
						// (letters and underscores only).
						const isLikelyTagName = /^[a-zA-Z_]+$/.test(tagContent)

						// Preemptively remove < or </ to keep from these
						// artifacts showing up in chat (also handles closing
						// thinking tags).
						const isOpeningOrClosing = possibleTag === "<" || possibleTag === "</"

						// If the tag is incomplete and at the end, remove it
						// from the content.
						if (isOpeningOrClosing || isLikelyTagName) {
							content = content.slice(0, lastOpenBracketIndex).trim()
						}
					}
				}
			}

			await cline.say("text", content, undefined, block.partial)
			break
		}
		case "tool_use":
			const toolDescription = (): string => {
				switch (block.name) {
					case "execute_command":
						return `[${block.name} for '${block.params.command}']`
					case "read_file":
						// Check if this model should use the simplified description
						const modelId = cline.api.getModel().id
						if (shouldUseSingleFileRead(modelId)) {
							return getSimpleReadFileToolDescription(block.name, block.params)
						} else {
							return getReadFileToolDescription(block.name, block.params)
						}
					case "fetch_instructions":
						return `[${block.name} for '${block.params.task}']`
					case "write_to_file":
						return `[${block.name} for '${block.params.path}']`
					case "apply_diff":
						// Handle both legacy format and new multi-file format
						if (block.params.path) {
							return `[${block.name} for '${block.params.path}']`
						} else if (block.params.args) {
							// Try to extract first file path from args for display
							const match = block.params.args.match(/<file>.*?<path>([^<]+)<\/path>/s)
							if (match) {
								const firstPath = match[1]
								// Check if there are multiple files
								const fileCount = (block.params.args.match(/<file>/g) || []).length
								if (fileCount > 1) {
									return `[${block.name} for '${firstPath}' and ${fileCount - 1} more file${fileCount > 2 ? "s" : ""}]`
								} else {
									return `[${block.name} for '${firstPath}']`
								}
							}
						}
						return `[${block.name}]`
					case "search_files":
						return `[${block.name} for '${block.params.regex}'${
							block.params.file_pattern ? ` in '${block.params.file_pattern}'` : ""
						}]`
					case "insert_content":
						return `[${block.name} for '${block.params.path}']`
					case "search_and_replace":
						return `[${block.name} for '${block.params.path}']`
					case "list_files":
						return `[${block.name} for '${block.params.path}']`
					case "glob":
						return `[${block.name} for pattern '${block.params.pattern}']`
					case "list_code_definition_names":
						return `[${block.name} for '${block.params.path}']`
					case "browser_action":
						return `[${block.name} for '${block.params.action}']`
					case "use_mcp_tool":
						return `[${block.name} for '${block.params.server_name}']`
					case "access_mcp_resource":
						return `[${block.name} for '${block.params.server_name}']`
					case "ask_followup_question":
						return `[${block.name} for '${block.params.question}']`
					case "attempt_completion":
						return `[${block.name}]`
					case "switch_mode":
						return `[${block.name} to '${block.params.mode_slug}'${block.params.reason ? ` because: ${block.params.reason}` : ""}]`
					case "codebase_search": // Add case for the new tool
						return `[${block.name} for '${block.params.query}']`
					case "update_todo_list":
						return `[${block.name}]`
					case "new_task": {
						const mode = block.params.mode ?? defaultModeSlug
						const message = block.params.message ?? "(no message)"
						const modeName = getModeBySlug(mode, customModes)?.name ?? mode
						return `[${block.name} in ${modeName} mode: '${message}']`
					}
					case "fetch_tool_description": {
						const toolName = block.params.tool_name || "(no tool specified)"
						return `[${block.name} for '${toolName}']`
					}
					case "subagent": {
						let description = "(no description)"
						let preview = "(no message)"
						if (block.params._text) {
							try {
								const parsedParams = JSON.parse(block.params._text)
								description = parsedParams.description || "(no description)"
								preview = parsedParams.message
									? parsedParams.message.substring(0, 50) +
										(parsedParams.message.length > 50 ? "..." : "")
									: "(no message)"
							} catch (e) {
								// Fallback to default if parsing fails
							}
						}
						return `[${block.name}: ${description} - ${preview}]`
					}
					case "generate_image":
						return `[${block.name} for '${block.params.path}']`
					default:
						if (block.name.startsWith("lsp_")) {
							const operation = block.name.substring(4) || "operation"
							return `[lsp tool: ${operation}]`
						} else if (block.name.startsWith("debug_")) {
							// @ts-expect-error operation is part of debug tool params
							const operation = block.params?.operation || block.name.substring(6) || "operation"
							const program = block.params?.program ? ` for ${block.params.program}` : ""
							return `[debug tool: ${operation}${program}]`
						}
						// Fallback for any other unhandled tool names
						return `[${block.name}]`
				}
			}

			if (cline.didRejectTool) {
				// Ignore any tool content after user has rejected tool once.
				if (!block.partial) {
					cline.userMessageContent.push({
						type: "text",
						text: `Skipping tool ${getToolDescriptionString(block as ToolUse, undefined)} due to user rejecting a previous tool.`,
					})
				} else {
					// Partial tool after user rejected a previous tool.
					cline.userMessageContent.push({
						type: "text",
						text: `Tool ${getToolDescriptionString(block as ToolUse, undefined)} was interrupted and not executed due to user rejecting a previous tool.`,
					})
				}

				break
			}

			if (cline.didAlreadyUseTool) {
				// Ignore any content after a tool has already been used.
				cline.userMessageContent.push({
					type: "text",
					text: `Tool [${block.name}] was not executed because a tool has already been used in this message. Only one tool may be used per message. You must assess the first tool's result before proceeding to use the next tool.`,
				})

				break
			}

			const pushToolResult = (content: ToolResponse) => {
				cline.userMessageContent.push({
					type: "text",
					text: `${getToolDescriptionString(block as ToolUse, customModes)} Result:`,
				})

				if (typeof content === "string") {
					cline.userMessageContent.push({ type: "text", text: content || "(tool did not return anything)" })
				} else {
					cline.userMessageContent.push(...content)
				}

				// Once a tool result has been collected, ignore all other tool
				// uses since we should only ever present one tool result per
				// message.
				cline.didAlreadyUseTool = true
			}

			const askApproval = async (
				type: ClineAsk,
				partialMessage?: string,
				progressStatus?: ToolProgressStatus,
				isProtected?: boolean,
			) => {
				const { response, text, images } = await cline.ask(
					type,
					partialMessage,
					false,
					progressStatus,
					isProtected || false,
				)

				if (response !== "yesButtonClicked") {
					// Handle both messageResponse and noButtonClicked with text.
					if (text) {
						await cline.say("user_feedback", text, images)
						pushToolResult(formatResponse.toolResult(formatResponse.toolDeniedWithFeedback(text), images))
					} else {
						pushToolResult(formatResponse.toolDenied())
					}
					cline.didRejectTool = true
					return false
				}

				// Handle yesButtonClicked with text.
				if (text) {
					await cline.say("user_feedback", text, images)
					pushToolResult(formatResponse.toolResult(formatResponse.toolApprovedWithFeedback(text), images))
				}

				return true
			}

			const askFinishSubTaskApproval = async () => {
				// Ask the user to approve this task has completed, and he has
				// reviewed it, and we can declare task is finished and return
				// control to the parent task to continue running the rest of
				// the sub-tasks.
				const toolMessage = JSON.stringify({ tool: "finishTask" })
				return await askApproval("tool", toolMessage)
			}

			const handleError = async (action: string, error: Error) => {
				const errorString = `Error ${action}: ${JSON.stringify(serializeError(error))}`

				await cline.say(
					"error",
					`Error ${action}:\n${error.message ?? JSON.stringify(serializeError(error), null, 2)}`,
				)

				pushToolResult(formatResponse.toolError(errorString))
			}

			// If block is partial, remove partial closing tag so its not
			// presented to user.
			const removeClosingTag = (tag: ToolParamName, text?: string): string => {
				if (!block.partial) {
					return text || ""
				}

				if (!text) {
					return ""
				}

				// This regex dynamically constructs a pattern to match the
				// closing tag:
				// - Optionally matches whitespace before the tag.
				// - Matches '<' or '</' optionally followed by any subset of
				//   characters from the tag name.
				const tagRegex = new RegExp(
					`\\s?<\/?${tag
						.split("")
						.map((char) => `(?:${char})?`)
						.join("")}$`,
					"g",
				)

				return text.replace(tagRegex, "")
			}

			if (block.name !== "browser_action") {
				await cline.browserSession.closeBrowser()
			}

			if (!block.partial) {
				cline.recordToolUsage(block.name)
				TelemetryService.instance.captureToolUsage(cline.taskId, block.name)
				// Track tool usage for optimization system
				trackToolUsage(block.name, cline.taskId)
				let nameForTelemetry = block.name
				// If the tool is a specific debug operation (e.g., "debug_launch"),
				// map it to the generic "debug" tool name for telemetry purposes.
				// This assumes "debug" is a recognized ToolName and that the ToolName
				// schema has not yet been updated to include all individual debug_operations.
				if (nameForTelemetry.startsWith("debug_")) {
					nameForTelemetry = "debug"
				} else if (nameForTelemetry.startsWith("lsp_")) {
					nameForTelemetry = "use_mcp_tool"
				}
				// The following calls assume that `nameForTelemetry` (which is now either an original tool name
				// or "debug") is a string that is compatible with the expected ToolName type,
				// or that the functions can gracefully handle strings that might not strictly be ToolName.
				// If these functions strictly require a validated ToolName, further checks or schema updates are needed.
				cline.recordToolUsage(nameForTelemetry as ToolName)
			}

			// Validate tool use before execution.
			const { mode, customModes } = (await cline.providerRef.deref()?.getState()) ?? {}

			try {
				// For new debug_ tools, validation is handled by debugToolValidation.ts (called by debugTool.ts).
				// So, only call validateToolUse for non-debug_ tools here.
				if (!block.name.startsWith("debug_") && !block.name.startsWith("lsp_")) {
					validateToolUse(
						block.name as ToolName,
						mode ?? defaultModeSlug,
						customModes ?? [],
						{ apply_diff: cline.diffEnabled },
						block.params,
					)
				}
			} catch (error) {
				cline.consecutiveMistakeCount++
				pushToolResult(formatResponse.toolError(error.message))
				break
			}

			// Check for identical consecutive tool calls.
			if (!block.partial) {
				// Use the detector to check for repetition, passing the ToolUse
				// block directly.
				const repetitionCheck = cline.toolRepetitionDetector.check(block)

				// If execution is not allowed, notify user and break.
				if (!repetitionCheck.allowExecution && repetitionCheck.askUser) {
					// Handle repetition similar to mistake_limit_reached pattern.
					const { response, text, images } = await cline.ask(
						repetitionCheck.askUser.messageKey as ClineAsk,
						repetitionCheck.askUser.messageDetail.replace("{toolName}", block.name),
					)

					if (response === "messageResponse") {
						// Add user feedback to userContent.
						cline.userMessageContent.push(
							{
								type: "text" as const,
								text: `Tool repetition limit reached. User feedback: ${text}`,
							},
							...formatResponse.imageBlocks(images),
						)

						// Add user feedback to chat.
						await cline.say("user_feedback", text, images)

						// Track tool repetition in telemetry.
						TelemetryService.instance.captureConsecutiveMistakeError(cline.taskId)
					}

					// Return tool result message about the repetition
					pushToolResult(
						formatResponse.toolError(
							`Tool call repetition limit reached for ${block.name}. Please try a different approach.`,
						),
					)
					break
				}
			}

			switch (block.name) {
				case "write_to_file":
					await checkpointSaveAndMark(cline)
					await writeToFileTool(cline, block, askApproval, handleError, pushToolResult, removeClosingTag)
					break
				case "update_todo_list":
					await updateTodoListTool(cline, block, askApproval, handleError, pushToolResult, removeClosingTag)
					break
				case "apply_diff": {
					// Get the provider and state to check experiment settings
					const provider = cline.providerRef.deref()
					let isMultiFileApplyDiffEnabled = false

					if (provider) {
						const state = await provider.getState()
						isMultiFileApplyDiffEnabled = experiments.isEnabled(
							state.experiments ?? {},
							EXPERIMENT_IDS.MULTI_FILE_APPLY_DIFF,
						)
					}

					if (isMultiFileApplyDiffEnabled) {
						await checkpointSaveAndMark(cline)
						await applyDiffTool(cline, block, askApproval, handleError, pushToolResult, removeClosingTag)
					} else {
						await checkpointSaveAndMark(cline)
						await applyDiffToolLegacy(
							cline,
							block,
							askApproval,
							handleError,
							pushToolResult,
							removeClosingTag,
						)
					}
					break
				}
				case "insert_content":
					await checkpointSaveAndMark(cline)
					await insertContentTool(cline, block, askApproval, handleError, pushToolResult, removeClosingTag)
					break
				case "search_and_replace":
					await checkpointSaveAndMark(cline)
					await searchAndReplaceTool(cline, block, askApproval, handleError, pushToolResult, removeClosingTag)
					break
				case "read_file":
					// Check if this model should use the simplified single-file read tool
					const modelId = cline.api.getModel().id
					if (shouldUseSingleFileRead(modelId)) {
						await simpleReadFileTool(
							cline,
							block,
							askApproval,
							handleError,
							pushToolResult,
							removeClosingTag,
						)
					} else {
						await readFileTool(cline, block, askApproval, handleError, pushToolResult, removeClosingTag)
					}
					raceLog("PRESENT_ASSISTANT_MESSAGE_read_file_finished", cline.taskId, {})
					break
				case "fetch_instructions":
					await fetchInstructionsTool(cline, block, askApproval, handleError, pushToolResult)
					break
				case "list_files":
					await listFilesTool(cline, block, askApproval, handleError, pushToolResult, removeClosingTag)
					break
				case "glob":
					await globTool(cline, block, askApproval, handleError, pushToolResult, removeClosingTag)
					break
				case "codebase_search":
					await codebaseSearchTool(cline, block, askApproval, handleError, pushToolResult, removeClosingTag)
					break
				case "list_code_definition_names":
					await listCodeDefinitionNamesTool(
						cline,
						block,
						askApproval,
						handleError,
						pushToolResult,
						removeClosingTag,
					)
					break
				case "search_files":
					await searchFilesTool(cline, block, askApproval, handleError, pushToolResult, removeClosingTag)
					break
				case "browser_action":
					await browserActionTool(cline, block, askApproval, handleError, pushToolResult, removeClosingTag)
					break
				case "execute_command":
					await executeCommandTool(cline, block, askApproval, handleError, pushToolResult, removeClosingTag)
					break
				case "use_mcp_tool":
					await useMcpToolTool(cline, block, askApproval, handleError, pushToolResult, removeClosingTag)
					break
				case "access_mcp_resource":
					await accessMcpResourceTool(
						cline,
						block,
						askApproval,
						handleError,
						pushToolResult,
						removeClosingTag,
					)
					break
				case "ask_followup_question":
					await askFollowupQuestionTool(
						cline,
						block,
						askApproval,
						handleError,
						pushToolResult,
						removeClosingTag,
					)
					break
				case "switch_mode":
					await switchModeTool(cline, block, askApproval, handleError, pushToolResult, removeClosingTag)
					break
				case "new_task":
					await newTaskTool(cline, block, askApproval, handleError, pushToolResult, removeClosingTag)
					break
				case "fetch_tool_description":
					await fetchToolDescriptionTool(
						cline,
						block,
						askApproval,
						handleError,
						pushToolResult,
						removeClosingTag,
					)
					break
				case "subagent":
					await subagentTool(cline, block, askApproval, handleError, pushToolResult, removeClosingTag)
					break
				case "attempt_completion":
					await attemptCompletionTool(
						cline,
						block,
						askApproval,
						handleError,
						pushToolResult,
						removeClosingTag,
						toolDescription,
						askFinishSubTaskApproval,
					)
					break
				case "generate_image":
					await generateImageTool(cline, block, askApproval, handleError, pushToolResult, removeClosingTag)
					break
				default:
					// Dispatch to the appropriate handler
					if (block.name.startsWith("lsp_")) {
						await handleIndividualLspTool(cline, block as ToolUse, askApproval, handleError, pushToolResult)
					} else if (block.name.startsWith("debug_")) {
						// Delegate to the new helper function for individual debug tools
						await handleIndividualDebugTool(
							cline,
							block as ToolUse,
							askApproval,
							handleError,
							pushToolResult,
						)
					}
					break
			}

			break
	}

	// Seeing out of bounds is fine, it means that the next too call is being
	// built up and ready to add to assistantMessageContent to present.
	// When you see the UI inactive during this, it means that a tool is
	// breaking without presenting any UI. For example the write_to_file tool
	// was breaking when relpath was undefined, and for invalid relpath it never
	// presented UI.
	// This needs to be placed here, if not then calling
	// cline.presentAssistantMessage below would fail (sometimes) since it's
	// locked.
	cline.presentAssistantMessageLocked = false

	// NOTE: When tool is rejected, iterator stream is interrupted and it waits
	// for `userMessageContentReady` to be true. Future calls to present will
	// skip execution since `didRejectTool` and iterate until `contentIndex` is
	// set to message length and it sets userMessageContentReady to true itself
	// (instead of preemptively doing it in iterator).
	raceLog("[CHECK_USER_MESSAGE_CONTENT_READY_BLOCK_FULL]", cline.taskId, {
		block_partial: block.partial,
		currentStreamingContentIndex: cline.currentStreamingContentIndex,
		assistantMessageContent: cline.assistantMessageContent.length,
	})

	if (!block.partial || cline.didRejectTool || cline.didAlreadyUseTool) {
		// Block is finished streaming and executing.

		if (cline.currentStreamingContentIndex === cline.assistantMessageContent.length - 1) {
			// It's okay that we increment if !didCompleteReadingStream, it'll
			// just return because out of bounds and as streaming continues it
			// will call `presentAssitantMessage` if a new block is ready. If
			// streaming is finished then we set `userMessageContentReady` to
			// true when out of bounds. This gracefully allows the stream to
			// continue on and all potential content blocks be presented.
			// Last block is complete and it is finished executing
			// Log the complete incoming message
			if (cline.assistantMessageContent && cline.assistantMessageContent.length > 0) {
				logIncomingMessage(cline.assistantMessageContent)
			}
			cline.userMessageContentReady = true // Will allow `pWaitFor` to continue.
		}

		// Call next block if it exists (if not then read stream will call it
		// when it's ready).
		// Need to increment regardless, so when read stream calls this function
		// again it will be streaming the next block.
		cline.currentStreamingContentIndex++

		if (cline.currentStreamingContentIndex < cline.assistantMessageContent.length) {
			// There are already more content blocks to stream, so we'll call
			// this function ourselves.
			raceLog("PRESENT_ASSISTANT_MESSAGE_not_finish_streaming_recursive_call_PAM_655", cline.taskId, {})
			await presentAssistantMessage(cline)
			raceLog("PRESENT_ASSISTANT_MESSAGE_return_from_recursive_call_PAM_657", cline.taskId, {})
			return
		}
	}

	// Block is partial, but the read stream may have finished.
	if (cline.presentAssistantMessageHasPendingUpdates) {
		raceLog("PRESENT_ASSISTANT_MESSAGE_BLOCK_PARTIAL_PAM_PENDING_UPDATE_664", cline.taskId, {})
		await presentAssistantMessage(cline)
	}
	raceLog("PRESENT_ASSISTANT_MESSAGE_RETURN_normally_664", cline.taskId, {})
}

/**
 * save checkpoint and mark done in the current streaming task.
 * @param task The Task instance to checkpoint save and mark.
 * @returns
 */
async function checkpointSaveAndMark(task: Task) {
	if (task.currentStreamingDidCheckpoint) {
		return
	}
	try {
		await task.checkpointSave(true)
		task.currentStreamingDidCheckpoint = true
	} catch (error) {
		console.error(`[Task#presentAssistantMessage] Error saving checkpoint: ${error.message}`, error)
	}
}

/**
 * Generates a human-readable description string for a tool use block.
 * @param block The tool use block to describe.
 * @param customModes Optional custom modes, needed for describing the "new_task" tool.
 * @returns A string describing the tool and its main parameters.
 */
function getToolDescriptionString(block: ToolUse, customModes?: any[]): string {
	// Changed ToolUseBlock to ToolUse
	if (block.name.startsWith("debug_")) {
		const operationName = block.name.substring("debug_".length)
		let paramsString = ""
		if (block.params && Object.keys(block.params).length > 0) {
			try {
				paramsString = JSON.stringify(block.params)
				if (paramsString.length > 100) {
					// Truncate for very long params
					paramsString = paramsString.substring(0, 97) + "..."
				}
			} catch (e) {
				paramsString = "[error stringifying params]"
			}
		} else {
			paramsString = "{}"
		}
		return `[${block.name} (operation: '${operationName}') arguments: ${paramsString}]`
	} else if (block.name.startsWith("lsp_")) {
		return `[LSP tool: ${block.name}]`
	}

	switch (block.name) {
		case "execute_command":
			return `[${block.name} for '${block.params.command}']`
		case "read_file":
			return `[${block.name} for '${block.params.path}']`
		case "fetch_instructions":
			return `[${block.name} for '${block.params.task}']`
		case "write_to_file":
			return `[${block.name} for '${block.params.path}']`
		case "apply_diff":
			return `[${block.name} for '${block.params.path}']`
		case "search_files":
			return `[${block.name} for '${block.params.regex}'${
				block.params.file_pattern ? ` in '${block.params.file_pattern}'` : ""
			}]`
		case "insert_content":
			return `[${block.name} for '${block.params.path}']`
		case "search_and_replace":
			return `[${block.name} for '${block.params.path}']`
		case "list_files":
			return `[${block.name} for '${block.params.path}']`
		case "glob":
			return `[${block.name} for pattern '${block.params.pattern}']`
		case "list_code_definition_names":
			return `[${block.name} for '${block.params.path}']`
		case "browser_action":
			return `[${block.name} for '${block.params.action}']`
		case "use_mcp_tool":
			return `[${block.name} for '${block.params.server_name}']`
		case "access_mcp_resource":
			return `[${block.name} for '${block.params.server_name}']`
		case "ask_followup_question":
			return `[${block.name} for '${block.params.question}']`
		case "attempt_completion":
			return `[${block.name}]`
		case "switch_mode":
			return `[${block.name} to '${block.params.mode_slug}'${block.params.reason ? ` because: ${block.params.reason}` : ""}]`
		case "new_task": {
			const modeSlug = block.params.mode ?? defaultModeSlug
			const message = block.params.message ?? "(no message)"
			// Ensure customModes is an array before calling getModeBySlug
			const modeName = getModeBySlug(modeSlug, customModes ?? [])?.name ?? modeSlug
			return `[${block.name} in ${modeName} mode: '${message}']`
		}
		case "fetch_tool_description": {
			const toolName = block.params.tool_name || "(no tool specified)"
			return `[${block.name} for '${toolName}']`
		}
		case "subagent": {
			let description = "(no description)"
			let preview = "(no message)"
			if (block.params._text) {
				try {
					const parsedParams = JSON.parse(block.params._text)
					description = parsedParams.description || "(no description)"
					preview = parsedParams.message
						? parsedParams.message.substring(0, 50) + (parsedParams.message.length > 50 ? "..." : "")
						: "(no message)"
				} catch (e) {
					// Fallback to default if parsing fails
				}
			}
			return `[${block.name}: ${description} - ${preview}]`
		}
		case "debug": // Original meta-tool
			outputChannel.appendLine(
				`[Debug] Inside getToolDescriptionString for "debug" meta-tool, block params: ${JSON.stringify(block.params, null, 2)}`,
			)
			return `[${block.name} operation: '${block.params.debug_operation}' arguments: ${block.params.arguments ?? "{}"}]`
		default:
			// Fallback for any unhandled tool names
			return `[${String(block.name)}]`
	}
}

/**
 * Generic block reconstruction function that handles all meta-tool patterns
 */
function reconstructBlockForMetaTool<TBlock extends { params: any }>(
	originalBlock: ToolUse,
	operationName: string,
	toolGroupName: string,
): TBlock {
	// Derive configuration from toolGroupName
	const useFixedMetaToolName = toolGroupName
	const operationParamName = `${toolGroupName}_operation`

	const reconstructedBlock = {
		type: "tool_use" as const,
		name: useFixedMetaToolName,
		params: {
			...originalBlock.params,
			[operationParamName]: operationName,
		},
		partial: originalBlock.partial,
	}
	return reconstructedBlock as unknown as TBlock
}

/**
 * Factory function that creates individual tool handlers for meta-tools.
 * This eliminates code duplication between debug, lsp, and future similar tool patterns.
 * All configuration is derived from the single toolGroupName parameter.
 */
function createIndividualToolHandler<TBlock extends { params: any }>(
	toolGroupName: string,
	metaToolFunction: (
		cline: Task,
		block: TBlock,
		askApproval: AskApproval,
		handleError: HandleError,
		pushToolResult: PushToolResult,
	) => Promise<void>,
) {
	// Derive all configuration from toolGroupName
	const toolPrefix = `${toolGroupName}_`
	const toolDisplayName = toolGroupName

	/**
	 * Helper function to handle the invocation of individual operation tools.
	 * It reconstructs the tool call to be compatible with the existing meta-tool
	 * and then calls the meta-tool.
	 */
	return async function handleIndividualTool(
		cline: Task,
		block: ToolUse,
		askApproval: AskApproval,
		handleError: HandleError,
		pushToolResult: PushToolResult,
	) {
		const functionName = `handleIndividual${toolDisplayName.charAt(0).toUpperCase() + toolDisplayName.slice(1)}Tool`

		const operationName = block.name.substring(toolPrefix.length)

		// Wait if block until block is full
		if (block.partial) {
			return
		}

		// Reconstruct the block for the meta-tool using the unified reconstruction function
		const reconstructedBlock = reconstructBlockForMetaTool<TBlock>(block, operationName, toolGroupName)

		// Call the meta-tool with the reconstructed block
		await metaToolFunction(cline, reconstructedBlock, askApproval, handleError, pushToolResult)
	}
}

/**
 * Helper function to handle the invocation of individual debug operation tools.
 * It reconstructs the tool call to be compatible with the existing `debugTool` (meta-tool)
 * and then calls `debugTool`.
 */
const handleIndividualDebugTool = createIndividualToolHandler<DebugToolUse>("debug", debugTool)

/**
 * Helper function to handle the invocation of individual LSP operation tools.
 * It reconstructs the tool call to be compatible with the existing `lspTool` (meta-tool)
 * and then calls `lspTool`.
 */
const handleIndividualLspTool = createIndividualToolHandler<LspToolUse>("lsp", lspTool)
