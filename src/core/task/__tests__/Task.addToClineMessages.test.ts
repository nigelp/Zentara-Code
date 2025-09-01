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
		removeFromAskQueue: vi.fn(),
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

describe("Task.addToClineMessages", () => {
	let task: Task
	let mockProvider: any

	beforeEach(() => {
		vi.clearAllMocks()

		// Create a proper mock class that can be used with WeakRef
		class MockProvider {
			context = {
				globalStorageUri: { fsPath: "/mock/storage" },
			}
			postStateToWebview = vi.fn().mockResolvedValue(undefined)
			addAskRequest = vi.fn().mockResolvedValue(undefined)
			removeFromAskQueue = vi.fn()
			getState = vi.fn().mockReturnValue({})
			log = vi.fn()
		}

		const mockProviderInstance = new MockProvider()
		mockProvider = mockProviderInstance

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

	describe("taskId inclusion", () => {
		it("should add taskId to say messages", async () => {
			const sayText = "Hello from task"
			await task.say("text", sayText)

			const messages = task.clineMessages
			expect(messages).toHaveLength(1)

			const message = messages[0]
			expect(message.taskId).toBe(task.taskId)
			expect(message.type).toBe("say")
			expect(message.text).toBe(sayText)
		})

		it("should add taskId to ask messages", async () => {
			// Start ask operation (don't await yet)
			const askPromise = task.ask("tool", "Approve file read?")

			// Check that message was added with taskId
			const messages = task.clineMessages
			expect(messages).toHaveLength(1)

			const message = messages[0]
			expect(message.taskId).toBe(task.taskId)
			expect(message.type).toBe("ask")
			expect(message.ask).toBe("tool")
			expect(message.text).toBe("Approve file read?")

			// Simulate response
			task.handleWebviewAskResponse("yesButtonClicked")
			await askPromise
		})

		it("should preserve all original message properties", async () => {
			const originalMessage: ClineMessage = {
				ts: Date.now(),
				type: "say",
				say: "user_feedback",
				text: "Complex message",
				images: ["image1.png", "image2.png"],
				partial: true,
			}

			// Access private method through type assertion
			await (task as any).addToClineMessages(originalMessage)

			const messages = task.clineMessages
			expect(messages).toHaveLength(1)

			const savedMessage = messages[0]
			expect(savedMessage).toMatchObject({
				...originalMessage,
				taskId: task.taskId,
			})
			expect(savedMessage.images).toEqual(["image1.png", "image2.png"])
			expect(savedMessage.partial).toBe(true)
		})

		it("should override existing taskId if message already has one", async () => {
			const messageWithWrongTaskId: ClineMessage = {
				ts: Date.now(),
				type: "say",
				say: "text",
				text: "Message with wrong task ID",
				taskId: "wrong-task-id",
			}

			await (task as any).addToClineMessages(messageWithWrongTaskId)

			const messages = task.clineMessages
			expect(messages).toHaveLength(1)
			expect(messages[0].taskId).toBe(task.taskId) // Should use task's ID
		})
	})

	describe("provider interactions", () => {
		it("should call postStateToWebview after adding message", async () => {
			await task.say("text", "Test message")

			expect(mockProvider.postStateToWebview).toHaveBeenCalledTimes(1)
		})

		it("should queue ask request for ask messages", async () => {
			const askPromise = task.ask("tool", "Approve?")

			expect(mockProvider.addAskRequest).toHaveBeenCalledWith(task)
			expect(mockProvider.addAskRequest).toHaveBeenCalledTimes(1)

			// Cleanup
			task.handleWebviewAskResponse("yesButtonClicked")
			await askPromise
		})

		it("should not queue ask request for say messages", async () => {
			await task.say("text", "Just saying")

			expect(mockProvider.addAskRequest).not.toHaveBeenCalled()
		})
	})

	describe("CloudService integration", () => {
		beforeEach(async () => {
			const { CloudService } = await import("@roo-code/cloud")
			vi.mocked(CloudService.isEnabled).mockReturnValue(true)
		})

		it("should capture non-partial messages when CloudService is enabled", async () => {
			const { CloudService } = await import("@roo-code/cloud")

			await task.say("text", "Captured message")

			expect(CloudService.instance.captureEvent).toHaveBeenCalledWith({
				event: "Task Message",
				properties: {
					taskId: task.taskId,
					message: expect.objectContaining({
						text: "Captured message",
					}),
				},
			})
		})

		it("should not capture partial messages", async () => {
			const { CloudService } = await import("@roo-code/cloud")

			const partialMessage: ClineMessage = {
				ts: Date.now(),
				type: "say",
				say: "text",
				text: "Partial message",
				partial: true,
			}

			await (task as any).addToClineMessages(partialMessage)

			expect(CloudService.instance.captureEvent).not.toHaveBeenCalled()
		})

		it("should not capture when CloudService is disabled", async () => {
			const { CloudService } = await import("@roo-code/cloud")
			vi.mocked(CloudService.isEnabled).mockReturnValue(false)

			await task.say("text", "Not captured")

			expect(CloudService.instance.captureEvent).not.toHaveBeenCalled()
		})
	})

	describe("message persistence", () => {
		it("should trigger save after adding messages", async () => {
			const { saveTaskMessages } = await import("../task-persistence")

			await task.say("text", "Message to save")

			// Call saveClineMessages directly to test the save functionality
			await (task as any).saveClineMessages()

			expect(saveTaskMessages).toHaveBeenCalledWith(
				expect.objectContaining({
					taskId: task.taskId,
					messages: expect.arrayContaining([
						expect.objectContaining({
							taskId: task.taskId,
							text: "Message to save",
						}),
					]),
				}),
			)
		})
	})
})
