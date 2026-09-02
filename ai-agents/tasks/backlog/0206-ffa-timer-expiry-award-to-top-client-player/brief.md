# FFA: award the win to the top player *with* a `clientID` instead of suppressing it — close the stall the `0022` guard leaves behind

## ID
0206

> ℹ️ **ID allocation, checked 2026-09-02 before filing.** `0206` is free. The check that was run:
> `grep -rn "0206" .claude/ ai-agents/` (zero hits), plus a scan of all three boards
> ([`backlog.md`](../../../sprints/backlog.md), [`sprint-backlog.md`](../../../sprints/sprint-backlog.md),
> [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md)/`-5`/`-6`) and of
> `ai-agents/tasks/{backlog,done,cancelled}/` — highest ID in use anywhere is `0205`.
> ⛔ **`0204` was NOT taken.** It is reserved invisibly by the plan-carry-check hook task, which lives
> only in `.claude/skills/fkit-sprint-ship-loop/SKILL.md` prose (five load-bearing honesty markers that
> task must delete when the hook lands) and was never filed as a brief. That reservation is why
> [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md) was renumbered `0204` → `0205`
> earlier the same day. **Do not allocate `0204` to anything else.**

## Sprint
Backlog — unscheduled. Filed on [`backlog.md`](../../../sprints/backlog.md), **not** on Sprint 4.

**Board chosen honestly:** no owner ruling scheduled this into a sprint. Owner ruling **R2**
(2026-09-02, `0022`) said only *"record it as a candidate follow-up brief"* — that defers the work, it
does not commit a sprint to it. Filing it on `plan-sprint-4.md` would assert a commitment nobody made.
**Same reason `0203` and `0205` are on this board.**

## Priority
**Medium — the producer's rank, not an owner ruling.** This board is unranked, so the rank lives here
and the board's Priority column reads `—`.

Why Medium, honestly:

- **It closes a real, silent, whole-match data loss.** With the `0022` guard in place, an FFA match
  whose only qualifying leader is clientless emits **no `Win` update at all** ⇒ no `winner` message
  reaches the server ⇒ `handleWinner` never runs ⇒ **`creditMatchXp` never runs, and the entire
  match's match-end XP is lost for every player.** That is `0022`'s risk 1 in its residual form.
- **It is the main game mode.** Public FFA lobbies carry `bots: 400` and, unlike Team lobbies, do
  **not** disable Nations — so clientless leaders are always present. This is a wider surface than
  [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md), whose realistic trigger is
  private Team lobbies with a timer set.
- **Ranked above `0205`** (Low–Medium) for that reason, and **below** anything with a measured
  player impact.
- ⚠️ **Frequency is UNMEASURED.** Nobody has observed a public FFA match reaching a clientless leader
  at the 80 % threshold, and there is **no production observation and no player report on file**. The
  reasoning is structural. Do not present it as a confirmed field incident. Measuring this is
  **phase 1 of this task** — see *Investigation*.
- **It is a behaviour change, and the owner already deliberately declined it once** (ruling R2). It
  should not jump a queue on the strength of an unmeasured frequency.

## Status
🔲 Backlog

**Depends on [`0022`](../../done/0022-win-check-multiplayer-regression-investigation/brief.md) shipping** —
this task modifies the guard `0022` introduces. ~~`0022` is `🔄 In progress` at filing time (a coder and
a reviewer are still on it).~~ ✅ **`0022` HAS NOW SHIPPED — closed 2026-09-02 as
`✅ Done (agent-closed — not owner-verified)`. This sequencing dependency is DISCHARGED.** Struck, not
deleted. The guard this task modifies is live at `src/core/execution/WinCheckExecution.ts:65-73`.
⚠️ **Carry over from `0022`'s close: review finding R1 — the loss of `reportPlacements()` for a
clientless-leader FFA match, which is Public and Private too, NOT tutorial-only — was accepted as a
residual of `0022`'s guard-only shape and lives here. The award this task builds is what closes it.**
⛔ **And the useful half, which must NOT be undone: for the TUTORIAL, losing `reportPlacements()` is a
FIX** — it was awarding the single human player first place on the real platform leaderboard for
*losing* a tutorial to a bot, via a function with no game-type guard. **Nothing here may reintroduce
that.** **Not `🚧 Blocked`**: the dependency was sequencing, not a gate on an
unmade decision, and the investigation phase can begin without it.

