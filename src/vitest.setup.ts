import nock from "nock"
import { vi, beforeAll, afterAll, MockedFunction } from "vitest"
import { TelemetryService } from "@roo-code/telemetry"

import "./utils/path" // Import to enable String.prototype.toPosix().

// Disable network requests by default for all tests.
nock.disableNetConnect()

export function allowNetConnect(host?: string | RegExp) {
	if (host) {
		nock.enableNetConnect(host)
	} else {
		nock.enableNetConnect()
	}
}

// Global mocks that many tests expect.
global.structuredClone = global.structuredClone || ((obj: any) => JSON.parse(JSON.stringify(obj)))

// Add Jest compatibility layer for Vitest
;(globalThis as any).jest = {
	fn: vi.fn,
	clearAllMocks: vi.clearAllMocks,
	Mock: vi.fn as any,
	mock: vi.mock as any,
}

// Initialize TelemetryService for tests with empty clients array
beforeAll(() => {
	// Only create instance if one does not exist
	if (!TelemetryService.hasInstance()) {
		TelemetryService.createInstance([])
	}
})

afterAll(() => {
	// Clean up singleton instance
	if (TelemetryService.hasInstance()) {
		;(TelemetryService as any)._instance = null
	}
})
