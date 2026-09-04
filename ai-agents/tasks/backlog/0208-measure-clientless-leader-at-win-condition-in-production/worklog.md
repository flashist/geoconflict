# `0208` — worklog

## 2026-09-04 — Part A built (Part B untouched)

Implemented **Part A only**, per the approved `plan.md` (blob `b053726`, verified by
`git hash-object` before any code was written) and the owner's seven rulings of 2026-09-04.
⏳ **Part B is HELD** (Decision 6 — the owner is pulling the production `Game:Mode:Solo` vs
`Game:Mode:Multiplayer` figures first). No Part B file was opened.

**Nothing is committed.** The working tree carries the change; the owner commits.

### What changed and why

| File                                                    | Change                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core/game/GameUpdates.ts`                          | Appended `WinConditionCheck` to `GameUpdateType`, added `WinConditionCheckUpdate` and its union member, plus the four string-literal dimension types. Every field is a structured-cloneable primitive (the update crosses `postMessage` out of the simulation Web Worker) and the payload carries **no identifiers of any kind**.                                                                         |
| `src/core/execution/WinCheckExecution.ts`               | Extracted the OR'd win predicate into `thresholdMet` / `timerMet` locals in **both** check methods — a pure refactor with identical semantics — and emit the update at the **top of the `if (thresholdMet \|\| timerMet)` block, above the clientless guard**. Added the `reportedWinCondition` latch and the `reportWinConditionCheck()` helper carrying the required client-dependence warning comment. |
| `src/client/WinConditionAnalytics.ts` _(new)_           | Pure, DOM-free helpers mirroring `MatchStartAnalytics.ts`: `shouldLogWinConditionCheck`, `winConditionAnalyticsEventName`, `logWinConditionCheckAnalytics`.                                                                                                                                                                                                                                               |
| `src/client/ClientGameRunner.ts`                        | Reads `gu.updates[GameUpdateType.WinConditionCheck]` in the existing update handler, behind a new `hasReportedWinConditionCheck` field beside `hasProcessedWin`, plus the replay and reconnect gates.                                                                                                                                                                                                     |
| `src/client/flashist/FlashistFacade.ts`                 | One enum key: `MATCH_WIN_CONDITION: "Match:WinCondition"`. The event string is never written inline.                                                                                                                                                                                                                                                                                                      |
| `ai-agents/knowledge-base/analytics-event-reference.md` | New **Win Condition Events** section: the row, the decision-point rationale, the own-denominator note, the ADR-110 `AiPlayer`-leaf note (Decision 7 — doc note only, the ADR itself was not touched), the never-pool-the-branches rule, the required client-matches-not-matches wording **verbatim**, and the three known under-counts.                                                                   |

**Emission placement — the one place the plan rejects the architect, kept as written.** The update is
emitted at the decision point, _above_ the guard, not at the guard's early return. Emitting at the
guard-return would make the metric read zero the day `0205`/`0211` ship while still drawing a healthy
line on a dashboard.

**`0022`'s fix is untouched.** `this.active` was not touched, neither `return` was moved, and the
`gameType !== GameType.Singleplayer` clause is unchanged. Behaviour is identical to before apart from
the added view-stream update — asserted case by case in the tests, which pair every new assertion with
the pre-existing behaviour it must not disturb.

**Hazard A** (per-tick re-fire, ~10⁴ events per stalled match) is solved by the execution-level latch,
set _before_ the `addUpdate`, with an independent client-side latch as belt-and-braces.
**Hazard B** (per-client multiplication) is **accepted, not solved** — no single emitter was elected —
and the required denominator caveat is in the reference doc in the plan's wording.

### Tests

- `tests/core/executions/WinCheckExecution.test.ts` — extended with 13 cases: every FFA leader kind
  (`Bot`, `Nation`, `AiPlayer`, `Human`) on real games, both team leaves, both lobby types, both
  branches, threshold-wins-when-both, integer share, the singleplayer/tutorial dimensions, and the
  latch run **500 real ticks past the first crossing** (asserts the check re-fired >20 times and that
  those ticks produced **zero** further updates — it does not pass vacuously).
- `tests/core/WinCheckDeterminism.test.ts` _(new)_ — two independent runs produce identical hash
  sequences and identical payloads; a key-set assertion pins the payload to exactly seven
  identifier-free fields. Carries the plain statement of what it **cannot** prove.
- `tests/client/WinConditionAnalytics.test.ts` _(new)_ — all 24 multiplayer leaves, each asserted
  against GameAnalytics' `^[^:]{1,64}(?::[^:]{1,64}){0,4}$` and pinned to exactly 5 segments; the
  singleplayer and tutorial drops; the replay, reconnect and latch gates.

Results: `npx tsc --noEmit` clean · `npm run lint` clean · `npm test` **111 suites / 1155 tests, all
passing**. No `supertest` flake was hit, so no re-run was needed.

**Not verified locally, and it cannot be:** analytics only initialise when `DEPLOY_ENV === "prod"`
(`FlashistFacade.ts`), and that gate was **not** weakened. Dashboard appearance is a post-deploy check.
No localization change was needed — nothing user-visible is added, so `en.json` / `ru.json` are
untouched (the plan's claim was re-checked and holds).

### Decision log — judgement calls made without asking

1. **Singleplayer is filtered client-side, not core-side.** The plan lists `isTutorial` and a
   `lobbyType` in the payload but gives the event string only four mode/lobby leaves
   (`FfaPublic`/`FfaPrivate`/`TeamPublic`/`TeamPrivate`), noting a tutorial "never reaches a public or
   private lobby leaf". Those are only jointly true if the core emits for every game and the client
   drops the non-multiplayer ones. So `WinConditionCheckUpdate.lobbyType` includes `"Singleplayer"` and
   `winConditionAnalyticsEventName()` returns `null` for it (and for `isTutorial`). Folding
   singleplayer into the `Private` leaf was rejected: it would break the plan's "a `Timer` sample is
   private-lobby-only by construction" and pollute the private numbers. Tested both ways round.
2. **`leaderSharePercent` is rounded to an integer in `src/core/`, and a non-finite share reports 0.**
   The plan specifies "`value` = integer leader share %"; rounding at the emission site guarantees it
   for every consumer. The zero-guard is not hypothetical: `numTilesWithoutFallout` is
   `numLandTiles() - numTilesWithFallout()`, and a map fully covered by fallout makes the share
   `NaN`/`Infinity`, which would otherwise ship into the analytics value on the timer branch.
3. **Four pre-existing test mocks in `WinCheckExecution.test.ts` gained a `type()` method.** The
   FFA leader-kind dimension reads `max.type()`, and the hand-rolled player stubs from tasks `0022`
   and earlier did not have one, so they threw. Adding the method the stub now needs is a test-only
   change; no assertion in those cases was altered.

Nothing else was decided unilaterally. **No open question is being carried forward for the owner.**

---

## Round 1 stateful review — processed 2026-09-04

Ledger: `review.md` (_Coder response_ section carries the per-finding verdicts and evidence). Reviewer
raised 3 findings (1 medium, 2 low), none blocking. **All three verified correct against the code
before any edit; all three fixed** under the owner's live rulings ("Fix now" on R1, "Fix both now" on
R2+R3). None was refuted, so nothing was returned as unnecessary.

Change surface: `src/core/game/GameUpdates.ts` · `src/core/execution/WinCheckExecution.ts` ·
`ai-agents/knowledge-base/analytics-event-reference.md` · `tests/core/executions/WinCheckExecution.test.ts` ·
`tests/client/WinConditionAnalytics.test.ts`.

Gates after the fixes: `npx tsc --noEmit` exit 0 · `npm run lint` exit 0 · `npm test` **111 suites /
1159 tests, all passing**. No `supertest` failure, so no flake triage and no re-run were needed.

`0022`'s guard untouched, emission still above it, payload still identifier-free. No Part B file
touched; `plan.md` and ADR-110 not edited; nothing committed.

### Decision log — judgement calls made while processing the review

4. **R1's fix is a named `teamLeaderKind()` helper, not a nested ternary.** Answers R1 (Nations team
   mislabelled `HumanTeam`). The mapping needs a comment explaining which team configurations mix
   nations into the coloured teams (where `HumanTeam` is fair) and which does not — a nested ternary
   has nowhere to put it. **Obvious winner within the plan's intent**: same behaviour, same 5-segment
   event, strictly more readable, and it matches the file's existing module-level-map style
   (`FFA_LEADER_KIND`, `WIN_CONDITION_LOBBY_TYPE`).
5. **R1's doc half was treated as part of the fix, not as optional.** Answers R1. Adding the
   `NationsTeam` leaf while leaving `analytics-event-reference.md` at `(Bot + Nation + BotTeam) / all`
   would have reproduced the exact wrong number the finding is about — the leaf would exist and still
   be excluded from the numerator. The owner's ruling named this explicitly. The formula, the
   event-string grammar and a short "why this leaf is clientless" note were all updated. **ADR-110 was
   not touched** (ruling Q7 is doc-note-only).
6. **R2 is fixed by reading the real constant from source, not by `jest.requireActual`.** Answers R2
   (the 5-segment wall asserted against a mock). `requireActual` was tried first in a throwaway suite
   and **hung past a 2-minute timeout** against this suite's 0.099 s baseline — the real
   `FlashistFacade` pulls in `gameanalytics` and the OTEL browser init at module load, in a `node`-env
   suite. So the value is regex-extracted from `FlashistFacade.ts` and the mock is pinned to it by
   assertion, which transitively makes every other assertion in the suite real. The extractor
   **throws** when the constant is not found, so a reformat fails loudly rather than passing
   vacuously. **Judgement call, recorded because it deviates from the reviewer's implied route** —
   the residual (source text, not evaluated module) is stated in the ledger.
7. **R3's `NaN` case kept at 0 while `Infinity` moves to 100.** Answers R3. `Infinity` means the leader
   holds tiles and every land tile carries fallout — 100 is the honest report. `NaN` means the leader
   holds no tiles either and has no honest value, so 0 stands. `-Infinity` is unreachable (fallout is
   only ever set on land) and also reports 0. **Mechanical and in-plan**: the reported value only;
   `thresholdMet` still reads the raw share, so `Infinity > 80` is `true` exactly as at `HEAD` and the
   event count is unchanged. Covered by two new tests — `NaN` is reachable only via the timer branch,
   since `NaN > 80` is `false`.

**No open question is being carried forward for the owner. Nothing was applied that was not covered by
the three rulings above.**

---

## Round 2 stateful review — processed 2026-09-04

Two findings (R4, R5), both verified before any edit, **both agreed with and fixed** under the owner's
live ruling (option A, "fix both"). Round 1's three fixes were confirmed correct and
behaviour-preserving by the reviewer's side-by-side diff, and the round-1 `requireActual` deviation was
independently reproduced and accepted — with the mechanism sharpened beyond "hangs": `GameAnalytics.init`
throws at `gameanalytics/dist/GameAnalytics.node.js:3661` via `FlashistFacade.ts:43`, then leaks a
handle so jest never exits. That is now recorded in the test's own comment.

Change surface: `tests/client/WinConditionAnalytics.test.ts` ·
`ai-agents/knowledge-base/analytics-event-reference.md`. **Nothing under `src/` was touched** — the
`src/` diff is byte-identical to the end of round 1.

Gates: `npx tsc --noEmit` exit 0 · `npm run lint` exit 0 · `npm test` **111 suites / 1159 tests, all
passing**. No `supertest` failure, so no flake triage and no re-run needed. Test count unchanged because
R4 added assertions to an existing test.

### Decision log — judgement calls made while processing round 2

8. **R4's count regex matches DEFINITIONS, not mentions — deviating from the reviewer's suggested
   `/MATCH_WIN_CONDITION:/g`.** Answers R4 (non-global extraction silently reads a commented-out
   predecessor). Measured both against mutated source: the suggested regex **false-trips** on an
   ordinary prose doc comment (`// MATCH_WIN_CONDITION: fired once per client-match`), counting 2;
   the definition-shaped `/MATCH_WIN_CONDITION:\s*"([^"]+)"/g` counts 1 there and 2 on a genuinely
   commented-out definition. **Obvious winner within the finding's intent**: catches exactly the
   ambiguous shape, tolerates legitimate reference and documentation, so the guard stays precise
   rather than merely strict — which is what the round-2 instruction asked me to consider.
