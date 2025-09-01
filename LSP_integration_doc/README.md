# LSP Integration Documentation

This document provides an overview of the LSP (Language Server Protocol) tools that have been integrated into Zentara-Code and serves as a diary for new additions. For the complete master plan, please see `plan.md`.

## Implemented Tools

Zentara-Code now includes a comprehensive suite of 20 LSP-based tools, including:

-   `find_usages`
-   `go_to_definition`
-   `find_implementations`
-   `get_hover_info`
-   `get_document_symbols`
-   `get_completions`
-   `get_signature_help`
-   `rename`
-   `get_code_actions`
-   `get_semantic_tokens`
-   `get_call_hierarchy`
-   `get_type_hierarchy`
-   `get_code_lens`
-   `get_selection_range`
-   `get_type_definition`
-   `get_declaration`
-   `get_document_highlights`
-   `get_workspace_symbols`
-   `get_symbol_code_snippet`
-   `get_symbols`
-   `insert_after_symbol`
-   `insert_before_symbol`
-   `replace_symbol_body`

## Implementation Diary

### 2025-07-06: Added Symbol Modification Tools
*   **Action**: Implemented three new tools for precise, symbol-based code modification: `insert_after_symbol`, `insert_before_symbol`, and `replace_symbol_body`.
*   **Strategy**: These tools leverage the `goToDefinition` provider to accurately locate symbols, ensuring that edits are applied to the correct code. This approach is more robust than using `apply_diff` for symbol modifications. The returned `Location` object was also optimized to exclude the `preview` field, reducing token usage.
*   **Files Created/Modified**:
    *   `Zentara-Code/src/zentara_lsp/src/types.ts`
    *   `Zentara-Code/src/zentara_lsp/src/ILspController.ts`
    *   `Zentara-Code/src/zentara_lsp/src/controller/insertAfterSymbol.ts`
    *   `Zentara-Code/src/zentara_lsp/src/controller/insertBeforeSymbol.ts`
    *   `Zentara-Code/src/zentara_lsp/src/controller/replaceSymbolBody.ts`
    *   `Zentara-Code/src/zentara_lsp/src/LspController.ts`
    *   `Zentara-Code/src/core/prompts/tools/lsp_operations/insert_after_symbol.ts`
    *   `Zentara-Code/src/core/prompts/tools/lsp_operations/insert_before_symbol.ts`
    *   `Zentara-Code/src/core/prompts/tools/lsp_operations/replace_symbol_body.ts`
    *   `Zentara-Code/src/core/prompts/tools/lsp_operations/index.ts`
    *   `Zentara-Code/src/schemas/index.ts`
    *   `Zentara-Code/src/core/prompts/tools/index.ts`
    *   `Zentara-Code/src/zentara_lsp/src/controller/goToDefinition.ts`

### 2025-07-06: Added `get_symbols` Tool
*   **Action**: Implemented the `get_symbols` tool to allow for flexible, path-based symbol searching.
*   **Strategy**: A hybrid approach was used, leveraging `ripgrep` for fast file filtering and `vscode.executeDocumentSymbolProvider` for precise, in-file symbol analysis.
*   **Files Created/Modified**:
    *   `Zentara-Code/src/zentara_lsp/src/controller/get_symbols.ts`
    *   `Zentara-Code/src/zentara_lsp/src/types.ts`
    *   `Zentara-Code/src/zentara_lsp/src/ILspController.ts`
    *   `Zentara-Code/src/zentara_lsp/src/LspController.ts`
    *   `Zentara-Code/src/core/prompts/tools/lsp_operations/get_symbols.ts`
    *   `Zentara-Code/src/core/prompts/tools/lsp_operations/index.ts`
    *   `Zentara-Code/src/core/prompts/tools/index.ts`
    *   `Zentara-Code/src/schemas/index.ts`