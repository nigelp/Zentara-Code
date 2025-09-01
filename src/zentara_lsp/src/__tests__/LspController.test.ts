import * as vscode from "vscode"
import { lspController } from "../LspController"
import {
	FindUsagesParams,
	GoToDefinitionParams,
	GetDocumentSymbolsParams,
	GetHoverInfoParams,
	RenameParams,
	GetCompletionsParams,
	GetSymbolsParams,
	InsertAfterSymbolParams,
} from "../types"

// Mock the controller functions
jest.mock("../controller/findUsages")
jest.mock("../controller/goToDefinition")
jest.mock("../controller/getDocumentSymbols")
jest.mock("../controller/getHoverInfo")
jest.mock("../controller/rename")
jest.mock("../controller/getCompletions")
jest.mock("../controller/search_symbols")
jest.mock("../controller/insertAfterSymbol")
jest.mock("../logging")

import { findUsages } from "../controller/findUsages"
import { goToDefinition } from "../controller/goToDefinition"
import { getDocumentSymbols } from "../controller/getDocumentSymbols"
import { getHoverInfo } from "../controller/getHoverInfo"
import { rename } from "../controller/rename"
import { getCompletions } from "../controller/getCompletions"
import { getSymbols } from "../controller/search_symbols"
import { insertAfterSymbol } from "../controller/insertAfterSymbol"
import { logInfo, logError } from "../logging"

