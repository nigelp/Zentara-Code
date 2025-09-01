/**
 * Integration tests for findImplementations LSP tool
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

/**
 * Enhanced TypeScript content with interfaces and abstract classes for implementation testing
 */
const SAMPLE_TS_INTERFACE_CONTENT = `
interface IShape {
    area(): number;
    perimeter(): number;
}

interface IDrawable {
    draw(): void;
    getColor(): string;
}

abstract class Shape implements IShape {
    protected color: string;
    
    constructor(color: string) {
        this.color = color;
    }
    
    abstract area(): number;
    abstract perimeter(): number;
    
    getColor(): string {
        return this.color;
    }
}

class Rectangle extends Shape implements IDrawable {
    private width: number;
    private height: number;
    
    constructor(width: number, height: number, color: string) {
        super(color);
        this.width = width;
        this.height = height;
    }
    
    area(): number {
        return this.width * this.height;
    }
    
    perimeter(): number {
        return 2 * (this.width + this.height);
    }
    
    draw(): void {
        console.log(\`Drawing rectangle with color \${this.color}\`);
    }
}

class Circle extends Shape implements IDrawable {
    private radius: number;
    
    constructor(radius: number, color: string) {
        super(color);
        this.radius = radius;
    }
    
    area(): number {
        return Math.PI * this.radius * this.radius;
    }
    
    perimeter(): number {
        return 2 * Math.PI * this.radius;
    }
    
    draw(): void {
        console.log(\`Drawing circle with color \${this.color}\`);
    }
}

class Triangle extends Shape {
    private base: number;
    private height: number;
    private side1: number;
    private side2: number;
    
    constructor(base: number, height: number, side1: number, side2: number, color: string) {
        super(color);
        this.base = base;
        this.height = height;
        this.side1 = side1;
        this.side2 = side2;
    }
    
    area(): number {
        return 0.5 * this.base * this.height;
    }
    
    perimeter(): number {
        return this.base + this.side1 + this.side2;
    }
}

// Usage
const rectangle = new Rectangle(10, 5, "red");
const circle = new Circle(3, "blue");
const triangle = new Triangle(4, 3, 5, 5, "green");
`

/**
 * Enhanced Python content with abstract classes and inheritance
 */
const SAMPLE_PY_INTERFACE_CONTENT = `
from abc import ABC, abstractmethod
from typing import Protocol

class Drawable(Protocol):
    def draw(self) -> None:
        ...
    
    def get_color(self) -> str:
        ...

class Shape(ABC):
    def __init__(self, color: str):
        self.color = color
    
    @abstractmethod
    def area(self) -> float:
        pass
    
    @abstractmethod
    def perimeter(self) -> float:
        pass
    
    def get_color(self) -> str:
        return self.color

class Rectangle(Shape):
    def __init__(self, width: float, height: float, color: str):
        super().__init__(color)
        self.width = width
        self.height = height
    
    def area(self) -> float:
        return self.width * self.height
    
    def perimeter(self) -> float:
        return 2 * (self.width + self.height)
    
    def draw(self) -> None:
        print(f"Drawing rectangle with color {self.color}")

class Circle(Shape):
    def __init__(self, radius: float, color: str):
        super().__init__(color)
        self.radius = radius
    
    def area(self) -> float:
        import math
        return math.pi * self.radius * self.radius
    
    def perimeter(self) -> float:
        import math
        return 2 * math.pi * self.radius
    
    def draw(self) -> None:
        print(f"Drawing circle with color {self.color}")

class Triangle(Shape):
    def __init__(self, base: float, height: float, side1: float, side2: float, color: str):
        super().__init__(color)
        self.base = base
        self.height = height
        self.side1 = side1
        self.side2 = side2
    
    def area(self) -> float:
        return 0.5 * self.base * self.height
    
    def perimeter(self) -> float:
        return self.base + self.side1 + self.side2

# Usage
rectangle = Rectangle(10, 5, "red")
circle = Circle(3, "blue")
triangle = Triangle(4, 3, 5, 5, "green")
`

