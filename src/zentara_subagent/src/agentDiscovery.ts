/**
 * Agent Discovery System
 *
 * This module handles the discovery and parsing of predefined agents from multiple locations:
 * 1. System agents (TypeScript files in src/zentara_subagent/src/agents/)
 * 2. Project agents (Markdown files in .zentara/agents/)
 * 3. Global agents (Markdown files in ~/.zentara/agents/)
 */

import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import * as vscode from "vscode"
import * as yaml from "yaml"
import {
	AgentDefinition,
	SystemAgentDefinition,
	UserAgentDefinition,
	AgentRegistry,
	AgentDiscoveryResult,
	AgentLoadingContext,
	AgentFrontmatter,
	AGENT_DISCOVERY_LOCATIONS,
} from "@zentara-code/types"

// Hardcoded imports for system agents
import { subagentCreatorPrompt } from "./agents/subagent-creator"

/**
 * Main agent discovery function that loads agents from all configured locations
 */
export async function discoverAgents(context: AgentLoadingContext): Promise<AgentDiscoveryResult> {
	const result: AgentDiscoveryResult = {
		agents: {
			system: new Map(),
			project: new Map(),
			global: new Map(),
		},
		errors: [],
	}

	// Load system agents (TypeScript files)
	try {
		const systemAgents = await loadSystemAgents(context)
		systemAgents.forEach((agent) => {
			result.agents.system.set(agent.name, agent)
		})
	} catch (error) {
		result.errors.push({
			location: AGENT_DISCOVERY_LOCATIONS.SYSTEM,
			error: `Failed to load system agents: ${error instanceof Error ? error.message : String(error)}`,
		})
	}

	// Load project agents (Markdown files)
	try {
		const projectAgents = await loadUserAgents(
			path.join(context.workspaceRoot, AGENT_DISCOVERY_LOCATIONS.PROJECT),
			"project",
		)
		projectAgents.forEach((agent) => {
			result.agents.project.set(agent.name, agent)
		})
	} catch (error) {
		result.errors.push({
			location: AGENT_DISCOVERY_LOCATIONS.PROJECT,
			error: `Failed to load project agents: ${error instanceof Error ? error.message : String(error)}`,
		})
	}

	// Load global agents (Markdown files)
	try {
		const globalAgentsPath = path.join(context.homeDirectory, AGENT_DISCOVERY_LOCATIONS.GLOBAL.replace("~/", ""))
		const globalAgents = await loadUserAgents(globalAgentsPath, "global")
		globalAgents.forEach((agent) => {
			result.agents.global.set(agent.name, agent)
		})
	} catch (error) {
		result.errors.push({
			location: AGENT_DISCOVERY_LOCATIONS.GLOBAL,
			error: `Failed to load global agents: ${error instanceof Error ? error.message : String(error)}`,
		})
	}

	return result
}

/**
 * Load system agents from hardcoded TypeScript imports
 */
async function loadSystemAgents(_context: AgentLoadingContext): Promise<SystemAgentDefinition[]> {
	const agents: SystemAgentDefinition[] = []

	// Parse subagent-creator
	const subagentCreator = parseSystemAgentFromPrompt(subagentCreatorPrompt)
	if (subagentCreator) {
		agents.push(subagentCreator)
	}
	
	// Add more hardcoded system agents here in the future
	// Example:
	// const codeReviewer = parseSystemAgentFromPrompt(codeReviewerPrompt)
	// if (codeReviewer) {
	//     agents.push(codeReviewer)
	// }

	return agents
}

/**
 * Parse a system agent from a prompt string with markdown frontmatter
 */
function parseSystemAgentFromPrompt(promptString: string): SystemAgentDefinition | null {
	try {
		// Parse the markdown-formatted prompt with frontmatter
		const parsed = parseMarkdownWithFrontmatter(promptString)
		if (!parsed) {
			return null
		}
		
		const { frontmatter, body } = parsed
		
		// Validate required fields
		if (!frontmatter.name || !frontmatter.description) {
			return null
		}
		
		return {
			name: frontmatter.name,
			description: frontmatter.description,
			systemPrompt: body.trim()
		}
	} catch (error) {
		console.warn("Failed to parse system agent prompt:", error)
		return null
	}
}


