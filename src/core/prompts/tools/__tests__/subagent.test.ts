import { describe, test, expect, vi } from "vitest"
import { getSubagentDescription, getAgentsList } from "../subagent"

describe("getAgentsList", () => {
	test("should return formatted list of agents", () => {
		const systemMap = new Map([["sys-agent", { name: "sys-agent", description: "System agent description" }]])
		const projectMap = new Map([["proj-agent", { name: "proj-agent", description: "Project agent description" }]])
		const globalMap = new Map([["glob-agent", { name: "glob-agent", description: "Global agent description" }]])

		const mockDiscoveredAgents = {
			agents: {
				system: systemMap,
				project: projectMap,
				global: globalMap,
			},
			errors: [],
		}

		const result = getAgentsList(mockDiscoveredAgents)

		expect(result).toBe(
			"- **sys-agent**: System agent description\n" +
				"- **proj-agent**: Project agent description\n" +
				"- **glob-agent**: Global agent description",
		)
	})

	test("should return 'No predefined agents' when no agents found", () => {
		const mockDiscoveredAgents = {
			agents: {
				system: new Map(),
				project: new Map(),
				global: new Map(),
			},
			errors: [],
		}

		const result = getAgentsList(mockDiscoveredAgents)
		expect(result).toBe("No predefined agents are currently available.")
	})

	test("should return 'No predefined agents' when agents is null", () => {
		const result = getAgentsList(null)
		expect(result).toBe("No predefined agents are currently available.")
	})

	test("should handle missing agent categories gracefully", () => {
		const systemMap = new Map([["test", { name: "test", description: "Test agent" }]])

		const mockDiscoveredAgents = {
			agents: {
				system: systemMap,
				// project is missing
				// global is missing
			},
			errors: [],
		}

		const result = getAgentsList(mockDiscoveredAgents)
		expect(result).toBe("- **test**: Test agent")
	})

	test("should preserve order: system, project, then global", () => {
		const systemMap = new Map([["system-1", { name: "system-1", description: "System first" }]])
		const projectMap = new Map([["project-1", { name: "project-1", description: "Project first" }]])
		const globalMap = new Map([["global-1", { name: "global-1", description: "Global first" }]])

		const mockDiscoveredAgents = {
			agents: {
				global: globalMap,
				system: systemMap,
				project: projectMap,
			},
			errors: [],
		}

		const result = getAgentsList(mockDiscoveredAgents)
		const lines = result.split("\n")

		expect(lines[0]).toContain("system-1")
		expect(lines[1]).toContain("project-1")
		expect(lines[2]).toContain("global-1")
	})
})

