# API Provider Message Processing Analysis

## Overview

This analysis examines how different API providers handle conversation messages in the Roo Code extension, focusing on message format transformations, conversation structure, and provider-specific handling patterns.

## Core Architecture

### Base Message Structure

All providers extend from [`BaseProvider`](src/api/providers/base-provider.ts) and implement a standardized interface:

```typescript
abstract createMessage(
    systemPrompt: string,
    messages: Anthropic.Messages.MessageParam[],
    metadata?: ApiHandlerCreateMessageMetadata,
): ApiStream
```

**Key Design Decision**: The system uses Anthropic's message format as the internal standard, requiring transformation for all other providers.

## Message Transformation Patterns

### 1. OpenAI Format ([`openai-format.ts`](src/api/transform/openai-format.ts))

**Transformation Logic**:
- Converts Anthropic's rich content blocks to OpenAI's simpler structure
- Handles tool calls by separating tool results and regular content
- Maps images from base64 to `image_url` format
- Processes tool use/result sequences correctly

**Key Features**:
- **Tool Handling**: Separates `tool_result` and non-tool messages
- **Image Processing**: Converts `data:${media_type};base64,${data}` format
- **Message Ordering**: Ensures tool results follow tool use messages
- **Content Mapping**: Text blocks to simple strings, complex content to arrays

```typescript
// Example transformation
{
  role: "user",
  content: [
    { type: "text", text: "Hello" },
    { type: "image_url", image_url: { url: "data:image/png;base64,..." } }
  ]
}
```

### 2. Gemini Format ([`gemini-format.ts`](src/api/transform/gemini-format.ts))

**Transformation Logic**:
- Maps roles: `assistant` → `model`, `user` → `user`
- Converts content blocks to `Part[]` array
- Handles function calls and responses differently from OpenAI

**Key Features**:
- **Role Mapping**: Assistant becomes "model" in Gemini
- **Function Calls**: Uses `functionCall` and `functionResponse` structures
- **Image Handling**: `inlineData` with `mimeType` instead of URLs
- **Tool Results**: Extracts tool names from `tool_use_id`

```typescript
// Example Gemini message
{
  role: "model",
  parts: [
    { text: "Hello" },
    { inlineData: { data: "base64data", mimeType: "image/png" } }
  ]
}
```

### 3. Bedrock Converse Format ([`bedrock-converse-format.ts`](src/api/transform/bedrock-converse-format.ts))

**Transformation Logic**:
- Converts to AWS SDK's `ContentBlock[]` structure
- Handles images as byte arrays instead of base64 strings
- Supports video content through S3 locations
- Uses XML-like formatting for tool parameters

**Key Features**:
- **Binary Data**: Converts base64 strings to `Uint8Array`
- **Video Support**: Handles S3 location references
- **Tool Formatting**: XML-style parameter encoding
- **AWS-Specific**: Native AWS SDK types and structures

### 4. R1 Format ([`r1-format.ts`](src/api/transform/r1-format.ts))

**Purpose**: Special handling for DeepSeek Reasoner and similar models that don't support successive messages with the same role.

**Transformation Logic**:
- Merges consecutive messages with the same role
- Preserves image content in array format when merging
- Maintains conversation flow while satisfying model constraints

**Key Features**:
- **Role Consolidation**: Combines consecutive same-role messages
- **Content Preservation**: Maintains both text and image content
- **Model Compatibility**: Specifically designed for reasoning models

### 5. Simple Format ([`simple-format.ts`](src/api/transform/simple-format.ts))

**Purpose**: Fallback transformation that strips complex content to basic text.

**Transformation Logic**:
- Converts all content blocks to plain strings
- Provides placeholders for non-text content
- Used for providers with limited format support

**Content Mapping**:
- Images → `[Image: media_type]`
- Tool Use → `[Tool Use: tool_name]`
- Tool Results → Extracted text content

## Provider-Specific Handling Differences

### Anthropic Provider ([`anthropic.ts`](src/api/providers/anthropic.ts))

**Native Format**: No transformation needed - uses Anthropic format directly

**Special Features**:
- **Prompt Caching**: Applies `cache_control: { type: "ephemeral" }` to system prompts and recent user messages
- **Thinking Support**: Handles `thinking` content blocks for reasoning
- **Beta Features**: Manages beta header for prompt caching
- **Native Token Counting**: Uses Anthropic's token counting API

**Caching Strategy**:
```typescript
// Marks last two user messages for caching
const lastTwoUserMessages = messages.filter(msg => msg.role === "user").slice(-2)
lastTwoUserMessages.forEach(msg => {
    // Add cache_control to last text part
})
```

### OpenAI Provider ([`openai.ts`](src/api/providers/openai.ts))

**Multiple Format Support**:
- **Standard**: Uses [`convertToOpenAiMessages`](src/api/transform/openai-format.ts)
- **R1 Format**: For DeepSeek Reasoner models
- **Legacy Format**: For older providers using [`convertToSimpleMessages`](src/api/transform/simple-format.ts)
- **O3 Family**: Special handling with `developer` role

