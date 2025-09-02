import { z } from "zod"

import { ZentaraCodeEventName } from "./events.js"
import type { ZentaraCodeSettings } from "./global-settings.js"
import type { ClineMessage, TokenUsage } from "./message.js"
import type { ToolUsage, ToolName } from "./tool.js"
import type { StaticAppProperties, GitProperties, TelemetryProperties } from "./telemetry.js"
import type { TodoItem } from "./todo.js"

/**
 * TaskProviderLike
 */

export interface TaskProviderLike {
	// Tasks
	getCurrentTask(): TaskLike | undefined
	createTask(
		text?: string,
		images?: string[],
		parentTask?: TaskLike,
		options?: CreateTaskOptions,
		is_parallel?: boolean,
		configuration?: ZentaraCodeSettings,
	): Promise<TaskLike>
	cancelTask(): Promise<void>

	// Modes
	getModes(): Promise<{ slug: string; name: string }[]>
	getMode(): Promise<string>
	setMode(mode: string): Promise<void>

	// Provider Profiles
	getProviderProfiles(): Promise<{ name: string; provider?: string }[]>
	getProviderProfile(): Promise<string>
	setProviderProfile(providerProfile: string): Promise<void>

	// Telemetry
	readonly appProperties: StaticAppProperties
	readonly gitProperties: GitProperties | undefined
	getTelemetryProperties(): Promise<TelemetryProperties>
	readonly cwd: string

	// Event Emitter
	on<K extends keyof TaskProviderEvents>(
		event: K,
		listener: (...args: TaskProviderEvents[K]) => void | Promise<void>,
	): this

	off<K extends keyof TaskProviderEvents>(
		event: K,
		listener: (...args: TaskProviderEvents[K]) => void | Promise<void>,
	): this

	// @TODO: Find a better way to do this.
	postStateToWebview(): Promise<void>
}

export type TaskProviderEvents = {
	[ZentaraCodeEventName.TaskCreated]: [task: TaskLike]

	// Proxied from the Task EventEmitter.
	[ZentaraCodeEventName.TaskStarted]: [taskId: string]
	[ZentaraCodeEventName.TaskCompleted]: [taskId: string, tokenUsage: TokenUsage, toolUsage: ToolUsage]
	[ZentaraCodeEventName.TaskAborted]: [taskId: string]
	[ZentaraCodeEventName.TaskFocused]: [taskId: string]
	[ZentaraCodeEventName.TaskUnfocused]: [taskId: string]
	[ZentaraCodeEventName.TaskActive]: [taskId: string]
	[ZentaraCodeEventName.TaskInteractive]: [taskId: string]
	[ZentaraCodeEventName.TaskResumable]: [taskId: string]
	[ZentaraCodeEventName.TaskIdle]: [taskId: string]
	[ZentaraCodeEventName.TaskSpawned]: [taskId: string]
	[ZentaraCodeEventName.ModeChanged]: [mode: string]
	[ZentaraCodeEventName.ProviderProfileChanged]: [config: { name: string; provider?: string }]
}

/**
 * TaskLike
 */

export interface CreateTaskOptions {
	enableDiff?: boolean
	enableCheckpoints?: boolean
	fuzzyMatchThreshold?: number
	consecutiveMistakeLimit?: number
	experiments?: Record<string, boolean>
	initialTodos?: TodoItem[]
}

export enum TaskStatus {
	Running = "running",
	Interactive = "interactive",
	Resumable = "resumable",
	Idle = "idle",
	None = "none",
}

export const taskMetadataSchema = z.object({
	task: z.string().optional(),
	images: z.array(z.string()).optional(),
})

export type TaskMetadata = z.infer<typeof taskMetadataSchema>

export interface TaskLike {
	readonly taskId: string
	readonly taskStatus: TaskStatus
	readonly taskAsk: ClineMessage | undefined
	readonly metadata: TaskMetadata

	readonly rootTask?: TaskLike

	on<K extends keyof TaskEvents>(event: K, listener: (...args: TaskEvents[K]) => void | Promise<void>): this
	off<K extends keyof TaskEvents>(event: K, listener: (...args: TaskEvents[K]) => void | Promise<void>): this

	approveAsk(options?: { text?: string; images?: string[] }): void
	denyAsk(options?: { text?: string; images?: string[] }): void
	submitUserMessage(text: string, images?: string[], mode?: string, providerProfile?: string): Promise<void>
	abortTask(): void
}

export type TaskEvents = {
	// Task Lifecycle
	[ZentaraCodeEventName.TaskStarted]: []
	[ZentaraCodeEventName.TaskCompleted]: [taskId: string, tokenUsage: TokenUsage, toolUsage: ToolUsage]
	[ZentaraCodeEventName.TaskAborted]: []
	[ZentaraCodeEventName.TaskFocused]: []
	[ZentaraCodeEventName.TaskUnfocused]: []
	[ZentaraCodeEventName.TaskActive]: [taskId: string]
	[ZentaraCodeEventName.TaskInteractive]: [taskId: string]
	[ZentaraCodeEventName.TaskResumable]: [taskId: string]
	[ZentaraCodeEventName.TaskIdle]: [taskId: string]

	// Subtask Lifecycle
	[ZentaraCodeEventName.TaskPaused]: []
	[ZentaraCodeEventName.TaskUnpaused]: []
	[ZentaraCodeEventName.TaskSpawned]: [taskId: string]

	// Task Execution
	[ZentaraCodeEventName.Message]: [{ action: "created" | "updated"; message: ClineMessage }]
	[ZentaraCodeEventName.TaskModeSwitched]: [taskId: string, mode: string]
	[ZentaraCodeEventName.TaskAskResponded]: []

	// Task Analytics
	[ZentaraCodeEventName.TaskToolFailed]: [taskId: string, tool: ToolName, error: string]
	[ZentaraCodeEventName.TaskTokenUsageUpdated]: [taskId: string, tokenUsage: TokenUsage]
	
	// Task Disposal (special case - uses string literal)
	disposed: []
}
