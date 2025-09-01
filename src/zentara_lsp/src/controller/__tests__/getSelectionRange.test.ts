import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSelectionRange } from "../getSelectionRange"
import { GetSelectionRangeParams } from "../../types"
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

describe("getSelectionRange", () => {
	const mockUri = { toString: () => 'file:///test.ts', fsPath: '/test.ts' }
	const mockPosition = { line: 1, character: 5 }
	const mockSymbol = {
		name: 'testFunction',
		selectionRange: {
			start: { line: 1, character: 5 },
			end: { line: 1, character: 17 }
		}
	}

	beforeEach(() => {
		vi.clearAllMocks()
		;(vscode.Uri.parse as any).mockReturnValue(mockUri)
		;(vscode.Position as any).mockImplementation((line: number, char: number) => ({ line, character: char }))
		// Default mock for fs.stat - assume file exists
		;(vscode.workspace.fs.stat as any).mockResolvedValue({ type: 1, ctime: 0, mtime: 0, size: 0 })
	})

	describe('backward compatibility - legacy format', () => {
		const legacyParams: GetSelectionRangeParams = {
			textDocument: { uri: "file:///test.ts" },
			position: { line: 1, character: 5 },
		}

		it("should return an empty array if no selection ranges are found", async () => {
			;(vscode.commands.executeCommand as any).mockResolvedValue([])
			const result = await getSelectionRange(legacyParams)
			expect(result).toEqual([])
		})

		it("should return the selection ranges if found", async () => {
			const mockSelectionRanges = [
				{
					range: {
						start: { line: 1, character: 1 },
						end: { line: 1, character: 5 },
					},
					parent: {
						range: {
							start: { line: 1, character: 0 },
							end: { line: 1, character: 10 },
						},
					},
				},
			]

			const expectedResult = [
				{
					range: {
						start: { line: 1, character: 1 },
						end: { line: 1, character: 5 },
					},
					parent: {
						range: {
							start: { line: 1, character: 0 },
							end: { line: 1, character: 10 },
						},
					},
				},
			]

			;(vscode.commands.executeCommand as any).mockResolvedValue(mockSelectionRanges)
			const result = await getSelectionRange(legacyParams)
			expect(result).toEqual(expectedResult)
		})

		it("should return an empty array if the file does not exist", async () => {
			;(vscode.workspace.fs.stat as any).mockRejectedValue(new Error("File not found"))
			const result = await getSelectionRange(legacyParams)
			expect(result).toEqual([])
		})
	})

	describe('new unified format - position-based', () => {
		it('should work with uri, line and character parameters', async () => {
			const params: GetSelectionRangeParams = {
				uri: 'file:///test.ts',
				line: 1,
				character: 5
			}

			const mockSelectionRanges = [{
				range: {
					start: { line: 1, character: 1 },
					end: { line: 1, character: 5 },
				},
				parent: undefined,
			}]

			;(vscode.commands.executeCommand as any).mockResolvedValue(mockSelectionRanges)

			const result = await getSelectionRange(params)

			// Position-based lookup should not call getSymbol
			expect(getSymbol).not.toHaveBeenCalled()

			expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
				'vscode.executeSelectionRangeProvider',
				mockUri,
				[{ line: 1, character: 5 }]
			)

			expect(result).toEqual([{
				range: {
					start: { line: 1, character: 1 },
					end: { line: 1, character: 5 },
				},
				parent: undefined,
			}])
		})
	})

	describe('new unified format - symbol-based', () => {
		it('should work with symbolName parameter', async () => {
			const params: GetSelectionRangeParams = {
				uri: 'file:///test.ts',
				symbolName: 'testFunction'
			}

			const mockSelectionRanges = [{
				range: {
					start: { line: 1, character: 5 },
					end: { line: 1, character: 17 },
				},
				parent: {
					range: {
						start: { line: 0, character: 0 },
						end: { line: 10, character: 0 },
					},
					parent: undefined,
				},
			}]

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: true
			})

			;(vscode.commands.executeCommand as any).mockResolvedValue(mockSelectionRanges)

			const result = await getSelectionRange(params)

			expect(getSymbol).toHaveBeenCalledWith({
				uri: 'file:///test.ts',
				line: undefined,
				character: undefined,
				symbolName: 'testFunction'
			})

			expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
				'vscode.executeSelectionRangeProvider',
				mockUri,
				[{ line: 1, character: 5 }]
			)

			expect(result).toEqual(mockSelectionRanges.map(sr => ({
				range: sr.range,
				parent: sr.parent ? {
					range: sr.parent.range,
					parent: sr.parent.parent
				} : undefined
			})))
		})

		it('should handle multiple symbol matches', async () => {
			const params: GetSelectionRangeParams = {
				uri: 'file:///test.ts',
				symbolName: 'testFunction'
			}

			const mockAlternatives = [mockSymbol, { ...mockSymbol, name: 'testFunction2' }]

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: false,
				alternatives: mockAlternatives
			})

			;(vscode.commands.executeCommand as any).mockResolvedValue([])

			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

			await getSelectionRange(params)

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Multiple symbols found with name \'testFunction\'')
			)

			consoleSpy.mockRestore()
		})

		it('should return empty array when symbol is not found', async () => {
			const params: GetSelectionRangeParams = {
				uri: 'file:///test.ts',
				symbolName: 'nonExistentFunction'
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: null,
				isUnique: false,
				error: 'Symbol not found'
			})

			const result = await getSelectionRange(params)

			expect(result).toEqual([])
		})
	})

	describe('error handling', () => {
		it('should return empty array when file does not exist', async () => {
			const params: GetSelectionRangeParams = {
				uri: 'file:///nonexistent.ts',
				line: 1,
				character: 5
			}

			;(getSymbol as any).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: true
			})

			;(vscode.workspace.fs.stat as any).mockRejectedValue(new Error('File not found'))

			const result = await getSelectionRange(params)

			expect(result).toEqual([])
		})

		it('should handle exceptions gracefully', async () => {
			const params: GetSelectionRangeParams = {
				uri: 'file:///test.ts',
				line: 1,
				character: 5
			}

			;(vscode.commands.executeCommand as any).mockRejectedValue(new Error('Test error'))

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			const result = await getSelectionRange(params)

			expect(result).toEqual([])
			expect(consoleSpy).toHaveBeenCalledWith(
				'Error fetching selection ranges:',
				expect.any(Error)
			)

			consoleSpy.mockRestore()
		})

		it('should handle exceptions gracefully with symbolName', async () => {
			const params: GetSelectionRangeParams = {
				uri: 'file:///test.ts',
				symbolName: 'testFunction'
			}

			;(getSymbol as any).mockRejectedValue(new Error('Test error'))

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			const result = await getSelectionRange(params)

			expect(result).toEqual([])
			expect(consoleSpy).toHaveBeenCalledWith(
				'Error fetching selection ranges:',
				expect.any(Error)
			)

			consoleSpy.mockRestore()
		})
	})
})
