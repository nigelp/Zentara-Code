import { ToolDescriptionManager, DEFAULT_OPTIMIZATION_CONFIG } from "./tool-description-manager"
import { ToolDescriptionMode } from "./optimization-types"
import { ToolArgs } from "../core/prompts/tools/types"
import { Mode, getModeConfig, isToolAllowedForMode, getGroupName } from "../shared/modes"
import { TOOL_GROUPS, ALWAYS_AVAILABLE_TOOLS, DiffStrategy } from "../shared/tools"
import { McpHub } from "../services/mcp/McpHub"
import { CodeIndexManager } from "../services/code-index/manager"
import { ModeConfig, ToolName } from "@roo-code/types"

// Import tool description functions directly
import { toolDescriptionMap } from "../core/prompts/tools"

// Import path utilities to enable String.prototype.toPosix()
import "../utils/path"

// Additional configuration for integration layer
const INTEGRATION_CONFIG = {
	briefDescriptionLength: 1000, // characters
}

// Cache structures for optimization
interface ToolSetCache {
	key: string
	tools: Set<string>
	// No timestamp - tool sets are permanent for a given configuration
}

interface ResultCache {
	key: string
	result: string
}

interface AlwaysAvailableCache {
	descriptions: string[]
}

// Cache key: "toolName|FULL" or "toolName|BRIEF"
type ToolDescriptionCacheKey = string
type ResultCacheKey = string

// Global caches
const toolDescriptionCache = new Map<ToolDescriptionCacheKey, string>() // Cache individual tool descriptions by (name, mode)
const toolSetCache = new Map<string, ToolSetCache>() // Cache computed tool sets (permanent)
const resultCache = new Map<ResultCacheKey, ResultCache>() // Cache dynamic tool results (excluding always available)
const alwaysAvailableCache = new Map<string, AlwaysAvailableCache>() // Cache always available tool descriptions
let globalToolDescriptionManager: ToolDescriptionManager | null = null

/**
 * Generate cache key for tool description
 */
function getToolDescriptionCacheKey(toolName: string, mode: ToolDescriptionMode): ToolDescriptionCacheKey {
	return `${toolName}|${mode}`
}

/**
 * Generate cache key for result based on (tool, mode) pairs (excluding always available tools)
 */
function generateResultCacheKey(toolModePairs: Array<{ tool: string; mode: ToolDescriptionMode }>): ResultCacheKey {
	// Filter out always available tools from cache key
	const dynamicPairs = toolModePairs.filter((pair) => !ALWAYS_AVAILABLE_TOOLS.includes(pair.tool as any))

	// Sort to ensure consistent key regardless of tool order
	const sortedPairs = dynamicPairs
		.map((pair) => `${pair.tool}:${pair.mode}`)
		.sort()
		.join(",")
	return sortedPairs
}

/**
 * Generate cache key for always available tools
 */
function generateAlwaysAvailableCacheKey(args: ToolArgs): string {
	// Cache key for always available tools based on parameters that affect their descriptions
	return `${args.cwd}|${args.supportsComputerUse}|${JSON.stringify(args.settings || {})}|${JSON.stringify(args.experiments || {})}`
}

/**
 * Get or create the global tool description manager instance
 */
export function getGlobalToolDescriptionManager(): ToolDescriptionManager {
	if (!globalToolDescriptionManager) {
		globalToolDescriptionManager = new ToolDescriptionManager(DEFAULT_OPTIMIZATION_CONFIG)
	}
	return globalToolDescriptionManager
}

/**
 * Reset the global tool description manager (useful for testing)
 */
export function resetGlobalToolDescriptionManager(): void {
	globalToolDescriptionManager = null
	clearAllCaches()
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
	toolDescriptionCache.clear()
	toolSetCache.clear()
	resultCache.clear()
	alwaysAvailableCache.clear()
}

/**
 * Generate a cache key for tool sets
 */
function generateToolSetCacheKey(
	mode: Mode,
	customModes?: ModeConfig[],
	experiments?: Record<string, boolean>,
	settings?: Record<string, any>,
): string {
	return `${mode}|${JSON.stringify(customModes || [])}|${JSON.stringify(experiments || {})}|${JSON.stringify(settings || {})}`
}

/**
 * Create brief descriptions for tools (limited by character count)
 * This is a simplified version - in production, you might want to use AI to generate these
 */
