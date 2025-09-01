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
	GetSymbolsParams,
	Symbol,
	GetSymbolsOverviewParams,
	SymbolsOverview,
	InsertAfterSymbolParams,
	InsertBeforeSymbolParams,
	ReplaceSymbolBodyParams,
	GetSymbolCodeSnippetParams,
	CodeSnippet,
	GetSymbolChildrenParams,
} from "./types"
import { getSymbolsOverview as getSymbolsOverviewLogic } from "./controller/getSymbolsOverview"
import { findUsages as findUsagesLogic } from "./controller/findUsages"
import { goToDefinition as goToDefinitionLogic } from "./controller/goToDefinition"
import { findImplementations as findImplementationsLogic } from "./controller/findImplementations"
import { getHoverInfo as getHoverInfoLogic } from "./controller/getHoverInfo"
import { getDocumentSymbols as getDocumentSymbolsLogic } from "./controller/getDocumentSymbols"
import { getCompletions as getCompletionsLogic } from "./controller/getCompletions"
import { getSignatureHelp as getSignatureHelpLogic } from "./controller/getSignatureHelp"
import { rename as renameLogic } from "./controller/rename"
import { getCodeActions as getCodeActionsLogic } from "./controller/getCodeActions"
import { getSemanticTokens as getSemanticTokensLogic } from "./controller/getSemanticTokens"
import { getCallHierarchy as getCallHierarchyLogic } from "./controller/getCallHierarchy"
import { getTypeHierarchy as getTypeHierarchyLogic } from "./controller/getTypeHierarchy"
import { getCodeLens as getCodeLensLogic } from "./controller/getCodeLens"
import { getSelectionRange as getSelectionRangeLogic } from "./controller/getSelectionRange"
import { getTypeDefinition as getTypeDefinitionLogic } from "./controller/getTypeDefinition"
import { getDeclaration as getDeclarationLogic } from "./controller/getDeclaration"
import { getDocumentHighlights as getDocumentHighlightsLogic } from "./controller/getDocumentHighlights"
import { getWorkspaceSymbols as getWorkspaceSymbolsLogic } from "./controller/getWorkspaceSymbols"
import { getSymbols as getSymbolsLogic } from "./controller/get_symbols"
import { createSymbolCodeSnippetController, SymbolCodeSnippetController } from "./controller/getSymbolCodeSnippet"
import { getSymbolChildren as getSymbolChildrenLogic } from "./controller/getSymbolChildren"
import { insertAfterSymbol as insertAfterSymbolLogic } from "./controller/insertAfterSymbol"
import { insertBeforeSymbol as insertBeforeSymbolLogic } from "./controller/insertBeforeSymbol"
import { replaceSymbolBody as replaceSymbolBodyLogic } from "./controller/replaceSymbolBody"
import { ILspController } from "./ILspController"
import { logInfo, logError } from "./logging"
import { stringifySafe } from "./vscodeUtils"

class LspController implements ILspController {
	private symbolCodeSnippetController: SymbolCodeSnippetController

	public async insertAfterSymbol(params: InsertAfterSymbolParams): Promise<WorkspaceEdit | null> {
		logInfo(`insertAfterSymbol called with params: ${stringifySafe(params)}`)
		try {
			return await insertAfterSymbolLogic(params)
		} catch (error) {
			logError("Error in insertAfterSymbol", error)
			throw error
		}
	}

	public async insertBeforeSymbol(params: InsertBeforeSymbolParams): Promise<WorkspaceEdit | null> {
		logInfo(`insertBeforeSymbol called with params: ${stringifySafe(params)}`)
		try {
			return await insertBeforeSymbolLogic(params)
		} catch (error) {
			logError("Error in insertBeforeSymbol", error)
			throw error
		}
	}

	public async replaceSymbolBody(params: ReplaceSymbolBodyParams): Promise<WorkspaceEdit | null> {
		logInfo(`replaceSymbolBody called with params: ${stringifySafe(params)}`)
		try {
			return await replaceSymbolBodyLogic(params)
		} catch (error) {
			logError("Error in replaceSymbolBody", error)
			throw error
		}
	}
	private static _instance: LspController

