# Review — 0035

Task: ai-agents/tasks/done/0035-worker-init-timeout-map-refetch/brief.md
File(s) under review: src/core/game/TerrainMapLoader.ts, src/core/GameRunner.ts, src/core/worker/WorkerMessages.ts, src/core/worker/Worker.worker.ts, src/core/worker/WorkerClient.ts, src/client/ClientGameRunner.ts, ai-agents/knowledge-base/analytics-event-reference.md (two `Worker:InitFailed*` rows), tests/core/game/TerrainMapLoader.test.ts, tests/core/GameRunnerMapSource.test.ts, tests/core/worker/WorkerClient.test.ts, tests/core/worker/WorkerWorker.test.ts, tests/client/JoinLobbyReconnectSession.test.ts ("task 0035" describe) — 0035 hunks only; 0347/0348 hunks in the same files are out of scope (closed-out ledgers in their own folders)
Status: closed-out
Coverage: reasoning-only second opinion — round 1: Codex ran (`codex-cli 0.157.1`, exit 0) and returned a diff-grounded "no significant issues found", but executed only source-text reads (`git diff`, `sed`, `rg`) and no tests; the execution evidence is the reviewer's own (the 7 touched/adjacent jest suites, 67/67 pass, plus a throwaway scratchpad jest check, outside the repo, showing that a runner built from the page's structured-cloned cached source gives the same nation spawn cells and the same `game.hash()` for 60 ticks as a runner built from a fresh download, for both Normal and Compact).

## Reviewer findings
| #  | Round | Sev  | Location | Claim |
|----|-------|------|----------|-------|

*Round 1 (2026-09-30): no findings. Both passes clean. Hard-look items checked and cleared: copy vs transfer (nothing writes the terrain bytes or the nations after caching — `GameMapImpl.terrain` is read-only and `GameRunner` only maps over the nations); determinism (checked by running it, see Coverage); the abort listener's `finally` removal vs task 0231 (the code between a successful `initialize()` and the return has no await, so `if (left) r.stop()` owns every leave after the start); `cleanup()` rejecting a pending start (only `createClientGame` awaits `initialize()`, and `ClientGameRunner.stop()` runs only after the start, when `initReject` is already undefined); Compact halving (the cached source is halved exactly once, pinned by the new TerrainMapLoader test and confirmed by the scratchpad run).*

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|

*Round 1 (2026-09-30, `fkit-coder` as the `fkit-sprint-ship-loop` Process-review worker): no rows. There are no reviewer findings to answer. Nothing matched a settled item: *Accepted residuals* is empty, and no ADR in `ai-agents/knowledge-base/decisions/` (ADR-101 to ADR-116) covers the worker start or map loading. No regression or oscillation to check in round 1. One doc wording change was applied as an in-plan obvious winner (plan file 8). It answers the reviewer's non-finding remark in the round-1 relay, not a ledger row: in `analytics-event-reference.md`, the `Worker:InitFailedCause:{Cause}` row's Value text "crashed after a slow download" became "crashed after a slow step" (e.g. a slow config fetch; a slow map download only on the no-page-map fallback). This makes it agree with the same row's Crash text. Doc only; the Prettier drift is unchanged (it already failed at HEAD). Recorded in the `worklog.md` decision log. Nothing blocking remains → Status set to closed-out.*

## Accepted residuals (shared, do-not-re-litigate)
