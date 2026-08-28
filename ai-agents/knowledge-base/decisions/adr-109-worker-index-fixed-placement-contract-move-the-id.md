# ADR-109: The worker index is a fixed placement contract — to change where a game lands, move the game ID, never the index

- **Status:** accepted
- **Date:** 2026-08-26
- **Deciders:** Owner (ruling 2026-08-26, relayed via lead); fkit-architect (`0057` investigation and recommendation)

## Context

A game's worker is a pure function of its ID: `workerIndex(gameID) = simpleHash(gameID) % numWorkers()`
(`src/core/configuration/DefaultConfig.ts:296-298`). `numWorkers()` is compile-time per environment
(`src/core/configuration/ProdConfig.ts:6` = 20, `DevConfig.ts:40` = 2). Four parties compute or enforce
that same function independently, with no round-trip between them and **no game→worker registry
anywhere** — the master keeps only `publicLobbyIDs` (`src/server/Master.ts:89`):

- **Client** — computes the index locally to build the WebSocket URL (`src/client/Transport.ts:317-320`)
  and eight more lines in four files (`HostLobbyModal.ts:737, 809, 840, 871`; `JoinPrivateLobbyModal.ts:204, 307`;
  `Matchmaking.ts:110`; `LocalServer.ts:303`).
- **Worker** — rejects a `create_game` for a game whose index is not its own (`src/server/Worker.ts:149-155`,
  HTTP 400) and silently ignores a WebSocket `join` for a mismatched game (`:341-347`).
- **nginx** — maps the `/w<N>/` path prefix to port `300(N+1)` (`nginx.conf:3-44`, `:301-347`).
- **Master** — recomputes the hash on every route that needs a worker, including public-game scheduling
  (`Master.ts:508-535`, hash consumed via `workerPath()` `:512` / `workerPort()` `:517`).

The `0057` investigation (`../reports/2026-08-26-0057-worker-routing-dead-worker-findings.md`, §3)
established that this is a **shared placement contract, not a load-balancing choice**: the hash is what
lets every party find a game with nothing but its ID. The line is inherited from upstream (`feea527`,
first commit of the fork) with no local rationale recorded until now.

The decision became necessary because of the 2026-08-22 outage track. `0056` replaces the all-or-nothing
scheduling gate with an owner-ruled quorum of **18 of 20 workers, 90 s deadline**, so scheduling will
run with up to two indices absent — and `schedulePublicGame` draws a bare random ID (`Master.ts:509`),
consulting no readiness state, with a create call that has no timeout (`:516-526`). Measured cost of an
ID landing on an absent index (`0057` §2.5, §5):

- **Dead index (port refuses):** self-healing, ~100 ms and 3 error lines per miss, rarely
  (≈ 1 blink/hour at 100 games/hour) and briefly (≤ 1 s) player-visible — a miss rewrites the lobbies
  JSON to `[]` (`Master.ts:500-502`) and `nginx.conf:108` caches any 200 for 1 s. Expected ≈ 0.11
  extra draws ≈ 11 ms ≈ 0.33 error lines per scheduled game at 18/20.
- **Wedged index (alive, never answers):** the create call hangs unbounded; on worker recovery the
  queued creates succeed against IDs the master already dropped → orphan games and `429` on later
  creates. Not a function of the quorum: `readyWorkers` (`Master.ts:20`, `:114`) tracks liveness, never
  responsiveness.

The codebase already contains the pattern this ADR generalises: `Worker.ts:545-556`
(`generateGameIdForWorker`) rejection-samples up to 1000 IDs to land a game on a given worker — it
treats the index as fixed and moves the ID.

## Decision

**The worker index is a fixed placement contract. To change where a game lands, change the game ID
so that it hashes to the wanted index — never remap, override, or indirect the index itself.**

Concretely:

1. `workerIndex(gameID)` stays a pure, client-computable function of the ID and the compile-time worker
   count. Client, worker, nginx and master keep computing it independently; no party consults another
   to find a game's worker, and no game→worker registry is introduced.
2. Any component that needs a game to land on a specific worker, or to avoid a specific worker, does so
   by **choosing the ID** (rejection-sampling `generateID()` against `workerIndex`), as
   `Worker.ts:545-556` already does.
3. The first application is option (v) from `0057` §4, approved by the owner 2026-08-26 and filed as
   brief `0192` (sequenced after `0056`): at `Master.ts:509`, rejection-sample the public game's ID onto
   an index in the ready set that `0056` maintains, plus a bounded timeout on the create call. This is a
   master-only change; the client/worker/nginx contract is untouched, and the game still lives on its
   hash index.

## Options considered

- **(v) Rejection-sample the game ID onto a ready index + bounded create timeout (chosen)** — keeps the
  contract intact (no client, worker or nginx change; `Worker.ts:149/341` checks still hold), reuses
  the existing `Worker.ts:545-556` precedent, never places an ID where the master already knows nothing
  listens, and a restarted index rejoins the eligible set on `WORKER_READY` with no further action.
  Distribution is uniform to within ±1.2% over 20 indices; at 18/20 the sample takes mean 1.11 draws,
  max 7 in 2×10⁵ trials (`0057` §3). Depends on `0056` Step 1's `markDead` — today `readyWorkers` never
  shrinks (`Master.ts:20`, `:114`), so the filter would be a no-op before it lands.
- **(i) Modulus over the ready set** — rejected. Turns the index into a function of *runtime* state:
  lobby info would have to carry the worker path to all nine client call sites, both worker mismatch
  checks would have to accept off-hash games, and every existing placement shifts whenever the ready
  set changes — games become unfindable unless the path is stored. That is the registry problem the
  codebase deliberately avoids, and the highest-cost option in the table (`0057` §4 row i).
