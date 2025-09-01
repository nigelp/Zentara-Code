import { ToolArgs } from "../core/prompts/tools/types"

/**
 * Dual description structure for tools
 */
export interface ToolDescriptionPair {
	brief: string // 3-5 sentence summary (50-100 words)
	full: string // Complete documentation with examples
}

/**
 * Tool description function that returns both brief and full descriptions
 */
export type DualDescriptionFunction = (args: ToolArgs) => ToolDescriptionPair

/**
 * FIFO queue for tracking recently used tools per task
 */
export interface ToolUsageQueue {
	taskId: string
	recentTools: string[] // FIFO queue of recently used tool names
	recentToolsSet: Set<string> // Set for O(1) lookup operations
	maxSize: number // Fixed queue length (5-8 tools)
	lastUpdated: number // Timestamp of last update
}

/**
 * Configuration for tool description optimization
 */
export interface ToolOptimizationConfig {
	alwaysFullDescriptionTools: Set<string> // Tools that always show full descriptions when available in the mode
	queueSize: number // Size of FIFO queue for recently used tools
}

/**
 * Context for tool description generation
 */
export interface ToolDescriptionContext extends ToolArgs {
	optimizationConfig: ToolOptimizationConfig
	recentlyUsedTools: string[]
	requestedTool?: string // For on-demand full description requests
}

/**
 * Result of tool description composition
 */
export interface ToolDescriptionComposition {
	descriptions: string[]
	stats: {
		totalTools: number
		fullDescriptions: number
		briefDescriptions: number
	}
}

/**
 * Tool description mode for composition
 */
export enum ToolDescriptionMode {
	FULL = "full",
	BRIEF = "brief",
}
