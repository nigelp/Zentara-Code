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

export async function testGetHoverInfo(): Promise<TestResult> {
	const tool = "get_hover_info"

	try {
		// Create a comprehensive test TypeScript file with well-documented functions, classes, and variables
		const testContent = `
/**
 * Test file for hover information functionality
 * This file contains various TypeScript constructs with JSDoc documentation
 */

/**
 * Represents a user in the system
 * @interface User
 */
export interface User {
    /** Unique identifier for the user */
    id: number;
    /** Full name of the user */
    name: string;
    /** Email address of the user */
    email: string;
    /** Whether the user account is active */
    isActive: boolean;
}

/**
 * A utility class for mathematical operations
 * @class Calculator
 * @example
 * const calc = new Calculator();
 * const result = calc.add(5, 3); // returns 8
 */
export class Calculator {
    /** Internal precision setting for calculations */
    private precision: number = 2;
    
    /**
     * Creates a new Calculator instance
     * @param precision - The decimal precision for calculations (default: 2)
     */
    constructor(precision: number = 2) {
        this.precision = precision;
    }
    
    /**
     * Adds two numbers together
     * @param a - The first number to add
     * @param b - The second number to add
     * @returns The sum of a and b
     * @example
     * calculator.add(5, 3); // returns 8
     */
    public add(a: number, b: number): number {
        const result = a + b;
        return Math.round(result * Math.pow(10, this.precision)) / Math.pow(10, this.precision);
    }
    
    /**
     * Multiplies two numbers
     * @param x - First multiplicand
     * @param y - Second multiplicand
     * @returns The product of x and y
     */
    public multiply(x: number, y: number): number {
        return this.add(0, x * y); // Using add method for demonstration
    }
    
    /**
     * Gets the current precision setting
     * @returns The precision value
     */
    public getPrecision(): number {
        return this.precision;
    }
    
    /**
     * A static utility method for quick calculations
     * @param values - Array of numbers to sum
     * @returns The total sum of all values
     */
    static sum(values: number[]): number {
        return values.reduce((acc, val) => acc + val, 0);
    }
}

/**
 * Configuration object for the application
 * @constant
 */
export const appConfig = {
    /** Application name */
    name: "Test Application",
    /** Current version */
    version: "1.0.0",
    /** Debug mode flag */
    debug: true
} as const;

/**
 * A complex type definition for testing hover information
 */
export type ComplexType = {
    /** Required string property */
    required: string;
    /** Optional number property */
    optional?: number;
    /** Function property with parameters */
    callback: (data: User) => void;
    /** Nested object property */
    nested: {
        /** Inner string value */
        value: string;
        /** Inner configuration array */
        config: Array<{ key: string; value: any }>;
    };
};

/**
 * A function that processes user data
 * @param user - The user object to process
 * @param options - Optional processing options
 * @returns A promise that resolves to the processed user data
 */
export async function processUser(
    user: User, 
    options: { includeEmail?: boolean; formatName?: boolean } = {}
): Promise<Partial<User>> {
    const result: Partial<User> = { ...user };
    
    if (!options.includeEmail) {
        delete result.email;
    }
    
    if (options.formatName && result.name) {
        result.name = result.name.toUpperCase();
    }
    
    return result;
}

/**
 * A generic function for testing type parameters in hover
 * @template T - The type of data to process
 * @param data - The data to transform
 * @param transformer - Function to transform the data
 * @returns The transformed data
 */
export function transform<T, U>(data: T, transformer: (input: T) => U): U {
    return transformer(data);
}

// Test variables with different types for hover testing
/** A string constant with documentation */
export const stringConstant: string = "Hello, World!";

/** A number with explicit type annotation */
export const numberValue: number = 42;

/** A boolean flag */
export const isEnabled: boolean = true;

/** An array of users */
export const userList: User[] = [
    { id: 1, name: "Alice", email: "alice@test.com", isActive: true },
    { id: 2, name: "Bob", email: "bob@test.com", isActive: false }
];

/** A mapped type for demonstration */
export const userLookup: Record<number, User> = {
    1: userList[0],
    2: userList[1]
};

// Usage examples for testing hover on various positions
function demonstrateUsage() {
    // Test hover on class instantiation
    const calc = new Calculator(3);
    
    // Test hover on method calls
    const sum = calc.add(10, 20);
    const product = calc.multiply(5, 4);
    
    // Test hover on static methods
    const total = Calculator.sum([1, 2, 3, 4, 5]);
    
    // Test hover on function calls
    const user = userList[0];
    const processed = processUser(user, { includeEmail: false });
    
    // Test hover on properties
    const appName = appConfig.name;
    const userEmail = user.email;
    
    // Test hover on generic function
    const transformed = transform(stringConstant, (s) => s.length);
    
    return { calc, sum, product, total, processed, appName, userEmail, transformed };
}
`

		const testUri = await createTestFile("test-get-hover-info.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test getting hover info for the Calculator class declaration
		// Line 46 in the source (1-based) = line 45 (0-based) in the actual file
		const getHoverInfoParams = {
			textDocument: {
				uri: testUri.toString(),
			},
			position: {
				line: 28, // Line where "export class Calculator" is defined (0-based)
				character: 13, // Character position pointing to "Calculator" in the class declaration
			},
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "get_hover_info",
				_text: JSON.stringify(getHoverInfoParams),
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
			const hoverInfo = resultData.data

			// For get_hover_info, we expect either a Hover object or null
			if (hoverInfo === null) {
				return {
					tool,
					passed: false,
					error: "No hover information found for Calculator class - this might indicate LSP server issues",
					details: { hoverInfo, resultData },
				}
			}

			// Check if hover info has the expected structure
			if (typeof hoverInfo !== "object") {
				return {
					tool,
					passed: false,
					error: "Hover info is not an object",
					details: { hoverInfo, resultData },
				}
			}

			// Validate hover structure according to the Hover type
			if (!hoverInfo.hasOwnProperty("contents")) {
				return {
					tool,
					passed: false,
					error: 'Hover info missing required "contents" property',
					details: { hoverInfo, resultData },
				}
			}

			if (!hoverInfo.hasOwnProperty("range")) {
				return {
					tool,
					passed: false,
					error: 'Hover info missing required "range" property',
					details: { hoverInfo, resultData },
				}
			}

			// Validate contents
			const contents = hoverInfo.contents
			if (typeof contents !== "string") {
				return {
					tool,
					passed: false,
					error: "Hover contents should be a string",
					details: { contents, hoverInfo, resultData },
				}
			}

			// Check if contents contain relevant information about the Calculator class
			const contentLower = contents.toLowerCase()
			const hasClassInfo =
				contentLower.includes("calculator") ||
				contentLower.includes("class") ||
				contentLower.includes("mathematical") ||
				contentLower.includes("utility")

			if (!hasClassInfo) {
				return {
					tool,
					passed: false,
					error: "Hover contents do not seem to contain relevant information about Calculator class",
					details: {
						contents,
						contentLower,
						expectedKeywords: ["calculator", "class", "mathematical", "utility"],
						hoverInfo,
						resultData,
					},
				}
			}

			// Validate range structure
			const range = hoverInfo.range
			if (typeof range !== "object" || range === null) {
				return {
					tool,
					passed: false,
					error: "Hover range should be an object",
					details: { range, hoverInfo, resultData },
				}
			}

			// Check range has start and end properties
			if (!range.hasOwnProperty("start") || !range.hasOwnProperty("end")) {
				return {
					tool,
					passed: false,
					error: "Hover range missing start or end properties",
					details: { range, hoverInfo, resultData },
				}
			}

			// Validate start and end positions
			const start = range.start
			const end = range.end

			if (
				typeof start !== "object" ||
				typeof end !== "object" ||
				typeof start.line !== "number" ||
				typeof start.character !== "number" ||
				typeof end.line !== "number" ||
				typeof end.character !== "number"
			) {
				return {
					tool,
					passed: false,
					error: "Hover range start/end positions have invalid structure",
					details: { start, end, range, hoverInfo, resultData },
				}
			}

			// Check that the range is reasonable (covers the Calculator class name)
			const expectedLine = 28 // Line where Calculator class is defined (0-based)
			const lineTolerance = 2 // Allow some tolerance

			if (Math.abs(start.line - expectedLine) > lineTolerance) {
				return {
					tool,
					passed: false,
					error: `Hover range starts at unexpected line. Expected around line ${expectedLine}, got line ${start.line}`,
					details: {
						expectedLine,
						actualStartLine: start.line,
						tolerance: lineTolerance,
						range,
						hoverInfo,
						resultData,
					},
				}
			}

			// Success: we found valid hover information
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully retrieved hover info for Calculator class`,
					hoverContents: contents,
					hoverRange: {
						start: { line: start.line, character: start.character },
						end: { line: end.line, character: end.character },
					},
					contentsLength: contents.length,
					hasRelevantInfo: hasClassInfo,
					detectedKeywords: ["calculator", "class", "mathematical", "utility"].filter((keyword) =>
						contentLower.includes(keyword),
					),
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
