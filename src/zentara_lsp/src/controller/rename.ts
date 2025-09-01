import * as vscode from "vscode"
import { RenameParams, WorkspaceEdit } from "../types"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"

function ensureVscodeUri(uri: string): vscode.Uri {
	if (uri.startsWith("file://")) {
		return vscode.Uri.parse(uri, true)
	}
	return vscode.Uri.file(uri)
}

export async function rename(params: RenameParams): Promise<{ success: boolean; content?: string }> {
	try {
		// Handle both new flattened format and legacy nested format
		let uri: vscode.Uri;
		let vscodePosition: vscode.Position;
		let newName: string;

		// Check if this is the new flattened format
		if ('uri' in params && params.uri) {
			// New flattened format - use getSymbol helper to resolve symbol location
			const symbolResult = await getSymbol({
				uri: params.uri,
				line: params.line,
				character: params.character,
				symbolName: params.symbolName
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
				console.warn(`Multiple symbols found with name '${params.symbolName}'. Using first match. Alternatives: ${symbolResult.alternatives.length}`);
			}

			// Get the position from the resolved symbol
			uri = vscode.Uri.parse(params.uri);
			vscodePosition = new vscode.Position(
				symbolResult.symbol.selectionRange.start.line,
				symbolResult.symbol.selectionRange.start.character
			);
			newName = params.newName;
		} else {
			// Legacy format with textDocument and position
			uri = ensureVscodeUri(params.textDocument.uri);
			vscodePosition = new vscode.Position(params.position.line, params.position.character);
			newName = params.newName;
		}

		console.log(`[RENAME DIAGNOSTIC] Starting rename operation:`)
		console.log(`[RENAME DIAGNOSTIC] - URI: ${uri.toString()}`)
		console.log(`[RENAME DIAGNOSTIC] - Position: line ${vscodePosition.line}, character ${vscodePosition.character}`)
		console.log(`[RENAME DIAGNOSTIC] - New name: ${newName}`)
		console.log(`[RENAME DIAGNOSTIC] - File exists: ${require("fs").existsSync(uri.fsPath)}`)
		console.log(`[RENAME DIAGNOSTIC] - Using format: ${'uri' in params ? 'flattened' : 'legacy'}`)

		// Check if document is open
		const openDocs = vscode.workspace.textDocuments.map((doc) => doc.uri.toString())
		console.log(`[RENAME DIAGNOSTIC] - Document is open: ${openDocs.includes(uri.toString())}`)
		console.log(`[RENAME DIAGNOSTIC] - Open documents: ${openDocs.length}`)

		// Try using the rename provider command first
		// Note: In some test environments, this command might not be available
		console.log("[RENAME DIAGNOSTIC] Attempting to use VSCode rename provider command")
		let workspaceEdit: vscode.WorkspaceEdit | undefined

		try {
			workspaceEdit = await vscode.commands.executeCommand<vscode.WorkspaceEdit | undefined>(
				"vscode.executeDocumentRenameProvider",
				uri,
				vscodePosition,
				newName,
			)
			console.log(
				`[RENAME DIAGNOSTIC] Rename provider returned:`,
				workspaceEdit ? "WorkspaceEdit object" : "undefined/null",
			)
		} catch (error) {
			console.error(`[RENAME DIAGNOSTIC] Error calling rename provider:`, error)
			return {
				success: false,
				content: `Error calling rename provider: ${error instanceof Error ? error.message : String(error)}`,
			}
		}

		if (workspaceEdit) {
			const success = await vscode.workspace.applyEdit(workspaceEdit)

			// Force save all modified documents
			console.log("[RENAME DIAGNOSTIC] apply edit success:", success)
			if (success) {
				const save_success = await vscode.workspace.saveAll()
				console.log("[RENAME DIAGNOSTIC] save all success:", save_success)
				if (save_success) {
					return { success: true }
				} else {
					return {
						success: false,
						content: "Failed to save changes to disk after applying workspace edit for rename operation",
					}
				}
			} else {
				return {
					success: false,
					content: "Failed to apply workspace edit for rename operation",
				}
			}
		} else {
			console.log("[RENAME DIAGNOSTIC] Rename operation failed due to no workspace edit returned")
			return {
				success: false,
				content: `No rename provider available or no renameable symbol found at position line:${vscodePosition.line}, character:${vscodePosition.character} in file:${uri.toString()}`,
			}
		}
	} catch (error) {
		console.error('rename failed:', error);
		return {
			success: false,
			content: `Error occurred during symbol lookup: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}
