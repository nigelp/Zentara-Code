# Guide: Integrating New Tools into Zentara-Code

This guide provides a comprehensive walkthrough for integrating new tools, from simple, single-action commands to complex tool groups with multiple operations. Zentara-Code uses a robust, JSON-based parameter system for all tools.

## Overview: Two Paths for Tool Integration

There are two primary paths for adding a new tool, depending on its complexity:

1.  **Part 1: Simple Tool Integration**: The standard path for adding a single, standalone tool operation (e.g., `read_file`). This is the most common and straightforward method.
2.  **Part 2: Advanced Tool Group Integration**: For creating a "meta-tool" or a **tool group** (e.g., `debug`, `lsp`) that contains multiple related sub-operations. This path uses a factory pattern for consistency and maintainability.

Choose the path that best fits your needs.

---

## Part 1: Integrating a Simple, Standalone Tool

Follow these steps to add a single tool operation to the system.

### Step 1: Implement the Core Logic

First, write the function that performs the tool's action. This logic should be self-contained and placed in an appropriate location, such as a new file in `src/core/tools/`.

### Step 2: Define and Register the Tool

Next, make the system aware of your new tool by updating several configuration and type-definition files.

#### 2a. Create the Tool Prompt File

This file provides the description and usage instructions for the LLM.

- Create a new file in `src/core/prompts/tools/{category}/` (e.g., `src/core/prompts/tools/my_new_tool.ts`).
- The file must export a function that returns the tool's description string, demonstrating the modern JSON-based parameter format.

**Example Template:**

```typescript
// src/core/prompts/tools/my_new_tool.ts
import type { ToolArgs } from "../types"

export function getMyNewToolDescription(args: ToolArgs): string {
	return `## my_new_tool – A brief description of the tool

    Description:
    A longer description of what this tool does and when to use it.

    ────────────────────────  QUICK-START  ────────────────────────
    ✅ **Usage**
    1️⃣ Use the <my_new_tool> tag.
    2️⃣ Provide all parameters as a single, well-formed JSON object string.

    ⚠️ **Common Breakers**
    • Malformed JSON string (e.g., missing quotes around keys).
    • Missing a required key in the JSON.

    ────────────  COPY-READY TEMPLATE  ────────────
      <my_new_tool>{"required_param": "value", "optional_param": 123}</my_new_tool>
    ───────────────────────────────────────────────

    ### Parameters:
    All parameters are provided as key-value pairs within a single JSON object.

    - "required_param" (string, REQUIRED): Description of this parameter.
    - "optional_param" (number, optional): Description of this one.

    ### Examples:
    1.  **Basic Usage:**
        \`\`\`xml
        <my_new_tool>{"required_param": "some_value"}</my_new_tool>
        \`\`\`
    ────────────────────────────────────────────────────────────────────────────
    `
}
```

#### 2b. Register Tool Name and Type

Update the central type definition files. This is critical for type safety and compilation.

1.  **`packages/types/src/tool.ts` (Source of Truth)**: Add your new tool name to the `toolNames` array.
    ```typescript
    export const toolNames = [
    	// ... existing tool names ...
    	"my_new_tool",
    ] as const
    ```
2.  **`src/schemas/index.ts`**: Add the tool name to the `toolNames` array here as well for runtime validation.
    ```typescript
    export const toolNames = [
    	// ... existing tool names ...
    	"my_new_tool",
    ] as const
    ```

#### 2c. Add a User-Friendly Display Name

Provide a display name for your tool in the UI.

- **`src/shared/tools.ts`**: Add an entry to `TOOL_DISPLAY_NAMES`. **This is mandatory and will cause a build failure if missed.**
    ```typescript
    export const TOOL_DISPLAY_NAMES: Record<ToolName, string> = {
    	// ... existing tool display names ...
    	my_new_tool: "My New Tool",
    } as const
    ```

#### 2d. Map the Tool Name to its Prompt

Connect the tool's name to the prompt function you created.

1.  **`src/core/prompts/tools/{category}/index.ts`**: Export your new prompt function.
    ```typescript
    export * from "./my_new_tool"
    ```
2.  **`src/core/prompts/tools/index.ts`**: Import the function and add it to the `toolDescriptionMap`.

    ```typescript
    // Import
    import { getMyNewToolDescription } from "./{category}"

    // Map
    const toolDescriptionMap: Record<string, (args: ToolArgs) => string | undefined> = {
    	// ...
    	my_new_tool: (args) => getMyNewToolDescription(args),
    }
    ```

### Step 3: Implement the Invocation Bridge

This connects the LLM's tool call to your core logic.

- **`src/core/assistant-message/presentAssistantMessage.ts`**: Modify the main tool-handling logic to call your function.
- Your handler should parse the arguments from the `toolCall.args` JSON string and pass them to your core logic function. Use Zod for validation.

```typescript
// Example in presentAssistantMessage.ts
import { myNewToolLogic } from "../tools/myNewTool"; // Your logic
import { z } from "zod";

