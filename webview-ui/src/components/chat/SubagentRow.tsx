import React, { useState, useCallback, useRef, useEffect } from "react"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { vscode } from "../../utils/vscode"
import { useTranslation } from "react-i18next"
import { ToolDisplay } from "./ToolDisplay"
import { IconButton } from "./IconButton"
import { getSubagentTypeColor } from "../../utils/subagentTypeColors"

// Debug logging
const DEBUG = false
const debugLog = (component: string, action: string, data?: any) => {
	if (!DEBUG) return
	const timestamp = new Date().toISOString()
	console.log(`[${timestamp}] [${component}] ${action}`, data || "")
}

// Global state to persist expanded feedback states and text across component re-renders
const expandedFeedbackStates = new Map<string, boolean>()
const feedbackTextStates = new Map<string, string>()
// Global state to track which subagents have active text input (should freeze completely)
const activeTextInputStates = new Map<string, boolean>()

// Fast toolCall comparison - avoid expensive JSON.stringify
const toolCallsEqual = (prev: any, next: any): boolean => {
	if (prev === next) return true
	if (!prev && !next) return true
	if (!prev || !next) return false
	
	return (
		prev.toolName === next.toolName &&
		prev.isPartial === next.isPartial &&
		// Only stringify toolInput if they exist and are different objects
		(prev.toolInput === next.toolInput || JSON.stringify(prev.toolInput) === JSON.stringify(next.toolInput))
	)
}

// Types
export interface SubagentInfo {
	taskId: string
	description: string
	status: "running" | "completed" | "failed"
	lastActivity?: number
	askType?: string
	askText?: string
	subagent_type?: string
	toolCall?: {
		toolName: string
		toolInput: any
		isPartial?: boolean
	}
}

interface SubagentRowProps {
	subagent: SubagentInfo
}

// ============================================================================
// COMPONENT 1: SubagentHeader - Handles activity indicator, badge, description
// ============================================================================

// Subagent Type Badge component
const SubagentTypeBadge: React.FC<{ subagentType?: string }> = React.memo(({ subagentType }) => {
	if (!subagentType) return null

	const colors = getSubagentTypeColor(subagentType)

	return (
		<span
			className="subagent-type-badge"
			style={{
				backgroundColor: colors.background,
				color: colors.text,
				borderColor: colors.border,
			}}
			title={`${subagentType} - Predefined agent for specialized tasks`}
			aria-label={`${subagentType} subagent type`}>
			{subagentType}
		</span>
	)
})

SubagentTypeBadge.displayName = "SubagentTypeBadge"

// Activity indicator component - NO INTERVALS, CSS-only animation for maximum performance
const ActivityIndicator: React.FC<{ lastActivity?: number; taskId?: string; status?: string }> = React.memo(
	({ lastActivity, taskId, status }) => {
		const [currentTime, setCurrentTime] = useState(Date.now())
		
		// Update current time every second only when component is active
		useEffect(() => {
			const isRunning = status === "running"
			if (!isRunning && !lastActivity) return
			
			const interval = setInterval(() => {
				setCurrentTime(Date.now())
			}, 1000)
			
			return () => clearInterval(interval)
		}, [status, lastActivity])
		
		// Simple calculation - now using stable currentTime state
		const isRunning = status === "running"
		const hasRecentActivity = lastActivity && (currentTime - lastActivity < 3000)
		const isActive = isRunning || hasRecentActivity

		return (
			<span
				className={`activity-indicator inline-block w-2 h-2 rounded-full transition-all duration-300 ${
					isActive ? "bg-green-500 animate-pulse" : "bg-gray-600"
				}`}
				style={{
					backgroundColor: isActive ? "#4ADE80" : "#6B7280",
				}}
				title={isRunning ? "Running" : hasRecentActivity ? "Recent activity" : "Idle"}
			/>
		)
	},
)

ActivityIndicator.displayName = "ActivityIndicator"

