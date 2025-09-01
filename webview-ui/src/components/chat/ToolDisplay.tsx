import React from "react"
import { useTranslation, Trans } from "react-i18next"
import { ClineSayTool } from "@roo/ExtensionMessage"
import { safeJsonParse } from "@roo/safeJsonParse"

interface ToolDisplayProps {
	askType: string
	askText?: string
	toolCall?: {
		toolName: string
		toolInput: any
	}
	compact?: boolean // Show compact format for subagent view
}

// Helper function to truncate text by letter count
const truncateByLetters = (text: string, maxLetters: number): string => {
	if (text.length <= maxLetters) {
		return text
	}
	return text.slice(0, maxLetters) + "..."
}

// Helper function to format tool display
const formatToolCall = (toolName: string, toolInput: any, maxLetters: number = 100): string => {
	if (!toolInput) return toolName + "()"

	// Create a copy without the 'tool' field for cleaner display
	const displayInput = { ...toolInput }
	delete displayInput.tool

	// Use JSON.stringify to show all parameters in full with spaces for better wrapping
	let paramsStr = JSON.stringify(displayInput, null, 0).replace(/,/g, ", ").replace(/:/g, ": ")

	// Apply letter truncation to parameters only
	paramsStr = truncateByLetters(paramsStr, maxLetters)

	// Use a more readable tool name format (convert camelCase to snake_case)
	const displayName = toolName
		.replace(/([A-Z])/g, "_$1")
		.toLowerCase()
		.replace(/^_/, "")
	return `${displayName}(${paramsStr})`
}

