import { describe, it, expect } from "vitest"
import { clineMessageSchema } from "../message.js"
import type { ClineMessage } from "../message.js"

describe("ClineMessage schema with taskId", () => {
	describe("schema validation", () => {
		it("should accept messages with taskId", () => {
			const validMessage = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Hello world",
				taskId: "test-task-123",
			}

			const result = clineMessageSchema.safeParse(validMessage)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.taskId).toBe("test-task-123")
			}
		})

		it("should accept messages without taskId (backward compatibility)", () => {
			const validMessage = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Hello world",
			}

			const result = clineMessageSchema.safeParse(validMessage)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.taskId).toBeUndefined()
			}
		})

		it("should validate taskId as string when provided", () => {
			const invalidMessage = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Hello world",
				taskId: 123, // Invalid: should be string
			}

			const result = clineMessageSchema.safeParse(invalidMessage)
			expect(result.success).toBe(false)
		})

		it("should reject taskId as boolean", () => {
			const invalidMessage = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Hello world",
				taskId: true, // Invalid: should be string
			}

			const result = clineMessageSchema.safeParse(invalidMessage)
			expect(result.success).toBe(false)
		})

		it("should reject taskId as object", () => {
			const invalidMessage = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Hello world",
				taskId: { id: "task-123" }, // Invalid: should be string
			}

			const result = clineMessageSchema.safeParse(invalidMessage)
			expect(result.success).toBe(false)
		})

		it("should reject taskId as array", () => {
			const invalidMessage = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Hello world",
				taskId: ["task-123"], // Invalid: should be string
			}

			const result = clineMessageSchema.safeParse(invalidMessage)
			expect(result.success).toBe(false)
		})

		it("should reject taskId as null", () => {
			const invalidMessage = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Hello world",
				taskId: null, // Invalid: should be string or undefined
			}

			const result = clineMessageSchema.safeParse(invalidMessage)
			expect(result.success).toBe(false)
		})

		it("should work with all message types", () => {
			const askMessage = {
				ts: Date.now(),
				type: "ask" as const,
				ask: "tool" as const,
				text: "Approve tool use?",
				taskId: "ask-task-456",
			}

			const askResult = clineMessageSchema.safeParse(askMessage)
			expect(askResult.success).toBe(true)
			if (askResult.success) {
				expect(askResult.data.taskId).toBe("ask-task-456")
			}

			const sayMessage = {
				ts: Date.now(),
				type: "say" as const,
				say: "user_feedback" as const,
				text: "Task completed",
				taskId: "say-task-789",
			}

			const sayResult = clineMessageSchema.safeParse(sayMessage)
			expect(sayResult.success).toBe(true)
			if (sayResult.success) {
				expect(sayResult.data.taskId).toBe("say-task-789")
			}
		})

		it("should accept empty string taskId", () => {
			const message = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Hello",
				taskId: "",
			}

			const result = clineMessageSchema.safeParse(message)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.taskId).toBe("")
			}
		})

		it("should accept very long taskId string", () => {
			const longTaskId = "a".repeat(1000) // 1000 character string
			const message = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Hello",
				taskId: longTaskId,
			}

			const result = clineMessageSchema.safeParse(message)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.taskId).toBe(longTaskId)
			}
		})

		it("should accept taskId with special characters", () => {
			const specialTaskId = "task-123_456.test@domain.com!#$%^&*()"
			const message = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Hello",
				taskId: specialTaskId,
			}

			const result = clineMessageSchema.safeParse(message)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.taskId).toBe(specialTaskId)
			}
		})

		it("should accept taskId with unicode characters", () => {
			const unicodeTaskId = "任务-123-测试-🚀-α-β-γ"
			const message = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Hello",
				taskId: unicodeTaskId,
			}

			const result = clineMessageSchema.safeParse(message)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.taskId).toBe(unicodeTaskId)
			}
		})

		it("should accept taskId with whitespace", () => {
			const whitespaceTaskId = "  task with spaces  \n\t"
			const message = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Hello",
				taskId: whitespaceTaskId,
			}

			const result = clineMessageSchema.safeParse(message)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.taskId).toBe(whitespaceTaskId)
			}
		})

		it("should not affect other required fields", () => {
			const incompleteMessage = {
				type: "say" as const,
				say: "text" as const,
				text: "Hello",
				taskId: "test-123",
				// Missing required 'ts' field
			}

			const result = clineMessageSchema.safeParse(incompleteMessage)
			expect(result.success).toBe(false)
		})
	})

	describe("integration with message types", () => {
		it("should work with all ask types", () => {
			const askTypes = [
				"followup",
				"command",
				"command_output",
				"completion_result",
				"tool",
				"api_req_failed",
				"resume_task",
				"resume_completed_task",
				"mistake_limit_reached",
				"browser_action_launch",
				"use_mcp_server",
				"auto_approval_max_req_reached",
			] as const

			askTypes.forEach((askType) => {
				const message = {
					ts: Date.now(),
					type: "ask" as const,
					ask: askType,
					text: `Test ${askType}`,
					taskId: `task-${askType}`,
				}

				const result = clineMessageSchema.safeParse(message)
				expect(result.success).toBe(true)
				if (result.success) {
					expect(result.data.taskId).toBe(`task-${askType}`)
				}
			})
		})

		it("should work with all say types", () => {
			const sayTypes = [
				"error",
				"api_req_started",
				"api_req_finished",
				"api_req_retried",
				"api_req_retry_delayed",
				"api_req_deleted",
				"text",
				"reasoning",
				"completion_result",
				"user_feedback",
				"user_feedback_diff",
				"command_output",
				"shell_integration_warning",
				"browser_action",
				"browser_action_result",
				"mcp_server_request_started",
				"mcp_server_response",
				"subtask_result",
				"checkpoint_saved",
				"zentaraignore_error",
				"diff_error",
				"condense_context",
				"condense_context_error",
				"codebase_search_result",
			] as const

			sayTypes.forEach((sayType) => {
				const message = {
					ts: Date.now(),
					type: "say" as const,
					say: sayType,
					text: `Test ${sayType}`,
					taskId: `task-${sayType}`,
				}

				const result = clineMessageSchema.safeParse(message)
				expect(result.success).toBe(true)
				if (result.success) {
					expect(result.data.taskId).toBe(`task-${sayType}`)
				}
			})
		})

		it("should work with complex message with all optional fields", () => {
			const complexMessage = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Complex message",
				taskId: "complex-task-123",
				images: ["image1.png", "image2.jpg"],
				partial: true,
				reasoning: "This is the reasoning",
				conversationHistoryIndex: 5,
				checkpoint: { key: "value", nested: { deep: true } },
				progressStatus: { icon: "✓", text: "Processing..." },
				contextCondense: {
					cost: 0.001,
					prevContextTokens: 1000,
					newContextTokens: 500,
					summary: "Condensed context",
				},
				isProtected: false,
			}

			const result = clineMessageSchema.safeParse(complexMessage)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.taskId).toBe("complex-task-123")
				expect(result.data.text).toBe("Complex message")
				expect(result.data.images).toEqual(["image1.png", "image2.jpg"])
				expect(result.data.partial).toBe(true)
				expect(result.data.reasoning).toBe("This is the reasoning")
			}
		})
	})

	describe("TypeScript types", () => {
		it("should allow taskId in ClineMessage type", () => {
			const messageWithTaskId: ClineMessage = {
				ts: Date.now(),
				type: "say",
				say: "text",
				text: "Hello",
				taskId: "type-test-123",
			}

			expect(messageWithTaskId.taskId).toBe("type-test-123")
		})

		it("should allow ClineMessage without taskId", () => {
			const messageWithoutTaskId: ClineMessage = {
				ts: Date.now(),
				type: "say",
				say: "text",
				text: "Hello",
			}

			expect(messageWithoutTaskId.taskId).toBeUndefined()
		})

		it("should have correct TypeScript type for taskId", () => {
			const message: ClineMessage = {
				ts: Date.now(),
				type: "say",
				say: "text",
				text: "Hello",
			}

			// These should compile without TypeScript errors
			message.taskId = "string-value"
			message.taskId = undefined

			// These lines are commented out as they would cause TypeScript errors
			// message.taskId = 123  // would not allow non-string values
			// message.taskId = null // would not allow null

			expect(typeof message.taskId === "string" || message.taskId === undefined).toBe(true)
		})
	})
})
