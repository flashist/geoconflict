# After leaving a started match, the public-lobby card stays stuck on the old lobby

## ID
0352

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-30 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live
in the `fkit lead` session via `AskUserQuestion` on 2026-09-30, relayed by `fkit-lead`** (driving
`/fkit-sprint-ship-loop`). ⛔ Not producer precedent. The owner's answer: *"File a backlog task"*.

**What was seen.** Found live during [`0035`](../../done/0035-worker-init-timeout-map-refetch/brief.md)'s Verify
step on 2026-09-30 (local dev, headless browser; evidence: 0035 `worklog.md` § *Verify*, live check 4). After
**leaving a match that had already started** (a hash-change leave; the verifier tested public, singleplayer Normal
and singleplayer Compact), the player is back on the start screen, but the **public-lobby card stays on the old,
already-started lobby** — its countdown reads `0s` — and **clicking it does nothing**. The player cannot join the
next public match from that card.

**Pre-existing — not caused by `0347`, `0348` or `0035`.** Per the verifier, the files involved are not touched by
any of the three.

**Suspected cause — the verifier's reading, NOT yet re-verified.** `Main.ts` calls `publicLobby.stop()` when the
game starts (the lobby card stops polling for new lobbies), and `handleLeaveLobby` never restarts that polling, so
the card keeps showing the last lobby it knew about. A producer glance at the file is consistent with that (two
`stop()` calls in the join/start callbacks, none restarting in `handleLeaveLobby`), but the cause has not been
traced or reproduced by anyone other than the verifier.

**Open unknown — how many real players hit this.** In production, several match exits reload the page (see `0331`
/ `0273`: the exit keeps the query string across a reload), and a reload rebuilds the card from scratch. So the bug
may only bite the exit paths that do **not** reload (the verifier used a hash-change leave; Back may be another).
Which real exits reach this path is part of this task's first step, not assumed.

## What to build

1. **Confirm the cause** before changing anything: reproduce locally, and list which user-facing exits from a
   started match land on the start screen **without** a page reload (and so can show the stuck card).
2. **Fix:** after a leave that returns to the start screen without a reload, the public-lobby card shows the
   current public lobby again and clicking it joins that lobby. The coder's plan decides how (e.g. restart the
   card's polling on leave); keep it minimal.
3. **Do not change** leave-during-start behaviour from `0035` (worker stopped at once, no popup, no telemetry) or
   the reconnect behaviour from `0347`/`0348`.
4. Tests for the leave → card-refresh path (the project rule: tests for any changed behaviour).

## Verification steps

1. The worklog records the confirmed cause (or, if the verifier's reading was wrong, the real one) and the list of
   exits that reach it.
2. Live, local dev: start a public match, leave it by each exit from step 1 that does not reload → the card shows a
   current lobby (countdown not stuck at `0s`), and clicking it joins that lobby.
3. The same after leaving a singleplayer match.
4. `0035`'s leave-during-start check still passes (worker closed at once, no popup, no `Worker:InitFailed*`).
5. `npm test` and `npm run lint` green (known supertest flake: re-run and say so, per `CLAUDE.md`).

## Notes

- **Depends on:** nothing.
- **Blocks:** nothing.
- **Related:** `0035` (where it was found), `0347`/`0348` (same leave/reconnect area — not the cause), `0331`/`0273`
  (exits that reload the page).
- **Size:** small bug, one component.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
