# Disable the "Humans Vs Nations" Team Mode — Public Rotation Only (task 0515)

**Source**: `ai-agents/tasks/done/0515-disable-the-humans-vs-nations-mode/brief.md` (`plan.md`, `worklog.md`, `review.md` in the same folder read as evidence)
**Status**: done (agent-closed — not owner-verified) — closed 2026-10-28; committed in `2aa3cefb`, **not deployed** (`git tag --contains 2aa3cefb` → none, checked 2026-10-28)
**Sprint/Tag**: Sprint 9, rank 41 (append rank, flagged; on merit directly below `0509`) / task `0515` / owner `fkit-coder`

> ✅ **Closed 2026-10-28** via `/fkit-task-done` by a spawned `fkit-producer` at the CLOSE step of
> `/fkit-sprint-ship-loop` (driven by `fkit-lead`). Built on the owner-approved plan's **"public rotation only"**
> variant. Stateful review 1 round, R1 + R2 (both low) fixed; ledger `closed-out`. Full `npm test` green **on a re-run**
> (run 1: one known-flake-shaped timeout in an untouched suite). Live check: task `0519` (`🔲 Backlog`, Sprint 9).

## Goal

Owner request, 2026-10-27, verbatim: *"…disable "Humans vs Nations" mode (the reason is that it's highly unbalanced
against humans, and when the match is not full with human players, they often lose)."* The owner's other answer to the
problem the cancelled balance attempt `0119` tried to solve ([[decisions/hvn-balance-pr70-no-ship]]): switch it off
rather than balance it. HvN had been re-enabled in Sprint 3 (`0106`, [[decisions/sprint-3]]).

## Key Changes

- **Owner rulings 2026-10-28** (relayed by `fkit-lead`, verbatim): where → *"Public mix only"*; remove or hide →
  *"Hide (Recommended)"*; on old tabs / private lobbies → typed *"Private lobbies are allowed for HvN"*; build →
  *"Yes, build it (Recommended)"*.
- **`src/server/MapPlaylist.ts`:** `HumansVsNations` removed from `TEAM_COUNTS`, so the server's playlist no longer
  creates public HvN lobbies. The old `// Flashist Adaptation: keep Humans vs Nations in the public rotation.` comment is
  replaced by a reason (left out by `0515`; private lobbies and single player still offer it). The `disableNPCs` line
  that special-cases HvN and its import are **kept**, so turning it back on means editing only the list.
- **`tests/server/MapPlaylist.test.ts`:** `TEAM_COUNTS` asserted as 2, 3, 4, Duos, Trios, Quads and not HvN; a new test
  over 300 generated configs: never HvN, every Team config has NPCs off, all six team counts still appear.
- **`src/core/execution/WinCheckExecution.ts`:** comment only (R1) — the note above `teamLeaderKind` no longer says HvN
  is live in the public rotation.
- **`analytics-event-reference.md`:** the `NationsTeam` paragraph rewritten (R2 tightened it) — see
  [[systems/analytics]].
- **Not done (outside the chosen variant):** no worker-side refusal of HvN, no picker change, no new text keys. The
  private-lobby host picker (`HostLobbyModal.ts`) and single player (`SinglePlayerModal.ts`) **still offer HvN**, and the
  operator-only, admin-token public create (`POST /api/create_game/:id`) **still accepts it** — today only the master
  calls it, with playlist configs.

## Outcome

- ⚠️ **Not deployed.** Ships with the next game deploy (weekend slot unless urgent). A game deploy stops every running
  game, so a `TeamPublic:…:NationsTeam` event after it is most likely a late-delivered event from an earlier game.
- **Live check `0519`** (owner-run): watch the public lobby list (about 50 lobbies; HvN used to be about 1 in 17, per
  `0519`) and GameAnalytics `TeamPublic:…:NationsTeam` (should drop to about zero while other `TeamPublic` leaves keep
  arriving); confirm private lobbies and single player still offer HvN. ⚠️ `0519` carries a held-deploy caveat that may
  be out of date — see [[decisions/sprint-9]].
- **Follow-ups noted at close, not acted on:** `0205` ([[tasks/teams-bot-team-win-stall]]) — its measurements had HvN
  as the one public Team config that resolves (Nations win), so every public Team match is now exposed to the bot-team
  stall; `0476`'s hypothesis H4 (a public HvN loss) can no longer happen in public games after the deploy;
  `geoconflict-producer-knowledge-base.md` §12 still says HvN is re-enabled; the vault's game-overview and glossary
  pages refreshed by this sync ([[systems/game-overview]], [[systems/glossary]]).
- The brief says about 1 in 7 public **Team** lobbies was HvN; `0519` says about 1 in 17 of all public lobbies. Both
  are as written in their sources — not re-derived here.

## Related

- [[decisions/hvn-balance-pr70-no-ship]] — the cancelled balance attempt (`0119`)
- [[decisions/cancelled-tasks]] — `0119`'s cancellation record
- [[tasks/teams-mode-max-teams]] — the earlier change that kept HvN in `TEAM_COUNTS`
- [[tasks/sprint4b-duos-trios-quads]] — the Duos/Trios/Quads entries in the same rotation list
- [[tasks/teams-bot-team-win-stall]] — task `0205`, scope affected
- [[systems/glossary]] — `HumansVsNations` is a `playerTeams` value, not a `GameMode`; where Nations appear
- [[systems/game-overview]]
- [[systems/analytics]] — the `NationsTeam` leaf
- [[decisions/sprint-9]] — the board (rank 41; live check `0519` at 44)
