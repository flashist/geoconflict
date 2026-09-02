# Review — 0022

Task: `ai-agents/tasks/done/0022-win-check-multiplayer-regression-investigation/brief.md`
File(s) under review:
- `src/core/execution/WinCheckExecution.ts`
- `src/client/graphics/layers/WinModal.ts`
- `resources/lang/en.json` · `resources/lang/ru.json`
- `tests/core/executions/WinCheckExecution.test.ts`
- `tests/client/WinModal.test.ts`

Status: closed-out (2026-09-02, round 1 — all four findings dispositioned; two fixed and re-verified, two accepted as residuals)

---

## ⚠️ Coverage caveats — read before the findings

1. **Mutation testing was NOT re-executed.** The reviewer role forbids editing source code, and
   re-running M1–M5 requires mutating source. Per CLAUDE.md's rule-vs-spawn-instruction clause I took
   the rule's branch and escalate here. What I did instead: ran all 22 in-scope tests (green), and
   statically reconstructed each of the five mutation claims. All five are consistent with the code.
   The two that matter — **M2 and M5, the non-vacuity proofs** — are independently confirmed, because
   each control test is *the same fixture with one parameter flipped*
   (`mockTimerExpiredFfa(mg, null)` vs `mockTimerExpiredFfa(mg, "client1")`;
   `ffaWinUpdates(Public, false, true)` vs `(…, false)`; `["team","Bot"]` vs `["team","Red"]`) and each
   control **passes** while asserting the win path *did* fire. `beforeEach` rebuilds `mg` and
   `mg.setWinner = jest.fn()` per test, so no cross-test pollution masks the absence assertions.
   **Conclusion: `not.toHaveBeenCalled()` / `toHaveLength(0)` are genuinely non-vacuous.**
2. **Risk 1 has no live repro** (accepted residual, owner ruling R5). Unchanged by this review — see
   the sufficiency judgement below.

Both reviewers ran. **No partial-coverage flag.**

---

## Reviewer findings

| #  | Round | Sev  | file:line | Claim |
|----|-------|------|-----------|-------|
| R1 | 1 | medium | `src/core/execution/WinCheckExecution.ts:65-73` → `src/client/ClientGameRunner.ts:530-536` | The disclosed loss of `saveGame()` / `reportPlacements()` is **not tutorial-only** — it applies to every FFA clientless-leader case, i.e. exactly the multiplayer cases this fix targets. In a match no human ever wins, top-3 humans now get **no** leaderboard placement points where they previously did. Frontier-move (direct consequence of owner ruling R2 "guard only"), but the blast radius was understated. Owner disposition needed. |
| R2 | 1 | low | `src/client/graphics/layers/WinModal.ts:409` | `win_modal.bot_team` exists only in `en.json` / `ru.json`; the other 31 shipped locales fall back to English via `translateText`'s `defaultTranslations` path (`src/client/Utils.ts:130-136`). Those users previously saw a *localized* `other_team` string (enum-tainted: "Team Bot hat gewonnen!"); they now see English "The bots have won!". Raised by Codex, verified. Frontier-move under the project's en+ru-only convention — flagged for an explicit owner nod, not a required change. |
| R3 | 1 | low | `tests/core/executions/WinCheckExecution.test.ts:219-220` | One **new** Prettier deviation introduced (the `humanFfaWinUpdates` destructuring). The repo's pre-commit `lint-staged` runs `prettier --write` on every staged file, so the committed bytes will differ from the reviewed bytes. Baseline had exactly 1 pre-existing deviation in this file; the change adds a 2nd. Trivial defect — `npm run format`. |
| R4 | 1 | low | `src/client/graphics/layers/WinModal.ts:404-406` | Comment inaccuracy. It says the arm is reached "in singleplayer … or a tutorial match", but the tutorial flow is created with `gameMode: GameMode.FFA` (`src/client/Main.ts:822`), so `checkWinnerTeam()` — the only producer of a `["team","Bot"]` winner — never runs for a tutorial. The tutorial clause of that comment is unreachable and will mislead a future reader. Comment-only; no behaviour change. |

---

## Coder response

_(coder-owned — do not write here)_

