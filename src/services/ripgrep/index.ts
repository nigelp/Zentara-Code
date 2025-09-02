import * as childProcess from "child_process"
import * as path from "path"
import * as readline from "readline"

import * as vscode from "vscode"

import { ZentaraIgnoreController } from "../../core/ignore/ZentaraIgnoreController"
import { fileExistsAtPath } from "../../utils/fs"
import "../../utils/path" // Import for toPosix extension
/*
This file provides functionality to perform regex searches on files using ripgrep.
Inspired by: https://github.com/DiscreteTom/vscode-ripgrep-utils

Key components:
1. getBinPath: Locates the ripgrep binary within the VSCode installation.
2. execRipgrep: Executes the ripgrep command and returns the output.
3. regexSearchFiles: The main function that performs regex searches on files.
   - Parameters:
     * cwd: The current working directory (for relative path calculation)
     * directoryPath: The directory to search in
     * regex: The regular expression to search for (Rust regex syntax)
     * filePattern: Optional glob pattern to filter files (default: '*')
   - Returns: A formatted string containing search results with context

The search results include:
- Relative file paths
- 2 lines of context before and after each match
- Matches formatted with pipe characters for easy reading

Usage example:
const results = await regexSearchFiles('/path/to/cwd', '/path/to/search', 'TODO:', '*.ts');

rel/path/to/app.ts
│----
│function processData(data: any) {
│  // Some processing logic here
│  // TODO: Implement error handling
│  return processedData;
│}
│----

rel/path/to/helper.ts
│----
│  let result = 0;
│  for (let i = 0; i < input; i++) {
│    // TODO: Optimize this function for performance
│    result += Math.pow(i, 2);
│  }
│----
*/

const isWindows = process.platform.startsWith("win")
const binName = isWindows ? "rg.exe" : "rg"

export interface SearchOptions {
	pattern: string
	path?: string
	output_mode?: "content" | "files_with_matches" | "count"
	glob?: string
	type?: string
	"-i"?: boolean
	"-n"?: boolean
	"-A"?: number
	"-B"?: number
	"-C"?: number
	multiline?: boolean
	head_limit?: number
}

interface SearchFileResult {
	file: string
	searchResults: SearchResult[]
}

interface SearchResult {
	lines: SearchLineResult[]
}

interface SearchLineResult {
	line: number
	text: string
	isMatch: boolean
	column?: number
}
// Constants
const MAX_RESULTS = 2000
const DEFAULT_HEAD_LIMIT = 200
const MAX_LINE_LENGTH = 500

/**
 * Truncates a line if it exceeds the maximum length
 * @param line The line to truncate
 * @param maxLength The maximum allowed length (defaults to MAX_LINE_LENGTH)
 * @returns The truncated line, or the original line if it's shorter than maxLength
 */
export function truncateLine(line: string, maxLength: number = MAX_LINE_LENGTH): string {
	return line.length > maxLength ? line.substring(0, maxLength) + " [truncated...]" : line
}
/**
 * Get the path to the ripgrep binary within the VSCode installation
 */
export async function getBinPath(vscodeAppRoot: string): Promise<string | undefined> {
	const checkPath = async (pkgFolder: string) => {
		const fullPath = path.join(vscodeAppRoot, pkgFolder, binName)
		return (await fileExistsAtPath(fullPath)) ? fullPath : undefined
	}

	return (
		(await checkPath("node_modules/@vscode/ripgrep/bin/")) ||
		(await checkPath("node_modules/vscode-ripgrep/bin")) ||
		(await checkPath("node_modules.asar.unpacked/vscode-ripgrep/bin/")) ||
		(await checkPath("node_modules.asar.unpacked/@vscode/ripgrep/bin/"))
	)
}

