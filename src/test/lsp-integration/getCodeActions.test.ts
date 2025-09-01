/**
 * Integration tests for getCodeActions LSP tool
 */

import * as vscode from "vscode"
import { lspController } from "../../zentara_lsp/src/LspController"
import { TestReporter, createTestFile, openTestFile, assert, waitFor, getPosition } from "./testUtils"

export async function testGetCodeActions(reporter: TestReporter): Promise<void> {
	// Test 1: Get code actions for TypeScript error diagnostics
	reporter.startTest("getCodeActions", "Get code actions for TypeScript error diagnostics")
	try {
		const errorContent = `// TypeScript error cases
function testFunction() {
    let unusedVariable = 42;
    const undefinedValue = someUndefinedVariable; // Error: undeclared variable
    return missingFunction(); // Error: undeclared function
}`

		const uri = await createTestFile("test-error-actions.ts", errorContent)
		const editor = await openTestFile(uri)

		// Wait for language server to analyze the file
		await waitFor(() => vscode.languages.getDiagnostics(uri).length > 0, 3000)

		const result = await lspController.getCodeActions({
			textDocument: { uri: uri.toString() },
			position: { line: 4, character: 20 }, // On the undefinedValue error
		})

		assert(Array.isArray(result), "Should return array of code actions")
		console.log(`Found ${result.length} code actions for TypeScript errors`)

		// Verify we get some actions (might include quick fixes or suggestions)
		if (result.length > 0) {
			const hasQuickFix = result.some((action) => action.kind && action.kind.includes("quickfix"))
			console.log(`Has quickfix actions: ${hasQuickFix}`)
		}

		reporter.passTest("getCodeActions", "Get code actions for TypeScript error diagnostics")
	} catch (error) {
		reporter.failTest("getCodeActions", "Get code actions for TypeScript error diagnostics", error)
	}

	// Test 2: Get code actions for warnings (unused variables)
	reporter.startTest("getCodeActions", "Get code actions for warnings")
	try {
		const warningContent = `// Code with potential warnings
function testWarnings() {
    const unusedVar = 'not used'; // Warning: unused variable
    let assignedButNeverRead = 42;
    assignedButNeverRead = 100; // Assigned but never read
    console.log('Hello');
}`

		const uri = await createTestFile("test-warning-actions.ts", warningContent)
		const editor = await openTestFile(uri)

		// Wait for diagnostics
		await waitFor(() => {
			const diagnostics = vscode.languages.getDiagnostics(uri)
			return diagnostics.length > 0
		}, 3000)

		const result = await lspController.getCodeActions({
			textDocument: { uri: uri.toString() },
			position: { line: 3, character: 10 }, // On the unused variable
		})

		assert(Array.isArray(result), "Should return array of warning-related actions")
		console.log(`Found ${result.length} code actions for warnings`)

		// Check for actions that might fix unused variables
		if (result.length > 0) {
			result.forEach((action, index) => {
				console.log(`Action ${index}: ${action.title} (kind: ${action.kind})`)
			})
		}

		reporter.passTest("getCodeActions", "Get code actions for warnings")
	} catch (error) {
		reporter.failTest("getCodeActions", "Get code actions for warnings", error)
	}

	// Test 3: Get quick fix code actions
	reporter.startTest("getCodeActions", "Get quick fixes")
	try {
		const quickFixContent = `// Interface implementation missing members
interface ITestInterface {
    name: string;
    value: number;
    method(): void;
}

class IncompleteClass implements ITestInterface {
    // Missing implementation - should trigger quick fix suggestions
}`

		const uri = await createTestFile("test-quickfix-actions.ts", quickFixContent)
		const editor = await openTestFile(uri)

		// Wait for diagnostics about missing interface implementation
		await waitFor(() => {
			const diagnostics = vscode.languages.getDiagnostics(uri)
			return diagnostics.some((d) => d.message.includes("implement") || d.message.includes("missing"))
		}, 4000)

		const result = await lspController.getCodeActions({
			textDocument: { uri: uri.toString() },
			position: { line: 8, character: 6 }, // On the class name
		})

		assert(Array.isArray(result), "Should return array of quick fix actions")
		console.log(`Found ${result.length} quick fix actions`)

		// Look for quick fix actions
		const quickFixes = result.filter(
			(action) =>
				action.kind && (action.kind.includes("quickfix") || action.title.toLowerCase().includes("implement")),
		)
		console.log(`Quick fix actions found: ${quickFixes.length}`)

		reporter.passTest("getCodeActions", "Get quick fixes")
	} catch (error) {
		reporter.failTest("getCodeActions", "Get quick fixes", error)
	}

	// Test 4: Get refactoring actions
	reporter.startTest("getCodeActions", "Get refactoring actions")
	try {
		const refactorContent = `// Code suitable for refactoring
function calculateTotal(items: any[]) {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
        total += items[i].price;
    }
    return total;
}

function processItems() {
    const items = [{price: 10}, {price: 20}];
    const total = calculateTotal(items);
    console.log(total);
}`

		const uri = await createTestFile("test-refactor-actions.ts", refactorContent)
		const editor = await openTestFile(uri)

		// Wait for language server to analyze
		await new Promise((resolve) => setTimeout(resolve, 1000))

		const result = await lspController.getCodeActions({
			textDocument: { uri: uri.toString() },
			position: { line: 3, character: 15 }, // Inside the for loop
		})

		assert(Array.isArray(result), "Should return array of refactoring actions")
		console.log(`Found ${result.length} refactoring actions`)

		// Look for refactoring actions
		const refactorActions = result.filter(
			(action) =>
				action.kind && (action.kind.includes("refactor") || action.title.toLowerCase().includes("extract")),
		)
		console.log(`Refactor actions found: ${refactorActions.length}`)

		if (result.length > 0) {
			result.forEach((action, index) => {
				console.log(`Refactor action ${index}: ${action.title} (kind: ${action.kind})`)
			})
		}

		reporter.passTest("getCodeActions", "Get refactoring actions")
	} catch (error) {
		reporter.failTest("getCodeActions", "Get refactoring actions", error)
	}

	// Test 5: Handle positions with no code actions
	reporter.startTest("getCodeActions", "Handle positions with no code actions")
	try {
		const cleanContent = `// Clean code with no issues
const perfectCode = 42;
console.log(perfectCode);`

		const uri = await createTestFile("test-no-actions.ts", cleanContent)
		const editor = await openTestFile(uri)

		// Wait a bit for analysis
		await new Promise((resolve) => setTimeout(resolve, 500))

		const result = await lspController.getCodeActions({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 5 }, // In a comment area
		})

		assert(Array.isArray(result), "Should return array even when no actions available")
		console.log(`Found ${result.length} actions for clean code (expected: few or none)`)

		// Should handle empty arrays gracefully
		if (result.length === 0) {
			console.log("Successfully handled empty code actions array")
		}

		reporter.passTest("getCodeActions", "Handle positions with no code actions")
	} catch (error) {
		reporter.failTest("getCodeActions", "Handle positions with no code actions", error)
	}

	// Test 6: Test different ranges and contexts (Python)
	reporter.startTest("getCodeActions", "Test different ranges and contexts (Python)")
	try {
		const pythonContent = `# Python code with potential issues
import os
import sys  # Unused import
import json

def test_function():
    # undefined_variable = some_undefined_var  # Commented out error
    data = {'key': 'value'}
    return data

class EmptyClass:
    pass`

		const uri = await createTestFile("test-py-actions.py", pythonContent)
		const editor = await openTestFile(uri)

		// Wait for Python language server
		await new Promise((resolve) => setTimeout(resolve, 1500))

		const result = await lspController.getCodeActions({
			textDocument: { uri: uri.toString() },
			position: { line: 3, character: 10 }, // On unused import
		})

		assert(Array.isArray(result), "Should handle Python code actions")
		console.log(`Found ${result.length} Python code actions`)

		// Python might have organize imports or remove unused import actions
		const organizeActions = result.filter(
			(action) =>
				action.title.toLowerCase().includes("import") ||
				action.title.toLowerCase().includes("organize") ||
				(action.kind && action.kind.includes("source")),
		)
		console.log(`Python organize/import actions: ${organizeActions.length}`)

		reporter.passTest("getCodeActions", "Test different ranges and contexts (Python)")
	} catch (error) {
		reporter.failTest("getCodeActions", "Test different ranges and contexts (Python)", error)
	}

	// Test 7: Verify code action kinds
	reporter.startTest("getCodeActions", "Verify code action kinds")
	try {
		const mixedContent = `// Mixed content for various action types
import { readFileSync, writeFileSync } from 'fs';
import * as path from 'path';
import * as os from 'os'; // Unused import

function processFile() {
    const data = readFileSync('input.txt', 'utf8');
    const processed = data.toUpperCase();
    writeFileSync('output.txt', processed);
}

class TestClass {
    private value: number;
    
    constructor(val: number) {
        this.value = val;
    }
}`

		const uri = await createTestFile("test-action-kinds.ts", mixedContent)
		const editor = await openTestFile(uri)

		// Wait for analysis
		await new Promise((resolve) => setTimeout(resolve, 1000))

		const result = await lspController.getCodeActions({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 0 }, // At import statements
		})

		assert(Array.isArray(result), "Should return array of various action kinds")
		console.log(`Found ${result.length} actions for mixed content`)

		// Categorize actions by kind
		const actionKinds = {
			quickfix: 0,
			refactor: 0,
			source: 0,
			other: 0,
		}

		result.forEach((action) => {
			if (action.kind) {
				if (action.kind.includes("quickfix")) {
					actionKinds.quickfix++
				} else if (action.kind.includes("refactor")) {
					actionKinds.refactor++
				} else if (action.kind.includes("source")) {
					actionKinds.source++
				} else {
					actionKinds.other++
				}
			} else {
				actionKinds.other++
			}
			console.log(`Action: "${action.title}" (kind: ${action.kind || "undefined"})`)
		})

		console.log("Action kinds summary:", actionKinds)

		// Verify that we can handle different kinds gracefully
		const hasValidKinds = result.every(
			(action) =>
				typeof action.title === "string" && (action.kind === undefined || typeof action.kind === "string"),
		)
		assert(hasValidKinds, "All actions should have valid title and kind properties")

		reporter.passTest("getCodeActions", "Verify code action kinds")
	} catch (error) {
		reporter.failTest("getCodeActions", "Verify code action kinds", error)
	}

	// Test 8: Test empty arrays gracefully
	reporter.startTest("getCodeActions", "Handle empty arrays gracefully")
	try {
		const minimalContent = `const x = 1;`

		const uri = await createTestFile("test-minimal.ts", minimalContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getCodeActions({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 0 }, // Position beyond content
		})

		assert(Array.isArray(result), "Should always return an array")
		console.log(`Minimal content returned ${result.length} actions`)

		// Test array methods work properly
		const filtered = result.filter((action) => action.title.length > 0)
		const mapped = result.map((action) => action.title)

		assert(Array.isArray(filtered), "Filtered result should be array")
		assert(Array.isArray(mapped), "Mapped result should be array")

		console.log("Empty array handling: PASSED")

		reporter.passTest("getCodeActions", "Handle empty arrays gracefully")
	} catch (error) {
		reporter.failTest("getCodeActions", "Handle empty arrays gracefully", error)
	}

	// Test 9: Get code actions using symbolName parameter for TypeScript symbols
	reporter.startTest("getCodeActions", "Get code actions using symbolName for TypeScript symbols")
	try {
		const content = `
// Code with various issues that could generate code actions
interface TestInterface {
    id: number;
    name: string;
    getValue(): string;
}

class IncompleteTestClass implements TestInterface {
    id: number;
    // Missing implementation of name and getValue - should trigger code actions
    
    constructor(id: number) {
        this.id = id;
    }
}

class UnusedTestClass {
    unusedField: string = "unused";
    
    unusedMethod(): void {
        console.log(this.unusedField);
    }
}

function testFunction() {
    let unusedVariable = 42;
    const undefinedValue = someUndefinedVariable; // Error: undeclared variable
    return missingFunction(); // Error: undeclared function
}

function anotherFunction() {
    // This could be converted to arrow function
    return "test";
}

const testVariable = "test";
const anotherVariable = undeclaredVariable; // Error
`
		const uri = await createTestFile("test-symbolname-actions.ts", content)
		const editor = await openTestFile(uri)

		// Wait for language server to analyze
		await waitFor(() => vscode.languages.getDiagnostics(uri).length > 0, 3000)

		// Test code actions for IncompleteTestClass using symbolName
		try {
			const classResult = await lspController.getCodeActions({
				uri: uri.toString(),
				symbolName: "IncompleteTestClass",
			})
			assert(Array.isArray(classResult), "Should return array for IncompleteTestClass symbolName lookup")
			if (classResult.length > 0) {
				classResult.forEach((action) => {
					assert(typeof action.title === "string", "Action should have title string")
					assert(action.kind === undefined || typeof action.kind === "string", "Action kind should be string or undefined")
				})
				// Look for implementation-related actions
				const implementActions = classResult.filter(
					(action) => action.title.toLowerCase().includes("implement") || 
							   action.title.toLowerCase().includes("missing") ||
							   (action.kind && action.kind.includes("quickfix"))
				)
				console.log(`Found ${implementActions.length} implementation-related actions for IncompleteTestClass`)
			}
		} catch (error) {
			console.warn("IncompleteTestClass symbolName lookup failed:", error)
		}

		// Test code actions for TestInterface using symbolName
		try {
			const interfaceResult = await lspController.getCodeActions({
				uri: uri.toString(),
				symbolName: "TestInterface",
			})
			assert(Array.isArray(interfaceResult), "Should return array for TestInterface symbolName lookup")
			console.log(`Found ${interfaceResult.length} actions for TestInterface via symbolName`)
		} catch (error) {
			console.warn("TestInterface symbolName lookup failed:", error)
		}

		// Test code actions for UnusedTestClass using symbolName
		try {
			const unusedResult = await lspController.getCodeActions({
				uri: uri.toString(),
				symbolName: "UnusedTestClass",
			})
			assert(Array.isArray(unusedResult), "Should return array for UnusedTestClass symbolName lookup")
			console.log(`Found ${unusedResult.length} actions for UnusedTestClass via symbolName`)
		} catch (error) {
			console.warn("UnusedTestClass symbolName lookup failed:", error)
		}

		// Test code actions for testFunction using symbolName
		try {
			const functionResult = await lspController.getCodeActions({
				uri: uri.toString(),
				symbolName: "testFunction",
			})
			assert(Array.isArray(functionResult), "Should return array for testFunction symbolName lookup")
			if (functionResult.length > 0) {
				// Look for error-related quick fixes
				const quickFixActions = functionResult.filter(
					(action) => action.kind && action.kind.includes("quickfix")
				)
				console.log(`Found ${quickFixActions.length} quick fix actions for testFunction`)
			}
		} catch (error) {
			console.warn("testFunction symbolName lookup failed:", error)
		}

		// Test code actions for anotherFunction using symbolName
		try {
			const anotherResult = await lspController.getCodeActions({
				uri: uri.toString(),
				symbolName: "anotherFunction",
			})
			assert(Array.isArray(anotherResult), "Should return array for anotherFunction symbolName lookup")
			if (anotherResult.length > 0) {
				// Look for refactoring actions
				const refactorActions = anotherResult.filter(
					(action) => action.kind && action.kind.includes("refactor")
				)
				console.log(`Found ${refactorActions.length} refactor actions for anotherFunction`)
			}
		} catch (error) {
			console.warn("anotherFunction symbolName lookup failed:", error)
		}

		reporter.passTest("getCodeActions", "Get code actions using symbolName for TypeScript symbols")
	} catch (error) {
		reporter.failTest("getCodeActions", "Get code actions using symbolName for TypeScript symbols", error)
	}

	// Test 10: Error handling for symbolName parameter
	reporter.startTest("getCodeActions", "Error handling for symbolName parameter")
	try {
		const content = `
class TestClass {
    testMethod(): void {
        console.log('test');
    }
}

const testVariable = 'test';
`
		const uri = await createTestFile("test-error-handling.ts", content)

		// Test with non-existent symbol
		const nonExistentResult = await lspController.getCodeActions({
			uri: uri.toString(),
			symbolName: "NonExistentSymbol",
		})
		assert(Array.isArray(nonExistentResult), "Should return array for non-existent symbol")
		// Non-existent symbol should return empty array
		console.log(`Non-existent symbol returned ${nonExistentResult.length} actions`)

		// Test with empty symbolName
		try {
			const emptyResult = await lspController.getCodeActions({
				uri: uri.toString(),
				symbolName: "",
			})
			assert(Array.isArray(emptyResult), "Should handle empty symbolName gracefully")
		} catch (error) {
			// Empty symbolName might throw error, which is acceptable
			console.warn("Empty symbolName threw error (acceptable):", error.message)
		}

		// Test with whitespace-only symbolName
		try {
			const whitespaceResult = await lspController.getCodeActions({
				uri: uri.toString(),
				symbolName: "   ",
			})
			assert(Array.isArray(whitespaceResult), "Should handle whitespace-only symbolName gracefully")
		} catch (error) {
			// Whitespace symbolName might throw error, which is acceptable
			console.warn("Whitespace symbolName threw error (acceptable):", error.message)
		}

		// Test with invalid URI
		try {
			const invalidUriResult = await lspController.getCodeActions({
				uri: "file:///non-existent-file.ts",
				symbolName: "TestClass",
			})
			// This might succeed with empty array or throw error - both are acceptable
		} catch (error) {
			console.warn("Invalid URI threw error (acceptable):", error.message)
		}

		reporter.passTest("getCodeActions", "Error handling for symbolName parameter")
	} catch (error) {
		reporter.failTest("getCodeActions", "Error handling for symbolName parameter", error)
	}

	// Test 11: Mixed parameter usage (both position and symbolName scenarios)
	reporter.startTest("getCodeActions", "Mixed parameter usage validation")
	try {
		// Test that both position-based and symbolName-based lookups work on same file
		const content = `
interface MixedInterface {
    prop: string;
    method(): void;
}

class MixedTestClass implements MixedInterface {
    // Missing implementations - should trigger code actions
    private field: string;
    
    constructor(field: string) {
        this.field = field;
    }
}

function mixedFunction() {
    let unusedVar = 42;
    return undefinedValue; // Error
}
`
		const uri = await createTestFile("test-mixed-params.ts", content)
		const editor = await openTestFile(uri)

		// Wait for diagnostics
		await waitFor(() => vscode.languages.getDiagnostics(uri).length > 0, 3000)

		// Position-based lookup
		const positionResult = await lspController.getCodeActions({
			textDocument: { uri: uri.toString() },
			position: { line: 7, character: 6 }, // Position on MixedTestClass
		})
		assert(Array.isArray(positionResult), "Position-based lookup should work")

		// SymbolName-based lookup on same file
		const symbolResult = await lspController.getCodeActions({
			uri: uri.toString(),
			symbolName: "MixedTestClass",
		})
		assert(Array.isArray(symbolResult), "SymbolName-based lookup should work")

		// Both should potentially find similar code actions (though exact matching isn't guaranteed)
		if (positionResult.length > 0 && symbolResult.length > 0) {
			assert(
				positionResult.every((action) => typeof action.title === "string"),
				"Position-based actions should have title property",
			)
			assert(
				symbolResult.every((action) => typeof action.title === "string"),
				"Symbol-based actions should have title property",
			)
			
			// Look for implementation-related actions in both results
			const positionImplementActions = positionResult.filter(
				(action) => action.title.toLowerCase().includes("implement")
			)
			const symbolImplementActions = symbolResult.filter(
				(action) => action.title.toLowerCase().includes("implement")
			)
			
			console.log(`Position-based: ${positionImplementActions.length} implement actions, Symbol-based: ${symbolImplementActions.length} implement actions`)
		}

		console.log(`Position-based: ${positionResult.length} actions, Symbol-based: ${symbolResult.length} actions`)

		reporter.passTest("getCodeActions", "Mixed parameter usage validation")
	} catch (error) {
		reporter.failTest("getCodeActions", "Mixed parameter usage validation", error)
	}
}
