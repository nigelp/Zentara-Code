# Modified ClineProvider Implementation Plan for Parallel Task Execution

## Overview

Instead of creating a new SubAgentManager class, we will enhance the existing ClineProvider to support both sequential task execution (using stack) and parallel agent execution (using set). This approach maintains backward compatibility while adding new capabilities for managing multiple autonomous agents.

## Architecture Design

### Core Changes to ClineProvider

1. **Dual Execution Modes**:

    - Sequential mode: Uses existing `clineStack` for traditional task execution
    - Parallel mode: Uses new `clineSet` for concurrent agent execution

2. **New Data Structures Added**:

    - `clineSet: Set<Task>` - For tracking parallel tasks
    - Methods to manage both stack and set operations

3. **Modified Methods**:
    - `finishSubTask` - Enhanced to handle both stack and set cleanup
    - Additional methods for set operations

## Implementation Status

### Already Implemented

1. **Core Set Operations**:

    ```typescript
    - clineSet: Set<Task> = new Set()
    - async addClineToSet(cline: Task)
    - async removeClineFromSet(cline: Task | undefined)
    - async removeAllClinesFromSet()
    ```

2. **Modified finishSubTask**:
    - Now accepts optional cline parameter
    - Removes from set if cline provided, otherwise uses stack

### To Be Implemented

1. **Parallel Execution Support Methods**:

    ```typescript
    // Enhanced ClineProvider methods for parallel execution

    // Get all tasks in parallel execution
    getParallelTasks(): Task[] {
        return Array.from(this.clineSet);
    }

    // Check if can launch new parallel task
    canLaunchParallelTask(maxConcurrent: number = 10): boolean {
        return this.clineSet.size < maxConcurrent;
    }

    // Initialize task for parallel execution
    async initTaskForParallelExecution(
        prompt: string,
        parentTask?: Task,
        options?: ParallelTaskOptions
    ): Promise<Task> {
        // Create task with parallel configuration
        const task = await this.createTask(prompt, {
            executionMode: 'parallel',
            autonomousMode: true,
            parentTaskId: parentTask?.taskId,
            ...options
        });

        await this.addClineToSet(task);
        return task;
    }
    ```

2. **Resource Management Integration**:

    ```typescript
    // Resource tracking for parallel tasks
    private parallelResourceTracker: Map<string, ResourceUsage> = new Map();

    // Check system-wide resource availability
    hasAvailableResources(): boolean {
        const totalMemory = Array.from(this.parallelResourceTracker.values())
            .reduce((sum, usage) => sum + usage.memory, 0);
        return totalMemory < this.maxTotalMemory;
    }

    // Allocate resources to a parallel task
    allocateResources(taskId: string, limits: ResourceLimits): boolean {
        if (!this.hasAvailableResources()) return false;

        this.parallelResourceTracker.set(taskId, {
            memory: 0,
            cpu: 0,
            startTime: Date.now(),
            limits
        });
        return true;
    }

    // Release resources when task completes
    releaseResources(taskId: string): void {
        this.parallelResourceTracker.delete(taskId);
        this.fileLocks.forEach((lockedBy, file) => {
            if (lockedBy === taskId) {
                this.fileLocks.delete(file);
            }
        });
    }
    ```

3. **File Lock Management**:

    ```typescript
    // Simple file locking for write operations
    private fileLocks: Map<string, string> = new Map(); // filepath -> taskId

    // Request file write access (reads don't need locks)
    async requestFileWriteAccess(taskId: string, filePath: string): Promise<boolean> {
        const existingLock = this.fileLocks.get(filePath);
        if (existingLock && existingLock !== taskId) {
            return false; // File locked by another task
        }

        this.fileLocks.set(filePath, taskId);
        return true;
    }

    // Batch file lock request
    async requestFileWriteAccessBatch(taskId: string, filePaths: string[]): Promise<{
        granted: boolean;
        conflicts: string[];
    }> {
        const conflicts: string[] = [];

        // Check all files first
        for (const filePath of filePaths) {
            const existingLock = this.fileLocks.get(filePath);
            if (existingLock && existingLock !== taskId) {
                conflicts.push(filePath);
            }
        }

        if (conflicts.length > 0) {
            return { granted: false, conflicts };
        }

        // Lock all files
        for (const filePath of filePaths) {
            this.fileLocks.set(filePath, taskId);
        }

        return { granted: true, conflicts: [] };
    }
    ```

