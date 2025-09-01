import * as vscode from "vscode"
import { getDeclaration } from "../getDeclaration"
import { GetDeclarationParams } from "../../types"

// Use the global vscode mock instead of defining a local one

describe("getDeclaration", () => {
	const params: GetDeclarationParams = {
		textDocument: { uri: "file:///test.ts" },
		position: { line: 1, character: 5 },
	}

	it("should return an empty array if no locations are found", async () => {
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue([])
		const result = await getDeclaration(params)
		expect(result).toEqual([])
	})

	it("should return the location if found", async () => {
		const location = {
			uri: { toString: () => "file:///test.ts" },
			range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } },
		}
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue([location])
		;(vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue({
			lineAt: jest.fn((line) => ({ text: `line ${line}` })),
			lineCount: 3,
		})
		const result = await getDeclaration(params)
		expect(result.length).toBe(1)
		expect(result[0].uri).toBe("file:///test.ts")
	})

	it("should return an empty array if the file does not exist", async () => {
		;(vscode.workspace.fs.stat as jest.Mock).mockRejectedValue(new Error("File not found"))
		const result = await getDeclaration(params)
		expect(result).toEqual([])
	})
})
