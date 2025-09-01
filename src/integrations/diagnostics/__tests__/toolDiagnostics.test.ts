import { describe, it, expect, beforeEach, vi } from "vitest"
import * as vscode from "vscode"
import { getFormattedDiagnostics, appendDiagnostics, executeWithDiagnostics } from "../toolDiagnostics"

// Mock vscode
vi.mock("vscode", () => ({
	Uri: {
		parse: vi.fn((str: string) => ({ fsPath: str.replace("file://", "") })),
		file: vi.fn((path: string) => ({ fsPath: path })),
	},
	DiagnosticSeverity: {
		Error: 0,
		Warning: 1,
		Information: 2,
		Hint: 3,
	},
	languages: {
		getDiagnostics: vi.fn(),
	},
	Range: vi.fn((startLine: number, startChar: number, endLine: number, endChar: number) => ({
		start: { line: startLine, character: startChar },
		end: { line: endLine, character: endChar },
	})),
	Position: vi.fn((line: number, char: number) => ({ line, character: char })),
}))

describe("toolDiagnostics", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("getFormattedDiagnostics", () => {
		it("should return empty string when no diagnostics", async () => {
			const uri = vscode.Uri.file("/test/file.ts")
			vi.mocked(vscode.languages.getDiagnostics).mockReturnValue([])

			const result = await getFormattedDiagnostics(uri, "/test")

			expect(result).toBe("")
		})

		it("should format error diagnostics correctly", async () => {
			const uri = vscode.Uri.file("/test/src/app.ts")
			const diagnostic = {
				range: {
					start: { line: 9, character: 4 },
					end: { line: 9, character: 20 },
				},
				message: "Cannot find name 'undefined_variable'",
				severity: vscode.DiagnosticSeverity.Error,
				source: "ts",
			}
			vi.mocked(vscode.languages.getDiagnostics).mockReturnValue([diagnostic as any])

			const result = await getFormattedDiagnostics(uri, "/test")

			expect(result).toContain("## Diagnostics")
			expect(result).toContain("File: src/app.ts")
			expect(result).toContain("[ts] **Error** (Line 10:5): Cannot find name 'undefined_variable'")
		})

		it("should format warning diagnostics correctly", async () => {
			const uri = vscode.Uri.file("/test/src/app.ts")
			const diagnostic = {
				range: {
					start: { line: 14, character: 2 },
					end: { line: 14, character: 12 },
				},
				message: "'unused_var' is declared but never used",
				severity: vscode.DiagnosticSeverity.Warning,
				source: "eslint",
			}
			vi.mocked(vscode.languages.getDiagnostics).mockReturnValue([diagnostic as any])

			const result = await getFormattedDiagnostics(uri, "/test")

			expect(result).toContain("## Diagnostics")
			expect(result).toContain("File: src/app.ts")
			expect(result).toContain("[eslint] **Warning** (Line 15:3): 'unused_var' is declared but never used")
		})

		it("should handle multiple diagnostics sorted by line number", async () => {
			const uri = vscode.Uri.file("/test/src/app.ts")
			const diagnostics = [
				{
					range: {
						start: { line: 20, character: 0 },
						end: { line: 20, character: 10 },
					},
					message: "Second error",
					severity: vscode.DiagnosticSeverity.Error,
					source: "ts",
				},
				{
					range: {
						start: { line: 10, character: 0 },
						end: { line: 10, character: 10 },
					},
					message: "First error",
					severity: vscode.DiagnosticSeverity.Error,
					source: "ts",
				},
			]
			vi.mocked(vscode.languages.getDiagnostics).mockReturnValue(diagnostics as any)

			const result = await getFormattedDiagnostics(uri, "/test")

			const lines = result.split("\n")
			const firstErrorIndex = lines.findIndex(l => l.includes("First error"))
			const secondErrorIndex = lines.findIndex(l => l.includes("Second error"))
			expect(firstErrorIndex).toBeLessThan(secondErrorIndex)
		})

		it("should filter by severity levels", async () => {
			const uri = vscode.Uri.file("/test/src/app.ts")
			const diagnostics = [
				{
					range: {
						start: { line: 0, character: 0 },
						end: { line: 0, character: 10 },
					},
					message: "Error message",
					severity: vscode.DiagnosticSeverity.Error,
				},
				{
					range: {
						start: { line: 1, character: 0 },
						end: { line: 1, character: 10 },
					},
					message: "Info message",
					severity: vscode.DiagnosticSeverity.Information,
				},
			]
			vi.mocked(vscode.languages.getDiagnostics).mockReturnValue(diagnostics as any)

			// Only request errors
			const result = await getFormattedDiagnostics(uri, "/test", [vscode.DiagnosticSeverity.Error])

			expect(result).toContain("Error message")
			expect(result).not.toContain("Info message")
		})

		it("should handle diagnostics without source", async () => {
			const uri = vscode.Uri.file("/test/src/app.ts")
			const diagnostic = {
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 10 },
				},
				message: "Generic error",
				severity: vscode.DiagnosticSeverity.Error,
				// No source field
			}
			vi.mocked(vscode.languages.getDiagnostics).mockReturnValue([diagnostic as any])

			const result = await getFormattedDiagnostics(uri, "/test")

			expect(result).toContain("**Error** (Line 1:1): Generic error")
			expect(result).not.toContain("[")  // No source prefix
		})
	})

	describe("appendDiagnostics", () => {
		it("should append diagnostics to existing output", async () => {
			const uri = vscode.Uri.file("/test/src/app.ts")
			const diagnostic = {
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 10 },
				},
				message: "Test error",
				severity: vscode.DiagnosticSeverity.Error,
			}
			vi.mocked(vscode.languages.getDiagnostics).mockReturnValue([diagnostic as any])

			const originalOutput = "File written successfully"
			const result = await appendDiagnostics(originalOutput, uri, "/test")

			expect(result).toContain("File written successfully")
			expect(result).toContain("## Diagnostics")
			expect(result).toContain("Test error")
		})

		it("should return original output when no diagnostics", async () => {
			const uri = vscode.Uri.file("/test/src/app.ts")
			vi.mocked(vscode.languages.getDiagnostics).mockReturnValue([])

			const originalOutput = "File written successfully"
			const result = await appendDiagnostics(originalOutput, uri, "/test")

			expect(result).toBe("File written successfully")
		})
	})

	describe("executeWithDiagnostics", () => {
		it("should append diagnostics to operation result with output field", async () => {
			const uri = vscode.Uri.file("/test/src/app.ts")
			const diagnostic = {
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 10 },
				},
				message: "Test error",
				severity: vscode.DiagnosticSeverity.Error,
			}
			vi.mocked(vscode.languages.getDiagnostics).mockReturnValue([diagnostic as any])

			const operation = vi.fn().mockResolvedValue({
				output: "Operation completed",
				success: true,
			})

			const result = await executeWithDiagnostics(operation, uri, "/test")

			expect(operation).toHaveBeenCalled()
			expect(result.success).toBe(true)
			expect(result.output).toContain("Operation completed")
			expect(result.output).toContain("## Diagnostics")
			expect(result.output).toContain("Test error")
		})

		it("should not modify result without output field", async () => {
			const uri = vscode.Uri.file("/test/src/app.ts")
			const diagnostic = {
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 10 },
				},
				message: "Test error",
				severity: vscode.DiagnosticSeverity.Error,
			}
			vi.mocked(vscode.languages.getDiagnostics).mockReturnValue([diagnostic as any])

			const operation = vi.fn().mockResolvedValue({
				success: true,
				data: "some data",
			})

			const result = await executeWithDiagnostics(operation, uri, "/test")

			expect(result).toEqual({
				success: true,
				data: "some data",
			})
		})

		it("should handle operation errors", async () => {
			const uri = vscode.Uri.file("/test/src/app.ts")
			const operation = vi.fn().mockRejectedValue(new Error("Operation failed"))

			await expect(executeWithDiagnostics(operation, uri, "/test")).rejects.toThrow("Operation failed")
		})

		it("should not append diagnostics when there are none", async () => {
			const uri = vscode.Uri.file("/test/src/app.ts")
			vi.mocked(vscode.languages.getDiagnostics).mockReturnValue([])

			const operation = vi.fn().mockResolvedValue({
				output: "Operation completed",
			})

			const result = await executeWithDiagnostics(operation, uri, "/test")

			expect(result.output).toBe("Operation completed")
			expect(result.output).not.toContain("## Diagnostics")
		})
	})

	describe("integration scenarios", () => {
		it("should handle TypeScript and ESLint diagnostics together", async () => {
			const uri = vscode.Uri.file("/test/src/component.tsx")
			const diagnostics = [
				{
					range: {
						start: { line: 5, character: 10 },
						end: { line: 5, character: 20 },
					},
					message: "Property 'foo' does not exist on type 'Bar'",
					severity: vscode.DiagnosticSeverity.Error,
					source: "ts",
				},
				{
					range: {
						start: { line: 10, character: 0 },
						end: { line: 10, character: 15 },
					},
					message: "React Hook useEffect has a missing dependency: 'data'",
					severity: vscode.DiagnosticSeverity.Warning,
					source: "eslint(react-hooks/exhaustive-deps)",
				},
				{
					range: {
						start: { line: 15, character: 2 },
						end: { line: 15, character: 10 },
					},
					message: "Unexpected console statement",
					severity: vscode.DiagnosticSeverity.Warning,
					source: "eslint(no-console)",
				},
			]
			vi.mocked(vscode.languages.getDiagnostics).mockReturnValue(diagnostics as any)

			const result = await getFormattedDiagnostics(uri, "/test")

			expect(result).toContain("[ts] **Error**")
			expect(result).toContain("Property 'foo' does not exist")
			expect(result).toContain("[eslint(react-hooks/exhaustive-deps)] **Warning**")
			expect(result).toContain("missing dependency")
			expect(result).toContain("[eslint(no-console)] **Warning**")
		})

		it("should handle Python diagnostics", async () => {
			const uri = vscode.Uri.file("/test/src/main.py")
			const diagnostics = [
				{
					range: {
						start: { line: 20, character: 0 },
						end: { line: 20, character: 15 },
					},
					message: "Undefined variable 'undefined_var'",
					severity: vscode.DiagnosticSeverity.Error,
					source: "Pylance",
				},
				{
					range: {
						start: { line: 25, character: 4 },
						end: { line: 25, character: 10 },
					},
					message: "Import 'os' is not used",
					severity: vscode.DiagnosticSeverity.Warning,
					source: "Pylance",
				},
			]
			vi.mocked(vscode.languages.getDiagnostics).mockReturnValue(diagnostics as any)

			const result = await getFormattedDiagnostics(uri, "/test")

			expect(result).toContain("[Pylance] **Error**")
			expect(result).toContain("Undefined variable")
			expect(result).toContain("[Pylance] **Warning**")
			expect(result).toContain("not used")
		})

		it("should handle relative paths correctly", async () => {
			const uri = vscode.Uri.file("/workspace/deeply/nested/folder/file.ts")
			const diagnostic = {
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 10 },
				},
				message: "Test",
				severity: vscode.DiagnosticSeverity.Error,
			}
			vi.mocked(vscode.languages.getDiagnostics).mockReturnValue([diagnostic as any])

			const result = await getFormattedDiagnostics(uri, "/workspace")

			expect(result).toContain("File: deeply/nested/folder/file.ts")
		})
	})
})