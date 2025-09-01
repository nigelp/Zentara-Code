# Symbol Lookup Improvement Plan

## 1. Problem Statement

Currently, many LSP (Language Server Protocol) tools, such as `lsp_get_symbol_code_snippet`, rely on precise line and character coordinates to identify and retrieve information about a symbol. While this is accurate at a given moment, these coordinates become stale and invalid whenever a file is modified (e.g., lines added/removed, code reordered). This leads to frequent failures in tool execution, requiring manual re-identification of symbol locations, which is inefficient and disrupts the workflow.

## 2. Proposed Solution: Centralized `get_symbol` Internal Function

To address the issue of stale symbol locations and to centralize symbol retrieval logic, we propose introducing an internal helper function, `get_symbol`, within the LSP tool ecosystem. This function will act as a unified entry point for symbol identification, supporting both position-based and name-based lookups.

### `get_symbol` Function Signature:

```typescript
interface SymbolLookupResult {
    symbol: LspSymbol | null; // The found symbol object
    isUnique: boolean;         // True if only one symbol with the given name was found
    alternatives?: LspSymbol[]; // List of alternative symbols if not unique
    error?: string;            // Error message if lookup fails
}

interface GetSymbolOptions {
    uri: string;
    symbolName?: string;
    line?: number;
    character?: number;
}

function get_symbol(options: GetSymbolOptions): Promise<SymbolLookupResult>;
```

### `get_symbol` Implementation Plan:

1.  **Input**: The function will accept an `options` object containing the `uri` and either a `symbolName` or a `position` (line and character).
2.  **Logic Branching**:
    *   If `line` and `character` are provided, the function will perform a **location-based lookup**. It will find the symbol at the exact coordinates. This is the preferred method for precision when the location is known and stable.
    *   If `symbolName` is provided, the function will perform a **name-based lookup**.
3.  **Name-Based Lookup Mechanism**:
    *   It will directly call the VSCode `DocumentSymbolProvider` to retrieve all document symbols for the given `uri`.
    *   It will then filter these symbols to find all instances where `symbol.name` matches the provided `symbolName`.
4.  **Uniqueness Check (for Name-Based Lookup)**:
    *   If exactly one symbol matches the `symbolName`, it will be considered unique, and that `LspSymbol` object will be returned along with `isUnique: true`.
    *   If multiple symbols with the same `symbolName` are found, `isUnique` will be `false`, and a list of all matching `LspSymbol` objects will be returned in `alternatives`.
    *   If no symbol matches, `symbol` will be `null`.
5.  **Error Handling**: Appropriate error handling will be implemented for cases where the file cannot be accessed or the underlying LSP calls fail.

## 3. Integration and Modification Plan

All affected LSP functions will be refactored to use the new `get_symbol` helper function. This centralizes the lookup logic and makes the tools themselves cleaner and more maintainable.

### 3.1. Core Logic Implementation

*   **New File**: The `get_symbol` function will be implemented in a new file at `src/core/tools/lsp/getSymbol.ts`. This keeps the core logic separate and reusable.
*   **Controller Modification**: The existing LSP controller, likely `LspController.ts`, will be updated. Each affected LSP operation handler will be modified to call `get_symbol` at the beginning to resolve the symbol.

### 3.2. Tool Prompt and Parameter Updates

For each affected tool, we need to update its prompt file to inform the LLM about the new `symbolName` parameter.

*   **Location**: The prompt files are located in `src/core/prompts/tools/lsp_operations/`.
*   **Change**: Each file will be updated to include `symbolName` as an optional parameter and provide an example of its use.

### 3.2.1. Tool Reference Guidelines

When modifying tool prompt files, we should prefer referencing tools by their **tool name** rather than by their file location. This is because file locations can change during editing and refactoring, making location-based references fragile and prone to becoming outdated.

**Preferred**: Reference tools by name (e.g., `lsp_get_symbol_code_snippet`, `lsp_find_usages`)
**Avoid**: Reference tools by file path (e.g., `src/core/prompts/tools/lsp_operations/get_symbol_code_snippet.ts`)

This approach ensures that tool references remain valid even when files are moved, renamed, or reorganized during development.

**Example Change for `lsp_get_symbol_code_snippet.ts`:**

```typescript
// Before
// ... only line and character are documented

// After
// ... (inside the description string)
`### Parameters:
- "uri" (string, REQUIRED): Absolute file URI.
- "line" (number, OPTIONAL): 0-based line number.
- "character" (number, OPTIONAL): 0-based character position.
- "symbolName" (string, OPTIONAL): The name of the symbol to find.
**Note**: Either 'line'/'character' or 'symbolName' must be provided.

### Examples:
1.  **Using position:**
    \`\`\`xml
    <lsp_get_symbol_code_snippet>{"uri":"file:///path/to/file.ts","line":10,"character":5}</lsp_get_symbol_code_snippet>
    \`\`\`
2.  **Using symbol name:**
    \`\`\`xml
    <lsp_get_symbol_code_snippet>{"uri":"file:///path/to/file.ts","symbolName":"myFunction"}</lsp_get_symbol_code_snippet>
    \`\`\`
`
```

### 3.3. Type and Schema Updates

To ensure type safety and validation, the following files will be updated:

1.  **`src/schemas/index.ts`**: The Zod schemas for each affected LSP tool will be updated to make `line` and `character` optional, and add the optional `symbolName` string. A `.refine()` check will be added to ensure that either position or name is provided.
2.  **`packages/types/src/tool.ts`**: If the parameter interfaces are defined here, they will be updated to reflect the new optional parameters.

## 4. Benefits

*   **Increased Robustness**: Tools are more resilient to code modifications.
*   **Improved User Experience**: Less manual work to find symbols.
*   **Enhanced Automation**: More reliable automated workflows.
*   **Centralized Logic**: Simplifies maintenance and future enhancements of LSP tools.
*   **Clearer Disambiguation**: Provides a structured way to handle non-unique symbol names.

## 5. Affected LSP Tools

The following LSP tools will be refactored to use the new `get_symbol` helper function:
*   `lsp_get_symbol_code_snippet`
*   `lsp_find_usages`
*   `lsp_go_to_definition`
*   `lsp_get_hover_info`
*   `lsp_get_completions`
*   `lsp_get_signature_help`
*   `lsp_get_declaration`
*   `lsp_get_document_highlights`
*   `lsp_get_selection_range`
*   `lsp_get_type_definition`
*   `lsp_get_call_hierarchy`
*   `lsp_find_implementations`
*   `lsp_get_symbol_children`
*   `lsp_get_code_actions`
*   `lsp_rename`
*   `lsp_replace_symbol_body`
*   `lsp_insert_after_symbol`
*   `lsp_insert_before_symbol`
*   `lsp_get_type_hierarchy`

IMPLEMENT THE CHANGE for  `lsp_get_symbol_code_snippet` first, test thoroughly and wait for approval before moving to the other tools. 

Progress update: change for lsp_get_symbol_code_snippet has been implemented succesfully