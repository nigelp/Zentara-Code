import * as vscode from "vscode"
import { GetDocumentHighlightsParams, DocumentHighlight } from "../types"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"

function fromVscodeRange(range: vscode.Range): {
	start: { line: number; character: number }
	end: { line: number; character: number }
} {
	return {
		start: { line: range.start.line, character: range.start.character },
		end: { line: range.end.line, character: range.end.character },
	}
}

export async function getDocumentHighlights(params: GetDocumentHighlightsParams): Promise<DocumentHighlight[]> {
	try {
		// Use getSymbol helper to resolve symbol location
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

		// Get the position from the resolved symbol
		const uri = vscode.Uri.parse(params.uri);
		const vscodePosition = new vscode.Position(
			symbolResult.symbol.selectionRange.start.line,
			symbolResult.symbol.selectionRange.start.character
		);

		// Check if file exists
		try {
			await vscode.workspace.fs.stat(uri);
		} catch (error) {
			console.error(`Error: File not found - ${uri.fsPath}`);
			return [];
		}

		const highlights = await vscode.commands.executeCommand<vscode.DocumentHighlight[]>(
			"vscode.executeDocumentHighlights",
			uri,
			vscodePosition,
		)

		if (!highlights) {
			return []
		}

		return highlights.map((highlight) => ({
			range: fromVscodeRange(highlight.range),
			kind: highlight.kind,
		}))
	} catch (error) {
		console.error('getDocumentHighlights failed:', error);
		return [];
	}
}
