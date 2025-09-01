import { ToolArgs } from "../types"

export function getGetTypeDefinitionToolDescription(args: ToolArgs): string {
	return `## lsp_get_type_definition – Navigates to the definition of a symbol's type.

Description:
This tool is a more specialized version of \`go_to_definition\`. While \`go_to_definition\` goes to where a variable is declared, \`lsp_get_type_definition\` goes to where the variable's *type* is declared. For example, if you have \`my_service: IService\`, this tool will take you to the definition of the \`IService\` interface.

────────────────────────  WHEN TO USE  ────────────────────────

**Most Beneficial Scenarios:**
- **Understanding Data Structures**: When analyzing complex types, interfaces, or classes referenced by variables
- **API Integration**: When working with third-party libraries and need to understand type definitions
- **Type-Driven Development**: When exploring type hierarchies and inheritance chains
- **Code Review**: When reviewing code that uses abstract types or interfaces
- **Refactoring**: When modifying types and need to understand their complete definition

**Specific Use Cases:**
1. **Interface Exploration**: Jump from \`user: IUser\` to the \`IUser\` interface definition
2. **Generic Type Analysis**: From \`data: Array<Customer>\` to the \`Customer\` type definition
3. **Class Hierarchy Navigation**: From \`service: BaseService\` to the \`BaseService\` class
4. **Union Type Investigation**: From \`result: Success | Error\` to either type definition
5. **Library Type Discovery**: From imported types to their original definitions

**Developer Workflow Benefits:**
- **Immediate Context**: Instantly see type structure without manual searching
- **Token Efficiency**: More direct than reading variable → finding type → searching definition
- **Architecture Understanding**: Quickly grasp type relationships and dependencies
- **Documentation Access**: Often leads to well-documented type definitions
- **IDE-like Navigation**: Provides VS Code-like "Go to Type Definition" functionality

**Common Patterns:**
- Use on function parameters to understand expected input structure
- Use on return values to understand output format
- Use on class properties to explore their type definitions
- Use on imported symbols to see their original type definitions

### Return Value:
The tool returns a single JSON 'Location' object, or an array of them if the type is defined in multiple places. It can also return null if the definition is not found.

A 'Location' object has the following structure:
- **uri** (string): The absolute URI of the file containing the type definition.
- **range** (object): The precise range of the type's definition.
  - **start** (object): The starting position.
    - **line** (number): The 0-based line number.
    - **character** (number): The 0-based character position.
  - **end** (object): The ending position.
    - **line** (number): The 0-based line number.
    - **character** (number): The 0-based character position.
- **preview** (string): A string containing the full line of code where the type is defined.

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_get_type_definition> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_get_type_definition> tag.
3️⃣ The JSON object MUST contain "uri" and either position ("line"/"character") OR "symbolName" keys (FLATTENED, not nested).
4️⃣ Ensure the <lsp_get_type_definition> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string (e.g., missing quotes around keys, trailing commas)
• Missing required "uri" key or both position and symbolName parameters
• Incorrect file path for the "uri" value (must be absolute file URI)
• Invalid line/character positions (negative numbers or out of bounds)
• Using relative paths instead of absolute file URIs
• Pointing to whitespace or comments instead of actual symbols

────────────  COPY-READY TEMPLATES  ────────────
Position-based: <lsp_get_type_definition>{"uri":"file:///path/to/file.ts","line":10,"character":5}</lsp_get_type_definition>
Name-based: <lsp_get_type_definition>{"uri":"file:///path/to/file.ts","symbolName":"variableName"}</lsp_get_type_definition>
<!-- Note: "line" is 0-based, "character" is 0-based -->
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_get_type_definition> tag.

**Required Parameter:**
-   "uri" (string, REQUIRED): Absolute URI of the document (must start with "file://").

**Position-based Lookup Parameters (optional):**
-   "line" (number, OPTIONAL): 0-based line number where the symbol is located.
-   "character" (number, OPTIONAL): 0-based character position within the line where the symbol is located.

**Name-based Lookup Parameter (optional):**
-   "symbolName" (string, OPTIONAL): The name of the symbol to get type definition for (e.g., "myVariable", "MyClass", "functionName").

**Note**: Either position parameters ('line' and 'character') OR 'symbolName' must be provided.

### Examples:

1.  **Get type definition of a variable in TypeScript (position-based):**
    \`\`\`xml
    <lsp_get_type_definition>{"uri":"file:///src/app.ts","line":30,"character":8}</lsp_get_type_definition>
    \`\`\`
    *Use case: Understanding the structure of a complex object or interface*

2.  **Navigate to interface definition from implementation (position-based):**
    \`\`\`xml
    <lsp_get_type_definition>{"uri":"file:///src/services/user.service.ts","line":15,"character":25}</lsp_get_type_definition>
    \`\`\`
    *Use case: From \`userRepository: IUserRepository\` to the \`IUserRepository\` interface*

3.  **Get type definition by symbol name (name-based):**
    \`\`\`xml
    <lsp_get_type_definition>{"uri":"file:///src/models/User.ts","symbolName":"userInstance"}</lsp_get_type_definition>
    \`\`\`
    *Use case: Find the type definition of \`userInstance\` variable without knowing its exact position*

4.  **Find union type definition in Python (position-based):**
    \`\`\`xml
    <lsp_get_type_definition>{"uri":"file:///src/models/response.py","line":22,"character":12}</lsp_get_type_definition>
    \`\`\`
    *Use case: From \`result: Success | Error\` to either type definition*

5.  **Navigate to class definition by name (name-based):**
    \`\`\`xml
    <lsp_get_type_definition>{"uri":"file:///src/main/java/com/app/Service.java","symbolName":"database"}</lsp_get_type_definition>
    \`\`\`
    *Use case: Find type definition of \`database\` variable to understand \`DatabaseConnection\` class*

6.  **Explore generic type parameter by name (name-based):**
    \`\`\`xml
    <lsp_get_type_definition>{"uri":"file:///src/utils/data.js","symbolName":"items"}</lsp_get_type_definition>
    \`\`\`
    *Use case: From \`items: Array<Product>\` to the \`Product\` type definition*
────────────────────────────────────────────────────────────────────────────

### Language-Specific Considerations:

**TypeScript/JavaScript:**
- Works with interfaces, types, classes, and imported symbols
- Particularly useful for exploring complex type definitions and generics
- Handles module imports and namespace navigation

**Python:**
- Effective with type hints, classes, and imported types
- Useful for exploring dataclasses, TypedDict, and Protocol definitions
- Works with both built-in and custom types

**Java/C#:**
- Navigates to class, interface, and enum definitions
- Handles generic type parameters and inheritance hierarchies
- Useful for exploring framework types and annotations

**Go:**
- Jumps to struct, interface, and type alias definitions
- Helpful for understanding package-level types and embedded types

### Common Error Prevention:

**Position Accuracy:**
- Ensure cursor is exactly on the symbol, not adjacent whitespace
- For multi-word types, position cursor on the type name part
- Avoid positioning on operators, punctuation, or keywords

**File URI Format:**
- Always use absolute paths starting with "file://"
- Use forward slashes even on Windows systems
- Ensure file exists and is part of the current workspace

**Symbol Context:**
- Only works on symbols that have type information available
- May not work on dynamically typed or untyped code
- Requires language server to have parsed and analyzed the file
────────────────────────────────────────────────────────────────────────────
`
}
