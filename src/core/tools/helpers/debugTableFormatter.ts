/**
 * Utility functions for formatting debug results as tables
 */

export interface DebugStackFrameVariablesResult {
	success: boolean
	scopes: {
		name: string
		variables: any[]
	}[]
	errorMessage?: string
}

/**
 * Formats debug stack frame variables result as a table with dynamic headers
 * determined from the first variable in each scope
 * @param result - The debug stack frame variables result
 * @param maxRows - Maximum number of rows to display per scope (default: 100)
 */
export function formatStackFrameVariablesAsTable(result: DebugStackFrameVariablesResult, maxRows: number = 20): string {
	if (!result.success) {
		return JSON.stringify(result, null, 2)
	}

	if (!result.scopes || result.scopes.length === 0) {
		return JSON.stringify(result, null, 2)
	}

	let output = ""

	for (const scope of result.scopes) {
		// Add scope header
		output += `\n## ${scope.name}\n\n`

		if (!scope.variables || scope.variables.length === 0) {
			output += "No variables in this scope.\n"
			continue
		}

		// Get headers from the first variable to ensure robustness across DAP implementations
		const firstVariable = scope.variables[0]
		const headers = Object.keys(firstVariable).map(key => key.toUpperCase())

		// Create table header
		const headerRow = headers.join(" | ")
		const separatorRow = headers.map(() => "---").join(" | ")
		
		output += `${headerRow}\n${separatorRow}\n`

		const totalVariables = scope.variables.length
		const variablesToShow = scope.variables.slice(0, maxRows)
		const truncatedCount = totalVariables - variablesToShow.length

		// Add variable rows
		for (const variable of variablesToShow) {
			const row = headers.map(header => {
				const key = header.toLowerCase()
				const value = variable[key]
				
				// Handle different value types and ensure they display properly in table
				if (value === undefined || value === null) {
					return ""
				} else if (typeof value === "string") {
					// Escape pipe characters and newlines for table formatting
					return value.replace(/\|/g, "\\|").replace(/\n/g, "\\n")
				} else {
					return String(value)
				}
			}).join(" | ")
			
			output += `${row}\n`
		}

		// Add truncation notice if needed
		if (truncatedCount > 0) {
			output += `\n**Truncated ${truncatedCount} out of ${totalVariables} total variables.**\n`
			
			// List all variable names for reference
			const allVariableNames = scope.variables.map(v => v.name).join(", ")
			output += `\n**All variable names in this scope:** ${allVariableNames}\n`
			
			// Add suggestion
			output += `\n*Suggestion: Use the debug_evaluate tool to inspect specific variables you need, e.g., debug_evaluate with {"expression": "variable_name"}*\n`
		}

		output += "\n"
	}

	return output.trim()
}