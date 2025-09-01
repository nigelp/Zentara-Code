import { outputChannel } from "../../roo_debug/src/vscodeUtils"
import type { Anthropic } from "@anthropic-ai/sdk"
import type { TextContent, ToolUse } from "../../shared/tools"

/**
 * Message logging utilities for tracking LLM conversations
 * Logs to the "Roo Debug" VSCode output channel
 */

export interface MessageContent {
	role: "user" | "assistant"
	content: string | Array<{ type: string; text?: string; [key: string]: any }>
}

export interface ToolCall {
	name: string
	input: any
}

/**
 * Logs an outgoing message (from extension to LLM)
 * Only logs user text and tool results, excludes system prompts
 */
export function logOutgoingMessage(message: MessageContent): void {
	try {
		if (!message || !message.content) {
			return
		}

		const textContent = extractTextContent(message.content)
		const toolResults = extractToolResults(message.content)
		
		// Only log if there's actual content to log
		if (!textContent.trim() && toolResults.length === 0) {
			return
		}

		outputChannel.appendLine("=== OUTGOING MESSAGE ===")
		
		if (message.role === "user" && textContent.trim()) {
			outputChannel.appendLine(`[User]: ${textContent}`)
		}

		// Log tool results if present
		if (toolResults.length > 0) {
			toolResults.forEach(result => {
				outputChannel.appendLine(`[Tool Result]: ${result}`)
			})
		}

		outputChannel.appendLine("") // Empty line for separation
	} catch (error) {
		// Fail silently to avoid disrupting the main flow
		console.error("Error logging outgoing message:", error)
	}
}

/**
 * Logs an incoming message (from LLM to extension)
 * Only logs when the message is complete (not during streaming)
 */
export function logIncomingMessage(content: (TextContent | ToolUse)[]): void {
	try {
		if (!content || content.length === 0) {
			return
		}

		outputChannel.appendLine("=== INCOMING MESSAGE ===")

		content.forEach(block => {
			if (block.type === "text") {
				// Filter out <thinking> tags and log the text
				const cleanText = filterThinkingTags(block.content)
				if (cleanText.trim()) {
					outputChannel.appendLine(`[Assistant]: ${cleanText}`)
				}
			} else if (block.type === "tool_use") {
				// Log tool calls
				outputChannel.appendLine(`[Tool Call]: ${block.name}`)
				if (block.params && Object.keys(block.params).length > 0) {
					outputChannel.appendLine(`Parameters: ${JSON.stringify(block.params, null, 2)}`)
				}
			}
		})

		outputChannel.appendLine("") // Empty line for separation
	} catch (error) {
		// Fail silently to avoid disrupting the main flow
		console.error("Error logging incoming message:", error)
	}
}

/**
 * Extracts text content from various message content formats
 */
function extractTextContent(content: string | Array<{ type: string; text?: string; [key: string]: any }>): string {
	if (typeof content === "string") {
		return filterEnvironmentDetails(content)
	}

	if (Array.isArray(content)) {
		return content
			.filter(item => item.type === "text" && item.text)
			.map(item => filterEnvironmentDetails(item.text))
			.join("\n")
	}

	return ""
}

/**
 * Extracts tool results from message content
 */
function extractToolResults(content: string | Array<{ type: string; text?: string; [key: string]: any }>): string[] {
	const results: string[] = []

	if (Array.isArray(content)) {
		content.forEach(item => {
			if (item.type === "tool_result") {
				if (item.content) {
					if (typeof item.content === "string") {
						results.push(filterEnvironmentDetails(item.content))
					} else if (Array.isArray(item.content)) {
						const textContent = item.content
							.filter(c => c.type === "text" && c.text)
							.map(c => filterEnvironmentDetails(c.text))
							.join("\n")
						if (textContent) {
							results.push(textContent)
						}
					}
				}
			}
		})
	}

	return results
}

/**
 * Filters out <thinking> tags from text content
 */
function filterThinkingTags(text: string): string {
	// Remove <thinking>...</thinking> blocks
	return text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim()
}

/**
 * Filters out <environment_details> tags from text content
 */
function filterEnvironmentDetails(text: string): string {
	if (!text) return ""
	// Remove <environment_details>...</environment_details> blocks
	return text.replace(/<environment_details>[\s\S]*?<\/environment_details>/gi, "").trim()
}