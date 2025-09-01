import { ToolArgs } from "../types"

export function getGetDocumentHighlightsToolDescription(args: ToolArgs): string {
	return `## lsp_get_document_highlights – Highlights all occurrences of a symbol within a single file.

Description:
This tool provides a quick, token-efficient way to see all the places a specific symbol is used within the *current file*. It's a localized version of \`find_usages\`, perfect for understanding how a variable or function is used within its immediate context without the overhead of a workspace-wide search.

### When to Use This Tool:

**Most Beneficial For:**
- **In-File Analysis**: Quickly see how a local variable, parameter, or private method is used within its file
- **Visualizing Scope**: Instantly see every reference to a symbol in the current file, helping to visualize its scope and usage patterns
- **Focused Refactoring**: When refactoring a function, check all its usages within that same file before making changes
- **Token Efficiency**: Much cheaper than running a full \`find_usages\` when you only care about the current file
- **Code Review**: Understanding the impact of changing a symbol within a specific file
- **Debugging**: Tracking how a variable flows through different parts of a function or class

**Specific Scenarios:**
1. **Local Variable Tracking**: Before renaming a local variable, see all its uses in the current function/method
2. **Parameter Usage Analysis**: Understanding how function parameters are used throughout the function body
3. **Class Member Analysis**: Seeing how a private field or method is used within the class definition
4. **Import Usage**: Checking how an imported symbol is used within the current file
5. **Constant References**: Finding all places where a constant is referenced in the current module

**Developer Workflow Benefits:**
- **Faster Navigation**: Jump between all occurrences of a symbol without leaving the current file
- **Safe Refactoring**: Understand the full scope of a symbol's usage before making changes
- **Code Understanding**: Quickly grasp how a symbol contributes to the file's logic
- **Error Prevention**: Avoid breaking references when modifying symbol declarations

**Common Patterns:**
- Use before renaming any symbol to understand its local impact
- Combine with \`go_to_definition\` to understand both declaration and all usage sites
- Use after \`find_references\` when you want to focus on just the current file's results
- Helpful when working with large files where manual scanning is inefficient

### Return Value:
The tool returns a JSON array of 'DocumentHighlight' objects. Each object represents a single occurrence of the symbol within the file.

A 'DocumentHighlight' object has the following structure:
- **range** (object): The precise range of the symbol's occurrence.
  - **start** (object): The starting position.
    - **line** (number): The 0-based line number.
    - **character** (number): The 0-based character position.
  - **end** (object): The ending position.
    - **line** (number): The 0-based line number.
    - **character** (number): The 0-based character position.
- **kind** (number, optional): A number indicating the kind of highlight, such as 'text' (a normal reference), 'read' (a read access), or 'write' (a write access). This provides deeper semantic meaning to each highlight.

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_get_document_highlights> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_get_document_highlights> tag.
3️⃣ The JSON object MUST contain "uri" and either position ("line"/"character") OR "symbolName" keys (FLATTENED, not nested).
4️⃣ Ensure the <lsp_get_document_highlights> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string (e.g., missing quotes around keys, trailing commas)
• Missing required "uri" key or both position and symbolName parameters
• Incorrect file path for the "uri" value (must be absolute file URI)
• Invalid line/character positions (negative numbers or out of bounds)
• Using relative paths instead of absolute file URIs

────────────  COPY-READY TEMPLATES  ────────────
Position-based: <lsp_get_document_highlights>{"uri":"file:///absolute/path/to/file.ts","line":10,"character":5}</lsp_get_document_highlights>
Name-based: <lsp_get_document_highlights>{"uri":"file:///absolute/path/to/file.ts","symbolName":"functionName"}</lsp_get_document_highlights>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_get_document_highlights> tag.

**⚠️ IMPORTANT: All parameters are FLATTENED (not nested in textDocument/position objects)**

**Required Parameters:**
-   "uri" (string, REQUIRED): Absolute file URI of the document (e.g., "file:///absolute/path/to/file.ts").

**Position-based Lookup Parameters (optional):**
-   "line" (number, OPTIONAL): 0-based line number where the symbol is located (first line is 0).
-   "character" (number, OPTIONAL): 0-based character position within the line where the symbol is located (first character is 0).

**Name-based Lookup Parameter (optional):**
-   "symbolName" (string, OPTIONAL): The name of the symbol to find highlights for (e.g., "myFunction", "MyClass", "variableName").

**Note**: Either position parameters ('line' and 'character') OR 'symbolName' must be provided.

### Examples:

1.  **Highlight all occurrences of a variable by position in a JavaScript file:**
    \`\`\`xml
    <lsp_get_document_highlights>{"uri":"file:///src/app.js","line":15,"character":10}</lsp_get_document_highlights>
    \`\`\`

2.  **Find all uses of a function parameter by position in a Python file:**
    \`\`\`xml
    <lsp_get_document_highlights>{"uri":"file:///src/utils.py","line":8,"character":20}</lsp_get_document_highlights>
    \`\`\`

3.  **Highlight all references to a class member by position in TypeScript:**
    \`\`\`xml
    <lsp_get_document_highlights>{"uri":"file:///src/UserService.ts","line":25,"character":12}</lsp_get_document_highlights>
    \`\`\`

4.  **Track usage of an imported symbol by position in a React component:**
    \`\`\`xml
    <lsp_get_document_highlights>{"uri":"file:///src/components/Button.tsx","line":3,"character":9}</lsp_get_document_highlights>
    \`\`\`

5.  **Find all occurrences of a function by name in a configuration file:**
    \`\`\`xml
    <lsp_get_document_highlights>{"uri":"file:///config/database.js","symbolName":"connectToDatabase"}</lsp_get_document_highlights>
    \`\`\`

6.  **Highlight all uses of a variable by name in a TypeScript module:**
    \`\`\`xml
    <lsp_get_document_highlights>{"uri":"file:///src/constants.ts","symbolName":"API_BASE_URL"}</lsp_get_document_highlights>
    \`\`\`

### Common Breakers:

**Critical errors that will cause the \`lsp_get_document_highlights\` operation to FAIL:**

1.  **Malformed JSON string:**
    \`\`\`xml
    <lsp_get_document_highlights>{"uri":"file:///src/app.js","line":15 "character":10}</lsp_get_document_highlights>
    \`\`\`
    *Correction: Ensure proper JSON formatting with commas between properties.*

2.  **Missing required \"uri\" key:**
    \`\`\`xml
    <lsp_get_document_highlights>{"line":15,"character":10}</lsp_get_document_highlights>
    \`\`\`
    *Correction: Always include the \"uri\" property with a valid absolute file URI.*

3.  **Missing both position and symbolName parameters:**
    \`\`\`xml
    <lsp_get_document_highlights>{"uri":"file:///src/app.js"}</lsp_get_document_highlights>
    \`\`\`
    *Correction: Include either \"line\"/\"character\" for position-based lookup OR \"symbolName\" for name-based lookup.*

4.  **Invalid position coordinates (negative or non-integer values):**
    \`\`\`xml
    <lsp_get_document_highlights>{"uri":"file:///src/app.js","line":-1,"character":"ten"}</lsp_get_document_highlights>
    \`\`\`
    *Correction: Use zero-based integer values for both \"line\" and \"character\".*

5.  **Invalid file URI format:**
    \`\`\`xml
    <lsp_get_document_highlights>{"uri":"src/app.js","line":15,"character":10}</lsp_get_document_highlights>
    \`\`\`
    *Correction: Use the proper file URI format: \"file:///absolute/path/to/file\".*

6.  **Empty or whitespace-only symbolName:**
    \`\`\`xml
    <lsp_get_document_highlights>{"uri":"file:///src/app.js","symbolName":""}</lsp_get_document_highlights>
    \`\`\`
    *Correction: Provide a valid, non-empty symbol name.*

7.  **Position pointing to whitespace or comments (may return empty results):**
    - Ensure the position points to an actual symbol (variable, function, class, etc.)
    - If results are empty, try positioning on different parts of the symbol
    - Consider using symbolName instead if you know the symbol's name
────────────────────────────────────────────────────────────────────────────
`
}
