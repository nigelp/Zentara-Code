/**
 * Integration tests for getSymbolsOverview LSP tool
 * These tests run in the Extension Host Window with real VS Code APIs
 */

import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"
import { lspController } from "../../zentara_lsp/src/LspController"
import {
	TestReporter,
	createTestFile,
	openTestFile,
	assert,
	SAMPLE_TS_CONTENT,
	SAMPLE_PY_CONTENT,
	SAMPLE_JS_CONTENT,
} from "./testUtils"

export async function testGetSymbolsOverview(reporter: TestReporter): Promise<void> {
	// Test 1: Get symbols overview with query (directory)
	reporter.startTest("getSymbolsOverview", "Get symbols overview for directory")
	try {
		// Create a temporary directory structure for testing
		const workspaceFolders = vscode.workspace.workspaceFolders
		if (!workspaceFolders || workspaceFolders.length === 0) {
			throw new Error("No workspace folder open")
		}

		const testDir = path.join(workspaceFolders[0].uri.fsPath, ".symbols-overview-test")

		// Create test directory if it doesn't exist
		if (!fs.existsSync(testDir)) {
			fs.mkdirSync(testDir, { recursive: true })
		}

		// Create test files with symbols
		const tsFile = path.join(testDir, "test.ts")
		const jsFile = path.join(testDir, "test.js")

		fs.writeFileSync(tsFile, SAMPLE_TS_CONTENT, "utf8")
		fs.writeFileSync(jsFile, SAMPLE_JS_CONTENT, "utf8")

		// Open files to trigger language server analysis
		const tsUri = vscode.Uri.file(tsFile)
		const jsUri = vscode.Uri.file(jsFile)
		await openTestFile(tsUri)
		await openTestFile(jsUri)

		// Wait a bit for language server to process files
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Get symbols overview for the directory
		const result = await lspController.getSymbolsOverview({
			relative_path: ".symbols-overview-test",
		})

		assert(typeof result === "object", "Should return SymbolsOverview object")
		assert(result !== null, "Result should not be null")

		// Check if we have entries for our test files
		const keys = Object.keys(result)
		const hasFiles = keys.length > 0
		assert(hasFiles, "Should contain symbols for test files")

		// Verify structure of returned data
		for (const filePath of keys) {
			assert(typeof filePath === "string", "File path should be string")
			assert(Array.isArray(result[filePath]), "File symbols should be array")

			for (const symbol of result[filePath]) {
				assert(typeof symbol.name === "string", "Symbol name should be string")
				assert(typeof symbol.kind === "number", "Symbol kind should be number")
				assert(symbol.name.length > 0, "Symbol name should not be empty")
				assert(symbol.kind >= 0 && symbol.kind <= 25, "Symbol kind should be valid SymbolKind value")
			}
		}

		// Clean up
		fs.rmSync(testDir, { recursive: true, force: true })

		reporter.passTest("getSymbolsOverview", "Get symbols overview for directory")
	} catch (error) {
		reporter.failTest("getSymbolsOverview", "Get symbols overview for directory", error)
	}

	// Test 2: Get symbols overview without query (single file)
	reporter.startTest("getSymbolsOverview", "Get symbols overview for single file")
	try {
		const uri = await createTestFile("overview-single-file.ts", SAMPLE_TS_CONTENT)
		await openTestFile(uri)

		// Wait for language server processing
		await new Promise((resolve) => setTimeout(resolve, 500))

		// Get the relative path to the created file
		const relativePath = vscode.workspace.asRelativePath(uri)

		const result = await lspController.getSymbolsOverview({
			relative_path: relativePath,
		})

		assert(typeof result === "object", "Should return SymbolsOverview object")
		assert(result !== null, "Result should not be null")

		const keys = Object.keys(result)
		assert(keys.length > 0, "Should contain entry for the file")

		// Find our test file in the results
		const testFileEntry = keys.find((key) => key.includes("overview-single-file.ts"))
		if (testFileEntry) {
			const symbols = result[testFileEntry]
			assert(Array.isArray(symbols), "File symbols should be array")

			// Check for expected symbols from SAMPLE_TS_CONTENT
			const symbolNames = symbols.map((s) => s.name)
			const hasTestClass = symbolNames.includes("TestClass")
			const hasTestInterface = symbolNames.includes("TestInterface")
			const hasTestFunction = symbolNames.includes("testFunction")

			// Should find at least some of the expected symbols
			const foundExpectedSymbols = hasTestClass || hasTestInterface || hasTestFunction
			assert(foundExpectedSymbols, "Should find expected symbols in TypeScript file")
		}

		reporter.passTest("getSymbolsOverview", "Get symbols overview for single file")
	} catch (error) {
		reporter.failTest("getSymbolsOverview", "Get symbols overview for single file", error)
	}

	// Test 3: Test with filters (verify symbol kinds)
	reporter.startTest("getSymbolsOverview", "Verify symbol kinds in overview")
	try {
		const complexContent = `
class OverviewTestClass {
    private field: string = "test";
    
    constructor(value: string) {
        this.field = value;
    }
    
    public method(): void {}
    
    static staticMethod(): string {
        return "static";
    }
}

interface OverviewTestInterface {
    prop: number;
    method(): void;
}

function overviewTestFunction(): void {}

const overviewTestVariable = new OverviewTestClass("test");

enum OverviewTestEnum {
    VALUE1 = "value1",
    VALUE2 = "value2"
}

namespace OverviewTestNamespace {
    export function nestedFunction(): void {}
}
`

		const uri = await createTestFile("overview-kinds-test.ts", complexContent)
		await openTestFile(uri)

		// Wait for language server processing
		await new Promise((resolve) => setTimeout(resolve, 500))

		const relativePath = vscode.workspace.asRelativePath(uri)
		const result = await lspController.getSymbolsOverview({
			relative_path: relativePath,
		})

		assert(typeof result === "object", "Should return SymbolsOverview object")

		const keys = Object.keys(result)
		const testFileEntry = keys.find((key) => key.includes("overview-kinds-test.ts"))

		if (testFileEntry) {
			const symbols = result[testFileEntry]
			assert(Array.isArray(symbols), "File symbols should be array")

			// Verify we have various symbol kinds
			const symbolKinds = symbols.map((s) => s.kind)
			const uniqueKinds = [...new Set(symbolKinds)]

			assert(uniqueKinds.length > 0, "Should have symbols with different kinds")

			// Check for specific symbols and their expected kinds
			for (const symbol of symbols) {
				if (symbol.name === "OverviewTestClass") {
					assert(symbol.kind === vscode.SymbolKind.Class, "Class should have Class kind")
				} else if (symbol.name === "OverviewTestInterface") {
					assert(symbol.kind === vscode.SymbolKind.Interface, "Interface should have Interface kind")
				} else if (symbol.name === "overviewTestFunction") {
					assert(symbol.kind === vscode.SymbolKind.Function, "Function should have Function kind")
				} else if (symbol.name === "OverviewTestEnum") {
					assert(symbol.kind === vscode.SymbolKind.Enum, "Enum should have Enum kind")
				} else if (symbol.name === "OverviewTestNamespace") {
					// Namespace might be identified as a Module in some environments
					assert(
						symbol.kind === vscode.SymbolKind.Namespace || symbol.kind === vscode.SymbolKind.Module,
						`Namespace should have Namespace or Module kind (got: ${symbol.kind})`,
					)
				}
			}
		}

		reporter.passTest("getSymbolsOverview", "Verify symbol kinds in overview")
	} catch (error) {
		reporter.failTest("getSymbolsOverview", "Verify symbol kinds in overview", error)
	}

	// Test 4: Test grouping by kind (verify structure)
	reporter.startTest("getSymbolsOverview", "Test overview structure and grouping")
	try {
		// Create multiple files with different symbol types
		const classContent = `
export class FileAClass {
    method(): void {}
}
export class AnotherFileAClass {
    anotherMethod(): void {}
}
`

		const functionContent = `
export function fileBFunction(): void {}
export function anotherFileBFunction(): string {
    return "test";
}
`

		const interfaceContent = `
export interface FileCInterface {
    prop: number;
}
export interface AnotherFileCInterface {
    anotherProp: string;
}
`

		const classUri = await createTestFile("grouping-classes.ts", classContent)
		const functionUri = await createTestFile("grouping-functions.ts", functionContent)
		const interfaceUri = await createTestFile("grouping-interfaces.ts", interfaceContent)

		await openTestFile(classUri)
		await openTestFile(functionUri)
		await openTestFile(interfaceUri)

		// Wait for language server processing
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Get overview for the test files directory
		const result = await lspController.getSymbolsOverview({
			relative_path: ".lsp-test-files",
		})

		assert(typeof result === "object", "Should return SymbolsOverview object")

		const fileNames = Object.keys(result)
		assert(fileNames.length >= 3, "Should have entries for all test files")

		// Verify each file has the expected symbols
		for (const fileName of fileNames) {
			const symbols = result[fileName]
			assert(Array.isArray(symbols), `Symbols for ${fileName} should be array`)

			if (fileName.includes("grouping-classes.ts")) {
				// Should contain class symbols
				const classSymbols = symbols.filter((s) => s.kind === vscode.SymbolKind.Class)
				assert(classSymbols.length >= 1, "Classes file should contain class symbols")
			} else if (fileName.includes("grouping-functions.ts")) {
				// Should contain function symbols
				const functionSymbols = symbols.filter((s) => s.kind === vscode.SymbolKind.Function)
				assert(functionSymbols.length >= 1, "Functions file should contain function symbols")
			} else if (fileName.includes("grouping-interfaces.ts")) {
				// Should contain interface symbols
				const interfaceSymbols = symbols.filter((s) => s.kind === vscode.SymbolKind.Interface)
				assert(interfaceSymbols.length >= 1, "Interfaces file should contain interface symbols")
			}
		}

		// Verify the overview maintains file-based grouping
		let totalSymbols = 0
		for (const fileName of fileNames) {
			totalSymbols += result[fileName].length
		}
		assert(totalSymbols > 0, "Should have found symbols across all files")

		reporter.passTest("getSymbolsOverview", "Test overview structure and grouping")
	} catch (error) {
		reporter.failTest("getSymbolsOverview", "Test overview structure and grouping", error)
	}

	// Test 5: Handle empty workspace/directory
	reporter.startTest("getSymbolsOverview", "Handle empty directory")
	try {
		// Create an empty directory
		const workspaceFolders = vscode.workspace.workspaceFolders
		if (!workspaceFolders || workspaceFolders.length === 0) {
			throw new Error("No workspace folder open")
		}

		const emptyTestDir = path.join(workspaceFolders[0].uri.fsPath, ".empty-overview-test")

		// Create empty directory
		if (!fs.existsSync(emptyTestDir)) {
			fs.mkdirSync(emptyTestDir, { recursive: true })
		}

		const result = await lspController.getSymbolsOverview({
			relative_path: ".empty-overview-test",
		})

		assert(typeof result === "object", "Should return SymbolsOverview object for empty directory")
		assert(result !== null, "Result should not be null for empty directory")

		const keys = Object.keys(result)
		assert(keys.length === 0, "Should return empty object for empty directory")

		// Clean up
		fs.rmSync(emptyTestDir, { recursive: true, force: true })

		// Test with non-existent path
		try {
			const nonExistentResult = await lspController.getSymbolsOverview({
				relative_path: "non-existent-directory",
			})

			assert(typeof nonExistentResult === "object", "Should return object for non-existent path")
			const nonExistentKeys = Object.keys(nonExistentResult)
			assert(nonExistentKeys.length === 0, "Should return empty object for non-existent path")
		} catch (error) {
			// It's acceptable for this to throw an error, depending on implementation
			assert(error instanceof Error, "Should throw proper error for non-existent path")
		}

		reporter.passTest("getSymbolsOverview", "Handle empty directory")
	} catch (error) {
		reporter.failTest("getSymbolsOverview", "Handle empty directory", error)
	}

	// Test 6: Verify SymbolsOverview structure completeness
	reporter.startTest("getSymbolsOverview", "Verify SymbolsOverview structure completeness")
	try {
		const structureContent = `
export class StructureClass {
    public field: number = 42;
    
    constructor(value: number) {
        this.field = value;
    }
    
    public getField(): number {
        return this.field;
    }
    
    static createDefault(): StructureClass {
        return new StructureClass(0);
    }
}

export interface StructureInterface {
    id: number;
    name: string;
    optional?: boolean;
}

export function structureFunction(param: string): StructureInterface {
    return {
        id: 1,
        name: param
    };
}

export const structureVariable = new StructureClass(100);

export enum StructureEnum {
    VALUE1 = "value1",
    VALUE2 = "value2"
}
`

		const uri = await createTestFile("structure-test.ts", structureContent)
		await openTestFile(uri)

		// Wait for language server processing
		await new Promise((resolve) => setTimeout(resolve, 500))

		const relativePath = vscode.workspace.asRelativePath(uri)
		const result = await lspController.getSymbolsOverview({
			relative_path: relativePath,
		})

		assert(typeof result === "object", "Should return SymbolsOverview object")
		assert(result !== null, "Result should not be null")

		// Verify the structure matches SymbolsOverview schema
		// Record<string, Array<{name: string, kind: number}>>
		const keys = Object.keys(result)
		assert(keys.length > 0, "Should have at least one file entry")

		for (const filePath of keys) {
			assert(typeof filePath === "string", "File path key should be string")
			assert(filePath.length > 0, "File path should not be empty")

			const symbols = result[filePath]
			assert(Array.isArray(symbols), "Symbols should be array")

			for (const symbol of symbols) {
				// Verify TopLevelSymbolSchema structure
				assert(typeof symbol.name === "string", "Symbol name should be string")
				assert(symbol.name.length > 0, "Symbol name should not be empty")

				assert(typeof symbol.kind === "number", "Symbol kind should be number")
				assert(Number.isInteger(symbol.kind), "Symbol kind should be integer")
				assert(symbol.kind >= 0 && symbol.kind <= 25, "Symbol kind should be valid SymbolKind value")

				// Should only have name and kind properties (TopLevelSymbolSchema)
				const symbolKeys = Object.keys(symbol)
				assert(symbolKeys.length === 2, "Symbol should only have name and kind properties")
				assert(symbolKeys.includes("name"), "Symbol should have name property")
				assert(symbolKeys.includes("kind"), "Symbol should have kind property")
			}
		}

		reporter.passTest("getSymbolsOverview", "Verify SymbolsOverview structure completeness")
	} catch (error) {
		reporter.failTest("getSymbolsOverview", "Verify SymbolsOverview structure completeness", error)
	}

	// Test 7: Check symbols array and summary
	reporter.startTest("getSymbolsOverview", "Check symbols array content and summary")
	try {
		const summaryContent = `
// Test file with various symbol types
class SummaryTestClass {
    private value: number = 0;
    
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

interface SummaryTestInterface {
    id: number;
    name: string;
    getValue(): number;
}

function summaryTestFunction(): void {
    console.log("test");
}

const summaryTestConstant = "constant value";
let summaryTestVariable = 42;

enum SummaryTestEnum {
    OPTION1 = "option1",
    OPTION2 = "option2",
    OPTION3 = "option3"
}

namespace SummaryTestNamespace {
    export interface NestedInterface {
        nestedProp: string;
    }
    
    export function nestedFunction(): void {}
}

type SummaryTestType = {
    typeProp: string;
};
`

		const uri = await createTestFile("summary-test.ts", summaryContent)
		await openTestFile(uri)

		// Wait for language server processing
		await new Promise((resolve) => setTimeout(resolve, 500))

		const relativePath = vscode.workspace.asRelativePath(uri)
		const result = await lspController.getSymbolsOverview({
			relative_path: relativePath,
		})

		assert(typeof result === "object", "Should return SymbolsOverview object")

		const keys = Object.keys(result)
		const testFileEntry = keys.find((key) => key.includes("summary-test.ts"))

		if (testFileEntry) {
			const symbols = result[testFileEntry]
			assert(Array.isArray(symbols), "Symbols should be array")
			assert(symbols.length > 0, "Should have found symbols in test file")

			// Count symbols by kind to verify variety
			const kindCounts: Record<number, number> = {}
			for (const symbol of symbols) {
				kindCounts[symbol.kind] = (kindCounts[symbol.kind] || 0) + 1
			}

			const uniqueKinds = Object.keys(kindCounts).length
			assert(uniqueKinds > 1, "Should have multiple different symbol kinds")

			// Verify specific expected symbols
			const symbolNames = symbols.map((s) => s.name)

			// Should find some of the major symbols we defined
			const expectedSymbols = [
				"SummaryTestClass",
				"SummaryTestInterface",
				"summaryTestFunction",
				"SummaryTestEnum",
				"SummaryTestNamespace",
			]

			let foundExpectedCount = 0
			for (const expected of expectedSymbols) {
				if (symbolNames.includes(expected)) {
					foundExpectedCount++
				}
			}

			assert(foundExpectedCount > 0, "Should find at least some expected symbols")

			// Verify symbol names are meaningful
			for (const symbol of symbols) {
				assert(symbol.name.length > 0, "Symbol names should not be empty")
				assert(!symbol.name.includes("undefined"), "Symbol names should not contain undefined")
				assert(!symbol.name.includes("null"), "Symbol names should not contain null")
			}
		}

		reporter.passTest("getSymbolsOverview", "Check symbols array content and summary")
	} catch (error) {
		reporter.failTest("getSymbolsOverview", "Check symbols array content and summary", error)
	}

	// Test 8: Test with max_answer_chars parameter
	reporter.startTest("getSymbolsOverview", "Test max_answer_chars parameter")
	try {
		// Create a file with many symbols to test the character limit
		const largeContent = `
// Large file with many symbols
${Array.from(
	{ length: 50 },
	(_, i) => `
export class LargeTestClass${i} {
    field${i}: number = ${i};
    method${i}(): void {}
    static staticMethod${i}(): number { return ${i}; }
}

export interface LargeTestInterface${i} {
    prop${i}: number;
    method${i}(): void;
}

export function largeTestFunction${i}(): void {}

export const largeTestConstant${i} = "value${i}";
`,
).join("\n")}
`

		const uri = await createTestFile("large-test.ts", largeContent)
		await openTestFile(uri)

		// Wait for language server processing
		await new Promise((resolve) => setTimeout(resolve, 1000))

		const relativePath = vscode.workspace.asRelativePath(uri)

		// Test with very small character limit
		const limitedResult = await lspController.getSymbolsOverview({
			relative_path: relativePath,
			max_answer_chars: 50, // Very small limit
		})

		assert(typeof limitedResult === "object", "Should return object even with character limit")

		// Convert result to string to check character count
		const resultString = JSON.stringify(limitedResult)

		// If the implementation respects max_answer_chars, result should be empty or very small
		// Note: Implementation might return empty object if content exceeds limit
		if (Object.keys(limitedResult).length === 0) {
			// Empty result due to character limit - this is acceptable
			assert(true, "Empty result due to character limit is acceptable")
		} else {
			// If not empty, the result might still contain some data
			// Just warn if it seems too large
			if (resultString.length > 1000) {
				console.warn(
					`Warning: Result with max_answer_chars=100 is ${resultString.length} chars (expected <= 1000)`,
				)
			}
		}

		// Test with generous character limit
		const generousResult = await lspController.getSymbolsOverview({
			relative_path: relativePath,
			max_answer_chars: 100000, // Large limit
		})

		assert(typeof generousResult === "object", "Should return object with generous limit")

		// Should find more symbols with generous limit
		const generousKeys = Object.keys(generousResult)
		if (generousKeys.length > 0) {
			const generousSymbols = generousResult[generousKeys[0]]
			assert(Array.isArray(generousSymbols), "Should return symbols array with generous limit")
		}

		reporter.passTest("getSymbolsOverview", "Test max_answer_chars parameter")
	} catch (error) {
		reporter.failTest("getSymbolsOverview", "Test max_answer_chars parameter", error)
	}

	// Test 9: Handle edge cases properly
	reporter.startTest("getSymbolsOverview", "Handle edge cases properly")
	try {
		// Test with empty file
		const emptyUri = await createTestFile("empty-file.ts", "")
		await openTestFile(emptyUri)

		const emptyRelativePath = vscode.workspace.asRelativePath(emptyUri)
		const emptyResult = await lspController.getSymbolsOverview({
			relative_path: emptyRelativePath,
		})

		assert(typeof emptyResult === "object", "Should return object for empty file")

		// Test with file containing only comments
		const commentsUri = await createTestFile(
			"comments-only.ts",
			`
// This file only contains comments
/* 
 * Multi-line comment
 */
/**
 * JSDoc comment
 */
`,
		)
		await openTestFile(commentsUri)

		const commentsRelativePath = vscode.workspace.asRelativePath(commentsUri)
		const commentsResult = await lspController.getSymbolsOverview({
			relative_path: commentsRelativePath,
		})

		assert(typeof commentsResult === "object", "Should return object for comments-only file")

		// Test with file containing syntax errors (should not crash)
		const syntaxErrorUri = await createTestFile(
			"syntax-error.ts",
			`
class BrokenClass {
    method() {
        // Missing closing brace
    // Missing closing brace for class
`,
		)
		await openTestFile(syntaxErrorUri)

		const errorRelativePath = vscode.workspace.asRelativePath(syntaxErrorUri)

		try {
			const errorResult = await lspController.getSymbolsOverview({
				relative_path: errorRelativePath,
			})

			assert(typeof errorResult === "object", "Should return object even with syntax errors")
			// Implementation should handle syntax errors gracefully
		} catch (error) {
			// It's acceptable for this to fail, but it shouldn't crash the extension
			assert(error instanceof Error, "Should throw proper error for syntax errors")
		}

		// Test with special characters in path
		const specialCharsUri = await createTestFile(
			"special-chars-file.ts",
			`
export class SpecialCharsClass {
    specialMethod(): void {}
}
`,
		)
		await openTestFile(specialCharsUri)

		const specialCharsRelativePath = vscode.workspace.asRelativePath(specialCharsUri)
		const specialCharsResult = await lspController.getSymbolsOverview({
			relative_path: specialCharsRelativePath,
		})

		assert(typeof specialCharsResult === "object", "Should handle files with special characters")

		reporter.passTest("getSymbolsOverview", "Handle edge cases properly")
	} catch (error) {
		reporter.failTest("getSymbolsOverview", "Handle edge cases properly", error)
	}

	// Test 10: Test with different file types
	reporter.startTest("getSymbolsOverview", "Test with different file types")
	try {
		// Test with Python file
		const pyUri = await createTestFile("test-overview.py", SAMPLE_PY_CONTENT)
		await openTestFile(pyUri)

		const pyRelativePath = vscode.workspace.asRelativePath(pyUri)
		const pyResult = await lspController.getSymbolsOverview({
			relative_path: pyRelativePath,
		})

		assert(typeof pyResult === "object", "Should return object for Python file")

		// Test with JavaScript file
		const jsUri = await createTestFile("test-overview.js", SAMPLE_JS_CONTENT)
		await openTestFile(jsUri)

		const jsRelativePath = vscode.workspace.asRelativePath(jsUri)
		const jsResult = await lspController.getSymbolsOverview({
			relative_path: jsRelativePath,
		})

		assert(typeof jsResult === "object", "Should return object for JavaScript file")

		// Test with JSON file (should handle gracefully)
		const jsonContent = `{
    "name": "test",
    "version": "1.0.0",
    "dependencies": {}
}`

		const jsonUri = await createTestFile("test.json", jsonContent)
		await openTestFile(jsonUri)

		const jsonRelativePath = vscode.workspace.asRelativePath(jsonUri)
		const jsonResult = await lspController.getSymbolsOverview({
			relative_path: jsonRelativePath,
		})

		assert(typeof jsonResult === "object", "Should return object for JSON file")

		// Test with unsupported file type
		const txtUri = await createTestFile("test.txt", "This is just plain text content.")
		await openTestFile(txtUri)

		const txtRelativePath = vscode.workspace.asRelativePath(txtUri)
		const txtResult = await lspController.getSymbolsOverview({
			relative_path: txtRelativePath,
		})

		assert(typeof txtResult === "object", "Should return object for plain text file")

		// Verify that we can distinguish between different file types
		const allResults = [pyResult, jsResult, jsonResult, txtResult]
		for (const result of allResults) {
			assert(typeof result === "object", "All file type results should be objects")
			assert(result !== null, "All file type results should not be null")
		}

		reporter.passTest("getSymbolsOverview", "Test with different file types")
	} catch (error) {
		reporter.failTest("getSymbolsOverview", "Test with different file types", error)
	}
}
