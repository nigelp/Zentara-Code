import * as vscode from "vscode"
import { fromVscodeLocation, getActiveEditor, getDocumentUri, stringifySafe } from "../vscodeUtils"

describe("vscodeUtils", () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe("fromVscodeLocation", () => {
		it("should convert vscode.Location to plain object", () => {
			const mockLocation: vscode.Location = {
				uri: {
					toString: () => "file:///test.ts",
				} as vscode.Uri,
				range: {
					start: { line: 10, character: 5 } as vscode.Position,
					end: { line: 10, character: 15 } as vscode.Position,
				} as vscode.Range,
			}

			const result = fromVscodeLocation(mockLocation)

			expect(result).toEqual({
				uri: "file:///test.ts",
				range: {
					start: { line: 10, character: 5 },
					end: { line: 10, character: 15 },
				},
				preview: "",
			})
		})

		it("should handle location with zero positions", () => {
			const mockLocation: vscode.Location = {
				uri: {
					toString: () => "file:///empty.ts",
				} as vscode.Uri,
				range: {
					start: { line: 0, character: 0 } as vscode.Position,
					end: { line: 0, character: 0 } as vscode.Position,
				} as vscode.Range,
			}

			const result = fromVscodeLocation(mockLocation)

			expect(result.range.start).toEqual({ line: 0, character: 0 })
			expect(result.range.end).toEqual({ line: 0, character: 0 })
		})
	})

	describe("getActiveEditor", () => {
		it("should return the active text editor", () => {
			const mockEditor = { document: { uri: "test" } } as any
			;(vscode.window.activeTextEditor as any) = mockEditor

			const result = getActiveEditor()

			expect(result).toBe(mockEditor)
		})

		it("should return undefined when no active editor", () => {
			;(vscode.window.activeTextEditor as any) = undefined

			const result = getActiveEditor()

			expect(result).toBeUndefined()
		})
	})

	describe("getDocumentUri", () => {
		it("should return the document URI as string", () => {
			const mockDocument = {
				uri: {
					toString: () => "file:///document.ts",
				},
			} as vscode.TextDocument

			const result = getDocumentUri(mockDocument)

			expect(result).toBe("file:///document.ts")
		})
	})

	describe("stringifySafe", () => {
		it("should stringify simple objects", () => {
			const obj = { name: "test", value: 42 }
			const result = stringifySafe(obj)
			const parsed = JSON.parse(result)

			expect(parsed).toEqual(obj)
		})

		it("should handle circular references", () => {
			const obj: any = { name: "test" }
			obj.circular = obj // Create circular reference

			const result = stringifySafe(obj)
			const parsed = JSON.parse(result)

			expect(parsed.name).toBe("test")
			expect(parsed.circular).toBeUndefined() // Circular reference removed
		})

		it("should handle nested circular references", () => {
			const obj: any = {
				level1: {
					level2: {
						value: "deep",
					},
				},
			}
			obj.level1.level2.circular = obj.level1 // Create circular reference

			const result = stringifySafe(obj)
			const parsed = JSON.parse(result)

			expect(parsed.level1.level2.value).toBe("deep")
			expect(parsed.level1.level2.circular).toBeUndefined()
		})

		it("should handle arrays", () => {
			const obj = { items: [1, 2, 3], nested: [{ a: 1 }, { b: 2 }] }
			const result = stringifySafe(obj)
			const parsed = JSON.parse(result)

			expect(parsed).toEqual(obj)
		})

		it("should handle null and undefined values", () => {
			const obj = { nullValue: null, undefinedValue: undefined, zero: 0 }
			const result = stringifySafe(obj)
			const parsed = JSON.parse(result)

			expect(parsed.nullValue).toBeNull()
			expect(parsed.undefinedValue).toBeUndefined()
			expect(parsed.zero).toBe(0)
		})

		it("should format with indentation", () => {
			const obj = { name: "test" }
			const result = stringifySafe(obj)

			expect(result).toContain("\n") // Should have newlines due to indentation
			expect(result).toContain("  ") // Should have spaces for indentation
		})

		it("should handle objects with functions", () => {
			const obj = {
				name: "test",
				method: function () {
					return "hello"
				},
				arrow: () => "world",
			}
			const result = stringifySafe(obj)
			const parsed = JSON.parse(result)

			expect(parsed.name).toBe("test")
			expect(parsed.method).toBeUndefined() // Functions are not serialized
			expect(parsed.arrow).toBeUndefined()
		})

		it("should handle symbols and other non-serializable types", () => {
			const obj = {
				symbol: Symbol("test"),
				string: "normal",
			}
			const result = stringifySafe(obj)
			const parsed = JSON.parse(result)

			expect(parsed.string).toBe("normal")
			expect(parsed.symbol).toBeUndefined() // Symbol won't be serialized
		})

		it("should handle BigInt with proper error handling", () => {
			const obj = {
				bigint: BigInt(123),
				string: "normal",
			}

			// BigInt throws an error in JSON.stringify, so we expect the function to handle it
			expect(() => stringifySafe(obj)).toThrow()
		})
	})
})
