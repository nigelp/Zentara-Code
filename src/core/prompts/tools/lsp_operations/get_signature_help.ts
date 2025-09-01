import { ToolArgs } from "../types"

export function getGetSignatureHelpToolDescription(args: ToolArgs): string {
	return `## lsp_get_signature_help – Provides detailed help for function/method signatures as you type.

Description:
The "lsp_get_signature_help" tool provides real-time information about function signatures, parameters, and documentation while you're typing a function call. This tool leverages the Language Server Protocol to provide precise, context-aware assistance for function calls.

### Use Cases and Benefits:

**When to Use:**
- **Function Call Assistance**: When you need to understand the parameters of a function you're calling
- **API Discovery**: When exploring new libraries or frameworks to understand available parameters
- **Overload Resolution**: When a function has multiple signatures and you need to choose the right one
- **Parameter Type Checking**: When you need to ensure you're passing the correct parameter types
- **Documentation Access**: When you want to see parameter descriptions without leaving your current context

**Specific Scenarios:**
- Writing complex API calls with multiple optional parameters
- Working with third-party libraries where parameter order matters
- Debugging function calls that aren't working as expected
- Learning new codebases and understanding function interfaces
- Ensuring type safety when working with strongly-typed languages

**Developer Workflow Benefits:**
- **Avoiding Errors**: Prevents common errors like passing wrong number of arguments or incorrect types
- **Token Efficiency**: Write correct function calls the first time without expensive read-definition-correct cycles
- **Context Preservation**: Get function information without losing your current editing context
- **IntelliSense Enhancement**: Works across different languages and provides richer information than basic autocomplete

**Common Patterns:**
- Use when cursor is positioned within function call parentheses
- Combine with auto-completion for optimal development experience
- Particularly valuable for languages with complex type systems (TypeScript, C#, Java)
- Essential for callback-heavy APIs and functional programming patterns

### Return Value:
The tool returns a single a 'SignatureHelp' object containing all the information needed to guide the user in filling out the parameters of a function call.

The 'SignatureHelp' object has the following structure:
- **signatures** (array): An array of 'SignatureInformation' objects, one for each overload of the function.
- **activeSignature** (number | null): The index of the most likely signature to be used, based on the arguments already provided.
- **activeParameter** (number | null): The index of the parameter that the user is currently typing.

A 'SignatureInformation' object contains:
- **label** (string): A human-readable string for the full function signature (e.g., \`calculateTotal(price: number, quantity: number): number\`).
- **documentation** (string, optional): The doc-comment for this specific signature.
- **parameters** (array): An array of 'ParameterInformation' objects.

A 'ParameterInformation' object contains:
- **label** (string): The label of the parameter (e.g., "price: number").
- **documentation** (string, optional): The doc-comment for the parameter.

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_get_signature_help> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_get_signature_help> tag.
3️⃣ The JSON object MUST contain "uri" and either position ("line"/"character") OR "symbolName" keys (FLATTENED, not nested).
4️⃣ Ensure the <lsp_get_signature_help> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string (e.g., missing quotes around keys, trailing commas, unclosed braces).
• Missing required "uri" key or both position and symbolName parameters.
• Incorrect URI format - must be absolute file URI (e.g., "file:///absolute/path/to/file.ts").
• Invalid line/character coordinates - out of bounds or negative.
• Using relative paths instead of absolute file URIs.
• Calling this outside of a function call's parentheses.

────────────  COPY-READY TEMPLATES  ────────────
Position-based: <lsp_get_signature_help>{"uri":"file:///path/to/file.ts","line":12,"character":25}</lsp_get_signature_help>
Name-based: <lsp_get_signature_help>{"uri":"file:///path/to/file.ts","symbolName":"functionName"}</lsp_get_signature_help>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_get_signature_help> tag.

**⚠️ IMPORTANT: All parameters are FLATTENED (not nested in textDocument/position objects)**

**Required Parameters:**
-   "uri" (string, REQUIRED): Absolute file URI of the document (e.g., "file:///absolute/path/to/file.ts").

**Position-based Lookup Parameters (optional):**
-   "line" (number, OPTIONAL): 0-based line number where the symbol is located (first line is 0).
-   "character" (number, OPTIONAL): 0-based character position within the line where the symbol is located (first character is 0).

**Name-based Lookup Parameter (optional):**
-   "symbolName" (string, OPTIONAL): The name of the symbol to find (e.g., "myFunction", "MyClass", "variableName").

**Note**: Either position parameters ('line' and 'character') OR 'symbolName' must be provided.

### Examples:

1.  **Get signature help for a Python function call (position-based):**
    \`\`\`xml
    <lsp_get_signature_help>{"uri":"file:///src/main.py","line":15,"character":18}</lsp_get_signature_help>
    \`\`\`

2.  **Get signature help for a TypeScript method call (position-based):**
    \`\`\`xml
    <lsp_get_signature_help>{"uri":"file:///src/components/UserService.ts","line":42,"character":35}</lsp_get_signature_help>
    \`\`\`

3.  **Get signature help for a JavaScript constructor (position-based):**
    \`\`\`xml
    <lsp_get_signature_help>{"uri":"file:///src/models/User.js","line":8,"character":20}</lsp_get_signature_help>
    \`\`\`

4.  **Get signature help for a C# method with generics (position-based):**
    \`\`\`xml
    <lsp_get_signature_help>{"uri":"file:///src/Services/DataProcessor.cs","line":67,"character":45}</lsp_get_signature_help>
    \`\`\`

5.  **Get signature help for a Java method with multiple overloads (position-based):**
    \`\`\`xml
    <lsp_get_signature_help>{"uri":"file:///src/main/java/com/example/Calculator.java","line":23,"character":30}</lsp_get_signature_help>
    \`\`\`

6.  **Get signature help by function name (name-based):**
    \`\`\`xml
    <lsp_get_signature_help>{"uri":"file:///src/services/UserService.ts","symbolName":"getUserById"}</lsp_get_signature_help>
    \`\`\`

7.  **Get signature help for a constructor by class name (name-based):**
    \`\`\`xml
    <lsp_get_signature_help>{"uri":"file:///src/models/Product.ts","symbolName":"Product"}</lsp_get_signature_help>
    \`\`\`

8.  **Get signature help for a method by name (name-based):**
    \`\`\`xml
    <lsp_get_signature_help>{"uri":"file:///src/utils/helpers.ts","symbolName":"calculateTotal"}</lsp_get_signature_help>
    \`\`\`

────────────────────────────────────────────────────────────────────────────

### Common Error Prevention:

**Position Accuracy:**
- Ensure the cursor position is within function call parentheses
- Use zero-based indexing for both line and character positions
- Account for whitespace and syntax when calculating character positions

**File URI Format:**
- Always use absolute file URIs starting with "file:///"
- Ensure the file exists and is part of the current workspace
- Use forward slashes even on Windows systems in URIs

**Symbol Name Lookup:**
- Use exact symbol names as they appear in the code
- Symbol names are case-sensitive
- If multiple symbols with the same name exist, the first match will be used

**Language-Specific Considerations:**
- **Python**: Works with function calls, method calls, and constructor calls
- **TypeScript/JavaScript**: Excellent support for function overloads and optional parameters
- **Java/C#**: Handles method overloading and generic type parameters
- **Go**: Provides parameter names and types for function signatures
- **Rust**: Shows parameter types and lifetime annotations

**Troubleshooting:**
- If no signature help is returned, verify the position is inside function parentheses or the symbol name is correct
- Check that the language server is running and the file is indexed
- Ensure the function/method exists and is accessible in the current scope
- For name-based lookup, verify the symbol name matches exactly (case-sensitive)
────────────────────────────────────────────────────────────────────────────
`
}
