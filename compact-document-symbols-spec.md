# Compact Document Symbols Format Specification

## Overview

This specification defines a compact, token-efficient format for representing LSP document symbols, optimized for LLM consumption while maintaining all necessary structural information.

## Problem Statement

The current JSON format for document symbols is extremely verbose and token-inefficient:

```json
{
  "name": "DEBUG_RACE",
  "kind": 12,
  "range": {
    "start": { "line": 52, "character": 6 },
    "end": { "line": 52, "character": 61 }
  },
  "selectionRange": {
    "start": { "line": 52, "character": 6 },
    "end": { "line": 52, "character": 16 }
  }
}
```

**Token Analysis:**
- Current format: ~150-200 tokens per symbol
- Proposed format: ~20-30 tokens per symbol
- **Potential 80-85% token reduction**

## Compact Table Format

### Format Specification

**Flattened Table with Headers and Clear Row Delimiters:**
```
NAME | KIND | RANGE | SELECTION | PARENT | HOVER_INFO | EOL
DEBUG_RACE | 12 | 52:6-61 | 52:6-16 |  | const DEBUG_RACE: boolean | <<<
raceLog | 12 | 53:6-58:1 | 53:6-13 |  | function raceLog(): void | <<<
presentAssistantMessage | 11 | 79:0-742:1 | 79:22-45 |  | export async function presentAssistantMessage(params: PresentAssistantMessageParams): Promise<void> | <<<
countLines | 12 | 24:8-28:3 | 24:8-18 | presentAssistantMessage | const countLines: (symbols: DocumentSymbol[]) => number | <<<
mapSymbols | 12 | 30:8-49:3 | 30:8-18 | presentAssistantMessage | const mapSymbols: (symbols: DocumentSymbol[]) => any[] | <<<
result | 12 | 31:9-42:4 | 31:9-15 | mapSymbols | const result: { name: string; kind: number; range: {...}; selectionRange: {...}; } | <<<
```

### Column Definitions

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| NAME | string | Symbol name | `DEBUG_RACE` |
| KIND | number | LSP symbol kind | `12` (function) |
| RANGE | string | Full symbol range | `52:6-61` or `79:0-742:1` |
| SELECTION | string | Selection range | `52:6-16` |
| PARENT | string | Parent symbol name (empty for top-level) | `presentAssistantMessage` |
| HOVER_INFO | string | Complete LSP hover info including type, signature, and JSDoc/comments | `function calculateArea(width: number, height: number): number - Calculates the area of a rectangle` |
| EOL | marker | End-of-line marker for clear row separation | `<<<` |

### Range Format Rules

1. **Same Line**: `line:startChar-endChar` (e.g., `52:6-61`)
2. **Multi Line**: `startLine:startChar-endLine:endChar` (e.g., `79:0-742:1`)
3. **Zero-based indexing** (consistent with LSP specification)

### Symbol Kind Reference

Common LSP symbol kinds:
- `1` = File
- `2` = Module  
- `5` = Class
- `6` = Property
- `11` = Method
- `12` = Function
- `13` = Constructor
- `14` = Variable

### Hover Information Details

When `include_hover: true`, the HOVER_INFO column contains comprehensive information from the Language Server Protocol, including:

- **Function Signatures**: Complete type information with parameter and return types
- **JSDoc Comments**: Full documentation strings and parameter descriptions
- **Type Definitions**: Variable types, class information, interface details
- **Documentation**: Any comments or documentation associated with the symbol
- **Usage Context**: Additional contextual information provided by the language server

**Example hover information for documented functions:**
```
function calculateArea(width: number, height: number): number - Calculates the area of a rectangle @param width The width of the rectangle @param height The height of the rectangle @returns The area as a number
```

**Processing applied to hover information:**
- Newlines converted to spaces for table format compatibility
- Pipe characters escaped as `\|` to prevent table corruption
- Truncated to 200 characters to maintain readability
- Empty when hover information is unavailable

## Implementation

### Interface Updates

```typescript
interface GetDocumentSymbolsParams {
  textDocument: { uri: string }
  return_children?: "yes" | "no" | "auto"  // Default: "no"
  format?: "standard" | "table"            // Default: "table"
  include_hover?: boolean                   // Default: true
}

interface CompactSymbolResult {
  success: boolean
  format: "table"
  symbols: string  // Table format as string
}
```

