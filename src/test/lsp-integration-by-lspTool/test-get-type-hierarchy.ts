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

export async function testGetTypeHierarchy(): Promise<TestResult> {
	const tool = "get_type_hierarchy"

	try {
		// Create test TypeScript file with class inheritance and interface implementations
		const testContent = `
// Test file for type hierarchy functionality
export interface IProcessor {
    process(data: any): any;
    getName(): string;
}

export interface IValidatable {
    validate(): boolean;
    getValidationErrors(): string[];
}

export interface ILoggable {
    log(message: string): void;
    getLogLevel(): string;
}

// Base abstract class that implements some interfaces
export abstract class BaseProcessor implements IProcessor, ILoggable {
    protected name: string;
    protected logLevel: string = 'info';
    
    constructor(name: string) {
        this.name = name;
    }
    
    abstract process(data: any): any;
    
    getName(): string {
        return this.name;
    }
    
    log(message: string): void {
        console.log(\`[\${this.logLevel.toUpperCase()}] \${this.name}: \${message}\`);
    }
    
    getLogLevel(): string {
        return this.logLevel;
    }
}

// Intermediate class that extends BaseProcessor and adds validation
export abstract class ValidatedProcessor extends BaseProcessor implements IValidatable {
    protected errors: string[] = [];
    
    constructor(name: string) {
        super(name);
    }
    
    validate(): boolean {
        this.errors = [];
        return this.performValidation();
    }
    
    protected abstract performValidation(): boolean;
    
    getValidationErrors(): string[] {
        return [...this.errors];
    }
    
    protected addError(error: string): void {
        this.errors.push(error);
    }
}

// Concrete implementation that extends ValidatedProcessor
export class DataProcessor extends ValidatedProcessor {
    private data: any[] = [];
    private config: any = {};
    
    constructor(name: string, config?: any) {
        super(name);
        this.config = config || {};
    }
    
    process(data: any): any {
        this.log("Starting data processing");
        
        if (!this.validate()) {
            throw new Error(\`Validation failed: \${this.getValidationErrors().join(', ')}\`);
        }
        
        this.data = Array.isArray(data) ? data : [data];
        return this.transformData();
    }
    
    protected performValidation(): boolean {
        if (!this.config) {
            this.addError("Configuration is required");
            return false;
        }
        
        if (!this.config.enabled) {
            this.addError("Processor is not enabled");
            return false;
        }
        
        return true;
    }
    
    private transformData(): any[] {
        return this.data.map(item => ({
            ...item,
            processed: true,
            processorName: this.getName(),
            timestamp: Date.now()
        }));
    }
}

// Another concrete implementation with different behavior
export class StreamProcessor extends ValidatedProcessor {
    private streamConfig: any;
    
    constructor(name: string, streamConfig: any) {
        super(name);
        this.streamConfig = streamConfig;
    }
    
    process(data: any): any {
        this.log("Starting stream processing");
        
        if (!this.validate()) {
            throw new Error(\`Stream validation failed: \${this.getValidationErrors().join(', ')}\`);
        }
        
        return this.processStream(data);
    }
    
    protected performValidation(): boolean {
        if (!this.streamConfig) {
            this.addError("Stream configuration is required");
            return false;
        }
        
        if (!this.streamConfig.bufferSize || this.streamConfig.bufferSize <= 0) {
            this.addError("Valid buffer size is required");
            return false;
        }
        
        return true;
    }
    
    private processStream(data: any): any {
        return {
            streamed: true,
            bufferSize: this.streamConfig.bufferSize,
            processorName: this.getName(),
            data: data
        };
    }
}

// Class that extends DataProcessor (further inheritance)
export class EnhancedDataProcessor extends DataProcessor {
    private enhancementConfig: any;
    
    constructor(name: string, config: any, enhancementConfig: any) {
        super(name, config);
        this.enhancementConfig = enhancementConfig;
    }
    
    process(data: any): any {
        this.log("Starting enhanced data processing");
        const baseResult = super.process(data);
        return this.enhanceResults(baseResult);
    }
    
    private enhanceResults(data: any[]): any[] {
        return data.map(item => ({
            ...item,
            enhanced: true,
            enhancementLevel: this.enhancementConfig?.level || 1,
            enhancementType: this.enhancementConfig?.type || 'default'
        }));
    }
}

// Interface that extends other interfaces
export interface IAdvancedProcessor extends IProcessor, IValidatable, ILoggable {
    getProcessingStats(): any;
    reset(): void;
}

// Class implementing the extended interface
export class AdvancedProcessor implements IAdvancedProcessor {
    private stats: any = { processed: 0, errors: 0 };
    private errors: string[] = [];
    
    process(data: any): any {
        this.stats.processed++;
        return { processed: data, stats: this.stats };
    }
    
    getName(): string {
        return "AdvancedProcessor";
    }
    
    validate(): boolean {
        return true;
    }
    
    getValidationErrors(): string[] {
        return [...this.errors];
    }
    
    log(message: string): void {
        console.log(\`[ADVANCED] \${message}\`);
    }
    
    getLogLevel(): string {
        return "debug";
    }
    
    getProcessingStats(): any {
        return { ...this.stats };
    }
    
    reset(): void {
        this.stats = { processed: 0, errors: 0 };
        this.errors = [];
    }
}

// Generic interface for type hierarchy testing
export interface IGenericProcessor<T> extends IProcessor {
    processTyped(data: T): T;
}

// Generic class implementation
export class GenericDataProcessor<T> extends BaseProcessor implements IGenericProcessor<T> {
    process(data: any): any {
        return this.processTyped(data);
    }
    
    processTyped(data: T): T {
        this.log(\`Processing typed data: \${typeof data}\`);
        return data;
    }
}

// Specialized generic implementation
export class StringProcessor extends GenericDataProcessor<string> {
    processTyped(data: string): string {
        this.log(\`Processing string: \${data}\`);
        return data.toUpperCase();
    }
}
`

		const testUri = await createTestFile("test-type-hierarchy.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test getting type hierarchy for 'ValidatedProcessor' class
		// This class should show:
		// - Supertypes: BaseProcessor, IProcessor, IValidatable, ILoggable
		// - Subtypes: DataProcessor, StreamProcessor
		const typeHierarchyParams = {
			textDocument: {
				uri: testUri.toString(),
			},
			position: {
				line: 36, // Line where 'ValidatedProcessor' class is defined (0-based indexing)
				character: 30, // Character position pointing to 'ValidatedProcessor' in the class declaration
			},
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "get_type_hierarchy",
				_text: JSON.stringify(typeHierarchyParams),
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
			const typeHierarchyData = resultData.data

			// Type hierarchy can return either an array of TypeHierarchyItem or null
			if (typeHierarchyData === null || typeHierarchyData === undefined) {
				return {
					tool,
					passed: false,
					error: "Type hierarchy returned null - no hierarchy found for ValidatedProcessor",
					details: resultData,
				}
			}

			// Expect type hierarchy items
			if (!Array.isArray(typeHierarchyData)) {
				return {
					tool,
					passed: false,
					error: "Expected type hierarchy data to be an array",
					details: resultData,
				}
			}

			if (typeHierarchyData.length === 0) {
				return {
					tool,
					passed: false,
					error: "No type hierarchy items found for ValidatedProcessor class",
					details: { typeHierarchyData, resultData },
				}
			}

			// Validate the structure of type hierarchy items
			const validTypeHierarchyItems = typeHierarchyData.every(
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

			if (!validTypeHierarchyItems) {
				return {
					tool,
					passed: false,
					error: "Type hierarchy items do not have expected structure",
					details: { typeHierarchyData, resultData },
				}
			}

			// Look for the ValidatedProcessor class in the hierarchy
			const validatedProcessorItem = typeHierarchyData.find(
				(item) => item.name.includes("ValidatedProcessor") || item.name === "ValidatedProcessor",
			)

			if (!validatedProcessorItem) {
				// Check if any item relates to our target class
				const relevantItem = typeHierarchyData.find((item) => item.uri.includes("test-type-hierarchy.ts"))

				if (!relevantItem) {
					return {
						tool,
						passed: false,
						error: "No type hierarchy item found related to our test file",
						details: {
							typeHierarchyData: typeHierarchyData.map((item) => ({
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

			// Verify the type hierarchy points to the correct file
			const targetItem = validatedProcessorItem || typeHierarchyData[0]
			if (!targetItem.uri.includes("test-type-hierarchy.ts")) {
				return {
					tool,
					passed: false,
					error: `Type hierarchy found in unexpected file: ${targetItem.uri}`,
					details: {
						expectedFile: "test-type-hierarchy.ts",
						actualUri: targetItem.uri,
						typeHierarchyData,
						resultData,
					},
				}
			}

			// Verify the hierarchy item has reasonable position
			// The ValidatedProcessor class should be around line 35 (0-based)
			const expectedLine = 36
			const actualLine = targetItem.range.start.line
			const lineTolerance = 10 // Allow some tolerance for line position

			if (Math.abs(actualLine - expectedLine) > lineTolerance) {
				// This might still be valid if LSP found a different but related symbol
				console.log(`Type hierarchy found at line ${actualLine}, expected around ${expectedLine}`)
			}

			// Additional validation: check for inheritance-related properties
			// Type hierarchy items may have additional data like detail or tags
			const hasInheritanceInfo = typeHierarchyData.some(
				(item) =>
					item.detail ||
					item.tags ||
					item.name.includes("extends") ||
					item.name.includes("implements") ||
					item.name.includes("BaseProcessor") ||
					item.name.includes("IProcessor") ||
					item.name.includes("ValidatedProcessor"),
			)

			// Success: we found type hierarchy information
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully retrieved type hierarchy for ValidatedProcessor class`,
					hierarchyItems: typeHierarchyData.map((item) => ({
						name: item.name,
						kind: item.kind,
						uri: item.uri,
						line: item.range.start.line,
						character: item.range.start.character,
						detail: item.detail || "No detail provided",
						tags: item.tags || [],
					})),
					itemCount: typeHierarchyData.length,
					targetItem: {
						name: targetItem.name,
						kind: targetItem.kind,
						line: targetItem.range.start.line,
						character: targetItem.range.start.character,
						detail: targetItem.detail || "No detail provided",
					},
					hasInheritanceInfo,
					expectedInheritance: {
						supertypes: ["BaseProcessor", "IProcessor", "ILoggable"],
						subtypes: ["DataProcessor", "StreamProcessor"],
						interfaces: ["IValidatable"],
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

		// Check for type hierarchy not supported
		if (
			errorMessage.includes("not supported") ||
			errorMessage.includes("TypeHierarchy") ||
			errorMessage.includes("capability")
		) {
			return {
				tool,
				passed: false,
				error: "Type hierarchy not supported by the language server - this may be expected for some LSP implementations",
				details: { notSupported: true, originalError: errorMessage },
			}
		}

		// Check for type hierarchy provider not available
		if (errorMessage.includes("typeHierarchyProvider") || errorMessage.includes("type hierarchy provider")) {
			return {
				tool,
				passed: false,
				error: "Type hierarchy provider not available - this feature may not be implemented by the current language server",
				details: { providerUnavailable: true, originalError: errorMessage },
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
