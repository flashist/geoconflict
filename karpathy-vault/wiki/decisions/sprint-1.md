# Sprint 1 — Stop the Bleeding

**Date**: 2026 (completed)
**Status**: accepted

## Context

Goal: reduce ghost rate (30–50% of lobby players never becoming active) and crash-driven abandonment. All items shipped within one week.

Source: `ai-agents/sprints/done/plan-sprint-1.md`

## Decision

| Task | Description | Status |
|---|---|---|
| 1 — Analytics | Session & match event tracking (GameAnalytics SDK) | ✅ Done |
| 2 — Reconnection | Tab crash reconnection — already implemented | ✅ Done |
| 2a — Reconnect analytics | 5-event funnel: shown → accepted → declined → succeeded → failed | ✅ Done |
| 2b — Feedback button | In-game feedback overlay with category/text/context attachment | ✅ Done |
| 2c — Device info | Auto-attach user agent, CPU, RAM, GPU, screen info to feedback | ✅ Done |
| 2d — Session analytics | `Session:Start`, `Session:Heartbeat`, `Session:FirstAction`, spawn events | ✅ Done |
| 2e — Perf monitoring | FPS buckets + memory sampling every 60s | ✅ Done |
| 2f — Device/platform events | `Device:mobile/desktop`, `Platform:android/ios/windows/...` | ✅ Already shipped |
| 2g — New/returning | `Player:New` + `Player:Returning` | ✅ Done |
| 2h — Sentry | JS error/crash monitoring with source maps | ✅ Done |
| 2i — Microsoft Clarity | Session recordings/heatmaps | ⏸ Deferred |
| 2j — Spawn anomaly | Investigation: desktop ghost rate 8.8% was measurement artifact (touch-only listener) | ✅ Fixed |
| 3 — Mobile quick wins | Retina off, 30fps cap, FX reduction on mobile | ✅ Done |

## Key Learning (Task 2j)

Desktop ghost rate appeared as 8.8% (vs mobile 20%) — but this was a measurement bug. `Match:SpawnChosen` was touch-event-only, so desktop clicks never fired the event. After fix: **both platforms show ~20% ghost rate**. This means ghost rate is a universal onboarding problem, not a mobile-specific crash problem. Tasks 4a and 4c are the correct interventions.

## Consequences

- Analytics baseline established — all future A/B decisions rest on this
- Sentry baseline established — errors before Task 3 (mobile quick wins) are measurable
- Microsoft Clarity deferred until mobile FPS data shows stability (gate: `Performance:FPS:Below15` bucket not growing)

## Related

- [[decisions/product-strategy]] — sprint ordering rationale
- [[decisions/sprint-2]] — next sprint
- [[systems/analytics]] — analytics system built here
- [[features/tutorial]] — tutorial shipped in Sprint 2
- [[tasks/session-start-sequence]] — session start event sequence (2d/2f/2g) established in Sprint 1
- [[tasks/mobile-quick-wins]] — Task 3 mobile performance optimizations
- [[features/reconnection]] — crash reconnection (task 2) built in Sprint 1
- [[features/feedback-button]] — in-game feedback button (task 2b) built in Sprint 1
