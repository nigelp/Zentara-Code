# Task Tool - Multiagent System

## Original Function Definition

```json
{
	"description": "Launch a new agent that has access to the following tools: Bash, Glob, Grep, LS, exit_plan_mode, Read, Edit, MultiEdit, Write, NotebookRead, NotebookEdit, WebFetch, TodoWrite, WebSearch, mcp__ide__getDiagnostics, mcp__ide__executeCode. When you are searching for a keyword or file and are not confident that you will find the right match in the first few tries, use the Agent tool to perform the search for you.\n\nWhen to use the Agent tool:\n- If you are searching for a keyword like \"config\" or \"logger\", or for questions like \"which file does X?\", the Agent tool is strongly recommended\n\nWhen NOT to use the Agent tool:\n- If you want to read a specific file path, use the Read or Glob tool instead of the Agent tool, to find the match more quickly\n- If you are searching for a specific class definition like \"class Foo\", use the Glob tool instead, to find the match more quickly\n- If you are searching for code within a specific file or set of 2-3 files, use the Read tool instead of the Agent tool, to find the match more quickly\n- Writing code and running bash commands (use other tools for that)\n- Other tasks that are not related to searching for a keyword or file\n\nUsage notes:\n1. Launch multiple agents concurrently whenever possible, to maximize performance; to do that, use a single message with multiple tool uses\n2. When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result.\n3. Each agent invocation is stateless. You will not be able to send additional messages to the agent, nor will the agent be able to communicate with you outside of its final report. Therefore, your prompt should contain a highly detailed task description for the agent to perform autonomously and you should specify exactly what information the agent should return back to you in its final and only message to you.\n4. The agent's outputs should generally be trusted\n5. Clearly tell the agent whether you expect it to write code or just to do research (search, file reads, web fetches, etc.), since it is not aware of the user's intent",
	"name": "Task",
	"parameters": {
		"$schema": "http://json-schema.org/draft-07/schema#",
		"additionalProperties": false,
		"properties": {
			"description": {
				"description": "A short (3-5 word) description of the task",
				"type": "string"
			},
			"prompt": {
				"description": "The task for the agent to perform",
				"type": "string"
			}
		},
		"required": ["description", "prompt"],
		"type": "object"
	}
}
```

## The Power of Multiagent Systems

The Task tool is not just a search utility - it's a sophisticated multiagent orchestration system that launches autonomous AI agents capable of performing ANY complex task independently. Each agent operates in its own isolated context with full access to tools, making it a powerful paradigm for parallel, specialized task execution.

## Core Concepts

### Context Isolation

Each agent starts with a clean slate:

- **No conversation history** - Fresh perspective on each task
- **Minimal context** - Only receives the specific task description
- **No cross-contamination** - Agents don't interfere with each other
- **Focused execution** - No distractions from unrelated context

### Autonomous Capabilities

Agents can perform ANY task that the main assistant can:

- **Code Generation** - Write complete implementations
- **Refactoring** - Restructure code independently
- **Analysis** - Deep dive into specific aspects
- **Testing** - Create and run tests
- **Documentation** - Generate comprehensive docs
- **Debugging** - Investigate and fix issues
- **Research** - Explore and synthesize information

## Key Benefits of Multiagent Architecture

### 1. Context Management

- **Reduced token usage** - Each agent only gets necessary context
- **Avoid context pollution** - No irrelevant conversation history
- **Specialized focus** - Agents aren't distracted by previous tasks
- **Clean mental model** - Each agent starts fresh

### 2. Parallel Execution

- **Concurrent processing** - Multiple agents work simultaneously
- **Time efficiency** - 10 tasks in parallel vs sequential
- **Resource optimization** - Better utilization of compute
- **Scalable architecture** - Add more agents as needed

### 3. Specialization

- **Task-specific prompting** - Optimize each agent for its task
- **Domain expertise** - Different agents for different domains
- **Tool optimization** - Each agent uses only needed tools
- **Focused results** - No mixing of concerns

### 4. Reliability

- **Fault isolation** - One agent's failure doesn't affect others
- **Retry capability** - Failed tasks can be re-attempted
- **Result verification** - Multiple agents can cross-check
- **Consistent quality** - Each agent gives full attention

### 5. Cognitive Load Distribution

- **Divide and conquer** - Break complex problems into parts
- **Specialized reasoning** - Each agent focuses deeply
- **No context switching** - Agents maintain focus
- **Clear boundaries** - Well-defined task scopes