function createBriefDescription(fullDescription: string, toolName: string): string {
	// For now, we'll use a simple heuristic to create brief descriptions
	// In a real implementation, you might want to use AI to generate these

	const maxLength = INTEGRATION_CONFIG.briefDescriptionLength

	// If the full description is already short enough, return it
	if (fullDescription.length <= maxLength) {
		return fullDescription
	}

	const words = fullDescription.split(" ")
	let wordBasedText = ""

	for (const word of words) {
		const potentialText = wordBasedText + (wordBasedText ? " " : "") + word
		if (potentialText.length <= maxLength) {
			wordBasedText = potentialText
		} else {
			break
		}
	}
	// Add ellipsis if we truncated
	return (
		wordBasedText +
		(wordBasedText.length < fullDescription.length
			? "\n\n**WARNING: This is a brief summary only. You MUST use fetch_tool_description to get the complete documentation before using this tool. Brief descriptions are NOT sufficient for proper tool usage.**\n"
			: "")
	)
}

/**
 * Get optimized tool descriptions for a specific mode
 * This integrates with the existing tool system to provide optimized descriptions
 */
export async function getOptimizedToolDescriptionsForMode(
	mode: Mode,
	cwd: string,
	supportsComputerUse: boolean,
	codeIndexManager?: CodeIndexManager,
	diffStrategy?: DiffStrategy,
	browserViewportSize?: string,
	mcpHub?: McpHub,
	customModes?: ModeConfig[],
	experiments?: Record<string, boolean>,
	partialReadsEnabled?: boolean,
	settings?: Record<string, any>,
	enableMcpServerCreation?: boolean,
	taskSessionId?: string,
	cachedSubagentDescription?: string,
): Promise<string> {
	const sessionId = taskSessionId || "default"

	// Use the imported tool description map
	const toolDescriptionFns = toolDescriptionMap

	// Step 1: Get or compute the tool set (permanently cached)
	const toolSetKey = generateToolSetCacheKey(mode, customModes, experiments, settings)
	let tools: Set<string>

	const cachedToolSet = toolSetCache.get(toolSetKey)
	if (cachedToolSet) {
		// Tool set cache is permanent - no TTL check
		tools = new Set(cachedToolSet.tools) // Create a copy
	} else {
		// Compute tool set (only happens once per configuration)
		tools = new Set<string>()
		const config = getModeConfig(mode, customModes)

		// Add tools from mode's groups
		config.groups.forEach((groupEntry) => {
			const groupName = getGroupName(groupEntry)
			const toolGroup = TOOL_GROUPS[groupName]
			if (toolGroup) {
				toolGroup.tools.forEach((tool) => {
					if (
						isToolAllowedForMode(
							tool as ToolName,
							mode,
							customModes ?? [],
							undefined,
							undefined,
							experiments ?? {},
						)
					) {
						tools.add(tool)
					}
				})
			}
		})

		// Add always available tools
		ALWAYS_AVAILABLE_TOOLS.forEach((tool) => tools.add(tool))

		// Cache the tool set permanently
		toolSetCache.set(toolSetKey, {
			key: toolSetKey,
			tools: new Set(tools), // Store a copy
		})
	}

	// Apply dynamic exclusions (can't be cached as they depend on runtime state)
	if (
		!codeIndexManager ||
		!(codeIndexManager.isFeatureEnabled && codeIndexManager.isFeatureConfigured && codeIndexManager.isInitialized)
	) {
		tools.delete("codebase_search")
	}

	if (settings?.todoListEnabled === false) {
		tools.delete("update_todo_list")
	}

	const manager = getGlobalToolDescriptionManager()

	// Step 2: Prepare args for tool description generation
	const args: ToolArgs = {
		cwd,
		supportsComputerUse,
		diffStrategy,
		browserViewportSize,
		mcpHub,
		partialReadsEnabled,
		settings: {
			...settings,
			enableMcpServerCreation,
		},
		experiments,
	}

	const descriptionFns = toolDescriptionFns

	// Step 3: Handle always available tools separately (cached once) - EXCLUDING subagent
	const alwaysAvailableCacheKey = generateAlwaysAvailableCacheKey(args)
	let alwaysAvailableDescriptions: string[] = []

	const cachedAlwaysAvailable = alwaysAvailableCache.get(alwaysAvailableCacheKey)
	if (cachedAlwaysAvailable) {
		alwaysAvailableDescriptions = cachedAlwaysAvailable.descriptions
	} else {
		// Generate descriptions for always available tools (only once)
		// ALWAYS_AVAILABLE_TOOLS always get FULL descriptions
		// EXCLUDE 'subagent' as it will be handled separately per task
		const alwaysAvailablePromises = ALWAYS_AVAILABLE_TOOLS.filter(
			(toolName) => tools.has(toolName) && toolName !== "subagent",
		) // Exclude subagent
			.map(async (toolName) => {
				const cacheKey = getToolDescriptionCacheKey(toolName, ToolDescriptionMode.FULL)

				let description = toolDescriptionCache.get(cacheKey)
				if (!description) {
					const descriptionFn = descriptionFns[toolName]
					if (descriptionFn) {
						try {
							const generatedDescription = descriptionFn({ ...args, toolOptions: undefined })
							// Handle both sync and async descriptions
							const resolvedDescription = await Promise.resolve(generatedDescription)
							if (resolvedDescription) {
								description = resolvedDescription
								// Cache the full description
								toolDescriptionCache.set(cacheKey, resolvedDescription)
							}
						} catch (error) {
							console.error(`Error generating description for tool ${toolName}:`, error)
							// Continue without this tool description rather than crashing
						}
					}
				}
				return description
			})

		alwaysAvailableDescriptions = (await Promise.all(alwaysAvailablePromises)).filter((desc): desc is string =>
			Boolean(desc),
		)

		// Cache always available descriptions (without subagent)
		alwaysAvailableCache.set(alwaysAvailableCacheKey, {
			descriptions: alwaysAvailableDescriptions,
		})
	}

	// Step 3.5: Handle subagent tool separately (per-task caching)
	let subagentDescription = ""
	if (tools.has("subagent")) {
		// Use cached subagent description if provided, otherwise generate it
		if (cachedSubagentDescription) {
			subagentDescription = cachedSubagentDescription
		} else {
			// Fallback to generating it (shouldn't happen if cache is working)
			const descriptionFn = descriptionFns["subagent"]
			if (descriptionFn) {
				try {
					const generatedDescription = descriptionFn({ ...args, toolOptions: undefined })
					subagentDescription = (await Promise.resolve(generatedDescription)) || ""
				} catch (error) {
					console.error("Error generating subagent description:", error)
				}
			}
		}
	}

	// Step 4: Handle dynamic tools (mode-specific, non-always-available)
	const dynamicTools = Array.from(tools).filter((tool) => !ALWAYS_AVAILABLE_TOOLS.includes(tool as any))

	// Fix compilation/closure scoping issue by avoiding arrow function closure
	const dynamicToolModePairs: Array<{ tool: string; mode: ToolDescriptionMode }> = []
	for (const toolName of dynamicTools) {
		dynamicToolModePairs.push({
			tool: toolName,
			mode: manager.getDescriptionMode(toolName, sessionId),
		})
	}

	// Step 5: Check dynamic result cache
	const resultCacheKey = generateResultCacheKey(dynamicToolModePairs)
	let dynamicDescriptions: string[] = []

	const cachedDynamicResult = resultCache.get(resultCacheKey)
	if (cachedDynamicResult) {
		dynamicDescriptions = cachedDynamicResult.result.split("\n\n").filter(Boolean)
	} else {
		// Generate descriptions for dynamic tools
		const descriptionPromises = dynamicToolModePairs.map(async ({ tool: toolName, mode: descriptionMode }) => {
			const cacheKey = getToolDescriptionCacheKey(toolName, descriptionMode)

			let description = toolDescriptionCache.get(cacheKey)
			if (!description) {
				const descriptionFn = descriptionFns[toolName]
				if (!descriptionFn) return undefined

				const fullCacheKey = getToolDescriptionCacheKey(toolName, ToolDescriptionMode.FULL)
				let fullDescription = toolDescriptionCache.get(fullCacheKey)

				if (!fullDescription) {
					try {
						const generatedDescription = await Promise.resolve(descriptionFn({ ...args, toolOptions: undefined }))
						if (generatedDescription) {
							fullDescription = generatedDescription
							toolDescriptionCache.set(fullCacheKey, generatedDescription)
						}
					} catch (error) {
						console.error(`Error generating description for tool ${toolName}:`, error)
						// Continue without this tool description rather than crashing
					}
				}

				if (fullDescription) {
					if (descriptionMode === ToolDescriptionMode.FULL) {
						description = fullDescription
					} else {
						description = createBriefDescription(fullDescription, toolName)
						toolDescriptionCache.set(cacheKey, description)
					}
				}
			}
			return description
		})
		
		const results = await Promise.all(descriptionPromises)
		dynamicDescriptions = results.filter((desc): desc is string => Boolean(desc))

		// Cache dynamic descriptions
		if (dynamicDescriptions.length > 0) {
			resultCache.set(resultCacheKey, {
				key: resultCacheKey,
				result: dynamicDescriptions.join("\n\n"),
			})
		}
	}

	// Step 6: Combine always available + subagent + dynamic descriptions (three parts)
	const allDescriptions = [
		...alwaysAvailableDescriptions,
		...(subagentDescription ? [subagentDescription] : []), // Only include if subagent is available
		...dynamicDescriptions,
	]
	return `# Tools\n\n${allDescriptions.join("\n\n")}`
}

