# Sprint 4c — Production Stabilization

**Date**: 2026-05-07
**Status**: proposed

## Context

Sprint 4's citizenship, payments, and player profile store track remains paused during Mark's travel window from May 15 to June 1, 2026. Sprint 4c uses the remaining time before travel to reduce production error rates and protect match quality without adding features or backend infrastructure.

The sprint is driven by the 2026-05-07 Uptrace error-priority review, which found cosmetics/config failures, singleplayer local hash crashes, archive endpoint/body-limit failures, lobby/map fetch failures, client null-id errors, and mobile WebGL failures as the most actionable production error families.

Source: `ai-agents/sprints/plan-sprint-4c.md`
Follow-up sources: `ai-agents/knowledge-base/plan-fix-archive-endpoint.md`, `ai-agents/knowledge-base/report-archive-endpoint-task-split-2026-06-01.md`

## Decision

Sprint 4c is a stabilization sprint with a must-ship deadline before May 15, 2026. Tasks 1-3 are the quick-win priority set and may proceed in parallel:

| Priority | Work | Approx. error rate | Scope |
|---|---:|---:|---|
| 1 | Fix cosmetics serving and `PrivilegeRefresher` failures | 138.6/min | Restore `/cosmetics.json`, remove repeated fetch noise, preserve optional cosmetics fail-open behaviour |
| 2 | Fix local-server hash guard | 31.0/min | Prevent the singleplayer catch-up/hash assignment crash |
| 3 | Reduce archive telemetry noise | 26.6/min | Disable or quiet the dead archive path; defer storage until citizenship exists |

Tasks 4-6 are investigation or high-complexity work and should only start if time remains after the quick wins:

| Priority | Work | Approx. error rate | Sprint stance |
|---|---:|---:|---|
| 4 | Investigate lobby and map fetch failures | 9.3/min | Start only after Tasks 1-3 |
| 5 | Investigate client null-id/null-object errors | 1.8/min | Wait until higher-rate telemetry noise is removed |
| 6 | Mobile memory and WebGL rendering failures | 0.4/min | Treat as out of scope unless all earlier work ships early |

The sprint plan also tracks two items outside the original production-error list: add a human-player count to the leaderboard's "Players only" label, and fix the compact-map boat-attack radial-menu regression with a runtime fallback. These are intentionally separate from the telemetry-driven stabilization priorities and should not displace Tasks 1-3.

## Consequences

- Sprint 4c explicitly excludes citizenship, payments, player profile store work, new game mechanics, new features, and backend infrastructure changes.
- The archive task was split on 2026-06-01: Sprint 4c should only clear the archive error noise, while S3-backed citizen archival moves to Sprint 4's citizenship track.
- Error-rate reduction is the delivery metric: clean Uptrace data is expected to make the post-travel return to Sprint 4 development safer.
- The cosmetics task is the highest-leverage first fix because it removes the largest telemetry noise family and improves signal quality for all lower-rate investigations.
- Any fix whose implementation timeline becomes unclear should defer to the post-travel backlog rather than risking the May 15 deadline.
- Backlog additions that are not production-error fixes, such as the leaderboard human-count label and compact-map boat fallback, remain opportunistic unless they directly protect match quality; they should not change the sprint's stabilization goal.

## Related

- [[systems/telemetry]] — production error priorities and Uptrace workflows that define the sprint scope
- [[decisions/product-strategy]] — retention-first sequencing and paused monetization context
- [[decisions/sprint-4]] — paused citizenship and payments sprint
- [[decisions/sprint-4b]] — preceding interim variety sprint
- [[systems/project-operations]] — sprint/task workflow and release guardrails
- [[decisions/archive-archival-strategy]] — accepted split between short-term archive noise cleanup and deferred S3 archival
- [[tasks/cosmetics-serving]] — first quick-win task from the Sprint 4c priority list
- [[tasks/local-server-hash-guard]] — second quick-win task preventing the local/singleplayer hash crash
- [[tasks/archive-endpoint-failures]] — third quick-win task now scoped to archive telemetry noise reduction
- [[tasks/compact-map-click-interaction]] — investigation for the compact-map boat-attack button regression added to the Sprint 4c backlog
