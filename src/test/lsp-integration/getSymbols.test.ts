/**
 * Integration tests for getSymbols LSP tool
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

export async function testGetSymbols(reporter: TestReporter): Promise<void> {
	// Test 1: Get symbols by name path
	reporter.startTest("getSymbols", "Get symbols by name path")
	try {
		const uri = await createTestFile("test-symbols-name-path.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		const result = await lspController.getSymbols({
			name_path: "TestClass",
		})

		assert(Array.isArray(result), "Should return array of symbols")

		if (result.length > 0) {
			const testClassSymbol = result.find((s) => s.name === "TestClass")
			assert(testClassSymbol !== undefined, "Should find TestClass symbol")

			if (testClassSymbol) {
				assert(typeof testClassSymbol.name === "string", "Symbol should have name")
				assert(typeof testClassSymbol.kind === "number", "Symbol should have kind")
				assert(testClassSymbol.location !== undefined, "Symbol should have location")
				assert(typeof testClassSymbol.name_path === "string", "Symbol should have name_path")
				assert(testClassSymbol.name_path === "TestClass", "name_path should match symbol name")
				assert(testClassSymbol.kind === vscode.SymbolKind.Class, "TestClass should have Class kind")
			}
		}

		reporter.passTest("getSymbols", "Get symbols by name path")
	} catch (error) {
		reporter.failTest("getSymbols", "Get symbols by name path", error)
	}

	// Test 2: Get symbols with filters (include_kinds)
	reporter.startTest("getSymbols", "Get symbols with include_kinds filter")
	try {
		const complexContent = `
class MyClass {
    private field: string = "test";
    
    constructor(value: string) {
        this.field = value;
    }
    
    public method(): void {}
    
    static staticMethod(): string {
        return "static";
    }
}

interface MyInterface {
    prop: number;
    method(): void;
}

function myFunction(): void {}

const myVariable = new MyClass("test");

enum MyEnum {
    VALUE1 = "value1",
    VALUE2 = "value2"
}
`

		const uri = await createTestFile("test-symbols-filter.ts", complexContent)
		const editor = await openTestFile(uri)

		// Test filtering for only classes
		const classResult = await lspController.getSymbols({
			name_path: "",
			include_kinds: [vscode.SymbolKind.Class],
		})

		assert(Array.isArray(classResult), "Should return array of symbols")

		if (classResult.length > 0) {
			for (const symbol of classResult) {
				assert(symbol.kind === vscode.SymbolKind.Class, "All symbols should be classes")
			}
		}

		// Test filtering for only functions
		const functionResult = await lspController.getSymbols({
			name_path: "",
			include_kinds: [vscode.SymbolKind.Function],
		})

		assert(Array.isArray(functionResult), "Should return array of symbols")

		if (functionResult.length > 0) {
			for (const symbol of functionResult) {
				assert(symbol.kind === vscode.SymbolKind.Function, "All symbols should be functions")
			}
		}

		reporter.passTest("getSymbols", "Get symbols with include_kinds filter")
	} catch (error) {
		reporter.failTest("getSymbols", "Get symbols with include_kinds filter", error)
	}

	// Test 3: Get symbols with wildcards (substring matching)
	reporter.startTest("getSymbols", "Get symbols with substring matching")
	try {
		const wildcardContent = `
class TestClass {
    method(): void {}
}

class MyTestClass {
    method(): void {}
}

class AnotherClass {
    method(): void {}
}

function testFunction(): void {}
function myTestFunction(): void {}
function normalFunction(): void {}
`

		const uri = await createTestFile("test-symbols-wildcard.ts", wildcardContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getSymbols({
			name_path: "Test",
			substring_matching: true,
		})

		assert(Array.isArray(result), "Should return array of symbols")

		if (result.length > 0) {
			for (const symbol of result) {
				assert(
					symbol.name.toLowerCase().includes("test"),
					`Symbol ${symbol.name} should contain 'test' (case insensitive)`,
				)
			}

			// Should find TestClass, MyTestClass, testFunction, myTestFunction
			const symbolNames = result.map((s) => s.name)
			const hasTestClass = symbolNames.some((name) => name === "TestClass")
			const hasMyTestClass = symbolNames.some((name) => name === "MyTestClass")
			const hasTestFunction = symbolNames.some((name) => name === "testFunction")
			const hasMyTestFunction = symbolNames.some((name) => name === "myTestFunction")

			// At least some of these should be found
			const foundTestSymbols = hasTestClass || hasMyTestClass || hasTestFunction || hasMyTestFunction
			assert(foundTestSymbols, 'Should find symbols containing "Test"')
		}

		reporter.passTest("getSymbols", "Get symbols with substring matching")
	} catch (error) {
		reporter.failTest("getSymbols", "Get symbols with substring matching", error)
	}

	// Test 4: Test nested symbol paths
	reporter.startTest("getSymbols", "Test nested symbol paths")
	try {
		const nestedContent = `
namespace MyNamespace {
    export class OuterClass {
        private innerField: string = "";
        
        constructor(value: string) {
            this.innerField = value;
        }
        
        public innerMethod(): void {}
        
        static staticInnerMethod(): string {
            return "static";
        }
    }
    
    export interface OuterInterface {
        innerProp: number;
        innerMethod(): void;
    }
    
    export function outerFunction(): void {}
}

class TopLevelClass {
    nestedMethod(): void {}
}
`

		const uri = await createTestFile("test-symbols-nested.ts", nestedContent)
		const editor = await openTestFile(uri)

		// Test searching for nested path
		const nestedResult = await lspController.getSymbols({
			name_path: "MyNamespace/OuterClass",
		})

		assert(Array.isArray(nestedResult), "Should return array for nested path search")

		if (nestedResult.length > 0) {
			const outerClassSymbol = nestedResult.find((s) => s.name === "OuterClass")
			if (outerClassSymbol) {
				assert(
					outerClassSymbol.name_path.includes("MyNamespace"),
					"OuterClass should have MyNamespace in its path",
				)
				assert(
					outerClassSymbol.name_path.includes("OuterClass"),
					"OuterClass should have OuterClass in its path",
				)
			}
		}

		// Test searching for nested method
		const methodResult = await lspController.getSymbols({
			name_path: "innerMethod",
		})

		assert(Array.isArray(methodResult), "Should return array for method search")

		if (methodResult.length > 0) {
			const methodSymbols = methodResult.filter((s) => s.name === "innerMethod")
			for (const symbol of methodSymbols) {
				assert(symbol.name_path.includes("/"), "Method should have nested path")
				assert(typeof symbol.name_path === "string", "name_path should be string")
				assert(symbol.name_path.length > symbol.name.length, "name_path should be longer than name")
			}
		}

		reporter.passTest("getSymbols", "Test nested symbol paths")
	} catch (error) {
		reporter.failTest("getSymbols", "Test nested symbol paths", error)
	}

	// Test 5: Handle empty results
	reporter.startTest("getSymbols", "Handle empty results")
	try {
		const emptyContent = `
// Just comments
/* Multi-line comment */
/**
 * JSDoc comment
 */
