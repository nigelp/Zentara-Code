import { Anthropic } from "@anthropic-ai/sdk"

import type { ClineAsk, ToolProgressStatus, ToolGroup, ToolName } from "@zentara-code/types"

export type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>

export type AskApproval = (
	type: ClineAsk,
	partialMessage?: string,
	progressStatus?: ToolProgressStatus,
	forceApproval?: boolean,
) => Promise<boolean>

export type HandleError = (action: string, error: Error) => Promise<void>

export type PushToolResult = (content: ToolResponse) => void

export type RemoveClosingTag = (tag: ToolParamName, content?: string) => string

export type AskFinishSubTaskApproval = () => Promise<boolean>

export type ToolDescription = () => string

export interface TextContent {
	type: "text"
	content: string
	partial: boolean
}

export const toolParamNames = [
	"command",
	"path",
	"pattern",
	"content",
	"line_count",
	"regex",
	"file_pattern",
	"recursive",
	"action",
	"url",
	"coordinate",
	"text",
	"server_name",
	"tool_name",
	"arguments",
	"uri",
	"question",
	"result",
	"diff",
	"mode_slug",
	"reason",
	"line",
	"mode",
	"message",
	"cwd",
	"follow_up",
	"task",
	"size",
	"search",
	"replace",
	"use_regex",
	"ignore_case",
	"args",
	"start_line",
	"end_line",
	"query",
	"_text", // Added for XML parser text content
	"debug_operation",
	"lsp_operation", // Added for LSP operations
	"head_limit", // Added for glob tool
	// Debug tool specific parameters
	"program",
	"arg",
	"args",
	"env",
	"stopOnEntry",
	"column",
	"condition",
	"hitCondition",
	"logMessage",
	"enable",
	"ignoreCount",
	"frameId",
	"linesAround",
	"expression",
	"statement",
	"context",
	"scopeFilter",
	"todos",
	// LSP tool specific parameters
	"position",
	"character",
	"newName",
	"prompt",
	"image",
] as const

export type ToolParamName = (typeof toolParamNames)[number]

export interface ToolUse {
	type: "tool_use"
	name: ToolName
	// params is a partial record, allowing only some or none of the possible parameters to be used
	params: Partial<Record<ToolParamName, string>>
	partial: boolean
}

export interface ExecuteCommandToolUse extends ToolUse {
	name: "execute_command"
	// Pick<Record<ToolParamName, string>, "command"> makes "command" required, but Partial<> makes it optional
	params: Partial<Pick<Record<ToolParamName, string>, "command" | "cwd">>
}

export interface ReadFileToolUse extends ToolUse {
	name: "read_file"
	params: Partial<Pick<Record<ToolParamName, string>, "args" | "path" | "start_line" | "end_line">>
}

export interface FetchInstructionsToolUse extends ToolUse {
	name: "fetch_instructions"
	params: Partial<Pick<Record<ToolParamName, string>, "task">>
}

export interface WriteToFileToolUse extends ToolUse {
	name: "write_to_file"
	params: Partial<Pick<Record<ToolParamName, string>, "path" | "content" | "line_count">>
}

export interface InsertCodeBlockToolUse extends ToolUse {
	name: "insert_content"
	params: Partial<Pick<Record<ToolParamName, string>, "path" | "line" | "content">>
}

export interface CodebaseSearchToolUse extends ToolUse {
	name: "codebase_search"
	params: Partial<Pick<Record<ToolParamName, string>, "query" | "path">>
}

export interface SearchFilesToolUse extends ToolUse {
	name: "search_files"
	params: Partial<Pick<Record<ToolParamName, string>, "path" | "regex" | "file_pattern">>
}

export interface ListFilesToolUse extends ToolUse {
	name: "list_files"
	params: Partial<Pick<Record<ToolParamName, string>, "path" | "recursive">>
}

export interface GlobToolUse extends ToolUse {
	name: "glob"
	params: Partial<Pick<Record<ToolParamName, string>, "pattern" | "path" | "head_limit">>
}