describe("LspController", () => {
	beforeEach(() => {
		jest.resetAllMocks()
	})

	describe("findUsages", () => {
		it("should call findUsages logic and return results", async () => {
			// Arrange
			const params: FindUsagesParams = {
				textDocument: { uri: "file:///test.ts" },
				position: { line: 1, character: 5 },
			}
			const mockReferences = [
				{
					uri: "file:///test.ts",
					range: { start: { line: 10, character: 4 }, end: { line: 10, character: 9 } },
					preview: "test",
				},
			]
			;(findUsages as jest.Mock).mockResolvedValue(mockReferences)

			// Act
			const result = await lspController.findUsages(params)

			// Assert
			expect(result).toEqual(mockReferences)
			expect(findUsages).toHaveBeenCalledWith(params)
			expect(logInfo).toHaveBeenCalled()
		})

		it("should handle errors in findUsages", async () => {
			// Arrange
			const params: FindUsagesParams = {
				textDocument: { uri: "file:///test.ts" },
				position: { line: 1, character: 5 },
			}
			const error = new Error("Test error")
			;(findUsages as jest.Mock).mockRejectedValue(error)

			// Act & Assert
			await expect(lspController.findUsages(params)).rejects.toThrow("Test error")
			expect(logError).toHaveBeenCalledWith("Error in findUsages", error)
		})
	})

	describe("goToDefinition", () => {
		it("should call goToDefinition logic and return results", async () => {
			// Arrange
			const params: GoToDefinitionParams = {
				textDocument: { uri: "file:///test.ts" },
				position: { line: 1, character: 5 },
			}
			const mockLocations = [
				{
					uri: "file:///definition.ts",
					range: { start: { line: 5, character: 0 }, end: { line: 5, character: 10 } },
				},
			]
			;(goToDefinition as jest.Mock).mockResolvedValue(mockLocations)

			// Act
			const result = await lspController.goToDefinition(params)

			// Assert
			expect(result).toEqual(mockLocations)
			expect(goToDefinition).toHaveBeenCalledWith(params)
			expect(logInfo).toHaveBeenCalled()
		})

		it("should handle errors in goToDefinition", async () => {
			// Arrange
			const params: GoToDefinitionParams = {
				textDocument: { uri: "file:///test.ts" },
				position: { line: 1, character: 5 },
			}
			const error = new Error("Definition not found")
			;(goToDefinition as jest.Mock).mockRejectedValue(error)

			// Act & Assert
			await expect(lspController.goToDefinition(params)).rejects.toThrow("Definition not found")
			expect(logError).toHaveBeenCalledWith("Error in goToDefinition", error)
		})
	})

	describe("getDocumentSymbols", () => {
		it("should call getDocumentSymbols logic and return results", async () => {
			// Arrange
			const params: GetDocumentSymbolsParams = {
				textDocument: { uri: "file:///test.ts" },
			}
			const mockSymbols = [
				{
					name: "TestClass",
					kind: 4,
					range: { start: { line: 0, character: 0 }, end: { line: 10, character: 0 } },
				},
			]
			;(getDocumentSymbols as jest.Mock).mockResolvedValue(mockSymbols)

			// Act
			const result = await lspController.getDocumentSymbols(params)

			// Assert
			expect(result).toEqual(mockSymbols)
			expect(getDocumentSymbols).toHaveBeenCalledWith(params)
			expect(logInfo).toHaveBeenCalled()
		})
	})

	describe("getHoverInfo", () => {
		it("should call getHoverInfo logic and return results", async () => {
			// Arrange
			const params: GetHoverInfoParams = {
				textDocument: { uri: "file:///test.ts" },
				position: { line: 1, character: 5 },
			}
			const mockHover = {
				contents: "Function documentation",
				range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } },
			}
			;(getHoverInfo as jest.Mock).mockResolvedValue(mockHover)

			// Act
			const result = await lspController.getHoverInfo(params)

			// Assert
			expect(result).toEqual(mockHover)
			expect(getHoverInfo).toHaveBeenCalledWith(params)
			expect(logInfo).toHaveBeenCalled()
		})

		it("should handle null hover info", async () => {
			// Arrange
			const params: GetHoverInfoParams = {
				textDocument: { uri: "file:///test.ts" },
				position: { line: 1, character: 5 },
			}
			;(getHoverInfo as jest.Mock).mockResolvedValue(null)

			// Act
			const result = await lspController.getHoverInfo(params)

			// Assert
			expect(result).toBeNull()
			expect(getHoverInfo).toHaveBeenCalledWith(params)
		})
	})

	describe("rename", () => {
		it("should call rename logic and return workspace edit", async () => {
			// Arrange
			const params: RenameParams = {
				textDocument: { uri: "file:///test.ts" },
				position: { line: 1, character: 5 },
				newName: "newVariableName",
			}
			const mockEdit = {
				changes: {
					"file:///test.ts": [
						{
							range: { start: { line: 1, character: 5 }, end: { line: 1, character: 10 } },
							newText: "newVariableName",
						},
					],
				},
			}
			;(rename as jest.Mock).mockResolvedValue(mockEdit)

			// Act
			const result = await lspController.rename(params)

			// Assert
			expect(result).toEqual(mockEdit)
			expect(rename).toHaveBeenCalledWith(params)
			expect(logInfo).toHaveBeenCalled()
		})
	})

	describe("getCompletions", () => {
		it("should call getCompletions logic and return results", async () => {
			// Arrange
			const params: GetCompletionsParams = {
				textDocument: { uri: "file:///test.ts" },
				position: { line: 1, character: 5 },
			}
			const mockCompletions = [
				{ label: "console", kind: 1, detail: "Console API" },
				{ label: "log", kind: 2, detail: "Log method" },
			]
			;(getCompletions as jest.Mock).mockResolvedValue(mockCompletions)

			// Act
			const result = await lspController.getCompletions(params)

			// Assert
			expect(result).toEqual(mockCompletions)
			expect(getCompletions).toHaveBeenCalledWith(params)
			expect(logInfo).toHaveBeenCalled()
		})
	})

	describe("getSymbols", () => {
		it("should call getSymbols logic and return results", async () => {
			// Arrange
			const params: GetSymbolsParams = {
				name_path: "TestClass/testMethod",
			}
			const mockSymbols = [
				{
					name: "testMethod",
					kind: 5,
					location: {
						uri: "file:///test.ts",
						range: { start: { line: 5, character: 0 }, end: { line: 7, character: 0 } },
					},
					name_path: "TestClass/testMethod",
				},
			]
			;(getSymbols as jest.Mock).mockResolvedValue(mockSymbols)

			// Act
			const result = await lspController.getSymbols(params)

			// Assert
			expect(result).toEqual(mockSymbols)
			expect(getSymbols).toHaveBeenCalledWith(params)
			expect(logInfo).toHaveBeenCalled()
		})
	})

	describe("insertAfterSymbol", () => {
		it("should call insertAfterSymbol logic and return workspace edit", async () => {
			// Arrange
			const params: InsertAfterSymbolParams = {
				textDocument: { uri: "file:///test.ts" },
				position: { line: 5, character: 0 },
				symbolName: "testMethod",
				newText: "\n    newMethod() { return true; }",
			}
			const mockEdit = {
				changes: {
					"file:///test.ts": [
						{
							range: { start: { line: 7, character: 0 }, end: { line: 7, character: 0 } },
							newText: "\n    newMethod() { return true; }",
						},
					],
				},
			}
			;(insertAfterSymbol as jest.Mock).mockResolvedValue(mockEdit)

			// Act
			const result = await lspController.insertAfterSymbol(params)

			// Assert
			expect(result).toEqual(mockEdit)
			expect(insertAfterSymbol).toHaveBeenCalledWith(params)
			expect(logInfo).toHaveBeenCalled()
		})

		it("should handle errors in insertAfterSymbol", async () => {
			// Arrange
			const params: InsertAfterSymbolParams = {
				textDocument: { uri: "file:///test.ts" },
				position: { line: 5, character: 0 },
				symbolName: "testMethod",
				newText: "\n    newMethod() { return true; }",
			}
			const error = new Error("Symbol not found")
			;(insertAfterSymbol as jest.Mock).mockRejectedValue(error)

			// Act & Assert
			await expect(lspController.insertAfterSymbol(params)).rejects.toThrow("Symbol not found")
			expect(logError).toHaveBeenCalledWith("Error in insertAfterSymbol", error)
		})
	})
})
