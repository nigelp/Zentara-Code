# Final Implementation Plan: Unified, Task-Centric Subtask Management

This document provides a consistent and final plan for a unified, task-centric model for both parallel and sequential subtask management, including nested routing for tool approval requests.

## 1. Core Architecture: Fully Task-Centric Subtask Management

The architecture will be refactored to make the `Task` class the single point of control for managing its own subtasks, whether they are parallel or sequential.

- **`ClineProvider`**: Will manage the global flat `taskRegistry` and handle WebUI communication. It will be completely decoupled from the logic of managing subtask sets or stacks.
- **`Task`**: Each `Task` instance will manage its own children. For parallel subtasks, it will use a `Set`. For sequential subtasks, it will use a stack.

```mermaid
graph TD
    subgraph Backend
        CP[ClineProvider]
        TR[Task Registry]
        CP -- Manages --> TR
    end
    
    subgraph "Task-Level Management"
        T1[Task 1]
        T1_Children_Parallel[childrenTaskIds: Set]
        T1_Children_Sequential[childTaskStack: Task[]]
        T1 -- Manages --> T1_Children_Parallel
        T1 -- Manages --> T1_Children_Sequential
        
        T1_1[Subagent 1.1]
        
        T1 -- Creates/Tracks --> T1_1
    end

    T1 -- Direct Comm. --> CP
    T1_1 -- Direct Comm. --> CP
```

## 2. Data Model and Class Modifications

### `Task` Class (`src/core/task/Task.ts`)
- **No Change**: `parentTask: Task | undefined`.
- **Addition**: `readonly childrenTaskIds: Set<string> = new Set()` for parallel subtasks.
- **Addition**: `readonly childTaskStack: Task[] = []` for sequential subtasks.
- **New Method**: `createSubtask(options: TaskOptions): Promise<Task>`: Handles the creation of both parallel and sequential subtasks, adding them to the appropriate collection (`childrenTaskIds` or `childTaskStack`). This replaces `addClineToSet` and `addClineToStack` from `ClineProvider`.
- **New Method**: `removeSubtask(taskId: string, isParallel: boolean)`: Removes a child task from the appropriate collection. This replaces `removeClineFromSet` and `removeClineFromStack`.
- **New Method**: `await subtaskCompleted(taskId: string, result: string, isParallel: boolean)`: Called when any subtask finishes. It will call `removeSubtask` and, if conditions are met (e.g., set is empty or stack is empty), will call `resume`.
- **New Method**: `resume(result: string)`: Contains the logic to resume the task's execution.

### `SubagentInfo` Interface (`src/core/webview/ClineProvider.ts`)
- **No Change**.

### `ClineProvider` Class (`src/core/webview/ClineProvider.ts`)
- **Removal**: `addClineToSet`, `removeClineFromSet`, `addClineToStack`, and `removeClineFromStack` methods will be removed.
- **Refactoring**: `finishSubTask` will be simplified to delegate to `parentTask.subtaskCompleted(...)`.

## 3. Message and Logic Flow

### Creating a Subtask
1. A parent `Task` calls its own `createSubtask` method, specifying if the subtask is parallel.
2. `Task.createSubtask` calls `provider.createTask`.
3. The parent `Task` adds the new child to its `childrenTaskIds` set or `childTaskStack`.

### Tool Approval
- The flow remains the same: direct communication from subagent to `ClineProvider` and back.

### Subtask Completion
1. A subagent task completes, calling `provider.finishSubTask`.
2. `provider.finishSubTask` calls `parentTask.subtaskCompleted(...)`.
3. `Task.subtaskCompleted` calls `this.removeSubtask(...)`.
4. If the parent's subtask collection is now empty, `this.resume(...)` is called.

## 4. Implementation Steps

1.  **Modify `Task` Class**:
    - Add `readonly childrenTaskIds: Set<string> = new Set()`.
    - Add `readonly childTaskStack: Task[] = []`.
    - Implement `createSubtask`, `removeSubtask`, `subtaskCompleted`, and `resume`.
    - Move logic from `ClineProvider`'s stack and set management methods into these new `Task` methods.

2.  **Refactor `ClineProvider`**:
    - Remove the subtask management methods (`addClineToSet`, etc.).
    - Simplify `finishSubTask` to delegate to the parent `Task`.

3.  **WebUI Changes**:
    - No changes required beyond what was previously planned for displaying hierarchy and handling tool approvals.

## 5. Testing Strategy

- **Unit Tests**:
    - Test all new methods in the `Task` class for both parallel and sequential subtask management.
- **Integration Tests**:
    - Test scenarios with mixes of parallel and sequential subtasks to ensure the `Task` class correctly manages both.
- **End-to-End Tests**:
    - An E2E test with a complex, multi-level hierarchy of both parallel and sequential subtasks.