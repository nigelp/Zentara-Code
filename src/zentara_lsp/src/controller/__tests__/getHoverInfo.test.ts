import * as vscode from "vscode"
import { getHoverInfo } from "../getHoverInfo"
import { GetHoverInfoParams } from "../../types"

// Use the global vscode mock instead of defining a local one

describe("getHoverInfo", () => {
	const params: GetHoverInfoParams = {
		textDocument: { uri: "file:///test.ts" },
		position: { line: 1, character: 5 },
	}

	it("should return null if no hover information is found", async () => {
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue([])
		const result = await getHoverInfo(params)
		expect(result).toBeNull()
	})

	it("should return the hover information object", async () => {
		const hover = [
			{
				contents: [{ value: "const a: number" }, "Some documentation"],
				range: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 10 },
				},
			},
		]
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(hover)
		const result = await getHoverInfo(params)
		expect(result).toEqual({
			contents: "const a: number\nSome documentation",
			range: {
				start: { line: 0, character: 0 },
				end: { line: 0, character: 10 },
			},
		})
	})

	it("should return null if the file does not exist", async () => {
		;(vscode.workspace.fs.stat as jest.Mock).mockRejectedValue(new Error("File not found"))
		const result = await getHoverInfo(params)
		expect(result).toBeNull()
	})
})
