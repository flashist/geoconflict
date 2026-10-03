# End abandoned, unstarted private lobbies after a short idle time — not after 3 hours

## ID
0377

> ℹ️ **ID allocation, checked 2026-10-03 before filing.** Highest task folder and highest `## ID` across `backlog/`,
> `done/` and `cancelled/`: `0375`. `0376` and `0377` allocated in this run, in that order.

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**OWNER RULING, relayed by `fkit-lead`; ⛔ not producer precedent.** Filed 2026-10-03 by a spawned `fkit-producer` with
no owner channel (ADR-021/037), on an owner ruling given live via `AskUserQuestion` in the `fkit lead` session. Question:
*"What has to happen before private lobbies are turned on for regular players?"* Owner's pick, **"Hidden + test plan
first"**, verbatim:

> *"Keep it hidden. Do 0354 (testers see it by default, plus an 'everyone' switch that starts off), then a test where a
> real citizen hosts inside Yandex and a friend joins. Fix the join race (0228) and the 3-hour leftover lobbies, and ship
> the citizenship popup (0301), before turning it on for everyone."*

**This task is "fix the 3-hour leftover lobbies".** It is item 4 of the ~~five~~ six-item release gate recorded in
[`0354`'s *Release gate*](../0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md).

**History.** This is `0335` **case 3**. On 2026-09-30 the owner ruled *"Accept, revisit later"* — *"revisit before
private lobbies open to all players"* ([`0335` close record](../../done/0335-investigate-four-known-lobby-close-leftovers-left-by-0327/brief.md)).
Today's ruling is that revisit. No task existed for it until now.

### The problem, in plain terms (from the `0335` findings)

Source: [findings report, *Case 3*](../../../knowledge-base/reports/2026-09-30-0335-lobby-close-leftovers-findings.md).
Code references there are the 2026-09-30 tree; find code by name.

- A private lobby that is created but never started stays on the game server for **3 hours**, even with nobody in it.
  An unstarted private game stays in the lobby phase whatever its player count; only the max game duration ends it
  (`GameServer.phase()`). Then `GameManager` removes it, and nothing is archived.
- **The early-close path:** the host opens Create and closes the window before the server answers. The lobby is
  created; the client then sends nothing (shown by `0335`'s probes P3a/P3b).
- **It is one path of a wider class.** Every abandoned, unstarted private lobby lives 3 hours: the host closes after
  joining, reopens Create, closes the tab, or someone calls `create_game` directly (not identity-gated; limited only by
  the 20 requests/s/IP rate limit).
- **There is no server call to cancel a lobby**, so a client-only fix cannot work.
- **Cost today:** players see nothing. Each orphan is one idle `GameServer` object in memory and +1 on the
  `geoconflict.server.games.total` gauge for 3 h. Nothing is lost. It matters at scale — which is what opening private
  lobbies to everyone would bring.
- **The old ordering rule no longer applies:** `0327` plan §8 said a server fix must wait for `0322`; `0322` is done.

## What to build

**The shape the findings recommend** (the plan may propose better, with reasons): in `GameServer.phase()`, end an
**unstarted private** lobby that has had **no connected client for N minutes**. This fixes the whole class, not only
the early-close path. Server-only; one game-server deploy; no client change expected.

1. **Plan first, and put the open questions below to the owner before building.**
2. **Scope:** private lobbies only. Public lobbies and started games behave exactly as today.
3. **Grace time:** long enough that a host who reconnects, or whose join is slow, is not cut off. The findings suggest
   10–15 minutes; the owner rules (question 1).
4. **What a late joiner sees:** someone opening an invite link to a lobby that was ended this way gets the same result
   as for any finished or missing game today. The plan says what that is; no new message is expected.
5. **Observability:** the plan proposes whether to log each idle-lobby end (a server log line, no player ids), so the
   effect can be seen next to the existing `game past max duration` warning.
6. **Tests:** the `0335` probe P3b shape — a real `GameServer`, private, zero clients, time advanced — now ends after
   the grace time, not at 3 h. Plus: a lobby with a connected client is not ended; a public lobby is not affected; a
   started game is not affected; a client that leaves and comes back inside the grace time keeps the lobby.

## Verification steps

1. Unit tests (step 6 above) pass, each asserting the phase at the relevant times.
2. `git diff` shows changes under `src/server/` (and tests) only, or the plan explained any other change.
3. Public-lobby and started-game behaviour is unchanged — existing tests still pass.
4. `npm test`, `npm run lint`, `npx tsc --noEmit` green.
5. **After the weekend game-server deploy (owner or a read-only agent check):** an abandoned test lobby is gone after
   the grace time, not 3 h later. Per the build/verify rule, if this needs a deploy plus an owner check, close this
   build task and file the live check as its own verify task.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing directly. 🚦 It is item 4 of the release gate in `0354` — the everyone-flag is not set until it is
  done (OWNER RULING 2026-10-03, relayed by `fkit-lead`; ⛔ not producer precedent).
- **Why one brief.** One rule in one function on one server, tested by one probe shape. Nothing in it ships usefully
  alone.
- **Related:** [`0335`](../../done/0335-investigate-four-known-lobby-close-leftovers-left-by-0327/brief.md) (case 3,
  findings linked above), `0327` (lobby close routes), `0333` (fixed the client half of the same early close),
  [`0353`](../0353-the-host-window-polls-for-players-before-a-lobby-exists-and-throws-every-second/brief.md) (same
  host window, client side — lists this case as out of its scope),
  [`0374`](../0374-lobby-windows-end-their-joining-mark-on-close-not-only-when-the-request-settles/brief.md) (same
  window close, client side), [`0302`](../../done/0302-private-lobby-as-a-locked-citizen-perk/brief.md) (the feature).
- **Open questions for the owner — the coder puts these in the plan; do not decide them:**
  1. **Grace time N.** Recommended: 10–15 minutes (the findings' range) — long enough for a slow join or a reconnect,
     short enough that orphans no longer pile up.
  2. **Count from when?** From creation, or from the last time any client was connected? Recommended: from the last
     time a client was seen (or creation, if none ever connected) — that covers both the early-close path and a host
     who joined and then left.
- ⚠️ Line references in the findings are the 2026-09-30 tree; find code by name.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
