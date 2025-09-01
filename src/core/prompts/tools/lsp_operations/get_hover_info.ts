import { ToolArgs } from "../types"

export function getGetHoverInfoToolDescription(args: ToolArgs): string {
	return `## lsp_get_hover_info – Retrieves rich, contextual information for a symbol, mirroring the IDE's hover-over feature.

Description:
This tool leverages Language Server Protocol (LSP) capabilities to retrieve comprehensive, semantically-aware information about any symbol in your codebase. It provides the exact same rich information that developers see when hovering over symbols in modern IDEs, but in a programmatic format that's perfect for AI analysis.

### When to Use This Tool:

**🎯 Primary Use Cases:**
- **API Understanding**: Get complete function signatures, parameter types, and return values without reading source files
- **Type Verification**: Instantly confirm variable types, object properties, and method signatures
- **Documentation Access**: Retrieve inline documentation, JSDoc comments, docstrings, and type annotations
- **Symbol Metadata**: Access deprecation warnings, visibility modifiers, and other symbol attributes
- **Quick Context Building**: Understand unfamiliar code symbols without losing your current focus

**🔍 Specific Scenarios:**
- Debugging issues where you need to understand parameter expectations
- Code review where you need to verify API contracts
- Learning new codebases by exploring symbol definitions
- Validating function usage before calling APIs
- Understanding complex type hierarchies and generic constraints
- Checking for deprecated methods or properties

**💡 Developer Workflow Benefits:**
- **Token Efficiency**: Get comprehensive symbol info in one call instead of reading multiple files
- **Real-time Accuracy**: Information is always current with your codebase state
- **Rich Formatting**: Receive properly formatted documentation with syntax highlighting hints
- **Cross-Reference Ready**: Get precise type information for making informed coding decisions
- **Language Agnostic**: Works consistently across TypeScript, Python, Java, C#, Go, Rust, and more

### Return Value:
The tool returns a single JSON 'Hover' object, which contains the formatted information ready for display or analysis.

A 'Hover' object has the following structure:
- **contents** (string): The core of the return value. This is a formatted string (often in Markdown) containing the symbol's full signature, any documentation, and other relevant details. It's designed to be a complete, human-readable summary.
- **range** (object): An object defining the exact location of the symbol to which the hover information applies.
  - **start** (object): The starting position.
    - **line** (number): The 0-based line number.
    - **character** (number): The 0-based character position.
  - **end** (object): The ending position.
    - **line** (number): The 0-based line number.
    - **character** (number): The 0-based character position.

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_get_hover_info> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_get_hover_info> tag.
3️⃣ The JSON object MUST contain "uri" and either position ("line"/"character") OR "symbolName" keys (FLATTENED, not nested).
4️⃣ Position your cursor precisely on the symbol you want information about OR provide the symbol name.
5️⃣ Ensure the <lsp_get_hover_info> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string (e.g., missing quotes around keys, trailing commas)
• Missing required "uri" key or both position and symbolName parameters
• Incorrect file URI format (must start with "file://")
• Positioning cursor on whitespace or comments instead of symbols (for position-based lookup)
• Using relative paths instead of absolute URIs
• Line/character positions that don't correspond to any symbol

────────────  COPY-READY TEMPLATES  ────────────
Position-based: <lsp_get_hover_info>{"uri":"file:///path/to/file.ts","line":10,"character":5}</lsp_get_hover_info>
Name-based: <lsp_get_hover_info>{"uri":"file:///path/to/file.ts","symbolName":"functionName"}</lsp_get_hover_info>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_get_hover_info> tag.

**⚠️ IMPORTANT: All parameters are FLATTENED (not nested in textDocument/position objects)**

**Required Parameters:**
-   "uri" (string, REQUIRED): Absolute file URI of the document (e.g., "file:///absolute/path/to/file.ts").

**Position-based Lookup Parameters (optional):**
-   "line" (number, OPTIONAL): Zero-based line number (0 = first line).
-   "character" (number, OPTIONAL): Zero-based character position within the line. Should point to any character within the symbol name.

**Name-based Lookup Parameter (optional):**
-   "symbolName" (string, OPTIONAL): The name of the symbol to find (e.g., "myFunction", "MyClass", "variableName").

**Note**: Either position parameters ('line' and 'character') OR 'symbolName' must be provided.

### Examples:

1.  **Get function signature and docstring in Python (position-based):**
    \`\`\`xml
    <lsp_get_hover_info>{"uri":"file:///src/utils/helpers.py","line":42,"character":15}</lsp_get_hover_info>
    \`\`\`
    *Use case: Understanding function parameters and return types before calling*

2.  **Check TypeScript interface properties and types (name-based):**
    \`\`\`xml
    <lsp_get_hover_info>{"uri":"file:///types/user.ts","symbolName":"UserInterface"}</lsp_get_hover_info>
    \`\`\`
    *Use case: Verifying object property types for safe property access*

3.  **Get Java method documentation and signature (position-based):**
    \`\`\`xml
    <lsp_get_hover_info>{"uri":"file:///src/main/java/Service.java","line":25,"character":12}</lsp_get_hover_info>
    \`\`\`
    *Use case: Understanding API contract and JavaDoc documentation*

4.  **Check C# property type and XML documentation (name-based):**
    \`\`\`xml
    <lsp_get_hover_info>{"uri":"file:///Models/User.cs","symbolName":"UserName"}</lsp_get_hover_info>
    \`\`\`
    *Use case: Property validation and understanding data contracts*

5.  **Get variable type information in Go (position-based):**
    \`\`\`xml
    <lsp_get_hover_info>{"uri":"file:///handlers/user.go","line":33,"character":8}</lsp_get_hover_info>
    \`\`\`
    *Use case: Type checking for proper method calls and assignments*

6.  **Check React component props and TypeScript types (name-based):**
    \`\`\`xml
    <lsp_get_hover_info>{"uri":"file:///components/Button.tsx","symbolName":"ButtonProps"}</lsp_get_hover_info>
    \`\`\`
    *Use case: Understanding component API and required/optional props*

7.  **Get Rust struct field types and documentation (position-based):**
    \`\`\`xml
    <lsp_get_hover_info>{"uri":"file:///src/models.rs","line":12,"character":4}</lsp_get_hover_info>
    \`\`\`
    *Use case: Understanding data structures and borrowing requirements*

8.  **Find function by name and get its hover info (name-based):**
    \`\`\`xml
    <lsp_get_hover_info>{"uri":"file:///src/services/UserService.ts","symbolName":"getUserById"}</lsp_get_hover_info>
    \`\`\`
    *Use case: Quick API exploration without knowing exact location*

### Return Value Structure:
The tool returns a JSON 'Hover' object containing:

- **contents** (string): Rich, formatted information about the symbol:
  - Function/method signatures with parameter and return types
  - Variable types and value information
  - Class/interface definitions and inheritance
  - Documentation strings (JSDoc, docstrings, XML docs)
  - Deprecation warnings and compiler notes
  - Generic type constraints and bounds

- **range** (object): Precise location information:
  - **start/end**: Line and character positions of the symbol
  - Useful for highlighting or further processing

### Error Prevention & Troubleshooting:

**❌ Critical Errors to Avoid:**

1.  **Missing both position and symbolName:**
    \`\`\`xml
    <!-- WRONG: No position or symbolName provided -->
    <lsp_get_hover_info>{"uri":"file:///code.ts"}</lsp_get_hover_info>
    \`\`\`
    *Correction: Provide either line/character OR symbolName.*

2.  **Invalid URI format:**
    \`\`\`xml
    <!-- WRONG: Relative path -->
    <lsp_get_hover_info>{"uri":"src/file.ts","symbolName":"myFunction"}</lsp_get_hover_info>
    \`\`\`
    *Correction: Use absolute URI with "file:///" prefix.*

3.  **Out-of-bounds positions (for position-based lookup):**
    \`\`\`xml
    <!-- WRONG: Line number exceeds file length -->
    <lsp_get_hover_info>{"uri":"file:///code.ts","line":999,"character":10}</lsp_get_hover_info>
    \`\`\`
    *Correction: Verify line and character positions are within file bounds.*

**🔧 Best Practices:**
- **Position-based**: Position cursor anywhere within the symbol name (beginning, middle, or end)
- **Name-based**: Use exact symbol names as they appear in the code
- Works on identifiers, keywords, operators, and literals
- Returns null for positions with no semantic information or unknown symbol names
- Most effective on function names, variable declarations, and type annotations
- Consider using other LSP tools (go_to_definition, find_references) for deeper exploration

**🌍 Language-Specific Features:**
- **TypeScript/JavaScript**: Excellent type inference, JSDoc support, and module information
- **Python**: Rich docstring formatting, type hints, and argument details
- **Java**: Complete JavaDoc integration with parameter and return documentation
- **C#**: XML documentation comments with full IntelliSense information
- **Go**: Package documentation and type information
- **Rust**: Comprehensive type information with ownership and lifetime details

### Lookup Method Comparison:

**Position-based Lookup:**
- ✅ Precise control over exact symbol location
- ✅ Works when you know the exact position
- ❌ Requires line/character coordinates

**Name-based Lookup:**
- ✅ Convenient when you know the symbol name
- ✅ No need to calculate positions
- ⚠️ May find multiple symbols with the same name (uses first match)
- ❌ Requires exact symbol name match
────────────────────────────────────────────────────────────────────────────
`
}
