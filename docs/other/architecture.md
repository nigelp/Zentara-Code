# Roo Code Extension Architecture

Here is a Mermaid diagram visualizing the architecture of the Roo Code extension based on the analysis of the `src` directory.

```mermaid
graph TD
    subgraph Extension Entry Point
        A[src/extension.ts]
    end

    subgraph Core Logic
        B[src/core]
        B1[config]
        B2[assistant-message]
        B3[prompts]
        B4[task]
        B -- contains --> B1
        B -- contains --> B2
        B -- contains --> B3
        B -- contains --> B4
    end

    subgraph API Layer
        C[src/api]
        C1[providers]
        C2[transform]
        C -- contains --> C1
        C -- contains --> C2
    end

    subgraph VS Code Integrations
        D[src/integrations]
        D1[editor]
        D2[terminal]
        D3[diagnostics]
        D -- contains --> D1
        D -- contains --> D2
        D -- contains --> D3
    end

    subgraph Activation
        E[src/activate]
        E1[registerCommands.ts]
        E2[CodeActionProvider.ts]
        E -- contains --> E1
        E -- contains --> E2
    end

    A -- initializes --> B
    A -- initializes --> C
    A -- initializes --> D
    A -- uses --> E

    C1 -- uses --> C2
    D1 -- uses --> B
    E1 -- uses --> D
```

## Summary

*   **`src/extension.ts`**: The main entry point of the extension.
*   **`src/core`**: Contains the core business logic of the extension.
*   **`src/api`**: Manages communication with external AI providers.
*   **`src/integrations`**: Integrates the extension with the VS Code UI and environment.
*   **`src/activate`**: Handles the activation of the extension and registration of its components.