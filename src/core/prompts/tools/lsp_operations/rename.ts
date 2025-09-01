import { ToolArgs } from "../types"

export function getRenameToolDescription(args: ToolArgs): string {
	return `## lsp_rename – Performs a safe, semantic rename of a symbol across the entire workspace.

Description:
The "lsp_rename" tool performs intelligent, semantic renaming of symbols (variables, functions, classes, etc.) across your entire workspace. Unlike simple search-and-replace operations, this tool uses the Language Server Protocol's deep understanding of code semantics to ensure safe, accurate renaming that respects scope, context, and language-specific rules.

### Use Cases and Benefits:

**When to Use:**
- **Symbol Refactoring**: Renaming variables, functions, classes, methods, interfaces, and other identifiers
- **API Evolution**: Updating public method names while maintaining consistency across all call sites
- **Code Modernization**: Renaming legacy symbols to follow current naming conventions
- **Consistency Enforcement**: Ensuring uniform naming patterns across large codebases
- **Safe Refactoring**: When you need guaranteed accuracy across multiple files and scopes

**Specific Scenarios:**
- Renaming a widely-used utility function across a large codebase
- Updating class names and all their instantiations and references
- Changing variable names to improve code readability
- Refactoring method names in inheritance hierarchies
- Updating interface names and all implementing classes
- Renaming configuration constants used throughout the application

**Developer Workflow Benefits:**
- **Scope Awareness**: Respects variable scope and doesn't rename unrelated symbols with the same name
- **Cross-File Safety**: Automatically updates all references across multiple files
- **Language Intelligence**: Understands language-specific naming rules and constraints
- **Atomic Operation**: All changes happen together, preventing inconsistent states
- **Error Prevention**: Avoids common mistakes like partial matches or string replacements in comments

**Common Refactoring Patterns:**
- **Function Renaming**: Update function names and all call sites simultaneously
- **Class Refactoring**: Rename classes along with constructors, inheritance, and type annotations
- **Variable Cleanup**: Improve variable names while preserving all references
- **Method Overrides**: Rename virtual methods across inheritance hierarchies
- **Module Exports**: Update exported symbols and their imports across files

### Return Value:
The tool returns a 'WorkspaceEdit' object, which is a structured representation of all the changes that need to be made across all files in the workspace.

A 'WorkspaceEdit' object has the following structure:
- **changes** (object): A dictionary where keys are file URIs (e.g., "file:///path/to/file.ts") and values are arrays of 'TextEdit' objects.

A 'TextEdit' object represents a single change within a file:
- **range** (object): The precise range of the text to be replaced.
  - **start** (object): The starting position.
    - **line** (number): The 0-based line number.
    - **character** (number): The 0-based character position.
  - **end** (object): The ending position.
    - **line** (number): The 0-based line number.
    - **character** (number): The 0-based character position.
- **newText** (string): The new text to be inserted in place of the old text.

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_rename> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_rename> tag.
3️⃣ The JSON object MUST contain "uri", "newName", and either position ("line"/"character") OR "symbolName" keys (FLATTENED, not nested).
4️⃣ Ensure the <lsp_rename> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string.
• Missing required "uri" or "newName" keys or both position and symbolName parameters.
• Providing a new name that is syntactically invalid for the language.
• Using relative paths instead of absolute file URIs.
• Incorrect positioning (not pointing to the actual symbol to rename).
• Using reserved keywords as new names.

────────────  COPY-READY TEMPLATES  ────────────
Position-based: <lsp_rename>{"uri":"file:///path/to/file.ts","line":10,"character":5,"newName":"newSymbolName"}</lsp_rename>
Name-based: <lsp_rename>{"uri":"file:///path/to/file.ts","symbolName":"oldSymbolName","newName":"newSymbolName"}</lsp_rename>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_rename> tag.

**⚠️ IMPORTANT: All parameters are FLATTENED (not nested in textDocument/position objects)**

**Required Parameters:**
-   "uri" (string, REQUIRED): Absolute file URI of the document (e.g., "file:///absolute/path/to/file.ts").
-   "newName" (string, REQUIRED): The new name for the symbol.

**Position-based Lookup Parameters (optional):**
-   "line" (number, OPTIONAL): 0-based line number where the symbol is located (first line is 0).
-   "character" (number, OPTIONAL): 0-based character position within the line where the symbol is located (first character is 0).

**Name-based Lookup Parameter (optional):**
-   "symbolName" (string, OPTIONAL): The name of the symbol to rename (e.g., "myFunction", "MyClass", "variableName").

**Note**: Either position parameters ('line' and 'character') OR 'symbolName' must be provided.

**Parameter Notes:**
- Line numbers are 0-based (first line is 0, not 1)
- Character positions are 0-based (first character is 0)
- The URI must be an absolute file path with "file://" prefix
- Position must point to a valid symbol location (variable name, function name, etc.)
- When using symbolName, the tool will find the first matching symbol in the file
- New name must be syntactically valid for the target language

### Examples:

**Position-based rename examples:**

1.  **Rename a Python function across the entire project:**
    \`\`\`xml
    <lsp_rename>{"uri":"file:///src/billing/utils.py","line":22,"character":8,"newName":"calculate_final_price"}</lsp_rename>
    \`\`\`

2.  **Rename a TypeScript class and all its references:**
    \`\`\`xml
    <lsp_rename>{"uri":"file:///src/models/User.ts","line":5,"character":13,"newName":"Customer"}</lsp_rename>
    \`\`\`

3.  **Rename a JavaScript method in a class:**
    \`\`\`xml
    <lsp_rename>{"uri":"file:///src/services/DataService.js","line":45,"character":15,"newName":"fetchUserData"}</lsp_rename>
    \`\`\`

**Name-based rename examples:**

4.  **Rename a function by its name:**
    \`\`\`xml
    <lsp_rename>{"uri":"file:///src/utils/helper.ts","symbolName":"processData","newName":"transformData"}</lsp_rename>
    \`\`\`

5.  **Rename a class by its name:**
    \`\`\`xml
    <lsp_rename>{"uri":"file:///src/models/Product.ts","symbolName":"ProductModel","newName":"ProductEntity"}</lsp_rename>
    \`\`\`

6.  **Rename a variable by its name:**
    \`\`\`xml
    <lsp_rename>{"uri":"file:///src/config/constants.js","symbolName":"API_BASE_URL","newName":"BASE_API_URL"}</lsp_rename>
    \`\`\`

7.  **Rename a method by its name:**
    \`\`\`xml
    <lsp_rename>{"uri":"file:///src/services/UserService.ts","symbolName":"getUserById","newName":"findUserById"}</lsp_rename>
    \`\`\`
────────────────────────────────────────────────────────────────────────────

### Common Error Prevention:

**Symbol Selection:**
- Position the cursor exactly on the symbol you want to rename (variable name, function name, etc.)
- Ensure the symbol is actually renameable (not a keyword or built-in type)
- Verify the symbol is defined in your project (not from external libraries)

**Naming Conventions:**
- **Python**: Use snake_case for functions/variables, PascalCase for classes
- **JavaScript/TypeScript**: Use camelCase for functions/variables, PascalCase for classes
- **Java/C#**: Use camelCase for methods/fields, PascalCase for classes/interfaces
- **Go**: Use camelCase for unexported, PascalCase for exported symbols
- **Rust**: Use snake_case for functions/variables, PascalCase for types

**Language-Specific Considerations:**
- **Reserved Keywords**: Avoid using language keywords as new names
- **Scope Conflicts**: Ensure the new name doesn't conflict with existing symbols in the same scope
- **Visibility Rules**: Consider public/private visibility when renaming
- **Type Constraints**: Some symbols may have naming constraints based on their type or usage

**Pre-Rename Checklist:**
- Verify the file is saved and the language server is active
- Ensure the symbol is correctly identified (hover should show the symbol info)
- Check that the new name follows the language's naming conventions
- Consider the impact on external APIs or published interfaces

**Error Recovery:**
- If rename fails, check that the symbol supports renaming
- Verify the position is exactly on the symbol definition or usage
- Ensure the new name is valid according to language syntax rules
- Check for conflicts with existing symbols in the same scope
────────────────────────────────────────────────────────────────────────────
`
}
