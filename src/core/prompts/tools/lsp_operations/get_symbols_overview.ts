import { ToolArgs } from "../types"

export function getGetSymbolsOverviewToolDescription(args: ToolArgs): string {
	return `## lsp_get_symbols_overview – Gets an overview of the top-level symbols defined in a given file or directory

Description:
The "lsp_get_symbols_overview" tool leverages the Language Server Protocol (LSP) to provide a comprehensive overview of code symbols in files or directories.
It extracts top-level symbols (classes, functions, interfaces, etc.) along with their types, giving you instant insight into code structure without reading the entire file.

### When & Why to Use:

**Most Beneficial Scenarios:**
- **Code Exploration**: When you need to understand the structure of unfamiliar codebases quickly
- **Architectural Analysis**: Identifying key components and their relationships across modules
- **Refactoring Planning**: Getting an overview before making structural changes
- **API Discovery**: Finding available classes, functions, and interfaces in a module
- **Documentation Generation**: Extracting symbol information for automated docs

**Specific Use Cases:**
- Analyzing a new project structure before making changes
- Finding all exported functions in a utility library
- Identifying classes and interfaces in a module for dependency analysis
- Getting a quick overview of test files to understand test structure
- Mapping out component hierarchies in frontend frameworks

**Developer Workflow Benefits:**
- **Speed**: Faster than manually scanning files or using grep
- **Accuracy**: LSP provides precise symbol information with correct types
- **Context**: Understands language semantics, not just text patterns
- **Efficiency**: Single operation covers entire directories

### Common Patterns & Best Practices:

**1. Progressive Exploration:**
\`\`\`
// Start broad, then narrow down
lsp_get_symbols_overview("src/") // identify key modules
lsp_get_symbols_overview("src/components/") // focus on specific area
\`\`\`

**2. Integration with Other Tools:**
\`\`\`
// Use overview to identify targets for detailed analysis
lsp_get_symbols_overview("src/api/") // find API classes
lsp_go_to_definition // examine specific implementations
\`\`\`

**3. Multi-Language Projects:**
\`\`\`
// Works across different file types in same directory
lsp_get_symbols_overview("src/") // gets TypeScript, JavaScript, Python symbols
\`\`\`

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_get_symbols_overview> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_get_symbols_overview> tag.
3️⃣ The JSON object MUST contain a "relative_path" key.

⚠️ **Common Breakers**
• Malformed JSON string (e.g., missing quotes around keys, trailing commas).
• Missing required "relative_path" key in the JSON.
• Incorrect path for the "relative_path" value.
• Path points to non-existent files or directories.
• Binary files or files without LSP support (images, compiled binaries).

────────────  COPY-READY TEMPLATE  ────────────
  <lsp_get_symbols_overview>{"relative_path":"src/utils"}</lsp_get_symbols_overview>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_get_symbols_overview> tag.

-   "relative_path" (string, REQUIRED): The relative path to the file or directory to analyze. Can be a single file or directory containing multiple files.

### Return Value:
The tool returns a JSON object mapping relative file paths to arrays of symbol information. Each symbol object contains:
- **name** (string): The symbol's identifier name
- **kind** (number): LSP symbol kind (1=File, 2=Module, 3=Namespace, 4=Package, 5=Class, 6=Method, 7=Property, 8=Field, 9=Constructor, 10=Enum, 11=Interface, 12=Function, 13=Variable, 14=Constant, etc.)
- **detail** (string, optional): Additional symbol information
- **range** (object): Source location with start/end positions

### Examples:

1.  **Explore a utility directory structure:**
    \`\`\`xml
    <lsp_get_symbols_overview>{"relative_path":"src/utils"}</lsp_get_symbols_overview>
    \`\`\`
    *Use case: Understanding available utility functions before implementing new features*

2.  **Analyze a single TypeScript module:**
    \`\`\`xml
    <lsp_get_symbols_overview>{"relative_path":"src/services/ApiClient.ts"}</lsp_get_symbols_overview>
    \`\`\`
    *Use case: Finding all exported classes and methods in an API service*

3.  **Map out component architecture:**
    \`\`\`xml
    <lsp_get_symbols_overview>{"relative_path":"src/components"}</lsp_get_symbols_overview>
    \`\`\`
    *Use case: Understanding React component hierarchy before refactoring*

4.  **Examine test structure:**
    \`\`\`xml
    <lsp_get_symbols_overview>{"relative_path":"tests/unit"}</lsp_get_symbols_overview>
    \`\`\`
    *Use case: Identifying test suites and test functions for coverage analysis*

5.  **API endpoint discovery:**
    \`\`\`xml
    <lsp_get_symbols_overview>{"relative_path":"src/routes"}</lsp_get_symbols_overview>
    \`\`\`
    *Use case: Finding all available API endpoints in a Node.js application*

### Error Prevention:
- Ensure the path exists and contains files supported by LSP
- Use forward slashes (/) in paths regardless of operating system
- For single files, include the file extension
- Large directories may return extensive results - consider narrowing scope
- Some symbol kinds may not be available for all languages
────────────────────────────────────────────────────────────────────────────
`
}
