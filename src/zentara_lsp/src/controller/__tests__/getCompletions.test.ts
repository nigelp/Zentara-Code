import * as vscode from "vscode"
import { getCompletions } from "../getCompletions"
import { GetCompletionsParams } from "../../types"

// Use the global vscode mock instead of defining a local one

describe("getCompletions", () => {
	const params: GetCompletionsParams = {
		textDocument: { uri: "file:///test.ts" },
		position: { line: 1, character: 5 },
	}

	it("should return an empty array if no completions are found", async () => {
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue({ items: [] })
		const result = await getCompletions(params)
		expect(result).toEqual([])
	})

	it("should return the completions if found", async () => {
		const completions = {
			items: [
				{ label: "const", kind: 14 },
				{ label: "let", kind: 14 },
			],
		}
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(completions)
		const result = await getCompletions(params)
		expect(result.length).toBe(2)
		expect(result[0].label).toBe("const")
	})

	it("should return an empty array if the file does not exist", async () => {
		;(vscode.workspace.fs.stat as jest.Mock).mockRejectedValue(new Error("File not found"))
		const result = await getCompletions(params)
		expect(result).toEqual([])
	})
})
