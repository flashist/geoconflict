# Singleplayer Platform-Leaderboard Reporting Policy (task 0210)

**Source**: `ai-agents/tasks/backlog/0210-singleplayer-platform-leaderboard-reporting-policy/brief.md`
**Status**: backlog
**Sprint/Tag**: Backlog board — unscheduled (owner ruled the same day that `0209` and `0210` stay unscheduled; Sprint 4 has a deploy to get through)

> 🚨 **A live, farmable defect: in non-tutorial Singleplayer, a human who LOSES to a bot is awarded
> first-place platform-leaderboard points.** Same shape as the tutorial bug `0022` fixed —
> **still live, touched by neither `0022` nor `0206`.**
>
> ⚠️ **This is NOT a `0206` regression and must not be described as one.** It is pre-existing, and
> `0206` correctly guards its **own new branch** against it.

## Goal

Implement the owner's 2026-09-03 ruling: **Singleplayer reports nothing to the platform leaderboard —
no participation, no placement.**

## Key Changes

*Nothing built yet.*

### The path, verified step by step 2026-09-03

1. **The win check does not stop it.** When the leader at the win condition is clientless, the outer
   guard is `gameType !== GameType.Singleplayer || gameConfig.isTutorial === true`. For **non-tutorial
   Singleplayer both disjuncts are false**, so the whole protective block — including `0206`'s new
   fallback award **and** its own `if (gameType === Singleplayer) return;` — is **skipped entirely.**
   Control falls through to `setWinner(max, …)` with `max` being the bot.
2. **A `Win` update is emitted** via `GameImpl.makeWinner()`, which has a Singleplayer-specific branch
   for a clientless winner.
3. **The client treats any `Win` update as game-over** — `gameEnded` is set from the update's presence
   and **does not read who won** — then calls `reportPlacements()`.
4. **`reportPlacements()` ignores the winner.** Its parameter is `_winUpdate`, **underscore-prefixed
   because it is deliberately unused.** It ranks **humans only**, by `numTilesOwned()`. Singleplayer has
   exactly **one** Human — every opponent is a Bot, Nation or AI player — so `myIndex === 0`,
   unconditionally.
5. **First-place points reach the platform.** `awardTable[0]` = **10** → `reportPlacement()` →
   `increaseCurPlayerLeaderboardScore(10)`.

🔴 **The client's leaderboard path has no game-type awareness whatsoever.** ✅ Verified by grep:
`Singleplayer|gameType|isTutorial` returns **zero hits** across `ClientGameRunner.ts`,
`src/client/leaderboard/` and `src/client/flashist-game/`. **There is no Singleplayer guard to repair —
there has never been one.**

**The irony is written into the code.** `0206`'s own comment justifies its Singleplayer `return` by
saying that awarding the single Human the win for losing to a bot *"would hand them first-place
platform-leaderboard points via `ClientGameRunner.reportPlacements()` — the exact bug `0022` fixed."*
**That reasoning is correct and the guard is right to exist** — but it only protects the **new
fallback-award branch.** The **pre-existing fall-through** hands over exactly the same points, and
always has.

### 🔴 Participation is in scope too, and it is the farmable path

`reportParticipation()` also has **no game-type guard**. Every Singleplayer match **started** awards
**1** point. It needs **no win, no loss, and no opponent** — start, quit, repeat. The ruling says
*reports nothing*, and that covers participation. ⛔ **A guard on `reportPlacements()` alone leaves the
farmable path open.**

### 📌 Owner ruling 2026-09-03 — **A: Singleplayer reports nothing**

**Reasoning:** Singleplayer is **unranked practice against bots** and is **trivially farmable**, so
points earned there **devalue the leaderboard for real multiplayer play**. It is also the **simplest
guard to add and to reason about.**

| # | Answer | Disposition |
|---|---|---|
| **A** | Singleplayer reports nothing | ✅ **RULED** |
| **B** | Report only when the human actually won | ⛔ **REJECTED** — keeps a solo reward the owner judges shouldn't exist: *winning* against bots is no more leaderboard-worthy than losing. Costlier too (tagged-tuple winner, three shapes), and drags in a separate multiplayer question. ⚠️ **Doubly moot** — B presumed a **winner-relative** `placement`, and `0209` was ruled **rank-among-humans** the same day. **Dead on both counts. Do not revive it.** |
| **C** | Leave it, accept the inflation | ⛔ **REJECTED** — farmability judged decisive: an unranked solo mode that mints leaderboard points devalues the board **regardless of how rare solo play turns out to be**, so unmeasured incidence does not rescue it |

