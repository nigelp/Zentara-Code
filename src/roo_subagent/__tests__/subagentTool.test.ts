import { subagentTool } from "../../core/tools/subagentTool"
import {
	ToolUse,
	AskApproval,
	HandleError,
	PushToolResult,
	RemoveClosingTag,
	ToolResponse,
	ToolParamName,
} from "../../shared/tools"
import { Task } from "../../core/task/Task"
import { ClineAsk, ToolProgressStatus, ToolName } from "@roo-code/types"
import { ClineAskResponse } from "../../shared/WebviewMessage"

// Test utilities
interface TestResult {
	testName: string
	passed: boolean
	error?: string
}

const testResults: TestResult[] = []

function assert(condition: boolean, message: string): void {
	if (!condition) {
		throw new Error(`Assertion failed: ${message}`)
	}
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
	if (actual !== expected) {
		throw new Error(`${message}. Expected: ${expected}, Actual: ${actual}`)
	}
}

function assertContains(str: string, substring: string, message: string): void {
	if (!str.includes(substring)) {
		throw new Error(`${message}. String "${str}" does not contain "${substring}"`)
	}
}

async function runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
	try {
		await testFn()
		testResults.push({ testName, passed: true })
		console.log(`✓ ${testName}`)
	} catch (error) {
		testResults.push({ testName, passed: false, error: error.message })
		console.log(`✗ ${testName}: ${error.message}`)
	}
}

// Mock implementations
class MockTask implements Partial<Task> {
	taskId = "test-task-123"
	consecutiveMistakeCount = 0
	enableCheckpoints = false

	recordToolError = (toolName: string) => {
		console.log(`recordToolError called with: ${toolName}`)
	}

	sayAndCreateMissingParamError = async (toolName: string, paramName: string) => {
		return `Missing parameter: ${paramName} for tool: ${toolName}`
	}

	// Simplified ask method for testing purposes
	ask = async (
		type: ClineAsk,
		text?: string,
		partial?: boolean,
		progressStatus?: ToolProgressStatus,
		isProtected?: boolean,
		context?: any,
	): Promise<{ response: ClineAskResponse; text?: string; images?: string[] }> => {
		console.log(`ask called with type: ${type}, text: ${text}, partial: ${partial}, isProtected: ${isProtected}`)
		return { response: "mock response" as ClineAskResponse }
	}

	checkpointSave = async (force: boolean) => {
		console.log(`checkpointSave called with force: ${force}`)
		return Promise.resolve()
	}

	emit = (...args: any[]) => {
		console.log(`emit called with args:`, args)
		return true // Return boolean as per EventEmitter.emit
	}
}

const createMockAskApproval = (shouldApprove: boolean): AskApproval => {
	return async (type, partialMessage, progressStatus, forceApproval) => {
		console.log(
			`askApproval called with type: ${type}, partialMessage: ${partialMessage}, progressStatus: ${progressStatus}, forceApproval: ${forceApproval}`,
		)
		return shouldApprove
	}
}

const mockHandleError: HandleError = async (context: string, error: any) => {
	console.log(`handleError called with context: ${context}, error:`, error)
}

let toolResultCalls: ToolResponse[] = []
const mockPushToolResult: PushToolResult = (content: ToolResponse) => {
	console.log(`pushToolResult called with: ${JSON.stringify(content)}`)
	toolResultCalls.push(content)
}

const mockRemoveClosingTag: RemoveClosingTag = (tag: ToolParamName, content?: string) => {
	return content || ""
}

// Tests
async function testPartialBlock() {
	const mockCline = new MockTask() as any
	const block: ToolUse = {
		type: "tool_use",
		name: "subagent" as ToolName, // Explicitly cast to ToolName
		params: {
			_text: JSON.stringify({
				description: "Test task",
				message: "Test message",
			}),
		},
		partial: true,
	}

	let askCalled = false
	mockCline.ask = async () => {
		askCalled = true
		return { response: "mock response" }
	}

	await subagentTool(
		mockCline,
		block,
		createMockAskApproval(true),
		mockHandleError,
		mockPushToolResult,
		mockRemoveClosingTag,
	)

	assert(askCalled, "ask should be called for partial blocks")
}

async function testMissingDescription() {
	toolResultCalls = []
	const mockCline = new MockTask() as any
	const block: ToolUse = {
		type: "tool_use",
		name: "subagent" as ToolName, // Explicitly cast to ToolName
		params: {
			_text: JSON.stringify({
				message: "Test message",
			}),
		},
		partial: false,
	}

	await subagentTool(
		mockCline,
		block,
		createMockAskApproval(true),
		mockHandleError,
		mockPushToolResult,
		mockRemoveClosingTag,
	)

	assertEqual(mockCline.consecutiveMistakeCount, 1, "consecutiveMistakeCount should increment")
	assert(toolResultCalls.length > 0, "pushToolResult should be called")
	assertContains(JSON.stringify(toolResultCalls[0]), "Missing parameter", "Should report missing description")
}

