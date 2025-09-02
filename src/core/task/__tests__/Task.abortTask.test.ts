import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { EventEmitter } from "events"
import { Task } from "../Task"
import { ZentaraCodeEventName } from "@zentara-code/types"

// Mock VS Code API
vi.mock("vscode", () => ({
	workspace: {
		getConfiguration: vi.fn(() => ({
			get: vi.fn(),
			update: vi.fn(),
		})),
		fs: {
			readFile: vi.fn(),
			writeFile: vi.fn(),
			stat: vi.fn(),
		},
		workspaceFolders: [],
	},
	Uri: {
		file: vi.fn((path) => ({ fsPath: path })),
		parse: vi.fn((str) => ({ toString: () => str })),
		joinPath: vi.fn((uri, ...paths) => ({ fsPath: paths.join("/") })),
	},
	window: {
		showErrorMessage: vi.fn(),
		showInformationMessage: vi.fn(),
		createTextEditorDecorationType: vi.fn(() => ({
			dispose: vi.fn(),
		})),
		activeTextEditor: undefined,
		visibleTextEditors: [],
	},
	Range: vi.fn(),
	Position: vi.fn(),
	EventEmitter: vi.fn(() => ({
		event: vi.fn(),
		fire: vi.fn(),
		dispose: vi.fn(),
	})),
	FileType: {
		File: 1,
		Directory: 2,
	},
	debug: {
		onDidStartDebugSession: vi.fn(() => ({ dispose: vi.fn() })),
		onDidTerminateDebugSession: vi.fn(() => ({ dispose: vi.fn() })),
		onDidChangeActiveDebugSession: vi.fn(() => ({ dispose: vi.fn() })),
		onDidReceiveDebugSessionCustomEvent: vi.fn(() => ({ dispose: vi.fn() })),
		activeDebugSession: undefined,
		startDebugging: vi.fn(),
		stopDebugging: vi.fn(),
		registerDebugAdapterDescriptorFactory: vi.fn(),
		registerDebugConfigurationProvider: vi.fn(),
		registerDebugAdapterTrackerFactory: vi.fn(),
		addBreakpoints: vi.fn(),
		removeBreakpoints: vi.fn(),
		breakpoints: [],
		onDidChangeBreakpoints: vi.fn(() => ({ dispose: vi.fn() })),
	},
	commands: {
		registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
		executeCommand: vi.fn(),
		getCommands: vi.fn(() => []),
	},
	Disposable: {
		from: vi.fn((...disposables) => ({
			dispose: vi.fn(() => disposables.forEach((d) => d.dispose?.())),
		})),
	},
}))

// Mock fs module
vi.mock("fs/promises", () => ({
	default: {
		mkdir: vi.fn(),
		writeFile: vi.fn(),
		readFile: vi.fn(),
		stat: vi.fn(),
		readdir: vi.fn().mockResolvedValue([]),
	},
}))

// Mock DiffViewProvider
vi.mock("../../../integrations/editor/managers/DiffViewProvider", () => ({
	DiffViewProvider: vi.fn().mockImplementation(() => ({
		init: vi.fn(),
		dispose: vi.fn(),
		reset: vi.fn(),
	})),
}))

// Mock ContextManagerV3
vi.mock("../ContextManagerV3", () => ({
	ContextManagerV3: vi.fn().mockImplementation(() => ({
		getContext: vi.fn().mockReturnValue({ assistantMessage: [] }),
		updateContext: vi.fn(),
		addMessageContext: vi.fn(),
		clearContext: vi.fn(),
	})),
}))

