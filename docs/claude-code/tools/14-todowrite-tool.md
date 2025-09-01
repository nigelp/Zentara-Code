# TodoWrite Tool

## Original Function Definition

```json
{
  "description": "Use this tool to create and manage a structured task list for your current coding session. This helps you track progress, organize complex tasks, and demonstrate thoroughness to the user.\nIt also helps the user understand the progress of the task and overall progress of their requests.\n\n## When to Use This Tool\nUse this tool proactively in these scenarios:\n\n1. Complex multi-step tasks - When a task requires 3 or more distinct steps or actions\n2. Non-trivial and complex tasks - Tasks that require careful planning or multiple operations\n3. User explicitly requests todo list - When the user directly asks you to use the todo list\n4. User provides multiple tasks - When users provide a list of things to be done (numbered or comma-separated)\n5. After receiving new instructions - Immediately capture user requirements as todos\n6. When you start working on a task - Mark it as in_progress BEFORE beginning work. Ideally you should only have one todo as in_progress at a time\n7. After completing a task - Mark it as completed and add any new follow-up tasks discovered during implementation\n\n## When NOT to Use This Tool\n\nSkip using this tool when:\n1. There is only a single, straightforward task\n2. The task is trivial and tracking it provides no organizational benefit\n3. The task can be completed in less than 3 trivial steps\n4. The task is purely conversational or informational\n\nNOTE that you should not use this tool if there is only one trivial task to do. In this case you are better off just doing the task directly.\n\n## Examples of When to Use the Todo List\n\n<example>\nUser: I want to add a dark mode toggle to the application settings. Make sure you run the tests and build when you're done!\nAssistant: I'll help add a dark mode toggle to your application settings. Let me create a todo list to track this implementation.\n*Creates todo list with the following items:*\n1. Create dark mode toggle component in Settings page\n2. Add dark mode state management (context/store)\n3. Implement CSS-in-JS styles for dark theme\n4. Update existing components to support theme switching\n5. Run tests and build process, addressing any failures or errors that occur\n*Begins working on the first task*\n\n<reasoning>\nThe assistant used the todo list because:\n1. Adding dark mode is a multi-step feature requiring UI, state management, and styling changes\n2. The user explicitly requested tests and build be run afterward\n3. The assistant inferred that tests and build need to pass by adding \"Ensure tests and build succeed\" as the final task\n</reasoning>\n</example>\n\n<example>\nUser: Help me rename the function getCwd to getCurrentWorkingDirectory across my project\nAssistant: Let me first search through your codebase to find all occurrences of 'getCwd'.\n*Uses grep or search tools to locate all instances of getCwd in the codebase*\nAssistant: I've found 15 instances of 'getCwd' across 8 different files. Let me create a todo list to track these changes.\n*Creates todo list with specific items for each file that needs updating*\n\n<reasoning>\nThe assistant used the todo list because:\n1. First, the assistant searched to understand the scope of the task\n2. Upon finding multiple occurrences across different files, it determined this was a complex task with multiple steps\n3. The todo list helps ensure every instance is tracked and updated systematically\n4. This approach prevents missing any occurrences and maintains code consistency\n</reasoning>\n</example>\n\n\n<example>\nUser: I need to implement these features for my e-commerce site: user registration, product catalog, shopping cart, and checkout flow.\nAssistant: I'll help implement these features. First, let's add all the features to the todo list.\n*Creates a todo list breaking down each feature into specific tasks based on the project architecture*\nAssistant: Let's start with user registration. This will involve creating database models, API endpoints, and frontend forms that integrate with your existing authentication system.\n\n<reasoning>\nThe assistant used the todo list because:\n1. The user provided multiple complex features to implement in a comma separated list\n2. The todo list helps organize these large features into manageable tasks\n3. This approach allows for tracking progress across the entire implementation\n</reasoning>\n</example>\n\n<example>\nUser: Can you help optimize my React application? It's rendering slowly and has performance issues.</user>\nAssistant: I'll help optimize your React application. First, let me examine your codebase to identify potential performance bottlenecks.\n*Reviews component structure, render patterns, state management, and data fetching*\nAssistant: After analyzing your codebase, I've identified several performance issues. Let me create a todo list to track our optimization efforts.\n*Creates todo list with items like: 1) Implement memoization for expensive calculations in ProductList, 2) Add virtualization for long lists in Dashboard, 3) Optimize image loading in Gallery component, 4) Fix state update loops in ShoppingCart, 5) Review bundle size and implement code splitting*\nLet's start by implementing memoization for the expensive calculations in your ProductList component.</assistant>\n\n<reasoning>\nThe assistant used the todo list because:\n1. First, the assistant examined the codebase to identify specific performance issues\n2. Based on this analysis, it identified multiple optimization opportunities\n3. Performance optimization is a non-trivial task requiring multiple steps\n4. The todo list helps methodically track improvements across different components\n5. This systematic approach ensures all performance bottlenecks are addressed\n</reasoning>\n</example>\n\n## Examples of When NOT to Use the Todo List\n\n<example>\nUser: How do I print 'Hello World' in Python?\nAssistant: In Python, you can print \"Hello World\" with this simple code:\n\npython\nprint(\"Hello World\")\n\nThis will output the text \"Hello World\" to the console when executed.</assistant>\n\n<reasoning>\nThe assistant did not use the todo list because this is a single, trivial task that can be completed in one step. There's no need to track multiple tasks or steps for such a straightforward request.\n</reasoning>\n</example>\n\n<example>\nUser: What does the git status command do?\nAssistant: The git status command shows the current state of your working directory and staging area. It displays which changes have been staged, which haven't, and which files aren't being tracked by Git. This is a fundamental command for understanding the current state of your repository before making commits.\n\n<reasoning>\nThe assistant did not use the todo list because this is an informational request with no actual coding task to complete. The user is simply asking for an explanation, not for the assistant to perform multiple steps or tasks.\n</reasoning>\n</example>\n\n<example>\nUser: Can you add a comment to the calculateTotal function to explain what it does?\nAssistant: Sure, let me add a comment to the calculateTotal function to explain what it does.\n* Uses the Edit tool to add a comment to the calculateTotal function *\n\n<reasoning>\nThe assistant did not use the todo list because this is a single, straightforward task confined to one location in the code. Adding a comment doesn't require tracking multiple steps or systematic organization.\n</reasoning>\n</example>\n\n<example>\nUser: Run npm install for me and tell me what happens.\nAssistant: I'll run the npm install command for you.\n\n*Executes: npm install*\n\nThe command completed successfully. Here's the output:\n[Output of npm install command]\n\nAll dependencies have been installed according to your package.json file.\n\n<reasoning>\nThe assistant did not use the todo list because this is a single command execution with immediate results. There are no multiple steps to track or organize, making the todo list unnecessary for this straightforward task.\n</reasoning>\n</example>\n\n## Task States and Management\n\n1. **Task States**: Use these states to track progress:\n   - pending: Task not yet started\n   - in_progress: Currently working on (limit to ONE task at a time)\n   - completed: Task finished successfully\n\n2. **Task Management**:\n   - Update task status in real-time as you work\n   - Mark tasks complete IMMEDIATELY after finishing (don't batch completions)\n   - Only have ONE task in_progress at any time\n   - Complete current tasks before starting new ones\n   - Remove tasks that are no longer relevant from the list entirely\n\n3. **Task Completion Requirements**:\n   - ONLY mark a task as completed when you have FULLY accomplished it\n   - If you encounter errors, blockers, or cannot finish, keep the task as in_progress\n   - When blocked, create a new task describing what needs to be resolved\n   - Never mark a task as completed if:\n     - Tests are failing\n     - Implementation is partial\n     - You encountered unresolved errors\n     - You couldn't find necessary files or dependencies\n\n4. **Task Breakdown**:\n   - Create specific, actionable items\n   - Break complex tasks into smaller, manageable steps\n   - Use clear, descriptive task names\n\nWhen in doubt, use this tool. Being proactive with task management demonstrates attentiveness and ensures you complete all requirements successfully.",
  "name": "TodoWrite",
  "parameters": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "properties": {
      "todos": {
        "description": "The updated todo list",
        "items": {
          "additionalProperties": false,
          "properties": {
            "content": {
              "minLength": 1,
              "type": "string"
            },
            "id": {
              "type": "string"
            },
            "priority": {
              "enum": ["high", "medium", "low"],
              "type": "string"
            },
            "status": {
              "enum": ["pending", "in_progress", "completed"],
              "type": "string"
            }
          },
          "required": ["content", "status", "priority", "id"],
          "type": "object"
        },
        "type": "array"
      }
    },
    "required": ["todos"],
    "type": "object"
  }
}
```

