import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSignatureHelp } from '../getSignatureHelp'
import { GetSignatureHelpParams } from '../../types'
import * as vscode from 'vscode'
import { getSymbol } from '../../../../core/tools/lsp/getSymbol'

// Mock vscode
vi.mock('vscode', () => ({
	Uri: {
		parse: vi.fn(),
		file: vi.fn(),
	},
	Position: vi.fn(),
	commands: {
		executeCommand: vi.fn(),
	},
}))

// Mock getSymbol
vi.mock('../../../../core/tools/lsp/getSymbol', () => ({
	getSymbol: vi.fn(),
}))

describe('getSignatureHelp', () => {
	const mockUri = { toString: () => 'file:///test.ts' }
	const mockPosition = { line: 10, character: 5 }
	const mockSymbol = {
		name: 'testFunction',
		selectionRange: {
			start: { line: 10, character: 5 },
			end: { line: 10, character: 17 }
		}
	}

	beforeEach(() => {
		vi.clearAllMocks()
		;(vscode.Uri.parse as any).mockReturnValue(mockUri)
		;(vscode.Position as any).mockImplementation((line: number, char: number) => ({ line, character: char }))
	})

	describe('backward compatibility', () => {
		it('should work with legacy position-based parameters', async () => {
			const params: GetSignatureHelpParams = {
				uri: 'file:///test.ts',
				line: 10,
				character: 5
			}

			const mockSignatureHelp = {
				signatures: [{
					label: 'testFunction(param: string): void',
					documentation: 'Test function',
					parameters: [{
						label: 'param: string',
						documentation: 'Test parameter'
					}]
				}],
				activeSignature: 0,
				activeParameter: 0
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: true
			})

			;(vscode.commands.executeCommand as any).mockResolvedValue(mockSignatureHelp)

			const result = await getSignatureHelp(params)

			expect(getSymbol).toHaveBeenCalledWith({
				uri: 'file:///test.ts',
				line: 10,
				character: 5,
				symbolName: undefined
			})

			expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
				'vscode.executeSignatureHelpProvider',
				mockUri,
				{ line: 10, character: 5 }
			)

			expect(result).toEqual({
				signatures: [{
					label: 'testFunction(param: string): void',
					documentation: 'Test function',
					parameters: [{
						label: 'param: string',
						documentation: 'Test parameter'
					}]
				}],
				activeSignature: 0,
				activeParameter: 0
			})
		})
	})

	describe('new name-based functionality', () => {
		it('should work with symbolName parameter', async () => {
			const params: GetSignatureHelpParams = {
				uri: 'file:///test.ts',
				symbolName: 'testFunction'
			}

			const mockSignatureHelp = {
				signatures: [{
					label: 'testFunction(param: string): void',
					documentation: 'Test function',
					parameters: [{
						label: 'param: string',
						documentation: 'Test parameter'
					}]
				}],
				activeSignature: 0,
				activeParameter: 0
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: true
			})

			;(vscode.commands.executeCommand as any).mockResolvedValue(mockSignatureHelp)

			const result = await getSignatureHelp(params)

			expect(getSymbol).toHaveBeenCalledWith({
				uri: 'file:///test.ts',
				line: undefined,
				character: undefined,
				symbolName: 'testFunction'
			})

			expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
				'vscode.executeSignatureHelpProvider',
				mockUri,
				{ line: 10, character: 5 }
			)

			expect(result).toEqual({
				signatures: [{
					label: 'testFunction(param: string): void',
					documentation: 'Test function',
					parameters: [{
						label: 'param: string',
						documentation: 'Test parameter'
					}]
				}],
				activeSignature: 0,
				activeParameter: 0
			})
		})

		it('should handle multiple symbol matches', async () => {
			const params: GetSignatureHelpParams = {
				uri: 'file:///test.ts',
				symbolName: 'testFunction'
			}

			const mockAlternatives = [mockSymbol, { ...mockSymbol, name: 'testFunction2' }]

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: false,
				alternatives: mockAlternatives
			})

			;(vscode.commands.executeCommand as any).mockResolvedValue({
				signatures: [],
				activeSignature: null,
				activeParameter: null
			})

			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

			await getSignatureHelp(params)

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Multiple symbols found with name \'testFunction\'')
			)

			consoleSpy.mockRestore()
		})
	})

	describe('error handling', () => {
		it('should return null when symbol is not found', async () => {
			const params: GetSignatureHelpParams = {
				uri: 'file:///test.ts',
				symbolName: 'nonExistentFunction'
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: null,
				isUnique: false,
				error: 'Symbol not found'
			})

			const result = await getSignatureHelp(params)

			expect(result).toBeNull()
		})

		it('should return null when VSCode command fails', async () => {
			const params: GetSignatureHelpParams = {
				uri: 'file:///test.ts',
				line: 10,
				character: 5
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: true
			})

			;(vscode.commands.executeCommand as any).mockResolvedValue(null)

			const result = await getSignatureHelp(params)

			expect(result).toBeNull()
		})

		it('should handle exceptions gracefully', async () => {
			const params: GetSignatureHelpParams = {
				uri: 'file:///test.ts',
				line: 10,
				character: 5
			}

			;(getSymbol as any).mockRejectedValue(new Error('Test error'))

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			const result = await getSignatureHelp(params)

			expect(result).toBeNull()
			expect(consoleSpy).toHaveBeenCalledWith(
				'Error fetching signature help:',
				expect.any(Error)
			)

			consoleSpy.mockRestore()
		})
	})
})
