# Zentara Multiagent System - User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Core Concepts](#core-concepts)
3. [Getting Started](#getting-started)
4. [Using the SubAgent Tool](#using-the-SubAgent-tool)
5. [Agent Monitoring](#agent-monitoring)
6. [Advanced Features](#advanced-features)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)

## Introduction

The Zentara Multiagent System enables parallel execution of autonomous AI tasks through enhancements to the existing Task and ClineProvider infrastructure. Built with backward compatibility in mind, it extends Claude Code's proven architecture to support concurrent task execution without breaking existing functionality.

### Key Features

- **🚀 Parallel Execution**: Launch multiple agents to work on different aspects of a problem simultaneously
- **🔒 Security First**: Sandboxed execution with granular permission controls
- **📊 Real-time Monitoring**: Advanced visualizations for agent status, SubAgent flow, and performance
- **🎯 Smart Resource Management**: Automatic load balancing and resource optimization
- **🔄 File Conflict Prevention**: Intelligent file locking prevents concurrent modification issues
- **⏱️ Time-bounded Execution**: 5-minute execution limits ensure predictable behavior

## Core Concepts

### What is a Parallel Task?

A parallel task is a **Task instance configured for autonomous execution** that can:

- Run concurrently with other tasks
- Execute tools without user interaction
- Complete objectives independently
- Operate within resource and security constraints

### Task Execution Modes

1. **Sequential Tasks** (Default) 📝

    - Traditional execution model
    - User interactions enabled
    - Stack-based management
    - Full conversation context

2. **Parallel Tasks** (New) ⚡

    - Concurrent execution
    - Autonomous operation
    - Set-based management
    - Minimal context

3. **Hybrid Workflows** 🔄
    - Mix sequential and parallel tasks
    - Parent tasks spawn parallel children
    - Aggregate results from multiple sources

### Key Principles

1. **Backward Compatibility**: All existing Task usage continues unchanged
2. **Configuration-Based**: Parallel behavior enabled through options
3. **Resource Management**: Conditional limits based on execution mode
4. **File Safety**: Automatic locking prevents concurrent modifications
5. **Unified Architecture**: Single codebase for both execution modes

## Getting Started

### Basic Parallel Task Usage

The SubAgent tool creates parallel tasks with autonomous behavior:

```xml
<subagent>
{
  "description": "Analyze code quality",
  "prompt": "Analyze the authentication module for security vulnerabilities and code quality issues"
}
</subagent>
```

### Parallel Agent Execution

Launch multiple agents simultaneously for faster results:

```

## Using the SubAgent Tool


```

### Common Parallel Task Patterns

#### 1. Information Gathering

```xml
<subagent>
{
  "description": "Find authentication code",
  "prompt": "Search the codebase for all authentication-related code.\nFocus on:\n- Login/logout functionality\n- Session management\n- Token validation\n- Password handling\n\nReturn a structured summary of findings."
}
</subagent>
```

#### 2. Code Analysis

```typescript
SubAgent({
	description: "Analyze dependencies",
	prompt: `
    Analyze the project's dependency tree:
    1. List all direct dependencies
    2. Identify outdated packages
    3. Check for security vulnerabilities
    4. Suggest updates with compatibility notes

    Format output as JSON with categories.
  `,
})
```

#### 3. Multi-file Operations

```typescript
SubAgent({
	description: "Refactor imports",
	prompt: `
    Update all import statements from '@old/package' to '@new/package'.

    Scope: src/**/*.ts files only

    Return:
    - List of files that would be modified
    - Example of changes
    - Any potential issues
  `,
	writePermissions: true,
	allowedWritePaths: ["src/**/*.ts"],
})
```

## Agent Monitoring

### Dashboard Overview

The Enhanced Agent Dashboard provides comprehensive monitoring:

1. **Overview Tab**: Quick statistics and status summary
2. **Agents Tab**: Detailed agent status and controls
3. **SubAgent Flow Tab**: Visual representation of SubAgent dependencies
4. **Network Tab**: Agent collaboration and communication patterns
5. **Performance Tab**: Resource usage heatmaps and trends
6. **Monitoring Tab**: Real-time logs and metrics

### Understanding Visualizations

#### SubAgent Flow Diagram

Shows the relationship between SubAgents and their execution status:

- **Green nodes**: Running SubAgents
- **Blue nodes**: Completed SubAgents
- **Red nodes**: Failed SubAgents
- **Yellow nodes**: Blocked/paused SubAgents
- **Gray nodes**: Pending SubAgents

#### Agent Network Graph

Displays agent interactions and resource usage:

- **Node size**: Indicates agent importance
- **Connection thickness**: Shows communication frequency
- **Animation**: Real-time data flow between agents
- **Color coding**: Agent status (active, idle, busy, error)

#### Performance Heatmap

Identifies performance patterns and bottlenecks:

- **Color intensity**: Metric severity
- **Trends**: Arrows showing improvement/degradation
- **Filtering**: Focus on specific metrics or time ranges
- **Threshold controls**: Highlight anomalies

### Key Metrics

1. **Response Time**: How quickly agents complete SubAgents
2. **CPU Usage**: Processing resource consumption
3. **Memory Usage**: RAM utilization
4. **SubAgent Throughput**: SubAgents completed per minute
5. **Error Rate**: Percentage of failed operations
6. **Queue Length**: Pending SubAgents waiting for execution

## Advanced Features

### 1. Agent Coordination Patterns

#### Hierarchical Execution

#### Pipeline Pattern

```typescript
// Stage 1: Discovery
const files = await SubAgent({
	description: "Find test files",
	prompt: "Locate all test files in the project",
})

// Stage 2: Analysis
const analysis = await SubAgent({
	description: "Analyze test coverage",
	prompt: `Analyze test coverage for files: ${files.join(", ")}`,
})

// Stage 3: Recommendations
const recommendations = await SubAgent({
	description: "Generate recommendations",
	prompt: `Based on coverage data: ${analysis}, suggest improvements`,
})
```

### 2. Resource Optimization

#### Batching Similar SubAgents (For next phase)

```typescript
// Efficient: Batch related operations
const batchedSubAgent = await BatchSubAgent({
	description: "Batch file analysis",
	prompt: `
    Analyze  TypeScript file {file_name} in folder {folder_name}:
    - Count lines of code
    - Check complexity
    - Identify duplicates
    Return aggregated results
  `,
  params = {"file_name": ["file1", "file2", "file3"], "folder_name": ["folder1", "folder2"]}
})
then BatchSubAgent will create 6 subagent to work on 3 file * 2 folders

// Less efficient: directly create each Subagent as it would need to spend tokens to create the same subagent prompt with different in params.
```

## Best Practices

### 1. SubAgent Scoping

✅ **DO:**

- Keep SubAgents focused and specific
- Define clear success criteria
- Specify exact output format
- Set reasonable time limits

❌ **DON'T:**

- Create vague, open-ended SubAgents
- Combine unrelated operations
- Expect agents to maintain state
- Ignore resource constraints

### 2. Prompt Engineering

#### Effective Prompts

```typescript
// GOOD: Specific, measurable, bounded
SubAgent({
	description: "Audit API endpoints",
	prompt: `
    Analyze all REST API endpoints in src/api/**/*.ts

    For each endpoint, identify:
    1. HTTP method and path
    2. Input validation status
    3. Authentication requirements
    4. Error handling completeness

    Output format:
    {
      "endpoints": [{
        "path": string,
        "method": string,
        "hasValidation": boolean,
        "hasAuth": boolean,
        "hasErrorHandling": boolean
      }],
      "summary": {
        "total": number,
        "withoutValidation": number,
        "withoutAuth": number,
        "withoutErrorHandling": number
      }
    }

    Time limit: 5 minutes
    Do not modify any files
  `,
})

// BAD: Vague, unbounded, unclear output
SubAgent({
	description: "Check API",
	prompt: "Look at the API and see if there are any issues",
})
```

### 4. Security Considerations

#### Safe File Operations

```typescript
// Always validate paths when granting write permissions
SubAgent({
	description: "Update configs",
	prompt: "Update configuration files",
	writePermissions: true,
	allowedWritePaths: [
		"config/*.json", // Specific directory
		"!config/secrets.json", // Exclude sensitive files
	],
})
```

#### Input Sanitization

```typescript
// Sanitize dynamic inputs
const userInput = sanitizeInput(rawInput)
SubAgent({
	description: "Process user data",
	prompt: `Analyze data: ${JSON.stringify(userInput)}`, // Always stringify
})
```

## Troubleshooting

### Common Issues

#### 1. Agent Timeout

**Problem**: Agent exceeds 5-minute execution limit

**Solutions**:

- Break SubAgent into smaller subSubAgents
- Optimize search/analysis scope
- Use more specific file patterns
- Pre-filter data before processing

```typescript
// Instead of analyzing entire codebase
SubAgent({
	description: "Analyze everything",
	prompt: "Analyze all files in the project", // Too broad
})

// Break into focused SubAgents
const modules = ["auth", "api", "utils", "components"]
await Promise.all(
	modules.map((module) =>
		SubAgent({
			description: `Analyze ${module}`,
			prompt: `Analyze files in src/${module} directory only`,
		}),
	),
)
```

#### 2. File Lock Conflicts

**Problem**: Multiple agents trying to modify same file

**Solutions**:

- Assign exclusive file ranges to agents
- Use sequential execution for overlapping modifications
- Implement proper SubAgent dependencies

```typescript
// Prevent conflicts with exclusive file assignments
const fileGroups = {
	agent1: ["src/auth/**/*.ts"],
	agent2: ["src/api/**/*.ts"],
	agent3: ["src/utils/**/*.ts"],
}

await Promise.all(
	Object.entries(fileGroups).map(([agent, files]) =>
		SubAgent({
			description: `Update ${agent} files`,
			prompt: `Refactor files matching: ${files.join(", ")}`,
			writePermissions: true,
			allowedWritePaths: files,
		}),
	),
)
```

#### 3. Memory Issues

**Problem**: Agents consuming too much memory

**Solutions**:

- Process files in chunks
- Limit concurrent agents
- Use streaming for large data
- Clear intermediate results

## API Reference

### SubAgent Tool

```typescript
function SubAgent(config: SubAgentConfig): Promise<SubAgentResult>
```

#### Parameters

- `config.description` (string, required): 3-5 word SubAgent summary
- `config.prompt` (string, required): Detailed SubAgent instructions
- `config.writePermissions` (boolean, optional): Allow file modifications
- `config.allowedWritePaths` (string[], optional): Paths where writing is allowed
- `config.maxExecutionTime` (number, optional): Max execution time in ms (default: 300000)
- `config.priority` (string, optional): SubAgent priority level
- `config.outputSchema` (any, optional): Expected output format

#### Returns

```typescript
interface SubAgentResult {
	success: boolean
	SubAgentId: string
	description: string
	result?: any
	error?: string
	executionTime: number
	toolsUsed: string[]
	filesAccessed: string[]
	filesModified: string[]
	resourceUsage: {
		memoryPeak: number
		fileOperations: number
		toolCalls: number
	}
	securityStatus: {
		violations: number
		blockedOperations: string[]
	}
}
```

### Agent Controller

```typescript
class ClineProvider {
	// Sequential task management (existing)
	getCurrentCline(): Task | undefined
	addClineToStack(task: Task): void
	popClineFromStack(): void

	// Parallel task management (new)
	getParallelTasks(): Task[]
	canLaunchParallelTask(max?: number): boolean
	initTaskForParallelExecution(prompt: string, parent?: Task, options?: ParallelTaskOptions): Promise<Task>
	addClineToSet(task: Task): void
	removeClineFromSet(task: Task): void
}
```

### File Lock Manager

```typescript
// File locking is integrated into ClineProvider
class ClineProvider {
	requestFileWriteAccess(taskId: string, filePath: string): Promise<boolean>
	requestFileWriteAccessBatch(
		taskId: string,
		filePaths: string[],
	): Promise<{
		granted: boolean
		conflicts: string[]
	}>
	releaseResources(taskId: string): void
}
```

## Conclusion

The Zentara Multiagent System provides a powerful platform for automating complex development workflows. By understanding the core concepts, following best practices, and leveraging the monitoring tools, you can dramatically improve your development efficiency.

### Key Takeaways

1. **Backward Compatible**: Existing code continues to work unchanged
2. **Think in parallel**: Design tasks that can run independently
3. **Be specific**: Clear, bounded tasks produce better results
4. **Monitor resources**: Track both sequential and parallel execution
5. **Security first**: File locks and permissions prevent conflicts

### Next Steps

- Start with simple parallel tasks to understand the behavior
- Gradually migrate suitable sequential tasks to parallel execution
- Build task templates for common operations
- Monitor performance differences between execution modes
- Share successful patterns with the community

### FOR FURTURE DEVELOPMENT: Master agent can write a small TypeScript script and within the script can call the Subagent . This allow to precise calling

#### Smart SubAgent Distribution

```typescript
// Distribute work based on file count
const files = await glob("**/*.ts")
const chunkSize = Math.ceil(files.length / 10) // Max 10 agents

const chunks = []
for (let i = 0; i < files.length; i += chunkSize) {
	chunks.push(files.slice(i, i + chunkSize))
}

const agents = chunks.map((chunk, index) =>
	SubAgent({
		description: `Process chunk ${index}`,
		prompt: `Analyze files: ${chunk.join(", ")}`,
	}),
)
```

### 3. Error Handling

```typescript
try {
	const results = await Promise.allSettled([
		SubAgent({ description: "SubAgent 1", prompt: "..." }),
		SubAgent({ description: "SubAgent 2", prompt: "..." }),
		SubAgent({ description: "SubAgent 3", prompt: "..." }),
	])

	const successful = results.filter((r) => r.status === "fulfilled").map((r) => r.value)

	const failed = results.filter((r) => r.status === "rejected").map((r) => ({ reason: r.reason }))

	if (failed.length > 0) {
		console.log(`${failed.length} SubAgents failed, retrying...`)
		// Implement retry logic
	}
} catch (error) {
	console.error("Critical failure:", error)
}
```
