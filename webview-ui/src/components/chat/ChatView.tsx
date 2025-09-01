import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import { useDeepCompareEffect, useEvent, useMount } from "react-use"
import debounce from "debounce"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import removeMd from "remove-markdown"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import useSound from "use-sound"
import { LRUCache } from "lru-cache"
import { useTranslation } from "react-i18next"

import { useDebounceEffect } from "@src/utils/useDebounceEffect"
import { appendImages } from "@src/utils/imageUtils"

import type { ClineAsk, ClineMessage } from "@roo-code/types"

import { ClineSayBrowserAction, ClineSayTool, ExtensionMessage } from "@roo/ExtensionMessage"
import { McpServer, McpTool } from "@roo/mcp"
import { findLast } from "@roo/array"
import { FollowUpData, SuggestionItem } from "@roo-code/types"
import { combineApiRequests } from "@roo/combineApiRequests"
import { combineCommandSequences } from "@roo/combineCommandSequences"
import { getApiMetrics } from "@roo/getApiMetrics"
import { AudioType } from "@roo/WebviewMessage"
import { getAllModes } from "@roo/modes"
import { ProfileValidator } from "@roo/ProfileValidator"

import { vscode } from "@src/utils/vscode"
import {
	getCommandDecision,
	CommandDecision,
	findLongestPrefixMatch,
	parseCommand,
} from "@src/utils/command-validation"
import { useAppTranslation } from "@src/i18n/TranslationContext"
import { useExtensionState } from "@src/context/ExtensionStateContext"
import { useSelectedModel } from "@src/components/ui/hooks/useSelectedModel"
import RooHero from "@src/components/welcome/RooHero"
import RooTips from "@src/components/welcome/RooTips"
import RooCloudCTA from "@src/components/welcome/RooCloudCTA"
import { StandardTooltip } from "@src/components/ui"
import { useAutoApprovalState } from "@src/hooks/useAutoApprovalState"
import { useAutoApprovalToggles } from "@src/hooks/useAutoApprovalToggles"

import TelemetryBanner from "../common/TelemetryBanner"
import VersionIndicator from "../common/VersionIndicator"
import { useTaskSearch } from "../history/useTaskSearch"
import HistoryPreview from "../history/HistoryPreview"
import Announcement from "./Announcement"
import BrowserSessionRow from "./BrowserSessionRow"
import ChatRow from "./ChatRow"
import { ChatTextArea } from "./ChatTextArea"
import TaskHeader from "./TaskHeader"
import AutoApproveMenu from "./AutoApproveMenu"
import SystemPromptWarning from "./SystemPromptWarning"
import ProfileViolationWarning from "./ProfileViolationWarning"
import { CheckpointWarning } from "./CheckpointWarning"
import { SubagentStack } from "./SubagentStack"
import QueuedMessages from "./QueuedMessages"
import { getLatestTodo } from "@roo/todo"
import { QueuedMessage } from "@roo-code/types"

export interface ChatViewProps {
	isHidden: boolean
	showAnnouncement: boolean
	hideAnnouncement: () => void
}

export interface ChatViewRef {
	acceptInput: () => void
}
const DEBUG_RACE = process.env.DEBUG_RACE === "true" || false
const raceLog = (context: string, data: any = {}) => {
	if (!DEBUG_RACE) return
	const timestamp = new Date().toISOString()
	const hrTime = process.hrtime.bigint()
	console.log(`[RACE ${timestamp}] [${hrTime}] ${context}:`, JSON.stringify(data))
}

export const MAX_IMAGES_PER_MESSAGE = 20 // This is the Anthropic limit.

const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0

