import { ToolOptimizationConfig, ToolUsageQueue, ToolDescriptionPair, ToolDescriptionMode } from "./optimization-types"
import { ALWAYS_AVAILABLE_TOOLS } from "../shared/tools"

/**
 * Manages tool descriptions with optimization features
 */
export class ToolDescriptionManager {
	private usageQueues = new Map<string, ToolUsageQueue>()
	private config: ToolOptimizationConfig

	constructor(config: ToolOptimizationConfig) {
		this.config = config
	}

	/**
	 * Get or create usage queue for a task
	 */
	private getOrCreateQueue(taskId: string): ToolUsageQueue {
		if (!this.usageQueues.has(taskId)) {
			this.usageQueues.set(taskId, {
				taskId,
				recentTools: [],
				recentToolsSet: new Set<string>(),
				maxSize: this.config.queueSize,
				lastUpdated: Date.now(),
			})
		}
		return this.usageQueues.get(taskId)!
	}

	/**
	 * Add a tool to the recently used queue for a task
	 * Only adds tools that are NOT in the ALWAYS_AVAILABLE_TOOLS list
	 */
	addToRecentlyUsed(taskId: string, toolName: string): void {
		// Skip if tool is in ALWAYS_AVAILABLE_TOOLS list (truly always available tools)
		if (ALWAYS_AVAILABLE_TOOLS.includes(toolName as any)) {
			return
		}

		const queue = this.getOrCreateQueue(taskId)

		// Add to front of queue
		queue.recentTools.unshift(toolName)

		// Maintain queue size
		if (queue.recentTools.length > queue.maxSize) {
			queue.recentTools = queue.recentTools.slice(0, queue.maxSize)
		}

		// Refresh set from updated queue
		queue.recentToolsSet = new Set(queue.recentTools)

		queue.lastUpdated = Date.now()
	}

	/**
	 * Get recently used tools for a task
	 */
	getRecentlyUsedTools(taskId: string): string[] {
		const queue = this.usageQueues.get(taskId)
		return queue ? [...queue.recentTools] : []
	}

	/**
	 * Determine which description mode to use for a tool
	 */
	getDescriptionMode(toolName: string, taskId: string): ToolDescriptionMode {
		// Tools with alwaysFullDescriptionTools always get full descriptions
		if (this.config.alwaysFullDescriptionTools.has(toolName)) {
			return ToolDescriptionMode.FULL
		}

		// Recently used tools get full descriptions - use set for O(1) lookup
		const queue = this.usageQueues.get(taskId)
		if (queue && queue.recentToolsSet.has(toolName)) {
			return ToolDescriptionMode.FULL
		}

		// Everything else gets brief descriptions
		return ToolDescriptionMode.BRIEF
	}

	/**
	 * Clear usage queue for a task (called when task completes)
	 */
	clearTaskQueue(taskId: string): void {
		this.usageQueues.delete(taskId)
	}

	/**
	 * Clear all usage queues (for cleanup)
	 */
	clearAllQueues(): void {
		this.usageQueues.clear()
	}

	/**
	 * Get queue statistics for debugging
	 */
	getQueueStats(taskId: string) {
		const queue = this.usageQueues.get(taskId)
		if (!queue) {
			return null
		}

		return {
			taskId: queue.taskId,
			queueSize: queue.recentTools.length,
			maxSize: queue.maxSize,
			recentTools: [...queue.recentTools],
			lastUpdated: new Date(queue.lastUpdated).toISOString(),
		}
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<ToolOptimizationConfig>): void {
		this.config = { ...this.config, ...newConfig }

		// Update queue sizes if changed
		if (newConfig.queueSize !== undefined) {
			for (const queue of this.usageQueues.values()) {
				queue.maxSize = newConfig.queueSize
				if (queue.recentTools.length > newConfig.queueSize) {
					queue.recentTools = queue.recentTools.slice(0, newConfig.queueSize)
					// Rebuild set from updated queue
					queue.recentToolsSet = new Set(queue.recentTools)
				}
			}
		}
	}

	/**
	 * Get current configuration
	 */
	getConfig(): ToolOptimizationConfig {
		return { ...this.config }
	}
}

/**
 * Default configuration for tool description optimization
 */
export const DEFAULT_OPTIMIZATION_CONFIG: ToolOptimizationConfig = {
	alwaysFullDescriptionTools: new Set([
		"glob",
		"search_files",
		"lsp_search_symbols",
		"update_todo_list",
		"list_files",
	]),
	queueSize: 6,
}

/**
 * Singleton instance of the tool description manager
 */
// export const toolDescriptionManager = new ToolDescriptionManager(DEFAULT_OPTIMIZATION_CONFIG)
