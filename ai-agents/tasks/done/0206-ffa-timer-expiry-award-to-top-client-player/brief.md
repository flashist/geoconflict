# FFA: award the win to the top player *with* a `clientID` instead of suppressing it — close the stall the `0022` guard leaves behind

---

> # 🔴 STOP — READ THIS BEFORE ANYTHING ELSE IN THIS FILE
>
> ## THIS TASK'S BEHAVIOUR IS **NOT IN THE GAME**. IT WAS BUILT, REVIEWED, CLOSED, GATE-PASSED — AND THEN **REVERTED BEFORE IT EVER REACHED A PLAYER.** IT WAS **NEVER DEPLOYED.**
>
> **Recorded 2026-09-04 on an owner ruling given live in session.**
>
> ⚠️ **The status below still reads `✅ Done (agent-closed — not owner-verified)`, and that is
> CORRECT and DELIBERATE — do not "fix" it.** The **work** was done. The **effect** was reverted.
> Those are two different facts, and only the first one is a status. 🔴 **A reader who sees
> `✅ Done` and concludes the behaviour is live is making exactly the mistake this box exists to
> prevent.** The task stays closed and stays in `ai-agents/tasks/done/`; **no mover skill was run
> and none should be.**
>
> ### Why it was reverted — state this precisely, all three claims are different
>
> ✅ **TRUE: `0206` did exactly what its approved plan specified, and the plan's PREMISE was wrong.**
> ⛔ **NOT TRUE: "`0206` was buggy."** It was not. It was correctly built against its plan, passed a
> two-reviewer stateful review (Codex: *"No findings."*), and passed its owner-ruled play-test gate.
> ⛔ **NOT TRUE: "`0206` caused the stall."** It did not. The stall predates it (`0022`) and
> **survives the revert unchanged.**
>
> ### What a live investigation measured on 2026-09-04 — observed, not reasoned
>
> 1. 🔴 **`0206` is a NO-OP in the case that actually loses the XP.** With every human eliminated, a
>    Nation reached **100.0 % of the map and the match still did not end.** Verified against the diff
>    `82365bc` → `8f6e478`: `players()` filters to `isAlive()`
>    (`src/core/game/GameImpl.ts:421-423`), so dead players are absent from `sorted`, `find` returns
>    `undefined`, and the code takes **the same early `return` it took before `0206`.**
> 2. **`0206`'s only live effect is the behaviour the owner rejects.** It fires **only while a human
>    is still alive**, crowning a player holding as little as **0.5 %** while a bot holds 80 %. The
>    owner reproduced this on their own build and ruled it wrong:
>    > *"if a bot has 80 % and a player has 20 %, it's the problem of the player. They need to
>    > conquer more territory or they will be defeated by the bot."*
>
> ### 🔴 The defect this task was scheduled to close is STILL OPEN AND STILL LIVE
>
> **A match nobody can win still runs to the cap, and everyone in it still loses their match-end XP.**
> That was true **before** `0206`, **during** `0206`, and **after** the revert. Nothing here closed it.
>
> ### A replacement is coming — the fix is NOT abandoned
>
> **Credit participation XP at ELIMINATION *or* at MATCH END, whichever comes first, idempotent so
> nobody is paid twice.** 📌 **WIDENED LATER THE SAME DAY by two further owner rulings: it must also
> cover SURVIVORS of a match that never ends, and it covers TEAM MODE as well as FFA** — because
> `checkWinnerTeam()` carries the same guard shape and loses its XP identically, which nobody had
> connected until the revert coder found it. ⚠️ **Singleplayer is explicitly NOT ruled.** Filed as
> [`0211`](../../backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md) —
> ~~unscheduled on the [Backlog board](../../../sprints/backlog.md).~~
>
> ✅ **CORRECTED 2026-09-04 — `0211` IS SCHEDULED INTO SPRINT 4.** Owner ruling given live in session
> the same day; tracked on [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md), with its
> [Backlog board](../../../sprints/backlog.md) row kept as `➡️ Moved`. **Struck, not deleted** — the
> struck clause was written before the scheduling ruling landed and is **spent, not wrong.**
>
> - **Status: `🔲 Backlog` — NOT STARTED.** ⚠️ **Scheduled is not started; nobody is building it.**
> - **Rank: `Medium–High` — the PRODUCER'S rank, not an owner ruling.**
> - ⛔ **Ship-ordering constraint (owner ruling, 2026-09-04): `0211` must NOT SHIP until
>   [`0208`](../../backlog/0208-measure-clientless-leader-at-win-condition-in-production/brief.md)
>   has been DEPLOYED AND IS COLLECTING DATA.** ⚠️ **"Deployed and collecting" — NOT merely merged,
>   NOT merely built.**
> - ✅ **Planning and building `0211` IN PARALLEL IS EXPLICITLY ALLOWED — only its SHIP is ordered.**
> - ⚠️ **Neither `0211` nor `0208` is `🚧 Blocked`.**
>
> ✅ **The architect's feasibility
> assessment has LANDED** —
> `ai-agents/knowledge-base/reports/2026-09-04-elimination-time-xp-crediting-design-assessment.md`.
> Its headline: **feasible, and cheaper than it looks.** ⛔ **Read it there** — `0211` deliberately
> carries no design of its own.
>
> ### ⛔ Files deliberately NOT edited by this correction
>
> `plan.md`, `worklog.md` and `review.md` are **untouched, by owner ruling.** They are the coder's and
> the reviewer's record of what was done at the time, **and they were accurate then.** They describe a
> premise that has since been disproved; they are not themselves wrong about the work. **This brief is
> the pointer** — read the correction here, then read those three as the historical record they are.
>
> ### ✅ The play-test gate PASS still stands — and it is not undermined
>
> The gate recorded 2026-09-03 **passed, and that remains true.** It tested that **the award fires**,
> and the award does fire. ⚠️ **What changed is not the test result — it is that the award turned out
> not to be worth having.** The gate never asked whether the award was the right behaviour; it asked
> whether the code did what the plan said. It did.

