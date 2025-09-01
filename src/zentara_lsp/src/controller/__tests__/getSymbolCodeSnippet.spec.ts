// npx vitest src/zentara_lsp/src/controller/__tests__/getSymbolCodeSnippet.spec.ts

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
	SymbolCodeSnippetController,
	createSymbolCodeSnippetController,
} from "../getSymbolCodeSnippet"
import { SemanticBoundaryDetector } from "../../services/SemanticBoundaryDetector"
import * as vscode from "vscode"

vi.mock("../../services/SemanticBoundaryDetector", () => {
	const mockSemanticBoundaryDetector = {
		detectBoundaries: vi.fn(),
	}
	return {
		SemanticBoundaryDetector: vi.fn(() => mockSemanticBoundaryDetector),
	}
})
vi.mock("vscode", () => {
	const mockRange = vi.fn((startLine, startChar, endLine, endChar) => ({
		start: { line: startLine, character: startChar },
		end: { line: endLine, character: endChar },
	}))

	const mockPosition = vi.fn((line, char) => ({ line, character: char }))

	const mockTextDocument = {
		getText: vi.fn(),
		uri: { fsPath: "/test/file.ts" },
	}

	const mockWorkspace = {
		openTextDocument: vi.fn().mockResolvedValue(mockTextDocument),
	}

	return {
		Range: mockRange,
		Position: mockPosition,
		workspace: mockWorkspace,
		Uri: {
			parse: vi.fn((uri) => ({ fsPath: uri.replace("file://", "") })),
		},
	}
})

describe("SymbolCodeSnippetController", () => {
	let controller: SymbolCodeSnippetController
	let mockCallHierarchyController: any
	let mockFindUsagesController: any
	let mockSemanticBoundaryDetector: any

	beforeEach(() => {
		vi.clearAllMocks()

		mockCallHierarchyController = {
			getCallHierarchy: vi.fn(),
		}
		mockFindUsagesController = {
			findUsages: vi.fn(),
		}

		controller = createSymbolCodeSnippetController(
			mockCallHierarchyController,
			mockFindUsagesController,
		)

		mockSemanticBoundaryDetector = new (vi.mocked(SemanticBoundaryDetector))()
	})

	it("should return code snippet with call hierarchy and usages", async () => {
		const params = {
			uri: "file:///test/file.ts",
			line: 10,
			character: 5,
		}

		const boundaryResult = {
			range: new vscode.Range(10, 0, 12, 1),
			symbolInfo: { name: "testFunction", kind: 12 },
			method: "test-method",
			success: true,
			confidence: 0.9,
		}

		const codeSnippet = "function testFunction() {\n  return true;\n}"
		;(vscode.workspace.openTextDocument as any).mockResolvedValue({
			getText: vi.fn().mockReturnValue(codeSnippet),
		})

		;(mockSemanticBoundaryDetector.detectBoundaries as any).mockResolvedValue(boundaryResult)

		const callHierarchyResult = {
			incomingCalls: "FROM_NAME | FROM_KIND | FROM_URI | FROM_RANGE | FROM_SELECTION | CALL_RANGES | EOL\n",
			outgoingCalls: "TO_NAME | TO_KIND | TO_URI | TO_RANGE | TO_SELECTION | CALL_RANGES | EOL\n"
		}
		mockCallHierarchyController.getCallHierarchy.mockResolvedValue(callHierarchyResult)

		const findUsagesResult = "URI | RANGE | PREVIEW | EOL\nfile:///test/file.ts | 10:0-12:1 | test usage | <<<"
		mockFindUsagesController.findUsages.mockResolvedValue(findUsagesResult)

		const result = await controller.getSymbolCodeSnippet(params)

		expect(result).not.toBeNull()
		expect(result?.snippet).toContain("11→function testFunction()")
		expect(result?.symbolInfo?.name).toBe("testFunction")
		expect(result?.callHierarchy).toEqual(callHierarchyResult)
		expect(result?.usages).toEqual(findUsagesResult)
		expect(mockSemanticBoundaryDetector.detectBoundaries).toHaveBeenCalledWith(
			vscode.Uri.parse(params.uri),
			expect.any(Object)
		)
	})
})