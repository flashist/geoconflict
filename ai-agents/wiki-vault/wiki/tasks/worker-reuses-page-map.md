# The Game Worker Reuses the Map the Page Already Loaded (task 0035)

**Source**: `ai-agents/tasks/done/0035-worker-init-timeout-map-refetch/brief.md` (evidence read from the same folder's `worklog.md` and `review.md`)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 24 (append rank; part of the owner-ruled top reconnect run) / task `0035` — moved in from `sprint-backlog.md` 2026-09-29

> ✅ Done (agent-closed — not owner-verified), 2026-09-30. Committed in `9cb8ee4`; **not in any deploy yet**
> (latest game tag `0.0.155`). 📌 *2026-10-08 lint: released since — game `0.0.156`, 2026-10-03 (✔️ `9cb8ee4` is an ancestor of tag `0.0.156`).* Its proof on the real dev box is verify task **`0351`**, Sprint 8 rank 2
> ([[decisions/sprint-8]]); it does not block Sprint 7's deploy.

## Goal

The original investigation (filed months earlier, kept unedited in the brief): joining a public match on the
**dev box** failed with *"Worker initialization timeout"*. The game worker **re-downloaded the whole map**
(~5.6 MB for Strait of Gibraltar) right after the page had downloaded the same files, and had a hard 5 s limit.
The dev box is a bare IP with an untrusted certificate, so Chrome does not cache over it; the page's own preload
took 20 s and the worker's copy timed out. Production (valid TLS, nginx cache) was expected to be fine.

The brief proposed **Option A** (give the worker the page's map), **Option B** (raise the limit) and a
worker-leak fix. On 2026-09-29 owner ruling R2 pulled it into Sprint 7 and the confirmed split (Q2) left this
task **Option A only**; B and the leak fix went to [[tasks/worker-start-failure-reporting]] (`0348`). On
2026-09-30 the owner added `0348`'s review R1 here (*"Note it on 0035"*): stop the popup and telemetry for a
join the player already left.

## Key Changes

- **`src/core/game/TerrainMapLoader.ts`** — new `terrainMapFromSource(source)`, builds fresh `GameMap`s from an
  already-loaded source (it must not go back through the loader, or Compact maps' nations would be halved
  twice).
- **`src/core/GameRunner.ts`** — `createGameRunner` takes an optional `mapSource`; with it, no map fetch;
  without it, the old download (fallback).
- **`WorkerMessages.ts` / `Worker.worker.ts` / `WorkerClient.ts`** — the `init` message carries `mapSource`
  (copied by structured clone, **not** transferred). `WorkerClient.cleanup()` now also rejects a pending start
  at once (`"Worker stopped before it finished starting"`).
- **`src/client/ClientGameRunner.ts`** — `joinLobby` owns an `AbortController`, aborted on leave and on a lobby
  `error`; `createClientGame` passes the page's cached map to the worker, returns before building a worker if the
  join was already left, stops a still-starting worker on abort, and **skips the failure telemetry, Uptrace line
  and popup** when the join was left.
- `analytics-event-reference.md`: the two `Worker:InitFailed*` rows now say they are **not logged after a leave**;
  a `Crash` from a map download happens only on the no-page-map fallback.

## Outcome

- **Live checks (local dev, Playwright):** **one download per map file per match start** — public, singleplayer
  Normal and Compact — and **zero** map requests after the worker was created **PASS** (the "before" figure is
  from `0348`'s logs that day, not re-measured on old code). Simulated dev-box case (browser cache off, every map
  file held 17 s): page preload 51 s, then `Worker:InitSuccess` **0.13 s** later, no failure **PASS**. Leave
  during start (hash change, Back, a new join) → worker closed within 0.02 s, no popup, no telemetry **PASS**.
  Leave after a successful start **PASS**. `0347`/`0348` regressions **PASS**.
- ⚠️ **Not verified live:** Compact nation positions (unit-tested only); a real Uptrace; the real dev-box network
  (simulated) — that is `0351`'s job.
- **Full `npm test`:** first run red on one `supertest` suite (`NameChangeRoutes`, `socket hang up`; `0197` ruled
  out); **re-ran green**, 183/183 suites, 3261 tests.
- **Review:** no findings (both passes clean; the reviewer also ran a determinism check — same nation spawns and
  same game hash for 60 ticks from the cached map as from a fresh download).
- **Found while verifying, not caused here:** after leaving a started match, the public-lobby card stays stuck
  on the old lobby → filed as **`0352`** on the Backlog board ([[decisions/sprint-backlog]]).

## Related

- [[tasks/worker-start-failure-reporting]] — task `0348`, which took Option B + the leak fix; its R1 is fixed here
- [[tasks/rejoin-after-failed-match-start]] — task `0347`, first in the reconnect run
- [[systems/client-game-teardown]] — leaving during the start now stops the worker
- [[systems/game-loop]] — `createGameRunner` and the worker `init` message
- [[systems/analytics]] — the two `Worker:InitFailed*` rows
- [[features/reconnection]] — the reconnect run this closes
- [[decisions/sprint-7]] — the board; [[decisions/sprint-8]] carries verify task `0351`
- [[decisions/sprint-backlog]] — this task's old row on `sprint-backlog.md` (now a Moved pointer) and the new `0352`
- [[systems/architecture-overview]] — its worker-init line now names the 15 s limit and this map hand-over
- [[tasks/client-null-id-errors]] — task `0032`, which made the loader cache hold only the map source and build fresh maps per game — the source this task hands to the worker
