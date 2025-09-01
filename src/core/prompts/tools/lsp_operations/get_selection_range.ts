import { ToolArgs } from "../types"

export function getGetSelectionRangeToolDescription(args: ToolArgs): string {
	return `## lsp_get_selection_range – Provides a hierarchy of semantically meaningful selection ranges at a position.

Description:
The "lsp_get_selection_range" tool powers the "smart selection" or "expand selection" feature in an IDE. Given a cursor position, it returns a series of increasingly larger, semantically-aware ranges. For example, from a variable name, to the statement it's in, to the function body, to the entire class.

### When to Use This Tool:

**Most Beneficial Scenarios:**
- **Precision Code Selection**: When you need to programmatically select exact semantic units without manual text selection
- **Automated Refactoring**: When building tools that need to extract or modify specific code blocks with precision
- **Code Structure Analysis**: When analyzing how code elements are nested within larger structures
- **Smart Code Manipulation**: When implementing features that need to understand code hierarchy and scope

**Specific Use Cases:**
- **Extract Method Refactoring**: Get precise ranges for statement blocks to extract into separate methods
- **Code Folding**: Determine foldable regions based on semantic structure rather than indentation
- **Scope Analysis**: Understand the hierarchical structure of code blocks, functions, and classes
- **Template Generation**: Create code templates based on semantic structure patterns
- **Code Comparison**: Compare similar code structures by analyzing their semantic hierarchy
- **Documentation Tools**: Generate structured documentation based on code hierarchy

**Developer Workflow Benefits:**
- **Reduces Selection Errors**: Eliminates manual selection mistakes when working with complex nested code
- **Improves Refactoring Speed**: Quickly identify and select complete semantic units for refactoring
- **Enhances Code Understanding**: Visualize code structure and nesting relationships
- **Enables Smart Editing**: Build intelligent editing features that understand code semantics
- **Streamlines Code Analysis**: Automatically identify code boundaries for analysis tools

### Return Value:
The tool returns a single 'SelectionRange' object. The power of this tool is in the 'parent' property, which creates a linked list of ranges, allowing you to traverse up the structural hierarchy of the code.

A 'SelectionRange' object has the following structure:
- **range** (object): The specific range for the current level of the hierarchy.
  - **start** (object): The starting position.
    - **line** (number): The 0-based line number.
    - **character** (number): The 0-based character position.
  - **end** (object): The ending position.
    - **line** (number): The 0-based line number.
    - **character** (number): The 0-based character position.
- **parent** (object, optional): Another 'SelectionRange' object representing the next-larger containing semantic range. This chain continues until the entire document range is reached.

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_get_selection_range> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_get_selection_range> tag.
3️⃣ The JSON object MUST contain a "textDocument" object with a "uri" key and a "position" object.
4️⃣ Ensure the <lsp_get_selection_range> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string.
• Missing required "textDocument" or "position" keys in the JSON object.
• Invalid position coordinates (negative line/character numbers).
• Position outside the document bounds.
• Invalid file URI format or non-existent file.
• File not supported by the language server.

────────────  COPY-READY TEMPLATE  ────────────
  <!-- Legacy format (still supported) -->
  <lsp_get_selection_range>{"textDocument":{"uri":"file:///path/to/file.ts"},"position":{"line":10,"character":5}}</lsp_get_selection_range>
  
  <!-- New format with position -->
  <lsp_get_selection_range>{"uri":"file:///path/to/file.ts","line":10,"character":5}</lsp_get_selection_range>
  
  <!-- New format with symbolName -->
  <lsp_get_selection_range>{"uri":"file:///path/to/file.ts","symbolName":"functionName"}</lsp_get_selection_range>
  
  <!-- Note: Either "textDocument"/"position" OR "uri" with "line"/"character" OR "uri" with "symbolName" are REQUIRED. -->
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_get_selection_range> tag.

**Legacy Format (still supported):**
-   "textDocument" (object, REQUIRED): The document to analyze.
    -   "uri" (string, REQUIRED): URI of the document (must be an absolute file URI).
-   "position" (object, REQUIRED): The position to get selection ranges for.
    -   "line" (number, REQUIRED): Zero-based line number.
    -   "character" (number, REQUIRED): Zero-based character position.

**New Unified Format:**
-   "uri" (string, REQUIRED): URI of the document (must be an absolute file URI).
-   "line" (number, OPTIONAL): Zero-based line number for position-based lookup.
-   "character" (number, OPTIONAL): Zero-based character position for position-based lookup.
-   "symbolName" (string, OPTIONAL): Name of the symbol to find and get selection ranges for.

**Note:** You must provide either:
- Both "line" and "character" for position-based lookup, OR
- "symbolName" for name-based symbol lookup

### Practical Examples:

1.  **Get selection hierarchy for a JavaScript function parameter:**
    \`\`\`xml
    <lsp_get_selection_range>{"textDocument":{"uri":"file:///src/utils/validator.js"},"position":{"line":15,"character":22}}</lsp_get_selection_range>
    \`\`\`
    *(Position on parameter name to get: parameter -> parameter list -> function signature -> function body -> entire function)*

2.  **Analyze a Python method call chain:**
    \`\`\`xml
    <lsp_get_selection_range>{"textDocument":{"uri":"file:///src/data_processor.py"},"position":{"line":67,"character":35}}</lsp_get_selection_range>
    \`\`\`
    *(Position on method name in chain to get: method -> method call -> statement -> block -> function)*

3.  **Get ranges for a TypeScript property access:**
    \`\`\`xml
    <lsp_get_selection_range>{"textDocument":{"uri":"file:///src/models/User.ts"},"position":{"line":89,"character":12}}</lsp_get_selection_range>
    \`\`\`
    *(Position on property to get: property -> member access -> assignment -> statement -> method body)*

4.  **Analyze a Go struct field inside a function:**
    \`\`\`xml
    <lsp_get_selection_range>{"textDocument":{"uri":"file:///src/main.go"},"position":{"line":42,"character":18}}</lsp_get_selection_range>
    \`\`\`
    *(Position on field name to get: field -> struct access -> statement -> block -> function)*

5.  **Get hierarchy for a Java annotation parameter:**
    \`\`\`xml
    <lsp_get_selection_range>{"textDocument":{"uri":"file:///src/main/java/UserController.java"},"position":{"line":28,"character":45}}</lsp_get_selection_range>
    \`\`\`
    *(Position on annotation parameter to get: parameter -> annotation -> method declaration -> class body)*

6.  **Analyze a C# LINQ expression:**
    \`\`\`xml
    <lsp_get_selection_range>{"textDocument":{"uri":"file:///Services/DataService.cs"},"position":{"line":156,"character":28}}</lsp_get_selection_range>
    \`\`\`
    *(Position on lambda parameter to get: parameter -> lambda -> LINQ method -> statement -> method body)*

7.  **Get selection hierarchy for a function by name:**
    \`\`\`xml
    <lsp_get_selection_range>{"uri":"file:///src/utils/validator.js","symbolName":"validateEmail"}</lsp_get_selection_range>
    \`\`\`
    *(Find function by name to get: function name -> function signature -> function body -> entire function)*

8.  **Analyze a TypeScript class method by name:**
    \`\`\`xml
    <lsp_get_selection_range>{"uri":"file:///src/models/User.ts","symbolName":"updateProfile"}</lsp_get_selection_range>
    \`\`\`
    *(Find method by name to get: method name -> method signature -> method body -> class body)*

9.  **Get ranges for a Python class by name:**
    \`\`\`xml
    <lsp_get_selection_range>{"uri":"file:///src/data_processor.py","symbolName":"DataProcessor"}</lsp_get_selection_range>
    \`\`\`
    *(Find class by name to get: class name -> class signature -> class body -> entire class)*

### Common Selection Hierarchy Patterns:

**Object-Oriented Languages (Java, C#, TypeScript):**
1. Property/Field name
2. Member access expression  
3. Statement/Assignment
4. Method/Constructor body
5. Class declaration
6. Namespace/Module

**Functional Programming (JavaScript, Python):**
1. Variable/Parameter name
2. Function call expression
3. Statement/Expression
4. Function body
5. Module/File scope

**Procedural Languages (Go, C):**
1. Variable/Field name
2. Expression/Operation
3. Statement
4. Block/Scope
5. Function definition
6. Package/File scope

### Advanced Use Cases:

**Extract Method Refactoring:**
\`\`\`javascript
// Use selection range to find complete statement block
const ranges = getSelectionRange(position);
const statementBlock = findBlockRange(ranges);
const extractedMethod = createMethodFromRange(statementBlock);
\`\`\`

**Smart Code Folding:**
\`\`\`javascript
// Identify foldable regions based on semantic structure
const ranges = getSelectionRange(position);
const foldableRegions = ranges.filter(range => 
  isFoldableBlock(range) && range.length > minFoldSize
);
\`\`\`

**Scope-Aware Editing:**
\`\`\`javascript
// Select entire function for modification
const ranges = getSelectionRange(cursorPosition);
const functionRange = ranges.find(r => r.semanticType === 'function');
selectRange(functionRange);
\`\`\`
────────────────────────────────────────────────────────────────────────────
`
}
