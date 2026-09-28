# Host Start still sends `start_game` after the host window was closed during the settings save

## ID
0334

> ℹ️ **ID allocation, checked 2026-09-28 before filing.** Allocated second of three in sequence (`0333`–`0335`)
> after a highest ID of `0332`. **`0334`:** no task folder, no hit under `ai-agents/tasks/` or
> `ai-agents/sprints/`. (An unrelated `0334` appears in the installed fkit share's
> `.claude/skills/fkit-status/throughput.mjs` — that is fkit's own upstream numbering, not a task here.)

## Sprint
Sprint 7

## Priority
8

⚠️ **Priority 8 is append rank, NOT a merit ranking — flagged for owner confirmation.** The **placement** is
owner-ruled (end of the next sprint, 2026-09-28 — see *Context*); the number is this board's highest (7,
`0333`) plus one. No row was moved or renumbered (ADR-035).
**On merit this belongs directly below `0333`** (so, like it, above `0323`), because it is the same size and
kind — a small client-only fix startable once `0327` ships — and the owner ruled the two in this order.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

### Authority — filed on an owner ruling

**Filed 2026-09-28 by a spawned `fkit-producer` holding no owner channel, on an OWNER RULING given live via
`AskUserQuestion` in the `fkit lead` session and relayed by `fkit-lead` (ADR-021/037). ⛔ Not producer
precedent.** The question was `0327`'s round-1 review finding **R1**. Owner's words, verbatim:
*"Create a brief, add it to the end of the next sprint."*

- "Next sprint" is read as Sprint 7, the sprint after the active Sprint 6.
- Source: [`0327` review ledger](../../done/0327-closing-a-joined-private-lobby-window-does-not-leave-the-lobby/review.md),
  finding **R1** (severity low; raised by both reviewers).

### The bug, in plain terms

The host presses **Start**, then closes the host window while the lobby settings are still being saved. The
close makes the host leave the lobby (that is `0327`'s fix), but the Start carries on and still asks the server
to start the match.

- `attemptStart` checks that the window is still the same opening only **once, right after the ad** (around
  `src/client/HostLobbyModal.ts:901`).
- After that it waits on the settings save (`putGameConfig()`, around `:914`) and on
  `getServerConfigFromClient()`, then POSTs `start_game` (around `:928`) with no further check.
- **Measured** by the reviewer with a scratch probe: `start_game POSTed after close: true`.
- **Result on the server** (reasoned from code, not observed):
  - if the host's socket close lands first, a **silent 403** (nobody sees it — the window is gone);
  - if not, or when the citizen gate is bypassed (dev), **the friends are started into a match without the
    host**.
- Before `0327` the host stayed connected, so they were pulled into the match. `0327` made the leave real,
  which is what exposed this gap.

⚠️ Line numbers are from the working tree on 2026-09-28, with `0327`'s changes not yet committed. They will
drift — find the code by name.

### Suggested fix (from the review — a direction, not a design)

Re-check that the window is still open (the same opening) **after each await that follows the ad**, and before
the POST. The plan decides the exact shape.

## What to build

1. **Stop the Start once the window is closed.** If the host window closes (or reopens on a new lobby) at any
   point after the ad — during the settings save, during the server-config fetch — no `start_game` is sent. Cover
   every await between the ad and the POST, not only the save.
2. **Keep the normal path working.** With the window open throughout, Start still saves the settings, sends
   `start_game` once, and closes on success; a failed save or start still shows the failure line (tasks `0302`,
   the R4 ruling recorded in the code comment).
3. **Tests** that fail on today's code and pass after: close while `putGameConfig()` is pending → no
   `start_game`; close while `getServerConfigFromClient()` is pending → no `start_game`; window kept open →
   exactly one `start_game`.

**Out of scope:**
- `isStarting` staying true after a successful Start until the next `open()` — that is case 4 of
  [`0335`](../0335-investigate-four-known-lobby-close-leftovers-left-by-0327/brief.md). Do not change it here
  unless the plan shows this fix cannot avoid touching it; if so, say so and return it to the owner.
- Any server-side change (ending the lobby for everyone, a server-side cancel).
- The public-lobby early-close bug — that is [`0333`](../0333-closing-the-host-window-before-the-private-lobby-exists-leaves-the-player-in-a-public-lobby/brief.md).

## Verification steps

- New tests **fail on the current code** and **pass** with the fix. Record both runs.
- `0327`'s tests (`tests/client/HostLobbyModalLeave.test.ts`) and the existing host-Start tests still pass.
- Locally (`npm run dev`, two browser windows, a citizen host or the dev path): host a lobby with a friend,
  press Start, close the window while the save is in flight (throttle the network to widen it). Record: no
  `start_game` request sent, and the friend is not started into a match. Record the result in the worklog; if it
  cannot be widened enough to test live, say so and rely on the tests.
- `npm run lint` clean.
- Full `npm test`; if a known `supertest` flake appears, follow the CLAUDE.md flake procedure and say that you
  re-ran.

## Notes

- **Depends on:** `0327` (this closes a gap in `0327`'s host-close path; build on its shipped code)
- **Blocks:** nothing
- **Related:** `0327` (source — review R1), `0302` (Start's failure line and the citizen-only 403), `0333`
  (same file, `HostLobbyModal.ts`, no logical dependency — if both are built at once, sequence the edits),
  `0335` (case 4, `isStarting`, lives in the same Start function).
- Client-only change expected (`HostLobbyModal.ts`). No `src/core/` change expected.
