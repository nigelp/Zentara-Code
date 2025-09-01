# exit_plan_mode Tool

## Original Function Definition

```json
{
  "description": "Use this tool when you are in plan mode and have finished presenting your plan and are ready to code. This will prompt the user to exit plan mode. \nIMPORTANT: Only use this tool when the task requires planning the implementation steps of a task that requires writing code. For research tasks where you're gathering information, searching files, reading files or in general trying to understand the codebase - do NOT use this tool.\n\nEg. \n1. Initial task: \"Search for and understand the implementation of vim mode in the codebase\" - Do not use the exit plan mode tool because you are not planning the implementation steps of a task.\n2. Initial task: \"Help me implement yank mode for vim\" - Use the exit plan mode tool after you have finished planning the implementation steps of the task.\n",
  "name": "exit_plan_mode",
  "parameters": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "additionalProperties": false,
    "properties": {
      "plan": {
        "description": "The plan you came up with, that you want to run by the user for approval. Supports markdown. The plan should be pretty concise.",
        "type": "string"
      }
    },
    "required": ["plan"],
    "type": "object"
  }
}
```

## Detailed Description

The exit_plan_mode tool is used to transition from planning mode to implementation mode. It presents a concise plan to the user and prompts them to approve moving forward with the actual code implementation. This tool should only be used when you've finished planning implementation steps for a coding task.

## When to Use

### Use exit_plan_mode When:
- You've finished planning implementation steps for a coding task
- The task involves writing, modifying, or refactoring code
- You need user approval before proceeding with implementation
- You've outlined specific technical steps to complete

### Do NOT Use When:
- Performing research or information gathering
- Reading or searching through files
- Understanding existing code architecture
- Answering questions about the codebase
- Tasks that don't involve writing code

## Examples

### Correct Usage - Implementation Planning
```typescript
// After planning a new feature
await exit_plan_mode({
  plan: `## Plan to implement yank mode for vim

1. **Create yank buffer system**
   - Add yankBuffer property to VimState class
   - Implement buffer persistence across operations

2. **Implement yank commands**
   - Add 'yy' for yanking entire line
   - Add 'yw' for yanking word
   - Add visual mode yanking support

3. **Implement paste commands**
   - Add 'p' for paste after cursor
   - Add 'P' for paste before cursor
   - Handle line-wise vs character-wise yanking

4. **Add tests**
   - Unit tests for yank/paste operations
   - Integration tests for vim mode commands

Ready to implement this plan?`
})
```

### Correct Usage - Refactoring Plan
```typescript
await exit_plan_mode({
  plan: `## Refactoring authentication module

1. **Extract auth logic from routes**
   - Move validation to middleware/auth.js
   - Create reusable auth decorators

2. **Centralize token management**
   - Create TokenService class
   - Move JWT logic from scattered locations

3. **Update all endpoints**
   - Replace inline auth with middleware
   - Update tests for new structure

4. **Add comprehensive error handling**
   - Create custom auth error classes
   - Implement proper error responses`
})
```

### Incorrect Usage - Research Tasks
```typescript
// DON'T use for research/exploration:
// ❌ "Search for vim mode implementation"
// ❌ "Find all authentication code"
// ❌ "Understand the database schema"
// ❌ "Analyze the testing strategy"
```

## Plan Format Guidelines

### Structure Your Plan
1. **Use clear sections** with markdown headers
2. **Be concise** but comprehensive
3. **List specific steps** in logical order
4. **Include technical details** where relevant
5. **End with confirmation** request

### Good Plan Example
```typescript
await exit_plan_mode({
  plan: `## Implement user notifications

1. **Database changes**
   - Add notifications table
   - Add user_notifications junction table
   - Create migration scripts

2. **Backend API**
   - POST /api/notifications - Create notification
   - GET /api/notifications - List user notifications
   - PATCH /api/notifications/:id/read - Mark as read

3. **Frontend components**
   - NotificationBell component with count
   - NotificationDropdown with list
   - Real-time updates via WebSocket

4. **Testing**
   - API endpoint tests
   - Component unit tests
   - E2E notification flow test

Shall I proceed with this implementation?`
})
```

## Common Patterns

### Feature Implementation
```typescript
await exit_plan_mode({
  plan: `## Add search functionality

1. Set up search infrastructure
   - Install and configure Elasticsearch
   - Create search indices

2. Implement search API
   - Add /api/search endpoint
   - Support filters and pagination

3. Build search UI
   - Search bar component
   - Results display with highlighting
   - Filter sidebar

4. Optimize performance
   - Add caching layer
   - Implement debouncing`
})
```

### Bug Fix Planning
```typescript
await exit_plan_mode({
  plan: `## Fix memory leak in image processor

1. Identify leak source
   - Add memory profiling
   - Trace object retention

2. Implement fixes
   - Properly dispose image buffers
   - Clear event listeners
   - Fix circular references

3. Verify fix
   - Run memory tests
   - Monitor production metrics`
})
```

### API Integration
```typescript
await exit_plan_mode({
  plan: `## Integrate payment provider API

1. Set up API client
   - Configure SDK with credentials
   - Implement error handling

2. Create payment flow
   - Initialize payment intent
   - Handle customer confirmation
   - Process webhooks

3. Update order system
   - Link payments to orders
   - Handle payment states
   - Add refund support

4. Add monitoring
   - Log all transactions
   - Set up alerts for failures`
})
```

## Best Practices

1. **Be specific**: Include concrete technical steps
2. **Stay focused**: Only include implementation steps
3. **Order matters**: Present steps in execution order
4. **Consider dependencies**: Note what needs to be done first
5. **Include testing**: Always plan for tests

## What Happens Next

After using exit_plan_mode:
1. User reviews the presented plan
2. User either approves or requests changes
3. If approved, you proceed with implementation
4. If changes needed, you revise the plan

## Integration Context

This tool is typically used after:
- Analyzing requirements
- Researching existing code
- Understanding constraints
- Identifying dependencies

And before:
- Writing actual code
- Making file modifications
- Running tests
- Creating commits

## Important Notes

- Only for tasks that involve writing code
- Not for research or analysis tasks
- Plan should be implementation-focused
- Keep plans concise but complete
- Always end with a confirmation question