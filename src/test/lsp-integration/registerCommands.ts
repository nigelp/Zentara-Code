/**
 * Register VS Code commands for LSP integration testing
 */

import * as vscode from "vscode"
import { runAllLspTests, runSpecificLspTest, getAvailableTests } from "./runAllTests"

/**
 * Register all LSP test commands
 */
export function registerLspTestCommands(context: vscode.ExtensionContext): void {
	// Command to run all LSP tests
	const runAllTestsCommand = vscode.commands.registerCommand("zentara.runAllLspTests", async () => {
		try {
			// Check if we have a workspace
			if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
				const result = await vscode.window.showWarningMessage(
					"No workspace folder is open. LSP tests require a workspace. Continue anyway?",
					"Yes",
					"No",
				)

				if (result !== "Yes") {
					return
				}
			}

			// Show progress notification
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: "Running LSP Integration Tests",
					cancellable: false,
				},
				async (progress) => {
					progress.report({ message: "Initializing tests..." })

					// Run all tests
					await runAllLspTests()

					progress.report({ increment: 100, message: "Tests completed!" })
				},
			)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			vscode.window.showErrorMessage(`Failed to run LSP tests: ${errorMessage}`)
			console.error("LSP test execution error:", error)
		}
	})

	// Command to run a specific LSP test
	const runSpecificTestCommand = vscode.commands.registerCommand("zentara.runSpecificLspTest", async () => {
		try {
			// Get list of available tests
			const tests = getAvailableTests()

			// Show quick pick to select a test
			const selected = await vscode.window.showQuickPick(tests, {
				placeHolder: "Select an LSP test to run",
				title: "Run Specific LSP Test",
			})

			if (!selected) {
				return
			}

			// Run the selected test
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Running LSP Test: ${selected}`,
					cancellable: false,
				},
				async (progress) => {
					progress.report({ message: "Running test..." })
					await runSpecificLspTest(selected)
					progress.report({ increment: 100, message: "Test completed!" })
				},
			)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			vscode.window.showErrorMessage(`Failed to run test: ${errorMessage}`)
			console.error("LSP test execution error:", error)
		}
	})

	// Command to show LSP test status
	const showTestStatusCommand = vscode.commands.registerCommand("zentara.showLspTestStatus", async () => {
		const tests = getAvailableTests()
		const message = `LSP Integration Tests Status:
• Total tests available: ${tests.length}
• Tests: ${tests.slice(0, 5).join(", ")}${tests.length > 5 ? "..." : ""}
• Run command: zentara.runAllLspTests`

		vscode.window.showInformationMessage(message, "Run All Tests", "Run Specific Test").then((selection) => {
			if (selection === "Run All Tests") {
				vscode.commands.executeCommand("zentara.runAllLspTests")
			} else if (selection === "Run Specific Test") {
				vscode.commands.executeCommand("zentara.runSpecificLspTest")
			}
		})
	})

	// Register commands
	context.subscriptions.push(runAllTestsCommand)
	context.subscriptions.push(runSpecificTestCommand)
	context.subscriptions.push(showTestStatusCommand)

	// Add status bar item for quick access
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
	statusBarItem.text = "$(beaker) LSP Tests"
	statusBarItem.tooltip = "Run LSP Integration Tests"
	statusBarItem.command = "zentara.showLspTestStatus"
	statusBarItem.show()

	context.subscriptions.push(statusBarItem)

	console.log("LSP test commands registered successfully")
}

/**
 * Extension activation function
 * This should be called from your main extension.ts file
 */
export function activateLspTestCommands(context: vscode.ExtensionContext): void {
	registerLspTestCommands(context)
}
