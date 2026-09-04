# Decide whether Singleplayer should report to the platform leaderboard at all — today it awards first place for losing to a bot

## ID
0210

> ℹ️ **ID allocation, checked 2026-09-03 before filing** — same four checks as
> [`0209`](../0209-define-placement-semantics-and-fix-literal-one/brief.md), run once for the pair.
> `0210` is free: **zero hits** for `0210` across `ai-agents/`, `.claude/` and `src/`. Highest ID in use
> anywhere before this pair was **`0208`**.
> ⛔ **`0204`** (invisibly reserved in `.claude/skills/fkit-sprint-ship-loop/SKILL.md`) and
> **`0241`–`0247`, `0264`, `0265`** (the fkit toolkit's own numbering under `.claude/skills/fkit-heal/`)
> are **not free** and were not considered. Full reasoning in `0209`'s brief.

## Sprint
Backlog — unscheduled. Filed on [`backlog.md`](../../../sprints/backlog.md).
**Row appended, not inserted** (ADR-035).

## Priority
**Medium — the producer's rank, not an owner ruling. Ranked above
[`0209`](../0209-define-placement-semantics-and-fix-literal-one/brief.md).**

The rank difference is deliberate and rests on one fact: **`0209`'s wrong value never leaves the client;
this one's does.**

- **Points genuinely reach the Yandex leaderboard.** `increaseCurPlayerLeaderboardScore(points)` is the
  real platform call, and in non-tutorial Singleplayer it is handed **10** — the first-place award — to a
  player who **lost**.
- **It is farmable.** Singleplayer has no opponent to beat and no matchmaking cost. Start a match, lose
  it, take 10 points.
- **The leaderboard is a live, player-visible ranking surface**, and citizenship/monetisation work is
  building around player status.
- ~~**But it is a decision, not a bug report** — so it is Medium and not High. Nobody should ship a fix
  before the owner rules on the question in *What to Decide*.~~
  📌 **RULED 2026-09-03 — the decision is made (option A, see *What to Decide*). Medium stands as the
  rank**, but the reason has changed: it is no longer held back by an open question, it is ordinary
  scheduled work.

**Not ranked on incidence, and that has not changed.** Nobody has measured how often non-tutorial
Singleplayer awards these points.
~~[`0208`](../0208-measure-clientless-leader-at-win-condition-in-production/brief.md) is the measurement
task for the multiplayer side of the same question; **it does not cover Singleplayer**, and that gap is
itself an open question below.~~
📌 **RULED 2026-09-03 — *"Add it — measure both."* [`0208`](../0208-measure-clientless-leader-at-win-condition-in-production/brief.md)
was widened to cover Singleplayer award incidence too.** See the ruling in the Notes.
🔴 **This changes nothing here.** The rank was never based on incidence and still is not; `0208`
**does not gate this task**, and this task's status, scope and owner are unchanged by the widening.

## Status
🔲 Backlog

~~**Blocked on nothing mechanically — but do not write code until the owner has answered *What to
Decide*.** The resolution shape depends entirely on that answer.~~

📌 **UNBLOCKED 2026-09-03 by owner ruling — the decision is settled and this is now ready to plan.**
Nothing gates it. Nobody is building it.

## Owner
~~**fkit-producer** for the decision (with the owner). **fkit-coder** afterwards, if the decision needs
code.~~
**fkit-coder.** 📌 The producer/owner decision is done (2026-09-03).

---

## Context

**In non-tutorial Singleplayer, a human who loses to a bot is awarded first-place platform-leaderboard
points.** Same shape as the tutorial bug [`0022`](../../done/0022-win-check-multiplayer-regression-investigation/brief.md)
fixed — **still live, touched by neither `0022` nor `0206`.**

> ### 🔴 2026-09-04 — `0206` WAS REVERTED. THE CODE TRACE BELOW CITES CODE THAT NO LONGER EXISTS.
>
> **Owner ruling given live in session, 2026-09-04.** `0206`'s row still reads `✅ Done` —
> **correctly, the work was done** — **but its behaviour was reverted before it ever reached a player
> and was NEVER DEPLOYED.** The plan's **premise** was disproved by measurement; `0206` was **not**
> defective and did **not** cause the stall.
>
> ✅ **THIS TASK'S DEFECT IS COMPLETELY UNAFFECTED, and the revert strengthens the brief's central
> claim.** The sentence directly above — *"still live, touched by neither `0022` nor `0206`"* — was
> already true and is now true in a stronger sense: `0206` never even reached production. The
> Singleplayer first-place-for-losing path is **pre-existing, untouched, and still live.** The owner's
> 2026-09-03 ruling (option A — Singleplayer reports nothing) is **not reopened**, the rank is
> unchanged, and nothing is gated or unblocked.
>
> ⚠️ **WHAT DOES GO STALE — read this before trusting a line number or a quoted comment below:**
>
> - **Steps 1 and the *"irony"* passage cite `0206`'s code**, which is being reverted:
>   `WinCheckExecution.ts:74-92`, the quoted justification comment at `:85-89`, *"including `0206`'s
>   new fallback award **and** its `if (gameConfig.gameType === GameType.Singleplayer) return;`"*, and
>   the fall-through at `:108`. **After the revert, `0206`'s fallback-award branch and its
>   Singleplayer `return` are GONE, and every line number in that file shifts.**
> - ⚠️ **The `0022` guard is a DIFFERENT thing and it STAYS** — `0022` is not reverted. Do not read
>   this note as saying the whole guard disappeared.
> - 🔴 **Do NOT re-verify by line number. Locate by symbol** (`checkWinnerFFA`, `makeWinner`,
>   `reportPlacements`) and re-read the file at plan time. The *conclusion* of the trace — the client
>   leaderboard path has **no game-type awareness whatsoever**, `ClientGameRunner.ts` and
>   `src/client/leaderboard/` return **zero hits** for `Singleplayer|gameType|isTutorial` — is in
>   `src/client/`, which `0206` never touched, so **it is unaffected by the revert.**
>
> 📎 Full record: the STOP box at the top of
> [`0206`'s brief](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md).
> Replacement task: [`0211`](../0211-credit-participation-xp-at-elimination-or-match-end/brief.md),
> unscheduled on the Backlog board.

✅ **Producer-verified 2026-09-03 by reading the full path.** Each step, with evidence:

1. **The win check does not stop it.** `src/core/execution/WinCheckExecution.ts:74-92`. When the leader
   at the win condition is clientless (`max.clientID() === null`), the outer guard is
   `gameType !== GameType.Singleplayer || gameConfig.isTutorial === true`. For **non-tutorial
   Singleplayer** both disjuncts are false, so the whole protective block — including `0206`'s new
   fallback award **and** its `if (gameConfig.gameType === GameType.Singleplayer) return;` — is
   **skipped entirely**. Control falls through to `this.mg.setWinner(max, …)` at `:108`, with `max`
   being the bot.
2. **A `Win` update is emitted.** `setWinner` → `GameImpl.makeWinner()`
   (`src/core/game/GameImpl.ts:662`, `:667-687`), which has a Singleplayer-specific branch for a
   clientless winner at `:678-681`.
3. **The client treats any `Win` update as game-over.** `ClientGameRunner.ts:516` sets
   `gameEnded = gu.updates[GameUpdateType.Win].length > 0` — **it does not read who won.**
   `:530-536` then calls `reportPlacements(winUpdate)`.
4. **`reportPlacements()` ignores the winner.** Its parameter is `_winUpdate` — **underscore-prefixed
   because it is deliberately unused.** It ranks **humans only**, by `numTilesOwned()`
   (`ClientGameRunner.ts:409-418`). In Singleplayer there is exactly **one** Human — every opponent is
   `PlayerType.Bot`, `FakeHuman` or `AiPlayer` — so `myIndex === 0`, unconditionally.
5. **First-place points are sent to the platform.** `points = awardTable[0]` = `first` = **10**
   (`FlashistGameSettings.ts:10-15`) → `reportPlacement()` →
   `FlashistFacade.instance.increaseCurPlayerLeaderboardScore(10)`
   (`LeaderboardReporter.ts:44-49`, `FlashistFacade.ts:1372`).

🔴 **The client's leaderboard path has no game-type awareness whatsoever.**
`grep -n "Singleplayer\|gameType\|isTutorial" src/client/ClientGameRunner.ts` → **zero hits**; the same
grep over `src/client/leaderboard/` and `src/client/flashist-game/` → **zero hits**. There is no
Singleplayer guard to repair — **there has never been one.**

**The irony is written into the code.** `WinCheckExecution.ts:85-89` justifies `0206`'s Singleplayer
`return` like this:

> *"awarding its single Human the win for LOSING to a bot would hand them first-place
> platform-leaderboard points via `ClientGameRunner.reportPlacements()` — the exact bug `0022` fixed."*

That reasoning is **correct**, and `0206`'s guard is right to exist. But it only protects the **new
fallback-award branch**. The **pre-existing fall-through** at `:108` hands over exactly the same points,
and always has.

### A second facet of the same question — participation points

`reportParticipation()` also has **no game-type guard**
(`ClientGameRunner.ts:504-514` → `LeaderboardReporter.ts:22-36`). Every Singleplayer match **started**
awards `participation` = **1** point. Whatever the owner decides about placement points should cover
this too — it is the same surface and the same farmability argument.

### ⚠️ What is verified, and what is not

| Claim | Status |
|---|---|
| The code path above, step by step | ✅ **Verified by reading the source, 2026-09-03** |
| No game-type guard exists anywhere in the client reporting path | ✅ **Verified by grep** |
| A live Singleplayer loss actually credits 10 points on the real Yandex board | ⚠️ **NOT verified — nobody ran it.** The path says it does. **Reproduce before fixing.** |
| How often non-tutorial Singleplayer ends this way | ⚠️ **Unmeasured.** `0208` measures the multiplayer side only. |

## ~~What to Decide~~ → 📌 DECIDED

### 📌 Owner ruling, 2026-09-03 — **A: Singleplayer reports nothing.**

**Given live in session. This is a ruling, not a recommendation.**

> **Singleplayer reports nothing to the platform leaderboard — no participation, no placement.**

**The owner's reasoning, as put to them and accepted:**
- Singleplayer is **unranked practice against bots** and is **trivially farmable**, so points earned
  there **devalue the leaderboard for real multiplayer play**.
- It is also the **simplest guard to add and to reason about**.

🔴 **The load-bearing consequence for whoever plans this: a guard must be ADDED, not repaired.**
There is **no game-type awareness anywhere** in the client leaderboard path — ✅ verified,
`grep -n "Singleplayer\|gameType\|isTutorial"` returns **zero hits** across `ClientGameRunner.ts`,
`src/client/leaderboard/` and `src/client/flashist-game/`. Nothing exists to fix; the whole guard is new
code.

🔴 **And `reportParticipation()` is in scope, not just `reportPlacements()`.** It is unguarded too
(`ClientGameRunner.ts:504-514`), so every Singleplayer match **started** awards **1** point. The ruling
says *reports nothing* — that covers participation.

~~**This is a product question. It is the owner's, not the coder's, and not the producer's alone.**~~
~~Three coherent answers, with the trade-off each buys:~~

**The options as they were weighed. Recorded so nobody reopens them as though they were never
considered.**

| # | Answer | Disposition |
|---|---|---|
| **A** | **Singleplayer reports nothing** — no participation, no placement | ✅ **RULED 2026-09-03.** Reasoning above. Was the producer's recommendation; the owner took it. |
| **B** | ~~**Singleplayer reports only when the human actually won**~~ — `reportPlacements()` reads `_winUpdate.winner` instead of ignoring it | ⛔ **CONSIDERED AND REJECTED 2026-09-03.** It would keep a solo reward the owner judges shouldn't exist — Singleplayer is unranked practice, so *winning* against bots is no more leaderboard-worthy than losing. It also costs more (the winner is a tagged tuple with three shapes) and drags in the separate multiplayer question of whether the top human in a bot-won FFA earns first place. ⚠️ **Doubly moot:** B presumed a **winner-relative** definition of `placement`, and [`0209`](../0209-define-placement-semantics-and-fix-literal-one/brief.md) was ruled **rank-among-humans** the same day. **B is dead on both counts. Do not revive it.** |
| **C** | ~~**Leave it — accept the inflation**~~ | ⛔ **CONSIDERED AND REJECTED 2026-09-03.** The owner judged the farmability decisive: an unranked solo mode that mints leaderboard points devalues the board regardless of how rare solo play turns out to be, so the unmeasured incidence does not rescue this option. |

~~⛔ **Do not pick one of these in a plan.** Route it to the owner.~~
📌 **Already routed and ruled. The plan implements A.**

## What to Build — ~~*only after the decision*~~ 📌 *decision made, this is the scope*

**Implement ruling A: add a game-type guard so Singleplayer reports nothing.**

- **Add a game-type guard in the client leaderboard path.** The natural seam is `reportPlacements()`
  **and** `reportParticipation()` in `ClientGameRunner.ts`, or inside `LeaderboardReporter.ts` if the
  guard should be impossible to bypass. **Choosing the seam is the plan's call** — `LeaderboardReporter`
  is the chokepoint both callers already funnel through, but it currently has no access to game type, so
  that choice has a real cost either way.
- 🔴 **Cover participation as well as placement.** The ruling is *reports nothing*. A guard on
  `reportPlacements()` alone leaves `reportParticipation()` minting **1 point per Singleplayer match
  started** — which is the farmable path the ruling exists to close.
- ⚠️ **The guard is NEW code — there is nothing to repair.** Do not go looking for an existing
  game-type check to extend; ✅ verified there is none anywhere in this path.
- **Decide explicitly whether the tutorial is included**, and say so in the plan. It *is* a Singleplayer
  game, so a naive `gameType === Singleplayer` guard already covers it — that is very likely correct
  (the tutorial is the least leaderboard-worthy mode there is), but it should be a stated decision, not
  an accident of the predicate.
- ~~**If B:** `reportPlacements()` must stop ignoring `_winUpdate`. ⚠️ **Read `GameImpl.makeWinner()`
  first** — the winner is a tagged tuple with three shapes (`["team", …]`, `["player", …]`,
  `["opponent", …]`), and `:678-687` has a Singleplayer-specific branch. **A naive
  `winner[0] === "player"` check will get Team mode wrong.**~~ ⛔ **B was rejected — do not implement
  this.**
- ~~**If C:** no code. Record the accepted residual in the knowledge-base and close.~~ ⛔ **C was
  rejected.**
- ⛔ **Do not change `awardTable` or the point values.** They are correct and they are the
  part that reaches the platform.
- ⛔ **Do not touch `WinCheckExecution`.** `0206`'s guard there is right; the defect is downstream of it,
  in the client.
- ⛔ **Do not fold in [`0209`](../0209-define-placement-semantics-and-fix-literal-one/brief.md).** It is a
  separate decision on a different axis — *what the reported number means*, not *which modes report*.
  📌 **The split was confirmed by the owner on 2026-09-03** (see Notes).
  ~~⚠️ **But if the owner picks option B here, read `0209` first**: "report only when the human actually
  won" presumes a **winner-relative** definition of placement, which is `0209`'s option C. Choosing B here
  and A there would be **incoherent**.~~
  📌 **This ordering caveat is MOOT as of 2026-09-03.** Both were ruled the same day — **A** here,
  **rank-among-humans** on `0209` — which is the coherent pairing. **There is no ordering dependency
  left; the two can be planned and shipped in either order, or in parallel.**

## Verification

~~**Whatever the decision, reproduce**~~ **Reproduce the current behaviour first and record what you
saw** — nobody has observed it live, and the ruling did not change that.

1. **Reproduce.** `npm run dev`, start a **non-tutorial Singleplayer** match, lose to a bot. Confirm the
   `[Leaderboard] reportPlacement` debug line prints and carries **10** points.
   **Also confirm the participation call fires on match start** (`[Leaderboard] reportParticipation`,
   1 point) — that is the second half of what the guard must stop.
   ⚠️ **Do not test against production.** A local/dev Yandex context only.
2. **After the fix:** re-run the same scenario and confirm **neither** the placement call **nor** the
   participation call is made in Singleplayer.
   ~~or that it is made only on a genuine human win (B)~~ ⛔ **B was rejected.**
3. **Regression guard — the one that matters:** confirm **multiplayer is unaffected**. A guard written
   loosely could silence the real FFA/Team leaderboard, which is `0206`'s entire point.
4. If the change reaches `src/core/`, **it must be tested** (CLAUDE.md hard rule). A client-only guard
   does not trip that rule, but `WinCheckExecution`-adjacent tests should still be run.
5. `npm run lint` clean and `npm test` green.
   ⚠️ On a `supertest` failure, check CLAUDE.md's known-flake signature, **rule out `0197`'s `SIGSEGV`
   first**, and **say that you re-ran**.

## Notes

- **Origin:** `0206` plan **§8 item 2** (`../../done/0206-ffa-timer-expiry-award-to-top-client-player/plan.md:298-300`),
  where it was found during planning and deliberately left out of scope. That plan records *"Briefs for
  both are the producer's to file."* **Cited, not edited** — `0206`'s folder is off-limits while its
  review is being processed.
- **Filed separately from `0209` on the producer's judgment**, not on an owner ruling. Reasoning: the two
  share a function and a leaderboard surface, but they sit on **orthogonal axes** — `0209` asks *what the
  reported placement number means*, this asks *which game modes should report at all*. Each has a
  standalone answer, each ships alone, and either can be answered "no change" without touching the other.
  ⚠️ **Honest note on the split:** when this pair was filed, `0209` looked like a one-expression fix and
  the split was obvious. It was then rescoped into a design decision too, which makes the two **closer
  than first argued**. The split still holds on the orthogonality above, and on the soft ordering
  recorded in *What to Build* — **but if the owner would rather settle both leaderboard questions in one
  sitting, merging them is defensible.** ~~That is an open question, not a settled call.~~

  📌 **RULED 2026-09-03 — the split stands, and it was confirmed on its merits.** The owner **read the
  honest note above** — including the producer's own weakening of the argument — and kept the two tasks
  separate anyway. **Their reasoning:** the axes remain orthogonal (`0209` = *what the number means*,
  `0210` = *which modes report at all*), **either can be answered "no change" independently**, and
  `0210` carries **real harm that `0209` does not** (its points reach the platform; `0209`'s wrong value
  never leaves the client).
  ⚠️ **The doubt above was weighed and resolved, not overlooked.** Do not read it as an unresolved
  question, and do not re-propose merging without new information.
- **Related:** [`0022`](../../done/0022-win-check-multiplayer-regression-investigation/brief.md) fixed the
  same shape for the **tutorial** only. **ADR-110** (`ai-agents/knowledge-base/decisions/adr-110-ai-player-may-be-declared-winner.md`)
  governs who may be declared winner; it does **not** speak to who receives leaderboard points, so it
  does not pre-answer this. [`0208`](../0208-measure-clientless-leader-at-win-condition-in-production/brief.md)
  measures clientless-leader incidence in **multiplayer** ~~only~~ 📌 **and, since the 2026-09-03
  widening, Singleplayer platform-leaderboard award incidence as well** — see the ruling in the Notes.
  ⚠️ **Consumer of this task, not a blocker on it.**
- ⚠️ **This is not a `0206` regression and must not be described as one.** It is pre-existing, and `0206`
  correctly guards its own new branch against it.
- 📌 **Cross-reference — the XP half of the same policy. Owner ruling, 2026-09-04, given live in
  session:** *"Solo matches shouldn't contribute to the leaderboard. Neither should they contribute to
  the XP."* ⇒ **Leaderboard and profile XP now read as ONE coherent policy: solo contributes to
  neither.** The XP half was recorded in
  [`0211`](../0211-credit-participation-xp-at-elimination-or-match-end/brief.md), where it closes a
  question that brief had explicitly carried as open.
  ⛔ **NOTHING IN `0210` CHANGES.** Its scope, status and priority are **untouched**, and its own
  2026-09-03 ruling was **not conditioned on this** — it stood on its own reasoning (unranked,
  trivially farmable practice) and still does. This note exists so a reader of either brief sees the
  whole policy, **not** because the two tasks merged.
  ⚠️ **The asymmetry matters and is not an inconsistency:** `0210` must **ADD a guard** — Singleplayer
  reports to the platform leaderboard **today**. The XP half needs **no code**: solo already credits
  zero, because `creditMatchXp` lives only on the game server (`src/server/GameServer.ts:1253`) and
  solo runs on `src/client/LocalServer.ts`, which has no crediting code (✅ producer-verified
  2026-09-04). ⛔ **Do not read "solo contributes to neither" as meaning both halves are already
  handled** — one is live behaviour to fix, the other is an unenforced property to preserve.

### ~~🚩 Open, not ruled~~ → 📌 **RULED 2026-09-03 — `0208`'s measurement scope**

~~**Should [`0208`](../0208-measure-clientless-leader-at-win-condition-in-production/brief.md) extend to
Singleplayer incidence, or stay multiplayer-only?**~~

**📌 Owner ruling, 2026-09-03, given live in session: *"Add it — measure both."***

> **[`0208`](../0208-measure-clientless-leader-at-win-condition-in-production/brief.md) is widened to
> measure Singleplayer platform-leaderboard award incidence as well as the multiplayer
> clientless-leader rate.**

**Scope of the widening, as written into `0208`:** how often the client awards platform-leaderboard
points from **non-tutorial Singleplayer**, via **both** `reportPlacements()` **and**
`reportParticipation()` — the unguarded participation path included, because it is the farmable one.

**The owner's reasoning, recorded because it is why the question had a deadline:** this task's ruling is
that Singleplayer reports **nothing**. The moment that guard ships, **how often it was happening becomes
permanently unobservable** — the same value-decay `0208`'s own brief flags against `0206`, now applying
here. Measuring first tells the owner **how much farming was actually happening**, which is the evidence
for whether this task mattered at all.

🔴 **IT STILL DOES NOT GATE THIS TASK. The ruling changed `0208`'s scope, NOT this task's status.**

- The owner's ruling above was **explicitly not conditioned on incidence** — option C was rejected on
  **farmability**, with the reasoning that unmeasured incidence does not rescue it. **The guard is right
  either way.**
- ⛔ **Do not add a "blocked by `0208`" marker here, do not hold this plan waiting for a number, and do
  not re-file this task as dependent.** `0208` is a **consumer of this task's context, not a
  predecessor.** If the two ever collide, **this task wins and `0208` loses its window** — the owner
  accepted that trade in advance.
- **Status is unchanged: 🔲 Backlog, unblocked, unscheduled, owner `fkit-coder`.** ⚠️ The owner
  separately ruled the same day that **`0209` and `0210` stay unscheduled** — neither is urgent, and
  Sprint 4 has a deploy to get through.

⚠️ **The struck text above is kept, not deleted, so that a later reader can see this was a real open
question that was actually put to the owner and answered** — not a gap that was quietly tidied away.