## When Multiagent Systems Excel

### Complex Multi-Step Projects

```typescript
// Refactor an entire module with specialized agents
await Promise.all([
	Task({
		description: "Analyze current architecture",
		prompt: "Analyze the authentication module's current architecture. Document all components, dependencies, and patterns used. Identify areas needing improvement.",
	}),
	Task({
		description: "Design new architecture",
		prompt: "Based on microservices best practices, design a new architecture for the authentication module. Include API contracts, data flow, and security considerations.",
	}),
	Task({
		description: "Create migration plan",
		prompt: "Create a detailed migration plan from the current auth system to a microservices architecture. Include steps, risks, and rollback procedures.",
	}),
])
```

### Parallel Code Generation

```typescript
// Generate a complete feature with multiple components
await Promise.all([
	Task({
		description: "Create API endpoints",
		prompt: "Implement REST API endpoints for a user management system including CRUD operations, validation, and error handling. Use Express.js with TypeScript.",
	}),
	Task({
		description: "Create database layer",
		prompt: "Implement the database layer for user management using Prisma ORM. Include models, migrations, and repository pattern implementation.",
	}),
	Task({
		description: "Create frontend components",
		prompt: "Create React components for user management including list view, detail view, and edit forms. Use Material-UI and React Query.",
	}),
	Task({
		description: "Create test suite",
		prompt: "Write comprehensive tests for the user management feature including API tests, database tests, and React component tests.",
	}),
])
```

### Large-Scale Refactoring

```typescript
// Refactor with multiple specialized agents
const refactoringTasks = [
	{
		description: "Update imports",
		prompt: "Update all import statements from the old '@company/lib' to '@company/core'. Ensure all files are updated and imports are correctly resolved.",
	},
	{
		description: "Update API calls",
		prompt: "Refactor all API calls to use the new async/await pattern instead of callbacks. Include proper error handling.",
	},
	{
		description: "Update tests",
		prompt: "Update all test files to match the refactored code. Ensure tests pass and coverage is maintained.",
	},
	{
		description: "Update documentation",
		prompt: "Update all documentation to reflect the changes made in the refactoring. Include migration guide for other teams.",
	},
]

const results = await Promise.all(refactoringTasks.map((task) => Task(task)))
```

### Cross-Domain Analysis

```typescript
// Analyze different aspects of a system simultaneously
await Promise.all([
	Task({
		description: "Security audit",
		prompt: "Perform a security audit of the application. Check for OWASP top 10 vulnerabilities, insecure dependencies, and exposed secrets.",
	}),
	Task({
		description: "Performance analysis",
		prompt: "Analyze performance bottlenecks in the application. Check database queries, API response times, and frontend rendering performance.",
	}),
	Task({
		description: "Code quality review",
		prompt: "Review code quality across the codebase. Check for design patterns, SOLID principles, and maintainability issues.",
	}),
	Task({
		description: "Dependency audit",
		prompt: "Audit all dependencies for security vulnerabilities, licensing issues, and update requirements.",
	}),
])
```

### Documentation Generation

```typescript
// Generate comprehensive documentation
await Promise.all([
	Task({
		description: "API documentation",
		prompt: "Generate OpenAPI/Swagger documentation for all REST endpoints. Include request/response examples and error codes.",
	}),
	Task({
		description: "Architecture docs",
		prompt: "Create architecture documentation with diagrams (mermaid format) showing system components and data flow.",
	}),
	Task({
		description: "Setup guide",
		prompt: "Write a comprehensive setup guide for new developers including prerequisites, installation steps, and common issues.",
	}),
	Task({
		description: "Deployment docs",
		prompt: "Document the deployment process including CI/CD pipeline, environment configurations, and rollback procedures.",
	}),
])
```

## Advanced Patterns

### Verification Pattern

```typescript
// Have multiple agents verify each other's work
const implementation = await Task({
	description: "Implement feature",
	prompt: "Implement a rate limiting middleware for Express.js with Redis backend.",
})

const verification = await Task({
	description: "Verify implementation",
	prompt: "Review the rate limiting implementation for correctness, security issues, and performance. Suggest improvements.",
})

const tests = await Task({
	description: "Test implementation",
	prompt: "Write comprehensive tests for the rate limiting middleware including edge cases and failure scenarios.",
})
```

