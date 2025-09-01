# SubAgent Tool Documentation

## 1. Overview

The SubAgent tool enables parallel execution of autonomous AI tasks without user intervention. This documentation provides comprehensive guidance for using the enhanced Task system within Zentara Code, which now supports both traditional sequential execution and new parallel autonomous execution modes.

## 2. Architecture

### 2.1. Core Components

The SubAgent system leverages enhanced versions of existing components:

1. **SubAgent Tool** (`/src/core/tools/subagentTool.ts`)

    - Primary interface for spawning parallel tasks
    - Handles parameter validation and approval flow
    - Uses JSON-style parameters for consistency

2. **Enhanced Task Class** (`/src/core/task/Task.ts`)

    - Supports both sequential and parallel execution modes
    - Implements autonomous behavior when configured
    - Manages resource constraints and security policies
    - Maintains backward compatibility with existing usage

3. **Enhanced ClineProvider** (`/src/core/webview/ClineProvider.ts`)
    - Manages both sequential (stack) and parallel (set) task execution
    - Handles resource allocation and file locking
    - Provides monitoring and result aggregation
    - No breaking changes to existing functionality

### 2.2. Key Design Principles

- **Backward Compatibility**: All existing Task usage continues to work unchanged
- **Configuration-Based**: Parallel and autonomous behaviors are opt-in via configuration
- **Unified Architecture**: Single Task class handles both execution modes
- **Resource Management**: Conditional resource limits based on execution mode
- **Security First**: Enhanced security only when running in parallel mode
- **No User Interaction**: Autonomous mode bypasses user approvals when enabled

## 3. Tool Usage

### 3.1. Tool Definition

```typescript
interface SubAgentToolParams {
	description: string // 3-5 word task summary (required)
	prompt: string // Detailed task instructions (required)
	writePermissions?: boolean // Allow file modifications (default: false)
	allowedWritePaths?: string[] // Glob patterns for allowed write paths
	maxExecutionTime?: number // Max execution time in ms (default: 300000)
	priority?: "low" | "normal" | "high" // Task priority (default: 'normal')
	outputSchema?: any // Expected output format for validation
}
```

### 3.2. Usage Examples

#### Basic Read-Only Task (XML-style)

```xml
<subagent>
<description>Analyze authentication</description>
<prompt>
Search the codebase for all authentication-related code.
Focus on:
- Login/logout functionality
- Session management
- Token validation
- Password handling
Return a structured summary of findings.
</prompt>
</subagent>
```

#### Complex Task with Write Permissions (JSON-style)

```xml
<subagent>
{
  "description": "Refactor imports",
  "prompt": "Update all import statements from '@old/package' to '@new/package' in TypeScript files",
  "writePermissions": true,
  "allowedWritePaths": ["src/**/*.ts", "src/**/*.tsx"],
  "priority": "high",
  "maxExecutionTime": 180000
}
</subagent>
```

#### Parallel Analysis Tasks

```xml
<subagent>
{"description": "Frontend analysis", "prompt": "Analyze React components for performance issues"}
</subagent>

<subagent>
{"description": "Backend analysis", "prompt": "Review API endpoints for security vulnerabilities"}
</subagent>

<subagent>
{"description": "Test coverage", "prompt": "Generate test coverage report and identify gaps"}
</subagent>
```

## 4. Implementation Details

### 4.1. Integration Steps

Following the guide in `integrating_new_tool.md`, implement the SubAgent tool:

1. **Create Tool Logic** (`/src/core/tools/subagentTool.ts`)

    - Implement the main tool function with proper parameter handling
    - Support both XML and JSON parameter styles
    - Include validation and error handling

2. **Create Tool Description** (`/src/core/prompts/tools/subagent.ts`)

    - Provide clear usage instructions for the LLM
    - Include examples for both parameter styles
    - Document all parameters and constraints

3. **Register Tool**
    - Add "subagent" to `toolNames` in `/src/schemas/index.ts`
    - Map description in `/src/core/prompts/tools/index.ts`
    - Add invocation case in `/src/core/assistant-message/presentAssistantMessage.ts`