	private constructor() {
		logInfo("LspController instance created.")
		this.symbolCodeSnippetController = createSymbolCodeSnippetController(this, this)
	}

	public static getInstance(): LspController {
		if (!LspController._instance) {
			LspController._instance = new LspController()
		}
		return LspController._instance
	}

	public async getSymbolsOverview(params: GetSymbolsOverviewParams): Promise<SymbolsOverview> {
		logInfo(`getSymbolsOverview called with params: ${stringifySafe(params)}`)
		try {
			return await getSymbolsOverviewLogic(params)
		} catch (error) {
			logError("Error in getSymbolsOverview", error)
			throw error
		}
	}

	public async findUsages(params: FindUsagesParams): Promise<string> {
		logInfo(`findUsages called with params: ${stringifySafe(params)}`)
		try {
			return await findUsagesLogic(params)
		} catch (error) {
			logError("Error in findUsages", error)
			throw error
		}
	}

	public async goToDefinition(params: GoToDefinitionParams): Promise<Location[]> {
		logInfo(`goToDefinition called with params: ${stringifySafe(params)}`)
		try {
			return await goToDefinitionLogic(params)
		} catch (error) {
			logError("Error in goToDefinition", error)
			throw error
		}
	}

	public async findImplementations(params: FindImplementationsParams): Promise<Location[]> {
		logInfo(`findImplementations called with params: ${stringifySafe(params)}`)
		try {
			return await findImplementationsLogic(params)
		} catch (error) {
			logError("Error in findImplementations", error)
			throw error
		}
	}

	public async getHoverInfo(params: GetHoverInfoParams): Promise<Hover | null> {
		logInfo(`getHoverInfo called with params: ${stringifySafe(params)}`)
		try {
			return await getHoverInfoLogic(params)
		} catch (error) {
			logError("Error in getHoverInfo", error)
			throw error
		}
	}

	public async getDocumentSymbols(
		params: GetDocumentSymbolsParams,
	): Promise<{ success: false; error: string } | { success: true; symbols: string }> {
		logInfo(`getDocumentSymbols called with params: ${stringifySafe(params)}`)
		try {
			return await getDocumentSymbolsLogic(params)
		} catch (error) {
			logError("Error in getDocumentSymbols", error)
			throw error
		}
	}

	public async getCompletions(params: GetCompletionsParams): Promise<CompletionItem[]> {
		logInfo(`getCompletions called with params: ${stringifySafe(params)}`)
		try {
			return await getCompletionsLogic(params)
		} catch (error) {
			logError("Error in getCompletions", error)
			throw error
		}
	}

	public async getSignatureHelp(params: GetSignatureHelpParams): Promise<SignatureHelp | null> {
		logInfo(`getSignatureHelp called with params: ${stringifySafe(params)}`)
		try {
			return await getSignatureHelpLogic(params)
		} catch (error) {
			logError("Error in getSignatureHelp", error)
			throw error
		}
	}

	public async rename(params: RenameParams): Promise<WorkspaceEdit> {
		logInfo(`rename called with params: ${stringifySafe(params)}`)
		try {
			return await renameLogic(params)
		} catch (error) {
			logError("Error in rename", error)
			throw error
		}
	}

	public async getCodeActions(params: GetCodeActionsParams): Promise<CodeAction[]> {
		logInfo(`getCodeActions called with params: ${stringifySafe(params)}`)
		try {
			return await getCodeActionsLogic(params)
		} catch (error) {
			logError("Error in getCodeActions", error)
			throw error
		}
	}

	public async getSemanticTokens(params: GetSemanticTokensParams): Promise<SemanticToken[] | null> {
		logInfo(`getSemanticTokens called with params: ${stringifySafe(params)}`)
		try {
			return await getSemanticTokensLogic(params)
		} catch (error) {
			logError("Error in getSemanticTokens", error)
			throw error
		}
	}

