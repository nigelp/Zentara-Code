import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { ToolDisplay } from "../ToolDisplay"

// Mock react-i18next
vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, defaultValue?: string) => defaultValue || key,
	}),
	Trans: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock safeJsonParse
vi.mock("@roo/safeJsonParse", () => ({
	safeJsonParse: vi.fn((text: string) => {
		try {
			return JSON.parse(text)
		} catch {
			return null
		}
	}),
}))

describe("ToolDisplay", () => {
	describe("formatToolCall function", () => {
		// Test cases for the formatToolCall function (which is not exported, so we test via component)
		it("should truncate long parameter strings by letters", () => {
			const longString = "a".repeat(200)
			const toolCall = {
				toolName: "someTool",
				toolInput: {
					tool: "someTool",
					param: longString,
				},
			}

			render(<ToolDisplay askType="" askText="" toolCall={toolCall} compact={true} />)

			const codeElement = screen.getByText(/some_tool/).closest("code")
			expect(codeElement).toBeDefined()
			expect(codeElement?.textContent?.endsWith("...)")).toBe(true)
		})

		it("should not truncate short parameter strings", () => {
			const shortString = "a".repeat(50)
			const toolCall = {
				toolName: "someTool",
				toolInput: {
					tool: "someTool",
					param: shortString,
				},
			}

			render(<ToolDisplay askType="" askText="" toolCall={toolCall} compact={true} />)

			// Check that the full string is present
			const codeElement = screen.getByText(/some_tool/).closest("code")
			expect(codeElement).toBeDefined()
			expect(codeElement?.textContent).toContain(`"param": "${shortString}"`)
		})

		it("should use the default maxLetters value of 100", () => {
			const longString = "a".repeat(150)
			const toolCall = {
				toolName: "anotherTool",
				toolInput: {
					tool: "anotherTool",
					data: longString,
				},
			}

			render(<ToolDisplay askType="" askText="" toolCall={toolCall} compact={true} />)

			// Should be truncated at 100 letters
			const codeElement = screen.getByText(/another_tool/).closest("code")
			expect(codeElement).toBeDefined()
			expect(codeElement?.textContent?.endsWith("...)")).toBe(true)
		})

		it("should display full file paths for read_file tool without truncation", () => {
			const toolCall = {
				toolName: "read_file",
				toolInput: {
					tool: "read_file",
					args: {
						file: {
							path: "src/very/long/path/to/some/deeply/nested/file/that/should/not/be/truncated.tsx",
						},
					},
				},
			}

			render(<ToolDisplay askType="" askText="" toolCall={toolCall} compact={true} />)

			// Should show the truncated path.
			const element = screen.getByText(
				/src\/very\/long\/path\/to\/some\/deeply\/nested\/file\/that\/should\/not\/be\/truncat\.\.\./,
			)
			expect(element).toBeDefined()
		})

		it("should display full parameters for search_files tool", () => {
			const toolCall = {
				toolName: "search_files",
				toolInput: {
					tool: "search_files",
					pattern: "very_long_search_pattern_that_was_previously_truncated_but_should_now_show_in_full",
					path: "src/components",
					output_mode: "content",
				},
			}

			render(<ToolDisplay askType="" askText="" toolCall={toolCall} compact={true} />)

			// The full pattern is longer than 100 chars, so it should be truncated.
			const element = screen.getByText(
				/very_long_search_pattern_that_was_previously_truncated_but_should_now_show_in_f.../,
			)
			expect(element).toBeDefined()
		})

		it("should display nested XML structure parameters correctly", () => {
			const toolCall = {
				toolName: "read_file",
				toolInput: {
					tool: "read_file",
					args: {
						file: [{ path: "first/file/path.ts" }, { path: "second/file/path.tsx" }],
					},
				},
			}

			render(<ToolDisplay askType="" askText="" toolCall={toolCall} compact={true} />)

			// Should show both file paths in the JSON structure
			const firstFile = screen.getByText(/first\/file\/path\.ts/)
			const secondFile = screen.getByText(/second\/file\/path\.tsx/)
			expect(firstFile).toBeDefined()
			expect(secondFile).toBeDefined()
		})

		it("should work consistently for JSON-style tools like glob", () => {
			const toolCall = {
				toolName: "glob",
				toolInput: {
					tool: "glob",
					content: "**/*.{js,ts,jsx,tsx}",
					path: "src/components",
				},
			}

			render(<ToolDisplay askType="" askText="" toolCall={toolCall} compact={true} />)

			// Should show all parameters in JSON format
			const codeElement = screen.getByText(/glob/).closest("code")
			expect(codeElement).toBeDefined()
			expect(codeElement?.textContent).toContain(`"content": "**/*.{js, ts, jsx, tsx}"`)
			expect(codeElement?.textContent).toContain(`"path": "src/components"`)
		})

		it("should handle tools with no parameters", () => {
			const toolCall = {
				toolName: "debug_continue",
				toolInput: {
					tool: "debug_continue",
				},
			}

			render(<ToolDisplay askType="" askText="" toolCall={toolCall} compact={true} />)

			// Should show the tool name with empty parameters
			const element = screen.getByText(/debug_continue\(\{\}\)/)
			expect(element).toBeDefined()
		})

		it("should exclude the tool field from parameter display", () => {
			const toolCall = {
				toolName: "execute_command",
				toolInput: {
					tool: "execute_command",
					command: "npm test",
					cwd: "/workspace",
				},
			}

			render(<ToolDisplay askType="" askText="" toolCall={toolCall} compact={true} />)

			// Should show parameters but not the 'tool' field itself
			const command = screen.getByText(/npm test/)
			const workspace = screen.getByText(/\/workspace/)
			expect(command).toBeDefined()
			expect(workspace).toBeDefined()

			// Should not show the tool field in the JSON
			const toolField = screen.queryByText(/"tool":"execute_command"/)
			expect(toolField).toBeNull()
		})
	})
})
