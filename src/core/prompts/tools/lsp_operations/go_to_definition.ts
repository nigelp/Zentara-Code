import { ToolArgs } from "../types"

export function getGoToDefinitionToolDescription(args: ToolArgs): string {
	return `## lsp_go_to_definition – Instantly navigates to the source definition of a symbol.

Description:
The "lsp_go_to_definition" tool leverages the Language Server Protocol (LSP) to instantly navigate to the source definition of any symbol in your codebase. Instead of manually searching for function, class, variable, or type definitions - which consumes significant time and tokens - this tool uses the LSP's semantic understanding to jump directly to the exact location where a symbol is declared.

### When This Operation Is Most Beneficial:

1. **Code Exploration & Understanding**:
   - When you encounter an unfamiliar function call and need to understand its implementation
   - Exploring third-party libraries or large codebases where manual navigation is impractical
   - Understanding the structure and behavior of classes, interfaces, or types
   - Verifying the actual implementation behind abstract interfaces or base classes

2. **Debugging & Code Analysis**:
   - Tracing the source of bugs by following function definitions back to their implementation
   - Understanding the flow of execution by jumping to method definitions
   - Verifying parameter types and return values of functions
   - Checking if a method is overridden in derived classes

3. **Refactoring & Code Maintenance**:
   - Before modifying a function, jump to its definition to understand its full context
   - Understanding dependencies and relationships between different code components
   - Verifying the scope and usage of variables or constants
   - Finding the original declaration of imported symbols

4. **Learning & Documentation**:
   - Exploring how certain patterns or algorithms are implemented in the codebase
   - Understanding the architecture by following key component definitions
   - Learning from well-written code by examining implementation details

### Specific Developer Workflows That Benefit:

- **API Integration**: Jump to service method definitions to understand expected parameters and return types
- **Error Investigation**: Navigate to exception class definitions to understand error handling
- **Performance Analysis**: Find the actual implementation of methods that might be performance bottlenecks
- **Code Review**: Quickly jump to definitions of modified functions to understand their context
- **Feature Development**: Understand existing similar features by exploring their implementation
- **Testing**: Navigate to the actual implementation being tested to write better test cases

This tool is a massive time and token saver compared to manual text searches or file browsing, especially in large codebases with complex inheritance hierarchies or module structures.

### Return Value:
The tool returns a JSON response containing the precise location(s) of the symbol's definition. The response can contain:

1. **Single Location**: A 'Location' object for symbols with one definition
2. **Multiple Locations**: An array of 'Location' objects for symbols with multiple definitions (e.g., overloaded functions)
3. **Null/Empty**: If the definition cannot be found or the symbol is not recognized

#### Location Object Structure:
- **uri** (string): The absolute URI of the file containing the definition
- **range** (object): An object defining the exact location of the symbol's definition
  - **start** (object): The starting position of the definition
    - **line** (number): The 0-based line number
    - **character** (number): The 0-based character position
  - **end** (object): The ending position of the definition
    - **line** (number): The 0-based line number
    - **character** (number): The 0-based character position
- **preview** (string): A string containing the full line of code where the definition is declared, providing immediate context without needing to read the file

#### Example Response:
\`\`\`json
{
  "uri": "file:///src/utils/helpers.py",
  "range": {
    "start": { "line": 15, "character": 4 },
    "end": { "line": 15, "character": 20 }
  },
  "preview": "def calculate_total(items):"
}
\`\`\`

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_go_to_definition> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_go_to_definition> tag.
3️⃣ The JSON object MUST contain "uri" and either position ("line"/"character") OR "symbolName" keys (FLATTENED, not nested).
4️⃣ Ensure the <lsp_go_to_definition> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string (e.g., missing quotes around keys, trailing commas, unclosed braces).
• Missing required "uri" key or both position and symbolName parameters.
• Incorrect URI format - must be absolute file URI (e.g., "file:///absolute/path/to/file.ts").
• Invalid line/character coordinates - out of bounds or negative.
• Using relative paths instead of absolute file URIs.

────────────  COPY-READY TEMPLATES  ────────────
Position-based: <lsp_go_to_definition>{"uri":"file:///path/to/file.ts","line":10,"character":5}</lsp_go_to_definition>
Name-based: <lsp_go_to_definition>{"uri":"file:///path/to/file.ts","symbolName":"functionName"}</lsp_go_to_definition>
Legacy format: <lsp_go_to_definition>{"textDocument":{"uri":"file:///path/to/file.ts"},"position":{"line":10,"character":5}}</lsp_go_to_definition>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_go_to_definition> tag.

**⚠️ IMPORTANT: All parameters are FLATTENED (not nested in textDocument/position objects)**

**Required Parameters:**
-   "uri" (string, REQUIRED): Absolute file URI of the document (e.g., "file:///absolute/path/to/file.ts").

**Position-based Lookup Parameters (optional):**
-   "line" (number, OPTIONAL): 0-based line number where the symbol is located (first line is 0).
-   "character" (number, OPTIONAL): 0-based character position within the line where the symbol is located (first character is 0).

**TIP**: You can get the precise line and character location of a symbol from the \`lsp_get_document_symbols\` tool's result using \`symbol.selectionRange.start.line\` and \`symbol.selectionRange.start.character\` (which point to the symbol name, not the keyword).

**Name-based Lookup Parameter (optional):**
-   "symbolName" (string, OPTIONAL): The name of the symbol to find (e.g., "myFunction", "MyClass", "variableName").

**Note**: Either position parameters ('line' and 'character') OR 'symbolName' must be provided.

**Legacy Format Support (backward compatibility):**
-   "textDocument" (object, OPTIONAL): Legacy nested format - The document containing the symbol.
    -   "uri" (string, REQUIRED): URI of the document (e.g., "file:///path/to/file.ts").
-   "position" (object, OPTIONAL): Legacy nested format - The position of the symbol.
    -   "line" (number, REQUIRED): Zero-based line number (LSP standard).
    -   "character" (number, REQUIRED): Zero-based character position within the line.

### Examples:

1.  **Go to the definition of a function call in a Python file:**
    \`\`\`xml
    <lsp_go_to_definition>{"textDocument":{"uri":"file:///src/utils/helpers.py"},"position":{"line":42,"character":15}}</lsp_go_to_definition>
    \`\`\`

2.  **Navigate to a class definition in TypeScript:**
    \`\`\`xml
    <lsp_go_to_definition>{"textDocument":{"uri":"file:///src/models/User.ts"},"position":{"line":15,"character":8}}</lsp_go_to_definition>
    \`\`\`

3.  **Jump to variable declaration in JavaScript:**
    \`\`\`xml
    <lsp_go_to_definition>{"textDocument":{"uri":"file:///src/components/Button.js"},"position":{"line":25,"character":12}}</lsp_go_to_definition>
    \`\`\`

4.  **Find the definition of an imported module/symbol:**
    \`\`\`xml
    <lsp_go_to_definition>{"textDocument":{"uri":"file:///src/index.ts"},"position":{"line":3,"character":20}}</lsp_go_to_definition>
    \`\`\`

5.  **Navigate to interface definition in a large codebase:**
    \`\`\`xml
    <lsp_go_to_definition>{"textDocument":{"uri":"file:///src/types/api.ts"},"position":{"line":67,"character":25}}</lsp_go_to_definition>
    \`\`\`
────────────────────────────────────────────────────────────────────────────
`
}
