import { describe, it, expect, beforeEach, vi } from "vitest"
import { fetchToolDescriptionTool } from "../fetchToolDescriptionTool"
import { ToolUse } from "../../../shared/tools"
import {
	fetch_tool_description,
	getAvailableToolNames,
	toolExists,
} from "../../../roo_tool_prompt_management/fetch-tool-description"
import { clearAllCaches } from "../../../roo_tool_prompt_management/tool-optimization-integration"

describe("fetchToolDescriptionTool Integration Tests", () => {
	let mockCline: any
	let mockAskApproval: any
	let mockHandleError: any
	let mockPushToolResult: any
	let mockRemoveClosingTag: any
	let toolResults: any[]

	beforeEach(() => {
		vi.clearAllMocks()
		clearAllCaches() // Clear caches to ensure clean test state
		toolResults = []

		mockCline = {
			ask: vi.fn().mockResolvedValue(undefined),
			consecutiveMistakeCount: 0,
			recordToolError: vi.fn(),
			cwd: "/test/workspace",
		}

		mockAskApproval = vi.fn().mockResolvedValue(true)
		mockHandleError = vi.fn().mockResolvedValue(undefined)
		mockPushToolResult = vi.fn((result) => {
			toolResults.push(result)
		})
		mockRemoveClosingTag = vi.fn((tag, content) => content || "")
	})

	describe("Real tool descriptions", () => {
		it("should fetch actual read_file tool description", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "read_file",
				},
				partial: false,
			}

			await fetchToolDescriptionTool(
				mockCline,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(toolResults).toHaveLength(1)
			const description = toolResults[0]
			expect(description).toContain("read_file")
			expect(description).toContain("Description:")
			expect(description).toContain("Parameters:")
			expect(description.length).toBeGreaterThan(500) // Full descriptions are substantial
			expect(mockCline.consecutiveMistakeCount).toBe(0)
		})

		it("should fetch actual debug tool descriptions", async () => {
			const debugTools = ["debug_launch", "debug_set_breakpoint", "debug_evaluate"]

			for (const toolName of debugTools) {
				toolResults = [] // Reset for each tool

				const block: ToolUse = {
					type: "tool_use",
					name: "fetch_tool_description",
					params: {
						tool_name: toolName,
					},
					partial: false,
				}

				await fetchToolDescriptionTool(
					mockCline,
					block,
					mockAskApproval,
					mockHandleError,
					mockPushToolResult,
					mockRemoveClosingTag,
				)

				expect(toolResults).toHaveLength(1)
				const description = toolResults[0]
				expect(description).toContain(toolName)
				expect(description).toContain("debug")
				expect(description.length).toBeGreaterThan(200)
			}
		})

		it("should fetch always available tools descriptions", async () => {
			const alwaysAvailableTools = [
				"ask_followup_question",
				"attempt_completion",
				"switch_mode",
				"new_task",
				"subagent",
				"update_todo_list",
			]

			for (const toolName of alwaysAvailableTools) {
				toolResults = []

				const block: ToolUse = {
					type: "tool_use",
					name: "fetch_tool_description",
					params: {
						tool_name: toolName,
					},
					partial: false,
				}

				await fetchToolDescriptionTool(
					mockCline,
					block,
					mockAskApproval,
					mockHandleError,
					mockPushToolResult,
					mockRemoveClosingTag,
				)

				expect(toolResults).toHaveLength(1)
				const description = toolResults[0]
				expect(description).toBeTruthy()
				expect(description).toContain(toolName)
			}
		})
	})

	describe("Tool listing functionality", () => {
		it("should list all available tools correctly", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "list",
				},
				partial: false,
			}

			await fetchToolDescriptionTool(
				mockCline,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(toolResults).toHaveLength(1)
			const result = toolResults[0]

			// Check for various tool categories
			expect(result).toContain("read_file")
			expect(result).toContain("write_to_file")
			expect(result).toContain("execute_command")
			expect(result).toContain("search_files")
			expect(result).toContain("glob")

			// Check for debug tools
			expect(result).toContain("debug_launch")
			expect(result).toContain("debug_set_breakpoint")

			// Check for always available tools
			expect(result).toContain("subagent")
			expect(result).toContain("update_todo_list")
			expect(result).toContain("fetch_tool_description") // Should include itself

			// Verify it shows the count
			const allTools = getAvailableToolNames()
			expect(result).toContain(`Available Tools (${allTools.length} total)`)
		})

		it("should verify all listed tools actually exist", async () => {
			const allTools = getAvailableToolNames()

			for (const toolName of allTools) {
				expect(toolExists(toolName)).toBe(true)

				// Verify we can fetch description for each tool
				const description = fetch_tool_description(toolName)
				if (description) {
					expect(description).toBeTruthy()
					expect(description.length).toBeGreaterThan(0)
				}
			}
		})
	})

	describe("Caching behavior", () => {
		it("should cache tool descriptions on repeated fetches", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "execute_command",
				},
				partial: false,
			}

			// First fetch
			await fetchToolDescriptionTool(
				mockCline,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			const firstResult = toolResults[0]
			toolResults = [] // Reset

			// Second fetch (should be cached)
			await fetchToolDescriptionTool(
				mockCline,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			const secondResult = toolResults[0]

			// Results should be identical (same cached value)
			expect(secondResult).toBe(firstResult)
			expect(secondResult).toContain("execute_command")
		})

		it("should work correctly after clearing caches", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "apply_diff",
				},
				partial: false,
			}

			// First fetch
			await fetchToolDescriptionTool(
				mockCline,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			const firstResult = toolResults[0]
			expect(firstResult).toContain("apply_diff")

			// Clear caches
			clearAllCaches()
			toolResults = []

			// Fetch again after clearing cache
			await fetchToolDescriptionTool(
				mockCline,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			const secondResult = toolResults[0]

			// Content should be the same, but not the same object reference (regenerated)
			expect(secondResult).toContain("apply_diff")
			expect(secondResult).toEqual(firstResult)
		})
	})

	describe("Tool existence validation", () => {
		it("should correctly identify existing tools", () => {
			const existingTools = [
				"read_file",
				"write_to_file",
				"execute_command",
				"search_files",
				"glob",
				"list_files",
				"apply_diff",
				"debug_launch",
				"subagent",
				"fetch_tool_description",
			]

			for (const toolName of existingTools) {
				expect(toolExists(toolName)).toBe(true)
			}
		})

		it("should correctly identify non-existing tools", () => {
			const nonExistingTools = ["nonexistent_tool", "fake_tool", "not_a_real_tool", "random_name", ""]

			for (const toolName of nonExistingTools) {
				expect(toolExists(toolName)).toBe(false)
			}
		})

		it("should provide relevant suggestions for similar tool names", async () => {
			const testCases = [
				{ input: "read", expected: ["read_file"] },
				{ input: "write", expected: ["write_to_file"] },
				{ input: "debug_", expected: ["debug_launch", "debug_quit", "debug_restart"] },
				{ input: "file", expected: ["read_file", "write_to_file", "search_files", "list_files"] },
			]

			for (const testCase of testCases) {
				toolResults = []

				const block: ToolUse = {
					type: "tool_use",
					name: "fetch_tool_description",
					params: {
						tool_name: testCase.input,
					},
					partial: false,
				}

				await fetchToolDescriptionTool(
					mockCline,
					block,
					mockAskApproval,
					mockHandleError,
					mockPushToolResult,
					mockRemoveClosingTag,
				)

				const result = toolResults[0]

				// Should show error and suggestions
				expect(result).toContain(`Tool '${testCase.input}' not found`)
				expect(result).toContain("Did you mean")

				// Check that at least one expected suggestion is present
				const hasExpectedSuggestion = testCase.expected.some((tool) => result.includes(tool))
				expect(hasExpectedSuggestion).toBe(true)
			}
		})
	})

	describe("Special tool descriptions", () => {
		it("should fetch description for fetch_tool_description itself", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "fetch_tool_description",
				},
				partial: false,
			}

			await fetchToolDescriptionTool(
				mockCline,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(toolResults).toHaveLength(1)
			const description = toolResults[0]

			// Should describe itself
			expect(description).toContain("fetch_tool_description")
			expect(description).toContain("Retrieve Full Tool Documentation")
			expect(description).toContain("tool_name")
			expect(description).toContain("list")
		})

		it("should handle tools with various description lengths", async () => {
			const tools = [
				{ name: "execute_command", minLength: 100 },
				{ name: "read_file", minLength: 100 },
				{ name: "write_to_file", minLength: 100 },
				{ name: "search_files", minLength: 100 },
			]

			for (const tool of tools) {
				if (toolExists(tool.name)) {
					toolResults = []

					const block: ToolUse = {
						type: "tool_use",
						name: "fetch_tool_description",
						params: {
							tool_name: tool.name,
						},
						partial: false,
					}

					await fetchToolDescriptionTool(
						mockCline,
						block,
						mockAskApproval,
						mockHandleError,
						mockPushToolResult,
						mockRemoveClosingTag,
					)

					const description = toolResults[0]
					expect(description).toBeTruthy()
					expect(description.length).toBeGreaterThan(tool.minLength)
					// Ensure it contains the tool name (exact or with underscores)
					expect(description.toLowerCase()).toContain(tool.name)
				}
			}
		})
	})

	describe("Error recovery", () => {
		it("should handle malformed tool names gracefully", async () => {
			const malformedNames = [
				"tool with spaces",
				"tool-with-dashes",
				"UPPERCASE_TOOL",
				"tool.with.dots",
				"tool/with/slashes",
			]

			for (const toolName of malformedNames) {
				toolResults = []
				mockCline.consecutiveMistakeCount = 0

				const block: ToolUse = {
					type: "tool_use",
					name: "fetch_tool_description",
					params: {
						tool_name: toolName,
					},
					partial: false,
				}

				await fetchToolDescriptionTool(
					mockCline,
					block,
					mockAskApproval,
					mockHandleError,
					mockPushToolResult,
					mockRemoveClosingTag,
				)

				// Should handle gracefully without crashing
				expect(toolResults).toHaveLength(1)
				expect(mockCline.consecutiveMistakeCount).toBe(1)
				expect(mockCline.recordToolError).toHaveBeenCalledWith("fetch_tool_description")
			}
		})

		it("should maintain correct state after multiple errors", async () => {
			const invalidTools = ["invalid1", "invalid2", "invalid3"]
			let totalMistakes = 0

			for (const toolName of invalidTools) {
				toolResults = []

				const block: ToolUse = {
					type: "tool_use",
					name: "fetch_tool_description",
					params: {
						tool_name: toolName,
					},
					partial: false,
				}

				await fetchToolDescriptionTool(
					mockCline,
					block,
					mockAskApproval,
					mockHandleError,
					mockPushToolResult,
					mockRemoveClosingTag,
				)

				totalMistakes++
				expect(mockCline.consecutiveMistakeCount).toBe(totalMistakes)
			}

			// Now fetch a valid tool to reset mistakes
			toolResults = []
			const validBlock: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "list",
				},
				partial: false,
			}

			await fetchToolDescriptionTool(
				mockCline,
				validBlock,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockCline.consecutiveMistakeCount).toBe(0) // Reset after success
		})
	})
})
