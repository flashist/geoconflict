# Task — Investigation: Win Condition Regression (Fill Bots Winning in Teams / HumansVsNations)

## Sprint
Sprint 4

## Priority
High — potential silent regression affecting singleplayer and multiplayer matches. Fill bots can now win a Teams or HumansVsNations match when land is scarce, producing a meaningless result that the player never asked for.

---

## Context

The solo win condition fix (`s4-solo-win-condition-fix.md`, merged PR #77) changed two things in `WinCheckExecution.ts` and `GameImpl.ts`:

**Change 1 — `WinCheckExecution.checkWinnerTeam()` (line 94–98):**
```
Before: if (max[0] === ColoredTeams.Bot) return;
After:  if (max[0] === ColoredTeams.Bot && gameType !== GameType.Singleplayer) return;
```
Goal: allow the Bot team to win in Singleplayer. Preserves the guard in Public/Private games.

**Change 2 — `GameImpl.makeWinner()` (line 679–688):**
```
Before: if (clientId === null) return ["opponent", winner.name()];
After:  if (clientId === null) {
          if (gameType === Singleplayer && !isTutorial) return ["opponent", winner.name()];
          return;   ← returns undefined in all other game types
        }
```
Goal: restrict the "opponent won" loss screen to Singleplayer. But this now returns `undefined` for any bot player who wins in Public/Private game types — including FFA multiplayer.

**Identified risk surfaces:**

1. **FFA multiplayer — bot wins produce `winner: undefined`.**
   `checkWinnerFFA()` has no bot check at all — bot players could always win in FFA. Before the fix, a bot winning called `makeWinner(botPlayer)` → `["opponent", botName]`. After the fix, the same path returns `undefined`. The game ends (`this.active = false`) but the Win update carries `winner: undefined`. It is unknown what the WinModal displays (or whether it displays anything) in this case.

2. **Teams multiplayer — Bot team leads, game cannot end.**
   In a public Teams match with heavy fallout, if the Bot team accumulates more territory than all human teams, `checkWinnerTeam()` fires the win condition check but returns early (bot guard preserved). The game loops indefinitely until a human team overtakes the Bot team. This behavior existed before the fix, but the scenario becomes more likely when fallout shrinks the available land pool. Needs a defined resolution policy — either the Bot team wins, the human team with the next highest tile count wins, or the game ends with no winner after a timeout.

3. **HumansVsNations Singleplayer — fill bots win instead of Nations.**
   `BotSpawner` creates `PlayerType.Bot` players via `SpawnExecution` (mid-game spawn, not `addPlayers()`). Because they are added without an explicit team, `maybeAssignTeam()` routes them to `this.botTeam = ColoredTeams.Bot`. In HumansVsNations Singleplayer with a non-zero `bots` config, these fill bots exist on the Bot team alongside the Humans and Nations teams. The fix now allows the Bot team to win in `GameType.Singleplayer`. If fallout shrinks available land and fill bots hold more territory than both the Humans and Nations teams, the Bot team is declared the winner — an outcome with no meaningful product interpretation. The game should only resolve as Humans winning or Nations winning; fill bots are map filler, not an intended opponent. The same issue applies to any Singleplayer Teams mode match with fill bots.

---

## Investigation

### 1. FFA regression: `winner: undefined` path
- Find all callers of `setWinner()` that pass a `Player` (not a Team) argument. These are in `checkWinnerFFA()` and potentially elsewhere.
- Trace what happens downstream when `winner: undefined` reaches `WinModal.ts`. Does the modal render? Does it crash? Does it silently show nothing?
- Determine whether bot players actually win FFA matches in the production configuration (are there AI players in public FFA lobbies? what is their `clientID()`?).
- If confirmed reachable and broken: fix `makeWinner()` to handle the non-Singleplayer bot-player path explicitly — either return a defined "no winner / draw" state, or suppress the win update via a different mechanism that does not stall the game.

### 2. Teams mode: Bot-team-leads stall
- Identify under what conditions `ColoredTeams.Bot` team can accumulate territory in a public Teams match. Are AI bot players assigned to the Bot team in Teams mode, or to named human teams (Red, Blue, etc.)?
- If Bot team members hold territory: simulate or reason through a heavy-fallout scenario where the Bot team's percentage exceeds `percentageTilesOwnedToWin()` while human teams cannot overtake. Does the game run forever? Does the timer path also stall?
- Define the correct resolution: should the win go to the human team with the most tiles (ignoring the Bot team), or should the game declare no winner after a timeout, or something else?

### 3. HumansVsNations / Teams Singleplayer — fill bots as unintended winner
- Confirm `BotSpawner` is active in HumansVsNations Singleplayer (check whether the `bots` config value is non-zero in the `SinglePlayerModal` defaults for this mode). If yes, fill bots exist on `ColoredTeams.Bot` alongside the intended teams.
- Trace the `checkWinnerTeam()` path for a scenario where Bot team holds the most tiles: confirm the fix's `gameType !== Singleplayer` guard no longer blocks it, and `setWinner("Bot", stats)` is called.
- Trace `makeWinner("Bot")` — this is a string, so it goes to the team branch and returns `["team", "Bot", ...clientIds of humans on Bot team]`. Since fill bots have `clientId === null`, the result is `["team", "Bot"]` with no clientIds. Confirm what WinModal displays for this and whether it is a coherent outcome.
- Define the correct fix: the `ColoredTeams.Bot` guard in `checkWinnerTeam()` should apply in all game types, not just non-Singleplayer. The Bot team should never be declared winner. The intended fix for the original bug (letting a bot opponent trigger a loss screen) should be scoped more narrowly — likely to individual player wins in FFA via `checkWinnerFFA()`, not to the team-level Bot guard.

### 4. Log findings in the PR description before fixing
Document for each risk surface: is it reachable in production, does it produce incorrect behavior, and what is the minimum change to fix it.

---

## What to Build

Conditional on findings:

**If risk 1 is confirmed** (FFA bot wins produce `undefined` winner):
- Fix `makeWinner()` to handle the bot-player-wins-in-multiplayer case explicitly. Options: suppress the win event (keep `checkWinnerFFA()` from calling `setWinner()` for bots in non-Singleplayer games, consistent with the Teams mode guard), or define a new "no_winner" / "bot_win" discriminant in `WinnerSchema` and handle it in WinModal.
- Preferred: add a bot check to `checkWinnerFFA()` for non-Singleplayer games, matching the guard already in `checkWinnerTeam()`. This is the lowest-risk fix and makes both code paths consistent.

**If risk 2 is confirmed** (Teams mode stall):
- Decide the resolution policy with Mark before implementing.
- Likely fix: when Bot team leads and the bot guard prevents a winner being declared, award the win to the human team with the highest tile count as a fallback. Add this fallback only when the timer condition fires, not on every tick — to avoid ending the game prematurely.

**If risk 3 is confirmed** (fill bots win in HumansVsNations / Teams Singleplayer):
- Revert the `gameType !== Singleplayer` condition from `checkWinnerTeam()`, restoring the unconditional `ColoredTeams.Bot` guard. The Bot team should never win in any game type.
- The original solo loss-screen fix should be re-examined: the intended behaviour (player sees a loss screen when an opponent reaches the win threshold) must be achieved without removing the Bot team guard. Likely approach: keep the guard, and fix the loss screen trigger separately for the cases where it was missing (e.g., Nations team winning in HumansVsNations with no human clientIds producing a silent result).

---

## Verification

1. **FFA multiplayer — bot wins:** reproduce a bot win in a public FFA lobby (or via a test that stubs `checkWinnerFFA()`). Confirm the WinModal renders correctly and does not show a blank screen or crash.
2. **Teams mode — bot stall:** confirm that a public Teams match where the Bot team holds the most tiles either ends correctly (via fallback resolution) or continues without stalling indefinitely.
3. **HumansVsNations Singleplayer — fill bots cannot win:** with `bots > 0`, confirm the Bot team is never declared the winner even when fallout makes it the largest team by tile count. The match should resolve as Humans win, Nations win, or a stall — never Bot team wins.
4. **Original fix preserved:** confirm Singleplayer solo mode (missions, custom game FFA) still ends correctly when the intended opponent wins — player sees the loss screen and `Match:Loss:OpponentWon` fires.
5. **No winner-screen regression for human wins:** confirm human players winning multiplayer matches (FFA and Teams) still see the correct win screen after any changes.

---

## Notes

- `checkWinnerFFA()` and `checkWinnerTeam()` currently have different bot-win policies. After this investigation, they should either both have a consistent policy or have the difference explicitly justified in comments.
- The `makeWinner()` change that introduced the `undefined` return path should be treated as the most likely live regression. It is narrow and mechanical to fix.
- Do not change the win percentage threshold (`percentageTilesOwnedToWin()`) or fallout rates as part of this task — those are separate balance concerns.
