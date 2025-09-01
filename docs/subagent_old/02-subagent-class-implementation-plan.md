# Modified Task Class Implementation Plan

## Overview

Instead of creating a new SubAgent class, we will enhance the existing Task class with parallel execution capabilities and autonomous behavior options. This approach maintains backward compatibility while enabling multi-agent functionality through configuration rather than inheritance.

## Architecture Design

### Enhanced Task Class

```typescript
// Enhanced Task class with parallel execution support
class Task {
	// Existing Task implementation

	// New properties for parallel execution
	executionMode: "sequential" | "parallel"
	autonomousMode: boolean
	parentTaskId?: string
	resourceLimits?: ResourceLimits
	securityConfig?: SecurityConfig
}
```

### Key Enhancements to Task

1. **Execution Mode Toggle**: Support both sequential (existing) and parallel (new) execution
2. **Autonomous Mode**: Optional flag to bypass user interactions
3. **Resource Management**: Built-in resource limits when in parallel mode
4. **Security Configuration**: Configurable security policies per task
5. **Parent-Child Relationships**: Track task hierarchy for coordination

## Implementation Details

### 1. Task Class Modifications

Location: `/src/core/task/Task.ts` (existing file)

```typescript
// Additional imports for Task.ts
import { ResourceMonitor } from "../monitoring/ResourceMonitor"
import { SecurityManager } from "../security/SecurityManager"
import { TaskConfig, TaskExecutionMode, TaskResult } from "./types"

// Modified Task class constructor and properties
export class Task extends EventEmitter {
	// New properties for parallel execution support
	private executionMode: TaskExecutionMode = "sequential"
	private autonomousMode: boolean = false
	private parentTaskId?: string
	private resourceMonitor?: ResourceMonitor
	private securityManager?: SecurityManager
	private parallelExecutionConfig?: {
		maxExecutionTime: number
		resourceLimits: ResourceLimits
		securityConfig: SecurityConfig
	}

	// Modified constructor to support both modes
	constructor(
		conversationHistory: ClineMessage[],
		provider: ApiProvider,
		apiConfiguration: ApiConfiguration,
		writePermissions: boolean,
		alwaysAllowReadOnly: boolean,
		customInstructions?: string,
		alwaysAllowWriteOnly?: boolean,
		useO1Models?: boolean,
		skipWriteAnimation?: boolean,
		mode?: Mode,
		experimentalMode?: boolean,
		// New optional parameters for parallel execution
		options?: {
			executionMode?: TaskExecutionMode
			autonomousMode?: boolean
			parentTaskId?: string
			parallelConfig?: ParallelExecutionConfig
		},
	) {
		// Call existing constructor
		super(
			conversationHistory,
			provider,
			apiConfiguration,
			writePermissions,
			alwaysAllowReadOnly,
			customInstructions,
			alwaysAllowWriteOnly,
			useO1Models,
			skipWriteAnimation,
			mode,
			experimentalMode,
		)

		// Initialize new properties if options provided
		if (options) {
			this.executionMode = options.executionMode || "sequential"
			this.autonomousMode = options.autonomousMode || false
			this.parentTaskId = options.parentTaskId

			if (options.parallelConfig) {
				this.parallelExecutionConfig = options.parallelConfig
				this.resourceMonitor = new ResourceMonitor(this.taskId, options.parallelConfig.resourceLimits)
				this.securityManager = new SecurityManager(options.parallelConfig.securityConfig)
			}
		}
	}

	// New method for parallel execution
	async executeParallel(): Promise<TaskResult> {
		if (this.executionMode !== "parallel") {
			throw new Error("Task not configured for parallel execution")
		}
		try {
			this.state = SubAgentState.RUNNING
			this.resourceMonitor.startMonitoring()

			// Set execution timeout
			const timeoutId = setTimeout(() => {
				this.handleTimeout()
			}, this.config.maxExecutionTime)

			// Run autonomous execution loop
			const result = await this.runAutonomousLoop()

			clearTimeout(timeoutId)
			this.state = SubAgentState.COMPLETED

			return this.formatResult(result)
		} catch (error) {
			this.state = SubAgentState.FAILED
			return this.formatError(error)
		} finally {
			this.resourceMonitor.stopMonitoring()
		}
	}

	private async runAutonomousLoop(): Promise<any> {
		while (this.state === SubAgentState.RUNNING) {
			// Check resource limits
			if (!this.checkResourceLimits()) {
				throw new Error("Resource limits exceeded")
			}

			// Get next action from LLM
			const response = await this.getAssistantResponse()

			// Process response automatically
			if (response.toolUse) {
				await this.processToolUse(response.toolUse)
			} else if (response.completion) {
				return response.completion
			}

			// Update metrics
			this.updateMetrics()
		}
	}

	// Modified user interaction methods to support autonomous mode
	protected async askFollowupQuestion(question: string): Promise<string> {
		if (!this.autonomousMode) {
			// Normal mode - ask user
			return super.askFollowupQuestion(question)
		}

		// Autonomous mode - use LLM to answer its own question
		const response = await this.provider.createMessage({
			messages: [
				...this.conversationHistory,
				{
					role: "assistant",
					content: question,
				},
				{
					role: "user",
					content: "Please proceed with your best judgment. No human is available to answer.",
				},
			],
			modelId: this.apiConfiguration.modelId,
		})

		return response.content
	}

	protected async requestUserApproval(message: string): Promise<boolean> {
		if (!this.autonomousMode) {
			// Normal mode - ask user
			return super.requestUserApproval(message)
		}

		// Autonomous mode - always approve
		return true
	}

	protected async processToolUse(toolUse: ToolUse): Promise<void> {
		// Validate tool use against security policy
		const validation = this.securityManager.validateToolUse(toolUse)
		if (!validation.allowed) {
			throw new SecurityError(validation.reason)
		}

		// Track tool usage
		this.toolCallCount++

		// Execute tool with monitoring
		const result = await this.resourceMonitor.executeWithMonitoring(async () => {
			return await super.executeToolUse(toolUse)
		})

		// Update conversation with result
		this.conversationHistory.push({
			role: "tool",
			content: result,
		})
	}

	private checkResourceLimits(): boolean {
		const usage = this.resourceMonitor.getCurrentUsage()

		if (usage.memory > this.config.resourceLimits.maxMemory) {
			return false
		}

		if (this.toolCallCount >= this.config.resourceLimits.maxToolCalls) {
			return false
		}

		if (this.fileOperationCount >= this.config.resourceLimits.maxFileOperations) {
			return false
		}

		return true
	}

	private handleTimeout(): void {
		this.state = SubAgentState.TIMEOUT
		this.abort("Execution timeout exceeded")
	}

	private formatResult(completion: any): SubAgentResult {
		return {
			success: true,
			taskId: this.subAgentId,
			description: this.config.description,
			result: completion,
			executionTime: Date.now() - this.startTime,
			toolsUsed: this.getUsedTools(),
			filesAccessed: this.getAccessedFiles(),
			filesModified: this.getModifiedFiles(),
			resourceUsage: this.resourceMonitor.getSummary(),
			securityStatus: this.securityManager.getStatus(),
		}
	}

	private formatError(error: any): SubAgentResult {
		return {
			success: false,
			taskId: this.subAgentId,
			description: this.config.description,
			error: error.message,
			executionTime: Date.now() - this.startTime,
			toolsUsed: this.getUsedTools(),
			filesAccessed: this.getAccessedFiles(),
			filesModified: this.getModifiedFiles(),
			resourceUsage: this.resourceMonitor.getSummary(),
			securityStatus: this.securityManager.getStatus(),
		}
	}
}
```

