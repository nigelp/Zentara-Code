import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { EventEmitter } from "events"
import { ClineProvider } from "../ClineProvider"
import { Task } from "../../task/Task"
import { RooCodeEventName } from "@roo-code/types"

// Mock VS Code API
vi.mock("vscode", () => ({
	ExtensionContext: {},
	OutputChannel: {},
	window: {
		showInformationMessage: vi.fn(),
		showErrorMessage: vi.fn(),
		createOutputChannel: vi.fn(() => ({
			appendLine: vi.fn(),
			dispose: vi.fn(),
		})),
		createTextEditorDecorationType: vi.fn(() => ({
			dispose: vi.fn(),
		})),
		activeTextEditor: undefined,
		visibleTextEditors: [],
		tabGroups: {
			onDidChangeTabs: vi.fn(() => ({ dispose: vi.fn() })),
			all: [],
			activeTabGroup: undefined,
		},
	},
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
		createFileSystemWatcher: vi.fn(() => ({
			onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
			onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
			onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
			dispose: vi.fn(),
		})),
		onDidChangeWorkspaceFolders: vi.fn(() => ({ dispose: vi.fn() })),
	},
	Uri: {
		file: vi.fn((path) => ({ fsPath: path })),
		parse: vi.fn((str) => ({ toString: () => str })),
		joinPath: vi.fn((uri, ...paths) => ({ fsPath: paths.join("/") })),
	},
	ViewColumn: {
		One: 1,
		Two: 2,
		Three: 3,
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

describe("ClineProvider - Cancel All Subagents Integration Tests", () => {
	let provider: ClineProvider
	let mockContext: any
	let mockOutputChannel: any
	let mockContextProxy: any
	let mockParentTask: any

	beforeEach(() => {
		// Create mock context
		mockContext = {
			globalState: {
				get: vi.fn(),
				update: vi.fn(),
			},
			globalStorageUri: { fsPath: "/test/storage" },
			extensionPath: "/test/extension",
			subscriptions: [],
		}

		// Create mock output channel
		mockOutputChannel = {
			appendLine: vi.fn(),
			dispose: vi.fn(),
			clear: vi.fn(),
			show: vi.fn(),
		}

		// Create mock context proxy
		mockContextProxy = {
			getValue: vi.fn(),
			setValue: vi.fn(),
			globalStorageUri: { fsPath: "/test/storage" },
		}

		// Create mock parent task
		mockParentTask = {
			taskId: "parent-task",
			instanceId: "parent-instance",
			resumePausedTask: vi.fn(),
			emit: vi.fn(),
		}

		// Create provider instance
		provider = new ClineProvider(mockContext, mockOutputChannel, "sidebar", mockContextProxy)

		// Mock postMessageToWebview to prevent errors
		provider.postMessageToWebview = vi.fn().mockResolvedValue(undefined)
		provider.postStateToWebview = vi.fn().mockResolvedValue(undefined)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe("Multi-subagent Cancellation Performance", () => {
		it("should handle 1 subagent cancellation efficiently", async () => {
			const subagent = createMockSubagent("1")
			provider["clineSet"].add(subagent as any)
			provider["parallelTasksState"] = [{ taskId: "subagent-1", description: "Task 1", status: "running" }]

			const startTime = Date.now()
			await provider.cancelAllSubagentsAndResumeParent()
			const duration = Date.now() - startTime

			// Should complete very quickly with 1 subagent
			expect(duration).toBeLessThan(100)
			expect(subagent.abort).toBe(true)
			expect(subagent.abandoned).toBe(true)
		})

		it("should handle 3 subagents cancellation efficiently", async () => {
			const subagents = [1, 2, 3].map((i) => createMockSubagent(i.toString()))
			subagents.forEach((s) => provider["clineSet"].add(s as any))
			provider["parallelTasksState"] = subagents.map((s, i) => ({
				taskId: `subagent-${i + 1}`,
				description: `Task ${i + 1}`,
				status: "running" as const,
			}))

			const startTime = Date.now()
			await provider.cancelAllSubagentsAndResumeParent()
			const duration = Date.now() - startTime

			// Should complete quickly even with 3 subagents (parallel execution)
			expect(duration).toBeLessThan(150)
			subagents.forEach((s) => {
				expect(s.abort).toBe(true)
				expect(s.abandoned).toBe(true)
			})
		})

		it("should handle 5 subagents cancellation efficiently", async () => {
			const subagents = [1, 2, 3, 4, 5].map((i) => createMockSubagent(i.toString()))
			subagents.forEach((s) => provider["clineSet"].add(s as any))
			provider["parallelTasksState"] = subagents.map((s, i) => ({
				taskId: `subagent-${i + 1}`,
				description: `Task ${i + 1}`,
				status: "running" as const,
			}))

			const startTime = Date.now()
			await provider.cancelAllSubagentsAndResumeParent()
			const duration = Date.now() - startTime

			// Should still complete quickly with 5 subagents (parallel execution benefit)
			expect(duration).toBeLessThan(200)
			subagents.forEach((s) => {
				expect(s.abort).toBe(true)
				expect(s.abandoned).toBe(true)
			})
		})

		it("should handle 10 subagents cancellation efficiently", async () => {
			const subagents = Array.from({ length: 10 }, (_, i) => createMockSubagent((i + 1).toString()))
			subagents.forEach((s) => provider["clineSet"].add(s as any))
			provider["parallelTasksState"] = subagents.map((s, i) => ({
				taskId: `subagent-${i + 1}`,
				description: `Task ${i + 1}`,
				status: "running" as const,
			}))

			const startTime = Date.now()
			await provider.cancelAllSubagentsAndResumeParent()
			const duration = Date.now() - startTime

			// Even with 10 subagents, should complete reasonably quickly
			expect(duration).toBeLessThan(300)
			subagents.forEach((s) => {
				expect(s.abort).toBe(true)
				expect(s.abandoned).toBe(true)
			})
		})
	})

	describe("File I/O Failure Handling", () => {
		it("should handle task cleanup failures gracefully", async () => {
			const subagents = [1, 2, 3].map((i) => createMockSubagent(i.toString()))

			// Make all subagents throw errors during finishSubTask
			const finishSubTaskSpy = vi
				.spyOn(provider, "finishSubTask" as any)
				.mockRejectedValue(new Error("Cleanup error"))

			subagents.forEach((s) => provider["clineSet"].add(s as any))

			// Should complete without throwing, despite cleanup failures
			await expect(provider.cancelAllSubagentsAndResumeParent()).resolves.not.toThrow()

			// Verify all subagents were still flagged for abort
			subagents.forEach((s) => {
				expect(s.abort).toBe(true)
				expect(s.abandoned).toBe(true)
			})

			// Verify finishSubTask was called for all subagents
			expect(finishSubTaskSpy).toHaveBeenCalledTimes(3)
		})

		it("should handle mixed success/failure scenarios", async () => {
			const subagents = [1, 2, 3].map((i) => createMockSubagent(i.toString()))

			// Mock finishSubTask to fail for one subagent but succeed for others
			const finishSubTaskSpy = vi
				.spyOn(provider, "finishSubTask" as any)
				.mockImplementation(async (...args: any[]) => {
					const [msg, subagent, cancelled] = args
					if (subagent.taskId === "subagent-1") {
						throw new Error("Cleanup failure for first subagent")
					}
					// Simulate successful cleanup for others
					provider["clineSet"].delete(subagent)
				})

			subagents.forEach((s) => provider["clineSet"].add(s as any))

			// Should complete without throwing despite one failure
			await expect(provider.cancelAllSubagentsAndResumeParent()).resolves.not.toThrow()

			// All should still be flagged for abort
			subagents.forEach((s) => {
				expect(s.abort).toBe(true)
				expect(s.abandoned).toBe(true)
			})

			// Verify finishSubTask was called for all subagents
			expect(finishSubTaskSpy).toHaveBeenCalledTimes(3)
		})
	})

	describe("UI State Management Integration", () => {
		it("should maintain consistent state during rapid cancellations", async () => {
			const subagents = [1, 2, 3].map((i) => createMockSubagent(i.toString()))
			subagents.forEach((s) => provider["clineSet"].add(s as any))
			provider["parallelTasksState"] = subagents.map((s, i) => ({
				taskId: `subagent-${i + 1}`,
				description: `Task ${i + 1}`,
				status: "running" as const,
			}))

			// Simulate rapid multiple cancellation calls (user clicking button quickly)
			const cancellationPromises = [
				provider.cancelAllSubagentsAndResumeParent(),
				provider.cancelAllSubagentsAndResumeParent(),
				provider.cancelAllSubagentsAndResumeParent(),
			]

			// All should complete without conflicts
			await Promise.all(cancellationPromises)

			// Final state should be consistent
			expect(provider["clineSet"].size).toBe(0)
			expect(provider["parallelTasksState"]).toEqual([])
			subagents.forEach((s) => {
				expect(s.abort).toBe(true)
				expect(s.abandoned).toBe(true)
			})
		})

		it("should handle cancellation during different subagent states", async () => {
			const runningSubagent = createMockSubagent("running")
			const streamingSubagent = createMockSubagent("streaming")
			const waitingSubagent = createMockSubagent("waiting")

			// Set different states (using any type assertion for test properties)
			;(runningSubagent as any).isStreaming = false
			;(streamingSubagent as any).isStreaming = true
			;(waitingSubagent as any).hasAskResponse = true

			const subagents = [runningSubagent, streamingSubagent, waitingSubagent]
			subagents.forEach((s) => provider["clineSet"].add(s as any))

			await provider.cancelAllSubagentsAndResumeParent()

			// All should be cancelled regardless of their state
			subagents.forEach((s) => {
				expect(s.abort).toBe(true)
				expect(s.abandoned).toBe(true)
			})
		})
	})

	describe("Edge Cases and Error Recovery", () => {
		it("should handle empty subagent list gracefully", async () => {
			// Ensure no subagents exist
			provider["clineSet"].clear()
			provider["parallelTasksState"] = []

			// Should complete without errors
			await expect(provider.cancelAllSubagentsAndResumeParent()).resolves.not.toThrow()
		})

		it("should handle corrupted subagent objects", async () => {
			// Create a partially corrupted subagent
			const corruptedSubagent = {
				taskId: "corrupted",
				instanceId: "corrupted-instance",
				// Missing required properties
				abort: false,
				abandoned: false,
				isParallel: true,
				parentTask: mockParentTask,
				abortTask: vi.fn().mockRejectedValue(new Error("Corrupted")),
				emit: vi.fn(),
				removeAllListeners: vi.fn(),
				dispose: vi.fn(),
			}

			const goodSubagent = createMockSubagent("good")

			provider["clineSet"].add(corruptedSubagent as any)
			provider["clineSet"].add(goodSubagent as any)

			// Should complete despite corrupted subagent
			await expect(provider.cancelAllSubagentsAndResumeParent()).resolves.not.toThrow()

			// Good subagent should still be processed
			expect(goodSubagent.abort).toBe(true)
			expect(goodSubagent.abandoned).toBe(true)
		})

		it("should recover from timeout scenarios gracefully", async () => {
			// Create subagents that would timeout
			const subagents = [1, 2, 3].map((i) => createMockSubagent(i.toString()))
			subagents.forEach((s) => provider["clineSet"].add(s as any))

			// Mock finishSubTask to hang
			const originalFinishSubTask = provider.finishSubTask
			provider.finishSubTask = vi.fn().mockImplementation(async () => {
				// Hang for longer than timeout
				await new Promise((resolve) => setTimeout(resolve, 6000))
			}) as any

			const startTime = Date.now()
			await provider.cancelAllSubagentsAndResumeParent()
			const duration = Date.now() - startTime

			// Should timeout and force cleanup
			expect(duration).toBeGreaterThan(4500) // ~5 second timeout
			expect(duration).toBeLessThan(6500) // But not hang for full 18 seconds

			// Force cleanup should have occurred
			expect(provider["clineSet"].size).toBe(0)
			expect(provider["parallelTasksState"]).toEqual([])

			// Restore original method
			provider.finishSubTask = originalFinishSubTask
		}, 10000) // Allow 10s for this test
	})

	function createMockSubagent(id: string) {
		return {
			taskId: `subagent-${id}`,
			instanceId: `instance-${id}`,
			abort: false,
			abandoned: false,
			isParallel: true,
			parentTask: mockParentTask,
			abortTask: vi.fn().mockResolvedValue(undefined),
			emit: vi.fn(),
			removeAllListeners: vi.fn(),
			dispose: vi.fn(),
			saveClineMessages: vi.fn().mockResolvedValue(undefined),
		}
	}
})
