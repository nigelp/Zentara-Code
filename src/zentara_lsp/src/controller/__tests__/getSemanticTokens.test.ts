import * as vscode from "vscode"
import { getSemanticTokens } from "../getSemanticTokens"
import { GetSemanticTokensParams } from "../../types"

// Use the global vscode mock instead of defining a local one

describe("getSemanticTokens", () => {
	beforeEach(() => {
		jest.clearAllMocks()

		// Setup Uri mocks
		;(vscode.Uri.parse as jest.Mock).mockImplementation((uri) => ({
			toString: () => uri,
			fsPath: uri.replace("file://", ""),
			scheme: "file",
			path: uri.replace("file://", ""),
		}))

		;(vscode.Uri.file as jest.Mock).mockImplementation((path) => ({
			toString: () => `file://${path}`,
			fsPath: path,
			scheme: "file",
			path: path,
		}))
	})

	it("should return null if no semantic tokens are found", async () => {
		const params: GetSemanticTokensParams = {
			textDocument: { uri: "file:///test.ts" },
		}
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined)
		const result = await getSemanticTokens(params)
		expect(result).toBeNull()
	})

	it("should return the semantic tokens if found", async () => {
		const params: GetSemanticTokensParams = {
			textDocument: { uri: "file:///test.ts" },
		}
		const semanticTokens = new vscode.SemanticTokens(new Uint32Array([1, 0, 5, 0, 0]))
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(semanticTokens)
		const result = await getSemanticTokens(params)
		expect(result).toEqual(semanticTokens)
	})

	it("should handle URI without file:// prefix", async () => {
		const params: GetSemanticTokensParams = {
			textDocument: { uri: "/path/to/test.ts" },
		}
		const semanticTokens = new vscode.SemanticTokens(new Uint32Array([1, 0, 5, 0, 0]))
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(semanticTokens)
		const result = await getSemanticTokens(params)
		expect(result).toEqual(semanticTokens)
		expect(vscode.Uri.file).toHaveBeenCalledWith("/path/to/test.ts")
	})

	it("should handle command execution errors", async () => {
		const params: GetSemanticTokensParams = {
			textDocument: { uri: "file:///test.ts" },
		}
		const consoleSpy = jest.spyOn(console, "error").mockImplementation()
		;(vscode.commands.executeCommand as jest.Mock).mockRejectedValue(new Error("Command failed"))

		const result = await getSemanticTokens(params)

		expect(result).toBeNull()
		expect(consoleSpy).toHaveBeenCalledWith("Error fetching semantic tokens:", expect.any(Error))
		consoleSpy.mockRestore()
	})

	it("should handle empty semantic tokens data", async () => {
		const params: GetSemanticTokensParams = {
			textDocument: { uri: "file:///test.ts" },
		}
		const semanticTokens = new vscode.SemanticTokens(new Uint32Array([]))
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(semanticTokens)
		const result = await getSemanticTokens(params)
		expect(result).toEqual(semanticTokens)
	})

	it("should handle different URI schemes", async () => {
		const params: GetSemanticTokensParams = {
			textDocument: { uri: "file://localhost/test.ts" },
		}
		const semanticTokens = new vscode.SemanticTokens(new Uint32Array([2, 0, 3, 1, 0]))
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(semanticTokens)
		const result = await getSemanticTokens(params)
		expect(result).toEqual(semanticTokens)
		expect(vscode.Uri.parse).toHaveBeenCalledWith("file://localhost/test.ts", true)
	})
})
