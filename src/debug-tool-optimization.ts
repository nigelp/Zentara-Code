#!/usr/bin/env tsx

import {
	getOptimizedToolDescriptionsForMode,
	trackToolUsage,
	clearAllCaches,
	getGlobalToolDescriptionManager,
} from "./zentara_tool_prompt_management/tool-optimization-integration"
import { ToolDescriptionMode } from "./zentara_tool_prompt_management/optimization-types"

// Import tool description map directly
const toolDescriptionMap: Record<string, (args: any) => string | Promise<string> | undefined> = {
	glob: require("./core/prompts/tools/glob").getGlobDescription,
	search_files: require("./core/prompts/tools/search-files").getSearchFilesDescription,
	read_file: require("./core/prompts/tools/read-file").getReadFileDescription,
	subagent: require("./core/prompts/tools/subagent").getSubagentDescription,
	browser_action: require("./core/prompts/tools/browser-action").getBrowserActionDescription,
	ask_followup_question: require("./core/prompts/tools/ask-followup-question").getAskFollowupQuestionDescription,
	new_task: require("./core/prompts/tools/new-task").getNewTaskDescription,
	write_to_file: require("./core/prompts/tools/write-to-file").getWriteToFileDescription,
	apply_diff: () => "Apply targeted changes to existing files using search and replace patterns.",
	execute_command: require("./core/prompts/tools/execute-command").getExecuteCommandDescription,
	list_files: require("./core/prompts/tools/list-files").getListFilesDescription,
	attempt_completion: require("./core/prompts/tools/attempt-completion").getAttemptCompletionDescription,
}

async function demonstrateDebugOutput() {
	console.log("=".repeat(80))
	console.log("🔧 TOOL DESCRIPTION OPTIMIZATION - DEBUG DEMONSTRATION")
	console.log("=".repeat(80))

	const mode = "code" as any
	const cwd = "/test"
	const sessionId = "debug-session"

	// Clear caches to start fresh
	clearAllCaches()

	console.log("\n📊 STEP 1: Initial tool descriptions (no usage tracking yet)")
	console.log("-".repeat(60))

	const args = {
		cwd,
		supportsComputerUse: true,
		experiments: {},
		settings: {},
	}

	const result1 = await getOptimizedToolDescriptionsForMode(
		mode,
		cwd,
		true,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		{},
		false,
		{},
		false,
		sessionId,
	)

	console.log(`📝 Initial result length: ${result1.length} characters`)
	console.log(`📝 Number of tool descriptions: ${result1.split("\n\n").length - 1}`) // -1 for the header

	// Show which tools got FULL vs BRIEF descriptions
	const manager = getGlobalToolDescriptionManager()
	const availableTools = [
		// Always FULL tools
		"glob",
		"search_files",
		"read_file",
		"subagent",
		"write_to_file",
		"apply_diff",
		"attempt_completion",
		// Initially BRIEF tools (not in alwaysFullDescriptionTools)
		"browser_action",
		"ask_followup_question",
		"new_task",
		"insert_content",
		"search_and_replace",
		"switch_mode",
	]

	console.log("\n🎯 Tool Description Modes (FULL vs BRIEF):")
	availableTools.forEach((tool) => {
		const mode = manager.getDescriptionMode(tool, sessionId)
		console.log(`  ${tool}: ${mode === ToolDescriptionMode.FULL ? "🟢 FULL" : "🔵 BRIEF"}`)
	})

	console.log("\n📊 STEP 2: Track usage of some tools")
	console.log("-".repeat(60))

	// Track usage of tools that should affect queue (tools NOT in alwaysFullDescriptionTools)
	trackToolUsage("browser_action", sessionId)
	trackToolUsage("ask_followup_question", sessionId)
	trackToolUsage("insert_content", sessionId)

	console.log("✅ Tracked usage for: browser_action, ask_followup_question, insert_content")
	console.log(
		"ℹ️  These tools were NOT in alwaysFullDescriptionTools, so they should now get FULL descriptions from the queue",
	)

	const result2 = await getOptimizedToolDescriptionsForMode(
		mode,
		cwd,
		true,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		{},
		false,
		{},
		false,
		sessionId,
	)

	console.log(`📝 Result length after tracking: ${result2.length} characters`)
	console.log(
		`📝 Character difference: ${result2.length - result1.length} (${result2.length > result1.length ? "+" : ""}${(((result2.length - result1.length) / result1.length) * 100).toFixed(1)}%)`,
	)

	console.log("\n🎯 Tool Description Modes After Usage Tracking:")
	availableTools.forEach((tool) => {
		const mode = manager.getDescriptionMode(tool, sessionId)
		console.log(`  ${tool}: ${mode === ToolDescriptionMode.FULL ? "🟢 FULL" : "🔵 BRIEF"}`)
	})

	console.log("\n📊 Queue State:")
	const queueStats = manager.getQueueStats(sessionId)
	if (queueStats) {
		console.log(`  📋 Queue size: ${queueStats.queueSize}/${queueStats.maxSize}`)
		console.log(`  📝 Recently used tools: [${queueStats.recentTools.join(", ")}]`)
		console.log(`  ⏰ Last updated: ${queueStats.lastUpdated}`)
	} else {
		console.log(`  📋 No queue state found for session: ${sessionId}`)
	}

	console.log("\n📈 Optimization Analysis:")
	const totalToolCount = availableTools.length
	const fullDescriptionCount = availableTools.filter(
		(tool) => manager.getDescriptionMode(tool, sessionId) === ToolDescriptionMode.FULL,
	).length
	const briefDescriptionCount = totalToolCount - fullDescriptionCount

	console.log(`  📊 Total tools analyzed: ${totalToolCount}`)
	console.log(
		`  🟢 FULL descriptions: ${fullDescriptionCount} (${((fullDescriptionCount / totalToolCount) * 100).toFixed(1)}%)`,
	)
	console.log(
		`  🔵 BRIEF descriptions: ${briefDescriptionCount} (${((briefDescriptionCount / totalToolCount) * 100).toFixed(1)}%)`,
	)
	console.log(`  💾 Estimated context reduction: ~${(briefDescriptionCount * 60).toFixed(0)}% per brief tool`)

	// Show breakdown by category
	const alwaysFullTools = availableTools.filter((tool) => manager.getConfig().alwaysFullDescriptionTools.has(tool))
	const queueTools = queueStats ? queueStats.recentTools.filter((tool) => availableTools.includes(tool)) : []
	const briefTools = availableTools.filter(
		(tool) =>
			!manager.getConfig().alwaysFullDescriptionTools.has(tool) &&
			(!queueStats || !queueStats.recentTools.includes(tool)),
	)

	console.log(`\n📋 Breakdown:`)
	console.log(`  🛡️  Always FULL: ${alwaysFullTools.length} tools [${alwaysFullTools.join(", ")}]`)
	console.log(`  🔄 Queue FULL: ${queueTools.length} tools [${queueTools.join(", ")}]`)
	console.log(`  ⚡ BRIEF: ${briefTools.length} tools [${briefTools.join(", ")}]`)

	console.log("\n✨ Debug demonstration complete!")
	console.log("=".repeat(80))
}

// Run the demonstration
demonstrateDebugOutput().catch(console.error)
