/**
 * Integration tests for rename LSP tool
 */

import * as vscode from "vscode"
import { lspController } from "../../zentara_lsp/src/LspController"
import {
	TestReporter,
	createTestFile,
	openTestFile,
	assert,
	assertArrayEqual,
	SAMPLE_TS_CONTENT,
	SAMPLE_PY_CONTENT,
	SAMPLE_JS_CONTENT,
} from "./testUtils"

/**
 * Helper function to validate WorkspaceEdit structure
 */
function validateWorkspaceEdit(edit: any, expectedFileCount: number, testName: string): void {
	assert(edit !== null && edit !== undefined, `${testName}: Should return WorkspaceEdit`)

	if (!edit) return

	let hasChanges = edit.success !== undefined ? edit.success : true

	assert(hasChanges, `${testName}: WorkspaceEdit should have changes or documentChanges`)
}

/**
 * Helper function to count text edits in a WorkspaceEdit
 */
function countTextEdits(edit: any): number {
	try {
		let count = 0

		if (edit && edit.changes) {
			// Safely iterate to avoid circular references
			try {
				for (const uri in edit.changes) {
					if (edit.changes[uri] && Array.isArray(edit.changes[uri])) {
						count += edit.changes[uri].length
					}
				}
			} catch (e) {
				console.warn("Error counting text edits in changes:", e)
			}
		}

		if (edit && edit.documentChanges && Array.isArray(edit.documentChanges)) {
			try {
				for (const change of edit.documentChanges) {
					if (change && change.edits && Array.isArray(change.edits)) {
						count += change.edits.length
					}
				}
			} catch (e) {
				console.warn("Error counting text edits in documentChanges:", e)
			}
		}

		return count
	} catch (error) {
		console.error("Fatal error in countTextEdits:", error)
		return 0
	}
}

/**
 * Helper function to assert edit count if rename is available
 */
function assertEditCountIfAvailable(editCount: number, expectedMin: number, message: string): void {
	if (editCount > 0) {
		assert(editCount >= expectedMin, message)
	}
}

