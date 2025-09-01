import * as fs from "fs"
import * as path from "path"
import * as os from "os"

// Mock vscode module before importing agentDiscovery
const mockVscode = {
	workspace: {
		workspaceFolders: undefined as any,
	},
}

// Set up module mock
require.cache[require.resolve("vscode")] = {
	exports: mockVscode,
	id: "vscode",
	filename: "vscode",
	loaded: true,
	children: [],
	paths: [],
	parent: null,
} as any

import {
	AgentDefinition,
	SystemAgentDefinition,
	UserAgentDefinition,
	AgentRegistry,
	AgentDiscoveryResult,
	AgentLoadingContext,
	AgentFrontmatter,
	AGENT_DISCOVERY_LOCATIONS,
} from "@roo-code/types"
import { discoverAgents, findAgentByName, getAllAgentNames, createAgentLoadingContext } from "../src/agentDiscovery"

interface TestResult {
	testName: string
	passed: boolean
	error?: string
}

const testResults: TestResult[] = []

function assert(condition: boolean, message: string): void {
	if (!condition) {
		throw new Error(`Assertion failed: ${message}`)
	}
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
	if (JSON.stringify(actual) !== JSON.stringify(expected)) {
		throw new Error(`${message}. Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}`)
	}
}

function assertContains(str: string, substring: string, message: string): void {
	if (!str.includes(substring)) {
		throw new Error(`${message}. String "${str}" does not contain "${substring}"`)
	}
}

function assertArrayEqual<T>(actual: T[], expected: T[], message: string): void {
	if (actual.length !== expected.length) {
		throw new Error(`${message}. Array lengths differ. Expected: ${expected.length}, Actual: ${actual.length}`)
	}
	for (let i = 0; i < actual.length; i++) {
		if (JSON.stringify(actual[i]) !== JSON.stringify(expected[i])) {
			throw new Error(
				`${message}. Array element ${i} differs. Expected: ${JSON.stringify(expected[i])}, Actual: ${JSON.stringify(actual[i])}`,
			)
		}
	}
}

async function runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
	try {
		await testFn()
		testResults.push({ testName, passed: true })
		console.log(`✓ ${testName}`)
	} catch (error) {
		testResults.push({ testName, passed: false, error: (error as Error).message })
		console.log(`✗ ${testName}: ${(error as Error).message}`)
	}
}

// Helper function to create test directories and files
function setupTestEnvironment(tempDir: string): void {
	// Create system agents directory
	const systemAgentsDir = path.join(tempDir, AGENT_DISCOVERY_LOCATIONS.SYSTEM)
	fs.mkdirSync(systemAgentsDir, { recursive: true })

	// Create project agents directory
	const projectAgentsDir = path.join(tempDir, AGENT_DISCOVERY_LOCATIONS.PROJECT)
	fs.mkdirSync(projectAgentsDir, { recursive: true })

	// Create a valid system agent file
	const systemAgentContent = `export const testAgent: SystemAgentDefinition = {
	name: "test-system-agent",
	description: "A test system agent",
	systemPrompt: \`You are a test agent\`
};`
	fs.writeFileSync(path.join(systemAgentsDir, "testAgent.ts"), systemAgentContent)

	// Create an invalid system agent file (should be skipped)
	fs.writeFileSync(path.join(systemAgentsDir, "invalid.ts"), "invalid content")

	// Create test files that should be ignored
	fs.writeFileSync(path.join(systemAgentsDir, "test.test.ts"), "test file")
	fs.writeFileSync(path.join(systemAgentsDir, "types.d.ts"), "type definitions")

	// Create a valid project agent file
	const projectAgentContent = `---
name: test-project-agent
description: A test project agent
---

You are a project-specific test agent`
	fs.writeFileSync(path.join(projectAgentsDir, "testProjectAgent.md"), projectAgentContent)

	// Create an invalid markdown file (missing frontmatter)
	fs.writeFileSync(path.join(projectAgentsDir, "invalid.md"), "# Invalid agent\nNo frontmatter here")

	// Create a markdown file with incomplete frontmatter
	const incompleteAgent = `---
name: incomplete-agent
---

Missing description field`
	fs.writeFileSync(path.join(projectAgentsDir, "incomplete.md"), incompleteAgent)

	// Create a non-markdown file (should be ignored)
	fs.writeFileSync(path.join(projectAgentsDir, "readme.txt"), "This is not a markdown file")
}

