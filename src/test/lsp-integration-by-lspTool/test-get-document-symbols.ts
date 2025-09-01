import { lspTool } from "../../core/tools/lspTool"
import {
	TestResult,
	createTestFile,
	MockTask,
	mockAskApproval,
	mockHandleError,
	mockPushToolResult,
	runTestWithTimeout,
} from "./testHelpers"
import * as vscode from "vscode"

export async function testGetDocumentSymbols(): Promise<TestResult> {
	const tool = "get_document_symbols"

	try {
		// Create a comprehensive test TypeScript file with various symbol types
		const testContent = `
/**
 * Test file for document symbols functionality
 * This file contains various TypeScript constructs to test symbol detection
 */

// Interfaces
/**
 * User interface definition
 */
export interface User {
    /** User ID */
    id: number;
    /** User name */
    name: string;
    /** User email */
    email: string;
    /** Account status */
    isActive: boolean;
}

/**
 * Configuration interface with nested types
 */
export interface AppConfig {
    /** Application settings */
    app: {
        name: string;
        version: string;
        debug: boolean;
    };
    /** Database configuration */
    database: {
        host: string;
        port: number;
        ssl: boolean;
    };
}

// Type aliases
/**
 * Status type definition
 */
export type Status = 'active' | 'inactive' | 'pending';

/**
 * Complex type with generics
 */
export type ApiResponse<T> = {
    success: boolean;
    data: T;
    error?: string;
    timestamp: Date;
};

/**
 * Function type definition
 */
export type EventHandler<T> = (event: T) => void | Promise<void>;

// Enums
/**
 * User role enumeration
 */
export enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
    GUEST = 'guest',
    MODERATOR = 'moderator'
}

/**
 * HTTP status codes
 */
export enum HttpStatus {
    OK = 200,
    CREATED = 201,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    NOT_FOUND = 404,
    INTERNAL_ERROR = 500
}

// Constants
/**
 * Application configuration constant
 */
export const APP_CONFIG: AppConfig = {
    app: {
        name: "Test Application",
        version: "1.0.0",
        debug: true
    },
    database: {
        host: "localhost",
        port: 5432,
        ssl: false
    }
};

/**
 * Default user configuration
 */
export const DEFAULT_USER: Partial<User> = {
    isActive: true,
    name: "Anonymous"
};

/**
 * API endpoints constant
 */
export const API_ENDPOINTS = {
    USERS: '/api/users',
    AUTH: '/api/auth',
    CONFIG: '/api/config'
} as const;

// Variables
/**
 * Global counter variable
 */
let globalCounter: number = 0;

/**
 * Feature flags
 */
let featureFlags: Record<string, boolean> = {
    enableNewUI: true,
    enableDebugMode: false
};

// Classes
/**
 * Abstract base class for services
 */
export abstract class BaseService {
    /** Service name */
    protected serviceName: string;
    
    /** Service configuration */
    protected config: any;

    /**
     * Constructor for base service
     */
    constructor(serviceName: string) {
        this.serviceName = serviceName;
        this.config = {};
    }

    /**
     * Abstract method to initialize service
     */
    abstract initialize(): Promise<void>;

    /**
     * Get service name
     */
    public getServiceName(): string {
        return this.serviceName;
    }

    /**
     * Protected method to log messages
     */
    protected log(message: string): void {
        console.log(\`[\${this.serviceName}] \${message}\`);
    }

    /**
     * Static method to create service instances
     */
    static createService(type: string): BaseService | null {
        // Implementation would be here
        return null;
    }
}

/**
 * User service implementation
 */
export class UserService extends BaseService {
    /** User repository */
    private userRepository: any[];
    
    /** Service configuration specific to users */
    private userConfig: {
        maxUsers: number;
        defaultRole: UserRole;
        cacheTimeout: number;
    };

    /**
     * Constructor for UserService
     */
    constructor() {
        super('UserService');
        this.userRepository = [];
        this.userConfig = {
            maxUsers: 1000,
            defaultRole: UserRole.USER,
            cacheTimeout: 5000
        };
    }

    /**
     * Initialize the user service
     */
    async initialize(): Promise<void> {
        this.log('Initializing UserService');
        await this.loadUsers();
    }

    /**
     * Load users from data source
     */
    private async loadUsers(): Promise<void> {
        // Mock implementation
        this.userRepository = [];
    }

    /**
     * Create a new user
     */
    public async createUser(userData: Omit<User, 'id'>): Promise<User> {
        const newUser: User = {
            id: this.generateId(),
            ...userData
        };
        
        this.userRepository.push(newUser);
        return newUser;
    }

    /**
     * Get user by ID
     */
    public async getUserById(id: number): Promise<User | null> {
        return this.userRepository.find(user => user.id === id) || null;
    }

    /**
     * Update user information
     */
    public async updateUser(id: number, updates: Partial<User>): Promise<User | null> {
        const userIndex = this.userRepository.findIndex(user => user.id === id);
        if (userIndex === -1) {
            return null;
        }

        this.userRepository[userIndex] = {
            ...this.userRepository[userIndex],
            ...updates
        };

        return this.userRepository[userIndex];
    }

    /**
     * Delete user by ID
     */
    public async deleteUser(id: number): Promise<boolean> {
        const initialLength = this.userRepository.length;
        this.userRepository = this.userRepository.filter(user => user.id !== id);
        return this.userRepository.length < initialLength;
    }

    /**
     * Get all users with optional filtering
     */
    public async getAllUsers(filter?: {
        isActive?: boolean;
        role?: UserRole;
    }): Promise<User[]> {
        let users = [...this.userRepository];
        
        if (filter?.isActive !== undefined) {
            users = users.filter(user => user.isActive === filter.isActive);
        }
        
        return users;
    }

    /**
     * Private method to generate unique IDs
     */
    private generateId(): number {
        return Date.now() + Math.random();
    }

    /**
     * Static method to validate user data
     */
    static validateUserData(userData: Partial<User>): boolean {
        return !!(userData.name && userData.email);
    }

    /**
     * Getter for user count
     */
    public get userCount(): number {
        return this.userRepository.length;
    }

    /**
     * Setter for max users configuration
     */
    public set maxUsers(count: number) {
        this.userConfig.maxUsers = count;
    }
}

// Functions
/**
 * Utility function to format user display name
 */
export function formatUserName(user: User): string {
    return \`\${user.name} (\${user.email})\`;
}

/**
 * Async function to fetch user data
 */
export async function fetchUserData(id: number): Promise<User | null> {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 100));
    return null;
}

/**
 * Generic function for data transformation
 */
export function transformData<T, U>(
    data: T[],
    transformer: (item: T) => U
): U[] {
    return data.map(transformer);
}

/**
 * Function with multiple parameters and default values
 */
export function processUsers(
    users: User[],
    options: {
        sortBy?: keyof User;
        ascending?: boolean;
        limit?: number;
    } = {}
): User[] {
    let result = [...users];
    
    if (options.sortBy) {
        result.sort((a, b) => {
            const aVal = a[options.sortBy!];
            const bVal = b[options.sortBy!];
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return options.ascending === false ? -comparison : comparison;
        });
    }
    
    if (options.limit) {
        result = result.slice(0, options.limit);
    }
    
    return result;
}

/**
 * Higher-order function that returns a function
 */
export function createValidator<T>(
    validationFn: (item: T) => boolean
): (items: T[]) => T[] {
    return function(items: T[]): T[] {
        return items.filter(validationFn);
    };
}

/**
 * Arrow function assigned to const
 */
export const calculateTotal = (items: number[]): number => {
    return items.reduce((sum, item) => sum + item, 0);
};

/**
 * Arrow function with async behavior
 */
export const processAsync = async (data: any[]): Promise<any[]> => {
    return Promise.all(data.map(async item => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { ...item, processed: true };
    }));
};

// Namespace
/**
 * Utility namespace for common operations
 */
export namespace Utils {
    /**
     * String utilities
     */
    export namespace Strings {
        /**
         * Capitalize first letter
         */
        export function capitalize(str: string): string {
            return str.charAt(0).toUpperCase() + str.slice(1);
        }

        /**
         * Convert to kebab case
         */
        export function toKebabCase(str: string): string {
            return str.replace(/[A-Z]/g, letter => \`-\${letter.toLowerCase()}\`);
        }
    }

    /**
     * Array utilities
     */
    export namespace Arrays {
        /**
         * Remove duplicates from array
         */
        export function unique<T>(arr: T[]): T[] {
            return [...new Set(arr)];
        }

        /**
         * Chunk array into smaller arrays
         */
        export function chunk<T>(arr: T[], size: number): T[][] {
            const chunks: T[][] = [];
            for (let i = 0; i < arr.length; i += size) {
                chunks.push(arr.slice(i, i + size));
            }
            return chunks;
        }
    }

    /**
     * Date utilities
     */
    export const DateHelpers = {
        /**
         * Format date to ISO string
         */
        formatISO: (date: Date): string => date.toISOString(),
        
        /**
         * Get days between two dates
         */
        daysBetween: (date1: Date, date2: Date): number => {
            const diffTime = Math.abs(date2.getTime() - date1.getTime());
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
    };
}

// Module-level code execution
globalCounter = 42;
featureFlags.enableNewUI = true;

// Export statement at the end
export { UserRole as Role, HttpStatus };
export type { User as UserType, AppConfig as Configuration };
`

		const testUri = await createTestFile("test-get-document-symbols.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test getting document symbols for the entire document
		const getDocumentSymbolsParams = {
			textDocument: {
				uri: testUri.toString(),
			},
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "get_document_symbols",
				_text: JSON.stringify(getDocumentSymbolsParams),
			},
		}

		// Execute the test with timeout protection
		await runTestWithTimeout(async () => {
			await lspTool(mockTask as any, block, mockAskApproval, mockHandleError, mockPushResult)
		}, 20000) // 20 second timeout for this comprehensive test

		// Analyze the result
		if (!capturedResult) {
			return {
				tool,
				passed: false,
				error: "No result captured from lspTool execution",
			}
		}

		let resultData
		try {
			resultData = JSON.parse(capturedResult)
		} catch (parseError) {
			// If it's not JSON, check if it's an error message
			if (capturedResult.includes("Error") || capturedResult.includes("error")) {
				return {
					tool,
					passed: false,
					error: `Tool returned error: ${capturedResult}`,
					details: { rawResult: capturedResult },
				}
			}

			return {
				tool,
				passed: false,
				error: `Failed to parse result as JSON: ${parseError}`,
				details: { rawResult: capturedResult },
			}
		}

		// Check if the operation was successful
		if (resultData.success === false) {
			return {
				tool,
				passed: false,
				error: `LSP operation failed: ${resultData.message || "Unknown error"}`,
				details: resultData,
			}
		}

		// Check if we have a successful result with data
		if (resultData.success === true) {
			// Now expecting: { success: true, symbols: string }
			if (typeof resultData.symbols !== "string") {
				return {
					tool,
					passed: false,
					error: "Expected symbols to be a string in table format",
					details: { resultData },
				}
			}

			// Parse the table format to extract symbol information
			const tableLines = resultData.symbols.split('\n').filter((line: string) => line.trim() && !line.includes('NAME | KIND | RANGE'))
			
			if (tableLines.length === 0) {
				return {
					tool,
					passed: false,
					error: "No symbols found in table - unexpected for comprehensive test file",
					details: { tableContent: resultData.symbols, resultData },
				}
			}

			// Convert table format back to symbol-like objects for validation
			const documentSymbols = tableLines.map((line: string) => {
				const parts = line.split(' | ')
				if (parts.length >= 2) {
					const name = parts[0].trim()
					const kind = parseInt(parts[1].trim(), 10)
					// Create a minimal symbol object for validation
					return {
						name,
						kind,
						range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
						selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
					}
				}
				return null
			}).filter((symbol: any): symbol is { name: string; kind: number; range: any; selectionRange: any } => symbol !== null)

			if (documentSymbols.length === 0) {
				return {
					tool,
					passed: false,
					error: "No valid symbols parsed from table format",
					details: { tableContent: resultData.symbols, resultData },
				}
			}

			// Validate the structure of document symbols
			const expectedSymbolTypes = [
				"Interface",
				"Class",
				"Function",
				"Variable",
				"Constant",
				"Enum",
				"Namespace",
				"TypeParameter",
				"Method",
				"Property",
			]

			let foundSymbolTypes: string[] = []
			let totalSymbols = 0
			const symbolValidationErrors: string[] = []

			function validateSymbol(symbol: any, depth: number = 0): void {
				totalSymbols++

				// Check required properties
				if (typeof symbol.name !== "string") {
					symbolValidationErrors.push(`Symbol at depth ${depth} missing or invalid 'name' property`)
				}

				if (typeof symbol.kind !== "number") {
					symbolValidationErrors.push(`Symbol '${symbol.name}' missing or invalid 'kind' property`)
				}

				if (!symbol.range || typeof symbol.range !== "object") {
					symbolValidationErrors.push(`Symbol '${symbol.name}' missing or invalid 'range' property`)
				} else {
					// Validate range structure
					if (!symbol.range.start || !symbol.range.end) {
						symbolValidationErrors.push(`Symbol '${symbol.name}' range missing start or end`)
					} else {
						const { start, end } = symbol.range
						if (
							typeof start.line !== "number" ||
							typeof start.character !== "number" ||
							typeof end.line !== "number" ||
							typeof end.character !== "number"
						) {
							symbolValidationErrors.push(`Symbol '${symbol.name}' range has invalid position structure`)
						}
					}
				}

				if (!symbol.selectionRange || typeof symbol.selectionRange !== "object") {
					symbolValidationErrors.push(`Symbol '${symbol.name}' missing or invalid 'selectionRange' property`)
				}

				// Map symbol kind numbers to types (based on VSCode SymbolKind enum)
				// VSCode uses a different numbering than LSP spec
				const symbolKindMap: Record<number, string> = {
					0: "File",
					1: "Module",
					2: "Namespace",
					3: "Package",
					4: "Class",
					5: "Method",
					6: "Property",
					7: "Field",
					8: "Constructor",
					9: "Enum",
					10: "Interface",
					11: "Function",
					12: "Variable",
					13: "Constant",
					14: "String",
					15: "Number",
					16: "Boolean",
					17: "Array",
					18: "Object",
					19: "Key",
					20: "Null",
					21: "EnumMember",
					22: "Struct",
					23: "Event",
					24: "Operator",
					25: "TypeParameter",
				}

				const symbolType = symbolKindMap[symbol.kind] || `Unknown(${symbol.kind})`
				if (!foundSymbolTypes.includes(symbolType)) {
					foundSymbolTypes.push(symbolType)
				}

				// Recursively validate children if they exist
				if (symbol.children && Array.isArray(symbol.children)) {
					symbol.children.forEach((child: any) => validateSymbol(child, depth + 1))
				}
			}

			// Validate all top-level symbols
			documentSymbols.forEach((symbol: any) => validateSymbol(symbol))

			// Check for validation errors
			if (symbolValidationErrors.length > 0) {
				return {
					tool,
					passed: false,
					error: `Symbol validation errors found: ${symbolValidationErrors.join("; ")}`,
					details: {
						symbolValidationErrors,
						foundSymbolTypes,
						totalSymbols,
						documentSymbols,
						resultData,
					},
				}
			}

			// Check if we found symbols that we expect from our test file
			const expectedSymbols = [
				"User",
				"AppConfig",
				"Status",
				"ApiResponse",
				"EventHandler", // Types/Interfaces
				"UserRole",
				"HttpStatus", // Enums
				"APP_CONFIG",
				"DEFAULT_USER",
				"API_ENDPOINTS", // Constants
				"BaseService",
				"UserService", // Classes
				"formatUserName",
				"fetchUserData",
				"transformData",
				"processUsers", // Functions
				"Utils", // Namespace
			]

			const symbolNames = extractSymbolNames(documentSymbols)
			const foundExpectedSymbols = expectedSymbols.filter((expected) => symbolNames.includes(expected))

			// We should find at least some of our expected symbols
			if (foundExpectedSymbols.length < expectedSymbols.length * 0.6) {
				return {
					tool,
					passed: false,
					error: `Expected to find more symbols from test file. Found: ${foundExpectedSymbols.length}/${expectedSymbols.length}`,
					details: {
						expectedSymbols,
						foundExpectedSymbols,
						symbolNames,
						foundSymbolTypes,
						totalSymbols,
						documentSymbols,
						resultData,
					},
				}
			}

			// Check if we found essential symbol types
			const essentialTypes = ["Interface", "Class", "Function", "Enum"]
			const foundEssentialTypes = essentialTypes.filter((type) => foundSymbolTypes.includes(type))

			if (foundEssentialTypes.length < essentialTypes.length) {
				return {
					tool,
					passed: false,
					error: `Missing essential symbol types. Expected: ${essentialTypes.join(", ")}. Found: ${foundEssentialTypes.join(", ")}`,
					details: {
						essentialTypes,
						foundEssentialTypes,
						foundSymbolTypes,
						totalSymbols,
						documentSymbols,
						resultData,
					},
				}
			}

			// Success: we found valid document symbols with expected structure and content
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully retrieved ${totalSymbols} document symbols`,
					totalSymbols,
					foundSymbolTypes,
					symbolNames,
					foundExpectedSymbols,
					expectedSymbolsRatio: `${foundExpectedSymbols.length}/${expectedSymbols.length}`,
					topLevelSymbolsCount: documentSymbols.length,
					hasHierarchicalStructure: documentSymbols.some(
						(s: any) => s.children && Array.isArray(s.children) && s.children.length > 0,
					),
					sampleSymbols: documentSymbols.slice(0, 3).map((s: any) => ({
						name: s.name,
						kind: s.kind,
						range: s.range,
						hasChildren: !!(s.children && s.children.length > 0),
					})),
				},
			}
		}

		// Handle unexpected result structure
		return {
			tool,
			passed: false,
			error: "Unexpected result structure - no success field",
			details: resultData,
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)

		// Check for common timeout or LSP unavailability issues
		if (errorMessage.includes("timeout") || errorMessage.includes("Test timed out")) {
			return {
				tool,
				passed: false,
				error: "Test timed out - LSP server may not be available or responsive",
				details: { timeout: true, originalError: errorMessage },
			}
		}

		if (
			errorMessage.includes("LSP server not available") ||
			errorMessage.includes("language server") ||
			errorMessage.includes("not initialized")
		) {
			return {
				tool,
				passed: false,
				error: "LSP server not available - this is expected in test environments without active language servers",
				details: { lspUnavailable: true, originalError: errorMessage },
			}
		}

		return {
			tool,
			passed: false,
			error: `Unexpected error during test execution: ${errorMessage}`,
			details: {
				stack: error instanceof Error ? error.stack : undefined,
				originalError: errorMessage,
			},
		}
	}
}

// Helper method to extract symbol names recursively
function extractSymbolNames(symbols: any[]): string[] {
	const names: string[] = []

	function collectNames(symbolArray: any[]): void {
		symbolArray.forEach((symbol) => {
			if (symbol.name) {
				names.push(symbol.name)
			}
			if (symbol.children && Array.isArray(symbol.children)) {
				collectNames(symbol.children)
			}
		})
	}

	collectNames(symbols)
	return names
}