---

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
> [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md) was renumbered `0204` → `0205`
> earlier the same day. **Do not allocate `0204` to anything else.**

## Sprint
**Sprint 4** — scheduled. Tracked on [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md).

~~Backlog — unscheduled. Filed on [`backlog.md`](../../../sprints/backlog.md), **not** on Sprint 4.~~

~~**Board chosen honestly:** no owner ruling scheduled this into a sprint. Owner ruling **R2**
(2026-09-02, `0022`) said only *"record it as a candidate follow-up brief"* — that defers the work, it
does not commit a sprint to it. Filing it on `plan-sprint-4.md` would assert a commitment nobody made.
**Same reason `0203` and `0205` are on this board.**~~

➡️ **PROMOTED TO SPRINT 4 — owner ruling given live in session, 2026-09-03**, via `AskUserQuestion`,
on the producer's recommendation. **Struck, not deleted.** The struck text above is **spent, not
wrong**: it was accurate for exactly as long as no ruling scheduled this task, and a ruling now has.

Owner's reasoning, recorded verbatim from the option they chose:

> *"Schedule it now — Put 0206 into the current sprint scope. It needs no deploy slot to plan or
> build — only to ship. Two design questions are still open (does the match end on the threshold
> branch, and what the ranking/tie-break measure is), so I'd spawn a plan first and bring it to you."*

