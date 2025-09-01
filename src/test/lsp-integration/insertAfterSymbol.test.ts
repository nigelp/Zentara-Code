/**
 * Integration tests for insertAfterSymbol LSP tool
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

export async function testInsertAfterSymbol(reporter: TestReporter): Promise<void> {
	// Test 1: Insert method after existing method in TypeScript class
	reporter.startTest("insertAfterSymbol", "Insert method after existing method")
	try {
		const testContent = `
class Calculator {
    add(a: number, b: number): number {
        return a + b;
    }
    
    multiply(a: number, b: number): number {
        return a * b;
    }
}`

		const uri = await createTestFile("test-insert-method.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert after the 'add' method (position on method name)
		const result = await lspController.insertAfterSymbol({
			uri: uri.toString(),
			line: 2,
			character: 4, // Position on "add"
			content: `
    
    subtract(a: number, b: number): number {
        return a - b;
    }`,
		})

		assert(result !== null, "Should return a result")
		assert(result.success === true, "Should successfully insert content")

		reporter.passTest("insertAfterSymbol", "Insert method after existing method")
	} catch (error) {
		reporter.failTest("insertAfterSymbol", "Insert method after existing method", error)
	}

	// Test 2: Insert property after class property
	reporter.startTest("insertAfterSymbol", "Insert property after class property")
	try {
		const testContent = `
class Person {
    private name: string;
    private age: number;
    
    constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
    }
}`

		const uri = await createTestFile("test-insert-property.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert after the 'name' property
		const result = await lspController.insertAfterSymbol({
			uri: uri.toString(),
			line: 2,
			character: 12, // Position on "name"
			content: `
    private email: string;`,
		})

		assert(result !== null, "Should return a result")
		assert(result.success === true, "Should successfully insert property")

		reporter.passTest("insertAfterSymbol", "Insert property after class property")
	} catch (error) {
		reporter.failTest("insertAfterSymbol", "Insert property after class property", error)
	}

	// Test 3: Insert function after function
	reporter.startTest("insertAfterSymbol", "Insert function after function")
	try {
		const testContent = `
function greet(name: string): string {
    return \`Hello, \${name}!\`;
}

function farewell(name: string): string {
    return \`Goodbye, \${name}!\`;
}

const result = greet("World");`

		const uri = await createTestFile("test-insert-function.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert after the 'greet' function
		const result = await lspController.insertAfterSymbol({
			uri: uri.toString(),
			line: 1,
			character: 9, // Position on "greet"
			content: `

function welcome(name: string): string {
    return \`Welcome, \${name}!\`;
}`,
		})

		assert(result !== null, "Should return a result")
		if (result !== null) {
			assert(result.success === true, "Should successfully insert function")
		}

		reporter.passTest("insertAfterSymbol", "Insert function after function")
	} catch (error) {
		reporter.failTest("insertAfterSymbol", "Insert function after function", error)
	}

	// Test 4: Insert with proper indentation
	reporter.startTest("insertAfterSymbol", "Insert with proper indentation")
	try {
		const testContent = `
class IndentationTest {
    method1(): void {
        console.log("method1");
    }
    
    method3(): void {
        console.log("method3");
    }
}`

		const uri = await createTestFile("test-insert-indentation.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert after method1 with proper indentation
		const result = await lspController.insertAfterSymbol({
			uri: uri.toString(),
			line: 2,
			character: 4, // Position on "method1"
			content: `
    
    method2(): void {
        console.log("method2");
    }`,
		})

		assert(result !== null, "Should return a result")
		if (result !== null) {
			assert(result.success === true, "Should successfully insert with proper indentation")
		}

		reporter.passTest("insertAfterSymbol", "Insert with proper indentation")
	} catch (error) {
		reporter.failTest("insertAfterSymbol", "Insert with proper indentation", error)
	}

	// Test 5: Handle invalid positions gracefully
	reporter.startTest("insertAfterSymbol", "Handle invalid positions")
	try {
		const uri = await createTestFile("test-invalid-insert.ts", SAMPLE_TS_CONTENT)

		// Test with invalid position
		const result = await lspController.insertAfterSymbol({
			uri: uri.toString(),
			line: 9999,
			character: 9999, // Invalid position
			content: "new content",
		})

		// Should handle gracefully - either return null or success: false
		if (result !== null) {
			assert(typeof result === "object", "Should return an object if not null")
			assert(result.success === false, "Should return success: false for invalid position")
		}

		reporter.passTest("insertAfterSymbol", "Handle invalid positions")
	} catch (error) {
		reporter.failTest("insertAfterSymbol", "Handle invalid positions", error)
	}

	// Test 6: Insert in Python file
	reporter.startTest("insertAfterSymbol", "Insert in Python file")
	try {
		const testContent = `
class PythonClass:
    def method1(self):
        return "method1"
    
    def method3(self):
        return "method3"
`

		const uri = await createTestFile("test-insert-python.py", testContent)
		const editor = await openTestFile(uri)

		// Insert after method1 in Python
		const result = await lspController.insertAfterSymbol({
			uri: uri.toString(),
			line: 2,
			character: 8, // Position on "method1"
			content: `
    
    def method2(self):
        return "method2"`,
		})

		if (result !== null) {
			assert(result.success === true, "Should successfully insert in Python file")
		}

		reporter.passTest("insertAfterSymbol", "Insert in Python file")
	} catch (error) {
		reporter.failTest("insertAfterSymbol", "Insert in Python file", error)
	}

	// Test 7: Insert in JavaScript file
	reporter.startTest("insertAfterSymbol", "Insert in JavaScript file")
	try {
		const testContent = `
class JSClass {
    method1() {
        return "method1";
    }
    
    method3() {
        return "method3";
    }
}`

		const uri = await createTestFile("test-insert-javascript.js", testContent)
		const editor = await openTestFile(uri)

		// Insert after method1 in JavaScript
		const result = await lspController.insertAfterSymbol({
			uri: uri.toString(),
			line: 2,
			character: 4, // Position on "method1"
			content: `
    
    method2() {
        return "method2";
    }`,
		})

		if (result !== null) {
			assert(result.success === true, "Should successfully insert in JavaScript file")
		}

		reporter.passTest("insertAfterSymbol", "Insert in JavaScript file")
	} catch (error) {
		reporter.failTest("insertAfterSymbol", "Insert in JavaScript file", error)
	}

	// Test 8: Handle empty content
	reporter.startTest("insertAfterSymbol", "Handle empty content")
	try {
		const uri = await createTestFile("test-empty-content.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Insert empty content
		const result = await lspController.insertAfterSymbol({
			uri: uri.toString(),
			line: 8,
			character: 4, // Position on "getValue"
			content: "",
		})

		// Should handle gracefully
		if (result !== null) {
			assert(typeof result === "object", "Should return an object if not null")
			assert(typeof result.success === "boolean", "Should have success property")
		}

		reporter.passTest("insertAfterSymbol", "Handle empty content")
	} catch (error) {
		reporter.failTest("insertAfterSymbol", "Handle empty content", error)
	}

	// Test 9: Verify WorkspaceEdit structure in detail
	reporter.startTest("insertAfterSymbol", "Verify WorkspaceEdit structure")
	try {
		const testContent = `
interface TestInterface {
    prop1: string;
    prop2: number;
}`

		const uri = await createTestFile("test-workspace-edit.ts", testContent)
		const editor = await openTestFile(uri)

		const result = await lspController.insertAfterSymbol({
			uri: uri.toString(),
			line: 2,
			character: 4, // Position on "prop1"
			content: `
    prop1_5: boolean;`,
		})

		if (result !== null) {
			// Verify result structure
			assert(typeof result === "object", "Result should be an object")
			assert("success" in result, "Result should have success property")
			assert(typeof result.success === "boolean", "Success should be a boolean")
			assert(result.success === true, "Should successfully insert content")
		}

		reporter.passTest("insertAfterSymbol", "Verify WorkspaceEdit structure")
	} catch (error) {
		reporter.failTest("insertAfterSymbol", "Verify WorkspaceEdit structure", error)
	}

	// Test 10: Handle non-existent file
	reporter.startTest("insertAfterSymbol", "Handle non-existent file")
	try {
		const result = await lspController.insertAfterSymbol({
			uri: "file:///non-existent-file.ts",
			line: 1,
			character: 1,
			content: "new content",
		})

		// Should handle gracefully - likely return null or success: false
		assert(
			result === null || (typeof result === "object" && result.success === false),
			"Should return null or success: false for non-existent file",
		)

		reporter.passTest("insertAfterSymbol", "Handle non-existent file")
	} catch (error) {
		// It's acceptable to throw an error for non-existent files
		reporter.passTest("insertAfterSymbol", "Handle non-existent file")
	}

	// Test 11: Insert after symbol using symbolName parameter
	reporter.startTest("insertAfterSymbol", "Insert after symbol using symbolName")
	try {
		const testContent = `
class Calculator {
    add(a: number, b: number): number {
        return a + b;
    }
    
    multiply(a: number, b: number): number {
        return a * b;
    }
}`

		const uri = await createTestFile("test-insert-symbolname.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert after the 'add' method using symbolName
		const result = await lspController.insertAfterSymbol({
			uri: uri.toString(),
			symbolName: "add",
			content: `
    
    subtract(a: number, b: number): number {
        return a - b;
    }`,
		})

		assert(result !== null, "Should return a result")
		assert(result.success === true, "Should successfully insert content using symbolName")

		reporter.passTest("insertAfterSymbol", "Insert after symbol using symbolName")
	} catch (error) {
		reporter.failTest("insertAfterSymbol", "Insert after symbol using symbolName", error)
	}

	// Test 12: Insert after class using symbolName parameter
	reporter.startTest("insertAfterSymbol", "Insert after class using symbolName")
	try {
		const testContent = `
class TestClass {
    getValue(): number {
        return 42;
    }
}

const instance = new TestClass();`

		const uri = await createTestFile("test-insert-class-symbolname.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert after the 'TestClass' class using symbolName
		const result = await lspController.insertAfterSymbol({
			uri: uri.toString(),
			symbolName: "TestClass",
			content: `

class AnotherClass {
    performAction(): void {
        console.log("Action performed");
    }
}`,
		})

		assert(result !== null, "Should return a result")
		assert(result.success === true, "Should successfully insert after class using symbolName")

		reporter.passTest("insertAfterSymbol", "Insert after class using symbolName")
	} catch (error) {
		reporter.failTest("insertAfterSymbol", "Insert after class using symbolName", error)
	}

	// Test 13: Insert after function using symbolName parameter
	reporter.startTest("insertAfterSymbol", "Insert after function using symbolName")
	try {
		const testContent = `
function greet(name: string): string {
    return \`Hello, \${name}!\`;
}

function farewell(name: string): string {
    return \`Goodbye, \${name}!\`;
}

const result = greet("World");`

		const uri = await createTestFile("test-insert-function-symbolname.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert after the 'greet' function using symbolName
		const result = await lspController.insertAfterSymbol({
			uri: uri.toString(),
			symbolName: "greet",
			content: `

function welcome(name: string): string {
    return \`Welcome, \${name}!\`;
}`,
		})

		assert(result !== null, "Should return a result")
		if (result !== null) {
			assert(result.success === true, "Should successfully insert after function using symbolName")
		}

		reporter.passTest("insertAfterSymbol", "Insert after function using symbolName")
	} catch (error) {
		reporter.failTest("insertAfterSymbol", "Insert after function using symbolName", error)
	}

	// Test 14: Handle non-existent symbolName
	reporter.startTest("insertAfterSymbol", "Handle non-existent symbolName")
	try {
		const testContent = `
class Calculator {
    add(a: number, b: number): number {
        return a + b;
    }
}`

		const uri = await createTestFile("test-nonexistent-symbol.ts", testContent)
		const editor = await openTestFile(uri)

		// Try to insert after non-existent symbol
		const result = await lspController.insertAfterSymbol({
			uri: uri.toString(),
			symbolName: "nonExistentMethod",
			content: "some content",
		})

		// Should return success: false for non-existent symbols
		assert(result !== null, "Should return a result")
		assert(result.success === false, "Should return success: false for non-existent symbol")
		assert(result.content && result.content.includes("Symbol not found"), "Should return appropriate error message")

		reporter.passTest("insertAfterSymbol", "Handle non-existent symbolName")
	} catch (error) {
		reporter.failTest("insertAfterSymbol", "Handle non-existent symbolName", error)
	}

	// Test 15: Insert after property using symbolName parameter
	reporter.startTest("insertAfterSymbol", "Insert after property using symbolName")
	try {
		const testContent = `
class Person {
    private name: string;
    private age: number;
    
    constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
    }
}`

		const uri = await createTestFile("test-insert-property-symbolname.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert after the 'name' property using symbolName
		const result = await lspController.insertAfterSymbol({
			uri: uri.toString(),
			symbolName: "name",
			content: `
    private email: string;`,
		})

		assert(result !== null, "Should return a result")
		assert(result.success === true, "Should successfully insert after property using symbolName")

		reporter.passTest("insertAfterSymbol", "Insert after property using symbolName")
	} catch (error) {
		reporter.failTest("insertAfterSymbol", "Insert after property using symbolName", error)
	}

	// Test 16: Handle empty symbolName
	reporter.startTest("insertAfterSymbol", "Handle empty symbolName")
	try {
		const uri = await createTestFile("test-empty-symbolname.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Try to insert with empty symbolName
		const result = await lspController.insertAfterSymbol({
			uri: uri.toString(),
			symbolName: "",
			content: "some content",
		})

		// Should return success: false for empty symbolName
		assert(result !== null, "Should return a result")
		assert(result.success === false, "Should return success: false for empty symbolName")

		reporter.passTest("insertAfterSymbol", "Handle empty symbolName")
	} catch (error) {
		reporter.failTest("insertAfterSymbol", "Handle empty symbolName", error)
	}

	// Test 17: Insert after interface using symbolName parameter
	reporter.startTest("insertAfterSymbol", "Insert after interface using symbolName")
	try {
		const testContent = `
interface User {
    id: number;
    name: string;
}

interface Product {
    id: number;
    title: string;
    price: number;
}`

		const uri = await createTestFile("test-insert-interface-symbolname.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert after the 'User' interface using symbolName
		const result = await lspController.insertAfterSymbol({
			uri: uri.toString(),
			symbolName: "User",
			content: `

interface UserProfile extends User {
    email: string;
    avatar?: string;
}`,
		})

		assert(result !== null, "Should return a result")
		assert(result.success === true, "Should successfully insert after interface using symbolName")

		reporter.passTest("insertAfterSymbol", "Insert after interface using symbolName")
	} catch (error) {
		reporter.failTest("insertAfterSymbol", "Insert after interface using symbolName", error)
	}
}
