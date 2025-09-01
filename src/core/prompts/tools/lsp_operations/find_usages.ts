import { ToolArgs } from "../types"

export function getFindUsagesToolDescription(args: ToolArgs): string {
	return `## lsp_find_usages – Finds all semantically-aware references to a symbol at a specified location

Description:
The "lsp_find_usages" tool leverages the Language Server Protocol (LSP) to perform deep semantic analysis and find all references to a symbol (variable, function, class, method, property, etc.) at a specified location.
Unlike simple text search which can return false positives, this tool understands the code's structure and scope, returning only true semantic references.

### When to Use This Operation:

**Primary Use Cases:**
- **Impact Analysis Before Refactoring**: Before renaming, modifying, or deleting a symbol, identify every location where it's used to understand the full scope of changes required
- **Code Navigation and Understanding**: Quickly grasp how different parts of the codebase are connected and understand data flow patterns
- **Dependency Analysis**: Determine if a function/variable is heavily used (many references) or lightly used (few references) to guide refactoring decisions
- **Safe Code Modifications**: Ensure all usage sites are updated when changing a symbol's signature or behavior
- **Dead Code Detection**: Find symbols with zero references that might be candidates for removal
- **API Usage Analysis**: Understand how public APIs or interfaces are consumed across the codebase

**Specific Developer Workflows:**
1. **Before Renaming**: Check all usages before using IDE rename functionality to understand scope
2. **Function Signature Changes**: Find all call sites that need updating when changing parameters
3. **Legacy Code Cleanup**: Identify unused or rarely used functions/variables for potential removal
4. **API Design**: Understand how existing APIs are used to inform design decisions
5. **Bug Investigation**: Trace where a problematic variable or function is used to understand bug propagation
6. **Code Review**: Validate that new code properly handles all existing usage patterns

**When This Operation is Most Beneficial:**
- Working with large codebases where manual searching is impractical
- Before making breaking changes to public APIs or widely-used functions
- When you need to understand the full scope of a change before implementation
- Investigating data flow and dependencies in complex systems
- Ensuring comprehensive test coverage by finding all usage patterns

### Return Value:
The tool returns a compact table format optimized for token efficiency:

\`\`\`
URI | RANGE | PREVIEW | EOL
file:///src/app/main.ts | 15:8-15:20 | const result = myFunction(); | <<<
file:///src/utils/helper.js | 42:4-42:16 | return myFunction(data); | <<<
file:///src/components/Button.tsx | 28:12-28:24 | onClick={myFunction} | <<<
\`\`\`

**Table Format Benefits:**
- **Token Efficient**: 90% reduction in tokens compared to JSON format
- **Easy Scanning**: Quickly identify files and locations
- **Consistent Structure**: Reliable parsing with clear column separation
- **Rich Context**: Preview column shows actual code usage

**Column Definitions:**
- **URI**: Absolute file path where the reference was found
- **RANGE**: Location in format "startLine:startChar-endLine:endChar" (0-based)
- **PREVIEW**: Code context showing the reference usage (truncated to 200 chars)
- **EOL**: End-of-line marker "<<<" for clear row separation

**Performance Optimizations:**
- For 50+ references: Preview field omitted to reduce response size
- For 500+ references: Only first 5 references returned with summary message
- Large result sets include truncation information for efficient handling

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_find_usages> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_find_usages> tag.
3️⃣ The JSON object MUST contain "uri" and either position ("line"/"character") OR "symbolName" keys (FLATTENED, not nested).
4️⃣ Ensure the <lsp_find_usages> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string (e.g., missing quotes around keys, trailing commas)
• Missing required "uri" key or both position and symbolName parameters
• Incorrect file path for the "uri" value (must be absolute file URI)
• Invalid line/character positions (negative numbers or out of bounds)
• Using relative paths instead of absolute file URIs

────────────  COPY-READY TEMPLATES  ────────────
Position-based: <lsp_find_usages>{"uri":"file:///absolute/path/to/file.ts","line":10,"character":5}</lsp_find_usages>
Name-based: <lsp_find_usages>{"uri":"file:///absolute/path/to/file.ts","symbolName":"functionName"}</lsp_find_usages>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_find_usages> tag.

**⚠️ IMPORTANT: All parameters are FLATTENED (not nested in textDocument/position objects)**

**Required Parameters:**
-   "uri" (string, REQUIRED): Absolute file URI of the document (e.g., "file:///absolute/path/to/file.ts").

**Position-based Lookup Parameters (optional):**
-   "line" (number, OPTIONAL): 0-based line number where the symbol is located (first line is 0).
-   "character" (number, OPTIONAL): 0-based character position within the line where the symbol is located (first character is 0).

**Name-based Lookup Parameter (optional):**
-   "symbolName" (string, OPTIONAL): The name of the symbol to find usages for (e.g., "myFunction", "MyClass", "variableName").

**Note**: Either position parameters ('line' and 'character') OR 'symbolName' must be provided.

**Optional Configuration Parameters:**
-   "context" (object, optional): Additional context to control the search behavior
    -   "includeDeclaration" (boolean, optional): Whether to include the declaration/definition of the symbol in the results (default: true)

**Parameter Notes:**
- Line numbers are 0-based (first line is 0, not 1)
- Character positions are 0-based (first character is 0)
- The URI must be an absolute file path with "file://" prefix
- Position must point to a valid symbol location (variable name, function name, etc.)
- When using symbolName, the tool will find the first matching symbol in the file
- Context.includeDeclaration controls whether the original definition is included in results

### Examples:

1.  **Find all usages of a function name at line 15, character 8 in a TypeScript file:**
    \`\`\`xml
    <lsp_find_usages>{"uri":"file:///src/app/main.ts","line":15,"character":8}</lsp_find_usages>
    \`\`\`

2.  **Find usages of a variable excluding its declaration:**
    \`\`\`xml
    <lsp_find_usages>{"uri":"file:///src/utils/helper.js","line":42,"character":4,"context":{"includeDeclaration":false}}</lsp_find_usages>
    \`\`\`

3.  **Find usages of a class method in Python:**
    \`\`\`xml
    <lsp_find_usages>{"uri":"file:///src/models/user.py","line":28,"character":12}</lsp_find_usages>
    \`\`\`

4.  **Find usages of an imported module function:**
    \`\`\`xml
    <lsp_find_usages>{"uri":"file:///src/components/Button.tsx","line":3,"character":18}</lsp_find_usages>
    \`\`\`

5.  **Find usages by symbol name (name-based lookup):**
    \`\`\`xml
    <lsp_find_usages>{"uri":"file:///src/services/UserService.ts","symbolName":"getUserById"}</lsp_find_usages>
    \`\`\`

6.  **Find usages of a class by name:**
    \`\`\`xml
    <lsp_find_usages>{"uri":"file:///src/models/Product.ts","symbolName":"ProductModel"}</lsp_find_usages>
    \`\`\`

### Practical Workflow Examples:

**Before Refactoring a Function:**
\`\`\`xml
<lsp_find_usages>{"uri":"file:///src/api/auth.ts","line":35,"character":9}</lsp_find_usages>
\`\`\`
*Use case: You want to change the signature of \`authenticateUser\` function. Find all call sites first to understand impact.*

**Analyzing Variable Usage:**
\`\`\`xml
<lsp_find_usages>{"uri":"file:///src/config/settings.js","line":12,"character":6,"context":{"includeDeclaration":false}}</lsp_find_usages>
\`\`\`
*Use case: Check where \`API_BASE_URL\` constant is used to understand if it can be safely modified.*

**Dead Code Detection:**
\`\`\`xml
<lsp_find_usages>{"uri":"file:///src/legacy/oldUtils.ts","symbolName":"deprecatedFunction"}</lsp_find_usages>
\`\`\`
*Use case: Verify if \`deprecatedFunction\` is still being used before removing it (using name-based lookup).*
────────────────────────────────────────────────────────────────────────────

### Bad Examples:
The following are **critical errors** that will cause the \`lsp_find_usages\` operation to **FAIL**. You MUST avoid these mistakes:

1.  **Missing required "textDocument" or "position" keys:**
    \`\`\`xml
    <lsp_find_usages>{"position":{"line":10,"character":5}}</lsp_find_usages>
    \`\`\`
    *Correction: Always include both "textDocument" and "position" objects.*

2.  **Using relative paths instead of absolute file URIs:**
    \`\`\`xml
    <lsp_find_usages>{"textDocument":{"uri":"src/main.ts"},"position":{"line":10,"character":5}}</lsp_find_usages>
    \`\`\`
    *Correction: Use absolute file URI: \`"uri":"file:///absolute/path/src/main.ts"\`*

3.  **Invalid line/character positions:**
    \`\`\`xml
    <lsp_find_usages>{"textDocument":{"uri":"file:///src/main.ts"},"position":{"line":-1,"character":5}}</lsp_find_usages>
    \`\`\`
    *Correction: Use valid 0-based positions: \`"line":0,"character":5\`*

4.  **Malformed JSON (missing quotes, trailing commas):**
    \`\`\`xml
    <lsp_find_usages>{textDocument:{uri:"file:///src/main.ts"},position:{line:10,character:5}}</lsp_find_usages>
    \`\`\`
    *Correction: Properly quote all JSON keys and values.*
────────────────────────────────────────────────────────────────────────────
`
}
