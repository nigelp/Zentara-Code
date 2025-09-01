import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"

export interface TestResult {
	tool: string
	passed: boolean
	error?: string
	details?: any
}

export async function createTestFile(fileName: string, content: string): Promise<vscode.Uri> {
	// Use workspace folder if available, otherwise use project testdata
	const workspaceFolders = vscode.workspace.workspaceFolders
	let testDir: string

	if (workspaceFolders && workspaceFolders.length > 0) {
		// Use workspace folder (matches working test setup)
		testDir = path.join(workspaceFolders[0].uri.fsPath, ".lsp-test-files")
		console.log(`[Test] Using workspace folder for test files: ${testDir}`)
	} else {
		// Fallback to project root
		const projectRoot = path.resolve(__dirname, "../../..") // Go up to project root
		testDir = path.join(projectRoot, "testdata", ".test-files")
		console.log(`[Test] No workspace folder, using project root: ${testDir}`)
	}

	if (!fs.existsSync(testDir)) {
		fs.mkdirSync(testDir, { recursive: true })
	}

	const filePath = path.join(testDir, fileName)
	fs.writeFileSync(filePath, content)

	// Verify file was written
	if (!fs.existsSync(filePath)) {
		throw new Error(`Failed to create test file: ${filePath}`)
	}

	const uri = vscode.Uri.file(filePath)

	// Open the file in editor and make it active - CRITICAL for LSP to work
	const doc = await vscode.workspace.openTextDocument(uri)
	const editor = await vscode.window.showTextDocument(doc, {
		preview: false,
		preserveFocus: false, // Ensure the editor gets focus
	})

	// Force the document to be parsed by making a small edit and undoing it
	// This helps trigger Language Server initialization for the file
	await editor.edit((editBuilder) => {
		editBuilder.insert(new vscode.Position(0, 0), " ")
	})
	await vscode.commands.executeCommand("undo")

	// Wait for Language Server to be ready using a more robust approach
	await waitForLanguageServerReady(uri, 15000) // Increased timeout to 15 seconds

	console.log(`[Test] Test file created and opened: ${filePath}`)

	return uri
}

/**
 * More robust waiting for Language Server to be ready
 * Polls the Language Server until it responds with valid data
 */
async function waitForLanguageServerReady(uri: vscode.Uri, maxWaitTime: number = 10000): Promise<void> {
	const startTime = Date.now()
	let lastError: any = null
	let consecutiveSuccesses = 0
	const requiredSuccesses = 2 // Require 2 consecutive successful checks

	// First, ensure basic document is ready
	await new Promise((resolve) => setTimeout(resolve, 1000))

	console.log(`[Test] Waiting for Language Server to be ready for ${uri.fsPath}...`)

	while (Date.now() - startTime < maxWaitTime) {
		try {
			// Try multiple LSP operations to ensure full readiness
			// 1. Try to get document symbols
			const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
				"vscode.executeDocumentSymbolProvider",
				uri,
			)

			// 2. Try go-to-definition at position 0,0 (should work even if no definition)
			const definitions = await vscode.commands.executeCommand<any>(
				"vscode.executeDefinitionProvider",
				uri,
				new vscode.Position(0, 0),
			)

			// If both commands succeeded (even with empty results), increment success counter
			if (symbols !== undefined && definitions !== undefined) {
				consecutiveSuccesses++
				console.log(`[Test] Language Server check ${consecutiveSuccesses}/${requiredSuccesses} successful`)

				if (consecutiveSuccesses >= requiredSuccesses) {
					console.log(`[Test] Language Server ready for ${uri.fsPath} after ${Date.now() - startTime}ms`)
					// Give it a bit more time to fully stabilize
					await new Promise((resolve) => setTimeout(resolve, 500))
					return
				}
			} else {
				consecutiveSuccesses = 0 // Reset on any undefined response
			}
		} catch (error) {
			lastError = error
			consecutiveSuccesses = 0 // Reset on error
			// Language Server not ready yet, continue waiting
		}

		// Wait before retrying
		await new Promise((resolve) => setTimeout(resolve, 500))
	}

	// If we've exhausted the timeout, log a warning but continue
	console.warn(
		`[Test] Language Server may not be fully ready for ${uri.fsPath} after ${maxWaitTime}ms. Last error:`,
		lastError,
	)
	// Give it one more second as a last attempt
	await new Promise((resolve) => setTimeout(resolve, 1000))
}

export async function cleanupTestFiles(): Promise<void> {
	// Clean up both possible test directories
	const workspaceFolders = vscode.workspace.workspaceFolders

	// Clean workspace test directory if it exists
	if (workspaceFolders && workspaceFolders.length > 0) {
		const workspaceTestDir = path.join(workspaceFolders[0].uri.fsPath, ".lsp-test-files")
		if (fs.existsSync(workspaceTestDir)) {
			console.log(`[Test] Cleaning workspace test directory: ${workspaceTestDir}`)
			fs.rmSync(workspaceTestDir, { recursive: true, force: true })
		}
	}

	// Also clean project root test directory
	const projectRoot = path.resolve(__dirname, "../../..") // Go up to project root
	const projectTestDir = path.join(projectRoot, "testdata", ".test-files")
	if (fs.existsSync(projectTestDir)) {
		console.log(`[Test] Cleaning project test directory: ${projectTestDir}`)
		fs.rmSync(projectTestDir, { recursive: true, force: true })
	}
}

export function formatTestResult(result: TestResult): string {
	const status = result.passed ? "✅ PASSED" : "❌ FAILED"
	let output = `${status} - ${result.tool}`

	if (result.error) {
		output += `\n  Error: ${result.error}`
	}

	if (result.details) {
		output += `\n  Details: ${JSON.stringify(result.details, null, 2)}`
	}

	return output
}

export async function runTestWithTimeout<T>(testFn: () => Promise<T>, timeoutMs: number = 10000): Promise<T> {
	return Promise.race([
		testFn(),
		new Promise<T>((_, reject) =>
			setTimeout(() => reject(new Error(`Test timed out after ${timeoutMs}ms`)), timeoutMs),
		),
	])
}

// Mock implementations for test environment
export class MockTask {
	consecutiveMistakeCount = 0
	providerRef: any

	constructor() {
		// Create a mock providerRef that simulates the real one
		this.providerRef = {
			deref: () => ({
				contextProxy: {
					getValue: (key: string) => {
						// Return true for alwaysAllowLsp to auto-approve LSP operations in tests
						if (key === "alwaysAllowLsp") {
							return true
						}
						return undefined
					},
				},
				getState: () => ({
					customModes: [],
				}),
				finishSubTask: async (result: any, cline: any) => {
					console.log(`Sub-task finished with result: ${result}`)
				},
				getMcpHub: () => null,
			}),
		}
	}

	recordToolError(tool: any) {
		console.log(`Tool error recorded: ${tool}`)
	}

	async sayAndCreateMissingParamError(tool: any, param: string) {
		return `Missing parameter: ${param} for tool: ${tool}`
	}

	async say(type: string, message: string) {
		console.log(`[${type}] ${message}`)
	}
}

export async function mockAskApproval(type: string, message: string): Promise<boolean> {
	console.log(`Mock approval requested: ${type} - ${message}`)
	return true // Always approve in tests
}

export async function mockHandleError(context: string, error: Error): Promise<void> {
	console.error(`Error in ${context}: ${error.message}`)
}

export function mockPushToolResult(result: string): void {
	console.log(`Tool result: ${result}`)
}
