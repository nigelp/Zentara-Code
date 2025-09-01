import * as vscode from "vscode"
import { GetTypeDefinitionParams, Location } from "../types"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"

function fromVscodeLocation(location: vscode.Location): Location {
	return {
		uri: location.uri.toString(),
		range: {
			start: { line: location.range.start.line, character: location.range.start.character },
			end: { line: location.range.end.line, character: location.range.end.character },
		},
		preview: "", // preview is a required field
	}
}

export async function getTypeDefinition(params: GetTypeDefinitionParams): Promise<Location[]> {
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

		const locations = await vscode.commands.executeCommand<vscode.Location[]>(
			"vscode.executeTypeDefinitionProvider",
			uri,
			vscodePosition,
		)

		if (!locations) {
			return []
		}

		return locations.map(fromVscodeLocation)
	} catch (error) {
		console.error('getTypeDefinition failed:', error);
		return [];
	}
}
