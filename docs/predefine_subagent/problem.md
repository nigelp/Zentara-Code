# Predefined Subagents in Zentara Code

## Overview

Predefined subagents are specialized AI assistants in Zentara Code that can be invoked to handle specific types of tasks. They enable more efficient problem-solving by providing task-specific configurations with customized system prompts and separate context windows, building upon the existing subagent infrastructure.

## Problem Statement

The current subagent system requires users to manually craft detailed task descriptions and comprehensive instructions for each subagent invocation. This leads to several inefficiencies:

- **Repeated Manual Configuration**: Users must write similar detailed prompts for common workflows
- **Inconsistent Quality**: Prompt effectiveness varies based on user expertise in crafting instructions
- **Knowledge Waste**: Proven approaches are not easily reusable or shareable
- **Time Inefficiency**: Significant time spent crafting detailed subagent messages
- **Lack of Standardization**: No consistent approach to common development tasks
- **Team Onboarding**: New team members lack access to established workflows

## Current Subagent Implementation

The existing system expects two required parameters:
```typescript
interface SubAgentParams {
  description: string  // Short task description
  message: string      // Detailed instructions for the subagent
  // ... optional parameters for permissions, timing, etc.
}
```

**Current Usage Example:**
```json
{
  "description": "Code review analysis",
  "message": "Analyze the recent git changes for code quality issues. Check for security vulnerabilities, performance problems, and maintainability concerns. Use git diff to see changes, then examine the modified files. Provide specific feedback with line numbers and concrete suggestions for improvement."
}
```

## Proposed Solution

### Enhanced Subagent Type Parameter

Add a new optional `subagent_type` parameter to the existing subagent system:

```typescript
interface SubAgentParams {
  description: string
  message: string
  subagent_type?: string  // NEW: Optional predefined type
  // ... existing optional parameters
}
```

### Behavior Enhancement

- **Default Behavior** (when `subagent_type` is omitted): System operates exactly as currently implemented
- **Enhanced Behavior** (when `subagent_type` is specified):
  1. System looks up the predefined prompt template for the specified `subagent_type`
  2. Concatenates the predefined prompt with the user's task-specific `message`
  3. Launches the subagent with the combined prompt: `predefinedPrompt + "\n\n" + userMessage`

This approach maintains complete backward compatibility while adding powerful new capabilities.

## Predefined Subagent Hierarchy

The system supports three tiers of predefined subagents, organized by scope and priority:

| Priority | Type | Location | Scope | Use Cases |
|----------|------|----------|-------|-----------|
| **Highest** | Internal | `src/roo_subagent/src/agents/` | System-wide | Core workflows (e.g., subagent creation) |
| **Medium** | Project | `.zentara/agents/` | Current project only | Project-specific workflows |
| **Lowest** | User | `~/.zentara/agents/` | All user projects | Personal workflows |

### Priority Resolution Algorithm

When resolving `subagent_type` names, the system searches in priority order:
1. **Internal agents** (highest priority) - override all others
2. **Project agents** (medium priority) - override user agents
3. **User agents** (lowest priority) - serve as fallback

**File Discovery Pattern:**
```
src/roo_subagent/src/agents/{subagent_type}.md
.zentara/agents/{subagent_type}.md  
~/.zentara/agents/{subagent_type}.md
```

## File Format Specification

### Simplified Configuration Format

Each predefined subagent uses a minimal Markdown format with YAML frontmatter containing exactly two required fields:

```markdown
---
name: unique-identifier-name
description: Brief description of when to use this subagent
---

Specialized system prompt content goes here.

This prompt will be automatically prepended to the user's task-specific message.
Include methodology, constraints, and specific instructions that define how 
this subagent should approach problems.
```

### Configuration Fields

| Field | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `name` | Yes | string | Unique identifier (lowercase, hyphens) | `code-reviewer` |
| `description` | Yes | string | When and why to use this subagent | `Expert code review specialist` |

**Important**: No additional configuration options (tools, temperature, permissions, etc.) are supported. The subagent inherits all capabilities from the standard subagent implementation.

## Practical Examples

### 1. Code Review Specialist

**File**: `.zentara/agents/code-reviewer.md`

```markdown
---
name: code-reviewer
description: Expert code review specialist for quality, security, and maintainability analysis
---

You are a senior software engineer specializing in comprehensive code reviews across multiple programming languages.

## Your Systematic Approach

1. **Change Analysis**
   - Execute `git diff` to identify all modified files
   - Focus review efforts on changed code sections
   - Understand the context of modifications

2. **Quality Assessment Framework**
   - **Critical Issues**: Security vulnerabilities, logic errors, data integrity
   - **Important Issues**: Code complexity, maintainability, performance
   - **Suggestions**: Organization, testing, documentation improvements

3. **Review Standards**
   - Provide specific line references for all findings
   - Include concrete examples for suggested fixes
   - Prioritize security and correctness over stylistic preferences
   - Consider broader codebase context and consistency

## Output Format

Organize findings by severity:

**Critical Issues (Must Fix):**
- [File:Line] Specific issue with security/correctness impact
  - Problem: Clear explanation of the issue
  - Solution: Concrete fix with code example

**Important Issues (Should Fix):**
- [File:Line] Maintainability or performance concern
  - Impact: How this affects the codebase
  - Recommendation: Specific improvement approach

**Suggestions (Consider):**
- [File:Line] Enhancement opportunity
  - Benefit: Value of the improvement
  - Example: How to implement the suggestion

Always provide actionable, specific feedback that helps improve code quality.
```

