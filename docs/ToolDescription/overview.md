# Tool Description Optimization System

## Overview

This document outlines the design and implementation of a token optimization system for tool descriptions in the Zentara multiagent system. The goal is to reduce context window usage and token costs by dynamically managing tool description verbosity based on usage patterns and importance.

## Problem Statement

The current system includes full descriptions of all available tools in the system prompt for each mode. This approach has several drawbacks:

1. **High Token Cost**: Tool descriptions can be very long (especially debugging tools), leading to expensive context consumption
2. **Reduced Context Availability**: Verbose tool descriptions consume valuable context window space that could be used for actual task content
3. **Inefficient Information Display**: Many tools are rarely used but still consume significant prompt space with full descriptions

## Solution Architecture

### Core Principles

The optimization system operates on the following principles:

#### a) Dual Description System
Each tool maintains two levels of description:
- **Brief Description**: 3-5 sentences summarizing the tool's core functionality
- **Full Description**: Complete documentation including parameters, examples, and usage guidelines

#### b) Permanent High-Priority Tools
A curated list of frequently used, essential tools that always display full descriptions:
- `glob` - File pattern matching and discovery
- `search_files` - Content-based file searching
- `read_file` - File content reading
- `subagent` - Parallel AI agent orchestration
- `update_todo_list` - Task management and tracking
- `write_to_file` - File creation and modification
- `apply_diff` - Precise file editing
- `execute_command` - System command execution

#### c) Conditional Description Display
Tools not in the permanent list show only brief descriptions in the system prompt by default.

#### d) On-Demand Full Description Retrieval
A new tool (`fetch_tool_description` or similar) allows the LLM to request full descriptions for any tool available in the current mode when detailed information is needed.

#### e) Usage-Based Dynamic Promotion
A FIFO (First In, First Out) queue tracks recently used tools per task session. Tools in this queue receive full description treatment.

#### f) Intelligent System Prompt Composition
The system prompt composition follows this hierarchy:

```
Tool Description Priority:
1. Permanent high-priority tools → Full description
2. Recently used tools (in FIFO queue) → Full description  
3. All other available tools → Brief description
```

## Implementation Details

### Tool Description Structure

```typescript
interface ToolDescription {
  name: string;
  brief: string;           // 3-5 sentence summary
  full: string;            // Complete documentation
  category: ToolCategory;
  isPermanent: boolean;    // Whether always shown in full
}
```

### Usage Tracking System

```typescript
interface ToolUsageQueue {
  taskId: string;
  recentTools: string[];   // FIFO queue of recently used tools
  maxSize: number;         // Fixed queue length (e.g., 5-8 tools)
}
```

### System Prompt Composition Algorithm

```typescript
function composeToolDescriptions(
  availableTools: Tool[],
  permanentTools: string[],
  recentlyUsed: string[]
): string {
  return availableTools.map(tool => {
    if (permanentTools.includes(tool.name) || recentlyUsed.includes(tool.name)) {
      return tool.fullDescription;
    }
    return tool.briefDescription;
  }).join('\n\n');
}
```

## Configuration Parameters

### Permanent Tool List
The following tools are designated as permanent high-priority tools based on frequency of use and criticality:

- **File Operations**: `read_file`, `write_to_file`, `apply_diff`
- **Discovery Tools**: `glob`, `search_files`, `list_files`
- **Orchestration**: `subagent`
- **Task Management**: `update_todo_list`, `attempt_completion`
- **System Integration**: `execute_command`

### FIFO Queue Configuration
- **Queue Size**: 5-8 tools (configurable per mode)
- **Scope**: Per-task session (reset on new task)
- **Update Trigger**: Tool approval and execution
- **Persistence**: Session-scoped, not persisted across sessions

### Description Length Guidelines
- **Brief Description**: 50-100 words maximum
- **Full Description**: No length limit, includes all necessary detail
- **Parameter Documentation**: Brief descriptions exclude parameter details, full descriptions include complete parameter specifications

## Benefits

### Token Efficiency
- **Estimated Savings**: 40-60% reduction in tool description tokens
- **Context Preservation**: More space available for actual task content
- **Cost Reduction**: Lower API costs due to reduced token usage

### User Experience
- **Faster Loading**: Shorter system prompts improve response initiation time
- **Relevant Information**: Recently used tools get full visibility when needed
- **On-Demand Detail**: Full descriptions available when required without cluttering default view

### Maintainability
- **Modular Design**: Easy to adjust permanent tool list and queue parameters
- **Usage Analytics**: Built-in tracking enables optimization based on actual usage patterns
- **Flexible Configuration**: Mode-specific customization of tool priority

## Implementation Phases

### Phase 1: Infrastructure
1. Implement dual description system for all tools
2. Create tool description management service
3. Implement FIFO queue tracking system

### Phase 2: Dynamic Composition
1. Modify current existing system prompt composition
2. Implement usage tracking and queue management
3. hard code list  for permanent tools

### Phase 3: On-Demand Retrieval
1. Implement `fetch_tool_description` tool
2. Add validation for mode-specific tool access
3. Integrate with existing tool validation system




### Futures: Adaptive Learning
- On new task: predict tool usage and queue size based on task complexity, context: For example, search, explore code based do not need the write tool full description. 
- Per-user customization of permanent tool lists


This optimization system represents a significant improvement in resource efficiency while maintaining the full functionality and flexibility of the Zentara tool ecosystem.
