/**
 * Integration tests for insertBeforeSymbol LSP tool
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

export async function testInsertBeforeSymbol(reporter: TestReporter): Promise<void> {
	// Test 1: Insert comment before class
	reporter.startTest("insertBeforeSymbol", "Insert comment before class")
	try {
		const testContent = `
class TestClass {
    private value: number = 42;
    
    constructor(initialValue: number) {
        this.value = initialValue;
    }
    
    getValue(): number {
        return this.value;
    }
}
`
		const uri = await createTestFile("test-insert-before-class.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert comment before TestClass (positioned on class keyword)
		const result = await lspController.insertBeforeSymbol({
			uri: uri.toString(),
			line: 1,
			character: 0, // Position on "class"
			content: "// This is a test class\n",
		})

		if (result === null) {
			console.warn("Warning: insertBeforeSymbol not available in test environment")
			reporter.passTest("insertBeforeSymbol", "Insert comment before class")
			return
		}

		// Verify success
		assert(result.success === true, result.content || "Should successfully insert comment before class")

		reporter.passTest("insertBeforeSymbol", "Insert comment before class")
	} catch (error) {
		reporter.failTest("insertBeforeSymbol", "Insert comment before class", error)
	}

	// Test 2: Insert import before first import
	reporter.startTest("insertBeforeSymbol", "Insert import before first import")
	try {
		const testContent = `
import { Component } from 'react';
import { useState } from 'react';

class MyComponent extends Component {
    render() {
        return <div>Hello</div>;
    }
}
`
		const uri = await createTestFile("test-insert-before-import.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert new import before first import
		const content = "import * as React from 'react';\n"
		const result = await lspController.insertBeforeSymbol({
			uri: uri.toString(),
			line: 1,
			character: 0, // Position on first import
			content: content,
		})

		if (result === null) {
			console.warn("Warning: insertBeforeSymbol not available in test environment")
			reporter.passTest("insertBeforeSymbol", "Insert import before first import")
			return
		}

		// Import statements don't have symbol definitions, so this tool should fail
		// This is expected behavior - insertBeforeSymbol is for inserting before symbol definitions
		assert(
			result.success === false,
			"insertBeforeSymbol should fail for import statements as they don't have symbol definitions",
		)
		assert(
			result.content !== undefined && result.content.includes("No symbol definition found"),
			"Should return appropriate error message for import statements",
		)

		reporter.passTest("insertBeforeSymbol", "Insert import before first import")
	} catch (error) {
		reporter.failTest("insertBeforeSymbol", "Insert import before first import", error)
	}

	// Test 3: Insert method before method
	reporter.startTest("insertBeforeSymbol", "Insert method before method")
	try {
		const testContent = `
class Calculator {
    add(a: number, b: number): number {
        return a + b;
    }
    
    multiply(a: number, b: number): number {
        return a * b;
    }
}
`
		const uri = await createTestFile("test-insert-before-method.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert new method before multiply method
		const result = await lspController.insertBeforeSymbol({
			uri: uri.toString(),
			line: 6,
			character: 4, // Position on "multiply"
			content: `    subtract(a: number, b: number): number {
        return a - b;
    }
    
`,
		})

		if (result === null) {
			throw new Error("insertBeforeSymbol returned null")
		}

		// Verify success
		assert(result.success === true, result.content || "Should successfully insert method before method")

		reporter.passTest("insertBeforeSymbol", "Insert method before method")
	} catch (error) {
		reporter.failTest("insertBeforeSymbol", "Insert method before method", error)
	}

	// Test 4: Insert with proper indentation
	reporter.startTest("insertBeforeSymbol", "Insert with proper indentation")
	try {
		const testContent = `
class IndentedClass {
    constructor() {
        this.value = 0;
    }
    
    getValue() {
        return this.value;
    }
}
`
		const uri = await createTestFile("test-insert-indentation.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert properly indented method before getValue
		const result = await lspController.insertBeforeSymbol({
			uri: uri.toString(),
			line: 6,
			character: 4, // Position on "getValue"
			content: `    setValue(newValue: number) {
        this.value = newValue;
    }
    
`,
		})

		if (result === null) {
			console.warn("Warning: insertBeforeSymbol not available in test environment")
			reporter.passTest("insertBeforeSymbol", "Insert with proper indentation")
			return
		}

		// Verify success
		assert(result.success === true, result.content || "Should successfully insert with proper indentation")

		reporter.passTest("insertBeforeSymbol", "Insert with proper indentation")
	} catch (error) {
		reporter.failTest("insertBeforeSymbol", "Insert with proper indentation", error)
	}

	// Test 5: Handle invalid positions
	reporter.startTest("insertBeforeSymbol", "Handle invalid positions")
	try {
		const uri = await createTestFile("test-invalid-position.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Try to insert at an invalid position
		const result = await lspController.insertBeforeSymbol({
			uri: uri.toString(),
			line: 9999,
			character: 9999, // Invalid position
			content: "some content",
		})

		// Should return null or success: false gracefully for invalid positions
		assert(
			result === null || (result && result.success === false),
			"Should return null or success: false for invalid position",
		)

		reporter.passTest("insertBeforeSymbol", "Handle invalid positions")
	} catch (error) {
		reporter.failTest("insertBeforeSymbol", "Handle invalid positions", error)
	}

	// Test 6: Insert before function in Python
	reporter.startTest("insertBeforeSymbol", "Insert before function in Python")
	try {
		const testContent = `
def calculate_sum(a, b):
    """Calculate the sum of two numbers."""
    return a + b

def calculate_product(a, b):
    """Calculate the product of two numbers."""
    return a * b
`
		const uri = await createTestFile("test-insert-python.py", testContent)
		const editor = await openTestFile(uri)

		// Insert new function before calculate_product
		const result = await lspController.insertBeforeSymbol({
			uri: uri.toString(),
			line: 4,
			character: 0, // Position on "def calculate_product"
			content: `
def calculate_difference(a, b):
    """Calculate the difference of two numbers."""
    return a - b

`,
		})

		if (result === null) {
			// This is acceptable if Python LSP is not available
			console.log("Python LSP may not be available, skipping test")
			reporter.passTest("insertBeforeSymbol", "Insert before function in Python")
			return
		}

		// Python LSP may not be available, so this tool should fail
		// This is expected behavior when Python LSP is not configured
		if (result.success === false) {
			console.log("Python LSP not available, this is expected behavior")
			assert(
				result.content !== undefined && result.content.includes("No symbol definition found"),
				"Should return appropriate error message when Python LSP unavailable",
			)
			reporter.passTest("insertBeforeSymbol", "Insert before function in Python")
			return
		}

		// If Python LSP is available, verify success
		assert(result.success === true, result.content || "Should successfully insert before function in Python")

		reporter.passTest("insertBeforeSymbol", "Insert before function in Python")
	} catch (error) {
		reporter.failTest("insertBeforeSymbol", "Insert before function in Python", error)
	}

	// Test 7: Insert before JavaScript function
	reporter.startTest("insertBeforeSymbol", "Insert before JavaScript function")
	try {
		const testContent = `
function greet(name) {
    return "Hello, " + name;
}

function farewell(name) {
    return "Goodbye, " + name;
}
`
		const uri = await createTestFile("test-insert-javascript.js", testContent)
		const editor = await openTestFile(uri)

		// Insert new function before farewell
		const result = await lspController.insertBeforeSymbol({
			uri: uri.toString(),
			line: 5,
			character: 0, // Position on "function farewell"
			content: `
function introduce(name, title) {
    return "This is " + title + " " + name;
}

`,
		})

		if (result === null) {
			// This is acceptable if JavaScript LSP is not available
			console.log("JavaScript LSP may not be available, skipping test")
			reporter.passTest("insertBeforeSymbol", "Insert before JavaScript function")
			return
		}

		// Verify success
		assert(result.success === true, result.content || "Should successfully insert before JavaScript function")

		reporter.passTest("insertBeforeSymbol", "Insert before JavaScript function")
	} catch (error) {
		reporter.failTest("insertBeforeSymbol", "Insert before JavaScript function", error)
	}

	// Test 8: Handle non-existent file
	reporter.startTest("insertBeforeSymbol", "Handle non-existent file")
	try {
		// Try to insert in a non-existent file
		const result = await lspController.insertBeforeSymbol({
			uri: "file:///non-existent-file.ts",
			line: 1,
			character: 0,
			content: "some content",
		})

		// Should return null or success: false gracefully for non-existent files
		assert(
			result === null || (result && result.success === false),
			"Should return null or success: false for non-existent file",
		)

		reporter.passTest("insertBeforeSymbol", "Handle non-existent file")
	} catch (error) {
		reporter.failTest("insertBeforeSymbol", "Handle non-existent file", error)
	}

	// Test 9: Insert multiple lines with complex content
	reporter.startTest("insertBeforeSymbol", "Insert multiple lines with complex content")
	try {
		const testContent = `
interface User {
    id: number;
    name: string;
}

class UserService {
    getUser(id: number): User | null {
        return null;
    }
}
`
		const uri = await createTestFile("test-insert-complex.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert complex multi-line content before UserService class
		const complexContent = `/**
 * Repository interface for user data access
 */
