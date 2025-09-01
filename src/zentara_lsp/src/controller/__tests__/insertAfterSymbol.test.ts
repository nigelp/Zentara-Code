import { describe, it, expect, vi, beforeEach } from 'vitest'
import { insertAfterSymbol } from '../insertAfterSymbol'
import { InsertAfterSymbolParams, InsertAfterSymbolParamsLegacy } from '../../types'
import * as vscode from 'vscode'
import { getSymbol } from '../../../../core/tools/lsp/getSymbol'

// Mock vscode
vi.mock('vscode', () => ({
	Uri: {
		parse: vi.fn(),
	},
	Position: vi.fn(),
	WorkspaceEdit: vi.fn(() => ({
		insert: vi.fn(),
	})),
	workspace: {
		applyEdit: vi.fn(),
		saveAll: vi.fn(),
	},
	commands: {
		executeCommand: vi.fn(),
	},
}))

// Mock getSymbol
vi.mock('../../../../core/tools/lsp/getSymbol', () => ({
	getSymbol: vi.fn(),
}))

// Mock goToDefinition
vi.mock('../goToDefinition', () => ({
	goToDefinition: vi.fn(),
}))

describe('insertAfterSymbol', () => {
	const mockUri = { toString: () => 'file:///test.ts' }
	const mockPosition = { line: 10, character: 5 }
	const mockSymbol = {
		name: 'testFunction',
		range: {
			start: { line: 10, character: 0 },
			end: { line: 15, character: 1 }
		},
		selectionRange: {
			start: { line: 10, character: 5 },
			end: { line: 10, character: 17 }
		}
	}

	beforeEach(() => {
		vi.clearAllMocks()
		;(vscode.Uri.parse as any).mockReturnValue(mockUri)
		;(vscode.Position as any).mockImplementation((line: number, char: number) => ({ line, character: char }))
		;(vscode.workspace.applyEdit as any).mockResolvedValue(true)
		;(vscode.workspace.saveAll as any).mockResolvedValue(true)
	})

	describe('backward compatibility with legacy format', () => {
		it('should work with legacy textDocument/position parameters', async () => {
			const legacyParams: InsertAfterSymbolParamsLegacy = {
				textDocument: { uri: 'file:///test.ts' },
				position: { line: 10, character: 5 },
				content: 'new content',
			}

			// Mock goToDefinition for legacy support
			const { goToDefinition } = await import('../goToDefinition')
			;(goToDefinition as any).mockResolvedValue([{
				uri: 'file:///test.ts',
				range: { 
					start: { line: 10, character: 0 }, 
					end: { line: 15, character: 1 } 
				}
			}])

			const result = await insertAfterSymbol(legacyParams)

			expect(goToDefinition).toHaveBeenCalledWith({
				textDocument: { uri: 'file:///test.ts' },
				position: { line: 10, character: 5 }
			})

			expect(vscode.workspace.applyEdit).toHaveBeenCalled()
			expect(result).toEqual({ success: true })
		})

		it('should handle legacy format when no symbol is found', async () => {
			const legacyParams: InsertAfterSymbolParamsLegacy = {
				textDocument: { uri: 'file:///test.ts' },
				position: { line: 10, character: 5 },
				content: 'new content',
			}

			// Mock goToDefinition to return empty array
			const { goToDefinition } = await import('../goToDefinition')
			;(goToDefinition as any).mockResolvedValue([])

			const result = await insertAfterSymbol(legacyParams)

			expect(result).toEqual({
				success: false,
				content: 'No symbol definition found at position line:10, character:5 in file:file:///test.ts'
			})
		})
	})

	describe('new format with symbolName support', () => {
		it('should work with position-based parameters', async () => {
			const params: InsertAfterSymbolParams = {
				uri: 'file:///test.ts',
				line: 10,
				character: 5,
				content: 'new content'
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: true
			})

			const result = await insertAfterSymbol(params)

			expect(getSymbol).toHaveBeenCalledWith({
				uri: 'file:///test.ts',
				line: 10,
				character: 5,
				symbolName: undefined
			})

			expect(vscode.workspace.applyEdit).toHaveBeenCalled()
			expect(result).toEqual({ success: true })
		})

		it('should work with symbolName parameter', async () => {
			const params: InsertAfterSymbolParams = {
				uri: 'file:///test.ts',
				symbolName: 'testFunction',
				content: 'new content'
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: true
			})

			const result = await insertAfterSymbol(params)

			expect(getSymbol).toHaveBeenCalledWith({
				uri: 'file:///test.ts',
				line: undefined,
				character: undefined,
				symbolName: 'testFunction'
			})

			expect(vscode.workspace.applyEdit).toHaveBeenCalled()
			expect(result).toEqual({ success: true })
		})

		it('should handle multiple symbol matches with warning', async () => {
			const params: InsertAfterSymbolParams = {
				uri: 'file:///test.ts',
				symbolName: 'testFunction',
				content: 'new content'
			}

			const mockAlternatives = [mockSymbol, { ...mockSymbol, name: 'testFunction2' }]

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: false,
				alternatives: mockAlternatives
			})

			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

			const result = await insertAfterSymbol(params)

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Multiple symbols found with name \'testFunction\'')
			)

			expect(result).toEqual({ success: true })

			consoleSpy.mockRestore()
		})

		it('should handle workspace edit failure', async () => {
			const params: InsertAfterSymbolParams = {
				uri: 'file:///test.ts',
				symbolName: 'testFunction',
				content: 'new content'
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: true
			})

			;(vscode.workspace.applyEdit as any).mockResolvedValue(false)

			const result = await insertAfterSymbol(params)

			expect(result).toEqual({
				success: false,
				content: 'Failed to apply workspace edit to insert content after symbol'
			})
		})

		it('should handle save failure', async () => {
			const params: InsertAfterSymbolParams = {
				uri: 'file:///test.ts',
				symbolName: 'testFunction',
				content: 'new content'
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: true
			})

			;(vscode.workspace.saveAll as any).mockResolvedValue(false)

			const result = await insertAfterSymbol(params)

			expect(result).toEqual({
				success: false,
				content: 'Failed to save changes to disk after applying workspace edit'
			})
		})
	})

	describe('error handling', () => {
		it('should return error when symbol is not found', async () => {
			const params: InsertAfterSymbolParams = {
				uri: 'file:///test.ts',
				symbolName: 'nonExistentFunction',
				content: 'new content'
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: null,
				isUnique: false,
				error: 'Symbol not found'
			})

			const result = await insertAfterSymbol(params)

			expect(result).toEqual({
				success: false,
				content: 'Symbol not found: Symbol not found'
			})
		})

		it('should handle exceptions gracefully', async () => {
			const params: InsertAfterSymbolParams = {
				uri: 'file:///test.ts',
				line: 10,
				character: 5,
				content: 'new content'
			}

			;(getSymbol as any).mockRejectedValue(new Error('Test error'))

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			const result = await insertAfterSymbol(params)

			expect(result).toEqual({
				success: false,
				content: 'Error inserting after symbol: Test error'
			})

			expect(consoleSpy).toHaveBeenCalledWith(
				'Error inserting after symbol:',
				expect.any(Error)
			)

			consoleSpy.mockRestore()
		})
	})
})
