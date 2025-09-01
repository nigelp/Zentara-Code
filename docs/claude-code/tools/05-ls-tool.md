# LS Tool

## Original Function Definition

```json
{
  "description": "Lists files and directories in a given path. The path parameter must be an absolute path, not a relative path. You can optionally provide an array of glob patterns to ignore with the ignore parameter. You should generally prefer the Glob and Grep tools, if you know which directories to search.",
  "name": "LS",
  "parameters": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "properties": {
      "path": {
        "description": "The absolute path to the directory to list (must be absolute, not relative)",
        "type": "string"
      },
      "ignore": {
        "description": "List of glob patterns to ignore",
        "items": {"type": "string"},
        "type": "array"
      }
    },
    "required": ["path"],
    "type": "object"
  }
}
```

## Detailed Description

The LS tool lists files and directories at a specified path, similar to the Unix `ls` command. It requires absolute paths and supports filtering with ignore patterns. This tool is best for exploring directory contents when you need a complete listing.

## Key Features

1. **Absolute paths required**: Ensures unambiguous directory targeting
2. **Ignore patterns**: Filter out unwanted files/directories
3. **Complete listing**: Shows all contents (files and directories)
4. **Simple operation**: No recursive traversal

## Usage Guidelines

### When to Use LS
- Exploring directory structure
- Verifying directory contents before operations
- Checking if files exist in a specific location
- Understanding project layout

### When to Use Other Tools Instead
- **Finding files by pattern** → Use Glob tool
- **Searching file contents** → Use Grep tool
- **Recursive file search** → Use Glob with `**` pattern

## Examples

### Basic Directory Listing
```typescript
// List project root
await LS({
  path: "/home/user/project"
})

// List source directory
await LS({
  path: "/home/user/project/src"
})

// List with absolute path
await LS({
  path: "/Users/john/Documents/my-app"
})
```

### Using Ignore Patterns
```typescript
// Ignore test files
await LS({
  path: "/home/user/project/src",
  ignore: ["*.test.js", "*.spec.js"]
})

// Ignore multiple patterns
await LS({
  path: "/home/user/project",
  ignore: ["node_modules", "*.log", ".git", "dist"]
})

// Ignore temporary files
await LS({
  path: "/home/user/project",
  ignore: ["*.tmp", "*.swp", "*~", ".DS_Store"]
})
```

### Directory Verification
```typescript
// Check before creating subdirectory
const parentDir = await LS({
  path: "/home/user/project/src"
})
// Verify parent exists before: mkdir src/components

// Verify build output
await LS({
  path: "/home/user/project/dist"
})
```

## Common Use Cases

### Project Structure Exploration
```typescript
// Check project root
await LS({
  path: "/home/user/my-project"
})

// Check for configuration files
await LS({
  path: "/home/user/my-project",
  ignore: ["node_modules", "dist", "coverage"]
})
```

### Build Verification
```typescript
// Check if build directory exists
await LS({
  path: "/home/user/project/build"
})

// List build artifacts
await LS({
  path: "/home/user/project/dist",
  ignore: ["*.map"]
})
```

### Source Code Organization
```typescript
// List component directories
await LS({
  path: "/home/user/project/src/components"
})

// List test directories
await LS({
  path: "/home/user/project/tests",
  ignore: ["__snapshots__", "coverage"]
})
```

## Output Format

The tool returns a list of entries with basic information:
```
file1.js
file2.ts
directory1/
directory2/
.hidden-file
```

Directories are typically indicated with a trailing slash.

## Best Practices

1. **Always use absolute paths**: Required by the tool
2. **Verify paths exist**: Handle cases where directory doesn't exist
3. **Use specific ignore patterns**: More efficient than filtering results
4. **Consider Glob for patterns**: Use Glob when you know what you're looking for
5. **Don't use for recursive listing**: LS only shows one level

## Path Examples

### Correct (Absolute Paths)
```typescript
await LS({ path: "/home/user/project" })
await LS({ path: "/Users/john/Documents" })
await LS({ path: "C:\\Users\\john\\project" })  // Windows
```

### Incorrect (Relative Paths)
```typescript
// These will fail:
await LS({ path: "./src" })         // Relative
await LS({ path: "src/components" }) // Relative
await LS({ path: "../project" })    // Relative
```

## Integration with Other Tools

```typescript
// List directory then read specific file
const contents = await LS({
  path: "/home/user/project/config"
})
// If config.json exists in listing:
const config = await Read({
  file_path: "/home/user/project/config/config.json"
})

// Verify before file operations
const srcContents = await LS({
  path: "/home/user/project/src"
})
// Then create new file:
await Write({
  file_path: "/home/user/project/src/newfile.js",
  content: "// New file"
})
```

## Error Handling

- **Directory not found**: Returns error if path doesn't exist
- **Permission denied**: Returns error for inaccessible directories
- **Not a directory**: Returns error if path is a file
- **Invalid path**: Returns error for malformed paths

## Comparison with Similar Tools

### LS vs Glob
- **LS**: Single directory, complete listing
- **Glob**: Recursive search, pattern matching

### LS vs Bash `ls`
- **LS tool**: Structured output, ignore patterns
- **Bash ls**: Not recommended, use LS tool instead

### When to Use Each
```typescript
// Use LS for directory contents
await LS({ path: "/project/src" })

// Use Glob for finding files
await Glob({ pattern: "**/*.js" })

// Use Grep for searching contents
await Grep({ pattern: "TODO" })
```

## Common Patterns

### Pre-operation Checks
```typescript
// Before creating directory
const parent = await LS({ path: "/project" })
// Check if 'src' already exists
await Bash({ command: "mkdir /project/src" })

// Before writing file
const dir = await LS({ path: "/project/config" })
// Verify directory exists
await Write({
  file_path: "/project/config/settings.json",
  content: "{}"
})
```

### Configuration Discovery
```typescript
// Find all config files in root
const rootFiles = await LS({
  path: "/home/user/project",
  ignore: ["node_modules", "dist", "coverage", ".*"]
})
// Look for .env, config.*, etc.
```

### Clean Directory Listing
```typescript
// List only source files
await LS({
  path: "/project/src",
  ignore: [
    "*.test.*",
    "*.spec.*",
    "__tests__",
    "__mocks__",
    "*.d.ts"
  ]
})
```