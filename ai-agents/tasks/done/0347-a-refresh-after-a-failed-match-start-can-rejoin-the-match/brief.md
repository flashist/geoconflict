# A refresh after a failed match start can rejoin the match — save the reconnect session before the worker starts

## ID
0347

> ℹ️ **ID allocation, checked 2026-09-29 before filing.** Highest ID on all three boards (folder names): `0346`.
> `0347`, `0348`, `0349`, `0350` allocated in one run, in order; each has no task folder, no `## ID` hit, and no
> hit anywhere under `.claude/` or `ai-agents/`.

## Sprint
Sprint 7

## Priority
22 — append rank. ⚠️ **By owner ruling this task is Sprint 7's TOP priority, whatever this number says** (see
Context). The number is only where ADR-035 lets a new row land.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**Filed 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on OWNER RULINGS given live
in the `fkit lead` session on 2026-09-29, relayed by `fkit-lead`.** ⛔ Not producer precedent.

- **R1 — the owner's own words, verbatim:** *"I think I spotted a real bug: the reconnect (restore) connection
  doesn't work anymore after connecting to a match > having error during connection > refreshing the page. This is
  worth its own brief and the brief should go to the top of the Sprint 7"*.
- **R2 — `AskUserQuestion` "What should the Sprint 7 reconnect task cover?"** → **"Rejoin + fix the timeout
  (Recommended)"** — *"Save 'remember this match' earlier, so a refresh can rejoin even if the start failed. Also
  fix 0035 (give the worker the map the page already loaded, and/or a longer limit), so start failures happen less.
  Removes the main cause."*

**How R2 was split (producer's call, flagged for the owner).** R2 is three independently shippable pieces, so it
is three tasks on Sprint 7, worked in this order:
1. **This task (`0347`)** — the rejoin: a refresh after a failed start offers Rejoin. This is the bug the owner saw.
2. [`0348`](../0348-worker-start-failures-report-the-real-error-wait-longer-and-stop-the-leftover-worker/brief.md)
   — worker start failures: report a real crash as a crash (today it looks like "timeout"), wait longer than 5 s,
   and stop the left-over worker. Small; carved out of `0035`'s Option B.
3. [`0035`](../0035-worker-init-timeout-map-refetch/brief.md) — give the worker the map the page already loaded
   (its Option A), pulled in from the old sprint-backlog board.

### What the coder found — `fkit-coder`'s reading, read-only, 2026-09-29 (evidence, not verified by the producer)

- **Not a regression from the 2026-09-29 deploy.** The restore path (`ClientGameRunner.ts`, `ReconnectSession.ts`,
  `ReconnectModal.ts`, `Transport.ts`) is byte-identical to 0.0.154 (`git diff 5b3e6ec HEAD` on those files is
  empty). The gap has existed since commit `026701c` (2026-03-07).
- **Mechanism.** `saveReconnectSession(gameID, clientID)` (localStorage key `reconnect-session`) has **one** caller,
  `ClientGameRunner.ts:741-743`. It is reached only after the worker starts successfully (`:342-358`), the runner
  starts (`:228`), and the server's `start` arrives. A worker start failure returns early (`:346-358`) → **nothing
  is saved** → a refresh has nothing to restore.
- **The restore path itself works:** on load, `Main.ts:601-605` → `checkReconnectSession()`
  (`ReconnectSession.ts:36-60`) → `/api/game/<id>/active` (`Master.ts:706` → `Worker.ts:331`; "active" only while
  the game has started and not ended, `GameServer.ts:1073-1075`) → the `ReconnectModal` popup with a **Rejoin
  button** (a click, not automatic) → `join-lobby` with the saved clientID and `isReconnect: true`; the server
  matches clientID + persistentID (`GameServer.ts:260-274`; persistentID from the play token or cookie,
  `Main.ts:1114-1125`).
- **Ruled out as causes:** `0322`'s approved-name swap (identity is clientID + persistentID, `GameServer.ts:283-294`);
  `0307`, `0302`, `0325`, `0250`, `0331`, `0303`, `0321` are not on this path.
- **The owner's trigger:** "Worker initialization timeout" (game id `FVgxfTRH`) with DevTools "Disable cache" on.
  Plausible because the worker downloads the map again itself and has a hard 5 s limit — that is `0348` / `0035`.
- ⚠️ **Caveat:** after a worker failure the socket **stays connected**, so the player may still be in the server's
  list when they refresh.

### Related, not a dependency

- [`0256`](../../backlog/0256-clear-reconnect-session-on-server-kick-error-path/brief.md) (Backlog board) — a server kick
  leaves `reconnect-session` behind, so the next load offers Rejoin to a game the server refuses. **Saving the
  session earlier widens the window where that stale entry can exist.** This task must not make `0256` worse on
  the paths it touches; it does not have to fix `0256`.
- Wiki: `ai-agents/wiki-vault/wiki/features/reconnection.md` — explicit exit must never show the prompt; a player
  eliminated while away must never be reconnected; the normal start flow must be unchanged.

## What to build

- **Save `reconnect-session` as soon as the server's `start` reaches the lobby handler** (`ClientGameRunner.ts`
  ~`:201-218`), **before** the worker is built — for multiplayer games only (keep today's `!transport.isLocal`
  guard). The later save at `:741-743` may stay or go; the plan decides.
