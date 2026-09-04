# Decide what `placement` means in `reportPlacements()`, then correct it — today it is the literal `1` for everyone

## ID
0209

> ℹ️ **ID allocation, checked 2026-09-03 before filing.** `0209` is free. **The four checks that were
> run, in full, because this project has been bitten by an invisible reservation once already:**
> 1. **Task folders** — `ai-agents/tasks/{backlog,done,cancelled}/`. Highest ID in use: **`0208`**.
> 2. **All boards** — [`backlog.md`](../../../sprints/backlog.md),
>    [`sprint-backlog.md`](../../../sprints/sprint-backlog.md),
>    [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md) / `-5` / `-6` / `plan-index.md`.
> 3. **`grep -rn "0209" .claude/`** → **zero hits.** This is the check that catches reservations no
>    board can see.
> 4. **`grep -rn "0209" ai-agents/ .claude/ src/`** → **zero hits anywhere.**
>
> ⛔ **`0204` is NOT free and was NOT considered.** It is reserved **invisibly** by the plan-carry-check
> hook task, which exists only as prose in `.claude/skills/fkit-sprint-ship-loop/SKILL.md` and was never
> filed as a brief. That reservation is why
> [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md) was renumbered `0204` → `0205`.
>
> ⛔ **`0241`–`0247`, `0264`, `0265` are also NOT free and were NOT considered.** They appear under
> `.claude/skills/fkit-heal/`. They are **the fkit toolkit's own task numbering, not this project's
> board** — but they are still occupied identifiers in this repo's tree, so they are not available here
> either.

## Sprint
Backlog — unscheduled. Filed on [`backlog.md`](../../../sprints/backlog.md).

