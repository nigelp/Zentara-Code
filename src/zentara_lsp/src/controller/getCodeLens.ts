import * as vscode from "vscode"
import { GetCodeLensParams, CodeLens } from "../types"

function ensureVscodeUri(uri: string): vscode.Uri {
	if (uri.startsWith("file://")) {
		return vscode.Uri.parse(uri, true)
	}
	return vscode.Uri.file(uri)
}

function fromVscodeRange(range: vscode.Range): {
	start: { line: number; character: number }
	end: { line: number; character: number }
} {
	return {
		start: { line: range.start.line, character: range.start.character },
		end: { line: range.end.line, character: range.end.character },
	}
}

export async function getCodeLens(params: GetCodeLensParams): Promise<CodeLens[]> {
	const { textDocument } = params
	const uri = ensureVscodeUri(textDocument.uri)

	try {
		const codeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
			"vscode.executeCodeLensProvider",
			uri,
		)

		if (!codeLenses) {
			return []
		}

		return codeLenses.map((lens) => ({
			range: fromVscodeRange(lens.range),
			command: lens.command
				? {
						title: lens.command.title,
						command: lens.command.command,
						arguments: lens.command.arguments,
					}
				: undefined,
		}))
	} catch (error) {
		console.error("Error fetching code lenses:", error)
		return []
	}
}
