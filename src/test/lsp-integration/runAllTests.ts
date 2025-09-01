/**
 * Main test runner for all LSP integration tests
 * This file orchestrates the execution of all 24 LSP tool tests
 */

import * as vscode from "vscode"
import { TestReporter, cleanupTestFiles } from "./testUtils"

// Import all test functions
import { testFindUsages } from "./findUsages.test"
import { testGoToDefinition } from "./goToDefinition.test"
import { testFindImplementations } from "./findImplementations.test"
import { testGetHoverInfo } from "./getHoverInfo.test"
import { testGetDocumentSymbols } from "./getDocumentSymbols.test"
import { testGetCompletions } from "./getCompletions.test"
import { WtestRename as testRename } from "./rename.test"
import { testGetSignatureHelp } from "./getSignatureHelp.test"
import { testGetCodeActions } from "./getCodeActions.test"
import { testGetSemanticTokens } from "./getSemanticTokens.test"
import { testGetCallHierarchy } from "./getCallHierarchy.test"
import { testGetTypeHierarchy } from "./getTypeHierarchy.test"
import { testGetCodeLens } from "./getCodeLens.test"
import { testGetSelectionRange } from "./getSelectionRange.test"
import { testGetTypeDefinition } from "./getTypeDefinition.test"
import { testGetDeclaration } from "./getDeclaration.test"
import { testGetDocumentHighlights } from "./getDocumentHighlights.test"
import { testGetWorkspaceSymbols } from "./getWorkspaceSymbols.test"
import { testGetSymbolCodeSnippet } from "./getSymbolCodeSnippet.test"
import { testGetSymbolChildren } from "./getSymbolChildren.test"
import { testGetSymbols } from "./getSymbols.test"
import { testGetSymbolsOverview } from "./getSymbolsOverview.test"
import { testInsertAfterSymbol } from "./insertAfterSymbol.test"
import { testInsertBeforeSymbol } from "./insertBeforeSymbol.test"
import { testReplaceSymbolBody } from "./replaceSymbolBody.test"

// Test configuration
interface TestConfig {
	name: string
	testFunction: (reporter: TestReporter) => Promise<void>
	enabled: boolean
}

// List of all LSP tests
const LSP_TESTS: TestConfig[] = [
	{ name: "findUsages", testFunction: testFindUsages, enabled: true },
	// { name: "goToDefinition", testFunction: testGoToDefinition, enabled: true },
	// { name: "findImplementations", testFunction: testFindImplementations, enabled: true },
	// { name: "getHoverInfo", testFunction: testGetHoverInfo, enabled: true },
	//{ name: "getDocumentSymbols", testFunction: testGetDocumentSymbols, enabled: true },
	{ name: "getCompletions", testFunction: testGetCompletions, enabled: true },
	// { name: "rename", testFunction: testRename, enabled: true },
	// { name: "getSignatureHelp", testFunction: testGetSignatureHelp, enabled: true },
	// { name: "getCodeActions", testFunction: testGetCodeActions, enabled: true },
	// { name: "getSemanticTokens", testFunction: testGetSemanticTokens, enabled: true },
	// { name: "getCallHierarchy", testFunction: testGetCallHierarchy, enabled: true },
	// { name: "getTypeHierarchy", testFunction: testGetTypeHierarchy, enabled: true },
	// { name: "getCodeLens", testFunction: testGetCodeLens, enabled: true },
	// { name: "getSelectionRange", testFunction: testGetSelectionRange, enabled: true },
	// { name: "getTypeDefinition", testFunction: testGetTypeDefinition, enabled: true },
	// { name: "getDeclaration", testFunction: testGetDeclaration, enabled: true },
	// { name: "getDocumentHighlights", testFunction: testGetDocumentHighlights, enabled: true },
	// { name: "getWorkspaceSymbols", testFunction: testGetWorkspaceSymbols, enabled: true },
	//  { name: "getSymbolCodeSnippet", testFunction: testGetSymbolCodeSnippet, enabled: true },
	{ name: "getSymbolChildren", testFunction: testGetSymbolChildren, enabled: true },
	// { name: "getSymbols", testFunction: testGetSymbols, enabled: true },
	// { name: "getSymbolsOverview", testFunction: testGetSymbolsOverview, enabled: true },
	// { name: "insertAfterSymbol", testFunction: testInsertAfterSymbol, enabled: true },
	//{ name: "insertBeforeSymbol", testFunction: testInsertBeforeSymbol, enabled: true },
	// { name: "replaceSymbolBody", testFunction: testReplaceSymbolBody, enabled: true },
]

/**
 * Run all LSP integration tests
 */
