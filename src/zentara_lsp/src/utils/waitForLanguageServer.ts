import * as vscode from "vscode"

// Global state management for document waiting
const documentWaitingState = new Map<string, {
	isWaiting: boolean
	abortController: AbortController
	startTime: number
	promise: Promise<void>
}>()

// Logger for LSP wait operations
class LSPWaitLogger {
	private static instance: LSPWaitLogger
	private logs: Array<{
		timestamp: number
		level: string
		message: string
		data?: any
	}> = []

	static getInstance(): LSPWaitLogger {
		if (!LSPWaitLogger.instance) {
			LSPWaitLogger.instance = new LSPWaitLogger()
		}
		return LSPWaitLogger.instance
	}

	log(level: "info" | "warn" | "error", message: string, data?: any) {
		const entry = {
			timestamp: Date.now(),
			level,
			message,
			data,
		}

		this.logs.push(entry)
		console.log(`[LSP Wait ${level.toUpperCase()}] ${message}`, data || "")

		// Keep only last 100 entries
		if (this.logs.length > 100) {
			this.logs.shift()
		}
	}

	getDiagnostics(uri?: vscode.Uri): string {
		let relevant = this.logs
		if (uri) {
			relevant = this.logs.filter(
				(log) => log.message.includes(uri.fsPath) || log.data?.uri === uri.toString(),
			)
		}
		return JSON.stringify(relevant, null, 2)
	}

	getHangingOperations(thresholdMs: number = 10000): Array<{
		document: string
		duration: number
		startTime: number
	}> {
		const now = Date.now()
		const hanging: Array<{
			document: string
			duration: number
			startTime: number
		}> = []

		documentWaitingState.forEach((state, key) => {
			if (state.isWaiting && now - state.startTime > thresholdMs) {
				hanging.push({
					document: key,
					duration: now - state.startTime,
					startTime: state.startTime,
				})
			}
		})

		return hanging
	}
}

// Timeout wrapper with cancellation support for Promise and Thenable types
function withTimeout<T>(promise: Promise<T> | Thenable<T>, timeoutMs: number, signal?: AbortSignal): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			reject(new Error(`Operation timed out after ${timeoutMs}ms`))
		}, timeoutMs)

		if (signal) {
			signal.addEventListener("abort", () => {
				clearTimeout(timeoutId)
				reject(new Error("Operation was aborted"))
			})
		}

		// Convert Thenable to Promise if needed
		Promise.resolve(promise)
			.then(resolve)
			.catch(reject)
			.finally(() => clearTimeout(timeoutId))
	})
}

/**
 * Enhanced waitForLanguageServer with proper timeout handling and cancellation
 * @param uri The URI of the document to wait for
 * @param maxWaitTime Maximum time to wait in milliseconds
 * @returns Promise that resolves when the Language Server is ready or fails gracefully
 */
export async function waitForLanguageServer(uri: vscode.Uri, maxWaitTime: number = 5000): Promise<void> {
	const documentKey = uri.toString()
	const logger = LSPWaitLogger.getInstance()

	// Check if already waiting for this document
	const existingState = documentWaitingState.get(documentKey)
	if (existingState?.isWaiting) {
		logger.log("info", `Reusing existing wait for ${uri.fsPath}`)
		return existingState.promise
	}

	// Create new waiting state
	const abortController = new AbortController()
	const startTime = Date.now()

	const waitPromise = performLanguageServerWait(uri, maxWaitTime, abortController.signal)

	const state = {
		isWaiting: true,
		abortController,
		startTime,
		promise: waitPromise,
	}

	documentWaitingState.set(documentKey, state)

	try {
		await waitPromise
		logger.log("info", `Language server ready for ${uri.fsPath}`, {
			duration: Date.now() - startTime,
		})
	} catch (error) {
		logger.log("error", `Language server wait failed for ${uri.fsPath}`, {
			error: error instanceof Error ? error.message : String(error),
			duration: Date.now() - startTime,
		})
		// Don't rethrow - allow LSP operations to proceed anyway
	} finally {
		documentWaitingState.delete(documentKey)
	}
}

