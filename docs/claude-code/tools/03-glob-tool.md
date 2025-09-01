# Glob Tool

## Original Function Definition

```json
{
  "description": "- Fast file pattern matching tool that works with any codebase size\n- Supports glob patterns like \"**/*.js\" or \"src/**/*.ts\"\n- Returns matching file paths sorted by modification time\n- Use this tool when you need to find files by name patterns\n- When you are doing an open ended search that may require multiple rounds of globbing and grepping, use the Agent tool instead\n- You have the capability to call multiple tools in a single response. It is always better to speculatively perform multiple searches as a batch that are potentially useful.",
  "name": "Glob",
  "parameters": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "properties": {
      "path": {
        "description": "The directory to search in. If not specified, the current working directory will be used. IMPORTANT: Omit this field to use the default directory. DO NOT enter \"undefined\" or \"null\" - simply omit it for the default behavior. Must be a valid directory path if provided.",
        "type": "string"
      },
      "pattern": {
        "description": "The glob pattern to match files against",
        "type": "string"
      }
    },
    "required": ["pattern"],
    "type": "object"
  }
}
```

## Detailed Description

The Glob tool is a fast file pattern matching utility that finds files based on glob patterns. It's optimized for performance and can handle large codebases efficiently. Files are returned sorted by modification time (newest first), making it easy to find recently changed files.

## Pattern Syntax

### Basic Patterns
- `*` - Matches any characters except path separators
- `**` - Matches any characters including path separators (recursive)
- `?` - Matches exactly one character
- `[abc]` - Matches any character in brackets
- `[!abc]` - Matches any character NOT in brackets
- `{a,b,c}` - Matches any of the comma-separated patterns

### Common Patterns
- `*.js` - All JavaScript files in current directory
- `**/*.js` - All JavaScript files recursively
- `src/**/*.ts` - All TypeScript files under src/
- `**/*.{js,ts,jsx,tsx}` - Multiple extensions
- `**/test*.js` - Files starting with "test"
- `**/*spec.js` - Files ending with "spec.js"

## Usage Guidelines

### When to Use Glob
- Finding files by extension or name pattern
- Locating test files, config files, or specific modules
- Discovering project structure
- Finding recently modified files

### When NOT to Use Glob
- For open-ended searches requiring multiple rounds → Use Task tool
- When you need file contents, not just names → Use Grep tool
- For simple directory listing → Use LS tool

## Examples

### Finding Files by Extension
```typescript
// Find all JavaScript files
await Glob({
  pattern: "**/*.js"
})

// Find all test files
await Glob({
  pattern: "**/*.test.{js,ts}"
})

// Find configuration files
await Glob({
  pattern: "**/*.config.{js,json,yaml,yml}"
})
```

### Searching Specific Directories
```typescript
// Find TypeScript files in src directory
await Glob({
  pattern: "**/*.ts",
  path: "/home/user/project/src"
})

// Find all components
await Glob({
  pattern: "**/components/**/*.{jsx,tsx}"
})

// Find files in multiple specific directories
await Glob({
  pattern: "{src,lib,test}/**/*.js"
})
```

### Pattern Matching Examples
```typescript
// Files with specific naming pattern
await Glob({
  pattern: "**/use*.{js,ts}"  // React hooks
})

// Exclude certain directories
await Glob({
  pattern: "**/*.js"
  // Note: node_modules, .git, dist, etc. are auto-ignored
})

// Find by multiple patterns
await Glob({
  pattern: "**/{package.json,tsconfig.json,.eslintrc*}"
})
```

### Batch Searches
```typescript
// Search for multiple patterns in parallel
const [components, tests, configs] = await Promise.all([
  Glob({ pattern: "**/components/**/*.{jsx,tsx}" }),
  Glob({ pattern: "**/*.(test|spec).{js,ts}" }),
  Glob({ pattern: "**/*.config.{js,json}" })
])
```

## Advanced Patterns

### Complex Matching
```typescript
// Find all index files
await Glob({
  pattern: "**/index.{js,ts,jsx,tsx}"
})

// Find files with specific prefixes/suffixes
await Glob({
  pattern: "**/*Controller.{js,ts}"
})

// Nested pattern matching
await Glob({
  pattern: "src/**/components/**/index.{js,jsx}"
})
```

### Project Structure Discovery
```typescript
// Find all package.json files (monorepo)
await Glob({
  pattern: "**/package.json"
})

// Find all source entry points
await Glob({
  pattern: "**/src/index.{js,ts}"
})

// Find build outputs
await Glob({
  pattern: "**/dist/**/*.js"
})
```

## Output Format

The tool returns file paths sorted by modification time (newest first):
```
/project/src/components/Button.tsx
/project/src/components/Input.tsx
/project/src/utils/helpers.ts
/project/src/index.ts
```

## Performance Tips

1. **Be specific**: More specific patterns are faster
2. **Limit scope**: Use the `path` parameter to narrow search
3. **Batch operations**: Run multiple globs in parallel
4. **Avoid over-broad patterns**: `**/*` is slower than specific patterns

## Default Ignores

The following directories are automatically ignored:
- `node_modules/`
- `.git/`
- `dist/`
- `build/`
- `.vscode/`
- `coverage/`
- `.next/`
- `.nuxt/`
- `out/`
- `.cache/`

## Common Use Cases

### Finding Test Files
```typescript
await Glob({
  pattern: "**/*.{test,spec}.{js,ts,jsx,tsx}"
})
```

### Finding Documentation
```typescript
await Glob({
  pattern: "**/*.{md,mdx}"
})
```

### Finding Style Files
```typescript
await Glob({
  pattern: "**/*.{css,scss,sass,less}"
})
```

### Finding Images
```typescript
await Glob({
  pattern: "**/*.{png,jpg,jpeg,gif,svg,webp}"
})
```

### Finding Config Files
```typescript
await Glob({
  pattern: "**/.{eslintrc,prettierrc,gitignore,env}*"
})
```

## Best Practices

1. **Start specific**: Begin with specific patterns, broaden if needed
2. **Use extensions**: Include file extensions for faster matching
3. **Combine patterns**: Use `{a,b,c}` syntax for multiple options
4. **Check results**: Verify the files returned match expectations
5. **Consider Task tool**: For complex searches requiring multiple steps

## Integration with Other Tools

```typescript
// Find files then read them
const files = await Glob({ pattern: "**/*.config.js" })
for (const file of files.slice(0, 5)) {  // Read first 5
  const content = await Read({ file_path: file })
  // Process content...
}

// Find files then search contents
const testFiles = await Glob({ pattern: "**/*.test.js" })
const results = await Grep({
  pattern: "describe\\(",
  path: testFiles[0]  // Search in first test file
})
```

## Error Handling

- **Invalid pattern**: Returns empty results with error message
- **Directory not found**: Returns empty results if path doesn't exist
- **Permission denied**: Skips inaccessible directories
- **Large result sets**: Results are not truncated (use patterns wisely)