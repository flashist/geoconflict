# Sprint 3 — Deepen Retention (Data-Driven)

**Date**: 2026
**Status**: accepted

## Context

Goal: address infrastructure quality and UX issues affecting all players. Mobile performance work formally parked based on analytics data. Ships after post-Sprint 2 hotfix.

Source: `ai-agents/sprints/plan-sprint-3.md`

## Tasks & Status

| Task | Description | Status |
|---|---|---|
| Humans vs Nations | Re-enable Humans vs Nations; investigation expanded scope and all team modes were restored | ✅ Done |
| Feedback — match IDs | Attach last 3 game IDs from `localStorage['game-records']` to feedback payload | ✅ Done |
| 5 — Mobile rendering | Deep rendering optimization | ⏸ Parked |
| 5c — Mobile warning | Non-blocking screen for mobile players with "Continue anyway" button | ➡️ Moved to Sprint 6 |
| 5b — Server restart UX | Part A: pre-restart broadcast notification. Part B: auto-refresh polling loop | ➡️ Moved to Sprint 6 |
| 5d-A — OTEL metrics | Server system metrics (CPU, memory, event loop lag, etc.) via OpenTelemetry | ✅ Done |
| 5d-B — Server perf | Threshold-based OTEL spans on `endTurn()` and investigation findings in Uptrace | ✅ Done |
| HF-11a — Stale build investigation | Root cause: zombie tabs confirmed | ✅ Done |
| HF-11b — Version endpoint | `GET /api/version` returning `{ "build": "CURRENT_BUILD" }` | ✅ Done |
| HF-11c — Client detection | Poll `/api/version`, fire `Build:StaleDetected` | ✅ Done |
| HF-11d — Blocking modal | Non-dismissible REFRESH overlay when stale build detected | ✅ Done |
| HF-11e — BUILD_NUMBER automation | Already automated via `scripts/bump-version.js` | ⛔ Cancelled |
| HF-12 — Spawn camera timing | Move auto-spawn camera/indicator from intent-send to confirmed placement | ✅ Done |
| HF-13 — Map preloading | Preload map assets on JOIN to reduce `CatchupTooLong` | ✅ Done |
| UI:ClickMultiplayer investigation | Verify exact firing point before using the metric as a funnel anchor | Backlog |

## Key Decisions

**Mobile rendering parked:** desktop is the core audience (3,500 DAU vs 700 mobile). Mobile deep optimization remains a 3–6 week investment for users at roughly half the engagement depth. Condition to revisit: mobile DAU > 1,500 consistently. Mobile quick wins (Task 3) already shipped.

**Server restart UX moved out:** Part B (auto-refresh polling loop) remains the more important half, but the whole task moved to Sprint 6 because the game remains usable without it and the current reduced weekend release cadence lowers its urgency.

**Feedback match IDs (simple):** the cancelled `task-feedback-match-history.md` scope was too large. Replacement: read existing `localStorage['game-records']` (keyed by game ID, already written by `LocalPersistantStats.ts`) and attach last 3 IDs. No new write logic.

**Humans vs Nations scope expanded:** investigation showed the suspected lobby-composition failure was not a stability problem. AI fills empty slots before match start, so all team modes were re-enabled, not just Humans vs Nations.

## Consequences

- HF-11b/c/d is the complete stale-build detection flow on the client and server
- 5d-B spans are in production; correlate them with 5d-A system metrics in Uptrace when slow-turn data accumulates
- HF-13 reduces `Match:SpawnMissed:CatchupTooLong` by moving map loading earlier, but it does not eliminate every spawn failure case
- Server restart UX no longer sits in Sprint 3 backlog; it is deferred to [[decisions/sprint-6]]
- Mobile warning was deferred out of this sprint and now lives in [[decisions/sprint-6]]

## Related

- [[decisions/product-strategy]] — sprint ordering rationale
- [[decisions/hotfix-post-sprint2]] — what shipped before this sprint
- [[decisions/sprint-2]] — previous feature sprint whose onboarding work this sprint refined
- [[decisions/sprint-4]] — next sprint
- [[decisions/sprint-6]] — mobile warning moved here as a later content-supporting task
- [[decisions/stale-build-zombie-tabs]] — HF-11a findings detail
- [[decisions/cancelled-tasks]] — HF-11e, feedback match history
- [[tasks/stale-build-detection]] — HF-11b/c/d implementation spec (version endpoint, client polling, modal)
- [[tasks/spawn-ux]] — HF-12 moves camera/animation from intent-send to confirmed-placement time
- [[systems/telemetry]] — 5d-A/B OTEL instrumentation
- [[systems/server-performance]] — 5d-B performance investigation
- [[features/feedback-button]] — Sprint 3 extended the feedback payload with last 3 match IDs