// ... inside the tool handling switch or if/else block
case "my_new_tool": {
    try {
        const params = JSON.parse(toolCall.args ?? "{}");

        // Validate with Zod
        const schema = z.object({
            required_param: z.string(),
            optional_param: z.number().optional(),
        });
        const validatedParams = schema.parse(params);

        const result = await myNewToolLogic(validatedParams);
        pushToolResult(result);
    } catch (e) {
        // Handle JSON parsing or validation errors
        pushToolResult(formatResponse.toolError(`Invalid arguments: ${(e as Error).message}`));
    }
    break;
}
```

### Step 4: Testing and Documentation

- **Unit Tests**: Test your core logic and validation schema.
- **Integration Tests**: Test the full flow, from a simulated LLM call to the final result.
- **Documentation**: Ensure the prompt file is clear and accurate. It is the primary documentation for the LLM.

---

## Part 2: Advanced—Creating a New Tool Group

This pattern is for complex "meta-tools" (like `debug` or `lsp`) that group multiple related operations. It uses a **function factory** to generate handlers dynamically, ensuring consistency and reducing boilerplate.

### Architectural Overview

A **tool group** is a collection of operations sharing:

- A common prefix (e.g., `debug_launch`, `debug_set_breakpoint`).
- Unified approval, parsing, and error handling.
- A single "meta-tool" implementation that routes to different controller methods.

### Step 1: Design the Tool Group Structure

- **Plan Operations**: Define all the sub-operations for your group (e.g., `analyze_code`, `generate_tests`).
- **Create a Controller**: Build a dedicated controller (e.g., `AiController.ts`) with an interface (`IAiController.ts`) to house the logic for each operation. This encapsulates all related functionality.

```typescript
// src/my_tool_group/src/IMyGroupController.ts
export interface MyOperationParams {
	/* ... */
}

export interface IMyGroupController {
	operation1(params: MyOperationParams): Promise<any>
	operation2(params: any): Promise<any>
}

// src/my_tool_group/src/MyGroupController.ts
export class MyGroupController implements IMyGroupController {
	// ... implementations ...
}
export const myGroupController = new MyGroupController()
```

### Step 2: Create the Meta-Tool Implementation

Create a single tool file (e.g., `src/core/tools/myGroupTool.ts`) that will handle all operations for the group. This file contains the routing logic.

- It accepts the entire tool call block.
- It extracts the specific operation (e.g., `operation1`).
- It validates arguments using a shared validation function.
- It calls the appropriate method on your controller.

Refer to `lspTool.ts` or `debugTool.ts` for a complete example. The key is the operation map:

```typescript
// src/core/tools/myGroupTool.ts

// Map operations to controller methods
function createOperationMap(controller: IMyGroupController): Record<string, (args?: any) => Promise<any>> {
    return {
        operation1: controller.operation1.bind(controller),
        operation2: controller.operation2.bind(controller),
    };
}

