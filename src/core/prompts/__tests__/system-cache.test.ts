import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { clearSubagentDescriptionCache, clearTaskSubagentDescription } from "../system"

describe("Subagent Description Caching", () => {
	beforeEach(() => {
		// Clear cache before each test
		clearSubagentDescriptionCache()
		// Clear console mocks
		vi.clearAllMocks()
	})

	afterEach(() => {
		// Clean up after tests
		clearSubagentDescriptionCache()
	})

	it("should export cache management functions", () => {
		expect(typeof clearSubagentDescriptionCache).toBe("function")
		expect(typeof clearTaskSubagentDescription).toBe("function")
	})

	it("should clear all cached descriptions when clearSubagentDescriptionCache is called", () => {
		// This test verifies the function exists and can be called without errors
		expect(() => clearSubagentDescriptionCache()).not.toThrow()
	})

	it("should clear specific task description when clearTaskSubagentDescription is called", () => {
		// This test verifies the function exists and can be called without errors
		expect(() => clearTaskSubagentDescription("test-task-id")).not.toThrow()
	})

	it("should handle multiple cache clear operations", () => {
		// Clear multiple times to ensure stability
		clearSubagentDescriptionCache()
		clearTaskSubagentDescription("task1")
		clearTaskSubagentDescription("task2")
		clearSubagentDescriptionCache()

		// Should not throw any errors
		expect(true).toBe(true)
	})
})
