/**
 * Fetch tool description functionality
 * This module provides a simple API to fetch full descriptions for tools
 */

import { getFullToolDescription } from "./tool-optimization-integration"
import { toolDescriptionMap } from "../core/prompts/tools"
import { CodeIndexManager } from "../services/code-index/manager"
import { DiffStrategy } from "../shared/tools"
import { McpHub } from "../services/mcp/McpHub"
import { ModeConfig } from "@zentara-code/types"

/**
 * Fetch the full description for a specific tool by name
 *
 * @param toolName - The name of the tool to get the description for
 * @param options - Optional parameters for generating the tool description
 * @returns The full tool description or null if tool not found
 *
 * @example
 * ```typescript
 * const description = fetch_tool_description('read_file');
 * if (description) {
 *   console.log(description);
 * }
 * ```
 */
export async function fetch_tool_description(
	toolName: string,
	options?: {
		cwd?: string
		supportsComputerUse?: boolean
		codeIndexManager?: CodeIndexManager
		diffStrategy?: DiffStrategy
		browserViewportSize?: string
		mcpHub?: McpHub
		customModes?: ModeConfig[]
		experiments?: Record<string, boolean>
		partialReadsEnabled?: boolean
		settings?: Record<string, any>
		enableMcpServerCreation?: boolean
	},
): Promise<string | null> {
	// Use the full tool description retrieval function
	return await getFullToolDescription(
		toolName,
		options?.cwd,
		options?.supportsComputerUse,
		options?.codeIndexManager,
		options?.diffStrategy,
		options?.browserViewportSize,
		options?.mcpHub,
		options?.customModes,
		options?.experiments,
		options?.partialReadsEnabled,
		options?.settings,
		options?.enableMcpServerCreation,
	)
}

/**
 * Get a list of all available tool names
 *
 * @returns Array of tool names that have descriptions available
 */
export function getAvailableToolNames(): string[] {
	return Object.keys(toolDescriptionMap)
}

/**
 * Check if a tool exists and has a description available
 *
 * @param toolName - The name of the tool to check
 * @returns True if the tool exists and has a description function
 */
export function toolExists(toolName: string): boolean {
	return toolName in toolDescriptionMap
}

/**
 * Fetch descriptions for multiple tools
 *
 * @param toolNames - Array of tool names to fetch descriptions for
 * @param options - Optional parameters for generating tool descriptions
 * @returns Map of tool names to their descriptions (null for tools not found)
 */
export async function fetch_multiple_tool_descriptions(
	toolNames: string[],
	options?: {
		cwd?: string
		supportsComputerUse?: boolean
		codeIndexManager?: CodeIndexManager
		diffStrategy?: DiffStrategy
		browserViewportSize?: string
		mcpHub?: McpHub
		customModes?: ModeConfig[]
		experiments?: Record<string, boolean>
		partialReadsEnabled?: boolean
		settings?: Record<string, any>
		enableMcpServerCreation?: boolean
	},
): Promise<Map<string, string | null>> {
	const results = new Map<string, string | null>()

	for (const toolName of toolNames) {
		const description = await fetch_tool_description(toolName, options)
		results.set(toolName, description)
	}

	return results
}
