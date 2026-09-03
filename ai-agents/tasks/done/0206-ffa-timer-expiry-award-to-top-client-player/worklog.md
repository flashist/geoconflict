# 0206 — worklog

**Role:** `fkit-coder`, spawned as the Build worker of the lead's `fkit-sprint-ship-loop`, under the
loop's declared-approval marker (owner approved `plan.md` live via `AskUserQuestion`, 2026-09-03).
**Date:** 2026-09-03. **Branch:** `dev`. **Nothing committed, nothing pushed.**

Plan pointer verified on arrival: `plan.md` → `git hash-object` =
`bfba596e536c4446219ba2c93fed448ef7811c8c`, 18191 bytes — matches the pointer the driver carried.
⚠️ Self-computed check only; there is still no hook verifying the carry, so this is corroboration,
not proof. `plan.md` was **not** re-authored.

---

## Change surface

| File | Change |
|---|---|
| `src/core/execution/WinCheckExecution.ts` | The 0206 fallback award inside `checkWinnerFFA()`'s `0022` guard; explicit `smallID` tie-break on the existing sort; the `0022` policy comment extended to say the policy is about being *clientless*, not about being AI (ADR-110). `checkWinnerTeam()` **untouched**. |
| `tests/core/executions/WinCheckExecution.test.ts` | T1–T7 (see below); two pre-existing stall assertions rewritten; `ffaWinUpdates` and `mockTimerExpiredFfa` helpers extended; two new mock helpers. |
| `tests/server/GameServerWinner.test.ts` | **New.** Verification step 2's server end — `handleWinner` with a `["player", clientID]` winner message reaches `creditMatchXp`. |

Nothing else was touched. No `ai-agents/wiki-vault/` write, no `ai-agents/knowledge-base/` write, no
task-file move or re-status.

### Confirmed untouched (verification step 7)

`git diff -U0 src/core/execution/WinCheckExecution.ts` produces exactly three hunks, at old lines
`44`, `63-64` and `70` — all inside `checkWinnerFFA()`. `checkWinnerTeam()` is byte-identical, and its
two existing tests are green.

---

## Tests

- `tests/core/executions/WinCheckExecution.test.ts`: **19 passed** (baseline before the change: 15
  passed, confirmed green at the start of this run).
- `tests/server/GameServerWinner.test.ts`: **1 passed** (new).
- `npm test` (full): **109 suites, 1133 tests, all passed.**
- `npm run lint`: clean. `npx prettier --check` on the three touched files: clean.

**No test was re-run.** The full suite was green on its first execution — no `supertest` flake, no
`SIGSEGV`, so `CLAUDE.md`'s known-flake procedure was never entered.

### Test map against the plan's T-numbers

| T | Where | State |
|---|---|---|
| T1 | `awards a public / private FFA clientless-leader threshold win to the top clientful player` | new (rewrote the two stall assertions) |
| T2 | `awards a timer expiry with a clientless leader to the top clientful player` | new |
| T3 (threshold) | `awards nothing on the threshold branch when no clientful player is alive` | new |
| T3 (timer) | `does not declare a clientless FFA leader on the timer branch and keeps the check alive` | pre-existing, **unchanged**, still green — the new code reaches its `fallback === undefined` return |
| T4 | `does not emit an explicit opponent winner for tutorial clientless winners` | pre-existing assertions **unchanged**; one assertion added for **legibility only — it adds no coverage** (see the ⛔ note below), as the plan directs |
| T5 | `emits an explicit opponent winner for a clientless FFA nation that reaches the threshold` | pre-existing, **unchanged**, green |
| T6 | `awards the fallback win to an AI player, which is not excluded` | new |
| T7 | `breaks a fallback tie on the lowest smallID` | new |
| T8 | `still declares a human public FFA winner over the threshold` + `should set winner in FFA if percentage is reached` | pre-existing, **unchanged**, green |
| step 2 (server) | `tests/server/GameServerWinner.test.ts` | new |

