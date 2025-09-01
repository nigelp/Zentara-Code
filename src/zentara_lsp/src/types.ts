import { z } from "zod"

const TextDocumentSchema = z.object({
	uri: z.string().describe("URI of the document (file:///path/to/file format)"),
})

const PositionSchema = z.object({
	line: z.number().describe("One-based line number"),
	character: z.number().describe("Zero-based character position"),
})

const ContextSchema = z.object({
	includeDeclaration: z
		.boolean()
		.optional()
		.default(true)
		.describe("Whether to include the declaration of the symbol in the results"),
})

// Legacy schema for backward compatibility (nested structure)
export const FindUsagesParamsLegacySchema = z.object({
	textDocument: TextDocumentSchema,
	position: PositionSchema,
	context: ContextSchema.optional(),
})

export const FindUsagesParamsSchema = z.union([
	// Legacy format with textDocument and position objects
	FindUsagesParamsLegacySchema,
	// New flattened format with symbolName support
	z.object({
		// Required URI parameter
		uri: z.string().min(1, "URI is required"),
		
		// Position-based lookup parameters (optional)
		line: z.number().int().min(0, "Line must be non-negative").optional(),
		character: z.number().int().min(0, "Character must be non-negative").optional(),
		
		// Name-based lookup parameter (optional)
		symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
		
		// Optional context parameter
		context: ContextSchema.optional(),
	}).refine(
		(data) =>
			(data.line !== undefined && data.character !== undefined) ||
			(data.symbolName !== undefined && data.symbolName.trim() !== ''),
		{
			message: "Either 'line'/'character' or 'symbolName' must be provided",
		}
	)
])

export type FindUsagesParams = z.infer<typeof FindUsagesParamsSchema>
export type FindUsagesParamsLegacy = z.infer<typeof FindUsagesParamsLegacySchema>

export const GoToDefinitionParamsSchema = z.object({
	// Required URI parameter
	uri: z.string().min(1, "URI is required"),
	
	// Position-based lookup parameters (optional)
	line: z.number().int().min(0, "Line must be non-negative").optional(),
	character: z.number().int().min(0, "Character must be non-negative").optional(),
	
	// Name-based lookup parameter (optional)
	symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
}).refine(
	(data) =>
		(data.line !== undefined && data.character !== undefined) ||
		(data.symbolName !== undefined && data.symbolName.trim() !== ''),
	{
		message: "Either 'line'/'character' or 'symbolName' must be provided",
	}
)

export type GoToDefinitionParams = z.infer<typeof GoToDefinitionParamsSchema>

// Legacy schema for backward compatibility
export const GoToDefinitionParamsLegacySchema = z.object({
	textDocument: TextDocumentSchema,
	position: PositionSchema,
})

export type GoToDefinitionParamsLegacy = z.infer<typeof GoToDefinitionParamsLegacySchema>

// New flattened schema with symbolName support  
export const FindImplementationsParamsSchema = z.object({
	// Required URI parameter
	uri: z.string().min(1, "URI is required"),
	
	// Position-based lookup parameters (optional)
	line: z.number().int().min(0, "Line must be non-negative").optional(),
	character: z.number().int().min(0, "Character must be non-negative").optional(),
	
	// Name-based lookup parameter (optional)
	symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
}).refine(
	(data) =>
		(data.line !== undefined && data.character !== undefined) ||
		(data.symbolName !== undefined && data.symbolName.trim() !== ''),
	{
		message: "Either 'line'/'character' or 'symbolName' must be provided",
	}
)

export type FindImplementationsParams = z.infer<typeof FindImplementationsParamsSchema>

// Legacy schema for backward compatibility
export const FindImplementationsParamsLegacySchema = z.object({
	textDocument: TextDocumentSchema,
	position: PositionSchema,
})

export type FindImplementationsParamsLegacy = z.infer<typeof FindImplementationsParamsLegacySchema>

