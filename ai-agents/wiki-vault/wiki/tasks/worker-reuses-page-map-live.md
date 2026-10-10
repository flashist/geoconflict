# Verify 0035 on the Dev Box — a Public Match Starts, and Each Map File Downloads Once (task 0351)

**Source**: `ai-agents/tasks/done/0351-verify-0035-on-the-dev-box-a-public-match-starts-and-each-map-file-downloads-once/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 5 / task `0351`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-10 on the owner ruling *"Close it, that's enough
> (Recommended)"* — a pass, with the worker-download gap stated plainly. No defect filed.

## Goal

The dev-box check for `0035` ([[tasks/worker-reuses-page-map]]): the page hands the game worker the map it already
downloaded, so the worker no longer downloads the same files again. The original failure was on the dev box, whose
certificate is not trusted, so nothing was cached and the worker's second, cold download ran out its start limit
(*"Worker initialization timeout"*). `0035` was proven locally only.

## Key Changes

None — a read-only check. Driven by `fkit-lead` in the **owner's own Chrome, owner present**, 2026-10-10 ~08:49 UTC (the
brief named the owner as executor; recorded as it happened). Dev box on `0.0.155-dev.1` (deployed 2026-10-03); `0035`'s
commit is an ancestor of that deploy (checked with `git merge-base`).

## Outcome

- One public match (World, Normal, Team): **started**, `Worker:InitSuccess` 1 s after start. After the join the page
  requested `manifest.json`, `map.bin` (a full 2 MB transfer, not a cache hit) and `map4x.bin` **once each**. **PASS.**
- ⚠️ **Gap 1 — not observed:** the method (the page's Resource Timing) sees only the **page's** requests, not the
  **worker's**. The original bug was a second download *by the worker*; the evidence it is gone is indirect (fast
  `InitSuccess`).
- **Gap 2 — corrected the same day:** the close first said Chrome "trusted" the dev certificate (which would make a
  worker re-download a fast cache hit and weaken the evidence). Correction: only that **no warning page appeared** is
  known — most likely a remembered click-through exception, which is **not** trust, so caching was most likely still
  off and gap 2 **probably does not apply**. ⚠️ Unverified — the "Not secure" state was not checked.
- Not taken: a second match; the Uptrace / GameAnalytics `Worker:InitFailed` read. Compact-size nation positions not
  exercised.

## Related

- [[tasks/worker-reuses-page-map]] — task `0035`, the build this checks
- [[features/reconnection]] — the worker start path (`0347`, `0348`) that shipped with `0035`
- [[systems/weekend-deploy-window]] — the deploy rhythm this check followed
- [[decisions/sprint-8]] — the board (rank 5)
