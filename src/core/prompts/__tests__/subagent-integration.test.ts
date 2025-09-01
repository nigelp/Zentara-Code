import { describe, it, expect } from "vitest"
import { getSubagentSection } from "../subagent"

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
