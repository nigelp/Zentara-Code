# LSP Type Architecture Analysis

## Overview

This document provides a comprehensive analysis of the LSP (Language Server Protocol) type definitions and architecture patterns found in the Roo Code extension codebase.

## Current Architecture

### Core Type Definition Structure

The LSP types are centrally defined in `src/zentara_lsp/src/types.ts` using Zod schemas for runtime validation and TypeScript type inference.

#### Base Schema Components

```typescript
// Fundamental building blocks
const TextDocumentSchema = z.object({
    uri: z.string().describe("URI of the document (file:///path/to/file format)"),
})

const PositionSchema = z.object({
    line: z.number().describe("One-based line number"),
    character: z.number().describe("Zero-based character position"),
})

const RangeSchema = z.object({
    start: z.object({
        line: z.number(),
        character: z.number(),
    }),
    end: z.object({
        line: z.number(),
        character: z.number(),
    }),
})
```

### LSP Operation Categories

The codebase implements **24 distinct LSP operations** organized into several semantic categories:

#### 1. Navigation Operations
- `FindUsagesParams` / `FindUsagesParamsSchema`
- `GoToDefinitionParams` / `GoToDefinitionParamsSchema`
- `FindImplementationsParams` / `FindImplementationsParamsSchema`
- `GetDeclarationParams` / `GetDeclarationParamsSchema`
- `GetTypeDefinitionParams` / `GetTypeDefinitionParamsSchema`

#### 2. Information Retrieval Operations
- `GetHoverInfoParams` / `GetHoverInfoParamsSchema`
- `GetDocumentSymbolsParams` / `GetDocumentSymbolsParamsSchema`
- `GetWorkspaceSymbolsParams` / `GetWorkspaceSymbolsParamsSchema`
- `GetSymbolCodeSnippetParams` / `GetSymbolCodeSnippetParamsSchema`
- `GetSymbolsParams` / `GetSymbolsParamsSchema`
- `GetSymbolsOverviewParams` / `GetSymbolsOverviewParamsSchema`

#### 3. Code Intelligence Operations
- `GetCompletionsParams` / `GetCompletionsParamsSchema`
- `GetSignatureHelpParams` / `GetSignatureHelpParamsSchema`
- `GetCodeActionsParams` / `GetCodeActionsParamsSchema`
- `GetSemanticTokensParams` / `GetSemanticTokensParamsSchema`

#### 4. Hierarchy Analysis Operations
- `GetCallHierarchyParams` / `GetCallHierarchyParamsSchema`
- `GetTypeHierarchyParams` / `GetTypeHierarchyParamsSchema`

#### 5. UI Enhancement Operations
- `GetCodeLensParams` / `GetCodeLensParamsSchema`
- `GetSelectionRangeParams` / `GetSelectionRangeParamsSchema`
- `GetDocumentHighlightsParams` / `GetDocumentHighlightsParamsSchema`

#### 6. Code Modification Operations
- `RenameParams` / `RenameParamsSchema`
- `InsertAfterSymbolParams` / `InsertAfterSymbolParamsSchema`
- `InsertBeforeSymbolParams` / `InsertBeforeSymbolParamsSchema`
- `ReplaceSymbolBodyParams` / `ReplaceSymbolBodyParamsSchema`

## Semantic LSP Operation Patterns

### Pattern 1: Position-Based Operations
Most LSP operations follow a consistent pattern requiring `textDocument` and `position`:

```typescript
export const [OperationName]ParamsSchema = z.object({
    textDocument: TextDocumentSchema,
    position: PositionSchema,
})
```

**Examples:**
- `FindUsagesParams`
- `GoToDefinitionParams`
- `GetHoverInfoParams`
- `GetCallHierarchyParams`

### Pattern 2: Document-Only Operations
Some operations only require document context:

```typescript
export const [OperationName]ParamsSchema = z.object({
    textDocument: TextDocumentSchema,
})
```

**Examples:**
- `GetSemanticTokensParams`
- `GetCodeLensParams`

### Pattern 3: Location-Based Operations
Operations that work with specific code ranges:

```typescript
export const GetSymbolCodeSnippetParamsSchema = z.object({
    location: LocationSchema,
})
```

### Pattern 4: Query-Based Operations
Operations that search across the workspace:

```typescript
export const GetWorkspaceSymbolsParamsSchema = z.object({
    query: z.string().describe("The search query for finding symbols"),
})
```

### Pattern 5: Complex Parameter Operations
Operations with specialized parameter structures:

```typescript
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
```

## Response Type Patterns

### Pattern 1: Array Responses
Most operations return arrays of structured data:

```typescript
// Examples
Promise<Reference[]>        // findUsages
Promise<Location[]>         // goToDefinition
Promise<DocumentSymbol[]>   // getDocumentSymbols
Promise<CompletionItem[]>   // getCompletions
```

### Pattern 2: Single Object Responses
Some operations return single objects or null:

```typescript
Promise<CallHierarchyItem | null>  // getCallHierarchy
Promise<Hover | null>              // getHoverInfo
Promise<CodeSnippet | null>        // getSymbolCodeSnippet
```

### Pattern 3: Complex Structured Responses
Operations with nested or recursive structures:

```typescript
// CallHierarchyItem with recursive incoming/outgoing calls
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
```

## Integration Architecture

### 1. Controller Interface (`ILspController.ts`)
Defines the contract for all LSP operations with consistent method signatures.

### 2. Validation System (`lspToolValidation.ts`)
- Maps operation names to Zod schemas
- Provides runtime validation for all LSP operations
- Supports both short names (`find_usages`) and prefixed names (`lsp_find_usages`)

### 3. Tool Integration (`lspTool.ts`)
- Maps LSP operations to controller methods
- Handles both direct and prefixed operation names
- Provides unified error handling and logging

## Key Architectural Strengths

1. **Type Safety**: Zod schemas provide both runtime validation and compile-time type safety
2. **Consistency**: Common patterns across similar operations
3. **Extensibility**: Easy to add new operations following established patterns
4. **Validation**: Comprehensive parameter validation with descriptive error messages
5. **Documentation**: Schema descriptions serve as inline documentation

## Identified Patterns for Semantic LSP Operations

### Core Semantic Operations
The following operations are particularly important for semantic code analysis:

1. **`FindUsagesParams`** - Critical for dependency analysis and refactoring
2. **`GetCallHierarchyParams`** - Essential for understanding function relationships
3. **`GetSymbolCodeSnippetParams`** - Key for targeted code extraction
4. **`GetDocumentSymbolsParams`** - Fundamental for code structure analysis

### Pattern Consistency
These semantic operations follow consistent patterns:
- Use `textDocument` + `position` for symbol identification
- Return structured data with location information
- Include optional preview/context information
- Support both synchronous and asynchronous processing

## Recommendations

1. **Maintain Pattern Consistency**: New LSP operations should follow the established patterns
2. **Enhance Documentation**: Consider adding more detailed schema descriptions
3. **Consider Grouping**: Related operations could be grouped into logical modules
4. **Validation Enhancement**: Consider adding cross-field validation where appropriate
5. **Performance Optimization**: Large response types could benefit from pagination or streaming

## Conclusion

The LSP type architecture in the Roo Code extension demonstrates excellent design principles with consistent patterns, strong type safety, and comprehensive validation. The semantic LSP operations (`FindUsages`, `GetCallHierarchy`, `GetSymbolCodeSnippet`) follow well-established patterns that make them reliable and maintainable.