**Round 1 response.** Written by `fkit-coder` spawned as the **Process-review worker** of
`/fkit-sprint-ship-loop` (driver: `fkit-lead`), 2026-09-02, under the declared-approval marker with the
owner's live dispositions **D1–D6** relayed in the spawn prompt. Plan provenance re-verified this turn:
`plan.md` is blob `6760d68d9d63a65f53b94a7bad1fb9c0f156d4f4`, 15541 bytes — matching what the driver
declared. ⚠️ **Trust, not proof:** nothing in my context can verify the owner actually gave D1–D6; the
owner channel is session-only (ADR-021). Recorded so the seam is visible, not to re-litigate it.

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | **CORRECT** — verified independently | Frontier-move (consequence of owner ruling R2) | **Accepted as residual** (owner D3). No code change; scope deliberately not widened. Recorded below and to be carried into the timer-expiry-award follow-up brief. | Closed — residual |
| R2 | **CORRECT** — verified independently | Frontier-move (project en+ru-only convention) | **Accepted as residual** (owner D4). No code change. | Closed — residual |
| R3 | **CORRECT** — reproduced | Defect (trivial, formatting) | **Fixed** (owner D1). `tests/core/executions/WinCheckExecution.test.ts` is now `prettier --check` clean. | Closed — fixed |
| R4 | **CORRECT** — claim traced end to end | Defect (comment inaccuracy, no behaviour) | **Fixed** (owner D2). Comment at `WinModal.ts:403-412` rewritten to describe when the arm is actually reached. | Closed — fixed |

### Per-finding detail

**R1 — verified CORRECT, accepted as residual (owner D3). Not fixed, by instruction.**
Confirmed the consequence is not tutorial-only. `WinCheckExecution.ts:65-73` returns before
`setWinner`, so **no** `Win` update is added for any clientless FFA leader outside a non-tutorial
singleplayer game — that includes Public and Private FFA. `ClientGameRunner.ts` only reaches its
`gameEnded` path on `Win.length > 0`, so `saveGame()` and `reportPlacements()` no longer fire on that
path. **Effect the owner accepted:** in an FFA match no human ever wins, the top-3 humans now get **no
leaderboard placement points where they previously did.** Scope deliberately **not** widened; recorded
as an accepted residual in `worklog.md` and to be **carried into the timer-expiry-award follow-up
brief — filed as `0206`** (*FFA: award the win to the top player with a `clientID`…*), which a producer
created while this round was running.

⚠️ **The other half of R1 is a fix, not a regression — captured per owner instruction.** The reviewer
established that *before* this change, a bot winning a **tutorial** ran `reportPlacements()`, which
ranks only `PlayerType.Human` players; a tutorial has exactly one, so `myIndex === 0` and the player
was awarded **first-place leaderboard points for losing a tutorial to a bot**. `reportPlacement` has
**no game-type guard** and writes to the real platform leaderboard
(`src/client/leaderboard/LeaderboardReporter.ts:44-60`). Removing that is an improvement.

**R2 — verified CORRECT, accepted as residual (owner D4). Not fixed, by instruction.**
`win_modal.bot_team` exists in `en.json` and `ru.json` only; the other 31 shipped locales fall back to
English via `translateText`'s `defaultTranslations` path. Those users previously saw a localized but
enum-tainted string ("Team Bot hat gewonnen!") and now see English "The bots have won!". This matches
the project convention (CLAUDE.md: other language files need no manual update). Recorded, not fixed.

**R3 — verified CORRECT, fixed (owner D1).**
Reproduced against the baseline: `git show HEAD:` of the file has **exactly 1** Prettier deviation
(the `clientlessFfaWinUpdates` signature); the working tree had **2**. The 2nd is the
`humanFfaWinUpdates` destructuring the reviewer named. The consequence the owner flagged is real —
pre-commit `lint-staged` runs `prettier --write` on staged files, so committed bytes would have
differed from reviewed bytes.

Fixed **both** deviations, because the owner asked the file be Prettier-clean and **both sit on lines
this change already rewrote** — `clientlessFfaWinUpdates` was refactored by this diff from a full body
into a thin wrapper over `ffaWinUpdates`, carrying its old multi-line signature over verbatim. Purely
mechanical; no assertion, fixture or test name changed. `npx prettier --check` on the file: **clean**.

**R4 — verified CORRECT, fixed (owner D2). Comment only; no behaviour change.**
I traced the claim myself before rewriting, as instructed. Evidence chain:

1. A `["team", …]` winner is produced only by `GameImpl.makeWinner()`'s string branch
   (`GameImpl.ts:667-675`), reached only from `setWinner(Team)`. There are exactly **two** `setWinner`
   call sites in the whole repo, both in `WinCheckExecution` (`:74` passes a `Player`; `:115` passes a
   `Team`). So `checkWinnerTeam()` is the **only** producer of a team winner.
