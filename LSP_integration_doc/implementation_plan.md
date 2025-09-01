# Detailed Implementation Plan: BifrostMCP Tool Integration

This document provides a step-by-step checklist for integrating the BifrostMCP tools into Zentara-Code as the `zentara_lsp` module. Each implementation step is followed by a corresponding testing step to ensure a robust, test-driven development process.

## Guiding Principle
**All tool logic implementations MUST be a direct adaptation of the corresponding logic in the `/home/sonle/Documents/BifrostMCP/src/toolRunner.ts` file. This includes function signatures, parameter handling, command execution, and result formatting.**

## Phase 1: Foundation and First Tool (`find_usages`)

### 1.1. Create Directory and Core Files
- [ ] Create the directory `Zentara-Code/src/zentara_lsp/`.
- [ ] Create the directory `Zentara-Code/src/zentara_lsp/src/`.
- [ ] Create the directory `Zentara-Code/src/zentara_lsp/src/controller`.
- [ ] Create empty file `Zentara-Code/src/zentara_lsp/index.ts`.
- [ ] Create empty file `Zentara-Code/src/zentara_lsp/src/types.ts`.
- [ ] Create empty file `Zentara-Code/src/zentara_lsp/src/LspController.ts` (This will act as a facade).

### 1.2. Implement Core Logic for `find_usages`
- [ ] **`types.ts`**: Define the Zod schemas for the `find_usages` parameters and response types, strictly following the structures used in `toolRunner.ts`.
- [ ] **`controller/findUsages.ts`**: Create this new file.
- [ ] Implement an exported `findUsages` function in this file. The logic **must** be a direct adaptation of the `find_usages` case from `toolRunner.ts`.
- [ ] **`LspController.ts`**: a. Import the `findUsages` function. b. Create a public method `findUsages` that calls the imported function.
- [ ] **`index.ts`**: Export an instance of the `LspController`.

### 1.3. Write Unit Tests for `find_usages`
- [ ] Create a test file `Zentara-Code/src/zentara_lsp/src/controller/__tests__/findUsages.test.ts`.
- [ ] Write a unit test for the `findUsages` function.
- [ ] Mock the `vscode` module and its functions (`commands.executeCommand`, `workspace.openTextDocument`, etc.) to simulate the VS Code API's response.
- [ ] Verify that the `findUsages` function correctly processes parameters and formats the result exactly as the `toolRunner.ts` logic does.
- [ ] Run the tests and ensure they pass.

## Phase 2: Prompt and Registration for `find_usages`

### 2.1. Create Prompt File
- [ ] Create the directory `Zentara-Code/src/core/prompts/tools/lsp_operations/`.
- [ ] Create the file `Zentara-Code/src/core/prompts/tools/lsp_operations/find_usages.ts`.
- [ ] In this file, create the `getLspFindUsagesToolDescription` function, copying the detailed description and schema from `BifrostMCP/src/tools.ts`.
- [ ] Create `Zentara-Code/src/core/prompts/tools/lsp_operations/index.ts` and export the new description function from it.

### 2.2. Register the Tool
- [ ] **`Zentara-Code/src/schemas/index.ts`**: Add `"lsp_find_usages"` to the `toolNames` array.
- [ ] **`Zentara-Code/src/core/prompts/tools/index.ts`**:
    - Import `getLspFindUsagesToolDescription` from `./lsp_operations`.
    - Add an entry to `toolDescriptionMap`: `lsp_find_usages: (args) => getLspFindUsagesToolDescription(args),`.

## Phase 3: Invocation and End-to-End Testing for `find_usages`

### 3.1. Implement Invocation Bridge
- [ ] **`Zentara-Code/src/core/assistant-message/presentAssistantMessage.ts`**:
    - Import the `lspController` instance.
    - Create a new handler function `handleLspTools(toolCall)`.
    - Add logic to the main switch/case or if/else block to route tool calls starting with `lsp_` to `handleLspTools`.
    - In `handleLspTools`, parse the JSON arguments, validate them, and call `lspController.findUsages(params)`.

### 3.2. Write Integration Test
- [ ] Create an integration test that simulates a full tool call for `lsp_find_usages` and verifies that the correct `LspController` method is called.
- [ ] Run the test and ensure it passes.

### 3.3. Manual End-to-End Test
- [ ] Manually construct a prompt that should trigger the `lsp_find_usages` tool and verify the end-to-end flow.

## Phase 4: Implement and Test Remaining Tools

### 4.1. Iterative Implementation
- [ ] For each remaining tool from the list in the overview plan:
    1.  **Types**: Add Zod schemas to `types.ts`.
    2.  **Core Logic**: Create a new file in `controller/` (e.g., `goToDefinition.ts`). Implement the logic for the tool, ensuring it is a **direct adaptation** from `toolRunner.ts`.
    3.  **Controller Facade**: Add the corresponding method to `LspController.ts`.
    4.  **Unit Test**: Create a new test file in `controller/__tests__/` and write a unit test for the new tool function.
    5.  **Prompt File**: Create the prompt file in `lsp_operations/`.
    6.  **Registration**: Add the tool to `schemas/index.ts` and `core/prompts/tools/index.ts`.
    7.  **Invocation**: Add the `case` to `handleLspTools`.
    8.  **Integration Test**: Add an integration test case.
    9.  **Run Tests**: Run all tests.

### 4.2. Final Manual Testing
- [ ] Once all tools are implemented, perform a final round of manual end-to-end testing.