import { describe, it, expect, vi, beforeEach } from "vitest"
import * as vscode from "vscode"
import { regexSearchFilesAdvanced, getBinPath, SearchOptions } from "../index"
import { RooIgnoreController } from "../../../core/ignore/RooIgnoreController"

// Mock vscode module
vi.mock("vscode", () => ({
	env: {
		appRoot: "/mock/vscode/root",
	},
}))

// Mock file system utilities
vi.mock("../../../utils/fs", () => ({
	fileExistsAtPath: vi.fn(),
}))

// Mock child_process
vi.mock("child_process", () => ({
	spawn: vi.fn(),
}))

// Mock readline
vi.mock("readline", () => ({
	createInterface: vi.fn(),
}))

describe("regexSearchFilesAdvanced", () => {
	let mockSpawn: any
	let mockRl: any
	let mockProcess: any

	beforeEach(async () => {
		vi.clearAllMocks()

		// Setup child_process mock
		const { spawn } = vi.mocked(await import("child_process"))
		mockSpawn = spawn

		// Setup readline mock
		const { createInterface } = vi.mocked(await import("readline"))
		mockRl = {
			on: vi.fn(),
			close: vi.fn(),
		}
		createInterface.mockReturnValue(mockRl)

		// Setup process mock
		mockProcess = {
			stdout: { on: vi.fn() },
			stderr: { on: vi.fn() },
			on: vi.fn(),
			kill: vi.fn(),
		}

		mockSpawn.mockReturnValue(mockProcess)

		// Setup file existence check
		const { fileExistsAtPath } = vi.mocked(await import("../../../utils/fs"))
		fileExistsAtPath.mockResolvedValue(true)
	})

	const setupMockProcess = (output: string = "", error: string = "") => {
		// Setup readline mock to simulate line-by-line output
		mockRl.on.mockImplementation((event: string, callback: Function) => {
			if (event === "line") {
				output.split("\n").forEach((line) => {
					if (line.trim()) callback(line)
				})
			} else if (event === "close") {
				setTimeout(() => callback(), 0)
			}
		})

		// Setup stderr
		mockProcess.stderr.on.mockImplementation((event: string, callback: Function) => {
			if (event === "data" && error) {
				callback(error)
			}
		})

		return mockProcess
	}

	describe("argument building", () => {
		it("should build correct args for content mode", async () => {
			setupMockProcess()

			const options: SearchOptions = {
				pattern: "test",
				output_mode: "content",
			}

			await regexSearchFilesAdvanced("/test/cwd", options)

			expect(mockSpawn).toHaveBeenCalledWith(
				"/mock/vscode/root/node_modules/@vscode/ripgrep/bin/rg",
				expect.arrayContaining(["--json", "-e", "test", "/test/cwd"]),
			)
		})

		it("should build correct args for files_with_matches mode", async () => {
			setupMockProcess()

			const options: SearchOptions = {
				pattern: "test",
				output_mode: "files_with_matches",
			}

			await regexSearchFilesAdvanced("/test/cwd", options)

			expect(mockSpawn).toHaveBeenCalledWith(
				"/mock/vscode/root/node_modules/@vscode/ripgrep/bin/rg",
				expect.arrayContaining(["--files-with-matches", "-e", "test"]),
			)
		})

		it("should build correct args for count mode", async () => {
			setupMockProcess()

			const options: SearchOptions = {
				pattern: "test",
				output_mode: "count",
			}

			await regexSearchFilesAdvanced("/test/cwd", options)

			expect(mockSpawn).toHaveBeenCalledWith(
				"/mock/vscode/root/node_modules/@vscode/ripgrep/bin/rg",
				expect.arrayContaining(["--count", "-e", "test"]),
			)
		})

		it("should handle case insensitive search", async () => {
			setupMockProcess()

			const options: SearchOptions = {
				pattern: "test",
				"-i": true,
			}

			await regexSearchFilesAdvanced("/test/cwd", options)

			expect(mockSpawn).toHaveBeenCalledWith(
				"/mock/vscode/root/node_modules/@vscode/ripgrep/bin/rg",
				expect.arrayContaining(["--ignore-case"]),
			)
		})

		it("should handle multiline mode", async () => {
			setupMockProcess()

			const options: SearchOptions = {
				pattern: "test",
				multiline: true,
			}

			await regexSearchFilesAdvanced("/test/cwd", options)

			expect(mockSpawn).toHaveBeenCalledWith(
				"/mock/vscode/root/node_modules/@vscode/ripgrep/bin/rg",
				expect.arrayContaining(["--multiline", "--multiline-dotall"]),
			)
		})

		it("should handle context options with -C", async () => {
			setupMockProcess()

			const options: SearchOptions = {
				pattern: "test",
				"-C": 3,
			}

			await regexSearchFilesAdvanced("/test/cwd", options)

			expect(mockSpawn).toHaveBeenCalledWith(
				"/mock/vscode/root/node_modules/@vscode/ripgrep/bin/rg",
				expect.arrayContaining(["--context", "3"]),
			)
		})

		it("should handle separate before/after context", async () => {
			setupMockProcess()

			const options: SearchOptions = {
				pattern: "test",
				"-B": 2,
				"-A": 5,
			}

			await regexSearchFilesAdvanced("/test/cwd", options)

			expect(mockSpawn).toHaveBeenCalledWith(
				"/mock/vscode/root/node_modules/@vscode/ripgrep/bin/rg",
				expect.arrayContaining(["--before-context", "2", "--after-context", "5"]),
			)
		})

		it("should prefer -C over -A/-B when both provided", async () => {
			setupMockProcess()

			const options: SearchOptions = {
				pattern: "test",
				"-C": 3,
				"-B": 2,
				"-A": 5,
			}

			await regexSearchFilesAdvanced("/test/cwd", options)

			const args = mockSpawn.mock.calls[0][1]
			expect(args).toContain("--context")
			expect(args).toContain("3")
			expect(args).not.toContain("--before-context")
			expect(args).not.toContain("--after-context")
		})

		it("should handle glob patterns", async () => {
			setupMockProcess()

			const options: SearchOptions = {
				pattern: "test",
				glob: "*.{js,ts}",
			}

			await regexSearchFilesAdvanced("/test/cwd", options)

			expect(mockSpawn).toHaveBeenCalledWith(
				"/mock/vscode/root/node_modules/@vscode/ripgrep/bin/rg",
				expect.arrayContaining(["--glob", "*.{js,ts}"]),
			)
		})

		it("should handle file types", async () => {
			setupMockProcess()

			const options: SearchOptions = {
				pattern: "test",
				type: "js",
			}

			await regexSearchFilesAdvanced("/test/cwd", options)

			expect(mockSpawn).toHaveBeenCalledWith(
				"/mock/vscode/root/node_modules/@vscode/ripgrep/bin/rg",
				expect.arrayContaining(["--type", "js"]),
			)
		})

		it("should prefer glob over type when both provided", async () => {
			setupMockProcess()

			const options: SearchOptions = {
				pattern: "test",
				type: "js",
				glob: "*.ts",
			}

			await regexSearchFilesAdvanced("/test/cwd", options)

			const args = mockSpawn.mock.calls[0][1]
			expect(args).toContain("--glob")
			expect(args).toContain("*.ts")
			expect(args).not.toContain("--type")
			expect(args).not.toContain("js")
		})

		it("should handle custom path", async () => {
			setupMockProcess()

			const options: SearchOptions = {
				pattern: "test",
				path: "/custom/path",
			}

			await regexSearchFilesAdvanced("/test/cwd", options)

			const args = mockSpawn.mock.calls[0][1]
			expect(args[args.length - 1]).toBe("/custom/path")
		})

		it("should default to cwd when no path provided", async () => {
			setupMockProcess()

			const options: SearchOptions = {
				pattern: "test",
			}

			await regexSearchFilesAdvanced("/test/cwd", options)

			const args = mockSpawn.mock.calls[0][1]
			expect(args[args.length - 1]).toBe("/test/cwd")
		})
	})

	describe("output handling", () => {
		it("should handle count mode output correctly", async () => {
			const mockOutput = "/path/to/file1.js:5\n/path/to/file2.ts:3"
			setupMockProcess(mockOutput)

			const options: SearchOptions = {
				pattern: "test",
				output_mode: "count",
			}

			const result = await regexSearchFilesAdvanced("/test/cwd", options)

			expect(result).toContain("Match counts per file")
			expect(result).toContain("file1.js: 5 matches")
			expect(result).toContain("file2.ts: 3 matches")
			expect(result).toContain("Total: 8 matches")
		})

		it("should handle files_with_matches mode output correctly", async () => {
			const mockOutput = "/path/to/file1.js\n/path/to/file2.ts"
			setupMockProcess(mockOutput)

			const options: SearchOptions = {
				pattern: "test",
				output_mode: "files_with_matches",
			}

			const result = await regexSearchFilesAdvanced("/test/cwd", options)

			expect(result).toContain("Found matches in 2 files")
			expect(result).toContain("file1.js")
			expect(result).toContain("file2.ts")
		})

		it("should handle empty results", async () => {
			setupMockProcess("")

			const options: SearchOptions = {
				pattern: "test",
				output_mode: "files_with_matches",
			}

			const result = await regexSearchFilesAdvanced("/test/cwd", options)

			expect(result).toBe("No files found with matches")
		})

		it("should handle JSON content mode output", async () => {
			const mockJsonOutput = [
				JSON.stringify({
					type: "begin",
					data: { path: { text: "/test/cwd/file1.js" } },
				}),
				JSON.stringify({
					type: "match",
					data: {
						line_number: 5,
						lines: { text: "function test() {" },
						absolute_offset: 0,
					},
				}),
				JSON.stringify({
					type: "context",
					data: {
						line_number: 6,
						lines: { text: "  return 'test';" },
					},
				}),
				JSON.stringify({
					type: "end",
				}),
			].join("\n")

			setupMockProcess(mockJsonOutput)

			const options: SearchOptions = {
				pattern: "test",
				output_mode: "content",
				"-n": true,
			}

			const result = await regexSearchFilesAdvanced("/test/cwd", options)

			expect(result).toContain("# file1.js")
			expect(result).toContain("5 | function test() {")
			expect(result).toContain("6 |   return 'test';")
		})

		it("should show line numbers when requested", async () => {
			const mockJsonOutput = [
				JSON.stringify({
					type: "begin",
					data: { path: { text: "/test/cwd/file1.js" } },
				}),
				JSON.stringify({
					type: "match",
					data: {
						line_number: 42,
						lines: { text: "const test = 'value';" },
						absolute_offset: 0,
					},
				}),
				JSON.stringify({
					type: "end",
				}),
			].join("\n")

			setupMockProcess(mockJsonOutput)

			const options: SearchOptions = {
				pattern: "test",
				output_mode: "content",
				"-n": true,
			}

			const result = await regexSearchFilesAdvanced("/test/cwd", options)

			expect(result).toContain(" 42 | const test = 'value';")
		})

		it("should not show line numbers when not requested", async () => {
			const mockJsonOutput = [
				JSON.stringify({
					type: "begin",
					data: { path: { text: "/test/cwd/file1.js" } },
				}),
				JSON.stringify({
					type: "match",
					data: {
						line_number: 42,
						lines: { text: "const test = 'value';" },
						absolute_offset: 0,
					},
				}),
				JSON.stringify({
					type: "end",
				}),
			].join("\n")

			setupMockProcess(mockJsonOutput)

			const options: SearchOptions = {
				pattern: "test",
				output_mode: "content",
			}

			const result = await regexSearchFilesAdvanced("/test/cwd", options)

			expect(result).toContain("const test = 'value';")
			expect(result).not.toContain(" 42 |")
		})
	})

	describe("head_limit functionality", () => {
		it("should apply head_limit to output", async () => {
			const longOutput = Array(100).fill("/path/to/file.js").join("\n")
			setupMockProcess(longOutput)

			const options: SearchOptions = {
				pattern: "test",
				output_mode: "files_with_matches",
				head_limit: 5,
			}

			const result = await regexSearchFilesAdvanced("/test/cwd", options)

			// With our new implementation, head_limit is capped at MAX_RESULTS (2000)
			// and the test should verify the limit message is shown
			expect(result).toContain("Showing first 5 of")
			expect(result).toContain("as requested by head_limit")
		})

		it("should pass head_limit option", async () => {
			setupMockProcess()

			const options: SearchOptions = {
				pattern: "test",
				output_mode: "content",
				head_limit: 25,
			}

			await regexSearchFilesAdvanced("/test/cwd", options)

			// Should call regexSearchFilesAdvanced with head_limit option
			expect(mockSpawn).toHaveBeenCalled()
		})
	})

	describe("error handling", () => {
		it("should handle ripgrep errors gracefully", async () => {
			setupMockProcess("", "ripgrep: command not found")

			const options: SearchOptions = {
				pattern: "test",
			}

			const result = await regexSearchFilesAdvanced("/test/cwd", options)

			expect(result).toBe("No results found")
		})

		it("should handle missing ripgrep binary", async () => {
			const { fileExistsAtPath } = vi.mocked(await import("../../../utils/fs"))
			fileExistsAtPath.mockResolvedValue(false)

			const options: SearchOptions = {
				pattern: "test",
			}

			await expect(regexSearchFilesAdvanced("/test/cwd", options)).rejects.toThrow(
				"Could not find ripgrep binary",
			)
		})

		it("should handle malformed JSON output", async () => {
			const invalidJson = "invalid json output\n{broken"
			setupMockProcess(invalidJson)

			const options: SearchOptions = {
				pattern: "test",
				output_mode: "content",
			}

			const result = await regexSearchFilesAdvanced("/test/cwd", options)

			// Should not crash and return results
			expect(typeof result).toBe("string")
		})
	})

	describe("RooIgnoreController integration", () => {
		it("should apply ignore filtering", async () => {
			const mockJsonOutput = [
				JSON.stringify({
					type: "begin",
					data: { path: { text: "/test/cwd/ignored.js" } },
				}),
				JSON.stringify({
					type: "match",
					data: {
						line_number: 1,
						lines: { text: "test content" },
						absolute_offset: 0,
					},
				}),
				JSON.stringify({
					type: "end",
				}),
			].join("\n")

			setupMockProcess(mockJsonOutput)

			const mockIgnoreController = {
				validateAccess: vi.fn().mockReturnValue(false),
			} as any

			const options: SearchOptions = {
				pattern: "test",
				output_mode: "content",
			}

			const result = await regexSearchFilesAdvanced("/test/cwd", options, mockIgnoreController)

			expect(mockIgnoreController.validateAccess).toHaveBeenCalledWith("/test/cwd/ignored.js")
			expect(result).toContain("Found 0 results")
		})

		it("should allow files that pass ignore filtering", async () => {
			const mockJsonOutput = [
				JSON.stringify({
					type: "begin",
					data: { path: { text: "/test/cwd/allowed.js" } },
				}),
				JSON.stringify({
					type: "match",
					data: {
						line_number: 1,
						lines: { text: "test content" },
						absolute_offset: 0,
					},
				}),
				JSON.stringify({
					type: "end",
				}),
			].join("\n")

			setupMockProcess(mockJsonOutput)

			const mockIgnoreController = {
				validateAccess: vi.fn().mockReturnValue(true),
			} as any

			const options: SearchOptions = {
				pattern: "test",
				output_mode: "content",
			}

			const result = await regexSearchFilesAdvanced("/test/cwd", options, mockIgnoreController)

			expect(mockIgnoreController.validateAccess).toHaveBeenCalledWith("/test/cwd/allowed.js")
			expect(result).toContain("# allowed.js")
			expect(result).toContain("test content")
		})
	})

	describe("complex search scenarios", () => {
		it("should handle all options together", async () => {
			setupMockProcess()

			const options: SearchOptions = {
				pattern: "function\\s+\\w+",
				path: "/custom/src",
				output_mode: "content",
				glob: "*.{js,ts}",
				"-i": true,
				"-n": true,
				"-C": 2,
				multiline: false,
				head_limit: 10,
			}

			await regexSearchFilesAdvanced("/test/cwd", options)

			const args = mockSpawn.mock.calls[0][1]
			expect(args).toContain("--json")
			expect(args).toContain("-e")
			expect(args).toContain("function\\s+\\w+")
			expect(args).toContain("--ignore-case")
			expect(args).toContain("--context")
			expect(args).toContain("2")
			expect(args).toContain("--glob")
			expect(args).toContain("*.{js,ts}")
			expect(args[args.length - 1]).toBe("/custom/src")
		})
	})
})