## Detailed Description

The TodoWrite tool creates and manages a structured task list during coding sessions. It helps track progress, organize complex work, and gives users visibility into your workflow. The tool is essential for managing multi-step tasks and maintaining clarity.

## Key Features

1. **Task tracking**: Pending, in-progress, and completed states
2. **Priority levels**: High, medium, and low priorities
3. **Real-time updates**: Immediate status changes
4. **Single focus**: Only one in-progress task at a time
5. **User visibility**: Shows progress transparently

## When to Use TodoWrite

### Use For:
1. **Complex multi-step tasks** (3+ distinct steps)
2. **Non-trivial complex tasks** requiring planning
3. **User requests todo list** explicitly
4. **Multiple tasks provided** by user
5. **After new instructions** to capture requirements
6. **Starting work** - mark as in_progress
7. **Completing work** - mark as completed

### Do NOT Use For:
1. Single, straightforward tasks
2. Trivial tasks with no organizational benefit
3. Tasks completable in <3 trivial steps
4. Purely conversational/informational tasks

## Examples

### Complex Feature Implementation
```typescript
await TodoWrite({
  todos: [
    {
      id: "1",
      content: "Create dark mode toggle component in Settings page",
      status: "pending",
      priority: "high"
    },
    {
      id: "2",
      content: "Add dark mode state management (context/store)",
      status: "pending",
      priority: "high"
    },
    {
      id: "3",
      content: "Implement CSS-in-JS styles for dark theme",
      status: "pending",
      priority: "medium"
    },
    {
      id: "4",
      content: "Update existing components to support theme switching",
      status: "pending",
      priority: "medium"
    },
    {
      id: "5",
      content: "Run tests and build process, fix any failures",
      status: "pending",
      priority: "high"
    }
  ]
})
```

