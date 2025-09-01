// npx vitest src/core/assistant-message/__tests__/createIndividualToolHandler.test.ts

import { describe, it, expect, beforeEach, vi } from "vitest"
import { Task } from "../../task/Task"
import { debugTool } from "../../tools/debugTool"
import { lspTool } from "../../tools/lspTool"
import type {
	ToolUse,
	DebugToolUse,
	ToolResponse,
	AskApproval,
	HandleError,
	PushToolResult,
} from "../../../shared/tools"
import type { ClineAsk, ToolProgressStatus } from "@roo-code/types"

// Mock dependencies
vi.mock("vscode", () => {
	const mockDisposable = { dispose: vi.fn() }
	const mockEventEmitter = vi.fn(() => ({
		event: vi.fn(),
		fire: vi.fn(),
		dispose: vi.fn(),
	}))
	return {
		EventEmitter: mockEventEmitter,
		window: {
			createOutputChannel: vi.fn(() => ({
				appendLine: vi.fn(),
				show: vi.fn(),
				dispose: vi.fn(),
				clear: vi.fn(),
				hide: vi.fn(),
				name: "mockOutputChannel",
				append: vi.fn(),
				replace: vi.fn(),
			})),
		},
		debug: {
			onDidStartDebugSession: vi.fn(() => mockDisposable),
			onDidTerminateDebugSession: vi.fn(() => mockDisposable),
			onDidReceiveDebugSessionCustomEvent: vi.fn(() => mockDisposable),
			breakpoints: vi.fn(() => []),
			addBreakpoints: vi.fn(),
			removeBreakpoints: vi.fn(),
			startDebugging: vi.fn().mockResolvedValue(true),
			stopDebugging: vi.fn().mockResolvedValue(undefined),
			activeDebugSession: undefined,
			activeDebugConsole: {
				appendLine: vi.fn(),
				append: vi.fn(),
			},
		},
		commands: {
			executeCommand: vi.fn(),
			registerCommand: vi.fn(() => mockDisposable),
		},
		Uri: {
			parse: vi.fn((path) => ({ fsPath: path, path, scheme: "file" })),
			file: vi.fn((path) => ({ fsPath: path, path, scheme: "file" })),
		},
		workspace: {
			getConfiguration: vi.fn(() => ({
				get: vi.fn(),
				update: vi.fn(),
			})),
			workspaceFolders: [],
			fs: {
				readFile: vi.fn(),
				writeFile: vi.fn(),
				delete: vi.fn(),
				stat: vi.fn(),
				readDirectory: vi.fn(),
				createDirectory: vi.fn(),
			},
		},
	}
})

vi.mock("../../tools/debugTool")
vi.mock("../../tools/lspTool")

// Mock outputChannel
vi.mock("../../../roo_debug/src/vscodeUtils", () => ({
	outputChannel: {
		appendLine: vi.fn(),
		show: vi.fn(),
		clear: vi.fn(),
		hide: vi.fn(),
	},
}))

// Import the functions we're testing - since they're not exported, we need to extract them
// For this test, we'll implement the factory functions as they appear in presentAssistantMessage.ts

/**
 * Generic block reconstruction function that handles all meta-tool patterns
 */
function reconstructBlockForMetaTool<TBlock extends { params: any }>(
	originalBlock: ToolUse,
	operationName: string,
	toolGroupName: string,
): TBlock {
	// Derive configuration from toolGroupName
	const useFixedMetaToolName = toolGroupName
	const operationParamName = `${toolGroupName}_operation`

	const reconstructedBlock = {
		type: "tool_use" as const,
		name: useFixedMetaToolName,
		params: {
			...originalBlock.params,
			[operationParamName]: operationName,
		},
		partial: originalBlock.partial,
	}
	return reconstructedBlock as unknown as TBlock
}

/**
 * Factory function that creates individual tool handlers for meta-tools.
 * This eliminates code duplication between debug, lsp, and future similar tool patterns.
 * All configuration is derived from the single toolGroupName parameter.
 */
