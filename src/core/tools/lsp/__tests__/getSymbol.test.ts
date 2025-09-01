import * as vscode from 'vscode';
import { getSymbol, GetSymbolOptions, SymbolLookupResult } from '../getSymbol';

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

describe('getSymbol', () => {
    const mockUri = { toString: () => 'file:///test/file.ts' };
    const mockDocument = {
        lineCount: 100,
        lineAt: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (vscode.Uri.parse as any).mockReturnValue(mockUri);
        (vscode.workspace.openTextDocument as any).mockResolvedValue(mockDocument);
        (mockDocument.lineAt as any).mockReturnValue({ text: 'function testFunction() {' });
    });

    describe('Parameter validation', () => {
        it('should return error when URI is missing', async () => {
            const options: GetSymbolOptions = {
                uri: '',
                symbolName: 'test'
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBeNull();
            expect(result.isUnique).toBe(false);
            expect(result.error).toBe('URI is required');
        });

        it('should return error when neither position nor symbolName is provided', async () => {
            const options: GetSymbolOptions = {
                uri: 'file:///test/file.ts'
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBeNull();
            expect(result.isUnique).toBe(false);
            expect(result.error).toBe("Either 'line'/'character' or 'symbolName' must be provided");
        });

        it('should return error when only line is provided without character', async () => {
            const options: GetSymbolOptions = {
                uri: 'file:///test/file.ts',
                line: 10
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBeNull();
            expect(result.isUnique).toBe(false);
            expect(result.error).toBe("Either 'line'/'character' or 'symbolName' must be provided");
        });

        it('should return error when only character is provided without line', async () => {
            const options: GetSymbolOptions = {
                uri: 'file:///test/file.ts',
                character: 5
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBeNull();
            expect(result.isUnique).toBe(false);
            expect(result.error).toBe("Either 'line'/'character' or 'symbolName' must be provided");
        });

        it('should return error when symbolName is empty string', async () => {
            const options: GetSymbolOptions = {
                uri: 'file:///test/file.ts',
                symbolName: ''
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBeNull();
            expect(result.isUnique).toBe(false);
            expect(result.error).toBe("Either 'line'/'character' or 'symbolName' must be provided");
        });

        it('should return error when symbolName is only whitespace', async () => {
            const options: GetSymbolOptions = {
                uri: 'file:///test/file.ts',
                symbolName: '   '
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBeNull();
            expect(result.isUnique).toBe(false);
            expect(result.error).toBe("Either 'line'/'character' or 'symbolName' must be provided");
        });
    });

    describe('Position-based lookup', () => {
        const mockSymbol = {
            name: 'testFunction',
            kind: 11,
            range: {
                contains: vi.fn()
            },
            children: []
        };

        beforeEach(() => {
            (vscode.commands.executeCommand as any).mockResolvedValue([mockSymbol]);
            (vscode.Position as any).mockImplementation((line: number, char: number) => ({ line, character: char }));
        });

        it('should find symbol at valid position', async () => {
            mockSymbol.range.contains.mockReturnValue(true);

            const options: GetSymbolOptions = {
                uri: 'file:///test/file.ts',
                line: 10,
                character: 5
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBe(mockSymbol);
            expect(result.isUnique).toBe(true);
            expect(result.error).toBeUndefined();
            expect(vscode.Position).toHaveBeenCalledWith(10, 5);
        });

        it('should return error when line is out of bounds', async () => {
            const options: GetSymbolOptions = {
                uri: 'file:///test/file.ts',
                line: 150, // Beyond document.lineCount (100)
                character: 5
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBeNull();
            expect(result.isUnique).toBe(false);
            expect(result.error).toBe('Line 150 is out of bounds (document has 100 lines)');
        });

        it('should return error when character is out of bounds', async () => {
            (mockDocument.lineAt as any).mockReturnValue({ text: 'short' }); // 5 characters

            const options: GetSymbolOptions = {
                uri: 'file:///test/file.ts',
                line: 10,
                character: 10 // Beyond line length
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBeNull();
            expect(result.isUnique).toBe(false);
            expect(result.error).toBe('Character 10 is out of bounds for line 10');
        });

        it('should return error when no symbol found at position', async () => {
            mockSymbol.range.contains.mockReturnValue(false);

            const options: GetSymbolOptions = {
                uri: 'file:///test/file.ts',
                line: 10,
                character: 5
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBeNull();
            expect(result.isUnique).toBe(false);
            expect(result.error).toBe('No symbol found at position 10:5');
        });

        it('should find most specific symbol when nested', async () => {
            const parentSymbol = {
                name: 'TestClass',
                kind: 4,
                range: { contains: vi.fn().mockReturnValue(true) },
                children: [{
                    name: 'testMethod',
                    kind: 5,
                    range: { contains: vi.fn().mockReturnValue(true) },
                    children: []
                }]
            };

            (vscode.commands.executeCommand as any).mockResolvedValue([parentSymbol]);

            const options: GetSymbolOptions = {
                uri: 'file:///test/file.ts',
                line: 10,
                character: 5
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBe(parentSymbol.children[0]);
            expect(result.isUnique).toBe(true);
        });
    });

    describe('Name-based lookup', () => {
        it('should find unique symbol by name', async () => {
            const mockSymbol = {
                name: 'testFunction',
                kind: 11,
                range: {},
                children: []
            };

            (vscode.commands.executeCommand as any).mockResolvedValue([mockSymbol]);

            const options: GetSymbolOptions = {
                uri: 'file:///test/file.ts',
                symbolName: 'testFunction'
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBe(mockSymbol);
            expect(result.isUnique).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should return error when symbol name not found', async () => {
            const mockSymbol = {
                name: 'otherFunction',
                kind: 11,
                range: {},
                children: []
            };

            (vscode.commands.executeCommand as any).mockResolvedValue([mockSymbol]);

            const options: GetSymbolOptions = {
                uri: 'file:///test/file.ts',
                symbolName: 'nonExistentFunction'
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBeNull();
            expect(result.isUnique).toBe(false);
            expect(result.error).toBe("No symbol named 'nonExistentFunction' found in document");
        });

        it('should handle multiple symbols with same name', async () => {
            const symbol1 = {
                name: 'testFunction',
                kind: 11,
                range: {},
                children: []
            };

            const symbol2 = {
                name: 'testFunction',
                kind: 11,
                range: {},
                children: []
            };

            (vscode.commands.executeCommand as any).mockResolvedValue([symbol1, symbol2]);

            const options: GetSymbolOptions = {
                uri: 'file:///test/file.ts',
                symbolName: 'testFunction'
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBe(symbol1); // First match
            expect(result.isUnique).toBe(false);
            expect(result.alternatives).toEqual([symbol1, symbol2]);
            expect(result.error).toBeUndefined();
        });

        it('should find symbol in nested children', async () => {
            const parentSymbol = {
                name: 'TestClass',
                kind: 4,
                range: {},
                children: [{
                    name: 'testMethod',
                    kind: 5,
                    range: {},
                    children: []
                }]
            };

            (vscode.commands.executeCommand as any).mockResolvedValue([parentSymbol]);

            const options: GetSymbolOptions = {
                uri: 'file:///test/file.ts',
                symbolName: 'testMethod'
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBe(parentSymbol.children[0]);
            expect(result.isUnique).toBe(true);
        });
    });

    describe('Error handling', () => {
        it('should handle document opening failure', async () => {
            (vscode.workspace.openTextDocument as any).mockRejectedValue(new Error('File not found'));

            const options: GetSymbolOptions = {
                uri: 'file:///nonexistent/file.ts',
                symbolName: 'test'
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBeNull();
            expect(result.isUnique).toBe(false);
            expect(result.error).toBe('Symbol lookup failed: File not found');
        });

        it('should handle LSP command failure', async () => {
            (vscode.commands.executeCommand as any).mockRejectedValue(new Error('LSP not available'));

            const options: GetSymbolOptions = {
                uri: 'file:///test/file.ts',
                symbolName: 'test'
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBeNull();
            expect(result.isUnique).toBe(false);
            expect(result.error).toBe('Symbol lookup failed: LSP not available');
        });

        it('should handle empty symbols array', async () => {
            (vscode.commands.executeCommand as any).mockResolvedValue([]);

            const options: GetSymbolOptions = {
                uri: 'file:///test/file.ts',
                symbolName: 'test'
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBeNull();
            expect(result.isUnique).toBe(false);
            expect(result.error).toBe('No symbols found in document');
        });

        it('should handle null symbols response', async () => {
            (vscode.commands.executeCommand as any).mockResolvedValue(null);

            const options: GetSymbolOptions = {
                uri: 'file:///test/file.ts',
                symbolName: 'test'
            };

            const result = await getSymbol(options);

            expect(result.symbol).toBeNull();
            expect(result.isUnique).toBe(false);
            expect(result.error).toBe('No symbols found in document');
        });
    });
});