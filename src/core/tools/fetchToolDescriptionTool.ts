import { ToolUse, AskApproval, HandleError, PushToolResult, RemoveClosingTag } from "../../shared/tools"
import { Task } from "../task/Task"
import { formatResponse } from "../prompts/responses"
import {
	fetch_tool_description,
	toolExists,
	getAvailableToolNames,
} from "../../roo_tool_prompt_management/fetch-tool-description"

/**
 * Implements the fetch_tool_description tool for retrieving full tool descriptions on demand.
 * This tool is always available and allows the AI to fetch complete documentation for any tool.
 *
 * @param cline - The Task instance executing this tool
 * @param block - The tool parameters block
 * @param askApproval - Function to request user approval (not used for this read-only tool)
 * @param handleError - Error handling function
 * @param pushToolResult - Function to return results to the AI
 * @param removeClosingTag - Helper for partial content handling
 */
export async function fetchToolDescriptionTool(
	cline: Task,
	block: ToolUse,
	askApproval: AskApproval,
	handleError: HandleError,
	pushToolResult: PushToolResult,
	removeClosingTag: RemoveClosingTag,
) {
	try {
		// Handle partial requests (streaming)
		if (block.partial) {
			const partialMessage = JSON.stringify({
				tool: "fetch_tool_description",
				toolName: removeClosingTag("tool_name", block.params.tool_name),
			})
			await cline.ask("tool", partialMessage, block.partial).catch(() => {})
			return
		}

		// Extract tool name from parameters
		const toolName = block.params.tool_name?.trim()

		// Validate tool name is provided
		if (!toolName) {
			cline.consecutiveMistakeCount++
			cline.recordToolError("fetch_tool_description")
			pushToolResult(
				formatResponse.toolError(
					"Missing required parameter 'tool_name'. Please provide the name of the tool to fetch description for.",
				),
			)
			return
		}

		// Check if requesting list of all tools
		if (toolName === "*" || toolName.toLowerCase() === "list" || toolName.toLowerCase() === "all") {
			const availableTools = getAvailableToolNames()
			const toolList = availableTools.sort().join("\n")
			pushToolResult(
				`## Available Tools (${availableTools.length} total)\n\n${toolList}\n\nUse fetch_tool_description with a specific tool name to get its full description.`,
			)
			cline.consecutiveMistakeCount = 0
			return
		}

		// Check if tool exists
		if (!toolExists(toolName)) {
			cline.consecutiveMistakeCount++
			cline.recordToolError("fetch_tool_description")

			// Suggest similar tool names if possible
			const availableTools = getAvailableToolNames()
			const suggestions = availableTools
				.filter((name) => name.includes(toolName) || toolName.includes(name))
				.slice(0, 5)

			let errorMessage = `Tool '${toolName}' not found.`
			if (suggestions.length > 0) {
				errorMessage += ` Did you mean one of these? ${suggestions.join(", ")}`
			} else {
				errorMessage += ` Use tool_name="list" to see all available tools.`
			}

			pushToolResult(formatResponse.toolError(errorMessage))
			return
		}

		// Fetch the tool description
		const description = await fetch_tool_description(toolName, {
			cwd: cline.cwd,
			supportsComputerUse: false, // Set based on cline's capabilities if available
			settings: {
				enableMcpServerCreation: false, // Set based on cline's settings if available
			},
		})

		if (!description) {
			// This shouldn't happen if toolExists returned true, but handle it gracefully
			cline.consecutiveMistakeCount++
			cline.recordToolError("fetch_tool_description")
			pushToolResult(formatResponse.toolError(`Failed to fetch description for tool '${toolName}'.`))
			return
		}

		// Return the full tool description
		pushToolResult(description)
		cline.consecutiveMistakeCount = 0
	} catch (error) {
		cline.consecutiveMistakeCount++
		cline.recordToolError("fetch_tool_description")
		const errorMessage = error instanceof Error ? error.message : String(error)
		pushToolResult(formatResponse.toolError(`Error fetching tool description: ${errorMessage}`))
		await handleError("fetch_tool_description", error instanceof Error ? error : new Error(errorMessage))
	}
}