⛔ **Risk-1 alarm not tripped:** the plan says that editing `0022`'s two tutorial tests to accommodate
this change is the signal to stop. Neither was edited to accommodate anything — T5 is untouched, and
T4's existing two assertions are untouched. The only edit to T4 is an **added** assertion that the
human is not the winner, which the plan explicitly asks for (§4 T4: *"so the intent is legible"*).

**Correction, round-1 review R1 — the original wording here claimed that added assertion "strengthens
rather than loosens" the test. It does neither.** `winUpdates` is asserted `toHaveLength(0)` on the line
above it, and `[].some(...)` is `false` for any predicate, so the added
`expect(...).toBe(false)` can never fail. It buys **legibility and nothing else** — zero
regression-catching power.

**The tutorial case's real new coverage came from a different change: decision-log entry 2, the
`ffaWinUpdates` runner-up.** `PlayerImpl.isAlive()` is `this._tiles.size > 0`
(`src/core/game/PlayerImpl.ts:342-344`) and `GameImpl.players()` filters on it, so **before** that helper
change the human runner-up owned no land, was not alive, and was therefore never a candidate the
tutorial gate could reject — the tutorial and non-tutorial-singleplayer cases were passing **vacuously**.
Giving the runner-up 10 tiles made those two cases real for the first time. The winner still receives
exactly `floor(numLandTiles * 0.82)` tiles and `numTilesWithFallout` is 0, so the 80 % threshold crossing
is unchanged. ⇒ **Credit the coverage gain to entry 2, not to T4's added assertion.**

---

## How each verification step landed

| Step | Result |
|---|---|
| 1 — award fires on both branches | ✅ proven by test: T1 (threshold, public and private) and T2 (timer), separately. |
| 2 — `creditMatchXp` runs | ⚠️ **partial by construction.** Core end proven (T1 emits a `Win` update carrying `["player", humanClientId]`); server end proven (the new `handleWinner` test reaches `creditMatchXp`). The **middle leg** — `Win` update → `WinModal` → `SendWinnerEvent` → `Transport` → server — has **no test harness in this repo**, is **unchanged by this task**, and runs on every ordinary human win in production today. **Reported as "unchanged and already live", never as verified.** |
| 3 — `reportPlacements()` runs again | ⚠️ **code trace, not a test.** T1 proves the `Win` update exists; `ClientGameRunner.ts:516` makes `gameEnded` true from exactly that. `ClientGameRunner` has no test harness in this repo. |
| 4 — 🔴 tutorial does not award first place for losing | ✅ proven by test: T4 and T5, with `0022`'s tutorial assertions kept green and unmodified. The gate lives in **core**, so a tutorial emits no `Win` update at all and `reportPlacements()` is structurally unreachable — but the claim rests on the test, not on that sentence. |
| 5 — no clientful player ⇒ no winner | ✅ proven by test: T3, both branches. |
| 5b — AI player may win | ✅ proven by test: T6. No `PlayerType.AiPlayer` check exists anywhere in the change. |
| 6 — human wins unchanged | ✅ T8 plus the rest of the pre-existing suite, green. |
| 7 — Team mode untouched | ✅ `git diff` hunks all inside `checkWinnerFFA()`; `checkWinnerTeam()` byte-identical. |
| 8 — `npm test` / `npm run lint` | ✅ both clean, first run. |

---

## Decision log — judgement calls applied without asking

Each was verified `CORRECT` against the code, is mechanical/localized, and stays inside the approved
plan (or is an obvious winner within its intent). ADR-019's audit obligation.

1. **Rewrote the two pre-existing tests that asserted the `0022` stall** (`emits no win update for a
   public / private FFA clientless winner and keeps the check alive`) into T1's award assertions.
   *Answers:* plan §4 T1. *Qualifies:* those two tests assert exactly the behaviour the approved plan
   changes on the threshold branch; leaving them would have been a contradiction, not a regression
   signal. They are **not** on the plan's must-stay-unchanged list (which names only the
   non-tutorial-singleplayer, human-win and tutorial cases — all three untouched). In-plan,
   mechanical.

