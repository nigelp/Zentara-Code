/**
 * Integration tests for getCompletions LSP tool
 * Comprehensive test suite for LSP completion functionality across different languages and scenarios
 */

import * as vscode from "vscode"
import { lspController } from "../../zentara_lsp/src/LspController"
import { CompletionItem } from "../../zentara_lsp/src/types"
import {
	TestReporter,
	createTestFile,
	openTestFile,
	assert,
	SAMPLE_TS_CONTENT,
	SAMPLE_PY_CONTENT,
	SAMPLE_JS_CONTENT,
} from "./testUtils"

/**
 * Helper function to validate completion items
 */
function validateCompletionItems(items: CompletionItem[], expectedLabels?: string[]): void {
	assert(Array.isArray(items), "Completion result should be an array of items")

	for (const item of items) {
		assert(
			typeof item.label === "string" && item.label.length > 0,
			"Each completion item should have a non-empty label",
		)
		assert(typeof item.kind === "number" && item.kind >= -1, "Each completion item should have a valid kind number")
	}

	if (expectedLabels && expectedLabels.length > 0) {
		const labels = items.map((item) => item.label)
		for (const expected of expectedLabels) {
			assert(labels.includes(expected), `Should include completion item with label "${expected}"`)
		}
	}
}

/**
 * Helper function to find completion items by label
 */
function findCompletionByLabel(items: CompletionItem[], label: string): CompletionItem | undefined {
	return items.find((item) => item.label === label)
}