	public async getCallHierarchy(params: GetCallHierarchyParams): Promise<{ incomingCalls: string; outgoingCalls: string } | null> {
		logInfo(`getCallHierarchy called with params: ${stringifySafe(params)}`)
		try {
			return await getCallHierarchyLogic(params)
		} catch (error) {
			logError("Error in getCallHierarchy", error)
			return null
		}
	}

	public async getTypeHierarchy(params: GetTypeHierarchyParams): Promise<TypeHierarchyItem | null> {
		logInfo(`getTypeHierarchy called with params: ${stringifySafe(params)}`)
		try {
			return await getTypeHierarchyLogic(params)
		} catch (error) {
			logError("Error in getTypeHierarchy", error)
			throw error
		}
	}

	public async getCodeLens(params: GetCodeLensParams): Promise<CodeLens[]> {
		logInfo(`getCodeLens called with params: ${stringifySafe(params)}`)
		try {
			return await getCodeLensLogic(params)
		} catch (error) {
			logError("Error in getCodeLens", error)
			throw error
		}
	}

	public async getSelectionRange(params: GetSelectionRangeParams): Promise<SelectionRange[]> {
		logInfo(`getSelectionRange called with params: ${stringifySafe(params)}`)
		try {
			return await getSelectionRangeLogic(params)
		} catch (error) {
			logError("Error in getSelectionRange", error)
			throw error
		}
	}

	public async getTypeDefinition(params: GetTypeDefinitionParams): Promise<Location[]> {
		logInfo(`getTypeDefinition called with params: ${stringifySafe(params)}`)
		try {
			return await getTypeDefinitionLogic(params)
		} catch (error) {
			logError("Error in getTypeDefinition", error)
			throw error
		}
	}

	public async getDeclaration(params: GetDeclarationParams): Promise<Location[]> {
		logInfo(`getDeclaration called with params: ${stringifySafe(params)}`)
		try {
			return await getDeclarationLogic(params)
		} catch (error) {
			logError("Error in getDeclaration", error)
			throw error
		}
	}

	public async getDocumentHighlights(params: GetDocumentHighlightsParams): Promise<DocumentHighlight[]> {
		logInfo(`getDocumentHighlights called with params: ${stringifySafe(params)}`)
		try {
			return await getDocumentHighlightsLogic(params)
		} catch (error) {
			logError("Error in getDocumentHighlights", error)
			throw error
		}
	}

	public async getWorkspaceSymbols(params: GetWorkspaceSymbolsParams): Promise<WorkspaceSymbol[]> {
		logInfo(`getWorkspaceSymbols called with params: ${stringifySafe(params)}`)
		try {
			return await getWorkspaceSymbolsLogic(params)
		} catch (error) {
			logError("Error in getWorkspaceSymbols", error)
			throw error
		}
	}

	public async getSymbolCodeSnippet(params: GetSymbolCodeSnippetParams): Promise<CodeSnippet | null> {
		logInfo(`getSymbolCodeSnippet called with params: ${stringifySafe(params)}`)
		try {
			return await this.symbolCodeSnippetController.getSymbolCodeSnippet(params)
		} catch (error) {
			logError("Error in getSymbolCodeSnippet", error)
			throw error
		}
	}

	public async getSymbolChildren(params: GetSymbolChildrenParams): Promise<{ success: false; error: string } | { success: true; children: string }> {
		logInfo(`getSymbolChildren called with params: ${stringifySafe(params)}`)
		try {
			return await getSymbolChildrenLogic(params)
		} catch (error) {
			logError("Error in getSymbolChildren", error)
			throw error
		}
	}

	public async getSymbols(params: GetSymbolsParams): Promise<Symbol[]> {
		logInfo(`getSymbols called with params: ${stringifySafe(params)}`)
		try {
			return await getSymbolsLogic(params)
		} catch (error) {
			logError("Error in getSymbols", error)
			throw error
		}
	}
}

export const lspController = LspController.getInstance()
