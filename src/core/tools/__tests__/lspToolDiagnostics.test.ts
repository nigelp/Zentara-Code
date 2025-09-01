import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"

// Mock dependencies - must be hoisted before imports
vi.mock("../../../zentara_lsp", () => ({
	lspController: {
		findUsages: vi.fn(),
		goToDefinition: vi.fn(),
		findImplementations: vi.fn(),
		getHoverInfo: vi.fn(),
		getDocumentSymbols: vi.fn(),
		getCompletions: vi.fn(),
		getSignatureHelp: vi.fn(),
		rename: vi.fn(),
		getCodeActions: vi.fn(),
		getSemanticTokens: vi.fn(),
		getCallHierarchy: vi.fn(),
		getTypeHierarchy: vi.fn(),
		getCodeLens: vi.fn(),
		getSelectionRange: vi.fn(),
		getTypeDefinition: vi.fn(),
		getDeclaration: vi.fn(),
		getDocumentHighlights: vi.fn(),
		getWorkspaceSymbols: vi.fn(),
		getSymbolCodeSnippet: vi.fn(),
		getSymbols: vi.fn(),
		getSymbolsOverview: vi.fn(),
		insertAfterSymbol: vi.fn(),
		insertBeforeSymbol: vi.fn(),
		replaceSymbolBody: vi.fn(),
		// Deprecated/alias methods
		getHover: vi.fn(),
		extractToFunction: vi.fn(),
		extractToVariable: vi.fn(),
		generateImplementation: vi.fn(),
		getDeclarationOverview: vi.fn(),
		findSymbolsAtPosition: vi.fn(),
	},
}))

vi.mock("vscode", () => ({
	Uri: {
		parse: vi.fn((str: string) => ({ 
			fsPath: str.replace("file://", ""),
			toString: () => str 
		})),
		file: vi.fn((path: string) => ({ 
			fsPath: path,
			toString: () => `file://${path}` 
		})),
	},
	DiagnosticSeverity: {
		Error: 0,
		Warning: 1,
		Information: 2,
		Hint: 3,
	},
	languages: {
		getDiagnostics: vi.fn(),
	},
	Range: vi.fn((startLine: number, startChar: number, endLine: number, endChar: number) => ({
		start: { line: startLine, character: startChar },
		end: { line: endLine, character: endChar },
	})),
	Position: vi.fn((line: number, char: number) => ({ line, character: char })),
}))

import * as vscode from "vscode"
import { lspTool } from "../lspTool"
import { Task } from "../../task/Task"
import { LspToolUse } from "../../../shared/tools"
import { formatResponse } from "../../prompts/responses"
import { outputChannel } from "../../../roo_debug/src/vscodeUtils"
import { lspController } from "../../../zentara_lsp"

vi.mock("../../../roo_debug/src/vscodeUtils", () => ({
	outputChannel: {
		appendLine: vi.fn(),
	},
}))

vi.mock("../../prompts/responses", () => ({
	formatResponse: {
		toolError: vi.fn((msg: string) => `Error: ${msg}`),
	},
}))

vi.mock("../lspToolValidation", () => ({
	validateLspOperationArgs: vi.fn((operation: string, args: any) => ({
		isValid: true,
		transformedArgs: args,
		message: "",
	})),
}))

vi.mock("../../../zentara_lsp/src/utils/waitForLanguageServer", () => ({
	waitForLanguageServer: vi.fn(),
	waitForWorkspaceLanguageServers: vi.fn(),
}))

