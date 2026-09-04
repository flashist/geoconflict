# Review — 0208

Task: `ai-agents/tasks/backlog/0208-measure-clientless-leader-at-win-condition-in-production/brief.md`
Plan: `ai-agents/tasks/backlog/0208-measure-clientless-leader-at-win-condition-in-production/plan.md`
Scope: **Part A only**, uncommitted working tree vs `HEAD` (`dev`, `2d1135c`).
File(s) under review:

- `src/core/game/GameUpdates.ts`, `src/core/execution/WinCheckExecution.ts`
- `src/client/WinConditionAnalytics.ts` (new), `src/client/ClientGameRunner.ts`, `src/client/flashist/FlashistFacade.ts`
- `ai-agents/knowledge-base/analytics-event-reference.md`
- `tests/core/executions/WinCheckExecution.test.ts`, `tests/core/WinCheckDeterminism.test.ts` (new), `tests/client/WinConditionAnalytics.test.ts` (new)

Status: **closed-out — for `0208` PART A ONLY. Task `0208` is NOT complete, and the task stays open on
the board.** All six findings (R1–R6) are fixed and verified; no finding is open. This line settles the
*review of Part A*, nothing else.

> ✏️ **Superseded detail, corrected 2026-09-04:** this line previously read "Part B is planned but
> HELD". **Part B was released to build** once the owner's production figures showed Singleplayer is
> ~58 % of non-tutorial match starts, and it is now **built and reviewed** — see
> [Review — 0208 Part B](#review--0208-part-b) below. The rest of this status still stands.
>
> ⚠️ **Scope of this section — do not misread it later.** These sections cover **Part A only**.
> **Task `0208` is NOT complete and must not be recorded as complete.** A closed-out status here means
> "Part A's review is settled", never "0208 is done" — only the **producer** may close the task, and
> `0211` stays gated on this being **deployed and collecting data**, not merely built.

Reviewers run — **rounds 1 and 2 ran both reviewers; coverage is complete in each**: **fkit-reviewer own
pass** + **Codex adversarial pass** (`codex-cli 0.152.0`, `gpt-5.5`, read-only sandbox). **Round 3 was a
reviewer pass only** — it covered a test file and a document, with `src/` byte-identical to round 2, so
no adversarial pass was run. That is a deliberate scope decision recorded per the round-2 convergence
call, not a degraded review.

Verdict (Round 1): **⚠️ Changes requested — 3 defects (none blocking).** No determinism, desync, or `0022` regression risk found by either reviewer. The three defects are measurement-fidelity and test-fidelity only; none can break a match.

Verdict (Round 2): **⚠️ Changes requested — 2 defects (none blocking, both outside shipping code).**
All three round-1 fixes verified correct and behaviour-preserving. The two new findings are one
test-file hole and one doc-accuracy error; **neither can affect runtime, so neither blocks the
weekend deploy.**

### Owner dispositions — ruled live in session, 2026-09-04

| Finding | Owner ruling                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------- |
| R1      | **Fix now** — chose the reviewer's recommended option A.                                            |
| R2      | **Fix now**.                                                                                        |
| R3      | **Fix now** — went **beyond** the reviewer's recommendation, which was to fix R2 only and defer R3. |
| R4      | **Fix now** — option A.                                                                             |
| R5      | **Fix now** — option A, the reviewer's recommendation.                                              |
| R6      | **Fix now** — option A, the reviewer's recommendation ("fix it and send straight to closeout").      |

**No finding was deferred, so no accepted residual arises from R1–R5.** The _Accepted residuals_
section stays empty by design, not by omission.

**Outcome of every finding:** R1 ✅ fixed · R2 ✅ fixed · R3 ✅ fixed · R4 ✅ fixed (via a deviation from
the reviewer's suggestion that is **better** than it, ruled correct below) · R5 ✅ fixed, with a verified
refinement (28 → 21 actually-reachable ids) · R6 ✅ fixed. **Nothing open.**

---

## Reviewer findings

| #   | Round | Sev    | file:line                                                  | Claim                                                                                                                                                                                                                                                                                                                                   |
| --- | ----- | ------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | 1     | medium | `src/core/execution/WinCheckExecution.ts:161`              | In `HumansVsNations` team mode the all-clientless `ColoredTeams.Nations` team is labelled `HumanTeam`, so the very population 0208 measures is counted as human. Raised **independently by both reviewers**; confirmed.                                                                                                                 |
| R2  | 1     | low    | `tests/client/WinConditionAnalytics.test.ts:1-8`           | The "5 segments, never more" GameAnalytics assertion is made against a **mocked** `MATCH_WIN_CONDITION`, not the real enum value, so the suite would stay green if the real constant later grew a segment. No live defect today.                                                                                                        |
| R3  | 1     | low    | `src/core/execution/WinCheckExecution.ts:220-222`          | The non-finite guard maps `Infinity` (leader holds tiles, `numTilesWithoutFallout === 0`) to `leaderSharePercent: 0`, reporting 0 % for a leader who holds all remaining land. Event **count** is unaffected; value only.                                                                                                               |
| R4  | 2     | low    | `tests/client/WinConditionAnalytics.test.ts:58`            | R2's fix reads the **first** textual `MATCH_WIN_CONDITION: "…"` in the source, so the ordinary "comment out the old line above the new one" edit shadows the real value and the guard **passes silently** — defeating it in exactly the case it exists to catch. Raised by Codex; verified.                                             |
| R5  | 2     | low    | `ai-agents/knowledge-base/analytics-event-reference.md:96` | The documented event grammar cross-products all four mode/lobby prefixes with all seven leader kinds (56 leaves), but only **28** are reachable: FFA can emit only `Bot\|Nation\|AiPlayer\|Human`, team mode only `BotTeam\|NationsTeam\|HumanTeam`. Raised by Codex; verified. Latent since round 1 — neither reviewer caught it then. |
| R6  | 3     | low    | `ai-agents/knowledge-base/analytics-event-reference.md:97` | R5's fix says "the **four** `…Public:…:Timer` ids are also unreachable" — there are **seven** (4 FFA + 3 team). The `21` and `35` figures are right; only this count is wrong, so the doc contradicts its own arithmetic (`28 − 4 = 24`, not 21). One word.                                                                             |

### R1 — detail

`checkWinnerTeam()` derives the leader kind as `max[0] === ColoredTeams.Bot ? "BotTeam" : "HumanTeam"`.

`HumansVsNations` is a live team configuration in which every FakeHuman nation is placed on
`ColoredTeams.Nations`:

- `src/core/game/Game.ts:59,68-69` — `ColoredTeams` defines both `Humans` and `Nations`.
- `src/core/game/GameImpl.ts:112-113` — the mode "always has exactly 2 teams": `[Humans, Nations]`.
- `src/core/game/GameImpl.ts:157-160` — `this._nations.forEach((n) => this.addPlayer(n.playerInfo, ColoredTeams.Nations))`.
- `src/server/MapPlaylist.ts:110-111` — `// Flashist Adaptation: keep Humans vs Nations in the public rotation.`
- `src/server/MapPlaylist.ts:165` — `disableNPCs: mode === GameMode.Team && playerTeams !== HumansVsNations`, i.e. NPCs are **deliberately enabled** for this mode.
- `src/client/HostLobbyModal.ts:300` — also selectable in private lobbies.

Every other team configuration mixes nations into the coloured teams via `assignTeams`
(`GameImpl.ts:165+`), so `HumanTeam` is a fair label there. `HumansVsNations` is the one mode where a
leading team is **100 % clientless** and is nonetheless reported as human.

Consequence: the reference doc's own prescribed formula —
`ai-agents/knowledge-base/analytics-event-reference.md`, "the clientless rate is
`(Bot + Nation + BotTeam) / all`" — counts a Nations-team crossing in the **denominator** but not the
numerator, understating the clientless rate in exactly the mode with the most clientless players. The
plan's leaf enumeration (`plan.md:235`) and ratio (`plan.md:213`) have the same gap, so this is an
oversight rather than a settled tradeoff.

**Not a behaviour defect and not a `0022` regression.** Team wins do not need a `clientID`:
`GameImpl.makeWinner()` returns `["team", "Nations"]` with an empty client list, the `Win` update is
well-formed, and the match ends normally. No stall. This is measurement fidelity only.

`WinConditionLeaderKind` has room for a `"NationsTeam"` leaf and the event string stays at five
segments (`Match:WinCondition:TeamPublic:Threshold:NationsTeam`), so the fix is additive.

### R2 — detail

`tests/client/WinConditionAnalytics.test.ts:1-8` mocks the whole `FlashistFacade` module with a
hard-coded `MATCH_WIN_CONDITION: "Match:WinCondition"`. The suite's central guarantee —
`expect(name.split(":")).toHaveLength(5)` at `:77`, and the regex at `:31,76` — therefore validates the
mock, not `src/client/flashist/FlashistFacade.ts:65`. Today the two agree, so **there is no live
defect**. But the wall the test advertises is not actually held: a later edit making the real constant
three segments would ship a six-segment event that GameAnalytics rejects, with this suite still green.

### R3 — detail

`Number.isFinite(leaderSharePercent) ? Math.round(leaderSharePercent) : 0`. The comment on `:218-219`
describes the case as `NaN`, but `NaN` arises only when the leader also owns zero tiles; the ordinary
degenerate case is `Infinity` (leader owns tiles, denominator zero), which is reported as `0`. `100`
would be the honest value. Reachability is very low — fallout is only ever set on land
(`src/core/execution/NukeExecution.ts:282-283`), and a negative denominator is therefore unreachable,
so this needs a map whose every land tile carries fallout simultaneously. `thresholdMet` behaviour is
byte-identical to `HEAD` (`Infinity > 80` was already `true`), and the event count is unaffected.

### R4 — detail (Round 2)

`tests/client/WinConditionAnalytics.test.ts:58` uses
`/MATCH_WIN_CONDITION:\s*"([^"]+)"/.exec(source)` — a non-global regex, so it captures the **first**
textual occurrence anywhere in `FlashistFacade.ts`. There is exactly one today
(`FlashistFacade.ts:65`, verified), so **no live defect**.

The hole is a future edit in a very ordinary shape — commenting out the old line above the new one:

```ts
// MATCH_WIN_CONDITION: "Match:WinCondition",
MATCH_WIN_CONDITION: "Match:WinCondition:V2",
```

Verified by executing the regex against exactly that text: it captures `"Match:WinCondition"`, the
mock-pin assertion passes, `split(":")).toHaveLength(2)` passes — **the suite goes green** while
production composes `Match:WinCondition:V2:FfaPublic:Threshold:Bot`, **six segments**, which
GameAnalytics rejects. That is the precise failure R2 was raised to prevent, so the guard fails in the
one case it exists for.

Mutation table (mine and Codex's agree): value changed → **FAILS**; key renamed → **THROWS**; single
quotes → **THROWS**; template literal → **THROWS**; computed value → **THROWS**; test file moved →
**THROWS**; constant moved to another file → **THROWS**, _unless stale matching text is left behind, then
PASSES SILENTLY_; an earlier second occurrence preserving the old value → **PASSES SILENTLY**.

Every path is fail-loud except the two involving a stale duplicate. One line closes it — assert the
source contains exactly one occurrence before extracting:
`expect(source.match(/MATCH_WIN_CONDITION:/g)).toHaveLength(1)` (verified: returns `2` on the mutated
text above, so it catches the case). Test-file-only; zero production risk.

**Assessment of R2's fix overall:** substantially adequate — it closed the hazard class R2 named and is
strictly stronger than asked, since it pins the constant's _value_, not just its segment count. R4 is
one remaining silent-pass path in it, not a rejection of the approach.

**The coder's `requireActual` justification is substantiated — I reproduced it.** A throwaway suite
calling `jest.requireActual` on the real facade was still running at **100 s** and had to be killed
(baseline for this suite: 0.1 s). The precise mechanism is sharper than "hangs": `GameAnalytics.init`
**throws** at `node_modules/gameanalytics/dist/GameAnalytics.node.js:3661`, reached from
`FlashistFacade.ts:43`, and then leaks a handle so jest reports `Jest did not exit one second after the
test run has completed` and the process never terminates. **This is not the known `supertest` flake** —
no supertest, no `SIGSEGV`, and it reproduces deterministically on demand. `jest.requireActual` on this
module is genuinely not viable, so the source-text route is justified. (Probe file was created under
`tests/client/`, run, and **deleted**; `git status` confirms the tree is clean of it.)

### R5 — detail (Round 2)

`analytics-event-reference.md:96` documents the grammar as
`{FfaPublic|FfaPrivate|TeamPublic|TeamPrivate}:{Threshold|Timer}:{Bot|Nation|AiPlayer|Human|BotTeam|NationsTeam|HumanTeam}`
— a full cross-product, 56 leaves. The code cannot emit that: `FFA_LEADER_KIND`
(`WinCheckExecution.ts:27-32`) yields only `Bot|Nation|AiPlayer|Human`, and `teamLeaderKind()` (`:41-49`)
only `BotTeam|NationsTeam|HumanTeam`. Reachable leaves are **28**, not 56 — `FfaPublic:…:NationsTeam`
and `TeamPublic:…:Human` are impossible.

_Failure scenario:_ the dashboard is built from the documented grammar, 28 series never receive a
single event, and their permanent zeros are read as telemetry loss — or, worse, as evidence the
clientless case does not occur.

Note the client suite's 56-leaf sweep (`tests/client/WinConditionAnalytics.test.ts:92-116`) is correct
as written: it tests the **composer**, which must handle any leaf handed to it. It is composition
coverage, not reachability coverage, and should not be read as the latter. Doc-only fix.

---

## Round 2 — re-verified clean

The three fixes were re-checked against the code, and every round-1 clean result was re-confirmed on
the new surface. Both reviewers agree on all of the following.

| Area                                                         | Evidence                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`teamLeaderKind()` preserves behaviour**                   | `HEAD` and worktree compared side by side: the team guard is **byte-identical** — `max[0] === ColoredTeams.Bot && gameType !== GameType.Singleplayer` → `return`, then `setWinner`, `console.log`, `active = false` (`WinCheckExecution.ts:199-207`). `teamLeaderKind()` is called strictly above it and only feeds the payload. A Nations team is still declared the winner exactly as at `HEAD`.                |
| **`teamLeaderKind()` is total**                              | Every reachable `Team` value is covered: `ColoredTeams.Bot` (bots — `GameImpl.ts:83`) → `BotTeam`; `ColoredTeams.Nations` → `NationsTeam`; `Humans`, the seven colours, and the `"Team N"` strings (`GameImpl.ts:143-146`) → `HumanTeam`, which is fair for those since `assignTeams` mixes nations into them. `null` cannot reach it — `checkWinnerTeam` skips `team === null` at `:133`.                        |
| **`reportedSharePercent()` correct**                         | `Infinity → 100`; `NaN → 0` (`NaN === Infinity` is `false`); `-Infinity → 0` (unreachable anyway); finite values, `-0` and large finite values go through `Math.round`. `thresholdMet` still reads the **raw** share (`:121`, `:185`), so event counts are byte-identical to `HEAD`.                                                                                                                              |
| **Determinism unchanged**                                    | The three fixes add no payload field and read no new state. `teamLeaderKind()` is a pure function of `max[0]`, already read at `HEAD`. `reportedSharePercent()` is pure. `GameImpl.hash()` still sums player hashes only. Nothing client-dependent entered the payload.                                                                                                                                           |
| **New core tests are not vacuous**                           | `NationsTeam`: reaches the threshold branch via `81/100 > 80` and asserts `setWinner` **was** called — pinning that the fix did not become a `0022`-shaped behaviour change. `Infinity → 100`: the `numTilesWithFallout = 100` override is applied after the helper returns and before the call, giving `81/0`. `NaN → 0`: asserts `branch === "Timer"`, proving it took the timer route (`NaN > 80` is `false`). |
| **56-leaf client sweep**                                     | Real coverage of the composer, not padding: asserts non-null, uniqueness (`new Set(produced).size === produced.length`), the regex, exactly 5 segments, and the prefix, for all `2 × 2 × 2 × 7`. See R5 for the reachability caveat.                                                                                                                                                                              |
| **Doc updated correctly for R1**                             | Formula now `(Bot + Nation + BotTeam + NationsTeam) / all`; grammar carries the new leaf; a paragraph records why `NationsTeam` is clientless. **ADR-110 still untouched** — `ai-agents/knowledge-base/decisions/` is not dirty.                                                                                                                                                                                  |
| **Build gates (verified independently, not taken on trust)** | `npx tsc --noEmit` exit 0 · `npx eslint` over all changed files exit 0 (so `ESLintPlugin`, `webpack.config.js:363`, will not fail the production build) · `npm test` → **111 suites / 1159 tests, all passing, 3.29 s**. Matches the coder's report exactly. No `supertest` failure, so no flake triage and no re-run needed.                                                                                     |

### Investigated and disproved in Round 2 — do not chase

**Candidate: `leaderSharePercent` could exceed 100.** A leader owning fallout-covered land would be
counted in `numTilesOwned()` while those tiles were subtracted from the denominator, producing values
like `225` on a metric the doc calls "integer percent". **This does not hold.**
`NukeExecution.detonate()` calls `owner.relinquish(tile)` (`:243`) **before** `setFallout(tile, true)`
(`:283`), and `GameImpl.conquer()` clears fallout when a tile changes hands (`:536`). Fallout tiles are
therefore always unowned, and the share cannot exceed 100. Recorded so a later round does not
re-derive it.

---

## Round 3 — R4 / R5 fixes verified (reviewer pass only; no Codex round)

Round 3 covers a **test file and a document only**. `git diff --stat -- src/` is byte-identical to the
end of round 2 — same four modified files, same 208 insertions / 12 deletions, plus the same one new
file. **No shipping code changed, so the deploy risk profile the owner reasoned about is unchanged.**
Per the round-2 convergence call, a test-and-doc change did not warrant a second adversarial pass; that
is a deliberate scope decision, not a skipped reviewer.

### R4 — fixed. The coder's deviation from the reviewer's suggestion is CORRECT, and better.

The reviewer suggested `expect(source.match(/MATCH_WIN_CONDITION:/g)).toHaveLength(1)`. **That
suggestion was wrong** and the coder was right to reject it on evidence: it counts the key followed by a
colon, so an ordinary prose comment — `// MATCH_WIN_CONDITION: fired once per match` — makes the count
`2` and **fails the suite on a harmless edit**. `FlashistFacade.ts` already carries exactly that style of
explanatory comment above enum entries, so the false trip was likely, not theoretical.

The shipped form counts **definitions** (key + string literal),
`/MATCH_WIN_CONDITION:\s*"([^"]+)"/g`, which discriminates correctly:

| Mutation                                             | Reviewer's suggested form | Shipped definition-shaped form |
| ---------------------------------------------------- | ------------------------- | ------------------------------ |
| plain reference `analyticEvents.MATCH_WIN_CONDITION` | 1 — ok                    | 1 — ok                         |
| prose comment `// MATCH_WIN_CONDITION: fired once`   | **2 — false trip**        | 1 — ok                         |
| commented-out old definition                         | 2 — trips                 | **2 — trips** ✅               |

The invariant is asserted twice: a `throw` at module load (unskippable — the suite fails to load) and
`expect(MATCH_WIN_CONDITION_DEFINITIONS).toHaveLength(1)` in the prefix test (`:179`, visible in
output). **R4 is closed as intended.**

The one residual already recorded in R4's mutation table is unchanged and remains acceptable: moving the
constant to another file _while leaving stale definition-shaped text behind_ would still read the stale
value. That needs a deliberate leftover, and it was noted before this fix rather than introduced by it.

**56-leaf sweep correctly retained**, with a comment at `:106-112` explaining that it covers the
_composer_, not reachability, and must not be reduced to 28. That is the right call — shrinking it would
have silently dropped composer coverage.

### R5 — fixed, and the refinement is CONFIRMED. **21 is correct.**

The coder went past the finding and checked reachability rather than inheriting the doc's own claim.
Verified independently, end to end:

- `MapPlaylist.ts:162` and `GameManager.ts:63` both set `maxTimerValue: undefined` on the public config.
- `applyMatchModifier` (`MapPlaylist.ts:123-137`) `Object.assign`s a modifier's output, so it _could_
  introduce one — but `WEIRD_SETTING_OPTIONS` (`:44-50`) only ever returns `infiniteGold`,
  `infiniteTroops`, `disabledUnits` (×2) and `startGold`. **Never `maxTimerValue`.**
- The only route to `GameServer.updateGameConfig()` (which _does_ accept `maxTimerValue`, `:152-153`) is
  `PUT /api/game/:id`, and it rejects a public game **twice** — on the requested `gameType`
  (`Worker.ts:279-282`) and on `game.isPublic()` (`Worker.ts:287-294`), both `400`.
- `HostLobbyModal` / `SinglePlayerModal` are the private and singleplayer paths only.

So `timerMet` is always `false` in a public lobby. Since emission requires `thresholdMet || timerMet` and
`branch = thresholdMet ? "Threshold" : "Timer"`, a public emission is _always_ `Threshold`. The
`…Public:…:Timer` ids are unreachable, not merely rare. `28 − 7 = 21` ✅ and `56 − 21 = 35` ✅.

Disjointness also verified: `checkWinnerFFA` passes `"Ffa"` with `FFA_LEADER_KIND`, `checkWinnerTeam`
passes `"Team"` with `teamLeaderKind()`, so the emitting branch fixes both the mode segment and the leaf
set; they cannot cross.

### R6 — one arithmetic error introduced by R5's fix

The doc reads "the **four** `…Public:…:Timer` ids are also unreachable". There are **seven**:
`FfaPublic:Timer:{Bot, Nation, AiPlayer, Human}` (4) + `TeamPublic:Timer:{BotTeam, NationsTeam,
HumanTeam}` (3). Enumerated and counted directly.

The `21` and `35` figures are **correct** — only the count of removed ids is wrong. The effect is that
the doc contradicts its own arithmetic: a reader checking `28 − 4` gets `24`, not the `21` stated two
lines later, and may then distrust the figure that is right. One word: "four" → "seven". Doc-only, no
code impact, does not gate the deploy.

### Gates — re-verified independently, not taken on trust

`npx tsc --noEmit` exit 0 · `npm run lint` (whole repo, the `ESLintPlugin` gate) exit 0 · `npm test`
**111 suites / 1159 tests, all passing**. Test count unchanged is expected and correct — R4 added
assertions to an existing test rather than a new one. No `supertest` failure, so no flake triage and no
re-run were needed.

---

## Round 4 — R6 fixed; Part A review closed out

**One document, one paragraph. No executable change, so no test run — correctly, and the coder said so
outright rather than implying one.** Round 2's gates stand and were re-verified at round 3: `tsc` exit 0,
`lint` exit 0, `npm test` 111 suites / 1159 tests passing.

**Verified independently, not on trust:**

- The corrected sentence reads **seven**, with the breakdown shown inline
  (`FfaPublic:Timer:{Bot|Nation|AiPlayer|Human}` = 4, `TeamPublic:Timer:{BotTeam|NationsTeam|HumanTeam}`
  = 3) and the subtraction `28 − 7` = **21** on the page.
- Swept the whole section myself: **exactly one** "seven", **no stale "four" as a count**, and every
  figure mutually consistent — 7 leader leaves · 28 grammatically reachable · 56 cross-product · 7
  unreachable · 21 actually reachable · 35 permanently empty.
- The `4` inside `` `4 FFA + 3 team` `` was correctly **left alone** — it is a different quantity (the
  four FFA leader kinds), and changing it would have introduced a new error.
- `git status -- src/ tests/` is identical to the end of round 2 — same five modified entries, same three
  untracked, `src/` diffstat still 208 insertions / 12 deletions across four files. **No shipping code
  touched in rounds 3 or 4.** 56-leaf sweep, `plan.md`, ADR-110 and Part B all untouched.

**On the addition beyond the single word — the reviewer is content, and endorses it.** Spelling the
subtraction out is the right fix, not scope creep: an unshown subtraction is precisely what let a wrong
count survive round 2 unnoticed. Doc-only, additive, and it makes the arithmetic checkable on the page
instead of trusted. **No trim wanted.**

### Final verdict — Part A

**✅ Ready to merge (Part A).** Six findings raised across two adversarial rounds, all six fixed and
verified; nothing open. Across every round, **no determinism, desync, or `0022` regression risk was ever
found by either reviewer** — every finding was measurement fidelity, test fidelity, or documentation.
The `0022` guard is byte-identical to `HEAD` in both `checkWinnerFFA` and `checkWinnerTeam`, verified by
direct side-by-side comparison.

**Convergence:** monotonic across four rounds — 3 code defects → 2 test/doc → 1 word → 0. Zero
re-litigation in any round, in either direction. No further review round is warranted on this surface;
one would only be justified if something under `src/` changes.

**⚠️ This verdict covers Part A only.** Part B is planned but HELD pending the owner's production
`Game:Mode:Solo` figures. **`0208` is not complete and must not be closed as a task on this ledger's
authority.**

---

## Verified clean (both reviewers independently)

Recorded so a later round does not re-derive these blind.

| Area                              | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Determinism / state hash**      | `GameImpl.hash()` (`GameImpl.ts:389-395`) sums `p.hash()` over `_players` and nothing else — verified directly, not from the code comment. `addUpdate()` (`:205-207`) only pushes into the per-tick view map, which `executeNextTick()` resets each tick (`:350`). The private `reportedWinCondition` flag cannot reach the hash.                                                                                                                                      |
| **Payload is client-free**        | Fields read: `max.type()`, `gameConfig.gameType`, `gameConfig.isTutorial`, `numLandTiles()`, `numTilesWithFallout()`, `numTilesOwned()`, `percentageTilesOwnedToWin()` (`DefaultConfig.ts:713-718`, a pure constant). No `clientID`, no `Date`, no `Math.random`, no client-local config. `gameConfig` arrives from the server's `GameStartInfo`, identical on every client.                                                                                           |
| **`0022` intact**                 | `git diff --ignore-all-space` over `WinCheckExecution.ts` touches no guard line: `this.active`, both early `return`s, `max.clientID() === null`, the `gameType !== GameType.Singleplayer \|\| isTutorial === true` clause and `setWinner` are all unchanged context. The only new `return` is the latch's own inside `reportWinConditionCheck`.                                                                                                                        |
| **Short-circuit change is inert** | Hoisting `timerMet` out of the `\|\|` makes it evaluate unconditionally, but `config()`/`gameConfig()`/`ticks()` are pure getters and `timeElapsed` was already computed unconditionally at `HEAD`. No behaviour change.                                                                                                                                                                                                                                               |
| **Emission placement**            | `WinCheckExecution.ts:92-100` — inside `if (thresholdMet \|\| timerMet)`, above the clientless guard at `:112`. Correctly counts the Nation-at-100 % case: `players()` filters `isAlive()` (`GameImpl.ts:421-423`), so the nation is the sole survivor and still crosses.                                                                                                                                                                                              |
| **Latch fires once**              | One `WinCheckExecution` per match (`GameRunner.ts:147`, the only `new`). One shared flag across both call sites is correct — `gameMode` is fixed per match. The 500-tick test is **not vacuous**: `jest.spyOn` calls through, the loop yields ~50 real `checkWinnerFFA` calls against `>20` asserted, `isActive()` is still `true`, and later update count is `0`.                                                                                                     |
| **Event strings**                 | All 48 multiplayer leaves (`2 modes × 2 lobby types × 2 branches × 6 leader kinds`) produce exactly five non-empty segments under 64 chars; the regex assertion at `:31,76` is real and the loop covers every leaf. Modes and lobby type are fused into one segment precisely to stay inside the 5-segment cap.                                                                                                                                                        |
| **Singleplayer / tutorial**       | Dropped client-side at `WinConditionAnalytics.ts:42-44`; no other call site logs a `WinConditionCheck`. The client latch burning on a dropped singleplayer update is harmless — `ClientGameRunner` is constructed per match.                                                                                                                                                                                                                                           |
| **Client gates**                  | `LobbyConfig.gameRecord?` / `isReconnect?` are real fields (`ClientGameRunner.ts:95-96`), `isReconnect: true` set at `ReconnectModal.ts:182` and threaded via `Main.ts:706`. Same gating shape as the existing `MatchStartAnalytics.ts:29`. `gu.updates[WinConditionCheck]` is never `undefined` — `createGameUpdatesMap()` (`GameImpl.ts:947-955`) enumerates `Object.values(GameUpdateType)` dynamically. The client latch is genuinely independent of the core one. |
| **Test mocks not weakened**       | The four mocks gained only `type()`, supplying the new production read. Every pre-existing `setWinner` / no-`setWinner` and `isActive()` assertion is unchanged.                                                                                                                                                                                                                                                                                                       |
| **Analytics conventions**         | Event string lives only in `flashistConstants.analyticEvents.MATCH_WIN_CONDITION` (`FlashistFacade.ts:65`, single occurrence), never inline. `analytics-event-reference.md` updated with the leaf grammar, the client-match denominator caveat and the three under-counts. **`ai-agents/knowledge-base/decisions/` is not dirty — ADR-110 was not edited**, per ruling Q7.                                                                                             |
| **Server unaffected**             | `GameRunner`/`WinCheckExecution` are not referenced anywhere under `src/server/` — the server remains a pure turn relay.                                                                                                                                                                                                                                                                                                                                               |
| **Build gates**                   | `npx tsc --noEmit` exit 0. `npx eslint` over all eight changed files exit 0 — so `ESLintPlugin` (`webpack.config.js:363`) will not fail the production build. `npx jest tests/core tests/client` → **52 suites / 540 tests, all passing**, no `supertest` suites involved, no flake encountered, no re-run needed.                                                                                                                                                     |

---

## Re-litigates settled decisions (suppressed)

**Round 1: none.** Neither reviewer raised any of the six owner rulings recorded in `plan.md` (deploy
bundling, reconnect suppression, branch separation, integer rounding, Part B held, emission above the
guard).

**Round 2: none.** Neither reviewer re-raised any round-1 finding, any owner ruling, or any area
already recorded clean. R4 and R5 are both novel and both concern surface that did not exist before
the round-1 fixes were applied — except R5's cross-product error, which was latent in round 1 with six
leader kinds and was missed by both reviewers then; it is recorded as novel rather than suppressed.

**Round 3: none.** R6 is an error introduced _by_ R5's fix, in text that did not exist before it — not a
re-raise of R5. R4's and R5's own dispositions are settled and are not reopened here.

---

## Coder response

_Coder-owned section. The reviewer does not write here._

Round 1 processed 2026-09-04. All three findings were traced against the code before anything was
changed. **All three verified correct; all three fixed** (owner ruling, live in session 2026-09-04:
"Fix now" on R1, "Fix both now" on R2+R3).

| #   | Verdict   | Defect / Frontier             | Action                                                                                                | Status    |
| --- | --------- | ----------------------------- | ----------------------------------------------------------------------------------------------------- | --------- |
| R1  | **Agree** | Defect (measurement fidelity) | Added the `NationsTeam` leaf; branch on `ColoredTeams.Nations`; dashboard formula corrected           | **Fixed** |
| R2  | **Agree** | Defect (test fidelity)        | Pinned the mocked constant to the real one, read from source (`requireActual` hangs — evidence below) | **Fixed** |
| R3  | **Agree** | Defect (measurement fidelity) | `Infinity` now reports 100, `NaN` still 0; comment corrected; both cases covered by tests             | **Fixed** |

### R1 — verified, fixed

Re-derived independently, every claim holds:

- `ColoredTeams.Nations` exists (`src/core/game/Game.ts:68-69`).
- `GameImpl.populateTeams()` (`:112-114`) hard-codes `[Humans, Nations]` for `HumansVsNations`, and
  `addPlayers()` (`:157-161`) puts **every** `_nations` entry on `ColoredTeams.Nations` and nothing
  else on it. So a leading Nations team is 100 % clientless — not a partial mix.
- Live in the public rotation: `MapPlaylist.ts:110-111` keeps `HumansVsNations` in `TEAM_COUNTS`, and
  `:165` reads `disableNPCs: mode === GameMode.Team && playerTeams !== HumansVsNations` — i.e. NPCs are
  **enabled** for exactly this mode. Host-selectable too (`HostLobbyModal.ts:300`).
- The old expression labelled it `HumanTeam`, so the reference doc's `(Bot + Nation + BotTeam) / all`
  counted the crossing in the denominator only.

**Changed.** `WinConditionLeaderKind` gained `"NationsTeam"` (`GameUpdates.ts`). The inline ternary at
`WinCheckExecution.ts:161` became a named `teamLeaderKind(team)` helper — `Bot → BotTeam`,
`Nations → NationsTeam`, everything else → `HumanTeam`. A named function rather than a nested ternary
because the "why" (which modes mix nations in, which does not) needs a comment to live on.

**Behaviour is unchanged**, verified: the guard below still tests `max[0] === ColoredTeams.Bot` only, so
a Nations team is declared the winner exactly as it was at `HEAD`. The new test asserts that explicitly
(`setWinner` **is** called) so the fix cannot silently become a `0022`-shaped behaviour change.

**Doc updated** — without it the fix would have reproduced the same wrong number:
`analytics-event-reference.md` now reads `(Bot + Nation + BotTeam + NationsTeam) / all`, the event-string
grammar lists the new leaf, and a paragraph records _why_ `NationsTeam` is a clientless leaf. **ADR-110
was not touched** (owner ruling Q7 was doc-note-only).

**5-segment wall held:** `Match:WinCondition:TeamPublic:Threshold:NationsTeam` is 5 segments, longest
segment 12 chars. Asserted directly, and by the all-leaves loop (now 56 leaves, was 48).

### R2 — verified, fixed (with a deviation, evidenced)

Verified: `jest.mock` at the top of the suite replaces the whole module, so the imported
`flashistConstants` **is** the mock and `toHaveLength(5)` proved nothing about
`FlashistFacade.ts:65`. No live defect today — the two values do agree.

**Deviation from the obvious fix, with measurement.** The natural route,
`jest.requireActual("…/FlashistFacade")`, was tried in a throwaway suite first: it **hung past a 2-minute
timeout**, against a 0.099 s baseline for this suite. The real module imports `gameanalytics`,
`OtelBrowserInit`, `SessionMatchAnalytics` and more at top level, and this suite runs in the `node`
environment. Importing it is not viable, so the real value is read from the source file instead.

**Changed.** `REAL_MATCH_WIN_CONDITION` is extracted from `src/client/flashist/FlashistFacade.ts` by
regex at module load, and a new test pins the mock to it:

- `expect(mock).toBe(REAL_MATCH_WIN_CONDITION)` — this single assertion makes **every** other assertion
  in the suite real, including the pre-existing 5-segment loop.
- `expect(REAL_MATCH_WIN_CONDITION.split(":")).toHaveLength(2)` — states the arithmetic outright:
  the composer appends exactly 3 segments, so the prefix must stay at 2.
- The extractor **throws** if the constant is not found, so a reformatted source cannot make the wall
  vacuous — it fails loudly instead.

**Residual, stated plainly:** this reads source text, not the evaluated module. A change to the
constant's _value_ or its removal is caught; an exotic rewrite (computed value, template literal) makes
the extractor throw rather than pass. That is a fail-loud direction, not a silent gap — but it is
weaker than evaluating the module, which is not available here.

### R3 — verified, fixed

Verified by reading the arithmetic: `numTilesWithoutFallout === 0` with `max.numTilesOwned() > 0` gives
`Infinity`, and `Number.isFinite(Infinity)` is `false`, so it fell to the `: 0` arm. The comment saying
`NaN` was wrong about which case is ordinary. Reviewer's reachability note also holds — fallout is set
on land only (`NukeExecution.ts:282-283`), so a negative denominator is unreachable.

**Changed.** Extracted `reportedSharePercent()`: finite → `Math.round`; `Infinity` → **100** (the leader
holds all the land there is left); `NaN` (and the unreachable `-Infinity`) → **0**, which has no honest
value. The comment now describes both cases correctly instead of only `NaN`.

**Behaviour unchanged**: this touches the reported _value_ only. `thresholdMet` still comes from the raw
`leaderSharePercent`, so `Infinity > 80` is `true` exactly as at `HEAD`, and the event **count** is
unaffected.

Both branches are now covered — `Infinity → 100` via the threshold branch, and `NaN → 0` via the timer
branch (the threshold branch cannot reach `NaN`: `NaN > 80` is `false`, so nothing is emitted).

### Scope held

`0022`'s guard untouched — `this.active`, both early `return`s, `max.clientID() === null` and the
`gameType !== GameType.Singleplayer || isTutorial === true` clause are unchanged. Emission is still
inside `if (thresholdMet || timerMet)` and above the guard. The payload still carries **no `clientID`
and no per-client data** (the three fixes add no new field and read no new source). No Part B file
touched; `plan.md` not edited; ADR-110 not edited. Nothing committed.

### Verification after the fixes

| Gate                                                 | Result                                          |
| ---------------------------------------------------- | ----------------------------------------------- |
| `npx tsc --noEmit`                                   | exit 0                                          |
| `npm run lint` (whole repo, the `ESLintPlugin` gate) | exit 0                                          |
| `npm test`                                           | **111 suites / 1159 tests, all passing**, 3.4 s |

No `supertest` failure occurred, so no flake triage and no re-run were needed.

**Tests added:** `NationsTeam` leaf reported for a `ColoredTeams.Nations` leader (and `setWinner` still
called); `NationsTeam` added to the all-leaves 5-segment loop (48 → 56 leaves) and asserted as a literal
string; the real-unmocked-constant guard; `Infinity → 100`; `NaN → 0`.

---

## Coder response — round 2

Round 2 processed 2026-09-04. Two findings, both verified against the code before any edit. **Both
agreed with, both fixed** (owner ruling, live in session 2026-09-04, option A: "fix both").

| #   | Verdict   | Defect / Frontier       | Action                                                                                        | Status    |
| --- | --------- | ----------------------- | --------------------------------------------------------------------------------------------- | --------- |
| R4  | **Agree** | Defect (guard fidelity) | Extraction made global; count of **definitions** asserted to be exactly 1, throwing otherwise | **Fixed** |
| R5  | **Agree** | Defect (doc error)      | FFA and team leaf sets stated separately, with reachable counts and a dashboard warning       | **Fixed** |

**Neither fix touches `src/`.** R4 is `tests/client/WinConditionAnalytics.test.ts`, R5 is
`ai-agents/knowledge-base/analytics-event-reference.md`. The `src/` diff is byte-identical to the end of
round 1 — no source edit was needed or made, so the deploy risk profile the owner ruled on is unchanged.

### R4 — verified by reproducing the failure, then fixed

Confirmed the mechanism rather than taking it on trust. A probe applied the exact editing habit the
finding describes to the real source text and ran both the old and the new extraction over it:

| Source text                  | Old non-global `exec` captures | Definitions found | New guard  |
| ---------------------------- | ------------------------------ | ----------------- | ---------- |
| real (today)                 | `"Match:WinCondition"`         | 1                 | passes     |
| mutated (old line commented) | `"Match:WinCondition"` ← stale | 2                 | **throws** |

So the old guard did go green on the mutation while production would compose
`Match:WinCondition:V2:TeamPublic:Threshold:NationsTeam` — six segments, rejected by GameAnalytics.
The finding is exactly right, and it defeated the guard in the one case the guard exists for.
**No live defect today:** `grep -n MATCH_WIN_CONDITION src/client/flashist/FlashistFacade.ts` returns
the single line `:65`, independently confirmed.

**On the precision question raised with the finding** — whether the count should tolerate the constant
legitimately appearing more than once. It should, and the fix does. The assertion counts
**definitions** (`MATCH_WIN_CONDITION:` followed by a string literal), not mentions, which was measured
against the reviewer's suggested `/MATCH_WIN_CONDITION:/g`:

| Mutation of the source                                 | `/MATCH_WIN_CONDITION:/g` | definition-shaped regex |
| ------------------------------------------------------ | ------------------------- | ----------------------- |
| plain reference `analyticEvents.MATCH_WIN_CONDITION`   | 1 (ok)                    | 1 (ok)                  |
| prose doc comment `// MATCH_WIN_CONDITION: fired once` | **2 — false trip**        | 1 (ok)                  |
| commented-out old definition                           | 2 — trips                 | 2 — trips               |

The definition-shaped count is therefore **precise, not merely strict**: it catches the genuinely
ambiguous shape and lets the constant be referenced or documented freely. Deliberate deviation from the
suggested regex, on measurement.

The count is asserted twice on purpose — as a `throw` at module load (cannot be skipped, and fails the
whole suite loudly) and as an `expect` inside the prefix test (so the invariant is visible in test
output rather than buried in a helper).

### R5 — verified, fixed; the test sweep deliberately left at 56

Verified the disjointness directly: `checkWinnerFFA` passes mode `"Ffa"` with `FFA_LEADER_KIND`
(`PlayerType` → `Bot|Nation|AiPlayer|Human`), and `checkWinnerTeam` passes `"Team"` with
`teamLeaderKind()` (→ `BotTeam|NationsTeam|HumanTeam`). The emitting branch picks both the mode segment
and the leaf set, so they cannot cross. **7 leader leaves, not 7 per mode.** The grammar as written
advertised 56; 28 are grammatically reachable.

**One refinement beyond the finding, on my own evidence.** Of those 28, the four `…Public:…:Timer` ids
are **also** unreachable: `MapPlaylist.ts:162` sets `maxTimerValue: undefined` on the public game config,
which I re-read rather than inheriting from the doc's existing claim. So **21** ids can actually appear.
The doc now states 28 grammatically-reachable and 21 actually-reachable, and warns that a cross-product
dashboard would show **35** permanently-empty series — read as telemetry loss, or as evidence the
clientless case does not occur, which is the opposite of this task's finding.

**The 56-leaf test sweep was NOT reduced**, per the instruction — and a comment was added above it
saying why, so a later reader cannot "fix" it to match the doc. The loop covers the **composer**, which
must keep any well-typed update inside the five-segment cap; reachability is a separate property of
`WinCheckExecution`. Shrinking the loop would silently drop composer coverage.

### Verification after the round-2 fixes

| Gate                                                 | Result                                          |
| ---------------------------------------------------- | ----------------------------------------------- |
| `npx tsc --noEmit`                                   | exit 0                                          |
| `npm run lint` (whole repo, the `ESLintPlugin` gate) | exit 0                                          |
| `npm test`                                           | **111 suites / 1159 tests, all passing**, 3.5 s |

No `supertest` failure occurred, so no flake triage and no re-run were needed. Test count is unchanged
because R4 added assertions to an existing test rather than a new one.

**Scope held:** nothing under `src/` touched; `0022`'s guard untouched; Part B untouched; `plan.md`,
ADR-110 and the _Reviewer findings_ section not edited; nothing committed.

---

## Coder response — round 3

| #   | Verdict   | Defect / Frontier  | Action                                                             | Status    |
| --- | --------- | ------------------ | ------------------------------------------------------------------ | --------- |
| R6  | **Agree** | Defect (doc error) | "four" → **seven**, with the leaf breakdown and the `28 − 7` shown | **Fixed** |

**My error, introduced by my own round-2 refinement.** The `21` and `35` were right; the count of
excluded ids was not. Re-derived before editing: the unreachable set is every leader leaf of **both**
modes at `Public` + `Timer` — `FfaPublic:Timer:{Bot|Nation|AiPlayer|Human}` = 4 plus
`TeamPublic:Timer:{BotTeam|NationsTeam|HumanTeam}` = 3 — so **7**, and `28 − 7 = 21`. As written a
reader computing `28 − 4 = 24` would have hit a contradiction two lines later and reasonably distrusted
the `21`, which is correct.

**Swept the rest of the section for the same mistake, as asked.** `grep` over the whole file returns
exactly one occurrence of "four" (the line fixed). Every other figure re-checked and left alone: the
`4` in `` `4 FFA + 3 team` `` is a **different quantity** — the four FFA leader kinds — and is correct;
`7 leader leaves`, `28`, `56`, `21` and `35` are all correct and now mutually consistent.

**One addition beyond the single word:** the leaf breakdown and the `28 − 7` subtraction are now spelled
out inline, so the arithmetic is checkable on the page rather than trusted. That is what would have
caught this in round 2.

**No test was run for this change, and none was needed** — it is one document, no code. The last full
gate run (round 2: `tsc` exit 0, `lint` exit 0, `npm test` 111 suites / 1159 tests passing) still stands
unchanged, because nothing executable was touched since.

**Scope held:** nothing under `src/` touched; the 56-leaf sweep, `plan.md`, ADR-110 and the _Reviewer
findings_ section all untouched; Part B untouched; nothing committed. The ledger's `Status:` line is the
reviewer's to set — I have not edited it.

⚠️ **Closing this ledger settles Part A's review only.** **Task `0208` is not complete** — Part B is
planned but HELD on the owner's production `Game:Mode:Solo` figures. Consistent with the callout at the
top of this ledger.

---

## Accepted residuals (shared, do-not-re-litigate)

**None — and that is the correct end state for R1–R3, not an omission.** The owner ruled "fix now" on
all three (R3 beyond the reviewer's own recommendation), so none was deferred and none became a settled
tradeoff. An entry is added here only when the owner approves treating a finding as one.

R4 and R5 are open, not residuals; they carry no disposition yet.

---

## Coder note — Part B built, NOT yet reviewed (2026-09-04)

**Coder-authored. No reviewer section above was edited, and none of Part A's verdicts is affected.**

The Part B hold was released the same day, after the owner pulled the production figures it was waiting
on. Part B is now built. **It has had no review of any kind — not a reviewer pass, not an adversarial
pass.** Everything above this line still means what it says: it settles **Part A's** review only.

Part B's change surface, for whoever reviews it:

- `src/client/leaderboard/LeaderboardReporter.ts`
- `src/client/ClientGameRunner.ts` (two call sites only)
- `src/client/flashist/FlashistFacade.ts` (one enum key)
- `ai-agents/knowledge-base/analytics-event-reference.md` (new *Leaderboard Award Events* section)
- `tests/client/LeaderboardReporter.test.ts` (new)

⛔ **Part A's files are byte-unchanged and nothing under `src/core/` was touched.** Part B is
client-only, which is why it carries no determinism risk.

Two things a reviewer should look at first, because they are the judgement calls:

1. **The emission sits in a `finally`.** `increaseCurPlayerLeaderboardScore` can **reject**, not merely
   return `false`, so a bare post-`await` emit would drop exactly the platform-failure case Decision 3
   says to count. Recorded as decision 15 in `worklog.md`.
2. **The mid-match-reload residual is firmer than the plan had it, and is still static analysis, not a
   play-test.** Two independent reasons a Singleplayer reload cannot resume, set out in `worklog.md`.
   Verification 18 was **not** performed.

Gates at the time of writing: `tsc --noEmit` exit 0, `lint` exit 0, `npm test` 112 suites / 1176 tests
green on the first run (no `supertest` failure, so no flake triage applied).

---

# Review — 0208 **Part B**

Scope: **Part B only** — the Singleplayer platform-leaderboard award instrumentation. Part A's sections
above are **closed out and untouched**; this is a separate, first-round review of a surface that had had
**no review pass of any kind**.

Files under review:

- `src/client/leaderboard/LeaderboardReporter.ts`, `src/client/ClientGameRunner.ts` (two call sites),
  `src/client/flashist/FlashistFacade.ts` (+1 enum line)
- `ai-agents/knowledge-base/analytics-event-reference.md` (new *Leaderboard Award Events* section)
- `tests/client/LeaderboardReporter.test.ts` (new, 17 tests)

Status (Part B): **closed-out — Part B's review is settled. Nothing is open: B1, B2 and B4 are fixed
and verified; B3 is an owner-accepted residual.**

> ⚠️ **Quoted alone, this line must NOT be read as "`0208` is done".** Part A and Part B are both
> **BUILT AND REVIEWED — and that is all.** Specifically:
>
> - **Task `0208` is NOT closed.** Only the **producer** may close it; no reviewer or coder close is
>   valid. Nothing in this ledger closes the task.
> - **`0211` stays gated on this being DEPLOYED AND COLLECTING DATA**, not merely built. A green
>   review is not a deployment.
> - **Nothing has been observed on a dashboard at any point in this task.** Analytics are prod-only,
>   so every number here is a design claim about what *will* be emitted, never a measurement.
> - **V16, V17 and V18 remain uncovered**, by declaration rather than oversight. V18 is a manual
>   play-test that was never run.


Reviewers run (Part B, Round 1): **fkit-reviewer own pass** + **Codex adversarial pass**
(`codex-cli 0.152.0`, `gpt-5.5`, read-only sandbox). **Both ran — coverage is complete.**

Verdict (Part B, Round 1): **⚠️ Changes requested — 3 defects (1 medium, 2 low).** None can break a
match or affect the simulation; Part B is client-side analytics only. **B1 inverts a core dimension of
the deliverable for an entire user-selectable mode** and is the one worth acting on before the number is
read.

**Part A confirmed byte-unchanged by Part B**, verified: `WinCheckExecution.ts` 154, `GameUpdates.ts` 41,
`tests/core/executions/WinCheckExecution.test.ts` 452 — matching the closed-out state exactly.
`ClientGameRunner.ts` and `FlashistFacade.ts` are shared and now carry both parts, as expected.

## Reviewer findings — Part B

| #   | Round | Sev    | file:line                                     | Claim                                                                                                                                                                                        |
| --- | ----- | ------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | 1     | medium | `src/client/ClientGameRunner.ts:436-439`      | `humanWon` only recognises a `["player", …]` winner, so **every Singleplayer *Team*-mode win by the player's own team is recorded as `PlacementLost`**. Raised by Codex; confirmed. Reviewer missed it. |
| B2  | 1     | low    | `tests/client/LeaderboardReporter.test.ts:284` · `analytics-event-reference.md:170` | `PlacementLost:SoloTutorial` is **unreachable in production**, but the test calls its set "every reachable event id" and the doc grammar implies all six fire. Found independently by both reviewers. |
| B3  | 1     | low    | `src/client/leaderboard/LeaderboardReporter.ts:80-90,115-123` | The emit inside `finally` can itself throw — via `flashist_logErrorToAnalytics`'s **unguarded** `GameAnalytics.addErrorEvent` — and would then **replace** the original platform rejection. Reviewer only. |
| B4  | 2     | low    | `tests/client/LeaderboardReporter.test.ts:323-344`            | The test titled "covers every shape `makeWinner()` emits" is a **convention test, not an exhaustiveness guard** — it does NOT fire if `Winner` grows a fifth outcome. Found independently by both reviewers; **proved by compilation**, not asserted. |

### B1 — detail (the one that matters)

`reportPlacements` derives:

```ts
const humanWon =
  winner !== undefined && winner[0] === "player" && winner[1] === this.lobby.clientID;
```

> ✏️ **Corrected in Round 2 — this reviewer under-counted.** The sentence below originally said
> **three** shapes. `GameImpl.makeWinner()` emits **four outcomes**: the three tuples **plus
> `undefined`** (the bare `return;` for a clientless winner outside non-tutorial Solo). `WinnerSchema`
> (`src/core/Schemas.ts:485-492`) is a three-tuple union marked `.optional()`. The coder caught this;
> the corrected count is what the fix and its tests are built on.

But `GameImpl.makeWinner()` (`:667-693`) emits **four** outcomes: `["player", clientID, …]`,
`["team", teamName, …clientIDs]`, `["opponent", name]`, and **`undefined`**. Singleplayer **Team mode is a first-class,
user-selectable option** — `SinglePlayerModal.ts:179-182` renders the Team card, `:564-565` passes
`gameMode` and `playerTeams` straight through, and `:259-260,579-580` even support `HumansVsNations`
in solo. In that mode a win by the player's own team produces `["team", "Red", …]`, `winner[0]` is not
`"player"`, and `humanWon` is `false`.

*Failure scenario:* a player starts a Singleplayer Team match, **their team wins**, and Part B emits
`Match:Leaderboard:Award:PlacementLost:Solo` carrying the **first-place** award value (10). The won/lost
split — the whole point of separating `PlacementWon` from `PlacementLost` — is inverted for that mode,
and the error is silent and systematic, not sampled. Singleplayer is ~58 % of non-tutorial match starts,
so this is a slice of the dominant mode.

The correct derivation already exists in the codebase and was not reused: `WinModal.ts:533-535` handles
the team case as `winner[1] !== myPlayer.team()` for a loss. `PlayerView.team()` is available
(`GameView.ts:348`). Extending the predicate to
`(winner[0] === "team" && winner[1] === me.team())` closes it — this is *not* the
`isSoloOpponentWin()` reuse that was deliberately rejected (that carried `isAlive()` and
`!hasShownDeathModal`); only the tuple-shape branch is being borrowed.

⚠️ **Note the pattern:** this is the **same class of defect as Part A's R1** — a team-shaped winner
falling into the wrong bucket because only the non-team shape was considered. Worth naming so the third
instance is caught by design rather than by review.

### B2 — detail

Tutorials are hard-coded FFA Singleplayer (`Main.ts:822-835`: `gameType: Singleplayer`,
`gameMode: GameMode.FFA`, `isTutorial: true`), and `LocalServer.buildMissionConfigIfNeeded` additionally
forces `disableNPCs = true` for them. So the only possible tutorial leaders are the human and Bots. A
clientless leader hits `WinCheckExecution`'s guard (`:146-152`: clientless **and** `isTutorial === true`)
and returns **before** `setWinner`, so no `Win` update exists and `reportPlacements` never runs
(`ClientGameRunner.ts:573-578`). The only tutorial `Win` update possible is a human win →
`humanWon === true`. **`PlacementLost:SoloTutorial` cannot occur today.**

Five of six ids are reachable, not six. The test at `:284` is titled "every reachable event id" and the
doc grammar lists the full cross-product.

**Weaker than Part A's R5, and the leaf is defensible.** One empty series, not 35 — and it becomes
reachable if `0205`/`0211` removes the tutorial carve-out (then `makeWinner` returns `undefined` for a
clientless tutorial winner, `humanWon` is `false`, and the leaf fires). The honest fix is a naming and
documentation one — rename the test to say it covers the *composer* (Part A's own resolution) and note
the current unreachability in the doc — not removing the leaf. The owner may reasonably decline.

### B3 — detail

`logLeaderboardAwardAnalytics` → `flashist_logEventAnalytics`, which wraps its `GameAnalytics.addDesignEvent`
call in `try/catch` (`FlashistFacade.ts:209-216`) — but its **catch handler** calls
`flashist_logErrorToAnalytics`, which calls `GameAnalytics.addErrorEvent(...)` **with no guard**
(`FlashistFacade.ts`, prod branch). If the GameAnalytics SDK is in a broken state, both calls throw; the
second escapes, propagates out of the `finally`, and **replaces** the original platform rejection.

*Failure scenario:* the Yandex SDK rejects `leaderboards.setScore`; the analytics SDK is also broken; the
global `unhandledrejection` handler (`FlashistFacade.ts:294`, `OtelBrowserInit.ts:139`) reports a
GameAnalytics error instead of the platform failure, and the real cause is lost.

**Impact is diagnostic noise only** — no state corruption, no double award, no wrong count (the design
event had already failed). It requires the analytics SDK itself to be throwing, at which point the
measurement is unavailable regardless. A `try {} catch {}` around the emit inside `finally` closes it, at
the cost of a swallow in a path where analytics is already broken. **The reviewer's own lean is to accept
this as-is and document it** rather than add the guard.

## Rulings on the three things asked for independently

**1. The `finally` deviation from the plan's letter — CORRECT. Verified at the source, not accepted from
the argument.** `increaseCurPlayerLeaderboardScore` (`FlashistFacade.ts:1372-1400`) swallows only the
`getPlayerEntry` lookup; its final statement, `result = await this.setCurPlayerLeaderboardScore(...)`, is
**outside any `try`**. `setCurPlayerLeaderboardScore` (`:1349-1370`) awaits `this.yandexInitPromise`,
`checkIfSdkMethodAvailable`, and `leaderboards.setScore` **all unguarded**. So the call genuinely
**rejects** rather than returning `false`, and a post-`await` emit would drop precisely the
platform-failure case Decision 3 requires be counted, biasing the number toward success. `finally` is
the right construct.

- **Propagation is unaltered.** `try { x = await f() } finally { g() }` runs `g()` then rethrows —
  identical to `HEAD`'s bare `await`. The new test at `:259-281` proves both halves: it asserts
  `rejects.toThrow("sdk unavailable")` **and** that the event was still logged. Strong, non-vacuous.
- **`result` is not a lint or logic problem.** It is read by the trailing `console.debug`; `lint` exits 0.
  On rejection that `console.debug` is skipped — which is `HEAD`'s behaviour too, unchanged.
- **The unhandled rejection at the fire-and-forget call site is PRE-EXISTING**, not introduced here:
  `HEAD` had the same unguarded `await`. It is also not silent — global `unhandledrejection` handlers
  exist. Out of scope, recorded only as context.
- The one masking path is B3.

**2. The two declared verification gaps — both are the RIGHT CALL, and neither is cheaply closable.**

- **V16 (replay → no emission).** Verified by reading that **both** call sites are gated on
  `this.lobby.gameRecord === undefined` (`ClientGameRunner.ts:527` participation, `:576` placement), and
  the reporter deliberately has no replay knowledge. Closing this by test needs a `ClientGameRunner`
  harness — worker, transport, renderer — which does not exist in the repo and is a far larger piece of
  work than Part B itself. Declaring the gap is correct.
- **V17 (exactly one event per path per match).** Rests on the pre-existing `hasReportedParticipation` /
  `hasProcessedWin` latches. Worth recording one code-reading confirmation the coder did not claim: both
  latches are set **before** the call, so even a throwing or rejecting reporter cannot unlatch and permit
  a second emission. Same harness problem otherwise. Right call, and the plan's instruction not to claim
  it from code reading was correctly followed.

**3. The 5-segment wall and Part A's R4 hole — NOT reintroduced.** `tests/client/LeaderboardReporter.test.ts:48-71`
uses `.matchAll(/MATCH_LEADERBOARD_AWARD:\s*"([^"]+)"/g)` — **global** — and throws unless exactly one
definition is found. That is Part A's *fixed* pattern, including the definition-shaped (not
mention-shaped) match that avoids false-tripping on a prose comment. All six composed ids are 5 segments
and match the GameAnalytics regex; `Match:Leaderboard:Award` is 3 segments, leaving room for exactly two
more, which the test pins at `:111`.

## Verified clean — Part B

| Area                          | Evidence                                                                                                                                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Multiplayer emits nothing** | `logLeaderboardAwardAnalytics` returns early unless `gameType === GameType.Singleplayer`; both call sites pass `gameView.config().gameConfig().gameType`. Tests cover Public **and** Private for both entry points, and assert `increaseScore` **was** still called — i.e. the platform award is unchanged, only the measurement is scoped. Correct: implementing `0210`'s ruling here would have destroyed the pre-fix number. |
| **`Solo` / `SoloTutorial` split** | `isTutorial` is threaded from `gameConfig()` at both sites as `=== true`. `Main.ts:835` is the **only** `isTutorial: true` in `src/`, so missions and ordinary solo correctly stay `Solo`. The split is right at the source, which matters because subtracting `Tutorial:Started` over-counts. |
| **`humanWon` for the FFA shapes** | `Main.ts:784,802,808` use one generated `clientID` for both the lobby and the player, so `winner[1] === this.lobby.clientID` genuinely holds for a solo human win. A clientless nation win yields `["opponent", name]` → `PlacementLost`, correct. **The team shape is B1.** |
| **Non-human players**         | Both functions return before any award or emission on `params.player.type() !== PlayerType.Human`. Tested for `Bot` and `FakeHuman`. |
| **Latches / replay**          | `hasReportedParticipation` and `hasProcessedWin` both set before the call; both call sites replay-gated. See V16/V17 above. |
| **No new Part A regression**  | Part A's three core files byte-unchanged (154 / 41 / 452). Part A's own test file still carries the R4-fixed guard. |
| **Localization**              | **Confirmed none needed.** The diff adds no user-visible text — only analytics ids and `console.debug` output. No `translateText` key required, so `en.json` / `ru.json` correctly untouched. |
| **Gates (verified independently, not on trust)** | `npx tsc --noEmit` exit 0 · `npm run lint` exit 0 · `npm test` **112 suites / 1176 tests, all passing, first run**. Matches the coder's report exactly. No `supertest` failure, so no flake triage and no re-run needed. |

## Out of scope — deliberately not raised

- **The owner's "solo should not contribute to leaderboard/XP" ruling is not implemented here.** `0210`
  owns it; implementing it in Part B would destroy the pre-fix number Part B exists to capture. Correctly
  scoped, and its absence is **not** a defect.
- **`LeaderboardReporter.ts`'s three pre-existing `prettier --check` failures** (two `console.debug` arg
  lists, `reportPlacement`'s multi-line signature) were present at `HEAD` and left alone. Pre-existing,
  not this change.
- `ai-agents/sprints/backlog.md`, `0210/brief.md`, `0211/brief.md`, `0062/*`, `0212/*` — concurrently
  edited by other agents, not Part B, not reviewed.

## Coder response — Part B

_Coder-owned section. The reviewer does not write here._

| #   | Verdict | Defect / Frontier | Action | Status |
| --- | ------- | ----------------- | ------ | ------ |
| B1  |         |                   |        |        |
| B2  |         |                   |        |        |
| B3  |         |                   |        |        |

---

## Coder response — Part B round 1

**Coder-authored. No reviewer section was edited.** This supersedes the "Part B built, NOT yet
reviewed" note above, which was accurate when written.

**All three findings agreed. Two fixed (B1, B2); B3 recorded as an accepted residual per the owner's
ruling, not fixed.** Each was verified against the code before acting, per `CLAUDE.md`'s review-notes
rule. Nothing was applied outside the owner's dispositions.

### B1 — CONFIRMED at source, fixed. Verdict: the reviewer is right, and it is worse than a label bug.

Verified independently rather than from the relay:

- `GameImpl.makeWinner()` (`src/core/game/GameImpl.ts:667-693`) emits **four** outcomes, not one:
  `["team", teamName, ...clientIDs]` when the winner is a `Team` (a string); `["opponent", name]` for
  a clientless winner in non-tutorial Solo; `["player", clientId]`; and `undefined` for a clientless
  winner anywhere else.
- **Singleplayer Team mode is genuinely user-selectable.** `SinglePlayerModal.ts` renders the Team
  option card (`handleGameModeSelection(GameMode.Team)`) and passes `gameMode: this.gameMode` and
  `playerTeams: this.teamCount` into a config whose `gameType` is `GameType.Singleplayer`. It even
  special-cases `HumansVsNations` in solo.
- `PlayerView.team()` exists (`src/core/game/GameView.ts:348`) and returns `Team | null`;
  `Team` is `string` (`src/core/game/Game.ts:51`).

So the original predicate reported a **solo team win** as `PlacementLost` carrying the **first-place**
point value — the split inverted, silently and systematically, inside the mode that is ~58 % of match
starts. Agreed without reservation.

**Fix.** The derivation moved out of `ClientGameRunner` into an exported pure function
`humanWonPlacement(winner, clientID, team)` in `LeaderboardReporter.ts`, and now handles every shape.
It mirrors `WinModal.isSoloOpponentWin()`'s **tuple branches only**; its `isAlive()` /
`!hasShownDeathModal` conditions are **not** reused — those are the bias that makes
`Match:Loss:OpponentWon` a lower bound, and were rightly rejected at plan time.

⚠️ **Why it moved rather than being patched in place:** `ClientGameRunner` has no unit-test harness in
this repo, which is the same gap that leaves V16 uncovered. The reviewer asked for a solo-Team-win
test, and in place there was no way to write one. Six new tests now cover it, including a tripwire
that fails if `makeWinner()` grows a fourth tuple shape.

### B2 — CONFIRMED, fixed as a naming/doc change only. Verdict: correct, and the reachable count is 5.

Verified: the tutorial config is `gameMode: GameMode.FFA, isTutorial: true` (`src/client/Main.ts`),
and `src/client/LocalServer.ts:115-121` forces `config.disableNPCs = true` for tutorials. In
`WinCheckExecution` the `0022` guard returns whenever the leader is clientless **and**
(`gameType !== Singleplayer` **or** `isTutorial === true`), so a clientless tutorial leader never
reaches `setWinner`, no `Win` update is produced, and the placement path never runs. Only a human win
is possible ⇒ `PlacementLost:SoloTutorial` is unreachable today. **5 reachable ids, not 6.**

**The leaf was NOT removed and the sweep was NOT shrunk.** The test is renamed to *"composes a
five-segment event id for every leaf"* under a `the event-id composer` describe, carrying the same
comment shape Part A uses at `tests/client/WinConditionAnalytics.test.ts:107-113`: the cross-product is
deliberate, it covers the composer, reachability is a separate property documented in the reference
doc, and shrinking the loop would silently drop composer coverage. The doc now states the
unreachability, says to build dashboards from the five, and records that the leaf becomes reachable
when `0205` / `0211` lands.

### B3 — CONFIRMED, NOT fixed. Recorded as an accepted residual per the owner's ruling.

Agreed on the mechanism: the emit inside `finally` can itself throw, because
`flashist_logEventAnalytics`'s own catch calls `flashist_logErrorToAnalytics` →
`GameAnalytics.addErrorEvent` unguarded, and a throw there replaces the platform rejection that was
propagating. **No `try`/`catch` was added.** Written into `analytics-event-reference.md` as an accepted
residual with the owner's reasoning: it only bites when the analytics SDK is already broken, and a
swallow would trade a rare mislabelled error for a permanently silent one.

### Change surface for the re-verification pass

- `src/client/leaderboard/LeaderboardReporter.ts` — `humanWonPlacement()` added and exported.
- `src/client/ClientGameRunner.ts` — `reportPlacements()` calls it; import updated. **This is the live
  predicate change the reviewer flagged as warranting another pass.**
- `tests/client/LeaderboardReporter.test.ts` — +6 tests (23 total); composer sweep renamed, not shrunk.
- `ai-agents/knowledge-base/analytics-event-reference.md` — winner-shape note, the 5-of-6
  reachability note, and B3's accepted residual.

⛔ **Nothing under `src/core/`; Part A byte-unchanged** — diffstat still 154 / 41 / 452. `awardTable`,
`placement`, `_winUpdate`'s signature and `0210`'s guard all untouched. The three pre-existing
`prettier` failures in `LeaderboardReporter.ts` were left alone.

Gates: `tsc --noEmit` exit 0, `lint` exit 0, `npm test` **112 suites / 1182 tests green on the first
run** — no `supertest` failure, so no flake triage applied.

**No open question is being carried forward for the owner.**

---

## Accepted residuals — Part B

**B3 — a broken analytics SDK can mask the platform error.** The `finally` emit can throw and replace a
propagating platform rejection (`flashist_logEventAnalytics` → `flashist_logErrorToAnalytics` →
unguarded `GameAnalytics.addErrorEvent`). **Owner-accepted 2026-09-04. Do not re-litigate.** Fixing it
means swallowing inside the analytics path, which trades a rare mislabelled error for a permanently
silent one. Recorded in `analytics-event-reference.md`.

---

## Part B — Round 2: B1/B2 fixes verified, B3 residual confirmed recorded

### Owner dispositions — ruled live in session, 2026-09-04

| Finding | Owner ruling                                                       | Outcome                                            |
| ------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| B1      | **Fix now** — the reviewer's recommended option A.                  | ✅ Fixed, verified below.                           |
| B2      | **Fix now** — rename + doc only, leaf kept, sweep kept at 6.        | ✅ Fixed, verified below.                           |
| B3      | **Accept as a residual** — against the reviewer's option-B lean.    | ✅ Recorded, not fixed. Reads correctly standing alone. |
| B4      | —                                                                   | ⏳ **Open** (new this round).                        |

### B1 — VERIFIED CORRECT. Behaviour-preserving for the old shape, and it fixes the new one.

`humanWonPlacement(winner, clientID, team)` is correct for **all four** outcomes, checked against
`WinnerSchema` (`Schemas.ts:485-492`) and `makeWinner()` (`GameImpl.ts:667-693`):

| Outcome                       | Result  | Correct?                                                       |
| ----------------------------- | ------- | -------------------------------------------------------------- |
| `undefined`                   | `false` | ✅ clientless winner, no human win                              |
| `["player", clientID, …]`     | `winner[1] === clientID` | ✅ **byte-identical to the old inline predicate** |
| `["team", teamName, …]`       | `team !== null && winner[1] === team` | ✅ mirrors `WinModal.ts:533-535` |
| `["opponent", name]`          | `false` | ✅ clientless winner, never a human win                         |

The `team !== null` guard is right and load-bearing: FFA returns `team() === null`, and without it a
`null` team could not match anyway — but the guard makes the intent explicit and is pinned by a test.
The call site passes `me.team()` where `me` is the already-null-checked local human
(`ClientGameRunner.ts:442`).

**Tests are non-vacuous** — read, not taken from the pass. The solo-Team-win case (`:300-306`) carries
**both** a positive (`["team","Red",…]` with `team="Red"` → `true`) and a negative (`["team","Blue",…]`
with `team="Red"` → `false`), and the positive is exactly the case that was broken. `:308-312` pins the
FFA/null-team guard separately.

### The module move — SOUND. Ruling: keep it, do not revert.

The derivation moved from `ClientGameRunner` into `LeaderboardReporter.ts` as an exported
`humanWonPlacement`. Assessed independently:

- **Behaviour-identical for the `["player", …]` shape** — the old inline expression was
  `winner !== undefined && winner[0] === "player" && winner[1] === this.lobby.clientID`; the new function
  reduces to exactly that for the same input, and the call site passes the same `this.lobby.clientID`.
  The only behaviour change is the team branch, which **is** the fix.
- **The rationale is correct and is Part A's own precedent.** `ClientGameRunner` has no unit-test
  harness — the same gap that leaves V16/V17 uncovered — so in place, the solo-Team-win test could not
  have been written at all. Part A extracted `WinConditionAnalytics.ts` for the same reason. Extracting
  the predicate is what made this fix *provable* rather than merely *claimed*.
- **Exporting widens nothing that matters.** It is a pure, side-effect-free function over three plain
  values. Only `ClientGameRunner` and the test import it; no import cycle. `Winner` and `Team` are
  type-only imports that TypeScript elides.
- **Minor, not a finding:** a winner-shape predicate is arguably slightly off-domain for a module named
  `LeaderboardReporter`. It is the only consumer, the doc comment is thorough, and moving it again would
  cost more than it returns. Fine as is.

**Verdict: the deviation is sound and better than the in-place alternative. No revert wanted.**

### B2 — VERIFIED. Five reachable ids is right, and the sweep was not shrunk.

Reachability chain re-verified end to end: `Main.ts:819-835` (tutorial = `gameType: Singleplayer`,
`gameMode: GameMode.FFA`, `isTutorial: true`) → `LocalServer.ts:115-121` forces `disableNPCs = true` →
`WinCheckExecution.ts:146-152`, `0022`'s guard returns when the leader is clientless **and**
(`gameType !== Singleplayer` **or** `isTutorial === true`) → no `setWinner`, no `Win` update →
`reportPlacements` never runs (`ClientGameRunner.ts:573-578`). The only tutorial `Win` update possible is
a human win. **`PlacementLost:SoloTutorial` is unreachable today. Five of six.**

**The composer sweep was NOT quietly shrunk** — the exact trap Part A's R5 caught once. It is still
`2 × 3 = 6` leaves at `:359-395`, with length **and** uniqueness asserted, renamed to *the event-id
composer* and carrying a comment saying why it must not be reduced to five. Coverage is unchanged;
only the name is.

### B3 — residual confirmed correctly recorded

It reads correctly standing alone in both places: the ledger's *Accepted residuals — Part B* (mechanism,
owner-accepted date, and the reason the fix was declined — swallowing inside the analytics path trades a
rare mislabelled error for a permanently silent one) and `analytics-event-reference.md`. No `try`/`catch`
was added, as ruled.

### B4 — NEW. The tripwire does not fire. Proved, not asserted.

`tests/client/LeaderboardReporter.test.ts:323-344` is titled *"covers every shape `makeWinner()` emits"*
and its comment claims *"A tripwire, not a formality."* It is, mechanically, a formality: `shapes` is a
**hardcoded array literal**, so adding a fourth tuple to `WinnerSchema` leaves it valid, and the runtime
loop and filter still pass.

**Demonstrated by compiling it**, rather than reasoning about it. With a fifth outcome added to a
stand-in `Winner` union, the repo's own `tsc --strict` reports **exactly one** error — and it is from a
`Record<WinnerTag, true>` exhaustiveness check, **not** from the array-literal form the test actually
uses:

```
error TS2741: Property 'coalition' is missing in type '{ player: true; team: true; opponent: true; }'
  but required in type 'Record<"player" | "team" | "opponent" | "coalition", true>'.
```

*Failure scenario:* `WinnerSchema` grows a fourth tuple, `makeWinner()` emits it, `humanWonPlacement`
falls through to `false`, and a genuine win is recorded as `PlacementLost` — **instance four of the
pattern worklog decision 20 was written to prevent** — while this suite stays green until a human
remembers to edit `shapes`.

**No production impact today**; the predicate is correct for all four current outcomes. The fix is about
three lines in the test:

```ts
type WinnerTag = NonNullable<Winner>[0];
const COVERED: Record<WinnerTag, true> = { player: true, team: true, opponent: true };
```

`tsc --noEmit` is already a gate, so that turns the convention into an enforced check. Absent that, the
honest alternative is to **downgrade the comment's wording** — call it a convention test, not a tripwire —
so nobody relies on protection that is not there.

### Gates — re-verified independently, not taken on trust

`npx tsc --noEmit` exit 0 · `npm run lint` exit 0 · `npm test` **112 suites / 1182 tests (+6), all
passing, first run**. Matches the coder's report exactly. No `supertest` failure, so no flake triage and
no re-run needed.

### Scope re-verified

`src/core/` untouched by Part B — Part A's three files still at **154 / 41 / 452**, exactly the
closed-out sizes. Nothing added under `src/core/`. No `0210` / `0211` / `0212` / `0062` /
`backlog.md` file was read or written.

### V16 / V17 / V18 — still honestly represented

Unchanged and not upgraded, correctly. None of the six new tests claims to cover them. V16 (replay → no
emission) remains code-reading only — I re-confirmed both call sites are gated on
`this.lobby.gameRecord === undefined` (`:530`, `:576`). V17 rests on the pre-existing latches, both still
set **before** the call, so a throwing reporter cannot unlatch. V18 (mid-match reload) remains an
unperformed manual play-test, recorded as such in the doc. Closing V16/V17 by test still needs a
`ClientGameRunner` harness that does not exist.

## Coder response — Part B, Round 2

_Coder-owned section. The reviewer does not write here._

| #   | Verdict | Defect / Frontier | Action | Status |
| --- | ------- | ----------------- | ------ | ------ |
| B4  |         |                   |        |        |

---

## Coder response — Part B round 2

**Coder-authored. No reviewer section was edited.**

**B4 agreed and fixed. Test file only — no production code changed in this round.** The finding is
correct and the criticism lands: the comment claimed a guarantee the code did not provide, which is the
worse half of the defect. A tripwire that was never shown to fire is exactly the thing decision 20 was
written to prevent, so having written one is worth recording plainly.

### B4 — CONFIRMED, fixed. And the tripwire is now DEMONSTRATED to fire, not asserted to.

The old check was `const shapes: Winner[] = [...]` — a hardcoded array literal. Adding a fourth tuple
to `WinnerSchema` leaves that literal perfectly valid, `humanWonPlacement` falls through to `false`,
and the suite stays green while a genuine win is logged as `PlacementLost`.

**Fix:** a type-level check derived from `Winner` itself, alongside the runtime assertions, which were
kept because they test a different thing (that the predicate returns a boolean for each shape, and says
"won" for exactly the player and own-team shapes):

```ts
type WinnerTag = NonNullable<Winner>[0];
const COVERED: Record<WinnerTag, true> = { player: true, team: true, opponent: true };
```

**Proof that it fires — run, not reasoned.** A temporary file was added to the repo carrying a stand-in
union with a **fourth** variant (`["coalition", string, ...string[]]`) in `WinnerSchema`'s
variadic-tuple shape, plus **both** forms: the `Record<Tag, true>` above, and the old array literal as
a control. `npx tsc --noEmit` — the repo's own gate — reported **exactly one error**:

```
tests/client/b4-tripwire-proof.ts(17,14): error TS2741: Property 'coalition' is missing in type
'{ player: true; team: true; opponent: true; }' but required in type
'Record<"player" | "team" | "opponent" | "coalition", true>'.
```

Two things that matters for: the error comes from the `Record` line, and **the array-literal control
compiled without complaint** — which is the direct demonstration that the old form was not a tripwire.
The stand-in file was deleted immediately afterwards; `tsc --noEmit` is clean again and **the file is
not in the tree** (`git status` shows no such path).

**The comment was rewritten to claim only what the code enforces**, and now states which check does
which job, and that the array literal cannot notice a new variant.

### Not acted on, deliberately

The reviewer's minor non-finding — that a winner-shape predicate is slightly off-domain for a module
named `LeaderboardReporter` — was explicitly marked not worth another move, and **no move was made**.

### Change surface

- `tests/client/LeaderboardReporter.test.ts` — the type-level tripwire and the rewritten comment.
  **Nothing else.** No production file was touched in this round.

⛔ **Nothing under `src/core/`; Part A byte-unchanged** — 154 / 41 / 452. `awardTable`, `placement`,
`_winUpdate`'s signature and `0210`'s guard untouched; the three pre-existing `prettier` failures in
`LeaderboardReporter.ts` left alone.

Gates: `tsc --noEmit` exit 0, `lint` exit 0, `npm test` **112 suites / 1182 tests green on the first
run** — no `supertest` failure, so no flake triage applied. Test count is unchanged at 1182 because B4
strengthened an existing test rather than adding one.

**No open question is being carried forward for the owner.**

---

## Part B — Round 3: B4 fixed; Part B review closed out

**Disposition:** B4 — **fix now, option A**, the reviewer's recommendation. ⚠️ **Ruled by the
coordinator, NOT the owner** (three lines of test code, zero production risk; the owner was told and it
was flagged reversible). Recorded that way deliberately, so the provenance of this one decision is not
later mistaken for an owner ruling.

**Test-file-only, verified independently.** `WinnerTag` and `COVERED` appear **only** in
`tests/client/LeaderboardReporter.test.ts` — a repo-wide search finds them nowhere under `src/`. No
production code changed this round.

### The stand-in really is gone — checked three ways

This was the one thing worth re-checking, since a leftover proof file would itself be a new defect:

1. `git status` lists no such path — no `b4-tripwire-proof.ts`, and a name search across `src/` and
   `tests/` for `*tripwire*` / `*b4*` / `*proof*` returns nothing.
2. A repo-wide search for `coalition` — the stand-in's fourth variant — returns **nothing** under
   `src/` or `tests/`.
3. `WinnerSchema` (`src/core/Schemas.ts:485-492`) is back to exactly three tuples plus `.optional()`.

### The new comment does not overclaim — checked in the other direction, as asked

Each of its four claims holds:

| Claim | Verdict |
| ----- | ------- |
| The type check "actually fires" — a fourth tuple makes `COVERED` miss a key and `tsc --noEmit`, already a gate, fails | ✅ **Accurate.** Independently reproduced by this reviewer before the fix landed. |
| The array literal **cannot** do this — a new variant leaves it valid and every runtime assertion green | ✅ **Accurate**, and it is the honest statement of what B4 was. |
| "Demonstrated, not assumed" | ✅ **Accurate** — both the coder and this reviewer compiled it. |
| The runtime check covers "a boolean for each shape, won for exactly the player and own-team shapes" | ✅ **Accurate** — that is what the assertions do. |

The guarantee is correctly **scoped to a new tag**. One edge it does not claim and should not: adding a
variant that reuses an existing tag (say a longer `"player"` tuple) adds no key and so raises no `tsc`
error — but `humanWonPlacement` branches on the tag, so the answer stays right. The comment does not
assert otherwise. **No overclaim in either direction.**

Keeping **both** checks is correct: the type check catches a **new variant** at build time, the runtime
assertions catch a **wrong answer** for the variants that exist. Asserting `COVERED` at runtime rather
than leaving it unused is also right — `@typescript-eslint/no-unused-vars` is `error` here and its
`args: "none"` relaxation covers parameters, not variables, so an unused const would have failed the
lint gate.

### Gates and scope — re-verified independently, not taken on trust

`npx tsc --noEmit` exit 0 · `npm run lint` exit 0 · `npm test` **112 suites / 1182 tests, all passing,
first run**. Test count unchanged is expected and correct: B4 strengthened an existing test rather than
adding one. No `supertest` failure, so no flake triage and no re-run needed.

Part A byte-unchanged — `WinCheckExecution.ts` 154, `GameUpdates.ts` 41, its test 452, exactly the
closed-out sizes. Nothing added under `src/core/`. The reviewer's earlier off-domain note (a
winner-shape predicate living in `LeaderboardReporter`) was **not** acted on, correctly — it was marked
not worth another move.

`ai-agents/sprints/backlog.md`, `0210/`, `0211/`, `0212/` and `0062/` show as dirty from other agents
working concurrently. **None were read or written by this review.**

### Final verdict — Part B

**✅ Ready to merge (Part B).** Four findings across two adversarial rounds: three fixed and verified,
one owner-accepted as a residual. The one that mattered — **B1**, solo Team-mode wins recorded as
losses — was a real defect in a user-selectable slice of the ~58 % dominant mode, and it is fixed with a
predicate that now enumerates every shape `makeWinner()` emits, proved by test rather than asserted.

Part B is client-side analytics only: it touches no `src/core/`, cannot perturb the state hash, and
cannot change the simulation or who is declared the winner.

**Convergence:** 3 findings → 1 → 0, with zero re-litigation in any round.

### The pattern, recorded once so the fourth instance is prevented by design

Three instances of one defect class landed in a single day: Part A **R1** (a team-shaped *leader*
labelled `HumanTeam`), Part B **B1** (a team-shaped *winner* recorded as a loss), and the same
shape-blindness behind `Match:Loss:OpponentWon` being only a lower bound. The coder's conclusion is the
right one and sharper than this reviewer's: **`WinModal.isSoloOpponentWin()` had already enumerated all
four shapes correctly — read the existing derivation before writing a new one.** As of B4 that lesson is
enforced by `tsc`, not by memory.