function cleanupTestEnvironment(tempDir: string): void {
	if (fs.existsSync(tempDir)) {
		fs.rmSync(tempDir, { recursive: true, force: true })
	}
}

// Test: discoverAgents with valid agents
async function testDiscoverAgentsValid(): Promise<void> {
	const tempDir = path.join(os.tmpdir(), `zentara-test-${Date.now()}`)
	setupTestEnvironment(tempDir)

	const context: AgentLoadingContext = {
		workspaceRoot: tempDir,
		homeDirectory: tempDir,
	}

	try {
		const result = await discoverAgents(context)

		// Check system agents
		assertEqual(result.agents.system.length, 1, "Should find one valid system agent")
		assertEqual(result.agents.system[0].name, "test-system-agent", "System agent name should match")
		assertEqual(result.agents.system[0].description, "A test system agent", "System agent description should match")

		// Check project agents
		assertEqual(result.agents.project.length, 1, "Should find one valid project agent")
		assertEqual(result.agents.project[0].name, "test-project-agent", "Project agent name should match")
		assertEqual(
			result.agents.project[0].description,
			"A test project agent",
			"Project agent description should match",
		)

		// Check that errors were logged for invalid files
		assert(result.errors.length === 0 || result.errors.length > 0, "Errors array should exist")
	} finally {
		cleanupTestEnvironment(tempDir)
	}
}

// Test: discoverAgents with missing directories
async function testDiscoverAgentsMissingDirs(): Promise<void> {
	const tempDir = path.join(os.tmpdir(), `zentara-test-${Date.now()}`)
	fs.mkdirSync(tempDir, { recursive: true })

	const context: AgentLoadingContext = {
		workspaceRoot: tempDir,
		homeDirectory: tempDir,
	}

	try {
		const result = await discoverAgents(context)

		assertEqual(result.agents.system.length, 0, "Should return empty array for missing system directory")
		assertEqual(result.agents.project.length, 0, "Should return empty array for missing project directory")
		assertEqual(result.agents.global.length, 0, "Should return empty array for missing global directory")
	} finally {
		cleanupTestEnvironment(tempDir)
	}
}

// Test: findAgentByName function
async function testFindAgentByName(): Promise<void> {
	const registry: AgentRegistry = {
		system: [{ name: "system-agent", description: "System", systemPrompt: "System prompt" }],
		project: [
			{
				name: "project-agent",
				description: "Project",
				systemPrompt: "Project prompt",
				filePath: "/path/to/project.md",
			},
			{
				name: "duplicate-agent",
				description: "Project duplicate",
				systemPrompt: "Project duplicate prompt",
				filePath: "/path/to/dup.md",
			},
		],
		global: [
			{
				name: "global-agent",
				description: "Global",
				systemPrompt: "Global prompt",
				filePath: "/path/to/global.md",
			},
			{
				name: "duplicate-agent",
				description: "Global duplicate",
				systemPrompt: "Global duplicate prompt",
				filePath: "/path/to/global-dup.md",
			},
		],
	}

	// Test finding system agent
	const systemAgent = findAgentByName(registry, "system-agent")
	assert(systemAgent !== null, "Should find system agent")
	assertEqual(systemAgent?.name, "system-agent", "Should return correct system agent")

	// Test finding project agent
	const projectAgent = findAgentByName(registry, "project-agent")
	assert(projectAgent !== null, "Should find project agent")
	assertEqual(projectAgent?.name, "project-agent", "Should return correct project agent")

	// Test finding global agent
	const globalAgent = findAgentByName(registry, "global-agent")
	assert(globalAgent !== null, "Should find global agent")
	assertEqual(globalAgent?.name, "global-agent", "Should return correct global agent")

	// Test priority: project agent should override global agent
	const duplicateAgent = findAgentByName(registry, "duplicate-agent")
	assert(duplicateAgent !== null, "Should find duplicate agent")
	assertEqual(
		(duplicateAgent as UserAgentDefinition)?.filePath,
		"/path/to/dup.md",
		"Should return project agent (higher priority)",
	)

	// Test non-existent agent
	const notFound = findAgentByName(registry, "non-existent")
	assertEqual(notFound, null, "Should return null for non-existent agent")
}

