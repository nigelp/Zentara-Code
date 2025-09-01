// npx vitest src/core/tools/__tests__/lspTool.test.ts

import { describe, it, expect, beforeEach, vi } from "vitest"
import { lspTool } from "../lspTool"
import { Task } from "../../task/Task"
import type { LspToolUse, ToolResponse } from "../../../shared/tools"
import type { ClineAsk, ToolProgressStatus } from "@roo-code/types"

// Mock dependencies
vi.mock("vscode", () => {
	const mockDisposable = { dispose: vi.fn() }
	const mockEventEmitter = vi.fn(() => ({
		event: vi.fn(),
		fire: vi.fn(),
		dispose: vi.fn(),
	}))
	return {
		EventEmitter: mockEventEmitter,
		window: {
			createOutputChannel: vi.fn(() => ({
				appendLine: vi.fn(),
				show: vi.fn(),
				dispose: vi.fn(),
				clear: vi.fn(),
				hide: vi.fn(),
				name: "mockOutputChannel",
				append: vi.fn(),
				replace: vi.fn(),
			})),
		},
	}
})

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
	},
}))

vi.mock("../lspToolValidation", () => ({
	validateLspOperationArgs: vi.fn(),
}))

vi.mock("../../../roo_debug/src/vscodeUtils", () => ({
	outputChannel: {
		appendLine: vi.fn(),
		show: vi.fn(),
		clear: vi.fn(),
		hide: vi.fn(),
	},
}))

// Import mocked modules
import { lspController } from "../../../zentara_lsp"
import { validateLspOperationArgs } from "../lspToolValidation"