### 2. Execution Mode Configuration

```typescript
export type TaskExecutionMode = "sequential" | "parallel"

export interface ParallelExecutionConfig {
	maxExecutionTime: number
	resourceLimits: ResourceLimits
	securityConfig: SecurityConfig
	priority?: "low" | "normal" | "high"
}

// Enhanced state management for parallel tasks
export enum TaskState {
	PENDING = "pending",
	RUNNING = "running",
	COMPLETED = "completed",
	FAILED = "failed",
	TIMEOUT = "timeout",
	RESOURCE_LIMIT = "resource_limit",
	SECURITY_VIOLATION = "security_violation",
}

// Modified state machine to support both execution modes
class TaskStateMachine {
	private state: TaskState = TaskState.PENDING
	private executionMode: TaskExecutionMode
	private stateHistory: StateTransition[] = []

	transition(newState: TaskState): void {
		const validTransitions = this.getValidTransitions()

		if (!validTransitions.includes(newState)) {
			throw new Error(`Invalid state transition from ${this.state} to ${newState}`)
		}

		this.stateHistory.push({
			from: this.state,
			to: newState,
			timestamp: Date.now(),
		})

		this.state = newState
	}

	private getValidTransitions(): TaskState[] {
		// Different transitions based on execution mode
		if (this.executionMode === "parallel") {
			switch (this.state) {
				case TaskState.PENDING:
					return [TaskState.RUNNING, TaskState.FAILED]
				case TaskState.RUNNING:
					return [
						TaskState.COMPLETED,
						TaskState.FAILED,
						TaskState.TIMEOUT,
						TaskState.RESOURCE_LIMIT,
						TaskState.SECURITY_VIOLATION,
					]
				default:
					return [] // Terminal states
			}
		} else {
			// Sequential mode - existing state transitions
			return this.getSequentialTransitions()
		}
	}
}
```

