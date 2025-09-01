import * as vscode from "vscode"
import { findUsages } from "../findUsages"
import { FindUsagesParams } from "../../types"

// Use the global vscode mock instead of defining a local one

describe("findUsages", () => {
	const params: FindUsagesParams = {
		textDocument: { uri: "file:///test.ts" },
		position: { line: 1, character: 1 },
	}

	beforeEach(() => {
		jest.clearAllMocks()

		// Re-setup Uri.parse mock after clearAllMocks
		;(vscode.Uri.parse as any).mockImplementation((uri) => ({
			toString: () => uri,
			fsPath: uri,
			scheme: "file",
			authority: "",
			path: uri.replace("file://", ""),
			query: "",
			fragment: "",
		}))

		// Re-setup Position mock
		;(vscode.Position as any).mockImplementation((line, character) => ({ line, character }))

		// Default mock for fs.stat - assume file exists
		;(vscode.workspace.fs.stat as any).mockResolvedValue({ type: 1, ctime: 0, mtime: 0, size: 0 })
	})

	it("should return an empty array if no locations are found", async () => {
		;(vscode.commands.executeCommand as any).mockResolvedValue([])
		const result = await findUsages(params)
		expect(result).toEqual([])
	})

	it("should return sample references if locations exceed MAX_REFERENCES_THRESHOLD", async () => {
		const locations = new Array(500).fill({
			uri: { toString: () => "file:///test.ts" },
			range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
		})
		;(vscode.commands.executeCommand as any).mockResolvedValue(locations)
		const result = await findUsages(params)
		expect(result.length).toBe(6)
		expect(result[5].preview).toContain("Too many references found")
	})

	it("should include previews if locations are below PREVIEW_THRESHOLD", async () => {
		const locations = [
			{
				uri: { toString: () => "file:///test.ts" },
				range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } },
			},
		]
		;(vscode.commands.executeCommand as any).mockResolvedValue(locations)
		;(vscode.workspace.openTextDocument as any).mockResolvedValue({
			lineAt: jest.fn((line) => ({ text: `line ${line}` })),
			lineCount: 3,
		})
		const result = await findUsages(params)
		expect(result.length).toBe(1)
		expect(result[0].preview).toBe("line 0\nline 1\nline 2")
	})

	it("should not include previews if locations are above PREVIEW_THRESHOLD", async () => {
		const locations = new Array(51).fill({
			uri: { toString: () => "file:///test.ts" },
			range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
		})
		;(vscode.commands.executeCommand as any).mockResolvedValue(locations)
		const result = await findUsages(params)
		expect(result.length).toBe(51)
		expect(result[0].preview).toBeUndefined()
	})

	it("should return an empty array if the file does not exist", async () => {
		;(vscode.workspace.fs.stat as any).mockRejectedValue(new Error("File not found"))
		const result = await findUsages(params)
		expect(result).toEqual([])
	})
})
