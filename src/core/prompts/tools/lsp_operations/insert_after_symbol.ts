import type { ToolArgs } from "../types"

export function getInsertAfterSymbolToolDescription(args: ToolArgs): string {
	return `## lsp_insert_after_symbol – Inserts content after the end of a symbol's definition

Description:
The "lsp_insert_after_symbol" tool leverages the Language Server Protocol (LSP) to precisely insert content immediately after the closing definition of a symbol. It automatically determines the exact end position of functions, classes, interfaces, or other symbols and inserts your content there, ensuring perfect placement without manual line counting.

### When & Why to Use:

**Most Beneficial Scenarios:**
- **Function Extension**: Adding new functions after existing ones in a class or module
- **Method Chaining**: Adding related methods after a primary method
- **Code Generation**: Automatically inserting generated code after template symbols
- **Documentation Addition**: Adding comments or documentation blocks after symbols
- **Decorator/Annotation Addition**: Adding metadata after symbol definitions

**Specific Use Cases:**
- Adding a new test function after an existing test in a test suite
- Inserting a related utility function after a main function
- Adding error handling methods after core business logic methods
- Inserting validation functions after data model definitions
- Adding override methods after base method implementations

**Developer Workflow Benefits:**
- **LSP Precision**: Uses language server to find exact symbol boundaries
- **Context Awareness**: Understands symbol scope and nesting levels
- **Safe Insertion**: Avoids breaking existing code structure
- **Language Agnostic**: Works across TypeScript, JavaScript, Python, etc.

### Common Patterns & Best Practices:

**1. Grouping Related Functions:**
\`\`\`typescript
// After finding a utility function, add related helpers
class Utils {
  formatDate(date: Date): string { ... }
  // lsp_insert_after_symbol adds formatTime here
}
\`\`\`

**2. Test Case Expansion:**
\`\`\`typescript
// Add new test cases after existing ones
describe('UserService', () => {
  it('should create user', () => { ... });
  // lsp_insert_after_symbol adds new test here
});
\`\`\`

**3. Progressive Enhancement:**
\`\`\`typescript
// Add enhanced versions after base implementations
function basicCalculation() { ... }
// lsp_insert_after_symbol adds advancedCalculation here
\`\`\`

**Advantages over Other Tools:**
- **Precision**: LSP provides exact symbol end position vs. manual line numbers
- **Safety**: No risk of breaking existing code structure or syntax
- **Simplicity**: No need to provide search context or surrounding code
- **Efficiency**: More token-efficient than showing old code in diffs
- **Reliability**: Works consistently across different formatting styles

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_insert_after_symbol> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_insert_after_symbol> tag.
3️⃣ The JSON object MUST contain "uri", "content" and either position ("line"/"character") OR "symbolName" keys (FLATTENED, not nested).

⚠️ **Common Breakers**
• Malformed JSON string (missing quotes, trailing commas, incorrect nesting).
• Missing required "uri" or "content" keys.
• Missing both position parameters AND symbolName parameter.
• Invalid file URI format (must start with "file://").
• Position pointing to whitespace or comments instead of actual symbol.
• Position outside file bounds or in invalid location.
• Empty content string (use empty string "" if intentional).

────────────  COPY-READY TEMPLATES  ────────────
Position-based: <lsp_insert_after_symbol>{"uri": "file:///absolute/path/to/file.ts", "line": 10, "character": 5, "content": "\\n\\n  // New function here\\n  function newFunction() {\\n    return true;\\n  }"}</lsp_insert_after_symbol>
Name-based: <lsp_insert_after_symbol>{"uri": "file:///absolute/path/to/file.ts", "symbolName": "existingFunction", "content": "\\n\\n  // Related function\\n  function relatedFunction() {\\n    return false;\\n  }"}</lsp_insert_after_symbol>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_insert_after_symbol> tag.

**⚠️ IMPORTANT: All parameters are FLATTENED (not nested in textDocument/position objects)**

**Required Parameters:**
- **uri** (string, REQUIRED): Absolute file URI of the document (e.g., "file:///absolute/path/to/file.ts").
- **content** (string, REQUIRED): The content to insert after the symbol. Include necessary newlines and indentation.

**Position-based Lookup Parameters (optional):**
- **line** (number, OPTIONAL): 0-based line number where the symbol is located (first line is 0).
- **character** (number, OPTIONAL): 0-based character position within the line where the symbol is located (first character is 0).

**Name-based Lookup Parameter (optional):**
- **symbolName** (string, OPTIONAL): The name of the symbol to insert after (e.g., "myFunction", "MyClass", "variableName").

**Note**: Either position parameters ('line' and 'character') OR 'symbolName' must be provided.

### When to Use Other Tools Instead:

**Use apply_diff for:**
- Modifying existing code within a symbol's body
- Making small targeted changes to specific lines
- Editing configuration blocks or comments
- Complex edits involving multiple scattered changes

**Use lsp_insert_before_symbol for:**
- Adding imports, decorators, or documentation before symbols
- Inserting setup code before function definitions

### Examples:

1.  **Add a helper method after a main method in a TypeScript class (position-based):**
    \`\`\`xml
    <lsp_insert_after_symbol>{"uri": "file:///src/services/UserService.ts", "line": 15, "character": 2, "content": "\\n\\n  private validateUser(user: User): boolean {\\n    return user.email && user.name;\\n  }"}</lsp_insert_after_symbol>
    \`\`\`
    *Use case: Adding validation logic after a user creation method using exact position*

2.  **Add a helper method after a main method by name (name-based):**
    \`\`\`xml
    <lsp_insert_after_symbol>{"uri": "file:///src/services/UserService.ts", "symbolName": "createUser", "content": "\\n\\n  private validateUser(user: User): boolean {\\n    return user.email && user.name;\\n  }"}</lsp_insert_after_symbol>
    \`\`\`
    *Use case: Adding validation logic after the 'createUser' method using symbol name lookup*

3.  **Insert a new test case after an existing test by name:**
    \`\`\`xml
    <lsp_insert_after_symbol>{"uri": "file:///tests/auth.test.ts", "symbolName": "should authenticate valid user", "content": "\\n\\n  it('should handle invalid credentials', async () => {\\n    const result = await auth.login('invalid', 'password');\\n    expect(result).toBe(false);\\n  });"}</lsp_insert_after_symbol>
    \`\`\`
    *Use case: Expanding test coverage after a specific test using test name*

4.  **Add an error handler after a main function in JavaScript by name:**
    \`\`\`xml
    <lsp_insert_after_symbol>{"uri": "file:///src/utils/apiClient.js", "symbolName": "fetchData", "content": "\\n\\nfunction handleApiError(error) {\\n  console.error('API Error:', error.message);\\n  throw new Error(\`API request failed: \${error.message}\`);\\n}"}</lsp_insert_after_symbol>
    \`\`\`
    *Use case: Adding error handling utilities after the 'fetchData' function*

5.  **Insert a utility function after a data processor in Python by position:**
    \`\`\`xml
    <lsp_insert_after_symbol>{"uri": "file:///src/data_processor.py", "line": 45, "character": 0, "content": "\\n\\ndef validate_processed_data(data):\\n    \\"\\"\\"Validate that processed data meets requirements.\\"\\"\\"\\n    if not data or len(data) == 0:\\n        raise ValueError('Processed data cannot be empty')\\n    return True"}</lsp_insert_after_symbol>
    \`\`\`
    *Use case: Adding validation logic after data processing functions using exact position*

6.  **Add a React component method after a specific method by name:**
    \`\`\`xml
    <lsp_insert_after_symbol>{"uri": "file:///src/components/UserProfile.tsx", "symbolName": "render", "content": "\\n\\n  private handleUserUpdate = (updatedUser: User) => {\\n    this.setState({ user: updatedUser });\\n    this.props.onUserChange?.(updatedUser);\\n  };"}</lsp_insert_after_symbol>
    \`\`\`
    *Use case: Adding event handlers after the 'render' method*

### Error Prevention:
- Ensure the position points to a valid symbol, not whitespace or comments
- Use absolute file paths in the URI, starting with "file://"
- Include proper indentation and newlines in content to match file style
- Verify the target symbol exists at the specified position
- Test with simple content first before complex multi-line insertions
- Be aware that LSP will find the end of the entire symbol definition (including nested content)
────────────────────────────────────────────────────────────────────────────
`
}
