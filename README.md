# Roo Code — AI Coding Assistant for VS Code

Roo Code turns chat instructions into precise, auditable changes in your codebase. It is optimized for speed, safety, and correctness through parallel execution, LSP semantics, and integrated runtime debugging.

## What Makes Roo Different

- Parallel subagents: Independent workers run simultaneously with strict scope separation, opt‑in write permissions, and per‑agent timeouts for high throughput without conflicts.
- Integrated LSP tools: Operations use the Language Server Protocol for file structure, semantic references, call hierarchy, safe renames, workspace‑wide symbol discovery, and targeted snippets.
- Runtime debugging: Launch, control, and inspect debug sessions from tasks to reproduce, instrument, step, and validate before concluding changes.

## Installation

- VS Code Marketplace: Search for Roo Code in the Extensions view.
- VSIX: Use “Install from VSIX...” from the Extensions view overflow menu.

## Quick Start

1. Install Roo Code and open a folder in VS Code.
2. Open the Command Palette and run “Roo: Open Chat”.
3. Describe your goal (e.g., “Add pagination to the API”).
4. Review the proposed plan and approve steps.
5. Inspect diffs, iterate, and—when needed—use the debug controls to validate at runtime.

## Workflow Model

- Plan: Roo decomposes your request into small, independent steps and proposes safe execution order.
- Approvals: Potentially impactful actions (file writes, network, long operations) require explicit approval.
- Execute: Steps are distributed to parallel subagents when independent to reduce wall‑clock time.
- Analyze: Code understanding is LSP‑first (document symbols → usages → call hierarchy → targeted snippets).
- Verify: Integrated debugging provides breakpoints, stepping, state inspection, and evaluation to confirm behavior.

## Core Capabilities

- Code understanding
  - File and module structure (symbols)
  - True semantic usages across the workspace
  - Caller/callee relationships via call hierarchy
  - Targeted code snippets for precise context
- Code generation and edits
  - Feature implementation, bug fixes, refactors
  - Safe, reviewable diffs with minimal surface area
  - Style‑ and framework‑aware changes
- Safe refactoring
  - Semantic rename and interface/contract alignment
  - Impact analysis before signature changes
- Debugging
  - Launch/continue/step‑in/step‑out/next/until/jump
  - Set/enable/disable/remove/conditional/temp breakpoints
  - Inspect stack frames, variables, and source
  - Evaluate expressions and execute statements where supported
- Documentation and tests
  - Generate READMEs, API docs, and test scaffolds
  - Propose focused unit/integration tests
- Project automation
  - Script generation, config updates, and task runners

## Parallel Subagents (Performance and Safety)

- Isolation: Each worker runs with its own context and is assigned non‑overlapping scope (files, features, layers).
- Permissions: Writes are opt‑in and constrained to allowed paths; read‑only by default.
- Timeouts: Per‑agent execution is time‑bounded to prevent runaway tasks.
- Determinism: Plans enumerate inputs/outputs; results are merged with conflict avoidance.
- Observability: You can inspect each subtask’s plan and results before moving on.

## LSP‑First Code Intelligence (Accuracy)

- Structure: Get symbol trees without reading entire files.
- Usages: Find real references, not text matches.
- Call graph: See who calls what to understand flows and side effects.
- Safety: Use semantic information to avoid dangerous edits and hidden couplings.
- Scope: Ask for just the code that matters via targeted snippets to reduce noise.

## Runtime Debugging (Validation)

- Control: Launch sessions, continue, step, and stop from within Roo tasks.
- Breakpoints: Add, remove, enable/disable, conditional, and temporary breakpoints.
- Inspection: View stack traces, active frame variables, arguments, and source context.
- Evaluation: Evaluate expressions and run statements in the current context where supported.
- Integration: Use debugging during or after code edits to verify correctness before finalizing.

## Approvals and Safety Model

- Sandboxing: Filesystem and network access can be restricted at the workspace level.
- Diffs: All edits are presented as diffs for explicit review before applying.
- Revert: Decline or roll back changes if the proposed approach is not acceptable.
- Guardrails: Write paths and operation classes are gated to prevent destructive actions.
- Resource caps: Concurrency and time limits prevent overload and preserve responsiveness.

## Commands

- Use the Command Palette and type “Roo” to discover all commands:
  - Open Chat
  - Start New Task
  - Show Plan / Approve Step
  - View Diffs
  - Debug Controls (breakpoints, stepping, evaluation)

## Settings

- Approvals Mode: When and how Roo asks for permission to perform actions.
- Filesystem Access: Configure allowed write paths and sandboxing.
- Network Access: Restrict or allow outbound connections as needed.
- Model/Provider: Choose the backing model where applicable.
- Telemetry: Opt in or out of anonymized usage metrics.
- Language: Select your preferred UI language.

## Troubleshooting

- No actions occur
  - Ensure a folder is open; check the Roo panel for pending approvals.
- Slow or timeouts
  - Reduce task scope or allow Roo to shard work into smaller subtasks.
  - Verify network conditions if using remote models.
- Permission denied
  - Adjust approvals and write paths; confirm sandbox settings.
- Unexpected edits
  - Review diffs, decline, and request a revised plan.

## Privacy

- Your code stays local unless a feature explicitly needs remote access.
- Approvals ensure you are informed before impactful operations execute.
- Telemetry is optional, minimal, and configurable.

## Prompting Tips

- Be goal‑oriented: describe the outcome, constraints, and acceptance criteria.
- Provide guardrails: performance budgets, API boundaries, style preferences.
- Embrace iteration: accept partial progress and refine.
- Let Roo plan: approve or edit its proposed steps rather than dictating line‑level changes.

## Support

- Open the Roo panel to review actionable notices or errors.
- Use the Output and Problems panels for diagnostics.
- If issues persist, reinstall the extension or try a minimal reproduction in a fresh workspace.