export const ToolDisplay: React.FC<ToolDisplayProps> = ({ askType, askText, toolCall, compact = false }) => {
	const { t } = useTranslation()

	const headerStyle = {
		display: "flex",
		alignItems: "center",
		marginBottom: "8px",
	}

	// Handle command asks specially
	if (askType === "command") {
		return (
			<div>
				<div style={headerStyle}>
					<span
						className="codicon codicon-terminal"
						style={{ color: "var(--vscode-foreground)", marginBottom: "-1.5px", marginRight: "6px" }}
					/>
					<span style={{ fontWeight: "bold" }}>{t("chat:runCommand.title", "Run Command")}</span>
				</div>
				{askText && (
					<div
						style={{
							padding: "8px",
							borderRadius: "4px",
							fontFamily: "var(--vscode-editor-font-family)",
							fontSize: "var(--vscode-editor-font-size)",
						}}>
						<code>{askText}</code>
					</div>
				)}
			</div>
		)
	}

	// Handle other non-tool ask types (but allow empty string for showing last tool)
	if (askType && askType !== "tool") {
		// Special handling for mistake_limit_reached
		if (askType === "mistake_limit_reached") {
			return (
				<div>
					<div style={headerStyle}>
						<span
							className="codicon codicon-error"
							style={{
								color: "var(--vscode-errorForeground)",
								marginBottom: "-1.5px",
								marginRight: "6px",
							}}
						/>
						<span style={{ fontWeight: "bold", color: "var(--vscode-errorForeground)" }}>
							{t("chat:troubleMessage", "I ran into some trouble")}
						</span>
					</div>
					{askText && (
						<div
							style={{
								marginTop: "8px",
								padding: "8px",
								borderRadius: "4px",
								backgroundColor: "var(--vscode-inputValidation-errorBackground)",
								border: "1px solid var(--vscode-inputValidation-errorBorder)",
								color: "var(--vscode-errorForeground)",
							}}>
							<p style={{ margin: 0 }}>{askText}</p>
						</div>
					)}
					<div
						style={{
							marginTop: "8px",
							padding: "8px",
							borderRadius: "4px",
							backgroundColor: "var(--vscode-editor-inlineValuesBackground)",
							fontSize: "0.9em",
						}}>
						<strong>What would you like to do?</strong>
						<ul style={{ margin: "4px 0 0 0", paddingLeft: "20px" }}>
							<li>
								<strong>Approve</strong>: Let the agent continue trying with your guidance
							</li>
							<li>
								<strong>Reject</strong>: Stop the current approach and provide new instructions
							</li>
						</ul>
					</div>
				</div>
			)
		}

		// Special handling for browser_action_launch
		if (askType === "browser_action_launch") {
			return (
				<div>
					<div style={headerStyle}>
						<span
							className="codicon codicon-browser"
							style={{ color: "var(--vscode-foreground)", marginBottom: "-1.5px", marginRight: "6px" }}
						/>
						<span style={{ fontWeight: "bold" }}>{t("chat:browserAction.launch", "Launch Browser")}</span>
					</div>
					{askText && <div className="text-xs text-vscode-descriptionForeground mt-1">{askText}</div>}
				</div>
			)
		}

		// Special handling for use_mcp_server
		if (askType === "use_mcp_server") {
			const mcpData = askText ? safeJsonParse<{ serverName?: string; toolName?: string }>(askText) : null
			return (
				<div>
					<div style={headerStyle}>
						<span
							className="codicon codicon-server"
							style={{ color: "var(--vscode-foreground)", marginBottom: "-1.5px", marginRight: "6px" }}
						/>
						<span style={{ fontWeight: "bold" }}>{t("chat:mcp.useServer", "Use MCP Server")}</span>
					</div>
					{mcpData && (
						<div className="text-xs text-vscode-descriptionForeground mt-1">
							{mcpData.serverName && (
								<div>
									Server: <code>{mcpData.serverName}</code>
								</div>
							)}
							{mcpData.toolName && (
								<div>
									Tool: <code>{mcpData.toolName}</code>
								</div>
							)}
						</div>
					)}
				</div>
			)
		}

		// Generic fallback for other ask types
		return (
			<div>
				<div style={headerStyle}>
					<span
						className="codicon codicon-question"
						style={{ color: "var(--vscode-foreground)", marginBottom: "-1.5px", marginRight: "6px" }}
					/>
					<span style={{ fontWeight: "bold" }}>
						{askType === "api_req_failed"
							? t("chat:apiRequestFailed", "API request failed")
							: `Request: ${askType}`}
					</span>
				</div>
				{askText && (
					<div className="text-xs text-vscode-descriptionForeground mt-1">
						<code>{askText.substring(0, 200)}</code>
					</div>
				)}
			</div>
		)
	}

	// Display a formatted tool call when we have toolCall but no askType (showing last tool)
	if (!askType && toolCall) {
		const formattedCall = formatToolCall(toolCall.toolName, toolCall.toolInput)
		return (
			<div className="text-xs text-vscode-descriptionForeground">
				<span className="opacity-60">Last tool: </span>
				<code>{formattedCall}</code>
			</div>
		)
	}

	const tool = toolCall ? toolCall.toolInput : safeJsonParse<ClineSayTool>(askText)

	// Handle tool type but missing data
	if (!tool) {
		if (!askText) {
			return null // No data to display
		}
		console.warn("[ToolDisplay] Tool ask without valid tool data", { askText, toolCall })
		return (
			<div>
				<div style={headerStyle}>
					<span
						className="codicon codicon-tools"
						style={{ color: "var(--vscode-foreground)", marginBottom: "-1.5px", marginRight: "6px" }}
					/>
					<span style={{ fontWeight: "bold" }}>Tool Request</span>
				</div>
			</div>
		)
	}


	// If compact mode and we have a tool, show the formatted call
	if (compact && tool && tool.tool) {
		const formattedCall = formatToolCall(tool.tool, tool)
		return (
			<div className="text-xs text-vscode-descriptionForeground w-full overflow-hidden">
				<span className="opacity-60">Tool: </span>
				<code className="break-all whitespace-pre-wrap inline-block w-full max-w-full overflow-wrap-anywhere">
					{formattedCall}
				</code>
			</div>
		)
	}

	const toolIcon = (name: string) => (
		<span
			className={`codicon codicon-${name}`}
			style={{ color: "var(--vscode-foreground)", marginBottom: "-1.5px", marginRight: "6px" }}
		/>
	)

	// Simplified tool display for subagents
	switch (tool.tool) {
		case "readFile":
			return (
				<div>
					<div style={headerStyle}>
						{toolIcon("file-code")}
						<span style={{ fontWeight: "bold" }}>
							{tool.path ? (
								<>
									{t("chat:fileOperations.wantsToRead", "Wants to read file")}:{" "}
									<code>{tool.path}</code>
								</>
							) : (
								t("chat:fileOperations.wantsToRead", "Wants to read file")
							)}
						</span>
					</div>
				</div>
			)

		case "editedExistingFile":
		case "appliedDiff":
			return (
				<div>
					<div style={headerStyle}>
						{toolIcon(tool.tool === "appliedDiff" ? "diff" : "edit")}
						<span style={{ fontWeight: "bold" }}>
							{t("chat:fileOperations.wantsToEdit", "Wants to edit file")}: <code>{tool.path}</code>
						</span>
					</div>
				</div>
			)

		case "newFileCreated":
			return (
				<div>
					<div style={headerStyle}>
						{toolIcon("new-file")}
						<span style={{ fontWeight: "bold" }}>
							{t("chat:fileOperations.wantsToCreate", "Wants to create file")}: <code>{tool.path}</code>
						</span>
					</div>
				</div>
			)

		case "searchFiles":
			return (
				<div>
					<div style={headerStyle}>
						{toolIcon("search")}
						<span style={{ fontWeight: "bold" }}>
							<Trans
								i18nKey="chat:directoryOperations.wantsToSearch"
								components={{ code: <code>{tool.regex}</code> }}
								values={{ regex: tool.regex }}
							/>
						</span>
					</div>
				</div>
			)

		case "listFilesTopLevel":
		case "listFilesRecursive":
			return (
				<div>
					<div style={headerStyle}>
						{toolIcon("folder-opened")}
						<span style={{ fontWeight: "bold" }}>
							{tool.tool === "listFilesRecursive"
								? t(
										"chat:directoryOperations.wantsToViewRecursive",
										"Wants to view directory recursively",
									)
								: t("chat:directoryOperations.wantsToViewTopLevel", "Wants to view directory")}
							{tool.path && (
								<>
									: <code>{tool.path}</code>
								</>
							)}
						</span>
					</div>
				</div>
			)

		case "executeCommand":
			return (
				<div>
					<div style={headerStyle}>
						{toolIcon("terminal")}
						<span style={{ fontWeight: "bold" }}>{t("chat:runCommand.title", "Run Command")}</span>
					</div>
					{tool.command && (
						<div
							style={{
								padding: "8px",
								borderRadius: "4px",
								fontFamily: "var(--vscode-editor-font-family)",
								fontSize: "var(--vscode-editor-font-size)",
								marginTop: "4px",
							}}>
							<code>{tool.command}</code>
						</div>
					)}
				</div>
			)

		case "debug":
			return (
				<div>
					<div style={headerStyle}>
						{toolIcon("debug")}
						<span style={{ fontWeight: "bold" }}>
							{t("chat:ask.debug.wantsToExecute", { operation: tool.operation || "debug operation" })}
						</span>
					</div>
				</div>
			)

		case "glob":

			return (
				<div>
					<div style={headerStyle}>
						{toolIcon("search")}
						<span style={{ fontWeight: "bold" }}>
							{t("chat:fileOperations.wantsToFindFiles", "Wants to find files matching pattern")}
						</span>
					</div>
					{(tool.content || tool.path) && (
						<div
							style={{
								marginTop: "8px",
								padding: "8px",
								borderRadius: "4px",
								backgroundColor: "var(--vscode-editor-inlineValuesBackground)",
								fontSize: "0.9em",
							}}>
							{tool.content && (
								<div style={{ marginBottom: "4px" }}>
									<strong>Pattern:</strong> <code>{tool.content}</code>
								</div>
							)}
							{tool.path && (
								<div style={{ marginBottom: "4px" }}>
									<strong>Search in:</strong> <code>{tool.path}</code>
								</div>
							)}
							{tool.isOutsideWorkspace && (
								<div style={{ color: "var(--vscode-editorWarning-foreground)", marginTop: "4px" }}>
									⚠️ This path is outside the workspace
								</div>
							)}
						</div>
					)}
				</div>
			)

		default:
			// For other tools, show a generic message with the tool name
			return (
				<div>
					<div style={headerStyle}>
						{toolIcon("tools")}
						<span style={{ fontWeight: "bold" }}>
							Wants to use tool: <code>{tool.tool}</code>
						</span>
					</div>
				</div>
			)
	}
}