export async function runAllLspTests(): Promise<void> {
	const reporter = new TestReporter()
	const outputChannel = vscode.window.createOutputChannel("LSP Integration Tests")
	outputChannel.show()

	outputChannel.appendLine("")
	outputChannel.appendLine("🚀 Starting LSP Integration Tests")
	outputChannel.appendLine("=".repeat(60))
	outputChannel.appendLine(`📅 Date: ${new Date().toISOString()}`)
	outputChannel.appendLine(`📁 Workspace: ${vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "No workspace"}`)
	outputChannel.appendLine("=".repeat(60))

	const startTime = Date.now()
	let testsRun = 0
	let testsFailed = 0

	// Run tests sequentially to avoid conflicts
	for (const test of LSP_TESTS) {
		if (!test.enabled) {
			outputChannel.appendLine(`⏭️ Skipping: ${test.name} (disabled)`)
			continue
		}

		outputChannel.appendLine("")
		outputChannel.appendLine(`📝 Running: ${test.name}`)
		outputChannel.appendLine("-".repeat(40))

		try {
			await test.testFunction(reporter)
			testsRun++
			outputChannel.appendLine(`✅ Completed: ${test.name}`)
		} catch (error) {
			testsFailed++
			testsRun++
			const errorMessage = error instanceof Error ? error.message : String(error)
			outputChannel.appendLine(`❌ Failed: ${test.name}`)
			outputChannel.appendLine(`   Error: ${errorMessage}`)
			console.error(`Test ${test.name} failed:`, error)
		}
	}

	// Clean up test files
	try {
		await cleanupTestFiles()
		outputChannel.appendLine("\n🧹 Test files cleaned up successfully")
	} catch (error) {
		outputChannel.appendLine("\n⚠️ Warning: Failed to clean up some test files")
	}

	// Generate and display summary
	const duration = Date.now() - startTime
	const summary = reporter.getSummary()

	outputChannel.appendLine("")
	outputChannel.appendLine(summary)
	outputChannel.appendLine("")
	outputChannel.appendLine("📈 Test Suite Summary")
	outputChannel.appendLine("=".repeat(60))
	outputChannel.appendLine(`Total Test Suites: ${testsRun}`)
	outputChannel.appendLine(`Failed Test Suites: ${testsFailed}`)
	outputChannel.appendLine(`Success Rate: ${(((testsRun - testsFailed) / testsRun) * 100).toFixed(1)}%`)
	outputChannel.appendLine(`Total Duration: ${(duration / 1000).toFixed(2)}s`)
	outputChannel.appendLine("=".repeat(60))

	// Show notification
	const results = reporter.getResults()
	const totalTests = results.length
	const passedTests = results.filter((r) => r.passed).length
	const failedTests = totalTests - passedTests

	if (failedTests === 0) {
		vscode.window.showInformationMessage(`✅ All LSP tests passed! (${passedTests}/${totalTests})`)
	} else {
		vscode.window.showWarningMessage(
			`⚠️ LSP tests completed with failures: ${passedTests} passed, ${failedTests} failed`,
		)
	}

	// Save test results to a file (optional)
	if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
		const resultsPath = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, ".lsp-test-results.json")

		const resultsData = {
			timestamp: new Date().toISOString(),
			duration: duration,
			totalTests: totalTests,
			passed: passedTests,
			failed: failedTests,
			results: results,
			summary: {
				testSuites: testsRun,
				failedSuites: testsFailed,
				successRate: (((testsRun - testsFailed) / testsRun) * 100).toFixed(1) + "%",
			},
		}

		try {
			const encoder = new TextEncoder()
			await vscode.workspace.fs.writeFile(resultsPath, encoder.encode(JSON.stringify(resultsData, null, 2)))
			outputChannel.appendLine(`\n💾 Test results saved to: ${resultsPath.fsPath}`)
		} catch (error) {
			outputChannel.appendLine("\n⚠️ Failed to save test results to file")
		}
	}
}

/**
 * Run a specific LSP test by name
 */
export async function runSpecificLspTest(testName: string): Promise<void> {
	const test = LSP_TESTS.find((t) => t.name === testName)

	if (!test) {
		vscode.window.showErrorMessage(`Test "${testName}" not found`)
		return
	}

	const reporter = new TestReporter()
	const outputChannel = vscode.window.createOutputChannel(`LSP Test: ${testName}`)
	outputChannel.show()

	outputChannel.appendLine(`Running LSP test: ${testName}`)
	outputChannel.appendLine("=".repeat(40))

	try {
		await test.testFunction(reporter)
		const summary = reporter.getSummary()
		outputChannel.appendLine(summary)

		const results = reporter.getResults()
		const failed = results.filter((r) => !r.passed).length

		if (failed === 0) {
			vscode.window.showInformationMessage(`✅ Test "${testName}" passed!`)
		} else {
			vscode.window.showWarningMessage(`⚠️ Test "${testName}" had ${failed} failures`)
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		outputChannel.appendLine(`❌ Test failed: ${errorMessage}`)
		vscode.window.showErrorMessage(`Test "${testName}" failed: ${errorMessage}`)
	}

	// Clean up
	await cleanupTestFiles()
}

/**
 * Get list of available test names
 */
export function getAvailableTests(): string[] {
	return LSP_TESTS.filter((t) => t.enabled).map((t) => t.name)
}
