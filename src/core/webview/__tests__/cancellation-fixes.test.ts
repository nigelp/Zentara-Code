import { describe, it, expect, vi, beforeEach } from "vitest"
import { webviewMessageHandler } from "../webviewMessageHandler"

// Mock dependencies
const mockProvider = {
	findTaskById: vi.fn(),
	cancelTask: vi.fn(),
	log: vi.fn(),
	postMessageToWebview: vi.fn(),
}

const mockTask = {
	abortTask: vi.fn(),
}

const mockContext = {} as any

describe("Cancellation Fixes", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// Reset promise resolutions to prevent hanging
		mockTask.abortTask.mockResolvedValue(undefined)
		mockProvider.cancelTask.mockResolvedValue(undefined)
	})

	describe("Non-blocking cancellation", () => {
		it("should not await task cancellation to prevent UI freeze", async () => {
			mockProvider.findTaskById.mockReturnValue(mockTask)

			const message = {
				type: "cancelTask" as const,
				taskId: "test-task-id",
			}

			// This should complete immediately without waiting for task.abortTask()
			const startTime = Date.now()
			await webviewMessageHandler(mockProvider as any, message)
			const endTime = Date.now()

			// Should complete within 100ms (immediate, not waiting for async operations)
			expect(endTime - startTime).toBeLessThan(100)

			// Should have called abortTask but not awaited it
			expect(mockTask.abortTask).toHaveBeenCalledTimes(1)
			expect(mockProvider.findTaskById).toHaveBeenCalledWith("test-task-id")
		})

		it("should handle task not found gracefully without blocking", async () => {
			mockProvider.findTaskById.mockReturnValue(null)

			const message = {
				type: "cancelTask" as const,
				taskId: "non-existent-task",
			}

			const startTime = Date.now()
			await webviewMessageHandler(mockProvider as any, message)
			const endTime = Date.now()

			// Should complete immediately
			expect(endTime - startTime).toBeLessThan(100)

			// Should fall back to provider.cancelTask() but not await it
			expect(mockProvider.cancelTask).toHaveBeenCalledTimes(1)
			expect(mockProvider.log).toHaveBeenCalledWith(
				expect.stringContaining("Warning: cancelTask received for unknown task ID"),
			)
		})

		it("should handle backward compatibility cancellation without blocking", async () => {
			const message = {
				type: "cancelTask" as const,
				// No taskId for backward compatibility
			}

			const startTime = Date.now()
			await webviewMessageHandler(mockProvider as any, message)
			const endTime = Date.now()

			// Should complete immediately
			expect(endTime - startTime).toBeLessThan(100)

			// Should call provider.cancelTask() but not await it
			expect(mockProvider.cancelTask).toHaveBeenCalledTimes(1)
		})

		it("should handle cancellation errors gracefully", async () => {
			const errorTask = {
				abortTask: vi.fn().mockRejectedValue(new Error("Cancellation failed")),
			}
			mockProvider.findTaskById.mockReturnValue(errorTask)

			const message = {
				type: "cancelTask" as const,
				taskId: "error-task-id",
			}

			// Should not throw even if abortTask fails
			await expect(webviewMessageHandler(mockProvider as any, message)).resolves.not.toThrow()

			expect(errorTask.abortTask).toHaveBeenCalledTimes(1)
		})
	})

	describe("Error logging", () => {
		it("should log cancellation errors without breaking flow", async () => {
			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

			const errorTask = {
				abortTask: vi.fn().mockRejectedValue(new Error("Test error")),
			}
			mockProvider.findTaskById.mockReturnValue(errorTask)

			const message = {
				type: "cancelTask" as const,
				taskId: "error-task-id",
			}

			await webviewMessageHandler(mockProvider as any, message)

			// Give async operations time to complete
			await new Promise((resolve) => setTimeout(resolve, 10))

			expect(mockProvider.log).toHaveBeenCalledWith(expect.stringContaining("Error during task cancellation"))
			expect(consoleErrorSpy).toHaveBeenCalledWith("[CANCEL_ERROR] Task abort failed:", expect.any(Error))

			consoleErrorSpy.mockRestore()
		})
	})
})