⚠️ **The owner ruled SCHEDULING ONLY.** They did **not** rule on the rank (see *Priority* — still the
producer's), on the technical scope, or on either open design question. Nothing else in this brief
was changed by the promotion.

⚠️ **Scheduled is not started.** The status stays `🔲 Backlog`; the owner's own ruling says a **plan**
comes first, and both open design questions must be answered in that plan and approved before code is
written.

Its row on [`backlog.md`](../../../sprints/backlog.md) is kept as `➡️ Moved`, **not deleted**, so the
trail from "filed here" to "tracked there" survives — the same treatment `0057`, `0062` and `0200`
got. The Sprint 4 row was **appended, not inserted** (ADR-035).

## Priority
**Medium — the producer's rank, not an owner ruling. UNCHANGED by the 2026-09-03 promotion.**

~~This board is unranked, so the rank lives here and the board's Priority column reads `—`.~~
Still true on the new board too: **`plan-sprint-4.md`'s Priority column reads `—` for every row**, so
the rank lives here either way. **Struck, not deleted** — only the board name changed.

✅ **Re-checked 2026-09-03, at promotion, and HELD at Medium.** Scheduling and importance are
different axes and **only the first one moved today**: the owner ruled *when this is worked*, not *how
much it matters*. Nothing about the defect changed — same trigger, same blast radius, and the
frequency is **still unmeasured**. ⚠️ **If this rank is ever raised or lowered, that is a producer
call unless an owner ruling says otherwise; the 2026-09-03 ruling is not one.** The thing that would
actually move it is **phase 1's measurement** (see *Investigation*), not the promotion.

Why Medium and not higher, restated at promotion so the sprint board is not read as a re-rank: the
XP loss is real, silent and whole-match, but **no production observation and no player report exist**,
and the owner already deliberately declined this behaviour change once (ruling R2). Why not lower:
it is the **only** fix for a live defect in the **main game mode**.

Why Medium, honestly:

- ~~**It closes a real, silent, whole-match data loss.** With the `0022` guard in place, an FFA match
  whose only qualifying leader is clientless emits **no `Win` update at all** ⇒ no `winner` message
  reaches the server ⇒ `handleWinner` never runs ⇒ **`creditMatchXp` never runs, and the entire
  match's match-end XP is lost for every player.** That is `0022`'s risk 1 in its residual form.~~
  🔴 **DISPROVED BY MEASUREMENT 2026-09-04 — struck, NOT deleted.** ⚠️ **Read the strike carefully:
  the DEFECT half of this sentence is still true; the CLOSES half is what was disproved.** The XP loss
  is real, silent and whole-match, exactly as written — **but `0206` does not close it.** In the case
  that actually loses the XP (every clientful player eliminated), `players()` filters to `isAlive()`
  (`src/core/game/GameImpl.ts:421-423`), so `find` returns `undefined` and this task's award code takes
  the **same early `return` it took before `0206`.** A Nation was observed reaching **100.0 %** of the
  map with the match still not ending. **This bullet was the load-bearing reason the task was ranked
  and scheduled, and it was wrong on the decisive clause.** See the STOP box at the top of this file.
- **It is the main game mode.** Public FFA lobbies carry `bots: 400` and, unlike Team lobbies, do
  **not** disable Nations — so clientless leaders are always present. This is a wider surface than
  [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md), whose realistic trigger is
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
✅ Done (agent-closed — not owner-verified)

### 🔴 REVERTED 2026-09-04 — the status above is unchanged **on purpose**, and here is why

⛔ **Owner ruling given live in session, 2026-09-04.** The full statement is in the STOP box at the
top of this file; this entry exists so the fact sits **beside the status value**, where a reader
checking status will hit it.

| Question a reader actually asks | Answer |
|---|---|
| Is this task's status still `✅ Done`? | **Yes — unchanged, deliberately.** The *work* was done. |
| Is the folder still in `tasks/done/`? | **Yes — unchanged.** No mover skill was run; none should be. |
| **Is the behaviour in the game?** | 🔴 **NO. It was reverted before it ever reached a player, and it was NEVER DEPLOYED.** |
| Was `0206` buggy? | **No.** It did what its approved plan specified. |
| Did `0206` cause the stall? | **No.** The stall predates it (`0022`) and survives the revert unchanged. |
| Then what was wrong? | 🔴 **The plan's PREMISE.** A live investigation measured it on 2026-09-04 and it did not hold. |
| Is the XP loss fixed? | 🔴 **No. Still open, still live.** A match nobody can win still runs to the cap and still loses every player's match-end XP. |
| Is anything replacing it? | **Yes** — [`0211`](../../backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md). ~~Unscheduled on the Backlog board.~~ ✅ **CORRECTED 2026-09-04 — SCHEDULED INTO SPRINT 4** (owner ruling, live in session), tracked on [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md); its Backlog-board row is kept as `➡️ Moved`. **Struck, not deleted — spent, not wrong.** Status **`🔲 Backlog`, NOT STARTED** (⚠️ scheduled is not started). Rank **`Medium–High`, the producer's, not an owner ruling.** ⛔ **Must NOT SHIP until [`0208`](../../backlog/0208-measure-clientless-leader-at-win-condition-in-production/brief.md) is DEPLOYED AND COLLECTING DATA** — ⚠️ **not merely merged or built** — though ✅ **planning and building it in parallel is explicitly allowed.** ⚠️ **Neither task is `🚧 Blocked`.** |

**The two measured findings, in one line each** — both **observed**, not reasoned:

1. 🔴 **`0206` is a no-op in the case that actually loses the XP.** Every human eliminated ⇒ a Nation
   reached **100.0 % of the map and the match still did not end.** `players()` filters to `isAlive()`
   (`src/core/game/GameImpl.ts:421-423` — ✅ **producer-verified this turn against committed
   `8f6e478`**), so dead players are absent from `sorted`, `find` returns `undefined`, and the code
   takes **the same early `return` it took before `0206`.**
2. **`0206`'s only live effect is the behaviour the owner rejects** — it fires only while a human is
   still alive, crowning a player on as little as **0.5 %** against a bot on 80 %. Owner reproduced it
   and ruled it wrong.

⛔ **A coder was reverting the code in `src/` in parallel when this was recorded**, on the owner's
ruling, so it does not ship in the weekend deploy from `dev`. **This producer wrote no source.**

📎 **`plan.md`, `worklog.md`, `review.md` — untouched by owner ruling.** They record what was done at
the time and **were accurate then.** This brief is the pointer to the correction; those three are the
historical record.

✅ **The 2026-09-03 play-test gate PASS still stands.** It tested that the award fires — it does.
⚠️ **What changed is that the award was not worth having**, which the gate never asked about.

---

🔴 **CLOSED 2026-09-03. THE OWNER HAS NOT VERIFIED THIS.** The close was performed by a producer
**spawned** by the sprint ship-loop driver, with **no owner channel** (ADR-033 §4/§5). No human
checked this work: **the owner has not run the game, has not deployed, and has not observed this
behaviour live.** ⚠️ `/fkit-status` collapses every `✅` variant to plain `done`, so this marker is
**invisible there** (known, ADR-033 §Consequences) — read it here or on the Sprint 4 row.

**What shipped:** `src/core/execution/WinCheckExecution.ts` — `checkWinnerFFA()` only, 3 hunks, +41 ·
`tests/core/executions/WinCheckExecution.test.ts` 15 → 19 tests (+226/-32) · new
`tests/server/GameServerWinner.test.ts`. **`checkWinnerTeam()` is byte-identical** — Team mode is
untouched and still belongs to
[`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md).

**How it got here:** plan approved by the owner via `AskUserQuestion` before any code was written →
implemented → `/fkit-stateful-review` round 1 with **both** reviewers run: the **Codex adversarial
pass returned "No findings."**, the Claude pass returned three **low**, non-blocking findings. All
three were verified `CORRECT` by the coder and **none was disputed**. R1 and R3 were fixed
(documentation only); **R2 was accepted by owner ruling with no code changed**, and its follow-up was
filed as [`0209`](../../backlog/0209-define-placement-semantics-and-fix-literal-one/brief.md). An
amendment round then corrected R2's *mechanism* as overstated — reached **independently in both
ledger halves**, by the reviewer and by the coder, converging on the same conclusion. Review ledger
`Status: closed-out`; final round-1 disposition **✅ Ready to merge**.

**Test evidence:** `npm test` → **109 suites, 1133 tests, all passed, exit 0**, green on its **first**
run in every round — no `supertest` flake, no `0197` `SIGSEGV`, and nothing re-run to get green.
`npm run lint` and prettier clean.

### 🔴 Residuals that survive this close — read before treating this as finished

The task is complete **against its approved plan**. It is **not** free of known limits:

1. ⛔ **Verification step 2 is partial by construction.** The core end and the server end are tested;
   the middle leg (`Win` update → `WinModal` → `SendWinnerEvent` → `Transport` → server) has **no test
   harness in this repo**, is **unchanged by this task**, and runs on every ordinary human win today.
   ~~It is recorded as **"unchanged and already live" — never as "verified."** That exact wording is a
   plan requirement.~~ ✅ **NOW PARTLY VERIFIED — updated 2026-09-03 by the play-test; struck, not
   deleted, because the wording was accurate until then.** The middle leg was **observed running from a
   real browser client**: `received winner vote player,XN1E75M5` → `Winner determined by 1/1 active
   IPs` → `archiving game winner=["player","XN1E75M5"]`. ⛔ **"Partly" is load-bearing — step 2 is still
   NOT fully satisfied: XP was NOT credited.** `creditMatchXp` is *called* but returns at
   `credits.length === 0` (no authenticated Yandex ids locally), so **crediting remains UNPROVEN**. Say
   "middle leg observed live, crediting still unproven" — never "step 2 verified."
   ⚖️ **This edit overrode an approved plan requirement — flagged, escalated, and RULED ON. It is a
   deliberate decision, not an agent quietly rewriting an approved requirement.** The producer flagged
   the override rather than making it silently; it was put to the owner; **the owner ruled 2026-09-03,
   live in session, to KEEP it.** *Owner's reasoning, recorded because it governs how a later reader
   should treat this:* the required wording existed **to prevent overclaiming**, and the replacement
   still prevents it — it says *"middle leg observed live, crediting still unproven"* and explicitly
   forbids *"step 2 verified."* The original was **struck, not deleted**, so it stays readable.
   Honouring the stale words over their purpose would have made the record **factually wrong while
   looking compliant**. ⇒ **The requirement's intent is served; its letter was overtaken by evidence.**
2. ~~**Verification step 3 is a code trace, not a test** — `ClientGameRunner` has no harness here.~~
   ✅ **DISCHARGED 2026-09-03 by the play-test — `reportPlacements()` was OBSERVED RUNNING** (points 10
   for 1st / 5 for 2nd, ranking correct). Still no test harness; it is now live observation instead of
   a code trace. **Struck, not deleted.**
3. ~~🔴 **Nothing has been run live.** All evidence is unit tests plus a headless simulation. **No
   production observation, no deploy, no owner play-test.**~~ ✅ **DISCHARGED 2026-09-03 BY AGENT
   PLAY-TEST** — run **and** recorded, which is exactly the discharge condition below. ⚠️ **Qualifier
   carried with the discharge, deliberately not dropped: this was a HEADLESS AGENT run driving the real
   browser client, NOT a human playing.** The producer flagged that weakness to the owner before they
   ruled; the owner accepted it. **Still true and unchanged: no production observation and no deploy.**
   🚦 See the [Play-test gate](#-play-test-gate--owner-ruling-2026-09-03) result below.
4. **The XP loss is still not fully closed.** If every clientful player is eliminated before the
   threshold, no award is made and that match's XP is **still lost** — knowingly, per the approved
   plan §7.
   🔴 **PROMOTED 2026-09-04 — THIS RESIDUAL WAS NOT A CORNER CASE. IT IS *THE* CASE, and measuring it
   is what disproved this task's premise.** Recorded on an owner ruling given live in session. The
   text above is **accurate and unchanged** — what changed is its *weight*. It was written as a known
   remaining gap beside a fix that closed the main path; the 2026-09-04 investigation measured that
   **this gap IS the main path**, and that `0206` closes nothing in it. A Nation was observed reaching
   **100.0 %** of the map with every human eliminated and **the match still did not end.** Mechanism,
   ✅ producer-verified this turn against committed `8f6e478`: `players()` filters to `isAlive()`
   (`src/core/game/GameImpl.ts:421-423`) ⇒ dead players are absent from `sorted` ⇒ `find` returns
   `undefined` ⇒ **the same early `return` as before `0206`.** ⚠️ **Residuals 1–3 and 5–9 are NOT
   restated or re-weighted by this entry** — only this one moved. Closing this case is
   [`0211`](../../backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md)'s whole
   job. See the STOP box at the top of this file.
5. **The `console.log` on the fallback award reaches no dashboard** — it runs in the client's Web
   Worker. It discharges the owner's Q3 ruling exactly as planned and no more;
   [`0208`](../../backlog/0208-measure-clientless-leader-at-win-condition-in-production/brief.md) is
   the real measurement.
6. **The `smallID` tie-break's cross-client determinism is not test-coverable here** — verified by
   reading the construction path, ~~**not** by two live clients.~~ **PARTLY DISCHARGED 2026-09-03 by
   the play-test: two live clients DID independently agree on the winner** (both logged
   `Anon6104 has won the game (0206 fallback award)`; no desync). ⚠️ **But NO TIE OCCURRED, so the
   `smallID` tie-break ITSELF is still UNTESTED.** What was shown is cross-client agreement on the
   ordinary path, not tie-break determinism. **Struck, not deleted.**
7. **Player-visible behaviour change — accepted, not silent.** Public FFA matches that previously ran
   to the 3-hour cap or emptied out now **end at 80 %**, possibly crowning a player holding very
   little territory. 🚦 **GATED — see [Play-test gate](#-play-test-gate--owner-ruling-2026-09-03)
   below. This residual is why the gate exists; the gate does not discharge it** — it stays an
   accepted change, the play-test only checks the crowned winner is sensible before players see it.
8. **ADR-110's known expiry stands** — the AI-may-win decision must be re-examined before any
   durable, player-visible winner surface ships.
9. **Phase-1 frequency remains UNMEASURED**, and the pre-fix baseline is now **permanently
   unmeasurable** — an accepted consequence of the owner's sequencing ruling.

### 🚦 Play-test gate — owner ruling 2026-09-03

⛔ **This is an OWNER RULING given live in session on 2026-09-03, not a producer's suggestion.** It
attaches to residuals **3** (nothing run live) and **7** (player-visible behaviour change), above.

🔴 **Do not let this behaviour reach players until a private FFA play-test has been run and its result
recorded.** The two things that play-test must confirm:

1. **The fallback award actually fires** when a clientless leader — a Bot or a Nation — crosses the
   **80 % territory threshold**, i.e. the win goes to the top player that *does* carry a `clientID`
   instead of the match wedging or ending with no winner.
2. **The declared winner is sensible** — a human reading the end screen accepts the result. Residual 7
   says the crowned player may hold very little territory; this is the check that "very little" is
   still a defensible outcome and not an absurd one.

**Why the owner ruled it, in their own reasoning as put and accepted:** it costs one short session,
and it **turns residual 3 from open to discharged**. Everything on this task today is unit tests
(109 suites / 1133 tests) plus a headless deterministic simulation — nobody has watched the game do
this.

**⛔ What this gate does NOT do.** It does **not** reopen `0206`. The task **stays closed**, stays in
`ai-agents/tasks/done/`, and **keeps `✅ Done (agent-closed — not owner-verified)` unchanged** — a
pending play-test is precisely what that marker already means. Nothing here changes the status, and
no status-mover skill was or should be run on account of it.

#### How residual 3 is discharged — the exact condition

✅ **Residual 3 is discharged when the play-test has been RUN and its RESULT RECORDED. It is NOT
discharged by deploying the code.** A deploy puts the behaviour in front of players; it does not
observe it. Shipping without the play-test leaves residual 3 open *and* live.

**"Recorded" means, concretely** — append a dated entry to this section (and mirror one line onto the
`0206` row of `ai-agents/sprints/plan-sprint-4.md`) carrying all of:

- **date** of the play-test and **who ran it**;
- **setup**: private FFA lobby, which map, and how the clientless leader was arranged;
- **did the fallback award fire?** — yes / no, and what the end screen showed
  (`win_modal.other_won` with which name);
- **the winner's territory share at the award**, as a number;
- **the owner's verdict on sensibility** — accepted, or not;
- **result: PASS or FAIL.**

⚠️ **A FAIL is not recorded and forgotten — it is a new task**, filed as a fresh brief in
`ai-agents/tasks/backlog/`. It does **not** reopen `0206` and does **not** edit its status; `0206`'s
history stays as shipped. Likewise, a PASS discharges residual 3 **only** — residual 7 stays an
accepted, standing behaviour change, and the other seven residuals are untouched by this gate.

#### ✅ RESULT RECORDED 2026-09-03 — **PASS.** Both gate conditions met

> ### 📌 2026-09-04 — THE PASS STANDS. IT IS NOT RETRACTED, NOT DOWNGRADED, NOT RE-RUN.
>
> **Recorded on an owner ruling given live in session.** The gate asked two things and **both were
> genuinely met**: the award **fires**, and the owner **accepted** the end screen. ✅ **Nothing below
> is withdrawn.**
>
> ⚠️ **What changed is not the result — it is the value of what was tested.** The gate tested that
> **the award fires**, and it does. It never asked whether the award was the **right behaviour**, nor
> whether it fires in the case that **actually loses the XP**. The 2026-09-04 investigation measured
> both, and the answers were **no** and **no**:
>
> - The award's only live effect is the behaviour the **owner has since ruled wrong** — crowning a
>   player on 0.5 % against a bot on 80 %. *(Note that this run recorded a winner's share of exactly
>   **0.516 %**, in the table below. The gate saw this behaviour, and accepted it on the reasoning
>   that a visibly odd winner beats a silent XP loss. **That reasoning has since been overtaken: the
>   silent XP loss is not actually prevented.**)*
> - In the case that loses the XP — every human eliminated — the award is a **no-op**.
>
> ⇒ **Read this PASS as: "the code did what the plan said." It is NOT evidence that the shipped
> behaviour was correct, and it must not be cited as such.** 🔴 **The behaviour it passed was reverted
> and never reached a player.** See the STOP box at the top of this file.

⛔ **This entry does NOT change this task's status.** `0206` stays closed, stays in `tasks/done/`, and
keeps `✅ Done (agent-closed — not owner-verified)` **unchanged** in both this brief and its Sprint 4
row. A PASS on this gate does **not** upgrade that marker — only the owner re-invoking
`/fkit-task-done` after their own verification clears it, and an agent-run play-test is not that. **No
mover skill was run; nothing moved; `plan.md`, `worklog.md` and `review.md` are untouched.**

| Field the gate demands | Recorded value |
|---|---|
| **Date** | 2026-09-03 |
| **Who ran it** | A spawned **`fkit-coder`**, headlessly, driving the **real browser client** via Playwright. ⚠️ **Not a human playing** — the owner ruled that an agent runs it headlessly, and accepted that weakness before ruling (see the residual-3 qualifier below). |
| **Setup** | Private FFA lobby, `gameID o8EwGt7E`, map **Iceland / Normal**, **1 bot**, `disableNPCs: true`, difficulty **Impossible**, **2 human clients, both idle**, page served from `index.html`, `maxTimerValue: undefined`. The clientless leader was arranged by letting the single bot run away with the map (see the landmass finding in Notes for *why* that setup was needed). |
| **Did the fallback award fire?** | ✅ **YES.** At tick **11448**, non-fallout land **1,098,655**. Worker console on **both** clients independently: `Anon6104 has won the game (0206 fallback award)`. End screens: winner → `You Won!`; other client → `Anon6104 has won!` (`win_modal.other_won`). No console errors, no desync. |
| **Winner's territory share, as a number** | **0.516 %** — `Anon6104`, human, clientID `XN1E75M5`, **5,674** tiles. The clientless leader `Ianfij Kingdom` (Bot, `clientID` `null`) held **881,070** tiles = **80.195 %**. Runner-up `Anon9564` (human, `tNkLCqYr`) held **5,194** tiles = **0.473 %**. |
| **Owner's verdict on sensibility** | ✅ **ACCEPT**, given live in session after viewing the end screen. |
| **Result** | ✅ **PASS** |

**Second instance, the timer branch:** `gameID NmvKyPbw`, Pangaea, `maxTimerValue: 1` — same code
path, award fired, both clients agreed.

**⛔ The owner's reasoning on sensibility — recorded because it IS the substance of the ruling, not a
gloss on it:** the alternative is what production does today — **no winner at all, and the whole
match's XP silently lost.** A visibly odd winner beats a silent loss. This is consistent with
**residual 7**, already recorded as an accepted player-visible change.

##### ⚠️ Deviations from shipped config — these BOUND the result, read them before citing it

🔴 **This run was far from shipped public-FFA config. It supports NO production frequency claim.**

| Setting | This run | Shipped public FFA |
|---|---|---|
| gameType | Private ⚠️ | Public |
| map | Iceland, Normal ⚠️ | playlist maps |
| bots | **1** ⚠️ | 400 |
| disableNPCs | `true` — no Nations ⚠️ | `false` |
| difficulty | Impossible ⚠️ | Medium |
| human clients | 2, both idle ⚠️ | real players |
| page served | `index.html` ⚠️ | `yandex-games_iframe.html` |
| `maxTimerValue` | `undefined` ✅ | `undefined` |

##### ⚠️ The Nation case is UNTESTED — BY DESIGN, on an owner ruling, not by oversight

The gate above says the award must fire for *"a Bot or a Nation."* **Only the Bot case was
demonstrated, twice.** ✅ **Owner ruled 2026-09-03, live in session: Bot-only SATISFIES the gate.**
**Their reasoning, recorded so nobody later reads this as a gap:** the guard's predicate is
`clientID() === null`, which **Bot and Nation satisfy identically** — the code cannot distinguish them
at that point, so exercising one exercises the same branch. ⚠️ **Recorded as untested by design, with
that reasoning. It is not an oversight, and it is not a claim that a Nation was observed.**

##### 📸 Screenshots

`ai-agents/tasks/done/0206-ffa-timer-expiry-award-to-top-client-player/playtest-2026-09-03/`

- `endscreen-threshold-other-won.png` — the view the **losing** player sees, and **the one the owner
  ruled on**
- `endscreen-threshold-you-won.png` — the winner's view
- `endscreen-timer-branch.png` — the timer-branch instance (`NmvKyPbw`)

*(ℹ️ **A driver error, caught and corrected — recorded as such, not as an anomaly.** These three files
were first copied to a stray nested path, `ai-agents/sprints/ai-agents/tasks/done/0206-…/playtest-2026-09-03/`.
**Cause, stated by the ship-loop driver: its shell's working directory had persisted from an earlier
`cd ai-agents/sprints`, so its relative path resolved from there.** The recording producer found the
files missing from the path it was handed, located them, **relocated the folder to the path above and
removed the empty stray `ai-agents/sprints/ai-agents/` tree** — untracked artifacts of the mistake,
nothing of value lost. Recorded rather than silently fixed so the path in this brief is the real one.
**No task file moved between boards; no mover skill was involved.**)*

##### 🔴 What this play-test DISCHARGES — and what it does NOT. Do not overclaim from it

**Newly observed live, beyond anything the unit tests could reach:**

- **Verification step 2's middle leg** — `handleWinner` demonstrably ran **from a real browser
  client**: `received winner vote player,XN1E75M5` → `Winner determined by 1/1 active IPs` →
  `archiving game winner=["player","XN1E75M5"]`. **Residual 1's wording is updated accordingly** — see
  below.
- **Verification step 3** — `reportPlacements()` **observed running**: points 10 (1st) / 5 (2nd),
  ranking correct.
- **Residual 6, partly** — both clients **independently agreed** on the winner. ⚠️ **No tie occurred**,
  so the `smallID` tie-break **itself is still untested**.

**⛔ NOT established by this run — these stand:**

- ⛔ **XP was NOT credited.** `creditMatchXp` is *called* but returns at `credits.length === 0` — no
  authenticated Yandex ids exist locally. **Crediting remains UNPROVEN.** Nothing in this record may be
  read as saying otherwise, and **verification step 2 is therefore still not fully satisfied** — its
  middle leg is now observed, its end (XP actually credited) is not.
- **Residual 3 — DISCHARGED BY AGENT PLAY-TEST**, per the discharge condition above (run **and**
  recorded). ⚠️ **Qualifier carried with the discharge, not dropped: this was a headless agent run, not
  a human playing.** The producer flagged that weakness to the owner **before** they ruled, and the
  owner accepted it.
- **Residual 7 STANDS** — accepted, not resolved. The gate never discharged it.
- **Verification step 4 (tutorial safety) was NOT exercised by this run.** It remains proven by **unit
  test only**.
- **No production frequency claim.** See the deviations table above.
- **Residuals 4, 5, 8 and 9 are untouched by this play-test.**

### 📎 Follow-ups this task spawned

| Task | What it covers | Board |
|---|---|---|
| [`0207`](../../backlog/0207-winmodal-participation-comment-ai-player-correction/brief.md) | `WinModal` doc comment: says AI players are skipped; they are not | Backlog — unscheduled |
| [`0208`](../../backlog/0208-measure-clientless-leader-at-win-condition-in-production/brief.md) | Measure clientless-leader frequency at the win condition, in production | ~~Backlog — unscheduled~~ ✅ **CORRECTED 2026-09-04 — SCHEDULED INTO [Sprint 4](../../../sprints/plan-sprint-4.md)** (owner ruling, live in session); Backlog row kept as `➡️ Moved`. **Struck, not deleted — spent, not wrong.** Status `🔲 Backlog`, **not started**; ~~rank `Medium`, the producer's.~~ 🔴 **RANK CORRECTED 2026-09-04 — the struck rank was WRONG WHEN WRITTEN (same session, by the producer), not spent-and-superseded. It was wrong on the VALUE and on WHOSE CALL IT WAS.** **Rank is `High`.** ⚠️ **The provenance is a SPLIT:** **THAT it was raised = an OWNER RULING** (2026-09-04, live in session); **THAT the value is `High` = the PRODUCER'S judgement** — the owner named no value. ⛔ **Do not collapse this into "the owner ranked it `High`" — they did not.** Authoritative: `0208`'s own *Priority*. ⛔ **Must be DEPLOYED AND COLLECTING DATA before [`0211`](../../backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md) SHIPS.** |
| [`0209`](../../backlog/0209-define-placement-semantics-and-fix-literal-one/brief.md) | Define `placement` semantics in `reportPlacements()` and fix the literal `1` (from review R2) | Backlog — unscheduled |
| [`0210`](../../backlog/0210-singleplayer-platform-leaderboard-reporting-policy/brief.md) | Singleplayer platform-leaderboard reporting policy | Backlog — unscheduled |

✅ **Team-mode team-assignment question — now VERIFIED, no longer a belief.** The Sprint 4 row
previously recorded, as an *unverified* producer belief, that the `0205` team-assignment findings do
not touch this task. **Verified 2026-09-03 at close:** `src/core/game/GameImpl.ts:150-154` —
`addPlayers()` takes an early-`return` FFA branch that adds humans and Nations with **no team
argument**; and `src/core/game/GameImpl.ts:463-466` — `maybeAssignTeam()` returns `null` immediately
when `gameMode !== GameMode.Team`, before the `PlayerType.Bot` and `playerTeams` branches. **No team
is assigned in FFA by either path.**

~~⚠️ **Unchanged by the 2026-09-03 promotion into Sprint 4 — deliberately.** Being scheduled is not
being started: **nobody is building this**, and the owner's ruling says a plan comes first. `🔄 In
progress` would misreport who is doing what. The status changes when a plan is approved and work
actually starts.~~ **Struck 2026-09-03 at close — spent, not wrong:** it was accurate until the plan
was approved and the work was built, both the same day.

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
| **Server-side: `creditMatchXp` never runs** | 🔴 **largest consequence** | No `Win` update ⇒ no `SendWinnerEvent` ⇒ no `winner` message ⇒ `handleWinner` (`src/server/GameServer.ts:1144`, invoked at `:366`) never runs ⇒ `creditMatchXp` (`:1253`, **sole** call site `:1199`) never runs. **The whole match's match-end XP is silently lost, for every player.** ✅ Producer-verified this turn. This is risk 1's original defect, ~~and **the award in this task is what closes it.**~~ 🔴 **THE STRUCK CLAUSE IS DISPROVED BY MEASUREMENT 2026-09-04 — struck, not deleted.** The **loss described in this cell is REAL and STILL LIVE**; what is disproved is that **this task's award closes it.** In the case that actually loses the XP — every clientful player eliminated — `players()` filters to `isAlive()` (`src/core/game/GameImpl.ts:421-423`), so `find` returns `undefined` and the award takes the same early `return` as before `0206`. `creditMatchXp`'s sole call site is still inside `handleWinner` (`src/server/GameServer.ts:1199`, ✅ re-verified this turn against committed `8f6e478`), and `handleWinner` still never runs. **Closing it is [`0211`](../../backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md).** |

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
[`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md) (Teams)** — so that
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
[`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md)** — *"whether the fallback should
apply only on the timer branch rather than every tick"*. ✅ **Both were ruled together, as this brief
recommended**, so FFA and Team do **not** end up with inconsistent policies. **Struck above, not
deleted.**

## The winner predicate — ✅ DECIDED (ADR-110, accepted 2026-09-03)

### ✅ Owner ruling, 2026-09-03, given live in session

> **ADR-110 is ACCEPTED: an AI player (`PlayerType.AiPlayer`, which has a real `clientID`) MAY be
> declared the winner. And it is ONE POLICY ACROSS BOTH MODES — FFA (`0206`) *and* Team mode
> ([`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md)).**

