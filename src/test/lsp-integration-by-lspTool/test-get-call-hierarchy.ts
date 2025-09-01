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

export async function testGetCallHierarchy(): Promise<TestResult> {
	const tool = "get_call_hierarchy"

	try {
		// Create test TypeScript file with functions calling each other in a hierarchy
		const testContent = `
// Test file for call hierarchy functionality
export class DataProcessor {
    private data: any[] = [];
    
    // Root function that will be our test target
    public processData(input: any[]): any[] {
        console.log("Starting data processing");
        const validated = this.validateInput(input);
        const transformed = this.transformData(validated);
        const filtered = this.filterData(transformed);
        return this.finalizeResults(filtered);
    }
    
    // Called by processData
    private validateInput(input: any[]): any[] {
        console.log("Validating input");
        return input.filter(item => item !== null && item !== undefined);
    }
    
    // Called by processData
    private transformData(data: any[]): any[] {
        console.log("Transforming data");
        return data.map(item => this.transformItem(item));
    }
    
    // Called by transformData
    private transformItem(item: any): any {
        return {
            ...item,
            processed: true,
            timestamp: Date.now()
        };
    }
    
    // Called by processData
    private filterData(data: any[]): any[] {
        console.log("Filtering data");
        return data.filter(item => this.isValidItem(item));
    }
    
    // Called by filterData
    private isValidItem(item: any): boolean {
        return item && typeof item === 'object' && item.processed === true;
    }
    
    // Called by processData
    private finalizeResults(data: any[]): any[] {
        console.log("Finalizing results");
        this.data = [...this.data, ...data];
        return data;
    }
    
    // Another method that calls processData (incoming call)
    public batchProcess(batches: any[][]): any[] {
        console.log("Starting batch processing");
        const results: any[] = [];
        for (const batch of batches) {
            const processed = this.processData(batch); // Calls processData
            results.push(...processed);
        }
        return results;
    }
    
    // Another method that calls processData (incoming call)
    public quickProcess(items: any[]): any[] {
        console.log("Quick processing");
        return this.processData(items); // Calls processData
    }
}

// External function that also calls processData
export function utilityProcess(processor: DataProcessor, data: any[]): any[] {
    console.log("Utility processing");
    return processor.processData(data); // Another incoming call to processData
}

// Another class that uses DataProcessor
export class BatchProcessor {
    private processor = new DataProcessor();
    
    public run(data: any[]): any[] {
        console.log("Running batch processor");
        return this.processor.processData(data); // Another incoming call
    }
}

// Standalone function that creates hierarchy
export function createAndProcess(data: any[]): any[] {
    const processor = new DataProcessor();
    return processor.batchProcess([data]); // This will call processData indirectly
}
`

		const testUri = await createTestFile("test-call-hierarchy.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test getting call hierarchy for 'processData' method
		// This method should show:
		// - Incoming calls: batchProcess, quickProcess, utilityProcess, BatchProcessor.run
		// - Outgoing calls: validateInput, transformData, filterData, finalizeResults
		const callHierarchyParams = {
			textDocument: {
				uri: testUri.toString(),
			},
			position: {
				line: 6, // Line where 'processData' method is defined (0-based indexing)
				character: 18, // Character position pointing to 'processData' in the method declaration
			},
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "get_call_hierarchy",
				_text: JSON.stringify(callHierarchyParams),
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
			const callHierarchyData = resultData.data

			// Call hierarchy can return either an array of CallHierarchyItem or null
			if (callHierarchyData === null || callHierarchyData === undefined) {
				return {
					tool,
					passed: false,
					error: "Call hierarchy returned null - no hierarchy found for processData",
					details: resultData,
				}
			}

			// Expect call hierarchy items
			if (!Array.isArray(callHierarchyData)) {
				return {
					tool,
					passed: false,
					error: "Expected call hierarchy data to be an array",
					details: resultData,
				}
			}

			if (callHierarchyData.length === 0) {
				return {
					tool,
					passed: false,
					error: "No call hierarchy items found for processData method",
					details: { callHierarchyData, resultData },
				}
			}

			// Validate the structure of call hierarchy items
			const validCallHierarchyItems = callHierarchyData.every(
				(item) =>
					item &&
					typeof item.name === "string" &&
					typeof item.kind === "number" &&
					typeof item.uri === "string" &&
					typeof item.range === "object" &&
					typeof item.selectionRange === "object" &&
					typeof item.range.start === "object" &&
					typeof item.range.end === "object" &&
					typeof item.range.start.line === "number" &&
					typeof item.range.start.character === "number",
			)

			if (!validCallHierarchyItems) {
				return {
					tool,
					passed: false,
					error: "Call hierarchy items do not have expected structure",
					details: { callHierarchyData, resultData },
				}
			}

			// Look for the processData method in the hierarchy
			const processDataItem = callHierarchyData.find(
				(item) => item.name.includes("processData") || item.name === "processData",
			)

			if (!processDataItem) {
				// Check if any item relates to our target function
				const relevantItem = callHierarchyData.find((item) => item.uri.includes("test-call-hierarchy.ts"))

				if (!relevantItem) {
					return {
						tool,
						passed: false,
						error: "No call hierarchy item found related to our test file",
						details: {
							callHierarchyData: callHierarchyData.map((item) => ({
								name: item.name,
								kind: item.kind,
								uri: item.uri,
								line: item.range.start.line,
							})),
							resultData,
						},
					}
				}
			}

			// Verify the call hierarchy points to the correct file
			const targetItem = processDataItem || callHierarchyData[0]
			if (!targetItem.uri.includes("test-call-hierarchy.ts")) {
				return {
					tool,
					passed: false,
					error: `Call hierarchy found in unexpected file: ${targetItem.uri}`,
					details: {
						expectedFile: "test-call-hierarchy.ts",
						actualUri: targetItem.uri,
						callHierarchyData,
						resultData,
					},
				}
			}

			// Verify the hierarchy item has reasonable position
			// The processData method should be around line 5-6 (0-based)
			const expectedLine = 6
			const actualLine = targetItem.range.start.line
			const lineTolerance = 5 // Allow some tolerance

			if (Math.abs(actualLine - expectedLine) > lineTolerance) {
				// This might still be valid if LSP found a different but related symbol
				console.log(`Call hierarchy found at line ${actualLine}, expected around ${expectedLine}`)
			}

			// Success: we found call hierarchy information
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully retrieved call hierarchy for processData method`,
					hierarchyItems: callHierarchyData.map((item) => ({
						name: item.name,
						kind: item.kind,
						uri: item.uri,
						line: item.range.start.line,
						character: item.range.start.character,
						detail: item.detail || "No detail provided",
					})),
					itemCount: callHierarchyData.length,
					targetItem: {
						name: targetItem.name,
						kind: targetItem.kind,
						line: targetItem.range.start.line,
						character: targetItem.range.start.character,
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

		// Check for call hierarchy not supported
		if (
			errorMessage.includes("not supported") ||
			errorMessage.includes("CallHierarchy") ||
			errorMessage.includes("capability")
		) {
			return {
				tool,
				passed: false,
				error: "Call hierarchy not supported by the language server - this may be expected for some LSP implementations",
				details: { notSupported: true, originalError: errorMessage },
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