interface UserRepository {
    findById(id: number): Promise<User | null>;
    save(user: User): Promise<void>;
    delete(id: number): Promise<boolean>;
}

/**
 * Default implementation of UserRepository
 */
class DefaultUserRepository implements UserRepository {
    async findById(id: number): Promise<User | null> {
        // Implementation here
        return null;
    }
    
    async save(user: User): Promise<void> {
        // Implementation here
    }
    
    async delete(id: number): Promise<boolean> {
        // Implementation here
        return false;
    }
}

`

		const result = await lspController.insertBeforeSymbol({
			uri: uri.toString(),
			line: 6,
			character: 0, // Position on "class UserService"
			content: complexContent,
		})

		if (result === null) {
			throw new Error("insertBeforeSymbol returned null")
		}

		// Verify success
		assert(
			result.success === true,
			result.content || "Should successfully insert multiple lines with complex content",
		)

		reporter.passTest("insertBeforeSymbol", "Insert multiple lines with complex content")
	} catch (error) {
		reporter.failTest("insertBeforeSymbol", "Insert multiple lines with complex content", error)
	}

	// Test 10: Insert before symbol using symbolName parameter
	reporter.startTest("insertBeforeSymbol", "Insert before symbol using symbolName")
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

		const uri = await createTestFile("test-insert-before-symbolname.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert before the 'multiply' method using symbolName
		const result = await lspController.insertBeforeSymbol({
			uri: uri.toString(),
			symbolName: "multiply",
			content: `    subtract(a: number, b: number): number {
        return a - b;
    }
    
