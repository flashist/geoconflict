# Investigation: a player says a Team game is lost right at the start because the bots' team captured enough land to win

## ID
0476

> ℹ️ **ID allocation, checked 2026-10-22 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) was `0475`. `0476`: no task folder and no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`.

## Sprint
Backlog

> 📌 **Filed on an OWNER RULING of 2026-10-22**, typed live in a Claude Code session and relayed by `fkit-lead` (in a
> `fkit-sprint-ship-loop` session) to a spawned `fkit-producer` (no owner channel), verbatim: *"Add a brief to the
> backglog task to investigate this feedback from a player"*. No sprint named → Backlog board, unscheduled.
> ⛔ Not producer precedent.

## Priority
Unscheduled

(Backlog board, unranked by design — the Priority cell stays `—`.)

> 📌 **Placed directly below `0205` on the Backlog board on an OWNER RULING of 2026-10-22**, given live via
> `AskUserQuestion` in the `fkit lead` session (`fkit-sprint-ship-loop`) and relayed by `fkit-lead` to a spawned
> `fkit-producer` (no owner channel; ADR-021/037). Question: *"0476 (players lose a team game to the bots right at the
> start): where should it sit on the Backlog board?"* → verbatim *"Right under 0205 (Recommended)"*. The row was moved
> up from the bottom of the board (where it had been appended at filing), not copied; nothing renumbered, no closed row
> touched (ADR-035). ⛔ Not producer precedent for re-ranking or for placing a row mid-board.

## Status
🔲 Backlog

## Owner
fkit-coder

This is an **investigation, not a fix.** Its output is a findings report with a recommendation the owner can rule on.
**No game-logic change ships from this task.** (That scope line is the producer's call, not an owner ruling — the
owner asked for an investigation; see `## Notes`.)

## Context

### The player feedback (verbatim, Russian — Yandex Games review)

> "Игра на троечку только из за одного минуса - только начинаешь игру с командами и сразу же вы проиграли, потому что
> команда ботов захватила достаточно регионов для победы, вопрос что это такое?! Я только начал и уже проиграл!"

Plain English: *"The game gets a 3/5 because of one minus — you just start a team game and immediately you've lost,
because the bots' team captured enough regions to win. What is this?! I just started and I've already lost!"*

**What we do NOT know:** the map, the map size, the number of teams, the bot count, whether it was solo or
multiplayer, whether a timer was set, how long "immediately" really was, or the game version. One review, no
reproduction. Do not treat it as more than a lead.

### What the code says today (producer-read 2026-10-22 — re-verify by symbol, line numbers drift)

- **Team win rule.** `WinCheckExecution.checkWinnerTeam()` (`src/core/execution/WinCheckExecution.ts`) adds up tiles
  per team every 10 ticks. A team wins when it holds **more than 95 %** of land without fallout
  (`DefaultConfig.percentageTilesOwnedToWin()` → `95` in Team mode, `80` in FFA), **or** when the lobby timer runs out
  (whoever leads). The check does not run during the spawn phase (`activeDuringSpawnPhase()` → `false`).
- **All bots are one team.** In Team mode every `PlayerType.Bot` goes to a single `ColoredTeams.Bot` team
  (`GameImpl.maybeAssignTeam()`). The default bot count is **400** in both the solo window
  (`SinglePlayerModal.ts`, `bots = 400`) and public lobbies (`MapPlaylist.ts`). So one "Bot" team holds the land of up
  to 400 bots against human teams of a handful of players.
