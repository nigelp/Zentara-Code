import * as vscode from "vscode"
import * as path from "path"

export async function runSubagentTestsCommand(): Promise<void> {
	// Check if we should run in debug mode based on whether there are active breakpoints
	const hasBreakpoints = vscode.debug.breakpoints.length > 0

	if (hasBreakpoints) {
		// Run tests in debug mode using VS Code's debug API
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
		if (!workspaceFolder) {
			vscode.window.showErrorMessage("No workspace folder found")
			return
		}

		const debugConfig: vscode.DebugConfiguration = {
			type: "node",
			request: "launch",
			name: "Debug Subagent Tests",
			runtimeExecutable: "tsx",
			program: path.join(workspaceFolder.uri.fsPath, "src/roo_subagent/__tests__/runTests.ts"),
			cwd: path.join(workspaceFolder.uri.fsPath, "src"),
			sourceMaps: true,
			env: {
				NODE_ENV: "test",
			},
			resolveSourceMapLocations: ["${workspaceFolder}/**", "!**/node_modules/**"],
			skipFiles: ["<node_internals>/**", "**/node_modules/**"],
		}

		// Start debugging session
		await vscode.debug.startDebugging(workspaceFolder, debugConfig)

		vscode.window.showInformationMessage("Debugging Subagent tests. Breakpoints are active.")
	} else {
		// Run tests normally without debugging
		const outputChannel = vscode.window.createOutputChannel("Subagent Tests")
		outputChannel.show()

		// Import dynamically to avoid loading when debugging
		const { runAllTests } = await import("../../roo_subagent/__tests__/subagentTool.test")

		// Redirect console.log to output channel
		const originalLog = console.log
		const originalError = console.error

		console.log = (...args) => {
			outputChannel.appendLine(args.join(" "))
		}

		console.error = (...args) => {
			outputChannel.appendLine(`ERROR: ${args.join(" ")}`)
		}

		try {
			outputChannel.appendLine("Starting Subagent Tests...")
			outputChannel.appendLine("=".repeat(50))

			await runAllTests()

			outputChannel.appendLine("\nTests completed successfully!")
			vscode.window.showInformationMessage("Subagent tests completed. Check the output panel for results.")
		} catch (error) {
			outputChannel.appendLine(`\nTest execution failed: ${error}`)
			vscode.window.showErrorMessage(`Subagent tests failed: ${error}`)
		} finally {
			// Restore original console methods
			console.log = originalLog
			console.error = originalError
		}
	}
}
