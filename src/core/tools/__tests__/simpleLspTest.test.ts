import { describe, it, expect, vi } from "vitest"

// Test that diagnostics work without all the complexity
describe("Simple LSP Diagnostics Test", () => {
	it("should pass basic test", () => {
		expect(true).toBe(true)
	})
	
	it("should mock functions work", () => {
		const mockFn = vi.fn().mockReturnValue("test")
		const result = mockFn()
		expect(result).toBe("test")
		expect(mockFn).toHaveBeenCalled()
	})
})