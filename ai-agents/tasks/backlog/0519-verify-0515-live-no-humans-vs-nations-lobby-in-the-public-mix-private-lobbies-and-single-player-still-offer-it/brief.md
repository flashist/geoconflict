# Verify 0515 live: no Humans Vs Nations lobby in the public mix; private lobbies and single player still offer it

## ID
0519

> ℹ️ **ID allocation, checked 2026-10-28 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (`## ID` fields and folder names agree, base-10 arithmetic) was `0517`; `0518` allocated just before this brief, in
> sequence. `0519`: no task folder and no reference in `ai-agents/tasks/` or `ai-agents/sprints/`.

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
44

> ⚠️ Priority 44 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0518`** (where it sits), because both check the same next game deploy and
> the owner can run them in one session. Appended after the board's highest rank (43, `0518`, filed just before it),
> never inserted (ADR-035); no row renumbered.

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

Live check of [`0515`](../../done/0515-disable-the-humans-vs-nations-mode/brief.md) (being closed at the time of filing; once
it moves to `tasks/done/`, its mover repoints this link), split out at its close per the build-vs-verify rule (its
verification step 6).

What `0515` shipped — the owner-approved **"public mix only"** variant (owner choices 2026-10-28: *"Public mix only"*,
*"Hide (Recommended)"*, and typed *"Private lobbies are allowed for HvN"*):
- `HumansVsNations` removed from the public rotation list (`TEAM_COUNTS` in `src/server/MapPlaylist.ts`). The mode's code
  is kept, so turning it back on is a one-line list edit.
- **Not changed:** the private-lobby host picker and single player still offer it; the server still accepts it in a
  private lobby. The operator-only, admin-token public create route also still accepts it (only the master calls it
  today, with playlist configs).
- The lobby label to look for: **"Humans Vs Nations"** (en) / **"Люди Vs Нации"** (ru), text key
  `public_lobby.teams_hvn`.

**How often it used to appear, so "long enough" has a number.** In the public mix 2 of every 5 lobbies are Team lobbies,
and HvN was 1 of 7 Team settings: about **1 in 17 public lobbies**. Seeing no HvN in 50 public lobbies would happen by
chance under the old rotation only about 5 % of the time. A new public lobby opens about once a minute (the 1-minute
lobby window, task `0367`), so 50 lobbies is roughly an hour, not counting waits for players. Analytics (step 3) is the
cheaper way to cover days.

- **Entry gate:** the game deploy that ships `0515` is live (a game-server change; the deploy restarts the server, so
  no HvN public lobby from before it can survive). There is no separate deploy task.
- ⚠️ **Held-deploy caveat (from the `0509` close, 2026-10-28).** `0515` is not committed and not deployed. Any game
  deploy from `dev` also ships the held `0488`/`0494`/`0495` client code. Which deploy carries `0515`, and with what, is
  a deploy-time owner choice; weekend slot unless urgent (owner rule). Committed is not deployed.
- **Who does what:** owned by the producer; **the owner runs every live step** (watching the lobby list, the pickers,
  GameAnalytics). An agent may run read-only checks only where the owner allows it.

## What to build

Nothing. Owner-run live checks, recorded in this folder's `worklog.md`.

## Verification steps

1. **Deployed version.** Record the game version that is live and the date and time of the deploy that carries `0515`.
2. **Public lobby list (direct look).** Over one or more sittings after the deploy, the owner watches the public lobby
   list and counts the Team lobbies and public lobbies seen. Pass: **no lobby labelled "Humans Vs Nations" / "Люди Vs
   Нации"**, and other Team settings (2, 3, 4 teams, Duos, Trios, Quads) still appear. Record the counts; aim for
   about 50 public lobbies in total across sittings (see Context), or say how many were seen if fewer.
3. **Analytics (covers the days the owner is not watching).** In GameAnalytics, from the deploy time on, compare
   `Match:WinCondition:TeamPublic:{Threshold|Timer}:NationsTeam` with the days before the deploy. Pass: it drops to
   about zero, while `TeamPublic:…:HumanTeam` and `TeamPublic:…:BotTeam` keep arriving (Team lobbies still run).
   A few `TeamPublic:…:NationsTeam` events right after the deploy are most likely late-delivered events from games
   played before it (`analytics-event-reference.md`, `NationsTeam` paragraph); a steady stream days later is a failure.
   Nothing is filtered (collect-all-builds rule). `TeamPrivate:…:NationsTeam` keeps arriving; that is expected.
4. **Private lobby still offers it.** The owner opens the private-lobby host screen, picks Team mode: "Humans Vs
   Nations" is still in the list, and a private lobby started with it runs (nations on one team of their own).
5. **Single player still offers it.** The single-player screen, Team mode, still lists "Humans Vs Nations", and a game
   started with it runs.
6. The worklog records the dates, the deployed version, the counts from step 2, the analytics numbers from step 3 (with
   the date range read), each result and the owner's words. No player names or ids, no connection strings, endpoints
   or keys.

## Notes

- **Depends on:** 0515 — plus the game deploy that ships it (not a task)
- **Blocks:** nothing
- **Ships by:** nothing ships; it follows the game deploy that carries `0515`.
- **Related:** `0518` (live check of `0509`, same deploy; the owner may batch the sessions), `0513` (same deploy),
  `0205` and `0476` (Backlog board; their HvN-in-public parts stop happening after this deploy — `0515`'s close says
  how each is affected, not this task), `0119` (the cancelled balance attempt), `0106` (re-enabled it).
- ⚠️ **Stated, not resolved:** `0516`'s brief describes *"the 2026-10-27 purchase and rewarded-ad deploys"*, and
  production moved to `0.0.167` on 2026-10-27. If that deploy already carried `0488`/`0494`/`0495`, the held-deploy
  caveat above is out of date. The producer did not check what `0.0.167` contains; the owner confirms at deploy time.
- ⚠️ **Not checked by the producer:** whether the game server logs each new public lobby's settings. If it does, a
  read-only log search after the deploy is a third way to cover step 2; the owner or an agent he allows may use it.
- After `0515` closes, the wiki pages that describe HvN as live in public (`wiki/systems/game-overview.md`,
  `wiki/systems/glossary.md`) are `fkit-wiki`'s to refresh (per `0515`'s brief), not this task's.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
- **No secrets, no personal data** in this folder.
