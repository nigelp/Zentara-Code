export function getSharedToolUseSection(): string {
	return `====

TOOL USE

You have access to a set of tools that are executed upon the user's approval. You can use one tool per message, and will receive the result of that tool use in the user's response. You use tools step-by-step to accomplish a given task, with each tool use informed by the result of the previous tool use.

# Tool Use Formatting

**CRITICAL REQUIREMENT: You MUST read the complete tool description before using any tool if you are not absolutely certain about its full functionality, parameters, and usage patterns. Use the 'fetch_tool_description' tool to get complete documentation when needed.**

Tools use a **hybrid formatting system** with two different approaches:

## Standard XML Format (Most Tools)
Most tools use pure XML-style tags where each parameter is enclosed within its own set of tags:

<actual_tool_name>
<parameter1_name>value1</parameter1_name>
<parameter2_name>value2</parameter2_name>
...
</actual_tool_name>

## JSON-in-XML Format (Advanced Tools)
Some advanced tools (like LSP operations, debug operations, and subagent) require a **single JSON object** as the content of the XML tag:

<actual_tool_name>{"parameter1": "value1", "parameter2": "value2", "parameter3": ["array", "values"]}</actual_tool_name>

**Examples of JSON-in-XML tools:**
- All LSP operations: \`lsp_get_document_symbols\`, \`lsp_get_symbol_code_snippet\`, etc.
- Debug operations: \`debug_launch\`, \`debug_set_breakpoint\`, etc.
- Subagent tool: \`subagent\`
- Search operations: \`search_files\`

**How to know which format to use:**
- **ALWAYS use \`fetch_tool_description\` first** if you're uncertain about a tool's format
- The tool's documentation will clearly specify the required format
- JSON-in-XML tools will show examples like: \`<tool_name>{"key": "value"}</tool_name>\`
- Standard XML tools will show examples like: \`<tool_name><key>value</key></tool_name>\`

Always use the actual tool name as the XML tag name for proper parsing and execution.`
}
