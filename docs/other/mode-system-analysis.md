# Roo Code Mode System Analysis

## Overview

The Roo Code extension implements a sophisticated mode system that allows the AI assistant to operate in different specialized contexts, each with specific capabilities, tool access, and behavioral patterns. This analysis examines the architecture, built-in modes, and operational mechanisms of this system.

## Architecture

### Core Components

1. **Mode Configuration (`ModeConfig`)**
   - Defined in `packages/types/src/mode.ts`
   - Contains: slug, name, roleDefinition, whenToUse, description, groups, customInstructions
   - Supports both built-in and custom modes

2. **Mode Management**
   - Located in `src/shared/modes.ts`
   - Handles mode discovery, validation, and tool permission management
   - Integrates built-in modes with custom user-defined modes

3. **Prompt Integration**
   - Mode information is injected into system prompts via `src/core/prompts/sections/modes.ts`
   - Dynamic mode listing based on available modes and user customizations

### Tool Group System

The system defines 8 tool groups that control what capabilities each mode has access to:

- **`read`**: File reading, searching, listing (read_file, search_files, list_files, etc.)
- **`edit`**: File modification (apply_diff, write_to_file, insert_content, search_and_replace)
- **`browser`**: Web interaction (browser_action)
- **`command`**: Terminal/CLI execution (execute_command)
- **`mcp`**: MCP (Model Context Protocol) tools
- **`modes`**: Mode switching and management tools
- **`debug`**: Debugging operations (debug launch, breakpoints, etc.)
- **`lsp`**: Language Server Protocol operations (code intelligence)

### File Restrictions

Modes can have granular file access control through regex patterns:
```typescript
["edit", { fileRegex: "\\.md$", description: "Markdown files only" }]
```

## Built-in Modes

### 1. 🏗️ Architect Mode (`architect`)
- **Purpose**: Planning, design, and strategy before implementation
- **Tool Groups**: `read`, `edit` (markdown only), `browser`, `mcp`, `lsp`
- **Key Features**:
  - Information gathering and context building
  - Todo list creation and management
  - Technical specification development
  - System architecture design
  - Mermaid diagram support
- **Workflow**: Gather info → Ask clarifying questions → Create todo list → Get approval → Switch to implementation mode

### 2. 💻 Code Mode (`code`)
- **Purpose**: Writing, modifying, and refactoring code
- **Tool Groups**: `read`, `edit`, `browser`, `command`, `mcp`, `lsp`
- **Key Features**:
  - Full file editing capabilities
  - Multi-language support
  - Code generation and refactoring
  - Terminal access for testing
  - LSP integration for intelligent code operations

### 3. ❓ Ask Mode (`ask`)
- **Purpose**: Answering questions and providing explanations
- **Tool Groups**: `read`, `browser`, `mcp`, `lsp`
- **Key Features**:
  - No editing capabilities (read-only)
  - Code analysis and explanation
  - Concept clarification
  - Technology recommendations
  - Mermaid diagram support for explanations

### 4. 🪲 Debug Mode (`debug`)
- **Purpose**: Systematic problem diagnosis and resolution
- **Tool Groups**: `read`, `edit`, `browser`, `command`, `mcp`, `debug`, `lsp`
- **Key Features**:
  - Debugging tool access
  - Systematic problem analysis (5-7 possible sources → 1-2 likely)
  - Logging and validation approach
  - Explicit diagnosis confirmation before fixes

### 5. 🪃 Orchestrator Mode (`orchestrator`)
- **Purpose**: Coordinating complex multi-step projects
- **Tool Groups**: `[]` (no direct tools - delegates to other modes)
- **Key Features**:
  - Task decomposition and delegation
  - Workflow coordination across modes
  - Progress tracking and synthesis
  - Strategic project management
  - Uses `new_task` tool to delegate to specialized modes

## Mode Switching Mechanism

