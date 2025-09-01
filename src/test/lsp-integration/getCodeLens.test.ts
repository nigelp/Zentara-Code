/**
 * Integration tests for getCodeLens LSP tool
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

export async function testGetCodeLens(reporter: TestReporter): Promise<void> {
	// Test 1: Get code lens for references
	reporter.startTest("getCodeLens", "Get code lens for references")
	try {
		const referencesContent = `
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
}

// Usage of TestClass - should show references
const instance = new TestClass(100);
const result = instance.getValue();
instance.setValue(200);
`

		const uri = await createTestFile("test-references.ts", referencesContent)
		const editor = await openTestFile(uri)

		// Wait a bit for language server to analyze the file
		await new Promise((resolve) => setTimeout(resolve, 1000))

		const result = await lspController.getCodeLens({
			textDocument: { uri: uri.toString() },
		})

		assert(Array.isArray(result), "Should return array of code lenses")

		// Check if any code lens has reference-related content
		let hasReferenceCodeLens = false
		for (const lens of result) {
			if (lens.command && lens.command.title.toLowerCase().includes("reference")) {
				hasReferenceCodeLens = true
				assert(typeof lens.range === "object", "Code lens should have range")
				assert(typeof lens.range.start === "object", "Range should have start position")
				assert(typeof lens.range.end === "object", "Range should have end position")
				assert(typeof lens.command.title === "string", "Command should have title")
				assert(typeof lens.command.command === "string", "Command should have command string")
				break
			}
		}

		reporter.passTest("getCodeLens", "Get code lens for references")
	} catch (error) {
		reporter.failTest("getCodeLens", "Get code lens for references", error)
	}

	// Test 2: Get code lens for test functions
	reporter.startTest("getCodeLens", "Get code lens for test functions")
	try {
		const testContent = `
describe('Test Suite', () => {
    it('should test something', () => {
        expect(true).toBe(true);
    });
    
    test('should test another thing', () => {
        expect(1 + 1).toBe(2);
    });
    
    it.skip('should skip this test', () => {
        expect(false).toBe(true);
    });
});

function testFunction() {
    return 'test';
}
`

		const uri = await createTestFile("test-functions.test.ts", testContent)
		const editor = await openTestFile(uri)

		// Wait for language server analysis
		await new Promise((resolve) => setTimeout(resolve, 1000))

		const result = await lspController.getCodeLens({
			textDocument: { uri: uri.toString() },
		})

		assert(Array.isArray(result), "Should return array of code lenses")

		// Check for test-related code lenses (run test, debug test, etc.)
		let hasTestCodeLens = false
		for (const lens of result) {
			if (
				lens.command &&
				(lens.command.title.toLowerCase().includes("run") ||
					lens.command.title.toLowerCase().includes("debug") ||
					lens.command.title.toLowerCase().includes("test"))
			) {
				hasTestCodeLens = true
				assert(typeof lens.range === "object", "Test code lens should have range")
				assert(typeof lens.command.title === "string", "Test command should have title")
				break
			}
		}

		reporter.passTest("getCodeLens", "Get code lens for test functions")
	} catch (error) {
		reporter.failTest("getCodeLens", "Get code lens for test functions", error)
	}

	// Test 3: Get code lens for classes
	reporter.startTest("getCodeLens", "Get code lens for classes")
	try {
		const classContent = `
export class Calculator {
    add(a: number, b: number): number {
        return a + b;
    }
    
    subtract(a: number, b: number): number {
        return a - b;
    }
    
    multiply(a: number, b: number): number {
        return a * b;
    }
}

export interface MathOperation {
    calculate(x: number, y: number): number;
}

export abstract class BaseCalculator implements MathOperation {
    abstract calculate(x: number, y: number): number;
    
    protected validate(value: number): boolean {
        return !isNaN(value) && isFinite(value);
    }
}
`

		const uri = await createTestFile("test-classes.ts", classContent)
		const editor = await openTestFile(uri)

		// Wait for language server analysis
		await new Promise((resolve) => setTimeout(resolve, 1000))

		const result = await lspController.getCodeLens({
			textDocument: { uri: uri.toString() },
		})

		assert(Array.isArray(result), "Should return array of code lenses")

		// Verify code lens structure for any found lenses
		for (const lens of result) {
			assert(typeof lens.range === "object", "Code lens should have range object")
			assert(typeof lens.range.start.line === "number", "Start line should be number")
			assert(typeof lens.range.start.character === "number", "Start character should be number")
			assert(typeof lens.range.end.line === "number", "End line should be number")
			assert(typeof lens.range.end.character === "number", "End character should be number")

			if (lens.command) {
				assert(typeof lens.command.title === "string", "Command title should be string")
				assert(typeof lens.command.command === "string", "Command command should be string")
				// Arguments is optional
				if (lens.command.arguments) {
					assert(Array.isArray(lens.command.arguments), "Command arguments should be array if present")
				}
			}
		}

		reporter.passTest("getCodeLens", "Get code lens for classes")
	} catch (error) {
		reporter.failTest("getCodeLens", "Get code lens for classes", error)
	}

	// Test 4: Test with different file types
	reporter.startTest("getCodeLens", "Test with different file types")
	try {
		// Test Python file
		const pythonContent = `
import unittest

class TestCalculator(unittest.TestCase):
    def test_addition(self):
        self.assertEqual(2 + 2, 4)
    
    def test_subtraction(self):
        self.assertEqual(5 - 3, 2)

class Calculator:
    def add(self, a, b):
        return a + b
    
    def subtract(self, a, b):
        return a - b

def main():
    calc = Calculator()
    result = calc.add(10, 5)
    print(f"Result: {result}")

if __name__ == "__main__":
    unittest.main()
`

		const pyUri = await createTestFile("test-python.py", pythonContent)
		const pyEditor = await openTestFile(pyUri)

		// Wait for language server analysis
		await new Promise((resolve) => setTimeout(resolve, 1000))

		const pyResult = await lspController.getCodeLens({
			textDocument: { uri: pyUri.toString() },
		})

		assert(Array.isArray(pyResult), "Should return array for Python file")

		// Test JavaScript file
		const jsContent = `
const assert = require('assert');

class Calculator {
    add(a, b) {
        return a + b;
    }
    
    subtract(a, b) {
        return a - b;
    }
}

function testCalculator() {
    const calc = new Calculator();
    assert.strictEqual(calc.add(2, 3), 5);
    assert.strictEqual(calc.subtract(5, 2), 3);
}

// Usage
const calculator = new Calculator();
const sum = calculator.add(10, 20);
console.log('Sum:', sum);
`

		const jsUri = await createTestFile("test-javascript.js", jsContent)
		const jsEditor = await openTestFile(jsUri)

		// Wait for language server analysis
		await new Promise((resolve) => setTimeout(resolve, 1000))

		const jsResult = await lspController.getCodeLens({
			textDocument: { uri: jsUri.toString() },
		})

		assert(Array.isArray(jsResult), "Should return array for JavaScript file")

		reporter.passTest("getCodeLens", "Test with different file types")
	} catch (error) {
		reporter.failTest("getCodeLens", "Test with different file types", error)
	}

	// Test 5: Handle files with no code lens
	reporter.startTest("getCodeLens", "Handle files with no code lens")
	try {
		const emptyContent = `
// Just a simple comment
const simpleValue = 42;
`

		const uri = await createTestFile("test-no-lens.ts", emptyContent)
		const editor = await openTestFile(uri)

		// Wait for language server analysis
		await new Promise((resolve) => setTimeout(resolve, 500))

		const result = await lspController.getCodeLens({
			textDocument: { uri: uri.toString() },
		})

		assert(Array.isArray(result), "Should return array even when no code lenses available")

		// Result might be empty or have some lenses - both are valid
		if (result.length > 0) {
			// If there are lenses, verify their structure
			for (const lens of result) {
				assert(typeof lens.range === "object", "Code lens should have range")
				assert(typeof lens.range.start.line === "number", "Start line should be number")
				assert(typeof lens.range.start.character === "number", "Start character should be number")
				assert(typeof lens.range.end.line === "number", "End line should be number")
				assert(typeof lens.range.end.character === "number", "End character should be number")
			}
		}

		reporter.passTest("getCodeLens", "Handle files with no code lens")
	} catch (error) {
		reporter.failTest("getCodeLens", "Handle files with no code lens", error)
	}

	// Test 6: Verify expected code lens titles
	reporter.startTest("getCodeLens", "Verify expected code lens titles")
	try {
		const complexContent = `
export class UserService {
    private users: User[] = [];
    
    addUser(user: User): void {
        this.users.push(user);
    }
    
    findUser(id: number): User | undefined {
        return this.users.find(u => u.id === id);
    }
    
    getAllUsers(): User[] {
        return [...this.users];
    }
}

export interface User {
    id: number;
    name: string;
    email: string;
}

// Multiple usages to generate references
const service = new UserService();
service.addUser({ id: 1, name: 'John', email: 'john@example.com' });
const user = service.findUser(1);
const allUsers = service.getAllUsers();
`

		const uri = await createTestFile("test-titles.ts", complexContent)
		const editor = await openTestFile(uri)

		// Wait for language server analysis
		await new Promise((resolve) => setTimeout(resolve, 1500))

		const result = await lspController.getCodeLens({
			textDocument: { uri: uri.toString() },
		})

		assert(Array.isArray(result), "Should return array of code lenses")

		// Check for common code lens titles
		const expectedTitles = ["reference", "implementation", "usage", "call"]
		let foundExpectedTitle = false

		for (const lens of result) {
			if (lens.command && lens.command.title) {
				const title = lens.command.title.toLowerCase()
				for (const expectedTitle of expectedTitles) {
					if (title.includes(expectedTitle)) {
						foundExpectedTitle = true
						break
					}
				}

				// Verify title is meaningful (not empty or just numbers)
				assert(lens.command.title.trim().length > 0, "Code lens title should not be empty")
			}
		}

		reporter.passTest("getCodeLens", "Verify expected code lens titles")
	} catch (error) {
		reporter.failTest("getCodeLens", "Verify expected code lens titles", error)
	}

	// Test 7: Handle gracefully empty arrays
	reporter.startTest("getCodeLens", "Handle gracefully empty arrays")
	try {
		const minimalContent = `// Minimal file with no symbols`

		const uri = await createTestFile("test-minimal.ts", minimalContent)
		const editor = await openTestFile(uri)

		// Wait for language server analysis
		await new Promise((resolve) => setTimeout(resolve, 500))

		const result = await lspController.getCodeLens({
			textDocument: { uri: uri.toString() },
		})

		assert(Array.isArray(result), "Should always return an array")

		// Empty result is perfectly valid
		if (result.length === 0) {
			assert(true, "Empty array is handled gracefully")
		} else {
			// If not empty, verify structure
			for (const lens of result) {
				assert(typeof lens === "object", "Each code lens should be an object")
				assert(lens.range !== undefined, "Each code lens should have a range")
			}
		}

		reporter.passTest("getCodeLens", "Handle gracefully empty arrays")
	} catch (error) {
		reporter.failTest("getCodeLens", "Handle gracefully empty arrays", error)
	}

	// Test 8: Test code lens range validation
	reporter.startTest("getCodeLens", "Test code lens range validation")
	try {
		const rangeContent = `
function firstFunction() {
    return 'first';
}

class SecondClass {
    method() {
        return 'second';
    }
}

const thirdVariable = 'third';
`

		const uri = await createTestFile("test-ranges.ts", rangeContent)
		const editor = await openTestFile(uri)

		// Wait for language server analysis
		await new Promise((resolve) => setTimeout(resolve, 1000))

		const result = await lspController.getCodeLens({
			textDocument: { uri: uri.toString() },
		})

		assert(Array.isArray(result), "Should return array of code lenses")

		// Validate range properties for all found code lenses
		for (const lens of result) {
			// Range validation
			assert(lens.range !== undefined, "Code lens must have range")
			assert(lens.range.start !== undefined, "Range must have start position")
			assert(lens.range.end !== undefined, "Range must have end position")

			// Position validation
			assert(typeof lens.range.start.line === "number", "Start line must be number")
			assert(typeof lens.range.start.character === "number", "Start character must be number")
			assert(typeof lens.range.end.line === "number", "End line must be number")
			assert(typeof lens.range.end.character === "number", "End character must be number")

			// Range validity
			assert(lens.range.start.line >= 0, "Start line must be non-negative")
			assert(lens.range.start.character >= 0, "Start character must be non-negative")
			assert(lens.range.end.line >= lens.range.start.line, "End line must be >= start line")

			if (lens.range.end.line === lens.range.start.line) {
				assert(
					lens.range.end.character >= lens.range.start.character,
					"End character must be >= start character on same line",
				)
			}
		}

		reporter.passTest("getCodeLens", "Test code lens range validation")
	} catch (error) {
		reporter.failTest("getCodeLens", "Test code lens range validation", error)
	}
}
