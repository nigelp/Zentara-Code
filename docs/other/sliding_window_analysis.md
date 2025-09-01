# Sliding Window Mechanism Analysis

## Overview

The sliding window mechanism in `src/core/sliding-window/` is a sophisticated conversation memory management system that prevents context window overflow by either intelligently summarizing or truncating conversation history when token limits are approached.

## Key Components

### 1. Main Functions

- **`truncateConversationIfNeeded()`** - Main entry point that decides whether to use summarization or truncation
- **`truncateConversation()`** - Performs mechanical message removal
- **`estimateTokenCount()`** - Counts tokens for content using the API provider's token counting

### 2. Core Constants

- **`TOKEN_BUFFER_PERCENTAGE = 0.1`** - 10% buffer to prevent hitting context limits

## How Conversation Truncation Works

### Truncation Algorithm (`truncateConversation`)

1. **Always preserves the first message** - This is typically the system prompt or initial context
2. **Removes a fraction of messages** - Specified by `fracToRemove` parameter (0.0 to 1.0)
3. **Rounds to even numbers** - Ensures user/assistant message pairs remain intact
4. **Removes from the middle** - Takes messages after the first and before the specified remaining count

**Example with 5 messages and 0.5 fraction:**
- Original: [msg1, msg2, msg3, msg4, msg5]
- 4 messages after first × 0.5 = 2 messages to remove
- Result: [msg1, msg4, msg5] (removed msg2, msg3)

### Token Calculation Logic

```typescript
// Calculate available tokens for conversation history
const allowedTokens = contextWindow * (1 - TOKEN_BUFFER_PERCENTAGE) - reservedTokens
const prevContextTokens = totalTokens + lastMessageTokens
```

- **Context Window**: Total model capacity
- **Reserved Tokens**: Space for response (`maxTokens` or `ANTHROPIC_DEFAULT_MAX_TOKENS`)
- **Buffer**: 10% safety margin
- **Previous Context**: Existing conversation + incoming message

## What Triggers Sliding Window Behavior

The system has **two trigger mechanisms** that work in combination:

### 1. Intelligent Summarization (Primary)
Triggered when `autoCondenseContext = true` AND either condition is met:

#### A. Percentage-Based Threshold
```typescript
const contextPercent = (100 * prevContextTokens) / contextWindow
if (contextPercent >= effectiveThreshold) {
    // Trigger summarization
}
```

#### B. Absolute Token Threshold
```typescript
if (prevContextTokens > allowedTokens) {
    // Trigger summarization
}
```

### 2. Fallback Truncation (Secondary)
Applied when:
- Summarization is disabled (`autoCondenseContext = false`), OR
- Summarization fails with an error, OR
- Tokens still exceed `allowedTokens` after summarization

**Fallback always uses 0.5 fraction** - removes 50% of messages (rounded to even)

## Profile-Specific Thresholds

The system supports **custom thresholds per profile**:

```typescript
// Profile threshold resolution
if (profileThreshold === -1) {
    // Use global setting
    effectiveThreshold = autoCondenseContextPercent
} else if (profileThreshold >= MIN_CONDENSE_THRESHOLD && profileThreshold <= MAX_CONDENSE_THRESHOLD) {
    // Use profile-specific threshold
    effectiveThreshold = profileThreshold
} else {
    // Invalid threshold, fall back to global
    effectiveThreshold = autoCondenseContextPercent
}
```

## How Much History is Preserved vs Truncated

### Intelligent Summarization Mode
- **Preserves**: First message + summary + recent context
- **Removes**: Middle conversation history (replaced with AI-generated summary)
- **Typical Result**: 
  ```
  [SystemPrompt, Summary, RecentMessage1, RecentMessage2, NewMessage]
  ```

### Simple Truncation Mode
- **Always preserves**: First message (system prompt)
- **Removes**: 50% of remaining messages from the middle
- **Keeps**: Most recent messages + first message
- **Example with 7 messages**:
  - Original: [msg1, msg2, msg3, msg4, msg5, msg6, msg7]
  - 6 messages after first × 0.5 = 3 messages to remove (rounded to even)
  - Result: [msg1, msg5, msg6, msg7] (removed msg2, msg3, msg4)

## Token Counting Implementation

### Text Content
- Uses provider's native token counting via `apiHandler.countTokens()`
- Supports both string and structured content blocks

### Image Content
- Custom calculation: `Math.ceil(Math.sqrt(dataLength)) * 1.5`
- Accounts for base64 data size with 50% overhead factor

### Mixed Content
- Sums tokens from all content blocks (text + images)

## Edge Cases and Safeguards

1. **Empty Content**: Returns 0 tokens
2. **Even Message Removal**: Ensures conversation flow integrity
3. **Minimum Preservation**: Always keeps first message
4. **Buffer Protection**: 10% safety margin prevents hard limits
5. **Graceful Fallback**: Truncation when summarization fails
6. **Profile Validation**: Invalid thresholds fall back to global settings

## Configuration Parameters

- **`autoCondenseContext`**: Enable/disable intelligent summarization
- **`autoCondenseContextPercent`**: Global percentage threshold (0-100)
- **`profileThresholds`**: Per-profile threshold overrides
- **`customCondensingPrompt`**: Custom prompt for summarization
- **`condensingApiHandler`**: Alternative API for summarization

## Usage Examples

### High-Frequency Summarization
```typescript
{
  autoCondenseContext: true,
  autoCondenseContextPercent: 60,  // Trigger at 60% context usage
  profileThresholds: {
    "heavy-user": 50  // More aggressive for heavy users
  }
}
```

### Conservative Truncation
```typescript
{
  autoCondenseContext: false,  // Simple truncation only
  // Will only truncate when exceeding allowedTokens
}
```

### Balanced Approach
```typescript
{
  autoCondenseContext: true,
  autoCondenseContextPercent: 80,  // Trigger at 80% context usage
  profileThresholds: {
    "power-user": -1  // Inherit global setting
  }
}
```

## Performance Characteristics

- **Truncation**: Near-instantaneous, no API calls
- **Summarization**: Requires LLM API call, costs tokens, takes time
- **Token Counting**: Fast, uses efficient provider implementations
- **Memory**: Minimal overhead, processes messages in-place where possible

## Integration Points

- **Telemetry**: Captures truncation events via `TelemetryService.captureSlidingWindowTruncation()`
- **Condense Module**: Delegates to `summarizeConversation()` for intelligent summarization
- **API Providers**: Uses provider-specific token counting and summarization
- **Task Persistence**: Operates on `ApiMessage[]` format

This sliding window system provides a robust, configurable solution for managing conversation context that balances memory efficiency with conversation continuity.