// getHoverInfo with flattened parameters (LLM-friendly) and name-based lookup support
export const GetHoverInfoParamsSchema = z.object({
	// Required URI parameter
	uri: z.string().min(1, "URI is required"),
	
	// Position-based lookup parameters (optional)
	line: z.number().int().min(0, "Line must be non-negative").optional(),
	character: z.number().int().min(0, "Character must be non-negative").optional(),
	
	// Name-based lookup parameter (optional)
	symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
}).refine(
	(data) => 
		(data.line !== undefined && data.character !== undefined) || 
		(data.symbolName !== undefined && data.symbolName.trim() !== ''),
	{
		message: "Either 'line'/'character' or 'symbolName' must be provided",
	}
)

export type GetHoverInfoParams = z.infer<typeof GetHoverInfoParamsSchema>

export const GetDocumentSymbolsParamsSchema = z.object({
	textDocument: TextDocumentSchema,
	return_children: z.enum(["yes", "no", "auto"]).optional().default("no"),
	include_hover: z.boolean().optional().default(true),
	threshold: z.number().int().min(1).optional().default(5),
})

export type GetDocumentSymbolsParams = {
	textDocument: { uri: string }
	return_children?: "yes" | "no" | "auto"
	include_hover?: boolean
	threshold?: number
}

// Legacy schema for backward compatibility (nested structure)
export const GetCompletionsParamsLegacySchema = z.object({
	textDocument: TextDocumentSchema,
	position: PositionSchema,
	triggerCharacter: z.string().optional().describe("Optional trigger character that caused completion"),
})

export const GetCompletionsParamsSchema = z.union([
	// Legacy format with textDocument and position objects
	GetCompletionsParamsLegacySchema,
	// New flattened format with symbolName support
	z.object({
		// Required URI parameter
		uri: z.string().min(1, "URI is required"),
		
		// Position-based lookup parameters (optional)
		line: z.number().int().min(0, "Line must be non-negative").optional(),
		character: z.number().int().min(0, "Character must be non-negative").optional(),
		
		// Name-based lookup parameter (optional)
		symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
		
		// Optional trigger character parameter
		triggerCharacter: z.string().optional().describe("Optional trigger character that caused completion"),
	}).refine(
		(data) => 
			(data.line !== undefined && data.character !== undefined) || 
			(data.symbolName !== undefined && data.symbolName.trim() !== ''),
		{
			message: "Either 'line'/'character' or 'symbolName' must be provided",
		}
	)
])

export type GetCompletionsParams = z.infer<typeof GetCompletionsParamsSchema>
export type GetCompletionsParamsLegacy = z.infer<typeof GetCompletionsParamsLegacySchema>

export const GetSignatureHelpParamsSchema = z.object({
	// Required URI parameter
	uri: z.string().min(1, "URI is required"),
	
	// Position-based lookup parameters (optional)
	line: z.number().int().min(0, "Line must be non-negative").optional(),
	character: z.number().int().min(0, "Character must be non-negative").optional(),
	
	// Name-based lookup parameter (optional)
	symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
}).refine(
	(data) => 
		(data.line !== undefined && data.character !== undefined) || 
		(data.symbolName !== undefined && data.symbolName.trim() !== ''),
	{
		message: "Either 'line'/'character' or 'symbolName' must be provided",
	}
)

export type GetSignatureHelpParams = z.infer<typeof GetSignatureHelpParamsSchema>

// Legacy schema for backward compatibility
export const RenameParamsLegacySchema = z.object({
	textDocument: TextDocumentSchema,
	position: PositionSchema,
	newName: z.string().describe("The new name for the symbol"),
})

export type RenameParamsLegacy = z.infer<typeof RenameParamsLegacySchema>

