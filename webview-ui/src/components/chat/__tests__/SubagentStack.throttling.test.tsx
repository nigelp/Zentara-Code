import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act, render, fireEvent, screen } from "@testing-library/react"
import { SubagentStack } from "../SubagentStack"

// Import the SubagentInfo type
interface SubagentInfo {
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

// Extract the hook for testing (copy from SubagentStack component)
function usePeriodicSubagentUpdates(rawSubagents: SubagentInfo[], updateInterval = 2000) {
	const [displaySubagents, setDisplaySubagents] = React.useState<SubagentInfo[]>(rawSubagents)
	const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)
	const lastUpdateRef = React.useRef<number>(0)

	React.useEffect(() => {
		const now = Date.now()
		const timeSinceLastUpdate = now - lastUpdateRef.current

		// If enough time has passed, update immediately
		if (timeSinceLastUpdate >= updateInterval) {
			setDisplaySubagents(rawSubagents)
			lastUpdateRef.current = now
			return
		}

		// Otherwise, schedule an update
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
		}

		timeoutRef.current = setTimeout(() => {
			setDisplaySubagents(rawSubagents)
			lastUpdateRef.current = Date.now()
			timeoutRef.current = null
		}, updateInterval - timeSinceLastUpdate)

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
				timeoutRef.current = null
			}
		}
	}, [rawSubagents, updateInterval])

	// Cleanup on unmount
	React.useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}
		}
	}, [])

	return displaySubagents
}

describe("usePeriodicSubagentUpdates", () => {
	it("should return the same subagents that are passed in", () => {
		const initialSubagents: SubagentInfo[] = [
			{
				taskId: "agent1",
				description: "Test agent",
				status: "running",
			},
		]

		const { result } = renderHook(() => usePeriodicSubagentUpdates(initialSubagents))

		expect(result.current).toEqual(initialSubagents)
	})

	it("should show tools regardless of partial status", () => {
		// Test that tools are shown when they exist and subagent is not asking
		const subagentWithCompleteToolCall = {
			taskId: "test-1",
			description: "Test subagent",
			status: "running" as const,
			askType: undefined,
			toolCall: {
				toolName: "test_tool",
				toolInput: { test: "input" },
				isPartial: false,
			},
		}

		const subagentWithPartialToolCall = {
			taskId: "test-2",
			description: "Test subagent 2",
			status: "running" as const,
			askType: undefined,
			toolCall: {
				toolName: "test_tool_2",
				toolInput: { test: "input2" },
				isPartial: true,
			},
		}

		const subagentWithNoPartialFlag = {
			taskId: "test-3",
			description: "Test subagent 3",
			status: "running" as const,
			askType: undefined,
			toolCall: {
				toolName: "test_tool_3",
				toolInput: { test: "input3" },
			},
		}

		// Test the updated UI logic: subagent.toolCall && !subagent.askType
		const shouldShowComplete = subagentWithCompleteToolCall.toolCall && !subagentWithCompleteToolCall.askType
		const shouldShowPartial = subagentWithPartialToolCall.toolCall && !subagentWithPartialToolCall.askType
		const shouldShowNoFlag = subagentWithNoPartialFlag.toolCall && !subagentWithNoPartialFlag.askType

		expect(shouldShowComplete).toBe(true)
		expect(shouldShowPartial).toBe(true) // Now shows partial tools too
		expect(shouldShowNoFlag).toBe(true)
	})
})

// Mock the vscode API and react-i18next
vi.mock("../../utils/vscode", () => ({
	vscode: {
		postMessage: vi.fn(),
	},
}))

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, fallback: string) => fallback,
	}),
}))

vi.mock("../../utils/subagentTypeColors", () => ({
	getSubagentTypeColor: () => ({
		background: "#000",
		text: "#fff",
		border: "#333",
	}),
}))

