import * as vscode from "vscode"
import { GetSelectionRangeParams, SelectionRange } from "../types"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"

function ensureVscodeUri(uri: string): vscode.Uri {
	if (uri.startsWith("file://")) {
		return vscode.Uri.parse(uri, true)
	}
	return vscode.Uri.file(uri)
}

function fromVscodeRange(range: vscode.Range): {
	start: { line: number; character: number }
	end: { line: number; character: number }
} {
	return {
		start: { line: range.start.line, character: range.start.character },
		end: { line: range.end.line, character: range.end.character },
	}
}

function fromVscodeSelectionRange(
	selectionRange: vscode.SelectionRange,
	depth: number = 0,
	maxDepth: number = 20,
): SelectionRange {
	// Prevent infinite recursion with depth limit
	if (depth >= maxDepth) {
		console.warn(`Selection range depth exceeded ${maxDepth}, stopping recursion`)
		return {
			range: fromVscodeRange(selectionRange.range),
			parent: undefined,
		}
	}

	const parent = selectionRange.parent
		? fromVscodeSelectionRange(selectionRange.parent, depth + 1, maxDepth)
		: undefined
	return {
		range: fromVscodeRange(selectionRange.range),
		parent,
	}
}

export async function getSelectionRange(params: GetSelectionRangeParams): Promise<SelectionRange[]> {
	try {
		let uri: vscode.Uri;
		let position: vscode.Position;

		// Handle legacy parameters (textDocument and position objects)
		if ('textDocument' in params && 'position' in params) {
			uri = ensureVscodeUri(params.textDocument.uri);
			position = new vscode.Position(params.position.line, params.position.character);
		}
		// Handle new unified parameters (uri, line, character, symbolName)
		else if ('uri' in params) {
			uri = ensureVscodeUri(params.uri);

			// If symbolName is provided, use getSymbol helper to resolve position
			if (params.symbolName) {
				const symbolResult = await getSymbol({
					uri: params.uri,
					line: params.line,
					character: params.character,
					symbolName: params.symbolName
				});

				if (!symbolResult.symbol) {
					console.warn('Failed to find symbol:', symbolResult.error);
					return [];
				}

				// Handle multiple matches case
				if (!symbolResult.isUnique && symbolResult.alternatives) {
					console.warn(`Multiple symbols found with name '${params.symbolName}'. Using first match. Alternatives: ${symbolResult.alternatives.length}`);
				}

				// Use the symbol's selection range start position
				position = new vscode.Position(
					symbolResult.symbol.selectionRange.start.line,
					symbolResult.symbol.selectionRange.start.character
				);
			}
			// Use provided line/character position
			else if (params.line !== undefined && params.character !== undefined) {
				position = new vscode.Position(params.line, params.character);
			} else {
				console.error("Either textDocument/position or uri with line/character or symbolName must be provided");
				return [];
			}
		} else {
			console.error("Either textDocument/position or uri must be provided");
			return [];
		}

		// Check if file exists
		try {
			await vscode.workspace.fs.stat(uri);
		} catch (error) {
			console.error(`Error: File not found - ${uri.fsPath}`);
			return [];
		}

		const selectionRanges = await vscode.commands.executeCommand<vscode.SelectionRange[]>(
			"vscode.executeSelectionRangeProvider",
			uri,
			[position],
		)

		if (!selectionRanges) {
			return []
		}

		return selectionRanges.map((sr) => fromVscodeSelectionRange(sr))
	} catch (error) {
		console.error("Error fetching selection ranges:", error)
		return []
	}
}
