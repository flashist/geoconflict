# FFA Clientless-Leader Fallback Award (task 0206) — 🔴 REVERTED, NEVER DEPLOYED

**Source**: `ai-agents/tasks/done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md`
**Status**: done — 🔴 **but REVERTED 2026-09-04; the behaviour is NOT in the game and was NEVER DEPLOYED. `done` describes the WORK, not a live effect. Read the box below before using this page.**
**Sprint/Tag**: Sprint 4 — promoted, planned, built, reviewed and closed all on 2026-09-03 (agent-closed — not owner-verified); **code reverted 2026-09-04 on an owner ruling**

> # 🔴 STOP — THIS TASK'S BEHAVIOUR IS NOT IN THE GAME
>
> **Reverted 2026-09-04 on an owner ruling given live in session. It was built, reviewed, closed and
> gate-passed — and then reverted before it ever reached a player. It was NEVER DEPLOYED.**
>
> ⚠️ **`Status: done` above is CORRECT and DELIBERATE — do not "fix" it.** The **work** was done; the
> **effect** was reverted. Those are two different facts and only the first one is a status.
> 🔴 **A reader who sees `done` and concludes the behaviour is live is making exactly the mistake this
> box exists to prevent.** The task stays closed and stays in `ai-agents/tasks/done/`.
>
> ## Why — three claims, and only the first is true
>
> | Claim | |
> |---|---|
> | `0206` did what its approved plan specified, and **the plan's PREMISE was wrong** | ✅ **TRUE** |
> | "`0206` was buggy" | ⛔ **NOT TRUE** — correctly built against its plan; Codex adversarial pass returned *"No findings."*; play-test gate **passed** |
> | "`0206` caused the stall" | ⛔ **NOT TRUE** — the stall **predates** it (`0022`) and **survives the revert unchanged** |
>
> ## Two findings, both from LIVE MEASUREMENT on 2026-09-04 — observed, not reasoned
>
> 1. 🔴 **`0206` was a NO-OP in the case that actually loses the XP.** With every human eliminated, a
>    **Nation reached 100.0 % of the map and the match still did not end.** `GameImpl.players()`
>    filters to `isAlive()` (`src/core/game/GameImpl.ts:421-423`), so dead players are absent from
>    `sorted`, `sorted.find((p) => p.clientID() !== null)` returns `undefined`, and the code took
>    **the same early `return` as before `0206`.** The task's own comment said so verbatim.
> 2. **Its only live effect was the behaviour the owner REJECTED** — crowning a survivor holding
>    ~**0.5 %** while a bot held **80.2 %**. **The owner reproduced it on their own build** and ruled
>    it wrong: *"if a bot has 80 % and a player has 20 %, it's the problem of the player."*
>
> ⚠️ **Scope finding 1 precisely — it was observed in a PRIVATE instrumented FFA.** 🔴 **The NATION
> case has been assumed twice and OBSERVED ZERO TIMES in a PUBLIC lobby.** Only a **Bot** was ever
> seen crossing the threshold, and public FFA runs with Nations **enabled** while the play-test ran
> with them **off** — so **the untested case is the one production has.** ⇒ **Hypothesis for public
> FFA, never established.** See [[decisions/clientless-leader-win-policy]].
>
> ## 🔴 The defect this task was scheduled to close is STILL OPEN AND STILL LIVE
>
> **Measured at match end 2026-09-04:** `private game complete` → `ending game with 11203 turns` →
> `archiving game`. **No `handleWinner`, no winner vote, no `creditMatchXp`, no `winner` attribute and
> no player stats on the archive.** ⇒ **Participation XP is genuinely LOST, not delayed** —
> `creditMatchXp`'s only call site is inside `handleWinner` (`src/server/GameServer.ts:1199`).
>
> **Replacement: [[tasks/credit-participation-xp-elimination-or-match-end]] (`0211`), SCHEDULED INTO
> SPRINT 4** — ⚠️ **not** a revival of this award. It credits participation independently of any
> winner; it does not crown anyone.
>
> ## ✅ The revert itself was VERIFIED LIVE before it was committed
>
> - **Threshold branch:** bot at **80.4 %**, humans alive at **0.53 % / 0.52 %** — **no winner, no
>   modal**, and **288 further win-checks silent.**
> - **Timer branch:** **274 win-checks silent.**
> - **Ordinary human wins still work** — the full chain runs through to `archiving game`.
>
> ## ⚠️ `WinCheckExecution.ts` is deliberately NOT byte-identical to its pre-`0206` state
>
> The revert **intentionally kept one comment** citing **ADR-110**: that the guard is about being
> **clientless**, not about being **AI** — a `PlayerType.AiPlayer` carries a real `clientID` and never
> enters that branch. ✅ **Verified this sync and re-verified at the 2026-09-04 lint:** the only residual
> diff between `82365bc` and `HEAD` in that file is those four comment lines (one blank + three comment
> lines, `+4`). **This is the ONLY in-code trace of ADR-110 anywhere in the repository.**
> ⚠️ **Repo-wide, that file is not the only survivor** — `tests/server/GameServerWinner.test.ts`
> survives too. See the banner over *Key Changes*. ⛔ **Anyone "restoring" the file to its pre-`0206` state would silently delete it.**
> ⚠️ Note the revert also removed the `smallID` tie-break that `0206` had added, returning the sort to
> plain `numTilesOwned()` descending.

