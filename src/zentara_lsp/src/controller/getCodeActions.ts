import * as vscode from "vscode"
import { GetCodeActionsParams, CodeAction } from "../types"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"

function ensureVscodeUri(uri: string): vscode.Uri {
	if (uri.startsWith("file://")) {
		return vscode.Uri.parse(uri, true)
	}
	return vscode.Uri.file(uri)
}

export async function getCodeActions(params: GetCodeActionsParams): Promise<CodeAction[]> {
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
		const range = new vscode.Range(
			new vscode.Position(symbolResult.symbol.selectionRange.start.line, symbolResult.symbol.selectionRange.start.character),
			new vscode.Position(symbolResult.symbol.selectionRange.end.line, symbolResult.symbol.selectionRange.end.character),
		)

		try {
			const codeActions = await vscode.commands.executeCommand<(vscode.Command | vscode.CodeAction)[]>(
				"vscode.executeCodeActionProvider",
				uri,
				range,
			)

			if (!codeActions) {
				return []
			}

			return codeActions.map((action) => {
				let commandString: string | undefined
				if (action.command) {
					if (typeof action.command === "string") {
						commandString = action.command
					} else {
						commandString = action.command.command
					}
				}

				return {
					title: action.title,
					kind: (action as any).kind?.value || (action as any).kind,
					command: commandString,
				}
			})
		} catch (error) {
			console.error("Error fetching code actions:", error)
			return []
		}
	} catch (error) {
		console.error('getCodeActions failed:', error);
		return [];
	}
}
