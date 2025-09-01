import * as vscode from "vscode"
import { GetDeclarationParams, GetDeclarationParamsLegacy, Location } from "../types"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"

function ensureVscodeUri(uri: string): vscode.Uri {
	if (uri.startsWith("file://")) {
		return vscode.Uri.parse(uri, true)
	}
	return vscode.Uri.file(uri)
}

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

/**
 * Internal function to execute declaration provider with position
 */
async function executeDeclarationProvider(uri: vscode.Uri, position: vscode.Position): Promise<Location[]> {
	try {
		const locations = await vscode.commands.executeCommand<vscode.Location[]>(
			"vscode.executeDeclarationProvider",
			uri,
			position,
		)

		if (!locations) {
			return []
		}

		return locations.map(fromVscodeLocation)
	} catch (error) {
		console.error("Error fetching declaration:", error)
		return []
	}
}

export async function getDeclaration(params: GetDeclarationParams | GetDeclarationParamsLegacy): Promise<Location[]> {
	// Handle legacy format (nested textDocument/position)
	if ('textDocument' in params && 'position' in params) {
		const { textDocument, position } = params as GetDeclarationParamsLegacy
		const uri = ensureVscodeUri(textDocument.uri)
		// LSP positions are already 0-based, no need to subtract 1
		const vscodePosition = new vscode.Position(position.line, position.character)
		
		return executeDeclarationProvider(uri, vscodePosition)
	}

	// Handle new flattened format
	const flatParams = params as GetDeclarationParams
	
	// Use getSymbol helper to resolve symbol location
	const symbolResult = await getSymbol({
		uri: flatParams.uri,
		line: flatParams.line,
		character: flatParams.character,
		symbolName: flatParams.symbolName
	});

	if (!symbolResult.symbol) {
		console.warn('Failed to find symbol:', symbolResult.error);
		return [];
	}

	// Handle multiple matches case
	if (!symbolResult.isUnique && symbolResult.alternatives) {
		console.warn(`Multiple symbols found with name '${flatParams.symbolName}'. Using first match. Alternatives: ${symbolResult.alternatives.length}`);
	}

	// Get the position from the resolved symbol
	const uri = ensureVscodeUri(flatParams.uri)
	const position = new vscode.Position(
		symbolResult.symbol.selectionRange.start.line,
		symbolResult.symbol.selectionRange.start.character
	);

	return executeDeclarationProvider(uri, position)
}
