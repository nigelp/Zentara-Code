import { z } from "zod"

import { clineMessageSchema, tokenUsageSchema } from "./message.js"
import { toolNamesSchema, toolUsageSchema } from "./tool.js"

/**
 * ZentaraCodeEventName
 */

export enum ZentaraCodeEventName {
	// Task Provider Lifecycle
	TaskCreated = "taskCreated",

	// Task Lifecycle
	TaskStarted = "taskStarted",
	TaskCompleted = "taskCompleted",
	TaskAborted = "taskAborted",
	TaskFocused = "taskFocused",
	TaskUnfocused = "taskUnfocused",
	TaskActive = "taskActive",
	TaskInteractive = "taskInteractive",
	TaskResumable = "taskResumable",
	TaskIdle = "taskIdle",

	// Subtask Lifecycle
	TaskPaused = "taskPaused",
	TaskUnpaused = "taskUnpaused",
	TaskSpawned = "taskSpawned",

	// Task Execution
	Message = "message",
	TaskModeSwitched = "taskModeSwitched",
	TaskAskResponded = "taskAskResponded",

	// Task Analytics
	TaskTokenUsageUpdated = "taskTokenUsageUpdated",
	TaskToolFailed = "taskToolFailed",

	// Configuration Changes
	ModeChanged = "modeChanged",
	ProviderProfileChanged = "providerProfileChanged",

	// Evals
	EvalPass = "evalPass",
	EvalFail = "evalFail",
}

/**
 * ZentaraCodeEvents
 */

export const zentaraCodeEventsSchema = z.object({
	[ZentaraCodeEventName.TaskCreated]: z.tuple([z.string()]),

	[ZentaraCodeEventName.TaskStarted]: z.tuple([z.string()]),
	[ZentaraCodeEventName.TaskCompleted]: z.tuple([
		z.string(),
		tokenUsageSchema,
		toolUsageSchema,
		z.object({
			isSubtask: z.boolean(),
		}),
	]),
	[ZentaraCodeEventName.TaskAborted]: z.tuple([z.string()]),
	[ZentaraCodeEventName.TaskFocused]: z.tuple([z.string()]),
	[ZentaraCodeEventName.TaskUnfocused]: z.tuple([z.string()]),
	[ZentaraCodeEventName.TaskActive]: z.tuple([z.string()]),
	[ZentaraCodeEventName.TaskInteractive]: z.tuple([z.string()]),
	[ZentaraCodeEventName.TaskResumable]: z.tuple([z.string()]),
	[ZentaraCodeEventName.TaskIdle]: z.tuple([z.string()]),

	[ZentaraCodeEventName.TaskPaused]: z.tuple([z.string()]),
	[ZentaraCodeEventName.TaskUnpaused]: z.tuple([z.string()]),
	[ZentaraCodeEventName.TaskSpawned]: z.tuple([z.string(), z.string()]),

	[ZentaraCodeEventName.Message]: z.tuple([
		z.object({
			taskId: z.string(),
			action: z.union([z.literal("created"), z.literal("updated")]),
			message: clineMessageSchema,
		}),
	]),
	[ZentaraCodeEventName.TaskModeSwitched]: z.tuple([z.string(), z.string()]),
	[ZentaraCodeEventName.TaskAskResponded]: z.tuple([z.string()]),

	[ZentaraCodeEventName.TaskToolFailed]: z.tuple([z.string(), toolNamesSchema, z.string()]),
	[ZentaraCodeEventName.TaskTokenUsageUpdated]: z.tuple([z.string(), tokenUsageSchema]),

	[ZentaraCodeEventName.ModeChanged]: z.tuple([z.string()]),
	[ZentaraCodeEventName.ProviderProfileChanged]: z.tuple([z.object({ name: z.string(), provider: z.string() })]),
})

export type ZentaraCodeEvents = z.infer<typeof zentaraCodeEventsSchema>

/**
 * TaskEvent
 */