9. **The one-definition invariant is asserted twice — a `throw` at module load and an `expect` in the
   test.** Answers R4. The throw cannot be skipped and fails the whole suite loudly; the `expect`
   makes the invariant visible in test output instead of buried in a helper. Mechanical, test-only,
   no behaviour either way.
10. **R5's doc fix states 21 actually-reachable ids, not just the 28 the finding named.** Answers R5.
    The finding's 28 is right for the grammar; but the four `…Public:…:Timer` ids are also unreachable,
    because `MapPlaylist.ts:162` sets `maxTimerValue: undefined` on the public game config — which I
    re-read rather than inheriting from the doc's own pre-existing claim. Recording both numbers is
    strictly more accurate and contradicts nothing. **Judgement call, recorded because it goes beyond
    what was ruled on** — it is doc-only and additive, so it does not change the deploy risk profile.
11. **The 56-leaf test sweep was left at 56, with a comment added saying why.** Answers R5's warning
    not to "fix" the test to match the doc. The loop covers the **composer** (any well-typed update
    must stay inside the five-segment cap); reachability is a separate property of
    `WinCheckExecution`. Without the comment the next reader would plausibly reduce it and silently
    drop composer coverage. Test-comment only.

**No open question is being carried forward for the owner. Nothing was applied outside the two rulings.**

