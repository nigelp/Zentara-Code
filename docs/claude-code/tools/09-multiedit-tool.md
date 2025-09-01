# MultiEdit Tool

## Original Function Definition

```json
{
  "description": "This is a tool for making multiple edits to a single file in one operation. It is built on top of the Edit tool and allows you to perform multiple find-and-replace operations efficiently. Prefer this tool over the Edit tool when you need to make multiple edits to the same file.\n\nBefore using this tool:\n\n1. Use the Read tool to understand the file's contents and context\n2. Verify the directory path is correct\n\nTo make multiple file edits, provide the following:\n1. file_path: The absolute path to the file to modify (must be absolute, not relative)\n2. edits: An array of edit operations to perform, where each edit contains:\n   - old_string: The text to replace (must match the file contents exactly, including all whitespace and indentation)\n   - new_string: The edited text to replace the old_string\n   - replace_all: Replace all occurences of old_string. This parameter is optional and defaults to false.\n\nIMPORTANT:\n- All edits are applied in sequence, in the order they are provided\n- Each edit operates on the result of the previous edit\n- All edits must be valid for the operation to succeed - if any edit fails, none will be applied\n- This tool is ideal when you need to make several changes to different parts of the same file\n- For Jupyter notebooks (.ipynb files), use the NotebookEdit instead\n\nCRITICAL REQUIREMENTS:\n1. All edits follow the same requirements as the single Edit tool\n2. The edits are atomic - either all succeed or none are applied\n3. Plan your edits carefully to avoid conflicts between sequential operations\n\nWARNING:\n- The tool will fail if edits.old_string doesn't match the file contents exactly (including whitespace)\n- The tool will fail if edits.old_string and edits.new_string are the same\n- Since edits are applied in sequence, ensure that earlier edits don't affect the text that later edits are trying to find\n\nWhen making edits:\n- Ensure all edits result in idiomatic, correct code\n- Do not leave the code in a broken state\n- Always use absolute file paths (starting with /)\n- Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.\n- Use replace_all for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.\n\nIf you want to create a new file, use:\n- A new file path, including dir name if needed\n- First edit: empty old_string and the new file's contents as new_string\n- Subsequent edits: normal edit operations on the created content",
  "name": "MultiEdit",
  "parameters": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "properties": {
      "file_path": {
        "description": "The absolute path to the file to modify",
        "type": "string"
      },
      "edits": {
        "description": "Array of edit operations to perform sequentially on the file",
        "items": {
          "additionalProperties": false,
          "properties": {
            "old_string": {
              "description": "The text to replace",
              "type": "string"
            },
            "new_string": {
              "description": "The text to replace it with",
              "type": "string"
            },
            "replace_all": {
              "default": false,
              "description": "Replace all occurences of old_string (default false).",
              "type": "boolean"
            }
          },
          "required": ["old_string", "new_string"],
          "type": "object"
        },
        "minItems": 1,
        "type": "array"
      }
    },
    "required": ["file_path", "edits"],
    "type": "object"
  }
}
```

## Detailed Description

The MultiEdit tool performs multiple sequential edits to a single file in one atomic operation. It's more efficient than multiple Edit calls and ensures all changes succeed together or fail together. Each edit is applied to the result of the previous edit.

## Key Features

1. **Atomic operations**: All edits succeed or none are applied
2. **Sequential processing**: Edits apply in order
3. **Efficient batching**: Better than multiple Edit calls
4. **File creation support**: Can create new files with empty old_string
5. **Same requirements as Edit**: Must read file first, exact matching

## Sequential Edit Behavior

Understanding how edits are applied in sequence is crucial:

```typescript
// Original file content:
// const x = 5;
// const y = 10;

await MultiEdit({
  file_path: "/project/math.js",
  edits: [
    {
      old_string: "const x = 5;",
      new_string: "const x = 15;"
    },
    {
      old_string: "const x = 15;",  // Must match result of edit 1!
      new_string: "const x = 20;"
    }
  ]
})

// Final result:
// const x = 20;
// const y = 10;
```

## Examples

### Multiple Independent Edits
```typescript
// Update multiple configuration values
await MultiEdit({
  file_path: "/project/config.js",
  edits: [
    {
      old_string: "debug: false",
      new_string: "debug: true"
    },
    {
      old_string: "timeout: 3000",
      new_string: "timeout: 5000"
    },
    {
      old_string: "retries: 3",
      new_string: "retries: 5"
    }
  ]
})
```

### Refactoring Multiple Functions
```typescript
await MultiEdit({
  file_path: "/project/api.js",
  edits: [
    {
      old_string: "function getData() {",
      new_string: "async function getData() {"
    },
    {
      old_string: "function saveData(data) {",
      new_string: "async function saveData(data) {"
    },
    {
      old_string: "return fetch(url)",
      new_string: "return await fetch(url)"
    }
  ]
})
```

### Renaming Variables Across File
```typescript
await MultiEdit({
  file_path: "/project/user-service.js",
  edits: [
    {
      old_string: "userName",
      new_string: "username",
      replace_all: true
    },
    {
      old_string: "getUserName",
      new_string: "getUsername",
      replace_all: true
    },
    {
      old_string: "setUserName",
      new_string: "setUsername",
      replace_all: true
    }
  ]
})
```

### Adding Multiple Imports
```typescript
await MultiEdit({
  file_path: "/project/component.jsx",
  edits: [
    {
      old_string: "import React from 'react';",
      new_string: "import React, { useState, useEffect } from 'react';"
    },
    {
      old_string: "import React, { useState, useEffect } from 'react';\n",
      new_string: "import React, { useState, useEffect } from 'react';\nimport axios from 'axios';\n"
    },
    {
      old_string: "import axios from 'axios';\n",
      new_string: "import axios from 'axios';\nimport { useAuth } from './hooks';\n"
    }
  ]
})
```

