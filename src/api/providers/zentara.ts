import { Anthropic } from "@anthropic-ai/sdk"

import { zentaraDefaultModelId, zentaraModels, type ZentaraModelId } from "@zentara-code/types"
import { CloudService } from "@zentara-code/cloud"

import type { ApiHandlerOptions } from "../../shared/api"
import { ApiStream } from "../transform/stream"

import type { ApiHandlerCreateMessageMetadata } from "../index"
import { BaseOpenAiCompatibleProvider } from "./base-openai-compatible-provider"

export class ZentaraHandler extends BaseOpenAiCompatibleProvider<ZentaraModelId> {
	constructor(options: ApiHandlerOptions) {
		// Get the session token if available, but don't throw if not.
		// The server will handle authentication errors and return appropriate status codes.
		let sessionToken = ""

		if (CloudService.hasInstance()) {
			sessionToken = CloudService.instance.authService?.getSessionToken() || ""
		}

		// Always construct the handler, even without a valid token.
		// The provider-proxy server will return 401 if authentication fails.
		super({
			...options,
			providerName: "Zentara Code Cloud",
			baseURL: process.env.ROO_CODE_PROVIDER_URL ?? "https://api.zentaracode.com/proxy/v1",
			apiKey: sessionToken || "unauthenticated", // Use a placeholder if no token
			defaultProviderModelId: zentaraDefaultModelId,
			providerModels: zentaraModels,
			defaultTemperature: 0.7,
		})
	}

	override async *createMessage(
		systemPrompt: string,
		messages: Anthropic.Messages.MessageParam[],
		metadata?: ApiHandlerCreateMessageMetadata,
	): ApiStream {
		const stream = await this.createStream(
			systemPrompt,
			messages,
			metadata,
			metadata?.taskId ? { headers: { "X-Zentara-Task-ID": metadata.taskId } } : undefined,
		)

		for await (const chunk of stream) {
			const delta = chunk.choices[0]?.delta

			if (delta) {
				if (delta.content) {
					yield {
						type: "text",
						text: delta.content,
					}
				}

				if ("reasoning_content" in delta && typeof delta.reasoning_content === "string") {
					yield {
						type: "reasoning",
						text: delta.reasoning_content,
					}
				}
			}

			if (chunk.usage) {
				yield {
					type: "usage",
					inputTokens: chunk.usage.prompt_tokens || 0,
					outputTokens: chunk.usage.completion_tokens || 0,
				}
			}
		}
	}

	override getModel() {
		const modelId = this.options.apiModelId || zentaraDefaultModelId
		const modelInfo = this.providerModels[modelId as ZentaraModelId] ?? this.providerModels[zentaraDefaultModelId]

		if (modelInfo) {
			return { id: modelId as ZentaraModelId, info: modelInfo }
		}

		// Return the requested model ID even if not found, with fallback info.
		return {
			id: modelId as ZentaraModelId,
			info: {
				maxTokens: 16_384,
				contextWindow: 262_144,
				supportsImages: false,
				supportsPromptCache: true,
				inputPrice: 0,
				outputPrice: 0,
			},
		}
	}
}