---

## Round 3 stateful review — processed 2026-09-04

One finding (R6), agreed and fixed. Rounds 1 and 2's fixes were all upheld: the reviewer ruled
**against its own suggested regex and in favour of** the definition-shaped count from decision 8
(it would have shipped a false-positive tripwire into a file that already carries exactly that
comment style above enum entries — the task-`0012` inbox block), and it confirmed the `21` figure
from decision 10 by checking two routes I had not: `applyMatchModifier`'s `WEIRD_SETTING_OPTIONS`
never injects a `maxTimerValue`, and `GameServer.updateGameConfig()`'s only route rejects public
games twice (`Worker.ts:279-282`, `:287-294`). Public emissions are therefore always `Threshold`.

Change surface: `ai-agents/knowledge-base/analytics-event-reference.md` — one paragraph.
**Nothing under `src/`, and no test file touched.**

**No test was run, and none was needed** — one document, no code. Round 2's gate run (`tsc` exit 0,
`lint` exit 0, `npm test` 111 suites / 1159 tests passing) still stands, nothing executable having
changed since.

### Decision log — judgement calls made while processing round 3

12. **R6 was my own error, from my own round-2 refinement (decision 10), and is recorded as such.**
    The `21` and `35` were right; the count of excluded ids was not. The unreachable set is every
    leader leaf of **both** modes at `Public` + `Timer`: `4 + 3 = 7`, not 4. Mechanical, doc-only,
    single word — applied without asking.
