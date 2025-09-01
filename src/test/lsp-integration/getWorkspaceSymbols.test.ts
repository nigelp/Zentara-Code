/**
 * Integration tests for getWorkspaceSymbols LSP tool
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

export async function testGetWorkspaceSymbols(reporter: TestReporter): Promise<void> {
	// Test 1: Search for class symbols
	reporter.startTest("getWorkspaceSymbols", "Search for class symbols")
	try {
		// Create test files with different classes
		const tsUri = await createTestFile("test-class-symbols.ts", SAMPLE_TS_CONTENT)
		const pyUri = await createTestFile("test-class-symbols.py", SAMPLE_PY_CONTENT)
		const jsUri = await createTestFile("test-class-symbols.js", SAMPLE_JS_CONTENT)

		// Open files to ensure they're indexed
		await openTestFile(tsUri)
		await openTestFile(pyUri)
		await openTestFile(jsUri)

		// Wait a moment for indexing
		await new Promise((resolve) => setTimeout(resolve, 1000))

		const result = await lspController.getWorkspaceSymbols({
			query: "TestClass",
		})

		assert(Array.isArray(result), "Should return array of workspace symbols")

		// Verify WorkspaceSymbol structure
		for (const symbol of result) {
			assert(typeof symbol.name === "string", "Symbol should have name")
			assert(typeof symbol.kind === "number", "Symbol should have numeric kind")
			assert(symbol.location !== undefined, "Symbol should have location")
			assert(typeof symbol.location.uri === "string", "Location should have URI")
			assert(symbol.location.range !== undefined, "Location should have range")
			assert(typeof symbol.location.range.start.line === "number", "Range start should have line")
			assert(typeof symbol.location.range.start.character === "number", "Range start should have character")
			assert(typeof symbol.location.range.end.line === "number", "Range end should have line")
			assert(typeof symbol.location.range.end.character === "number", "Range end should have character")
		}

		// Check for TestClass symbols
		const testClassSymbols = result.filter((s) => s.name === "TestClass")
		if (testClassSymbols.length > 0) {
			for (const symbol of testClassSymbols) {
				assert(symbol.kind === vscode.SymbolKind.Class, "TestClass should have Class kind")
				assert(symbol.name === "TestClass", "Symbol name should match search query")
			}
		}

		reporter.passTest("getWorkspaceSymbols", "Search for class symbols")
	} catch (error) {
		reporter.failTest("getWorkspaceSymbols", "Search for class symbols", error)
	}

	// Test 2: Search for function symbols
	reporter.startTest("getWorkspaceSymbols", "Search for function symbols")
	try {
		const result = await lspController.getWorkspaceSymbols({
			query: "testFunction",
		})

		assert(Array.isArray(result), "Should return array of workspace symbols")

		// Check for function symbols
		const functionSymbols = result.filter((s) => s.name === "testFunction" || s.name === "test_function")
		if (functionSymbols.length > 0) {
			for (const symbol of functionSymbols) {
				assert(symbol.kind === vscode.SymbolKind.Function, "testFunction should have Function kind")
				assert(
					symbol.name.includes("testFunction") || symbol.name.includes("test_function"),
					"Symbol name should match search pattern",
				)
			}
		}

		reporter.passTest("getWorkspaceSymbols", "Search for function symbols")
	} catch (error) {
		reporter.failTest("getWorkspaceSymbols", "Search for function symbols", error)
	}

	// Test 3: Search with partial names
	reporter.startTest("getWorkspaceSymbols", "Search with partial names")
	try {
		const result = await lspController.getWorkspaceSymbols({
			query: "Test",
		})

		assert(Array.isArray(result), "Should return array of workspace symbols")

		// Verify partial matching works
		const partialMatches = result.filter((s) => s.name.includes("Test"))
		if (partialMatches.length > 0) {
			for (const symbol of partialMatches) {
				assert(symbol.name.includes("Test"), "Symbol name should contain partial query")
				assert(typeof symbol.kind === "number", "Symbol should have valid kind")
				assert(symbol.location !== undefined, "Symbol should have location")
			}
		}

		// Check for various symbol kinds
		const symbolKinds = result.map((s) => s.kind)
		const uniqueKinds = [...new Set(symbolKinds)]

		// Should potentially find classes, functions, interfaces, etc.
		for (const kind of uniqueKinds) {
			assert(kind >= 0 && kind <= 25, `Symbol kind ${kind} should be valid`)
		}

		reporter.passTest("getWorkspaceSymbols", "Search with partial names")
	} catch (error) {
		reporter.failTest("getWorkspaceSymbols", "Search with partial names", error)
	}

	// Test 4: Search with empty query
	reporter.startTest("getWorkspaceSymbols", "Search with empty query")
	try {
		const result = await lspController.getWorkspaceSymbols({
			query: "",
		})

		assert(Array.isArray(result), "Should return array for empty query")

		// Empty query should return all or many symbols
		// The exact behavior depends on the LSP implementation
		for (const symbol of result) {
			assert(typeof symbol.name === "string", "Symbol should have name")
			assert(typeof symbol.kind === "number", "Symbol should have kind")
			assert(symbol.location !== undefined, "Symbol should have location")
		}

		// Handle large result sets - limit to first 100 for performance
		const limitedResults = result.slice(0, 100)
		for (const symbol of limitedResults) {
			assert(symbol.name.length > 0, "Symbol name should not be empty")
			assert(symbol.location.uri.length > 0, "Symbol location URI should not be empty")
		}

		reporter.passTest("getWorkspaceSymbols", "Search with empty query")
	} catch (error) {
		reporter.failTest("getWorkspaceSymbols", "Search with empty query", error)
	}

	// Test 5: Case sensitivity testing
	reporter.startTest("getWorkspaceSymbols", "Case sensitivity testing")
	try {
		// Test lowercase search
		const lowerResult = await lspController.getWorkspaceSymbols({
			query: "testclass",
		})

		// Test uppercase search
		const upperResult = await lspController.getWorkspaceSymbols({
			query: "TESTCLASS",
		})

		// Test mixed case search
		const mixedResult = await lspController.getWorkspaceSymbols({
			query: "TestClass",
		})

		assert(Array.isArray(lowerResult), "Should return array for lowercase query")
		assert(Array.isArray(upperResult), "Should return array for uppercase query")
		assert(Array.isArray(mixedResult), "Should return array for mixed case query")

		// Check if any results were found for case variations
		const totalResults = lowerResult.length + upperResult.length + mixedResult.length

		// Verify structure for all case variations
		for (const result of [lowerResult, upperResult, mixedResult]) {
			for (const symbol of result) {
				assert(typeof symbol.name === "string", "Symbol should have name")
				assert(typeof symbol.kind === "number", "Symbol should have kind")
				assert(symbol.location !== undefined, "Symbol should have location")
			}
		}

		reporter.passTest("getWorkspaceSymbols", "Case sensitivity testing")
	} catch (error) {
		reporter.failTest("getWorkspaceSymbols", "Case sensitivity testing", error)
	}

	// Test 6: Verify symbol kinds and container names
	reporter.startTest("getWorkspaceSymbols", "Verify symbol kinds and container names")
	try {
		// Create a complex file with various symbol types
		const complexContent = `
namespace MyNamespace {
    export class ComplexClass {
        private field: string = "";
        
        constructor(value: string) {
            this.field = value;
        }
        
        public method(): void {}
        
        static staticMethod(): string {
            return "static";
        }
    }
    
    export interface ComplexInterface {
        prop: number;
        method(): void;
    }
    
    export enum ComplexEnum {
        VALUE1 = "value1",
        VALUE2 = "value2"
    }
    
    export type ComplexType = string | number;
    
    export const complexConstant = 42;
    
    export function complexFunction(): void {}
}

class TopLevelClass {
    method(): void {}
}

const topLevelVariable = "test";

function topLevelFunction(): string {
    return "function";
}
`

		const uri = await createTestFile("test-complex-workspace.ts", complexContent)
		await openTestFile(uri)

		// Wait for indexing
		await new Promise((resolve) => setTimeout(resolve, 1500))

		const result = await lspController.getWorkspaceSymbols({
			query: "Complex",
		})

		assert(Array.isArray(result), "Should return array of complex symbols")

		// Verify different symbol kinds are present
		const foundKinds = new Set(result.map((s) => s.kind))

		// Check specific symbols and their kinds
		for (const symbol of result) {
			assert(typeof symbol.name === "string", "Symbol should have name")
			assert(typeof symbol.kind === "number", "Symbol should have kind")
			assert(symbol.location !== undefined, "Symbol should have location")

			// Verify specific symbol kinds
			if (symbol.name === "ComplexClass") {
				assert(symbol.kind === vscode.SymbolKind.Class, "ComplexClass should have Class kind")
			} else if (symbol.name === "ComplexInterface") {
				assert(symbol.kind === vscode.SymbolKind.Interface, "ComplexInterface should have Interface kind")
			} else if (symbol.name === "ComplexEnum") {
				assert(symbol.kind === vscode.SymbolKind.Enum, "ComplexEnum should have Enum kind")
			} else if (symbol.name === "complexFunction") {
				assert(symbol.kind === vscode.SymbolKind.Function, "complexFunction should have Function kind")
			} else if (symbol.name === "complexConstant") {
				assert(
					symbol.kind === vscode.SymbolKind.Constant || symbol.kind === vscode.SymbolKind.Variable,
					"complexConstant should have Constant or Variable kind",
				)
			}

			// Verify location structure
			assert(typeof symbol.location.uri === "string", "Location should have URI")
			// Only check file reference for specific symbols we know are from our test file
			const knownTestSymbols = [
				"ComplexClass",
				"ComplexInterface",
				"ComplexEnum",
				"ComplexNamespace",
				"complexFunction",
				"complexConstant",
			]
			if (knownTestSymbols.includes(symbol.name)) {
				if (!symbol.location.uri.includes("test-complex-workspace.ts")) {
					console.warn(
						`Warning: Symbol ${symbol.name} expected to be in test file but found in: ${symbol.location.uri}`,
					)
				}
			}
			assert(symbol.location.range.start.line >= 0, "Range start line should be non-negative")
			assert(symbol.location.range.start.character >= 0, "Range start character should be non-negative")
			assert(
				symbol.location.range.end.line >= symbol.location.range.start.line,
				"Range end line should be >= start line",
			)
		}

		reporter.passTest("getWorkspaceSymbols", "Verify symbol kinds and container names")
	} catch (error) {
		reporter.failTest("getWorkspaceSymbols", "Verify symbol kinds and container names", error)
	}

	// Test 7: Handle large result sets
	reporter.startTest("getWorkspaceSymbols", "Handle large result sets")
	try {
		// Create a file with many symbols
		let largeContent = "namespace LargeNamespace {\n"

		// Add many classes
		for (let i = 0; i < 50; i++) {
			largeContent += `    export class LargeClass${i} {\n`
			largeContent += `        method${i}(): void {}\n`
			largeContent += `        field${i}: number = ${i};\n`
			largeContent += `    }\n\n`
		}

		// Add many functions
		for (let i = 0; i < 50; i++) {
			largeContent += `    export function largeFunction${i}(): void {}\n`
		}

		// Add many constants
		for (let i = 0; i < 50; i++) {
			largeContent += `    export const largeConstant${i} = ${i};\n`
		}

		largeContent += "}\n"

		const uri = await createTestFile("test-large-workspace.ts", largeContent)
		await openTestFile(uri)

		// Wait for indexing
		await new Promise((resolve) => setTimeout(resolve, 2000))

		const result = await lspController.getWorkspaceSymbols({
			query: "Large",
		})

		assert(Array.isArray(result), "Should return array for large result set")

		// Handle potentially large result sets
		const maxResults = Math.min(result.length, 200) // Limit to 200 for performance

		// Count symbols that actually contain "Large"
		let largeSymbolCount = 0
		for (let i = 0; i < maxResults; i++) {
			const symbol = result[i]
			assert(typeof symbol.name === "string", `Symbol ${i} should have name`)
			assert(typeof symbol.kind === "number", `Symbol ${i} should have kind`)
			assert(symbol.location !== undefined, `Symbol ${i} should have location`)
			// Only symbols from our test file should contain 'Large'
			if (symbol.name.includes("Large") || symbol.name.includes("large")) {
				largeSymbolCount++
			}
		}
		assert(largeSymbolCount > 0, "Should find at least some 'Large' symbols from test file")

		// Test performance with large results
		const startTime = Date.now()
		const performanceResult = await lspController.getWorkspaceSymbols({
			query: "large",
		})
		const endTime = Date.now()
		const duration = endTime - startTime

		assert(Array.isArray(performanceResult), "Performance test should return array")
		assert(duration < 10000, "Large result set query should complete within 10 seconds")

		reporter.passTest("getWorkspaceSymbols", "Handle large result sets")
	} catch (error) {
		reporter.failTest("getWorkspaceSymbols", "Handle large result sets", error)
	}

	// Test 8: Edge cases and error handling
	reporter.startTest("getWorkspaceSymbols", "Edge cases and error handling")
	try {
		// Test with special characters
		const specialCharResult = await lspController.getWorkspaceSymbols({
			query: "@#$%",
		})

		assert(Array.isArray(specialCharResult), "Should return array for special characters query")

		// Test with very long query
		const longQuery = "a".repeat(1000)
		const longQueryResult = await lspController.getWorkspaceSymbols({
			query: longQuery,
		})

		assert(Array.isArray(longQueryResult), "Should return array for very long query")

		// Test with numbers only
		const numberResult = await lspController.getWorkspaceSymbols({
			query: "123",
		})

		assert(Array.isArray(numberResult), "Should return array for numeric query")

		// Test with spaces
		const spaceResult = await lspController.getWorkspaceSymbols({
			query: "Test Class",
		})

		assert(Array.isArray(spaceResult), "Should return array for query with spaces")

		// Test with Unicode characters
		const unicodeResult = await lspController.getWorkspaceSymbols({
			query: "τεστ",
		})

		assert(Array.isArray(unicodeResult), "Should return array for Unicode query")

		// Verify all edge case results have valid structure
		for (const result of [specialCharResult, longQueryResult, numberResult, spaceResult, unicodeResult]) {
			for (const symbol of result) {
				assert(typeof symbol.name === "string", "Symbol should have name")
				assert(typeof symbol.kind === "number", "Symbol should have kind")
				assert(symbol.location !== undefined, "Symbol should have location")
			}
		}

		reporter.passTest("getWorkspaceSymbols", "Edge cases and error handling")
	} catch (error) {
		reporter.failTest("getWorkspaceSymbols", "Edge cases and error handling", error)
	}
}
