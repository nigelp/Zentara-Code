import * as vscode from "vscode"
import {
	GetSymbolCodeSnippetParams,
	CodeSnippet
} from "../types"
import { SemanticBoundaryDetector, BoundaryResult } from "../services/SemanticBoundaryDetector"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"

/**
 * Formats code snippet with line numbers in cat -n format
 * @param text The raw code text
 * @param startLineNumber The starting line number (1-based)
 * @returns Formatted text with line numbers
 */
function formatWithLineNumbers(text: string, startLineNumber: number): string {
	const lines = text.split("\n")
	const maxLineNumber = startLineNumber + lines.length - 1
	const padding = maxLineNumber.toString().length

	return lines
		.map((line, index) => {
			const lineNumber = startLineNumber + index
			return `${lineNumber.toString().padStart(padding, " ")}→${line}`
		})
		.join("\n")
}

/**
 * Counts the number of data rows in a table by counting EOL markers (<<<)
 * @param tableStr The table string
 * @returns Number of data rows (excluding header)
 */
function countTableRows(tableStr: string): number {
	if (!tableStr || typeof tableStr !== 'string') {
		return 0
	}
	// Count occurrences of "<<<" which marks the end of each data row
	const matches = tableStr.match(/<<</g)
	return matches ? matches.length : 0
}

/**
 * Truncates a table string if it has too many rows
 * @param tableStr The table string
 * @param maxRows Maximum number of rows allowed
 * @returns Truncated table string with truncation message if needed
 */
function truncateTable(tableStr: string, maxRows: number): { table: string; wasTruncated: boolean; originalCount: number } {
	if (!tableStr || typeof tableStr !== 'string') {
		return { table: tableStr, wasTruncated: false, originalCount: 0 }
	}

	const originalCount = countTableRows(tableStr)
	if (originalCount <= maxRows) {
		return { table: tableStr, wasTruncated: false, originalCount }
	}

	// Split into lines and find header
	const lines = tableStr.split('\n')
	const headerLine = lines.find(line => line.includes('|') && !line.includes('<<<'))
	
	if (!headerLine) {
		// No header found, just return original
		return { table: tableStr, wasTruncated: false, originalCount }
	}

	// Keep header and first maxRows data rows
	const resultLines = [headerLine]
	let rowCount = 0
	
	for (const line of lines) {
		if (line.includes('<<<')) {
			if (rowCount < maxRows) {
				resultLines.push(line)
				rowCount++
			} else {
				break
			}
		}
	}

	// Add truncation message
	const truncatedCount = originalCount - maxRows
	resultLines.push(`... | ... | Total rows exceed ${maxRows} threshold. Truncated ${truncatedCount} rows out of ${originalCount} total | <<<`)

	return {
		table: resultLines.join('\n'),
		wasTruncated: true,
		originalCount
	}
}


// Symbol code snippet controller with semantic capabilities
export class SymbolCodeSnippetController {
	private boundaryDetector: SemanticBoundaryDetector;

	// Default values
	private readonly DEFAULT_MAX_CALL_HIERARCHY = 10;
	private readonly DEFAULT_MAX_USAGES = 10;
	private readonly DEFAULT_INCLUDE_CALL_HIERARCHY = true;
	private readonly DEFAULT_INCLUDE_USAGES = true;

	constructor(
		private callHierarchyController: any,
		private findUsagesController: any
	) {
		this.boundaryDetector = new SemanticBoundaryDetector();
	}

	async getSymbolCodeSnippet(params: GetSymbolCodeSnippetParams): Promise<CodeSnippet | null> {
		const startTime = performance.now();
		
		try {
			// Apply defaults (flattened parameters)
			const includeCallHierarchy = params.includeCallHierarchy ?? this.DEFAULT_INCLUDE_CALL_HIERARCHY;
			const includeUsages = params.includeUsages ?? this.DEFAULT_INCLUDE_USAGES;
			const maxCallHierarchyItems = params.maxCallHierarchyItems ?? this.DEFAULT_MAX_CALL_HIERARCHY;
			const maxUsages = params.maxUsages ?? this.DEFAULT_MAX_USAGES;

			// Parse URI
			const uri = vscode.Uri.parse(params.uri);
			
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
			const position = new vscode.Position(
				symbolResult.symbol.selectionRange.start.line,
				symbolResult.symbol.selectionRange.start.character
			);

			// 1. Detect semantic boundaries using the resolved position
			const boundary = await this.boundaryDetector.detectBoundaries(
				uri,
				position
			);

			if (!boundary.success) {
				console.warn('Failed to detect semantic boundaries');
				return null;
			}

			// 2. Extract code snippet
			const snippet = await this.extractSnippet(uri, boundary);
			if (!snippet) {
				console.warn('Failed to extract code snippet');
				return null;
			}

			// 3. Gather enrichment data using resolved position
			const enrichmentData = await this.gatherEnrichmentData(
				params.uri,
				position.line,
				position.character,
				includeCallHierarchy,
				includeUsages,
				maxCallHierarchyItems,
				maxUsages
			);

			// 4. Construct and return response
			return this.buildResponse(snippet, boundary, enrichmentData, startTime, params.uri);
			
		} catch (error) {
			console.error('getSymbolCodeSnippet failed:', error);
			return null;
		}
	}