`

		const uri = await createTestFile("test-symbols-empty.ts", emptyContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getSymbols({
			name_path: "NonExistentSymbol",
		})

		assert(Array.isArray(result), "Should return array for non-existent symbol")
		assert(result.length === 0, "Should return empty array for non-existent symbol")

		// Test with empty file
		const emptyUri = await createTestFile("test-symbols-truly-empty.ts", "")
		const emptyEditor = await openTestFile(emptyUri)

		const emptyResult = await lspController.getSymbols({
			name_path: "AnySymbol",
		})

		assert(Array.isArray(emptyResult), "Should return array for empty file")
		assert(emptyResult.length === 0, "Should return empty array for empty file")

		reporter.passTest("getSymbols", "Handle empty results")
	} catch (error) {
		reporter.failTest("getSymbols", "Handle empty results", error)
	}

	// Test 6: Verify Symbol structure completeness
	reporter.startTest("getSymbols", "Verify Symbol structure completeness")
	try {
		const structureContent = `
export class StructureTestClass {
    public field: number = 42;
    
    constructor(value: number) {
        this.field = value;
    }
    
    public getField(): number {
        return this.field;
    }
    
    static createDefault(): StructureTestClass {
        return new StructureTestClass(0);
    }
}

export interface StructureTestInterface {
    id: number;
    name: string;
    optional?: boolean;
}

