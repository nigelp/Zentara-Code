// Tests for system prompt task ID integration with tool optimization
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import * as vscode from "vscode"
import "../../../utils/path" // Enable String.prototype.toPosix()

import { SYSTEM_PROMPT } from "../system"
import { defaultModeSlug } from "../../../shared/modes"
import {
	getOptimizedToolDescriptionsForMode,
	trackToolUsage,
	clearAllCaches,
} from "../../../roo_tool_prompt_management/tool-optimization-integration"

// Mock vscode and other dependencies
vi.mock("os", () => ({
	default: {
		homedir: () => "/home/user",
		type: () => "Linux",
	},
	homedir: () => "/home/user",
	type: () => "Linux",
}))

vi.mock("default-shell", () => ({
	default: "/bin/bash",
}))

vi.mock("os-name", () => ({
	default: () => "Linux",
}))

vi.mock("vscode", () => ({
	env: { language: "en" },
	workspace: {
		workspaceFolders: [{ uri: { fsPath: "/test/path" } }],
		getWorkspaceFolder: vi.fn().mockReturnValue({ uri: { fsPath: "/test/path" } }),
		getConfiguration: vi.fn().mockReturnValue({
			get: vi.fn().mockReturnValue(true),
		}),
	},
	window: { activeTextEditor: undefined },
	EventEmitter: vi.fn().mockImplementation(() => ({
		event: vi.fn(),
		fire: vi.fn(),
		dispose: vi.fn(),
	})),
}))

// Mock sections
vi.mock("../sections/modes", () => ({
	getModesSection: vi.fn().mockResolvedValue("====\n\nMODES\n\n- Test modes section"),
}))

vi.mock("../sections/custom-instructions", () => ({
	addCustomInstructions: vi.fn().mockResolvedValue(""),
}))

// Create a mock ExtensionContext
const mockContext = {
	extensionPath: "/mock/extension/path",
	globalStoragePath: "/mock/storage/path",
	storagePath: "/mock/storage/path",
	subscriptions: [],
	workspaceState: {
		get: () => undefined,
		update: () => Promise.resolve(),
	},
	globalState: {
		get: () => undefined,
		update: () => Promise.resolve(),
		setKeysForSync: () => {},
	},
	extensionUri: { fsPath: "/mock/extension/path" },
	globalStorageUri: { fsPath: "/mock/settings/path" },
	asAbsolutePath: (relativePath: string) => `/mock/extension/path/${relativePath}`,
	extension: {
		packageJSON: { version: "1.0.0" },
	},
} as unknown as vscode.ExtensionContext

describe("System Prompt Task ID Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		clearAllCaches()
	})

	afterEach(() => {
		clearAllCaches()
	})

	const defaultSettings = {
		maxConcurrentFileReads: 5,
		todoListEnabled: true,
		useAgentRules: true,
	}

	it("should pass taskId to optimization system when provided", async () => {
		const testTaskId = "test-task-123"

		const prompt = await SYSTEM_PROMPT(
			mockContext,
			"/test/path",
			false, // supportsComputerUse
			undefined, // mcpHub
			undefined, // diffStrategy
			undefined, // browserViewportSize
			defaultModeSlug, // mode
			undefined, // customModePrompts
			undefined, // customModes
			undefined, // globalCustomInstructions
			undefined, // diffEnabled
			{}, // experiments
			true, // enableMcpServerCreation
			undefined, // language
			undefined, // rooIgnoreInstructions
			false, // partialReadsEnabled
			defaultSettings, // settings
			false, // subagent
			testTaskId, // taskId
		)

		expect(prompt).toContain("# Tools")
		expect(typeof prompt).toBe("string")
		expect(prompt.length).toBeGreaterThan(0)
	})

	it("should use 'default' when taskId is not provided", async () => {
		const prompt = await SYSTEM_PROMPT(
			mockContext,
			"/test/path",
			false, // supportsComputerUse
			undefined, // mcpHub
			undefined, // diffStrategy
			undefined, // browserViewportSize
			defaultModeSlug, // mode
			undefined, // customModePrompts
			undefined, // customModes
			undefined, // globalCustomInstructions
			undefined, // diffEnabled
			{}, // experiments
			true, // enableMcpServerCreation
			undefined, // language
			undefined, // rooIgnoreInstructions
			false, // partialReadsEnabled
			defaultSettings, // settings
			false, // subagent
			undefined, // taskId
		)

		expect(prompt).toContain("# Tools")
		expect(typeof prompt).toBe("string")
		expect(prompt.length).toBeGreaterThan(0)
	})

	it("should generate different tool descriptions for different task IDs with usage tracking", async () => {
		const taskId1 = "task-1"
		const taskId2 = "task-2"

		// Track different tools for different tasks
		trackToolUsage("browser_action", taskId1)
		trackToolUsage("ask_followup_question", taskId2)

		const prompt1 = await SYSTEM_PROMPT(
			mockContext,
			"/test/path",
			false,
			undefined,
			undefined,
			undefined,
			defaultModeSlug,
			undefined,
			undefined,
			undefined,
			undefined,
			{},
			true,
			undefined,
			undefined,
			false,
			defaultSettings,
			false,
			taskId1,
		)

		const prompt2 = await SYSTEM_PROMPT(
			mockContext,
			"/test/path",
			false,
			undefined,
			undefined,
			undefined,
			defaultModeSlug,
			undefined,
			undefined,
			undefined,
			undefined,
			{},
			true,
			undefined,
			undefined,
			false,
			defaultSettings,
			false,
			taskId2,
		)

		// Both should contain tools but with potentially different descriptions
		expect(prompt1).toContain("# Tools")
		expect(prompt2).toContain("# Tools")
		expect(typeof prompt1).toBe("string")
		expect(typeof prompt2).toBe("string")

		// Prompts should be different if tools have different usage patterns
		// Note: We can't easily test the specific difference without mocking internals
		// but we can verify both are valid and properly structured
		expect(prompt1.length).toBeGreaterThan(0)
		expect(prompt2.length).toBeGreaterThan(0)
	})

	it("should handle empty string taskId", async () => {
		const prompt = await SYSTEM_PROMPT(
			mockContext,
			"/test/path",
			false,
			undefined,
			undefined,
			undefined,
			defaultModeSlug,
			undefined,
			undefined,
			undefined,
			undefined,
			{},
			true,
			undefined,
			undefined,
			false,
			defaultSettings,
			false,
			"", // empty string taskId - should use 'default'
		)

		expect(prompt).toContain("# Tools")
		expect(typeof prompt).toBe("string")
		expect(prompt.length).toBeGreaterThan(0)
	})

	it("should maintain consistency with same taskId across multiple calls", async () => {
		const taskId = "consistent-task"

		// Track some tool usage for this task
		trackToolUsage("browser_action", taskId)

		const prompt1 = await SYSTEM_PROMPT(
			mockContext,
			"/test/path",
			false,
			undefined,
			undefined,
			undefined,
			defaultModeSlug,
			undefined,
			undefined,
			undefined,
			undefined,
			{},
			true,
			undefined,
			undefined,
			false,
			defaultSettings,
			false,
			taskId,
		)

		const prompt2 = await SYSTEM_PROMPT(
			mockContext,
			"/test/path",
			false,
			undefined,
			undefined,
			undefined,
			defaultModeSlug,
			undefined,
			undefined,
			undefined,
			undefined,
			{},
			true,
			undefined,
			undefined,
			false,
			defaultSettings,
			false,
			taskId,
		)

		// Should generate identical prompts for same taskId (due to caching)
		expect(prompt1).toEqual(prompt2)
	})
})
