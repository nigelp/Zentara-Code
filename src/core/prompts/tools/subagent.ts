import { discoverAgents, createAgentLoadingContext } from '../../../roo_subagent/src/agentDiscovery'
import type { AgentDiscoveryResult } from '@roo-code/types'

/**
 * Formats the list of available predefined agents from discovered agents data.
 * @param discovered - Already discovered agents data (from Task cache or fresh discovery)
 * @returns A formatted string containing the list of agents or a fallback message
 */
export function formatAgentsList(discovered: AgentDiscoveryResult | null): string {
	if (discovered && discovered.agents) {
		const allAgents: Array<{ name: string; description: string }> = []

		// Collect all agents from all categories with their descriptions
		// Order matters: system agents first, then project, then global
		// Now agents are stored as Maps for O(1) lookup
		if (discovered.agents.system && discovered.agents.system instanceof Map) {
			discovered.agents.system.forEach((agent: any, name: string) => {
				allAgents.push({ name: agent.name, description: agent.description })
			})
		}
		if (discovered.agents.project && discovered.agents.project instanceof Map) {
			discovered.agents.project.forEach((agent: any, name: string) => {
				allAgents.push({ name: agent.name, description: agent.description })
			})
		}
		if (discovered.agents.global && discovered.agents.global instanceof Map) {
			discovered.agents.global.forEach((agent: any, name: string) => {
				allAgents.push({ name: agent.name, description: agent.description })
			})
		}

		if (allAgents.length > 0) {
			return allAgents.map((agent: any) => `- **${agent.name}**: ${agent.description}`).join("\n")
		}
	}

	return "No predefined agents are currently available."
}

/**
 * Formats the list of available predefined agents.
 * @param discoveredAgents - Pre-discovered agents (from Task cache or fresh discovery)
 * @returns A formatted string containing the list of agents or a fallback message
 */
export function getAgentsList(discoveredAgents: AgentDiscoveryResult | null): string {
	return formatAgentsList(discoveredAgents)
}

