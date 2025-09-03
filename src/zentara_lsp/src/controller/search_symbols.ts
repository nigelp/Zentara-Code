import * as vscode from "vscode"
import { GetSymbolsParams, Symbol } from "../types"
import { fromVscodeLocation } from "../vscodeUtils"
import { regexSearchFiles } from "../../../services/ripgrep"
import { withTimeout, TimeoutError } from "../utils/withTimeout"
import { waitForWorkspaceSymbolProvider } from "../utils/waitForLanguageServer"

// Helper function to format range compactly
function formatRange(range: { start: { line: number; character: number }; end: { line: number; character: number } }): string {
	if (range.start.line === range.end.line) {
		return `${range.start.line}:${range.start.character}-${range.end.character}`
	}
	return `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`
}

// Format symbols as a table similar to getDocumentSymbols
function formatSymbolsAsTable(symbols: Symbol[]): string {
	const header = "NAME | KIND | RANGE | SELECTION | NAME_PATH | URI | EOL\n"
	const rows: string[] = []
	
	for (const symbol of symbols) {
		const range = formatRange({
			start: { 
				line: symbol.location.range.start?.line ?? 0, 
				character: symbol.location.range.start?.character ?? 0 
			},
			end: { 
				line: symbol.location.range.end?.line ?? 0, 
				character: symbol.location.range.end?.character ?? 0 
			}
		})
		const selection = range // For workspace symbols, range and selection are the same
		const uri = symbol.location.uri.replace('file://', '') // Remove file:// prefix for cleaner display
		
		const row = `${symbol.name} | ${symbol.kind} | ${range} | ${selection} | ${symbol.name_path} | ${uri} | <<<`
		rows.push(row)
	}
	
	return header + rows.join('\n')
}

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

		const flattenSymbols = (symbols: vscode.DocumentSymbol[], parentPath: string) => {
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

export async function getSymbols(params: GetSymbolsParams): Promise<{ success: false; error: string } | { success: true; symbols: string }> {
	const { 
		name_path, 
		depth = undefined,
		relative_path = undefined,
		include_body = false, 
		include_kinds = undefined,
		exclude_kinds = undefined,
		substring_matching = false, 
		max_answer_chars = 10000, // Default to 10000 characters
		case_sensitive = false 
	} = params

	const allSymbols: Symbol[] = []
	const searchPattern = name_path.split("/").pop() || ""

	try {
		// console.log(`[get_symbols] Starting search for: "${name_path}", pattern: "${searchPattern}"`)
		
		// // Try to get symbols from all open documents first
		// const allTextDocuments = vscode.workspace.textDocuments
		// console.log(`[get_symbols] Total text documents: ${allTextDocuments.length}`)
		
		// const openDocuments = allTextDocuments.filter(
		// 	(doc) => doc.uri.scheme === "file"
		// )
		// console.log(`[get_symbols] File documents after filtering: ${openDocuments.length}`)

		// // Get symbols from open documents
		// for (const doc of openDocuments) {
		// 	console.log(`[get_symbols] Processing document: ${doc.uri.fsPath}`)
		// 	await getSymbolsInFile(doc.uri, allSymbols)
		// }
		// console.log(`[get_symbols] Symbols from open documents: ${allSymbols.length}`)

		// // If we don't have symbols yet and we have a search pattern, try workspace symbols
		// if (allSymbols.length === 0 && searchPattern) {
			console.log(`[get_symbols] No symbols from open docs, trying workspace search for: "${searchPattern}"`)
			try {
				// First, wait for workspace symbol provider to be ready (with timeout)
				await waitForWorkspaceSymbolProvider(30000) // 30-second readiness check
				
				// Then use VS Code's workspace symbol provider
				const workspaceSymbolsPromise = Promise.resolve(
					vscode.commands.executeCommand<vscode.SymbolInformation[]>(
						"vscode.executeWorkspaceSymbolProvider",
						searchPattern,
					)
				)
				const workspaceSymbols = await withTimeout(workspaceSymbolsPromise, 5000) // 5-second operation timeout
				console.log(`[get_symbols] Workspace symbols query result:`, workspaceSymbols ? workspaceSymbols.length : 'null')
				if (workspaceSymbols && workspaceSymbols.length > 0) {
					console.log(`[get_symbols] First workspace symbol:`, {
						name: workspaceSymbols[0].name,
						kind: workspaceSymbols[0].kind,
						location: workspaceSymbols[0].location?.uri
					})
				}

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
			} catch (error) {
				if (error instanceof TimeoutError) {
					console.error(`Timeout getting workspace symbols for "${searchPattern}": ${error.message}`)
					// Continue without workspace symbols
				} else {
					console.error(`Error getting workspace symbols for "${searchPattern}": ${error.message}`)
				}
			}
		//}
	} catch (error) {
		console.error("Error searching for symbols:", error)
		return { success: false, error: "Error searching for symbols: " + (error instanceof Error ? error.message : String(error)) }
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
					? case_sensitive ? symbolName.includes(lastSegment) : symbolName.toLowerCase().includes(lastSegment.toLowerCase())
					: case_sensitive ? symbolName === lastSegment : symbolName.toLowerCase() === lastSegment.toLowerCase()

				if (!match) return false

				if (name_path.startsWith("/")) {
					// absolute path
					if (symbolPathSegments.length !== namePathSegments.length) return false
					return namePathSegments.every((seg: string, i: number) => 
						case_sensitive ? seg === symbolPathSegments[i] : seg.toLowerCase() === symbolPathSegments[i].toLowerCase()
					)
				} else if (namePathSegments.length > 0) {
					// relative path
					if (symbolPathSegments.length < namePathSegments.length) return false
					for (let i = 0; i <= symbolPathSegments.length - namePathSegments.length; i++) {
						const subSlice = symbolPathSegments.slice(i, i + namePathSegments.length)
						const matches = case_sensitive 
							? JSON.stringify(subSlice) === JSON.stringify(namePathSegments)
							: JSON.stringify(subSlice.map(s => s.toLowerCase())) === JSON.stringify(namePathSegments.map(s => s.toLowerCase()))
						if (matches) {
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

	console.log(`[get_symbols] Final filtered symbols count: ${filteredSymbols.length}`)
	console.log(`[get_symbols] Filtered symbols:`, filteredSymbols.map(s => ({ name: s.name, kind: s.kind, name_path: s.name_path })))
	
	// Format as table
	let tableResult = formatSymbolsAsTable(filteredSymbols)
	console.log(`[get_symbols] Table result length: ${tableResult.length}`)
	console.log(`[get_symbols] Table result preview:`, tableResult.substring(0, 200))
	
	// Check max_answer_chars limit and truncate if necessary
	if (max_answer_chars && tableResult.length > max_answer_chars) {
		const originalLength = tableResult.length
		// Truncate the result to fit within the limit
		tableResult = tableResult.substring(0, max_answer_chars)
		// Add truncation message
		const truncationMsg = `\n--truncated-- ${max_answer_chars} out of ${originalLength} characters, use max_answer_chars to adjust the output length`
		tableResult += truncationMsg
		console.log(`[get_symbols] Result truncated from ${originalLength} to ${max_answer_chars} chars`)
	}

	return { success: true, symbols: tableResult }
}
