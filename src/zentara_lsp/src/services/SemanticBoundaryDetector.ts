import * as vscode from 'vscode';
import { SymbolInfo } from '../types';

export interface BoundaryResult {
	range: {
		start: { line: number; character: number };
		end: { line: number; character: number };
	};
	symbolInfo: SymbolInfo;
	method: 'document' | 'definition';
	confidence: number; // 0-1 scale
	success: boolean;
}

interface CacheEntry {
	boundary: BoundaryResult;
	timestamp: number;
}

export class SemanticBoundaryDetector {
	private cache = new Map<string, CacheEntry>();
	private readonly TTL = 30000; // 30 seconds
	private readonly MAX_SIZE = 1000;

	async detectBoundaries(
		uri: vscode.Uri,
		position: vscode.Position
	): Promise<BoundaryResult> {

		let result: BoundaryResult;
		
		try {
			result = await this.tryDocumentSymbols(uri, position);
		} catch (error) {
			console.warn('Boundary detection failed, using fallback:', error);
			result = this.createSingleLineBoundary(uri, position);
		}
		return result;
	}


	private async tryDocumentSymbols(uri: vscode.Uri, position: vscode.Position): Promise<BoundaryResult> {
		const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
			'vscode.executeDocumentSymbolProvider',
			uri
		);

		if (!symbols || symbols.length === 0) {
			throw new Error('No document symbols found');
		}

		// Find the symbol that contains the position
		const containingSymbol = this.findContainingSymbol(symbols, position);
		
		if (!containingSymbol) {
			throw new Error('No containing symbol found');
		}

		return {
			range: this.convertVscodeRange(containingSymbol.range),
			symbolInfo: {
				name: containingSymbol.name,
				kind: containingSymbol.kind,
				detail: containingSymbol.detail
			},
			method: 'document',
			confidence: 0.85,
			success: true
		};
	}


	private async extractSymbolInfo(uri: vscode.Uri, position: vscode.Position): Promise<SymbolInfo> {
		try {
			const hover = await vscode.commands.executeCommand<vscode.Hover[]>(
				'vscode.executeHoverProvider',
				uri,
				position
			);

			if (hover && hover.length > 0) {
				const hoverContent = hover[0].contents[0];
				const content = typeof hoverContent === 'string' ? hoverContent : hoverContent.value;
				
				// Extract symbol name from hover content
				const nameMatch = content.match(/(?:function|class|interface|const|let|var)\s+(\w+)/);
				const name = nameMatch ? nameMatch[1] : 'unknown';
				
				return {
					name,
					kind: vscode.SymbolKind.Function, // Default, could be improved
					detail: content.split('\n')[0] // First line as detail
				};
			}
		} catch (error) {
			console.warn('Failed to extract symbol info:', error);
		}

		return {
			name: 'unknown',
			kind: vscode.SymbolKind.Function
		};
	}

	private findContainingSymbol(symbols: vscode.DocumentSymbol[], position: vscode.Position): vscode.DocumentSymbol | null {
		for (const symbol of symbols) {
			if (symbol.range.contains(position)) {
				// Check children first for more specific match
				const childMatch = this.findContainingSymbol(symbol.children, position);
				return childMatch || symbol;
			}
		}
		return null;
	}


	private createSingleLineBoundary(uri: vscode.Uri, position: vscode.Position): BoundaryResult {
		return {
			range: {
				start: { line: position.line, character: 0 },
				end: { line: position.line, character: 1000 } // Will be trimmed by document length
			},
			symbolInfo: {
				name: 'unknown',
				kind: vscode.SymbolKind.Function
			},
			method: 'definition',
			confidence: 0.3,
			success: true
		};
	}


	private convertVscodeRange(range: vscode.Range): { start: { line: number; character: number }; end: { line: number; character: number } } {
		return {
			start: { line: range.start.line, character: range.start.character },
			end: { line: range.end.line, character: range.end.character }
		};
	}




}