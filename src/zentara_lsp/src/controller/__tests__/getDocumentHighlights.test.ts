import * as vscode from "vscode"
import { getDocumentHighlights } from "../getDocumentHighlights"
import { GetDocumentHighlightsParams } from "../../types"
import { getSymbol } from "../../../../core/tools/lsp/getSymbol"

// Mock the getSymbol helper
jest.mock("../../../../core/tools/lsp/getSymbol")
const mockGetSymbol = getSymbol as jest.MockedFunction<typeof getSymbol>

// Use the global vscode mock instead of defining a local one

describe("getDocumentHighlights", () => {
	const positionParams: GetDocumentHighlightsParams = {
		uri: "file:///test.ts",
		line: 1,
		character: 5,
	}

	const symbolNameParams: GetDocumentHighlightsParams = {
		uri: "file:///test.ts",
		symbolName: "testFunction",
	}

	beforeEach(() => {
		jest.clearAllMocks()
		// Mock successful file stat check
		;(vscode.workspace.fs.stat as jest.Mock).mockResolvedValue({})
		// Mock successful symbol resolution
		mockGetSymbol.mockResolvedValue({
			symbol: {
				name: "testFunction",
				kind: 12,
				range: {
					start: { line: 1, character: 0 },
					end: { line: 1, character: 10 },
				},
				selectionRange: {
					start: { line: 1, character: 5 },
					end: { line: 1, character: 15 },
				},
				children: [],
			},
			isUnique: true,
		})
	})

	it("should return an empty array if no document highlights are found", async () => {
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue([])
		const result = await getDocumentHighlights(positionParams)
		expect(result).toEqual([])
	})

	it("should return the document highlights if found with position params", async () => {
		const mockDocumentHighlights = [
			{
				range: {
					start: { line: 1, character: 0 },
					end: { line: 1, character: 4 },
				},
				kind: 1,
			},
		]

		const expectedResult = [
			{
				range: {
					start: { line: 1, character: 0 },
					end: { line: 1, character: 4 },
				},
				kind: 1,
			},
		]

		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(mockDocumentHighlights)
		const result = await getDocumentHighlights(positionParams)
		expect(result).toEqual(expectedResult)
	})

	it("should return the document highlights if found with symbolName params", async () => {
		const mockDocumentHighlights = [
			{
				range: {
					start: { line: 1, character: 5 },
					end: { line: 1, character: 17 },
				},
				kind: 2,
			},
		]

		const expectedResult = [
			{
				range: {
					start: { line: 1, character: 5 },
					end: { line: 1, character: 17 },
				},
				kind: 2,
			},
		]

		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(mockDocumentHighlights)
		const result = await getDocumentHighlights(symbolNameParams)
		expect(result).toEqual(expectedResult)
	})

	it("should return an empty array if symbol is not found", async () => {
		mockGetSymbol.mockResolvedValue({
			symbol: null,
			isUnique: false,
			error: "Symbol not found",
		})
		const result = await getDocumentHighlights(symbolNameParams)
		expect(result).toEqual([])
	})

	it("should return an empty array if the file does not exist", async () => {
		;(vscode.workspace.fs.stat as jest.Mock).mockRejectedValue(new Error("File not found"))
		const result = await getDocumentHighlights(positionParams)
		expect(result).toEqual([])
	})

	it("should handle multiple symbol matches and use first match", async () => {
		const alternativeSymbol = {
			name: "testFunction",
			kind: 12,
			range: {
				start: { line: 5, character: 0 },
				end: { line: 5, character: 10 },
			},
			selectionRange: {
				start: { line: 5, character: 5 },
				end: { line: 5, character: 15 },
			},
			children: [],
		}

		mockGetSymbol.mockResolvedValue({
			symbol: {
				name: "testFunction",
				kind: 12,
				range: {
					start: { line: 1, character: 0 },
					end: { line: 1, character: 10 },
				},
				selectionRange: {
					start: { line: 1, character: 5 },
					end: { line: 1, character: 15 },
				},
				children: [],
			},
			isUnique: false,
			alternatives: [alternativeSymbol],
		})

		const mockDocumentHighlights = [
			{
				range: {
					start: { line: 1, character: 5 },
					end: { line: 1, character: 17 },
				},
				kind: 1,
			},
		]

		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(mockDocumentHighlights)
		const result = await getDocumentHighlights(symbolNameParams)
		expect(result).toEqual([
			{
				range: {
					start: { line: 1, character: 5 },
					end: { line: 1, character: 17 },
				},
				kind: 1,
			},
		])
	})
})
