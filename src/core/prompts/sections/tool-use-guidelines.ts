import { CodeIndexManager } from "../../../services/code-index/manager"

export function getToolUseGuidelinesSection(codeIndexManager?: CodeIndexManager): string {
	const isCodebaseSearchAvailable =
		codeIndexManager &&
		codeIndexManager.isFeatureEnabled &&
		codeIndexManager.isFeatureConfigured &&
		codeIndexManager.isInitialized

	// Build guidelines array with automatic numbering
	let itemNumber = 1
	const guidelinesList: string[] = []

	// First guideline is always the same
	guidelinesList.push(
		`${itemNumber++}. In <thinking> tags, assess what information you already have and what information you need to proceed with the task.`,
	)

	// Conditional codebase search guideline
	if (isCodebaseSearchAvailable) {
		guidelinesList.push(
			`${itemNumber++}. **MANDATORY FIRST STEP: For ANY task involving code search, understanding, analysis, you MUST use the 'subagent' tool BEFORE attempting any other tools.** This is NOT a suggestion - it is a REQUIREMENT. The subagent tool enables parallel processing and semantic understanding that other tools cannot provide. Only after using subagent (or determining with certainty it's not applicable) should you consider search_files, list_files, or read_file for specific focused exploration.`,
		)
		guidelinesList.push(
			`${itemNumber++}. **CRITICAL REQUIREMENT: Before using ANY tool, if you do not have COMPLETE knowledge of its full parameters, usage examples, and behavior, you MUST use the 'fetch_tool_description' tool to get the complete documentation. NEVER rely on brief descriptions alone when you are uncertain about how to use a tool.** Choose the most appropriate tool based on the task and the tool descriptions provided. After using codebase_search for initial exploration of any new code area, you may then use more specific tools like search_files (for regex patterns), list_files, or read_file for detailed examination. For example, using the list_files tool is more effective than running a command like \`ls\` in the terminal. It's critical that you think about each available tool and use the one that best fits the current step in the task.`,
		)
	} else {
		guidelinesList.push(
			`${itemNumber++}. **CRITICAL REQUIREMENT: Before using ANY tool, if you do not have COMPLETE knowledge of its full parameters, usage examples, and behavior, you MUST use the 'fetch_tool_description' tool to get the complete documentation. NEVER rely on brief descriptions alone when you are uncertain about how to use a tool.** Choose the most appropriate tool based on the task and the tool descriptions provided. Assess if you need additional information to proceed, and which of the available tools would be most effective for gathering this information. For example using the list_files tool is more effective than running a command like \`ls\` in the terminal. It's critical that you think about each available tool and use the one that best fits the current step in the task.`,
		)
	}

	guidelinesList.push(
		`${itemNumber++}. **MANDATORY LSP-CENTRIC WORKFLOW FOR CODE ANALYSIS**: For any task that requires understanding, analyzing, or modifying code, you MUST adopt an LSP-centric workflow. This is not a suggestion—it is a requirement for efficient and accurate operation.
	 - **Step 1: Understand Structure**: Use \`lsp_get_document_symbols\` to get a high-level overview of the code in a file. This is the most token-efficient way to understand a file's architecture.
	 - **Step 2: MANDATORY DEPENDENCY ANALYSIS**: Use \`lsp_find_usages\` to understand how symbols are used across the codebase BEFORE making any changes.
	 - **Step 3: MANDATORY FUNCTION RELATIONSHIP ANALYSIS**: Use \`lsp_get_call_hierarchy\` to understand function call relationships and execution flows.
	 - **Step 4: Navigate and Analyze**: Use tools like \`lsp_go_to_definition\` and \`lsp_get_hover_info\` to trace code and get detailed information about specific symbols.
	 - **Step 5: Explore Symbol Structure**: Use \`lsp_get_symbol_children\` to understand the internal structure of classes, interfaces, or modules. This provides a token-efficient way to see what methods, properties, or nested elements a symbol contains without reading full code.
	 - **Step 6: Extract Relevant Code**: ONLY after understanding structure with \`lsp_get_symbol_children\`, use \`lsp_get_symbol_code_snippet\` to extract specific code blocks for closer inspection or modification.
	 - **FORBIDDEN ACTION**: You are STRICTLY FORBIDDEN from using \`read_file\` to understand code. This tool is extremely token-inefficient and should only be used for non-code files (e.g., \`.md\`, \`.txt\`) or as a last resort when all other methods have failed.
	 
	 **CRITICAL: MANDATORY LSP TOOL USAGE ENFORCEMENT**
	 You are REQUIRED to use these LSP tools in the following scenarios:
	 
	 **\`lsp_find_usages\` is MANDATORY when:**
	 - **DEBUGGING**: Investigating bugs, errors, or unexpected behavior to understand symbol usage
	 - **ERROR INVESTIGATION**: Tracing how problematic code is used across the codebase  
	 - **CODEBASE EXPLORATION**: Understanding how functions, variables, or classes are used
	 - Modifying, renaming, or deleting ANY symbol
	 - Changing function signatures or parameters
	 - Before any refactoring operations
	 - Analyzing API usage patterns
	 
	 **\`lsp_get_call_hierarchy\` is MANDATORY when:**
	 - **DEBUGGING**: Tracing execution paths and understanding function call chains during error investigation
	 - **ERROR ANALYSIS**: Understanding how errors propagate through function call hierarchies
	 - **CODEBASE EXPLORATION**: Understanding how complex features or systems work by following call chains
	 - Modifying functions to understand caller relationships
	 - Making architectural changes
	 - Analyzing performance or security issues
	 - Understanding function dependencies
	 
	 **\`lsp_get_symbol_children\` is MANDATORY when:**
	 - **STRUCTURE EXPLORATION**: Understanding what methods, properties, or nested elements a class, interface, or module contains
	 - **CODE ANALYSIS**: Before using \`lsp_get_symbol_code_snippet\` to avoid retrieving unnecessarily long code blocks
	 - **REFACTORING PREPARATION**: Understanding the internal structure of symbols before making changes
	 - **API DISCOVERY**: Exploring available methods and properties of classes or interfaces
	 - **INCREMENTAL CODE UNDERSTANDING**: Progressively drilling down into complex symbol hierarchies`,
	)

	// Remaining guidelines
	guidelinesList.push(
		`${itemNumber++}. If multiple actions are needed, use one tool at a time per message to accomplish the task iteratively, with each tool use being informed by the result of the previous tool use. Do not assume the outcome of any tool use. Each step must be informed by the previous step's result.`,
	)
	guidelinesList.push(`${itemNumber++}. Formulate your tool use using the XML format specified for each tool.`)
	guidelinesList.push(`${itemNumber++}. After each tool use, the user will respond with the result of that tool use. This result will provide you with the necessary information to continue your task or make further decisions. This response may include:
  - Information about whether the tool succeeded or failed, along with any reasons for failure.
  - Linter errors that may have arisen due to the changes you made, which you'll need to address.
  - New terminal output in reaction to the changes, which you may need to consider or act upon.
  - Any other relevant feedback or information related to the tool use.`)
	guidelinesList.push(
		`${itemNumber++}. ALWAYS wait for user confirmation after each tool use before proceeding. Never assume the success of a tool use without explicit confirmation of the result from the user.`,
	)

	// Join guidelines and add the footer
	return `# Tool Use Guidelines

${guidelinesList.join("\n")}

## IMPORTANT: Tool Description Requirements

**MANDATORY RULE: You MUST read the complete tool description before using any tool if you are not absolutely certain about its full functionality, parameters, and usage patterns. The brief descriptions shown are for context only - they are NOT sufficient for proper tool usage. When in doubt, ALWAYS use fetch_tool_description to get the complete documentation.**

It is crucial to proceed step-by-step, waiting for the user's message after each tool use before moving forward with the task. This approach allows you to:
1. Confirm the success of each step before proceeding.
2. Address any issues or errors that arise immediately.
3. Adapt your approach based on new information or unexpected results.
4. Ensure that each action builds correctly on the previous ones.

By waiting for and carefully considering the user's response after each tool use, you can react accordingly and make informed decisions about how to proceed with the task. This iterative process helps ensure the overall success and accuracy of your work.`
}