export const taskEventSchema = z.discriminatedUnion("eventName", [
	// Task Provider Lifecycle
	z.object({
		eventName: z.literal(ZentaraCodeEventName.TaskCreated),
		payload: zentaraCodeEventsSchema.shape[ZentaraCodeEventName.TaskCreated],
		taskId: z.number().optional(),
	}),

	// Task Lifecycle
	z.object({
		eventName: z.literal(ZentaraCodeEventName.TaskStarted),
		payload: zentaraCodeEventsSchema.shape[ZentaraCodeEventName.TaskStarted],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(ZentaraCodeEventName.TaskCompleted),
		payload: zentaraCodeEventsSchema.shape[ZentaraCodeEventName.TaskCompleted],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(ZentaraCodeEventName.TaskAborted),
		payload: zentaraCodeEventsSchema.shape[ZentaraCodeEventName.TaskAborted],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(ZentaraCodeEventName.TaskFocused),
		payload: zentaraCodeEventsSchema.shape[ZentaraCodeEventName.TaskFocused],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(ZentaraCodeEventName.TaskUnfocused),
		payload: zentaraCodeEventsSchema.shape[ZentaraCodeEventName.TaskUnfocused],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(ZentaraCodeEventName.TaskActive),
		payload: zentaraCodeEventsSchema.shape[ZentaraCodeEventName.TaskActive],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(ZentaraCodeEventName.TaskInteractive),
		payload: zentaraCodeEventsSchema.shape[ZentaraCodeEventName.TaskInteractive],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(ZentaraCodeEventName.TaskResumable),
		payload: zentaraCodeEventsSchema.shape[ZentaraCodeEventName.TaskResumable],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(ZentaraCodeEventName.TaskIdle),
		payload: zentaraCodeEventsSchema.shape[ZentaraCodeEventName.TaskIdle],
		taskId: z.number().optional(),
	}),

	// Subtask Lifecycle
	z.object({
		eventName: z.literal(ZentaraCodeEventName.TaskPaused),
		payload: zentaraCodeEventsSchema.shape[ZentaraCodeEventName.TaskPaused],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(ZentaraCodeEventName.TaskUnpaused),
		payload: zentaraCodeEventsSchema.shape[ZentaraCodeEventName.TaskUnpaused],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(ZentaraCodeEventName.TaskSpawned),
		payload: zentaraCodeEventsSchema.shape[ZentaraCodeEventName.TaskSpawned],
		taskId: z.number().optional(),
	}),

	// Task Execution
	z.object({
		eventName: z.literal(ZentaraCodeEventName.Message),
		payload: zentaraCodeEventsSchema.shape[ZentaraCodeEventName.Message],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(ZentaraCodeEventName.TaskModeSwitched),
		payload: zentaraCodeEventsSchema.shape[ZentaraCodeEventName.TaskModeSwitched],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(ZentaraCodeEventName.TaskAskResponded),
		payload: zentaraCodeEventsSchema.shape[ZentaraCodeEventName.TaskAskResponded],
		taskId: z.number().optional(),
	}),

	// Task Analytics
	z.object({
		eventName: z.literal(ZentaraCodeEventName.TaskToolFailed),
		payload: zentaraCodeEventsSchema.shape[ZentaraCodeEventName.TaskToolFailed],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(ZentaraCodeEventName.TaskTokenUsageUpdated),
		payload: zentaraCodeEventsSchema.shape[ZentaraCodeEventName.TaskTokenUsageUpdated],
		taskId: z.number().optional(),
	}),

	// Evals
	z.object({
		eventName: z.literal(ZentaraCodeEventName.EvalPass),
		payload: z.undefined(),
		taskId: z.number(),
	}),
	z.object({
		eventName: z.literal(ZentaraCodeEventName.EvalFail),
		payload: z.undefined(),
		taskId: z.number(),
	}),
])

export type TaskEvent = z.infer<typeof taskEventSchema>
