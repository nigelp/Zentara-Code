import * as vscode from "vscode"
import { getSymbols } from "../get_symbols"
import { GetSymbolsParams } from "../../types"
import Ripgrep from "@vscode/ripgrep"

// Mock the regexSearchFiles function to avoid ripgrep dependency
jest.mock("../../../../services/ripgrep", () => ({
	regexSearchFiles: jest.fn(),
}))

import { regexSearchFiles } from "../../../../services/ripgrep"

describe("getSymbols", () => {
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

		;(vscode.Uri.file as jest.Mock).mockImplementation((path) => ({
			toString: () => `file://${path}`,
			fsPath: path,
			scheme: "file",
			authority: "",
			path: path,
			query: "",
			fragment: "",
		}))

		;(vscode.Position as jest.Mock).mockImplementation((line, character) => ({ line, character }))
		;(vscode.Range as jest.Mock).mockImplementation((start, end) => ({ start, end }))
		;(vscode.Location as jest.Mock).mockImplementation((uri, range) => ({ uri, range }))

		// Mock the regexSearchFiles to return empty results by default
		;(regexSearchFiles as jest.Mock).mockResolvedValue("# /test/file.ts\n")
	})

	it("should return an empty array if no symbols are found", async () => {
		const params: GetSymbolsParams = {
			name_path: "test",
		}
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue([])
		const result = await getSymbols(params)
		expect(result).toEqual([])
	})

	it("should return the symbols if found", async () => {
		const params: GetSymbolsParams = {
			name_path: "test",
		}
		const symbols = [
			{
				name: "test",
				kind: 12,
				selectionRange: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 4 },
				},
				children: [],
			},
		]

		// Mock regexSearchFiles to return a file with the symbol name we're looking for
		;(regexSearchFiles as jest.Mock).mockResolvedValue("# /test/file.ts\n")

		// Mock vscode.commands.executeCommand to return symbols for document symbol provider
		;(vscode.commands.executeCommand as jest.Mock).mockImplementation((command, ...args) => {
			if (command === "vscode.executeDocumentSymbolProvider") {
				return Promise.resolve(symbols)
			}
			return Promise.resolve([])
		})

		const result = await getSymbols(params)
		expect(result.length).toBeGreaterThan(0)
		expect(result[0].name).toBe("test")
	})

	it("should handle nested symbols with children", async () => {
		const params: GetSymbolsParams = {
			name_path: "parent/child",
		}
		const symbols = [
			{
				name: "parent",
				kind: 4,
				selectionRange: {
					start: { line: 0, character: 0 },
					end: { line: 10, character: 0 },
				},
				children: [
					{
						name: "child",
						kind: 5,
						selectionRange: {
							start: { line: 2, character: 4 },
							end: { line: 4, character: 4 },
						},
						children: [],
					},
				],
			},
		]

		;(regexSearchFiles as jest.Mock).mockResolvedValue("# /test/file.ts\n")
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(symbols)

		const result = await getSymbols(params)
		// Only child symbol matches the search pattern 'parent/child'
		expect(result.length).toBeGreaterThan(0)
		const childSymbol = result.find((s) => s.name === "child")
		expect(childSymbol?.name_path).toBe("parent/child")
	})

	it("should filter by include_kinds", async () => {
		const params: GetSymbolsParams = {
			name_path: "test",
			include_kinds: [12], // Only include variables
		}
		const symbols = [
			{
				name: "test",
				kind: 12, // Variable
				selectionRange: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 4 },
				},
				children: [],
			},
			{
				name: "test2",
				kind: 4, // Class
				selectionRange: {
					start: { line: 5, character: 0 },
					end: { line: 5, character: 5 },
				},
				children: [],
			},
		]

		;(regexSearchFiles as jest.Mock).mockResolvedValue("# /test/file.ts\n")
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(symbols)

		const result = await getSymbols(params)
		expect(result.length).toBe(1)
		expect(result[0].kind).toBe(12)
	})

	it("should filter by exclude_kinds", async () => {
		const params: GetSymbolsParams = {
			name_path: "test",
			exclude_kinds: [4], // Exclude classes
		}
		const symbols = [
			{
				name: "test",
				kind: 12, // Variable
				selectionRange: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 4 },
				},
				children: [],
			},
			{
				name: "test2",
				kind: 4, // Class
				selectionRange: {
					start: { line: 5, character: 0 },
					end: { line: 5, character: 5 },
				},
				children: [],
			},
		]

		;(regexSearchFiles as jest.Mock).mockResolvedValue("# /test/file.ts\n")
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(symbols)

		const result = await getSymbols(params)
		expect(result.length).toBe(1)
		expect(result[0].kind).toBe(12)
	})

	it("should include body when include_body is true", async () => {
		const params: GetSymbolsParams = {
			name_path: "test",
			include_body: true,
		}
		const symbols = [
			{
				name: "test",
				kind: 12,
				selectionRange: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 10 },
				},
				children: [],
			},
		]

		const mockDocument = {
			getText: jest.fn().mockReturnValue("const test = 42;"),
		}

		;(regexSearchFiles as jest.Mock).mockResolvedValue("# /test/file.ts\n")
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(symbols)
		;(vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument)

		const result = await getSymbols(params)
		expect(result[0].body).toBe("const test = 42;")
		expect(mockDocument.getText).toHaveBeenCalled()
	})

	it("should handle substring matching", async () => {
		const params: GetSymbolsParams = {
			name_path: "est",
			substring_matching: true,
		}
		const symbols = [
			{
				name: "test",
				kind: 12,
				selectionRange: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 4 },
				},
				children: [],
			},
			{
				name: "best",
				kind: 12,
				selectionRange: {
					start: { line: 1, character: 0 },
					end: { line: 1, character: 4 },
				},
				children: [],
			},
		]

		;(regexSearchFiles as jest.Mock).mockResolvedValue("# /test/file.ts\n")
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(symbols)

		const result = await getSymbols(params)
		expect(result.length).toBe(2)
	})

	it("should handle absolute path matching", async () => {
		const params: GetSymbolsParams = {
			name_path: "/parent/child",
		}
		const symbols = [
			{
				name: "parent",
				kind: 4,
				selectionRange: {
					start: { line: 0, character: 0 },
					end: { line: 10, character: 0 },
				},
				children: [
					{
						name: "child",
						kind: 5,
						selectionRange: {
							start: { line: 2, character: 4 },
							end: { line: 4, character: 4 },
						},
						children: [],
					},
				],
			},
		]

		;(regexSearchFiles as jest.Mock).mockResolvedValue("# /test/file.ts\n")
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(symbols)

		const result = await getSymbols(params)
		// With absolute path, only exact matches are returned
		const childSymbol = result.find((s) => s.name === "child")
		expect(childSymbol).toBeDefined()
		expect(childSymbol?.name_path).toBe("parent/child")
	})

	it("should return empty array when max_answer_chars is exceeded", async () => {
		const params: GetSymbolsParams = {
			name_path: "test",
			max_answer_chars: 10, // Very small limit
		}
		const symbols = [
			{
				name: "test_with_very_long_name",
				kind: 12,
				selectionRange: {
					start: { line: 0, character: 0 },
					end: { line: 0, character: 24 },
				},
				children: [],
			},
		]

		;(regexSearchFiles as jest.Mock).mockResolvedValue("# /test/file.ts\n")
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(symbols)

		const result = await getSymbols(params)
		expect(result).toEqual([])
	})

	it("should handle null executeCommand response", async () => {
		const params: GetSymbolsParams = {
			name_path: "test",
		}

		;(regexSearchFiles as jest.Mock).mockResolvedValue("# /test/file.ts\n")
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(null)

		const result = await getSymbols(params)
		expect(result).toEqual([])
	})

	it("should handle relative_path parameter", async () => {
		const params: GetSymbolsParams = {
			name_path: "test",
			relative_path: "./src",
		}

		;(regexSearchFiles as jest.Mock).mockResolvedValue("# /src/test/file.ts\n")
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue([])

		await getSymbols(params)
		expect(regexSearchFiles).toHaveBeenCalledWith("./src", "./src", "test")
	})
})
