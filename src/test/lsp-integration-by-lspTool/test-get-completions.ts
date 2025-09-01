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

export async function testGetCompletions(): Promise<TestResult> {
	const tool = "get_completions"

	try {
		// Create test TypeScript file with various code patterns for completion testing
		const testContent = `
// Test file for code completion functionality
export interface PersonData {
    name: string;
    age: number;
    email: string;
    address: {
        street: string;
        city: string;
        zipCode: string;
    };
    preferences: {
        theme: 'light' | 'dark';
        notifications: boolean;
        language: string;
    };
}

export class PersonService {
    private persons: PersonData[] = [];
    
    constructor() {
        this.loadDefaultPersons();
    }
    
    private loadDefaultPersons(): void {
        this.persons.push({
            name: "John Doe",
            age: 30,
            email: "john@example.com",
            address: {
                street: "123 Main St",
                city: "Springfield",
                zipCode: "12345"
            },
            preferences: {
                theme: 'light',
                notifications: true,
                language: 'en'
            }
        });
    }
    
    public addPerson(person: PersonData): void {
        this.persons.push(person);
    }
    
    public getPersonByName(name: string): PersonData | undefined {
        return this.persons.find(p => p.name === name);
    }
    
    public updatePersonPreferences(name: string, prefs: Partial<PersonData['preferences']>): boolean {
        const person = this.getPersonByName(name);
        if (person) {
            person.preferences = { ...person.preferences, ...prefs };
            return true;
        }
        return false;
    }
    
    public getAllPersons(): PersonData[] {
        return [...this.persons];
    }
    
    public getPersonCount(): number {
        return this.persons.length;
    }
}

// Test function where we'll test completions
function testCompletionScenarios() {
    const service = new PersonService();
    const person = service.getPersonByName("John Doe");
    
    if (person) {
        // Test completion after object property access - should show PersonData properties
        const personName = person.
        
        // Test completion after nested object access - should show address properties  
        const personCity = person.address.
        
        // Test completion after service method access - should show PersonService methods
        service.
    }
    
    // Test completion for interface properties in object literal
    const newPerson: PersonData = {
        name: "Jane Smith",
        age: 25,
        email: "jane@example.com",
        address: {
            street: "456 Oak Ave",
            city: "Portland", 
            zipCode: "97201"
        },
        preferences: {
            // Test completion inside nested object - should show preference options
            theme: 
        }
    };
}
`

		const testUri = await createTestFile("test-get-completions.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test case 1: Get completions after "person." (should show PersonData properties)
		// This tests completion at line with "const personName = person."
		// Position points to after the dot where completion should trigger
		const getCompletionsParams = {
			textDocument: {
				uri: testUri.toString(),
			},
			position: {
				line: 73, // Line with "const personName = person." (0-based indexing)
				character: 31, // Character position right after the dot
			},
			triggerCharacter: ".", // Optional trigger character
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "get_completions",
				_text: JSON.stringify(getCompletionsParams),
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
			const completions = resultData.data

			if (!Array.isArray(completions)) {
				return {
					tool,
					passed: false,
					error: "Expected completions array in result data",
					details: resultData,
				}
			}

			// For get_completions, we expect at least some completion items
			if (completions.length === 0) {
				return {
					tool,
					passed: false,
					error: "No completion items found for person object property access",
					details: { completions, resultData },
				}
			}

			// Check that each completion item has the expected structure
			const validCompletions = completions.every(
				(completion) =>
					typeof completion.label === "string" &&
					(completion.kind === undefined || typeof completion.kind === "number") &&
					(completion.detail === undefined || typeof completion.detail === "string") &&
					(completion.documentation === undefined ||
						typeof completion.documentation === "string" ||
						typeof completion.documentation === "object"),
			)

			if (!validCompletions) {
				return {
					tool,
					passed: false,
					error: "Completion items do not have expected structure",
					details: {
						completions: completions.slice(0, 5), // Show first 5 for debugging
						resultData,
					},
				}
			}

			// Verify we get expected completion suggestions for PersonData properties
			const completionLabels = completions.map((c) => c.label.toLowerCase())
			const expectedProperties = ["name", "age", "email", "address", "preferences"]

			// Check if we have at least some of the expected properties
			const foundProperties = expectedProperties.filter((prop) =>
				completionLabels.some((label) => label.includes(prop)),
			)

			if (foundProperties.length === 0) {
				return {
					tool,
					passed: false,
					error: `No expected PersonData properties found in completions. Expected any of: ${expectedProperties.join(", ")}`,
					details: {
						expectedProperties,
						foundProperties,
						actualCompletions: completionLabels.slice(0, 10), // Show first 10 for debugging
						completionCount: completions.length,
						resultData,
					},
				}
			}

			// Verify completion items have reasonable content
			const hasDetailedCompletions = completions.some(
				(completion) => completion.detail || completion.documentation,
			)

			// Success: we found valid completions with expected properties
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully retrieved ${completions.length} completion items with ${foundProperties.length} expected properties`,
					completionCount: completions.length,
					foundProperties,
					hasDetailedCompletions,
					sampleCompletions: completions.slice(0, 5).map((c) => ({
						label: c.label,
						kind: c.kind,
						detail: c.detail,
						hasDocumentation: !!c.documentation,
					})),
					allCompletionLabels: completionLabels.slice(0, 15), // Show first 15 labels
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