export const RenameParamsSchema = z.union([
	// Legacy format with textDocument and position objects
	RenameParamsLegacySchema,
	// New flattened format with symbolName support
	z.object({
		// Required URI parameter
		uri: z.string().min(1, "URI is required"),
		
		// Position-based lookup parameters (optional)
		line: z.number().int().min(0, "Line must be non-negative").optional(),
		character: z.number().int().min(0, "Character must be non-negative").optional(),
		
		// Name-based lookup parameter (optional)
		symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
		
		// Required new name parameter
		newName: z.string().min(1, "New name is required").describe("The new name for the symbol"),
	}).refine(
		(data) => 
			(data.line !== undefined && data.character !== undefined) || 
			(data.symbolName !== undefined && data.symbolName.trim() !== ''),
		{
			message: "Either 'line'/'character' or 'symbolName' must be provided",
		}
	)
])

export type RenameParams = z.infer<typeof RenameParamsSchema>

// getCodeActions with flattened parameters (LLM-friendly) and name-based lookup support
export const GetCodeActionsParamsSchema = z.object({
	// Required URI parameter
	uri: z.string().min(1, "URI is required"),
	
	// Position-based lookup parameters (optional)
	line: z.number().int().min(0, "Line must be non-negative").optional(),
	character: z.number().int().min(0, "Character must be non-negative").optional(),
	
	// Name-based lookup parameter (optional)
	symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
}).refine(
	(data) => 
		(data.line !== undefined && data.character !== undefined) || 
		(data.symbolName !== undefined && data.symbolName.trim() !== ''),
	{
		message: "Either 'line'/'character' or 'symbolName' must be provided",
	}
)

export type GetCodeActionsParams = z.infer<typeof GetCodeActionsParamsSchema>

// Legacy schema for backward compatibility
export const GetCodeActionsParamsLegacySchema = z.object({
	textDocument: TextDocumentSchema,
	position: PositionSchema,
})

export type GetCodeActionsParamsLegacy = z.infer<typeof GetCodeActionsParamsLegacySchema>

export const GetSemanticTokensParamsSchema = z.object({
	textDocument: TextDocumentSchema,
})

export type GetSemanticTokensParams = z.infer<typeof GetSemanticTokensParamsSchema>

export const GetCallHierarchyParamsSchema = z.object({
	// Required URI parameter
	uri: z.string().min(1, "URI is required"),
	
	// Position-based lookup parameters (optional)
	line: z.number().int().min(0, "Line must be non-negative").optional(),
	character: z.number().int().min(0, "Character must be non-negative").optional(),
	
	// Name-based lookup parameter (optional)
	symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
}).refine(
	(data) =>
		(data.line !== undefined && data.character !== undefined) ||
		(data.symbolName !== undefined && data.symbolName.trim() !== ''),
	{
		message: "Either 'line'/'character' or 'symbolName' must be provided",
	}
)

export type GetCallHierarchyParams = z.infer<typeof GetCallHierarchyParamsSchema>

export const GetTypeHierarchyParamsSchema = z.union([
	// Legacy format with textDocument and position objects
	z.object({
		textDocument: TextDocumentSchema,
		position: PositionSchema,
	}),
	// New flattened format with symbolName support
	z.object({
		// Required URI parameter
		uri: z.string().min(1, "URI is required"),
		
		// Position-based lookup parameters (optional)
		line: z.number().int().min(0, "Line must be non-negative").optional(),
		character: z.number().int().min(0, "Character must be non-negative").optional(),
		
		// Name-based lookup parameter (optional)
		symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
	}).refine(
		(data) =>
			(data.line !== undefined && data.character !== undefined) ||
			(data.symbolName !== undefined && data.symbolName.trim() !== ''),
		{
			message: "Either 'line'/'character' or 'symbolName' must be provided",
		}
	)
]);

export type GetTypeHierarchyParams = z.infer<typeof GetTypeHierarchyParamsSchema>

export const GetCodeLensParamsSchema = z.object({
	textDocument: TextDocumentSchema,
})

export type GetCodeLensParams = z.infer<typeof GetCodeLensParamsSchema>