### 4.2. Enhanced Task Class Implementation

The Task class now supports parallel execution through configuration:

```typescript
class Task extends EventEmitter {
	// Modified user interaction methods
	protected async askFollowupQuestion(question: string): Promise<string> {
		if (!this.autonomousMode) {
			return super.askFollowupQuestion(question) // Normal mode
		}
		// Autonomous mode - auto-respond
		return "Proceeding with available information"
	}

	protected async requestUserApproval(message: string): Promise<boolean> {
		if (!this.autonomousMode) {
			return super.requestUserApproval(message) // Normal mode
		}
		// Autonomous mode - always approve
		return true
	}

	// Parallel execution method
	async executeParallel(): Promise<any> {
		if (this.executionMode !== "parallel") {
			throw new Error("Task not configured for parallel execution")
		}

		while (this.state === TaskState.RUNNING) {
			if (!this.checkResourceLimits()) {
				throw new Error("Resource limits exceeded")
			}

			const response = await this.getAssistantResponse()

			if (response.toolUse) {
				await this.processToolUse(response.toolUse)
			} else if (response.completion) {
				return response.completion
			}
		}
	}
}
```

### 4.3. Enhanced ClineProvider Implementation

The ClineProvider now manages both sequential and parallel tasks:

```typescript
class ClineProvider extends EventEmitter {
	// Existing stack for sequential tasks
	private clineStack: Task[] = []

	// New set for parallel tasks
	private clineSet: Set<Task> = new Set()

	// Resource and lock management
	private parallelResourceTracker: Map<string, ResourceUsage> = new Map()
	private fileLocks: Map<string, string> = new Map()

	async initTaskForParallelExecution(
		prompt: string,
		parentTask?: Task,
		options?: ParallelTaskOptions,
	): Promise<Task> {
		// Create task with parallel configuration
		const task = await this.createTask(prompt, {
			executionMode: "parallel",
			autonomousMode: true,
			parentTaskId: parentTask?.taskId,
			...options,
		})

		await this.addClineToSet(task)
		return task
	}
}
```

## 5. Resource Management

### 5.1. Resource Limits

```typescript
interface ResourceLimits {
  maxConcurrentTasks: 10;           // Maximum parallel tasks
  maxMemoryPerTask: 512 * 1024 * 1024; // 512MB per task
  maxFileOperationsPerTask: 1000;   // File operation limit
  maxToolCallsPerTask: 100;         // Tool call limit
  maxTotalMemory: 2 * 1024 * 1024 * 1024; // 2GB total
  defaultExecutionTimeout: 300000;  // 5 minutes
}
```

### 5.2. File Lock Management

The system prevents concurrent file modifications:

```typescript
// Request locks before write operations
const provider = task.provider as ClineProvider
const lockResult = await provider.requestFileWriteAccessBatch(taskId, ["src/auth/**/*.ts", "src/api/**/*.ts"])

if (!lockResult.granted) {
	throw new Error(`File conflicts: ${lockResult.conflicts.join(", ")}`)
}
```

## 6. Security Considerations

### 6.1. Permission Model

- **Read-Only by Default**: Agents cannot modify files without explicit permission
- **Path Restrictions**: Write operations limited to specified glob patterns
- **Sensitive Path Protection**: Automatic blocking of `.env`, `.git`, `node_modules`
- **Operation Validation**: All tool uses validated against security policies

### 6.2. Security Configuration

```typescript
interface SecurityConfig {
	allowedTools: string[]
	restrictedPaths: string[]
	dangerousPatterns: RegExp[]
	maxExecutionTime: number
}
```

## 7. Monitoring and Observability

### 7.1. Task States (Enhanced)

```typescript
enum TaskState {
	PENDING = "pending",
	RUNNING = "running",
	COMPLETED = "completed",
	FAILED = "failed",
	TIMEOUT = "timeout",
	RESOURCE_LIMIT = "resource_limit",
	SECURITY_VIOLATION = "security_violation",
}
```

