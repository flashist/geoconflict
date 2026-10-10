# A stopped `Transport` keeps its EventBus listeners and can leave a CONNECTING socket open after a join-over

## ID
0432

> ℹ️ **ID allocation, checked 2026-10-10 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest across `backlog/`,
> `done/` and `cancelled/` before this run: `0431` (folder names and `## ID` fields agree). `0432`: no task folder, no
> board hit.

## Sprint
Backlog

> 📌 **OWNER RULING, 2026-10-10, given live via `AskUserQuestion` in the `fkit lead` session** (during a
> `/fkit-sprint-ship-loop` run on Sprint 8, while `0228` was being shipped), relayed by `fkit-lead` to a spawned
> `fkit-producer` with no owner channel (ADR-021/037); ⛔ **not producer precedent.** Verbatim:
> **"File, low-priority backlog"**. Filed on the Backlog board, **not** Sprint 8.

## Priority
Unscheduled

> Owner-stated priority: **low**. The leak is bounded — the page reloads after every match — and so far it shows as log
> noise plus, possibly, one stray server connection per join-over. No player-visible effect has been seen.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Where this came from.** Found while building and reviewing
[`0228`](../../done/0228-handlejoinlobby-stale-gamestop-race/brief.md) (the stale `gameStop` race on lobby join). It is
**pre-existing, not caused by `0228`** — `0228` only routes the same stop call through a new helper. ⚠️ That
"predates `0228`" claim was **reasoned from the code, not re-run on a pre-`0228` build.** Sources:
`0228`'s [`worklog.md`](../../done/0228-handlejoinlobby-stale-gamestop-race/worklog.md) § *Side observation (pre-existing,
not this task, not fixed)* and the side note in its phase-1 section (*"a leave while the game WebSocket is still
CONNECTING …"*), plus its [`review.md`](../../done/0228-handlejoinlobby-stale-gamestop-race/review.md) (the reviewer raised it
too, per the driver; a grep of the ledger at filing time did not find it worded there — the worklog is the written
record).

**What goes wrong, in plain terms.** A "join-over" is joining a new game while one is still set up in the same page
(for example, a public lobby, then a Mission). The old game's `Transport` (the object that talks to the server) is
stopped, but not fully cleaned up:

1. **Its event listeners stay subscribed.** `Transport`'s constructor subscribes to the shared `EventBus` with
   anonymous arrow functions (`src/client/Transport.ts` around lines 207–270, e.g. `SendHashEvent` at `:250`) and never
   unsubscribes. `EventBus.off()` exists (`src/core/EventBus.ts:32`) but cannot be used with anonymous functions. So the
   stopped `Transport` still receives every hash and intent event of the **new** game, and logs
   `WebSocket is not open …` / `attempting reconnect` on each one. Those handlers only log — no reconnect is actually
   attempted. One more dead listener set per join-over.
2. **A socket still connecting is never closed.** `killExistingSocket()` (`Transport.ts:803-818`) removes the socket's
   handlers and drops its reference, but calls `close()` **only when the socket is `OPEN`**. A socket still
   `CONNECTING` is neither closed nor reachable afterwards, so its server connection may stay open until the page goes
   away. This matches the `WebSocket is not open. Current state: 0` log `0228` saw on a leave during connect (state 0 =
   `CONNECTING`). In `0228`'s runs the server never listed that clientID, so **no effect has been observed** — the
   stray connection is likely, not proven.
3. **Theoretical only.** A stale **local** (single-player) `Transport` would still forward hash and intent events to its
   ended `LocalServer` (`leaveGame()` calls `localServer.endGame()` and returns). **No path that reaches this today
   has been traced.**

**Why it is bounded.** The page reloads after each match, which clears everything. So the cost is log noise, a few
dead listeners, and possibly a stray connection — within one page session only.

**Related, not a dependency.** `0228`'s phase 1 also showed a *different* leak: a double-tapped Join overwrote the first
join's stopper, so that transport was never stopped at all. `0228` fixes that path. This task is only about what a
**stopped** transport leaves behind.

## What to build

1. **Unsubscribe on stop.** When a `Transport` is stopped (`leaveGame()`, and any other teardown path you find), remove
   every `EventBus` listener it added in its constructor. That means keeping a reference to each handler so `off()` can
   find it. Make it safe to call twice (the stopper may run more than once).
2. **Close a `CONNECTING` socket.** In `killExistingSocket()`, close the socket when it is `CONNECTING` as well as
   `OPEN`. Check that closing a connecting socket does not throw or produce a misleading error/log, and that no
   reconnect is triggered by it (handlers are already removed first — keep that order).
3. **Local transport.** Confirm whether the same unsubscribe covers the local (single-player) case; it should. If you find
   a real path where a stale local transport forwards to an ended `LocalServer`, record it in the worklog — do not grow
   the task to fix unrelated behaviour.
4. **Keep the messages honest.** The `attempting reconnect` log lines in the "socket not open" branches describe
   something that does not happen. Optional: if you touch them, make them say what actually happens. Do not change
   reconnect behaviour itself.
5. Out of scope: anything in `0228`'s join sequencing, server-side handling of duplicate clients, and the reconnect
   banner.

## Verification steps

1. **A test against the real `Transport` teardown** (not a mock of it — follow the pattern of the existing
   `tests/client/TransportParticipation.test.ts` / `TransportProfileSession.test.ts`):
   - After stop, emitting `SendHashEvent` and an intent event on the shared `EventBus` reaches **no** handler of the
     stopped `Transport` (no send, no `not open` / `attempting reconnect` log).
   - A second `Transport` on the same `EventBus` still receives those events normally (join-over case).
   - Stop called twice does not throw.
   - A socket stopped while `CONNECTING` gets `close()` called; one stopped while `OPEN` still does; one already
     `CLOSED` / `null` is handled without error.
2. **By hand, in the dev build:** public lobby → join-over into a Mission (or another game) in one page session; play a
   little. The console shows **no** `WebSocket is not open …` / `attempting reconnect` lines from the old transport.
   Then leave a game **while its socket is still connecting** (Slow 3G in devtools helps): the `Current state: 0` line
   no longer leaves a socket behind — check devtools' Network → WS list shows it closed.
3. Normal join, leave, join-over, single-player start/leave and the reconnect-banner rejoin all still work. Say how you
   checked each.
4. `npm test` (through the npm script) and `npm run lint` are green. Judge any `supertest` failure by the known-flake rule
   in `CLAUDE.md` and say you re-ran.
5. The worklog records whether the "predates `0228`" claim was confirmed on an older build or still rests on reading
   the code.

## Notes

- **Depends on:** nothing.
- **Blocks:** nothing.
- Sequencing (soft, not a dependency): easier after `0228` lands, since both touch the stop path — coordinate or
  rebase if `0228` is still open.
- Source: [`0228`](../../done/0228-handlejoinlobby-stale-gamestop-race/brief.md) — its builder's worklog (§ *Side observation*)
  and reviewer. Pre-existing; not introduced by `0228`.
- Client-only change. Ships in a normal weekend deploy slot.
- Filed 2026-10-10 by a spawned `fkit-producer` on the owner ruling above. ⛔ Not producer precedent.
