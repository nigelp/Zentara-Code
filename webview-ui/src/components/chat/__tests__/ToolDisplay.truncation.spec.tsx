import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ToolDisplay } from "../ToolDisplay"

// Mock dependencies
vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, defaultValue?: string) => defaultValue || key,
	}),
	Trans: ({ i18nKey, children }: any) => <span>{i18nKey || children}</span>,
}))

describe("ToolDisplay - Word Truncation", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// Mock console.log to avoid noise in tests
		vi.spyOn(console, "log").mockImplementation(() => {})
		vi.spyOn(console, "warn").mockImplementation(() => {})
	})

	describe("formatToolCall truncation in compact mode", () => {
		it("should not truncate short parameter strings (under 50 words)", () => {
			const shortTool = {
				tool: "readFile",
				path: "src/test.ts",
				args: {
					file: {
						path: "simple/file/path.ts",
					},
				},
			}

			const askText = JSON.stringify(shortTool)
			render(<ToolDisplay askType="tool" askText={askText} compact={true} />)

			// Should show the full formatted call without truncation
			const toolElement = screen.getByText(/Tool:/)
			expect(toolElement).toBeTruthy()

			// The formatted output should contain all the data without "..."
			const codeElement = screen.getByText(/read_file/)
			expect(codeElement.textContent).not.toContain("...")
			expect(codeElement.textContent).toContain("read_file")
			expect(codeElement.textContent).toContain("simple/file/path.ts")
		})

		it("should truncate long parameter strings (over 50 words) in compact mode", () => {
			// Create a tool with very long parameters (way over 50 words)
			const longContent =
				"This is a very long string that contains many many words and should definitely exceed the fifty word limit that we have set for truncation in the formatToolCall function and it keeps going and going with more words to make sure we definitely hit the limit and then some more words for good measure and even more words to be absolutely certain that this will trigger the truncation logic that we implemented"

			const longTool = {
				tool: "searchFiles",
				regex: longContent,
				path: "src/very/long/path/to/some/directory/structure",
				args: {
					pattern: longContent,
					directory: "another/long/path/structure",
					options: {
						recursive: true,
						caseSensitive: false,
						maxResults: 100,
						description: longContent,
					},
				},
			}

			const askText = JSON.stringify(longTool)
			render(<ToolDisplay askType="tool" askText={askText} compact={true} />)

			// Should show truncated output with "..."
			const codeElement = screen.getByText(/search_files/)
			expect(codeElement.textContent).toContain("...")
			expect(codeElement.textContent).toContain("search_files")

			// Count words in the output to ensure it's properly truncated
			const fullText = codeElement.textContent || ""
			const words = fullText.replace("...", "").trim().split(/\s+/)
			// Should be around 50 words or less (allowing some flexibility for the tool name)
			expect(words.length).toBeLessThanOrEqual(55) // Tool name + ~50 words
		})

		it("should handle edge case of exactly 50 words", () => {
			// Create content with exactly 50 words
			const exactlyFiftyWords = Array.from({ length: 50 }, (_, i) => `word${i + 1}`).join(" ")

			const tool = {
				tool: "writeFile",
				content: exactlyFiftyWords,
				path: "test.txt",
			}

			const askText = JSON.stringify(tool)
			render(<ToolDisplay askType="tool" askText={askText} compact={true} />)

			const codeElement = screen.getByText(/write_file/)
			// With exactly 50 words, it should not be truncated
			expect(codeElement.textContent).not.toContain("...")
		})

		it("should handle empty or minimal parameters", () => {
			const minimalTool = {
				tool: "listFiles",
			}

			const askText = JSON.stringify(minimalTool)
			render(<ToolDisplay askType="tool" askText={askText} compact={true} />)

			const codeElement = screen.getByText(/list_files/)
			expect(codeElement.textContent).toContain("list_files")
			expect(codeElement.textContent).not.toContain("...")
		})
	})

	describe("formatToolCall truncation in last tool display", () => {
		it("should truncate long tool calls when showing last tool", () => {
			const longContent =
				"This is another very long string with many words that should definitely exceed fifty words and trigger truncation when displayed as the last tool used by the assistant in the previous interaction"

			const toolCall = {
				toolName: "executeCommand",
				toolInput: {
					command: longContent,
					cwd: "/very/long/path/to/working/directory",
					args: [longContent, "more", "arguments", "here"],
					env: {
						LONG_VAR_NAME: longContent,
						ANOTHER_VAR: "more content here",
					},
				},
			}

			// Test the "last tool" display (no askType, but with toolCall)
			render(<ToolDisplay askType="" toolCall={toolCall} />)

			const element = screen.getByText(/Last tool:/)
			expect(element).toBeTruthy()

			// Find the code element and check for truncation
			const codeElement = element.parentElement?.querySelector("code")
			expect(codeElement?.textContent).toContain("...")
			expect(codeElement?.textContent).toContain("execute_command")
		})

		it("should not truncate short tool calls in last tool display", () => {
			const toolCall = {
				toolName: "readFile",
				toolInput: {
					path: "short/path.ts",
				},
			}

			render(<ToolDisplay askType="" toolCall={toolCall} />)

			const element = screen.getByText(/Last tool:/)
			const codeElement = element.parentElement?.querySelector("code")
			expect(codeElement?.textContent).not.toContain("...")
			expect(codeElement?.textContent).toContain("read_file")
			expect(codeElement?.textContent).toContain("short/path.ts")
		})
	})

	describe("word counting logic", () => {
		it("should handle special characters and JSON formatting correctly", () => {
			const toolWithSpecialChars = {
				tool: "searchFiles",
				pattern: "test.*\\.tsx?$",
				options: {
					"case-sensitive": false,
					"max-results": 100,
				},
			}

			const askText = JSON.stringify(toolWithSpecialChars)
			render(<ToolDisplay askType="tool" askText={askText} compact={true} />)

			// Should handle the JSON formatting and special characters properly
			const codeElement = screen.getByText(/search_files/)
			expect(codeElement.textContent).toContain("search_files")
			expect(codeElement.textContent).toContain("case-sensitive")
		})

		it("should preserve tool name readability with camelCase conversion", () => {
			const toolCall = {
				toolName: "debugStepInto",
				toolInput: { frameId: 0 },
			}

			render(<ToolDisplay askType="" toolCall={toolCall} />)

			const codeElement = screen.getByText(/debug_step_into/)
			expect(codeElement.textContent).toContain("debug_step_into")
			expect(codeElement.textContent).not.toContain("debugStepInto")
		})
	})
})