## Goal

Close the residual that task `0022` left behind by design. `0022` shipped a **guard**: a clientless
leader (a Bot or a Nation) is never declared the winner, and the guard returns **above**
`this.active = false` so the match no longer wedges and a human can still win later. But it awards
nothing — so no `Win` update is emitted, no `winner` message reaches the server, `handleWinner` never
runs, and **`creditMatchXp` never runs**. The whole match's match-end XP is silently lost for every
player.

`0206` **was intended as** the award that closes that loss in **FFA**: instead of stalling, declare the
win to the **top-ranked player that has a `clientID`**. The Team-mode half is
[[tasks/teams-bot-team-win-stall]] (`0205`) and is untouched here.

> 🔴 **THE GOAL WAS NOT MET, and the reason is the premise, not the code.** Measurement on 2026-09-04
> showed the award **cannot fire in the case that loses the XP**, because `players()` filters to
> `isAlive()` and every clientful player in that case is dead. **The whole "closes that loss" framing
> above is the disproved premise** — kept because it is what the task was scheduled on.
> 🔴 **Added 2026-09-04, and nobody had connected it across `0022`, `0206` or `0205`:**
> **`checkWinnerTeam()` carries the SAME guard shape**, so a bot-team-led Team match stalls and loses
> its XP identically. Found by the coder performing the revert. ⚠️ **Reported, not re-verified by
> symbol here** — confirm at plan time.

**Both branches were in scope** — timer expiry **and** the 80 % territory threshold — on the owner's
2026-09-02 ruling made once for `0205` and `0206` together, so the two win-check functions stay on one
policy. That widening matters: public lobbies ship `maxTimerValue: undefined`
(`src/server/MapPlaylist.ts`), so **the timer branch cannot fire in a public lobby at all** and a
timer-only award would have left the entire public-FFA XP loss exactly where it was.

## Key Changes

> ⚠️ **EVERY CHANGE IN THIS SECTION WAS REVERTED ON 2026-09-04 AND IS NOT IN THE GAME.** It is kept
> as the record of what was built. **Read it in the past tense throughout** — the present-tense
> wording below is the original page text and describes code that no longer exists.
> ✅ **TWO things in this list SURVIVE the revert — corrected at the 2026-09-04 lint, which found the
> second one.** Everything else is gone.
>
> 1. **The corrected guard comment** (the ADR-110 bullet below) — deliberately kept.
> 2. 🆕 **`tests/server/GameServerWinner.test.ts` — the whole 135-line file is still in the tree.**
>    ⚠️ **A previous version of this page said the comment was "the ONE exception"; that was wrong.**
>    ✅ **Verified at this lint:** `git diff 82365bc HEAD -- src/ tests/` is **exactly two files** —
>    `WinCheckExecution.ts` (+4) and `GameServerWinner.test.ts` (+135). **Nothing else survives.**
>    ✅ **It still passes** (`npx jest tests/server/GameServerWinner.test.ts` → 1 suite, 1 test, green
>    at this lint) — because it never tested the fallback award. It tests the **ordinary**
>    `handleWinner` → `creditMatchXp` + `archiveGame` path, which the revert did not touch.
>    ⚠️ **So it is a genuine surviving asset of `0206`, not debris to clean up.** 🔴 **Note what it
>    does NOT cover:** it proves the crediting call fires *given a winner message*, which is precisely
>    the half that works. It says nothing about the stall, where no winner message is ever sent.
>    ⛔ **Do not cite it as evidence the XP loss is covered.**
>    ⚠️ **The four tests added to `tests/core/executions/WinCheckExecution.test.ts` (15 → 19) were
>    reverted with the code** — that file is byte-identical to `82365bc`.

