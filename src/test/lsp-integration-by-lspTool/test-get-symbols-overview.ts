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
import * as path from "path"
import * as fs from "fs"

export async function testGetSymbolsOverview(): Promise<TestResult> {
	const tool = "get_symbols_overview"

	try {
		// Create a test directory structure with multiple TypeScript files containing various symbols
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
		if (!workspaceFolder) {
			throw new Error("No workspace folder found")
		}

		const testDir = path.join(workspaceFolder.uri.fsPath, ".test-files", "symbols-overview-test")
		if (!fs.existsSync(testDir)) {
			fs.mkdirSync(testDir, { recursive: true })
		}

		// Create multiple test files with different symbol types
		const testFiles = [
			{
				name: "interfaces.ts",
				content: `
/**
 * User interface definition
 */
export interface User {
    id: number;
    name: string;
    email: string;
    isActive: boolean;
}

/**
 * Product interface with complex structure
 */
export interface Product {
    id: string;
    title: string;
    price: number;
    category: {
        id: number;
        name: string;
    };
    tags: string[];
}

/**
 * Generic API response interface
 */
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
    metadata: {
        timestamp: Date;
        version: string;
    };
}
`,
			},
			{
				name: "classes.ts",
				content: `
import { User, Product } from './interfaces';

/**
 * Abstract base repository class
 */
export abstract class BaseRepository<T> {
    protected items: T[] = [];
    
    abstract save(item: T): Promise<void>;
    abstract findById(id: string): Promise<T | null>;
    
    public getAll(): T[] {
        return [...this.items];
    }
}

/**
 * User repository implementation
 */
export class UserRepository extends BaseRepository<User> {
    private readonly maxUsers = 1000;
    
    constructor(private readonly config: { timeout: number }) {
        super();
    }
    
    async save(user: User): Promise<void> {
        this.items.push(user);
    }
    
    async findById(id: string): Promise<User | null> {
        return this.items.find(u => u.id.toString() === id) || null;
    }
    
    public async findByEmail(email: string): Promise<User | null> {
        return this.items.find(u => u.email === email) || null;
    }
    
    static createDefault(): UserRepository {
        return new UserRepository({ timeout: 5000 });
    }
}

/**
 * Product service class
 */
export class ProductService {
    private products: Product[] = [];
    
    constructor(
        private userRepo: UserRepository,
        public readonly apiUrl: string
    ) {}
    
    async addProduct(product: Product): Promise<boolean> {
        this.products.push(product);
        return true;
    }
    
    get productCount(): number {
        return this.products.length;
    }
    
    set apiEndpoint(url: string) {
        // Implementation here
    }
}
`,
			},
			{
				name: "functions.ts",
				content: `
import { User, Product, ApiResponse } from './interfaces';

/**
 * Format user display name
 */
export function formatUserName(user: User): string {
    return \`\${user.name} (\${user.email})\`;
}

/**
 * Async function to fetch user data
 */
export async function fetchUserData(userId: number): Promise<User | null> {
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 100));
    return null;
}

/**
 * Generic data transformation function
 */
export function transformData<T, U>(
    data: T[], 
    transformer: (item: T) => U
): U[] {
    return data.map(transformer);
}

/**
 * Function with complex parameters
 */
export function processProducts(
    products: Product[],
    filters: {
        category?: string;
        minPrice?: number;
        maxPrice?: number;
        tags?: string[];
    } = {},
    sorting: {
        field: keyof Product;
        direction: 'asc' | 'desc';
    } = { field: 'title', direction: 'asc' }
): Product[] {
    let result = [...products];
    
    // Apply filters
    if (filters.category) {
        result = result.filter(p => p.category.name === filters.category);
    }
    
    if (filters.minPrice !== undefined) {
        result = result.filter(p => p.price >= filters.minPrice!);
    }
    
    if (filters.maxPrice !== undefined) {
        result = result.filter(p => p.price <= filters.maxPrice!);
    }
    
    // Apply sorting
    result.sort((a, b) => {
        const aVal = a[sorting.field];
        const bVal = b[sorting.field];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sorting.direction === 'desc' ? -comparison : comparison;
    });
    
    return result;
}

/**
 * Arrow function for calculating totals
 */
export const calculateProductTotal = (products: Product[]): number => {
    return products.reduce((sum, product) => sum + product.price, 0);
};

/**
 * Higher-order function returning a validator
 */
export function createUserValidator(
    rules: { minNameLength?: number; emailPattern?: RegExp }
): (user: User) => boolean {
    return function(user: User): boolean {
        if (rules.minNameLength && user.name.length < rules.minNameLength) {
            return false;
        }
        if (rules.emailPattern && !rules.emailPattern.test(user.email)) {
            return false;
        }
        return true;
    };
}
`,
			},
			{
				name: "enums-types.ts",
				content: `
/**
 * User role enumeration
 */
export enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
    MODERATOR = 'moderator',
    GUEST = 'guest'
}

/**
 * Product status enum with numeric values
 */
export enum ProductStatus {
    DRAFT = 0,
    PUBLISHED = 1,
    ARCHIVED = 2,
    DELETED = 3
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

// Type aliases
export type Status = 'active' | 'inactive' | 'pending';
export type EventHandler<T> = (event: T) => void | Promise<void>;
export type UserPermissions = 'read' | 'write' | 'delete' | 'admin';

/**
 * Complex type with generics and unions
 */
export type DatabaseResult<T> = {
    success: true;
    data: T;
    count: number;
} | {
    success: false;
    error: string;
    code: number;
};

/**
 * Utility type for partial updates
 */
export type UpdatePayload<T> = Partial<T> & { id: string };

/**
 * Function type with optional parameters
 */
export type SearchFunction<T> = (
    query: string, 
    options?: { 
        limit?: number; 
        offset?: number; 
        sortBy?: keyof T 
    }
) => Promise<T[]>;
`,
			},
			{
				name: "constants.ts",
				content: `
import { UserRole, ProductStatus, HttpStatus } from './enums-types';

/**
 * API configuration constants
 */
export const API_CONFIG = {
    BASE_URL: 'https://api.example.com',
    VERSION: 'v1',
    TIMEOUT: 5000,
    RETRY_ATTEMPTS: 3
} as const;

/**
 * Default user settings
 */
export const DEFAULT_USER_SETTINGS = {
    theme: 'light',
    language: 'en',
    notifications: true,
    autoSave: false
};

/**
 * Product category mappings
 */
export const PRODUCT_CATEGORIES = {
    ELECTRONICS: 'electronics',
    CLOTHING: 'clothing',
    BOOKS: 'books',
    HOME: 'home',
    SPORTS: 'sports'
} as const;

/**
 * Validation patterns
 */
export const VALIDATION_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^\+?[1-9]\d{1,14}$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
};

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_PASSWORD: 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers',
    USER_NOT_FOUND: 'User not found',
    UNAUTHORIZED: 'Unauthorized access',
    INTERNAL_ERROR: 'An internal error occurred'
};

// Exported variables
export let globalCounter: number = 0;
export let featureFlags: Record<string, boolean> = {
    enableNewFeature: false,
    useNewAPI: true,
    debugMode: false
};

// Complex constant with nested structure
export const APPLICATION_CONFIG = {
    app: {
        name: 'Test Application',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    },
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        ssl: process.env.NODE_ENV === 'production'
    },
    cache: {
        ttl: 3600,
        maxSize: 1000
    }
};
`,
			},
			{
				name: "namespaces.ts",
				content: `
/**
 * Utility namespace with nested functionality
 */
export namespace Utils {
    /**
     * String manipulation utilities
     */
    export namespace Strings {
        /**
         * Capitalize first letter of a string
         */
        export function capitalize(str: string): string {
            return str.charAt(0).toUpperCase() + str.slice(1);
        }
        
        /**
         * Convert string to camelCase
         */
        export function toCamelCase(str: string): string {
            return str.replace(/[-_]+(.)?/g, (_, char) => char ? char.toUpperCase() : '');
        }
        
        /**
         * Convert string to kebab-case
         */
        export function toKebabCase(str: string): string {
            return str.replace(/[A-Z]/g, letter => \`-\${letter.toLowerCase()}\`);
        }
        
        /**
         * Check if string is empty or whitespace
         */
        export const isEmpty = (str: string): boolean => !str || !str.trim();
        
        /**
         * Truncate string to specified length
         */
        export const truncate = (str: string, length: number): string => 
            str.length > length ? str.substring(0, length) + '...' : str;
    }
    
    /**
     * Array manipulation utilities
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
        
        /**
         * Flatten nested arrays
         */
        export function flatten<T>(arr: (T | T[])[]): T[] {
            return arr.reduce<T[]>((acc, val) => 
                Array.isArray(val) ? acc.concat(flatten(val)) : acc.concat(val), []);
        }
    }
    
    /**
     * Date and time utilities
     */
    export const DateTime = {
        /**
         * Format date to ISO string
         */
        toISO: (date: Date): string => date.toISOString(),
        
        /**
         * Calculate days between two dates
         */
        daysBetween: (date1: Date, date2: Date): number => {
            const diffTime = Math.abs(date2.getTime() - date1.getTime());
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        },
        
        /**
         * Check if date is today
         */
        isToday: (date: Date): boolean => {
            const today = new Date();
            return date.toDateString() === today.toDateString();
        },
        
        /**
         * Add days to a date
         */
        addDays: (date: Date, days: number): Date => {
            const result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
        }
    };
    
    /**
     * Object manipulation utilities
     */
    export namespace Objects {
        /**
         * Deep clone an object
         */
        export function deepClone<T>(obj: T): T {
            return JSON.parse(JSON.stringify(obj));
        }
        
        /**
         * Merge two objects deeply
         */
        export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
            const output = { ...target };
            Object.keys(source).forEach(key => {
                const typedKey = key as keyof T;
                if (source[typedKey] && typeof source[typedKey] === 'object') {
                    if (typedKey in target) {
                        (output as any)[typedKey] = deepMerge(target[typedKey] as any, source[typedKey] as any);
                    } else {
                        (output as any)[typedKey] = source[typedKey];
                    }
                } else {
                    (output as any)[typedKey] = source[typedKey];
                }
            });
            return output;
        }
        
        /**
         * Pick specific keys from object
         */
        export function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
            const result = {} as Pick<T, K>;
            keys.forEach(key => {
                if (key in obj) {
                    result[key] = obj[key];
                }
            });
            return result;
        }
    }
}

/**
 * Validation namespace
 */
export namespace Validators {
    export function isEmail(email: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    export function isUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
    
    export function isPhoneNumber(phone: string): boolean {
        return /^\+?[1-9]\d{1,14}$/.test(phone);
    }
    
    export const PasswordRules = {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false
    };
    
    export function validatePassword(password: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        if (password.length < PasswordRules.minLength) {
            errors.push(\`Password must be at least \${PasswordRules.minLength} characters long\`);
        }
        
        if (PasswordRules.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }
        
        if (PasswordRules.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }
        
        if (PasswordRules.requireNumbers && !/\d/.test(password)) {
            errors.push('Password must contain at least one number');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}
`,
			},
		]

		// Write all test files
		for (const file of testFiles) {
			const filePath = path.join(testDir, file.name)
			fs.writeFileSync(filePath, file.content)
		}

		// Open one of the files to ensure the language server is active
		const firstFileUri = vscode.Uri.file(path.join(testDir, testFiles[0].name))
		const doc = await vscode.workspace.openTextDocument(firstFileUri)
		await vscode.window.showTextDocument(doc)

		// Wait for language server to initialize
		await new Promise((resolve) => setTimeout(resolve, 3000))

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test getting symbols overview for the test directory
		const relativePath = ".test-files/symbols-overview-test"
		const getSymbolsOverviewParams = {
			relative_path: relativePath,
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "get_symbols_overview",
				_text: JSON.stringify(getSymbolsOverviewParams),
			},
		}

		// Execute the test with timeout protection
		await runTestWithTimeout(async () => {
			await lspTool(mockTask as any, block, mockAskApproval, mockHandleError, mockPushResult)
		}, 30000) // 30 second timeout for this comprehensive test

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
			const symbolsOverview = resultData.data

			// For get_symbols_overview, we expect an object mapping file paths to symbol arrays
			if (!symbolsOverview || typeof symbolsOverview !== "object") {
				return {
					tool,
					passed: false,
					error: "Symbols overview should be an object mapping file paths to symbols",
					details: { symbolsOverview, resultData },
				}
			}

			// Check if the overview contains our test files
			const overviewKeys = Object.keys(symbolsOverview)
			const expectedFiles = testFiles.map((f) => f.name)

			if (overviewKeys.length === 0) {
				return {
					tool,
					passed: false,
					error: "No files found in symbols overview - unexpected for test directory with multiple files",
					details: { symbolsOverview, resultData, expectedFiles },
				}
			}

			// Validate the structure of the overview
			const validationErrors: string[] = []
			let totalSymbols = 0
			const foundSymbolTypes: string[] = []
			const fileSymbolCounts: Record<string, number> = {}

			// Symbol kind mapping (based on VSCode SymbolKind enum)
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

			for (const [filePath, symbols] of Object.entries(symbolsOverview)) {
				if (!Array.isArray(symbols)) {
					validationErrors.push(`Symbols for file '${filePath}' should be an array`)
					continue
				}

				fileSymbolCounts[filePath] = symbols.length
				totalSymbols += symbols.length

				// Validate each symbol in the file
				symbols.forEach((symbol: any, index: number) => {
					if (typeof symbol.name !== "string") {
						validationErrors.push(`Symbol ${index} in '${filePath}' missing or invalid 'name' property`)
					}

					if (typeof symbol.kind !== "number") {
						validationErrors.push(
							`Symbol '${symbol.name}' in '${filePath}' missing or invalid 'kind' property`,
						)
					} else {
						const symbolType = symbolKindMap[symbol.kind] || `Unknown(${symbol.kind})`
						if (!foundSymbolTypes.includes(symbolType)) {
							foundSymbolTypes.push(symbolType)
						}
					}
				})
			}

			// Check for validation errors
			if (validationErrors.length > 0) {
				return {
					tool,
					passed: false,
					error: `Symbol validation errors found: ${validationErrors.join("; ")}`,
					details: {
						validationErrors,
						foundSymbolTypes,
						totalSymbols,
						fileSymbolCounts,
						symbolsOverview,
						resultData,
					},
				}
			}

			// Check if we found symbols from our expected test files
			const expectedSymbols = [
				"User",
				"Product",
				"ApiResponse", // Interfaces
				"BaseRepository",
				"UserRepository",
				"ProductService", // Classes
				"formatUserName",
				"fetchUserData",
				"transformData",
				"processProducts", // Functions
				"UserRole",
				"ProductStatus",
				"HttpStatus", // Enums
				"API_CONFIG",
				"DEFAULT_USER_SETTINGS", // Constants
				"Utils",
				"Validators", // Namespaces
			]

			const allSymbolNames: string[] = []
			Object.values(symbolsOverview).forEach((symbols: any) => {
				if (Array.isArray(symbols)) {
					symbols.forEach((symbol: any) => {
						if (symbol.name) {
							allSymbolNames.push(symbol.name)
						}
					})
				}
			})

			const foundExpectedSymbols = expectedSymbols.filter((expected) => allSymbolNames.includes(expected))

			// We should find a good portion of our expected symbols
			if (foundExpectedSymbols.length < expectedSymbols.length * 0.5) {
				return {
					tool,
					passed: false,
					error: `Expected to find more symbols from test files. Found: ${foundExpectedSymbols.length}/${expectedSymbols.length}`,
					details: {
						expectedSymbols,
						foundExpectedSymbols,
						allSymbolNames,
						foundSymbolTypes,
						totalSymbols,
						fileSymbolCounts,
						symbolsOverview,
						resultData,
					},
				}
			}

			// Check if we found essential symbol types
			const essentialTypes = ["Interface", "Class", "Function", "Enum", "Constant"]
			const foundEssentialTypes = essentialTypes.filter((type) => foundSymbolTypes.includes(type))

			if (foundEssentialTypes.length < essentialTypes.length * 0.7) {
				return {
					tool,
					passed: false,
					error: `Missing essential symbol types. Expected most of: ${essentialTypes.join(", ")}. Found: ${foundEssentialTypes.join(", ")}`,
					details: {
						essentialTypes,
						foundEssentialTypes,
						foundSymbolTypes,
						totalSymbols,
						fileSymbolCounts,
						symbolsOverview,
						resultData,
					},
				}
			}

			// Check if multiple files were processed
			if (overviewKeys.length < 2) {
				return {
					tool,
					passed: false,
					error: `Expected multiple files in overview. Found: ${overviewKeys.length}`,
					details: {
						overviewKeys,
						expectedFiles,
						totalSymbols,
						fileSymbolCounts,
						symbolsOverview,
						resultData,
					},
				}
			}

			// Success: we found valid symbols overview with expected structure and content
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully retrieved symbols overview for ${overviewKeys.length} files with ${totalSymbols} total symbols`,
					totalSymbols,
					filesProcessed: overviewKeys.length,
					foundSymbolTypes,
					allSymbolNames: allSymbolNames.slice(0, 20), // Limit to first 20 for readability
					foundExpectedSymbols,
					expectedSymbolsRatio: `${foundExpectedSymbols.length}/${expectedSymbols.length}`,
					fileSymbolCounts,
					overviewKeys,
					hasMultipleFiles: overviewKeys.length > 1,
					hasExpectedSymbolTypes: foundEssentialTypes.length >= essentialTypes.length * 0.7,
					sampleOverview: Object.fromEntries(
						Object.entries(symbolsOverview)
							.slice(0, 2)
							.map(([file, symbols]) => [file, Array.isArray(symbols) ? symbols.slice(0, 3) : symbols]),
					),
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
