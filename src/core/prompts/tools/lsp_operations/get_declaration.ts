import { ToolArgs } from "../types"

export function getGetDeclarationToolDescription(args: ToolArgs): string {
	return `## lsp_get_declaration – Navigates to the declaration of a symbol.

Description:
This tool is subtly different from \`go_to_definition\`. While 'definition' refers to where the code is implemented, 'declaration' refers to where the symbol is introduced. For languages like C++ with header files, or for symbols imported from other modules, this tool takes you to the point of declaration (e.g., the \`import\` statement or the header file).

────────────────────────  WHEN TO USE  ────────────────────────

**Most Beneficial Scenarios:**
- **Import Source Tracking**: Find exactly where external symbols are imported from
- **Header File Navigation**: Navigate to function prototypes and class declarations in C/C++
- **Module Dependency Analysis**: Understand how symbols flow between modules
- **API Surface Investigation**: Explore public interfaces and exported symbols
- **Code Organization Understanding**: See how symbols are organized across files

**Specific Use Cases:**
1. **Import Statement Navigation**: From \`useState\` usage to \`import { useState } from 'react'\`
2. **Header File Exploration**: From function call to its declaration in .h files
3. **Module Export Tracking**: From imported function to its export statement
4. **Forward Declaration Location**: In C++, find where types are forward declared
5. **Namespace Member Discovery**: Navigate to where symbols are declared in namespaces

**Developer Workflow Benefits:**
- **Dependency Clarity**: Instantly see where external dependencies come from
- **Architecture Understanding**: Grasp module relationships and import patterns
- **Refactoring Safety**: Know all declaration points before making changes
- **Documentation Access**: Often leads to well-documented public interfaces
- **Import Optimization**: Identify unused or redundant imports

**Common Patterns:**
- Use on imported functions to trace their source modules
- Use on library symbols to find their declaration points
- Use in C/C++ to navigate between header and implementation files
- Use to understand symbol visibility and scope
- Use when investigating compilation or linking errors

### Return Value:
The tool returns a single JSON 'Location' object, or an array of them if the symbol is declared in multiple places. It can also return null if the declaration is not found.

A 'Location' object has the following structure:
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
1️⃣ Use the <lsp_get_declaration> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_get_declaration> tag.
3️⃣ The JSON object MUST contain "uri" and either position ("line"/"character") OR "symbolName" keys (FLATTENED, not nested).
4️⃣ Ensure the <lsp_get_declaration> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string (e.g., missing quotes around keys, trailing commas)
• Missing required "uri" key or both position and symbolName parameters
• Incorrect file path for the "uri" value (must be absolute file URI)
• Invalid line/character positions (negative numbers or out of bounds)
• Using relative paths instead of absolute file URIs
• Pointing to symbols that don't have separate declarations (e.g., local variables)
• Using on symbols that are defined inline rather than declared separately

────────────  COPY-READY TEMPLATES  ────────────
Position-based: <lsp_get_declaration>{"uri":"file:///absolute/path/to/file.ts","line":10,"character":5}</lsp_get_declaration>
Name-based: <lsp_get_declaration>{"uri":"file:///absolute/path/to/file.ts","symbolName":"functionName"}</lsp_get_declaration>
Legacy format: <lsp_get_declaration>{"textDocument":{"uri":"file:///path/to/file.ts"},"position":{"line":10,"character":5}}</lsp_get_declaration>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_get_declaration> tag.

**New Flattened Format (Recommended):**
-   "uri" (string, REQUIRED): Absolute file URI of the document (e.g., "file:///absolute/path/to/file.ts")
-   "line" (number, OPTIONAL): 0-based line number where the symbol is located
-   "character" (number, OPTIONAL): 0-based character position within the line
-   "symbolName" (string, OPTIONAL): Name of the symbol to find declaration for

**Legacy Nested Format (Still Supported):**
-   "textDocument" (object, OPTIONAL): The document containing the symbol
    -   "uri" (string, REQUIRED): Absolute URI of the document (must start with "file://")
-   "position" (object, OPTIONAL): The position of the symbol to get declaration for
    -   "line" (number, REQUIRED): Zero-based line number where the symbol is located
    -   "character" (number, REQUIRED): Zero-based character position within the line

**Parameter Requirements:**
- Either legacy format (textDocument + position) OR new format (uri + line/character OR uri + symbolName) must be provided
- For new format: Either provide position (line + character) OR symbolName for name-based lookup
- Line and character positions are 0-based (first line is 0, first character is 0)
- The URI must be an absolute file path with "file://" prefix

### Examples:

**New Flattened Format Examples:**

1.  **Find import statement for a React hook by name:**
    \`\`\`xml
    <lsp_get_declaration>{"uri":"file:///src/components/App.tsx","symbolName":"useState"}</lsp_get_declaration>
    \`\`\`
    *Use case: Find where \`useState\` is imported from without knowing exact position*

2.  **Navigate to function declaration by position:**
    \`\`\`xml
    <lsp_get_declaration>{"uri":"file:///src/main.cpp","line":25,"character":12}</lsp_get_declaration>
    \`\`\`
    *Use case: From function call to its prototype in .h file*

3.  **Find export statement for utility function by name:**
    \`\`\`xml
    <lsp_get_declaration>{"uri":"file:///src/utils/helpers.js","symbolName":"formatDate"}</lsp_get_declaration>
    \`\`\`
    *Use case: Find where \`formatDate\` is exported without knowing exact location*

4.  **Locate class declaration by name:**
    \`\`\`xml
    <lsp_get_declaration>{"uri":"file:///src/models/user.ts","symbolName":"UserService"}</lsp_get_declaration>
    \`\`\`
    *Use case: Find where \`UserService\` class is declared*

5.  **Find variable declaration by name:**
    \`\`\`xml
    <lsp_get_declaration>{"uri":"file:///src/config/settings.js","symbolName":"API_BASE_URL"}</lsp_get_declaration>
    \`\`\`
    *Use case: Find where \`API_BASE_URL\` constant is declared*

**Legacy Format Examples (Still Supported):**

6.  **Navigate to function declaration in C++ header (legacy):**
    \`\`\`xml
    <lsp_get_declaration>{"textDocument":{"uri":"file:///src/main.cpp"},"position":{"line":25,"character":12}}</lsp_get_declaration>
    \`\`\`
    *Use case: From function call to its prototype in .h file*

7.  **Trace Python import to source (legacy):**
    \`\`\`xml
    <lsp_get_declaration>{"textDocument":{"uri":"file:///src/main.py"},"position":{"line":18,"character":22}}</lsp_get_declaration>
    \`\`\`
    *Use case: From \`pandas.DataFrame\` to \`import pandas\`*
────────────────────────────────────────────────────────────────────────────

### Language-Specific Considerations:

**TypeScript/JavaScript:**
- Navigates to import statements, export declarations, and module boundaries
- Particularly useful for tracing external library imports
- Handles ES6 modules, CommonJS, and AMD module systems

**C/C++:**
- Jumps to function prototypes in header files
- Finds forward declarations of classes and structs
- Navigates to extern variable declarations
- Useful for understanding header dependencies

**Python:**
- Locates import statements and from-import declarations
- Finds function and class declarations in module files
- Handles package-level imports and namespace navigation

**Java/C#:**
- Navigates to interface declarations and class imports
- Finds package imports and using statements
- Useful for exploring framework and library declarations

**Go:**
- Jumps to package import statements
- Finds function and type declarations across packages
- Helpful for understanding module dependencies

### Declaration vs Definition Distinction:

**When to use \`lsp_get_declaration\`:**
- Finding where a symbol is introduced or imported
- Navigating to header files or interface definitions
- Tracing module dependencies and import chains
- Understanding symbol visibility and scope

**When to use \`go_to_definition\` instead:**
- Finding the actual implementation of a function or method
- Navigating to where a variable is assigned its value
- Jumping to the complete implementation code

### Common Error Prevention:

**Symbol Selection:**
- Position cursor exactly on the symbol name, not on keywords or operators
- Avoid whitespace, comments, or string literals
- For qualified names (e.g., \`Math.PI\`), position on the specific part you want

**Language Server Requirements:**
- Ensure the language server has indexed all relevant files
- Some symbols may not have separate declarations (returns null)
- Forward declarations may not be available for all symbol types

**File Scope:**
- Only works on symbols that have declaration information
- Local variables typically don't have separate declarations
- Some dynamically imported symbols may not be traceable
────────────────────────────────────────────────────────────────────────────
`
}