export interface ListCodeDefinitionNamesToolUse extends ToolUse {
	name: "list_code_definition_names"
	params: Partial<Pick<Record<ToolParamName, string>, "path">>
}

export interface BrowserActionToolUse extends ToolUse {
	name: "browser_action"
	params: Partial<Pick<Record<ToolParamName, string>, "action" | "url" | "coordinate" | "text" | "size">>
}

export interface UseMcpToolToolUse extends ToolUse {
	name: "use_mcp_tool"
	params: Partial<Pick<Record<ToolParamName, string>, "server_name" | "tool_name" | "arguments">>
}

export interface AccessMcpResourceToolUse extends ToolUse {
	name: "access_mcp_resource"
	params: Partial<Pick<Record<ToolParamName, string>, "server_name" | "uri">>
}

export interface AskFollowupQuestionToolUse extends ToolUse {
	name: "ask_followup_question"
	params: Partial<Pick<Record<ToolParamName, string>, "question" | "follow_up">>
}

export interface AttemptCompletionToolUse extends ToolUse {
	name: "attempt_completion"
	params: Partial<Pick<Record<ToolParamName, string>, "result">>
}

export interface SwitchModeToolUse extends ToolUse {
	name: "switch_mode"
	params: Partial<Pick<Record<ToolParamName, string>, "mode_slug" | "reason">>
}

export interface NewTaskToolUse extends ToolUse {
	name: "new_task"
	params: Partial<Pick<Record<ToolParamName, string>, "mode" | "message" | "todos">>
}

export interface SearchAndReplaceToolUse extends ToolUse {
	name: "search_and_replace"
	params: Required<Pick<Record<ToolParamName, string>, "path" | "search" | "replace">> &
		Partial<Pick<Record<ToolParamName, string>, "use_regex" | "ignore_case" | "start_line" | "end_line">>
}

export interface DebugToolUse extends ToolUse {
	name: "debug"
	params: Required<Pick<Record<ToolParamName, string>, "debug_operation">> &
		Partial<
			Pick<
				Record<ToolParamName, string>,
				| "_text" // Allow _text for XML content
				// Launch parameters
				| "program"
				| "mode"
				| "arg"
				| "args"
				| "cwd"
				| "env"
				| "stopOnEntry"
				// Breakpoint parameters
				| "path"
				| "line"
				| "column"
				| "condition"
				| "hitCondition"
				| "logMessage"
				| "enable"
				| "ignoreCount"
				// Frame parameters
				| "frameId"
				| "linesAround"
				| "expression"
				| "statement"
				| "context"
				// Stack frame variables parameters
				| "scopeFilter"
			>
		>
}

// For now, let's use a simpler approach that matches the factory pattern
export interface LspToolUse {
	type: "tool_use"
	name: "lsp"
	params: {
		lsp_operation: string
		_text?: string
		[key: string]: any // Allow any additional parameters for flexibility
	}
	partial: boolean
}

export interface GenerateImageToolUse extends ToolUse {
	name: "generate_image"
	params: Partial<Pick<Record<ToolParamName, string>, "prompt" | "path" | "image">>
}

// Define tool group configuration
export type ToolGroupConfig = {
	tools: readonly string[]
	alwaysAvailable?: boolean // Whether this group is always available and shouldn't show in prompts view
}

