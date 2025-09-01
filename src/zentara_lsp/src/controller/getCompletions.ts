import * as vscode from "vscode"
import { GetCompletionsParams, CompletionItem } from "../types"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"

function ensureVscodeUri(uri: string): vscode.Uri {
	if (uri.startsWith("file://")) {
		return vscode.Uri.parse(uri, true)
	}
	return vscode.Uri.file(uri)
}

export async function getCompletions(params: GetCompletionsParams): Promise<CompletionItem[]> {
	try {
		// Handle both new flattened format and legacy nested format
		let uri: string;
		let line: number;
		let character: number;
		let triggerCharacter: string | undefined;

		// Check if this is the new flattened format (has 'uri' property but not 'textDocument')
		if ('uri' in params && !('textDocument' in params)) {
			// New flattened format - use getSymbol helper to resolve symbol location
			const symbolResult = await getSymbol({
				uri: params.uri,
				line: params.line,
				character: params.character,
				symbolName: params.symbolName
			});

			if (!symbolResult.symbol) {
				console.warn('Failed to find symbol for completions:', symbolResult.error);
				return [];
			}

			// Handle multiple matches case
			if (!symbolResult.isUnique && symbolResult.alternatives) {
				console.warn(`Multiple symbols found with name '${params.symbolName}'. Using first match. Alternatives: ${symbolResult.alternatives.length}`);
			}

			// Use the resolved symbol position
			uri = params.uri;
			line = symbolResult.symbol.selectionRange.start.line;
			character = symbolResult.symbol.selectionRange.start.character;
			triggerCharacter = params.triggerCharacter;
		} else {
			// Legacy nested format for backward compatibility
			const legacyParams = params as any;
			if (!legacyParams.textDocument || !legacyParams.position) {
				console.error('Invalid parameters: missing textDocument or position');
				return [];
			}
			uri = legacyParams.textDocument.uri;
			line = legacyParams.position.line;
			character = legacyParams.position.character;
			triggerCharacter = legacyParams.triggerCharacter;
		}

		const vscodeUri = ensureVscodeUri(uri);
		const vscodePosition = new vscode.Position(line, character);

		const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
			"vscode.executeCompletionItemProvider",
			vscodeUri,
			vscodePosition,
			triggerCharacter,
		)

		if (!completions) {
			return []
		}

		return completions.items.map((item: vscode.CompletionItem) => ({
			label: typeof item.label === "string" ? item.label : item.label.label,
			kind: item.kind ?? -1, // Use a default/unknown value if kind is undefined
			detail: item.detail,
			documentation:
				typeof item.documentation === "string" ? item.documentation : JSON.stringify(item.documentation),
		}))
	} catch (error) {
		console.error("Error fetching completions:", error)
		return []
	}
}
