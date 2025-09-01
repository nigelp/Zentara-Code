import * as path from "path"
import fastGlob from "fast-glob"
import { stat } from "fs/promises"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { MockedFunction } from "vitest"

import { globTool } from "../globTool"
import { ToolUse, ToolResponse } from "../../../shared/tools"
import { Task } from "../../task/Task"
import { isPathOutsideWorkspace } from "../../../utils/pathUtils"
import { getReadablePath } from "../../../utils/path"

// Mock dependencies
vi.mock("fast-glob")
vi.mock("fs/promises", () => ({
	stat: vi.fn(),
}))
vi.mock("../../../utils/pathUtils")
vi.mock("../../../utils/path")
vi.mock("../../prompts/responses", () => ({
	formatResponse: {
		toolError: vi.fn((msg) => `Error: ${msg}`),
	},
}))

describe("globTool", () => {
	// Setup mock functions
	const mockFastGlob = fastGlob as unknown as MockedFunction<typeof fastGlob>
	const mockStat = stat as MockedFunction<typeof stat>
	const mockIsPathOutsideWorkspace = isPathOutsideWorkspace as MockedFunction<typeof isPathOutsideWorkspace>
	const mockGetReadablePath = getReadablePath as MockedFunction<typeof getReadablePath>

	// Mock task
	const mockCline = {
		cwd: "/project",
		consecutiveMistakeCount: 0,
		recordToolError: vi.fn(),
		sayAndCreateMissingParamError: vi.fn().mockResolvedValue("Missing parameter error"),
		ask: vi.fn().mockResolvedValue(true),
	} as unknown as Task

	// Mock functions
	const mockAskApproval = vi.fn().mockResolvedValue(true)
	const mockHandleError = vi.fn()
	const mockPushToolResult = vi.fn()
	const mockRemoveClosingTag = vi.fn((tag, content) => content || "")

	beforeEach(() => {
		vi.clearAllMocks()
		mockIsPathOutsideWorkspace.mockReturnValue(false)
		mockGetReadablePath.mockImplementation((cwd, path) => path || ".")
		mockCline.consecutiveMistakeCount = 0
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe("Pattern validation", () => {
		it("should handle missing pattern parameter", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "glob",
				params: {},
				partial: false,
			}

			await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

			expect(mockCline.consecutiveMistakeCount).toBe(1)
			expect(mockCline.recordToolError).toHaveBeenCalledWith("glob")
			expect(mockPushToolResult).toHaveBeenCalledWith("Missing parameter error")
			expect(mockFastGlob).not.toHaveBeenCalled()
		})

		it("should handle partial block", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "glob",
				params: { pattern: "**/*.ts" },
				partial: true,
			}

			await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

			expect(mockCline.ask).toHaveBeenCalledWith("tool", expect.stringContaining("glob"), true)
			expect(mockFastGlob).not.toHaveBeenCalled()
		})
	})

	describe("File discovery", () => {
		it("should find files matching pattern", async () => {
			const mockFiles = ["src/file1.ts", "src/file2.ts", "test/file3.ts"]
			mockFastGlob.mockResolvedValue(mockFiles)
			mockStat.mockResolvedValue({
				mtime: new Date("2024-01-01"),
			} as any)

			const block: ToolUse = {
				type: "tool_use",
				name: "glob",
				params: { pattern: "**/*.ts" },
				partial: false,
			}

			await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

			expect(mockFastGlob).toHaveBeenCalledWith(
				"**/*.ts",
				expect.objectContaining({
					cwd: "/project",
					absolute: false,
					onlyFiles: true,
					followSymbolicLinks: false,
					ignore: expect.arrayContaining(["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"]),
				}),
			)

			expect(mockPushToolResult).toHaveBeenCalledWith(expect.stringContaining("Found 3 files matching pattern"))
			expect(mockPushToolResult).toHaveBeenCalledWith(expect.stringContaining("src/file1.ts"))
		})

		it("should handle custom path parameter", async () => {
			const mockFiles = ["component1.tsx", "component2.tsx"]
			mockFastGlob.mockResolvedValue(mockFiles)
			mockStat.mockResolvedValue({
				mtime: new Date("2024-01-01"),
			} as any)

			const block: ToolUse = {
				type: "tool_use",
				name: "glob",
				params: {
					pattern: "*.tsx",
					path: "src/components",
				},
				partial: false,
			}

			await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

			expect(mockFastGlob).toHaveBeenCalledWith(
				"*.tsx",
				expect.objectContaining({
					cwd: path.resolve("/project", "src/components"),
				}),
			)
		})

		it("should handle no files found", async () => {
			mockFastGlob.mockResolvedValue([])

			const block: ToolUse = {
				type: "tool_use",
				name: "glob",
				params: { pattern: "**/*.xyz" },
				partial: false,
			}

			await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

			expect(mockPushToolResult).toHaveBeenCalledWith("No files found matching pattern: **/*.xyz")
		})

		it("should sort files by modification time", async () => {
			const mockFiles = ["old.ts", "newest.ts", "middle.ts"]
			mockFastGlob.mockResolvedValue(mockFiles)

			// Mock different modification times
			mockStat.mockImplementation(async (filePath) => {
				const fp = filePath.toString()
				if (fp.includes("old.ts")) {
					return { mtime: new Date("2024-01-01") } as any
				} else if (fp.includes("newest.ts")) {
					return { mtime: new Date("2024-01-03") } as any
				} else {
					return { mtime: new Date("2024-01-02") } as any
				}
			})

			const block: ToolUse = {
				type: "tool_use",
				name: "glob",
				params: { pattern: "*.ts" },
				partial: false,
			}

			await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

			const resultCall = mockPushToolResult.mock.calls[0][0] as string
			const lines = resultCall.split("\n")

			// Check that newest.ts appears before middle.ts and old.ts
			const newestIndex = lines.findIndex((line) => line.includes("newest.ts"))
			const middleIndex = lines.findIndex((line) => line.includes("middle.ts"))
			const oldIndex = lines.findIndex((line) => line.includes("old.ts"))

			expect(newestIndex).toBeLessThan(middleIndex)
			expect(middleIndex).toBeLessThan(oldIndex)
		})

		it("should handle large number of files by applying default limit", async () => {
			// Create 1500 mock files
			const mockFiles = Array.from({ length: 1500 }, (_, i) => `file${i}.ts`)
			mockFastGlob.mockResolvedValue(mockFiles)
			mockStat.mockResolvedValue({
				mtime: new Date("2024-01-01"),
			} as any)

			const block: ToolUse = {
				type: "tool_use",
				name: "glob",
				params: { pattern: "**/*.ts" },
				partial: false,
			}

			await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

			const resultCall = mockPushToolResult.mock.calls[0][0] as string
			// The total is 1000 because of the internal slice before statting files
			expect(resultCall).toContain("Showing first 20 of 1000+ results (default limit)")
			const fileLines = resultCall.split("\n").filter((line) => line.trim().startsWith("file"))
			expect(fileLines.length).toBe(20)
		})
	
		describe("Head limit functionality", () => {
			const mockFiles = Array.from({ length: 200 }, (_, i) => `src/file${i}.ts`)
	
			beforeEach(() => {
				mockFastGlob.mockResolvedValue(mockFiles)
				mockStat.mockResolvedValue({ mtime: new Date() } as any)
			})
	
			it("should apply default head_limit when none is provided", async () => {
				const block: ToolUse = {
					type: "tool_use",
					name: "glob",
					params: { pattern: "**/*.ts" },
					partial: false,
				}
	
				await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)
	
				const result = mockPushToolResult.mock.calls[0][0] as string
				expect(result).toContain("Showing first 20 of 200+ results (default limit)")
				const fileLines = result.split("\n").filter((line) => line.trim().startsWith("src/"))
				expect(fileLines.length).toBe(20)
			})
	
			it("should respect user-defined head_limit", async () => {
				const block: ToolUse = {
					type: "tool_use",
					name: "glob",
					params: { pattern: "**/*.ts", head_limit: 10 } as any,
					partial: false,
				}
	
				await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)
	
				const result = mockPushToolResult.mock.calls[0][0] as string
				expect(result).toContain("Showing first 10 of 200+ results (as requested by head_limit)")
				const fileLines = result.split("\n").filter((line) => line.trim().startsWith("src/"))
				expect(fileLines.length).toBe(10)
			})
	
			it("should cap head_limit at the maximum of 100", async () => {
				const block: ToolUse = {
					type: "tool_use",
					name: "glob",
					params: { pattern: "**/*.ts", head_limit: 150 } as any,
					partial: false,
				}
	
				await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)
	
				const result = mockPushToolResult.mock.calls[0][0] as string
				expect(result).toContain("Showing first 100 of 200+ results (limited to maximum 100)")
				const fileLines = result.split("\n").filter((line) => line.trim().startsWith("src/"))
				expect(fileLines.length).toBe(100)
			})
	
			it("should handle a head_limit of 0 by showing 1 result", async () => {
				const block: ToolUse = {
					type: "tool_use",
					name: "glob",
					params: { pattern: "**/*.ts", head_limit: 0 } as any,
					partial: false,
				}
	
				await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)
				
				const result = mockPushToolResult.mock.calls[0][0] as string
				expect(result).toContain("Showing first 1 of 200+ results")
				const fileLines = result.split("\n").filter((line) => line.trim().startsWith("src/"))
				expect(fileLines.length).toBe(1)
			})
	
			it("should handle a negative head_limit by showing 1 result", async () => {
				const block: ToolUse = {
					type: "tool_use",
					name: "glob",
					params: { pattern: "**/*.ts", head_limit: -5 } as any,
					partial: false,
				}
	
				await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)
	
				const result = mockPushToolResult.mock.calls[0][0] as string
				expect(result).toContain("Showing first 1 of 200+ results")
				const fileLines = result.split("\n").filter((line) => line.trim().startsWith("src/"))
				expect(fileLines.length).toBe(1)
			})
		})
	})

	describe("Error handling", () => {
		it("should handle fast-glob errors", async () => {
			const error = new Error("Glob pattern error")
			mockFastGlob.mockRejectedValue(error)

			const block: ToolUse = {
				type: "tool_use",
				name: "glob",
				params: { pattern: "**/*.ts" },
				partial: false,
			}

			await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

			expect(mockHandleError).toHaveBeenCalledWith("glob pattern search", error)
		})

		it("should handle stat errors gracefully", async () => {
			const mockFiles = ["file1.ts", "file2.ts"]
			mockFastGlob.mockResolvedValue(mockFiles)

			// Make stat fail for one file
			mockStat.mockImplementation(async (filePath) => {
				if (filePath.toString().includes("file1.ts")) {
					throw new Error("Permission denied")
				}
				return { mtime: new Date("2024-01-01") } as any
			})

			const block: ToolUse = {
				type: "tool_use",
				name: "glob",
				params: { pattern: "*.ts" },
				partial: false,
			}

			await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

			// Should still complete successfully
			expect(mockPushToolResult).toHaveBeenCalledWith(expect.stringContaining("Found 2 files"))
		})
	})

	describe("User approval", () => {
		it("should request user approval with pattern before executing search", async () => {
			const mockFiles = ["file1.ts"]
			mockFastGlob.mockResolvedValue(mockFiles)
			mockStat.mockResolvedValue({
				mtime: new Date("2024-01-01"),
			} as any)

			const block: ToolUse = {
				type: "tool_use",
				name: "glob",
				params: { pattern: "*.ts" },
				partial: false,
			}

			await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

			// Check that approval is requested with the pattern, not the results
			expect(mockAskApproval).toHaveBeenCalledWith("tool", expect.stringContaining('"content":"*.ts"'))
			expect(mockAskApproval).toHaveBeenCalledWith("tool", expect.stringContaining('"tool":"glob"'))

			// Check that fastGlob is called AFTER approval
			expect(mockAskApproval).toHaveBeenCalledBefore(mockFastGlob as any)
			expect(mockPushToolResult).toHaveBeenCalled()
		})

		it("should not execute search if user denies approval", async () => {
			mockAskApproval.mockResolvedValue(false)

			const block: ToolUse = {
				type: "tool_use",
				name: "glob",
				params: { pattern: "*.ts" },
				partial: false,
			}

			await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

			expect(mockAskApproval).toHaveBeenCalled()
			expect(mockFastGlob).not.toHaveBeenCalled() // Search should not be executed
			expect(mockPushToolResult).not.toHaveBeenCalled()
		})

		it("should show pattern in partial message for streaming", async () => {
			const block: ToolUse = {
				type: "tool_use",
				name: "glob",
				params: { pattern: "**/*.tsx", path: "src/components" },
				partial: true,
			}

			await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

			// Check that partial message contains the pattern
			expect(mockCline.ask).toHaveBeenCalledWith("tool", expect.stringContaining('"content":"**/*.tsx"'), true)
			expect(mockCline.ask).toHaveBeenCalledWith("tool", expect.stringContaining('"path":"src/components"'), true)
			expect(mockFastGlob).not.toHaveBeenCalled() // No search for partial messages
		})

		it("should include path and isOutsideWorkspace in approval message", async () => {
			mockIsPathOutsideWorkspace.mockReturnValue(true)
			mockGetReadablePath.mockImplementation((cwd, path) => path || ".")

			const block: ToolUse = {
				type: "tool_use",
				name: "glob",
				params: {
					pattern: "*.config.js",
					path: "../outside-dir",
				},
				partial: false,
			}

			await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

			const approvalCall = mockAskApproval.mock.calls[0][1]
			const approvalData = JSON.parse(approvalCall)

			expect(approvalData.tool).toBe("glob")
			expect(approvalData.content).toBe("*.config.js")
			expect(approvalData.path).toBe("../outside-dir")
			expect(approvalData.isOutsideWorkspace).toBe(true)
		})
	})

	describe("Workspace validation", () => {
		it("should detect paths outside workspace", async () => {
			mockIsPathOutsideWorkspace.mockReturnValue(true)
			const mockFiles = ["file1.ts"]
			mockFastGlob.mockResolvedValue(mockFiles)
			mockStat.mockResolvedValue({
				mtime: new Date("2024-01-01"),
			} as any)

			const block: ToolUse = {
				type: "tool_use",
				name: "glob",
				params: {
					pattern: "*.ts",
					path: "../outside",
				},
				partial: false,
			}

			await globTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

			expect(mockAskApproval).toHaveBeenCalledWith("tool", expect.stringContaining('"isOutsideWorkspace":true'))
		})
	})

	describe("Pattern examples", () => {
		it("should handle complex glob patterns", async () => {
			const testCases = [
				{ pattern: "**/*.{js,ts}", expected: ["file.js", "file.ts"] },
				{ pattern: "**/[A-Z]*.tsx", expected: ["Component.tsx", "App.tsx"] },
				{ pattern: "src/**/index.{js,ts}", expected: ["src/index.js", "src/lib/index.ts"] },
				{ pattern: "**/*.test.{js,ts}", expected: ["app.test.js", "lib.test.ts"] },
			]

			for (const testCase of testCases) {
				vi.clearAllMocks()
				mockAskApproval.mockResolvedValue(true) // Reset approval to true after clearAllMocks
				mockFastGlob.mockResolvedValue(testCase.expected)
				mockStat.mockResolvedValue({
					mtime: new Date("2024-01-01"),
				} as any)

				const block: ToolUse = {
					type: "tool_use",
					name: "glob",
					params: { pattern: testCase.pattern },
					partial: false,
				}

				await globTool(
					mockCline,
					block,
					mockAskApproval,
					mockHandleError,
					mockPushToolResult,
					mockRemoveClosingTag,
				)

				expect(mockFastGlob).toHaveBeenCalledWith(testCase.pattern, expect.any(Object))
				expect(mockPushToolResult).toHaveBeenCalledWith(
					expect.stringContaining(`Found ${testCase.expected.length} file`),
				)
			}
		})
	})
})