// Main tool function
export async function myGroupTool(cline, block, askApproval, ...) {
    const { my_group_operation, _text, ... } = block.params;
    // ... (approval logic) ...

    const targetMethod = moduleOperationMap[my_group_operation];
    if (targetMethod) {
        // ... (parse args, validate, and call targetMethod) ...
    }
}
```

### Step 3: Register the Tool Group

Now, register the group and its individual operations.

1.  **Define Group and Operations in `packages/types/src/tool.ts`**:
    - Add the group name (e.g., `"my_group"`) to `toolGroups`.
    - Add all individual operation names (e.g., `"my_group_operation1"`, `"my_group_operation2"`) to `toolNames`.
2.  **Repeat in `src/schemas/index.ts`**: Mirror the additions to `toolGroups` and `toolNames`.
3.  **Add Display Names in `src/shared/tools.ts`**: Create user-friendly names for **each operation**.
    ```typescript
    my_group_operation1: "My Group: Operation 1",
    my_group_operation2: "My Group: Operation 2",
    ```
4.  **Create Prompt Files**: Create a separate prompt file for **each operation** inside `src/core/prompts/tools/my_group_operations/`.
5.  **Map All Prompts**: In `src/core/prompts/tools/index.ts`, map each operation name to its respective prompt function.

### Step 4: Integrate with the Function Factory

The factory in `presentAssistantMessage.ts` handles routing to your meta-tool.

1.  **Define Types in `src/shared/tools.ts`**:
    - Add the operation parameter (e.g., `"my_group_operation"`) to `toolParamNames`.
    - Create the tool interface (e.g., `MyGroupToolUse`).
    - Add the new interface to the `ToolUseWithParams` union type.
2.  **Register with Factory in `presentAssistantMessage.ts`**:
    - Import your meta-tool function (e.g., `myGroupTool`).
    - Add it to the `toolImportMap`.
    - Add a `case` for your tool group name (e.g., `"my_group"`) to use the `createIndividualToolHandler`.

This pattern automatically reconstructs the tool block, extracts the operation, and calls your meta-tool handler, streamlining the process significantly.

### Step 5: Configure UI and Modes

If your tool group requires its own auto-approval category or needs to be added to specific modes, follow these detailed steps.

#### 5a. Add to Modes

In `packages/types/src/mode.ts`, add your new tool group (e.g., `"my_group"`) to the `groups` array of the relevant modes (`code`, `debug`, etc.).

#### 5b. Detailed Guide: Adding a New Auto-Approval Category

To add a new auto-approval toggle in the UI, you must update **SIX** key files. Missing any of these will cause the UI to be out of sync with the backend state or result in functionality issues.

**Complete Example: LSP Tool Group Integration**

Here's a real-world example of adding the LSP (Language Server Protocol) tool group with full auto-approval support:

**1. `packages/types/src/global-settings.ts`**

First, add the new setting to the GlobalSettings schema:

```typescript
export const globalSettingsSchema = z.object({
	// ... existing settings ...
	alwaysAllowDebug: z.boolean().optional(),
	alwaysAllowLsp: z.boolean().optional(), // Add this line
	alwaysAllowFollowupQuestions: z.boolean().optional(),
	// ... rest of settings
})
```

**2. `webview-ui/src/components/settings/AutoApproveToggle.tsx`**

Add the LSP tool group to the AutoApproveToggles type and configuration:

```typescript
// Add to the AutoApproveToggles type
type AutoApproveToggles = Pick<
	GlobalSettings,
	| "alwaysAllowReadOnly"
	| "alwaysAllowWrite"
	// ... other settings ...
	| "alwaysAllowDebug"
	| "alwaysAllowLsp" // Add this line
	| "alwaysAllowFollowupQuestions"
	| "alwaysAllowUpdateTodoList"
>

