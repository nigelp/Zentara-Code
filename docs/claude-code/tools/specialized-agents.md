# Specialized Agents via Task Tool

## Overview

Specialized Agents are autonomous AI agents that can be launched to handle specific, complex tasks independently. They work like sub-assistants that you delegate work to, executing autonomously and returning a final report.

## System Prompt Definition

```
Launch a new agent to handle complex, multi-step tasks autonomously. 

Available agent types and the tools they have access to:
- general-purpose: General-purpose agent for researching complex questions, searching for code, and executing multi-step tasks. When you are searching for a keyword or file and are not confident that you will find the right match in the first few tries use this agent to perform the search for you. (Tools: *)
- statusline-setup: Use this agent to configure the user's Claude Code status line setting. (Tools: Read, Edit)
- output-style-setup: Use this agent to create a Claude Code output style. (Tools: Read, Write, Edit, Glob, LS, Grep)
- ultra-debugger: Use this agent when you encounter complex, hard-to-diagnose bugs that require deep codebase analysis and systematic debugging approaches. This includes: mysterious runtime errors, race conditions, memory leaks, performance bottlenecks, inconsistent behavior across environments, or bugs that have stumped other debugging attempts. (Tools: *)

When using the Task tool, you must specify a subagent_type parameter to select which agent type to use.
```

## Task Tool Parameters

```json
{
  "description": "A short (3-5 word) description of the task",
  "prompt": "The task for the agent to perform",
  "subagent_type": "The type of specialized agent to use for this task"
}
```

## Available Agent Types

### 1. general-purpose
- **Purpose**: General-purpose agent for researching complex questions, searching for code, and executing multi-step tasks
- **Tools**: All tools (*)
- **When to use**: When searching for a keyword or file and not confident about finding the right match in the first few tries
- **Example use cases**:
  - Extensive codebase exploration
  - Multi-file pattern searching
  - Complex research tasks requiring multiple search rounds

### 2. statusline-setup
- **Purpose**: Configure Claude Code's status line settings
- **Tools**: Read, Edit
- **When to use**: When customizing how Claude Code displays status information
- **Example use cases**:
  - Modifying status line appearance
  - Changing status information display

### 3. output-style-setup
- **Purpose**: Create custom output styles for Claude Code
- **Tools**: Read, Write, Edit, Glob, LS, Grep
- **When to use**: When defining how Claude Code formats its responses
- **Example use cases**:
  - Creating custom output formats
  - Modifying response styling

### 4. ultra-debugger
- **Purpose**: Deep analysis of complex, hard-to-diagnose bugs
- **Tools**: All tools (*)
- **When to use**: Complex debugging challenges that require systematic analysis
- **Example use cases**:
  - Intermittent crashes in production
  - Race conditions
  - Memory leaks
  - Performance bottlenecks
  - Inconsistent behavior across environments
  - Bugs that have stumped other debugging attempts

## Usage Notes

### Key Principles

1. **Launch multiple agents concurrently** whenever possible to maximize performance (use a single message with multiple tool uses)

2. **Agent communication is one-way**: The agent returns a single message back. The result is not visible to the user, so you must summarize it for them.

3. **Each invocation is stateless**: You cannot send additional messages to the agent, nor can the agent communicate outside of its final report.

4. **Provide detailed prompts**: Your prompt should contain a highly detailed task description and specify exactly what information the agent should return.

5. **Trust agent outputs**: The agent's outputs should generally be trusted.

6. **Specify intent clearly**: Tell the agent whether you expect it to write code or just do research, since it is not aware of the user's intent.

7. **Be proactive when appropriate**: If the agent description mentions proactive use, try to use it without the user having to ask first.

## When NOT to Use Task Tool

Avoid using the Task tool for:
- Reading specific file paths (use Read or Glob tools directly)
- Searching for specific class definitions like "class Foo" (use Glob tool)
- Searching within 2-3 specific files (use Read tool)
- Tasks unrelated to the agent descriptions

## Examples

### Example 1: Ultra-debugger for Production Crashes

**User**: "I'm getting intermittent crashes in production but can't reproduce them locally"

**Assistant**: "This sounds like a complex debugging challenge. Let me use the ultra-debugger agent to perform a deep analysis."

**Reasoning**: Since this is a difficult bug requiring deep investigation, use the Task tool to launch the ultra-debugger agent.

### Example 2: Ultra-debugger for Performance Issues

**User**: "Our API response times spike randomly but we can't figure out why"

**Assistant**: "I'll engage the ultra-debugger agent to conduct a thorough investigation of this performance issue."

**Reasoning**: Performance issues with unclear causes require the ultra-debugger's systematic approach.

### Example 3: General-purpose for Code Search

**User**: "Find all places where we handle authentication errors"

**Assistant launches general-purpose agent with**:
```json
{
  "description": "Search authentication error handling",
  "prompt": "Search the entire codebase for all locations where authentication errors are handled. Look for patterns like auth errors, authentication failures, 401 responses, unauthorized access, etc. Return a comprehensive list of all files and specific locations where these are handled.",
  "subagent_type": "general-purpose"
}
```

## Implementation Pattern

```python
# Launching a specialized agent
response = await task_tool.execute({
    "description": "Debug memory leak",  # 3-5 word description
    "prompt": """
        Investigate the reported memory leak in the application.
        Focus on:
        1. Identifying memory allocation patterns
        2. Finding potential leak sources
        3. Analyzing object retention
        
        Return a detailed report with:
        - Root cause analysis
        - Specific code locations
        - Recommended fixes
    """,
    "subagent_type": "ultra-debugger"
})

# Process and present results to user
summary = process_agent_response(response)
present_to_user(summary)
```

## Best Practices

1. **Detailed Prompts**: Since agents are stateless, include all necessary context and requirements in the initial prompt.

2. **Clear Success Criteria**: Specify exactly what constitutes a successful completion and what information should be returned.

3. **Parallel Execution**: When multiple independent analyses are needed, launch multiple agents concurrently.

4. **Result Processing**: Always process and summarize agent results for the user, as raw results aren't directly visible to them.

5. **Appropriate Agent Selection**: Choose the agent type that best matches the task requirements and available tools.