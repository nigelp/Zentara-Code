/**
 * Example usage of the fetch_tool_description function
 * This demonstrates how to retrieve full tool descriptions on demand
 */

import {
	fetch_tool_description,
	fetch_multiple_tool_descriptions,
	getAvailableToolNames,
	toolExists,
} from "./fetch-tool-description"

// Example 1: Fetch a single tool description
function example1_fetchSingleTool() {
	console.log("=== Example 1: Fetching single tool description ===")

	const toolName = "read_file"
	const description = fetch_tool_description(toolName)

	if (description) {
		console.log(`Tool: ${toolName}`)
		console.log(`Description (first 200 chars): ${description.substring(0, 200)}...`)
	} else {
		console.log(`Tool "${toolName}" not found`)
	}
	console.log()
}

// Example 2: Check if tool exists before fetching
function example2_checkAndFetch() {
	console.log("=== Example 2: Check tool existence before fetching ===")

	const toolsToCheck = ["glob", "non_existent_tool", "write_to_file"]

	for (const toolName of toolsToCheck) {
		if (toolExists(toolName)) {
			const description = fetch_tool_description(toolName)
			console.log(`✓ ${toolName}: Found (${description?.length} chars)`)
		} else {
			console.log(`✗ ${toolName}: Not found`)
		}
	}
	console.log()
}

// Example 3: Fetch multiple tool descriptions at once
function example3_fetchMultiple() {
	console.log("=== Example 3: Fetching multiple tool descriptions ===")

	const tools = ["execute_command", "search_files", "debug_launch", "subagent"]
	const descriptions = fetch_multiple_tool_descriptions(tools)

	descriptions.forEach((desc, toolName) => {
		if (desc) {
			console.log(`• ${toolName}: ${desc.substring(0, 100)}...`)
		} else {
			console.log(`• ${toolName}: Not available`)
		}
	})
	console.log()
}

// Example 4: Get all available tools and fetch debug tools
function example4_getAllDebugTools() {
	console.log("=== Example 4: Fetching all debug tool descriptions ===")

	const allTools = getAvailableToolNames()
	const debugTools = allTools.filter((name) => name.startsWith("debug_"))

	console.log(`Found ${debugTools.length} debug tools:`)

	// Fetch descriptions for first 5 debug tools as example
	const sampleDebugTools = debugTools.slice(0, 5)
	const debugDescriptions = fetch_multiple_tool_descriptions(sampleDebugTools)

	debugDescriptions.forEach((desc, toolName) => {
		if (desc) {
			// Extract first line of description (usually the title)
			const firstLine = desc.split("\n")[0]
			console.log(`  - ${toolName}: ${firstLine}`)
		}
	})
	console.log()
}

// Example 5: Fetch with custom options
function example5_fetchWithOptions() {
	console.log("=== Example 5: Fetching with custom options ===")

	const toolName = "execute_command"
	const description = fetch_tool_description(toolName, {
		cwd: "/custom/working/directory",
		supportsComputerUse: true,
		settings: {
			enableMcpServerCreation: true,
		},
	})

	if (description) {
		console.log(`Tool "${toolName}" with custom options fetched successfully`)
		console.log(`Description length: ${description.length} characters`)
	}
	console.log()
}

// Main function to run all examples
function main() {
	console.log("========================================")
	console.log("  fetch_tool_description Usage Examples ")
	console.log("========================================\n")

	example1_fetchSingleTool()
	example2_checkAndFetch()
	example3_fetchMultiple()
	example4_getAllDebugTools()
	example5_fetchWithOptions()

	console.log("========================================")
	console.log("  Examples completed successfully!      ")
	console.log("========================================")
}

// Run examples if this file is executed directly
if (require.main === module) {
	main()
}

export { main as runExamples }