🔴 **The load-bearing consequence for whoever plans this: the guard must be ADDED, not repaired.**
Nothing exists to fix; the whole guard is new code. **Choosing the seam is the plan's call** —
`LeaderboardReporter` is the chokepoint both callers funnel through and is the harder place to bypass,
but **it currently has no access to game type**, so the choice has a real cost either way.
⚠️ **`0208` Part B faces the same seam problem — coordinate**, or whichever lands second will conflict.

- **Decide explicitly whether the tutorial is included, and say so in the plan.** A naive
  `gameType === Singleplayer` guard already covers it — very likely correct, but it should be a
  **stated decision, not an accident of the predicate.**
- ⛔ **Do not change `awardTable` or the point values** — they are correct, and they are the part that
  **does** reach the platform. ⛔ **Do not touch `WinCheckExecution`** — `0206`'s guard there is right;
  the defect is downstream of it, in the client. ⛔ **Do not fold in `0209`.**

## Outcome

**Not started. 📌 Unblocked 2026-09-03 by the ruling; ready to plan.** Owner is now `fkit-coder`.

**Priority `Medium` — the producer's rank, not an owner ruling — and ranked above `0209`.** The rank
difference rests on one fact: **`0209`'s wrong value never leaves the client; this one's does.** Points
genuinely reach the Yandex leaderboard; it is farmable; and the leaderboard is a live, player-visible
ranking surface while citizenship/monetisation work is building around player status.
**Not ranked on incidence.**

### ⚠️ Two things nobody has done

| Claim | Status |
|---|---|
| The code path above, step by step | ✅ **Verified by reading the source** |
| No game-type guard exists anywhere in the client reporting path | ✅ **Verified by grep** |
| A live Singleplayer loss actually credits 10 points on the real Yandex board | ⚠️ **NOT verified — nobody ran it.** The path says it does. **Reproduce before fixing** |
| How often non-tutorial Singleplayer ends this way | ⚠️ **Unmeasured** — [[tasks/measure-clientless-leader-and-solo-awards]] Part B is that measurement |

**Verification keeps the reproduction step even though the ruling is settled** — *reproduce the current
behaviour first and record what you saw*, because nobody has observed it live and the ruling did not
change that. ⚠️ **Do not test against production** — a local/dev Yandex context only. The regression
step that matters is step 3: **confirm multiplayer is unaffected**, since a loosely written guard could
silence the real FFA/Team leaderboard, which is `0206`'s entire point.

### 🔴 `0208` does NOT gate this task

`0208` was widened the same day to measure Singleplayer award incidence, **because this task's guard
makes that rate permanently unobservable the moment it ships.** But the ruling here was **explicitly
not conditioned on incidence** — option C was rejected on farmability. ⛔ **Do not add a "blocked by
`0208`" marker, do not hold this plan waiting for a number, and do not re-file this as dependent.**
`0208` is a **consumer of this task's context, not a predecessor.** **If the two collide, this task
wins and `0208` loses its window** — the owner accepted that trade in advance.

**ADR-110 does not pre-answer this.** It governs **who may be declared winner**; it says nothing about
**who receives leaderboard points.**

## Related

- [[tasks/ffa-clientless-leader-fallback-award]] — task `0206`, whose plan §8 filed this, and whose Singleplayer early-return guards only its own new branch
- [[tasks/win-check-clientless-leader-guard]] — task `0022`, which fixed this same shape for the **tutorial** only
- [[tasks/placement-semantics-literal-one]] — task `0209`, the sibling on the orthogonal axis (*what the number means* vs *which modes report at all*); the split was owner-confirmed and their pairing is coherent
- [[tasks/measure-clientless-leader-and-solo-awards]] — task `0208`, whose Part B measures this rate and whose window this task's guard closes
- [[decisions/clientless-leader-win-policy]] — the win policy, and the `placement`/`points` keep-them-apart table
- [[decisions/adr-110-ai-winner-allowed]] — governs who may WIN, not who receives points; it does **not** pre-answer this
- [[features/tutorial]] — where the same shape was already fixed, and the reason the tutorial's inclusion here must be a stated decision
- [[decisions/sprint-backlog]] — the board this sits on, unscheduled
- [[decisions/sprint-4]] — the sprint whose task `0206` spawned this brief; ⚠️ **this task is NOT on that board**, it sits unscheduled on the Backlog board
