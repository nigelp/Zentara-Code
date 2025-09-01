# Subagent Type UI Format Design

## Overview

This document specifies the exact UI format for displaying subagent types with color highlighting in the SubagentStack task descriptions.

## Current vs Proposed Design

### Current Format

```
● Task description goes here
```

### Proposed Format

```
[🔧 code-reviewer] ● Task description goes here
```

## Visual Layout Specifications

### Badge Positioning

- **Location**: Left of the activity indicator dot
- **Alignment**: Vertically centered with task description
- **Spacing**: 8px margin to the right of the badge

### Badge Structure

```
[icon subagent-type] ● description
│    │              │   │
│    │              │   └── Task description (unchanged)
│    │              └── Activity indicator (unchanged)
│    └── Subagent type name
└── Optional icon/emoji
```

### Size Specifications

- **Badge Height**: 20px (matches line height)
- **Badge Padding**: 4px horizontal, 2px vertical
- **Font Size**: 11px (smaller than description text)
- **Border Radius**: 4px
- **Border Width**: 1px

## Icon Mapping

### Predefined Subagent Icons

```typescript
const SUBAGENT_ICONS = {
	"code-reviewer": "🔍",
	"bug-investigator": "🐛",
	"documentation-writer": "📝",
	"security-auditor": "🔒",
	"performance-optimizer": "⚡",
	"test-writer": "🧪",
	"refactoring-expert": "🔧",
	"api-designer": "🌐",
} as const
```

### Fallback Icon

- **Default**: `🤖` for unknown/custom subagent types
- **None**: No icon if empty/null subagent_type

## Color Schemes

### Light Theme Colors

```css
/* Example for code-reviewer */
--badge-bg: #e8f5e8;
--badge-text: #2e7d32;
--badge-border: #4caf50;

/* Example for bug-investigator */
--badge-bg: #ffebee;
--badge-text: #c62828;
--badge-border: #f44336;
```

### Dark Theme Colors

```css
/* Example for code-reviewer */
--badge-bg: #1b2e1b;
--badge-text: #66bb6a;
--badge-border: #4caf50;

/* Example for bug-investigator */
--badge-bg: #2e1b1b;
--badge-text: #ef5350;
--badge-border: #f44336;
```

## Component Layout Examples

### With Subagent Type

```
┌─────────────────────────────────────────────────────────┐
│ [🔍 code-reviewer] ● Analyze authentication module      │
│                      └─ Running...                      │
└─────────────────────────────────────────────────────────┘
```

### Without Subagent Type (Current)

```
┌─────────────────────────────────────────────────────────┐
│ ● Analyze authentication module                         │
│   └─ Running...                                         │
└─────────────────────────────────────────────────────────┘
```

### Multiple Subagents with Different Types

```
┌─────────────────────────────────────────────────────────┐
│ [🔍 code-reviewer] ● Review PR changes                  │
│                      └─ Completed ✓                     │
│                                                         │
│ [🐛 bug-investigator] ● Find memory leak source         │
│                         └─ Running...                   │
│                                                         │
│ [📝 documentation-writer] ● Update API docs             │
│                             └─ Waiting to start         │
└─────────────────────────────────────────────────────────┘
```

## Responsive Behavior

### Mobile/Narrow Screens

- **Badge Truncation**: Show only icon, hide text on very narrow screens
- **Wrap Behavior**: Badge stays on same line as description
- **Min Width**: 24px (icon only)

### Wide Screens

- **Full Display**: Show icon + full subagent type name
- **Max Width**: No limit, natural text width
- **Ellipsis**: Not needed for badge text

## Interaction Design

### Hover States

```css
.subagent-type-badge:hover {
	/* Subtle glow effect */
	box-shadow: 0 0 4px rgba(var(--badge-color-rgb), 0.3);
	/* Slight scale increase */
	transform: scale(1.02);
	/* Show tooltip with full details */
	cursor: help;
}
```

### Tooltip Content

```
Code Reviewer
─────────────
Predefined agent for comprehensive
code quality analysis and security
review with best practices validation.
```

### Click Behavior

- **No Action**: Badges are informational only
- **Accessibility**: Focusable with keyboard navigation
- **Screen Reader**: Announce subagent type and description

## Implementation Structure

### HTML Structure

```html
<div class="subagent-item">
	<span
		class="subagent-type-badge"
		data-type="code-reviewer"
		aria-label="Code reviewer subagent"
		title="Predefined agent for code review">
		<span class="badge-icon">🔍</span>
		<span class="badge-text">code-reviewer</span>
	</span>
	<div class="activity-indicator running"></div>
	<span class="task-description">Analyze authentication module</span>
</div>
```

### CSS Class Structure

```css
.subagent-type-badge {
	/* Main badge container */
}
.badge-icon {
	/* Icon/emoji styling */
}
.badge-text {
	/* Text styling */
}
.subagent-item {
	/* Overall container */
}
```

## State Variations

### Loading State

- **Badge**: Normal appearance
- **Description**: "Initializing..." with pulse animation
- **Indicator**: Pulsing dot

### Running State

- **Badge**: Normal appearance
- **Description**: Current task description
- **Indicator**: Active pulsing dot

### Completed State

- **Badge**: Slight opacity reduction (0.8)
- **Description**: Final task description
- **Indicator**: Green checkmark

### Failed State

- **Badge**: Error styling (red tint)
- **Description**: Error message or last known description
- **Indicator**: Red error icon

## Animation Specifications

### Badge Entry

```css
@keyframes badge-enter {
	from {
		opacity: 0;
		transform: scale(0.8) translateX(-10px);
	}
	to {
		opacity: 1;
		transform: scale(1) translateX(0);
	}
}
```

### Color Transitions

```css
.subagent-type-badge {
	transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

## Accessibility Features

### ARIA Labels

```html
<span
	class="subagent-type-badge"
	role="img"
	aria-label="Code reviewer subagent type"
	aria-describedby="subagent-tooltip"></span>
```

### Keyboard Navigation

- **Tab Order**: Badge is focusable
- **Enter/Space**: Show detailed tooltip
- **Escape**: Hide tooltip

### Screen Reader Support

- **Announcement**: "Code reviewer subagent: Analyze authentication module"
- **Context**: Clear relationship between type and task
- **Status**: Include completion status in announcements

## Technical Implementation Notes

### CSS Custom Properties

```css
.subagent-type-badge {
	background: var(--subagent-badge-bg);
	color: var(--subagent-badge-text);
	border-color: var(--subagent-badge-border);
}
```

### Theme Integration

- Use VSCode's CSS custom properties system
- Automatic theme switching support
- High contrast mode compatibility

### Performance Considerations

- Lazy color calculation (only when needed)
- CSS-in-JS avoided for better performance
- Minimal DOM manipulation

## Future Enhancements

### v1.1 - Enhanced Features

- Custom user-defined colors
- Badge grouping by category
- Mini icons for quick identification

### v1.2 - Advanced Interactions

- Click to filter by subagent type
- Drag and drop reordering
- Batch operations on type groups

### v1.3 - Customization

- User preference settings
- Team/organization branding
- Plugin system for custom types

## Testing Requirements

### Visual Regression Tests

- Badge rendering in all themes
- Color contrast validation
- Responsive behavior testing

### Accessibility Tests

- Screen reader compatibility
- Keyboard navigation flow
- Color blind user testing

### Performance Tests

- Large numbers of subagents
- Rapid creation/completion cycles
- Memory usage monitoring

## Conclusion

This UI format design provides a clear, accessible, and visually appealing way to display subagent types alongside task descriptions. The badge-based approach maintains readability while adding valuable context about the type of AI agent handling each task.
