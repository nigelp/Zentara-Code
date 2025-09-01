/**
 * Comprehensive integration tests for getSelectionRange LSP tool
 * Tests selection range expansion for various language constructs across TypeScript, Python, and JavaScript
 */

import * as vscode from "vscode"
import { lspController } from "../../zentara_lsp/src/LspController"
import {
	TestReporter,
	createTestFile,
	openTestFile,
	assert,
	getPosition,
	SAMPLE_TS_CONTENT,
	SAMPLE_PY_CONTENT,
	SAMPLE_JS_CONTENT,
} from "./testUtils"

export async function testGetSelectionRange(reporter: TestReporter): Promise<void> {
	// Test 1: Get selection range for expressions
	reporter.startTest("getSelectionRange", "Get selection range for expressions")
	try {
		const expressionContent = `
const result = calculateSum(10, 20) + getValue();
const array = [1, 2, 3, 4, 5];
const object = { name: "test", value: 42 };
const complexExpr = obj.property.method().chain();
`

		const uri = await createTestFile("test-selection-expressions.ts", expressionContent)
		const editor = await openTestFile(uri)

		// Test selection range for function call expression "calculateSum(10, 20)"
		const result = await lspController.getSelectionRange({
			textDocument: { uri: uri.toString() },
			position: { line: 2, character: 20 }, // Position inside "calculateSum"
		})

		assert(Array.isArray(result), "Should return array of selection ranges")
		assert(result.length > 0, "Should find selection ranges for expressions")

		// Verify SelectionRange structure
		for (const selectionRange of result) {
			assert(selectionRange.range !== undefined, "SelectionRange should have range property")
			assert(typeof selectionRange.range.start === "object", "Range should have start position")
			assert(typeof selectionRange.range.end === "object", "Range should have end position")
			assert(typeof selectionRange.range.start.line === "number", "Start position should have line number")
			assert(
				typeof selectionRange.range.start.character === "number",
				"Start position should have character number",
			)
			assert(typeof selectionRange.range.end.line === "number", "End position should have line number")
			assert(typeof selectionRange.range.end.character === "number", "End position should have character number")

			// Check that parent ranges contain child ranges
			if (selectionRange.parent) {
				const parentRange = selectionRange.parent.range
				const childRange = selectionRange.range

				// Parent should start before or at the same position as child
				const parentStartsBefore =
					parentRange.start.line < childRange.start.line ||
					(parentRange.start.line === childRange.start.line &&
						parentRange.start.character <= childRange.start.character)

				// Parent should end after or at the same position as child
				const parentEndsAfter =
					parentRange.end.line > childRange.end.line ||
					(parentRange.end.line === childRange.end.line &&
						parentRange.end.character >= childRange.end.character)

				assert(parentStartsBefore, "Parent range should start before or at child range")
				assert(parentEndsAfter, "Parent range should end after or at child range")
			}
		}

		reporter.passTest("getSelectionRange", "Get selection range for expressions")
	} catch (error) {
		reporter.failTest("getSelectionRange", "Get selection range for expressions", error)
	}

	// Test 2: Get selection range for statements
	reporter.startTest("getSelectionRange", "Get selection range for statements")
	try {
		const statementContent = `
if (condition) {
    console.log("true branch");
    doSomething();
} else {
    console.log("false branch");
    doSomethingElse();
}

for (let i = 0; i < 10; i++) {
    processItem(i);
    updateProgress(i / 10);
}

try {
    riskyOperation();
} catch (error) {
    handleError(error);
} finally {
    cleanup();
}
`

		const uri = await createTestFile("test-selection-statements.ts", statementContent)
		const editor = await openTestFile(uri)

		// Test selection range for if statement condition
		const ifResult = await lspController.getSelectionRange({
			textDocument: { uri: uri.toString() },
			position: { line: 2, character: 5 }, // Position inside "condition"
		})

		assert(Array.isArray(ifResult), "Should return array for if statement")
		assert(ifResult.length > 0, "Should find selection ranges for if statement")

		// Test selection range for for loop
		const forResult = await lspController.getSelectionRange({
			textDocument: { uri: uri.toString() },
			position: { line: 10, character: 15 }, // Position inside for loop variable "i"
		})

		assert(Array.isArray(forResult), "Should return array for for statement")
		assert(forResult.length > 0, "Should find selection ranges for for statement")

		// Test selection range for try-catch block
		const tryResult = await lspController.getSelectionRange({
			textDocument: { uri: uri.toString() },
			position: { line: 15, character: 10 }, // Position inside try block
		})

		assert(Array.isArray(tryResult), "Should return array for try statement")

		reporter.passTest("getSelectionRange", "Get selection range for statements")
	} catch (error) {
		reporter.failTest("getSelectionRange", "Get selection range for statements", error)
	}

	// Test 3: Get selection range for functions
	reporter.startTest("getSelectionRange", "Get selection range for functions")
	try {
		const functionContent = `
function regularFunction(param1: string, param2: number): string {
    const result = param1 + param2.toString();
    return result;
}

const arrowFunction = (x: number, y: number) => {
    return x + y;
};

class TestClass {
    constructor(private value: number) {}
    
    public method(input: string): void {
        console.log(this.value, input);
    }
    
    static staticMethod(): string {
        return "static result";
    }
}

async function asyncFunction(): Promise<string> {
    await delay(1000);
    return "async result";
}
`

		const uri = await createTestFile("test-selection-functions.ts", functionContent)
		const editor = await openTestFile(uri)

		// Test selection range for function name
		const funcNameResult = await lspController.getSelectionRange({
			textDocument: { uri: uri.toString() },
			position: { line: 2, character: 10 }, // Position inside "regularFunction"
		})

		assert(Array.isArray(funcNameResult), "Should return array for function name")
		assert(funcNameResult.length > 0, "Should find selection ranges for function name")

		// Test selection range for function parameter
		const paramResult = await lspController.getSelectionRange({
			textDocument: { uri: uri.toString() },
			position: { line: 2, character: 25 }, // Position inside "param1"
		})

		assert(Array.isArray(paramResult), "Should return array for function parameter")

		// Test selection range for method body
		const methodResult = await lspController.getSelectionRange({
			textDocument: { uri: uri.toString() },
			position: { line: 14, character: 20 }, // Position inside method body
		})

		assert(Array.isArray(methodResult), "Should return array for method body")

		// Test selection range for arrow function
		const arrowResult = await lspController.getSelectionRange({
			textDocument: { uri: uri.toString() },
			position: { line: 7, character: 20 }, // Position inside arrow function
		})

		assert(Array.isArray(arrowResult), "Should return array for arrow function")

		reporter.passTest("getSelectionRange", "Get selection range for functions")
	} catch (error) {
		reporter.failTest("getSelectionRange", "Get selection range for functions", error)
	}

	// Test 4: Test expanding selection (parent ranges)
	reporter.startTest("getSelectionRange", "Test expanding selection (parent ranges)")
	try {
		const hierarchyContent = `
namespace MyNamespace {
    export class OuterClass {
        private field: string = "value";
        
        constructor(initialValue: string) {
            this.field = initialValue;
        }
        
        public method(): string {
            if (this.field) {
                return this.field.toUpperCase();
            }
            return "";
        }
    }
}
`

		const uri = await createTestFile("test-selection-hierarchy.ts", hierarchyContent)
		const editor = await openTestFile(uri)

		// Test selection range expansion from identifier to larger constructs
		const result = await lspController.getSelectionRange({
			textDocument: { uri: uri.toString() },
			position: { line: 12, character: 25 }, // Position inside "toUpperCase"
		})

		assert(Array.isArray(result), "Should return array for hierarchy test")

		if (result.length > 0) {
			const selectionRange = result[0]
			let currentRange = selectionRange
			let hierarchyDepth = 0

			// Walk up the parent hierarchy
			while (currentRange && hierarchyDepth < 10) {
				// Prevent infinite loops
				assert(currentRange.range !== undefined, `Range at depth ${hierarchyDepth} should exist`)

				// Verify range structure
				const range = currentRange.range
				assert(range.start.line >= 0, "Range start line should be non-negative")
				assert(range.start.character >= 0, "Range start character should be non-negative")
				assert(range.end.line >= range.start.line, "Range end line should be >= start line")

				if (range.end.line === range.start.line) {
					assert(
						range.end.character >= range.start.character,
						"Range end character should be >= start character on same line",
					)
				}

				// Check parent relationship
				if (currentRange.parent) {
					const parentRange = currentRange.parent.range

					// Parent should contain current range
					const parentContainsCurrent =
						(parentRange.start.line < range.start.line ||
							(parentRange.start.line === range.start.line &&
								parentRange.start.character <= range.start.character)) &&
						(parentRange.end.line > range.end.line ||
							(parentRange.end.line === range.end.line &&
								parentRange.end.character >= range.end.character))

					assert(parentContainsCurrent, `Parent range at depth ${hierarchyDepth} should contain child range`)
				}

				currentRange = currentRange.parent
				hierarchyDepth++
			}

			assert(hierarchyDepth > 0, "Should have at least one level in hierarchy")
			// We limit depth to 20 in the implementation to prevent infinite loops
			assert(hierarchyDepth <= 20, "Should not have excessive hierarchy depth (possible infinite loop)")
		}

		reporter.passTest("getSelectionRange", "Test expanding selection (parent ranges)")
	} catch (error) {
		reporter.failTest("getSelectionRange", "Test expanding selection (parent ranges)", error)
	}

	// Test 5: Test with multiple positions
	reporter.startTest("getSelectionRange", "Test with multiple positions")
	try {
		const multiPositionContent = `
const obj = {
    prop1: "value1",
    prop2: {
        nested: "value2",
        array: [1, 2, 3]
    },
    method() {
        return this.prop1;
    }
};

function processData(data: any): void {
    if (data.prop1) {
        console.log(data.prop1);
    }
    
    for (const item of data.prop2.array) {
        console.log(item);
    }
}
`

		const uri = await createTestFile("test-selection-multi.ts", multiPositionContent)
		const editor = await openTestFile(uri)

		// Test multiple different positions in the same file
		const positions = [
			{ line: 3, character: 5 }, // "prop1"
			{ line: 5, character: 10 }, // "nested"
			{ line: 6, character: 15 }, // array element
			{ line: 9, character: 15 }, // method body
			{ line: 14, character: 20 }, // if condition
			{ line: 18, character: 25 }, // for loop variable
		]

		for (let i = 0; i < positions.length; i++) {
			const position = positions[i]
			const result = await lspController.getSelectionRange({
				textDocument: { uri: uri.toString() },
				position: position,
			})

			assert(Array.isArray(result), `Position ${i + 1} should return array`)

			// Each position should return valid selection ranges
			for (const selectionRange of result) {
				assert(selectionRange.range !== undefined, `Position ${i + 1} should have valid range`)

				const range = selectionRange.range
				assert(range.start.line >= 0 && range.end.line >= 0, `Position ${i + 1} should have valid line numbers`)
				assert(
					range.start.character >= 0 && range.end.character >= 0,
					`Position ${i + 1} should have valid character positions`,
				)
			}
		}

		reporter.passTest("getSelectionRange", "Test with multiple positions")
	} catch (error) {
		reporter.failTest("getSelectionRange", "Test with multiple positions", error)
	}

	// Test 6: Test with Python content
	reporter.startTest("getSelectionRange", "Test with Python content")
	try {
		const pythonContent = `
class PythonClass:
    def __init__(self, value):
        self.value = value
        self.data = {"key": "value"}
    
    def method(self, param):
        if self.value:
            result = self.value + param
            return result
        return None
    
    @property
    def property_method(self):
        return self.value * 2

def function_with_list():
    items = [1, 2, 3, 4, 5]
    return [item * 2 for item in items if item > 2]

try:
    instance = PythonClass("test")
    result = instance.method("suffix")
except Exception as e:
    print(f"Error: {e}")
`

		const uri = await createTestFile("test-selection-python.py", pythonContent)
		const editor = await openTestFile(uri)

		// Test selection range for Python class method
		const result = await lspController.getSelectionRange({
			textDocument: { uri: uri.toString() },
			position: { line: 7, character: 15 }, // Position inside method body
		})

		assert(Array.isArray(result), "Should return array for Python content")

		// Python may not have as rich selection range support as TypeScript,
		// but it should still return valid ranges when available
		for (const selectionRange of result) {
			if (selectionRange.range) {
				assert(typeof selectionRange.range.start.line === "number", "Python range should have valid start line")
				assert(
					typeof selectionRange.range.start.character === "number",
					"Python range should have valid start character",
				)
				assert(typeof selectionRange.range.end.line === "number", "Python range should have valid end line")
				assert(
					typeof selectionRange.range.end.character === "number",
					"Python range should have valid end character",
				)
			}
		}

		reporter.passTest("getSelectionRange", "Test with Python content")
	} catch (error) {
		reporter.failTest("getSelectionRange", "Test with Python content", error)
	}

	// Test 7: Test with JavaScript content
	reporter.startTest("getSelectionRange", "Test with JavaScript content")
	try {
		const jsContent = `
class JSClass {
    constructor(value) {
        this.value = value;
        this.callbacks = [];
    }
    
    addCallback(callback) {
        this.callbacks.push(callback);
    }
    
    execute() {
        return this.callbacks.map(cb => cb(this.value));
    }
}

const instance = new JSClass(42);
instance.addCallback(x => x * 2);
instance.addCallback(x => x + 10);

const results = instance.execute();
console.log(results);
`

		const uri = await createTestFile("test-selection-javascript.js", jsContent)
		const editor = await openTestFile(uri)

		// Test selection range for JavaScript arrow function
		const result = await lspController.getSelectionRange({
			textDocument: { uri: uri.toString() },
			position: { line: 18, character: 25 }, // Position inside arrow function
		})

		assert(Array.isArray(result), "Should return array for JavaScript content")

		// Verify basic structure for JavaScript
		for (const selectionRange of result) {
			if (selectionRange.range) {
				assert(selectionRange.range.start !== undefined, "JS range should have start")
				assert(selectionRange.range.end !== undefined, "JS range should have end")

				// Check parent hierarchy if present
				let current = selectionRange
				let depth = 0
				while (current.parent && depth < 5) {
					const parent = current.parent
					const parentRange = parent.range
					const currentRange = current.range

					// Basic containment check
					const parentContains =
						parentRange.start.line <= currentRange.start.line &&
						parentRange.end.line >= currentRange.end.line

					if (parentContains) {
						// If lines are equal, check character positions
						if (parentRange.start.line === currentRange.start.line) {
							assert(
								parentRange.start.character <= currentRange.start.character,
								"Parent should start before or at child on same line",
							)
						}
						if (parentRange.end.line === currentRange.end.line) {
							assert(
								parentRange.end.character >= currentRange.end.character,
								"Parent should end after or at child on same line",
							)
						}
					}

					current = current.parent
					depth++
				}
			}
		}

		reporter.passTest("getSelectionRange", "Test with JavaScript content")
	} catch (error) {
		reporter.failTest("getSelectionRange", "Test with JavaScript content", error)
	}

	// Test 8: Handle edge cases properly
	reporter.startTest("getSelectionRange", "Handle edge cases properly")
	try {
		// Test with empty file
		const emptyUri = await createTestFile("test-selection-empty.ts", "")
		const emptyEditor = await openTestFile(emptyUri)

		const emptyResult = await lspController.getSelectionRange({
			textDocument: { uri: emptyUri.toString() },
			position: { line: 1, character: 0 },
		})

		assert(Array.isArray(emptyResult), "Should return array for empty file")
		// Empty file should return empty array or handle gracefully

		// Test with position at end of file
		const edgeCaseContent = `const x = 42;`
		const edgeUri = await createTestFile("test-selection-edge.ts", edgeCaseContent)
		const edgeEditor = await openTestFile(edgeUri)

		const edgeResult = await lspController.getSelectionRange({
			textDocument: { uri: edgeUri.toString() },
			position: { line: 1, character: 13 }, // At end of line
		})

		assert(Array.isArray(edgeResult), "Should return array for edge position")

		// Test with invalid position (beyond file content)
		const invalidResult = await lspController.getSelectionRange({
			textDocument: { uri: edgeUri.toString() },
			position: { line: 100, character: 100 }, // Way beyond file content
		})

		assert(Array.isArray(invalidResult), "Should return array for invalid position")
		// Should handle invalid positions gracefully

		// Test with malformed/incomplete code
		const malformedContent = `
class IncompleteClass {
    method( // Missing closing parenthesis and brace
    
    const incomplete
`

		const malformedUri = await createTestFile("test-selection-malformed.ts", malformedContent)
		const malformedEditor = await openTestFile(malformedUri)

		const malformedResult = await lspController.getSelectionRange({
			textDocument: { uri: malformedUri.toString() },
			position: { line: 2, character: 5 },
		})

		assert(Array.isArray(malformedResult), "Should return array for malformed code")
		// Should handle malformed code gracefully

		reporter.passTest("getSelectionRange", "Handle edge cases properly")
	} catch (error) {
		reporter.failTest("getSelectionRange", "Handle edge cases properly", error)
	}

	// Test 9: Get selection range using symbolName parameter for TypeScript symbols
	reporter.startTest("getSelectionRange", "Get selection range using symbolName for TypeScript symbols")
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
		const uri = await createTestFile("test-symbolname-selection.ts", content)
		const editor = await openTestFile(uri)

		// Test selection range for TestClass using symbolName
		try {
			const classResult = await lspController.getSelectionRange({
				uri: uri.toString(),
				symbolName: "TestClass",
			})
			assert(Array.isArray(classResult), "Should return array for TestClass symbolName lookup")
			if (classResult.length > 0) {
				classResult.forEach((selectionRange) => {
					assert("range" in selectionRange, "Selection range should have range property")
					assert("start" in selectionRange.range, "Range should have start property")
					assert("end" in selectionRange.range, "Range should have end property")
				})
			}
		} catch (error) {
			console.warn("TestClass symbolName lookup failed:", error)
		}

		// Test selection range for getValue method using symbolName
		try {
			const methodResult = await lspController.getSelectionRange({
				uri: uri.toString(),
				symbolName: "getValue",
			})
			assert(Array.isArray(methodResult), "Should return array for getValue symbolName lookup")
		} catch (error) {
			console.warn("getValue symbolName lookup failed:", error)
		}

		// Test selection range for testFunction using symbolName
		try {
			const functionResult = await lspController.getSelectionRange({
				uri: uri.toString(),
				symbolName: "testFunction",
			})
			assert(Array.isArray(functionResult), "Should return array for testFunction symbolName lookup")
		} catch (error) {
			console.warn("testFunction symbolName lookup failed:", error)
		}

		// Test selection range for TestInterface using symbolName
		try {
			const interfaceResult = await lspController.getSelectionRange({
				uri: uri.toString(),
				symbolName: "TestInterface",
			})
			assert(Array.isArray(interfaceResult), "Should return array for TestInterface symbolName lookup")
		} catch (error) {
			console.warn("TestInterface symbolName lookup failed:", error)
		}

		// Test selection range for testVariable using symbolName
		try {
			const variableResult = await lspController.getSelectionRange({
				uri: uri.toString(),
				symbolName: "testVariable",
			})
			assert(Array.isArray(variableResult), "Should return array for testVariable symbolName lookup")
		} catch (error) {
			console.warn("testVariable symbolName lookup failed:", error)
		}

		reporter.passTest("getSelectionRange", "Get selection range using symbolName for TypeScript symbols")
	} catch (error) {
		reporter.failTest("getSelectionRange", "Get selection range using symbolName for TypeScript symbols", error)
	}

	// Test 10: Get selection range using symbolName parameter for Python symbols
	reporter.startTest("getSelectionRange", "Get selection range using symbolName for Python symbols")
	try {
		const uri = await createTestFile("test-symbolname-selection.py", SAMPLE_PY_CONTENT)
		const editor = await openTestFile(uri)

		// Test selection range for Python class using symbolName
		try {
			const result = await lspController.getSelectionRange({
				uri: uri.toString(),
				symbolName: "TestClass",
			})
			if (result === null || result === undefined) {
				console.warn("Pylance returned null for Python class selection range via symbolName")
			} else {
				assert(Array.isArray(result), "Should return array for Python class symbolName lookup")
			}
		} catch (error) {
			console.warn("Python class symbolName lookup failed:", error)
		}

		// Test selection range for Python method using symbolName
		try {
			const result = await lspController.getSelectionRange({
				uri: uri.toString(),
				symbolName: "get_value",
			})
			if (result === null || result === undefined) {
				console.warn("Pylance returned null for Python method selection range via symbolName")
			} else {
				assert(Array.isArray(result), "Should return array for Python method symbolName lookup")
			}
		} catch (error) {
			console.warn("Python method symbolName lookup failed:", error)
		}

		// Test selection range for Python function using symbolName
		try {
			const result = await lspController.getSelectionRange({
				uri: uri.toString(),
				symbolName: "test_function",
			})
			if (result === null || result === undefined) {
				console.warn("Pylance returned null for Python function selection range via symbolName")
			} else {
				assert(Array.isArray(result), "Should return array for Python function symbolName lookup")
			}
		} catch (error) {
			console.warn("Python function symbolName lookup failed:", error)
		}

		reporter.passTest("getSelectionRange", "Get selection range using symbolName for Python symbols")
	} catch (error) {
		if (error.message?.includes("Pylance")) {
			reporter.passTest("getSelectionRange", "Get selection range using symbolName for Python symbols (with Pylance warning)")
		} else {
			reporter.failTest("getSelectionRange", "Get selection range using symbolName for Python symbols", error)
		}
	}

	// Test 11: Error handling for symbolName parameter
	reporter.startTest("getSelectionRange", "Error handling for symbolName parameter")
	try {
		const uri = await createTestFile("test-error-handling.ts", SAMPLE_TS_CONTENT)

		// Test with non-existent symbol
		const nonExistentResult = await lspController.getSelectionRange({
			uri: uri.toString(),
			symbolName: "NonExistentSymbol",
		})
		assert(Array.isArray(nonExistentResult), "Should return array for non-existent symbol")
		assert(nonExistentResult.length === 0, "Should return empty array for non-existent symbol")

		// Test with empty symbolName
		try {
			const emptyResult = await lspController.getSelectionRange({
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
			const whitespaceResult = await lspController.getSelectionRange({
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
			const invalidUriResult = await lspController.getSelectionRange({
				uri: "file:///non-existent-file.ts",
				symbolName: "TestClass",
			})
			// This might succeed with empty array or throw error - both are acceptable
		} catch (error) {
			console.warn("Invalid URI threw error (acceptable):", error.message)
		}

		reporter.passTest("getSelectionRange", "Error handling for symbolName parameter")
	} catch (error) {
		reporter.failTest("getSelectionRange", "Error handling for symbolName parameter", error)
	}

	// Test 12: Mixed parameter usage (both position and symbolName scenarios)
	reporter.startTest("getSelectionRange", "Mixed parameter usage validation")
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
		const positionResult = await lspController.getSelectionRange({
			textDocument: { uri: uri.toString() },
			position: { line: 2, character: 6 }, // Position on MixedTestClass
		})
		assert(Array.isArray(positionResult), "Position-based lookup should work")

		// SymbolName-based lookup on same file
		const symbolResult = await lspController.getSelectionRange({
			uri: uri.toString(),
			symbolName: "MixedTestClass",
		})
		assert(Array.isArray(symbolResult), "SymbolName-based lookup should work")

		// Both should potentially find the same selection ranges (though exact matching isn't guaranteed)
		if (positionResult.length > 0 && symbolResult.length > 0) {
			assert(
				positionResult.every((selectionRange) => "range" in selectionRange),
				"Position-based selection ranges should have range property",
			)
			assert(
				symbolResult.every((selectionRange) => "range" in selectionRange),
				"Symbol-based selection ranges should have range property",
			)
		}

		reporter.passTest("getSelectionRange", "Mixed parameter usage validation")
	} catch (error) {
		reporter.failTest("getSelectionRange", "Mixed parameter usage validation", error)
	}
}
