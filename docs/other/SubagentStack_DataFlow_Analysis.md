# SubagentStack Data Flow Analysis

## Overview

This document analyzes the SubagentStack.tsx component and how subagent data flows from the backend to the UI component.

## Data Structures

### Frontend (UI) - SubagentInfo Interface

```typescript
export interface SubagentInfo {
	taskId: string // Unique identifier for the subagent task
	description: string // Short description of what the subagent is doing
	status: "running" | "completed" | "failed" // Current execution status
	lastActivity?: number // Timestamp of last activity (optional)
	askType?: string // Type of ask (e.g., "tool", "command", etc.) (optional)
	askText?: string // The ask text/details (optional)
	toolCall?: {
		// Information about tool being called (optional)
		toolName: string
		toolInput: any
		isPartial?: boolean
	}
}
```

### Frontend (UI) - SubagentStackProps Interface

```typescript
interface SubagentStackProps {
	subagents: SubagentInfo[] // Array of subagent information objects
}
```

### Backend - SubAgentParams Interface

```typescript
interface SubAgentParams {
	description?: string // Task description
	message?: string // Task message/instructions
	subagent_type?: string | null // Optional predefined agent type name
	outputSchema?: any // Optional output schema
	_text?: string // For JSON-style parameters
}
```

## Data Flow Architecture

### 1. Backend Creation (subagentTool.ts)

```typescript
// When a subagent is launched, backend creates:
const newTask = {
	taskId: newCline.taskId, // Generated unique ID
	description: params.description!, // From user input
	status: "running" as const, // Initial status
}
```

### 2. Backend Communication

```typescript
// Backend sends update to webview:
await provider.postMessageToWebview({
	type: "parallelTasksUpdate",
	payload: (provider as any).parallelTasksState, // Array of task objects
})
```

### 3. UI State Management (ExtensionStateContext.tsx)

```typescript
// UI receives and processes the message:
case "parallelTasksUpdate": {
	setState((prevState) => ({
		...prevState,
		parallelTasks: message.payload,  // Updates global state
	}))
	break
}
```

### 4. UI Component (SubagentStack.tsx)

```typescript
// Component receives subagents via props and processes them:
export const SubagentStack: React.FC<SubagentStackProps> = React.memo(({ subagents: rawSubagents }) => {
	const subagents = usePeriodicSubagentUpdates(rawSubagents) // Currently just passes through
	// ... renders each subagent with status indicators and progress
})
```

## Key Observations

### 1. **Minimal Data Transfer**

- Backend only sends essential data: `taskId`, `description`, and `status`
- Additional UI-specific fields (`lastActivity`, `askType`, `askText`, `toolCall`) are optional and may be populated later

### 2. **Real-time Updates**

- Backend uses `parallelTasksUpdate` messages for real-time communication
- UI automatically re-renders when subagent states change
- Component uses `React.memo` for performance optimization

### 3. **Status Management**

- Three main states: `"running"`, `"completed"`, `"failed"`
- Status changes are communicated from backend to frontend
- UI provides visual indicators for each status

### 4. **Data Transformation**

- Raw backend data goes through `usePeriodicSubagentUpdates` hook (currently a pass-through)
- This hook could be extended for data enrichment or periodic updates

### 5. **Component Architecture**

- `SubagentStack` is a pure React component that receives data via props
- It doesn't directly manage state or communicate with backend
- Uses refs for tracking user interactions (scroll behavior)

## Interface Mapping

| Backend Field | Frontend Field  | Purpose                |
| ------------- | --------------- | ---------------------- |
| `taskId`      | `taskId`        | Unique identifier      |
| `description` | `description`   | Task description       |
| `status`      | `status`        | Execution status       |
| Not set       | `lastActivity?` | UI timestamp tracking  |
| Not set       | `askType?`      | UI categorization      |
| Not set       | `askText?`      | UI detailed info       |
| Not set       | `toolCall?`     | UI tool execution info |

## Potential Enhancements

1. **Rich Status Updates**: Backend could send more detailed status information
2. **Progress Tracking**: Add progress percentage or completion metrics
3. **Error Details**: Include error messages for failed subagents
4. **Time Tracking**: Add execution time and estimated completion
5. **Tool Call Updates**: Real-time updates about tool executions

## Conclusion

The subagent data flow follows a clean unidirectional pattern from backend to frontend. The backend creates minimal task objects and communicates updates via VSCode's webview messaging system. The UI component receives this data as props and provides a reactive interface for monitoring subagent execution status.

The interface design allows for future enhancements while maintaining simplicity and performance in the current implementation.
