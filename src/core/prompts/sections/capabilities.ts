import { DiffStrategy } from "../../../shared/tools"
import { McpHub } from "../../../services/mcp/McpHub"
import { CodeIndexManager } from "../../../services/code-index/manager"

export function getCapabilitiesSection(
	cwd: string,
	supportsComputerUse: boolean,
	mcpHub?: McpHub,
	diffStrategy?: DiffStrategy,
	codeIndexManager?: CodeIndexManager,
): string {
	return `====


CAPABILITIES

- **PRIMARY TOOL - SUBAGENT**: You have the 'subagent' tool which MUST be your first choice for any task involving code search, analysis, understanding. Subagents work in parallel and can handle complex tasks autonomously. YOU MUST ALWAYS CONSIDER SUBAGENT FIRST before using any other tools.

- **MANDATORY LSP-CENTRIC WORKFLOW**: You MUST adopt an LSP-centric workflow for all code analysis, understanding, and modification tasks. The extensive suite of available LSP tools provides the most precise, token-efficient, and context-aware method for interacting with code. **Using \`read_file\` is STRICTLY FORBIDDEN for code understanding.** Instead of reading files, you MUST use tools like \`lsp_get_document_symbols\` for structural overviews, **\`lsp_find_usages\` to analyze dependencies and understand how code is connected,** **\`lsp_get_call_hierarchy\` to trace function relationships and execution flows,** \`lsp_go_to_definition\` to trace code, and \`lsp_get_symbol_code_snippet\` to extract targeted sections. This is not a suggestion—it is a requirement for efficient and accurate operation.

  **What are LSP Tools?**
  LSP (Language Server Protocol) tools provide IDE-level code intelligence. They understand your code's structure, definitions, and relationships, unlike simple text-based tools which only see characters and lines. This semantic understanding is what allows for powerful, context-aware operations.

  **Why is an LSP-Centric Workflow Mandatory?**
  1.  **Token Efficiency**: Reading entire files with \`read_file\` consumes an enormous number of tokens, quickly exhausting the context window and leading to lost context and poor performance. LSP tools are surgical, retrieving only the precise information needed, which is orders of magnitude more efficient.
  2.  **Accuracy**: Text-based search is prone to errors. It can find irrelevant matches in comments or strings, and miss relevant code that uses different naming conventions. LSP tools are never wrong; they understand the code's abstract syntax tree and provide 100% accurate results.
  3.  **Speed**: LSP operations are highly optimized and backed by a dedicated language server, making them significantly faster than reading and analyzing large files manually.
  4.  **Context-Awareness**: LSP tools provide rich, contextual information, such as type definitions, function signatures, and references, which is impossible to obtain from raw text.

  **MANDATORY USAGE SCENARIOS FOR CRITICAL LSP TOOLS:**
  
  **You MUST use \`lsp_find_usages\` in these scenarios:**
  - **DEBUGGING**: When investigating bugs to understand how problematic symbols are used across the codebase
  - **ERROR INVESTIGATION**: When tracing where errors originate and how they propagate through symbol usage
  - **CODEBASE EXPLORATION**: When exploring how specific functions, variables, or classes are used throughout the system
  - Before renaming, modifying, or deleting ANY symbol (variable, function, class, method)
  - Before changing function signatures or method parameters
  - Before refactoring to understand the full impact scope
  - When analyzing API usage patterns
  - Before removing what appears to be "dead code"
  
  **You MUST use \`lsp_get_call_hierarchy\` in these scenarios:**
  - **DEBUGGING**: When investigating bugs to trace execution paths and function relationships  
  - **ERROR INVESTIGATION**: When analyzing error propagation and call chains that lead to failures
  - **CODEBASE EXPLORATION**: When understanding how unfamiliar features or systems work
  - Before modifying any function to understand its callers and callees
  - Before architectural changes to understand function dependencies
  - When analyzing performance issues to identify call chains
  - Before adding error handling to understand call contexts
  - When investigating security issues to trace data flow through function calls

  **Available LSP Tools (24) - Priority Order:**
  - **\`find_usages\`: Find all references to a symbol. MANDATORY for understanding dependencies before any code changes.**
  - **\`get_call_hierarchy\`: Explore the call stack of a function. MANDATORY for understanding function relationships.**
  - **\`get_document_symbols\`: Get a structured, hierarchical outline of all symbols in a file. MANDATORY for understanding the overall structure and organization of code.**
  - **\`get_symbol_children\`: Get children of a specific symbol with configurable depth. MANDATORY for exploring symbol structure before extracting code.**
  - **\`get_symbol_code_snippet\`: Retrieve a code snippet for a given symbol location. Use ONLY after understanding structure with get_symbol_children.**
  - \`find_implementations\`: Find all implementations of an interface or abstract class.
  - \`get_code_actions\`: Get refactoring suggestions and quick fixes.
  - \`get_code_lens\`: Get actionable, contextual information interleaved with source code.
  - \`get_completions\`: Get intelligent, context-aware code completion suggestions.
  - \`get_declaration\`: Navigate to the declaration of a symbol.
  - \`get_document_highlights\`: Highlight all occurrences of a symbol in a file.
  - \`get_hover_info\`: Get rich, contextual information for a symbol.
  - \`get_selection_range\`: Get a hierarchy of semantically meaningful selection ranges.
  - \`get_semantic_tokens\`: Get detailed semantic analysis of code tokens.
  - \`get_signature_help\`: Get detailed help for function/method signatures.
  - \`get_symbols_overview\`: Get a high-level overview of symbols in a file.
  - \`get_symbols\`: Get a list of all symbols in a file.
  - \`get_type_definition\`: Navigate to the definition of a symbol's type.
  - \`get_type_hierarchy\`: Explore the inheritance hierarchy of a class or type.
  - \`get_workspace_symbols\`: Search for symbols across the entire workspace by name.
  - \`go_to_definition\`: Navigate to the source definition of a symbol.
  - \`insert_after_symbol\`: Insert code after a specific symbol.
  - \`insert_before_symbol\`: Insert code before a specific symbol.
  - \`rename\`: Perform a safe, semantic rename of a symbol.
  - \`replace_symbol_body\`: Replace the body of a function or method.
- You also have access to tools that let you execute CLI commands on the user's computer, list files, view source code definitions, regex search${
		supportsComputerUse ? ", use the browser" : ""
	}, read and write files, and ask follow-up questions. However, these should only be used AFTER considering subagent or for very specific, focused tasks that don't benefit from parallel processing.
- When the user initially gives you a task, a recursive list of all filepaths in the current workspace directory ('${cwd}') will be included in environment_details. This provides an overview of the project's file structure, offering key insights into the project from directory/file names (how developers conceptualize and organize their code) and file extensions (the language used). This can also guide decision-making on which files to explore further. If you need to further explore directories such as outside the current workspace directory, you can use the list_files tool. If you pass 'true' for the recursive parameter, it will list files recursively. Otherwise, it will list files at the top level, which is better suited for generic directories where you don't necessarily need the nested structure, like the Desktop.${
		codeIndexManager &&
		codeIndexManager.isFeatureEnabled &&
		codeIndexManager.isFeatureConfigured &&
		codeIndexManager.isInitialized
			? `
- You can use the 'subagent' tool to perform searches across your entire codebase. This tool is powerful for finding functionally relevant code, even if you don't know the exact keywords or file names. It's particularly useful for understanding how features are implemented across multiple files, discovering usages of a particular API, or finding code examples related to a concept. This capability relies on a pre-built index of your code.`
			: ""
	}
- **PRIMARY DISCOVERY TOOLS - THE DISCOVERY TRINITY**: You have three complementary tools for comprehensive codebase exploration:
  - **\`glob\`** - Fast file pattern matching for discovering files by names/paths. **Use when**: You need to find files by patterns, extensions, or directory structure. Optimized for filename-based discovery and returns files sorted by modification time.
  - **\`search_files\`** - Regex content search across files with context-rich results. **Use when**: You know WHAT you're looking for but not WHERE it is, and you need to find all mentions/usages of a term throughout the codebase. Excels at finding specific implementations, code patterns, and semantic searches with surrounding context.
  - **\`lsp_search_symbols\`** - Semantic code structure discovery that understands your code's architecture. **Use when**: You're searching for a term you know represents a symbol (class, function, method, variable, etc.) - it takes you directly to the **symbol definition** (the most important location) rather than all mentions like \`search_files\` does. Most token-efficient for code structure analysis and superior for symbol-focused discovery.
- You can use the list_code_definition_names tool to get an overview of source code definitions for all files at the top level of a specified directory. This can be particularly useful when you need to understand the broader context and relationships between certain parts of the code. You may need to call this tool multiple times to understand various parts of the codebase related to the task.
    - For example, when asked to make edits or improvements, you MUST follow this LSP-First Workflow: 1. **Analyze file structure** from \`environment_details\`. 2. **Explore**: Use \`lsp_get_document_symbols\` to understand the structure of relevant files. 3. **MANDATORY DEPENDENCY ANALYSIS**: Use \`lsp_find_usages\` to understand how symbols are used across the codebase BEFORE making any changes. 4. **MANDATORY FUNCTION RELATIONSHIP ANALYSIS**: Use \`lsp_get_call_hierarchy\` to understand function call relationships and execution flows. 5. **Navigate & Analyze**: Use tools like \`lsp_go_to_definition\` to gather precise context. 6. **Explore Symbol Structure**: Use \`lsp_get_symbol_children\` to understand the internal structure of classes, interfaces, or modules before extracting code. 7. **Extract**: Use \`lsp_get_symbol_code_snippet\` ONLY after understanding structure with \`lsp_get_symbol_children\` to get specific code blocks. This LSP-driven approach is mandatory. 8. **Modify**: Only after this comprehensive analysis should you use the \`${diffStrategy ? "apply_diff or write_to_file" : "write_to_file"}\` tool to apply changes. For cross-file impact analysis after refactoring, \`lsp_find_usages\` is superior to \`search_files\`.
- You can use the execute_command tool to run commands on the user's computer whenever you feel it can help accomplish the user's task. When you need to execute a CLI command, you must provide a clear explanation of what the command does. Prefer to execute complex CLI commands over creating executable scripts, since they are more flexible and easier to run. Interactive and long-running commands are allowed, since the commands are run in the user's VSCode terminal. The user may keep commands running in the background and you will be kept updated on their status along the way. Each command you execute is run in a new terminal instance.${
		supportsComputerUse
			? "\n- You can use the browser_action tool to interact with websites (including html files and locally running development servers) through a Puppeteer-controlled browser when you feel it is necessary in accomplishing the user's task. This tool is particularly useful for web development tasks as it allows you to launch a browser, navigate to pages, interact with elements through clicks and keyboard input, and capture the results through screenshots and console logs. This tool may be useful at key stages of web development tasks-such as after implementing new features, making substantial changes, when troubleshooting issues, or to verify the result of your work. You can analyze the provided screenshots to ensure correct rendering or identify errors, and review console logs for runtime issues.\n  - For example, if asked to add a component to a react website, you might create the necessary files, use execute_command to run the site locally, then use browser_action to launch the browser, navigate to the local server, and verify the component renders & functions correctly before closing the browser."
			: ""
	}${
		mcpHub
			? `
- You have access to MCP servers that may provide additional tools and resources. Each server may provide different capabilities that you can use to accomplish tasks more effectively.
`
			: ""
	}`
}