### Research and Implementation Pattern

```typescript
// Research then implement based on findings
const research = await Task({
	description: "Research best practices",
	prompt: "Research current best practices for implementing OAuth2 in Node.js applications. Compare libraries and approaches.",
})

// Use research results to guide implementation
const implementation = await Task({
	description: "Implement OAuth2",
	prompt: `Implement OAuth2 authentication using the best practices and libraries identified. Ensure security and scalability.`,
})
```

### Exploration Pattern

```typescript
// Explore unknown codebase
const explorationTasks = [
	Task({
		description: "Map project structure",
		prompt: "Create a comprehensive map of the project structure. Identify main modules, their purposes, and dependencies.",
	}),
	Task({
		description: "Identify patterns",
		prompt: "Identify architectural patterns, design patterns, and coding conventions used throughout the codebase.",
	}),
	Task({
		description: "Find entry points",
		prompt: "Locate all application entry points, initialization code, and bootstrap sequences.",
	}),
	Task({
		description: "Trace data flow",
		prompt: "Trace how data flows through the application from input to output. Identify transformations and validations.",
	}),
]
```

## Task Scoping - The Foundation of Multiagent Success

### Core Principles of Agent Scoping

#### 1. Clear Input/Output Contract

Every agent must have a precisely defined contract:

```typescript
// GOOD: Clear input/output specification
await Task({
	description: "Extract API routes",
	prompt: `
    INPUT:
    - Codebase root: /src
    - Framework: Express.js
    - File patterns: *.routes.js, *.controller.js

    TASK: Extract all API route definitions

    OUTPUT FORMAT:
    {
      "routes": [
        {
          "method": "GET|POST|PUT|DELETE",
          "path": "/api/...",
          "handler": "function name",
          "file": "absolute path",
          "middleware": ["auth", "validate"]
        }
      ],
      "total": number,
      "byMethod": { "GET": n, "POST": n, ... }
    }

    CONSTRAINTS:
    - Return ONLY the JSON structure above
    - Do NOT modify any files
    - Complete within 5 minutes
  `,
})
```

#### 2. No Side Effects by Default

Agents should be read-only unless explicitly granted write permissions:

```typescript
// DEFAULT: Read-only agent
await Task({
	description: "Analyze security",
	prompt: `
    Analyze the codebase for security vulnerabilities.
    DO NOT modify any files.
    DO NOT create new files.
    DO NOT execute any code that changes system state.

    Return findings as a structured report.
  `,
})

// EXPLICIT: Write permission with specific scope
await Task({
	description: "Fix imports",
	prompt: `
    You have WRITE PERMISSION for:
    - Files matching: src/**/*.js
    - Operation: Update import statements only
    - Constraint: Do not modify any other code

    Fix all broken import paths in JavaScript files.
    Report all files modified.
  `,
})
```

#### 3. File Modification Conflict Prevention

Only ONE agent may modify a specific file:

```typescript
// File conflict detection before launching agents
const tasks = [
	{ file: "src/user.js", agent: "refactor-user" },
	{ file: "src/auth.js", agent: "update-auth" },
	{ file: "src/user.js", agent: "add-validation" }, // CONFLICT!
]

// Pre-launch validation
function validateFileAccess(tasks) {
	const fileAgentMap = new Map()
	for (const task of tasks) {
		if (fileAgentMap.has(task.file)) {
			throw new Error(`File conflict: ${task.file} already assigned to ${fileAgentMap.get(task.file)}`)
		}
		fileAgentMap.set(task.file, task.agent)
	}
	return true
}
```

#### 4. Time Boundaries (5-Minute Limit)

Every agent has a hard 5-minute execution limit:

```typescript
await Task({
	description: "Generate tests",
	prompt: `
    Generate unit tests for the UserService class.

    TIME LIMIT: 5 minutes maximum

    If you cannot complete all tests within time limit:
    1. Prioritize critical path tests
    2. Return completed tests
    3. List what remains to be done
  `,
})
```

#### 5. Extreme Parallelism - Complete Independence

Agents must operate in complete isolation:

