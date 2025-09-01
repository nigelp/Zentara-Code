import { describe, it, expect } from "vitest"
import { formatStackFrameVariablesAsTable, type DebugStackFrameVariablesResult } from "../debugTableFormatter"

describe("debugTableFormatter", () => {
	it("should format debug stack frame variables as a table", () => {
		const mockResult: DebugStackFrameVariablesResult = {
			success: true,
			scopes: [
				{
					name: "Locals",
					variables: [
						{
							name: "special variables",
							value: "",
							type: "",
							variablesReference: 19
						},
						{
							name: "Dict",
							value: "typing.Dict",
							type: "_SpecialGenericAlias",
							variablesReference: 10
						},
						{
							name: "logger",
							value: "<Logger universal.paired_dataloader (DEBUG)>",
							type: "Logger",
							variablesReference: 14
						}
					]
				},
				{
					name: "Globals",
					variables: [
						{
							name: "torch",
							value: "<module 'torch' from '/opt/conda/envs/vef/lib/python3.11/site-packages/torch/__init__.py'>",
							type: "module",
							variablesReference: 18
						}
					]
				}
			]
		}

		const result = formatStackFrameVariablesAsTable(mockResult)
		
		// Check that it contains the scope headers
		expect(result).toContain("## Locals")
		expect(result).toContain("## Globals")
		
		// Check that it contains table headers (dynamically determined from first variable)
		expect(result).toContain("NAME | VALUE | TYPE | VARIABLESREFERENCE")
		expect(result).toContain("--- | --- | --- | ---")
		
		// Check that it contains variable data
		expect(result).toContain("special variables")
		expect(result).toContain("typing.Dict")
		expect(result).toContain("torch")
	})

	it("should handle truncation when there are too many variables", () => {
		// Create a result with more than 100 variables
		const variables = Array.from({ length: 150 }, (_, i) => ({
			name: `var${i}`,
			value: `value${i}`,
			type: "string",
			variablesReference: 0
		}))

		const mockResult: DebugStackFrameVariablesResult = {
			success: true,
			scopes: [
				{
					name: "Locals",
					variables
				}
			]
		}

		const result = formatStackFrameVariablesAsTable(mockResult, 100)
		
		// Check truncation message
		expect(result).toContain("Truncated 50 out of 150 total variables")
		expect(result).toContain("All variable names in this scope:")
		expect(result).toContain("Suggestion: Use the debug_evaluate tool")
		
		// Should contain first 100 variables in the table rows
		expect(result).toContain("var0 | value0 | string |")
		expect(result).toContain("var99 | value99 | string |")
		
		// var100 should appear in the variable names list but not as a table row
		expect(result).toContain("var100") // In the names list
		expect(result).not.toContain("var100 | value100 | string |") // Not as a table row
	})

	it("should handle empty scopes", () => {
		const mockResult: DebugStackFrameVariablesResult = {
			success: true,
			scopes: [
				{
					name: "Empty",
					variables: []
				}
			]
		}

		const result = formatStackFrameVariablesAsTable(mockResult)
		
		expect(result).toContain("## Empty")
		expect(result).toContain("No variables in this scope.")
	})

	it("should handle failed results by returning JSON", () => {
		const mockResult: DebugStackFrameVariablesResult = {
			success: false,
			scopes: [],
			errorMessage: "Debug session not active"
		}

		const result = formatStackFrameVariablesAsTable(mockResult)
		
		// Should return JSON for failed results
		expect(result).toContain('"success": false')
		expect(result).toContain('"errorMessage": "Debug session not active"')
	})
})