describe("LSP Tool Diagnostics Integration", () => {
	let mockTask: Task
	let mockAskApproval: any
	let mockHandleError: any
	let mockPushToolResult: any
	let capturedResults: string[] = []

	beforeEach(() => {
		vi.clearAllMocks()
		capturedResults = []

		// Create a mock Task with DiffViewProvider
		mockTask = {
			cwd: "/test/workspace",
			fileContextTracker: {
				trackFileContext: vi.fn(),
			},
			didEditFile: false,
			diffViewProvider: {
				preDiagnostics: [],
				editType: undefined,
				relPath: undefined,
				pushToolWriteResult: vi.fn().mockResolvedValue("<file_write_result>...</file_write_result>"),
				reset: vi.fn(),
			},
			say: vi.fn(),
			sayAndCreateMissingParamError: vi.fn().mockResolvedValue("Missing parameter error"),
			consecutiveMistakeCount: 0,
			recordToolError: vi.fn(),
			providerRef: {
				deref: () => ({
					contextProxy: {
						getValue: () => false, // alwaysAllowLsp = false
					},
				}),
			},
		} as any

		mockAskApproval = vi.fn().mockResolvedValue(true)
		mockHandleError = vi.fn()
		mockPushToolResult = vi.fn((result: string) => {
			capturedResults.push(result)
		})
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe("File modification operations with diagnostics", () => {
		it("should use DiffViewProvider for insert_before_symbol with diagnostics", async () => {
			const block: LspToolUse = {
				name: "lsp",
				partial: false,
				params: {
					operation: "insert_before_symbol",
					_text: JSON.stringify({
						textDocument: { uri: "file:///test/workspace/src/app.ts" },
						position: { line: 10, character: 5 },
						content: "// New comment",
					}),
				},
			} as LspToolUse

			// Mock LSP operation success
			vi.mocked(lspController.insertBeforeSymbol).mockResolvedValue({
				success: true,
			})

			// Mock diagnostics after modification
			const diagnostics = [
				{
					range: {
						start: { line: 11, character: 0 },
						end: { line: 11, character: 10 },
					},
					message: "Unexpected token",
					severity: vscode.DiagnosticSeverity.Error,
					source: "ts",
				},
			]
			vi.mocked(vscode.languages.getDiagnostics).mockReturnValue(diagnostics as any)

			try {
				await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)
			} catch (error) {
				console.log("Error in lspTool:", error)
				console.log("Captured results so far:", capturedResults)
				throw error
			}

			// Verify DiffViewProvider was used
			expect(mockTask.diffViewProvider.pushToolWriteResult).toHaveBeenCalledWith(
				mockTask,
				"/test/workspace",
				false
			)
			expect(mockTask.diffViewProvider.reset).toHaveBeenCalled()
			
			// Verify file tracking
			expect(mockTask.fileContextTracker.trackFileContext).toHaveBeenCalledWith(
				"src/app.ts",
				"roo_edited"
			)
			expect(mockTask.didEditFile).toBe(true)

			// Verify diagnostics were captured
			expect(vscode.languages.getDiagnostics).toHaveBeenCalled()
			
			// Verify result was pushed
			console.log("Captured results:", capturedResults)
			console.log("mockHandleError calls:", mockHandleError.mock.calls)
			console.log("pushToolResult calls:", mockPushToolResult.mock.calls)
			expect(capturedResults).toHaveLength(1)
			expect(capturedResults[0]).toContain("<file_write_result>")
		})

		it("should use DiffViewProvider for insert_after_symbol", async () => {
			const block: LspToolUse = {
				name: "lsp",
				partial: false,
				params: {
					operation: "insert_after_symbol",
					_text: JSON.stringify({
						textDocument: { uri: "file:///test/workspace/src/component.tsx" },
						position: { line: 20, character: 0 },
						content: "\n// Additional code",
					}),
				},
			} as LspToolUse

			vi.mocked(lspController.insertAfterSymbol).mockResolvedValue({
				success: true,
			})

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockTask.diffViewProvider.pushToolWriteResult).toHaveBeenCalled()
			expect(mockTask.diffViewProvider.editType).toBe("modify")
			expect(mockTask.diffViewProvider.relPath).toBe("src/component.tsx")
		})

		it("should use DiffViewProvider for replace_symbol_body", async () => {
			const block: LspToolUse = {
				name: "lsp",
				partial: false,
				params: {
					operation: "replace_symbol_body",
					_text: JSON.stringify({
						textDocument: { uri: "file:///test/workspace/lib/utils.py" },
						position: { line: 30, character: 4 },
						content: "return x * 2",
					}),
				},
			} as LspToolUse

			vi.mocked(lspController.replaceSymbolBody).mockResolvedValue({
				success: true,
			})

			// Mock Python diagnostics
			const diagnostics = [
				{
					range: {
						start: { line: 30, character: 11 },
						end: { line: 30, character: 12 },
					},
					message: "Undefined variable 'x'",
					severity: vscode.DiagnosticSeverity.Error,
					source: "Pylance",
				},
			]
			vi.mocked(vscode.languages.getDiagnostics).mockReturnValue(diagnostics as any)

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockTask.diffViewProvider.preDiagnostics).toEqual(diagnostics)
			expect(mockTask.diffViewProvider.pushToolWriteResult).toHaveBeenCalled()
			expect(mockTask.fileContextTracker.trackFileContext).toHaveBeenCalledWith(
				"lib/utils.py",
				"roo_edited"
			)
		})

		it("should fallback to standard response on DiffViewProvider error", async () => {
			const block: LspToolUse = {
				name: "lsp",
				partial: false,
				params: {
					operation: "insert_before_symbol",
					_text: JSON.stringify({
						textDocument: { uri: "file:///test/workspace/src/app.ts" },
						position: { line: 10, character: 5 },
						content: "// New comment",
					}),
				},
			} as LspToolUse

			vi.mocked(lspController.insertBeforeSymbol).mockResolvedValue({
				success: true,
			})

			// Make DiffViewProvider throw an error
			mockTask.diffViewProvider.pushToolWriteResult = vi.fn().mockRejectedValue(
				new Error("DiffViewProvider error")
			)

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			// Should fallback to standard JSON response
			expect(capturedResults).toHaveLength(1)
			expect(capturedResults[0]).toContain('"success": true')
			expect(outputChannel.appendLine).toHaveBeenCalledWith(
				expect.stringContaining("DiffViewProvider error, using standard response")
			)
		})
	})

	describe("Non-modification operations should not use DiffViewProvider", () => {
		it("should not use DiffViewProvider for go_to_definition", async () => {
			const block: LspToolUse = {
				name: "lsp",
				partial: false,
				params: {
					operation: "go_to_definition",
					_text: JSON.stringify({
						textDocument: { uri: "file:///test/workspace/src/app.ts" },
						position: { line: 10, character: 5 },
					}),
				},
			} as LspToolUse

			vi.mocked(lspController.goToDefinition).mockResolvedValue([
				{
					uri: "file:///test/workspace/src/types.ts",
					range: {
						start: { line: 5, character: 0 },
						end: { line: 5, character: 20 },
					},
				},
			])

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			// Should NOT use DiffViewProvider
			expect(mockTask.diffViewProvider.pushToolWriteResult).not.toHaveBeenCalled()
			
			// Should return standard JSON response
			expect(capturedResults).toHaveLength(1)
			expect(capturedResults[0]).toContain('"success": true')
			expect(capturedResults[0]).toContain('"data"')
		})

		it("should not use DiffViewProvider for get_hover_info", async () => {
			const block: LspToolUse = {
				name: "lsp",
				partial: false,
				params: {
					operation: "get_hover_info",
					_text: JSON.stringify({
						textDocument: { uri: "file:///test/workspace/src/app.ts" },
						position: { line: 10, character: 5 },
					}),
				},
			} as LspToolUse

			vi.mocked(lspController.getHoverInfo).mockResolvedValue({
				contents: "string | undefined",
			})

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockTask.diffViewProvider.pushToolWriteResult).not.toHaveBeenCalled()
			expect(capturedResults[0]).toContain('"success": true')
		})
	})

	describe("Error handling with diagnostics", () => {
		it("should handle LSP operation failure", async () => {
			const block: LspToolUse = {
				name: "lsp",
				partial: false,
				params: {
					operation: "insert_before_symbol",
					_text: JSON.stringify({
						textDocument: { uri: "file:///test/workspace/src/app.ts" },
						position: { line: 10, character: 5 },
						content: "// New comment",
					}),
				},
			} as LspToolUse

			vi.mocked(lspController.insertBeforeSymbol).mockResolvedValue({
				success: false,
				content: "No symbol found at position",
			})

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			// Should not use DiffViewProvider on failure
			expect(mockTask.diffViewProvider.pushToolWriteResult).not.toHaveBeenCalled()
			
			// Should return error response
			expect(capturedResults).toHaveLength(1)
			expect(capturedResults[0]).toContain("Error:")
			expect(capturedResults[0]).toContain('"success": false')
		})

		it("should handle missing textDocument.uri for file modification operations", async () => {
			const block: LspToolUse = {
				name: "lsp",
				partial: false,
				params: {
					operation: "insert_before_symbol",
					_text: JSON.stringify({
						position: { line: 10, character: 5 },
						content: "// New comment",
						// Missing textDocument.uri
					}),
				},
			} as LspToolUse

			vi.mocked(lspController.insertBeforeSymbol).mockResolvedValue({
				success: true,
			})

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			// Should not use DiffViewProvider without URI
			expect(mockTask.diffViewProvider.pushToolWriteResult).not.toHaveBeenCalled()
			
			// Should return standard response
			expect(capturedResults).toHaveLength(1)
			expect(capturedResults[0]).toContain('"success": true')
		})
	})

	describe("Diagnostics capture timing", () => {
		it("should capture preDiagnostics before file modification", async () => {
			const preDiagnostics = [
				{
					range: {
						start: { line: 5, character: 0 },
						end: { line: 5, character: 10 },
					},
					message: "Existing error",
					severity: vscode.DiagnosticSeverity.Error,
					source: "ts",
				},
			]
			
			// Set up initial diagnostics
			vi.mocked(vscode.languages.getDiagnostics).mockReturnValue(preDiagnostics as any)

			const block: LspToolUse = {
				name: "lsp",
				partial: false,
				params: {
					operation: "insert_before_symbol",
					_text: JSON.stringify({
						textDocument: { uri: "file:///test/workspace/src/app.ts" },
						position: { line: 10, character: 5 },
						content: "// New comment",
					}),
				},
			} as LspToolUse

			vi.mocked(lspController.insertBeforeSymbol).mockResolvedValue({
				success: true,
			})

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			// Verify preDiagnostics were captured
			expect(mockTask.diffViewProvider.preDiagnostics).toEqual(preDiagnostics)
			expect(vscode.languages.getDiagnostics).toHaveBeenCalledTimes(1)
		})
	})

	describe("Integration with different file types", () => {
		it("should handle TypeScript files", async () => {
			const block: LspToolUse = {
				name: "lsp",
				partial: false,
				params: {
					operation: "replace_symbol_body",
					_text: JSON.stringify({
						textDocument: { uri: "file:///test/workspace/src/index.ts" },
						position: { line: 10, character: 0 },
						content: "console.log('updated');",
					}),
				},
			} as LspToolUse

			vi.mocked(lspController.replaceSymbolBody).mockResolvedValue({
				success: true,
			})

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockTask.diffViewProvider.relPath).toBe("src/index.ts")
		})

		it("should handle Python files", async () => {
			const block: LspToolUse = {
				name: "lsp",
				partial: false,
				params: {
					operation: "insert_after_symbol",
					_text: JSON.stringify({
						textDocument: { uri: "file:///test/workspace/scripts/main.py" },
						position: { line: 15, character: 0 },
						content: "\n    # Additional method",
					}),
				},
			} as LspToolUse

			vi.mocked(lspController.insertAfterSymbol).mockResolvedValue({
				success: true,
			})

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockTask.diffViewProvider.relPath).toBe("scripts/main.py")
		})

		it("should handle deeply nested paths", async () => {
			const block: LspToolUse = {
				name: "lsp",
				partial: false,
				params: {
					operation: "insert_before_symbol",
					_text: JSON.stringify({
						textDocument: { uri: "file:///test/workspace/src/components/ui/buttons/PrimaryButton.tsx" },
						position: { line: 5, character: 0 },
						content: "import React from 'react';",
					}),
				},
			} as LspToolUse

			vi.mocked(lspController.insertBeforeSymbol).mockResolvedValue({
				success: true,
			})

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockTask.diffViewProvider.relPath).toBe("src/components/ui/buttons/PrimaryButton.tsx")
			expect(mockTask.fileContextTracker.trackFileContext).toHaveBeenCalledWith(
				"src/components/ui/buttons/PrimaryButton.tsx",
				"roo_edited"
			)
		})
	})
})