export const TOOL_DISPLAY_NAMES: Record<ToolName, string> = {
	execute_command: "run commands",
	read_file: "read files",
	fetch_instructions: "fetch instructions",
	fetch_tool_description: "fetch tool descriptions",
	write_to_file: "write files",
	apply_diff: "apply changes",
	search_files: "search files",
	list_files: "list files",
	glob: "find files by pattern",
	list_code_definition_names: "list definitions",
	browser_action: "use a browser",
	use_mcp_tool: "use mcp tools",
	access_mcp_resource: "access mcp resources",
	ask_followup_question: "ask questions",
	attempt_completion: "complete tasks",
	switch_mode: "switch modes",
	new_task: "create new task",
	insert_content: "insert content",
	search_and_replace: "search and replace",
	codebase_search: "codebase search",
	debug: "use debugger (internal)", // For internal DebugToolUse compatibility
	debug_launch: "debug: launch",
	debug_restart: "debug: restart",
	debug_quit: "debug: quit",
	debug_continue: "debug: continue",
	debug_next: "debug: next",
	debug_step_in: "debug: step in",
	debug_step_out: "debug: step out",
	debug_jump: "debug: jump",
	debug_until: "debug: until",
	debug_set_breakpoint: "debug: set breakpoint",
	debug_set_temp_breakpoint: "debug: set temp breakpoint",
	debug_remove_breakpoint: "debug: remove breakpoint",
	debug_remove_all_breakpoints_in_file: "debug: remove all breakpoints in file",
	debug_disable_breakpoint: "debug: disable breakpoint",
	debug_enable_breakpoint: "debug: enable breakpoint",
	debug_ignore_breakpoint: "debug: ignore breakpoint",
	debug_set_breakpoint_condition: "debug: set breakpoint condition",
	debug_get_active_breakpoints: "debug: get active breakpoints",
	debug_stack_trace: "debug: stack trace",
	debug_list_source: "debug: list source",
	debug_up: "debug: up",
	debug_down: "debug: down",
	debug_goto_frame: "debug: goto frame",
	debug_get_source: "debug: get source",
	debug_get_stack_frame_variables: "debug: get stack frame variables",
	debug_get_args: "debug: get args",
	debug_evaluate: "debug: evaluate",
	debug_pretty_print: "debug: pretty print",
	debug_whatis: "debug: whatis",
	debug_execute_statement: "debug: execute statement",
	debug_get_last_stop_info: "debug: get last stop info",
	lsp_find_usages: "lsp: find usages",
	lsp_go_to_definition: "lsp: go to definition",
	lsp_find_implementations: "lsp: find implementations",
	lsp_get_hover_info: "lsp: get hover info",
	lsp_get_document_symbols: "lsp: get document symbols",
	lsp_get_completions: "lsp: get completions",
	lsp_get_signature_help: "lsp: get signature help",
	lsp_rename: "lsp: rename",
	lsp_get_code_actions: "lsp: get code actions",
	lsp_get_semantic_tokens: "lsp: get semantic tokens",
	lsp_get_call_hierarchy: "lsp: get call hierarchy",
	lsp_get_type_hierarchy: "lsp: get type hierarchy",
	lsp_get_code_lens: "lsp: get code lens",
	lsp_get_selection_range: "lsp: get selection range",
	lsp_get_type_definition: "lsp: get type definition",
	lsp_get_declaration: "lsp: get declaration",
	lsp_get_document_highlights: "lsp: get document highlights",
	lsp_get_workspace_symbols: "lsp: get workspace symbols",
	lsp_get_symbol_code_snippet: "lsp: get symbol code snippet",
	lsp_get_symbol_children: "lsp: get symbol children",
	lsp_search_symbols: "lsp: search symbols",
	lsp_get_symbols_overview: "lsp: get symbols overview",
	lsp_insert_after_symbol: "lsp: insert after symbol",
	lsp_insert_before_symbol: "lsp: insert before symbol",
	lsp_replace_symbol_body: "lsp: replace symbol body",
	subagent: "subagent",
	update_todo_list: "update todo list",
	generate_image: "generate images",
} as const

