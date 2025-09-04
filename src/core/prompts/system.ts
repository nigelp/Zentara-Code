import * as vscode from "vscode"
import * as os from "os"

import type { ModeConfig, PromptComponent, CustomModePrompts, TodoItem } from "@zentara-code/types"

import type { SystemPromptSettings } from "./types"

import { Mode, modes, defaultModeSlug, getModeBySlug, getGroupName, getModeSelection } from "../../shared/modes"
import { DiffStrategy } from "../../shared/tools"
import { formatLanguage } from "../../shared/language"
import { isEmpty } from "../../utils/object"

import { McpHub } from "../../services/mcp/McpHub"
import { CodeIndexManager } from "../../services/code-index/manager"

import { PromptVariables, loadSystemPromptFile } from "./sections/custom-system-prompt"

import { getToolDescriptionsForMode } from "./tools"
import { getOptimizedToolDescriptionsForMode } from "../../zentara_tool_prompt_management/tool-optimization-integration"
import {
	getRulesSection,
	getSystemInfoSection,
	getObjectiveSection,
	getSharedToolUseSection,
	getMcpServersSection,
	getToolUseGuidelinesSection,
	getCapabilitiesSection,
	getModesSection,
	addCustomInstructions,
	markdownFormattingSection,
} from "./sections"
import { getSubagentSection } from "./subagent"
import { getMainAgentSection } from "./mainagent"

// Cache for subagent descriptions by taskId
// This ensures each task only generates the subagent description once
const subagentDescriptionCache = new Map<string, string>()

/**
 * Clear the subagent description cache (useful for testing or cleanup)
 */
export function clearSubagentDescriptionCache(): void {
	subagentDescriptionCache.clear()
}

/**
 * Remove a specific task's cached subagent description
 */
export function clearTaskSubagentDescription(taskId: string): void {
	subagentDescriptionCache.delete(taskId)
}

/**
 * Get cached subagent description for a task, or generate and cache it
 * @param taskId - The task ID for caching
 * @param discoveredAgents - Pre-discovered agents from Task cache
 */
async function getCachedSubagentDescription(taskId?: string, discoveredAgents?: any): Promise<string> {
	const cacheKey = taskId || "default"

	// Check if we have a cached description for this task
	let cachedDescription = subagentDescriptionCache.get(cacheKey)

	if (!cachedDescription) {
		// Generate the description and cache it
		const { getSubagentDescription } = await import("./tools/subagent")
		cachedDescription = await getSubagentDescription(discoveredAgents)
		subagentDescriptionCache.set(cacheKey, cachedDescription)
		console.log(`[SubagentCache] Generated and cached subagent description for task: ${cacheKey}`)
	} else {
		console.log(`[SubagentCache] Using cached subagent description for task: ${cacheKey}`)
	}

	return cachedDescription
}

// Helper function to get prompt component, filtering out empty objects
export function getPromptComponent(
	customModePrompts: CustomModePrompts | undefined,
	mode: string,
): PromptComponent | undefined {
	const component = customModePrompts?.[mode]
	// Return undefined if component is empty
	if (isEmpty(component)) {
		return undefined
	}
	return component
}

