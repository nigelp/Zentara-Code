# Detailed Implementation Plan: Approval UI Reliability

This document provides a low-level, step-by-step guide for developers to implement the strategy outlined in `approval_ui_new_plan.md`.

**Feature Flag Convention:** A single feature flag, `ENABLE_STABLE_APPROVAL_UI`, will control the new architectural changes.

---

## **Phase 1: Immediate Stabilization (Est. 2-3 Days)**

### **Task 1.1: Portal Host Setup** (Est. 2 hours)

1.  **File**: `webview-ui/src/App.tsx`
    -   **Action**: Add a `div` to serve as the stable mounting point for portalized content. This `div` should be outside the main component tree that is subject to re-renders from state changes.
    ```tsx
    // webview-ui/src/App.tsx
    function App() {
      return (
        <div className="main-container">
          <ExtensionStateProvider>
            {/* ... Other providers */}
            <div id="approval-portal-host" style={{ position: 'relative', zIndex: 100 }} />
            <ChatView /> 
            {/* ... Other components */}
          </ExtensionStateProvider>
        </div>
      );
    }
    ```

### **Task 1.2: Centralized Batching & Keyed Patching** (Est. 4-6 hours)

1.  **File**: `webview-ui/src/context/ExtensionStateContext.tsx`
    -   **Action**: Modify the message handler to batch updates.
    -   **Action**: Change `parallelTasks` from an array to a Map to facilitate keyed patching.
    ```tsx
    // webview-ui/src/context/ExtensionStateContext.tsx
    import { unstable_batchedUpdates } from "react-dom";
    
    // ... inside ExtensionStateProvider
    const [parallelTasks, setParallelTasks] = useState<Map<string, ParallelTask>>(new Map());

    const handleMessage = useCallback((event: MessageEvent) => {
        const msg = event.data;
        unstable_batchedUpdates(() => {
            switch (msg.type) {
                case "parallelTasksUpdate":
                    setParallelTasks(prevTasks => {
                        const newTasks = new Map(prevTasks);
                        let hasChanged = false;
                        for (const task of msg.payload) {
                            // Simple dirty check
                            if (JSON.stringify(newTasks.get(task.taskId)) !== JSON.stringify(task)) {
                                newTasks.set(task.taskId, task);
                                hasChanged = true;
                            }
                        }
                        // Only return a new Map reference if something actually changed.
                        return hasChanged ? newTasks : prevTasks;
                    });
                    break;
                // ... other cases
            }
        });
    }, []);

    // ...
    ```

### **Task 1.3: Update Components to Use Portal & New State** (Est. 6-8 hours)

1.  **File**: `webview-ui/src/components/chat/SubagentStack.tsx`
    -   **Action**: Refactor `ApprovalControls` to render into the portal.
    -   **Action**: Implement optimistic UI for click handling.
    -   **Action**: Consume the `parallelTasks` Map and convert to a memoized array for rendering.
    ```tsx
    // webview-ui/src/components/chat/SubagentStack.tsx
    import { createPortal } from 'react-dom';

    // ... inside SubagentStack component
    const portalContainer = document.getElementById('approval-portal-host');
    const [optimisticHandled, setOptimisticHandled] = useState<Set<string>>(new Set());

    const handleApprove = useCallback((taskId: string) => {
        setOptimisticHandled(prev => new Set(prev).add(taskId));
        vscode.postMessage({ type: "subagentApproval", taskId, approved: true });
    }, []);

    // ... similar for handleDeny

    const tasksArray = useMemo(() => Array.from(parallelTasks.values()), [parallelTasks]);

    return (
        <div>
            {tasksArray.map(task => {
                if (optimisticHandled.has(task.taskId)) {
                    return <div key={task.taskId}>Processing...</div>;
                }
                const controls = (
                    <div className="approval-controls">
                        <button onClick={() => handleApprove(task.taskId)}>Approve</button>
                        <button onClick={() => handleDeny(task.taskId)}>Deny</button>
                    </div>
                );
                return (
                    <div key={task.taskId} className="subagent-item">
                        {/* Task details */}
                        {portalContainer && createPortal(controls, portalContainer)}
                    </div>
                );
            })}
        </div>
    );
    ```
2.  **File**: `webview-ui/src/components/chat/ChatView.tsx`
    -   **Action**: Repeat the portalization and optimistic UI pattern for any approval controls that live here. Ensure focus management is handled correctly when portals are used.

---

## **Phase 2: Structural Isolation (Est. 2-3 Days)**

### **Task 2.1: Create Subagent State Provider** (Est. 4-6 hours)

