import { describe, it, expect, vi, beforeEach } from 'vitest'
import { replaceSymbolBody } from "../replaceSymbolBody"
import { ReplaceSymbolBodyParams } from "../../types"
import * as vscode from "vscode"
import { getSymbol } from "../../../../core/tools/lsp/getSymbol"

// Mock vscode
vi.mock('vscode', () => ({
	Uri: {
		parse: vi.fn(),
	},
	Position: vi.fn(),
	Range: vi.fn(),
	WorkspaceEdit: vi.fn(() => ({
		replace: vi.fn(),
	})),
	workspace: {
		applyEdit: vi.fn(),
		openTextDocument: vi.fn(),
	},
}))

// Mock getSymbol
vi.mock('../../../../core/tools/lsp/getSymbol', () => ({
	getSymbol: vi.fn(),
}))

describe("replaceSymbolBody", () => {
	const mockUri = { toString: () => "file:///test.ts" }
	const mockSymbol = {
		name: "testFunction",
		range: {
			start: { line: 1, character: 0 },
			end: { line: 5, character: 1 },
		},
		selectionRange: {
			start: { line: 1, character: 4 },
			end: { line: 1, character: 16 },
		},
	}
	const mockDocument = {
		isDirty: true,
		save: vi.fn(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
		;(vscode.Uri.parse as any).mockReturnValue(mockUri)
		;(vscode.Position as any).mockImplementation((line: number, char: number) => ({ line, character: char }))
		;(vscode.Range as any).mockImplementation((start: any, end: any) => ({ start, end }))
		;(vscode.workspace.applyEdit as any).mockResolvedValue(true)
		;(vscode.workspace.openTextDocument as any).mockResolvedValue(mockDocument)
	})

	describe("position-based lookup", () => {
		it("should return null if the symbol is not found", async () => {
			const params: ReplaceSymbolBodyParams = {
				uri: "file:///test.ts",
				line: 1,
				character: 5,
				replacement: "new body",
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: null,
				isUnique: false,
				error: "No symbol found",
			})

			const result = await replaceSymbolBody(params)
			expect(result).toBeNull()
		})

		it("should apply the workspace edit and return it for position-based lookup", async () => {
			const params: ReplaceSymbolBodyParams = {
				uri: "file:///test.ts",
				line: 1,
				character: 5,
				replacement: "new function body",
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: true,
			})

			const mockWorkspaceEdit = {
				replace: vi.fn(),
			}
			;(vscode.WorkspaceEdit as any).mockImplementation(() => mockWorkspaceEdit)

			const result = await replaceSymbolBody(params)

			expect(getSymbol).toHaveBeenCalledWith({
				uri: "file:///test.ts",
				line: 1,
				character: 5,
				symbolName: undefined,
			})

			expect(vscode.workspace.applyEdit).toHaveBeenCalled()
			expect(mockDocument.save).toHaveBeenCalled()
			expect(result).toEqual({
				changes: {
					"file:///test.ts": [{
						range: {
							start: { line: 1, character: 0 },
							end: { line: 5, character: 1 },
						},
						newText: "new function body",
					}],
				},
			})
		})
	})

	describe("name-based lookup", () => {
		it("should work with symbolName parameter", async () => {
			const params: ReplaceSymbolBodyParams = {
				uri: "file:///test.ts",
				symbolName: "testFunction",
				replacement: "new function body",
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: true,
			})

			const mockWorkspaceEdit = {
				replace: vi.fn(),
			}
			;(vscode.WorkspaceEdit as any).mockImplementation(() => mockWorkspaceEdit)

			const result = await replaceSymbolBody(params)

			expect(getSymbol).toHaveBeenCalledWith({
				uri: "file:///test.ts",
				line: undefined,
				character: undefined,
				symbolName: "testFunction",
			})

			expect(vscode.workspace.applyEdit).toHaveBeenCalled()
			expect(mockDocument.save).toHaveBeenCalled()
			expect(result).toEqual({
				changes: {
					"file:///test.ts": [{
						range: {
							start: { line: 1, character: 0 },
							end: { line: 5, character: 1 },
						},
						newText: "new function body",
					}],
				},
			})
		})

		it("should handle multiple symbol matches", async () => {
			const params: ReplaceSymbolBodyParams = {
				uri: "file:///test.ts",
				symbolName: "testFunction",
				replacement: "new function body",
			}

			const mockAlternatives = [mockSymbol, { ...mockSymbol, name: "testFunction2" }]
			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: false,
				alternatives: mockAlternatives,
			})

			const mockWorkspaceEdit = {
				replace: vi.fn(),
			}
			;(vscode.WorkspaceEdit as any).mockImplementation(() => mockWorkspaceEdit)

			const result = await replaceSymbolBody(params)

			expect(result).not.toBeNull()
			expect(result?.changes?.["file:///test.ts"]).toBeDefined()
		})

		it("should return null if symbol is not found by name", async () => {
			const params: ReplaceSymbolBodyParams = {
				uri: "file:///test.ts",
				symbolName: "nonExistentFunction",
				replacement: "new function body",
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: null,
				isUnique: false,
				error: "No symbol named 'nonExistentFunction' found",
			})

			const result = await replaceSymbolBody(params)
			expect(result).toBeNull()
		})
	})

	describe("error handling", () => {
		it("should handle exceptions gracefully", async () => {
			const params: ReplaceSymbolBodyParams = {
				uri: "file:///test.ts",
				symbolName: "testFunction",
				replacement: "new function body",
			}

			;(getSymbol as any).mockRejectedValue(new Error("Test error"))

			const result = await replaceSymbolBody(params)
			expect(result).toBeNull()
		})

		it("should handle workspace edit failure", async () => {
			const params: ReplaceSymbolBodyParams = {
				uri: "file:///test.ts",
				symbolName: "testFunction",
				replacement: "new function body",
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: true,
			})

			;(vscode.workspace.applyEdit as any).mockResolvedValue(false)

			const mockWorkspaceEdit = {
				replace: vi.fn(),
			}
			;(vscode.WorkspaceEdit as any).mockImplementation(() => mockWorkspaceEdit)

			const result = await replaceSymbolBody(params)
			// Should still return the workspaceEdit even if applyEdit fails
			expect(result).not.toBeNull()
		})
	})
})
