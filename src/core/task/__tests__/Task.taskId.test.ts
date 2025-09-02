import { describe, it, expect, beforeEach, vi } from "vitest"
import { Task } from "../Task"
import type { ClineMessage } from "@zentara-code/types"

// Mock VS Code APIs first
vi.mock("vscode", () => ({
	window: {
		createTextEditorDecorationType: vi.fn().mockReturnValue({
			dispose: vi.fn(),
		}),
		visibleTextEditors: [],
		tabGroups: {
			all: [],
			close: vi.fn(),
			onDidChangeTabs: vi.fn(() => ({ dispose: vi.fn() })),
		},
		showErrorMessage: vi.fn(),
	},
	debug: {
		onDidStartDebugSession: vi.fn(() => ({ dispose: vi.fn() })),
		onDidTerminateDebugSession: vi.fn(() => ({ dispose: vi.fn() })),
		setBreakpoints: vi.fn(),
		removeBreakpoints: vi.fn(),
		startDebugging: vi.fn(),
		stopDebugging: vi.fn(),
	},
	workspace: {
		workspaceFolders: [
			{
				uri: { fsPath: "/mock/workspace/path" },
				name: "mock-workspace",
				index: 0,
			},
		],
		createFileSystemWatcher: vi.fn(() => ({
			onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
			onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
			onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
			dispose: vi.fn(),
		})),
		fs: {
			stat: vi.fn().mockResolvedValue({ type: 1 }),
		},
		onDidSaveTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
		getConfiguration: vi.fn(() => ({ get: (key: string, defaultValue: any) => defaultValue })),
	},
	env: {
		uriScheme: "vscode",
		language: "en",
	},
	EventEmitter: vi.fn().mockImplementation(() => ({
		event: vi.fn(),
		fire: vi.fn(),
	})),
	Disposable: {
		from: vi.fn(),
	},
	TabInputText: vi.fn(),
	RelativePattern: vi.fn(),
}))

vi.mock("@zentara-code/telemetry", async (importOriginal) => {
	const actual = await importOriginal()
	return {
		...actual,
		TelemetryService: {
			instance: {
				logEvent: vi.fn(),
				logError: vi.fn(),
				logUserAction: vi.fn(),
				captureTaskCreated: vi.fn(),
				captureTaskRestarted: vi.fn(),
			},
		},
		BaseTelemetryClient: class MockBaseTelemetryClient {},
	}
})

// Mock dependencies
vi.mock("../../../api", () => ({
	buildApiHandler: vi.fn().mockReturnValue({
		createMessage: vi.fn(),
		getModel: vi.fn().mockReturnValue({
			id: "test-model",
			info: {
				supportsImages: true,
				supportsPromptCache: true,
				supportsComputerUse: true,
				contextWindow: 200000,
				maxTokens: 4096,
			},
		}),
	}),
}))

vi.mock("@zentara-code/cloud", () => ({
	CloudService: {
		isEnabled: vi.fn().mockReturnValue(false),
		instance: {
			captureEvent: vi.fn(),
		},
	},
}))

vi.mock("../../webview/ClineProvider", () => ({
	ClineProvider: vi.fn().mockImplementation(() => ({
		context: {
			globalStorageUri: { fsPath: "/mock/storage" },
		},
		postStateToWebview: vi.fn(),
		addAskRequest: vi.fn(),
		removeFromAskSet: vi.fn(),
		getState: vi.fn().mockReturnValue({ showZentaraIgnoredFiles: true }),
		log: vi.fn(),
	})),
}))

vi.mock("../task-persistence", () => ({
	readTaskMessages: vi.fn().mockResolvedValue([]),
	saveTaskMessages: vi.fn().mockResolvedValue(undefined),
	taskMetadata: vi.fn().mockResolvedValue({
		historyItem: {},
		tokenUsage: {},
	}),
}))

// Mock fs operations to prevent actual file system access
vi.mock("fs/promises", () => ({
	mkdir: vi.fn().mockResolvedValue(undefined),
	writeFile: vi.fn().mockResolvedValue(undefined),
	readFile: vi.fn().mockResolvedValue("[]"),
	rm: vi.fn().mockResolvedValue(undefined),
}))

// Mock storage utils to avoid file system operations
vi.mock("../../../utils/storage", () => ({
	getTaskDirectoryPath: vi.fn().mockResolvedValue("/mock/task/path"),
	getStorageBasePath: vi.fn().mockResolvedValue("/mock/storage"),
}))

// Mock file utilities
vi.mock("../../../utils/fs", () => ({
	fileExistsAtPath: vi.fn().mockResolvedValue(true),
}))

