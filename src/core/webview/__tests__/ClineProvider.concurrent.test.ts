import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest"
import * as vscode from "vscode"
import { ClineProvider } from "../ClineProvider"
import { Task } from "../../task/Task"
import { ContextProxy } from "../../config/ContextProxy"

// Mock vscode
vi.mock("vscode", () => ({
	ExtensionContext: vi.fn(),
	OutputChannel: vi.fn(),
	EventEmitter: vi.fn(),
	window: {
		showErrorMessage: vi.fn(),
		tabGroups: {
			onDidChangeTabs: () => ({ dispose: () => {} }),
		},
	},
	workspace: {
		workspaceFolders: [],
		getWorkspaceFolder: () => null,
		onDidChangeWorkspaceFolders: () => ({ dispose: () => {} }),
		getConfiguration: () => ({ get: () => null }),
		createFileSystemWatcher: () => ({
			onDidCreate: () => ({ dispose: () => {} }),
			onDidChange: () => ({ dispose: () => {} }),
			onDidDelete: () => ({ dispose: () => {} }),
			dispose: () => {},
		}),
		fs: {
			readFile: () => Promise.resolve(new Uint8Array()),
			writeFile: () => Promise.resolve(),
			stat: () => Promise.resolve({ type: 1, ctime: 0, mtime: 0, size: 0 }),
		},
	},
	env: {
		uriScheme: "vscode",
	},
}))

// Mock Task
vi.mock("../../task/Task", () => {
	const EventEmitter = require("events")
	return {
		Task: vi.fn().mockImplementation((options) => {
			const task = new EventEmitter()
			Object.assign(task, {
				taskId: options.taskId || "test-task-id",
				instanceId: "test-instance",
				clineMessages: [],
				askResponse: undefined,
				hasAskResponse: false,
				abortTask: vi.fn(),
				dispose: vi.fn(),
				handleWebviewAskResponse: vi.fn(),
				once: EventEmitter.prototype.once,
				emit: EventEmitter.prototype.emit,
				removeAllListeners: EventEmitter.prototype.removeAllListeners,
			})
			return task
		}),
	}
})

