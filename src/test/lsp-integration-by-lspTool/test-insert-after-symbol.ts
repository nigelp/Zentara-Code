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

export async function testInsertAfterSymbol(): Promise<TestResult> {
	const tool = "insert_after_symbol"

	try {
		// Create test TypeScript file with functions, classes, and methods
		const testContent = `
// Test file for insert after symbol functionality
export function testFunction() {
    return "Hello from testFunction";
}

export const testVariable = "test value";

export class TestClass {
    testMethod() {
        return "method result";
    }
    
    anotherMethod(param: string) {
        console.log(param);
    }
}

export interface TestInterface {
    name: string;
    value: number;
}

// Function with parameters
export function functionWithParams(a: number, b: string): string {
    return a + b;
}

// Async function
export async function asyncFunction(): Promise<string> {
    return "async result";
}
`

		const testUri = await createTestFile("test-insert-after-symbol.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test inserting content after 'testFunction' which should be at line 3
		// Position should point to the function name for the go-to-definition to work
		const insertAfterSymbolParams = {
			textDocument: {
				uri: testUri.toString(),
			},
			position: {
				line: 2, // Line where testFunction is defined (0-based)
				character: 17, // Character position of 'testFunction' (0-based)
			},
			content: `

// This comment was inserted after testFunction
export function insertedFunction() {
    return "This function was inserted after testFunction";
}`,
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "insert_after_symbol",
				_text: JSON.stringify(insertAfterSymbolParams),
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

		// Check if we have a successful result with workspace edit data
		if (resultData.success === true) {
			const workspaceEdit = resultData.data

			if (!workspaceEdit) {
				return {
					tool,
					passed: false,
					error: "Expected workspace edit data in result",
					details: resultData,
				}
			}

			// Verify the workspace edit has the expected structure
			if (typeof workspaceEdit !== "object" || !workspaceEdit.changes) {
				return {
					tool,
					passed: false,
					error: "Workspace edit does not have expected structure (missing changes property)",
					details: { workspaceEdit, resultData },
				}
			}

			const changes = workspaceEdit.changes
			const changeUris = Object.keys(changes)

			if (changeUris.length === 0) {
				return {
					tool,
					passed: false,
					error: "No file changes found in workspace edit",
					details: { workspaceEdit, resultData },
				}
			}

			// Check that we have text edits for the target file
			const targetUri = testUri.toString()
			const hasTargetFileChanges = changeUris.some(
				(uri) => uri === targetUri || uri.endsWith("test-insert-after-symbol.ts"),
			)

			if (!hasTargetFileChanges) {
				return {
					tool,
					passed: false,
					error: "No changes found for target file",
					details: {
						targetUri,
						changeUris,
						workspaceEdit,
						resultData,
					},
				}
			}

			// Get the text edits for the target file
			const targetChanges =
				changes[targetUri] ||
				Object.values(changes).find((_, index) => changeUris[index].endsWith("test-insert-after-symbol.ts"))

			if (!Array.isArray(targetChanges) || targetChanges.length === 0) {
				return {
					tool,
					passed: false,
					error: "No text edits found for target file",
					details: { targetChanges, workspaceEdit, resultData },
				}
			}

			// Verify the text edit structure
			const validEdits = targetChanges.every(
				(edit) =>
					edit.range &&
					typeof edit.range === "object" &&
					typeof edit.range.start === "object" &&
					typeof edit.range.end === "object" &&
					typeof edit.newText === "string",
			)

			if (!validEdits) {
				return {
					tool,
					passed: false,
					error: "Text edits do not have expected structure",
					details: { targetChanges, workspaceEdit, resultData },
				}
			}

			// Verify the content was properly formatted for insertion
			const insertedContent = targetChanges[0].newText
			if (
				!insertedContent.includes("insertedFunction") ||
				!insertedContent.includes("inserted after testFunction")
			) {
				return {
					tool,
					passed: false,
					error: "Inserted content does not match expected text",
					details: {
						insertedContent,
						targetChanges,
						workspaceEdit,
						resultData,
					},
				}
			}

			// Success: workspace edit was created successfully
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully created workspace edit to insert content after symbol`,
					editCount: targetChanges.length,
					insertedText: insertedContent,
					editPosition: {
						line: targetChanges[0].range.start.line,
						character: targetChanges[0].range.start.character,
					},
					fileUri: targetUri,
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
