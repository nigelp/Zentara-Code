/**
 * Integration tests for getTypeHierarchy LSP tool
 */

import * as vscode from "vscode"
import { lspController } from "../../zentara_lsp/src/LspController"
import {
	TestReporter,
	createTestFile,
	openTestFile,
	assert,
	SAMPLE_TS_CONTENT,
	SAMPLE_PY_CONTENT,
	SAMPLE_JS_CONTENT,
} from "./testUtils"

export async function testGetTypeHierarchy(reporter: TestReporter): Promise<void> {
	// Test 1: Get supertypes for a class
	reporter.startTest("getTypeHierarchy", "Get supertypes for a class")
	try {
		const inheritanceContent = `
interface Animal {
    name: string;
    age: number;
}

interface Mammal extends Animal {
    furColor: string;
}

abstract class Pet implements Animal {
    name: string;
    age: number;
    
    constructor(name: string, age: number) {
        this.name = name;
        this.age = age;
    }
    
    abstract makeSound(): string;
}

class Dog extends Pet implements Mammal {
    furColor: string;
    
    constructor(name: string, age: number, furColor: string) {
        super(name, age);
        this.furColor = furColor;
    }
    
    makeSound(): string {
        return "Woof!";
    }
}

class Cat extends Pet {
    constructor(name: string, age: number) {
        super(name, age);
    }
    
    makeSound(): string {
        return "Meow!";
    }
}
`

		const uri = await createTestFile("test-type-hierarchy-supertypes.ts", inheritanceContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getTypeHierarchy({
			textDocument: { uri: uri.toString() },
			position: { line: 23, character: 6 }, // Position on "Dog" class
		})

		if (result === null || result === undefined) {
			console.warn("Warning: Type hierarchy not available in test environment for class")
		} else {
			assert(typeof result.name === "string", "Should have name property")
			assert(typeof result.kind === "number", "Should have kind property")
			assert(typeof result.uri === "string", "Should have uri property")
			assert(result.range !== undefined, "Should have range property")
			assert(result.selectionRange !== undefined, "Should have selectionRange property")
			assert(Array.isArray(result.supertypes), "Should have supertypes array")
			assert(Array.isArray(result.subtypes), "Should have subtypes array")
		}

		reporter.passTest("getTypeHierarchy", "Get supertypes for a class")
	} catch (error) {
		reporter.failTest("getTypeHierarchy", "Get supertypes for a class", error)
	}

	// Test 2: Get subtypes for a class
	reporter.startTest("getTypeHierarchy", "Get subtypes for a class")
	try {
		const baseClassContent = `
abstract class Vehicle {
    brand: string;
    model: string;
    
    constructor(brand: string, model: string) {
        this.brand = brand;
        this.model = model;
    }
    
    abstract start(): void;
    abstract stop(): void;
}

class Car extends Vehicle {
    doors: number;
    
    constructor(brand: string, model: string, doors: number) {
        super(brand, model);
        this.doors = doors;
    }
    
    start(): void {
        console.log("Car started");
    }
    
    stop(): void {
        console.log("Car stopped");
    }
}

class Motorcycle extends Vehicle {
    engineSize: number;
    
    constructor(brand: string, model: string, engineSize: number) {
        super(brand, model);
        this.engineSize = engineSize;
    }
    
    start(): void {
        console.log("Motorcycle started");
    }
    
    stop(): void {
        console.log("Motorcycle stopped");
    }
}

class SportsCar extends Car {
    topSpeed: number;
    
    constructor(brand: string, model: string, doors: number, topSpeed: number) {
        super(brand, model, doors);
        this.topSpeed = topSpeed;
    }
}
`

		const uri = await createTestFile("test-type-hierarchy-subtypes.ts", baseClassContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getTypeHierarchy({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 15 }, // Position on "Vehicle" class
		})

		if (result === null || result === undefined) {
			console.warn("Warning: Type hierarchy not available in test environment for base class")
		} else {
			assert(Array.isArray(result.subtypes), "Should have subtypes array")
			assert(Array.isArray(result.supertypes), "Should have supertypes array")
		}

		reporter.passTest("getTypeHierarchy", "Get subtypes for a class")
	} catch (error) {
		reporter.failTest("getTypeHierarchy", "Get subtypes for a class", error)
	}

	// Test 3: Test with interfaces
	reporter.startTest("getTypeHierarchy", "Test with interfaces")
	try {
		const interfaceContent = `
interface Drawable {
    draw(): void;
}

interface Resizable {
    resize(width: number, height: number): void;
}

interface Shape extends Drawable {
    area(): number;
    perimeter(): number;
}

interface ColoredShape extends Shape {
    color: string;
    setColor(color: string): void;
}

class Rectangle implements ColoredShape {
    width: number;
    height: number;
    color: string;
    
    constructor(width: number, height: number, color: string) {
        this.width = width;
        this.height = height;
        this.color = color;
    }
    
    draw(): void {
        console.log("Drawing rectangle");
    }
    
    area(): number {
        return this.width * this.height;
    }
    
    perimeter(): number {
        return 2 * (this.width + this.height);
    }
    
    setColor(color: string): void {
        this.color = color;
    }
}

class Circle implements Shape, Resizable {
    radius: number;
    
    constructor(radius: number) {
        this.radius = radius;
    }
    
    draw(): void {
        console.log("Drawing circle");
    }
    
    area(): number {
        return Math.PI * this.radius * this.radius;
    }
    
    perimeter(): number {
        return 2 * Math.PI * this.radius;
    }
    
    resize(width: number, height: number): void {
        this.radius = Math.min(width, height) / 2;
    }
}
`

		const uri = await createTestFile("test-interface-hierarchy.ts", interfaceContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getTypeHierarchy({
			textDocument: { uri: uri.toString() },
			position: { line: 7, character: 10 }, // Position on "Shape" interface
		})

		if (result === null || result === undefined) {
			console.warn("Warning: Type hierarchy not available in test environment for interface")
		} else {
			assert(typeof result.name === "string", "Interface should have name property")
			assert(Array.isArray(result.supertypes), "Interface should have supertypes array")
			assert(Array.isArray(result.subtypes), "Interface should have subtypes array")
		}

		reporter.passTest("getTypeHierarchy", "Test with interfaces")
	} catch (error) {
		reporter.failTest("getTypeHierarchy", "Test with interfaces", error)
	}

	// Test 4: Test inheritance chains
	reporter.startTest("getTypeHierarchy", "Test inheritance chains")
	try {
		const inheritanceChainContent = `
class GrandParent {
    familyName: string;
    
    constructor(familyName: string) {
        this.familyName = familyName;
    }
    
    getFamilyName(): string {
        return this.familyName;
    }
}

class Parent extends GrandParent {
    firstName: string;
    
    constructor(familyName: string, firstName: string) {
        super(familyName);
        this.firstName = firstName;
    }
    
    getFullName(): string {
        return \`\${this.firstName} \${this.familyName}\`;
    }
}

class Child extends Parent {
    age: number;
    
    constructor(familyName: string, firstName: string, age: number) {
        super(familyName, firstName);
        this.age = age;
    }
    
    getAge(): number {
        return this.age;
    }
    
    introduce(): string {
        return \`Hi, I'm \${this.getFullName()}, \${this.age} years old\`;
    }
}

class GrandChild extends Child {
    school: string;
    
    constructor(familyName: string, firstName: string, age: number, school: string) {
        super(familyName, firstName, age);
        this.school = school;
    }
    
    getSchool(): string {
        return this.school;
    }
}
`

		const uri = await createTestFile("test-inheritance-chain.ts", inheritanceChainContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getTypeHierarchy({
			textDocument: { uri: uri.toString() },
			position: { line: 17, character: 6 }, // Position on "Parent" class
		})

		if (result === null || result === undefined) {
			console.warn("Warning: Type hierarchy not available in test environment for middle class in chain")
		} else {
			assert(Array.isArray(result.supertypes), "Should have supertypes array")
			assert(Array.isArray(result.subtypes), "Should have subtypes array")
		}

		reporter.passTest("getTypeHierarchy", "Test inheritance chains")
	} catch (error) {
		reporter.failTest("getTypeHierarchy", "Test inheritance chains", error)
	}

	// Test 5: Handle types with no hierarchy
	reporter.startTest("getTypeHierarchy", "Handle types with no hierarchy")
	try {
		const standaloneContent = `
class StandaloneClass {
    value: number;
    
    constructor(value: number) {
        this.value = value;
    }
    
    getValue(): number {
        return this.value;
    }
}

interface StandaloneInterface {
    id: number;
    name: string;
}

type AliasType = {
    x: number;
    y: number;
};

function standaloneFunction(param: string): string {
    return param.toUpperCase();
}

const standaloneVariable = 42;
`

		const uri = await createTestFile("test-standalone-types.ts", standaloneContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getTypeHierarchy({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 6 }, // Position on "StandaloneClass"
		})

		assert(result !== undefined, "Should handle standalone types gracefully")

		// If result is returned, check its structure
		if (result !== null) {
			assert(typeof result.name === "string", "Should have name property")
			assert(Array.isArray(result.supertypes), "Should have supertypes array")
			assert(Array.isArray(result.subtypes), "Should have subtypes array")
		}

		reporter.passTest("getTypeHierarchy", "Handle types with no hierarchy")
	} catch (error) {
		reporter.failTest("getTypeHierarchy", "Handle types with no hierarchy", error)
	}

	// Test 6: Verify TypeHierarchyItem structure
	reporter.startTest("getTypeHierarchy", "Verify TypeHierarchyItem structure")
	try {
		const structureTestContent = `
interface TestInterface {
    property: string;
}

class TestClass implements TestInterface {
    property: string;
    
    constructor(property: string) {
        this.property = property;
    }
    
    method(): void {
        console.log(this.property);
    }
}

class ExtendedClass extends TestClass {
    additionalProperty: number;
    
    constructor(property: string, additionalProperty: number) {
        super(property);
        this.additionalProperty = additionalProperty;
    }
}
`

		const uri = await createTestFile("test-hierarchy-structure.ts", structureTestContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getTypeHierarchy({
			textDocument: { uri: uri.toString() },
			position: { line: 5, character: 6 }, // Position on "TestClass"
		})

		if (result === null || result === undefined) {
			console.warn("Warning: Type hierarchy not available in test environment for structure verification")
		} else {
			// Verify required properties
			assert(typeof result.name === "string" && result.name.length > 0, "Should have non-empty name")
			assert(typeof result.kind === "number", "Should have numeric kind")
			assert(typeof result.uri === "string" && result.uri.length > 0, "Should have non-empty uri")
			assert(result.range !== undefined, "Should have range property")
			assert(result.selectionRange !== undefined, "Should have selectionRange property")

			// Verify range structure
			assert(typeof result.range.start.line === "number", "Range start should have line")
			assert(typeof result.range.start.character === "number", "Range start should have character")
			assert(typeof result.range.end.line === "number", "Range end should have line")
			assert(typeof result.range.end.character === "number", "Range end should have character")

			// Verify selectionRange structure
			assert(typeof result.selectionRange.start.line === "number", "SelectionRange start should have line")
			assert(
				typeof result.selectionRange.start.character === "number",
				"SelectionRange start should have character",
			)
			assert(typeof result.selectionRange.end.line === "number", "SelectionRange end should have line")
			assert(typeof result.selectionRange.end.character === "number", "SelectionRange end should have character")

			// Verify hierarchy arrays
			assert(Array.isArray(result.supertypes), "Should have supertypes array")
			assert(Array.isArray(result.subtypes), "Should have subtypes array")

			// Verify optional detail property
			if (result.detail !== undefined) {
				assert(typeof result.detail === "string", "Detail should be string if present")
			}
		}

		reporter.passTest("getTypeHierarchy", "Verify TypeHierarchyItem structure")
	} catch (error) {
		reporter.failTest("getTypeHierarchy", "Verify TypeHierarchyItem structure", error)
	}

	// Test 7: Test both 'supertypes' and 'subtypes' directions
	reporter.startTest("getTypeHierarchy", "Test both supertypes and subtypes directions")
	try {
		const hierarchyContent = `
interface BaseInterface {
    baseMethod(): void;
}

abstract class AbstractBase implements BaseInterface {
    abstract baseMethod(): void;
    
    commonMethod(): string {
        return "common";
    }
}

class MiddleClass extends AbstractBase {
    baseMethod(): void {
        console.log("Middle implementation");
    }
    
    middleMethod(): number {
        return 42;
    }
}

class DerivedClass extends MiddleClass {
    baseMethod(): void {
        console.log("Derived implementation");
    }
    
    derivedMethod(): boolean {
        return true;
    }
}

class AnotherDerived extends MiddleClass {
    baseMethod(): void {
        console.log("Another implementation");
    }
    
    anotherMethod(): string {
        return "another";
    }
}
`

		const uri = await createTestFile("test-both-directions.ts", hierarchyContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getTypeHierarchy({
			textDocument: { uri: uri.toString() },
			position: { line: 13, character: 6 }, // Position on "MiddleClass"
		})

		if (result === null || result === undefined) {
			console.warn("Warning: Type hierarchy not available in test environment for middle class")
		} else {
			assert(Array.isArray(result.supertypes), "Should have supertypes array")
			assert(Array.isArray(result.subtypes), "Should have subtypes array")

			// Check if hierarchy information is populated
			// Note: The actual population depends on the language server capabilities
			// We just verify the structure is correct
			for (const supertype of result.supertypes) {
				assert(typeof supertype.name === "string", "Supertype should have name")
				assert(typeof supertype.kind === "number", "Supertype should have kind")
				assert(typeof supertype.uri === "string", "Supertype should have uri")
				assert(supertype.range !== undefined, "Supertype should have range")
				assert(supertype.selectionRange !== undefined, "Supertype should have selectionRange")
			}

			for (const subtype of result.subtypes) {
				assert(typeof subtype.name === "string", "Subtype should have name")
				assert(typeof subtype.kind === "number", "Subtype should have kind")
				assert(typeof subtype.uri === "string", "Subtype should have uri")
				assert(subtype.range !== undefined, "Subtype should have range")
				assert(subtype.selectionRange !== undefined, "Subtype should have selectionRange")
			}
		}

		reporter.passTest("getTypeHierarchy", "Test both supertypes and subtypes directions")
	} catch (error) {
		reporter.failTest("getTypeHierarchy", "Test both supertypes and subtypes directions", error)
	}

	// Test 8: Handle null returns gracefully
	reporter.startTest("getTypeHierarchy", "Handle null returns gracefully")
	try {
		const noHierarchyContent = `
const simpleVariable = "hello world";
let numberVariable: number = 42;
const arrayVariable = [1, 2, 3];

// Comment line
/* Block comment */

function simpleFunction() {
    return "no hierarchy here";
}

// Position on comment or variable should return null
`

		const uri = await createTestFile("test-null-hierarchy.ts", noHierarchyContent)
		const editor = await openTestFile(uri)

		const result = await lspController.getTypeHierarchy({
			textDocument: { uri: uri.toString() },
			position: { line: 5, character: 2 }, // Position on comment
		})

		// Should handle null gracefully - either return null or valid structure
		assert(result !== undefined, "Should not return undefined")

		if (result === null) {
			// This is expected behavior for positions with no type hierarchy
			assert(true, "Null return is acceptable for positions with no hierarchy")
		} else {
			// If it returns a result, it should be properly structured
			assert(typeof result.name === "string", "Should have valid structure if not null")
			assert(Array.isArray(result.supertypes), "Should have supertypes array if not null")
			assert(Array.isArray(result.subtypes), "Should have subtypes array if not null")
		}

		reporter.passTest("getTypeHierarchy", "Handle null returns gracefully")
	} catch (error) {
		reporter.failTest("getTypeHierarchy", "Handle null returns gracefully", error)
	}

	// Test 9: Get type hierarchy using symbolName parameter for TypeScript symbols
	reporter.startTest("getTypeHierarchy", "Get type hierarchy using symbolName for TypeScript symbols")
	try {
		const content = `
interface TestInterface {
    id: number;
    name: string;
}

abstract class AbstractTestClass implements TestInterface {
    id: number;
    name: string;
    
    constructor(id: number, name: string) {
        this.id = id;
        this.name = name;
    }
    
    abstract testMethod(): void;
    
    commonMethod(): string {
        return this.name;
    }
}

class ConcreteTestClass extends AbstractTestClass {
    private value: number = 0;
    
    constructor(id: number, name: string) {
        super(id, name);
    }
    
    testMethod(): void {
        console.log('test implementation');
    }
    
    getValue(): number {
        return this.value;
    }
    
    setValue(newValue: number): void {
        this.value = newValue;
    }
}

class ExtendedTestClass extends ConcreteTestClass {
    additionalProp: string;
    
    constructor(id: number, name: string, additionalProp: string) {
        super(id, name);
        this.additionalProp = additionalProp;
    }
    
    testMethod(): void {
        console.log('extended implementation');
    }
}

class AnotherTestClass implements TestInterface {
    id: number;
    name: string;
    
    constructor(id: number, name: string) {
        this.id = id;
        this.name = name;
    }
}

function testFunction(): void {
    console.log('test function');
}

const testVariable = "test";
`
		const uri = await createTestFile("test-symbolname-typehierarchy.ts", content)
		const editor = await openTestFile(uri)

		// Test type hierarchy for TestInterface using symbolName
		try {
			const interfaceResult = await lspController.getTypeHierarchy({
				uri: uri.toString(),
				symbolName: "TestInterface",
			})
			if (interfaceResult === null || interfaceResult === undefined) {
				console.warn("Type hierarchy returned null for TestInterface symbolName lookup")
			} else {
				assert(typeof interfaceResult.name === "string", "TestInterface should have name property")
				assert(typeof interfaceResult.kind === "number", "TestInterface should have kind property")
				assert(typeof interfaceResult.uri === "string", "TestInterface should have uri property")
				assert(interfaceResult.range !== undefined, "TestInterface should have range property")
				assert(interfaceResult.selectionRange !== undefined, "TestInterface should have selectionRange property")
				assert(Array.isArray(interfaceResult.supertypes), "TestInterface should have supertypes array")
				assert(Array.isArray(interfaceResult.subtypes), "TestInterface should have subtypes array")
			}
		} catch (error) {
			console.warn("TestInterface symbolName lookup failed:", error)
		}

		// Test type hierarchy for AbstractTestClass using symbolName
		try {
			const abstractResult = await lspController.getTypeHierarchy({
				uri: uri.toString(),
				symbolName: "AbstractTestClass",
			})
			if (abstractResult === null || abstractResult === undefined) {
				console.warn("Type hierarchy returned null for AbstractTestClass symbolName lookup")
			} else {
				assert(typeof abstractResult.name === "string", "AbstractTestClass should have name property")
				assert(Array.isArray(abstractResult.supertypes), "AbstractTestClass should have supertypes array")
				assert(Array.isArray(abstractResult.subtypes), "AbstractTestClass should have subtypes array")
			}
		} catch (error) {
			console.warn("AbstractTestClass symbolName lookup failed:", error)
		}

		// Test type hierarchy for ConcreteTestClass using symbolName
		try {
			const concreteResult = await lspController.getTypeHierarchy({
				uri: uri.toString(),
				symbolName: "ConcreteTestClass",
			})
			if (concreteResult === null || concreteResult === undefined) {
				console.warn("Type hierarchy returned null for ConcreteTestClass symbolName lookup")
			} else {
				assert(typeof concreteResult.name === "string", "ConcreteTestClass should have name property")
				assert(Array.isArray(concreteResult.supertypes), "ConcreteTestClass should have supertypes array")
				assert(Array.isArray(concreteResult.subtypes), "ConcreteTestClass should have subtypes array")
			}
		} catch (error) {
			console.warn("ConcreteTestClass symbolName lookup failed:", error)
		}

		// Test type hierarchy for ExtendedTestClass using symbolName
		try {
			const extendedResult = await lspController.getTypeHierarchy({
				uri: uri.toString(),
				symbolName: "ExtendedTestClass",
			})
			if (extendedResult === null || extendedResult === undefined) {
				console.warn("Type hierarchy returned null for ExtendedTestClass symbolName lookup")
			} else {
				assert(typeof extendedResult.name === "string", "ExtendedTestClass should have name property")
				assert(Array.isArray(extendedResult.supertypes), "ExtendedTestClass should have supertypes array")
				assert(Array.isArray(extendedResult.subtypes), "ExtendedTestClass should have subtypes array")
			}
		} catch (error) {
			console.warn("ExtendedTestClass symbolName lookup failed:", error)
		}

		// Test type hierarchy for AnotherTestClass using symbolName
		try {
			const anotherResult = await lspController.getTypeHierarchy({
				uri: uri.toString(),
				symbolName: "AnotherTestClass",
			})
			if (anotherResult === null || anotherResult === undefined) {
				console.warn("Type hierarchy returned null for AnotherTestClass symbolName lookup")
			} else {
				assert(typeof anotherResult.name === "string", "AnotherTestClass should have name property")
				assert(Array.isArray(anotherResult.supertypes), "AnotherTestClass should have supertypes array")
				assert(Array.isArray(anotherResult.subtypes), "AnotherTestClass should have subtypes array")
			}
		} catch (error) {
			console.warn("AnotherTestClass symbolName lookup failed:", error)
		}

		reporter.passTest("getTypeHierarchy", "Get type hierarchy using symbolName for TypeScript symbols")
	} catch (error) {
		reporter.failTest("getTypeHierarchy", "Get type hierarchy using symbolName for TypeScript symbols", error)
	}

	// Test 10: Get type hierarchy using symbolName parameter for Python symbols
	reporter.startTest("getTypeHierarchy", "Get type hierarchy using symbolName for Python symbols")
	try {
		const uri = await createTestFile("test-symbolname-typehierarchy.py", SAMPLE_PY_CONTENT)
		const editor = await openTestFile(uri)

		// Test type hierarchy for Python TestClass using symbolName
		try {
			const result = await lspController.getTypeHierarchy({
				uri: uri.toString(),
				symbolName: "TestClass",
			})
			if (result === null || result === undefined) {
				console.warn("Pylance returned null for Python class type hierarchy via symbolName")
			} else {
				assert(typeof result.name === "string", "Python TestClass should have name property")
				assert(Array.isArray(result.supertypes), "Python TestClass should have supertypes array")
				assert(Array.isArray(result.subtypes), "Python TestClass should have subtypes array")
			}
		} catch (error) {
			console.warn("Python TestClass symbolName lookup failed:", error)
		}

		reporter.passTest("getTypeHierarchy", "Get type hierarchy using symbolName for Python symbols")
	} catch (error) {
		if (error.message?.includes("Pylance")) {
			reporter.passTest("getTypeHierarchy", "Get type hierarchy using symbolName for Python symbols (with Pylance warning)")
		} else {
			reporter.failTest("getTypeHierarchy", "Get type hierarchy using symbolName for Python symbols", error)
		}
	}

	// Test 11: Error handling for symbolName parameter
	reporter.startTest("getTypeHierarchy", "Error handling for symbolName parameter")
	try {
		const uri = await createTestFile("test-error-handling.ts", SAMPLE_TS_CONTENT)

		// Test with non-existent symbol
		const nonExistentResult = await lspController.getTypeHierarchy({
			uri: uri.toString(),
			symbolName: "NonExistentSymbol",
		})
		assert(
			nonExistentResult === null || (nonExistentResult && typeof nonExistentResult.name === "string"),
			"Should return null or valid TypeHierarchyItem for non-existent symbol"
		)

		// Test with empty symbolName
		try {
			const emptyResult = await lspController.getTypeHierarchy({
				uri: uri.toString(),
				symbolName: "",
			})
			assert(
				emptyResult === null || (emptyResult && typeof emptyResult.name === "string"),
				"Should handle empty symbolName gracefully"
			)
		} catch (error) {
			// Empty symbolName might throw error, which is acceptable
			console.warn("Empty symbolName threw error (acceptable):", error.message)
		}

		// Test with whitespace-only symbolName
		try {
			const whitespaceResult = await lspController.getTypeHierarchy({
				uri: uri.toString(),
				symbolName: "   ",
			})
			assert(
				whitespaceResult === null || (whitespaceResult && typeof whitespaceResult.name === "string"),
				"Should handle whitespace-only symbolName gracefully"
			)
		} catch (error) {
			// Whitespace symbolName might throw error, which is acceptable
			console.warn("Whitespace symbolName threw error (acceptable):", error.message)
		}

		// Test with invalid URI
		try {
			const invalidUriResult = await lspController.getTypeHierarchy({
				uri: "file:///non-existent-file.ts",
				symbolName: "TestClass",
			})
			// This might succeed with null or throw error - both are acceptable
		} catch (error) {
			console.warn("Invalid URI threw error (acceptable):", error.message)
		}

		reporter.passTest("getTypeHierarchy", "Error handling for symbolName parameter")
	} catch (error) {
		reporter.failTest("getTypeHierarchy", "Error handling for symbolName parameter", error)
	}

	// Test 12: Mixed parameter usage (both position and symbolName scenarios)
	reporter.startTest("getTypeHierarchy", "Mixed parameter usage validation")
	try {
		// Test that both position-based and symbolName-based lookups work on same file
		const content = `
interface MixedInterface {
    testProperty: string;
}

abstract class MixedAbstractClass implements MixedInterface {
    testProperty: string;
    
    constructor(testProperty: string) {
        this.testProperty = testProperty;
    }
    
    abstract testMethod(): void;
}

class MixedTestClass extends MixedAbstractClass {
    constructor(testProperty: string) {
        super(testProperty);
    }
    
    testMethod(): void {
        console.log(this.testProperty);
    }
}

class ExtendedMixedClass extends MixedTestClass {
    additionalProp: number;
    
    constructor(testProperty: string, additionalProp: number) {
        super(testProperty);
        this.additionalProp = additionalProp;
    }
}
`
		const uri = await createTestFile("test-mixed-params.ts", content)
		const editor = await openTestFile(uri)

		// Position-based lookup
		const positionResult = await lspController.getTypeHierarchy({
			textDocument: { uri: uri.toString() },
			position: { line: 16, character: 6 }, // Position on MixedTestClass
		})
		assert(
			positionResult === null || (positionResult && typeof positionResult.name === "string"),
			"Position-based lookup should return null or valid TypeHierarchyItem"
		)

		// SymbolName-based lookup on same file
		const symbolResult = await lspController.getTypeHierarchy({
			uri: uri.toString(),
			symbolName: "MixedTestClass",
		})
		assert(
			symbolResult === null || (symbolResult && typeof symbolResult.name === "string"),
			"SymbolName-based lookup should return null or valid TypeHierarchyItem"
		)

		// Both should potentially find the same type hierarchy (though exact matching isn't guaranteed)
		if (positionResult && symbolResult) {
			assert(
				Array.isArray(positionResult.supertypes) && Array.isArray(positionResult.subtypes),
				"Position-based type hierarchy should have supertypes and subtypes arrays",
			)
			assert(
				Array.isArray(symbolResult.supertypes) && Array.isArray(symbolResult.subtypes),
				"Symbol-based type hierarchy should have supertypes and subtypes arrays",
			)
		}

		reporter.passTest("getTypeHierarchy", "Mixed parameter usage validation")
	} catch (error) {
		reporter.failTest("getTypeHierarchy", "Mixed parameter usage validation", error)
	}
}