// Header component - manages activity indicator, status, badge, and description
const SubagentHeader: React.FC<{
	taskId: string
	status: string
	lastActivity?: number
	subagent_type?: string
	description: string
}> = React.memo(
	({ taskId, status, lastActivity, subagent_type, description }) => {
		const renderCount = useRef(0)
		renderCount.current++

		// Reduce debug logging frequency to prevent render thrashing
		useEffect(() => {
			if (DEBUG && renderCount.current % 10 === 1) {
				debugLog("SubagentHeader", `Render #${renderCount.current}`, {
					taskId,
					status,
					hasActivity: !!lastActivity,
				})
			}
		}, [taskId, status, lastActivity])

		const isCompleted = status === "completed"

		return (
			<div className="flex items-center w-full justify-between">
				<div className="flex items-center gap-2 truncate" style={{ marginLeft: "10%", flex: 1 }}>
					<ActivityIndicator lastActivity={lastActivity} taskId={taskId} status={status} />
					<span
						className="font-bold"
						style={{
							color: isCompleted ? "#4ADE80" : "transparent",
							fontSize: "16px",
							minWidth: "20px",
							display: "inline-block",
						}}>
						✔
					</span>
					<SubagentTypeBadge subagentType={subagent_type} />
					<span className="truncate">{description}</span>
				</div>
			</div>
		)
	},
	// Custom comparison to prevent unnecessary re-renders
	(prevProps, nextProps) => {
		// HIGHEST PRIORITY: If user has active text input, freeze this component too
		const hasActiveTextInput = activeTextInputStates.get(prevProps.taskId) === true
		if (hasActiveTextInput) {
			return true // Skip all re-renders when user is typing
		}

		return (
			prevProps.taskId === nextProps.taskId &&
			prevProps.status === nextProps.status &&
			prevProps.lastActivity === nextProps.lastActivity &&
			prevProps.subagent_type === nextProps.subagent_type &&
			prevProps.description === nextProps.description
		)
	},
)

SubagentHeader.displayName = "SubagentHeader"

// ============================================================================
// COMPONENT 2: SubagentToolDisplay - Shows last tool call
// ============================================================================

const SubagentToolDisplay: React.FC<{
	taskId: string
	toolCall?: SubagentInfo["toolCall"]
	askType?: string
}> = React.memo(
	({ taskId, toolCall, askType }) => {
		const renderCount = useRef(0)
		renderCount.current++

		// Reduce debug logging frequency to prevent render thrashing
		useEffect(() => {
			if (DEBUG && renderCount.current % 10 === 1) {
				debugLog("SubagentToolDisplay", `Render #${renderCount.current}`, {
					taskId,
					hasToolCall: !!toolCall,
					askType,
				})
			}
		}, [taskId, toolCall, askType])

		// Only show when there's a tool call and no ask type
		if (!toolCall || askType) {
			return null
		}

		return (
			<div className="mt-1" style={{ marginLeft: "10%", marginRight: "10%" }}>
				<ToolDisplay askType="" askText="" toolCall={toolCall} compact={true} />
			</div>
		)
	},
	// Custom comparison
	(prevProps, nextProps) => {
		// HIGHEST PRIORITY: If user has active text input, freeze this component too
		const hasActiveTextInput = activeTextInputStates.get(prevProps.taskId) === true
		if (hasActiveTextInput) {
			return true // Skip all re-renders when user is typing
		}

		return (
			prevProps.taskId === nextProps.taskId &&
			prevProps.askType === nextProps.askType &&
			toolCallsEqual(prevProps.toolCall, nextProps.toolCall)
		)
	},
)

SubagentToolDisplay.displayName = "SubagentToolDisplay"

// ============================================================================
// COMPONENT 3: SubagentApproval - Handles approval UI and feedback
// ============================================================================

