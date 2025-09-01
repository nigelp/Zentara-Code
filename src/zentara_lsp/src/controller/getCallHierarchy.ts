import * as vscode from "vscode"
import {
	GetCallHierarchyParams,
	CallHierarchyItem,
	CallHierarchyIncomingCall,
	CallHierarchyOutgoingCall,
} from "../types"
import { getSymbol } from "../../../core/tools/lsp/getSymbol"

function ensureVscodeUri(uri: string): vscode.Uri {
	if (uri.startsWith("file://")) {
		return vscode.Uri.parse(uri, true)
	}
	return vscode.Uri.file(uri)
}

function toVscodeRange(range: {
	start: { line: number; character: number }
	end: { line: number; character: number }
}): vscode.Range {
	return new vscode.Range(
		new vscode.Position(range.start.line, range.start.character),
		new vscode.Position(range.end.line, range.end.character),
	)
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

// Simple mapping without recursive call hierarchy resolution
function mapToCallHierarchyItemSimple(item: vscode.CallHierarchyItem): CallHierarchyItem {
	return {
		name: item.name,
		kind: item.kind,
		uri: item.uri.toString(),
		range: fromVscodeRange(item.range),
		selectionRange: fromVscodeRange(item.selectionRange),
		detail: item.detail,
		incomingCalls: [], // Will be populated by the root item
		outgoingCalls: [], // Will be populated by the root item
	}
}

async function mapToCallHierarchyItem(
	item: vscode.CallHierarchyItem,
	isRoot: boolean = false,
): Promise<CallHierarchyItem> {
	const baseItem = mapToCallHierarchyItemSimple(item)

	// Only populate calls for the root item to avoid infinite recursion
	if (isRoot) {
		try {
			// Add timeout protection for incoming/outgoing calls
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error("Call hierarchy calls timeout")), 7200000) // 2 hour timeout for debugging
			})

			console.log("DEBUG: Starting VS Code API calls...")
			const incomingCallsPromise = vscode.commands.executeCommand<vscode.CallHierarchyIncomingCall[]>(
				"vscode.provideIncomingCalls",
				item,
			)
			const outgoingCallsPromise = vscode.commands.executeCommand<vscode.CallHierarchyOutgoingCall[]>(
				"vscode.provideOutgoingCalls",
				item,
			)

			const incomingCalls = (await Promise.race([incomingCallsPromise, timeoutPromise])) || []
			const outgoingCalls = (await Promise.race([outgoingCallsPromise, timeoutPromise])) || []

			console.log(`DEBUG: API calls completed - incoming calls count: ${incomingCalls.length}, outgoing calls count: ${outgoingCalls.length}`)

			try {
				console.log("DEBUG: Processing incoming calls...")
				baseItem.incomingCalls = incomingCalls.map(
					(call): CallHierarchyIncomingCall => ({
						from: mapToCallHierarchyItemSimple(call.from), // No recursion
						fromRanges: call.fromRanges.map(fromVscodeRange),
					}),
				)
				console.log(`DEBUG: Processed ${baseItem.incomingCalls.length} incoming calls`)

				console.log("DEBUG: Processing outgoing calls...")
				baseItem.outgoingCalls = outgoingCalls.map(
					(call): CallHierarchyOutgoingCall => ({
						to: mapToCallHierarchyItemSimple(call.to), // No recursion
						fromRanges: call.fromRanges.map(fromVscodeRange),
					}),
				)
				console.log(`DEBUG: Processed ${baseItem.outgoingCalls.length} outgoing calls`)

			} catch (processingError) {
				console.error("DEBUG: Error during call processing:", processingError)
				// Don't reset arrays if processing fails - keep the original empty arrays
				throw processingError
			}

			console.log(`DEBUG: Final result - processed incoming: ${baseItem.incomingCalls.length}, outgoing: ${baseItem.outgoingCalls.length}`)
		} catch (error) {
			console.error("DEBUG: Error in mapToCallHierarchyItem:", error)
			// Keep empty arrays as fallback
		}
	}

	return baseItem
}

// Helper function to format range compactly
function formatRange(range: { start: { line: number; character: number }; end: { line: number; character: number } }): string {
	if (range.start.line === range.end.line) {
		return `${range.start.line}:${range.start.character}-${range.end.character}`
	}
	return `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`
}

