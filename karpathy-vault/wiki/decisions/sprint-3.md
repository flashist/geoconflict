# Sprint 3 — Deepen Retention (Data-Driven)

**Date**: 2026 (current/active)
**Status**: accepted

## Context

Goal: address infrastructure quality and UX issues affecting all players. Mobile performance work formally parked based on analytics data. Ships after post-Sprint 2 hotfix.

Source: `ai-agents/sprints/plan-sprint-3.md`

## Tasks & Status

| Task | Description | Status |
|---|---|---|
| Humans vs Nations | Re-enable existing mode (AI fills all non-human slots) | Pending |
| Feedback — match IDs | Attach last 3 game IDs from `localStorage['game-records']` to feedback payload | ✅ Done |
| 5 — Mobile rendering | Deep rendering optimization | ⏸ Parked |
| 5c — Mobile warning | Non-blocking screen for mobile players with "Continue anyway" button | Pending |
| 5b — Server restart UX | Part A: pre-restart broadcast notification. Part B: auto-refresh polling loop | Pending |
| 5d-A — OTEL metrics | Server system metrics (CPU, memory, event loop lag, etc.) via OpenTelemetry | ✅ Done |
| 5d-B — Server perf | Threshold-based OTEL spans on `endTurn()` — awaiting data accumulation | ✅ Instrumentation done |
| HF-11a — Stale build investigation | Root cause: zombie tabs confirmed | ✅ Done |
| HF-11b — Version endpoint | `GET /api/version` returning `{ "build": "CURRENT_BUILD" }` | Pending |
| HF-11c — Client detection | Poll `/api/version`, fire `Build:StaleDetected` | Pending |
| HF-11d — Blocking modal | Non-dismissible REFRESH overlay when stale build detected | Pending |
| HF-11e — BUILD_NUMBER automation | ⛔ Cancelled — already automated via `scripts/bump-version.js` | Cancelled |
| HF-12 — Spawn camera timing | Fix: camera zoom fires at intent-send, should fire at confirmed placement | Pending |
| HF-13 — Map preloading | Preload map assets on JOIN to reduce `CatchupTooLong` | Pending |

## Key Decisions

**Mobile rendering parked:** desktop is core audience (3,500 DAU vs 700 mobile). Mobile deep optimization is a 3–6 week investment for users at half the engagement depth. Condition to revisit: mobile DAU > 1,500 consistently. Mobile quick wins (Task 3) already shipped.

**Server restart UX — Part B first:** Part B (auto-refresh polling loop) ships independently and has higher priority — resolves silent freeze with no deployment process changes. Part A (pre-restart notification) is a nice-to-have.

**Feedback match IDs (simple):** the cancelled `task-feedback-match-history.md` scope was too large. Replacement: read existing `localStorage['game-records']` (keyed by game ID, already written by `LocalPersistantStats.ts`) and attach last 3 IDs. No new write logic.

**Humans vs Nations safe to re-enable:** unlike Teams mode, AI fills all non-human slots regardless of lobby size. Teams mode stays disabled.

## Consequences

- HF-11b/c/d is the complete fix for zombie tabs — no other CDN or cache changes needed
- 5d-B spans are in production — check Uptrace for slow-turn patterns once data accumulates
- `Match:SpawnMissed:CatchupTooLong` still unresolved — HF-13 (map preloading) is the mitigation path

## Related

- [[decisions/product-strategy]] — sprint ordering rationale
- [[decisions/hotfix-post-sprint2]] — what shipped before this sprint
- [[decisions/sprint-4]] — next sprint
- [[decisions/stale-build-zombie-tabs]] — HF-11a findings detail
- [[decisions/cancelled-tasks]] — HF-11e, feedback match history
- [[tasks/stale-build-detection]] — HF-11b/c/d implementation spec (version endpoint, client polling, modal)
- [[tasks/spawn-ux]] — HF-12 moves camera/animation from intent-send to confirmed-placement time
- [[systems/telemetry]] — 5d-A/B OTEL instrumentation
- [[systems/server-performance]] — 5d-B performance investigation
