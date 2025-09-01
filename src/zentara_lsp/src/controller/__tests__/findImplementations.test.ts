import { vi, describe, test, expect, beforeEach } from "vitest"
import * as vscode from "vscode"
import { findImplementations } from "../findImplementations"
import { FindImplementationsParams, FindImplementationsParamsLegacy } from "../../types"
import * as getSymbolModule from "../../../../core/tools/lsp/getSymbol"

// Mock vscode module
vi.mock("vscode", async () => {
	return {
		workspace: {
			fs: {
				stat: vi.fn(),
			},
			openTextDocument: vi.fn(),
		},
		commands: {
			executeCommand: vi.fn(),
		},
		Uri: {
			parse: vi.fn(),
		},
		Position: vi.fn(),
	}
})

// Mock the getSymbol module
vi.mock("../../../../core/tools/lsp/getSymbol", () => ({
	getSymbol: vi.fn(),
}))

describe("findImplementations", () => {
	const legacyParams: FindImplementationsParamsLegacy = {
		textDocument: { uri: "file:///test.ts" },
		position: { line: 1, character: 5 },
	}

	const newParamsPosition: FindImplementationsParams = {
		uri: "file:///test.ts",
		line: 1,
		character: 5,
	}

	const newParamsSymbolName: FindImplementationsParams = {
		uri: "file:///test.ts",
		symbolName: "ITestInterface",
	}

	beforeEach(() => {
		vi.clearAllMocks()

		// Re-setup Uri.parse mock after clearAllMocks
		;(vscode.Uri.parse as any).mockImplementation((uri) => ({
			toString: () => uri,
			fsPath: uri,
			scheme: "file",
			authority: "",
			path: uri.replace("file://", ""),
			query: "",
			fragment: "",
		}))

		// Re-setup Position mock
		;(vscode.Position as any).mockImplementation((line, character) => ({ line, character }))

		// Default mock for fs.stat - assume file exists
		;(vscode.workspace.fs.stat as any).mockResolvedValue({ type: 1, ctime: 0, mtime: 0, size: 0 })
	})

	test("should return an empty array if no locations are found (legacy format)", async () => {
		;(vscode.commands.executeCommand as any).mockResolvedValue([])
		const result = await findImplementations(legacyParams)
		expect(result).toEqual([])
	})

	test("should return an empty array if no locations are found (new position format)", async () => {
		;(vscode.commands.executeCommand as any).mockResolvedValue([])
		const result = await findImplementations(newParamsPosition)
		expect(result).toEqual([])
	})

	test("should return implementations with preview (legacy format)", async () => {
		const location = {
			uri: { toString: () => "file:///test.ts" },
			range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } },
		}
		;(vscode.commands.executeCommand as any).mockResolvedValue([location])
		;(vscode.workspace.openTextDocument as any).mockResolvedValue({
			lineAt: vi.fn((line) => ({ text: `line ${line}` })),
			lineCount: 3,
		})
		const result = await findImplementations(legacyParams)
		expect(result.length).toBe(1)
		expect(result[0].uri).toBe("file:///test.ts")
		expect(result[0].preview).toBe("line 0\nline 1\nline 2")
	})

	test("should return implementations with preview (new position format)", async () => {
		const location = {
			uri: { toString: () => "file:///test.ts" },
			range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } },
		}
		;(vscode.commands.executeCommand as any).mockResolvedValue([location])
		;(vscode.workspace.openTextDocument as any).mockResolvedValue({
			lineAt: vi.fn((line) => ({ text: `line ${line}` })),
			lineCount: 3,
		})
		const result = await findImplementations(newParamsPosition)
		expect(result.length).toBe(1)
		expect(result[0].uri).toBe("file:///test.ts")
		expect(result[0].preview).toBe("line 0\nline 1\nline 2")
	})

	test("should find implementations by symbol name", async () => {
		const mockSymbol = {
			name: "ITestInterface",
			selectionRange: {
				start: { line: 2, character: 10 },
				end: { line: 2, character: 24 },
			},
			range: {
				start: { line: 2, character: 0 },
				end: { line: 5, character: 1 },
			},
			kind: 11, // Interface
			children: [],
		}

		// Mock getSymbol to return a valid symbol
		;(getSymbolModule.getSymbol as any).mockResolvedValue({
			symbol: mockSymbol,
			isUnique: true,
		})

		const location = {
			uri: { toString: () => "file:///implementation.ts" },
			range: { start: { line: 10, character: 0 }, end: { line: 10, character: 15 } },
		}
		;(vscode.commands.executeCommand as any).mockResolvedValue([location])
		;(vscode.workspace.openTextDocument as any).mockResolvedValue({
			lineAt: vi.fn((line) => ({ text: `line ${line}` })),
			lineCount: 15,
		})

		const result = await findImplementations(newParamsSymbolName)
		expect(result.length).toBe(1)
		expect(result[0].uri).toBe("file:///implementation.ts")
		expect(result[0].preview).toBe("line 9\nline 10\nline 11")

		// Verify getSymbol was called with correct parameters
		expect(getSymbolModule.getSymbol).toHaveBeenCalledWith({
			uri: "file:///test.ts",
			line: 0,
			character: 0,
			symbolName: "ITestInterface",
		})
	})

	test("should handle symbol not found", async () => {
		// Mock getSymbol to return no symbol found
		;(getSymbolModule.getSymbol as any).mockResolvedValue({
			symbol: null,
			isUnique: false,
			error: "No symbol named 'ITestInterface' found in document",
		})

		const result = await findImplementations(newParamsSymbolName)
		expect(result).toEqual([])

		// Verify getSymbol was called
		expect(getSymbolModule.getSymbol).toHaveBeenCalledWith({
			uri: "file:///test.ts",
			line: 0,
			character: 0,
			symbolName: "ITestInterface",
		})
	})

	test("should handle multiple symbol matches", async () => {
		const mockSymbol = {
			name: "ITestInterface",
			selectionRange: {
				start: { line: 2, character: 10 },
				end: { line: 2, character: 24 },
			},
			range: {
				start: { line: 2, character: 0 },
				end: { line: 5, character: 1 },
			},
			kind: 11, // Interface
			children: [],
		}

		// Mock getSymbol to return multiple matches
		;(getSymbolModule.getSymbol as any).mockResolvedValue({
			symbol: mockSymbol, // Uses first match
			isUnique: false,
			alternatives: [mockSymbol, mockSymbol], // Two matches
		})

		const location = {
			uri: { toString: () => "file:///implementation.ts" },
			range: { start: { line: 10, character: 0 }, end: { line: 10, character: 15 } },
		}
		;(vscode.commands.executeCommand as any).mockResolvedValue([location])
		;(vscode.workspace.openTextDocument as any).mockResolvedValue({
			lineAt: vi.fn((line) => ({ text: `line ${line}` })),
			lineCount: 15,
		})

		const result = await findImplementations(newParamsSymbolName)
		expect(result.length).toBe(1)
		expect(result[0].uri).toBe("file:///implementation.ts")
	})

	test("should return an empty array if the file does not exist", async () => {
		;(vscode.workspace.fs.stat as any).mockRejectedValue(new Error("File not found"))
		const result = await findImplementations(legacyParams)
		expect(result).toEqual([])
	})

	test("should handle VSCode executeCommand error", async () => {
		;(vscode.commands.executeCommand as any).mockRejectedValue(new Error("LSP error"))
		const result = await findImplementations(newParamsPosition)
		expect(result).toEqual([])
	})

	test("should handle getPreview error gracefully", async () => {
		const location = {
			uri: { toString: () => "file:///test.ts" },
			range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } },
		}
		;(vscode.commands.executeCommand as any).mockResolvedValue([location])
		;(vscode.workspace.openTextDocument as any).mockRejectedValue(new Error("Cannot read document"))

		const result = await findImplementations(newParamsPosition)
		expect(result.length).toBe(1)
		expect(result[0].uri).toBe("file:///test.ts")
		expect(result[0].preview).toBe("") // Empty preview when error occurs
	})
})
