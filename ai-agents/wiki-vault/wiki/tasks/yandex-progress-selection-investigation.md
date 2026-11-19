# Investigate Yandex progress selection, identity and session behavior

**Source**: `ai-agents/tasks/backlog/0520-investigate-yandex-progress-selection-identity-and-session-behavior/brief.md`; `ai-agents/tasks/backlog/0520-investigate-yandex-progress-selection-identity-and-session-behavior/findings.md`; `ai-agents/tasks/backlog/0520-investigate-yandex-progress-selection-identity-and-session-behavior/worklog.md`
**Status**: backlog
**Sprint/Tag**: Backlog — task 0520

## Goal
Investigate how progress-selection choices affect identity, authentication, reload and session alignment, and compare prevention options. Recovery is separate and gains no dependency or wait.

## Key Changes
The 2026-11-04 findings report static code and documentation inspection at source frame `8378e14384e93edfdab372e81a9906845fdbcbf4`. No account-selection event handlers were found. The existing authentication refresh does not cover arbitrary selection; plain-player, signed-player, session, payment and match state have separate lifecycles. A newly verified identity alone does not prove ownership of an older paid profile or authorize automatic linking. Source: findings, `Local lifecycle trace` and `Established gaps versus hypotheses`.

The report recommends owner review of a bounded restart-based safety flow after safe SDK observations, with match, payment and guest-buy behavior requiring decisions. This is a proposal, not an approved implementation. `0394` and `0424` are broader context only; neither gains a dependency or wait. Source: findings, `Prevention options` and brief, `Notes`.

## Outcome
Local findings and an owner-run observation checklist were delivered. SDK reproduction was **not executed**; for both progress choices, identity, authentication, iframe reload and client/backend/session alignment remain unknown. Incident causality remains unproved. No tests were rerun, no source changes or implementation review were performed, and no implementation was approved. Source: findings, `Per-choice answers` and `Verification, decisions and hand-back`; worklog, `Findings and coverage`.

The brief still states Backlog even though the local findings are delivered. This is a source lifecycle discrepancy for the producer; it is not evidence of an in-progress or closed status.

## Related
- [[tasks/receipt-assisted-identity-recovery]] — task 0521, done (agent-closed — not owner-verified); proof/design only, automatic linking NO-GO.
- [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]]