async function generatePrompt(
	context: vscode.ExtensionContext,
	cwd: string,
	supportsComputerUse: boolean,
	mode: Mode,
	mcpHub?: McpHub,
	diffStrategy?: DiffStrategy,
	browserViewportSize?: string,
	promptComponent?: PromptComponent,
	customModeConfigs?: ModeConfig[],
	globalCustomInstructions?: string,
	diffEnabled?: boolean,
	experiments?: Record<string, boolean>,
	enableMcpServerCreation?: boolean,
	language?: string,
	zentaraIgnoreInstructions?: string,
	partialReadsEnabled?: boolean,
	settings?: SystemPromptSettings,
	todoList?: TodoItem[],
	subagent?: boolean,
	taskId?: string,
	discoveredAgents?: any,
	modelId?: string,
): Promise<string> {
	if (!context) {
		throw new Error("Extension context is required for generating system prompt")
	}

	// If diff is disabled, don't pass the diffStrategy
	const effectiveDiffStrategy = diffEnabled ? diffStrategy : undefined

	// Get the full mode config to ensure we have the role definition (used for groups, etc.)
	const modeConfig = getModeBySlug(mode, customModeConfigs) || modes.find((m) => m.slug === mode) || modes[0]
	const { roleDefinition, baseInstructions } = getModeSelection(mode, promptComponent, customModeConfigs)

	// Check if MCP functionality should be included
	const hasMcpGroup = modeConfig.groups.some((groupEntry) => getGroupName(groupEntry) === "mcp")
	const hasMcpServers = mcpHub && mcpHub.getServers().length > 0
	const shouldIncludeMcp = hasMcpGroup && hasMcpServers

	const [modesSection, mcpServersSection] = await Promise.all([
		getModesSection(context),
		shouldIncludeMcp
			? getMcpServersSection(mcpHub, effectiveDiffStrategy, enableMcpServerCreation)
			: Promise.resolve(""),
	])

	const codeIndexManager = CodeIndexManager.getInstance(context, cwd)

	// Get cached subagent description for this task
	const cachedSubagentDesc = await getCachedSubagentDescription(taskId, discoveredAgents)

	const basePrompt = `${roleDefinition}

${markdownFormattingSection()}
${getSubagentSection(subagent)}
${getMainAgentSection(!subagent)}
${getSharedToolUseSection()}

${await getOptimizedToolDescriptionsForMode(
	mode,
	cwd,
	supportsComputerUse,
	codeIndexManager,
	effectiveDiffStrategy,
	browserViewportSize,
	shouldIncludeMcp ? mcpHub : undefined,
	customModeConfigs,
	experiments,
	partialReadsEnabled,
	settings,
	enableMcpServerCreation,
	modelId,
)}

${getToolUseGuidelinesSection(codeIndexManager)}

${mcpServersSection}

${getCapabilitiesSection(cwd, supportsComputerUse, shouldIncludeMcp ? mcpHub : undefined, effectiveDiffStrategy, codeIndexManager)}

${modesSection}

${getRulesSection(cwd, supportsComputerUse, effectiveDiffStrategy, codeIndexManager)}

${getSystemInfoSection(cwd)}

${getObjectiveSection(codeIndexManager, experiments)}

${await addCustomInstructions(baseInstructions, globalCustomInstructions || "", cwd, mode, {
	language: language ?? formatLanguage(vscode.env.language),
	zentaraIgnoreInstructions,
	settings,
})}`

	return basePrompt
}

export const SYSTEM_PROMPT = async (
	context: vscode.ExtensionContext,
	cwd: string,
	supportsComputerUse: boolean,
	mcpHub?: McpHub,
	diffStrategy?: DiffStrategy,
	browserViewportSize?: string,
	mode: Mode = defaultModeSlug,
	customModePrompts?: CustomModePrompts,
	customModes?: ModeConfig[],
	globalCustomInstructions?: string,
	diffEnabled?: boolean,
	experiments?: Record<string, boolean>,
	enableMcpServerCreation?: boolean,
	language?: string,
	zentaraIgnoreInstructions?: string,
	partialReadsEnabled?: boolean,
	settings?: SystemPromptSettings,
	todoList?: TodoItem[],
	subagent?: boolean,
	taskId?: string,
	discoveredAgents?: any,
	modelId?: string,
): Promise<string> => {
	if (!context) {
		throw new Error("Extension context is required for generating system prompt")
	}

	// Try to load custom system prompt from file
	const variablesForPrompt: PromptVariables = {
		workspace: cwd,
		mode: mode,
		language: language ?? formatLanguage(vscode.env.language),
		shell: vscode.env.shell,
		operatingSystem: os.type(),
	}
	const fileCustomSystemPrompt = await loadSystemPromptFile(cwd, mode, variablesForPrompt)

	// Check if it's a custom mode
	const promptComponent = getPromptComponent(customModePrompts, mode)

	// Get full mode config from custom modes or fall back to built-in modes
	const currentMode = getModeBySlug(mode, customModes) || modes.find((m) => m.slug === mode) || modes[0]

	// If a file-based custom system prompt exists, use it
	if (fileCustomSystemPrompt) {
		const { roleDefinition, baseInstructions: baseInstructionsForFile } = getModeSelection(
			mode,
			promptComponent,
			customModes,
		)

		const customInstructions = await addCustomInstructions(
			baseInstructionsForFile,
			globalCustomInstructions || "",
			cwd,
			mode,
			{
				language: language ?? formatLanguage(vscode.env.language),
				zentaraIgnoreInstructions,
				settings,
			},
		)

		// For file-based prompts, don't include the tool sections
		return `${roleDefinition}

				${fileCustomSystemPrompt}

				${customInstructions}`
	}

	// If diff is disabled, don't pass the diffStrategy
	const effectiveDiffStrategy = diffEnabled ? diffStrategy : undefined

	return generatePrompt(
		context,
		cwd,
		supportsComputerUse,
		currentMode.slug,
		mcpHub,
		effectiveDiffStrategy,
		browserViewportSize,
		promptComponent,
		customModes,
		globalCustomInstructions,
		diffEnabled,
		experiments,
		enableMcpServerCreation,
		language,
		zentaraIgnoreInstructions,
		partialReadsEnabled,
		settings,
		todoList,
		subagent,
		taskId,
		discoveredAgents,
		modelId,
	)
}
