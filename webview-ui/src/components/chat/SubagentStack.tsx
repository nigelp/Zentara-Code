import React, { useState, useRef, useEffect } from "react"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { vscode } from "../../utils/vscode"
import { SubagentRow, type SubagentInfo } from "./SubagentRow"
import "./SubagentStack.css"

// Debug logging  
const DEBUG = false

function usePeriodicSubagentUpdates(rawSubagents: SubagentInfo[]) {
	return rawSubagents
}

interface SubagentStackProps {
	subagents: SubagentInfo[]
	isAutoScrollEnabled?: boolean
	onScrollToBottom?: () => void
}

export const SubagentStack: React.FC<SubagentStackProps> = React.memo(
	({ subagents: rawSubagents, isAutoScrollEnabled = true, onScrollToBottom }) => {
		const subagents = usePeriodicSubagentUpdates(rawSubagents)
		const stackRef = useRef<HTMLDivElement>(null)
		const subagentsRef = useRef(subagents)
		subagentsRef.current = subagents
		
		const prevSubagentCountRef = useRef(0)
		const wasEmptyRef = useRef(true) // Track if we were previously empty
		const lastScrollRequestRef = useRef(0) // Throttle scroll requests

		// State for cancel all button feedback
		const [isCancelling, setIsCancelling] = useState(false)

		// Log when subagents prop changes
		useEffect(() => {
			// When transitioning from empty to having subagents (new batch starting)
			if (wasEmptyRef.current && subagents.length > 0) {
				// New batch started
				prevSubagentCountRef.current = 0
			}

			// Update the wasEmpty ref for next render
			wasEmptyRef.current = subagents.length === 0
		}, [subagents])

		// Auto-scroll ONLY when NEW subagents are added AND parent allows it
		useEffect(() => {
			const currentCount = subagents.length
			const previousCount = prevSubagentCountRef.current

			// Only autoscroll if:
			// 1. Parent component allows autoscroll (ChatView's logic)
			// 2. There are subagents
			// 3. A NEW subagent was added (count increased)
			if (isAutoScrollEnabled && currentCount > 0 && currentCount > previousCount) {
				if (stackRef.current) {
					// Check if the stack is near the bottom of the viewport
					const rect = stackRef.current.getBoundingClientRect()
					const windowHeight = window.innerHeight
					const isNearBottom = rect.bottom > windowHeight - 200 // Within 200px of bottom

					if (isNearBottom) {
						// Throttle scroll requests to avoid excessive DOM operations (max 1 per 200ms)
						const now = Date.now()
						if (now - lastScrollRequestRef.current < 200) {
							return // Skip this scroll request
						}
						lastScrollRequestRef.current = now

						if (DEBUG) {
							console.log(
								`[SubagentStack] New subagent added (${previousCount} -> ${currentCount}), requesting scroll`
							)
						}
						// Add a small delay to ensure DOM is updated
						setTimeout(() => {
							// Use parent's scroll function if provided, otherwise scroll locally
							if (onScrollToBottom) {
								onScrollToBottom()
							} else if (stackRef.current) {
								stackRef.current.scrollIntoView({
									behavior: "smooth",
									block: "end",
									inline: "nearest",
								})
							}
						}, 100)
					}
				}
			} else if (!isAutoScrollEnabled && currentCount > previousCount) {
				if (DEBUG) {
					console.log(
						`[SubagentStack] New subagent added but autoscroll disabled by parent`
					)
				}
			}

			// Update the count for next comparison
			prevSubagentCountRef.current = currentCount
		}, [subagents.length, isAutoScrollEnabled, onScrollToBottom])

		// Reset cancelling state when all subagents are cleared
		useEffect(() => {
			if (isCancelling && subagents.length === 0) {
				setIsCancelling(false)
			}
		}, [subagents.length, isCancelling])

		if (subagents.length === 0) {
			return null
		}

		const handleCancelAll = () => {
			setIsCancelling(true)
			vscode.postMessage({
				type: "cancelAllSubagents",
			})
		}

		return (
			<div
				ref={stackRef}
				className="subagent-stack p-2 border-t border-vscode-panel-border"
				style={{ paddingBottom: "200px" }}>
				<div className="text-xs text-vscode-descriptionForeground mb-2">
					Active Subagents
					{!isAutoScrollEnabled && (
						<span className="ml-2 text-vscode-editorWarning-foreground">
							(Auto-scroll paused)
						</span>
					)}
				</div>
				<div className="flex flex-col" style={{ gap: "4px" }}>
					{subagents.map((subagent) => (
						<SubagentRow key={subagent.taskId} subagent={subagent} />
					))}
				</div>
				{/* Cancel All button at the bottom of the stack */}
				<div className="flex justify-center mt-3">
					<VSCodeButton
						data-testid="cancel-all-vscode"
						appearance="secondary"
						onClick={() => {
							if (DEBUG) console.log("[CANCEL_SUBAGENT_DEBUG] VSCodeButton: onClick event triggered")
							handleCancelAll()
						}}
						onPointerUp={(e) => {
							// Fallback: trigger cancel on pointerUp if click doesn't fire
							if (e.button === 0 && !isCancelling) {
								handleCancelAll()
							}
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault()
								handleCancelAll()
							}
						}}
						disabled={isCancelling}
						title={isCancelling ? "Cancelling subagents..." : "Cancel all subagents and resume parent task"}
						className="text-xs">
						<span
							className={`codicon ${isCancelling ? "codicon-loading codicon-modifier-spin" : "codicon-stop-circle"} mr-1`}
						/>
						{isCancelling ? "Cancelling..." : "Cancel All Subagents"}
					</VSCodeButton>
				</div>
			</div>
		)
	}
)

// Re-export the SubagentInfo type for convenience
export type { SubagentInfo }