4. **Result Aggregation**:

    ```typescript
    // Collect results from parallel tasks
    private parallelResults: Map<string, SubAgentResult>

    // Add result from completed task
    addParallelResult(taskId: string, result: SubAgentResult): void

    // Get aggregated results
    getAggregatedResults(): AggregatedResult
    ```

5. **Monitoring Integration**:

    ```typescript
    // Track parallel task performance
    getParallelTaskStats(): ParallelTaskStats

    // Send updates to webview
    async updateParallelTaskStatus(): Promise<void>
    ```

## Integration Points

### 1. SubAgent Tool Integration

The existing `subagentTool.ts` will use the enhanced ClineProvider methods:

```typescript
// In subagentTool.ts
const provider = cline.provider as ClineProvider

// Check resource availability
if (!provider.canLaunchParallelTask()) {
	throw new Error("Maximum concurrent tasks reached")
}

// Request file locks if write permissions needed
if (config.writePermissions && config.allowedWritePaths) {
	const lockResult = await provider.requestFileWriteAccessBatch(taskId, config.allowedWritePaths)

	if (!lockResult.granted) {
		throw new Error(`File conflicts: ${lockResult.conflicts.join(", ")}`)
	}
}

// Create and launch parallel task
const parallelTask = await provider.initTaskForParallelExecution(
	config.prompt,
	cline, // parent task
	{
		writePermissions: config.writePermissions,
		maxExecutionTime: config.maxExecutionTime,
		priority: config.priority,
		resourceLimits: {
			maxMemory: 512 * 1024 * 1024,
			maxFileOperations: 1000,
			maxToolCalls: 100,
		},
	},
)

// Start execution
parallelTask.startTask()
```

### 2. Webview Updates

Add new message types for parallel task monitoring:

```typescript
// New webview messages
type: "parallelTaskUpdate"
type: "parallelTaskComplete"
type: "resourceUsageUpdate"
```

### 3. Modified finishSubTask Method

The existing `finishSubTask` method has been updated to handle both stack and set cleanup:

```typescript
// Already implemented in ClineProvider
async finishSubTask(abortReason?: AbortReason, cline?: Task) {
    if (cline) {
        // Remove from set (parallel execution)
        await this.removeClineFromSet(cline);

        // Release resources
        this.releaseResources(cline.taskId);

        // Store result if needed
        if (this.parallelResults) {
            this.parallelResults.set(cline.taskId, {
                success: !abortReason,
                abortReason,
                completedAt: Date.now()
            });
        }
    } else {
        // Original stack-based cleanup
        const currentCline = this.currentCline;
        if (currentCline) {
            await this.popClineFromStack();
            // ... existing cleanup logic
        }
    }
}
```

## Migration Strategy

1. **Phase 1**: Core set operations (COMPLETED)
2. **Phase 2**: Parallel task initialization methods
3. **Phase 3**: Resource and file lock management
4. **Phase 4**: Result aggregation and monitoring
5. **Phase 5**: Full webview integration

## Benefits of This Approach

1. **Backward Compatibility**: Existing sequential task execution remains unchanged
2. **Incremental Implementation**: Can add features gradually
3. **Unified Interface**: Single provider handles both execution modes
4. **Reuse Existing Infrastructure**: Leverages existing Task, webview, and state management

## Next Steps

1. Implement `initClineWithParallelTask` method
2. Add resource tracking infrastructure
3. Implement file lock management
4. Create result aggregation system
5. Update webview to display parallel task status
