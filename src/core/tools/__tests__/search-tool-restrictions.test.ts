import { describe, it, expect, vi, beforeEach } from "vitest"
import { globTool } from "../globTool"
import { searchFilesTool } from "../searchFilesTool"
import { lspTool } from "../lspTool"
import { formatResponse } from "../../prompts/responses"

describe("Search Tool Restriction Tests", () => {
	let mockCline: any
	let mockAskApproval: any
	let mockHandleError: any
	let mockPushToolResult: any
	let mockRemoveClosingTag: any

	beforeEach(() => {
		mockCline = {
			isParallel: false, // Main agent by default
			consecutiveMistakeCount: 0,
			recordToolError: vi.fn(),
			ask: vi.fn().mockResolvedValue(undefined),
			cwd: "/test/workspace",
			providerRef: {
				deref: vi.fn().mockReturnValue({
					getState: vi.fn().mockResolvedValue({ customModes: [] }),
					contextProxy: {
						getValue: vi.fn().mockReturnValue(false), // alwaysAllowLsp = false
					},
				}),
			},
			emit: vi.fn(),
			checkpointSave: vi.fn(),
			enableCheckpoints: false,
			pausedModeSlug: "default",
			isPaused: false,
			sayAndCreateMissingParamError: vi.fn().mockResolvedValue("Missing parameter error"),
			say: vi.fn().mockResolvedValue(undefined),
		}

		mockAskApproval = vi.fn().mockResolvedValue(false) // Deny approval to avoid execution
		mockHandleError = vi.fn()
		mockPushToolResult = vi.fn()
		mockRemoveClosingTag = vi.fn((tag, content) => content)
	})

	describe("globTool", () => {
		it("should reject glob usage when current task is a main agent", async () => {
			// Set the task as main agent
			mockCline.isParallel = false

			const block = {
				name: "glob",
				params: {
					pattern: "**/*.ts",
				},
				partial: false,
			}

			await globTool(
				mockCline as any,
				block as any,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			// Verify error handling
			expect(mockCline.consecutiveMistakeCount).toBe(1)
			expect(mockCline.recordToolError).toHaveBeenCalledWith("glob")
			expect(mockPushToolResult).toHaveBeenCalledWith(
				formatResponse.toolError(
					"You are a main agent. Main agent cannot use the 'glob' tool. Please use the subagent tool to delegate search operations to subagents.",
				),
			)
		})

		it("should allow glob usage when current task is a subagent", async () => {
			// Set the task as subagent
			mockCline.isParallel = true

			const block = {
				name: "glob",
				params: {
					pattern: "**/*.ts",
				},
				partial: false,
			}

			await globTool(
				mockCline as any,
				block as any,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			// Verify no error was recorded for the restriction
			expect(mockCline.consecutiveMistakeCount).toBe(0)
			expect(mockCline.recordToolError).not.toHaveBeenCalledWith("glob")
			// Note: The tool may still fail due to missing dependencies, but not due to restriction
		})
	})

	describe("searchFilesTool", () => {
		it("should reject search_files usage when current task is a main agent", async () => {
			// Set the task as main agent
			mockCline.isParallel = false

			const block = {
				name: "search_files",
				params: {
					_text: JSON.stringify({
						pattern: "TODO",
						path: "src",
					}),
				},
				partial: false,
			}

			await searchFilesTool(
				mockCline as any,
				block as any,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			// Verify error handling
			expect(mockCline.consecutiveMistakeCount).toBe(1)
			expect(mockCline.recordToolError).toHaveBeenCalledWith("search_files")
			expect(mockPushToolResult).toHaveBeenCalledWith(
				formatResponse.toolError(
					"You are a main agent. Main agent cannot use the 'search_files' tool. Please use the subagent tool to delegate search operations to subagents.",
				),
			)
		})

		it("should allow search_files usage when current task is a subagent", async () => {
			// Set the task as subagent
			mockCline.isParallel = true

			const block = {
				name: "search_files",
				params: {
					_text: JSON.stringify({
						pattern: "TODO",
						path: "src",
					}),
				},
				partial: false,
			}

			await searchFilesTool(
				mockCline as any,
				block as any,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			// Verify no error was recorded for the restriction
			expect(mockCline.consecutiveMistakeCount).toBe(0)
			expect(mockCline.recordToolError).not.toHaveBeenCalledWith("search_files")
			// Note: The tool may still fail due to missing dependencies, but not due to restriction
		})
	})

	describe("lspTool - search_symbols operation", () => {
		it("should reject search_symbols usage when current task is a main agent", async () => {
			// Set the task as main agent
			mockCline.isParallel = false

			const block = {
				name: "lsp",
				params: {
					lsp_operation: "search_symbols",
					_text: JSON.stringify({
						name_path: "UserService",
					}),
				},
				partial: false,
			}

			await lspTool(
				mockCline as any,
				block as any,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
			)

			// Verify error handling
			expect(mockCline.consecutiveMistakeCount).toBe(1)
			expect(mockCline.recordToolError).toHaveBeenCalledWith("search_symbols")
			expect(mockPushToolResult).toHaveBeenCalledWith(
				formatResponse.toolError(
					"You are a main agent. Main agent cannot use the 'search_symbols' tool. Please use the subagent tool to delegate search operations to subagents.",
				),
			)
		})

		it("should allow search_symbols usage when current task is a subagent", async () => {
			// Set the task as subagent
			mockCline.isParallel = true

			const block = {
				name: "lsp",
				params: {
					lsp_operation: "search_symbols",
					_text: JSON.stringify({
						name_path: "UserService",
					}),
				},
				partial: false,
			}

			await lspTool(
				mockCline as any,
				block as any,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
			)

			// Verify no error was recorded for the restriction
			expect(mockCline.consecutiveMistakeCount).toBe(0)
			expect(mockCline.recordToolError).not.toHaveBeenCalledWith("search_symbols")
			// Note: The tool may still fail due to missing dependencies, but not due to restriction
		})

		it("should allow other LSP operations when current task is a main agent", async () => {
			// Set the task as main agent
			mockCline.isParallel = false

			const block = {
				name: "lsp",
				params: {
					lsp_operation: "get_document_symbols",
					_text: JSON.stringify({
						textDocument: { uri: "file:///test.ts" },
					}),
				},
				partial: false,
			}

			await lspTool(
				mockCline as any,
				block as any,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
			)

			// Verify no restriction error was recorded
			expect(mockCline.recordToolError).not.toHaveBeenCalledWith("search_symbols")
			// Note: The tool may still fail due to missing dependencies, but not due to restriction
		})
	})

	describe("Error message format consistency", () => {
		it("should use consistent error message format across all search tools", async () => {
			mockCline.isParallel = false // Main agent

			// Reset mock before each test
			mockPushToolResult.mockClear()

			// Test glob tool
			await globTool(
				mockCline as any,
				{ name: "glob", params: { pattern: "**/*.ts" }, partial: false } as any,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			// Test search_files tool
			await searchFilesTool(
				mockCline as any,
				{
					name: "search_files",
					params: { _text: JSON.stringify({ pattern: "TODO" }) },
					partial: false,
				} as any,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			// Test lsp search_symbols operation
			await lspTool(
				mockCline as any,
				{
					name: "lsp",
					params: {
						lsp_operation: "search_symbols",
						_text: JSON.stringify({ name_path: "Test" })
					},
					partial: false,
				} as any,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
			)

			// Verify all error messages follow the same pattern
			const calls = mockPushToolResult.mock.calls
			expect(calls).toHaveLength(3)

			// Check that all error messages start with "You are a main agent. Main agent cannot use the"
			calls.forEach((call) => {
				const errorMessage = call[0]
				expect(errorMessage).toMatch(/You are a main agent\. Main agent cannot use the '.+' tool\./)
				expect(errorMessage).toContain("Please use the subagent tool to delegate search operations to subagents.")
			})
		})
	})
})