const SubagentApproval: React.FC<{
	taskId: string
	askType?: string
	askText?: string
	toolCall?: SubagentInfo["toolCall"]
}> = React.memo(
	({ taskId, askType, askText, toolCall }) => {
		const { t } = useTranslation()

		// Use global Map to persist expanded state across component re-renders
		const [expandedFeedback, setExpandedFeedbackState] = useState(() => {
			return expandedFeedbackStates.get(taskId) || false
		})

		const setExpandedFeedback = useCallback(
			(value: boolean) => {
				expandedFeedbackStates.set(taskId, value)
				setExpandedFeedbackState(value)
			},
			[taskId],
		)

		// Use global Map to persist feedback text across component re-renders
		const [feedbackText, setFeedbackTextState] = useState(() => {
			return feedbackTextStates.get(taskId) || ""
		})

		// VSCodeTextArea doesn't support refs properly due to ReactWrapper
		// We'll use the data attribute approach for focus management

	// Track render count for debugging
	const renderCount = useRef(0)
	renderCount.current++

	// Use a stable ID for this component instance to prevent event handler detachment
	const componentId = useRef(`approval-${taskId}`).current

	// Only log in debug mode and reduce frequency to prevent render thrashing
	useEffect(() => {
		if (DEBUG && renderCount.current % 10 === 1) { // Only log every 10th render to reduce spam
			debugLog("SubagentApproval", `Render #${renderCount.current}`, {
				taskId,
				componentId,
				askType,
				hasAskText: !!askText,
				expandedFeedback,
				feedbackLength: feedbackText.length,
				renderCount: renderCount.current,
				persistedState: expandedFeedbackStates.get(taskId),
			})
		}
	}, [taskId, componentId, askType, askText, expandedFeedback, feedbackText.length])

	// Use refs to ensure handlers always have access to current values
	const feedbackTextRef = useRef(feedbackText)
	feedbackTextRef.current = feedbackText

	// Stable handlers that won't cause re-renders
	const handleApprove = useCallback(() => {
		const feedback = feedbackTextRef.current.trim()
		debugLog("SubagentApproval", "APPROVE CLICKED", {
			taskId,
			componentId,
			feedback,
			timestamp: Date.now(),
			renderCount: renderCount.current,
		})

		vscode.postMessage({
			type: "askResponse",
			askResponse: "yesButtonClicked",
			taskId: taskId,
			text: feedback || undefined,
		})

		// Clear feedback after sending using direct Map updates
		feedbackTextStates.set(taskId, "")
		setFeedbackTextState("")
		setExpandedFeedback(false)

		debugLog("SubagentApproval", "APPROVE MESSAGE SENT", {
			taskId,
			componentId,
		})
	}, [taskId, componentId])

	const handleReject = useCallback(() => {
		const feedback = feedbackTextRef.current.trim()
		debugLog("SubagentApproval", "REJECT CLICKED", {
			taskId,
			componentId,
			feedback,
			timestamp: Date.now(),
			renderCount: renderCount.current,
		})

		vscode.postMessage({
			type: "askResponse",
			askResponse: "noButtonClicked",
			taskId: taskId,
			text: feedback || undefined,
		})

		// Clear feedback after sending using direct Map updates
		feedbackTextStates.set(taskId, "")
		setFeedbackTextState("")
		setExpandedFeedback(false)

		debugLog("SubagentApproval", "REJECT MESSAGE SENT", {
			taskId,
			componentId,
		})
	}, [taskId, componentId])

	const toggleFeedbackArea = useCallback(() => {
		const willExpand = !expandedFeedback
		debugLog("SubagentApproval", "TOGGLE FEEDBACK", {
			taskId,
			componentId,
			from: expandedFeedback,
			to: willExpand,
			persistedBefore: expandedFeedbackStates.get(taskId),
		})

		setExpandedFeedback(willExpand)

		debugLog("SubagentApproval", "TOGGLE FEEDBACK COMPLETE", {
			taskId,
			componentId,
			persistedAfter: expandedFeedbackStates.get(taskId),
		})

		// Focus on the textarea when expanding and scroll it into view
		if (willExpand) {
			setTimeout(() => {
				const feedbackArea = document.querySelector(`[data-feedback-area="${taskId}"]`) as HTMLElement
				if (feedbackArea) {
					// Scroll the feedback area into view
					feedbackArea.scrollIntoView({
						behavior: "smooth",
						block: "nearest",
						inline: "nearest",
					})
					// VSCodeTextArea renders as a web component, so find the actual textarea inside
					const textarea = feedbackArea.querySelector('textarea') as HTMLTextAreaElement
					if (textarea) {
						textarea.focus()
					}
				}
			}, 100)
		}
	}, [expandedFeedback, taskId, componentId, setExpandedFeedback])

	const handleFeedbackChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			// Native textarea only uses standard event
			const value = e.target.value
			
			// Update both the ref and state
			feedbackTextRef.current = value
			feedbackTextStates.set(taskId, value)
			setFeedbackTextState(value)
			
			debugLog("SubagentApproval", "FEEDBACK CHANGED", {
				taskId,
				componentId,
				length: value.length,
				value: value.substring(0, 50), // Log first 50 chars for debugging
			})
		},
		[taskId, componentId],
	)

	const handleFeedbackSubmit = useCallback(() => {
		const feedback = feedbackTextRef.current.trim()
		debugLog("SubagentApproval", "FEEDBACK SUBMIT", {
			taskId,
			componentId,
			feedback,
			timestamp: Date.now(),
		})

		vscode.postMessage({
			type: "askResponse",
			askResponse: "noButtonClicked",
			taskId: taskId,
			text: feedback || undefined,
		})

		// Clear feedback after sending using direct Map updates
		feedbackTextStates.set(taskId, "")
		setFeedbackTextState("")
		setExpandedFeedback(false)

		debugLog("SubagentApproval", "FEEDBACK MESSAGE SENT", {
			taskId,
			componentId,
		})
	}, [taskId, componentId])

	// If no ask type, render nothing
	if (!askType) {
		return (
			<div
				className="mt-1 text-xs text-vscode-descriptionForeground"
				style={{ marginLeft: "10%", marginRight: "10%", minHeight: "16px" }}></div>
		)
	}

	return (
		<div className="mt-2" style={{ marginLeft: "10%", marginRight: "10%" }}>
			<ToolDisplay askType={askType} askText={askText} toolCall={toolCall} compact={true} />

			{/* Only show buttons when message is complete (not partial) */}
			{(!toolCall || toolCall.isPartial !== true) && (
				<div className="flex gap-2 mt-2">
					<VSCodeButton
						onPointerUp={(_e) => {
							debugLog("SubagentApproval", "APPROVE POINTER UP", {
								taskId,
								componentId,
								renderCount: renderCount.current,
							})
							// Call handleApprove directly on pointer up
							handleApprove()
						}}
						onMouseDown={(_e) => {
							// Log mouse down but don't stop propagation
							debugLog("SubagentApproval", "APPROVE MOUSE DOWN", {
								taskId,
								componentId,
								renderCount: renderCount.current,
							})
						}}
						data-testid={`approve-${taskId}`}
						data-component-id={componentId}>
						{t("chat:approve.title", "Approve")}
					</VSCodeButton>
					<VSCodeButton
						appearance="secondary"
						onPointerUp={(_e) => {
							debugLog("SubagentApproval", "REJECT POINTER UP", {
								taskId,
								componentId,
								renderCount: renderCount.current,
							})
							// Call handleReject directly on pointer up
							handleReject()
						}}
						onMouseDown={(_e) => {
							// Log mouse down but don't stop propagation
							debugLog("SubagentApproval", "REJECT MOUSE DOWN", {
								taskId,
								componentId,
								renderCount: renderCount.current,
							})
						}}
						data-testid={`reject-${taskId}`}
						data-component-id={componentId}>
						{t("chat:reject.title", "Reject")}
					</VSCodeButton>
					<VSCodeButton
						appearance="icon"
						onPointerUp={(_e) => {
							debugLog("SubagentApproval", "TOGGLE POINTER UP", {
								taskId,
								componentId,
								renderCount: renderCount.current,
							})
							// Call toggleFeedbackArea directly on pointer up
							toggleFeedbackArea()
						}}
						onMouseDown={(_e) => {
							// Log mouse down but don't stop propagation
							debugLog("SubagentApproval", "TOGGLE MOUSE DOWN", {
								taskId,
								componentId,
								renderCount: renderCount.current,
							})
						}}
						title={expandedFeedback ? "Hide feedback" : "Add feedback"}
						data-component-id={componentId}>
						<span className={`codicon codicon-${expandedFeedback ? "chevron-up" : "comment"}`} />
					</VSCodeButton>
				</div>
			)}

			{expandedFeedback && (
				<div className="mt-2" data-feedback-area={taskId}>
					<div className="flex items-end gap-2">
						<textarea
							value={feedbackText}
							onChange={handleFeedbackChange}
							placeholder="Provide feedback for the subagent..."
							rows={3}
							className="flex-1 vscode-text-area"
							style={{
								backgroundColor: 'var(--vscode-input-background)',
								color: 'var(--vscode-input-foreground)',
								border: '1px solid var(--vscode-input-border)',
								borderRadius: '2px',
								padding: '4px 8px',
								fontFamily: 'var(--vscode-font-family)',
								fontSize: 'var(--vscode-font-size)',
								resize: 'vertical',
								outline: 'none',
							}}
							onFocus={(e) => {
								e.target.style.borderColor = 'var(--vscode-focusBorder)'
								// Freeze this subagent row when text area is focused
								activeTextInputStates.set(taskId, true)
								debugLog("SubagentApproval", "TEXTAREA FOCUSED - FREEZING ROW", {
									taskId,
									componentId,
									timestamp: Date.now(),
								})
								if (DEBUG) console.log(`TEXTAREA FOCUSED - Row frozen for task ${taskId}`)
							}}
							onBlur={(e) => {
								e.target.style.borderColor = 'var(--vscode-input-border)'
								// Unfreeze this subagent row when text area loses focus
								activeTextInputStates.set(taskId, false)
								debugLog("SubagentApproval", "TEXTAREA BLURRED - UNFREEZING ROW", {
									taskId,
									componentId,
									timestamp: Date.now(),
								})
								if (DEBUG) console.log(`TEXTAREA BLURRED - Row unfrozen for task ${taskId}`)
							}}
							onClick={(e) => {
								if (DEBUG) console.log(`TEXTAREA CLICKED for task ${taskId}`)
								// Stop event propagation and ensure focus
								e.stopPropagation()
								e.preventDefault()
								e.currentTarget.focus()
							}}
							onMouseDown={(e) => {
								if (DEBUG) console.log(`TEXTAREA MOUSEDOWN for task ${taskId}`)
								// Prevent any parent handlers from interfering
								e.stopPropagation()
							}}
							onKeyDown={(e) => {
								if (DEBUG) console.log(`TEXTAREA KEYDOWN: "${e.key}" for task ${taskId}`)
								// Ensure key events reach the textarea
								e.stopPropagation()
							}}
							onInput={(e) => {
								if (DEBUG) console.log(`TEXTAREA INPUT: "${(e.target as HTMLTextAreaElement).value}" for task ${taskId}`)
								// Prevent input events from being blocked
								e.stopPropagation()
							}}
						/>
						<IconButton iconClass="codicon-send" title="Send message" onClick={handleFeedbackSubmit} />
					</div>
				</div>
			)}
		</div>
	)
	},
	// Custom comparison function to prevent unnecessary re-renders
	(prevProps, nextProps) => {
		// Only re-render if these specific props change
		return (
			prevProps.taskId === nextProps.taskId &&
			prevProps.askType === nextProps.askType &&
			prevProps.askText === nextProps.askText &&
			toolCallsEqual(prevProps.toolCall, nextProps.toolCall)
		)
	},
)

