import { ToolArgs } from "../types"

export function getGetCodeLensToolDescription(args: ToolArgs): string {
	return `## lsp_get_code_lens – Retrieves actionable, contextual information interleaved with source code.

Description:
The "lsp_get_code_lens" tool provides the data that powers the "CodeLens" feature in an IDE, which shows actionable information directly above functions, classes, or other code elements. This is an incredibly efficient way to discover and execute context-specific commands, like running a specific test or seeing the number of references to a method.

### When to Use This Tool:

**Most Beneficial Scenarios:**
- **Quick Action Discovery**: When you need to find available actions for a specific piece of code without manually searching through menus or documentation
- **Test Management**: Discovering runnable tests in test files and getting quick access to "Run" or "Debug" commands
- **Reference Analysis**: Getting immediate reference counts for methods, classes, or variables without running expensive search operations
- **Code Navigation**: Finding entry points for complex debugging or refactoring tasks

**Specific Use Cases:**
- **Test Development**: In test files, CodeLens shows "Run Test" and "Debug Test" options above each test function
- **API Development**: For REST endpoints, CodeLens might show "Send Request" or "Generate Client" options
- **Documentation**: Getting quick access to "Generate Documentation" or "View Documentation" commands
- **Performance Analysis**: Some extensions show performance metrics or profiling options via CodeLens
- **Git Integration**: Showing git blame information, commit history, or merge conflict resolution options

**Developer Workflow Benefits:**
- **Reduces Context Switching**: Actions are available directly in the editor without opening separate panels
- **Improves Discoverability**: Exposes functionality that users might not know exists
- **Speeds Up Testing**: One-click test execution without navigating to terminal or test explorer
- **Enhances Code Understanding**: Reference counts and usage patterns are immediately visible

### Return Value:
The tool returns a JSON array of 'CodeLens' objects. Each object represents a single piece of actionable information for a specific range in the document.

A 'CodeLens' object has the following structure:
- **range** (object): The range in the document that a given CodeLens applies to.
  - **start** (object): The starting position.
    - **line** (number): The 0-based line number.
    - **character** (number): The 0-based character position.
  - **end** (object): The ending position.
    - **line** (number): The 0-based line number.
    - **character** (number): The 0-based character position.
- **command** (object, optional): An object representing the command to be executed when the CodeLens is activated.
  - **title** (string): The text to display for the CodeLens (e.g., "5 references").
  - **command** (string): The identifier of the command to execute.
  - **arguments** (array, optional): An array of arguments to pass to the command.

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_get_code_lens> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_get_code_lens> tag.
3️⃣ The JSON object MUST contain a "textDocument" object with a "uri" key.
4️⃣ Ensure the <lsp_get_code_lens> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string.
• Missing required "textDocument" key in the JSON object.
• Invalid or non-existent file URI.
• File not part of the current workspace or language server scope.

────────────  COPY-READY TEMPLATE  ────────────
  <lsp_get_code_lens>{"textDocument":{"uri":"file:///path/to/file.ts"}}</lsp_get_code_lens>
  <!-- Note: "textDocument" with "uri" is REQUIRED. -->
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_get_code_lens> tag.

-   "textDocument" (object, REQUIRED): The document to get CodeLens information for.
    -   "uri" (string, REQUIRED): URI of the document (must be an absolute file URI).

### Practical Examples:

1.  **Get all CodeLens details for a Python test file to find runnable tests:**
    \`\`\`xml
    <lsp_get_code_lens>{"textDocument":{"uri":"file:///src/test_user_service.py"}}</lsp_get_code_lens>
    \`\`\`
    *(Shows "Run Test" and "Debug Test" options above each test function)*

2.  **Analyze a Go test file for available test commands:**
    \`\`\`xml
    <lsp_get_code_lens>{"textDocument":{"uri":"file:///src/app_test.go"}}</lsp_get_code_lens>
    \`\`\`
    *(Displays test execution options and benchmark commands)*

3.  **Check TypeScript class for reference information:**
    \`\`\`xml
    <lsp_get_code_lens>{"textDocument":{"uri":"file:///src/components/UserProfile.ts"}}</lsp_get_code_lens>
    \`\`\`
    *(Shows reference counts for methods and classes)*

4.  **Examine a JavaScript API route file:**
    \`\`\`xml
    <lsp_get_code_lens>{"textDocument":{"uri":"file:///src/api/routes/users.js"}}</lsp_get_code_lens>
    \`\`\`
    *(May show "Send Request" options for HTTP endpoints)*

5.  **Analyze a C# class file for implementation details:**
    \`\`\`xml
    <lsp_get_code_lens>{"textDocument":{"uri":"file:///src/Services/PaymentService.cs"}}</lsp_get_code_lens>
    \`\`\`
    *(Shows interface implementations and reference counts)*

### Common Patterns and Best Practices:

**Testing Workflows:**
- Use CodeLens in test files to quickly identify and run specific tests
- Look for "Run All Tests" options at the class or file level
- Debug individual failing tests directly from CodeLens commands

**Code Analysis:**
- Check reference counts to understand code usage before refactoring
- Use CodeLens to identify unused or heavily-used methods
- Navigate to implementations or declarations via CodeLens links

**Development Efficiency:**
- Leverage CodeLens in API files to test endpoints without external tools
- Use performance-related CodeLens for profiling critical code paths
- Take advantage of documentation generation commands in CodeLens
────────────────────────────────────────────────────────────────────────────
`
}