/**
 * Load user agents from Markdown files in a directory
 */
async function loadUserAgents(directoryPath: string, _type: "project" | "global"): Promise<UserAgentDefinition[]> {
	if (!fs.existsSync(directoryPath)) {
		return []
	}

	const agents: UserAgentDefinition[] = []
	const files = fs.readdirSync(directoryPath)

	for (const file of files) {
		if (!file.endsWith(".md")) {
			continue
		}

		try {
			const filePath = path.join(directoryPath, file)
			const agent = await loadUserAgentFromMarkdown(filePath)
			if (agent) {
				agents.push(agent)
			}
		} catch (error) {
			console.warn(`Failed to load user agent from ${file}:`, error)
		}
	}

	return agents
}

/**
 * Load a single user agent from a Markdown file with YAML frontmatter
 */
async function loadUserAgentFromMarkdown(filePath: string): Promise<UserAgentDefinition | null> {
	try {
		const content = fs.readFileSync(filePath, "utf-8")

		// Parse frontmatter and content
		const parsed = parseMarkdownWithFrontmatter(content)
		if (!parsed) {
			throw new Error("Invalid frontmatter format")
		}

		const { frontmatter, body } = parsed

		// Validate required fields
		if (!frontmatter.name || !frontmatter.description) {
			throw new Error("Missing required fields: name and description")
		}

		return {
			name: frontmatter.name,
			description: frontmatter.description,
			systemPrompt: body.trim(),
			filePath,
		}
	} catch (error) {
		console.warn(`Failed to parse user agent file ${filePath}:`, error)
		return null
	}
}

/**
 * Parse Markdown file with YAML frontmatter
 */
function parseMarkdownWithFrontmatter(content: string): { frontmatter: AgentFrontmatter; body: string } | null {
	// Check if content starts with frontmatter delimiter
	if (!content.startsWith("---\n")) {
		return null
	}

	// Find the end of frontmatter
	const endIndex = content.indexOf("\n---\n", 4)
	if (endIndex === -1) {
		return null
	}

	try {
		// Extract frontmatter and body
		const frontmatterText = content.slice(4, endIndex)
		const body = content.slice(endIndex + 5)

		// Parse YAML frontmatter
		const frontmatter = yaml.parse(frontmatterText) as any

		// Validate frontmatter structure
		if (!frontmatter || typeof frontmatter !== "object") {
			throw new Error("Invalid frontmatter structure")
		}

		return {
			frontmatter: frontmatter as AgentFrontmatter,
			body,
		}
	} catch (error) {
		console.warn("Failed to parse YAML frontmatter:", error)
		return null
	}
}

/**
 * Find a specific agent by name across all loaded agents
 * O(1) lookup using Map.get()
 */
export function findAgentByName(registry: AgentRegistry, name: string): AgentDefinition | null {
	// System agents have highest priority
	const systemAgent = registry.system.get(name)
	if (systemAgent) {
		return systemAgent
	}

	// Project agents have second priority
	const projectAgent = registry.project.get(name)
	if (projectAgent) {
		return projectAgent
	}

	// Global agents have lowest priority
	const globalAgent = registry.global.get(name)
	if (globalAgent) {
		return globalAgent
	}

	return null
}

/**
 * Get all available agent names for autocomplete/validation
 */
export function getAllAgentNames(registry: AgentRegistry): string[] {
	const allNames = new Set<string>()

	// Add system agent names
	registry.system.forEach((_agent, name) => allNames.add(name))

	// Add project agent names (may override global)
	registry.project.forEach((_agent, name) => allNames.add(name))

	// Add global agent names (only if not already present)
	registry.global.forEach((_agent, name) => allNames.add(name))

	return Array.from(allNames).sort()
}

/**
 * Create agent loading context from current VSCode environment
 */
export function createAgentLoadingContext(): AgentLoadingContext {
	const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd()
	const homeDirectory = os.homedir()

	return {
		workspaceRoot,
		homeDirectory,
	}
}
