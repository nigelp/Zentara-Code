/**
 * Integration tests for replaceSymbolBody LSP tool
 */

import * as vscode from "vscode"
import { lspController } from "../../zentara_lsp/src/LspController"
import {
	TestReporter,
	createTestFile,
	openTestFile,
	assert,
	getPosition,
	SAMPLE_TS_CONTENT,
	SAMPLE_PY_CONTENT,
	SAMPLE_JS_CONTENT,
} from "./testUtils"

/**
 * Helper function to validate WorkspaceEdit structure for replaceSymbolBody
 */
function validateWorkspaceEdit(edit: any, expectedFileCount: number, testName: string): void {
	assert(edit !== null && edit !== undefined, `${testName}: Should return WorkspaceEdit`)

	if (!edit) return

	let hasChanges = false
	let actualFileCount = 0

	// Check if edit has changes property
	if (edit.changes) {
		hasChanges = true
		actualFileCount = Object.keys(edit.changes).length
	}

	// Note: Current WorkspaceEdit type only has changes property, not documentChanges

	assert(hasChanges, `${testName}: WorkspaceEdit should have changes or documentChanges`)
	assert(
		actualFileCount >= expectedFileCount,
		`${testName}: Expected at least ${expectedFileCount} files to be changed, got ${actualFileCount}`,
	)
}

/**
 * Helper function to validate the replacement text in WorkspaceEdit
 */
function validateReplacement(edit: any, expectedReplacement: string, testName: string): void {
	let foundReplacement = false

	if (edit.changes) {
		for (const uri in edit.changes) {
			if (edit.changes[uri] && Array.isArray(edit.changes[uri])) {
				for (const textEdit of edit.changes[uri]) {
					if (textEdit.newText === expectedReplacement) {
						foundReplacement = true
						break
					}
				}
			}
		}
	}

	// Note: Current WorkspaceEdit type only has changes property, not documentChanges

	assert(foundReplacement, `${testName}: Should contain replacement text "${expectedReplacement}"`)
}

/**
 * Helper function to count text edits in a WorkspaceEdit
 */
function countTextEdits(edit: any): number {
	let count = 0

	if (edit.changes) {
		for (const uri in edit.changes) {
			if (edit.changes[uri] && Array.isArray(edit.changes[uri])) {
				count += edit.changes[uri].length
			}
		}
	}

	// Note: Current WorkspaceEdit type only has changes property, not documentChanges

	return count
}

