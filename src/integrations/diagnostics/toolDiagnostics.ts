import * as vscode from "vscode"
import * as path from "path"

/**
 * Get diagnostics for a file and format them for tool output
 * @param uri - The URI of the file to get diagnostics for
 * @param cwd - The current working directory for relative path display
 * @param severities - Which severity levels to include (defaults to Error and Warning)
 * @returns Formatted diagnostic string, or empty string if no diagnostics
 */
export async function getFormattedDiagnostics(
	uri: vscode.Uri,
	cwd: string,
	severities: vscode.DiagnosticSeverity[] = [
		vscode.DiagnosticSeverity.Error,
		vscode.DiagnosticSeverity.Warning,
	],
): Promise<string> {
	// Get all diagnostics for this file
	const diagnostics = vscode.languages.getDiagnostics(uri)
	
	// Filter by severity
	const relevantDiagnostics = diagnostics.filter(d => severities.includes(d.severity))
	
	if (relevantDiagnostics.length === 0) {
		return ""
	}
	
	// Sort by line number
	relevantDiagnostics.sort((a, b) => a.range.start.line - b.range.start.line)
	
	// Format the diagnostics
	const lines: string[] = []
	const relativePath = path.relative(cwd, uri.fsPath).replace(/\\/g, '/')
	
	lines.push("\n## Diagnostics")
	lines.push(`File: ${relativePath}`)
	lines.push("")
	
	for (const diagnostic of relevantDiagnostics) {
		const severityLabel = getSeverityLabel(diagnostic.severity)
		const line = diagnostic.range.start.line + 1 // Convert to 1-based
		const column = diagnostic.range.start.character + 1
		const source = diagnostic.source ? `[${diagnostic.source}] ` : ""
		
		lines.push(`- ${source}**${severityLabel}** (Line ${line}:${column}): ${diagnostic.message}`)
	}
	
	return lines.join("\n")
}

/**
 * Helper function to append diagnostics to tool output
 * @param originalOutput - The original tool output
 * @param uri - The URI of the file that was modified
 * @param cwd - The current working directory
 * @returns The original output with diagnostics appended if any exist
 */
export async function appendDiagnostics(
	originalOutput: string,
	uri: vscode.Uri,
	cwd: string,
): Promise<string> {
	const diagnostics = await getFormattedDiagnostics(uri, cwd)
	if (diagnostics) {
		return originalOutput + "\n" + diagnostics
	}
	return originalOutput
}

/**
 * Execute an operation and automatically append diagnostics to the result
 * @param operation - The async operation to execute
 * @param uri - The URI of the file being modified
 * @param cwd - The current working directory
 * @returns The operation result with diagnostics appended to the output field
 */
export async function executeWithDiagnostics<T extends { output?: string }>(
	operation: () => Promise<T>,
	uri: vscode.Uri,
	cwd: string,
): Promise<T> {
	const result = await operation()
	
	// Only append diagnostics if the result has an output field
	if (result && typeof result === 'object' && 'output' in result && typeof result.output === 'string') {
		const diagnostics = await getFormattedDiagnostics(uri, cwd)
		if (diagnostics) {
			result.output = result.output + "\n" + diagnostics
		}
	}
	
	return result
}

function getSeverityLabel(severity: vscode.DiagnosticSeverity): string {
	switch (severity) {
		case vscode.DiagnosticSeverity.Error:
			return "Error"
		case vscode.DiagnosticSeverity.Warning:
			return "Warning"
		case vscode.DiagnosticSeverity.Information:
			return "Info"
		case vscode.DiagnosticSeverity.Hint:
			return "Hint"
		default:
			return "Diagnostic"
	}
}