async function execRipgrep(bin: string, args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		const rgProcess = childProcess.spawn(bin, args)
		// cross-platform alternative to head, which is ripgrep author's recommendation for limiting output.
		const rl = readline.createInterface({
			input: rgProcess.stdout,
			crlfDelay: Infinity, // treat \r\n as a single line break even if it's split across chunks. This ensures consistent behavior across different operating systems.
		})

		let output = ""
		
		rl.on("line", (line) => {
			output += line + "\n"
		})

		let errorOutput = ""
		rgProcess.stderr.on("data", (data) => {
			errorOutput += data.toString()
		})
		rl.on("close", () => {
			if (errorOutput) {
				reject(new Error(`ripgrep process error: ${errorOutput}`))
			} else {
				resolve(output)
			}
		})
		rgProcess.on("error", (error) => {
			reject(new Error(`ripgrep process error: ${error.message}`))
		})
	})
}

export async function regexSearchFiles(
	cwd: string,
	directoryPath: string,
	regex: string,
	filePattern?: string,
	zentaraIgnoreController?: ZentaraIgnoreController,
): Promise<string> {
	// Legacy function - convert to new format
	const options: SearchOptions = {
		pattern: regex,
		path: directoryPath,
		glob: filePattern,
		output_mode: "content",
	}
	return regexSearchFilesAdvanced(cwd, options, zentaraIgnoreController)
}

export async function regexSearchFilesAdvanced(
	cwd: string,
	options: SearchOptions,
	zentaraIgnoreController?: ZentaraIgnoreController,
): Promise<string> {
	const vscodeAppRoot = vscode.env.appRoot
	const rgPath = await getBinPath(vscodeAppRoot)

	if (!rgPath) {
		throw new Error("Could not find ripgrep binary")
	}

	// Build ripgrep arguments based on options
	const args: string[] = []

	// Output format
	if (options.output_mode === "count") {
		args.push("--count")
	} else if (options.output_mode === "files_with_matches") {
		args.push("--files-with-matches")
	} else {
		// content mode (default)
		args.push("--json")
	}

	// Pattern
	args.push("-e", options.pattern)

	// Case sensitivity
	if (options["-i"]) {
		args.push("--ignore-case")
	}

	// Multiline mode
	if (options.multiline) {
		args.push("--multiline", "--multiline-dotall")
	}

	// Context options
	if (options["-C"] !== undefined) {
		args.push("--context", options["-C"].toString())
	} else {
		if (options["-B"] !== undefined) {
			args.push("--before-context", options["-B"].toString())
		}
		if (options["-A"] !== undefined) {
			args.push("--after-context", options["-A"].toString())
		}
	}

	// File filtering
	if (options.glob) {
		args.push("--glob", options.glob)
	} else if (options.type) {
		args.push("--type", options.type)
	}

	// Target path
	const searchPath = options.path || cwd
	args.push(searchPath)

	let output: string
	try {
		output = await execRipgrep(rgPath, args)
	} catch (error) {
		console.error("Error executing ripgrep:", error)
		return "No results found"
	}


	// Handle different output modes
	if (options.output_mode === "count") {
		return formatCountResults(output, cwd, options)
	} else if (options.output_mode === "files_with_matches") {
		return formatFileListResults(output, cwd, options)
	} else {
		// content mode - parse JSON output
		return parseAndFormatContentResults(output, cwd, options, zentaraIgnoreController)
	}
}