### 7.2. Metrics and Monitoring

- **Real-time Dashboard**: Visual monitoring of task status across both modes
- **Resource Usage Tracking**: Conditional tracking for parallel tasks
- **Performance Metrics**: Separate metrics for sequential vs parallel execution
- **Audit Logging**: Enhanced logging for autonomous operations
- **Backward Compatible**: Existing monitoring continues to work

## 8. Best Practices

### 8.1. Task Design

✅ **DO:**

- Keep tasks focused and specific
- Provide clear success criteria in prompts
- Specify exact output format
- Set appropriate resource limits
- Use descriptive task descriptions

❌ **DON'T:**

- Create vague, open-ended tasks
- Combine unrelated operations
- Ignore resource constraints
- Grant unnecessary write permissions

### 8.2. Prompt Engineering

#### Effective Prompt Example

```typescript
{
  "description": "Audit API endpoints",
  "prompt": `
    Analyze all REST API endpoints in src/api/**/*.ts

    For each endpoint, identify:
    1. HTTP method and path
    2. Input validation status
    3. Authentication requirements
    4. Error handling completeness

    Output as JSON with this structure:
    {
      "endpoints": [...],
      "summary": {
        "total": number,
        "issues": [...]
      }
    }
  `
}
```

### 8.3. Error Handling

```typescript
try {
	const results = await Promise.allSettled([subagent1, subagent2, subagent3])

	const successful = results.filter((r) => r.status === "fulfilled").map((r) => r.value)

	const failed = results.filter((r) => r.status === "rejected").map((r) => r.reason)

	// Handle partial failures
} catch (error) {
	// Handle critical failures
}
```

## 9. Testing Strategy

### 9.1. Unit Tests

- Parameter validation
- Resource allocation logic
- Security policy enforcement
- State transitions

### 9.2. Integration Tests

- Multi-agent execution
- File lock coordination
- Resource contention handling
- Result aggregation

### 9.3. End-to-End Tests

- Complex workflow scenarios
- Performance under load
- Failure recovery
- Security compliance

## 10. Future Enhancements

### 10.1. Planned Features

- **Batch Operations**: Launch multiple similar tasks efficiently
- **Task Templates**: Reusable configurations for common patterns
- **Smart Scheduling**: Priority-based execution optimization
- **Enhanced Monitoring**: Deeper insights into parallel execution
- **Result Caching**: Cache results from identical tasks

### 10.2. Benefits of Current Architecture

- **No Breaking Changes**: Existing code continues to work
- **Incremental Adoption**: Enable features as needed
- **Unified Codebase**: Single implementation to maintain
- **Lower Complexity**: Reuse existing infrastructure
- **Easier Testing**: Test modes rather than new classes

## 11. Troubleshooting

### 11.1. Common Issues

**Agent Timeout**

- Break large tasks into smaller subtasks
- Optimize file search patterns
- Increase execution time limit if needed

**File Lock Conflicts**

- Assign exclusive file ranges to agents
- Use sequential execution for overlapping modifications
- Implement retry logic with backoff

**Resource Exhaustion**

- Reduce concurrent agent count
- Optimize memory usage in prompts
- Process files in chunks

### 11.2. Debug Information

Enable detailed logging:

```typescript
{
  "debug": {
    "logLevel": "verbose",
    "traceExecution": true,
    "captureMetrics": true
  }
}
```

## 12. API Reference

See the detailed API documentation in the implementation plans:

- Tool API: `01-subagent-tool-implementation-plan.md`
- SubAgent Class API: `02-subagent-class-implementation-plan.md`
- Manager API: `03-subagent-manager-implementation-plan.md`

## 13. Migration Guide

For teams currently using the Task tool:

1. **Identify Autonomous Tasks**: Find tasks that don't require user interaction
2. **Update Prompts**: Ensure prompts are fully self-contained
3. **Add Resource Limits**: Specify appropriate execution constraints
4. **Test in Isolation**: Verify tasks work without user input
5. **Gradual Rollout**: Start with read-only tasks before enabling writes