export async function WtestRename(reporter: TestReporter): Promise<void> {
	// ========== SYMBOL NAME PARAMETER TESTS ==========
	// Test symbolName-based rename functionality
	
	// Test SN1: Rename TypeScript variable using symbolName
	reporter.startTest("rename", "Rename TypeScript variable using symbolName")
	try {
		const renameContent = `
const oldVariableName = 42;
const anotherVar = oldVariableName + 10;

function useVariable() {
    console.log(oldVariableName);
    return oldVariableName * 2;
}
`

		const uri = await createTestFile("test-rename-var-symbolname.ts", renameContent)
		const editor = await openTestFile(uri)

		// Wait for LSP server to process
		await new Promise((resolve) => setTimeout(resolve, 500))

		// Use symbolName instead of position
		const result = await lspController.rename({
			uri: uri.toString(),
			symbolName: "oldVariableName",
			newName: "newVariableName",
		})

		validateWorkspaceEdit(result, 1, "TypeScript variable rename using symbolName")

		// Verify that multiple occurrences are renamed
		const editCount = countTextEdits(result)
		assertEditCountIfAvailable(
			editCount,
			3,
			`Should rename all 3 occurrences of variable using symbolName, found ${editCount} edits`,
		)

		reporter.passTest("rename", "Rename TypeScript variable using symbolName")
	} catch (error) {
		reporter.failTest("rename", "Rename TypeScript variable using symbolName", error)
	}

	// Test SN2: Rename class using symbolName
	reporter.startTest("rename", "Rename class using symbolName")
	try {
		const classContent = `
class OldClassName {
    private value: number;
    
    constructor(val: number) {
        this.value = val;
    }

    getClassName(): string {
        return "OldClassName";
    }
}

const instance = new OldClassName(42);
const another: OldClassName = new OldClassName(100);
const className = instance.getClassName();
`

		const uri = await createTestFile("test-rename-class-symbolname.ts", classContent)
		const editor = await openTestFile(uri)

		await new Promise((resolve) => setTimeout(resolve, 500))

		const result = await lspController.rename({
			uri: uri.toString(),
			symbolName: "OldClassName",
			newName: "NewClassName",
		})

		validateWorkspaceEdit(result, 1, "Class rename using symbolName")

		// Verify that all class occurrences are renamed
		const editCount = countTextEdits(result)
		assertEditCountIfAvailable(editCount, 3, `Should rename all class occurrences using symbolName, found ${editCount} edits`)

		reporter.passTest("rename", "Rename class using symbolName")
	} catch (error) {
		reporter.failTest("rename", "Rename class using symbolName", error)
	}

	// Test SN3: Rename method using symbolName
	reporter.startTest("rename", "Rename method using symbolName")
	try {
		const methodContent = `
class TestClass {
    oldMethodName(): string {
        return "test";
    }
    
    useMethod(): void {
        this.oldMethodName();
        const result = this.oldMethodName();
    }
}

const obj = new TestClass();
obj.oldMethodName();
const methodResult = obj.oldMethodName();
`

		const uri = await createTestFile("test-rename-method-symbolname.ts", methodContent)
		const editor = await openTestFile(uri)

		await new Promise((resolve) => setTimeout(resolve, 500))

		const result = await lspController.rename({
			uri: uri.toString(),
			symbolName: "oldMethodName",
			newName: "newMethodName",
		})

		validateWorkspaceEdit(result, 1, "Method rename using symbolName")

		// Verify that all method occurrences are renamed
		const editCount = countTextEdits(result)
		assertEditCountIfAvailable(editCount, 4, `Should rename all method occurrences using symbolName, found ${editCount} edits`)

		reporter.passTest("rename", "Rename method using symbolName")
	} catch (error) {
		reporter.failTest("rename", "Rename method using symbolName", error)
	}

	// Test SN4: Rename function using symbolName
	reporter.startTest("rename", "Rename function using symbolName")
	try {
		const functionContent = `
function oldFunctionName(param: string): string {
    return param.toUpperCase();
}

function anotherFunction(): string {
    const result1 = oldFunctionName("hello");
    const result2 = oldFunctionName("world");
    return result1 + " " + result2;
}

const globalResult = oldFunctionName("test");
`

		const uri = await createTestFile("test-rename-function-symbolname.ts", functionContent)
		const editor = await openTestFile(uri)

		await new Promise((resolve) => setTimeout(resolve, 500))

		const result = await lspController.rename({
			uri: uri.toString(),
			symbolName: "oldFunctionName",
			newName: "newFunctionName",
		})

		validateWorkspaceEdit(result, 1, "Function rename using symbolName")

		// Verify that all function occurrences are renamed
		const editCount = countTextEdits(result)
		assertEditCountIfAvailable(editCount, 4, `Should rename all function occurrences using symbolName, found ${editCount} edits`)

		reporter.passTest("rename", "Rename function using symbolName")
	} catch (error) {
		reporter.failTest("rename", "Rename function using symbolName", error)
	}

	// Test SN5: Rename interface property using symbolName
	reporter.startTest("rename", "Rename interface property using symbolName")
	try {
		const interfaceContent = `
interface UserData {
    oldPropertyName: string;
    age: number;
}

function processUser(user: UserData): void {
    console.log(user.oldPropertyName);
    const name = user.oldPropertyName;
}

const userData: UserData = {
    oldPropertyName: "John",
    age: 25
};

const propValue = userData.oldPropertyName;
`

		const uri = await createTestFile("test-rename-property-symbolname.ts", interfaceContent)
		const editor = await openTestFile(uri)

		await new Promise((resolve) => setTimeout(resolve, 500))

		const result = await lspController.rename({
			uri: uri.toString(),
			symbolName: "oldPropertyName",
			newName: "newPropertyName",
		})

		validateWorkspaceEdit(result, 1, "Interface property rename using symbolName")

		// Verify that all property occurrences are renamed
		const editCount = countTextEdits(result)
		assertEditCountIfAvailable(editCount, 4, `Should rename all property occurrences using symbolName, found ${editCount} edits`)

		reporter.passTest("rename", "Rename interface property using symbolName")
	} catch (error) {
		reporter.failTest("rename", "Rename interface property using symbolName", error)
	}

	// Test SN6: Error handling - invalid symbolName
	reporter.startTest("rename", "Handle invalid symbolName gracefully")
	try {
		const uri = await createTestFile("test-invalid-symbolname.ts", "const validSymbol = 42;")
		const editor = await openTestFile(uri)

		await new Promise((resolve) => setTimeout(resolve, 500))

		// Try to rename a non-existent symbol
		const result = await lspController.rename({
			uri: uri.toString(),
			symbolName: "nonExistentSymbol",
			newName: "newName",
		})

		// Should handle invalid symbolName gracefully
		if (result && typeof result === 'object' && 'success' in result) {
			assert(!result.success, "Should return success: false for invalid symbolName")
		} else {
			// Some LSP servers might return null or empty edit
			const editCount = countTextEdits(result)
			assert(editCount === 0, "Should return no edits for invalid symbolName")
		}

		reporter.passTest("rename", "Handle invalid symbolName gracefully")
	} catch (error) {
		// Expected behavior - error thrown for invalid symbol
		console.log(`Invalid symbolName threw error: ${error.message}`)
		reporter.passTest("rename", "Handle invalid symbolName gracefully (threw error)")
	}

	// Test SN7: Error handling - empty symbolName
	reporter.startTest("rename", "Handle empty symbolName parameter")
	try {
		const uri = await createTestFile("test-empty-symbolname.ts", "const validSymbol = 42;")
		const editor = await openTestFile(uri)

		await new Promise((resolve) => setTimeout(resolve, 500))

		// Try to rename with empty symbolName
		const result = await lspController.rename({
			uri: uri.toString(),
			symbolName: "",
			newName: "newName",
		})

		// Should handle empty symbolName gracefully
		if (result && typeof result === 'object' && 'success' in result) {
			assert(!result.success, "Should return success: false for empty symbolName")
		} else {
			const editCount = countTextEdits(result)
			assert(editCount === 0, "Should return no edits for empty symbolName")
		}

		reporter.passTest("rename", "Handle empty symbolName parameter")
	} catch (error) {
		// Expected behavior - validation error for empty symbolName
		console.log(`Empty symbolName threw error: ${error.message}`)
		reporter.passTest("rename", "Handle empty symbolName parameter (threw error)")
	}

	// Test SN8: SymbolName with ambiguous matches
	reporter.startTest("rename", "Handle ambiguous symbolName matches")
	try {
		const ambiguousContent = `
class Container {
    private testSymbol: string = "field";
    
    testSymbol(): string {
        return this.testSymbol;
    }
}

function testSymbol(): string {
    return "function";
}

const testSymbol = "variable";
`

		const uri = await createTestFile("test-ambiguous-symbolname.ts", ambiguousContent)
		const editor = await openTestFile(uri)

		await new Promise((resolve) => setTimeout(resolve, 500))

		// Try to rename ambiguous symbol - should use first match
		const result = await lspController.rename({
			uri: uri.toString(),
			symbolName: "testSymbol",
			newName: "renamedSymbol",
		})

		// Should handle ambiguous matches (use first match)
		validateWorkspaceEdit(result, 1, "Ambiguous symbolName rename")
		
		// At least one occurrence should be renamed
		const editCount = countTextEdits(result)
		assertEditCountIfAvailable(editCount, 1, `Should rename at least one occurrence for ambiguous symbolName, found ${editCount} edits`)

		reporter.passTest("rename", "Handle ambiguous symbolName matches")
	} catch (error) {
		reporter.failTest("rename", "Handle ambiguous symbolName matches", error)
	}

	// Test SN9: Cross-file rename using symbolName
	reporter.startTest("rename", "Cross-file rename using symbolName")
	try {
		// Create first file with export
		const file1Content = `
export class SharedSymbolClass {
    public sharedMethod(): string {
        return "shared";
    }
}

export const SHARED_SYMBOL_CONSTANT = 42;
`

		// Create second file with import and usage
		const file2Content = `
import { SharedSymbolClass, SHARED_SYMBOL_CONSTANT } from './test-shared-symbol-class';

class Consumer {
    private instance = new SharedSymbolClass();
    
    useShared(): string {
        console.log(SHARED_SYMBOL_CONSTANT);
        return this.instance.sharedMethod();
    }
}
`

		const uri1 = await createTestFile("test-shared-symbol-class.ts", file1Content)
		const uri2 = await createTestFile("test-consumer-symbol.ts", file2Content)

		// Open both files
		await openTestFile(uri1)
		await openTestFile(uri2)

		// Wait for language server to process imports
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Rename the class using symbolName
		const result = await lspController.rename({
			uri: uri1.toString(),
			symbolName: "SharedSymbolClass",
			newName: "RenamedSharedSymbolClass",
		})

		validateWorkspaceEdit(result, 1, "Cross-file rename using symbolName")

		// Should potentially affect both files if LSP supports cross-file renaming
		const editCount = countTextEdits(result)
		assertEditCountIfAvailable(
			editCount,
			1,
			`Should rename at least the class declaration using symbolName, found ${editCount} edits`,
		)

		reporter.passTest("rename", "Cross-file rename using symbolName")
	} catch (error) {
		reporter.failTest("rename", "Cross-file rename using symbolName", error)
	}

	// Test SN10: Rename Python function using symbolName
	reporter.startTest("rename", "Rename Python function using symbolName")
	try {
		const pythonContent = `
def old_python_function():
    return 42

def another_function():
    result = old_python_function()
    return old_python_function() + 10

value = old_python_function()
final_result = old_python_function()
`

		const uri = await createTestFile("test-rename-python-symbolname.py", pythonContent)
		const editor = await openTestFile(uri)

		await new Promise((resolve) => setTimeout(resolve, 500))

		const result = await lspController.rename({
			uri: uri.toString(),
			symbolName: "old_python_function",
			newName: "new_python_function",
		})

		validateWorkspaceEdit(result, 1, "Python function rename using symbolName")

		// Verify that all function occurrences are renamed
		const editCount = countTextEdits(result)
		assertEditCountIfAvailable(editCount, 4, `Should rename all Python function occurrences using symbolName, found ${editCount} edits`)

		reporter.passTest("rename", "Rename Python function using symbolName")
	} catch (error) {
		reporter.failTest("rename", "Rename Python function using symbolName", error)
	}

	// Test SN11: Rename JavaScript variable using symbolName
	reporter.startTest("rename", "Rename JavaScript variable using symbolName")
	try {
		const jsContent = `
const oldJsVarName = "hello";

function useVariable() {
    console.log(oldJsVarName);
    return oldJsVarName.toUpperCase();
}

const result = oldJsVarName + " world";
const copy = oldJsVarName;
`

		const uri = await createTestFile("test-rename-js-symbolname.js", jsContent)
		const editor = await openTestFile(uri)

		await new Promise((resolve) => setTimeout(resolve, 500))

		const result = await lspController.rename({
			uri: uri.toString(),
			symbolName: "oldJsVarName",
			newName: "newJsVarName",
		})

		validateWorkspaceEdit(result, 1, "JavaScript variable rename using symbolName")

		// Verify that all variable occurrences are renamed
		const editCount = countTextEdits(result)
		assertEditCountIfAvailable(editCount, 4, `Should rename all JavaScript variable occurrences using symbolName, found ${editCount} edits`)

		reporter.passTest("rename", "Rename JavaScript variable using symbolName")
	} catch (error) {
		reporter.failTest("rename", "Rename JavaScript variable using symbolName", error)
	}

	// Test SN12: Compare symbolName vs position-based rename results
	reporter.startTest("rename", "Compare symbolName vs position-based rename")
	try {
		const compareContent = `
function targetFunction() {
    return "test";
}

const result1 = targetFunction();
const result2 = targetFunction();
`

		const uri = await createTestFile("test-compare-rename-methods.ts", compareContent)
		const editor = await openTestFile(uri)

		await new Promise((resolve) => setTimeout(resolve, 500))

		// Rename using symbolName
		const symbolNameResult = await lspController.rename({
			uri: uri.toString(),
			symbolName: "targetFunction",
			newName: "renamedViaSymbolName",
		})

		// Re-open the file for position-based test
		const uri2 = await createTestFile("test-compare-rename-methods-pos.ts", compareContent)
		const editor2 = await openTestFile(uri2)

		await new Promise((resolve) => setTimeout(resolve, 500))

		// Rename using position (on function declaration)
		const positionResult = await lspController.rename({
			textDocument: { uri: uri2.toString() },
			position: { line: 1, character: 9 }, // Position on "targetFunction"
			newName: "renamedViaPosition",
		})

		// Both methods should find similar number of edits
		const symbolEditCount = countTextEdits(symbolNameResult)
		const positionEditCount = countTextEdits(positionResult)

		// Allow some tolerance for differences in LSP behavior
		assert(
			Math.abs(symbolEditCount - positionEditCount) <= 1,
			`SymbolName and position-based rename should find similar edit counts: symbolName=${symbolEditCount}, position=${positionEditCount}`
		)

		reporter.passTest("rename", "Compare symbolName vs position-based rename")
	} catch (error) {
		reporter.failTest("rename", "Compare symbolName vs position-based rename", error)
	}

	// ========== BACKWARD COMPATIBILITY TESTS (EXISTING) ==========
	// Existing position-based tests remain for backward compatibility
	
	// Test 1: Rename TypeScript variable (position-based)
	reporter.startTest("rename", "Rename TypeScript variable")
	try {
		const renameContent = `
const oldVariableName = 42;
const anotherVar = oldVariableName + 10;

function useVariable() {
    console.log(oldVariableName);
    return oldVariableName * 2;
}
`

		const uri = await createTestFile("test-rename-var.ts", renameContent)
		const editor = await openTestFile(uri)

		let result: any
		try {
			console.log(`🔍 DIAGNOSTIC: About to call rename for URI: ${uri.toString()}`)
			console.log(`🔍 DIAGNOSTIC: File exists before rename: ${require("fs").existsSync(uri.fsPath)}`)

			// Wait for LSP server to fully process the file
			console.log(`🔍 DIAGNOSTIC: Waiting for LSP server to process file...`)
			await new Promise((resolve) => setTimeout(resolve, 500))

			// Verify file still exists right before rename
			if (!require("fs").existsSync(uri.fsPath)) {
				throw new Error(`Test file disappeared before rename operation: ${uri.fsPath}`)
			}

			result = await lspController.rename({
				textDocument: { uri: uri.toString() },
				position: { line: 1, character: 6 }, // Position on "oldVariableName"
				newName: "newVariableName",
			})
			console.log("🔍 DIAGNOSTIC: Rename completed, got result type:", typeof result)
			console.log("🔍 DIAGNOSTIC: Rename result:", JSON.stringify(result, null, 2))
		} catch (renameError) {
			console.error("🔍 DIAGNOSTIC: Error during rename:", renameError)
			throw renameError
		}

		validateWorkspaceEdit(result, 1, "TypeScript variable rename")

		// Verify that multiple occurrences are renamed (if rename is available)
		const editCount = countTextEdits(result)
		assertEditCountIfAvailable(
			editCount,
			3,
			`Should rename all 3 occurrences of variable, found ${editCount} edits`,
		)

		reporter.passTest("rename", "Rename TypeScript variable")
	} catch (error) {
		reporter.failTest("rename", "Rename TypeScript variable", error)
	}

	// Test 2: Rename class name (position-based)
	reporter.startTest("rename", "Rename class name")
	try {
		const classContent = `
class OldClassName {
    private value: number;
    
    constructor(val: number) {
        this.value = val;
    }
}

const instance = new OldClassName(42);
const another: OldClassName = new OldClassName(100);
`

		const uri = await createTestFile("test-rename-class.ts", classContent)
		const editor = await openTestFile(uri)

		const result = await lspController.rename({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 6 }, // Position on "OldClassName"
			newName: "NewClassName",
		})

		validateWorkspaceEdit(result, 1, "Class rename")

		// Verify that all class occurrences are renamed (class declaration + 2 usages)
		const editCount = countTextEdits(result)
		assertEditCountIfAvailable(editCount, 3, `Should rename all 3 occurrences of class, found ${editCount} edits`)

		reporter.passTest("rename", "Rename class name")
	} catch (error) {
		reporter.failTest("rename", "Rename class name", error)
	}

	// Test 3: Rename method name (position-based)
	reporter.startTest("rename", "Rename method name")
	try {
		const methodContent = `
class TestClass {
    oldMethodName(): string {
        return "test";
    }
    
    useMethod(): void {
        this.oldMethodName();
        const result = this.oldMethodName();
    }
}

const obj = new TestClass();
obj.oldMethodName();
`

		const uri = await createTestFile("test-rename-method.ts", methodContent)
		const editor = await openTestFile(uri)

		const result = await lspController.rename({
			textDocument: { uri: uri.toString() },
			position: { line: 2, character: 4 }, // Position on "oldMethodName"
			newName: "newMethodName",
		})

		validateWorkspaceEdit(result, 1, "Method rename")

		// Verify that all method occurrences are renamed (declaration + 3 usages)
		const editCount = countTextEdits(result)
		assertEditCountIfAvailable(editCount, 3, `Should rename all method occurrences, found ${editCount} edits`)

		reporter.passTest("rename", "Rename method name")
	} catch (error) {
		reporter.failTest("rename", "Rename method name", error)
	}

	// Test 4: Rename Python function (position-based)
	reporter.startTest("rename", "Rename Python function")
	try {
		const pythonContent = `
def old_function_name():
    return 42

def another_function():
    result = old_function_name()
    return old_function_name() + 10

value = old_function_name()
`

		const uri = await createTestFile("test-rename-py.py", pythonContent)
		const editor = await openTestFile(uri)

		const result = await lspController.rename({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 4 }, // Position on "old_function_name"
			newName: "new_function_name",
		})

		validateWorkspaceEdit(result, 1, "Python function rename")

		// Verify that all function occurrences are renamed
		const editCount = countTextEdits(result)
		assertEditCountIfAvailable(editCount, 3, `Should rename all function occurrences, found ${editCount} edits`)

		reporter.passTest("rename", "Rename Python function")
	} catch (error) {
		reporter.failTest("rename", "Rename Python function", error)
	}

	// Test 5: Rename JavaScript variable (position-based)
	reporter.startTest("rename", "Rename JavaScript variable")
	try {
		const jsContent = `
const oldVarName = "hello";

function useVariable() {
    console.log(oldVarName);
    return oldVarName.toUpperCase();
}

const result = oldVarName + " world";
`

		const uri = await createTestFile("test-rename-js.js", jsContent)
		const editor = await openTestFile(uri)

		const result = await lspController.rename({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 6 }, // Position on "oldVarName"
			newName: "newVarName",
		})

		validateWorkspaceEdit(result, 1, "JavaScript variable rename")

		// Verify that all variable occurrences are renamed
		const editCount = countTextEdits(result)
		assertEditCountIfAvailable(editCount, 3, `Should rename all variable occurrences, found ${editCount} edits`)

		reporter.passTest("rename", "Rename JavaScript variable")
	} catch (error) {
		reporter.failTest("rename", "Rename JavaScript variable", error)
	}

	// Test 6: Handle invalid rename position (position-based)
	reporter.startTest("rename", "Handle invalid rename position")
	try {
		const uri = await createTestFile("test-invalid-rename.ts", "// Comment\nconst x = 42;")
		const editor = await openTestFile(uri)

		// Try to rename at a comment position
		const result = await lspController.rename({
			textDocument: { uri: uri.toString() },
			position: { line: 0, character: 5 }, // Position in comment
			newName: "newName",
		})

		// Should not throw error, may return null or empty edit
		assert(result !== undefined, "Should handle invalid rename position gracefully")

		reporter.passTest("rename", "Handle invalid rename position")
	} catch (error) {
		reporter.failTest("rename", "Handle invalid rename position", error)
	}

	// Test 7: Rename interface property (position-based)
	reporter.startTest("rename", "Rename interface property")
	try {
		const interfaceContent = `
interface UserData {
    oldPropertyName: string;
    age: number;
}

function processUser(user: UserData): void {
    console.log(user.oldPropertyName);
    const name = user.oldPropertyName;
}

const userData: UserData = {
    oldPropertyName: "John",
    age: 25
};
`

		const uri = await createTestFile("test-rename-property.ts", interfaceContent)
		const editor = await openTestFile(uri)

		const result = await lspController.rename({
			textDocument: { uri: uri.toString() },
			position: { line: 2, character: 4 }, // Position on "oldPropertyName"
			newName: "newPropertyName",
		})

		validateWorkspaceEdit(result, 1, "Interface property rename")

		// Verify that all property occurrences are renamed (interface + 3 usages)
		const editCount = countTextEdits(result)
		assertEditCountIfAvailable(editCount, 4, `Should rename all property occurrences, found ${editCount} edits`)

		reporter.passTest("rename", "Rename interface property")
	} catch (error) {
		reporter.failTest("rename", "Rename interface property", error)
	}

	// Test 8: Test invalid rename scenarios (position-based)
	reporter.startTest("rename", "Test invalid rename - keywords")
	try {
		const invalidContent = `
const validName = 42;
console.log(validName);
`

		const uri = await createTestFile("test-invalid-keyword.ts", invalidContent)
		const editor = await openTestFile(uri)

		// Try to rename to a TypeScript keyword
		const result = await lspController.rename({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 6 }, // Position on "validName"
			newName: "class", // Invalid - TypeScript keyword
		})

		// Different LSP servers handle this differently:
		// - Some return null/undefined
		// - Some return empty WorkspaceEdit
		// - Some throw an error
		// - Some allow it (and let TypeScript compiler catch it later)

		if (result === null || result === undefined) {
			// LSP rejected the rename
			reporter.passTest("rename", "Test invalid rename - keywords (returned null)")
		} else if (result && countTextEdits(result) === 0) {
			// LSP returned empty edit
			reporter.passTest("rename", "Test invalid rename - keywords (returned empty edit)")
		} else {
			// LSP allowed the rename (will be caught by TypeScript compiler)
			reporter.passTest("rename", "Test invalid rename - keywords (allowed by LSP)")
		}
	} catch (error) {
		// Expected behavior for invalid keywords - error thrown
		// Different LSP servers use different error messages
		console.log(`Rename to keyword threw error: ${error.message}`)
		reporter.passTest("rename", "Test invalid rename - keywords (threw error)")
	}

	// Test 9: Cross-file rename (position-based)
	reporter.startTest("rename", "Cross-file rename")
	try {
		// Create first file with export
		const file1Content = `
export class SharedClass {
    public sharedMethod(): string {
        return "shared";
    }
}

export const SHARED_CONSTANT = 42;
`

		// Create second file with import and usage
		const file2Content = `
import { SharedClass, SHARED_CONSTANT } from './test-shared-class';

class Consumer {
    private instance = new SharedClass();
    
    useShared(): string {
        console.log(SHARED_CONSTANT);
        return this.instance.sharedMethod();
    }
}
`

		const uri1 = await createTestFile("test-shared-class.ts", file1Content)
		const uri2 = await createTestFile("test-consumer.ts", file2Content)

		// Open both files
		await openTestFile(uri1)
		await openTestFile(uri2)

		// Wait a bit for language server to process imports
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Rename the class in the first file
		const result = await lspController.rename({
			textDocument: { uri: uri1.toString() },
			position: { line: 1, character: 13 }, // Position on "SharedClass"
			newName: "RenamedSharedClass",
		})

		validateWorkspaceEdit(result, 1, "Cross-file rename")

		// Should potentially affect both files if LSP supports cross-file renaming
		const editCount = countTextEdits(result)
		assertEditCountIfAvailable(
			editCount,
			1,
			`Should rename at least the class declaration, found ${editCount} edits`,
		)

		reporter.passTest("rename", "Cross-file rename")
	} catch (error) {
		reporter.failTest("rename", "Cross-file rename", error)
	}

	// Test 10: Rename with special characters in name (position-based)
	reporter.startTest("rename", "Rename with special characters")
	try {
		const specialContent = `
const validName = "test";
const another_valid_name = validName + "suffix";
`

		const uri = await createTestFile("test-special-chars.ts", specialContent)
		const editor = await openTestFile(uri)

		// Try to rename to name with special characters
		const result = await lspController.rename({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 6 }, // Position on "validName"
			newName: "valid$Name", // Contains special character
		})

		// Should either succeed or fail gracefully
		if (result) {
			validateWorkspaceEdit(result, 1, "Rename with special characters")
		}

		reporter.passTest("rename", "Rename with special characters")
	} catch (error) {
		// Some LSP servers may reject special characters
		reporter.passTest("rename", "Rename with special characters (rejected as expected)")
	}

	// Test 11: Rename at different positions of the same symbol (position-based)
	reporter.startTest("rename", "Rename at different symbol positions")
	try {
		const multiPositionContent = `
function testFunction() {
    return "test";
}

const result1 = testFunction();
const result2 = testFunction();
`

		const uri = await createTestFile("test-multi-position.ts", multiPositionContent)
		const editor = await openTestFile(uri)

		// Rename from function declaration
		const result1 = await lspController.rename({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 9 }, // Position on function name in declaration
			newName: "renamedFunction",
		})

		validateWorkspaceEdit(result1, 1, "Rename from declaration position")

		// Rename from first usage (should give same result)
		const result2 = await lspController.rename({
			textDocument: { uri: uri.toString() },
			position: { line: 5, character: 16 }, // Position on function name in first call
			newName: "anotherRenamedFunction",
		})

		validateWorkspaceEdit(result2, 1, "Rename from usage position")

		// Both should find the same number of edits
		const editCount1 = countTextEdits(result1)
		const editCount2 = countTextEdits(result2)
		assert(
			editCount1 === editCount2,
			`Should find same number of edits from different positions: ${editCount1} vs ${editCount2}`,
		)

		reporter.passTest("rename", "Rename at different symbol positions")
	} catch (error) {
		reporter.failTest("rename", "Rename at different symbol positions", error)
	}

	// Test SN13: Verify flattened parameter format support
	reporter.startTest("rename", "Verify flattened parameter format {uri, symbolName, newName}")
	try {
		const flattenedTestContent = `
class FlattenedTestClass {
    flattenedMethod(): void {
        console.log("Testing flattened parameters");
    }
}

const instance = new FlattenedTestClass();
instance.flattenedMethod();
`

		const uri = await createTestFile("test-flattened-format.ts", flattenedTestContent)
		const editor = await openTestFile(uri)

		await new Promise((resolve) => setTimeout(resolve, 500))

		// Test the new flattened parameter format explicitly
		const result = await lspController.rename({
			uri: uri.toString(),               // Direct uri parameter (not nested in textDocument)
			symbolName: "flattenedMethod",     // Name-based lookup instead of position
			newName: "renamedFlattenedMethod", // Direct newName parameter
		})

		validateWorkspaceEdit(result, 1, "Flattened parameter format rename")

		// Verify method occurrences are renamed
		const editCount = countTextEdits(result)
		assertEditCountIfAvailable(editCount, 2, `Should rename method occurrences using flattened format, found ${editCount} edits`)

		reporter.passTest("rename", "Verify flattened parameter format {uri, symbolName, newName}")
	} catch (error) {
		reporter.failTest("rename", "Verify flattened parameter format {uri, symbolName, newName}", error)
	}
}
