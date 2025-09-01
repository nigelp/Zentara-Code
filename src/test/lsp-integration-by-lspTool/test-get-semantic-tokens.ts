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

export async function testGetSemanticTokens(): Promise<TestResult> {
	const tool = "get_semantic_tokens"

	try {
		// Create a comprehensive test TypeScript file with various language constructs for semantic highlighting
		const testContent = `
/**
 * Test file for semantic tokens functionality
 * This file contains various TypeScript constructs to test semantic highlighting
 */

// Import statements for semantic highlighting
import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import type { Configuration, Logger } from './types';

/**
 * Interface with various member types for semantic highlighting
 */
export interface IUserService {
    /** User identifier property */
    readonly id: number;
    /** User name property */
    name: string;
    /** User email property */
    email?: string;
    /** User status property */
    isActive: boolean;
    
    /** Method to get user data */
    getUserData(): Promise<UserData>;
    /** Method to update user information */
    updateUser(updates: Partial<UserData>): Promise<void>;
}

/**
 * Type alias for user data structure
 */
export type UserData = {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'user' | 'guest';
    createdAt: Date;
    settings: Record<string, any>;
};

/**
 * Enumeration with different value types
 */
export enum UserRole {
    ADMIN = 'admin',
    USER = 'user', 
    GUEST = 'guest',
    MODERATOR = 'moderator'
}

/**
 * Numeric enumeration for status codes
 */
export enum StatusCode {
    SUCCESS = 200,
    NOT_FOUND = 404,
    SERVER_ERROR = 500
}

/**
 * Generic interface for testing type parameters
 */
export interface Repository<T, K extends keyof T> {
    findById(id: K): Promise<T | null>;
    create(entity: Omit<T, K>): Promise<T>;
    update(id: K, updates: Partial<T>): Promise<T>;
    delete(id: K): Promise<boolean>;
}

/**
 * Abstract base class with various member types
 */
export abstract class BaseService {
    /** Protected property for service name */
    protected readonly serviceName: string;
    /** Private property for configuration */
    private config: Configuration;
    /** Static property for instance count */
    public static instanceCount: number = 0;
    
    /**
     * Constructor with parameter types and visibility modifiers
     */
    constructor(
        name: string, 
        private logger: Logger,
        protected options: Record<string, unknown> = {}
    ) {
        this.serviceName = name;
        this.config = this.loadConfiguration();
        BaseService.instanceCount++;
    }
    
    /**
     * Abstract method declaration
     */
    abstract initialize(): Promise<void>;
    
    /**
     * Public method with various syntax elements
     */
    public async processData<T extends UserData>(
        data: T[], 
        filter?: (item: T) => boolean,
        transform?: (item: T) => T
    ): Promise<T[]> {
        let result: T[] = data;
        
        // Conditional logic with type guards
        if (filter !== undefined) {
            result = result.filter(filter);
        }
        
        // Map operation with optional transform
        if (transform) {
            result = result.map(transform);
        }
        
        // Async operation with error handling
        try {
            await this.logOperation('processData', result.length);
            return result;
        } catch (error) {
            this.logger.error('Error processing data:', error);
            throw new Error(\`Processing failed: \${error instanceof Error ? error.message : 'Unknown error'}\`);
        }
    }
    
    /**
     * Private method with complex logic
     */
    private loadConfiguration(): Configuration {
        return {
            timeout: 5000,
            retries: 3,
            enableLogging: true
        };
    }
    
    /**
     * Protected method for logging
     */
    protected async logOperation(operation: string, count: number): Promise<void> {
        const timestamp = new Date().toISOString();
        this.logger.info(\`[\${timestamp}] \${this.serviceName}: \${operation} processed \${count} items\`);
    }
    
    /**
     * Static method with generic constraints
     */
    static createInstance<T extends BaseService>(
        ServiceClass: new (...args: any[]) => T,
        ...args: any[]
    ): T {
        return new ServiceClass(...args);
    }
    
    /**
     * Getter property
     */
    public get name(): string {
        return this.serviceName;
    }
    
    /**
     * Setter property with validation
     */
    public set timeout(value: number) {
        if (value <= 0) {
            throw new Error('Timeout must be positive');
        }
        this.config.timeout = value;
    }
}

/**
 * Concrete implementation class extending abstract base
 */
export class UserService extends BaseService implements IUserService {
    /** Private field with readonly modifier */
    private readonly users = new Map<number, UserData>();
    /** Public field with array type */
    public activeUsers: UserData[] = [];
    
    /**
     * Constructor calling super with proper parameter passing
     */
    constructor(logger: Logger, options?: Record<string, unknown>) {
        super('UserService', logger, options);
    }
    
    /**
     * Implementation of abstract method
     */
    async initialize(): Promise<void> {
        await this.loadInitialData();
        this.logger.info('UserService initialized');
    }
    
    /**
     * Implementation of interface method
     */
    async getUserData(): Promise<UserData> {
        const user = this.users.get(1);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }
    
    /**
     * Method with destructuring and rest parameters
     */
    async updateUser(updates: Partial<UserData>): Promise<void> {
        const { id, ...otherUpdates } = updates;
        
        if (!id) {
            throw new Error('User ID is required');
        }
        
        const existingUser = this.users.get(id);
        if (!existingUser) {
            throw new Error(\`User with ID \${id} not found\`);
        }
        
        // Object spread with type safety
        const updatedUser: UserData = {
            ...existingUser,
            ...otherUpdates
        };
        
        this.users.set(id, updatedUser);
        await this.logOperation('updateUser', 1);
    }
    
    /**
     * Method with array methods and callbacks
     */
    async filterActiveUsers(predicate?: (user: UserData) => boolean): Promise<UserData[]> {
        const allUsers = Array.from(this.users.values());
        let filtered = allUsers.filter(user => user.isActive);
        
        if (predicate) {
            filtered = filtered.filter(predicate);
        }
        
        // Array method chaining
        return filtered
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, 100);
    }
    
    /**
     * Private helper method with complex types
     */
    private async loadInitialData(): Promise<void> {
        const mockUsers: UserData[] = [
            {
                id: 1,
                name: 'John Doe',
                email: 'john@example.com',
                role: 'admin',
                createdAt: new Date('2023-01-01'),
                settings: { theme: 'dark', notifications: true }
            },
            {
                id: 2,
                name: 'Jane Smith',
                email: 'jane@example.com',
                role: 'user',
                createdAt: new Date('2023-02-01'),
                settings: { theme: 'light', notifications: false }
            }
        ];
        
        // Map initialization with forEach
        mockUsers.forEach(user => {
            this.users.set(user.id, user);
        });
        
        this.activeUsers = mockUsers.filter(user => user.role !== 'guest');
    }
}

/**
 * Function with various parameter types and return types
 */
export async function createUserRepository<T extends UserData>(
    connection: string,
    options: {
        timeout?: number;
        retries?: number;
        logger?: Logger;
    } = {}
): Promise<Repository<T, keyof T>> {
    const { timeout = 5000, retries = 3, logger } = options;
    
    // Return object with method implementations
    return {
        async findById(id: keyof T): Promise<T | null> {
            logger?.info(\`Finding user by ID: \${String(id)}\`);
            // Mock implementation
            return null;
        },
        
        async create(entity: Omit<T, keyof T>): Promise<T> {
            logger?.info('Creating new user');
            // Mock implementation
            return entity as T;
        },
        
        async update(id: keyof T, updates: Partial<T>): Promise<T> {
            logger?.info(\`Updating user \${String(id)}\`);
            // Mock implementation
            return updates as T;
        },
        
        async delete(id: keyof T): Promise<boolean> {
            logger?.info(\`Deleting user \${String(id)}\`);
            return true;
        }
    };
}

/**
 * Arrow function with complex types
 */
export const processUserBatch = async (
    users: UserData[],
    batchSize: number = 10,
    processor: (batch: UserData[]) => Promise<void>
): Promise<void> => {
    for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        await processor(batch);
    }
};

/**
 * Constants with different types
 */
export const DEFAULT_CONFIG: Configuration = {
    timeout: 5000,
    retries: 3,
    enableLogging: true
};

export const USER_ROLES = Object.values(UserRole);
export const MAX_USERS = 1000;
export const API_VERSION = '1.0.0' as const;

/**
 * Variable declarations with type annotations
 */
let globalCounter: number = 0;
const userCache = new Map<string, UserData>();
var legacySupport: boolean = false;

/**
 * Namespace with nested structure
 */
export namespace Utils {
    export const StringHelpers = {
        capitalize: (str: string): string => str.charAt(0).toUpperCase() + str.slice(1),
        slugify: (str: string): string => str.toLowerCase().replace(/\\s+/g, '-')
    };
    
    export namespace DateHelpers {
        export function formatDate(date: Date): string {
            return date.toISOString().split('T')[0];
        }
        
        export const isToday = (date: Date): boolean => {
            const today = new Date();
            return date.toDateString() === today.toDateString();
        };
    }
}

/**
 * Module-level code with various statements
 */
if (typeof globalThis !== 'undefined') {
    globalCounter = 42;
}

// Type assertion and conditional assignment
const windowObject = globalThis as unknown as Window & typeof globalThis;

// Regular expression literal
const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

// Template literal with expressions
const greeting = \`Hello, \${DEFAULT_CONFIG.enableLogging ? 'logged' : 'silent'} world!\`;

// Export statements with renaming
export { UserService as DefaultUserService };
export type { IUserService as UserServiceInterface };
`

		const testUri = await createTestFile("test-get-semantic-tokens.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test getting semantic tokens for the entire document
		const getSemanticTokensParams = {
			textDocument: {
				uri: testUri.toString(),
			},
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "get_semantic_tokens",
				_text: JSON.stringify(getSemanticTokensParams),
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
			const semanticTokens = resultData.data

			// For get_semantic_tokens, we expect either an array of SemanticToken objects,
			// a vscode.SemanticTokens object, or null
			if (semanticTokens === null) {
				return {
					tool,
					passed: false,
					error: "No semantic tokens found - this might indicate LSP server issues or unsupported file type",
					details: { semanticTokens, resultData },
				}
			}

			// Check if semantic tokens is an object (could be vscode.SemanticTokens or array)
			if (typeof semanticTokens !== "object") {
				return {
					tool,
					passed: false,
					error: "Semantic tokens should be an object or array",
					details: { semanticTokens, resultData },
				}
			}

			let tokenCount = 0
			let hasValidStructure = false

			// Handle different possible return formats
			if (Array.isArray(semanticTokens)) {
				// Array of SemanticToken objects
				tokenCount = semanticTokens.length

				if (tokenCount === 0) {
					return {
						tool,
						passed: false,
						error: "No semantic tokens found in document - unexpected for comprehensive test file",
						details: { semanticTokens, resultData },
					}
				}

				// Validate the structure of semantic tokens
				const validationErrors: string[] = []

				for (let i = 0; i < Math.min(semanticTokens.length, 5); i++) {
					const token = semanticTokens[i]

					// Check required properties according to SemanticToken type
					if (typeof token.line !== "number") {
						validationErrors.push(`Token ${i}: missing or invalid 'line' property`)
					}

					if (typeof token.character !== "number") {
						validationErrors.push(`Token ${i}: missing or invalid 'character' property`)
					}

					if (typeof token.length !== "number") {
						validationErrors.push(`Token ${i}: missing or invalid 'length' property`)
					}

					if (typeof token.tokenType !== "string") {
						validationErrors.push(`Token ${i}: missing or invalid 'tokenType' property`)
					}

					if (!Array.isArray(token.tokenModifiers)) {
						validationErrors.push(`Token ${i}: missing or invalid 'tokenModifiers' property`)
					}
				}

				if (validationErrors.length > 0) {
					return {
						tool,
						passed: false,
						error: `Semantic token validation errors: ${validationErrors.join("; ")}`,
						details: {
							validationErrors,
							sampleTokens: semanticTokens.slice(0, 3),
							semanticTokens,
							resultData,
						},
					}
				}

				hasValidStructure = true
			} else if (semanticTokens.data && Array.isArray(semanticTokens.data)) {
				// Raw vscode.SemanticTokens format with data array
				const dataArray = semanticTokens.data
				tokenCount = Math.floor(dataArray.length / 5) // Each token uses 5 numbers

				if (tokenCount === 0) {
					return {
						tool,
						passed: false,
						error: "No semantic tokens data found - unexpected for comprehensive test file",
						details: { semanticTokens, resultData },
					}
				}

				// Validate that data array length is multiple of 5
				if (dataArray.length % 5 !== 0) {
					return {
						tool,
						passed: false,
						error: `Invalid semantic tokens data array length: ${dataArray.length} (should be multiple of 5)`,
						details: { dataArray: dataArray.slice(0, 20), semanticTokens, resultData },
					}
				}

				// Validate that all values are numbers
				const invalidIndices = dataArray
					.slice(0, 20) // Check first 20 values
					.map((val, idx) => (typeof val !== "number" ? idx : -1))
					.filter((idx) => idx !== -1)

				if (invalidIndices.length > 0) {
					return {
						tool,
						passed: false,
						error: `Invalid semantic tokens data: non-numeric values at indices ${invalidIndices.join(", ")}`,
						details: {
							invalidIndices,
							sampleData: dataArray.slice(0, 20),
							semanticTokens,
							resultData,
						},
					}
				}

				hasValidStructure = true
			} else {
				return {
					tool,
					passed: false,
					error: "Unexpected semantic tokens format - expected array of tokens or SemanticTokens object",
					details: {
						semanticTokensType: Array.isArray(semanticTokens) ? "array" : typeof semanticTokens,
						semanticTokensKeys: Object.keys(semanticTokens),
						semanticTokens,
						resultData,
					},
				}
			}

			// Additional validation for expected content
			const expectedTokenTypes = [
				"class",
				"interface",
				"method",
				"function",
				"variable",
				"parameter",
				"property",
				"type",
				"keyword",
				"comment",
			]

			let foundTokenTypes: string[] = []
			let hasImportKeywords = false
			let hasClassKeywords = false
			let hasFunctionKeywords = false

			if (Array.isArray(semanticTokens)) {
				// Extract token types from SemanticToken array
				foundTokenTypes = [...new Set(semanticTokens.map((token) => token.tokenType))]

				// Check for specific constructs we know are in our test file
				hasImportKeywords = semanticTokens.some(
					(token) => token.tokenType === "keyword" || token.tokenType === "import",
				)
				hasClassKeywords = semanticTokens.some(
					(token) => token.tokenType === "class" || token.tokenType === "type",
				)
				hasFunctionKeywords = semanticTokens.some(
					(token) => token.tokenType === "function" || token.tokenType === "method",
				)
			}

			// Success: we found valid semantic tokens with expected structure
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully retrieved semantic tokens for TypeScript file`,
					tokenCount,
					hasValidStructure,
					format: Array.isArray(semanticTokens) ? "SemanticToken[]" : "vscode.SemanticTokens",
					foundTokenTypes: foundTokenTypes.slice(0, 10), // Limit to first 10 types
					hasExpectedContent: {
						hasImportKeywords,
						hasClassKeywords,
						hasFunctionKeywords,
					},
					sampleTokens: Array.isArray(semanticTokens)
						? semanticTokens.slice(0, 3).map((token) => ({
								line: token.line,
								character: token.character,
								length: token.length,
								tokenType: token.tokenType,
								tokenModifiers: token.tokenModifiers,
							}))
						: `Raw data array with ${Math.floor(semanticTokens.data?.length / 5)} tokens`,
					totalUniqueTokenTypes: foundTokenTypes.length,
					documentAnalysis: {
						hasTypeScriptSyntax: foundTokenTypes.some((type) =>
							["interface", "type", "class", "method"].includes(type),
						),
						hasVariousConstructs: tokenCount > 50, // Expect many tokens for our comprehensive file
						tokenDensity: `${(tokenCount / testContent.split("\n").length).toFixed(2)} tokens per line`,
					},
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

		if (errorMessage.includes("semantic tokens") || errorMessage.includes("not supported")) {
			return {
				tool,
				passed: false,
				error: "Semantic tokens not supported by current LSP server - this is expected for some language servers",
				details: { notSupported: true, originalError: errorMessage },
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