- **(ii) Retry a different worker on failure** — rejected as a distinct option. Because the index is a
  function of the ID, "a different worker" can only mean "a new ID", which is exactly what the 100 ms
  scheduling loop already does implicitly (`Master.ts:128-136`, `:433-505`). Without a create timeout
  it changes nothing for the wedged case; with one, it collapses into (v) (`0057` §4 row ii).
- **(iii) Hold scheduling while an index is unready** — rejected. A capped-out index under `0056`'s
  restart cap would stall scheduling forever, recreating the 2026-08-22 failure on a smaller scale
  (`0057` §4 row iii). `0192` therefore carries a hard "never stall" rule: on cap exhaustion fall back
  to an unfiltered ID and warn.
- **(iv) Leave it, add an alarm** — not chosen. Cheapest, but leaves the wedged shape at ~10 error
  lines/s until someone acts, and does nothing for the dead-index residual (`0057` §4 row iv). The
  Uptrace query (`0057` §6.3) remains worth running regardless.

## Consequences

- **Positive:**
  - The client stays free of worker-health knowledge: it can still open a game with nothing but its ID
    and the compile-time worker count. The client/worker/nginx contract ships unchanged.
  - No game→worker registry, no runtime placement state to keep consistent across four parties, no
    migration of existing placements when an index comes or goes.
  - A dead index is excluded from new placements for exactly as long as the master knows it is dead, and
    rejoins automatically on `WORKER_READY`.
  - The fix is master-only and unit-testable around an extracted `pickGameID(readySet)` (`0192` Step 1).
- **Negative / costs:**
  - **Private lobbies remain exposed** — accepted as-is by the owner 2026-08-26. `HostLobbyModal.ts:866-871`
    picks the ID and POSTs `create_game` straight to `/w<N>/`; a dead or wedged index costs the host one
    failed click (`HTTP error!`, `:880-884`) and they retry with a fresh ID. No master-only option can
    help here without publishing worker health to the client (`0057` §7).
  - **Wedged-but-alive workers are not excluded.** `readyWorkers` is liveness, not health. The create
    timeout bounds that case to one failed attempt per timeout window; it does not remove it. A
    responsiveness signal (`/health` probe, per-worker last-successful-response timestamp) is a future
    item, not designed here (`0057` §9).
  - **Quorum 18 of 20, 90 s stands** (owner-ruled 2026-08-22, confirmed 2026-08-26). The dead-index
    residual it permits (≈ 11 ms, ≈ 0.33 error lines per scheduled game; rarely — ≈ 1 blink/hour at
    100 games/hour — and briefly — ≤ 1 s — player-visible, because a miss rewrites the lobbies JSON to
    `[]` at `Master.ts:500-502` and `nginx.conf:108` caches any 200 for 1 s) is what `0192` removes;
    the wedged shape is independent of the quorum value.
  - Rejection-sampling adds a small, bounded amount of work per scheduled game (mean 1.11 draws at
    18/20) and a hard dependency of `0192` on `0056`.
  - The client must still ship in lockstep with `numWorkers()`: a worker-count change is a coordinated
    deploy of client, worker, nginx and master. This ADR does not change that; it records it.
- **Residual risks / "re-raise only if":**
  - **Any future option that publishes worker health or placement to the client** — including
    client-side rejection-sampling against a published ready set for private lobbies, or lobby info
    carrying a worker path — **re-opens this ADR.** That is the (i)-shaped move this decision rejects.
  - A game→worker registry or runtime index remap is proposed for any reason (matchmaking affinity,
    hot-worker balancing, per-worker caches).
  - `numWorkers()` becomes a runtime value rather than compile-time per environment — the contract's
    "computable with no round-trip" property would then need a different anchor.
  - The `0057` §6.3 Uptrace query line (5) (`Worker mismatch` / `should be on worker`) returns hits —
    that is client/server worker-count drift, a different failure that looks the same from outside, and
    changes the priority (not the direction) of `0192`.

  A review finding that merely notes "private lobbies can land on a dead worker", "a wedged worker is
  still eligible for placement", or "the quorum permits misrouted draws" is **closed by this ADR** —
  those are the recorded, owner-accepted tradeoffs, not new defects.

## Related

- Investigation: `../reports/2026-08-26-0057-worker-routing-dead-worker-findings.md` (§2 trace and
  reproduction, §3 the contract, §4 options (i)–(v), §5 residual at 18/20, §7 private lobbies, §8
  owner decisions) and its worklog
  `../../tasks/done/0057-investigate-worker-routing-to-dead-or-unready-workers/worklog.md`
- Briefs: `0192` (the implementation of this decision — `../../tasks/done/0192-schedule-public-games-onto-ready-workers-with-bounded-create/brief.md`),
  `0056` (the maintained ready set `0192` consumes; quorum ruling (a) —
  `../../tasks/done/0056-restore-worker-crash-recovery-and-survivable-scheduling-gate/brief.md`),
  `0193` (the orthogonal `fetchLobbies` overlap defect —
  `../../tasks/done/0193-guard-fetchlobbies-against-overlapping-ticks/brief.md`)
- Incident: `../incidents/2026-08-22-prod-public-lobbies-empty-outage.md`
- Code (verified on `dev` at `282655c`): `src/core/configuration/DefaultConfig.ts:296-298`,
  `src/server/Master.ts:20, 89, 114, 508-535`, `src/server/Worker.ts:149-155, 341-347, 545-556`,
  `src/client/Transport.ts:317-320`, `nginx.conf:3-44, 301-347`
- Wiki (read-only reference): `ai-agents/wiki-vault/wiki/systems/architecture-overview.md:53` already
  describes the hash as "sharding, not load balancing" — fkit-wiki should ingest this ADR so the
  decisions pages carry it.
