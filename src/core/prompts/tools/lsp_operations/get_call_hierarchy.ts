import { ToolArgs } from "../types"

export function getGetCallHierarchyToolDescription(args: ToolArgs): string {
	return `## lsp_get_call_hierarchy – Explores the call stack by showing incoming and outgoing calls for a function.

Description:
The "lsp_get_call_hierarchy" tool leverages Language Server Protocol (LSP) capabilities to provide comprehensive call hierarchy information for functions and methods. This tool offers precise analysis of function relationships by showing both incoming calls (who calls this function) and outgoing calls (what this function calls).

### When This Operation Is Most Beneficial:

**Code Navigation & Understanding:**
- Navigating large codebases where manual search is inefficient
- Understanding complex function relationships in unfamiliar code
- Tracing execution paths through multiple layers of abstraction
- Analyzing legacy code to understand architectural patterns

**Debugging & Problem Solving:**
- Identifying all entry points when a function behaves unexpectedly
- Understanding call context when debugging runtime errors
- Tracing data flow through function call chains
- Finding the source of incorrect function parameters

**Refactoring & Maintenance:**
- Impact analysis before modifying function signatures
- Identifying all callers before changing function behavior
- Finding unused functions (dead code elimination)
- Understanding dependencies before code restructuring

**Code Review & Quality Assurance:**
- Verifying that functions are called from expected contexts
- Ensuring proper error handling across call chains
- Validating architectural boundaries and layering

### Specific Scenarios Where It Should Be Used:

1. **API Endpoint Analysis**: Understanding which services call specific API methods
2. **Library Function Usage**: Seeing how utility functions are used across the codebase
3. **Event Handler Chains**: Tracing event propagation through multiple handlers
4. **Database Query Analysis**: Finding all code paths that execute specific queries
5. **Error Handling Verification**: Ensuring error handlers are properly integrated
6. **Performance Investigation**: Identifying hot paths and frequently called functions

### How It Helps Developers:

- **Reduces Cognitive Load**: No need to manually search and remember function relationships
- **Increases Confidence**: Make changes knowing the full impact scope
- **Saves Time**: Instant hierarchical view instead of grep-based searching
- **Improves Code Quality**: Better understanding leads to better architectural decisions
- **Facilitates Collaboration**: Team members can quickly understand code relationships

### Return Value:
The tool returns a CallHierarchyItem object with incoming and outgoing calls formatted as compact tables:

\`\`\`
{
  "incomingCalls": "FROM_NAME | FROM_KIND | FROM_URI | FROM_RANGE | FROM_SELECTION | CALL_RANGES | EOL\\ncaller1 | 12 | /src/app.ts | 5:0-10:1 | 5:9-16 | 5:10-21 | <<<\\ncaller2 | 12 | /src/other.ts | 8:0-12:1 | 8:9-16 | 8:5-16 | <<<",
  "outgoingCalls": "TO_NAME | TO_KIND | TO_URI | TO_RANGE | TO_SELECTION | CALL_RANGES | EOL\\nhelper | 12 | /src/helper.ts | 15:0-20:1 | 15:9-15 | 15:5-16 | <<<\\nutils | 12 | /src/utils.ts | 25:0-30:1 | 25:9-14 | 25:10-15 | <<<"
}
\`\`\`

**Structure:**
- **incomingCalls** (string): A table of functions that call the queried function
- **outgoingCalls** (string): A table of functions called by the queried function

**Incoming Calls Table Columns:**

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| FROM_NAME | string | Name of the calling function | \`caller1\` |
| FROM_KIND | number | LSP symbol kind of caller | \`12\` (function) |
| FROM_URI | string | File path of caller (without file:// prefix) | \`/src/app.ts\` |
| FROM_RANGE | string | Full range of calling function | \`5:0-10:1\` |
| FROM_SELECTION | string | Name range of calling function | \`5:9-16\` |
| CALL_RANGES | string | Ranges where the call occurs | \`5:10-21\` |
| EOL | marker | End-of-line marker | \`<<<\` |

**Outgoing Calls Table Columns:**

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| TO_NAME | string | Name of the called function | \`helper\` |
| TO_KIND | number | LSP symbol kind of called function | \`12\` (function) |
| TO_URI | string | File path of called function | \`/src/helper.ts\` |
| TO_RANGE | string | Full range of called function | \`15:0-20:1\` |
| TO_SELECTION | string | Name range of called function | \`15:9-15\` |
| CALL_RANGES | string | Ranges where the call is made | \`15:5-16\` |
| EOL | marker | End-of-line marker | \`<<<\` |

**Range Format Rules:**
1. **Same Line**: \`line:startChar-endChar\` (e.g., \`52:6-61\`)
2. **Multi Line**: \`startLine:startChar-endLine:endChar\` (e.g., \`79:0-742:1\`)
3. **Zero-based indexing** (consistent with LSP specification)

**Table Format Benefits:**
- **Token efficient** - Compact representation optimized for LLM consumption
- **Easy scanning** for call relationships and function details
- **Separate tables** for incoming and outgoing calls for clear organization
- **Consistent structure** for reliable parsing

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_get_call_hierarchy> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content.
3️⃣ The JSON object MUST contain "uri" key and either position parameters ("line" + "character") OR "symbolName".
4️⃣ Ensure the tag is correctly closed: </lsp_get_call_hierarchy>.

⚠️ **Common Breakers**
• Malformed JSON string.
• Missing required "uri" key.
• Missing both position parameters AND symbolName.
• Providing only one position parameter (need both line AND character).
• Incorrect file URI format (must start with "file://").
• Invalid position coordinates (line numbers are 0-based, character positions are 0-based).
• Pointing to whitespace or comments instead of actual function/method names.
• Using relative paths instead of absolute URIs.
• Empty or whitespace-only symbolName.

────────────  COPY-READY TEMPLATE  ────────────
  <lsp_get_call_hierarchy>{"uri":"file:///path/to/file.ts","line":10,"character":5}</lsp_get_call_hierarchy>
───────────────────────────────────────────────

### Parameters:
-   "uri" (string, REQUIRED): URI of the document.
-   "line" (number, OPTIONAL): Zero-based line number. Required when using position-based lookup.
-   "character" (number, OPTIONAL): Zero-based character position. Required when using position-based lookup.
-   "symbolName" (string, OPTIONAL): Name of the symbol to find. Required when using name-based lookup.

**Parameter Notes:**
- Line numbers are 0-based (first line is 0, not 1)
- Character positions are 0-based (first character is 0)
- The URI must be an absolute file path with "file://" prefix
- Either position parameters (line + character) OR symbolName must be provided
- When using symbolName, the tool will find the first matching symbol in the file
- Position must point to a valid symbol location (variable name, function name, etc.)

### Practical Examples:

1.  **Analyze a Python function's call hierarchy by position:**
    \`\`\`xml
    <lsp_get_call_hierarchy>{"uri":"file:///src/user_service.py","line":42,"character":4}</lsp_get_call_hierarchy>
    \`\`\`
    *(Position the cursor on the function name authenticate_user to see who calls it and what it calls)*

2.  **Examine a TypeScript method in a class:**
    \`\`\`xml
    <lsp_get_call_hierarchy>{"uri":"file:///src/components/UserProfile.ts","line":156,"character":8}</lsp_get_call_hierarchy>
    \`\`\`
    *(Analyze the validateInput method to understand its usage patterns)*

3.  **Investigate a JavaScript API endpoint handler:**
    \`\`\`xml
    <lsp_get_call_hierarchy>{"uri":"file:///src/api/routes/users.js","line":78,"character":15}</lsp_get_call_hierarchy>
    \`\`\`
    *(Understand how the handleUserCreation function is integrated)*

4.  **Analyze a function by name (name-based lookup):**
    \`\`\`xml
    <lsp_get_call_hierarchy>{"uri":"file:///src/services/OrderService.ts","symbolName":"processPayment"}</lsp_get_call_hierarchy>
    \`\`\`
    *(Find the processPayment function by name and analyze its call hierarchy)*

5.  **Examine a class method by name:**
    \`\`\`xml
    <lsp_get_call_hierarchy>{"uri":"file:///src/models/User.ts","symbolName":"getUserById"}</lsp_get_call_hierarchy>
    \`\`\`
    *(Locate and analyze the getUserById method's call relationships)*

6.  **Trace a C++ member function:**
    \`\`\`xml
    <lsp_get_call_hierarchy>{"uri":"file:///src/database/QueryEngine.cpp","line":234,"character":12}</lsp_get_call_hierarchy>
    \`\`\`
    *(Examine the executeQuery method's call relationships)*

7.  **Find constructor call hierarchy by name:**
    \`\`\`xml
    <lsp_get_call_hierarchy>{"uri":"file:///src/models/Product.ts","symbolName":"ProductModel"}</lsp_get_call_hierarchy>
    \`\`\`
    *(Analyze which code creates instances of ProductModel)*

### Common Patterns & Best Practices:

**Pattern 1: API Boundary Analysis**
- Use on public API methods to understand external integration points
- Helps identify breaking changes when modifying public interfaces

**Pattern 2: Dependency Injection Tracing**
- Analyze constructor parameters and injected services
- Understand service dependency graphs in DI frameworks

**Pattern 3: Event System Investigation**
- Trace event handlers and their trigger points
- Understand event propagation chains in reactive systems

**Pattern 4: Error Handling Verification**
- Check that error handling functions are properly integrated
- Ensure exception handlers are called from expected contexts
────────────────────────────────────────────────────────────────────────────
`
}
