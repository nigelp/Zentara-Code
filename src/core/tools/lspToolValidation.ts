import { z } from "zod"
import {
	FindUsagesParamsSchema,
	GoToDefinitionParamsSchema,
	FindImplementationsParamsSchema,
	GetHoverInfoParamsSchema,
	GetDocumentSymbolsParamsSchema,
	GetCompletionsParamsSchema,
	GetSignatureHelpParamsSchema,
	RenameParamsSchema,
	GetCodeActionsParamsSchema,
	GetSemanticTokensParamsSchema,
	GetCallHierarchyParamsSchema,
	GetTypeHierarchyParamsSchema,
	GetCodeLensParamsSchema,
	GetSelectionRangeParamsSchema,
	GetTypeDefinitionParamsSchema,
	GetDeclarationParamsSchema,
	GetDocumentHighlightsParamsSchema,
	GetWorkspaceSymbolsParamsSchema,
	GetSymbolCodeSnippetParamsSchema,
	GetSymbolChildrenParamsSchema,
	GetSymbolsParamsSchema,
	GetSymbolsOverviewParamsSchema,
	InsertAfterSymbolParamsSchema,
	InsertBeforeSymbolParamsSchema,
	ReplaceSymbolBodyParamsSchema,
} from "../../zentara_lsp/src/types"

type ValidationResult = {
	isValid: boolean
	message?: string
	transformedArgs?: any
}

const operationSchemas: Record<string, z.ZodSchema<any>> = {
	find_usages: FindUsagesParamsSchema,
	go_to_definition: GoToDefinitionParamsSchema,
	find_implementations: FindImplementationsParamsSchema,
	get_hover_info: GetHoverInfoParamsSchema,
	get_document_symbols: GetDocumentSymbolsParamsSchema,
	get_completions: GetCompletionsParamsSchema,
	get_signature_help: GetSignatureHelpParamsSchema,
	rename: RenameParamsSchema,
	get_code_actions: GetCodeActionsParamsSchema,
	get_semantic_tokens: GetSemanticTokensParamsSchema,
	get_call_hierarchy: GetCallHierarchyParamsSchema,
	get_type_hierarchy: GetTypeHierarchyParamsSchema,
	get_code_lens: GetCodeLensParamsSchema,
	lsp_get_code_lens: GetCodeLensParamsSchema,
	get_selection_range: GetSelectionRangeParamsSchema,
	lsp_get_selection_range: GetSelectionRangeParamsSchema,
	get_type_definition: GetTypeDefinitionParamsSchema,
	get_declaration: GetDeclarationParamsSchema,
	get_document_highlights: GetDocumentHighlightsParamsSchema,
	get_workspace_symbols: GetWorkspaceSymbolsParamsSchema,
	get_symbol_code_snippet: GetSymbolCodeSnippetParamsSchema,
	lsp_get_symbol_code_snippet: GetSymbolCodeSnippetParamsSchema,
	get_symbol_children: GetSymbolChildrenParamsSchema,
	lsp_get_symbol_children: GetSymbolChildrenParamsSchema,
	search_symbols: GetSymbolsParamsSchema,
	get_symbols_overview: GetSymbolsOverviewParamsSchema,
	insert_after_symbol: InsertAfterSymbolParamsSchema,
	insert_before_symbol: InsertBeforeSymbolParamsSchema,
	replace_symbol_body: ReplaceSymbolBodyParamsSchema,
}

export function validateLspOperationArgs(operation: string, args: any): ValidationResult {
	const schema = operationSchemas[operation]
	if (!schema) {
		return { isValid: false, message: `Unknown lsp operation: ${operation}` }
	}

	const validationResult = schema.safeParse(args)

	if (!validationResult.success) {
		return {
			isValid: false,
			message: `Invalid arguments for lsp operation '${operation}': ${validationResult.error.errors.map((e) => e.message).join(", ")}`,
		}
	}

	return { isValid: true, transformedArgs: validationResult.data }
}
