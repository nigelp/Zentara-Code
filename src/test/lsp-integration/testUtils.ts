/**
 * Test utilities for LSP integration tests
 * These tests run in the Extension Host Window with real VS Code APIs
 */

import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"

export interface TestResult {
	testName: string
	toolName: string
	passed: boolean
	error?: string
	duration: number
}

export class TestReporter {
	private results: TestResult[] = []
	private startTime: number = 0

	startTest(toolName: string, testName: string) {
		this.startTime = Date.now()
		console.log(`\n▶ Running: ${toolName} - ${testName}`)
	}

	passTest(toolName: string, testName: string) {
		const duration = Date.now() - this.startTime
		this.results.push({
			toolName,
			testName,
			passed: true,
			duration,
		})
		console.log(`✅ PASS: ${toolName} - ${testName} (${duration}ms)`)
	}

	failTest(toolName: string, testName: string, error: any) {
		const duration = Date.now() - this.startTime
		const errorMessage = error?.message || String(error)
		this.results.push({
			toolName,
			testName,
			passed: false,
			error: errorMessage,
			duration,
		})
		console.error(`❌ FAIL: ${toolName} - ${testName} (${duration}ms)`)
		console.error(`   Error: ${errorMessage}`)
	}

	getSummary(): string {
		const total = this.results.length
		const passed = this.results.filter((r) => r.passed).length
		const failed = total - passed
		const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0)

		let summary = "\n" + "=".repeat(60) + "\n"
		summary += "📊 TEST SUMMARY\n"
		summary += "=".repeat(60) + "\n"
		summary += `Total Tests: ${total}\n`
		summary += `✅ Passed: ${passed}\n`
		summary += `❌ Failed: ${failed}\n`
		summary += `⏱️ Total Duration: ${totalDuration}ms\n`
		summary += "=".repeat(60) + "\n"

		if (failed > 0) {
			summary += "\n❌ FAILED TESTS:\n"
			this.results
				.filter((r) => !r.passed)
				.forEach((r) => {
					summary += `  - ${r.toolName}: ${r.testName}\n`
					summary += `    Error: ${r.error}\n`
				})
		}

		return summary
	}

	getResults(): TestResult[] {
		return this.results
	}
}

/**
 * Create a test file with sample content for testing
 */
export async function createTestFile(fileName: string, content: string): Promise<vscode.Uri> {
	const workspaceFolders = vscode.workspace.workspaceFolders
	if (!workspaceFolders || workspaceFolders.length === 0) {
		throw new Error("No workspace folder open")
	}

	const testDir = path.join(workspaceFolders[0].uri.fsPath, ".lsp-test-files")
	console.log(`🔍 DIAGNOSTIC: Creating test file ${fileName} in directory: ${testDir}`)

	// Create test directory if it doesn't exist
	if (!fs.existsSync(testDir)) {
		fs.mkdirSync(testDir, { recursive: true })
		console.log(`🔍 DIAGNOSTIC: Created test directory: ${testDir}`)
	}

	const filePath = path.join(testDir, fileName)

	// Write file synchronously and ensure it's properly flushed
	fs.writeFileSync(filePath, content, "utf8")

	// Verify file was written correctly
	if (!fs.existsSync(filePath)) {
		throw new Error(`Failed to create test file: ${filePath}`)
	}

	const fileStats = fs.statSync(filePath)
	console.log(
		`🔍 DIAGNOSTIC: Written file ${filePath}, exists: ${fs.existsSync(filePath)}, size: ${fileStats.size} bytes`,
	)

	// Wait a bit to ensure file system operations are complete and LSP can detect the file
	await new Promise((resolve) => setTimeout(resolve, 100))

	// Double-check file still exists after delay
	if (!fs.existsSync(filePath)) {
		throw new Error(`Test file disappeared after creation: ${filePath}`)
	}

	return vscode.Uri.file(filePath)
}

/**
 * Clean up test files after tests complete
 */
export async function cleanupTestFiles(): Promise<void> {
	const workspaceFolders = vscode.workspace.workspaceFolders
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return
	}

	const testDir = path.join(workspaceFolders[0].uri.fsPath, ".lsp-test-files")
	console.log(`🔍 DIAGNOSTIC: Cleanup called for directory: ${testDir}`)

	if (fs.existsSync(testDir)) {
		const files = fs.readdirSync(testDir)
		console.log(`🔍 DIAGNOSTIC: Removing ${files.length} files: ${files.join(", ")}`)
		fs.rmSync(testDir, { recursive: true, force: true })
		console.log(`🔍 DIAGNOSTIC: Test directory cleaned up`)
	} else {
		console.log(`🔍 DIAGNOSTIC: Test directory doesn't exist, nothing to clean`)
	}
}