13. **Swept the section rather than fixing only the reported line.** Asked to check whether the wrong
    number recurred. `grep` returns exactly one "four" in the file. Deliberately **left** the `4` in
    `` `4 FFA + 3 team` `` alone: it is a different quantity (the four FFA leader kinds) and is
    correct. Every other figure re-checked — `7`, `28`, `56`, `21`, `35` — all correct and now
    mutually consistent.
14. **Spelled out the leaf breakdown and the `28 − 7` subtraction inline, beyond the one word asked
    for.** **Obvious winner within the finding's intent**: an unshown subtraction is exactly what let
    a wrong count sit unnoticed through round 2. Doc-only, additive, no risk profile change.

**No open question is being carried forward for the owner.**

> ⚠️ Closing the review ledger settles **Part A's review only**. **`0208` is not complete** — Part B is
> planned but HELD, pending the owner's production `Game:Mode:Solo` figures. Do not record this task as
> done.

---

## 2026-09-04 — Part B built (Part A untouched)

Part B was released to build the same day, after the owner pulled the production figures the hold was
waiting on (GameAnalytics Design events, count, 5 Aug – 3 Sep 2026): `Game:Mode:Solo` **374.95K** vs
`Game:Mode:Multiplayer` **87.61K** (462.57K total), `Tutorial:Started` **106.08K**,
`Match:Loss:OpponentWon` **16.78K**. Solo is the dominant mode, not a negligible one — roughly
**58 %** of all match starts are non-tutorial solo — so the population is real and the
`Solo` / `SoloTutorial` split is load-bearing: today the only way to separate the two is subtracting
`Tutorial:Started`, which over-subtracts because that event fires before the match starts.

### What changed and why

| File | Change |
|---|---|
| `src/client/flashist/FlashistFacade.ts` | One enum key: `MATCH_LEADERBOARD_AWARD: "Match:Leaderboard:Award"`. |
| `src/client/leaderboard/LeaderboardReporter.ts` | `ParticipationParams` += `gameType`, `isTutorial`; `PlacementParams` += those plus `humanWon`. One module-local `logLeaderboardAwardAnalytics()` that returns early for anything but `GameType.Singleplayer`. Both report functions emit around the platform call. |
| `src/client/ClientGameRunner.ts` | Passes the new fields at both call sites, read straight off `this.gameView.config().gameConfig()`. `humanWon` derived from the `WinUpdate` already in hand. |
| `ai-agents/knowledge-base/analytics-event-reference.md` | New *Leaderboard Award Events* section. |
| `tests/client/LeaderboardReporter.test.ts` **(new)** | 17 tests. |