- **The Bot team can win only in solo play.** The guard turns the Bot team away when `gameType !== Singleplayer`.
  In **solo** (non-tutorial) Team games the Bot team **is** allowed to win — added deliberately by task `0140`
  (PR #77) so solo Team games can end. ⛔ That clause must not simply be deleted — the wiki records that doing so
  brings back a solo Team stall (see `wiki/tasks/solo-win-condition-fix.md`).
- **In multiplayer, a Nations team can win.** The Team guard is narrower than the FFA one: it turns away
  `ColoredTeams.Bot` only, so in **Humans Vs Nations** (in the public rotation with NPCs on, and host-selectable in
  private lobbies) the all-Nations team **is** declared the winner. A player could easily call Nations "bots".
- **The words in the review match the solo loss screen almost exactly.** `win_modal.opponent_won_title` /
  `opponent_won_body` in `resources/lang/ru.json` read **"Вы проиграли"** / **"Противник захватил достаточно
  территории для победы."** That screen is shown only by `WinModal.isSoloOpponentWin()`, which returns `true` **only
  in non-tutorial solo games** while the player is still alive. In multiplayer the player would instead see
  «Команда «{team}» победила!» (`other_team`). ⚠️ **This points to solo Team mode as the leading hypothesis — it
  does not prove it.** The player may be paraphrasing.
- **Solo missions are FFA** (`Main.ts`, mission config `gameMode: GameMode.FFA`), so a mission is not the source;
  the solo path is the solo game window with **Teams** picked.

### Hypotheses to test (none confirmed)

| # | Hypothesis | Why it is plausible |
|---|---|---|
| H1 | **Solo Team mode: the 400-bot team crosses 95 % very fast**, especially on small maps or small map sizes, and wins while the player is still building. | Matches the screen text; Bot team allowed to win in solo; `0205`'s simulation (World map, idle humans, multiplayer config) saw the Bot team cross 95 % in **≈ 7–10 minutes** — on a smaller map it could be far sooner. |
| H2 | **Solo Team mode: the Bot team wins at the very first check after spawn** on some map/size where 400 bots already cover > 95 % of land. | The literal reading of "immediately". Possible on small maps; unmeasured. |
| H3 | **Solo Team mode with a short timer** — the timer ends and the Bot team leads. | The timer is player-settable in the solo window. Also check the timer's real-time length: `timeElapsed` divides ticks by 10, while ticks run 1.5× faster in this fork (`// Flashist Adaptation`, ~66.7 ms) — confirm whether a "N minute" timer ends in fewer real minutes. |
| H4 | **Multiplayer Humans Vs Nations: the Nations team wins** and the player calls it "bots". | Nations team is allowed to win; `0205`'s sim saw Nations win **4/4**. Weaker fit to the screen wording. |
| H5 | Something else (a client display bug, a team-assignment edge such as the player alone on a team, a reconnect into an already-decided match). | Keep open; report if found. |

### Related work — real status checked 2026-10-22

| Task | What | Status | Bearing |
|---|---|---|---|
| [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md) | Teams **multiplayer**: Bot team leads → match unwinnable; owner ruled *"next-highest human team wins"* | 🔲 Backlog, **unbuilt** | Multiplayer only. Its policy is the obvious candidate to extend to solo, but that is an **owner** decision — this task must not assume it. |
| [`0242`](../0242-ffa-and-team-match-stall-runs-to-cap-with-no-winner-declared/brief.md) | FFA + Team match stall runs to the 3-hour cap with no winner | 🔲 Backlog | Same win-check code; multiplayer stall, the opposite symptom. |
| [`0140`](../../done/0140-solo-win-condition-fix/brief.md) | Let the Bot team win in **solo** Team games; added the "You lost — an opponent won" screen | ✅ Done | **The change that makes H1–H3 possible.** Deliberate; not a regression. |
| [`0022`](../../done/0022-win-check-multiplayer-regression-investigation/brief.md) | Win-check regression investigation; produced the clientless-leader guard | ✅ Done | Background. Its "revert the Singleplayer clause" fix was **rejected by owner ruling**. |
| [`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md) | FFA timer expiry award | ✅ Done on Sprint 4, but **behaviour reverted 2026-09-04, never deployed** (per its Backlog row) | Not live; do not cite as current behaviour. |
| [`0208`](../../done/0208-measure-clientless-leader-at-win-condition-in-production/brief.md) | Measured the clientless leader at the win condition | ✅ Done (agent-closed — not owner-verified), with recorded untested items | Its `Match:WinCondition` event **excludes solo** — see Data below. |
| [`0211`](../../done/0211-credit-participation-xp-at-elimination-or-match-end/brief.md) | Participation XP at elimination or match end | ✅ Done (agent-closed — not owner-verified) | Background only. |

**ADR-110** (`ai-agents/knowledge-base/decisions/adr-110-ai-player-may-be-declared-winner.md`): an `AiPlayer`
(it has a real client ID) may win; **Bots and Nations stay excluded** from that ADR's scope. The wiki notes the Team
side is carried by `0205`, unbuilt.

### Data that exists to size it (producer-checked against `analytics-event-reference.md`)

- `Match:Loss:OpponentWon` — fired when the solo loss screen is shown. **Not split by FFA vs Team**, and a
  **lower bound** (skipped if the player is already dead).
- `Match:Duration` — seconds from a fresh `Game:Start` to the match end; can show how soon solo losses happen.
- `Game:Mode:Solo` / `Game:Mode:Multiplayer`, `Game:Loss`, `Game:Abandon`.
- `Match:WinCondition:{TeamPublic|TeamPrivate}:{Threshold|Timer}:{BotTeam|NationsTeam|HumanTeam}` with the leader's
  land share as value — **multiplayer only; solo is dropped on purpose** (`WinConditionAnalytics.ts`). It can size H4,
  not H1–H3.
- `Match:Leaderboard:Award:*:{Solo|SoloTutorial}` — solo placement won/lost, not mode-split.
- ⚠️ **Gap:** no event today records **solo Team vs solo FFA**, the bot count, the map, or the winning team kind for
  solo games. The investigation should say what can and cannot be sized from what exists — and **not** add events in
  this task without the owner's say-so (adding one is a separate, small brief).

## What to build

An investigation and a findings report. In order:

1. **Reproduce.** Run solo Team games (headless deterministic simulation, like `0205`'s method, plus at least one
   live run in the real client) with the **shipped solo defaults** (400 bots, default difficulty), across a spread of
   maps **and** map sizes, including the smallest. Record, per run: time from spawn-phase end to the win, in ticks and
   in real seconds; which team won; the winner's land share; whether the threshold or the timer fired. Cover idle and
   active play (use the `0205` activity-sweep idea; note that `FakeHumanExecution` plays better than a casual human).
2. **Test H2 directly.** For every map × size, compute the Bot team's land share at the first win check after the
   spawn phase. Name every combination where it is already over 95 %.
3. **Test H3.** Confirm the real-time length of a solo timer of N minutes, given the 1.5× tick rate.
4. **Test H4.** Run Humans Vs Nations (public config) and record how early the Nations team wins. Read the existing
   `Match:WinCondition:*:NationsTeam` data for early wins (value = land share; pair with `Match:Duration` if a join is
   possible — say if it is not).
5. **Size it from data that exists** (GameAnalytics, read-only): solo loss-by-opponent rate, and how soon those
   losses come (`Match:Duration` distribution for solo `Match:Loss:OpponentWon`), stating every limit (no mode split,
   lower bound, attempts vs matches).
6. **Write the findings report** at `ai-agents/knowledge-base/reports/<date>-0476-team-game-lost-at-start-findings.md`:
   which hypotheses held, the evidence, the size, and **one recommendation with its main trade-off**, plus the
   alternatives considered. Candidate directions to weigh — **not** pre-decided: fewer bots by default in solo Team
   mode; scaling bots to map size; splitting bots across several teams; a short no-win grace period after spawn;
   extending `0205`'s "next-highest human team wins" to solo; a clearer loss message. Each must say what it changes
   for the player and what it costs.
7. **Plan gate:** the owner rules on the recommendation. If a fix is chosen, it is filed as a **separate brief**
   unless the owner rules it is built here.

Read-only on production data. No secrets, endpoints or connection strings in the report.

## Verification steps

1. The report exists at the path above and states, for **each** of H1–H5: confirmed / refuted / not testable, with the
   evidence (run counts, maps, sizes, tick and real-time numbers).
2. The report includes a table of map × size → Bot-team land share at the first post-spawn check, covering **every**
   map in the solo window, and names any combination over 95 %.
3. The report states the real-time length of a solo timer of N minutes, with how it was measured.
4. At least one **live client run** (not only simulation) reproduces the leading hypothesis, or the report says
   plainly that it could not be reproduced live.
5. The sizing section names each analytics event used, its window, and its limits (lower bound, no mode split,
   solo excluded from `Match:WinCondition`); no number is presented as a match count where it is a client-match or
   attempt count.
6. The recommendation is **one** option with its main trade-off, and lists any owner decision it needs — including
   whether it touches the `0205` policy or the `0140` solo clause (which must not be deleted outright).
7. No source file under `src/` is changed by this task (`git diff --stat src/` shows nothing from it). Any
   simulation harness lives under `tests/` or a scratch location and is noted in the worklog.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing yet (any fix brief that follows will depend on this one).
- **Related, not merged:** `0205` (multiplayer Bot-team stall policy, unbuilt), `0242` (multiplayer stall to the
  3-hour cap), `0140` (solo Bot-team win, the deliberate change behind H1–H3).
- **Why one brief, not several:** it is one question — why a Team game ends "immediately" for this player — and the
  hypotheses share one method and one report. The fix (if any) is a later, separate brief, because its shape depends
  on which hypothesis holds.
- **Producer's call, not the owner's:** that no fix is built in this task, and the hypothesis list above. The owner
  asked only for an investigation.
- **Player-facing weight:** a public 3/5 review on Yandex Games, citing this as the **one** reason for the low score.
- ~~⚠️ **Priority is append rank, NOT a merit ranking — flagged for owner confirmation.**~~ **Resolved 2026-10-22 by
  OWNER RULING** (relayed; see `## Priority`): *"Right under 0205 (Recommended)"* — the row now sits directly below
  `0205`. The producer's merit case, kept for the record: same Bot-team win-check family, and its fix may extend
  `0205`'s ruled policy to solo (the filing had noted the owner might prefer it above `0205`, being player-reported and
  user-visible).
