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

export async function testGetDeclaration(): Promise<TestResult> {
	const tool = "get_declaration"

	try {
		// Create test TypeScript file with declarations, implementations, and their usages
		const testContent = `
// Test file for get declaration functionality
// This file tests the ability to find declarations of symbols

// Interface declaration - this is what we'll find when navigating from implementations
export interface ICalculator {
    add(a: number, b: number): number;
    subtract(a: number, b: number): number;
    multiply?(a: number, b: number): number; // Optional method
}

// Type alias declaration - this is what we'll find when navigating from usages
export type CalculatorResult = {
    value: number;
    operation: string;
    timestamp: Date;
};

// Function declaration - this is what we'll find when navigating from implementations
export declare function createCalculator(): ICalculator;

// Variable declaration with type annotation
export declare const DEFAULT_PRECISION: number;

// Class declaration
export declare class MathUtils {
    static PI: number;
    static round(value: number, precision?: number): number;
}

// Namespace declaration
export declare namespace MathOperations {
    interface Config {
        precision: number;
        roundingMode: 'up' | 'down' | 'nearest';
    }
    
    function configure(config: Config): void;
    function getConfig(): Config;
}

// Implementation that references the declared interface
class BasicCalculator implements ICalculator {  // Line 41 - 'ICalculator' usage, should go to line 5
    add(a: number, b: number): number {
        return a + b;
    }
    
    subtract(a: number, b: number): number {
        return a - b;
    }
    
    // Using the declared type
    getResult(value: number, op: string): CalculatorResult {  // Line 51 - 'CalculatorResult' usage, should go to line 12
        return {
            value,
            operation: op,
            timestamp: new Date()
        };
    }
}

// Function that uses declared symbols
function performCalculation(): void {
    // Using declared function
    const calc = createCalculator();  // Line 62 - 'createCalculator' usage, should go to line 19
    
    // Using declared constant
    const precision = DEFAULT_PRECISION;  // Line 65 - 'DEFAULT_PRECISION' usage, should go to line 22
    
    // Using declared class
    const rounded = MathUtils.round(3.14159, precision);  // Line 68 - 'MathUtils' usage, should go to line 25
    
    // Using declared namespace
    MathOperations.configure({  // Line 71 - 'MathOperations' usage, should go to line 30
        precision: 2,
        roundingMode: 'nearest'
    });
}

// Another class implementing the interface
class AdvancedCalculator implements ICalculator {  // Line 78 - 'ICalculator' usage, should go to line 5
    add(a: number, b: number): number {
        return Math.round((a + b) * 1000) / 1000;
    }
    
    subtract(a: number, b: number): number {
        return Math.round((a - b) * 1000) / 1000;
    }
    
    multiply(a: number, b: number): number {
        return Math.round((a * b) * 1000) / 1000;
    }
}

// Function that creates results using the type alias
function createResult(val: number, op: string): CalculatorResult {  // Line 92 - 'CalculatorResult' usage, should go to line 12
    return {
        value: val,
        operation: op,
        timestamp: new Date()
    };
}
`

		const testUri = await createTestFile("test-get-declaration.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test getting declaration of 'ICalculator' from its usage at line 41 (implements ICalculator)
		// Position is 0-based for both line and character
		const getDeclarationParams = {
			textDocument: {
				uri: testUri.toString(),
			},
			position: {
				line: 40, // Line 41 in file (0-based indexing)
				character: 35, // Character position pointing to 'ICalculator' in "implements ICalculator"
			},
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "get_declaration",
				_text: JSON.stringify(getDeclarationParams),
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

			// For get declaration, we expect at least one location (the declaration)
			if (locations.length === 0) {
				return {
					tool,
					passed: false,
					error: "No declaration location found for ICalculator",
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

			// Verify the declaration location is reasonable
			// The interface declaration should be around line 5 (0-based: line 4)
			const declarationLocation = locations[0]
			const expectedLine = 4 // Line where 'export interface ICalculator' is declared (0-based)

			// Allow some tolerance in line numbers due to potential LSP differences
			const actualLine = declarationLocation.range.start.line
			const lineTolerance = 3 // Allow 3 lines of difference for declarations

			if (Math.abs(actualLine - expectedLine) > lineTolerance) {
				return {
					tool,
					passed: false,
					error: `Declaration found at unexpected line. Expected around line ${expectedLine}, got line ${actualLine}`,
					details: {
						expectedLine,
						actualLine,
						tolerance: lineTolerance,
						locations,
						resultData,
					},
				}
			}

			// Verify the declaration points to the same file
			const declarationUri = declarationLocation.uri
			if (!declarationUri.includes("test-get-declaration.ts")) {
				return {
					tool,
					passed: false,
					error: `Declaration found in unexpected file: ${declarationUri}`,
					details: {
						expectedFile: "test-get-declaration.ts",
						actualUri: declarationUri,
						locations,
						resultData,
					},
				}
			}

			// Additional validation: check that we found a declaration, not a definition/implementation
			// Declarations typically use keywords like 'declare', 'interface', 'type', etc.
			// The found location should be in the declaration part of the file
			if (actualLine > 35) {
				// Implementations start around line 36
				return {
					tool,
					passed: false,
					error: `Found implementation instead of declaration. Declaration should be in the early part of the file, found at line ${actualLine}`,
					details: {
						expectedMaxLine: 35,
						actualLine,
						locations,
						resultData,
						note: "get_declaration should find the interface declaration, not the implementation",
					},
				}
			}

			// Success: we found the declaration at a reasonable location
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully found declaration of ICalculator at line ${actualLine}`,
					declarationLocation: {
						uri: declarationLocation.uri,
						line: declarationLocation.range.start.line,
						character: declarationLocation.range.start.character,
					},
					locationCount: locations.length,
					allLocations: locations.map((loc) => ({
						uri: loc.uri,
						line: loc.range.start.line,
						character: loc.range.start.character,
					})),
					testScenario: "Found interface declaration from implementation usage",
					validation: {
						expectedLine,
						actualLine,
						withinTolerance: Math.abs(actualLine - expectedLine) <= lineTolerance,
						isInDeclarationSection: actualLine <= 35,
					},
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
