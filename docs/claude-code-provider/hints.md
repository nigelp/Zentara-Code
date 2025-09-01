ummary
Currently, llm-orc requires users to manually enter API keys for Anthropic authentication. However, research shows that it's possible to enable users to sign in directly with their existing Claude Pro/Max accounts using OAuth.

✅ Research Status: COMPLETE
Investigation has successfully proven that OAuth authentication with Claude Pro/Max accounts is fully functional.

🔬 Key Findings
OAuth Authentication Requirements
OAuth Bearer Token: Standard OAuth 2.0 access token with anthropic-beta: oauth-2025-04-20 header
User-Agent Header: Any valid User-Agent string works (tested LLM-Orchestra/Python 0.3.0)
System Prompt: Must include "You are Claude Code, Anthropic's official CLI for Claude." for token validation
Client ID: Uses 9d1c250a-e61b-44d9-88ed-5944d1962f5e (registered with Anthropic)
✅ Proven Working Implementation
OAuth Flow: Complete PKCE-based authorization working
Token Exchange: Successfully exchanges auth codes for access tokens
API Calls: Confirmed working with LLM-Orchestra/Python 0.3.0 User-Agent
Authentication Methods: No need to spoof OpenCode identity
🎯 Three Authentication Modes Available
API Key (existing): Direct Anthropic API key entry
OAuth (new): Claude Pro/Max account login via OAuth ✅ COMPLETE
Claude CLI Fallback (planned): Use local claude command with ANTHROPIC_API_KEY unset
📋 Integration Task List
Phase 1: Core OAuth Integration ✅ COMPLETE

Create OAuthClaudeModel class extending ModelInterface

Integrate OAuth client from oauth_testing/test_flow.py into main codebase

Update CredentialStorage to handle OAuth token persistence and refresh

Update ModelManager to support OAuth-authenticated models

Add comprehensive test suite for OAuth functionality

Use dynamic version in OAuth client User-Agent header
Phase 2: CLI Integration & Enhanced Authentication ✅ COMPLETE

Add OAuth authentication option to CLI interface

Implement automatic token refresh in OAuthClaudeModel

Add OAuth token validation and error handling

Create unified authentication selection in CLI (api-key, oauth, claude-cli)

Update configuration system to store authentication preference

Add OAuth logout/token revocation functionality

CLI command: llm-orc auth add anthropic-claude-pro-max

Interactive OAuth flow with browser integration

Complete ensemble integration and testing
Phase 3: Conversation State Management ✅ COMPLETE

Implement conversation history tracking in models

Add multi-turn conversation support to OAuth Claude models

Enable persistent conversation context within sessions

Handle token refresh without losing conversation state

Test conversation capabilities in ensemble context
⭐ Phase 4: OAuth Role Injection ✅ BREAKTHROUGH COMPLETE

Automatic Role Injection: OAuth models can now play any specialized role while maintaining required system prompt

Role Flexibility: Financial analysts, marketing strategists, legal advisors, etc. using OAuth authentication

TDD Implementation: Complete test suite with 6 comprehensive test cases

Conversation Integration: Role establishment persists across conversation turns

Performance Optimization: Smart role injection (only when needed, no duplication)

Authentication Transparency: Users don't need to understand OAuth constraints
🔧 Phase 5: Token Expiration Handling ✅ CRITICAL FIX COMPLETE

Graceful Token Refresh: Fixed OAuth token expiration in ensemble execution

Client ID Storage: Enhanced credential storage to include client_id for token refresh

Fallback Mechanism: Added hardcoded client_id fallback for anthropic-claude-pro-max

Backward Compatibility: Existing OAuth setups continue working with automatic fallback

Error Recovery: Eliminated "Token expired - refresh needed" errors in ensemble execution
Phase 6: Claude CLI Fallback

Implement ClaudeCLIModel class using subprocess calls to claude

Add environment variable management (ANTHROPIC_API_KEY unset)

Detect local Claude CLI installation

Add fallback selection logic when OAuth becomes unavailable
Phase 7: User Experience

Add authentication setup wizard for new users

Improve error messages for authentication failures

Add authentication status display in CLI

Update documentation with OAuth setup instructions

Add migration guide for existing API key users
🛡️ Fallback Strategy
If Anthropic restricts the OAuth flow in the future, we have a proven fallback:

Use local claude CLI with ANTHROPIC_API_KEY unset
Assumes user has authenticated locally with claude auth login
Provides interface compatibility while using official Claude CLI
🔧 Technical Implementation Notes
Required Headers for OAuth:

headers = {
"Authorization": f"Bearer {oauth_token}",
"anthropic-beta": "oauth-2025-04-20",
"User-Agent": f"LLM-Orchestra/Python {**version**}", # Dynamic version
"Content-Type": "application/json"
}
Required System Prompt:

system = "You are Claude Code, Anthropic's official CLI for Claude."
Role Injection Implementation:

def \_inject_role_if_needed(self, role_prompt: str) -> None:
"""Inject role establishment into conversation if needed."""
oauth_system_prompt = (
"You are Claude Code, Anthropic's official CLI for Claude."
)

    # Don't inject role if it's the OAuth system prompt itself
    if role_prompt == oauth_system_prompt:
        return

    # Don't inject role if already established with the same role
    if self._role_established and self._current_role == role_prompt:
        return

    # Inject role establishment
    role_message = f"For this conversation, please act as: {role_prompt}"
    self.add_to_conversation("user", role_message)

    # Add assistant acknowledgment
    acknowledgment = "Understood. I'll act in that role for our conversation."
    self.add_to_conversation("assistant", acknowledgment)

    # Mark role as established
    self._role_established = True
    self._current_role = role_prompt

