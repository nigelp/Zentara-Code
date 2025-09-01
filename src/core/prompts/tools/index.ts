import type { ToolName, ModeConfig } from "@roo-code/types"

import { TOOL_GROUPS, ALWAYS_AVAILABLE_TOOLS, DiffStrategy } from "../../../shared/tools"
import { McpHub } from "../../../services/mcp/McpHub"
import { Mode, getModeConfig, isToolAllowedForMode, getGroupName } from "../../../shared/modes"

import { ToolArgs } from "./types"
import { getExecuteCommandDescription } from "./execute-command"
import { getReadFileDescription } from "./read-file"
import { getSimpleReadFileDescription } from "./simple-read-file"
import { getFetchInstructionsDescription } from "./fetch-instructions"
import { shouldUseSingleFileRead } from "@roo-code/types"
import { getWriteToFileDescription } from "./write-to-file"
import { getSearchFilesDescription } from "./search-files"
import { getListFilesDescription } from "./list-files"
import { getGlobDescription } from "./glob"
import { getInsertContentDescription } from "./insert-content"
import { getSearchAndReplaceDescription } from "./search-and-replace"
import { getListCodeDefinitionNamesDescription } from "./list-code-definition-names"
import { getBrowserActionDescription } from "./browser-action"
import { getAskFollowupQuestionDescription } from "./ask-followup-question"
import { getAttemptCompletionDescription } from "./attempt-completion"
import { getUseMcpToolDescription } from "./use-mcp-tool"
import { getAccessMcpResourceDescription } from "./access-mcp-resource"
import { getSwitchModeDescription } from "./switch-mode"
import { getNewTaskDescription } from "./new-task"
import { getCodebaseSearchDescription } from "./codebase-search"
import { getUpdateTodoListDescription } from "./update-todo-list"
import { getGenerateImageDescription } from "./generate-image"
import { CodeIndexManager } from "../../../services/code-index/manager"
import { getDebugToolDescription } from "./debug"
import { getSubagentDescription } from "./subagent"
import { getFetchToolDescriptionDescription } from "./fetch-tool-description"
import {
	getDebugLaunchToolDescription,
	getDebugRestartToolDescription,
	getDebugQuitToolDescription,
	getDebugContinueToolDescription,
	getDebugNextToolDescription,
	getDebugStepInToolDescription,
	getDebugStepOutToolDescription,
	getDebugJumpToolDescription,
	getDebugUntilToolDescription,
	getDebugSetBreakpointToolDescription,
	getDebugSetTempBreakpointToolDescription,
	getDebugRemoveBreakpointToolDescription,
	getDebugRemoveAllBreakpointsInFileToolDescription,
	getDebugDisableBreakpointToolDescription,
	getDebugEnableBreakpointToolDescription,
	getDebugIgnoreBreakpointToolDescription,
	getDebugSetBreakpointConditionToolDescription,
	getDebugGetActiveBreakpointsToolDescription,
	getDebugStackTraceToolDescription,
	getDebugListSourceToolDescription,
	getDebugUpToolDescription,
	getDebugDownToolDescription,
	getDebugGotoFrameToolDescription,
	getDebugGetSourceToolDescription,
	getDebugGetStackFrameVariablesToolDescription,
	getDebugGetArgsToolDescription,
	getDebugEvaluateToolDescription,
	getDebugPrettyPrintToolDescription,
	getDebugWhatisToolDescription,
	getDebugExecuteStatementToolDescription,
	getDebugGetLastStopInfoToolDescription,
} from "./debug_operations"
import {
	getFindUsagesToolDescription,
	getGoToDefinitionToolDescription,
	getFindImplementationsToolDescription,
	getGetHoverInfoToolDescription,
	getGetDocumentSymbolsToolDescription,
	getGetCompletionsToolDescription,
	getGetSignatureHelpToolDescription,
	getRenameToolDescription,
	getGetCodeActionsToolDescription,
	getGetSemanticTokensToolDescription,
	getGetCallHierarchyToolDescription,
	getGetTypeHierarchyToolDescription,
	getGetCodeLensToolDescription,
	getGetSelectionRangeToolDescription,
	getGetTypeDefinitionToolDescription,
	getGetDeclarationToolDescription,
	getGetDocumentHighlightsToolDescription,
	getGetWorkspaceSymbolsToolDescription,
	getGetSymbolCodeSnippetToolDescription,
	getGetSymbolChildrenToolDescription,
	getGetSymbolsToolDescription,
	getGetSymbolsOverviewToolDescription,
	getInsertAfterSymbolToolDescription,
	getInsertBeforeSymbolToolDescription,
	getReplaceSymbolBodyToolDescription,
} from "./lsp_operations"

