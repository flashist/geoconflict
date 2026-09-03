# Clientless-Leader Win Policy — suppress now, award later

**Date**: 2026-09-02
**Status**: accepted

> 🚨 **A production defect is recorded here. `0206` has now shipped the fix IN THE REPO — it is NOT
> yet fixed in production, and one shape of it is deliberately still open.** When a bot or a Nation
> leads an FFA match at the win threshold, **the whole match's match-end XP was silently lost for
> every player in it**. Task `0022` shipped a guard that stops the match wedging but awards nothing;
> the award is `0206`.
>
> 📌 **UPDATED 2026-09-03, twice in one day. Struck, not deleted — each line was true when written.**
> ~~`0206` is **unscheduled, unstarted, and nobody is building it.**~~ → ~~**PROMOTED INTO SPRINT 4**
> on an owner ruling; scheduled is NOT started, its status is `🔲 Backlog` deliberately, planning comes
> first.~~ → ✅ **PLANNED, BUILT, REVIEWED AND CLOSED the same day** as
> `✅ Done (agent-closed — not owner-verified)`.
>
> 🔴 **Read all three of these before treating the defect as closed:**
> 1. **Nothing has been run live.** No deploy, no production observation, no owner play-test. The
>    evidence is unit tests plus a headless simulation. **Production still has the old behaviour.**
> 2. **The XP loss is NOT fully closed even in the repo.** If **every clientful player is eliminated
>    before the threshold**, `sorted.find((p) => p.clientID() !== null)` finds nobody, the code awards
>    nothing and stays active — **that match's XP is still lost.** Knowingly, per the approved plan §7.
> 3. **A player-visible behaviour change shipped with it**: public FFA matches that previously ran to
>    the 3-hour cap or emptied out now **end at 80 %**, possibly crowning a player holding very little
>    territory. Accepted, not silent.
>
> Its row on the unranked Backlog board is kept as `➡️ Moved`, not deleted.

## Context

`WinCheckExecution` declares a winner when a player or team crosses the territory threshold, or when
the match timer expires. Two of its properties turned out to interact badly:

- **`GameImpl.makeWinner()` returns `undefined` for a clientless winner** outside non-tutorial
  singleplayer. This is **original to the fork** (`feea527`), not a regression — see
  [[tasks/win-check-clientless-leader-guard]] for the commit-by-commit refutation.
- **"Clientless" is wider than "bot."** The predicate is `clientID() === null`, which catches
  **Nations (`PlayerType.FakeHuman`)** as well as bots (`src/core/GameRunner.ts:89-93`), and public FFA
  carries both — `disableNPCs` is Team-only (`src/server/MapPlaylist.ts:165`) with `bots: 400` (`:169`).

The consequence chain, producer-verified during `0022`:

`winner: undefined` → `WinModal.ts`'s handler is an **empty block** → no `SendWinnerEvent` → no `winner`
message reaches the server → `GameServer.handleWinner` never runs → **`creditMatchXp`
(`src/server/GameServer.ts:1253`, sole call site `:1199`) never runs.** The match's XP is gone, silently,
for everyone. The win check also set `this.active = false` on the way out, so the match could never end
afterwards, **even by a human win**.

Reachability differs sharply by mode, and this is what makes the branch choice load-bearing:

- **Public lobbies of every mode ship `maxTimerValue: undefined`** (`src/server/MapPlaylist.ts:162`), so
  the **timer branch never fires in a public lobby**. The only reachable route in public FFA is the
  **80% territory threshold** (`src/core/configuration/DefaultConfig.ts:713-718`).
- **Team mode's threshold is 95%**, not 80% — by then the humans are already wiped out, so the
  threshold route there is ~~**rare**~~. The realistic Team shape is **private Team + timer**, where the
  aggregate 400-bot single team plausibly outsizes any one human team at expiry.
  🚩 **"Rare" is CORRECTED BY MEASUREMENT, 2026-09-03. Struck, not deleted.** A headless deterministic
  simulation on the real World map with the shipped **public** Team config (`maxTimerValue: undefined`)
  had the bot team cross 95 % at **ticks 6180–9480 ≈ 7–10 minutes of play, 12/12**. **It is rare
  because humans play, not because 95 % is hard to reach** — and the defect proved
  **passivity-dependent** (0–20 % active slots → stalls; 60–100 % → resolves). The realistic-shape
  conclusion above still stands; the *reason* given for it did not. Full method, numbers and limits:
  [[tasks/teams-bot-team-win-stall]].

## Decision

**Three decisions, all owner-ruled live in session on 2026-09-02.**

