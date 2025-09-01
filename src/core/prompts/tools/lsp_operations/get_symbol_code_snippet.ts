import { ToolArgs } from "../types"

export function getGetSymbolCodeSnippetToolDescription(args: ToolArgs): string {
	return `## lsp_get_symbol_code_snippet – Retrieves a semantically enriched code snippet with automatic boundary detection.

Description:
This advanced, semantic-aware tool automatically detects symbol boundaries using LSP capabilities and optionally enriches the response with call hierarchy and usage information. It only needs a cursor position and will intelligently determine the relevant code block.

### Key Features:
- **Automatic Boundary Detection**: Uses document symbols strategy for reliable boundary detection
- **Semantic Enrichment**: Optional call hierarchy and usage analysis
- **Performance Optimized**: Intelligent caching, timeout protection, and response truncation
- **Configurable Output**: Control exactly what information is included

### When to Use This Tool:

**⚠️ IMPORTANT: TOKEN-EXPENSIVE TOOL - USE STRUCTURE-FIRST APPROACH**
This tool can return very long code snippets and should be used judiciously. **ALWAYS use \`lsp_get_symbol_children\` FIRST** to understand the structure of classes, interfaces, or modules before extracting full code. This structure-first approach:
- Saves significant tokens by showing only symbol names and types
- Helps you identify exactly which parts need detailed code examination
- Prevents unnecessary retrieval of large code blocks
- Allows for more targeted and efficient code analysis

**Use this tool ONLY when:**
1. **Intelligent Code Analysis**: When you need to understand a symbol at a specific position without knowing its exact boundaries
2. **Comprehensive Symbol Investigation**: When you want code + call relationships + usage patterns in one request
3. **Refactoring Preparation**: Before modifying code, see its implementation, callers, and usages
4. **Code Understanding**: Learning how unfamiliar functions/classes work and how they're used
5. **Impact Analysis**: Understanding the full scope of a symbol's influence in the codebase

**MANDATORY WORKFLOW:**
1. **First**: Use \`lsp_get_document_symbols\` for file overview
2. **Second**: Use \`lsp_get_symbol_children\` to explore symbol structure
3. **Finally**: Use \`lsp_get_symbol_code_snippet\` ONLY for symbols that need detailed code examination

### Return Value:
The tool returns a compact, token-efficient response wrapped in a success object:

\`\`\`json
{
  "success": true,
  "data": {
    "snippet": "11→function processData(input: any[]) {\\n12→    return input.filter(item => item.isValid);\\n13→}",
    "uri": "file:///src/utils/processor.ts",
    "range": "10:0-13:1",
    "symbol": "processData(12)",
    "callHierarchy": {
      "incomingCalls": "FROM_NAME | FROM_KIND | FROM_URI | FROM_RANGE | FROM_SELECTION | CALL_RANGES | EOL\\nmain | 12 | /src/app.ts | 25:0-25:10 | 25:0-4 | 25:10-21 | <<<",
      "outgoingCalls": "TO_NAME | TO_KIND | TO_URI | TO_RANGE | TO_SELECTION | CALL_RANGES | EOL\\n"
    },
    "usages": "URI | RANGE | PREVIEW | EOL\\nfile:///src/app.ts | 25:10-25:21 | const result = processData(items) | <<<"
  }
}
\`\`\`

**Compact Format Details:**
- **snippet**: Multi-line code with 1-based line numbers (e.g., "11→function name()")
- **range**: Compact format "startLine:startChar-endLine:endChar" instead of full JSON object
- **symbol**: Compact format "symbolName(kindNumber)" instead of full symbolInfo object
- **callHierarchy**: Full call hierarchy data in table format when requested and available
- **usages**: Full usage data in table format when requested and available
- **Token Efficient**: Reduced output size while preserving all essential semantic information for LLM processing

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_get_symbol_code_snippet> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_get_symbol_code_snippet> tag.
3️⃣ The JSON object MUST contain "uri" and either position ("line"/"character") OR "symbolName" keys (FLATTENED, not nested).
4️⃣ Ensure the <lsp_get_symbol_code_snippet> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string (e.g., missing quotes around keys, trailing commas, unclosed braces).
• Missing required "uri" key or both position and symbolName parameters.
• Incorrect URI format - must be absolute file URI (e.g., "file:///absolute/path/to/file.ts").
• Invalid line/character coordinates - out of bounds or negative.
• Using relative paths instead of absolute file URIs.
• Exceeding limits: maxCallHierarchyItems (1-100), maxUsages (1-1000).

────────────  COPY-READY TEMPLATES  ────────────
Position-based: <lsp_get_symbol_code_snippet>{"uri":"file:///path/to/file.ts","line":10,"character":5}</lsp_get_symbol_code_snippet>
Name-based: <lsp_get_symbol_code_snippet>{"uri":"file:///path/to/file.ts","symbolName":"functionName"}</lsp_get_symbol_code_snippet>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_get_symbol_code_snippet> tag.

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

**Optional Configuration Parameters:**
-   "includeCallHierarchy" (boolean, optional): Whether to include call hierarchy information. Defaults to \`true\`.
-   "includeUsages" (boolean, optional): Whether to include symbol usages (references) across the codebase. Defaults to \`true\`.
-   "maxCallHierarchyItems" (number, optional): Maximum number of call hierarchy items to return. Must be between 1-100. Defaults to \`5\`.
-   "maxUsages" (number, optional): Maximum number of usages to return. Must be between 1-1000. Defaults to \`5\`.

### Examples:

1.  **Basic usage with default enrichment (recommended):**
    \`\`\`xml
    <lsp_get_symbol_code_snippet>{"uri":"file:///src/services/UserService.ts","line":25,"character":10}</lsp_get_symbol_code_snippet>
    \`\`\`

2.  **Get snippet with only code (no enrichment):**
    \`\`\`xml
    <lsp_get_symbol_code_snippet>{"uri":"file:///src/utils/helpers.ts","line":50,"character":8,"includeCallHierarchy":false,"includeUsages":false}</lsp_get_symbol_code_snippet>
    \`\`\`

3.  **Get snippet with call hierarchy but no usages:**
    \`\`\`xml
    <lsp_get_symbol_code_snippet>{"uri":"file:///src/models/Product.ts","line":10,"character":2,"includeUsages":false}</lsp_get_symbol_code_snippet>
    \`\`\`

4.  **Comprehensive analysis with higher limits:**
    \`\`\`xml
    <lsp_get_symbol_code_snippet>{"uri":"file:///src/core/Engine.ts","line":42,"character":12,"maxUsages":100,"maxCallHierarchyItems":50}</lsp_get_symbol_code_snippet>
    \`\`\`

5.  **Name-based lookup (find symbol by name):**
    \`\`\`xml
    <lsp_get_symbol_code_snippet>{"uri":"file:///src/services/UserService.ts","symbolName":"getUserById"}</lsp_get_symbol_code_snippet>
    \`\`\`

6.  **Name-based lookup with configuration:**
    \`\`\`xml
    <lsp_get_symbol_code_snippet>{"uri":"file:///src/models/Product.ts","symbolName":"ProductModel","includeUsages":false,"maxCallHierarchyItems":10}</lsp_get_symbol_code_snippet>
    \`\`\`


### Common Workflow Patterns:

1.  **Structure-First Analysis (RECOMMENDED):**
    -   First: Use \`lsp_get_document_symbols\` to get file overview
    -   Second: Use \`lsp_get_symbol_children\` to explore specific symbol structure
    -   Finally: Use \`lsp_get_symbol_code_snippet\` only for symbols that need detailed code examination
    -   Most token-efficient approach for understanding unfamiliar code

2.  **Comprehensive Symbol Analysis:**
    -   Use lsp_get_symbol_code_snippet with default settings to get code + relationships + usages in one call
    -   Perfect for understanding unfamiliar code or preparing for refactoring
    -   **WARNING**: Can be very token-expensive, use only after structure exploration

3.  **Performance-Focused Code Review:**
    -   Use with \`"includeUsages":false\` if you only need the code and call hierarchy
    -   Faster execution when you don't need to see all references

4.  **Impact Analysis Before Changes:**
    -   Use with higher limits (maxUsages: 100) to see comprehensive usage patterns
    -   Essential before making breaking changes to widely-used functions

5.  **Debugging and Tracing:**
    -   Use with call hierarchy to understand execution flow
    -   Combine with usages to see all potential entry points

This tool provides comprehensive semantic analysis with automatic boundary detection, making it ideal for intelligent code understanding and refactoring preparation.
`
}