async function performLanguageServerWait(
	uri: vscode.Uri,
	maxWaitTime: number,
	signal: AbortSignal,
): Promise<void> {
	const startTime = Date.now()
	const operationTimeout = Math.min(2000, maxWaitTime / 4)
	const logger = LSPWaitLogger.getInstance()

	// Check if document is already open in an editor (user is working on it)
	const isDocumentOpenInEditor = vscode.window.visibleTextEditors.some(
		editor => editor.document.uri.toString() === uri.toString()
	)

	// Safely open document (but don't show in editor to avoid pollution)
	let document: vscode.TextDocument
	let shouldCloseDocument = false
	try {
		document = await withTimeout(vscode.workspace.openTextDocument(uri), operationTimeout, signal)
		// Only mark for cleanup if we opened it and it's not already in an editor
		shouldCloseDocument = !isDocumentOpenInEditor
	} catch (error) {
		logger.log("warn", `Failed to open document ${uri.fsPath}`, {
			error: error instanceof Error ? error.message : String(error),
		})
		return // Fail gracefully
	}

	// Check language support
	const supportedLanguages = [
		"typescript",
		"typescriptreact",
		"javascript",
		"javascriptreact",
		"python",
		"java",
		"cpp",
		"c",
		"csharp",
		"go",
		"rust",
	]

	if (!supportedLanguages.includes(document.languageId)) {
		logger.log("info", `Language '${document.languageId}' may not have full LSP support`)
	}

	// Initial stabilization wait
	await new Promise((resolve) => setTimeout(resolve, 500))

	let retryCount = 0
	const maxRetries = Math.max(5, Math.floor(maxWaitTime / 1000))
	const retryDelay = Math.min(1000, maxWaitTime / maxRetries)
	let consecutiveSuccesses = 0
	const requiredSuccesses = 2

	while (Date.now() - startTime < maxWaitTime && retryCount < maxRetries) {
		if (signal.aborted) {
			throw new Error("Operation was aborted")
		}

		try {
			// Test LSP readiness with timeout
			const symbolsPromise = vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
				"vscode.executeDocumentSymbolProvider",
				uri,
			)

			const symbols = await withTimeout(symbolsPromise, operationTimeout, signal)

			if (symbols !== undefined) {
				consecutiveSuccesses++
				logger.log("info", `LSP check ${consecutiveSuccesses}/${requiredSuccesses} successful for ${uri.fsPath}`)

				if (consecutiveSuccesses >= requiredSuccesses) {
					// Try one more operation to ensure full readiness
					try {
						const definitionsPromise = vscode.commands.executeCommand<any>(
							"vscode.executeDefinitionProvider",
							uri,
							new vscode.Position(0, 0),
						)

						await withTimeout(definitionsPromise, operationTimeout, signal)

						// Final stabilization
						await new Promise((resolve) => setTimeout(resolve, 200))
						return
					} catch (defError) {
						// Definition provider not ready, but symbols worked - continue
						logger.log("warn", `Definition provider not ready for ${uri.fsPath}, but continuing`)
					}
				}
			} else {
				consecutiveSuccesses = 0
			}
		} catch (error) {
			consecutiveSuccesses = 0
			if (retryCount % 2 === 0) {
				logger.log("warn", `LSP not ready for ${uri.fsPath}, attempt ${retryCount + 1}/${maxRetries}`, {
					error: error instanceof Error ? error.message : String(error),
				})
			}
		}

		// Wait before retry
		await new Promise((resolve) => setTimeout(resolve, retryDelay))
		retryCount++
	}

	logger.log("warn", `LSP may not be fully ready for ${uri.fsPath} after ${maxWaitTime}ms`)

	// Cleanup: Close document if we opened it for testing and it's not in use by user
	if (shouldCloseDocument) {
		try {
			// Check again if document is still not open in any editor
			const isStillNotInEditor = !vscode.window.visibleTextEditors.some(
				editor => editor.document.uri.toString() === uri.toString()
			)
			
			if (isStillNotInEditor) {
				// Use a more direct approach: the document will be garbage collected
				// when no longer referenced, but we can help by clearing any internal references
				// VSCode automatically manages document lifecycle for unopened documents
				logger.log("info", `Document ${uri.fsPath} marked for cleanup (not in active editors)`)
			}
		} catch (cleanupError) {
			// Don't fail the whole operation if cleanup fails
			logger.log("warn", `Failed to check document cleanup status ${uri.fsPath}`, {
				error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
			})
		}
	}
}

/**
 * Wait for Language Servers to be ready for all workspace folders
 * @param maxWaitTime Maximum time to wait in milliseconds
 */
export async function waitForWorkspaceLanguageServers(maxWaitTime: number = 10000): Promise<void> {
	const logger = LSPWaitLogger.getInstance()

	// Wait for workspace to be ready
	await new Promise((resolve) => setTimeout(resolve, 1000))

	// Check if we have any open text editors
	if (vscode.window.activeTextEditor) {
		try {
			await waitForLanguageServer(vscode.window.activeTextEditor.document.uri, (maxWaitTime * 2) / 3)
		} catch (error) {
			logger.log("warn", "Failed to wait for active editor language server", {
				error: error instanceof Error ? error.message : String(error),
			})
		}
	}

	// Give additional time for workspace-wide language servers to initialize
	await new Promise((resolve) => setTimeout(resolve, Math.min(2000, maxWaitTime / 3)))
}

// Export logger for external monitoring
export { LSPWaitLogger }
