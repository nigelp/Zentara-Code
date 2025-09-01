# Read Tool

## Original Function Definition

```json
{
  "description": "Reads a file from the local filesystem. You can access any file directly by using this tool.\nAssume this tool is able to read all files on the machine. If the User provides a path to a file assume that path is valid. It is okay to read a file that does not exist; an error will be returned.\n\nUsage:\n- The file_path parameter must be an absolute path, not a relative path\n- By default, it reads up to 2000 lines starting from the beginning of the file\n- You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters\n- Any lines longer than 2000 characters will be truncated\n- Results are returned using cat -n format, with line numbers starting at 1\n- This tool allows Claude Code to read images (eg PNG, JPG, etc). When reading an image file the contents are presented visually as Claude Code is a multimodal LLM.\n- For Jupyter notebooks (.ipynb files), use the NotebookRead instead\n- You have the capability to call multiple tools in a single response. It is always better to speculatively read multiple files as a batch that are potentially useful. \n- You will regularly be asked to read screenshots. If the user provides a path to a screenshot ALWAYS use this tool to view the file at the path. This tool will work with all temporary file paths like /var/folders/123/abc/T/TemporaryItems/NSIRD_screencaptureui_ZfB1tD/Screenshot.png\n- If you read a file that exists but has empty contents you will receive a system reminder warning in place of file contents.",
  "name": "Read",
  "parameters": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "properties": {
      "file_path": {
        "description": "The absolute path to the file to read",
        "type": "string"
      },
      "limit": {
        "description": "The number of lines to read. Only provide if the file is too large to read at once.",
        "type": "number"
      },
      "offset": {
        "description": "The line number to start reading from. Only provide if the file is too large to read at once",
        "type": "number"
      }
    },
    "required": ["file_path"],
    "type": "object"
  }
}
```

## Detailed Description

The Read tool provides direct file system access to read both text files and images. It's the primary tool for examining file contents, supporting various file types with intelligent handling of large files, long lines, and binary content.

## Key Features

1. **Universal file access**: Can read any file on the system
2. **Multimodal support**: Handles both text and images
3. **Line numbering**: Returns content in `cat -n` format
4. **Smart truncation**: Handles large files and long lines
5. **Batch reading**: Can read multiple files efficiently
6. **Image support**: Displays images visually (PNG, JPG, etc.)

## Usage Guidelines

### Basic File Reading
```typescript
// Read entire file
await Read({
  file_path: "/home/user/project/src/index.js"
})

// Read configuration file
await Read({
  file_path: "/home/user/project/package.json"
})

// Read from absolute path
await Read({
  file_path: "/etc/hosts"
})
```

### Reading Large Files
```typescript
// Read first 100 lines
await Read({
  file_path: "/home/user/large-log.txt",
  limit: 100
})

// Read lines 500-600
await Read({
  file_path: "/home/user/large-file.csv",
  offset: 500,
  limit: 100
})

// Read end of file
await Read({
  file_path: "/var/log/system.log",
  offset: 1900,
  limit: 100
})
```

### Batch Reading
```typescript
// Read multiple related files
const [main, test, config] = await Promise.all([
  Read({ file_path: "/project/src/auth.js" }),
  Read({ file_path: "/project/test/auth.test.js" }),
  Read({ file_path: "/project/config/auth.json" })
])

// Read all source files found by Glob
const files = await Glob({ pattern: "src/**/*.js" })
const contents = await Promise.all(
  files.slice(0, 5).map(f => Read({ file_path: f }))
)
```

### Reading Images
```typescript
// Read screenshot
await Read({
  file_path: "/Users/john/Desktop/screenshot.png"
})

// Read temporary screenshot path
await Read({
  file_path: "/var/folders/abc/def/T/TemporaryItems/Screenshot.png"
})

// Read design mockup
await Read({
  file_path: "/project/designs/homepage.jpg"
})
```

## Output Format

### Text Files
Content is returned in `cat -n` format with line numbers:
```
     1→const express = require('express');
     2→const app = express();
     3→
     4→app.get('/', (req, res) => {
     5→  res.send('Hello World!');
     6→});
     7→
     8→app.listen(3000, () => {
     9→  console.log('Server running on port 3000');
    10→});
```