// Map of tool names to their description functions
export const toolDescriptionMap: Record<string, (args: ToolArgs) => string | Promise<string> | undefined> = {
	execute_command: (args) => getExecuteCommandDescription(args),
	read_file: (args) => {
		// Check if the current model should use the simplified read_file tool
		const modelId = args.settings?.modelId
		if (modelId && shouldUseSingleFileRead(modelId)) {
			return getSimpleReadFileDescription(args)
		}
		return getReadFileDescription(args)
	},
	fetch_instructions: (args) => getFetchInstructionsDescription(args.settings?.enableMcpServerCreation),
	write_to_file: (args) => getWriteToFileDescription(args),
	search_files: (args) => getSearchFilesDescription(args),
	list_files: (args) => getListFilesDescription(args),
	glob: (args) => getGlobDescription(args),
	list_code_definition_names: (args) => getListCodeDefinitionNamesDescription(args),
	browser_action: (args) => getBrowserActionDescription(args),
	ask_followup_question: () => getAskFollowupQuestionDescription(),
	attempt_completion: (args) => getAttemptCompletionDescription(args),
	use_mcp_tool: (args) => getUseMcpToolDescription(args),
	access_mcp_resource: (args) => getAccessMcpResourceDescription(args),
	codebase_search: (args) => getCodebaseSearchDescription(args),
	switch_mode: () => getSwitchModeDescription(),
	new_task: (args) => getNewTaskDescription(args),
	insert_content: (args) => getInsertContentDescription(args),
	search_and_replace: (args) => getSearchAndReplaceDescription(args),
	apply_diff: (args) =>
		args.diffStrategy ? args.diffStrategy.getToolDescription({ cwd: args.cwd, toolOptions: args.toolOptions }) : "",
	update_todo_list: (args) => getUpdateTodoListDescription(args),
	generate_image: (args) => getGenerateImageDescription(args),
	debug: (_args) => getDebugToolDescription(), // Does not use args currently
	debug_launch: (args) => getDebugLaunchToolDescription(args),
	debug_restart: (args) => getDebugRestartToolDescription(args),
	debug_quit: () => getDebugQuitToolDescription(),
	debug_continue: () => getDebugContinueToolDescription(),
	debug_next: () => getDebugNextToolDescription(),
	debug_step_in: () => getDebugStepInToolDescription(),
	debug_step_out: () => getDebugStepOutToolDescription(),
	debug_jump: () => getDebugJumpToolDescription(),
	debug_until: () => getDebugUntilToolDescription(),
	debug_set_breakpoint: (args) => getDebugSetBreakpointToolDescription(args),
	debug_set_temp_breakpoint: (args) => getDebugSetTempBreakpointToolDescription(args), // Will be updated to accept args
	debug_remove_breakpoint: (args) => getDebugRemoveBreakpointToolDescription(args), // Will be updated to accept args
	debug_remove_all_breakpoints_in_file: (args) => getDebugRemoveAllBreakpointsInFileToolDescription(args), // Will be updated to accept args
	debug_disable_breakpoint: (args) => getDebugDisableBreakpointToolDescription(args), // Will be updated to accept args
	debug_enable_breakpoint: (args) => getDebugEnableBreakpointToolDescription(args), // Will be updated to accept args
	debug_ignore_breakpoint: (args) => getDebugIgnoreBreakpointToolDescription(args), // Will be updated to accept args
	debug_set_breakpoint_condition: (args) => getDebugSetBreakpointConditionToolDescription(args), // Will be updated to accept args
	debug_get_active_breakpoints: (_args) => getDebugGetActiveBreakpointsToolDescription(), // Does not use args currently
	debug_stack_trace: () => getDebugStackTraceToolDescription(),
	debug_list_source: () => getDebugListSourceToolDescription(),
	debug_up: () => getDebugUpToolDescription(),
	debug_down: () => getDebugDownToolDescription(),
	debug_goto_frame: () => getDebugGotoFrameToolDescription(),
	debug_get_source: () => getDebugGetSourceToolDescription(),
	debug_get_stack_frame_variables: () => getDebugGetStackFrameVariablesToolDescription(),
	debug_get_args: () => getDebugGetArgsToolDescription(),
	debug_evaluate: () => getDebugEvaluateToolDescription(),
	debug_pretty_print: () => getDebugPrettyPrintToolDescription(),
	debug_whatis: () => getDebugWhatisToolDescription(),
	debug_execute_statement: () => getDebugExecuteStatementToolDescription(),
	debug_get_last_stop_info: () => getDebugGetLastStopInfoToolDescription(),
	lsp_find_usages: (args) => getFindUsagesToolDescription(args),
	lsp_go_to_definition: (args) => getGoToDefinitionToolDescription(args),
	lsp_find_implementations: (args) => getFindImplementationsToolDescription(args),
	lsp_get_hover_info: (args) => getGetHoverInfoToolDescription(args),
	lsp_get_document_symbols: (args) => getGetDocumentSymbolsToolDescription(args),
	lsp_get_completions: (args) => getGetCompletionsToolDescription(args),
	lsp_get_signature_help: (args) => getGetSignatureHelpToolDescription(args),
	lsp_rename: (args) => getRenameToolDescription(args),
	lsp_get_code_actions: (args) => getGetCodeActionsToolDescription(args),
	lsp_get_semantic_tokens: (args) => getGetSemanticTokensToolDescription(args),
	lsp_get_call_hierarchy: (args) => getGetCallHierarchyToolDescription(args),
	lsp_get_type_hierarchy: (args) => getGetTypeHierarchyToolDescription(args),
	lsp_get_code_lens: (args) => getGetCodeLensToolDescription(args),
	lsp_get_selection_range: (args) => getGetSelectionRangeToolDescription(args),
	lsp_get_type_definition: (args) => getGetTypeDefinitionToolDescription(args),
	lsp_get_declaration: (args) => getGetDeclarationToolDescription(args),
	lsp_get_document_highlights: (args) => getGetDocumentHighlightsToolDescription(args),
	lsp_get_workspace_symbols: (args) => getGetWorkspaceSymbolsToolDescription(args),
	lsp_get_symbol_code_snippet: (args) => getGetSymbolCodeSnippetToolDescription(args),
	lsp_get_symbol_children: (args) => getGetSymbolChildrenToolDescription(args),
	lsp_get_symbols: (args) => getGetSymbolsToolDescription(args),
	lsp_get_symbols_overview: (args) => getGetSymbolsOverviewToolDescription(args),
	lsp_insert_after_symbol: (args) => getInsertAfterSymbolToolDescription(args),
	lsp_insert_before_symbol: (args) => getInsertBeforeSymbolToolDescription(args),
	lsp_replace_symbol_body: (args) => getReplaceSymbolBodyToolDescription(args),
	subagent: async () => {
		// Pass null to use cached discovered agents from Task
		return await getSubagentDescription(null)
	},
	fetch_tool_description: (args) => getFetchToolDescriptionDescription(args),
}

