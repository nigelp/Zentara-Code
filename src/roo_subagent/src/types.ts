export enum SubAgentState {
	PENDING = "pending",
	RUNNING = "running",
	COMPLETED = "completed",
	FAILED = "failed",
	TIMEOUT = "timeout",
	RESOURCE_LIMIT = "resource_limit",
	SECURITY_VIOLATION = "security_violation",
}

export interface SubAgentConfig {
	taskId: string
	description: string
	prompt: string
	parentTaskId: string
	writePermissions: boolean
	allowedWritePaths: string[]
	maxExecutionTime: number
	priority: "low" | "normal" | "high"
	outputSchema?: any
	resourceLimits?: ResourceLimits
	security?: SecurityConfig
	customInstructions?: string
	skipWriteAnimation?: boolean
}

export interface SubAgentResult {
	success: boolean
	taskId: string
	description: string
	result?: any
	error?: string
	executionTime: number
	toolsUsed: { tool: string; count: number }[]
	filesAccessed: string[]
	filesModified: string[]
	resourceUsage: ResourceSummary
	securityStatus: SecurityStatus
}

export interface ResourceLimits {
	maxMemory: number // in bytes
	maxCpu: number // 0.0 - 1.0
	maxToolCalls: number
	maxFileOperations: number
}

export interface ResourceUsage {
	memory: number // current memory usage in bytes
	cpu: number // current CPU usage (0.0 - 1.0)
	fileOperations: number
	toolCalls: number
	startTime: number
}

export interface ResourceSnapshot {
	timestamp: number
	memory: number
	cpu: number
	fileOperations: number
	toolCalls: number
}

export interface ResourceSummary {
	peakMemory: number
	averageMemory: number
	totalFileOperations: number
	totalToolCalls: number
	executionTime: number
}

export interface SecurityConfig {
	allowedTools: string[]
	allowedWritePaths: string[]
	dangerousPatterns: { pattern: string; reason: string }[]
}

export interface SecurityViolation {
	type: string
	timestamp: number
	tool: string
	details: any
}

export interface SecurityStatus {
	violations: number
	blockedOperations: string[]
}

export interface ValidationResult {
	allowed: boolean
	reason?: string
}

export interface StateTransition {
	from: SubAgentState
	to: SubAgentState
	timestamp: number
}
