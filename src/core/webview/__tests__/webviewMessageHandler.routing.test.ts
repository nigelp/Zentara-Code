import { describe, it, expect, vi, beforeEach } from "vitest"
import { webviewMessageHandler } from "../webviewMessageHandler"
import { ClineProvider } from "../ClineProvider"
import { Task } from "../../task/Task"
import { ClineAskResponse } from "../../../shared/WebviewMessage"

// Mock the Task class
vi.mock("../../task/Task", () => ({
	Task: vi.fn().mockImplementation(() => ({
		handleWebviewAskResponse: vi.fn(),
		abortTask: vi.fn(),
		taskId: "mock-task-id",
	})),
}))

describe("webviewMessageHandler - askResponse and cancelTask routing", () => {
	let mockProvider: ClineProvider
	let mockTask1: Task
	let mockTask2: Task
	let mockCurrentTask: Task

	beforeEach(() => {
		// Create mock tasks
		mockTask1 = {
			handleWebviewAskResponse: vi.fn(),
			abortTask: vi.fn(),
			taskId: "task-1",
		} as unknown as Task

		mockTask2 = {
			handleWebviewAskResponse: vi.fn(),
			abortTask: vi.fn(),
			taskId: "task-2",
		} as unknown as Task

		mockCurrentTask = {
			handleWebviewAskResponse: vi.fn(),
			abortTask: vi.fn(),
			taskId: "current-task",
		} as unknown as Task

		// Create mock provider
		mockProvider = {
			findTaskById: vi.fn(),
			getCurrentCline: vi.fn(),
			cancelTask: vi.fn(),
			log: vi.fn(),
		} as unknown as ClineProvider

		// Clear all mocks
		vi.clearAllMocks()
	})

	describe("askResponse routing", () => {
		it("should route askResponse to correct task when taskId provided", async () => {
			// Arrange
			const taskId = "task-1"
			const askResponse: ClineAskResponse = "yesButtonClicked"
			const text = "Test response text"
			const images = ["image1.png", "image2.png"]

			mockProvider.findTaskById = vi.fn().mockReturnValue(mockTask1)

			// Act
			await webviewMessageHandler(mockProvider, {
				type: "askResponse",
				taskId,
				askResponse,
				text,
				images,
			})

			// Assert
			expect(mockProvider.findTaskById).toHaveBeenCalledWith(taskId)
			expect(mockTask1.handleWebviewAskResponse).toHaveBeenCalledWith(askResponse, text, images)
			expect(mockProvider.getCurrentCline).not.toHaveBeenCalled()
		})

		it("should fall back to getCurrentCline when no taskId provided (backward compatibility)", async () => {
			// Arrange
			const askResponse: ClineAskResponse = "noButtonClicked"
			const text = "Test response text"
			const images = ["image1.png"]

			mockProvider.getCurrentCline = vi.fn().mockReturnValue(mockCurrentTask)

			// Act
			await webviewMessageHandler(mockProvider, {
				type: "askResponse",
				askResponse,
				text,
				images,
			})

			// Assert
			expect(mockProvider.findTaskById).not.toHaveBeenCalled()
			expect(mockProvider.getCurrentCline).toHaveBeenCalled()
			expect(mockCurrentTask.handleWebviewAskResponse).toHaveBeenCalledWith(askResponse, text, images)
		})

		it("should log warning when taskId provided but task not found", async () => {
			// Arrange
			const taskId = "unknown-task-id"
			const askResponse: ClineAskResponse = "messageResponse"

			mockProvider.findTaskById = vi.fn().mockReturnValue(undefined)

			// Act
			await webviewMessageHandler(mockProvider, {
				type: "askResponse",
				taskId,
				askResponse,
			})

			// Assert
			expect(mockProvider.findTaskById).toHaveBeenCalledWith(taskId)
			expect(mockProvider.log).toHaveBeenCalledWith(
				`Warning: askResponse received for unknown task ID: ${taskId}`,
			)
		})

		it("should log error when no task found (neither by ID nor current)", async () => {
			// Arrange
			const askResponse: ClineAskResponse = "objectResponse"

			mockProvider.getCurrentCline = vi.fn().mockReturnValue(undefined)

			// Act
			await webviewMessageHandler(mockProvider, {
				type: "askResponse",
				askResponse,
			})

			// Assert
			expect(mockProvider.getCurrentCline).toHaveBeenCalled()
			expect(mockProvider.log).toHaveBeenCalledWith("Error: No task found to handle askResponse")
		})

		it("should handle askResponse with taskId but fallback when task not found", async () => {
			// Arrange
			const taskId = "unknown-task-id"
			const askResponse: ClineAskResponse = "yesButtonClicked"
			const text = "Test response"

			mockProvider.findTaskById = vi.fn().mockReturnValue(undefined)
			mockProvider.getCurrentCline = vi.fn().mockReturnValue(mockCurrentTask)

			// Act
			await webviewMessageHandler(mockProvider, {
				type: "askResponse",
				taskId,
				askResponse,
				text,
			})

			// Assert
			expect(mockProvider.findTaskById).toHaveBeenCalledWith(taskId)
			expect(mockProvider.log).toHaveBeenCalledWith(
				`Warning: askResponse received for unknown task ID: ${taskId}`,
			)
			// Should not call handleWebviewAskResponse on any task since target task wasn't found
			expect(mockCurrentTask.handleWebviewAskResponse).not.toHaveBeenCalled()
		})

		it("should handle askResponse without text and images", async () => {
			// Arrange
			const taskId = "task-2"
			const askResponse: ClineAskResponse = "noButtonClicked"

			mockProvider.findTaskById = vi.fn().mockReturnValue(mockTask2)

			// Act
			await webviewMessageHandler(mockProvider, {
				type: "askResponse",
				taskId,
				askResponse,
			})

			// Assert
			expect(mockProvider.findTaskById).toHaveBeenCalledWith(taskId)
			expect(mockTask2.handleWebviewAskResponse).toHaveBeenCalledWith(askResponse, undefined, undefined)
		})
	})

	describe("cancelTask routing", () => {
		it("should cancel specific task when taskId provided", async () => {
			// Arrange
			const taskId = "task-1"

			mockProvider.findTaskById = vi.fn().mockReturnValue(mockTask1)

			// Act
			await webviewMessageHandler(mockProvider, {
				type: "cancelTask",
				taskId,
			})

			// Assert
			expect(mockProvider.findTaskById).toHaveBeenCalledWith(taskId)
			expect(mockTask1.abortTask).toHaveBeenCalled()
			expect(mockProvider.cancelTask).not.toHaveBeenCalled()
		})

		it("should use provider.cancelTask when no taskId provided (backward compatibility)", async () => {
			// Act
			await webviewMessageHandler(mockProvider, {
				type: "cancelTask",
			})

			// Assert
			expect(mockProvider.findTaskById).not.toHaveBeenCalled()
			expect(mockProvider.cancelTask).toHaveBeenCalled()
		})

		it("should log warning when taskId provided but task not found", async () => {
			// Arrange
			const taskId = "unknown-task-id"

			mockProvider.findTaskById = vi.fn().mockReturnValue(undefined)

			// Act
			await webviewMessageHandler(mockProvider, {
				type: "cancelTask",
				taskId,
			})

			// Assert
			expect(mockProvider.findTaskById).toHaveBeenCalledWith(taskId)
			expect(mockProvider.log).toHaveBeenCalledWith(`Warning: cancelTask received for unknown task ID: ${taskId}`)
			expect(mockProvider.cancelTask).not.toHaveBeenCalled()
		})

		it("should handle cancelTask with empty taskId as no taskId", async () => {
			// Act
			await webviewMessageHandler(mockProvider, {
				type: "cancelTask",
				taskId: "",
			})

			// Assert
			expect(mockProvider.findTaskById).not.toHaveBeenCalled()
			expect(mockProvider.cancelTask).toHaveBeenCalled()
		})

		it("should handle cancelTask with undefined taskId", async () => {
			// Act
			await webviewMessageHandler(mockProvider, {
				type: "cancelTask",
				taskId: undefined,
			})

			// Assert
			expect(mockProvider.findTaskById).not.toHaveBeenCalled()
			expect(mockProvider.cancelTask).toHaveBeenCalled()
		})
	})

	describe("edge cases and error handling", () => {
		it("should handle askResponse when target task exists but handleWebviewAskResponse throws", async () => {
			// Arrange
			const taskId = "task-1"
			const askResponse: ClineAskResponse = "yesButtonClicked"
			const error = new Error("Handler failed")

			mockProvider.findTaskById = vi.fn().mockReturnValue(mockTask1)
			mockTask1.handleWebviewAskResponse = vi.fn().mockRejectedValue(error)

			// Act & Assert
			await expect(
				webviewMessageHandler(mockProvider, {
					type: "askResponse",
					taskId,
					askResponse,
				}),
			).rejects.toThrow("Handler failed")

			expect(mockProvider.findTaskById).toHaveBeenCalledWith(taskId)
			expect(mockTask1.handleWebviewAskResponse).toHaveBeenCalledWith(askResponse, undefined, undefined)
		})

		it("should handle cancelTask when target task exists but abortTask throws", async () => {
			// Arrange
			const taskId = "task-1"
			const error = new Error("Abort failed")

			mockProvider.findTaskById = vi.fn().mockReturnValue(mockTask1)
			mockTask1.abortTask = vi.fn().mockRejectedValue(error)

			// Act & Assert
			await expect(
				webviewMessageHandler(mockProvider, {
					type: "cancelTask",
					taskId,
				}),
			).rejects.toThrow("Abort failed")

			expect(mockProvider.findTaskById).toHaveBeenCalledWith(taskId)
			expect(mockTask1.abortTask).toHaveBeenCalled()
		})

		it("should handle provider.cancelTask throwing error", async () => {
			// Arrange
			const error = new Error("Provider cancel failed")
			mockProvider.cancelTask = vi.fn().mockRejectedValue(error)

			// Act & Assert
			await expect(
				webviewMessageHandler(mockProvider, {
					type: "cancelTask",
				}),
			).rejects.toThrow("Provider cancel failed")

			expect(mockProvider.cancelTask).toHaveBeenCalled()
		})

		it("should handle findTaskById method throwing error", async () => {
			// Arrange
			const taskId = "task-1"
			const error = new Error("Find task failed")

			mockProvider.findTaskById = vi.fn().mockImplementation(() => {
				throw error
			})

			// Act & Assert
			await expect(
				webviewMessageHandler(mockProvider, {
					type: "askResponse",
					taskId,
					askResponse: "yesButtonClicked",
				}),
			).rejects.toThrow("Find task failed")

			expect(mockProvider.findTaskById).toHaveBeenCalledWith(taskId)
		})

		it("should handle getCurrentCline method throwing error", async () => {
			// Arrange
			const error = new Error("Get current task failed")

			mockProvider.getCurrentCline = vi.fn().mockImplementation(() => {
				throw error
			})

			// Act & Assert
			await expect(
				webviewMessageHandler(mockProvider, {
					type: "askResponse",
					askResponse: "noButtonClicked",
				}),
			).rejects.toThrow("Get current task failed")

			expect(mockProvider.getCurrentCline).toHaveBeenCalled()
		})
	})

	describe("askResponse types", () => {
		it.each([
			"yesButtonClicked" as ClineAskResponse,
			"noButtonClicked" as ClineAskResponse,
			"messageResponse" as ClineAskResponse,
			"objectResponse" as ClineAskResponse,
		])("should handle askResponse type: %s", async (askResponse) => {
			// Arrange
			const taskId = "task-1"
			mockProvider.findTaskById = vi.fn().mockReturnValue(mockTask1)

			// Act
			await webviewMessageHandler(mockProvider, {
				type: "askResponse",
				taskId,
				askResponse,
			})

			// Assert
			expect(mockTask1.handleWebviewAskResponse).toHaveBeenCalledWith(askResponse, undefined, undefined)
		})
	})

	describe("integration scenarios", () => {
		it("should handle multiple askResponse calls to different tasks", async () => {
			// Arrange
			mockProvider.findTaskById = vi.fn().mockReturnValueOnce(mockTask1).mockReturnValueOnce(mockTask2)

			// Act
			await webviewMessageHandler(mockProvider, {
				type: "askResponse",
				taskId: "task-1",
				askResponse: "yesButtonClicked",
				text: "Response 1",
			})

			await webviewMessageHandler(mockProvider, {
				type: "askResponse",
				taskId: "task-2",
				askResponse: "noButtonClicked",
				text: "Response 2",
			})

			// Assert
			expect(mockProvider.findTaskById).toHaveBeenNthCalledWith(1, "task-1")
			expect(mockProvider.findTaskById).toHaveBeenNthCalledWith(2, "task-2")
			expect(mockTask1.handleWebviewAskResponse).toHaveBeenCalledWith("yesButtonClicked", "Response 1", undefined)
			expect(mockTask2.handleWebviewAskResponse).toHaveBeenCalledWith("noButtonClicked", "Response 2", undefined)
		})

		it("should handle multiple cancelTask calls to different tasks", async () => {
			// Arrange
			mockProvider.findTaskById = vi.fn().mockReturnValueOnce(mockTask1).mockReturnValueOnce(mockTask2)

			// Act
			await webviewMessageHandler(mockProvider, {
				type: "cancelTask",
				taskId: "task-1",
			})

			await webviewMessageHandler(mockProvider, {
				type: "cancelTask",
				taskId: "task-2",
			})

			// Assert
			expect(mockProvider.findTaskById).toHaveBeenNthCalledWith(1, "task-1")
			expect(mockProvider.findTaskById).toHaveBeenNthCalledWith(2, "task-2")
			expect(mockTask1.abortTask).toHaveBeenCalled()
			expect(mockTask2.abortTask).toHaveBeenCalled()
		})

		it("should handle mixed askResponse and cancelTask calls", async () => {
			// Arrange
			mockProvider.findTaskById = vi.fn().mockReturnValueOnce(mockTask1).mockReturnValueOnce(mockTask2)

			// Act
			await webviewMessageHandler(mockProvider, {
				type: "askResponse",
				taskId: "task-1",
				askResponse: "messageResponse",
				text: "User input",
			})

			await webviewMessageHandler(mockProvider, {
				type: "cancelTask",
				taskId: "task-2",
			})

			// Assert
			expect(mockProvider.findTaskById).toHaveBeenNthCalledWith(1, "task-1")
			expect(mockProvider.findTaskById).toHaveBeenNthCalledWith(2, "task-2")
			expect(mockTask1.handleWebviewAskResponse).toHaveBeenCalledWith("messageResponse", "User input", undefined)
			expect(mockTask2.abortTask).toHaveBeenCalled()
		})
	})
})
