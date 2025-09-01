import { GetDocumentSymbolsParams, DocumentSymbol } from "../types"
import * as vscode from "vscode"
import { withTimeout, TimeoutError } from "../utils/withTimeout"
import { getHoverInfo } from "./getHoverInfo"

export async function getDocumentSymbols(
	params: GetDocumentSymbolsParams,
): Promise<{ success: false; error: string } | { success: true; symbols: string }> {
	const { textDocument, return_children = "no", include_hover = true } = params
	const uri = vscode.Uri.parse(textDocument.uri)
	const THRESHOLD = 5
	const HOVER_THRESHOLD = 20
	try {
		const symbolsPromise = Promise.resolve(
			vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
				"vscode.executeDocumentSymbolProvider",
				uri,
			),
		)
		const symbols = await withTimeout(symbolsPromise, 30000) // 30-second timeout

		if (!symbols) {
			return { success: false, error: "No symbols found for the document." }
		}

		const countLines = (symbols: DocumentSymbol[]): number => {
			return symbols.reduce((acc, symbol) => {
				return acc + 1 + (symbol.children ? countLines(symbol.children) : 0)
			}, 0)
		}

		const mapSymbols = (symbol: vscode.DocumentSymbol, processChildren: boolean): any => {
			const result: any = {
				name: symbol.name,
				kind: symbol.kind,
				range: {
					start: { line: symbol.range.start.line, character: symbol.range.start.character },
					end: { line: symbol.range.end.line, character: symbol.range.end.character },
				},
				selectionRange: {
					start: { line: symbol.selectionRange.start.line, character: symbol.selectionRange.start.character },
					end: { line: symbol.selectionRange.end.line, character: symbol.selectionRange.end.character },
				},
			}

			if (processChildren && symbol.children && symbol.children.length > 0) {
				result.children = symbol.children.map((child) => mapSymbols(child, true))
			} else {
				result.children = []
			}

			return result
		}
		const fullSymbols = symbols.map((symbol) => mapSymbols(symbol, true))
		const totalSymbols = countLines(fullSymbols)
		let final_include_hover = include_hover
		if (params.include_hover === undefined && totalSymbols > HOVER_THRESHOLD) {
			final_include_hover = false
		}

		if (return_children === "no") {
			const noChildrenSymbols = symbols.map((symbol) => mapSymbols(symbol, false))
			return {
				success: true,
				symbols: await formatAsFlattedTable(noChildrenSymbols, textDocument, final_include_hover)
			}
		}``

		if (return_children === "auto") {
			const totalLines = countLines(fullSymbols)
			if (totalLines > THRESHOLD) {
				const limitedSymbols = symbols.map((symbol) => mapSymbols(symbol, false))
				return {
					success: true,
					symbols: await formatAsFlattedTable(limitedSymbols, textDocument, final_include_hover)
				}
			}
		}

		// Always return table format
		return {
			success: true,
			symbols: await formatAsFlattedTable(fullSymbols, textDocument, final_include_hover)
		}
	} catch (error) {
		if (error instanceof TimeoutError) {
			return { success: false, error: error.message }
		}
		// Handle other errors
		return { success: false, error: "An unexpected error occurred." }
	}
}

// Helper function to format range compactly
function formatRange(range: { start: { line: number; character: number }; end: { line: number; character: number } }): string {
	if (range.start.line === range.end.line) {
		return `${range.start.line}:${range.start.character}-${range.end.character}`
	}
	return `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`
}

// Main function to format symbols as flattened table
async function formatAsFlattedTable(
	symbols: DocumentSymbol[],
	textDocument: { uri?: string },
	include_hover: boolean = true
): Promise<string> {
	const header = include_hover
		? "NAME | KIND | RANGE | SELECTION | PARENT | HOVER_INFO | EOL\n"
		: "NAME | KIND | RANGE | SELECTION | PARENT | EOL\n"
	const rows: string[] = []
	
	async function flattenSymbol(symbol: DocumentSymbol, parent: string = "") {
		const range = formatRange(symbol.range as { start: { line: number; character: number }; end: { line: number; character: number } })
		const selection = formatRange(symbol.selectionRange as { start: { line: number; character: number }; end: { line: number; character: number } })
		
		let hoverInfo = ""
		if (include_hover) {
			try {
				// Get hover info for the symbol's selection range start position
				const hoverResult = await getHoverInfo({
					uri: textDocument.uri || "",
					line: symbol.selectionRange.start.line,
					character: symbol.selectionRange.start.character
				})
				// Clean hover info: remove newlines, escape pipes, truncate if too long
				hoverInfo = hoverResult
					? hoverResult.replace(/\n/g, ' ').replace(/\|/g, '\\|').substring(0, 200)
					: ""
			} catch (error) {
				hoverInfo = ""
			}
		}
		
		const row = include_hover
			? `${symbol.name} | ${symbol.kind} | ${range} | ${selection} | ${parent} | ${hoverInfo} | <<<`
			: `${symbol.name} | ${symbol.kind} | ${range} | ${selection} | ${parent} | <<<`
		
		rows.push(row)
		
		if (symbol.children) {
			for (const child of symbol.children) {
				await flattenSymbol(child, symbol.name)
			}
		}
	}
	
	for (const symbol of symbols) {
		await flattenSymbol(symbol)
	}
	
	return header + rows.join('\n')
}
