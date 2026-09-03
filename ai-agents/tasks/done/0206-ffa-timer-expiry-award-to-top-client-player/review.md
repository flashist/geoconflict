# Review — 0206

Task: `ai-agents/tasks/backlog/0206-ffa-timer-expiry-award-to-top-client-player/brief.md`
Plan (the standard): `ai-agents/tasks/backlog/0206-ffa-timer-expiry-award-to-top-client-player/plan.md`
— blob `bfba596e536c4446219ba2c93fed448ef7811c8c`, 18191 bytes, **re-verified by this reviewer**.
File(s) under review:

- `src/core/execution/WinCheckExecution.ts` (`checkWinnerFFA()` only)
- `tests/core/executions/WinCheckExecution.test.ts`
- `tests/server/GameServerWinner.test.ts` (new)
- `ai-agents/tasks/backlog/0206-ffa-timer-expiry-award-to-top-client-player/worklog.md`

Status: closed-out

> **What `closed-out` means here, precisely.** It is the state of **this review ledger**, not of the task.
> All three round-1 findings are dispositioned by owner ruling, none is open, and no further reviewer
> round is warranted. ⛔ **The task is NOT closed** — closing it is the producer's act, routed by
> `fkit-lead`; this reviewer neither closed it nor moved any task file. Set 2026-09-03 by `fkit-reviewer`
> in phase 2. ⚠️ Honest limit: the coder was editing its own halves of this ledger in parallel with this
> write; this reviewer verified the *code* behind every disposition but did **not** re-verify the coder's
> sections, and does not vouch for them.

**Round 1 verdict: ⚠️ Changes requested — 3 findings, all low, none blocking. All three now dispositioned.**
**Final round-1 disposition: ✅ Ready to merge** — no open confirmed defects; the only two changes made this
round were documentation wording, and no source or test assertion was altered.
Reviewers run: **fkit-reviewer (Claude) — full pass**; **Codex adversarial (`codex-cli 0.152.0`, `codex exec
--sandbox read-only`) — ran, returned "No findings"**. No reviewer was skipped; coverage is **not** partial.
⚠️ **One reviewer finding was amended after the fact — R2's mechanism was wrong.** See the amendment note
under the findings table. Verified by this reviewer, not accepted on relay.

## Reviewer findings

| #  | Round | Sev | file:line | Claim |
|----|-------|-----|-----------|-------|
| R1 | 1 | low | `tests/core/executions/WinCheckExecution.test.ts:344-350`, `worklog.md:61-63` | T4's added assertion is tautological — `winUpdates` is asserted `toHaveLength(0)` on the line above, and `[].some(...)` is `false` for any predicate, so the added `expect(...).toBe(false)` can never fail and adds zero regression-catching power. It delivers the **legibility** the plan asked for (§4 T4: *"so the intent is legible"*), so the test is fine. The defect is in the worklog, which describes it as an assertion *"which strengthens rather than loosens it"* — it does **neither**. The tutorial gate's real new coverage came from the `ffaWinUpdates` helper change (the human runner-up now owns 10 tiles, so the fallback *would* fire but for the gate), not from this line. Recommended: correct the worklog wording to "legibility only, adds no coverage; the strengthening came from the helper change", or make the assertion independent of `winUpdates`. |
| R2 | 1 | low | `src/client/ClientGameRunner.ts:405-432`, `:530-536`; `src/client/leaderboard/LeaderboardReporter.ts:44-59` | ⚠️ **Mechanism amended 2026-09-03 — the original wording of this row was WRONG. See the amendment note below the table.** **Frequency increase on a known, deliberately out-of-scope defect.** Public/private FFA matches with a clientless leader previously emitted **no** `Win` update, so `gameEnded` was never true and `reportPlacements()` never ran in that class of match; after `0206` they end with a `Win` update and it does. What the increase actually produces: **(a)** more **correct** points reaching the platform — `increaseCurPlayerLeaderboardScore(params.points)` (`LeaderboardReporter.ts:49`), which is `0206`'s **intent**, not a harm; and **(b)** more `console.debug` lines carrying the meaningless `placement = +1` (`ClientGameRunner.ts:426`). **`placement` never reaches the Yandex platform.** `increaseCurPlayerLeaderboardScore(increase: number, leaderboardId?: string)` (`FlashistFacade.ts:1371-1374`) takes only the score increase and an optional leaderboard id; `params.placement` is consumed **solely** by the `console.debug` at `LeaderboardReporter.ts:52-59`, under its own `// TODO: integrate platform leaderboard API (placement)`. So the wrong value never leaves the browser. **Not a defect of this change**, and no fix is requested here — a consequence of the settled both-branches ruling. Owner ruling 2026-09-03: **accept now, brief it alongside** → follow-up brief **`0209`**. |
| R3 | 1 | low | `tests/server/GameServerWinner.test.ts:78-92`, vs `src/server/GameServer.ts:1144-1198` | The new server test's docstring claims it proves that *"a `["player", <clientID>]` winner message — **exactly the shape the fallback award produces** — wins the vote and reaches `creditMatchXp`."* `handleWinner` is **winner-shape-agnostic**: it votes on `JSON.stringify(clientMsg.winner)` and calls `creditMatchXp(potentialWinner.winner)` for whichever key wins, so the identical test passes with `["opponent", …]` or any other shape. The test **does** satisfy the plan's Q4 requirement exactly as written (*"feeds `handleWinner` a winner message … and asserts `creditMatchXp` runs"*) — so this is not a plan miss, and the worklog's own wording (*"the new `handleWinner` test reaches `creditMatchXp`"*) is accurate. Only the docstring's "exactly the shape" phrasing implies a discrimination the assertion does not have. Recommended: reword the docstring, or accept as-is. |

