import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { ClineProvider } from "../ClineProvider"
import { Task } from "../../task/Task"
import { ContextProxy } from "../../config/ContextProxy"
import type * as vscode from "vscode"

// Mock vscode with proper tabGroups mock
vi.mock("vscode", () => ({
	ExtensionMode: {
		Development: "development",
		Production: "production",
		Test: "test",
	},
	Uri: {
		file: vi.fn((path: string) => ({ fsPath: path, scheme: "file", path })),
		parse: vi.fn((uri: string) => ({ fsPath: uri, scheme: "file", path: uri })),
	},
	workspace: {
		getConfiguration: vi.fn(() => ({
			get: vi.fn(() => []),
		})),
		onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
	},
	commands: {
		executeCommand: vi.fn(),
	},
	window: {
		showErrorMessage: vi.fn(),
		showInformationMessage: vi.fn(),
		showWarningMessage: vi.fn(),
		tabGroups: {
			all: [],
			onDidChangeTabs: vi.fn(() => ({ dispose: vi.fn() })),
			onDidChangeTabGroups: vi.fn(() => ({ dispose: vi.fn() })),
		},
	},
	env: {
		machineId: "test-machine-id",
		language: "en",
		uriScheme: "vscode",
		appName: "Visual Studio Code",
	},
	version: "1.80.0",
}))

// Mock other dependencies
vi.mock("../../task/Task")
vi.mock("../../config/ContextProxy")
vi.mock("../../../services/marketplace/MarketplaceManager")
vi.mock("../../../services/mcp/McpServerManager")
vi.mock("delay", () => ({ default: vi.fn(() => Promise.resolve()) }))
vi.mock("p-wait-for", () => ({ default: vi.fn(() => Promise.resolve()) }))