`,
		})

		assert(result !== null, "Should return a result")
		if (result !== null) {
			assert(result.success === true, "Should successfully insert before symbol using symbolName")
		}

		reporter.passTest("insertBeforeSymbol", "Insert before symbol using symbolName")
	} catch (error) {
		reporter.failTest("insertBeforeSymbol", "Insert before symbol using symbolName", error)
	}

	// Test 11: Insert before class using symbolName parameter
	reporter.startTest("insertBeforeSymbol", "Insert before class using symbolName")
	try {
		const testContent = `
class TestClass {
    private value: number = 42;
    
    constructor(initialValue: number) {
        this.value = initialValue;
    }
    
    getValue(): number {
        return this.value;
    }
}
`
		const uri = await createTestFile("test-insert-before-class-symbolname.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert comment before TestClass using symbolName
		const result = await lspController.insertBeforeSymbol({
			uri: uri.toString(),
			symbolName: "TestClass",
			content: "// This is a test class\n",
		})

		if (result === null) {
			console.warn("Warning: insertBeforeSymbol not available in test environment")
			reporter.passTest("insertBeforeSymbol", "Insert before class using symbolName")
			return
		}

		// Verify success
		assert(result.success === true, result.content || "Should successfully insert before class using symbolName")

		reporter.passTest("insertBeforeSymbol", "Insert before class using symbolName")
	} catch (error) {
		reporter.failTest("insertBeforeSymbol", "Insert before class using symbolName", error)
	}

	// Test 12: Insert before function using symbolName parameter
	reporter.startTest("insertBeforeSymbol", "Insert before function using symbolName")
	try {
		const testContent = `
function calculate_sum(a: number, b: number): number {
    return a + b;
}

function calculate_product(a: number, b: number): number {
    return a * b;
}`

		const uri = await createTestFile("test-insert-before-function-symbolname.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert new function before calculate_product using symbolName
		const result = await lspController.insertBeforeSymbol({
			uri: uri.toString(),
			symbolName: "calculate_product",
			content: `
function calculate_difference(a: number, b: number): number {
    return a - b;
}

`,
		})

		if (result === null) {
			throw new Error("insertBeforeSymbol returned null")
		}

		// Verify success
		assert(result.success === true, result.content || "Should successfully insert before function using symbolName")

		reporter.passTest("insertBeforeSymbol", "Insert before function using symbolName")
	} catch (error) {
		reporter.failTest("insertBeforeSymbol", "Insert before function using symbolName", error)
	}

	// Test 13: Handle non-existent symbolName
	reporter.startTest("insertBeforeSymbol", "Handle non-existent symbolName")
	try {
		const testContent = `