export const GetSelectionRangeParamsSchema = z.union([
	// Legacy format with textDocument and position objects
	z.object({
		textDocument: TextDocumentSchema,
		position: PositionSchema,
	}),
	// New unified format with optional symbolName support
	z.object({
		// Required URI parameter
		uri: z.string().min(1, "URI is required"),
		
		// Position-based lookup parameters (optional)
		line: z.number().int().min(0, "Line must be non-negative").optional(),
		character: z.number().int().min(0, "Character must be non-negative").optional(),
		
		// Name-based lookup parameter (optional)
		symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
	}).refine(
		(data) => {
			// Must have either position (line + character) OR symbolName
			const hasPosition = data.line !== undefined && data.character !== undefined;
			const hasSymbolName = data.symbolName !== undefined;
			return hasPosition || hasSymbolName;
		},
		{
			message: "Either 'line'/'character' or 'symbolName' must be provided",
		}
	),
])

export type GetSelectionRangeParams = z.infer<typeof GetSelectionRangeParamsSchema>

export const GetTypeDefinitionParamsSchema = z.object({
	// Required URI parameter
	uri: z.string().min(1, "URI is required"),
	
	// Position-based lookup parameters (optional)
	line: z.number().int().min(0, "Line must be non-negative").optional(),
	character: z.number().int().min(0, "Character must be non-negative").optional(),
	
	// Name-based lookup parameter (optional)
	symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
}).refine(
	(data) =>
		(data.line !== undefined && data.character !== undefined) ||
		(data.symbolName !== undefined && data.symbolName.trim() !== ''),
	{
		message: "Either 'line'/'character' or 'symbolName' must be provided",
	}
)

export type GetTypeDefinitionParams = z.infer<typeof GetTypeDefinitionParamsSchema>

// Legacy schema for backward compatibility
export const GetTypeDefinitionParamsLegacySchema = z.object({
	textDocument: TextDocumentSchema,
	position: PositionSchema,
})

export type GetTypeDefinitionParamsLegacy = z.infer<typeof GetTypeDefinitionParamsLegacySchema>

export const GetDeclarationParamsSchema = z.object({
	// Required URI parameter
	uri: z.string().min(1, "URI is required"),
	
	// Position-based lookup parameters (optional)
	line: z.number().int().min(0, "Line must be non-negative").optional(),
	character: z.number().int().min(0, "Character must be non-negative").optional(),
	
	// Name-based lookup parameter (optional)
	symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
}).refine(
	(data) =>
		(data.line !== undefined && data.character !== undefined) ||
		(data.symbolName !== undefined && data.symbolName.trim() !== ''),
	{
		message: "Either 'line'/'character' or 'symbolName' must be provided",
	}
)

export type GetDeclarationParams = z.infer<typeof GetDeclarationParamsSchema>

// Legacy schema for backward compatibility
export const GetDeclarationParamsLegacySchema = z.object({
	textDocument: TextDocumentSchema,
	position: PositionSchema,
})

export type GetDeclarationParamsLegacy = z.infer<typeof GetDeclarationParamsLegacySchema>

export const GetDocumentHighlightsParamsSchema = z.object({
	// Required URI parameter
	uri: z.string().min(1, "URI is required"),
	
	// Position-based lookup parameters (optional)
	line: z.number().int().min(0, "Line must be non-negative").optional(),
	character: z.number().int().min(0, "Character must be non-negative").optional(),
	
	// Name-based lookup parameter (optional)
	symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
}).refine(
	(data) => 
		(data.line !== undefined && data.character !== undefined) || 
		(data.symbolName !== undefined && data.symbolName.trim() !== ''),
	{
		message: "Either 'line'/'character' or 'symbolName' must be provided",
	}
)

export type GetDocumentHighlightsParams = z.infer<typeof GetDocumentHighlightsParamsSchema>