### Images
Images are displayed visually in the response, allowing for:
- Screenshot analysis
- Design review
- Diagram understanding
- Visual debugging

## Common Use Cases

### Code Review
```typescript
// Read main implementation
await Read({
  file_path: "/project/src/components/Button.jsx"
})

// Read associated test
await Read({
  file_path: "/project/src/components/Button.test.jsx"
})

// Read styles
await Read({
  file_path: "/project/src/components/Button.css"
})
```

### Configuration Analysis
```typescript
// Read various config files
await Promise.all([
  Read({ file_path: "/project/.env" }),
  Read({ file_path: "/project/.env.example" }),
  Read({ file_path: "/project/config/database.js" }),
  Read({ file_path: "/project/docker-compose.yml" })
])
```

### Debugging
```typescript
// Read error log
await Read({
  file_path: "/var/log/app-error.log",
  offset: 1900,  // Last 100 lines
  limit: 100
})

// Read stack trace file
await Read({
  file_path: "/tmp/crash-dump.txt"
})
```

### Documentation Review
```typescript
// Read README
await Read({
  file_path: "/project/README.md"
})

// Read API documentation
await Read({
  file_path: "/project/docs/API.md"
})
```

## File Type Handling

### Text Files
- Source code (`.js`, `.py`, `.java`, etc.)
- Configuration (`.json`, `.yaml`, `.xml`)
- Documentation (`.md`, `.txt`)
- Scripts (`.sh`, `.bat`)
- Data files (`.csv`, `.sql`)

### Image Files
- Screenshots (`.png`, `.jpg`)
- Diagrams (`.svg`, `.png`)
- Mockups (`.jpg`, `.png`)
- Charts and graphs

### Special Cases
- **Empty files**: Returns system reminder
- **Binary files**: May show garbled text
- **Jupyter notebooks**: Use NotebookRead instead
- **Very large files**: Use offset/limit parameters

## Best Practices

1. **Use absolute paths**: Always required
2. **Batch related reads**: Read multiple files together
3. **Handle large files**: Use offset/limit for files >2000 lines
4. **Check file existence**: Handle potential errors gracefully
5. **Read before editing**: Always read before using Edit/Write

## Error Handling

### Common Errors
```typescript
// File not found
await Read({
  file_path: "/nonexistent/file.txt"
})
// Error: File not found

// Directory instead of file
await Read({
  file_path: "/home/user/directory/"
})
// Error: Is a directory

// Permission denied
await Read({
  file_path: "/root/secret.key"
})
// Error: Permission denied
```

## Integration Patterns

### Read → Edit Workflow
```typescript
// Always read before editing
const content = await Read({
  file_path: "/project/src/config.js"
})

// Analyze content...

await Edit({
  file_path: "/project/src/config.js",
  old_string: "debug: false",
  new_string: "debug: true"
})
```

### Search → Read Pattern
```typescript
// Find files with Grep
const files = await Grep({
  pattern: "TODO",
  output_mode: "files_with_matches"
})

// Read files with TODOs
const contents = await Promise.all(
  files.slice(0, 3).map(f => Read({ file_path: f }))
)
```

### Verify → Read Pattern
```typescript
// Check directory contents
const files = await LS({
  path: "/project/src"
})

// Read specific file if it exists
if (files.includes("index.js")) {
  await Read({
    file_path: "/project/src/index.js"
  })
}
```

## Performance Tips

1. **Batch operations**: Read multiple files in one request
2. **Limit large files**: Use offset/limit for efficiency
3. **Read only needed**: Don't read entire large files unnecessarily
4. **Cache mentally**: Remember content to avoid re-reading
5. **Use specific tools**: Use Grep/Glob to find files first

## Line Truncation

Lines longer than 2000 characters are truncated:
```
    15→{"data": "very long content here that goes on and on and on and on and on and on and on and o...
```

## Important Notes

- **Absolute paths only**: Relative paths will fail
- **Line numbers start at 1**: Not zero-indexed
- **Default limit**: 2000 lines if not specified
- **Image display**: Images shown visually, not as text
- **Empty file warning**: System reminder for empty files
- **Notebook files**: Use NotebookRead for .ipynb files