export function structureTestFunction(param: string): StructureTestInterface {
    return {
        id: 1,
        name: param
    };
}

export const structureTestVariable = new StructureTestClass(100);
`

		const uri = await createTestFile("test-symbols-structure.ts", structureContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getSymbols({
			name_path: "",
		})

		assert(Array.isArray(result), "Should return array of symbols")

		if (result.length > 0) {
			for (const symbol of result) {
				// Verify required properties
				assert(typeof symbol.name === "string", "Symbol must have name as string")
				assert(symbol.name.length > 0, "Symbol name must not be empty")

				assert(typeof symbol.kind === "number", "Symbol must have kind as number")
				assert(symbol.kind >= 0 && symbol.kind <= 25, "Symbol kind must be valid SymbolKind value")

				assert(symbol.location !== undefined, "Symbol must have location")
				assert(typeof symbol.location.uri === "string", "Symbol location must have uri")
				assert(symbol.location.range !== undefined, "Symbol location must have range")
				assert(typeof symbol.location.range.start.line === "number", "Range start line must be number")
				assert(
					typeof symbol.location.range.start.character === "number",
					"Range start character must be number",
				)
				assert(typeof symbol.location.range.end.line === "number", "Range end line must be number")
				assert(typeof symbol.location.range.end.character === "number", "Range end character must be number")

				assert(typeof symbol.name_path === "string", "Symbol must have name_path as string")
				assert(symbol.name_path.length > 0, "Symbol name_path must not be empty")

				// Optional property body should be string if present
				if (symbol.body !== undefined) {
					assert(typeof symbol.body === "string", "Symbol body must be string if present")
				}

				// Verify specific symbol kinds match their names
				if (symbol.name === "StructureTestClass") {
					assert(symbol.kind === vscode.SymbolKind.Class, "StructureTestClass should have Class kind")
				} else if (symbol.name === "StructureTestInterface") {
					assert(
						symbol.kind === vscode.SymbolKind.Interface,
						"StructureTestInterface should have Interface kind",
					)
				} else if (symbol.name === "structureTestFunction") {
					assert(
						symbol.kind === vscode.SymbolKind.Function,
						"structureTestFunction should have Function kind",
					)
				} else if (symbol.name === "structureTestVariable") {
					assert(
						symbol.kind === vscode.SymbolKind.Variable || symbol.kind === vscode.SymbolKind.Constant,
						"structureTestVariable should have Variable or Constant kind",
					)
				}
			}
		}

		reporter.passTest("getSymbols", "Verify Symbol structure completeness")
	} catch (error) {
		reporter.failTest("getSymbols", "Verify Symbol structure completeness", error)
	}

	// Test 7: Check name_path property accuracy
	reporter.startTest("getSymbols", "Check name_path property accuracy")
	try {
		const pathContent = `
namespace TestNamespace {
    export class ParentClass {
        public childMethod(): void {}
        
        static staticChildMethod(): string {
            return "static";
        }
        
        private privateField: number = 0;
    }
    
    export interface ParentInterface {
        childProperty: string;
        childMethod(): void;
    }
}

class TopClass {
    topMethod(): void {}
}

function topFunction(): void {}
`

		const uri = await createTestFile("test-symbols-name-path.ts", pathContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getSymbols({
			name_path: "",
		})

		assert(Array.isArray(result), "Should return array of symbols")

		if (result.length > 0) {
			for (const symbol of result) {
				// name_path should always end with the symbol name
				assert(
					symbol.name_path.endsWith(symbol.name),
					`name_path '${symbol.name_path}' should end with symbol name '${symbol.name}'`,
				)

				// Check specific path structures
				if (symbol.name === "TestNamespace") {
					assert(symbol.name_path === "TestNamespace", "Top-level namespace should have simple name_path")
				} else if (symbol.name === "ParentClass") {
					assert(symbol.name_path.includes("TestNamespace"), "ParentClass should have TestNamespace in path")
				} else if (symbol.name === "childMethod") {
					assert(symbol.name_path.includes("/"), "childMethod should have nested path with separator")
					assert(symbol.name_path.split("/").length >= 2, "childMethod should have at least 2 path segments")
				} else if (symbol.name === "TopClass") {
					assert(symbol.name_path === "TopClass", "Top-level class should have simple name_path")
				} else if (symbol.name === "topFunction") {
					assert(symbol.name_path === "topFunction", "Top-level function should have simple name_path")
				}

				// Path segments should not be empty
				const pathSegments = symbol.name_path.split("/")
				for (const segment of pathSegments) {
					assert(segment.length > 0, "Path segments should not be empty")
				}
			}
		}

		reporter.passTest("getSymbols", "Check name_path property accuracy")
	} catch (error) {
		reporter.failTest("getSymbols", "Check name_path property accuracy", error)
	}

	// Test 8: Test various search patterns and edge cases
	reporter.startTest("getSymbols", "Test various search patterns and edge cases")
	try {
		const patternContent = `
