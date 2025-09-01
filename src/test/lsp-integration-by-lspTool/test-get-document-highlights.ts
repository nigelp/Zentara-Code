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

export async function testGetDocumentHighlights(): Promise<TestResult> {
	const tool = "get_document_highlights"

	try {
		// Create a test TypeScript file with symbols used multiple times in the document
		const testContent = `
/**
 * Test file for document highlights functionality
 * This file contains variables and functions used in multiple places
 * to test symbol highlighting across read/write occurrences
 */

// Define a variable that will be used multiple times
let userCount: number = 0;

/**
 * User interface with properties used throughout the file
 */
export interface User {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
}

/**
 * A class that manages user data
 * The className 'UserManager' will be referenced in multiple places
 */
export class UserManager {
    private users: User[] = [];
    private maxUsers: number = 100;
    
    constructor() {
        userCount++; // Write reference to userCount
        this.users = [];
        console.log(\`UserManager created. Total user managers: \${userCount}\`); // Read reference to userCount
    }
    
    /**
     * Add a user to the manager
     * The method name 'addUser' will be called multiple times
     */
    public addUser(user: User): boolean {
        if (this.users.length >= this.maxUsers) {
            return false;
        }
        
        this.users.push(user); // Write reference to this.users
        userCount++; // Write reference to userCount
        console.log(\`Added user: \${user.name}. Total users across all managers: \${userCount}\`); // Read references
        return true;
    }
    
    /**
     * Remove a user from the manager
     */
    public removeUser(userId: number): boolean {
        const initialLength = this.users.length; // Read reference to this.users
        this.users = this.users.filter(user => user.id !== userId); // Read and write references to this.users
        
        if (this.users.length < initialLength) { // Read reference to this.users
            userCount--; // Write reference to userCount
            console.log(\`Removed user \${userId}. Total users: \${userCount}\`); // Read reference to userCount
            return true;
        }
        return false;
    }
    
    /**
     * Get all users
     */
    public getUsers(): User[] {
        return [...this.users]; // Read reference to this.users
    }
    
    /**
     * Get user count for this manager
     */
    public getUserCount(): number {
        return this.users.length; // Read reference to this.users
    }
    
    /**
     * Get global user count
     */
    public static getGlobalUserCount(): number {
        return userCount; // Read reference to userCount
    }
}

/**
 * Function that uses UserManager and demonstrates multiple references
 */
function createUserManager(): UserManager {
    const manager = new UserManager(); // Reference to UserManager constructor
    
    // Create some test users
    const testUser1: User = {
        id: 1,
        name: "Alice",
        email: "alice@test.com",
        isActive: true
    };
    
    const testUser2: User = {
        id: 2,
        name: "Bob", 
        email: "bob@test.com",
        isActive: false
    };
    
    // Add users using the addUser method - multiple references
    manager.addUser(testUser1); // Reference to addUser method
    manager.addUser(testUser2); // Reference to addUser method
    
    console.log(\`Manager has \${manager.getUserCount()} users\`); // Reference to getUserCount method
    console.log(\`Global count: \${UserManager.getGlobalUserCount()}\`); // Reference to static method
    
    return manager;
}

/**
 * Another function that uses the same symbols
 */
function processUsers(manager: UserManager): void {
    const users = manager.getUsers(); // Reference to getUsers method
    
    users.forEach(user => {
        console.log(\`Processing user: \${user.name} (\${user.email})\`); // References to User properties
        
        if (!user.isActive) { // Reference to User property
            manager.removeUser(user.id); // Reference to removeUser method and User property
        }
    });
    
    console.log(\`Final count: \${manager.getUserCount()}\`); // Reference to getUserCount method
}

/**
 * Variable that references other symbols
 */
const defaultUser: User = {
    id: 0,
    name: "Default",
    email: "default@test.com", 
    isActive: true
};

// Usage examples that create multiple references
const manager1 = createUserManager(); // Reference to createUserManager function
const manager2 = new UserManager(); // Reference to UserManager constructor

// Add the default user to both managers
manager1.addUser(defaultUser); // References to addUser method and defaultUser variable
manager2.addUser(defaultUser); // References to addUser method and defaultUser variable

// Process users in both managers
processUsers(manager1); // Reference to processUsers function
processUsers(manager2); // Reference to processUsers function

// Final status logging
console.log(\`Total managers created: \${UserManager.getGlobalUserCount()}\`); // Reference to static method
console.log(\`Manager 1 has \${manager1.getUserCount()} users\`); // Reference to getUserCount method
console.log(\`Manager 2 has \${manager2.getUserCount()} users\`); // Reference to getUserCount method

// Export statements that reference symbols
export { UserManager as Manager, defaultUser };
export type { User as UserType };
`

		const testUri = await createTestFile("test-get-document-highlights.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test getting document highlights for the 'userCount' variable
		// Position points to the first declaration of 'userCount' at line 9
		const getDocumentHighlightsParams = {
			textDocument: {
				uri: testUri.toString(),
			},
			position: {
				line: 8, // Line where "let userCount: number = 0;" is defined (0-based)
				character: 4, // Character position pointing to "userCount" in the declaration
			},
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "get_document_highlights",
				_text: JSON.stringify(getDocumentHighlightsParams),
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
			const documentHighlights = resultData.data

			// For get_document_highlights, we expect an array of DocumentHighlight objects or null
			if (documentHighlights === null) {
				return {
					tool,
					passed: false,
					error: "No document highlights found for userCount variable - this might indicate LSP server issues",
					details: { documentHighlights, resultData },
				}
			}

			// Check if document highlights is an array
			if (!Array.isArray(documentHighlights)) {
				return {
					tool,
					passed: false,
					error: "Document highlights should be an array",
					details: { documentHighlights, resultData },
				}
			}

			// If array is empty, that might indicate no highlights found
			if (documentHighlights.length === 0) {
				return {
					tool,
					passed: false,
					error: "No highlights found for userCount variable - unexpected given multiple usages in test file",
					details: { documentHighlights, resultData },
				}
			}

			// Validate the structure of document highlights
			const highlightValidationErrors: string[] = []
			let readHighlights = 0
			let writeHighlights = 0
			let textHighlights = 0

			// DocumentHighlightKind enum values: Read = 1, Write = 2, Text = 3
			const highlightKindMap: Record<number, string> = {
				1: "Read",
				2: "Write",
				3: "Text",
			}

			documentHighlights.forEach((highlight: any, index: number) => {
				// Check required properties
				if (!highlight.range || typeof highlight.range !== "object") {
					highlightValidationErrors.push(`Highlight ${index} missing or invalid 'range' property`)
				} else {
					// Validate range structure
					if (!highlight.range.start || !highlight.range.end) {
						highlightValidationErrors.push(`Highlight ${index} range missing start or end`)
					} else {
						const { start, end } = highlight.range
						if (
							typeof start.line !== "number" ||
							typeof start.character !== "number" ||
							typeof end.line !== "number" ||
							typeof end.character !== "number"
						) {
							highlightValidationErrors.push(`Highlight ${index} range has invalid position structure`)
						}
					}
				}

				// Check highlight kind (optional property)
				if (highlight.kind !== undefined) {
					if (typeof highlight.kind !== "number" || ![1, 2, 3].includes(highlight.kind)) {
						highlightValidationErrors.push(`Highlight ${index} has invalid 'kind' value: ${highlight.kind}`)
					} else {
						// Count highlight types
						switch (highlight.kind) {
							case 1:
								readHighlights++
								break
							case 2:
								writeHighlights++
								break
							case 3:
								textHighlights++
								break
						}
					}
				} else {
					// If kind is not specified, count as text highlight
					textHighlights++
				}
			})

			// Check for validation errors
			if (highlightValidationErrors.length > 0) {
				return {
					tool,
					passed: false,
					error: `Highlight validation errors found: ${highlightValidationErrors.join("; ")}`,
					details: {
						highlightValidationErrors,
						documentHighlights,
						resultData,
					},
				}
			}

			// Check if we have reasonable highlight counts
			const totalHighlights = documentHighlights.length

			// We expect multiple highlights for 'userCount' since it's used many times
			if (totalHighlights < 3) {
				return {
					tool,
					passed: false,
					error: `Expected more highlights for 'userCount' variable. Found only ${totalHighlights} highlights.`,
					details: {
						totalHighlights,
						expectedMinimum: 3,
						documentHighlights,
						resultData,
					},
				}
			}

			// For userCount, we expect both read and write highlights since it's incremented and read
			if (writeHighlights === 0 && readHighlights === 0 && textHighlights < totalHighlights) {
				return {
					tool,
					passed: false,
					error: "Expected to find read and/or write highlights for userCount variable",
					details: {
						readHighlights,
						writeHighlights,
						textHighlights,
						totalHighlights,
						documentHighlights,
						resultData,
					},
				}
			}

			// Validate that highlights are within reasonable line ranges
			const expectedLineRange = { min: 5, max: 120 } // Rough bounds for our test file
			const outOfRangeHighlights = documentHighlights.filter((highlight: any) => {
				const line = highlight.range?.start?.line
				return line < expectedLineRange.min || line > expectedLineRange.max
			})

			if (outOfRangeHighlights.length > 0) {
				return {
					tool,
					passed: false,
					error: `Some highlights are outside expected line range (${expectedLineRange.min}-${expectedLineRange.max})`,
					details: {
						expectedLineRange,
						outOfRangeHighlights,
						documentHighlights,
						resultData,
					},
				}
			}

			// Success: we found valid document highlights with expected structure and content
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully retrieved ${totalHighlights} document highlights for 'userCount' variable`,
					totalHighlights,
					readHighlights,
					writeHighlights,
					textHighlights,
					highlightKinds: documentHighlights.map((h: any) => ({
						kind: h.kind,
						kindName: highlightKindMap[h.kind] || "Unknown",
						line: h.range?.start?.line,
						character: h.range?.start?.character,
					})),
					lineRanges: documentHighlights.map((h: any) => ({
						startLine: h.range?.start?.line,
						endLine: h.range?.end?.line,
						startChar: h.range?.start?.character,
						endChar: h.range?.end?.character,
					})),
					hasReadWriteDistinction: readHighlights > 0 && writeHighlights > 0,
					sampleHighlights: documentHighlights.slice(0, 3).map((h: any) => ({
						range: h.range,
						kind: h.kind,
						kindName: highlightKindMap[h.kind] || "Unknown",
					})),
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
