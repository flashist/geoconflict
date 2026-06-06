# Sprint 4c — Production Stabilization

**Date**: 2026-05-07
**Status**: accepted

## Context

Sprint 4's citizenship, payments, and player profile store track remains paused during Mark's travel window from May 15 to June 1, 2026. Sprint 4c uses the remaining time before travel to reduce production error rates and protect match quality without adding features or backend infrastructure.

The sprint is driven by the 2026-05-07 Uptrace error-priority review, which found cosmetics/config failures, singleplayer local hash crashes, archive endpoint/body-limit failures, lobby/map fetch failures, client null-id errors, and mobile WebGL failures as the most actionable production error families.

Source: `ai-agents/sprints/plan-sprint-4c.md`
Follow-up sources: `ai-agents/knowledge-base/plan-fix-archive-endpoint.md`, `ai-agents/knowledge-base/report-archive-endpoint-task-split-2026-06-01.md`, `ai-agents/sprints/sprint-backlog.md`, `ai-agents/tasks/done/s4c-investigate-lobby-map-fetch.md`, `ai-agents/knowledge-base/lobby-map-fetch-investigation-2026-06-03.md`, `ai-agents/tasks/done/s4c-enable-client-source-maps.md`

## Decision

Sprint 4c is a completed stabilization sprint that shipped the quick-win priority set and later closed the feasible investigation/mitigation work while deferring larger follow-ups:

| Priority | Work | Approx. error rate | Scope |
|---|---:|---:|---|
| 1 | Fix cosmetics serving and `PrivilegeRefresher` failures | 138.6/min | Restore `/cosmetics.json`, remove repeated fetch noise, preserve optional cosmetics fail-open behaviour |
| 2 | Fix local-server hash guard | 31.0/min | Prevent the singleplayer catch-up/hash assignment crash |
| 3 | Reduce archive telemetry noise | 26.6/min | Done: disabled the dead archive path; S3-backed citizen archival remains deferred |

The remaining telemetry items are investigation work and should not start until higher-rate noise stays clean:

| Priority | Work | Approx. error rate | Sprint stance |
|---|---:|---:|---|
| 4 | Investigate lobby and map fetch failures | 9.3/min | Done: cached `/maps/*.json` manifests, added map fetch retry/context, and downgraded recoverable lobby/menu fetch aborts |
| 5 | Investigate client null-id/null-object errors | 1.8/min | Source-map enablement done; triage/fix remains Sprint 4 follow-up after deployed traces resolve |

The sprint plan also tracks items outside the original production-error list: add a human-player count to the leaderboard's "Players only" label, resolve the compact-map boat-attack regression, and disable compact maps in public rotation while the root-cause map-regeneration fix is deferred. These are intentionally separate from the telemetry-driven stabilization priorities and should not displace Tasks 1-3.

## Consequences

- Sprint 4c explicitly excludes citizenship, payments, player profile store work, new game mechanics, new features, and backend infrastructure changes.
- The archive task was split on 2026-06-01: Sprint 4c should only clear the archive error noise, while S3-backed citizen archival moves to Sprint 4's citizenship track.
- Error-rate reduction is the delivery metric: clean Uptrace data is expected to make the post-travel return to Sprint 4 development safer.
- The cosmetics task is the highest-leverage first fix because it removes the largest telemetry noise family and improves signal quality for all lower-rate investigations.
- Any fix whose implementation timeline becomes unclear should defer to the post-travel backlog rather than risking the May 15 deadline.
- Backlog additions that are not production-error fixes, such as the leaderboard human-count label and compact-map work, remain opportunistic unless they directly protect match quality; they should not change the sprint's stabilization goal.
- The compact-map runtime fallback was cancelled after live testing selected semantically wrong coasts. Sprint 4c now disables compact maps only in public matchmaking; private lobby and singleplayer compact remain explicit opt-in paths.
- With `mini_map` removed from `MATCH_MODIFIERS`, `weird_setting` becomes the only active public modifier and receives the full 20% modified-match budget.
- Mobile memory/WebGL rendering failures were deferred out of Sprint 4c to the no-sprint backlog on 2026-06-03 because the likely fix requires profiling, device testing, renderer fallback work, and better device context in error logs.
- The lobby/map fetch investigation closed the 9.3/min family as a mixed infrastructure/logging issue: cache `/maps/*.json` manifests like other static map assets, retry map fetches with URL/status context, and avoid shipping expected transient lobby/menu network aborts as Uptrace ERROR logs. See [[tasks/s4c-investigate-lobby-map-fetch]].
- Production client source-map enablement is done. Production webpack now emits hidden source maps, the Docker build uploads them privately to Uptrace when `UPTRACE_SOURCEMAP_DSN` and `PUBLIC_ORIGIN` are available, and runtime images remove `.map` files before serving. See [[tasks/s4c-enable-client-source-maps]].

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
- [[tasks/s4c-enable-client-source-maps]] — source-map upload pipeline for Uptrace client stack symbolication
- [[tasks/s4c-investigate-lobby-map-fetch]] — completed investigation and fix for public lobby polling and map manifest fetch errors
- [[tasks/leaderboard-player-count]] — opportunistic leaderboard UX quick win from the Sprint 4c backlog
- [[tasks/compact-map-click-interaction]] — investigation for the compact-map boat-attack button regression added to the Sprint 4c backlog
- [[tasks/disable-compact-public-maps]] — public-rotation mitigation after the runtime compact-map workaround was rejected
- [[decisions/sprint-backlog]] — no-sprint backlog that now holds mobile memory/WebGL rendering failures