**`src/core/execution/WinCheckExecution.ts` — `checkWinnerFFA()` only, 3 hunks, +41.**
**`checkWinnerTeam()` is byte-identical**; Team mode is untouched.
⚠️ **"Byte-identical" was TRUE and was the right call for this task's scope — but it was read as
"not affected", which is how the shared Team-mode defect stayed unnoticed.** See the Goal box.

- **The award.** Inside the existing clientless-leader guard, the code now selects
  `sorted.find((p) => p.clientID() !== null)` — the top-ranked player with a client, on the same
  tile-count ranking that picked the leader — calls `setWinner(fallback, …)`, and sets
  `this.active = false`.
- **The match now ENDS on the award path.** 🚩 The *"a human could still win later"* property that
  `0022`'s guard was placed to preserve is **gone there, deliberately**. It survives only where **no**
  clientful player is alive, which returns early and stays active.
- **Ranking and tie-break, both previously open design questions.** Ranking is `numTilesOwned()`
  descending; ties break on **ascending `smallID`** so every client picks the same winner. The comment
  records that this **writes down existing behaviour** rather than changing it — `players()` already
  preserves ascending-`smallID` insertion order and `Array.prototype.sort` is stable.
  ⚠️ Cross-client determinism was verified by **reading the construction path, not by two live
  clients**.
- **The multiplayer-only carve-out — this is the tutorial re-check, discharged.** The award returns
  early on `gameConfig.gameType === GameType.Singleplayer`, so **no tutorial can ever reach it**. The
  comment states why: awarding a tutorial's single Human the win for *losing* to a bot would hand them
  first-place platform-leaderboard points through `ClientGameRunner.reportPlacements()` — the exact bug
  `0022` fixed. See [[features/tutorial]].
- **The ADR-110 predicate, unchanged.** The predicate is `clientID() !== null` with **no
  `PlayerType.AiPlayer` exclusion anywhere in the file**. An AI player carries a real `clientID` and may
  legitimately be named winner; Bots and Nations stay excluded. See
  [[decisions/adr-110-ai-winner-allowed]] — **and read its known expiry before citing it.**
- ✅ **The guard comment was corrected** to say the policy is about being *clientless*, not about being
  AI. ⚠️ **Only that comment** — the separate misleading `WinModal` comment is still wrong and is still
  task `0207` ([[tasks/winmodal-participation-comment-correction]]).
  🔴 **THIS IS THE ONE CHANGE THE REVERT DELIBERATELY KEPT**, and it is the **only in-code trace of
  ADR-110 in the repository.** ⛔ Do not delete it while "restoring" the file.
- **Tests:** `tests/core/executions/WinCheckExecution.test.ts` 15 → 19 tests (+226/−32) — 🔴 **the four
  added tests were REVERTED; that file is byte-identical to `82365bc` again.** New
  `tests/server/GameServerWinner.test.ts` — ✅ **this one SURVIVED the revert in full and still
  passes**; see the banner at the top of this section.

⚠️ **Locate every symbol by name, not by line — `WinCheckExecution.ts` moved twice in two days.**

## Outcome

> 🔴 **THE OUTCOME IS: BUILT, PASSED, THEN REVERTED AND NEVER DEPLOYED.** The review result and the
> play-test PASS below **both still stand and are NOT retracted** — see the gate note at the end of
> this section for what they did and did not establish.

**Plan owner-approved via `AskUserQuestion` before any code was written**, per the owner's own
scheduling ruling that planning come first.

**Review — `/fkit-stateful-review`, round 1, both reviewers run, coverage not partial:**

- **Codex adversarial pass: "No findings."**
- **Claude pass: three findings, all `low`, none blocking.** All three verified `CORRECT` by the coder;
  **none disputed.** R1 and R3 were fixed (**documentation wording only** — no source or test assertion
  altered). **R2 was accepted by owner ruling with no code changed**, and its follow-up filed as `0209`.
- Ledger `Status: closed-out`; **final round-1 disposition ✅ Ready to merge.**

🔧 **One reviewer finding was WRONG and was amended — record this, it is the day's most-repeated
error.** R2 originally claimed `0206` increases how often a wrong `placement` value is *"sent to the
real Yandex leaderboard"*. **It is not sent at all.** The amendment was reached **independently in both
halves of the ledger**, by the reviewer and by the coder, converging on the same conclusion. What
survives: the **frequency change is real**, the finding was legitimate, and `0209` is the right
outcome — only the described impact was too strong. Severity stayed `low`.

> 🚩 **The distinction the whole day kept collapsing:** `placement` **never leaves the browser**;
> `points` **do reach the Yandex platform**. The canonical keep-them-apart table lives on
> [[decisions/clientless-leader-win-policy]].