2. **Gave the runner-up 10 tiles in the `ffaWinUpdates` helper.** *Answers:* T1 failing on its first
   run with zero `Win` updates. *Qualifies:* obvious winner within the plan's intent. `GameImpl.players()`
   filters `.isAlive()`, so a landless runner-up is not a candidate at all and T1 would have asserted a
   fallback that could never exist. The plan already anticipated helper changes for `mockTimerExpiredFfa`;
   this is the same class of change for the real-game helper. Verified by all five pre-existing
   real-game tests staying green with the runner-up now alive.

3. **Added two test helpers — `mockFfaPlayer` and `mockThresholdReachedFfa`.** *Answers:* T3, T6, T7,
   which need mock-based **threshold**-branch setups the file did not have (its only mock helper is
   timer-branch). *Qualifies:* mechanical, test-only, and the plan named the two existing helper styles
   without forbidding a third for the branch it does not cover.

4. **The server test mocks `archiveGame` as well as spying on `creditMatchXp`.** *Answers:* plan §4's
   server test. *Qualifies:* mechanical and necessary — `handleWinner` calls `archiveGame()` first, and
   `archiveGame` dereferences `this.gameStartInfo.players`, which a unit-level `GameServer` that never
   started a game does not have. Not what the test is about; the assertion on `creditMatchXp` is
   unaffected.

5. **Ran `npx prettier --write` on the two touched non-new files.** *Qualifies:* purely mechanical
   formatting, required by the repo's pre-commit style; `npm run lint` was already clean before and
   after.

**No `NEEDS-DECISION` was raised. No fix was applied outside the approved plan.**

### Round-1 review — fixes applied under the sprint-loop standing approval

Two documentation corrections, both **owner-ruled on 2026-09-03** (relayed by `fkit-lead`), applied
without a further ask. **No source behaviour was changed and no test assertion was added, removed or
altered by either.**

6. **Corrected this worklog's T4 wording (finding R1).** *Answers:* R1 — the worklog described T4's
   added assertion as one "which strengthens rather than loosens it"; it does neither. *What changed:*
   the T4 row of the test map and the ⛔ risk-1 block above now say the assertion is **legibility only,
   adding no coverage**, and credit the tutorial case's real coverage gain to decision-log entry 2
   (the `ffaWinUpdates` runner-up), which made two previously-vacuous cases real. *Why it qualified:*
   verified `CORRECT` against `tests/core/executions/WinCheckExecution.test.ts:342-350`
   (`toHaveLength(0)` above, so `[].some(...)` is unconditionally `false`) and
   `src/core/game/PlayerImpl.ts:342-344`; owner ruled "correct the wording"; documentation-only,
   localized, inside the approved plan's own §4 T4 intent.

7. **Reworded the server test's docstring (finding R3).** *Answers:* R3 — the docstring claimed the
   test proves a `["player", …]` winner is *"exactly the shape the fallback award produces"* wins the
   vote, implying a discrimination the assertion does not have. *What changed:*
   `tests/server/GameServerWinner.test.ts:78-92` now states plainly that `handleWinner` is
   winner-shape-agnostic and that the test would pass with any winner shape. *Why it qualified:*
   verified `CORRECT` against `src/server/GameServer.ts:1144-1199` — the vote key is
   `JSON.stringify(clientMsg.winner)` and `creditMatchXp(potentialWinner.winner)` is called for
   whichever key wins; `winner[0]` is never inspected. Owner ruled "reword the docstring, the test
   itself is sound"; comment-only, localized, in-plan.

