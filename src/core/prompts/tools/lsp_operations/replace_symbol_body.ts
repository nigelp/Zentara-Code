import type { ToolArgs } from "../types"

export function getReplaceSymbolBodyToolDescription(args: ToolArgs): string {
	return `## lsp_replace_symbol_body – Replace Symbol Body with New Implementation

Description:
The "lsp_replace_symbol_body" tool replaces the entire body of a symbol at a specified location with new content. This tool leverages the Language Server Protocol (LSP) to precisely identify symbol boundaries and perform safe, accurate replacements of function bodies, method implementations, class definitions, and other code symbols.

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp> tag with operation "replace_symbol_body".
2️⃣ Provide all parameters as a single, well-formed JSON object string in the tag content.
3️⃣ The JSON object MUST contain "textDocument", "position", and "replacement" keys.
4️⃣ Ensure the <lsp> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string in the tag content.
• Missing required keys: "textDocument", "position", or "replacement".
• Invalid file URI format in textDocument.uri (must start with "file://").
• Position coordinates pointing to non-symbol locations.
• Replacement content with incorrect indentation for the first line.

────────────  COPY-READY TEMPLATES  ────────────
**Position-based (Legacy):**
  <lsp lsp_operation="replace_symbol_body">{"textDocument": {"uri": "file:///path/to/file"}, "position": {"line": 10, "character": 5}, "replacement": "new_body_content"}</lsp>

**Position-based (Modern):**
  <lsp lsp_operation="replace_symbol_body">{"uri": "file:///path/to/file", "line": 10, "character": 5, "replacement": "new_body_content"}</lsp>

**Name-based (Recommended):**
  <lsp lsp_operation="replace_symbol_body">{"uri": "file:///path/to/file", "symbolName": "functionName", "replacement": "new_body_content"}</lsp>
────────────────────────────────────────────────

### When & Why to Use This Tool:

**🎯 Primary Use Cases:**
- **Complete Function Rewrites**: When you need to replace an entire function implementation with new logic
- **Method Refactoring**: Updating class method bodies while preserving the signature
- **Algorithm Replacement**: Swapping out complex algorithmic implementations
- **Code Modernization**: Updating legacy code patterns to modern equivalents
- **Bug Fixes**: Replacing buggy implementations with corrected versions

**✅ Advantages over 'apply_diff':**
- **LSP Precision**: Uses Language Server Protocol to accurately identify symbol boundaries, eliminating ambiguity
- **Simplified Workflow**: Only requires the new content, not the old content to search for
- **Token Efficiency**: More efficient for large replacements since you don't need to include existing code
- **Safe Boundaries**: Automatically handles symbol start/end detection, reducing replacement errors
- **Language Awareness**: Respects language-specific syntax and structure

**🔄 When to Use 'apply_diff' Instead:**
- Small, targeted changes within a function (e.g., single line modifications)
- Changes to comments, documentation, or configuration blocks
- Modifications to parts of files that aren't symbol definitions
- When you need to see the exact diff being applied

### Workflow Benefits:

**🚀 Developer Productivity:**
- **Faster Refactoring**: Quickly replace entire function implementations without manual boundary detection
- **Reduced Errors**: LSP ensures accurate symbol identification and replacement boundaries
- **Multi-Language Support**: Works across different programming languages with LSP support
- **IDE Integration**: Seamlessly integrates with VS Code's language understanding

**🔧 Common Development Patterns:**
- **Test-Driven Development**: Replace function stubs with actual implementations
- **Performance Optimization**: Swap out slow algorithms with optimized versions
- **API Updates**: Update function bodies to work with new API versions
- **Error Handling**: Add comprehensive error handling to existing functions

### Parameters:
All parameters are provided as key-value pairs within a single JSON object in the <lsp> tag content.

**Option 1: Position-based lookup (Legacy format)**
- **"textDocument"** (object, REQUIRED): Document specification
  - **"uri"** (string, REQUIRED): File URI in format "file:///absolute/path/to/file"
- **"position"** (object, REQUIRED): Symbol position coordinates
  - **"line"** (number, REQUIRED): Line number (0-based) where the symbol is located
  - **"character"** (number, REQUIRED): Character position (0-based) within the line
- **"replacement"** (string, REQUIRED): New body content for the symbol

**Option 2: Modern flattened format with position-based lookup**
- **"uri"** (string, REQUIRED): File URI in format "file:///absolute/path/to/file"
- **"line"** (number, REQUIRED): Line number (0-based) where the symbol is located
- **"character"** (number, REQUIRED): Character position (0-based) within the line
- **"replacement"** (string, REQUIRED): New body content for the symbol

**Option 3: Name-based lookup (Recommended for most use cases)**
- **"uri"** (string, REQUIRED): File URI in format "file:///absolute/path/to/file"
- **"symbolName"** (string, REQUIRED): Name of the symbol to find and replace
- **"replacement"** (string, REQUIRED): New body content for the symbol

**Common parameters for all options:**
- **"replacement"** (string, REQUIRED): New body content for the symbol
  - **Important**: Begin directly with the symbol definition content
  - **Indentation**: Provide no leading indentation for the first line, but indent subsequent lines according to context

**Note**: Either position coordinates (line/character) OR symbolName must be provided, but not both.

### Result:
Returns success confirmation with details about the replacement operation, including the range of text that was replaced and any LSP-provided information about the symbol.

### Examples:

1. **Replace a Python function implementation:**
   \`\`\`xml
   <lsp lsp_operation="replace_symbol_body">{"textDocument": {"uri": "file:///home/user/project/utils.py"}, "position": {"line": 15, "character": 4}, "replacement": "def calculate_average(numbers):\\n    if not numbers:\\n        return 0\\n    return sum(numbers) / len(numbers)"}</lsp>
   \`\`\`

2. **Replace a JavaScript method body:**
   \`\`\`xml
   <lsp lsp_operation="replace_symbol_body">{"textDocument": {"uri": "file:///home/user/project/src/component.js"}, "position": {"line": 25, "character": 2}, "replacement": "handleClick(event) {\\n    event.preventDefault();\\n    this.setState({ clicked: true });\\n    this.props.onAction(this.props.id);\\n  }"}</lsp>
   \`\`\`

3. **Replace a TypeScript class method:**
   \`\`\`xml
   <lsp lsp_operation="replace_symbol_body">{"textDocument": {"uri": "file:///home/user/project/src/service.ts"}, "position": {"line": 42, "character": 6}, "replacement": "async fetchData(id: string): Promise<Data> {\\n    try {\\n      const response = await this.apiClient.get(\`/data/\${id}\`);\\n      return this.transformResponse(response.data);\\n    } catch (error) {\\n      this.logger.error('Failed to fetch data:', error);\\n      throw new DataFetchError(\`Could not fetch data for ID: \${id}\`);\\n    }\\n  }"}</lsp>
   \`\`\`

4. **Replace a Java method implementation:**
   \`\`\`xml
   <lsp lsp_operation="replace_symbol_body">{"textDocument": {"uri": "file:///home/user/project/src/main/java/com/example/Calculator.java"}, "position": {"line": 18, "character": 12}, "replacement": "public double divide(double a, double b) {\\n        if (b == 0) {\\n            throw new ArithmeticException(\\"Division by zero\\");\\n        }\\n        return a / b;\\n    }"}</lsp>
   \`\`\`

5. **Replace a C# property implementation:**
   \`\`\`xml
   <lsp lsp_operation="replace_symbol_body">{"textDocument": {"uri": "file:///home/user/project/Models/User.cs"}, "position": {"line": 12, "character": 8}, "replacement": "public string Email\\n    {\\n        get => _email;\\n        set\\n        {\\n            if (string.IsNullOrWhiteSpace(value))\\n                throw new ArgumentException(\\"Email cannot be empty\\");\\n            if (!IsValidEmail(value))\\n                throw new ArgumentException(\\"Invalid email format\\");\\n            _email = value;\\n        }\\n    }"}</lsp>
   \`\`\`

6. **Replace a Python function using symbolName (Recommended approach):**
   \`\`\`xml
   <lsp lsp_operation="replace_symbol_body">{"uri": "file:///home/user/project/utils.py", "symbolName": "calculate_average", "replacement": "def calculate_average(numbers):\\n    if not numbers:\\n        return 0\\n    return sum(numbers) / len(numbers)"}</lsp>
   \`\`\`

7. **Replace a JavaScript method using symbolName:**
   \`\`\`xml
   <lsp lsp_operation="replace_symbol_body">{"uri": "file:///home/user/project/src/component.js", "symbolName": "handleClick", "replacement": "handleClick(event) {\\n    event.preventDefault();\\n    this.setState({ clicked: true });\\n    this.props.onAction(this.props.id);\\n  }"}</lsp>
   \`\`\`

8. **Replace a TypeScript class method using symbolName:**
   \`\`\`xml
   <lsp lsp_operation="replace_symbol_body">{"uri": "file:///home/user/project/src/service.ts", "symbolName": "fetchData", "replacement": "async fetchData(id: string): Promise<Data> {\\n    try {\\n      const response = await this.apiClient.get(\`/data/\${id}\`);\\n      return this.transformResponse(response.data);\\n    } catch (error) {\\n      this.logger.error('Failed to fetch data:', error);\\n      throw new DataFetchError(\`Could not fetch data for ID: \${id}\`);\\n    }\\n  }"}</lsp>
   \`\`\`

────────────────────────────────────────────────────────────────────────────

### Bad Examples:
The following are **critical errors** that will cause the \`lsp_replace_symbol_body\` operation to **FAIL**. You MUST avoid these mistakes:

1. **Missing required keys in JSON:**
   \`\`\`xml
   <lsp lsp_operation="replace_symbol_body">{"textDocument": {"uri": "file:///path/to/file"}}</lsp>
   \`\`\`
   *Correction: Must include "position" and "replacement" keys.*

2. **Invalid file URI format:**
   \`\`\`xml
   <lsp lsp_operation="replace_symbol_body">{"textDocument": {"uri": "/absolute/path/to/file"}, "position": {"line": 10, "character": 5}, "replacement": "new code"}</lsp>
   \`\`\`
   *Correction: URI must start with "file://" protocol.*

3. **Malformed JSON:**
   \`\`\`xml
   <lsp lsp_operation="replace_symbol_body">{"textDocument": {"uri": "file:///path/to/file"} "position": {"line": 10, "character": 5}, "replacement": "new code"}</lsp>
   \`\`\`
   *Correction: Missing comma between JSON objects.*

4. **Incorrect position coordinates:**
   \`\`\`xml
   <lsp lsp_operation="replace_symbol_body">{"textDocument": {"uri": "file:///path/to/file"}, "position": {"line": "10", "character": "5"}, "replacement": "new code"}</lsp>
   \`\`\`
   *Correction: Line and character must be numbers, not strings.*
────────────────────────────────────────────────────────────────────────────
`
}
