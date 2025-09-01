import {
	FindUsagesParams,
	Reference,
	GoToDefinitionParams,
	Location,
	FindImplementationsParams,
	GetHoverInfoParams,
	Hover,
	GetDocumentSymbolsParams,
	DocumentSymbol,
	GetCompletionsParams,
	CompletionItem,
	GetSignatureHelpParams,
	SignatureHelp,
	RenameParams,
	WorkspaceEdit,
	GetCodeActionsParams,
	CodeAction,
	GetSemanticTokensParams,
	SemanticToken,
	GetCallHierarchyParams,
	CallHierarchyItem,
	GetTypeHierarchyParams,
	TypeHierarchyItem,
	GetCodeLensParams,
	CodeLens,
	GetSelectionRangeParams,
	SelectionRange,
	GetTypeDefinitionParams,
	GetDeclarationParams,
	GetDocumentHighlightsParams,
	DocumentHighlight,
	GetWorkspaceSymbolsParams,
	WorkspaceSymbol,
	GetSymbolCodeSnippetParams,
	CodeSnippet,
	GetSymbolChildrenParams,
	GetSymbolsParams,
	Symbol,
	GetSymbolsOverviewParams,
	SymbolsOverview,
	InsertAfterSymbolParams,
	InsertBeforeSymbolParams,
	ReplaceSymbolBodyParams,
} from "./types"

export interface ILspController {
	insertAfterSymbol(params: InsertAfterSymbolParams): Promise<WorkspaceEdit | null>
	insertBeforeSymbol(params: InsertBeforeSymbolParams): Promise<WorkspaceEdit | null>
	replaceSymbolBody(params: ReplaceSymbolBodyParams): Promise<WorkspaceEdit | null>
	getSymbolsOverview(params: GetSymbolsOverviewParams): Promise<SymbolsOverview>
	findUsages(params: FindUsagesParams): Promise<string>
	goToDefinition(params: GoToDefinitionParams): Promise<Location[]>
	findImplementations(params: FindImplementationsParams): Promise<Location[]>
	getHoverInfo(params: GetHoverInfoParams): Promise<Hover | null>
	getDocumentSymbols(
		params: GetDocumentSymbolsParams,
	): Promise<{ success: false; error: string } | { success: true; symbols: string }>
	getCompletions(params: GetCompletionsParams): Promise<CompletionItem[]>
	getSignatureHelp(params: GetSignatureHelpParams): Promise<SignatureHelp | null>
	rename(params: RenameParams): Promise<WorkspaceEdit>
	getCodeActions(params: GetCodeActionsParams): Promise<CodeAction[]>
	getSemanticTokens(params: GetSemanticTokensParams): Promise<SemanticToken[] | null>
	getCallHierarchy(params: GetCallHierarchyParams): Promise<{ incomingCalls: string; outgoingCalls: string } | null>
	getTypeHierarchy(params: GetTypeHierarchyParams): Promise<TypeHierarchyItem | null>
	getCodeLens(params: GetCodeLensParams): Promise<CodeLens[]>
	getSelectionRange(params: GetSelectionRangeParams): Promise<SelectionRange[]>
	getTypeDefinition(params: GetTypeDefinitionParams): Promise<Location[]>
	getDeclaration(params: GetDeclarationParams): Promise<Location[]>
	getDocumentHighlights(params: GetDocumentHighlightsParams): Promise<DocumentHighlight[]>
	getWorkspaceSymbols(params: GetWorkspaceSymbolsParams): Promise<WorkspaceSymbol[]>
	getSymbolCodeSnippet(params: GetSymbolCodeSnippetParams): Promise<CodeSnippet | null>
	getSymbolChildren(params: GetSymbolChildrenParams): Promise<{ success: false; error: string } | { success: true; children: string }>
	getSymbols(params: GetSymbolsParams): Promise<Symbol[]>
}
