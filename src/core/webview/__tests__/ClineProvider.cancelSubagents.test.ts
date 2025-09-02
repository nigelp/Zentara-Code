import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { EventEmitter } from "events"
import { ClineProvider } from "../ClineProvider"
import { Task } from "../../task/Task"
import { ZentaraCodeEventName } from "@zentara-code/types"

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

describe("ClineProvider - Cancel All Subagents", () => {
	let provider: ClineProvider
	let mockContext: any
	let mockOutputChannel: any
	let mockContextProxy: any
	let mockParentTask: any
	let mockSubagent1: any
	let mockSubagent2: any
	let mockSubagent3: any

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

		// Create mock subagents with proper structure
		const createMockSubagent = (id: string) => ({
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
		})

		mockSubagent1 = createMockSubagent("1")
		mockSubagent2 = createMockSubagent("2")
		mockSubagent3 = createMockSubagent("3")

		// Create provider instance
		provider = new ClineProvider(mockContext, mockOutputChannel, "sidebar", mockContextProxy)

		// Mock postMessageToWebview to prevent errors
		provider.postMessageToWebview = vi.fn().mockResolvedValue(undefined)
		provider.postStateToWebview = vi.fn().mockResolvedValue(undefined)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe("cancelAllSubagentsAndResumeParent", () => {
		it("should immediately set abort flags on all subagents", async () => {
			// Add subagents to the clineSet
			provider["clineSet"].add(mockSubagent1)
			provider["clineSet"].add(mockSubagent2)
			provider["clineSet"].add(mockSubagent3)

			// Add to parallelTasksState
			provider["parallelTasksState"] = [
				{ taskId: "subagent-1", description: "Task 1", status: "running" },
				{ taskId: "subagent-2", description: "Task 2", status: "running" },
				{ taskId: "subagent-3", description: "Task 3", status: "running" },
			]

			// Call cancelAllSubagentsAndResumeParent
			await provider.cancelAllSubagentsAndResumeParent()

			// Verify abort flags were set immediately
			expect(mockSubagent1.abort).toBe(true)
			expect(mockSubagent1.abandoned).toBe(true)
			expect(mockSubagent2.abort).toBe(true)
			expect(mockSubagent2.abandoned).toBe(true)
			expect(mockSubagent3.abort).toBe(true)
			expect(mockSubagent3.abandoned).toBe(true)
		})

		it("should call finishSubTask for each subagent with cancelledByUser flag", async () => {
			// Add subagents to the clineSet
			provider["clineSet"].add(mockSubagent1)
			provider["clineSet"].add(mockSubagent2)

			// Add to parallelTasksState
			provider["parallelTasksState"] = [
				{ taskId: "subagent-1", description: "Task 1", status: "running" },
				{ taskId: "subagent-2", description: "Task 2", status: "running" },
			]

			// Spy on finishSubTask
			const finishSubTaskSpy = vi.spyOn(provider, "finishSubTask" as any)

			// Call cancelAllSubagentsAndResumeParent
			await provider.cancelAllSubagentsAndResumeParent()

			// Verify finishSubTask was called for each subagent with correct parameters
			expect(finishSubTaskSpy).toHaveBeenCalledTimes(2)
			expect(finishSubTaskSpy).toHaveBeenCalledWith("", mockSubagent1, true)
			expect(finishSubTaskSpy).toHaveBeenCalledWith("", mockSubagent2, true)
		})

		it("should handle errors gracefully when setting abort flags", async () => {
			// Create a subagent that throws when setting properties
			const problematicSubagent = {
				taskId: "problematic",
				instanceId: "prob-instance",
				get abort() {
					throw new Error("Cannot set abort")
				},
				set abort(val) {
					throw new Error("Cannot set abort")
				},
				abandoned: false,
				isParallel: true,
				parentTask: mockParentTask,
				abortTask: vi.fn(),
			}

			provider["clineSet"].add(problematicSubagent as any)
			provider["clineSet"].add(mockSubagent1)

			// Should not throw despite the problematic subagent
			await expect(provider.cancelAllSubagentsAndResumeParent()).resolves.not.toThrow()

			// Should still process the good subagent
			expect(mockSubagent1.abort).toBe(true)
			expect(mockSubagent1.abandoned).toBe(true)
		})

		it("should handle empty clineSet gracefully", async () => {
			// Ensure clineSet is empty
			provider["clineSet"].clear()

			// Should not throw when no subagents exist
			await expect(provider.cancelAllSubagentsAndResumeParent()).resolves.not.toThrow()
		})

		it("should clear parallelTasksState after all subagents are cancelled", async () => {
			// Add a single subagent
			provider["clineSet"].add(mockSubagent1)
			provider["parallelTasksState"] = [{ taskId: "subagent-1", description: "Task 1", status: "running" }]

			// Mock finishSubTask to simulate proper cleanup
			provider.finishSubTask = vi.fn().mockImplementation(async (msg, task, cancelled) => {
				provider["clineSet"].delete(task)
				if (provider["clineSet"].size === 0) {
					provider["parallelTasksState"] = []
					await mockParentTask.resumePausedTask(
						"All subagent tasks have been cancelled by user request. Please ask the user what to do next. Do not try to resume, repeat the task.",
						false,
					)
				}
			})

			await provider.cancelAllSubagentsAndResumeParent()

			// Verify parallelTasksState was cleared
			expect(provider["parallelTasksState"]).toEqual([])

			// Verify parent task was resumed with cancellation message
			expect(mockParentTask.resumePausedTask).toHaveBeenCalledWith(
				"All subagent tasks have been cancelled by user request. Please ask the user what to do next. Do not try to resume, repeat the task.",
				false,
			)
		})
	})

	describe("removeClineFromSet", () => {
		it("should skip abortTask if task is already aborted", async () => {
			// Set abort flag to true
			mockSubagent1.abort = true

			// Add to clineSet
			provider["clineSet"].add(mockSubagent1)

			// Call removeClineFromSet
			await provider["removeClineFromSet"](mockSubagent1)

			// Verify abortTask was NOT called since already aborted
			expect(mockSubagent1.abortTask).not.toHaveBeenCalled()

			// Verify task was removed from set
			expect(provider["clineSet"].has(mockSubagent1)).toBe(false)
		})

		it("should call abortTask if task is not yet aborted", async () => {
			// Ensure abort flag is false
			mockSubagent1.abort = false

			// Add to clineSet
			provider["clineSet"].add(mockSubagent1)

			// Call removeClineFromSet
			await provider["removeClineFromSet"](mockSubagent1)

			// Verify abortTask WAS called
			expect(mockSubagent1.abortTask).toHaveBeenCalledWith(true)

			// Verify task was removed from set
			expect(provider["clineSet"].has(mockSubagent1)).toBe(false)
		})

		it("should handle abortTask errors gracefully", async () => {
			// Make abortTask throw an error
			mockSubagent1.abort = false
			mockSubagent1.abortTask = vi.fn().mockRejectedValue(new Error("Abort failed"))

			// Add to clineSet
			provider["clineSet"].add(mockSubagent1)

			// Should not throw despite abortTask error
			await expect(provider["removeClineFromSet"](mockSubagent1)).resolves.not.toThrow()

			// Verify task was still removed from set
			expect(provider["clineSet"].has(mockSubagent1)).toBe(false)
		})

		it("should handle undefined task gracefully", async () => {
			// Should not throw when passing undefined
			await expect(provider["removeClineFromSet"](undefined)).resolves.not.toThrow()
		})
	})

	describe("finishSubTask with cancellation", () => {
		it("should not store message when cancelledByUser is true", async () => {
			// Setup parallel task
			mockSubagent1.isParallel = true
			provider["clineSet"].add(mockSubagent1)
			provider["parallelTaskMessages"].clear()

			// Mock removeClineFromSet to prevent actual abort
			provider["removeClineFromSet"] = vi.fn().mockImplementation((task) => {
				provider["clineSet"].delete(task)
			})

			// Call finishSubTask with cancelledByUser = true
			await provider.finishSubTask("Test message", mockSubagent1, true)

			// Verify message was NOT stored
			expect(provider["parallelTaskMessages"].has("subagent-1")).toBe(false)
		})

		it("should resume parent with cancellation message when all cancelled", async () => {
			// Setup two parallel tasks
			mockSubagent1.isParallel = true
			mockSubagent2.isParallel = true
			provider["clineSet"].add(mockSubagent1)
			provider["clineSet"].add(mockSubagent2)

			// Mock removeClineFromSet
			provider["removeClineFromSet"] = vi.fn().mockImplementation((task) => {
				provider["clineSet"].delete(task)
			})

			// Cancel first subagent - parent should not resume yet
			await provider.finishSubTask("", mockSubagent1, true)
			expect(mockParentTask.resumePausedTask).not.toHaveBeenCalled()

			// Cancel second subagent - parent should resume now
			await provider.finishSubTask("", mockSubagent2, true)
			expect(mockParentTask.resumePausedTask).toHaveBeenCalledWith(
				"All subagent tasks have been cancelled by user request. Please ask the user what to do next. Do not try to resume, repeat the task.",
				false,
			)
		})
	})

	describe("Integration: Full cancellation flow", () => {
		it("should handle concurrent cancellation of multiple subagents", async () => {
			// Setup multiple subagents
			const subagents = Array.from({ length: 5 }, (_, i) => ({
				taskId: `subagent-${i}`,
				instanceId: `instance-${i}`,
				abort: false,
				abandoned: false,
				isParallel: true,
				parentTask: mockParentTask,
				abortTask: vi.fn().mockImplementation(function () {
					// Simulate some async work
					return new Promise((resolve) => setTimeout(resolve, 10))
				}),
				emit: vi.fn(),
				removeAllListeners: vi.fn(),
				dispose: vi.fn(),
			}))

			// Add all subagents
			subagents.forEach((s) => {
				provider["clineSet"].add(s as any)
				provider["parallelTasksState"].push({
					taskId: s.taskId,
					description: `Task ${s.taskId}`,
					status: "running",
				})
			})

			// Mock removeClineFromSet to track calls
			const removeSpy = vi.spyOn(provider as any, "removeClineFromSet")

			// Cancel all subagents
			await provider.cancelAllSubagentsAndResumeParent()

			// Verify all subagents were aborted
			subagents.forEach((s) => {
				expect(s.abort).toBe(true)
				expect(s.abandoned).toBe(true)
			})

			// Verify removeClineFromSet was called for each (through finishSubTask)
			expect(removeSpy.mock.calls.length).toBeGreaterThanOrEqual(subagents.length)
		})

		it("should handle cancellation during different task states", async () => {
			// Create subagents in different states
			const runningTask = { ...mockSubagent1, status: "running" }
			const waitingTask = { ...mockSubagent2, status: "waiting", hasAskResponse: true }
			const streamingTask = { ...mockSubagent3, status: "streaming", isStreaming: true }

			provider["clineSet"].add(runningTask)
			provider["clineSet"].add(waitingTask)
			provider["clineSet"].add(streamingTask)

			// Cancel all
			await provider.cancelAllSubagentsAndResumeParent()

			// All should be aborted regardless of state
			expect(runningTask.abort).toBe(true)
			expect(waitingTask.abort).toBe(true)
			expect(streamingTask.abort).toBe(true)
		})

		it("should execute cleanup in parallel for better performance", async () => {
			// Create multiple subagents with simulated cleanup time
			const subagents = Array.from({ length: 5 }, (_, i) => ({
				taskId: `subagent-${i}`,
				instanceId: `instance-${i}`,
				abort: false,
				abandoned: false,
				isParallel: true,
				parentTask: mockParentTask,
				abortTask: vi.fn().mockResolvedValue(undefined),
				emit: vi.fn(),
				removeAllListeners: vi.fn(),
				dispose: vi.fn(),
			}))

			// Add all subagents
			subagents.forEach((s) => provider["clineSet"].add(s as any))

			// Mock finishSubTask with delay to simulate work
			const finishSubTaskSpy = vi.spyOn(provider, "finishSubTask" as any).mockImplementation(async () => {
				// Simulate 50ms cleanup time per subagent
				await new Promise((resolve) => setTimeout(resolve, 50))
			})

			const startTime = Date.now()
			await provider.cancelAllSubagentsAndResumeParent()
			const duration = Date.now() - startTime

			// Parallel execution should complete much faster than sequential (5 * 50ms = 250ms)
			// Allow some overhead but should be significantly less than 200ms
			expect(duration).toBeLessThan(150)
			expect(finishSubTaskSpy).toHaveBeenCalledTimes(5)

			// Verify all were called with correct parameters
			subagents.forEach((subagent, i) => {
				expect(finishSubTaskSpy).toHaveBeenCalledWith("", subagent, true)
			})
		})

		it("should handle timeout during cancellation gracefully", async () => {
			// Create subagents
			const subagents = Array.from({ length: 3 }, (_, i) => ({
				taskId: `subagent-${i}`,
				instanceId: `instance-${i}`,
				abort: false,
				abandoned: false,
				isParallel: true,
				parentTask: mockParentTask,
				abortTask: vi.fn().mockResolvedValue(undefined),
				emit: vi.fn(),
				removeAllListeners: vi.fn(),
				dispose: vi.fn(),
			}))

			subagents.forEach((s) => provider["clineSet"].add(s as any))

			// Mock finishSubTask to hang longer than timeout (6 seconds > 5 second timeout)
			vi.spyOn(provider, "finishSubTask" as any).mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 6000))
			})

			// Should complete due to timeout protection, not hang
			const startTime = Date.now()
			await provider.cancelAllSubagentsAndResumeParent()
			const duration = Date.now() - startTime

			// Should timeout after ~5 seconds, not hang for 18 seconds (6s * 3)
			expect(duration).toBeGreaterThan(4500)
			expect(duration).toBeLessThan(6000)

			// Verify force cleanup occurred - clineSet should be cleared
			expect(provider["clineSet"].size).toBe(0)
			expect(provider["parallelTasksState"]).toEqual([])
		}, 10000) // Allow 10s for this test

		it("should isolate errors and continue with other subagents", async () => {
			// Create mix of good and problematic subagents
			const goodSubagent1 = {
				taskId: "good-1",
				instanceId: "good-instance-1",
				abort: false,
				abandoned: false,
				isParallel: true,
				parentTask: mockParentTask,
				abortTask: vi.fn().mockResolvedValue(undefined),
				emit: vi.fn(),
				removeAllListeners: vi.fn(),
				dispose: vi.fn(),
			}

			const problematicSubagent = {
				taskId: "problematic",
				instanceId: "prob-instance",
				abort: false,
				abandoned: false,
				isParallel: true,
				parentTask: mockParentTask,
				abortTask: vi.fn().mockResolvedValue(undefined),
				emit: vi.fn(),
				removeAllListeners: vi.fn(),
				dispose: vi.fn(),
			}

			const goodSubagent2 = {
				taskId: "good-2",
				instanceId: "good-instance-2",
				abort: false,
				abandoned: false,
				isParallel: true,
				parentTask: mockParentTask,
				abortTask: vi.fn().mockResolvedValue(undefined),
				emit: vi.fn(),
				removeAllListeners: vi.fn(),
				dispose: vi.fn(),
			}

			provider["clineSet"].add(goodSubagent1 as any)
			provider["clineSet"].add(problematicSubagent as any)
			provider["clineSet"].add(goodSubagent2 as any)

			// Mock finishSubTask to fail for problematic subagent
			const finishSubTaskSpy = vi
				.spyOn(provider, "finishSubTask" as any)
				.mockImplementation(async (...args: any[]) => {
					const [msg, subagent, cancelled] = args
					if (subagent.taskId === "problematic") {
						throw new Error("Simulated cleanup failure")
					}
					// Good subagents succeed normally
					provider["clineSet"].delete(subagent)
				})

			// Should not throw despite one subagent failing
			await expect(provider.cancelAllSubagentsAndResumeParent()).resolves.not.toThrow()

			// Verify all subagents were attempted
			expect(finishSubTaskSpy).toHaveBeenCalledTimes(3)

			// Verify error isolation - problematic subagent should still be removed from set
			expect(provider["clineSet"].size).toBe(0)
		})

		it("should provide detailed logging for cleanup results", async () => {
			// Create subagents
			const subagents = Array.from({ length: 3 }, (_, i) => ({
				taskId: `subagent-${i}`,
				instanceId: `instance-${i}`,
				abort: false,
				abandoned: false,
				isParallel: true,
				parentTask: mockParentTask,
				abortTask: vi.fn().mockResolvedValue(undefined),
				emit: vi.fn(),
				removeAllListeners: vi.fn(),
				dispose: vi.fn(),
			}))

			subagents.forEach((s) => provider["clineSet"].add(s as any))

			// Mock console.log to capture logging
			const consoleLogSpy = vi.spyOn(console, "log")

			// Mock finishSubTask - first one fails, others succeed
			vi.spyOn(provider, "finishSubTask" as any).mockImplementation(async (...args: any[]) => {
				const [msg, subagent] = args
				if (subagent.taskId === "subagent-0") {
					throw new Error("First subagent fails")
				}
				provider["clineSet"].delete(subagent)
			})

			await provider.cancelAllSubagentsAndResumeParent()

			// Verify summary logging
			expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[SubAgentManager] Cleanup summary:"))

			// Should log 2 successful, 1 failed
			const summaryCall = consoleLogSpy.mock.calls.find((call) => call[0] && call[0].includes("Cleanup summary:"))
			expect(summaryCall).toBeDefined()
			if (summaryCall) {
				expect(summaryCall[0]).toMatch(/2 successful, 1 failed/)
			}
		})
	})
})
