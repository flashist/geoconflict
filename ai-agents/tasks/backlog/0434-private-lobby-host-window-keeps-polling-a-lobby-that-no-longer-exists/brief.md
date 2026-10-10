# The private-lobby host window keeps polling a lobby that no longer exists

## ID
0434

> ℹ️ **ID allocation, checked 2026-10-10 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest across `backlog/`,
> `done/` and `cancelled/` before this run: `0433` (folder names and `## ID` fields agree). `0434`: no task folder, no
> `## ID` hit, nothing in `.claude/`; repo-wide hits are SVG coordinates only.

## Sprint
Backlog

> 📌 **OWNER RULING, 2026-10-10, given live via `AskUserQuestion` in the `fkit lead` session** (at `0390`'s close),
> relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ **not producer
> precedent.** Verbatim: **"Close 0390 + file task for (A) (Recommended)"** — option text *"Producer closes 0390
> (agent-closed) with these results, and files a small backlog task: the host window should stop polling once its
> lobby is gone. (B) is noted only."* Filed on the Backlog board, **not** Sprint 8.

## Priority
Unscheduled

> Owner-stated priority: **low**. Players see only a stale window; the server cost is one request a second per such
> window.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Where this came from.** Seen live on production during
[`0390`](../../done/0390-verify-0377-live-an-abandoned-private-lobby-ends-after-30-minutes-and-an-occupied-one-does-not/brief.md)
(2026-10-10, game `0.0.161`), from the game server's log read read-only by `fkit-lead` in the owner's session. Source:
`0390`'s `worklog.md`, side finding (A).

**What was seen.** A test private lobby (lobby #2 in `0390`) was left open in a host window. At **11:53:20Z** the
server ended it by the old **3-hour cap** (`game past max duration`). After that, the host window kept asking the
server for that lobby — a `GET` on the lobby's game-info route, `/w<N>/api/game/<id>` — about **once a second**. Every
request got `404` (server log: `lobby <id> not found`). It was **still doing so at 14:37Z, 2 h 44 min later.** The
window never noticed its lobby was gone.
- ⚠️ **Not checked:** what the window showed on screen during that time.

**Where the polling lives (read from the code at filing, not re-run).** `HostLobbyModal` starts a once-a-second
`pollPlayers()` when the window opens and stops it only when the window closes. `pollPlayers()` asks for the lobby and
reads the reply as JSON; a failed request is logged with `console.warn` and the next tick tries again. Nothing in it
treats "the lobby is gone" as a reason to stop. (Line numbers drift — find it by name.)

**Related — the other half of the same loop.**
[`0353`](../../done/0353-the-host-window-polls-for-players-before-a-lobby-exists-and-throws-every-second/brief.md)
fixed the host window polling **before** a lobby exists (an `Uncaught (in promise)` every second). This task is the
**after** case: the lobby existed, and the server has since ended it.

**Other ways to reach the same state (likely, not observed).** Any server-side end of an unstarted private lobby while
its host window is still open:
- the **30-minute idle end** from
  [`0377`](../../done/0377-end-abandoned-unstarted-private-lobbies-after-a-short-idle-time-not-3-hours/brief.md) — only if
  the host window is somehow still open while nobody counts as connected (for example, a connection that dropped and
  did not come back);
- any other server-side removal of the game (for example, a server restart).

**Cost.** Players see a window that looks alive but is not. The server gets one wasted request a second per such
window, for as long as the window stays open.

## What to build

1. **Stop polling when the lobby is gone.** When the lobby request says the lobby does not exist (`404` / "not
   found"), stop the once-a-second poll for that window. Decide, and say in the worklog, how the client tells "gone"
   apart from a one-off network error or a server hiccup — a single failed request must not close a live lobby window.
2. **Tell the host.** Close the host window and return the player to the start screen, with a short message that the
   lobby has closed. Any new text goes through `translateText`, in both `en.json` and `ru.json`.
3. **Check the other routes the window uses.** If anything else in the host window keeps calling a lobby that is gone
   (for example, the settings `PUT`), make sure it does not start a new loop of failing calls. Record what you found.
4. Out of scope: the hidden-tab reconnect churn seen in `0390` (noted only, by owner ruling); any change to when the
   server ends a lobby (`0377`, the 3-hour cap); the join window used by players who are not the host.

## Verification steps

1. **A test against the real host-window polling code** (not a mock of it): with the lobby request answering `404` /
   not found, the poll stops — no further requests on later ticks — and the window closes back to the start screen.
2. Same test file: a single network error or a non-404 server error does **not** close the window, and polling goes on.
   A normal reply keeps updating the player list as today.
3. Closing and reopening the host window after a "gone" close starts a fresh, working poll for the new lobby (no
   leftover timer from the old one).
4. **By hand, in the dev build:** create a private lobby, then end it on the server (restart the dev server, or any
   quicker way the coder finds). Within a few seconds the host sees the "lobby closed" message and is back on the start
   screen; devtools' Network tab shows the lobby requests stop.
5. `npm test` (through the npm script) and `npm run lint` are green. Judge any `supertest` failure by the known-flake
   rule in `CLAUDE.md` and say you re-ran.

## Notes

- **Depends on:** nothing.
- **Blocks:** nothing.
- Source: [`0390`](../../done/0390-verify-0377-live-an-abandoned-private-lobby-ends-after-30-minutes-and-an-occupied-one-does-not/brief.md)
  — its `worklog.md`, side finding (A). The second side finding there, (B) hidden-tab reconnects, is noted only and is
  **not** part of this task (owner ruling).
- Related: [`0353`](../../done/0353-the-host-window-polls-for-players-before-a-lobby-exists-and-throws-every-second/brief.md)
  (the *before a lobby exists* case of the same poll).
- Client-only change. Ships in a normal weekend deploy slot.
- Filed 2026-10-10 by a spawned `fkit-producer` on the owner ruling above. ⛔ Not producer precedent.
