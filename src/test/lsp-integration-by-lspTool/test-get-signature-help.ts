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

export async function testGetSignatureHelp(): Promise<TestResult> {
	const tool = "get_signature_help"

	try {
		// Create test TypeScript file with functions that have various parameter signatures
		const testContent = `
// Test file for signature help functionality
export interface DatabaseConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl?: boolean;
}

export interface QueryOptions {
    limit?: number;
    offset?: number;
    orderBy?: string;
    ascending?: boolean;
}

export class DatabaseService {
    private config: DatabaseConfig;
    
    constructor(config: DatabaseConfig) {
        this.config = config;
    }
    
    // Simple function with basic parameters
    public connect(timeout: number = 5000): Promise<boolean> {
        return new Promise((resolve) => {
            setTimeout(() => resolve(true), timeout);
        });
    }
    
    // Function with multiple required parameters
    public executeQuery(
        query: string, 
        params: any[], 
        options: QueryOptions = {}
    ): Promise<any[]> {
        return Promise.resolve([]);
    }
    
    // Function with optional parameters and union types
    public createUser(
        username: string,
        email: string,
        role: 'admin' | 'user' | 'guest' = 'user',
        metadata?: Record<string, any>
    ): Promise<{ id: number; username: string }> {
        return Promise.resolve({ id: 1, username });
    }
    
    // Function with complex parameter types
    public batchInsert<T>(
        tableName: string,
        records: T[],
        batchSize: number = 100,
        onProgress?: (completed: number, total: number) => void
    ): Promise<number> {
        return Promise.resolve(records.length);
    }
    
    // Function with destructured parameters
    public configureConnection({
        host,
        port,
        retries = 3,
        timeout = 30000
    }: {
        host: string;
        port: number;
        retries?: number;
        timeout?: number;
    }): void {
        // Implementation
    }
    
    // Static method with overloads (simplified)
    public static parseConnectionString(
        connectionString: string,
        options?: { strict?: boolean }
    ): DatabaseConfig {
        return {} as DatabaseConfig;
    }
}

// Test functions with different parameter patterns
export function calculateTotal(
    price: number, 
    quantity: number, 
    taxRate: number = 0.08,
    discountPercent?: number
): number {
    const subtotal = price * quantity;
    const discount = discountPercent ? subtotal * (discountPercent / 100) : 0;
    const tax = (subtotal - discount) * taxRate;
    return subtotal - discount + tax;
}

export function processData<T, R>(
    data: T[],
    transformer: (item: T, index: number) => R,
    filter?: (item: T) => boolean,
    batchSize: number = 50
): R[] {
    return [];
}

export function mergeConfigs(
    baseConfig: Record<string, any>,
    ...overrides: Array<Partial<Record<string, any>>>
): Record<string, any> {
    return Object.assign({}, baseConfig, ...overrides);
}

// Test scenarios where signature help should be triggered
function testSignatureHelpScenarios() {
    const dbService = new DatabaseService({
        host: "localhost",
        port: 5432,
        username: "admin",
        password: "secret",
        database: "testdb"
    });
    
    // Test signature help for method calls
    dbService.executeQuery(
        // Cursor position here should show signature help for executeQuery parameters
    );
    
    // Test signature help for function calls with partial parameters
    const total = calculateTotal(
        10.99,
        // Cursor position here should show remaining parameters
    );
    
    // Test signature help for constructor calls
    const newService = new DatabaseService(
        // Cursor position here should show DatabaseConfig parameter structure
    );
    
    // Test signature help for generic function calls
    const processed = processData(
        [1, 2, 3],
        // Cursor position here should show transformer function signature
    );
    
    // Test signature help for static method calls
    const config = DatabaseService.parseConnectionString(
        "host=localhost;port=5432",
        // Cursor position here should show optional options parameter
    );
    
    // Test signature help for variadic function calls
    const merged = mergeConfigs(
        { a: 1 },
        { b: 2 },
        // Cursor position here should show ...overrides signature
    );
}
`

		const testUri = await createTestFile("test-get-signature-help.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test case: Get signature help for calculateTotal function call
		// Position is inside the parentheses after "calculateTotal("
		// Line 148 in source (1-based) = line 147 (0-based) in the actual file
		const getSignatureHelpParams = {
			textDocument: {
				uri: testUri.toString(),
			},
			position: {
				line: 148, // Line with "const total = calculateTotal(" (0-based) - has first param "10.99,"
				character: 14, // Character position right after the opening parenthesis
			},
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "get_signature_help",
				_text: JSON.stringify(getSignatureHelpParams),
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
			const signatureHelp = resultData.data

			// Signature help can be null if no signatures are available at the position
			if (signatureHelp === null || signatureHelp === undefined) {
				return {
					tool,
					passed: false,
					error: "No signature help available at the specified position",
					details: { signatureHelp, resultData },
				}
			}

			// Check that signature help has the expected structure
			if (typeof signatureHelp !== "object") {
				return {
					tool,
					passed: false,
					error: "Expected signature help to be an object",
					details: { signatureHelp, resultData },
				}
			}

			// SignatureHelp should have signatures array
			if (!Array.isArray(signatureHelp.signatures)) {
				return {
					tool,
					passed: false,
					error: "Expected signatures array in signature help",
					details: { signatureHelp, resultData },
				}
			}

			// For signature help, we expect at least one signature
			if (signatureHelp.signatures.length === 0) {
				return {
					tool,
					passed: false,
					error: "No signatures found in signature help",
					details: { signatureHelp, resultData },
				}
			}

			// Validate signature structure
			const validSignatures = signatureHelp.signatures.every((signature) => {
				// Each signature should have a label
				if (typeof signature.label !== "string") {
					return false
				}

				// Parameters array is optional but if present should be valid
				if (signature.parameters && !Array.isArray(signature.parameters)) {
					return false
				}

				// If parameters exist, validate their structure
				if (signature.parameters) {
					return signature.parameters.every(
						(param) =>
							typeof param.label === "string" ||
							(Array.isArray(param.label) &&
								param.label.length === 2 &&
								typeof param.label[0] === "number" &&
								typeof param.label[1] === "number"),
					)
				}

				return true
			})

			if (!validSignatures) {
				return {
					tool,
					passed: false,
					error: "Signatures do not have expected structure",
					details: {
						signatures: signatureHelp.signatures.slice(0, 3), // Show first 3 for debugging
						signatureHelp,
						resultData,
					},
				}
			}

			// Check that we have reasonable signature content
			const firstSignature = signatureHelp.signatures[0]

			// The signature should contain method name and parameters
			const hasMethodInfo =
				firstSignature.label.includes("executeQuery") ||
				firstSignature.label.includes("query") ||
				firstSignature.label.includes("params") ||
				firstSignature.label.includes("options")

			if (!hasMethodInfo) {
				return {
					tool,
					passed: false,
					error: "Signature does not contain expected method information",
					details: {
						expectedMethod: "executeQuery",
						firstSignatureLabel: firstSignature.label,
						signatureHelp,
						resultData,
					},
				}
			}

			// Check if activeSignature and activeParameter are reasonable
			const activeSignature = signatureHelp.activeSignature
			const activeParameter = signatureHelp.activeParameter

			if (
				activeSignature !== undefined &&
				(typeof activeSignature !== "number" ||
					activeSignature < 0 ||
					activeSignature >= signatureHelp.signatures.length)
			) {
				return {
					tool,
					passed: false,
					error: "Invalid activeSignature index",
					details: {
						activeSignature,
						signaturesLength: signatureHelp.signatures.length,
						signatureHelp,
						resultData,
					},
				}
			}

			if (activeParameter !== undefined && typeof activeParameter !== "number") {
				return {
					tool,
					passed: false,
					error: "activeParameter should be a number when present",
					details: { activeParameter, signatureHelp, resultData },
				}
			}

			// Success: we found valid signature help with expected content
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully retrieved signature help with ${signatureHelp.signatures.length} signature(s)`,
					signatureCount: signatureHelp.signatures.length,
					activeSignature: activeSignature,
					activeParameter: activeParameter,
					primarySignature: {
						label: firstSignature.label,
						parameterCount: firstSignature.parameters?.length || 0,
						hasDocumentation: !!firstSignature.documentation,
					},
					allSignatureLabels: signatureHelp.signatures.map((sig) => sig.label),
					parameterDetails:
						firstSignature.parameters?.map((param) => ({
							label:
								typeof param.label === "string"
									? param.label
									: `[${param.label[0]}, ${param.label[1]}]`,
							hasDocumentation: !!param.documentation,
						})) || [],
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
