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

export async function testGetCodeActions(): Promise<TestResult> {
	const tool = "get_code_actions"

	try {
		// Create test TypeScript file with code that has fixable issues and potential improvements
		const testContent = `
// Test file with various code issues that should trigger code actions
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util'; // This might be unused in some contexts

// Unused import that should trigger "Remove unused import" code action
import * as crypto from 'crypto';

// Interface with potential improvements
interface UserData {
    name: string;
    age: number;
    email: string;
    isActive: boolean;
}

// Class with potential refactoring opportunities
export class UserService {
    private users: UserData[] = [];
    
    constructor() {
        this.loadUsers();
    }
    
    // Method with potential code action opportunities
    private loadUsers(): void {
        // Hard-coded data that could be extracted to a constant
        this.users = [
            { name: "John Doe", age: 30, email: "john@example.com", isActive: true },
            { name: "Jane Smith", age: 25, email: "jane@example.com", isActive: false }
        ];
    }
    
    // Method with TypeScript errors that should have quick fixes
    public addUser(userData: UserData): void {
        // Missing null check - should trigger "Add null check" code action
        const existingUser = this.users.find(u => u.email === userData.email);
        if (existingUser) {
            throw new Error("User already exists");
        }
        
        // Potential refactoring: extract validation
        if (!userData.name || userData.name.trim().length === 0) {
            throw new Error("Name is required");
        }
        
        if (!userData.email || !userData.email.includes("@")) {
            throw new Error("Valid email is required");
        }
        
        this.users.push(userData);
    }
    
    // Method with unused variable that should trigger code actions
    public getUserByEmail(email: string): UserData | undefined {
        const startTime = Date.now(); // Unused variable
        
        // Long expression that could be extracted to variable
        return this.users.find(user => 
            user.email.toLowerCase() === email.toLowerCase() && 
            user.isActive === true
        );
    }
    
    // Method with potential performance improvements
    public getActiveUsers(): UserData[] {
        // This could benefit from optimization suggestions
        const result = [];
        for (let i = 0; i < this.users.length; i++) {
            if (this.users[i].isActive) {
                result.push(this.users[i]);
            }
        }
        return result;
    }
    
    // Method with magic numbers that could be extracted to constants
    public validateAge(age: number): boolean {
        return age >= 13 && age <= 120; // Magic numbers
    }
    
    // Async method with potential Promise improvements
    public async saveToFile(filePath: string): Promise<void> {
        const data = JSON.stringify(this.users, null, 2);
        
        // This could be improved with better error handling
        fs.writeFileSync(filePath, data);
    }
    
    // Method that could benefit from destructuring suggestions
    public updateUser(email: string, updates: Partial<UserData>): boolean {
        const user = this.getUserByEmail(email);
        if (user) {
            // This assignment pattern could be improved
            user.name = updates.name || user.name;
            user.age = updates.age || user.age;
            user.email = updates.email || user.email;
            user.isActive = updates.isActive !== undefined ? updates.isActive : user.isActive;
            return true;
        }
        return false;
    }
}

// Function with potential extract method opportunities
function processUserData(users: UserData[]): string {
    let output = "User Report:\\n";
    
    // This section could be extracted to a separate method
    const activeUsers = users.filter(u => u.isActive);
    const inactiveUsers = users.filter(u => !u.isActive);
    
    output += \`Active Users: \${activeUsers.length}\\n\`;
    output += \`Inactive Users: \${inactiveUsers.length}\\n\`;
    
    // Another section that could be extracted
    const averageAge = users.reduce((sum, user) => sum + user.age, 0) / users.length;
    output += \`Average Age: \${averageAge.toFixed(2)}\\n\`;
    
    return output;
}

// Potential improvements for organization
const DEFAULT_CONFIG = {
    maxUsers: 1000,
    defaultActive: true,
    requiredFields: ['name', 'email']
};

// Expression that might trigger "Convert to arrow function" code action
const simpleValidator = function(value: string): boolean {
    return value !== null && value !== undefined && value.trim().length > 0;
};

// Variable assignment that could benefit from const assertion
const statusOptions = ['active', 'inactive', 'pending'];

// This line should trigger code actions for unused imports and other improvements
export { UserService, UserData };
`

		const testUri = await createTestFile("test-get-code-actions.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test case: Get code actions for unused import (crypto)
		// This should trigger code actions like "Remove unused import"
		// Position points to the unused crypto import line
		const getCodeActionsParams = {
			textDocument: {
				uri: testUri.toString(),
			},
			position: {
				line: 6, // Line with unused crypto import (1-based indexing for LSP)
				character: 15, // Character position on "crypto"
			},
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "get_code_actions",
				_text: JSON.stringify(getCodeActionsParams),
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
			const codeActions = resultData.data

			if (!Array.isArray(codeActions)) {
				return {
					tool,
					passed: false,
					error: "Expected code actions array in result data",
					details: resultData,
				}
			}

			// Code actions might be empty if there are no suggestions at this position
			// This is valid behavior, so we'll consider it a pass but note it
			if (codeActions.length === 0) {
				return {
					tool,
					passed: true,
					details: {
						message: "No code actions found at the specified position - this is valid behavior",
						codeActionCount: 0,
						position: getCodeActionsParams.position,
						resultData,
					},
				}
			}

			// Check that each code action has the expected structure
			const validCodeActions = codeActions.every(
				(action) =>
					typeof action.title === "string" &&
					(action.kind === undefined || typeof action.kind === "string") &&
					(action.command === undefined || typeof action.command === "string"),
			)

			if (!validCodeActions) {
				return {
					tool,
					passed: false,
					error: "Code actions do not have expected structure",
					details: {
						codeActions: codeActions.slice(0, 5), // Show first 5 for debugging
						resultData,
					},
				}
			}

			// Look for common code action types
			const actionTitles = codeActions.map((action) => action.title.toLowerCase())
			const actionKinds = codeActions.map((action) => action.kind).filter((kind) => kind)

			// Common code action patterns we might expect
			const expectedPatterns = [
				"remove unused",
				"remove import",
				"add missing",
				"fix",
				"quick fix",
				"refactor",
				"extract",
				"organize imports",
				"update import",
				"convert",
				"simplify",
			]

			const foundPatterns = expectedPatterns.filter((pattern) =>
				actionTitles.some((title) => title.includes(pattern)),
			)

			// Check for common code action kinds
			const commonKinds = ["quickfix", "refactor", "source"]
			const foundKinds = commonKinds.filter((kind) =>
				actionKinds.some((actionKind) => actionKind && actionKind.includes(kind)),
			)

			// Success: we found valid code actions
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully retrieved ${codeActions.length} code actions`,
					codeActionCount: codeActions.length,
					foundPatterns,
					foundKinds,
					sampleActions: codeActions.slice(0, 5).map((action) => ({
						title: action.title,
						kind: action.kind,
						hasCommand: !!action.command,
					})),
					allActionTitles: actionTitles.slice(0, 10), // Show first 10 titles
					allActionKinds: [...new Set(actionKinds)], // Unique kinds
					position: getCodeActionsParams.position,
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
