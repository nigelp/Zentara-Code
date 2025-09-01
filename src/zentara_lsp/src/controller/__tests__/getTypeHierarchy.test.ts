import * as vscode from "vscode"
import { getTypeHierarchy } from "../getTypeHierarchy"
import { GetTypeHierarchyParams } from "../../types"
import * as getSymbolModule from "../../../../core/tools/lsp/getSymbol"

// Use the global vscode mock instead of defining a local one

describe("getTypeHierarchy", () => {
	const params: GetTypeHierarchyParams = {
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

	it("should return null if no type hierarchy is found", async () => {
		;(vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined)
		const result = await getTypeHierarchy(params)
		expect(result).toBeNull()
	})

	it("should return the type hierarchy if found", async () => {
		const mockUri = {
			toString: () => "file:///test.ts",
			fsPath: "/test.ts",
			scheme: "file",
			authority: "",
			path: "/test.ts",
			query: "",
			fragment: "",
		}

		const mockRange = {
			start: { line: 0, character: 0 },
			end: { line: 0, character: 10 },
		}

		const typeHierarchyItems = [
			{
				name: "classA",
				kind: 5, // Class kind
				uri: mockUri,
				range: mockRange,
				selectionRange: mockRange,
				detail: "test class",
			},
		]

		;(vscode.commands.executeCommand as jest.Mock).mockImplementation((command, ...args) => {
			if (command === "vscode.prepareTypeHierarchy") {
				return Promise.resolve(typeHierarchyItems)
			}
			if (
				command === "vscode.provideTypeHierarchySupertypes" ||
				command === "vscode.provideTypeHierarchySubtypes"
			) {
				return Promise.resolve([])
			}
			return Promise.resolve(undefined)
		})

		const result = await getTypeHierarchy(params)
		expect(result).not.toBeNull()
		expect(result?.name).toBe("classA")
		expect(result?.kind).toBe(5)
	})

	it("should return null if the file does not exist", async () => {
		;(vscode.workspace.fs.stat as jest.Mock).mockRejectedValue(new Error("File not found"))
		const result = await getTypeHierarchy(params)
		expect(result).toBeNull()
	})

	describe("with symbolName parameter (flattened format)", () => {
		const mockDocumentSymbol = {
			name: "TestClass",
			kind: 5, // Class kind
			range: {
				start: { line: 5, character: 0 },
				end: { line: 10, character: 1 },
			},
			selectionRange: {
				start: { line: 5, character: 6 },
				end: { line: 5, character: 15 },
			},
		}

		const flattenedParams: GetTypeHierarchyParams = {
			uri: "file:///test.ts",
			symbolName: "TestClass",
		}

		const mockUri = {
			toString: () => "file:///test.ts",
			fsPath: "/test.ts",
			scheme: "file",
			authority: "",
			path: "/test.ts",
			query: "",
			fragment: "",
		}

		const mockRange = {
			start: { line: 5, character: 6 },
			end: { line: 5, character: 15 },
		}

		const typeHierarchyItems = [
			{
				name: "TestClass",
				kind: 5, // Class kind
				uri: mockUri,
				range: mockRange,
				selectionRange: mockRange,
				detail: "test class",
			},
		]

		beforeEach(() => {
			// Default fs.stat mock - assume file exists
			;(vscode.workspace.fs.stat as jest.Mock).mockResolvedValue({ type: 1, ctime: 0, mtime: 0, size: 0 })
			
			// Mock getSymbol function
			jest.spyOn(getSymbolModule, 'getSymbol').mockResolvedValue({
				symbol: mockDocumentSymbol,
				isUnique: true,
			})
		})

		afterEach(() => {
			jest.restoreAllMocks()
		})

		it("should use getSymbol helper to resolve symbol by name", async () => {
			;(vscode.commands.executeCommand as jest.Mock).mockImplementation((command, ...args) => {
				if (command === "vscode.prepareTypeHierarchy") {
					return Promise.resolve(typeHierarchyItems)
				}
				if (
					command === "vscode.provideSupertypes" ||
					command === "vscode.provideSubtypes"
				) {
					return Promise.resolve([])
				}
				return Promise.resolve(undefined)
			})

			const result = await getTypeHierarchy(flattenedParams)
			
			expect(getSymbolModule.getSymbol).toHaveBeenCalledWith({
				uri: "file:///test.ts",
				line: undefined,
				character: undefined,
				symbolName: "TestClass",
			})
			expect(result).not.toBeNull()
			expect(result?.name).toBe("TestClass")
		})

		it("should return null if symbol is not found", async () => {
			jest.spyOn(getSymbolModule, 'getSymbol').mockResolvedValue({
				symbol: null,
				isUnique: false,
				error: "Symbol not found",
			})

			const result = await getTypeHierarchy(flattenedParams)
			expect(result).toBeNull()
		})

		it("should handle multiple matches gracefully", async () => {
			const alternatives = [mockDocumentSymbol, { ...mockDocumentSymbol, name: "AnotherTestClass" }]
			jest.spyOn(getSymbolModule, 'getSymbol').mockResolvedValue({
				symbol: mockDocumentSymbol,
				isUnique: false,
				alternatives,
			})

			;(vscode.commands.executeCommand as jest.Mock).mockImplementation((command, ...args) => {
				if (command === "vscode.prepareTypeHierarchy") {
					return Promise.resolve(typeHierarchyItems)
				}
				if (
					command === "vscode.provideSupertypes" ||
					command === "vscode.provideSubtypes"
				) {
					return Promise.resolve([])
				}
				return Promise.resolve(undefined)
			})

			const result = await getTypeHierarchy(flattenedParams)
			expect(result).not.toBeNull()
			expect(result?.name).toBe("TestClass")
		})

		it("should work with position-based flattened format", async () => {
			const positionParams: GetTypeHierarchyParams = {
				uri: "file:///test.ts",
				line: 5,
				character: 6,
			}

			;(vscode.commands.executeCommand as jest.Mock).mockImplementation((command, ...args) => {
				if (command === "vscode.prepareTypeHierarchy") {
					return Promise.resolve(typeHierarchyItems)
				}
				if (
					command === "vscode.provideSupertypes" ||
					command === "vscode.provideSubtypes"
				) {
					return Promise.resolve([])
				}
				return Promise.resolve(undefined)
			})

			const result = await getTypeHierarchy(positionParams)
			
			expect(getSymbolModule.getSymbol).toHaveBeenCalledWith({
				uri: "file:///test.ts",
				line: 5,
				character: 6,
				symbolName: undefined,
			})
			expect(result).not.toBeNull()
			expect(result?.name).toBe("TestClass")
		})

		it("should return null if file does not exist (flattened format)", async () => {
			;(vscode.workspace.fs.stat as jest.Mock).mockRejectedValue(new Error("File not found"))
			
			const result = await getTypeHierarchy(flattenedParams)
			expect(result).toBeNull()
		})
	})
})