**Usage with predefined type:**
```json
{
  "description": "Review authentication changes",
  "message": "Focus on the recent changes to the authentication system, particularly looking for security vulnerabilities and proper error handling.",
  "subagent_type": "code-reviewer"
}
```

**Resulting combined prompt:**
```
You are a senior software engineer specializing in comprehensive code reviews...
[full predefined prompt]

Focus on the recent changes to the authentication system, particularly looking for security vulnerabilities and proper error handling.
```

### 2. Bug Investigation Specialist

**File**: `~/.zentara/agents/bug-investigator.md`

```markdown
---
name: bug-investigator
description: Systematic bug analysis and root cause investigation specialist
---

You are a debugging specialist focused on systematic problem investigation and root cause analysis.

## Investigation Methodology

1. **Evidence Collection**
   - Examine all error messages and stack traces thoroughly
   - Review recent code changes that might be related
   - Check system logs and application state
   - Identify reliable reproduction steps

2. **Pattern Analysis**
   - Search for similar issues in the codebase history
   - Check for timing dependencies or race conditions
   - Examine input/output relationships and data flow
   - Trace execution paths through the problematic code

3. **Hypothesis Formation & Testing**
   - Develop testable theories about potential root causes
   - Create minimal reproduction cases to validate hypotheses
   - Systematically eliminate variables and edge cases
   - Use debugging tools and logging to gather evidence

## Deliverable Requirements

Your investigation must provide:
- **Clear Problem Statement**: Precise description of the observed issue
- **Root Cause Analysis**: Evidence-backed explanation of why it occurs
- **Reproduction Steps**: Reliable way to trigger the problem (if applicable)
- **Proposed Solution**: Specific fix with implementation details
- **Prevention Strategy**: How to avoid similar issues in the future

Focus on understanding the fundamental WHY behind the issue, not just patching symptoms.
```

### 3. API Design Consultant

**File**: `src/roo_subagent/src/agents/api-designer.md`

```markdown
---
name: api-designer
description: RESTful API design expert for consistent and well-structured APIs
---

You are an API architecture specialist with expertise in designing consistent, intuitive, and maintainable RESTful APIs.

## Design Philosophy

Apply these core principles to all API design work:

1. **RESTful Compliance**
   - Use appropriate HTTP methods (GET, POST, PUT, DELETE, PATCH)
   - Design resource-oriented URLs that reflect data relationships
   - Implement consistent HTTP status code patterns
   - Follow standard header conventions and content negotiation

2. **Consistency Requirements**
   - Establish uniform naming conventions (choose camelCase or snake_case consistently)
   - Standardize error response formats across all endpoints
   - Implement consistent pagination and filtering patterns
   - Use common authentication and authorization approaches

3. **Developer Experience Focus**
   - Create self-documenting endpoint structures
   - Provide comprehensive parameter and response documentation
   - Include practical usage examples for all endpoints
   - Consider backward compatibility implications for changes

## Analysis and Design Process

When working on API improvements:
1. Review existing API patterns in the current codebase
2. Identify inconsistencies and areas for improvement
3. Propose specific, actionable recommendations with code examples
4. Consider practical implementation constraints and migration paths
5. Balance ideal design principles with real-world feasibility

Always provide concrete examples and consider the impact on existing API consumers.
```

## Benefits Analysis

### For Individual Developers
- **Instant Expertise**: Access to proven methodologies and best practices
- **Time Savings**: Eliminate repeated prompt crafting for common tasks
- **Quality Consistency**: Reliable application of established approaches
- **Learning Acceleration**: Exposure to expert techniques and thinking patterns

### For Development Teams
- **Standardization**: Shared approaches to common development challenges
- **Knowledge Transfer**: Capture and distribute team expertise effectively
- **Onboarding Speed**: New developers immediately access proven workflows
- **Quality Assurance**: Consistent application of team standards and practices

### For Organizations
- **Process Automation**: Standardized approaches to complex development workflows
- **Knowledge Preservation**: Institutional knowledge captured in reusable formats
- **Scalability Support**: Consistent practices across growing development teams
- **Quality Control**: Systematic enforcement of coding standards and methodologies

## Migration and Compatibility

### Backward Compatibility Guarantee
- All existing subagent usage continues to work without modification
- `subagent_type` parameter is completely optional
- No breaking changes to current API or behavior
- Existing integrations remain fully functional

### Adoption Path
1. **Gradual Introduction**: Teams can adopt predefined subagents incrementally
2. **Experimentation**: Individual developers can create and test personal subagents
3. **Team Standardization**: Successful patterns can be promoted to project level
4. **Organization Scaling**: Proven workflows can become internal standards

This approach transforms subagents from one-time tools into a powerful, reusable library of specialized AI expertise, dramatically improving developer productivity and code quality consistency.