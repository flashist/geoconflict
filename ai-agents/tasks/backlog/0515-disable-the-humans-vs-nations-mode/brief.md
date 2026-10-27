# Disable the "Humans Vs Nations" team mode

## ID
0515

> ℹ️ **ID allocation, checked 2026-10-27 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/` was
> `0514` (an untracked folder in `backlog/`, filed earlier); `0515`: no folder under `ai-agents/tasks/`.

## Sprint
Sprint 9

> 📌 **Filed on an OWNER REQUEST of 2026-10-27**, typed in the `fkit-lead` session and relayed to a spawned
> `fkit-producer` (no owner channel; ADR-021/037). ⛔ Not producer precedent. Verbatim: *"Brief a new task to the end of
> the currently active sprint: disable "Humans vs Nations" mode (the reason is that it's highly unbalanced against
> humans, and when the match is not full with human players, they often lose)."*

## Priority
41

> ⚠️ Priority 41 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0509`**, because it is a small, self-contained game change with no dependency
> and nothing waiting on it, like `0509`; it is not part of the purchase-incident chain (`0502`–`0513`) and does not
> need to go ahead of those checks. Appended after the board's highest rank (40), never inserted (ADR-035); no row
> renumbered.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Why (owner, 2026-10-27):** the mode is heavily unbalanced against humans. When a match is not full of human players,
the human side often loses to the Nations team.

**What the mode is.** "Humans Vs Nations" (HvN) is a Team-mode setting: every human on one team, every AI nation
("FakeHuman") on one team of its own (`ColoredTeams.Nations`). It is the only public Team setting that runs with NPCs on.

**History — read before planning.**
- `0106` (Sprint 3, ✅ Done) **re-enabled** HvN (and all Team modes) after it had been disabled early on for low player
  counts. The plan should read how it was disabled the first time — its `brief.md` asked for exactly that.
- `0119` (Sprint 4, ⛔ Cancelled 2026-04-18) tried to **balance** HvN (nation count ≈ human count). Not shipped: it
  turned removed nation slots into regular Bots (three factions) and only covered public games. Wiki:
  `wiki/decisions/hvn-balance-pr70-no-ship.md`; review: `ai-agents/knowledge-base/hvn-balance-pr70-no-ship-review.md`.
  This task is the owner's other answer to the same problem: switch it off rather than balance it.

**Where it lives in code (pointers for the plan, not decisions):**
- Definition: `src/core/game/Game.ts` (`HumansVsNations` constant); schema `src/core/Schemas.ts` (accepted value of
  `playerTeams`); team setup `src/core/game/GameImpl.ts`; lobby size `src/core/configuration/DefaultConfig.ts`;
  Nations-team handling in `src/core/game/GameUpdates.ts`, `src/core/execution/WinCheckExecution.ts`,
  `src/core/configuration/ColorAllocator.ts`.
- **Public rotation (server):** `src/server/MapPlaylist.ts` — `TEAM_COUNTS` lists HvN (marked
  `// Flashist Adaptation: keep Humans vs Nations in the public rotation.`), so about 1 in 7 public Team lobbies is HvN;
  the `disableNPCs` line special-cases it.
- **Player-facing pickers (client):** `src/client/HostLobbyModal.ts` (private lobby host), `src/client/SinglePlayerModal.ts`
  (single player), and the lobby label in `src/client/PublicLobby.ts`. Text key `public_lobby.teams_hvn` in
  `resources/lang/en.json` and `ru.json`.
- **Tests that name it:** `tests/HumansVsNations.test.ts`, `tests/server/MapPlaylist.test.ts` (asserts `TEAM_COUNTS`
  includes HvN), `tests/core/executions/WinCheckExecution.test.ts`, `tests/client/WinConditionAnalytics.test.ts`.
- **Docs that state it is live:** `ai-agents/knowledge-base/analytics-event-reference.md` (the `NationsTeam` leaf
  paragraph says HvN is "live in the public rotation … and host-selectable in private lobbies") — the analytics source
  of truth, so it must be updated to match whatever ships.

**Related open work (Backlog board) — the plan must say how each is affected:**
- `0205` (Bot team can make a Team match unwinnable). Owner ruling 2026-09-03: its fix must cover **every** Team
  config **by design, HvN included**. Its measurements note HvN is the one public Team config that resolves (Nations
  win, 4/4). Removing HvN from public play changes what `0205` has to cover; whether HvN stays in scope there depends on
  the "where" choice below. Not decided here.
- `0476` (investigation: a Team game "lost at the start because the bots won"). Its hypothesis H4 is "multiplayer HvN,
  the Nations team wins". If HvN leaves public play, H4 can no longer happen in public games after the deploy.

## Open questions — the owner decides at plan approval

1. **Where:** public rotation only, or everywhere (also private-lobby host picker and single player)?
2. **Remove or hide:** take it out of the pickers, or keep the code path and only stop offering it?
3. **Switchable or removed:** behind a setting / remote flag so it can be turned back on later, or code removal?
   (If removed, the core Nations-team code and its tests may become dead; the plan says what is kept.)
4. **Lobbies already created in HvN at deploy time:** what happens to them? (A game-server deploy restarts workers; the
   plan checks whether any HvN lobby or game can survive the deploy, and what a still-older client does if it asks for
   HvN in a private lobby.)
5. **References:** the `teams_hvn` text in en/ru, the `NationsTeam` analytics leaf and its doc paragraph — kept,
   changed, or removed? (Analytics rule: collect from all builds, never filter old builds — old clients may still
   report `NationsTeam`.)
6. **`0205` scope** (see Related above): does HvN stay in `0205`'s "by design" scope after this?

## What to build

Whatever the owner approves from the questions above. At minimum:
1. No **new public lobby** is created in HvN mode (`MapPlaylist`).
2. The chosen entry points (per Q1/Q2) no longer offer HvN; the server/schema behaviour for a request that still asks for
   it (old client, crafted request) is defined by the plan and tested.
3. Docs updated to match: `analytics-event-reference.md`, and any `// Flashist Adaptation` comment the change makes wrong.
4. **`src/core/` changes are tested** (project rule); tests that assert HvN is in the rotation are updated, not deleted
   blindly.

## Verification steps

1. Test: `MapPlaylist` never yields HvN across a full rotation (and `TEAM_COUNTS` no longer contains it, if that is the
   chosen shape); other Team counts are still offered.
2. Test(s) for the chosen entry-point behaviour: HvN is not offered in the pickers covered by Q1, and a request that
   still names HvN gets the behaviour the plan defined (rejected, or mapped to another mode).
3. If kept behind a switch: a test that the switch off = not offered, on = offered.
4. `npm test` green (full run through the npm script — project lock), lint and type-check clean.
5. `analytics-event-reference.md` and en/ru texts match what ships (grep shows no stale "live in the public rotation"
   claim).
6. Live (owner, after the game deploy): watch public lobbies for a while — no HvN lobby appears; if Q1 = everywhere,
   the private-lobby and single-player pickers show no HvN. Split into a verify task at close, per the build-vs-verify
   rule.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Related:** `0106` (re-enabled it), `0119` (cancelled balance attempt), `0205`, `0476`, `0153` (Duos/Trios/Quads,
  same rotation list).
- **Ships by:** a game deploy (client + game server) — weekend slot unless urgent (owner rule); committed is not
  deployed. Any game deploy from `dev` also ships whatever else is on `dev` at the time.
- After close: ask `fkit-wiki` to ingest this brief and refresh the wiki pages that describe HvN as live
  (`wiki/systems/game-overview.md`, `wiki/systems/glossary.md`).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
- **No secrets** in tests, fixtures or this folder.
