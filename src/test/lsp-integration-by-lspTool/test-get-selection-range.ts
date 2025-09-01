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

export async function testGetSelectionRange(): Promise<TestResult> {
	const tool = "get_selection_range"

	try {
		// Create a comprehensive test TypeScript file with deeply nested code structures
		// to test hierarchical selection ranges
		const testContent = `
/**
 * Test file for selection range functionality
 * This file contains nested code structures for testing smart selection
 */

export namespace MathUtils {
    /**
     * A comprehensive calculator class with nested structures
     */
    export class Calculator {
        private static readonly DEFAULT_PRECISION = 2;
        private precision: number;
        
        constructor(precision: number = Calculator.DEFAULT_PRECISION) {
            this.precision = precision;
        }
        
        /**
         * Complex mathematical operation with nested control structures
         */
        public complexCalculation(values: number[], operation: 'sum' | 'product' | 'average'): number {
            if (!values || values.length === 0) {
                throw new Error('Values array cannot be empty');
            }
            
            let result: number;
            
            switch (operation) {
                case 'sum':
                    result = values.reduce((acc, val) => {
                        if (typeof val !== 'number' || isNaN(val)) {
                            throw new Error(\`Invalid value: \${val}\`);
                        }
                        return acc + val;
                    }, 0);
                    break;
                    
                case 'product':
                    result = values.reduce((acc, val) => {
                        if (typeof val !== 'number' || isNaN(val)) {
                            throw new Error(\`Invalid value: \${val}\`);
                        }
                        return acc * val;
                    }, 1);
                    break;
                    
                case 'average':
                    const sum = values.reduce((acc, val) => {
                        if (typeof val !== 'number' || isNaN(val)) {
                            throw new Error(\`Invalid value: \${val}\`);
                        }
                        return acc + val;
                    }, 0);
                    result = sum / values.length;
                    break;
                    
                default:
                    throw new Error(\`Unsupported operation: \${operation}\`);
            }
            
            // Apply precision rounding
            return Math.round(result * Math.pow(10, this.precision)) / Math.pow(10, this.precision);
        }
        
        /**
         * Method with nested async operations and complex expressions
         */
        public async processDataAsync(data: Array<{id: number, value: number, metadata?: Record<string, any>}>): Promise<{
            processed: Array<{id: number, result: number, status: 'success' | 'error', error?: string}>,
            summary: {total: number, successful: number, failed: number}
        }> {
            const processed = await Promise.all(
                data.map(async (item) => {
                    try {
                        // Simulate async processing with nested calculations
                        const complexResult = await new Promise<number>((resolve, reject) => {
                            setTimeout(() => {
                                try {
                                    const baseValue = item.value;
                                    const modifier = item.metadata?.modifier || 1;
                                    const result = this.complexCalculation([baseValue * modifier, baseValue / 2], 'sum');
                                    resolve(result);
                                } catch (error) {
                                    reject(error);
                                }
                            }, Math.random() * 10);
                        });
                        
                        return {
                            id: item.id,
                            result: complexResult,
                            status: 'success' as const
                        };
                    } catch (error) {
                        return {
                            id: item.id,
                            result: 0,
                            status: 'error' as const,
                            error: error instanceof Error ? error.message : String(error)
                        };
                    }
                })
            );
            
            const summary = processed.reduce(
                (acc, item) => ({
                    total: acc.total + 1,
                    successful: acc.successful + (item.status === 'success' ? 1 : 0),
                    failed: acc.failed + (item.status === 'error' ? 1 : 0)
                }),
                { total: 0, successful: 0, failed: 0 }
            );
            
            return { processed, summary };
        }
    }
    
    /**
     * Utility functions with various nesting levels
     */
    export const Utils = {
        formatters: {
            currency: (value: number, currency = 'USD') => {
                const formatted = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currency
                }).format(value);
                return formatted;
            },
            
            percentage: (value: number, decimals = 2) => {
                return \`\${(value * 100).toFixed(decimals)}%\`;
            }
        },
        
        validators: {
            isValidNumber: (value: any): value is number => {
                return typeof value === 'number' && !isNaN(value) && isFinite(value);
            },
            
            isPositive: (value: number): boolean => {
                return Utils.validators.isValidNumber(value) && value > 0;
            }
        }
    };
}

/**
 * A complex interface with nested properties for testing selection ranges
 */
export interface ComplexDataStructure {
    id: string;
    metadata: {
        created: Date;
        modified: Date;
        tags: string[];
        attributes: Record<string, {
            value: any;
            type: 'string' | 'number' | 'boolean' | 'object';
            validation?: {
                required: boolean;
                pattern?: RegExp;
                range?: { min: number; max: number };
            };
        }>;
    };
    content: {
        data: Array<{
            key: string;
            value: any;
            nested?: {
                level1: {
                    level2: {
                        level3: {
                            deepValue: string;
                        };
                    };
                };
            };
        }>;
        relationships: Map<string, Set<string>>;
    };
}

/**
 * Function with deeply nested control structures for testing selection ranges
 */
export function processComplexData(input: ComplexDataStructure[]): Promise<Map<string, any>> {
    return new Promise((resolve, reject) => {
        try {
            const result = new Map<string, any>();
            
            for (const item of input) {
                const processedItem = {
                    id: item.id,
                    processed: item.content.data.map(dataItem => {
                        const processed = {
                            originalKey: dataItem.key,
                            processedValue: (() => {
                                if (dataItem.nested) {
                                    const deepValue = dataItem.nested.level1.level2.level3.deepValue;
                                    return {
                                        type: 'nested',
                                        value: deepValue.toUpperCase(),
                                        length: deepValue.length
                                    };
                                } else {
                                    return {
                                        type: 'simple',
                                        value: String(dataItem.value),
                                        length: String(dataItem.value).length
                                    };
                                }
                            })()
                        };
                        return processed;
                    })
                };
                
                result.set(item.id, processedItem);
            }
            
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
}

// Usage example with nested expressions for testing selection ranges
export async function demonstrateUsage() {
    const calculator = new MathUtils.Calculator(3);
    
    // Complex nested expression
    const complexResult = await calculator.processDataAsync([
        {
            id: 1,
            value: 42,
            metadata: {
                modifier: 2.5,
                category: 'test',
                flags: {
                    enabled: true,
                    priority: 'high'
                }
            }
        }
    ]);
    
    // Nested object with method calls
    const formattedValue = MathUtils.Utils.formatters.currency(
        calculator.complexCalculation([10, 20, 30], 'average')
    );
    
    return {
        complexResult,
        formattedValue,
        isValid: MathUtils.Utils.validators.isPositive(complexResult.summary.successful)
    };
}
`

		const testUri = await createTestFile("test-get-selection-range.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test getting selection range for a nested expression inside the complexCalculation method
		// Position points to "val" in the reduce callback at line 27
		// This should provide a hierarchy: variable -> parameter -> arrow function -> reduce call -> assignment
		const getSelectionRangeParams = {
			textDocument: {
				uri: testUri.toString(),
			},
			position: {
				line: 26, // Line where "return acc + val;" is (0-based)
				character: 32, // Character position pointing to "val" in the expression
			},
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "get_selection_range",
				_text: JSON.stringify(getSelectionRangeParams),
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
			const selectionRanges = resultData.data

			// For get_selection_range, we expect either an array of SelectionRange objects or null
			if (selectionRanges === null || selectionRanges === undefined) {
				return {
					tool,
					passed: false,
					error: "No selection range found for the specified position - this might indicate LSP server issues",
					details: { selectionRanges, resultData },
				}
			}

			// Check if selection ranges is an array
			if (!Array.isArray(selectionRanges)) {
				return {
					tool,
					passed: false,
					error: "Selection ranges should be an array",
					details: { selectionRanges, resultData },
				}
			}

			// Check if we have at least one selection range
			if (selectionRanges.length === 0) {
				return {
					tool,
					passed: false,
					error: "Empty selection ranges array returned",
					details: { selectionRanges, resultData },
				}
			}

			// Get the first selection range for validation
			const selectionRange = selectionRanges[0]

			// Check if selection range has the expected structure
			if (typeof selectionRange !== "object") {
				return {
					tool,
					passed: false,
					error: "First selection range is not an object",
					details: { selectionRange, selectionRanges, resultData },
				}
			}

			// Validate selection range structure according to the SelectionRange type
			if (!selectionRange.hasOwnProperty("range")) {
				return {
					tool,
					passed: false,
					error: 'Selection range missing required "range" property',
					details: { selectionRange, selectionRanges, resultData },
				}
			}

			// Validate range structure
			const range = selectionRange.range
			if (typeof range !== "object" || range === null) {
				return {
					tool,
					passed: false,
					error: 'Selection range "range" property should be an object',
					details: { range, selectionRange, resultData },
				}
			}

			// Check range has start and end properties
			if (!range.hasOwnProperty("start") || !range.hasOwnProperty("end")) {
				return {
					tool,
					passed: false,
					error: "Selection range missing start or end properties",
					details: { range, selectionRange, resultData },
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
					error: "Selection range start/end positions have invalid structure",
					details: { start, end, range, selectionRange, resultData },
				}
			}

			// Check that the range is reasonable (should encompass or be near our target position)
			const expectedLine = 26 // Line where we requested selection range (0-based)
			const lineTolerance = 5 // Allow some tolerance for different semantic levels

			if (
				Math.abs(start.line - expectedLine) > lineTolerance &&
				Math.abs(end.line - expectedLine) > lineTolerance
			) {
				return {
					tool,
					passed: false,
					error: `Selection range doesn't seem to relate to the requested position. Expected around line ${expectedLine}, got range from line ${start.line} to ${end.line}`,
					details: {
						expectedLine,
						actualRange: { start, end },
						tolerance: lineTolerance,
						selectionRange,
						resultData,
					},
				}
			}

			// Check for parent hierarchy (the key feature of selection ranges)
			let hierarchyLevels = 0
			let currentRange = selectionRange
			const hierarchy = []

			while (currentRange) {
				hierarchy.push({
					level: hierarchyLevels,
					range: {
						start: { line: currentRange.range.start.line, character: currentRange.range.start.character },
						end: { line: currentRange.range.end.line, character: currentRange.range.end.character },
					},
				})

				currentRange = currentRange.parent
				hierarchyLevels++

				// Prevent infinite loops (safety check)
				if (hierarchyLevels > 20) {
					return {
						tool,
						passed: false,
						error: "Selection range hierarchy appears to have infinite loop or excessive depth",
						details: { hierarchy, selectionRange, resultData },
					}
				}
			}

			// For smart selection, we expect at least 2 levels (e.g., variable -> expression)
			if (hierarchyLevels < 2) {
				return {
					tool,
					passed: false,
					error: `Expected hierarchical selection ranges, but only found ${hierarchyLevels} level(s). Smart selection should provide multiple semantic levels.`,
					details: {
						hierarchyLevels,
						hierarchy,
						selectionRange,
						resultData,
					},
				}
			}

			// Validate that each level in the hierarchy properly contains the previous level
			for (let i = 1; i < hierarchy.length; i++) {
				const inner = hierarchy[i - 1].range
				const outer = hierarchy[i].range

				// Check that outer range contains inner range
				const outerStartsBefore =
					outer.start.line < inner.start.line ||
					(outer.start.line === inner.start.line && outer.start.character <= inner.start.character)
				const outerEndsAfter =
					outer.end.line > inner.end.line ||
					(outer.end.line === inner.end.line && outer.end.character >= inner.end.character)

				if (!outerStartsBefore || !outerEndsAfter) {
					return {
						tool,
						passed: false,
						error: `Hierarchy level ${i} doesn't properly contain level ${i - 1}. Each parent range should contain its child.`,
						details: {
							level: i,
							innerRange: inner,
							outerRange: outer,
							hierarchy,
							selectionRange,
							resultData,
						},
					}
				}
			}

			// Success: we found valid hierarchical selection ranges
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully retrieved hierarchical selection ranges with ${hierarchyLevels} levels`,
					hierarchyLevels,
					baseRange: {
						start: { line: start.line, character: start.character },
						end: { line: end.line, character: end.character },
					},
					hierarchy: hierarchy.slice(0, 5), // Show first 5 levels for readability
					requestedPosition: {
						line: expectedLine,
						character: getSelectionRangeParams.position.character,
					},
					hasValidHierarchy: true,
					totalHierarchyLevels: hierarchyLevels,
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