// Legacy schema for backward compatibility
export const GetDocumentHighlightsParamsLegacySchema = z.object({
	textDocument: TextDocumentSchema,
	position: PositionSchema,
})

export type GetDocumentHighlightsParamsLegacy = z.infer<typeof GetDocumentHighlightsParamsLegacySchema>

export const GetWorkspaceSymbolsParamsSchema = z.object({
	query: z.string().describe("The search query for finding symbols"),
})

export type GetWorkspaceSymbolsParams = z.infer<typeof GetWorkspaceSymbolsParamsSchema>

export const GetSymbolsParamsSchema = z.object({
	name_path: z.string(),
	depth: z.number().optional(),
	relative_path: z.string().optional(),
	include_body: z.boolean().optional(),
	include_kinds: z.array(z.number()).optional(),
	exclude_kinds: z.array(z.number()).optional(),
	substring_matching: z.boolean().optional(),
	max_answer_chars: z.number().optional(),
})

export type GetSymbolsParams = z.infer<typeof GetSymbolsParamsSchema>

export const GetSymbolsOverviewParamsSchema = z.object({
	relative_path: z.string().describe("the relative path to the file or directory to get the overview of"),
	max_answer_chars: z
		.number()
		.optional()
		.describe(
			"if the overview is longer than this number of characters,no content will be returned. Don't adjust unless there is really no other way to get the content required for the task. If the overview is too long, you should use a smaller directory instead,(e.g. a subdirectory).",
		),
})
export type GetSymbolsOverviewParams = z.infer<typeof GetSymbolsOverviewParamsSchema>

const TopLevelSymbolSchema = z.object({
	name: z.string(),
	kind: z.number(),
})

export const SymbolsOverviewSchema = z.record(z.string(), z.array(TopLevelSymbolSchema))

export type SymbolsOverview = z.infer<typeof SymbolsOverviewSchema>

// Response Types
export const SelectionRangeSchema: z.ZodType<SelectionRange> = z.lazy(() =>
	z.object({
		range: RangeSchema,
		parent: SelectionRangeSchema.optional(),
	}),
)

export interface SelectionRange {
	range: z.infer<typeof RangeSchema>
	parent?: SelectionRange
}

export const TypeHierarchyItemSchema: z.ZodType<TypeHierarchyItem> = z.lazy(() =>
	z.object({
		name: z.string(),
		kind: z.number(),
		uri: z.string(),
		range: RangeSchema,
		selectionRange: RangeSchema,
		detail: z.string().optional(),
		supertypes: z.array(TypeHierarchyItemSchema),
		subtypes: z.array(TypeHierarchyItemSchema),
	}),
)

export type TypeHierarchyItem = {
	name: string
	kind: number
	uri: string
	range: z.infer<typeof RangeSchema>
	selectionRange: z.infer<typeof RangeSchema>
	detail?: string
	supertypes: TypeHierarchyItem[]
	subtypes: TypeHierarchyItem[]
}

export const SemanticTokenSchema = z.object({
	line: z.number(),
	character: z.number(),
	length: z.number(),
	tokenType: z.string(),
	tokenModifiers: z.array(z.string()),
})

export type SemanticToken = z.infer<typeof SemanticTokenSchema>

export const CodeActionSchema = z.object({
	title: z.string(),
	kind: z.string().optional(),
	command: z.string().optional(),
})

export type CodeAction = z.infer<typeof CodeActionSchema>

export const ParameterInformationSchema = z.object({
	label: z.string(),
	documentation: z.string().optional(),
})
export type ParameterInformation = z.infer<typeof ParameterInformationSchema>

export const SignatureInformationSchema = z.object({
	label: z.string(),
	documentation: z.string().optional(),
	parameters: z.array(ParameterInformationSchema),
})
export type SignatureInformation = z.infer<typeof SignatureInformationSchema>

