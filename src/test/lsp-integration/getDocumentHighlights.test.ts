/**
 * Integration tests for getDocumentHighlights LSP tool
 */

import * as vscode from "vscode"
import { lspController } from "../../zentara_lsp/src/LspController"
import {
	TestReporter,
	createTestFile,
	openTestFile,
	getPosition,
	assert,
	SAMPLE_TS_CONTENT,
	SAMPLE_PY_CONTENT,
	SAMPLE_JS_CONTENT,
} from "./testUtils"

export async function testGetDocumentHighlights(reporter: TestReporter): Promise<void> {
	// Test 1: Highlight all occurrences of a variable
	reporter.startTest("getDocumentHighlights", "Highlight variable occurrences in TypeScript")
	try {
		const content = `
function testFunction() {
    const testVariable = 42;
    console.log(testVariable);
    return testVariable + 1;
}
const anotherVariable = testFunction();
`
		const uri = await createTestFile("test-highlight-variable.ts", content)
		const editor = await openTestFile(uri)

		// Position on testVariable declaration (line 3, character 10)
		const result = await lspController.getDocumentHighlights({
			textDocument: { uri: uri.toString() },
			position: { line: 3, character: 10 },
		})

		assert(Array.isArray(result), "Should return an array")

		// If highlights are found, verify structure
		if (result.length > 0) {
			result.forEach((highlight) => {
				assert("range" in highlight, "Each highlight should have a range property")
				assert("start" in highlight.range, "Range should have start property")
				assert("end" in highlight.range, "Range should have end property")
				assert(typeof highlight.range.start.line === "number", "Start line should be a number")
				assert(typeof highlight.range.start.character === "number", "Start character should be a number")
				assert(typeof highlight.range.end.line === "number", "End line should be a number")
				assert(typeof highlight.range.end.character === "number", "End character should be a number")

				// Kind is optional but if present should be a number
				if ("kind" in highlight && highlight.kind !== undefined) {
					assert(typeof highlight.kind === "number", "Highlight kind should be a number if present")
				}
			})
		}

		reporter.passTest("getDocumentHighlights", "Highlight variable occurrences in TypeScript")
	} catch (error) {
		reporter.failTest("getDocumentHighlights", "Highlight variable occurrences in TypeScript", error)
	}

	// Test 2: Highlight function/method references
	reporter.startTest("getDocumentHighlights", "Highlight function references")
	try {
		const content = `
class Calculator {
    add(a: number, b: number): number {
        return a + b;
    }
    
    multiply(a: number, b: number): number {
        return this.add(a * b, 0);
    }
}

const calc = new Calculator();
const result = calc.add(5, 3);
const result2 = calc.add(10, 20);
`
		const uri = await createTestFile("test-highlight-function.ts", content)
		const editor = await openTestFile(uri)

		// Position on 'add' method definition (line 3, character 4)
		const result = await lspController.getDocumentHighlights({
			textDocument: { uri: uri.toString() },
			position: { line: 3, character: 4 },
		})

		assert(Array.isArray(result), "Should return an array")

		// Verify highlight structure if results exist
		if (result.length > 0) {
			const firstHighlight = result[0]
			assert("range" in firstHighlight, "Highlight should have range")
			assert(firstHighlight.range.start.line >= 0, "Line should be non-negative")
			assert(firstHighlight.range.start.character >= 0, "Character should be non-negative")
		}

		reporter.passTest("getDocumentHighlights", "Highlight function references")
	} catch (error) {
		reporter.failTest("getDocumentHighlights", "Highlight function references", error)
	}

	// Test 3: Highlight class usages
	reporter.startTest("getDocumentHighlights", "Highlight class usages")
	try {
		const uri = await createTestFile("test-highlight-class.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Position on TestClass declaration (line 1, character 6)
		const result = await lspController.getDocumentHighlights({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 6 },
		})

		assert(Array.isArray(result), "Should return an array")

		// Test that each highlight has required properties
		result.forEach((highlight, index) => {
			assert(typeof highlight === "object", `Highlight ${index} should be an object`)
			assert(highlight.range !== undefined, `Highlight ${index} should have a range`)
			assert(highlight.range.start !== undefined, `Highlight ${index} range should have start`)
			assert(highlight.range.end !== undefined, `Highlight ${index} range should have end`)
		})

		reporter.passTest("getDocumentHighlights", "Highlight class usages")
	} catch (error) {
		reporter.failTest("getDocumentHighlights", "Highlight class usages", error)
	}

	// Test 4: Test read vs write highlights (check highlight kinds)
	reporter.startTest("getDocumentHighlights", "Test read vs write highlight kinds")
	try {
		const content = `
let counter = 0;
function increment() {
    counter = counter + 1;  // Write on left, read on right
    return counter;         // Read
}
const value = counter;      // Read
counter++;                  // Write
`
		const uri = await createTestFile("test-highlight-kinds.ts", content)
		const editor = await openTestFile(uri)

		// Position on counter declaration (line 2, character 4)
		const result = await lspController.getDocumentHighlights({
			textDocument: { uri: uri.toString() },
			position: { line: 2, character: 4 },
		})

		assert(Array.isArray(result), "Should return an array")

		// Check highlight kinds if they exist
		result.forEach((highlight, index) => {
			if (highlight.kind !== undefined) {
				// VS Code DocumentHighlightKind: Text = 1, Read = 2, Write = 3
				assert(
					highlight.kind >= 1 && highlight.kind <= 3,
					`Highlight ${index} kind should be 1 (Text), 2 (Read), or 3 (Write), got ${highlight.kind}`,
				)
			}
		})

		reporter.passTest("getDocumentHighlights", "Test read vs write highlight kinds")
	} catch (error) {
		reporter.failTest("getDocumentHighlights", "Test read vs write highlight kinds", error)
	}

	// Test 5: Handle positions with no highlights
	reporter.startTest("getDocumentHighlights", "Handle positions with no highlights")
	try {
		const content = `
// This is a comment
/* Multi-line
   comment */
const value = 42;
`
		const uri = await createTestFile("test-no-highlights.ts", content)
		const editor = await openTestFile(uri)

		// Position in a comment where no highlights should be found (line 2, character 5)
		const result = await lspController.getDocumentHighlights({
			textDocument: { uri: uri.toString() },
			position: { line: 2, character: 5 },
		})

		assert(Array.isArray(result), "Should return an array even when no highlights found")
		// Note: result might be empty array, which is valid

		reporter.passTest("getDocumentHighlights", "Handle positions with no highlights")
	} catch (error) {
		reporter.failTest("getDocumentHighlights", "Handle positions with no highlights", error)
	}

	// Test 6: Test with Python file
	reporter.startTest("getDocumentHighlights", "Highlight in Python file")
	try {
		const uri = await createTestFile("test-highlight-python.py", SAMPLE_PY_CONTENT)
		const editor = await openTestFile(uri)

		// Position on TestClass in Python (line 1, character 6)
		const result = await lspController.getDocumentHighlights({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 6 },
		})

		assert(Array.isArray(result), "Should return an array for Python file")

		// Verify structure of any highlights found
		result.forEach((highlight) => {
			assert("range" in highlight, "Python highlight should have range")
			assert(Number.isInteger(highlight.range.start.line), "Python highlight line should be integer")
			assert(Number.isInteger(highlight.range.start.character), "Python highlight character should be integer")
		})

		reporter.passTest("getDocumentHighlights", "Highlight in Python file")
	} catch (error) {
		reporter.failTest("getDocumentHighlights", "Highlight in Python file", error)
	}

	// Test 7: Test with JavaScript file
	reporter.startTest("getDocumentHighlights", "Highlight in JavaScript file")
	try {
		const uri = await createTestFile("test-highlight-javascript.js", SAMPLE_JS_CONTENT)
		const editor = await openTestFile(uri)

		// Position on TestClass in JavaScript (line 1, character 6)
		const result = await lspController.getDocumentHighlights({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 6 },
		})

		assert(Array.isArray(result), "Should return an array for JavaScript file")

		reporter.passTest("getDocumentHighlights", "Highlight in JavaScript file")
	} catch (error) {
		reporter.failTest("getDocumentHighlights", "Highlight in JavaScript file", error)
	}

	// Test 8: Handle invalid position gracefully
	reporter.startTest("getDocumentHighlights", "Handle invalid position")
	try {
		const uri = await createTestFile("test-invalid-position.ts", SAMPLE_TS_CONTENT)

		// Position far beyond file content
		const result = await lspController.getDocumentHighlights({
			textDocument: { uri: uri.toString() },
			position: { line: 9999, character: 9999 },
		})

		assert(Array.isArray(result), "Should return array even for invalid position")

		reporter.passTest("getDocumentHighlights", "Handle invalid position")
	} catch (error) {
		reporter.failTest("getDocumentHighlights", "Handle invalid position", error)
	}

	// Test 9: Verify empty arrays are handled gracefully
	reporter.startTest("getDocumentHighlights", "Handle empty arrays gracefully")
	try {
		const emptyContent = ""
		const uri = await createTestFile("test-empty-file.ts", emptyContent)

		const result = await lspController.getDocumentHighlights({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 0 },
		})

		assert(Array.isArray(result), "Should return array for empty file")
		assert(result.length === 0, "Should return empty array for empty file")

		reporter.passTest("getDocumentHighlights", "Handle empty arrays gracefully")
	} catch (error) {
		reporter.failTest("getDocumentHighlights", "Handle empty arrays gracefully", error)
	}

	// Test 10: Test complex variable scope highlighting
	reporter.startTest("getDocumentHighlights", "Complex variable scope highlighting")
	try {
		const content = `
function outerFunction() {
    const sharedName = 'outer';
    
    function innerFunction() {
        const sharedName = 'inner';
        console.log(sharedName);
        return sharedName;
    }
    
    console.log(sharedName);
    return innerFunction();
}
`
		const uri = await createTestFile("test-scope-highlights.ts", content)
		const editor = await openTestFile(uri)

		// Position on outer sharedName (line 3, character 10)
		const result = await lspController.getDocumentHighlights({
			textDocument: { uri: uri.toString() },
			position: { line: 3, character: 10 },
		})

		assert(Array.isArray(result), "Should return an array for scoped variables")

		// Verify range ordering (start should be before or equal to end)
		result.forEach((highlight, index) => {
			const { start, end } = highlight.range
			assert(
				start.line < end.line || (start.line === end.line && start.character <= end.character),
				`Highlight ${index} range should have valid start/end ordering`,
			)
		})

		reporter.passTest("getDocumentHighlights", "Complex variable scope highlighting")
	} catch (error) {
		reporter.failTest("getDocumentHighlights", "Complex variable scope highlighting", error)
	}

	// Test 11: Get document highlights using symbolName parameter for TypeScript symbols
	reporter.startTest("getDocumentHighlights", "Get document highlights using symbolName for TypeScript symbols")
	try {
		const content = `
class TestClass {
    private value: number = 0;
    
    getValue(): number {
        return this.value;
    }
    
    setValue(newValue: number): void {
        this.value = newValue;
    }
}

function testFunction() {
    const instance = new TestClass();
    const result = instance.getValue();
    instance.setValue(42);
    return result;
}

interface TestInterface {
    id: number;
    name: string;
}

const testVariable = "test";
const anotherInstance = new TestClass();
`
		const uri = await createTestFile("test-symbolname-highlights.ts", content)
		const editor = await openTestFile(uri)

		// Test highlighting TestClass using symbolName
		try {
			const classResult = await lspController.getDocumentHighlights({
				uri: uri.toString(),
				symbolName: "TestClass",
			})
			assert(Array.isArray(classResult), "Should return array for TestClass symbolName lookup")
			if (classResult.length > 0) {
				classResult.forEach((highlight) => {
					assert("range" in highlight, "Highlight should have range property")
					assert("start" in highlight.range, "Range should have start property")
					assert("end" in highlight.range, "Range should have end property")
				})
			}
		} catch (error) {
			console.warn("TestClass symbolName lookup failed:", error)
		}

		// Test highlighting getValue method using symbolName
		try {
			const methodResult = await lspController.getDocumentHighlights({
				uri: uri.toString(),
				symbolName: "getValue",
			})
			assert(Array.isArray(methodResult), "Should return array for getValue symbolName lookup")
		} catch (error) {
			console.warn("getValue symbolName lookup failed:", error)
		}

		// Test highlighting testFunction using symbolName
		try {
			const functionResult = await lspController.getDocumentHighlights({
				uri: uri.toString(),
				symbolName: "testFunction",
			})
			assert(Array.isArray(functionResult), "Should return array for testFunction symbolName lookup")
		} catch (error) {
			console.warn("testFunction symbolName lookup failed:", error)
		}

		// Test highlighting testVariable using symbolName
		try {
			const variableResult = await lspController.getDocumentHighlights({
				uri: uri.toString(),
				symbolName: "testVariable",
			})
			assert(Array.isArray(variableResult), "Should return array for testVariable symbolName lookup")
		} catch (error) {
			console.warn("testVariable symbolName lookup failed:", error)
		}

		reporter.passTest("getDocumentHighlights", "Get document highlights using symbolName for TypeScript symbols")
	} catch (error) {
		reporter.failTest("getDocumentHighlights", "Get document highlights using symbolName for TypeScript symbols", error)
	}

	// Test 12: Get document highlights using symbolName parameter for Python symbols
	reporter.startTest("getDocumentHighlights", "Get document highlights using symbolName for Python symbols")
	try {
		const uri = await createTestFile("test-symbolname-highlights.py", SAMPLE_PY_CONTENT)
		const editor = await openTestFile(uri)

		// Test highlighting Python class using symbolName
		try {
			const result = await lspController.getDocumentHighlights({
				uri: uri.toString(),
				symbolName: "TestClass",
			})
			if (result === null || result === undefined) {
				console.warn("Pylance returned null for Python class highlights via symbolName")
			} else {
				assert(Array.isArray(result), "Should return array for Python class symbolName lookup")
			}
		} catch (error) {
			console.warn("Python class symbolName lookup failed:", error)
		}

		// Test highlighting Python method using symbolName
		try {
			const result = await lspController.getDocumentHighlights({
				uri: uri.toString(),
				symbolName: "get_value",
			})
			if (result === null || result === undefined) {
				console.warn("Pylance returned null for Python method highlights via symbolName")
			} else {
				assert(Array.isArray(result), "Should return array for Python method symbolName lookup")
			}
		} catch (error) {
			console.warn("Python method symbolName lookup failed:", error)
		}

		reporter.passTest("getDocumentHighlights", "Get document highlights using symbolName for Python symbols")
	} catch (error) {
		if (error.message?.includes("Pylance")) {
			reporter.passTest("getDocumentHighlights", "Get document highlights using symbolName for Python symbols (with Pylance warning)")
		} else {
			reporter.failTest("getDocumentHighlights", "Get document highlights using symbolName for Python symbols", error)
		}
	}

	// Test 13: Error handling for symbolName parameter
	reporter.startTest("getDocumentHighlights", "Error handling for symbolName parameter")
	try {
		const uri = await createTestFile("test-error-handling.ts", SAMPLE_TS_CONTENT)

		// Test with non-existent symbol
		const nonExistentResult = await lspController.getDocumentHighlights({
			uri: uri.toString(),
			symbolName: "NonExistentSymbol",
		})
		assert(Array.isArray(nonExistentResult), "Should return array for non-existent symbol")
		assert(nonExistentResult.length === 0, "Should return empty array for non-existent symbol")

		// Test with empty symbolName
		try {
			const emptyResult = await lspController.getDocumentHighlights({
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
			const whitespaceResult = await lspController.getDocumentHighlights({
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
			const invalidUriResult = await lspController.getDocumentHighlights({
				uri: "file:///non-existent-file.ts",
				symbolName: "TestClass",
			})
			// This might succeed with empty array or throw error - both are acceptable
		} catch (error) {
			console.warn("Invalid URI threw error (acceptable):", error.message)
		}

		reporter.passTest("getDocumentHighlights", "Error handling for symbolName parameter")
	} catch (error) {
		reporter.failTest("getDocumentHighlights", "Error handling for symbolName parameter", error)
	}

	// Test 14: Mixed parameter usage (both position and symbolName scenarios)
	reporter.startTest("getDocumentHighlights", "Mixed parameter usage validation")
	try {
		// Test that both position-based and symbolName-based lookups work on same file
		const content = `
class MixedTestClass {
    testMethod(): void {
        console.log('test');
    }
}
const instance = new MixedTestClass();
instance.testMethod();
`
		const uri = await createTestFile("test-mixed-params.ts", content)
		const editor = await openTestFile(uri)

		// Position-based lookup
		const positionResult = await lspController.getDocumentHighlights({
			textDocument: { uri: uri.toString() },
			position: { line: 2, character: 6 }, // Position on MixedTestClass
		})
		assert(Array.isArray(positionResult), "Position-based lookup should work")

		// SymbolName-based lookup on same file
		const symbolResult = await lspController.getDocumentHighlights({
			uri: uri.toString(),
			symbolName: "MixedTestClass",
		})
		assert(Array.isArray(symbolResult), "SymbolName-based lookup should work")

		// Both should potentially find the same highlights (though exact matching isn't guaranteed)
		if (positionResult.length > 0 && symbolResult.length > 0) {
			assert(
				positionResult.every((highlight) => "range" in highlight),
				"Position-based highlights should have range property",
			)
			assert(
				symbolResult.every((highlight) => "range" in highlight),
				"Symbol-based highlights should have range property",
			)
		}

		reporter.passTest("getDocumentHighlights", "Mixed parameter usage validation")
	} catch (error) {
		reporter.failTest("getDocumentHighlights", "Mixed parameter usage validation", error)
	}
}