```typescript
// BAD: Agents with dependencies
const agent1 = await Task({
	description: "Create config",
	prompt: "Create a config.json file with database settings",
})

const agent2 = await Task({
	description: "Use config",
	prompt: "Read config.json and connect to database", // DEPENDS on agent1!
})

// GOOD: Independent agents
await Promise.all([
	Task({
		description: "Analyze config needs",
		prompt: "Analyze what configuration the app needs. Return requirements.",
	}),
	Task({
		description: "Analyze DB patterns",
		prompt: "Analyze database connection patterns. Return findings.",
	}),
])
```

### Advanced Scoping Patterns

#### Scoped File Access Pattern

```typescript
// Define precise file access scopes
const fileAccessScopes = {
	"refactor-auth": {
		read: ["src/**/*.js", "tests/**/*.test.js"],
		write: ["src/auth/**/*.js"],
		exclude: ["src/auth/secrets.js"],
	},
	"update-tests": {
		read: ["src/**/*.js"],
		write: ["tests/**/*.test.js"],
		create: ["tests/new-tests/**/*.test.js"],
	},
}

// Launch agents with validated scopes
for (const [agentName, scope] of Object.entries(fileAccessScopes)) {
	await Task({
		description: agentName,
		prompt: `
      FILE ACCESS SCOPE:
      - READ: ${scope.read.join(", ")}
      - WRITE: ${scope.write?.join(", ") || "NONE"}
      - CREATE: ${scope.create?.join(", ") || "NONE"}
      - EXCLUDE: ${scope.exclude?.join(", ") || "NONE"}

      [Task specific instructions...]
    `,
	})
}
```

#### Output Schema Enforcement

```typescript
// Define strict output schemas
const outputSchema = {
	type: "object",
	required: ["status", "results", "metrics"],
	properties: {
		status: { enum: ["success", "partial", "failed"] },
		results: { type: "array" },
		metrics: {
			type: "object",
			required: ["filesProcessed", "timeElapsed"],
			properties: {
				filesProcessed: { type: "number" },
				timeElapsed: { type: "number" },
				errors: { type: "array" },
			},
		},
	},
}

await Task({
	description: "Process files",
	prompt: `
    Process all TypeScript files and return results.

    OUTPUT MUST MATCH THIS SCHEMA:
    ${JSON.stringify(outputSchema, null, 2)}

    Invalid output format will be rejected.
  `,
})
```

#### Resource Isolation Pattern

```typescript
// Each agent gets isolated resources
await Promise.all([
	Task({
		description: "CPU intensive task",
		prompt: `
      Analyze code complexity for all files.
      Resource limits:
      - CPU: Use single-threaded analysis
      - Memory: Stay under 512MB
      - Disk: Read only, no temp files
      - Network: No external requests
    `,
	}),
	Task({
		description: "Memory intensive task",
		prompt: `
      Build dependency graph for entire codebase.
      Resource limits:
      - CPU: Low priority
      - Memory: May use up to 1GB
      - Disk: Can create temp files in /tmp/agent-2/
      - Network: No external requests
    `,
	}),
])
```

### Common Scoping Mistakes to Avoid

#### 1. Vague Success Criteria

```typescript
// BAD: Unclear success criteria
await Task({
	description: "Improve code",
	prompt: "Make the code better",
})

// GOOD: Measurable success criteria
await Task({
	description: "Improve code quality",
	prompt: `
    Improve code quality by:
    1. Adding JSDoc comments to all public functions
    2. Fixing all ESLint warnings (not errors)
    3. Extracting magic numbers to named constants

    Success criteria:
    - 100% public functions have JSDoc
    - 0 ESLint warnings remain
    - 0 magic numbers in code

    Return: List of all changes made
  `,
})
```

#### 2. Implicit Dependencies

```typescript
// BAD: Hidden dependency on environment
await Task({
	description: "Run tests",
	prompt: "Execute the test suite and fix failing tests",
	// Assumes test environment is set up!
})

// GOOD: Explicit environment requirements
await Task({
	description: "Analyze tests",
	prompt: `
    Analyze test files to identify issues.
    DO NOT execute tests (no test environment).

    Based on static analysis:
    1. Identify likely failing tests
    2. Suggest fixes for common patterns
    3. List missing test cases

    Work only with source code analysis.
  `,
})
```

#### 3. Unbounded Scope

