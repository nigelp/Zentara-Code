import type { ModelInfo } from "../model.js"

// Zentara provider with single model
export type ZentaraModelId = "xai/grok-code-fast-1"

export const zentaraDefaultModelId: ZentaraModelId = "xai/grok-code-fast-1"

export const zentaraModels = {
	"xai/grok-code-fast-1": {
		maxTokens: 16_384,
		contextWindow: 262_144,
		supportsImages: false,
		supportsPromptCache: true,
		inputPrice: 0,
		outputPrice: 0,
		description:
			"A reasoning model that is blazing fast and excels at agentic coding, accessible for free through Zentara Code Cloud for a limited time. (Note: the free prompts and completions are logged by xAI and used to improve the model.)",
	},
} as const satisfies Record<string, ModelInfo>
