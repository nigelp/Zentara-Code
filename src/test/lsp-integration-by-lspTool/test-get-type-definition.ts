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

export async function testGetTypeDefinition(): Promise<TestResult> {
	const tool = "get_type_definition"

	try {
		// Create test TypeScript file with custom types, interfaces, and variables that use them
		const testContent = `
// Test file for get type definition functionality
// This file contains various type definitions and their usages

/**
 * A user profile interface
 */
export interface UserProfile {
    /** User's unique identifier */
    id: number;
    /** User's display name */
    name: string;
    /** User's email address */
    email: string;
    /** User's account settings */
    settings: UserSettings;
    /** User's preferences */
    preferences: UserPreferences;
}

/**
 * User settings type definition
 */
export type UserSettings = {
    /** Theme preference */
    theme: 'light' | 'dark' | 'auto';
    /** Language preference */
    language: string;
    /** Notification settings */
    notifications: {
        email: boolean;
        push: boolean;
        sms: boolean;
    };
    /** Privacy settings */
    privacy: PrivacySettings;
};

/**
 * Privacy settings interface
 */
export interface PrivacySettings {
    /** Profile visibility */
    profileVisible: boolean;
    /** Data sharing consent */
    dataSharing: boolean;
    /** Analytics tracking consent */
    analytics: boolean;
}

/**
 * User preferences type alias
 */
export type UserPreferences = {
    /** Dashboard layout preference */
    layout: 'grid' | 'list' | 'compact';
    /** Items per page */
    itemsPerPage: number;
    /** Default sort order */
    sortOrder: 'asc' | 'desc';
    /** Favorite categories */
    favoriteCategories: string[];
};

/**
 * Application configuration type
 */
export type AppConfig = {
    /** Application version */
    version: string;
    /** API endpoint URLs */
    endpoints: {
        api: string;
        auth: string;
        cdn: string;
    };
    /** Feature flags */
    features: FeatureFlags;
};

/**
 * Feature flags interface
 */
export interface FeatureFlags {
    /** New dashboard enabled */
    newDashboard: boolean;
    /** Beta features enabled */
    betaFeatures: boolean;
    /** Advanced analytics enabled */
    advancedAnalytics: boolean;
}

/**
 * Generic response wrapper type
 */
export type ApiResponse<T> = {
    /** Response status */
    success: boolean;
    /** Response data of generic type T */
    data?: T;
    /** Error message if any */
    error?: string;
    /** Response metadata */
    metadata: {
        timestamp: number;
        requestId: string;
    };
};

/**
 * Database entity base type
 */
export type BaseEntity = {
    /** Entity ID */
    id: number;
    /** Creation timestamp */
    createdAt: Date;
    /** Last update timestamp */
    updatedAt: Date;
    /** Soft delete flag */
    isDeleted: boolean;
};

/**
 * Extended user entity that inherits from BaseEntity
 */
export type UserEntity = BaseEntity & {
    /** User profile data */
    profile: UserProfile;
    /** Account status */
    status: 'active' | 'inactive' | 'suspended';
    /** Last login timestamp */
    lastLogin?: Date;
};

// Variable declarations using the custom types - these are our test targets
// We'll test type definition from these variable usages

/**
 * Sample user profile instance
 */
const sampleUser: UserProfile = {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
    settings: {
        theme: 'dark',
        language: 'en',
        notifications: {
            email: true,
            push: false,
            sms: false
        },
        privacy: {
            profileVisible: true,
            dataSharing: false,
            analytics: true
        }
    },
    preferences: {
        layout: 'grid',
        itemsPerPage: 20,
        sortOrder: 'asc',
        favoriteCategories: ['tech', 'science']
    }
};

/**
 * Application configuration instance
 */
const appConfig: AppConfig = {
    version: "1.0.0",
    endpoints: {
        api: "https://api.example.com",
        auth: "https://auth.example.com",
        cdn: "https://cdn.example.com"
    },
    features: {
        newDashboard: true,
        betaFeatures: false,
        advancedAnalytics: true
    }
};

/**
 * User settings instance
 */
const defaultSettings: UserSettings = {
    theme: 'auto',
    language: 'en',
    notifications: {
        email: true,
        push: true,
        sms: false
    },
    privacy: {
        profileVisible: false,
        dataSharing: false,
        analytics: false
    }
};

/**
 * API response instance using generic type
 */
const userResponse: ApiResponse<UserProfile> = {
    success: true,
    data: sampleUser,
    metadata: {
        timestamp: Date.now(),
        requestId: "req-123"
    }
};

/**
 * User entity instance
 */
const userEntity: UserEntity = {
    id: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
    profile: sampleUser,
    status: 'active',
    lastLogin: new Date()
};

/**
 * Function that processes user profiles
 */
function processUserProfile(user: UserProfile): UserProfile {
    return {
        ...user,
        settings: {
            ...user.settings,
            theme: 'light'
        }
    };
}

/**
 * Function that uses various types
 */
function demonstrateTypeUsage() {
    // Variable with UserProfile type - test type definition from here (line 165)
    const profile: UserProfile = sampleUser;
    
    // Variable with UserSettings type - test type definition from here (line 168)
    const settings: UserSettings = defaultSettings;
    
    // Variable with PrivacySettings type - test type definition from here (line 171)
    const privacy: PrivacySettings = settings.privacy;
    
    // Variable with generic ApiResponse type - test type definition from here (line 174)
    const response: ApiResponse<UserEntity> = {
        success: true,
        data: userEntity,
        metadata: {
            timestamp: Date.now(),
            requestId: "req-456"
        }
    };
    
    // Variable with FeatureFlags type - test type definition from here (line 184)
    const flags: FeatureFlags = appConfig.features;
    
    return { profile, settings, privacy, response, flags };
}
`

		const testUri = await createTestFile("test-get-type-definition.ts", testContent)

		// Mock implementations for lspTool parameters
		const mockTask = new MockTask()
		let capturedResult = ""

		const mockPushResult = (result: string) => {
			capturedResult = result
			mockPushToolResult(result)
		}

		// Test getting type definition for 'UserProfile' type from variable declaration at line 165
		// Position points to the type annotation "UserProfile" in "const profile: UserProfile = sampleUser;"
		const getTypeDefinitionParams = {
			textDocument: {
				uri: testUri.toString(),
			},
			position: {
				line: 145, // Line where "const profile: UserProfile = sampleUser;" is (0-based indexing)
				character: 25, // Character position pointing to "UserProfile" in the type annotation
			},
		}

		const block = {
			name: "lsp" as const,
			params: {
				lsp_operation: "get_type_definition",
				_text: JSON.stringify(getTypeDefinitionParams),
			},
		}

		// Execute the test with timeout protection
		await runTestWithTimeout(async () => {
			await lspTool(mockTask as any, block, mockAskApproval, mockHandleError, mockPushResult)
		}, 15000) // 15 second timeout

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
			const locations = resultData.data

			if (!Array.isArray(locations)) {
				return {
					tool,
					passed: false,
					error: "Expected locations array in result data",
					details: resultData,
				}
			}

			// For get_type_definition, we expect at least one location (the type definition)
			if (locations.length === 0) {
				return {
					tool,
					passed: false,
					error: "No type definition location found for UserProfile",
					details: { locations, resultData },
				}
			}

			// Check that each location has the expected structure
			const validLocations = locations.every(
				(location) =>
					location.uri &&
					typeof location.range === "object" &&
					typeof location.range.start === "object" &&
					typeof location.range.end === "object" &&
					typeof location.range.start.line === "number" &&
					typeof location.range.start.character === "number",
			)

			if (!validLocations) {
				return {
					tool,
					passed: false,
					error: "Location objects do not have expected structure",
					details: { locations, resultData },
				}
			}

			// Verify the type definition location is reasonable
			// The UserProfile interface should be defined around line 9 (0-based: line 8)
			const typeDefinitionLocation = locations[0]
			const expectedLine = 7 // Line where 'export interface UserProfile' is defined (0-based)

			// Allow some tolerance in line numbers due to potential LSP differences
			const actualLine = typeDefinitionLocation.range.start.line
			const lineTolerance = 3 // Allow 3 lines of difference

			if (Math.abs(actualLine - expectedLine) > lineTolerance) {
				return {
					tool,
					passed: false,
					error: `Type definition found at unexpected line. Expected around line ${expectedLine}, got line ${actualLine}`,
					details: {
						expectedLine,
						actualLine,
						tolerance: lineTolerance,
						locations,
						resultData,
					},
				}
			}

			// Verify the type definition points to the same file
			const definitionUri = typeDefinitionLocation.uri
			if (!definitionUri.includes("test-get-type-definition.ts")) {
				return {
					tool,
					passed: false,
					error: `Type definition found in unexpected file: ${definitionUri}`,
					details: {
						expectedFile: "test-get-type-definition.ts",
						actualUri: definitionUri,
						locations,
						resultData,
					},
				}
			}

			// Success: we found the type definition at a reasonable location
			return {
				tool,
				passed: true,
				details: {
					message: `Successfully found type definition of UserProfile at line ${actualLine}`,
					typeDefinitionLocation: {
						uri: typeDefinitionLocation.uri,
						line: typeDefinitionLocation.range.start.line,
						character: typeDefinitionLocation.range.start.character,
					},
					locationCount: locations.length,
					allLocations: locations.map((loc) => ({
						uri: loc.uri,
						line: loc.range.start.line,
						character: loc.range.start.character,
					})),
					testedFrom: {
						line: getTypeDefinitionParams.position.line,
						character: getTypeDefinitionParams.position.character,
						context: "UserProfile type annotation in variable declaration",
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
