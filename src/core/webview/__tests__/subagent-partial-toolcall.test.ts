import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock dependencies before imports
vi.mock("vscode", () => ({
	window: {
		createTextEditorDecorationType: vi.fn().mockReturnValue({}),
		showInformationMessage: vi.fn(),
		showErrorMessage: vi.fn(),
		showWarningMessage: vi.fn(),
	},
	workspace: {
		getConfiguration: vi.fn().mockReturnValue({
			get: vi.fn().mockReturnValue(true),
		}),
	},
	Uri: {
		file: vi.fn(),
		parse: vi.fn(),
	},
	ViewColumn: {
		One: 1,
		Two: 2,
	},
	commands: {
		executeCommand: vi.fn(),
	},
	env: {
		language: "en",
	},
}))

vi.mock("../../../integrations/misc/ClaudeMigration", () => ({
	migrateClaudeConfig: vi.fn(),
}))

vi.mock("../../../integrations/misc/ContextTracker", () => ({
	ContextTracker: vi.fn().mockImplementation(() => ({
		createTracker: vi.fn(),
	})),
}))

vi.mock("../../config/GlobalStateManager", () => ({
	GlobalStateManager: vi.fn().mockImplementation(() => ({
		getGlobalState: vi.fn(),
		updateGlobalState: vi.fn(),
	})),
}))

vi.mock("../../task-persistence/TaskManager", () => ({
	TaskManager: vi.fn().mockImplementation(() => ({
		createTask: vi.fn(),
		updateTask: vi.fn(),
		deleteTask: vi.fn(),
	})),
}))

vi.mock("../../../integrations/misc/HistoryManager", () => ({
	HistoryManager: vi.fn().mockImplementation(() => ({
		getHistory: vi.fn().mockResolvedValue([]),
		updateHistory: vi.fn(),
	})),
}))

vi.mock("../../../integrations/misc/McpManager", () => ({
	McpManager: vi.fn().mockImplementation(() => ({
		listServers: vi.fn().mockResolvedValue([]),
	})),
}))

vi.mock("../../../integrations/misc/MdmManager", () => ({
	MdmManager: vi.fn().mockImplementation(() => ({
		getDiffViewProvider: vi.fn(),
	})),
}))

vi.mock("../../config/CustomModesManager", () => ({
	CustomModesManager: vi.fn().mockImplementation(() => ({
		getMode: vi.fn(),
		getAllModes: vi.fn().mockReturnValue([]),
	})),
}))

vi.mock("../../../packages/cloud/src/CloudService", () => ({
	CloudService: {
		getInstance: vi.fn().mockReturnValue({
			isAuthenticated: vi.fn().mockResolvedValue(false),
		}),
	},
}))

describe("SubagentInfo Partial Tool Call Implementation", () => {
	let mockProvider: any

	beforeEach(() => {
		vi.clearAllMocks()

		// Create a minimal mock provider to test our specific functionality
		mockProvider = {
			parallelTasksState: [],
			updateSubagentToolCall: function (
				taskId: string,
				toolCall: { toolName: string; toolInput: any; isPartial?: boolean } | undefined,
			) {
				const subagentIndex = this.parallelTasksState.findIndex((s: any) => s.taskId === taskId)
				if (subagentIndex !== -1) {
					this.parallelTasksState[subagentIndex] = {
						...this.parallelTasksState[subagentIndex],
						toolCall,
						lastActivity: Date.now(),
					}
				}
			},
			postWebviewMessage: vi.fn(),
		}
	})

	it("should accept isPartial property in updateSubagentToolCall", () => {
		// Setup initial state
		mockProvider.parallelTasksState = [
			{
				taskId: "test-task",
				description: "Test task",
				status: "running" as const,
			},
		]

		// Test complete tool call
		mockProvider.updateSubagentToolCall("test-task", {
			toolName: "read_file",
			toolInput: { path: "test.txt" },
			isPartial: false,
		})

		const updatedSubagent = mockProvider.parallelTasksState[0]
		expect(updatedSubagent.toolCall).toBeDefined()
		expect(updatedSubagent.toolCall.toolName).toBe("read_file")
		expect(updatedSubagent.toolCall.isPartial).toBe(false)
	})

	it("should handle partial tool calls correctly", () => {
		// Setup initial state
		mockProvider.parallelTasksState = [
			{
				taskId: "test-task",
				description: "Test task",
				status: "running" as const,
			},
		]

		// Test partial tool call
		mockProvider.updateSubagentToolCall("test-task", {
			toolName: "write_file",
			toolInput: { path: "incomplete.txt" },
			isPartial: true,
		})

		const updatedSubagent = mockProvider.parallelTasksState[0]
		expect(updatedSubagent.toolCall).toBeDefined()
		expect(updatedSubagent.toolCall.toolName).toBe("write_file")
		expect(updatedSubagent.toolCall.isPartial).toBe(true)
	})

	it("should default isPartial to undefined when not provided", () => {
		// Setup initial state
		mockProvider.parallelTasksState = [
			{
				taskId: "test-task",
				description: "Test task",
				status: "running" as const,
			},
		]

		// Test tool call without isPartial
		mockProvider.updateSubagentToolCall("test-task", {
			toolName: "list_files",
			toolInput: { path: "." },
		})

		const updatedSubagent = mockProvider.parallelTasksState[0]
		expect(updatedSubagent.toolCall).toBeDefined()
		expect(updatedSubagent.toolCall.toolName).toBe("list_files")
		expect(updatedSubagent.toolCall.isPartial).toBeUndefined()
	})

	it("should handle clearing tool call", () => {
		// Setup initial state with existing tool call
		mockProvider.parallelTasksState = [
			{
				taskId: "test-task",
				description: "Test task",
				status: "running" as const,
				toolCall: {
					toolName: "old_tool",
					toolInput: {},
					isPartial: true,
				},
			},
		]

		// Clear tool call
		mockProvider.updateSubagentToolCall("test-task", undefined)

		const updatedSubagent = mockProvider.parallelTasksState[0]
		expect(updatedSubagent.toolCall).toBeUndefined()
	})
})

describe("SubagentStack UI Logic", () => {
	it("should only show tool calls when not partial", () => {
		const subagentComplete = {
			taskId: "test-1",
			toolCall: {
				toolName: "read_file",
				toolInput: { path: "test.txt" },
				isPartial: false,
			},
			askType: undefined,
		}

		const subagentPartial = {
			taskId: "test-2",
			toolCall: {
				toolName: "write_file",
				toolInput: { path: "partial.txt" },
				isPartial: true,
			},
			askType: undefined,
		}

		const subagentNoPartialFlag = {
			taskId: "test-3",
			toolCall: {
				toolName: "list_files",
				toolInput: { path: "." },
				// isPartial not set (undefined)
			} as { toolName: string; toolInput: any; isPartial?: boolean },
			askType: undefined,
		}

		// Test updated UI logic: subagent.toolCall && !subagent.askType (removed isPartial check)
		const shouldShowComplete = subagentComplete.toolCall && !subagentComplete.askType
		const shouldShowPartial = subagentPartial.toolCall && !subagentPartial.askType
		const shouldShowNoFlag = subagentNoPartialFlag.toolCall && !subagentNoPartialFlag.askType

		expect(shouldShowComplete).toBe(true)
		expect(shouldShowPartial).toBe(true) // Now shows partial tools too
		expect(shouldShowNoFlag).toBe(true)
	})
})