**What this means for the code here:** the predicate behind *"top player **with** a `clientID`"* stays
**`clientID() !== null`**, with **no `PlayerType.AiPlayer` exclusion**. ⛔ **Do not add one** — and do
not read this task's title as implying "human only". It never did; ADR-110 now says so explicitly.

📎 **Cite:** `ai-agents/knowledge-base/decisions/adr-110-ai-player-may-be-declared-winner.md`.
⛔ **Read that ADR before relying on it** — it carries a **pre-committed revisit trigger** (any durable,
player-visible winner surface — leaderboard, match history, announcements feed, share card — forces a
re-examination). The ADR is the authority on its own conditions; this brief only points at it.

⚠️ **The consequence for clientless players, stated explicitly:** **Nations** (`PlayerType.FakeHuman`)
and **Bots** are clientless — `clientID === null` — so this predicate **excludes both**, and ADR-110
does not change that. In FFA that is already the intended shape and **Verification step 5 covers it**
(a match with no clientful player at all still emits no winner). ⚠️ **In Team mode the same exclusion
bites harder** — a private Team lobby can hand a **whole named team** to Nations
(`src/client/HostLobbyModal.ts:42` defaults) — and **the owner deferred that case to `0205`'s plan on
2026-09-03.** ℹ️ **It is `0205`'s question, not this task's**; recorded here only so the shared
predicate is not changed on one side without the other.

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
  [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md), which has its own owner ruling
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
   ⚠️ **STATUS 2026-09-03 after the play-test — PARTLY SATISFIED, NOT SATISFIED.** `handleWinner` was
   **observed running from a real browser client** (`received winner vote player,XN1E75M5` → `Winner
   determined by 1/1 active IPs` → `archiving game winner=["player","XN1E75M5"]`). ⛔ **XP was NOT
   credited:** `creditMatchXp` is *called* but returns at `credits.length === 0` — no authenticated
   Yandex ids exist locally. **Crediting is still UNPROVEN.** See residual 1.
