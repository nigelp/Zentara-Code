import * as vscode from "vscode"
import { vi } from "vitest"
import { getCallHierarchy } from "../getCallHierarchy"
import { GetCallHierarchyParams } from "../../types"
import * as getSymbolModule from "../../../../core/tools/lsp/getSymbol"

// Use the global vscode mock instead of defining a local one

describe("getCallHierarchy", () => {
	const positionParams: GetCallHierarchyParams = {
		uri: "file:///test.ts",
		line: 1,
		character: 5,
	}

	const symbolNameParams: GetCallHierarchyParams = {
		uri: "file:///test.ts",
		symbolName: "testFunction",
	}

	beforeEach(() => {
		vi.clearAllMocks()

		// Re-setup Uri.parse and Position mocks after clearAllMocks
		;(vscode.Uri.parse as any).mockImplementation((uri: string) => ({
			toString: () => uri,
			fsPath: uri,
			scheme: "file",
			authority: "",
			path: uri.replace("file://", ""),
			query: "",
			fragment: "",
		}))

		;(vscode.Uri.file as any).mockImplementation((path: string) => ({
			toString: () => `file://${path}`,
			fsPath: path,
			scheme: "file",
			authority: "",
			path: path,
			query: "",
			fragment: "",
		}))

		;(vscode.Position as any).mockImplementation((line: number, character: number) => ({ line, character }))
		;(vscode.Range as any).mockImplementation((start: any, end: any) => ({ start, end }))

		// Mock workspace.fs.stat to assume files exist
		if (!vscode.workspace.fs) {
			(vscode.workspace as any).fs = {
				stat: vi.fn()
			}
		}
		;(vscode.workspace.fs.stat as any).mockResolvedValue({ type: 1, ctime: 0, mtime: 0, size: 0 })

		// Mock getSymbol module
		vi.spyOn(getSymbolModule, 'getSymbol').mockImplementation(async (options) => {
			// Default successful symbol resolution
			return {
				symbol: {
					name: options.symbolName || "testFunction",
					kind: 12, // Function
					range: {
						start: { line: options.line || 1, character: options.character || 0 },
						end: { line: options.line || 1, character: (options.character || 0) + 10 }
					},
					selectionRange: {
						start: { line: options.line || 1, character: options.character || 0 },
						end: { line: options.line || 1, character: (options.character || 0) + (options.symbolName?.length || 10) }
					},
					children: [],
					detail: ""
				},
				isUnique: true
			}
		})
	})

	it("should return empty tables if no call hierarchy is found", async () => {
		;(vscode.commands.executeCommand as any).mockResolvedValue(undefined)
		const result = await getCallHierarchy(positionParams)
		expect(result).not.toBeNull()
		expect(result?.incomingCalls).toBe("FROM_NAME | FROM_KIND | FROM_URI | FROM_RANGE | FROM_SELECTION | CALL_RANGES | EOL\n")
		expect(result?.outgoingCalls).toBe("TO_NAME | TO_KIND | TO_URI | TO_RANGE | TO_SELECTION | CALL_RANGES | EOL\n")
	})

	it("should return call hierarchy with position-based lookup", async () => {
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
			start: { line: 1, character: 0 },
			end: { line: 1, character: 10 },
		}

		const callHierarchyItems = [
			{
				name: "functionA",
				kind: 12, // Function kind
				uri: mockUri,
				range: mockRange,
				selectionRange: mockRange,
				detail: "test function",
			},
		]

		;(vscode.commands.executeCommand as any).mockImplementation((command: string, ...args: any[]) => {
			if (command === "vscode.prepareCallHierarchy") {
				return Promise.resolve(callHierarchyItems)
			}
			if (command === "vscode.provideIncomingCalls" || command === "vscode.provideOutgoingCalls") {
				return Promise.resolve([])
			}
			return Promise.resolve(undefined)
		})

		const result = await getCallHierarchy(positionParams)
		expect(result).not.toBeNull()
		expect(result?.incomingCalls).toContain("FROM_NAME | FROM_KIND | FROM_URI | FROM_RANGE | FROM_SELECTION | CALL_RANGES | EOL")
		expect(result?.outgoingCalls).toContain("TO_NAME | TO_KIND | TO_URI | TO_RANGE | TO_SELECTION | CALL_RANGES | EOL")
	})

	it("should return call hierarchy with symbolName-based lookup", async () => {
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
			start: { line: 2, character: 0 },
			end: { line: 2, character: 12 },
		}

		const callHierarchyItems = [
			{
				name: "testFunction",
				kind: 12, // Function kind
				uri: mockUri,
				range: mockRange,
				selectionRange: mockRange,
				detail: "test function",
			},
		]

		;(vscode.commands.executeCommand as any).mockImplementation((command: string, ...args: any[]) => {
			if (command === "vscode.prepareCallHierarchy") {
				return Promise.resolve(callHierarchyItems)
			}
			if (command === "vscode.provideIncomingCalls" || command === "vscode.provideOutgoingCalls") {
				return Promise.resolve([])
			}
			return Promise.resolve(undefined)
		})

		const result = await getCallHierarchy(symbolNameParams)
		expect(result).not.toBeNull()
		expect(result?.incomingCalls).toContain("FROM_NAME | FROM_KIND | FROM_URI | FROM_RANGE | FROM_SELECTION | CALL_RANGES | EOL")
		expect(result?.outgoingCalls).toContain("TO_NAME | TO_KIND | TO_URI | TO_RANGE | TO_SELECTION | CALL_RANGES | EOL")
	})

	it("should handle symbol not found case", async () => {
		// Mock getSymbol to return no symbol
		vi.spyOn(getSymbolModule, 'getSymbol').mockResolvedValueOnce({
			symbol: null,
			isUnique: false,
			error: "Symbol not found"
		})

		const result = await getCallHierarchy(symbolNameParams)
		expect(result).not.toBeNull()
		expect(result?.incomingCalls).toBe("FROM_NAME | FROM_KIND | FROM_URI | FROM_RANGE | FROM_SELECTION | CALL_RANGES | EOL\n")
		expect(result?.outgoingCalls).toBe("TO_NAME | TO_KIND | TO_URI | TO_RANGE | TO_SELECTION | CALL_RANGES | EOL\n")
	})

	it("should handle file not found error", async () => {
		;(vscode.workspace.fs.stat as any).mockRejectedValue(new Error("File not found"))
		
		const result = await getCallHierarchy(positionParams)
		expect(result).not.toBeNull()
		expect(result?.incomingCalls).toBe("FROM_NAME | FROM_KIND | FROM_URI | FROM_RANGE | FROM_SELECTION | CALL_RANGES | EOL\n")
		expect(result?.outgoingCalls).toBe("TO_NAME | TO_KIND | TO_URI | TO_RANGE | TO_SELECTION | CALL_RANGES | EOL\n")
	})

	it("should handle multiple symbol matches", async () => {
		// Mock getSymbol to return multiple matches
		vi.spyOn(getSymbolModule, 'getSymbol').mockResolvedValueOnce({
			symbol: {
				name: "testFunction",
				kind: 12,
				range: {
					start: { line: 1, character: 0 },
					end: { line: 1, character: 12 }
				},
				selectionRange: {
					start: { line: 1, character: 0 },
					end: { line: 1, character: 12 }
				},
				children: [],
				detail: ""
			},
			isUnique: false,
			alternatives: [
				{
					name: "testFunction",
					kind: 12,
					range: {
						start: { line: 5, character: 0 },
						end: { line: 5, character: 12 }
					},
					selectionRange: {
						start: { line: 5, character: 0 },
						end: { line: 5, character: 12 }
					},
					children: [],
					detail: ""
				}
			]
		})

		const mockUri = {
			toString: () => "file:///test.ts",
			fsPath: "/test.ts",
			scheme: "file",
			authority: "",
			path: "/test.ts",
			query: "",
			fragment: "",
		}

		const callHierarchyItems = [
			{
				name: "testFunction",
				kind: 12,
				uri: mockUri,
				range: { start: { line: 1, character: 0 }, end: { line: 1, character: 12 } },
				selectionRange: { start: { line: 1, character: 0 }, end: { line: 1, character: 12 } },
				detail: "test function",
			},
		]

		;(vscode.commands.executeCommand as any).mockImplementation((command: string, ...args: any[]) => {
			if (command === "vscode.prepareCallHierarchy") {
				return Promise.resolve(callHierarchyItems)
			}
			if (command === "vscode.provideIncomingCalls" || command === "vscode.provideOutgoingCalls") {
				return Promise.resolve([])
			}
			return Promise.resolve(undefined)
		})

		const result = await getCallHierarchy(symbolNameParams)
		expect(result).not.toBeNull()
		expect(result?.incomingCalls).toContain("FROM_NAME | FROM_KIND | FROM_URI | FROM_RANGE | FROM_SELECTION | CALL_RANGES | EOL")
		expect(result?.outgoingCalls).toContain("TO_NAME | TO_KIND | TO_URI | TO_RANGE | TO_SELECTION | CALL_RANGES | EOL")
	})
})
