import { GetSymbolChildrenParams } from "../types"
import * as vscode from "vscode"
import { withTimeout, TimeoutError } from "../utils/withTimeout"
import { getHoverInfo } from "./getHoverInfo"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"

export async function getSymbolChildren(
	params: GetSymbolChildrenParams,
): Promise<{ success: false; error: string } | { success: true; children: string }> {
	try {
		// Validate parameters using Zod schema
		const { GetSymbolChildrenParamsSchema } = await import("../types");
		const validationResult = GetSymbolChildrenParamsSchema.safeParse(params);
		
		if (!validationResult.success) {
			const errorMessage = validationResult.error.errors.map(e => e.message).join(", ");
			return { success: false, error: `Parameter validation failed: ${errorMessage}` };
		}
		
		// Use validated parameters
		const validatedParams = validationResult.data;
		const { uri, deep = "1" } = validatedParams;
		const vscodeUri = vscode.Uri.parse(uri);
		const HOVER_THRESHOLD = 20;
		
		const include_hover = validatedParams.include_hover ?? true;
		// Use getSymbol helper to resolve symbol location (supports both position and name-based lookup)
		const symbolResult = await getSymbol({
			uri: validatedParams.uri,
			line: validatedParams.line,
			character: validatedParams.character,
			symbolName: validatedParams.symbolName
		});

		if (!symbolResult.symbol) {
			console.warn('Failed to find symbol:', symbolResult.error);
			const errorMsg = symbolResult.error || "No symbol found.";
			// Ensure the error message includes "not found" for test compatibility
			return { success: false, error: errorMsg.includes("not found") ? errorMsg : `No symbol found: ${errorMsg}` };
		}

		// Handle multiple matches case
		if (!symbolResult.isUnique && symbolResult.alternatives) {
			console.warn(`Multiple symbols found with name '${validatedParams.symbolName}'. Using first match. Alternatives: ${symbolResult.alternatives.length}`);
		}

		const targetSymbol = symbolResult.symbol;

		// OPTIMIZED: Efficient depth-controlled children extraction
		const children = extractChildrenWithDepth(targetSymbol, deep)

		if (children.length === 0) {
			return {
				success: true,
				children: include_hover
					? "NAME | KIND | RANGE | SELECTION | PARENT | HOVER_INFO | EOL\n"
					: "NAME | KIND | RANGE | SELECTION | PARENT | EOL\n"
			}
		}

		// Smart hover inclusion based on performance - same pattern as getDocumentSymbols
		let final_include_hover = include_hover
		if (params.include_hover === undefined && children.length > HOVER_THRESHOLD) {
			final_include_hover = false
		}

		// OPTIMIZED: Parallel table formatting
		const formattedChildren = await formatChildrenAsTable(children, targetSymbol.name, uri, final_include_hover)
		
		return {
			success: true,
			children: formattedChildren
		}
	} catch (error) {
		if (error instanceof TimeoutError) {
			return { success: false, error: error.message }
		}
		return { success: false, error: "An unexpected error occurred while getting symbol children." }
	}
}


/**
 * OPTIMIZED: Extract children with configurable depth
 * Supports: 1, 2, 3, "all" depth levels
 */
function extractChildrenWithDepth(symbol: vscode.DocumentSymbol, deep: string | number): vscode.DocumentSymbol[] {
	if (!symbol.children || symbol.children.length === 0) {
		return []
	}
	
	const maxDepth = deep === "all" ? Infinity : parseInt(deep.toString())
	const result: vscode.DocumentSymbol[] = []
	
	// OPTIMIZED: Iterative collection with depth control
	function collectChildren(children: vscode.DocumentSymbol[], currentDepth: number) {
		if (currentDepth > maxDepth) return
		
		for (const child of children) {
			result.push(child)
			
			// Continue to next level if within depth limit
			if (child.children && child.children.length > 0 && currentDepth < maxDepth) {
				collectChildren(child.children, currentDepth + 1)
			}
		}
	}
	
	collectChildren(symbol.children, 1)
	return result
}

/**
 * OPTIMIZED: Format children as table with parallel hover info fetching
 */
async function formatChildrenAsTable(
	children: vscode.DocumentSymbol[],
	parentName: string,
	uri: string,
	includeHover: boolean
): Promise<string> {
	const header = includeHover
		? "NAME | KIND | RANGE | SELECTION | PARENT | HOVER_INFO | EOL\n"
		: "NAME | KIND | RANGE | SELECTION | PARENT | EOL\n"
	
	// Helper function to format range compactly
	function formatRange(range: vscode.Range): string {
		if (range.start.line === range.end.line) {
			return `${range.start.line}:${range.start.character}-${range.end.character}`
		}
		return `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`
	}
	
	// OPTIMIZED: Parallel hover info fetching for performance
	const rowPromises = children.map(async (child) => {
		const range = formatRange(child.range)
		const selection = formatRange(child.selectionRange)
		
		let hoverInfo = ""
		if (includeHover) {
			try {
				// Get hover info for the symbol's selection range start position
				const hover = await getHoverInfo({
					uri,
					line: child.selectionRange.start.line,
					character: child.selectionRange.start.character
				})
				// Clean hover info: remove newlines, escape pipes, truncate if too long
				hoverInfo = hover
					? hover.replace(/\n/g, ' ').replace(/\|/g, '\\|').substring(0, 200)
					: ""
			} catch (error) {
				hoverInfo = ""
			}
		}
		
		return includeHover
			? `${child.name} | ${child.kind} | ${range} | ${selection} | ${parentName} | ${hoverInfo} | <<<`
			: `${child.name} | ${child.kind} | ${range} | ${selection} | ${parentName} | <<<`
	})
	
	const rows = await Promise.all(rowPromises)
	return header + rows.join('\n')
}