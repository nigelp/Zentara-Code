import { ToolArgs } from "../types"

export function getGetSemanticTokensToolDescription(args: ToolArgs): string {
	return `## lsp_get_semantic_tokens – Get Detailed Semantic Analysis of Code Tokens

Description:
The "lsp_get_semantic_tokens" tool provides comprehensive semantic analysis of every token in a source file. Unlike simple syntax highlighting, this tool leverages the Language Server Protocol's deep understanding of code semantics to classify each token with precise meaning, context, and properties.

### When to Use This Tool:

**🎯 Most Beneficial Scenarios:**
- **Code Analysis and Metrics**: When building tools that need to understand code structure and patterns
- **Custom Syntax Highlighting**: When creating advanced editors or code viewers with semantic-aware highlighting
- **Code Quality Assessment**: When analyzing code complexity, variable usage patterns, or architectural metrics
- **Documentation Generation**: When automatically generating documentation that needs to understand code semantics
- **Refactoring Tools**: When building tools that need to distinguish between different types of identifiers

**🔧 Specific Use Cases:**
- **Variable Analysis**: Distinguish between local variables, parameters, fields, and global variables
- **Function Classification**: Identify method calls vs. function definitions vs. constructors
- **Type Analysis**: Understand which tokens represent types, interfaces, or classes
- **Scope Analysis**: Determine the semantic scope and context of identifiers
- **Modifier Detection**: Identify readonly, static, private, abstract, and other modifiers

**💡 Developer Workflow Benefits:**
- **Deep Code Understanding**: Get precise semantic information about every code element
- **Architecture Analysis**: Understand code structure and relationships at a granular level
- **Pattern Recognition**: Identify coding patterns and anti-patterns through semantic analysis
- **Tool Development**: Build sophisticated code analysis tools with rich semantic data
- **Language Learning**: Understand how language servers classify different code constructs

**📊 Analysis Applications:**
- **Complexity Metrics**: Count different types of variables, functions, and control structures
- **Naming Conventions**: Analyze identifier naming patterns across a codebase
- **Dependency Analysis**: Understand relationships between different code elements
- **Code Visualization**: Create semantic-aware code maps and diagrams

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_get_semantic_tokens> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_get_semantic_tokens> tag.
3️⃣ The JSON object MUST contain a "textDocument" object with a "uri" key.
4️⃣ Ensure the <lsp_get_semantic_tokens> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string - ensure proper escaping and valid JSON syntax
• Missing required "textDocument" key in the JSON object
• Invalid file URI format - must use "file://" protocol
• File doesn't exist or isn't accessible by the language server
• Language server doesn't support semantic tokens for the file type
• Very large files may cause timeout or memory issues
• Files with syntax errors may return incomplete semantic information

────────────  COPY-READY TEMPLATE  ────────────
  <lsp_get_semantic_tokens>{"textDocument":{"uri":"file:///path/to/file.ts"}}</lsp_get_semantic_tokens>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object.

-   "textDocument" (object, REQUIRED): The document to analyze for semantic tokens.
    -   "uri" (string, REQUIRED): File URI using the "file://" protocol.

### Return Value:
Returns a JSON array of SemanticToken objects, each representing a classified token:

- **line** (number): Zero-based line number where the token appears
- **character** (number): Zero-based character position where the token starts
- **length** (number): Character length of the token
- **tokenType** (string): Primary classification (e.g., "variable", "function", "class", "keyword", "parameter")
- **tokenModifiers** (array): Additional properties (e.g., ["declaration", "readonly"], ["static", "private"])

### Common Token Types:
- **namespace**: Module or namespace identifiers
- **class**: Class names and type definitions
- **interface**: Interface definitions
- **function**: Function and method names
- **variable**: Variable identifiers
- **parameter**: Function parameters
- **property**: Object properties and fields
- **keyword**: Language keywords
- **comment**: Code comments
- **string**: String literals
- **number**: Numeric literals

### Common Token Modifiers:
- **declaration**: Token is being declared
- **definition**: Token is being defined
- **readonly**: Token is read-only
- **static**: Token is static
- **deprecated**: Token is deprecated
- **abstract**: Token is abstract
- **async**: Token relates to async operations
- **modification**: Token is being modified

### Examples:

1.  **TypeScript - Analyze a complex class file:**
    \`\`\`xml
    <lsp_get_semantic_tokens>{"textDocument":{"uri":"file:///src/models/User.ts"}}</lsp_get_semantic_tokens>
    \`\`\`
    *Use case: Understand class structure, identify properties vs methods, analyze modifiers*

2.  **Python - Analyze a data processing script:**
    \`\`\`xml
    <lsp_get_semantic_tokens>{"textDocument":{"uri":"file:///src/data_processor.py"}}</lsp_get_semantic_tokens>
    \`\`\`
    *Use case: Distinguish functions vs variables, identify decorators, analyze imports*

3.  **Java - Analyze a service class:**
    \`\`\`xml
    <lsp_get_semantic_tokens>{"textDocument":{"uri":"file:///src/main/java/UserService.java"}}</lsp_get_semantic_tokens>
    \`\`\`
    *Use case: Identify annotations, distinguish fields vs methods, analyze access modifiers*

4.  **Go - Analyze a package file:**
    \`\`\`xml
    <lsp_get_semantic_tokens>{"textDocument":{"uri":"file:///pkg/handlers/user.go"}}</lsp_get_semantic_tokens>
    \`\`\`
    *Use case: Understand struct fields, identify receiver methods, analyze package structure*

5.  **C# - Analyze a controller class:**
    \`\`\`xml
    <lsp_get_semantic_tokens>{"textDocument":{"uri":"file:///Controllers/ApiController.cs"}}</lsp_get_semantic_tokens>
    \`\`\`
    *Use case: Identify attributes, distinguish properties vs methods, analyze accessibility*

### Analysis Patterns:

**📈 Metrics Collection:**
\`\`\`javascript
// Count token types for complexity analysis
const tokens = getSemanticTokens(file);
const metrics = {
  functions: tokens.filter(t => t.tokenType === 'function').length,
  variables: tokens.filter(t => t.tokenType === 'variable').length,
  classes: tokens.filter(t => t.tokenType === 'class').length
};
\`\`\`

**🔍 Pattern Analysis:**
\`\`\`javascript
// Find deprecated usage patterns
const deprecatedTokens = tokens.filter(t => 
  t.tokenModifiers.includes('deprecated')
);
\`\`\`

**🎨 Custom Highlighting:**
\`\`\`javascript
// Create semantic-aware syntax highlighting
const highlightRules = tokens.map(token => ({
  range: { line: token.line, start: token.character, end: token.character + token.length },
  style: getStyleForTokenType(token.tokenType, token.tokenModifiers)
}));
\`\`\`
────────────────────────────────────────────────────────────────────────────
`
}
