import * as vscode from "vscode"
import { lspTool } from "../core/tools/lspTool"
import type { ToolUse, AskApproval, HandleError, PushToolResult } from "../shared/tools"
import type { Task } from "../core/task/Task"
import { formatResponse } from "../core/prompts/responses"

// Helper to stringify with circular reference handling
const stringifySafe = (obj: any, indent: number = 2) => {
	const cache = new Set()
	return JSON.stringify(
		obj,
		(key, value) => {
			if (typeof value === "object" && value !== null) {
				if (cache.has(value)) {
					return "[Circular]"
				}
				cache.add(value)
			}
			return value
		},
		indent,
	)
}

export async function runLspFindUsagesTest() {
	const outputChannel = vscode.window.createOutputChannel("LSP Find Usages Test")
	outputChannel.appendLine("================================================================")
	outputChannel.appendLine("--- Starting LSP Find Usages Test ---")
	outputChannel.appendLine("================================================================")
	outputChannel.show(true)

	// 1. Mock Task and Callbacks
	const mockTask = {
		consecutiveMistakeCount: 0,
		recordToolError: (toolName: string) => {
			outputChannel.appendLine(`[Task Mock] recordToolError called for: ${toolName}`)
		},
		sayAndCreateMissingParamError: async (toolName: string, paramName: string) => {
			const errorMsg = `Missing parameter '${paramName}' for tool '${toolName}'.`
			outputChannel.appendLine(`[Task Mock] sayAndCreateMissingParamError: ${errorMsg}`)
			return formatResponse.toolError(errorMsg)
		},
		say: async (type: string, content: string) => {
			outputChannel.appendLine(`[Task Mock] say called with type: ${type}, content: ${content}`)
		},
	} as unknown as Task

	const mockAskApproval: AskApproval = async (type, partialMessage) => {
		outputChannel.appendLine(`[Callback Mock] askApproval called. Type: ${type}, Message: ${partialMessage}`)
		outputChannel.appendLine(`[Callback Mock] ==> Auto-approving.`)
		return true
	}

	const mockHandleError: HandleError = async (action, error) => {
		outputChannel.appendLine(`[Callback Mock] handleError called. Action: ${action}`)
		outputChannel.appendLine(`[Callback Mock] Error: ${error.message}`)
		outputChannel.appendLine(`[Callback Mock] Error Stack: ${error.stack}`)
	}

	const mockPushToolResult: PushToolResult = (content) => {
		outputChannel.appendLine(`[Callback Mock] pushToolResult called.`)
		outputChannel.appendLine(`-------------------- RESULT --------------------`)
		if (typeof content === "string") {
			outputChannel.appendLine(content)
		} else {
			outputChannel.appendLine(stringifySafe(content))
		}
		outputChannel.appendLine(`----------------------------------------------`)
	}

	// 2. Define ToolUse block
	let programPath = ""
	if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
		const workspaceUri = vscode.workspace.workspaceFolders[0].uri
		programPath = vscode.Uri.joinPath(workspaceUri, "testdata/sample_for_find_usages.py").fsPath
	} else {
		outputChannel.appendLine(
			"[Test Script] ERROR: No workspace folder found. Using hardcoded fallback (likely incorrect).",
		)
	}

	outputChannel.appendLine(`[Test Script] Resolved program path: ${programPath}`)

	const findUsagesArgs = {
		textDocument: {
			uri: `file://${programPath}`,
		},
		position: {
			line: 4,
			character: 5,
		},
	}

	const findUsagesToolUseBlock: ToolUse = {
		type: "tool_use",
		partial: false,
		name: "lsp_find_usages",
		params: {
			_text: JSON.stringify(findUsagesArgs),
		},
	}

	outputChannel.appendLine(`Attempting to run lspTool with: ${stringifySafe(findUsagesToolUseBlock)}`)

	// 3. Call lspTool
	try {
		await lspTool(mockTask, findUsagesToolUseBlock, mockAskApproval, mockHandleError, mockPushToolResult)
		outputChannel.appendLine("lspTool execution finished for FIND USAGES.")
	} catch (error: any) {
		outputChannel.appendLine(`--- Test FAILED with an unhandled exception from lspTool: ${error.message} ---`)
		outputChannel.appendLine(`Error details: ${error.stack || stringifySafe(error)}`)
	} finally {
		outputChannel.appendLine("================================================================")
		outputChannel.appendLine("--- LSP Find Usages Test Finished ---")
		outputChannel.appendLine("================================================================")
	}
}