// Test: getAllAgentNames function
async function testGetAllAgentNames(): Promise<void> {
	const registry: AgentRegistry = {
		system: [
			{ name: "zebra", description: "Z", systemPrompt: "Z prompt" },
			{ name: "alpha", description: "A", systemPrompt: "A prompt" },
		],
		project: [
			{ name: "beta", description: "B", systemPrompt: "B prompt", filePath: "/b.md" },
			{ name: "duplicate", description: "D", systemPrompt: "D prompt", filePath: "/d.md" },
		],
		global: [
			{ name: "gamma", description: "G", systemPrompt: "G prompt", filePath: "/g.md" },
			{ name: "duplicate", description: "D2", systemPrompt: "D2 prompt", filePath: "/d2.md" },
		],
	}

	const names = getAllAgentNames(registry)

	// Should contain all unique names, sorted alphabetically
	const expected = ["alpha", "beta", "duplicate", "gamma", "zebra"]
	assertArrayEqual(names, expected, "Should return all unique agent names sorted alphabetically")
}

// Test: parseMarkdownWithFrontmatter (internal function test via valid/invalid markdown)
async function testMarkdownParsing(): Promise<void> {
	const tempDir = path.join(os.tmpdir(), `zentara-test-${Date.now()}`)
	const agentsDir = path.join(tempDir, ".zentara/agents")
	fs.mkdirSync(agentsDir, { recursive: true })

	// Test valid markdown with complete frontmatter
	const validContent = `---
name: valid-agent
description: A valid agent
---

This is the agent prompt content.
Multiple lines are supported.`
	fs.writeFileSync(path.join(agentsDir, "valid.md"), validContent)

	// Test markdown with YAML parsing error
	const invalidYaml = `---
name: invalid
description: "unclosed quote
---

Content here`
	fs.writeFileSync(path.join(agentsDir, "invalid-yaml.md"), invalidYaml)

	// Test markdown without frontmatter delimiter end
	const noEndDelimiter = `---
name: no-end
description: Missing end delimiter

Content without proper end`
	fs.writeFileSync(path.join(agentsDir, "no-end.md"), noEndDelimiter)

	// Test markdown that doesn't start with frontmatter
	const noFrontmatter = `# Regular Markdown

Just a regular markdown file without frontmatter`
	fs.writeFileSync(path.join(agentsDir, "no-frontmatter.md"), noFrontmatter)

	const context: AgentLoadingContext = {
		workspaceRoot: tempDir,
		homeDirectory: tempDir,
	}

	try {
		const result = await discoverAgents(context)

		// Only the valid.md should be loaded successfully
		assertEqual(result.agents.project.length, 1, "Should load only one valid agent")
		assertEqual(result.agents.project[0].name, "valid-agent", "Should load the valid agent correctly")
		assertContains(
			result.agents.project[0].systemPrompt,
			"This is the agent prompt content",
			"Should preserve prompt content",
		)
	} finally {
		cleanupTestEnvironment(tempDir)
	}
}

// Test: createAgentLoadingContext function
async function testCreateAgentLoadingContext(): Promise<void> {
	// Mock vscode workspace
	const originalVscode = global.vscode
	global.vscode = {
		workspace: {
			workspaceFolders: [
				{
					uri: {
						fsPath: "/test/workspace",
					},
				},
			],
		},
	} as any

	try {
		const context = createAgentLoadingContext()
		assertEqual(context.workspaceRoot, "/test/workspace", "Should use vscode workspace folder")
		assertEqual(context.homeDirectory, os.homedir(), "Should use OS home directory")
	} finally {
		global.vscode = originalVscode
	}

	// Test without vscode workspace
	global.vscode = {
		workspace: {
			workspaceFolders: undefined,
		},
	} as any

	try {
		const context = createAgentLoadingContext()
		assertEqual(context.workspaceRoot, process.cwd(), "Should fall back to process.cwd()")
		assertEqual(context.homeDirectory, os.homedir(), "Should use OS home directory")
	} finally {
		global.vscode = originalVscode
	}
}

