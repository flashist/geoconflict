# FFA Clientless-Leader Fallback Award (task 0206)

**Source**: `ai-agents/tasks/done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — promoted, planned, built, reviewed and closed all on 2026-09-03 (agent-closed — not owner-verified)

> 🔴 **CLOSED, NOT FINISHED. Nine residuals survive this close, and three of them are load-bearing.**
> Read them before citing this task as the end of the XP-loss story.
>
> 1. **Nothing has been run live.** No deploy, no production observation, no owner play-test. All
>    evidence is unit tests plus a headless simulation. **Production still has the old behaviour.**
> 2. **The XP loss is not fully closed even in the repo.** If **every clientful player is eliminated
>    before the threshold**, the award finds nobody, nothing is awarded, and that match's XP is
>    **still lost** — knowingly, per the approved plan §7.
> 3. **A player-visible behaviour change shipped with it.** Public FFA matches that previously ran to
>    the 3-hour cap or emptied out now **end at 80 %**, possibly crowning a player holding very little
>    territory. **Accepted, not silent.**
>
> ⏳ **A play-test is IN FLIGHT as of 2026-09-03** — an `fkit-coder` driving the real browser client
> headlessly, on an owner ruling. **The result is not in.** Residual 1 stands unchanged until it is
> recorded; **do not read this note as a pass.**

## Goal

Close the residual that task `0022` left behind by design. `0022` shipped a **guard**: a clientless
leader (a Bot or a Nation) is never declared the winner, and the guard returns **above**
`this.active = false` so the match no longer wedges and a human can still win later. But it awards
nothing — so no `Win` update is emitted, no `winner` message reaches the server, `handleWinner` never
runs, and **`creditMatchXp` never runs**. The whole match's match-end XP is silently lost for every
player.

`0206` is the award that closes that loss in **FFA**: instead of stalling, declare the win to the
**top-ranked player that has a `clientID`**. The Team-mode half is [[tasks/teams-bot-team-win-stall]]
(`0205`) and is untouched here.

**Both branches were in scope** — timer expiry **and** the 80 % territory threshold — on the owner's
2026-09-02 ruling made once for `0205` and `0206` together, so the two win-check functions stay on one
policy. That widening matters: public lobbies ship `maxTimerValue: undefined`
(`src/server/MapPlaylist.ts`), so **the timer branch cannot fire in a public lobby at all** and a
timer-only award would have left the entire public-FFA XP loss exactly where it was.

## Key Changes

**`src/core/execution/WinCheckExecution.ts` — `checkWinnerFFA()` only, 3 hunks, +41.**
**`checkWinnerTeam()` is byte-identical**; Team mode is untouched.

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
- **The guard comment was corrected** to say the policy is about being *clientless*, not about being
  AI. ⚠️ **Only that comment** — the separate misleading `WinModal` comment is still wrong and is still
  task `0207` ([[tasks/winmodal-participation-comment-correction]]).
- **Tests:** `tests/core/executions/WinCheckExecution.test.ts` 15 → 19 tests (+226/−32); new
  `tests/server/GameServerWinner.test.ts`.

⚠️ **Locate every symbol by name, not by line — `WinCheckExecution.ts` moved twice in two days.**

## Outcome

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

### The nine residuals, in full

1. ⛔ **Verification step 2 is partial by construction.** The core end and the server end are tested;
   the middle leg (`Win` update → `WinModal` → `SendWinnerEvent` → `Transport` → server) has **no test
   harness in this repo**, is **unchanged by this task**, and runs on every ordinary human win today.
   Recorded as **"unchanged and already live" — never as "verified."** That exact wording is a plan
   requirement.
2. **Verification step 3 is a code trace, not a test** — `ClientGameRunner` has no harness here.
3. 🔴 **Nothing has been run live.** No production observation, no deploy, no owner play-test.
   ⏳ A headless browser play-test is **in flight** and **its result is not in**.
4. **The XP loss is still not fully closed** — every clientful player eliminated before the threshold
   ⇒ no award, XP still lost. Knowingly, per approved plan §7.
5. **The `console.log` on the fallback award reaches no dashboard** — it runs in the client's Web
   Worker. It discharges the owner's Q3 ruling exactly as planned and no more;
   [[tasks/measure-clientless-leader-and-solo-awards]] (`0208`) is the real measurement.
6. **The `smallID` tie-break's cross-client determinism is not test-coverable here.**
7. **Player-visible behaviour change — accepted, not silent.** Public FFA now ends at 80 %.
8. **ADR-110's known expiry stands.**
9. **Phase-1 frequency remains UNMEASURED**, and 🔴 **the pre-fix baseline is now permanently
   unmeasurable** — an accepted consequence of the owner's sequencing ruling.

### Four follow-up briefs it spawned

| Task | What it covers | Board |
|---|---|---|
| `0207` — [[tasks/winmodal-participation-comment-correction]] | `WinModal` doc comment: says AI players are skipped; they are not | Backlog, unscheduled |
| `0208` — [[tasks/measure-clientless-leader-and-solo-awards]] | Measure clientless-leader incidence **and** Singleplayer award incidence | Backlog, unscheduled |
| `0209` — [[tasks/placement-semantics-literal-one]] | Define `placement` semantics, then fix the literal `1` (from review R2) | Backlog, unscheduled |
| `0210` — [[tasks/singleplayer-leaderboard-reporting-policy]] | Singleplayer reports nothing to the platform leaderboard (owner-ruled) | Backlog, unscheduled |

### Two things verified at close that had been beliefs

- ✅ **FFA assigns no team by either path.** `GameImpl.addPlayers()` takes an early-`return` FFA branch
  adding humans and Nations with **no team argument**; `maybeAssignTeam()` returns `null` immediately
  when `gameMode !== GameMode.Team`. So `0205`'s team-assignment findings genuinely do not touch this
  task — previously recorded as an *unverified* producer belief.
- ✅ **The `0022` sequencing dependency is discharged** — `0022` closed 2026-09-02, and the guard this
  task modifies is live in the tree.

⚠️ **Its brief moved `backlog/` → `done/` at close, and that move rotted a vault link** — see the
2026-09-03 lint entry in `log.md`.

## Related

- [[decisions/clientless-leader-win-policy]] — the decision this task implements: the guard-only shape, the both-branches ruling, and the keep-them-apart table for `placement` vs `points`
- [[decisions/adr-110-ai-winner-allowed]] — the winner predicate this shipped unchanged; **carries a known expiry**
- [[decisions/adr-101-fail-soft-xp-crediting]] — the fail-soft XP path this defect sits **upstream** of; its closeout clause does **not** cover this loss
- [[tasks/win-check-clientless-leader-guard]] — task `0022`, whose guard-only shape left the residual this task closes
- [[tasks/teams-bot-team-win-stall]] — task `0205`, the Team half; **not advanced by this task** (`checkWinnerTeam()` byte-identical)
- [[tasks/winmodal-participation-comment-correction]] — task `0207`, the comment trap this task was planned before, and did not trip on
- [[tasks/measure-clientless-leader-and-solo-awards]] — task `0208`, the measurement this shipped without
- [[tasks/placement-semantics-literal-one]] — task `0209`, filed out of this task's review finding R2
- [[tasks/singleplayer-leaderboard-reporting-policy]] — task `0210`, filed out of this task's plan §8
- [[decisions/sprint-4]] — the board this was promoted onto and closed on
- [[systems/glossary]] — the clientful/clientless partition and the win-condition vocabulary this task turns on
- [[systems/execution-pipeline]] — the Intent → Execution → `GameUpdate` path the `Win` update travels
- [[systems/player-profile-store]] — the match-end XP crediting path this award unblocks
- [[features/tutorial]] — the first-place-for-losing bug this task was hard-required to re-check against, and did not reintroduce
- [[features/ai-players]] — the player type that may now be named winner, and is credited nothing
- [[decisions/sprint-backlog]] — the board `0206` was promoted OFF (its row there reads `➡️ Moved`) and where all four of its follow-ups now sit
