/**
 * Integration tests for getDocumentSymbols LSP tool
 */

import * as vscode from "vscode"
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
import { DocumentSymbol } from "../../zentara_lsp/src/types"

// Type definitions for return types (now only table format)
type GetDocumentSymbolsResult =
	| { success: false; error: string }
	| { success: true; symbols: string }

// Helper function to check if result is table format
function isTableFormat(result: GetDocumentSymbolsResult): result is { success: true; symbols: string } {
	return result && typeof result === 'object' && 'success' in result && result.success === true && 'symbols' in result && typeof result.symbols === 'string'
}

export async function testGetDocumentSymbols(reporter: TestReporter): Promise<void> {
	// Test 1: Get all symbols from TypeScript file (default table format)
	reporter.startTest("getDocumentSymbols", "Get all symbols from TypeScript file (table format)")
	try {
		const uri = await createTestFile("test-symbols.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		const result = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
		})

		// With default parameters, should return table format
		assert(isTableFormat(result), "Should return table format by default")
		if (isTableFormat(result)) {
			assert(typeof result.symbols === "string", "Table format should contain string")
			assert(result.symbols.length > 0, "Table should not be empty")
			// Basic table format validation
			assert(result.symbols.includes("NAME"), "Table should have Name column")
			assert(result.symbols.includes("KIND"), "Table should have Kind column")
		}

		reporter.passTest("getDocumentSymbols", "Get all symbols from TypeScript file (table format)")
	} catch (error) {
		reporter.failTest("getDocumentSymbols", "Get all symbols from TypeScript file (table format)", error)
	}

	// Test 2: Get symbols with return_children enabled
	reporter.startTest("getDocumentSymbols", "Get all symbols from TypeScript file with children")
	try {
		const uri = await createTestFile("test-symbols-children.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		const result = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
			return_children: "yes",
		})

		assert(isTableFormat(result), "Should return table format")
		if (isTableFormat(result)) {
			assert(typeof result.symbols === "string", "Table format should contain string")
			assert(result.symbols.length > 0, "Table should not be empty")
			// Should contain hierarchical information via PARENT column when children enabled
			assert(result.symbols.includes("PARENT"), "Table should have PARENT column for hierarchy")
			// Should have some parent relationships when children are enabled
			const lines = result.symbols.split('\n')
			const hasParentRelationships = lines.some(line => {
				const parts = line.split(' | ')
				return parts.length >= 5 && parts[4].trim() !== "" && parts[4].trim() !== "PARENT"
			})
			assert(hasParentRelationships, "Table should show parent-child relationships when return_children is 'yes'")
		}

		reporter.passTest("getDocumentSymbols", "Get all symbols from TypeScript file with children")
	} catch (error) {
		reporter.failTest("getDocumentSymbols", "Get all symbols from TypeScript file with children", error)
	}

	// Test 3: Get symbols from Python file
	reporter.startTest("getDocumentSymbols", "Get all symbols from Python file")
	try {
		const uri = await createTestFile("test-symbols.py", SAMPLE_PY_CONTENT)
		const editor = await openTestFile(uri)

		const result = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
		})

		assert(isTableFormat(result), "Should return table format")
		if (isTableFormat(result)) {
			assert(typeof result.symbols === "string", "Table format should contain string")
			assert(result.symbols.length > 0, "Table should not be empty")
			// Basic table format validation
			assert(result.symbols.includes("NAME"), "Table should have Name column")
		}

		reporter.passTest("getDocumentSymbols", "Get all symbols from Python file")
	} catch (error) {
		reporter.failTest("getDocumentSymbols", "Get all symbols from Python file", error)
	}

	// Test 4: Get symbols from JavaScript file
	reporter.startTest("getDocumentSymbols", "Get all symbols from JavaScript file")
	try {
		const uri = await createTestFile("test-symbols.js", SAMPLE_JS_CONTENT)
		const editor = await openTestFile(uri)

		const result = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
		})

		assert(isTableFormat(result), "Should return table format")
		if (isTableFormat(result)) {
			assert(typeof result.symbols === "string", "Table format should contain string")
			assert(result.symbols.length > 0, "Table should not be empty")
			// Basic table format validation
			assert(result.symbols.includes("NAME"), "Table should have Name column")
		}

		reporter.passTest("getDocumentSymbols", "Get all symbols from JavaScript file")
	} catch (error) {
		reporter.failTest("getDocumentSymbols", "Get all symbols from JavaScript file", error)
	}

	// Test 5: Test with children enabled
	reporter.startTest("getDocumentSymbols", "Get symbols with children enabled")
	try {
		const complexContent = `
class TestClass {
    private field: string = "test";
    
    constructor(value: string) {
        this.field = value;
    }
    
    public method(): void {
        console.log(this.field);
    }
    
    private privateMethod(): string {
        return this.field;
    }
}

interface TestInterface {
    prop: string;
    method(): void;
}

namespace TestNamespace {
    export class InnerClass {
        innerMethod(): void {}
    }
    
    export function innerFunction(): void {}
}
`

		const uri = await createTestFile("test-complex.ts", complexContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
			return_children: "yes",
		})

		assert(isTableFormat(result), "Should return table format")
		if (isTableFormat(result)) {
			assert(typeof result.symbols === "string", "Table format should contain string")
			assert(result.symbols.length > 0, "Table should not be empty")
			// Should contain hierarchical information via PARENT column
			assert(result.symbols.includes("PARENT"), "Table should have PARENT column for hierarchy")
			// Should have some parent relationships when children are enabled
			const lines = result.symbols.split('\n')
			const hasParentRelationships = lines.some(line => {
				const parts = line.split(' | ')
				return parts.length >= 5 && parts[4].trim() !== "" && parts[4].trim() !== "PARENT"
			})
			assert(hasParentRelationships, "Table should show parent-child relationships when return_children is 'yes'")
		}

		reporter.passTest("getDocumentSymbols", "Get symbols with children enabled")
	} catch (error) {
		reporter.failTest("getDocumentSymbols", "Get symbols with children enabled", error)
	}

	// Test 6: Test table format with children
	reporter.startTest("getDocumentSymbols", "Get symbols in table format with children")
	try {
		const complexContent = `
class TestClass {
    private field: string = "test";
    
    public method(): void {
        console.log(this.field);
    }
}

interface TestInterface {
    prop: string;
    method(): void;
}
`

		const uri = await createTestFile("test-table-children.ts", complexContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
			return_children: "yes",
		})

		assert(isTableFormat(result), "Should return table format")
		if (isTableFormat(result)) {
			assert(typeof result.symbols === "string", "Table format should contain string")
			assert(result.symbols.length > 0, "Table should not be empty")
			// Should contain hierarchical information via PARENT column
			assert(result.symbols.includes("PARENT"), "Table should have PARENT column for hierarchy")
			// Should have some parent relationships when children are enabled
			const lines = result.symbols.split('\n')
			const hasParentRelationships = lines.some(line => {
				const parts = line.split(' | ')
				return parts.length >= 5 && parts[4].trim() !== "" && parts[4].trim() !== "PARENT"
			})
			assert(hasParentRelationships, "Table should show parent-child relationships when return_children is 'yes'")
		}

		reporter.passTest("getDocumentSymbols", "Get symbols in table format with children")
	} catch (error) {
		reporter.failTest("getDocumentSymbols", "Get symbols in table format with children", error)
	}

	// Test 7: Test without children (return_children: "no")
	reporter.startTest("getDocumentSymbols", "Get symbols without children")
	try {
		const uri = await createTestFile("test-no-children.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		const result = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
			return_children: "no",
		})

		assert(isTableFormat(result), "Should return table format")
		if (isTableFormat(result)) {
			assert(typeof result.symbols === "string", "Table format should contain string")
			assert(result.symbols.length > 0, "Table should not be empty")
			// Should NOT have parent relationships when children are disabled
			const lines = result.symbols.split('\n')
			const hasParentRelationships = lines.some(line => {
				const parts = line.split(' | ')
				return parts.length >= 5 && parts[4].trim() !== "" && parts[4].trim() !== "PARENT"
			})
			// When return_children is "no", there should be no parent relationships
			assert(!hasParentRelationships, "Table should NOT show parent-child relationships when return_children is 'no'")
		}

		reporter.passTest("getDocumentSymbols", "Get symbols without children")
	} catch (error) {
		reporter.failTest("getDocumentSymbols", "Get symbols without children", error)
	}

	// Test 8: Handle edge cases properly
	reporter.startTest("getDocumentSymbols", "Handle edge cases properly")
	try {
		// Test with malformed/incomplete code
		const edgeCaseContent = `
// Incomplete class declaration
class IncompleteClass {
    method1(): void;
    // Missing implementation
    
// Incomplete function
function incompleteFunc(

// Variables and constants
const validConst = 42;
let validVar: string;

// Type alias
type StringOrNumber = string | number;

// Export statement
export { validConst };
`

		const uri = await createTestFile("test-edge-cases.ts", edgeCaseContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
		})

		assert(isTableFormat(result), "Should return table format")
		if (isTableFormat(result)) {
			assert(typeof result.symbols === "string", "Table format should contain string")
			// For malformed code, we might get an empty table or minimal symbols
			// Just verify it's a valid table format
			assert(result.symbols.includes("NAME") || result.symbols.length === 0, "Should be valid table format or empty")
		}

		// Test with very large file content (stress test)
		let largeContent = "class LargeClass {\n"
		for (let i = 0; i < 100; i++) {
			largeContent += `    method${i}(): void { return; }\n`
			largeContent += `    field${i}: number = ${i};\n`
		}
		largeContent += "}\n"

		const largeUri = await createTestFile("test-large-file.ts", largeContent)
		const largeEditor = await openTestFile(largeUri)

		const largeResult = await lspController.getDocumentSymbols({
			textDocument: { uri: largeUri.toString() },
		})

		assert(isTableFormat(largeResult), "Should return table format for large files")
		if (isTableFormat(largeResult)) {
			assert(typeof largeResult.symbols === "string", "Table format should contain string")
			assert(largeResult.symbols.length > 0, "Large file table should not be empty")
			// Should contain the class and some methods
			assert(largeResult.symbols.includes("LargeClass"), "Should find LargeClass in large file")
		}

		// Test with non-existent file URI
		try {
			const nonExistentResult = await lspController.getDocumentSymbols({
				textDocument: { uri: "file:///non/existent/file.ts" },
			})
			// If it doesn't throw, result should be handled gracefully  
			if (isTableFormat(nonExistentResult)) {
				assert(typeof nonExistentResult.symbols === "string", "Should return table format for non-existent file")
			}
		} catch (error) {
			// It's acceptable for this to throw an error or return error result
			console.log("Non-existent file test threw error (expected):", error.message)
		}

		reporter.passTest("getDocumentSymbols", "Handle edge cases properly")
	} catch (error) {
		reporter.failTest("getDocumentSymbols", "Handle edge cases properly", error)
	}

	// Test 9: Test hover information inclusion
	reporter.startTest("getDocumentSymbols", "Test hover information inclusion")
	try {
		const contentWithDocs = `
/**
 * A test class with documentation
 * @example
 * const instance = new TestClass("hello");
 */
class TestClass {
    /**
     * A private field
     */
    private field: string;

    /**
     * Constructor for TestClass
     * @param value - The initial value
     */
    constructor(value: string) {
        this.field = value;
    }

    /**
     * A public method that logs the field
     * @returns void
     */
    public method(): void {
        console.log(this.field);
    }
}
`

		const uri = await createTestFile("test-with-docs.ts", contentWithDocs)
		const editor = await openTestFile(uri)

		// Test table format with hover info (default)
		const tableResult = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
			include_hover: true,
		})

		assert(isTableFormat(tableResult), "Should return table format")
		if (isTableFormat(tableResult)) {
			assert(typeof tableResult.symbols === "string", "Table format should contain string")
			// Should contain documentation in the table
			assert(
				tableResult.symbols.includes("test class") ||
				tableResult.symbols.includes("documentation") ||
				tableResult.symbols.includes("Constructor"),
				"Table should include hover information/documentation"
			)
		}

		// Test table format without hover info
		const noHoverResult = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
			include_hover: false,
		})

		assert(isTableFormat(noHoverResult), "Should return table format")
		if (isTableFormat(noHoverResult)) {
			assert(typeof noHoverResult.symbols === "string", "Table format should contain string")
			// Should be shorter without hover info
			// Both should be table format, so we can safely access symbols
			if (isTableFormat(noHoverResult) && isTableFormat(tableResult)) {
				assert(noHoverResult.symbols.length < tableResult.symbols.length, "Table without hover should be shorter")
			}
		}

		reporter.passTest("getDocumentSymbols", "Test hover information inclusion")
	} catch (error) {
		reporter.failTest("getDocumentSymbols", "Test hover information inclusion", error)
	}
}