describe("ClineProvider Monitoring", () => {
	let provider: ClineProvider
	let mockContext: vscode.ExtensionContext
	let mockOutputChannel: vscode.OutputChannel
	let mockContextProxy: ContextProxy
	let mockTask: Task

	beforeEach(() => {
		// Create mocks
		mockContext = {
			subscriptions: [],
			globalStorageUri: { fsPath: "/test/storage" },
			extension: { packageJSON: { version: "1.0.0" } },
		} as any

		mockOutputChannel = {
			appendLine: vi.fn(),
			dispose: vi.fn(),
		} as any

		mockContextProxy = {
			extensionUri: { fsPath: "/test/extension" },
			extensionMode: 1, // Development
			globalStorageUri: { fsPath: "/test/storage" },
			getValues: vi.fn(() => ({})),
			getValue: vi.fn(),
			setValue: vi.fn(),
			setValues: vi.fn(),
			getProviderSettings: vi.fn(() => ({ apiProvider: "anthropic" })),
			setProviderSettings: vi.fn(),
			resetAllState: vi.fn(),
		} as any

		mockTask = {
			taskId: "test-task-1",
			instanceId: "test-instance-1",
			parentTask: undefined,
			isParallel: false,
			clineMessages: [],
			hasAskResponse: false,
			abortTask: vi.fn(),
			once: vi.fn(),
			emit: vi.fn(),
		} as any

		// Create provider instance
		provider = new ClineProvider(mockContext, mockOutputChannel, "sidebar", mockContextProxy)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe("Health Check System", () => {
		beforeEach(() => {
			vi.useFakeTimers()
		})

		afterEach(() => {
			vi.useRealTimers()
		})

		it("should start health check monitoring on initialization", () => {
			const logSpy = vi.spyOn(provider, "log")

			// Fast-forward time to trigger first health check
			vi.advanceTimersByTime(30000)

			// Should not log anything initially as there are no tasks or metrics
			expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining("[HealthCheck] WARNING:"))
		})

		it("should detect orphaned tasks in registry", async () => {
			const logSpy = vi.spyOn(provider, "log")

			// Register a task but don't add it to stack or set (making it orphaned)
			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask)

			// Fast-forward time to trigger health check
			vi.advanceTimersByTime(30000)

			expect(logSpy).toHaveBeenCalledWith("[HealthCheck] WARNING: Orphaned task found: test-task-1")
		})

		it("should detect stuck asks in queue", async () => {
			const logSpy = vi.spyOn(provider, "log")
			const oldTimestamp = Date.now() - 120000 // 2 minutes ago

			// Add an old ask to the queue
			// @ts-ignore - accessing private property for testing
			provider.askSet.set("test-task-1", { task: mockTask, timestamp: oldTimestamp })

			// Fast-forward time to trigger health check
			vi.advanceTimersByTime(30000)

			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("[HealthCheck] WARNING: Ask pending for"))
		})

		it("should log metrics when available", async () => {
			const logSpy = vi.spyOn(provider, "log")

			// Add some metrics
			// @ts-ignore - accessing private method for testing
			provider.updateAskMetrics(1000, false)

			// Fast-forward time to trigger health check
			vi.advanceTimersByTime(30000)

			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("[AskMetrics] Total: 1"))
		})

		it("should clean up health check interval on dispose", async () => {
			const clearIntervalSpy = vi.spyOn(global, "clearInterval")

			await provider.dispose()

			// Should have cleaned up the interval
			expect(clearIntervalSpy).toHaveBeenCalled()
		})
	})

	describe("Ask Queue Processing", () => {
		it("should process asks sequentially", async () => {
			const task1 = { ...mockTask, taskId: "task-1" } as any
			const task2 = { ...mockTask, taskId: "task-2" } as any

			// Mock the wait function to resolve immediately
			vi.spyOn(provider as any, "waitForAskToComplete").mockResolvedValue(false)

			await provider.addAskRequest(task1)
			await provider.addAskRequest(task2)

			// Wait for async processing
			await new Promise((resolve) => setImmediate(resolve))

			expect(provider.getAskQueueStatus().askSetSize).toBe(0)
		})

		it("should handle task disposal during processing", async () => {
			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask)

			await provider.addAskRequest(mockTask)

			// Simulate task disposal
			// @ts-ignore - accessing private method for testing
			provider.unregisterTask("test-task-1")

			// Wait for async processing
			await new Promise((resolve) => setImmediate(resolve))

			expect(provider.getAskQueueStatus().askSetSize).toBe(0)
		})

		it("should track processing metrics", async () => {
			const mockWaitTime = 1500
			vi.spyOn(provider as any, "waitForAskToComplete").mockResolvedValue(false)
			vi.spyOn(Date, "now")
				.mockReturnValueOnce(1000) // Start time
				.mockReturnValueOnce(1000 + mockWaitTime) // End time

			await provider.addAskRequest(mockTask)

			// Wait for async processing
			await new Promise((resolve) => setImmediate(resolve))

			const metrics = provider.getTaskMetrics()
			expect(metrics.totalAsks).toBe(1)
		})

		it("should handle errors during ask processing", async () => {
			const logSpy = vi.spyOn(provider, "log")
			vi.spyOn(provider, "postStateToWebview").mockRejectedValue(new Error("Test error"))

			await provider.addAskRequest(mockTask)

			// Wait for async processing
			await new Promise((resolve) => setImmediate(resolve))

			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Error processing ask for task test-task-1"))
		})
	})

	describe("Task Lifecycle Monitoring", () => {
		it("should track task registration in metrics", () => {
			const initialCount = provider.getAllActiveTasks().length

			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask)

			expect(provider.getAllActiveTasks().length).toBe(initialCount + 1)
		})

		it("should track task unregistration in metrics", () => {
			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask)
			const afterRegister = provider.getAllActiveTasks().length

			// @ts-ignore - accessing private method for testing
			provider.unregisterTask("test-task-1")

			expect(provider.getAllActiveTasks().length).toBe(afterRegister - 1)
		})

		it("should clean up task references on disposal", async () => {
			const mockTask2 = { ...mockTask, taskId: "task-2" } as any

			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask)
			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask2)

			await provider.dispose()

			// All tasks should be cleaned up
			expect(provider.getAllActiveTasks().length).toBe(0)
		})
	})

	describe("Performance Metrics", () => {
		it("should calculate average processing time correctly", () => {
			// @ts-ignore - accessing private method for testing
			provider.updateAskMetrics(1000, false)
			// @ts-ignore - accessing private method for testing
			provider.updateAskMetrics(2000, false)
			// @ts-ignore - accessing private method for testing
			provider.updateAskMetrics(3000, false)

			const metrics = provider.getTaskMetrics()
			expect(metrics.avgProcessingTime).toBe(2000)
		})

		it("should track maximum processing time", () => {
			// @ts-ignore - accessing private method for testing
			provider.updateAskMetrics(1000, false)
			// @ts-ignore - accessing private method for testing
			provider.updateAskMetrics(5000, false)
			// @ts-ignore - accessing private method for testing
			provider.updateAskMetrics(2000, false)

			const metrics = provider.getTaskMetrics()
			expect(metrics.maxProcessingTime).toBe(5000)
		})

		it("should count timeout occurrences", () => {
			// @ts-ignore - accessing private method for testing
			provider.updateAskMetrics(1000, false)
			// @ts-ignore - accessing private method for testing
			provider.updateAskMetrics(5000, true) // timeout
			// @ts-ignore - accessing private method for testing
			provider.updateAskMetrics(2000, true) // timeout

			const metrics = provider.getTaskMetrics()
			expect(metrics.timeouts).toBe(2)
		})

		it("should provide accurate ask queue status", async () => {
			const timestamp = Date.now()
			vi.spyOn(Date, "now").mockReturnValue(timestamp)

			await provider.addAskRequest(mockTask)

			const status = provider.getAskQueueStatus()
			expect(status.askSetSize).toBe(1)
			expect(status.processingCount).toBe(0)
			expect(status.askSetTasks[0]).toMatchObject({
				taskId: "test-task-1",
				timestamp,
				waitTime: 0,
			})
		})
	})

	describe("Diagnostic Information", () => {
		it("should provide comprehensive task registry diagnostics", () => {
			const logSpy = vi.spyOn(provider, "log")

			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask)

			provider.logTaskRegistry()

			expect(logSpy).toHaveBeenCalledWith("[TaskRegistry] Active tasks: 1")
			expect(logSpy).toHaveBeenCalledWith("[TaskRegistry] Stack tasks: 0")
			expect(logSpy).toHaveBeenCalledWith("[TaskRegistry] Set tasks: 0")
			expect(logSpy).toHaveBeenCalledWith("[TaskRegistry] Ask queue: 0")
		})

		it("should provide detailed debug information when enabled", () => {
			const originalEnv = process.env.DEBUG_TASK_REGISTRY
			process.env.DEBUG_TASK_REGISTRY = "true"

			const logSpy = vi.spyOn(provider, "log")

			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask)

			provider.logTaskRegistry()

			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Task test-task-1: hasPendingAsk="))

			process.env.DEBUG_TASK_REGISTRY = originalEnv
		})

		it("should handle stack and set diagnostics correctly", async () => {
			const parallelTask = { ...mockTask, taskId: "parallel-task", isParallel: true } as any
			vi.mocked(mockContextProxy.getValues).mockReturnValue({ mode: "code" })

			// Add tasks to different collections
			await provider.addClineToStack(mockTask)
			await provider.addClineToSet(parallelTask)

			const logSpy = vi.spyOn(provider, "log")
			provider.logTaskRegistry()

			expect(logSpy).toHaveBeenCalledWith("[TaskRegistry] Stack tasks: 1")
			expect(logSpy).toHaveBeenCalledWith("[TaskRegistry] Set tasks: 1")
		})
	})

	describe("Error Handling in Monitoring", () => {
		it("should handle task disposal errors gracefully", async () => {
			const errorTask = {
				...mockTask,
				abortTask: vi.fn().mockRejectedValue(new Error("Abort failed")),
			} as any

			// @ts-ignore - accessing private method for testing
			provider.registerTask(errorTask)

			// Should not throw when disposing task with errors
			// @ts-ignore - accessing protected method for testing
			await expect(provider.removeClineFromSet(errorTask)).resolves.not.toThrow()
		})

		it("should continue monitoring after individual task errors", async () => {
			const logSpy = vi.spyOn(provider, "log")
			const errorTask = {
				...mockTask,
				abortTask: vi.fn().mockRejectedValue(new Error("Task error")),
			} as any

			// @ts-ignore - accessing private method for testing
			provider.registerTask(errorTask)

			await provider.dispose()

			// Should log that dispose completed despite errors
			expect(logSpy).toHaveBeenCalledWith("Disposed all disposables")
		})

		it("should handle malformed ask queue entries", () => {
			// @ts-ignore - accessing private property for testing
			provider.askSet.set("invalid-task", { task: null, timestamp: Date.now() } as any)

			// Should not crash when processing
			expect(() => provider.getAskQueueStatus()).not.toThrow()
		})
	})

	describe("Concurrency Safety", () => {
		it("should handle concurrent ask queue operations", async () => {
			const task1 = { ...mockTask, taskId: "task-1" } as any
			const task2 = { ...mockTask, taskId: "task-2" } as any

			// Start multiple operations concurrently
			const promises = [
				provider.addAskRequest(task1),
				provider.addAskRequest(task2),
				provider.removeFromAskSet("task-1"),
			]

			await Promise.all(promises)

			// Should handle concurrency without corruption
			const status = provider.getAskQueueStatus()
			expect(status.askSetSize).toBeLessThanOrEqual(2)
		})

		it("should maintain registry consistency under concurrent access", () => {
			const task1 = { ...mockTask, taskId: "task-1" } as any
			const task2 = { ...mockTask, taskId: "task-2" } as any

			// Perform operations concurrently
			// @ts-ignore - accessing private method for testing
			provider.registerTask(task1)
			// @ts-ignore - accessing private method for testing
			provider.registerTask(task2)
			// @ts-ignore - accessing private method for testing
			provider.unregisterTask("task-1")

			// Registry should remain consistent
			expect(provider.findTaskById("task-1")).toBeUndefined()
			expect(provider.findTaskById("task-2")).toBe(task2)
		})
	})
})
