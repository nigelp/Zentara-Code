import * as vscode from "vscode"
import { goToDefinition } from "../goToDefinition"
import { GoToDefinitionParams } from "../../types"

// Use the global vscode mock instead of defining a local one

describe("goToDefinition", () => {
	const params: GoToDefinitionParams = {
		textDocument: { uri: "file:///test.ts" },
		position: { line: 1, character: 5 },
	}

	beforeEach(() => {
		jest.clearAllMocks()

		// Re-setup Uri.parse and Position mocks after clearAllMocks
		;(vscode.Uri.parse as jest.Mock).mockImplementation((uri) => ({
			toString: () => uri,
			fsPath: uri,
			scheme: "file",
			authority: "",
			path: uri.replace("file://", ""),
			query: "",
			fragment: "",
		}))

		;(vscode.Position as jest.Mock).mockImplementation((line, character) => ({ line, character }))
	})

	it("should return an empty array if no locations are found", async () => {
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue([])
		const result = await goToDefinition(params)
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
		const result = await goToDefinition(params)
		expect(result.length).toBe(1)
		expect(result[0].uri).toBe("file:///test.ts")
	})

	it("should return an empty array if the file does not exist", async () => {
		;(vscode.workspace.fs.stat as jest.Mock).mockRejectedValue(new Error("File not found"))
		const result = await goToDefinition(params)
		expect(result).toEqual([])
	})
})
