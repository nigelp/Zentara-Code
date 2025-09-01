import { ToolArgs } from "../types"

export function getGetTypeHierarchyToolDescription(args: ToolArgs): string {
	return `## lsp_get_type_hierarchy – Explores the inheritance hierarchy of a class or type.

Description:
The "lsp_get_type_hierarchy" tool leverages Language Server Protocol (LSP) capabilities to provide comprehensive type hierarchy information for classes, interfaces, and types. This tool reveals both inheritance relationships (supertypes) and implementation relationships (subtypes), offering a complete view of type relationships that manual searching cannot provide.

### When This Operation Is Most Beneficial:

**Object-Oriented Design Analysis:**
- Understanding complex inheritance hierarchies in large codebases
- Analyzing design patterns like Strategy, Template Method, or Factory patterns
- Exploring framework class hierarchies and extension points
- Investigating third-party library type structures

**Refactoring & Architecture Planning:**
- Impact analysis before modifying base classes or interfaces
- Identifying all implementations before changing interface contracts
- Planning class hierarchy restructuring and simplification
- Analyzing coupling and dependencies between types

**Code Understanding & Documentation:**
- Learning unfamiliar codebases with complex type relationships
- Understanding polymorphic behavior and method resolution
- Documenting architectural decisions and type relationships
- Onboarding new team members to complex type systems

**Quality Assurance & Compliance:**
- Verifying that all subtypes properly implement required interfaces
- Ensuring consistent behavior across inheritance hierarchies
- Validating architectural constraints and design principles
- Checking for proper use of abstract classes and interfaces

### Specific Scenarios Where It Should Be Used:

1. **Framework Extension**: Understanding how to properly extend framework base classes
2. **Plugin Architecture**: Analyzing plugin interfaces and their implementations
3. **Design Pattern Implementation**: Verifying correct implementation of OOP design patterns
4. **API Evolution**: Understanding impact of interface changes on implementations
5. **Code Migration**: Planning type system migrations between versions
6. **Performance Analysis**: Identifying inheritance chains that might impact performance

### How It Helps Developers:

- **Prevents Breaking Changes**: See all affected types before making modifications
- **Improves Design Decisions**: Better understanding of existing type relationships
- **Reduces Debugging Time**: Understand polymorphic behavior and method resolution
- **Facilitates Code Reuse**: Identify opportunities for abstraction and generalization
- **Enhances Maintainability**: Make informed decisions about type system evolution

### Return Value:
The tool returns a single 'TypeHierarchyItem' object representing the initial class or type. The real power comes from the 'supertypes' and 'subtypes' arrays, which contain other 'TypeHierarchyItem' objects, allowing for recursive exploration of the entire inheritance tree.

A 'TypeHierarchyItem' object has the following structure:
- **name** (string): The name of the class or type.
- **kind** (number): The kind of symbol (e.g., class, interface).
- **uri** (string): The URI of the file where the type is defined.
- **range** (object): The range of the entire type definition.
- **selectionRange** (object): The range of the type's name for precise selection.
- **detail** (string, optional): Additional details, like the library it comes from.
- **supertypes** (array): An array of 'TypeHierarchyItem' objects representing the parent classes/interfaces.
- **subtypes** (array): An array of 'TypeHierarchyItem' objects representing the child classes.

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_get_type_hierarchy> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_get_type_hierarchy> tag.
3️⃣ The JSON object MUST contain "uri" and either position ("line"/"character") OR "symbolName" keys (FLATTENED, not nested).
4️⃣ Ensure the <lsp_get_type_hierarchy> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string (e.g., missing quotes around keys, trailing commas)
• Missing required "uri" key or both position and symbolName parameters
• Incorrect file path for the "uri" value (must be absolute file URI)
• Invalid line/character positions (negative numbers or out of bounds)
• Using relative paths instead of absolute file URIs
• Pointing to variables or method calls instead of type/class declarations
• Positioning on whitespace, comments, or non-type elements

────────────  COPY-READY TEMPLATES  ────────────
Position-based: <lsp_get_type_hierarchy>{"uri":"file:///absolute/path/to/file.ts","line":10,"character":5}</lsp_get_type_hierarchy>
Name-based: <lsp_get_type_hierarchy>{"uri":"file:///absolute/path/to/file.ts","symbolName":"ClassName"}</lsp_get_type_hierarchy>
Legacy format: <lsp_get_type_hierarchy>{"textDocument":{"uri":"file:///path/to/file.ts"},"position":{"line":10,"character":5}}</lsp_get_type_hierarchy>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_get_type_hierarchy> tag.

**⚠️ IMPORTANT: Supports both FLATTENED format (recommended) and legacy nested format for backward compatibility**

**Required Parameters (Flattened Format):**
-   "uri" (string, REQUIRED): Absolute file URI of the document (e.g., "file:///absolute/path/to/file.ts").

**Position-based Lookup Parameters (optional):**
-   "line" (number, OPTIONAL): 0-based line number where the type is located (first line is 0).
-   "character" (number, OPTIONAL): 0-based character position within the line where the type is located (first character is 0).

**Name-based Lookup Parameter (optional):**
-   "symbolName" (string, OPTIONAL): The name of the class, interface, or type to analyze (e.g., "MyClass", "UserInterface", "TypeAlias").

**Note**: Either position parameters ('line' and 'character') OR 'symbolName' must be provided.

**Legacy Parameters (for backward compatibility):**
-   "textDocument" (object): The document containing the class or type.
    -   "uri" (string): URI of the document.
-   "position" (object): The position of the type's name.
    -   "line" (number): 0-based line number.
    -   "character" (number): 0-based character position.

**Parameter Notes:**
- Line numbers are 0-based (first line is 0, not 1)
- Character positions are 0-based (first character is 0)
- The URI must be an absolute file path with "file://" prefix
- Position must point to a valid type declaration (class name, interface name, etc.)
- When using symbolName, the tool will find the first matching type in the file
- Flattened format is recommended for new implementations

### Practical Examples:

1.  **Analyze a Java class hierarchy (by name):**
    \`\`\`xml
    <lsp_get_type_hierarchy>{"uri":"file:///src/main/java/com/example/UserService.java","symbolName":"UserService"}</lsp_get_type_hierarchy>
    \`\`\`
    *(Find and analyze the UserService class to see its parent classes and all implementations)*

2.  **Analyze a Java class hierarchy (by position):**
    \`\`\`xml
    <lsp_get_type_hierarchy>{"uri":"file:///src/main/java/com/example/UserService.java","line":22,"character":13}</lsp_get_type_hierarchy>
    \`\`\`
    *(Position on class name UserService to see its parent classes and all implementations)*

3.  **Examine a TypeScript interface hierarchy (by name):**
    \`\`\`xml
    <lsp_get_type_hierarchy>{"uri":"file:///src/types/Drawable.ts","symbolName":"Drawable"}</lsp_get_type_hierarchy>
    \`\`\`
    *(Find and investigate the Drawable interface to see all extending interfaces and implementing classes)*

4.  **Explore a Python class inheritance (by name):**
    \`\`\`xml
    <lsp_get_type_hierarchy>{"uri":"file:///src/models/BaseModel.py","symbolName":"BaseModel"}</lsp_get_type_hierarchy>
    \`\`\`
    *(Find and understand the BaseModel class hierarchy and all its subclasses)*

5.  **Investigate a C# abstract class (by name):**
    \`\`\`xml
    <lsp_get_type_hierarchy>{"uri":"file:///src/Services/AbstractRepository.cs","symbolName":"AbstractRepository"}</lsp_get_type_hierarchy>
    \`\`\`
    *(Analyze the AbstractRepository class and all its concrete implementations)*

6.  **Examine a C++ class template (legacy format):**
    \`\`\`xml
    <lsp_get_type_hierarchy>{"textDocument":{"uri":"file:///src/containers/Container.hpp"},"position":{"line":66,"character":11}}</lsp_get_type_hierarchy>
    \`\`\`
    *(Explore the Container template class and its specializations)*

7.  **Analyze a Rust trait hierarchy (by name):**
    \`\`\`xml
    <lsp_get_type_hierarchy>{"uri":"file:///src/traits/Serializable.rs","symbolName":"Serializable"}</lsp_get_type_hierarchy>
    \`\`\`
    *(Investigate the Serializable trait and all implementing types)*

### Common Patterns & Best Practices:

**Pattern 1: Framework Extension Analysis**
- Use on framework base classes to understand extension points
- Identify proper inheritance patterns for plugin development
- Ensure compliance with framework design principles

**Pattern 2: Design Pattern Verification**
- Verify Strategy pattern implementations by analyzing strategy interfaces
- Check Template Method pattern by examining abstract base classes
- Validate Factory patterns by investigating product hierarchies

**Pattern 3: API Evolution Planning**
- Before modifying interfaces, check all implementing classes
- Understand impact scope of breaking changes
- Plan backward compatibility strategies

**Pattern 4: Polymorphism Analysis**
- Understand method resolution order in complex hierarchies
- Identify potential conflicts in multiple inheritance scenarios
- Verify interface segregation principle compliance

### Error Prevention & Troubleshooting:

**Common Positioning Mistakes:**
- Point to the class/interface name, not the keyword (class, interface)
- Avoid positioning on constructor methods or instance variables
- Ensure cursor is on the type declaration, not usage

**Language-Specific Considerations:**
- **Java**: Position on class name after class keyword or interface name after interface keyword
- **TypeScript**: Can work on classes, interfaces, and type aliases
- **Python**: Position on class name in class definition
- **C#**: Works with classes, interfaces, structs, and records
- **C++**: Position on class name in class declaration
────────────────────────────────────────────────────────────────────────────
`
}
