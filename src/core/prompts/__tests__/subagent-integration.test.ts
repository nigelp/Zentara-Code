import { describe, it, expect } from "vitest"
import { getSubagentSection } from "../subagent"
import { getMainAgentSection } from "../mainagent"

describe("Subagent System Prompt Integration", () => {
	it("should return empty string when subagent flag is false in getSubagentSection", () => {
		const section = getSubagentSection(false)
		expect(section).toBe("")
	})

	it("should return subagent instructions when subagent flag is true in getSubagentSection", () => {
		const section = getSubagentSection(true)
		expect(section).toContain("SUBAGENT INSTRUCTIONS")
		expect(section).toContain(
			"You are a subagent. You work autonomously and return the result to the parent agent.",
		)
		expect(section).toContain("You cannot ask any questions to the user or parent agent.")
		expect(section).toContain("You cannot ask follow up questions.")
	})

	it("should return undefined when subagent flag is undefined", () => {
		const section = getSubagentSection(undefined)
		expect(section).toBe("")
	})
})

describe("Main Agent Section", () => {
	it("should return empty string when main agent flag is false in getMainAgentSection", () => {
		const section = getMainAgentSection(false)
		expect(section).toBe("")
	})

	it("should return main agent instructions when main agent flag is true in getMainAgentSection", () => {
		const section = getMainAgentSection(true)
		expect(section).toContain("MAIN AGENT INSTRUCTIONS")
		expect(section).toContain("You are the main agent (master agent)")
		expect(section).toContain("MANDATORY SUBAGENT USAGE")
		expect(section).toContain("SEARCH TOOL RESTRICTIONS")
		expect(section).toContain("YOUR ROLE AS ORCHESTRATOR")
	})

	it("should return empty string when main agent flag is undefined in getMainAgentSection", () => {
		const section = getMainAgentSection(undefined)
		expect(section).toBe("")
	})

	it("should contain specific instructions about search tool restrictions", () => {
		const section = getMainAgentSection(true)
		expect(section).toContain("glob")
		expect(section).toContain("search_files")
		expect(section).toContain("lsp_search_symbols")
		expect(section).toContain("PROHIBITED")
	})

	it("should contain orchestration instructions", () => {
		const section = getMainAgentSection(true)
		expect(section).toContain("DECOMPOSE")
		expect(section).toContain("DELEGATE")
		expect(section).toContain("INTEGRATE")
		expect(section).toContain("COORDINATE")
	})
})
