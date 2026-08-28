# `Master.ts`: Guard `fetchLobbies` Against Overlapping Ticks

**Source**: `ai-agents/tasks/done/0193-guard-fetchlobbies-against-overlapping-ticks/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — 2026-08-22 outage track — task `0193`

> ✅ Done (agent-closed 2026-08-27 — **not owner-verified**). Built and reviewed via the sprint ship-loop, committed on `dev`. The post-deploy check (brief step 5) is pending.

## Goal

A standalone defect surfaced by the `0057` investigation and owner-approved as its own brief on 2026-08-26. **Independent of worker routing and of `0056`** — no dependency either way.

The master polls its public lobbies from a `setInterval` every **100 ms** that called `fetchLobbies()` with **no in-flight guard**. Each call opens one request per ID in `publicLobbyIDs` with a 5 s abort. When a worker is alive but blocked — which Node's cluster primary permits, because it owns the listening socket and keeps *accepting* connections for a stopped worker — every tick stacked another request on the same stuck ID for 5 s.

Measured (dev, 2 workers, worker 1 `SIGSTOP`ped for 40 s):

- **50 `Error fetching game <id>` lines per stuck ID** (~10/s) — the first tick aborts at 5 s and deletes the ID; the ~49 queued ticks abort in the following 100 ms steps, each logging.
- **Lobby-list flapping: `/api/public_lobbies` empty in 25 of 120 samples (~21%)** — each late-aborting tick finishes with its own empty result and overwrites the published body. Player-visible: the lobby card blinks out for a poll or two, since the client polls at 1 s.
- **Post-recovery `429 Too Many Requests` (×3)** — on `SIGCONT` the worker drains the queued polls in a burst that trips its own 20 req/s per-IP limiter. The master is one IP.
- A new lobby only every ~5 s instead of ~100 ms while the worker was stuck.

No duplicate lobbies were ever observed — `publicLobbyIDs.size` is read live, so late ticks do not double-schedule. The cost was log volume, flapping and self-inflicted rate limiting.

## Key Changes

**Scope: `src/server/Master.ts` plus tests.** No worker, client or config change.

- The 100 ms tick is now `lobbyPollTick(onEmpty)` — an exported, testable unit that skips when the previous poll has not settled. The invariant: **at most one `fetchLobbies` outstanding**, so a slow or aborting poll can never overwrite the published body with a stale or empty list on top of a newer good one.
- Healthy-path cadence is unchanged: a settled poll re-arms within the same ~100 ms, and the `lobbies === 0 → scheduleLobbies()` branch fires exactly as before.
- **The 5 s per-request abort stays.** The guard bounds *concurrency*; the abort bounds *duration*.
- Tests extended in `tests/server/Master.test.ts`: a pending poll makes subsequent ticks no-ops; a late-settling poll cannot overwrite a newer list; the healthy path still triggers scheduling on an empty list.

## Outcome

All three live targets met, on the `0057` repro procedure: **error lines per stuck ID 50 → 1**, **flaps 0** (was 25 of 120 samples), **429s 0** (was 3). The dead-index path (`kill -9`) is unchanged, as required. `npm test` 96 suites / 828 tests, lint 0, `tsc` 0.

- **Orphan games on wedge recovery were left, deliberately.** They come from the *create* call hanging, not the poll — that was `0192`'s timeout and then `0194`'s worker-side guard. With this guard on, the honest orphan baseline is **5**; without it, an accidental 429 flood from the unguarded poll's own error storm suppressed the orphans down to 1. This task removed that accidental protection on purpose, and said so in advance.
- **Known and not fixed here:** the worker's 20 req/s per-IP rate limiter counts the master as one IP, on every route including `create_game`. This task removes the burst it *caused*; whether the limiter should exempt loopback or the admin header is a separate open question for the owner.
- It shares the interval block with `0056` Step 3 — no dependency, whichever landed second rebased.

## Related

- [[tasks/worker-routing-dead-worker-investigation]] — task `0057`, whose §2.2/§7 surfaced this defect
- [[tasks/worker-crash-recovery-and-quorum-gate]] — task `0056`, which edits the same interval block
- [[tasks/schedule-public-games-onto-ready-workers]] — task `0192`, the create timeout addressing the orphans this task leaves
- [[tasks/worker-reject-departed-requester-create]] — task `0194`, which closed the orphans against this task's baseline of 5
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the incident that opened the track
- [[systems/networking]] — the master's lobby polling and endpoint surface
- [[decisions/sprint-4]] — the sprint board carrying the outage track
