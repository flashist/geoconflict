# Task — Investigation: Win Condition Regression (Fill Bots Winning in Teams / HumansVsNations)

## ID
0022

## Sprint
Sprint 4

## Priority
~~High — potential silent regression affecting singleplayer and multiplayer matches. Fill bots can now win a Teams or HumansVsNations match when land is scarce, producing a meaningless result that the player never asked for.~~

**Medium — re-ranked `High` → `Medium` on an owner ruling given live in session, 2026-09-02**
(recorded as ruling **R1** in [`plan.md`](plan.md)). Struck, not deleted, per this board's
auditability convention.

The `High` rank rested entirely on this being a **live correctness regression introduced by PR #77**.
That premise is **refuted** — see *⚠️ Premise refuted* immediately below. The honest rank: a real
defect does exist and its largest consequence (silently losing the whole match's match-end XP) is
**worse than this brief describes**, but the fix is ~8 lines and the defect has been in the fork since
its first commit. It is not the urgent live regression Sprint 4 believed it was.

## Status
✅ Done (agent-closed — not owner-verified) *(closed 2026-09-02 by a producer **spawned** from
`/fkit-sprint-ship-loop`; no owner was present at the close, which is what the marker records — the
build itself was owner-directed throughout. Scope shipped: **risks 1 and 3 only**; risk 2 was split
out to [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md). Read
**[Close-out](#close-out--what-this-task-actually-was-2026-09-02)** at the foot of this file before
acting on anything above it. The previous value was `🔄 In progress`, set the same day.)*

## Owner
fkit-coder

---

## ⚠️ Premise refuted — read before anything else (recorded 2026-09-02)

**`0022` was scheduled as a live correctness regression introduced by `0140-solo-win-condition-fix`
(PR #77). It is not one.** The full findings are in [`plan.md`](plan.md), produced by a spawned
`fkit-coder` and approved by the owner live in session on 2026-09-02. The producer **re-verified the
load-bearing claims independently** before writing this section; what follows is marked for what was
checked and what was not.

### The commit-by-commit evidence

| commit | `makeWinner()` clientless branch |
|---|---|
| `de2fd00~1` (the real pre-PR baseline) | `if (clientId === null) return;` → **undefined** |
| `de2fd00` "Codex: solo win condition fix" | **`GameImpl.ts` is not in the diff at all** |
| `0b8528c` "review changes" | `return ["opponent", winner.name()];` (widened) |
| `db5029d` "review changes" | narrowed back to `Singleplayer && !isTutorial`; else **undefined** |

✅ **Producer-verified**, 2026-09-02, all four rows:
`git show de2fd00~1:src/core/game/GameImpl.ts` → `:680` `if (clientId === null) return;`;
`git show --stat de2fd00` lists 11 files and **`src/core/game/GameImpl.ts` is not among them**;
`0b8528c:680` and `db5029d:680-686` as stated.

The state this brief calls *"Before"* existed **only between two commits inside the same PR series**
and was never a shipped baseline. **Net effect of PR #77 on this path: zero.**
✅ **Producer-verified:** the `undefined` return is original to the fork —
`git show feea527:src/core/game/GameImpl.ts` → `:676` `if (clientId === null) return;`
(`feea527` = "First commit of the fork (geoconflict) into a separate repository").

### The real defect is worse than this brief describes

This brief never mentions the largest live consequence. When a clientless player wins FFA:

- `WinModal.ts:380-381` — `if (wu.winner === undefined || wu.winner[0] === "opponent") { // ... }` is
  an **empty block**. ✅ Producer-verified. No modal, no `SendWinnerEvent`.
- Because no `SendWinnerEvent` is emitted, **no `winner` message reaches the server**, so
  `GameServer.handleWinner` (`:1144`) never runs, `this.winner` stays `null`, and **`creditMatchXp`
  never runs — the entire match's match-end XP is silently lost, for every player in it.**
  ✅ Producer-verified: `creditMatchXp` is declared at `GameServer.ts:1253` and has **exactly one call
  site**, `GameServer.ts:1199`, inside `handleWinner`.
- The win check also **permanently deactivates itself** (`this.active = false`, `WinCheckExecution.ts`
  — the execution's own flag, declared `:17`, read by `isActive()` `:121-123`), so no later win can be
  declared in that match, **even by a human**.
- **Scope is wider than "bots".** The predicate is `clientID() === null`, which catches
  **Nations (`PlayerType.FakeHuman`)** as well. ✅ Producer-verified: Nations are constructed with a
  `null` clientID at `src/core/GameRunner.ts:89-93`, and public FFA has them —
  `MapPlaylist.ts:169` `bots: 400` and `MapPlaylist.ts:165`
  `disableNPCs: mode === GameMode.Team && playerTeams !== HumansVsNations` ⇒ **false for FFA**.
  ✅ Producer-verified (both lines read).

**Failure mode: silent.** Not a crash, not a hang, not a desync. The match simply never ends.
⚠️ *Unverified by the producer:* the plan's desync analysis and its end-to-end
`ClientGameRunner.ts:516, 525-536` trace (`saveGame()` / `reportPlacements()` still run) were **not**
independently re-checked here. They are the coder's findings, recorded as such.

### Owner rulings, given live in session 2026-09-02

| Ruling | Effect on this brief |
|---|---|
| **R1** | Task **survives**, re-ranked `High` → `Medium`. Recorded above. |
| **R2** | Risk 1 fix shape is **guard only**, placed *before* `this.active = false`. The timer-expiry award was **declined** and is a candidate follow-up, not built here. |
| **R3** | Risk 3 collapses to a **single label fix** on the already-dead-player path, plus the new key in **both** `en.json` and `ru.json`. ⛔ The fix this brief prescribes at *"What to Build"* → risk 3 is **WRONG — do not apply it.** |
| **R4** | Risk 2 is **split out** to [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md) so risks 1 and 3 ship without waiting on the owner's `:88` policy decision. |
| **R5** | Verification is synthetic tests **plus a Singleplayer live check only**. Risk 1 gets **no live repro** — it needs a private lobby and would collide with the owner's dev server on port 3001; the owner declined the interruption. **The residual is accepted and must be surfaced at review.** |

### ⚠️ Line-number note for readers of `plan.md`

`plan.md` §6 cites this brief by line (`:31-39`, `:44`, `:50`, `:57`, `:88`, `:91`, `:114`, `:115`,
`:116`). **Those citations address the revision of this file as it stood before this section was
added** (git `2d1135c`). The annotations below are placed at each cited passage, so follow the text,
not the number.

⚠️ **Source line numbers drift too — a coder is editing `src/core/execution/WinCheckExecution.ts`,
`src/client/graphics/layers/WinModal.ts` and both language files in this working tree right now.**
Every `file:line` in this section was verified against the tree as of 2026-09-02; the risk-1 guard has
since landed and already moved the numbers in `WinCheckExecution.ts`.

---

## Context

The solo win condition fix (`0140-solo-win-condition-fix`, merged PR #77) changed two things in `WinCheckExecution.ts` and `GameImpl.ts`:

**Change 1 — `WinCheckExecution.checkWinnerTeam()` (line 94–98):**
```
Before: if (max[0] === ColoredTeams.Bot) return;
After:  if (max[0] === ColoredTeams.Bot && gameType !== GameType.Singleplayer) return;
```
Goal: allow the Bot team to win in Singleplayer. Preserves the guard in Public/Private games.

~~**Change 2 — `GameImpl.makeWinner()` (line 679–688):**~~
```
Before: if (clientId === null) return ["opponent", winner.name()];
After:  if (clientId === null) {
          if (gameType === Singleplayer && !isTutorial) return ["opponent", winner.name()];
          return;   ← returns undefined in all other game types
        }
```
~~Goal: restrict the "opponent won" loss screen to Singleplayer. But this now returns `undefined` for any bot player who wins in Public/Private game types — including FFA multiplayer.~~

> ⛔ **CORRECTED 2026-09-02 — this whole "Change 2" block is INVERTED and is struck, not deleted**
> (plan.md §6 items **1**, **2** and **9**).
>
> - **The "Before" is false.** The real pre-PR baseline (`de2fd00~1`) was
>   `if (clientId === null) return;` — i.e. **already `undefined`**. ✅ Producer-verified.
>   `["opponent", winner.name()]` existed only **between `0b8528c` and `db5029d`, both inside this same
>   PR series**, and never shipped.
> - **PR #77 did not touch this file.** `git show --stat de2fd00` does not list `GameImpl.ts`.
>   ✅ Producer-verified. **Net effect of PR #77 on this path: zero.** The `undefined` return is
>   original to the fork (`feea527`).
> - **The line range is wrong.** `makeWinner` is `GameImpl.ts:667-694` and the clientless guard is
>   `:678-687` — not `679-688`. ✅ Producer-verified against the current tree.
>
> The *"After"* text does describe today's code correctly. Only the *"Before"*, and therefore the whole
> regression framing, is wrong.

**Identified risk surfaces:**

1. **FFA multiplayer — bot wins produce `winner: undefined`.**
   `checkWinnerFFA()` has no bot check at all — bot players could always win in FFA. ~~Before the fix, a bot winning called `makeWinner(botPlayer)` → `["opponent", botName]`. After the fix, the same path returns `undefined`.~~ ~~The game ends (`this.active = false`)~~ but the Win update carries `winner: undefined`. ~~It is unknown what the WinModal displays (or whether it displays anything) in this case.~~

   > ⚠️ **CORRECTED 2026-09-02** (plan.md §6 items **2**, **4**, **6**, **10**). The risk itself is
   > **REAL and confirmed** — only its framing and scope are wrong:
   >
   > - **"Before the fix … `["opponent", botName]`" is false.** True only between two commits inside
   >   PR #77. ✅ Producer-verified. This is **not a regression**; it is original to the fork.
   > - **"The game ends" is misleading.** `this.active = false` sets **the win-check execution's own**
   >   flag (`WinCheckExecution.ts:17`, read by `isActive()` `:121-123`) — it removes the *check*, not
   >   the game. The match keeps running with no way left to end it.
   > - **Scope is too narrow.** The predicate is `clientID() === null`, so **Nations
   >   (`PlayerType.FakeHuman`) hit the identical path**, and public FFA has them.
   >   ✅ Producer-verified (`GameRunner.ts:89-93`, `MapPlaylist.ts:165,169`).
   > - **"It is unknown what the WinModal displays" — now known: nothing.**
   >   `WinModal.ts:380-381` is an **empty block**. ✅ Producer-verified. And because that block never
   >   emits `SendWinnerEvent`, no `winner` message reaches the server, so `creditMatchXp`
   >   (`GameServer.ts:1253`, sole call site `:1199`) never runs and **the whole match's match-end XP
   >   is silently lost for every player** — the largest live consequence, which this brief never
   >   mentions. ✅ Producer-verified.

2. **Teams multiplayer — Bot team leads, game cannot end.**
   In a public Teams match with heavy fallout, if the Bot team accumulates more territory than all human teams, `checkWinnerTeam()` fires the win condition check but returns early (bot guard preserved). The game loops indefinitely until a human team overtakes the Bot team. This behavior existed before the fix, but the scenario becomes more likely when fallout shrinks the available land pool. Needs a defined resolution policy — either the Bot team wins, the human team with the next highest tile count wins, or the game ends with no winner after a timeout.

   > ➡️ **SPLIT OUT 2026-09-02 to [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md)**
   > — owner ruling **R4**, given live in session, so risks 1 and 3 can ship without waiting on the
   > `:88` policy decision. **Do not implement risk 2 in `0022`.** Risk 2 is **REAL and pre-existing**:
   > the `if (max[0] === ColoredTeams.Bot) return;` guard predates PR #77, which only appended
   > `&& gameType !== GameType.Singleplayer`. ✅ Producer-verified — the guard returns **before**
   > `this.active = false`, so the check retries every 10 ticks: not a hang, an unwinnable match while
   > the Bot team leads. ⚠️ The **trigger stated above is the rare one** — see `0205` for the corrected,
   > realistic shape (private Team + timer, not the 95% territory case).

3. **HumansVsNations Singleplayer — fill bots win instead of Nations.**
   `BotSpawner` creates `PlayerType.Bot` players via `SpawnExecution` (mid-game spawn, not `addPlayers()`). Because they are added without an explicit team, `maybeAssignTeam()` routes them to `this.botTeam = ColoredTeams.Bot`. In HumansVsNations Singleplayer with a non-zero `bots` config, these fill bots exist on the Bot team alongside the Humans and Nations teams. The fix now allows the Bot team to win in `GameType.Singleplayer`. If fallout shrinks available land and fill bots hold more territory than both the Humans and Nations teams, the Bot team is declared the winner — ~~an outcome with no meaningful product interpretation. The game should only resolve as Humans winning or Nations winning; fill bots are map filler, not an intended opponent.~~ The same issue applies to any Singleplayer Teams mode match with fill bots.

   > ⚠️ **CORRECTED 2026-09-02** (plan.md §6 item **8**; owner ruling **R3**). The reachability above
   > is right; the *characterisation* is wrong, and the scope shrinks accordingly.
   >
   > ✅ **Producer-verified** in `WinModal.ts`: `isSoloOpponentWin()` (`:491-514`) is consulted first
   > (`:376-379`). For a **living** player in Singleplayer non-tutorial with `winner === ["team","Bot"]`,
   > `winner[1] !== myPlayer.team()` ⇒ it returns **true** ⇒ the standard **"You lost / an opponent
   > captured enough territory"** modal, and the match **ends** instead of stalling. **The owner ruled
   > that is correct behaviour** (R3) — so this is not "no meaningful product interpretation".
   >
   > The **only** defect is the **already-dead-player** path: `hasShownDeathModal || !myPlayer.isAlive()`
   > (`:501`) makes `isSoloOpponentWin()` return false, so it falls through to the team branch (`:382`)
   > and renders `win_modal.other_team` (`:404-406`) → **"Bot team has won!"** /
   > «Команда «Bot» победила!» (`en.json:626`, `ru.json:647`) with the raw untranslated enum value.
   > ✅ Producer-verified, all line references.
   >
   > **Risk 3's scope is therefore a single label fix on the dead-player path, plus the new key in both
   > `en.json` and `ru.json`.**

---

## Investigation

### 1. FFA regression: `winner: undefined` path
- ~~Find all callers of `setWinner()` that pass a `Player` (not a Team) argument. These are in `checkWinnerFFA()` and potentially elsewhere.~~ ✅ **ANSWERED 2026-09-02** (plan.md §6 item **5**): there are **exactly two `setWinner()` call sites in the whole of `src/`, both in `WinCheckExecution.ts`**, and **exactly one** passes a `Player` — the one in `checkWinnerFFA()`. The other passes a team string from `checkWinnerTeam()`. "Potentially elsewhere" is answered: nowhere else. ✅ Producer-verified by a repo-wide search of `src/`.
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

> ✅ **RULED 2026-09-02 — owner ruling R2, given live in session. The "Preferred" option is the one to
> build, with two amendments:**
> 1. **The predicate is `clientID() === null`, NOT `PlayerType.Bot`** — Nations (`FakeHuman`) must be
>    covered too. The text above says "bot check"; that is too narrow.
> 2. **Place the guard *before* `this.active = false`**, so the win check stays alive and a human can
>    still win the match later. This is the single behavioural improvement that matters — today the
>    check kills itself permanently.
>
> ⛔ **The timer-expiry award was DECLINED for now** (the coder's option (b) in `plan.md`) — it is a
> behaviour change, not a defect fix. Recorded as a candidate follow-up brief; ~~**not filed**, and
> deliberately so.~~ ✅ **NOW FILED, 2026-09-02, as
> [`0206`](../0206-ffa-timer-expiry-award-to-top-client-player/brief.md)** — on the backlog board,
> unscheduled, nobody building it. **Struck, not deleted.** The decline still stands for `0022`: `0022`
> ships guard-only, and `0206` is where the award is decided and built.
>
> ✅ **Owner ruling 2026-09-02 — review finding R1 is an ACCEPTED RESIDUAL of this guard-only shape,
> NOT a defect to fix inside `0022`.** R1 is carried in full into
> [`0206`](../0206-ffa-timer-expiry-award-to-top-client-player/brief.md): with guard-only, an FFA match
> where a bot or Nation leads at 80 % or at timer expiry emits **no `Win` update at all**, so
> `ClientGameRunner`'s `gameEnded` path never runs — **`saveGame()`** stops (a `localStorage`-only
> record, cosmetic), **`reportPlacements()`** stops (⚠️ **top-3 humans get no leaderboard placement
> points where they previously did** — better when a human eventually wins, worse when nobody ever
> does), and server-side **`creditMatchXp` never runs, so the whole match's match-end XP is silently
> lost.** ⚠️ For the **tutorial**, losing `reportPlacements()` is a **fix, not a regression** — it was
> awarding first-place points for losing a tutorial to a bot. `0206` carries all of this.

~~**If risk 2 is confirmed** (Teams mode stall):~~
- ~~Decide the resolution policy with Mark before implementing.~~
- ~~Likely fix: when Bot team leads and the bot guard prevents a winner being declared, award the win to the human team with the highest tile count as a fallback. Add this fallback only when the timer condition fires, not on every tick — to avoid ending the game prematurely.~~

> ➡️ **NOT IN THIS TASK'S SCOPE — moved 2026-09-02 to
> [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md)** on owner ruling **R4**.
> The *"Decide the resolution policy with Mark before implementing"* gate is carried verbatim into
> `0205`. ~~where it blocks that task from starting.~~ ✅ **That gate is now discharged: the owner ruled
> 2026-09-02 — the next-highest human team wins.** `0205` is no longer blocked. **Struck here, not
> deleted.** ℹ️ `0205` was filed as `0204` and renumbered on an owner ruling the same day (ID
> collision with the carry-check hook task).

⛔ ~~**If risk 3 is confirmed** (fill bots win in HumansVsNations / Teams Singleplayer):~~
- ⛔ ~~Revert the `gameType !== Singleplayer` condition from `checkWinnerTeam()`, restoring the unconditional `ColoredTeams.Bot` guard. The Bot team should never win in any game type.~~
- ~~The original solo loss-screen fix should be re-examined: the intended behaviour (player sees a loss screen when an opponent reaches the win threshold) must be achieved without removing the Bot team guard. Likely approach: keep the guard, and fix the loss screen trigger separately for the cases where it was missing (e.g., Nations team winning in HumansVsNations with no human clientIds producing a silent result).~~

> ⛔ **THIS PRESCRIBED FIX IS WRONG. DO NOT APPLY IT.** Marked so on an **owner ruling given live in
> session, 2026-09-02** (ruling **R3**; plan.md §6 item **7**).
>
> Reverting the `gameType !== Singleplayer` clause would **reintroduce the Singleplayer Team stall that
> PR #77 fixed.** ✅ Producer-verified structurally: with the clause removed, the guard in
> `checkWinnerTeam()` returns **before** `this.mg.setWinner(...)` and before `this.active = false`, so a
> Singleplayer Team match in which the Bot team leads can never end — the check just retries forever.
> That is exactly the bug PR #77 was written to remove.
>
> **What to build instead (ruling R3):** a **single label fix** on the already-dead-player path in
> `WinModal.ts`'s team branch — special-case `wu.winner[1] === ColoredTeams.Bot` so it renders loss copy
> instead of the raw `"Bot"` enum value — plus the new key in **both** `resources/lang/en.json` and
> `resources/lang/ru.json`, per the project's localization rule. Nothing in `src/core/` changes for
> risk 3.

---

## Verification

1. **FFA multiplayer — bot wins:** reproduce a bot win in a public FFA lobby (or via a test that stubs `checkWinnerFFA()`). Confirm the WinModal renders correctly and does not show a blank screen or crash.
2. ~~**Teams mode — bot stall:** confirm that a public Teams match where the Bot team holds the most tiles either ends correctly (via fallback resolution) or continues without stalling indefinitely.~~ ➡️ **Moved to [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md) with risk 2 (owner ruling R4, 2026-09-02). Not verified here.**
3. **HumansVsNations Singleplayer — fill bots cannot win:** with `bots > 0`, confirm the Bot team is never declared the winner even when fallout makes it the largest team by tile count. The match should resolve as Humans win, Nations win, or a stall — never Bot team wins.
4. **Original fix preserved:** confirm Singleplayer solo mode (missions, custom game FFA) still ends correctly when the intended opponent wins — player sees the loss screen and `Match:Loss:OpponentWon` fires.
5. **No winner-screen regression for human wins:** confirm human players winning multiplayer matches (FFA and Teams) still see the correct win screen after any changes.

---

## Notes

- **Depends on:** nothing recorded — this brief asserts no gate on another task anywhere in its text,
  and `0196` transcribed rather than re-scoped it. Not an independent verification that none exist.
  (The `0140-solo-win-condition-fix` reference throughout is the change being investigated, already
  merged as PR #77 — context, not a prerequisite. The one in-text gate is an owner decision, not a
  task: `:88` "Decide the resolution policy with Mark before implementing.", which applies only to the
  risk-2 branch.)
  ✅ **Confirmed correct 2026-09-02** (plan.md §6 item **11**) — and now moot for this task: risk 2,
  and with it that owner-decision gate, moved to
  [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md). **`0022` has no gate left and
  is unblocked.**
- **Split from / see also:** [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md) —
  risk 2, the Teams multiplayer Bot-team win stall. Split out 2026-09-02 on owner ruling R4.
- **Follow-up filed:** [`0206`](../0206-ffa-timer-expiry-award-to-top-client-player/brief.md) — the
  timer-expiry award declined here under ruling **R2** (the coder's option (b)), plus review finding
  **R1**, which the owner **accepted as a residual** of the guard-only shape on 2026-09-02 rather than
  a defect to fix inside `0022`. Backlog board, unscheduled. It **depends on `0022` shipping** — it
  modifies the guard `0022` introduces.
- `checkWinnerFFA()` and `checkWinnerTeam()` currently have different bot-win policies. After this investigation, they should either both have a consistent policy or have the difference explicitly justified in comments.
- ~~The `makeWinner()` change that introduced the `undefined` return path should be treated as the most likely live regression. It is narrow and mechanical to fix.~~ ⛔ **FALSE PREMISE — struck 2026-09-02** (plan.md §6 item **3**). There was no such change: the `undefined` return is **original to the fork** (`feea527`), and PR #77 does not touch `GameImpl.ts` at all. ✅ Producer-verified. It is a **real defect**, and it is indeed narrow and mechanical to fix — it is simply **not a regression**.
- ⚠️ **Verification residual, accepted by the owner and recorded here so review sees it (ruling R5, 2026-09-02):** **risk 1 gets no live reproduction.** It needs a non-Singleplayer private lobby, and a second `npm run dev` would collide with the owner's running dev server on port 3001; the owner declined the interruption. Coverage for risk 1 is **synthetic jest tests only**. Risk 3 does get a real end-to-end Singleplayer check. The repo's own recorded lesson (`feedback_spatial_gameplay_live_test`) is that synthetic-map tests can pass while real behaviour is wrong — so this residual is stated, not waved away.
- **Scope of this task is now risks 1 and 3 only.** Risk 2 lives in [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md) ~~and is **blocked on an owner decision**~~ — ✅ **that decision was made 2026-09-02 (next-highest human team wins); `0205` is unblocked and sits on the backlog board, unscheduled, with nobody building it.** (`0205` was filed as `0204` and renumbered the same day on an owner ruling — ID collision.)
- Do not change the win percentage threshold (`percentageTilesOwnedToWin()`) or fallout rates as part of this task — those are separate balance concerns.

---

## Close-out — what this task actually was (2026-09-02)

**Written at close by a producer spawned from `/fkit-sprint-ship-loop`. No owner was present at the
close** — hence `✅ Done (agent-closed — not owner-verified)` in `## Status` above. The build, the
review dispositions and every ruling cited below **were** owner-given live in session; it is only the
act of closing that no human checked.

⚠️ **Everything above this section is written as if the task were still open, and much of it is struck
rather than deleted, per this board's convention. This section is the current state.** Where the two
disagree, this one is later.

### 1. The premise was refuted — this was never a PR #77 regression

`0022` was scheduled as a **live correctness regression introduced by PR #77**
(`0140-solo-win-condition-fix`). **It is not one.** The `undefined` return from `makeWinner()`'s
clientless branch is **original to the fork** (`feea527`), and `git show --stat de2fd00` does not list
`GameImpl.ts` at all — **PR #77's net effect on that path is zero.** Full commit-by-commit evidence,
producer-verified, is in *⚠️ Premise refuted* near the top of this file.

**The task survived because a real and worse defect was found underneath it.** When a clientless
player (a Bot **or** a `FakeHuman` Nation) wins FFA, `WinModal.ts` hits an empty block, so no
`SendWinnerEvent` is emitted, so no `winner` message reaches the server, so `creditMatchXp` never runs
— **the whole match's match-end XP is silently lost, for every player in it.** The win check also
permanently deactivated itself, so the match could never end even by a later human win.

**Priority was re-ranked `High` → `Medium` on exactly that basis** (owner ruling R1, 2026-09-02): a
real defect, ~8 lines to fix, present since the fork's first commit — not the urgent live regression
Sprint 4 believed it was.

### 2. What shipped

| Change | Where |
|---|---|
| Risk 1 — clientless-leader guard, placed **before** `setWinner` and before `active = false` | `src/core/execution/WinCheckExecution.ts:65-73` (`setWinner` at `:74`, `active = false` at `:76`) |
| Risk 3 — Bot-team loss-title label fix | `src/client/graphics/layers/WinModal.ts:403-417` |
| New key `win_modal.bot_team` | **both** `resources/lang/en.json` and `resources/lang/ru.json` |
| Tests | `tests/core/executions/WinCheckExecution.test.ts`, `tests/client/WinModal.test.ts` |

Stateful review **round 1 closed out** ([`review.md`](review.md), status `closed-out`, 2026-09-02).
Both reviewers ran — the reviewer's own pass plus Codex. **R3** and **R4** fixed and
reviewer-verified; **R1** and **R2** accepted as residuals (below).

**Verification quoted from [`worklog.md`](worklog.md) and [`review.md`](review.md), not re-measured at
close:** `npm test` **108 suites / 1128 tests green on the FIRST run** (no flake, no re-run needed);
`npm run lint` **clean**.

### 3. Accepted residuals — each with its destination

- **R1 — `reportPlacements()` no longer fires for a clientless-leader FFA match.** ⚠️ **This is NOT
  tutorial-only** — it applies to **Public and Private** FFA too. In a match nobody wins, the top-3
  humans lose leaderboard placement points they previously got. **Carried in full to
  [`0206`](../0206-ffa-timer-expiry-award-to-top-client-player/brief.md)**, whose award is
  what closes it.
  ⛔ **Record the useful half too, so nobody "restores" the old behaviour:** for the **tutorial**,
  removing `reportPlacements()` is a **FIX, not a regression.** Previously a bot winning a tutorial
  awarded the single human player **first place for losing**, written to the **real platform
  leaderboard** through a function with **no game-type guard**.
- **R2 — `win_modal.bot_team` exists only in `en.json` / `ru.json`;** the other 31 shipped locales
  fall back to English. **Accepted under the project's en+ru-only localization convention. No
  follow-up task filed.**
- **R5, narrowed — stays on `0022`, nothing carried forward.** Only two things are unverified:
  **(a) real-game reachability** of the clientless-leader path, and **(b) post-guard match
  behaviour.** The **guard logic itself is adequately covered** by the unit tests. See item 5 for what
  the live check did and did not cover.

### 4. ⚠️ `WinModal.ts` is deliberately NOT Prettier-clean — expected, do not "fix" it

**Owner ruling, 2026-09-02, option (a).** The file was already unclean at `HEAD` with **13
pre-existing deviations, none of them from this task**; the new arm adds a 14th, formatted **identically
to the two sibling arms it sits between**. `npm run format` would drag 13 unrelated hunks into a
minimal diff. `lint-staged` will reformat them all whenever it next stages that file. **This is
recorded so nobody files it as a defect.**

### 5. ⚠️ Risk 1 has no live reproduction

The live check that was run covered **risk 3 only**, in Singleplayer — and even there the player's
death was **forced** (`hasShownDeathModal` set directly), **not natural**. The reviewer did establish
that a natural death reaches the same branch via a different disjunct, and a unit test drives that
route. **Risk 1's coverage is synthetic jest tests only.** The repo's own recorded lesson is that
synthetic-map tests can pass while real behaviour is wrong — so this is stated, not waved away. It is
the substance of residual **R5** above.