export const SignatureHelpSchema = z.object({
	signatures: z.array(SignatureInformationSchema),
	activeSignature: z.number().nullable(),
	activeParameter: z.number().nullable(),
})
export type SignatureHelp = z.infer<typeof SignatureHelpSchema>

export const CompletionItemSchema = z.object({
	label: z.string(),
	kind: z.number(),
	detail: z.string().optional(),
	documentation: z.string().optional(),
})

export type CompletionItem = z.infer<typeof CompletionItemSchema>

export const RangeSchema = z.object({
	start: z.object({
		line: z.number(),
		character: z.number(),
	}),
	end: z.object({
		line: z.number(),
		character: z.number(),
	}),
})

export const ReferenceSchema = z.object({
	uri: z.string(),
	range: RangeSchema,
	preview: z.string().optional(),
})

export type Reference = z.infer<typeof ReferenceSchema>

export const LocationSchema = z.object({
	uri: z.string(),
	range: RangeSchema,
	preview: z.string().optional(),
})

export type Location = z.infer<typeof LocationSchema>


export const HoverSchema = z.string()

export type Hover = z.infer<typeof HoverSchema>

export const DocumentSymbolSchema: z.ZodType<DocumentSymbol> = z.object({
	name: z.string(),
	kind: z.number(),
	range: RangeSchema,
	selectionRange: RangeSchema,
	children: z.lazy(() => DocumentSymbolSchema.array()),
})

export type DocumentSymbol = {
	name: string
	kind: number
	range: z.infer<typeof RangeSchema>
	selectionRange: z.infer<typeof RangeSchema>
	children: DocumentSymbol[]
}

export const TextEditSchema = z.object({
	range: RangeSchema,
	newText: z.string(),
})
export type TextEdit = z.infer<typeof TextEditSchema>

export const WorkspaceEditSchema = z.object({
	changes: z.record(z.array(TextEditSchema)).optional(),
	success: z.boolean().optional(),
	content: z.string().optional(),
})
export type WorkspaceEdit = z.infer<typeof WorkspaceEditSchema>

export const CallHierarchyItemSchema: z.ZodType<CallHierarchyItem> = z.lazy(() =>
	z.object({
		name: z.string(),
		kind: z.number(),
		uri: z.string(),
		range: RangeSchema,
		selectionRange: RangeSchema,
		detail: z.string().optional(),
		incomingCalls: z.array(CallHierarchyIncomingCallSchema),
		outgoingCalls: z.array(CallHierarchyOutgoingCallSchema),
	}),
)

export type CallHierarchyItem = {
	name: string
	kind: number
	uri: string
	range: z.infer<typeof RangeSchema>
	selectionRange: z.infer<typeof RangeSchema>
	detail?: string
	incomingCalls: CallHierarchyIncomingCall[]
	outgoingCalls: CallHierarchyOutgoingCall[]
}

export const CallHierarchyIncomingCallSchema = z.object({
	from: CallHierarchyItemSchema,
	fromRanges: z.array(RangeSchema),
})
export type CallHierarchyIncomingCall = z.infer<typeof CallHierarchyIncomingCallSchema>

export const CallHierarchyOutgoingCallSchema = z.object({
	to: CallHierarchyItemSchema,
	fromRanges: z.array(RangeSchema),
})
export type CallHierarchyOutgoingCall = z.infer<typeof CallHierarchyOutgoingCallSchema>

export const CodeLensSchema = z.object({
	range: RangeSchema,
	command: z
		.object({
			title: z.string(),
			command: z.string(),
			arguments: z.array(z.any()).optional(),
		})
		.optional(),
})
export type CodeLens = z.infer<typeof CodeLensSchema>

export const DocumentHighlightSchema = z.object({
	range: RangeSchema,
	kind: z.number().optional(),
})
export type DocumentHighlight = z.infer<typeof DocumentHighlightSchema>

export const WorkspaceSymbolSchema = z.object({
	name: z.string(),
	kind: z.number(),
	location: LocationSchema,
})
export type WorkspaceSymbol = z.infer<typeof WorkspaceSymbolSchema>