### ⚠️ Amendment to R2 — 2026-09-03, phase 2. The reviewer got the mechanism wrong.

**A reviewer finding can be wrong, and this one was.** While scoping `0209` a producer showed that R2's
described impact was overstated; `fkit-lead` relayed it with an instruction to verify rather than accept.
**This reviewer verified it independently against the code and the producer is correct.** The R2 row above
has been rewritten; this note records what changed and why, so the error is not silently absorbed.

- **What R2 originally claimed:** that `0206` increases how often a wrong `placement` value is *"sent to
  the real Yandex leaderboard"*.
- **What is actually true:** `placement` **never reaches the platform at all.** The only platform call in
  `reportPlacement` is `increaseCurPlayerLeaderboardScore(params.points)`
  (`src/client/leaderboard/LeaderboardReporter.ts:49`), whose signature is
  `(increase: number, leaderboardId?: string)` (`src/client/flashist/FlashistFacade.ts:1371-1374`).
  `params.placement` is read **only** by the `console.debug` at `LeaderboardReporter.ts:52-59`, sitting
  under `// TODO: integrate platform leaderboard API (placement)`. Today's harm from the wrong value is
  therefore **a wrong number in a browser debug log** — nothing player-facing.
- **What survives:** the **frequency change is real**, the finding is **still legitimate**, and `0209` is
  the right outcome. Only the described impact was too strong.
- **Severity:** **low — unchanged, and if anything it was already too high.** Left at `low` rather than
  re-graded down, because the finding's value was always the follow-up brief, not the harm.
- **What this does NOT change:** no other row, and nothing in the *Verified clean* section, rests on the
  amended mechanism. R1 and R3 are untouched.

