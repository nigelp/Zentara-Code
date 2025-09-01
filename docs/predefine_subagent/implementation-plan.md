# Implementation Plan: Predefined Subagents Enhancement

## Overview

This document outlines the implementation plan for adding predefined subagent support to the existing subagent tool in Zentara Code. Based on the integration guide (`src/roo_debug/integrating_new_tool.md`), since we're enhancing an existing tool rather than creating a new one, the implementation is straightforward and requires minimal changes.

## Implementation Strategy

We are following **Part 1: Simple Tool Enhancement** from the integration guide, as we're adding functionality to an existing tool rather than creating a new tool group.

## Required Changes

### Phase 1: Core Logic Enhancement (1-2 days)

#### 1.1 Extend SubAgentParams Interface
**File**: `src/core/tools/subagentTool.ts`

Add the optional `subagent_type` parameter to the existing interface:

```typescript
interface SubAgentParams {
    description?: string
    message?: string
    subagent_type?: string  // NEW: Optional predefined type
    writePermissions?: boolean
    allowedWritePaths?: string[]
    maxExecutionTime?: number
    priority?: string
    outputSchema?: any
    _text?: string
}
```

#### 1.2 Add File System Utilities
**File**: `src/core/tools/subagentFileUtils.ts` (new file)

Create utilities for:
- Reading predefined subagent files
- Parsing YAML frontmatter
- File discovery with priority resolution
- Error handling for malformed files

```typescript
export interface SubagentDefinition {
    name: string
    description: string
    prompt: string
}

export async function findSubagentDefinition(subagentType: string): Promise<SubagentDefinition | null>
export async function parseSubagentFile(filePath: string): Promise<SubagentDefinition>
```

#### 1.3 Enhance Subagent Tool Logic
**File**: `src/core/tools/subagentTool.ts`

Add logic after parameter validation (around line 78):