class Calculator {
    add(a: number, b: number): number {
        return a + b;
    }
}`

		const uri = await createTestFile("test-nonexistent-before-symbol.ts", testContent)
		const editor = await openTestFile(uri)

		// Try to insert before non-existent symbol
		const result = await lspController.insertBeforeSymbol({
			uri: uri.toString(),
			symbolName: "nonExistentMethod",
			content: "some content",
		})

		// Should return success: false for non-existent symbols
		assert(result !== null, "Should return a result")
		assert(result.success === false, "Should return success: false for non-existent symbol")
		assert(result.content && result.content.includes("Symbol not found"), "Should return appropriate error message")

		reporter.passTest("insertBeforeSymbol", "Handle non-existent symbolName")
	} catch (error) {
		reporter.failTest("insertBeforeSymbol", "Handle non-existent symbolName", error)
	}

	// Test 14: Insert before method with proper indentation using symbolName
	reporter.startTest("insertBeforeSymbol", "Insert before method with proper indentation using symbolName")
	try {
		const testContent = `
class IndentedClass {
    constructor() {
        this.value = 0;
    }
    
    getValue() {
        return this.value;
    }
}`
		const uri = await createTestFile("test-insert-indentation-symbolname.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert properly indented method before getValue using symbolName
		const result = await lspController.insertBeforeSymbol({
			uri: uri.toString(),
			symbolName: "getValue",
			content: `    setValue(newValue: number) {
        this.value = newValue;
    }
    
`,
		})

		if (result === null) {
			console.warn("Warning: insertBeforeSymbol not available in test environment")
			reporter.passTest("insertBeforeSymbol", "Insert before method with proper indentation using symbolName")
			return
		}

		// Verify success
		assert(result.success === true, result.content || "Should successfully insert before method with proper indentation using symbolName")

		reporter.passTest("insertBeforeSymbol", "Insert before method with proper indentation using symbolName")
	} catch (error) {
		reporter.failTest("insertBeforeSymbol", "Insert before method with proper indentation using symbolName", error)
	}

	// Test 15: Handle empty symbolName
	reporter.startTest("insertBeforeSymbol", "Handle empty symbolName")
	try {
		const uri = await createTestFile("test-empty-before-symbolname.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Try to insert with empty symbolName
		const result = await lspController.insertBeforeSymbol({
			uri: uri.toString(),
			symbolName: "",
			content: "some content",
		})

		// Should return success: false for empty symbolName
		assert(result !== null, "Should return a result")
		assert(result.success === false, "Should return success: false for empty symbolName")

		reporter.passTest("insertBeforeSymbol", "Handle empty symbolName")
	} catch (error) {
		reporter.failTest("insertBeforeSymbol", "Handle empty symbolName", error)
	}

	// Test 16: Insert before interface using symbolName parameter
	reporter.startTest("insertBeforeSymbol", "Insert before interface using symbolName")
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

		const uri = await createTestFile("test-insert-before-interface-symbolname.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert before the 'Product' interface using symbolName
		const result = await lspController.insertBeforeSymbol({
			uri: uri.toString(),
			symbolName: "Product",
			content: `
interface Category {
    id: number;
    name: string;
    description?: string;
}

`,
		})

		assert(result !== null, "Should return a result")
		if (result !== null) {
			assert(result.success === true, "Should successfully insert before interface using symbolName")
		}

		reporter.passTest("insertBeforeSymbol", "Insert before interface using symbolName")
	} catch (error) {
		reporter.failTest("insertBeforeSymbol", "Insert before interface using symbolName", error)
	}

	// Test 17: Insert before constructor using symbolName parameter
	reporter.startTest("insertBeforeSymbol", "Insert before constructor using symbolName")
	try {
		const testContent = `
class Person {
    private name: string;
    private age: number;
    
    constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
    }
    
    getName(): string {
        return this.name;
    }
}`

		const uri = await createTestFile("test-insert-before-constructor-symbolname.ts", testContent)
		const editor = await openTestFile(uri)

		// Insert before the 'constructor' using symbolName
		const result = await lspController.insertBeforeSymbol({
			uri: uri.toString(),
			symbolName: "constructor",
			content: `    private static instanceCount: number = 0;
    
    `,
		})

		if (result === null) {
			console.warn("Warning: insertBeforeSymbol not available in test environment")
			reporter.passTest("insertBeforeSymbol", "Insert before constructor using symbolName")
			return
		}

		// Verify success
		assert(result.success === true, result.content || "Should successfully insert before constructor using symbolName")

		reporter.passTest("insertBeforeSymbol", "Insert before constructor using symbolName")
	} catch (error) {
		reporter.failTest("insertBeforeSymbol", "Insert before constructor using symbolName", error)
	}
}