3. **`reportPlacements()` runs again** and the top-3 humans receive placement points.
   ✅ **OBSERVED LIVE 2026-09-03 in the play-test** — points 10 (1st) / 5 (2nd), ranking correct.
4. 🔴 **HARD STEP — REQUIRED BY THE OWNER'S RULING, 2026-09-02. The tutorial does NOT award first place
   for losing.** Explicitly re-check the case described above — a bot crossing 80 % in a tutorial must
   **not** cause `reportPlacements()` to hand the single Human player first-place leaderboard points
   (`src/client/ClientGameRunner.ts:409-412`, `:418-419`; `LeaderboardReporter.reportPlacement` has **no
   game-type guard** and writes to the **real platform leaderboard**,
   `src/client/leaderboard/LeaderboardReporter.ts:44-60`). ⛔ **The ruling widened the scope onto the
   exact branch a tutorial can reach, so this is the specific thing this widening breaks if it is done
   carelessly. This step gates shipping — do not report it satisfied by reasoning alone.**
   ⚠️ **NOT exercised by the 2026-09-03 play-test** — that run was a private FFA lobby, never a
   tutorial. This step remains proven by **unit test only**; the play-test adds nothing to it.
5. **A match with no clientful player at all still emits no winner** — the award must not manufacture
   one out of nothing.
   - **5b — an AI player CAN be the awarded winner.** Per **ADR-110** (accepted 2026-09-03, one policy
     across FFA and Team): a `PlayerType.AiPlayer` has a real `clientID`, so it **qualifies** and must
     not be filtered out. Assert there is **no `PlayerType.AiPlayer` exclusion** in the predicate.
     **Added 2026-09-03.** *(Numbered `5b` rather than renumbered, so the references to "step 4" and
     "step 8" elsewhere in this brief stay correct.)*
