# Lobby windows end their "joining a lobby" mark when they close, not only when their request settles

## ID
0374

> ℹ️ **ID allocation, checked 2026-10-02 before filing.** Highest existing ID `0373`, by both the briefs'
> `## ID` fields and the folder prefixes across `ai-agents/tasks/{backlog,done,cancelled}/`. **`0374`:** no task
> folder, and no hit under `ai-agents/tasks/`, `ai-agents/sprints/`, `ai-agents/knowledge-base/` or `.claude/`.

## Sprint
Backlog

## Priority
Unscheduled

> ⚠️ **Placement is NOT owner-ruled — flagged for owner placement.** The owner ruled *"file one small task"* and
> named no sprint, so this sits on the Backlog board. **Not for this weekend's deploy.** On merit it is
> low priority (see *Impact*): a natural home is any sprint that next touches the start-screen popups, after
> `0336`'s gate.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

### Authority — filed on an owner ruling

**Filed 2026-10-02 by a spawned `fkit-producer` holding no owner channel, on an OWNER RULING given live via
`AskUserQuestion` in the `fkit lead` session and relayed by `fkit-lead` (ADR-021/037). ⛔ Not producer
precedent.** Owner's answer: **"File one small task (Recommended)"** — one task for findings **R1** and **R2**.

Source: the deploy-readiness review of 2026-10-02 — an **ephemeral** `/fkit-review` run by a spawned
`fkit-reviewer` over the range `0.0.155..8a7f8c5` (no ledger file exists; the findings live only in that
review's report, as relayed). R1 and R2 came from its Codex second opinion; the reviewer verified both
**CORRECT**, severity **low**.

### What `0336` built, and the gap it left

`0336` (done) stopped the one-time **tenure gift popup** (`tenure-grant-modal`) from opening over a lobby or a
match. Its gate lives in `src/client/StartScreenPresence.ts` and is used by `PreStartModals.ts`: the popup
waits (`whenOnStartScreen()`) while the player is *away* — in a lobby or match, **or** while a join is being set
up. A join being set up is a counted mark: `beginJoiningLobby()` adds one and returns an end function; the
popup cannot open while any mark is held.

Two windows take a mark while their network request runs:

- **R1 — `src/client/HostLobbyModal.ts:640`** (`open()`): the host window takes the mark while it **creates the
  private lobby**, and ends it only when the create request **settles** (`joined.catch(() => {}).finally(endJoining)`,
  ~:664). Closing the window does not end it.
- **R2 — `src/client/JoinPrivateLobbyModal.ts:224`** (`joinLobby()`): the join window takes the mark while it
  **looks the lobby up** (active, then archived), and ends it only in the `finally` (~:252) — i.e. when the
  lookup settles. Closing the window does not end it.

So if either request **hangs** and the player closes the window, they are back on the start screen but the mark
is still held: the gift popup keeps waiting until the request finally fails. `fetch` has no timeout of its own,
so how long that is depends on the browser and network — **not measured**.

Both windows already track closes: `HostLobbyModal` bumps `openGeneration` in `open()` and `reset()` (~:628,
~:698); `JoinPrivateLobbyModal` bumps `closeGeneration` on close (~:173) and checks it with `isClosedSince()`.
Line numbers are as of `8a7f8c5` — re-read before relying on them.

### Impact

Low. Only **delays** the tenure popup when a request hangs and the player closes the window. Nothing is lost
(the gift is already granted; the popup is a thank-you), and no player is blocked from playing.

## What to build

**Expected behaviour:** when the host window or the join window **closes** (any close: ✕, click outside,
Escape, or a programmatic close) while its create / lookup request is still running, that window's joining
mark **ends at the close**. A late settle of the old request afterwards must do nothing to the count (the end
function is already one-shot — keep it that way).

- **Preferred: end the mark on close.** It is the direct fix for both findings and needs no timer.
- **Bounding the wait (a timeout on the mark) is acceptable only as an addition, not instead.** ⚠️ A bound
  alone is **not** enough and can break `0336`: if the request hangs while the window is **still open**, a
  timeout would end the mark and let the popup open **over the open lobby window** — the exact thing `0336`
  stopped. If the coder's plan adds a bound, it must not release the mark while the window is open.
- **Must keep `0336`'s intent:** the popup never opens over a lobby window or a match. In particular, on a
  **successful** create / lookup, Main's own join mark must already be held before this window's mark ends
  (today's comments at both sites say so) — no gap in which the count reaches zero.
- **Reopen while the first request is still running** (host window): the first opening's mark ends on its close;
  the second opening holds its own mark. The two must not end each other's.
- Do not change `StartScreenPresence.ts`'s public meaning unless the plan shows it is needed.
- `src/client/` only. No server, profile or `src/core/` change expected.

## Verification steps

Unit tests (jest; existing neighbours: `tests/client/StartScreenPresence.test.ts`,
`HostLobbyModalLeave.test.ts`, `HostLobbyOpen.test.ts`, `JoinPrivateLobbyModalLeave.test.ts`,
`PreStartModals.test.ts`). Use a request that **never settles** (a pending promise you control) to model the hang.

1. **R1, close while create hangs:** open the host window, close it before create settles → a pending
   `whenOnStartScreen()` resolves (the popup may open). Then settle the create (success and failure, both) →
   the joining count does not go negative and no `join-lobby` is sent.
2. **R2, close while lookup hangs:** start a lookup, close the join window before it settles → `whenOnStartScreen()`
   resolves. Then settle the lookup (found, not found, error) → no double end, no `join-lobby` sent.
3. **Still open, request hangs:** with the window open and the request pending, `whenOnStartScreen()` stays
   pending (the popup does not open over the open window). If a time bound was added, this holds past it.
4. **Success path, no gap:** create / lookup succeeds → Main's join mark is held before the window's mark ends;
   at no point in between does `whenOnStartScreen()` resolve.
5. **Host reopen race:** open → close → open again while the first create is still pending → the first mark ends
   at the first close; the second stays held until its own close or settle; settling the first create afterwards
   does not end the second mark.
6. **Programmatic close** (a successful Start / the match-start close list) behaves like a user close for the
   mark, and does not let the popup open over the match (Main's mark covers it).
7. `npm test` and `npm run lint` pass. (For a supertest-shaped flake, see `CLAUDE.md` § *Known flake* — re-run
   and say so.)

**Live check (optional, owner):** none required — the hang is hard to produce by hand, and the impact is a
delay. Say in the worklog that the fix is unit-tested only.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Related:** `0336` (done) — built the gate this fixes; read its brief and worklog for the design.
  `0329` (done) — the presence module's origin. `0333` / `0327` — the host window's leave/close handling.
- **One task, not two — owner-ruled.** R1 and R2 are the same pattern in two windows, share one module and one
  test file family, and are each a few lines; the owner ruled one task. A coder may still ship them as two
  commits.
- **Not for this weekend** (owner, 2026-10-02).
- No secrets, no analytics change, no localization change expected.
