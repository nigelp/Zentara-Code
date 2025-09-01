# Write Tool

## Original Function Definition

```json
{
  "description": "Writes a file to the local filesystem.\n\nUsage:\n- This tool will overwrite the existing file if there is one at the provided path.\n- If this is an existing file, you MUST use the Read tool first to read the file's contents. This tool will fail if you did not read the file first.\n- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.\n- NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.\n- Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked.",
  "name": "Write",
  "parameters": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "properties": {
      "content": {
        "description": "The content to write to the file",
        "type": "string"
      },
      "file_path": {
        "description": "The absolute path to the file to write (must be absolute, not relative)",
        "type": "string"
      }
    },
    "required": ["file_path", "content"],
    "type": "object"
  }
}
```

## Detailed Description

The Write tool creates new files or completely replaces the contents of existing files. It requires reading existing files first and should be used sparingly - prefer Edit or MultiEdit for modifying existing files.

## Key Requirements

1. **Must Read existing files first**: Required before overwriting
2. **Absolute paths only**: No relative paths allowed
3. **Prefer editing**: Use Edit/MultiEdit for existing files
4. **No proactive documentation**: Don't create docs unless asked
5. **No emojis**: Unless explicitly requested

## When to Use Write

### Appropriate Uses:
- Creating genuinely new files when required
- Completely replacing file contents
- Creating files from templates
- Writing generated code files
- Creating config files that don't exist

### When NOT to Use:
- Modifying existing files (use Edit/MultiEdit)
- Making small changes (use Edit)
- Creating documentation unless asked
- Adding files proactively

## Examples

### Creating New Files
```typescript
// Create a new component file
await Write({
  file_path: "/project/src/components/Button.jsx",
  content: `import React from 'react';

export function Button({ label, onClick }) {
    return (
        <button onClick={onClick}>
            {label}
        </button>
    );
}
`
})

// Create a new test file
await Write({
  file_path: "/project/tests/button.test.js",
  content: `import { render, fireEvent } from '@testing-library/react';
import { Button } from '../src/components/Button';

describe('Button', () => {
    it('renders with label', () => {
        const { getByText } = render(<Button label="Click me" />);
        expect(getByText('Click me')).toBeInTheDocument();
    });
});
`
})
```

### Creating Configuration Files
```typescript
// Create .env file
await Write({
  file_path: "/project/.env",
  content: `NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://localhost:5432/myapp
`
})

// Create tsconfig.json
await Write({
  file_path: "/project/tsconfig.json",
  content: JSON.stringify({
    compilerOptions: {
      target: "es2020",
      module: "commonjs",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true
    }
  }, null, 2)
})
```

### Replacing Entire File Contents
```typescript
// First, read the existing file
await Read({
  file_path: "/project/src/old-implementation.js"
})

// Then completely rewrite it
await Write({
  file_path: "/project/src/old-implementation.js",
  content: `// Completely new implementation
export class NewImplementation {
    constructor() {
        this.version = 2;
    }

    process(data) {
        // New logic here
        return data.map(item => item * 2);
    }
}
`
})
```

### Creating Generated Files
```typescript
// Generate a constants file
const constants = {
  API_VERSION: "v2",
  MAX_RETRIES: 3,
  TIMEOUT: 5000
};

await Write({
  file_path: "/project/src/generated/constants.js",
  content: `// Auto-generated file
export const CONSTANTS = ${JSON.stringify(constants, null, 2)};
`
})
```

## Common Patterns

### Creating Module Structure
```typescript
// Create index file for exports
await Write({
  file_path: "/project/src/utils/index.js",
  content: `export { formatDate } from './date-utils';
export { parseJSON } from './json-utils';
export { validateEmail } from './validators';
`
})
```

### Writing JSON Files
```typescript
// Create package.json
await Write({
  file_path: "/project/package.json",
  content: JSON.stringify({
    name: "my-project",
    version: "1.0.0",
    description: "My new project",
    main: "index.js",
    scripts: {
      start: "node index.js",
      test: "jest"
    },
    dependencies: {
      express: "^4.18.0"
    }
  }, null, 2)
})
```

### Creating Script Files
```typescript
// Create build script
await Write({
  file_path: "/project/scripts/build.sh",
  content: `#!/bin/bash
set -e

echo "Building project..."
npm run lint
npm run test
npm run compile

echo "Build complete!"
`
})
```

## Anti-Patterns (What NOT to Do)

### Don't Create Documentation Proactively
```typescript
// DON'T do this unless asked:
await Write({
  file_path: "/project/README.md",
  content: "# Project Documentation\n..."
})

// DON'T create these without request:
// - CONTRIBUTING.md
// - CHANGELOG.md
// - docs/*.md
```

### Don't Use for Small Edits
```typescript
// DON'T read entire file and rewrite for small change
const content = await Read({ file_path: "/project/config.js" })
const modified = content.replace("false", "true")
await Write({ file_path: "/project/config.js", content: modified })

// DO use Edit instead:
await Edit({
  file_path: "/project/config.js",
  old_string: "debug: false",
  new_string: "debug: true"
})
```

### Don't Add Emojis
```typescript
// DON'T add emojis unless requested:
await Write({
  file_path: "/project/status.md",
  content: "# Status 🚀\n\n✅ Complete"  // Don't do this!
})

// DO write plain text:
await Write({
  file_path: "/project/status.md",
  content: "# Status\n\nComplete"
})
```

## Error Handling

### Common Errors
```typescript
// Permission denied
await Write({
  file_path: "/etc/passwd",  // System file
  content: "..."
})
// Error: Permission denied

// Invalid path
await Write({
  file_path: "relative/path.js",  // Not absolute
  content: "..."
})
// Error: Path must be absolute

// Directory doesn't exist
await Write({
  file_path: "/project/nonexistent/dir/file.js",
  content: "..."
})
// Error: Directory does not exist
```

## Write vs Edit vs MultiEdit

### Decision Matrix

| Scenario | Use Tool |
|----------|----------|
| Create new file | Write |
| Replace entire file | Write (after Read) |
| Modify part of file | Edit |
| Multiple changes to same file | MultiEdit |
| Add line to file | Edit |
| Change configuration value | Edit |
| Generate new code file | Write |

### Examples

```typescript
// Creating new file → Write
await Write({
  file_path: "/project/new-feature.js",
  content: "export function newFeature() { ... }"
})

// Modifying existing → Edit
await Edit({
  file_path: "/project/existing.js",
  old_string: "oldFunction",
  new_string: "newFunction"
})

// Multiple changes → MultiEdit
await MultiEdit({
  file_path: "/project/refactor.js",
  edits: [
    { old_string: "var", new_string: "const" },
    { old_string: "require", new_string: "import" }
  ]
})
```

## Best Practices

1. **Always check first**: Use Read on existing files
2. **Prefer Edit**: Use Edit/MultiEdit for modifications
3. **Create purposefully**: Only create files when needed
4. **No surprise files**: Don't create unexpected documentation
5. **Use appropriate formatting**: JSON.stringify for JSON files

## File Creation Workflow

```typescript
// 1. Check if file exists
try {
  await Read({ file_path: "/project/src/new-file.js" })
  // File exists - consider using Edit instead
} catch {
  // File doesn't exist - safe to create
}

// 2. Create the file
await Write({
  file_path: "/project/src/new-file.js",
  content: "// New file content"
})

// 3. Verify creation
await Read({ file_path: "/project/src/new-file.js" })
```

## Important Notes

- Write completely replaces file contents
- No merge or append functionality
- Parent directory must exist
- Changes are immediate and permanent
- No undo functionality
- Large files are handled efficiently