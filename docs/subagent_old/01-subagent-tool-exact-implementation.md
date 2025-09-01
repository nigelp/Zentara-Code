# SubAgent Tool - Exact Implementation Guide

## Overview

This document provides the exact implementation details for the `subagent` tool based on the codebase patterns. The implementation follows the established tool architecture with support for both XML-style and JSON-style parameters.

## 1. Tool Function Implementation

### Location: `/src/core/tools/subagentTool.ts` (Already Implemented)

```typescript
import delay from "delay"
import { ToolUse, AskApproval, HandleError, PushToolResult, RemoveClosingTag } from "../../shared/tools"
import { Task } from "../task/Task"
import { formatResponse } from "../prompts/responses"
import { t } from "../../i18n"
import { ClineProvider } from "../webview/ClineProvider"
import { validateSubAgentParams } from "../../zentara_subagent/src/subagentValidation"

interface SubAgentParams {
	description?: string
	prompt?: string
	writePermissions?: boolean
	allowedWritePaths?: string[]
	maxExecutionTime?: number
	priority?: string
	outputSchema?: any
	_text?: string // For JSON-style parameters
}

export async function subagentTool(
	cline: Task,
	block: ToolUse,
	askApproval: AskApproval,
	handleError: HandleError,
	pushToolResult: PushToolResult,
	removeClosingTag: RemoveClosingTag,
) {
	const params = block.params as SubAgentParams

	try {
		// Handle partial blocks during streaming
		if (block.partial) {
			const partialMessage = JSON.stringify({
				tool: "subagent",
				description: removeClosingTag("description", params.description),
				prompt: removeClosingTag("prompt", params.prompt),
				_text: params._text,
			})

			await cline.ask("tool", partialMessage, block.partial).catch(() => {})
			return
		}

		// Parse parameters from either XML-style or JSON-style
		let finalParams: SubAgentParams = {}

		if (params._text) {
			// JSON-style parameters (like debug tool)
			try {
				finalParams = JSON.parse(params._text)
				// Validate JSON parameters
				if (!finalParams.description || !finalParams.prompt) {
					throw new Error("Missing required parameters in JSON")
				}
			} catch (e) {
				cline.consecutiveMistakeCount++
				cline.recordToolError("subagent")
				pushToolResult(formatResponse.toolError(`Invalid JSON parameters: ${e.message}`))
				return
			}
		} else {
			// XML-style parameters
			if (!params.description) {
				cline.consecutiveMistakeCount++
				cline.recordToolError("subagent")
				pushToolResult(await cline.sayAndCreateMissingParamError("subagent", "description"))
				return
			}

			if (!params.prompt) {
				cline.consecutiveMistakeCount++
				cline.recordToolError("subagent")
				pushToolResult(await cline.sayAndCreateMissingParamError("subagent", "prompt"))
				return
			}

			finalParams = params
		}

		cline.consecutiveMistakeCount = 0

		// Validate parameters
		const validation = validateSubAgentParams(finalParams)
		if (!validation.isValid) {
			pushToolResult(formatResponse.toolError(`Invalid parameters: ${validation.errors.join(", ")}`))
			return
		}

		// Check if ClineProvider can launch a new parallel task
		const provider = cline.providerRef?.deref() as ClineProvider
		if (!provider || !provider.canLaunchParallelTask()) {
			pushToolResult(
				formatResponse.toolError(
					"Maximum concurrent tasks limit reached. Please wait for other tasks to complete.",
				),
			)
			return
		}

		// Prepare approval message
		const toolMessage = JSON.stringify({
			tool: "subagent",
			description: finalParams.description,
			prompt: finalParams.prompt.substring(0, 100) + (finalParams.prompt.length > 100 ? "..." : ""),
			writePermissions: finalParams.writePermissions || false,
			priority: finalParams.priority || "normal",
		})

		const didApprove = await askApproval("tool", toolMessage)

		if (!didApprove) {
			pushToolResult("User denied subagent creation")
			return
		}

		// Check file locks if write permissions requested
		const taskId = generateTaskId()

		if (finalParams.writePermissions && finalParams.allowedWritePaths) {
			const lockResult = await provider.requestFileWriteAccessBatch(taskId, finalParams.allowedWritePaths)

			if (!lockResult.granted) {
				pushToolResult(
					formatResponse.toolError(
						`Cannot acquire file locks. Conflicts: ${lockResult.conflicts.join(", ")}`,
					),
				)
				return
			}
		}

		try {
			// Create parallel task with enhanced configuration
			const parallelTask = await provider.initTaskForParallelExecution(
				finalParams.prompt,
				cline, // parent task
				{
					writePermissions: finalParams.writePermissions || false,
					maxExecutionTime: finalParams.maxExecutionTime || 300000,
					priority: finalParams.priority || "normal",
					resourceLimits: {
						maxMemory: 512 * 1024 * 1024,
						maxFileOperations: 1000,
						maxToolCalls: 100,
					},
					outputSchema: finalParams.outputSchema,
				},
			)

			// Store task reference for monitoring
			cline.activeSubAgents = cline.activeSubAgents || new Map()
			cline.activeSubAgents.set(taskId, {
				task: parallelTask,
				startTime: Date.now(),
				description: finalParams.description,
			})

			// Start parallel execution
			parallelTask.startTask()

			// Monitor completion without blocking
			parallelTask.on("completed", () => {
				cline.activeSubAgents?.delete(taskId)
				provider.finishSubTask(undefined, parallelTask)
			})

			parallelTask.on("error", (error) => {
				cline.activeSubAgents?.delete(taskId)
				provider.finishSubTask(error.message, parallelTask)
			})

			pushToolResult(
				formatResponse.toolResponse(
					`Successfully launched parallel task:\n` +
						`- Task ID: ${taskId}\n` +
						`- Description: ${finalParams.description}\n` +
						`- Priority: ${finalParams.priority || "normal"}\n` +
						`- Write Permissions: ${finalParams.writePermissions ? "Yes" : "No"}\n` +
						`- Max Execution Time: ${(finalParams.maxExecutionTime || 300000) / 1000}s\n\n` +
						`The task is now running in parallel. You can continue with other work.`,
				),
			)
		} catch (error) {
			// Release file locks on error
			if (finalParams.writePermissions) {
				provider.releaseResources(taskId)
			}
			await handleError("creating parallel task", error)
			pushToolResult(formatResponse.toolError(`Failed to create parallel task: ${error.message}`))
		}
	} catch (error) {
		await handleError("processing subagent tool", error)
	}
}

function generateTaskId(): string {
	return `subagent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
