import * as vscode from "vscode"
import { GetTypeHierarchyParams, TypeHierarchyItem } from "../types"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"

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

// Simple mapping without recursive type hierarchy resolution
function mapToTypeHierarchyItemSimple(item: vscode.TypeHierarchyItem): TypeHierarchyItem {
	return {
		name: item.name,
		kind: item.kind,
		uri: item.uri.toString(),
		range: fromVscodeRange(item.range),
		selectionRange: fromVscodeRange(item.selectionRange),
		detail: item.detail,
		supertypes: [], // Will be populated by the root item
		subtypes: [], // Will be populated by the root item
	}
}

async function mapToTypeHierarchyItem(
	item: vscode.TypeHierarchyItem,
	isRoot: boolean = false,
): Promise<TypeHierarchyItem> {
	const baseItem = mapToTypeHierarchyItemSimple(item)

	// Only populate types for the root item to avoid infinite recursion
	if (isRoot) {
		try {
			// Add timeout protection for supertypes/subtypes
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error("Type hierarchy timeout")), 5000) // 5 second timeout
			})

			const supertypesPromise = vscode.commands.executeCommand<vscode.TypeHierarchyItem[]>(
				"vscode.provideSupertypes",
				item,
			)
			const subtypesPromise = vscode.commands.executeCommand<vscode.TypeHierarchyItem[]>(
				"vscode.provideSubtypes",
				item,
			)

			const supertypes = (await Promise.race([supertypesPromise, timeoutPromise])) || []
			const subtypes = (await Promise.race([subtypesPromise, timeoutPromise])) || []

			baseItem.supertypes = supertypes.map(mapToTypeHierarchyItemSimple) // No recursion
			baseItem.subtypes = subtypes.map(mapToTypeHierarchyItemSimple) // No recursion
		} catch (error) {
			console.warn("Error fetching supertypes/subtypes:", error)
			// Keep empty arrays as fallback
		}
	}

	return baseItem
}

export async function getTypeHierarchy(params: GetTypeHierarchyParams): Promise<TypeHierarchyItem | null> {
	try {
		// Use getSymbol helper to resolve symbol location (for both legacy and new formats)
		let uri: vscode.Uri;
		let position: vscode.Position;

		// Handle both legacy (with textDocument/position objects) and new flattened format
		if ('textDocument' in params && 'position' in params) {
			// Legacy format
			uri = ensureVscodeUri(params.textDocument.uri);
			position = new vscode.Position(params.position.line, params.position.character);
		} else {
			// New flattened format - use getSymbol helper
			const symbolResult = await getSymbol({
				uri: params.uri,
				line: params.line,
				character: params.character,
				symbolName: params.symbolName
			});

			if (!symbolResult.symbol) {
				console.warn('Failed to find symbol for type hierarchy:', symbolResult.error);
				return null;
			}

			// Handle multiple matches case
			if (!symbolResult.isUnique && symbolResult.alternatives) {
				console.warn(`Multiple symbols found with name '${params.symbolName}'. Using first match. Alternatives: ${symbolResult.alternatives.length}`);
			}

			// Get the position from the resolved symbol
			uri = vscode.Uri.parse(params.uri);
			position = new vscode.Position(
				symbolResult.symbol.selectionRange.start.line,
				symbolResult.symbol.selectionRange.start.character
			);
		}

		// Check if file exists
		try {
			await vscode.workspace.fs.stat(uri);
		} catch (error) {
			console.error(`Error: File not found - ${uri.fsPath}`);
			return null;
		}

		// Add timeout protection to prevent hanging
		const timeoutPromise = new Promise<vscode.TypeHierarchyItem[] | null>((resolve) => {
			setTimeout(() => {
				console.warn("getTypeHierarchy timeout - returning null")
				resolve(null)
			}, 10000) // 10 second timeout
		})

		const typeHierarchyPromise = vscode.commands.executeCommand<vscode.TypeHierarchyItem[]>(
			"vscode.prepareTypeHierarchy",
			uri,
			position,
		)

		const typeHierarchyItems = await Promise.race([typeHierarchyPromise, timeoutPromise])

		if (!typeHierarchyItems || typeHierarchyItems.length === 0) {
			// In test environments, vscode.prepareTypeHierarchy might not work for all symbols
			// Return null gracefully instead of throwing
			return null
		}

		const rootItem = typeHierarchyItems[0]
		return await mapToTypeHierarchyItem(rootItem, true) // Pass true for isRoot to populate types
	} catch (error) {
		console.error("Error fetching type hierarchy:", error)
		// Return null instead of throwing to handle test environment limitations
		return null
	}
}