Event: `Match:Leaderboard:Award:<Participation|PlacementWon|PlacementLost>:<Solo|SoloTutorial>`,
value = points attempted. Five segments exactly, asserted against GameAnalytics'
`^[^:]{1,64}(?::[^:]{1,64}){0,4}$` for every one of the six reachable ids.

⛔ Nothing under `src/core/` was touched, and Part A's files are byte-unchanged. `0210`'s guard was
**not** added; `awardTable`, `placement` and `reportPlacements`'s `_winUpdate` signature were **not**
touched (that is `0209`). No localization change — Part B adds no user-visible text, so `en.json` and
`ru.json` are untouched.

### Tests

`npx tsc --noEmit` exit 0. `npm run lint` exit 0. `npm test` — **112 suites / 1176 tests, all
passing, first run**. No `supertest` failure occurred, so neither the `0197` `SIGSEGV` check nor the
known-flake re-run applied.

⚠️ **Not verified, and not verifiable here:** analytics only initialise when `DEPLOY_ENV === "prod"`
(`FlashistFacade.ts`), so nothing was seen on a dashboard. What is verified is the emission path —
the call fires once, with the right string and the right value. Verification 18 (reload mid-match) is
a manual play-test and was **not** performed.

### Decision log — judgement calls made without asking

15. **The emission sits in a `finally`, not after a bare `await`.** Answers Decision 3 (count
    attempts, platform failures included). `increaseCurPlayerLeaderboardScore` awaits
    `setCurPlayerLeaderboardScore` outside any `try`, and that in turn awaits
    `yandexInitPromise` and `leaderboards.setScore` unguarded — so the call **can reject**, not just
    return `false`. A bare post-`await` emit would silently drop exactly the platform-failure case
    the ruling says to include, biasing the count toward success. `finally` emits on fulfil-true,
    fulfil-false and reject alike, and leaves the existing rejection propagation untouched.
    **Obvious winner within the ruling's intent**; two lines per function, no other behaviour change.
    Covered by a test that asserts both the emission and the still-propagating rejection.
16. **`reportPlacements`'s parameter keeps the name `_winUpdate` even though it is now read.**
    Renaming it to `winUpdate` would be tidier — the underscore conventionally means "unused" — but
    `0209` owns that signature, and eslint here is configured `args: "none"`, so nothing forces the
    rename. Left alone with a comment saying why. Mechanical, and the cheaper of the two to reverse.
17. **The award-kind and mode segments are composed in `LeaderboardReporter.ts` itself, not in a new
    helper module.** Part A used a separate `WinConditionAnalytics.ts` because `ClientGameRunner` is
    not unit-testable without a DOM; here the reporter already **is** a plain module the test can
    call directly, so a second file would buy nothing. Matches the plan's file table, which names
    only `LeaderboardReporter.ts`.
18. **Multiplayer is excluded from the *measurement* only — the platform award itself is unchanged in
    every mode.** Two tests assert the platform call still happens for public and private lobbies
    while nothing is logged. This is the line between `0208` (measure) and `0210` (decide whether
    Singleplayer should report at all), and it is the line the plan warns is easiest to cross.
19. **The reference doc says plainly that the value is points *attempted*, never points banked.** The
    owner's required wording is there verbatim; this sentence is the consequence, spelled out so the
    number cannot be read as evidence that a score moved.

### The residual — firmer than the plan had it, still not a play-test

The plan recorded the mid-match-reload residual as *"an inference from one call site."* It is now
somewhat stronger than that, and the stronger claim is still static analysis:

- `saveReconnectSession` is the **only** writer of the `reconnect-session` key
  (`src/client/ReconnectSession.ts`), and it has **exactly one** call site
  (`ClientGameRunner.ts`), guarded by `!this.transport.isLocal`.
- `Transport.isLocal` is `true` whenever `gameStartInfo?.config.gameType === GameType.Singleplayer`
  (or a replay is loaded).
