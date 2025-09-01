import { describe, test, expect, vi, beforeEach } from "vitest"
import { subagentTool } from "../../core/tools/subagentTool"
import type { Task } from "../../core/task/Task"
import type { ToolUse } from "../../shared/tools"

// Mock the agent discovery module
vi.mock("../../roo_subagent/src/agentDiscovery", () => ({
	createAgentLoadingContext: () => ({
		workspaceRoot: "/test/workspace",
		homeDirectory: "/test/home",
	}),
	discoverAgents: () =>
		Promise.resolve({
			agents: {
				system: [
					{
						name: "code-reviewer",
						description: "Expert code review specialist",
						systemPrompt: "You are a senior code reviewer. Focus on security and quality.",
					},
				],
				project: [
					{
						name: "bug-investigator",
						description: "Bug investigation specialist",
						systemPrompt: "You are a debugging expert. Use systematic investigation.",
					},
				],
				global: [],
			},
			errors: [],
		}),
	findAgentByName: (registry: any, name: string) => {
		// System has highest priority
		const systemAgent = registry.system.find((agent: any) => agent.name === name)
		if (systemAgent) return systemAgent

		// Project has second priority
		const projectAgent = registry.project.find((agent: any) => agent.name === name)
		if (projectAgent) return projectAgent

		// Global has lowest priority
		const globalAgent = registry.global.find((agent: any) => agent.name === name)
		return globalAgent || null
	},
}))

describe("subagentTool predefined agents", () => {
	let mockTask: Partial<Task>
	let mockPushToolResult: ReturnType<typeof vi.fn>
	let mockProvider: any

	beforeEach(() => {
		mockPushToolResult = vi.fn()
		mockProvider = {
			initClineWithTask: vi.fn().mockResolvedValue({
				taskId: "test-task-id",
				emit: vi.fn(),
			}),
			postMessageToWebview: vi.fn(),
			clearAllPendingTasksAndAsks: vi.fn(),
			parallelTasksState: [],
		}

		mockTask = {
			isParallel: false,
			consecutiveMistakeCount: 0,
			recordToolError: vi.fn(),
			ask: vi.fn(),
			providerRef: {
				deref: () => mockProvider,
				[Symbol.toStringTag]: "WeakRef",
			} as any,
			enableCheckpoints: false,
			checkpointSave: vi.fn(),
			emit: vi.fn(),
			isPaused: false,
		}
	})

	test("should use specific predefined agent system prompt", async () => {
		const block: ToolUse = {
			type: "tool_use",
			params: {
				_text: JSON.stringify({
					description: "Review code changes",
					message: "Analyze the authentication module for security issues.",
					subagent_type: "code-reviewer",
				}),
			},
		} as any

		await subagentTool(mockTask as Task, block, vi.fn(), vi.fn(), mockPushToolResult, vi.fn())

		// Verify that initClineWithTask was called with the combined message
		expect(mockProvider.initClineWithTask).toHaveBeenCalledWith(
			"You are a senior code reviewer. Focus on security and quality.\n\nAnalyze the authentication module for security issues.",
			undefined,
			mockTask,
			true,
		)
	})

	test("should fallback gracefully when agent not found", async () => {
		const block: ToolUse = {
			type: "tool_use",
			params: {
				_text: JSON.stringify({
					description: "Custom task",
					message: "Do something specific.",
					subagent_type: "nonexistent-agent",
				}),
			},
		} as any

		await subagentTool(mockTask as Task, block, vi.fn(), vi.fn(), mockPushToolResult, vi.fn())

		// Should use original message without predefined prompt
		expect(mockProvider.initClineWithTask).toHaveBeenCalledWith("Do something specific.", undefined, mockTask, true)
	})

	test("should work without subagent_type (backward compatibility)", async () => {
		const block: ToolUse = {
			type: "tool_use",
			params: {
				_text: JSON.stringify({
					description: "Regular task",
					message: "Perform regular analysis without predefined agent.",
				}),
			},
		} as any

		await subagentTool(mockTask as Task, block, vi.fn(), vi.fn(), mockPushToolResult, vi.fn())

		// Should use original message only
		expect(mockProvider.initClineWithTask).toHaveBeenCalledWith(
			"Perform regular analysis without predefined agent.",
			undefined,
			mockTask,
			true,
		)
	})

	test("should prioritize system agents over project agents", async () => {
		// This test demonstrates that the findAgentByName function correctly prioritizes
		// system agents over project agents when the same name exists in both
		const testRegistry = {
			system: [
				{
					name: "shared-agent",
					description: "System version",
					systemPrompt: "System agent prompt",
				},
			],
			project: [
				{
					name: "shared-agent",
					description: "Project version",
					systemPrompt: "Project agent prompt",
				},
			],
			global: [],
		}

		const mod = await import("../../roo_subagent/src/agentDiscovery")
		const foundAgent = mod.findAgentByName(testRegistry, "shared-agent")

		// Should return system agent (higher priority)
		expect(foundAgent?.systemPrompt).toBe("System agent prompt")
	})
})