6. **Human wins are unchanged** — the ordinary FFA win path does not regress.
7. **Team mode is untouched** — `checkWinnerTeam()` byte-identical.
8. `npm test` green, `npm run lint` clean.
   ⚠️ If a `supertest` suite fails, check CLAUDE.md's known-flake signature before treating it as a
   regression, **rule out `0197`'s `SIGSEGV` first**, and say that you re-ran.

## Notes

- 🔴 **REVERTED 2026-09-04 — THE BEHAVIOUR IS NOT IN THE GAME AND WAS NEVER DEPLOYED.** Owner ruling
  given live in session. Everything below in these Notes was written **before** that ruling and
  describes the task **as built**; it is left standing as the record of what was built and why.
  ⚠️ **Nothing in these Notes may be read as describing live game behaviour.** The correction, the two
  measured findings, and the precise wording of what is and is not true are in the **STOP box at the
  top of this file** — read that first. Replacement:
  [`0211`](../../backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md).
  ⚠️ **One Notes entry that survives the revert intact and is still worth reading:** the **BOT
  TERRITORY CEILING** finding below is an observation about `BotExecution.ts`, **not** about this
  task's code. `0206`'s revert does not touch it, and its evidence-grade warning (latch verified,
  flood-fill figures merely quoted) still applies to `0208`.
