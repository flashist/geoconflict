# Public-game scheduling: pick a game ID that hashes to a ready worker, and bound the create call

## ID
0192

## Sprint
Sprint 4

## Priority
Sprint 4's Status board is unranked (every Priority cell reads `—`), so no rank is assigned or
displaced. **On merit this belongs directly below `0056`**, because it consumes `0056`'s maintained
ready set and is the second half of the same outage track — nothing else in the sprint waits on it.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**This is option (v) from the `0057` investigation, approved by the owner on 2026-08-26.** Findings —
**read them first**, §0, §2, §3, §4 (row v), §5:
[`ai-agents/knowledge-base/reports/2026-08-26-0057-worker-routing-dead-worker-findings.md`](../../../knowledge-base/reports/2026-08-26-0057-worker-routing-dead-worker-findings.md)

### The problem

`schedulePublicGame` (`src/server/Master.ts:508-535`) draws a random game ID (`:509`), adds it to
`publicLobbyIDs` (`:510`), and POSTs `create_game` to the worker whose index is
`simpleHash(gameID) % numWorkers()` (`src/core/configuration/DefaultConfig.ts:296-298`). It consults
no readiness state, and the create call has **no timeout and no abort signal** (`:516-526`).

Once `0056` ships its quorum gate (18 of 20, 90 s deadline — owner-ruled 2026-08-22, **confirmed
2026-08-26** on the `0057` findings), scheduling runs with up to two indices absent. Measured cost
(`0057` §2.5, §5) of an ID that lands on an absent index:

- **Dead index (port refuses):** self-healing — ~100 ms and 3 error lines per miss, no hang, no
  orphan; rarely (≈ 1 blink/hour at 100 games/hour) and briefly (≤ 1 s) player-visible. Expected
  ≈ 0.11 extra draws ≈ 11 ms ≈ 0.33 error lines per scheduled game at 18/20. Nuisance, not outage.
- **Wedged index (port accepts, never answers):** the create call **hangs indefinitely** (undici's
  ~300 s default was not observed to fire in 40 s — reasoned, not observed), and on worker recovery
  the queued creates succeed against IDs the master has already forgotten → **orphan public games**
  (2 observed) plus `Too Many Requests` on subsequent creates (3 observed). Not a function of the
  quorum at all: `readyWorkers` tracks liveness, never responsiveness.

### What the hash is for — and why the fix is master-only

Deterministic placement is a **shared contract**, not load balancing (`0057` §3): the client computes
the same index with no round-trip (`Transport.ts:317-320` + eight more lines in four files), the worker rejects
mismatches (`Worker.ts:149-155`, `:341-347`), nginx maps `/w<N>/` to the port (`nginx.conf:301-347`),
and there is **no game→worker registry** — only `publicLobbyIDs`. The codebase already treats the
index as fixed and moves the **ID** instead: `Worker.ts:545-556` rejection-samples up to 1000 IDs to
land on a given worker. **Option (v) reuses that pattern on the master.** The game still lives on its
hash index, so client, worker and nginx are untouched.

Distribution is uniform to within ±1.2% over 20 indices; rejection-sampling onto 18 ready of 20 takes
**mean 1.11 draws, max 7** in 2×10⁵ trials (`0057` §3). No locality or affinity depends on placement.

### Dependency — hard

**`0056` must land first.** Today `readyWorkers` (`Master.ts:20`) only ever grows (`:114`); nothing
removes a dead worker. `0056` Step 1 adds `markDead` on exit and Step 4 extracts readiness tracking
into a small testable unit. **This task consumes that maintained ready set.** Building it against the
current never-shrinking set would filter nothing.

## What to build

**Scope: `src/server/Master.ts` plus tests.** No client, worker, nginx or config changes. If
implementation shows the seam is wrong, say so before crossing it.

**Step 1 — Pick the game ID from the ready set.**

Replace the bare `generateID()` at `Master.ts:509` with a bounded rejection sample: draw IDs until
`config.workerIndex(id)` is in the ready set maintained by `0056`, with an attempt cap (the
`Worker.ts:545-556` precedent uses 1000; at 18/20 the mean is 1.11). Extract it as a small pure
function taking the ready set as input — something like `pickGameID(readySet)` — so it is unit-testable
without forking workers, and so `schedulePublicGame` can be tested around it (the `0057` findings note
`Master.test.ts` covers routes only today).

- **The ready set is `0056`'s unit, not a second copy.** Read the same structure `markDead` /
  `WORKER_READY` maintain; a restarted index that reports ready **rejoins** the eligible set with no
  further action.
- **Never stall scheduling** (option (iii) — holding — was rejected in `0057` §4 because a capped-out
  index would stall it forever). If the attempt cap is exhausted, fall back to an unfiltered ID and log
  at `warn`; if the ready set is empty, log at `error` and skip the tick (nothing can be scheduled
  anyway). State the chosen fallback in the plan.
- Exclusion is by **liveness only**. A wedged-but-alive worker is still eligible; that is the recorded
  tradeoff, not a gap to fill here (see Notes).

**Step 2 — Bound the create call.**