describe("Task taskId handling", () => {
	let task: Task
	let mockProvider: any

	beforeEach(() => {
		// Create a proper mock class that can be used with WeakRef
		class MockProvider {
			context = {
				globalStorageUri: { fsPath: "/mock/storage" },
			}
			postStateToWebview = vi.fn()
			addAskRequest = vi.fn()
			removeFromAskSet = vi.fn()
			getState = vi.fn().mockReturnValue({ showZentaraIgnoredFiles: true })
			log = vi.fn()
		}
		const mockProviderInstance = new MockProvider()
		mockProvider = mockProviderInstance
		vi.clearAllMocks()

		// Create task with mocked dependencies
		task = new Task({
			provider: mockProviderInstance,
			apiConfiguration: {
				apiProvider: "anthropic",
				apiModelId: "claude-3-5-sonnet-20241022",
				apiKey: "test-key",
			},
			task: "Test task",
			startTask: false,
		})
	})

	describe("Message creation with taskId", () => {
		it("should include taskId in all created messages", async () => {
			// Test say message
			await task.say("text", "Hello world")

			// Get the last message
			const messages = task.clineMessages
			expect(messages.length).toBe(1)
			expect(messages[0].taskId).toBe(task.taskId)
			expect(messages[0].type).toBe("say")
			expect(messages[0].text).toBe("Hello world")
		})

		it("should queue ask messages for sequential processing", async () => {
			// Create ask message (mocking the internal behavior)
			const askPromise = task.ask("tool", "Approve file read?")

			// Should have queued the ask request
			expect(mockProvider.addAskRequest).toHaveBeenCalledWith(task)

			// Simulate response
			task.handleWebviewAskResponse("yesButtonClicked")

			const result = await askPromise
			expect(result.response).toBe("yesButtonClicked")
		})

		it("should add taskId to legacy messages when loading", async () => {
			// Mock legacy messages without taskId
			const { readTaskMessages } = await import("../task-persistence")
			vi.mocked(readTaskMessages).mockResolvedValueOnce([
				{ ts: 1000, type: "say", say: "text", text: "Legacy message" },
				{ ts: 2000, type: "ask", ask: "tool", text: "Legacy ask" },
			] as ClineMessage[])

			// Create new task which will load messages
			const newTask = new Task({
				provider: mockProvider,
				apiConfiguration: {
					apiProvider: "anthropic",
					apiModelId: "claude-3-5-sonnet-20241022",
					apiKey: "test-key",
				},
				task: "Test task for migration",
				startTask: false,
			})

			// Load messages (this happens internally during construction)
			// For testing, we'll access the messages directly after allowing initialization
			await new Promise((resolve) => setTimeout(resolve, 100)) // Allow async loading

			// All messages should now have taskId
			for (const msg of newTask.clineMessages) {
				expect(msg.taskId).toBe(newTask.taskId)
			}
		})
	})

	describe("Task disposal", () => {
		it("should emit disposed event on disposal", () => {
			const disposedHandler = vi.fn()
			task.once("disposed", disposedHandler)

			// Dispose task
			task.dispose()

			// Should emit disposed event
			expect(disposedHandler).toHaveBeenCalled()

			// Should remove from ask queue
			expect(mockProvider.removeFromAskSet).toHaveBeenCalledWith(task.taskId)
		})

		it("should clean up event listeners on disposal", () => {
			const handler1 = vi.fn()
			const handler2 = vi.fn()

			task.on("message", handler1)
			task.on("taskStarted", handler2)

			// Dispose task
			task.dispose()

			// Try to emit events - handlers should not be called
			task.emit("message", { action: "created", message: {} as any })
			task.emit("taskStarted")

			expect(handler1).not.toHaveBeenCalled()
			expect(handler2).not.toHaveBeenCalled()
		})
	})

	describe("hasAskResponse getter", () => {
		it("should return false when no ask response", () => {
			expect(task.hasAskResponse).toBe(false)
		})

		it("should return true after receiving ask response", () => {
			// Simulate ask response
			task.handleWebviewAskResponse("yesButtonClicked")

			expect(task.hasAskResponse).toBe(true)
		})
	})

	describe("Message persistence", () => {
		it("should ensure all messages have taskId when saving", async () => {
			const { saveTaskMessages } = await import("../task-persistence")

			// Add messages with and without taskId
			task.clineMessages = [
				{ ts: 1000, type: "say", say: "text", text: "Has ID", taskId: task.taskId },
				{ ts: 2000, type: "say", say: "text", text: "Missing ID" } as any,
			]

			// Trigger save by adding a message
			await task.say("text", "New message")

			// Verify taskId was added to messages
			const messages = task.clineMessages
			expect(messages).toHaveLength(3) // 2 original + 1 new
			messages.forEach((msg) => {
				expect(msg.taskId).toBe(task.taskId)
			})
		})
	})
})
