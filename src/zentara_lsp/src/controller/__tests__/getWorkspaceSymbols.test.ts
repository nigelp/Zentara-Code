import * as vscode from "vscode"
import { getWorkspaceSymbols } from "../getWorkspaceSymbols"
import { GetWorkspaceSymbolsParams } from "../../types"

// Use the global vscode mock instead of defining a local one

describe("getWorkspaceSymbols", () => {
	const params: GetWorkspaceSymbolsParams = {
		query: "test",
	}

	it("should return an empty array if no workspace symbols are found", async () => {
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue([])
		const result = await getWorkspaceSymbols(params)
		expect(result).toEqual([])
	})

	it("should return the workspace symbols if found", async () => {
		const mockLocation = {
			uri: {
				toString: () => "file:///test.ts",
			},
			range: {
				start: { line: 0, character: 0 },
				end: { line: 0, character: 8 },
			},
		}

		const vscodeSymbols = [
			{
				name: "mySymbol",
				kind: 12,
				location: mockLocation,
			},
		]

		const expectedResult = [
			{
				name: "mySymbol",
				kind: 12,
				location: {
					uri: "file:///test.ts",
					range: {
						start: { line: 0, character: 0 },
						end: { line: 0, character: 8 },
					},
					preview: "",
				},
			},
		]

		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(vscodeSymbols)
		const result = await getWorkspaceSymbols(params)
		expect(result).toEqual(expectedResult)
	})
})
