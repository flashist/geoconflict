# Singleplayer Platform-Leaderboard Reporting Policy (task 0210)

**Source**: `ai-agents/tasks/backlog/0210-singleplayer-platform-leaderboard-reporting-policy/brief.md`
**Status**: backlog
**Sprint/Tag**: Backlog board — unscheduled (owner ruled the same day that `0209` and `0210` stay unscheduled; Sprint 4 has a deploy to get through)

> 🚨 **A live, farmable defect: in non-tutorial Singleplayer, a human who LOSES to a bot is awarded
> first-place platform-leaderboard points.** Same shape as the tutorial bug `0022` fixed —
> **still live, touched by neither `0022` nor `0206`.**
>
> ⚠️ **This is NOT a `0206` regression and must not be described as one.** It is pre-existing, and
> `0206` correctly guarded its **own new branch** against it.
>
> ### 🔴 2026-09-04 — `0206` WAS REVERTED. THE CODE TRACE BELOW CITES CODE THAT NO LONGER EXISTS.
>
> **Owner ruling given live in session.** `0206`'s behaviour was reverted before it ever reached a
> player and **was NEVER DEPLOYED.** Its plan's **premise** was disproved by measurement; ⛔ it was
> **not** defective and did **not** cause the stall.
>
> ✅ **THIS TASK'S DEFECT IS COMPLETELY UNAFFECTED, and the revert STRENGTHENS this page's central
> claim.** *"Still live, touched by neither `0022` nor `0206`"* was already true and is now true in a
> stronger sense: **`0206` never even reached production.** The Singleplayer first-place-for-losing
> path is **pre-existing, untouched, and still live.** The owner's 2026-09-03 ruling (option A) is
> **not reopened**, the rank is unchanged, and nothing is gated or unblocked.
>
> ⚠️ **WHAT GOES STALE — read before trusting any line number or quoted comment below:**
> **Step 1 and the *"irony"* passage cite `0206`'s code.** After the revert, **`0206`'s fallback-award
> branch and its Singleplayer `return` are GONE, and every line number in that file shifts.**
> ⚠️ **The `0022` guard is a DIFFERENT thing and it STAYS** — `0022` is not reverted. ⛔ Do not read
> this as saying the whole guard disappeared.
> 🔴 **Do NOT re-verify by line number. Locate by symbol** (`checkWinnerFFA`, `makeWinner`,
> `reportPlacements`). ✅ **The trace's CONCLUSION is unaffected** — the client leaderboard path has
> **no game-type awareness whatsoever**, and that path is in `src/client/`, which `0206` never touched.

## Goal

Implement the owner's 2026-09-03 ruling: **Singleplayer reports nothing to the platform leaderboard —
no participation, no placement.**

## Key Changes

*Nothing built yet.*

### The path, verified step by step 2026-09-03

1. **The win check does not stop it.** When the leader at the win condition is clientless, the outer
   guard is `gameType !== GameType.Singleplayer || gameConfig.isTutorial === true`. For **non-tutorial
   Singleplayer both disjuncts are false**, so the whole protective block is **skipped entirely.**
   Control falls through to `setWinner(max, …)` with `max` being the bot.
   ⚠️ **As written 2026-09-03 this also named `0206`'s fallback award and its own
   `if (gameType === Singleplayer) return;`. 🔴 Both were REVERTED 2026-09-04 and are gone** — but
   **the fall-through described here is the `0022`-era code, is untouched, and still holds.**
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

**The irony was written into the code.** `0206`'s own comment justified its Singleplayer `return` by
saying that awarding the single Human the win for losing to a bot *"would hand them first-place
platform-leaderboard points via `ClientGameRunner.reportPlacements()` — the exact bug `0022` fixed."*
**That reasoning was correct and the guard was right to exist** — but it only protected the **new
fallback-award branch.** The **pre-existing fall-through** hands over exactly the same points, and
always has.
🔴 **Both that comment and that guard were REVERTED 2026-09-04 and are no longer in the file.**
⚠️ **The point survives the revert intact, and is now cleaner:** there is no new branch to protect,
and **the pre-existing fall-through — the actual defect this task owns — is entirely unchanged.**

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
  **does** reach the platform. ⛔ **Do not touch `WinCheckExecution`** — **the defect is downstream of
  it, in the client**, and that is why. *(As written 2026-09-03 this reason read "`0206`'s guard there
  is right"; 🔴 that guard was reverted 2026-09-04. **The instruction stands on its own reasoning.**)*
  ⛔ **Do not fold in `0209`.**

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
silence the real FFA/Team leaderboard. *(This reason was written as "which is `0206`'s entire point";
🔴 `0206` was reverted 2026-09-04. **The multiplayer leaderboard matters on its own account** — the
regression step is unchanged.)*

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

- [[tasks/ffa-clientless-leader-fallback-award]] — task `0206`, whose plan §8 filed this. 🔴 **REVERTED 2026-09-04 — its Singleplayer early-return is gone; this task's defect is untouched by that**
- [[tasks/credit-participation-xp-elimination-or-match-end]] — task `0211`. ⚠️ **This task's ruling is about platform LEADERBOARD POINTS; `0211` is about profile XP. ⛔ The two must NOT be read across** — that risk is why `0211`'s Singleplayer scope needed its own ruling
- [[tasks/win-check-clientless-leader-guard]] — task `0022`, which fixed this same shape for the **tutorial** only
- [[tasks/placement-semantics-literal-one]] — task `0209`, the sibling on the orthogonal axis (*what the number means* vs *which modes report at all*); the split was owner-confirmed and their pairing is coherent
- [[tasks/measure-clientless-leader-and-solo-awards]] — task `0208`, whose Part B measures this rate and whose window this task's guard closes
- [[decisions/clientless-leader-win-policy]] — the win policy, and the `placement`/`points` keep-them-apart table
- [[decisions/adr-110-ai-winner-allowed]] — governs who may WIN, not who receives points; it does **not** pre-answer this
- [[features/tutorial]] — where the same shape was already fixed, and the reason the tutorial's inclusion here must be a stated decision
- [[decisions/sprint-backlog]] — the board this sits on, unscheduled
- [[decisions/sprint-4]] — the sprint whose task `0206` spawned this brief; ⚠️ **this task is NOT on that board**, it sits unscheduled on the Backlog board
