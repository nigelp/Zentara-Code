import { describe, test, expect, beforeEach } from "vitest"
import { ToolDescriptionManager, DEFAULT_OPTIMIZATION_CONFIG } from "../tool-description-manager"
import { ToolOptimizationConfig, ToolDescriptionMode } from "../optimization-types"

describe("ToolDescriptionManager", () => {
	let manager: ToolDescriptionManager
	const testConfig: ToolOptimizationConfig = {
		alwaysFullDescriptionTools: new Set(["read_file", "write_to_file", "glob"]),
		queueSize: 3,
	}

	beforeEach(() => {
		manager = new ToolDescriptionManager(testConfig)
	})

	describe("Queue Management", () => {
		test("should create empty queue for new task", () => {
			const recentTools = manager.getRecentlyUsedTools("task1")
			expect(recentTools).toEqual([])
		})

		test("should add non-alwaysFullDescriptionTools tools to queue", () => {
			manager.addToRecentlyUsed("task1", "search_files")
			const recentTools = manager.getRecentlyUsedTools("task1")
			expect(recentTools).toEqual(["search_files"])
		})

		test("should not add alwaysFullDescriptionTools tools to queue", () => {
			manager.addToRecentlyUsed("task1", "read_file")
			const recentTools = manager.getRecentlyUsedTools("task1")
			expect(recentTools).toEqual([])
		})

		test("should maintain FIFO order", () => {
			manager.addToRecentlyUsed("task1", "tool1")
			manager.addToRecentlyUsed("task1", "tool2")
			manager.addToRecentlyUsed("task1", "tool3")

			const recentTools = manager.getRecentlyUsedTools("task1")
			expect(recentTools).toEqual(["tool3", "tool2", "tool1"])
		})

		test("should maintain queue size limit", () => {
			manager.addToRecentlyUsed("task1", "tool1")
			manager.addToRecentlyUsed("task1", "tool2")
			manager.addToRecentlyUsed("task1", "tool3")
			manager.addToRecentlyUsed("task1", "tool4") // Should push out tool1

			const recentTools = manager.getRecentlyUsedTools("task1")
			expect(recentTools).toEqual(["tool4", "tool3", "tool2"])
			expect(recentTools.length).toBe(3)
		})

		test("should move existing tool to front when re-added", () => {
			manager.addToRecentlyUsed("task1", "tool1")
			manager.addToRecentlyUsed("task1", "tool2")
			manager.addToRecentlyUsed("task1", "tool1") // Move tool1 to front

			const recentTools = manager.getRecentlyUsedTools("task1")
			expect(recentTools).toEqual(["tool1", "tool2"])
		})

		test("should maintain separate queues for different tasks", () => {
			manager.addToRecentlyUsed("task1", "tool1")
			manager.addToRecentlyUsed("task2", "tool2")

			expect(manager.getRecentlyUsedTools("task1")).toEqual(["tool1"])
			expect(manager.getRecentlyUsedTools("task2")).toEqual(["tool2"])
		})
	})

	describe("Set Synchronization", () => {
		test("should keep set synchronized with queue operations", () => {
			manager.addToRecentlyUsed("task1", "tool1")
			manager.addToRecentlyUsed("task1", "tool2")
			manager.addToRecentlyUsed("task1", "tool3")
			manager.addToRecentlyUsed("task1", "tool4") // Should push out tool1

			const stats = manager.getQueueStats("task1")
			expect(stats?.recentTools).toEqual(["tool4", "tool3", "tool2"])

			// Verify set contains exactly what's in queue
			const recentTools = manager.getRecentlyUsedTools("task1")
			for (const tool of recentTools) {
				expect(manager.getDescriptionMode(tool, "task1")).toBe(ToolDescriptionMode.FULL)
			}

			// Verify removed tool is not in set
			expect(manager.getDescriptionMode("tool1", "task1")).toBe(ToolDescriptionMode.BRIEF)
		})

		test("should update set when tool is moved to front", () => {
			manager.addToRecentlyUsed("task1", "tool1")
			manager.addToRecentlyUsed("task1", "tool2")
			manager.addToRecentlyUsed("task1", "tool1") // Move to front

			// Both tools should still be in set
			expect(manager.getDescriptionMode("tool1", "task1")).toBe(ToolDescriptionMode.FULL)
			expect(manager.getDescriptionMode("tool2", "task1")).toBe(ToolDescriptionMode.FULL)
		})
	})

	describe("Description Mode Determination", () => {
		test("should return FULL for alwaysFullDescriptionTools tools", () => {
			expect(manager.getDescriptionMode("read_file", "task1")).toBe(ToolDescriptionMode.FULL)
			expect(manager.getDescriptionMode("write_to_file", "task1")).toBe(ToolDescriptionMode.FULL)
			expect(manager.getDescriptionMode("glob", "task1")).toBe(ToolDescriptionMode.FULL)
		})

		test("should return FULL for recently used tools", () => {
			manager.addToRecentlyUsed("task1", "search_files")
			expect(manager.getDescriptionMode("search_files", "task1")).toBe(ToolDescriptionMode.FULL)
		})

		test("should return BRIEF for other tools", () => {
			expect(manager.getDescriptionMode("some_other_tool", "task1")).toBe(ToolDescriptionMode.BRIEF)
		})

		test("should prioritize alwaysFullDescriptionTools over recently used", () => {
			// Even if alwaysFullDescriptionTools tool was "recently used", it should be handled by alwaysFullDescriptionTools logic
			manager.addToRecentlyUsed("task1", "read_file") // Won't be added due to alwaysFullDescriptionTools check
			expect(manager.getDescriptionMode("read_file", "task1")).toBe(ToolDescriptionMode.FULL)
			expect(manager.getRecentlyUsedTools("task1")).toEqual([]) // Not in queue
		})
	})

	describe("Configuration Management", () => {
		test("should update queue size and maintain integrity", () => {
			manager.addToRecentlyUsed("task1", "tool1")
			manager.addToRecentlyUsed("task1", "tool2")
			manager.addToRecentlyUsed("task1", "tool3")

			// Reduce queue size
			manager.updateConfig({ queueSize: 2 })

			const recentTools = manager.getRecentlyUsedTools("task1")
			expect(recentTools).toEqual(["tool3", "tool2"])
			expect(recentTools.length).toBe(2)

			// Verify set is updated correctly
			expect(manager.getDescriptionMode("tool3", "task1")).toBe(ToolDescriptionMode.FULL)
			expect(manager.getDescriptionMode("tool2", "task1")).toBe(ToolDescriptionMode.FULL)
			expect(manager.getDescriptionMode("tool1", "task1")).toBe(ToolDescriptionMode.BRIEF) // Removed
		})

		test("should update alwaysFullDescriptionTools configuration", () => {
			const newAlwaysFullDescriptionTools = new Set(["execute_command", "list_files"])
			manager.updateConfig({ alwaysFullDescriptionTools: newAlwaysFullDescriptionTools })

			expect(manager.getDescriptionMode("execute_command", "task1")).toBe(ToolDescriptionMode.FULL)
			expect(manager.getDescriptionMode("list_files", "task1")).toBe(ToolDescriptionMode.FULL)
			expect(manager.getDescriptionMode("read_file", "task1")).toBe(ToolDescriptionMode.BRIEF) // No longer alwaysFullDescriptionTools
		})

		test("should return current configuration", () => {
			const config = manager.getConfig()
			expect(config.alwaysFullDescriptionTools).toEqual(testConfig.alwaysFullDescriptionTools)
			expect(config.queueSize).toBe(testConfig.queueSize)
		})
	})

	describe("Queue Statistics", () => {
		test("should return null for non-existent task", () => {
			const stats = manager.getQueueStats("nonexistent")
			expect(stats).toBeNull()
		})

		test("should return correct statistics", () => {
			manager.addToRecentlyUsed("task1", "tool1")
			manager.addToRecentlyUsed("task1", "tool2")

			const stats = manager.getQueueStats("task1")
			expect(stats).toBeDefined()
			expect(stats?.taskId).toBe("task1")
			expect(stats?.queueSize).toBe(2)
			expect(stats?.maxSize).toBe(3)
			expect(stats?.recentTools).toEqual(["tool2", "tool1"])
			expect(stats?.lastUpdated).toBeDefined()
		})
	})

	describe("Queue Cleanup", () => {
		test("should clear specific task queue", () => {
			manager.addToRecentlyUsed("task1", "tool1")
			manager.addToRecentlyUsed("task2", "tool2")

			manager.clearTaskQueue("task1")

			expect(manager.getRecentlyUsedTools("task1")).toEqual([])
			expect(manager.getRecentlyUsedTools("task2")).toEqual(["tool2"])
		})

		test("should clear all queues", () => {
			manager.addToRecentlyUsed("task1", "tool1")
			manager.addToRecentlyUsed("task2", "tool2")

			manager.clearAllQueues()

			expect(manager.getRecentlyUsedTools("task1")).toEqual([])
			expect(manager.getRecentlyUsedTools("task2")).toEqual([])
		})
	})

	describe("Default Configuration", () => {
		test("should have correct default alwaysFullDescriptionTools", () => {
			const defaultManager = new ToolDescriptionManager(DEFAULT_OPTIMIZATION_CONFIG)

			expect(DEFAULT_OPTIMIZATION_CONFIG.alwaysFullDescriptionTools.has("glob")).toBe(true)
			expect(DEFAULT_OPTIMIZATION_CONFIG.alwaysFullDescriptionTools.has("search_files")).toBe(true)
			expect(DEFAULT_OPTIMIZATION_CONFIG.alwaysFullDescriptionTools.has("read_file")).toBe(true)
			expect(DEFAULT_OPTIMIZATION_CONFIG.alwaysFullDescriptionTools.has("subagent")).toBe(true)
			expect(DEFAULT_OPTIMIZATION_CONFIG.alwaysFullDescriptionTools.has("update_todo_list")).toBe(true)
			expect(DEFAULT_OPTIMIZATION_CONFIG.alwaysFullDescriptionTools.has("write_to_file")).toBe(true)
			expect(DEFAULT_OPTIMIZATION_CONFIG.alwaysFullDescriptionTools.has("apply_diff")).toBe(true)
			expect(DEFAULT_OPTIMIZATION_CONFIG.alwaysFullDescriptionTools.has("execute_command")).toBe(true)
			expect(DEFAULT_OPTIMIZATION_CONFIG.alwaysFullDescriptionTools.has("list_files")).toBe(true)
			expect(DEFAULT_OPTIMIZATION_CONFIG.alwaysFullDescriptionTools.has("attempt_completion")).toBe(true)
		})

		test("should have correct default queue size", () => {
			expect(DEFAULT_OPTIMIZATION_CONFIG.queueSize).toBe(6)
		})
	})
})