SubagentApproval.displayName = "SubagentApproval"

// ============================================================================
// MAIN COMPONENT: SubagentRow - Composed of three independent components
// ============================================================================

export const SubagentRow: React.FC<SubagentRowProps> = React.memo(
	({ subagent }) => {
		const renderCount = useRef(0)
		renderCount.current++

		// Reduce debug logging frequency to prevent render thrashing during streaming
		useEffect(() => {
			if (DEBUG && renderCount.current % 5 === 1) { // Only log every 5th render
				debugLog("SubagentRow", `Main Container Render #${renderCount.current}`, {
					taskId: subagent.taskId,
					status: subagent.status,
					askType: subagent.askType,
				})
			}
		}, [subagent.taskId, subagent.status, subagent.askType])

		const isCompleted = subagent.status === "completed"

		return (
			<div
				data-task-id={subagent.taskId}
				className={`subagent-item w-full rounded border border-vscode-button-secondaryBorder bg-vscode-button-secondaryBackground ${isCompleted ? "completed" : ""}`}
				style={{
					padding: "8px",
					boxSizing: "border-box",
				}}>
				<div className="flex flex-col w-full">
					{/* Component 1: Header with activity indicator, badge, description */}
					<SubagentHeader
						taskId={subagent.taskId}
						status={subagent.status}
						lastActivity={subagent.lastActivity}
						subagent_type={subagent.subagent_type}
						description={subagent.description}
					/>

					{/* Component 2: Tool display (only when not asking) */}
					<SubagentToolDisplay taskId={subagent.taskId} toolCall={subagent.toolCall} askType={subagent.askType} />

					{/* Component 3: Approval UI with buttons and feedback */}
					<SubagentApproval
						taskId={subagent.taskId}
						askType={subagent.askType}
						askText={subagent.askText}
						toolCall={subagent.toolCall}
					/>
				</div>
			</div>
		)
	},
	// Custom comparison to prevent re-renders when parent creates new object with same values
	(prevProps, nextProps) => {
		const prev = prevProps.subagent
		const next = nextProps.subagent
		
		// HIGHEST PRIORITY: If user has active text input, freeze the row completely
		const hasActiveTextInput = activeTextInputStates.get(prev.taskId) === true
		if (hasActiveTextInput) {
			debugLog("SubagentRow", "TEXT INPUT ACTIVE - FREEZING ROW COMPLETELY", {
				taskId: prev.taskId,
			})
			console.log(`SUBAGENT ROW FROZEN - Skipping re-render for task ${prev.taskId}`)
			return true // Skip all re-renders when user is typing
		}
		
		// CRITICAL: If the subagent is waiting for approval (has askType),
		// freeze the component completely - don't re-render unless askType changes
		if (prev.askType && next.askType) {
			// Both are waiting for approval
			// Only re-render if the askType, askText, or toolCall changes (approval state changed)
			const shouldSkipRender = (
				prev.taskId === next.taskId &&
				prev.askType === next.askType &&
				prev.askText === next.askText &&
				toolCallsEqual(prev.toolCall, next.toolCall)
			)
			
			if (!shouldSkipRender) {
				debugLog("SubagentRow", "APPROVAL STATE CHANGED - ALLOWING RE-RENDER", {
					taskId: prev.taskId,
					prevAskType: prev.askType,
					nextAskType: next.askType,
				})
			}
			
			return shouldSkipRender
		}
		
		// If transitioning to/from approval state, allow re-render
		if (prev.askType !== next.askType) {
			debugLog("SubagentRow", "ASK TYPE TRANSITION - ALLOWING RE-RENDER", {
				taskId: prev.taskId,
				from: prev.askType,
				to: next.askType,
			})
			return false
		}
		
		// Normal comparison for non-approval states
		return (
			prev.taskId === next.taskId &&
			prev.status === next.status &&
			prev.lastActivity === next.lastActivity &&
			prev.askType === next.askType &&
			prev.askText === next.askText &&
			prev.description === next.description &&
			prev.subagent_type === next.subagent_type &&
			toolCallsEqual(prev.toolCall, next.toolCall)
		)
	}
)

SubagentRow.displayName = "SubagentRow"
