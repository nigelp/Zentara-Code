# Architect Opinion and Revised Plan: Subagent Approval UI Reliability

Summary
- The previous plans are tactically sound but primarily symptom-focused.
- Core issue: monolithic global context pushes high-frequency subagent streaming updates through the same pipeline as low-frequency app state, causing render thrash and DOM instability around approval controls.
- Immediate mitigations should be applied, but durability requires isolating fast-cadence state and stabilizing the approval UI’s rendering surface.

What I agree with
- Batching state updates to reduce commit frequency.
- Stabilizing handlers and context values to curb avoidable re-renders.
- Avoiding debouncing for user interactions; only consider for cosmetic streaming.

What I would change or add
- Portalize the approval controls so they render outside the streaming subtree, eliminating DOM replacement during bursts.
- Replace whole-array state updates with keyed patching by taskId to create shallow-stable props for React.memo to work.
- Use optimistic acknowledgment on click to immediately hide/disable the pressed control; reconcile on backend ack to decouple user action from the streaming cadence.
- Introduce a dedicated subagent state provider to isolate high-frequency updates from the main extension state.
- Use non-urgent update scheduling for purely visual streaming text to keep input interactions responsive.

Revised implementation plan (supersedes prior sequence)

Phase 1 — Immediate stabilization (safe, fast, high impact)
1) Centralized batching of message-driven updates
   - Consolidate all window message setState calls in one dispatcher in [webview-ui/src/context/ExtensionStateContext.tsx](webview-ui/src/context/ExtensionStateContext.tsx).
   - Wrap the switch on message types in a single batched section per event tick.
   - Optional: coalesce bursts using requestAnimationFrame to avoid multiple commits per frame.

2) Portalize approval UI
   - Host the approval controls (buttons/modals) in a top-level container via a React portal so they are not descendants of streaming content.
   - Candidate mounting sites: [webview-ui/src/App.tsx](webview-ui/src/App.tsx) or a sibling layout shell used by [webview-ui/src/components/chat/ChatView.tsx](webview-ui/src/components/chat/ChatView.tsx).
   - Update [webview-ui/src/components/chat/SubagentStack.tsx](webview-ui/src/components/chat/SubagentStack.tsx) to render its controls into the portal host.

3) Optimistic acknowledgment for approval actions
   - On click, immediately mark the specific approval as “handled” in local UI state and disable/hide the control; send message to extension; reconcile on ack/failure.
   - Apply where the user reported flakiness: [webview-ui/src/components/chat/SubagentStack.tsx](webview-ui/src/components/chat/SubagentStack.tsx) and [webview-ui/src/components/chat/ChatView.tsx](webview-ui/src/components/chat/ChatView.tsx).

4) Stabilize handler identities and context values
   - Memoize click handlers and context values with minimal dependencies in files above.
   - Avoid capturing fast-changing values in callbacks; derive them at call time from refs or selectors if needed.

5) Switch to keyed patching for subagent tasks
   - Internally store tasks in a Map keyed by taskId; only update changed entries on each message.
   - Derive a shallow-stable array for rendering so React.memo comparisons succeed.
   - Start here even before the state split; it reduces churn immediately.

Success criteria for Phase 1
- ≥ 99% click success during 3+ concurrent streams.
- < 100 ms click-to-UI-change for approval controls.
- ≥ 50% reduction in total commits during a 10 s streaming burst (React Profiler).

Phase 2 — Structural isolation of fast-cadence state
1) Introduce a dedicated subagent state provider
   - Create and mount a new provider in [webview-ui/src/context/SubagentStateContext.tsx](webview-ui/src/context/SubagentStateContext.tsx).
   - Move handling of parallelTasksUpdate out of the main provider in [webview-ui/src/context/ExtensionStateContext.tsx](webview-ui/src/context/ExtensionStateContext.tsx).
   - Consumers that render streaming subagent UI (e.g., [webview-ui/src/components/chat/SubagentStack.tsx](webview-ui/src/components/chat/SubagentStack.tsx)) read from the new provider; other app surfaces stay on the main provider.

2) Scheduling and coalescing of non-urgent updates
   - For purely visual streaming text, schedule non-urgent work to keep input interactions responsive.
   - Coalesce rapid bursts to one commit per frame when possible; never delay user action state.