	private async extractSnippet(uri: vscode.Uri, boundary: BoundaryResult): Promise<string | null> {
		try {
			const document = await vscode.workspace.openTextDocument(uri);
			const range = new vscode.Range(
				new vscode.Position(boundary.range.start.line, boundary.range.start.character),
				new vscode.Position(boundary.range.end.line, boundary.range.end.character)
			);

			const text = document.getText(range);
			return formatWithLineNumbers(text, boundary.range.start.line + 1); // Convert to 1-based
			
		} catch (error) {
			console.error('Failed to extract snippet:', error);
			return null;
		}
	}

	private async gatherEnrichmentData(
		uri: string,
		line: number,
		character: number,
		includeCallHierarchy: boolean,
		includeUsages: boolean,
		maxCallHierarchyItems: number,
		maxUsages: number
	): Promise<{
		callHierarchy: { incomingCalls: string; outgoingCalls: string } | null;
		usages: string | null;
		truncated?: any;
	}> {
		const promises: Promise<any>[] = [];

		// Gather call hierarchy if requested
		if (includeCallHierarchy) {
			promises.push(
				this.withTimeout(
					this.callHierarchyController.getCallHierarchy({
						textDocument: { uri },
						position: { line, character }
					}),
					10000
				).catch((error: any) => {
					console.warn('Call hierarchy enrichment failed:', error);
					return null;
				})
			);
		} else {
			promises.push(Promise.resolve(null));
		}

		// Gather usages if requested
		if (includeUsages) {
			promises.push(
				this.withTimeout(
					this.findUsagesController.findUsages({
						textDocument: { uri },
						position: { line, character }
					}),
					15000
				).catch((error: any) => {
					console.warn('Usages enrichment failed:', error);
					return null;
				})
			);
		} else {
			promises.push(Promise.resolve(null));
		}

		const [callHierarchy, usages] = await Promise.all(promises);

		// Handle truncation logic
		const truncationInfo: any = {};
		let truncatedCallHierarchy = callHierarchy;
		let truncatedUsages = usages;

		// Truncate call hierarchy if needed (now working with table format)
		if (callHierarchy && typeof callHierarchy === 'object') {
			const incomingResult = truncateTable(callHierarchy.incomingCalls, maxCallHierarchyItems);
			const outgoingResult = truncateTable(callHierarchy.outgoingCalls, maxCallHierarchyItems);
			
			if (incomingResult.wasTruncated || outgoingResult.wasTruncated) {
				truncatedCallHierarchy = {
					incomingCalls: incomingResult.table,
					outgoingCalls: outgoingResult.table
				};
				truncationInfo.callHierarchy = true;
				if (!truncationInfo.originalCounts) truncationInfo.originalCounts = {};
				truncationInfo.originalCounts.callHierarchy = incomingResult.originalCount + outgoingResult.originalCount;
			}
		}

		// Truncate usages if needed (now working with table format)
		if (usages && typeof usages === 'string') {
			const usageResult = truncateTable(usages, maxUsages);
			if (usageResult.wasTruncated) {
				truncatedUsages = usageResult.table;
				truncationInfo.usages = true;
				if (!truncationInfo.originalCounts) truncationInfo.originalCounts = {};
				truncationInfo.originalCounts.usages = usageResult.originalCount;
			}
		}

		return {
			callHierarchy: truncatedCallHierarchy,
			usages: truncatedUsages,
			truncated: Object.keys(truncationInfo).length > 0 ? truncationInfo : undefined
		};
	}


	private buildResponse(
		snippet: string,
		boundary: BoundaryResult,
		enrichmentData: any,
		startTime: number,
		uri: string
	): CodeSnippet {
		const executionTime = performance.now() - startTime;

		return {
			snippet,
			uri,
			range: boundary.range,
			symbolInfo: boundary.symbolInfo,
			callHierarchy: enrichmentData.callHierarchy,
			usages: enrichmentData.usages,
			metadata: {
				boundaryMethod: boundary.method,
				executionTime: Math.round(executionTime * 100) / 100, // Round to 2 decimal places
				truncated: enrichmentData.truncated
			}
		};
	}

	private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
		const timeoutPromise = new Promise<null>((resolve) =>
			setTimeout(() => resolve(null), timeoutMs)
		);

		return Promise.race([promise, timeoutPromise]);
	}
}

// Factory function to create controller with dependencies
export function createSymbolCodeSnippetController(
	callHierarchyController: any,
	findUsagesController: any
): SymbolCodeSnippetController {
	return new SymbolCodeSnippetController(callHierarchyController, findUsagesController);
}

// Function export for LSP tool integration
export async function getSymbolCodeSnippet(params: GetSymbolCodeSnippetParams): Promise<CodeSnippet | null> {
	// This will be injected by the LSP controller with proper dependencies
	throw new Error("getSymbolCodeSnippet must be bound to a SymbolCodeSnippetController instance");
}