describe("getSubagentDescription", () => {
	test("should dynamically inject predefined agents list", async () => {
		// Create mock discovered agents with Maps
		const systemMap = new Map([
			[
				"code-reviewer",
				{
					name: "code-reviewer",
					description: "Expert code review specialist for quality, security, and maintainability analysis",
				},
			],
			[
				"api-designer",
				{
					name: "api-designer",
					description: "RESTful API design expert for consistent and well-structured APIs",
				},
			],
		])

		const projectMap = new Map([
			[
				"project-analyzer",
				{
					name: "project-analyzer",
					description: "Analyzes project structure and provides architectural recommendations",
				},
			],
		])

		const globalMap = new Map([
			[
				"bug-investigator",
				{
					name: "bug-investigator",
					description: "Systematic bug analysis and root cause investigation specialist",
				},
			],
		])

		const mockDiscoveredAgents = {
			agents: {
				system: systemMap,
				project: projectMap,
				global: globalMap,
			},
			errors: [],
		}

		// Call the function with discovered agents
		const result = await getSubagentDescription(mockDiscoveredAgents)

		// Verify the result contains the dynamic content
		expect(result).toContain("Following is the current accessible list of predefined agents")
		expect(result).toContain(
			"- **code-reviewer**: Expert code review specialist for quality, security, and maintainability analysis",
		)
		expect(result).toContain(
			"- **api-designer**: RESTful API design expert for consistent and well-structured APIs",
		)
		expect(result).toContain(
			"- **project-analyzer**: Analyzes project structure and provides architectural recommendations",
		)
		expect(result).toContain(
			"- **bug-investigator**: Systematic bug analysis and root cause investigation specialist",
		)

		// Verify it contains the basic subagent description structure
		expect(result).toContain("## subagent (PRIORITY TOOL - USE FIRST!)")
		expect(result).toContain("**THIS IS YOUR PRIMARY TOOL**")
		expect(result).toContain("Description:")
	})

	test("should include all agents from .zentara/agents folder", async () => {
		// Mock the agents we created in .zentara/agents
		const projectMap = new Map([
			[
				"code-reviewer",
				{
					name: "code-reviewer",
					description: "Expert code review specialist for quality, security, and maintainability analysis",
				},
			],
			[
				"bug-investigator",
				{
					name: "bug-investigator",
					description: "Systematic bug analysis and root cause investigation specialist",
				},
			],
			[
				"api-designer",
				{
					name: "api-designer",
					description: "RESTful API design expert for consistent and well-structured APIs",
				},
			],
			[
				"test-writer",
				{
					name: "test-writer",
					description: "Comprehensive test suite developer for unit, integration, and edge case testing",
				},
			],
			[
				"refactoring-expert",
				{
					name: "refactoring-expert",
					description:
						"Code refactoring specialist for improving maintainability and reducing technical debt",
				},
			],
			[
				"performance-optimizer",
				{
					name: "performance-optimizer",
					description:
						"Performance analysis and optimization specialist for improving application speed and efficiency",
				},
			],
			[
				"documentation-writer",
				{
					name: "documentation-writer",
					description: "Technical documentation specialist for creating clear, comprehensive documentation",
				},
			],
			[
				"security-auditor",
				{
					name: "security-auditor",
					description: "Security vulnerability assessment and remediation specialist",
				},
			],
		])

		const mockDiscoveredAgents = {
			agents: {
				system: new Map(),
				project: projectMap,
				global: new Map(),
			},
			errors: [],
		}

		const result = await getSubagentDescription(mockDiscoveredAgents)

		// Verify all our created agents are in the list
		expect(result).toContain(
			"- **code-reviewer**: Expert code review specialist for quality, security, and maintainability analysis",
		)
		expect(result).toContain(
			"- **bug-investigator**: Systematic bug analysis and root cause investigation specialist",
		)
		expect(result).toContain(
			"- **api-designer**: RESTful API design expert for consistent and well-structured APIs",
		)
		expect(result).toContain(
			"- **test-writer**: Comprehensive test suite developer for unit, integration, and edge case testing",
		)
		expect(result).toContain(
			"- **refactoring-expert**: Code refactoring specialist for improving maintainability and reducing technical debt",
		)
		expect(result).toContain(
			"- **performance-optimizer**: Performance analysis and optimization specialist for improving application speed and efficiency",
		)
		expect(result).toContain(
			"- **documentation-writer**: Technical documentation specialist for creating clear, comprehensive documentation",
		)
		expect(result).toContain("- **security-auditor**: Security vulnerability assessment and remediation specialist")
	})

	test("should handle null discovered agents gracefully", async () => {
		// Call the function with null
		const result = await getSubagentDescription(null)

		// Verify it contains the "no agents available" message
		expect(result).toContain("No predefined agents are currently available.")

		// Still should contain the basic structure
		expect(result).toContain("Following is the current accessible list of predefined agents")
		expect(result).toContain("## subagent (PRIORITY TOOL - USE FIRST!)")
	})

	test("should handle empty agent list", async () => {
		// Create mock discovered agents with empty Maps
		const mockDiscoveredAgents = {
			agents: {
				system: new Map(),
				project: new Map(),
				global: new Map(),
			},
			errors: [],
		}

		// Call the function with empty agents
		const result = await getSubagentDescription(mockDiscoveredAgents)

		// Verify it contains the "no agents available" message
		expect(result).toContain("No predefined agents are currently available.")
		expect(result).toContain("Following is the current accessible list of predefined agents")
	})

	test("should properly format agent list in markdown", async () => {
		const systemMap = new Map([
			["test-agent-1", { name: "test-agent-1", description: "Test description 1" }],
			["test-agent-2", { name: "test-agent-2", description: "Test description 2" }],
		])
		const projectMap = new Map([["test-agent-3", { name: "test-agent-3", description: "Test description 3" }]])
		const globalMap = new Map([["test-agent-4", { name: "test-agent-4", description: "Test description 4" }]])

		const mockDiscoveredAgents = {
			agents: {
				system: systemMap,
				project: projectMap,
				global: globalMap,
			},
			errors: [],
		}

		const result = await getSubagentDescription(mockDiscoveredAgents)

		// Verify markdown formatting
		expect(result).toContain("- **test-agent-1**: Test description 1")
		expect(result).toContain("- **test-agent-2**: Test description 2")
		expect(result).toContain("- **test-agent-3**: Test description 3")
		expect(result).toContain("- **test-agent-4**: Test description 4")

		// Verify agents are listed in the correct section
		const agentListStart = result.indexOf("Following is the current accessible list of predefined agents")
		const exampleStart = result.indexOf("### Example 1:")

		const agentSection = result.substring(agentListStart, exampleStart)
		expect(agentSection).toContain("test-agent-1")
		expect(agentSection).toContain("test-agent-2")
		expect(agentSection).toContain("test-agent-3")
		expect(agentSection).toContain("test-agent-4")
	})

	test("should inject agent list at correct position in prompt template", async () => {
		const systemMap = new Map([
			["injected-agent", { name: "injected-agent", description: "This agent was injected" }],
		])

		const mockDiscoveredAgents = {
			agents: {
				system: systemMap,
				project: new Map(),
				global: new Map(),
			},
			errors: [],
		}

		const result = await getSubagentDescription(mockDiscoveredAgents)

		// Find the position of key sections
		const agentListMarker = "Following is the current accessible list of predefined agents"
		const injectedAgent = "- **injected-agent**: This agent was injected"
		const example1 = "### Example 1: Small Subtask Approach"
		const subagentTypeParam = "subagent_type"

		const markerPos = result.indexOf(agentListMarker)
		const agentPos = result.indexOf(injectedAgent)
		const examplePos = result.indexOf(example1)
		const paramPos = result.indexOf(subagentTypeParam)

		// Verify order: parameters description -> agent list marker -> injected agents -> examples
		expect(paramPos).toBeGreaterThan(0)
		expect(markerPos).toBeGreaterThan(paramPos)
		expect(agentPos).toBeGreaterThan(markerPos)
		expect(examplePos).toBeGreaterThan(agentPos)
	})

	test("should aggregate agents from all categories correctly", async () => {
		const systemMap = new Map([
			["sys-1", { name: "sys-1", description: "System agent 1" }],
			["sys-2", { name: "sys-2", description: "System agent 2" }],
		])
		const projectMap = new Map([
			["proj-1", { name: "proj-1", description: "Project agent 1" }],
			["proj-2", { name: "proj-2", description: "Project agent 2" }],
			["proj-3", { name: "proj-3", description: "Project agent 3" }],
		])
		const globalMap = new Map([["glob-1", { name: "glob-1", description: "Global agent 1" }]])

		const mockDiscoveredAgents = {
			agents: {
				system: systemMap,
				project: projectMap,
				global: globalMap,
			},
			errors: [],
		}

		const result = await getSubagentDescription(mockDiscoveredAgents)

		// Count total agents in the list
		const agentMatches = result.match(/- \*\*[^*]+\*\*: [^\n]+/g) || []

		// Should have all 6 agents
		expect(agentMatches.length).toBeGreaterThanOrEqual(6)

		// Verify each agent is present
		expect(result).toContain("- **sys-1**: System agent 1")
		expect(result).toContain("- **sys-2**: System agent 2")
		expect(result).toContain("- **proj-1**: Project agent 1")
		expect(result).toContain("- **proj-2**: Project agent 2")
		expect(result).toContain("- **proj-3**: Project agent 3")
		expect(result).toContain("- **glob-1**: Global agent 1")
	})

	test("should maintain prompt structure integrity with injected content", async () => {
		const systemMap = new Map(
			Array.from({ length: 20 }, (_, i) => [
				`agent-${i}`,
				{
					name: `agent-${i}`,
					description: `Description for agent ${i}`,
				},
			]),
		)

		const mockDiscoveredAgents = {
			agents: {
				system: systemMap,
				project: new Map(),
				global: new Map(),
			},
			errors: [],
		}

		const result = await getSubagentDescription(mockDiscoveredAgents)

		// Even with many agents, the structure should be maintained
		expect(result).toContain("## subagent (PRIORITY TOOL - USE FIRST!)")
		expect(result).toContain("## 🔴 MASTER AGENT ROLE - YOU ARE THE ORCHESTRATOR")
		expect(result).toContain("## 🔍 CRITICAL DESIGN LIMITATION")
		expect(result).toContain("## 🎯 SMALL SUBTASK STRATEGY (MANDATORY)")
		expect(result).toContain("### Predefined Subagents: A General Overview")
		expect(result).toContain("Following is the current accessible list of predefined agents")
		expect(result).toContain("### Example 1: Small Subtask Approach")
		expect(result).toContain("### Example 2: Task Decomposition")
		expect(result).toContain("### Example 3: Complex Task with Write Permissions")
		expect(result).toContain("### Example 4: Using a Predefined Subagent")
		expect(result).toContain("### Example 5: Using a Predefined `bug-investigator` Subagent")

		// Verify all 20 agents are listed
		for (let i = 0; i < 20; i++) {
			expect(result).toContain(`- **agent-${i}**: Description for agent ${i}`)
		}
	})
})