function formatCountResults(output: string, cwd: string, options?: SearchOptions): string {
	if (!output.trim()) {
		return "No results found"
	}

	const lines = output.trim().split("\n")
	let totalCount = 0
	
	// Apply head_limit with proper validation - default to DEFAULT_HEAD_LIMIT, cap at MAX_RESULTS
	const requestedLimit = options?.head_limit || DEFAULT_HEAD_LIMIT
	const maxResultsToShow = Math.min(requestedLimit, MAX_RESULTS)
	const limitedLines = lines.slice(0, maxResultsToShow)
	
	let result = ""
	
	if (lines.length > maxResultsToShow) {
		const wasLimitedByUser = options?.head_limit && options.head_limit <= MAX_RESULTS
		const wasLimitedBySystem = options?.head_limit && options.head_limit > MAX_RESULTS
		
		if (wasLimitedBySystem) {
			result += `Showing first ${maxResultsToShow} of ${lines.length}+ entries (limited to maximum ${MAX_RESULTS}). Use a more specific search pattern, file filters, or reduce scope to get fewer results.\n\n`
		} else if (wasLimitedByUser) {
			result += `Showing first ${maxResultsToShow} of ${lines.length}+ entries (as requested by head_limit). Use a more specific search pattern if you need fewer results.\n\n`
		} else {
			result += `Showing first ${maxResultsToShow} of ${lines.length}+ entries (default limit). Use head_limit parameter or more specific search pattern to control results.\n\n`
		}
	}
	
	result += "Match counts per file:\n\n"

	limitedLines.forEach((line) => {
		if (line.includes(":")) {
			const [file, count] = line.split(":")
			const relativeFile = path.relative(cwd, file)
			const matchCount = parseInt(count)
			totalCount += matchCount
			result += `${relativeFile.toPosix()}: ${matchCount} matches\n`
		}
	})

	result += `\nTotal: ${totalCount} matches across ${limitedLines.length} files`
	return result
}

function formatFileListResults(output: string, cwd: string, options?: SearchOptions): string {
	if (!output.trim()) {
		return "No files found with matches"
	}

	const files = output.trim().split("\n")
	
	// Apply head_limit with proper validation - default to DEFAULT_HEAD_LIMIT, cap at MAX_RESULTS
	const requestedLimit = options?.head_limit || DEFAULT_HEAD_LIMIT
	const maxResultsToShow = Math.min(requestedLimit, MAX_RESULTS)
	const limitedFiles = files.slice(0, maxResultsToShow)
	
	let result = ""
	
	if (files.length > maxResultsToShow) {
		const wasLimitedByUser = options?.head_limit && options.head_limit <= MAX_RESULTS
		const wasLimitedBySystem = options?.head_limit && options.head_limit > MAX_RESULTS
		
		if (wasLimitedBySystem) {
			result += `Showing first ${maxResultsToShow} of ${files.length}+ files (limited to maximum ${MAX_RESULTS}). Use a more specific search pattern, file filters, or reduce scope to get fewer results.\n\n`
		} else if (wasLimitedByUser) {
			result += `Showing first ${maxResultsToShow} of ${files.length}+ files (as requested by head_limit). Use a more specific search pattern if you need fewer results.\n\n`
		} else {
			result += `Showing first ${maxResultsToShow} of ${files.length}+ files (default limit). Use head_limit parameter or more specific search pattern to control results.\n\n`
		}
	} else {
		result += `Found matches in ${files.length} files:\n\n`
	}

	limitedFiles.forEach((file) => {
		const relativeFile = path.relative(cwd, file)
		result += `${relativeFile.toPosix()}\n`
	})

	return result
}

