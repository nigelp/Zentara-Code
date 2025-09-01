import { ToolArgs } from "../types"

export function getFindImplementationsToolDescription(args: ToolArgs): string {
	return `## lsp_find_implementations – Finds all concrete implementations of an interface or abstract class.

Description:
This tool leverages Language Server Protocol (LSP) capabilities to find all concrete implementations of an interface or abstract class using semantic analysis.
It's vastly superior to text searches as it understands code semantics, inheritance relationships, and type information across the entire codebase.

### When to Use This Tool:

**🎯 Primary Use Cases:**
- **Understanding Polymorphic Behavior**: When analyzing code that uses interfaces or abstract classes, discover all possible runtime implementations
- **Inheritance Analysis**: Map out complete inheritance hierarchies and implementation chains
- **API Contract Verification**: Ensure all required implementations exist and are properly structured
- **Safe Refactoring**: Before modifying interfaces/abstract classes, identify all affected implementations
- **Architecture Review**: Understand the full scope of abstraction usage in codebases

**🔍 Specific Scenarios:**
- Debugging polymorphic method calls where you need to see all possible implementations
- Code review of new interfaces to understand adoption patterns
- Migration planning when updating abstract base classes
- Performance analysis of virtual method dispatch
- Documentation generation for API contracts

**💡 Developer Workflow Benefits:**
- **Token Efficiency**: Avoid reading multiple files to manually search for implementations
- **Semantic Accuracy**: Get precise results based on actual type relationships, not just text matching
- **Cross-Language Support**: Works with any language that has LSP support (TypeScript, Python, Java, C#, etc.)
- **Real-time Results**: Leverages IDE-level analysis for up-to-date implementation discovery

### Return Value:
The tool returns a JSON array of 'Location' objects, where each object represents a single implementation of the symbol. An empty array indicates the interface or abstract class has no implementations in the codebase.

A 'Location' object has the following structure:
- **uri** (string): The absolute URI of the file where the implementation was found.
- **range** (object): An object defining the precise location of the implementation's declaration.
  - **start** (object): The starting position.
    - **line** (number): The 0-based line number.
    - **character** (number): The 0-based character position.
  - **end** (object): The ending position.
    - **line** (number): The 0-based line number.
    - **character** (number): The 0-based character position.
- **preview** (string): A string containing the full line of code where the implementation is declared (e.g., \`class MyService implements IService\`). This provides immediate context for each implementation.

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_find_implementations> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_find_implementations> tag.
3️⃣ The JSON object MUST contain "uri" and either position ("line"/"character") OR "symbolName" keys (FLATTENED, not nested).
4️⃣ Position your cursor on the interface/abstract class name, not on implementing classes.
5️⃣ Ensure the <lsp_find_implementations> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string (e.g., missing quotes around keys, trailing commas)
• Missing required "uri" key or both position and symbolName parameters
• Incorrect file path for the "uri" value (must be absolute file URI)
• Invalid line/character positions (negative numbers or out of bounds)
• Using relative paths instead of absolute file URIs
• Positioning cursor on implementation rather than interface/abstract class

────────────  COPY-READY TEMPLATES  ────────────
Position-based: <lsp_find_implementations>{"uri":"file:///absolute/path/to/file.ts","line":10,"character":5}</lsp_find_implementations>
Name-based: <lsp_find_implementations>{"uri":"file:///absolute/path/to/file.ts","symbolName":"IUserService"}</lsp_find_implementations>
  <!-- Note: Position cursor on interface/abstract class name for best results -->
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_find_implementations> tag.

**⚠️ IMPORTANT: All parameters are FLATTENED (not nested in textDocument/position objects)**

**Required Parameters:**
-   "uri" (string, REQUIRED): Absolute file URI of the document (e.g., "file:///absolute/path/to/file.ts").

**Position-based Lookup Parameters (optional):**
-   "line" (number, OPTIONAL): 0-based line number where the interface/abstract class is located (first line is 0).
-   "character" (number, OPTIONAL): 0-based character position within the line where the interface/abstract class is located (first character is 0).

**Name-based Lookup Parameter (optional):**
-   "symbolName" (string, OPTIONAL): The name of the interface or abstract class to find implementations for (e.g., "IUserService", "BaseRepository", "AbstractProcessor").

**Note**: Either position parameters ('line' and 'character') OR 'symbolName' must be provided.

### Examples:

1.  **Find all classes implementing 'IUserService' interface in TypeScript (by name):**
    \`\`\`xml
    <lsp_find_implementations>{"uri":"file:///src/interfaces/IUserService.ts","symbolName":"IUserService"}</lsp_find_implementations>
    \`\`\`
    *Use case: Understanding all possible user service implementations for dependency injection*

2.  **Find implementations of interface at specific position:**
    \`\`\`xml
    <lsp_find_implementations>{"uri":"file:///src/interfaces/IUserService.ts","line":2,"character":17}</lsp_find_implementations>
    \`\`\`
    *Use case: Position-based lookup when you know exact location*

3.  **Find implementations of abstract class 'BaseRepository' in Python:**
    \`\`\`xml
    <lsp_find_implementations>{"uri":"file:///src/repositories/base.py","symbolName":"BaseRepository"}</lsp_find_implementations>
    \`\`\`
    *Use case: Reviewing all repository implementations before adding new abstract methods*

4.  **Find all implementations of 'Runnable' interface in Java:**
    \`\`\`xml
    <lsp_find_implementations>{"uri":"file:///src/main/java/interfaces/Runnable.java","symbolName":"Runnable"}</lsp_find_implementations>
    \`\`\`
    *Use case: Understanding threading patterns and task implementations*

5.  **Find implementations of C# interface 'IPaymentProcessor':**
    \`\`\`xml
    <lsp_find_implementations>{"uri":"file:///Services/IPaymentProcessor.cs","symbolName":"IPaymentProcessor"}</lsp_find_implementations>
    \`\`\`
    *Use case: Payment system analysis and testing strategy development*

6.  **Find React component implementations extending base component:**
    \`\`\`xml
    <lsp_find_implementations>{"uri":"file:///components/base/BaseButton.tsx","symbolName":"BaseButton"}</lsp_find_implementations>
    \`\`\`
    *Use case: Component library maintenance and consistency checking*
### Error Prevention & Troubleshooting:

**❌ Critical Errors to Avoid:**

1.  **Wrong symbol positioning - targeting implementation instead of interface:**
    \`\`\`xml
    <!-- WRONG: Cursor on implementing class -->
    <lsp_find_implementations>{"uri":"file:///UserServiceImpl.ts","line":5,"character":6}</lsp_find_implementations>
    \`\`\`
    *Correction: Position cursor on the interface/abstract class name, not its implementations.*

2.  **Invalid URI format:**
    \`\`\`xml
    <!-- WRONG: Relative path -->
    <lsp_find_implementations>{"uri":"src/IService.ts","symbolName":"IService"}</lsp_find_implementations>
    \`\`\`
    *Correction: Use absolute URI starting with "file:///"*

3.  **Missing required parameters:**
    \`\`\`xml
    <!-- WRONG: Missing both position and symbolName -->
    <lsp_find_implementations>{"uri":"file:///path.ts"}</lsp_find_implementations>
    \`\`\`
    *Correction: Provide either 'line'/'character' or 'symbolName' parameter.*

4.  **Malformed JSON:**
    \`\`\`xml
    <!-- WRONG: Missing comma -->
    <lsp_find_implementations>{"uri":"file:///path.ts" "symbolName":"IService"}</lsp_find_implementations>
    \`\`\`
    *Correction: Ensure proper JSON formatting with commas between properties.*

**🔧 Best Practices:**
- Position cursor directly on interface/abstract class identifier
- Use absolute file paths for reliable results
- Verify the symbol actually is an interface or abstract class
- Check LSP server capabilities for your programming language
- Consider that results may be empty if no implementations exist

**🌍 Language-Specific Tips:**
- **TypeScript/JavaScript**: Works with interfaces, abstract classes, and type definitions
- **Python**: Effective with ABC (Abstract Base Classes) and Protocol classes
- **Java**: Excellent with interfaces and abstract classes
- **C#**: Supports interfaces, abstract classes, and partial classes
- **Go**: Works with interface types
- **Rust**: Effective with trait definitions
────────────────────────────────────────────────────────────────────────────
`
}
