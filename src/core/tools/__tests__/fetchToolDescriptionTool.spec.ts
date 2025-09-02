import { describe, it, expect, vi, beforeEach } from "vitest"
import { fetchToolDescriptionTool } from "../fetchToolDescriptionTool"
import { ToolUse } from "../../../shared/tools"
import { formatResponse } from "../../prompts/responses"
import * as fetchModule from "../../../zentara_tool_prompt_management/fetch-tool-description"

// Mock the fetch-tool-description module
vi.mock("../../../zentara_tool_prompt_management/fetch-tool-description", () => ({
	fetch_tool_description: vi.fn(),
	toolExists: vi.fn(),
	getAvailableToolNames: vi.fn(),
}))

describe("fetchToolDescriptionTool", () => {
	let mockCline: any
	let mockAskApproval: any
	let mockHandleError: any
	let mockPushToolResult: any
	let mockRemoveClosingTag: any
	let toolResults: any[]

	beforeEach(() => {
		vi.clearAllMocks()
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

	describe("Basic functionality", () => {
		it("should fetch a valid tool description successfully", async () => {
			const mockDescription = "## read_file - Read file contents\n\nThis tool reads file contents..."
			vi.mocked(fetchModule.toolExists).mockReturnValue(true)
			vi.mocked(fetchModule.fetch_tool_description).mockReturnValue(mockDescription)

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

			expect(fetchModule.toolExists).toHaveBeenCalledWith("read_file")
			expect(fetchModule.fetch_tool_description).toHaveBeenCalledWith("read_file", {
				cwd: "/test/workspace",
				supportsComputerUse: false,
				settings: {
					enableMcpServerCreation: false,
				},
			})
			expect(mockPushToolResult).toHaveBeenCalledWith(mockDescription)
			expect(mockCline.consecutiveMistakeCount).toBe(0)
			expect(mockCline.recordToolError).not.toHaveBeenCalled()
		})

		it("should list all available tools when tool_name is 'list'", async () => {
			const mockTools = ["read_file", "write_to_file", "execute_command", "debug_launch"]
			vi.mocked(fetchModule.getAvailableToolNames).mockReturnValue(mockTools)

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

			expect(fetchModule.getAvailableToolNames).toHaveBeenCalled()
			expect(toolResults[0]).toContain("Available Tools (4 total)")
			expect(toolResults[0]).toContain("debug_launch")
			expect(toolResults[0]).toContain("execute_command")
			expect(toolResults[0]).toContain("read_file")
			expect(toolResults[0]).toContain("write_to_file")
			expect(mockCline.consecutiveMistakeCount).toBe(0)
		})

		it("should list all tools when tool_name is '*'", async () => {
			const mockTools = ["tool1", "tool2"]
			vi.mocked(fetchModule.getAvailableToolNames).mockReturnValue(mockTools)

			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "*",
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

			expect(fetchModule.getAvailableToolNames).toHaveBeenCalled()
			expect(toolResults[0]).toContain("Available Tools (2 total)")
		})

		it("should list all tools when tool_name is 'all' (case insensitive)", async () => {
			const mockTools = ["tool1", "tool2", "tool3"]
			vi.mocked(fetchModule.getAvailableToolNames).mockReturnValue(mockTools)

			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "ALL",
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

			expect(fetchModule.getAvailableToolNames).toHaveBeenCalled()
			expect(toolResults[0]).toContain("Available Tools (3 total)")
		})
	})

	describe("Error handling", () => {
		it("should handle missing tool_name parameter", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {},
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

			expect(mockCline.consecutiveMistakeCount).toBe(1)
			expect(mockCline.recordToolError).toHaveBeenCalledWith("fetch_tool_description")
			expect(toolResults[0]).toContain("Missing required parameter 'tool_name'")
		})

		it("should handle empty tool_name parameter", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "   ",
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

			expect(mockCline.consecutiveMistakeCount).toBe(1)
			expect(mockCline.recordToolError).toHaveBeenCalledWith("fetch_tool_description")
			expect(toolResults[0]).toContain("Missing required parameter 'tool_name'")
		})

		it("should handle non-existent tool with suggestions", async () => {
			vi.mocked(fetchModule.toolExists).mockReturnValue(false)
			vi.mocked(fetchModule.getAvailableToolNames).mockReturnValue([
				"read_file",
				"write_to_file",
				"read_files",
				"execute_command",
			])

			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "read",
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

			expect(mockCline.consecutiveMistakeCount).toBe(1)
			expect(mockCline.recordToolError).toHaveBeenCalledWith("fetch_tool_description")
			expect(toolResults[0]).toContain("Tool 'read' not found")
			expect(toolResults[0]).toContain("Did you mean one of these?")
			expect(toolResults[0]).toContain("read_file")
			expect(toolResults[0]).toContain("read_files")
		})

		it("should handle non-existent tool without suggestions", async () => {
			vi.mocked(fetchModule.toolExists).mockReturnValue(false)
			vi.mocked(fetchModule.getAvailableToolNames).mockReturnValue(["execute_command", "apply_diff"])

			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "xyz_nonexistent",
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

			expect(mockCline.consecutiveMistakeCount).toBe(1)
			expect(toolResults[0]).toContain("Tool 'xyz_nonexistent' not found")
			expect(toolResults[0]).toContain('Use tool_name="list"')
		})

		it("should handle fetch_tool_description returning null", async () => {
			vi.mocked(fetchModule.toolExists).mockReturnValue(true)
			vi.mocked(fetchModule.fetch_tool_description).mockReturnValue(null)

			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "some_tool",
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

			expect(mockCline.consecutiveMistakeCount).toBe(1)
			expect(mockCline.recordToolError).toHaveBeenCalledWith("fetch_tool_description")
			expect(toolResults[0]).toContain("Failed to fetch description for tool 'some_tool'")
		})

		it("should handle exceptions during execution", async () => {
			const testError = new Error("Network error")
			vi.mocked(fetchModule.toolExists).mockImplementation(() => {
				throw testError
			})

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

			expect(mockCline.consecutiveMistakeCount).toBe(1)
			expect(mockCline.recordToolError).toHaveBeenCalledWith("fetch_tool_description")
			expect(toolResults[0]).toContain("Error fetching tool description: Network error")
			expect(mockHandleError).toHaveBeenCalledWith("fetch_tool_description", testError)
		})

		it("should handle non-Error exceptions", async () => {
			vi.mocked(fetchModule.toolExists).mockImplementation(() => {
				throw "String error"
			})

			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "some_tool",
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

			expect(mockCline.consecutiveMistakeCount).toBe(1)
			expect(toolResults[0]).toContain("Error fetching tool description: String error")
			expect(mockHandleError).toHaveBeenCalledWith("fetch_tool_description", expect.any(Error))
		})
	})

	describe("Partial requests", () => {
		it("should handle partial requests correctly", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "partial_tool",
				},
				partial: true,
			}

			mockRemoveClosingTag.mockReturnValue("partial_tool")

			await fetchToolDescriptionTool(
				mockCline,
				block,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			expect(mockCline.ask).toHaveBeenCalledWith(
				"tool",
				'{"tool":"fetch_tool_description","toolName":"partial_tool"}',
				true,
			)
			expect(mockPushToolResult).not.toHaveBeenCalled()
			expect(fetchModule.toolExists).not.toHaveBeenCalled()
		})
	})

	describe("Suggestion filtering", () => {
		it("should limit suggestions to 5 tools", async () => {
			vi.mocked(fetchModule.toolExists).mockReturnValue(false)
			vi.mocked(fetchModule.getAvailableToolNames).mockReturnValue([
				"debug_launch",
				"debug_quit",
				"debug_restart",
				"debug_continue",
				"debug_next",
				"debug_step_in",
				"debug_step_out",
				"debug_set_breakpoint",
			])

			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "debug",
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
			const suggestions = result.match(/debug_\w+/g)
			expect(suggestions).toHaveLength(5)
		})

		it("should suggest tools that contain the search term", async () => {
			vi.mocked(fetchModule.toolExists).mockReturnValue(false)
			vi.mocked(fetchModule.getAvailableToolNames).mockReturnValue([
				"read_file",
				"write_to_file",
				"search_files",
				"list_files",
				"execute_command",
			])

			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "file",
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

			expect(toolResults[0]).toContain("Did you mean one of these?")
			expect(toolResults[0]).toContain("read_file")
			expect(toolResults[0]).toContain("write_to_file")
			expect(toolResults[0]).toContain("search_files")
			expect(toolResults[0]).toContain("list_files")
			expect(toolResults[0]).not.toContain("execute_command")
		})
	})

	describe("Consecutive mistake tracking", () => {
		it("should reset mistake count on successful fetch", async () => {
			mockCline.consecutiveMistakeCount = 3
			vi.mocked(fetchModule.toolExists).mockReturnValue(true)
			vi.mocked(fetchModule.fetch_tool_description).mockReturnValue("Tool description")

			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "valid_tool",
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

			expect(mockCline.consecutiveMistakeCount).toBe(0)
		})

		it("should reset mistake count when listing all tools", async () => {
			mockCline.consecutiveMistakeCount = 2
			vi.mocked(fetchModule.getAvailableToolNames).mockReturnValue(["tool1", "tool2"])

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

			expect(mockCline.consecutiveMistakeCount).toBe(0)
		})

		it("should increment mistake count on error", async () => {
			mockCline.consecutiveMistakeCount = 1
			vi.mocked(fetchModule.toolExists).mockReturnValue(false)
			vi.mocked(fetchModule.getAvailableToolNames).mockReturnValue([])

			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "nonexistent",
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

			expect(mockCline.consecutiveMistakeCount).toBe(2)
			expect(mockCline.recordToolError).toHaveBeenCalledWith("fetch_tool_description")
		})
	})

	describe("Tool options and configuration", () => {
		it("should pass cwd to fetch_tool_description", async () => {
			mockCline.cwd = "/custom/workspace/path"
			vi.mocked(fetchModule.toolExists).mockReturnValue(true)
			vi.mocked(fetchModule.fetch_tool_description).mockReturnValue("Description")

			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "some_tool",
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

			expect(fetchModule.fetch_tool_description).toHaveBeenCalledWith("some_tool", {
				cwd: "/custom/workspace/path",
				supportsComputerUse: false,
				settings: {
					enableMcpServerCreation: false,
				},
			})
		})

		it("should trim whitespace from tool_name", async () => {
			vi.mocked(fetchModule.toolExists).mockReturnValue(true)
			vi.mocked(fetchModule.fetch_tool_description).mockReturnValue("Description")

			const block: ToolUse = {
				type: "tool_use",
				name: "fetch_tool_description",
				params: {
					tool_name: "  read_file  ",
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

			expect(fetchModule.toolExists).toHaveBeenCalledWith("read_file")
			expect(fetchModule.fetch_tool_description).toHaveBeenCalledWith("read_file", expect.any(Object))
		})
	})
})
