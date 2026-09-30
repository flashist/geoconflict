# Closing a joined private lobby's window does not leave the lobby — confirm, then fix so closing leaves

## ID
0327

> ℹ️ **ID allocation, checked 2026-09-28 before filing.** Highest ID on all three boards (folder names
> and `## ID` fields agree): `0326`. **`0327`:** no task folder, no `## ID` hit, no hit under `.claude/`,
> `ai-agents/tasks/` or `ai-agents/sprints/`.

## Sprint
Sprint 6

> ➡️ **2026-09-28 — moved into Sprint 6 by OWNER RULING** (live via `AskUserQuestion` in the `fkit lead`
> session, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021/037; ⛔ not producer precedent).
> Verbatim: *"End of Sprint 6 (Recommended)"* — option text: *"Queued in the current sprint, medium
> priority; the loop reaches it after the tasks already queued."* Was ~~Backlog~~.

~~**Unscheduled.** The owner ruled that this be filed as its own task but named no sprint, so it sits on
the Backlog board. Pulling it into a sprint is a separate producer act (three edits; see
`/fkit-task-brief` step 8).~~ *(struck 2026-09-28 — pulled into Sprint 6, see above.)*

## Priority
39

> **39 is the append rank** — the bottom of the [Sprint 6 board](../../../sprints/done/plan-sprint-6.md), appended,
> never inserted (ADR-035). **Medium by owner ruling 2026-09-28** (see `## Sprint`). Was ~~Unscheduled~~.
> The producer reasoning below is kept (only its first sentence is struck); its *Medium* is now owner-ruled, and its *Low if step 1 does
> not reproduce* fallback is **not** — changing the rank after step 1 would need the owner.

~~Producer's rank if pulled in: **Medium** (not owner-ruled).~~ *(struck 2026-09-28 — superseded by the owner ruling above.)* `0303`'s review graded the finding **low**,
but it graded only the purchase-popup consequence. The other consequence — a player who closed the
window can later be **pulled into a match they thought they had left** — is a player-visible surprise,
if it is confirmed (step 1). If step 1 shows that pull-in cannot happen, **Low** is the right rank.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**Filed 2026-09-28 by a spawned `fkit-producer` with no owner channel (ADR-021), on an OWNER RULING given
live in the `fkit lead` session via `AskUserQuestion` and relayed by `fkit-lead` (ADR-021/037).** ⛔ Not
producer precedent.

- Question put to the owner: `0303` review finding **R1**.
- Owner's answer, verbatim: **"Accept in 0303, file bug (Recommended)"**. Option text, verbatim: *"No
  change to 0303; the 'closing doesn't leave' bug becomes its own task and is fixed where it belongs."*
- **This is that task.** `0303` is unchanged by it.

**The bug, in plain terms.** A player joins a friend's private lobby, then closes the lobby window (the
X, Escape, or a click outside). The window goes away, but the player **is still in the lobby**.

- `JoinPrivateLobbyModal.close()` (around `src/client/JoinPrivateLobbyModal.ts:124`) hides the window and
  stops the player-list poll. It sends **no `leave-lobby` event**.
- `closeAndLeave()` (around `:133`) is the only method that sends `leave-lobby`, and **nothing calls it**
  anywhere in `src/client`. It was already dead code before `0303`.
- So `Main.handleLeaveLobby()` (around `src/client/Main.ts:1011`) never runs. The client's `gameStop`
  stays set and the connection to the lobby stays open.

**Consequences (from the review; step 1 confirms each):**

1. **The player can later be pulled into the friend's match** when the host starts it, even though they
   closed the window. Reasoned from code, not yet observed.
2. **`0303`'s restart popup never shows** after a later purchase. The purchase offer sees "away from the
   start screen" and marks the grant pending; `onBackOnStartScreen()` (called from `handleLeaveLobby`)
   never runs, so it stays pending. The player gets the accepted "Later" behaviour, silently.
3. **Anything else keyed on "back on the start screen"** in `handleLeaveLobby` is skipped: the match-
   abandon log, performance-monitor stop, reconnect-session clear, gutter-ad hide, public-lobby leave,
   start-screen controls un-hide.

**Host side.** `HostLobbyModal.close()` (around `src/client/HostLobbyModal.ts:643`) has the same shape — no
`leave-lobby`. In production only citizens can host (task `0302`), so consequence 2 (a purchase) cannot
happen there. **Whether consequence 1 or 3 applies to a host is unknown** — the host is the one who starts
the match, so "pulled in" may not arise, but the open connection and skipped cleanup may. Step 1 checks.

