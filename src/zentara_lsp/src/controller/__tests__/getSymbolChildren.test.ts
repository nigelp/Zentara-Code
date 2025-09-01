import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as vscode from "vscode"
import { getSymbolChildren } from "../getSymbolChildren"
import { GetSymbolChildrenParams } from "../../types"
import { getSymbol } from "../../../../core/tools/lsp/getSymbol"

// Mock vscode
vi.mock('vscode', () => ({
	Uri: {
		parse: vi.fn(),
		file: vi.fn(),
	},
	Position: vi.fn(),
	commands: {
		executeCommand: vi.fn(),
	},
	workspace: {
		openTextDocument: vi.fn(),
	},
}))

// Mock the getSymbol function
vi.mock("../../../../core/tools/lsp/getSymbol")

describe("getSymbolChildren", () => {
	const baseParams: GetSymbolChildrenParams = {
		uri: "file:///test.ts",
		line: 5,
		character: 10,
		deep: "1",
		include_hover: true,
	}

	const mockSymbols = [
		{
			name: "MyClass",
			kind: 5,
			range: { start: { line: 0, character: 0 }, end: { line: 20, character: 0 } },
			selectionRange: { start: { line: 0, character: 6 }, end: { line: 0, character: 13 } },
			children: [
				{
					name: "constructor",
					kind: 13,
					range: { start: { line: 2, character: 4 }, end: { line: 4, character: 5 } },
					selectionRange: { start: { line: 2, character: 4 }, end: { line: 2, character: 15 } },
					children: [],
				},
				{
					name: "method1",
					kind: 11,
					range: { start: { line: 6, character: 4 }, end: { line: 8, character: 5 } },
					selectionRange: { start: { line: 6, character: 11 }, end: { line: 6, character: 18 } },
					children: [],
				},
			],
		},
	]

	it("should return error when no symbols are found in document", async () => {
		vi.mocked(getSymbol).mockResolvedValue({
			symbol: null,
			isUnique: false,
			error: "No symbols found in document"
		});
		
		const result = await getSymbolChildren(baseParams)
		expect(result).toEqual({
			success: false,
			error: "No symbols found in document"
		})
	})

	it("should return error when no symbol is found at specified position", async () => {
		vi.mocked(getSymbol).mockResolvedValue({
			symbol: null,
			isUnique: false,
			error: "No symbol found at position 100:100"
		});
		
		const params = { ...baseParams, line: 100, character: 100 }
		const result = await getSymbolChildren(params)
		expect(result).toEqual({
			success: false,
			error: "No symbol found at position 100:100"
		})
	})

	it("should return empty table when symbol has no children", async () => {
		// Mock getSymbol to return method1 which has no children
		const method1Symbol = mockSymbols[0].children[1]; // method1
		vi.mocked(getSymbol).mockResolvedValue({
			symbol: method1Symbol,
			isUnique: true
		});
		
		// Position on method1 which has no children
		const params = { ...baseParams, line: 6, character: 15 }
		const result = await getSymbolChildren(params)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.children).toBe("NAME | KIND | RANGE | SELECTION | PARENT | HOVER_INFO | EOL\n")
		}
	})

	it("should find symbol at exact selection range position", async () => {
		// This test uses the default mock setup for MyClass symbol
		// Position exactly on "MyClass" name
		const params = { ...baseParams, line: 0, character: 10 }
		const result = await getSymbolChildren(params)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.children).toContain("constructor")
			expect(result.children).toContain("method1")
		}
	})

	it('should return only direct children when deep="1"', async () => {
		const nestedSymbol = {
			name: "OuterClass",
			kind: 5,
			range: { start: { line: 0, character: 0 }, end: { line: 30, character: 0 } },
			selectionRange: { start: { line: 0, character: 6 }, end: { line: 0, character: 16 } },
			children: [
				{
					name: "level1Method",
					kind: 11,
					range: { start: { line: 2, character: 4 }, end: { line: 4, character: 5 } },
					selectionRange: { start: { line: 2, character: 11 }, end: { line: 2, character: 23 } },
					children: [],
				},
				{
					name: "InnerClass",
					kind: 5,
					range: { start: { line: 6, character: 4 }, end: { line: 20, character: 5 } },
					selectionRange: { start: { line: 6, character: 10 }, end: { line: 6, character: 20 } },
					children: [
						{
							name: "level2Method",
							kind: 11,
							range: { start: { line: 8, character: 8 }, end: { line: 10, character: 9 } },
							selectionRange: { start: { line: 8, character: 15 }, end: { line: 8, character: 27 } },
							children: [],
						},
					],
				},
			],
		};

		vi.mocked(getSymbol).mockResolvedValue({
			symbol: nestedSymbol,
			isUnique: true
		});
		
		const params = { ...baseParams, line: 0, character: 10, deep: "1" }
		const result = await getSymbolChildren(params)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.children).toContain("level1Method")
			expect(result.children).toContain("InnerClass")
			expect(result.children).not.toContain("level2Method") // Should not include grandchildren
		}
	})

	it('should return children and grandchildren when deep="2"', async () => {
		const nestedSymbol = {
			name: "OuterClass",
			kind: 5,
			range: { start: { line: 0, character: 0 }, end: { line: 30, character: 0 } },
			selectionRange: { start: { line: 0, character: 6 }, end: { line: 0, character: 16 } },
			children: [
				{
					name: "level1Method",
					kind: 11,
					range: { start: { line: 2, character: 4 }, end: { line: 4, character: 5 } },
					selectionRange: { start: { line: 2, character: 11 }, end: { line: 2, character: 23 } },
					children: [],
				},
				{
					name: "InnerClass",
					kind: 5,
					range: { start: { line: 6, character: 4 }, end: { line: 20, character: 5 } },
					selectionRange: { start: { line: 6, character: 10 }, end: { line: 6, character: 20 } },
					children: [
						{
							name: "level2Method",
							kind: 11,
							range: { start: { line: 8, character: 8 }, end: { line: 10, character: 9 } },
							selectionRange: { start: { line: 8, character: 15 }, end: { line: 8, character: 27 } },
							children: [],
						},
					],
				},
			],
		};

		vi.mocked(getSymbol).mockResolvedValue({
			symbol: nestedSymbol,
			isUnique: true
		});

		const params = { ...baseParams, line: 0, character: 10, deep: "2" }
		const result = await getSymbolChildren(params)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.children).toContain("level1Method")
			expect(result.children).toContain("InnerClass")
			expect(result.children).toContain("level2Method") // Should include grandchildren
		}
	})

	it("should include hover information when include_hover=true", async () => {
		// Uses default mock setup
		const params = { ...baseParams, line: 0, character: 10, include_hover: true }
		const result = await getSymbolChildren(params)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.children).toContain("HOVER_INFO")
		}
	})

	it("should exclude hover information when include_hover=false", async () => {
		// Uses default mock setup
		const params = { ...baseParams, line: 0, character: 10, include_hover: false }
		const result = await getSymbolChildren(params)
		expect(result.success).toBe(true)
		if (result.success) {
			expect(result.children).not.toContain("HOVER_INFO")
			expect(result.children).toContain("NAME | KIND | RANGE | SELECTION | PARENT | EOL")
		}
	})

	it("should handle getSymbol errors gracefully", async () => {
		vi.mocked(getSymbol).mockRejectedValue(new Error("getSymbol failed"))
		const result = await getSymbolChildren(baseParams)
		expect(result).toEqual({
			success: false,
			error: "An unexpected error occurred while getting symbol children."
		})
	})

	it("should format table correctly with all columns", async () => {
		// Uses default mock setup
		const params = { ...baseParams, line: 0, character: 10, include_hover: true }
		const result = await getSymbolChildren(params)
		expect(result.success).toBe(true)
		if (result.success) {
			const lines = result.children.split('\n')
			expect(lines[0]).toBe("NAME | KIND | RANGE | SELECTION | PARENT | HOVER_INFO | EOL")
			expect(lines[1]).toContain("constructor | 13")
			expect(lines[2]).toContain("method1 | 11")
		}
	})

	it("should prioritize selection range over full range for position matching", async () => {
		const overlappingSymbols = [
			{
				name: "OuterSymbol",
				kind: 5,
				range: { start: { line: 0, character: 0 }, end: { line: 20, character: 0 } },
				selectionRange: { start: { line: 0, character: 6 }, end: { line: 0, character: 17 } },
				children: [
					{
						name: "InnerSymbol",
						kind: 11,
						range: { start: { line: 5, character: 4 }, end: { line: 10, character: 5 } },
						selectionRange: { start: { line: 5, character: 11 }, end: { line: 5, character: 22 } },
						children: [
							{
								name: "DeepSymbol",
								kind: 14,
								range: { start: { line: 7, character: 8 }, end: { line: 7, character: 20 } },
								selectionRange: { start: { line: 7, character: 12 }, end: { line: 7, character: 22 } },
								children: [],
							},
						],
					},
				],
			},
		]

		// Mock getSymbol to return the InnerSymbol
		const innerSymbol = overlappingSymbols[0].children[0];
		vi.mocked(getSymbol).mockResolvedValue({
			symbol: innerSymbol,
			isUnique: true
		});

		// Position exactly on InnerSymbol's selection range
		const params = { ...baseParams, line: 5, character: 15, include_hover: false }
		const result = await getSymbolChildren(params)
		expect(result.success).toBe(true)
		if (result.success) {
			// Should return InnerSymbol's children, not OuterSymbol's children
			expect(result.children).toContain("DeepSymbol")
			// InnerSymbol should appear in the PARENT column, not as a child name
			expect(result.children).toContain("| InnerSymbol |")
		}
	})

	describe("symbolName parameter support", () => {
		const symbolNameParams: GetSymbolChildrenParams = {
			uri: "file:///test.ts",
			symbolName: "MyClass",
			deep: "1",
			include_hover: true,
		}

		it("should find symbol by name and return its children", async () => {
			// Mock getSymbol to return the MyClass symbol
			const mockSymbol = mockSymbols[0];
			vi.mocked(getSymbol).mockResolvedValue({
				symbol: mockSymbol,
				isUnique: true
			});

			const result = await getSymbolChildren(symbolNameParams)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.children).toContain("constructor")
				expect(result.children).toContain("method1")
				expect(result.children).toContain("| MyClass |")
			}

			// Verify getSymbol was called with correct parameters
			expect(getSymbol).toHaveBeenCalledWith({
				uri: "file:///test.ts",
				line: undefined,
				character: undefined,
				symbolName: "MyClass"
			});
		})

		it("should return error when symbolName not found", async () => {
			// Mock getSymbol to return not found
			vi.mocked(getSymbol).mockResolvedValue({
				symbol: null,
				isUnique: false,
				error: "No symbol named 'NonExistentClass' found in document"
			});

			const params = { ...symbolNameParams, symbolName: "NonExistentClass" }
			const result = await getSymbolChildren(params)
			expect(result).toEqual({
				success: false,
				error: "No symbol named 'NonExistentClass' found in document"
			})
		})

		it("should handle multiple symbols with same name (non-unique)", async () => {
			const mockMultipleSymbols = [
				mockSymbols[0], // First MyClass
				{ // Second MyClass
					...mockSymbols[0],
					range: { start: { line: 25, character: 0 }, end: { line: 45, character: 0 } },
					selectionRange: { start: { line: 25, character: 6 }, end: { line: 25, character: 13 } },
				}
			];

			// Mock getSymbol to return first match with alternatives
			vi.mocked(getSymbol).mockResolvedValue({
				symbol: mockMultipleSymbols[0],
				isUnique: false,
				alternatives: mockMultipleSymbols
			});

			const result = await getSymbolChildren(symbolNameParams)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.children).toContain("constructor")
				expect(result.children).toContain("method1")
			}

			// Should log warning about multiple matches
			expect(getSymbol).toHaveBeenCalledWith({
				uri: "file:///test.ts",
				line: undefined,
				character: undefined,
				symbolName: "MyClass"
			});
		})

		it("should work with symbolName and depth control", async () => {
			const nestedSymbol = {
				name: "OuterClass",
				kind: 5,
				range: { start: { line: 0, character: 0 }, end: { line: 30, character: 0 } },
				selectionRange: { start: { line: 0, character: 6 }, end: { line: 0, character: 16 } },
				children: [
					{
						name: "level1Method",
						kind: 11,
						range: { start: { line: 2, character: 4 }, end: { line: 4, character: 5 } },
						selectionRange: { start: { line: 2, character: 11 }, end: { line: 2, character: 23 } },
						children: [],
					},
					{
						name: "InnerClass",
						kind: 5,
						range: { start: { line: 6, character: 4 }, end: { line: 20, character: 5 } },
						selectionRange: { start: { line: 6, character: 10 }, end: { line: 6, character: 20 } },
						children: [
							{
								name: "level2Method",
								kind: 11,
								range: { start: { line: 8, character: 8 }, end: { line: 10, character: 9 } },
								selectionRange: { start: { line: 8, character: 15 }, end: { line: 8, character: 27 } },
								children: [],
							},
						],
					},
				],
			};

			// Mock getSymbol to return the OuterClass
			vi.mocked(getSymbol).mockResolvedValue({
				symbol: nestedSymbol,
				isUnique: true
			});

			const params = { ...symbolNameParams, symbolName: "OuterClass", deep: "2" }
			const result = await getSymbolChildren(params)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.children).toContain("level1Method")
				expect(result.children).toContain("InnerClass")
				expect(result.children).toContain("level2Method") // Should include grandchildren with deep="2"
			}
		})

		it("should work with symbolName and include_hover=false", async () => {
			// Mock getSymbol to return the MyClass symbol
			vi.mocked(getSymbol).mockResolvedValue({
				symbol: mockSymbols[0],
				isUnique: true
			});

			const params = { ...symbolNameParams, include_hover: false }
			const result = await getSymbolChildren(params)
			expect(result.success).toBe(true)
			if (result.success) {
				expect(result.children).not.toContain("HOVER_INFO")
				expect(result.children).toContain("NAME | KIND | RANGE | SELECTION | PARENT | EOL")
			}
		})

		it("should fail validation when neither position nor symbolName is provided", async () => {
			const invalidParams = {
				uri: "file:///test.ts",
				deep: "1",
				include_hover: true,
			} as GetSymbolChildrenParams;

			// This should be caught by schema validation at the type level
			// But let's test the runtime behavior
			vi.mocked(getSymbol).mockResolvedValue({
				symbol: null,
				isUnique: false,
				error: "Either 'line'/'character' or 'symbolName' must be provided"
			});

			const result = await getSymbolChildren(invalidParams)
			expect(result.success).toBe(false)
			expect(result.error).toContain("Either 'line'/'character' or 'symbolName' must be provided")
		})
	})

	// Update existing tests to use the new getSymbol mock approach
	beforeEach(() => {
		vi.clearAllMocks()
		
		// Default mock for getSymbol - can be overridden in individual tests
		vi.mocked(getSymbol).mockResolvedValue({
			symbol: mockSymbols[0],
			isUnique: true
		});
	})
})