/**
 * Open a test file in the editor
 */
export async function openTestFile(uri: vscode.Uri): Promise<vscode.TextEditor> {
	console.log(`🔍 DIAGNOSTIC: Opening test file: ${uri.fsPath}, exists: ${fs.existsSync(uri.fsPath)}`)

	// Ensure file exists before trying to open
	if (!fs.existsSync(uri.fsPath)) {
		throw new Error(`Test file does not exist: ${uri.fsPath}`)
	}

	const document = await vscode.workspace.openTextDocument(uri)
	const editor = await vscode.window.showTextDocument(document)

	// Give VSCode and language servers time to process the opened file
	await new Promise((resolve) => setTimeout(resolve, 200))

	console.log(`🔍 DIAGNOSTIC: File opened successfully, document length: ${document.getText().length}`)
	return editor
}

/**
 * Get position at specific line and character
 */
export function getPosition(line: number, character: number): vscode.Position {
	return new vscode.Position(line, character)
}

/**
 * Assert helper for tests
 */
export function assert(condition: boolean, message: string): void {
	if (!condition) {
		throw new Error(`Assertion failed: ${message}`)
	}
}

/**
 * Assert arrays are equal
 */
export function assertArrayEqual<T>(actual: T[], expected: T[], message: string): void {
	if (actual.length !== expected.length) {
		throw new Error(`${message}: Array length mismatch. Expected ${expected.length}, got ${actual.length}`)
	}

	for (let i = 0; i < actual.length; i++) {
		if (JSON.stringify(actual[i]) !== JSON.stringify(expected[i])) {
			throw new Error(`${message}: Array element mismatch at index ${i}`)
		}
	}
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
	condition: () => boolean | Promise<boolean>,
	timeout: number = 5000,
	interval: number = 100,
): Promise<void> {
	const startTime = Date.now()

	while (Date.now() - startTime < timeout) {
		if (await condition()) {
			return
		}
		await new Promise((resolve) => setTimeout(resolve, interval))
	}

	throw new Error(`Timeout waiting for condition after ${timeout}ms`)
}

/**
 * Sample TypeScript test content
 */
export const SAMPLE_TS_CONTENT = `
class TestClass {
    private value: number = 42;
    
    constructor(initialValue: number) {
        this.value = initialValue;
    }
    
    getValue(): number {
        return this.value;
    }
    
    setValue(newValue: number): void {
        this.value = newValue;
    }
    
    static staticMethod(): string {
        return "static";
    }
}

interface TestInterface {
    id: number;
    name: string;
    optional?: boolean;
}

function testFunction(param: string): TestInterface {
    return {
        id: 1,
        name: param
    };
}

const testVariable = new TestClass(100);
const result = testVariable.getValue();

export { TestClass, TestInterface, testFunction };
`

/**
 * Sample Python test content
 */
export const SAMPLE_PY_CONTENT = `
class TestClass:
    def __init__(self, initial_value):
        self.value = initial_value
    
    def get_value(self):
        return self.value
    
    def set_value(self, new_value):
        self.value = new_value
    
    @staticmethod
    def static_method():
        return "static"
    
    @classmethod
    def class_method(cls):
        return cls.__name__

def test_function(param):
    """Test function docstring"""
    return {
        'id': 1,
        'name': param
    }

test_variable = TestClass(100)
result = test_variable.get_value()

if __name__ == "__main__":
    print(f"Result: {result}")
`

/**
 * Sample JavaScript test content
 */
export const SAMPLE_JS_CONTENT = `
class TestClass {
    constructor(initialValue) {
        this.value = initialValue;
    }
    
    getValue() {
        return this.value;
    }
    
    setValue(newValue) {
        this.value = newValue;
    }
    
    static staticMethod() {
        return "static";
    }
}

function testFunction(param) {
    return {
        id: 1,
        name: param
    };
}

const testVariable = new TestClass(100);
const result = testVariable.getValue();

module.exports = { TestClass, testFunction };
`
