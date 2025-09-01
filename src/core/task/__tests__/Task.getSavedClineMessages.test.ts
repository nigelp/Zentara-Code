import { describe, it, expect, beforeEach, vi } from "vitest"
import { Task } from "../Task"
import type { ClineMessage } from "@roo-code/types"

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

vi.mock("@roo-code/cloud", () => ({
	CloudService: {
		isEnabled: vi.fn().mockReturnValue(false),
		instance: {
			captureEvent: vi.fn(),
		},
	},
}))

vi.mock("@roo-code/telemetry", () => ({
	TelemetryService: {
		instance: {
			logEvent: vi.fn(),
			logError: vi.fn(),
			logUserAction: vi.fn(),
			captureTaskCreated: vi.fn(),
			captureTaskRestarted: vi.fn(),
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
		getState: vi.fn().mockReturnValue({}),
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

describe("Task.getSavedClineMessages migration", () => {
	let mockProvider: any
	let readTaskMessagesMock: any

	beforeEach(async () => {
		vi.clearAllMocks()

		// Create a proper mock class that can be used with WeakRef
		class MockProvider {
			context = {
				globalStorageUri: { fsPath: "/mock/storage" },
			}
			postStateToWebview = vi.fn()
			addAskRequest = vi.fn()
			removeFromAskSet = vi.fn()
			getState = vi.fn().mockReturnValue({})
			log = vi.fn()
		}

		mockProvider = new MockProvider()

		const messageModule = await import("../task-persistence")
		readTaskMessagesMock = vi.mocked(messageModule.readTaskMessages)
	})

	describe("legacy message migration", () => {
		it("should add taskId to messages without taskId", async () => {
			// Mock legacy messages without taskId
			const legacyMessages: ClineMessage[] = [
				{ ts: 1000, type: "say", say: "text", text: "Legacy message 1" } as any,
				{ ts: 2000, type: "ask", ask: "tool", text: "Legacy ask" } as any,
				{ ts: 3000, type: "say", say: "user_feedback", text: "Legacy feedback" } as any,
			]

			readTaskMessagesMock.mockResolvedValueOnce(legacyMessages)

			// Create task
			const task = new Task({
				provider: mockProvider,
				apiConfiguration: {
					apiProvider: "anthropic",
					apiModelId: "claude-3-5-sonnet-20241022",
					apiKey: "test-key",
				},
				task: "Test task",
				startTask: false,
			})

			// Wait for async initialization
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Get migrated messages
			const messages = await (task as any).getSavedClineMessages()

			// All messages should have taskId added
			expect(messages).toHaveLength(3)
			messages.forEach((msg: ClineMessage) => {
				expect(msg.taskId).toBe(task.taskId)
			})

			// Original properties should be preserved
			expect(messages[0]).toMatchObject({
				ts: 1000,
				type: "say",
				say: "text",
				text: "Legacy message 1",
				taskId: task.taskId,
			})
			expect(messages[1]).toMatchObject({
				ts: 2000,
				type: "ask",
				ask: "tool",
				text: "Legacy ask",
				taskId: task.taskId,
			})
		})

		it("should preserve existing taskId if already present", async () => {
			const mixedMessages: ClineMessage[] = [
				{ ts: 1000, type: "say", say: "text", text: "Has taskId", taskId: "existing-id-123" },
				{ ts: 2000, type: "ask", ask: "tool", text: "No taskId" } as any,
				{ ts: 3000, type: "say", say: "text", text: "Also has taskId", taskId: "existing-id-456" },
			]

			readTaskMessagesMock.mockResolvedValueOnce(mixedMessages)

			const task = new Task({
				provider: mockProvider,
				apiConfiguration: {
					apiProvider: "anthropic",
					apiModelId: "claude-3-5-sonnet-20241022",
					apiKey: "test-key",
				},
				task: "Test task",
				startTask: false,
			})

			const messages = await (task as any).getSavedClineMessages()

			// Check taskId handling
			expect(messages[0].taskId).toBe("existing-id-123") // Preserved
			expect(messages[1].taskId).toBe(task.taskId) // Added
			expect(messages[2].taskId).toBe("existing-id-456") // Preserved
		})

		it("should handle empty message array", async () => {
			readTaskMessagesMock.mockResolvedValueOnce([])

			const task = new Task({
				provider: mockProvider,
				apiConfiguration: {
					apiProvider: "anthropic",
					apiModelId: "claude-3-5-sonnet-20241022",
					apiKey: "test-key",
				},
				task: "Test task",
				startTask: false,
			})

			const messages = await (task as any).getSavedClineMessages()
			expect(messages).toEqual([])
		})

		it("should handle complex message properties during migration", async () => {
			const complexMessage: ClineMessage = {
				ts: Date.now(),
				type: "say",
				say: "completion_result",
				text: "Complex message",
				images: ["img1.png", "img2.png"],
				partial: false,
				// Missing taskId
			} as any

			readTaskMessagesMock.mockResolvedValueOnce([complexMessage])

			const task = new Task({
				provider: mockProvider,
				apiConfiguration: {
					apiProvider: "anthropic",
					apiModelId: "claude-3-5-sonnet-20241022",
					apiKey: "test-key",
				},
				task: "Test task",
				startTask: false,
			})

			const messages = await (task as any).getSavedClineMessages()

			// All properties should be preserved, with taskId added
			expect(messages[0]).toMatchObject({
				...complexMessage,
				taskId: task.taskId,
			})
			expect(messages[0].images).toEqual(["img1.png", "img2.png"])
			expect(messages[0].partial).toBe(false)
		})

		it("should handle readTaskMessages errors gracefully", async () => {
			readTaskMessagesMock.mockRejectedValueOnce(new Error("Read failed"))

			const task = new Task({
				provider: mockProvider,
				apiConfiguration: {
					apiProvider: "anthropic",
					apiModelId: "claude-3-5-sonnet-20241022",
					apiKey: "test-key",
				},
				task: "Test task",
				startTask: false,
			})

			// Should return empty array on error
			const messages = await (task as any).getSavedClineMessages()
			expect(Array.isArray(messages)).toBe(true)
		})
	})

	describe("migration immutability", () => {
		it("should not modify the original message objects", async () => {
			const originalMessage = {
				ts: 1000,
				type: "say" as const,
				say: "text" as const,
				text: "Original message",
				// No taskId
			}

			const originalCopy = { ...originalMessage }

			readTaskMessagesMock.mockResolvedValueOnce([originalMessage])

			const task = new Task({
				provider: mockProvider,
				apiConfiguration: {
					apiProvider: "anthropic",
					apiModelId: "claude-3-5-sonnet-20241022",
					apiKey: "test-key",
				},
				task: "Test task",
				startTask: false,
			})

			await (task as any).getSavedClineMessages()

			// Original object should not be modified
			expect(originalMessage).toEqual(originalCopy)
			expect("taskId" in originalMessage).toBe(false)
		})
	})
})