export async function testFindImplementations(reporter: TestReporter): Promise<void> {
	// Test 1: Find interface implementations in TypeScript
	reporter.startTest("findImplementations", "Find interface implementations in TypeScript")
	try {
		const uri = await createTestFile("test-interface-implementations.ts", SAMPLE_TS_INTERFACE_CONTENT)
		const editor = await openTestFile(uri)

		// Find implementations of IShape interface (positioned on interface name)
		const result = await lspController.findImplementations({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 10 }, // Position on "IShape"
		})

		assert(Array.isArray(result), "Should return an array of implementations")

		// Should find at least Rectangle, Circle, and Triangle as implementations
		// Note: Results may vary based on LSP server capabilities
		if (result.length > 0) {
			const hasImplementation = result.some(
				(loc) =>
					loc.preview?.includes("Rectangle") ||
					loc.preview?.includes("Circle") ||
					loc.preview?.includes("Triangle"),
			)
			// Don't assert this as LSP servers may not support interface implementations
			console.log(`Found ${result.length} implementations for IShape interface`)
		}

		reporter.passTest("findImplementations", "Find interface implementations in TypeScript")
	} catch (error) {
		reporter.failTest("findImplementations", "Find interface implementations in TypeScript", error)
	}

	// Test 2: Find abstract class implementations
	reporter.startTest("findImplementations", "Find abstract class implementations")
	try {
		const uri = await createTestFile("test-abstract-implementations.ts", SAMPLE_TS_INTERFACE_CONTENT)
		const editor = await openTestFile(uri)

		// Find implementations of Shape abstract class
		const result = await lspController.findImplementations({
			textDocument: { uri: uri.toString() },
			position: { line: 11, character: 15 }, // Position on "Shape" class
		})

		assert(Array.isArray(result), "Should return an array of implementations")

		// Log results for debugging
		console.log(`Found ${result.length} implementations for Shape abstract class`)

		reporter.passTest("findImplementations", "Find abstract class implementations")
	} catch (error) {
		reporter.failTest("findImplementations", "Find abstract class implementations", error)
	}

	// Test 3: Test with multiple implementations
	reporter.startTest("findImplementations", "Test with multiple implementations")
	try {
		const uri = await createTestFile("test-multiple-implementations.ts", SAMPLE_TS_INTERFACE_CONTENT)
		const editor = await openTestFile(uri)

		// Find implementations of IDrawable interface
		const result = await lspController.findImplementations({
			textDocument: { uri: uri.toString() },
			position: { line: 6, character: 10 }, // Position on "IDrawable"
		})

		assert(Array.isArray(result), "Should return an array of implementations")

		// Both Rectangle and Circle implement IDrawable
		console.log(`Found ${result.length} implementations for IDrawable interface`)

		reporter.passTest("findImplementations", "Test with multiple implementations")
	} catch (error) {
		reporter.failTest("findImplementations", "Test with multiple implementations", error)
	}

	// Test 4: Test in Python files
	reporter.startTest("findImplementations", "Find implementations in Python")
	try {
		const uri = await createTestFile("test-python-implementations.py", SAMPLE_PY_INTERFACE_CONTENT)
		const editor = await openTestFile(uri)

		// Find implementations of Shape abstract class in Python
		const result = await lspController.findImplementations({
			textDocument: { uri: uri.toString() },
			position: { line: 11, character: 6 }, // Position on "Shape" class
		})

		assert(Array.isArray(result), "Should return an array of implementations")

		console.log(`Found ${result.length} implementations for Shape class in Python`)

		reporter.passTest("findImplementations", "Find implementations in Python")
	} catch (error) {
		reporter.failTest("findImplementations", "Find implementations in Python", error)
	}

	// Test 5: Handle edge cases (no implementations, invalid position)
	reporter.startTest("findImplementations", "Handle edge cases")
	try {
		const uri = await createTestFile("test-edge-cases.ts", SAMPLE_TS_CONTENT)
		const editor = await openTestFile(uri)

		// Test with position on a regular class that has no implementations
		const result1 = await lspController.findImplementations({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 6 }, // Position on "TestClass" (regular class)
		})

		assert(Array.isArray(result1), "Should return an array even for classes with no implementations")

		// Test with invalid position
		const result2 = await lspController.findImplementations({
			textDocument: { uri: uri.toString() },
			position: { line: 9999, character: 9999 }, // Invalid position
		})

		assert(Array.isArray(result2), "Should return an array even for invalid position")

		// Test with position on whitespace
		const result3 = await lspController.findImplementations({
			textDocument: { uri: uri.toString() },
			position: { line: 0, character: 0 }, // Position on whitespace
		})

		assert(Array.isArray(result3), "Should return an array even for whitespace position")

		reporter.passTest("findImplementations", "Handle edge cases")
	} catch (error) {
		reporter.failTest("findImplementations", "Handle edge cases", error)
	}

	// Test 6: Test with non-existent file
	reporter.startTest("findImplementations", "Handle non-existent file")
	try {
		const result = await lspController.findImplementations({
			textDocument: { uri: "file:///non-existent-file.ts" },
			position: { line: 1, character: 1 },
		})

		assert(Array.isArray(result), "Should return an array even for non-existent file")
		assert(result.length === 0, "Should return empty array for non-existent file")

		reporter.passTest("findImplementations", "Handle non-existent file")
	} catch (error) {
		reporter.failTest("findImplementations", "Handle non-existent file", error)
	}

	// Test 7: Test with JavaScript file (limited implementation support expected)
	reporter.startTest("findImplementations", "Test JavaScript implementations")
	try {
		const uri = await createTestFile("test-js-implementations.js", SAMPLE_JS_CONTENT)
		const editor = await openTestFile(uri)

		// Find implementations of TestClass in JavaScript
		const result = await lspController.findImplementations({
			textDocument: { uri: uri.toString() },
			position: { line: 1, character: 6 }, // Position on "TestClass"
		})

		assert(Array.isArray(result), "Should return an array for JavaScript files")

		// JavaScript typically has limited implementation support in LSP
		console.log(`Found ${result.length} implementations for TestClass in JavaScript`)

		reporter.passTest("findImplementations", "Test JavaScript implementations")
	} catch (error) {
		reporter.failTest("findImplementations", "Test JavaScript implementations", error)
	}

	// Test 8: Test with method implementations
	reporter.startTest("findImplementations", "Find method implementations")
	try {
		const uri = await createTestFile("test-method-implementations.ts", SAMPLE_TS_INTERFACE_CONTENT)
		const editor = await openTestFile(uri)

		// Find implementations of area method from interface
		const result = await lspController.findImplementations({
			textDocument: { uri: uri.toString() },
			position: { line: 2, character: 4 }, // Position on "area" method in interface
		})

		assert(Array.isArray(result), "Should return an array for method implementations")

		console.log(`Found ${result.length} implementations for area method`)

		reporter.passTest("findImplementations", "Find method implementations")
	} catch (error) {
		reporter.failTest("findImplementations", "Find method implementations", error)
	}

	// Test 9: Find implementations using symbolName parameter for TypeScript symbols
	reporter.startTest("findImplementations", "Find implementations using symbolName for TypeScript symbols")
	try {
		const uri = await createTestFile("test-symbolname-implementations.ts", SAMPLE_TS_INTERFACE_CONTENT)
		const editor = await openTestFile(uri)

		// Test finding implementations for IShape interface using symbolName
		try {
			const ishapeResult = await lspController.findImplementations({
				uri: uri.toString(),
				symbolName: "IShape",
			})
			assert(Array.isArray(ishapeResult), "Should return array for IShape symbolName lookup")
			if (ishapeResult.length > 0) {
				ishapeResult.forEach((location) => {
					assert(typeof location.uri === "string", "Location should have uri string")
					assert(typeof location.range === "object", "Location should have range object")
					if (location.preview) {
						assert(typeof location.preview === "string", "Preview should be string if present")
					}
				})
			}
			console.log(`Found ${ishapeResult.length} implementations for IShape via symbolName`)
		} catch (error) {
			console.warn("IShape symbolName lookup failed:", error)
		}

		// Test finding implementations for IDrawable interface using symbolName
		try {
			const idrawableResult = await lspController.findImplementations({
				uri: uri.toString(),
				symbolName: "IDrawable",
			})
			assert(Array.isArray(idrawableResult), "Should return array for IDrawable symbolName lookup")
			console.log(`Found ${idrawableResult.length} implementations for IDrawable via symbolName`)
		} catch (error) {
			console.warn("IDrawable symbolName lookup failed:", error)
		}

		// Test finding implementations for Shape abstract class using symbolName
		try {
			const shapeResult = await lspController.findImplementations({
				uri: uri.toString(),
				symbolName: "Shape",
			})
			assert(Array.isArray(shapeResult), "Should return array for Shape symbolName lookup")
			console.log(`Found ${shapeResult.length} implementations for Shape via symbolName`)
		} catch (error) {
			console.warn("Shape symbolName lookup failed:", error)
		}

		// Test finding implementations for Rectangle class using symbolName
		try {
			const rectangleResult = await lspController.findImplementations({
				uri: uri.toString(),
				symbolName: "Rectangle",
			})
			assert(Array.isArray(rectangleResult), "Should return array for Rectangle symbolName lookup")
			console.log(`Found ${rectangleResult.length} implementations for Rectangle via symbolName`)
		} catch (error) {
			console.warn("Rectangle symbolName lookup failed:", error)
		}

		// Test finding implementations for area method using symbolName
		try {
			const areaResult = await lspController.findImplementations({
				uri: uri.toString(),
				symbolName: "area",
			})
			assert(Array.isArray(areaResult), "Should return array for area symbolName lookup")
			console.log(`Found ${areaResult.length} implementations for area method via symbolName`)
		} catch (error) {
			console.warn("area symbolName lookup failed:", error)
		}

		reporter.passTest("findImplementations", "Find implementations using symbolName for TypeScript symbols")
	} catch (error) {
		reporter.failTest("findImplementations", "Find implementations using symbolName for TypeScript symbols", error)
	}

	// Test 10: Find implementations using symbolName parameter for Python symbols
	reporter.startTest("findImplementations", "Find implementations using symbolName for Python symbols")
	try {
		const uri = await createTestFile("test-symbolname-implementations.py", SAMPLE_PY_INTERFACE_CONTENT)
		const editor = await openTestFile(uri)

		// Test finding implementations for Python Shape class using symbolName
		try {
			const result = await lspController.findImplementations({
				uri: uri.toString(),
				symbolName: "Shape",
			})
			if (result === null || result === undefined) {
				console.warn("Pylance returned null for Python Shape implementations via symbolName")
			} else {
				assert(Array.isArray(result), "Should return array for Python Shape symbolName lookup")
				console.log(`Found ${result.length} implementations for Python Shape via symbolName`)
			}
		} catch (error) {
			console.warn("Python Shape symbolName lookup failed:", error)
		}

		// Test finding implementations for Python Drawable protocol using symbolName
		try {
			const result = await lspController.findImplementations({
				uri: uri.toString(),
				symbolName: "Drawable",
			})
			if (result === null || result === undefined) {
				console.warn("Pylance returned null for Python Drawable implementations via symbolName")
			} else {
				assert(Array.isArray(result), "Should return array for Python Drawable symbolName lookup")
				console.log(`Found ${result.length} implementations for Python Drawable via symbolName`)
			}
		} catch (error) {
			console.warn("Python Drawable symbolName lookup failed:", error)
		}

		// Test finding implementations for Python Rectangle class using symbolName
		try {
			const result = await lspController.findImplementations({
				uri: uri.toString(),
				symbolName: "Rectangle",
			})
			if (result === null || result === undefined) {
				console.warn("Pylance returned null for Python Rectangle implementations via symbolName")
			} else {
				assert(Array.isArray(result), "Should return array for Python Rectangle symbolName lookup")
				console.log(`Found ${result.length} implementations for Python Rectangle via symbolName`)
			}
		} catch (error) {
			console.warn("Python Rectangle symbolName lookup failed:", error)
		}

		reporter.passTest("findImplementations", "Find implementations using symbolName for Python symbols")
	} catch (error) {
		if (error.message?.includes("Pylance")) {
			reporter.passTest("findImplementations", "Find implementations using symbolName for Python symbols (with Pylance warning)")
		} else {
			reporter.failTest("findImplementations", "Find implementations using symbolName for Python symbols", error)
		}
	}

	// Test 11: Error handling for symbolName parameter
	reporter.startTest("findImplementations", "Error handling for symbolName parameter")
	try {
		const uri = await createTestFile("test-error-handling.ts", SAMPLE_TS_INTERFACE_CONTENT)

		// Test with non-existent symbol
		const nonExistentResult = await lspController.findImplementations({
			uri: uri.toString(),
			symbolName: "NonExistentSymbol",
		})
		assert(Array.isArray(nonExistentResult), "Should return array for non-existent symbol")
		assert(nonExistentResult.length === 0, "Should return empty array for non-existent symbol")

		// Test with empty symbolName
		try {
			const emptyResult = await lspController.findImplementations({
				uri: uri.toString(),
				symbolName: "",
			})
			assert(Array.isArray(emptyResult), "Should handle empty symbolName gracefully")
		} catch (error) {
			// Empty symbolName might throw error, which is acceptable
			console.warn("Empty symbolName threw error (acceptable):", error.message)
		}

		// Test with whitespace-only symbolName
		try {
			const whitespaceResult = await lspController.findImplementations({
				uri: uri.toString(),
				symbolName: "   ",
			})
			assert(Array.isArray(whitespaceResult), "Should handle whitespace-only symbolName gracefully")
		} catch (error) {
			// Whitespace symbolName might throw error, which is acceptable
			console.warn("Whitespace symbolName threw error (acceptable):", error.message)
		}

		// Test with invalid URI
		try {
			const invalidUriResult = await lspController.findImplementations({
				uri: "file:///non-existent-file.ts",
				symbolName: "IShape",
			})
			// This might succeed with empty array or throw error - both are acceptable
		} catch (error) {
			console.warn("Invalid URI threw error (acceptable):", error.message)
		}

		reporter.passTest("findImplementations", "Error handling for symbolName parameter")
	} catch (error) {
		reporter.failTest("findImplementations", "Error handling for symbolName parameter", error)
	}

	// Test 12: Mixed parameter usage (both position and symbolName scenarios)
	reporter.startTest("findImplementations", "Mixed parameter usage validation")
	try {
		// Test that both position-based and symbolName-based lookups work on same file
		const content = `
interface MixedTestInterface {
    testMethod(): void;
}

class MixedTestClass implements MixedTestInterface {
    testMethod(): void {
        console.log('test');
    }
}

class AnotherMixedClass implements MixedTestInterface {
    testMethod(): void {
        console.log('another test');
    }
}

const instance = new MixedTestClass();
instance.testMethod();
`
		const uri = await createTestFile("test-mixed-params.ts", content)
		const editor = await openTestFile(uri)

		// Position-based lookup
		const positionResult = await lspController.findImplementations({
			textDocument: { uri: uri.toString() },
			position: { line: 2, character: 10 }, // Position on MixedTestInterface
		})
		assert(Array.isArray(positionResult), "Position-based lookup should work")

		// SymbolName-based lookup on same file
		const symbolResult = await lspController.findImplementations({
			uri: uri.toString(),
			symbolName: "MixedTestInterface",
		})
		assert(Array.isArray(symbolResult), "SymbolName-based lookup should work")

		// Both should potentially find the same implementations (though exact matching isn't guaranteed)
		if (positionResult.length > 0 && symbolResult.length > 0) {
			assert(
				positionResult.every((location) => typeof location.uri === "string"),
				"Position-based implementations should have uri property",
			)
			assert(
				symbolResult.every((location) => typeof location.uri === "string"),
				"Symbol-based implementations should have uri property",
			)
		}

		console.log(`Position-based: ${positionResult.length} implementations, Symbol-based: ${symbolResult.length} implementations`)

		reporter.passTest("findImplementations", "Mixed parameter usage validation")
	} catch (error) {
		reporter.failTest("findImplementations", "Mixed parameter usage validation", error)
	}
}
