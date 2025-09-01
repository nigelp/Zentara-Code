# `getSymbolChildren` Tool Implementation Plan

## 🎯 **Objective**
Create a new LSP tool `lsp_get_symbol_children` that finds a symbol at a specific position and returns its children with configurable depth, formatted in a table similar to `lsp_get_document_symbols`.

## 📋 **Requirements**
- **Input**: URI, line, character, optional depth (1,2,3,"all"), optional include_hover
- **Output**: Table format with NAME, KIND, RANGE, SELECTION, PARENT, HOVER_INFO, EOL
- **Performance**: Must be optimized for large files
- **Consistency**: Follow existing LSP tool patterns

## 🔍 **Technical Analysis**

### **Core Challenge**
VSCode LSP API has **NO direct "get symbol children at position"** provider. We must:
1. Use `vscode.executeDocumentSymbolProvider` (unavoidable)
2. Find the target symbol at the specified position
3. Extract its children based on depth parameter
4. Format results in table format

### **Performance Strategy**
- **Single LSP Call**: Only one `executeDocumentSymbolProvider` call
- **Optimized Search**: Binary search on symbol ranges with early termination
- **Efficient Extraction**: Extract only required depth levels
- **Parallel Processing**: Fetch hover info in parallel when needed

## 📁 **Implementation Structure**

### **Phase 1: Type Definitions**
**File**: `src/zentara_lsp/src/types.ts`
```typescript
// Add GetSymbolChildrenParams interface and Zod schema
export interface GetSymbolChildrenParams {
    uri: string
    line: number  // 0-based
    character: number  // 0-based
    deep?: string | number  // "1", "2", "3", "all", default="1"
    include_hover?: boolean  // default=true
}
```

### **Phase 2: Controller Implementation**
**File**: `src/zentara_lsp/src/controller/getSymbolChildren.ts`

**Core Functions**:
1. `getSymbolChildren()` - Main entry point
2. `findSymbolAtPositionOptimized()` - Fast position-based symbol finding
3. `extractChildrenWithDepth()` - Depth-controlled children extraction
4. `formatChildrenAsTable()` - Table formatting with hover info

**Algorithm Details**:
```typescript
// 1. Symbol Finding Algorithm (O(log n) average case)
function findSymbolAtPositionOptimized(symbols, line, character) {
    // Priority 1: Check selectionRange (symbol name) - most precise
    // Priority 2: Check full range, then recursively search children
    // Early termination when exact match found
}

// 2. Children Extraction Algorithm
function extractChildrenWithDepth(symbol, depth) {
    // Support: 1, 2, 3, "all"
    // Iterative collection with depth control
    // Stop at maxDepth to avoid unnecessary processing
}

// 3. Table Formatting Algorithm
function formatChildrenAsTable(children, parentName, uri, includeHover) {
    // Parallel hover info fetching for performance
    // Consistent table format matching get_document_symbols
}
```

### **Phase 3: LSP Controller Integration**
**Files**: 
- `src/zentara_lsp/src/ILspController.ts` - Add interface method
- `src/zentara_lsp/src/LspController.ts` - Add implementation

### **Phase 4: Tool Description**
**File**: `src/core/prompts/tools/lsp_operations/get_symbol_children.ts`
- Comprehensive documentation
- Usage examples
- Parameter descriptions
- Table format explanation

### **Phase 5: Tool Registration**
**Files**:
- `src/core/prompts/tools/lsp_operations/index.ts` - Export tool
- `src/core/prompts/tools/index.ts` - Register in tool map

## 🚀 **Detailed Implementation Steps**

### **Step 1: Add Type Definitions**
```typescript
// In types.ts
export const GetSymbolChildrenParamsSchema = z.object({
    uri: z.string().min(1, "URI is required"),
    line: z.number().int().min(0, "Line must be non-negative"),
    character: z.number().int().min(0, "Character must be non-negative"),
    deep: z.union([z.string(), z.number()]).optional(),
    include_hover: z.boolean().optional(),
})

export type GetSymbolChildrenParams = z.infer<typeof GetSymbolChildrenParamsSchema>
```

### **Step 2: Core Algorithm Implementation**
```typescript
// Optimized symbol finding with early termination
function findSymbolAtPositionOptimized(symbols: vscode.DocumentSymbol[], line: number, character: number): vscode.DocumentSymbol | null {
    const position = { line, character }
    
    function searchSymbol(symbolList: vscode.DocumentSymbol[]): vscode.DocumentSymbol | null {
        for (const symbol of symbolList) {
            // Check selection range first (most precise)
            if (isPositionInRange(position, symbol.selectionRange)) {
                return symbol // Early termination
            }
            
            // Check full range
            if (isPositionInRange(position, symbol.range)) {
                // Search children first (more specific)
                if (symbol.children?.length > 0) {
                    const childMatch = searchSymbol(symbol.children)
                    if (childMatch) return childMatch
                }
                return symbol
            }
        }
        return null
    }
    
    return searchSymbol(symbols)
}
```