8. **Finding R2 — accepted, no code change, by owner ruling.** *Answers:* R2 — after 0206, FFA matches
   with a clientless leader end with a `Win` update, so `ClientGameRunner.reportPlacements()` now fires
   where it never fired before, computing the known-wrong `const placement = +1`
   (`ClientGameRunner.ts:426`). *What changed:* **nothing.** Ruled out of scope; `0206` ships as
   reviewed, and the `placement = +1` defect is briefed separately as **`0209`**
   (`ai-agents/tasks/backlog/0209-define-placement-semantics-and-fix-literal-one/brief.md`). Recorded
   here so the frequency increase is not later read as an undocumented regression. Plan §8 item 1
   already named this bug as deliberately not-fixed-here.

   ⚠️ **Mechanism correction, applied after the first pass of this round** — raised by the producer while
   filing `0209`, **verified independently** against `src/client/leaderboard/LeaderboardReporter.ts:44-59`.
   The only platform call in `reportPlacement` is `increaseCurPlayerLeaderboardScore(params.points)`;
   **`params.placement` is never passed to it**, being read only by the `console.debug` at `:52-59` under
   `// TODO: integrate platform leaderboard API (placement)`. ⇒ **The wrong placement value never reaches
   the Yandex platform — it lands in a browser debug log.** What `0206` increases here is more debug
   lines carrying a wrong number, plus more `points` awarded on the same human-tile-rank rule as every
   other match end, which is `0206`'s intent. **R2's severity (low) stands, or is lower; its mechanism
   does not.** My first-pass wording in `review.md` echoed R2's "sent to the platform" framing without
   checking `LeaderboardReporter`; that has been corrected in the *Coder response* and *Accepted
   residuals* sections. Still **no code change** — this is a documentation correction only.

---

## Residuals — carried forward, not fixed here

1. **Verification step 2's middle leg is untested** (see the table above). Named, unchanged, already
   live. Not closable without a client-side harness this repo does not have.
2. **Verification step 3 is a code trace, not a test.** `ClientGameRunner` has no test harness here.
3. **The `console.log` on the fallback award reaches no dashboard.** It runs in the client's Web
   Worker. It discharges ruling Q3 as the plan defines it, and no more — a real metric needs a client
   analytics event (`flashistConstants.analyticEvents` plus an `analytics-event-reference.md` update),
   which the plan explicitly places **out of scope**, in `0208`.
4. **The `smallID` tie-break's cross-client determinism is not test-covered.** T7 proves the tie-break
   itself; a genuine cross-client divergence would not be caught by any test in this repo. This is the
   plan §3 caveat, carried unchanged — the tie-break writes down an existing invariant rather than
   changing behaviour.
5. **Behaviour change, visible to players** (plan risk 2): public FFA matches that today run to the cap
   or empty out now end at 80 % with a declared winner who may hold very little territory. Accepted at
   the both-branches ruling; restated so nobody reads the first field report as a defect.
6. **The three §8 out-of-scope items were NOT touched**, as instructed, and each is now briefed:
   `reportPlacements()`'s `const placement = +1` → **`0209`**
   (`ai-agents/tasks/backlog/0209-define-placement-semantics-and-fix-literal-one/brief.md`);
   non-tutorial singleplayer awarding first-place platform points for losing → **`0210`**
   (`ai-agents/tasks/backlog/0210-singleplayer-platform-leaderboard-reporting-policy/brief.md`);
   `WinModal.ts`'s wrong participation comment → **`0207`**.
   ⚠️ **The two differ in reach, and the distinction matters when reading them:** `0210`'s item is about
   `points`, which **do** reach the Yandex platform via `increaseCurPlayerLeaderboardScore`
   (`FlashistFacade.ts:1372-1375`). `0209`'s `placement` does **not** — it reaches only a `console.debug`
   (`LeaderboardReporter.ts:52-59`). See decision-log entry 8.
7. **ADR-110 carries a known expiry** — it must be re-examined before any durable player-visible winner
   surface ships. Nothing in this change is designed to depend on it being permanent.
8. **Phase-1 frequency is still unmeasured**, and the pre-fix stall count is now permanently
   unmeasurable (the sequencing ruling accepted this). The fallback log line's fire rate is the proxy.