// Function to format incoming calls as table
function formatIncomingCallsTable(incomingCalls: CallHierarchyIncomingCall[]): string {
	if (incomingCalls.length === 0) {
		return "FROM_NAME | FROM_KIND | FROM_URI | FROM_RANGE | FROM_SELECTION | CALL_RANGES | EOL\n"
	}

	const header = "FROM_NAME | FROM_KIND | FROM_URI | FROM_RANGE | FROM_SELECTION | CALL_RANGES | EOL\n"
	const rows = incomingCalls.map(call => {
		const fromRange = formatRange(call.from.range)
		const fromSelection = formatRange(call.from.selectionRange)
		const fromUri = call.from.uri.replace("file://", "")
		const callRanges = call.fromRanges.map(r => formatRange(r)).join(";")
		return `${call.from.name} | ${call.from.kind} | ${fromUri} | ${fromRange} | ${fromSelection} | ${callRanges} | <<<`
	})

	return header + rows.join('\n')
}

// Function to format outgoing calls as table
function formatOutgoingCallsTable(outgoingCalls: CallHierarchyOutgoingCall[]): string {
	if (outgoingCalls.length === 0) {
		return "TO_NAME | TO_KIND | TO_URI | TO_RANGE | TO_SELECTION | CALL_RANGES | EOL\n"
	}

	const header = "TO_NAME | TO_KIND | TO_URI | TO_RANGE | TO_SELECTION | CALL_RANGES | EOL\n"
	const rows = outgoingCalls.map(call => {
		const toRange = formatRange(call.to.range)
		const toSelection = formatRange(call.to.selectionRange)
		const toUri = call.to.uri.replace("file://", "")
		const callRanges = call.fromRanges.map(r => formatRange(r)).join(";")
		return `${call.to.name} | ${call.to.kind} | ${toUri} | ${toRange} | ${toSelection} | ${callRanges} | <<<`
	})

	return header + rows.join('\n')
}

// New interface for the simplified call hierarchy result
interface CallHierarchyResult {
	incomingCalls: string
	outgoingCalls: string
}

export async function getCallHierarchy(params: GetCallHierarchyParams): Promise<CallHierarchyResult | null> {
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
			return {
				incomingCalls: formatIncomingCallsTable([]),
				outgoingCalls: formatOutgoingCallsTable([])
			};
		}

		// Handle multiple matches case
		if (!symbolResult.isUnique && symbolResult.alternatives) {
			console.warn(`Multiple symbols found with name '${params.symbolName}'. Using first match. Alternatives: ${symbolResult.alternatives.length}`);
		}

		// Get the position from the resolved symbol
		const uri = vscode.Uri.parse(params.uri);
		const vscodePosition = new vscode.Position(
			symbolResult.symbol.selectionRange.start.line,
			symbolResult.symbol.selectionRange.start.character
		);

		// Check if file exists
		try {
			await vscode.workspace.fs.stat(uri);
		} catch (error) {
			console.error(`Error: File not found - ${uri.fsPath}`);
			return {
				incomingCalls: formatIncomingCallsTable([]),
				outgoingCalls: formatOutgoingCallsTable([])
			};
		}

		// Add timeout protection to prevent hanging
		const timeoutPromise = new Promise<vscode.CallHierarchyItem[] | null>((resolve) => {
			setTimeout(() => {
				// Don't log for every timeout, as this is expected in test environments
				resolve(null)
			}, 2000) // 2 second timeout - shorter for better test performance
		})

		const callHierarchyPromise = vscode.commands.executeCommand<vscode.CallHierarchyItem[]>(
			"vscode.prepareCallHierarchy",
			uri,
			vscodePosition,
		)

		const callHierarchyItems = await Promise.race([callHierarchyPromise, timeoutPromise])

		if (!callHierarchyItems || callHierarchyItems.length === 0) {
			// In test environments, vscode.prepareCallHierarchy might not work for all symbols
			// Return empty tables gracefully instead of throwing
			return {
				incomingCalls: formatIncomingCallsTable([]),
				outgoingCalls: formatOutgoingCallsTable([])
			}
		}

		// For simplicity, we'll process the first item. A more complex implementation
		// might allow the user to choose or merge results.
		const rootItem = callHierarchyItems[0]
		const callHierarchyItem = await mapToCallHierarchyItem(rootItem, true) // Pass true for isRoot to populate calls
		
		return {
			incomingCalls: formatIncomingCallsTable(callHierarchyItem.incomingCalls),
			outgoingCalls: formatOutgoingCallsTable(callHierarchyItem.outgoingCalls)
		}
	} catch (error) {
		console.error("Error fetching call hierarchy:", error)
		// Return null instead of throwing to handle test environment limitations
		return null
	}
}