**Test evidence:** `npm test` → **109 suites, 1133 tests, all passed, exit 0** — green on its **first**
run in every round. No `supertest` flake, no `0197` `SIGSEGV`, nothing re-run to get green.
`npm run lint` and prettier clean.

### ⏳→✅ The play-test gate: PASS, recorded 2026-09-03 — and it STANDS

**The gate asked two things and both were genuinely met: the award FIRES, and the owner accepted the
end screen.** ✅ **Nothing about that result is withdrawn, downgraded, or re-run.** *(This resolves the
"in flight, result not in" note this page carried on 2026-09-03.)*

⚠️ **What changed is not the result — it is the VALUE of what was tested.** The gate asked whether the
code did what the plan said. It did. It **never asked** whether the award was the right behaviour, nor
whether it fires in the case that **actually** loses the XP. Measurement on 2026-09-04 answered both:
**no** and **no**. *(The gate run itself recorded a winner holding **0.516 %** — it saw this behaviour
and accepted it on the reasoning that a visibly odd winner beats a silent XP loss. **That reasoning
was later overtaken: the silent XP loss is not actually prevented.**)*

⇒ **Read this PASS as "the code did what the plan said." It is NOT evidence the behaviour was correct,
and must not be cited as such.**

### The nine residuals, in full

> 🔴 **RESIDUAL 4 WAS PROMOTED 2026-09-04 — IT WAS NOT A CORNER CASE, IT IS *THE* CASE.** Its text was
> accurate; what changed is its **weight**. It was written as a gap remaining beside a fix that closed
> the main path — measurement showed **this gap IS the main path**, and that `0206` closes nothing in
> it. ⚠️ **Residuals 1–3 and 5–9 are NOT re-weighted by this** — only 4 moved.

1. ⛔ **Verification step 2 is partial by construction.** The core end and the server end are tested;
   the middle leg (`Win` update → `WinModal` → `SendWinnerEvent` → `Transport` → server) has **no test
   harness in this repo**, is **unchanged by this task**, and runs on every ordinary human win today.
   Recorded as **"unchanged and already live" — never as "verified."** That exact wording is a plan
   requirement.
2. **Verification step 3 is a code trace, not a test** — `ClientGameRunner` has no harness here.
3. 🔴 **Nothing was ever run in production.** ✅ **The headless browser play-test COMPLETED and
   PASSED** (see the gate note above), and the owner later reproduced the award on their own build.
   🔴 **But there was no deploy and no production observation — and there never will be, because the
   code was reverted.**
4. 🔴 **PROMOTED — THIS IS THE DECISIVE RESIDUAL.** **The XP loss is still not closed** — every
   clientful player eliminated before the threshold ⇒ no award, XP still lost. Knowingly, per approved
   plan §7. **Measuring exactly this is what disproved the task's premise:** a Nation reached
   **100.0 %** of the map with every human eliminated and **the match still did not end**. Closing it
   is [[tasks/credit-participation-xp-elimination-or-match-end]] (`0211`)'s whole job.
5. **The `console.log` on the fallback award reaches no dashboard** — it runs in the client's Web
   Worker. It discharges the owner's Q3 ruling exactly as planned and no more;
   [[tasks/measure-clientless-leader-and-solo-awards]] (`0208`) is the real measurement.
6. **The `smallID` tie-break's cross-client determinism is not test-coverable here.**
7. ~~**Player-visible behaviour change — accepted, not silent.** Public FFA now ends at 80 %.~~
   🔴 **STRUCK — this never reached a player.** The change was real in the repo and was accepted at
   the time; **the revert removed it**, so public FFA does **not** end at 80 %.
8. **ADR-110's known expiry stands.** 🔴 **And ADR-110 now rules on a predicate that exists in NO
   shipped code** — `0206` reverted, `0205` unbuilt.
9. **Phase-1 frequency remains UNMEASURED.** ✅ **The "pre-fix baseline is permanently unmeasurable"
   claim is REVERSED by the revert** — because `0206` never deployed, `0208`'s Part A decay clock
   **stopped**. The baseline is measurable again. 🔴 **It is `0211` shipping that would restart the
   clock and destroy it — which is why `0208` is ordered before `0211`'s ship.**

### Four follow-up briefs it spawned — 🔄 two have since moved boards

