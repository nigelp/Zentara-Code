import * as vscode from "vscode"
import { GetWorkspaceSymbolsParams, WorkspaceSymbol } from "../types"

function fromVscodeLocation(location: vscode.Location): {
	uri: string
	range: { start: { line: number; character: number }; end: { line: number; character: number } }
	preview: string
} {
	return {
		uri: location.uri.toString(),
		range: {
			start: { line: location.range.start.line, character: location.range.start.character },
			end: { line: location.range.end.line, character: location.range.end.character },
		},
		preview: "", // preview is a required field
	}
}

export async function getWorkspaceSymbols(params: GetWorkspaceSymbolsParams): Promise<WorkspaceSymbol[]> {
	const { query } = params

	try {
		const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
			"vscode.executeWorkspaceSymbolProvider",
			query,
		)

		if (!symbols) {
			return []
		}

		return symbols.map((symbol) => ({
			name: symbol.name,
			kind: symbol.kind,
			location: fromVscodeLocation(symbol.location),
		}))
	} catch (error) {
		console.error("Error fetching workspace symbols:", error)
		return []
	}
}
