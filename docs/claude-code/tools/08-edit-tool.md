# Edit Tool

## Original Function Definition

```json
{
  "description": "Performs exact string replacements in files. \n\nUsage:\n- You must use your `Read` tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file. \n- When editing text from Read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is: spaces + line number + tab. Everything after that tab is the actual file content to match. Never include any part of the line number prefix in the old_string or new_string.\n- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.\n- Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.\n- The edit will FAIL if `old_string` is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use `replace_all` to change every instance of `old_string`. \n- Use `replace_all` for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.",
  "name": "Edit",
  "parameters": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "properties": {
      "file_path": {
        "description": "The absolute path to the file to modify",
        "type": "string"
      },
      "old_string": {
        "description": "The text to replace",
        "type": "string"
      },
      "new_string": {
        "description": "The text to replace it with (must be different from old_string)",
        "type": "string"
      },
      "replace_all": {
        "default": false,
        "description": "Replace all occurences of old_string (default false)",
        "type": "boolean"
      }
    },
    "required": ["file_path", "old_string", "new_string"],
    "type": "object"
  }
}
```

## Detailed Description

The Edit tool performs precise string replacements in files. It requires reading the file first and maintains exact formatting including indentation. The tool can replace single occurrences or all occurrences of a string.

## Key Requirements

1. **Must Read first**: Always use Read tool before Edit
2. **Exact matching**: old_string must match exactly
3. **Preserve formatting**: Maintain indentation and whitespace
4. **Unique strings**: old_string must be unique unless using replace_all
5. **No emojis**: Unless explicitly requested by user

## Understanding Line Number Format

When using Read output, the format is:
```
     1→const hello = "world";
    15→    function test() {
   100→        return true;
```

The pattern is: `[spaces][line number]→[actual content]`
- Never include line numbers or the → in old_string
- Copy the exact content after the →

## Examples

### Basic Edit
```typescript
// After reading a file showing:
//      5→const debug = false;

await Edit({
  file_path: "/project/config.js",
  old_string: "const debug = false;",
  new_string: "const debug = true;"
})
```

### Preserving Indentation
```typescript
// File shows:
//     10→    function calculate(x, y) {
//     11→        return x + y;
//     12→    }

// Correct - preserves indentation:
await Edit({
  file_path: "/project/math.js",
  old_string: "        return x + y;",
  new_string: "        return x * y;"
})

// Wrong - missing indentation:
await Edit({
  file_path: "/project/math.js",
  old_string: "return x + y;",  // This won't match!
  new_string: "return x * y;"
})
```

### Using Context for Uniqueness
```typescript
// If "import React" appears multiple times, include context:
await Edit({
  file_path: "/project/App.js",
  old_string: "import React from 'react';\nimport './App.css';",
  new_string: "import React, { useState } from 'react';\nimport './App.css';"
})
```

### Replace All Occurrences
```typescript
// Rename variable throughout file
await Edit({
  file_path: "/project/utils.js",
  old_string: "getUserName",
  new_string: "getUsername",
  replace_all: true
})

// Update all console.log statements
await Edit({
  file_path: "/project/debug.js",
  old_string: "console.log",
  new_string: "logger.debug",
  replace_all: true
})
```

## Common Patterns

### Updating Imports
```typescript
// Add named import
await Edit({
  file_path: "/project/component.js",
  old_string: "import React from 'react';",
  new_string: "import React, { useState, useEffect } from 'react';"
})

// Change import path
await Edit({
  file_path: "/project/index.js",
  old_string: "import { helper } from './utils';",
  new_string: "import { helper } from '../shared/utils';"
})
```

### Modifying Functions
```typescript
// Change function signature
await Edit({
  file_path: "/project/api.js",
  old_string: "function fetchData() {",
  new_string: "async function fetchData(id) {"
})

// Add parameter with context
await Edit({
  file_path: "/project/handler.js",
  old_string: "export function handleRequest(req, res) {\n    const data = req.body;",
  new_string: "export function handleRequest(req, res, next) {\n    const data = req.body;"
})
```

