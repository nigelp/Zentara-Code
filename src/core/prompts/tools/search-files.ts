import { ToolArgs } from "./types"

export function getSearchFilesDescription(args: ToolArgs): string {
	return `## search_files
Description: Request to perform a regex search across files in a specified directory, providing context-rich results. This tool searches for patterns or specific content across multiple files, displaying each match with encapsulating context.

────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <search_files> tag.
2️⃣ Provide all parameters as a single, well-formed JSON object string as the text content of the <search_files> tag.
3️⃣ The JSON object MUST contain a "pattern" key with the regex pattern to search for.
4️⃣ Optionally, include other parameters like "path", "output_mode", "glob", "type", context options, etc.
5️⃣ Ensure the <search_files> tag is correctly closed.

⚠️ **Common Breakers**
• Malformed JSON string (e.g., missing quotes around keys, trailing commas).
• Missing "pattern" key in the JSON object.
• Invalid regex pattern that causes search to fail.
• Unclosed <search_files> tag.

────────────  COPY-READY TEMPLATES  ────────────
Basic search: <search_files>{"pattern": "YOUR_REGEX_PATTERN", "path": "src", "output_mode": "content"}</search_files>

Advanced search: <search_files>{"pattern": "function\\\\s+\\\\w+", "path": ".", "output_mode": "content", "glob": "*.{js,ts}", "-n": true, "-C": 3, "head_limit": 100}</search_files>

File matching only: <search_files>{"pattern": "TODO", "output_mode": "files_with_matches"}</search_files>
───────────────────────────────────────────────

### Parameters:
All parameters are provided as key-value pairs within a single JSON object, which is the text content of the <search_files> tag.

**Required Parameters:**
- "pattern" (string, REQUIRED): The regular expression pattern to search for in file contents. Uses Rust regex syntax.
  - Example: \`"pattern": "function\\\\s+\\\\w+"\`

**Optional Parameters:**
- "path" (string, optional): File or directory to search in (relative to the current workspace directory ${args.cwd}). Defaults to current working directory (".").
  - Example: \`"path": "src/components"\`

- "output_mode" (string, optional): Output mode for results. Defaults to "files_with_matches".
  - "content" - Shows matching lines with optional context
  - "files_with_matches" - Shows only file paths containing matches
  - "count" - Shows match counts per file
  - Example: \`"output_mode": "content"\`

- "glob" (string, optional): Glob pattern to filter files (e.g., "*.js", "*.{ts,tsx}").
  - Example: \`"glob": "*.{js,ts,jsx,tsx}"\`

- "type" (string, optional): File type to search. More efficient than glob for standard file types.
  - Common types: js, ts, py, java, go, rust, cpp, c, html, css, json, yaml, xml, md
  - Example: \`"type": "js"\`

- "-i" (boolean, optional): Case insensitive search. Default: false.
  - Example: \`"-i": true\`

- "-n" (boolean, optional): Show line numbers in output. Requires output_mode: "content", ignored otherwise.
  - Example: \`"-n": true\`

- "-A" (number, optional): Number of lines to show after each match. Requires output_mode: "content", ignored otherwise.
  - Example: \`"-A": 3\`

- "-B" (number, optional): Number of lines to show before each match. Requires output_mode: "content", ignored otherwise.
  - Example: \`"-B": 2\`

- "-C" (number, optional): Number of lines to show before and after each match. Requires output_mode: "content", ignored otherwise.
  - Example: \`"-C": 5\`

- "multiline" (boolean, optional): Enable multiline mode where . matches newlines and patterns can span lines. Default: false.
  - Example: \`"multiline": true\`

- "head_limit" (number, optional): Limit output to first N lines/entries. Works across all output modes. Defaults to 100 if not specified. Maximum allowed value is 100 (values above 100 will be automatically capped).
  - Example: \`"head_limit": 50\`

### Examples:

1. **Basic search for TODO comments:**
   \`\`\`xml
   <search_files>{"pattern": "TODO"}</search_files>
   \`\`\`

2. **Search with content output and line numbers:**
   \`\`\`xml
   <search_files>{"pattern": "function\\\\s+\\\\w+", "output_mode": "content", "-n": true}</search_files>
   \`\`\`

3. **Case-insensitive search in specific directory:**
   \`\`\`xml
   <search_files>{"pattern": "error", "path": "src/components", "-i": true, "output_mode": "content"}</search_files>
   \`\`\`

4. **Search TypeScript files with context:**
   \`\`\`xml
   <search_files>{"pattern": "interface\\\\s+\\\\w+", "type": "ts", "output_mode": "content", "-n": true, "-C": 3}</search_files>
   \`\`\`

5. **Search with glob pattern and limit results:**
   \`\`\`xml
   <search_files>{"pattern": "console\\\\.log", "glob": "*.{js,ts}", "output_mode": "content", "head_limit": 10}</search_files>
   \`\`\`

6. **Multiline search for React components:**
   \`\`\`xml
   <search_files>{"pattern": "<\\\\w+[\\\\s\\\\S]*?>", "multiline": true, "glob": "*.{jsx,tsx}", "output_mode": "content"}</search_files>
   \`\`\`

7. **Count matches in Python files:**
   \`\`\`xml
   <search_files>{"pattern": "def\\\\s+\\\\w+", "type": "py", "output_mode": "count"}</search_files>
   \`\`\`

8. **Search with before/after context:**
   \`\`\`xml
   <search_files>{"pattern": "throw\\\\s+new\\\\s+Error", "output_mode": "content", "-B": 2, "-A": 5, "-n": true}</search_files>
   \`\`\`

### Pattern Syntax:
Uses Rust regex syntax (similar to PCRE):
- Basic patterns: \`error\`, \`TODO\`, \`function\`
- Character classes: \`[a-z]\`, \`[0-9]\`, \`[A-Za-z0-9_]\`
- Quantifiers: \`*\` (0+), \`+\` (1+), \`?\` (0-1), \`{n,m}\`
- Anchors: \`^\` (line start), \`$\` (line end)
- Word boundaries: \`\\\\b\`
- Escape special chars: \`\\\\{\`, \`\\\\}\`, \`\\\\[\`, \`\\\\]\`, \`\\\\(\`, \`\\\\)\`, \`\\\\.\`, \`\\\\*\`, etc.

### Common Search Patterns:
- Function definitions: \`"(function|const|let)\\\\s+\\\\w+\\\\s*="\`
- Import statements: \`"import.*from\\\\s+['\\\"]"\`
- Error patterns: \`"(error|Error|ERROR|exception|Exception)"\`
- TODO comments: \`"(TODO|FIXME|HACK|XXX|BUG):"\`
- Class definitions: \`"class\\\\s+\\\\w+"\`

### Best Practices:
1. Use specific patterns for faster and more accurate results
2. Filter by file type when possible for better performance
3. Start with "files_with_matches" to find relevant files first
4. Add context (-C/-A/-B) only when needed to understand matches
5. Escape regex metacharacters properly
6. Use multiline mode only when pattern spans lines
7. Use head_limit to control output size (defaults to 100, max 100)

Usage:
<search_files>
Your JSON parameters here
</search_files>`
}
