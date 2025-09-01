import * as vscode from "vscode"
import { GetSignatureHelpParams, SignatureHelp } from "../types"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"

function ensureVscodeUri(uri: string): vscode.Uri {
	if (uri.startsWith("file://")) {
		return vscode.Uri.parse(uri, true)
	}
	return vscode.Uri.file(uri)
}

export async function getSignatureHelp(params: GetSignatureHelpParams): Promise<SignatureHelp | null> {
	try {
		// Parse URI
		const uri = ensureVscodeUri(params.uri)
		
		// Use getSymbol helper to resolve symbol location
		const symbolResult = await getSymbol({
			uri: params.uri,
			line: params.line,
			character: params.character,
			symbolName: params.symbolName
		})

		if (!symbolResult.symbol) {
			console.warn('Failed to find symbol:', symbolResult.error)
			return null
		}

		// Handle multiple matches case
		if (!symbolResult.isUnique && symbolResult.alternatives) {
			console.warn(`Multiple symbols found with name '${params.symbolName}'. Using first match. Alternatives: ${symbolResult.alternatives.length}`)
		}

		// Get the position from the resolved symbol
		const vscodePosition = new vscode.Position(
			symbolResult.symbol.selectionRange.start.line,
			symbolResult.symbol.selectionRange.start.character
		)

		const signatureHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
			"vscode.executeSignatureHelpProvider",
			uri,
			vscodePosition,
		)

		if (!signatureHelp) {
			return null
		}

		return {
			signatures: signatureHelp.signatures.map((sig) => ({
				label: sig.label,
				documentation:
					typeof sig.documentation === "string" ? sig.documentation : JSON.stringify(sig.documentation),
				parameters: sig.parameters.map((p) => ({
					label: typeof p.label === "string" ? p.label : `${p.label[0]}, ${p.label[1]}`,
					documentation:
						typeof p.documentation === "string" ? p.documentation : JSON.stringify(p.documentation),
				})),
			})),
			activeSignature: signatureHelp.activeSignature,
			activeParameter: signatureHelp.activeParameter,
		}
	} catch (error) {
		console.error("Error fetching signature help:", error)
		return null
	}
}