- Resuming additionally requires `checkReconnectSession()` to get an `active: true` from
  `/api/game/<id>/active` — a Singleplayer match has no server-side game to answer that.

So two independent reasons a Singleplayer reload cannot resume, rather than one.
⚠️ **Still unverified by play-test.** Verification 18 was not performed, and the reference doc says so.

### Not carried forward

**No open question for the owner from the build itself.** One thing was noted and deliberately **not**
acted on: the owner's 2026-09-04 ruling that *"Solo matches shouldn't contribute to the leaderboard.
Neither should they contribute to the XP"* is `0210`'s work, not this task's. Implementing it here
would destroy the number `0208` exists to capture. XP was checked and already complies with no guard
at all — `creditMatchXp` lives only in `src/server/GameServer.ts`, Singleplayer runs against the
in-browser `LocalServer`, and `Transport` short-circuits on `isLocal` at every server boundary. That
compliance is **architectural, not enforced**, which is worth knowing before `0210` is scoped.

---

## Part B round 1 stateful review — processed 2026-09-04

Three findings, all confirmed at source. **B1 and B2 fixed; B3 accepted as a residual on the owner's
ruling and deliberately NOT fixed.** Two earlier calls were upheld by the reviewer: the `finally`
placement (decision 15) was verified at source and stays, and declaring V16 / V17 uncovered rather than
papering over them was called the right call. The reviewer added one confirmation I had not claimed:
**both latches are set *before* the call**, so a throwing or rejecting reporter cannot unlatch and
permit a second emission.

Change surface: `src/client/leaderboard/LeaderboardReporter.ts`, `src/client/ClientGameRunner.ts`,
`tests/client/LeaderboardReporter.test.ts`, `ai-agents/knowledge-base/analytics-event-reference.md`.
**Nothing under `src/core/`; Part A byte-unchanged (154 / 41 / 452).**

Gates: `tsc --noEmit` exit 0, `lint` exit 0, `npm test` **112 suites / 1182 tests, green on the first
run**. No `supertest` failure, so neither the `0197` `SIGSEGV` check nor the known-flake re-run applied.

### Decision log — judgement calls made while processing Part B round 1

20. 🔴 **THE PATTERN, and it is worth more than the fix: when a predicate branches on a winner or
    leader tuple, enumerate EVERY shape `makeWinner()` can emit — never just the common one.** This is
    the **third** instance of this exact defect class in one day, all three in this task:
    - Part A **R1** — a team-shaped *leader* (`ColoredTeams.Nations`) labelled `HumanTeam`, so a
      100 %-clientless team counted as human.
    - Part B **B1** — a team-shaped *winner* (`["team", …]`) labelled lost, so a solo team win emitted
      `PlacementLost` carrying the first-place value.
    - And the same shape-blindness underlies why `Match:Loss:OpponentWon` is only a lower bound.

    The mechanism each time is identical: **the code reads the shape it expected and the union has
    more members than the author held in mind.** `GameImpl.makeWinner()` emits FOUR outcomes —
    `["player", clientId]`, `["team", teamName, ...clientIDs]`, `["opponent", name]`, and `undefined`.
    `WinModal.isSoloOpponentWin()` already handled all of them; I wrote a fresh predicate instead of
    reading the one in the tree that was already correct. **Read the existing derivation before
    writing a new one.** A tripwire test now fails if a fourth tuple shape appears.
21. **The derivation moved out of `ClientGameRunner` into an exported `humanWonPlacement()`, rather
    than being patched where it stood.** The reviewer asked for a solo-Team-win test and in place
    there was no way to write one — `ClientGameRunner` has no unit-test harness here, the same gap
    that leaves V16 uncovered. This is Part A's own rationale for `WinConditionAnalytics.ts` applied
    to Part B, and it **partly revises decision 17**: the reporter is directly testable, but the
    winner-shape predicate living in `ClientGameRunner` was not. In-plan intent, mechanical,
    behaviour-identical for the `player` shape. Applied without asking.
22. **Kept it in `LeaderboardReporter.ts` rather than adding a new module.** Same reasoning as decision
    17 — the smaller change, and the predicate has exactly one consumer.
23. **`me.team()` is passed in rather than read inside the helper.** Keeps the helper pure and unit
    testable with no `PlayerView`; the `null` case (FFA, where `team()` is null) is tested explicitly
    so a teamless player can never match a team name.