export async function getSubagentDescription(discoveredAgents: AgentDiscoveryResult | null): Promise<string> {
	// If discoveredAgents is null, fetch them dynamically
	let agents = discoveredAgents
	if (!agents) {
		try {
			const context = createAgentLoadingContext()
			agents = await discoverAgents(context)
			console.log('[getSubagentDescription] Dynamically discovered agents:', {
				system: agents.agents.system.size,
				project: agents.agents.project.size,
				global: agents.agents.global.size
			})
		} catch (error) {
			console.error('[getSubagentDescription] Error discovering agents:', error)
			// Return template with empty agents list
			agents = {
				agents: {
					system: new Map(),
					project: new Map(),
					global: new Map()
				},
				errors: []
			}
		}
	}
	
	// Get the dynamically discovered agents list
	const agentsList = getAgentsList(agents)

	return `## subagent (PRIORITY TOOL - USE FIRST!)
	  
	  Description: **THIS IS YOUR PRIMARY TOOL** - Launch autonomous AI agents to perform tasks in parallel.
	  
	  ## 🔴 MASTER AGENT ROLE - YOU ARE THE ORCHESTRATOR
	  You are the MASTER AGENT. Your primary responsibilities are:
	  1. **DECOMPOSE** - Break complex tasks into MULTIPLE parallel, independent subtasks
	  2. **DELEGATE** - Launch MULTIPLE subagents simultaneously for maximum parallelism
	  3. **INTEGRATE** - Synthesize results from all subagents into a cohesive solution
	  4. **COORDINATE** - Ensure no overlap or conflicts between subagent tasks
	  
	  ## 🔍 CRITICAL DESIGN LIMITATION
	  **Subagents CANNOT launch nested subagents** (software design limitation). This means:
	  - A subagent given a large task cannot break it down further
	  - The master agent must handle ALL task decomposition
	  - Large, complex tasks given to subagents may timeout or fail
	  - This is why small subtasks are essential
	  
	  ## 🎯 SMALL SUBTASK STRATEGY (MANDATORY)
	  **ALWAYS prefer small, focused subtasks:**
	  - **Less than 3 steps** to complete
	  - **Less than 5 minutes** execution time
	  - **Well-isolated** and self-sufficient
	  - **Minimal context** required
	  
	  **Iterative Execution Pattern:**
	  1. Launch a batch of small discovery/analysis subtasks
	  2. Collect and analyze their results
	  3. Launch the next batch based on findings
	  4. Repeat until the overall task is complete
	  
	  **Benefits:**
	  - More focused and less likely to fail
	  - Better feedback for next steps
	  - Easier to debug and retry if needed
	  - Optimal resource utilization
	  - Avoids context window bloat
	  
	  ## 🎯 SUBTASK SCOPE SEPARATION (CRITICAL)
	  **Subtasks MUST be extremely well separated with NO overlap:**
	  
	  ### Core Separation Principles
	  - **Different Files/Folders**: Each subtask works on completely different files or directory structures
	  - **Different Aspects**: Each subtask addresses distinct aspects of the parent task (e.g., UI vs API vs data layer)
	  - **Different Domains**: Each subtask focuses on separate functional domains (auth vs payments vs notifications)
	  - **Different Phases**: Each subtask handles different phases of work (analysis vs implementation vs testing)
	  
	  ### Mandatory Separation Rules
	  1. **File Isolation**: No two subtasks should read/write the same files
	  2. **Functional Isolation**: No two subtasks should work on the same feature/component
	  3. **Layer Isolation**: Separate subtasks for frontend, backend, database, tests, docs
	  4. **Module Isolation**: Different subtasks for different modules/packages/services
	  
	  ### Examples of PROPER Scope Separation
	  ✅ **GOOD - Clean Separation:**
	  \`\`\`
	  Subtask A: "Analyze frontend components in src/components/"
	  Subtask B: "Analyze backend API routes in src/api/routes/"
	  Subtask C: "Analyze database models in src/models/"
	  \`\`\`
	  
	  ✅ **GOOD - Different Aspects:**
	  \`\`\`
	  Subtask A: "Check authentication implementation"
	  Subtask B: "Check error handling patterns"
	  Subtask C: "Check performance optimization"
	  \`\`\`
	  
	  ### Examples of BAD Scope Overlap
	  ❌ **BAD - File Overlap:**
	  \`\`\`
	  Subtask A: "Analyze user authentication in src/auth/"
	  Subtask B: "Check user validation in src/auth/"  // OVERLAPS!
	  \`\`\`
	  
	  ❌ **BAD - Functional Overlap:**
	  \`\`\`
	  Subtask A: "Implement user registration"
	  Subtask B: "Add user registration validation"  // OVERLAPS!
	  \`\`\`
	  
	  ### Scope Separation Checklist
	  Before launching subtasks, verify:
	  □ Each subtask targets completely different files/directories
	  □ Each subtask addresses a distinct functional aspect
	  □ No subtask depends on another's results to start
	  □ No two subtasks could conflict if run simultaneously
	  □ Each subtask can be completed independently
	  □ The scopes are mutually exclusive (no overlap)
	  
	  ## 🚀 EFFICIENCY TIPS
	  **Choose the optimal discovery tool for subagents based on task requirements:**
	  - **File structure exploration**: Use 'glob' with patterns like '**/*.{js,ts}' or '**/test/**/*'
	  - **Content-based discovery**: Use 'search_files' for patterns like 'TODO', 'function\\s+\\w+', or specific code constructs
	  - **Performance consideration**: Both tools are efficient for their intended use cases
	  - **MANDATORY LSP WORKFLOW**: After finding files with either tool, subagents MUST use LSP tools for analysis. DO NOT read full files.
	  - Use \`lsp_get_document_symbols\` to understand file structure.
	  - **MANDATORY**: Use \`lsp_find_usages\` to analyze dependencies and understand how code is connected.
	  - **MANDATORY**: Use \`lsp_get_call_hierarchy\` to understand function relationships and execution flows.
	  - Use \`lsp_get_symbol_children\` to explore symbol structure before extracting code.
	  - Use \`lsp_get_hover_info\` and \`lsp_get_symbol_code_snippet\` for targeted analysis ONLY after understanding structure.
	  - **Complementary usage**: Tools can be used together - glob for broad discovery, search_files for content analysis.
	  
	  ## 📋 WHEN YOU MUST USE SUBAGENT (MANDATORY)
	  Use subagent as your FIRST tool for tasks that:
	  - Involve searching for code, files, or functionality
	  - Require understanding existing implementation
	  - Can be broken into parallel, independent subtasks
	  - Are well-scoped (describable in <1000 words)
	  - Don't need continuous user interaction
	  - Involve analysis, refactoring, or code generation
	  - Are part of multi-step to-do lists where each step is:
	    • Well isolated and self-sufficient
	    • Doesn't need whole conversation context
	    • Can be accomplished with minimal prompt/info
	  
	  ## ❌ WHEN NOT TO USE SUBAGENT
	  - Simple tasks that can be done in a single step
	  - Tasks requiring user interaction or feedback
	  - Subtasks too small to justify parallel execution
	  - Tasks requiring immediate context from main conversation
	  - Tasks highly dependent on current conversation state
	  - Tasks with complex interdependencies with conversation state
	  - Need to maintain stateful information across operations
	  - Sequential dependencies when tasks must run in order
	  - Shared state required when agents need to share data
	  - Real-time requirements when immediate response needed
	  - Complex coordination when agents need to negotiate
	  - Single file focus when working on just one file
	  - Highly interactive tasks when user interaction is required
	  - Contextual awareness needed when tasks depend on conversation history
	  - **Tasks with overlapping scopes** - If subtasks would work on same files/domains
	  - **Interdependent subtasks** - If one subtask needs another's results to proceed
	  - **Conflicting modifications** - If multiple subtasks would modify related code
	  
	  ## 📝 PARAMETERS
	  Pass a single JSON object for one agent, or an array of JSON objects for multiple agents.
	  
	  **Required fields:**
	  - \`description\`: Short 3-5 word task description
	  - \`message\`: Detailed instructions for the agent
	  
	  **Optional fields:**
	  - \`subagent_type\`: String name of a predefined agent (e.g., "code-reviewer"). When set, only that agent’s system prompt is prepended to the subagent’s message.
	  If not found, no prompt is prepended. Discovery priority when resolving names: system > project > global.
	  
	  ### Predefined Subagents: A General Overview
	  Predefined subagents are specialized, reusable AI assistants that handle specific, recurring tasks with a consistent methodology. They are not a fixed list but are discovered dynamically at runtime from your system, project, and user directories.

	  - **Why Use Predefined Subagents?**
	    - **Consistency & Quality**: Enforce proven, high-quality workflows for common tasks like code reviews or bug investigations.
	    - **Efficiency**: Eliminate the need to write complex, repetitive instructions from scratch.
	    - **Standardization**: Share and reuse best practices across your team and projects.

	  - **How They Work**
	    1.  **Discovery**: At runtime, the system searches for agent definition files (.md with YAML frontmatter) in three locations, in order of priority: the  internal system ,  the current project ('.zentara/agents/'), and the user's home directory ('~/.zentara/agents/').
	    2.  **Selection**: You invoke a predefined agent by setting the "subagent_type" parameter to its unique "name" (e.g., "code-reviewer").
	    3.  **Composition**: The system finds the corresponding agent and prepends its specialized system prompt to the "message" you provide. Your message should contain the specific inputs for the task, while the agent's prompt provides the methodology.

	  - **When to Use "subagent_type"**
	    - **Use For**: Tasks that fit a standardized, repeatable process, such as code reviews, bug analysis, API design, or generating documentation.
	    - **Avoid For**: Novel or highly exploratory tasks that don't fit a predefined workflow and require creative, open-ended problem-solving.

	  - **Key Principles**
	    - **Dynamic & Extensible**: The list of available agents is not fixed. You can add your own project-specific or user-specific agents, which will be discovered automatically.
	    - **Priority System**: If agents with the same name exist in multiple locations, the one with the highest priority (System > Project > User) is used.
	  	  
	  Following is the current accessible list of predefined agents, only choose the subagent_type from this list if you need, do not invent new ones:
${agentsList}


	  ### Example 1: Small Subtask Approach with Iterative Execution + SCOPE SEPARATION
	  **First batch - Discovery phase (SEPARATED scopes):**
	  \`\`\`
	  <subagent>
	  [
	    {
	      "description": "Find project files",
	      "message": "Find config/doc files using 'glob' pattern '*.{json,md,yml,yaml}' at root level. Read and report project type, tech stack, dependencies. SCOPE: Root-level config files only."
	    },
	    {
	      "description": "Map directory structure",
	      "message": "Use 'glob' with pattern '*/' to identify top-level directories. Report directory names and their likely purposes. SCOPE: Directory structure analysis only."
	    }
	  ]
	  </subagent>
	  \`\`\`
	  **Scope separation:** One handles config files, other handles directories - zero overlap
	  
	  **Second batch - Analysis phase (SEPARATED by layer):**
	  \`\`\`
	  <subagent>
	  [
	    {
	      "description": "Analyze API structure",
	      "message": "Use 'glob' with pattern '**/api/**/*.{js,ts}' to find API files. Use \`lsp_get_document_symbols\` on 2-3 representative files to identify framework and patterns. MANDATORY: Use \`lsp_find_usages\` and \`lsp_get_call_hierarchy\` to understand API usage patterns and function relationships. SCOPE: Backend API layer only."
	    },
	    {
	      "description": "Analyze UI components",
	      "message": "Use 'glob' with pattern '**/components/**/*.{jsx,tsx}' to find components. Use \`lsp_get_document_symbols\` on App.tsx and 2 major components to understand the UI framework and component structure. SCOPE: Frontend UI layer only."
	    }
	  ]
	  </subagent>
	  \`\`\`
	  **Scope separation:** Backend vs Frontend - completely different file trees and domains
	  
	  ### Example 2: Task Decomposition (Wrong vs Right) - SCOPE SEPARATION FOCUS
	  **❌ WRONG - Single large subagent with overlapping scope:**
	  \`\`\`
	  <subagent>
	  {
	    "description": "Analyze entire codebase",
	    "message": "Analyze the entire codebase architecture including frontend, backend, database, tests, and deployment. Provide a comprehensive report."
	  }
	  </subagent>
	  \`\`\`
	  **Problems:** Single massive scope, no separation, will timeout/fail
	  
	  **✅ RIGHT - Multiple parallel subtasks with CLEAN SCOPE SEPARATION:**
	  \`\`\`
	  <subagent>
	  [
	    {
	      "description": "Analyze project structure",
	      "message": "Use 'glob' with '*.{json,md,yml,yaml}' to find config files. Read ONLY: README.md, package.json, tsconfig.json. Report: project type, tech stack, dependencies. SCOPE: Root config files only."
	    },
	    {
	      "description": "Map API architecture",
	      "message": "Use 'glob' with '**/routes/**/*.{js,ts}' and '**/controllers/**/*.{js,ts}' to find API files. Use \`lsp_get_document_symbols\` on 2-3 files to report the API framework and endpoint patterns. SCOPE: Backend API layer only."
	    },
	    {
	      "description": "Analyze UI components",
	      "message": "Use 'glob' with '**/components/**/*.{jsx,tsx}' to find components. Use \`lsp_get_document_symbols\` on App.tsx and 2 components to report the UI framework and component structure. SCOPE: Frontend UI layer only."
	    },
	    {
	      "description": "Discover data layer",
	      "message": "Use 'glob' with '**/{models,schemas,entities}/**/*.{js,ts}' for data models. Use \`lsp_get_document_symbols\` on 1 model file to report the database type, ORM/ODM, and schema patterns. SCOPE: Data/database layer only."
	    },
	    {
	      "description": "Assess test coverage",
	      "message": "Use 'glob' with '**/*.{test,spec}.{js,ts,jsx,tsx}' to find test files. Count by directory. Report: test framework, file count by module. SCOPE: Testing files only."
	    }
	  ]
	  </subagent>
	  \`\`\`
	  **Benefits:** Each subtask has completely separate scope - no file/folder/domain overlap
	  
	  ### Example 3: Complex Task with Write Permissions
	  \`\`\`
	  <subagent>
	  {
	    "description": "Refactor import statements",
	    "message": "Update all import statements from '@old/package' to '@new/package' in all TypeScript files under the src directory.",
	    "writePermissions": true,
	    "allowedWritePaths": ["src/**/*.ts"],
	    "maxExecutionTime": 180000
	  }
	  </subagent>
	  \`\`\`
	  
	  ### Example 4: Using a Predefined Subagent
	  **Use a predefined agent for a standard task like a code review:**
	  \`\`\`
	  <subagent>
	  {
	    "description": "Review PR #123",
	    "message": "Please review pull request #123.",
	    "subagent_type": "code-reviewer"
	  }
	  </subagent>
	  \`\`\`
	  **Benefit:** Leverages a standardized, high-quality workflow for code reviews without needing to specify the steps manually. The message provides the specific input (the PR number), and the predefined agent provides the methodology.
	  ### Example 5: Using a Predefined \`bug-investigator\` Subagent
 		\`\`\`
	  <subagent>
	  {
	    \"description\": \"Investigate profile crash\",
	    \"subagent_type\": \"bug-investigator\",
	    \"message\": \"The application crashes when the user clicks the 'submit' button on the profile page. Here is the error log: [...log details...]\"
	  }
	  </subagent>
 	\`\`\`
	  
	  ### Example 6: DEBUGGING - find_usages for Error Investigation
	  **When debugging errors or investigating issues:**
	  \`\`\`
	  <subagent>
	  {
	    "description": "Debug authentication error",
	    "message": "There's an authentication error in the login flow. Use \`lsp_find_usages\` to find all places where the validateToken function is called to understand where the error might be propagating. Then use \`lsp_get_call_hierarchy\` to trace the complete authentication flow. Report: 1) All files calling validateToken, 2) The complete call chain from login to token validation, 3) Any error handling gaps in the flow."
	  }
	  </subagent>
	  \`\`\`
	  
	  ### Example 7: CODEBASE EXPLORATION - Understanding How Features Work
	  **When exploring unfamiliar code to understand how features work:**
	  \`\`\`
	  <subagent>
	  {
	    "description": "Understand user permissions system", 
	    "message": "Explore how the user permissions system works in this codebase. Use \`lsp_find_usages\` to find everywhere 'checkPermissions' is used, then use \`lsp_get_call_hierarchy\` to understand the complete permission checking flow. Report: 1) How permissions are checked across different features, 2) The complete call hierarchy from route handlers to permission validation, 3) Any middleware or interceptors in the permission flow."
	  }
	  </subagent>
	  \`\`\`
	  
	  ### Example 8: ERROR ANALYSIS - Tracing Error Propagation  
	  **When investigating how errors propagate through the system:**
	  \`\`\`
	  <subagent>
	  {
	    "description": "Trace database connection errors",
	    "message": "Users are reporting intermittent database errors. Use \`lsp_find_usages\` to find all places where database connections are established, then use \`lsp_get_call_hierarchy\` to understand the complete error handling chain. Report: 1) All components that use database connections, 2) How database errors bubble up through the call stack, 3) Any missing error handling in the connection flow."
	  }
	  </subagent>
	  \`\`\`
	  
	  ### Example 9: REFACTORING IMPACT - Before Changing Critical Functions
	  **Before modifying functions that might break other code:**
	  \`\`\`
	  <subagent>
	  {
	    "description": "Analyze updateUser function impact",
	    "message": "Before changing the updateUser function signature, use \`lsp_find_usages\` to find ALL references across the codebase, then use \`lsp_get_call_hierarchy\` to understand its role in larger workflows. Report: 1) Every file and function that calls updateUser, 2) The complete call chains that include updateUser, 3) Any API endpoints or background jobs that depend on it."
	  }
	  </subagent>
	  \`\`\`
	  
	  ### Example 10: CONTENT-BASED DISCOVERY - Finding Error Patterns
	  **When you need to find code by what it contains, not what it's named:**
	  \`\`\`
	  <subagent>
	  {
	    "description": "Find error handling patterns",
	    "message": "Use 'search_files' with pattern 'try\\\\s*{|catch\\\\s*\\\\(' to find error handling implementations across the codebase. Use \`lsp_get_call_hierarchy\` to understand error propagation patterns. Report: 1) All files with error handling, 2) Error handling patterns used, 3) Any missing error handling gaps. SCOPE: Error handling analysis only."
	  }
	  </subagent>
	  \`\`\`
	  
	  ### Example 11: HYBRID APPROACH - Comprehensive Analysis
	  **When you need both file structure and content analysis:**
	  \`\`\`
	  <subagent>
	  {
	    "description": "Analyze test coverage",
	    "message": "First use 'glob' with pattern '**/*.{test,spec}.{js,ts,jsx,tsx}' to find test files, then use 'search_files' with pattern 'describe\\\\(|it\\\\(|test\\\\(' to analyze test patterns. Use \`lsp_get_document_symbols\` on representative test files. Report: 1) Test file organization, 2) Test framework patterns, 3) Coverage gaps by module. SCOPE: Testing analysis only."
	  }
	  </subagent>
	  \`\`\`
	  
	  ### Example 12: DEPRECATED CODE DISCOVERY
	  **When searching for specific code patterns or issues:**
	  \`\`\`
	  <subagent>
	  {
	    "description": "Find deprecated API usage",
	    "message": "Use 'search_files' with pattern 'deprecated|@deprecated|DEPRECATED' to find deprecated code usage. Use \`lsp_find_usages\` to understand impact scope. Report: 1) All deprecated code locations, 2) Usage frequency, 3) Migration recommendations. SCOPE: Deprecation analysis only."
	  }
	  </subagent>
	  \`\`\`
	  
	  ## ⚙️ KEY OPERATIONAL NOTES
   - Agents execute in parallel and don't block your workflow
   - Each agent has an isolated context (no access to conversation history)
   - Agents automatically complete when their task is done
   - **CRITICAL**: Subagents cannot launch other subagents - only the master agent can spawn agents
   
   ## 💡 CONTEXT PRESERVATION PRINCIPLE
   Even for "simple" tasks, delegate to a subagent if you only need the RESULT:
   - Reading and analyzing a file? → Subagent (saves your context from file contents)
   - Searching for patterns across codebase? → Subagent (saves your context from search results)
   - Generating boilerplate code? → Subagent (saves your context from generated code)
   - ANY self-contained analysis? → Subagent (preserves your valuable context window)
   
   **Example:** "Analyze a 1000-line file"
   ❌ WRONG: Read the file yourself (wastes master context).
   ✅ RIGHT: Launch a subagent to analyze the file using LSP tools. The subagent MUST use \`lsp_get_document_symbols\` for an overview, \`lsp_find_usages\` to understand dependencies, \`lsp_get_call_hierarchy\` to understand function relationships, \`lsp_get_symbol_children\` to explore symbol structure, and \`lsp_get_symbol_code_snippet\` for targeted analysis ONLY after understanding structure, reporting back with a summary. This avoids reading the entire file and is the required, token-efficient method.
   
   ## 🎯 MASTER AGENT CHECKLIST
   **Before proceeding with ANY task, ask yourself:**
   □ Can this be split into 2+ parallel independent subtasks? → MUST use multiple subagents
   □ Are there independent aspects to analyze? → MUST launch parallel agents
   □ Can different parts be done simultaneously? → MUST parallelize
   □ Is this a self-contained task that doesn't need context? → MUST use subagent to save context
   □ Will this consume significant context window? → MUST delegate to subagent
   □ **Can each subtask be completed in <3 steps and <5 minutes?** If not → Break into smaller subtasks
   □ **Will I need additional subagents based on results?** If yes → Plan for iterative execution
   
   **🎯 SCOPE SEPARATION VERIFICATION (MANDATORY):**
   □ **Different Files/Folders**: Does each subtask target completely different file paths?
   □ **Different Functional Domains**: Does each subtask work on separate features/modules?
   □ **Different Architectural Layers**: Are subtasks separated by frontend/backend/data/test layers?
   □ **Zero Overlap**: Can all subtasks run simultaneously without conflicts?
   □ **Independent Completion**: Can each subtask finish without waiting for others?
   □ **Mutually Exclusive Scopes**: Do the scopes have zero intersection?
   
   □ **For multi-step to-do lists, ask:**
     • Is this step well isolated and self-sufficient?
     • Does it NOT need the whole previous conversation context?
     • Can it be accomplished with minimal prompt/info?
     • Does it work on different files/aspects than other subtasks?
     • If YES to all → Launch a subagent for this step
   □ Is this a single atomic operation that REQUIRES context continuity? → Only then do it yourself
   
   **YOUR MANDATE AS MASTER AGENT:**
   1. **DECOMPOSE** - Break every complex task into parallel independent subtasks
   2. **DELEGATE** - Launch multiple subagents for maximum parallelism
   3. **INTEGRATE** - Synthesize results from all subagents
   4. **PRESERVE** - Keep your context window clean for orchestration
   
   **FINAL REMINDER**: You are the CONDUCTOR of an orchestra. Delegate work to subagents not just for parallelism, but also to keep your context window clean for orchestration and integration.
   
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

## Best Practices

### 1. Task Scoping (Enhanced) + SCOPE SEPARATION
- **Single Responsibility**: One clear, measurable goal per agent
- **Explicit I/O Contract**: Define exact input format and output schema
- **No Side Effects**: Read-only by default, write permissions must be explicit
- **Time Boundaries**: Respect 5-minute execution limit
- **Resource Isolation**: No shared state or dependencies between agents
- **Conflict Prevention**: Ensure no two agents modify the same file
- **Success Criteria**: Define measurable outcomes
- **Error Handling**: Specify behavior for partial completion

**🎯 SCOPE SEPARATION REQUIREMENTS:**
- **File Path Isolation**: Each agent works on completely different file paths/globs
- **Domain Isolation**: Each agent handles different functional domains (auth vs payments vs UI)
- **Layer Isolation**: Separate agents for frontend/backend/database/tests/docs
- **Module Isolation**: Different agents for different npm packages/microservices
- **Aspect Isolation**: Different agents for security/performance/testing concerns
- **Phase Isolation**: Different agents for analysis/implementation/validation phases

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

### 1. Microservices Migration (SCOPE SEPARATED)
Split a monolithic application into microservices with specialized agents handling:
- **Agent A**: Service boundary identification in \`src/services/\` - SCOPE: Service files only
- **Agent B**: API contract definition in \`src/api/contracts/\` - SCOPE: API contracts only
- **Agent C**: Data model separation in \`src/models/\` - SCOPE: Database models only
- **Agent D**: Integration testing in \`tests/integration/\` - SCOPE: Test files only
- **Agent E**: Deployment configuration in \`deploy/\` and \`.github/\` - SCOPE: Config files only

### 2. Technical Debt Reduction (SCOPE SEPARATED)
Multiple agents working on different aspects:
- **Agent A**: Code smell detection in \`src/components/\` - SCOPE: Frontend components
- **Agent B**: Refactoring implementation in \`src/services/\` - SCOPE: Backend services
- **Agent C**: Test coverage improvement in \`tests/unit/\` - SCOPE: Unit tests only
- **Agent D**: Documentation updates in \`docs/\` and \`*.md\` files - SCOPE: Documentation only
- **Agent E**: Performance optimization in \`src/utils/\` - SCOPE: Utility functions only

### 3. Security Hardening (SCOPE SEPARATED)
Parallel security improvements:
- **Agent A**: Vulnerability scanning in \`package.json\` and deps - SCOPE: Dependencies only
- **Agent B**: Authentication strengthening in \`src/auth/\` - SCOPE: Auth module only
- **Agent C**: Input validation in \`src/validators/\` - SCOPE: Validation layer only
- **Agent D**: Security test creation in \`tests/security/\` - SCOPE: Security tests only
- **Agent E**: HTTPS/TLS config in server config files - SCOPE: Server configs only

### 4. Codebase Modernization (SCOPE SEPARATED)
Upgrade legacy code with agents handling:
- **Agent A**: Framework migration in \`src/legacy/\` - SCOPE: Legacy code only
- **Agent B**: Language version updates in \`tsconfig.json\` and types - SCOPE: TypeScript config
- **Agent C**: Build system modernization in \`webpack.config.js\`, \`package.json\` - SCOPE: Build tools
- **Agent D**: CI/CD pipeline updates in \`.github/workflows/\` - SCOPE: CI/CD files only
- **Agent E**: Documentation refresh in \`README.md\`, \`docs/\` - SCOPE: Documentation only


## Limitations and Considerations

### Agent Limitations
- **5-Minute Execution Cap**: Hard timeout at 5 minutes
- **No Inter-Agent Communication**: Agents cannot coordinate directly
- **Stateless Execution**: No persistence between invocations
- **File Lock Constraints**: One agent per file for writes
- **No Shared Cache**: Each agent has isolated cache
- **No Global State**: Cannot use global variables or shared memory


### When to Prefer Small Subtasks Over Large Ones

- **Complex Analysis Tasks**: Break into focused analysis of specific components
- **Large Codebase Exploration**: Explore in sections, then dive deeper based on findings
- **Multi-Step Workflows**: Execute each step as a separate batch of subtasks
- **Iterative Development**: Launch analysis subtasks, then implementation based on results
- **Unknown Scope**: Start with discovery subtasks, then follow-up based on findings

**REMEMBER**: Always prefer small, focused subtasks (less than 3 steps, less than 5 minutes) that can be executed in batches, with results informing the next batch of subtasks.


### Effective Task Descriptions + SCOPE SEPARATION

**✅ GOOD: Specific, measurable, bounded, WELL-SCOPED**
\`\`\`json
{
  "description": "Implement user service",
  "message": "Create a UserService class in src/services/user/ that: - Implements CRUD operations for users - Uses repository pattern with TypeORM - Includes input validation using class-validator - Handles errors with custom exceptions - Returns DTOs not entities. Export the service and its interface. SCOPE: Only user service files, no auth or other services."
}
\`\`\`

**✅ GOOD: Multiple agents with SEPARATED scopes**
\`\`\`json
[
  {
    "description": "Implement user service",
    "message": "Create UserService in src/services/user/ with CRUD operations. SCOPE: User service files only."
  },
  {
    "description": "Implement auth service",
    "message": "Create AuthService in src/services/auth/ with login/logout. SCOPE: Auth service files only."
  }
]
\`\`\`

**❌ BAD: Vague, unbounded, unclear deliverables**
\`\`\`json
{
  "description": "Work on users",
  "message": "Improve the user management in the application"
}
\`\`\`

**❌ BAD: Overlapping scopes**
\`\`\`json
[
  {
    "description": "Fix user service",
    "message": "Fix bugs in user authentication and registration"
  },
  {
    "description": "Improve user auth",
    "message": "Enhance user authentication security"  // OVERLAPS with above!
  }
]

`
}
