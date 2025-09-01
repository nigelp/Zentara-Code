import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import ChatView from "../ChatView"
import { ExtensionStateContext } from "@src/context/ExtensionStateContext"
import { vscode } from "@src/utils/vscode"

// Mock vscode API
vi.mock("@src/utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}))

// Mock TranslationContext to avoid ExtensionStateContext dependency
vi.mock("@src/i18n/TranslationContext", () => ({
	default: ({ children }: { children: React.ReactNode }) => children,
	TranslationProvider: ({ children }: { children: React.ReactNode }) => children,
	useAppTranslation: () => ({
		t: (key: string) => {
			// Return meaningful text for button labels
			const translations: Record<string, string> = {
				"chat:approve.title": "Approve",
				"chat:runCommand.title": "Run Command",
				"chat:reject.title": "Deny",
				"chat:cancel.title": "Cancel",
				"chat:typeMessage": "Type a message",
			}
			return translations[key] || key
		},
		i18n: {},
	}),
}))

// Mock dependencies
vi.mock("use-sound", () => ({
	default: () => [vi.fn()],
}))

// Mock other chat components to avoid complex dependencies
vi.mock("../ChatRow", () => ({
	default: ({ message }: any) => <div data-testid="chat-row">{message.text}</div>,
}))

vi.mock("../ChatTextArea", () => ({
	default: React.forwardRef(({ onSend, placeholderText, inputValue, setInputValue }: any, ref: any) => {
		return (
			<textarea
				data-testid="chat-textarea"
				placeholder={placeholderText}
				value={inputValue || ""}
				onChange={(e) => setInputValue?.(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter" && !e.shiftKey) {
						e.preventDefault()
						if (inputValue?.trim() && onSend) {
							onSend()
						}
					}
				}}
			/>
		)
	}),
}))

vi.mock("../Announcement", () => ({
	default: () => null,
}))

vi.mock("../AutoApproveMenu", () => ({
	default: () => null,
}))

vi.mock("../ContextWindowProgress", () => ({
	default: () => null,
}))

vi.mock("../TaskHeader", () => ({
	default: () => null,
}))

vi.mock("../BrowserSessionRow", () => ({
	default: () => null,
}))

// Create a query client for tests
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
		},
	},
})

const mockExtensionState = {
	clineMessages: [],
	currentTaskItem: null,
	activeTaskId: null,
	taskHistory: [],
	apiConfiguration: {
		apiProvider: "openai",
		openai: {
			apiKey: "test-key",
		},
	},
	organizationAllowList: { allowAll: true, providers: {} },
	mcpServers: [],
	alwaysAllowBrowser: false,
	alwaysAllowReadOnly: false,
	alwaysAllowReadOnlyOutsideWorkspace: false,
	alwaysAllowWrite: false,
	alwaysAllowWriteOutsideWorkspace: false,
	alwaysAllowWriteProtected: false,
	alwaysAllowExecute: false,
	alwaysAllowMcp: false,
	alwaysAllowDebug: false,
	allowedCommands: [],
	writeDelayMs: 0,
	mode: "default",
	setMode: vi.fn(),
	autoApprovalEnabled: false,
	alwaysAllowModeSwitch: false,
	alwaysAllowSubtasks: false,
	customModes: [],
	telemetrySetting: "enabled",
	hasSystemPromptOverride: false,
	historyPreviewCollapsed: false,
	soundEnabled: false,
	soundVolume: 0.5,
	didHydrateState: true,
	showWelcome: false,
	theme: {},
	filePaths: [],
	openedTabs: [],
}

// Helper to create tool ask messages with proper JSON format
const createToolAsk = (tool: string, description: string, taskId?: string) => ({
	ts: Date.now(),
	type: "ask" as const,
	ask: "tool" as const,
	text: JSON.stringify({ tool, description }),
	taskId,
})

const renderChatView = (customState = {}) => {
	const state = { ...mockExtensionState, ...customState }

	return render(
		<QueryClientProvider client={queryClient}>
			<ExtensionStateContext.Provider value={state as any}>
				<ChatView isHidden={false} showAnnouncement={false} hideAnnouncement={() => {}} />
			</ExtensionStateContext.Provider>
		</QueryClientProvider>,
	)
}

describe("ChatView taskId handling", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("Primary button click with taskId", () => {
		it("should include activeTaskId in askResponse", async () => {
			const messages = [
				{ ts: 1000, type: "say", say: "text", text: "Task started" },
				createToolAsk("readFile", "Reading file.txt", "task-123"),
			]

			renderChatView({
				clineMessages: messages,
				activeTaskId: "task-123",
			})

			// Wait for buttons to appear
			await waitFor(() => {
				expect(screen.getByText(/approve/i)).toBeInTheDocument()
			})

			// Click approve button
			fireEvent.click(screen.getByText(/approve/i))

			// Should send message with taskId
			expect(vscode.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "askResponse",
					askResponse: "yesButtonClicked",
					taskId: "task-123",
				}),
			)
		})

		it("should use taskId from ask message if activeTaskId not available", async () => {
			const messages = [
				{ ts: 1000, type: "say", say: "text", text: "Task started" },
				{ ts: 2000, type: "ask", ask: "command", text: "Run command?", taskId: "fallback-task" },
			]

			renderChatView({
				clineMessages: messages,
				activeTaskId: null, // No active task ID
			})

			// Wait for buttons - for command asks, button says "Run Command"
			await waitFor(() => {
				expect(screen.getByText(/run command/i)).toBeInTheDocument()
			})

			// Click run command
			fireEvent.click(screen.getByText(/run command/i))

			// Should use taskId from message
			expect(vscode.postMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "askResponse",
					askResponse: "yesButtonClicked",
					taskId: "fallback-task",
				}),
			)
		})

		it("should warn if no taskId available", async () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

			const messages = [
				{ ts: 1000, type: "say", say: "text", text: "Task started" },
				createToolAsk("readFile", "Reading file"), // No taskId
			]

			renderChatView({
				clineMessages: messages,
				activeTaskId: null,
			})

			// Wait for buttons
			await waitFor(() => {
				expect(screen.getByText(/approve/i)).toBeInTheDocument()
			})

			// Click approve
			fireEvent.click(screen.getByText(/approve/i))

			// Should log warning
			expect(consoleSpy).toHaveBeenCalledWith("No taskId available for response routing")

			consoleSpy.mockRestore()
		})
	})

	describe("Auto-approval with taskId", () => {
		it("should include taskId in auto-approved messages", async () => {
			const messages = [
				{ ts: 1000, type: "say", say: "text", text: "Task started" },
				createToolAsk("readFile", "Read file.txt?", "auto-task"),
			]

			// Enable auto-approval for read-only
			renderChatView({
				clineMessages: messages,
				activeTaskId: "auto-task",
				autoApprovalEnabled: true,
				alwaysAllowReadOnly: true,
			})

			// Auto-approval should trigger
			await waitFor(
				() => {
					expect(vscode.postMessage).toHaveBeenCalledWith(
						expect.objectContaining({
							type: "askResponse",
							askResponse: "yesButtonClicked",
							taskId: "auto-task",
						}),
					)
				},
				{ timeout: 2000 },
			)
		})
	})
})