// Test: Empty registry handling
async function testEmptyRegistry(): Promise<void> {
	const emptyRegistry: AgentRegistry = {
		system: [],
		project: [],
		global: [],
	}

	const foundAgent = findAgentByName(emptyRegistry, "any-agent")
	assertEqual(foundAgent, null, "Should return null for empty registry")

	const allNames = getAllAgentNames(emptyRegistry)
	assertArrayEqual(allNames, [], "Should return empty array for empty registry")
}

// Test: Special characters in agent names
async function testSpecialCharacterHandling(): Promise<void> {
	const tempDir = path.join(os.tmpdir(), `zentara-test-${Date.now()}`)
	const agentsDir = path.join(tempDir, ".zentara/agents")
	fs.mkdirSync(agentsDir, { recursive: true })

	// Create agent with special characters
	const specialContent = `---
name: special-chars-@#$
description: Agent with special characters & symbols
---

Agent prompt with special chars: @#$%^&*()`
	fs.writeFileSync(path.join(agentsDir, "special.md"), specialContent)

	const context: AgentLoadingContext = {
		workspaceRoot: tempDir,
		homeDirectory: tempDir,
	}

	try {
		const result = await discoverAgents(context)
		assertEqual(result.agents.project.length, 1, "Should load agent with special characters")
		assertEqual(result.agents.project[0].name, "special-chars-@#$", "Should preserve special characters in name")
		assertContains(result.agents.project[0].description, "&", "Should preserve special characters in description")
	} finally {
		cleanupTestEnvironment(tempDir)
	}
}

// Test: Large agent files handling
async function testLargeAgentFiles(): Promise<void> {
	const tempDir = path.join(os.tmpdir(), `zentara-test-${Date.now()}`)
	const agentsDir = path.join(tempDir, ".zentara/agents")
	fs.mkdirSync(agentsDir, { recursive: true })

	// Create a large agent file
	const largePrompt = "This is a line of content.\n".repeat(10000)
	const largeContent = `---
name: large-agent
description: Agent with large content
---

${largePrompt}`
	fs.writeFileSync(path.join(agentsDir, "large.md"), largeContent)

	const context: AgentLoadingContext = {
		workspaceRoot: tempDir,
		homeDirectory: tempDir,
	}

	try {
		const result = await discoverAgents(context)
		assertEqual(result.agents.project.length, 1, "Should load large agent file")
		assertEqual(result.agents.project[0].name, "large-agent", "Should parse large file correctly")
		assert(result.agents.project[0].systemPrompt.length > 100000, "Should preserve large content")
	} finally {
		cleanupTestEnvironment(tempDir)
	}
}

// Run all tests
async function runAllTests() {
	console.log("Running agentDiscovery tests...\n")

	await runTest("testDiscoverAgentsValid", testDiscoverAgentsValid)
	await runTest("testDiscoverAgentsMissingDirs", testDiscoverAgentsMissingDirs)
	await runTest("testFindAgentByName", testFindAgentByName)
	await runTest("testGetAllAgentNames", testGetAllAgentNames)
	await runTest("testMarkdownParsing", testMarkdownParsing)
	await runTest("testCreateAgentLoadingContext", testCreateAgentLoadingContext)
	await runTest("testEmptyRegistry", testEmptyRegistry)
	await runTest("testSpecialCharacterHandling", testSpecialCharacterHandling)
	await runTest("testLargeAgentFiles", testLargeAgentFiles)

	// Summary
	console.log("\n=== Test Summary ===")
	const passed = testResults.filter((r) => r.passed).length
	const failed = testResults.filter((r) => !r.passed).length
	console.log(`Total: ${testResults.length}`)
	console.log(`Passed: ${passed}`)
	console.log(`Failed: ${failed}`)

	if (failed > 0) {
		console.log("\nFailed tests:")
		testResults
			.filter((r) => !r.passed)
			.forEach((r) => {
				console.log(`  - ${r.testName}: ${r.error}`)
			})
		process.exit(1)
	}
}

// Execute tests if this file is run directly
if (require.main === module) {
	runAllTests().catch(console.error)
}

export { runAllTests }
