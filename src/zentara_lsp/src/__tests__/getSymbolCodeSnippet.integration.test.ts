import * as vscode from 'vscode';
import { SymbolCodeSnippetController } from '../controller/getSymbolCodeSnippet';
import { GetSymbolCodeSnippetParams } from '../types';

// Mock VSCode API
vi.mock('vscode', () => ({
    Uri: {
        parse: vi.fn()
    },
    Position: vi.fn(),
    workspace: {
        openTextDocument: vi.fn()
    },
    commands: {
        executeCommand: vi.fn()
    },
    SymbolKind: {
        Function: 11,
        Class: 4,
        Variable: 13,
        Method: 5
    },
    Range: vi.fn()
}));

describe('SymbolCodeSnippetController Integration', () => {
    let controller: SymbolCodeSnippetController;
    const mockCallHierarchyController = {
        getCallHierarchy: vi.fn()
    };
    const mockFindUsagesController = {
        findUsages: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        controller = new SymbolCodeSnippetController(
            mockCallHierarchyController,
            mockFindUsagesController
        );

        // Setup basic mocks
        (vscode.Uri.parse as any).mockReturnValue({ toString: () => 'file:///test/file.ts' });
        (vscode.Position as any).mockImplementation((line: number, char: number) => ({ line, character: char }));
        
        const mockDocument = {
            lineCount: 100,
            lineAt: vi.fn().mockReturnValue({ text: 'function testFunction() {' })
        };
        (vscode.workspace.openTextDocument as any).mockResolvedValue(mockDocument);
    });

    describe('Position-based lookup (backward compatibility)', () => {
        it('should work with traditional line/character parameters', async () => {
            // Mock document symbols
            const mockSymbol = {
                name: 'testFunction',
                kind: 11,
                range: {
                    start: { line: 10, character: 0 },
                    end: { line: 15, character: 1 }
                },
                selectionRange: {
                    start: { line: 10, character: 9 },
                    end: { line: 10, character: 21 }
                },
                children: []
            };

            (vscode.commands.executeCommand as any).mockResolvedValue([mockSymbol]);

            // Mock boundary detector
            const mockBoundaryDetector = {
                detectBoundaries: vi.fn().mockResolvedValue({
                    success: true,
                    range: { start: { line: 10, character: 0 }, end: { line: 15, character: 1 } },
                    method: 'document',
                    symbolInfo: { name: 'testFunction', kind: 11 }
                })
            };
            (controller as any).boundaryDetector = mockBoundaryDetector;

            // Mock enrichment controllers
            mockCallHierarchyController.getCallHierarchy.mockResolvedValue({
                incomingCalls: 'test incoming',
                outgoingCalls: 'test outgoing'
            });
            mockFindUsagesController.findUsages.mockResolvedValue('test usages');

            const params: GetSymbolCodeSnippetParams = {
                uri: 'file:///test/file.ts',
                line: 10,
                character: 9,
                includeCallHierarchy: false,
                includeUsages: false
            };

            const result = await controller.getSymbolCodeSnippet(params);

            expect(result).not.toBeNull();
            expect(result?.snippet).toBeDefined();
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
                'vscode.executeDocumentSymbolProvider',
                expect.any(Object)
            );
        });
    });

    describe('Name-based lookup (new functionality)', () => {
        it('should work with symbolName parameter', async () => {
            // Mock document symbols
            const mockSymbol = {
                name: 'testFunction',
                kind: 11,
                range: {
                    start: { line: 10, character: 0 },
                    end: { line: 15, character: 1 }
                },
                selectionRange: {
                    start: { line: 10, character: 9 },
                    end: { line: 10, character: 21 }
                },
                children: []
            };

            (vscode.commands.executeCommand as any).mockResolvedValue([mockSymbol]);

            // Mock boundary detector
            const mockBoundaryDetector = {
                detectBoundaries: vi.fn().mockResolvedValue({
                    success: true,
                    range: { start: { line: 10, character: 0 }, end: { line: 15, character: 1 } },
                    method: 'document',
                    symbolInfo: { name: 'testFunction', kind: 11 }
                })
            };
            (controller as any).boundaryDetector = mockBoundaryDetector;

            // Mock enrichment controllers
            mockCallHierarchyController.getCallHierarchy.mockResolvedValue({
                incomingCalls: 'test incoming',
                outgoingCalls: 'test outgoing'
            });
            mockFindUsagesController.findUsages.mockResolvedValue('test usages');

            const params: GetSymbolCodeSnippetParams = {
                uri: 'file:///test/file.ts',
                symbolName: 'testFunction',
                includeCallHierarchy: false,
                includeUsages: false
            };

            const result = await controller.getSymbolCodeSnippet(params);

            expect(result).not.toBeNull();
            expect(result?.snippet).toBeDefined();
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
                'vscode.executeDocumentSymbolProvider',
                expect.any(Object)
            );
            
            // Verify that the position was resolved from the symbol
            expect(mockBoundaryDetector.detectBoundaries).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    line: 10,
                    character: 9
                })
            );
        });

        it('should handle symbol not found', async () => {
            // Mock empty document symbols
            (vscode.commands.executeCommand as any).mockResolvedValue([]);

            const params: GetSymbolCodeSnippetParams = {
                uri: 'file:///test/file.ts',
                symbolName: 'nonExistentFunction'
            };

            const result = await controller.getSymbolCodeSnippet(params);

            expect(result).toBeNull();
        });

        it('should handle multiple symbols with same name', async () => {
            // Mock multiple symbols with same name
            const mockSymbol1 = {
                name: 'testFunction',
                kind: 11,
                range: {
                    start: { line: 10, character: 0 },
                    end: { line: 15, character: 1 }
                },
                selectionRange: {
                    start: { line: 10, character: 9 },
                    end: { line: 10, character: 21 }
                },
                children: []
            };

            const mockSymbol2 = {
                name: 'testFunction',
                kind: 11,
                range: {
                    start: { line: 20, character: 0 },
                    end: { line: 25, character: 1 }
                },
                selectionRange: {
                    start: { line: 20, character: 9 },
                    end: { line: 20, character: 21 }
                },
                children: []
            };

            (vscode.commands.executeCommand as any).mockResolvedValue([mockSymbol1, mockSymbol2]);

            // Mock boundary detector
            const mockBoundaryDetector = {
                detectBoundaries: vi.fn().mockResolvedValue({
                    success: true,
                    range: { start: { line: 10, character: 0 }, end: { line: 15, character: 1 } },
                    method: 'document',
                    symbolInfo: { name: 'testFunction', kind: 11 }
                })
            };
            (controller as any).boundaryDetector = mockBoundaryDetector;

            // Mock enrichment controllers
            mockCallHierarchyController.getCallHierarchy.mockResolvedValue({
                incomingCalls: 'test incoming',
                outgoingCalls: 'test outgoing'
            });
            mockFindUsagesController.findUsages.mockResolvedValue('test usages');

            const params: GetSymbolCodeSnippetParams = {
                uri: 'file:///test/file.ts',
                symbolName: 'testFunction',
                includeCallHierarchy: false,
                includeUsages: false
            };

            const result = await controller.getSymbolCodeSnippet(params);

            expect(result).not.toBeNull();
            expect(result?.snippet).toBeDefined();
            
            // Should use the first symbol found
            expect(mockBoundaryDetector.detectBoundaries).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    line: 10,
                    character: 9
                })
            );
        });
    });

    describe('Parameter validation', () => {
        it('should handle missing both position and symbolName', async () => {
            const params: GetSymbolCodeSnippetParams = {
                uri: 'file:///test/file.ts'
                // Missing both line/character and symbolName
            };

            const result = await controller.getSymbolCodeSnippet(params);

            expect(result).toBeNull();
        });
    });
});