**Source:** [`0303` review ledger](../../done/0303-the-whole-game-reflects-a-purchase-without-a-reload/review.md),
finding **R1** (raised by both reviewers). The review also notes `0303`'s plan wrongly claimed this path was
covered via `JoinPrivateLobbyModal.ts:138`.

⚠️ **Conflict with an existing brief — flagged, not fixed here.** [`0252`](../../backlog/0252-in-page-leave-wider-per-game-leak-renderer-transport-lobby-poll/brief.md)'s
route table lists *"Closing the private-lobby modal (`closeAndLeave`) … dispatches `leave-lobby` — Yes,
shipped — pre-start only"*. **Per R1 that row is wrong**: `closeAndLeave` has no caller, so that route is
not shipped today. This task, once it ships, is what makes it real. `0252`'s rank reasoning (b) leans on
that row. The producer should correct `0252`'s row (strike, don't delete) when this task closes, or
earlier if `0252` is pulled first.
> ✅ **Done 2026-09-28, earlier than planned, by OWNER RULING** (*"Fix it now (Recommended)"*): `0252`'s row
> is struck with a dated note. `0252`'s rank was left for the owner.

## What to build

1. **Confirm the behaviour first — read, then reproduce.**
   - Trace every way the join window closes (X, Escape, click outside, the hash-change reset in
     `Main.ts` `onHashUpdate`, any other `close()` caller) and whether any of them reaches `leave-lobby`.
     Note whether the modal element closing itself (Escape / outside click) even calls the component's
     `close()`.
   - Reproduce locally (`npm run dev`, two browser windows): join a private lobby, close the window,
     then have the host start the match. Record whether the closed-window player is pulled in.
   - Do the same for the **host** window: close it, and record what stays open and whether any
     consequence above applies.
   - Record findings in the worklog. **If a consequence does not reproduce, say so plainly** — do not
     fix a problem the code already prevents.
2. **Fix it so closing a joined lobby leaves it.** Every user-facing way of closing the join window
   after joining must end in exactly one `leave-lobby`, so `handleLeaveLobby` runs. Closing the window
   **before** joining must not send a spurious leave (today `handleLeaveLobby` early-returns on
   `gameStop === null`, but do not rely on that alone without checking). Either wire `closeAndLeave()`
   up or fold its behaviour into the close path — the plan decides; remove dead code either way.
   - Note a small existing bug to fix with it: `closeAndLeave()` reads `lobbyIdInput.value` for the
     event detail **after** `close()` has cleared it, so the detail is always empty. Check whether
     anything reads that detail before deciding what to send.
3. **Host side:** apply the same fix only if step 1 shows the host has a real gap. If it needs a
   different decision (e.g. should closing the host window cancel the lobby for everyone?), **stop and
   return it to the owner** rather than choosing.
4. **Tests** that fail on today's code and pass after: closing a joined join-window (each close route
   that is testable in jsdom) dispatches `leave-lobby` once; closing before joining does not; and a grant
   made while in the lobby shows `0303`'s restart offer once the window is closed.

**Out of scope:**
- The wider in-page-leave leaks (renderer, canvas, Transport listeners, public-lobby poll) — that is
  `0252`. **Do not edit `src/client/Transport.ts`**; it is `0252`'s.
- The `handleJoinLobby` stale-`gameStop` race across awaits — that is `0228`.
- Any change to `0303`'s popup logic. It should simply start working on this path.

## Verification steps

- Worklog records step 1's findings for **both** join and host windows: each close route, whether it
  reaches `leave-lobby`, and the local two-window reproduction result (pulled in: yes/no) **before** the
  fix, and again **after** the fix (not pulled in).
- New tests **fail on the current code** and **pass** with the fix. Record both runs.
- After the fix, locally: join a private lobby, close the window, confirm the host's player list drops
  the player, and confirm the start-screen controls are usable.
- After the fix, locally (or in a test if a live purchase is not practical): a grant made while in a
  joined private lobby shows `0303`'s restart popup when the window is closed.
- `npm run lint` clean.
- Full `npm test`; if a known `supertest` flake appears, follow the CLAUDE.md flake procedure and say
  that you re-ran.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Related:** `0303` (source — review R1; its restart popup starts working on this path once this ships),
  `0302` (only citizens can host, which limits the host-side consequence), `0252` (in-page-leave leaks; its
  route table wrongly lists this route as shipped — see *Context*; once this ships, the pre-start
  Transport-listener question `0252` raises becomes reachable through this route too), `0228`
  (`handleJoinLobby` race on the same `gameStop` seam — do not fold in).
- Client-only change expected (`JoinPrivateLobbyModal.ts`, maybe `HostLobbyModal.ts` and `Main.ts`). No
  `src/core/` change expected.