```typescript
// BAD: No bounds on what agent might do
await Task({
	description: "Fix bugs",
	prompt: "Find and fix all bugs in the application",
})

// GOOD: Bounded, specific scope
await Task({
	description: "Fix null checks",
	prompt: `
    Fix missing null/undefined checks:

    SCOPE:
    - Files: src/services/**/*.js only
    - Pattern: Find object property access without null checks
    - Fix: Add optional chaining (?.) or explicit checks
    - Limit: Maximum 20 fixes
    - Time: Must complete in 5 minutes

    DO NOT:
    - Fix any other type of issue
    - Modify test files
    - Change function signatures

    Return: List of fixes with file:line references
  `,
})
```

## Best Practices

### 1. Task Scoping (Enhanced)

- **Single Responsibility**: One clear, measurable goal per agent
- **Explicit I/O Contract**: Define exact input format and output schema
- **No Side Effects**: Read-only by default, write permissions must be explicit
- **Time Boundaries**: Respect 5-minute execution limit
- **Resource Isolation**: No shared state or dependencies between agents
- **Conflict Prevention**: Ensure no two agents modify the same file
- **Success Criteria**: Define measurable outcomes
- **Error Handling**: Specify behavior for partial completion

### 2. Prompt Engineering

- **Context Setting**: Provide necessary background
- **Explicit Instructions**: Be specific about requirements
- **Output Format**: Define how results should be structured
- **Constraints**: Specify any limitations or requirements

### 3. Agent Coordination

- **Independent Tasks**: Ensure agents can work in isolation
- **Result Aggregation**: Plan how to combine agent outputs
- **Error Handling**: Account for partial failures
- **Verification**: Consider cross-checking critical work

### 4. Resource Optimization

- **Batch Related Tasks**: Group similar operations
- **Avoid Redundancy**: Don't duplicate work across agents
- **Cache Awareness**: Agents don't share caches
- **Tool Selection**: Guide agents on tool usage

## Real-World Use Cases

### 1. Microservices Migration

Split a monolithic application into microservices with specialized agents handling:

- Service boundary identification
- API contract definition
- Data model separation
- Integration testing
- Deployment configuration

### 2. Technical Debt Reduction

Multiple agents working on different aspects:

- Code smell detection
- Refactoring implementation
- Test coverage improvement
- Documentation updates
- Performance optimization

### 3. Security Hardening

Parallel security improvements:

- Vulnerability scanning
- Dependency updates
- Authentication strengthening
- Input validation
- Security test creation

### 4. Codebase Modernization

Upgrade legacy code with agents handling:

- Framework migration
- Language version updates
- Build system modernization
- CI/CD pipeline updates
- Documentation refresh

## Execution Constraints and Limits

### Hard Limits

Every agent operates under strict constraints to ensure reliability and parallelism:

#### 1. Time Limit: 5 Minutes Maximum

```typescript
// Time limit enforcement
await Task({
	description: "Large analysis",
	prompt: `
    Analyze the entire codebase for code smells.

    TIME CONSTRAINT: 5 minutes HARD LIMIT

    Strategy for time management:
    1. First 2 minutes: Scan and prioritize files
    2. Next 2 minutes: Analyze high-priority files
    3. Last minute: Summarize findings

    If timeout approaches:
    - Save partial results
    - List unprocessed files
    - Return gracefully
  `,
})
```

#### 2. No Shared State

Agents cannot share memory, cache, or any state:

```typescript
// Each agent is completely isolated
const agents = [
	Task({
		description: "Agent A",
		prompt: "Process files and store results in memory",
		// This agent's memory is isolated
	}),
	Task({
		description: "Agent B",
		prompt: "Process different files",
		// Cannot access Agent A's memory or results
	}),
]
```

#### 3. File Write Exclusivity

Only one agent can write to a specific file:

```typescript
// File locking mechanism
class FileAccessManager {
	private fileLocks = new Map<string, string>()

	requestWriteAccess(agentId: string, files: string[]): boolean {
		for (const file of files) {
			if (this.fileLocks.has(file)) {
				throw new Error(`File ${file} locked by agent ${this.fileLocks.get(file)}`)
			}
		}

		// Grant access
		for (const file of files) {
			this.fileLocks.set(file, agentId)
		}
		return true
	}
}
```

### Extreme Parallelism Patterns

#### Pattern 1: Sharded Processing

```typescript
// Split work into independent shards
const files = await glob("src/**/*.ts")
const shardSize = Math.ceil(files.length / 10)
const shards = []

for (let i = 0; i < files.length; i += shardSize) {
	shards.push(files.slice(i, i + shardSize))
}

// Launch parallel agents for each shard
await Promise.all(
	shards.map((shard, index) =>
		Task({
			description: `Process shard ${index}`,
			prompt: `
        Process ONLY these files:
        ${shard.join("\n")}

        Do not access any other files.
        Return results for your shard only.
      `,
		}),
	),
)
```