- **Design point the plan must settle — a restore can hit the same failing start again.** Rejoin runs the same
  worker start. If it fails again, the session must still be saved (so another refresh can try again), and nothing
  may loop without a player click (today the popup needs a click — keep it that way). Say in the plan what the
  player sees on a second failure.
- **Keep everything that clears the session working as today:** explicit exit, game over, `/active` → `false`.
  Check each error path that now runs with a saved session (the worker-failure error modal, server error/kick) and
  state whether it should keep or clear it. The worker-failure modal tells the player to refresh — that path
  **must keep** the session; that is the whole point.
- **Server side:** confirm the server accepts a rejoin from a player whose first attempt never got past the worker
  start (the old socket may still be open — see the caveat above). If it does not, say so before building.
- **Analytics:** the existing `Reconnect:*` funnel should still tell the truth. If an event is added or changed,
  update `ai-agents/knowledge-base/analytics-event-reference.md` in the same change.
- Any text the player sees goes through `translateText`, in both `en.json` and `ru.json`.

## Verification steps

Repro steps are the coder's; DevTools on a multiplayer public match.

1. **A — baseline:** join a match normally, refresh mid-match → the Rejoin popup appears → Rejoin puts you back in
   the same match. Same as before the change.
2. **B — the owner's case:** DevTools "Disable cache" + "Slow 4G" (or any way to force a worker start failure —
   after `0348` raises the limit, a forced worker error may be easier than a slow network) → the start fails →
   `reconnect-session` **is now present** in localStorage → refresh → the popup appears → turn throttling off →
   Rejoin → you play the same match.
3. **C — non-regression proof:** repeat B on a worktree at 0.0.154 (`5b3e6ec`) and record that no popup appears
   there — i.e. the gap is old, the fix is new.
4. **Second failure:** in B, keep throttling on for the Rejoin → it fails again → the session is still saved →
   another refresh offers Rejoin again; nothing retries by itself.
5. **Explicit exit** still leaves no session; a finished match still shows no popup (`/active` → `false`).
6. Single-player / local games never save a session.
7. `npm test` and `npm run lint` pass. A unit test covers "session saved on `start`, before the worker starts".

## Notes

- **Depends on: nothing.**
- **Blocks:** nothing. Works alone; `0348` and `0035` make the failure rarer, this task makes it recoverable.
- **Order in Sprint 7:** `0347` → `0348` → `0035`. `0347` first because it is the owner's bug and the player-facing
  fix; it needs neither of the others.
- **Build vs verify (owner ruling 2026-09-29):** the proof above is local, so no verify task is filed now. If the
  owner wants proof in production after the deploy, that is a separate verify task at the top of the next sprint.
- ⚠️ **Open owner question:** Sprint 7 already has an owner-ruled top task, `0337` (verify `0331` in production,
  ruled 2026-09-29, earlier the same day). Which goes first was not ruled. Producer's reading: they do not compete —
  `0337` is an owner-run check after the deploy, `0347` is coder work — so both can go first. Owner to confirm.
- ✅ **ANSWERED 2026-09-29 — the open question above is settled (kept as written, ADR-035).** OWNER RULING given live 2026-09-29 in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. **Q1** (which goes first, `0347` or `0337` — both ruled *"top of Sprint 7"*) → **"Either, run in parallel (Recommended)"** — *"They don't compete. 0337 is your own check and 0347 is coder work, so both can go first at the same time."* So `0347` and `0337` both start first, side by side; neither waits on the other.
- ✅ **Split CONFIRMED 2026-09-29.** OWNER RULING given live 2026-09-29 in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. **Q2** (keep the producer's three-way split of the reconnect work?) → **"Keep 3 tasks (Recommended)"** — `0347` rejoin, `0348` worker-failure handling, `0035` reuse the map; **`0347` first**. The *"producer's call, flagged for the owner"* in § Context is now owner-ruled; that text is kept as written. No scope changed.
