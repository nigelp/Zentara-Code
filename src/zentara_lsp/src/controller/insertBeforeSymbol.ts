import { InsertBeforeSymbolParams, InsertBeforeSymbolParamsLegacy, WorkspaceEdit, TextEdit } from "../types"
import * as vscode from "vscode"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"
import { goToDefinition } from "./goToDefinition"

export async function insertBeforeSymbol(
	params: InsertBeforeSymbolParams | InsertBeforeSymbolParamsLegacy,
): Promise<{ success: boolean; content?: string }> {
	try {
		// Handle legacy format (has 'textDocument' and 'position' properties)
		if ('textDocument' in params && 'position' in params) {
			const legacyParams = params as InsertBeforeSymbolParamsLegacy;
			const { textDocument, position, content } = legacyParams;

			console.log(
				`🔍 DIAGNOSTIC: insertBeforeSymbol called with position line:${position.line}, character:${position.character} in file:${textDocument.uri}`,
			);
			const locations = await goToDefinition({ textDocument, position });
			console.log(`🔍 DIAGNOSTIC: goToDefinition returned ${locations?.length || 0} locations:`, locations);

			if (!locations || locations.length === 0) {
				console.log(`🔍 DIAGNOSTIC: No symbol definition found, this is likely the root cause of failure`);
				return {
					success: false,
					content: `No symbol definition found at position line:${position.line}, character:${position.character} in file:${textDocument.uri}`,
				};
			}

			const edit = new vscode.WorkspaceEdit();
			for (const loc of locations) {
				const uri = vscode.Uri.parse(loc.uri);
				const insertPosition = new vscode.Position(loc.range.start.line, loc.range.start.character);
				edit.insert(uri, insertPosition, `${content}\n`);
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
					content: "Failed to apply workspace edit to insert content before symbol",
				};
			}
		}

		// Handle new format with symbolName support
		const newParams = params as InsertBeforeSymbolParams;
		const { uri, line, character, symbolName, content } = newParams;

		// For position-based lookups, first check if there's a definition at this position
		// This mimics the legacy behavior that uses goToDefinition
		if (!symbolName && line !== undefined && character !== undefined) {
			const legacyResult = await goToDefinition({
				textDocument: { uri },
				position: { line, character }
			});
			
			if (!legacyResult || legacyResult.length === 0) {
				return {
					success: false,
					content: `No symbol definition found at position line:${line}, character:${character} in file:${uri}`
				};
			}
		}

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

		// Get the symbol's start position for insertion
		const vscodeUri = vscode.Uri.parse(uri);
		const insertPosition = new vscode.Position(
			symbolResult.symbol.range.start.line,
			symbolResult.symbol.range.start.character
		);

		const edit = new vscode.WorkspaceEdit();
		edit.insert(vscodeUri, insertPosition, `${content}\n`);

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
				content: "Failed to apply workspace edit to insert content before symbol",
			};
		}
	} catch (error) {
		console.error("Error inserting before symbol:", error);
		return {
			success: false,
			content: `Error inserting before symbol: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
}