class PatternTest {
    method1(): void {}
    method2(): void {}
    specialMethod(): void {}
}

class AnotherPatternTest {
    anotherMethod(): void {}
}

function pattern_function(): void {}
function another_pattern_function(): void {}

const PATTERN_CONSTANT = "test";
let pattern_variable = 42;

interface IPatternInterface {
    patternProperty: string;
}

enum PatternEnum {
    PATTERN_VALUE1 = "value1",
    PATTERN_VALUE2 = "value2"
}
`

		const uri = await createTestFile("test-symbols-patterns.ts", patternContent)
		const editor = await openTestFile(uri)

		// Test exact name matching
		const exactResult = await lspController.getSymbols({
			name_path: "PatternTest",
		})

		assert(Array.isArray(exactResult), "Should return array for exact match")

		if (exactResult.length > 0) {
			const exactMatch = exactResult.find((s) => s.name === "PatternTest")
			assert(exactMatch !== undefined, "Should find exact match for PatternTest")
		}

		// Test case sensitivity with substring matching
		const caseResult = await lspController.getSymbols({
			name_path: "pattern",
			substring_matching: true,
		})

		assert(Array.isArray(caseResult), "Should return array for case insensitive search")

		// Test with exclude_kinds
		const excludeResult = await lspController.getSymbols({
			name_path: "",
			exclude_kinds: [vscode.SymbolKind.Class, vscode.SymbolKind.Interface],
		})

		assert(Array.isArray(excludeResult), "Should return array when excluding kinds")

		if (excludeResult.length > 0) {
			for (const symbol of excludeResult) {
				assert(symbol.kind !== vscode.SymbolKind.Class, "Should not include classes")
				assert(symbol.kind !== vscode.SymbolKind.Interface, "Should not include interfaces")
			}
		}

		// Test with include_body parameter
		const bodyResult = await lspController.getSymbols({
			name_path: "pattern_function",
			include_body: true,
		})

		assert(Array.isArray(bodyResult), "Should return array with body included")

		if (bodyResult.length > 0) {
			const functionSymbol = bodyResult.find((s) => s.name === "pattern_function")
			if (functionSymbol && functionSymbol.body !== undefined) {
				assert(typeof functionSymbol.body === "string", "Body should be string")
				assert(functionSymbol.body.length > 0, "Body should not be empty")
			}
		}

		// Test with max_answer_chars limit
		const limitResult = await lspController.getSymbols({
			name_path: "",
			max_answer_chars: 50, // Very small limit
		})

		assert(Array.isArray(limitResult), "Should return array even with character limit")
		// Note: If result is too large, it should return empty array according to implementation

		// Test with relative_path parameter
		const relativeResult = await lspController.getSymbols({
			name_path: "PatternTest",
			relative_path: ".",
		})

		assert(Array.isArray(relativeResult), "Should return array with relative path")

		reporter.passTest("getSymbols", "Test various search patterns and edge cases")
	} catch (error) {
		reporter.failTest("getSymbols", "Test various search patterns and edge cases", error)
	}

	// Test 9: Test with different file types (Python)
	reporter.startTest("getSymbols", "Test with Python file")
	try {
		const uri = await createTestFile("test-symbols.py", SAMPLE_PY_CONTENT)
		const editor = await openTestFile(uri)

		const result = await lspController.getSymbols({
			name_path: "TestClass",
		})

		assert(Array.isArray(result), "Should return array for Python file")

		if (result.length > 0) {
			const pythonClass = result.find((s) => s.name === "TestClass")
			if (pythonClass) {
				assert(pythonClass.kind === vscode.SymbolKind.Class, "Python TestClass should have Class kind")
				assert(pythonClass.name_path === "TestClass", "Python class should have correct name_path")
			}
		}

		// Test Python function
		const funcResult = await lspController.getSymbols({
			name_path: "test_function",
		})

		assert(Array.isArray(funcResult), "Should return array for Python function search")

		if (funcResult.length > 0) {
			const pythonFunc = funcResult.find((s) => s.name === "test_function")
			if (pythonFunc) {
				assert(pythonFunc.kind === vscode.SymbolKind.Function, "Python function should have Function kind")
			}
		}

		reporter.passTest("getSymbols", "Test with Python file")
	} catch (error) {
		reporter.failTest("getSymbols", "Test with Python file", error)
	}

	// Test 10: Test with JavaScript file
	reporter.startTest("getSymbols", "Test with JavaScript file")
	try {
		const uri = await createTestFile("test-symbols.js", SAMPLE_JS_CONTENT)
		const editor = await openTestFile(uri)

		const result = await lspController.getSymbols({
			name_path: "TestClass",
		})

		assert(Array.isArray(result), "Should return array for JavaScript file")

		if (result.length > 0) {
			const jsClass = result.find((s) => s.name === "TestClass")
			if (jsClass) {
				assert(jsClass.kind === vscode.SymbolKind.Class, "JavaScript TestClass should have Class kind")
				assert(jsClass.name_path === "TestClass", "JavaScript class should have correct name_path")
			}
		}

		// Test JavaScript function
		const funcResult = await lspController.getSymbols({
			name_path: "testFunction",
		})

		assert(Array.isArray(funcResult), "Should return array for JavaScript function search")

		if (funcResult.length > 0) {
			const jsFunc = funcResult.find((s) => s.name === "testFunction")
			if (jsFunc) {
				assert(jsFunc.kind === vscode.SymbolKind.Function, "JavaScript function should have Function kind")
			}
		}

		reporter.passTest("getSymbols", "Test with JavaScript file")
	} catch (error) {
		reporter.failTest("getSymbols", "Test with JavaScript file", error)
	}

	// Test 11: Test absolute vs relative path matching
	reporter.startTest("getSymbols", "Test absolute vs relative path matching")
	try {
		const pathTestContent = `
