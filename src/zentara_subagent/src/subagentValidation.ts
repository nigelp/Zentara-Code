export interface ValidationResult {
	isValid: boolean
	errors: string[]
}

export interface SubAgentParamsToValidate {
	description?: string
	message?: string
	writePermissions?: boolean
	allowedWritePaths?: string[]
	maxExecutionTime?: number
	priority?: string
	/**
	 * Discovery source bucket for predefined prompts.
	 * When provided, must be 'system' | 'project' | 'global' | null
	 */
	subagent_type?: "system" | "project" | "global" | null
	outputSchema?: any
}

export function validateSubAgentParams(params: SubAgentParamsToValidate): ValidationResult {
	const errors: string[] = []

	// Required parameters
	if (!params.description || typeof params.description !== "string") {
		errors.push("Description is required and must be a string")
	} else if (params.description.trim().length < 2) {
		errors.push("Description must be at least 2 characters")
	} else if (params.description.split(/\s+/).length > 20) {
		errors.push("Description should be 3-5 words")
	}

	if (!params.message || typeof params.message !== "string") {
		errors.push("Message is required and must be a string")
	}

	// Optional parameters
	if (params.writePermissions !== undefined && typeof params.writePermissions !== "boolean") {
		errors.push("writePermissions must be a boolean")
	}

	if (params.allowedWritePaths !== undefined) {
		if (!Array.isArray(params.allowedWritePaths)) {
			errors.push("allowedWritePaths must be an array")
		} else {
			params.allowedWritePaths.forEach((path: any, index: number) => {
				if (typeof path !== "string") {
					errors.push(`allowedWritePaths[${index}] must be a string`)
				}
			})
		}
	}

	if (params.writePermissions && (!params.allowedWritePaths || params.allowedWritePaths.length === 0)) {
		errors.push("writePermissions requires allowedWritePaths to be specified")
	}

	if (params.maxExecutionTime !== undefined) {
		if (typeof params.maxExecutionTime !== "number") {
			errors.push("maxExecutionTime must be a number")
		} else if (params.maxExecutionTime < 1000 || params.maxExecutionTime > 300000) {
			errors.push("maxExecutionTime must be between 1000-300000 ms (1-300 seconds)")
		}
	}

	if (params.priority !== undefined) {
		if (!["low", "normal", "high"].includes(params.priority)) {
			errors.push("priority must be 'low', 'normal', or 'high'")
		}
	}

	// subagent_type validation (optional)
	if (params.subagent_type !== undefined) {
		const allowed = ["system", "project", "global", null] as const
		// Using any here to satisfy includes check at runtime
		if (!(allowed as any).includes(params.subagent_type as any)) {
			errors.push("subagent_type must be 'system', 'project', 'global', or null")
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	}
}

export function getAllowedToolsForSubAgent(hasWritePermissions: boolean): string[] {
	// Read-only tools that all subagents can use
	const readOnlyTools = [
		"read_file",
		"list_files",
		"glob",
		"search_files",
		"list_code_definition_names",
		"search_symbol",
		"get_os_info",
		"get_folder_structure",
		"explore_repo",
		"view_source_code_definitions_tree",
	]

	// Write tools that require explicit permissions
	const writeTools = ["write_file", "str_replace_based_edit", "execute_command", "browser_action", "screenshot"]

	// Tools that are never allowed for subagents
	const forbiddenTools = [
		"subagent", // Prevent recursive subagent creation
		"restart_task",
		"exit_continuation",
		"debug", // Debug tools require user interaction
		"ask_followup_question",
		"attempt_completion",
	]

	if (hasWritePermissions) {
		return [...readOnlyTools, ...writeTools]
	} else {
		return readOnlyTools
	}
}
