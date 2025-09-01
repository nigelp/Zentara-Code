import * as vscode from "vscode"
import { GetSymbolsParams, Symbol } from "../types"
import { fromVscodeLocation } from "../vscodeUtils"
import { regexSearchFiles } from "../../../services/ripgrep"
import { withTimeout, TimeoutError } from "../utils/withTimeout"

async function getSymbolsInFile(uri: vscode.Uri, allSymbols: Symbol[]) {
	try {
		const symbolsPromise = Promise.resolve(
			vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
				"vscode.executeDocumentSymbolProvider",
				uri,
			),
		)
		const symbols = await withTimeout(symbolsPromise, 5000) // 5-second timeout

		if (!symbols) {
			return
		}

		function flattenSymbols(symbols: vscode.DocumentSymbol[], parentPath: string) {
			for (const symbol of symbols) {
				const currentPath = parentPath ? `${parentPath}/${symbol.name}` : symbol.name
				allSymbols.push({
					name: symbol.name,
					kind: symbol.kind,
					location: fromVscodeLocation(new vscode.Location(uri, symbol.selectionRange)),
					name_path: currentPath,
				})
				if (symbol.children) {
					flattenSymbols(symbol.children, currentPath)
				}
			}
		}

		flattenSymbols(symbols, "")
	} catch (error) {
		if (error instanceof TimeoutError) {
			console.error(`Timeout getting symbols for ${uri.fsPath}: ${error.message}`)
			// Continue without symbols for this file
		} else {
			console.error(`Error getting symbols for ${uri.fsPath}: ${error.message}`)
		}
	}
}

export async function getSymbols(params: GetSymbolsParams): Promise<Symbol[]> {
	const { name_path, include_body, include_kinds, exclude_kinds, substring_matching, max_answer_chars } = params

	const allSymbols: Symbol[] = []
	const searchPattern = name_path.split("/").pop() || ""

	try {
		// Try to get symbols from all open documents first
		const openDocuments = vscode.workspace.textDocuments.filter(
			(doc) =>
				doc.uri.scheme === "file" &&
				(doc.languageId === "typescript" ||
					doc.languageId === "javascript" ||
					doc.languageId === "typescriptreact" ||
					doc.languageId === "javascriptreact"),
		)

		// Get symbols from open documents
		for (const doc of openDocuments) {
			await getSymbolsInFile(doc.uri, allSymbols)
		}

		// If we don't have symbols yet and we have a search pattern, try workspace symbols
		if (allSymbols.length === 0 && searchPattern) {
			// Use VS Code's workspace symbol provider as fallback
			const workspaceSymbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
				"vscode.executeWorkspaceSymbolProvider",
				searchPattern,
			)

			if (workspaceSymbols) {
				for (const symbol of workspaceSymbols) {
					allSymbols.push({
						name: symbol.name,
						kind: symbol.kind,
						location: fromVscodeLocation(symbol.location),
						name_path: symbol.name, // Simple path for workspace symbols
					})
				}
			}
		}

		// If still no symbols and we have workspace folders, try to search for files
		if (allSymbols.length === 0) {
			const workspaceFolders = vscode.workspace.workspaceFolders
			if (workspaceFolders && workspaceFolders.length > 0) {
				// Try to find TypeScript/JavaScript files in the workspace
				const files = await vscode.workspace.findFiles("**/*.{ts,tsx,js,jsx}", "**/node_modules/**", 100)
				for (const file of files) {
					try {
						await getSymbolsInFile(file, allSymbols)
					} catch (err) {
						// Ignore errors for individual files
						console.warn(`Error getting symbols from ${file.fsPath}:`, err)
					}
				}
			}
		}
	} catch (error) {
		console.error("Error searching for symbols:", error)
		return []
	}

	let filteredSymbols = allSymbols

	if (name_path) {
		const namePathSegments = name_path.split("/").filter((s: string) => s)
		const lastSegment = namePathSegments.pop()

		if (lastSegment) {
			filteredSymbols = filteredSymbols.filter((symbol: Symbol) => {
				const symbolPathSegments = symbol.name_path.split("/")
				const symbolName = symbolPathSegments.pop()

				if (!symbolName) return false

				const match = substring_matching
					? symbolName.toLowerCase().includes(lastSegment.toLowerCase())
					: symbolName === lastSegment

				if (!match) return false

				if (name_path.startsWith("/")) {
					// absolute path
					if (symbolPathSegments.length !== namePathSegments.length) return false
					return namePathSegments.every((seg: string, i: number) => seg === symbolPathSegments[i])
				} else if (namePathSegments.length > 0) {
					// relative path
					if (symbolPathSegments.length < namePathSegments.length) return false
					for (let i = 0; i <= symbolPathSegments.length - namePathSegments.length; i++) {
						const subSlice = symbolPathSegments.slice(i, i + namePathSegments.length)
						if (JSON.stringify(subSlice) === JSON.stringify(namePathSegments)) {
							return true
						}
					}
					return false
				}
				return true // no path restriction
			})
		}
	}

	if (include_kinds && include_kinds.length > 0) {
		filteredSymbols = filteredSymbols.filter((s) => include_kinds.includes(s.kind))
	}

	if (exclude_kinds && exclude_kinds.length > 0) {
		filteredSymbols = filteredSymbols.filter((s) => !exclude_kinds.includes(s.kind))
	}

	if (include_body) {
		for (const symbol of filteredSymbols) {
			const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(symbol.location.uri))
			const range = new vscode.Range(
				symbol.location.range.start.line,
				symbol.location.range.start.character,
				symbol.location.range.end.line,
				symbol.location.range.end.character,
			)
			symbol.body = doc.getText(range)
		}
	}

	let resultJson = JSON.stringify(filteredSymbols)
	if (max_answer_chars && resultJson.length > max_answer_chars) {
		return []
	}

	return filteredSymbols
}
