# Verify 0509 live: the Telegram feedback message shows the player's Yandex id, and the guest marker

## ID
0518

> ℹ️ **ID allocation, checked 2026-10-28 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (`## ID` fields and folder names agree, base-10 arithmetic) was `0517`. `0518`: no task folder and no reference in
> `ai-agents/tasks/` or `ai-agents/sprints/`.

## Sprint
Sprint 9

> 📌 **Filed 2026-10-28 on an OWNER RULING**, given via `AskUserQuestion` in the `fkit-lead` session (driving
> `/fkit-sprint-ship-loop`) and relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037). ⛔ Not
> producer precedent. Asked *"Where should the two live-check tasks (0509 Telegram id, 0515 no HvN in public) go?"* →
> **"Sprint 9, at the end (Recommended)"** — option text: *"Like 0511/0512/0513. Knock-on: Sprint 9 can't close until
> the game deploy happens or they move on. Nothing else waits on them."* This overrides the standing next-sprint verify
> rule (2026-09-29) for this task, as with `0513`. No Sprint 10 exists. If the game deploy misses Sprint 9, this task
> cannot close in Sprint 9.

## Priority
43

> ⚠️ Priority 43 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0513`**, because it checks the same next game deploy and is the same kind of
> owner-run live check, so the owner can batch the sessions. Appended after the board's highest rank (42), never
> inserted (ADR-035); no row renumbered.

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

Live check of [`0509`](../../done/0509-add-the-players-stable-id-to-the-in-game-feedback-message-that-reaches-telegram/brief.md)
(closed 2026-10-28, agent-closed — not owner-verified), split out at its close per the build-vs-verify rule (its
verification step 5). `0509` adds a labelled `Player:` line to the in-game feedback message that reaches Telegram (and
the webhook, if one is ever set). By owner ruling 2026-10-28 (*"Raw Yandex id"*) the line carries the player's **raw
Yandex id**, sent by the client and labelled *"client-reported, unverified"*: a lead, not proof (the `0424` "never an
automatic merge" rule).

What the `Player:` line can say (from `0509`'s build, `src/server/Master.ts`):

| Case | Shown |
|---|---|
| Logged in, id read | `Yandex id <the id, in code font> (client-reported, unverified)` |
| Guest | `none — not logged in (guest)` |
| Logged in, but the id failed the client check (printable ASCII, no spaces, 1–128 characters) or could not be read | `none — logged in, but the id could not be read` |
| No field sent (a game client from before `0509`) | `none — not sent (older game client)` |

- **Entry gate:** the game deploy that ships `0509` is live. There is no separate deploy task.
- ⚠️ **Held-deploy caveat (from the `0509` close, 2026-10-28).** `0509` is not committed and not deployed. Any game
  deploy from `dev` also ships the held `0488`/`0494`/`0495` client code. Which deploy carries `0509`, and with what, is
  a deploy-time owner choice; weekend slot unless urgent (owner rule). Committed is not deployed.
- **Who does what:** owned by the producer; **the owner runs every live step** (sending the feedback, reading Telegram,
  the optional database lookup). An agent may run read-only checks only where the owner allows it.

## What to build

Nothing. Owner-run live checks, recorded in this folder's `worklog.md`.

## Verification steps

1. **Deployed version.** Record the game version that is live (the in-game version string) and that it is the deploy
   carrying `0509`.
2. **Logged in.** On a fresh load of that version, logged in with the owner's test account, the owner sends one in-game
   feedback. The Telegram message has a `Player:` line reading `Yandex id <id> (client-reported, unverified)`, with the
   id in code font.
3. **Guest.** On a fresh load, not logged in, the owner sends one in-game feedback. The `Player:` line reads
   `none — not logged in (guest)`.
4. **Watch for the failure shapes on step 2:**
   - `none — logged in, but the id could not be read` for a logged-in player: real Yandex ids may fail the 1–128
     printable-ASCII pattern (or the SDK returned no id). Record it and do not pass the task; it goes back to the
     owner as a new decision.
   - `none — not sent (older game client)`: the page was still the old build (cache, or the deploy not live). Reload
     and repeat before judging.
5. **Optional: the id maps to the right record.** The owner runs the read-only query from
   [`0509`'s worklog](../../done/0509-add-the-players-stable-id-to-the-in-game-feedback-message-that-reaches-telegram/worklog.md)
   (*Read-only lookup*) at a `psql` prompt on the profile database, pasting the id at the prompt (`\set yandex_id
   '<paste>'`), **never into any tracked file**. Pass: exactly one `player_id` row, the owner's test account's record.
6. **Nothing extra leaked (spot check).** The Telegram message carries no session token or other secret, and no id
   appears in the analytics requests of that session (network tab). Not required if the owner skips it; record which.
7. The worklog records the date, the deployed version, each result and the owner's words. **No player ids, no test
   account names, no player names**, no connection strings, endpoints or keys. Write "the owner's test account" and
   "the id matched one record", never the id itself.

## Notes

- **Depends on:** 0509 — plus the game deploy that ships it (not a task)
- **Blocks:** nothing
- **Ships by:** nothing ships; it follows the game deploy that carries `0509`.
- **Related:** `0519` (live check of `0515`, same deploy; the owner may batch the sessions), `0513` (same deploy),
  `0502` / `0507` (the incident this helps with next time), ADR-113 (the clarification note at `0509`'s close is
  `fkit-architect`'s, not this task's).
- ⚠️ **Stated, not resolved:** `0516`'s brief describes *"the 2026-10-27 purchase and rewarded-ad deploys"*, and
  production moved to `0.0.167` on 2026-10-27. If that deploy already carried `0488`/`0494`/`0495`, the held-deploy
  caveat above is out of date. The producer did not check what `0.0.167` contains; the owner confirms at deploy time.
- **Personal data:** the raw Yandex id in Telegram is an owner-accepted residual (`0509`'s review ledger); this task
  does not re-open it.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
- **No secrets, no personal data** in this folder.
