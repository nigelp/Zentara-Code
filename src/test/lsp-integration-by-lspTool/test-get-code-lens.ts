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

export async function testGetCodeLens(): Promise<TestResult> {
	const tool = "get_code_lens"

	try {
		// Create a comprehensive TypeScript test file that would likely have code lens annotations
		// Code lens typically shows references, implementations, run/debug options, etc.
		const testContent = `
/**
 * Test file for code lens functionality
 * This file contains various TypeScript constructs that typically have code lens annotations
 * such as classes, interfaces, methods, and functions with references and implementations
 */

import * as vscode from 'vscode';
import { EventEmitter } from 'events';

/**
 * Base interface that will be implemented by multiple classes
 * Code lens should show implementations here
 */
export interface ITestService {
    /** Method that will be implemented and referenced */
    processData(data: any[]): Promise<any[]>;
    /** Property that will be referenced */
    readonly name: string;
    /** Method that will be called by multiple places */
    initialize(): Promise<void>;
}

/**
 * Abstract base class with abstract methods
 * Code lens should show implementations and references
 */
export abstract class BaseProcessor {
    protected abstract serviceName: string;
    
    /**
     * Abstract method that will be implemented by subclasses
     * Code lens should show implementations
     */
    abstract process(input: any): any;
    
    /**
     * Public method that will be called from multiple places
     * Code lens should show references
     */
    public validate(data: any): boolean {
        return data !== null && data !== undefined;
    }
    
    /**
     * Protected method that will be called by subclasses
     * Code lens should show references
     */
    protected log(message: string): void {
        console.log(\`[\${this.serviceName}] \${message}\`);
    }
}

/**
 * First implementation of the interface and abstract class
 * Code lens should show references to this class
 */
export class DataProcessor extends BaseProcessor implements ITestService {
    protected serviceName = 'DataProcessor';
    public readonly name = 'Data Processing Service';
    
    /**
     * Implementation of abstract method
     * Code lens should show references to this method
     */
    process(input: any): any {
        this.log('Processing data');
        if (!this.validate(input)) {
            throw new Error('Invalid input data');
        }
        return { ...input, processed: true, timestamp: Date.now() };
    }
    
    /**
     * Implementation of interface method
     * Code lens should show references and potentially run/debug options
     */
    async processData(data: any[]): Promise<any[]> {
        this.log('Processing data array');
        const results = [];
        
        for (const item of data) {
            const processed = this.process(item);
            results.push(processed);
        }
        
        return results;
    }
    
    /**
     * Implementation of interface method
     * Code lens should show references
     */
    async initialize(): Promise<void> {
        this.log('Initializing DataProcessor');
        // Mock initialization
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    /**
     * Public method that will be called externally
     * Code lens should show references
     */
    public getStatus(): string {
        return 'Active';
    }
    
    /**
     * Static method that might be referenced
     * Code lens should show references
     */
    static createInstance(): DataProcessor {
        return new DataProcessor();
    }
}

/**
 * Second implementation of the interface and abstract class
 * Code lens should show references to this class
 */
export class FileProcessor extends BaseProcessor implements ITestService {
    protected serviceName = 'FileProcessor';
    public readonly name = 'File Processing Service';
    
    /**
     * Implementation of abstract method
     * Code lens should show references to this method
     */
    process(input: any): any {
        this.log('Processing file');
        if (!this.validate(input)) {
            throw new Error('Invalid file input');
        }
        return { ...input, fileProcessed: true, size: JSON.stringify(input).length };
    }
    
    /**
     * Implementation of interface method
     * Code lens should show references
     */
    async processData(data: any[]): Promise<any[]> {
        this.log('Processing file data array');
        return data.map(item => this.process(item));
    }
    
    /**
     * Implementation of interface method
     * Code lens should show references
     */
    async initialize(): Promise<void> {
        this.log('Initializing FileProcessor');
        // Mock file system initialization
        await new Promise(resolve => setTimeout(resolve, 50));
    }
}

/**
 * Service manager class that uses the processors
 * Code lens should show references to this class and its methods
 */
export class ProcessorManager {
    private processors: ITestService[] = [];
    
    /**
     * Constructor that takes processors
     * Code lens might show references to constructor calls
     */
    constructor(processors: ITestService[] = []) {
        this.processors = processors;
    }
    
    /**
     * Method that adds a processor - will be called from factory functions
     * Code lens should show references
     */
    addProcessor(processor: ITestService): void {
        this.processors.push(processor);
    }
    
    /**
     * Method that processes data using all processors
     * Code lens should show references and potentially run/debug options
     */
    async processWithAll(data: any[]): Promise<any[][]> {
        const results: any[][] = [];
        
        for (const processor of this.processors) {
            const result = await processor.processData(data);
            results.push(result);
        }
        
        return results;
    }
    
    /**
     * Method that initializes all processors
     * Code lens should show references
     */
    async initializeAll(): Promise<void> {
        const initPromises = this.processors.map(p => p.initialize());
        await Promise.all(initPromises);
    }
    
    /**
     * Getter that returns processor count
     * Code lens should show references
     */
    get processorCount(): number {
        return this.processors.length;
    }
}

/**
 * Factory function that creates and configures a manager
 * Code lens should show references to this function
 */
export function createProcessorManager(): ProcessorManager {
    const manager = new ProcessorManager();
    
    // These calls should show up as references in code lens
    const dataProcessor = DataProcessor.createInstance();
    const fileProcessor = new FileProcessor();
    
    manager.addProcessor(dataProcessor);
    manager.addProcessor(fileProcessor);
    
    return manager;
}

/**
 * Utility function that processes data with a specific processor
 * Code lens should show references to this function
 */
export async function processWithProcessor(
    processor: ITestService, 
    data: any[]
): Promise<any[]> {
    await processor.initialize();
    return processor.processData(data);
}

/**
 * Main function that demonstrates usage
 * Code lens should show references and potentially run/debug options
 */
export async function runProcessingExample(): Promise<void> {
    const manager = createProcessorManager();
    
    await manager.initializeAll();
    
    const testData = [
        { id: 1, value: 'test1' },
        { id: 2, value: 'test2' },
        { id: 3, value: 'test3' }
    ];
    
    const results = await manager.processWithAll(testData);
    console.log('Processing results:', results);
    console.log('Total processors:', manager.processorCount);
}

/**
 * Test function that uses individual processors
 * Code lens should show references
 */
export async function testIndividualProcessors(): Promise<void> {
    const dataProcessor = new DataProcessor();
    const fileProcessor = new FileProcessor();
    
    const testData = [{ id: 1, name: 'test' }];
    
    const dataResult = await processWithProcessor(dataProcessor, testData);
    const fileResult = await processWithProcessor(fileProcessor, testData);
    
    console.log('Data processor result:', dataResult);
    console.log('File processor result:', fileResult);
    console.log('Data processor status:', dataProcessor.getStatus());
}

// Module-level code that calls functions - should create references
if (typeof module !== 'undefined' && require.main === module) {
    runProcessingExample().catch(console.error);
}

// Export all for testing - these exports should show references if used
export {
    BaseProcessor,
    DataProcessor,
    FileProcessor,
    ProcessorManager,
    createProcessorManager,
    processWithProcessor,
    runProcessingExample,
    testIndividualProcessors
};
`

		const testUri = await createTestFile("test-get-code-lens.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test getting code lens for the entire document
		// Code lens operates on the entire document, not specific positions
		const getCodeLensParams = {
			textDocument: {
				uri: testUri.toString(),
			},
		}

		const block = {
			type: "tool_use" as const,
			name: "lsp" as const,
			params: {
				lsp_operation: "get_code_lens",
				_text: JSON.stringify(getCodeLensParams),
			},
			partial: false,
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
			const codeLensData = resultData.data

			// Code lens can return an array of CodeLens objects or null/empty array
			if (codeLensData === null || codeLensData === undefined) {
				// This is actually a valid result - some files may not have code lens
				return {
					tool,
					passed: true,
					details: {
						message: "Code lens operation completed successfully with no code lens items",
						codeLensCount: 0,
						reason: "No code lens items found - this is expected if the language server does not provide code lens for TypeScript files or if the feature is disabled",
					},
				}
			}

			// Expect code lens data to be an array
			if (!Array.isArray(codeLensData)) {
				return {
					tool,
					passed: false,
					error: "Expected code lens data to be an array",
					details: {
						codeLensData,
						dataType: typeof codeLensData,
						resultData,
					},
				}
			}

			// Empty array is also a valid result
			if (codeLensData.length === 0) {
				return {
					tool,
					passed: true,
					details: {
						message: "Code lens operation completed successfully with empty array",
						codeLensCount: 0,
						reason: "No code lens items found - this may be expected if the TypeScript language server is not providing code lens or if the feature is not enabled",
					},
				}
			}

			// Validate the structure of code lens items
			const validationErrors: string[] = []

			for (let i = 0; i < Math.min(codeLensData.length, 5); i++) {
				const lens = codeLensData[i]

				// Check required properties according to CodeLens type
				if (!lens || typeof lens !== "object") {
					validationErrors.push(`Code lens ${i}: is not an object`)
					continue
				}

				if (!lens.range || typeof lens.range !== "object") {
					validationErrors.push(`Code lens ${i}: missing or invalid 'range' property`)
				}

				if (lens.range) {
					if (!lens.range.start || typeof lens.range.start !== "object") {
						validationErrors.push(`Code lens ${i}: range missing or invalid 'start' property`)
					}

					if (!lens.range.end || typeof lens.range.end !== "object") {
						validationErrors.push(`Code lens ${i}: range missing or invalid 'end' property`)
					}

					if (lens.range.start) {
						if (typeof lens.range.start.line !== "number") {
							validationErrors.push(`Code lens ${i}: range.start.line is not a number`)
						}

						if (typeof lens.range.start.character !== "number") {
							validationErrors.push(`Code lens ${i}: range.start.character is not a number`)
						}
					}

					if (lens.range.end) {
						if (typeof lens.range.end.line !== "number") {
							validationErrors.push(`Code lens ${i}: range.end.line is not a number`)
						}

						if (typeof lens.range.end.character !== "number") {
							validationErrors.push(`Code lens ${i}: range.end.character is not a number`)
						}
					}
				}

				// Command is optional but if present should have correct structure
				if (lens.command !== undefined) {
					if (typeof lens.command !== "object" || lens.command === null) {
						validationErrors.push(`Code lens ${i}: command should be an object or undefined`)
					} else {
						if (typeof lens.command.title !== "string") {
							validationErrors.push(`Code lens ${i}: command.title should be a string`)
						}

						if (typeof lens.command.command !== "string") {
							validationErrors.push(`Code lens ${i}: command.command should be a string`)
						}

						if (lens.command.arguments !== undefined && !Array.isArray(lens.command.arguments)) {
							validationErrors.push(`Code lens ${i}: command.arguments should be an array or undefined`)
						}
					}
				}
			}

			if (validationErrors.length > 0) {
				return {
					tool,
					passed: false,
					error: `Code lens validation errors: ${validationErrors.join("; ")}`,
					details: {
						validationErrors,
						sampleCodeLens: codeLensData.slice(0, 3),
						codeLensData,
						resultData,
					},
				}
			}

			// Analyze the code lens items for expected content
			const lensesWithCommands = codeLensData.filter((lens) => lens.command !== undefined)
			const commandTitles = lensesWithCommands.map((lens) => lens.command?.title).filter(Boolean)
			const commandNames = lensesWithCommands.map((lens) => lens.command?.command).filter(Boolean)

			// Check for common code lens patterns
			const hasReferences = commandTitles.some(
				(title) => title?.toLowerCase().includes("reference") || title?.toLowerCase().includes("usage"),
			)

			const hasImplementations = commandTitles.some((title) => title?.toLowerCase().includes("implementation"))

			const hasRunDebug = commandTitles.some(
				(title) => title?.toLowerCase().includes("run") || title?.toLowerCase().includes("debug"),
			)

			// Check if lenses are positioned on reasonable lines (not empty lines)
			const lensLines = codeLensData.map((lens) => lens.range.start.line)
			const uniqueLines = Array.from(new Set(lensLines))

			// Success: we found valid code lens information
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully retrieved ${codeLensData.length} code lens items`,
					codeLensCount: codeLensData.length,
					lensesWithCommands: lensesWithCommands.length,
					lensesWithoutCommands: codeLensData.length - lensesWithCommands.length,
					uniqueLines: uniqueLines.length,
					lineRange: {
						min: Math.min(...lensLines),
						max: Math.max(...lensLines),
					},
					contentAnalysis: {
						hasReferences,
						hasImplementations,
						hasRunDebug,
						totalCommandTitles: commandTitles.length,
						uniqueCommandTitles: Array.from(new Set(commandTitles)).length,
					},
					sampleCodeLens: codeLensData.slice(0, 5).map((lens) => ({
						line: lens.range.start.line,
						character: lens.range.start.character,
						hasCommand: !!lens.command,
						commandTitle: lens.command?.title,
						commandName: lens.command?.command,
					})),
					commandTypes: Array.from(new Set(commandNames)).slice(0, 10), // First 10 unique command types
					documentAnalysis: {
						expectedReferencesOrImplementations: true,
						foundCodeLensItems: codeLensData.length > 0,
						reasonableDistribution: uniqueLines.length > 1 || codeLensData.length === 1,
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

		// Check for code lens not supported
		if (
			errorMessage.includes("not supported") ||
			errorMessage.includes("CodeLens") ||
			errorMessage.includes("capability")
		) {
			return {
				tool,
				passed: false,
				error: "Code lens not supported by the language server - this may be expected for some LSP implementations",
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