// Add to the autoApproveSettingsConfig object
export const autoApproveSettingsConfig: Record<AutoApproveSetting, AutoApproveConfig> = {
	// ... existing settings ...
	alwaysAllowLsp: {
		key: "alwaysAllowLsp",
		labelKey: "settings:autoApprove.lsp.label",
		descriptionKey: "settings:autoApprove.lsp.description",
		icon: "symbol-method", // VS Code codicon for LSP operations - CHANGE THIS FOR YOUR TOOL
		testId: "always-allow-lsp-toggle",
	},
}
```

**📌 Icon Configuration**: The `icon` field uses VS Code Codicons. To change the icon for your tool group:

1. Browse available icons at: https://microsoft.github.io/vscode-codicons/dist/codicon.html
2. Use the icon name (e.g., `"symbol-method"`, `"debug-alt"`, `"terminal"`, `"gear"`)
3. Common choices:
    - `"debug-alt"` - Debug tools
    - `"symbol-method"` - LSP/language tools
    - `"terminal"` - Command/execution tools
    - `"gear"` - Configuration tools
    - `"database"` - Data tools
    - `"cloud"` - Network/API tools

**3. `webview-ui/src/context/ExtensionStateContext.tsx`**

Add the state property and setter to the extension context:

```typescript
export interface ExtensionStateContextType extends ExtensionState {
	// ... existing properties ...
	alwaysAllowDebug?: boolean
	alwaysAllowLsp?: boolean // Add this line
	// ... setters ...
	setAlwaysAllowDebug: (value: boolean) => void
	setAlwaysAllowLsp: (value: boolean) => void // Add this line
}

