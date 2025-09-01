import * as vscode from "vscode"
import { GetSymbolsOverviewParams, SymbolsOverview } from "../types"
import { getDocumentSymbols } from "./getDocumentSymbols"

async function getFilesRecursively(dir: vscode.Uri): Promise<vscode.Uri[]> {
	const entries = await vscode.workspace.fs.readDirectory(dir)
	const files: vscode.Uri[] = []

	for (const [name, type] of entries) {
		const entryUri = vscode.Uri.joinPath(dir, name)
		if (type === vscode.FileType.Directory) {
			files.push(...(await getFilesRecursively(entryUri)))
		} else if (type === vscode.FileType.File) {
			files.push(entryUri)
		}
	}

	return files
}

export async function getSymbolsOverview(params: GetSymbolsOverviewParams): Promise<SymbolsOverview> {
	const { relative_path } = params
	const overview: SymbolsOverview = {}

	try {
		const workspaceFolders = vscode.workspace.workspaceFolders
		if (!workspaceFolders) {
			throw new Error("No workspace folder is open.")
		}
		const rootUri = workspaceFolders[0].uri
		const absolutePath = vscode.Uri.joinPath(rootUri, relative_path)

		let filesToProcess: vscode.Uri[] = []
		const stat = await vscode.workspace.fs.stat(absolutePath)

		if (stat.type === vscode.FileType.Directory) {
			filesToProcess = await getFilesRecursively(absolutePath)
		} else if (stat.type === vscode.FileType.File) {
			filesToProcess.push(absolutePath)
		}

		for (const fileUri of filesToProcess) {
			if (!fileUri) continue

			try {
				const symbols = await getDocumentSymbols({
				 textDocument: { uri: fileUri.toString() },
				 return_children: "no",
				 
				 include_hover: false,
				})

				const relativeFilePath = vscode.workspace.asRelativePath(fileUri)
				
				// Handle the return types
				if (typeof symbols === 'object' && symbols !== null && 'success' in symbols) {
					if (symbols.success === true && typeof symbols.symbols === 'string') {
						// { success: true; symbols: string } - parse table format
						const tableLines = symbols.symbols.split('\n').filter(line => line.trim() && !line.includes('NAME | KIND | RANGE'))
						const parsedSymbols = tableLines.map(line => {
							const parts = line.split(' | ')
							if (parts.length >= 2) {
								const name = parts[0].trim()
								const kind = parseInt(parts[1].trim(), 10)
								return { name, kind }
							}
							return null
						}).filter((symbol): symbol is { name: string; kind: number } => symbol !== null)
						overview[relativeFilePath] = parsedSymbols
					} else if (symbols.success === false) {
						// { success: false; error: string } - skip this file
						console.warn(`Failed to get symbols for ${relativeFilePath}: ${symbols.error}`)
						overview[relativeFilePath] = []
					} else {
						// Unexpected success format - skip this file
						console.warn(`Unexpected symbols success format for ${relativeFilePath}`)
						overview[relativeFilePath] = []
					}
				} else {
					// Unexpected format - skip this file
					console.warn(`Unexpected symbols format for ${relativeFilePath}`)
					overview[relativeFilePath] = []
				}
			} catch (error) {
				console.error(`Error processing file ${fileUri?.toString() || "unknown"}:`, error)
			}
		}
	} catch (error) {
		console.error("Error in getSymbolsOverview:", error)
		return {}
	}

	return overview
}