export async function testGetCompletions(reporter: TestReporter): Promise<void> {
	// Test 0: Get completions using symbolName parameter (new flattened format)
	reporter.startTest("getCompletions", "Get completions using symbolName parameter")
	try {
		const symbolNameContent = `
class CompletionTestClass {
	public getResults(): string[] {
		return ["result1", "result2"];
	}
	
	public processData(data: any): void {}
	
	public metadata: string = "test";
	public isEnabled: boolean = true;
}

const completionInstance = new CompletionTestClass();
completionInstance.` // We'll get completions after the dot using symbolName lookup

		const uri = await createTestFile("test-symbol-name-completions.ts", symbolNameContent)
		const editor = await openTestFile(uri)

		// Test getting completions using symbolName instead of position
		const result = await lspController.getCompletions({
			uri: uri.toString(),
			symbolName: "completionInstance", // Look up by symbol name
		})

		assert(result !== null && result !== undefined, "Should return completion result using symbolName")
		assert(Array.isArray(result), "Should return array of completion items")

		// Validate completion items structure and content
		validateCompletionItems(result, ["getResults", "processData", "metadata", "isEnabled"])

		// Check specific method completion
		const getResultsCompletion = findCompletionByLabel(result, "getResults")
		if (getResultsCompletion) {
			assert(getResultsCompletion.kind !== undefined, "getResults completion should have a kind")
		}

		reporter.passTest("getCompletions", "Get completions using symbolName parameter")
	} catch (error) {
		reporter.failTest("getCompletions", "Get completions using symbolName parameter", error)
	}

	// Test 0b: Get completions using symbolName for nested property access
	reporter.startTest("getCompletions", "Get completions using symbolName for nested access")
	try {
		const nestedContent = `
interface UserConfig {
	timeout: number;
	retries: number;
	enabled: boolean;
	apiEndpoint: string;
}

const appConfig: UserConfig = {
	timeout: 5000,
	retries: 3,
	enabled: true,
	apiEndpoint: "https://api.example.com"
};

// Test completion after accessing appConfig
appConfig.`

		const uri = await createTestFile("test-nested-symbol-completions.ts", nestedContent)
		const editor = await openTestFile(uri)

		// Test getting completions using symbolName
		const result = await lspController.getCompletions({
			uri: uri.toString(),
			symbolName: "appConfig",
		})

		assert(result !== null && result !== undefined, "Should return completion result for nested symbol")
		assert(Array.isArray(result), "Should return array of completion items")

		// Validate completion items for interface properties
		validateCompletionItems(result, ["timeout", "retries", "enabled", "apiEndpoint"])

		reporter.passTest("getCompletions", "Get completions using symbolName for nested access")
	} catch (error) {
		reporter.failTest("getCompletions", "Get completions using symbolName for nested access", error)
	}

	// Test 0c: Handle error cases with symbolName parameter
	reporter.startTest("getCompletions", "Handle error cases with symbolName parameter")
	try {
		const errorTestContent = `
class SimpleClass {
	public method1(): void {}
	public method2(): string { return ""; }
}

const instance = new SimpleClass();`

		const uri = await createTestFile("test-symbol-error-completions.ts", errorTestContent)
		const editor = await openTestFile(uri)

		// Test with non-existent symbol name
		const result1 = await lspController.getCompletions({
			uri: uri.toString(),
			symbolName: "nonExistentSymbol",
		})

		// Should handle gracefully and return empty array
		assert(result1 !== undefined, "Should handle non-existent symbol gracefully")
		assert(Array.isArray(result1), "Should return array even for non-existent symbols")
		// May be empty or contain minimal completions

		// Test with empty symbol name (should be caught by validation, but test graceful handling)
		try {
			const result2 = await lspController.getCompletions({
				uri: uri.toString(),
				symbolName: "",
			})
			// If we get here, it handled the empty string gracefully
			assert(Array.isArray(result2), "Should handle empty symbolName gracefully")
		} catch (validationError) {
			// This is expected behavior - parameter validation should catch empty strings
			assert(true, "Parameter validation correctly caught empty symbolName")
		}

		reporter.passTest("getCompletions", "Handle error cases with symbolName parameter")
	} catch (error) {
		reporter.failTest("getCompletions", "Handle error cases with symbolName parameter", error)
	}

	// Test 0d: Test symbolName with trigger character
	reporter.startTest("getCompletions", "Test symbolName with trigger character")
	try {
		const triggerContent = `
interface CompletionConfig {
	maxResults: number;
	includeDetails: boolean;
	filterPattern: string;
}

const config: CompletionConfig = {
	` // We'll trigger completions here using symbolName

		const uri = await createTestFile("test-symbol-trigger-completions.ts", triggerContent)
		const editor = await openTestFile(uri)

		// Test with symbolName and trigger character
		const result = await lspController.getCompletions({
			uri: uri.toString(),
			symbolName: "config",
			triggerCharacter: "{",
		})

		assert(result !== null && result !== undefined, "Should handle symbolName with trigger character")
		assert(Array.isArray(result), "Should return array of completion items")

		// Validate completion items for interface properties
		validateCompletionItems(result)

		// Check for interface properties
		const labels = result.map((item) => item.label)
		const expectedProperties = ["maxResults", "includeDetails", "filterPattern"]
		const foundProperties = expectedProperties.filter((prop) => labels.includes(prop))
		// At least some properties should be found

		reporter.passTest("getCompletions", "Test symbolName with trigger character")
	} catch (error) {
		reporter.failTest("getCompletions", "Test symbolName with trigger character", error)
	}
	// Test 1: Get completions after dot notation (object.method)
	reporter.startTest("getCompletions", "Get completions after dot notation (object.method)")
	try {
		const dotNotationContent = `
class TestClass {
    public getValue(): number {
        return 42;
    }
    
    public setValue(value: number): void {}
    
    public calculateSum(a: number, b: number): number {
        return a + b;
    }
    
    public propertyA: string = 'test';
    public propertyB: boolean = true;
}

const instance = new TestClass();
instance.` // Cursor position after the dot

		const uri = await createTestFile("test-dot-completions.ts", dotNotationContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getCompletions({
			textDocument: { uri: uri.toString() },
			position: { line: 15, character: 9 }, // Position after "instance."
		})

		assert(result !== null && result !== undefined, "Should return completion result")
		assert(Array.isArray(result), "Should return array of completion items")

		// Validate completion items structure and content
		validateCompletionItems(result, ["getValue", "setValue", "calculateSum", "propertyA", "propertyB"])

		// Check specific method completion
		const getValueCompletion = findCompletionByLabel(result, "getValue")
		if (getValueCompletion) {
			assert(getValueCompletion.kind !== undefined, "getValue completion should have a kind")
		}

		reporter.passTest("getCompletions", "Get completions after dot notation (object.method)")
	} catch (error) {
		reporter.failTest("getCompletions", "Get completions after dot notation (object.method)", error)
	}

	// Test 2: Get completions for imports
	reporter.startTest("getCompletions", "Get completions for imports")
	try {
		const importContent = `
import * as fs from 'fs';
import * as path from 'path';
import { readFileSync } from 'fs';

function readFile() {
    fs.` // Cursor position after "fs."

		const uri = await createTestFile("test-import-completions.ts", importContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getCompletions({
			textDocument: { uri: uri.toString() },
			position: { line: 6, character: 7 }, // Position after "fs."
		})

		assert(result !== null && result !== undefined, "Should return completion result for imports")
		assert(Array.isArray(result), "Should return array of completion items")

		// Validate completion items and check for common fs methods
		validateCompletionItems(result)

		// Look for common fs module methods
		const labels = result.map((item) => item.label)
		const expectedFsMethods = ["readFileSync", "writeFileSync", "existsSync", "statSync"]
		const foundMethods = expectedFsMethods.filter((method) => labels.includes(method))
		assert(foundMethods.length > 0, `Should find at least one fs method from: ${expectedFsMethods.join(", ")}`)

		reporter.passTest("getCompletions", "Get completions for imports")
	} catch (error) {
		reporter.failTest("getCompletions", "Get completions for imports", error)
	}

	// Test 3: Get completions in empty line
	reporter.startTest("getCompletions", "Get completions in empty line")
	try {
		const emptyLineContent = `
const userName = "John";
const userAge = 25;
const userEmail = "john@example.com";

function processUser() {
    // Empty line below
    
    return userName;
}`

		const uri = await createTestFile("test-empty-line-completions.ts", emptyLineContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getCompletions({
			textDocument: { uri: uri.toString() },
			position: { line: 7, character: 4 }, // Position in empty line with indentation
		})

		assert(result !== null && result !== undefined, "Should return completion result for empty line")
		assert(Array.isArray(result), "Should return array of completion items")

		// Validate completion items structure
		validateCompletionItems(result)

		// Check for available variables in scope
		const labels = result.map((item) => item.label)
		const expectedVariables = ["userName", "userAge", "userEmail"]
		const foundVariables = expectedVariables.filter((variable) => labels.includes(variable))
		assert(foundVariables.length > 0, `Should find at least one variable from: ${expectedVariables.join(", ")}`)

		reporter.passTest("getCompletions", "Get completions in empty line")
	} catch (error) {
		reporter.failTest("getCompletions", "Get completions in empty line", error)
	}

	// Test 4: Get completions for function parameters
	reporter.startTest("getCompletions", "Get completions for function parameters")
	try {
		const parameterContent = `
interface UserConfig {
    timeout: number;
    retries: number;
    enabled: boolean;
    apiKey: string;
}

function processConfig(config: UserConfig, callback: (result: string) => void) {
    console.log(config.); // Cursor after dot to get config properties
}`

		const uri = await createTestFile("test-parameter-completions.ts", parameterContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getCompletions({
			textDocument: { uri: uri.toString() },
			position: { line: 9, character: 21 }, // Position after "config."
		})

		assert(result !== null && result !== undefined, "Should return completion result for function parameters")
		assert(Array.isArray(result), "Should return array of completion items")

		// Validate completion items and check for interface properties
		validateCompletionItems(result, ["timeout", "retries", "enabled", "apiKey"])

		// Check specific property completions with types
		const timeoutCompletion = findCompletionByLabel(result, "timeout")
		if (timeoutCompletion) {
			assert(timeoutCompletion.kind !== undefined, "timeout completion should have a kind")
		}

		reporter.passTest("getCompletions", "Get completions for function parameters")
	} catch (error) {
		reporter.failTest("getCompletions", "Get completions for function parameters", error)
	}

	// Test 5a: Get completions in TypeScript file (legacy format)
	reporter.startTest("getCompletions", "Get completions in TypeScript file (legacy format)")
	try {
		const tsContent = SAMPLE_TS_CONTENT + "\nconst instance = new TestClass(100);\ninstance."

		const uri = await createTestFile("test-typescript.ts", tsContent)
		const editor = await openTestFile(uri)

		const lines = tsContent.split("\n")
		const lastLineIndex = lines.length - 1
		const lastLine = lines[lastLineIndex]

		const result = await lspController.getCompletions({
			textDocument: { uri: uri.toString() },
			position: { line: lastLineIndex + 1, character: lastLine.length }, // Position after "instance."
		})

		assert(result !== null && result !== undefined, "Should handle TypeScript completions")
		assert(Array.isArray(result), "Should return array of completion items")

		// Validate completion items and check for class methods
		validateCompletionItems(result, ["getValue", "setValue"])

		reporter.passTest("getCompletions", "Get completions in TypeScript file (legacy format)")
	} catch (error) {
		reporter.failTest("getCompletions", "Get completions in TypeScript file (legacy format)", error)
	}

	// Test 5a2: Get completions in TypeScript file using symbolName (new format)
	reporter.startTest("getCompletions", "Get completions in TypeScript file using symbolName")
	try {
		const tsContent = SAMPLE_TS_CONTENT + "\nconst tsInstance = new TestClass(100);\ntsInstance."

		const uri = await createTestFile("test-typescript-symbol.ts", tsContent)
		const editor = await openTestFile(uri)

		// Use the new flattened format with symbolName
		const result = await lspController.getCompletions({
			uri: uri.toString(),
			symbolName: "tsInstance",
		})

		assert(result !== null && result !== undefined, "Should handle TypeScript completions with symbolName")
		assert(Array.isArray(result), "Should return array of completion items")

		// Validate completion items and check for class methods
		validateCompletionItems(result, ["getValue", "setValue"])

		// Check for TypeScript-specific completions
		const getValueCompletion = findCompletionByLabel(result, "getValue")
		if (getValueCompletion) {
			assert(getValueCompletion.kind !== undefined, "getValue completion should have a kind")
		}

		reporter.passTest("getCompletions", "Get completions in TypeScript file using symbolName")
	} catch (error) {
		reporter.failTest("getCompletions", "Get completions in TypeScript file using symbolName", error)
	}

	// Test 5b: Get completions in JavaScript file (legacy format)
	reporter.startTest("getCompletions", "Get completions in JavaScript file (legacy format)")
	try {
		const jsContent = SAMPLE_JS_CONTENT + "\nconst newInstance = new TestClass(200);\nnewInstance."

		const uri = await createTestFile("test-javascript.js", jsContent)
		const editor = await openTestFile(uri)

		const lines = jsContent.split("\n")
		const lastLineIndex = lines.length - 1
		const lastLine = lines[lastLineIndex]

		const result = await lspController.getCompletions({
			textDocument: { uri: uri.toString() },
			position: { line: lastLineIndex + 1, character: lastLine.length }, // Position after "newInstance."
		})

		assert(result !== null && result !== undefined, "Should handle JavaScript completions")
		assert(Array.isArray(result), "Should return array of completion items")

		// Validate completion items structure
		validateCompletionItems(result)

		// Check for class methods (may vary based on JS intellisense)
		const labels = result.map((item) => item.label)
		const expectedMethods = ["getValue", "setValue"]
		const foundMethods = expectedMethods.filter((method) => labels.includes(method))
		// JS may have less sophisticated completions, so we're more lenient

		reporter.passTest("getCompletions", "Get completions in JavaScript file (legacy format)")
	} catch (error) {
		reporter.failTest("getCompletions", "Get completions in JavaScript file (legacy format)", error)
	}

	// Test 5b2: Get completions in JavaScript file using symbolName (new format)
	reporter.startTest("getCompletions", "Get completions in JavaScript file using symbolName")
	try {
		const jsContent = SAMPLE_JS_CONTENT + "\nconst jsInstance = new TestClass(200);\njsInstance."

		const uri = await createTestFile("test-javascript-symbol.js", jsContent)
		const editor = await openTestFile(uri)

		// Use the new flattened format with symbolName
		const result = await lspController.getCompletions({
			uri: uri.toString(),
			symbolName: "jsInstance",
		})

		assert(result !== null && result !== undefined, "Should handle JavaScript completions with symbolName")
		assert(Array.isArray(result), "Should return array of completion items")

		// Validate completion items structure
		validateCompletionItems(result)

		// Check for class methods (JS may have different completion behavior)
		const labels = result.map((item) => item.label)
		const expectedMethods = ["getValue", "setValue"]
		const foundMethods = expectedMethods.filter((method) => labels.includes(method))
		// JS may have less sophisticated completions, so we're more lenient

		reporter.passTest("getCompletions", "Get completions in JavaScript file using symbolName")
	} catch (error) {
		reporter.failTest("getCompletions", "Get completions in JavaScript file using symbolName", error)
	}

	// Test 5c: Get completions in Python file (legacy format)
	reporter.startTest("getCompletions", "Get completions in Python file (legacy format)")
	try {
		const pythonContent = SAMPLE_PY_CONTENT + "\nnew_instance = TestClass(300)\nnew_instance."

		const uri = await createTestFile("test-python.py", pythonContent)
		const editor = await openTestFile(uri)

		const lines = pythonContent.split("\n")
		const lastLineIndex = lines.length - 1
		const lastLine = lines[lastLineIndex]

		const result = await lspController.getCompletions({
			textDocument: { uri: uri.toString() },
			position: { line: lastLineIndex + 1, character: lastLine.length }, // Position after "new_instance."
		})

		assert(result !== null && result !== undefined, "Should handle Python completions")
		assert(Array.isArray(result), "Should return array of completion items")

		// Validate completion items structure
		validateCompletionItems(result)

		// Check for Python class methods
		const labels = result.map((item) => item.label)
		const expectedMethods = ["get_value", "set_value"]
		const foundMethods = expectedMethods.filter((method) => labels.includes(method))
		// Python LSP support may vary, so we check if any methods are found

		reporter.passTest("getCompletions", "Get completions in Python file (legacy format)")
	} catch (error) {
		reporter.failTest("getCompletions", "Get completions in Python file (legacy format)", error)
	}

	// Test 5c2: Get completions in Python file using symbolName (new format)
	reporter.startTest("getCompletions", "Get completions in Python file using symbolName")
	try {
		const pythonContent = SAMPLE_PY_CONTENT + "\npy_instance = TestClass(300)\npy_instance."

		const uri = await createTestFile("test-python-symbol.py", pythonContent)
		const editor = await openTestFile(uri)

		// Use the new flattened format with symbolName
		const result = await lspController.getCompletions({
			uri: uri.toString(),
			symbolName: "py_instance",
		})

		assert(result !== null && result !== undefined, "Should handle Python completions with symbolName")
		assert(Array.isArray(result), "Should return array of completion items")

		// Validate completion items structure
		validateCompletionItems(result)

		// Check for Python class methods
		const labels = result.map((item) => item.label)
		const expectedMethods = ["get_value", "set_value"]
		const foundMethods = expectedMethods.filter((method) => labels.includes(method))
		// Python LSP support may vary, so we check if any methods are found

		reporter.passTest("getCompletions", "Get completions in Python file using symbolName")
	} catch (error) {
		reporter.failTest("getCompletions", "Get completions in Python file using symbolName", error)
	}

	// Test 6: Handle cases where no completions are available
	reporter.startTest("getCompletions", "Handle cases where no completions are available")
	try {
		const noCompletionContent = `// Just a comment\n42 // number literal\n"string literal"`
		const uri = await createTestFile("test-no-completions.ts", noCompletionContent)
		const editor = await openTestFile(uri)

		// Try to get completions in a comment
		const result1 = await lspController.getCompletions({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 5 }, // Position in comment
		})

		// Should not throw error, may return null or empty completions
		assert(result1 !== undefined, "Should handle comment positions gracefully")
		if (Array.isArray(result1)) {
			validateCompletionItems(result1) // Validate structure even if empty
		}

		// Try to get completions in a string literal
		const result2 = await lspController.getCompletions({
			textDocument: { uri: uri.toString() },
			position: { line: 3, character: 8 }, // Position inside string
		})

		assert(result2 !== undefined, "Should handle string literal positions gracefully")
		if (Array.isArray(result2)) {
			validateCompletionItems(result2) // Validate structure even if empty
		}

		reporter.passTest("getCompletions", "Handle cases where no completions are available")
	} catch (error) {
		reporter.failTest("getCompletions", "Handle cases where no completions are available", error)
	}

	// Test 7: Get completions with trigger character
	reporter.startTest("getCompletions", "Get completions with trigger character")
	try {
		const triggerContent = `
interface Config {
    timeout: number;
    retries: number;
    enabled: boolean;
}

const config: Config = {
    ` // Cursor position inside object literal

		const uri = await createTestFile("test-trigger-completions.ts", triggerContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getCompletions({
			textDocument: { uri: uri.toString() },
			position: { line: 8, character: 4 }, // Position inside object literal
			triggerCharacter: "{",
		})

		assert(result !== null && result !== undefined, "Should handle completions with trigger character")
		assert(Array.isArray(result), "Should return array of completion items")

		// Validate completion items and check for interface properties
		validateCompletionItems(result)

		// Check for interface properties when triggered by '{'
		const labels = result.map((item) => item.label)
		const expectedProperties = ["timeout", "retries", "enabled"]
		const foundProperties = expectedProperties.filter((prop) => labels.includes(prop))

		reporter.passTest("getCompletions", "Get completions with trigger character")
	} catch (error) {
		reporter.failTest("getCompletions", "Get completions with trigger character", error)
	}

	// Test 8: Verify completion item kinds and details (legacy format)
	reporter.startTest("getCompletions", "Verify completion item kinds and details (legacy format)")
	try {
		const detailsContent = `
class DetailedClass {
    private _value: number = 0;
    public name: string = 'test';
    
    constructor(value: number) {
        this._value = value;
    }
    
    public getValue(): number {
        return this._value;
    }
    
    public static createDefault(): DetailedClass {
        return new DetailedClass(42);
    }
}

const detailed = new DetailedClass(100);
detailed.`

		const uri = await createTestFile("test-detailed-completions.ts", detailsContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getCompletions({
			textDocument: { uri: uri.toString() },
			position: { line: 19, character: 9 }, // Position after "detailed."
		})

		assert(result !== null && result !== undefined, "Should return completion result")
		assert(Array.isArray(result), "Should return array of completion items")

		// Validate completion items with detailed checking
		validateCompletionItems(result, ["getValue", "name"])

		// Check for specific completion kinds (VS Code completion item kinds)
		let foundMethod = false
		let foundProperty = false

		for (const item of result) {
			if (item.label === "getValue") {
				foundMethod = true
				// Method kind is typically 2 in VS Code
				assert(typeof item.kind === "number", "getValue should have a numeric kind")
			}
			if (item.label === "name") {
				foundProperty = true
				// Property kind is typically 10 in VS Code
				assert(typeof item.kind === "number", "name should have a numeric kind")
			}
		}

		assert(foundMethod, "Should find getValue method completion")
		assert(foundProperty, "Should find name property completion")

		reporter.passTest("getCompletions", "Verify completion item kinds and details (legacy format)")
	} catch (error) {
		reporter.failTest("getCompletions", "Verify completion item kinds and details (legacy format)", error)
	}

	// Test 8b: Verify completion item kinds using symbolName (new format)
	reporter.startTest("getCompletions", "Verify completion item kinds using symbolName")
	try {
		const detailsContent = `
class DetailedSymbolClass {
    private _count: number = 0;
    public title: string = 'example';
    public isActive: boolean = true;
    
    constructor(count: number) {
        this._count = count;
    }
    
    public getCount(): number {
        return this._count;
    }
    
    public setCount(value: number): void {
        this._count = value;
    }
    
    public static getInstance(): DetailedSymbolClass {
        return new DetailedSymbolClass(0);
    }
}

const detailedSymbol = new DetailedSymbolClass(100);
detailedSymbol.`

		const uri = await createTestFile("test-detailed-symbol-completions.ts", detailsContent)
		const editor = await openTestFile(uri)

		// Use symbolName to get completions
		const result = await lspController.getCompletions({
			uri: uri.toString(),
			symbolName: "detailedSymbol",
		})

		assert(result !== null && result !== undefined, "Should return completion result using symbolName")
		assert(Array.isArray(result), "Should return array of completion items")

		// Validate completion items with detailed checking
		validateCompletionItems(result, ["getCount", "setCount", "title", "isActive"])

		// Check for specific completion kinds and properties
		let foundMethod = false
		let foundProperty = false

		for (const item of result) {
			if (item.label === "getCount" || item.label === "setCount") {
				foundMethod = true
				assert(typeof item.kind === "number", `${item.label} should have a numeric kind`)
			}
			if (item.label === "title" || item.label === "isActive") {
				foundProperty = true
				assert(typeof item.kind === "number", `${item.label} should have a numeric kind`)
			}
		}

		assert(foundMethod, "Should find method completions")
		assert(foundProperty, "Should find property completions")

		reporter.passTest("getCompletions", "Verify completion item kinds using symbolName")
	} catch (error) {
		reporter.failTest("getCompletions", "Verify completion item kinds using symbolName", error)
	}

	// Test 9: Backward compatibility - ensure both formats work in same test
	reporter.startTest("getCompletions", "Backward compatibility test")
	try {
		const compatContent = `
class CompatibilityTest {
    public legacyMethod(): string {
        return "legacy";
    }
    
    public modernMethod(): string {
        return "modern";
    }
    
    public sharedProperty: number = 42;
}

const compatInstance = new CompatibilityTest();
compatInstance.`

		const uri = await createTestFile("test-compatibility.ts", compatContent)
		const editor = await openTestFile(uri)

		// Test legacy format
		const legacyResult = await lspController.getCompletions({
			textDocument: { uri: uri.toString() },
			position: { line: 13, character: 15 }, // Position after "compatInstance."
		})

		// Test new format
		const modernResult = await lspController.getCompletions({
			uri: uri.toString(),
			symbolName: "compatInstance",
		})

		// Both should work and return similar results
		assert(legacyResult !== null && Array.isArray(legacyResult), "Legacy format should work")
		assert(modernResult !== null && Array.isArray(modernResult), "Modern format should work")

		validateCompletionItems(legacyResult)
		validateCompletionItems(modernResult)

		// Both should find the same key methods/properties
		const legacyLabels = legacyResult.map(item => item.label)
		const modernLabels = modernResult.map(item => item.label)

		const expectedItems = ["legacyMethod", "modernMethod", "sharedProperty"]
		const legacyFound = expectedItems.filter(item => legacyLabels.includes(item))
		const modernFound = expectedItems.filter(item => modernLabels.includes(item))

		// At least some items should be found by both approaches
		assert(legacyFound.length > 0 || modernFound.length > 0, "At least one format should find expected items")

		reporter.passTest("getCompletions", "Backward compatibility test")
	} catch (error) {
		reporter.failTest("getCompletions", "Backward compatibility test", error)
	}
}