- **Depends on:** [`0022`](../../done/0022-win-check-multiplayer-regression-investigation/brief.md) — this task
  modifies the guard `0022` introduces, so `0022` must ship first. Sequencing, not a decision gate.
- **Origin:** `0022` owner ruling **R2** (option (b) declined, follow-up recorded) + `0022` review
  finding **R1** (owner-accepted as a residual, 2026-09-02). Both carried above.
- **Sibling:** [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md) — the Team-mode
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
- **Row appended, not inserted** on `backlog.md` (ADR-035) at filing — and again on
  [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md) at the 2026-09-03 promotion, for the same
  reason: appending avoids a mid-board insertion above that board's closed rows. The `backlog.md` row
  was **edited in place to `➡️ Moved`, not deleted and not re-ordered**.
- No threshold or fallout tuning here (`percentageTilesOwnedToWin()` etc.) — separate balance concern,
  same exclusion `0022` carries.
- **ADR-110 accepted 2026-09-03** (owner ruling given live in session) —
  `ai-agents/knowledge-base/decisions/adr-110-ai-player-may-be-declared-winner.md`. **Cited here, not
  authored or edited by this brief.** It is **one policy across FFA and Team**, so `0205` records the
  identical ruling; **do not change the predicate on one side alone.** The ADR carries a pre-committed
  revisit trigger — read it there rather than trusting this summary.