function parseAndFormatContentResults(
	output: string,
	cwd: string,
	options: SearchOptions,
	zentaraIgnoreController?: ZentaraIgnoreController,
): string {
	const results: SearchFileResult[] = []
	let currentFile: SearchFileResult | null = null

	output.split("\n").forEach((line) => {
		if (line) {
			try {
				const parsed = JSON.parse(line)
				if (parsed.type === "begin") {
					currentFile = {
						file: parsed.data.path.text.toString(),
						searchResults: [],
					}
				} else if (parsed.type === "end") {
					// Reset the current result when a new file is encountered
					if (currentFile) {
						results.push(currentFile)
					}
					currentFile = null
				} else if ((parsed.type === "match" || parsed.type === "context") && currentFile) {
					const line = {
						line: parsed.data.line_number,
						text: truncateLine(parsed.data.lines.text),
						isMatch: parsed.type === "match",
						...(parsed.type === "match" && { column: parsed.data.absolute_offset }),
					}

					const lastResult = currentFile.searchResults[currentFile.searchResults.length - 1]
					if (lastResult?.lines.length > 0) {
						const lastLine = lastResult.lines[lastResult.lines.length - 1]

						// If this line is contiguous with the last result, add to it
						if (parsed.data.line_number <= lastLine.line + 1) {
							lastResult.lines.push(line)
						} else {
							// Otherwise create a new result
							currentFile.searchResults.push({
								lines: [line],
							})
						}
					} else {
						// First line in file
						currentFile.searchResults.push({
							lines: [line],
						})
					}
				}
			} catch (error) {
				console.error("Error parsing ripgrep output:", error)
			}
		}
	})

	// Filter results using ZentaraIgnoreController if provided
	const filteredResults = zentaraIgnoreController
		? results.filter((result) => zentaraIgnoreController.validateAccess(result.file))
		: results

	return formatResults(filteredResults, cwd, options)
}

function formatResults(fileResults: SearchFileResult[], cwd: string, options?: SearchOptions): string {
	const groupedResults: { [key: string]: SearchResult[] } = {}

	let totalResults = fileResults.reduce((sum, file) => sum + file.searchResults.length, 0)
	let output = ""
	let currentOutputLines: string[] = []

	// Apply head_limit with proper validation - default to DEFAULT_HEAD_LIMIT, cap at MAX_RESULTS
	const requestedLimit = options?.head_limit || DEFAULT_HEAD_LIMIT
	const maxLinesToShow = Math.min(requestedLimit, MAX_RESULTS)

	// Group results by file name
	fileResults.forEach((file) => {
		const relativeFilePath = path.relative(cwd, file.file)
		if (!groupedResults[relativeFilePath]) {
			groupedResults[relativeFilePath] = []

			groupedResults[relativeFilePath].push(...file.searchResults)
		}
	})

	for (const [filePath, fileResults] of Object.entries(groupedResults)) {
		currentOutputLines.push(`# ${filePath.toPosix()}`)

		fileResults.forEach((result) => {
			// Only show results with at least one line
			if (result.lines.length > 0) {
				// Show all lines in the result
				result.lines.forEach((line) => {
					// Show line numbers if requested
					const lineNumber = options?.["-n"] ? String(line.line).padStart(3, " ") + " | " : ""
					currentOutputLines.push(`${lineNumber}${line.text.trimEnd()}`)
				})
				currentOutputLines.push("----")
			}
		})

		currentOutputLines.push("")
	}
	
	output = currentOutputLines.join("\n").trim()

	let finalOutput = ""
	const lines = output.split("\n")
	if (lines.length > maxLinesToShow) {
		const wasLimitedByUser = options?.head_limit && options.head_limit <= MAX_RESULTS
		const wasLimitedBySystem = options?.head_limit && options.head_limit > MAX_RESULTS
		
		if (wasLimitedBySystem) {
			finalOutput += `Showing first ${maxLinesToShow} of ${lines.length}+ lines (limited to maximum ${MAX_RESULTS}). Use a more specific search pattern, file filters, or reduce scope to get fewer results.\n\n`
		} else if (wasLimitedByUser) {
			finalOutput += `Showing first ${maxLinesToShow} of ${lines.length}+ lines (as requested by head_limit). Use a more specific search pattern if you need fewer results.\n\n`
		} else {
			finalOutput += `Showing first ${maxLinesToShow} of ${lines.length}+ lines (default limit). Use head_limit parameter or more specific search pattern to control results.\n\n`
		}
		finalOutput += lines.slice(0, maxLinesToShow).join("\n")
	} else {
		finalOutput += `Found ${lines.length === 1 ? "1 line" : `${lines.length.toLocaleString()} lines`}.\n\n`
		finalOutput += output
	}

	return finalOutput.trim()
}
