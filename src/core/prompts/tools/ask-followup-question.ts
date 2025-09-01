export function getAskFollowupQuestionDescription(): string {
	return `## ask_followup_question
Description: Ask the user a question to gather additional information needed to complete the task. This tool should be used when you encounter ambiguities, need clarification, or require more details to proceed effectively. It allows for interactive problem-solving by enabling direct communication with the user. Use this tool judiciously to maintain a balance between gathering necessary information and avoiding excessive back-and-forth.
IMPORTANT: This tool can only be used by master agents, not by sub-agents. It is designed to facilitate direct interaction with the user for clarification and additional information. If you are a sub-agent, you should not use this tool. Otherwise, it may lead to confusion or miscommunication in the task execution process and you may not be able to complete the task as intended.

Parameters:
- question: (required) A clear, specific question addressing the information needed
- follow_up: (required) A list of 2-4 suggested answers that logically follow from the question, ordered by priority or logical sequence. Each suggestion must:
  1. Be concise and directly relevant to the task at hand
  2. Address a logical next step or alternative approach that aligns with the user's intent
  3. Be a complete answer to the question - the user should not need to provide additional information or fill in any missing details. DO NOT include placeholders with brackets or parentheses.
  4. Optionally include a mode attribute to switch to a specific mode when the suggestion is selected: <suggest mode="mode-slug">suggestion text</suggest>
     - When using the mode attribute, focus the suggestion text on the action to be taken rather than mentioning the mode switch, as the mode change is handled automatically and indicated by a visual badge

Usage:
<ask_followup_question>
<question>Your question here</question>
<follow_up>
<suggest>First suggestion</suggest>
<suggest mode="code">Action with mode switch</suggest>
</follow_up>
</ask_followup_question>

Example:
<ask_followup_question>
<question>What is the path to the frontend-config.json file?</question>
<follow_up>
<suggest>./src/frontend-config.json</suggest>
<suggest>./config/frontend-config.json</suggest>
<suggest>./frontend-config.json</suggest>
</follow_up>
</ask_followup_question>`
}
