import { GetHoverInfoParams, Hover } from "../types"
import * as vscode from "vscode"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"

export async function getHoverInfo(params: GetHoverInfoParams): Promise<Hover | null> {
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
			return null;
		}

		// Handle multiple matches case
		if (!symbolResult.isUnique && symbolResult.alternatives) {
			console.warn(`Multiple symbols found with name '${params.symbolName}'. Using first match. Alternatives: ${symbolResult.alternatives.length}`);
		}

		// Get the position from the resolved symbol
		const uri = vscode.Uri.parse(params.uri);
		const pos = new vscode.Position(
			symbolResult.symbol.selectionRange.start.line,
			symbolResult.symbol.selectionRange.start.character
		);

		let hover: vscode.Hover[] | undefined

		try {
			// Wrap in a timeout to prevent hanging on language server issues
			hover = await Promise.race([
				vscode.commands.executeCommand<vscode.Hover[]>("vscode.executeHoverProvider", uri, pos),
				new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 5000)),
			])
		} catch (error: any) {
			// Check if it's the specific Pylance error
			if (error?.message?.includes("Cannot set properties of undefined")) {
				console.warn("Pylance internal error - returning null for hover info")
				return null
			}
			console.warn(`Hover provider not available or error occurred: ${error}`)
			return null
		}

		if (!hover || hover.length === 0) {
			return null
		}

		try {
			// More defensive handling of hover contents
			const firstHover = hover[0]
			if (!firstHover || !firstHover.contents) {
				return null
			}

			const contents = firstHover.contents
				.map((content) => {
					if (typeof content === "object" && "value" in content) {
						return content.value
					}
					return content as string
				})
				.filter(Boolean)
				.join("\n")

			// If no meaningful content, return null
			if (!contents || contents.trim().length === 0) {
				return null
			}

			const range = firstHover.range
			if (!range) {
				// If range is not available, use the current position as a zero-length range
				return contents
			}

			return contents
			
		} catch (processingError) {
			console.warn(`Error processing hover data: ${processingError}`)
			return null
		}
		
	} catch (error) {
		console.error('getHoverInfo failed:', error);
		return null;
	}
}
