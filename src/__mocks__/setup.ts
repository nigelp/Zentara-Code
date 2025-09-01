// Jest setup file to ensure VSCode mocks are properly initialized

// Import the VSCode mock to ensure it's loaded before any modules that depend on it
import "./vscode"

// Set up global Jest configuration
beforeEach(() => {
	// Clear all mocks before each test
	jest.clearAllMocks()
})