2. `WinCheckExecution.tick()` (`:33-37`) calls `checkWinnerTeam()` only when
   `gameMode !== GameMode.FFA`.
3. The tutorial is created with `gameMode: GameMode.FFA` (`src/client/Main.ts:822`, alongside
   `gameType: Singleplayer`, `isTutorial: true`). **Therefore `checkWinnerTeam()` never runs in a
   tutorial and the arm is unreachable there.** The reviewer's claim holds.
4. `winner[1] === ColoredTeams.Bot` additionally requires `checkWinnerTeam`'s own guard
   (`:109-114`) to pass, which permits a Bot-team win **only** when `gameType === Singleplayer`.
5. Reaching the arm at all requires `isSoloOpponentWin()` to return false, which for a non-tutorial
   singleplayer team win against another team happens only via
   `myPlayer === null || hasShownDeathModal || !myPlayer.isAlive()` (`WinModal.ts:516`).

Corrected comment now states: reached only in a **non-tutorial singleplayer Team-mode match**, only
when the solo-loss screen was skipped because the player is already dead or there is no local player,
and that a tutorial cannot reach it at all because the tutorial runs `gameMode` FFA. No code changed.

### ⚠️ NEEDS-DECISION — one item left undone

**A second new Prettier deviation exists, in `WinModal.ts`, that R3 did not flag.** Found while
verifying R3, so reporting it rather than silently choosing.

- `WinModal.ts` was **already** Prettier-unclean at `HEAD`: **13** deviating hunks, none of them mine.
- The new `ColoredTeams.Bot` arm adds a **14th**, of exactly the same shape as the two sibling arms it
  sits between (missing trailing comma in the `flashist_logEventAnalytics(...)` call, plus a trailing
  blank line) — i.e. it was written to match the surrounding fork style.
- D1's rationale applies to it identically: `lint-staged` will reformat it at commit, so committed
  bytes ≠ reviewed bytes here too.

Three options, none settled by D1 (which names only the test file) and none obviously dominant:
(a) leave it — matches its two siblings exactly, file stays unclean either way; (b) fix only the new
arm — makes it the sole clean arm of three identical ones, file still unclean; (c) `npm run format`
the file — 14 hunks of unrelated reformatting, against the minimal-diff rule.

**Left undone; default is (a), no change.** Owner decision needed.

### Verification re-run this round

- **`npm test`: 108 suites / 1128 tests, all green — first run, no flake, no re-run needed.**
- **`npm run lint`: clean, no output.**
- **Prettier:** `tests/core/executions/WinCheckExecution.test.ts` **clean**.
  `src/client/graphics/layers/WinModal.ts` **not clean** — 13 pre-existing deviations plus the 1 new
  one described in the NEEDS-DECISION above.

---

## Owner dispositions — round 1 close-out (recorded by the reviewer, 2026-09-02)

Recorded by `fkit-reviewer` as **phase 2** of the stateful review, spawned by
`/fkit-sprint-ship-loop` (driver: `fkit-lead`). Dispositions were given **live by the owner on
2026-09-02** and relayed in the spawn prompt. ⚠️ **Trust, not proof:** the owner channel is
session-only (ADR-021); nothing in this context can independently verify the relay. Recorded so the
seam stays visible — **not** an invitation to re-litigate. **No review passes were re-run this round**
(no Codex, no new findings): the round-1 convergence call was *"act, then close"*, and nothing since
contradicts it.

