# Subagent Flow Architecture Diagrams

## 1. Overall System Architecture

```mermaid
graph TB
    subgraph "User Interface"
        UI[Webview UI]
    end
    
    subgraph "Master Agent"
        MA[Master Agent]
        TP[Task Provider]
    end
    
    subgraph "Subagent System"
        SA1[Subagent 1]
        SA2[Subagent 2]
        SA3[Subagent 3]
    end
    
    subgraph "LSP Tools"
        LSP[LSP Tool System]
        LSP1[lsp_get_document_symbols]
        LSP2[lsp_get_symbol_code_snippet]
        LSP3[lsp_find_usages]
    end
    
    subgraph "Core Services"
        FS[File System]
        API[External APIs]
        LS[Language Server]
    end
    
    UI --> MA
    MA --> TP
    TP --> SA1
    TP --> SA2
    TP --> SA3
    
    SA1 --> LSP
    SA2 --> LSP
    SA3 --> LSP
    
    LSP --> LSP1
    LSP --> LSP2
    LSP --> LSP3
    
    LSP1 --> LS
    LSP2 --> LS
    LSP3 --> LS
    
    SA1 --> FS
    SA2 --> FS
    SA3 --> FS
    
    SA1 -.-> MA
    SA2 -.-> MA
    SA3 -.-> MA
    
    MA --> API
```

## 2. Subagent Lifecycle Flow

```mermaid
sequenceDiagram
    participant MA as Master Agent
    participant TP as Task Provider
    participant SA as Subagent
    participant LSP as LSP Tools
    participant FS as File System
    participant UI as Webview UI
    
    Note over MA,UI: 1. Subagent Creation
    MA->>TP: subagentTool(params)
    TP->>TP: validateParameters()
    TP->>TP: createSubagentTask()
    TP->>SA: initClineWithTask()
    
    Note over MA,UI: 2. Parallel Execution
    MA->>MA: pauseTask()
    SA->>SA: startTask()
    SA->>LSP: lsp_get_document_symbols()
    LSP->>SA: return symbols
    SA->>LSP: lsp_get_symbol_code_snippet()
    LSP->>SA: return code snippet
    
    Note over MA,UI: 3. Real-time Updates
    SA->>TP: updateSubagentActivity()
    TP->>UI: postStateToWebview()
    SA->>TP: updateSubagentStreamingText()
    TP->>UI: postMessageToWebview()
    
    Note over MA,UI: 4. Result Aggregation
    SA->>TP: finishSubTask()
    TP->>TP: storeResult()
    TP->>TP: checkAllSubagentsComplete()
    
    Note over MA,UI: 5. Master Resume
    TP->>MA: resumePausedTask()
    MA->>MA: processAggregatedResults()
    MA->>UI: displayFinalResults()
```

## 3. Task State Management Flow

```mermaid
stateDiagram-v2
    [*] --> TaskCreated: subagentTool()
    
    TaskCreated --> TaskValidating: validateParameters()
    TaskValidating --> TaskInitializing: parameters valid
    TaskValidating --> TaskFailed: parameters invalid
    
    TaskInitializing --> TaskRunning: initClineWithTask()
    TaskRunning --> TaskPaused: parent paused
    TaskRunning --> TaskStreaming: executing tools
    TaskRunning --> TaskCompleted: success
    TaskRunning --> TaskFailed: error
    
    TaskStreaming --> TaskRunning: tool completed
    TaskPaused --> TaskRunning: subagent completed
    
    TaskCompleted --> [*]: cleanup
    TaskFailed --> [*]: cleanup
    
    note right of TaskStreaming
        Real-time updates:
        - updateSubagentActivity()
        - updateSubagentStreamingText()
        - updateSubagentToolCall()
    end note
```

## 4. Communication Patterns

```mermaid
graph LR
    subgraph "Master Agent Communication"
        MA[Master Agent]
        MA_TP[Task Provider]
        MA_UI[Webview UI]
    end
    
    subgraph "Subagent Communication"
        SA[Subagent]
        SA_TP[Task Provider]
        SA_LSP[LSP Tools]
        SA_FS[File System]
    end
    
    subgraph "Result Aggregation"
        TP[Task Provider]
        TP_RESULTS[Result Store]
        TP_UI[Webview UI]
    end
    
    MA --> MA_TP
    MA_TP --> SA
    SA --> SA_TP
    SA --> SA_LSP
    SA --> SA_FS
    SA_TP --> TP_RESULTS
    TP_RESULTS --> TP_UI
    TP_UI --> MA_UI
    
    style MA fill:#e1f5fe
    style SA fill:#f3e5f5
    style TP fill:#e8f5e8
    style SA_LSP fill:#fff3e0
```

## 5. Error Handling and Recovery Flow

