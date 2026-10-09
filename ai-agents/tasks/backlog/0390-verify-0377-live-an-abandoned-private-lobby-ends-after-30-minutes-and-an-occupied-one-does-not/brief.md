# Verify 0377 live — an abandoned private lobby ends after 30 minutes, and an occupied one does not

## ID
0390

> ℹ️ **ID allocation, checked 2026-10-04 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest task folder and
> highest `## ID` on all three boards: `0389`. `0390` allocated in this run.

## Sprint
Sprint 8

## Priority
7

> ⚠️ **Priority 7 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit this belongs directly below `0370`**, because the owner's standing build/verify-split rule (2026-09-29)
> puts a verify task *"on top of the next sprint"*, and `0370` already holds rank 1 there by an earlier ruling.
>
> **Why it is not at the top — the rule's cheapest-to-reverse branch, stated plainly.** The relayed instruction was
> "top of Sprint 8". On the [Sprint 8 board](../../../sprints/plan-sprint-8.md) today, ranks 2–4 are closed rows
> (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done). Putting this task at rank 1 or 2 would renumber those closed rows,
> which ADR-035 forbids *"not even under an owner ruling"*; and a spawned producer never re-ranks anyway. So it was
> **appended at 7** — the reversible branch. The earlier verify tasks (`0351`, `0358`, `0363`, `0370`) reached the top
> only because no closed row sat on this board then. **Owner decision needed:** keep rank 7 (the order on this board
> barely matters — every verify row here is an independent check), or rule a different placement that does not
> renumber a closed row.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **MAY BE EXECUTED BY THE OWNER (human), or by an agent for the read-only part.** Making and
leaving a test lobby on the live game needs a person (or an owner-approved test client). Reading the server log is
read-only and may be run for the owner by an agent session that has access (standing rule: read-only checks are run,
not handed over).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0370`](../0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline/brief.md).)*

## Context

**Filed 2026-10-04 by a spawned `fkit-producer` with no owner channel (ADR-021/037), at `0377`'s close, on the
owner's standing build/verify-split rule (2026-09-29), relayed by `fkit-lead` driving `/fkit-sprint-ship-loop`.**
⛔ Not producer precedent. The **build** task closes when built and reviewed; this **verify** task goes on the next
sprint and **must not block** Sprint 7's deploy.

**What this verifies.** [`0377`](../../done/0377-end-abandoned-unstarted-private-lobbies-after-a-short-idle-time-not-3-hours/brief.md)
(closed 2026-10-04 `(agent-closed — not owner-verified)`) makes the game server end a private lobby that has **not
started** and has had **nobody connected for 30 minutes**. Before it, such a lobby sat on the server until the 3-hour
maximum game length. Owner rulings at `0377`'s plan gate (2026-10-04, live `AskUserQuestion`):
- the wait is **30 minutes** (the owner's own value);
- the clock runs **from when the last person left**, or **from creation if nobody ever joined**.

When it ends such a lobby, the server writes one info log line: `private lobby ended, no client connected`, with
`gameID`, `idleMs` (how long it was empty) and `anyClientJoined` (`true` if anyone ever joined, `false` if nobody
did). No player ids are logged.

**What was proved before close, and what was not.** Unit tests (10, real `GameServer`, time advanced) and a full
`npm test` passed; mutation checks showed each clock update is covered. **Not proved: the behaviour on the real game
server after deploy.** That is this task.

⚠️ **Known scope, expected — read before judging a log line odd.** The idle rule covers **every** game that is not
public and has not started — including Singleplayer games created on the server through the direct `create_game`
path, not only private lobbies. Such a game that nobody connects to will also end after 30 minutes with this same log
line. That was named in `0377`'s plan and is expected; it is **not** a failure of this check.

### Preconditions — this task cannot start until all of these hold
- `0377` is **committed** (the owner commits) and shipped in a **game-server** deploy (weekend slot, per the owner's
  deploy rule). Record the deploy date.
- A way to make a private lobby on the deployed build. Private lobbies are a citizen perk, shown by default only to
  testers (`0354`); the person running the check needs a tester or citizen account on that build, or the owner names
  another way.
- For the log read: access to the game server's logs (Uptrace on the telemetry box). ⚠️ That box is unreachable while
  a full-tunnel VPN is on — see the project memory note on telemetry VPN access.

## What to build

Nothing — this is a check. Three cases, one lobby each, run on the deployed game server:

1. **Abandoned after someone joined.** Create a private lobby, stay in it a minute, then close the window so nobody
   is connected. Note the time you left.
2. **Never joined, or left at once** (optional if case 1 is clear). If there is a way to create a private lobby that
   nobody connects to, do it and note the creation time; this exercises the "from creation" rule
   (`anyClientJoined: false`). If there is no such way on the live build, say so and skip — the unit tests cover it.
3. **Occupied.** Create a private lobby and **stay connected for more than 30 minutes** (a tab left open is enough —
   the client pings every few seconds). It must **not** be ended.

Then read the server log (read-only) for each lobby's `gameID`.

## Verification steps

1. **Case 1 passes:** the log shows `private lobby ended, no client connected` for that lobby's `gameID`, with
   `anyClientJoined: true`, logged **about 30 minutes after the last person left** (more than 30 min, and not much
   more — the server checks about once a second; allow a minute or two for log delivery). `idleMs` is just over
   1 800 000.
2. **The lobby is really gone:** after that line, trying to join the case-1 lobby (its code or link) gets the same
   result as any finished or missing game today. Record what the player sees.
3. **Case 3 passes:** after 30+ minutes connected, the occupied lobby is still open and joinable, and **no**
   `private lobby ended` line exists for its `gameID`.
4. **Case 2 (if run):** the line shows `anyClientJoined: false`, about 30 minutes after creation.
5. **No collateral:** in the same window, public lobbies and started private games behave as before — no
   `private lobby ended` line for a public or a started game's `gameID`. (Singleplayer `create_game` games that nobody
   joined may show the line — expected, see *Context*.)
6. Record in this task's `worklog.md`: deploy date, each case's times, the log lines (no player ids, no endpoints or
   credentials), and the outcome. If any case fails, say which and file a fix task; do not reopen `0377`.

## Notes

- **Depends on:** [`0377`](../../done/0377-end-abandoned-unstarted-private-lobbies-after-a-short-idle-time-not-3-hours/brief.md)
  committed and deployed to the game server.
- **Blocks:** `0428` (turning private lobbies on for everyone). 📌 *2026-10-09 — OWNER RULING 2026-10-09, given live via `AskUserQuestion` in the coordinating Claude Code session, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent: "Yes, 0390 must pass first (Recommended)". Release-gate item 4 in `0354` now needs this live pass, not just `0377` built.* ~~nothing.~~ It does **not** block Sprint 7's deploy (owner's build/verify-split rule, 2026-09-29).
- **Related:** [`0376`](../0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md)
  (live check of private lobbies on Yandex) — both need a private lobby on the deployed build, so they can share one
  session; neither depends on the other.
- **Timing:** Uptrace keeps server logs about 14 days in practice
  ([`0259`](../../done/0259-investigate-uptrace-retention-not-applied/brief.md)); read the log well inside that.
- No secrets in this task's record: no connection strings, endpoints, or player ids.
