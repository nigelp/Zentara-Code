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

export async function testGetSymbolCodeSnippet(): Promise<TestResult> {
	const tool = "get_symbol_code_snippet"

	try {
		// Create test TypeScript file with various symbols for snippet extraction
		const testContent = `
/**
 * Test file for get_symbol_code_snippet functionality
 * Contains various TypeScript constructs to test code snippet extraction
 */

// Simple function for snippet testing
export function simpleFunction(param: string): string {
    const message = "Hello from simpleFunction";
    return message + ": " + param;
}

// Complex function with multiple statements
export function complexFunction(data: any[], options: { sort?: boolean, limit?: number }): any[] {
    let result = [...data];
    
    if (options.sort) {
        result.sort((a, b) => {
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
        });
    }
    
    if (options.limit && options.limit > 0) {
        result = result.slice(0, options.limit);
    }
    
    return result;
}

// Interface definition
export interface TestInterface {
    id: number;
    name: string;
    active: boolean;
    metadata?: {
        created: Date;
        updated: Date;
        tags: string[];
    };
}

// Class with multiple methods
export class TestService {
    private data: TestInterface[] = [];
    private config: { maxItems: number; autoSort: boolean };

    constructor(maxItems: number = 100) {
        this.config = {
            maxItems,
            autoSort: true
        };
    }

    // Method for snippet testing
    public addItem(item: Omit<TestInterface, 'id'>): TestInterface {
        const newItem: TestInterface = {
            id: this.generateId(),
            ...item
        };
        
        this.data.push(newItem);
        
        if (this.config.autoSort) {
            this.sortData();
        }
        
        return newItem;
    }

    // Another method for snippet testing
    public getItems(filter?: { active?: boolean; nameContains?: string }): TestInterface[] {
        let result = [...this.data];
        
        if (filter) {
            if (filter.active !== undefined) {
                result = result.filter(item => item.active === filter.active);
            }
            
            if (filter.nameContains) {
                const searchTerm = filter.nameContains.toLowerCase();
                result = result.filter(item => 
                    item.name.toLowerCase().includes(searchTerm)
                );
            }
        }
        
        return result;
    }

    // Private method for snippet testing
    private generateId(): number {
        return Date.now() + Math.random();
    }

    // Private method with complex logic
    private sortData(): void {
        this.data.sort((a, b) => {
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
        });
    }

    // Static method for snippet testing
    static validateItem(item: Partial<TestInterface>): boolean {
        return !!(item.name && 
                 typeof item.name === 'string' && 
                 item.name.trim().length > 0);
    }
}

// Enum for snippet testing
export enum Status {
    PENDING = 'pending',
    ACTIVE = 'active', 
    INACTIVE = 'inactive',
    DELETED = 'deleted'
}

// Type alias for snippet testing
export type ProcessResult = {
    success: boolean;
    data?: any;
    error?: string;
    timestamp: Date;
};

// Arrow function for snippet testing
export const processData = async (input: any[]): Promise<ProcessResult> => {
    try {
        const processed = input.map(item => ({
            ...item,
            processed: true,
            timestamp: new Date()
        }));
        
        return {
            success: true,
            data: processed,
            timestamp: new Date()
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date()
        };
    }
};

// Namespace for snippet testing
export namespace Utils {
    export function formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }
    
    export function createId(prefix: string = 'item'): string {
        return \`\${prefix}_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
    }
    
    export const constants = {
        MAX_RETRIES: 3,
        TIMEOUT_MS: 5000,
        DEFAULT_PAGE_SIZE: 20
    };
}
`

		const testUri = await createTestFile("test-get-symbol-code-snippet.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test extracting code snippet for the complexFunction (lines 15-29)
		// This function has multiple statements and should provide a good test
		const getCodeSnippetParams = {
			location: {
				uri: testUri.toString(),
				range: {
					start: {
						line: 14, // 0-based line number for complexFunction start
						character: 0,
					},
					end: {
						line: 28, // 0-based line number for complexFunction end
						character: 1,
					},
				},
			},
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "get_symbol_code_snippet",
				_text: JSON.stringify(getCodeSnippetParams),
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
			const snippetData = resultData.data

			// For get_symbol_code_snippet, we expect an object with snippet, uri, and range
			if (!snippetData) {
				return {
					tool,
					passed: false,
					error: "No snippet data returned - this might indicate LSP server issues",
					details: { snippetData, resultData },
				}
			}

			// Validate the structure of the snippet data
			if (typeof snippetData !== "object") {
				return {
					tool,
					passed: false,
					error: "Snippet data should be an object",
					details: { snippetData, resultData },
				}
			}

			// Check for required properties
			const requiredProperties = ["snippet", "uri", "range"]
			const missingProperties = requiredProperties.filter((prop) => !(prop in snippetData))

			if (missingProperties.length > 0) {
				return {
					tool,
					passed: false,
					error: `Missing required properties: ${missingProperties.join(", ")}`,
					details: { snippetData, missingProperties, resultData },
				}
			}

			// Validate snippet content
			const { snippet, uri, range } = snippetData

			if (typeof snippet !== "string") {
				return {
					tool,
					passed: false,
					error: "Snippet should be a string",
					details: { snippet, snippetData, resultData },
				}
			}

			if (snippet.length === 0) {
				return {
					tool,
					passed: false,
					error: "Snippet should not be empty",
					details: { snippet, snippetData, resultData },
				}
			}

			// Validate URI
			if (typeof uri !== "string" || !uri.includes(testUri.toString())) {
				return {
					tool,
					passed: false,
					error: "URI should match the test file URI",
					details: { uri, expectedUri: testUri.toString(), snippetData, resultData },
				}
			}

			// Validate range structure
			if (!range || typeof range !== "object") {
				return {
					tool,
					passed: false,
					error: "Range should be an object",
					details: { range, snippetData, resultData },
				}
			}

			const { start, end } = range
			if (
				!start ||
				!end ||
				typeof start.line !== "number" ||
				typeof start.character !== "number" ||
				typeof end.line !== "number" ||
				typeof end.character !== "number"
			) {
				return {
					tool,
					passed: false,
					error: "Range should have valid start and end positions with line and character numbers",
					details: { range, snippetData, resultData },
				}
			}

			// Validate that the snippet contains expected content
			// The complexFunction should contain specific keywords
			const expectedKeywords = ["complexFunction", "data", "options", "result", "sort", "limit"]
			const foundKeywords = expectedKeywords.filter((keyword) => snippet.includes(keyword))

			if (foundKeywords.length < expectedKeywords.length * 0.8) {
				return {
					tool,
					passed: false,
					error: `Snippet doesn't contain expected keywords. Found ${foundKeywords.length}/${expectedKeywords.length}`,
					details: {
						expectedKeywords,
						foundKeywords,
						snippet,
						snippetData,
						resultData,
					},
				}
			}

			// Check for line numbering format with arrow (→) - as per our implementation
			if (!snippet.includes("→")) {
				return {
					tool,
					passed: false,
					error: "Snippet should include line number arrows (→) for cat -n format",
					details: { snippet, snippetData, resultData },
				}
			}

			// Check that snippet starts with a line number and arrow
			const firstLine = snippet.split("\n")[0]
			if (!/^\s*\d+→/.test(firstLine)) {
				return {
					tool,
					passed: false,
					error: "Snippet should start with line number followed by arrow (→)",
					details: { firstLine, snippet, snippetData, resultData },
				}
			}

			// Check if snippet is multi-line (complexFunction should be)
			const lineCount = snippet.split("\n").length
			if (lineCount < 5) {
				return {
					tool,
					passed: false,
					error: `Expected multi-line snippet but got ${lineCount} lines`,
					details: { lineCount, snippet, snippetData, resultData },
				}
			}

			// Check if the range is reasonable for the complexFunction
			const rangeLinesCount = end.line - start.line + 1
			if (rangeLinesCount < 10 || rangeLinesCount > 20) {
				return {
					tool,
					passed: false,
					error: `Range seems incorrect. Expected 10-20 lines, got ${rangeLinesCount}`,
					details: { rangeLinesCount, range, snippetData, resultData },
				}
			}

			// Success: we got a valid code snippet with expected structure and content
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully retrieved code snippet with ${lineCount} lines`,
					snippetLineCount: lineCount,
					rangeLinesCount,
					foundKeywords,
					uri,
					range,
					snippetPreview: snippet.split("\n").slice(0, 3).join("\n") + "...",
					hasExpectedFunction: snippet.includes("export function complexFunction"),
					hasExpectedLogic: snippet.includes("options.sort") && snippet.includes("options.limit"),
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