**1. The fix `0022`'s own brief prescribed was REJECTED — it would have regressed PR #77.**
The brief directed (at its *"What to Build"* → risk 3) that the `gameType !== Singleplayer` clause be
reverted from `checkWinnerTeam()`, restoring an unconditional `ColoredTeams.Bot` guard. ⛔ **Do not
apply it.** With the clause removed, the guard returns **before** `setWinner` and before
`this.active = false`, so a **singleplayer Team match in which the Bot team leads can never end** — the
check just retries forever. That is exactly the bug `0140-solo-win-condition-fix` (PR #77) was written
to remove. Producer-verified structurally. This is recorded as a decision, not a note, because the
prescription is still written in the brief and a future reader could follow it.

**2. `0022` ships GUARD-ONLY (ruling R2).** A clientless leader is not declared the winner, and the
guard is placed **before `this.active = false`** so the check stays alive and a human can still win the
match later. The timer-expiry **award** was **declined** for `0022` — "a behaviour change, not a defect
fix" — and split out.

**3. The award, when it is built, applies to BOTH BRANCHES — timer AND the territory threshold — and
this was ruled ONCE for both `0205` and `0206`, deliberately**, so `checkWinnerTeam()` and
`checkWinnerFFA()` stay on one consistent policy. Two conditions ride with that ruling and are part of
it, not caveats:

- It is a **materially larger behaviour change** than the deferred timer-only option and must be
  **planned as such** — not as the deferred option simply un-deferred.
- 🔴 **It MUST be re-checked against the tutorial first-place-for-losing bug before shipping** — a hard
  verification step. Widening to the threshold branch puts **the only route a tutorial can reach** back
  in scope, so the automatic tutorial safety that a timer-only award carried is **gone by design**.
- **Verification requires both branches tested separately.** A green timer test does not cover the
  threshold branch, and the threshold branch is the one that matters in public FFA.

**Owner's reasoning, on the record:** both-branches is the only option that actually closes the
**public-FFA XP loss** — the main mode, and the original defect. Timer-only would have left every public
FFA match's silent XP loss exactly where it is, because public lobbies ship `maxTimerValue: undefined`.
⚠️ **That reasoning is FFA-shaped; the Team half follows from CONSISTENCY, not from a Team-side
measurement** — the practical Team-side effect is **unmeasured**.

**For `0205` specifically (Teams):** the **next-highest HUMAN team wins** (option 2), measured by
**territory / tile count**. ⛔ **Options 1 and 3 are REJECTED and must not be re-opened** — option 1
("the Bot team wins") ends a multiplayer match with exactly what the guard exists to prevent, and option
3 ("no winner after a timeout") is **not free**: a match ending with no winner sends no `winner` message,
so `creditMatchXp` never runs and it would **silently drop the whole match's XP — repeating the very
defect class being fixed**. The territory measure was chosen because the win thresholds are already
territory-based and players already read territory as the score; ⛔ it is decided **because the owner
ruled it**, not because it is the existing `checkWinnerTeam()` ranking — that was explicitly not the
argument.

**4. The winner predicate — ADR-110, accepted 2026-09-03, ONE POLICY ACROSS BOTH MODES.**
An **AI player** (`PlayerType.AiPlayer`, which carries a real `clientID`) **MAY be declared winner.**
The predicate stays `clientID() !== null` with **no `PlayerType.AiPlayer` exclusion** — in Team mode
(`0205`) as well as FFA (`0206`), ruled explicitly as a second owner call so the branch scope unified
on 2026-09-02 is not re-split. **An AI winner is credited nothing** (`selectMatchCredits` never looks at
who won, and an AI fails three participant gates independently); what the award does is **unblock
crediting for every real player**. **That is the reasoning — keep it.**

> 🔴 **ADR-110 CARRIES A KNOWN EXPIRY and must never be cited as settled-forever.** The owner was asked
> directly whether a durable, player-visible winner record exists or is planned and answered **"None
> today, but planned."** They accepted `allow` **knowing the trigger is on the roadmap**, so the ADR's
> strongest counter-argument was **overridden with eyes open, not refuted** — *"never answered on its
> merits, only deferred."* **It MUST be re-examined before any leaderboard, match history,
> announcements feed, share card, or other surface naming a winner outside the end-of-match modal
> ships.** Full text and conditions: [[decisions/adr-110-ai-winner-allowed]].

**Nations and Bots stay excluded** — ADR-110 does not change that. In FFA that is the intended shape;
in Team mode it bites harder, and 📌 **the owner deliberately DEFERRED the all-Nations-team case to
`0205`'s plan** on 2026-09-03. A decision with a known shape, not an oversight.

## Consequences

- **`0022` is closed and the wedged-match half is fixed**; the match can still be won by a human later.
  See [[tasks/win-check-clientless-leader-guard]].
- 🚨 **The XP loss is live in production and, as of 2026-09-03, fixed only IN THE REPO.** Guard-only
  means an FFA match where a bot or Nation leads at 80% or at timer expiry emits **no `Win` update at
  all**, so `ClientGameRunner`'s `gameEnded` path never runs. Three downstream effects, traced by the
  reviewer:
  **(a)** `saveGame()` stops — a `localStorage`-only record, **cosmetic**;
  **(b)** `reportPlacements()` stops — ⚠️ **top-3 humans get no leaderboard points where they
  previously did**, in Public and Private FFA, not just the tutorial;
  **(c)** 🔴 **`creditMatchXp` never runs — the whole match's match-end XP is silently lost.**
  ✅ **`0206` shipped the award that closes (b) and (c) — in the repo only, nothing deployed.**
  🔴 **And it does not close them in every shape:** the award needs a **living clientful player** to
  give the win to. Where every clientful player is eliminated before the threshold, `0206` awards
  nothing and returns above `this.active = false`, exactly as before — **the whole-match XP is still
  lost in that case, knowingly** (approved plan §7).
- ⛔ **One consequence is a FIX and must not be "restored":** for the **tutorial**, losing
  `reportPlacements()` removes a real bug — a bot winning a tutorial previously awarded the single human
  player **first-place POINTS for LOSING**, on the **real platform leaderboard**.
  ✅ **`0206` did NOT reintroduce it** — verified against the tree at this lint: `checkWinnerFFA()`
  returns early on `gameConfig.gameType === GameType.Singleplayer`, **before** the fallback award, so
  the award is **multiplayer-only** and a tutorial can never reach it.

### 🚩 Two things that were conflated repeatedly on 2026-09-03 — keep them apart

**They are different values, in different variables, with different fates. Verified against
`src/client/leaderboard/LeaderboardReporter.ts:44-59` at this lint.**

| | `placement` (the rank number) | `points` (the score) |
|---|---|---|
| Where it is set | `ClientGameRunner.reportPlacements()` — `const placement = +1;`, a **literal `1` for everyone** | `awardTable[myIndex]`, i.e. 1st/2nd/3rd from `FlashistGameSettings.leaderboardPoints` |
| Where it goes | **NOWHERE.** `reportPlacement()` reads it **only** inside a `console.debug` under a `TODO: integrate platform leaderboard API` | **`FlashistFacade.increaseCurPlayerLeaderboardScore(params.points)` — the real Yandex platform call** |
| Leaves the browser? | ⛔ **No. It never leaves the client.** | ✅ **Yes.** |
| Owning task | `0209` — define what "placement" means, then fix the literal `1` | `0210` — should Singleplayer report to the platform at all (owner-ruled: option A) |

⛔ **So any sentence of the form "a wrong placement is sent to / reported to the Yandex platform" is
WRONG.** The wrong `placement` value is inert today; `reportPlacement`'s *name* is what makes it look
otherwise.
🚨 **And the mirror-image error is just as wrong:** the **points DO reach the platform** — **10** of
them, the first-place award, handed to a player who **lost** to a bot in non-tutorial Singleplayer, and
**farmable** (no opponent to beat, no matchmaking cost). That is `0210`, and it is a real live defect,
not a naming quibble.
- **This XP-loss path is NOT covered by [[decisions/adr-101-fail-soft-xp-crediting]]'s closeout clause.**
  That ADR closes out findings of the form *"crediting can silently lose XP"* **within `ProfileApiClient`**
  — a bounded-retry drop after the credit was attempted. This defect is **upstream of that client
  entirely**: the credit is never attempted, because `handleWinner` never runs. Do not dismiss one as the
  other.
- ⚠️ **FFA reachability is UNMEASURED.** Whether a clientless leader actually reaches 80% in a real public FFA
  lobby is **not established** — the reasoning is structural, with **no production observation and no
  player report on file**. ~~`0206` is investigation-first for exactly this reason.~~ Do not present it as a
  confirmed field incident.
  🔴 **CORRECTED 2026-09-03: `0206` SHIPPED WITHOUT ITS PHASE-1 MEASUREMENT**, and the pre-fix baseline
  is now **permanently unmeasurable** — an accepted consequence of the owner's sequencing ruling. So
  FFA reachability is not merely unmeasured, it can **never** be measured for the old behaviour. The
  remaining measurement is task `0208` — ~~whose scope was being widened on 2026-09-03 and is not
  settled~~ 📌 **whose widening is now SETTLED: Part A multiplayer clientless-leader incidence,
  Part B Singleplayer award incidence, not to be merged.** 🔴 **Part A's own value decays on DEPLOY,
  not on `0206`'s close** — the multiplayer rate stays observable until the award is actually live.
  See [[tasks/measure-clientless-leader-and-solo-awards]].
  📌 **The TEAM half is now measured — in a simulator, and only there (2026-09-03).** `0205`'s premise is
  **confirmed**: bot team on top **12/12** with `setWinner` **0/12**, the guard proven **causal** (same
  board, `gameType: Singleplayer` → `setWinner("Bot")`, 3/3), the 95 % route crossed at ≈ 7–10 minutes on
  the shipped public config. ⚠️ **Production frequency remains UNMEASURED** — no telemetry, no player
  report; a **simulator result, not a field observation.** ⚠️ And the "active" players were
  `FakeHumanExecution` at Medium, which plays **better than a casual human**, so **the real activity
  crossover is probably higher than 40 %** — do not quote 40 % as a human threshold. See
  [[tasks/teams-bot-team-win-stall]].
- ⚠️ **Risk 1 never got a live reproduction**, so the shipped guard's real-game behaviour is unobserved.
- **Two sub-questions remain OPEN on `0205`** and are not answered by any ruling above: **(a)** tie-breaking
  when two human teams are level on tile count, and **(b)** whether "human team" means any team that is not
  `ColoredTeams.Bot`, or specifically one with at least one real client (relevant if Nations land on a named
  team). Both must be settled in the plan and approved before code is written.
  📌 **Updated 2026-09-03 — (b) is now PARTLY RULED.** ADR-110 settles the **AI-player** half (they count;
  the predicate is `clientID() !== null`). What remains is the **all-Nations team** case, which the owner
  **deliberately deferred to `0205`'s plan time** — same shape as the FFA no-eligible-winner hole, and
  deserving the same care. **(a) is untouched by anything ruled so far.**
- ~~**One sub-question remains OPEN on `0206`**, and the branch-scope ruling made it **live and material**:
  whether the match should **end** on the threshold branch. Ending there removes the "a human could still
  win later" property the `0022` guard was placed to preserve. Also unanswered: the ranking measure for
  "top player with a `clientID`", and tie-breaking.~~
  ✅ **ALL THREE ANSWERED IN `0206`'s APPROVED PLAN AND SHIPPED 2026-09-03. Struck, not deleted** —
  read the shipped answers off `src/core/execution/WinCheckExecution.ts`, `checkWinnerFFA()`:
  - **Does the match end?** **Yes.** On a fallback award the code calls `setWinner(fallback, …)` then
    `this.active = false`. 🚩 **The "a human could still win later" property is therefore GONE on the
    award path — deliberately.** It survives only where **no** clientful player is alive, which returns
    early and stays active.
  - **Ranking measure:** tile count — the same `numTilesOwned()` sort that picks the leader.
  - **Tie-break:** ascending `smallID`, so every client picks the same winner. ⚠️ Its cross-client
    determinism was **verified by reading the construction path, not by two live clients**.

## Related

- [[tasks/win-check-clientless-leader-guard]] — task `0022`, the investigation and the guard it shipped
- [[tasks/solo-win-condition-fix]] — `0140` / PR #77, the change `0022` suspected and cleared, and the singleplayer Team stall the rejected fix would have reintroduced
- [[decisions/adr-101-fail-soft-xp-crediting]] — the fail-soft XP path this defect sits upstream of
- [[decisions/adr-110-ai-winner-allowed]] — the winner predicate, ruled once for `0205` and `0206`; **carries a known expiry that must travel with every citation**
- [[tasks/teams-bot-team-win-stall]] — task `0205`, the Team half, and the 2026-09-03 simulation that confirmed its premise
- [[tasks/winmodal-participation-comment-correction]] — task `0207`, the comment that contradicts the predicate ADR-110 just ruled on
- [[decisions/sprint-backlog]] — where `0205`, `0207`, `0208`, `0209` and `0210` all sit, unscheduled (`0206`'s row there reads `➡️ Moved`)
- [[decisions/sprint-4]] — the sprint that carried `0022`, and that `0206` was promoted onto and closed on 2026-09-03
- [[tasks/ffa-clientless-leader-fallback-award]] — task `0206`, the FFA award that closes most of this defect; **shipped into the repo only**
- [[tasks/measure-clientless-leader-and-solo-awards]] — task `0208`, the production measurement of both this defect's incidence and the Singleplayer award rate
- [[tasks/placement-semantics-literal-one]] — task `0209`, which owns the `placement` half of the table above
- [[tasks/singleplayer-leaderboard-reporting-policy]] — task `0210`, which owns the `points` half
- [[systems/execution-pipeline]] — the Intent → Execution → `GameUpdate` path `Win` updates travel
- [[systems/player-profile-store]] — the match-end XP crediting path that never runs
- [[features/ai-players]] — Bots and Nations, the clientless players this policy is about
- [[systems/glossary]] — the clientful/clientless partition this policy turns on, and why an **AI player is clientful** while a Nation is not
- [[features/tutorial]] — the first-place-for-losing bug this guard incidentally fixes
