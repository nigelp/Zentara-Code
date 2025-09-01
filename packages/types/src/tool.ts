import { z } from "zod"

/**
 * ToolGroup
 */

export const toolGroups = ["read", "edit", "browser", "command", "mcp", "modes", "debug", "lsp"] as const

export const toolGroupsSchema = z.enum(toolGroups)

export type ToolGroup = z.infer<typeof toolGroupsSchema>

/**
 * ToolName
 */

export const toolNames = [
	"execute_command",
	"read_file",
	"write_to_file",
	"apply_diff",
	"insert_content",
	"search_and_replace",
	"search_files",
	"list_files",
	"glob",
	"list_code_definition_names",
	"browser_action",
	"use_mcp_tool",
	"access_mcp_resource",
	"ask_followup_question",
	"attempt_completion",
	"switch_mode",
	"new_task",
	"fetch_instructions",
	"fetch_tool_description",
	"codebase_search",
	"debug",
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
	"subagent",
	"update_todo_list",
	"generate_image",
] as const

export const toolNamesSchema = z.enum(toolNames)

export type ToolName = z.infer<typeof toolNamesSchema>

/**
 * ToolUsage
 */

export const toolUsageSchema = z.record(
	toolNamesSchema,
	z.object({
		attempts: z.number(),
		failures: z.number(),
	}),
)

export type ToolUsage = z.infer<typeof toolUsageSchema>