### 3. Resource Monitoring Integration

Instead of creating a separate ResourceMonitor class, we'll integrate monitoring into the Task class when running in parallel mode:

```typescript
// Enhanced Task class methods for resource monitoring
export class Task {
	private taskId: string
	private limits: ResourceLimits
	private usage: ResourceUsage
	private snapshots: ResourceSnapshot[] = []
	private monitoringInterval?: NodeJS.Timer

	constructor(taskId: string, limits: ResourceLimits) {
		this.taskId = taskId
		this.limits = limits
		this.usage = {
			memory: 0,
			cpu: 0,
			fileOperations: 0,
			toolCalls: 0,
			startTime: Date.now(),
		}
	}

	startMonitoring(): void {
		this.monitoringInterval = setInterval(() => {
			this.takeSnapshot()
		}, 1000) // Every second
	}

	stopMonitoring(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval)
		}
	}

	async executeWithMonitoring<T>(fn: () => Promise<T>): Promise<T> {
		const startMemory = process.memoryUsage()
		const startCpu = process.cpuUsage()

		try {
			const result = await fn()

			const endMemory = process.memoryUsage()
			const endCpu = process.cpuUsage()

			this.updateUsage({
				memory: endMemory.heapUsed - startMemory.heapUsed,
				cpu: this.calculateCpuUsage(startCpu, endCpu),
			})

			return result
		} catch (error) {
			throw error
		}
	}

	private takeSnapshot(): void {
		const snapshot: ResourceSnapshot = {
			timestamp: Date.now(),
			memory: process.memoryUsage().heapUsed,
			cpu: this.getCurrentCpuUsage(),
			fileOperations: this.usage.fileOperations,
			toolCalls: this.usage.toolCalls,
		}

		this.snapshots.push(snapshot)

		// Keep only last 300 snapshots (5 minutes)
		if (this.snapshots.length > 300) {
			this.snapshots.shift()
		}
	}

	getCurrentUsage(): ResourceUsage {
		return { ...this.usage }
	}

	getSummary(): ResourceSummary {
		return {
			peakMemory: Math.max(...this.snapshots.map((s) => s.memory)),
			averageMemory: this.snapshots.reduce((sum, s) => sum + s.memory, 0) / this.snapshots.length,
			totalFileOperations: this.usage.fileOperations,
			totalToolCalls: this.usage.toolCalls,
			executionTime: Date.now() - this.usage.startTime,
		}
	}
}
```

### 4. Security Management Integration

Security management will be conditionally applied when tasks run in parallel mode:

