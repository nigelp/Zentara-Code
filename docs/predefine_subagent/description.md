# Predefined Subagent Tool Design Specification

## Overview

The `predefined_agent_tool` enhances the existing subagent system by providing specialized, pre-configured subagents for common development tasks. Instead of manually crafting subagent prompts every time, users can leverage pre-built specialists optimized for specific scenarios.

## Tool Parameters

The `predefined_agent_tool` accepts the following parameters:

```typescript
interface PredefinedAgentParams {
  description: string;     // Short (3-5 word) description of the task
  prompt: string;          // The specific task for the agent to perform
  subagent_type: string;   // The type of specialized agent to use
}
```

### Parameter Details

- **`description`**: A concise summary of what the task accomplishes
- **`prompt`**: Detailed instructions for the specific task instance
- **`subagent_type`**: References a predefined agent configuration (see Agent Definition Format)

## Agent Definition Formats

### System Agents (TypeScript Format)

System agents are defined as TypeScript files in `src/roo_subagent/src/agents/`:

```typescript
export interface SystemAgentDefinition {
  name: string;
  description: string;
  tools?: string[];
  systemPrompt: string;
}

export const agentCreatorAgent: SystemAgentDefinition = {
  name: "agent-creator",
  description: "Specialized agent for creating new predefined agents with proper formatting and best practices",
  tools: ["write_to_file", "read_file", "list_files"],
  systemPrompt: `
You are an expert at creating predefined agent definitions for the Zentara code assistant.

Your role is to help create new specialized agents by:
1. Understanding the requested agent's purpose and domain
2. Defining appropriate tool restrictions
3. Crafting effective system prompts
4. Following naming conventions and best practices

When creating agents, ensure:
- Clear, specific system prompts
- Appropriate tool limitations
- Consistent naming (lowercase-with-hyphens)
- Comprehensive descriptions
  `
};
```

### User-Defined Agents (Markdown Format)

User agents are stored as Markdown files with YAML frontmatter:

```markdown
---
name: agent-identifier
description: Natural language description of when this agent should be used
tools: tool1, tool2, tool3  # Optional - inherits all tools if omitted
---

System prompt content for the specialized subagent.

This section defines the agent's:
- Role and expertise area
- Approach to problem-solving
- Specific instructions and best practices
- Constraints and limitations
```

### Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique identifier using lowercase letters and hyphens |
| `description` | Yes | Clear explanation of the agent's purpose and use cases |
| `tools` | No | Comma-separated tool list. If omitted, inherits all available tools |
| `systemPrompt` | Yes (TS only) | The system prompt content for TypeScript agents |

## Agent Discovery Locations

The extension searches for predefined agents in the following locations (in order of precedence):

