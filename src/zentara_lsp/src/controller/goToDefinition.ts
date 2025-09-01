import { GoToDefinitionParams, Location } from "../types"
import * as vscode from "vscode"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"

export async function goToDefinition(params: GoToDefinitionParams): Promise<Location[]> {
	// Handle both new flattened format and legacy nested format for backward compatibility
	let uri: vscode.Uri
	let pos: vscode.Position

	if ('textDocument' in params && 'position' in params) {
		// Legacy format: { textDocument: { uri }, position: { line, character } }
		const legacyParams = params as any
		uri = vscode.Uri.parse(legacyParams.textDocument.uri)
		pos = new vscode.Position(legacyParams.position.line, legacyParams.position.character)
	} else {
		// New flattened format: { uri, line?, character?, symbolName? }
		const flatParams = params as GoToDefinitionParams
		
		// Use getSymbol helper to resolve symbol location
		const symbolResult = await getSymbol({
			uri: flatParams.uri,
			line: flatParams.line,
			character: flatParams.character,
			symbolName: flatParams.symbolName
		})

		if (!symbolResult.symbol) {
			console.warn('Failed to find symbol:', symbolResult.error)
			return []
		}

		// Handle multiple matches case
		if (!symbolResult.isUnique && symbolResult.alternatives) {
			console.warn(`Multiple symbols found with name '${flatParams.symbolName}'. Using first match. Alternatives: ${symbolResult.alternatives.length}`)
		}

		// Get the position from the resolved symbol
		uri = vscode.Uri.parse(flatParams.uri)
		pos = new vscode.Position(
			symbolResult.symbol.selectionRange.start.line,
			symbolResult.symbol.selectionRange.start.character
		)
	}

	try {
		await vscode.workspace.fs.stat(uri)
	} catch (error) {
		console.error(`Error: File not found - ${uri.fsPath}`)
		return []
	}

	let result: vscode.Location | vscode.Location[] | vscode.LocationLink[] | undefined

	try {
		result = await vscode.commands.executeCommand<
			vscode.Location | vscode.Location[] | vscode.LocationLink[] | undefined
		>("vscode.executeDefinitionProvider", uri, pos)
	} catch (error) {
		console.warn(`Definition provider not available or error occurred: ${error}`)
		return []
	}

	if (!result) {
		return []
	}

	// Handle both single Location and array of Locations/LocationLinks
	const items = Array.isArray(result) ? result : [result]

	return items
		.map((item) => {
			// Check if it's a LocationLink (has targetUri property)
			if ("targetUri" in item && item.targetUri) {
				// It's a LocationLink
				return {
					uri: item.targetUri.toString(),
					range: {
						start: { line: item.targetRange.start.line, character: item.targetRange.start.character },
						end: { line: item.targetRange.end.line, character: item.targetRange.end.character },
					},
					preview: "", // Placeholder
				}
			} else if ("uri" in item && item.uri) {
				// It's a regular Location
				return {
					uri: item.uri.toString(),
					range: {
						start: { line: item.range.start.line, character: item.range.start.character },
						end: { line: item.range.end.line, character: item.range.end.character },
					},
					preview: "", // Placeholder
				}
			} else {
				console.warn("Invalid location object in goToDefinition:", item)
				return null
			}
		})
		.filter(Boolean) as Location[]
}
