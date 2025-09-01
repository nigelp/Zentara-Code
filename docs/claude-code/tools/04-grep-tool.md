# Grep Tool

## Original Function Definition

```json
{
  "description": "A powerful search tool built on ripgrep\n\n  Usage:\n  - ALWAYS use Grep for search tasks. NEVER invoke `grep` or `rg` as a Bash command. The Grep tool has been optimized for correct permissions and access.\n  - Supports full regex syntax (e.g., \"log.*Error\", \"function\\\\s+\\\\w+\")\n  - Filter files with glob parameter (e.g., \"*.js\", \"**/*.tsx\") or type parameter (e.g., \"js\", \"py\", \"rust\")\n  - Output modes: \"content\" shows matching lines, \"files_with_matches\" shows only file paths (default), \"count\" shows match counts\n  - Use Task tool for open-ended searches requiring multiple rounds\n  - Pattern syntax: Uses ripgrep (not grep) - literal braces need escaping (use `interface\\\\{\\\\}` to find `interface{}` in Go code)\n  - Multiline matching: By default patterns match within single lines only. For cross-line patterns like `struct \\\\{[\\\\s\\\\S]*?field`, use `multiline: true`\n",
  "name": "Grep",
  "parameters": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "properties": {
      "pattern": {
        "description": "The regular expression pattern to search for in file contents",
        "type": "string"
      },
      "path": {
        "description": "File or directory to search in (rg PATH). Defaults to current working directory.",
        "type": "string"
      },
      "output_mode": {
        "description": "Output mode: \"content\" shows matching lines (supports -A/-B/-C context, -n line numbers, head_limit), \"files_with_matches\" shows file paths (supports head_limit), \"count\" shows match counts (supports head_limit). Defaults to \"files_with_matches\".",
        "enum": ["content", "files_with_matches", "count"],
        "type": "string"
      },
      "glob": {
        "description": "Glob pattern to filter files (e.g. \"*.js\", \"*.{ts,tsx}\") - maps to rg --glob",
        "type": "string"
      },
      "type": {
        "description": "File type to search (rg --type). Common types: js, py, rust, go, java, etc. More efficient than include for standard file types.",
        "type": "string"
      },
      "-i": {
        "description": "Case insensitive search (rg -i)",
        "type": "boolean"
      },
      "-n": {
        "description": "Show line numbers in output (rg -n). Requires output_mode: \"content\", ignored otherwise.",
        "type": "boolean"
      },
      "-A": {
        "description": "Number of lines to show after each match (rg -A). Requires output_mode: \"content\", ignored otherwise.",
        "type": "number"
      },
      "-B": {
        "description": "Number of lines to show before each match (rg -B). Requires output_mode: \"content\", ignored otherwise.",
        "type": "number"
      },
      "-C": {
        "description": "Number of lines to show before and after each match (rg -C). Requires output_mode: \"content\", ignored otherwise.",
        "type": "number"
      },
      "multiline": {
        "description": "Enable multiline mode where . matches newlines and patterns can span lines (rg -U --multiline-dotall). Default: false.",
        "type": "boolean"
      },
      "head_limit": {
        "description": "Limit output to first N lines/entries, equivalent to \"| head -N\". Works across all output modes: content (limits output lines), files_with_matches (limits file paths), count (limits count entries). When unspecified, shows all results from ripgrep.",
        "type": "number"
      }
    },
    "required": ["pattern"],
    "type": "object"
  }
}
```

## Detailed Description

The Grep tool is a powerful search utility built on ripgrep (rg) that searches file contents using regular expressions. It's optimized for code search with support for various output modes, file filtering, and context display.

## Key Features

1. **Full regex support**: Uses Rust regex syntax (similar to PCRE)
2. **Multiple output modes**: File lists, content, or match counts
3. **Context lines**: Show surrounding lines with -A/-B/-C
4. **File filtering**: By glob pattern or file type
5. **Multiline patterns**: Search across line boundaries
6. **Performance**: Extremely fast, even on large codebases

## Pattern Syntax

### Basic Patterns
- Literal text: `error`, `TODO`
- Any character: `.` (except newline unless multiline mode)
- Character classes: `[a-z]`, `[0-9]`, `[A-Za-z0-9_]`
- Negated classes: `[^a-z]`
- Quantifiers: `*` (0+), `+` (1+), `?` (0-1), `{n,m}`
- Anchors: `^` (line start), `$` (line end)
- Word boundaries: `\b`

### Special Characters (need escaping)
- Literal braces: `\{`, `\}` (especially in Go: `interface\{\}`)
- Literal brackets: `\[`, `\]`
- Literal parentheses: `\(`, `\)`
- Other: `\.`, `\*`, `\+`, `\?`, `\|`, `\\`

### Common Patterns
```typescript
// Function definitions
"function\\s+\\w+"           // JavaScript functions
"def\\s+\\w+"               // Python functions
"func\\s+\\w+"              // Go functions

// Class definitions
"class\\s+\\w+"             // General classes
"export\\s+class\\s+\\w+"   // Exported classes

// Import statements
"import\\s+.*\\s+from"      // ES6 imports
"require\\(['\"].*['\"]\\)" // CommonJS requires

// TODOs and FIXMEs
"(TODO|FIXME|HACK|BUG):"    // Code comments

// Error patterns
"throw\\s+new\\s+Error"     // Thrown errors
"console\\.error"           // Error logging
```

## Output Modes

### files_with_matches (default)
Returns only file paths containing matches:
```typescript
await Grep({
  pattern: "TODO",
  output_mode: "files_with_matches"
})
// Returns: List of file paths
```

### content
Shows matching lines with optional context:
```typescript
await Grep({
  pattern: "error",
  output_mode: "content",
  "-n": true,  // Show line numbers
  "-C": 2      // 2 lines of context
})
// Returns: Matching lines with context
```

### count
Shows match counts per file:
```typescript
await Grep({
  pattern: "import",
  output_mode: "count"
})
// Returns: File paths with match counts
```

## Examples

### Basic Searches
```typescript
// Find all TODO comments
await Grep({
  pattern: "TODO"
})

// Case-insensitive search
await Grep({
  pattern: "error",
  "-i": true
})

// Search specific directory
await Grep({
  pattern: "useState",
  path: "/project/src/components"
})
```

### File Filtering
```typescript
// Search only JavaScript files
await Grep({
  pattern: "console\\.log",
  type: "js"
})

// Search TypeScript and TSX files
await Grep({
  pattern: "interface",
  glob: "*.{ts,tsx}"
})

// Exclude test files
await Grep({
  pattern: "export",
  glob: "!**/*.test.js"
})
```

### Context and Line Numbers
```typescript
// Show matches with line numbers and context
await Grep({
  pattern: "throw",
  output_mode: "content",
  "-n": true,
  "-C": 3  // 3 lines before and after
})

// Show only lines after match
await Grep({
  pattern: "function.*Error",
  output_mode: "content",
  "-A": 5  // 5 lines after
})
```

### Advanced Patterns
```typescript
// Find function definitions
await Grep({
  pattern: "(function|const|let|var)\\s+\\w+\\s*=\\s*(\\(|async)",
  output_mode: "content",
  "-n": true
})

// Find class methods
await Grep({
  pattern: "^\\s*(async\\s+)?\\w+\\s*\\([^)]*\\)\\s*\\{",
  output_mode: "content",
  type: "js"
})

// Find import statements
await Grep({
  pattern: "^import\\s+(\\{[^}]+\\}|\\w+)\\s+from\\s+['\"]",
  output_mode: "content"
})
```

### Multiline Patterns
```typescript
// Find multi-line function signatures
await Grep({
  pattern: "function\\s+\\w+\\s*\\([\\s\\S]*?\\)\\s*\\{",
  multiline: true,
  output_mode: "content"
})

// Find JSX components
await Grep({
  pattern: "<\\w+[\\s\\S]*?>",
  multiline: true,
  type: "jsx"
})
```

### Limiting Output
```typescript
// Find first 10 files with errors
await Grep({
  pattern: "error",
  head_limit: 10
})

// Show first 20 matching lines
await Grep({
  pattern: "import",
  output_mode: "content",
  head_limit: 20
})
```

## File Type Reference

Common file types for the `type` parameter:
- `js` - JavaScript
- `ts` - TypeScript
- `py` - Python
- `java` - Java
- `go` - Go
- `rust` - Rust
- `cpp` - C++
- `c` - C
- `html` - HTML
- `css` - CSS
- `json` - JSON
- `yaml` - YAML
- `xml` - XML
- `md` - Markdown

## Best Practices

1. **Use specific patterns**: More specific = faster and more accurate
2. **Filter by file type**: Use `type` parameter for better performance
3. **Start with file matches**: Use default mode to find relevant files first
4. **Add context wisely**: Use -C/-A/-B only when needed
5. **Escape special chars**: Remember to escape regex metacharacters
6. **Consider multiline carefully**: Only use when pattern spans lines

## Common Use Cases

### Finding Function Definitions
```typescript
// JavaScript/TypeScript functions
await Grep({
  pattern: "(function|const|let)\\s+\\w+\\s*=.*=>",
  type: "js",
  output_mode: "content",
  "-n": true
})

// Python functions
await Grep({
  pattern: "^def\\s+\\w+\\s*\\(",
  type: "py",
  output_mode: "content",
  "-n": true
})
```

### Finding Imports/Dependencies
```typescript
// ES6 imports
await Grep({
  pattern: "import.*from\\s+['\"](@?[\\w/-]+)['\"]",
  output_mode: "content"
})

// Package.json dependencies
await Grep({
  pattern: "\"dependencies\"",
  glob: "**/package.json",
  "-A": 10
})
```

### Finding Issues
```typescript
// TODOs and FIXMEs
await Grep({
  pattern: "(TODO|FIXME|HACK|XXX|BUG):",
  output_mode: "content",
  "-n": true
})

// Console logs (for cleanup)
await Grep({
  pattern: "console\\.(log|debug|info)",
  type: "js"
})
```

### Finding Tests
```typescript
// Test files
await Grep({
  pattern: "(describe|test|it)\\s*\\(",
  glob: "**/*.test.{js,ts}",
  output_mode: "content"
})

// Specific test cases
await Grep({
  pattern: "it\\s*\\(['\"].*auth.*['\"]",
  type: "js",
  "-i": true
})
```

## Integration with Other Tools

```typescript
// Find files with Glob, then search contents
const files = await Glob({ pattern: "**/*.js" })
const results = await Grep({
  pattern: "TODO",
  path: files[0],  // Search first file
  output_mode: "content"
})

// Use Task for complex searches
await Task({
  description: "Find error handling",
  prompt: "Find all error handling patterns including try/catch, .catch(), error callbacks"
})
```

## Performance Tips

1. **Use file type filtering**: Much faster than glob patterns
2. **Limit search scope**: Specify directories when possible
3. **Avoid broad multiline**: Multiline mode is slower
4. **Use head_limit**: Stop searching after finding enough
5. **Batch similar searches**: Run related searches together

## Important Notes

- **Always use Grep tool**: Never run `grep` or `rg` via Bash
- **Ripgrep syntax**: Not the same as GNU grep
- **Default ignores**: .gitignore rules are respected
- **Binary files**: Automatically skipped
- **Large files**: Handled efficiently with streaming