// Define available tool groups.
export const TOOL_GROUPS: Record<ToolGroup, ToolGroupConfig> = {
	lsp: {
		tools: [
			"lsp_find_usages",
			"lsp_go_to_definition",
			"lsp_find_implementations",
			"lsp_get_hover_info",
			"lsp_get_document_symbols",
			"lsp_get_completions",
			"lsp_get_signature_help",
			"lsp_rename",
			"lsp_get_code_actions",
			"lsp_get_semantic_tokens",
			"lsp_get_call_hierarchy",
			"lsp_get_type_hierarchy",
			"lsp_get_code_lens",
			"lsp_get_selection_range",
			"lsp_get_type_definition",
			"lsp_get_declaration",
			"lsp_get_document_highlights",
			"lsp_get_workspace_symbols",
			"lsp_get_symbol_code_snippet",
			"lsp_get_symbol_children",
			"lsp_search_symbols",
			"lsp_get_symbols_overview",
			"lsp_insert_after_symbol",
			"lsp_insert_before_symbol",
			"lsp_replace_symbol_body",
		],
	},
	read: {
		tools: [
			"read_file",
			"fetch_instructions",
			"search_files",
			"list_files",
			"glob",
			"list_code_definition_names",
			"codebase_search",
		],
	},
	edit: {
		tools: ["apply_diff", "write_to_file", "insert_content", "search_and_replace", "generate_image"],
	},
	browser: {
		tools: ["browser_action"],
	},
	command: {
		tools: ["execute_command"],
	},
	mcp: {
		tools: ["use_mcp_tool", "access_mcp_resource"],
	},
	debug: {
		tools: [
			"debug_launch",
			"debug_restart",
			"debug_quit",
			"debug_continue",
			"debug_next",
			"debug_step_in",
			"debug_step_out",
			"debug_jump",
			"debug_until",
			"debug_set_breakpoint",
			"debug_set_temp_breakpoint",
			"debug_remove_breakpoint",
			"debug_remove_all_breakpoints_in_file",
			"debug_disable_breakpoint",
			"debug_enable_breakpoint",
			"debug_ignore_breakpoint",
			"debug_set_breakpoint_condition",
			"debug_get_active_breakpoints",
			"debug_stack_trace",
			"debug_list_source",
			"debug_up",
			"debug_down",
			"debug_goto_frame",
			"debug_get_source",
			"debug_get_stack_frame_variables",
			"debug_get_args",
			"debug_evaluate",
			"debug_pretty_print",
			"debug_whatis",
			"debug_execute_statement",
			"debug_get_last_stop_info",
		],
	},
	modes: {
		tools: ["switch_mode", "new_task"],
		alwaysAvailable: true,
	},
}

// Tools that are always available to all modes.
export const ALWAYS_AVAILABLE_TOOLS: ToolName[] = [
	"ask_followup_question",
	"attempt_completion",
	"switch_mode",
	"new_task",
	"subagent",
	"update_todo_list",
	"fetch_tool_description",
	"lsp_get_document_symbols",
	"lsp_get_symbol_code_snippet",
	"glob",
	"list_files",
	"search_files",
] as const

export type DiffResult =
	| { success: true; content: string; failParts?: DiffResult[] }
	| ({
			success: false
			error?: string
			details?: {
				similarity?: number
				threshold?: number
				matchedRange?: { start: number; end: number }
				searchContent?: string
				bestMatch?: string
			}
			failParts?: DiffResult[]
	  } & ({ error: string } | { failParts: DiffResult[] }))

export interface DiffItem {
	content: string
	startLine?: number
}

export interface DiffStrategy {
	/**
	 * Get the name of this diff strategy for analytics and debugging
	 * @returns The name of the diff strategy
	 */
	getName(): string

	/**
	 * Get the tool description for this diff strategy
	 * @param args The tool arguments including cwd and toolOptions
	 * @returns The complete tool description including format requirements and examples
	 */
	getToolDescription(args: { cwd: string; toolOptions?: { [key: string]: string } }): string

	/**
	 * Apply a diff to the original content
	 * @param originalContent The original file content
	 * @param diffContent The diff content in the strategy's format (string for legacy, DiffItem[] for new)
	 * @param startLine Optional line number where the search block starts. If not provided, searches the entire file.
	 * @param endLine Optional line number where the search block ends. If not provided, searches the entire file.
	 * @returns A DiffResult object containing either the successful result or error details
	 */
	applyDiff(
		originalContent: string,
		diffContent: string | DiffItem[],
		startLine?: number,
		endLine?: number,
	): Promise<DiffResult>

	getProgressStatus?(toolUse: ToolUse, result?: any): ToolProgressStatus
}
