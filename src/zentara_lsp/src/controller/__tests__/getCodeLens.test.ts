import * as vscode from "vscode"
import { getCodeLens } from "../getCodeLens"
import { GetCodeLensParams } from "../../types"

// Use the global vscode mock instead of defining a local one

describe("getCodeLens", () => {
	const params: GetCodeLensParams = {
		textDocument: { uri: "file:///test.ts" },
	}

	it("should return an empty array if no code lenses are found", async () => {
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue([])
		const result = await getCodeLens(params)
		expect(result).toEqual([])
	})

	it("should return the code lenses if found", async () => {
		const mockCodeLenses = [
			{
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 0 },
				},
				command: { title: "1 reference", command: "editor.action.showReferences" },
			},
		]

		const expectedResult = [
			{
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 0 },
				},
				command: {
					title: "1 reference",
					command: "editor.action.showReferences",
					arguments: undefined,
				},
			},
		]

		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(mockCodeLenses)
		const result = await getCodeLens(params)
		expect(result).toEqual(expectedResult)
	})

	it("should return an empty array if the file does not exist", async () => {
		;(vscode.workspace.fs.stat as jest.Mock).mockRejectedValue(new Error("File not found"))
		const result = await getCodeLens(params)
		expect(result).toEqual([])
	})
})