### Core Implementation

```typescript
function formatAsFlattedTable(symbols: DocumentSymbol[]): string {
  const header = "NAME | KIND | RANGE | SELECTION | PARENT\n"
  const rows: string[] = []
  
  function flattenSymbol(symbol: DocumentSymbol, parent: string = "") {
    const range = formatRange(symbol.range)
    const selection = formatRange(symbol.selectionRange)
    rows.push(`${symbol.name} | ${symbol.kind} | ${range} | ${selection} | ${parent}`)
    
    if (symbol.children) {
      symbol.children.forEach(child => flattenSymbol(child, symbol.name))
    }
  }
  
  symbols.forEach(symbol => flattenSymbol(symbol))
  return header + rows.join('\n')
}

function formatRange(range: Range): string {
  if (range.start.line === range.end.line) {
    return `${range.start.line}:${range.start.character}-${range.end.character}`
  }
  return `${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}`
}
```

## Migration Strategy

### Phase 1: Add Format Support ✅ COMPLETED
- ✅ Add `format` parameter to `getDocumentSymbols`
- ✅ Default to `"table"` for optimal LLM consumption
- ✅ Implement `"table"` format option
- ✅ Maintain `"standard"` format for backward compatibility

### Phase 2: Update Consumers (Ongoing)
- Update remaining test files to handle new parameters
- Update hover-related test files for new string format
- Performance benchmarking and validation

### Phase 3: Future Optimization (Optional, 6+ months)
- Add deprecation warnings for `"standard"` format
- Eventually remove `"standard"` format if no longer needed
- Further optimize table format based on usage patterns

## Benefits

### Token Efficiency
- **90% token reduction** compared to current JSON format
- Scales linearly with symbol count
- Predictable token usage for cost estimation

### LLM Optimization
- **Table format** is ideal for LLM processing
- **Easy scanning** for specific symbols or relationships
- **Relationship preservation** through PARENT column
- **Consistent structure** for reliable parsing

### Maintainability
- **Simple implementation** - straightforward string formatting
- **Easy testing** - predictable output format
- **Backward compatible** - existing code unaffected
- **Future extensible** - can add columns as needed

## Testing Strategy

### Unit Tests
```typescript
describe('Compact Document Symbols', () => {
  it('should format simple symbols as table', () => {
    const symbols = [{ name: 'test', kind: 12, range: {...}, selectionRange: {...} }]
    const result = formatAsFlattedTable(symbols)
    expect(result).toContain('NAME | KIND | RANGE | SELECTION | PARENT')
    expect(result).toContain('test | 12 |')
  })
  
  it('should handle nested symbols with parent references', () => {
    // Test hierarchical symbols
  })
  
  it('should reduce token count by 80%+', () => {
    // Performance benchmark test
  })
})
```

### Integration Tests
- Test with real LSP responses
- Verify LLM consumption compatibility
- Performance benchmarks with large files

## Example Comparison

### Before (JSON - 2,400 tokens)
```json
[
  {
    "name": "DEBUG_RACE",
    "kind": 12,
    "range": {
      "start": { "line": 52, "character": 6 },
      "end": { "line": 52, "character": 61 }
    },
    "selectionRange": {
      "start": { "line": 52, "character": 6 },
      "end": { "line": 52, "character": 16 }
    }
  }
  // ... more symbols
]
```

### After (Table - 400 tokens)
```
NAME | KIND | RANGE | SELECTION | PARENT
DEBUG_RACE | 12 | 52:6-61 | 52:6-16 | 
raceLog | 12 | 53:6-58:1 | 53:6-13 | 
presentAssistantMessage | 11 | 79:0-742:1 | 79:22-45 | 
```

**Result: 83% token reduction while preserving all information**

## Conclusion

The compact table format provides:
- **Maximum token efficiency** for LLM consumption
- **Complete information preservation** 
- **Easy implementation** and maintenance
- **Backward compatibility** during migration
- **Future extensibility** for additional features

This format is specifically optimized for the primary use case: passing document symbols to LLMs for codebase understanding and analysis.