export const SymbolSchema = z.object({
	name: z.string(),
	kind: z.number(),
	location: LocationSchema,
	name_path: z.string(),
	body: z.string().optional(),
})
export type Symbol = z.infer<typeof SymbolSchema>

// New flattened schema with symbolName support for insert after symbol
export const InsertAfterSymbolParamsSchema = z.object({
	// Required URI parameter
	uri: z.string().min(1, "URI is required"),
	
	// Position-based lookup parameters (optional)
	line: z.number().int().min(0, "Line must be non-negative").optional(),
	character: z.number().int().min(0, "Character must be non-negative").optional(),
	
	// Name-based lookup parameter (optional)
	symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
	
	// Content to insert
	content: z.string().describe("The content to insert after the symbol"),
}).refine(
	(data) =>
		(data.line !== undefined && data.character !== undefined) ||
		(data.symbolName !== undefined && data.symbolName.trim() !== ''),
	{
		message: "Either 'line'/'character' or 'symbolName' must be provided",
	}
)

export type InsertAfterSymbolParams = z.infer<typeof InsertAfterSymbolParamsSchema>

// Legacy schema for backward compatibility
export const InsertAfterSymbolParamsLegacySchema = z.object({
	textDocument: TextDocumentSchema,
	position: PositionSchema,
	content: z.string().describe("The content to insert after the symbol"),
})

export type InsertAfterSymbolParamsLegacy = z.infer<typeof InsertAfterSymbolParamsLegacySchema>

// New flattened schema with symbolName support for insert before symbol
export const InsertBeforeSymbolParamsSchema = z.object({
	// Required URI parameter
	uri: z.string().min(1, "URI is required"),
	
	// Position-based lookup parameters (optional)
	line: z.number().int().min(0, "Line must be non-negative").optional(),
	character: z.number().int().min(0, "Character must be non-negative").optional(),
	
	// Name-based lookup parameter (optional)
	symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
	
	// Content to insert
	content: z.string().describe("The content to insert before the symbol"),
}).refine(
	(data) =>
		(data.line !== undefined && data.character !== undefined) ||
		(data.symbolName !== undefined && data.symbolName.trim() !== ''),
	{
		message: "Either 'line'/'character' or 'symbolName' must be provided",
	}
)

export type InsertBeforeSymbolParams = z.infer<typeof InsertBeforeSymbolParamsSchema>

// Legacy schema for backward compatibility
export const InsertBeforeSymbolParamsLegacySchema = z.object({
	textDocument: TextDocumentSchema,
	position: PositionSchema,
	content: z.string().describe("The content to insert before the symbol"),
})

export type InsertBeforeSymbolParamsLegacy = z.infer<typeof InsertBeforeSymbolParamsLegacySchema>

// Legacy schema for backward compatibility
export const ReplaceSymbolBodyParamsLegacySchema = z.object({
	textDocument: TextDocumentSchema,
	position: PositionSchema,
	replacement: z.string().describe("The new body for the symbol"),
})

export type ReplaceSymbolBodyParamsLegacy = z.infer<typeof ReplaceSymbolBodyParamsLegacySchema>

// New flattened schema with symbolName support
export const ReplaceSymbolBodyParamsSchema = z.object({
	// Required URI parameter
	uri: z.string().min(1, "URI is required"),
	
	// Position-based lookup parameters (optional)
	line: z.number().int().min(0, "Line must be non-negative").optional(),
	character: z.number().int().min(0, "Character must be non-negative").optional(),
	
	// Name-based lookup parameter (optional)
	symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
	
	// Required replacement parameter
	replacement: z.string().min(1, "Replacement content is required").describe("The new body for the symbol"),
}).refine(
	(data) =>
		(data.line !== undefined && data.character !== undefined) ||
		(data.symbolName !== undefined && data.symbolName.trim() !== ''),
	{
		message: "Either 'line'/'character' or 'symbolName' must be provided",
	}
)

