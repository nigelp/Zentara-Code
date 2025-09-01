# Parallel Ask System Documentation

## Overview

The Parallel Ask System replaces the legacy FIFO queue-based ask processing with a modern Set-based architecture that enables multiple subagents to request user approval simultaneously. This dramatically improves throughput for parallel task execution.

## Architecture

### Core Components

#### 1. Ask Set (Map-based)
- **Location**: `ClineProvider.ts`
- **Structure**: `Map<string, { task: Task; timestamp: number }>`
- **Purpose**: Stores pending ask requests indexed by taskId for O(1) operations

#### 2. Processing Set
- **Location**: `ClineProvider.ts`
- **Structure**: `Set<string>`
- **Purpose**: Tracks which asks are currently being processed to prevent duplicates

#### 3. Per-Subagent UI
- **Location**: `SubagentStack.tsx`
- **Features**: Individual Approve/Reject buttons for each subagent

## Implementation Details

### Backend (ClineProvider.ts)

#### Ask Request Flow
```typescript
// When a parallel task needs approval
async addAskRequest(task: Task) {
    // 1. Check for duplicates
    if (this.askSet.has(task.taskId)) return
    
    // 2. Add to Set
    this.askSet.set(task.taskId, { task, timestamp: Date.now() })
    
    // 3. Apply random delay (50-200ms) to prevent race conditions
    const randomDelay = Math.floor(Math.random() * 150) + 50
    await delay(randomDelay)
    
    // 4. Process ask in parallel
    this.processAsk(task.taskId)
}
```

#### Parallel Processing
```typescript
private async processAsk(taskId: string) {
    // 1. Mark as processing
    this.processingAsks.add(taskId)
    
    // 2. Update UI for this specific subagent
    await this.updateSubagentAsk(taskId, askType, askText)
    
    // 3. Wait for response (handled by task)
    // 4. Clean up when done
    this.processingAsks.delete(taskId)
    this.askSet.delete(taskId)
}
```

### Frontend (SubagentStack.tsx)

#### Per-Subagent Approval UI
```typescript
// Each subagent renders its own approval buttons
{subagent.askType && (
    <div className="flex gap-2 mt-2">
        <VSCodeButton onClick={() => handleApprove(subagent.taskId)}>
            Approve
        </VSCodeButton>
        <VSCodeButton onClick={() => handleReject(subagent.taskId)}>
            Reject
        </VSCodeButton>
    </div>
)}
```

#### Response Handling
```typescript
const handleApprove = (taskId: string) => {
    vscode.postMessage({
        type: "askResponse",
        askResponse: "yesButtonClicked",
        taskId: taskId,  // Specific task ID
        text: feedback
    })
}
```

## Key Features

### 1. Parallel Processing
- Multiple asks can be processed simultaneously
- No blocking between different subagent asks
- Each subagent operates independently

### 2. Race Condition Prevention
- Random delays (50-200ms) stagger parallel requests
- Prevents UI update conflicts
- Ensures stable message ordering

### 3. O(1) Operations
- Map/Set provide constant-time lookups
- Fast duplicate detection
- Efficient removal operations

### 4. Auto-Approval Support
- Certain tool types can be auto-approved
- Configurable per tool category
- Maintains parallel flow for manual approvals

## Migration from FIFO Queue

### Removed Components
- `askQueue: Array<>` - Replaced with `askSet: Map<>`
- `isProcessingAsk: boolean` - Replaced with `processingAsks: Set<>`
- `processAskQueue()` method - Replaced with `processAsk()`
- `queueAskRequest()` - Replaced with `addAskRequest()`

### API Changes
```typescript
// Old (FIFO)
provider.queueAskRequest(task)  // Sequential processing

// New (Parallel)
provider.addAskRequest(task)    // Parallel processing
```

## Performance Improvements

### Before (FIFO Queue)
- **Processing**: Sequential, one at a time
- **Throughput**: Limited by slowest approval
- **Complexity**: O(n) for array operations
- **Blocking**: Yes, queue blocks all subsequent asks

### After (Set-based)
- **Processing**: Parallel, multiple simultaneously
- **Throughput**: Limited only by user response time
- **Complexity**: O(1) for Set/Map operations
- **Blocking**: No, each ask independent

## Usage Examples

### Parallel Subagent Asks
```typescript
// Three subagents request approval simultaneously
const task1 = new Task({ taskId: "subagent-1", isParallel: true })
const task2 = new Task({ taskId: "subagent-2", isParallel: true })
const task3 = new Task({ taskId: "subagent-3", isParallel: true })

// All three can request and receive approval in parallel
await provider.addAskRequest(task1)  // Processed immediately
await provider.addAskRequest(task2)  // Processed immediately
await provider.addAskRequest(task3)  // Processed immediately
```

### UI Interaction
1. User sees all three subagent asks simultaneously
2. Can approve/reject in any order
3. Each approval/rejection handled independently
4. No waiting for other subagents

## Testing

### Unit Tests
Updated test files verify:
- Parallel ask processing
- Duplicate prevention
- Set/Map operations
- Random delay application

### Integration Tests
Verify:
- Multiple subagents requesting approval
- UI updates for each subagent
- Independent response handling
- No race conditions

## Monitoring

### Health Checks
```typescript
// Monitor ask processing health
const status = provider.getAskQueueStatus()
console.log(`
    Pending asks: ${status.askSetSize}
    Processing: ${status.processingCount}
    Tasks: ${status.askSetTasks}
`)
```

### Metrics
- Total asks processed
- Average processing time
- Maximum concurrent asks
- Timeout frequency

## Configuration

### Delay Settings
```typescript
// Random delay range (milliseconds)
const MIN_DELAY = 50
const MAX_DELAY = 200
const randomDelay = Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY)) + MIN_DELAY
```

### Auto-Approval Settings
Configure which tools can be auto-approved:
- Read-only operations
- Safe file operations
- Specific tool categories

## Troubleshooting

### Common Issues

1. **Duplicate Ask Prevention**
   - Issue: Same task appears multiple times
   - Solution: Set prevents duplicates by taskId

2. **Race Conditions**
   - Issue: UI updates conflict
   - Solution: Random delays stagger updates

3. **Memory Leaks**
   - Issue: Asks not cleaned up
   - Solution: Automatic cleanup on task disposal

### Debug Logging
Enable debug logging:
```typescript
raceLog("ADD_ASK_REQUEST", { taskId, askSetSize, existing })
raceLog("PROCESS_ASK", { taskId, isProcessing })
raceLog("REMOVE_ASK", { taskId, remaining })
```

## Future Enhancements

1. **Priority Queue**
   - Add priority levels for asks
   - Process high-priority asks first

2. **Batch Operations**
   - Group similar asks
   - Single approval for multiple operations

3. **Smart Delays**
   - Adaptive delay based on system load
   - Reduce delays when fewer asks pending

4. **Advanced Auto-Approval**
   - Machine learning for approval patterns
   - User-specific approval preferences

## Conclusion

The Parallel Ask System significantly improves the user experience for multi-agent workflows by:
- Enabling true parallel processing
- Reducing approval bottlenecks
- Providing per-subagent control
- Maintaining system stability with smart delays

This architecture scales efficiently with the number of parallel tasks and provides a foundation for future enhancements in autonomous agent collaboration.