**Board chosen honestly:** the owner's ruling was *"Accept now, brief it alongside"* — that authorises the
brief, it does not schedule a sprint. Filing it on
[`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md) alongside `0206` would assert a commitment nobody
made. Same reasoning as `0203`, `0205`, `0207`, `0208`.
**Row appended, not inserted** (ADR-035).

## Priority
**Low — the producer's rank, not an owner ruling.** The owner ruled that it be *filed*, not where it
sits. This board is unranked, so its Priority column reads `—` and the rank lives here.

- **Zero player-visible impact today**, for a reason that is **not** the one the finding was framed
  with — see *⚠️ The blast-radius framing is overstated*. **Read that section before ranking this
  differently.**
- **The points are correct.** Only the *placement label* is wrong, and today that label reaches nothing
  but a `console.debug`.
- **It is a live trap, not dead paper.** The wrong value sits directly under the comment
  `// TODO: integrate platform leaderboard API (placement)`. Whoever does that integration inherits a
  value that is already wrong, in a line that looks deliberate (`+1`, not `1`).

🔴 **Low on *impact*, NOT low on *cost*. Do not pull this in as a quick win.**
~~The obvious one-character fix is **wrong** (see *What to Decide*). This task needs a design answer
before any line is written.~~ It is small, not trivial.

📌 **Updated 2026-09-03 — the definition is now RULED (rank among humans), which removes the design
question but NOT the caution.** The ruling settles *what the number means*; it does **not** settle
*what expression computes it*. ⛔ **`myIndex + 1` is still not prescribed here** — see *What to Build*.
**Low still stands as the rank**, and this is still not a blind one-character edit.

## Status
🔲 Backlog

~~**Blocked on nothing mechanically — but do not write code until the semantics question below is
answered.**~~
📌 **UNBLOCKED 2026-09-03 by owner ruling — the definition is settled and this is ready to plan.**
It does **not** depend on
[`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md) and does not block it, and
⚠️ **it has no ordering dependency on
[`0210`](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md) any more** — see Notes.

## Owner
~~**fkit-producer** for the decision (with the owner).~~ **fkit-coder.**
📌 The producer/owner decision is done (2026-09-03).

---

## Context

`src/client/ClientGameRunner.ts:426`, inside `reportPlacements()`:

```ts
const points = awardTable[myIndex];
const placement = +1;
```

`+1` is a **unary plus applied to the literal `1`** — it evaluates to `1` always. Every human who
finishes in the top 3 is labelled **placement 1**.

✅ **Producer-verified 2026-09-03** against the working tree:
- The literal is at `ClientGameRunner.ts:426`.
- **The points are correct** — `const points = awardTable[myIndex];` at `:425`, indexed properly against
  `[first, second, third]` = `[10, 5, 2]` (`src/client/flashist-game/FlashistGameSettings.ts:10-15`).
  ✅ Explicitly re-verified, as instructed: **only the reported placement value is wrong.**

⚠️ **Locate by symbol (`reportPlacements`), not by line** — these numbers drift.

**Origin of the line:** commit `84fd4ff` (2026-04-30, *"Codex: analytics-p0-spawn-confirmation"*). It is
**pre-existing and unrelated to `0206`**.

### 🔴 The obvious fix is wrong — read this before scoping

The natural reading is *"they meant `myIndex + 1`"*. **Do not prescribe that.**
✅ **Verified independently twice on 2026-09-03** — by the producer while filing, and by the `fkit-coder`
processing `0206`'s review:

- `reportPlacements()` **ignores its `_winUpdate` parameter entirely.** The underscore prefix is
  deliberate: the declared winner is never consulted.
- It ranks **`PlayerType.Human` only**, by `numTilesOwned()` descending
  (`ClientGameRunner.ts:409-418`). **Bots, Nations (`FakeHuman`) and AI players are absent from that
  ranking.**
- So `myIndex + 1` is a **human tile-rank**, not a placement in the match. A human ranked 1st among
  humans can be far from 1st among all players.
- 📌 **And under ADR-110** (`ai-agents/knowledge-base/decisions/adr-110-ai-player-may-be-declared-winner.md`,
  accepted 2026-09-03) **the declared winner may be an `AiPlayer`, who is not in that ranking at all.**
  `myIndex + 1` could report `1` for a player who demonstrably did not win.

⛔ **A brief that prescribes `myIndex + 1` would repeat the `0022` failure**, where the brief's own
prescribed fix would have regressed PR #77. The fix here is **downstream of a definition that does not
exist yet.**

### ⚠️ The blast-radius framing is overstated — this changes the rank, not the ruling

This defect was surfaced as finding **R2** in `0206`'s round-1 review ledger
(`../../done/0206-ffa-timer-expiry-award-to-top-client-player/review.md:24`), and flagged during planning as
out-of-scope item **§8.1** (`../../done/0206-…/plan.md:295-297`). Both describe the consequence as the wrong
placement being **sent to the Yandex platform leaderboard**.

🔴 **It is not sent to the platform. ✅ Verified 2026-09-03 in
`src/client/leaderboard/LeaderboardReporter.ts:44-58`:**

```ts
export async function reportPlacement(params: PlacementParams): Promise<void> {
  if (params.player.type() !== PlayerType.Human) return;
  const result: boolean = await FlashistFacade.instance
    .increaseCurPlayerLeaderboardScore(params.points);
  // TODO: integrate platform leaderboard API (placement)
  console.debug("[Leaderboard] reportPlacement", params.gameId, params.placement, ...);
}
```

- The only platform call is `increaseCurPlayerLeaderboardScore(params.points)`. Its signature is
  `(increase: number, leaderboardId?: string)` (`src/client/flashist/FlashistFacade.ts:1372-1375`) —
  **`placement` is never passed to it.**
- `params.placement` is consumed **only by the `console.debug` on the next line.**
- The Yandex leaderboard this writes to is a **cumulative score** board. It has no placement field to
  corrupt yet — hence the `TODO`.

**So the accurate statement of today's harm is: a wrong number in a browser debug log.** Nothing reaches
the platform, no player sees it, no stored value is wrong.

| | |
|---|---|
| R2's **severity** call (*low*) | ✅ **Correct** — if anything it was generous. |
| R2's **mechanism** (*"sending `placement = +1` … to the Yandex platform leaderboard"*) | ❌ **Overstated.** The value does not leave the client. |
| R2's **frequency-change** observation | ✅ **Still true**, but it now describes more *debug lines*, not more wrong platform writes. |
| Whether the brief should exist | ✅ **Yes** — the ruling stands, and the latent trap is real. |

⛔ **This correction is recorded here and NOT written into `0206`'s ledger.** An `fkit-coder` is
processing that review; `0206`'s folder was not touched. See *Open questions* in the filing report.

### ~~The frequency change `0206` introduces — accurately stated~~ → 🔴 **THAT CHANGE IS NOT IN THE GAME — `0206` WAS REVERTED 2026-09-04**

> 🔴 **Owner ruling given live in session, 2026-09-04. Struck below, NOT deleted — the struck analysis
> was CORRECT about the code as `0206` built it; that code was then reverted.**
>
> ⛔ **`0206`'s behaviour was reverted before it ever reached a player and was NEVER DEPLOYED.** Its row
> still reads `✅ Done` — **correctly**, the work was done — but the **effect** is gone. The plan's
> **premise** was disproved by measurement; `0206` was **not** defective and did **not** cause the
> stall.
>
> ### What this changes for THIS task — the defect is unaffected, its blast radius shrinks back
>
> ✅ **`0209`'s defect is UNCHANGED and still real.** It was **pre-existing** and **never a `0206`
> regression** — this brief already says so twice (see *"pre-existing and unrelated to `0206`"*), and
> the revert makes that more true, not less. The literal `1` is still logged for everyone on the
> ordinary human-win path.
>
> ⚠️ **What DOES change: the frequency claim below.** The extra class of matches `0206` would have
> made `reportPlacements()` fire in **does not exist**, because `0206` is not in the game. ⇒ **Blast
> radius reverts to what it was before `0206`** — the ordinary win path only, and still just the debug
> console. **This does not change the owner's 2026-09-03 ruling (option A, rank among humans), does
> not change the rank, and does not gate or unblock anything.**
>
> 📎 Full record: the STOP box at the top of
> [`0206`'s brief](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md). Replacement
> task: [`0211`](../0211-credit-participation-xp-at-elimination-or-match-end/brief.md), ~~unscheduled.~~
> ✅ **CORRECTED 2026-09-04 — `0211` is SCHEDULED INTO SPRINT 4** (owner ruling, live in session),
> tracked on [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md). **Struck, not deleted — spent,
> not wrong.** Status `🔲 Backlog`, **not started**; rank **Medium–High, the producer's.** ⛔ **`0211`
> must not SHIP until [`0208`](../0208-measure-clientless-leader-at-win-condition-in-production/brief.md)
> is DEPLOYED AND COLLECTING DATA** — ✅ planning and building in parallel is explicitly allowed;
> ~~⚠️ neither task is `🚧 Blocked`.~~ 📌 **SWEPT 2026-09-04 by the producer — struck, not deleted;
> SPENT, NOT WRONG: accurate when written, false once `0208` was built.** ✅ **`0211`'s half stands —
> still `🔲 Backlog`, still NOT blocked, only its SHIP is ordered.** ⛔ **`0208` IS now `🚧 Blocked` —
> built and reviewed 2026-09-04, UNCOMMITTED, UNDEPLOYED, NO DATA COLLECTED.** ⚠️ **Unrelated to the
> sequencing ruling; nothing gates `0208`.** ⚠️ **THIS TASK (`0209`) IS UNAFFECTED — still `🔲 Backlog`,
> unscheduled, unranked by the owner; nothing here schedules or gates it.**
> ⚠️ **`0206`'s `plan.md` / `worklog.md` / `review.md` remain untouched by owner ruling** — the `R2`
> citations elsewhere in this brief still resolve exactly as written.

~~`0206` makes `reportPlacements()` fire in a class of matches where it **previously never fired**: public
and private FFA matches whose leader at the win condition is clientless used to stall with **no winner
at all**, so no `Win` update was emitted, so `gameEnded` was never true
(`ClientGameRunner.ts:516`, `:530-536`). After `0206` those matches end with a declared winner, emit a
`Win` update, and run `reportPlacements()`.

**Consequences, separated honestly:**
1. **Points now get awarded in those matches** — 10/5/2 to the top three humans. This is **`0206`'s
   intent**, it is **correct**, and it is not a defect.
2. **The wrong placement label now gets logged in those matches too.** This is this task's defect, and
   its blast radius today is the debug console.~~

🔴 **The block above is struck as of 2026-09-04 — it describes a code state that was REVERTED and never
reached a player.** ⚠️ **Consequence 2's DEFECT is untouched by the strike and is still live** — the
wrong placement label is logged on the ordinary win path, as it always was. Only the **extra class of
matches** described above is gone. See the box at the head of this section.

## ~~What to Decide~~ → 📌 DECIDED

### 📌 Owner ruling, 2026-09-03 — **A: `placement` means rank among humans.**

**Given live in session. This is a ruling, not a lean.**

> **`placement` is the player's rank among the `PlayerType.Human` players in the match, ranked by tiles
> owned — the same ranking the points are already computed from.**

**The owner's reasoning, as put to them and accepted:**
- It **agrees with the points already awarded**, which are human-relative — `awardTable[myIndex]` over
  `[10, 5, 2]`. **The reported number would finally match what the points already say.**

🔴 **This rules on the DEFINITION. It is NOT a licence to prescribe the implementation.**
With the definition settled, `myIndex + 1` may well turn out to be the right expression — **but that is
for the plan to establish against the code, not for this brief to assert.** The prohibition and the
`0022`-style warning below **stand in full**.

⚠️ **Two consequences of choosing A that the plan must handle, not ignore** — they were the known cost
of this option, and ruling A does not make them disappear:
1. **The label means something narrower than a reader assumes.** "Placement" will not mean placement in
   the match. **The field must be renamed or documented at the declaration** so the next reader is not
   misled the way this codebase already misled one.
2. **It can read `1` for a player who lost.** Under **ADR-110** the declared winner may be an
   `AiPlayer`, who is absent from the human ranking entirely. Under definition A the top human still
   reports `1`. **That is accepted, not overlooked** — it is the direct consequence of a human-relative
   board, and the points already behave this way.

~~Three coherent definitions. **The owner picks one; the coder does not.**~~

**The definitions as they were weighed. Recorded so nobody reopens them as though they were never
considered.**

| # | Definition | Disposition |
|---|---|---|
| **A** | **Rank among humans** — the value the current ranking already computes | ✅ **RULED 2026-09-03.** Reasoning above. Was the producer's lean and the `0206` coder's; the owner took it. |
| **B** | ~~**Rank among all players** — humans, bots, nations, AI~~ | ⛔ **CONSIDERED AND REJECTED 2026-09-03.** It matches the intuitive meaning of "placement", but it **disagrees with the points**, which stay human-relative — a player could be told "placement 7" while receiving first-place points. Reconciling that would mean changing the award table, which is a **product change**, not this bug fix. The ruling's whole reasoning was *make the number agree with the points*; B does the opposite. |
| **C** | ~~**Winner-relative** — `1` only for the declared winner, otherwise rank~~ | ⛔ **CONSIDERED AND REJECTED 2026-09-03.** Most truthful about who won and the only option that fully respects ADR-110, but the **costliest** — the winner is a tagged tuple with three shapes (`["team", …]`, `["player", …]`, `["opponent", …]`, see `GameImpl.makeWinner()` at `src/core/game/GameImpl.ts:667-687`) and a naive `winner[0] === "player"` check gets Team mode wrong. Rejected as disproportionate for a value that today reaches only a debug log. ⚠️ **Its rejection also moots [`0210`](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md)'s option B**, which presumed a winner-relative definition — `0210` was ruled **A** the same day, so the pairing is coherent. |

~~⛔ **Do not pick one of these in a plan.** Route it to the owner.~~
📌 **Already routed and ruled. The plan implements A** — and establishes the expression for itself.

## What to Build — ~~*only after the decision*~~ 📌 *definition ruled; the expression is the plan's to establish*

**Implement ruling A: `placement` = rank among humans, by tiles owned.**

- Replace `const placement = +1;` with an expression that computes **rank among humans**, and
  **document the meaning at the declaration** so the next reader is not left guessing again. 🔴 **The
  documentation is not optional** — it is the mitigation for the known cost of definition A (the label
  means something narrower than a reader assumes).
- 🔴 **⛔ The brief still does NOT prescribe `myIndex + 1`. Establish the expression against the code.**
  This prohibition **survives the ruling** and is the most important line in this section.
  **Why, restated so it is not read as stale caution:** `myIndex` is an index into a **human-filtered,
  tile-sorted** array (`ClientGameRunner.ts:409-418`). Whether `myIndex + 1` faithfully expresses "rank
  among humans" depends on properties the plan must **check, not assume** — in particular **how ties in
  `numTilesOwned()` are handled** (the sort has no documented tiebreak here, unlike
  `WinCheckExecution`'s `|| a.smallID() - b.smallID()`), and whether the filtered array can contain
  **disconnected or eliminated humans** who should not occupy a rank. ⛔ **A brief that asserted the
  expression would repeat the `0022` failure**, where the brief's own prescribed fix would have
  regressed PR #77. **The plan states the expression and its evidence; the brief does not.**
- ⛔ **Do NOT change `points`.** `awardTable[myIndex]` is already correct. Touching it would be a real
  regression in a value that **does** reach the platform.
  ~~If the chosen definition makes points and placement disagree (option B), **say so and stop**.~~
  📌 **Moot under ruling A** — A was chosen *because* it agrees with the points. ⚠️ **But if the plan
  discovers they disagree anyway, that is a finding: say so and stop.** Changing the award basis is a
  separate product task, not this one.
- ⛔ **Do NOT wire the placement into the platform call.** That is the `TODO` in
  `LeaderboardReporter.ts:53`, and it is a separate decision (which Yandex API, whether a placement board
  exists at all). Out of scope here.
- ⛔ **Do not touch `0206`'s files** while that task is in review.
- **`src/client/` only** ~~for options A and C~~ under ruling A as scoped. No `src/core/` change, so the
  *"all `src/core/` changes must be tested"* rule does not bite. **If the plan's approach reaches into
  `src/core/`, that rule applies in full.**

### Test

`reportPlacements()` is a private method with no existing unit test and it reaches
`FlashistFacade.instance`, so a unit test needs a facade seam that does not exist today.
**Do not build that seam** for the change ruling A calls for.
~~For **option C** the winner-shape handling is exactly the kind of logic that has bitten this codebase
before (`0022`, and R3 in `0206`'s ledger), so **if C is chosen, a test is expected** — extract the
shape-interpretation into a pure helper and test that, rather than mocking the facade.~~
⛔ **C was rejected — no winner-shape handling is needed, and no test for it is expected.**
⚠️ **One carve-out:** if the plan finds that ranking needs a **tiebreak or an eliminated-player filter**
to express rank-among-humans faithfully, **that logic is pure and should be extracted and tested** —
it is exactly the kind of thing this codebase has got wrong before.

## Verification

1. **The expression computes rank among humans** (ruling A), and **that meaning is documented in a
   comment at the declaration**. Confirm `points` still reads `awardTable[myIndex]`.
2. **Behavioural check by log.** Run a local game (`npm run dev`) and finish a match in which the local
   human is **not** the top human. Confirm the `[Leaderboard] reportPlacement` debug line prints the
   human-relative rank — **state the expected value before running, then compare** — and that the
   **points argument is unchanged** for the same finishing position.
   ⚠️ If no multiplayer lobby appears, check the port-3001 conflict noted in project memory before
   assuming a code fault.
3. ~~**If option C:** exercise a match won by an **AI player** and a **Team** match, not just FFA.~~
   ⛔ **C was rejected.** ⚠️ **But still exercise a match won by an `AiPlayer`** — not to check winner
   handling, which A deliberately ignores, but to **confirm the accepted consequence**: the top human
   reports `1` even though an AI won. **That is correct under ruling A.** Verifying it stops a later
   reader filing it as a bug.
4. `npm run lint` clean and `npm test` green.
   ⚠️ If a `supertest` suite fails, check CLAUDE.md's known-flake signature before treating it as a
   regression, **rule out `0197`'s `SIGSEGV` first**, and **say that you re-ran**.

## Notes

- **Origin:** owner ruling *"Accept now, brief it alongside"*, given live in session **2026-09-03**. The
  owner accepted the consequence for `0206`'s current round and asked for this to be tracked separately
  rather than absorbed silently.
- **Sources:** `0206` review ledger finding **R2**
  (`../../done/0206-ffa-timer-expiry-award-to-top-client-player/review.md:24`) and `0206` plan **§8 item 1**
  (`../../done/0206-…/plan.md:295-297`). Both are **cited, not edited** — `0206`'s folder is off-limits while its
  review is being processed.
- ⚠️ **This brief was rescoped after filing began.** It was first drafted as the mechanical fix
  `+1` → `myIndex + 1`. The `fkit-coder` processing `0206`'s review verified against the code that this
  is **not** the right fix, and the brief was corrected before the board row was written. **The
  mechanical framing is wrong and is recorded here only so nobody reintroduces it.**
  📌 **The 2026-09-03 ruling does NOT undo this.** It settled the *definition*; the rescope was about the
  *implementation*, which is still the plan's to establish. `myIndex + 1` may end up correct — it is
  simply not asserted here.

### 📌 Owner rulings recorded 2026-09-03

- **The definition:** ruled **A — rank among humans**. Full reasoning, and the rejected options **B** and
  **C** with the reasoning for each, are in *What to Decide* above. **They were weighed, not
  overlooked — do not reopen them as though they were never considered.**
- **The split from [`0210`](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md) was
  confirmed on its merits.** The owner **read the producer's own weakening of the split argument**
  (recorded in `0210`'s Notes) and kept the two tasks separate anyway: the axes remain orthogonal
  (*what the number means* here, *which modes report at all* there), either can be answered "no change"
  independently, and `0210` carries real harm this task does not. ⚠️ **That doubt is resolved, not
  pending.**

- **Sibling filed the same day:**
  [`0210`](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md), from `0206` plan §8
  item 2 — should Singleplayer report to the platform leaderboard at all. **Separate task, orthogonal
  axis** (*what the number means* vs *which game modes report at all*).
  ~~⚠️ **soft ordering: answer this task's question first if `0210` goes to its option B**, because
  "report only when the human actually won" presumes a winner-relative definition of placement.~~
  📌 **The ordering caveat is MOOT as of 2026-09-03.** `0210`'s option B was **rejected** (it was ruled
  **A — Singleplayer reports nothing**), and this task was ruled **rank-among-humans** rather than
  winner-relative. **The pairing is coherent and there is no ordering dependency left** — the two can be
  planned and shipped in either order, or in parallel.
- ⚠️ **The "harmless today" claim is verified against today's code and is NOT permanent.** It rests
  entirely on `placement` not being passed to `increaseCurPlayerLeaderboardScore`. **The moment anyone
  acts on `LeaderboardReporter.ts:53`'s `TODO`, this stops being a debug-log cosmetic and starts writing
  a wrong placement to the platform.** That is the whole argument for settling the definition before
  then.
