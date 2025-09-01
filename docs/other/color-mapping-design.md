# Color Mapping Function Design

## Overview

Create a deterministic color mapping function that converts `subagent_type` strings into consistent, visually distinct colors for UI display.

## Requirements

### Functional Requirements

1. **Deterministic**: Same `subagent_type` always produces the same color
2. **Distribution**: Even distribution across color spectrum to avoid clustering
3. **Accessibility**: WCAG AA compliant contrast ratios (4.5:1 minimum)
4. **Visual Distinction**: Colors should be easily distinguishable from each other
5. **Null Handling**: Graceful handling of undefined/null subagent_type values

### Technical Requirements

1. **Performance**: Fast execution for real-time UI updates
2. **Framework Agnostic**: Pure TypeScript/JavaScript implementation
3. **VSCode Integration**: Compatible with VSCode theme system
4. **CSS Variables**: Support for VSCode CSS custom properties

## Color Mapping Algorithm

### Hash Function

Use a simple but effective string hashing algorithm:

```typescript
function hashString(str: string): number {
	let hash = 0
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash = hash & hash // Convert to 32-bit integer
	}
	return Math.abs(hash)
}
```

### Color Generation Strategy

1. **HSL Color Space**: Use HSL for consistent saturation and lightness
2. **Hue Mapping**: Map hash to hue (0-360 degrees)
3. **Fixed Saturation**: 65% for vibrant but not overwhelming colors
4. **Fixed Lightness**: 55% for good contrast on both light/dark themes

### Predefined Color Palette

For common subagent types, use predefined colors:

```typescript
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
```

## UI Design Specifications

### Badge Component

```
[🔧 code-reviewer] Task description goes here
```

### Visual Properties

- **Shape**: Rounded rectangle badge
- **Padding**: 2px horizontal, 1px vertical
- **Font**: Small, semi-bold
- **Border**: 1px solid (slightly darker shade)
- **Icon**: Optional emoji/codicon prefix
- **Animation**: Subtle glow on hover

### CSS Structure

```css
.subagent-type-badge {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 6px;
	border-radius: 4px;
	font-size: 11px;
	font-weight: 600;
	margin-right: 8px;
	border: 1px solid;
	transition: all 0.2s ease;
}

.subagent-type-badge:hover {
	box-shadow: 0 0 4px rgba(var(--badge-color-rgb), 0.3);
}
```

## Implementation Architecture

### TypeScript Interface

```typescript
interface SubagentTypeColor {
	background: string
	text: string
	border: string
	rgb: string // For rgba operations
}

interface ColorMappingOptions {
	theme: "light" | "dark" | "auto"
	fallbackColor?: string
	predefinedColors?: Record<string, string>
}
```

### Function Signature

```typescript
function getSubagentTypeColor(subagentType: string | null | undefined, options?: ColorMappingOptions): SubagentTypeColor
```

## Accessibility Considerations

### Contrast Requirements

- **Light Theme**: Dark text on light background
- **Dark Theme**: Light text on dark background
- **Minimum Contrast**: 4.5:1 ratio (WCAG AA)

### Color Blind Support

- Avoid red/green combinations
- Include shape/icon differentiation
- Provide hover tooltips with type names

### Screen Reader Support

- Use `aria-label` attributes
- Include semantic meaning beyond color
- Provide text alternatives

## Integration Points

### Backend Changes Required

1. Add `subagent_type` to task object in `subagentTool.ts`
2. Update `SubagentInfo` interface in type definitions
3. Ensure messaging system passes through the field

### Frontend Changes Required

1. Update `SubagentInfo` interface
2. Modify `SubagentStack.tsx` component
3. Add color mapping utility function
4. Update CSS with badge styles
5. Add accessibility attributes

## Testing Strategy

### Unit Tests

- Hash function consistency
- Color generation edge cases
- Null/undefined handling
- Predefined color mapping

### Visual Tests

- Color contrast validation
- Theme compatibility
- Accessibility compliance
- Cross-browser rendering

### Integration Tests

- End-to-end subagent type display
- Real-time updates
- Performance with many subagents

## Future Considerations

### Customization

- User-defined color schemes
- Company/team branding colors
- Personal preference settings

### Enhancement Opportunities

- Gradient backgrounds
- Animated transitions
- Icon/emoji mapping
- Category-based grouping

### Performance Optimizations

- Color caching for repeated types
- Memoized hash calculations
- CSS custom property updates

## Conclusion

This design provides a robust, accessible, and visually appealing system for color-coding subagent types in the SubagentStack UI. The deterministic hash-based approach ensures consistency while the predefined colors offer semantic meaning for common types.
