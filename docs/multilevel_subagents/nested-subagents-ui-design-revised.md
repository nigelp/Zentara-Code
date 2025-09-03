# Nested Subagents UI Design - Complete Functionality Preservation

## Design Principle
Each nested subagent row maintains **100% of current SubagentRow functionality**:
- Activity indicator & subtask description
- Last tool use display
- **Approval system** (critical for user control)
- All existing styling and interactions

The tree structure is achieved through **wrapper indentation** without modifying the core SubagentRow component.

## Revised Component Architecture

### NestedSubagentRow - Wrapper Approach
```typescript
interface NestedSubagentRowProps {
  subagent: NestedSubagentInfo;
  onToggleExpand?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  onApprove?: (taskId: string, toolCall: any) => void;
  onReject?: (taskId: string, toolCall: any) => void;
}

function NestedSubagentRow({ 
  subagent, 
  onToggleExpand, 
  onCancel,
  onApprove,
  onReject 
}: NestedSubagentRowProps) {
  const indentationWidth = subagent.depth * 20; // 20px per level
  
  return (
    <div className="nested-subagent-wrapper" style={{ marginLeft: `${indentationWidth}px` }}>
      {/* Tree visual elements - positioned absolutely to not interfere with content */}
      <TreeConnector 
        depth={subagent.depth}
        isLastChild={subagent.isLastChild}
        hasChildren={subagent.hasChildren}
      />
      
      {/* Expand/collapse button - only if has children */}
      {subagent.hasChildren && (
        <button
          className="tree-toggle-button"
          onClick={() => onToggleExpand?.(subagent.id)}
          aria-label={subagent.isExpanded ? "Collapse" : "Expand"}
        >
          {subagent.isExpanded ? "▼" : "▶"}
        </button>
      )}
      
      {/* COMPLETE ORIGINAL SubagentRow - NO MODIFICATIONS */}
      <div className="subagent-row-container">
        <SubagentRow 
          {...subagent}
          onCancel={onCancel}
          onApprove={onApprove}
          onReject={onReject}
        />
      </div>
    </div>
  );
}
```

### Key Preservation Points

#### 1. Complete SubagentRow Functionality
- **Activity Indicator**: Spinning icon, status colors, completion states
- **Subtask Description**: Full description text with type badges
- **Last Tool Use**: Tool name, parameters, execution status
- **Approval System**: Approve/reject buttons, pending states, user interaction
- **Cancellation**: Cancel button and confirmation dialogs
- **Styling**: All VSCode theme colors, hover effects, transitions

#### 2. Approval System Preservation
```typescript
// Original approval props passed through unchanged
interface SubagentRowProps {
  // ... existing props
  onApprove?: (taskId: string, toolCall: any) => void;
  onReject?: (taskId: string, toolCall: any) => void;
  pendingApproval?: {
    toolCall: any;
    message: string;
  };
}

// Nested wrapper passes all approval functionality through
<SubagentRow 
  {...subagent}
  onApprove={onApprove}
  onReject={onReject}
  pendingApproval={subagent.pendingApproval}
/>
```

#### 3. Activity Indicator Preservation
```typescript
// All activity states maintained
enum SubagentActivity {
  IDLE = 'idle',
  THINKING = 'thinking',
  TOOL_USE = 'tool_use',
  WAITING_APPROVAL = 'waiting_approval',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Activity indicator component unchanged
<ActivityIndicator 
  activity={subagent.activity}
  isCompleted={subagent.isCompleted}
  hasError={subagent.hasError}
/>
```

### Updated SubagentStack Component
```typescript
interface SubagentStackProps {
  subagentTree: SubagentTree;
  rootSubagents: string[];
  onToggleExpand?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  onApprove?: (taskId: string, toolCall: any) => void;
  onReject?: (taskId: string, toolCall: any) => void;
}

function SubagentStack({ 
  subagentTree, 
  rootSubagents, 
  onToggleExpand, 
  onCancel,
  onApprove,
  onReject 
}: SubagentStackProps) {
  const flattenedSubagents = useMemo(
    () => flattenSubagentTree(subagentTree, rootSubagents),
    [subagentTree, rootSubagents]
  );

  return (
    <div className="subagent-stack">
      {flattenedSubagents.map((subagent) => (
        <NestedSubagentRow
          key={subagent.id}
          subagent={subagent}
          onToggleExpand={onToggleExpand}
          onCancel={onCancel}
          onApprove={onApprove}
          onReject={onReject}
        />
      ))}
    </div>
  );
}
```