// In the ExtensionStateContextProvider component, add the setter:
const contextValue: ExtensionStateContextType = {
	// ... existing properties ...
	setAlwaysAllowDebug: (value) => setState((prevState) => ({ ...prevState, alwaysAllowDebug: value })),
	setAlwaysAllowLsp: (value) => setState((prevState) => ({ ...prevState, alwaysAllowLsp: value })), // Add this line
	// ... rest of setters
}
```

**4. `webview-ui/src/hooks/useAutoApprovalToggles.ts`**

Add the LSP state to the hook that provides toggle states:

```typescript
export function useAutoApprovalToggles() {
	const {
		// ... existing states
		alwaysAllowDebug,
		alwaysAllowLsp, // Add this line
	} = useExtensionState()

	const toggles = useMemo(
		() => ({
			// ... existing toggles
			alwaysAllowDebug,
			alwaysAllowLsp, // Add this line
		}),
		[
			// ... existing dependencies
			alwaysAllowDebug,
			alwaysAllowLsp, // Add this line
		],
	)

	return toggles
}
```

**5. `webview-ui/src/components/chat/AutoApproveMenu.tsx`**

Add the LSP handler to the menu component:

```typescript
const AutoApproveMenu = ({ style }: AutoApproveMenuProps) => {
	const {
		// ... existing states and setters
		setAlwaysAllowDebug,
		setAlwaysAllowLsp, // Add this line
	} = useExtensionState()

	const onAutoApproveToggle = useCallback(
		(key: AutoApproveSetting, value: boolean) => {
			vscode.postMessage({ type: key, bool: value })

			// Update the specific toggle state
			switch (key) {
				// ... existing cases
				case "alwaysAllowDebug":
					setAlwaysAllowDebug(value)
					break
				case "alwaysAllowLsp": // Add this case
					setAlwaysAllowLsp(value)
					break
				// ... rest of cases
			}
		},
		[
			// ... existing dependencies
			setAlwaysAllowDebug,
			setAlwaysAllowLsp, // Add to dependencies
			setAutoApprovalEnabled,
		],
	)
}
```

**6. `webview-ui/src/i18n/locales/en/settings.json`**

Add the translation strings for the UI labels:

```json
{
	"autoApprove": {
		// ... existing settings ...
		"debug": {
			"label": "Debug",
			"description": "Automatically approve debug operations without requiring confirmation"
		},
		"lsp": {
			"label": "LSP",
			"description": "Automatically approve Language Server Protocol operations without requiring confirmation"
		}
		// ... rest of settings
	}
}
```

**Summary of Required Files for Auto-Approval**

When adding auto-approval for a new tool group, ensure you update ALL of these files:

### Frontend Files (WebView UI):

1. **`packages/types/src/global-settings.ts`** - Add the setting to the schema
2. **`webview-ui/src/components/settings/AutoApproveToggle.tsx`** - Add to type and configuration
3. **`webview-ui/src/context/ExtensionStateContext.tsx`** - Add state and setter
4. **`webview-ui/src/hooks/useAutoApprovalToggles.ts`** - Add to the hook
5. **`webview-ui/src/components/chat/AutoApproveMenu.tsx`** - Add the switch case and dependencies
6. **`webview-ui/src/i18n/locales/en/settings.json`** - Add translation strings
7. **`webview-ui/src/components/settings/AutoApproveSettings.tsx`** - Add to props and parameter types
8. **`webview-ui/src/components/settings/SettingsView.tsx`** - Add to destructuring and save handlers

### Backend Files (Extension):

9. **`src/shared/WebviewMessage.ts`** - Add to WebviewMessage type union
10. **`src/shared/ExtensionMessage.ts`** - Add to ExtensionState type
11. **`src/core/webview/ClineProvider.ts`** - Must update THREE critical places:
    - Add to `getState()` return object
    - Add to `getStateToPostToWebview()` destructuring and return
    - Add to `shouldAutoApproveAsk()` for actual approval logic
12. **`src/core/webview/webviewMessageHandler.ts`** - Add case for handling toggle messages

### Critical Implementation Details:

- **IMPORTANT**: The `getState()` and `getStateToPostToWebview()` methods in ClineProvider.ts MUST include the new fields or the UI won't receive the state values
- The auto-approval check in `shouldAutoApproveAsk()` should use `this.globalState.get()` for consistency
- Missing ANY of these files will result in the toggle not appearing or not functioning

Missing any of these will result in:

- The toggle not appearing in the UI
- The button not highlighting when clicked
- TypeScript compilation errors
- State not being persisted or transmitted to the webview
- The tool group not appearing in the approved list
- Backend/frontend state mismatch

#### 5c. Implementing Auto-Approval Logic in Your Tool

**CRITICAL**: After setting up the UI auto-approval configuration, you MUST implement the actual auto-approval logic in your tool implementation. The UI only controls the setting - your tool must check and respect this setting.

**Location**: Your meta-tool implementation file (e.g., `src/core/tools/myGroupTool.ts`)

```typescript
// Inside your tool function, BEFORE calling askApproval
let didApprove = false
try {
	const provider = cline.providerRef.deref()
	const alwaysAllowMyGroup = provider?.contextProxy.getValue("alwaysAllowMyGroup")

	if (alwaysAllowMyGroup) {
		outputChannel.appendLine(
			`[My Group Tool] Auto-approval enabled, skipping user approval for operation '${my_group_operation}'`,
		)
		didApprove = true
	} else {
		outputChannel.appendLine(`[My Group Tool] About to call askApproval.`)
		didApprove = await askApproval("tool", completeMessage)
	}
} catch (approvalError: any) {
	outputChannel.appendLine(`[ERROR][myGroupTool] Error during approval check: ${approvalError.message}`)
	await handleError(`asking approval for my group operation '${my_group_operation}'`, approvalError)
	pushToolResult(formatResponse.toolError(`Error asking for approval: ${approvalError.message}`))
	return
}