const ChatViewComponent: React.ForwardRefRenderFunction<ChatViewRef, ChatViewProps> = (
	{ isHidden, showAnnouncement, hideAnnouncement },
	ref,
) => {
	const isMountedRef = useRef(true)

	const [audioBaseUri] = useState(() => {
		const w = window as any
		return w.AUDIO_BASE_URI || ""
	})

	const { t } = useAppTranslation()
	const { t: tSettings } = useTranslation("settings")
	const modeShortcutText = `${isMac ? "⌘" : "Ctrl"} + . ${t("chat:forNextMode")}, ${isMac ? "⌘" : "Ctrl"} + Shift + . ${t("chat:forPreviousMode")}`

	const {
		clineMessages: messages,
		currentTaskItem,
		activeTaskId, // NEW: Get active task ID from state
		currentTaskTodos,
		taskHistory,
		apiConfiguration,
		organizationAllowList,
		mcpServers,
		alwaysAllowBrowser,
		alwaysAllowReadOnly,
		alwaysAllowReadOnlyOutsideWorkspace,
		alwaysAllowWrite,
		alwaysAllowWriteOutsideWorkspace,
		alwaysAllowWriteProtected,
		alwaysAllowExecute,
		alwaysAllowMcp,
		allowedCommands,
		deniedCommands,
		writeDelayMs,
		followupAutoApproveTimeoutMs,
		mode,
		setMode,
		autoApprovalEnabled,
		alwaysAllowModeSwitch,
		alwaysAllowSubtasks,
		alwaysAllowDebug, // Added alwaysAllowDebug
		alwaysAllowFollowupQuestions,
		alwaysAllowUpdateTodoList,
		customModes,
		telemetrySetting,
		hasSystemPromptOverride,
		historyPreviewCollapsed, // Added historyPreviewCollapsed
		soundEnabled,
		soundVolume,
		parallelTasks,
		cloudIsAuthenticated,
	} = useExtensionState()

	const messagesRef = useRef(messages)

	useEffect(() => {
		messagesRef.current = messages
	}, [messages])

	const { tasks } = useTaskSearch()

	// Initialize expanded state based on the persisted setting (default to expanded if undefined)
	const [isExpanded, setIsExpanded] = useState(
		historyPreviewCollapsed === undefined ? true : !historyPreviewCollapsed,
	)

	const toggleExpanded = useCallback(() => {
		const newState = !isExpanded
		setIsExpanded(newState)
		// Send message to extension to persist the new collapsed state
		vscode.postMessage({ type: "setHistoryPreviewCollapsed", bool: !newState })
	}, [isExpanded])

	// Leaving this less safe version here since if the first message is not a
	// task, then the extension is in a bad state and needs to be debugged (see
	// Cline.abort).
	const task = useMemo(() => messages.at(0), [messages])

	const latestTodos = useMemo(() => {
		// First check if we have initial todos from the state (for new subtasks)
		if (currentTaskTodos && currentTaskTodos.length > 0) {
			// Check if there are any todo updates in messages
			const messageBasedTodos = getLatestTodo(messages)
			// If there are message-based todos, they take precedence (user has updated them)
			if (messageBasedTodos && messageBasedTodos.length > 0) {
				return messageBasedTodos
			}
			// Otherwise use the initial todos from state
			return currentTaskTodos
		}
		// Fall back to extracting from messages
		return getLatestTodo(messages)
	}, [messages, currentTaskTodos])

	const modifiedMessages = useMemo(() => combineApiRequests(combineCommandSequences(messages.slice(1))), [messages])

	// Has to be after api_req_finished are all reduced into api_req_started messages.
	const apiMetrics = useMemo(() => getApiMetrics(modifiedMessages), [modifiedMessages])

	const [inputValue, setInputValue] = useState("")
	const inputValueRef = useRef(inputValue)
	const textAreaRef = useRef<HTMLTextAreaElement>(null)
	const [sendingDisabled, setSendingDisabled] = useState(false)
	const [selectedImages, setSelectedImages] = useState<string[]>([])
	const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([])
	const isProcessingQueueRef = useRef(false)
	const retryCountRef = useRef<Map<string, number>>(new Map())
	const MAX_RETRY_ATTEMPTS = 3

	// we need to hold on to the ask because useEffect > lastMessage will always let us know when an ask comes in and handle it, but by the time handleMessage is called, the last message might not be the ask anymore (it could be a say that followed)
	const [clineAsk, setClineAsk] = useState<ClineAsk | undefined>(undefined)
	const [enableButtons, setEnableButtons] = useState<boolean>(false)
	const [primaryButtonText, setPrimaryButtonText] = useState<string | undefined>(undefined)
	const [secondaryButtonText, setSecondaryButtonText] = useState<string | undefined>(undefined)
	const [didClickCancel, setDidClickCancel] = useState(false)
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})
	const prevExpandedRowsRef = useRef<Record<number, boolean>>()
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const disableAutoScrollRef = useRef(false)
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)
	const [isAtBottom, setIsAtBottom] = useState(true) // Track if we're at bottom
	const lastTtsRef = useRef<string>("")
	const lastMessageTypeRef = useRef<"user" | "agent" | null>(null)
	const [wasStreaming, setWasStreaming] = useState<boolean>(false)
	const hasActiveSubagentsRef = useRef(false) // Track if subagents are active
	const [showCheckpointWarning, setShowCheckpointWarning] = useState<boolean>(false)
	const [isCondensing, setIsCondensing] = useState<boolean>(false)
	const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
	const everVisibleMessagesTsRef = useRef<LRUCache<number, boolean>>(
		new LRUCache({
			max: 100,
			ttl: 1000 * 60 * 5,
		}),
	)
	const autoApproveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const userRespondedRef = useRef<boolean>(false)
	const [currentFollowUpTs, setCurrentFollowUpTs] = useState<number | null>(null)

	const clineAskRef = useRef(clineAsk)
	useEffect(() => {
		clineAskRef.current = clineAsk
	}, [clineAsk])

	// Keep inputValueRef in sync with inputValue state
	useEffect(() => {
		inputValueRef.current = inputValue
	}, [inputValue])

	useEffect(() => {
		isMountedRef.current = true
		return () => {
			isMountedRef.current = false
		}
	}, [])

	const isProfileDisabled = useMemo(
		() => !!apiConfiguration && !ProfileValidator.isProfileAllowed(apiConfiguration, organizationAllowList),
		[apiConfiguration, organizationAllowList],
	)

	// UI layout depends on the last 2 messages
	// (since it relies on the content of these messages, we are deep comparing. i.e. the button state after hitting button sets enableButtons to false, and this effect otherwise would have to true again even if messages didn't change
	const lastMessage = useMemo(() => messages.at(-1), [messages])
	const secondLastMessage = useMemo(() => messages.at(-2), [messages])

	// Setup sound hooks with use-sound
	const volume = typeof soundVolume === "number" ? soundVolume : 0.5
	const soundConfig = {
		volume,
		// useSound expects 'disabled' property, not 'soundEnabled'
		soundEnabled,
	}

	const getAudioUrl = (path: string) => `${audioBaseUri}/${path}`

	// Use the getAudioUrl helper function
	const [playNotification] = useSound(getAudioUrl("notification.wav"), soundConfig)
	const [playCelebration] = useSound(getAudioUrl("celebration.wav"), soundConfig)
	const [playProgressLoop] = useSound(getAudioUrl("progress_loop.wav"), soundConfig)

	function playSound(audioType: AudioType) {
		// Play the appropriate sound based on type
		// The disabled state is handled by the useSound hook configuration
		switch (audioType) {
			case "notification":
				playNotification()
				break
			case "celebration":
				playCelebration()
				break
			case "progress_loop":
				playProgressLoop()
				break
			default:
				console.warn(`Unknown audio type: ${audioType}`)
		}
	}

	function playTts(text: string) {
		vscode.postMessage({ type: "playTts", text })
	}

	useDeepCompareEffect(() => {
		// if last message is an ask, show user ask UI
		// if user finished a task, then start a new task with a new conversation history since in this moment that the extension is waiting for user response, the user could close the extension and the conversation history would be lost.
		// basically as long as a task is active, the conversation history will be persisted
		if (lastMessage) {
			switch (lastMessage.type) {
				case "ask":
					raceLog("[ChatView lastMessage is ask]", {
						taskId: lastMessage.taskId,
						ask: lastMessage.ask,
						partial: lastMessage.partial,
						text: lastMessage.text,
					})
					// Reset user response flag when a new ask arrives to allow auto-approval
					userRespondedRef.current = false
					const isPartial = lastMessage.partial === true
					switch (lastMessage.ask) {
						case "api_req_failed":
							playSound("progress_loop")
							setSendingDisabled(true)
							setClineAsk("api_req_failed")
							setEnableButtons(true)
							setPrimaryButtonText(t("chat:retry.title"))
							setSecondaryButtonText(t("chat:startNewTask.title"))
							break
						case "mistake_limit_reached":
							playSound("progress_loop")
							setSendingDisabled(false)
							setClineAsk("mistake_limit_reached")
							setEnableButtons(true)
							setPrimaryButtonText(t("chat:proceedAnyways.title"))
							setSecondaryButtonText(t("chat:startNewTask.title"))
							break
						case "followup":
							if (!isPartial) {
								playSound("notification")
							}
							setSendingDisabled(isPartial)
							setClineAsk("followup")
							// setting enable buttons to `false` would trigger a focus grab when
							// the text area is enabled which is undesirable.
							// We have no buttons for this tool, so no problem having them "enabled"
							// to workaround this issue.  See #1358.
							setEnableButtons(true)
							setPrimaryButtonText(undefined)
							setSecondaryButtonText(undefined)
							break
						case "tool":
							if (!isAutoApproved(lastMessage) && !isPartial) {
								playSound("notification")
							}
							setSendingDisabled(isPartial)
							setClineAsk("tool")
							setEnableButtons(!isPartial)
							const tool = JSON.parse(lastMessage.text || "{}") as ClineSayTool
							switch (tool.tool) {
								case "editedExistingFile":
								case "appliedDiff":
								case "newFileCreated":
								case "insertContent":
								case "generateImage":
									setPrimaryButtonText(t("chat:save.title"))
									setSecondaryButtonText(t("chat:reject.title"))
									break
								case "finishTask":
									setPrimaryButtonText(t("chat:completeSubtaskAndReturn"))
									setSecondaryButtonText(undefined)
									break
								case "readFile":
									if (tool.batchFiles && Array.isArray(tool.batchFiles)) {
										setPrimaryButtonText(t("chat:read-batch.approve.title"))
										setSecondaryButtonText(t("chat:read-batch.deny.title"))
									} else {
										setPrimaryButtonText(t("chat:approve.title"))
										setSecondaryButtonText(t("chat:reject.title"))
									}
									break
								default:
									setPrimaryButtonText(t("chat:approve.title"))
									setSecondaryButtonText(t("chat:reject.title"))
									break
							}
							break
						case "browser_action_launch":
							if (!isAutoApproved(lastMessage) && !isPartial) {
								playSound("notification")
							}
							setSendingDisabled(isPartial)
							setClineAsk("browser_action_launch")
							setEnableButtons(!isPartial)
							setPrimaryButtonText(t("chat:approve.title"))
							setSecondaryButtonText(t("chat:reject.title"))
							break
						case "command":
							if (!isAutoApproved(lastMessage) && !isPartial) {
								playSound("notification")
							}
							setSendingDisabled(isPartial)
							setClineAsk("command")
							setEnableButtons(!isPartial)
							setPrimaryButtonText(t("chat:runCommand.title"))
							setSecondaryButtonText(t("chat:reject.title"))
							break
						case "command_output":
							setSendingDisabled(false)
							setClineAsk("command_output")
							setEnableButtons(true)
							setPrimaryButtonText(t("chat:proceedWhileRunning.title"))
							setSecondaryButtonText(t("chat:killCommand.title"))
							break
						case "use_mcp_server":
							if (!isAutoApproved(lastMessage) && !isPartial) {
								playSound("notification")
							}
							setSendingDisabled(isPartial)
							setClineAsk("use_mcp_server")
							setEnableButtons(!isPartial)
							setPrimaryButtonText(t("chat:approve.title"))
							setSecondaryButtonText(t("chat:reject.title"))
							break
						case "completion_result":
							// extension waiting for feedback. but we can just present a new task button
							if (!isPartial) {
								playSound("celebration")
							}
							setSendingDisabled(isPartial)
							setClineAsk("completion_result")
							setEnableButtons(!isPartial)
							setPrimaryButtonText(t("chat:startNewTask.title"))
							setSecondaryButtonText(undefined)
							break
						case "resume_task":
							setSendingDisabled(false)
							setClineAsk("resume_task")
							setEnableButtons(true)
							setPrimaryButtonText(t("chat:resumeTask.title"))
							setSecondaryButtonText(t("chat:terminate.title"))
							setDidClickCancel(false) // special case where we reset the cancel button state
							break
						case "resume_completed_task":
							setSendingDisabled(false)
							setClineAsk("resume_completed_task")
							setEnableButtons(true)
							setPrimaryButtonText(t("chat:startNewTask.title"))
							setSecondaryButtonText(undefined)
							setDidClickCancel(false)
							break
					}
					break
				case "say":
					// Don't want to reset since there could be a "say" after
					// an "ask" while ask is waiting for response.
					switch (lastMessage.say) {
						case "api_req_retry_delayed":
							setSendingDisabled(true)
							break
						case "api_req_started":
							if (secondLastMessage?.ask === "command_output") {
								setSendingDisabled(true)
								setSelectedImages([])
								setClineAsk(undefined)
								setEnableButtons(false)
							}
							break
						case "api_req_finished":
						case "error":
						case "text":
						case "browser_action":
						case "browser_action_result":
						case "command_output":
						case "mcp_server_request_started":
						case "mcp_server_response":
						case "completion_result":
							break
					}
					break
			}
		}
	}, [lastMessage, secondLastMessage])

	useEffect(() => {
		if (messages.length === 0) {
			setSendingDisabled(false)
			setClineAsk(undefined)
			setEnableButtons(false)
			setPrimaryButtonText(undefined)
			setSecondaryButtonText(undefined)
		}
	}, [messages.length])

	useEffect(() => {
		// Reset UI states
		setExpandedRows({})
		everVisibleMessagesTsRef.current.clear() // Clear for new task
		setCurrentFollowUpTs(null) // Clear follow-up answered state for new task
		setIsCondensing(false) // Reset condensing state when switching tasks
		// Note: sendingDisabled is not reset here as it's managed by message effects

		// Clear any pending auto-approval timeout from previous task
		if (autoApproveTimeoutRef.current) {
			clearTimeout(autoApproveTimeoutRef.current)
			autoApproveTimeoutRef.current = null
		}
		// Reset user response flag for new task
		userRespondedRef.current = false

		// Clear message queue when starting a new task
		setMessageQueue([])
		// Clear retry counts
		retryCountRef.current.clear()
	}, [task?.ts])

	useEffect(() => {
		if (isHidden) {
			everVisibleMessagesTsRef.current.clear()
		}
	}, [isHidden])

	useEffect(() => {
		const cache = everVisibleMessagesTsRef.current
		return () => {
			cache.clear()
		}
	}, [])

	useEffect(() => {
		const prev = prevExpandedRowsRef.current
		let wasAnyRowExpandedByUser = false
		if (prev) {
			// Check if any row transitioned from false/undefined to true
			for (const [tsKey, isExpanded] of Object.entries(expandedRows)) {
				const ts = Number(tsKey)
				if (isExpanded && !(prev[ts] ?? false)) {
					wasAnyRowExpandedByUser = true
					break
				}
			}
		}

		if (wasAnyRowExpandedByUser) {
			disableAutoScrollRef.current = true
		}
		prevExpandedRowsRef.current = expandedRows // Store current state for next comparison
	}, [expandedRows])

	const isStreaming = useMemo(() => {
		// Checking clineAsk isn't enough since messages effect may be called
		// again for a tool for example, set clineAsk to its value, and if the
		// next message is not an ask then it doesn't reset. This is likely due
		// to how much more often we're updating messages as compared to before,
		// and should be resolved with optimizations as it's likely a rendering
		// bug. But as a final guard for now, the cancel button will show if the
		// last message is not an ask.
		const isLastAsk = !!modifiedMessages.at(-1)?.ask

		const isToolCurrentlyAsking =
			isLastAsk && clineAsk !== undefined && enableButtons && primaryButtonText !== undefined

		if (isToolCurrentlyAsking) {
			return false
		}

		const isLastMessagePartial = modifiedMessages.at(-1)?.partial === true

		if (isLastMessagePartial) {
			return true
		} else {
			const lastApiReqStarted = findLast(
				modifiedMessages,
				(message: ClineMessage) => message.say === "api_req_started",
			)

			if (
				lastApiReqStarted &&
				lastApiReqStarted.text !== null &&
				lastApiReqStarted.text !== undefined &&
				lastApiReqStarted.say === "api_req_started"
			) {
				const cost = JSON.parse(lastApiReqStarted.text).cost

				if (cost === undefined) {
					return true // API request has not finished yet.
				}
			}
		}

		return false
	}, [modifiedMessages, clineAsk, enableButtons, primaryButtonText])

	const markFollowUpAsAnswered = useCallback(() => {
		const lastFollowUpMessage = messagesRef.current.findLast((msg: ClineMessage) => msg.ask === "followup")
		if (lastFollowUpMessage) {
			setCurrentFollowUpTs(lastFollowUpMessage.ts)
		}
	}, [])

	const handleChatReset = useCallback(() => {
		// Clear any pending auto-approval timeout
		if (autoApproveTimeoutRef.current) {
			clearTimeout(autoApproveTimeoutRef.current)
			autoApproveTimeoutRef.current = null
		}
		// Reset user response flag for new message
		userRespondedRef.current = false

		// Only reset message-specific state, preserving mode.
		setInputValue("")
		setSendingDisabled(true)
		setSelectedImages([])
		setClineAsk(undefined)
		setEnableButtons(false)
		// Do not reset mode here as it should persist.
		// setPrimaryButtonText(undefined)
		// setSecondaryButtonText(undefined)
		disableAutoScrollRef.current = false
	}, [])

	/**
	 * Handles sending messages to the extension
	 * @param text - The message text to send
	 * @param images - Array of image data URLs to send with the message
	 * @param fromQueue - Internal flag indicating if this message is being sent from the queue (prevents re-queueing)
	 */
	const handleSendMessage = useCallback(
		(text: string, images: string[], fromQueue = false) => {
			try {
				text = text.trim()

				if (text || images.length > 0) {
					if (sendingDisabled && !fromQueue) {
						// Generate a more unique ID using timestamp + random component
						const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
						setMessageQueue((prev: QueuedMessage[]) => [...prev, { id: messageId, text, images }])
						setInputValue("")
						setSelectedImages([])
						return
					}
					// Mark that user has responded - this prevents any pending auto-approvals
					userRespondedRef.current = true

					if (messagesRef.current.length === 0) {
						vscode.postMessage({ type: "newTask", text, images })
					} else if (clineAskRef.current) {
						if (clineAskRef.current === "followup") {
							markFollowUpAsAnswered()
						}

						// Use clineAskRef.current
						switch (
							clineAskRef.current // Use clineAskRef.current
						) {
							case "followup":
							case "tool":
							case "browser_action_launch":
							case "command": // User can provide feedback to a tool or command use.
							case "command_output": // User can send input to command stdin.
							case "use_mcp_server":
							case "completion_result": // If this happens then the user has feedback for the completion result.
							case "resume_task":
							case "resume_completed_task":
							case "mistake_limit_reached":
								// Find the task ID from the current ask message
								const askMessage = messagesRef.current.findLast((m) => m.type === "ask")
								const taskId = activeTaskId || askMessage?.taskId
								vscode.postMessage({
									type: "askResponse",
									askResponse: "messageResponse",
									text,
									images,
									taskId: taskId, // Include task ID
								})
								raceLog("[ChatView post messageResponse message]", { text: text, taskId: taskId })
								break
							// There is no other case that a textfield should be enabled.
						}
					} else {
						// This is a new message in an ongoing task.
						vscode.postMessage({ type: "askResponse", askResponse: "messageResponse", text, images })
					}

					handleChatReset()
				}
			} catch (error) {
				console.error("Error in handleSendMessage:", error)
				// If this was a queued message, we should handle it differently
				if (fromQueue) {
					throw error // Re-throw to be caught by the queue processor
				}
				// For direct sends, we could show an error to the user
				// but for now we'll just log it
			}
		},
		[handleChatReset, markFollowUpAsAnswered, sendingDisabled, activeTaskId], // messagesRef and clineAskRef are stable
	)

	useEffect(() => {
		// Early return if conditions aren't met
		// Also don't process queue if there's an API error (clineAsk === "api_req_failed")
		if (
			sendingDisabled ||
			messageQueue.length === 0 ||
			isProcessingQueueRef.current ||
			clineAsk === "api_req_failed"
		) {
			return
		}

		// Mark as processing immediately to prevent race conditions
		isProcessingQueueRef.current = true

		// Process the first message in the queue
		const [nextMessage, ...remaining] = messageQueue

		// Update queue immediately to prevent duplicate processing
		setMessageQueue(remaining)

		// Process the message
		Promise.resolve()
			.then(() => {
				handleSendMessage(nextMessage.text, nextMessage.images, true)
				// Clear retry count on success
				retryCountRef.current.delete(nextMessage.id)
			})
			.catch((error) => {
				console.error("Failed to send queued message:", error)

				// Get current retry count
				const retryCount = retryCountRef.current.get(nextMessage.id) || 0

				// Only re-add if under retry limit
				if (retryCount < MAX_RETRY_ATTEMPTS) {
					retryCountRef.current.set(nextMessage.id, retryCount + 1)
					// Re-add the message to the end of the queue
					setMessageQueue((current: QueuedMessage[]) => [...current, nextMessage])
				} else {
					console.error(`Message ${nextMessage.id} failed after ${MAX_RETRY_ATTEMPTS} attempts, discarding`)
					retryCountRef.current.delete(nextMessage.id)
				}
			})
			.finally(() => {
				isProcessingQueueRef.current = false
			})

		// Cleanup function to handle component unmount
		return () => {
			isProcessingQueueRef.current = false
		}
	}, [sendingDisabled, messageQueue, handleSendMessage, clineAsk])

	const handleSetChatBoxMessage = useCallback(
		(text: string, images: string[]) => {
			// Avoid nested template literals by breaking down the logic
			let newValue = text

			if (inputValue !== "") {
				newValue = inputValue + " " + text
			}

			setInputValue(newValue)
			setSelectedImages([...selectedImages, ...images])
		},
		[inputValue, selectedImages],
	)

	// Cleanup retry count map on unmount
	useEffect(() => {
		// Store refs in variables to avoid stale closure issues
		const retryCountMap = retryCountRef.current
		const isProcessingRef = isProcessingQueueRef

		return () => {
			retryCountMap.clear()
			isProcessingRef.current = false
		}
	}, [])

	const startNewTask = useCallback(() => vscode.postMessage({ type: "clearTask" }), [])

	// This logic depends on the useEffect[messages] above to set clineAsk,
	// after which buttons are shown and we then send an askResponse to the
	// extension.
	const handlePrimaryButtonClick = useCallback(
		(text?: string, images?: string[]) => {
			// Mark that user has responded
			userRespondedRef.current = true

			const trimmedInput = text?.trim()

			// Use activeTaskId from state, or find from the current ask message
			const askMessage = messages.findLast((m) => m.type === "ask")
			const taskId = activeTaskId || askMessage?.taskId

			if (!taskId) {
				console.warn("No taskId available for response routing")
			}

			switch (clineAsk) {
				case "api_req_failed":
				case "command":
				case "tool":
				case "browser_action_launch":
				case "use_mcp_server":
				case "resume_task":
				case "mistake_limit_reached":
					// Only send text/images if they exist
					if (trimmedInput || (images && images.length > 0)) {
						vscode.postMessage({
							type: "askResponse",
							askResponse: "yesButtonClicked",
							text: trimmedInput,
							images: images,
							taskId: taskId, // Include task ID
						})
						// Clear input state after sending
						setInputValue("")
						setSelectedImages([])
					} else {
						vscode.postMessage({
							type: "askResponse",
							askResponse: "yesButtonClicked",
							taskId: taskId, // Include task ID
						})
					}
					raceLog("[ChatView post askResponse yesButtonClicked]", {
						taskId: taskId,
						clineAsk: clineAsk,
					})
					break
				case "completion_result":
				case "resume_completed_task":
					// Waiting for feedback, but we can just present a new task button
					startNewTask()
					break
				case "command_output":
					vscode.postMessage({ type: "terminalOperation", terminalOperation: "continue" })
					break
			}

			setSendingDisabled(true)
			setClineAsk(undefined)
			setEnableButtons(false)
		},
		[clineAsk, startNewTask, messages, activeTaskId],
	)

	const handleSecondaryButtonClick = useCallback(
		(text?: string, images?: string[]) => {
			// Mark that user has responded
			userRespondedRef.current = true

			const trimmedInput = text?.trim()

			// Find the task ID from the current ask message
			const askMessage = messages.findLast((m) => m.type === "ask")
			const taskId = activeTaskId || askMessage?.taskId

			if (isStreaming) {
				// Cancel main task
				vscode.postMessage({
					type: "cancelTask",
					taskId: taskId, // Include task ID for cancellation
				})

				setDidClickCancel(true)
				return
			}

			switch (clineAsk) {
				case "api_req_failed":
				case "mistake_limit_reached":
				case "resume_task":
					startNewTask()
					break
				case "command":
				case "tool":
				case "browser_action_launch":
				case "use_mcp_server":
					// Only send text/images if they exist
					if (trimmedInput || (images && images.length > 0)) {
						vscode.postMessage({
							type: "askResponse",
							askResponse: "noButtonClicked",
							text: trimmedInput,
							images: images,
							taskId: taskId, // Include task ID
						})
						// Clear input state after sending
						setInputValue("")
						setSelectedImages([])
					} else {
						// Responds to the API with a "This operation failed" and lets it try again
						vscode.postMessage({
							type: "askResponse",
							askResponse: "noButtonClicked",
							taskId: taskId, // Include task ID
						})
						raceLog("[ChatView post askResponse noButtonClicked]", {
							taskId: taskId,
							clineAsk: clineAsk,
						})
					}
					break
				case "command_output":
					vscode.postMessage({ type: "terminalOperation", terminalOperation: "abort" })
					break
			}
			setSendingDisabled(true)
			setClineAsk(undefined)
			setEnableButtons(false)
		},
		[clineAsk, startNewTask, isStreaming, messages, activeTaskId],
	)

	const { info: model } = useSelectedModel(apiConfiguration)

	const selectImages = useCallback(() => vscode.postMessage({ type: "selectImages" }), [])

	const shouldDisableImages = !model?.supportsImages || selectedImages.length >= MAX_IMAGES_PER_MESSAGE

	const handleMessage = useCallback(
		(e: MessageEvent) => {
			const message: ExtensionMessage = e.data

			switch (message.type) {
				case "action":
					switch (message.action!) {
						case "didBecomeVisible":
							if (!isHidden && !sendingDisabled && !enableButtons) {
								textAreaRef.current?.focus()
							}
							break
						case "focusInput":
							textAreaRef.current?.focus()
							break
					}
					break
				case "selectedImages":
					// Only handle selectedImages if it's not for editing context
					// When context is "edit", ChatRow will handle the images
					if (message.context !== "edit") {
						setSelectedImages((prevImages: string[]) =>
							appendImages(prevImages, message.images, MAX_IMAGES_PER_MESSAGE),
						)
					}
					break
				case "invoke":
					switch (message.invoke!) {
						case "newChat":
							handleChatReset()
							break
						case "sendMessage":
							handleSendMessage(message.text ?? "", message.images ?? [])
							break
						case "setChatBoxMessage":
							handleSetChatBoxMessage(message.text ?? "", message.images ?? [])
							break
						case "primaryButtonClick":
							handlePrimaryButtonClick(message.text ?? "", message.images ?? [])
							break
						case "secondaryButtonClick":
							handleSecondaryButtonClick(message.text ?? "", message.images ?? [])
							break
					}
					break
				case "condenseTaskContextResponse":
					if (message.text && message.text === currentTaskItem?.id) {
						if (isCondensing && sendingDisabled) {
							setSendingDisabled(false)
						}
						setIsCondensing(false)
					}
					break
			}
			// textAreaRef.current is not explicitly required here since React
			// guarantees that ref will be stable across re-renders, and we're
			// not using its value but its reference.
		},
		[
			isCondensing,
			isHidden,
			sendingDisabled,
			enableButtons,
			currentTaskItem,
			handleChatReset,
			handleSendMessage,
			handleSetChatBoxMessage,
			handlePrimaryButtonClick,
			handleSecondaryButtonClick,
		],
	)

	useEvent("message", handleMessage)

	// NOTE: the VSCode window needs to be focused for this to work.
	useMount(() => textAreaRef.current?.focus())

	const visibleMessages = useMemo(() => {
		// Remove the 500-message limit to prevent array index shifting
		// Virtuoso is designed to efficiently handle large lists through virtualization
		const newVisibleMessages = modifiedMessages.filter((message: ClineMessage) => {
			if (everVisibleMessagesTsRef.current.has(message.ts)) {
				const alwaysHiddenOnceProcessedAsk: ClineAsk[] = [
					"api_req_failed",
					"resume_task",
					"resume_completed_task",
				]
				const alwaysHiddenOnceProcessedSay = [
					"api_req_finished",
					"api_req_retried",
					"api_req_deleted",
					"mcp_server_request_started",
				]
				if (message.ask && alwaysHiddenOnceProcessedAsk.includes(message.ask)) return false
				if (message.say && alwaysHiddenOnceProcessedSay.includes(message.say)) return false
				if (message.say === "text" && (message.text ?? "") === "" && (message.images?.length ?? 0) === 0) {
					return false
				}
				return true
			}

			switch (message.ask) {
				case "completion_result":
					if (message.text === "") return false
					break
				case "api_req_failed":
				case "resume_task":
				case "resume_completed_task":
					return false
			}
			switch (message.say) {
				case "api_req_finished":
				case "api_req_retried":
				case "api_req_deleted":
					return false
				case "api_req_retry_delayed":
					const last1 = modifiedMessages.at(-1)
					const last2 = modifiedMessages.at(-2)
					if (last1?.ask === "resume_task" && last2 === message) {
						return true
					} else if (message !== last1) {
						return false
					}
					break
				case "text":
					if ((message.text ?? "") === "" && (message.images?.length ?? 0) === 0) return false
					break
				case "mcp_server_request_started":
					return false
			}
			return true
		})

		const viewportStart = Math.max(0, newVisibleMessages.length - 100)
		newVisibleMessages
			.slice(viewportStart)
			.forEach((msg: ClineMessage) => everVisibleMessagesTsRef.current.set(msg.ts, true))

		return newVisibleMessages
	}, [modifiedMessages])

	useEffect(() => {
		const cleanupInterval = setInterval(() => {
			const cache = everVisibleMessagesTsRef.current
			const currentMessageIds = new Set(modifiedMessages.map((m: ClineMessage) => m.ts))
			const viewportMessages = visibleMessages.slice(Math.max(0, visibleMessages.length - 100))
			const viewportMessageIds = new Set(viewportMessages.map((m: ClineMessage) => m.ts))

			cache.forEach((_value: boolean, key: number) => {
				if (!currentMessageIds.has(key) && !viewportMessageIds.has(key)) {
					cache.delete(key)
				}
			})
		}, 60000)

		return () => clearInterval(cleanupInterval)
	}, [modifiedMessages, visibleMessages])

	useDebounceEffect(
		() => {
			if (!isHidden && !sendingDisabled && !enableButtons) {
				textAreaRef.current?.focus()
			}
		},
		50,
		[isHidden, sendingDisabled, enableButtons],
	)

	const isReadOnlyToolAction = useCallback((message: ClineMessage | undefined) => {
		if (message?.type === "ask") {
			if (!message.text) {
				return true
			}

			const tool = JSON.parse(message.text)

			return [
				"readFile",
				"listFiles",
				"listFilesTopLevel",
				"listFilesRecursive",
				"listCodeDefinitionNames",
				"searchFiles",
				"codebaseSearch",
				"glob",
			].includes(tool.tool)
		}

		return false
	}, [])

	const isWriteToolAction = useCallback((message: ClineMessage | undefined) => {
		if (message?.type === "ask") {
			if (!message.text) {
				return true
			}

			const tool = JSON.parse(message.text)

			return [
				"editedExistingFile",
				"appliedDiff",
				"newFileCreated",
				"searchAndReplace",
				"insertContent",
				"generateImage",
			].includes(tool.tool)
		}

		return false
	}, [])

	const isDebugToolAction = useCallback((message: ClineMessage | undefined) => {
		if (message?.type === "ask") {
			if (!message.text) {
				return false
			}

			const tool = JSON.parse(message.text)

			// Check if it's the debug meta-tool or any of the specific debug operations
			return tool.tool === "debug" || tool.tool.startsWith("debug_")
		}

		return false
	}, [])

	const isMcpToolAlwaysAllowed = useCallback(
		(message: ClineMessage | undefined) => {
			if (message?.type === "ask" && message.ask === "use_mcp_server") {
				if (!message.text) {
					return true
				}

				const mcpServerUse = JSON.parse(message.text) as { type: string; serverName: string; toolName: string }

				if (mcpServerUse.type === "use_mcp_tool") {
					const server = mcpServers?.find((s: McpServer) => s.name === mcpServerUse.serverName)
					const tool = server?.tools?.find((t: McpTool) => t.name === mcpServerUse.toolName)
					return tool?.alwaysAllow || false
				}
			}

			return false
		},
		[mcpServers],
	)

	// Get the command decision using unified validation logic
	const getCommandDecisionForMessage = useCallback(
		(message: ClineMessage | undefined): CommandDecision => {
			if (message?.type !== "ask") return "ask_user"
			return getCommandDecision(message.text || "", allowedCommands || [], deniedCommands || [])
		},
		[allowedCommands, deniedCommands],
	)

	// Check if a command message should be auto-approved.
	const isAllowedCommand = useCallback(
		(message: ClineMessage | undefined): boolean => {
			return getCommandDecisionForMessage(message) === "auto_approve"
		},
		[getCommandDecisionForMessage],
	)

	// Check if a command message should be auto-denied.
	const isDeniedCommand = useCallback(
		(message: ClineMessage | undefined): boolean => {
			return getCommandDecisionForMessage(message) === "auto_deny"
		},
		[getCommandDecisionForMessage],
	)

	// Helper function to get the denied prefix for a command
	const getDeniedPrefix = useCallback(
		(command: string): string | null => {
			if (!command || !deniedCommands?.length) return null

			// Parse the command into sub-commands and check each one
			const subCommands = parseCommand(command)
			for (const cmd of subCommands) {
				const deniedMatch = findLongestPrefixMatch(cmd, deniedCommands)
				if (deniedMatch) {
					return deniedMatch
				}
			}
			return null
		},
		[deniedCommands],
	)

	// Create toggles object for useAutoApprovalState hook
	const autoApprovalToggles = useAutoApprovalToggles()

	const { hasEnabledOptions } = useAutoApprovalState(autoApprovalToggles, autoApprovalEnabled)

	const isAutoApproved = useCallback(
		(message: ClineMessage | undefined) => {
			// First check if auto-approval is enabled AND we have at least one permission
			if (!autoApprovalEnabled || !message || message.type !== "ask") {
				return false
			}

			// Use the hook's result instead of duplicating the logic
			if (!hasEnabledOptions) {
				return false
			}

			if (message.ask === "followup") {
				return alwaysAllowFollowupQuestions
			}

			if (message.ask === "browser_action_launch") {
				return alwaysAllowBrowser
			}

			if (message.ask === "use_mcp_server") {
				return alwaysAllowMcp && isMcpToolAlwaysAllowed(message)
			}

			if (message.ask === "command") {
				return alwaysAllowExecute && isAllowedCommand(message)
			}

			// For read/write operations, check if it's outside workspace and if
			// we have permission for that.
			if (message.ask === "tool") {
				let tool: any = {}

				try {
					tool = JSON.parse(message.text || "{}")
				} catch (error) {
					console.error("Failed to parse tool:", error)
				}

				if (!tool) {
					return false
				}

				if (tool?.tool === "updateTodoList") {
					return alwaysAllowUpdateTodoList
				}

				if (tool?.tool === "fetchInstructions") {
					if (tool.content === "create_mode") {
						return alwaysAllowModeSwitch
					}

					if (tool.content === "create_mcp_server") {
						return alwaysAllowMcp
					}
				}

				if (tool?.tool === "switchMode") {
					return alwaysAllowModeSwitch
				}

				if (["newTask", "finishTask"].includes(tool?.tool)) {
					return alwaysAllowSubtasks
				}

				const isOutsideWorkspace = !!tool.isOutsideWorkspace
				const isProtected = message.isProtected

				// Check for debug tools
				if (isDebugToolAction(message)) {
					return alwaysAllowDebug || false
				}

				if (isReadOnlyToolAction(message)) {
					return alwaysAllowReadOnly && (!isOutsideWorkspace || alwaysAllowReadOnlyOutsideWorkspace)
				}

				if (isWriteToolAction(message)) {
					return (
						alwaysAllowWrite &&
						(!isOutsideWorkspace || alwaysAllowWriteOutsideWorkspace) &&
						(!isProtected || alwaysAllowWriteProtected)
					)
				}
			}

			return false
		},
		[
			autoApprovalEnabled,
			hasEnabledOptions,
			alwaysAllowBrowser,
			alwaysAllowReadOnly,
			alwaysAllowReadOnlyOutsideWorkspace,
			isReadOnlyToolAction,
			alwaysAllowWrite,
			alwaysAllowWriteOutsideWorkspace,
			alwaysAllowWriteProtected,
			isWriteToolAction,
			alwaysAllowExecute,
			isAllowedCommand,
			alwaysAllowMcp,
			isMcpToolAlwaysAllowed,
			alwaysAllowModeSwitch,
			alwaysAllowFollowupQuestions,
			alwaysAllowSubtasks,
			alwaysAllowDebug,
			isDebugToolAction,
			alwaysAllowUpdateTodoList,
		],
	)

	useEffect(() => {
		// This ensures the first message is not read, future user messages are
		// labeled as `user_feedback`.
		if (lastMessage && messages.length > 1) {
			if (
				lastMessage.text && // has text
				(lastMessage.say === "text" || lastMessage.say === "completion_result") && // is a text message
				!lastMessage.partial && // not a partial message
				!lastMessage.text.startsWith("{") // not a json object
			) {
				let text = lastMessage?.text || ""
				const mermaidRegex = /```mermaid[\s\S]*?```/g
				// remove mermaid diagrams from text
				text = text.replace(mermaidRegex, "")
				// remove markdown from text
				text = removeMd(text)

				// ensure message is not a duplicate of last read message
				if (text !== lastTtsRef.current) {
					try {
						playTts(text)
						lastTtsRef.current = text
					} catch (error) {
						console.error("Failed to execute text-to-speech:", error)
					}
				}
			}
		}

		// Update previous value.
		// Note: setWasStreaming is now handled in the streaming autoscroll effect
	}, [isStreaming, lastMessage, wasStreaming, isAutoApproved, messages.length])

	const isBrowserSessionMessage = (message: ClineMessage): boolean => {
		// Which of visible messages are browser session messages, see above.
		if (message.type === "ask") {
			return ["browser_action_launch"].includes(message.ask!)
		}

		if (message.type === "say") {
			return ["api_req_started", "text", "browser_action", "browser_action_result"].includes(message.say!)
		}

		return false
	}

	const groupedMessages = useMemo(() => {
		const result: (ClineMessage | ClineMessage[])[] = []
		let currentGroup: ClineMessage[] = []
		let isInBrowserSession = false

		const endBrowserSession = () => {
			if (currentGroup.length > 0) {
				result.push([...currentGroup])
				currentGroup = []
				isInBrowserSession = false
			}
		}

		visibleMessages.forEach((message: ClineMessage) => {
			if (message.ask === "browser_action_launch") {
				// Complete existing browser session if any.
				endBrowserSession()
				// Start new.
				isInBrowserSession = true
				currentGroup.push(message)
			} else if (isInBrowserSession) {
				// End session if `api_req_started` is cancelled.

				if (message.say === "api_req_started") {
					// Get last `api_req_started` in currentGroup to check if
					// it's cancelled. If it is then this api req is not part
					// of the current browser session.
					const lastApiReqStarted = [...currentGroup].reverse().find((m) => m.say === "api_req_started")

					if (lastApiReqStarted?.text !== null && lastApiReqStarted?.text !== undefined) {
						const info = JSON.parse(lastApiReqStarted.text)
						const isCancelled = info.cancelReason !== null && info.cancelReason !== undefined

						if (isCancelled) {
							endBrowserSession()
							result.push(message)
							return
						}
					}
				}

				if (isBrowserSessionMessage(message)) {
					currentGroup.push(message)

					// Check if this is a close action
					if (message.say === "browser_action") {
						const browserAction = JSON.parse(message.text || "{}") as ClineSayBrowserAction
						if (browserAction.action === "close") {
							endBrowserSession()
						}
					}
				} else {
					// complete existing browser session if any
					endBrowserSession()
					result.push(message)
				}
			} else {
				result.push(message)
			}
		})

		// Handle case where browser session is the last group
		if (currentGroup.length > 0) {
			result.push([...currentGroup])
		}

		if (isCondensing) {
			// Show indicator after clicking condense button
			result.push({
				type: "say",
				say: "condense_context",
				ts: Date.now(),
				partial: true,
			})
		}

		return result
	}, [isCondensing, visibleMessages])

	// Track previous parallel tasks count for auto-scroll
	const prevParallelTasksLengthRef = useRef(parallelTasks?.length || 0)
	const userScrolledDuringSubagentsRef = useRef(false) // Track if user scrolled while subagents active

	const scrollToBottomSmooth = useCallback(
		debounce(
			() => {
				//console.trace("[ChatView] scrollToBottomSmooth called - STACK TRACE:")
				virtuosoRef.current?.scrollTo({ top: Number.MAX_SAFE_INTEGER, behavior: "smooth" })
			},
			10,
			{
				immediate: true,
			},
		),
		[virtuosoRef],
	)

	// Update hasActiveSubagentsRef when parallelTasks changes
	useEffect(() => {
		const hasActiveSubagents = !!(parallelTasks && parallelTasks.length > 0)
		const prevHadActiveSubagents = hasActiveSubagentsRef.current
		hasActiveSubagentsRef.current = hasActiveSubagents

		if (!hasActiveSubagents && prevHadActiveSubagents) {
			// All subagents completed - reset BOTH flags to re-enable autoscroll for main agent
			console.log("[ChatView] All subagents completed, re-enabling autoscroll for main agent")

			// Reset both scroll flags to allow main agent autoscroll to resume
			disableAutoScrollRef.current = false
			userScrolledDuringSubagentsRef.current = false

			// Scroll to bottom when returning to main agent to show completion
			setTimeout(() => {
				console.log("[ChatView] Scrolling to bottom after subagents complete")
				scrollToBottomSmooth()
			}, 100)
		} else if (!prevHadActiveSubagents && hasActiveSubagents) {
			// Just started subagents - reset the subagent scroll flag but keep general scroll state
			console.log("[ChatView] Subagents started, resetting subagent scroll tracking")
			userScrolledDuringSubagentsRef.current = false
			// Keep existing disableAutoScrollRef value - if user had scrolled before subagents started, respect that
		}
	}, [parallelTasks, scrollToBottomSmooth])

	// Effect to handle continuous autoscroll during streaming for main agent
	useEffect(() => {
		// Reset autoscroll when streaming starts for main agent
		if (isStreaming && !wasStreaming && !hasActiveSubagentsRef.current) {
			console.log("[ChatView] Streaming started for main agent, enabling autoscroll")
			disableAutoScrollRef.current = false
			userScrolledDuringSubagentsRef.current = false
		}

		// Only autoscroll during streaming if:
		// 1. We're actually streaming
		// 2. No subagents are active (main agent conversation)
		// 3. User hasn't manually scrolled up during this streaming session
		if (isStreaming && !hasActiveSubagentsRef.current && !disableAutoScrollRef.current) {
			console.log("[ChatView] Streaming detected for main agent, enabling continuous autoscroll")

			// Scroll immediately when streaming starts
			virtuosoRef.current?.scrollTo({
				top: Number.MAX_SAFE_INTEGER,
				behavior: "auto", // Use auto for immediate scroll
			})

			virtuosoRef.current?.scrollTo({
				top: Number.MAX_SAFE_INTEGER,
				behavior: "smooth",
			})

			// Set up interval to keep scrolling during streaming
			// Using interval instead of requestAnimationFrame to avoid performance issues
			const scrollInterval = setInterval(() => {
				// Double-check conditions inside interval too
				if (!disableAutoScrollRef.current && !userScrolledDuringSubagentsRef.current) {
					virtuosoRef.current?.scrollTo({
						top: Number.MAX_SAFE_INTEGER,
						behavior: "smooth",
					})
				}
			}, 100) // Scroll every 100ms during streaming

			// Cleanup function to stop scrolling when streaming ends
			return () => {
				clearInterval(scrollInterval)
			}
		}

		setWasStreaming(isStreaming)
	}, [isStreaming, wasStreaming])

	// Additional effect to scroll when the last message content changes during streaming
	useEffect(() => {
		// Check if we should autoscroll when message content updates
		const lastMessage = modifiedMessages.at(-1)
		if (
			lastMessage?.partial === true && // Message is still streaming
			!hasActiveSubagentsRef.current && // Main agent (no subagents)
			!disableAutoScrollRef.current && // User hasn't scrolled away
			isAtBottom // We're at the bottom
		) {
			// Debounced scroll to avoid too frequent updates
			const scrollTimer = setTimeout(() => {
				// Double-check conditions before scrolling
				if (!disableAutoScrollRef.current && !userScrolledDuringSubagentsRef.current) {
					virtuosoRef.current?.scrollTo({
						top: Number.MAX_SAFE_INTEGER,
						behavior: "smooth",
					})
				}
			}, 50)

			return () => clearTimeout(scrollTimer)
		}
	}, [modifiedMessages, isAtBottom])

	// scrolling

	useEffect(() => {
		return () => {
			if (scrollToBottomSmooth && typeof (scrollToBottomSmooth as any).cancel === "function") {
				;(scrollToBottomSmooth as any).cancel()
			}
		}
	}, [scrollToBottomSmooth])

	const scrollToBottomAuto = useCallback(() => {
		console.trace("[ChatView] scrollToBottomAuto called - STACK TRACE:")
		virtuosoRef.current?.scrollTo({
			top: Number.MAX_SAFE_INTEGER,
			behavior: "auto", // Instant causes crash.
		})
	}, [])

	const handleSetExpandedRow = useCallback(
		(ts: number, expand?: boolean) => {
			setExpandedRows((prev: Record<number, boolean>) => ({
				...prev,
				[ts]: expand === undefined ? !prev[ts] : expand,
			}))
		},
		[setExpandedRows], // setExpandedRows is stable
	)

	// Scroll when user toggles certain rows.
	const toggleRowExpansion = useCallback(
		(ts: number) => {
			handleSetExpandedRow(ts)
			// The logic to set disableAutoScrollRef.current = true on expansion
			// is now handled by the useEffect hook that observes expandedRows.
		},
		[handleSetExpandedRow],
	)

	const handleRowHeightChange = useCallback(
		(isTaller: boolean) => {
			// Only autoscroll if ALL conditions are met
			const shouldAutoScroll =
				// Must not be manually disabled
				!disableAutoScrollRef.current &&
				// Must be at bottom
				isAtBottom &&
				// Must satisfy one of these conditions:
				// Case 1: No active subagents (main agent streaming)
				(!hasActiveSubagentsRef.current ||
					// Case 2: Subagents active AND user hasn't scrolled during this session
					(hasActiveSubagentsRef.current && !userScrolledDuringSubagentsRef.current))

			if (shouldAutoScroll) {
				console.log(
					`[ChatView] Row height changed (taller: ${isTaller}), auto-scrolling ${isStreaming ? "during streaming" : "normally"}`,
				)
				if (isTaller) {
					scrollToBottomSmooth()
				} else {
					setTimeout(() => scrollToBottomAuto(), 0)
				}
			} else {
				console.log(
					`[ChatView] Row height changed (taller: ${isTaller}), NOT auto-scrolling (streaming: ${isStreaming}, disabled: ${disableAutoScrollRef.current}, atBottom: ${isAtBottom}, subagents: ${hasActiveSubagentsRef.current}, userScrolled: ${userScrolledDuringSubagentsRef.current})`,
				)
			}
		},
		[isAtBottom, isStreaming, scrollToBottomSmooth, scrollToBottomAuto],
	)

	useEffect(() => {
		// Autoscroll logic for message updates
		const lastMessage = modifiedMessages.at(-1)

		// Determine if the last message is from the agent or user
		let currentMessageType: "user" | "agent" | null = null
		if (lastMessage) {
			// Messages from the agent (assistant)
			if (lastMessage.type === "say" || (lastMessage.type === "ask" && lastMessage.ask !== "followup")) {
				currentMessageType = "agent"
			}
			// Messages from the user
			else if (lastMessage.type === "ask" && lastMessage.ask === "followup" && !lastMessage.partial) {
				currentMessageType = "user"
			}
		}

		// Reset autoscroll when agent starts responding (new agent message after user message)
		if (currentMessageType === "agent" && lastMessageTypeRef.current === "user" && !hasActiveSubagentsRef.current) {
			console.log("[ChatView] Agent started responding, re-enabling autoscroll")
			disableAutoScrollRef.current = false
			userScrolledDuringSubagentsRef.current = false
		}

		// Update the last message type
		lastMessageTypeRef.current = currentMessageType

		// Autoscroll if conditions are met
		if (!hasActiveSubagentsRef.current && !disableAutoScrollRef.current) {
			setTimeout(() => scrollToBottomSmooth(), 100)
		} else {
			// console.log(
			// 	`[ChatView] Messages updated, NOT auto-scrolling (subagents: ${hasActiveSubagentsRef.current}, disabled: ${disableAutoScrollRef.current})`,
			// )
		}
	}, [groupedMessages.length, modifiedMessages, scrollToBottomSmooth])

	// Auto-scroll when new subagents are added (if user hasn't scrolled)
	useEffect(() => {
		const currentLength = parallelTasks?.length || 0
		const prevLength = prevParallelTasksLengthRef.current

		// Update the ref for next comparison
		prevParallelTasksLengthRef.current = currentLength

		// Auto-scroll when new subagent is added, but only if user hasn't scrolled at all
		if (currentLength > prevLength && !userScrolledDuringSubagentsRef.current && !disableAutoScrollRef.current) {
			console.log(
				`[ChatView] New subagent added (${prevLength} -> ${currentLength}), auto-scrolling (user hasn't scrolled)`,
			)
			setTimeout(() => scrollToBottomSmooth(), 100)
		} else if (currentLength > prevLength) {
			console.log(
				`[ChatView] New subagent added (${prevLength} -> ${currentLength}), NOT auto-scrolling (user has scrolled or autoscroll disabled)`,
			)
		}
	}, [parallelTasks?.length, scrollToBottomSmooth]) // Track length changes

	const handleWheel = useCallback(
		(event: Event) => {
			const wheelEvent = event as WheelEvent

			// Only disable autoscroll if user is actively scrolling UP
			// Don't disable for small movements or when already at bottom
			if (wheelEvent.deltaY && scrollContainerRef.current?.contains(wheelEvent.target as Node)) {
				// User is scrolling up (negative deltaY)
				// OR scrolling down while not at bottom (manual scroll)
				if (wheelEvent.deltaY < 0 || (wheelEvent.deltaY > 0 && !isAtBottom)) {
					// Only disable if it's a significant scroll (not just a minor adjustment)
					if (Math.abs(wheelEvent.deltaY) > 10) {
						console.log("[ChatView] User scrolled manually, disabling autoscroll")
						disableAutoScrollRef.current = true

						// Track if user scrolled while subagents are active
						// This flag persists until all subagents complete
						if (hasActiveSubagentsRef.current) {
							console.log(
								"[ChatView] User scrolled during subagents, disabling ALL autoscroll until subagents complete",
							)
							userScrolledDuringSubagentsRef.current = true
						}
					}
				}
			}
		},
		[isAtBottom],
	)

	useEvent("wheel", handleWheel, window, { passive: true }) // passive improves scrolling performance

	// Also handle scroll events (for touch/trackpad scrolling)
	const handleScroll = useCallback(() => {
		// Only disable autoscroll if user has scrolled away from bottom
		// AND it's been more than a small threshold (to avoid false positives)
		const scrollContainer = scrollContainerRef.current?.querySelector(".scrollable")
		if (!isAtBottom && scrollContainer) {
			disableAutoScrollRef.current = true

			// Track if user scrolled while subagents are active
			if (hasActiveSubagentsRef.current) {
				console.log(
					"[ChatView] User scrolled (via scroll event) during subagents, disabling ALL autoscroll until subagents complete",
				)
				userScrolledDuringSubagentsRef.current = true
			}
		}
	}, [isAtBottom])

	useEvent("scroll", handleScroll, scrollContainerRef.current, { passive: true })

	// Effect to handle showing the checkpoint warning after a delay
	useEffect(() => {
		// Only show the warning when there's a task but no visible messages yet
		if (task && modifiedMessages.length === 0 && !isStreaming && !isHidden) {
			const timer = setTimeout(() => {
				setShowCheckpointWarning(true)
			}, 5000) // 5 seconds

			return () => clearTimeout(timer)
		} else {
			setShowCheckpointWarning(false)
		}
	}, [task, modifiedMessages.length, isStreaming, isHidden])

	// Effect to hide the checkpoint warning when messages appear
	useEffect(() => {
		if (modifiedMessages.length > 0 || isStreaming || isHidden) {
			setShowCheckpointWarning(false)
		}
	}, [modifiedMessages.length, isStreaming, isHidden])

	const placeholderText = task ? t("chat:typeMessage") : t("chat:typeTask")

	const switchToMode = useCallback(
		(modeSlug: string): void => {
			// Update local state and notify extension to sync mode change.
			setMode(modeSlug)

			// Send the mode switch message.
			vscode.postMessage({ type: "mode", text: modeSlug })
		},
		[setMode],
	)

	const handleSuggestionClickInRow = useCallback(
		(suggestion: SuggestionItem, event?: React.MouseEvent) => {
			// Mark that user has responded if this is a manual click (not auto-approval)
			if (event) {
				userRespondedRef.current = true
			}

			// Mark the current follow-up question as answered when a suggestion is clicked
			if (clineAsk === "followup" && !event?.shiftKey) {
				markFollowUpAsAnswered()
			}

			// Check if we need to switch modes
			if (suggestion.mode) {
				// Only switch modes if it's a manual click (event exists) or auto-approval is allowed
				const isManualClick = !!event
				if (isManualClick || alwaysAllowModeSwitch) {
					// Switch mode without waiting
					switchToMode(suggestion.mode)
				}
			}

			if (event?.shiftKey) {
				// Always append to existing text, don't overwrite
				setInputValue((currentValue: string) => {
					return currentValue !== "" ? `${currentValue} \n${suggestion.answer}` : suggestion.answer
				})
			} else {
				// Don't clear the input value when sending a follow-up choice
				// The message should be sent but the text area should preserve what the user typed
				const preservedInput = inputValueRef.current
				handleSendMessage(suggestion.answer, [])
				// Restore the input value after sending
				setInputValue(preservedInput)
			}
		},
		[handleSendMessage, setInputValue, switchToMode, alwaysAllowModeSwitch, clineAsk, markFollowUpAsAnswered],
	)

	const handleBatchFileResponse = useCallback(
		(response: { [key: string]: boolean }) => {
			// Handle batch file response, e.g., for file uploads
			// Find the task ID from the current ask message
			const askMessage = messages.findLast((m) => m.type === "ask")
			const taskId = activeTaskId || askMessage?.taskId

			vscode.postMessage({
				type: "askResponse",
				askResponse: "objectResponse",
				text: JSON.stringify(response),
				taskId: taskId, // Include task ID
			})
		},
		[messages, activeTaskId],
	)

	// Handler for when FollowUpSuggest component unmounts
	const handleFollowUpUnmount = useCallback(() => {
		// Mark that user has responded
		userRespondedRef.current = true
	}, [])

	const itemContent = useCallback(
		(index: number, messageOrGroup: ClineMessage | ClineMessage[]) => {
			// browser session group
			if (Array.isArray(messageOrGroup)) {
				return (
					<BrowserSessionRow
						messages={messageOrGroup}
						isLast={index === groupedMessages.length - 1}
						lastModifiedMessage={modifiedMessages.at(-1)}
						onHeightChange={handleRowHeightChange}
						isStreaming={isStreaming}
						isExpanded={(messageTs: number) => expandedRows[messageTs] ?? false}
						onToggleExpand={(messageTs: number) => {
							setExpandedRows((prev: Record<number, boolean>) => ({
								...prev,
								[messageTs]: !prev[messageTs],
							}))
						}}
					/>
				)
			}

			// regular message
			return (
				<ChatRow
					key={messageOrGroup.ts}
					message={messageOrGroup}
					isExpanded={expandedRows[messageOrGroup.ts] || false}
					onToggleExpand={toggleRowExpansion} // This was already stabilized
					lastModifiedMessage={modifiedMessages.at(-1)} // Original direct access
					isLast={index === groupedMessages.length - 1} // Original direct access
					onHeightChange={handleRowHeightChange}
					isStreaming={isStreaming}
					onSuggestionClick={handleSuggestionClickInRow} // This was already stabilized
					onBatchFileResponse={handleBatchFileResponse}
					onFollowUpUnmount={handleFollowUpUnmount}
					isFollowUpAnswered={messageOrGroup.ts === currentFollowUpTs}
					editable={
						messageOrGroup.type === "ask" &&
						messageOrGroup.ask === "tool" &&
						(() => {
							let tool: any = {}
							try {
								tool = JSON.parse(messageOrGroup.text || "{}")
							} catch (_) {
								if (messageOrGroup.text?.includes("updateTodoList")) {
									tool = { tool: "updateTodoList" }
								}
							}
							if (tool.tool === "updateTodoList" && alwaysAllowUpdateTodoList) {
								return false
							}
							return tool.tool === "updateTodoList" && enableButtons && !!primaryButtonText
						})()
					}
				/>
			)
		},
		[
			expandedRows,
			toggleRowExpansion,
			modifiedMessages,
			groupedMessages.length,
			handleRowHeightChange,
			isStreaming,
			handleSuggestionClickInRow,
			handleBatchFileResponse,
			handleFollowUpUnmount,
			currentFollowUpTs,
			alwaysAllowUpdateTodoList,
			enableButtons,
			primaryButtonText,
		],
	)

	useEffect(() => {
		if (autoApproveTimeoutRef.current) {
			clearTimeout(autoApproveTimeoutRef.current)
			autoApproveTimeoutRef.current = null
		}

		if (!clineAsk || !enableButtons) {
			return
		}

		// Exit early if user has already responded
		if (userRespondedRef.current) {
			return
		}

		const autoApproveOrReject = async () => {
			// Check for auto-reject first (commands that should be denied)
			if (lastMessage?.ask === "command" && isDeniedCommand(lastMessage)) {
				// Get the denied prefix for the localized message
				const deniedPrefix = getDeniedPrefix(lastMessage.text || "")
				if (deniedPrefix) {
					// Create the localized auto-deny message and send it with the rejection
					const autoDenyMessage = tSettings("autoApprove.execute.autoDenied", { prefix: deniedPrefix })

					vscode.postMessage({
						type: "askResponse",
						askResponse: "noButtonClicked",
						text: autoDenyMessage,
					})
				} else {
					// Auto-reject denied commands immediately if no prefix found
					vscode.postMessage({ type: "askResponse", askResponse: "noButtonClicked" })
				}

				setSendingDisabled(true)
				setClineAsk(undefined)
				setEnableButtons(false)
				return
			}

			// Then check for auto-approve
			if (lastMessage?.ask && isAutoApproved(lastMessage)) {
				// Special handling for follow-up questions
				if (lastMessage.ask === "followup") {
					// Handle invalid JSON
					let followUpData: FollowUpData = {}
					try {
						followUpData = JSON.parse(lastMessage.text || "{}") as FollowUpData
					} catch (error) {
						console.error("Failed to parse follow-up data:", error)
						return
					}

					if (followUpData && followUpData.suggest && followUpData.suggest.length > 0) {
						// Wait for the configured timeout before auto-selecting the first suggestion
						await new Promise<void>((resolve) => {
							autoApproveTimeoutRef.current = setTimeout(() => {
								autoApproveTimeoutRef.current = null
								resolve()
							}, followupAutoApproveTimeoutMs)
						})

						// Check if user responded manually
						if (userRespondedRef.current) {
							return
						}

						// Get the first suggestion
						const firstSuggestion = followUpData.suggest[0]

						// Handle the suggestion click
						handleSuggestionClickInRow(firstSuggestion)
						return
					}
				} else if (lastMessage.ask === "tool" && isWriteToolAction(lastMessage)) {
					await new Promise<void>((resolve) => {
						autoApproveTimeoutRef.current = setTimeout(() => {
							autoApproveTimeoutRef.current = null
							resolve()
						}, writeDelayMs)
					})
				}

				// Find the task ID from the current ask message for auto-approval
				const askMessage = messages.findLast((m) => m.type === "ask")
				const taskId = activeTaskId || askMessage?.taskId

				vscode.postMessage({
					type: "askResponse",
					askResponse: "yesButtonClicked",
					taskId: taskId, // Include task ID for auto-approval
				})
				raceLog("[ChatView post askResponse yesButtonClicked by autoapprover]", { taskId: taskId })

				setSendingDisabled(true)
				setClineAsk(undefined)
				setEnableButtons(false)
			}
		}
		autoApproveOrReject()

		return () => {
			if (autoApproveTimeoutRef.current) {
				clearTimeout(autoApproveTimeoutRef.current)
				autoApproveTimeoutRef.current = null
			}
		}
	}, [
		clineAsk,
		enableButtons,
		handlePrimaryButtonClick,
		alwaysAllowBrowser,
		alwaysAllowReadOnly,
		alwaysAllowReadOnlyOutsideWorkspace,
		alwaysAllowWrite,
		alwaysAllowWriteOutsideWorkspace,
		alwaysAllowExecute,
		followupAutoApproveTimeoutMs,
		alwaysAllowMcp,
		messages,
		allowedCommands,
		deniedCommands,
		mcpServers,
		isAutoApproved,
		lastMessage,
		writeDelayMs,
		isWriteToolAction,
		activeTaskId,
		alwaysAllowFollowupQuestions,
		handleSuggestionClickInRow,
		isAllowedCommand,
		isDeniedCommand,
		getDeniedPrefix,
		tSettings,
	])

	// Function to handle mode switching
	const switchToNextMode = useCallback(() => {
		const allModes = getAllModes(customModes)
		const currentModeIndex = allModes.findIndex((m) => m.slug === mode)
		const nextModeIndex = (currentModeIndex + 1) % allModes.length
		// Update local state and notify extension to sync mode change
		switchToMode(allModes[nextModeIndex].slug)
	}, [mode, customModes, switchToMode])

	// Function to handle switching to previous mode
	const switchToPreviousMode = useCallback(() => {
		const allModes = getAllModes(customModes)
		const currentModeIndex = allModes.findIndex((m) => m.slug === mode)
		const previousModeIndex = (currentModeIndex - 1 + allModes.length) % allModes.length
		// Update local state and notify extension to sync mode change
		switchToMode(allModes[previousModeIndex].slug)
	}, [mode, customModes, switchToMode])

	// Add keyboard event handler
	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			// Check for Command/Ctrl + Period (with or without Shift)
			// Using event.key to respect keyboard layouts (e.g., Dvorak)
			if ((event.metaKey || event.ctrlKey) && event.key === ".") {
				event.preventDefault() // Prevent default browser behavior

				if (event.shiftKey) {
					// Shift + Period = Previous mode
					switchToPreviousMode()
				} else {
					// Just Period = Next mode
					switchToNextMode()
				}
			}
		},
		[switchToNextMode, switchToPreviousMode],
	)

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown)

		return () => {
			window.removeEventListener("keydown", handleKeyDown)
		}
	}, [handleKeyDown])

	useImperativeHandle(ref, () => ({
		acceptInput: () => {
			if (enableButtons && primaryButtonText) {
				handlePrimaryButtonClick(inputValue, selectedImages)
			} else if (!sendingDisabled && !isProfileDisabled && (inputValue.trim() || selectedImages.length > 0)) {
				handleSendMessage(inputValue, selectedImages)
			}
		},
	}))

	const handleCondenseContext = (taskId: string) => {
		if (isCondensing || sendingDisabled) {
			return
		}
		setIsCondensing(true)
		setSendingDisabled(true)
		vscode.postMessage({ type: "condenseTaskContextRequest", text: taskId })
	}

	const areButtonsVisible = showScrollToBottom || primaryButtonText || secondaryButtonText || isStreaming

	return (
		<div
			data-testid="chat-view"
			className={isHidden ? "hidden" : "fixed top-0 left-0 right-0 bottom-0 flex flex-col overflow-hidden"}>
			{(showAnnouncement || showAnnouncementModal) && (
				<Announcement
					hideAnnouncement={() => {
						if (showAnnouncementModal) {
							setShowAnnouncementModal(false)
						}
						if (showAnnouncement) {
							hideAnnouncement()
						}
					}}
				/>
			)}
			{task ? (
				<>
					<TaskHeader
						task={task}
						tokensIn={apiMetrics.totalTokensIn}
						tokensOut={apiMetrics.totalTokensOut}
						cacheWrites={apiMetrics.totalCacheWrites}
						cacheReads={apiMetrics.totalCacheReads}
						totalCost={apiMetrics.totalCost}
						contextTokens={apiMetrics.contextTokens}
						buttonsDisabled={sendingDisabled}
						handleCondenseContext={handleCondenseContext}
						todos={latestTodos}
					/>

					{hasSystemPromptOverride && (
						<div className="px-3">
							<SystemPromptWarning />
						</div>
					)}

					{showCheckpointWarning && (
						<div className="px-3">
							<CheckpointWarning />
						</div>
					)}
				</>
			) : (
				<div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 relative">
					{/* Moved Task Bar Header Here */}
					{tasks.length !== 0 && (
						<div className="flex text-vscode-descriptionForeground w-full mx-auto px-5 pt-3">
							<div className="flex items-center gap-1 cursor-pointer" onClick={toggleExpanded}>
								{tasks.length < 10 && (
									<span className={`font-medium text-xs `}>{t("history:recentTasks")}</span>
								)}
								<span
									className={`codicon  ${isExpanded ? "codicon-eye" : "codicon-eye-closed"} scale-90`}
								/>
							</div>
						</div>
					)}
					<div
						className={` w-full flex flex-col gap-4 m-auto ${isExpanded && tasks.length > 0 ? "mt-0" : ""} px-3.5 min-[370px]:px-10 pt-5 transition-all duration-300`}>
						{/* Version indicator in top-right corner - only on welcome screen */}
						<VersionIndicator
							onClick={() => setShowAnnouncementModal(true)}
							className="absolute top-2 right-3 z-10"
						/>

						<RooHero />
						{telemetrySetting === "unset" && <TelemetryBanner />}

						<div className="mb-2.5">
							{cloudIsAuthenticated || taskHistory.length < 4 ? <RooTips /> : <RooCloudCTA />}
						</div>
						{/* Show the task history preview if expanded and tasks exist */}
						{taskHistory.length > 0 && isExpanded && <HistoryPreview />}
					</div>
				</div>
			)}

			{/*
			// Flex layout explanation:
			// 1. Content div above uses flex: "1 1 0" to:
			//    - Grow to fill available space (flex-grow: 1)
			//    - Shrink when AutoApproveMenu needs space (flex-shrink: 1)
			//    - Start from zero size (flex-basis: 0) to ensure proper distribution
			//    minHeight: 0 allows it to shrink below its content height
			//
			// 2. AutoApproveMenu uses flex: "0 1 auto" to:
			//    - Not grow beyond its content (flex-grow: 0)
			//    - Shrink when viewport is small (flex-shrink: 1)
			//    - Use its content size as basis (flex-basis: auto)
			//    This ensures it takes its natural height when there's space
			//    but becomes scrollable when the viewport is too small
			*/}
			{!task && (
				<div className="mb-1 flex-initial min-h-0">
					<AutoApproveMenu />
				</div>
			)}

			{task && (
				<>
					<div className="grow flex" ref={scrollContainerRef}>
						<Virtuoso
							ref={virtuosoRef}
							key={task.ts}
							className="scrollable grow overflow-y-scroll mb-1"
							increaseViewportBy={{ top: 3_000, bottom: 1000 }}
							data={groupedMessages}
							itemContent={itemContent}
							atBottomStateChange={(atBottom) => {
								console.log(
									`[Virtuoso] atBottomStateChange: ${atBottom}, disableAutoScrollRef.current: ${disableAutoScrollRef.current}`,
								)
								setIsAtBottom(atBottom)

								// Re-enable autoscroll if user scrolls back to bottom manually
								// but only if no subagents are active OR user hasn't scrolled during subagents
								if (atBottom) {
									if (!hasActiveSubagentsRef.current) {
										console.log("[Virtuoso] At bottom with no subagents, re-enabling autoscroll")
										disableAutoScrollRef.current = false
									} else if (!userScrolledDuringSubagentsRef.current) {
										console.log(
											"[Virtuoso] At bottom with subagents but user hasn't scrolled, keeping autoscroll enabled",
										)
										disableAutoScrollRef.current = false
									}
								}

								setShowScrollToBottom(disableAutoScrollRef.current && !atBottom)
							}}
							atBottomThreshold={10} // anything lower causes issues with followOutput
							initialTopMostItemIndex={groupedMessages.length - 1}
							components={{
								Footer: () => {
									if (parallelTasks && parallelTasks.length > 0) {
										return (
											<div className="px-3">
												<SubagentStack 
													subagents={parallelTasks} 
													isAutoScrollEnabled={!disableAutoScrollRef.current && !userScrolledDuringSubagentsRef.current}
													onScrollToBottom={scrollToBottomSmooth}
												/>
											</div>
										)
									}
									return null
								},
							}}
						/>
					</div>
					<div className={`flex-initial min-h-0 ${!areButtonsVisible ? "mb-1" : ""}`}>
						<AutoApproveMenu />
					</div>
					{areButtonsVisible && (
						<div
							className={`flex h-9 items-center mb-1 px-[15px] ${
								showScrollToBottom
									? "opacity-100"
									: enableButtons || (isStreaming && !didClickCancel)
										? "opacity-100"
										: "opacity-50"
							}`}>
							{showScrollToBottom ? (
								<StandardTooltip content={t("chat:scrollToBottom")}>
									<VSCodeButton
										appearance="secondary"
										className="flex-[2]"
										onClick={() => {
											scrollToBottomSmooth()
											disableAutoScrollRef.current = false
										}}>
										<span className="codicon codicon-chevron-down"></span>
									</VSCodeButton>
								</StandardTooltip>
							) : (
								<>
									{primaryButtonText && !isStreaming && (
										<StandardTooltip
											content={
												primaryButtonText === t("chat:retry.title")
													? t("chat:retry.tooltip")
													: primaryButtonText === t("chat:save.title")
														? t("chat:save.tooltip")
														: primaryButtonText === t("chat:approve.title")
															? t("chat:approve.tooltip")
															: primaryButtonText === t("chat:runCommand.title")
																? t("chat:runCommand.tooltip")
																: primaryButtonText === t("chat:startNewTask.title")
																	? t("chat:startNewTask.tooltip")
																	: primaryButtonText === t("chat:resumeTask.title")
																		? t("chat:resumeTask.tooltip")
																		: primaryButtonText ===
																			  t("chat:proceedAnyways.title")
																			? t("chat:proceedAnyways.tooltip")
																			: primaryButtonText ===
																				  t("chat:proceedWhileRunning.title")
																				? t("chat:proceedWhileRunning.tooltip")
																				: undefined
											}>
											<VSCodeButton
												appearance="primary"
												disabled={!enableButtons}
												className={secondaryButtonText ? "flex-1 mr-[6px]" : "flex-[2] mr-0"}
												onClick={() => handlePrimaryButtonClick(inputValue, selectedImages)}>
												{primaryButtonText}
											</VSCodeButton>
										</StandardTooltip>
									)}
									{(secondaryButtonText || isStreaming) && (
										<StandardTooltip
											content={
												isStreaming
													? t("chat:cancel.tooltip")
													: secondaryButtonText === t("chat:startNewTask.title")
														? t("chat:startNewTask.tooltip")
														: secondaryButtonText === t("chat:reject.title")
															? t("chat:reject.tooltip")
															: secondaryButtonText === t("chat:terminate.title")
																? t("chat:terminate.tooltip")
																: undefined
											}>
											<VSCodeButton
												appearance="secondary"
												disabled={!enableButtons && !(isStreaming && !didClickCancel)}
												className={isStreaming ? "flex-[2] ml-0" : "flex-1 ml-[6px]"}
												onClick={() => handleSecondaryButtonClick(inputValue, selectedImages)}>
												{isStreaming ? t("chat:cancel.title") : secondaryButtonText}
											</VSCodeButton>
										</StandardTooltip>
									)}
								</>
							)}
						</div>
					)}
				</>
			)}

			<QueuedMessages
				queue={messageQueue}
				onRemove={(index) => setMessageQueue((prev) => prev.filter((_, i) => i !== index))}
				onUpdate={(index, newText) => {
					setMessageQueue((prev) => prev.map((msg, i) => (i === index ? { ...msg, text: newText } : msg)))
				}}
			/>
			<ChatTextArea
				ref={textAreaRef}
				inputValue={inputValue}
				setInputValue={setInputValue}
				sendingDisabled={sendingDisabled || isProfileDisabled}
				selectApiConfigDisabled={sendingDisabled && clineAsk !== "api_req_failed"}
				placeholderText={placeholderText}
				selectedImages={selectedImages}
				setSelectedImages={setSelectedImages}
				onSend={() => handleSendMessage(inputValue, selectedImages)}
				onSelectImages={selectImages}
				shouldDisableImages={shouldDisableImages}
				onHeightChange={() => {
					// COMPLETELY DISABLED - This was causing unwanted autoscroll
					console.log(
						`[ChatTextArea] onHeightChange triggered, isAtBottom: ${isAtBottom} - BUT NOT SCROLLING (disabled)`,
					)
					// Original code completely disabled:
					// if (isAtBottom) {
					// 	scrollToBottomAuto()
					// }
				}}
				mode={mode}
				setMode={setMode}
				modeShortcutText={modeShortcutText}
			/>

			{isProfileDisabled && (
				<div className="px-3">
					<ProfileViolationWarning />
				</div>
			)}

			<div id="roo-portal" />
		</div>
	)
}

const ChatView = forwardRef(ChatViewComponent)

export default ChatView
