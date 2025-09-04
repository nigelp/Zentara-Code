import { ToolArgs } from "./types"

export function getGlobDescription(args: ToolArgs): string {
	return `## glob
Description: Fast file pattern matching tool that finds files by their names/paths without reading their contents. This tool uses glob patterns to efficiently discover files matching specific criteria. Returns matching file paths sorted by modification time (newest first). Use this tool when you need to find files by patterns rather than searching their contents.

**⚠️ IMPORTANT RESTRICTION: This tool can ONLY be used by subagents. Main agents are prohibited from using this tool directly. If you are a main agent, you MUST use the subagent tool to delegate search operations to subagents instead.**

Key benefits:
- Optimized for filename and path pattern matching
- Returns files sorted by modification time (newest first)
- Supports complex glob patterns for precise matching
- Automatically excludes common directories (node_modules, .git, dist, build, etc.)
- You can run multiple glob searches in parallel for better performance
- Excellent for project structure exploration and file enumeration

When to use:
- Finding files by extension or name pattern
- Locating test files, config files, or specific modules
- Discovering project structure
- Finding recently modified files
- File structure exploration and organization analysis

When to use search_files instead:
- Content-based discovery (finding files containing specific patterns)
- Complex regex searches within file contents
- Code analysis requiring context around matches
- Finding files by what they contain, not what they're named
- Semantic searches (function definitions, import statements)

When NOT to use either:
- For open-ended searches requiring multiple rounds → Use subagent tool
- For simple directory listing → Use list_files tool

Parameters:
- pattern: (required) The glob pattern to match files against. Uses standard glob syntax.
- path: (optional) The directory to search in (relative to ${args.cwd}). If not provided, searches from the current workspace root. IMPORTANT: Omit this field to use the default directory. DO NOT enter "undefined" or "null" - simply omit it.
- head_limit: (optional) The maximum number of file paths to return. Defaults to 100, with a maximum of 500.

Pattern syntax:
- * - Matches any characters except path separators
- ** - Matches any characters including path separators (recursive)
- ? - Matches exactly one character
- [abc] - Matches any character in brackets
- [!abc] - Matches any character NOT in brackets
- {a,b,c} - Matches any of the comma-separated patterns

Common patterns:
- *.js - All JavaScript files in current directory
- **/*.ts - All TypeScript files recursively
- src/**/*.test.js - All test files under src
- **/*.{js,ts,jsx,tsx} - All JavaScript and TypeScript files
- **/[A-Z]*.tsx - All React components (capitalized)
- **/{package.json,tsconfig.json} - Multiple specific files

Usage:
<glob>
<pattern>Your glob pattern here</pattern>
<path>Directory path (optional)</path>
</glob>

Examples:

1. Find all TypeScript files in the project:
<glob>
<pattern>**/*.ts</pattern>
</glob>

2. Find all test files:
<glob>
<pattern>**/*.{test,spec}.{js,ts,jsx,tsx}</pattern>
</glob>

3. Find all React components:
<glob>
<pattern>**/components/**/*.{jsx,tsx}</pattern>
</glob>

4. Find all configuration files:
<glob>
<pattern>**/{package.json,tsconfig.json,.eslintrc*,.prettierrc*}</pattern>
</glob>

5. Find files in specific directories:
<glob>
<pattern>{src,lib,test}/**/*.js</pattern>
</glob>

6. Find React hooks:
<glob>
<pattern>**/use*.{js,ts,jsx,tsx}</pattern>
</glob>

7. Find all index files:
<glob>
<pattern>**/index.{js,ts,jsx,tsx}</pattern>
</glob>

Performance tips:
- Be specific: More specific patterns are faster
- Limit scope: Use the path parameter to narrow search
- Batch operations: Run multiple globs in parallel when searching for different patterns
- Avoid over-broad patterns: **/* is slower than specific patterns like **/*.js

Best practices:
- Start with specific patterns, broaden if needed
- Include file extensions for faster matching
- Use {a,b,c} syntax to combine multiple options in one search
- Consider using multiple parallel glob searches for different file types

Note: Results are automatically sorted by modification time (newest first) and limited to prevent overwhelming output. Common directories like node_modules, .git, dist, build, coverage, .vscode, .next, .nuxt, .cache, and vendor are automatically excluded.`
}
