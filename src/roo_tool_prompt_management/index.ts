/**
 * Tool Prompt Management Module
 *
 * This module provides functionality for optimizing tool descriptions
 * and fetching tool descriptions on demand.
 */

// Export main fetch functionality
export {
	fetch_tool_description,
	fetch_multiple_tool_descriptions,
	getAvailableToolNames,
	toolExists,
} from "./fetch-tool-description"

// Export optimization integration functions
export {
	getOptimizedToolDescriptionsForMode,
	getFullToolDescription,
	trackToolUsage,
	shouldShowFullDescription,
	updateOptimizationConfig,
	clearToolDescriptionCache,
	getGlobalToolDescriptionManager,
	resetGlobalToolDescriptionManager,
	clearAllCaches,
} from "./tool-optimization-integration"

// Export the manager class and config
export { ToolDescriptionManager, DEFAULT_OPTIMIZATION_CONFIG } from "./tool-description-manager"

// Export types
export type {
	ToolDescriptionPair,
	DualDescriptionFunction,
	ToolUsageQueue,
	ToolOptimizationConfig,
	ToolDescriptionContext,
	ToolDescriptionComposition,
} from "./optimization-types"

export { ToolDescriptionMode } from "./optimization-types"
