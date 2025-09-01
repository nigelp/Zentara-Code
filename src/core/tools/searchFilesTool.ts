import path from "path"

import { Task } from "../task/Task"
import { ToolUse, AskApproval, HandleError, PushToolResult, RemoveClosingTag } from "../../shared/tools"
import { ClineSayTool } from "../../shared/ExtensionMessage"
import { getReadablePath } from "../../utils/path"
import { isPathOutsideWorkspace } from "../../utils/pathUtils"
import { regexSearchFilesAdvanced, SearchOptions } from "../../services/ripgrep"

export async function searchFilesTool(
	cline: Task,
	block: ToolUse,
	askApproval: AskApproval,
	handleError: HandleError,
	pushToolResult: PushToolResult,
	removeClosingTag: RemoveClosingTag,
) {
	// Extract parameters from block
	const _text: string | undefined = block.params._text

	try {
		if (block.partial) {
			const partialMessage = JSON.stringify({
				tool: "searchFiles",
				content: "",
			} satisfies ClineSayTool)
			await cline.ask("tool", partialMessage, block.partial).catch(() => {})
			return
		}

		// Determine content for approval prompt
		let approvalDisplayContent: string
		let searchOptions: SearchOptions
		let formattedDisplay: string = ""

		if (typeof _text === "string" && _text.trim().length > 0) {
			try {
				// Try to parse and pretty-print JSON for approval
				const parsedJsonPayload = JSON.parse(_text)
				approvalDisplayContent = JSON.stringify(parsedJsonPayload, null, 2)
				searchOptions = parsedJsonPayload

				// Create a more user-friendly display for approval
				const displayParts: string[] = []
				displayParts.push(`Pattern: ${searchOptions.pattern}`)
				if (searchOptions.path) displayParts.push(`Path: ${searchOptions.path}`)
				if (searchOptions.output_mode) displayParts.push(`Output mode: ${searchOptions.output_mode}`)
				if (searchOptions.glob) displayParts.push(`File filter (glob): ${searchOptions.glob}`)
				if (searchOptions.type) displayParts.push(`File type: ${searchOptions.type}`)
				if (searchOptions["-i"]) displayParts.push(`Case insensitive: true`)
				if (searchOptions["-n"]) displayParts.push(`Show line numbers: true`)
				if (searchOptions["-A"]) displayParts.push(`Lines after match: ${searchOptions["-A"]}`)
				if (searchOptions["-B"]) displayParts.push(`Lines before match: ${searchOptions["-B"]}`)
				if (searchOptions["-C"]) displayParts.push(`Context lines: ${searchOptions["-C"]}`)
				if (searchOptions.multiline) displayParts.push(`Multiline mode: true`)
				if (searchOptions.head_limit) displayParts.push(`Limit results to: ${searchOptions.head_limit}`)
				formattedDisplay = displayParts.join("\n")
			} catch (e) {
				// If _text is present but fails to parse as JSON, show error
				cline.consecutiveMistakeCount++
				cline.recordToolError("search_files")
				pushToolResult(await cline.sayAndCreateMissingParamError("search_files", "valid JSON parameters"))
				return
			}
		} else {
			// No _text content provided
			cline.consecutiveMistakeCount++
			cline.recordToolError("search_files")
			pushToolResult(await cline.sayAndCreateMissingParamError("search_files", "JSON parameters"))
			return
		}

		// Validate required pattern parameter
		if (!searchOptions.pattern) {
			cline.consecutiveMistakeCount++
			cline.recordToolError("search_files")
			pushToolResult(await cline.sayAndCreateMissingParamError("search_files", "pattern"))
			return
		}

		// Validate output_mode if provided
		const validOutputModes = ["content", "files_with_matches", "count"]
		if (searchOptions.output_mode && !validOutputModes.includes(searchOptions.output_mode)) {
			cline.consecutiveMistakeCount++
			cline.recordToolError("search_files")
			pushToolResult(
				await cline.sayAndCreateMissingParamError(
					"search_files",
					`output_mode must be one of: ${validOutputModes.join(", ")}`,
				),
			)
			return
		}

		// Validate that -n parameter is only used with content output mode
		if (searchOptions["-n"] && searchOptions.output_mode && searchOptions.output_mode !== "content") {
			// Log warning but don't fail - just ignore the -n parameter as per Grep tool spec
			console.warn("Line numbers (-n) are only shown in 'content' output mode, parameter will be ignored")
		}

		// Resolve path
		const searchPath = searchOptions.path || "."
		const absolutePath = path.resolve(cline.cwd, searchPath)
		const isOutsideWorkspace = isPathOutsideWorkspace(absolutePath)

		// Update search options with resolved path
		const resolvedOptions: SearchOptions = {
			...searchOptions,
			path: absolutePath,
		}

		const sharedMessageProps = {
			tool: "searchFiles" as const,
		}
		const completeMessage = JSON.stringify({
			...sharedMessageProps,
			content: formattedDisplay || approvalDisplayContent,
			path: getReadablePath(cline.cwd, searchPath),
			isOutsideWorkspace,
		} satisfies ClineSayTool)

		const didApprove = await askApproval("tool", completeMessage)

		if (!didApprove) {
			return
		}

		cline.consecutiveMistakeCount = 0

		const results = await regexSearchFilesAdvanced(cline.cwd, resolvedOptions, cline.rooIgnoreController)

		pushToolResult(results)
	} catch (error) {
		await handleError("searching files", error)
		return
	}
}
