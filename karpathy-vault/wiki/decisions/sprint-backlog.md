# Sprint Backlog

**Date**: 2026-06-03
**Status**: accepted

## Context

`ai-agents/sprints/sprint-backlog.md` collects defined work that is worth doing but has no assigned sprint home. These items should not be implemented until they receive a sprint assignment and, where needed, a full task brief.

## Decision

Keep no-sprint work separate from active sprint plans so the active roadmap does not imply these tasks are approved for immediate implementation.

Current no-sprint items include rewarded ads minimal version, leaderboard core, citizen-only private lobbies and spectating, flag and territory-pattern re-enablement, Monitoring & Alert Bot Phase 1/Phase 2, mobile memory/WebGL rendering failures, and the remaining security follow-ups sec10/sec11. Parked items include deep mobile rendering optimization and Microsoft Clarity session recordings.

The monitoring alert bot phases were added on 2026-06-04 after the telemetry VPS freeze/outage findings. Phase 1 is the near-term incident-prevention slice: external dead-man's-switch heartbeat, telemetry-VPS on-box disk/RAM/swap/OOM/container checks, shared Telegram helper, Russia-proxy routing, and digest/dedup/recovery alert UX. Phase 2 follows only after Phase 1 is deployed and proven, adding game-server VPS coverage plus slower-degradation hygiene such as ClickHouse/file-log growth attribution, TLS/certbot checks, sustained CPU load, backup health, predictive disk growth, and game-server availability heuristics.

The mobile memory/WebGL rendering task was moved out of Sprint 4c on 2026-06-03. It has visible Uptrace signal around low-memory `getImageData` / `createImageData` failures and WebGL context failures, but its fix likely requires profiling, device-specific testing, graceful renderer fallback, and better device context in error logs. It should be scheduled only once mobile crash/performance data is clearer.

## Consequences

- Backlog task files such as `ai-agents/tasks/backlog/mobile-webgl-rendering.md` remain source briefs, not wiki task pages, until the work is assigned or completed.
- Sprint 4c no longer carries mobile WebGL rendering as an active stabilization item; only lobby/map fetch and client null-id investigations remain as unshipped Sprint 4c investigation backlog.
- Monitoring & Alert Bot Phase 1 should be treated as unusually high-value no-sprint ops work because it protects the observability stack that stabilization depends on; Phase 2 should not leapfrog Phase 1.
- Deep mobile rendering optimization remains parked until mobile DAU consistently exceeds 1,500, but the WebGL/memory task can be scheduled earlier if crash data justifies it as a targeted stability fix.

## Related

- [[decisions/product-strategy]] — retention-first roadmap and mobile DAU gate for deep mobile work
- [[decisions/sprint-4c]] — sprint that deferred mobile WebGL rendering to the no-sprint backlog
- [[systems/project-operations]] — sprint/task workflow and rule that work needs a sprint home before implementation
- [[systems/rendering]] — likely technical area for WebGL fallback and ImageData allocation fixes
- [[systems/telemetry]] — monitoring alert bot context and telemetry outage history
- [[tasks/mobile-quick-wins]] — prior mobile rendering reductions that may not be enough for low-memory devices