~~⚠️ **One scope question is OPEN and must be settled by the owner before implementation** — see
*⚠️ OPEN — the scope question this brief cannot settle* below. It does **not** block the investigation.~~
✅ **ANSWERED 2026-09-02 — owner ruling: BOTH BRANCHES** (timer **and** the 80 % territory threshold).
**Struck, not deleted.** See *✅ RULED — the branch scope* below, and carry its **two conditions** with
it: the change is **materially larger** than the deferred option (b), and it **must be re-checked
against the tutorial first-place-for-losing bug before shipping** (Verification step 4).

## Owner
fkit-coder

---

## Context

### Where this came from — two separate origins, both recorded

**Origin 1 — the deferred option (b), `0022` planning, 2026-09-02.** The coder offered two shapes for
`0022`'s risk-1 fix: **(a) guard only**, or **(b) guard plus a timer-expiry award**. The owner ruled
**(a)** — recorded as ruling **R2** in
[`0022`'s plan](../../done/0022-win-check-multiplayer-regression-investigation/plan.md) (`plan.md:41-45`,
`:233-234`, `:246`) and carried into
[`0022`'s brief](../../done/0022-win-check-multiplayer-regression-investigation/brief.md) (`:244-246`):

> ⛔ **The timer-expiry award was DECLINED for now** (the coder's option (b) in `plan.md`) — it is a
> behaviour change, not a defect fix. Recorded as a candidate follow-up brief; **not filed**, and
> deliberately so.

**This brief is that follow-up, now filed.**

**Origin 2 — `0022`'s review, finding R1, 2026-09-02.** The review gave the follow-up a **second,
larger reason to exist**, and that reason is carried in full in the next section.

### ✅ Owner ruling, 2026-09-02 — R1 is an ACCEPTED RESIDUAL, not a defect in `0022`

> **`0022`'s review finding R1 is ACCEPTED AS A RESIDUAL of the guard-only shape, and carried into
> this follow-up brief. It is NOT a defect to fix inside `0022`.**

`0022` ships as ruled. The consequences below are the known, accepted price of the guard-only shape,
and closing them is **this** task's job.

---

## ⚠️ What the guard-only shape costs — `0022` review finding R1, carried in full

With the guard in place, an FFA match where a **bot or a Nation** leads at the 80 % threshold, or at
timer expiry, emits **no `Win` update at all**. Everything downstream of that update stops happening.
The reviewer traced each consequence:

| Consequence | Severity | Detail |
|---|---|---|
| **`ClientGameRunner`'s `gameEnded` path no longer runs** | — | `gameEnded` is `gu.updates[GameUpdateType.Win].length > 0` (`src/client/ClientGameRunner.ts:516`). With no `Win` update it is permanently `false`, so the whole block at `:530-536` is dead. |
| **`saveGame()` no longer fires** | **cosmetic** | `src/client/ClientGameRunner.ts:532` → `:373`. A **`localStorage`-only** record (`LocalPersistantStats.ts:46`). Nothing depends on it. *(Reviewer-verified; **not re-verified by the producer this turn** — treat the `LocalPersistantStats.ts:46` line reference as `unverified` by me.)* |
| **`reportPlacements()` no longer fires** | ⚠️ **this is the one that matters** | `src/client/ClientGameRunner.ts:535` → `:405`. **Top-3 humans now get no leaderboard placement points where they previously did.** |
| **Server-side: `creditMatchXp` never runs** | 🔴 **largest consequence** | No `Win` update ⇒ no `SendWinnerEvent` ⇒ no `winner` message ⇒ `handleWinner` (`src/server/GameServer.ts:1144`, invoked at `:366`) never runs ⇒ `creditMatchXp` (`:1253`, **sole** call site `:1199`) never runs. **The whole match's match-end XP is silently lost, for every player.** ✅ Producer-verified this turn. This is risk 1's original defect, and **the award in this task is what closes it.** |

### The `reportPlacements` trade is genuinely two-sided — record both halves

- **Better** in the *"a human eventually wins"* case: placement points now land on the **real win**
  rather than on an arbitrary mid-match moment. The `0022` guard deliberately returns **before**
  `this.active = false`, so the win check stays alive and a human can still win later
  (`src/core/execution/WinCheckExecution.ts:65-76`).
- **Worse** in the *"nobody ever wins"* case: **no placement points at all**, where previously the
  top-3 humans got them.

### ⚠️ And the *useful* half — for the tutorial, removing this is a FIX, not a regression

**Record this so nobody "restores" the old behaviour by accident.** Before the `0022` guard, a bot
winning a tutorial ran `reportPlacements()`, which ranks **only `PlayerType.Human` players**
(`src/client/ClientGameRunner.ts:409-412`) — and **a tutorial has exactly one**. So `myIndex === 0`
(`:418-419`) and the player was awarded **first-place leaderboard points for LOSING a tutorial to a
bot**. `reportPlacement` has **no game-type guard** and writes to the **real platform leaderboard** via
`increaseCurPlayerLeaderboardScore` (`src/client/leaderboard/LeaderboardReporter.ts:44-60`).
✅ Producer-verified this turn: the Humans-only filter, the `myIndex > 2` cut, and the absent game-type
guard.

⛔ **Whatever this task builds must NOT reintroduce that.** The tutorial is created `gameType:
Singleplayer`, `gameMode: FFA`, `isTutorial: true`, with **no `maxTimerValue`**
(`src/client/Main.ts:818-835` — *reviewer-verified; **not re-verified by the producer this turn***), so
a tutorial can only reach the guard via the 80 % threshold, never the timer. ~~**A timer-only award is
automatically safe here; a threshold-branch award is not** — see the open scope question.~~

🔴 **This is now the sharpest constraint on the task, and it is part of the owner's ruling.** The owner
ruled **both branches** (2026-09-02), which means **the threshold branch — the one route a tutorial can
reach — is in scope.** The automatic tutorial safety a timer-only award would have given is **gone by
design**. ⛔ **The first-place-for-losing bug MUST be re-checked before this ships**; it is a **hard
verification step** (Verification step 4), not a nice-to-have. **Struck above, not deleted.**

---

## ~~⚠️ OPEN — the scope question this brief cannot settle~~ → ✅ RULED — the branch scope

**A timer-only award does NOT close the defect in public FFA.** Verified this turn:

- Public lobbies of **every** mode ship `maxTimerValue: undefined` (✅ `src/server/MapPlaylist.ts:162`),
  so **the timer branch never fires in a public lobby.** The timer is private/custom only, host-set.
- The FFA win threshold is **80 %**, not Team's 95 % (✅ `src/core/configuration/DefaultConfig.ts:713-718`).
- Public FFA lobbies carry `bots: 400` (✅ `MapPlaylist.ts:169`) **and** keep Nations —
  `disableNPCs: mode === GameMode.Team && playerTeams !== HumansVsNations` is **false** for FFA
  (✅ `MapPlaylist.ts:165`). Both are clientless.

**So in public FFA the only reachable route into the guard is the 80 % threshold branch, and a
timer-only award leaves every public FFA match's XP loss exactly where it is.**

> ~~🚩 **NEEDS AN OWNER DECISION before implementation. The producer is not settling it.**~~
> ~~Does this task award on **the timer branch only** (the literal shape of the deferred option (b), safe
> for the tutorial, but closes nothing in public FFA), or on **both branches** — timer *and* the 80 %
> threshold (closes the public-FFA XP loss, but is a much larger behaviour change and must be checked
> against the tutorial case above)?~~

### ✅ Owner ruling, 2026-09-02, given live in session — BOTH BRANCHES

> **The fallback award applies to the timer branch AND the territory-threshold branch.**

**Owner's reasoning, as given:** it is **the only option that actually closes the public-FFA XP loss**,
which is **the main mode and the original defect**. A timer-only award would have left every public FFA
match's silent XP loss exactly where it is, because public lobbies ship `maxTimerValue: undefined`
(✅ `src/server/MapPlaylist.ts:162`) so the timer branch never fires publicly.

**Ruled once, deliberately, for BOTH `0206` (FFA) and
[`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md) (Teams)** — so that
`checkWinnerFFA()` and `checkWinnerTeam()` stay on a **consistent policy**, which `0022`'s own notes
warn against splitting. ✅ The Team half of the ruling is recorded on `0205`.

#### ⚠️ Two conditions carried WITH the ruling — they are part of it, not caveats to drop

1. ⚠️ **This is a materially larger behaviour change than the deferred option (b)**, and must be
   **treated as such at plan time.** Option (b) was timer-only; this widens it to the branch that
   actually fires in public play. Do not plan it as if the deferred option had simply been un-deferred.
2. ⚠️ **It must be re-checked against the tutorial first-place-for-losing bug before shipping.** The
   threshold branch is the one route a tutorial can reach, so the automatic safety a timer-only award
   would have carried is **gone**. Recorded as a **hard verification step** — see Verification step 4,
   and the ⛔ block under *the useful half* above.

⚠️ **This was the FFA mirror of an identical question on
[`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md)** — *"whether the fallback should
apply only on the timer branch rather than every tick"*. ✅ **Both were ruled together, as this brief
recommended**, so FFA and Team do **not** end up with inconsistent policies. **Struck above, not
deleted.**

## Other open implementation questions — deliberately unanswered

- **What "top player *with* a `clientID`" ranks by.** `checkWinnerFFA()` already ranks by
  `numTilesOwned()`, so tile count is the existing measure — ⛔ **but do not treat that as decided just
  because it is the existing ranking.** *(Contrast `0205`, where the owner HAS now ruled the Team
  measure is territory — see that brief. That ruling is about Team; it does not automatically transfer.)*
- **Tie-breaking** between two level clientful players — undefined today.
- **Does the match then end?** The award sets a winner, so `this.active = false` runs and the check
  stops. Confirm that is the intent on the threshold branch, where the match might otherwise still be
  winnable by a human later — which is exactly the property the `0022` guard was placed to preserve.
  🚩 **The branch-scope ruling makes this one LIVE and material, not hypothetical** — the threshold
  branch is now in scope, so this question must be answered in the plan and approved. **Still OPEN; the
  producer is not answering it.**

---

## Investigation (phase 1 — do this before writing the fix)

Meaningful unknowns exist, so this is investigation-first.

1. **Measure the reachability claim.** How often does a clientless leader (bot or Nation) actually
   reach **80 %** of non-fallout land in a real public FFA lobby with `bots: 400` and Nations enabled?
   This is the claim marked unmeasured under *Priority*, and it decides whether this task is worth
   Medium at all.
2. **Measure the timer case separately** — a private/custom FFA lobby with a timer set. Different
   population, different frequency.
3. **Confirm the loss end to end**, post-`0022`: reach the guard, then observe that no `Win` update is
   emitted, `saveGame`/`reportPlacements` do not run, no `winner` message reaches the server, and
   `creditMatchXp` does not run. **Do not assert this from reading the code — the whole point of the
   task is the size of this loss.**
   ⚠️ **Port note, real:** the dev server binds **3001/3002**; anything squatting 3001 silently kills
   worker 0 (`EADDRINUSE` swallowed in `Worker.ts`) → no public lobbies, which reads like a code bug
   and is not. Do not start a second `npm run dev` against a tree that already has one.
   ⚠️ `0022`'s risk 1 was accepted with **no live reproduction** (owner ruling R5) because a private
   lobby collides with the owner's dev server. **That constraint has not gone away** — plan around it
   and agree the approach with the owner before assuming a live repro is available.
4. **Check the tutorial path explicitly** ~~against whichever branch scope the owner rules~~ ✅ **the
   scope is ruled: BOTH branches, so the tutorial-reachable threshold branch IS in scope** — so the
   first-place-for-losing bug is not reintroduced. **This is no longer optional.**

## What to Build

~~⚠️ **Nothing until the scope question above is ruled and the investigation findings are reviewed.**~~
✅ **The scope question is ruled (2026-09-02, both branches). Struck, not deleted.** ⚠️ **The
investigation half of that sentence STANDS: still nothing built until the phase-1 findings are
reviewed** — this remains investigation-first.

~~Once ruled — on **timer expiry** (and, if the owner widens it, on the threshold branch too), when the
leader is clientless, award the win to **the top-ranked player that has a `clientID`** instead of
returning without a winner.~~

✅ **As ruled:** on **timer expiry AND on the 80 % territory threshold**, when the leader is clientless,
award the win to **the top-ranked player that has a `clientID`** instead of returning without a winner.
⚠️ **Plan it as the larger behaviour change it is** (condition 1 of the ruling), and ⛔ **prove the
tutorial does not regress** (condition 2).

- The change belongs in `WinCheckExecution.checkWinnerFFA()`, at the guard `0022` introduces.
  ✅ Producer-verified this turn: the guard is `src/core/execution/WinCheckExecution.ts:65-73`, with
  `setWinner` at `:74` and `this.active = false` at `:76`; the threshold/timer condition is `:53-58`.
  ⚠️ **These line numbers WILL drift** — a coder is editing this exact file for `0022` right now.
  **Locate by symbol, not by line.**
- ⛔ **Do not touch `checkWinnerTeam()`.** The Team-mode analogue is
  [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md), which has its own owner ruling
  and its own scope.
- ⛔ **Do not remove or weaken the `0022` guard's `Singleplayer` / `isTutorial` handling.** It mirrors
  `GameImpl.makeWinner()`; breaking the mirror reintroduces the undefined-winner path.
- All changes are in `src/core/` and therefore **must be tested** (project rule).

## Verification

1. **The award fires on BOTH ruled branches** — timer expiry **and** the 80 % territory threshold
   (owner ruling 2026-09-02): clientless leader qualifies, the top clientful player is declared the
   winner, and a `Win` update **is** emitted. **Test both branches separately; a green timer test does
   not cover the threshold branch, and the threshold branch is the one that matters in public FFA.**
2. **Match-end XP credits.** Prove `handleWinner` runs and `creditMatchXp` runs on this new branch.
   **Do not report this as satisfied by reasoning alone** — it is the whole reason the task exists.
3. **`reportPlacements()` runs again** and the top-3 humans receive placement points.
4. 🔴 **HARD STEP — REQUIRED BY THE OWNER'S RULING, 2026-09-02. The tutorial does NOT award first place
   for losing.** Explicitly re-check the case described above — a bot crossing 80 % in a tutorial must
   **not** cause `reportPlacements()` to hand the single Human player first-place leaderboard points
   (`src/client/ClientGameRunner.ts:409-412`, `:418-419`; `LeaderboardReporter.reportPlacement` has **no
   game-type guard** and writes to the **real platform leaderboard**,
   `src/client/leaderboard/LeaderboardReporter.ts:44-60`). ⛔ **The ruling widened the scope onto the
   exact branch a tutorial can reach, so this is the specific thing this widening breaks if it is done
   carelessly. This step gates shipping — do not report it satisfied by reasoning alone.**
5. **A match with no clientful player at all still emits no winner** — the award must not manufacture
   one out of nothing.
6. **Human wins are unchanged** — the ordinary FFA win path does not regress.
7. **Team mode is untouched** — `checkWinnerTeam()` byte-identical.
8. `npm test` green, `npm run lint` clean.
   ⚠️ If a `supertest` suite fails, check CLAUDE.md's known-flake signature before treating it as a
   regression, **rule out `0197`'s `SIGSEGV` first**, and say that you re-ran.

## Notes

- **Depends on:** [`0022`](../../done/0022-win-check-multiplayer-regression-investigation/brief.md) — this task
  modifies the guard `0022` introduces, so `0022` must ship first. Sequencing, not a decision gate.
- **Origin:** `0022` owner ruling **R2** (option (b) declined, follow-up recorded) + `0022` review
  finding **R1** (owner-accepted as a residual, 2026-09-02). Both carried above.
- **Sibling:** [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md) — the Team-mode
  form of the same stall. ~~**Shares an open question** (timer-branch-only vs wider) and, if the two are
  ruled differently, FFA and Team end up with inconsistent win-fallback policies.~~ ✅ **Ruled together
  2026-09-02 — BOTH BRANCHES in both tasks.** The consistency risk is closed by construction, not left
  to chance. `0022`'s notes already flag that `checkWinnerFFA()` and `checkWinnerTeam()` should either
  share a policy or carry an explicit justification for differing — they now share one. **Struck, not
  deleted.** ⚠️ **`0205` still carries two OPEN sub-questions of its own** — tie-breaking, and what
  "human team" means — **which this ruling does NOT touch.**
- **Not a regression.** The underlying undefined-winner path is original to the fork (`feea527`), not a
  PR #77 regression — see `0022`'s *Premise refuted* section. This task closes a long-standing defect;
  it does not undo recent work.
- **Row appended, not inserted** on `backlog.md` (ADR-035).
- No threshold or fallout tuning here (`percentageTilesOwnedToWin()` etc.) — separate balance concern,
  same exclusion `0022` carries.
