import * as vscode from "vscode"

// Centralized logging for the LSP module
// Handle test environments where vscode.window might not be available
let lspOutputChannel: vscode.OutputChannel | null = null

try {
	if (vscode.window && typeof vscode.window.createOutputChannel === "function") {
		lspOutputChannel = vscode.window.createOutputChannel("Zentara LSP")
	}
} catch (error) {
	// In test environments, vscode.window might not be available
	console.log("[LSP LOGGING] VSCode window API not available, falling back to console logging")
}

export function logInfo(message: string) {
	if (lspOutputChannel) {
		lspOutputChannel.appendLine(`[INFO] ${message}`)
	} else {
		console.log(`[LSP INFO] ${message}`)
	}
}

export function logError(message: string, error?: any) {
	const errorMessage = error ? `[ERROR] ${message}: ${error.toString()}` : `[ERROR] ${message}`

	if (lspOutputChannel) {
		lspOutputChannel.appendLine(errorMessage)
		if (error?.stack) {
			lspOutputChannel.appendLine(error.stack)
		}
	} else {
		console.error(`[LSP ERROR] ${message}`, error)
		if (error?.stack) {
			console.error(error.stack)
		}
	}
}
