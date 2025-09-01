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

export async function testRename(): Promise<TestResult> {
	const tool = "rename"

	try {
		// Create test TypeScript file with symbols that can be renamed
		const testContent = `
// Test file for rename functionality
export function myFunction(param: string): string {
    return "Hello from myFunction: " + param;
}

export const myVariable = "test constant value";

export interface MyInterface {
    property: string;
    method(): void;
}

export class MyClass implements MyInterface {
    property: string = "class property";
    
    constructor(value: string) {
        this.property = value;
    }
    
    method(): void {
        console.log("MyClass method called");
    }
    
    static staticMethod(): string {
        return "static method result";
    }
}

export type MyType = {
    name: string;
    value: number;
};

// Usage examples - these variables will be renamed
function testUsages() {
    // Variable usage - we'll test renaming this variable
    const result = myFunction("test");  
    
    // Variable usage - we'll test renaming from here  
    console.log(myVariable);  
    
    // Class usage
    const instance = new MyClass("value");  
    
    // Method usage
    instance.method();  
    
    // Static method usage
    MyClass.staticMethod();  
    
    // Interface usage in type annotation
    const obj: MyInterface = instance;  
    
    // Type usage in type annotation  
    const typedObj: MyType = { name: "test", value: 42 };  
}

// Test variable to be renamed - used in multiple places
const targetVariable = "this will be renamed";
console.log(targetVariable);
const anotherUsage = targetVariable.toUpperCase();

function useTargetVariable() {
    return targetVariable + " - modified";
}
`

		const testUri = await createTestFile("test-rename.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test renaming 'targetVariable' from its declaration
		// Line 78 in source (1-based) = line 77 (0-based) in the actual file
		const renameParams = {
			textDocument: {
				uri: testUri.toString(),
			},
			position: {
				line: 59, // Line where targetVariable is declared (0-based)
				character: 6, // Character position pointing to start of 'targetVariable'
			},
			newName: "renamedVariable", // New name for the symbol
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "rename",
				_text: JSON.stringify(renameParams),
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
			const workspaceEdit = resultData.data

			if (!workspaceEdit || typeof workspaceEdit !== "object") {
				return {
					tool,
					passed: false,
					error: "Expected WorkspaceEdit object in result data",
					details: resultData,
				}
			}

			// Validate WorkspaceEdit structure
			if (!workspaceEdit.changes && !workspaceEdit.documentChanges) {
				return {
					tool,
					passed: false,
					error: "WorkspaceEdit should have either changes or documentChanges property",
					details: { workspaceEdit, resultData },
				}
			}

			// Count the number of text edits
			let editCount = 0
			let fileCount = 0

			if (workspaceEdit.changes) {
				fileCount = Object.keys(workspaceEdit.changes).length
				for (const uri in workspaceEdit.changes) {
					if (workspaceEdit.changes[uri] && Array.isArray(workspaceEdit.changes[uri])) {
						editCount += workspaceEdit.changes[uri].length
					}
				}
			}

			if (workspaceEdit.documentChanges && Array.isArray(workspaceEdit.documentChanges)) {
				for (const change of workspaceEdit.documentChanges) {
					if (change && change.edits && Array.isArray(change.edits)) {
						editCount += change.edits.length
						fileCount++
					}
				}
			}

			// We expect at least 3 edits for 'targetVariable':
			// 1. Declaration at line 58
			// 2. Usage at line 59 (console.log)
			// 3. Usage at line 60 (anotherUsage assignment)
			// 4. Usage at line 62 (return statement in function)
			if (editCount < 3) {
				return {
					tool,
					passed: false,
					error: `Expected at least 3 rename edits for targetVariable, but found ${editCount}`,
					details: {
						editCount,
						fileCount,
						workspaceEdit,
						resultData,
					},
				}
			}

			// Verify that we have edits in at least one file (should be our test file)
			if (fileCount < 1) {
				return {
					tool,
					passed: false,
					error: `Expected at least 1 file to be affected by rename, but found ${fileCount}`,
					details: {
						editCount,
						fileCount,
						workspaceEdit,
						resultData,
					},
				}
			}

			// Validate that the edits are in the correct file
			let hasCorrectFile = false
			if (workspaceEdit.changes) {
				for (const uri in workspaceEdit.changes) {
					if (uri.includes("test-rename.ts")) {
						hasCorrectFile = true
						break
					}
				}
			}

			if (workspaceEdit.documentChanges) {
				for (const change of workspaceEdit.documentChanges) {
					if (
						change &&
						change.textDocument &&
						change.textDocument.uri &&
						change.textDocument.uri.includes("test-rename.ts")
					) {
						hasCorrectFile = true
						break
					}
				}
			}

			if (!hasCorrectFile) {
				return {
					tool,
					passed: false,
					error: "Expected rename edits to be in test-rename.ts file",
					details: {
						editCount,
						fileCount,
						workspaceEdit,
						resultData,
					},
				}
			}

			// Validate individual edits structure
			let hasValidEdits = true
			let editDetails = []

			if (workspaceEdit.changes) {
				for (const uri in workspaceEdit.changes) {
					const edits = workspaceEdit.changes[uri]
					if (Array.isArray(edits)) {
						for (const edit of edits) {
							if (
								!edit.range ||
								!edit.newText ||
								typeof edit.range.start !== "object" ||
								typeof edit.range.end !== "object" ||
								typeof edit.range.start.line !== "number" ||
								typeof edit.range.start.character !== "number"
							) {
								hasValidEdits = false
							} else {
								editDetails.push({
									uri,
									range: edit.range,
									newText: edit.newText,
								})
							}
						}
					}
				}
			}

			if (!hasValidEdits) {
				return {
					tool,
					passed: false,
					error: "Rename edits do not have valid structure (missing range or newText)",
					details: {
						editCount,
						fileCount,
						workspaceEdit,
						resultData,
					},
				}
			}

			// Check that the new text is 'renamedVariable'
			const hasCorrectNewText = editDetails.some((edit) => edit.newText === "renamedVariable")
			if (!hasCorrectNewText) {
				return {
					tool,
					passed: false,
					error: `Expected edits to contain new name 'renamedVariable', but found: ${editDetails.map((e) => e.newText).join(", ")}`,
					details: {
						editCount,
						fileCount,
						editDetails,
						workspaceEdit,
						resultData,
					},
				}
			}

			// Success: we found valid rename edits
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully renamed targetVariable to renamedVariable with ${editCount} edits in ${fileCount} file(s)`,
					editCount,
					fileCount,
					editDetails,
					sampleEdit: editDetails[0]
						? {
								line: editDetails[0].range.start.line,
								character: editDetails[0].range.start.character,
								newText: editDetails[0].newText,
							}
						: null,
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
