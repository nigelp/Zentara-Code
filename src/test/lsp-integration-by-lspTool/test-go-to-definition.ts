import { lspTool } from "../../core/tools/lspTool"
import {
	TestResult,
	createTestFile,
	MockTask,
	mockAskApproval,
	mockHandleError,
	mockPushToolResult,
	runTestWithTimeout,
} from "./testHelpers"
import * as vscode from "vscode"

export async function testGoToDefinition(): Promise<TestResult> {
	const tool = "go_to_definition"

	try {
		// Create test TypeScript file with functions, classes, variables and their usages
		const testContent = `
// Test file for go to definition functionality
export function myFunction(param: string): string {
    return "Hello from myFunction: " + param;
}

export const myVariable = "test constant value";

export interface MyInterface {
    property: string;
    method(): void;
}

export class MyClass implements MyInterface {
    property: string = "class property";
    
    constructor(value: string) {
        this.property = value;
    }
    
    method(): void {
        console.log("MyClass method called");
    }
    
    static staticMethod(): string {
        return "static method result";
    }
}

export type MyType = {
    name: string;
    value: number;
};

// Usage examples - these are where we'll test go to definition from
function testUsages() {
    // Function usage - we'll test definition from here
    const result = myFunction("test");  // Line 33, char 19 - should go to line 2
    
    // Variable usage - we'll test definition from here  
    console.log(myVariable);  // Line 36, char 17 - should go to line 5
    
    // Class usage - we'll test definition from here
    const instance = new MyClass("value");  // Line 39, char 25 - should go to line 11
    
    // Method usage - we'll test definition from here
    instance.method();  // Line 42, char 14 - should go to line 18
    
    // Static method usage - we'll test definition from here
    MyClass.staticMethod();  // Line 45, char 13 - should go to line 22
    
    // Interface usage in type annotation
    const obj: MyInterface = instance;  // Line 48, char 16 - should go to line 8
    
    // Type usage in type annotation  
    const typedObj: MyType = { name: "test", value: 42 };  // Line 51, char 21 - should go to line 26
}

// Another function to test cross-function definition lookup
function anotherFunction() {
    return myFunction("from another function");  // Line 56, char 12 - should go to line 2
}
`

		const testUri = await createTestFile("test-go-to-definition.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test going to definition of 'myFunction' from its usage
		// Line 55 in the source (1-based) = line 54 (0-based) in the actual file
		const goToDefinitionParams = {
			textDocument: {
				uri: testUri.toString(),
			},
			position: {
				line: 37, // Line where myFunction is used (0-based) - corresponds to line 38 in the source
				character: 19, // Character position pointing to 'myFunction' in the usage
			},
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "go_to_definition",
				_text: JSON.stringify(goToDefinitionParams),
			},
		}

		// Execute the test with timeout protection
		await runTestWithTimeout(async () => {
			await lspTool(mockTask as any, block, mockAskApproval, mockHandleError, mockPushResult)
		}, 15000) // 15 second timeout

		// Analyze the result
		if (!capturedResult) {
			return {
				tool,
				passed: false,
				error: "No result captured from lspTool execution",
			}
		}

		let resultData
		try {
			resultData = JSON.parse(capturedResult)
		} catch (parseError) {
			// If it's not JSON, check if it's an error message
			if (capturedResult.includes("Error") || capturedResult.includes("error")) {
				return {
					tool,
					passed: false,
					error: `Tool returned error: ${capturedResult}`,
					details: { rawResult: capturedResult },
				}
			}

			return {
				tool,
				passed: false,
				error: `Failed to parse result as JSON: ${parseError}`,
				details: { rawResult: capturedResult },
			}
		}

		// Check if the operation was successful
		if (resultData.success === false) {
			return {
				tool,
				passed: false,
				error: `LSP operation failed: ${resultData.message || "Unknown error"}`,
				details: resultData,
			}
		}

		// Check if we have a successful result with data
		if (resultData.success === true) {
			const locations = resultData.data

			if (!Array.isArray(locations)) {
				return {
					tool,
					passed: false,
					error: "Expected locations array in result data",
					details: resultData,
				}
			}

			// For go to definition, we expect at least one location (the definition)
			if (locations.length === 0) {
				return {
					tool,
					passed: false,
					error: "No definition location found for myFunction",
					details: { locations, resultData },
				}
			}

			// Check that each location has the expected structure
			const validLocations = locations.every(
				(location) =>
					location.uri &&
					typeof location.range === "object" &&
					typeof location.range.start === "object" &&
					typeof location.range.end === "object" &&
					typeof location.range.start.line === "number" &&
					typeof location.range.start.character === "number",
			)

			if (!validLocations) {
				return {
					tool,
					passed: false,
					error: "Location objects do not have expected structure",
					details: { locations, resultData },
				}
			}

			// Verify the definition location is reasonable
			// The function definition should be on line 20 (0-based: line 19) in the actual file
			const definitionLocation = locations[0]
			const expectedLine = 2 // Line where 'export function myFunction' is defined (0-based)

			// Allow some tolerance in line numbers due to potential LSP differences
			const actualLine = definitionLocation.range.start.line
			const lineTolerance = 3 // Allow 3 lines of difference

			if (Math.abs(actualLine - expectedLine) > lineTolerance) {
				return {
					tool,
					passed: false,
					error: `Definition found at unexpected line. Expected around line ${expectedLine}, got line ${actualLine}`,
					details: {
						expectedLine,
						actualLine,
						tolerance: lineTolerance,
						locations,
						resultData,
					},
				}
			}

			// Verify the definition points to the same file
			const definitionUri = definitionLocation.uri
			if (!definitionUri.includes("test-go-to-definition.ts")) {
				return {
					tool,
					passed: false,
					error: `Definition found in unexpected file: ${definitionUri}`,
					details: {
						expectedFile: "test-go-to-definition.ts",
						actualUri: definitionUri,
						locations,
						resultData,
					},
				}
			}

			// Success: we found the definition at a reasonable location
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully found definition of myFunction at line ${actualLine}`,
					definitionLocation: {
						uri: definitionLocation.uri,
						line: definitionLocation.range.start.line,
						character: definitionLocation.range.start.character,
					},
					locationCount: locations.length,
					allLocations: locations.map((loc) => ({
						uri: loc.uri,
						line: loc.range.start.line,
						character: loc.range.start.character,
					})),
				},
			}
		}

		// Handle unexpected result structure
		return {
			tool,
			passed: false,
			error: "Unexpected result structure - no success field",
			details: resultData,
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)

		// Check for common timeout or LSP unavailability issues
		if (errorMessage.includes("timeout") || errorMessage.includes("Test timed out")) {
			return {
				tool,
				passed: false,
				error: "Test timed out - LSP server may not be available or responsive",
				details: { timeout: true, originalError: errorMessage },
			}
		}

		if (
			errorMessage.includes("LSP server not available") ||
			errorMessage.includes("language server") ||
			errorMessage.includes("not initialized")
		) {
			return {
				tool,
				passed: false,
				error: "LSP server not available - this is expected in test environments without active language servers",
				details: { lspUnavailable: true, originalError: errorMessage },
			}
		}

		return {
			tool,
			passed: false,
			error: `Unexpected error during test execution: ${errorMessage}`,
			details: {
				stack: error instanceof Error ? error.stack : undefined,
				originalError: errorMessage,
			},
		}
	}
}