async function testMissingMessage() {
	toolResultCalls = []
	const mockCline = new MockTask() as any
	const block: ToolUse = {
		type: "tool_use",
		name: "subagent" as ToolName, // Explicitly cast to ToolName
		params: {
			_text: JSON.stringify({
				description: "Test task",
			}),
		},
		partial: false,
	}

	await subagentTool(
		mockCline,
		block,
		createMockAskApproval(true),
		mockHandleError,
		mockPushToolResult,
		mockRemoveClosingTag,
	)

	assertEqual(mockCline.consecutiveMistakeCount, 1, "consecutiveMistakeCount should increment")
	assert(toolResultCalls.length > 0, "pushToolResult should be called")
	assertContains(JSON.stringify(toolResultCalls[0]), "Missing parameter", "Should report missing message")
}

async function testJsonStyleParameters() {
	toolResultCalls = []
	const mockCline = new MockTask() as any
	const block: ToolUse = {
		type: "tool_use",
		name: "subagent" as ToolName, // Explicitly cast to ToolName
		params: {
			_text: JSON.stringify({
				description: "JSON task",
				message: "JSON message",
				writePermissions: true,
				allowedWritePaths: ["src/**/*.ts"],
			}),
		},
		partial: false,
	}

	let approvalMessageParsed: any
	const mockApproval: AskApproval = async (type, message) => {
		if (message) {
			approvalMessageParsed = JSON.parse(message)
		}
		return true
	}

	await subagentTool(mockCline, block, mockApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

	assertEqual(approvalMessageParsed.tool, "subagent", "Tool should be subagent")
	assertEqual(approvalMessageParsed.description, "JSON task", "Description should match")
	assertEqual(approvalMessageParsed.writePermissions, true, "Write permissions should be true")
}

async function testInvalidJsonParameters() {
	toolResultCalls = []
	const mockCline = new MockTask() as any
	const block: ToolUse = {
		type: "tool_use",
		name: "subagent" as ToolName, // Explicitly cast to ToolName
		params: {
			_text: "{ invalid json",
		},
		partial: false,
	}

	await subagentTool(
		mockCline,
		block,
		createMockAskApproval(true),
		mockHandleError,
		mockPushToolResult,
		mockRemoveClosingTag,
	)

	assertEqual(mockCline.consecutiveMistakeCount, 1, "consecutiveMistakeCount should increment")
	assert(toolResultCalls.length > 0, "pushToolResult should be called")
	assertContains(JSON.stringify(toolResultCalls[0]), "Invalid JSON", "Should report invalid JSON")
}

async function testUserDeniedApproval() {
	toolResultCalls = []
	const mockCline = new MockTask() as any
	const block: ToolUse = {
		type: "tool_use",
		name: "subagent" as ToolName, // Explicitly cast to ToolName
		params: {
			_text: JSON.stringify({
				description: "Test task",
				message: "Test message",
			}),
		},
		partial: false,
	}

	await subagentTool(
		mockCline,
		block,
		createMockAskApproval(false), // User denies
		mockHandleError,
		mockPushToolResult,
		mockRemoveClosingTag,
	)

	assert(toolResultCalls.length > 0, "pushToolResult should be called")
	assertContains(JSON.stringify(toolResultCalls[0]), "denied", "Should indicate user denied")
}

async function testCheckpointSave() {
	toolResultCalls = []
	const mockCline = new MockTask() as any
	mockCline.enableCheckpoints = true

	let checkpointSaved = false
	mockCline.checkpointSave = async () => {
		checkpointSaved = true
		return Promise.resolve()
	}

	const block: ToolUse = {
		type: "tool_use",
		name: "subagent" as ToolName, // Explicitly cast to ToolName
		params: {
			_text: JSON.stringify({
				description: "Test task",
				message: "Test message",
			}),
		},
		partial: false,
	}

	await subagentTool(
		mockCline,
		block,
		createMockAskApproval(true),
		mockHandleError,
		mockPushToolResult,
		mockRemoveClosingTag,
	)

	assert(checkpointSaved, "checkpointSave should be called when enableCheckpoints is true")
}

// Run all tests
async function runAllTests() {
	console.log("Running subagentTool tests...\n")

	await runTest("testPartialBlock", testPartialBlock)
	await runTest("testMissingDescription", testMissingDescription)
	await runTest("testMissingMessage", testMissingMessage)
	await runTest("testJsonStyleParameters", testJsonStyleParameters)
	await runTest("testInvalidJsonParameters", testInvalidJsonParameters)
	await runTest("testUserDeniedApproval", testUserDeniedApproval)
	await runTest("testCheckpointSave", testCheckpointSave)

	// Summary
	console.log("\n=== Test Summary ===")
	const passed = testResults.filter((r) => r.passed).length
	const failed = testResults.filter((r) => !r.passed).length
	console.log(`Total: ${testResults.length}`)
	console.log(`Passed: ${passed}`)
	console.log(`Failed: ${failed}`)

	if (failed > 0) {
		console.log("\nFailed tests:")
		testResults
			.filter((r) => !r.passed)
			.forEach((r) => {
				console.log(`  - ${r.testName}: ${r.error}`)
			})
	}
}

// Execute tests if this file is run directly
if (require.main === module) {
	runAllTests().catch(console.error)
}

export { runAllTests }
