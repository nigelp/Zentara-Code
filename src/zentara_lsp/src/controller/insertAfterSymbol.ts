import { InsertAfterSymbolParams, InsertAfterSymbolParamsLegacy, WorkspaceEdit, TextEdit } from "../types"
import * as vscode from "vscode"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"
import { goToDefinition } from "./goToDefinition"

export async function insertAfterSymbol(
	params: InsertAfterSymbolParams | InsertAfterSymbolParamsLegacy,
): Promise<{ success: boolean; content?: string }> {
	try {
		// Handle legacy format
		if ('textDocument' in params && 'position' in params) {
			const legacyParams = params as InsertAfterSymbolParamsLegacy;
			const { textDocument, position, content } = legacyParams;

			const locations = await goToDefinition({ textDocument, position });

			if (!locations || locations.length === 0) {
				return {
					success: false,
					content: `No symbol definition found at position line:${position.line}, character:${position.character} in file:${textDocument.uri}`,
				};
			}

			const edit = new vscode.WorkspaceEdit();
			for (const loc of locations) {
				const uri = vscode.Uri.parse(loc.uri);
				const insertPosition = new vscode.Position(loc.range.end.line, loc.range.end.character);
				edit.insert(uri, insertPosition, `\n${content}`);
			}

			const success = await vscode.workspace.applyEdit(edit);

			// Force save all modified documents
			if (success) {
				const save_success = await vscode.workspace.saveAll();
				if (save_success) {
					return { success: true };
				} else {
					return {
						success: false,
						content: "Failed to save changes to disk after applying workspace edit",
					};
				}
			} else {
				return {
					success: false,
					content: "Failed to apply workspace edit to insert content after symbol",
				};
			}
		}

		// Handle new format with symbolName support
		const newParams = params as InsertAfterSymbolParams;
		const { uri, line, character, symbolName, content } = newParams;

		// Use getSymbol helper to resolve symbol location
		const symbolResult = await getSymbol({
			uri: uri,
			line: line,
			character: character,
			symbolName: symbolName
		});

		if (!symbolResult.symbol) {
			console.warn('Failed to find symbol:', symbolResult.error);
			return {
				success: false,
				content: `Symbol not found: ${symbolResult.error}`
			};
		}

		// Handle multiple matches case
		if (!symbolResult.isUnique && symbolResult.alternatives) {
			console.warn(`Multiple symbols found with name '${symbolName}'. Using first match. Alternatives: ${symbolResult.alternatives.length}`);
		}

		// Get the symbol's end position for insertion
		const vscodeUri = vscode.Uri.parse(uri);
		const insertPosition = new vscode.Position(
			symbolResult.symbol.range.end.line,
			symbolResult.symbol.range.end.character
		);

		const edit = new vscode.WorkspaceEdit();
		edit.insert(vscodeUri, insertPosition, `\n${content}`);

		const success = await vscode.workspace.applyEdit(edit);

		// Force save all modified documents
		if (success) {
			const save_success = await vscode.workspace.saveAll();
			if (save_success) {
				return { success: true };
			} else {
				return {
					success: false,
					content: "Failed to save changes to disk after applying workspace edit",
				};
			}
		} else {
			return {
				success: false,
				content: "Failed to apply workspace edit to insert content after symbol",
			};
		}
	} catch (error) {
		console.error("Error inserting after symbol:", error);
		return {
			success: false,
			content: `Error inserting after symbol: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}