#### Pattern 2: Domain Isolation

```typescript
// Each agent owns a specific domain
const domainAgents = {
	frontend: {
		read: ["src/components/**", "src/pages/**"],
		write: ["src/components/**/*.tsx"],
	},
	backend: {
		read: ["src/api/**", "src/services/**"],
		write: ["src/api/**/*.ts"],
	},
	database: {
		read: ["src/models/**", "migrations/**"],
		write: ["migrations/**/*.sql"],
	},
}

// Launch domain-specific agents
await Promise.all(
	Object.entries(domainAgents).map(([domain, access]) =>
		Task({
			description: `Refactor ${domain}`,
			prompt: `
        You are the ${domain} agent.

        ACCESS CONTROL:
        - READ: ${access.read.join(", ")}
        - WRITE: ${access.write.join(", ")}

        You CANNOT access files outside your domain.
        Other agents handle other domains.
      `,
		}),
	),
)
```

#### Pattern 3: Result Aggregation Without Sharing

```typescript
// Agents produce independent results
const analysisResults = await Promise.all([
	Task({
		description: "Security analysis",
		prompt: "Analyze security vulnerabilities. Return JSON report.",
	}),
	Task({
		description: "Performance analysis",
		prompt: "Analyze performance issues. Return JSON report.",
	}),
	Task({
		description: "Code quality analysis",
		prompt: "Analyze code quality. Return JSON report.",
	}),
])

// Main agent aggregates after completion
const summary = {
	security: JSON.parse(analysisResults[0]),
	performance: JSON.parse(analysisResults[1]),
	quality: JSON.parse(analysisResults[2]),
	timestamp: new Date().toISOString(),
}
```

### Side Effect Prevention

#### Default Read-Only Mode

```typescript
// Standard agent configuration
const defaultAgentConfig = {
	permissions: {
		read: true,
		write: false,
		execute: false,
		network: false,
	},
	prompt_prefix: `
    You are operating in READ-ONLY mode.
    You CANNOT:
    - Modify any files
    - Create new files
    - Execute commands that change state
    - Make network requests

    You CAN:
    - Read files
    - Analyze code
    - Return findings
  `,
}
```

#### Explicit Write Permissions

```typescript
// When write is needed, be explicit
await Task({
	description: "Fix formatting",
	prompt: `
    WRITE PERMISSION GRANTED for:
    - Files: src/**/*.js
    - Operation: Format code using Prettier rules
    - Changes allowed: Whitespace, semicolons, quotes

    CONSTRAINTS:
    - Do NOT change logic
    - Do NOT rename variables
    - Do NOT modify comments
    - Report EVERY file modified

    Return: { "modified": ["file1.js", "file2.js"], "errors": [] }
  `,
})
```

## Limitations and Considerations

### Agent Limitations

- **5-Minute Execution Cap**: Hard timeout at 5 minutes
- **No Inter-Agent Communication**: Agents cannot coordinate directly
- **Stateless Execution**: No persistence between invocations
- **File Lock Constraints**: One agent per file for writes
- **Resource Boundaries**: Memory and CPU constraints apply
- **No Shared Cache**: Each agent has isolated cache
- **No Global State**: Cannot use global variables or shared memory

### When NOT to Use Multiagent

- **Simple Tasks**: Overhead not justified for <1 minute tasks
- **Sequential Dependencies**: When tasks must run in order
- **Shared State Required**: When agents need to share data
- **Real-time Requirements**: When immediate response needed
- **Complex Coordination**: When agents need to negotiate
- **Single File Focus**: When working on just one file

## Implementation Tips

### Effective Task Descriptions

```typescript
// GOOD: Specific, measurable, bounded
await Task({
	description: "Implement user service",
	prompt: `Create a UserService class that:
  - Implements CRUD operations for users
  - Uses repository pattern with TypeORM
  - Includes input validation using class-validator
  - Handles errors with custom exceptions
  - Returns DTOs not entities
  Export the service and its interface.`,
})

// BAD: Vague, unbounded, unclear deliverables
await Task({
	description: "Work on users",
	prompt: "Improve the user management in the application",
})
```

