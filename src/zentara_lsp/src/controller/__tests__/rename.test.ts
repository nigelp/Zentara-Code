import * as vscode from "vscode"
import { rename } from "../rename"
import { RenameParams } from "../../types"

// Mock the getSymbol helper
jest.mock("../../../core/tools/lsp/getSymbol")
const mockGetSymbol = require("../../../core/tools/lsp/getSymbol").getSymbol

// Use the global vscode mock instead of defining a local one

describe("rename", () => {
	const mockSymbol: vscode.DocumentSymbol = {
		name: "testSymbol",
		kind: vscode.SymbolKind.Function,
		range: new vscode.Range(0, 0, 5, 10),
		selectionRange: new vscode.Range(1, 5, 1, 15),
		children: []
	}

	const positionBasedParams: RenameParams = {
		uri: "file:///test.ts",
		line: 1,
		character: 5,
		newName: "newName",
	}

	const nameBasedParams: RenameParams = {
		uri: "file:///test.ts",
		symbolName: "testSymbol",
		newName: "newName",
	}

	beforeEach(() => {
		jest.clearAllMocks()

		// Re-setup Uri.parse and Position mocks after clearAllMocks
		;(vscode.Uri.parse as jest.Mock).mockImplementation((uri) => ({
			toString: () => uri,
			fsPath: uri,
			scheme: "file",
			authority: "",
			path: uri.replace("file://", ""),
			query: "",
			fragment: "",
		}))

		;(vscode.Position as jest.Mock).mockImplementation((line, character) => ({ line, character }))
		;(vscode.Range as jest.Mock).mockImplementation((startLine, startChar, endLine, endChar) => ({
			start: { line: startLine, character: startChar },
			end: { line: endLine, character: endChar }
		}))

		// Default successful getSymbol response
		mockGetSymbol.mockResolvedValue({
			symbol: mockSymbol,
			isUnique: true
		})
		
		// Cast mockGetSymbol properly
		;(mockGetSymbol as jest.MockedFunction<any>).mockResolvedValue({
			symbol: mockSymbol,
			isUnique: true
		})

		// Default mock for workspace operations
		;(vscode.workspace.applyEdit as jest.Mock).mockResolvedValue(true)
		;(vscode.workspace.saveAll as jest.Mock).mockResolvedValue(true)
	})

	describe("position-based rename", () => {
		it("should successfully rename with valid position", async () => {
			const mockWorkspaceEdit = new vscode.WorkspaceEdit()
			;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(mockWorkspaceEdit)

			const result = await rename(positionBasedParams)

			expect(mockGetSymbol).toHaveBeenCalledWith({
				uri: "file:///test.ts",
				line: 1,
				character: 5,
				symbolName: undefined
			})
			expect(result).toEqual({ success: true })
		})

		it("should return error if symbol not found at position", async () => {
			mockGetSymbol.mockResolvedValue({
				symbol: null,
				isUnique: false,
				error: "No symbol found at position"
			})

			const result = await rename(positionBasedParams)

			expect(result).toEqual({
				success: false,
				content: "Symbol not found: No symbol found at position"
			})
		})
	})

	describe("name-based rename", () => {
		it("should successfully rename with valid symbol name", async () => {
			const mockWorkspaceEdit = new vscode.WorkspaceEdit()
			;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(mockWorkspaceEdit)

			const result = await rename(nameBasedParams)

			expect(mockGetSymbol).toHaveBeenCalledWith({
				uri: "file:///test.ts",
				line: undefined,
				character: undefined,
				symbolName: "testSymbol"
			})
			expect(result).toEqual({ success: true })
		})

		it("should return error if symbol not found by name", async () => {
			mockGetSymbol.mockResolvedValue({
				symbol: null,
				isUnique: false,
				error: "No symbol named 'unknownSymbol' found in document"
			})

			const result = await rename({
				uri: "file:///test.ts",
				symbolName: "unknownSymbol",
				newName: "newName",
			})

			expect(result).toEqual({
				success: false,
				content: "Symbol not found: No symbol named 'unknownSymbol' found in document"
			})
		})

		it("should handle multiple symbols with same name", async () => {
			const alternatives = [mockSymbol, { ...mockSymbol, name: "testSymbol2" }]
			mockGetSymbol.mockResolvedValue({
				symbol: mockSymbol,
				isUnique: false,
				alternatives
			})

			const mockWorkspaceEdit = new vscode.WorkspaceEdit()
			;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(mockWorkspaceEdit)

			const result = await rename(nameBasedParams)

			expect(result).toEqual({ success: true })
		})
	})

	describe("workspace edit handling", () => {
		it("should return error if no workspace edit is returned", async () => {
			;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined)

			const result = await rename(positionBasedParams)

			expect(result).toEqual({
				success: false,
				content: "No rename provider available or no renameable symbol found at position line:1, character:5 in file:file:///test.ts"
			})
		})

		it("should return error if workspace edit fails to apply", async () => {
			const mockWorkspaceEdit = new vscode.WorkspaceEdit()
			;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(mockWorkspaceEdit)
			;(vscode.workspace.applyEdit as jest.Mock).mockResolvedValue(false)

			const result = await rename(positionBasedParams)

			expect(result).toEqual({
				success: false,
				content: "Failed to apply workspace edit for rename operation"
			})
		})

		it("should return error if save fails", async () => {
			const mockWorkspaceEdit = new vscode.WorkspaceEdit()
			;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(mockWorkspaceEdit)
			;(vscode.workspace.applyEdit as jest.Mock).mockResolvedValue(true)
			;(vscode.workspace.saveAll as jest.Mock).mockResolvedValue(false)

			const result = await rename(positionBasedParams)

			expect(result).toEqual({
				success: false,
				content: "Failed to save changes to disk after applying workspace edit for rename operation"
			})
		})

		it("should handle rename provider errors", async () => {
			;(vscode.commands.executeCommand as jest.Mock).mockRejectedValue(new Error("Provider error"))

			const result = await rename(positionBasedParams)

			expect(result).toEqual({
				success: false,
				content: "Error calling rename provider: Provider error"
			})
		})
	})

	describe("error handling", () => {
		it("should handle getSymbol errors gracefully", async () => {
			mockGetSymbol.mockRejectedValue(new Error("Symbol lookup failed"))

			const result = await rename(positionBasedParams)

			expect(result).toEqual({
				success: false,
				content: "Error occurred during symbol lookup: Symbol lookup failed"
			})
		})
	})
})
