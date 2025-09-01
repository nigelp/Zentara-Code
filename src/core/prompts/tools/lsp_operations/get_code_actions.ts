import { ToolArgs } from "../types"

export function getGetCodeActionsToolDescription(args: ToolArgs): string {
	return `## lsp_get_code_actions – Get Context-Aware Code Actions and Refactoring Suggestions

Description:
The "lsp_get_code_actions" tool leverages the Language Server Protocol to provide intelligent, context-aware refactoring suggestions and quick fixes for code at a specific position. This tool acts as your intelligent coding assistant, analyzing the current code context and offering actionable improvements.

### When to Use This Tool:

**🎯 Most Beneficial Scenarios:**
- **Error Resolution**: When you encounter compilation errors, linting warnings, or syntax issues that need immediate fixes
- **Code Quality Improvement**: When you want to discover refactoring opportunities to make code more maintainable
- **Interface Implementation**: When working with classes that need to implement interfaces or abstract methods
- **Import Organization**: When you need to add missing imports or organize existing ones
- **Method Extraction**: When you have complex code blocks that could benefit from being extracted into separate functions

**🔧 Specific Use Cases:**
- **TypeScript/JavaScript**: Extract functions, add missing types, implement interface methods, organize imports
- **Python**: Add missing imports, extract methods, implement abstract methods, fix type annotations
- **Java**: Implement interface methods, extract methods, add missing overrides, organize imports
- **C#**: Implement interface members, extract methods, add using statements, generate constructors
- **Go**: Add missing error handling, extract functions, implement interface methods

**💡 Developer Workflow Benefits:**
- **Productivity Boost**: Instantly discover available refactorings without manual analysis
- **Learning Tool**: See best practices suggested by the language server
- **Error Prevention**: Get quick fixes for common mistakes before they become bugs
- **Code Consistency**: Apply standard refactoring patterns across your codebase

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_get_code_actions> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_get_code_actions> tag.
3️⃣ The JSON object MUST contain a "uri" and either position coordinates (line + character) OR a symbolName.
4️⃣ Ensure the <lsp_get_code_actions> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string - ensure proper escaping of quotes and valid JSON syntax
• Missing required "uri" parameter
• Invalid file URI format - must use "file://" protocol
• Position coordinates out of bounds - line/character must exist in the document
• Not providing either position (line + character) OR symbolName
• Using one-based line numbers instead of zero-based
• Using one-based character positions instead of zero-based

────────────  COPY-READY TEMPLATE  ────────────
  <lsp_get_code_actions>{"uri":"file:///path/to/file.ts","line":14,"character":10}</lsp_get_code_actions>
  <lsp_get_code_actions>{"uri":"file:///path/to/file.ts","symbolName":"functionName"}</lsp_get_code_actions>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object.

**Required Parameters:**
-   "uri" (string, REQUIRED): File URI using the "file://" protocol.

**Lookup Method (one required):**
-   **Position-based lookup:**
    -   "line" (number): Zero-based line number (first line is 0).
    -   "character" (number): Zero-based character position within the line.
-   **Symbol name-based lookup:**
    -   "symbolName" (string): Name of the symbol to find code actions for.

**Note:** You must provide either position coordinates (line + character) OR a symbolName, but not both.

### Return Value:
Returns a JSON array of CodeAction objects, each representing an available action:

- **title** (string): Human-readable description of the action
- **kind** (string): Category like "quickfix", "refactor.extract", "source.organizeImports"
- **command** (object, optional): Command details for executing the action
- **edit** (object, optional): Workspace edit describing the changes

### Examples:

1.  **TypeScript - Get refactoring options for a function call (position-based):**
    \`\`\`xml
    <lsp_get_code_actions>{"uri":"file:///src/utils.ts","line":24,"character":12}</lsp_get_code_actions>
    \`\`\`
    *Use case: Extract complex expression to variable, add type annotations*

2.  **TypeScript - Get refactoring options by function name (symbol-based):**
    \`\`\`xml
    <lsp_get_code_actions>{"uri":"file:///src/utils.ts","symbolName":"calculateTotal"}</lsp_get_code_actions>
    \`\`\`
    *Use case: Extract method, add type annotations, refactor function*

3.  **Python - Get quick fixes for import errors:**
    \`\`\`xml
    <lsp_get_code_actions>{"uri":"file:///src/main.py","line":0,"character":15}</lsp_get_code_actions>
    \`\`\`
    *Use case: Add missing import statements, organize imports*

4.  **Java - Get interface implementation suggestions:**
    \`\`\`xml
    <lsp_get_code_actions>{"uri":"file:///src/Service.java","symbolName":"UserService"}</lsp_get_code_actions>
    \`\`\`
    *Use case: Implement missing interface methods, add overrides*

5.  **Go - Get error handling suggestions:**
    \`\`\`xml
    <lsp_get_code_actions>{"uri":"file:///main.go","line":14,"character":8}</lsp_get_code_actions>
    \`\`\`
    *Use case: Add proper error handling, extract error checks*

6.  **C# - Get code generation options by class name:**
    \`\`\`xml
    <lsp_get_code_actions>{"uri":"file:///Models/User.cs","symbolName":"User"}</lsp_get_code_actions>
    \`\`\`
    *Use case: Generate constructors, properties, implement interfaces*

### Common Patterns:

**🚀 Refactoring Workflow:**
1. Position cursor on complex code block
2. Use this tool to discover available extractions
3. Apply "Extract Method" or "Extract Variable" actions

**🔧 Error Fixing Workflow:**
1. Position cursor on error/warning underline
2. Use this tool to get quick fix suggestions
3. Apply appropriate fix (add import, implement method, etc.)

**📚 Learning Workflow:**
1. Position cursor on various code elements
2. Explore available actions to learn best practices
3. Apply suggestions to improve code quality
────────────────────────────────────────────────────────────────────────────
`
}