- 🚩 **BOT TERRITORY CEILING — a structural finding from the 2026-09-03 play-test. It bears directly on
  [`0208`](../../backlog/0208-measure-clientless-leader-at-win-condition-in-production/brief.md) and on
  [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md).** Three earlier
  play-test attempts **failed to reach 80 %**, and the reason is structural, not bad luck:
  `src/core/execution/BotExecution.ts` — `neighborsTerraNullius` is initialised `true` (`:10`) and set
  `false` (`:89`) the first time the bot no longer borders terra nullius, and is **never reset**. It is a
  **one-way latch** (block at `:84-89`). ⚠️ *(The finding was first reported as `:88-93`; the accurate
  range, re-read at recording time, is `:10` + `:84-89`.)* Bots also never use boats, so **a bot's
  ceiling is its own connected landmass.** The coder flood-filled every `map.bin`: **Pangaea is only
  67.69 % one landmass** (the bot froze at 66.28 %); **Iceland is 99.97 %**, which is why the Iceland run
  worked. A 3-bot run froze at **45.50 % for 7,000+ ticks** — bots do not take territory from each other.
  ⚠️ **EVIDENCE GRADE — read this before leaning on the numbers. The two halves are NOT equally
  established.** The **latch is VERIFIED** — the producer read `BotExecution.ts` directly (`:10`, `:89`)
  at recording time. The **flood-fill figures (67.69 % · 99.97 % · 66.28 % · 45.50 %) are QUOTED from
  the play-test run and were NOT independently re-measured.** ⛔ This matters more than it looks: those
  figures are the whole basis of the *"may not be readily reachable in production"* observation below,
  which `0208` will lean on — **a quoted figure carried as a measured one is exactly how a soft claim
  hardens.** `0208` should re-measure them, not inherit them.
  ⇒ **A clientless leader reaching 80 % in a real public FFA (400 bots, Nations enabled, playlist maps)
  may not be readily reachable.** ⛔ **This is SUGGESTIVE, NOT a production measurement, and it is NOT a
  frequency claim** — it is exactly the question `0208` exists to answer, and `0208` should treat it as a
  hypothesis to test, not an input to trust. *(ℹ️ `0208` and `0205` are **not** edited to point back
  here: both briefs already reference `0206` throughout, so a reader lands on this Notes entry by
  following links they already have. No cross-reference line was needed, so none was added.)*
- 🚩 **A misleading comment on this exact predicate was filed as `0207`**
  ([`0207-winmodal-participation-comment-ai-player-correction`](../../backlog/0207-winmodal-participation-comment-ai-player-correction/brief.md))
  — `src/client/graphics/layers/WinModal.ts:487-492` says `buildPlayerParticipation` skips AI players;
  it does **not** (the skip is on `clientID === null`, `:498-499`). Comment-only, no behaviour change,
  but **it is a live trap for whoever plans this task** — read `0207` before trusting that comment.
