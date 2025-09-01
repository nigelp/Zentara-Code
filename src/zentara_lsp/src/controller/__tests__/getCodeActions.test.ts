import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCodeActions } from '../getCodeActions'
import { GetCodeActionsParams } from '../../types'
import * as vscode from 'vscode'
import { getSymbol } from '../../../../core/tools/lsp/getSymbol'

// Mock vscode
vi.mock('vscode', () => ({
	Uri: {
		parse: vi.fn(),
		file: vi.fn(),
	},
	Range: vi.fn(),
	Position: vi.fn(),
	commands: {
		executeCommand: vi.fn(),
	},
}))

// Mock getSymbol
vi.mock('../../../../core/tools/lsp/getSymbol', () => ({
	getSymbol: vi.fn(),
}))

describe('getCodeActions', () => {
	const mockUri = { toString: () => 'file:///test.ts' }
	const mockPosition = { line: 1, character: 5 }
	const mockRange = { start: mockPosition, end: mockPosition }
	const mockSymbol = {
		name: 'testFunction',
		selectionRange: {
			start: { line: 1, character: 5 },
			end: { line: 1, character: 17 }
		}
	}

	const positionBasedParams: GetCodeActionsParams = {
		uri: 'file:///test.ts',
		line: 1,
		character: 5,
	}

	const symbolBasedParams: GetCodeActionsParams = {
		uri: 'file:///test.ts',
		symbolName: 'testFunction',
	}

	beforeEach(() => {
		vi.clearAllMocks()
		;(vscode.Uri.parse as any).mockReturnValue(mockUri)
		;(vscode.Range as any).mockImplementation((startLine: number, startChar: number, endLine: number, endChar: number) => ({
			start: { line: startLine, character: startChar },
			end: { line: endLine, character: endChar }
		}))
		;(vscode.Position as any).mockImplementation((line: number, char: number) => ({ line, character: char }))
	})

	describe('position-based lookup', () => {
		it('should return an empty array if no code actions are found', async () => {
			;(getSymbol as any).mockResolvedValue({ symbol: mockSymbol, isUnique: true })
			;(vscode.commands.executeCommand as any).mockResolvedValue([])
			
			const result = await getCodeActions(positionBasedParams)
			expect(result).toEqual([])
		})

		it('should return the code actions if found', async () => {
			;(getSymbol as any).mockResolvedValue({ symbol: mockSymbol, isUnique: true })
			const codeActions = [
				{ title: 'Extract to function', kind: 'refactor.extract.function' },
				{ title: 'Disable lint rule', kind: 'quickfix' },
			]
			;(vscode.commands.executeCommand as any).mockResolvedValue(codeActions)
			
			const result = await getCodeActions(positionBasedParams)
			expect(result.length).toBe(2)
			expect(result[0].title).toBe('Extract to function')
		})

		it('should return an empty array if symbol not found', async () => {
			;(getSymbol as any).mockResolvedValue({ symbol: null, isUnique: false, error: 'Symbol not found' })
			
			const result = await getCodeActions(positionBasedParams)
			expect(result).toEqual([])
		})
	})

	describe('symbol-based lookup', () => {
		it('should return code actions for a specific symbol', async () => {
			;(getSymbol as any).mockResolvedValue({ symbol: mockSymbol, isUnique: true })
			const codeActions = [
				{ title: 'Rename symbol', kind: 'refactor.rename' },
				{ title: 'Extract method', kind: 'refactor.extract' },
			]
			;(vscode.commands.executeCommand as any).mockResolvedValue(codeActions)
			
			const result = await getCodeActions(symbolBasedParams)
			expect(result.length).toBe(2)
			expect(result[0].title).toBe('Rename symbol')
		})

		it('should handle multiple symbol matches gracefully', async () => {
			const alternatives = [mockSymbol, { ...mockSymbol, name: 'testFunction2' }]
			;(getSymbol as any).mockResolvedValue({ 
				symbol: mockSymbol, 
				isUnique: false, 
				alternatives 
			})
			const codeActions = [{ title: 'Refactor', kind: 'refactor' }]
			;(vscode.commands.executeCommand as any).mockResolvedValue(codeActions)
			
			const result = await getCodeActions(symbolBasedParams)
			expect(result.length).toBe(1)
			expect(result[0].title).toBe('Refactor')
		})

		it('should return empty array if symbol name not found', async () => {
			;(getSymbol as any).mockResolvedValue({ 
				symbol: null, 
				isUnique: false, 
				error: 'No symbol named \'testFunction\' found in document' 
			})
			
			const result = await getCodeActions(symbolBasedParams)
			expect(result).toEqual([])
		})
	})

	describe('error handling', () => {
		it('should handle getSymbol errors gracefully', async () => {
			;(getSymbol as any).mockRejectedValue(new Error('Symbol lookup failed'))
			
			const result = await getCodeActions(positionBasedParams)
			expect(result).toEqual([])
		})

		it('should handle vscode command errors gracefully', async () => {
			;(getSymbol as any).mockResolvedValue({ symbol: mockSymbol, isUnique: true })
			;(vscode.commands.executeCommand as any).mockRejectedValue(new Error('Command failed'))
			
			const result = await getCodeActions(positionBasedParams)
			expect(result).toEqual([])
		})
	})
})
