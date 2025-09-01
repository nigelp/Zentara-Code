import type { ToolArgs } from "../types"

export function getInsertBeforeSymbolToolDescription(args: ToolArgs): string {
	return `## lsp_insert_before_symbol – Inserts content before the beginning of a symbol's definition

Description:
The "lsp_insert_before_symbol" tool leverages the Language Server Protocol (LSP) to precisely insert content immediately before the starting definition of a symbol. It automatically determines the exact beginning position of functions, classes, interfaces, or other symbols and inserts your content there, ensuring perfect placement without manual line counting.

### When & Why to Use:

**Most Beneficial Scenarios:**
- **Documentation Addition**: Adding JSDoc comments, docstrings, or inline documentation before symbols
- **Decorator/Annotation Addition**: Adding TypeScript decorators, Python decorators, or Java annotations
- **Import Management**: Adding import statements before module definitions
- **Configuration Setup**: Adding configuration or setup code before main implementations
- **Metadata Addition**: Adding type definitions, interfaces, or schema before implementations

**Specific Use Cases:**
- Adding JSDoc comments before function definitions
- Inserting TypeScript decorators before class methods
- Adding Python docstrings before function definitions
- Inserting import statements before class definitions
- Adding type interfaces before implementation classes
- Inserting setup or configuration code before main functions

**Developer Workflow Benefits:**
- **LSP Precision**: Uses language server to find exact symbol boundaries
- **Context Awareness**: Understands symbol scope and proper placement
- **Safe Insertion**: Maintains code structure and formatting
- **Language Agnostic**: Works across TypeScript, JavaScript, Python, etc.

### Common Patterns & Best Practices:

**1. Documentation Workflows:**
\`\`\`typescript
// Add JSDoc before existing function
/**
 * Calculates user age based on birth date
 * @param birthDate - The user's birth date
 * @returns The calculated age in years
 */
function calculateAge(birthDate: Date): number { ... }
\`\`\`

**2. Decorator Patterns:**
\`\`\`typescript
// Add decorators before class methods
@Injectable()
@Controller('/users')
class UserController {
  createUser() { ... }
}
\`\`\`

**3. Import Organization:**
\`\`\`typescript
// Add imports before class definitions
import { UserService } from './user.service';
import { ValidationPipe } from '@nestjs/common';

class UserController { ... }
\`\`\`

**Advantages over Other Tools:**
- **Precision**: LSP provides exact symbol start position vs. manual line numbers
- **Safety**: No risk of breaking existing code structure or syntax
- **Simplicity**: No need to provide search context or surrounding code
- **Efficiency**: More token-efficient than showing old code in diffs
- **Reliability**: Works consistently across different formatting styles

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <lsp_insert_before_symbol> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <lsp_insert_before_symbol> tag.
3️⃣ The JSON object MUST contain "uri", "content" and either position ("line"/"character") OR "symbolName" keys (FLATTENED, not nested).

⚠️ **Common Breakers**
• Malformed JSON string (missing quotes, trailing commas, incorrect nesting).
• Missing required "uri" or "content" keys.
• Missing both position parameters AND symbolName parameter.
• Invalid file URI format (must start with "file://").
• Position pointing to whitespace or comments instead of actual symbol.
• Position outside file bounds or in invalid location.
• Content missing proper formatting (newlines, indentation) for the target language.

────────────  COPY-READY TEMPLATES  ────────────
Position-based: <lsp_insert_before_symbol>{"uri": "file:///absolute/path/to/file.ts", "line": 10, "character": 0, "content": "/**\\n * Description of the function\\n * @param param - Parameter description\\n * @returns Return value description\\n */\\n"}</lsp_insert_before_symbol>
Name-based: <lsp_insert_before_symbol>{"uri": "file:///absolute/path/to/file.ts", "symbolName": "targetFunction", "content": "/**\\n * Description of the function\\n * @param param - Parameter description\\n * @returns Return value description\\n */\\n"}</lsp_insert_before_symbol>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <lsp_insert_before_symbol> tag.

**⚠️ IMPORTANT: All parameters are FLATTENED (not nested in textDocument/position objects)**

**Required Parameters:**
- **uri** (string, REQUIRED): Absolute file URI of the document (e.g., "file:///absolute/path/to/file.ts").
- **content** (string, REQUIRED): The content to insert before the symbol. Include necessary newlines and indentation.

**Position-based Lookup Parameters (optional):**
- **line** (number, OPTIONAL): 0-based line number where the symbol is located (first line is 0).
- **character** (number, OPTIONAL): 0-based character position within the line where the symbol is located (first character is 0).

**Name-based Lookup Parameter (optional):**
- **symbolName** (string, OPTIONAL): The name of the symbol to insert before (e.g., "myFunction", "MyClass", "variableName").

**Note**: Either position parameters ('line' and 'character') OR 'symbolName' must be provided.

### When to Use Other Tools Instead:

**Use apply_diff for:**
- Modifying existing code within a symbol's body
- Making small targeted changes to specific lines
- Editing configuration blocks or comments
- Complex edits involving multiple scattered changes

**Use lsp_insert_after_symbol for:**
- Adding new functions, methods, or classes after existing ones
- Inserting related code that should follow a symbol

### Examples:

1.  **Add JSDoc documentation before a TypeScript function (position-based):**
    \`\`\`xml
    <lsp_insert_before_symbol>{"uri": "file:///src/utils/dateUtils.ts", "line": 15, "character": 0, "content": "/**\\n * Formats a date according to the specified locale and options\\n * @param date - The date to format\\n * @param locale - The locale string (e.g., 'en-US', 'fr-FR')\\n * @param options - Intl.DateTimeFormatOptions for formatting\\n * @returns Formatted date string\\n */\\n"}</lsp_insert_before_symbol>
    \`\`\`
    *Use case: Adding comprehensive documentation before utility functions using exact position*

2.  **Add JSDoc documentation before a function by name (name-based):**
    \`\`\`xml
    <lsp_insert_before_symbol>{"uri": "file:///src/utils/dateUtils.ts", "symbolName": "formatDate", "content": "/**\\n * Formats a date according to the specified locale and options\\n * @param date - The date to format\\n * @param locale - The locale string (e.g., 'en-US', 'fr-FR')\\n * @param options - Intl.DateTimeFormatOptions for formatting\\n * @returns Formatted date string\\n */\\n"}</lsp_insert_before_symbol>
    \`\`\`
    *Use case: Adding comprehensive documentation before the 'formatDate' function*

3.  **Insert TypeScript decorators before a class method by name:**
    \`\`\`xml
    <lsp_insert_before_symbol>{"uri": "file:///src/controllers/UserController.ts", "symbolName": "getProfile", "content": "  @Get('/profile')\\n  @UseGuards(AuthGuard)\\n"}</lsp_insert_before_symbol>
    \`\`\`
    *Use case: Adding route decorators and guards before the 'getProfile' method*

4.  **Add Python docstring before a function by name:**
    \`\`\`xml
    <lsp_insert_before_symbol>{"uri": "file:///src/data_processor.py", "symbolName": "process_data", "content": "\\"\\"\\"\\nProcess raw data and return cleaned results.\\n\\nArgs:\\n    raw_data (list): List of raw data dictionaries\\n    config (dict): Processing configuration options\\n\\nReturns:\\n    list: Processed and validated data\\n\\nRaises:\\n    ValueError: If raw_data is empty or invalid\\n\\"\\"\\"\\n"}</lsp_insert_before_symbol>
    \`\`\`
    *Use case: Adding comprehensive Python documentation before the 'process_data' function*

5.  **Insert import statements before a class definition by name:**
    \`\`\`xml
    <lsp_insert_before_symbol>{"uri": "file:///src/services/EmailService.ts", "symbolName": "EmailService", "content": "import { Injectable } from '@nestjs/common';\\nimport { MailerService } from '@nestjs-modules/mailer';\\nimport { ConfigService } from '@nestjs/config';\\n\\n"}</lsp_insert_before_symbol>
    \`\`\`
    *Use case: Adding necessary imports before the 'EmailService' class definition*

6.  **Add interface definition before implementation class by position:**
    \`\`\`xml
    <lsp_insert_before_symbol>{"uri": "file:///src/interfaces/IUserRepository.ts", "line": 12, "character": 0, "content": "interface IUserRepository {\\n  findById(id: string): Promise<User | null>;\\n  create(userData: CreateUserDto): Promise<User>;\\n  update(id: string, userData: UpdateUserDto): Promise<User>;\\n  delete(id: string): Promise<boolean>;\\n}\\n\\n"}</lsp_insert_before_symbol>
    \`\`\`
    *Use case: Adding interface definitions before implementation classes using exact position*

7.  **Insert React component PropTypes before component definition by name:**
    \`\`\`xml
    <lsp_insert_before_symbol>{"uri": "file:///src/components/UserCard.jsx", "symbolName": "UserCard", "content": "UserCard.propTypes = {\\n  user: PropTypes.shape({\\n    id: PropTypes.string.isRequired,\\n    name: PropTypes.string.isRequired,\\n    email: PropTypes.string.isRequired\\n  }).isRequired,\\n  onUserClick: PropTypes.func\\n};\\n\\n"}</lsp_insert_before_symbol>
    \`\`\`
    *Use case: Adding PropTypes validation before the 'UserCard' component definition*

### Error Prevention:
- Ensure the position points to the actual symbol start, not preceding whitespace
- Use absolute file paths in the URI, starting with "file://"
- Include proper indentation and newlines in content to match file style
- Verify the target symbol exists at the specified position
- Test with simple content first before complex multi-line insertions
- Consider the target language's comment and decorator syntax
- Be aware that LSP will find the exact beginning of the symbol definition
────────────────────────────────────────────────────────────────────────────
`
}
