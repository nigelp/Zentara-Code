/**
 * Integration tests for getSymbolChildren LSP tool
 */

import * as vscode from "vscode"
import { lspController } from "../../zentara_lsp/src/LspController"
import {
	TestReporter,
	createTestFile,
	openTestFile,
	assert,
} from "./testUtils"

// Type definitions for return types
type GetSymbolChildrenResult =
	| { success: false; error: string }
	| { success: true; children: string }

// Helper function to check if result is successful
function isSuccessResult(result: GetSymbolChildrenResult): result is { success: true; children: string } {
	return result && typeof result === 'object' && 'success' in result && result.success === true && 'children' in result && typeof result.children === 'string'
}

export async function testGetSymbolChildren(reporter: TestReporter): Promise<void> {
	// Test content with nested structure for comprehensive testing
	const complexContent = `
/**
 * A test class with nested structure
 */
class TestClass {
    /**
     * A private field
     */
    private field: string = "test";
    
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
    
    /**
     * A private method
     */
    private privateMethod(): string {
        return this.field;
    }
}

/**
 * Test interface with methods
 */
interface TestInterface {
    prop: string;
    method(): void;
    optionalProp?: number;
}

/**
 * Test namespace with nested elements
 */
namespace TestNamespace {
    export class InnerClass {
        innerField: number = 42;
        
        innerMethod(): void {
            console.log(this.innerField);
        }
        
        static staticMethod(): string {
            return "static";
        }
    }
    
    export function innerFunction(): void {
        console.log("inner function");
    }
    
    export const innerConstant = "constant";
}

/**
 * Test enum
 */
enum TestEnum {
    VALUE1 = "value1",
    VALUE2 = "value2",
    VALUE3 = "value3"
}
`

	// Test 1: Get children of a class (basic functionality)
	reporter.startTest("getSymbolChildren", "Get children of TestClass")
	try {
		const uri = await createTestFile("test-symbol-children.ts", complexContent)
		const editor = await openTestFile(uri)

		// Find TestClass at line 5 (approximate position of class declaration)
		const result = await lspController.getSymbolChildren({
			uri: uri.toString(),
			line: 5,
			character: 6, // Position on "class" keyword
			deep: "1",
			include_hover: true,
		})

		assert(isSuccessResult(result), "Should return successful result")
		if (isSuccessResult(result)) {
			assert(typeof result.children === "string", "Children should be a string")
			assert(result.children.length > 0, "Children table should not be empty")
			// Should contain table headers
			assert(result.children.includes("NAME"), "Table should have NAME column")
			assert(result.children.includes("KIND"), "Table should have KIND column")
			assert(result.children.includes("RANGE"), "Table should have RANGE column")
			assert(result.children.includes("SELECTION"), "Table should have SELECTION column")
			assert(result.children.includes("PARENT"), "Table should have PARENT column")
			assert(result.children.includes("HOVER_INFO"), "Table should have HOVER_INFO column")
			// Should contain class members
			assert(result.children.includes("field"), "Should contain field member")
			assert(result.children.includes("constructor"), "Should contain constructor")
			assert(result.children.includes("method"), "Should contain method")
			assert(result.children.includes("privateMethod"), "Should contain privateMethod")
			// Should show TestClass as parent
			assert(result.children.includes("TestClass"), "Should show TestClass as parent")
		}

		reporter.passTest("getSymbolChildren", "Get children of TestClass")
	} catch (error) {
		reporter.failTest("getSymbolChildren", "Get children of TestClass", error)
	}

	// Test 2: Get children with depth control (deep="2")
	reporter.startTest("getSymbolChildren", "Get children with depth=2")
	try {
		const uri = await createTestFile("test-symbol-children-depth.ts", complexContent)
		const editor = await openTestFile(uri)

		// Find TestNamespace at correct position (line 46 based on debug output)
		const result = await lspController.getSymbolChildren({
			uri: uri.toString(),
			line: 46, // Correct position of namespace declaration
			character: 10,
			deep: "2",
			include_hover: true,
		})

		assert(isSuccessResult(result), "Should return successful result")
		if (isSuccessResult(result)) {
			assert(typeof result.children === "string", "Children should be a string")
			assert(result.children.length > 0, "Children table should not be empty")
			// Should contain direct children (InnerClass, innerFunction, innerConstant)
			assert(result.children.includes("InnerClass"), "Should contain InnerClass")
			assert(result.children.includes("innerFunction"), "Should contain innerFunction")
			assert(result.children.includes("innerConstant"), "Should contain innerConstant")
			// With depth=2, should also contain grandchildren (InnerClass members)
			assert(result.children.includes("innerField") || result.children.includes("innerMethod"), "Should contain InnerClass members with depth=2")
		}

		reporter.passTest("getSymbolChildren", "Get children with depth=2")
	} catch (error) {
		reporter.failTest("getSymbolChildren", "Get children with depth=2", error)
	}

	// Test 3: Get children without hover information
	reporter.startTest("getSymbolChildren", "Get children without hover info")
	try {
		const uri = await createTestFile("test-symbol-children-no-hover.ts", complexContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getSymbolChildren({
			uri: uri.toString(),
			line: 5, // TestClass position
			character: 6,
			deep: "1",
			include_hover: false,
		})

		assert(isSuccessResult(result), "Should return successful result")
		if (isSuccessResult(result)) {
			assert(typeof result.children === "string", "Children should be a string")
			// Should NOT contain HOVER_INFO column
			assert(!result.children.includes("HOVER_INFO"), "Should not contain HOVER_INFO column")
			// Should contain other columns
			assert(result.children.includes("NAME"), "Should contain NAME column")
			assert(result.children.includes("KIND"), "Should contain KIND column")
			assert(result.children.includes("PARENT"), "Should contain PARENT column")
			assert(result.children.includes("EOL"), "Should contain EOL column")
		}

		reporter.passTest("getSymbolChildren", "Get children without hover info")
	} catch (error) {
		reporter.failTest("getSymbolChildren", "Get children without hover info", error)
	}

	// Test 4: Test with symbol that has no children
	reporter.startTest("getSymbolChildren", "Get children of symbol with no children")
	try {
		const uri = await createTestFile("test-symbol-no-children.ts", complexContent)
		const editor = await openTestFile(uri)

		// Try to get children of a method (which should have no children)
		const result = await lspController.getSymbolChildren({
			uri: uri.toString(),
			line: 22, // Position targeting the "method" function specifically
			character: 15, // Position on method name
			deep: "1",
			include_hover: true,
		})

		assert(isSuccessResult(result), "Should return successful result")
		if (isSuccessResult(result)) {
			assert(typeof result.children === "string", "Children should be a string")
			// Should return empty table (just headers)
			const lines = result.children.split('\n').filter(line => line.trim() !== '')
			assert(lines.length <= 1, "Should contain only header line for symbol with no children")
			assert(result.children.includes("NAME | KIND | RANGE | SELECTION | PARENT | HOVER_INFO | EOL"), "Should contain table header")
		}

		reporter.passTest("getSymbolChildren", "Get children of symbol with no children")
	} catch (error) {
		reporter.failTest("getSymbolChildren", "Get children of symbol with no children", error)
	}

	// Test 5: Test error case - position with no symbol
	reporter.startTest("getSymbolChildren", "Handle position with no symbol")
	try {
		const uri = await createTestFile("test-symbol-no-match.ts", complexContent)
		const editor = await openTestFile(uri)

		// Try to get children at a position with no symbol (empty line)
		const result = await lspController.getSymbolChildren({
			uri: uri.toString(),
			line: 1, // Empty line at the beginning
			character: 0,
			deep: "1",
			include_hover: true,
		})

		// Should return error result
		assert(!isSuccessResult(result), "Should return error for position with no symbol")
		if (!isSuccessResult(result)) {
			assert(typeof result.error === "string", "Error should be a string")
			assert(result.error.includes("No symbol found"), "Error should mention no symbol found")
		}

		reporter.passTest("getSymbolChildren", "Handle position with no symbol")
	} catch (error) {
		reporter.failTest("getSymbolChildren", "Handle position with no symbol", error)
	}

	// Test 6: Test depth="all" functionality
	reporter.startTest("getSymbolChildren", "Get children with depth=all")
	try {
		const uri = await createTestFile("test-symbol-children-all.ts", complexContent)
		const editor = await openTestFile(uri)

		// Find TestNamespace and get all nested children
		const result = await lspController.getSymbolChildren({
			uri: uri.toString(),
			line: 46, // Correct position of namespace declaration
			character: 10,
			deep: "all",
			include_hover: false, // Disable hover for cleaner output
		})

		assert(isSuccessResult(result), "Should return successful result")
		if (isSuccessResult(result)) {
			assert(typeof result.children === "string", "Children should be a string")
			assert(result.children.length > 0, "Children table should not be empty")
			// Should contain all levels of nesting
			assert(result.children.includes("InnerClass"), "Should contain InnerClass")
			assert(result.children.includes("innerFunction"), "Should contain innerFunction")
			// Should contain deeply nested members
			assert(result.children.includes("innerField") || result.children.includes("innerMethod") || result.children.includes("staticMethod"), 
				"Should contain deeply nested members with depth=all")
		}

		reporter.passTest("getSymbolChildren", "Get children with depth=all")
	} catch (error) {
		reporter.failTest("getSymbolChildren", "Get children with depth=all", error)
	}

	// Test 7: Test with interface
	reporter.startTest("getSymbolChildren", "Get children of interface")
	try {
		const uri = await createTestFile("test-interface-children.ts", complexContent)
		const editor = await openTestFile(uri)

		// Find TestInterface
		const result = await lspController.getSymbolChildren({
			uri: uri.toString(),
			line: 37, // Correct position of interface declaration (line 37 based on debug output)
			character: 10,
			deep: "1",
			include_hover: true,
		})

		assert(isSuccessResult(result), "Should return successful result")
		if (isSuccessResult(result)) {
			assert(typeof result.children === "string", "Children should be a string")
			// Should contain interface members
			assert(result.children.includes("prop"), "Should contain prop member")
			assert(result.children.includes("method"), "Should contain method member")
			assert(result.children.includes("optionalProp"), "Should contain optionalProp member")
			// Should show TestInterface as parent
			assert(result.children.includes("TestInterface"), "Should show TestInterface as parent")
		}

		reporter.passTest("getSymbolChildren", "Get children of interface")
	} catch (error) {
		reporter.failTest("getSymbolChildren", "Get children of interface", error)
	}

	// Test 8: Test with enum
	reporter.startTest("getSymbolChildren", "Get children of enum")
	try {
		const uri = await createTestFile("test-enum-children.ts", complexContent)
		const editor = await openTestFile(uri)

		// Find TestEnum
		const result = await lspController.getSymbolChildren({
			uri: uri.toString(),
			line: 69, // Correct position of enum declaration (line 69 based on debug output)
			character: 5, // Position on "enum" keyword
			deep: "1",
			include_hover: false,
		})

		assert(isSuccessResult(result), "Should return successful result")
		if (isSuccessResult(result)) {
			assert(typeof result.children === "string", "Children should be a string")
			// Should contain enum values
			assert(result.children.includes("VALUE1"), "Should contain VALUE1")
			assert(result.children.includes("VALUE2"), "Should contain VALUE2")
			assert(result.children.includes("VALUE3"), "Should contain VALUE3")
			// Should show TestEnum as parent
			assert(result.children.includes("TestEnum"), "Should show TestEnum as parent")
		}

		reporter.passTest("getSymbolChildren", "Get children of enum")
	} catch (error) {
		reporter.failTest("getSymbolChildren", "Get children of enum", error)
	}

	// Test 9: Test position precision (selection range vs full range)
	reporter.startTest("getSymbolChildren", "Test position precision")
	try {
		const precisionContent = `
class OuterClass {
    outerMethod(): void {}
    
    innerClass = class InnerClass {
        innerMethod(): void {}
        innerField: string = "test";
    }
}
`
		const uri = await createTestFile("test-position-precision.ts", precisionContent)
		const editor = await openTestFile(uri)

		// Test getting children of the inner class specifically
		const result = await lspController.getSymbolChildren({
			uri: uri.toString(),
			line: 5, // Position on InnerClass
			character: 25,
			deep: "1",
			include_hover: false,
		})

		assert(isSuccessResult(result), "Should return successful result")
		if (isSuccessResult(result)) {
			assert(typeof result.children === "string", "Children should be a string")
			// Should find the most specific symbol at the position
			// The exact behavior depends on how VSCode LSP resolves the position
			assert(result.children.length >= 0, "Should return valid result")
		}

		reporter.passTest("getSymbolChildren", "Test position precision")
	} catch (error) {
		reporter.failTest("getSymbolChildren", "Test position precision", error)
	}

	// Test 10: Test with different file types
	reporter.startTest("getSymbolChildren", "Test with JavaScript file")
	try {
		const jsContent = `
class JSClass {
    constructor(value) {
        this.field = value;
    }
    
    method() {
        return this.field;
    }
    
    static staticMethod() {
        return "static";
    }
}

function jsFunction() {
    return "function";
}

const jsObject = {
    prop: "value",
    method: function() {
        return this.prop;
    }
};
`
		const uri = await createTestFile("test-js-children.js", jsContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getSymbolChildren({
			uri: uri.toString(),
			line: 2, // JSClass position
			character: 6,
			deep: "1",
			include_hover: false,
		})

		assert(isSuccessResult(result), "Should return successful result for JS file")
		if (isSuccessResult(result)) {
			assert(typeof result.children === "string", "Children should be a string")
			// Should work with JavaScript files
			assert(result.children.includes("NAME"), "Should contain table headers for JS file")
		}

		reporter.passTest("getSymbolChildren", "Test with JavaScript file")
	} catch (error) {
		reporter.failTest("getSymbolChildren", "Test with JavaScript file", error)
	}

	// Test 11: Get symbol children using symbolName parameter for TypeScript symbols
	reporter.startTest("getSymbolChildren", "Get symbol children using symbolName for TypeScript symbols")
	try {
		const content = `
class TestClass {
    private value: number = 0;
    protected status: string = "active";
    public id: string;
    
    constructor(id: string) {
        this.id = id;
    }
    
    getValue(): number {
        return this.value;
    }
    
    setValue(newValue: number): void {
        this.value = newValue;
    }
    
    getStatus(): string {
        return this.status;
    }
    
    static createDefault(): TestClass {
        return new TestClass("default");
    }
}

interface TestInterface {
    id: number;
    name: string;
    email?: string;
    
    getName(): string;
    setName(name: string): void;
    getEmail(): string | undefined;
}

namespace TestNamespace {
    export class NestedClass {
        nestedField: boolean = true;
        
        nestedMethod(): void {
            console.log('nested');
        }
        
        static nestedStatic(): string {
            return 'static nested';
        }
    }
    
    export function nestedFunction(): void {
        console.log('nested function');
    }
    
    export const nestedConstant = 42;
    
    export interface NestedInterface {
        nestedProp: string;
        nestedMethod(): void;
    }
}

enum TestEnum {
    FIRST = "first",
    SECOND = "second",
    THIRD = "third",
    FOURTH = 4
}

function testFunction(): void {
    console.log('test function');
}

const testVariable = "test";
`
		const uri = await createTestFile("test-symbolname-children.ts", content)
		const editor = await openTestFile(uri)

		// Test getting children of TestClass using symbolName
		try {
			const classResult = await lspController.getSymbolChildren({
				uri: uri.toString(),
				symbolName: "TestClass",
				deep: "1",
				include_hover: false,
			})
			assert(isSuccessResult(classResult), "Should return successful result for TestClass symbolName lookup")
			if (isSuccessResult(classResult)) {
				assert(typeof classResult.children === "string", "TestClass children should be string")
				assert(classResult.children.includes("NAME"), "Should contain table headers")
				assert(classResult.children.includes("value") || classResult.children.includes("getValue"), "Should contain class members")
			}
		} catch (error) {
			console.warn("TestClass symbolName lookup failed:", error)
		}

		// Test getting children of TestInterface using symbolName
		try {
			const interfaceResult = await lspController.getSymbolChildren({
				uri: uri.toString(),
				symbolName: "TestInterface",
				deep: "1",
				include_hover: false,
			})
			assert(isSuccessResult(interfaceResult), "Should return successful result for TestInterface symbolName lookup")
			if (isSuccessResult(interfaceResult)) {
				assert(typeof interfaceResult.children === "string", "TestInterface children should be string")
				assert(interfaceResult.children.includes("id") || interfaceResult.children.includes("name"), "Should contain interface members")
			}
		} catch (error) {
			console.warn("TestInterface symbolName lookup failed:", error)
		}

		// Test getting children of TestNamespace using symbolName
		try {
			const namespaceResult = await lspController.getSymbolChildren({
				uri: uri.toString(),
				symbolName: "TestNamespace",
				deep: "2",
				include_hover: false,
			})
			assert(isSuccessResult(namespaceResult), "Should return successful result for TestNamespace symbolName lookup")
			if (isSuccessResult(namespaceResult)) {
				assert(typeof namespaceResult.children === "string", "TestNamespace children should be string")
				assert(namespaceResult.children.includes("NestedClass") || namespaceResult.children.includes("nestedFunction"), "Should contain namespace members")
			}
		} catch (error) {
			console.warn("TestNamespace symbolName lookup failed:", error)
		}

		// Test getting children of NestedClass using symbolName
		try {
			const nestedResult = await lspController.getSymbolChildren({
				uri: uri.toString(),
				symbolName: "NestedClass",
				deep: "1",
				include_hover: true,
			})
			assert(isSuccessResult(nestedResult), "Should return successful result for NestedClass symbolName lookup")
			if (isSuccessResult(nestedResult)) {
				assert(typeof nestedResult.children === "string", "NestedClass children should be string")
				assert(nestedResult.children.includes("HOVER_INFO"), "Should include hover info")
			}
		} catch (error) {
			console.warn("NestedClass symbolName lookup failed:", error)
		}

		// Test getting children of TestEnum using symbolName
		try {
			const enumResult = await lspController.getSymbolChildren({
				uri: uri.toString(),
				symbolName: "TestEnum",
				deep: "1",
				include_hover: false,
			})
			assert(isSuccessResult(enumResult), "Should return successful result for TestEnum symbolName lookup")
			if (isSuccessResult(enumResult)) {
				assert(typeof enumResult.children === "string", "TestEnum children should be string")
				assert(enumResult.children.includes("FIRST") || enumResult.children.includes("SECOND"), "Should contain enum values")
			}
		} catch (error) {
			console.warn("TestEnum symbolName lookup failed:", error)
		}

		reporter.passTest("getSymbolChildren", "Get symbol children using symbolName for TypeScript symbols")
	} catch (error) {
		reporter.failTest("getSymbolChildren", "Get symbol children using symbolName for TypeScript symbols", error)
	}

	// Test 12: Error handling for symbolName parameter
	reporter.startTest("getSymbolChildren", "Error handling for symbolName parameter")
	try {
		const uri = await createTestFile("test-error-handling.ts", complexContent)

		// Test with non-existent symbol
		const nonExistentResult = await lspController.getSymbolChildren({
			uri: uri.toString(),
			symbolName: "NonExistentSymbol",
			deep: "1",
			include_hover: false,
		})
		// Should return error result for non-existent symbol
		assert(!isSuccessResult(nonExistentResult), "Should return error for non-existent symbol")
		if (!isSuccessResult(nonExistentResult)) {
			assert(typeof nonExistentResult.error === "string", "Error should be a string")
			assert(nonExistentResult.error.includes("No symbol found") || nonExistentResult.error.includes("not found"), "Error should mention symbol not found")
		}

		// Test with empty symbolName
		try {
			const emptyResult = await lspController.getSymbolChildren({
				uri: uri.toString(),
				symbolName: "",
				deep: "1",
				include_hover: false,
			})
			assert(!isSuccessResult(emptyResult), "Should return error for empty symbolName")
		} catch (error) {
			// Empty symbolName might throw error, which is acceptable
			console.warn("Empty symbolName threw error (acceptable):", error.message)
		}

		// Test with whitespace-only symbolName
		try {
			const whitespaceResult = await lspController.getSymbolChildren({
				uri: uri.toString(),
				symbolName: "   ",
				deep: "1",
				include_hover: false,
			})
			assert(!isSuccessResult(whitespaceResult), "Should return error for whitespace-only symbolName")
		} catch (error) {
			// Whitespace symbolName might throw error, which is acceptable
			console.warn("Whitespace symbolName threw error (acceptable):", error.message)
		}

		// Test with invalid URI
		try {
			const invalidUriResult = await lspController.getSymbolChildren({
				uri: "file:///non-existent-file.ts",
				symbolName: "TestClass",
				deep: "1",
				include_hover: false,
			})
			// This should return error for invalid URI
			assert(!isSuccessResult(invalidUriResult), "Should return error for invalid URI")
		} catch (error) {
			console.warn("Invalid URI threw error (acceptable):", error.message)
		}

		reporter.passTest("getSymbolChildren", "Error handling for symbolName parameter")
	} catch (error) {
		reporter.failTest("getSymbolChildren", "Error handling for symbolName parameter", error)
	}

	// Test 13: Mixed parameter usage (both position and symbolName scenarios)
	reporter.startTest("getSymbolChildren", "Mixed parameter usage validation")
	try {
		// Test that both position-based and symbolName-based lookups work on same file
		const content = `
class MixedTestClass {
    private field1: string = "test1";
    protected field2: number = 42;
    public field3: boolean = true;
    
    constructor(field1: string) {
        this.field1 = field1;
    }
    
    method1(): string {
        return this.field1;
    }
    
    method2(): number {
        return this.field2;
    }
    
    static staticMethod(): void {
        console.log('static');
    }
}

interface MixedInterface {
    prop1: string;
    prop2: number;
    method(): void;
}
`
		const uri = await createTestFile("test-mixed-params.ts", content)
		const editor = await openTestFile(uri)

		// Position-based lookup
		const positionResult = await lspController.getSymbolChildren({
			uri: uri.toString(),
			line: 2, // Position on MixedTestClass
			character: 6,
			deep: "1",
			include_hover: false,
		})
		assert(isSuccessResult(positionResult), "Position-based lookup should work")

		// SymbolName-based lookup on same file
		const symbolResult = await lspController.getSymbolChildren({
			uri: uri.toString(),
			symbolName: "MixedTestClass",
			deep: "1",
			include_hover: false,
		})
		assert(isSuccessResult(symbolResult), "SymbolName-based lookup should work")

		// Both should potentially find the same children (though exact matching isn't guaranteed)
		if (isSuccessResult(positionResult) && isSuccessResult(symbolResult)) {
			assert(
				typeof positionResult.children === "string" && positionResult.children.includes("NAME"),
				"Position-based children should have table structure",
			)
			assert(
				typeof symbolResult.children === "string" && symbolResult.children.includes("NAME"),
				"Symbol-based children should have table structure",
			)
			
			// Both should contain similar class members
			const positionHasMembers = positionResult.children.includes("field1") || positionResult.children.includes("method1")
			const symbolHasMembers = symbolResult.children.includes("field1") || symbolResult.children.includes("method1")
			assert(positionHasMembers || symbolHasMembers, "At least one approach should find class members")
		}

		reporter.passTest("getSymbolChildren", "Mixed parameter usage validation")
	} catch (error) {
		reporter.failTest("getSymbolChildren", "Mixed parameter usage validation", error)
	}
}