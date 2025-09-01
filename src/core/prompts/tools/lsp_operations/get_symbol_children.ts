import { ToolArgs } from "../types"

export function getGetSymbolChildrenToolDescription(args: ToolArgs): string {
	return `## lsp_get_symbol_children – Returns children of a specific symbol with configurable depth.

Description:
This tool finds a symbol at a specific position and returns its children with configurable depth. Unlike \`lsp_get_document_symbols\` which returns all symbols in a document, this tool focuses on the children of a specific symbol, making it ideal for exploring symbol hierarchies in a targeted way.

### When to Use This Tool:

**Primary Use Cases:**
- **Symbol Hierarchy Exploration**: Explore the internal structure of classes, interfaces, or modules
- **Targeted Code Analysis**: Focus on specific symbol children without the noise of the entire document
- **Incremental Code Discovery**: Progressively explore code structure by drilling down into specific symbols
- **Method/Property Investigation**: Understand what methods and properties a class contains
- **Interface Implementation Analysis**: See what members an interface or abstract class defines

**Specific Scenarios:**
- Exploring class methods and properties without seeing unrelated code
- Understanding module exports and their structure
- Analyzing interface definitions and their members
- Investigating nested class or namespace contents
- Preparing for targeted refactoring of specific symbol children

**Workflow Integration:**
- **CRITICAL**: Use after \`lsp_get_document_symbols\` to drill down into specific symbols
- **POSITIONING**: Use the exact SELECTION range coordinates from \`lsp_get_document_symbols\` (e.g., if SELECTION shows "143:13-17", use line=143, character=13)
- **NO CONVERSION**: All coordinates are 0-based - use them exactly as provided without any indexing adjustments
- Combine with \`lsp_go_to_definition\` to explore symbol definitions and their children
- Follow up with \`lsp_get_symbol_code_snippet\` for detailed code examination
- Use with different depth levels to progressively explore complex hierarchies

### Return Value:
The tool returns a compact, token-efficient table format optimized for LLM consumption:
\`\`\`
{
  "success": true,
  "children": "NAME | KIND | RANGE | SELECTION | PARENT | HOVER_INFO | EOL\\nmethod1 | 11 | 15:4-20:5 | 15:11-18 | MyClass | public method1(): void | <<<\\nproperty1 | 6 | 22:4-22:20 | 22:11-20 | MyClass | private property1: string | <<<"
}
\`\`\`

**Table Format Benefits:**
- **Token efficient** - Compact representation optimized for LLM consumption
- **Easy scanning** for specific children or relationships
- **Relationship preservation** through PARENT column
- **Rich documentation** via HOVER_INFO column (when enabled)
- **Consistent structure** for reliable parsing

**Table Column Definitions:**
- **NAME**: Symbol name (e.g., "method1", "property1")
- **KIND**: LSP symbol kind number (5=Class, 11=Method, 12=Function, 13=Constructor, 14=Variable, 6=Property)
- **RANGE**: Full symbol range in format "line:char-char" or "startLine:startChar-endLine:endChar"
- **SELECTION**: Selection range (symbol name location)
- **PARENT**: Parent symbol name (the symbol whose children we're exploring)
- **HOVER_INFO**: Complete type signatures, JSDoc comments, and documentation (when include_hover=true)
- **EOL**: End-of-line marker "<<<" for clear row separation

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_get_symbol_children> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_get_symbol_children> tag.
3️⃣ The JSON object MUST contain "uri", "line", and "character" keys (FLATTENED, not nested).
4️⃣ Ensure the <lsp_get_symbol_children> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string (e.g., missing quotes around keys, trailing commas)
• Missing required "uri", "line", or "character" keys
• Incorrect path for the "uri" value (file must exist and be accessible)
• Using relative paths instead of absolute file URIs
• Forgetting to close the tag properly
• Including extra whitespace or characters outside the JSON object

────────────  COPY-READY TEMPLATES  ────────────
Position-based: <lsp_get_symbol_children>{"uri":"file:///path/to/file.ts","line":10,"character":5}</lsp_get_symbol_children>

Name-based: <lsp_get_symbol_children>{"uri":"file:///path/to/file.ts","symbolName":"MyClass"}</lsp_get_symbol_children>

With depth control: <lsp_get_symbol_children>{"uri":"file:///path/to/file.ts","line":10,"character":5,"deep":"2"}</lsp_get_symbol_children>

Name-based with depth: <lsp_get_symbol_children>{"uri":"file:///path/to/file.ts","symbolName":"UserService","deep":"all"}</lsp_get_symbol_children>

Without hover info: <lsp_get_symbol_children>{"uri":"file:///path/to/file.ts","line":10,"character":5,"include_hover":false}</lsp_get_symbol_children>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_get_symbol_children> tag.

**⚠️ IMPORTANT: All parameters are FLATTENED (not nested in textDocument/position objects)**

**Required Parameters:**
-   "uri" (string, REQUIRED): Absolute file URI of the document (e.g., "file:///absolute/path/to/file.ts").

**Symbol Lookup Parameters (choose ONE method):**

**Method 1: Position-based lookup (recommended for precision)**
-   "line" (number, optional): 0-based line number where the symbol is located (first line is 0).
-   "character" (number, optional): 0-based character position within the line where the symbol is located (first character is 0).
 **TIP**: You can get the precise line and character location of a symbol from the \`lsp_get_document_symbols\` tool's result using \`symbol.selectionRange.start.line\` and \`symbol.selectionRange.start.character\` (which point to the symbol name, not the keyword).

**Method 2: Name-based lookup (convenient for known symbol names)**
-   "symbolName" (string, optional): The exact name of the symbol to find (e.g., "MyClass", "calculateTotal", "UserService").
-   ⚠️ If multiple symbols have the same name, the first match will be used.
-   ✅ Useful when you know the exact symbol name but don't have position coordinates.
-   ✅ Works across the entire document - finds symbols anywhere in the file.

**Optional Parameters:**
-   "deep" (string|number, optional): Controls the depth of children to return. Default: "1".
    -   \`"1"\` or \`1\`: Return only direct children (1 level deep).
    -   \`"2"\` or \`2\`: Return children and grandchildren (2 levels deep).
    -   \`"3"\` or \`3\`: Return up to 3 levels of nested children.
    -   \`"all"\`: Return all nested children regardless of depth.

-   "include_hover" (boolean, optional): Whether to include hover information in table format. Default: true. If the number of children is greater than 20 and this parameter is not provided, it will default to false.
    -   \`true\`: Include rich type signatures, JSDoc comments, and documentation in HOVER_INFO column.
    -   \`false\`: Exclude hover information for more compact output.
    - It is recommended to let the tool automatically decide whether to include hover information. Forcing \`include_hover: true\` on symbols with many children can be very token-intensive and may pollute the context window.

### Examples:

1.  **Basic symbol children exploration (position-based):**
    \`\`\`xml
    <lsp_get_symbol_children>{"uri":"file:///src/services/UserService.ts","line":10,"character":13}</lsp_get_symbol_children>
    \`\`\`
    *Use case: Explore direct children of a class at line 10*

2.  **Basic symbol children exploration (name-based):**
    \`\`\`xml
    <lsp_get_symbol_children>{"uri":"file:///src/services/UserService.ts","symbolName":"UserService"}</lsp_get_symbol_children>
    \`\`\`
    *Use case: Explore direct children of the UserService class by name*

3.  **Deep exploration with 2 levels:**
    \`\`\`xml
    <lsp_get_symbol_children>{"uri":"file:///src/models/Product.ts","line":5,"character":6,"deep":"2"}</lsp_get_symbol_children>
    \`\`\`
    *Use case: Explore children and grandchildren of a symbol*

4.  **Name-based lookup with depth control:**
    \`\`\`xml
    <lsp_get_symbol_children>{"uri":"file:///src/models/Product.ts","symbolName":"Product","deep":"all"}</lsp_get_symbol_children>
    \`\`\`
    *Use case: Explore all children of the Product class by name*

5.  **All children without hover information:**
    \`\`\`xml
    <lsp_get_symbol_children>{"uri":"file:///src/components/Dashboard.tsx","line":15,"character":10,"deep":"all","include_hover":false}</lsp_get_symbol_children>
    \`\`\`
    *Use case: Get complete hierarchy without documentation details*

6.  **Name-based lookup without hover information:**
    \`\`\`xml
    <lsp_get_symbol_children>{"uri":"file:///src/components/Dashboard.tsx","symbolName":"Dashboard","include_hover":false}</lsp_get_symbol_children>
    \`\`\`
    *Use case: Explore Dashboard component children by name without docs*

### Table Format Example Output:

For a TypeScript class, the table format provides a clean, scannable overview of its children:

\`\`\`
NAME | KIND | RANGE | SELECTION | PARENT | HOVER_INFO | EOL
constructor | 13 | 15:4-18:5 | 15:4-15 | UserService | constructor(apiClient: ApiClient) - Creates a new UserService instance | <<<
getUser | 11 | 20:4-25:5 | 20:11-18 | UserService | async getUser(id: string): Promise<User> - Retrieves a user by ID @param id The user identifier | <<<
createUser | 11 | 27:4-35:5 | 27:11-21 | UserService | async createUser(userData: CreateUserRequest): Promise<User> - Creates a new user | <<<
deleteUser | 11 | 37:4-42:5 | 37:11-21 | UserService | async deleteUser(id: string): Promise<void> - Deletes a user by ID | <<<
\`\`\`

This format provides:
- **Immediate symbol identification** via NAME column
- **Type classification** via KIND column (11=Method, 13=Constructor, 6=Property)
- **Precise location** via RANGE and SELECTION columns
- **Hierarchy understanding** via PARENT column
- **Rich context** via HOVER_INFO column with types, parameters, and documentation
- **Clear separation** via EOL markers

### Symbol Kind Reference:

Common LSP symbol kinds you'll encounter:
- **1** = File
- **2** = Module/Namespace
- **5** = Class
- **6** = Property
- **11** = Method
- **12** = Function
- **13** = Constructor
- **14** = Variable
- **15** = Constant
- **16** = String
- **17** = Number
- **18** = Boolean
- **22** = Enum
- **23** = Interface

### Common Workflow Patterns:

1.  **Progressive Symbol Exploration:**
    -   Use \`lsp_get_document_symbols\` to get file overview
    -   Use \`lsp_get_symbol_children\` with depth=1 to explore specific symbols
    -   Use deeper levels or "all" for complex hierarchies

2.  **Class Analysis:**
    -   Position cursor on class name
    -   Use depth=1 to see methods and properties
    -   Use depth=2 to see nested classes or complex method signatures

3.  **Interface Investigation:**
    -   Position cursor on interface name
    -   Use depth="all" to see complete interface definition
    -   Combine with \`lsp_find_implementations\` to see implementations

4.  **Module Exploration:**
    -   Position cursor on module/namespace declaration
    -   Use progressive depth levels to understand module structure
    -   Focus on specific exports and their children

────────────────────────────────────────────────────────────────────────────
`
}