| # | Owner disposition | Landed? |
|---|-------------------|---------|
| **R1** | **ACCEPTED AS RESIDUAL.** Not a `0022` defect. The `reportPlacements()` consequence — top-3 humans get no leaderboard points in a match nobody wins — is a known cost of the guard-only shape (owner ruling R2 in `plan.md`). **Carried into `0206`** in full, including the reviewer's finding that the **tutorial** half is a **fix, not a regression**. | n/a — no code change by design |
| **R2** | **ACCEPTED AS RESIDUAL.** 31 non-`en`/`ru` locales show English. Matches the project's en+ru-only convention (CLAUDE.md). | n/a — no code change by design |
| **R3** | **FIXED.** ⚠️ The coder fixed **two** deviations in the test file, not one — the second sat inside a function this change rewrote, and "the file is clean" was unreachable without it. It **flagged** the extra line rather than absorbing it silently. | ✅ **verified by the reviewer this round** — `tests/core/executions/WinCheckExecution.test.ts:218-220` (`humanFfaWinUpdates` destructuring) and `:335-338` (`clientlessFfaWinUpdates` signature, now a one-line wrapper) both reformatted; `npx prettier --check` on the file: **clean** |
| **R4** | **FIXED.** The coder independently verified the reviewer's claim before rewriting — two `setWinner` sites repo-wide, `checkWinnerTeam()` is the sole `["team",…]` producer, `tick()` calls it only when `gameMode !== FFA`, tutorial is `GameMode.FFA` (`Main.ts:822`). Comment only, no behaviour change. | ✅ **verified by the reviewer this round** — `src/client/graphics/layers/WinModal.ts:403-412` now states the arm is reached only in a non-tutorial singleplayer Team-mode match, and that a tutorial cannot reach it at all |
| **R5 residual** | **NARROWED**, as the reviewer recommended, to **(a) real-game reachability** and **(b) post-guard match behaviour**. Old wording kept inline below as superseded. | ✅ recorded — see the residual list |
| **Copy** | **STANDS.** "The bots have won!" / «Боты победили!» accepted as written. | n/a |
| **`WinModal.ts` Prettier** | **LEAVE AS IS.** Settles the coder's `NEEDS-DECISION` in favour of option **(a)**. That file was already unclean at `HEAD` (13 hunks, none from this task); the new arm adds a 14th, formatted **identically to the two sibling arms it sits between**. Running `npm run format` would drag in 13 unrelated hunks, against minimal-diff. | ✅ recorded — the file is deliberately **not** `prettier --check` clean |

### Verification state at close-out

- **`npm test`: green on the FIRST run — 108 suites / 1128 tests. No flake, no re-run needed.** (Round 1
  needed a 2nd run; that was the known supertest flake, already traced in the table above.)
- **`npm run lint`: clean.**
- **Prettier:** the test file is clean; `WinModal.ts` is **not**, deliberately, per the ruling above.
- The reviewer re-read both fix sites this round. **Both landed as described.** Nothing reopens.

### Context only — a new owner ruling that lives elsewhere

The fallback-award follow-up will apply to **both** the timer branch **and** the territory-threshold
branch, because public lobbies ship `maxTimerValue: undefined` (`MapPlaylist.ts:162`) — a timer-only
award would close **nothing** in public FFA. **That ruling belongs to `0206`/`0205`, not to `0022`.**
Recorded here solely as evidence that R1's residual has a real destination.

---

## Accepted residuals (shared, do-not-re-litigate)

- **PR #77 premise refuted** — What: the `winner: undefined` path is original to the fork (`feea527`), not a PR #77 regression · Why (structural): verified commit-by-commit in `plan.md` §1; the "before" state existed only between two commits inside the same PR · Re-raise only if: new git evidence contradicts the four-commit table.
- **Guard-only fix shape (owner ruling R2)** — What: a match whose only qualifying leader is clientless simply does not end; no timer-expiry award · Why (structural): the timer-expiry award (option (b)) is a behaviour change the owner declined for now, recorded as a candidate follow-up · Re-raise only if: it causes a crash, leak, or desync. **Verified this round: none of those occur.**
- **No live repro for risk 1 (owner ruling R5) — NARROWED 2026-09-02 by owner disposition.** Now scoped
  to exactly two things synthetic tests cannot show: **(a) real-game reachability** — that a real public
  FFA actually *reaches* a clientless leader at the 80 % threshold (a reachability question, not a
  correctness one); and **(b) post-guard match behaviour** — how the rest of the match behaves once no
  `Win` update ever arrives. · Why (structural): the honest repro needs a private lobby whose second
  `npm run dev` collides on port 3001 with the owner's dev server; the owner declined the interruption.
  (b) is itself the owner-accepted frontier-move of ruling R2, **and it is not new — the match already
  never ended before this change**; only the silent `saveGame`/`reportPlacements` differed. · Destination:
  **carried on `0022` itself** — no follow-up task. · Re-raise only if: (a) or (b) is observed to differ
  from this description in a real game.
  > **Superseded wording, kept for the record:** *"synthetic jest coverage only … re-raise only if the
  > synthetic fixture is shown to be actively misleading about this change."* Judged in round 1: it is
  > **not** misleading — this change has no spatial component, and the two heavyweight tests run a real
  > `GameImpl` through `setup("big_plains", …)`. See "Rulings on the three self-disclosed items" §3.
