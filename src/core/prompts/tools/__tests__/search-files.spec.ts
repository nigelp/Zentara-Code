import { getSearchFilesDescription } from "../search-files"
import { ToolArgs } from "../types"

describe("getSearchFilesDescription", () => {
	const mockArgs: ToolArgs = {
		cwd: "/test/workspace",
		supportsComputerUse: false,
	}

	it("should return a properly formatted search_files tool description", () => {
		const description = getSearchFilesDescription(mockArgs)

		// Check if description contains the tool name
		expect(description).toContain("## search_files")

		// Check if description contains the main description
		expect(description).toContain("Request to perform a regex search across files")

		// Check if description contains workspace directory reference
		expect(description).toContain(mockArgs.cwd)
	})

	it("should include all required parameter documentation", () => {
		const description = getSearchFilesDescription(mockArgs)

		// Check for required pattern parameter
		expect(description).toContain('"pattern"')
		expect(description).toContain("REQUIRED")

		// Check for basic parameters
		expect(description).toContain('"path"')
		expect(description).toContain('"output_mode"')
		expect(description).toContain('"glob"')
		expect(description).toContain('"type"')
	})

	it("should include all advanced parameter documentation", () => {
		const description = getSearchFilesDescription(mockArgs)

		// Check for context parameters
		expect(description).toContain('"-A"')
		expect(description).toContain('"-B"')
		expect(description).toContain('"-C"')
		expect(description).toContain('"-n"')
		expect(description).toContain('"-i"')

		// Check for advanced options
		expect(description).toContain('"multiline"')
		expect(description).toContain('"head_limit"')
	})

	it("should include output mode options", () => {
		const description = getSearchFilesDescription(mockArgs)

		expect(description).toContain('"content"')
		expect(description).toContain('"files_with_matches"')
		expect(description).toContain('"count"')
	})

	it("should include usage examples", () => {
		const description = getSearchFilesDescription(mockArgs)

		// Check for XML tag usage
		expect(description).toContain("<search_files>")
		expect(description).toContain("</search_files>")

		// Check for JSON parameter examples
		expect(description).toContain('{"pattern":')

		// Check for multiple example types
		expect(description).toContain("Basic search")
		expect(description).toContain("Advanced search")
	})

	it("should include pattern syntax documentation", () => {
		const description = getSearchFilesDescription(mockArgs)

		expect(description).toContain("Pattern Syntax")
		expect(description).toContain("Rust regex syntax")
		expect(description).toContain("Character classes")
		expect(description).toContain("Quantifiers")
		expect(description).toContain("Anchors")
	})

	it("should include common search patterns", () => {
		const description = getSearchFilesDescription(mockArgs)

		expect(description).toContain("Common Search Patterns")
		expect(description).toContain("Function definitions")
		expect(description).toContain("Import statements")
		expect(description).toContain("TODO comments")
	})

	it("should include best practices", () => {
		const description = getSearchFilesDescription(mockArgs)

		expect(description).toContain("Best Practices")
		expect(description).toContain("specific patterns")
		expect(description).toContain("file type")
		expect(description).toContain("multiline mode")
	})

	it("should include quick-start section", () => {
		const description = getSearchFilesDescription(mockArgs)

		expect(description).toContain("QUICK-START")
		expect(description).toContain("Usage")
		expect(description).toContain("Common Breakers")
		expect(description).toContain("COPY-READY TEMPLATES")
	})

	it("should properly escape backslashes in examples", () => {
		const description = getSearchFilesDescription(mockArgs)

		// Check for properly escaped regex patterns in examples
		expect(description).toContain("\\\\s+")
		expect(description).toContain("\\\\w+")
		expect(description).toContain("\\\\.")
	})

	it("should include file type reference", () => {
		const description = getSearchFilesDescription(mockArgs)

		// Check for common file types
		expect(description).toContain("js, ts, py, java")
		expect(description).toContain("go, rust, cpp")
	})
})