export async function getToolDescriptionsForMode(
	mode: Mode,
	cwd: string,
	supportsComputerUse: boolean,
	codeIndexManager?: CodeIndexManager,
	diffStrategy?: DiffStrategy,
	browserViewportSize?: string,
	mcpHub?: McpHub,
	customModes?: ModeConfig[],
	experiments?: Record<string, boolean>,
	partialReadsEnabled?: boolean,
	settings?: Record<string, any>,
	enableMcpServerCreation?: boolean,
	modelId?: string,
): Promise<string> {
	const config = getModeConfig(mode, customModes)
	const args: ToolArgs = {
		cwd,
		supportsComputerUse,
		diffStrategy,
		browserViewportSize,
		mcpHub,
		partialReadsEnabled,
		settings: {
			...settings,
			enableMcpServerCreation,
			modelId,
		},
		experiments,
	}

	const tools = new Set<string>()

	// Add tools from mode's groups
	config.groups.forEach((groupEntry) => {
		const groupName = getGroupName(groupEntry)
		const toolGroup = TOOL_GROUPS[groupName]
		if (toolGroup) {
			toolGroup.tools.forEach((tool) => {
				if (
					isToolAllowedForMode(
						tool as ToolName,
						mode,
						customModes ?? [],
						undefined,
						undefined,
						experiments ?? {},
					)
				) {
					tools.add(tool)
				}
			})
		}
	})

	// Add always available tools
	ALWAYS_AVAILABLE_TOOLS.forEach((tool) => tools.add(tool))

	// Conditionally exclude codebase_search if feature is disabled or not configured
	if (
		!codeIndexManager ||
		!(codeIndexManager.isFeatureEnabled && codeIndexManager.isFeatureConfigured && codeIndexManager.isInitialized)
	) {
		tools.delete("codebase_search")
	}

	// Conditionally exclude update_todo_list if disabled in settings
	if (settings?.todoListEnabled === false) {
		tools.delete("update_todo_list")
	}

	// Conditionally exclude generate_image if experiment is not enabled
	if (!experiments?.imageGeneration) {
		tools.delete("generate_image")
	}

	// Map tool descriptions for allowed tools
	const descriptionPromises = Array.from(tools).map(async (toolName) => {
		const descriptionFn = toolDescriptionMap[toolName]
		if (!descriptionFn) {
			return undefined
		}

		const result = descriptionFn({
			...args,
			toolOptions: undefined, // No tool options in group-based approach
		})
		
		// Handle both sync and async descriptions
		return await Promise.resolve(result)
	})

	const descriptions = await Promise.all(descriptionPromises)

	return `# Tools\n\n${descriptions.filter(Boolean).join("\n\n")}`
}

