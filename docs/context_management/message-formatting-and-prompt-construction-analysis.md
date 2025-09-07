# Message Formatting and Prompt Construction Analysis

## Executive Summary

This document provides a comprehensive analysis of how messages are formatted and structured for inclusion in prompts to the LLM within the Zentara Code extension. The analysis reveals a sophisticated multi-layered architecture that handles conversation history, context management, tool integration, and provider-specific formatting.

## Key Findings

### 1. Message Flow Architecture

The message formatting follows this high-level flow:
1. **User Input Processing** → Raw user content with mentions and file references
2. **Content Processing** → Parsed content with resolved file paths and environment details
3. **Conversation History Management** → Integration with existing API conversation history
4. **Context Management** → Truncation, summarization, and token optimization
5. **Provider-Specific Formatting** → Final message array sent to LLM APIs

### 2. Core Message Types

The system uses `ApiMessage` as the primary message format:
```typescript
type ApiMessage = Anthropic.MessageParam & { 
  ts?: number;           // Timestamp for ordering
  isSummary?: boolean;   // Marks condensed conversation summaries
}
```

### 3. Critical Components

- **Task Class**: Central orchestrator managing conversation flow
- **System Prompt Generation**: Dynamic prompt construction with role definitions and tool descriptions
- **Context Management**: Automatic truncation and summarization for token limits
- **Message Processing Pipeline**: Multi-stage filtering and formatting

## Detailed Architecture Analysis

### System Prompt Generation (`src/core/prompts/system.ts`)

The `generatePrompt` function constructs comprehensive system prompts by combining:

```typescript
const basePrompt = `${roleDefinition}

${markdownFormattingSection()}${getSubagentSection(subagent)}

====

TOOL USE

${toolDescriptions}

====

CAPABILITIES

${capabilities}

====

MODES

${modes}

====

RULES

${rules}

====

SYSTEM INFORMATION

${systemInfo}

====

OBJECTIVE

${objective}

====

USER'S CUSTOM INSTRUCTIONS

${customInstructions}`
```

**Key Features:**
- **Dynamic Tool Descriptions**: Automatically includes available tools with full documentation
- **Mode-Specific Instructions**: Contextual behavior based on current mode
- **Custom Instructions**: User-defined preferences and guidelines
- **System Information**: Environment details and workspace context

### Message Storage and Persistence

#### API Conversation History
- **Storage**: `apiConversationHistory: ApiMessage[]` in Task class
- **Persistence**: Saved to `api_conversation_history.json` files
- **Format**: Based on Anthropic's `MessageParam` with additional metadata

#### Cline Messages
- **Storage**: `clineMessages: ClineMessage[]` for UI display
- **Purpose**: Rich message format for webview presentation
- **Separation**: Distinct from API messages for different concerns

### Core Message Processing Pipeline

#### 1. User Content Processing (`recursivelyMakeClineRequests`)

```typescript
// Process user mentions and file references
const parsedUserContent = await processUserContentMentions({
  userContent: currentUserContent,
  cwd: this.cwd,
  urlContentFetcher: this.urlContentFetcher,
  fileContextTracker: this.fileContextTracker,
  zentaraIgnoreController: this.zentaraIgnoreController,
  showZentaraIgnoredFiles,
  includeDiagnosticMessages,
  maxDiagnosticMessages,
  maxReadFileLine,
})

// Add environment details
const environmentDetails = await getEnvironmentDetails(this, currentIncludeFileDetails)
const finalUserContent = [...parsedUserContent, { type: "text" as const, text: environmentDetails }]

// Add to conversation history
await this.addToApiConversationHistory({ role: "user", content: finalUserContent })
```

**Processing Steps:**
1. **Mention Resolution**: Convert file paths and URLs to actual content
2. **Environment Integration**: Add workspace context and file structure
3. **History Integration**: Append to persistent conversation history

#### 2. Context Management (`attemptApiRequest`)

