import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from "vitest"
import { ClineProvider } from "../ClineProvider"
import { Task } from "../../task/Task"
import { ContextProxy } from "../../config/ContextProxy"
import type * as vscode from "vscode"

// Mock vscode
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

describe("ClineProvider Task Registry", () => {
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

	describe("Task Registration", () => {
		it("should register a task in the registry", () => {
			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask)

			const foundTask = provider.findTaskById("test-task-1")
			expect(foundTask).toBe(mockTask)
		})

		it("should track total registered tasks count", () => {
			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask)

			const allTasks = provider.getAllActiveTasks()
			expect(allTasks).toHaveLength(1)
			expect(allTasks[0]).toBe(mockTask)
		})

		it("should setup cleanup handler when registering task", () => {
			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask)

			expect(mockTask.once).toHaveBeenCalledWith("disposed", expect.any(Function))
		})

		it("should handle duplicate task registration", () => {
			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask)
			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask)

			const allTasks = provider.getAllActiveTasks()
			expect(allTasks).toHaveLength(1) // Should not duplicate
		})
	})

	describe("Task Unregistration", () => {
		beforeEach(() => {
			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask)
		})

		it("should unregister a task from the registry", () => {
			// @ts-ignore - accessing private method for testing
			provider.unregisterTask("test-task-1")

			const foundTask = provider.findTaskById("test-task-1")
			expect(foundTask).toBeUndefined()
		})

		it("should clean up event handlers when unregistering", () => {
			// @ts-ignore - accessing private method for testing
			provider.unregisterTask("test-task-1")

			const allTasks = provider.getAllActiveTasks()
			expect(allTasks).toHaveLength(0)
		})

		it("should remove task from ask set when unregistering", () => {
			// @ts-ignore - accessing private method for testing
			provider.askSet.set("test-task-1", { task: mockTask, timestamp: Date.now() })

			// @ts-ignore - accessing private method for testing
			provider.unregisterTask("test-task-1")

			// @ts-ignore - accessing private property for testing
			expect(provider.askSet.size).toBe(0)
		})

		it("should handle unregistering non-existent task", () => {
			// @ts-ignore - accessing private method for testing
			provider.unregisterTask("non-existent-task")

			// Should not throw error
			const allTasks = provider.getAllActiveTasks()
			expect(allTasks).toHaveLength(1) // Original task should remain
		})
	})

	describe("Task Lookup", () => {
		it("should find task by ID with O(1) lookup", () => {
			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask)

			const foundTask = provider.findTaskById("test-task-1")
			expect(foundTask).toBe(mockTask)
		})

		it("should return undefined for non-existent task", () => {
			const foundTask = provider.findTaskById("non-existent-task")
			expect(foundTask).toBeUndefined()
		})

		it("should get all active tasks", () => {
			const mockTask2 = {
				...mockTask,
				taskId: "test-task-2",
				instanceId: "test-instance-2",
			} as any

			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask)
			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask2)

			const allTasks = provider.getAllActiveTasks()
			expect(allTasks).toHaveLength(2)
			expect(allTasks).toContain(mockTask)
			expect(allTasks).toContain(mockTask2)
		})

		it("should return empty array when no tasks are registered", () => {
			const allTasks = provider.getAllActiveTasks()
			expect(allTasks).toHaveLength(0)
		})
	})

	describe("Task Stack Management", () => {
		it("should add task to stack", async () => {
			vi.mocked(mockContextProxy.getValues).mockReturnValue({ mode: "code" })

			await provider.addClineToStack(mockTask)

			expect(provider.getClineStackSize()).toBe(1)
			expect(provider.getCurrentCline()).toBe(mockTask)
		})

		it("should maintain LIFO order in stack", async () => {
			const mockTask2 = {
				...mockTask,
				taskId: "test-task-2",
				instanceId: "test-instance-2",
			} as any

			vi.mocked(mockContextProxy.getValues).mockReturnValue({ mode: "code" })

			await provider.addClineToStack(mockTask)
			await provider.addClineToStack(mockTask2)

			expect(provider.getClineStackSize()).toBe(2)
			expect(provider.getCurrentCline()).toBe(mockTask2) // Last added should be current
		})

		it("should remove task from stack", async () => {
			vi.mocked(mockContextProxy.getValues).mockReturnValue({ mode: "code" })
			await provider.addClineToStack(mockTask)

			await provider.removeClineFromStack()

			expect(provider.getClineStackSize()).toBe(0)
			expect(provider.getCurrentCline()).toBeUndefined()
		})

		it("should handle removing from empty stack", async () => {
			// Should not throw error
			await provider.removeClineFromStack()

			expect(provider.getClineStackSize()).toBe(0)
		})
	})

	describe("Task Set Management (Parallel)", () => {
		it("should add task to set for parallel execution", async () => {
			const parallelTask = { ...mockTask, isParallel: true } as any
			vi.mocked(mockContextProxy.getValues).mockReturnValue({ mode: "code" })

			await provider.addClineToSet(parallelTask)

			const allTasks = provider.getAllActiveTasks()
			expect(allTasks).toContain(parallelTask)
		})

		it("should remove specific task from set", async () => {
			const parallelTask = { ...mockTask, isParallel: true } as any
			vi.mocked(mockContextProxy.getValues).mockReturnValue({ mode: "code" })

			await provider.addClineToSet(parallelTask)
			// @ts-ignore - accessing protected method for testing
			await provider.removeClineFromSet(parallelTask)

			const foundTask = provider.findTaskById("test-task-1")
			expect(foundTask).toBeUndefined()
		})

		it("should remove all tasks from set", async () => {
			const parallelTask1 = { ...mockTask, isParallel: true } as any
			const parallelTask2 = { ...mockTask, taskId: "test-task-2", isParallel: true } as any
			vi.mocked(mockContextProxy.getValues).mockReturnValue({ mode: "code" })

			await provider.addClineToSet(parallelTask1)
			await provider.addClineToSet(parallelTask2)

			// @ts-ignore - accessing protected method for testing
			await provider.removeAllClinesFromSet()

			const allTasks = provider.getAllActiveTasks()
			expect(allTasks).toHaveLength(0)
		})
	})

	describe("Ask Queue Management", () => {
		it("should queue ask request", async () => {
			await provider.addAskRequest(mockTask)

			const queueStatus = provider.getAskQueueStatus()
			expect(queueStatus.askSetSize).toBe(1)
			expect(queueStatus.askSetTasks[0].taskId).toBe("test-task-1")
		})

		it("should prevent duplicate ask requests", async () => {
			await provider.addAskRequest(mockTask)
			await provider.addAskRequest(mockTask) // Duplicate

			const queueStatus = provider.getAskQueueStatus()
			expect(queueStatus.askSetSize).toBe(1)
		})

		it("should remove task from ask queue", () => {
			// @ts-ignore - accessing private method for testing
			provider.askSet.set("test-task-1", { task: mockTask, timestamp: Date.now() })

			provider.removeFromAskSet("test-task-1")

			const queueStatus = provider.getAskQueueStatus()
			expect(queueStatus.askSetSize).toBe(0)
		})

		it("should get ask queue status", async () => {
			await provider.addAskRequest(mockTask)

			const status = provider.getAskQueueStatus()
			expect(status).toHaveProperty("askSetSize", 1)
			expect(status).toHaveProperty("processingCount", 0)
			expect(status).toHaveProperty("queuedTasks")
			expect(status.queuedTasks[0]).toMatchObject({
				taskId: "test-task-1",
				timestamp: expect.any(Number),
				waitTime: expect.any(Number),
			})
		})
	})

	describe("Task Metrics", () => {
		it("should track ask processing metrics", () => {
			const metrics = provider.getTaskMetrics()
			expect(metrics).toHaveProperty("totalAsks", 0)
			expect(metrics).toHaveProperty("avgProcessingTime", 0)
			expect(metrics).toHaveProperty("maxProcessingTime", 0)
			expect(metrics).toHaveProperty("timeouts", 0)
		})

		it("should update metrics after processing", () => {
			// @ts-ignore - accessing private method for testing
			provider.updateAskMetrics(1000, false)

			const metrics = provider.getTaskMetrics()
			expect(metrics.totalAsks).toBe(1)
			expect(metrics.avgProcessingTime).toBe(1000)
			expect(metrics.maxProcessingTime).toBe(1000)
			expect(metrics.timeouts).toBe(0)
		})

		it("should track timeout metrics", () => {
			// @ts-ignore - accessing private method for testing
			provider.updateAskMetrics(5000, true)

			const metrics = provider.getTaskMetrics()
			expect(metrics.timeouts).toBe(1)
		})

		it("should calculate average processing time correctly", () => {
			// @ts-ignore - accessing private method for testing
			provider.updateAskMetrics(1000, false)
			// @ts-ignore - accessing private method for testing
			provider.updateAskMetrics(2000, false)

			const metrics = provider.getTaskMetrics()
			expect(metrics.avgProcessingTime).toBe(1500)
		})
	})

	describe("Health Check Monitoring", () => {
		beforeEach(() => {
			vi.useFakeTimers()
		})

		afterEach(() => {
			vi.useRealTimers()
		})

		it("should detect orphaned tasks", async () => {
			const logSpy = vi.spyOn(provider, "log")

			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask)
			// Task is in registry but not in stack or set (orphaned)

			// Fast-forward time to trigger health check
			vi.advanceTimersByTime(30000)

			expect(logSpy).toHaveBeenCalledWith(
				expect.stringContaining("[HealthCheck] WARNING: Orphaned task found: test-task-1"),
			)
		})

		it("should detect stuck asks", async () => {
			const logSpy = vi.spyOn(provider, "log")
			const oldTimestamp = Date.now() - 120000 // 2 minutes ago

			// @ts-ignore - accessing private property for testing
			provider.askSet.set("test-task-1", { task: mockTask, timestamp: oldTimestamp })

			// Fast-forward time to trigger health check
			vi.advanceTimersByTime(30000)

			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("[HealthCheck] WARNING: Ask pending for"))
		})

		it("should log metrics periodically when available", async () => {
			const logSpy = vi.spyOn(provider, "log")

			// @ts-ignore - accessing private method for testing
			provider.updateAskMetrics(1000, false)

			// Fast-forward time to trigger health check
			vi.advanceTimersByTime(30000)

			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("[AskMetrics] Total: 1"))
		})

		it("should not log metrics when no asks processed", async () => {
			const logSpy = vi.spyOn(provider, "log")

			// Fast-forward time to trigger health check
			vi.advanceTimersByTime(30000)

			expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining("[AskMetrics]"))
		})
	})

	describe("Task Registry Diagnostics", () => {
		it("should log task registry state", () => {
			const logSpy = vi.spyOn(provider, "log")

			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask)

			provider.logTaskRegistry()

			expect(logSpy).toHaveBeenCalledWith("[TaskRegistry] Active tasks: 1")
			expect(logSpy).toHaveBeenCalledWith("[TaskRegistry] Stack tasks: 0")
			expect(logSpy).toHaveBeenCalledWith("[TaskRegistry] Set tasks: 0")
			expect(logSpy).toHaveBeenCalledWith("[TaskRegistry] Ask queue: 0")
		})

		it("should log detailed debug info when environment variable is set", () => {
			const originalEnv = process.env.DEBUG_TASK_REGISTRY
			process.env.DEBUG_TASK_REGISTRY = "true"

			const logSpy = vi.spyOn(provider, "log")

			// @ts-ignore - accessing private method for testing
			provider.registerTask(mockTask)

			provider.logTaskRegistry()

			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Task test-task-1: hasPendingAsk="))

			process.env.DEBUG_TASK_REGISTRY = originalEnv
		})
	})
})