- **R1 — lost `reportPlacements()` for clientless-leader FFA (accepted 2026-09-02).** What: with the
  guard in place, an FFA match whose only qualifying leader is clientless produces no `Win` update, so
  `ClientGameRunner`'s `gameEnded` path never runs — the top-3 humans get **no leaderboard placement
  points where they previously did**. This is **not tutorial-only**; it covers Public and Private FFA. ·
  Why (structural): a direct, understood consequence of the guard-only fix shape (owner ruling R2); not a
  `0022` defect and **not** to be fixed by widening `0022`'s scope. · ⚠️ **The tutorial half of R1 is a
  fix, not a regression** — before this change a bot winning a tutorial awarded the single human
  **first-place** leaderboard points for *losing*, via an unguarded `reportPlacement`. · Destination:
  **`0206`** (`0206-ffa-timer-expiry-award-to-top-client-player`, on `backlog.md`), carried in full
  including the tutorial finding. · Re-raise only if: the consequence is found to extend beyond the FFA
  clientless-leader case described here.
- **R2 — `win_modal.bot_team` is `en`/`ru` only (accepted 2026-09-02).** What: the other 31 shipped
  locales fall back to English via `translateText`'s `defaultTranslations` path, so they now show "The
  bots have won!" where they previously showed a localized but enum-tainted string ("Team Bot hat
  gewonnen!"). · Why (structural): this **is** the project's en+ru-only localization convention
  (CLAUDE.md — other language files need no manual update). · Destination: **the convention itself** — no
  task, nothing to schedule. · Re-raise only if: the project adopts a locale policy beyond en+ru.
- **`:91` revert forbidden (owner ruling R3)** — What: the `gameType !== GameType.Singleplayer` clause in `checkWinnerTeam` stays · Why (structural): reverting reintroduces the Singleplayer Team stall PR #77 fixed · Re-raise only if: the Singleplayer stall is independently shown not to exist.
- **Risk 2 out of scope (owner ruling R4)** — What: the Teams bot-team stall is split to **`0205`**
  pending the owner's `:88` policy decision · ⚠️ **Renumbered 2026-09-02: the Teams task moved `0204` →
  `0205`.** Earlier `0204` mentions in `worklog.md` are deliberate historical records — leave them. ·
  Re-raise only if: risk 2 code appears in this diff. **Verified round 1: it does not.**

---

## Scope and constraint verification (all confirmed this round)

| Check | Result |
|---|---|
| `src/core/game/GameImpl.ts` untouched | ✅ `git diff --stat` empty for that path |
| Brief's `:91` revert NOT applied | ✅ `WinCheckExecution.ts:109-114` still carries `gameType !== GameType.Singleplayer` |
| Risk 2 absent from the diff | ✅ `checkWinnerTeam()` byte-identical to HEAD |
| Guard placed **before** `this.active = false` | ✅ `WinCheckExecution.ts:65-73` returns; `setWinner`/`active = false` at `:74-76` |
| Human leader still wins (territory + timer) | ✅ two control tests, both green; `clientID() !== null` skips the guard entirely |
| Predicate is `clientID() === null`, not `PlayerType.Bot` | ✅ Nations (`FakeHuman`, `GameRunner.ts:89-95`, clientID `null`) covered; `AiPlayer` keeps its clientID and is unaffected — which matches `makeWinner` exactly |
| Guard ≡ `makeWinner`'s condition | ✅ `GameImpl.ts:677-687` rejects `clientID === null` unless `Singleplayer && !isTutorial`; guard returns on `clientID === null && (gameType !== Singleplayer \|\| isTutorial === true)` — De Morgan-identical. `isTutorial` is `z.boolean().optional()` (`Schemas.ts:194`), so `=== true` ≡ truthy |
| No human team can be named "Bot" | ✅ `playerTeams` is built from Red/Blue/…/`Team N` or `Humans`/`Nations` (`GameImpl.ts:109-147`); only `PlayerType.Bot` routes to `botTeam` (`:463-472`) |
| Locale key in **both** files, all text via `translateText` | ✅ `en.win_modal` and `ru.win_modal` both 14 keys, zero asymmetry; no hardcoded user-visible string added |
| `npm test` green only on the 2nd run — flake or real? | ✅ **Known flake.** `tests/profile-server/NameChangeRoutes.test.ts` is one of the four named supertest suites in CLAUDE.md; both reported shapes ("Exceeded timeout of 5000 ms", worker-failed-to-exit) match the confirmed mechanism. `0197`'s SIGSEGV **independently ruled out by me**: newest `~/Library/Logs/DiagnosticReports/node-*.ips` is dated 2026-09-01 12:56, none from 2026-09-02. |
| In-scope suites re-run by the reviewer | ✅ 22/22 pass (`WinCheckExecution.test.ts` 15, `WinModal.test.ts` 7) |
| Out-of-scope files untouched by this diff | ✅ `scripts/check-config-parity.mjs`, `deploy.sh`, `build-deploy-profile.sh` absent from `git diff` (R6 honoured) |

