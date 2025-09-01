import * as vscode from "vscode"
import { GetSemanticTokensParams, SemanticToken } from "../types"

function ensureVscodeUri(uri: string): vscode.Uri {
	if (uri.startsWith("file://")) {
		return vscode.Uri.parse(uri, true)
	}
	return vscode.Uri.file(uri)
}

// This function needs to be defined to decode the semantic tokens
function decodeSemanticTokens(tokens: vscode.SemanticTokens, legend: vscode.SemanticTokensLegend): SemanticToken[] {
	const result: SemanticToken[] = []
	let currentLine = 0
	let currentChar = 0

	for (let i = 0; i < tokens.data.length; i += 5) {
		const deltaLine = tokens.data[i]
		const deltaChar = tokens.data[i + 1]
		const length = tokens.data[i + 2]
		const tokenTypeIndex = tokens.data[i + 3]
		const tokenModifiersValue = tokens.data[i + 4]

		currentLine += deltaLine
		if (deltaLine > 0) {
			currentChar = deltaChar
		} else {
			currentChar += deltaChar
		}

		const tokenType = legend.tokenTypes[tokenTypeIndex]
		const tokenModifiers = legend.tokenModifiers.filter((_, index) => (tokenModifiersValue & (1 << index)) !== 0)

		result.push({
			line: currentLine,
			character: currentChar,
			length,
			tokenType,
			tokenModifiers,
		})
	}

	return result
}

export async function getSemanticTokens(params: GetSemanticTokensParams): Promise<SemanticToken[] | null> {
	const { textDocument } = params
	const uri = ensureVscodeUri(textDocument.uri)

	try {
		const tokens = await vscode.commands.executeCommand<vscode.SemanticTokens>(
			"vscode.provideDocumentSemanticTokens",
			uri,
		)

		if (!tokens) {
			return null
		}

		// If tokens.data exists and is valid, decode it
		if (tokens.data && tokens.data.length > 0) {
			// Get the legend for decoding
			const legend = await vscode.commands.executeCommand<vscode.SemanticTokensLegend | undefined>(
				"vscode.provideDocumentSemanticTokensLegend",
				uri,
			)

			if (legend) {
				return decodeSemanticTokens(tokens, legend)
			}
		}

		// Return the raw tokens if we can't decode them
		// This allows tests to handle both decoded and raw formats
		return tokens as any
	} catch (error) {
		console.error("Error fetching semantic tokens:", error)
		return null
	}
}