1.  **New File**: `webview-ui/src/context/SubagentStateContext.tsx`
    -   **Action**: Create a new context provider dedicated to managing subagent state. This provider will own the logic from Task 1.2.
    ```tsx
    // webview-ui/src/context/SubagentStateContext.tsx
    import React, { createContext, useState, useContext, useCallback, useMemo, useEffect } from 'react';
    import { unstable_batchedUpdates } from 'react-dom';

    // ... types
    
    const SubagentContext = createContext();

    export const SubagentStateProvider = ({ children }) => {
        const [tasks, setTasks] = useState<Map<string, ParallelTask>>(new Map());

        const handleMessage = useCallback((event: MessageEvent) => {
            if (event.data?.type === 'parallelTasksUpdate') {
                unstable_batchedUpdates(() => {
                    setTasks(prevTasks => {
                        const newTasks = new Map(prevTasks);
                        let hasChanged = false;
                        for (const task of event.data.payload) {
                            if (JSON.stringify(newTasks.get(task.taskId)) !== JSON.stringify(task)) {
                                newTasks.set(task.taskId, task);
                                hasChanged = true;
                            }
                        }
                        return hasChanged ? newTasks : prevTasks;
                    });
                });
            }
        }, []);

        useEffect(() => {
            window.addEventListener('message', handleMessage);
            return () => window.removeEventListener('message', handleMessage);
        }, [handleMessage]);

        const tasksArray = useMemo(() => Array.from(tasks.values()), [tasks]);

        const value = useMemo(() => ({ tasks: tasksArray }), [tasksArray]);

        return (
            <SubagentContext.Provider value={value}>
                {children}
            </SubagentContext.Provider>
        );
    };

    export const useSubagentState = () => useContext(SubagentContext);
    ```

### **Task 2.2: Refactor and Migrate** (Est. 4-6 hours)

1.  **File**: `webview-ui/src/context/ExtensionStateContext.tsx`
    -   **Action**: Remove all logic related to `parallelTasksUpdate` and the `parallelTasks` state. It's now fully managed by `SubagentStateProvider`.
2.  **File**: `webview-ui/src/App.tsx`
    -   **Action**: Wrap the relevant parts of the component tree with the new `SubagentStateProvider`.
    ```tsx
    // webview-ui/src/App.tsx
    function App() {
        return (
            <ExtensionStateProvider>
                <SubagentStateProvider>
                    <div id="approval-portal-host" style={{ position: 'relative', zIndex: 100 }} />
                    <ChatView />
                </SubagentStateProvider>
            </ExtensionStateProvider>
        );
    }
    ```
3.  **File**: `webview-ui/src/components/chat/SubagentStack.tsx` (and other consumers)
    -   **Action**: Update the component to consume state from `useSubagentState` instead of the main context.

---

## **Phase 3: Testing & Metrics (Est. 2 Days)**

### **Task 3.1: Implement Performance Metrics** (Est. 3-4 hours)

1.  **File**: `webview-ui/src/hooks/usePerformanceMetrics.ts` (new)
    -   **Action**: Create a hook to encapsulate Performance API usage.
    ```ts
    // webview-ui/src/hooks/usePerformanceMetrics.ts
    export const useInteractionMetrics = () => {
        const start = (markName: string) => performance.mark(`${markName}-start`);
        const end = (markName: string, measureName: string) => {
            performance.mark(`${markName}-end`);
            performance.measure(measureName, `${markName}-start`, `${markName}-end`);
            const measure = performance.getEntriesByName(measureName)[0];
            console.log(`${measureName} latency:`, measure.duration);
            // Optionally, log to telemetry
        };
        return { start, end };
    };
    ```
2.  **Files**: `SubagentStack.tsx`, `ChatView.tsx`
    -   **Action**: Integrate the hook to measure click-to-ack latency.

### **Task 3.2: Automated Test Development** (Est. 4-6 hours)

1.  **New File**: `webview-ui/src/components/chat/__tests__/SubagentApproval.test.tsx`
    -   **Action**: Write Vitest tests simulating the bug condition.
    -   **Follow repo rules**: Run tests from the `webview-ui` directory.
    ```tsx
    // webview-ui/src/components/chat/__tests__/SubagentApproval.test.tsx
    import { render, fireEvent, act } from '@testing-library/react';
    
    it('should handle approval clicks reliably during rapid state updates', async () => {
        const { getByText } = render(<TestWrapper />);
        
        // Simulate rapid updates
        for (let i = 0; i < 10; i++) {
            act(() => {
                // Dispatch mock window message events with new task data
                window.dispatchEvent(new MessageEvent('message', { data: { type: 'parallelTasksUpdate', payload: [...] } }));
            });
        }

        const approveButton = getByText('Approve');
        fireEvent.click(approveButton);
        
        // Assert that the optimistic UI state is correct
        // Assert that the correct postMessage was called
    });
    ```

---

## **Rollback Plan**

- **Phase 1**: Changes are additive. Revert by removing portal usage and optimistic state, and switching back to array-based state.
- **Phase 2**: Controlled by a feature flag. `App.tsx` can conditionally render with or without `SubagentStateProvider`.
- **Phase 3**: Metrics and tests are non-impacting and can be committed independently.