```typescript
// Get messages since last summary
const messagesSinceLastSummary = getMessagesSinceLastSummary(this.apiConversationHistory)

// Handle context window limits
const truncateResult = await truncateConversationIfNeeded({
  messages: this.apiConversationHistory,
  totalTokens: contextTokens,
  maxTokens,
  contextWindow,
  apiHandler: this.api,
  autoCondenseContext,
  autoCondenseContextPercent,
  systemPrompt,
  taskId: this.taskId,
  customCondensingPrompt,
  condensingApiHandler,
  profileThresholds,
  currentProfileId,
})
```

**Context Management Features:**
- **Automatic Truncation**: Removes old messages when approaching token limits
- **Smart Summarization**: Condenses conversation history while preserving context
- **Summary Markers**: Uses `isSummary` flag to track condensed content
- **Provider-Specific Limits**: Respects different model context windows

#### 3. Final Message Formatting

```typescript
// Remove images for non-supporting models
let cleanConversationHistory = maybeRemoveImageBlocks(messagesSinceLastSummary, this.api).map(
  ({ role, content }) => ({ role, content }),
)

// Create final API request
const stream = this.api.createMessage(systemPrompt, cleanConversationHistory, metadata)
```

**Final Processing:**
- **Image Handling**: Converts images to text descriptions for non-supporting models
- **Metadata Stripping**: Removes internal fields (ts, isSummary) for API
- **Provider Formatting**: Delegates to specific API handler implementations

### Message Content Structure

#### User Messages
```typescript
{
  role: "user",
  content: [
    { type: "text", text: "User's actual message" },
    { type: "text", text: "File content from mentions" },
    { type: "image", source: { ... } }, // If images included
    { type: "text", text: "Environment details" }
  ]
}
```

#### Assistant Messages
```typescript
{
  role: "assistant", 
  content: [
    { type: "text", text: "Assistant response text" },
    { type: "tool_use", id: "...", name: "tool_name", input: {...} }
  ]
}
```

#### Tool Result Messages
```typescript
{
  role: "user",
  content: [
    { type: "tool_result", tool_use_id: "...", content: "Tool output" }
  ]
}
```

### Context Management Deep Dive

#### Summary Generation Process

The `getMessagesSinceLastSummary` function handles conversation continuity:

```typescript
export function getMessagesSinceLastSummary(messages: ApiMessage[]): ApiMessage[] {
  let lastSummaryIndexReverse = [...messages].reverse().findIndex((message) => message.isSummary)
  
  if (lastSummaryIndexReverse === -1) {
    return messages // No summary found, return all messages
  }
  
  const lastSummaryIndex = messages.length - lastSummaryIndexReverse - 1
  const messagesSinceSummary = messages.slice(lastSummaryIndex)
  
  // Bedrock requires first message to be user message
  const userMessage: ApiMessage = {
    role: "user",
    content: "Please continue from the following summary:",
    ts: messages[0]?.ts ? messages[0].ts - 1 : Date.now(),
  }
  return [userMessage, ...messagesSinceSummary]
}
```

**Summary Features:**
- **Automatic Detection**: Finds last summary message using `isSummary` flag
- **Provider Compatibility**: Ensures first message is from user (Bedrock requirement)
- **Context Preservation**: Maintains conversation flow after summarization

#### Image Processing

The `maybeRemoveImageBlocks` function handles model compatibility:

```typescript
export function maybeRemoveImageBlocks(messages: ApiMessage[], apiHandler: ApiHandler): ApiMessage[] {
  return messages.map((message) => {
    let { content } = message
    if (Array.isArray(content)) {
      if (!apiHandler.getModel().info.supportsImages) {
        content = content.map((block) => {
          if (block.type === "image") {
            return {
              type: "text",
              text: "[Referenced image in conversation]",
            }
          }
          return block
        })
      }
    }
    return { ...message, content }
  })
}
```

**Image Handling:**
- **Model Detection**: Checks if current model supports images
- **Graceful Degradation**: Converts images to text placeholders
- **Context Preservation**: Maintains conversation structure

### Tool Integration Architecture

#### Tool Result Formatting

Tool results are integrated into the conversation using standardized formatting:

```typescript
// Tool execution results are added as user messages
await this.addToApiConversationHistory({
  role: "user",
  content: [
    {
      type: "tool_result",
      tool_use_id: toolUseId,
      content: formattedResult
    }
  ]
})
```

