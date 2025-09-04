import { Task } from "../../task/Task"
import { PushToolResult } from "../../../shared/tools"
import { formatResponse } from "../../prompts/responses"

/**
 * Checks if the current task is a main agent and rejects search tool usage.
 * Search tools should only be used by subagents to prevent context pollution.
 * 
 * @param cline - The Task instance
 * @param toolName - Name of the search tool being used (must match exact tool name)
 * @param pushToolResult - Function to push tool result
 * @returns true if the tool should be blocked (main agent), false if allowed (subagent)
 */
export function checkMainAgentSearchRestriction(
	cline: Task,
	toolName: "glob" | "search_files" | "search_symbols",
	pushToolResult: PushToolResult
): boolean {
	// Check if this is a main agent (not parallel/subagent)
	if (!cline.isParallel) {
		cline.consecutiveMistakeCount++
		cline.recordToolError(toolName as any)
		pushToolResult(
			formatResponse.toolError(
				`You are a main agent. Main agent cannot use the '${toolName}' tool. Please use the subagent tool to delegate search operations to subagents.`
			)
		)
		return true // Block execution
	}
	return false // Allow execution
}