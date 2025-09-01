import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTypeDefinition } from '../getTypeDefinition'
import { GetTypeDefinitionParams } from '../../types'
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
	workspace: {
		fs: {
			stat: vi.fn(),
		},
	},
}))

// Mock getSymbol
vi.mock('../../../../core/tools/lsp/getSymbol', () => ({
	getSymbol: vi.fn(),
}))

describe('getTypeDefinition', () => {
	const mockUri = { toString: () => 'file:///test.ts', fsPath: '/test.ts' }
	const mockPosition = { line: 10, character: 5 }
	const mockSymbol = {
		name: 'TestInterface',
		selectionRange: {
			start: { line: 10, character: 5 },
			end: { line: 10, character: 18 }
		}
	}

	beforeEach(() => {
		vi.clearAllMocks()
		;(vscode.Uri.parse as any).mockReturnValue(mockUri)
		;(vscode.Position as any).mockImplementation((line: number, char: number) => ({ line, character: char }))
		;(vscode.workspace.fs.stat as any).mockResolvedValue({})
	})

	describe('backward compatibility', () => {
		it('should work with legacy position-based parameters', async () => {
			const params: GetTypeDefinitionParams = {
				uri: 'file:///test.ts',
				line: 10,
				character: 5
			}

			const mockLocation = {
				uri: mockUri,
				range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } }
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: true
			})

			;(vscode.commands.executeCommand as any).mockResolvedValue([mockLocation])

			const result = await getTypeDefinition(params)

			expect(getSymbol).toHaveBeenCalledWith({
				uri: 'file:///test.ts',
				line: 10,
				character: 5,
				symbolName: undefined
			})

			expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
				'vscode.executeTypeDefinitionProvider',
				mockUri,
				{ line: 10, character: 5 }
			)

			expect(result).toHaveLength(1)
			expect(result[0].uri).toBe('file:///test.ts')
		})
	})

	describe('new name-based functionality', () => {
		it('should work with symbolName parameter', async () => {
			const params: GetTypeDefinitionParams = {
				uri: 'file:///test.ts',
				symbolName: 'TestInterface'
			}

			const mockLocation = {
				uri: mockUri,
				range: { start: { line: 2, character: 0 }, end: { line: 2, character: 13 } }
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: true
			})

			;(vscode.commands.executeCommand as any).mockResolvedValue([mockLocation])

			const result = await getTypeDefinition(params)

			expect(getSymbol).toHaveBeenCalledWith({
				uri: 'file:///test.ts',
				line: undefined,
				character: undefined,
				symbolName: 'TestInterface'
			})

			expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
				'vscode.executeTypeDefinitionProvider',
				mockUri,
				{ line: 10, character: 5 }
			)

			expect(result).toHaveLength(1)
			expect(result[0].uri).toBe('file:///test.ts')
		})

		it('should handle multiple symbol matches', async () => {
			const params: GetTypeDefinitionParams = {
				uri: 'file:///test.ts',
				symbolName: 'TestInterface'
			}

			const mockAlternatives = [mockSymbol, { ...mockSymbol, name: 'TestInterface2' }]

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: false,
				alternatives: mockAlternatives
			})

			;(vscode.commands.executeCommand as any).mockResolvedValue([])

			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

			await getTypeDefinition(params)

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Multiple symbols found with name \'TestInterface\'')
			)

			consoleSpy.mockRestore()
		})
	})

	describe('error handling', () => {
		it('should return empty array when symbol is not found', async () => {
			const params: GetTypeDefinitionParams = {
				uri: 'file:///test.ts',
				symbolName: 'nonExistentInterface'
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: null,
				isUnique: false,
				error: 'Symbol not found'
			})

			const result = await getTypeDefinition(params)

			expect(result).toEqual([])
		})

		it('should return empty array when file does not exist', async () => {
			const params: GetTypeDefinitionParams = {
				uri: 'file:///test.ts',
				line: 10,
				character: 5
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: true
			})

			;(vscode.workspace.fs.stat as any).mockRejectedValue(new Error('File not found'))

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			const result = await getTypeDefinition(params)

			expect(result).toEqual([])
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Error: File not found - /test.ts')
			)

			consoleSpy.mockRestore()
		})

		it('should return empty array when VSCode command returns no locations', async () => {
			const params: GetTypeDefinitionParams = {
				uri: 'file:///test.ts',
				line: 10,
				character: 5
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: true
			})

			;(vscode.commands.executeCommand as any).mockResolvedValue([])

			const result = await getTypeDefinition(params)

			expect(result).toEqual([])
		})

		it('should handle exceptions gracefully', async () => {
			const params: GetTypeDefinitionParams = {
				uri: 'file:///test.ts',
				line: 10,
				character: 5
			}

			;(getSymbol as any).mockRejectedValue(new Error('Test error'))

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			const result = await getTypeDefinition(params)

			expect(result).toEqual([])
			expect(consoleSpy).toHaveBeenCalledWith(
				'getTypeDefinition failed:',
				expect.any(Error)
			)

			consoleSpy.mockRestore()
		})
	})
})
