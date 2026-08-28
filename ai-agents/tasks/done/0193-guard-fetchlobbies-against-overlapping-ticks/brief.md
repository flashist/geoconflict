# `Master.ts`: guard `fetchLobbies` against overlapping ticks (log amplification, lobby-list flapping, recovery 429s)

## ID
0193

## Sprint
Sprint 4

## Priority
Sprint 4's Status board is unranked (every Priority cell reads `—`), so no rank is assigned or
displaced. **On merit this belongs directly below `0056`, alongside `0192`**, because it is a small,
independent defect on `dev` today with no dependency — it can ship before, after or beside either
outage-track task.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**A standalone defect surfaced by the `0057` investigation (§2.2, §7), owner-approved as its own brief
on 2026-08-26.** Independent of worker routing and of `0056`. Findings:
[`ai-agents/knowledge-base/reports/2026-08-26-0057-worker-routing-dead-worker-findings.md`](../../../knowledge-base/reports/2026-08-26-0057-worker-routing-dead-worker-findings.md)

### The defect

The master polls its public lobbies from a `setInterval` every **100 ms** (`src/server/Master.ts:128-136`)
that calls `fetchLobbies()` (`:433-505`) with **no in-flight guard**. Each call opens one request per
ID in `publicLobbyIDs` with a **5 s abort** (`:437-438`). When a worker stops answering — alive but
blocked, which Node's cluster primary lets happen because it owns the listening socket and keeps
*accepting* connections for a stopped worker (`0057` §2.2) — every tick stacks another request on the
same stuck ID for 5 s.

Measured locally (2 workers, worker 1 `SIGSTOP`ped 40 s — `0057` §2.5 run 2):

- **50 `Error fetching game <id>` lines per stuck ID** (~10/s): the first tick aborts at 5 s and
  deletes the ID (`:448-453`); the ~49 queued ticks abort in the following 100 ms steps, each logging.
- **Lobby list flapping — `/api/public_lobbies` empty in 25 of 120 samples (~21%).** Each
  late-aborting tick finishes with its *own* (empty) result list and overwrites `publicLobbiesJsonStr`
  (`:500-502`), so the body alternates between the real lobby and `lobbies: []`. Player-visible: the
  lobby card blinks out for a poll or two (`PublicLobby.ts:68-71` polls at 1 s).
- **Post-recovery `Too Many Requests`** (×3): on `SIGCONT` the worker drains the queued polls in a
  burst that trips its own 20 req/s per-IP limiter (`Worker.ts:109-114`) — the master is one IP — so
  the next `create_game` calls get 429 and are logged as `Failed to schedule public game`.
- A new lobby only every ~5 s instead of ~100 ms while the worker is stuck.

No duplicate lobbies were ever observed: `publicLobbyIDs.size` is read live at `:504`, so the late
ticks do not double-schedule. The cost is log volume, flapping and self-inflicted rate limiting.

### Why it is its own task

None of the routing options in `0057` §4 touch this, and it is the source of most of the wedged-shape
cost. It is a small, self-contained change in one function's call discipline, testable on its own.
The orphan public games seen on recovery come from the **create** call hanging — that is `0192`'s
timeout, not this task; say so if a reviewer asks why orphans remain.

## What to build

**Scope: `src/server/Master.ts` plus tests.** No worker, client or config changes.

**Step 1 — One poll in flight at a time.**

Make the 100 ms tick skip when the previous `fetchLobbies()` has not settled — an in-flight flag, or
re-arm with `setTimeout` after completion instead of a fixed `setInterval`. Implementation call; state
which in the plan and why. Either way the invariant is: **at most one `fetchLobbies` outstanding**, so
a slow or aborting poll can never overwrite `publicLobbiesJsonStr` with a stale or empty list on top of
a newer good one.

- **Healthy-path cadence must not change.** A settled poll re-arms within the same ~100 ms; the
  `lobbies === 0 → scheduleLobbies()` branch (`:130-134`) fires exactly as today.
- The 5 s abort on each request stays — the guard bounds *concurrency*, the abort bounds *duration*.
- ⚠️ **`0056` Step 3 edits the same lines** (`:128-136` — the `schedulingStarted` interval-install-once
  guard). No dependency, but whichever lands second rebases onto the other; keep this change small so
  that merge is trivial.

**Step 2 — Tests.** `fetchLobbies` and the tick are module-private today; extract the tick into a
small testable unit (as `0056` does for readiness) rather than forking workers. Extend
`tests/server/Master.test.ts`. Cover at minimum:

- With a poll pending (never-resolving fetch), subsequent ticks are no-ops — one request per ID, not
  one per tick.
- A poll that settles late does not overwrite a newer list (order: tick A starts, tick B would start —
  is skipped; A aborts → the published body reflects the current `publicLobbyIDs`, never a stale
  empty list on top of a live lobby).
- Healthy path: consecutive fast polls run at the normal cadence and still trigger scheduling on an
  empty list.

## Verification steps

1. **All new tests pass**; full suite, lint and `tsc --noEmit` clean.
2. **Repro run 2 from the `0057` Appendix** (dev, 2 workers, `SIGSTOP` worker 1 for 40 s, then
   `SIGCONT`), sampling `/api/public_lobbies` every 500 ms:
   - `Error fetching game` lines per stuck ID: **≤ 1** (was 50).
   - Empty samples while a live lobby exists on the other worker: **0** (was 25 of 120). Report the
     count.
   - `Too Many Requests` / `Failed to schedule public game … Too Many Requests` on `SIGCONT`: **0**
     (was 3). Report the count.
   - Orphan games on recovery may remain — that is `0192`'s create timeout. State how many you saw so
     `0192` has a baseline.
3. **Repro run 1** (`kill -9` worker 1): behaviour unchanged from the findings — ~100 ms and 3 error
   lines per miss, no hang. This task must not alter the dead-index path.
4. **Healthy path unchanged.** Full local boot, all workers ready: one lobby at a time, a new lobby
   scheduled within ~100–200 ms of the previous one filling or starting, `All workers ready` once.
5. **Post-deploy.** After the next prod deploy that carries this, scope `docker logs` to the current
   boot (see `0056` verification step 8 for the `--since` form) and confirm `Error fetching game`
   lines, if any, arrive singly rather than in 50-line bursts.

## Notes

- **Depends on:** nothing. Startable now.
- **Blocks:** nothing.
- **Related:** `0056` (edits the same interval block — rebase, no dependency), `0192` (the create
  timeout that addresses the orphans this task leaves; the two together remove most of the
  wedged-worker cost), `0058` (`Worker.ts` `server.on("error")`, same silently-hung-worker family).
- **Worker rate limiter counts the master — known, not fixed here.** `Worker.ts:109-114` applies
  20 req/s per IP to every route including `create_game` and `/api/game/:id` from `localhost`. Normal
  cadence is ~10 req/s per lobby, so any burst (two lobbies at once, recovery) can 429 the master. This
  task removes the burst it *causes*; whether the limiter should exempt `localhost` or the admin
  header is a separate question for the owner — do not change it under this brief.
- **Do not modify the incident record or the `0057` findings.** Reference them.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **No secrets in any artifact.** Container logs carry `persistentID` values (PII); filter any excerpt
  before it lands in a worklog, review or commit.