if (!didApprove) {
	// User denied the operation - askApproval already handled the feedback and tool result
	return
}
```

**Key Points:**

- Access the provider via `cline.providerRef.deref()`
- Use `provider?.contextProxy.getValue("alwaysAllowMyGroup")` to get the setting
- Check the setting BEFORE calling `askApproval`
- If auto-approval is enabled, set `didApprove = true` and skip the approval call
- Always include proper error handling and logging

**Common Mistake**: Setting up all the UI auto-approval configuration but forgetting to implement the actual logic check in the tool. This results in the toggle appearing and highlighting correctly in the UI, but the tool still requiring manual approval.

#### 5d. Formatting the Tool Info for Approval

When using the `askApproval` function for a tool group, it's crucial to format the message clearly for the user. The recommended approach is to create a JSON object that includes the tool group, the specific operation, and the parameters.

```typescript
// Inside your meta-tool implementation (e.g., myGroupTool.ts)
import { ClineSayTool } from "../../shared/ExtensionMessage"

// ...

// Create a shared properties object
const sharedMessageProps = {
	tool: "my_group" as const, // The name of the tool group
}

// Construct the complete message for approval
const completeMessage = JSON.stringify({
	...sharedMessageProps,
	operation: my_group_operation, // The specific operation being called
	content: JSON.stringify(JSON.parse(_text || "{}"), null, 2), // Pretty-print the JSON arguments
} satisfies ClineSayTool)

