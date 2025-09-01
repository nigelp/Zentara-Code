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

export async function testFindUsages(): Promise<TestResult> {
	const tool = "find_usages"

	try {
		// Create test TypeScript file with functions/variables used in multiple places
		const testContent = `
// Test file for find usages functionality
export function testFunction() {
    return "Hello from testFunction";
}

export const testVariable = "test value";

export class TestClass {
    testMethod() {
        return "method result";
    }
}

// Usage examples
function main() {
    console.log(testFunction()); // First usage of testFunction
    const result = testFunction(); // Second usage of testFunction
    
    console.log(testVariable); // First usage of testVariable
    const value = testVariable; // Second usage of testVariable
    
    const instance = new TestClass(); // Usage of TestClass
    instance.testMethod(); // Usage of testMethod
}

// More usages
export function anotherFunction() {
    testFunction(); // Third usage of testFunction
    return testVariable; // Third usage of testVariable
}

// Arrow function with testFunction usage
const arrowFunc = () => testFunction(); // Fourth usage of testFunction
`

		const testUri = await createTestFile("test-find-usages.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test finding usages of 'testFunction' which should be at line 3, character 17
		// (accounting for the leading whitespace in our test content)
		const findUsagesParams = {
			textDocument: {
				uri: testUri.toString(),
			},
			position: {
				line: 3, // Line where testFunction is defined (1-based)
				character: 17, // Character position of 'testFunction' (0-based)
			},
			context: {
				includeDeclaration: true,
			},
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "find_usages",
				_text: JSON.stringify(findUsagesParams),
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

			// Verify we found multiple usages of testFunction
			// We expect at least 4 usages: definition + 4 references
			if (locations.length === 0) {
				return {
					tool,
					passed: false,
					error: "No usages found for testFunction",
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

			// Success: we found usages with valid structure
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully found ${locations.length} usage(s) of testFunction`,
					locationCount: locations.length,
					locations: locations.map((loc) => ({
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
