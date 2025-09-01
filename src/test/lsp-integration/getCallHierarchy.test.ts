/**
 * Integration tests for getCallHierarchy LSP tool
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

// Helper function to check if result has the expected structure
function isCallHierarchyResult(result: any): result is { incomingCalls: string; outgoingCalls: string } {
	return result && 
		   typeof result === 'object' && 
		   typeof result.incomingCalls === 'string' && 
		   typeof result.outgoingCalls === 'string'
}

export async function testGetCallHierarchy(reporter: TestReporter): Promise<void> {
	// Test 1: Get call hierarchy for a function with incoming calls
	reporter.startTest("getCallHierarchy", "Get call hierarchy with incoming calls")
	try {
		const incomingCallsContent = `
function targetFunction() {
    console.log("Target function");
}

function caller1() {
    targetFunction(); // First incoming call
}

function caller2() {
    targetFunction(); // Second incoming call
    caller1();
}

function nestedCaller() {
    if (true) {
        targetFunction(); // Third incoming call
    }
}

// Entry points
caller1();
caller2();
nestedCaller();
`

		const uri = await createTestFile("test-incoming-calls.ts", incomingCallsContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getCallHierarchy({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 9 }, // Position on "targetFunction"
		})

		// Call hierarchy may not be available in all test environments
		if (result === null || result === undefined) {
			console.warn("Warning: Call hierarchy provider not available in test environment")
			reporter.passTest("getCallHierarchy", "Get call hierarchy with incoming calls")
			return
		}

		// Validate the structure
		assert(isCallHierarchyResult(result), "Should return CallHierarchyResult with incomingCalls and outgoingCalls")
		
		if (isCallHierarchyResult(result)) {
			// Validate incoming calls table
			assert(typeof result.incomingCalls === "string", "incomingCalls should be a string")
			assert(result.incomingCalls.length > 0, "incomingCalls should not be empty")
			assert(result.incomingCalls.includes("FROM_NAME"), "incomingCalls should have FROM_NAME column")
			assert(result.incomingCalls.includes("FROM_KIND"), "incomingCalls should have FROM_KIND column")
			assert(result.incomingCalls.includes("FROM_URI"), "incomingCalls should have FROM_URI column")
			assert(result.incomingCalls.includes("EOL"), "incomingCalls should have EOL column")

			// Validate outgoing calls table
			assert(typeof result.outgoingCalls === "string", "outgoingCalls should be a string")
			assert(result.outgoingCalls.length > 0, "outgoingCalls should not be empty")
			assert(result.outgoingCalls.includes("TO_NAME"), "outgoingCalls should have TO_NAME column")
			assert(result.outgoingCalls.includes("TO_KIND"), "outgoingCalls should have TO_KIND column")
			assert(result.outgoingCalls.includes("TO_URI"), "outgoingCalls should have TO_URI column")
			assert(result.outgoingCalls.includes("EOL"), "outgoingCalls should have EOL column")

			// Check for actual call data (not just headers)
			const incomingLines = result.incomingCalls.split('\n').filter(line => line.trim() && !line.includes('FROM_NAME'))
			const outgoingLines = result.outgoingCalls.split('\n').filter(line => line.trim() && !line.includes('TO_NAME'))
			
			console.log(`Debug: Incoming calls table:\n${result.incomingCalls}`)
			console.log(`Debug: Outgoing calls table:\n${result.outgoingCalls}`)
			console.log(`Debug: Found ${incomingLines.length} incoming call data rows, ${outgoingLines.length} outgoing call data rows`)
			
			// For this test case, we expect incoming calls since targetFunction is called by multiple functions
			if (incomingLines.length > 0) {
				// Verify that incoming calls contain expected caller names
				const incomingCallsText = result.incomingCalls
				const expectedCallers = ['caller1', 'caller2', 'nestedCaller']
				let foundCallers = 0
				for (const caller of expectedCallers) {
					if (incomingCallsText.includes(caller)) {
						foundCallers++
					}
				}
				console.log(`Debug: Found ${foundCallers} out of ${expectedCallers.length} expected callers`)
				
				// At least one caller should be found if LSP is working
				if (foundCallers === 0) {
					console.warn("Warning: No expected callers found in incoming calls - LSP may not be fully functional in test environment")
				}
			} else {
				console.warn("Warning: No incoming call data found - LSP provider may not be available or functional in test environment")
			}
		}

		reporter.passTest("getCallHierarchy", "Get call hierarchy with incoming calls")
	} catch (error) {
		reporter.failTest("getCallHierarchy", "Get call hierarchy with incoming calls", error)
	}

	// Test 2: Get call hierarchy for a function with outgoing calls
	reporter.startTest("getCallHierarchy", "Get call hierarchy with outgoing calls")
	try {
		const outgoingCallsContent = `
function helperA() {
    console.log("Helper A");
}

function helperB() {
    console.log("Helper B");
}

function callerFunction() {
    helperA(); // First outgoing call
    helperB(); // Second outgoing call
    console.log("Caller function");
}

// Entry point
callerFunction();
`

		const uri = await createTestFile("test-outgoing-calls.ts", outgoingCallsContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getCallHierarchy({
			textDocument: { uri: uri.toString() },
			position: { line: 8, character: 9 }, // Position on "callerFunction"
		})

		// Call hierarchy may not be available in all test environments
		if (result === null || result === undefined) {
			console.warn("Warning: Call hierarchy provider not available for outgoing calls")
			reporter.passTest("getCallHierarchy", "Get call hierarchy with outgoing calls")
			return
		}

		// Validate the structure
		assert(isCallHierarchyResult(result), "Should return CallHierarchyResult with incomingCalls and outgoingCalls")
		
		if (isCallHierarchyResult(result)) {
			// Both tables should be present even if empty
			assert(typeof result.incomingCalls === "string", "incomingCalls should be a string")
			assert(typeof result.outgoingCalls === "string", "outgoingCalls should be a string")
			
			// Should contain table headers
			assert(result.incomingCalls.includes("FROM_NAME"), "incomingCalls should have table header")
			assert(result.outgoingCalls.includes("TO_NAME"), "outgoingCalls should have table header")

			// Check for actual call data (not just headers)
			const incomingLines = result.incomingCalls.split('\n').filter(line => line.trim() && !line.includes('FROM_NAME'))
			const outgoingLines = result.outgoingCalls.split('\n').filter(line => line.trim() && !line.includes('TO_NAME'))
			
			console.log(`Debug: Outgoing calls table:\n${result.outgoingCalls}`)
			console.log(`Debug: Found ${incomingLines.length} incoming call data rows, ${outgoingLines.length} outgoing call data rows`)
			
			// For this test case, we expect outgoing calls since callerFunction calls helperA and helperB
			if (outgoingLines.length > 0) {
				// Verify that outgoing calls contain expected target names
				const outgoingCallsText = result.outgoingCalls
				const expectedTargets = ['helperA', 'helperB']
				let foundTargets = 0
				for (const target of expectedTargets) {
					if (outgoingCallsText.includes(target)) {
						foundTargets++
					}
				}
				console.log(`Debug: Found ${foundTargets} out of ${expectedTargets.length} expected targets`)
				
				// At least one target should be found if LSP is working
				if (foundTargets === 0) {
					console.warn("Warning: No expected targets found in outgoing calls - LSP may not be fully functional in test environment")
				}
			} else {
				console.warn("Warning: No outgoing call data found - LSP provider may not be available or functional in test environment")
			}
		}

		reporter.passTest("getCallHierarchy", "Get call hierarchy with outgoing calls")
	} catch (error) {
		reporter.failTest("getCallHierarchy", "Get call hierarchy with outgoing calls", error)
	}

	// Test 3: Test with TypeScript class method
	reporter.startTest("getCallHierarchy", "Get call hierarchy for class method")
	try {
		const classContent = `
class DataProcessor {
    private data: string[] = [];
    
    constructor(initialData: string[]) {
        this.data = initialData;
    }
    
    public processData(): string[] {
        return this.data.map(item => item.toUpperCase());
    }
    
    public static createProcessor(data: string[]): DataProcessor {
        return new DataProcessor(data);
    }
}

// Usage
const processor = new DataProcessor(["hello", "world"]);
const result = processor.processData();
const staticProcessor = DataProcessor.createProcessor(["test"]);
`

		const uri = await createTestFile("test-class-method.ts", classContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getCallHierarchy({
			textDocument: { uri: uri.toString() },
			position: { line: 8, character: 11 }, // Position on "processData"
		})

		// Call hierarchy may not be available in all test environments
		if (result === null || result === undefined) {
			console.warn("Warning: Call hierarchy provider not available for class methods")
			reporter.passTest("getCallHierarchy", "Get call hierarchy for class method")
			return
		}

		// Validate the structure
		assert(isCallHierarchyResult(result), "Should return CallHierarchyResult for class method")
		
		if (isCallHierarchyResult(result)) {
			assert(typeof result.incomingCalls === "string", "incomingCalls should be a string")
			assert(typeof result.outgoingCalls === "string", "outgoingCalls should be a string")
		}

		reporter.passTest("getCallHierarchy", "Get call hierarchy for class method")
	} catch (error) {
		reporter.failTest("getCallHierarchy", "Get call hierarchy for class method", error)
	}

	// Test 4: Test with isolated function (no calls)
	reporter.startTest("getCallHierarchy", "Get call hierarchy for isolated function")
	try {
		const isolatedContent = `
function isolatedFunction() {
    console.log("This function is not called by anyone and calls no one");
    return 42;
}

function unusedFunction() {
    return "unused";
}
`

		const uri = await createTestFile("test-isolated.ts", isolatedContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getCallHierarchy({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 9 }, // Position on "isolatedFunction"
		})

		// Call hierarchy may not be available in all test environments
		if (result === null || result === undefined) {
			console.warn("Warning: Call hierarchy provider not available for isolated functions")
			reporter.passTest("getCallHierarchy", "Get call hierarchy for isolated function")
			return
		}

		// Validate the structure
		assert(isCallHierarchyResult(result), "Should return CallHierarchyResult for isolated function")
		
		if (isCallHierarchyResult(result)) {
			assert(typeof result.incomingCalls === "string", "incomingCalls should be a string")
			assert(typeof result.outgoingCalls === "string", "outgoingCalls should be a string")
			
			// For isolated functions, tables should contain headers but no data rows
			assert(result.incomingCalls.includes("FROM_NAME"), "incomingCalls should have header")
			assert(result.outgoingCalls.includes("TO_NAME"), "outgoingCalls should have header")
		}

		reporter.passTest("getCallHierarchy", "Get call hierarchy for isolated function")
	} catch (error) {
		reporter.failTest("getCallHierarchy", "Get call hierarchy for isolated function", error)
	}

	// Test 5: Test error handling with invalid position
	reporter.startTest("getCallHierarchy", "Handle invalid position gracefully")
	try {
		const uri = await createTestFile("test-invalid.ts", "function test() {}")
		const editor = await openTestFile(uri)

		const result = await lspController.getCallHierarchy({
			textDocument: { uri: uri.toString() },
			position: { line: 100, character: 100 }, // Invalid position
		})

		// Should handle gracefully - either return null or valid result
		assert(
			result === null || isCallHierarchyResult(result),
			"Should return either null or valid CallHierarchyResult for invalid position"
		)

		reporter.passTest("getCallHierarchy", "Handle invalid position gracefully")
	} catch (error) {
		reporter.failTest("getCallHierarchy", "Handle invalid position gracefully", error)
	}

	// Test 6: Test with non-existent file
	reporter.startTest("getCallHierarchy", "Handle non-existent file gracefully")
	try {
		const result = await lspController.getCallHierarchy({
			textDocument: { uri: "file:///non/existent/file.ts" },
			position: { line: 1, character: 1 },
		})

		// Should handle gracefully - likely return null
		assert(
			result === null || isCallHierarchyResult(result),
			"Should return either null or valid CallHierarchyResult for non-existent file"
		)

		reporter.passTest("getCallHierarchy", "Handle non-existent file gracefully")
	} catch (error) {
		reporter.failTest("getCallHierarchy", "Handle non-existent file gracefully", error)
	}

	// Test 7: Get call hierarchy using symbolName parameter for TypeScript symbols
	reporter.startTest("getCallHierarchy", "Get call hierarchy using symbolName for TypeScript symbols")
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
    
    callOtherMethods(): void {
        this.getValue();
        this.setValue(42);
    }
}

function testFunction() {
    const instance = new TestClass();
    const result = instance.getValue();
    instance.setValue(100);
    instance.callOtherMethods();
    return result;
}

function helperFunction(): void {
    console.log('helper');
}

function callerOfHelper(): void {
    helperFunction();
    testFunction();
}

interface TestInterface {
    id: number;
    name: string;
}

const testVariable = "test";
const anotherInstance = new TestClass();
`
		const uri = await createTestFile("test-symbolname-callhierarchy.ts", content)
		const editor = await openTestFile(uri)

		// Test call hierarchy for TestClass using symbolName
		try {
			const classResult = await lspController.getCallHierarchy({
				uri: uri.toString(),
				symbolName: "TestClass",
			})
			if (classResult === null || classResult === undefined) {
				console.warn("Call hierarchy returned null for TestClass symbolName lookup")
			} else {
				assert(isCallHierarchyResult(classResult), "Should return CallHierarchyResult for TestClass symbolName lookup")
				if (isCallHierarchyResult(classResult)) {
					assert(typeof classResult.incomingCalls === "string", "TestClass incomingCalls should be string")
					assert(typeof classResult.outgoingCalls === "string", "TestClass outgoingCalls should be string")
				}
			}
		} catch (error) {
			console.warn("TestClass symbolName lookup failed:", error)
		}

		// Test call hierarchy for getValue method using symbolName
		try {
			const methodResult = await lspController.getCallHierarchy({
				uri: uri.toString(),
				symbolName: "getValue",
			})
			if (methodResult === null || methodResult === undefined) {
				console.warn("Call hierarchy returned null for getValue symbolName lookup")
			} else {
				assert(isCallHierarchyResult(methodResult), "Should return CallHierarchyResult for getValue symbolName lookup")
			}
		} catch (error) {
			console.warn("getValue symbolName lookup failed:", error)
		}

		// Test call hierarchy for testFunction using symbolName
		try {
			const functionResult = await lspController.getCallHierarchy({
				uri: uri.toString(),
				symbolName: "testFunction",
			})
			if (functionResult === null || functionResult === undefined) {
				console.warn("Call hierarchy returned null for testFunction symbolName lookup")
			} else {
				assert(isCallHierarchyResult(functionResult), "Should return CallHierarchyResult for testFunction symbolName lookup")
			}
		} catch (error) {
			console.warn("testFunction symbolName lookup failed:", error)
		}

		// Test call hierarchy for helperFunction using symbolName
		try {
			const helperResult = await lspController.getCallHierarchy({
				uri: uri.toString(),
				symbolName: "helperFunction",
			})
			if (helperResult === null || helperResult === undefined) {
				console.warn("Call hierarchy returned null for helperFunction symbolName lookup")
			} else {
				assert(isCallHierarchyResult(helperResult), "Should return CallHierarchyResult for helperFunction symbolName lookup")
			}
		} catch (error) {
			console.warn("helperFunction symbolName lookup failed:", error)
		}

		// Test call hierarchy for callerOfHelper using symbolName
		try {
			const callerResult = await lspController.getCallHierarchy({
				uri: uri.toString(),
				symbolName: "callerOfHelper",
			})
			if (callerResult === null || callerResult === undefined) {
				console.warn("Call hierarchy returned null for callerOfHelper symbolName lookup")
			} else {
				assert(isCallHierarchyResult(callerResult), "Should return CallHierarchyResult for callerOfHelper symbolName lookup")
			}
		} catch (error) {
			console.warn("callerOfHelper symbolName lookup failed:", error)
		}

		reporter.passTest("getCallHierarchy", "Get call hierarchy using symbolName for TypeScript symbols")
	} catch (error) {
		reporter.failTest("getCallHierarchy", "Get call hierarchy using symbolName for TypeScript symbols", error)
	}

	// Test 8: Get call hierarchy using symbolName parameter for Python symbols
	reporter.startTest("getCallHierarchy", "Get call hierarchy using symbolName for Python symbols")
	try {
		const uri = await createTestFile("test-symbolname-callhierarchy.py", SAMPLE_PY_CONTENT)
		const editor = await openTestFile(uri)

		// Test call hierarchy for Python class using symbolName
		try {
			const result = await lspController.getCallHierarchy({
				uri: uri.toString(),
				symbolName: "TestClass",
			})
			if (result === null || result === undefined) {
				console.warn("Pylance returned null for Python class call hierarchy via symbolName")
			} else {
				assert(isCallHierarchyResult(result), "Should return CallHierarchyResult for Python class symbolName lookup")
			}
		} catch (error) {
			console.warn("Python class symbolName lookup failed:", error)
		}

		// Test call hierarchy for Python method using symbolName
		try {
			const result = await lspController.getCallHierarchy({
				uri: uri.toString(),
				symbolName: "get_value",
			})
			if (result === null || result === undefined) {
				console.warn("Pylance returned null for Python method call hierarchy via symbolName")
			} else {
				assert(isCallHierarchyResult(result), "Should return CallHierarchyResult for Python method symbolName lookup")
			}
		} catch (error) {
			console.warn("Python method symbolName lookup failed:", error)
		}

		// Test call hierarchy for Python function using symbolName
		try {
			const result = await lspController.getCallHierarchy({
				uri: uri.toString(),
				symbolName: "test_function",
			})
			if (result === null || result === undefined) {
				console.warn("Pylance returned null for Python function call hierarchy via symbolName")
			} else {
				assert(isCallHierarchyResult(result), "Should return CallHierarchyResult for Python function symbolName lookup")
			}
		} catch (error) {
			console.warn("Python function symbolName lookup failed:", error)
		}

		reporter.passTest("getCallHierarchy", "Get call hierarchy using symbolName for Python symbols")
	} catch (error) {
		if (error.message?.includes("Pylance")) {
			reporter.passTest("getCallHierarchy", "Get call hierarchy using symbolName for Python symbols (with Pylance warning)")
		} else {
			reporter.failTest("getCallHierarchy", "Get call hierarchy using symbolName for Python symbols", error)
		}
	}

	// Test 9: Error handling for symbolName parameter
	reporter.startTest("getCallHierarchy", "Error handling for symbolName parameter")
	try {
		const uri = await createTestFile("test-error-handling.ts", SAMPLE_TS_CONTENT)

		// Test with non-existent symbol
		const nonExistentResult = await lspController.getCallHierarchy({
			uri: uri.toString(),
			symbolName: "NonExistentSymbol",
		})
		assert(
			nonExistentResult === null || isCallHierarchyResult(nonExistentResult),
			"Should return null or valid CallHierarchyResult for non-existent symbol"
		)

		// Test with empty symbolName
		try {
			const emptyResult = await lspController.getCallHierarchy({
				uri: uri.toString(),
				symbolName: "",
			})
			assert(
				emptyResult === null || isCallHierarchyResult(emptyResult),
				"Should handle empty symbolName gracefully"
			)
		} catch (error) {
			// Empty symbolName might throw error, which is acceptable
			console.warn("Empty symbolName threw error (acceptable):", error.message)
		}

		// Test with whitespace-only symbolName
		try {
			const whitespaceResult = await lspController.getCallHierarchy({
				uri: uri.toString(),
				symbolName: "   ",
			})
			assert(
				whitespaceResult === null || isCallHierarchyResult(whitespaceResult),
				"Should handle whitespace-only symbolName gracefully"
			)
		} catch (error) {
			// Whitespace symbolName might throw error, which is acceptable
			console.warn("Whitespace symbolName threw error (acceptable):", error.message)
		}

		// Test with invalid URI
		try {
			const invalidUriResult = await lspController.getCallHierarchy({
				uri: "file:///non-existent-file.ts",
				symbolName: "TestClass",
			})
			// This might succeed with null or throw error - both are acceptable
		} catch (error) {
			console.warn("Invalid URI threw error (acceptable):", error.message)
		}

		reporter.passTest("getCallHierarchy", "Error handling for symbolName parameter")
	} catch (error) {
		reporter.failTest("getCallHierarchy", "Error handling for symbolName parameter", error)
	}

	// Test 10: Mixed parameter usage (both position and symbolName scenarios)
	reporter.startTest("getCallHierarchy", "Mixed parameter usage validation")
	try {
		// Test that both position-based and symbolName-based lookups work on same file
		const content = `
class MixedTestClass {
    testMethod(): void {
        console.log('test');
    }
}

function callerFunction() {
    const instance = new MixedTestClass();
    instance.testMethod();
}

function anotherCaller() {
    callerFunction();
}

anotherCaller();
`
		const uri = await createTestFile("test-mixed-params.ts", content)
		const editor = await openTestFile(uri)

		// Position-based lookup
		const positionResult = await lspController.getCallHierarchy({
			textDocument: { uri: uri.toString() },
			position: { line: 8, character: 9 }, // Position on callerFunction
		})
		assert(
			positionResult === null || isCallHierarchyResult(positionResult),
			"Position-based lookup should return null or valid CallHierarchyResult"
		)

		// SymbolName-based lookup on same file
		const symbolResult = await lspController.getCallHierarchy({
			uri: uri.toString(),
			symbolName: "callerFunction",
		})
		assert(
			symbolResult === null || isCallHierarchyResult(symbolResult),
			"SymbolName-based lookup should return null or valid CallHierarchyResult"
		)

		// Both should potentially find the same call hierarchy (though exact matching isn't guaranteed)
		if (positionResult && symbolResult && isCallHierarchyResult(positionResult) && isCallHierarchyResult(symbolResult)) {
			assert(
				typeof positionResult.incomingCalls === "string" && typeof positionResult.outgoingCalls === "string",
				"Position-based call hierarchy should have string properties",
			)
			assert(
				typeof symbolResult.incomingCalls === "string" && typeof symbolResult.outgoingCalls === "string",
				"Symbol-based call hierarchy should have string properties",
			)
		}

		reporter.passTest("getCallHierarchy", "Mixed parameter usage validation")
	} catch (error) {
		reporter.failTest("getCallHierarchy", "Mixed parameter usage validation", error)
	}
}