describe("lspTool", () => {
	let mockTask: Task
	let mockAskApproval: any
	let mockHandleError: any
	let mockPushToolResult: any
	let mockLspController: any

	beforeEach(() => {
		// Reset all mocks before each test
		vi.clearAllMocks()

		mockAskApproval = vi.fn().mockResolvedValue(true)
		mockHandleError = vi.fn().mockResolvedValue(undefined)
		mockPushToolResult = vi.fn()
		mockLspController = lspController as any

		// Mock Task instance
		mockTask = {
			taskId: "test-task",
			instanceId: 1,
			consecutiveMistakeCount: 0,
			recordToolError: vi.fn(),
			sayAndCreateMissingParamError: vi.fn().mockResolvedValue("Missing parameter error"),
			say: vi.fn().mockResolvedValue(undefined),
		} as any

		// Default validation mock - success
		;(validateLspOperationArgs as any).mockReturnValue({
			isValid: true,
			transformedArgs: {},
		})
	})

	describe("Parameter Validation", () => {
		it("should handle missing lsp_operation parameter", async () => {
			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "", // Empty operation
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockTask.consecutiveMistakeCount).toBe(1)
			expect(mockTask.recordToolError).toHaveBeenCalledWith("lsp")
			expect(mockTask.sayAndCreateMissingParamError).toHaveBeenCalledWith("lsp", "lsp_operation")
			expect(mockPushToolResult).toHaveBeenCalledWith("Missing parameter error")
		})

		it("should handle undefined lsp_operation parameter", async () => {
			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: undefined as any,
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockTask.consecutiveMistakeCount).toBe(1)
			expect(mockTask.recordToolError).toHaveBeenCalledWith("lsp")
		})
	})

	describe("Approval Flow", () => {
		it("should request approval with no arguments", async () => {
			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockAskApproval).toHaveBeenCalledWith("tool", expect.stringContaining('"operation":"find_usages"'))
			expect(mockAskApproval).toHaveBeenCalledWith("tool", expect.stringContaining('"content":"(No arguments)"'))
		})

		it("should request approval with JSON arguments", async () => {
			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "go_to_definition",
					_text: '{"uri": "file:///test.ts", "line": 10, "character": 5}',
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockAskApproval).toHaveBeenCalledWith(
				"tool",
				expect.stringContaining('"operation":"go_to_definition"'),
			)
			expect(mockAskApproval).toHaveBeenCalledWith(
				"tool",
				expect.stringMatching(/"content":".*uri.*test\.ts.*"/s),
			)
		})

		it("should handle malformed JSON in _text gracefully for approval", async () => {
			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
					_text: "invalid json{",
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockAskApproval).toHaveBeenCalledWith("tool", expect.stringContaining('"content":"invalid json{"'))
		})

		it("should handle approval denial", async () => {
			mockAskApproval.mockResolvedValue(false)

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockAskApproval).toHaveBeenCalled()
			// Should exit early without calling LSP controller
			expect(mockLspController.findUsages).not.toHaveBeenCalled()
		})

		it("should handle approval error", async () => {
			const approvalError = new Error("Approval failed")
			mockAskApproval.mockRejectedValue(approvalError)

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockHandleError).toHaveBeenCalledWith(
				"asking approval for lsp operation 'find_usages'",
				approvalError,
			)
			expect(mockPushToolResult).toHaveBeenCalledWith(
				expect.stringContaining("Error asking for approval: Approval failed"),
			)
		})
	})

	describe("Argument Parsing", () => {
		it("should parse valid JSON arguments", async () => {
			const testArgs = { uri: "file:///test.ts", line: 10, character: 5 }
			mockLspController.findUsages.mockResolvedValue({ success: true, data: [] })

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
					_text: JSON.stringify(testArgs),
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(validateLspOperationArgs).toHaveBeenCalledWith("find_usages", testArgs)
		})

		it("should handle null JSON gracefully", async () => {
			mockLspController.findUsages.mockResolvedValue({ success: true, data: [] })

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
					_text: "null",
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(validateLspOperationArgs).toHaveBeenCalledWith("find_usages", {})
		})

		it("should handle primitive JSON values", async () => {
			mockLspController.findUsages.mockResolvedValue({ success: true, data: [] })

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
					_text: '"string value"',
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(validateLspOperationArgs).toHaveBeenCalledWith("find_usages", "string value")
		})

		it("should handle invalid JSON", async () => {
			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
					_text: "invalid json{",
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockHandleError).toHaveBeenCalledWith(
				"parsing JSON content for lsp operation find_usages",
				expect.any(Error),
			)
			expect(mockPushToolResult).toHaveBeenCalledWith(
				expect.stringContaining("Invalid JSON content provided for operation 'find_usages'"),
			)
		})

		it("should handle empty _text", async () => {
			mockLspController.findUsages.mockResolvedValue({ success: true, data: [] })

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
					_text: "",
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(validateLspOperationArgs).toHaveBeenCalledWith("find_usages", {})
		})
	})

	describe("Validation", () => {
		it("should handle validation failure", async () => {
			;(validateLspOperationArgs as any).mockReturnValue({
				isValid: false,
				message: "Invalid arguments for find_usages operation",
			})

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
					_text: '{"invalid": "args"}',
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockPushToolResult).toHaveBeenCalledWith(
				expect.stringContaining("Invalid arguments for find_usages operation"),
			)
			expect(mockLspController.findUsages).not.toHaveBeenCalled()
		})

		it("should use transformed arguments from validation", async () => {
			;(validateLspOperationArgs as any).mockReturnValue({
				isValid: true,
				transformedArgs: { uri: "file:///test.ts", line: 10 },
			})

			mockLspController.findUsages.mockResolvedValue({ success: true, data: [] })

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
					_text: '{"path": "test.ts", "line": "10"}',
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockLspController.findUsages).toHaveBeenCalledWith({ uri: "file:///test.ts", line: 10 })
		})
	})

	describe("Operation Execution", () => {
		it("should execute valid LSP operation successfully", async () => {
			const mockResult = { success: true, data: [{ uri: "test.ts", range: {} }] }
			mockLspController.findUsages.mockResolvedValue(mockResult)

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
					_text: '{"uri": "file:///test.ts", "line": 10}',
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockLspController.findUsages).toHaveBeenCalled()
			expect(mockPushToolResult).toHaveBeenCalledWith(JSON.stringify(mockResult, null, 2))
		})

		it("should handle LSP operation failure", async () => {
			const mockResult = { success: false, error: "Symbol not found" }
			mockLspController.goToDefinition.mockResolvedValue(mockResult)

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "go_to_definition",
					_text: '{"uri": "file:///test.ts", "line": 10}',
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockPushToolResult).toHaveBeenCalledWith(
				expect.stringContaining("LSP operation 'go_to_definition' failed"),
			)
		})

		it("should handle unexpected result structure", async () => {
			const mockResult = { data: "some data", noSuccessField: true }
			mockLspController.findUsages.mockResolvedValue(mockResult)

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockPushToolResult).toHaveBeenCalledWith(
				expect.stringContaining("completed with an unusual result structure"),
			)
		})

		it("should handle non-object result", async () => {
			mockLspController.findUsages.mockResolvedValue("string result")

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockPushToolResult).toHaveBeenCalledWith(
				expect.stringContaining("completed with an unexpected non-object result"),
			)
		})

		it("should handle null result", async () => {
			mockLspController.findUsages.mockResolvedValue(null)

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockPushToolResult).toHaveBeenCalledWith(
				expect.stringContaining("completed with an unexpected non-object result: null"),
			)
		})

		it("should handle operation execution error", async () => {
			const operationError = new Error("LSP server not available")
			mockLspController.findUsages.mockRejectedValue(operationError)

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockHandleError).toHaveBeenCalledWith("executing lsp operation 'find_usages'", operationError)
			expect(mockPushToolResult).toHaveBeenCalledWith(
				expect.stringContaining("Error during 'find_usages': LSP server not available"),
			)
		})

		it("should handle unknown operation", async () => {
			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "unknown_operation",
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockTask.consecutiveMistakeCount).toBe(1)
			expect(mockTask.recordToolError).toHaveBeenCalledWith("lsp")
			expect(mockPushToolResult).toHaveBeenCalledWith(
				expect.stringContaining("Unknown lsp operation: unknown_operation"),
			)
		})
	})

	describe("Different LSP Operations", () => {
		it("should handle find_usages operation", async () => {
			const mockResult = { success: true, usages: [] }
			mockLspController.findUsages.mockResolvedValue(mockResult)

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
					_text: '{"uri": "file:///test.ts", "line": 10}',
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockLspController.findUsages).toHaveBeenCalled()
			expect(mockPushToolResult).toHaveBeenCalledWith(JSON.stringify(mockResult, null, 2))
		})

		it("should handle get_hover_info operation", async () => {
			const mockResult = { success: true, hover: { contents: "function info" } }
			mockLspController.getHoverInfo.mockResolvedValue(mockResult)

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "get_hover_info",
					_text: '{"uri": "file:///test.ts", "line": 10}',
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockLspController.getHoverInfo).toHaveBeenCalled()
			expect(mockPushToolResult).toHaveBeenCalledWith(JSON.stringify(mockResult, null, 2))
		})

		it("should handle rename operation", async () => {
			const mockResult = { success: true, edits: [] }
			mockLspController.rename.mockResolvedValue(mockResult)

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "rename",
					_text: '{"uri": "file:///test.ts", "line": 10, "newName": "newVariableName"}',
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockLspController.rename).toHaveBeenCalled()
			expect(mockPushToolResult).toHaveBeenCalledWith(JSON.stringify(mockResult, null, 2))
		})

		it("should handle search_symbols operation", async () => {
			const mockResult = { success: true, symbols: [{ name: "myFunction", kind: 12 }] }
			mockLspController.searchSymbols.mockResolvedValue(mockResult)

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "search_symbols",
					_text: '{"name_path": "myFunction", "relative_path": "src/"}',
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockLspController.getSymbols).toHaveBeenCalled()
			expect(mockPushToolResult).toHaveBeenCalledWith(JSON.stringify(mockResult, null, 2))
		})

		it("should handle get_symbols_overview operation", async () => {
			const mockResult = { success: true, overview: { totalSymbols: 42, byKind: {} } }
			mockLspController.getSymbolsOverview.mockResolvedValue(mockResult)

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "get_symbols_overview",
					_text: '{"relative_path": "src/"}',
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockLspController.getSymbolsOverview).toHaveBeenCalled()
			expect(mockPushToolResult).toHaveBeenCalledWith(JSON.stringify(mockResult, null, 2))
		})

		it("should handle insert_after_symbol operation", async () => {
			const mockResult = { success: true, edit: { changes: {} } }
			mockLspController.insertAfterSymbol.mockResolvedValue(mockResult)

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "insert_after_symbol",
					_text: '{"uri": "file:///test.ts", "symbolName": "myFunction", "content": "// Added code"}',
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockLspController.insertAfterSymbol).toHaveBeenCalled()
			expect(mockPushToolResult).toHaveBeenCalledWith(JSON.stringify(mockResult, null, 2))
		})

		it("should handle insert_before_symbol operation", async () => {
			const mockResult = { success: true, edit: { changes: {} } }
			mockLspController.insertBeforeSymbol.mockResolvedValue(mockResult)

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "insert_before_symbol",
					_text: '{"uri": "file:///test.ts", "symbolName": "myFunction", "content": "// Added code"}',
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockLspController.insertBeforeSymbol).toHaveBeenCalled()
			expect(mockPushToolResult).toHaveBeenCalledWith(JSON.stringify(mockResult, null, 2))
		})

		it("should handle replace_symbol_body operation", async () => {
			const mockResult = { success: true, edit: { changes: {} } }
			mockLspController.replaceSymbolBody.mockResolvedValue(mockResult)

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "replace_symbol_body",
					_text: '{"uri": "file:///test.ts", "symbolName": "myFunction", "newBody": "return 42;"}',
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockLspController.replaceSymbolBody).toHaveBeenCalled()
			expect(mockPushToolResult).toHaveBeenCalledWith(JSON.stringify(mockResult, null, 2))
		})
	})

	describe("Error Handling", () => {
		it("should handle general errors", async () => {
			const generalError = new Error("Unexpected error")
			mockAskApproval.mockImplementation(() => {
				throw generalError
			})

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockHandleError).toHaveBeenCalledWith(
				"asking approval for lsp operation 'find_usages'",
				generalError,
			)
		})

		it("should handle errors in catch block", async () => {
			// Mock the validation to throw an error
			;(validateLspOperationArgs as any).mockImplementation(() => {
				throw new Error("Validation error")
			})

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockHandleError).toHaveBeenCalledWith(
				"lsp tool general error for operation 'find_usages'",
				expect.any(Error),
			)
			expect(mockPushToolResult).toHaveBeenCalledWith(expect.stringContaining("Unexpected error in lsp tool"))
		})
	})

	describe("User Interaction", () => {
		it("should show operation approved message", async () => {
			mockLspController.findUsages.mockResolvedValue({ success: true, data: [] })

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_usages",
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockTask.say).toHaveBeenCalledWith("text", "LSP operation approved: find_usages")
		})

		it("should handle complex approval message", async () => {
			const complexArgs = {
				uri: "file:///very/long/path/to/test/file.ts",
				line: 42,
				character: 15,
				context: "reference",
			}

			const block: LspToolUse = {
				type: "tool_use",
				name: "lsp",
				params: {
					lsp_operation: "find_implementations",
					_text: JSON.stringify(complexArgs),
				},
				partial: false,
			}

			await lspTool(mockTask, block, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockAskApproval).toHaveBeenCalledWith(
				"tool",
				expect.stringContaining('"operation":"find_implementations"'),
			)
		})
	})
})