#### Tool Description Integration

The system prompt includes comprehensive tool descriptions:
- **Dynamic Loading**: Tools are discovered and documented automatically
- **Usage Examples**: Each tool includes detailed usage instructions
- **Parameter Validation**: Required and optional parameters clearly specified

### Provider-Specific Adaptations

#### API Handler Interface

All providers implement the `ApiHandler` interface:

```typescript
interface ApiHandler {
  createMessage(
    systemPrompt: string, 
    messages: Anthropic.Messages.MessageParam[], 
    metadata?: ApiHandlerCreateMessageMetadata
  ): ApiStream
}
```

#### Provider Implementations

- **Anthropic**: Native support for tool use and image content
- **OpenAI**: Adapted to OpenAI's message format and capabilities
- **Claude Code**: Specialized for code-focused interactions
- **Other Providers**: Each with specific adaptations and limitations

### Performance Optimizations

#### Token Management
- **Proactive Truncation**: Prevents context window exceeded errors
- **Smart Summarization**: Preserves important context while reducing tokens
- **Sliding Window**: Maintains recent conversation while removing old content

#### Caching Strategies
- **System Prompt Caching**: Reuses generated prompts when possible
- **Tool Description Caching**: Avoids regenerating tool documentation
- **Message Persistence**: Efficient storage and retrieval of conversation history

## Critical Code Locations

### Primary Files
- **`src/core/task/Task.ts`**: Main orchestration logic
  - `recursivelyMakeClineRequests()`: Core message processing loop
  - `attemptApiRequest()`: Final API request preparation
  - `addToApiConversationHistory()`: Message storage management

- **`src/core/prompts/system.ts`**: System prompt generation
  - `generatePrompt()`: Main prompt construction function

- **`src/core/condense/index.ts`**: Context management
  - `getMessagesSinceLastSummary()`: Summary-aware message filtering
  - `truncateConversationIfNeeded()`: Automatic context truncation

### Supporting Files
- **`src/api/transform/image-cleaning.ts`**: Image compatibility handling
- **`src/core/task-persistence/apiMessages.ts`**: Message type definitions
- **`src/api/index.ts`**: Provider interface definitions

## Key Insights

### 1. Separation of Concerns
The architecture cleanly separates:
- **UI Messages** (`clineMessages`): Rich format for webview display
- **API Messages** (`apiConversationHistory`): Optimized for LLM consumption
- **System Prompts**: Dynamic generation based on context and capabilities

### 2. Context-Aware Processing
- **Environment Integration**: Automatic inclusion of workspace context
- **File Mention Resolution**: Seamless integration of file content
- **Tool Result Formatting**: Structured presentation of tool outputs

### 3. Provider Flexibility
- **Unified Interface**: Common abstraction across different LLM providers
- **Capability Detection**: Automatic adaptation to model limitations
- **Format Translation**: Provider-specific message formatting

### 4. Performance Considerations
- **Token Optimization**: Proactive management of context window limits
- **Efficient Storage**: Separate persistence for different message types
- **Smart Caching**: Reuse of expensive operations like prompt generation

## Recommendations

### 1. Monitoring and Observability
- Add detailed logging for message processing pipeline
- Track token usage and context management effectiveness
- Monitor provider-specific performance characteristics

### 2. Optimization Opportunities
- Implement more sophisticated summarization strategies
- Add configurable context management policies
- Optimize tool description generation for frequently used tools

### 3. Extensibility Enhancements
- Create plugin system for custom message processors
- Add support for custom context management strategies
- Enable provider-specific optimization hooks

## Conclusion

The Zentara Code message formatting and prompt construction system represents a sophisticated, multi-layered architecture that successfully handles the complexity of modern LLM interactions. The system effectively balances performance, flexibility, and maintainability while providing a seamless user experience.

The architecture's key strengths include its clean separation of concerns, robust context management, and provider-agnostic design. These features enable the system to adapt to different LLM capabilities while maintaining consistent behavior and optimal performance.

Understanding this architecture is crucial for anyone working on the codebase, as message formatting touches nearly every aspect of the system's functionality, from tool execution to conversation management to provider integration.