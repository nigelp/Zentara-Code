import { ToolArgs } from "../types"

export function getGetCompletionsToolDescription(args: ToolArgs): string {
	return `## lsp_get_completions – Provides intelligent, context-aware code completion suggestions.

Description:
This tool is the cornerstone of efficient and accurate code generation. Instead of blindly guessing variable names, functions, or methods, \`lsp_get_completions\` leverages the Language Server Protocol to provide a list of valid, in-scope suggestions based on the current cursor position or symbol name. It's like having the IDE's IntelliSense on demand.

### When to Use This Tool:

**Primary Use Cases:**
- **Intelligent Code Generation**: Generate syntactically correct and contextually appropriate code
- **API Discovery**: Explore available methods, properties, and functions without reading documentation
- **Error Prevention**: Avoid typos, scope errors, and calls to non-existent methods
- **Code Completion**: Complete partially written statements with accurate suggestions
- **Type-Safe Development**: Get type-aware completions in strongly-typed languages
- **Import Assistance**: Discover available imports and modules

**Specific Scenarios:**
- Writing method calls on objects to see available methods and their signatures
- Completing variable names to avoid typos and ensure they exist in scope
- Exploring class properties and methods when working with unfamiliar APIs
- Getting function parameter suggestions and type information
- Discovering available modules and packages for imports
- Completing enum values and constants
- Finding available CSS properties and values in stylesheets

**Best Practices:**
- Use after typing a dot (.) to see object methods and properties
- Use when starting to type a variable name to see available options
- Use at function call sites to see parameter information
- Use in import statements to discover available modules
- Combine with \`lsp_get_document_symbols\` for comprehensive file understanding
- Use before \`lsp_go_to_definition\` to ensure you're referencing the correct symbol

**Workflow Integration:**
- Essential for writing new code in unfamiliar codebases
- Critical for maintaining type safety in TypeScript/strongly-typed languages
- Useful for exploring third-party library APIs
- Helps maintain consistency with existing code patterns

### Return Value:
The tool returns a JSON array of 'CompletionItem' objects. Each object represents a single completion suggestion. The array might be empty if no relevant completions are found.

A 'CompletionItem' object has the following structure:
- **label** (string): The primary text of the completion, such as a function or variable name. This is what would be inserted into the code.
- **kind** (number): A numeric code representing the type of completion (e.g., function, class, variable, property). This helps in understanding what kind of symbol is being suggested.
- **detail** (string, optional): A human-readable string providing additional details, such as the type of a variable or the signature of a function. This is highly useful for disambiguation.
- **documentation** (string, optional): A human-readable string containing any available documentation or doc-comments for the symbol. This is incredibly valuable for understanding what a function or class does without needing to navigate to its definition.

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_get_completions> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_get_completions> tag.
3️⃣ The JSON object MUST contain "uri" and either position ("line"/"character") OR "symbolName" keys (FLATTENED, not nested).
4️⃣ Ensure the <lsp_get_completions> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string (missing quotes, trailing commas, syntax errors)
• Missing required "uri" key or both position and symbolName parameters
• Incorrect path for the "uri" value (file must exist and be accessible)
• Invalid position coordinates (line/character out of bounds)
• Using relative paths instead of absolute file URIs
• Requesting completions at positions where the language server isn't active
• Position coordinates that don't match actual file content
• Forgetting to close the tag properly

────────────  COPY-READY TEMPLATES  ────────────
Position-based: <lsp_get_completions>{"uri":"file:///path/to/file.ts","line":10,"character":5}</lsp_get_completions>
Name-based: <lsp_get_completions>{"uri":"file:///path/to/file.ts","symbolName":"functionName"}</lsp_get_completions>
Legacy format: <lsp_get_completions>{"textDocument":{"uri":"file:///path/to/file.ts"},"position":{"line":10,"character":5}}</lsp_get_completions>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_get_completions> tag.

**⚠️ IMPORTANT: New flattened format is preferred, but legacy nested format is still supported for backward compatibility**

**Required Parameters:**
-   "uri" (string, REQUIRED for new format): Absolute file URI of the document (e.g., "file:///absolute/path/to/file.ts").

**Position-based Lookup Parameters (optional for new format):**
-   "line" (number, OPTIONAL): 0-based line number where the symbol is located (first line is 0).
-   "character" (number, OPTIONAL): 0-based character position within the line where the symbol is located (first character is 0).

**Name-based Lookup Parameter (optional for new format):**
-   "symbolName" (string, OPTIONAL): The name of the symbol to find (e.g., "myFunction", "MyClass", "variableName").

**Note**: Either position parameters ('line' and 'character') OR 'symbolName' must be provided when using the new flattened format.

**Optional Parameters:**
-   "triggerCharacter" (string, optional): The character that triggered the completion request (e.g., ".", "(", or a letter).

**Legacy Format (still supported):**
-   "textDocument" (object): The document for which to get completions.
    -   "uri" (string, REQUIRED): URI of the document.
-   "position" (object): The cursor position.
    -   "line" (number, REQUIRED): Zero-based line number.
    -   "character" (number, REQUIRED): Zero-based character position.

### Examples:

1.  **Get method completions after typing a dot on an object (new format):**
    \`\`\`xml
    <lsp_get_completions>{"uri":"file:///src/app/UserService.ts","line":25,"character":12}</lsp_get_completions>
    \`\`\`
    *Use case: After typing \`user.\` to see available methods like \`getName()\`, \`getEmail()\`, etc.*

2.  **Complete variable names using symbol name lookup:**
    \`\`\`xml
    <lsp_get_completions>{"uri":"file:///src/utils/data_processor.py","symbolName":"processData"}</lsp_get_completions>
    \`\`\`
    *Use case: Get completions at the location of the \`processData\` function*

3.  **Get function parameter suggestions with trigger character:**
    \`\`\`xml
    <lsp_get_completions>{"uri":"file:///src/components/Button.js","line":42,"character":20,"triggerCharacter":"("}</lsp_get_completions>
    \`\`\`
    *Use case: After typing \`addEventListener(\` to see event type suggestions*

4.  **Complete CSS property names in a stylesheet:**
    \`\`\`xml
    <lsp_get_completions>{"uri":"file:///src/styles/main.css","line":10,"character":4}</lsp_get_completions>
    \`\`\`
    *Use case: Getting CSS property suggestions like \`background-color\`, \`border-radius\`, etc.*

5.  **Import statement completion in Go:**
    \`\`\`xml
    <lsp_get_completions>{"uri":"file:///cmd/server/main.go","line":5,"character":15}</lsp_get_completions>
    \`\`\`
    *Use case: After typing \`import "\` to see available packages*

6.  **React props completion in JSX:**
    \`\`\`xml
    <lsp_get_completions>{"uri":"file:///src/components/UserCard.tsx","line":18,"character":25}</lsp_get_completions>
    \`\`\`
    *Use case: After typing \`<UserCard \` to see available props with their types*

7.  **Legacy format example (still supported):**
    \`\`\`xml
    <lsp_get_completions>{"textDocument":{"uri":"file:///Models/User.cs"},"position":{"line":30,"character":20}}</lsp_get_completions>
    \`\`\`
    *Use case: After typing \`UserRole.\` to see enum values like \`Admin\`, \`User\`, \`Guest\`*

8.  **Name-based lookup for method completions:**
    \`\`\`xml
    <lsp_get_completions>{"uri":"file:///src/services/ApiService.ts","symbolName":"fetchUserData"}</lsp_get_completions>
    \`\`\`
    *Use case: Get completions at the location of the \`fetchUserData\` method*

### Error Prevention Examples:

**Bad Example - Invalid Position:**
\`\`\`xml
<lsp_get_completions>{"uri":"file:///src/app.js","line":-1,"character":5}</lsp_get_completions>
\`\`\`
*Error: Negative line numbers are invalid*

**Good Example - Valid Position:**
\`\`\`xml
<lsp_get_completions>{"uri":"file:///src/app.js","line":0,"character":5}</lsp_get_completions>
\`\`\`
*Correction: Line numbers start from 0*

**Bad Example - Missing required parameters:**
\`\`\`xml
<lsp_get_completions>{"uri":"file:///src/app.js"}</lsp_get_completions>
\`\`\`
*Error: Either position or symbolName must be provided*

**Good Example - Valid symbol name:**
\`\`\`xml
<lsp_get_completions>{"uri":"file:///src/app.js","symbolName":"myFunction"}</lsp_get_completions>
\`\`\`
*Correction: Provide either position or symbolName*
────────────────────────────────────────────────────────────────────────────

### Language-Specific Tips:

**TypeScript/JavaScript:**
- Use after \`.\` for object method/property completion
- Use in import statements for module discovery
- Use for React component prop suggestions

**Python:**
- Excellent for discovering module methods and class attributes
- Use in \`from ... import\` statements
- Great for exploring third-party library APIs

**Go:**
- Use for package import suggestions
- Helpful for interface method completion
- Good for discovering struct field names

**Java/C#:**
- Excellent for method overload discovery
- Use for enum value completion
- Helpful for generic type parameter suggestions

**CSS:**
- Complete property names and values
- Discover vendor-specific prefixes
- Get value suggestions for specific properties
────────────────────────────────────────────────────────────────────────────
`
}
