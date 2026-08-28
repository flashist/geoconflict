# ADR-109 — The worker index is a fixed placement contract: move the game ID, never the index

**Date**: 2026-08-26
**Status**: accepted

> Project ADR-109 — see [[decisions/adr-numbering-two-series]].
> Deciders: owner (ruling 2026-08-26, relayed via the lead); fkit-architect (the `0057` investigation).
>
> Source: `ai-agents/knowledge-base/decisions/adr-109-worker-index-fixed-placement-contract-move-the-id.md`

## Context

A game's worker is a pure function of its ID: `workerIndex(gameID) = simpleHash(gameID) % numWorkers()` (`src/core/configuration/DefaultConfig.ts`). `numWorkers()` is compile-time per environment — 20 in `ProdConfig.ts`, 2 in `DevConfig.ts`.

**Four parties compute or enforce that same function independently, with no round-trip between them and no game→worker registry anywhere** — the master keeps only `publicLobbyIDs`:

- **Client** — computes the index locally to build the WebSocket URL (`src/client/Transport.ts`), plus eight more lines across `HostLobbyModal.ts`, `JoinPrivateLobbyModal.ts`, `Matchmaking.ts`, `LocalServer.ts`.
- **Worker** — rejects a `create_game` whose index is not its own (HTTP 400) and silently ignores a WebSocket `join` for a mismatched game (`src/server/Worker.ts`).
- **nginx** — maps the `/w<N>/` path prefix to port `300(N+1)` (`nginx.conf`).
- **Master** — recomputes the hash on every route that needs a worker, including public-game scheduling (`src/server/Master.ts`).

The `0057` investigation established that this is a **shared placement contract, not a load-balancing choice**: the hash is what lets every party find a game with nothing but its ID. The line is inherited from upstream (`feea527`, the fork's first commit) with no local rationale recorded until this ADR.

The decision became necessary because of the 2026-08-22 outage track. `0056` replaces the all-or-nothing scheduling gate with an owner-ruled quorum of **18 of 20 workers, 90 s deadline**, so scheduling now runs with up to two indices absent — while `schedulePublicGame` drew a bare random ID, consulted no readiness state, and made a create call with no timeout.

## Decision

**The worker index is a fixed placement contract. To change where a game lands, change the game ID so that it hashes to the wanted index — never remap, override, or indirect the index itself.**

1. `workerIndex(gameID)` stays a pure, client-computable function of the ID and the compile-time worker count. No party consults another to find a game's worker; no game→worker registry is introduced.
2. Any component that needs a game to land on (or avoid) a specific worker does so by **choosing the ID** — rejection-sampling `generateID()` against `workerIndex`, exactly as `Worker.ts`'s `generateGameIdForWorker` already does (up to 1000 draws).
3. The first application is `0057` option **(v)**, approved by the owner 2026-08-26 and built as task `0192`: rejection-sample the public game's ID onto an index in the ready set `0056` maintains, plus a bounded timeout on the create call. Master-only; client/worker/nginx contract untouched.

**Options rejected.** **(i) Modulus over the ready set** — turns the index into a function of *runtime* state: lobby info would have to carry the worker path to all nine client call sites, both worker mismatch checks would have to accept off-hash games, and every existing placement shifts whenever the ready set changes. That is the registry problem the codebase deliberately avoids, and the highest-cost option. **(ii) Retry a different worker on failure** — because the index is a function of the ID, "a different worker" can only mean "a new ID"; without a create timeout it changes nothing for the wedged case, and with one it collapses into (v). **(iii) Hold scheduling while an index is unready** — a capped-out index under `0056`'s restart cap would stall scheduling forever, recreating the 2026-08-22 failure on a smaller scale; `0192` therefore carries a hard "never stall" rule (on cap exhaustion, fall back to an unfiltered ID and warn). **(iv) Leave it, add an alarm** — cheapest, but leaves the wedged shape at ~10 error lines/s until someone acts.

## Consequences

- **Positive** — the client stays free of worker-health knowledge and can still open a game with nothing but its ID and the compile-time worker count. No runtime placement state to keep consistent across four parties, and no migration of existing placements when an index comes or goes. A dead index is excluded from new placements for exactly as long as the master knows it is dead, and rejoins automatically on `WORKER_READY`. The fix is master-only and unit-testable around an extracted `pickGameID(readySet)`.
- **Private lobbies remain exposed — accepted as-is by the owner 2026-08-26.** `HostLobbyModal` picks the ID and POSTs `create_game` straight to `/w<N>/`; a dead or wedged index costs the host one failed click and they retry with a fresh ID. No master-only option can help here without publishing worker health to the client.
- **Wedged-but-alive workers are not excluded.** `readyWorkers` tracks liveness, never responsiveness. The create timeout bounds that case to one failed attempt per timeout window; it does not remove it. A responsiveness signal (`/health` probe, per-worker last-successful-response timestamp) is a future item, not designed here.
- **Quorum 18 of 20, 90 s stands** (ruled 2026-08-22, confirmed 2026-08-26 against the measured residual: ≈ 0.11 extra draws ≈ 11 ms ≈ 0.33 error lines per scheduled game). `0192` removes that residual; the wedged shape is independent of the quorum value.
- The client must still ship in lockstep with `numWorkers()` — a worker-count change is a coordinated deploy of client, worker, nginx and master. This ADR does not change that; it records it.
- **Re-raise only if:** any future option publishes worker health or placement to the client (including client-side rejection-sampling for private lobbies, or lobby info carrying a worker path) — that is the (i)-shaped move this ADR rejects; a game→worker registry or runtime index remap is proposed for any reason; `numWorkers()` becomes a runtime rather than compile-time value; or the `0057` §6.3 Uptrace query (`Worker mismatch` / `should be on worker`) returns hits, which would be client/server worker-count drift — a different failure that looks the same from outside.

  A review finding that merely notes *"private lobbies can land on a dead worker"*, *"a wedged worker is still eligible for placement"*, or *"the quorum permits misrouted draws"* is **closed by this ADR** — those are the recorded, owner-accepted tradeoffs, not new defects.

## Related

- [[tasks/worker-routing-dead-worker-investigation]] — task `0057`, the investigation that produced this contract and options (i)–(v)
- [[tasks/schedule-public-games-onto-ready-workers]] — task `0192`, the first application of the decision
- [[tasks/worker-crash-recovery-and-quorum-gate]] — task `0056`, whose quorum gate made the residual live and whose ready set `0192` consumes
- [[tasks/worker-reject-departed-requester-create]] — task `0194`, the worker-side orphan fix; placement untouched
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the outage that opened the track
- [[systems/networking]] — the worker-path contract this ADR formalizes
- [[systems/architecture-overview]] — already describes the hash as "sharding, not load balancing"
- [[decisions/windoworigin-url-join-defect]] — task `0198`: the `/w<N>/` host-root mount this contract defines is what the private-lobby URL join misses in production
- [[decisions/sprint-4]] — the sprint board carrying the outage track
- [[decisions/adr-numbering-two-series]] — the ADR number bands
