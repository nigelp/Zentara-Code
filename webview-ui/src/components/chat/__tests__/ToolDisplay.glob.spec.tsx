import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { ToolDisplay } from "../ToolDisplay"

// Mock dependencies
vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, defaultValue?: string) => defaultValue || key,
	}),
	Trans: ({ i18nKey, children }: any) => <span>{i18nKey || children}</span>,
}))

// Mock console.log to capture debug logs
const originalConsoleLog = console.log
let consoleLogSpy: any

describe("ToolDisplay - Glob Tool", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// Spy on console.log
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {})
	})

	afterEach(() => {
		consoleLogSpy.mockRestore()
	})

	describe("Glob tool display", () => {
		it("should display glob tool with pattern and path", () => {
			const askText = JSON.stringify({
				tool: "glob",
				content: "**/*.ts",
				path: "src/components",
				isOutsideWorkspace: false,
			})

			render(<ToolDisplay askType="tool" askText={askText} />)

			// Check header
			expect(screen.getByText("Wants to find files matching pattern")).toBeInTheDocument()

			// Check pattern display
			expect(screen.getByText("Pattern:")).toBeInTheDocument()
			expect(screen.getByText("**/*.ts")).toBeInTheDocument()

			// Check path display
			expect(screen.getByText("Search in:")).toBeInTheDocument()
			expect(screen.getByText("src/components")).toBeInTheDocument()

			// Check console log was called with debug info
			expect(consoleLogSpy).toHaveBeenCalledWith(
				"[ToolDisplay] glob tool data:",
				expect.objectContaining({
					content: "**/*.ts",
					path: "src/components",
					isOutsideWorkspace: false,
				}),
			)
		})

		it("should show warning for paths outside workspace", () => {
			const askText = JSON.stringify({
				tool: "glob",
				content: "*.json",
				path: "../outside",
				isOutsideWorkspace: true,
			})

			render(<ToolDisplay askType="tool" askText={askText} />)

			// Check warning message
			expect(screen.getByText("⚠️ This path is outside the workspace")).toBeInTheDocument()
		})

		it("should only show pattern when path is not provided", () => {
			const askText = JSON.stringify({
				tool: "glob",
				content: "**/*.md",
				isOutsideWorkspace: false,
			})

			render(<ToolDisplay askType="tool" askText={askText} />)

			// Check pattern is shown
			expect(screen.getByText("Pattern:")).toBeInTheDocument()
			expect(screen.getByText("**/*.md")).toBeInTheDocument()

			// Check that path section is not shown
			expect(screen.queryByText("Search in:")).not.toBeInTheDocument()
		})

		it("should not show details section when content is empty", () => {
			const askText = JSON.stringify({
				tool: "glob",
				content: "",
				path: "src",
				isOutsideWorkspace: false,
			})

			render(<ToolDisplay askType="tool" askText={askText} />)

			// Check header is shown
			expect(screen.getByText("Wants to find files matching pattern")).toBeInTheDocument()

			// Check that pattern is not shown when empty
			expect(screen.queryByText("Pattern:")).not.toBeInTheDocument()

			// Path should still be shown if provided
			expect(screen.getByText("Search in:")).toBeInTheDocument()
			expect(screen.getByText("src")).toBeInTheDocument()
		})

		it("should not show details when both content and path are empty/missing", () => {
			const askText = JSON.stringify({
				tool: "glob",
				isOutsideWorkspace: false,
			})

			render(<ToolDisplay askType="tool" askText={askText} />)

			// Check header is shown
			expect(screen.getByText("Wants to find files matching pattern")).toBeInTheDocument()

			// Check that details section is not shown
			expect(screen.queryByText("Pattern:")).not.toBeInTheDocument()
			expect(screen.queryByText("Search in:")).not.toBeInTheDocument()
		})

		it("should handle complex glob patterns", () => {
			const patterns = [
				"**/*.{js,ts,jsx,tsx}",
				"src/**/[A-Z]*.tsx",
				"**/{package.json,tsconfig.json}",
				"**/!(node_modules)/**/*.test.js",
				"**/*.spec.{ts,tsx}",
			]

			patterns.forEach((pattern) => {
				const askText = JSON.stringify({
					tool: "glob",
					content: pattern,
					path: ".",
					isOutsideWorkspace: false,
				})

				const { unmount } = render(<ToolDisplay askType="tool" askText={askText} />)

				// Check pattern is displayed correctly
				expect(screen.getByText(pattern)).toBeInTheDocument()

				unmount()
			})
		})

		it("should handle different path formats", () => {
			const pathTests = [
				{ path: "./src", shouldShow: true },
				{ path: "src/components", shouldShow: true },
				{ path: "../parent", shouldShow: true },
				{ path: "/absolute/path", shouldShow: true },
			]

			pathTests.forEach(({ path, shouldShow }) => {
				const askText = JSON.stringify({
					tool: "glob",
					content: "*.ts",
					path: path,
					isOutsideWorkspace: false,
				})

				const { unmount } = render(<ToolDisplay askType="tool" askText={askText} />)

				if (shouldShow) {
					expect(screen.getByText("Search in:")).toBeInTheDocument()
					expect(screen.getByText(path)).toBeInTheDocument()
				}

				unmount()
			})
		})

		it("should handle invalid JSON gracefully", () => {
			const askText = "invalid json"

			render(<ToolDisplay askType="tool" askText={askText} />)

			// Should show generic tool request
			expect(screen.getByText("Tool Request")).toBeInTheDocument()
			expect(screen.getByText(askText)).toBeInTheDocument()
		})

		it("should handle missing askText", () => {
			render(<ToolDisplay askType="tool" />)

			// Should show generic message
			expect(screen.getByText("Tool Request (details missing)")).toBeInTheDocument()
		})
	})

	describe("Console logging", () => {
		it("should log glob tool data to console", () => {
			const askText = JSON.stringify({
				tool: "glob",
				content: "*.config.js",
				path: "configs",
				isOutsideWorkspace: false,
			})

			render(<ToolDisplay askType="tool" askText={askText} />)

			expect(consoleLogSpy).toHaveBeenCalledWith("[ToolDisplay] glob tool data:", {
				content: "*.config.js",
				path: "configs",
				isOutsideWorkspace: false,
			})
		})

		it("should log empty content correctly", () => {
			const askText = JSON.stringify({
				tool: "glob",
				content: "",
				path: "src",
				isOutsideWorkspace: false,
			})

			render(<ToolDisplay askType="tool" askText={askText} />)

			expect(consoleLogSpy).toHaveBeenCalledWith("[ToolDisplay] glob tool data:", {
				content: "",
				path: "src",
				isOutsideWorkspace: false,
			})
		})
	})

	describe("Styling and layout", () => {
		it("should apply correct styles to the details section", () => {
			const askText = JSON.stringify({
				tool: "glob",
				content: "**/*.tsx",
				path: "components",
				isOutsideWorkspace: false,
			})

			const { container } = render(<ToolDisplay askType="tool" askText={askText} />)

			// Check that the details section exists with content
			expect(screen.getByText("Pattern:")).toBeInTheDocument()
			expect(screen.getByText("**/*.tsx")).toBeInTheDocument()
			expect(screen.getByText("Search in:")).toBeInTheDocument()
			expect(screen.getByText("components")).toBeInTheDocument()
		})

		it("should apply warning styles for outside workspace", () => {
			const askText = JSON.stringify({
				tool: "glob",
				content: "*.js",
				path: "../outside",
				isOutsideWorkspace: true,
			})

			render(<ToolDisplay askType="tool" askText={askText} />)

			// Check that warning message exists
			expect(screen.getByText("⚠️ This path is outside the workspace")).toBeInTheDocument()
		})
	})
})
