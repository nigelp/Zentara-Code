# Claude Max Provider Implementation - Problem Description

## Current Implementation Issues

### Inefficient Subprocess Architecture

The current Claude Code provider implementation in `/src/api/providers/claude-code.ts` suffers from several critical inefficiencies:

1. **Subprocess Overhead**: Uses `runClaudeCode()` function in `/src/integrations/claude-code/run.ts` which spawns a subprocess via `execa` to run `claude -p` command

    - Lines 179-194 in `run.ts`: Creates a child process with arguments, pipes stdin/stdout/stderr
    - Incurs significant overhead for process creation and IPC communication
    - Subject to platform-specific issues (Windows vs Linux command line limitations)

2. **Context Window Pollution**:

    - The subprocess includes Claude Code's internal system prompt, consuming valuable context tokens
    - System prompt is passed via command line arguments (non-Windows) or stdin (Windows)
    - No control over internal Claude Code prompt modifications

3. **Complex Message Processing**:

    - Messages must be serialized to JSON and passed through stdin (lines 199-206 in `run.ts`)
    - Response parsing through readline interface with complex chunk handling (lines 45-90)
    - Multiple layers of transformation: JSON → subprocess → stream → chunks → parsed messages

4. **Limited Error Handling**:

    - Relies on subprocess exit codes and stderr for error detection
    - ENOENT errors require special handling for missing Claude Code installation
    - Timeout hardcoded to 10 minutes (line 144: `CLAUDE_CODE_TIMEOUT = 600000`)

5. **Tool Restrictions**:
    - Hardcoded list of disabled tools (lines 125-142) to prevent built-in tool usage
    - No flexibility in tool configuration per request

## Proposed Solution: Claude Max Provider

### OAuth-Based Authentication Architecture

Based on the OpenCode implementation analysis, we will implement a new provider called "Claude Max" that uses OAuth authentication directly with the Anthropic API, bypassing the Claude Code CLI entirely.

### Key Components - NPM Plugin Strategy

1. **Authentication Plugin** (`opencode-anthropic-auth` npm package):

    - Published on npm registry (latest version: 0.0.2)
    - Automatically maintained and updated by the opencode team
    - Install via: `npm install opencode-anthropic-auth`
    - Uses OAuth 2.0 PKCE flow for secure authentication
    - Client ID: `9d1c250a-e61b-44d9-88ed-5944d1962f5e`
    - Supports two modes:
        - "max" mode: For Claude Pro/Max subscriptions (claude.ai endpoint)
        - "console" mode: For API key creation (console.anthropic.com endpoint)

2. **OAuth Flow Implementation**:

    ```javascript
    // Authorization (lines 8-33)
    - Generate PKCE challenge/verifier
    - Construct authorization URL with required scopes
    - Scopes: "org:create_api_key user:profile user:inference"

    // Token Exchange (lines 39-66)
    - Exchange authorization code for access/refresh tokens
    - POST to https://console.anthropic.com/v1/oauth/token
    - Returns refresh token, access token, and expiration time
    ```

3. **Token Management**:

    - Automatic token refresh when expired (lines 94-122)
    - Stores credentials in local auth.json file
    - Zero-cost pricing for Max plan users (lines 78-84)

4. **Custom Fetch Implementation**:
    - Intercepts API requests to add Bearer token authentication
    - Removes x-api-key header when using OAuth
    - Adds special beta headers for Claude Code features (line 127-128):
        ```
        "anthropic-beta": "oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14"
        ```

### Implementation Benefits

1. **Direct API Access**: No subprocess overhead, direct HTTPS requests
2. **Efficient Context Usage**: Full control over system prompts and message formatting
3. **Better Error Handling**: Standard HTTP error codes and JSON error responses
4. **Token Management**: Automatic refresh with persistent storage
5. **Cost Optimization**: Zero cost for Max plan subscribers
6. **Platform Independence**: No dependency on Claude Code CLI installation

### Required Implementation Steps

1. **Install NPM Dependencies**:

    - Add `opencode-anthropic-auth` as a dependency
    - This provides the OAuth flow and token management logic
    - Benefits: Automatic updates, maintained by opencode team

2. **Create New Provider Class**: `ClaudeMaxHandler` extending `BaseProvider`

    - Import and use the npm plugin for authentication
    - Leverage plugin's built-in OAuth flow and token refresh

3. **Integration with Plugin**:

    - Use plugin's `authorize()` function for OAuth flow
    - Use plugin's `exchange()` function for token exchange
    - Use plugin's automatic token refresh mechanism
    - Use plugin's custom fetch with Bearer authentication

4. **Credential Storage**:

    - Integrate plugin's auth storage with existing system
    - Plugin handles secure storage of refresh/access tokens

5. **API Integration**:

    - Direct calls to Anthropic API using plugin's fetch wrapper
    - Plugin automatically adds proper beta headers for Claude Code features
    - Plugin handles token refresh transparently

6. **Stream Processing**:
    - Direct stream parsing without subprocess intermediary
    - Efficient chunk handling for real-time responses

### Authentication Flow Sequence

1. User initiates login for Claude Max
2. Generate PKCE challenge/verifier
3. Open browser to claude.ai OAuth authorization page
4. User authorizes application
5. Receive authorization code
6. Exchange code for access/refresh tokens
7. Store tokens securely
8. Use access token for API requests
9. Automatically refresh when expired

This approach eliminates all subprocess overhead while providing seamless integration with Claude Pro/Max subscriptions, resulting in faster response times and more efficient context window usage.

### Advantages of NPM Plugin Approach

1. **Automatic Updates**:

    - Plugin updates are managed through npm
    - Security fixes and improvements are automatically available
    - No need to maintain OAuth implementation code

2. **Reduced Maintenance Burden**:

    - OAuth flow complexity is abstracted away
    - Token refresh logic is handled by the plugin
    - API changes are managed by the plugin maintainers

3. **Proven Implementation**:

    - Plugin is already tested in production by OpenCode
    - Edge cases and error handling are already addressed
    - Community-driven improvements and bug fixes

4. **Easy Integration**:

    - Simple npm install command
    - Well-defined plugin interface
    - Minimal code required in our provider implementation

5. **Version Control**:
    - Semantic versioning through npm
    - Lock file ensures consistent behavior
    - Easy rollback if issues arise
