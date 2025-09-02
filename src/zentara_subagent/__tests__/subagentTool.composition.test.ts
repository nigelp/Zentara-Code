import { describe, it, expect, vi, beforeEach } from "vitest"
import { subagentTool } from "../../core/tools/subagentTool"
import type { ToolUse, ToolResponse, ToolParamName } from "../../shared/tools"
import type { ClineAsk, ToolProgressStatus } from "@zentara-code/types"

// Mock agent discovery to avoid vscode dependency and control prompts
const discoverAgentsMock = vi.fn(async () => ({
	agents: {
		system: [
			{ name: "SysA", description: "A", systemPrompt: "SYS_PROMPT_A" },
			{ name: "SysB", description: "B", systemPrompt: "SYS_PROMPT_B" },
		],
		project: [],
		global: [],
	},
	errors: [],
}))
const createAgentLoadingContextMock = vi.fn(() => ({}) as any)

vi.mock("../../zentara_subagent/src/agentDiscovery", () => ({
	discoverAgents: (...args: any[]) => (discoverAgentsMock as any).apply(null, args),
	// No parameters are needed in production, keep signature simple to avoid TS spread constraints
	createAgentLoadingContext: () => createAgentLoadingContextMock(),
}))

describe("subagentTool - predefined prompt composition", () => {
	let mockCline: any
	let mockAskApproval: any
	let mockHandleError: any
	let mockPushToolResult: any
	let mockRemoveClosingTag: any

	const initCalls: string[] = []

	beforeEach(() => {
		initCalls.length = 0
		mockCline = {
			isParallel: false,
			consecutiveMistakeCount: 0,
			recordToolError: vi.fn(),
			ask: vi.fn().mockResolvedValue({ response: "yesButtonClicked" as any }),
			providerRef: {
				deref: vi.fn().mockReturnValue({
					getState: vi.fn().mockResolvedValue({ customModes: [] }),
					handleModeSwitch: vi.fn().mockResolvedValue(undefined),
					clearAllPendingTasksAndAsks: vi.fn().mockResolvedValue(undefined),
					postMessageToWebview: vi.fn().mockResolvedValue(undefined),
					initClineWithTask: vi.fn(async (message: string) => {
						initCalls.push(message)
						return { taskId: "task-1" }
					}),
				}),
			},
			emit: vi.fn(),
			checkpointSave: vi.fn(),
			enableCheckpoints: false,
			pausedModeSlug: "default",
			isPaused: false,
			sayAndCreateMissingParamError: vi.fn().mockResolvedValue("Missing parameter error"),
			say: vi.fn(),
			browserSession: { closeBrowser: vi.fn() },
			toolRepetitionDetector: { check: vi.fn().mockReturnValue({ allowExecution: true }) },
			userMessageContent: [],
			userMessageContentReady: false,
		}

		mockAskApproval = vi.fn().mockResolvedValue(true)
		mockHandleError = vi.fn()
		mockPushToolResult = vi.fn((content: ToolResponse) => content)
		mockRemoveClosingTag = vi.fn((tag: ToolParamName, content?: string) => content ?? "")
	})

	it("prepends concatenated prompts for subagent_type=system then task message", async () => {
		const block: ToolUse = {
			type: "tool_use",
			name: "subagent" as any,
			params: {
				_text: JSON.stringify({
					description: "Use system prompts",
					message: "TASK_BODY",
					subagent_type: "system",
				}),
			},
			partial: false,
		}

		await subagentTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

		expect(discoverAgentsMock).toHaveBeenCalled()
		expect(initCalls.length).toBe(1)
		const composed = initCalls[0]
		expect(composed).toContain("SYS_PROMPT_A")
		expect(composed).toContain("SYS_PROMPT_B")
		// Order and separator policy: join with blank line, then task
		expect(composed).toBe("SYS_PROMPT_A\n\nSYS_PROMPT_B\n\nTASK_BODY")
	})

	it("falls back to task-only when bucket empty", async () => {
		// Return empty buckets
		discoverAgentsMock.mockResolvedValueOnce({
			agents: { system: [], project: [], global: [] },
			errors: [],
		})

		const block: ToolUse = {
			type: "tool_use",
			name: "subagent" as any,
			params: {
				_text: JSON.stringify({
					description: "Empty bucket",
					message: "ONLY_TASK",
					subagent_type: "project",
				}),
			},
			partial: false,
		}

		await subagentTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

		expect(initCalls.length).toBe(1)
		expect(initCalls[0]).toBe("ONLY_TASK")
	})
})