```typescript
// NEW: Handle predefined subagent types
for (let i = 0; i < subagentParams.length; i++) {
    const params = subagentParams[i]
    
    if (params.subagent_type) {
        try {
            const subagentDef = await findSubagentDefinition(params.subagent_type)
            if (subagentDef) {
                // Combine predefined prompt with user message
                params.message = `${subagentDef.prompt}\n\n## Current Task\n\n${params.message}`
            } else {
                // Log warning but continue with user message only
                console.warn(`Predefined subagent type '${params.subagent_type}' not found`)
            }
        } catch (error) {
            // Log error but don't fail - graceful degradation
            console.error(`Error loading subagent type '${params.subagent_type}':`, error)
        }
    }
}
```

### Phase 2: Validation and Error Handling (0.5 days)

#### 2.1 Update Parameter Validation
**File**: `src/roo_subagent/src/subagentValidation.ts`

Add validation for the new `subagent_type` parameter if this file handles validation, or update validation in `subagentTool.ts` directly.

#### 2.2 Add Comprehensive Error Handling
Handle cases like:
- Missing subagent files
- Invalid YAML frontmatter
- File permission issues
- Malformed configuration files

### Phase 3: File System Implementation (1 day)

#### 3.1 Create Directory Structure Support
Implement the three-tier hierarchy:
- Internal: `src/roo_subagent/src/agents/`
- Project: `.zentara/agents/`
- User: `~/.zentara/agents/`

#### 3.2 File Discovery Algorithm
```typescript
async function findSubagentFile(subagentType: string): Promise<string | null> {
    const searchPaths = [
        path.join(process.cwd(), 'src/roo_subagent/src/agents', `${subagentType}.md`),
        path.join(process.cwd(), '.zentara/agents', `${subagentType}.md`),
        path.join(os.homedir(), '.zentara/agents', `${subagentType}.md`)
    ]
    
    for (const filePath of searchPaths) {
        if (await fileExists(filePath)) {
            return filePath
        }
    }
    return null
}
```

#### 3.3 YAML Frontmatter Parsing
Use existing YAML parsing libraries or implement simple frontmatter extraction:

```typescript
function parseMarkdownWithFrontmatter(content: string): { frontmatter: any, body: string } {
    const match = content.match(/^---\n(.*?)\n---\n([\s\S]*)$/);
    if (!match) throw new Error('Invalid frontmatter format');
    
    return {
        frontmatter: yaml.parse(match[1]),
        body: match[2].trim()
    };
}
```

### Phase 4: Optional Enhancements (1 day)

#### 4.1 Caching System
Add simple in-memory caching for parsed subagent definitions to improve performance.

#### 4.2 Development Tools
- Add CLI command to list available predefined subagents
- Add validation tool for subagent configuration files

## Files to Modify/Create

### Core Changes (Required)
1. **`src/core/tools/subagentTool.ts`** - Main enhancement
2. **`src/core/tools/subagentFileUtils.ts`** - New utility file
3. **`src/roo_subagent/src/subagentValidation.ts`** - Update validation (if applicable)

### Dependencies
- Add YAML parsing library if not already available
- Use existing filesystem utilities from the codebase

## Testing Strategy

### Unit Tests
- Test file discovery algorithm with different scenarios
- Test YAML frontmatter parsing with valid/invalid inputs
- Test prompt combination logic
- Test error handling for missing files

### Integration Tests
- Test full subagent workflow with predefined types
- Test backward compatibility with existing subagent usage
- Test priority resolution between different file locations

### Example Test Cases
```typescript
describe('Predefined Subagents', () => {
    it('should combine predefined prompt with user message', async () => {
        // Test prompt combination
    })
    
    it('should handle missing subagent type gracefully', async () => {
        // Test error handling
    })
    
    it('should respect priority order (internal > project > user)', async () => {
        // Test file discovery priority
    })
    
    it('should work normally when subagent_type is omitted', async () => {
        // Test backward compatibility
    })
})
```

## Deployment Considerations

### Backward Compatibility
- **Zero Breaking Changes**: All existing subagent usage continues to work exactly as before
- **Optional Enhancement**: `subagent_type` parameter is completely optional
- **Graceful Degradation**: System continues working even if predefined subagents fail to load

### Migration Path
1. **Development**: Implement core functionality
2. **Internal Testing**: Test with internal predefined subagents
3. **User Documentation**: Create guides for creating custom subagents
4. **Gradual Rollout**: Users can adopt predefined subagents at their own pace

## Example Implementation Snippets

### Enhanced Parameter Processing
```typescript
// In subagentTool.ts, after existing validation
for (let i = 0; i < subagentParams.length; i++) {
    const params = subagentParams[i]
    
    // Handle predefined subagent types
    if (params.subagent_type) {
        const definition = await findSubagentDefinition(params.subagent_type)
        if (definition) {
            params.message = `${definition.prompt}\n\n## Current Task\n\n${params.message}`
        }
    }
}
```

### File Discovery Implementation
```typescript
async function findSubagentDefinition(subagentType: string): Promise<SubagentDefinition | null> {
    const filePath = await findSubagentFile(subagentType)
    if (!filePath) return null
    
    try {
        const content = await fs.readFile(filePath, 'utf-8')
        return parseSubagentFile(content)
    } catch (error) {
        console.error(`Error reading subagent file ${filePath}:`, error)
        return null
    }
}
```

## Success Metrics

### Functional Requirements Met
- [ ] `subagent_type` parameter added and functional
- [ ] Three-tier file discovery working correctly
- [ ] YAML frontmatter parsing implemented
- [ ] Prompt combination logic working
- [ ] Error handling implemented
- [ ] Backward compatibility maintained

### Quality Assurance
- [ ] Unit tests passing with >90% coverage
- [ ] Integration tests covering all scenarios
- [ ] No breaking changes to existing functionality
- [ ] Performance impact minimal (<100ms overhead)

## Estimated Timeline

- **Phase 1**: 1-2 days (core logic)
- **Phase 2**: 0.5 days (validation)
- **Phase 3**: 1 day (file system)
- **Phase 4**: 1 day (enhancements)
- **Testing**: 1 day (comprehensive testing)

**Total**: 4-5 days for full implementation and testing

## Notes and Considerations

1. **Minimal Impact**: Since we're only enhancing an existing tool, no changes are needed to:
   - Tool registration files
   - Display name mappings
   - Prompt description files
   - UI components

2. **Simple Enhancement**: This is a straightforward parameter addition with file system integration, not a complex tool group creation.

3. **Graceful Handling**: All error conditions should degrade gracefully to maintain existing functionality.

4. **Performance**: File system operations should be cached appropriately and not significantly impact subagent startup time.

This implementation plan follows the "Simple Tool Enhancement" pattern from the integration guide, focusing on extending existing functionality rather than creating new infrastructure.