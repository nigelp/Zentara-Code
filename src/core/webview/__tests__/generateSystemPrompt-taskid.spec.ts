// Tests for generateSystemPrompt with task ID integration
import { describe, it, expect, vi, beforeEach } from "vitest"
import * as vscode from "vscode"
import "../../../utils/path" // Enable String.prototype.toPosix()

import { generateSystemPrompt } from "../generateSystemPrompt"
import { ClineProvider } from "../ClineProvider"
import { clearAllCaches } from "../../../roo_tool_prompt_management/tool-optimization-integration"

// Mock vscode
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

// Mock other dependencies
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

vi.mock("../../prompts/sections/modes", () => ({
	getModesSection: vi.fn().mockResolvedValue("====\n\nMODES\n\n- Test modes section"),
}))

vi.mock("../../prompts/sections/custom-instructions", () => ({
	addCustomInstructions: vi.fn().mockResolvedValue(""),
}))

vi.mock("../../../api", () => ({
	buildApiHandler: vi.fn().mockReturnValue({
		getModel: () => ({
			info: {
				supportsComputerUse: true,
			},
		}),
	}),
}))

// Create mock provider
const createMockProvider = (): ClineProvider => {
	const mockContext = {
		extensionPath: "/mock/extension/path",
		globalStoragePath: "/mock/storage/path",
		globalStorageUri: { fsPath: "/mock/settings/path" },
		extension: { packageJSON: { version: "1.0.0" } },
	} as unknown as vscode.ExtensionContext

	return {
		context: mockContext,
		cwd: "/test/workspace",
		getState: vi.fn().mockResolvedValue({
			apiConfiguration: { apiProvider: "anthropic" },
			customModePrompts: undefined,
			customInstructions: undefined,
			browserViewportSize: "900x600",
			diffEnabled: false,
			mcpEnabled: false,
			fuzzyMatchThreshold: 0.9,
			experiments: {},
			enableMcpServerCreation: false,
			browserToolEnabled: true,
			language: "en",
			maxReadFileLine: -1,
			maxConcurrentFileReads: 5,
		}),
		customModesManager: {
			getCustomModes: vi.fn().mockResolvedValue([]),
		},
		getCurrentCline: vi.fn().mockReturnValue({
			rooIgnoreController: {
				getInstructions: vi.fn().mockReturnValue(""),
			},
		}),
		getMcpHub: vi.fn().mockReturnValue(undefined),
	} as unknown as ClineProvider
}

describe("generateSystemPrompt Task ID Integration", () => {
	let mockProvider: ClineProvider

	beforeEach(() => {
		vi.clearAllMocks()
		clearAllCaches()
		mockProvider = createMockProvider()
	})

	it("should use 'default' taskId for webview system prompt generation", async () => {
		const message = { type: "getSystemPrompt" as const, mode: "code" }

		const systemPrompt = await generateSystemPrompt(mockProvider, message)

		expect(systemPrompt).toContain("# Tools")
		expect(typeof systemPrompt).toBe("string")
		expect(systemPrompt.length).toBeGreaterThan(0)
	})

	it("should handle different modes in webview context", async () => {
		const message1 = { type: "getSystemPrompt" as const, mode: "code" }
		const message2 = { type: "getSystemPrompt" as const, mode: "ask" }

		const prompt1 = await generateSystemPrompt(mockProvider, message1)
		const prompt2 = await generateSystemPrompt(mockProvider, message2)

		expect(prompt1).toContain("# Tools")
		expect(prompt2).toContain("# Tools")
		expect(typeof prompt1).toBe("string")
		expect(typeof prompt2).toBe("string")
		expect(prompt1.length).toBeGreaterThan(0)
		expect(prompt2.length).toBeGreaterThan(0)
	})

	it("should work with undefined mode (fallback to default)", async () => {
		const message = { type: "getSystemPrompt" as const } // no mode specified

		const systemPrompt = await generateSystemPrompt(mockProvider, message)

		expect(systemPrompt).toContain("# Tools")
		expect(typeof systemPrompt).toBe("string")
		expect(systemPrompt.length).toBeGreaterThan(0)
	})

	it("should handle browser tool configuration", async () => {
		// Mock provider state with browser tools enabled
		mockProvider.getState = vi.fn().mockResolvedValue({
			apiConfiguration: { apiProvider: "anthropic" },
			browserViewportSize: "1280x720",
			browserToolEnabled: true,
			mcpEnabled: false,
			diffEnabled: false,
			experiments: {},
			maxConcurrentFileReads: 5,
		})

		const message = { type: "getSystemPrompt" as const, mode: "code" }

		const systemPrompt = await generateSystemPrompt(mockProvider, message)

		expect(systemPrompt).toContain("# Tools")
		expect(systemPrompt.length).toBeGreaterThan(0)
	})

	it("should handle MCP configuration", async () => {
		// Mock provider state with MCP enabled
		mockProvider.getState = vi.fn().mockResolvedValue({
			apiConfiguration: { apiProvider: "anthropic" },
			mcpEnabled: true,
			enableMcpServerCreation: true,
			experiments: {},
			maxConcurrentFileReads: 5,
		})

		mockProvider.getMcpHub = vi.fn().mockReturnValue({
			getServers: () => [{ name: "test-server" }],
		})

		const message = { type: "getSystemPrompt" as const, mode: "code" }

		const systemPrompt = await generateSystemPrompt(mockProvider, message)

		expect(systemPrompt).toContain("# Tools")
		expect(systemPrompt.length).toBeGreaterThan(0)
	})
})
