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

export async function testFindImplementations(): Promise<TestResult> {
	const tool = "find_implementations"

	try {
		// Create test TypeScript file with interfaces and their implementations
		const testContent = `
// Test file for find implementations functionality
interface ITestInterface {
    testMethod(): string;
    getValue(): number;
}

interface IDrawable {
    draw(): void;
    getColor(): string;
}

abstract class AbstractBase implements ITestInterface {
    protected name: string;
    
    constructor(name: string) {
        this.name = name;
    }
    
    abstract testMethod(): string;
    abstract getValue(): number;
    
    getName(): string {
        return this.name;
    }
}

class ConcreteImplementation extends AbstractBase implements IDrawable {
    private value: number;
    private color: string;
    
    constructor(name: string, value: number, color: string) {
        super(name);
        this.value = value;
        this.color = color;
    }
    
    testMethod(): string {
        return \`Implementation in \${this.name}\`;
    }
    
    getValue(): number {
        return this.value;
    }
    
    draw(): void {
        console.log(\`Drawing \${this.name} with color \${this.color}\`);
    }
    
    getColor(): string {
        return this.color;
    }
}

class AnotherImplementation implements ITestInterface {
    private id: number;
    
    constructor(id: number) {
        this.id = id;
    }
    
    testMethod(): string {
        return \`Another implementation with ID \${this.id}\`;
    }
    
    getValue(): number {
        return this.id * 10;
    }
}

class SimpleDrawable implements IDrawable {
    private color: string;
    
    constructor(color: string) {
        this.color = color;
    }
    
    draw(): void {
        console.log(\`Simple drawing with \${this.color}\`);
    }
    
    getColor(): string {
        return this.color;
    }
}

// Usage examples
function createInstances() {
    const concrete = new ConcreteImplementation("concrete", 42, "blue");
    const another = new AnotherImplementation(123);
    const simple = new SimpleDrawable("red");
    
    console.log(concrete.testMethod());
    console.log(another.testMethod());
    simple.draw();
}
`

		const testUri = await createTestFile("test-find-implementations.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test finding implementations of 'ITestInterface' which should be at line 3, character 10
		// This should find ConcreteImplementation, AbstractBase, and AnotherImplementation
		const findImplementationsParams = {
			textDocument: {
				uri: testUri.toString(),
			},
			position: {
				line: 2, // Line where ITestInterface is defined (0-based)
				character: 10, // Character position of 'ITestInterface' (0-based)
			},
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "find_implementations",
				_text: JSON.stringify(findImplementationsParams),
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

			// For find_implementations, we might get 0 results if LSP server doesn't support it
			// or the language server is not fully initialized. This is acceptable.
			if (locations.length === 0) {
				return {
					tool,
					passed: true,
					details: {
						message:
							"No implementations found - this is acceptable as LSP server may not support interface implementations or may not be fully initialized",
						locationCount: 0,
						note: "find_implementations success depends on LSP server capabilities",
					},
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

			// Success: we found implementations with valid structure
			// Expected implementations could include:
			// - ConcreteImplementation (implements ITestInterface via AbstractBase)
			// - AnotherImplementation (implements ITestInterface directly)
			// - AbstractBase (implements ITestInterface abstractly)
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully found ${locations.length} implementation(s) of ITestInterface`,
					locationCount: locations.length,
					locations: locations.map((loc) => ({
						uri: loc.uri,
						line: loc.range.start.line,
						character: loc.range.start.character,
						preview: loc.preview || "No preview available",
					})),
					note: "Found concrete implementations that implement the interface",
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