```typescript
// Enhanced Task class methods for security validation
export class Task {
	private config: SecurityConfig
	private violations: SecurityViolation[] = []
	private blockedOperations: string[] = []

	constructor(config: SecurityConfig) {
		this.config = config
	}

	validateToolUse(toolUse: ToolUse): ValidationResult {
		// Check if tool is allowed
		if (!this.config.allowedTools.includes(toolUse.tool)) {
			this.recordViolation("TOOL_NOT_ALLOWED", toolUse)
			return { allowed: false, reason: `Tool ${toolUse.tool} not allowed` }
		}

		// Validate file operations
		if (this.isFileOperation(toolUse)) {
			const fileValidation = this.validateFileOperation(toolUse)
			if (!fileValidation.allowed) {
				return fileValidation
			}
		}

		// Check for dangerous patterns
		const dangerousPattern = this.checkDangerousPatterns(toolUse)
		if (dangerousPattern) {
			this.recordViolation("DANGEROUS_PATTERN", toolUse)
			return { allowed: false, reason: dangerousPattern }
		}

		return { allowed: true }
	}

	private validateFileOperation(toolUse: ToolUse): ValidationResult {
		const filePath = this.extractFilePath(toolUse)

		// Check against allowed paths
		if (this.config.allowedWritePaths.length > 0) {
			const isAllowed = this.config.allowedWritePaths.some((pattern) => minimatch(filePath, pattern))

			if (!isAllowed) {
				this.recordViolation("PATH_NOT_ALLOWED", toolUse)
				return {
					allowed: false,
					reason: `Path ${filePath} not in allowed write paths`,
				}
			}
		}

		// Check against restricted paths
		const restrictedPaths = ["**/.env*", "**/secrets/**", "**/credentials/**", "**/.git/**", "**/node_modules/**"]

		const isRestricted = restrictedPaths.some((pattern) => minimatch(filePath, pattern))

		if (isRestricted) {
			this.recordViolation("RESTRICTED_PATH", toolUse)
			return {
				allowed: false,
				reason: `Path ${filePath} is restricted`,
			}
		}

		return { allowed: true }
	}

	private checkDangerousPatterns(toolUse: ToolUse): string | null {
		const dangerousPatterns = [
			{ pattern: /eval\s*\(/, reason: "eval() usage detected" },
			{ pattern: /exec\s*\(/, reason: "exec() usage detected" },
			{ pattern: /require\s*\(\s*['"`]child_process/, reason: "child_process usage detected" },
			{ pattern: /process\.env/, reason: "Environment variable access detected" },
		]

		const content = JSON.stringify(toolUse)

		for (const { pattern, reason } of dangerousPatterns) {
			if (pattern.test(content)) {
				return reason
			}
		}

		return null
	}

	private recordViolation(type: string, toolUse: ToolUse): void {
		this.violations.push({
			type,
			timestamp: Date.now(),
			tool: toolUse.tool,
			details: toolUse,
		})
	}

	getStatus(): SecurityStatus {
		return {
			violations: this.violations.length,
			blockedOperations: [...this.blockedOperations],
		}
	}
}
```

### 5. Context Management for Parallel Tasks

```typescript
// Helper methods in Task class for context management
export class Task {
	private createMinimalContext(prompt: string, systemPrompt?: string): ClineMessage[] {
		const messages: ClineMessage[] = []

		// Add minimal system prompt
		if (systemPrompt) {
			messages.push({
				role: "system",
				content: systemPrompt,
			})
		} else {
			messages.push({
				role: "system",
				content: this.getDefaultSystemPrompt(),
			})
		}

		// Add user prompt
		messages.push({
			role: "user",
			content: prompt,
		})

		return messages
	}

	static getDefaultSystemPrompt(): string {
		return `You are an autonomous AI agent executing a specific task. 
You have access to various tools to complete your objective.
Work independently without user interaction.
When you have completed the task, use the attempt_completion tool.
Be efficient and focused on the specific task given.`
	}

	static sanitizeContext(messages: Message[]): Message[] {
		// Remove any sensitive information from previous context
		return messages.map((msg) => ({
			...msg,
			content: this.sanitizeContent(msg.content),
		}))
	}