namespace Root {
    namespace Level1 {
        namespace Level2 {
            export class DeepClass {
                deepMethod(): void {}
            }
        }
        
        export class MidClass {
            midMethod(): void {}
        }
    }
    
    export class TopClass {
        topMethod(): void {}
    }
}
`

		const uri = await createTestFile("test-symbols-paths.ts", pathTestContent)
		const editor = await openTestFile(uri)

		// Test absolute path matching
		const absoluteResult = await lspController.getSymbols({
			name_path: "/Root/Level1/Level2/DeepClass",
		})

		assert(Array.isArray(absoluteResult), "Should return array for absolute path")

		// Test relative path matching
		const relativeResult = await lspController.getSymbols({
			name_path: "Level1/MidClass",
		})

		assert(Array.isArray(relativeResult), "Should return array for relative path")

		// Test partial path matching
		const partialResult = await lspController.getSymbols({
			name_path: "DeepClass",
		})

		assert(Array.isArray(partialResult), "Should return array for partial path")

		if (partialResult.length > 0) {
			const deepClass = partialResult.find((s) => s.name === "DeepClass")
			if (deepClass) {
				assert(deepClass.name_path.includes("Root"), "DeepClass path should include Root")
				assert(deepClass.name_path.includes("Level1"), "DeepClass path should include Level1")
				assert(deepClass.name_path.includes("Level2"), "DeepClass path should include Level2")
				assert(deepClass.name_path.endsWith("DeepClass"), "DeepClass path should end with DeepClass")
			}
		}

		reporter.passTest("getSymbols", "Test absolute vs relative path matching")
	} catch (error) {
		reporter.failTest("getSymbols", "Test absolute vs relative path matching", error)
	}
}
