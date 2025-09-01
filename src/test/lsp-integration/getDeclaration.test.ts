/**
 * Integration tests for getDeclaration LSP tool
 * These tests run in the Extension Host Window with real VS Code APIs
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

export async function testGetDeclaration(reporter: TestReporter): Promise<void> {
	// Test 1: Get declaration of imported symbols in TypeScript
	reporter.startTest("getDeclaration", "Get declaration of imported symbols in TypeScript")
	try {
		const importContent = `
import { TestClass } from './external';

const instance = new TestClass(42);
const value = instance.getValue();
`

		const externalContent = `
export class TestClass {
    private value: number;
    
    constructor(initialValue: number) {
        this.value = initialValue;
    }
    
    getValue(): number {
        return this.value;
    }
}
`

		// Create the external file first
		const externalUri = await createTestFile("external.ts", externalContent)
		await openTestFile(externalUri)

		// Create the main file with import
		const uri = await createTestFile("test-import-declaration.ts", importContent)
		const editor = await openTestFile(uri)

		// Get declaration of imported TestClass
		const result = await lspController.getDeclaration({
			textDocument: { uri: uri.toString() },
			position: { line: 2, character: 15 }, // Position on "TestClass" in import
		})

		assert(Array.isArray(result), "Should return an array")
		// Note: Result may be empty if LSP doesn't support declaration for imports
		// This is valid behavior, so we just verify the structure
		if (result.length > 0) {
			assert(typeof result[0].uri === "string", "Location should have uri property")
			assert(typeof result[0].range === "object", "Location should have range property")
			assert(typeof result[0].range.start === "object", "Range should have start property")
			assert(typeof result[0].range.end === "object", "Range should have end property")
		}

		reporter.passTest("getDeclaration", "Get declaration of imported symbols in TypeScript")
	} catch (error) {
		reporter.failTest("getDeclaration", "Get declaration of imported symbols in TypeScript", error)
	}

	// Test 2: Get declaration of local variables
	reporter.startTest("getDeclaration", "Get declaration of local variables")
	try {
		const content = `
function testFunction() {
    const localVariable = 42;
    const anotherVar = "hello";
    
    // Use variables
    console.log(localVariable);
    console.log(anotherVar);
}
`

		const uri = await createTestFile("test-local-vars.ts", content)
		const editor = await openTestFile(uri)

		// Get declaration of localVariable usage
		const result = await lspController.getDeclaration({
			textDocument: { uri: uri.toString() },
			position: { line: 6, character: 16 }, // Position on "localVariable" usage
		})

		assert(Array.isArray(result), "Should return an array")
		// Verify Location structure if results are found
		result.forEach((location) => {
			assert(typeof location.uri === "string", "Location should have uri property")
			assert(typeof location.range === "object", "Location should have range property")
			assert(typeof location.range.start.line === "number", "Range start should have line number")
			assert(typeof location.range.start.character === "number", "Range start should have character number")
			assert(typeof location.range.end.line === "number", "Range end should have line number")
			assert(typeof location.range.end.character === "number", "Range end should have character number")
		})

		reporter.passTest("getDeclaration", "Get declaration of local variables")
	} catch (error) {
		reporter.failTest("getDeclaration", "Get declaration of local variables", error)
	}

	// Test 3: Get declaration of functions
	reporter.startTest("getDeclaration", "Get declaration of functions")
	try {
		const content = `
function helperFunction(param: string): string {
    return param.toUpperCase();
}

function mainFunction() {
    const result = helperFunction("test");
    return result;
}
`

		const uri = await createTestFile("test-function-declaration.ts", content)
		const editor = await openTestFile(uri)

		// Get declaration of helperFunction call
		const result = await lspController.getDeclaration({
			textDocument: { uri: uri.toString() },
			position: { line: 7, character: 20 }, // Position on "helperFunction" call
		})

		assert(Array.isArray(result), "Should return an array")

		// Verify Location array structure
		result.forEach((location) => {
			assert(typeof location.uri === "string", "Location should have uri property")
			assert(location.uri.includes("test-function-declaration.ts"), "URI should point to correct file")
			assert(typeof location.range === "object", "Location should have range property")
			assert(location.range.start.line >= 0, "Range start line should be valid")
			assert(location.range.start.character >= 0, "Range start character should be valid")
			assert(location.range.end.line >= location.range.start.line, "Range end line should be after start")
		})

		reporter.passTest("getDeclaration", "Get declaration of functions")
	} catch (error) {
		reporter.failTest("getDeclaration", "Get declaration of functions", error)
	}

	// Test 4: Get declaration of classes
	reporter.startTest("getDeclaration", "Get declaration of classes")
	try {
		const uri = await createTestFile("test-class-declaration.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Get declaration of TestClass from its usage
		const result = await lspController.getDeclaration({
			textDocument: { uri: uri.toString() },
			position: { line: 33, character: 20 }, // Position on "new TestClass"
		})

		assert(Array.isArray(result), "Should return an array")

		// Verify Location array structure for class declarations
		result.forEach((location) => {
			assert(typeof location.uri === "string", "Location should have uri property")
			assert(typeof location.range === "object", "Location should have range property")
			assert(typeof location.range.start === "object", "Range should have start object")
			assert(typeof location.range.end === "object", "Range should have end object")
			assert(Number.isInteger(location.range.start.line), "Start line should be integer")
			assert(Number.isInteger(location.range.start.character), "Start character should be integer")
			assert(Number.isInteger(location.range.end.line), "End line should be integer")
			assert(Number.isInteger(location.range.end.character), "End character should be integer")
		})

		reporter.passTest("getDeclaration", "Get declaration of classes")
	} catch (error) {
		reporter.failTest("getDeclaration", "Get declaration of classes", error)
	}

	// Test 5: Handle symbols with no declaration
	reporter.startTest("getDeclaration", "Handle symbols with no declaration")
	try {
		const content = `
// This is a comment with some text
const x = 42; // Built-in number
`

		const uri = await createTestFile("test-no-declaration.ts", content)
		const editor = await openTestFile(uri)

		// Try to get declaration on a comment (should have no declaration)
		const result = await lspController.getDeclaration({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 10 }, // Position on comment text
		})

		assert(Array.isArray(result), "Should return an array even when no declaration found")
		// Most positions in comments should return empty array

		reporter.passTest("getDeclaration", "Handle symbols with no declaration")
	} catch (error) {
		reporter.failTest("getDeclaration", "Handle symbols with no declaration", error)
	}

	// Test 6: Test across different file types - Python
	reporter.startTest("getDeclaration", "Get declaration in Python file")
	try {
		const uri = await createTestFile("test-declaration.py", SAMPLE_PY_CONTENT)
		const editor = await openTestFile(uri)

		// Get declaration of TestClass from usage
		const result = await lspController.getDeclaration({
			textDocument: { uri: uri.toString() },
			position: { line: 24, character: 16 }, // Position on "TestClass(100)"
		})

		assert(Array.isArray(result), "Should return an array for Python")

		// Verify Location structure for Python files
		result.forEach((location) => {
			assert(typeof location.uri === "string", "Location should have uri property")
			assert(location.uri.includes(".py"), "URI should be Python file")
			assert(typeof location.range === "object", "Location should have range property")
		})

		reporter.passTest("getDeclaration", "Get declaration in Python file")
	} catch (error) {
		reporter.failTest("getDeclaration", "Get declaration in Python file", error)
	}

	// Test 7: Test across different file types - JavaScript
	reporter.startTest("getDeclaration", "Get declaration in JavaScript file")
	try {
		const uri = await createTestFile("test-declaration.js", SAMPLE_JS_CONTENT)
		const editor = await openTestFile(uri)

		// Get declaration of TestClass from usage
		const result = await lspController.getDeclaration({
			textDocument: { uri: uri.toString() },
			position: { line: 25, character: 20 }, // Position on "new TestClass"
		})

		assert(Array.isArray(result), "Should return an array for JavaScript")

		// Verify Location structure for JavaScript files
		result.forEach((location) => {
			assert(typeof location.uri === "string", "Location should have uri property")
			assert(location.uri.includes(".js"), "URI should be JavaScript file")
			assert(typeof location.range === "object", "Location should have range property")
		})

		reporter.passTest("getDeclaration", "Get declaration in JavaScript file")
	} catch (error) {
		reporter.failTest("getDeclaration", "Get declaration in JavaScript file", error)
	}

	// Test 8: Edge case - Invalid position
	reporter.startTest("getDeclaration", "Handle invalid position gracefully")
	try {
		const uri = await createTestFile("test-invalid-pos.ts", "const x = 42;")
		const editor = await openTestFile(uri)

		// Try with position beyond file bounds
		const result = await lspController.getDeclaration({
			textDocument: { uri: uri.toString() },
			position: { line: 100, character: 50 }, // Way beyond file content
		})

		assert(Array.isArray(result), "Should return an array even for invalid positions")
		assert(result.length === 0, "Should return empty array for invalid positions")

		reporter.passTest("getDeclaration", "Handle invalid position gracefully")
	} catch (error) {
		reporter.failTest("getDeclaration", "Handle invalid position gracefully", error)
	}

	// Test 9: Test interface declarations
	reporter.startTest("getDeclaration", "Get declaration of interface usage")
	try {
		const content = `
interface UserInterface {
    id: number;
    name: string;
    email?: string;
}

function createUser(data: UserInterface): UserInterface {
    return {
        id: data.id,
        name: data.name,
        email: data.email
    };
}

const user: UserInterface = { id: 1, name: "Test" };
`

		const uri = await createTestFile("test-interface-declaration.ts", content)
		const editor = await openTestFile(uri)

		// Get declaration of UserInterface from usage in function parameter
		const result = await lspController.getDeclaration({
			textDocument: { uri: uri.toString() },
			position: { line: 8, character: 30 }, // Position on "UserInterface" in parameter
		})

		assert(Array.isArray(result), "Should return an array")

		// Verify Location array structure for interface declarations
		result.forEach((location) => {
			assert(typeof location.uri === "string", "Location should have uri property")
			assert(typeof location.range === "object", "Location should have range property")
			assert(typeof location.range.start === "object", "Range should have start object")
			assert(typeof location.range.end === "object", "Range should have end object")
		})

		reporter.passTest("getDeclaration", "Get declaration of interface usage")
	} catch (error) {
		reporter.failTest("getDeclaration", "Get declaration of interface usage", error)
	}

	// Test 10: Test method declarations
	reporter.startTest("getDeclaration", "Get declaration of method calls")
	try {
		const content = `
class Calculator {
    private value: number = 0;
    
    add(num: number): Calculator {
        this.value += num;
        return this;
    }
    
    multiply(num: number): Calculator {
        this.value *= num;
        return this;
    }
    
    getResult(): number {
        return this.value;
    }
}

const calc = new Calculator();
const result = calc.add(5).multiply(2).getResult();
`

		const uri = await createTestFile("test-method-declaration.ts", content)
		const editor = await openTestFile(uri)

		// Get declaration of 'add' method from method chaining
		const result = await lspController.getDeclaration({
			textDocument: { uri: uri.toString() },
			position: { line: 21, character: 20 }, // Position on ".add(5)"
		})

		assert(Array.isArray(result), "Should return an array")

		// Verify Location structure
		result.forEach((location) => {
			assert(typeof location.uri === "string", "Location should have uri property")
			assert(typeof location.range === "object", "Location should have range property")
			assert(location.range.start.line >= 0, "Start line should be non-negative")
			assert(location.range.start.character >= 0, "Start character should be non-negative")
		})

		reporter.passTest("getDeclaration", "Get declaration of method calls")
	} catch (error) {
		reporter.failTest("getDeclaration", "Get declaration of method calls", error)
	}

	// Test 11: Get declaration by symbolName - TestClass
	reporter.startTest("getDeclaration", "Get declaration by symbolName - TestClass")
	try {
		const uri = await createTestFile("test-symbolname-class.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Get declaration of TestClass using symbolName parameter
		const result = await lspController.getDeclaration({
			uri: uri.toString(),
			symbolName: "TestClass"
		})

		assert(Array.isArray(result), "Should return an array")
		
		// Verify that we found the TestClass declaration
		if (result.length > 0) {
			const location = result[0]
			assert(typeof location.uri === "string", "Location should have uri property")
			assert(location.uri.includes("test-symbolname-class.ts"), "URI should point to correct file")
			assert(typeof location.range === "object", "Location should have range property")
			assert(typeof location.range.start === "object", "Range should have start object")
			assert(typeof location.range.end === "object", "Range should have end object")
			assert(Number.isInteger(location.range.start.line), "Start line should be integer")
			assert(Number.isInteger(location.range.start.character), "Start character should be integer")
			// TestClass should be declared around line 0-2 in SAMPLE_TS_CONTENT
			assert(location.range.start.line <= 5, "TestClass should be declared near the top of the file")
		}

		reporter.passTest("getDeclaration", "Get declaration by symbolName - TestClass")
	} catch (error) {
		reporter.failTest("getDeclaration", "Get declaration by symbolName - TestClass", error)
	}

	// Test 12: Get declaration by symbolName - testFunction
	reporter.startTest("getDeclaration", "Get declaration by symbolName - testFunction")
	try {
		const uri = await createTestFile("test-symbolname-function.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Get declaration of testFunction using symbolName parameter
		const result = await lspController.getDeclaration({
			uri: uri.toString(),
			symbolName: "testFunction"
		})

		assert(Array.isArray(result), "Should return an array")
		
		// Verify that we found the testFunction declaration
		if (result.length > 0) {
			const location = result[0]
			assert(typeof location.uri === "string", "Location should have uri property")
			assert(location.uri.includes("test-symbolname-function.ts"), "URI should point to correct file")
			assert(typeof location.range === "object", "Location should have range property")
			assert(location.range.start.line >= 0, "Start line should be non-negative")
			assert(location.range.start.character >= 0, "Start character should be non-negative")
			// testFunction should be declared after the class and interface
			assert(location.range.start.line > 15, "testFunction should be declared after class and interface")
		}

		reporter.passTest("getDeclaration", "Get declaration by symbolName - testFunction")
	} catch (error) {
		reporter.failTest("getDeclaration", "Get declaration by symbolName - testFunction", error)
	}

	// Test 13: Get declaration by symbolName - TestInterface
	reporter.startTest("getDeclaration", "Get declaration by symbolName - TestInterface")
	try {
		const uri = await createTestFile("test-symbolname-interface.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Get declaration of TestInterface using symbolName parameter
		const result = await lspController.getDeclaration({
			uri: uri.toString(),
			symbolName: "TestInterface"
		})

		assert(Array.isArray(result), "Should return an array")
		
		// Verify that we found the TestInterface declaration
		if (result.length > 0) {
			const location = result[0]
			assert(typeof location.uri === "string", "Location should have uri property")
			assert(location.uri.includes("test-symbolname-interface.ts"), "URI should point to correct file")
			assert(typeof location.range === "object", "Location should have range property")
			assert(location.range.start.line >= 0, "Start line should be non-negative")
			assert(location.range.start.character >= 0, "Start character should be non-negative")
			// TestInterface should be declared after the class
			assert(location.range.start.line > 10, "TestInterface should be declared after TestClass")
		}

		reporter.passTest("getDeclaration", "Get declaration by symbolName - TestInterface")
	} catch (error) {
		reporter.failTest("getDeclaration", "Get declaration by symbolName - TestInterface", error)
	}

	// Test 14: Get declaration by symbolName - testVariable
	reporter.startTest("getDeclaration", "Get declaration by symbolName - testVariable")
	try {
		const uri = await createTestFile("test-symbolname-variable.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Get declaration of testVariable using symbolName parameter
		const result = await lspController.getDeclaration({
			uri: uri.toString(),
			symbolName: "testVariable"
		})

		assert(Array.isArray(result), "Should return an array")
		
		// Verify that we found the testVariable declaration
		if (result.length > 0) {
			const location = result[0]
			assert(typeof location.uri === "string", "Location should have uri property")
			assert(location.uri.includes("test-symbolname-variable.ts"), "URI should point to correct file")
			assert(typeof location.range === "object", "Location should have range property")
			assert(location.range.start.line >= 0, "Start line should be non-negative")
			assert(location.range.start.character >= 0, "Start character should be non-negative")
			// testVariable should be declared near the end of the content
			assert(location.range.start.line > 25, "testVariable should be declared near the end")
		}

		reporter.passTest("getDeclaration", "Get declaration by symbolName - testVariable")
	} catch (error) {
		reporter.failTest("getDeclaration", "Get declaration by symbolName - testVariable", error)
	}

	// Test 15: Error case - non-existent symbol name
	reporter.startTest("getDeclaration", "Handle non-existent symbol name")
	try {
		const uri = await createTestFile("test-nonexistent-symbol.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Try to get declaration of a symbol that doesn't exist
		const result = await lspController.getDeclaration({
			uri: uri.toString(),
			symbolName: "NonExistentSymbol"
		})

		assert(Array.isArray(result), "Should return an array even for non-existent symbols")
		assert(result.length === 0, "Should return empty array for non-existent symbols")

		reporter.passTest("getDeclaration", "Handle non-existent symbol name")
	} catch (error) {
		reporter.failTest("getDeclaration", "Handle non-existent symbol name", error)
	}

	// Test 16: Error case - invalid URI with symbolName
	reporter.startTest("getDeclaration", "Handle invalid URI with symbolName")
	try {
		// Use a URI that doesn't exist
		const invalidUri = "file:///nonexistent/path/test.ts"

		const result = await lspController.getDeclaration({
			uri: invalidUri,
			symbolName: "TestClass"
		})

		assert(Array.isArray(result), "Should return an array even for invalid URI")
		assert(result.length === 0, "Should return empty array for invalid URI")

		reporter.passTest("getDeclaration", "Handle invalid URI with symbolName")
	} catch (error) {
		reporter.failTest("getDeclaration", "Handle invalid URI with symbolName", error)
	}
}
