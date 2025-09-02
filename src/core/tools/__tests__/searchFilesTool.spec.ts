import { describe, it, expect, vi, beforeEach } from "vitest"
import { searchFilesTool } from "../searchFilesTool"
import { Task } from "../../task/Task"
import { ToolUse } from "../../../shared/tools"

// Mock the ripgrep service
vi.mock("../../../services/ripgrep", () => ({
	regexSearchFilesAdvanced: vi.fn(),
}))

// Mock path utilities
vi.mock("../../../utils/path", () => ({
	getReadablePath: vi.fn((cwd, path) => path || "."),
}))

vi.mock("../../../utils/pathUtils", () => ({
	isPathOutsideWorkspace: vi.fn(() => false),
}))

describe("searchFilesTool", () => {
	let mockTask: Partial<Task>
	let mockAskApproval: any
	let mockHandleError: any
	let mockPushToolResult: any
	let mockRemoveClosingTag: any
	let mockRegexSearchFilesAdvanced: any

	beforeEach(async () => {
		vi.clearAllMocks()

		// Setup task mock
		mockTask = {
			cwd: "/test/workspace",
			consecutiveMistakeCount: 0,
			recordToolError: vi.fn(),
			sayAndCreateMissingParamError: vi.fn().mockResolvedValue("Missing parameter error"),
			ask: vi.fn(),
			zentaraIgnoreController: undefined,
		}

		// Setup function mocks
		mockAskApproval = vi.fn().mockResolvedValue(true)
		mockHandleError = vi.fn()
		mockPushToolResult = vi.fn()
		mockRemoveClosingTag = vi.fn((tag, content) => content)

		// Setup ripgrep mock
		const { regexSearchFilesAdvanced } = await import("../../../services/ripgrep")
		mockRegexSearchFilesAdvanced = vi.mocked(regexSearchFilesAdvanced)
		mockRegexSearchFilesAdvanced.mockResolvedValue("Mock search results")
	})

	describe("partial blocks", () => {
		it("should handle partial blocks correctly", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "test"}' },
				partial: true,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockTask.ask).toHaveBeenCalledWith("tool", expect.stringContaining('"tool":"searchFiles"'), true)
		})
	})

	describe("JSON parameter parsing", () => {
		it("should parse valid JSON parameters correctly", async () => {
			const searchOptions = {
				pattern: "function\\s+\\w+",
				path: "src",
				output_mode: "content",
				"-n": true,
				"-C": 3,
			}

			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: JSON.stringify(searchOptions) },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
				"/test/workspace",
				expect.objectContaining({
					pattern: "function\\s+\\w+",
					path: "/test/workspace/src",
					output_mode: "content",
					"-n": true,
					"-C": 3,
				}),
				undefined,
			)
		})

		it("should handle missing _text parameter", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: {},
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockTask.consecutiveMistakeCount).toBe(1)
			expect(mockTask.recordToolError).toHaveBeenCalledWith("search_files")
			expect(mockTask.sayAndCreateMissingParamError).toHaveBeenCalledWith("search_files", "JSON parameters")
		})

		it("should handle empty _text parameter", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: "" },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockTask.consecutiveMistakeCount).toBe(1)
			expect(mockTask.recordToolError).toHaveBeenCalledWith("search_files")
			expect(mockTask.sayAndCreateMissingParamError).toHaveBeenCalledWith("search_files", "JSON parameters")
		})

		it("should handle invalid JSON", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": invalid json}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockTask.consecutiveMistakeCount).toBe(1)
			expect(mockTask.recordToolError).toHaveBeenCalledWith("search_files")
			expect(mockTask.sayAndCreateMissingParamError).toHaveBeenCalledWith("search_files", "valid JSON parameters")
		})

		it("should handle missing pattern in JSON", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"path": "src", "output_mode": "content"}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockTask.consecutiveMistakeCount).toBe(1)
			expect(mockTask.recordToolError).toHaveBeenCalledWith("search_files")
			expect(mockTask.sayAndCreateMissingParamError).toHaveBeenCalledWith("search_files", "pattern")
		})
	})

	describe("path resolution", () => {
		it("should resolve relative paths correctly", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "test", "path": "src/components"}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
				"/test/workspace",
				expect.objectContaining({
					path: "/test/workspace/src/components",
				}),
				undefined,
			)
		})

		it("should default to cwd when no path provided", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "test"}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
				"/test/workspace",
				expect.objectContaining({
					path: "/test/workspace",
				}),
				undefined,
			)
		})
	})

	describe("approval flow", () => {
		it("should show formatted JSON in approval prompt", async () => {
			const searchOptions = {
				pattern: "test",
				output_mode: "content",
				"-n": true,
			}

			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: JSON.stringify(searchOptions) },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockAskApproval).toHaveBeenCalledWith("tool", expect.stringContaining("Pattern: test"))
		})

		it("should not execute search when approval is denied", async () => {
			mockAskApproval.mockResolvedValue(false)

			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "test"}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).not.toHaveBeenCalled()
			expect(mockPushToolResult).not.toHaveBeenCalled()
		})

		it("should execute search when approval is granted", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "test"}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalled()
			expect(mockPushToolResult).toHaveBeenCalledWith("Mock search results")
		})
	})

	describe("output_mode validation", () => {
		it("should reject invalid output_mode values", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "test", "output_mode": "invalid_mode"}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockTask.consecutiveMistakeCount).toBe(1)
			expect(mockTask.recordToolError).toHaveBeenCalledWith("search_files")
			expect(mockTask.sayAndCreateMissingParamError).toHaveBeenCalledWith(
				"search_files",
				"output_mode must be one of: content, files_with_matches, count",
			)
			expect(mockRegexSearchFilesAdvanced).not.toHaveBeenCalled()
		})

		it("should accept valid output_mode values", async () => {
			const validModes = ["content", "files_with_matches", "count"]

			for (const mode of validModes) {
				vi.clearAllMocks()
				mockAskApproval.mockResolvedValue(true)

				const block: ToolUse = {
					type: "tool_use",
					name: "search_files",
					params: { _text: JSON.stringify({ pattern: "test", output_mode: mode }) },
					partial: false,
				}

				await searchFilesTool(
					mockTask as Task,
					block,
					mockAskApproval,
					mockHandleError,
					mockPushToolResult,
					mockRemoveClosingTag,
				)

				expect(mockRegexSearchFilesAdvanced).toHaveBeenCalled()
				expect(mockTask.sayAndCreateMissingParamError).not.toHaveBeenCalled()
			}
		})
	})

	describe("line number parameter validation", () => {
		it("should warn when -n is used with non-content output modes", async () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "test", "output_mode": "files_with_matches", "-n": true}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(consoleSpy).toHaveBeenCalledWith(
				"Line numbers (-n) are only shown in 'content' output mode, parameter will be ignored",
			)
			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalled() // Should still proceed

			consoleSpy.mockRestore()
		})

		it("should not warn when -n is used with content output mode", async () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "test", "output_mode": "content", "-n": true}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(consoleSpy).not.toHaveBeenCalled()
			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalled()

			consoleSpy.mockRestore()
		})
	})

	describe("advanced search options", () => {
		it("should handle all search options", async () => {
			const searchOptions = {
				pattern: "function\\s+\\w+",
				path: "src",
				output_mode: "content",
				glob: "*.{js,ts}",
				type: "js",
				"-i": true,
				"-n": true,
				"-A": 2,
				"-B": 1,
				"-C": 3,
				multiline: true,
				head_limit: 50,
			}

			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: JSON.stringify(searchOptions) },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
				"/test/workspace",
				expect.objectContaining({
					pattern: "function\\s+\\w+",
					path: "/test/workspace/src",
					output_mode: "content",
					glob: "*.{js,ts}",
					type: "js",
					"-i": true,
					"-n": true,
					"-A": 2,
					"-B": 1,
					"-C": 3,
					multiline: true,
					head_limit: 50,
				}),
				undefined,
			)
		})

		it("should handle files_with_matches output mode", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "TODO", "output_mode": "files_with_matches"}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
				"/test/workspace",
				expect.objectContaining({
					output_mode: "files_with_matches",
				}),
				undefined,
			)
		})

		it("should handle count output mode", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "import", "output_mode": "count"}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
				"/test/workspace",
				expect.objectContaining({
					output_mode: "count",
				}),
				undefined,
			)
		})

		it("should handle case insensitive search", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "Error", "-i": true}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
				"/test/workspace",
				expect.objectContaining({
					"-i": true,
				}),
				undefined,
			)
		})

		it("should handle multiline search", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "function.*\\\\{[\\\\s\\\\S]*?\\\\}", "multiline": true}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
				"/test/workspace",
				expect.objectContaining({
					multiline: true,
				}),
				undefined,
			)
		})

		it("should handle context options", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "error", "-C": 5}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
				"/test/workspace",
				expect.objectContaining({
					"-C": 5,
				}),
				undefined,
			)
		})

		it("should handle file type filtering", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "console.log", "type": "js"}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
				"/test/workspace",
				expect.objectContaining({
					type: "js",
				}),
				undefined,
			)
		})

		it("should handle glob pattern filtering", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "interface", "glob": "*.{ts,tsx}"}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
				"/test/workspace",
				expect.objectContaining({
					glob: "*.{ts,tsx}",
				}),
				undefined,
			)
		})

		it("should handle head_limit option", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "TODO", "head_limit": 20}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
				"/test/workspace",
				expect.objectContaining({
					head_limit: 20,
				}),
				undefined,
			)
		})
		it("should handle head_limit edge cases and validation", async () => {
			// Test cases for different head_limit values
			const testCases = [
				{ head_limit: 0, description: "zero head_limit" },
				{ head_limit: -5, description: "negative head_limit" },
				{ head_limit: 200, description: "head_limit exceeding maximum" },
				{ head_limit: 100, description: "head_limit at maximum" },
				{ head_limit: 50, description: "valid head_limit within range" },
			]

			for (const testCase of testCases) {
				vi.clearAllMocks()
				mockAskApproval.mockResolvedValue(true)

				const block: ToolUse = {
					type: "tool_use",
					name: "search_files",
					params: { _text: JSON.stringify({ pattern: "test", head_limit: testCase.head_limit }) },
					partial: false,
				}

				await searchFilesTool(
					mockTask as Task,
					block,
					mockAskApproval,
					mockHandleError,
					mockPushToolResult,
					mockRemoveClosingTag,
				)

				// All cases should pass through to regexSearchFilesAdvanced
				// The validation happens in the ripgrep service layer
				expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
					"/test/workspace",
					expect.objectContaining({
						head_limit: testCase.head_limit,
					}),
					undefined,
				)
			}
		})

		it("should handle missing head_limit (default behavior)", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "test"}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			// Should pass through without head_limit, letting the service apply defaults
			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
				"/test/workspace",
				expect.objectContaining({
					pattern: "test",
					// head_limit should be undefined, allowing service to apply default
				}),
				undefined,
			)
			
			// Ensure head_limit is not set when not provided
			const callArgs = mockRegexSearchFilesAdvanced.mock.calls[0][1]
			expect(callArgs.head_limit).toBeUndefined()
		})
	})

	describe("error handling", () => {
		it("should handle search errors gracefully", async () => {
			mockRegexSearchFilesAdvanced.mockRejectedValue(new Error("Search failed"))

			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "test"}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockHandleError).toHaveBeenCalledWith("searching files", expect.any(Error))
		})

		it("should reset consecutive mistake count on successful operation", async () => {
			mockTask.consecutiveMistakeCount = 3

			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "test"}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockTask.consecutiveMistakeCount).toBe(0)
		})
	})

	describe("ZentaraIgnoreController integration", () => {
		it("should pass ZentaraIgnoreController to search function", async () => {
			const mockIgnoreController = { validateAccess: vi.fn() }
			mockTask.zentaraIgnoreController = mockIgnoreController as any

			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: { _text: '{"pattern": "test"}' },
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
				"/test/workspace",
				expect.any(Object),
				mockIgnoreController,
			)
		})
	})

	describe("real-world search scenarios", () => {
		it("should handle function definition search", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: {
					_text: JSON.stringify({
						pattern: "(function|const|let)\\s+\\w+\\s*=",
						type: "js",
						output_mode: "content",
						"-n": true,
					}),
				},
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
				"/test/workspace",
				expect.objectContaining({
					pattern: "(function|const|let)\\s+\\w+\\s*=",
					type: "js",
					output_mode: "content",
					"-n": true,
				}),
				undefined,
			)
		})

		it("should handle TODO/FIXME search", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: {
					_text: JSON.stringify({
						pattern: "(TODO|FIXME|HACK|XXX|BUG):",
						output_mode: "content",
						"-n": true,
						"-i": true,
					}),
				},
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
				"/test/workspace",
				expect.objectContaining({
					pattern: "(TODO|FIXME|HACK|XXX|BUG):",
					output_mode: "content",
					"-n": true,
					"-i": true,
				}),
				undefined,
			)
		})

		it("should handle import statement search", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: {
					_text: JSON.stringify({
						pattern: "^import.*from\\s+['\"]",
						glob: "*.{js,ts,jsx,tsx}",
						output_mode: "content",
					}),
				},
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
				"/test/workspace",
				expect.objectContaining({
					pattern: "^import.*from\\s+['\"]",
					glob: "*.{js,ts,jsx,tsx}",
					output_mode: "content",
				}),
				undefined,
			)
		})

		it("should handle console.log cleanup search", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "search_files",
				params: {
					_text: JSON.stringify({
						pattern: "console\\.(log|debug|info|warn|error)",
						type: "js",
						output_mode: "files_with_matches",
					}),
				},
				partial: false,
			}

			await searchFilesTool(
				mockTask as Task,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockRegexSearchFilesAdvanced).toHaveBeenCalledWith(
				"/test/workspace",
				expect.objectContaining({
					pattern: "console\\.(log|debug|info|warn|error)",
					type: "js",
					output_mode: "files_with_matches",
				}),
				undefined,
			)
		})
	})
})