### Configuration Changes
```typescript
// Update config value
await Edit({
  file_path: "/project/.env",
  old_string: "DEBUG=false",
  new_string: "DEBUG=true"
})

// Modify JSON (be careful with formatting)
await Edit({
  file_path: "/project/package.json",
  old_string: '  "version": "1.0.0",',
  new_string: '  "version": "1.0.1",'
})
```

### Class Modifications
```typescript
// Add method to class
await Edit({
  file_path: "/project/User.js",
  old_string: "class User {\n    constructor(name) {\n        this.name = name;\n    }\n}",
  new_string: "class User {\n    constructor(name) {\n        this.name = name;\n    }\n\n    getName() {\n        return this.name;\n    }\n}"
})
```

## Multi-line Edits

### Correct Approach
```typescript
// Include all lines exactly as they appear
await Edit({
  file_path: "/project/server.js",
  old_string: `app.get('/', (req, res) => {
    res.send('Hello World');
});`,
  new_string: `app.get('/', (req, res) => {
    console.log('Home page requested');
    res.send('Hello World');
});`
})
```

### Handling Different Line Endings
```typescript
// Be consistent with \n or \r\n
await Edit({
  file_path: "/project/config.js",
  old_string: "const config = {\n    debug: false\n};",
  new_string: "const config = {\n    debug: true\n};"
})
```

## Error Handling

### String Not Found
```typescript
// If exact match not found:
// Error: old_string not found in file

// Solutions:
// 1. Check exact whitespace/indentation
// 2. Include more context
// 3. Use replace_all if multiple occurrences
```

### Non-unique String
```typescript
// If string appears multiple times:
// Error: old_string found 3 times. Use replace_all or make unique

// Fix by adding context:
await Edit({
  file_path: "/project/routes.js",
  old_string: "router.get('/', controller.home);\nrouter.get('/about', controller.about);",
  new_string: "router.get('/', controller.home);\nrouter.get('/api', controller.api);\nrouter.get('/about', controller.about);"
})
```

## Best Practices

1. **Always Read first**: Get the exact content including whitespace
2. **Copy exactly**: Use the content after the → in Read output
3. **Include context**: Make old_string unique with surrounding lines
4. **Preserve formatting**: Maintain all spaces, tabs, newlines
5. **Test uniqueness**: Ensure old_string appears only once (unless using replace_all)
6. **No emoji**: Don't add emoji unless user asks

## Common Mistakes

### Wrong: Including Line Numbers
```typescript
// WRONG - includes line number
await Edit({
  old_string: "    10→const x = 5;",  // Don't include this!
  new_string: "const x = 10;"
})

// CORRECT
await Edit({
  old_string: "const x = 5;",
  new_string: "const x = 10;"
})
```

### Wrong: Incorrect Whitespace
```typescript
// File shows:
//     15→    const value = 42;

// WRONG - missing spaces
await Edit({
  old_string: "const value = 42;",
  new_string: "const value = 100;"
})

// CORRECT - exact spacing
await Edit({
  old_string: "    const value = 42;",
  new_string: "    const value = 100;"
})
```

### Wrong: Partial Matches
```typescript
// WRONG - might match unintended locations
await Edit({
  old_string: "true",
  new_string: "false"
})

// CORRECT - more specific
await Edit({
  old_string: "debug: true",
  new_string: "debug: false"
})
```

## Edit vs Other Tools

- **Edit**: Modify existing file content
- **Write**: Create new files or completely replace content
- **MultiEdit**: Multiple edits to same file
- **Read**: Always do this before Edit

## Workflow Example

```typescript
// 1. Read the file
const content = await Read({
  file_path: "/project/src/app.js"
})

// 2. Find the exact string to replace
// File shows:
//     25→app.listen(3000, () => {

// 3. Edit with exact match
await Edit({
  file_path: "/project/src/app.js",
  old_string: "app.listen(3000, () => {",
  new_string: "app.listen(process.env.PORT || 3000, () => {"
})
```

## Important Notes

- Edit modifies files in-place
- Changes are immediate and permanent
- No undo functionality
- Always verify edits with Read after
- Consider using MultiEdit for multiple changes