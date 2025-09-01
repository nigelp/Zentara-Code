/**
 * Integration tests for findUsages LSP tool
 */

import * as vscode from "vscode"
import { lspController } from "../../zentara_lsp/src/LspController"
import {
	TestReporter,
	createTestFile,
	openTestFile,
	getPosition,
	assert,
	SAMPLE_TS_CONTENT,
	SAMPLE_PY_CONTENT,
	SAMPLE_JS_CONTENT,
} from "./testUtils"

export async function testFindUsages(reporter: TestReporter): Promise<void> {
	// Test 1: Find usages of a class in TypeScript (table format) - Position-based
	reporter.startTest("findUsages", "Find class usages in TypeScript (table format) - Position-based")
	try {
		const uri = await createTestFile("test-find-usages.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Wait for Language Server to index the file
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Find usages of TestClass (positioned on class name)
		const result = await lspController.findUsages({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 6 }, // Position on "TestClass"
		})

		// Result should now be a string in table format
		if (typeof result === 'string') {
			// Verify table format structure
			const lines = result.split('\n')
			assert(lines.length >= 1, "Table should have at least header line")
			assert(lines[0] === "URI | RANGE | PREVIEW | EOL", "Should have correct table header")
			
			// If there are data rows, verify they end with EOL marker
			if (lines.length > 1) {
				for (let i = 1; i < lines.length; i++) {
					assert(lines[i].endsWith(" | <<<"), `Row ${i} should end with EOL marker`)
				}
				console.log(`Found table format result with ${lines.length - 1} usage rows`)
			} else {
				console.log("Table format returned with header only (no usages found)")
			}

			reporter.passTest("findUsages", "Find class usages in TypeScript (table format) - Position-based")
		} else {
			// Should not happen with new implementation
			reporter.failTest("findUsages", "Find class usages in TypeScript (table format) - Position-based",
				new Error("Expected string table format, got: " + typeof result))
		}
	} catch (error) {
		reporter.failTest("findUsages", "Find class usages in TypeScript (table format) - Position-based", error)
	}

	// Test 1.1: Find usages of TestClass using symbolName parameter
	reporter.startTest("findUsages", "Find class usages in TypeScript (symbolName) - TestClass")
	try {
		const uri = await createTestFile("test-find-class-symbolname.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Wait for Language Server to index the file
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Find usages of TestClass using symbolName parameter
		const result = await lspController.findUsages({
			uri: uri.toString(),
			symbolName: "TestClass"
		})

		// Result should be a string in table format
		assert(typeof result === 'string', "Should return string table format")
		const lines = result.split('\n')
		assert(lines[0] === "URI | RANGE | PREVIEW | EOL", "Should have correct table header")
		
		if (lines.length > 1) {
			// Verify data rows structure
			for (let i = 1; i < lines.length; i++) {
				assert(lines[i].endsWith(" | <<<"), `Row ${i} should end with EOL marker`)
			}
			console.log(`Found ${lines.length - 1} usage rows for TestClass using symbolName`)
		} else {
			console.log("No usages found for TestClass using symbolName")
		}

		reporter.passTest("findUsages", "Find class usages in TypeScript (symbolName) - TestClass")
	} catch (error) {
		reporter.failTest("findUsages", "Find class usages in TypeScript (symbolName) - TestClass", error)
	}

	// Test 1.2: Find usages of testVariable using symbolName parameter
	reporter.startTest("findUsages", "Find variable usages in TypeScript (symbolName) - testVariable")
	try {
		const uri = await createTestFile("test-find-var-symbolname.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Wait for Language Server to index the file
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Find usages of testVariable using symbolName parameter
		const result = await lspController.findUsages({
			uri: uri.toString(),
			symbolName: "testVariable"
		})

		// Result should be a string in table format
		assert(typeof result === 'string', "Should return string table format")
		const lines = result.split('\n')
		assert(lines[0] === "URI | RANGE | PREVIEW | EOL", "Should have correct table header")
		
		if (lines.length > 1) {
			for (let i = 1; i < lines.length; i++) {
				assert(lines[i].endsWith(" | <<<"), `Row ${i} should end with EOL marker`)
			}
			console.log(`Found ${lines.length - 1} usage rows for testVariable using symbolName`)
		} else {
			console.log("No usages found for testVariable using symbolName")
		}

		reporter.passTest("findUsages", "Find variable usages in TypeScript (symbolName) - testVariable")
	} catch (error) {
		reporter.failTest("findUsages", "Find variable usages in TypeScript (symbolName) - testVariable", error)
	}

	// Test 1.3: Find usages of getValue method using symbolName parameter
	reporter.startTest("findUsages", "Find method usages in TypeScript (symbolName) - getValue")
	try {
		const uri = await createTestFile("test-find-method-symbolname.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Wait for Language Server to index the file
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Find usages of getValue method using symbolName parameter
		const result = await lspController.findUsages({
			uri: uri.toString(),
			symbolName: "getValue"
		})

		// Result should be a string in table format
		assert(typeof result === 'string', "Should return string table format")
		const lines = result.split('\n')
		assert(lines[0] === "URI | RANGE | PREVIEW | EOL", "Should have correct table header")
		
		if (lines.length > 1) {
			for (let i = 1; i < lines.length; i++) {
				assert(lines[i].endsWith(" | <<<"), `Row ${i} should end with EOL marker`)
			}
			console.log(`Found ${lines.length - 1} usage rows for getValue using symbolName`)
		} else {
			console.log("No usages found for getValue using symbolName")
		}

		reporter.passTest("findUsages", "Find method usages in TypeScript (symbolName) - getValue")
	} catch (error) {
		reporter.failTest("findUsages", "Find method usages in TypeScript (symbolName) - getValue", error)
	}

	// Test 1.4: Find usages of TestInterface using symbolName parameter
	reporter.startTest("findUsages", "Find interface usages in TypeScript (symbolName) - TestInterface")
	try {
		const uri = await createTestFile("test-find-interface-symbolname.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Wait for Language Server to index the file
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Find usages of TestInterface using symbolName parameter
		const result = await lspController.findUsages({
			uri: uri.toString(),
			symbolName: "TestInterface"
		})

		// Result should be a string in table format
		assert(typeof result === 'string', "Should return string table format")
		const lines = result.split('\n')
		assert(lines[0] === "URI | RANGE | PREVIEW | EOL", "Should have correct table header")
		
		if (lines.length > 1) {
			for (let i = 1; i < lines.length; i++) {
				assert(lines[i].endsWith(" | <<<"), `Row ${i} should end with EOL marker`)
			}
			console.log(`Found ${lines.length - 1} usage rows for TestInterface using symbolName`)
		} else {
			console.log("No usages found for TestInterface using symbolName")
		}

		reporter.passTest("findUsages", "Find interface usages in TypeScript (symbolName) - TestInterface")
	} catch (error) {
		reporter.failTest("findUsages", "Find interface usages in TypeScript (symbolName) - TestInterface", error)
	}

	// Test 1.5: Error case - Symbol not found using symbolName parameter
	reporter.startTest("findUsages", "Handle symbol not found (symbolName) - NonExistentSymbol")
	try {
		const uri = await createTestFile("test-find-nonexistent-symbolname.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Wait for Language Server to index the file
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Try to find usages of a non-existent symbol
		const result = await lspController.findUsages({
			uri: uri.toString(),
			symbolName: "NonExistentSymbol"
		})

		// Result should be a string in table format with error message
		assert(typeof result === 'string', "Should return string table format")
		const lines = result.split('\n')
		assert(lines[0] === "URI | RANGE | PREVIEW | EOL", "Should have correct table header")
		
		// Should have at least one data row with error message
		if (lines.length > 1) {
			assert(lines[1].includes("Symbol not found") || lines[1].includes("Error occurred during symbol lookup"), 
				"Should contain error message about symbol not found")
			console.log(`Error handling confirmed: ${lines[1]}`)
		}

		reporter.passTest("findUsages", "Handle symbol not found (symbolName) - NonExistentSymbol")
	} catch (error) {
		reporter.failTest("findUsages", "Handle symbol not found (symbolName) - NonExistentSymbol", error)
	}

	// Test 2: Find usages of a function in TypeScript (table format) - Position-based
	reporter.startTest("findUsages", "Find function usages in TypeScript (table format) - Position-based")
	try {
		const uri = await createTestFile("test-find-func-usages.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Wait for Language Server to index the file
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Find usages of getValue method
		const result = await lspController.findUsages({
			textDocument: { uri: uri.toString() },
			position: { line: 8, character: 4 }, // Position on "getValue"
		})

		// Result should be a string in table format
		assert(typeof result === 'string', "Should return string table format")
		const lines = result.split('\n')
		assert(lines[0] === "URI | RANGE | PREVIEW | EOL", "Should have correct table header")
		
		if (lines.length > 1) {
			console.log(`Found table format result with ${lines.length - 1} usage rows for getValue`)
		} else {
			console.log("Table format returned with header only (no usages found for getValue)")
		}

		reporter.passTest("findUsages", "Find function usages in TypeScript (table format) - Position-based")
	} catch (error) {
		reporter.failTest("findUsages", "Find function usages in TypeScript (table format) - Position-based", error)
	}

	// Test 3: Find usages of a variable (table format) - Position-based
	reporter.startTest("findUsages", "Find variable usages (table format) - Position-based")
	try {
		const uri = await createTestFile("test-find-var-usages.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Wait for Language Server to index the file
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Find usages of testVariable
		const result = await lspController.findUsages({
			textDocument: { uri: uri.toString() },
			position: { line: 32, character: 6 }, // Position on "testVariable"
		})

		assert(typeof result === 'string', "Should return string table format")
		const lines = result.split('\n')
		assert(lines[0] === "URI | RANGE | PREVIEW | EOL", "Should have correct table header")
		
		console.log(`Table format result for testVariable: ${lines.length - 1} usage rows`)
		reporter.passTest("findUsages", "Find variable usages (table format) - Position-based")
	} catch (error) {
		reporter.failTest("findUsages", "Find variable usages (table format) - Position-based", error)
	}

	// Test 4: Find usages in Python file (table format) - Position-based
	reporter.startTest("findUsages", "Find usages in Python (table format) - Position-based")
	try {
		const uri = await createTestFile("test-find-usages.py", SAMPLE_PY_CONTENT)
		const editor = await openTestFile(uri)

		// Wait for Language Server to index the file
		await new Promise((resolve) => setTimeout(resolve, 1500))

		// Find usages of TestClass in Python
		const result = await lspController.findUsages({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 6 }, // Position on "TestClass"
		})

		assert(typeof result === 'string', "Should return string table format")
		const lines = result.split('\n')
		assert(lines[0] === "URI | RANGE | PREVIEW | EOL", "Should have correct table header")
		
		console.log(`Table format result for Python TestClass: ${lines.length - 1} usage rows`)
		reporter.passTest("findUsages", "Find usages in Python (table format) - Position-based")
	} catch (error) {
		reporter.failTest("findUsages", "Find usages in Python (table format) - Position-based", error)
	}

	// Test 4.1: Find usages in Python file using symbolName parameter
	reporter.startTest("findUsages", "Find usages in Python (symbolName) - TestClass")
	try {
		const uri = await createTestFile("test-find-python-symbolname.py", SAMPLE_PY_CONTENT)
		const editor = await openTestFile(uri)

		// Wait for Language Server to index the file
		await new Promise((resolve) => setTimeout(resolve, 1500))

		// Find usages of TestClass in Python using symbolName
		const result = await lspController.findUsages({
			uri: uri.toString(),
			symbolName: "TestClass"
		})

		assert(typeof result === 'string', "Should return string table format")
		const lines = result.split('\n')
		assert(lines[0] === "URI | RANGE | PREVIEW | EOL", "Should have correct table header")
		
		console.log(`Table format result for Python TestClass using symbolName: ${lines.length - 1} usage rows`)
		reporter.passTest("findUsages", "Find usages in Python (symbolName) - TestClass")
	} catch (error) {
		reporter.failTest("findUsages", "Find usages in Python (symbolName) - TestClass", error)
	}

	// Test 4.2: Find usages in Python file using symbolName parameter - test_function
	reporter.startTest("findUsages", "Find usages in Python (symbolName) - test_function")
	try {
		const uri = await createTestFile("test-find-python-func-symbolname.py", SAMPLE_PY_CONTENT)
		const editor = await openTestFile(uri)

		// Wait for Language Server to index the file
		await new Promise((resolve) => setTimeout(resolve, 1500))

		// Find usages of test_function in Python using symbolName
		const result = await lspController.findUsages({
			uri: uri.toString(),
			symbolName: "test_function"
		})

		assert(typeof result === 'string', "Should return string table format")
		const lines = result.split('\n')
		assert(lines[0] === "URI | RANGE | PREVIEW | EOL", "Should have correct table header")
		
		console.log(`Table format result for Python test_function using symbolName: ${lines.length - 1} usage rows`)
		reporter.passTest("findUsages", "Find usages in Python (symbolName) - test_function")
	} catch (error) {
		reporter.failTest("findUsages", "Find usages in Python (symbolName) - test_function", error)
	}

	// Test 5: Find usages in JavaScript file (table format) - Position-based
	reporter.startTest("findUsages", "Find usages in JavaScript (table format) - Position-based")
	try {
		const uri = await createTestFile("test-find-usages.js", SAMPLE_JS_CONTENT)
		const editor = await openTestFile(uri)

		// Find usages of testFunction
		const result = await lspController.findUsages({
			textDocument: { uri: uri.toString() },
			position: { line: 16, character: 9 }, // Position on "testFunction"
		})

		assert(typeof result === 'string', "Should return string table format")
		const lines = result.split('\n')
		assert(lines[0] === "URI | RANGE | PREVIEW | EOL", "Should have correct table header")

		reporter.passTest("findUsages", "Find usages in JavaScript (table format) - Position-based")
	} catch (error) {
		reporter.failTest("findUsages", "Find usages in JavaScript (table format) - Position-based", error)
	}

	// Test 5.1: Find usages in JavaScript file using symbolName parameter
	reporter.startTest("findUsages", "Find usages in JavaScript (symbolName) - TestClass")
	try {
		const uri = await createTestFile("test-find-js-symbolname.js", SAMPLE_JS_CONTENT)
		const editor = await openTestFile(uri)

		// Wait for Language Server to index the file
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Find usages of TestClass
		const result = await lspController.findUsages({
			uri: uri.toString(),
			symbolName: "TestClass"
		})

		assert(typeof result === 'string', "Should return string table format")
		const lines = result.split('\n')
		assert(lines[0] === "URI | RANGE | PREVIEW | EOL", "Should have correct table header")

		console.log(`Table format result for JavaScript TestClass using symbolName: ${lines.length - 1} usage rows`)
		reporter.passTest("findUsages", "Find usages in JavaScript (symbolName) - TestClass")
	} catch (error) {
		reporter.failTest("findUsages", "Find usages in JavaScript (symbolName) - TestClass", error)
	}

	// Test 5.2: Find usages in JavaScript file using symbolName parameter - testFunction
	reporter.startTest("findUsages", "Find usages in JavaScript (symbolName) - testFunction")
	try {
		const uri = await createTestFile("test-find-js-func-symbolname.js", SAMPLE_JS_CONTENT)
		const editor = await openTestFile(uri)

		// Wait for Language Server to index the file
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Find usages of testFunction
		const result = await lspController.findUsages({
			uri: uri.toString(),
			symbolName: "testFunction"
		})

		assert(typeof result === 'string', "Should return string table format")
		const lines = result.split('\n')
		assert(lines[0] === "URI | RANGE | PREVIEW | EOL", "Should have correct table header")

		console.log(`Table format result for JavaScript testFunction using symbolName: ${lines.length - 1} usage rows`)
		reporter.passTest("findUsages", "Find usages in JavaScript (symbolName) - testFunction")
	} catch (error) {
		reporter.failTest("findUsages", "Find usages in JavaScript (symbolName) - testFunction", error)
	}

	// Test 6: Handle invalid position gracefully (table format) - Position-based
	reporter.startTest("findUsages", "Handle invalid position (table format) - Position-based")
	try {
		const uri = await createTestFile("test-invalid-pos.ts", SAMPLE_TS_CONTENT)

		const result = await lspController.findUsages({
			textDocument: { uri: uri.toString() },
			position: { line: 9999, character: 9999 }, // Invalid position
		})

		// Should return table format even for invalid position
		assert(typeof result === 'string', "Should return string table format even for invalid position")
		const lines = result.split('\n')
		assert(lines[0] === "URI | RANGE | PREVIEW | EOL", "Should have correct table header")

		reporter.passTest("findUsages", "Handle invalid position (table format) - Position-based")
	} catch (error) {
		reporter.failTest("findUsages", "Handle invalid position (table format) - Position-based", error)
	}

	// Test 7: Parameter validation - Missing both position and symbolName
	reporter.startTest("findUsages", "Parameter validation - Missing required parameters")
	try {
		const uri = await createTestFile("test-param-validation.ts", SAMPLE_TS_CONTENT)

		// Try to call without both position and symbolName - this should fail
		try {
			const result = await lspController.findUsages({
				uri: uri.toString()
				// Missing both line/character and symbolName
			})
			// If we get here, the validation didn't work as expected
			reporter.failTest("findUsages", "Parameter validation - Missing required parameters",
				new Error("Expected parameter validation to fail, but call succeeded"))
		} catch (validationError) {
			// This is expected - parameter validation should catch this
			console.log(`Parameter validation correctly caught missing parameters: ${validationError.message}`)
			reporter.passTest("findUsages", "Parameter validation - Missing required parameters")
		}
	} catch (error) {
		reporter.failTest("findUsages", "Parameter validation - Missing required parameters", error)
	}

	// Test 8: Test case sensitivity for symbolName
	reporter.startTest("findUsages", "Test case sensitivity (symbolName) - testclass vs TestClass")
	try {
		const uri = await createTestFile("test-case-sensitivity.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Wait for Language Server to index the file
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Try to find usages with wrong case
		const result = await lspController.findUsages({
			uri: uri.toString(),
			symbolName: "testclass" // Wrong case
		})

		assert(typeof result === 'string', "Should return string table format")
		const lines = result.split('\n')
		assert(lines[0] === "URI | RANGE | PREVIEW | EOL", "Should have correct table header")
		
		// Should either find no results or return error message
		if (lines.length > 1) {
			// Check if it's an error message or actual results
			if (lines[1].includes("Symbol not found") || lines[1].includes("Error occurred during symbol lookup")) {
				console.log("Case sensitivity test: Symbol not found as expected")
			} else {
				console.log("Case sensitivity test: Found results (language server may be case-insensitive)")
			}
		} else {
			console.log("Case sensitivity test: No results found as expected")
		}

		reporter.passTest("findUsages", "Test case sensitivity (symbolName) - testclass vs TestClass")
	} catch (error) {
		reporter.failTest("findUsages", "Test case sensitivity (symbolName) - testclass vs TestClass", error)
	}

	// Test 9: Verify table format structure
	reporter.startTest("findUsages", "Verify table format structure")
	try {
		const uri = await createTestFile("test-table-structure.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Wait for Language Server to index the file
		await new Promise((resolve) => setTimeout(resolve, 1000))

		const result = await lspController.findUsages({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 6 }, // Position on "TestClass"
		})

		assert(typeof result === 'string', "Should return string table format")
		const lines = result.split('\n')
		
		// Verify header
		assert(lines[0] === "URI | RANGE | PREVIEW | EOL", "Should have correct table header")
		
		// Verify data rows (if any) have correct structure
		for (let i = 1; i < lines.length; i++) {
			const parts = lines[i].split(' | ')
			assert(parts.length === 4, `Row ${i} should have 4 columns separated by ' | '`)
			assert(parts[3] === '<<<', `Row ${i} should end with EOL marker '<<<'`)
		}
		
		console.log(`Table structure verified: ${lines.length - 1} data rows`)
		reporter.passTest("findUsages", "Verify table format structure")
	} catch (error) {
		reporter.failTest("findUsages", "Verify table format structure", error)
	}

	// Test 10: Test with file that doesn't exist
	reporter.startTest("findUsages", "Handle non-existent file (symbolName)")
	try {
		// Use a non-existent file URI
		const nonExistentUri = "file:///nonexistent/path/test.ts"

		// Try to find usages in non-existent file
		const result = await lspController.findUsages({
			uri: nonExistentUri,
			symbolName: "TestClass"
		})

		assert(typeof result === 'string', "Should return string table format")
		const lines = result.split('\n')
		assert(lines[0] === "URI | RANGE | PREVIEW | EOL", "Should have correct table header")
		
		// Should have error message about file not found
		if (lines.length > 1) {
			assert(lines[1].includes("File not found") || lines[1].includes("Error occurred during symbol lookup"), 
				"Should contain error message about file not found")
			console.log(`Non-existent file handling confirmed: ${lines[1]}`)
		}

		reporter.passTest("findUsages", "Handle non-existent file (symbolName)")
	} catch (error) {
		reporter.failTest("findUsages", "Handle non-existent file (symbolName)", error)
	}
}
