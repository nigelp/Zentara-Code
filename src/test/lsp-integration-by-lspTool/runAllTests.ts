import * as vscode from "vscode"
import { TestResult, formatTestResult, cleanupTestFiles } from "./testHelpers"

// Add this to catch unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled Rejection at:", promise, "reason:", reason)
	// Safely attempt to show error message without creating another unhandled rejection
	// Use .then() to handle both success and failure cases
	vscode.window.showErrorMessage(`Unhandled Rejection: ${reason}`).then(
		() => {
			// Message shown successfully
		},
		(err: any) => {
			// Silently ignore if showErrorMessage was canceled
			// This prevents cascading unhandled rejections
			console.error("Could not show error message:", err)
		},
	)
})

// Import all test modules
import { testFindUsages } from "./test-find-usages"
import { testGoToDefinition } from "./test-go-to-definition"
import { testFindImplementations } from "./test-find-implementations"
import { testGetHoverInfo } from "./test-get-hover-info"
import { testGetDocumentSymbols } from "./test-get-document-symbols"
import { testGetCompletions } from "./test-get-completions"
import { testGetSignatureHelp } from "./test-get-signature-help"
import { testRename } from "./test-rename"
import { testGetCodeActions } from "./test-get-code-actions"
import { testGetSemanticTokens } from "./test-get-semantic-tokens"
import { testGetCallHierarchy } from "./test-get-call-hierarchy"
import { testGetTypeHierarchy } from "./test-get-type-hierarchy"
import { testGetCodeLens } from "./test-get-code-lens"
import { testGetSelectionRange } from "./test-get-selection-range"
import { testGetTypeDefinition } from "./test-get-type-definition"
import { testGetDeclaration } from "./test-get-declaration"
import { testGetDocumentHighlights } from "./test-get-document-highlights"
import { testGetWorkspaceSymbols } from "./test-get-workspace-symbols"
import { testGetSymbolCodeSnippet } from "./test-get-symbol-code-snippet"
import { testGetSymbols } from "./test-get-symbols"
import { testGetSymbolsOverview } from "./test-get-symbols-overview"
import { testInsertAfterSymbol } from "./test-insert-after-symbol"
import { testInsertBeforeSymbol } from "./test-insert-before-symbol"
import { testReplaceSymbolBody } from "./test-replace-symbol-body"

export async function runAllLspTests(): Promise<void> {
	console.log("[Debug] runAllLspTests started.")
	const outputChannel = vscode.window.createOutputChannel("LSP Tool Tests")
	outputChannel.show()

	outputChannel.appendLine("=".repeat(60))
	outputChannel.appendLine("Starting LSP Tool Integration Tests")
	outputChannel.appendLine("=".repeat(60))
	outputChannel.appendLine("")

	const testFunctions = [
		//{ name: 'find_usages', fn: testFindUsages },
		{ name: "go_to_definition", fn: testGoToDefinition },
		//{ name: 'find_implementations', fn: testFindImplementations },
		{ name: "get_hover_info", fn: testGetHoverInfo },
		//{ name: 'get_document_symbols', fn: testGetDocumentSymbols },
		//{ name: 'get_completions', fn: testGetCompletions },
		//{ name: 'get_signature_help', fn: testGetSignatureHelp },
		{ name: "rename", fn: testRename },
		//{ name: 'get_code_actions', fn: testGetCodeActions },
		//{ name: 'get_semantic_tokens', fn: testGetSemanticTokens },
		{ name: "get_call_hierarchy", fn: testGetCallHierarchy },
		{ name: "get_type_hierarchy", fn: testGetTypeHierarchy },
		//{ name: 'get_code_lens', fn: testGetCodeLens },
		//{ name: 'get_selection_range', fn: testGetSelectionRange },
		{ name: "get_type_definition", fn: testGetTypeDefinition },
		{ name: "get_declaration", fn: testGetDeclaration },
		//{ name: 'get_document_highlights', fn: testGetDocumentHighlights },
		//{ name: 'get_workspace_symbols', fn: testGetWorkspaceSymbols },
		//{ name: 'get_symbol_code_snippet', fn: testGetSymbolCodeSnippet },
		//{ name: 'get_symbols', fn: testGetSymbols },
		//{ name: 'get_symbols_overview', fn: testGetSymbolsOverview },
		{ name: "insert_after_symbol", fn: testInsertAfterSymbol },
		{ name: "insert_before_symbol", fn: testInsertBeforeSymbol },
		{ name: "replace_symbol_body", fn: testReplaceSymbolBody },
	]

	const results: TestResult[] = []
	let passedCount = 0
	let failedCount = 0

	// Clean up any existing test files
	console.log("[Debug] Cleaning up existing test files before run.")
	await cleanupTestFiles()
	console.log("[Debug] Cleanup before run complete.")

	for (const test of testFunctions) {
		outputChannel.appendLine(`Running test: ${test.name}`)
		console.log(`[Debug] Starting test: ${test.name}`)

		try {
			const result = await test.fn()
			results.push(result)

			if (result.passed) {
				passedCount++
			} else {
				failedCount++
			}

			outputChannel.appendLine(formatTestResult(result))
			outputChannel.appendLine("")
			console.log(`[Debug] Finished test: ${test.name}`)
		} catch (error) {
			console.error(`[Debug] CRITICAL ERROR in test: ${test.name}`, error)
			const result: TestResult = {
				tool: test.name,
				passed: false,
				error: error instanceof Error ? error.message : String(error),
			}
			results.push(result)
			failedCount++

			outputChannel.appendLine(formatTestResult(result))
			outputChannel.appendLine("")
		}
	}

	// Clean up test files
	console.log("[Debug] Cleaning up test files after run.")
	await cleanupTestFiles()
	console.log("[Debug] Cleanup after run complete.")

	// Summary
	outputChannel.appendLine("=".repeat(60))
	outputChannel.appendLine("Test Summary")
	outputChannel.appendLine("=".repeat(60))
	outputChannel.appendLine(`Total Tests: ${results.length}`)
	outputChannel.appendLine(`Passed: ${passedCount}`)
	outputChannel.appendLine(`Failed: ${failedCount}`)
	outputChannel.appendLine("")

	if (failedCount > 0) {
		outputChannel.appendLine("Failed Tests:")
		results
			.filter((r) => !r.passed)
			.forEach((r) => {
				outputChannel.appendLine(`  - ${r.tool}: ${r.error || "Unknown error"}`)
			})
	}

	outputChannel.appendLine("")
	outputChannel.appendLine("All tests completed!")
	console.log("[Debug] runAllLspTests finished.")

	// Show notification
	if (failedCount === 0) {
		vscode.window.showInformationMessage(`All ${results.length} LSP tool tests passed! 🎉`).then(
			() => {},
			() => {},
		) // Ignore promise resolution/rejection
	} else {
		vscode.window.showWarningMessage(`LSP tool tests completed: ${passedCount} passed, ${failedCount} failed`).then(
			() => {},
			() => {},
		) // Ignore promise resolution/rejection
	}
}