export type ReplaceSymbolBodyParams = z.infer<typeof ReplaceSymbolBodyParamsSchema>

// getSymbolCodeSnippet with flattened parameters (LLM-friendly)
export const GetSymbolCodeSnippetParamsSchema = z.object({
	// Required URI parameter
	uri: z.string().min(1, "URI is required"),
	
	// Position-based lookup parameters (optional)
	line: z.number().int().min(0, "Line must be non-negative").optional(),
	character: z.number().int().min(0, "Character must be non-negative").optional(),
	
	// Name-based lookup parameter (optional)
	symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
	
	// Optional configuration parameters (all at root level)
	includeCallHierarchy: z.boolean().optional(),
	includeUsages: z.boolean().optional(),
	maxCallHierarchyItems: z.number().int().min(1).max(100).optional(),
	maxUsages: z.number().int().min(1).max(1000).optional(),
}).refine(
	(data) => 
		(data.line !== undefined && data.character !== undefined) || 
		(data.symbolName !== undefined && data.symbolName.trim() !== ''),
	{
		message: "Either 'line'/'character' or 'symbolName' must be provided",
	}
)

export type GetSymbolCodeSnippetParams = z.infer<typeof GetSymbolCodeSnippetParamsSchema>

// getSymbolChildren with flattened parameters (LLM-friendly) and symbolName support
export const GetSymbolChildrenParamsSchema = z.object({
	// Required URI parameter
	uri: z.string().min(1, "URI is required"),
	
	// Position-based lookup parameters (optional)
	line: z.number().int().min(0, "Line must be non-negative").optional(),
	character: z.number().int().min(0, "Character must be non-negative").optional(),
	
	// Name-based lookup parameter (optional)
	symbolName: z.string().min(1, "Symbol name cannot be empty").optional(),
	
	// Optional configuration parameters (all at root level)
	deep: z.union([z.string(), z.number()]).optional().default("1"),
	include_hover: z.boolean().optional(),
}).refine(
	(data) =>
		(data.line !== undefined && data.character !== undefined) ||
		(data.symbolName !== undefined && data.symbolName.trim() !== ''),
	{
		message: "Either 'line'/'character' or 'symbolName' must be provided",
	}
)

export type GetSymbolChildrenParams = z.infer<typeof GetSymbolChildrenParamsSchema>

// Response interface
export const SymbolInfoSchema = z.object({
	name: z.string(),
	kind: z.number(),
	detail: z.string().optional()
})

export const TruncationInfoSchema = z.object({
	callHierarchy: z.boolean().optional(),
	usages: z.boolean().optional(),
	originalCounts: z.object({
		callHierarchy: z.number().optional(),
		usages: z.number().optional()
	}).optional()
})

export const CodeSnippetMetadataSchema = z.object({
	boundaryMethod: z.enum(['selection', 'document', 'definition']),
	executionTime: z.number(),
	truncated: TruncationInfoSchema.optional()
})

export const CodeSnippetSchema = z.object({
	// Core snippet data (always included)
	snippet: z.string(),
	uri: z.string(),
	range: RangeSchema,
	symbolInfo: SymbolInfoSchema,
	
	// Default enrichment data (included by default, can be disabled)
	// Now using table format instead of structured objects
	callHierarchy: z.object({
		incomingCalls: z.string(),
		outgoingCalls: z.string()
	}).nullable(),
	usages: z.string().nullable(),
	
	// Metadata
	metadata: CodeSnippetMetadataSchema
})

export type SymbolInfo = z.infer<typeof SymbolInfoSchema>
export type TruncationInfo = z.infer<typeof TruncationInfoSchema>
export type CodeSnippetMetadata = z.infer<typeof CodeSnippetMetadataSchema>
export type CodeSnippet = z.infer<typeof CodeSnippetSchema>