24. **B2 resolved exactly as Part A's R5 was: rename and document, never shrink.** The composer sweep
    stays at the full 2 × 3 = 6 and the `SoloTutorial` loss leaf stays in the enum. Shrinking to
    today's 5 reachable ids would drop composer coverage and would have to be undone the moment
    `0205` / `0211` removes the `0022` guard. The comment mirrors
    `tests/client/WinConditionAnalytics.test.ts:107-113`.
25. **B3 was NOT fixed, on the owner's ruling, and is recorded in two places** — the ledger's
    *Accepted residuals — Part B* and the reference doc. Adding the `try`/`catch` would swallow inside
    the analytics path, trading a rare mislabelled error for a permanently silent one.

**No open question is being carried forward for the owner.**

> ⚠️ B1 changed a predicate on a live path, so **this round is not self-certifying** — it needs a
> reviewer re-verification pass. Nothing here should be read as Part B being review-complete.

---

## Part B round 2 stateful review — processed 2026-09-04

One finding (B4), agreed and fixed. **Test file only — no production code changed.** B1 and B2 were
verified fixed; the `humanWonPlacement` module move was ruled **sound and kept**; B3's residual reads
correctly standing alone; and V16 / V17 / V18 are still honestly represented, none of the six new tests
claiming to cover them. The reviewer recorded the four-outcomes correction (`undefined` as the fourth
`makeWinner()` outcome) as **its own** under-count rather than editing it in silently.

Change surface: `tests/client/LeaderboardReporter.test.ts`. **Nothing under `src/`, and Part A
byte-unchanged (154 / 41 / 452).**

Gates: `tsc --noEmit` exit 0, `lint` exit 0, `npm test` **112 suites / 1182 tests, green on the first
run**. No `supertest` failure, so neither the `0197` `SIGSEGV` check nor the known-flake re-run applied.
The test count is unchanged because B4 strengthened an existing test instead of adding one.

### Decision log — judgement calls made while processing Part B round 2

26. 🔴 **B4 is agreed, and the sting is that I wrote a tripwire that could not fire — for the exact
    defect class decision 20 exists to catch.** The old check was a hardcoded `Winner[]` array
    literal: a fourth tuple in `WinnerSchema` leaves it valid, `humanWonPlacement` falls through to
    `false`, and a genuine win logs as `PlacementLost` with the suite green. **The comment calling it
    "a tripwire, not a formality" was the worse half** — it asserted a guarantee that did not exist,
    which is more dangerous than having no check, because the next reader stops looking.

    **The lesson generalises past this test: a guard is worth what it has been shown to catch, not
    what its comment says it catches.** The way to know is to break the thing on purpose and watch it
    fail.

    **Proven by running it, per the instruction not to take the snippet on trust.** A temporary file
    (`tests/client/b4-tripwire-proof.ts`) was added carrying a stand-in union with a **fourth**
    variant, `["coalition", string, ...string[]]`, in `WinnerSchema`'s variadic-tuple shape — plus
    **both** candidate forms: the `Record<WinnerTag, true>` check and the old array literal as a
    control. `npx tsc --noEmit` reported **exactly one error**, TS2741, `Property 'coalition' is
    missing … but required in type Record<"player" | "team" | "opponent" | "coalition", true>`, from
    the `Record` line. **The array-literal control compiled clean** — the direct demonstration that
    the old form was never a tripwire. Stand-in deleted immediately; `tsc` clean again and the path is
    not in the tree.
27. **Both checks kept, not one swapped for the other.** They test different properties: the type
    check catches a *new variant* at build time; the runtime assertions catch a *wrong answer* for the
    variants that exist. Dropping either would lose real coverage.
28. **`COVERED` is asserted at runtime (`Object.keys(COVERED).sort()`) rather than left unused.**
    `@typescript-eslint/no-unused-vars` is `error` here and its `args: "none"` relaxation covers
    parameters only, not variables — an unused const would have failed the lint gate. The assertion is
    cheap and makes the constant self-evidently live.
29. **The comment was rewritten to claim only what the code enforces**, naming which check does which
    job and stating outright that the array literal cannot notice a new variant. Mis-stated comments
    were half of B4; leaving a merely-improved one would have left that half in place.
30. **The reviewer's off-domain note (a winner-shape predicate inside `LeaderboardReporter`) was NOT
    acted on**, as instructed. It was explicitly marked not worth another move.

**No open question is being carried forward for the owner.**
