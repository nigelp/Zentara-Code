# Plan for Integrating BifrostMCP as zentara_lsp

This document outlines the plan to integrate the BifrostMCP tools into the Zentara-Code repository as a new `zentara_lsp` module. The integration will follow the best practices established by the `zentara_debug` module and the official `integrating_new_tool.md` guide.

## 1. BifrostMCP Tools to Integrate

Based on the `BifrostMCP/src/tools.ts` file and subsequent additions, the following 20 tools are to be integrated and maintained:

-   `find_usages`
-   `go_to_definition`
-   `find_implementations`
-   `get_hover_info`
-   `get_document_symbols`
-   `get_completions`
-   `get_signature_help`
-   `rename` (implements `rename` and `get_rename_locations` functionality)
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

## 2. Directory Structure

We will create the necessary directory structure for the new `zentara_lsp` module within `Zentara-Code/src/`.

```
Zentara-Code/src/
└── zentara_lsp/
    ├── index.ts
    └── src/
        ├── controller/
        │   ├── findUsages.ts
        │   ├── goToDefinition.ts
        │   └── ... (one file per tool)
        ├── ILspController.ts
        ├── LspController.ts
        └── types.ts
```

-   **`index.ts`**: The main entry point for the module, exporting the controller instance.
-   **`src/controller/`**: Contains the logic for each individual LSP tool.
-   **`src/ILspController.ts`**: An interface defining the methods for all LSP tool operations.
-   **`src/LspController.ts`**: The concrete implementation of `ILspController`. This class will contain the core logic for making `vscode.commands.executeCommand` calls.
-   **`src/types.ts`**: Contains TypeScript types and Zod schemas for the LSP tools and their parameters.

## 3. Core Logic Implementation

The core logic for each tool is implemented in its own file inside the `src/controller/` directory, which is then called by the main `LspController.ts`.

## 4. Tool Prompts for the LLM

A new directory will be created: `Zentara-Code/src/core/prompts/tools/lsp_operations/`.

-   Inside this directory, a separate file will be created for each of the 20 tools.
-   Each file will export a function that generates a detailed description of the tool.
-   An `index.ts` in `lsp_operations/` will export all the prompt-generating functions.

## 5. Tool Registration and Mapping

### `Zentara-Code/src/schemas/index.ts`

The `toolNames` array will be updated with all 20 LSP tool names, prefixed with `lsp_`.

```typescript
export const toolNames = [
    // ... existing tool names ...
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
    "lsp_get_symbols",
    // ... other tool names ...
] as const;
```

### `Zentara-Code/src/core/prompts/tools/index.ts`

The `toolDescriptionMap` will be updated to map each `lsp_` tool name to its description-generating function.

## 6. Invocation Bridge

In `Zentara-Code/src/core/assistant-message/presentAssistantMessage.ts`, a handler function, `handleLspTools`, will manage tool calls prefixed with `lsp_`. It will validate arguments and invoke the correct method on the `LspController`.

## 7. Testing Strategy

-   **Unit Tests**: Test the `LspController` methods and Zod validation schemas.
-   **Integration Tests**: Test the full `presentAssistantMessage` flow for `lsp_` tools.
-   **End-to-End Testing**: Manually verify that the LLM can correctly use the new LSP tools.

## 8. Documentation

-   The prompt files are the primary documentation for the LLM.
-   This `plan.md` serves as the master plan.
-   The `README.md` provides an overview of implemented tools and diaries for new additions.
-   The `implementation_plan.md` contains a snapshot of the plan for the `get_symbols` tool.