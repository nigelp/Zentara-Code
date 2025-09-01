/**
 * Utility functions for generating consistent colors for subagent types
 */

export interface SubagentTypeColor {
	background: string
	text: string
	border: string
	rgb: string // For rgba operations
}

export interface ColorMappingOptions {
	theme?: "light" | "dark" | "auto"
	fallbackColor?: string
	predefinedColors?: Record<string, string>
}

// Predefined colors for common subagent types
const PREDEFINED_COLORS = {
	"code-reviewer": "#4CAF50", // Green - approval/validation
	"bug-investigator": "#FF5722", // Red-orange - debugging
	"documentation-writer": "#2196F3", // Blue - information
	"security-auditor": "#FF9800", // Orange - warning/security
	"performance-optimizer": "#9C27B0", // Purple - enhancement
	"test-writer": "#795548", // Brown - testing
	"refactoring-expert": "#607D8B", // Blue-grey - restructuring
	"api-designer": "#00BCD4", // Cyan - interfaces
} as const

// Icons for common subagent types
export const SUBAGENT_ICONS = {
	"code-reviewer": "🔍",
	"bug-investigator": "🐛",
	"documentation-writer": "📝",
	"security-auditor": "🔒",
	"performance-optimizer": "⚡",
	"test-writer": "🧪",
	"refactoring-expert": "🔧",
	"api-designer": "🌐",
} as const

/**
 * Simple string hashing function for consistent color generation
 */
function hashString(str: string): number {
	let hash = 0
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash = hash & hash // Convert to 32-bit integer
	}
	return Math.abs(hash)
}

/**
 * Convert HSL to RGB for CSS custom properties
 */
function hslToRgb(h: number, s: number, l: number): string {
	const c = (1 - Math.abs(2 * l - 1)) * s
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
	const m = l - c / 2

	let r = 0,
		g = 0,
		b = 0

	if (0 <= h && h < 60) {
		r = c
		g = x
		b = 0
	} else if (60 <= h && h < 120) {
		r = x
		g = c
		b = 0
	} else if (120 <= h && h < 180) {
		r = 0
		g = c
		b = x
	} else if (180 <= h && h < 240) {
		r = 0
		g = x
		b = c
	} else if (240 <= h && h < 300) {
		r = x
		g = 0
		b = c
	} else if (300 <= h && h < 360) {
		r = c
		g = 0
		b = x
	}

	r = Math.round((r + m) * 255)
	g = Math.round((g + m) * 255)
	b = Math.round((b + m) * 255)

	return `${r}, ${g}, ${b}`
}

/**
 * Detect if the current theme is dark based on CSS custom properties
 */
function isDarkTheme(): boolean {
	// Try to detect from VSCode CSS variables
	if (typeof document !== "undefined") {
		const style = getComputedStyle(document.documentElement)
		const bgColor = style.getPropertyValue("--vscode-editor-background")
		if (bgColor) {
			// Simple heuristic: if background is dark, it's a dark theme
			const rgb = bgColor.match(/\d+/g)
			if (rgb && rgb.length >= 3) {
				const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3
				return brightness < 128
			}
		}
	}

	// Fallback detection
	return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
}

/**
 * Generate colors for a subagent type with theme awareness
 */
export function getSubagentTypeColor(
	subagentType: string | null | undefined,
	options: ColorMappingOptions = {},
): SubagentTypeColor {
	// Handle null/undefined
	if (!subagentType) {
		const fallback = options.fallbackColor || "#6B7280" // Default gray
		return {
			background: isDarkTheme() ? "#374151" : "#F3F4F6",
			text: isDarkTheme() ? "#D1D5DB" : "#374151",
			border: fallback,
			rgb: "107, 114, 128",
		}
	}

	// Check for predefined colors first
	const predefinedColors = { ...PREDEFINED_COLORS, ...options.predefinedColors }
	const predefinedColor = predefinedColors[subagentType as keyof typeof predefinedColors]

	if (predefinedColor) {
		// Convert hex to RGB
		const hex = predefinedColor.replace("#", "")
		const r = parseInt(hex.substr(0, 2), 16)
		const g = parseInt(hex.substr(2, 2), 16)
		const b = parseInt(hex.substr(4, 2), 16)
		const rgb = `${r}, ${g}, ${b}`

		const darkTheme = isDarkTheme()

		return {
			background: darkTheme ? `rgba(${rgb}, 0.2)` : `rgba(${rgb}, 0.1)`,
			text: darkTheme
				? `rgba(${rgb}, 0.9)`
				: `rgba(${Math.floor(r * 0.6)}, ${Math.floor(g * 0.6)}, ${Math.floor(b * 0.6)}, 1)`,
			border: predefinedColor,
			rgb,
		}
	}

	// Generate color from hash
	const hash = hashString(subagentType)
	const hue = hash % 360
	const saturation = 0.65 // Fixed saturation for consistency
	const lightness = isDarkTheme() ? 0.6 : 0.45 // Adjust for theme

	const rgb = hslToRgb(hue, saturation, lightness)
	const darkTheme = isDarkTheme()

	return {
		background: darkTheme ? `rgba(${rgb}, 0.2)` : `rgba(${rgb}, 0.1)`,
		text: darkTheme ? `rgba(${rgb}, 0.9)` : `rgba(${rgb}, 1)`,
		border: `rgb(${rgb})`,
		rgb,
	}
}

/**
 * Get icon for a subagent type
 */
export function getSubagentTypeIcon(subagentType: string | null | undefined): string {
	if (!subagentType) return "🤖"
	return SUBAGENT_ICONS[subagentType as keyof typeof SUBAGENT_ICONS] || "🤖"
}
