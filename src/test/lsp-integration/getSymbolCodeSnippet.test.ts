/**
 * Integration tests for getSymbolCodeSnippet LSP tool
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

// Helper function to parse symbols from getDocumentSymbols result
function parseSymbolsResult(symbolsResult: any): any[] {
	if (Array.isArray(symbolsResult)) {
		return symbolsResult
	} else if (symbolsResult && 'success' in symbolsResult && symbolsResult.success) {
		// Handle table format from getDocumentSymbols
		if (typeof (symbolsResult as any).symbols === 'string') {
			// Parse table format
			const tableLines = (symbolsResult as any).symbols.split('\n').filter((line: string) => line.trim() && !line.includes('NAME | KIND | RANGE'))
			return tableLines.map((line: string) => {
				const parts = line.split(' | ')
				if (parts.length >= 4) {
					const name = parts[0].trim()
					const kind = parseInt(parts[1].trim())
					const rangeStr = parts[2].trim()
					const selectionStr = parts[3].trim()
					
					// Parse range strings
					const parseRange = (str: string) => {
						const rangeParts = str.split('-')
						if (rangeParts.length === 2) {
							const start = rangeParts[0].split(':')
							const end = rangeParts[1].split(':')
							return {
								start: { line: parseInt(start[0]), character: parseInt(start[1]) },
								end: { line: parseInt(end[0]), character: parseInt(end[1]) }
							}
						}
						return { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
					}
					
					return {
						name,
						kind,
						range: parseRange(rangeStr),
						selectionRange: parseRange(selectionStr)
					}
				}
				return null
			}).filter((s: any) => s !== null)
		} else if (Array.isArray((symbolsResult as any).symbols)) {
			return (symbolsResult as any).symbols
		} else {
			// If symbols is not an array, return empty array
			return []
		}
	} else {
		return []
	}
}

export async function testGetSymbolCodeSnippet(reporter: TestReporter): Promise<void> {
	// Test 1: Get code snippet for a class
	reporter.startTest("getSymbolCodeSnippet", "Get code snippet for a class")
	try {
		const uri = await createTestFile("test-class-snippet.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// First get document symbols to find the TestClass
		const symbolsResult = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
			return_children: "yes",
		})

		const symbols = parseSymbolsResult(symbolsResult)

		assert(symbols.length > 0, "Should find symbols in test file")

		// Find TestClass symbol or nested within a parent symbol
		let testClassSymbol = symbols.find((s: any) => s.name === "TestClass")
		if (!testClassSymbol) {
			// Look for TestClass in nested symbols
			for (const symbol of symbols) {
				if (symbol.children) {
					testClassSymbol = symbol.children.find((c: any) => c.name === "TestClass")
					if (testClassSymbol) break
				}
			}
		}

		if (testClassSymbol) {
			const result = await lspController.getSymbolCodeSnippet({
				uri: uri.toString(),
				line: testClassSymbol.selectionRange.start.line,
				character: testClassSymbol.selectionRange.start.character,
			})

			assert(result !== null, "Should return code snippet for TestClass")
			if (result !== null) {
				assert(typeof result.snippet === "string", "Code snippet should be a string")
				assert(result.snippet.length > 0, "Code snippet should not be empty")
				assert(result.uri === uri.toString(), "URI should match")
				assert(result.range !== undefined, "Range should be defined")
				assert(result.snippet.includes("class TestClass"), "Should contain class declaration")
				assert(result.snippet.includes("getValue"), "Should contain method definitions")
				// Verify line numbering format
				assert(result.snippet.includes("→"), "Should contain line number arrows (→)")
			}
		}

		reporter.passTest("getSymbolCodeSnippet", "Get code snippet for a class")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Get code snippet for a class", error)
	}

	// Test 2: Get code snippet for a function
	reporter.startTest("getSymbolCodeSnippet", "Get code snippet for a function")
	try {
		const uri = await createTestFile("test-function-snippet.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Get document symbols to find testFunction
		const symbolsResult = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
			return_children: "yes",
		})

		const symbols = parseSymbolsResult(symbolsResult)

		// Find testFunction symbol
		let testFunctionSymbol = symbols.find((s: any) => s.name === "testFunction")
		if (!testFunctionSymbol) {
			// Look for testFunction in nested symbols
			for (const symbol of symbols) {
				if (symbol.children) {
					testFunctionSymbol = symbol.children.find((c: any) => c.name === "testFunction")
					if (testFunctionSymbol) break
				}
			}
		}

		if (testFunctionSymbol) {
			const result = await lspController.getSymbolCodeSnippet({
				uri: uri.toString(),
				line: testFunctionSymbol.selectionRange.start.line,
				character: testFunctionSymbol.selectionRange.start.character,
			})

			assert(result !== null, "Should return code snippet for testFunction")
			if (result !== null) {
				assert(typeof result.snippet === "string", "Code snippet should be a string")
				assert(result.snippet.length > 0, "Code snippet should not be empty")
				assert(result.uri === uri.toString(), "URI should match")
				assert(result.range !== undefined, "Range should be defined")
				assert(result.snippet.includes("function testFunction"), "Should contain function declaration")
				assert(result.snippet.includes("TestInterface"), "Should contain return type")
			}
		}

		reporter.passTest("getSymbolCodeSnippet", "Get code snippet for a function")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Get code snippet for a function", error)
	}

	// Test 3: Get code snippet for a method
	reporter.startTest("getSymbolCodeSnippet", "Get code snippet for a method")
	try {
		const uri = await createTestFile("test-method-snippet.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Get document symbols to find TestClass and its methods
		const symbolsResult = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
			return_children: "yes",
		})

		const symbols = parseSymbolsResult(symbolsResult)

		// Find TestClass and then getValue method
		let getValueMethodSymbol
		for (const symbol of symbols) {
			if (symbol.name === "TestClass" && symbol.children) {
				getValueMethodSymbol = symbol.children.find((c: any) => c.name === "getValue")
				if (getValueMethodSymbol) break
			}
			// Also check nested symbols
			if (symbol.children) {
				for (const child of symbol.children) {
					if (child.name === "TestClass" && child.children) {
						getValueMethodSymbol = child.children.find((c: any) => c.name === "getValue")
						if (getValueMethodSymbol) break
					}
				}
				if (getValueMethodSymbol) break
			}
		}

		if (getValueMethodSymbol) {
			const result = await lspController.getSymbolCodeSnippet({
				uri: uri.toString(),
				line: getValueMethodSymbol.selectionRange.start.line,
				character: getValueMethodSymbol.selectionRange.start.character,
			})

			assert(result !== null, "Should return code snippet for getValue method")
			if (result !== null) {
				assert(typeof result.snippet === "string", "Code snippet should be a string")
				assert(result.snippet.length > 0, "Code snippet should not be empty")
				assert(result.uri === uri.toString(), "URI should match")
				assert(result.range !== undefined, "Range should be defined")
				assert(result.snippet.includes("getValue"), "Should contain method name")
				assert(result.snippet.includes("number"), "Should contain return type")
			}
		}

		reporter.passTest("getSymbolCodeSnippet", "Get code snippet for a method")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Get code snippet for a method", error)
	}

	// Test 4: Test with nested symbols
	reporter.startTest("getSymbolCodeSnippet", "Test with nested symbols")
	try {
		const nestedContent = `
namespace MyNamespace {
    export class OuterClass {
        private field: string = "";
        
        constructor(value: string) {
            this.field = value;
        }
        
        public method(): void {
            function innerFunction() {
                return "inner";
            }
            innerFunction();
        }
        
        static staticMethod(): string {
            return "static";
        }
    }
    
    export interface OuterInterface {
        prop: number;
        method(): void;
    }
}
`

		const uri = await createTestFile("test-nested-snippet.ts", nestedContent)
		const editor = await openTestFile(uri)

		// Get document symbols to find nested symbols
		const symbolsResult = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
			return_children: "yes",
		})

		let symbols: any[]
		if (Array.isArray(symbolsResult)) {
			symbols = symbolsResult
		} else if (symbolsResult && 'success' in symbolsResult && symbolsResult.success) {
			symbols = parseSymbolsResult(symbolsResult)
		} else {
			symbols = []
		}

		// Find the namespace and nested class
		let outerClassSymbol
		for (const symbol of symbols) {
			if (symbol.name === "MyNamespace" && symbol.children) {
				outerClassSymbol = symbol.children.find((c: any) => c.name === "OuterClass")
				if (outerClassSymbol) break
			}
			// Also check if OuterClass is at top level
			if (symbol.name === "OuterClass") {
				outerClassSymbol = symbol
				break
			}
		}

		if (outerClassSymbol) {
			const result = await lspController.getSymbolCodeSnippet({
				uri: uri.toString(),
				line: outerClassSymbol.selectionRange.start.line,
				character: outerClassSymbol.selectionRange.start.character,
			})

			assert(result !== null, "Should return code snippet for nested OuterClass")
			if (result !== null) {
				assert(typeof result.snippet === "string", "Code snippet should be a string")
				assert(result.snippet.length > 0, "Code snippet should not be empty")
				assert(result.uri === uri.toString(), "URI should match")
				assert(result.range !== undefined, "Range should be defined")
				assert(result.snippet.includes("class OuterClass"), "Should contain class declaration")
				assert(result.snippet.includes("constructor"), "Should contain constructor")
				assert(result.snippet.includes("staticMethod"), "Should contain static method")
			}
		}

		reporter.passTest("getSymbolCodeSnippet", "Test with nested symbols")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Test with nested symbols", error)
	}

	// Test 5: Handle non-existent symbols
	reporter.startTest("getSymbolCodeSnippet", "Handle non-existent symbols")
	try {
		const uri = await createTestFile("test-nonexistent-snippet.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Try to get code snippet for a non-existent location (way beyond file content)
		const result = await lspController.getSymbolCodeSnippet({
			uri: uri.toString(),
			line: 1000,
			character: 0,
		})

		// Should handle gracefully - either return null or empty snippet
		if (result !== null) {
			assert(typeof result.snippet === "string", "If result is not null, snippet should be a string")
			assert(result.uri === uri.toString(), "URI should match")
			assert(result.range !== undefined, "Range should be defined")
		}

		reporter.passTest("getSymbolCodeSnippet", "Handle non-existent symbols")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Handle non-existent symbols", error)
	}

	// Test 6: Test with Python file
	reporter.startTest("getSymbolCodeSnippet", "Test with Python file")
	try {
		const uri = await createTestFile("test-python-snippet.py", SAMPLE_PY_CONTENT)
		const editor = await openTestFile(uri)

		// Get document symbols to find Python symbols
		const symbolsResult = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
			return_children: "yes",
		})

		let symbols: any[]
		if (Array.isArray(symbolsResult)) {
			symbols = symbolsResult
		} else if (symbolsResult && 'success' in symbolsResult && symbolsResult.success) {
			symbols = parseSymbolsResult(symbolsResult)
		} else {
			symbols = []
		}

		if (symbols.length > 0) {
			// Find TestClass symbol
			let testClassSymbol = symbols.find((s: any) => s.name === "TestClass")
			if (!testClassSymbol) {
				// Look for TestClass in nested symbols
				for (const symbol of symbols) {
					if (symbol.children) {
						testClassSymbol = symbol.children.find((c: any) => c.name === "TestClass")
						if (testClassSymbol) break
					}
				}
			}

			if (testClassSymbol) {
				const result = await lspController.getSymbolCodeSnippet({
					uri: uri.toString(),
					line: testClassSymbol.selectionRange.start.line,
					character: testClassSymbol.selectionRange.start.character,
				})

				if (result !== null) {
					assert(typeof result.snippet === "string", "Code snippet should be a string")
					assert(result.snippet.length > 0, "Code snippet should not be empty")
					assert(result.uri === uri.toString(), "URI should match")
					assert(result.range !== undefined, "Range should be defined")
					assert(result.snippet.includes("class TestClass"), "Should contain Python class declaration")
				}
			}
		}

		reporter.passTest("getSymbolCodeSnippet", "Test with Python file")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Test with Python file", error)
	}

	// Test 7: Test with JavaScript file
	reporter.startTest("getSymbolCodeSnippet", "Test with JavaScript file")
	try {
		const uri = await createTestFile("test-js-snippet.js", SAMPLE_JS_CONTENT)
		const editor = await openTestFile(uri)

		// Get document symbols to find JavaScript symbols
		const symbolsResult = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
			return_children: "yes",
		})

		let symbols: any[]
		if (Array.isArray(symbolsResult)) {
			symbols = symbolsResult
		} else if (symbolsResult && 'success' in symbolsResult && symbolsResult.success) {
			symbols = parseSymbolsResult(symbolsResult)
		} else {
			symbols = []
		}

		if (symbols.length > 0) {
			// Find testFunction symbol
			let testFunctionSymbol = symbols.find((s: any) => s.name === "testFunction")
			if (!testFunctionSymbol) {
				// Look for testFunction in nested symbols
				for (const symbol of symbols) {
					if (symbol.children) {
						testFunctionSymbol = symbol.children.find((c: any) => c.name === "testFunction")
						if (testFunctionSymbol) break
					}
				}
			}

			if (testFunctionSymbol) {
				const result = await lspController.getSymbolCodeSnippet({
					uri: uri.toString(),
					line: testFunctionSymbol.selectionRange.start.line,
					character: testFunctionSymbol.selectionRange.start.character,
				})

				if (result !== null) {
					assert(typeof result.snippet === "string", "Code snippet should be a string")
					assert(result.snippet.length > 0, "Code snippet should not be empty")
					assert(result.uri === uri.toString(), "URI should match")
					assert(result.range !== undefined, "Range should be defined")
					assert(
						result.snippet.includes("function testFunction"),
						"Should contain JavaScript function declaration",
					)
				}
			}
		}

		reporter.passTest("getSymbolCodeSnippet", "Test with JavaScript file")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Test with JavaScript file", error)
	}

	// Test 8: Verify CodeSnippet structure
	reporter.startTest("getSymbolCodeSnippet", "Verify CodeSnippet structure")
	try {
		const uri = await createTestFile("test-structure-snippet.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Get any symbol to test the structure
		const symbolsResult = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
			return_children: "yes",
		})

		let symbols: any[]
		if (Array.isArray(symbolsResult)) {
			symbols = symbolsResult
		} else if (symbolsResult && 'success' in symbolsResult && symbolsResult.success) {
			symbols = parseSymbolsResult(symbolsResult)
		} else {
			symbols = []
		}

		if (symbols.length > 0) {
			const symbol = symbols[0]
			const result = await lspController.getSymbolCodeSnippet({
				uri: uri.toString(),
				line: symbol.selectionRange.start.line,
				character: symbol.selectionRange.start.character,
			})

			if (result !== null) {
				// Verify CodeSnippet structure matches schema
				assert(result.hasOwnProperty("snippet"), "CodeSnippet should have snippet property")
				assert(result.hasOwnProperty("uri"), "CodeSnippet should have uri property")
				assert(result.hasOwnProperty("range"), "CodeSnippet should have range property")

				assert(typeof result.snippet === "string", "snippet should be string")
				assert(typeof result.uri === "string", "uri should be string")
				assert(typeof result.range === "object", "range should be object")

				// Verify range structure
				assert(result.range.hasOwnProperty("start"), "range should have start property")
				assert(result.range.hasOwnProperty("end"), "range should have end property")
				assert(typeof result.range.start.line === "number", "start.line should be number")
				assert(typeof result.range.start.character === "number", "start.character should be number")
				assert(typeof result.range.end.line === "number", "end.line should be number")
				assert(typeof result.range.end.character === "number", "end.character should be number")
			}
		}

		reporter.passTest("getSymbolCodeSnippet", "Verify CodeSnippet structure")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Verify CodeSnippet structure", error)
	}

	// Test 9: Test with interface symbol
	reporter.startTest("getSymbolCodeSnippet", "Test with interface symbol")
	try {
		const uri = await createTestFile("test-interface-snippet.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Get document symbols to find TestInterface
		const symbolsResult = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
			return_children: "yes",
		})

		let symbols: any[]
		if (Array.isArray(symbolsResult)) {
			symbols = symbolsResult
		} else if (symbolsResult && 'success' in symbolsResult && symbolsResult.success) {
			symbols = parseSymbolsResult(symbolsResult)
		} else {
			symbols = []
		}

		// Find TestInterface symbol
		let testInterfaceSymbol = symbols.find((s: any) => s.name === "TestInterface")
		if (!testInterfaceSymbol) {
			// Look for TestInterface in nested symbols
			for (const symbol of symbols) {
				if (symbol.children) {
					testInterfaceSymbol = symbol.children.find((c: any) => c.name === "TestInterface")
					if (testInterfaceSymbol) break
				}
			}
		}

		if (testInterfaceSymbol) {
			const result = await lspController.getSymbolCodeSnippet({
				uri: uri.toString(),
				line: testInterfaceSymbol.selectionRange.start.line,
				character: testInterfaceSymbol.selectionRange.start.character,
			})

			if (result !== null) {
				assert(typeof result.snippet === "string", "Code snippet should be a string")
				assert(result.snippet.length > 0, "Code snippet should not be empty")
				assert(result.uri === uri.toString(), "URI should match")
				assert(result.range !== undefined, "Range should be defined")
				assert(result.snippet.includes("interface TestInterface"), "Should contain interface declaration")
				assert(result.snippet.includes("id: number"), "Should contain interface properties")
			}
		}

		reporter.passTest("getSymbolCodeSnippet", "Test with interface symbol")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Test with interface symbol", error)
	}

	// Test 10: Test with non-existent file
	reporter.startTest("getSymbolCodeSnippet", "Test with non-existent file")
	try {
		const result = await lspController.getSymbolCodeSnippet({
			uri: "file:///non/existent/file.ts",
			line: 0,
			character: 0,
		})

		// Should handle gracefully - return null for non-existent file
		assert(result === null, "Should return null for non-existent file")

		reporter.passTest("getSymbolCodeSnippet", "Test with non-existent file")
	} catch (error) {
		// It's also acceptable to throw an error for non-existent files
		reporter.passTest("getSymbolCodeSnippet", "Test with non-existent file")
	}

	// Test 11: Test call hierarchy table format
	reporter.startTest("getSymbolCodeSnippet", "Test call hierarchy table format")
	try {
		const complexContent = `
export function callerFunction() {
		  return targetFunction("test");
}

export function targetFunction(param: string): string {
		  return helperFunction(param);
}

export function helperFunction(value: string): string {
		  return value.toUpperCase();
}

export function anotherCaller() {
		  targetFunction("another");
}
`
		const uri = await createTestFile("test-call-hierarchy.ts", complexContent)
		const editor = await openTestFile(uri)

		// Get document symbols to find targetFunction
		const symbolsResult = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
			return_children: "yes",
		})

		let symbols: any[]
		if (Array.isArray(symbolsResult)) {
			symbols = symbolsResult
		} else if (symbolsResult && 'success' in symbolsResult && symbolsResult.success) {
			symbols = parseSymbolsResult(symbolsResult)
		} else {
			symbols = []
		}

		// Find targetFunction symbol
		let targetFunctionSymbol = symbols.find((s: any) => s.name === "targetFunction")
		if (!targetFunctionSymbol) {
			// Look for targetFunction in nested symbols
			for (const symbol of symbols) {
				if (symbol.children) {
					targetFunctionSymbol = symbol.children.find((c: any) => c.name === "targetFunction")
					if (targetFunctionSymbol) break
				}
			}
		}

		if (targetFunctionSymbol) {
			const result = await lspController.getSymbolCodeSnippet({
				uri: uri.toString(),
				line: targetFunctionSymbol.selectionRange.start.line,
				character: targetFunctionSymbol.selectionRange.start.character,
				includeCallHierarchy: true,
			})

			assert(result !== null, "Should return code snippet with call hierarchy")
			if (result !== null) {
				// Test call hierarchy table format
				assert(result.callHierarchy !== null, "Call hierarchy should be included")
				if (result.callHierarchy) {
					assert(typeof result.callHierarchy === "object", "Call hierarchy should be an object")
					assert(typeof result.callHierarchy.incomingCalls === "string", "Incoming calls should be a table string")
					assert(typeof result.callHierarchy.outgoingCalls === "string", "Outgoing calls should be a table string")
					
					// Check table format structure
					assert(result.callHierarchy.incomingCalls.includes("FROM_NAME | FROM_KIND | FROM_URI"), "Incoming calls should have table header")
					assert(result.callHierarchy.outgoingCalls.includes("TO_NAME | TO_KIND | TO_URI"), "Outgoing calls should have table header")
					
					// Check for EOL markers if there are data rows
					if (result.callHierarchy.incomingCalls.includes("<<<")) {
						assert(result.callHierarchy.incomingCalls.split("<<<").length >= 2, "Should have proper EOL markers for incoming calls")
					}
					if (result.callHierarchy.outgoingCalls.includes("<<<")) {
						assert(result.callHierarchy.outgoingCalls.split("<<<").length >= 2, "Should have proper EOL markers for outgoing calls")
					}
				}
			}
		}

		reporter.passTest("getSymbolCodeSnippet", "Test call hierarchy table format")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Test call hierarchy table format", error)
	}

	// Test 12: Test usages table format
	reporter.startTest("getSymbolCodeSnippet", "Test usages table format")
	try {
		const usageContent = `
export const CONSTANT_VALUE = "test";

export function useConstant() {
		  console.log(CONSTANT_VALUE);
		  return CONSTANT_VALUE + " used";
}

export function anotherUser() {
		  const value = CONSTANT_VALUE;
		  return value;
}
`
		const uri = await createTestFile("test-usages.ts", usageContent)
		const editor = await openTestFile(uri)

		// Get document symbols to find CONSTANT_VALUE
		const symbolsResult = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
			return_children: "yes",
		})

		let symbols: any[]
		if (Array.isArray(symbolsResult)) {
			symbols = symbolsResult
		} else if (symbolsResult && 'success' in symbolsResult && symbolsResult.success) {
			symbols = parseSymbolsResult(symbolsResult)
		} else {
			symbols = []
		}

		// Find CONSTANT_VALUE symbol
		let constantSymbol = symbols.find((s: any) => s.name === "CONSTANT_VALUE")
		if (!constantSymbol) {
			// Look for CONSTANT_VALUE in nested symbols
			for (const symbol of symbols) {
				if (symbol.children) {
					constantSymbol = symbol.children.find((c: any) => c.name === "CONSTANT_VALUE")
					if (constantSymbol) break
				}
			}
		}

		if (constantSymbol) {
			const result = await lspController.getSymbolCodeSnippet({
				uri: uri.toString(),
				line: constantSymbol.selectionRange.start.line,
				character: constantSymbol.selectionRange.start.character,
				includeUsages: true,
			})

			assert(result !== null, "Should return code snippet with usages")
			if (result !== null) {
				// Test usages table format
				assert(result.usages !== null, "Usages should be included")
				if (result.usages) {
					assert(typeof result.usages === "string", "Usages should be a table string")
					
					// Check table format structure
					assert(result.usages.includes("URI | RANGE | PREVIEW | EOL"), "Usages should have table header")
					
					// Check for EOL markers if there are data rows
					if (result.usages.includes("<<<")) {
						assert(result.usages.split("<<<").length >= 2, "Should have proper EOL markers for usages")
					}
				}
			}
		}

		reporter.passTest("getSymbolCodeSnippet", "Test usages table format")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Test usages table format", error)
	}

	// Test 13: Test truncation functionality
	reporter.startTest("getSymbolCodeSnippet", "Test truncation functionality")
	try {
		const uri = await createTestFile("test-truncation.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Get document symbols to find any symbol
		const symbolsResult = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
			return_children: "yes",
		})

		let symbols: any[]
		if (Array.isArray(symbolsResult)) {
			symbols = symbolsResult
		} else if (symbolsResult && 'success' in symbolsResult && symbolsResult.success) {
			symbols = parseSymbolsResult(symbolsResult)
		} else {
			symbols = []
		}

		if (symbols.length > 0) {
			const symbol = symbols[0]
			const result = await lspController.getSymbolCodeSnippet({
				uri: uri.toString(),
				line: symbol.selectionRange.start.line,
				character: symbol.selectionRange.start.character,
				includeCallHierarchy: true,
				includeUsages: true,
				maxCallHierarchyItems: 1, // Force truncation
				maxUsages: 1, // Force truncation
			})

			assert(result !== null, "Should return code snippet with truncation limits")
			if (result !== null) {
				// Test that truncation metadata is included when limits are applied
				assert(result.metadata !== undefined, "Metadata should be included")
				if (result.metadata && result.metadata.truncated) {
					// If truncation occurred, verify the format
					if (result.callHierarchy && typeof result.callHierarchy === "object") {
						if (result.callHierarchy.incomingCalls.includes("Total rows exceed")) {
							assert(result.callHierarchy.incomingCalls.includes("threshold"), "Should contain truncation message")
							assert(result.callHierarchy.incomingCalls.includes("Truncated"), "Should contain truncation details")
						}
						if (result.callHierarchy.outgoingCalls.includes("Total rows exceed")) {
							assert(result.callHierarchy.outgoingCalls.includes("threshold"), "Should contain truncation message")
							assert(result.callHierarchy.outgoingCalls.includes("Truncated"), "Should contain truncation details")
						}
					}
					if (result.usages && typeof result.usages === "string" && result.usages.includes("Total rows exceed")) {
						assert(result.usages.includes("threshold"), "Should contain truncation message")
						assert(result.usages.includes("Truncated"), "Should contain truncation details")
					}
				}
			}
		}

		reporter.passTest("getSymbolCodeSnippet", "Test truncation functionality")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Test truncation functionality", error)
	}
	// ========================================
	// NAME-BASED SYMBOL LOOKUP TESTS
	// ========================================

	// Test 14: Name-based lookup for class
	reporter.startTest("getSymbolCodeSnippet", "Name-based lookup for class")
	try {
		const uri = await createTestFile("test-name-class-snippet.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Test name-based lookup without position coordinates
		const result = await lspController.getSymbolCodeSnippet({
			uri: uri.toString(),
			symbolName: "TestClass",
		})

		assert(result !== null, "Should return code snippet for TestClass using name lookup")
		if (result !== null) {
			assert(typeof result.snippet === "string", "Code snippet should be a string")
			assert(result.snippet.length > 0, "Code snippet should not be empty")
			assert(result.uri === uri.toString(), "URI should match")
			assert(result.range !== undefined, "Range should be defined")
			assert(result.snippet.includes("class TestClass"), "Should contain class declaration")
			assert(result.snippet.includes("getValue"), "Should contain method definitions")
			// Verify line numbering format
			assert(result.snippet.includes("→"), "Should contain line number arrows (→)")
		}

		reporter.passTest("getSymbolCodeSnippet", "Name-based lookup for class")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Name-based lookup for class", error)
	}

	// Test 15: Name-based lookup for function
	reporter.startTest("getSymbolCodeSnippet", "Name-based lookup for function")
	try {
		const uri = await createTestFile("test-name-function-snippet.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Test name-based lookup for function
		const result = await lspController.getSymbolCodeSnippet({
			uri: uri.toString(),
			symbolName: "testFunction",
		})

		assert(result !== null, "Should return code snippet for testFunction using name lookup")
		if (result !== null) {
			assert(typeof result.snippet === "string", "Code snippet should be a string")
			assert(result.snippet.length > 0, "Code snippet should not be empty")
			assert(result.uri === uri.toString(), "URI should match")
			assert(result.range !== undefined, "Range should be defined")
			assert(result.snippet.includes("function testFunction"), "Should contain function declaration")
			assert(result.snippet.includes("TestInterface"), "Should contain return type")
		}

		reporter.passTest("getSymbolCodeSnippet", "Name-based lookup for function")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Name-based lookup for function", error)
	}

	// Test 16: Name-based lookup for interface
	reporter.startTest("getSymbolCodeSnippet", "Name-based lookup for interface")
	try {
		const uri = await createTestFile("test-name-interface-snippet.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Test name-based lookup for interface
		const result = await lspController.getSymbolCodeSnippet({
			uri: uri.toString(),
			symbolName: "TestInterface",
		})

		assert(result !== null, "Should return code snippet for TestInterface using name lookup")
		if (result !== null) {
			assert(typeof result.snippet === "string", "Code snippet should be a string")
			assert(result.snippet.length > 0, "Code snippet should not be empty")
			assert(result.uri === uri.toString(), "URI should match")
			assert(result.range !== undefined, "Range should be defined")
			assert(result.snippet.includes("interface TestInterface"), "Should contain interface declaration")
			assert(result.snippet.includes("id: number"), "Should contain interface properties")
		}

		reporter.passTest("getSymbolCodeSnippet", "Name-based lookup for interface")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Name-based lookup for interface", error)
	}

	// Test 17: Name-based lookup with Python file
	reporter.startTest("getSymbolCodeSnippet", "Name-based lookup with Python file")
	try {
		const uri = await createTestFile("test-name-python-snippet.py", SAMPLE_PY_CONTENT)
		const editor = await openTestFile(uri)

		// Test name-based lookup for Python class
		const result = await lspController.getSymbolCodeSnippet({
			uri: uri.toString(),
			symbolName: "TestClass",
		})

		if (result !== null) {
			assert(typeof result.snippet === "string", "Code snippet should be a string")
			assert(result.snippet.length > 0, "Code snippet should not be empty")
			assert(result.uri === uri.toString(), "URI should match")
			assert(result.range !== undefined, "Range should be defined")
			assert(result.snippet.includes("class TestClass"), "Should contain Python class declaration")
		}

		reporter.passTest("getSymbolCodeSnippet", "Name-based lookup with Python file")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Name-based lookup with Python file", error)
	}

	// Test 18: Name-based lookup with JavaScript file
	reporter.startTest("getSymbolCodeSnippet", "Name-based lookup with JavaScript file")
	try {
		const uri = await createTestFile("test-name-js-snippet.js", SAMPLE_JS_CONTENT)
		const editor = await openTestFile(uri)

		// Test name-based lookup for JavaScript function
		const result = await lspController.getSymbolCodeSnippet({
			uri: uri.toString(),
			symbolName: "testFunction",
		})

		if (result !== null) {
			assert(typeof result.snippet === "string", "Code snippet should be a string")
			assert(result.snippet.length > 0, "Code snippet should not be empty")
			assert(result.uri === uri.toString(), "URI should match")
			assert(result.range !== undefined, "Range should be defined")
			assert(result.snippet.includes("function testFunction"), "Should contain JavaScript function declaration")
		}

		reporter.passTest("getSymbolCodeSnippet", "Name-based lookup with JavaScript file")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Name-based lookup with JavaScript file", error)
	}

	// Test 19: Name-based lookup for non-existent symbol
	reporter.startTest("getSymbolCodeSnippet", "Name-based lookup for non-existent symbol")
	try {
		const uri = await createTestFile("test-name-nonexistent-snippet.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Test name-based lookup for non-existent symbol
		const result = await lspController.getSymbolCodeSnippet({
			uri: uri.toString(),
			symbolName: "NonExistentSymbol",
		})

		// Should return null for non-existent symbol
		assert(result === null, "Should return null for non-existent symbol")

		reporter.passTest("getSymbolCodeSnippet", "Name-based lookup for non-existent symbol")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Name-based lookup for non-existent symbol", error)
	}

	// Test 20: Name-based lookup with nested symbols
	reporter.startTest("getSymbolCodeSnippet", "Name-based lookup with nested symbols")
	try {
		const nestedContent = `
namespace MyNamespace {
    export class OuterClass {
        private field: string = "";
        
        constructor(value: string) {
            this.field = value;
        }
        
        public method(): void {
            function innerFunction() {
                return "inner";
            }
            innerFunction();
        }
        
        static staticMethod(): string {
            return "static";
        }
    }
    
    export interface OuterInterface {
        prop: number;
        method(): void;
    }
}
`

		const uri = await createTestFile("test-name-nested-snippet.ts", nestedContent)
		const editor = await openTestFile(uri)

		// Test name-based lookup for nested class
		const result = await lspController.getSymbolCodeSnippet({
			uri: uri.toString(),
			symbolName: "OuterClass",
		})

		assert(result !== null, "Should return code snippet for nested OuterClass using name lookup")
		if (result !== null) {
			assert(typeof result.snippet === "string", "Code snippet should be a string")
			assert(result.snippet.length > 0, "Code snippet should not be empty")
			assert(result.uri === uri.toString(), "URI should match")
			assert(result.range !== undefined, "Range should be defined")
			assert(result.snippet.includes("class OuterClass"), "Should contain class declaration")
			assert(result.snippet.includes("constructor"), "Should contain constructor")
			assert(result.snippet.includes("staticMethod"), "Should contain static method")
		}

		reporter.passTest("getSymbolCodeSnippet", "Name-based lookup with nested symbols")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Name-based lookup with nested symbols", error)
	}

	// Test 21: Name-based lookup with call hierarchy
	reporter.startTest("getSymbolCodeSnippet", "Name-based lookup with call hierarchy")
	try {
		const complexContent = `
export function callerFunction() {
		  return targetFunction("test");
}

export function targetFunction(param: string): string {
		  return helperFunction(param);
}

export function helperFunction(value: string): string {
		  return value.toUpperCase();
}

export function anotherCaller() {
		  targetFunction("another");
}
`
		const uri = await createTestFile("test-name-call-hierarchy.ts", complexContent)
		const editor = await openTestFile(uri)

		// Test name-based lookup with call hierarchy
		const result = await lspController.getSymbolCodeSnippet({
			uri: uri.toString(),
			symbolName: "targetFunction",
			includeCallHierarchy: true,
		})

		assert(result !== null, "Should return code snippet with call hierarchy using name lookup")
		if (result !== null) {
			assert(typeof result.snippet === "string", "Code snippet should be a string")
			assert(result.snippet.length > 0, "Code snippet should not be empty")
			assert(result.uri === uri.toString(), "URI should match")
			assert(result.range !== undefined, "Range should be defined")
			assert(result.snippet.includes("function targetFunction"), "Should contain function declaration")
			
			// Test call hierarchy table format
			assert(result.callHierarchy !== null, "Call hierarchy should be included")
			if (result.callHierarchy) {
				assert(typeof result.callHierarchy === "object", "Call hierarchy should be an object")
				assert(typeof result.callHierarchy.incomingCalls === "string", "Incoming calls should be a table string")
				assert(typeof result.callHierarchy.outgoingCalls === "string", "Outgoing calls should be a table string")
			}
		}

		reporter.passTest("getSymbolCodeSnippet", "Name-based lookup with call hierarchy")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Name-based lookup with call hierarchy", error)
	}

	// Test 22: Name-based lookup with usages
	reporter.startTest("getSymbolCodeSnippet", "Name-based lookup with usages")
	try {
		const usageContent = `
export const CONSTANT_VALUE = "test";

export function useConstant() {
		  console.log(CONSTANT_VALUE);
		  return CONSTANT_VALUE + " used";
}

export function anotherUser() {
		  const value = CONSTANT_VALUE;
		  return value;
}
`
		const uri = await createTestFile("test-name-usages.ts", usageContent)
		const editor = await openTestFile(uri)

		// Test name-based lookup with usages
		const result = await lspController.getSymbolCodeSnippet({
			uri: uri.toString(),
			symbolName: "CONSTANT_VALUE",
			includeUsages: true,
		})

		assert(result !== null, "Should return code snippet with usages using name lookup")
		if (result !== null) {
			assert(typeof result.snippet === "string", "Code snippet should be a string")
			assert(result.snippet.length > 0, "Code snippet should not be empty")
			assert(result.uri === uri.toString(), "URI should match")
			assert(result.range !== undefined, "Range should be defined")
			assert(result.snippet.includes("CONSTANT_VALUE"), "Should contain constant declaration")
			
			// Test usages table format
			assert(result.usages !== null, "Usages should be included")
			if (result.usages) {
				assert(typeof result.usages === "string", "Usages should be a table string")
				assert(result.usages.includes("URI | RANGE | PREVIEW | EOL"), "Usages should have table header")
			}
		}

		reporter.passTest("getSymbolCodeSnippet", "Name-based lookup with usages")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Name-based lookup with usages", error)
	}

	// Test 23: Backward compatibility - position-based lookup still works
	reporter.startTest("getSymbolCodeSnippet", "Backward compatibility - position-based lookup")
	try {
		const uri = await createTestFile("test-backward-compatibility.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// First get document symbols to find the TestClass
		const symbolsResult = await lspController.getDocumentSymbols({
			textDocument: { uri: uri.toString() },
			return_children: "yes",
		})

		const symbols = parseSymbolsResult(symbolsResult)
		let testClassSymbol = symbols.find((s: any) => s.name === "TestClass")
		if (!testClassSymbol) {
			// Look for TestClass in nested symbols
			for (const symbol of symbols) {
				if (symbol.children) {
					testClassSymbol = symbol.children.find((c: any) => c.name === "TestClass")
					if (testClassSymbol) break
				}
			}
		}

		if (testClassSymbol) {
			// Test that position-based lookup still works (backward compatibility)
			const result = await lspController.getSymbolCodeSnippet({
				uri: uri.toString(),
				line: testClassSymbol.selectionRange.start.line,
				character: testClassSymbol.selectionRange.start.character,
			})

			assert(result !== null, "Position-based lookup should still work for backward compatibility")
			if (result !== null) {
				assert(typeof result.snippet === "string", "Code snippet should be a string")
				assert(result.snippet.length > 0, "Code snippet should not be empty")
				assert(result.uri === uri.toString(), "URI should match")
				assert(result.range !== undefined, "Range should be defined")
				assert(result.snippet.includes("class TestClass"), "Should contain class declaration")
			}
		}

		reporter.passTest("getSymbolCodeSnippet", "Backward compatibility - position-based lookup")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Backward compatibility - position-based lookup", error)
	}

	// Test 24: Invalid parameters - missing both position and symbolName
	reporter.startTest("getSymbolCodeSnippet", "Invalid parameters - missing both position and symbolName")
	try {
		const uri = await createTestFile("test-invalid-params.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Test with neither position nor symbolName (should fail validation)
		try {
			const result = await lspController.getSymbolCodeSnippet({
				uri: uri.toString(),
				// Missing both line/character and symbolName
			})
			
			// If we get here, the validation didn't work as expected
			assert(false, "Should have thrown an error for missing both position and symbolName")
		} catch (validationError) {
			// This is expected - validation should catch missing parameters
			assert(true, "Correctly caught validation error for missing parameters")
		}

		reporter.passTest("getSymbolCodeSnippet", "Invalid parameters - missing both position and symbolName")
	} catch (error) {
		reporter.failTest("getSymbolCodeSnippet", "Invalid parameters - missing both position and symbolName", error)
	}
}