### Creating a New File
```typescript
await MultiEdit({
  file_path: "/project/src/new-component.js",
  edits: [
    {
      old_string: "",
      new_string: `import React from 'react';

export function NewComponent({ title }) {
    return (
        <div>
            <h1>{title}</h1>
        </div>
    );
}
`
    },
    {
      old_string: "export function NewComponent({ title }) {",
      new_string: "export function NewComponent({ title, subtitle }) {"
    },
    {
      old_string: "            <h1>{title}</h1>",
      new_string: "            <h1>{title}</h1>\n            <h2>{subtitle}</h2>"
    }
  ]
})
```

## Complex Refactoring Example

```typescript
// Refactor class to use modern syntax
await MultiEdit({
  file_path: "/project/old-class.js",
  edits: [
    // Convert function to class field
    {
      old_string: "    constructor(name) {\n        this.name = name;\n        this.handleClick = this.handleClick.bind(this);\n    }",
      new_string: "    constructor(name) {\n        this.name = name;\n    }"
    },
    // Convert method to arrow function
    {
      old_string: "    handleClick() {\n        console.log(this.name);\n    }",
      new_string: "    handleClick = () => {\n        console.log(this.name);\n    }"
    },
    // Update method calls
    {
      old_string: "onClick={this.handleClick.bind(this)}",
      new_string: "onClick={this.handleClick}",
      replace_all: true
    }
  ]
})
```

## Common Patterns

### Update Package.json Scripts
```typescript
await MultiEdit({
  file_path: "/project/package.json",
  edits: [
    {
      old_string: '"test": "jest"',
      new_string: '"test": "jest --coverage"'
    },
    {
      old_string: '"build": "webpack"',
      new_string: '"build": "webpack --mode production"'
    },
    {
      old_string: '"dev": "webpack-dev-server"',
      new_string: '"dev": "webpack-dev-server --hot"'
    }
  ]
})
```

### Add Error Handling
```typescript
await MultiEdit({
  file_path: "/project/api-client.js",
  edits: [
    {
      old_string: "async function fetchUser(id) {\n    const response = await fetch(`/api/users/${id}`);\n    return response.json();\n}",
      new_string: "async function fetchUser(id) {\n    try {\n        const response = await fetch(`/api/users/${id}`);\n        if (!response.ok) throw new Error('User not found');\n        return response.json();\n    } catch (error) {\n        console.error('Error fetching user:', error);\n        throw error;\n    }\n}"
    },
    // Similar for other functions...
  ]
})
```

### Update TypeScript Interfaces
```typescript
await MultiEdit({
  file_path: "/project/types.ts",
  edits: [
    {
      old_string: "interface User {\n    id: number;\n    name: string;\n}",
      new_string: "interface User {\n    id: number;\n    name: string;\n    email: string;\n}"
    },
    {
      old_string: "interface Product {\n    id: number;\n    title: string;\n}",
      new_string: "interface Product {\n    id: number;\n    title: string;\n    price: number;\n}"
    }
  ]
})
```

## Best Practices

1. **Read file first**: Always use Read tool before MultiEdit
2. **Order matters**: Plan edit sequence carefully
3. **Test mentally**: Think through how each edit affects the next
4. **Group related changes**: Use MultiEdit for cohesive changes
5. **Avoid overlapping**: Ensure edits don't interfere with each other

## Error Scenarios

### Edit Conflicts
```typescript
// WRONG - Second edit won't find the text
await MultiEdit({
  file_path: "/project/test.js",
  edits: [
    {
      old_string: "const value = 'old';",
      new_string: "const newValue = 'new';"
    },
    {
      old_string: "console.log(value);",  // 'value' no longer exists!
      new_string: "console.log(newValue);"
    }
  ]
})

// CORRECT - Account for changes
await MultiEdit({
  file_path: "/project/test.js",
  edits: [
    {
      old_string: "value",
      new_string: "newValue",
      replace_all: true  // Changes all occurrences
    }
  ]
})
```

### Atomic Failure
```typescript
// If ANY edit fails, NO edits are applied
await MultiEdit({
  file_path: "/project/config.js",
  edits: [
    {
      old_string: "port: 3000",
      new_string: "port: 4000"
    },
    {
      old_string: "host: 'localhost'",  // If this doesn't match exactly...
      new_string: "host: '0.0.0.0'"
    },
    {
      old_string: "debug: false",      // ...this won't be applied either
      new_string: "debug: true"
    }
  ]
})
```

## MultiEdit vs Edit

### Use MultiEdit When:
- Making multiple changes to the same file
- Changes are related or part of same feature
- Want atomic operation (all or nothing)
- Avoiding multiple file reads/writes

### Use Edit When:
- Making a single change
- Changes to different files
- Need to verify between edits
- Simple one-off modifications

## Performance Benefits

```typescript
// Inefficient - Multiple Edit calls
await Edit({ file_path: "/file.js", old_string: "a", new_string: "b" })
await Edit({ file_path: "/file.js", old_string: "c", new_string: "d" })
await Edit({ file_path: "/file.js", old_string: "e", new_string: "f" })

// Efficient - Single MultiEdit
await MultiEdit({
  file_path: "/file.js",
  edits: [
    { old_string: "a", new_string: "b" },
    { old_string: "c", new_string: "d" },
    { old_string: "e", new_string: "f" }
  ]
})
```

## Important Notes

- All edits must have exact matches (including whitespace)
- Edits are applied sequentially, not in parallel
- File is read once, written once (efficient)
- No partial application - all succeed or all fail
- Same formatting rules as Edit tool apply
- For Jupyter notebooks, use NotebookEdit instead