import { ToolArgs } from "../types"

export function getGetSymbolsToolDescription(args: ToolArgs): string {
	return `## lsp_search_symbols - Finds symbols in the workspace with flexible filtering and hierarchical navigation.

Description:
This tool performs intelligent symbol search across your codebase, allowing you to find classes, methods, functions, variables, and other code constructs.
It supports hierarchical symbol navigation, filtering by symbol types, and flexible matching patterns.

The matching behavior is determined by the 'name_path' parameter:

- **Simple Name**: "UserService" matches any symbol named "UserService"
- **Relative Path**: "UserService/getUserById" matches "getUserById" symbols that are children of any "UserService" symbol
- **Absolute Path**: "/UserService/getUserById" matches "getUserById" only if it's a direct child of a top-level "UserService"
- **Substring Matching**: With substring_matching=true, "get" matches "getUserById", "getConfig", etc.

Trailing slashes in 'name_path' are ignored for convenience.

### When to Use This Tool:

1. **Code Discovery & Navigation**:
   - Finding specific functions, classes, or methods when you don't know their exact location
   - Exploring the structure and organization of unfamiliar codebases
   - Discovering available methods within a class or module
   - Locating symbols before using other LSP operations like go_to_definition

2. **Refactoring & Code Analysis**:
   - Finding all methods with similar names across the codebase
   - Identifying classes that follow specific naming patterns
   - Discovering methods that might need to be updated during refactoring
   - Analyzing code structure and architecture

3. **Development Workflows**:
   - Quick symbol lookup during development
   - Finding implementations before making changes
   - Exploring API structures and available methods
   - Understanding inheritance hierarchies and class structures

4. **Code Review & Documentation**:
   - Finding symbols to document or review
   - Locating examples of specific patterns or implementations
   - Understanding the scope and distribution of certain symbol types

### Language-Specific Use Cases:

- **Python**: Find classes, methods, functions, variables, imports
- **JavaScript/TypeScript**: Locate functions, classes, interfaces, types, React components
- **Java**: Find classes, methods, fields, interfaces, enums
- **C++**: Locate classes, functions, namespaces, templates, structs
- **C#**: Find classes, methods, properties, interfaces, namespaces

### Best Practices:

- Use hierarchical paths ("ClassName/methodName") for precise targeting
- Enable substring matching for exploratory searches
- Filter by symbol kinds to focus on specific symbol types
- Combine with other LSP operations for complete symbol analysis
- Use relative_path to scope searches to specific files or directories

### Return Value:
The tool returns a JSON array of 'Symbol' objects. Each object represents a matching symbol.

A 'Symbol' object has the following structure:
- **name** (string): The name of the symbol.
- **kind** (number): A number representing the kind of symbol (e.g., 5 for Class, 12 for Function).
- **location** (object): A 'Location' object pointing to the symbol's declaration.
  - **uri** (string): The absolute URI of the file containing the declaration.
  - **range** (object): The precise range of the symbol's declaration.
- **name_path** (string): The full path of the symbol in the file's symbol tree (e.g., "class/method").
- **body** (string, optional): The source code of the symbol, if requested.

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_search_symbols> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_search_symbols> tag.
3️⃣ The JSON object MUST contain a "name_path" string.
4️⃣ Ensure the <lsp_search_symbols> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string (e.g., missing quotes around keys, trailing commas, unclosed braces).
• Missing required "name_path" key in the JSON object.
• Invalid symbol kind numbers in include_kinds or exclude_kinds arrays.
• Using non-existent file paths in relative_path parameter.
• Providing negative values for depth or max_answer_chars.
• Empty name_path string (must contain at least one character).

────────────  COPY-READY TEMPLATE  ────────────
  <lsp_search_symbols>{"name_path":"MyClass/myMethod"}</lsp_search_symbols>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_search_symbols> tag.

-   "name_path" (string, REQUIRED): The name path pattern to search for. Can be a simple name ("UserService"), relative path ("UserService/getUserById"), or absolute path ("/UserService/getUserById").
-   "depth" (number, optional): Depth to retrieve descendants. Use 1 to get immediate children (e.g., class methods/attributes), 2 for grandchildren, etc. Default is 0 (no descendants).
-   "relative_path" (string, optional): Restrict search to this specific file or directory path. If not provided, searches the entire workspace. Use to scope searches when working with large codebases.
-   "include_body" (boolean, optional): If true, include the symbol's complete source code in the results. Useful when you need to see the implementation, not just the location. Default is false.
-   "include_kinds" (array of numbers, optional): List of LSP symbol kind integers to include. Common values: [5] for Class, [12] for Function, [6] for Method, [13] for Variable. Only symbols of these kinds will be returned.
-   "exclude_kinds" (array of numbers, optional): List of LSP symbol kind integers to exclude. Useful for filtering out unwanted symbol types from broad searches.
-   "substring_matching" (boolean, optional): If true, use substring matching for the last segment of 'name_path'. "get" would match "getUserById", "getConfig", etc. Default is false (exact matching).
-   "max_answer_chars" (number, optional): Maximum characters for the JSON result. Use to limit response size when dealing with large symbol sets. Default is unlimited.
-   "case_sensitive" (boolean, optional): If false, then all symbols are matched regardless by case. Default: false.

### Symbol Kind Reference:
- 1: File, 2: Module, 3: Namespace, 4: Package, 5: Class
- 6: Method, 7: Property, 8: Field, 9: Constructor, 10: Enum
- 11: Interface, 12: Function, 13: Variable, 14: Constant, 15: String
- 16: Number, 17: Boolean, 18: Array, 19: Object, 20: Key

### Examples:

1.  **Find a specific class by name:**
    \`\`\`xml
    <lsp_search_symbols>{"name_path":"UserService"}</lsp_search_symbols>
    \`\`\`

2.  **Find all methods named 'calculate' inside any class named 'Calculator':**
    \`\`\`xml
    <lsp_search_symbols>{"name_path":"Calculator/calculate"}</lsp_search_symbols>
    \`\`\`

3.  **Find all functions containing 'get' in their name (substring matching):**
    \`\`\`xml
    <lsp_search_symbols>{"name_path":"get", "substring_matching":true, "include_kinds":[12]}</lsp_search_symbols>
    \`\`\`

4.  **Find all classes and their immediate methods in a specific file:**
    \`\`\`xml
    <lsp_search_symbols>{"name_path":"", "relative_path":"src/models/user.py", "include_kinds":[5], "depth":1}</lsp_search_symbols>
    \`\`\`

5.  **Find React components (classes) with their source code:**
    \`\`\`xml
    <lsp_search_symbols>{"name_path":"Component", "substring_matching":true, "include_kinds":[5], "include_body":true}</lsp_search_symbols>
    \`\`\`

6.  **Find all functions in a specific directory, excluding variables:**
    \`\`\`xml
    <lsp_search_symbols>{"name_path":"", "relative_path":"src/utils/", "include_kinds":[12], "exclude_kinds":[13]}</lsp_search_symbols>
    \`\`\`

7.  **Find interface definitions in TypeScript:**
    \`\`\`xml
    <lsp_search_symbols>{"name_path":"Interface", "substring_matching":true, "include_kinds":[11]}</lsp_search_symbols>
    \`\`\`

8.  **Explore class structure - find all methods of a specific class:**
    \`\`\`xml
    <lsp_search_symbols>{"name_path":"DatabaseManager", "depth":2, "include_kinds":[6]}</lsp_search_symbols>
    \`\`\`

9.  **Find all symbols containing 'user' case-insensitively:**
    \`\`\`xml
    <lsp_search_symbols>{"name_path":"user", "substring_matching":true, "case_sensitive":false}</lsp_search_symbols>
    \`\`\`
────────────────────────────────────────────────────────────────────────────

### Common Workflow Patterns:

1.  **Exploratory Code Navigation:**
    - First: Use broad search with substring matching to discover symbols
    - Then: Use specific hierarchical paths to target exact symbols
    - Next: Use lsp_get_symbol_children to explore symbol structure
    - Finally: Use lsp_get_symbol_code_snippet to examine implementations ONLY after understanding structure

2.  **Class Structure Analysis:**
    - First: Find the class with lsp_search_symbols
    - Then: Use depth=1 or depth=2 to explore class members
    - Finally: Use go_to_definition for detailed investigation

3.  **Refactoring Preparation:**
    - First: Find all symbols matching a pattern
    - Then: Review each symbol's location and context
    - Finally: Plan refactoring based on symbol distribution

4.  **API Discovery:**
    - First: Search for classes or modules by name
    - Then: Explore their methods and properties using depth parameter
    - Finally: Use get_hover_info or get_signature_help for details
────────────────────────────────────────────────────────────────────────────
`
}