describe("ClineProvider Concurrent Ask Processing", () => {
	let provider: ClineProvider
	let mockContext: any
	let mockOutputChannel: any
	let mockContextProxy: any

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks()

		// Create mock context
		mockContext = {
			globalState: {
				get: vi.fn().mockReturnValue(undefined),
				update: vi.fn(),
				keys: vi.fn().mockReturnValue([]),
			},
			workspaceState: {
				get: vi.fn(),
				update: vi.fn(),
			},
			extensionPath: "/test/extension",
			globalStorageUri: { fsPath: "/tmp/test-global-storage" },
			extensionUri: { fsPath: "/test/extension" },
			extension: {
				packageJSON: {
					name: "test-extension",
				},
			},
		}

		// Create mock output channel
		mockOutputChannel = {
			appendLine: vi.fn(),
			append: vi.fn(),
			clear: vi.fn(),
			show: vi.fn(),
		}

		// Create mock context proxy
		mockContextProxy = {
			getMode: vi.fn().mockReturnValue("default"),
			getModelListService: vi.fn(),
			setValue: vi.fn().mockResolvedValue(undefined),
			getValues: vi.fn().mockReturnValue({}),
			isInitialized: true,
			getValue: vi.fn().mockReturnValue(undefined),
			getProviderSettings: vi.fn().mockReturnValue({ apiProvider: "anthropic" }),
		}

		// Create provider instance
		provider = new ClineProvider(mockContext as any, mockOutputChannel, "sidebar", mockContextProxy as any)
	})

	afterEach(() => {
		// Clean up
		if (provider) {
			provider.dispose()
		}
	})

	describe("Concurrent Ask Processing Prevention", () => {
		it("should queue multiple asks and process them sequentially", async () => {
			const task1 = new Task({ taskId: "sequential-1" } as any)
			const task2 = new Task({ taskId: "sequential-2" } as any)
			const task3 = new Task({ taskId: "sequential-3" } as any)

			// Register tasks
			await provider.addClineToStack(task1 as any)
			await provider.addClineToSet(task2 as any)
			await provider.addClineToSet(task3 as any)

			// Queue all asks
			await provider.addAskRequest(task1 as any)
			await provider.addAskRequest(task2 as any)
			await provider.addAskRequest(task3 as any)

			// Verify set size
			const status = provider.getAskQueueStatus()
			expect(status.askSetSize).toBe(3)
			expect(status.askSetTasks).toHaveLength(3)
			const taskIds = status.askSetTasks.map((t) => t.taskId).sort()
			expect(taskIds).toEqual(["sequential-1", "sequential-2", "sequential-3"])
		})

		it("should prevent duplicate entries in ask queue", async () => {
			const task = new Task({ taskId: "duplicate-task" } as any)

			// Register task
			await provider.addClineToStack(task as any)

			// Queue same task multiple times
			await provider.addAskRequest(task as any)
			await provider.addAskRequest(task as any)
			await provider.addAskRequest(task as any)

			// Should only have one entry
			const status = provider.getAskQueueStatus()
			expect(status.askSetSize).toBe(1)
			expect(status.askSetTasks[0].taskId).toBe("duplicate-task")

			// Should log duplicate warnings
			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith("Task duplicate-task already in ask queue")
		})

		it("should process new asks arriving during processing", async () => {
			const task1 = new Task({ taskId: "during-1" } as any)
			const task2 = new Task({ taskId: "during-2" } as any)

			// Setup initial task with pending ask
			task1.hasAskResponse = false
			task1.clineMessages = [{ type: "ask", ask: "tool", text: "First ask", ts: Date.now(), taskId: "during-1" }]

			// Register tasks
			await provider.addClineToStack(task1 as any)
			await provider.addClineToSet(task2 as any)

			// Queue first ask
			await provider.addAskRequest(task1 as any)

			// Verify initial state
			let status = provider.getAskQueueStatus()
			expect(status.askSetSize).toBe(1)

			// Add second ask while first is being processed (simulate)
			await provider.addAskRequest(task2 as any)

			// Verify second ask was added to set
			status = provider.getAskQueueStatus()
			expect(status.askSetSize).toBe(2)
			const taskIds = status.askSetTasks.map((t) => t.taskId).sort()
			expect(taskIds).toEqual(["during-1", "during-2"])
		})

		it("should track queue timestamps for debugging", async () => {
			const task = new Task({ taskId: "timestamp-task" } as any)

			// Register task
			await provider.addClineToStack(task as any)

			// Record time before queuing
			const beforeTime = Date.now()

			// Queue ask
			await provider.addAskRequest(task as any)

			// Record time after queuing
			const afterTime = Date.now()

			// Check timestamp is within expected range
			const status = provider.getAskQueueStatus()
			expect(status.askSetTasks[0].timestamp).toBeGreaterThanOrEqual(beforeTime)
			expect(status.askSetTasks[0].timestamp).toBeLessThanOrEqual(afterTime)
			expect(status.askSetTasks[0].waitTime).toBeGreaterThanOrEqual(0)
		})

		it("should handle task disposal during queue processing", async () => {
			const task1 = new Task({ taskId: "dispose-during-1" } as any)
			const task2 = new Task({ taskId: "dispose-during-2" } as any)

			// Register tasks
			await provider.addClineToStack(task1 as any)
			await provider.addClineToSet(task2 as any)

			// Queue both asks
			await provider.addAskRequest(task1 as any)
			await provider.addAskRequest(task2 as any)

			// Verify initial set state
			let status = provider.getAskQueueStatus()
			expect(status.askSetSize).toBe(2)

			// Dispose first task (this should remove it from registry)
			task1.emit("disposed")

			// Remove from ask set manually (simulating what happens in real disposal)
			provider.removeFromAskSet("dispose-during-1")

			// Verify task was removed from set
			status = provider.getAskQueueStatus()
			expect(status.askSetSize).toBe(1)
			expect(status.askSetTasks[0].taskId).toBe("dispose-during-2")
		})

		it("should ensure processingAsks set is managed correctly", async () => {
			const task1 = new Task({ taskId: "flag-test-1" } as any)
			const task2 = new Task({ taskId: "flag-test-2" } as any)

			// Register tasks
			await provider.addClineToStack(task1 as any)
			await provider.addClineToSet(task2 as any)

			// Queue both asks
			await provider.addAskRequest(task1 as any)
			await provider.addAskRequest(task2 as any)

			// Verify both are in set and no tasks are processing initially
			const status = provider.getAskQueueStatus()
			expect(status.askSetSize).toBe(2)
			expect(status.processingCount).toBe(0)

			// The processingAsks set is tested implicitly through the queue status
			// Since it's private, we test its effects rather than the set directly
			const taskIds = status.askSetTasks.map((t) => t.taskId).sort()
			expect(taskIds).toEqual(["flag-test-1", "flag-test-2"])
		})
	})
})
