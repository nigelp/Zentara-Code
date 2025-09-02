#!/usr/bin/env tsx

import { runAllTests } from "./subagentTool.test"

// Run the tests
console.log("Starting test suite for zentara_subagent...\n")

runAllTests()
	.then(() => {
		console.log("\nTest suite completed.")
		process.exit(0)
	})
	.catch((error) => {
		console.error("\nTest suite failed with error:", error)
		process.exit(1)
	})
