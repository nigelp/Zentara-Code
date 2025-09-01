import * as vscode from "vscode"
import { FindImplementationsParams, FindImplementationsParamsLegacy, Location } from "../types"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"

async function getPreview(uri: vscode.Uri, line: number): Promise<string | undefined> {
	try {
		const document = await vscode.workspace.openTextDocument(uri)
		const lines: string[] = []

		// Add previous line if it exists
		if (line > 0) {
			lines.push(document.lineAt(line - 1).text)
		}

		// Add current line
		lines.push(document.lineAt(line).text)

		// Add next line if it exists
		if (line < document.lineCount - 1) {
			lines.push(document.lineAt(line + 1).text)
		}

		return lines.join("\n")
	} catch (error) {
		console.warn(`Failed to get preview for ${uri.toString()}: ${error}`)
		return undefined
	}
}

export async function findImplementations(params: FindImplementationsParams | FindImplementationsParamsLegacy): Promise<Location[]> {
	try {
		// Support both legacy (nested) and new (flattened) parameter formats
		let uri: string, line: number, character: number, symbolName: string | undefined

		if ('textDocument' in params && 'position' in params) {
			// Legacy format with nested structure
			uri = params.textDocument.uri
			line = params.position.line
			character = params.position.character
			symbolName = undefined
		} else {
			// New flattened format with optional symbolName support
			uri = params.uri
			line = params.line || 0
			character = params.character || 0
			symbolName = params.symbolName
		}

		// Use getSymbol helper to resolve symbol location when symbolName is provided
		if (symbolName) {
			const symbolResult = await getSymbol({
				uri,
				line,
				character,
				symbolName
			})

			if (!symbolResult.symbol) {
				console.warn('Failed to find symbol:', symbolResult.error)
				return []
			}

			// Handle multiple matches case
			if (!symbolResult.isUnique && symbolResult.alternatives) {
				console.warn(`Multiple symbols found with name '${symbolName}'. Using first match. Alternatives: ${symbolResult.alternatives.length}`)
			}

			// Update position to the resolved symbol location
			line = symbolResult.symbol.selectionRange.start.line
			character = symbolResult.symbol.selectionRange.start.character
		}

		const vscodeUri = vscode.Uri.parse(uri)
		const pos = new vscode.Position(line, character)

		// Check if file exists
		try {
			await vscode.workspace.fs.stat(vscodeUri)
		} catch (error) {
			console.error(`Error: File not found - ${vscodeUri.fsPath}`)
			return []
		}

		const locations = await vscode.commands.executeCommand<vscode.Location[]>(
			"vscode.executeImplementationProvider",
			vscodeUri,
			pos,
		)

		if (!locations) {
			return []
		}

		// Add previews to the results
		const results: Location[] = []
		for (const location of locations) {
			const preview = await getPreview(location.uri, location.range.start.line)
			results.push({
				uri: location.uri.toString(),
				range: {
					start: { line: location.range.start.line, character: location.range.start.character },
					end: { line: location.range.end.line, character: location.range.end.character },
				},
				preview: preview || "",
			})
		}

		return results
	} catch (error) {
		console.error('findImplementations failed:', error)
		return []
	}
}
