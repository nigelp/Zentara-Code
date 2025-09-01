import * as vscode from "vscode"

// Create a mock output channel before importing the logging module
const mockOutputChannel = {
	appendLine: jest.fn(),
	append: jest.fn(),
	clear: jest.fn(),
	show: jest.fn(),
	hide: jest.fn(),
	dispose: jest.fn(),
}

// Mock vscode.window.createOutputChannel before importing logging module
;(vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel)

// Now import the logging module after mocking
import { logInfo, logError, lspOutputChannel } from "../logging"

describe("logging", () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe("lspOutputChannel", () => {
		it("should be created with correct name", () => {
			// The channel was created when the module was imported
			// Since we mocked it before import, we can check if it's the same instance
			expect(lspOutputChannel).toBe(mockOutputChannel)
		})
	})

	describe("logInfo", () => {
		it("should log info message with [INFO] prefix", () => {
			const message = "Test info message"

			logInfo(message)

			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(`[INFO] ${message}`)
		})

		it("should handle empty string", () => {
			logInfo("")

			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith("[INFO] ")
		})

		it("should handle messages with special characters", () => {
			const message = "Message with \n newline and \t tab"

			logInfo(message)

			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(`[INFO] ${message}`)
		})

		it("should handle very long messages", () => {
			const message = "a".repeat(1000)

			logInfo(message)

			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(`[INFO] ${message}`)
		})
	})

	describe("logError", () => {
		it("should log error message without error object", () => {
			const message = "Test error message"

			logError(message)

			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(`[ERROR] ${message}`)
			expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(1)
		})

		it("should log error message with error object", () => {
			const message = "Test error message"
			const error = new Error("Error details")

			logError(message, error)

			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(`[ERROR] ${message}: ${error.toString()}`)
			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(error.stack)
			expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(2)
		})

		it("should handle error without stack trace", () => {
			const message = "Test error message"
			const error = { toString: () => "Custom error" }

			logError(message, error)

			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(`[ERROR] ${message}: Custom error`)
			expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(1)
		})

		it("should handle error with custom toString", () => {
			const message = "Test error message"
			const error = {
				toString: () => "CustomError: Something went wrong",
				stack: "Stack trace here",
			}

			logError(message, error)

			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
				`[ERROR] ${message}: CustomError: Something went wrong`,
			)
			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith("Stack trace here")
		})

		it("should handle null error object", () => {
			const message = "Test error message"

			logError(message, null)

			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(`[ERROR] ${message}`)
			expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(1)
		})

		it("should handle undefined error object", () => {
			const message = "Test error message"

			logError(message, undefined)

			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(`[ERROR] ${message}`)
			expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(1)
		})

		it("should handle error objects with circular references", () => {
			const message = "Test error message"
			const error: any = new Error("Circular error")
			error.circular = error // Create circular reference

			logError(message, error)

			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(`[ERROR] ${message}: Error: Circular error`)
			expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(2) // Message + stack
		})

		it("should handle non-Error objects as errors", () => {
			const message = "Test error message"
			const error = { code: "ERR_001", message: "Custom error object" }

			logError(message, error)

			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(`[ERROR] ${message}: [object Object]`)
			expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(1)
		})

		it("should handle string as error", () => {
			const message = "Test error message"
			const error = "String error"

			logError(message, error)

			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(`[ERROR] ${message}: String error`)
			expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(1)
		})

		it("should handle number as error", () => {
			const message = "Test error message"
			const error = 404

			logError(message, error)

			expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(`[ERROR] ${message}: 404`)
			expect(mockOutputChannel.appendLine).toHaveBeenCalledTimes(1)
		})
	})
})