3) Refine data shape and selectors
   - Keep internal storage normalized (Map by taskId) with memoized selectors to feed components only the props they need.
   - Ensure derived arrays and objects are shallow-stable across frames when underlying data does not change.

Success criteria for Phase 2
- Streaming updates do not re-render components that do not consume subagent state.
- Approval UI DOM node identity remains stable across a 30 s stress test.
- No perceptible lag in input interactions (< 50 ms).

Phase 3 — Test coverage, metrics, and guardrails
1) Instrumentation
   - Add lightweight metrics: click success ratio, click-to-ack latency, commit count per 10 s streaming window.
   - Log these around the approval flows in the components named above.

2) Automated tests
   - Unit tests for optimistic acknowledgment and state reconciliation in [webview-ui/src/components/chat/SubagentStack.tsx](webview-ui/src/components/chat/SubagentStack.tsx).
   - Integration tests simulating parallelTasksUpdate bursts while performing approval clicks in [webview-ui/src/components/chat/ChatView.tsx](webview-ui/src/components/chat/ChatView.tsx).
   - Ensure test execution follows the repo’s vitest rules noted in [/.roo/rules/rules.md](/.roo/rules/rules.md).

3) Operational guardrails
   - Regression alarms if click success < 99% or click-to-UI-change > 150 ms under load.
   - Feature flag the new provider and portalization to allow fast rollback.

Rollback plan
- All Phase 1 changes are independently revertible.
- The Phase 2 provider can be toggled via feature flag to fall back to the previous state path.
- Portalization can be toggled without code removal by switching the render target back to local.

File-by-file worklist
- [webview-ui/src/context/ExtensionStateContext.tsx](webview-ui/src/context/ExtensionStateContext.tsx): centralize batching; remove parallelTasks from provider in Phase 2.
- [webview-ui/src/context/SubagentStateContext.tsx](webview-ui/src/context/SubagentStateContext.tsx): new provider to isolate subagent state; implement keyed patching and coalescing.
- [webview-ui/src/components/chat/SubagentStack.tsx](webview-ui/src/components/chat/SubagentStack.tsx): portalization of controls; optimistic ack; memoized handlers; consume new provider.
- [webview-ui/src/components/chat/ChatView.tsx](webview-ui/src/components/chat/ChatView.tsx): ensure approval strip is sourced from the portal host; avoid coupling to streaming text; tests for interaction under load.
- [webview-ui/src/App.tsx](webview-ui/src/App.tsx): mount the portal host container; wire providers.
- [webview-ui/src/components/chat/ToolDisplay.tsx](webview-ui/src/components/chat/ToolDisplay.tsx): mark purely visual streaming text paths as non-urgent where feasible.

Risks and mitigations
- Risk: Portalization introduces focus management complexity for keyboard users.
  Mitigation: Ensure focus is programmatically routed to the portalized controls after mount; restore focus on close.
- Risk: Entity map introduces ordering drift.
  Mitigation: Maintain a stable sort key and memoize the derived array; assert stable identities in tests.
- Risk: Over-optimization harms readability.
  Mitigation: Encapsulate patterns (entity map, selectors, portal host) behind small utilities; document in code comments.

Acceptance criteria (sign-off)
- Manual trials: 100/100 approval clicks succeed during active streaming with 3–5 subagents; controls respond within 100 ms.
- React Profiler: commits reduced by ≥ 50% in a 10 s streaming run; approval control subtree remains mounted with stable node identity.
- No regressions in auto-approval toggles, follow-up suggestion flows, or history rendering.

Appendix — rationale for not relying on click guards
- Click-queue/stopPropagation-based guards are a last resort. With portalized controls, optimistic UI, batched updates, and state isolation, the DOM should be stable enough that such guards are unnecessary. Keeping them out avoids subtle interference with virtualization and dialog layers.

References to prior docs (for traceability)
- Prior proposal: [approval_button_fix_proposal.md](approval_button_fix_proposal.md)
- Strategy review: [fix_strategy_review.md](fix_strategy_review.md)
- Critical analysis: [critical_opinion_on_fix_strategy.md](critical_opinion_on_fix_strategy.md)
- Test and performance rules: [/.roo/rules/rules.md](/.roo/rules/rules.md)

End of plan