# Sprint 2 — Fix Onboarding

**Date**: 2026 (completed)
**Status**: accepted

## Context

Goal: convert curious new players into players who complete at least one full match. The single biggest lever on long-term DAU quality.

Source: `ai-agents/sprints/done/plan-sprint-2.md`

## Decision / What Was Built

| Task | Description | Status |
|---|---|---|
| 4 — Tutorial | Guided first bot match on Iceland map, 7-step tooltips, Yandex A/B gated | ✅ Done |
| 4a — Auto-spawn | Instant automatic placement on join; player can tap to reposition | ✅ Done |
| 4b — Zoom to territory | Name-click + "find me" button + auto-zoom on spawn | ✅ Done |
| 4c — Auto-expansion | Ghost players auto-expand into terra nullius (10s interval, max 60s, multiplayer only) | ✅ Done |
| 4e — Spawn indicator | Expanding ring pulse in player's territory color, fades after 3–4s | ✅ Done |
| 8d-A — Announcements | Re-enabled JSON-driven global changelog with unread badge | ✅ Done |

## Key Decisions

**Tutorial design:** runs as a singleplayer bot match (Iceland, all-Easy bots) with tooltip overlay system. Player must win — critical for positive first memory driving second session. Uses `isTutorial` config flag detected by `LocalServer.ts`.

**Auto-expansion constraints:** multiplayer only, terra nullius only, fully deterministic (uses `PseudoRandom`), stops immediately on any player input. Duration (60s) and interval (10s) are named constants.

**8d-A pulled forward from Sprint 4:** shipped in Sprint 2 because enough new features existed to announce, and the channel becomes more valuable earlier.

## Consequences

- Tutorial is Yandex A/B gated — monitor `Experiment:Tutorial:Enabled/Disabled` funnels
- `Match:SpawnAuto` vs `Match:SpawnChosen` ratio tracks adoption of auto-spawn
- Followed immediately by hotfix release — see [[decisions/hotfix-post-sprint2]]

## Related

- [[decisions/product-strategy]] — sprint ordering
- [[decisions/sprint-1]] — previous sprint
- [[decisions/hotfix-post-sprint2]] — hotfixes shipped after Sprint 2
- [[decisions/sprint-3]] — next sprint
- [[features/tutorial]] — tutorial system detail
- [[decisions/autospawn-late-join-fix]] — bug in auto-spawn fixed in hotfix
- [[systems/analytics]] — spawn analytics events
- [[tasks/spawn-ux]] — zoom-to-territory and spawn indicator implementation details