```

## 2. Tool Validation

### Location: `/src/zentara_subagent/src/subagentValidation.ts` (Already Implemented)

```typescript
export interface ValidationResult {
	isValid: boolean
	errors: string[]
}

export function validateSubAgentParams(params: any): ValidationResult {
	const errors: string[] = []

	// Required parameters
	if (!params.description || typeof params.description !== "string") {
		errors.push("Description is required and must be a string")
	} else if (params.description.trim().length < 3) {
		errors.push("Description must be at least 3 characters")
	} else if (params.description.split(/\s+/).length > 10) {
		errors.push("Description should be 3-5 words")
	}

	if (!params.prompt || typeof params.prompt !== "string") {
		errors.push("Prompt is required and must be a string")
	} else if (params.prompt.trim().length < 10) {
		errors.push("Prompt must be at least 10 characters")
	}

	// Optional parameters
	if (params.writePermissions !== undefined && typeof params.writePermissions !== "boolean") {
		errors.push("writePermissions must be a boolean")
	}

	if (params.allowedWritePaths !== undefined) {
		if (!Array.isArray(params.allowedWritePaths)) {
			errors.push("allowedWritePaths must be an array")
		} else {
			params.allowedWritePaths.forEach((path: any, index: number) => {
				if (typeof path !== "string") {
					errors.push(`allowedWritePaths[${index}] must be a string`)
				}
			})
		}
	}

	if (params.writePermissions && (!params.allowedWritePaths || params.allowedWritePaths.length === 0)) {
		errors.push("writePermissions requires allowedWritePaths to be specified")
	}

	if (params.maxExecutionTime !== undefined) {
		if (typeof params.maxExecutionTime !== "number") {
			errors.push("maxExecutionTime must be a number")
		} else if (params.maxExecutionTime < 1000 || params.maxExecutionTime > 300000) {
			errors.push("maxExecutionTime must be between 1000-300000 ms (1-300 seconds)")
		}
	}

	if (params.priority !== undefined) {
		if (!["low", "normal", "high"].includes(params.priority)) {
			errors.push("priority must be 'low', 'normal', or 'high'")
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	}
}
```

## 3. Tool Description

### Location: `/src/core/prompts/tools/subagent.ts` (Already Implemented)

```typescript
import { ToolArgs } from "./types"

export function getSubagentDescription(_args: ToolArgs): string {
	return `## subagent

Description: Launch a parallel autonomous task that runs independently without user interaction. The task executes concurrently with your main workflow, allowing you to continue with other work.

IMPORTANT: Parallel tasks run independently and do not block your execution. They operate with the same tools but in autonomous mode.

Parameters (supports both XML-style and JSON-style):

XML-style:
- description: (required) A short 3-5 word description of the task
- prompt: (required) Detailed instructions for the agent to follow
- writePermissions: (optional) Boolean, whether the agent can modify files (default: false)
- allowedWritePaths: (optional) Array of glob patterns for allowed write paths
- maxExecutionTime: (optional) Maximum execution time in milliseconds (default: 300000, max: 300000)
- priority: (optional) Task priority: "low", "normal", or "high" (default: "normal")

JSON-style (preferred for complex configurations):
Pass all parameters as a single JSON object within the tool tags.

Usage Examples:

1. XML-style (simple read-only task):
<subagent>
<description>Analyze authentication code</description>
<prompt>Search the codebase for all authentication-related code and provide a comprehensive summary of the authentication flow, including login, logout, session management, and token validation.</prompt>
</subagent>

2. JSON-style (complex task with write permissions):
<subagent>
{
  "description": "Refactor import statements",
  "prompt": "Update all import statements from '@old/package' to '@new/package' in all TypeScript files under the src directory. Ensure you maintain the exact import structure and only change the package name.",
  "writePermissions": true,
  "allowedWritePaths": ["src/**/*.ts", "src/**/*.tsx"],
  "priority": "high",
  "maxExecutionTime": 180000
}
</subagent>

3. Multiple agents for parallel analysis:
<subagent>
{
  "description": "Analyze frontend code",
  "prompt": "Analyze all React components in src/components and identify potential performance optimizations, unused props, and accessibility issues."
}
</subagent>

<subagent>
{
  "description": "Analyze backend code", 
  "prompt": "Review all API endpoints in src/api and check for proper error handling, input validation, and authentication."
}
</subagent>

Notes:
- Agents execute in parallel and don't block your workflow
- Each agent has isolated context (no access to your conversation history)
- Agents automatically complete when their task is done
- Resource limits prevent system overload
- File write operations require explicit permissions and paths`
}
```

## 4. Tool Registration (Already Completed)

### Location: `/src/schemas/index.ts` - DONE

### Location: `/packages/types/src/tool.ts` - DONE

The "subagent" tool has been added to both toolNames arrays.

### Location: `/src/core/prompts/tools/index.ts` - DONE

The tool description mapping has been completed with:

- Import of `getSubagentDescription`
- Addition to `toolDescriptionMap`
- Export of the description function

## 5. Tool Invocation Integration (Already Completed)

### Location: `/src/core/assistant-message/presentAssistantMessage.ts` - DONE

The integration includes:

- Import of `subagentTool`
- Case statement for "subagent" tool execution
- Tool description formatting for UI display

## 6. Shared Types Update (Already Completed)

### Location: `/src/shared/tools.ts` - DONE

The "subagent" tool has been added to ALWAYS_AVAILABLE_TOOLS.

## 7. Testing

### Unit Test: `/src/core/tools/__tests__/subagentTool.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { subagentTool } from "../subagentTool"
import { SubAgentManager } from "../../../services/subagent/SubAgentManager"

vi.mock("../../../services/subagent/SubAgentManager")

describe("subagentTool", () => {
	let mockCline: any
	let mockAskApproval: any
	let mockHandleError: any
	let mockPushToolResult: any
	let mockRemoveClosingTag: any
	let mockManager: any

	beforeEach(() => {
		mockCline = {
			taskId: "test-task-123",
			consecutiveMistakeCount: 0,
			recordToolError: vi.fn(),
			sayAndCreateMissingParamError: vi.fn(),
			ask: vi.fn(),
			emit: vi.fn(),
		}

		mockAskApproval = vi.fn().mockResolvedValue(true)
		mockHandleError = vi.fn()
		mockPushToolResult = vi.fn()
		mockRemoveClosingTag = vi.fn((tag, value) => value)

		mockProvider = {
			canLaunchParallelTask: vi.fn().mockReturnValue(true),
			requestFileWriteAccessBatch: vi.fn().mockResolvedValue({ granted: true, conflicts: [] }),
			initTaskForParallelExecution: vi.fn().mockResolvedValue(mockParallelTask),
			finishSubTask: vi.fn(),
			releaseResources: vi.fn(),
		}

		mockCline.providerRef = new WeakRef(mockProvider)
	})

	it("should handle XML-style parameters", async () => {
		const block = {
			type: "tool_use" as const,
			name: "subagent" as any,
			params: {
				description: "Test task",
				prompt: "Do something interesting",
			},
			partial: false,
		}

		await subagentTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

		expect(mockAskApproval).toHaveBeenCalled()
		expect(mockProvider.initTaskForParallelExecution).toHaveBeenCalled()
		expect(mockPushToolResult).toHaveBeenCalledWith(expect.stringContaining("Successfully launched subagent"))
	})

	it("should handle JSON-style parameters", async () => {
		const block = {
			type: "tool_use" as const,
			name: "subagent" as any,
			params: {
				_text: JSON.stringify({
					description: "JSON task",
					prompt: "Do something with JSON",
					writePermissions: true,
					allowedWritePaths: ["src/**/*.ts"],
				}),
			},
			partial: false,
		}

		await subagentTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

		expect(mockManager.createSubAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				description: "JSON task",
				writePermissions: true,
			}),
		)
	})

	it("should validate required parameters", async () => {
		const block = {
			type: "tool_use" as const,
			name: "subagent" as any,
			params: {
				description: "Test task",
				// Missing prompt
			},
			partial: false,
		}

		await subagentTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

		expect(mockCline.recordToolError).toHaveBeenCalledWith("subagent")
		expect(mockCline.sayAndCreateMissingParamError).toHaveBeenCalledWith("subagent", "prompt")
	})

	it("should handle resource limits", async () => {
		mockProvider.canLaunchParallelTask.mockReturnValue(false)

		const block = {
			type: "tool_use" as const,
			name: "subagent" as any,
			params: {
				description: "Test task",
				prompt: "Do something",
			},
			partial: false,
		}

		await subagentTool(mockCline, block, mockAskApproval, mockHandleError, mockPushToolResult, mockRemoveClosingTag)

		expect(mockPushToolResult).toHaveBeenCalledWith(
			expect.stringContaining("Maximum concurrent tasks limit reached"),
		)
	})
})
```

## 8. Internationalization

### Location: Update language files in `/src/i18n/locales/*/tools.json`

Add for each language:

```json
{
	"subagent": {
		"description": "Launch autonomous agent",
		"errors": {
			"missing_description": "Agent description is required",
			"missing_prompt": "Agent prompt is required",
			"invalid_json": "Invalid JSON parameters",
			"resource_limit": "Maximum concurrent agents limit reached",
			"creation_failed": "Failed to create agent"
		}
	}
}
```

## Implementation Status

- [x] Created `/src/core/tools/subagentTool.ts`
- [x] Created `/src/zentara_subagent/src/subagentValidation.ts`
- [x] Created `/src/core/prompts/tools/subagent.ts`
- [x] Updated `/src/schemas/index.ts` - Added "subagent" to toolNames
- [x] Updated `/packages/types/src/tool.ts` - Added "subagent" to ToolName type
- [x] Updated `/src/core/prompts/tools/index.ts` - Imported and mapped description
- [x] Updated `/src/core/assistant-message/presentAssistantMessage.ts` - Added invocation
- [x] Updated `/src/shared/tools.ts` - Added to ALWAYS_AVAILABLE_TOOLS
- [ ] Enhance Task class for parallel execution
- [ ] Enhance ClineProvider for parallel task management
- [ ] Implement resource management in ClineProvider
- [ ] Implement file lock management in ClineProvider
- [ ] Create comprehensive tests
- [ ] Update i18n files

## Architecture Notes

1. The tool uses JSON-style parameters for consistency with other tools
2. Parallel tasks are created using the enhanced Task class with `executionMode: 'parallel'`
3. The ClineProvider manages both sequential (stack) and parallel (set) tasks
4. Resource limits and file locks are handled by the enhanced ClineProvider
5. Tasks run in autonomous mode when configured, bypassing user interactions
6. Complete backward compatibility - existing Task usage remains unchanged
7. File write operations require explicit permissions and path specifications
