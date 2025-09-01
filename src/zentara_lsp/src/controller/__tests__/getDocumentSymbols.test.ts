import * as vscode from "vscode"
import { getDocumentSymbols } from "../getDocumentSymbols"
import { GetDocumentSymbolsParams } from "../../types"

// Use the global vscode mock instead of defining a local one

describe("getDocumentSymbols", () => {
	const baseParams: GetDocumentSymbolsParams = {
		textDocument: { uri: "file:///test.ts" },
		return_children: "auto",
	}

	const symbols = [
		{
			name: "MyClass",
			kind: 5,
			range: { start: { line: 0, character: 0 }, end: { line: 10, character: 0 } },
			children: [],
		},
	]

	it("should return an empty array if no symbols are found", async () => {
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue([])
		const result = await getDocumentSymbols(baseParams)
		expect(result).toEqual([])
	})

	it('should return full hierarchy when return_children is "yes"', async () => {
		const params = { ...baseParams, return_children: "yes" as const }
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(symbols)
		const result = await getDocumentSymbols(params)
		expect(result).toEqual(symbols)
	})

	it('should return only top-level symbols when return_children is "no"', async () => {
		const params = { ...baseParams, return_children: "no" as const }
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(symbols)
		const result = await getDocumentSymbols(params)
		expect(result[0].children).toBeUndefined()
	})

	it('should return full hierarchy when return_children is "auto" and symbol count is low', async () => {
		const params = { ...baseParams, return_children: "auto" as const }
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(symbols)
		const result = await getDocumentSymbols(params)
		expect(result).toEqual(symbols)
	})

	it('should return only top-level symbols when return_children is "auto" and symbol count is high', async () => {
		const params = { ...baseParams, return_children: "auto" as const }
		const manySymbols = new Array(101).fill(0).map((_, i) => ({
			name: `symbol${i}`,
			kind: 11,
			range: { start: { line: i, character: 0 }, end: { line: i, character: 10 } },
			children: [],
		}))
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(manySymbols)
		const result = await getDocumentSymbols(params)
		expect(result.length).toBe(101)
		expect(result[0].children).toBeUndefined()
	})

	it("should return an empty array if the file does not exist", async () => {
		;(vscode.workspace.fs.stat as jest.Mock).mockRejectedValue(new Error("File not found"))
		const result = await getDocumentSymbols(baseParams)
		expect(result).toEqual([])
	})
})