1. **System agents** (highest priority): `src/roo_subagent/src/agents/` - Built-in TypeScript agents
2. **Project-specific**: `.zentara/agents/` (relative to workspace root) - Markdown agents
3. **User-global**: `~/.zentara/agents/` (user's home directory) - Markdown agents

### Agent Types and Formats

#### System Agents (.ts files)
- **Location**: `src/roo_subagent/src/agents/`
- **Format**: TypeScript files with exported agent definitions
- **Priority**: Highest (cannot be overridden by user agents)
- **Purpose**: Core system functionality like agent creation helpers, debugging assistants
- **Examples**: `agent-creator.ts`, `system-diagnostics.ts`

#### User-Defined Agents (.md files)
- **Locations**: `.zentara/agents/` (project) and `~/.zentara/agents/` (global)
- **Format**: Markdown files with YAML frontmatter
- **Priority**: Project agents override global agents with the same name
- **Purpose**: Custom workflows, project-specific tools, personal utilities

This hierarchy ensures system agents are always available while allowing user customization and project-specific extensions.

## Example Agent Definitions

### System Agent Example (TypeScript)

```typescript
// src/roo_subagent/src/agents/agent-creator.ts
export const agentCreatorAgent: SystemAgentDefinition = {
  name: "agent-creator",
  description: "Specialized agent for creating new predefined agents with proper formatting and best practices",
  tools: ["write_to_file", "read_file", "list_files", "apply_diff"],
  systemPrompt: `
You are an expert at creating predefined agent definitions for the Zentara code assistant.

## Your Responsibilities
- Help users create new specialized agents
- Ensure proper formatting and conventions
- Provide guidance on effective system prompts
- Validate agent configurations

## Creation Process
1. Understand the requested agent's purpose and domain
2. Determine appropriate tool restrictions
3. Craft clear, specific system prompts
4. Follow naming conventions (lowercase-with-hyphens)
5. Create comprehensive descriptions

## Best Practices
- Keep system prompts focused and actionable
- Limit tools to only what's necessary for the agent's role
- Include specific examples and workflows
- Test prompts with realistic scenarios

When creating user agents, save them as Markdown files in the appropriate location (.zentara/agents/ for project-specific, ~/.zentara/agents/ for global).
  `
};
```

### User Agent Example (Markdown)

```markdown
---
name: code-reviewer
description: Expert code review specialist for quality, security, and maintainability analysis
tools: glob, search_files, lsp_get_document_symbols, lsp_find_usages
---

You are a senior code reviewer with expertise in identifying code quality issues, security vulnerabilities, and maintainability concerns.

## Your Role
- Perform thorough code analysis using LSP tools for precision
- Focus on modified files and their dependencies
- Provide actionable, prioritized feedback

## Review Process
1. Use `glob` to identify recently modified files
2. Use `lsp_get_document_symbols` to understand code structure
3. Use `lsp_find_usages` to analyze impact of changes
4. Search for common anti-patterns and security issues

## Review Criteria
### Critical Issues (Must Fix)
- Security vulnerabilities (exposed secrets, injection risks)
- Logic errors that could cause runtime failures
- Breaking API changes without proper versioning

### Warnings (Should Fix)
- Code duplication and maintainability issues
- Missing error handling
- Performance bottlenecks

### Suggestions (Consider Improving)
- Code style and readability improvements
- Optimization opportunities
- Better naming conventions

## Output Format
Organize findings by priority level with specific line references and suggested fixes.
```

## Tool Implementation Workflow

### 1. Agent Type Resolution
- Parse the `subagent_type` parameter
- Search discovery locations for matching agent file
- Load and parse the agent definition

### 2. Prompt Construction
- Extract the system prompt from the agent definition
- Combine with the user-provided `prompt` parameter
- Apply any tool restrictions specified in the agent config

### 3. Subagent Execution
- Create subagent instance with enhanced prompt
- Apply tool restrictions if specified
- Execute using existing subagent infrastructure

### 4. System Prompt Integration
The main system prompt includes a dynamically generated section listing all available predefined agents by category:

```
## Available Predefined Agents

### System Agents (Built-in)
- **agent-creator**: Specialized agent for creating new predefined agents with proper formatting
- **system-diagnostics**: Debug and analyze system issues and performance

### Project Agents
- **code-reviewer**: Expert code review specialist for quality, security, and maintainability analysis
- **api-documenter**: Generate comprehensive API documentation from code

### Global Agents
- **test-generator**: Specialized in creating comprehensive test suites for various frameworks
- **documentation-writer**: Focused on generating clear, comprehensive documentation
```

## Implementation Strategy

### Phase 1: Core Infrastructure
1. Create agent file parser for Markdown + YAML frontmatter
2. Implement agent discovery system
3. Build prompt composition logic

### Phase 2: Tool Integration
1. Extend existing subagent tool to support predefined types
2. Add system prompt generation for available agents
3. Implement tool restriction enforcement

### Phase 3: Agent Libraries
1. **System Agents**: Create built-in TypeScript agents for core functionality
   - Agent creation helper
   - System diagnostics and debugging
   - Extension management utilities
2. **Default User Agents**: Provide example Markdown agents for common tasks
3. Add comprehensive documentation and examples
4. Test with real-world scenarios

## Benefits

### For Users
- **Consistency**: Standardized approaches to common tasks
- **Efficiency**: No need to craft prompts for routine operations
- **Quality**: Pre-tested, optimized agent configurations
- **Customization**: Project-specific and personal agent libraries

### For Development Teams
- **Standardization**: Shared best practices across team members
- **Onboarding**: New team members get proven workflows immediately
- **Maintenance**: Centralized updates to improve all usages

## Technical Considerations

### Error Handling
- Graceful fallback when agent definitions are malformed
- Clear error messages for missing or invalid agent types
- Validation of agent configuration syntax

### Performance
- Cache parsed agent definitions to avoid repeated file I/O
- Lazy loading of agent configurations
- Efficient directory scanning

### Security
- Validate agent definition sources
- Sanitize system prompts to prevent injection attacks
- Respect file system permissions and access controls

## Migration Path

This tool extends rather than replaces the existing subagent system. Users can:
- Continue using ad-hoc subagents for unique tasks
- Gradually adopt predefined agents for routine operations
- Mix both approaches within the same project

The implementation maintains full backward compatibility with existing subagent usage patterns.