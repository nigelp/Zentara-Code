import { Task } from "../task/Task"
import { ToolUse, LspToolUse, AskApproval, HandleError, PushToolResult } from "../../shared/tools"
import { formatResponse } from "../prompts/responses"
import { ClineSayTool } from "../../shared/ExtensionMessage"
import { lspController } from "../../zentara_lsp"
import { validateLspOperationArgs } from "./lspToolValidation"
import { outputChannel } from "../../zentara_debug/src/vscodeUtils"
import {
	waitForLanguageServer,
	waitForWorkspaceLanguageServers,
} from "../../zentara_lsp/src/utils/waitForLanguageServer"
import * as vscode from "vscode"
import { RecordSource } from "../context-tracking/FileContextTrackerTypes"
import * as path from "path"
import { checkMainAgentSearchRestriction } from "./helpers/searchToolRestrictions"

// Default timeout for LSP operations (30 seconds)
const DEFAULT_LSP_TIMEOUT = 30000

/**
 * Creates a timeout wrapper for LSP operations
 * @param operation The LSP operation to execute
 * @param timeoutMs Timeout in milliseconds (default: 30 seconds)
 * @param operationName Name of the operation for error messages
 * @returns Promise that resolves with the operation result or rejects with timeout
 */
function withTimeout<T>(
	operation: Promise<T>,
	timeoutMs: number = DEFAULT_LSP_TIMEOUT,
	operationName: string
): Promise<T> {
	return new Promise((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			reject(new Error(`LSP operation '${operationName}' timeout after ${timeoutMs / 1000}s, please try non-LSP tool to achieve the same goal`))
		}, timeoutMs)

		operation
			.then((result) => {
				clearTimeout(timeoutId)
				resolve(result)
			})
			.catch((error) => {
				clearTimeout(timeoutId)
				reject(error)
			})
	})
}

// Type for the operation map values
type LspOperationFn = (args?: any) => Promise<any>

// Initialize all objects at module level
// This prevents them from being recreated for each function call
// and from being included in the state sent to the webview
const moduleLspController = lspController
// Create the operation map once at module level
const moduleOperationMap = createOperationMap(moduleLspController)

// Helper to create the operation map with correct 'this' binding
function createOperationMap(controller: typeof lspController): Record<string, LspOperationFn> {
	return {
		find_usages: controller.findUsages.bind(controller),
		go_to_definition: controller.goToDefinition.bind(controller),
		find_implementations: controller.findImplementations.bind(controller),
		get_hover_info: controller.getHoverInfo.bind(controller),
		get_document_symbols: controller.getDocumentSymbols.bind(controller),
		get_completions: controller.getCompletions.bind(controller),
		get_signature_help: controller.getSignatureHelp.bind(controller),
		rename: controller.rename.bind(controller),
		get_code_actions: controller.getCodeActions.bind(controller),
		get_semantic_tokens: controller.getSemanticTokens.bind(controller),
		get_call_hierarchy: controller.getCallHierarchy.bind(controller),
		get_type_hierarchy: controller.getTypeHierarchy.bind(controller),
		get_code_lens: controller.getCodeLens.bind(controller),
		lsp_get_code_lens: controller.getCodeLens.bind(controller),
		get_selection_range: controller.getSelectionRange.bind(controller),
		lsp_get_selection_range: controller.getSelectionRange.bind(controller),
		get_type_definition: controller.getTypeDefinition.bind(controller),
		get_declaration: controller.getDeclaration.bind(controller),
		get_document_highlights: controller.getDocumentHighlights.bind(controller),
		get_workspace_symbols: controller.getWorkspaceSymbols.bind(controller),
		get_symbol_code_snippet: controller.getSymbolCodeSnippet.bind(controller),
		lsp_get_symbol_code_snippet: controller.getSymbolCodeSnippet.bind(controller),
		get_symbol_children: controller.getSymbolChildren.bind(controller),
		lsp_get_symbol_children: controller.getSymbolChildren.bind(controller),
		search_symbols: controller.getSymbols.bind(controller),
		get_symbols_overview: controller.getSymbolsOverview.bind(controller),
		insert_after_symbol: controller.insertAfterSymbol.bind(controller),
		insert_before_symbol: controller.insertBeforeSymbol.bind(controller),
		replace_symbol_body: controller.replaceSymbolBody.bind(controller),
	}
}

