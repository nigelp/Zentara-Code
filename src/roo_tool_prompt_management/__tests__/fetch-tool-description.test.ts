import { describe, it, expect, beforeEach } from "vitest"
import {
	fetch_tool_description,
	fetch_multiple_tool_descriptions,
	getAvailableToolNames,
	toolExists,
} from "../fetch-tool-description"
import { clearAllCaches } from "../tool-optimization-integration"

describe("fetch_tool_description", () => {
	beforeEach(() => {
		// Clear caches before each test to ensure clean state
		clearAllCaches()
	})

	describe("fetch_tool_description", () => {
		it("should return full description for an existing tool", () => {
			const description = fetch_tool_description("read_file")
			expect(description).toBeTruthy()
			expect(description).toContain("read_file")
			expect(description?.length).toBeGreaterThan(100) // Full descriptions should be substantial
		})

		it("should return null for a non-existent tool", () => {
			const description = fetch_tool_description("non_existent_tool")
			expect(description).toBeNull()
		})

		it("should cache tool descriptions on subsequent calls", () => {
			// First call - generates and caches
			const description1 = fetch_tool_description("glob")
			expect(description1).toBeTruthy()

			// Second call - should retrieve from cache (same result)
			const description2 = fetch_tool_description("glob")
			expect(description2).toBe(description1)
		})

		it("should handle tools with different parameter requirements", () => {
			// Test a simple tool
			const simpleToolDesc = fetch_tool_description("list_files")
			expect(simpleToolDesc).toBeTruthy()

			// Test a tool that uses cwd parameter
			const withCwdDesc = fetch_tool_description("execute_command", {
				cwd: "/test/path",
			})
			expect(withCwdDesc).toBeTruthy()
			expect(withCwdDesc).toContain("execute_command")
		})

		it("should work with debug tools", () => {
			const debugDesc = fetch_tool_description("debug_launch")
			expect(debugDesc).toBeTruthy()
			expect(debugDesc).toContain("debug")
		})
	})

	describe("getAvailableToolNames", () => {
		it("should return an array of tool names", () => {
			const toolNames = getAvailableToolNames()
			expect(Array.isArray(toolNames)).toBe(true)
			expect(toolNames.length).toBeGreaterThan(0)
			expect(toolNames).toContain("read_file")
			expect(toolNames).toContain("write_to_file")
			expect(toolNames).toContain("execute_command")
		})

		it("should include debug tools", () => {
			const toolNames = getAvailableToolNames()
			const debugTools = toolNames.filter((name) => name.startsWith("debug_"))
			expect(debugTools.length).toBeGreaterThan(0)
		})
	})

	describe("toolExists", () => {
		it("should return true for existing tools", () => {
			expect(toolExists("read_file")).toBe(true)
			expect(toolExists("write_to_file")).toBe(true)
			expect(toolExists("glob")).toBe(true)
			expect(toolExists("search_files")).toBe(true)
		})

		it("should return false for non-existent tools", () => {
			expect(toolExists("non_existent_tool")).toBe(false)
			expect(toolExists("fake_tool")).toBe(false)
			expect(toolExists("")).toBe(false)
		})
	})

	describe("fetch_multiple_tool_descriptions", () => {
		it("should fetch descriptions for multiple tools", () => {
			const tools = ["read_file", "write_to_file", "glob"]
			const descriptions = fetch_multiple_tool_descriptions(tools)

			expect(descriptions.size).toBe(3)
			expect(descriptions.get("read_file")).toBeTruthy()
			expect(descriptions.get("write_to_file")).toBeTruthy()
			expect(descriptions.get("glob")).toBeTruthy()
		})

		it("should handle mix of existing and non-existent tools", () => {
			const tools = ["read_file", "non_existent", "glob"]
			const descriptions = fetch_multiple_tool_descriptions(tools)

			expect(descriptions.size).toBe(3)
			expect(descriptions.get("read_file")).toBeTruthy()
			expect(descriptions.get("non_existent")).toBeNull()
			expect(descriptions.get("glob")).toBeTruthy()
		})

		it("should handle empty array", () => {
			const descriptions = fetch_multiple_tool_descriptions([])
			expect(descriptions.size).toBe(0)
		})

		it("should use options for all tools", () => {
			const tools = ["execute_command", "read_file"]
			const descriptions = fetch_multiple_tool_descriptions(tools, {
				cwd: "/custom/path",
				supportsComputerUse: true,
			})

			expect(descriptions.size).toBe(2)
			descriptions.forEach((desc) => {
				expect(desc).toBeTruthy()
			})
		})
	})

	describe("Integration with tool optimization", () => {
		it("should work with the tool description optimization system", () => {
			// This tests that our fetch function integrates properly with the existing system
			const description = fetch_tool_description("subagent")
			expect(description).toBeTruthy()
			expect(description).toContain("subagent")
		})

		it("should handle always available tools", () => {
			// These tools are always available across all modes
			const alwaysAvailable = [
				"ask_followup_question",
				"attempt_completion",
				"switch_mode",
				"new_task",
				"subagent",
				"update_todo_list",
			]

			alwaysAvailable.forEach((toolName) => {
				const desc = fetch_tool_description(toolName)
				expect(desc).toBeTruthy()
			})
		})
	})
})