function createIndividualToolHandler<TBlock extends { params: any }>(
	toolGroupName: string,
	metaToolFunction: (
		cline: Task,
		block: TBlock,
		askApproval: AskApproval,
		handleError: HandleError,
		pushToolResult: PushToolResult,
	) => Promise<void>,
) {
	// Derive all configuration from toolGroupName
	const toolPrefix = `${toolGroupName}_`
	const toolDisplayName = toolGroupName

	/**
	 * Helper function to handle the invocation of individual operation tools.
	 * It reconstructs the tool call to be compatible with the existing meta-tool
	 * and then calls the meta-tool.
	 */
	return async function handleIndividualTool(
		cline: Task,
		block: ToolUse,
		askApproval: AskApproval,
		handleError: HandleError,
		pushToolResult: PushToolResult,
	) {
		const operationName = block.name.substring(toolPrefix.length)

		// Wait if block until block is full
		if (block.partial) {
			return
		}

		// Reconstruct the block for the meta-tool using the unified reconstruction function
		const reconstructedBlock = reconstructBlockForMetaTool<TBlock>(block, operationName, toolGroupName)

		// Call the meta-tool with the reconstructed block
		await metaToolFunction(cline, reconstructedBlock, askApproval, handleError, pushToolResult)
	}
}

describe("createIndividualToolHandler Factory Function", () => {
	let mockTask: Task
	let mockAskApproval: any
	let mockHandleError: any
	let mockPushToolResult: any
	let mockDebugTool: any
	let mockLspTool: any
	let mockCustomMetaTool: any

	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks()

		mockAskApproval = vi.fn().mockResolvedValue(true)
		mockHandleError = vi.fn().mockResolvedValue(undefined)
		mockPushToolResult = vi.fn()
		mockDebugTool = debugTool as any
		mockLspTool = lspTool as any
		mockCustomMetaTool = vi.fn().mockResolvedValue(undefined)

		// Mock Task instance
		mockTask = {
			taskId: "test-task",
			instanceId: 1,
		} as any
	})

	describe("Factory Function Behavior", () => {
		it("should create a handler function when called", () => {
			const handler = createIndividualToolHandler("debug", mockDebugTool)

			expect(typeof handler).toBe("function")
			expect(handler.length).toBe(5) // Should accept 5 parameters
		})

		it("should create different handlers for different tool groups", () => {
			const debugHandler = createIndividualToolHandler("debug", mockDebugTool)
			const lspHandler = createIndividualToolHandler("lsp", mockLspTool)

			expect(debugHandler).not.toBe(lspHandler)
			expect(typeof debugHandler).toBe("function")
			expect(typeof lspHandler).toBe("function")
		})
	})

	describe("Debug Tool Handler", () => {
		let debugHandler: ReturnType<typeof createIndividualToolHandler>

		beforeEach(() => {
			debugHandler = createIndividualToolHandler<DebugToolUse>("debug", mockDebugTool)
		})

		it("should correctly transform debug_launch and call debugTool", async () => {
			const launchToolUse: ToolUse = {
				type: "tool_use",
				name: "debug_launch" as any,
				params: {
					program: "test.py",
					stopOnEntry: "true",
					arg: "--version",
				},
				partial: false,
			}

			await debugHandler(mockTask, launchToolUse, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockDebugTool).toHaveBeenCalledTimes(1)
			const calledWithBlock = mockDebugTool.mock.calls[0][1] as any

			expect(calledWithBlock.name).toBe("debug")
			expect(calledWithBlock.params.debug_operation).toBe("launch")
			expect(calledWithBlock.params.program).toBe("test.py")
			expect(calledWithBlock.params.stopOnEntry).toBe("true")
			expect(calledWithBlock.params.arg).toBe("--version")
			expect(calledWithBlock.partial).toBe(false)
		})

		it("should correctly transform debug_set_breakpoint and call debugTool", async () => {
			const setBreakpointToolUse: ToolUse = {
				type: "tool_use",
				name: "debug_set_breakpoint" as any,
				params: {
					path: "src/app.ts",
					line: "42",
					condition: "i > 10",
				},
				partial: false,
			}

			await debugHandler(mockTask, setBreakpointToolUse, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockDebugTool).toHaveBeenCalledTimes(1)
			const calledWithBlock = mockDebugTool.mock.calls[0][1] as any

			expect(calledWithBlock.name).toBe("debug")
			expect(calledWithBlock.params.debug_operation).toBe("set_breakpoint")
			expect(calledWithBlock.params.path).toBe("src/app.ts")
			expect(calledWithBlock.params.line).toBe("42")
			expect(calledWithBlock.params.condition).toBe("i > 10")
			expect(calledWithBlock.partial).toBe(false)
		})

		it("should handle debug tool with no extra parameters", async () => {
			const continueToolUse: ToolUse = {
				type: "tool_use",
				name: "debug_continue" as any,
				params: {},
				partial: false,
			}

			await debugHandler(mockTask, continueToolUse, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockDebugTool).toHaveBeenCalledTimes(1)
			const calledWithBlock = mockDebugTool.mock.calls[0][1] as any

			expect(calledWithBlock.name).toBe("debug")
			expect(calledWithBlock.params.debug_operation).toBe("continue")
			expect(Object.keys(calledWithBlock.params).length).toBe(1) // Only debug_operation
			expect(calledWithBlock.partial).toBe(false)
		})

		it("should not call meta-tool when block is partial", async () => {
			const partialToolUse: ToolUse = {
				type: "tool_use",
				name: "debug_launch" as any,
				params: { program: "test.py" },
				partial: true,
			}

			await debugHandler(mockTask, partialToolUse, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockDebugTool).not.toHaveBeenCalled()
		})
	})

	describe("LSP Tool Handler", () => {
		let lspHandler: ReturnType<typeof createIndividualToolHandler>

		beforeEach(() => {
			lspHandler = createIndividualToolHandler<ToolUse>("lsp", mockLspTool)
		})

		it("should correctly transform lsp_find_usages and call lspTool", async () => {
			const findUsagesToolUse: ToolUse = {
				type: "tool_use",
				name: "lsp_find_usages" as any,
				params: {
					path: "file:///test.ts",
					line: "10",
				},
				partial: false,
			}

			await lspHandler(mockTask, findUsagesToolUse, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockLspTool).toHaveBeenCalledTimes(1)
			const calledWithBlock = mockLspTool.mock.calls[0][1] as any

			expect(calledWithBlock.name).toBe("lsp")
			expect(calledWithBlock.params.lsp_operation).toBe("find_usages")
			expect(calledWithBlock.params.path).toBe("file:///test.ts")
			expect(calledWithBlock.params.line).toBe("10")
			expect(calledWithBlock.partial).toBe(false)
		})

		it("should correctly transform lsp_go_to_definition and call lspTool", async () => {
			const gotoDefToolUse: ToolUse = {
				type: "tool_use",
				name: "lsp_go_to_definition" as any,
				params: {
					path: "file:///main.ts",
					content: "20,15",
				},
				partial: false,
			}

			await lspHandler(mockTask, gotoDefToolUse, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockLspTool).toHaveBeenCalledTimes(1)
			const calledWithBlock = mockLspTool.mock.calls[0][1] as any

			expect(calledWithBlock.name).toBe("lsp")
			expect(calledWithBlock.params.lsp_operation).toBe("go_to_definition")
			expect(calledWithBlock.params.path).toBe("file:///main.ts")
			expect(calledWithBlock.params.content).toBe("20,15")
			expect(calledWithBlock.partial).toBe(false)
		})

		it("should not call meta-tool when block is partial", async () => {
			const partialToolUse: ToolUse = {
				type: "tool_use",
				name: "lsp_find_usages" as any,
				params: { path: "file:///test.ts" },
				partial: true,
			}

			await lspHandler(mockTask, partialToolUse, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockLspTool).not.toHaveBeenCalled()
		})
	})

	describe("Custom Tool Group", () => {
		let customHandler: ReturnType<typeof createIndividualToolHandler>

		beforeEach(() => {
			customHandler = createIndividualToolHandler<ToolUse>("custom", mockCustomMetaTool)
		})

		it("should work with custom tool group names", async () => {
			const customToolUse: ToolUse = {
				type: "tool_use",
				name: "custom_special_operation" as any,
				params: {
					path: "test-data",
					content: "enabled",
				},
				partial: false,
			}

			await customHandler(mockTask, customToolUse, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockCustomMetaTool).toHaveBeenCalledTimes(1)
			const calledWithBlock = mockCustomMetaTool.mock.calls[0][1] as any

			expect(calledWithBlock.name).toBe("custom")
			expect(calledWithBlock.params.custom_operation).toBe("special_operation")
			expect(calledWithBlock.params.path).toBe("test-data")
			expect(calledWithBlock.params.content).toBe("enabled")
			expect(calledWithBlock.partial).toBe(false)
		})
	})

	describe("Block Reconstruction Logic", () => {
		it("should correctly derive operation names from tool names", () => {
			const testCases = [
				{ toolName: "debug_launch", toolGroup: "debug", expectedOp: "launch" },
				{ toolName: "lsp_find_usages", toolGroup: "lsp", expectedOp: "find_usages" },
				{
					toolName: "custom_complex_operation_name",
					toolGroup: "custom",
					expectedOp: "complex_operation_name",
				},
				{ toolName: "test_simple", toolGroup: "test", expectedOp: "simple" },
			]

			testCases.forEach(({ toolName, toolGroup, expectedOp }) => {
				const originalBlock: ToolUse = {
					type: "tool_use",
					name: toolName as any,
					params: { path: "value" } as any,
					partial: false,
				}

				const reconstructed = reconstructBlockForMetaTool(originalBlock, expectedOp, toolGroup)

				expect((reconstructed as any).name).toBe(toolGroup)
				expect((reconstructed as any).params[`${toolGroup}_operation`]).toBe(expectedOp)
				expect((reconstructed as any).params.path).toBe("value")
				expect((reconstructed as any).partial).toBe(false)
			})
		})

		it("should preserve all original parameters in reconstructed block", () => {
			const originalBlock: ToolUse = {
				type: "tool_use",
				name: "debug_launch" as any,
				params: {
					program: "app.py",
					args: "--verbose",
					env: "production",
					stopOnEntry: "true",
					cwd: "/workspace",
				},
				partial: false,
			}

			const reconstructed = reconstructBlockForMetaTool<any>(originalBlock, "launch", "debug")

			expect(reconstructed.params.debug_operation).toBe("launch")
			expect(reconstructed.params.program).toBe("app.py")
			expect(reconstructed.params.args).toBe("--verbose")
			expect(reconstructed.params.env).toBe("production")
			expect(reconstructed.params.stopOnEntry).toBe("true")
			expect(reconstructed.params.cwd).toBe("/workspace")
		})

		it("should preserve partial flag in reconstructed block", () => {
			const partialBlock: ToolUse = {
				type: "tool_use",
				name: "lsp_hover" as any,
				params: { path: "file:///test.ts" },
				partial: true,
			}

			const reconstructed = reconstructBlockForMetaTool(partialBlock, "hover", "lsp")

			expect((reconstructed as any).partial).toBe(true)
		})
	})

	describe("Handler Function Signatures", () => {
		it("should pass all parameters correctly to meta-tool function", async () => {
			const handler = createIndividualToolHandler<DebugToolUse>("debug", mockDebugTool)

			const toolUse: ToolUse = {
				type: "tool_use",
				name: "debug_launch" as any,
				params: { program: "test.py" },
				partial: false,
			}

			await handler(mockTask, toolUse, mockAskApproval, mockHandleError, mockPushToolResult)

			expect(mockDebugTool).toHaveBeenCalledWith(
				mockTask,
				expect.any(Object), // reconstructed block
				mockAskApproval,
				mockHandleError,
				mockPushToolResult,
			)
		})

		it("should handle errors from meta-tool function", async () => {
			const errorHandler = createIndividualToolHandler<DebugToolUse>("debug", mockDebugTool)
			const testError = new Error("Meta-tool failed")
			mockDebugTool.mockRejectedValueOnce(testError)

			const toolUse: ToolUse = {
				type: "tool_use",
				name: "debug_launch" as any,
				params: { program: "test.py" },
				partial: false,
			}

			await expect(
				errorHandler(mockTask, toolUse, mockAskApproval, mockHandleError, mockPushToolResult),
			).rejects.toThrow("Meta-tool failed")
		})
	})
})
