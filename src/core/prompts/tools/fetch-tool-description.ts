import type { ToolArgs } from "./types"

export function getFetchToolDescriptionDescription(args: ToolArgs): string {
	return `## fetch_tool_description – Retrieve Full Tool Documentation

Description:
The "fetch_tool_description" tool retrieves the complete documentation for any available tool in the system. This is useful when you need detailed information about a tool's parameters, usage examples, or specific behavior that may not be included in the brief descriptions shown in the system prompt.

This tool is part of the Tool Description Optimization System, which shows brief descriptions by default to save context tokens. Use this tool whenever you need:
- Complete parameter documentation for a tool
- Usage examples and best practices
- Detailed error handling information
- Understanding of tool-specific behaviors
IMPORTANCE: **MANDATORY USAGE: You MUST use this tool BEFORE using any other tool if you do not have COMPLETE knowledge of that tool's full parameters, usage examples, and behavior. NEVER ASSUME about how to use a tool based on brief descriptions alone.**
────────────────────────  QUICK-START  ────────────────────────
✅ **Usage**
1️⃣ Use the <fetch_tool_description> tag
2️⃣ Provide the tool name in the "tool_name" parameter
3️⃣ To list all available tools, use tool_name="list"

⚠️ **Common Uses**
• **MANDATORY: Get full documentation when brief description is insufficient or when you are uncertain about tool usage**
• Check exact parameter requirements before using a complex tool
• List all available tools with tool_name="list"
• Understand tool-specific error conditions

────────────  COPY-READY TEMPLATES  ────────────
  <fetch_tool_description>
    <tool_name>read_file</tool_name>
  </fetch_tool_description>

  <fetch_tool_description>
    <tool_name>list</tool_name>
  </fetch_tool_description>
───────────────────────────────────────────────

### Parameters:
- **tool_name** (string, REQUIRED): The name of the tool to fetch the description for. Use "list" or "*" to see all available tools.

### Examples:

1. **Fetch description for a specific tool:**
   \`\`\`xml
   <fetch_tool_description>
     <tool_name>debug_launch</tool_name>
   </fetch_tool_description>
   \`\`\`

2. **List all available tools:**
   \`\`\`xml
   <fetch_tool_description>
     <tool_name>list</tool_name>
   </fetch_tool_description>
   \`\`\`

3. **Get details about file operations:**
   \`\`\`xml
   <fetch_tool_description>
     <tool_name>write_to_file</tool_name>
   </fetch_tool_description>
   \`\`\`

4. **Understand debugging tools:**
   \`\`\`xml
   <fetch_tool_description>
     <tool_name>debug_set_breakpoint</tool_name>
   </fetch_tool_description>
   \`\`\`

### Notes:
- This tool is always available in all modes
- Tool names are case-sensitive
- Returns null if the tool doesn't exist
- Suggestions are provided for similar tool names when a tool is not found
- The returned description includes all parameters, examples, and usage guidelines

────────────────────────────────────────────────────────────────────────────`
}
