import { ToolArgs } from "../types"

export function getGetDocumentSymbolsToolDescription(args: ToolArgs): string {
	return `## lsp_get_document_symbols – Returns a structured, hierarchical outline of all symbols in a file.

Description:
This tool is the most token-efficient way to understand the architecture of a single file. Instead of reading the entire file's content, which is expensive, \`lsp_get_document_symbols\` provides a clean, structured overview of every class, function, method, and variable defined within it. It essentially gives you a "table of contents" for the code.

### When to Use This Tool:

**Primary Use Cases:**
- **High-Level File Analysis**: Before diving into a file's logic, use this to quickly grasp its main components
- **Efficient Code Navigation**: Identify the key functions and classes you need to inspect further, allowing you to use more targeted tools like \`lsp_go_to_definition\` or read only specific line ranges
- **Understanding Code Structure**: See how a file is organized - many small functions or few large classes? Are symbols nested logically?
- **Token Optimization**: Get a complete structural map of a file for a fraction of the token cost of reading the raw text
- **Code Review Preparation**: Quickly understand what changed in a file during code reviews
- **Refactoring Planning**: Identify dependencies and relationships before making structural changes

**Specific Scenarios:**
- Exploring unfamiliar codebases to understand file organization
- Finding specific functions or classes without reading entire files
- Analyzing class hierarchies and method distributions
- Understanding module exports and public interfaces
- Preparing targeted code modifications by understanding existing structure

**Workflow Integration:**
- Use before \`lsp_go_to_definition\` to understand context
- Combine with \`lsp_get_completions\` for intelligent code generation
- Follow up with targeted file reads based on symbol locations
- Use to validate refactoring results by comparing before/after structures

### Return Value:
The tool returns a compact, token-efficient table format optimized for LLM consumption:
\`\`\`
{
  "success": true,
  "format": "table",
  "symbols": "NAME | KIND | RANGE | SELECTION | PARENT | HOVER_INFO | EOL\\nMyClass | 5 | 10:0-50:1 | 10:6-13 |  | class MyClass - A sample class | <<<\\nmethod | 11 | 15:4-20:5 | 15:11-17 | MyClass | public method(): void | <<<"
}
\`\`\`

**Table Format Benefits:**
- **Token efficient** - Compact representation optimized for LLM consumption
- **Easy scanning** for specific symbols or relationships
- **Relationship preservation** through PARENT column
- **Rich documentation** via HOVER_INFO column (when enabled)
- **Consistent structure** for reliable parsing

**Table Column Definitions:**
- **NAME**: Symbol name (e.g., "MyClass", "calculateTotal")
- **KIND**: LSP symbol kind number (5=Class, 11=Method, 12=Function, 13=Constructor, 14=Variable)
- **RANGE**: Full symbol range in format "line:char-char" or "startLine:startChar-endLine:endChar"
- **SELECTION**: Selection range (symbol name location)
- **PARENT**: Parent symbol name (empty for top-level symbols)
- **HOVER_INFO**: Complete type signatures, JSDoc comments, and documentation (when include_hover=true)
- **EOL**: End-of-line marker "<<<" for clear row separation

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_get_document_symbols> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_get_document_symbols> tag.
3️⃣ The JSON object MUST contain a "textDocument" object with a "uri" key.
4️⃣ Ensure the <lsp_get_document_symbols> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string (e.g., missing quotes around keys, trailing commas)
• Missing required "textDocument" key in the JSON
• Incorrect path for the "uri" value (file must exist and be accessible)
• Using relative paths instead of absolute file URIs
• Forgetting to close the tag properly
• Including extra whitespace or characters outside the JSON object

────────────  COPY-READY TEMPLATES  ────────────
Basic usage: <lsp_get_document_symbols>{"textDocument":{"uri":"file:///path/to/file.ts"}}</lsp_get_document_symbols>

With children enabled: <lsp_get_document_symbols>{"textDocument":{"uri":"file:///path/to/file.ts"}, "return_children": "yes"}</lsp_get_document_symbols>

Without hover info: <lsp_get_document_symbols>{"textDocument":{"uri":"file:///path/to/file.ts"}, "include_hover": false}</lsp_get_document_symbols>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_get_document_symbols> tag.

**Required Parameters:**
-   "textDocument" (object, REQUIRED): The document to analyze.
    -   "uri" (string, REQUIRED): URI of the document (e.g., "file:///path/to/file.ts").

**Optional Parameters:**
-   "return_children" (string, optional): Controls whether to return nested symbols. Default: "no".
    -   \`"yes"\`: Always return the full symbol hierarchy.
    -   \`"no"\`: Return only the top-level symbols.
    -   \`"auto"\`: Returns the full hierarchy. However, if the total number of symbols returned would create a response over 100 lines long, it will only return the top-level symbols to save space.

-   "include_hover" (boolean, optional): Whether to include hover information in table format. Default: true. If the number of symbols is greater than 20 and this parameter is not provided, it will default to false.
    -   \`true\`: Include rich type signatures, JSDoc comments, and documentation in HOVER_INFO column.
    -   \`false\`: Exclude hover information for more compact output.
    - It is recommended to let the tool automatically decide whether to include hover information. Forcing \`include_hover: true\` on files with many symbols can be very token-intensive and may pollute the context window.

### Examples:

1.  **Basic file analysis:**
    \`\`\`xml
    <lsp_get_document_symbols>{"textDocument":{"uri":"file:///src/utils/helpers.ts"}}</lsp_get_document_symbols>
    \`\`\`
    *Use case: Quick overview of file structure with rich documentation*

2.  **Analyze with full hierarchy and documentation:**
    \`\`\`xml
    <lsp_get_document_symbols>{"textDocument":{"uri":"file:///src/services/UserService.ts"}, "return_children": "yes"}</lsp_get_document_symbols>
    \`\`\`
    *Use case: Understanding complete class structure including methods and properties*


### Table Format Example Output:

For a TypeScript class file, the table format provides a clean, scannable overview:

\`\`\`
NAME | KIND | RANGE | SELECTION | PARENT | HOVER_INFO | EOL
UserService | 5 | 10:0-50:1 | 10:13-24 |  | export class UserService - Handles user operations @example const service = new UserService() | <<<
constructor | 13 | 15:4-18:5 | 15:4-15 | UserService | constructor(apiClient: ApiClient) - Creates a new UserService instance | <<<
getUser | 11 | 20:4-25:5 | 20:11-18 | UserService | async getUser(id: string): Promise<User> - Retrieves a user by ID @param id The user identifier | <<<
createUser | 11 | 27:4-35:5 | 27:11-21 | UserService | async createUser(userData: CreateUserRequest): Promise<User> - Creates a new user | <<<
\`\`\`



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

────────────────────────────────────────────────────────────────────────────
`
}