| Task | What it covers | Board (as of 2026-09-04) |
|---|---|---|
| `0207` — [[tasks/winmodal-participation-comment-correction]] | `WinModal` doc comment: says AI players are skipped; they are not | Backlog, unscheduled |
| `0208` — [[tasks/measure-clientless-leader-and-solo-awards]] | Measure clientless-leader incidence **and** Singleplayer award incidence | 🔄 **Sprint 4** — scheduled 2026-09-04, **raised to `High`** |
| `0209` — [[tasks/placement-semantics-literal-one]] | Define `placement` semantics, then fix the literal `1` (from review R2) | Backlog, unscheduled |
| `0210` — [[tasks/singleplayer-leaderboard-reporting-policy]] | Singleplayer reports nothing to the platform leaderboard (owner-ruled) | Backlog, unscheduled |

**And a fifth, filed by the revert itself:** `0211` —
[[tasks/credit-participation-xp-elimination-or-match-end]], 🔄 **Sprint 4**, the replacement that
actually closes the XP loss.

### Two things verified at close that had been beliefs

- ✅ **FFA assigns no team by either path.** `GameImpl.addPlayers()` takes an early-`return` FFA branch
  adding humans and Nations with **no team argument**; `maybeAssignTeam()` returns `null` immediately
  when `gameMode !== GameMode.Team`. So `0205`'s team-assignment findings genuinely do not touch this
  task — previously recorded as an *unverified* producer belief.
- ✅ **The `0022` sequencing dependency is discharged** — `0022` closed 2026-09-02, and the guard this
  task modifies is live in the tree.

⚠️ **Its brief moved `backlog/` → `done/` at close, and that move rotted a vault link** — see the
2026-09-03 lint entry in `log.md`.

### 📎 What the revert deliberately did NOT touch

**`plan.md`, `worklog.md` and `review.md` are UNTOUCHED, by owner ruling.** They are the coder's and
the reviewer's record of what was done at the time, **and they were accurate then.** They describe a
premise that has since been disproved; they are not themselves wrong about the work.
⛔ **Read them as history, not as design input** — `0211`'s brief says so explicitly.
**`0206`'s brief is the pointer**; its STOP box is the authoritative record.

## Related

- [[tasks/credit-participation-xp-elimination-or-match-end]] — task `0211`, **the replacement** filed by this task's revert: credit participation XP at elimination **or** match end, independent of any winner. ⛔ **Not a revival of this award**
- [[decisions/clientless-leader-win-policy]] — the decision this task implements: the guard-only shape, the both-branches ruling, and the keep-them-apart table for `placement` vs `points`
- [[decisions/adr-110-ai-winner-allowed]] — the winner predicate this shipped unchanged; **carries a known expiry**
- [[decisions/adr-101-fail-soft-xp-crediting]] — the fail-soft XP path this defect sits **upstream** of; its closeout clause does **not** cover this loss
- [[tasks/win-check-clientless-leader-guard]] — task `0022`, whose guard-only shape left the residual this task was **built to close** and 🔴 **did not** — the residual is still open
- [[tasks/teams-bot-team-win-stall]] — task `0205`, the Team half; **not advanced by this task** (`checkWinnerTeam()` byte-identical) — ⚠️ **and "byte-identical" was read as "not affected", which is how the SHARED Team-mode XP loss went unnoticed until the revert**
- [[tasks/winmodal-participation-comment-correction]] — task `0207`, the comment trap this task was planned before, and did not trip on
- [[tasks/measure-clientless-leader-and-solo-awards]] — task `0208`, the measurement this shipped without
- [[tasks/placement-semantics-literal-one]] — task `0209`, filed out of this task's review finding R2
- [[tasks/singleplayer-leaderboard-reporting-policy]] — task `0210`, filed out of this task's plan §8
- [[decisions/sprint-4]] — the board this was promoted onto and closed on
- [[systems/glossary]] — the clientful/clientless partition and the win-condition vocabulary this task turns on
- [[systems/execution-pipeline]] — the Intent → Execution → `GameUpdate` path the `Win` update travels
- [[systems/player-profile-store]] — the match-end XP crediting path this award was **meant to** unblock; 🔴 **it does not — the path is still blocked and the XP still lost**
- [[features/tutorial]] — the first-place-for-losing bug this task was hard-required to re-check against, and did not reintroduce (moot since the revert: there is no award branch left to reintroduce it)
- [[features/ai-players]] — the player type ADR-110 allows to be named winner, and which is credited nothing. ⚠️ **"may now be named winner" would be wrong — ADR-110's predicate exists in no shipped code today**
- [[decisions/sprint-backlog]] — the board `0206` was promoted OFF (its row there reads `➡️ Moved`) and where all four of its follow-ups now sit
