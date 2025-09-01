import { describe, it, expect } from "vitest"
import {
	clineMessageSchema,
	clineAskSchema as _clineAskSchema,
	clineSaySchema as _clineSaySchema,
	type ClineMessage,
	type ClineAsk as _ClineAsk,
	type ClineSay as _ClineSay,
} from "../message.js"

describe("ClineMessage Schema", () => {
	describe("basic message structure", () => {
		it("should require ts and type fields", () => {
			const invalidMessage = {
				say: "text" as const,
				text: "Hello world",
			}

			const result = clineMessageSchema.safeParse(invalidMessage)
			expect(result.success).toBe(false)
		})

		it("should accept valid ask message", () => {
			const validAskMessage = {
				ts: Date.now(),
				type: "ask" as const,
				ask: "tool" as const,
				text: "May I use this tool?",
			}

			const result = clineMessageSchema.safeParse(validAskMessage)
			expect(result.success).toBe(true)
		})

		it("should accept valid say message", () => {
			const validSayMessage = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Hello world",
			}

			const result = clineMessageSchema.safeParse(validSayMessage)
			expect(result.success).toBe(true)
		})
	})

	describe("taskId field validation", () => {
		it("should accept messages with taskId", () => {
			const messageWithTaskId = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Hello world",
				taskId: "test-task-123",
			}

			const result = clineMessageSchema.safeParse(messageWithTaskId)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.taskId).toBe("test-task-123")
			}
		})

		it("should accept messages without taskId (backward compatibility)", () => {
			const messageWithoutTaskId = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Hello world",
			}

			const result = clineMessageSchema.safeParse(messageWithoutTaskId)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.taskId).toBeUndefined()
			}
		})

		it("should require taskId to be a string when provided", () => {
			const messageWithNumericTaskId = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Hello world",
				taskId: 123, // Invalid: should be string
			}

			const result = clineMessageSchema.safeParse(messageWithNumericTaskId)
			expect(result.success).toBe(false)
		})

		it("should reject invalid taskId types", () => {
			const invalidTypes = [
				123, // number
				true, // boolean
				null, // null
				{ id: "task-123" }, // object
				["task-123"], // array
				Symbol("task"), // symbol
			]

			invalidTypes.forEach((invalidTaskId) => {
				const message = {
					ts: Date.now(),
					type: "say" as const,
					say: "text" as const,
					text: "Hello world",
					taskId: invalidTaskId,
				}

				const result = clineMessageSchema.safeParse(message)
				expect(result.success).toBe(false)
			})
		})

		it("should accept empty string as valid taskId", () => {
			const messageWithEmptyTaskId = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Hello world",
				taskId: "",
			}

			const result = clineMessageSchema.safeParse(messageWithEmptyTaskId)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.taskId).toBe("")
			}
		})

		it("should accept taskId with special characters and unicode", () => {
			const specialTaskId = "task-123_456.test@domain.com!#$%^&*()-α-β-γ-🚀"
			const message = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Hello world",
				taskId: specialTaskId,
			}

			const result = clineMessageSchema.safeParse(message)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.taskId).toBe(specialTaskId)
			}
		})
	})

	describe("message type combinations", () => {
		it("should work with ask messages and taskId", () => {
			const askMessage = {
				ts: Date.now(),
				type: "ask" as const,
				ask: "command" as const,
				text: "Execute this command?",
				taskId: "ask-task-456",
			}

			const result = clineMessageSchema.safeParse(askMessage)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.taskId).toBe("ask-task-456")
				expect(result.data.ask).toBe("command")
			}
		})

		it("should work with say messages and taskId", () => {
			const sayMessage = {
				ts: Date.now(),
				type: "say" as const,
				say: "completion_result" as const,
				text: "Task completed successfully",
				taskId: "say-task-789",
			}

			const result = clineMessageSchema.safeParse(sayMessage)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.taskId).toBe("say-task-789")
				expect(result.data.say).toBe("completion_result")
			}
		})
	})

	describe("optional fields compatibility", () => {
		it("should work with all optional fields including taskId", () => {
			const fullMessage = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Complete message with all fields",
				taskId: "full-message-task",
				images: ["screenshot.png"],
				partial: false,
				reasoning: "This is the reasoning behind the message",
				conversationHistoryIndex: 10,
				checkpoint: { state: "saved" },
				progressStatus: { icon: "✓", text: "Complete" },
				contextCondense: {
					cost: 0.005,
					prevContextTokens: 2000,
					newContextTokens: 1000,
					summary: "Context was condensed",
				},
				isProtected: true,
			}

			const result = clineMessageSchema.safeParse(fullMessage)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.taskId).toBe("full-message-task")
				expect(result.data.text).toBe("Complete message with all fields")
				expect(result.data.images).toEqual(["screenshot.png"])
				expect(result.data.partial).toBe(false)
				expect(result.data.reasoning).toBe("This is the reasoning behind the message")
				expect(result.data.isProtected).toBe(true)
			}
		})

		it("should maintain field independence - taskId doesn't affect other validations", () => {
			const messageWithMissingType = {
				ts: Date.now(),
				say: "text" as const,
				text: "Missing type field",
				taskId: "valid-task-id",
				// Missing required 'type' field
			}

			const result = clineMessageSchema.safeParse(messageWithMissingType)
			expect(result.success).toBe(false)
		})
	})

	describe("TypeScript type compatibility", () => {
		it("should maintain correct TypeScript types for ClineMessage with taskId", () => {
			const message: ClineMessage = {
				ts: Date.now(),
				type: "say",
				say: "text",
				text: "Type test message",
			}

			// Should allow string assignment
			message.taskId = "typescript-test-123"
			expect(message.taskId).toBe("typescript-test-123")

			// Should allow undefined assignment
			message.taskId = undefined
			expect(message.taskId).toBeUndefined()

			// TypeScript should enforce the optional string type
			const typedMessage: ClineMessage = {
				ts: Date.now(),
				type: "ask",
				ask: "tool",
				text: "Tool request",
				taskId: "typed-task-id", // Should compile fine
			}

			expect(typeof typedMessage.taskId).toBe("string")
		})
	})

	describe("edge cases", () => {
		it("should handle very long taskId strings", () => {
			const longTaskId = "x".repeat(10000) // Very long string
			const message = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Long taskId test",
				taskId: longTaskId,
			}

			const result = clineMessageSchema.safeParse(message)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.taskId).toBe(longTaskId)
				expect(result.data.taskId?.length).toBe(10000)
			}
		})

		it("should handle taskId with whitespace and newlines", () => {
			const whitespaceTaskId = "  \n\t task with whitespace \r\n  "
			const message = {
				ts: Date.now(),
				type: "say" as const,
				say: "text" as const,
				text: "Whitespace taskId test",
				taskId: whitespaceTaskId,
			}

			const result = clineMessageSchema.safeParse(message)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.data.taskId).toBe(whitespaceTaskId)
			}
		})
	})
})