---

## Rulings on the three self-disclosed items

**1. The tutorial behaviour change — RULED SAFE, and slightly better than before.** The coder declined
to call it safe; I traced it and it is. The tutorial is created with `gameType: Singleplayer`,
`gameMode: FFA`, `isTutorial: true`, and **no `maxTimerValue`** (`src/client/Main.ts:818-835`), so the
only way the guard can fire in a tutorial is a bot/nation crossing 80 % of non-fallout land. When that
happened *before* this change, `ClientGameRunner.ts:530-536` ran `reportPlacements()`, which ranks
**only `PlayerType.Human` players** (`:409-419`) — a tutorial has exactly one, so `myIndex === 0` and
the human was awarded **first-place** leaderboard points for *losing a tutorial to a bot*.
`reportPlacement` has **no game-type guard** and writes to the real platform leaderboard
(`src/client/leaderboard/LeaderboardReporter.ts:44-60`). Removing that is a **fix, not a regression**.
The `saveGame()` loss is a `localStorage`-only record (`LocalPersistantStats.ts:46`) — cosmetic. No
crash, leak, or stuck state; Codex independently found no alternate path to either function. **The
real issue is that this consequence generalises to multiplayer — recorded as R1.**

**2. The forced death in the live check — NOT a material weakness.** `isSoloOpponentWin` bails on
`myPlayer === null || this.hasShownDeathModal || !myPlayer.isAlive()` (`WinModal.ts:516`) — three
**independent** disjuncts. A naturally-dying player satisfies `!isAlive()` *and* (via the death-modal
block at `:360-372`) `hasShownDeathModal`, so it reaches the same team branch **a fortiori**. The coder
exercised only the `hasShownDeathModal` disjunct live — but the new unit test drives the *other*
disjunct (`createGame({ isAlive: false })`, `tests/client/WinModal.test.ts:216-222`) and passes. The
two together cover both routes into the branch. Path-B evidence stands.

**3. Synthetic-only coverage for risk 1 — SUFFICIENT for this change; the residual should be
narrowed.** Said plainly, either way: the `feedback_spatial_gameplay_live_test` lesson is about
**spatial targeting** where a synthetic map lacks real map data. This change has **no spatial
component** — the guard is a pure predicate over `clientID()` and `gameConfig`, and the two heavyweight
tests run a **real `GameImpl`** through `setup("big_plains", …)` with the real `makeWinner` and the real
update pipeline; only the two timer cases use a hand-mocked `mg`, and those exercise a branch condition
with no map dependency at all. What synthetic tests genuinely cannot show is (a) that a real public FFA
*reaches* a clientless leader at 80 % — a reachability question, not a correctness one — and (b) how the
rest of the match behaves once no Win update ever arrives. **(b) is the owner-accepted frontier-move
(R2), and it is not new: the match already never ended before this change** — only the silent
`saveGame`/`reportPlacements` differed. Recommend the residual be **kept but re-scoped** to (a)+(b)
rather than "risk 1 is unverified".

---

## Convergence call

**Act, then close — this is round 1 and nothing re-litigates a settled decision.** Codex was primed
with all five residuals and raised none of them; my own pass raised none either. Of four findings, two
(R3, R4) are trivial one-line cleanups and two (R1, R2) are frontier-move disclosures needing an owner
disposition, not code. There is no confirmed defect in the guard, the label fix, or the tests. Expect
this to close in one more round.

**Round 2 (2026-09-02) — CLOSED OUT, as predicted.** No review passes re-run, by instruction and
consistent with the call above. Both fixes re-read at their cited lines and confirmed landed; all four
findings carry an owner disposition; the two residuals plus the narrowed R5 each have a named
destination (`0206`, the en+ru convention, and `0022` itself). `npm test` green on the first run,
`npm run lint` clean. **Nothing outstanding on this ledger.** The one deliberately-unclean file
(`WinModal.ts`, Prettier) is an owner ruling, not a defect — do not "fix" it.