```mermaid
flowchart TD
    A[Subagent Task Started] --> B{Error Occurred?}
    B -->|No| C[Continue Execution]
    B -->|Yes| D[Log Error Details]
    
    D --> E{Is Critical Error?}
    E -->|No| F[Mark Task as Failed]
    E -->|Yes| G[Cancel Subagent]
    
    F --> H[Store Error in Result]
    G --> I[Notify Provider]
    
    H --> J[Continue Other Subagents]
    I --> K[Cleanup Resources]
    
    J --> L{All Subagents Complete?}
    K --> L
    
    L -->|No| M[Wait for Completion]
    L -->|Yes| N[Aggregate Results]
    
    M --> N
    N --> O[Resume Master Task]
    O --> P[Include Error in Final Report]
    
    style A fill:#e8f5e8
    style B fill:#fff3e0
    style D fill:#ffebee
    style E fill:#fff3e0
    style F fill:#ffebee
    style G fill:#ffebee
    style H fill:#fff3e0
    style I fill:#fff3e0
    style J fill:#e8f5e8
    style L fill:#fff3e0
    style N fill:#e8f5e8
    style O fill:#e8f5e8
    style P fill:#fff3e0
```

## 6. LSP Tool Integration Flow

```mermaid
sequenceDiagram
    participant SA as Subagent
    participant LSP as LSP Tool
    participant LS as Language Server
    participant FS as File System
    
    Note over SA,FS: LSP Tool Usage Pattern
    
    SA->>LSP: lsp_get_document_symbols(fileUri)
    LSP->>LSP: validateParameters()
    LSP->>LS: waitForLanguageServer()
    LS-->>LSP: server ready
    LSP->>LS: documentSymbols request
    LS-->>LSP: symbols data
    LSP-->>SA: formatted symbols
    
    SA->>LSP: lsp_get_symbol_code_snippet(location)
    LSP->>LSP: parseLocation()
    LSP->>FS: readFile(range)
    FS-->>LSP: code snippet
    LSP-->>SA: formatted snippet
    
    SA->>LSP: lsp_find_usages(symbol)
    LSP->>LS: findUsages request
    LS-->>LSP: usage locations
    LSP-->>SA: usage results
    
    Note over SA,FS: Subagents use LSP tools
    Note over SA,FS: instead of reading entire files
    Note over SA,FS: for token efficiency
```

## 7. Parallel Task Execution Flow

```mermaid
graph TB
    subgraph "Task Decomposition"
        MA[Master Agent]
        TD[Task Decomposition]
        SA1[Subagent Task 1]
        SA2[Subagent Task 2]
        SA3[Subagent Task 3]
    end
    
    subgraph "Parallel Execution"
        E1[Execution Context 1]
        E2[Execution Context 2]
        E3[Execution Context 3]
    end
    
    subgraph "Resource Management"
        RM[Resource Manager]
        FS1[File Access 1]
        FS2[File Access 2]
        FS3[File Access 3]
    end
    
    subgraph "Result Aggregation"
        RS1[Result Store 1]
        RS2[Result Store 2]
        RS3[Result Store 3]
        RA[Result Aggregator]
    end
    
    MA --> TD
    TD --> SA1
    TD --> SA2
    TD --> SA3
    
    SA1 --> E1
    SA2 --> E2
    SA3 --> E3
    
    E1 --> RM
    E2 --> RM
    E3 --> RM
    
    RM --> FS1
    RM --> FS2
    RM --> FS3
    
    E1 --> RS1
    E2 --> RS2
    E3 --> RS3
    
    RS1 --> RA
    RS2 --> RA
    RS3 --> RA
    
    RA --> MA
    
    style MA fill:#e1f5fe
    style SA1 fill:#f3e5f5
    style SA2 fill:#f3e5f5
    style SA3 fill:#f3e5f5
    style RA fill:#e8f5e8
```

## 8. Webview Integration Flow

```mermaid
sequenceDiagram
    participant SA as Subagent
    participant TP as Task Provider
    participant MH as Message Handler
    participant UI as Webview UI
    participant User as User
    
    Note over SA,User: Real-time UI Updates
    
    SA->>TP: updateSubagentActivity()
    TP->>MH: postStateToWebview()
    MH->>UI: parallelTasksUpdate
    UI->>User: Show activity status
    
    SA->>TP: updateSubagentStreamingText()
    TP->>MH: postMessageToWebview()
    MH->>UI: streamingTextUpdate
    UI->>User: Show real-time output
    
    SA->>TP: updateSubagentToolCall()
    TP->>MH: postMessageToWebview()
    MH->>UI: toolCallUpdate
    UI->>User: Show tool execution
    
    User->>UI: Click cancel button
    UI->>MH: cancelAllSubagents
    MH->>TP: cancelAllSubagents()
    TP->>SA: abortTask()
    SA-->>TP: task cancelled
    TP->>MH: postStateToWebview()
    MH->>UI: cancellationComplete
    UI->>User: Show cancellation status
```

## Key Architecture Insights

### 1. **Parallel Execution Model**
- Subagents run simultaneously in isolated contexts
- Master agent pauses during subagent execution
- Results are aggregated and processed upon completion

### 2. **Token Efficiency**
- Subagents use LSP tools instead of reading entire files
- Brief tool descriptions by default, full descriptions on demand
- Minimal context preservation for master agent

### 3. **Error Resilience**
- Individual subagent failures don't stop other subagents
- Comprehensive error logging and recovery mechanisms
- Graceful degradation with partial result handling

### 4. **Real-time Communication**
- Streaming updates provide immediate feedback
- Webview integration for visual progress tracking
- Event-driven architecture for responsive UI

### 5. **Resource Management**
- Concurrent file access limits
- Timeout protection for hanging operations
- Automatic cleanup and resource release

These diagrams illustrate the sophisticated architecture that enables efficient parallel task execution while maintaining proper isolation, communication, and error handling throughout the subagent system.