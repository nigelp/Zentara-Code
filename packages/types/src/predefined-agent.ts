/**
 * Predefined Agent System Types
 *
 * This module defines the interfaces and types for the predefined agent system,
 * which allows users to leverage pre-configured specialists for common development tasks.
 */

/**
 * Base interface for all agent definitions
 */
export interface BaseAgentDefinition {
	/** Unique identifier using lowercase letters and hyphens */
	name: string
	/** Clear explanation of the agent's purpose and use cases */
	description: string
}

/**
 * System agent definition format (TypeScript files)
 * Used for built-in agents in src/roo_subagent/src/agents/
 */
export interface SystemAgentDefinition extends BaseAgentDefinition {
	/** The system prompt content for the specialized subagent */
	systemPrompt: string
}

/**
 * User agent definition format (parsed from Markdown files)
 * Used for project-specific and global user agents
 */
export interface UserAgentDefinition extends BaseAgentDefinition {
	/** The system prompt content extracted from Markdown body */
	systemPrompt: string
	/** File path where this agent was loaded from */
	filePath: string
}

/**
 * Unified agent definition that can represent either system or user agents
 */
export type AgentDefinition = SystemAgentDefinition | UserAgentDefinition

/**
 * Agent discovery locations and their priority order
 */
export const AGENT_DISCOVERY_LOCATIONS = {
	/** Built-in TypeScript agents (highest priority) */
	SYSTEM: "src/roo_subagent/src/agents/",
	/** Project-specific Markdown agents */
	PROJECT: ".zentara/agents/",
	/** User-global Markdown agents (lowest priority) */
	GLOBAL: "~/.zentara/agents/",
} as const

/**
 * Agent types based on their source location
 */
export type AgentType = "system" | "project" | "global"

/**
 * Categorized agent registry for UI display
 * Uses Maps for O(1) lookup by agent name
 */
export interface AgentRegistry {
	system: Map<string, AgentDefinition>
	project: Map<string, AgentDefinition>
	global: Map<string, AgentDefinition>
}

/**
 * Parsed YAML frontmatter from user agent Markdown files
 */
export interface AgentFrontmatter {
	name: string
	description: string
}

/**
 * Parameters for the predefined agent tool (extends subagent parameters)
 */
export interface PredefinedAgentParams {
	/** Short (3-5 word) description of the task */
	description: string
	/** The specific task for the agent to perform */
	prompt: string
	/** The type of specialized agent to use */
	subagent_type: string
	/** Optional write permissions (inherited from subagent) */
	writePermissions?: boolean
	/** Optional allowed write paths (inherited from subagent) */
	allowedWritePaths?: string[]
	/** Optional max execution time (inherited from subagent) */
	maxExecutionTime?: number
	/** Optional priority (inherited from subagent) */
	priority?: string
}

/**
 * Result of agent discovery and loading
 */
export interface AgentDiscoveryResult {
	/** Successfully loaded agents */
	agents: AgentRegistry
	/** Any errors encountered during discovery */
	errors: Array<{
		location: string
		error: string
	}>
}

/**
 * Agent loading context with workspace information
 */
export interface AgentLoadingContext {
	/** Current workspace root path */
	workspaceRoot: string
	/** User home directory path */
	homeDirectory: string
}