### Switch Mode Tool
- Located in `src/core/prompts/tools/switch-mode.ts`
- Allows modes to request switching to another mode
- Requires user approval
- Parameters: `mode_slug` (required), `reason` (optional)

### New Task Tool
- Used by Orchestrator mode to delegate tasks
- Creates new task instances in specified modes
- Parameters: `mode` (target mode), `message` (task instructions)

## Custom Mode System

### Configuration Files
1. **Global**: `~/.zentara/settings/custom-modes.yaml`
2. **Project-specific**: `.roomodes` in workspace root
3. **Priority**: Project-specific overrides global

### Mode Creation Instructions
- Accessible via `fetch_instructions` tool with task `create_mode`
- Located in `src/core/prompts/instructions/create-mode.ts`
- Provides detailed YAML structure and examples

### Required Fields
- `slug`: Unique identifier (lowercase, hyphens allowed)
- `name`: Display name
- `roleDefinition`: Detailed role description
- `groups`: Array of allowed tool groups

### Optional Fields
- `description`: Short description (5 words recommended)
- `whenToUse`: Usage guidance for mode selection
- `customInstructions`: Additional behavioral instructions

## Permission System

### Tool Validation
- Implemented in `src/shared/modes.ts` (`isToolAllowedForMode`)
- Checks tool group membership
- Validates file restrictions for edit operations
- Throws `FileRestrictionError` for violations

### File Restriction Logic
- Supports regex patterns for file access control
- Applied to edit operations (apply_diff, write_to_file, etc.)
- Allows fine-grained control over what files modes can modify

## Integration Points

### System Prompt Generation
- Modes are dynamically listed in system prompts
- Uses `getAllModesWithPrompts()` to combine built-in and custom modes
- Includes mode descriptions and usage guidance

### Extension State Management
- Custom modes stored in VSCode extension global storage
- Workspace-specific modes override global settings
- Real-time mode discovery and validation

## Key Design Patterns

### 1. Separation of Concerns
Each mode has a specific purpose and limited scope, preventing feature creep and maintaining clarity.

### 2. Progressive Disclosure
Modes reveal capabilities gradually - Architect plans, Code implements, Debug fixes.

### 3. Tool Group Abstraction
Tool permissions are managed through groups rather than individual tools, simplifying configuration.

### 4. Extensibility
Custom modes allow users to create specialized workflows while maintaining system integrity.

### 5. Safety Through Restrictions
File restrictions and tool group limitations prevent accidental modifications and maintain security.

## Workflow Patterns

### Standard Development Flow
1. **Architect** → Plan and design
2. **Code** → Implement features
3. **Debug** → Fix issues
4. **Ask** → Get explanations

### Complex Project Flow
1. **Orchestrator** → Break down complex task
2. **Multiple specialized modes** → Execute subtasks
3. **Orchestrator** → Synthesize results

## Technical Implementation Details

### Mode Discovery
```typescript
// Combines built-in and custom modes with priority handling
const allModes = await getAllModesWithPrompts(context)
```

### Tool Permission Check
```typescript
// Validates tool usage against mode permissions
isToolAllowedForMode(toolName, params, mode, customModes)
```

### File Restriction Validation
```typescript
// Checks file access against regex patterns
doesFileMatchRegex(filePath, fileRegex)
```

## Benefits of the Mode System

1. **Clarity**: Each mode has a clear purpose and scope
2. **Safety**: Tool restrictions prevent unintended actions
3. **Flexibility**: Custom modes allow specialized workflows
4. **Efficiency**: Specialized modes optimize for specific tasks
5. **User Control**: Users can create and customize modes
6. **Scalability**: New modes can be added without affecting existing ones

## Conclusion

The Roo Code mode system represents a sophisticated approach to AI assistant specialization, providing both built-in expertise and user customization capabilities. The architecture successfully balances flexibility with safety, allowing for powerful workflows while maintaining clear boundaries and permissions.