// Export individual description functions for backward compatibility
export {
	getExecuteCommandDescription,
	getReadFileDescription,
	getSimpleReadFileDescription,
	getFetchInstructionsDescription,
	getWriteToFileDescription,
	getSearchFilesDescription,
	getListFilesDescription,
	getGlobDescription,
	getListCodeDefinitionNamesDescription,
	getBrowserActionDescription,
	getAskFollowupQuestionDescription,
	getAttemptCompletionDescription,
	getUseMcpToolDescription,
	getAccessMcpResourceDescription,
	getSwitchModeDescription,
	getInsertContentDescription,
	getSearchAndReplaceDescription,
	getCodebaseSearchDescription,
	getGenerateImageDescription,
	getDebugToolDescription,
	// Debug operations
	getDebugLaunchToolDescription,
	getDebugRestartToolDescription,
	getDebugQuitToolDescription,
	getDebugContinueToolDescription,
	getDebugNextToolDescription,
	getDebugStepInToolDescription,
	getDebugStepOutToolDescription,
	getDebugJumpToolDescription,
	getDebugUntilToolDescription,
	getDebugSetBreakpointToolDescription,
	getDebugSetTempBreakpointToolDescription,
	getDebugRemoveBreakpointToolDescription,
	getDebugRemoveAllBreakpointsInFileToolDescription,
	getDebugDisableBreakpointToolDescription,
	getDebugEnableBreakpointToolDescription,
	getDebugIgnoreBreakpointToolDescription,
	getDebugSetBreakpointConditionToolDescription,
	getDebugGetActiveBreakpointsToolDescription,
	getDebugStackTraceToolDescription,
	getDebugListSourceToolDescription,
	getDebugUpToolDescription,
	getDebugDownToolDescription,
	getDebugGotoFrameToolDescription,
	getDebugGetSourceToolDescription,
	getDebugGetStackFrameVariablesToolDescription,
	getDebugGetArgsToolDescription,
	getDebugEvaluateToolDescription,
	getDebugPrettyPrintToolDescription,
	getDebugWhatisToolDescription,
	getDebugExecuteStatementToolDescription,
	getDebugGetLastStopInfoToolDescription,
	getSubagentDescription,
}

// Export the tool description map for optimization system