export async function lspTool(
	cline: Task,
	block: LspToolUse,
	askApproval: AskApproval,
	handleError: HandleError,
	pushToolResult: PushToolResult,
): Promise<void> {
	const { lsp_operation, _text, ...otherParams } = block.params // Extract _text and lsp_operation like debugTool
	// Use the module-level controller and operationMap

	try {
		outputChannel.appendLine(
			`[LSP Tool] Processing operation '${lsp_operation}'. Raw params: ${JSON.stringify(block.params)}`,
		)

		if (!lsp_operation) {
			cline.consecutiveMistakeCount++
			cline.recordToolError(block.name as any)
			pushToolResult(await cline.sayAndCreateMissingParamError(block.name as any, "lsp_operation"))
			return
		}

		// Check if main agent is trying to use search_symbols
		if (lsp_operation === "search_symbols") {
			if (checkMainAgentSearchRestriction(cline, "search_symbols", pushToolResult)) {
				return
			}
		}

		// Determine content for approval prompt
		let approvalDisplayContent: string
		if (typeof _text === "string" && _text.trim().length > 0) {
			// Check if _text is a non-empty string
			try {
				// Try to parse and pretty-print JSON for approval
				const parsedJsonPayload = JSON.parse(_text)
				approvalDisplayContent = JSON.stringify(parsedJsonPayload, null, 2)
				outputChannel.appendLine(`[LSP Tool] Using _text (JSON) for approval prompt: ${approvalDisplayContent}`)
			} catch (e) {
				// If _text is present but fails to parse as JSON, show raw _text for approval,
				// but actual parsing later will fail if it's not valid JSON.
				approvalDisplayContent = _text
				outputChannel.appendLine(
					`[LSP Tool] _text failed JSON.parse for approval, showing raw: ${approvalDisplayContent}. Error will be caught during actual parsing if invalid.`,
				)
			}
		} else {
			// If _text is not a string, or is an empty string, then no arguments are provided.
			approvalDisplayContent = "(No arguments)"
		}

		const sharedMessageProps = {
			tool: "lsp" as const,
		}
		const completeMessage = JSON.stringify({
			...sharedMessageProps,
			operation: lsp_operation,
			content: approvalDisplayContent,
		} satisfies ClineSayTool)


		// Check for auto-approval setting before asking for approval
		let didApprove = false
		try {
			// Add defensive check for providerRef
			const provider = cline.providerRef?.deref?.()
			const alwaysAllowLsp = provider?.contextProxy?.getValue?.("alwaysAllowLsp")

			if (alwaysAllowLsp) {
				didApprove = true
			} else {
				didApprove = await askApproval("tool", completeMessage)
			}
		} catch (approvalError: any) {
			outputChannel.appendLine(`[ERROR][lspTool] Error during approval check: ${approvalError.message}`)
			await handleError(`asking approval for lsp operation '${lsp_operation}'`, approvalError)
			pushToolResult(formatResponse.toolError(`Error asking for approval: ${approvalError.message}`))
			return
		}

		if (!didApprove) {
			// User denied the operation - askApproval already handled the feedback and tool result
			return
		}

		// Add a message to the chat to show the operation was approved
		await cline.say("text", `LSP operation approved: ${lsp_operation}`)

		// Only proceed with parsing and validation if approval is granted
		let operationArgs: any = {}

		// Parameters must now come from the JSON payload in _text.
		if (typeof _text === "string" && _text.trim().length > 0) {
			try {
				operationArgs = JSON.parse(_text)
				// Ensure operationArgs is an object if it parsed to null,
				// or handle cases where it might parse to a primitive if that's valid for some ops.
				// For most lsp operations, an object (even empty) or an array is expected.
				if (operationArgs === null) {
					operationArgs = {} // Treat JSON "null" as empty args object for consistency
				} else if (typeof operationArgs !== "object" && !Array.isArray(operationArgs)) {
					// If JSON parsed to a primitive (string, number, boolean)
					// This is generally unexpected for lsp operations that take multiple params.
					// The validation step should catch if this type is inappropriate for the specific operation.
					// If an operation legitimately takes a single primitive, validation should allow it.
					// Otherwise, validation should fail.

				}

			} catch (e) {
				await handleError(`parsing JSON content for lsp operation ${lsp_operation}`, e as Error)
				pushToolResult(
					formatResponse.toolError(
						`Invalid JSON content provided for operation '${lsp_operation}': ${(e as Error).message}. Parameters must be a valid JSON object or array within the operation tag.`,
					),
				)
				return
			}
		} else {
			// No _text provided, or it's an empty string.
			// This means no arguments are passed for the operation.
			// Some operations are valid without arguments (e.g., get_workspace_symbols).
			// Validation will check if arguments are required for the specific 'lsp_operation'.
			outputChannel.appendLine(
				`[LSP Tool] No JSON _text content found or _text is empty. Assuming no arguments for '${lsp_operation}'. Validation will check if args are required.`,
			)
			operationArgs = {} // Default to empty object if no _text
		}

		// Validate arguments after approval
		const validation = validateLspOperationArgs(lsp_operation, operationArgs)

		if (!validation.isValid) {
			pushToolResult(formatResponse.toolError(validation.message))
			return
		}

		// Use the transformed arguments from the validation result
		const transformedArgs = validation.transformedArgs

		const targetMethod: LspOperationFn | undefined = moduleOperationMap[lsp_operation]

		if (targetMethod) {
			try {
				// Wait for Language Server to be ready before executing operations
				// For operations that work with specific files, wait for that file's Language Server
				if (transformedArgs && transformedArgs.textDocument && transformedArgs.textDocument.uri) {
					try {
						const uri = vscode.Uri.parse(transformedArgs.textDocument.uri)
						await waitForLanguageServer(uri, 8000) // Increased timeout for better Language Server initialization
					} catch (error) {
						outputChannel.appendLine(`[LSP Tool] Warning: Could not wait for Language Server: ${error}`)
						// Continue anyway - the operation might still work
					}
				} else if (lsp_operation === "get_workspace_symbols") {
					// For workspace-wide operations, wait for workspace Language Servers
					await waitForWorkspaceLanguageServers(5000) // Increased timeout for workspace operations
				}

				// Some methods on lspController might not expect any arguments.
				// The `transformedArgs` will be an empty object {} if argsXml is undefined or empty.
				// Methods that don't take arguments will simply ignore the empty object.

				let rawResult: any = null
				try {
					// Wrap the LSP operation with timeout
					rawResult = await withTimeout(
						targetMethod(transformedArgs),
						DEFAULT_LSP_TIMEOUT,
						lsp_operation
					)
				} catch (error) {
					outputChannel.appendLine(`[LSP Tool] Error executing operation '${lsp_operation}': ${error}`)
					pushToolResult(
						formatResponse.toolError(
							`LSP operation '${lsp_operation}' failed. Details: ${(error as Error).message}`,
						),
					)
					return
				}

				// Robustly handle the rawResult
				let logResult = rawResult;
				// Create compact format for get_symbol_code_snippet (for logging only)
				if (lsp_operation === 'get_symbol_code_snippet' || lsp_operation === 'lsp_get_symbol_code_snippet') {
					if (rawResult && typeof rawResult === 'object') {
						logResult = {
							snippet: rawResult.snippet ? `${rawResult.snippet.split('\n')[0]}...` : rawResult.snippet,
							uri: rawResult.uri,
							range: rawResult.range ? `${rawResult.range.start.line}:${rawResult.range.start.character}-${rawResult.range.end.line}:${rawResult.range.end.character}` : rawResult.range,
							symbolInfo: rawResult.symbolInfo ? `${rawResult.symbolInfo.name}(${rawResult.symbolInfo.kind})` : rawResult.symbolInfo,
							callHierarchy: rawResult.callHierarchy ? 'present' : null,
							usages: rawResult.usages ? 'present' : null
						};
					}
				}
				
				outputChannel.appendLine(
					`[LSP Tool] Operation '${lsp_operation}' completed. Result: ${JSON.stringify(logResult, null, 2)}`,
				)
				console.log(
					`[LSP Tool] Operation '${lsp_operation}' completed. Result: ${JSON.stringify(logResult, null, 2)}`,
				)

				// Check if this is a file modification operation
				const fileModificationOps = ["insert_before_symbol", "insert_after_symbol", "replace_symbol_body"]
				const isFileModificationOp = fileModificationOps.includes(lsp_operation)
				
				if (typeof rawResult === "object" && rawResult !== null) {
					if (rawResult.success === true) {
						// For file modification operations, use DiffViewProvider for diagnostics
						if (isFileModificationOp && transformedArgs?.textDocument?.uri) {
							try {
								const uri = vscode.Uri.parse(transformedArgs.textDocument.uri)
								const relPath = path.relative(cline.cwd, uri.fsPath)
								
								// Track file edit operation
								await cline.fileContextTracker.trackFileContext(relPath, "zentara_edited" as RecordSource)
								cline.didEditFile = true
								
								// Get diagnostics before the modification (for comparison)
								cline.diffViewProvider.preDiagnostics = vscode.languages.getDiagnostics()
								
								// Initialize DiffViewProvider properties
								cline.diffViewProvider.editType = "modify"
								cline.diffViewProvider.relPath = relPath
								
								// Get the formatted response with diagnostics
								const message = await cline.diffViewProvider.pushToolWriteResult(cline, cline.cwd, false)
								pushToolResult(message)
								
								// Reset DiffViewProvider
								await cline.diffViewProvider.reset()
							} catch (diffError) {
								// Fallback to standard response if DiffViewProvider fails
								outputChannel.appendLine(`[LSP Tool] DiffViewProvider error, using standard response: ${diffError}`)
								pushToolResult(JSON.stringify(rawResult, null, 2))
							}
						} else {
							// Standard success case for non-file-modification operations
							pushToolResult(JSON.stringify(rawResult, null, 2))
						}
					} else if (rawResult.success === false) {
						// Standard failure case: return the full rawResult, JSON stringified, to provide all details.
						pushToolResult(
							formatResponse.toolError(
								`LSP operation '${lsp_operation}' failed. Details: ${JSON.stringify(rawResult, null, 2)}`,
							),
						)
					} else {
						// Object, but no boolean 'success' field or unexpected value.
						// For LSP operations, this is normal - they return data directly without a success field
						// Wrap the result in a success object for test compatibility
						let resultData = rawResult;
						
						// Create compact format for get_symbol_code_snippet
						if (lsp_operation === 'get_symbol_code_snippet' || lsp_operation === 'lsp_get_symbol_code_snippet') {
							if (rawResult && typeof rawResult === 'object') {
								resultData = {
									snippet: rawResult.snippet,
									uri: rawResult.uri,
									range: `${rawResult.range?.start?.line || 0}:${rawResult.range?.start?.character || 0}-${rawResult.range?.end?.line || 0}:${rawResult.range?.end?.character || 0}`,
									symbol: `${rawResult.symbolInfo?.name || 'unknown'}(${rawResult.symbolInfo?.kind || 0})`,
									...(rawResult.callHierarchy ? { callHierarchy: rawResult.callHierarchy } : {}),
									...(rawResult.usages ? { usages: rawResult.usages } : {})
								};
							}
						}
						
						const wrappedResult = {
							success: true,
							data: resultData,
						}
						pushToolResult(JSON.stringify(wrappedResult, null, 2))
					}
				} else if (rawResult === null) {
					// Null result is valid for some LSP operations (e.g., no hover info available)
					// Wrap in success object with null data
					const wrappedResult = {
						success: true,
						data: null,
					}
					pushToolResult(JSON.stringify(wrappedResult, null, 2))
				} else if (typeof rawResult === 'string') {
					// String result is valid for some LSP operations (e.g., find_usages table format)
					// Wrap in success object for consistency
					const wrappedResult = {
						success: true,
						data: rawResult,
					}
					pushToolResult(JSON.stringify(wrappedResult, null, 2))
				} else {
					// Not an object, string, or null. Highly unexpected.
					pushToolResult(
						formatResponse.toolError(
							`LSP operation '${lsp_operation}' returned an unexpected result type: ${typeof rawResult}. Value: ${String(rawResult)}`,
						),
					)
				}
			} catch (e) {
				await handleError(`executing lsp operation '${lsp_operation}'`, e as Error)
				pushToolResult(formatResponse.toolError(`Error during '${lsp_operation}': ${(e as Error).message}`))
			}
		} else {
			cline.consecutiveMistakeCount++
			cline.recordToolError(block.name as any)
			pushToolResult(formatResponse.toolError(`Unknown lsp operation: ${lsp_operation}`))
		}
	} catch (error) {
		// Catch errors from parsing argsJson or other unexpected issues
		await handleError(`lsp tool general error for operation '${lsp_operation}'`, error as Error)
		pushToolResult(formatResponse.toolError(`Unexpected error in lsp tool: ${(error as Error).message}`))
	}
}