/**
 * Clear tool description cache for specific tools
 * Useful when tool descriptions are updated
 */
export function clearToolDescriptionCache(toolNames?: string[]): void {
	if (toolNames) {
		// Clear all cached versions (FULL and BRIEF) for specified tools
		toolNames.forEach((name) => {
			toolDescriptionCache.delete(getToolDescriptionCacheKey(name, ToolDescriptionMode.FULL))
			toolDescriptionCache.delete(getToolDescriptionCacheKey(name, ToolDescriptionMode.BRIEF))
		})
		// Clear caches that may contain affected tools
		resultCache.clear()
		alwaysAvailableCache.clear()
	} else {
		toolDescriptionCache.clear()
		resultCache.clear()
		alwaysAvailableCache.clear()
	}
}

/**
 * Track tool usage for optimization
 * Call this whenever a tool is used
 */
export function trackToolUsage(toolName: string, taskSessionId?: string): void {
	const manager = getGlobalToolDescriptionManager()
	manager.addToRecentlyUsed(taskSessionId || "default", toolName)
}

/**
 * Get the full description for a specific tool (for Phase 3 on-demand retrieval)
 * This is used by the fetch_tool_description tool to get full descriptions on demand
 */
export async function getFullToolDescription(
	toolName: string,
	cwd?: string,
	supportsComputerUse?: boolean,
	codeIndexManager?: CodeIndexManager,
	diffStrategy?: DiffStrategy,
	browserViewportSize?: string,
	mcpHub?: McpHub,
	customModes?: ModeConfig[],
	experiments?: Record<string, boolean>,
	partialReadsEnabled?: boolean,
	settings?: Record<string, any>,
	enableMcpServerCreation?: boolean,
): Promise<string | null> {
	// Check if the tool exists in the toolDescriptionMap
	const descriptionFn = toolDescriptionMap[toolName]
	if (!descriptionFn) {
		return null
	}

	// First check cache for full description
	const fullCacheKey = getToolDescriptionCacheKey(toolName, ToolDescriptionMode.FULL)
	let fullDescription = toolDescriptionCache.get(fullCacheKey)

	if (fullDescription) {
		return fullDescription
	}

	// Generate the full description
	const args: ToolArgs = {
		cwd: cwd || process.cwd(),
		supportsComputerUse: supportsComputerUse ?? false,
		diffStrategy,
		browserViewportSize,
		mcpHub,
		partialReadsEnabled,
		settings: {
			...settings,
			enableMcpServerCreation,
		},
		experiments,
	}

	try {
		const generatedDescription = await Promise.resolve(descriptionFn({ ...args, toolOptions: undefined }))
		if (generatedDescription) {
			// Cache the full description
			toolDescriptionCache.set(fullCacheKey, generatedDescription)
			return generatedDescription
		}
	} catch (error) {
		console.error(`Error generating full description for tool ${toolName}:`, error)
	}

	return null
}

/**
 * Check if a tool should be shown with full description
 */
export function shouldShowFullDescription(toolName: string, taskSessionId?: string): boolean {
	const manager = getGlobalToolDescriptionManager()
	return manager.getDescriptionMode(toolName, taskSessionId || "default") === ToolDescriptionMode.FULL
}

/**
 * Update the optimization configuration
 */
export function updateOptimizationConfig(config: {
	alwaysFullDescriptionTools?: string[]
	recentlyUsedQueueSize?: number
	briefDescriptionLength?: number
}): void {
	const manager = getGlobalToolDescriptionManager()
	const updateConfig: any = {}

	if (config.alwaysFullDescriptionTools) {
		updateConfig.alwaysFullDescriptionTools = new Set(config.alwaysFullDescriptionTools)
	}
	if (config.recentlyUsedQueueSize !== undefined) {
		updateConfig.queueSize = config.recentlyUsedQueueSize
	}
	if (config.briefDescriptionLength !== undefined) {
		// Store the briefDescriptionLength in the INTEGRATION_CONFIG for createBriefDescription to use
		;(INTEGRATION_CONFIG as any).briefDescriptionLength = config.briefDescriptionLength
	}

	manager.updateConfig(updateConfig)
}