Token Expiration Fix Implementation:

# Enhanced credential storage with client_id

def store_oauth_token(
self,
provider: str,
access_token: str,
refresh_token: str | None = None,
expires_at: int | None = None,
client_id: str | None = None, # Added for token refresh
) -> None:
if client_id:
credentials[provider]["client_id"] = client_id

# Ensemble execution with fallback client_id

client_id = oauth_token.get("client_id")
if not client_id and model_name == "anthropic-claude-pro-max":
client_id = "9d1c250a-e61b-44d9-88ed-5944d1962f5e" # Fallback
Priority: High - Significantly improves user onboarding
Effort: Medium - Core implementation proven, needs integration
Impact: High - Eliminates API key management friction

Status

Research OAuth feasibility

Implement working prototype

Test with LLM-Orchestra identity

Phase 1: Core OAuth Integration (COMPLETE)

Phase 2: CLI Integration & Enhanced Authentication (COMPLETE)

Phase 3: Conversation State Management (COMPLETE)

Phase 4: OAuth Role Injection (BREAKTHROUGH COMPLETE)

Phase 5: Token Expiration Handling (CRITICAL FIX COMPLETE)

Phase 6: Claude CLI fallback

Phase 7: User Experience & Documentation
🎉 Recent Major Achievements
Commit 463ed2a - Complete OAuth CLI Integration:
✅ Full OAuth Flow: llm-orc auth add anthropic-claude-pro-max command
✅ PKCE Security: Complete OAuth 2.0 with PKCE implementation
✅ Browser Integration: Automatic browser opening and user guidance
✅ Ensemble Support: Enhanced configuration with task and system_prompt fields
✅ TDD Test Suite: Comprehensive tests validating OAuth functionality
✅ Error Handling: Token refresh, network errors, graceful degradation
Commit ceea02a - Conversation State Management:
✅ Multi-Turn Conversations: OAuth models maintain conversation history
✅ Context Preservation: Messages persist across multiple interactions
✅ Token Refresh Handling: Conversation state preserved during OAuth refresh
✅ Agent Integration: Agents support persistent conversations
✅ Ensemble Compatibility: Works seamlessly with ensemble orchestration
⭐ Commit 775fd7a - Role Injection BREAKTHROUGH:
✅ Critical Problem Solved: OAuth system prompt limitation completely overcome
✅ Multi-Agent Role Flexibility: OAuth models can now be financial analysts, marketing strategists, legal advisors, etc.
✅ Automatic Role Injection: Transparent role establishment via conversation messages
✅ TDD Implementation: 6 comprehensive test cases ensuring reliability
✅ Performance Optimized: Smart injection (only when needed, role persistence)
✅ Real-World Validation: Tested with actual OAuth tokens and ensemble configurations
🔧 Latest Commit - Token Expiration CRITICAL FIX:
✅ Eliminated Token Errors: Fixed "Token expired - refresh needed" errors in ensemble execution
✅ Enhanced Storage: Added client_id to OAuth token storage for proper refresh capability
✅ Automatic Fallback: Hardcoded client_id fallback for anthropic-claude-pro-max models
✅ Seamless Refresh: OAuth tokens now refresh automatically without user intervention
✅ Backward Compatible: Existing OAuth setups work immediately with fallback mechanism
🚀 Current Capabilities
End-to-End OAuth Authentication:

# Set up OAuth authentication

llm-orc auth add anthropic-claude-pro-max

# Use in ensembles with specialized roles (now with automatic token refresh)

llm-orc invoke multi-role-test

# List configured providers

llm-orc auth list

# Test authentication

llm-orc auth test anthropic-claude-pro-max
Multi-Agent Role Flexibility:

# OAuth models can now play any role with automatic token management

agents:

- name: financial-analyst
  model: anthropic-claude-pro-max
  system_prompt: "You are a financial analyst specializing in startup valuations."

- name: marketing-strategist  
   model: anthropic-claude-pro-max
  system_prompt: "You are a marketing strategist specializing in B2B SaaS campaigns."
  Graceful Token Management:

Automatic token refresh when tokens expire
No "Token expired" errors in ensemble execution
Seamless continuation of long-running tasks
Transparent token lifecycle management
✨ What's Working Now
Complete OAuth Authentication: Users can authenticate with Claude Pro/Max accounts
Seamless CLI Integration: Simple commands for OAuth setup and management
Ensemble Integration: OAuth models work with all ensemble configurations
⭐ Multi-Agent Role Flexibility: OAuth models can play any specialized role (financial analyst, marketing strategist, etc.)
🔧 Graceful Token Management: Automatic token refresh eliminates expiration errors
Conversation Continuity: Multi-turn conversations with persistent context
Error Recovery: Graceful handling of authentication failures
Backward Compatibility: Existing API key authentication continues to work
📝 Next Steps
While the core OAuth functionality is complete and working reliably, the remaining tasks focus on:

Claude CLI Fallback: Alternative authentication method using local claude command
User Experience: Setup wizards, better error messages, documentation
Advanced Features: Authentication preference management, migration tools
The OAuth authentication system is now production-ready with robust token management and provides a significantly improved user experience for Claude Pro/Max subscribers with full multi-agent role flexibility.

🎯 User Impact
Before Token Fix:

Agent Results:
conversational-claude: ERROR - Token expired - refresh needed
Status: completed_with_errors
After Token Fix:

Agent Results:
conversational-claude: ✅ [Response generated successfully]
Status: completed
OAuth authentication now works seamlessly without manual token management!
