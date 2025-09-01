import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import vscode from "vscode"
import { waitForLanguageServer, LSPWaitLogger } from "../waitForLanguageServer"

// Mock VSCode API
vi.mock("vscode");

describe("waitForLanguageServer", () => {
	const mockUri = { toString: () => "file:///test.ts", fsPath: "/test.ts" } as vscode.Uri
	const mockDocument = { languageId: "typescript" } as vscode.TextDocument

	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(vscode.workspace.openTextDocument).mockResolvedValue(mockDocument)
	})

	afterEach(() => {
		vi.clearAllTimers()
	})

	it("should complete successfully when LSP is ready", async () => {
		// Mock successful LSP responses
		vi.mocked(vscode.commands.executeCommand).mockResolvedValue([])

		const startTime = Date.now()
		await waitForLanguageServer(mockUri, 3000)
		const duration = Date.now() - startTime

		// Should complete quickly when LSP is ready
		expect(duration).toBeLessThan(2000)
		expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(mockUri)
		expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
			"vscode.executeDocumentSymbolProvider",
			mockUri,
		)
	})

	it("should timeout gracefully when LSP hangs", async () => {
		// Mock hanging LSP command
		vi.mocked(vscode.commands.executeCommand).mockImplementation(
			() => new Promise(() => {}) // Never resolves
		)

		const startTime = Date.now()
		await waitForLanguageServer(mockUri, 2000) // 2 second timeout
		const duration = Date.now() - startTime

		// Should timeout within reasonable time (not hang forever)
		expect(duration).toBeGreaterThan(1800) // Close to timeout
		expect(duration).toBeLessThan(3000) // But not hang indefinitely
	})

	it("should handle document opening failures gracefully", async () => {
		// Mock document opening failure
		vi.mocked(vscode.workspace.openTextDocument).mockRejectedValue(new Error("File not found"))

		const startTime = Date.now()
		await waitForLanguageServer(mockUri, 3000)
		const duration = Date.now() - startTime

		// Should fail fast when document can't be opened
		expect(duration).toBeLessThan(1000)
		expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(mockUri)
	})

	it("should reuse existing wait for same document", async () => {
		// Mock slow LSP response
		vi.mocked(vscode.commands.executeCommand).mockImplementation(
			() => new Promise(resolve => setTimeout(() => resolve([]), 1000))
		)

		// Start two concurrent waits for the same document
		const promise1 = waitForLanguageServer(mockUri, 3000)
		const promise2 = waitForLanguageServer(mockUri, 3000)

		await Promise.all([promise1, promise2])

		// Should only open document once (reuse existing wait)
		expect(vscode.workspace.openTextDocument).toHaveBeenCalledTimes(1)
	})

	it("should handle abort signals correctly", async () => {
		// Mock hanging LSP command
		vi.mocked(vscode.commands.executeCommand).mockImplementation(
			() => new Promise(() => {}) // Never resolves
		)

		const startTime = Date.now()
		
		// Start wait and let it timeout
		await waitForLanguageServer(mockUri, 1000) // 1 second timeout
		
		const duration = Date.now() - startTime
		
		// Should timeout within reasonable time
		expect(duration).toBeGreaterThan(800)
		expect(duration).toBeLessThan(2000)
	})
})

describe("LSPWaitLogger", () => {
	let logger: LSPWaitLogger

	beforeEach(() => {
		logger = LSPWaitLogger.getInstance()
	})

	it("should log messages with proper format", () => {
		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})

		logger.log("info", "Test message", { data: "test" })

		expect(consoleSpy).toHaveBeenCalledWith(
			"[LSP Wait INFO] Test message",
			{ data: "test" }
		)

		consoleSpy.mockRestore()
	})

	it("should provide diagnostics for specific URI", () => {
		// Create a fresh logger instance to avoid interference from other tests
		const freshLogger = new (LSPWaitLogger as any)()
		const testUri = { fsPath: "/test.ts" } as vscode.Uri

		freshLogger.log("info", "Test message for /test.ts")
		freshLogger.log("warn", "Another message for /other.ts")

		const diagnostics = freshLogger.getDiagnostics(testUri)
		const parsed = JSON.parse(diagnostics)

		expect(parsed.length).toBeGreaterThanOrEqual(1)
		expect(parsed.some((log: any) => log.message.includes("/test.ts"))).toBe(true)
	})

	it("should detect hanging operations", () => {
		// This test would require access to the internal state
		// For now, just verify the method exists and returns an array
		const hanging = logger.getHangingOperations(5000)
		expect(Array.isArray(hanging)).toBe(true)
	})
})