### Result Processing

```typescript
// Process multiple agent results
const results = await Promise.all([...tasks])

// Aggregate findings
const summary = results.map((result, index) => ({
	task: tasks[index].description,
	outcome: result.success ? "Completed" : "Failed",
	details: result.output,
}))

// Present to user
console.log("Multiagent Execution Summary:")
summary.forEach((item) => {
	console.log(`\n${item.task}: ${item.outcome}`)
	console.log(item.details)
})
```

## Monitoring and Debugging Multiagent Systems

### Agent Execution Tracking

```typescript
// Track agent execution for debugging
interface AgentExecution {
	id: string
	description: string
	startTime: Date
	endTime?: Date
	status: "running" | "completed" | "failed" | "timeout"
	filesAccessed: string[]
	filesModified: string[]
	errorMessage?: string
}

class AgentMonitor {
	private executions = new Map<string, AgentExecution>()

	startAgent(id: string, description: string) {
		this.executions.set(id, {
			id,
			description,
			startTime: new Date(),
			status: "running",
			filesAccessed: [],
			filesModified: [],
		})
	}

	completeAgent(id: string, result: any) {
		const execution = this.executions.get(id)
		if (execution) {
			execution.endTime = new Date()
			execution.status = "completed"
		}
	}

	getReport(): string {
		const report = []
		for (const [id, exec] of this.executions) {
			const duration = exec.endTime ? (exec.endTime.getTime() - exec.startTime.getTime()) / 1000 : "still running"

			report.push({
				agent: exec.description,
				status: exec.status,
				duration: duration + "s",
				filesModified: exec.filesModified.length,
			})
		}
		return JSON.stringify(report, null, 2)
	}
}
```

### Debugging Patterns

#### 1. Dry Run Mode

```typescript
// Test agent behavior without side effects
await Task({
	description: "Refactor (dry run)",
	prompt: `
    DRY RUN MODE - DO NOT MODIFY ANY FILES

    Simulate refactoring the authentication module:
    1. List all files you WOULD modify
    2. Describe changes you WOULD make
    3. Estimate time for each change
    4. Identify potential conflicts

    Return a detailed plan without executing.
  `,
})
```

#### 2. Incremental Testing

```typescript
// Test with small subset first
const allFiles = await glob("src/**/*.js")
const testSubset = allFiles.slice(0, 5)

// Test agent on subset
const testResult = await Task({
	description: "Test on subset",
	prompt: `
    Process ONLY these files as a test:
    ${testSubset.join("\n")}

    This is a test run to verify behavior.
  `,
})

// If successful, run on all files
if (testResult.success) {
	await Task({
		description: "Process all files",
		prompt: "Process all JavaScript files...",
	})
}
```

#### 3. Agent Replay

```typescript
// Save agent inputs for replay/debugging
const agentConfig = {
	id: "refactor-123",
	description: "Refactor auth module",
	prompt: "...",
	timestamp: new Date().toISOString(),
}

// Save for debugging
await fs.writeJson(`.agent-history/${agentConfig.id}.json`, agentConfig)

// Replay later for debugging
const saved = await fs.readJson(`.agent-history/${agentId}.json`)
await Task(saved)
```

## Future Possibilities

The multiagent paradigm opens doors for:

- **Specialized Model Agents**: Different models for different tasks
- **Learning Agents**: Agents that improve from experience
- **Collaborative Patterns**: Agents that build on each other's work
- **Adaptive Orchestration**: Dynamic agent allocation
- **Domain-Specific Agents**: Pre-trained for specific tasks

## Conclusion

The Task tool represents a paradigm shift from linear, context-heavy processing to parallel, focused, multiagent orchestration. Success with multiagent systems requires:

1. **Precise Scoping**: Clear input/output contracts with measurable success criteria
2. **Strict Isolation**: No side effects by default, explicit permissions for modifications
3. **Conflict Prevention**: File-level locking ensures no write conflicts between agents
4. **Time Awareness**: 5-minute execution limit requires strategic task decomposition
5. **True Parallelism**: Complete independence between agents enables extreme scalability

By embracing these constraints and leveraging context isolation, parallel execution, and specialized agents, the multiagent paradigm enables tackling complex software engineering challenges more efficiently and reliably than traditional single-agent approaches. The key is to think in terms of independent, well-scoped units of work that can execute in complete isolation while contributing to a larger goal.
