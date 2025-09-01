import * as path from "path"
import fastGlob from "fast-glob"
import * as fs from "fs/promises"

import { Task } from "../task/Task"
import { ClineSayTool } from "../../shared/ExtensionMessage"
import { formatResponse } from "../prompts/responses"
import { getReadablePath } from "../../utils/path"
import { isPathOutsideWorkspace } from "../../utils/pathUtils"
import { ToolUse, AskApproval, HandleError, PushToolResult, RemoveClosingTag } from "../../shared/tools"

/**
 * Implements the glob tool for pattern-based file discovery.
 * This tool finds files matching glob patterns without reading their contents.
 *
 * @param cline - The instance of Cline that is executing this tool.
 * @param block - The block of assistant message content that specifies the
 *   parameters for this tool.
 * @param askApproval - A function that asks the user for approval to show a
 *   message.
 * @param handleError - A function that handles an error that occurred while
 *   executing this tool.
 * @param pushToolResult - A function that pushes the result of this tool to the
 *   conversation.
 * @param removeClosingTag - A function that removes a closing tag from a string.
 */
export async function globTool(
	cline: Task,
	block: ToolUse,
	askApproval: AskApproval,
	handleError: HandleError,
	pushToolResult: PushToolResult,
	removeClosingTag: RemoveClosingTag,
) {
	const pattern: string | undefined = block.params.pattern
	const relDirPath: string | undefined = block.params.path
	const head_limit: number | undefined = block.params.head_limit !== undefined ? parseInt(block.params.head_limit, 10) : undefined

	// Calculate the base path for the glob search
	const basePath = relDirPath ? path.resolve(cline.cwd, relDirPath) : cline.cwd
	const isOutsideWorkspace = isPathOutsideWorkspace(basePath)

	const sharedMessageProps: ClineSayTool = {
		tool: "glob",
		path: getReadablePath(cline.cwd, removeClosingTag("path", relDirPath || ".")),
		content: pattern || "",
		isOutsideWorkspace,
	}

	try {
		if (block.partial) {
			// Only show partial messages for the master agent (not parallel subagents)
			// Subagents should not show partial messages to avoid flickering with empty content
			if (!cline.isParallel) {
				// For master agent, show the tool info with the pattern being typed
				const partialMessage = JSON.stringify({
					...sharedMessageProps,
					content: pattern || "", // Show the pattern as it's being typed
				} satisfies ClineSayTool)
				await cline.ask("tool", partialMessage, block.partial).catch(() => {})
			}
			return
		} else {
			if (!pattern) {
				cline.consecutiveMistakeCount++
				cline.recordToolError("glob")
				pushToolResult(await cline.sayAndCreateMissingParamError("glob", "pattern"))
				return
			}

			cline.consecutiveMistakeCount = 0

			// Ask for approval BEFORE executing the glob search
			const approvalMessage = {
				...sharedMessageProps,
				content: pattern, // Show the pattern, not the results
			} satisfies ClineSayTool

			console.log("[globTool] Asking for approval with:", approvalMessage)

			const didApprove = await askApproval("tool", JSON.stringify(approvalMessage))

			if (!didApprove) {
				return
			}

			// Execute the glob search AFTER approval
			const files = await fastGlob(pattern, {
				cwd: basePath,
				absolute: false,
				followSymbolicLinks: false,
				onlyFiles: false, // Include both files and directories
				ignore: [
					"**/node_modules/**",
					"**/.git/**",
					"**/.vscode/**",
					"**/dist/**",
					"**/build/**",
					"**/out/**",
					"**/coverage/**",
					"**/.next/**",
					"**/.nuxt/**",
					"**/.cache/**",
					"**/vendor/**",
					"**/*.min.js",
					"**/*.min.css",
				],
				// Limit results to prevent overwhelming output
				concurrency: 4,
			})

			// Sort files by modification time (newest first)
			const filesWithStats = await Promise.all(
				files.slice(0, 1000).map(async (file) => {
					const fullPath = path.join(basePath, file)
					try {
						const stats = await fs.stat(fullPath)
						return { file, mtime: stats.mtime.getTime() }
					} catch {
						return { file, mtime: 0 }
					}
				}),
			)

			// Sort by modification time (newest first)
			filesWithStats.sort((a, b) => b.mtime - a.mtime)
			const sortedFiles = filesWithStats.map((f) => f.file)

			// Define limits
			const MAX_RESULTS = 100
			const DEFAULT_HEAD_LIMIT = 20

			// Apply head_limit with proper validation
			const requestedLimit = head_limit === undefined ? DEFAULT_HEAD_LIMIT : head_limit
			const maxResultsToShow = Math.min(Math.max(1, requestedLimit), MAX_RESULTS)

			const limitedFiles = sortedFiles.slice(0, maxResultsToShow)

			// Format the result
			let result: string
			if (sortedFiles.length === 0) {
				result = `No files or directories found matching pattern: ${pattern}`
			} else {
				let message = ""
				if (sortedFiles.length > maxResultsToShow) {
					const wasLimitedByUser = head_limit !== undefined && head_limit <= MAX_RESULTS
					const wasLimitedBySystem = head_limit !== undefined && head_limit > MAX_RESULTS

					if (wasLimitedBySystem) {
						message = `Showing first ${maxResultsToShow} of ${sortedFiles.length}+ results (limited to maximum ${MAX_RESULTS}). Use a more specific pattern to get fewer results.\n\n`
					} else if (wasLimitedByUser) {
						message = `Showing first ${maxResultsToShow} of ${sortedFiles.length}+ results (as requested by head_limit). Use a more specific pattern if you need fewer results.\n\n`
					} else {
						message = `Showing first ${maxResultsToShow} of ${sortedFiles.length}+ results (default limit). Use head_limit parameter to control results.\n\n`
					}
				} else {
					message = `Found ${sortedFiles.length} file${sortedFiles.length === 1 ? "" : "s"} and/or director${sortedFiles.length === 1 ? "y" : "ies"} matching pattern "${pattern}":\n\n`
				}
				result = message + limitedFiles.map((file) => `  ${file}`).join("\n")
			}

			pushToolResult(result)
		}
	} catch (error) {
		await handleError("glob pattern search", error)
	}
}