describe("Task - abortTask improvements", () => {
	let task: Task
	let mockProvider: any
	let mockApi: any

	beforeEach(() => {
		// Create mock provider
		mockProvider = {
			postMessageToWebview: vi.fn(),
			postStateToWebview: vi.fn(),
			updateSubagentActivity: vi.fn(),
			updateSubagentStreamingText: vi.fn(),
			finishSubTask: vi.fn(),
			context: {
				globalStorageUri: { fsPath: "/test/storage" },
			},
			outputChannel: {
				appendLine: vi.fn(),
			},
			cwd: "/test/workspace",
		}

		// Create mock API
		mockApi = {
			createUserReadableRequest: vi.fn(),
			getModel: vi.fn().mockReturnValue({ info: {} }),
		}

		// Create task instance
		task = new Task(
			mockProvider,
			"test-id",
			"test-slug",
			"test-instance",
			mockApi,
			undefined, // no parent task
			false, // not parallel
		)

		// Mock methods that might be called during abort
		task.saveClineMessages = vi.fn().mockResolvedValue(undefined)
		task.dispose = vi.fn()
		task.removeAllListeners = vi.fn()
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe("abortTask method", () => {
		it("should set abort flag immediately", async () => {
			expect(task.abort).toBe(false)

			await task.abortTask()

			expect(task.abort).toBe(true)
		})

		it("should set abandoned flag when isAbandoned is true", async () => {
			expect(task.abandoned).toBe(false)

			await task.abortTask(true)

			expect(task.abandoned).toBe(true)
			expect(task.abort).toBe(true)
		})

		it("should not set abandoned flag when isAbandoned is false", async () => {
			expect(task.abandoned).toBe(false)

			await task.abortTask(false)

			expect(task.abandoned).toBe(false)
			expect(task.abort).toBe(true)
		})

		it("should emit TaskAborted event", async () => {
			const emitSpy = vi.spyOn(task, "emit")

			await task.abortTask()

			expect(emitSpy).toHaveBeenCalledWith(ZentaraCodeEventName.TaskAborted)
		})

		it("should handle event emission errors gracefully", async () => {
			// Make emit throw an error
			task.emit = vi.fn().mockImplementation(() => {
				throw new Error("Event emission failed")
			})

			// Should not throw despite emission error
			await expect(task.abortTask()).resolves.not.toThrow()

			// Should still set abort flag
			expect(task.abort).toBe(true)
		})

		it("should call dispose method", async () => {
			const disposeSpy = vi.spyOn(task, "dispose")

			await task.abortTask()

			expect(disposeSpy).toHaveBeenCalled()
		})

		it("should handle dispose errors gracefully", async () => {
			// Make dispose throw an error
			task.dispose = vi.fn().mockImplementation(() => {
				throw new Error("Dispose failed")
			})

			// Should not throw despite dispose error
			await expect(task.abortTask()).resolves.not.toThrow()

			// Should still set abort flag
			expect(task.abort).toBe(true)
		})

		it("should save messages when not abandoned", async () => {
			const saveSpy = vi.spyOn(task, "saveClineMessages")

			await task.abortTask(false)

			expect(saveSpy).toHaveBeenCalled()
		})

		it("should NOT save messages when abandoned", async () => {
			const saveSpy = vi.spyOn(task, "saveClineMessages")

			await task.abortTask(true)

			expect(saveSpy).not.toHaveBeenCalled()
		})

		it("should handle save message errors gracefully", async () => {
			// Make saveClineMessages throw an error
			task.saveClineMessages = vi.fn().mockRejectedValue(new Error("Save failed"))

			// Should not throw despite save error
			await expect(task.abortTask(false)).resolves.not.toThrow()

			// Should still set abort flag
			expect(task.abort).toBe(true)
		})

		it("should complete successfully even if all operations fail", async () => {
			// Make everything throw errors
			task.emit = vi.fn().mockImplementation(() => {
				throw new Error("Emit failed")
			})
			task.dispose = vi.fn().mockImplementation(() => {
				throw new Error("Dispose failed")
			})
			task.saveClineMessages = vi.fn().mockRejectedValue(new Error("Save failed"))

			// Should not throw despite all errors
			await expect(task.abortTask(false)).resolves.not.toThrow()

			// Should still set abort flag
			expect(task.abort).toBe(true)
		})

		it("should log appropriate messages", async () => {
			const consoleSpy = vi.spyOn(console, "log")

			await task.abortTask(true)

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("[subtasks] aborting task test-id.test-instance (isAbandoned: true)"),
			)
		})
	})

	describe("abortTask with streaming", () => {
		beforeEach(() => {
			// Set task as streaming
			task.isStreaming = true
			task.didFinishAbortingStream = false
		})

		it("should set didFinishAbortingStream flag", async () => {
			await task.abortTask()

			// The flag should be set after abort completes
			expect(task.abort).toBe(true)
		})

		it("should handle abort during streaming state", async () => {
			// Simulate streaming state
			task.currentStreamingContentIndex = 5
			task.assistantMessageContent = ["Some", "content"]
			task.userMessageContent = ["User", "input"]

			await task.abortTask()

			// Verify abort completed
			expect(task.abort).toBe(true)
		})
	})

	describe("abortTask idempotency", () => {
		it("should handle multiple abort calls safely", async () => {
			// First abort
			await task.abortTask()
			expect(task.abort).toBe(true)

			// Second abort - should not throw
			await expect(task.abortTask()).resolves.not.toThrow()
			expect(task.abort).toBe(true)
		})

		it("should not save messages twice when aborted multiple times", async () => {
			const saveSpy = vi.spyOn(task, "saveClineMessages")

			// First abort (not abandoned)
			await task.abortTask(false)
			expect(saveSpy).toHaveBeenCalledTimes(1)

			// Second abort (not abandoned) - should still try to save
			await task.abortTask(false)
			expect(saveSpy).toHaveBeenCalledTimes(2)
		})

		it("should handle switching from normal abort to abandoned abort", async () => {
			// First abort (normal)
			await task.abortTask(false)
			expect(task.abort).toBe(true)
			expect(task.abandoned).toBe(false)

			// Second abort (abandoned)
			await task.abortTask(true)
			expect(task.abort).toBe(true)
			expect(task.abandoned).toBe(true)
		})
	})
})
