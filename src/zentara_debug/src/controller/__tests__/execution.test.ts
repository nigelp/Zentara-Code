import { describe, test, expect } from "vitest"
import { truncateMiddle } from "../../utils/textTruncation"

describe("truncateMiddle", () => {
	test("should return undefined for undefined input", () => {
		expect(truncateMiddle(undefined)).toBeUndefined()
	})

	test("should return empty string for empty input", () => {
		expect(truncateMiddle("")).toBe("")
	})

	test("should return original text when under limit", () => {
		const shortText = "This is a short text"
		expect(truncateMiddle(shortText, 100)).toBe(shortText)
	})

	test("should return original text when exactly at limit", () => {
		const exactText = "a".repeat(100)
		expect(truncateMiddle(exactText, 100)).toBe(exactText)
	})

	test("should truncate text when over default limit (10000)", () => {
		const longText = "a".repeat(15000)
		const result = truncateMiddle(longText)
		
		expect(result).toBeDefined()
		expect(result!.length).toBe(10000)
		expect(result).toContain("--text_truncated_5000_chars--")
	})

	test("should truncate text when over custom limit", () => {
		const longText = "a".repeat(1000)
		const result = truncateMiddle(longText, 500)
		
		expect(result).toBeDefined()
		expect(result!.length).toBe(500)
		expect(result).toContain("--text_truncated_500_chars--")
	})

	test("should preserve beginning and end of text", () => {
		const longText = "START" + "x".repeat(10000) + "END"
		const result = truncateMiddle(longText, 100)
		
		expect(result).toBeDefined()
		expect(result!.length).toBe(100)
		expect(result).toMatch(/^START.*END$/)
		expect(result).toContain("--text_truncated_")
	})

	test("should calculate truncated character count correctly", () => {
		const originalLength = 25000
		const maxLength = 10000
		const expectedTruncated = originalLength - maxLength
		const longText = "a".repeat(originalLength)
		
		const result = truncateMiddle(longText, maxLength)
		
		expect(result).toBeDefined()
		expect(result!.length).toBe(maxLength)
		expect(result).toContain(`--text_truncated_${expectedTruncated}_chars--`)
	})

	test("should handle edge case with very small limit", () => {
		const longText = "This is a long text that needs truncation"
		const result = truncateMiddle(longText, 50)
		
		expect(result).toBeDefined()
		// The original text is 41 chars, which is less than 50, so it should return unchanged
		expect(result!.length).toBe(41)
		expect(result).toBe(longText)
	})

	test("should handle edge case with very small limit and long text", () => {
		const longText = "a".repeat(200) // 200 characters
		const result = truncateMiddle(longText, 30)
		
		expect(result).toBeDefined()
		expect(result!.length).toBe(30)
		expect(result).toMatch(/--truncated_\d+--|--text_truncated_\d+_chars--/)
	})

	test("should maintain exact length after truncation", () => {
		const testCases = [
			{ originalLength: 15000, maxLength: 10000 },
			{ originalLength: 5000, maxLength: 1000 },
			{ originalLength: 100000, maxLength: 8000 },
		]

		testCases.forEach(({ originalLength, maxLength }) => {
			const longText = "a".repeat(originalLength)
			const result = truncateMiddle(longText, maxLength)
			
			expect(result).toBeDefined()
			expect(result!.length).toBe(maxLength)
		})
	})

	test("should include correct truncation marker format", () => {
		const longText = "a".repeat(12345)
		const result = truncateMiddle(longText, 10000)
		
		expect(result).toBeDefined()
		expect(result).toMatch(/--text_truncated_\d+_chars--/)
		expect(result).toContain("--text_truncated_2345_chars--")
	})

	test("should handle text with special characters", () => {
		const specialText = "🚀".repeat(5000) + "middle content" + "🎯".repeat(5000)
		const result = truncateMiddle(specialText, 1000)
		
		expect(result).toBeDefined()
		expect(result!.length).toBe(1000)
		expect(result).toContain("--text_truncated_")
	})

	test("should preserve structure with newlines and formatting", () => {
		const formattedText = "Line 1\nLine 2\n" + "content\n".repeat(2000) + "Final Line\nEnd"
		const result = truncateMiddle(formattedText, 500)
		
		expect(result).toBeDefined()
		expect(result!.length).toBe(500)
		expect(result).toMatch(/^Line 1\nLine 2\n.*End$/s) // Added 's' flag for dotall mode
		expect(result).toContain("--text_truncated_")
	})

	test("should handle minimum viable truncation", () => {
		// Test case where the truncation marker is almost as long as the limit
		const longText = "a".repeat(100)
		const smallLimit = 40 // Just enough for marker + some content
		const result = truncateMiddle(longText, smallLimit)
		
		expect(result).toBeDefined()
		expect(result!.length).toBe(smallLimit)
		expect(result).toMatch(/--truncated_60--|--text_truncated_60_chars--/)
	})
})