**Provider Detection**:
- **Azure AI Inference**: Different path structure
- **Azure OpenAI**: Uses `AzureOpenAI` client
- **Grok/XAI**: Disables stream options
- **ARK (Bytedance)**: Uses legacy format

**Model-Specific Logic**:
```typescript
if (modelId.includes("o1") || modelId.includes("o3")) {
    // Special O3 family handling
    yield* this.handleO3FamilyMessage(modelId, systemPrompt, messages)
} else if (deepseekReasoner) {
    // R1 format for reasoning models
    convertedMessages = convertToR1Format([...])
} else if (ark || enabledLegacyFormat) {
    // Simple format for legacy providers
    convertedMessages = convertToSimpleMessages(messages)
}
```

### Gemini Provider ([`gemini.ts`](src/api/providers/gemini.ts))

**Google-Specific Features**:
- **System Instructions**: Separate field for system prompts
- **Thinking Config**: Enables reasoning/thinking for supported models
- **Grounding**: Google Search integration
- **URL Context**: Web context retrieval

**Stream Processing**:
- Separates `thought` parts (reasoning) from regular content
- Handles grounding metadata for search results
- Processes function calls in Google's format

### Bedrock Provider ([`bedrock.ts`](src/api/providers/bedrock.ts))

**AWS-Specific Architecture**:
- **Converse API**: Uses [`convertToBedrockConverseMessages`](src/api/transform/bedrock-converse-format.ts)
- **Stream Events**: Complex AWS streaming event structure
- **Cache Metrics**: Advanced caching token tracking
- **Prompt Router**: Model selection and routing

**Event Processing**:
```typescript
// Handles multiple stream event types
switch (event.type) {
    case "contentBlockStart":
        if (event.contentBlock?.type === "thinking") {
            yield { type: "reasoning", text: event.contentBlock.thinking }
        }
    case "contentBlockDelta":
        // Process delta updates
}
```

## Conversation Structure Patterns

### Universal Structure

All providers follow this conversation flow:
1. **System Prompt**: Set as system message or instruction
2. **Message History**: Array of alternating user/assistant messages
3. **Content Blocks**: Support for text, images, tools within messages
4. **Streaming**: Real-time response generation

### Content Block Types

**Standard Anthropic Format** (internal):
- `text`: Plain text content
- `image`: Base64-encoded images with media type
- `tool_use`: Function/tool invocations
- `tool_result`: Tool execution results
- `thinking`: Reasoning/thought processes

**Provider Adaptations**:
- **OpenAI**: Maps to `content` arrays with `type` field
- **Gemini**: Uses `parts` arrays with specialized part types
- **Bedrock**: `ContentBlock[]` with AWS-specific structures
- **Mistral**: Simplified content arrays

### Tool Handling Patterns

**Anthropic** (Native):
```json
{
  "role": "assistant",
  "content": [
    { "type": "text", "text": "I'll help you with that." },
    { "type": "tool_use", "id": "123", "name": "calculator", "input": {} }
  ]
}
```

**OpenAI** (Transformed):
```json
{
  "role": "assistant", 
  "content": "I'll help you with that.",
  "tool_calls": [
    { "id": "123", "function": { "name": "calculator", "arguments": "{}" } }
  ]
}
```

**Gemini** (Transformed):
```json
{
  "role": "model",
  "parts": [
    { "text": "I'll help you with that." },
    { "functionCall": { "name": "calculator", "args": {} } }
  ]
}
```

## Performance and Optimization Patterns

### Caching Strategies

**Anthropic**: Native prompt caching with ephemeral cache control
**OpenAI**: Manual cache control headers for compatible providers
**Bedrock**: AWS-managed caching with detailed token metrics

### Token Management

**Provider-Specific Counting**:
- **Anthropic**: Native API token counting
- **Others**: Fallback to tiktoken estimation
- **Streaming**: Real-time token usage tracking

### Stream Processing

**Common Pattern**:
1. Convert internal format to provider format
2. Create streaming request
3. Process chunks/deltas
4. Yield typed response chunks (`text`, `reasoning`, `usage`)
5. Handle final usage metrics

## Error Handling and Fallbacks

### Format Fallbacks

1. **Primary Format**: Provider-specific transformation
2. **Legacy Format**: Simple text-only fallback
3. **Error Recovery**: Graceful degradation for unsupported features

### Content Type Handling

**Unsupported Content**:
- Images → Placeholder text descriptions
- Complex tools → Simplified representations
- Unknown blocks → Default text representations

## Summary

The message processing system demonstrates sophisticated provider abstraction while maintaining feature parity across different LLM APIs. The use of Anthropic's format as the internal standard provides a rich foundation that can be transformed to match each provider's specific requirements, with careful handling of advanced features like tool calls, reasoning, caching, and multimodal content.