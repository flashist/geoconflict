# Sprint Backlog

**Date**: 2026-06-03
**Status**: accepted

## Context

`ai-agents/sprints/sprint-backlog.md` collects defined work that is worth doing but has no assigned sprint home. These items should not be implemented until they receive a sprint assignment and, where needed, a full task brief.

## Decision

Keep no-sprint work separate from active sprint plans so the active roadmap does not imply these tasks are approved for immediate implementation.

Current no-sprint items include rewarded ads minimal version, leaderboard core, citizen-only private lobbies and spectating, flag and territory-pattern re-enablement, mobile memory/WebGL rendering failures, and the remaining security follow-ups sec10/sec11. Parked items include deep mobile rendering optimization and Microsoft Clarity session recordings.

The mobile memory/WebGL rendering task was moved out of Sprint 4c on 2026-06-03. It has visible Uptrace signal around low-memory `getImageData` / `createImageData` failures and WebGL context failures, but its fix likely requires profiling, device-specific testing, graceful renderer fallback, and better device context in error logs. It should be scheduled only once mobile crash/performance data is clearer.

## Consequences

- Backlog task files such as `ai-agents/tasks/backlog/mobile-webgl-rendering.md` remain source briefs, not wiki task pages, until the work is assigned or completed.
- Sprint 4c no longer carries mobile WebGL rendering as an active stabilization item; only lobby/map fetch and client null-id investigations remain as unshipped Sprint 4c investigation backlog.
- Deep mobile rendering optimization remains parked until mobile DAU consistently exceeds 1,500, but the WebGL/memory task can be scheduled earlier if crash data justifies it as a targeted stability fix.

## Related

- [[decisions/product-strategy]] — retention-first roadmap and mobile DAU gate for deep mobile work
- [[decisions/sprint-4c]] — sprint that deferred mobile WebGL rendering to the no-sprint backlog
- [[systems/project-operations]] — sprint/task workflow and rule that work needs a sprint home before implementation
- [[systems/rendering]] — likely technical area for WebGL fallback and ImageData allocation fixes
- [[tasks/mobile-quick-wins]] — prior mobile rendering reductions that may not be enough for low-memory devices