### Refactoring Task
```typescript
// After finding 15 instances of getCwd across 8 files
await TodoWrite({
  todos: [
    {
      id: "1",
      content: "Update getCwd to getCurrentWorkingDirectory in src/utils.js (3 instances)",
      status: "in_progress",
      priority: "high"
    },
    {
      id: "2",
      content: "Update getCwd in src/fileManager.js (2 instances)",
      status: "pending",
      priority: "high"
    },
    {
      id: "3",
      content: "Update getCwd in tests/utils.test.js (5 instances)",
      status: "pending",
      priority: "medium"
    },
    {
      id: "4",
      content: "Update remaining files with getCwd references",
      status: "pending",
      priority: "medium"
    },
    {
      id: "5",
      content: "Run all tests to ensure refactoring didn't break anything",
      status: "pending",
      priority: "high"
    }
  ]
})
```

### Bug Fix Workflow
```typescript
await TodoWrite({
  todos: [
    {
      id: "1",
      content: "Reproduce the authentication bug in local environment",
      status: "completed",
      priority: "high"
    },
    {
      id: "2",
      content: "Add debug logging to auth middleware",
      status: "completed",
      priority: "high"
    },
    {
      id: "3",
      content: "Fix token validation logic in authService.js",
      status: "in_progress",
      priority: "high"
    },
    {
      id: "4",
      content: "Add unit tests for the fixed validation logic",
      status: "pending",
      priority: "high"
    },
    {
      id: "5",
      content: "Test the fix with different authentication scenarios",
      status: "pending",
      priority: "medium"
    }
  ]
})
```

## Task Status Management

### Starting a Task
```typescript
// Mark as in_progress when beginning work
await TodoWrite({
  todos: [
    {
      id: "1",
      content: "Implement user authentication",
      status: "in_progress",  // Changed from pending
      priority: "high"
    },
    // ... other tasks remain pending
  ]
})
```

### Completing a Task
```typescript
// Mark as completed immediately after finishing
await TodoWrite({
  todos: [
    {
      id: "1",
      content: "Implement user authentication",
      status: "completed",  // Task is done
      priority: "high"
    },
    {
      id: "2",
      content: "Add password reset functionality",
      status: "in_progress",  // Move to next task
      priority: "high"
    }
  ]
})
```

### Handling Blockers
```typescript
// Keep blocked task as in_progress, add new task for blocker
await TodoWrite({
  todos: [
    {
      id: "1",
      content: "Integrate payment API",
      status: "in_progress",  // Still blocked
      priority: "high"
    },
    {
      id: "2",
      content: "Resolve API credentials issue with payment provider",
      status: "pending",  // New task for blocker
      priority: "high"
    }
  ]
})
```

## Priority Guidelines

### High Priority
- Critical path items
- Blocking other work
- User explicitly emphasized
- Security or bug fixes
- Test/build failures

### Medium Priority
- Important but not blocking
- Performance improvements
- Refactoring tasks
- Documentation updates

### Low Priority
- Nice-to-have features
- Code cleanup
- Minor improvements
- Optional enhancements

## Best Practices

1. **Be specific**: Clear, actionable task descriptions
2. **Update immediately**: Don't batch status updates
3. **One in-progress**: Focus on single task at a time
4. **Complete fully**: Only mark done when truly finished
5. **Add discovered tasks**: Include new tasks found during work

## Common Patterns

### Feature Development
```typescript
await TodoWrite({
  todos: [
    { id: "1", content: "Design database schema for feature", status: "completed", priority: "high" },
    { id: "2", content: "Create API endpoints", status: "in_progress", priority: "high" },
    { id: "3", content: "Implement frontend components", status: "pending", priority: "high" },
    { id: "4", content: "Add integration tests", status: "pending", priority: "medium" },
    { id: "5", content: "Update documentation", status: "pending", priority: "low" }
  ]
})
```

### Debugging Session
```typescript
await TodoWrite({
  todos: [
    { id: "1", content: "Reproduce the reported issue", status: "completed", priority: "high" },
    { id: "2", content: "Identify root cause through debugging", status: "completed", priority: "high" },
    { id: "3", content: "Implement fix for race condition", status: "in_progress", priority: "high" },
    { id: "4", content: "Add tests to prevent regression", status: "pending", priority: "high" },
    { id: "5", content: "Verify fix in staging environment", status: "pending", priority: "medium" }
  ]
})
```

## Important Notes

- Todo list persists throughout conversation
- Always update when task status changes
- Users see the todo list in UI
- Helps maintain focus and organization
- Critical for complex multi-step work
- Don't use for trivial single tasks