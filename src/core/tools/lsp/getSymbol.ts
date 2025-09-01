import * as vscode from 'vscode';

/**
 * Represents the result of a symbol lookup operation
 */
export interface SymbolLookupResult {
    /** The found symbol object, null if not found */
    symbol: vscode.DocumentSymbol | null;
    /** True if only one symbol with the given name was found */
    isUnique: boolean;
    /** List of alternative symbols if not unique */
    alternatives?: vscode.DocumentSymbol[];
    /** Error message if lookup fails */
    error?: string;
}

/**
 * Options for symbol lookup
 */
export interface GetSymbolOptions {
    /** File URI to search in */
    uri: string;
    /** Symbol name to search for (optional) */
    symbolName?: string;
    /** Line number for position-based lookup (0-based, optional) */
    line?: number;
    /** Character position for position-based lookup (0-based, optional) */
    character?: number;
}

/**
 * Recursively searches for symbols by name in a symbol tree
 * @param symbols Array of document symbols to search
 * @param targetName Name of the symbol to find
 * @param matches Array to collect matching symbols
 */
function findSymbolsByName(
    symbols: vscode.DocumentSymbol[],
    targetName: string,
    matches: vscode.DocumentSymbol[] = []
): vscode.DocumentSymbol[] {
    for (const symbol of symbols) {
        // Check if this symbol matches the target name
        if (symbol.name === targetName) {
            matches.push(symbol);
        }
        
        // Recursively search children if they exist
        if (symbol.children && symbol.children.length > 0) {
            findSymbolsByName(symbol.children, targetName, matches);
        }
    }
    
    return matches;
}

/**
 * Finds a symbol at a specific position in the document
 * @param symbols Array of document symbols to search
 * @param position Target position
 * @returns The symbol at the position, or null if not found
 */
function findSymbolAtPosition(
    symbols: vscode.DocumentSymbol[],
    position: vscode.Position
): vscode.DocumentSymbol | null {
    for (const symbol of symbols) {
        // Check if the position is within this symbol's range
        if (symbol.range.contains(position)) {
            // First check if any child symbol contains the position (more specific)
            if (symbol.children && symbol.children.length > 0) {
                const childSymbol = findSymbolAtPosition(symbol.children, position);
                if (childSymbol) {
                    return childSymbol;
                }
            }
            
            // If no child contains the position, this symbol is the match
            return symbol;
        }
    }
    
    return null;
}

/**
 * Central symbol lookup function that supports both position-based and name-based lookups
 * @param options Lookup options containing either position or symbol name
 * @returns Promise resolving to symbol lookup result
 */
export async function getSymbol(options: GetSymbolOptions): Promise<SymbolLookupResult> {
    try {
        // Validate input parameters
        if (!options.uri) {
            return {
                symbol: null,
                isUnique: false,
                error: 'URI is required'
            };
        }

        // Ensure either position or symbol name is provided
        const hasPosition = options.line !== undefined && options.character !== undefined;
        const hasSymbolName = options.symbolName !== undefined && options.symbolName.trim() !== '';
        
        if (!hasPosition && !hasSymbolName) {
            return {
                symbol: null,
                isUnique: false,
                error: "Either 'line'/'character' or 'symbolName' must be provided"
            };
        }

        // Parse the URI and get the document
        const uri = vscode.Uri.parse(options.uri);
        const document = await vscode.workspace.openTextDocument(uri);
        
        // Get document symbols using VSCode's DocumentSymbolProvider
        const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            uri
        );

        if (!symbols || symbols.length === 0) {
            return {
                symbol: null,
                isUnique: false,
                error: 'No symbols found in document'
            };
        }

        // Handle position-based lookup
        if (hasPosition) {
            const position = new vscode.Position(options.line!, options.character!);
            
            // Validate position is within document bounds
            if (position.line >= document.lineCount) {
                return {
                    symbol: null,
                    isUnique: false,
                    error: `Line ${options.line} is out of bounds (document has ${document.lineCount} lines)`
                };
            }
            
            const lineText = document.lineAt(position.line).text;
            if (position.character >= lineText.length) {
                return {
                    symbol: null,
                    isUnique: false,
                    error: `Character ${options.character} is out of bounds for line ${options.line}`
                };
            }

            const symbol = findSymbolAtPosition(symbols, position);
            
            if (!symbol) {
                return {
                    symbol: null,
                    isUnique: false,
                    error: `No symbol found at position ${options.line}:${options.character}`
                };
            }

            return {
                symbol,
                isUnique: true
            };
        }

        // Handle name-based lookup
        if (hasSymbolName) {
            const matches = findSymbolsByName(symbols, options.symbolName!);
            
            if (matches.length === 0) {
                return {
                    symbol: null,
                    isUnique: false,
                    error: `No symbol named '${options.symbolName}' found in document`
                };
            }
            
            if (matches.length === 1) {
                return {
                    symbol: matches[0],
                    isUnique: true
                };
            }
            
            // Multiple matches found
            return {
                symbol: matches[0], // Return the first match as the primary result
                isUnique: false,
                alternatives: matches
            };
        }

        // This should never be reached due to earlier validation
        return {
            symbol: null,
            isUnique: false,
            error: 'Invalid lookup parameters'
        };

    } catch (error) {
        return {
            symbol: null,
            isUnique: false,
            error: `Symbol lookup failed: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}