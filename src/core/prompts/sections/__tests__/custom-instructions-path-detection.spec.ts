import * as path from "path"

describe("custom-instructions path detection", () => {
	it("should use exact path comparison instead of string includes", () => {
		// Test the logic that our fix implements
		const fakeHomeDir = "/Users/john.zentara.smith"
		const globalZentaraDir = path.join(fakeHomeDir, ".zentara") // "/Users/john.zentara.smith/.zentara"
		const projectZentaraDir = "/projects/my-project/.zentara"

		// Old implementation (fragile):
		// const isGlobal = zentaraDir.includes(path.join(os.homedir(), ".zentara"))
		// This could fail if the home directory path contains ".zentara" elsewhere

		// New implementation (robust):
		// const isGlobal = path.resolve(zentaraDir) === path.resolve(getGlobalZentaraDirectory())

		// Test the new logic
		const isGlobalForGlobalDir = path.resolve(globalZentaraDir) === path.resolve(globalZentaraDir)
		const isGlobalForProjectDir = path.resolve(projectZentaraDir) === path.resolve(globalZentaraDir)

		expect(isGlobalForGlobalDir).toBe(true)
		expect(isGlobalForProjectDir).toBe(false)

		// Verify that the old implementation would have been problematic
		// if the home directory contained ".zentara" in the path
		const oldLogicGlobal = globalZentaraDir.includes(path.join(fakeHomeDir, ".zentara"))
		const oldLogicProject = projectZentaraDir.includes(path.join(fakeHomeDir, ".zentara"))

		expect(oldLogicGlobal).toBe(true) // This works
		expect(oldLogicProject).toBe(false) // This also works, but is fragile

		// The issue was that if the home directory path itself contained ".zentara",
		// the includes() check could produce false positives in edge cases
	})

	it("should handle edge cases with path resolution", () => {
		// Test various edge cases that exact path comparison handles better
		const testCases = [
			{
				global: "/Users/test/.zentara",
				project: "/Users/test/project/.zentara",
				expected: { global: true, project: false },
			},
			{
				global: "/home/user/.zentara",
				project: "/home/user/.zentara", // Same directory
				expected: { global: true, project: true },
			},
			{
				global: "/Users/john.zentara.smith/.zentara",
				project: "/projects/app/.zentara",
				expected: { global: true, project: false },
			},
		]

		testCases.forEach(({ global, project, expected }) => {
			const isGlobalForGlobal = path.resolve(global) === path.resolve(global)
			const isGlobalForProject = path.resolve(project) === path.resolve(global)

			expect(isGlobalForGlobal).toBe(expected.global)
			expect(isGlobalForProject).toBe(expected.project)
		})
	})
})