### **Step 3: Depth-Controlled Extraction**
```typescript
function extractChildrenWithDepth(symbol: vscode.DocumentSymbol, deep: string | number): vscode.DocumentSymbol[] {
    if (!symbol.children?.length) return []
    
    const maxDepth = deep === "all" ? Infinity : parseInt(deep.toString())
    const result: vscode.DocumentSymbol[] = []
    
    function collectChildren(children: vscode.DocumentSymbol[], currentDepth: number) {
        if (currentDepth > maxDepth) return
        
        for (const child of children) {
            result.push(child)
            if (child.children?.length && currentDepth < maxDepth) {
                collectChildren(child.children, currentDepth + 1)
            }
        }
    }
    
    collectChildren(symbol.children, 1)
    return result
}
```

### **Step 4: Table Formatting**
```typescript
async function formatChildrenAsTable(
    children: vscode.DocumentSymbol[],
    parentName: string,
    uri: string,
    includeHover: boolean
): Promise<string> {
    const header = includeHover
        ? "NAME | KIND | RANGE | SELECTION | PARENT | HOVER_INFO | EOL\n"
        : "NAME | KIND | RANGE | SELECTION | PARENT | EOL\n"
    
    // Parallel hover info fetching for performance
    const rowPromises = children.map(async (child) => {
        const range = formatRange(child.range)
        const selection = formatRange(child.selectionRange)
        
        let hoverInfo = ""
        if (includeHover) {
            try {
                const hover = await getHoverInfo({
                    textDocument: { uri },
                    position: {
                        line: child.selectionRange.start.line,
                        character: child.selectionRange.start.character
                    }
                })
                hoverInfo = hover ? hover.replace(/\n/g, ' ').replace(/\|/g, '\\|').substring(0, 200) : ""
            } catch {
                hoverInfo = ""
            }
        }
        
        return includeHover
            ? `${child.name} | ${child.kind} | ${range} | ${selection} | ${parentName} | ${hoverInfo} | <<<`
            : `${child.name} | ${child.kind} | ${range} | ${selection} | ${parentName} | <<<`
    })
    
    const rows = await Promise.all(rowPromises)
    return header + rows.join('\n')
}
```

## 🧪 **Testing Strategy**

### **Test Cases**
1. **Basic Functionality**
   - Symbol with direct children (depth=1)
   - Symbol with nested children (depth=2, 3)
   - Symbol with no children
   - Invalid position (no symbol found)

2. **Depth Control**
   - depth="1" - only direct children
   - depth="2" - children and grandchildren
   - depth="3" - three levels deep
   - depth="all" - complete hierarchy

3. **Edge Cases**
   - Position on symbol name vs symbol body
   - Nested symbols with same names
   - Very deep hierarchies
   - Large number of children (hover threshold)

4. **Error Handling**
   - Invalid file URI
   - Position out of bounds
   - Malformed parameters
   - Timeout scenarios

### **Performance Tests**
- Large files (1000+ symbols)
- Deep nesting (10+ levels)
- Many children (100+ per symbol)
- Hover info performance

## 📊 **Success Criteria**

### **Functional Requirements**
- ✅ Finds symbol at exact position
- ✅ Returns children with correct depth
- ✅ Table format matches existing tools
- ✅ Hover information works correctly
- ✅ Error handling is robust

### **Performance Requirements**
- ✅ < 2 seconds for files with 1000+ symbols
- ✅ < 5 seconds for very deep hierarchies
- ✅ Memory usage stays reasonable
- ✅ No memory leaks

### **Integration Requirements**
- ✅ Follows existing LSP tool patterns
- ✅ Consistent with other tool descriptions
- ✅ Proper error messages
- ✅ Tool registration works correctly

## 🔄 **Implementation Order**

1. **Phase 1**: Add types and schemas ✅
2. **Phase 2**: Implement core controller logic ✅
3. **Phase 3**: Update LSP controller interface and implementation ✅
4. **Phase 4**: Create tool description ✅
5. **Phase 5**: Register tool in system ✅
6. **Phase 6**: Write and run tests ✅
7. **Phase 7**: Performance optimization if needed ✅

## 🎯 **Expected Outcome**

A high-performance, well-integrated LSP tool that allows users to explore symbol hierarchies efficiently, with:
- Fast symbol finding (< 100ms for most cases)
- Flexible depth control
- Consistent table formatting
- Optional hover information
- Robust error handling
- Comprehensive documentation

This tool will complement the existing `lsp_get_document_symbols` by providing targeted symbol exploration capabilities.