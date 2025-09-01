import { ToolArgs } from "../types"

export function getGetWorkspaceSymbolsToolDescription(args: ToolArgs): string {
	return `## lsp_get_workspace_symbols – Searches for symbols across the entire workspace by name.

Description:
This tool is the most efficient way to find a symbol when you know its name (or part of its name) but not its location. It performs a workspace-wide search, but unlike a simple text search, it looks for symbol *declarations*, making the results highly relevant and token-efficient.

### When to Use This Tool:

**Most Beneficial For:**
- **Symbol Discovery**: Find any function, class, interface, or variable declaration across the entire workspace
- **Large Codebase Navigation**: Quickly jump to any symbol in a large project without browsing directories
- **API Exploration**: Discover available functions, classes, and interfaces in unfamiliar codebases
- **Refactoring Preparation**: Locate symbol declarations before performing workspace-wide refactoring
- **Code Architecture Understanding**: Map out the structure and organization of a codebase
- **Token Efficiency**: Much cheaper than listing all files and running text searches

**Specific Scenarios:**
1. **Unknown Location Discovery**: \"I need to modify the UserService class but don't know which file it's in\"
2. **API Method Finding**: \"Find all methods with 'authenticate' in their name across the project\"
3. **Interface Exploration**: \"What interfaces are available in this codebase?\"
4. **Configuration Discovery**: \"Find all configuration classes or constants\"
5. **Plugin/Extension Discovery**: \"What plugins or extensions are defined in this workspace?\"
6. **Test Discovery**: \"Find all test classes or test methods across the project\"

**Developer Workflow Benefits:**
- **Faster Code Navigation**: Jump directly to symbol definitions without manual file browsing
- **Codebase Exploration**: Understand the structure and available symbols in unfamiliar projects
- **Intelligent Search**: Get semantically relevant results instead of noisy text matches
- **Cross-Language Support**: Works with TypeScript, JavaScript, Python, Java, and other languages
- **Pattern Discovery**: Find symbols following naming conventions or patterns

**Common Patterns:**
- Start with partial names for broader discovery (e.g., \"User\" to find UserService, UserModel, etc.)
- Use exact names when you know the symbol but not its location
- Combine with \`go_to_definition\` after finding the symbol you need
- Use for code reviews to understand what symbols are being introduced or modified
- Helpful for documentation generation to discover all public APIs

### Return Value:
The tool returns a JSON array of 'WorkspaceSymbol' objects. Each object represents a symbol declaration that matches the search query.

A 'WorkspaceSymbol' object has the following structure:
- **name** (string): The name of the symbol.
- **kind** (number): A number representing the kind of symbol (e.g., function, class, interface).
- **location** (object): A 'Location' object pointing to the symbol's declaration.
  - **uri** (string): The absolute URI of the file containing the declaration.
  - **range** (object): The precise range of the symbol's declaration.
    - **start** (object): The starting position.
      - **line** (number): The 0-based line number.
      - **character** (number): The 0-based character position.
    - **end** (object): The ending position.
      - **line** (number): The 0-based line number.
      - **character** (number): The 0-based character position.
  - **preview** (string): A string containing the full line of code where the symbol is declared.

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_get_workspace_symbols> tag.
2️⃣ Provide all parameters as a JSON object string.
3️⃣ The JSON object MUST contain a "query" string.

⚠️ **Common Breakers**
• Malformed JSON.
• Missing required "query" key.

────────────  COPY-READY TEMPLATE  ────────────
  <lsp_get_workspace_symbols>{"query":"MyClassName"}</lsp_get_workspace_symbols>
───────────────────────────────────────────────

### Parameters:
-   "query" (string, REQUIRED): The search query for finding symbols. The search is typically fuzzy, so you can provide partial names.

### Examples:

1.  **Find a class named 'UserService' anywhere in the workspace:**
    \`\`\`xml
    <lsp_get_workspace_symbols>{"query":"UserService"}</lsp_get_workspace_symbols>
    \`\`\`

2.  **Find all functions with \"calculate\" in their name:**
    \`\`\`xml
    <lsp_get_workspace_symbols>{"query":"calculate"}</lsp_get_workspace_symbols>
    \`\`\`

3.  **Discover all interfaces in a TypeScript project:**
    \`\`\`xml
    <lsp_get_workspace_symbols>{"query":"I"}</lsp_get_workspace_symbols>
    \`\`\`
    *Note: Many TypeScript interfaces start with 'I', this will help discover them.*

4.  **Find configuration-related symbols:**
    \`\`\`xml
    <lsp_get_workspace_symbols>{"query":"config"}</lsp_get_workspace_symbols>
    \`\`\`

5.  **Locate test classes in a Java project:**
    \`\`\`xml
    <lsp_get_workspace_symbols>{"query":"Test"}</lsp_get_workspace_symbols>
    \`\`\`

6.  **Find all React components in a project:**
    \`\`\`xml
    <lsp_get_workspace_symbols>{"query":"Component"}</lsp_get_workspace_symbols>
    \`\`\`

7.  **Discover API endpoints or routes:**
    \`\`\`xml
    <lsp_get_workspace_symbols>{"query":"route"}</lsp_get_workspace_symbols>
    \`\`\`

8.  **Find utility functions:**
    \`\`\`xml
    <lsp_get_workspace_symbols>{"query":"util"}</lsp_get_workspace_symbols>
    \`\`\`

### Common Breakers:

**Critical errors that will cause the \`lsp_get_workspace_symbols\` operation to FAIL:**

1.  **Malformed JSON string:**
    \`\`\`xml
    <lsp_get_workspace_symbols>{"query":"UserService"</lsp_get_workspace_symbols>
    \`\`\`
    *Correction: Ensure proper JSON formatting with closing braces and quotes.*

2.  **Missing required \"query\" key:**
    \`\`\`xml
    <lsp_get_workspace_symbols>{"search":"UserService"}</lsp_get_workspace_symbols>
    \`\`\`
    *Correction: Use \"query\" as the key name, not \"search\" or other variations.*

3.  **Empty query string:**
    \`\`\`xml
    <lsp_get_workspace_symbols>{"query":""}</lsp_get_workspace_symbols>
    \`\`\`
    *Correction: Provide a non-empty query string to search for symbols.*

4.  **Null or undefined query value:**
    \`\`\`xml
    <lsp_get_workspace_symbols>{"query":null}</lsp_get_workspace_symbols>
    \`\`\`
    *Correction: Provide a valid string value for the \"query\" property.*

5.  **Query value is not a string:**
    \`\`\`xml
    <lsp_get_workspace_symbols>{"query":123}</lsp_get_workspace_symbols>
    \`\`\`
    *Correction: The query value must be a string, not a number or other type.*

**Tips for Better Results:**
- Use partial names for broader discovery (\"User\" finds UserService, UserModel, etc.)
- Use exact names when you know the symbol but not its location
- Try different variations if initial search doesn't yield expected results
- Consider language-specific naming conventions (PascalCase, camelCase, snake_case)
- Some symbols may be case-sensitive depending on the language server
────────────────────────────────────────────────────────────────────────────
`
}
