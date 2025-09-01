import { describe, it, expect, vi, beforeEach } from "vitest"
import { subagentTool } from "../subagentTool"
import { newTaskTool } from "../newTaskTool"
import { Task } from "../../task/Task"
import { formatResponse } from "../../prompts/responses"

describe("Subagent Restriction Tests", () => {
	let mockCline: any
	let mockAskApproval: any
	let mockHandleError: any
	let mockPushToolResult: any
	let mockRemoveClosingTag: any

	beforeEach(() => {
		mockCline = {
			isParallel: false,
			consecutiveMistakeCount: 0,
			recordToolError: vi.fn(),
			ask: vi.fn().mockResolvedValue(undefined),
			providerRef: {
				deref: vi.fn().mockReturnValue({
					getState: vi.fn().mockResolvedValue({ customModes: [] }),
					handleModeSwitch: vi.fn().mockResolvedValue(undefined),
					initClineWithTask: vi.fn().mockResolvedValue({ taskId: "test-task-id" }),
				}),
			},
			emit: vi.fn(),
			checkpointSave: vi.fn(),
			enableCheckpoints: false,
			pausedModeSlug: "default",
			isPaused: false,
			sayAndCreateMissingParamError: vi.fn().mockResolvedValue("Missing parameter error"),
		}

		mockAskApproval = vi.fn().mockResolvedValue(true)
		mockHandleError = vi.fn()
		mockPushToolResult = vi.fn()
		mockRemoveClosingTag = vi.fn((tag, content) => content)
	})

	describe("subagentTool", () => {
		it("should reject subagent creation when current task is a subagent", async () => {
			// Set the task as a subagent
			mockCline.isParallel = true

			const block = {
				name: "subagent",
				params: {
					_text: JSON.stringify({
						description: "Test subagent",
						message: "Test message",
					}),
				},
				partial: false,
			}

			await subagentTool(
				mockCline as any,
				block as any,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			// Verify error handling
			expect(mockCline.consecutiveMistakeCount).toBe(1)
			expect(mockCline.recordToolError).toHaveBeenCalledWith("subagent")
			expect(mockPushToolResult).toHaveBeenCalledWith(
				formatResponse.toolError(
					"Subagents cannot launch other subagents or tasks. This operation is restricted to the main agent only.",
				),
			)
		})

		it("should allow subagent creation when current task is not a subagent", async () => {
			// Set the task as main agent
			mockCline.isParallel = false

			const block = {
				name: "subagent",
				params: {
					_text: JSON.stringify({
						description: "Test subagent",
						message: "Test message",
					}),
				},
				partial: false,
			}

			await subagentTool(
				mockCline as any,
				block as any,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			// Verify no error was recorded
			expect(mockCline.consecutiveMistakeCount).toBe(0)
			// Verify subagent was created
			expect(mockPushToolResult).toHaveBeenCalledWith(
				expect.stringContaining("Successfully created 1 parallel subagent(s)"),
			)
		})
	})

	describe("newTaskTool", () => {
		it("should reject new task creation when current task is a subagent", async () => {
			// Set the task as a subagent
			mockCline.isParallel = true

			const block = {
				name: "new_task",
				params: {
					mode: "default",
					message: "Test new task",
				},
				partial: false,
			}

			await newTaskTool(
				mockCline as any,
				block as any,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			// Verify error handling
			expect(mockCline.consecutiveMistakeCount).toBe(1)
			expect(mockCline.recordToolError).toHaveBeenCalledWith("new_task")
			expect(mockPushToolResult).toHaveBeenCalledWith(
				formatResponse.toolError(
					"Subagents cannot launch new tasks. This operation is restricted to the main agent only.",
				),
			)
		})

		it("should allow new task creation when current task is not a subagent", async () => {
			// Set the task as main agent
			mockCline.isParallel = false

			const block = {
				name: "new_task",
				params: {
					mode: "default",
					message: "Test new task",
				},
				partial: false,
			}

			// Mock getModeBySlug to return a valid mode
			vi.mock("../../../shared/modes", () => ({
				getModeBySlug: vi.fn().mockReturnValue({ name: "Default Mode", slug: "default" }),
				defaultModeSlug: "default",
			}))

			await newTaskTool(
				mockCline as any,
				block as any,
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
				mockRemoveClosingTag,
			)

			// Verify approval was requested
			expect(mockAskApproval).toHaveBeenCalled()
			// Verify task was paused
			expect(mockCline.isPaused).toBe(true)
		})
	})
})