Give the `create_game` fetch at `Master.ts:516-526` an `AbortController` timeout, as `fetchLobbies`
already has for the lobby poll (`:437-438`, 5 s). Pick and justify the value in the plan — 5 s matches
the existing poll and the per-tick cadence; anything longer than the lobby lifetime is pointless. On
timeout: log `Failed to schedule public game …` as today and let the existing next-tick path drop
the ID, **or** drop it from `publicLobbyIDs` in the failure path directly — implementation call,
state which. The goal is that a wedged index costs **one failed attempt per timeout window** instead
of an unbounded hang.

**Step 3 — Tests.** Extend `tests/server/Master.test.ts`. Cover at minimum:

- `pickGameID` returns an ID whose `workerIndex` is in the ready set — over many draws, with 2 of 20
  excluded, the excluded indices are **never** chosen.
- With every index ready, the filter is a no-op (the first draw is returned; distribution untouched).
- Attempt-cap exhaustion and empty-ready-set behaviour match the fallback chosen in Step 1.
- Scales with the configured worker count: works at `DevConfig`'s 2 workers and `ProdConfig`'s 20
  (`src/core/configuration/DevConfig.ts:40`, `ProdConfig.ts:6`).
- The create call aborts at the chosen timeout and logs, rather than hanging (fake a never-resolving
  fetch).
- An index marked dead then marked ready again is eligible again.

## Verification steps

1. **All new tests pass**; full suite, lint and `tsc --noEmit` clean.
2. **Dead index, local (2 workers).** Boot per the `0057` Appendix, `kill -9` worker 1 in the state
   where `0056` has marked it dead (after its restart cap, or with restarts disabled for the test).
   Over ≥ 45 s of scheduling: **zero** `Failed to schedule public game on worker w1` lines (was one
   miss per ~2 draws, 3 error lines each), lobbies keep appearing at the normal cadence, and
   `/api/public_lobbies` never samples empty because of a miss.
3. **Rejoin.** Let `0056` restart the worker (or restart it by hand); once it logs ready, confirm new
   games land on `w1` again (worker log shows creates on both indices).
4. **Wedged index, local.** `SIGSTOP` worker 1 for 40 s per the Appendix run 2. The create call now
   fails within the chosen timeout (was: no failure in 40 s); on `SIGCONT`, count orphan games
   (`no clients joined, not archiving` on the worker for IDs the master never listed) — expect fewer
   than the 2 observed; state the number. Note `0193` (the poll overlap guard) removes most of the
   remaining recovery noise; run this step with and without it if both are on the branch.
5. **Healthy path unchanged.** Full boot with all workers ready: same scheduling cadence, same lobby
   behaviour, distribution across indices still uniform over a long run (the filter must be a no-op
   at full strength).
6. **Prod-shaped.** Exercise the pick logic at 20 workers in unit tests (the exposure is prod-only).
7. **Post-deploy.** After the next prod deploy that carries this, scope `docker logs` to the current
   boot (see `0056` verification step 8 for the `--since` form) and confirm no
   `Failed to schedule public game` lines during a healthy run.

## Notes

- **Depends on:** `0056` — hard. Needs its `markDead`-maintained ready set and the extracted readiness
  unit; nothing to filter against before it lands.
- **Blocks:** nothing.
- **Related:** `0193` (same file, adjacent lines `:128-136` / `:433-505` — coordinate the rebase, no
  dependency either way), `0057` (the investigation this implements), `0058` (`Worker.ts`
  `server.on("error")` — same silently-hung-worker family).
- **Owner rulings recorded 2026-08-26 (from the `0057` findings review):**
  - Quorum stays **18 of 20, 90 s** — the measured residual (≈ 11 ms, ≈ 0.33 error lines per
    scheduled game) is rarely (≈ 1 blink/hour at 100 games/hour) and briefly (≤ 1 s) player-visible.
  - **Private lobbies — accepted as-is, out of scope.** `HostLobbyModal.ts:866-871` picks the ID and
    POSTs `create_game` straight to `/w<N>/`; a dead or wedged index costs the host one failed click
    (`HTTP error!`, `:880-884`) and they retry with a fresh ID. No master-only option helps; anything
    else publishes worker health to the client. **Do not extend this task to cover it.**
  - **Uptrace query (`0057` §6.3) — owner runs it later.** ⚠️ If line (5) — body contains
    `Worker mismatch` or `should be on worker` — returns hits, that is client/server worker-count
    drift, a different failure that looks the same from outside, and **this task is re-prioritised**
    (raised, not dropped). If lines (1)–(3) hit after a (4) hit, the dead shape is confirmed in prod.
- **What this does not buy, on record:** exclusion of a wedged-but-alive worker. `readyWorkers` is
  liveness, not health; the timeout bounds that case, it does not remove it. A responsiveness signal
  (`/health` probe or last-successful-response timestamp per worker) is a future item, not designed
  here (`0057` §9).
- **The decision this implements is recorded as ADR-109** — *the worker index is a fixed placement
  contract; move the ID, not the index*:
  [`ai-agents/knowledge-base/decisions/adr-109-worker-index-fixed-placement-contract-move-the-id.md`](../../../knowledge-base/decisions/adr-109-worker-index-fixed-placement-contract-move-the-id.md).
  Build to it; if implementation contradicts it, that is an ADR amendment for the architect, not a
  silent deviation.
- **Do not modify the incident record or the `0057` findings.** Reference them.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **No secrets in any artifact.** Container logs carry `persistentID` values (PII); filter any excerpt
  before it lands in a worklog, review or commit.