	private static sanitizeContent(content: string): string {
		// Remove API keys, tokens, etc.
		const patterns = [
			/api[_-]?key["\s:=]+["']?[a-zA-Z0-9-_]+["']?/gi,
			/token["\s:=]+["']?[a-zA-Z0-9-_]+["']?/gi,
			/password["\s:=]+["']?[^"'\s]+["']?/gi,
		]

		let sanitized = content
		for (const pattern of patterns) {
			sanitized = sanitized.replace(pattern, "[REDACTED]")
		}

		return sanitized
	}
}
```

### 6. Tool Behavior Modifications

```typescript
// Modified tool execution in Task class for autonomous mode
export class Task {
	// Modified attempt_completion handling
	protected async handleAttemptCompletion(params: any): Promise<void> {
		if (this.autonomousMode) {
			// Auto-approve completion
			this.isCompleted = true
			await this.say("task_completed", params.result || "Task completed successfully")
		} else {
			// Normal mode - request user approval
			await super.handleAttemptCompletion(params)
		}
	}

	async executeAskFollowupQuestion(params: any): Promise<ToolResult> {
		// Generate autonomous response
		return {
			status: "success",
			result: "Proceeding with available information",
		}
	}

	async executeRequestUserApproval(params: any): Promise<ToolResult> {
		// Auto-approve all requests
		return {
			status: "approved",
			result: true,
		}
	}

	// Override file operations to enforce security
	async executeWriteToFile(params: any): Promise<ToolResult> {
		const validation = this.securityManager.validateFileWrite(params.filePath)
		if (!validation.allowed) {
			throw new SecurityError(validation.reason)
		}

		return super.executeWriteToFile(params)
	}
}
```

## Testing Strategy

### Unit Tests

1. Execution mode switching (sequential vs parallel)
2. Autonomous mode behavior
3. Resource monitoring when enabled
4. Security validation when enabled
5. Backward compatibility with existing Task usage

### Integration Tests

1. Parallel task execution flow
2. Resource limit enforcement in parallel mode
3. Mixed mode execution (some sequential, some parallel)
4. Parent-child task relationships
5. Result aggregation from parallel tasks

### Backward Compatibility Tests

1. Existing Task usage unchanged
2. Default behavior remains sequential
3. No breaking changes to public API
4. Performance impact minimal when not using parallel features

## Performance Considerations

1. **Conditional Feature Loading**: Only initialize resource monitoring and security when in parallel mode
2. **Memory Efficiency**: Minimal overhead for sequential tasks
3. **Context Optimization**: Use minimal context for autonomous parallel tasks
4. **Resource Pooling**: Share resources efficiently across parallel tasks
5. **Lazy Initialization**: Initialize parallel features only when needed

## Implementation Phases

1. **Phase 1**: Add execution mode and autonomous mode flags to Task
2. **Phase 2**: Implement conditional behavior based on modes
3. **Phase 3**: Add resource monitoring and security for parallel mode
4. **Phase 4**: Update ClineProvider to support parallel task management
5. **Phase 5**: Full integration testing and optimization

## Benefits of This Approach

1. **Backward Compatibility**: All existing Task usage continues to work unchanged
2. **Incremental Adoption**: Teams can gradually enable parallel features
3. **Unified Codebase**: No code duplication between Task and SubAgent
4. **Flexible Configuration**: Tasks can be configured for different execution modes
5. **Simplified Maintenance**: Single class to maintain instead of two

## Configuration Examples

```typescript
// Traditional sequential task (default)
const sequentialTask = new Task(messages, provider, config);

// Parallel autonomous task (subagent behavior)
const parallelTask = new Task(minimalMessages, provider, config,
  writePermissions, alwaysAllowReadOnly, customInstructions,
  alwaysAllowWriteOnly, useO1Models, skipWriteAnimation,
  mode, experimentalMode,
  {
    executionMode: 'parallel',
    autonomousMode: true,
    parentTaskId: parentTask.taskId,
    parallelConfig: {
      maxExecutionTime: 300000,
      resourceLimits: { maxMemory: 512 * 1024 * 1024 },
      securityConfig: { allowedTools: [...] }
    }
  }
);
```
