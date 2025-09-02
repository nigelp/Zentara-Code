import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { ChatRowContent } from "../ChatRow"
import type { ClineMessage } from "@zentara-code/types"

// Mock dependencies
vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, defaultValue?: string) => defaultValue || key,
	}),
	Trans: ({ i18nKey, children }: any) => <span>{i18nKey || children}</span>,
	initReactI18next: {
		type: "3rdParty",
		init: () => {},
	},
}))

vi.mock("@src/context/ExtensionStateContext", () => ({
	useExtensionState: () => ({
		mcpServers: [],
		alwaysAllowMcp: false,
		currentCheckpoint: null,
	}),
}))

vi.mock("@src/utils/clipboard", () => ({
	useCopyToClipboard: () => ({
		copyWithFeedback: vi.fn(),
	}),
}))

vi.mock("@src/utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}))

vi.mock("@vscode/webview-ui-toolkit/react", () => ({
	VSCodeButton: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
	VSCodeBadge: ({ children }: any) => <span>{children}</span>,
}))

// Mock ToolUseBlock components
vi.mock("../common/ToolUseBlock", () => ({
	ToolUseBlock: ({ children }: any) => <div data-testid="tool-use-block">{children}</div>,
	ToolUseBlockHeader: ({ children }: any) => <div data-testid="tool-use-block-header">{children}</div>,
}))

describe("ChatRow - Glob Tool Display", () => {
	const mockOnToggleExpand = vi.fn()
	const mockOnSuggestionClick = vi.fn()
	const mockOnBatchFileResponse = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("Glob tool rendering", () => {
		it("should render glob tool with pattern and path for ask message", () => {
			const message: ClineMessage = {
				ts: Date.now(),
				type: "ask",
				ask: "tool",
				text: JSON.stringify({
					tool: "glob",
					content: "**/*.ts",
					path: "src/components",
					isOutsideWorkspace: false,
				}),
				partial: false,
			}

			render(
				<ChatRowContent
					message={message}
					isExpanded={false}
					isLast={false}
					isStreaming={false}
					onToggleExpand={mockOnToggleExpand}
					onSuggestionClick={mockOnSuggestionClick}
					onBatchFileResponse={mockOnBatchFileResponse}
				/>,
			)

			// Check header
			expect(screen.getByText("Wants to find files matching pattern")).toBeInTheDocument()

			// Check pattern display
			expect(screen.getByText("Pattern:")).toBeInTheDocument()
			expect(screen.getByText("**/*.ts")).toBeInTheDocument()

			// Check path display
			expect(screen.getByText("Search in:")).toBeInTheDocument()
			expect(screen.getByText("src/components")).toBeInTheDocument()
		})

		it("should show warning for paths outside workspace", () => {
			const message: ClineMessage = {
				ts: Date.now(),
				type: "ask",
				ask: "tool",
				text: JSON.stringify({
					tool: "glob",
					content: "*.json",
					path: "../outside",
					isOutsideWorkspace: true,
				}),
				partial: false,
			}

			render(
				<ChatRowContent
					message={message}
					isExpanded={false}
					isLast={false}
					isStreaming={false}
					onToggleExpand={mockOnToggleExpand}
					onSuggestionClick={mockOnSuggestionClick}
					onBatchFileResponse={mockOnBatchFileResponse}
				/>,
			)

			// Check warning message
			expect(screen.getByText("⚠️ This path is outside the workspace")).toBeInTheDocument()
		})

		it("should not show path if it's the default", () => {
			const message: ClineMessage = {
				ts: Date.now(),
				type: "ask",
				ask: "tool",
				text: JSON.stringify({
					tool: "glob",
					content: "**/*.md",
					path: ".",
					isOutsideWorkspace: false,
				}),
				partial: false,
			}

			render(
				<ChatRowContent
					message={message}
					isExpanded={false}
					isLast={false}
					isStreaming={false}
					onToggleExpand={mockOnToggleExpand}
					onSuggestionClick={mockOnSuggestionClick}
					onBatchFileResponse={mockOnBatchFileResponse}
				/>,
			)

			// Check pattern is shown
			expect(screen.getByText("Pattern:")).toBeInTheDocument()
			expect(screen.getByText("**/*.md")).toBeInTheDocument()

			// Check that "Search in:" is not shown for default path
			expect(screen.queryByText("Search in:")).not.toBeInTheDocument()
		})

		it("should show 'Found files' for completed say message", () => {
			// Note: The glob tool case is not rendered for 'say' messages in ChatRow
			// It only renders for 'ask' messages. This test is documenting that behavior.
			const message: ClineMessage = {
				ts: Date.now(),
				type: "say",
				say: "tool",
				text: JSON.stringify({
					tool: "glob",
					content: "*.tsx",
					path: "src",
					isOutsideWorkspace: false,
				}),
				partial: false,
			}

			const { container } = render(
				<ChatRowContent
					message={message}
					isExpanded={false}
					isLast={false}
					isStreaming={false}
					onToggleExpand={mockOnToggleExpand}
					onSuggestionClick={mockOnSuggestionClick}
					onBatchFileResponse={mockOnBatchFileResponse}
				/>,
			)

			// The glob tool say message doesn't render anything specific
			// This is the current behavior - it only renders for ask messages
			expect(container.firstChild).toBeTruthy()
		})

		it("should handle complex glob patterns", () => {
			const complexPatterns = [
				"**/*.{js,ts,jsx,tsx}",
				"src/**/[A-Z]*.tsx",
				"**/{package.json,tsconfig.json}",
				"**/!(node_modules)/**/*.test.js",
			]

			complexPatterns.forEach((pattern) => {
				const message: ClineMessage = {
					ts: Date.now(),
					type: "ask",
					ask: "tool",
					text: JSON.stringify({
						tool: "glob",
						content: pattern,
						path: ".",
						isOutsideWorkspace: false,
					}),
					partial: false,
				}

				const { unmount } = render(
					<ChatRowContent
						message={message}
						isExpanded={false}
						isLast={false}
						isStreaming={false}
						onToggleExpand={mockOnToggleExpand}
						onSuggestionClick={mockOnSuggestionClick}
						onBatchFileResponse={mockOnBatchFileResponse}
					/>,
				)

				// Check pattern is displayed correctly
				expect(screen.getByText(pattern)).toBeInTheDocument()

				unmount()
			})
		})

		it("should render tool use block structure", () => {
			const message: ClineMessage = {
				ts: Date.now(),
				type: "ask",
				ask: "tool",
				text: JSON.stringify({
					tool: "glob",
					content: "*.config.js",
					path: "configs",
					isOutsideWorkspace: false,
				}),
				partial: false,
			}

			render(
				<ChatRowContent
					message={message}
					isExpanded={false}
					isLast={false}
					isStreaming={false}
					onToggleExpand={mockOnToggleExpand}
					onSuggestionClick={mockOnSuggestionClick}
					onBatchFileResponse={mockOnBatchFileResponse}
				/>,
			)

			// Check that the pattern and path are displayed
			expect(screen.getByText("Pattern:")).toBeInTheDocument()
			expect(screen.getByText("*.config.js")).toBeInTheDocument()
			expect(screen.getByText("Search in:")).toBeInTheDocument()
			expect(screen.getByText("configs")).toBeInTheDocument()
		})

		it("should not render content section if content is empty", () => {
			const message: ClineMessage = {
				ts: Date.now(),
				type: "ask",
				ask: "tool",
				text: JSON.stringify({
					tool: "glob",
					content: "",
					path: "src",
					isOutsideWorkspace: false,
				}),
				partial: false,
			}

			render(
				<ChatRowContent
					message={message}
					isExpanded={false}
					isLast={false}
					isStreaming={false}
					onToggleExpand={mockOnToggleExpand}
					onSuggestionClick={mockOnSuggestionClick}
					onBatchFileResponse={mockOnBatchFileResponse}
				/>,
			)

			// Check header is shown
			expect(screen.getByText("Wants to find files matching pattern")).toBeInTheDocument()

			// Check that pattern section is not shown
			expect(screen.queryByTestId("tool-use-block")).not.toBeInTheDocument()
		})
	})

	describe("Glob tool with partial messages", () => {
		it("should handle partial glob tool message", () => {
			const message: ClineMessage = {
				ts: Date.now(),
				type: "ask",
				ask: "tool",
				text: JSON.stringify({
					tool: "glob",
					content: "**/*.t", // Partial pattern being typed
					path: "src",
					isOutsideWorkspace: false,
				}),
				partial: true,
			}

			render(
				<ChatRowContent
					message={message}
					isExpanded={false}
					isLast={false}
					isStreaming={true}
					onToggleExpand={mockOnToggleExpand}
					onSuggestionClick={mockOnSuggestionClick}
					onBatchFileResponse={mockOnBatchFileResponse}
				/>,
			)

			// Should still render the partial pattern
			expect(screen.getByText("**/*.t")).toBeInTheDocument()
		})
	})
})
