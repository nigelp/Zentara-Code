import { ReplaceSymbolBodyParams, ReplaceSymbolBodyParamsLegacy, WorkspaceEdit, TextEdit } from "../types"
import * as vscode from "vscode"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"

// Legacy function for backward compatibility
export async function replaceSymbolBodyLegacy(params: ReplaceSymbolBodyParamsLegacy): Promise<WorkspaceEdit | null> {
	const { textDocument, position, replacement } = params

	try {
		// Use getSymbol helper to get the symbol at the position
		const symbolResult = await getSymbol({
			uri: textDocument.uri,
			line: position.line,
			character: position.character
		});

		if (!symbolResult.symbol) {
			console.warn('Failed to find symbol:', symbolResult.error);
			return null;
		}

		const uri = vscode.Uri.parse(textDocument.uri);
		const edit = new vscode.WorkspaceEdit();
		
		// Use the symbol's range for replacement
		const range = new vscode.Range(
			new vscode.Position(symbolResult.symbol.range.start.line, symbolResult.symbol.range.start.character),
			new vscode.Position(symbolResult.symbol.range.end.line, symbolResult.symbol.range.end.character),
		);
		
		edit.replace(uri, range, replacement);
		const success = await vscode.workspace.applyEdit(edit);

		// Save the modified document
		const document = await vscode.workspace.openTextDocument(uri);
		if (document.isDirty) {
			await document.save();
		}

		const workspaceEdit: WorkspaceEdit = {
			changes: {
				[textDocument.uri]: [{
					range: {
						start: { line: symbolResult.symbol.range.start.line, character: symbolResult.symbol.range.start.character },
						end: { line: symbolResult.symbol.range.end.line, character: symbolResult.symbol.range.end.character },
					},
					newText: replacement,
				}]
			},
		};

		return workspaceEdit;
	} catch (error) {
		console.error("Error replacing symbol body:", error);
		return null;
	}
}

export async function replaceSymbolBody(params: ReplaceSymbolBodyParams): Promise<WorkspaceEdit | null> {
	const { uri, line, character, symbolName, replacement } = params;

	try {
		// Use getSymbol helper to resolve symbol location
		const symbolResult = await getSymbol({
			uri,
			line,
			character,
			symbolName
		});

		if (!symbolResult.symbol) {
			console.warn('Failed to find symbol:', symbolResult.error);
			return null;
		}

		// Handle multiple matches case
		if (!symbolResult.isUnique && symbolResult.alternatives) {
			console.warn(`Multiple symbols found with name '${symbolName}'. Using first match. Alternatives: ${symbolResult.alternatives.length}`);
		}

		const vscodeUri = vscode.Uri.parse(uri);
		const edit = new vscode.WorkspaceEdit();
		
		// Use the symbol's range for replacement
		const range = new vscode.Range(
			new vscode.Position(symbolResult.symbol.range.start.line, symbolResult.symbol.range.start.character),
			new vscode.Position(symbolResult.symbol.range.end.line, symbolResult.symbol.range.end.character),
		);
		
		edit.replace(vscodeUri, range, replacement);
		const success = await vscode.workspace.applyEdit(edit);

		// Save the modified document
		const document = await vscode.workspace.openTextDocument(vscodeUri);
		if (document.isDirty) {
			await document.save();
		}

		const workspaceEdit: WorkspaceEdit = {
			changes: {
				[uri]: [{
					range: {
						start: { line: symbolResult.symbol.range.start.line, character: symbolResult.symbol.range.start.character },
						end: { line: symbolResult.symbol.range.end.line, character: symbolResult.symbol.range.end.character },
					},
					newText: replacement,
				}]
			},
		};

		return workspaceEdit;
	} catch (error) {
		console.error("Error replacing symbol body:", error);
		return null;
	}
}