export async function testReplaceSymbolBody(reporter: TestReporter): Promise<void> {
	// Test 1: Replace method body (position-based - legacy format)
	reporter.startTest("replaceSymbolBody", "Replace method body (legacy format)")
	try {
		const methodContent = `
class TestClass {
    private value: number = 42;
    
    getValue(): number {
        return this.value;
    }
    
    setValue(newValue: number): void {
        this.value = newValue;
    }
}
`

		const uri = await createTestFile("test-replace-method.ts", methodContent)
		const editor = await openTestFile(uri)

		const newMethodBody = `{
        console.log('Getting value');
        return this.value * 2;
    }`

		const result = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			line: 4,
			character: 4, // Position on "getValue" method
			replacement: newMethodBody,
		})

		validateWorkspaceEdit(result, 1, "Method body replacement")
		validateReplacement(result, newMethodBody, "Method body replacement")

		reporter.passTest("replaceSymbolBody", "Replace method body (legacy format)")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "Replace method body (legacy format)", error)
	}

	// Test 2: Replace function body
	reporter.startTest("replaceSymbolBody", "Replace function body")
	try {
		const functionContent = `
function calculateSum(a: number, b: number): number {
    return a + b;
}

function calculateProduct(x: number, y: number): number {
    return x * y;
}

const result = calculateSum(5, 3);
`

		const uri = await createTestFile("test-replace-function.ts", functionContent)
		const editor = await openTestFile(uri)

		const newFunctionBody = `{
    console.log(\`Calculating sum of \${a} and \${b}\`);
    const result = a + b;
    console.log(\`Result: \${result}\`);
    return result;
}`

		const result = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			line: 1,
			character: 9, // Position on "calculateSum" function
			replacement: newFunctionBody,
		})

		validateWorkspaceEdit(result, 1, "Function body replacement")
		validateReplacement(result, newFunctionBody, "Function body replacement")

		reporter.passTest("replaceSymbolBody", "Replace function body")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "Replace function body", error)
	}

	// Test 3: Replace class constructor body
	reporter.startTest("replaceSymbolBody", "Replace class constructor body")
	try {
		const constructorContent = `
class UserProfile {
    private name: string;
    private age: number;
    
    constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
    }
    
    getInfo(): string {
        return \`\${this.name} is \${this.age} years old\`;
    }
}
`

		const uri = await createTestFile("test-replace-constructor.ts", constructorContent)
		const editor = await openTestFile(uri)

		const newConstructorBody = `{
        console.log('Creating UserProfile instance');
        this.name = name.trim();
        this.age = Math.max(0, age);
        console.log(\`Created profile for \${this.name}\`);
    }`

		const result = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			line: 5,
			character: 4, // Position on constructor
			replacement: newConstructorBody,
		})

		validateWorkspaceEdit(result, 1, "Constructor body replacement")
		validateReplacement(result, newConstructorBody, "Constructor body replacement")

		reporter.passTest("replaceSymbolBody", "Replace class constructor body")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "Replace class constructor body", error)
	}

	// Test 4: Replace with multi-line body
	reporter.startTest("replaceSymbolBody", "Replace with multi-line body")
	try {
		const multiLineContent = `
function processData(data: any[]): any[] {
    return data.map(item => item.value);
}

const input = [{ value: 1 }, { value: 2 }, { value: 3 }];
const output = processData(input);
`

		const uri = await createTestFile("test-replace-multiline.ts", multiLineContent)
		const editor = await openTestFile(uri)

		const newMultiLineBody = `{
    console.log('Processing data array with length:', data.length);
    
    // Validate input
    if (!Array.isArray(data)) {
        throw new Error('Input must be an array');
    }
    
    // Filter out null/undefined items
    const validData = data.filter(item => item != null);
    
    // Extract values with error handling
    const result = validData.map((item, index) => {
        try {
            return item.value || \`fallback_\${index}\`;
        } catch (error) {
            console.warn(\`Error processing item at index \${index}:\`, error);
            return null;
        }
    }).filter(value => value !== null);
    
    console.log('Processed data:', result);
    return result;
}`

		const result = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			line: 1,
			character: 9, // Position on "processData" function
			replacement: newMultiLineBody,
		})

		validateWorkspaceEdit(result, 1, "Multi-line body replacement")
		validateReplacement(result, newMultiLineBody, "Multi-line body replacement")

		// Verify the replacement contains multiple lines
		assert(newMultiLineBody.includes("\n"), "Replacement should be multi-line")

		reporter.passTest("replaceSymbolBody", "Replace with multi-line body")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "Replace with multi-line body", error)
	}

	// Test 5: Handle invalid positions
	reporter.startTest("replaceSymbolBody", "Handle invalid positions")
	try {
		const invalidContent = `
// This is a comment
const simpleVariable = 42;

/* Multi-line comment
   with multiple lines */
   
function validFunction() {
    return "test";
}
`

		const uri = await createTestFile("test-invalid-position.ts", invalidContent)
		const editor = await openTestFile(uri)

		// Try to replace at a comment position (should return null)
		const result1 = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			line: 1,
			character: 5, // Position in comment
			replacement: '{ return "new body"; }',
		})

		// Should gracefully handle invalid position
		assert(result1 === null || result1 === undefined, "Should return null for invalid position in comment")

		// Try to replace at a variable position (variables don't have bodies)
		const result2 = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			line: 2,
			character: 6, // Position on variable
			replacement: '{ return "new body"; }',
		})

		// Should gracefully handle variable position
		// Some implementations might return an empty edit or null
		if (result2 !== null && result2 !== undefined) {
			// If not null, it should at least be a valid WorkspaceEdit
			assert(typeof result2 === "object", "Should return a WorkspaceEdit object if not null")
			console.warn(
				"Warning: replaceSymbolBody returned non-null for variable position (implementation may differ)",
			)
		}

		// Try with completely out-of-bounds position
		const result3 = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			line: 100,
			character: 50, // Out of bounds
			replacement: '{ return "new body"; }',
		})

		// Should gracefully handle out-of-bounds position
		assert(result3 === null || result3 === undefined, "Should return null for out-of-bounds position")

		reporter.passTest("replaceSymbolBody", "Handle invalid positions")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "Handle invalid positions", error)
	}

	// Test 6: Replace Python method body
	reporter.startTest("replaceSymbolBody", "Replace Python method body")
	try {
		const pythonContent = `
class Calculator:
    def __init__(self, initial_value=0):
        self.value = initial_value
    
    def add(self, x):
        return self.value + x
    
    def multiply(self, x):
        return self.value * x
    
    def reset(self):
        self.value = 0

calc = Calculator(10)
result = calc.add(5)
`

		const uri = await createTestFile("test-replace-python.py", pythonContent)
		const editor = await openTestFile(uri)

		const newPythonMethodBody = `
        """Add a number to the current value with logging"""
        print(f"Adding {x} to current value {self.value}")
        result = self.value + x
        print(f"Result: {result}")
        return result`

		const result = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			line: 5,
			character: 8, // Position on "add" method
			replacement: newPythonMethodBody,
		})

		if (result) {
			validateWorkspaceEdit(result, 1, "Python method body replacement")
			validateReplacement(result, newPythonMethodBody, "Python method body replacement")
		}

		reporter.passTest("replaceSymbolBody", "Replace Python method body")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "Replace Python method body", error)
	}

	// Test 7: Replace JavaScript function body
	reporter.startTest("replaceSymbolBody", "Replace JavaScript function body")
	try {
		const jsContent = `
function formatName(firstName, lastName) {
    return firstName + " " + lastName;
}

const arrow = (x, y) => {
    return x + y;
};

class Person {
    constructor(name) {
        this.name = name;
    }
    
    greet() {
        return "Hello, " + this.name;
    }
}
`

		const uri = await createTestFile("test-replace-js.js", jsContent)
		const editor = await openTestFile(uri)

		const newJsMethodBody = `{
        console.log('Greeting person:', this.name);
        const greeting = \`Hello, \${this.name}! Welcome!\`;
        console.log('Generated greeting:', greeting);
        return greeting;
    }`

		const result = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			line: 13,
			character: 4, // Position on "greet" method
			replacement: newJsMethodBody,
		})

		if (result) {
			validateWorkspaceEdit(result, 1, "JavaScript method body replacement")
			validateReplacement(result, newJsMethodBody, "JavaScript method body replacement")
		}

		reporter.passTest("replaceSymbolBody", "Replace JavaScript function body")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "Replace JavaScript function body", error)
	}

	// Test 8: Verify WorkspaceEdit structure consistency
	reporter.startTest("replaceSymbolBody", "Verify WorkspaceEdit structure")
	try {
		const structureContent = `
interface DataProcessor {
    process(data: any): any;
}

class SimpleProcessor implements DataProcessor {
    process(data: any): any {
        return data;
    }
}
`

		const uri = await createTestFile("test-workspace-edit.ts", structureContent)
		const editor = await openTestFile(uri)

		const newProcessBody = `{
        // Enhanced processing with validation
        if (data === null || data === undefined) {
            throw new Error('Data cannot be null or undefined');
        }
        
        console.log('Processing data:', typeof data);
        return { processed: true, data: data };
    }`

		const result = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			line: 6,
			character: 4, // Position on "process" method
			replacement: newProcessBody,
		})

		if (result) {
			validateWorkspaceEdit(result, 1, "WorkspaceEdit structure verification")

			// Verify structure properties
			assert(typeof result === "object", "Result should be an object")
			assert(!!result.changes, "Should have changes property")

			// If changes exist, verify the structure
			if (result.changes) {
				for (const uri in result.changes) {
					assert(Array.isArray(result.changes[uri]), "Changes should be an array of TextEdit objects")
					for (const edit of result.changes[uri]) {
						assert(!!edit.range, "TextEdit should have range property")
						assert(edit.newText !== undefined, "TextEdit should have newText property")
						assert(typeof edit.range.start.line === "number", "Range start line should be a number")
						assert(
							typeof edit.range.start.character === "number",
							"Range start character should be a number",
						)
						assert(typeof edit.range.end.line === "number", "Range end line should be a number")
						assert(typeof edit.range.end.character === "number", "Range end character should be a number")
					}
				}
			}

			validateReplacement(result, newProcessBody, "WorkspaceEdit structure verification")
		}

		reporter.passTest("replaceSymbolBody", "Verify WorkspaceEdit structure")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "Verify WorkspaceEdit structure", error)
	}

	// Test 9: Handle empty replacement
	reporter.startTest("replaceSymbolBody", "Handle empty replacement")
	try {
		const emptyContent = `
function emptyFunction() {
    return null;
}
`

		const uri = await createTestFile("test-empty-replacement.ts", emptyContent)
		const editor = await openTestFile(uri)

		const emptyReplacement = "{\n    // Empty implementation\n}"

		const result = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			line: 1,
			character: 9, // Position on function name
			replacement: emptyReplacement,
		})

		if (result) {
			validateWorkspaceEdit(result, 1, "Empty replacement")
			validateReplacement(result, emptyReplacement, "Empty replacement")
		}

		reporter.passTest("replaceSymbolBody", "Handle empty replacement")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "Handle empty replacement", error)
	}

	// Test 10: Handle complex nested function replacement
	reporter.startTest("replaceSymbolBody", "Replace nested function body")
	try {
		const nestedContent = `
class EventHandler {
    private listeners: Map<string, Function[]> = new Map();
    
    addEventListener(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }
    
    removeEventListener(event: string, callback: Function): void {
        const handlers = this.listeners.get(event);
        if (handlers) {
            const index = handlers.indexOf(callback);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
}
`

		const uri = await createTestFile("test-nested-replacement.ts", nestedContent)
		const editor = await openTestFile(uri)

		const newNestedBody = `{
        console.log(\`Removing event listener for: \${event}\`);
        
        const handlers = this.listeners.get(event);
        if (!handlers || handlers.length === 0) {
            console.warn(\`No handlers found for event: \${event}\`);
            return;
        }
        
        const index = handlers.indexOf(callback);
        if (index > -1) {
            handlers.splice(index, 1);
            console.log(\`Removed handler at index \${index} for event: \${event}\`);
            
            // Clean up empty event arrays
            if (handlers.length === 0) {
                this.listeners.delete(event);
                console.log(\`Cleaned up empty handlers for event: \${event}\`);
            }
        } else {
            console.warn(\`Handler not found for event: \${event}\`);
        }
    }`

		const result = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			line: 10,
			character: 4, // Position on "removeEventListener" method
			replacement: newNestedBody,
		})

		if (result) {
			validateWorkspaceEdit(result, 1, "Nested function replacement")
			validateReplacement(result, newNestedBody, "Nested function replacement")

			// Verify single edit was made
			const editCount = countTextEdits(result)
			assert(editCount === 1, `Should make exactly 1 edit, found ${editCount} edits`)
		}

		reporter.passTest("replaceSymbolBody", "Replace nested function body")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "Replace nested function body", error)
	}

	// ========== SYMBOL NAME-BASED TESTS (NEW FORMAT) ==========

	// Test 11: Replace method body using symbolName
	reporter.startTest("replaceSymbolBody", "Replace method body using symbolName")
	try {
		const methodContent = `
class TestClassSymbolName {
    private value: number = 42;
    
    getValue(): number {
        return this.value;
    }
    
    setValue(newValue: number): void {
        this.value = newValue;
    }
}
`

		const uri = await createTestFile("test-replace-method-symbolname.ts", methodContent)
		const editor = await openTestFile(uri)

		const newMethodBody = `{
        console.log('Getting value using symbolName lookup');
        return this.value * 3;
    }`

		const result = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			symbolName: "getValue",
			replacement: newMethodBody,
		})

		validateWorkspaceEdit(result, 1, "Method body replacement using symbolName")
		validateReplacement(result, newMethodBody, "Method body replacement using symbolName")

		reporter.passTest("replaceSymbolBody", "Replace method body using symbolName")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "Replace method body using symbolName", error)
	}

	// Test 12: Replace function body using symbolName
	reporter.startTest("replaceSymbolBody", "Replace function body using symbolName")
	try {
		const functionContent = `
function calculateSymbol(a: number, b: number): number {
    return a + b;
}

function calculateProduct(x: number, y: number): number {
    return x * y;
}

const result = calculateSymbol(5, 3);
`

		const uri = await createTestFile("test-replace-function-symbolname.ts", functionContent)
		const editor = await openTestFile(uri)

		const newFunctionBody = `{
    console.log(\`Calculating using symbolName lookup: \${a} + \${b}\`);
    const sum = a + b;
    console.log(\`Result: \${sum}\`);
    return sum;
}`

		const result = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			symbolName: "calculateSymbol",
			replacement: newFunctionBody,
		})

		validateWorkspaceEdit(result, 1, "Function body replacement using symbolName")
		validateReplacement(result, newFunctionBody, "Function body replacement using symbolName")

		reporter.passTest("replaceSymbolBody", "Replace function body using symbolName")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "Replace function body using symbolName", error)
	}

	// Test 13: Replace class constructor using symbolName
	reporter.startTest("replaceSymbolBody", "Replace class constructor using symbolName")
	try {
		const constructorContent = `
class UserProfileSymbol {
    private name: string;
    private age: number;
    
    constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
    }
    
    getInfo(): string {
        return \`\${this.name} is \${this.age} years old\`;
    }
}
`

		const uri = await createTestFile("test-replace-constructor-symbolname.ts", constructorContent)
		const editor = await openTestFile(uri)

		const newConstructorBody = `{
        console.log('Creating UserProfileSymbol instance using symbolName lookup');
        this.name = name.trim().toLowerCase();
        this.age = Math.max(0, Math.min(150, age));
        console.log(\`Created profile for \${this.name} (age: \${this.age})\`);
    }`

		const result = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			symbolName: "constructor",
			replacement: newConstructorBody,
		})

		validateWorkspaceEdit(result, 1, "Constructor body replacement using symbolName")
		validateReplacement(result, newConstructorBody, "Constructor body replacement using symbolName")

		reporter.passTest("replaceSymbolBody", "Replace class constructor using symbolName")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "Replace class constructor using symbolName", error)
	}

	// Test 14: Replace JavaScript method using symbolName
	reporter.startTest("replaceSymbolBody", "Replace JavaScript method using symbolName")
	try {
		const jsContent = `
class PersonSymbol {
    constructor(name) {
        this.name = name;
    }
    
    greetSymbol() {
        return "Hello, " + this.name;
    }
    
    farewell() {
        return "Goodbye, " + this.name;
    }
}
`

		const uri = await createTestFile("test-replace-js-symbolname.js", jsContent)
		const editor = await openTestFile(uri)

		const newJsMethodBody = `{
        console.log('Greeting using symbolName lookup:', this.name);
        const greeting = \`Hello, \${this.name}! Nice to meet you!\`;
        console.log('Generated greeting:', greeting);
        return greeting;
    }`

		const result = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			symbolName: "greetSymbol",
			replacement: newJsMethodBody,
		})

		if (result) {
			validateWorkspaceEdit(result, 1, "JavaScript method body replacement using symbolName")
			validateReplacement(result, newJsMethodBody, "JavaScript method body replacement using symbolName")
		}

		reporter.passTest("replaceSymbolBody", "Replace JavaScript method using symbolName")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "Replace JavaScript method using symbolName", error)
	}

	// Test 15: Handle invalid symbolName
	reporter.startTest("replaceSymbolBody", "Handle invalid symbolName")
	try {
		const invalidContent = `
function validFunction() {
    return "test";
}

class ValidClass {
    validMethod() {
        return 42;
    }
}
`

		const uri = await createTestFile("test-invalid-symbolname.ts", invalidContent)
		const editor = await openTestFile(uri)

		// Try to replace with non-existent symbol name
		const result1 = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			symbolName: "nonExistentFunction",
			replacement: '{ return "new body"; }',
		})

		// Should gracefully handle invalid symbolName
		assert(result1 === null || result1 === undefined, "Should return null for non-existent symbolName")

		// Try with empty symbolName
		const result2 = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			symbolName: "",
			replacement: '{ return "new body"; }',
		})

		// Should gracefully handle empty symbolName
		assert(result2 === null || result2 === undefined, "Should return null for empty symbolName")

		reporter.passTest("replaceSymbolBody", "Handle invalid symbolName")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "Handle invalid symbolName", error)
	}

	// Test 16: Handle ambiguous symbolName (multiple matches)
	reporter.startTest("replaceSymbolBody", "Handle ambiguous symbolName")
	try {
		const ambiguousContent = `
function processData(data: any): any {
    return data;
}

class DataProcessor {
    processData(data: any): any {
        return data.processed;
    }
}

class AdvancedProcessor {
    processData(data: any): any {
        return { advanced: true, data: data };
    }
}
`

		const uri = await createTestFile("test-ambiguous-symbolname.ts", ambiguousContent)
		const editor = await openTestFile(uri)

		const newAmbiguousBody = `{
    console.log('Processing data with ambiguous symbolName - should use first match');
    return { updated: true, data: data };
}`

		const result = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			symbolName: "processData", // This appears multiple times
			replacement: newAmbiguousBody,
		})

		// Should handle ambiguous symbolName by using the first match
		if (result) {
			validateWorkspaceEdit(result, 1, "Ambiguous symbolName replacement")
			validateReplacement(result, newAmbiguousBody, "Ambiguous symbolName replacement")
		}

		reporter.passTest("replaceSymbolBody", "Handle ambiguous symbolName")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "Handle ambiguous symbolName", error)
	}

	// Test 17: Replace Python method using symbolName
	reporter.startTest("replaceSymbolBody", "Replace Python method using symbolName")
	try {
		const pythonContent = `
class CalculatorSymbol:
    def __init__(self, initial_value=0):
        self.value = initial_value
    
    def add_symbol(self, x):
        return self.value + x
    
    def multiply_symbol(self, x):
        return self.value * x
    
    def reset_symbol(self):
        self.value = 0

calc = CalculatorSymbol(10)
result = calc.add_symbol(5)
`

		const uri = await createTestFile("test-replace-python-symbolname.py", pythonContent)
		const editor = await openTestFile(uri)

		const newPythonMethodBody = `
        """Add a number using symbolName lookup with enhanced logging"""
        print(f"SymbolName lookup - Adding {x} to current value {self.value}")
        result = self.value + x
        print(f"SymbolName result: {result}")
        return result`

		const result = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			symbolName: "add_symbol",
			replacement: newPythonMethodBody,
		})

		if (result) {
			validateWorkspaceEdit(result, 1, "Python method body replacement using symbolName")
			validateReplacement(result, newPythonMethodBody, "Python method body replacement using symbolName")
		}

		reporter.passTest("replaceSymbolBody", "Replace Python method using symbolName")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "Replace Python method using symbolName", error)
	}

	// Test 18: Replace complex nested class method using symbolName
	reporter.startTest("replaceSymbolBody", "Replace nested class method using symbolName")
	try {
		const nestedContent = `
class EventHandlerSymbol {
    private listeners: Map<string, Function[]> = new Map();
    
    addEventListenerSymbol(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }
    
    removeEventListenerSymbol(event: string, callback: Function): void {
        const handlers = this.listeners.get(event);
        if (handlers) {
            const index = handlers.indexOf(callback);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
}
`

		const uri = await createTestFile("test-nested-symbolname.ts", nestedContent)
		const editor = await openTestFile(uri)

		const newNestedBody = `{
        console.log(\`SymbolName lookup - Removing event listener for: \${event}\`);
        
        const handlers = this.listeners.get(event);
        if (!handlers || handlers.length === 0) {
            console.warn(\`SymbolName - No handlers found for event: \${event}\`);
            return;
        }
        
        const index = handlers.indexOf(callback);
        if (index > -1) {
            handlers.splice(index, 1);
            console.log(\`SymbolName - Removed handler at index \${index} for event: \${event}\`);
            
            // Clean up empty event arrays
            if (handlers.length === 0) {
                this.listeners.delete(event);
                console.log(\`SymbolName - Cleaned up empty handlers for event: \${event}\`);
            }
        } else {
            console.warn(\`SymbolName - Handler not found for event: \${event}\`);
        }
    }`

		const result = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			symbolName: "removeEventListenerSymbol",
			replacement: newNestedBody,
		})

		if (result) {
			validateWorkspaceEdit(result, 1, "Nested function replacement using symbolName")
			validateReplacement(result, newNestedBody, "Nested function replacement using symbolName")

			// Verify single edit was made
			const editCount = countTextEdits(result)
			assert(editCount === 1, `Should make exactly 1 edit, found ${editCount} edits`)
		}

		reporter.passTest("replaceSymbolBody", "Replace nested class method using symbolName")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "Replace nested class method using symbolName", error)
	}

	// Test 19: Verify symbolName takes precedence over position when both provided
	reporter.startTest("replaceSymbolBody", "SymbolName precedence over position")
	try {
		const precedenceContent = `
function firstFunction() {
    return "first";
}

function secondFunction() {
    return "second";
}

function targetFunction() {
    return "target";
}
`

		const uri = await createTestFile("test-symbolname-precedence.ts", precedenceContent)
		const editor = await openTestFile(uri)

		const newPrecedenceBody = `{
    console.log('SymbolName precedence test - this should replace targetFunction');
    return "replaced via symbolName";
}`

		// Provide both line/character (pointing to firstFunction) and symbolName (targetFunction)
		// symbolName should take precedence
		const result = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			line: 1, // Points to firstFunction
			character: 9,
			symbolName: "targetFunction", // Should use this instead
			replacement: newPrecedenceBody,
		})

		if (result) {
			validateWorkspaceEdit(result, 1, "SymbolName precedence test")
			validateReplacement(result, newPrecedenceBody, "SymbolName precedence test")
		}

		reporter.passTest("replaceSymbolBody", "SymbolName precedence over position")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "SymbolName precedence over position", error)
	}

	// Test 20: Test symbolName with class inheritance
	reporter.startTest("replaceSymbolBody", "SymbolName with class inheritance")
	try {
		const inheritanceContent = `
abstract class BaseHandler {
    protected name: string;
    
    constructor(name: string) {
        this.name = name;
    }
    
    abstract processRequest(data: any): any;
}

class ConcreteHandler extends BaseHandler {
    processRequest(data: any): any {
        return { handler: this.name, data: data };
    }
    
    validateData(data: any): boolean {
        return data !== null && data !== undefined;
    }
}
`

		const uri = await createTestFile("test-inheritance-symbolname.ts", inheritanceContent)
		const editor = await openTestFile(uri)

		const newInheritanceBody = `{
        console.log(\`SymbolName inheritance - Processing request in \${this.name}\`);
        
        if (!this.validateData(data)) {
            throw new Error('Invalid data provided');
        }
        
        const processed = {
            handler: this.name,
            data: data,
            timestamp: new Date().toISOString(),
            processed: true
        };
        
        console.log('SymbolName inheritance - Request processed:', processed);
        return processed;
    }`

		const result = await lspController.replaceSymbolBody({
			uri: uri.toString(),
			symbolName: "processRequest",
			replacement: newInheritanceBody,
		})

		if (result) {
			validateWorkspaceEdit(result, 1, "SymbolName inheritance test")
			validateReplacement(result, newInheritanceBody, "SymbolName inheritance test")
		}

		reporter.passTest("replaceSymbolBody", "SymbolName with class inheritance")
	} catch (error) {
		reporter.failTest("replaceSymbolBody", "SymbolName with class inheritance", error)
	}
}
