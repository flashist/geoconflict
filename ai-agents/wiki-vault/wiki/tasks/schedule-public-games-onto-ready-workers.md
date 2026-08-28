# Public-Game Scheduling: Pick a Game ID That Hashes to a Ready Worker, and Bound the Create Call

**Source**: `ai-agents/tasks/done/0192-schedule-public-games-onto-ready-workers-with-bounded-create/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — 2026-08-22 outage track — task `0192`

> ✅ Done (agent-closed 2026-08-27 — **not owner-verified**). Built and reviewed via the sprint ship-loop, committed on `dev`. The post-deploy check (brief step 7) is pending by design; deployment state unknown.

## Goal

Implement option **(v)** from the `0057` investigation, approved by the owner 2026-08-26 — the second half of the outage track.

`schedulePublicGame` drew a bare random game ID, added it to `publicLobbyIDs`, and POSTed `create_game` to whichever worker `simpleHash(gameID) % numWorkers()` named. It consulted no readiness state, and **the create call had no timeout and no abort signal**. Once `0056`'s quorum gate shipped, scheduling runs with up to two indices absent, so this became live rather than masked.

The fix had to be **master-only**. Deterministic placement is a shared contract — the client computes the same index with no round-trip, the worker rejects mismatches, nginx maps `/w<N>/` to the port, and there is no game→worker registry. So the index stays fixed and the **ID** moves, reusing the pattern `Worker.ts`'s `generateGameIdForWorker` already uses. See [[decisions/adr-109-worker-index-placement-contract]].

**Hard dependency on `0056`:** before it, `readyWorkers` only ever grew — nothing removed a dead worker, so the filter would have been a no-op.

## Key Changes

**Scope: `src/server/Master.ts` plus tests.** No client, worker, nginx or config change.

- **`pickGameID(readyIndices, workerIndexOf, draw, maxAttempts)`** — a pure, exported, unit-testable rejection sampler. Draws IDs until `workerIndex(id)` is in the ready set, capped at 1000 attempts (the `Worker.ts` precedent). Returns `{ gameID, attempts, onReadyIndex }`.
- **Never stalls.** Cap exhausted → the last unfiltered draw is used anyway and a `warn` is logged. This is the hard rule from ADR-109's rejected option (iii): a capped-out index must never freeze scheduling.
- **Empty ready set** → returns `null`, the tick is skipped, nothing is added to `publicLobbyIDs`, and one `error` is logged per empty episode with one `info` on resume — not once per 100 ms tick.
- **`CREATE_GAME_TIMEOUT_MS = 5_000`** — an `AbortController` bounds the create call. On abort the ID is deleted from `publicLobbyIDs` and the error rethrown.
- The ready set is read through an injected `ScheduleDeps.readyIndices()` that calls `0056`'s `WorkerSupervisor` — the same structure, not a second copy — which also makes `schedulePublicGame` testable without forking workers.

## Outcome

Measured live (dev, 2 workers): **dead index — 0 misroutes over 51 s**, and a restarted index rejoins the eligible set on `WORKER_READY` with no further action. **Wedged index — the create now fails at 5.0 s instead of hanging.** Healthy 9 m 41 s run: 61/60 split across workers, cadence unchanged. `npm test` 96 suites / 862 tests, lint 0, `tsc` 0.

- **One residual was accepted at close and has since been discharged.** Orphan public games on wedge recovery were **unchanged (5 / 5)** — aborting the master's side does not retract bytes already sitting in a stopped worker's socket buffer. `0192`'s plan predicted this and named `Worker.ts` as the place to fix it. Filed as `0194`, which measured **0 orphans against that baseline of 5** on 2026-08-28. The residual is closed.
- **Private-lobby exposure is out of scope and accepted as-is** — the host picks the ID client-side, and no master-only change reaches it.
- **A wedged-but-alive worker is still eligible for placement.** `readyWorkers` is liveness, not responsiveness; the 5 s timeout bounds the cost to one failed attempt per draw that lands on it, and does not remove it.
- Owner-approved plan decisions: D1 (cap 1000 + unfiltered fallback + warn), D2 (skip the tick on an empty ready set, one error per episode), D3 (5 s abort + delete the ID + rethrow).
- The owner's Uptrace §6.3 query would re-prioritise this work on a `Worker mismatch` hit.

## Related

- [[decisions/adr-109-worker-index-placement-contract]] — the decision this task implements
- [[tasks/worker-routing-dead-worker-investigation]] — task `0057`, the investigation and its option (v)
- [[tasks/worker-crash-recovery-and-quorum-gate]] — task `0056`, the hard dependency supplying the ready set
- [[tasks/fetchlobbies-in-flight-guard]] — task `0193`, which made the honest orphan count visible
- [[tasks/worker-reject-departed-requester-create]] — task `0194`, which discharged this task's orphan residual
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the incident that opened the track
- [[systems/networking]] — worker routing and the master's scheduling path
- [[decisions/sprint-4]] — the sprint board carrying the outage track