### CSS Styling - Non-Intrusive Approach
```css
.nested-subagent-wrapper {
  position: relative;
  margin-bottom: 4px; /* Maintain original spacing */
}

.tree-toggle-button {
  position: absolute;
  left: -16px;
  top: 12px; /* Center with row */
  background: none;
  border: none;
  color: var(--vscode-foreground);
  cursor: pointer;
  padding: 2px;
  font-size: 10px;
  opacity: 0.6;
  z-index: 1;
}

.tree-toggle-button:hover {
  opacity: 1;
  background-color: var(--vscode-toolbar-hoverBackground);
  border-radius: 2px;
}

.subagent-row-container {
  /* No modifications - preserves all original styling */
  position: relative;
  z-index: 2;
}

/* Tree connector lines */
.tree-connector {
  position: absolute;
  left: -10px;
  top: 0;
  width: 10px;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.tree-line {
  position: absolute;
  background-color: var(--vscode-tree-indentGuidesStroke);
  opacity: 0.3;
}

.tree-line.vertical {
  width: 1px;
  height: 50%;
  left: 5px;
  top: 0;
}

.tree-line.horizontal {
  width: 5px;
  height: 1px;
  left: 5px;
  top: 24px;
}
```

### Data Structure - Extended SubagentInfo
```typescript
interface NestedSubagentInfo extends SubagentInfo {
  // Hierarchy metadata
  depth: number;
  parentId?: string;
  children: string[];
  isExpanded: boolean;
  isLastChild: boolean;
  hasChildren: boolean;
  
  // ALL ORIGINAL FIELDS PRESERVED
  id: string;
  description: string;
  activity: SubagentActivity;
  lastTool?: string;
  isCompleted: boolean;
  hasError: boolean;
  pendingApproval?: {
    toolCall: any;
    message: string;
  };
  // ... all other existing fields
}
```

### Message Handling - Complete Preservation
```typescript
// All existing message types preserved
interface SubagentApprovalMessage {
  type: 'subagentApproval';
  taskId: string;
  approved: boolean;
  toolCall: any;
}

interface SubagentCancelMessage {
  type: 'subagentCancel';
  taskId: string;
}

// New hierarchical update message
interface NestedSubagentUpdateMessage {
  type: 'nestedSubagentUpdate';
  subagentTree: SubagentTree;
  rootSubagents: string[];
}

// Handler preserves all existing functionality
function handleSubagentMessage(message: any) {
  switch (message.type) {
    case 'subagentApproval':
      // Existing approval logic unchanged
      handleApproval(message.taskId, message.approved, message.toolCall);
      break;
    case 'subagentCancel':
      // Existing cancellation logic unchanged
      handleCancellation(message.taskId);
      break;
    case 'nestedSubagentUpdate':
      // New: Update hierarchical structure
      setSubagentTree(message.subagentTree);
      setRootSubagents(message.rootSubagents);
      break;
  }
}
```

## Implementation Benefits

### Complete Functionality Preservation
- **Zero Breaking Changes**: All existing SubagentRow functionality works identically
- **Approval System Intact**: User approval workflow completely preserved
- **Activity Indicators**: All status displays and animations maintained
- **Tool Display**: Last tool use information shown exactly as before
- **Cancellation**: All cancellation logic and UI preserved

### Visual Tree Enhancement
- **Clear Hierarchy**: Indentation shows parent-child relationships
- **Expand/Collapse**: Optional tree navigation without losing content
- **Tree Connectors**: Visual lines showing relationships
- **Familiar Interface**: Matches VSCode file explorer patterns

### Technical Advantages
- **Minimal Risk**: Wrapper approach doesn't modify core components
- **Backward Compatible**: Existing flat structure still works
- **Performance**: Efficient tree flattening and rendering
- **Maintainable**: Clear separation of tree logic and display logic

## Migration Strategy

1. **Phase 1**: Extend SubagentInfo interface with hierarchy fields
2. **Phase 2**: Create NestedSubagentRow wrapper component
3. **Phase 3**: Update SubagentStack to handle hierarchical data
4. **Phase 4**: Implement tree building logic in backend
5. **Phase 5**: Add expand/collapse state management

This approach ensures that every aspect of the current subagent row functionality is preserved while adding the tree structure visualization that users expect from a nested hierarchy interface.