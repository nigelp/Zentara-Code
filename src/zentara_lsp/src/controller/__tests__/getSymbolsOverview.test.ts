import * as vscode from "vscode"
import { getSymbolsOverview } from "../getSymbolsOverview"
import { GetSymbolsOverviewParams } from "../../types"

// Mock getDocumentSymbols
jest.mock("../getDocumentSymbols", () => ({
	getDocumentSymbols: jest.fn(),
}))

import { getDocumentSymbols } from "../getDocumentSymbols"

// Use the global vscode mock instead of defining a local one

describe("getSymbolsOverview", () => {
	const params: GetSymbolsOverviewParams = {
		relative_path: "./src",
	}

	beforeEach(() => {
		// Setup workspace folders mock
		;(vscode.workspace.workspaceFolders as any) = [
			{
				uri: {
					fsPath: "/workspace",
					path: "/workspace",
					scheme: "file",
					toString: () => "file:///workspace",
				},
				name: "test-workspace",
				index: 0,
			},
		]

		// Setup Uri.joinPath mock to handle workspace folder joins
		;(vscode.Uri.joinPath as any).mockImplementation((base, ...segments) => {
			const basePath = typeof base === "string" ? base : base.path || base.fsPath || "/workspace"
			const joined = [basePath, ...segments].join("/").replace("//", "/")
			return {
				fsPath: joined,
				path: joined,
				scheme: "file",
				toString: () => `file://${joined}`,
			}
		})

		// Reset mocks but keep the joinPath implementation
		jest.clearAllMocks()

		// Re-setup Uri.joinPath after clearAllMocks
		;(vscode.Uri.joinPath as any).mockImplementation((base, ...segments) => {
			const basePath = typeof base === "string" ? base : base.path || base.fsPath || "/workspace"
			const joined = [basePath, ...segments].join("/").replace("//", "/")
			return {
				fsPath: joined,
				path: joined,
				scheme: "file",
				toString: () => `file://${joined}`,
			}
		})
	})

	it("should return an empty object if the directory is empty", async () => {
		;(vscode.workspace.fs.stat as any).mockResolvedValue({
			type: vscode.FileType.Directory,
			ctime: Date.now(),
			mtime: Date.now(),
			size: 0,
		})
		;(vscode.workspace.fs.readDirectory as any).mockResolvedValue([])
		const result = await getSymbolsOverview(params)
		expect(result).toEqual({})
	})

	it("should return symbols for files in the directory", async () => {
		// Mock it as a file instead of directory to avoid the recursive reading
		;(vscode.workspace.fs.stat as any).mockResolvedValue({
			type: vscode.FileType.File,
			ctime: Date.now(),
			mtime: Date.now(),
			size: 100,
		})

		// Mock getDocumentSymbols to return table format
		;(getDocumentSymbols as any).mockResolvedValue({
			success: true,
			symbols: "NAME | KIND | RANGE | SELECTION | PARENT | HOVER_INFO | EOL\nmySymbol | 12 | 1:0-5:1 | 1:0-8 |  |  | <<<"
		})

		// Mock asRelativePath to return the relative path
		;(vscode.workspace.asRelativePath as any).mockImplementation((uri) => {
			const path = typeof uri === "string" ? uri : uri.fsPath || uri.path
			return path.replace("/workspace/", "")
		})

		const result = await getSymbolsOverview(params)
		expect(Object.keys(result)).toContain("./src")
		expect(result["./src"]).toBeDefined()
		expect(result["./src"].length).toBe(1)
		expect(result["./src"][0]).toEqual({ name: "mySymbol", kind: 12 })
	})
})