// Request approval
const didApprove = await askApproval("tool", completeMessage)
```

This structured format ensures that the approval prompt in the UI is clear, readable, and provides all the necessary context for the user to make an informed decision.

#### 5d. Implementing Parameter Display in the WebView UI

For tool groups that need to show structured parameter information to users (like the `debug` tool), you need to implement parameter parsing and display logic in the WebView UI. This section details the exact implementation used by the `debug` tool as a reference.

**Location**: [`webview-ui/src/components/chat/ChatRow.tsx`](webview-ui/src/components/chat/ChatRow.tsx)

**1. Parameter Parsing Logic in `ChatRow.tsx`**

The UI parses JSON parameters from the tool's `content` field using a `useMemo` hook. This logic is located within the `ChatRowContent` component.

```typescript
const displayableArgs = useMemo(() => {
	// Only attempt to parse for the "debug" tool
	if (tool?.tool !== "debug" || !tool?.content || tool.content === "(No arguments)") {
		return null
	}
	try {
		const args = JSON.parse(tool.content)
		// Ensure it's an object and has keys
		if (typeof args === "object" && args !== null && Object.keys(args).length > 0) {
			return args
		}
	} catch (e) {
		// Not a valid JSON string or not an object, so no structured args to display
		console.error("Error parsing tool content for debug args:", e)
	}
	return null // Fallback: no displayable structured arguments
}, [tool])
```

**Key Points:**

- Only processes tools with a specific name (change `"debug"` to your tool name)
- Safely parses JSON with error handling
- Returns `null` if there are no valid, non-empty arguments to display, preventing the UI from rendering an empty box.

**2. Rendering Logic in `ChatRow.tsx`**

The component then uses the `displayableArgs` object to render the parameters in a structured list. This is found within the `switch` statement for `tool.tool`, under the `case "debug":`.

```typescript
// Conditionally render the arguments content area
{displayableArgs && (
    <div
        style={{
            padding: "12px 16px",
            backgroundColor: "var(--vscode-editor-background)",
        }}>
        <div style={{ ...pStyle, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {Object.entries(displayableArgs).map(([key, value]) => (
                <div key={key} style={{ display: 'flex' }}>
                    <strong style={{ minWidth: '120px', marginRight: '8px', flexShrink: 0 }}>{key}:</strong>
                    <span>{typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}</span>
                </div>
            ))}
        </div>
    </div>
)}
```

**Key Points:**

- The entire block is conditional on `displayableArgs` being truthy.
- It iterates over the parsed arguments using `Object.entries`.
- Each key-value pair is rendered on its own line with the key in bold, providing a clear and readable format.

By implementing this pattern, you can provide users with a transparent and informative UI for approving complex tool operations.

#### 5e. Adding Localization Strings for the UI

To ensure your new tool's UI text is displayed correctly and can be translated, you must add the necessary strings to the localization files.

**Location**: [`webview-ui/src/i18n/locales/en/chat.json`](webview-ui/src/i18n/locales/en/chat.json)

Add new keys to this JSON file for any text that appears in the UI. Following the `debug` tool's example, you would add entries for the approval prompt.

**Example from `debug` tool:**

```json
"ask": {
    "debug": {
        "wantsToExecute": "Zentara wants to execute debug operation: {{operation}}",
        "operation": "{{operation}}"
    }
}
```

**To add strings for your new "My Group" tool, you would add:**

```json
"ask": {
    "my_group": {
        "wantsToExecute": "Zentara wants to execute My Group operation: {{operation}}",
        "operation": "{{operation}}"
    }
}
```

These keys are then referenced in the UI components (like `ChatRow.tsx`) using the `t()` function from `react-i18next`, like so: `t("chat:ask.debug.wantsToExecute", { operation: operationName })`.

---

## Master Checklist and Troubleshooting

### Complete Tool Registration Checklist

#### For ALL New Tools:

- [ ] **Prompt File**: Create `src/core/prompts/tools/{category}/{tool_name}.ts`.
- [ ] **Prompt Index**: Export from `src/core/prompts/tools/{category}/index.ts`.
- [ ] **Prompt Map**: Map name to prompt in `src/core/prompts/tools/index.ts`.
- [ ] **Invocation Logic**: Add handler to `src/core/assistant-message/presentAssistantMessage.ts`.
- [ ] **Tool Name in `packages/types/src/tool.ts`**: Add to `toolNames`. (Source of Truth)
- [ ] **Tool Name in `src/schemas/index.ts`**: Add to `toolNames`.
- [ ] **Display Name in `src/shared/tools.ts`**: Add to `TOOL_DISPLAY_NAMES`. (Build will fail if missed)
- [ ] **Localization Strings**: Add UI text to `webview-ui/src/i18n/locales/en/chat.json`.
- [ ] **Tests**: Add unit and integration tests.

#### For NEW Tool Groups:

- [ ] **Tool Group Name in `packages/types/src/tool.ts`**: Add to `toolGroups`.
- [ ] **Tool Group Name in `src/schemas/index.ts`**: Add to `toolGroups`.
- [ ] **Mode Integration**: Add group to modes in `packages/types/src/mode.ts`.
- [ ] **UI Auto-Approval**: Update all 4 webview files if adding a new category.

### Troubleshooting UI Auto-Approval Issues

#### Issue 1: Auto-Approval Toggle Shows But Doesn't Work

- **Problem**: The auto-approve button for your new tool group appears in the UI, highlights when clicked, but the tool still requires manual approval.
- **Root Cause**: The UI configuration is complete, but the actual auto-approval logic is missing from the tool implementation.
- **Solution**: Implement the auto-approval check in your tool's code (see Section 5c). The tool must check `provider?.contextProxy.getValue("alwaysAllowYourTool")` BEFORE calling `askApproval`.

#### Issue 2: Auto-Approval Toggle Doesn't Appear or Highlight

- **Problem**: The auto-approve button for your new tool group doesn't highlight or appear in the approved list, even though the functionality works.
- **Solution**: This is almost always caused by missing a step in the UI configuration. Meticulously check that your new state is correctly integrated into **all four** webview files listed in Step 5b. The UI's state management and memoization depend on all of these files being updated correctly.

#### Issue 3: TypeScript Compilation Errors

- **Problem**: Missing the tool from `TOOL_DISPLAY_NAMES` or incorrect type definitions.
- **Solution**: Ensure the tool is added to both `packages/types/src/tool.ts` and `src/shared/tools.ts`. The build will fail if `TOOL_DISPLAY_NAMES` is incomplete.
