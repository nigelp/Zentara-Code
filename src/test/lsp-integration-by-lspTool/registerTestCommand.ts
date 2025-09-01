import * as vscode from "vscode"
import { runAllLspTests } from "./runAllTests"

/**
 * Registers the VS Code command to run all LSP integration tests
 * This should be called from the extension's activate function
 */
export function registerLspTestCommand(context: vscode.ExtensionContext): void {
	const disposable = vscode.commands.registerCommand("zentara.runLspIntegrationTests", async () => {
		try {
			vscode.window.showInformationMessage("Starting LSP Tool Integration Tests...").then(
				() => {},
				() => {},
			) // Ignore promise resolution/rejection
			await runAllLspTests()
		} catch (error) {
			vscode.window
				.showErrorMessage(
					`Failed to run LSP integration tests: ${error instanceof Error ? error.message : String(error)}`,
				)
				.then(
					() => {},
					() => {},
				) // Ignore promise resolution/rejection
			console.error("LSP integration test error:", error)
		}
	})

	context.subscriptions.push(disposable)

	// Log that the command has been registered
	console.log("LSP Integration Test command registered: zentara.runLspIntegrationTests")
}

/**
 * Alternative command registration that can be called directly
 * without needing the extension context
 */
export function registerStandaloneLspTestCommand(): vscode.Disposable {
	return vscode.commands.registerCommand("zentara.runLspIntegrationTestsStandalone", async () => {
		const outputChannel = vscode.window.createOutputChannel("LSP Test Command")
		outputChannel.show()

		outputChannel.appendLine("=".repeat(60))
		outputChannel.appendLine("Running LSP Integration Tests (Standalone)")
		outputChannel.appendLine("=".repeat(60))
		outputChannel.appendLine("")

		try {
			await runAllLspTests()
			outputChannel.appendLine("Tests completed successfully!")
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			outputChannel.appendLine(`Error running tests: ${errorMessage}`)
			vscode.window.showErrorMessage(`LSP Tests failed: ${errorMessage}`).then(
				() => {},
				() => {},
			) // Ignore promise resolution/rejection
		}
	})
}
