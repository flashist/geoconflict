# Closing the host window before the private lobby exists leaves the player connected to a public lobby

## ID
0333

> ℹ️ **ID allocation, checked 2026-09-28 before filing.** Highest ID on all three boards (folder names): `0332`.
> `0333`–`0335` were allocated in sequence for three briefs filed together (this one, `0334`, `0335`). **`0333`:**
> no task folder, no hit under `ai-agents/tasks/` or `ai-agents/sprints/`.

## Sprint
Sprint 7

## Priority
10

> 📌 **2026-09-29 — rank 8 → 10.** Shifted down two by an OWNER-RULED placement that put `0339` + `0340` directly below `0337` on the [Sprint 7 board](../../../sprints/plan-sprint-7.md) (relayed by `fkit-lead`; see that board's 2026-09-29 `0339`/`0340` addendum). Not a merit change for this task.

> 📌 **2026-09-29 — rank 7 → 8.** Shifted down one by an OWNER-RULED re-rank that put `0337` on top of the [Sprint 7 board](../../../sprints/plan-sprint-7.md) (relayed by `fkit-lead`; see that board's 2026-09-29 addendum). Not a merit change for this task.

⚠️ **Priority 7 is append rank, NOT a merit ranking — flagged for owner confirmation.** The **placement** is
owner-ruled (end of the next sprint, 2026-09-28 — see *Context*); the number is this board's highest (6,
`0332`) plus one. No row was moved or renumbered (ADR-035).
**On merit this belongs directly below `0221` (i.e. above `0323`)**, because it is a small, client-only fix
that can start as soon as `0327` ships, while `0323` and `0332` both wait on Sprint 6 work (`0322`, `0325`).

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

### Authority — filed on an owner ruling

**Filed 2026-09-28 by a spawned `fkit-producer` holding no owner channel, on an OWNER RULING given live via
`AskUserQuestion` in the `fkit lead` session and relayed by `fkit-lead` (ADR-021/037). ⛔ Not producer
precedent.** The question was `0327`'s round-1 review finding **R2**. Owner's words, verbatim:
*"Record as a known bug, put it to the end of the next sprint. Create a brief for that."*

- **This is a known bug**, accepted in `0327` and **not fixed there**. "Next sprint" is read as Sprint 7, the
  sprint after the active Sprint 6.
- Source: [`0327` review ledger](../../done/0327-closing-a-joined-private-lobby-window-does-not-leave-the-lobby/review.md),
  finding **R2** (severity low).

### The bug, in plain terms

A player is waiting in a **public** lobby. They click **Create lobby**, then close the host window before the
private lobby exists (about one create round-trip). They stay connected to the public lobby, but the screen
shows them out of it — so they can be pulled into that public match without expecting it.

- `Main.ts` opens the host window and then immediately clears the public-lobby highlight (around
  `src/client/Main.ts:529-530`). That clear only changes the UI (`PublicLobby.leaveLobby()`, around
  `src/client/PublicLobby.ts:269-272`); it does **not** disconnect.
- Before `0327`, the private `join-lobby` that followed `createLobby` is what stopped the public connection
  (`Main.ts`, the `gameStop` stop in `handleJoinLobby`, around `:742-745`).
- `0327` added a guard: if the window closed while `createLobby` was pending, do not join (around
  `src/client/HostLobbyModal.ts:636-641`). Correct for the private lobby — but now there is **no join and no
  leave** (`hasJoinedLobby` is false), so nothing stops the public connection.
- **The same state was already reachable before `0327`** when `createLobby` fails: no join happens, so the
  public connection also stays live. This task covers both routes.

⚠️ Line numbers are from the working tree on 2026-09-28, with `0327`'s changes not yet committed. They will
drift — find the code by name.

### How often

Reasoned from code in the review; **not reproduced live, and not probed** (unlike R1). The window is one
create round-trip, and in production only citizens can create a lobby (`0302`), so it is rare. The consequence
when it does happen is a player-visible surprise: joining a match they thought they had left.

## What to build

1. **Confirm it first.** Locally (`npm run dev`), join a public lobby, click Create, close the host window
   before the lobby is created (a throttled network or a delayed create response makes the window wide enough),
   and record whether the public connection is still live and whether the player is pulled into the public
   match. Do the same with `createLobby` failing. Record both in the worklog. **If it does not reproduce, say so
   plainly and stop** — do not fix what the code already prevents.
2. **Fix it so the screen and the connection agree.** After the host window closes — before the private lobby
   exists, or after `createLobby` failed — the player must not still be connected to the public lobby while the
   screen shows them out of it. The plan decides where the public leave belongs (for example, at Create tap, or
   on the early close / failure path). Constraints:
   - Exactly one leave; no spurious leave for a player who was never in a public lobby.
   - Do not break `0327`'s behaviour: a close after the private lobby was joined still sends exactly one
     private `leave-lobby`, and the "do not join a lobby nobody is looking at" guard stays.
   - Do not touch the orphan-lobby leftover (the private lobby created on the server but never joined) — that
     is case 3 of [`0335`](../0335-investigate-four-known-lobby-close-leftovers-left-by-0327/brief.md).
3. **Tests** that fail on today's code and pass after, for both routes (close before create answers; create
   fails), plus one proving no spurious leave when the player was not in a public lobby.

**Out of scope:**
- `0228`'s `handleJoinLobby` race on the same `gameStop` seam — do not fold it in.
- `0252`'s wider in-page-leave leaks. **Do not edit `src/client/Transport.ts`**; it is `0252`'s.
- The Start-during-save bug — that is [`0334`](../0334-host-start-still-sends-start-game-after-the-window-closed-during-the-settings-save/brief.md).

## Verification steps

- Worklog records step 1's local result for both routes (still connected: yes/no; pulled in: yes/no) **before**
  the fix, and again **after** (not connected, not pulled in).
- New tests **fail on the current code** and **pass** with the fix. Record both runs.
- `0327`'s tests (`tests/client/HostLobbyModalLeave.test.ts`, `tests/client/JoinPrivateLobbyModalLeave.test.ts`)
  still pass.
- `npm run lint` clean.
- Full `npm test`; if a known `supertest` flake appears, follow the CLAUDE.md flake procedure and say that you
  re-ran.

## Notes

- **Depends on:** `0327` (this fixes a gap in `0327`'s new `createLobby` guard; build on its shipped code)
- **Blocks:** nothing
- **Related:** `0327` (source — review R2), `0228` (same `gameStop` seam — do not fold in), `0334` (same file,
  `HostLobbyModal.ts`, no logical dependency — if both are built at once, sequence the edits), `0335` (case 3,
  the orphan lobby, comes from the same early-close window but is a different consequence), `0302` (only
  citizens can create, which limits reach).
- Client-only change expected (`HostLobbyModal.ts` and/or `Main.ts`). No `src/core/` change expected.