**Follow-up briefs filed by the producer (recorded here because the ledger otherwise carries "brief id
not yet assigned"):**

- **`0209`** — `ai-agents/tasks/backlog/0209-define-placement-semantics-and-fix-literal-one/brief.md`.
  ⚠️ Scoped as a **design decision, not the mechanical `+1` → `myIndex + 1` fix this reviewer originally
  implied.** `reportPlacements()` ignores its `_winUpdate` parameter and ranks `PlayerType.Human` players
  only, by tiles desc (`ClientGameRunner.ts:409-419`), so `myIndex + 1` is a *human tile-rank*, not a
  placement — and under **ADR-110** the declared winner may be an `AiPlayer` absent from that ranking
  entirely. `0209` **forbids prescribing `myIndex + 1`**; what "placement" means (among humans / among all
  players / winner-relative) is the decision it exists to make.
- **`0210`** — `ai-agents/tasks/backlog/0210-singleplayer-platform-leaderboard-reporting-policy/`: whether
  Singleplayer should report to the platform leaderboard at all (plan §8 item 2).

### Round 1 outcome — all three findings dispositioned

Owner ruled all three live in session, 2026-09-03, relayed by `fkit-lead`: **R1 — correct the wording**
(coder done, no test changed); **R3 — reword the docstring** (coder done, test unchanged); **R2 — accept
now, brief it alongside** (no code changed, `0209` filed). The coder verified all three `CORRECT`
independently and disputed none of the reasoning. **No finding remains open on the reviewer's side.**

## Coder response

Round 1 processed 2026-09-03 by `fkit-coder`, spawned as the Process-review worker of the lead's
`fkit-sprint-ship-loop` under the loop's declared-approval marker. **All three findings were ruled on by
the owner live in session on 2026-09-03** and relayed here by `fkit-lead`; the rulings are recorded per
row. Each finding was independently verified against the code before any edit. No finding was applied on
the reviewer's say-so alone.

**R1 and R3 verify `CORRECT` as written. R2 is `CORRECT` on frequency but its mechanism is overstated** —
the wrong `placement` value never reaches the Yandex platform; it reaches a browser debug log. That
correction was raised by the producer while filing `0209`, verified independently here, and folded in
below. **It lowers R2's already-low severity; it does not change any disposition.**

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | **CORRECT** — verified | **Defect** (documentation, not code) | Corrected the worklog wording; credited the coverage gain to the `ffaWinUpdates` runner-up change. **No test changed.** | **Fixed** |
| R2 | **CORRECT on frequency; mechanism overstated** — see below | **Frontier-move** (pre-existing bug, out of scope by plan §8 item 1) | **None — accepted by owner ruling.** Briefed as **`0209`**. ⚠️ `placement` never reaches the platform — debug log only. **No code changed.** | **Accepted** |
| R3 | **CORRECT** — verified | **Defect** (documentation, not code) | Reworded the test docstring to drop the shape-specificity claim. **The test itself is unchanged.** | **Fixed** |

**Change surface for this round: two files, both documentation-only.**

- `ai-agents/tasks/backlog/0206-…/worklog.md` — T4 row + ⛔ risk-1 block rewritten (R1); decision-log
  entries 6–8 added (this round's audit record).
- `tests/server/GameServerWinner.test.ts` — the `describe` block's docstring comment only (R3).

**No source file was touched this round.** `src/core/execution/WinCheckExecution.ts` and
`tests/core/executions/WinCheckExecution.test.ts` are byte-identical to what the reviewer read. No test
assertion was added, removed or altered.

### R1 — verification

Confirmed at `tests/core/executions/WinCheckExecution.test.ts:342-350`: `winUpdates` is asserted
`toHaveLength(0)` at `:342`, and the added `winUpdates.some(...)` at `:344-350` is therefore
unconditionally `false` for any predicate. The assertion **cannot fail** — it has zero regression-catching
power. It does deliver the legibility the plan asked for (§4 T4), so the test is fine as the reviewer
says; the defect was purely the worklog's *"which strengthens rather than loosens it"*.

The reviewer's second point is also confirmed, and is the more useful half:
`PlayerImpl.isAlive()` is `this._tiles.size > 0` (`src/core/game/PlayerImpl.ts:342-344`), and
`GameImpl.players()` filters on it. So **before** the `ffaWinUpdates` runner-up change, the human
runner-up in the tutorial and non-tutorial-singleplayer cases owned no land, was not alive, and was
never a candidate the gate could reject — **both cases were passing vacuously.** Giving the runner-up 10
tiles made them real for the first time. The winner still gets exactly `floor(numLandTiles * 0.82)` tiles
and `numTilesWithFallout` is 0, so the 80 % threshold crossing is unchanged. The worklog now credits the
coverage gain to that change (decision-log entry 2) rather than to T4's assertion.

### R2 — verified, with one mechanism correction; plus the precision that became `0209`

**The frequency claim is `CORRECT`.** `reportPlacements()` fires whenever a `Win` update exists
(`src/client/ClientGameRunner.ts:516`, `:530-536`) and computes `const placement = +1` — a literal `1`
(`:426`). Pre-`0206`, a multiplayer FFA with a clientless leader emitted no `Win` update at all, so none
of this ran in that class of match; post-`0206` it does. That frequency increase is real, and is
correctly attributed: **a consequence of the settled both-branches ruling, not a defect of this change.**

⚠️ **Mechanism correction — R2's severity stands, its mechanism does not.** Raised by the producer while
filing `0209`, and **verified independently here** against `src/client/leaderboard/LeaderboardReporter.ts:44-59`:
the only platform call inside `reportPlacement` is `increaseCurPlayerLeaderboardScore(params.points)`,
whose signature is `(increase: number, leaderboardId?: string)`. **`params.placement` is never passed to
it.** It is read in exactly one place — the `console.debug` at `:52-59`, sitting under
`// TODO: integrate platform leaderboard API (placement)`. ⇒ **The wrong placement value never reaches
the Yandex platform. Today it lands in a browser debug log and nowhere else.**

So what `0206` increases in these matches is (a) **more debug lines** carrying a wrong number, and
(b) **more `points` awarded** to the platform — `awardTable[myIndex]`, which *does* reach
`increaseCurPlayerLeaderboardScore`, on the same human-tile-rank rule that governs every other match end.
**(b) is `0206`'s intent, not a defect.** Severity is unchanged at **low** — if anything lower than
recorded.

⛔ **An earlier version of this section endorsed R2's "sending … to the Yandex platform leaderboard"
framing without checking `LeaderboardReporter`. That framing was wrong; this is the correction.** Read
any remaining "reported to the platform" phrasing about *placement* elsewhere in this ledger against this
paragraph. (The *Reviewer findings* section is not mine to edit — `fkit-lead` is relaying this correction
to the reviewer so their half is fixed by its owner.)

**The precision that scoped `0209`, retained because the brief rests on it:** the fix is **not** simply
`+1` → `myIndex + 1`. `reportPlacements` ignores its `_winUpdate` parameter entirely and ranks
`PlayerType.Human` players only, by `numTilesOwned()` desc (`:409-419`). So `myIndex + 1` would be the
human tile-rank, **not** the player's true placement among all players — and under ADR-110 the declared
winner may be an `AiPlayer` who is not in that ranking at all. What `placement` should *mean* has to be
decided before an expression is picked. `0209`
(`ai-agents/tasks/backlog/0209-define-placement-semantics-and-fix-literal-one/brief.md`) is scoped as
exactly that design decision. **Nothing was changed here; this was scoping input.**

### R3 — verification

Confirmed against `src/server/GameServer.ts:1144-1199`. `handleWinner` keys its vote on
`JSON.stringify(clientMsg.winner)` and calls `creditMatchXp(potentialWinner.winner)` for whichever key
wins the majority; **`winner[0]` is never inspected anywhere in the function.** The identical test
therefore passes with `["opponent", …]` or any other shape, exactly as the reviewer states. The
reviewer is also right that this is **not** a plan miss — plan §4's Q4 requirement (*"feeds
`handleWinner` a winner message … and asserts `creditMatchXp` runs"*) is satisfied as written, and the
worklog's own wording was already accurate. Only the docstring overclaimed. It now states the
shape-agnosticism explicitly, so the next reader does not re-derive it.

### Residuals from this round

**None new.** The eight residuals already recorded in `worklog.md` are unchanged and still stand; this
round neither closed nor added to them. No `NEEDS-DECISION` was raised.

### Verification after the edits

`npm test` and `npm run lint` were re-run after the two edits — results in the worklog and in the
hand-off report.

## Accepted residuals (shared, do-not-re-litigate)

1. **R2 — `reportPlacements()`'s `const placement = +1` now fires in clientless-leader FFA matches.**
   Accepted by **owner ruling, 2026-09-03** (*"accept now, brief it alongside"*), relayed by `fkit-lead`.
   `0206` ships as reviewed; the `placement = +1` defect (plan §8 item 1) is briefed separately as
   **`0209`** — `ai-agents/tasks/backlog/0209-define-placement-semantics-and-fix-literal-one/brief.md`.
   ⚠️ **Record the mechanism accurately when carrying this forward:** `placement` is **never sent to the
   Yandex platform** — `reportPlacement` passes only `params.points` to
   `increaseCurPlayerLeaderboardScore` (`src/client/leaderboard/LeaderboardReporter.ts:44-59`), and
   `placement` is consumed solely by the `console.debug` there. The wrong value reaches a **browser debug
   log**, nothing more. See the *R2* subsection above for the verification.
   ⛔ **Do not re-raise this against `0206` in a later round.** Re-raise only if `0209` is confirmed never
   to have been filed, or if new evidence changes the *severity* — not to restate the finding.

---

## Verified clean — checked, nothing found (not ledger rows; recorded so nobody re-chases them)

**🔴 Tutorial regression — the headline risk. Verified closed on every reachable route.**
`isTutorial: true` is produced in exactly **one** place in the codebase — `src/client/Main.ts:835` —
and always alongside `gameType: GameType.Singleplayer` (`Main.ts:822`). `grep` over `src/` finds no
other producer; every other `isTutorial` reference is a *reader*. So the inner gate
`if (gameConfig.gameType === GameType.Singleplayer) return;`
(`WinCheckExecution.ts:90-92`) closes the tutorial path completely. Non-tutorial singleplayer never
enters the outer guard at all (`gameType !== Singleplayer || isTutorial === true` is false), so it
still falls through to `setWinner(max)` → `makeWinner` → `["opponent", name]`
(`GameImpl.ts:677-687`) — unchanged, and its test is green.

**🔴 No pre-existing assertion was weakened. The plan §6 risk-1 alarm is correctly NOT tripped.**
Checked against `git show HEAD:tests/core/executions/WinCheckExecution.test.ts`. The plan's three
must-stay-unchanged cases sit at HEAD `:170-190` (non-tutorial singleplayer, `["opponent", …]`),
`:218-226` (human public FFA win) and `:232-240` (tutorial). **All three are untouched**, except one
*added* line in the tutorial case, which the plan explicitly asks for. The two tests that were
rewritten are the **public/private FFA clientless-stall pair** — a different pair, not on the
must-stay list, and **not** the tutorial tests plan §6 risk 1 names. The coder's argument in
`worklog.md:88-94` **checks out**.

**The `ffaWinUpdates` runner-up change does not weaken the five real-game tests — it strengthens two.**
`PlayerImpl.isAlive()` is `this._tiles.size > 0` (`src/core/game/PlayerImpl.ts:342-344`) and
`GameImpl.players()` filters on it (`:421-423`), so a landless runner-up genuinely is not a candidate —
the coder's justification (`worklog.md:96-101`) is **verified correct**. The winner still receives
exactly `floor(numLandTiles * 0.82)` tiles and `numTilesWithFallout` is 0, so the 80 % crossing is
unchanged. Net effect: the tutorial case and the non-tutorial-singleplayer case now have a live,
clientful runner-up for the first time, so they stopped being vacuous.

**Determinism — the claim holds by reading; the author's caveat remains true and is correctly carried.**
`sorted` is a fresh array (`Array.from(...).filter(...)`), so `.sort()` mutates nothing shared. The new
comparator is **total** on `(numTilesOwned desc, smallID asc)` and `smallID` is unique. `smallID` is
assigned in construction order by `GameImpl.addPlayer` (`:448-459`), and construction order comes from
the server's `gameStart` roster (`GameRunner.ts:49-95`: humans → `aiPlayers` → nations), which is
identical on every client. AI-player `clientID`s are **server-generated and shipped in
`gameStart.aiPlayers`** (`GameServer.ts:616-640`) — not minted per client — so `clientID() !== null`
evaluates identically everywhere. Nations always get `clientID` `null` (`GameRunner.ts:87-92`), so the
fallback can never crown a nation. ⚠️ The author's flagged residual stands unchanged: this is
**verified by reading, not by running two clients**, and a genuine cross-client divergence is not
test-coverable in this repo.

**`checkWinnerTeam()` byte-identical — verified independently.** `git diff -U0` on the source file
yields exactly three hunks, at old lines `44`, `63-64` and `70`, all inside `checkWinnerFFA()`.

**Worklog step-2 wording honours the ⛔ plan requirement, verbatim.** `worklog.md:72` reads
*"**Reported as 'unchanged and already live', never as verified.**"* Core end tested, server end tested,
one named unchanged gap. No other verification claim in the worklog was found stronger than its
evidence except R1's "strengthens" wording.

**Test claims re-run and independently confirmed by this reviewer.**
`npx jest` on the two 0206 suites: **20 passed**. `npm test` (full): **109 suites, 1133 tests, all
passed, exit 0** — first run, no `supertest` flake, no `SIGSEGV`, so `CLAUDE.md`'s known-flake
procedure was not entered. The worklog's headline numbers are accurate.

**The XP rescue works whatever the fallback winner is — and an AI winner cannot mint itself XP.**
`creditMatchXp` (`GameServer.ts:1253-1305`) credits from `winnerMsg.playerParticipation` intersected
with the frozen `gameStartInfo.players` roster; it does **not** credit the winner qua winner. So the
rescue holds when the fallback is an AI player, and because AI `clientID`s live in
`gameStart.aiPlayers` rather than `players`, an AI winner is filtered out of the eligible roster. This
is a real safety property of ADR-110 that was not previously recorded anywhere.

## Re-litigates settled decisions (suppressed)

Nothing was suppressed this round. Both reviewers were primed with the six owner rulings and ADR-110's
re-raise condition, and neither raised a finding against them. R2 touches plan §8 item 1 but does **not**
ask for it to be fixed here — it reports a change in that bug's exposure, which is new information
rather than re-litigation.
