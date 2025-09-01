// npx vitest utils/__tests__/cost.spec.ts

import type { ModelInfo } from "@roo-code/types"

import { calculateApiCostAnthropic, calculateApiCostOpenAI, calculateApiCostSubscription } from "../../shared/cost"

describe("Cost Utility", () => {
	describe("calculateApiCostAnthropic", () => {
		const mockModelInfo: ModelInfo = {
			maxTokens: 8192,
			contextWindow: 200_000,
			supportsPromptCache: true,
			inputPrice: 3.0, // $3 per million tokens
			outputPrice: 15.0, // $15 per million tokens
			cacheWritesPrice: 3.75, // $3.75 per million tokens
			cacheReadsPrice: 0.3, // $0.30 per million tokens
		}

		it("should calculate basic input/output costs correctly", () => {
			const cost = calculateApiCostAnthropic(mockModelInfo, 1000, 500)

			// Input cost: (3.0 / 1_000_000) * 1000 = 0.003
			// Output cost: (15.0 / 1_000_000) * 500 = 0.0075
			// Total: 0.003 + 0.0075 = 0.0105
			expect(cost).toBe(0.0105)
		})

		it("should handle cache writes cost", () => {
			const cost = calculateApiCostAnthropic(mockModelInfo, 1000, 500, 2000)

			// Input cost: (3.0 / 1_000_000) * 1000 = 0.003
			// Output cost: (15.0 / 1_000_000) * 500 = 0.0075
			// Cache writes: (3.75 / 1_000_000) * 2000 = 0.0075
			// Total: 0.003 + 0.0075 + 0.0075 = 0.018
			expect(cost).toBeCloseTo(0.018, 6)
		})

		it("should handle cache reads cost", () => {
			const cost = calculateApiCostAnthropic(mockModelInfo, 1000, 500, undefined, 3000)

			// Input cost: (3.0 / 1_000_000) * 1000 = 0.003
			// Output cost: (15.0 / 1_000_000) * 500 = 0.0075
			// Cache reads: (0.3 / 1_000_000) * 3000 = 0.0009
			// Total: 0.003 + 0.0075 + 0.0009 = 0.0114
			expect(cost).toBe(0.0114)
		})

		it("should handle all cost components together", () => {
			const cost = calculateApiCostAnthropic(mockModelInfo, 1000, 500, 2000, 3000)

			// Input cost: (3.0 / 1_000_000) * 1000 = 0.003
			// Output cost: (15.0 / 1_000_000) * 500 = 0.0075
			// Cache writes: (3.75 / 1_000_000) * 2000 = 0.0075
			// Cache reads: (0.3 / 1_000_000) * 3000 = 0.0009
			// Total: 0.003 + 0.0075 + 0.0075 + 0.0009 = 0.0189
			expect(cost).toBe(0.0189)
		})

		it("should handle missing prices gracefully", () => {
			const modelWithoutPrices: ModelInfo = {
				maxTokens: 8192,
				contextWindow: 200_000,
				supportsPromptCache: true,
			}

			const cost = calculateApiCostAnthropic(modelWithoutPrices, 1000, 500, 2000, 3000)
			expect(cost).toBe(0)
		})

		it("should handle zero tokens", () => {
			const cost = calculateApiCostAnthropic(mockModelInfo, 0, 0, 0, 0)
			expect(cost).toBe(0)
		})

		it("should handle undefined cache values", () => {
			const cost = calculateApiCostAnthropic(mockModelInfo, 1000, 500)

			// Input cost: (3.0 / 1_000_000) * 1000 = 0.003
			// Output cost: (15.0 / 1_000_000) * 500 = 0.0075
			// Total: 0.003 + 0.0075 = 0.0105
			expect(cost).toBe(0.0105)
		})

		it("should handle missing cache prices", () => {
			const modelWithoutCachePrices: ModelInfo = {
				...mockModelInfo,
				cacheWritesPrice: undefined,
				cacheReadsPrice: undefined,
			}

			const cost = calculateApiCostAnthropic(modelWithoutCachePrices, 1000, 500, 2000, 3000)

			// Should only include input and output costs
			// Input cost: (3.0 / 1_000_000) * 1000 = 0.003
			// Output cost: (15.0 / 1_000_000) * 500 = 0.0075
			// Total: 0.003 + 0.0075 = 0.0105
			expect(cost).toBe(0.0105)
		})
	})

	describe("calculateApiCostOpenAI", () => {
		const mockModelInfo: ModelInfo = {
			maxTokens: 8192,
			contextWindow: 200_000,
			supportsPromptCache: true,
			inputPrice: 3.0, // $3 per million tokens
			outputPrice: 15.0, // $15 per million tokens
			cacheWritesPrice: 3.75, // $3.75 per million tokens
			cacheReadsPrice: 0.3, // $0.30 per million tokens
		}

		it("should calculate basic input/output costs correctly", () => {
			const cost = calculateApiCostOpenAI(mockModelInfo, 1000, 500)

			// Input cost: (3.0 / 1_000_000) * 1000 = 0.003
			// Output cost: (15.0 / 1_000_000) * 500 = 0.0075
			// Total: 0.003 + 0.0075 = 0.0105
			expect(cost).toBe(0.0105)
		})

		it("should handle cache writes cost", () => {
			const cost = calculateApiCostOpenAI(mockModelInfo, 3000, 500, 2000)

			// Input cost: (3.0 / 1_000_000) * (3000 - 2000) = 0.003
			// Output cost: (15.0 / 1_000_000) * 500 = 0.0075
			// Cache writes: (3.75 / 1_000_000) * 2000 = 0.0075
			// Total: 0.003 + 0.0075 + 0.0075 = 0.018
			expect(cost).toBeCloseTo(0.018, 6)
		})

		it("should handle cache reads cost", () => {
			const cost = calculateApiCostOpenAI(mockModelInfo, 4000, 500, undefined, 3000)

			// Input cost: (3.0 / 1_000_000) * (4000 - 3000) = 0.003
			// Output cost: (15.0 / 1_000_000) * 500 = 0.0075
			// Cache reads: (0.3 / 1_000_000) * 3000 = 0.0009
			// Total: 0.003 + 0.0075 + 0.0009 = 0.0114
			expect(cost).toBe(0.0114)
		})

		it("should handle all cost components together", () => {
			const cost = calculateApiCostOpenAI(mockModelInfo, 6000, 500, 2000, 3000)

			// Input cost: (3.0 / 1_000_000) * (6000 - 2000 - 3000) = 0.003
			// Output cost: (15.0 / 1_000_000) * 500 = 0.0075
			// Cache writes: (3.75 / 1_000_000) * 2000 = 0.0075
			// Cache reads: (0.3 / 1_000_000) * 3000 = 0.0009
			// Total: 0.003 + 0.0075 + 0.0075 + 0.0009 = 0.0189
			expect(cost).toBe(0.0189)
		})

		it("should handle missing prices gracefully", () => {
			const modelWithoutPrices: ModelInfo = {
				maxTokens: 8192,
				contextWindow: 200_000,
				supportsPromptCache: true,
			}

			const cost = calculateApiCostOpenAI(modelWithoutPrices, 1000, 500, 2000, 3000)
			expect(cost).toBe(0)
		})

		it("should handle zero tokens", () => {
			const cost = calculateApiCostOpenAI(mockModelInfo, 0, 0, 0, 0)
			expect(cost).toBe(0)
		})

		it("should handle undefined cache values", () => {
			const cost = calculateApiCostOpenAI(mockModelInfo, 1000, 500)

			// Input cost: (3.0 / 1_000_000) * 1000 = 0.003
			// Output cost: (15.0 / 1_000_000) * 500 = 0.0075
			// Total: 0.003 + 0.0075 = 0.0105
			expect(cost).toBe(0.0105)
		})

		it("should handle missing cache prices", () => {
			const modelWithoutCachePrices: ModelInfo = {
				...mockModelInfo,
				cacheWritesPrice: undefined,
				cacheReadsPrice: undefined,
			}

			const cost = calculateApiCostOpenAI(modelWithoutCachePrices, 6000, 500, 2000, 3000)

			// Should only include input and output costs
			// Input cost: (3.0 / 1_000_000) * (6000 - 2000 - 3000) = 0.003
			// Output cost: (15.0 / 1_000_000) * 500 = 0.0075
			// Total: 0.003 + 0.0075 = 0.0105
			expect(cost).toBe(0.0105)
		})
	
		describe("calculateApiCostSubscription", () => {
			const mockModelInfo: ModelInfo = {
				maxTokens: 8192,
				contextWindow: 200000,
				supportsPromptCache: true,
				inputPrice: 3.0,
				outputPrice: 15.0,
				cacheWritesPrice: 3.75,
				cacheReadsPrice: 0.3,
			}
	
			it("should always return zero cost regardless of token counts", () => {
				const cost = calculateApiCostSubscription(mockModelInfo, 1000, 500)
				expect(cost).toBe(0)
			})
	
			it("should return zero cost with cache writes", () => {
				const cost = calculateApiCostSubscription(mockModelInfo, 1000, 500, 2000)
				expect(cost).toBe(0)
			})
	
			it("should return zero cost with cache reads", () => {
				const cost = calculateApiCostSubscription(mockModelInfo, 1000, 500, undefined, 3000)
				expect(cost).toBe(0)
			})
	
			it("should return zero cost with all parameters", () => {
				const cost = calculateApiCostSubscription(mockModelInfo, 1000, 500, 2000, 3000)
				expect(cost).toBe(0)
			})
	
			it("should return zero cost even with high token counts", () => {
				const cost = calculateApiCostSubscription(mockModelInfo, 100000, 50000, 20000, 30000)
				expect(cost).toBe(0)
			})
	
			it("should return zero cost with zero tokens", () => {
				const cost = calculateApiCostSubscription(mockModelInfo, 0, 0, 0, 0)
				expect(cost).toBe(0)
			})
	
			it("should return zero cost with undefined cache values", () => {
				const cost = calculateApiCostSubscription(mockModelInfo, 1000, 500)
				expect(cost).toBe(0)
			})
	
			it("should return zero cost even with expensive model pricing", () => {
				const expensiveModel: ModelInfo = {
					maxTokens: 8192,
					contextWindow: 200000,
					supportsPromptCache: true,
					inputPrice: 100.0,
					outputPrice: 500.0,
					cacheWritesPrice: 200.0,
					cacheReadsPrice: 50.0,
				}
	
				const cost = calculateApiCostSubscription(expensiveModel, 10000, 5000, 2000, 3000)
				expect(cost).toBe(0)
			})
		})
	})
})
