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

export async function testReplaceSymbolBody(): Promise<TestResult> {
	const tool = "replace_symbol_body"

	try {
		// Create test TypeScript file with functions, classes, and methods with bodies
		const testContent = `
// Test file for replace symbol body functionality
export function testFunction() {
    console.log("Original function body");
    return "original result";
}

export const testVariable = "test value";

export class TestClass {
    private value: string = "initial";
    
    testMethod() {
        console.log("Original method body");
        return this.value;
    }
    
    anotherMethod(param: string) {
        console.log("Another method", param);
        this.value = param;
        return param.toUpperCase();
    }
    
    get getValue() {
        return this.value;
    }
    
    set setValue(newValue: string) {
        this.value = newValue;
    }
}

export interface TestInterface {
    name: string;
    value: number;
}

// Function with parameters and complex body
export function complexFunction(a: number, b: string): string {
    if (a > 0) {
        console.log("Positive number:", a);
        return b.repeat(a);
    } else {
        console.log("Non-positive number:", a);
        return b;
    }
}

// Async function with body
export async function asyncFunction(): Promise<string> {
    console.log("Starting async operation");
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log("Async operation completed");
    return "async result";
}

// Arrow function
export const arrowFunction = (x: number) => {
    console.log("Arrow function called with:", x);
    return x * 2;
};

// Class method with complex logic
export class Calculator {
    add(a: number, b: number): number {
        console.log("Adding numbers:", a, b);
        const result = a + b;
        console.log("Result:", result);
        return result;
    }
    
    multiply(a: number, b: number): number {
        let result = 0;
        for (let i = 0; i < b; i++) {
            result += a;
        }
        return result;
    }
}
`

		const testUri = await createTestFile("test-replace-symbol-body.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test replacing the body of 'testFunction' which should be at line 3
		// Position should point to the function name for the go-to-definition to work
		const replaceSymbolBodyParams = {
			textDocument: {
				uri: testUri.toString(),
			},
			position: {
				line: 1, // Line where testFunction is defined (0-based)
				character: 17, // Character position of 'testFunction' (0-based)
			},
			replacement: `{
    console.log("Replaced function body - new implementation");
    const newResult = "completely new result";
    console.log("Returning:", newResult);
    return newResult;
}`,
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "replace_symbol_body",
				_text: JSON.stringify(replaceSymbolBodyParams),
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
				(uri) => uri === targetUri || uri.endsWith("test-replace-symbol-body.ts"),
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
				Object.values(changes).find((_, index) => changeUris[index].endsWith("test-replace-symbol-body.ts"))

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

			// Verify the replacement content was properly applied
			const replacementText = targetChanges[0].newText
			if (
				!replacementText.includes("Replaced function body") ||
				!replacementText.includes("completely new result")
			) {
				return {
					tool,
					passed: false,
					error: "Replacement content does not match expected text",
					details: {
						replacementText,
						targetChanges,
						workspaceEdit,
						resultData,
					},
				}
			}

			// Verify that this is a replacement operation (should have a range that spans the symbol body)
			const edit = targetChanges[0]
			const hasValidRange =
				edit.range.start.line !== undefined &&
				edit.range.end.line !== undefined &&
				edit.range.start.character !== undefined &&
				edit.range.end.character !== undefined

			if (!hasValidRange) {
				return {
					tool,
					passed: false,
					error: "Text edit does not have valid range for symbol body replacement",
					details: {
						editRange: edit.range,
						targetChanges,
						workspaceEdit,
						resultData,
					},
				}
			}

			// Success: workspace edit was created successfully for symbol body replacement
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully created workspace edit to replace symbol body`,
					editCount: targetChanges.length,
					replacementText: replacementText,
					editRange: {
						start: {
							line: edit.range.start.line,
							character: edit.range.start.character,
						},
						end: {
							line: edit.range.end.line,
							character: edit.range.end.character,
						},
					},
					fileUri: targetUri,
					originalSymbol: "testFunction",
					operation: "body replacement",
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
