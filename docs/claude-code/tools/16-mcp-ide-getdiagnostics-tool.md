# mcp__ide__getDiagnostics Tool

## Original Function Definition

```json
{
  "description": "Get language diagnostics from VS Code",
  "name": "mcp__ide__getDiagnostics",
  "parameters": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "properties": {
      "uri": {
        "description": "Optional file URI to get diagnostics for. If not provided, gets diagnostics for all files.",
        "type": "string"
      }
    },
    "type": "object"
  }
}
```

## Detailed Description

The mcp__ide__getDiagnostics tool retrieves language diagnostics (errors, warnings, hints) from VS Code's language servers. It can fetch diagnostics for a specific file or all open files, providing real-time feedback about code issues.

## Key Features

1. **Language server integration**: Gets diagnostics from TypeScript, ESLint, etc.
2. **File-specific or global**: Target specific files or get all diagnostics
3. **Real-time feedback**: Current state of code issues
4. **Multiple severity levels**: Errors, warnings, information, hints
5. **Rich diagnostic info**: Messages, locations, sources, and fixes

## Diagnostic Types

### Severity Levels
- **Error**: Code that won't compile or run
- **Warning**: Potential issues or bad practices
- **Information**: Suggestions or FYI items
- **Hint**: Subtle improvements or refactoring opportunities

### Common Sources
- **TypeScript**: Type errors, syntax issues
- **ESLint**: Linting rules violations
- **Prettier**: Formatting issues
- **Language-specific**: Python, Go, Rust, etc.

## Examples

### Get All Diagnostics
```typescript
// Get diagnostics for entire workspace
await mcp__ide__getDiagnostics({})

// Returns all errors, warnings across all files
// Useful for project-wide health check
```

### File-Specific Diagnostics
```typescript
// Get diagnostics for specific file
await mcp__ide__getDiagnostics({
  uri: "file:///home/user/project/src/app.ts"
})

// Returns issues only for app.ts
// Useful when working on specific file
```

### Common File Paths
```typescript
// TypeScript file
await mcp__ide__getDiagnostics({
  uri: "file:///project/src/components/Button.tsx"
})

// JavaScript file
await mcp__ide__getDiagnostics({
  uri: "file:///project/lib/utils.js"
})

// Python file
await mcp__ide__getDiagnostics({
  uri: "file:///project/main.py"
})
```

## Use Cases

### Pre-commit Checks
```typescript
// Check for errors before committing
const diagnostics = await mcp__ide__getDiagnostics({})

// If errors exist, fix them before commit
if (diagnostics.some(d => d.severity === "error")) {
  // Address errors first
}
```

### After Code Changes
```typescript
// After editing a file, check for new issues
await Edit({
  file_path: "/project/src/api.ts",
  old_string: "getData()",
  new_string: "getData(userId)"
})

// Check if edit introduced problems
await mcp__ide__getDiagnostics({
  uri: "file:///project/src/api.ts"
})
```

### Debugging Type Errors
```typescript
// Get detailed TypeScript errors
const diagnostics = await mcp__ide__getDiagnostics({
  uri: "file:///project/src/types.ts"
})

// Diagnostics include:
// - Exact error location (line, column)
// - Error message
// - Suggested fixes (if available)
```

### Linting Issues
```typescript
// Check ESLint violations
const diagnostics = await mcp__ide__getDiagnostics({
  uri: "file:///project/src/components/Form.jsx"
})

// Filter for ESLint issues
const eslintIssues = diagnostics.filter(
  d => d.source === "eslint"
)
```

## Diagnostic Information

### Typical Diagnostic Structure
```typescript
{
  severity: "error" | "warning" | "information" | "hint",
  message: "Type 'string' is not assignable to type 'number'",
  source: "ts",  // TypeScript, eslint, etc.
  range: {
    start: { line: 10, character: 5 },
    end: { line: 10, character: 15 }
  },
  code: 2322,  // Error code
  relatedInformation: [...],  // Additional context
  tags: [],  // Deprecated, unnecessary, etc.
}
```

### Common Error Patterns

#### TypeScript Errors
```typescript
// Type mismatch
"Type 'string' is not assignable to type 'number'"

// Missing property
"Property 'name' is missing in type '{}'"

// Undefined variable
"Cannot find name 'myVariable'"
```

#### ESLint Warnings
```typescript
// Unused variable
"'username' is assigned a value but never used"

// Missing dependency
"React Hook useEffect has a missing dependency"

// Code style
"Expected '===' and instead saw '=='"
```

## Integration Workflows

### Fix Errors Workflow
```typescript
// 1. Get diagnostics
const diagnostics = await mcp__ide__getDiagnostics({
  uri: "file:///project/src/app.ts"
})

// 2. Identify errors
const errors = diagnostics.filter(d => d.severity === "error")

// 3. Read file to understand context
await Read({ file_path: "/project/src/app.ts" })

// 4. Fix each error
for (const error of errors) {
  // Apply appropriate fix based on error type
}
```

### Code Quality Check
```typescript
// Get all diagnostics
const allDiagnostics = await mcp__ide__getDiagnostics({})

// Categorize by severity
const summary = {
  errors: allDiagnostics.filter(d => d.severity === "error").length,
  warnings: allDiagnostics.filter(d => d.severity === "warning").length,
  info: allDiagnostics.filter(d => d.severity === "information").length
}

// Report to user
console.log(`Found ${summary.errors} errors, ${summary.warnings} warnings`)
```

### Pre-build Validation
```typescript
// Check for blocking issues before build
const diagnostics = await mcp__ide__getDiagnostics({})

const blockingIssues = diagnostics.filter(
  d => d.severity === "error" && d.source === "ts"
)

if (blockingIssues.length > 0) {
  // Must fix TypeScript errors before building
}
```

## Best Practices

1. **Check after edits**: Verify changes don't introduce errors
2. **Filter by severity**: Focus on errors first, then warnings
3. **Use with builds**: Check diagnostics before building/deploying
4. **Target specific files**: More efficient than checking everything
5. **Understand sources**: Different tools report different issues

## File URI Format

### Correct URI Format
```typescript
// Unix/Linux/Mac
"file:///home/user/project/src/file.ts"
"file:///Users/john/Documents/app.js"

// Windows
"file:///C:/Users/john/project/src/file.ts"
"file:///D:/projects/myapp/index.js"
```

### Common Mistakes
```typescript
// Wrong - Missing file:// protocol
"/home/user/project/src/file.ts"

// Wrong - Using backslashes on Windows
"file:///C:\\Users\\john\\file.ts"

// Wrong - Relative path
"file://./src/file.ts"
```

## Filtering Results

```typescript
// Get all diagnostics
const diagnostics = await mcp__ide__getDiagnostics({})

// Filter by file
const fileErrors = diagnostics.filter(
  d => d.uri.includes("components/Button")
)

// Filter by source
const tsErrors = diagnostics.filter(
  d => d.source === "ts"
)

// Filter by severity
const errors = diagnostics.filter(
  d => d.severity === "error"
)

// Complex filtering
const criticalIssues = diagnostics.filter(
  d => d.severity === "error" &&
       d.source === "ts" &&
       !d.tags?.includes("deprecated")
)
```

## Important Notes

- Requires VS Code with language extensions active
- Diagnostics update as files are edited
- Empty array means no issues found
- URI must be absolute file:// format
- Results depend on installed extensions
- Some diagnostics may have quick fixes available