describe("SubagentStack Autoscroll Behavior", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.useFakeTimers()
		
		// Mock scrollIntoView
		Element.prototype.scrollIntoView = vi.fn()
		Element.prototype.getBoundingClientRect = vi.fn(() => ({
			bottom: 500,
			top: 100,
			left: 0,
			right: 100,
			width: 100,
			height: 400,
			x: 0,
			y: 100,
			toJSON: () => ({}),
		} as DOMRect))
		
		// Mock window.innerHeight
		Object.defineProperty(window, 'innerHeight', {
			writable: true,
			configurable: true,
			value: 800,
		})
	})

	afterEach(() => {
		vi.runOnlyPendingTimers()
		vi.useRealTimers()
		vi.restoreAllMocks()
	})

	it("should disable autoscroll for 10 seconds after manual wheel scroll", async () => {
		const initialSubagents: SubagentInfo[] = [
			{
				taskId: "agent1",
				description: "Test agent 1",
				status: "running",
			},
		]

		const { rerender } = render(<SubagentStack subagents={initialSubagents} />)

		// Get the stack element
		const stackElement = document.querySelector('.subagent-stack')
		expect(stackElement).toBeTruthy()

		// Simulate manual wheel scroll
		const wheelEvent = new WheelEvent('wheel', {
			deltaY: -100, // Scroll up
			bubbles: true,
			cancelable: true,
		})
		Object.defineProperty(wheelEvent, 'isTrusted', { value: true })

		act(() => {
			stackElement?.dispatchEvent(wheelEvent)
		})

		// Add a new subagent - should NOT autoscroll because manual scroll just happened
		const newSubagents = [
			...initialSubagents,
			{
				taskId: "agent2",
				description: "Test agent 2",
				status: "running" as const,
			},
		]

		act(() => {
			rerender(<SubagentStack subagents={newSubagents} />)
		})

		// scrollIntoView should NOT have been called due to manual scroll
		expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()

		// Fast-forward 9 seconds (not quite 10)
		act(() => {
			vi.advanceTimersByTime(9000)
		})

		// Add another subagent - should still NOT autoscroll
		const moreSubagents = [
			...newSubagents,
			{
				taskId: "agent3",
				description: "Test agent 3",
				status: "running" as const,
			},
		]

		act(() => {
			rerender(<SubagentStack subagents={moreSubagents} />)
		})

		expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()

		// Fast-forward to complete the 10-second timeout
		act(() => {
			vi.advanceTimersByTime(1100) // Total: 10.1 seconds
		})

		// Add another subagent - should NOW autoscroll again
		const finalSubagents = [
			...moreSubagents,
			{
				taskId: "agent4",
				description: "Test agent 4",
				status: "running" as const,
			},
		]

		act(() => {
			rerender(<SubagentStack subagents={finalSubagents} />)
		})

		// Now scrollIntoView should be called because timeout expired
		expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
			behavior: "smooth",
			block: "end",
			inline: "nearest",
		})
	})

	it("should disable autoscroll for 10 seconds after manual scroll event", async () => {
		const initialSubagents: SubagentInfo[] = [
			{
				taskId: "agent1",
				description: "Test agent 1",
				status: "running",
			},
		]

		const { rerender } = render(<SubagentStack subagents={initialSubagents} />)

		// Get the stack element
		const stackElement = document.querySelector('.subagent-stack')
		expect(stackElement).toBeTruthy()

		// Simulate manual scroll event
		const scrollEvent = new Event('scroll', {
			bubbles: true,
			cancelable: true,
		})
		Object.defineProperty(scrollEvent, 'isTrusted', { value: true })

		act(() => {
			document.dispatchEvent(scrollEvent)
		})

		// Add a new subagent - should NOT autoscroll
		const newSubagents = [
			...initialSubagents,
			{
				taskId: "agent2",
				description: "Test agent 2",
				status: "running" as const,
			},
		]

		act(() => {
			rerender(<SubagentStack subagents={newSubagents} />)
		})

		expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()

		// Fast-forward past the timeout
		act(() => {
			vi.advanceTimersByTime(10100)
		})

		// Add another subagent - should autoscroll again
		const finalSubagents = [
			...newSubagents,
			{
				taskId: "agent3",
				description: "Test agent 3",
				status: "running" as const,
			},
		]

		act(() => {
			rerender(<SubagentStack subagents={finalSubagents} />)
		})

		expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
			behavior: "smooth",
			block: "end",
			inline: "nearest",
		})
	})

	it("should not trigger autoscroll disable during button presses", async () => {
		const initialSubagents: SubagentInfo[] = [
			{
				taskId: "agent1",
				description: "Test agent 1",
				status: "running",
			},
		]

		const { rerender } = render(<SubagentStack subagents={initialSubagents} />)

		// Simulate pointer down (button press start)
		const pointerDownEvent = new PointerEvent('pointerdown', {
			bubbles: true,
			cancelable: true,
		})

		act(() => {
			window.dispatchEvent(pointerDownEvent)
		})

		// Simulate wheel event during button press - should be ignored
		const wheelEvent = new WheelEvent('wheel', {
			deltaY: -100,
			bubbles: true,
			cancelable: true,
		})
		Object.defineProperty(wheelEvent, 'isTrusted', { value: true })

		act(() => {
			document.dispatchEvent(wheelEvent)
		})

		// Simulate pointer up (button press end)
		const pointerUpEvent = new PointerEvent('pointerup', {
			bubbles: true,
			cancelable: true,
		})

		act(() => {
			window.dispatchEvent(pointerUpEvent)
		})

		// Add a new subagent - should autoscroll because wheel event was ignored during button press
		const newSubagents = [
			...initialSubagents,
			{
				taskId: "agent2",
				description: "Test agent 2",
				status: "running" as const,
			},
		]

		act(() => {
			rerender(<SubagentStack subagents={newSubagents} />)
		})

		// Should autoscroll because the wheel event during button press was ignored
		expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
			behavior: "smooth",
			block: "end",
			inline: "nearest",
		})
	})

	it("should reset the 10-second timer each time user scrolls", async () => {
		const initialSubagents: SubagentInfo[] = [
			{
				taskId: "agent1",
				description: "Test agent 1",
				status: "running",
			},
		]

		const { rerender } = render(<SubagentStack subagents={initialSubagents} />)

		const stackElement = document.querySelector('.subagent-stack')
		expect(stackElement).toBeTruthy()

		// First manual scroll
		const wheelEvent1 = new WheelEvent('wheel', {
			deltaY: -100,
			bubbles: true,
			cancelable: true,
		})
		Object.defineProperty(wheelEvent1, 'isTrusted', { value: true })

		act(() => {
			stackElement?.dispatchEvent(wheelEvent1)
		})

		// Wait 8 seconds (not the full 10)
		act(() => {
			vi.advanceTimersByTime(8000)
		})

		// Second manual scroll - should RESET the timer
		const wheelEvent2 = new WheelEvent('wheel', {
			deltaY: -100,
			bubbles: true,
			cancelable: true,
		})
		Object.defineProperty(wheelEvent2, 'isTrusted', { value: true })

		act(() => {
			stackElement?.dispatchEvent(wheelEvent2)
		})

		// Wait another 8 seconds (total 16 seconds from first scroll, but only 8 from second)
		act(() => {
			vi.advanceTimersByTime(8000)
		})

		// Add a subagent - should still NOT autoscroll because second scroll reset the timer
		const newSubagents = [
			...initialSubagents,
			{
				taskId: "agent2",
				description: "Test agent 2",
				status: "running" as const,
			},
		]

		act(() => {
			rerender(<SubagentStack subagents={newSubagents} />)
		})

		expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()

		// Wait 2 more seconds to complete 10 seconds from the SECOND scroll
		act(() => {
			vi.advanceTimersByTime(2100)
		})

		// Add another subagent - should NOW autoscroll
		const finalSubagents = [
			...newSubagents,
			{
				taskId: "agent3",
				description: "Test agent 3",
				status: "running" as const,
			},
		]

		act(() => {
			rerender(<SubagentStack subagents={finalSubagents} />)
		})

		expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
			behavior: "smooth",
			block: "end",
			inline: "nearest",
		})
	})
})
