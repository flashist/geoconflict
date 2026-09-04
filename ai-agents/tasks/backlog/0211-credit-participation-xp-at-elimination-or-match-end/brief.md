# Credit participation XP at elimination OR at match end, whichever comes first — without double-crediting

> # 📌 SCOPE WIDENED 2026-09-04 — TWO OWNER RULINGS, GIVEN LIVE IN SESSION. READ BEFORE PLANNING.
>
> ⚠️ **The title above is now NARROWER than the ruled scope.** It is kept unchanged **on purpose** —
> the folder name is the task's identity and six other files already link to it. **This box is the
> scope; the title is a label.**
>
> ## 🔴 Ruling 1 — cover SURVIVORS too, not just eliminated players
>
> **`0211`'s job is to CLOSE THE XP LOSS — not to close its eliminated-player half.**
>
> The producer flagged this as the biggest unruled question on the board, and the architect's report
> (§7) sharpened it: crediting at elimination covers players who **die**, and leaves **survivors of a
> match that never ends** with **no trigger at all.** As originally scoped, this task closed half the
> loss.
>
> **The owner's reasoning, as put and accepted:**
> > *"half a fix leaves you rediscovering this in three months."*
>
> **The requirement:** a player who survives to the end of a match that **never reaches a normal
> match end** must still be credited. ⛔ **`GameServer.end()` is NOT that trigger** — the architect
> verified it would credit **zero** in every match that ends the normal way: `phase()` requires
> `noActive`, and `selectMatchCredits` excludes anyone absent from `activeClients`. **The survivor
> case needs a trigger of its own.**
>
> ⛔ **THIS RULING STATES A REQUIREMENT, NOT A MECHANISM. The trigger is the PLAN'S to choose**, with
> the architect's report as its input. **Nothing here prescribes one, and no shape below should be
> read as one.**
>
> ### ⚠️ The third option the owner considered and did NOT pick — and the distinction is fiddly, so read it twice
>
> A third option was on the table: **fix the stall itself, so survivors reach a normal match end and
> are credited through the existing path.** The owner **considered it and chose to widen `0211`
> instead.**
>
> **What that does and does not mean — these are different and both matter:**
>
> - ✅ **It was CONSIDERED.** ⛔ **A planner must NOT present "just fix the stall" as a fresh,
>   unexplored idea.** It was raised, weighed, and passed over **as the scope decision** — the owner
>   declined to replace this task with a stall fix.
> - ⛔ **It is NOT FORBIDDEN.** The owner ruled on **what must be true** (survivors get credited), not
>   on **how.** ⇒ **If the plan concludes that the cleanest way to give survivors a trigger is to make
>   the match actually end, that mechanism is fully available and satisfies this ruling.** It may
>   legitimately resurface as the chosen design.
> - ⇒ **Settled: the REQUIREMENT. Open: the MECHANISM.** Do not collapse those two.
>
> ## Ruling 2 — `0211` covers TEAM MODE as well as FFA
>
> 🔴 **`checkWinnerTeam()` has the SAME guard shape as `checkWinnerFFA()`** — a bot-team-led
> multiplayer match stalls and loses its XP **identically.** Found **independently by the coder doing
> the `0206` revert**; ⚠️ **nobody had connected it before**, and it had gone unnoticed across `0022`,
> `0206` and `0205`.
>
> **The owner ruled this task covers both modes.** Reasoning as put and accepted: **the fix lives in
> the CREDITING path, not the win check**, so covering both is **likely near-free** — and it stops
> [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md) being **solved twice or
> forgotten.**
>
> ⛔ **THIS DOES NOT MERGE `0211` AND `0205`. They stay separate tasks with separate questions:**
>
> | | Question it answers |
> |---|---|
> | **`0205`** | **Resolution policy** — *who should win a stalled Team match?* |
> | **`0211`** | **Crediting** — *do the players in that match get their XP?* |
>
> ⚠️ **`0211` may make part of `0205`'s justification moot** — if the XP is credited regardless of who
> wins, one of `0205`'s reasons to exist weakens. ⛔ **It does NOT settle `0205`'s own question**, and
> `0205`'s **status, scope and rank are UNCHANGED — the owner has not ruled on them.**
>
> ## ~~⚠️ Singleplayer is NOT ruled — still open~~ → ✅ RULED: Singleplayer is OUT of scope
>
> ~~Whether Singleplayer should credit participation XP at all is **unruled** and is **not** covered by
> either ruling above.~~ ✅ **RULED 2026-09-04, owner, live in session — struck, not deleted.**
>
> > **`0211` covers FFA and Team mode. Singleplayer is OUT of this task's scope.**
>
> **Owner's reasoning:** Singleplayer XP is a **separate product question**, and bundling it risks
> exactly the confusion flagged below — ⚠️ **[`0210`](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md)'s
> ruling was about platform LEADERBOARD POINTS, not profile XP, and the two must not be read across.**
> **That warning is kept because it is the reason this ruling was needed.**
>
> 🔴 **RECORD THIS AS A DECISION, NOT A GAP — and read the next line before restating it anywhere.**
>
> ~~⛔ **This is NOT a ruling that "Singleplayer awards no XP."** The owner was offered that stronger
> option **and declined it.** ⇒ **What is settled: `0211` does not cover Singleplayer.** **What
> remains open: whether Singleplayer should credit participation XP at all** — a live question for
> someone to ask later, **not** something this ruling answered.~~
>
> ### ✅ SUPERSEDED — Singleplayer awards no XP. Owner ruling, 2026-09-04, given live in session.
>
> ⚠️ **The struck paragraph above is SPENT, NOT WRONG.** It was accurate when written: earlier the same
> day the owner *was* offered the stronger option and *did* decline it, and this brief recorded that
> honestly. **Later that day they ruled it.** ⛔ **Do not rewrite the history into "they ruled it the
> first time" — the strike is the record that the question stayed open for a while and then closed.**
>
> > **Owner, 2026-09-04:** *"Solo matches shouldn't contribute to the leaderboard. Neither should they
> > contribute to the XP."*
>
> ⇒ **The open question this brief carried is now CLOSED. Singleplayer credits no participation XP,
> ever.** ⛔ **It is still OUT of `0211`'s scope** — the earlier scope ruling is unchanged, and this
> ruling does **not** widen the task. What changed is the *policy*, not the *scope*.
>
> #### 🔴 What this ruling actually changes — read this before planning, it is the load-bearing part
>
> **It changes NOTHING about today's behaviour. It converts an ACCIDENTAL property into a DELIBERATE
> one.** Singleplayer already credits zero XP, but **only as a side-effect of architecture** —
> ✅ producer-verified this turn against the working tree:
>
> - `creditMatchXp` exists **only** on the game server, `src/server/GameServer.ts:1253` (plus the
>   profile-server implementation it calls). Singleplayer never reaches it.
> - Singleplayer runs against `src/client/LocalServer.ts`. Grepping that whole 362-line file for
>   `credit|ProfileApi|xp` returns **nothing** — the only hit is the class name `LocalServer`.
> - `src/client/Transport.ts` sets `isLocal` at `:198` for **Singleplayer *and* archived-game replay**,
>   and `sendMsg` (`:691-694`) hands every client message to `this.localServer.onMessage(msg)` and
>   `return`s — the WebSocket is never touched.
> - ⚠️ **CORRECTION to a plausible-sounding but wrong reading:** the winner message is **not**
>   suppressed in solo. `onSendWinnerEvent` (`:589`) is `if (this.isLocal || socket open)` — `isLocal`
>   **enables** the send. `LocalServer` receives it and stores it (`:226-228`) for the game record.
>   **The single reason no XP is credited is that `LocalServer` has no crediting code**, not that the
>   message is dropped. Anyone reasoning about this must reason about **that one seam**, not a guard.
> - ⛔ **There is NO guard, NO test, and NO comment anywhere stating this as intent.** ✅ Re-verified
>   2026-09-04, and stated precisely — ⚠️ **an earlier revision of this brief said `GameServer.ts`
>   contains "zero occurrences of `GameType`/`gameType`/`Singleplayer`". THAT WAS WRONG; the producer
>   caught and corrected it.** The accurate facts:
>   - `src/server/GameServer.ts` has **six** `GameType` occurrences (`:7` import, then `:113`, `:194`,
>     `:877`, `:895`, `:933`) — **all of them `GameType.Public` checks**, and **all of them above the
>     crediting path.**
>   - ⇒ **The precise claim is narrower and is the one that matters: the CREDITING PATH has no
>     game-type check.** `creditMatchXp` (called `:1199`, defined `:1253`) branches on game type
>     nowhere, and `src/core/profile/MatchQualification.ts` has **zero** `GameType`/`gameType`/
>     `Singleplayer` occurrences — `selectMatchCredits` takes no game-type parameter.
>   - ⚠️ **Why the correction matters rather than being pedantry:** `this.gameConfig.gameType` is
>     **already in scope** in `GameServer`, so a game-type guard there would be **one line, not new
>     plumbing.** ⛔ **Do not use that to argue for a guard — see the Notes, where the opposite
>     conclusion is reached and it is reached *because* of this fact.**
>
> 🔴 **THE FORWARD RISK, AND IT IS THIS TASK'S:** `0211` is **precisely the task that relocates the
> crediting seam** — from "server sees a winner message" to "elimination or match end, whichever comes
> first." A trigger placed client-side, or one that moves crediting anywhere `LocalServer` can reach,
> would **start** crediting Singleplayer silently and nothing in the codebase would object.
> ⛔ **A `0211` plan MUST NOT introduce Singleplayer crediting.** ⚠️ **The property it must preserve is
> unenforced today, so "the tests are green" does not prove it was preserved.** See the *unenforced*
> note in **Notes** for the producer's recommendation on that — ⛔ **which is a recommendation to the
> owner, NOT part of this task's scope.**
>
> ## ✅ Ruling 3 — the XP amount stays 10 flat. Decision DEFERRED, not made.
>
> **Owner's reasoning: do not change two things at once.** Ship the crediting fix with the **existing
> amount**, see the data, then tune.
>
> 🔴 **This is a DELIBERATE HOLD, NOT AN OVERSIGHT.** ⚠️ **The architect's point stands and must stay
> recorded:** moving the trigger earlier **changes what the number means** — under this task, a player
> who dies **30 seconds in** is paid **the same** as one who plays to the end. **The owner knows this
> and chose to ship first and tune after data.** ⛔ **Do not "fix" the flat 10 inside this task, and do
> not let a plan quietly introduce scaling.**
>
> ## 🔴 Ruling 4 — crediting at elimination DELIBERATELY REVERSES THE LEAVER RULE. This is intended.
>
> ⛔ **READ THIS BEFORE TOUCHING `qualifiesForMatchXp`. A future reader must not "fix" this task back
> into the old rule.**
>
> **The rule TODAY** — `src/core/profile/MatchQualification.ts`, ✅ producer-verified this turn against
> committed `8f6e478` (`qualifiesForMatchXp` at `:43-45`, its doc comment at `:35-42`):
>
> ```
> return p.hasSpawned && (p.isAliveAtEnd || p.killedAt !== undefined);
> ```
>
> A player who **spawned but then vanished without dying** (left / abandoned, no `killedAt`)
> **does NOT qualify.** The doc comment says so explicitly: it is *"the participation-derived half of
> the brief's exclusion of players who voluntarily left mid-game."* ⚠️ **The exclusion of vanishers is
> DELIBERATE EXISTING BEHAVIOUR, not an accident.**
>
> **THE REVERSAL:** under `0211`, a player who is **eliminated** and then **closes the tab before the
> match ends** is **paid at the moment of death** — where today they get **nothing.**
>
> ✅ **The architect asked whether this was intended. THE OWNER RULED THAT IT IS.** Their reasoning:
> **they played the match, they earned the XP, and punishing them for closing a tab after they were
> already dead serves nothing.** The architect's read was that **this is the most valuable part of the
> change**, and the owner agreed.
>
> ⇒ 🔴 **This is a KNOWING REVERSAL of existing behaviour, ruled by the owner — NOT an oversight in
> the new design.** ⚠️ **It narrows, but does not delete, the leaver exclusion:** a player who
> **vanishes without ever being eliminated** is a different case, and **this ruling does not say
> anything about them.**
>
> ## ⚠️ What these rulings did NOT change
>
> - ~~**Scheduling** — still **unruled**; this task stays **unscheduled**.~~ ✅ **RULED 2026-09-04 —
>   SCHEDULED INTO SPRINT 4.** See *Sprint*. **Struck, not deleted.**
> - **Rank** — still **Medium–High, the producer's**, deliberately **held** across the widening **and
>   again across the scheduling**; ⛔ **the owner explicitly declined the "re-rank first" option.** See
>   *Priority*.
> - **The architect's report is still the design input** and is still not duplicated here.

## ID
0211

> ℹ️ **ID allocation, checked 2026-09-04 before filing. `0211` is free.** The **four checks** run —
> the same set used for `0207`–`0210`, including the `grep` over `.claude/` that catches the invisible
> `0204` reservation:
>
> 1. **`grep -rn "0211" .claude/ ai-agents/` → ZERO HITS.** Nothing anywhere refers to this ID.
> 2. **Task folders** — `ai-agents/tasks/{backlog,done,cancelled}/`: highest ID in use is **`0210`**.
> 3. **All boards** — [`backlog.md`](../../../sprints/backlog.md),
>    [`sprint-backlog.md`](../../../sprints/sprint-backlog.md),
>    [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md) / `-5` / `-6`: highest ID on any board is
>    **`0210`**.
> 4. 🔴 **The `.claude/` prose sweep — the one that catches IDs reserved with no brief.**
>    `grep -rnoE '\b0(20|21)[0-9]\b' .claude/` returns exactly **two** hits, both in
>    `.claude/skills/fkit-sprint-ship-loop/SKILL.md`: **`0202`** (`:233`) and **`0204`** (`:194`).
>    ⛔ **`0204` remains reserved and must not be allocated to anything else** — it belongs to the
>    plan-carry-check hook task, which exists only as prose in that skill file and was never filed as a
>    brief. **`0211` is not among those hits.**
>
> ⇒ **Max in use anywhere is `0210`; `0211` is the next free ID.**

## Sprint
**Sprint 4 — SCHEDULED.** Tracked on [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md).

~~**Backlog — UNSCHEDULED.** Filed on [`backlog.md`](../../../sprints/backlog.md), **not** on any
sprint plan.~~

~~⛔ **Board chosen honestly: the owner has NOT ruled on scheduling.** They ruled that this task be
**filed**; they said nothing about when it is worked. Putting it on `plan-sprint-4.md` would assert a
sprint commitment nobody made. **Same reason `0205` and `0207`–`0210` are on this board.**~~

➡️ **SCHEDULED INTO SPRINT 4 — owner ruling given live in session, 2026-09-04. Struck, not deleted.**
The struck text is **spent, not wrong**: it was accurate for exactly as long as no ruling scheduled
this task, and a ruling now has.

⚠️ **The owner did NOT take the producer's "leave it unscheduled" recommendation.** Their reasoning,
as put and accepted: **the XP loss is measured and live, and the design assessment is already done, so
it can start immediately.**

⚠️ **Scheduled is NOT started.** The status stays `🔲 Backlog` — **nobody is building this.**
`🔄 In progress` would misreport who is doing what. The status changes when a plan is approved and
work actually starts.

⚠️ **THEY RULED SCHEDULING ONLY.** They did **not** rule on the rank — see *Priority*, where the
producer's `Medium–High` is **held unchanged**. Technical scope is untouched by this ruling *(the
scope was widened earlier the same day by two separate rulings — see the box at the top)*.

Its row on [`backlog.md`](../../../sprints/backlog.md) is kept as `➡️ Moved`, **not deleted**, so the
trail from "filed here" to "tracked there" survives — the same treatment `0206` and `0200` got. The
Sprint 4 row was **appended, not inserted** (ADR-035).

## Priority
**Medium–High — THE PRODUCER'S RANK, NOT AN OWNER RULING.**

⚠️ **Say this out loud whenever the rank is cited: I ranked it, the owner did not.** This board is
unranked (its Priority column reads `—` for every row), so the rank lives here.

✅ **RE-CHECKED 2026-09-04 AT THE SCOPE WIDENING, AND HELD AT `Medium–High`.** ⚠️ **The two rulings
widened the scope; neither ranked it, and neither is a re-rank.** Why it held:

- **Coverage and urgency are different axes, and only coverage moved.** Ruling 1 (survivors) and
  Ruling 2 (Team mode) make the task **more complete**, not more urgent. The same defect is being
  closed, in more of the places it occurs.
- **The owner's own reasoning on Ruling 2 argues against a raise**: the fix lives in the **crediting
  path**, so covering Team mode is **likely near-free**. A near-free widening is not a cost signal.
- ⚠️ **Ruling 1 DOES add real work** — the survivor case needs a trigger that does not exist today —
  **but production frequency is still UNMEASURED**, which is what has capped this rank from the start.
- ⚠️ **If this rank is ever raised or lowered, that is a producer call unless an owner ruling says
  otherwise. Neither 2026-09-04 ruling is one.**

✅ **RE-CHECKED AGAIN 2026-09-04 AT SCHEDULING, AND HELD AT `Medium–High`. This is the third hold
today and the reason is the same each time.** ⛔ **The owner ruled SCHEDULING ONLY, and explicitly
DECLINED the *"re-rank first, then schedule"* option they were offered.** ⚠️ **Do not read the Sprint 4
row as a re-rank.** Scheduling and importance are **different axes**, and only the first one moved:
the owner ruled *when this is worked*, not *how much it matters*. ⚠️ **Production frequency is still
UNMEASURED** — that is what has capped this rank from the start, and it is unchanged.
📌 **`plan-sprint-4.md`'s Priority column reads `—` for every row**, so the rank lives here either way.

✅ **HELD AGAIN 2026-09-04 UNDER RULING 7 (the `0208`-before-`0211` sequencing) — and this hold is the
one most likely to be misread.** ⛔ **The owner did NOT rule on this task's rank, and Ruling 7 does not
make it less important — it makes it LATER.** ⚠️ **[`0208`](../0208-measure-clientless-leader-at-win-condition-in-production/brief.md)
was raised to `High` on the same day while this holds at `Medium–High`; that gap is SEQUENCE, not
importance.** `0208` outranks this task because **its answer is destroyed by delay and this task's is
not** — the XP loss this closes is the same loss whether it ships this week or next, whereas the number
`0208` takes can never be taken again. **Do not "correct" this rank upward to match, and do not read
the ordering as a demotion.**

**Why higher than the `Medium` its predecessor [`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md) carried:**

- 🔴 **The loss is no longer a structural argument — it has been OBSERVED.** `0206` was ranked `Medium`
  in explicit part because *"no production observation and no player report exist."* That is no longer
  the state of the evidence: on **2026-09-04** a live investigation watched a match to termination and
  recorded **no winner, no `handleWinner`, no `creditMatchXp`, `archiveGame` with no `winner` attribute
  and no player stats.** The XP loss is **confirmed, not inferred.**
- **It is the main game mode**, and the loss is **whole-match and silent** — every player in the match,
  no error, no log, nothing a player could report.
- **Nothing else fixes it.** `0206` was the previous candidate and it was **reverted**; the loss it was
  scheduled to close is still open.

**Why NOT higher than `Medium–High`:**

- ⚠️ **Production FREQUENCY is still UNMEASURED.** One observed match is not a rate.
  [`0208`](../0208-measure-clientless-leader-at-win-condition-in-production/brief.md) is the task that
  would answer it and is itself unscheduled. **Do not present this as a widespread field incident.**
- ⚠️ **The design is genuinely unresolved** (see *The central design problem*), and an architect
  assessment had **not landed** when this brief was written. A brief whose approach is open should not
  jump a queue on the strength of its motivation alone.
- **The player-visible harm is soft.** Players lose XP they never saw awarded; nobody has reported it.
  The cost is to the citizenship/XP economy's integrity, not to a visible feature.
- ⚠️ **`0206`'s history is a direct argument for caution here.** That task was scheduled on a premise
  that a measurement later disproved. **This brief is investigation-first for exactly that reason.**

## Status
🔲 Backlog

⚠️ **SCHEDULED INTO SPRINT 4 on 2026-09-04 (owner ruling, live in session) — and the status is
DELIBERATELY still `🔲 Backlog`.** **Scheduled is not started: nobody is building this.** The owner
ruled *when this is worked*, not that it has begun. The status changes when a plan is approved and
work actually starts.

### 🔴 SEQUENCING CONSTRAINT INSIDE SPRINT 4 — OWNER RULING, 2026-09-04. READ BEFORE SHIPPING.

> ⛔ **THIS TASK MUST NOT SHIP before
> [`0208`](../0208-measure-clientless-leader-at-win-condition-in-production/brief.md) has been
> DEPLOYED and has GATHERED DATA.**

⚠️ **"Before" has a precise meaning, and a loose reading satisfies it trivially — read this table, not
just the line above:**

| | |
|---|---|
| ✅ **What satisfies the constraint** | `0208` **deployed AND collecting data.** |
| ⛔ **What does NOT satisfy it** | `0208` merely **merged**, or merely **built**. A merged metric measures nothing. |
| ✅ **Explicitly ALLOWED — do not over-apply this** | **Planning and building THIS task in parallel is FINE.** |
| ⛔ **What is ordered** | **The SHIP. Only the ship.** |

⛔ **A blanket "don't start `0211`" would be STRICTER THAN THE OWNER RULED. Do not impose it, and do
not let this constraint stall the plan.**

**The consequence, stated plainly because it is the whole reason for the ruling:** shipping this task
first **PERMANENTLY DESTROYS `0208`'s Part A pre-fix denominator.** ⚠️ **You cannot measure how often
matches stalled uncredited once they stop stalling uncredited** — and this task is precisely what
stops them stalling uncredited. There is no later opportunity and no proxy.

**Owner's reasoning, as put and accepted:** **measure before you fix.** `0208`'s numbers feed three
decisions — **ADR-110's re-raise trigger**, **whether stalled-match survivors are a real population**
*(which scopes THIS task)*, and **`0205`'s rank** — and they become **unrecoverable** the moment this
ships. `0208` is instrumentation, so it should be the quicker of the two.

⚠️ **This does NOT make this task `🚧 Blocked`, and its status stays `🔲 Backlog`.** Nothing gates
planning or building it. ⛔ **Do not flip the status on account of this constraint.**

⚠️ **`0208` was raised to `High` on 2026-09-04 while this task holds at `Medium–High`. That is
SEQUENCE, not a judgement that this matters less** — see *Priority*.

**Nothing gates it. Nobody is building it.**

✅ **THE ARCHITECT'S ASSESSMENT HAS LANDED — READ IT BEFORE PLANNING.**

📎 `ai-agents/knowledge-base/reports/2026-09-04-elimination-time-xp-crediting-design-assessment.md`

⛔ **This brief deliberately contains NO design and does NOT duplicate or pre-empt the report.** The
report is the technical picture; **read it there.** ⚠️ **It landed while this brief was being written**
— it was **not** available when the sections below were drafted, and **two of its findings corrected
assumptions this brief had made.** Both corrections are recorded in place below, marked
`🔴 CORRECTED BY THE ARCHITECT'S REPORT`. **Nothing else in this brief has been reconciled against the
report** — ⚠️ **assume the report is more current than this brief wherever the two differ, and say so
in the plan.**

📌 **Its headline: feasible, and cheaper than it looks.** ⛔ **That is a pointer, not a summary — the
reasoning, options, recommendation, cost and risks are all in the report and are the architect's, not
this brief's.**

⚠️ **The report carries its own open questions for the owner (its §11).** They are **not** answered
here and are **not** duplicated into this brief's *Open questions*. **Both lists need the owner.**

## Owner
fkit-coder — **after** the architect's report (✅ landed, cited above) has been **read**, and after the
owner has reviewed the phase-1 findings and answered the open questions in **both** this brief and the
report's §11.

---

## Context

### Where this came from

**Origin: the revert of [`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md),
2026-09-04, on an owner ruling given live in session.**

`0206` was built, reviewed, closed and gate-passed as the fix for a live production defect: match-end
XP silently lost when a clientless leader (Bot or Nation) crosses the 80 % territory threshold. A live
investigation then measured that justification and found it wrong, and the owner ruled the code
reverted.

⚠️ **State the history precisely — three claims, only the first is true:**

| Claim | Verdict |
|---|---|
| `0206` did what its approved plan specified, and the plan's **premise** was wrong | ✅ **TRUE** |
| "`0206` was buggy" | ⛔ **NOT TRUE** — correctly built, two-reviewer stateful review, Codex returned *"No findings."*, play-test gate **passed** |
| "`0206` caused the stall" | ⛔ **NOT TRUE** — the stall **predates** it (`0022`) and **survives the revert unchanged** |

🔴 **`0206`'s behaviour is NOT in the game. It was reverted before it ever reached a player and was
NEVER DEPLOYED.** Its status is still `✅ Done` and its folder is still in `tasks/done/` —
**correctly, because the *work* was done.** The *effect* was reverted, which is a different fact.
📎 The full record is the **STOP box at the top of `0206`'s brief**.

### 🔴 The defect this task exists to close — MEASURED, not reasoned

**Every finding below was OBSERVED on 2026-09-04** in a single-human private FFA, the human eliminated
by a Nation, watched through to termination. ⚠️ **Carried into this brief as verified context, not as
assumptions** — but ⛔ **not independently re-measured by the producer**; the code-level facts marked
✅ below were re-verified, the *observations* were not re-run.

1. **Elimination shows the player only a defeat modal — «Вы погибли» — with exit/spectate.**
   **No match-end screen, no winner, no stats.**
2. 🔴 **The server logged NOTHING at elimination.** Elimination is computed **client-side**; the server
   is a **turn relay** and never learns that a player died. **This is the central design problem — see
   below.**
3. **At match end:** `private game complete` → `ending game with 11203 turns` → `archiving game`.
   **No `handleWinner`, no winner vote, no `creditMatchXp`.** `archiveGame` ran with **no `winner`
   attribute and no player stats.**
4. **Participation XP is genuinely LOST, not delayed.** `creditMatchXp`'s **only** call site is inside
   `handleWinner` (`src/server/GameServer.ts:1199`). No `handleWinner` ⇒ no crediting, ever.
5. **The stall is real and independent of `0206`.** With every human eliminated, a **Nation reached
   100.0 % of the map and the match still did not end.** Mechanism, ✅ **producer-verified this turn
   against committed `8f6e478`**: `players()` filters to `isAlive()`
   (`src/core/game/GameImpl.ts:421-423`), so dead players are absent from the sorted list, `find`
   returns `undefined`, and the code takes an early `return`. **This predates `0206` (`0022`) and
   survives the revert.**

### 🔴 Added 2026-09-04 — TEAM MODE HAS THE SAME DEFECT, and nobody had connected it

**`checkWinnerTeam()` carries the SAME guard shape as `checkWinnerFFA()`.** A **bot-team-led
multiplayer match stalls and loses its XP identically.**

⚠️ **Provenance, stated honestly:** found **independently by the `fkit-coder` performing the `0206`
revert**, and **relayed to this brief** — ⛔ **the producer did NOT independently re-read
`checkWinnerTeam()` to confirm the guard shape**, because the file is being edited in `src/` right
now. **Treat the "same guard shape" claim as reported-not-re-verified, and confirm it at plan time by
symbol.**

📌 **This had gone unnoticed across `0022`, `0206` and `0205`.** `0206`'s own close recorded
`checkWinnerTeam()` as **byte-identical and therefore untouched** — which was **true and was the right
call for that task's scope**, and is exactly why the shared *defect* was never surfaced: "untouched"
was read as "not affected."

✅ **Owner ruled 2026-09-04: this task covers BOTH modes.** See the scope box at the top.

### 🔴 The two halves of the loss — BOTH are in scope since 2026-09-04

| Who | Do they have a trigger today? |
|---|---|
| **Players who are ELIMINATED** | ⛔ No. The server never learns they died. |
| **Players who SURVIVE a match that never ends** | ⛔ No. No winner ⇒ no `handleWinner` ⇒ no `creditMatchXp`. |

⚠️ **Crediting at elimination closes only the first row.** The architect's §7 is explicit that
survivors are left with **no trigger at all**. **Ruling 1 puts the second row in scope**; the
**mechanism for it is the plan's to choose.**

### 🔴 The central design problem — read this before proposing anything

> **The server does not know when a player is eliminated.**

This is **not a detail to route around** — it is the substance of the task. The server is a **turn
relay and never a simulator** (project architecture rule); the simulation runs on clients. "Credit at
elimination" therefore requires the server to learn a fact it currently has **no channel for**.

⚠️ **Two consequences that any approach must answer, not assume away:**

- **Where does the elimination fact come from?** A client message is the obvious channel and is also
  the problem — see *Trust* below.
- **Which termination paths must be covered?** `GameServer.end()` runs on **every** termination —
  winner, no-active-clients, and the `maxGameDuration` cap. ✅ **Producer-verified this turn** against
  committed `8f6e478`: `end()` archives via `archiveGame()` when clients joined and no winner is set.
  ~~**It is a candidate seam for the "match end" half; it is not a recommendation.**~~
  🔴 **CORRECTED BY THE ARCHITECT'S REPORT (§3) — the struck suggestion is WRONG and is struck, not
  deleted, so the mistake stays visible.** ⛔ **`end()` is the WRONG seam: crediting hooked there would
  award ZERO credits in every match that ends the normal way** — it *"would look implemented and do
  nothing."* The reasoning is **structural, not a preference**, and it is the architect's — **read §3;
  it is not reproduced here.** ⚠️ **The producer's verification above was not false — `end()` does run
  on every termination — it was simply not the fact that decides the question.** ⇒ **Do not plan
  around `end()`.**

### 🔴 Trust is a FIRST-CLASS CONCERN, not a hardening pass

**An elimination reported by a client is a CLAIM, not a fact.** Crediting XP on an unverified client
claim is a **farming surface**: a client that can assert "I was eliminated" can assert it repeatedly.

- **Existing precedent for this exact seam:** `GameServer.getCreditableYandexId()` — the single funnel
  through which identity trust is handled today (raw id now, signed-payload verification later;
  signed is **blocked on the IAP secret key**, per the Payments work). 📎 See
  `ai-agents/knowledge-base/decisions/adr-103-identity-trust-seam-client-asserted-yandex-id.md`.
- ⛔ **Do not treat trust as a follow-up.** Whatever shape this takes, the plan must say **what is
  asserted by a client, what the server can independently corroborate, and what the worst case costs.**

### ⚠️ Double-crediting — MAY already be solved, and this is UNVERIFIED

`ProfileApiClient`'s **contract comment** states that the profile server keys on
**`(game_id, yandex_player_id)`**, which would make a duplicate credit a **no-op**:

> `src/server/ProfileApiClient.ts:32` — *"`(game_id, yandex_player_id)` idempotency key makes retries
> safe (a duplicate is …)"*

~~🔴 **MARKED UNVERIFIED — do not build on it as stated.**~~ ✅ What the producer verified: **that
the contract comment exists and says this.** ⛔ What the producer did **NOT** verify: **that the actual
profile-server schema enforces it.** A doc comment is a claim about a database, not the database.

🔴 **CORRECTED BY THE ARCHITECT'S REPORT (§4) — NOW VERIFIED. The unverified flag above is struck, not
deleted, because it was the honest state when written.** ✅ **The architect checked the real schema and
confirmed it: double-crediting is already impossible at the database layer, enforced by a primary key,
and covered by an integration test that includes the concurrent case.** ⇒ **The "without
double-crediting" half of this task's title may cost little or nothing.** ⛔ **The evidence, the schema
detail and the caveats are the architect's — read §4; they are not reproduced here.**

⚠️ **One consequence worth carrying forward, flagged by the report as a risk:** the guard is keyed on
`(game_id, yandex_player_id)`, so **two crediting paths that disagree about the game id would defeat
it.** Treat that as a thing to assert in a test, not to assume.

---

## Investigation (phase 1 — do this before writing the fix)

⛔ **Investigation-first, and the reason is specific: this task's predecessor was scheduled on a premise
a measurement later disproved.** Do not repeat that.

1. 🔴 **Read the architect's report FIRST** —
   `ai-agents/knowledge-base/reports/2026-09-04-elimination-time-xp-crediting-design-assessment.md` —
   **before anything else in this list.** ✅ **It has landed.** Record in the plan which of this brief's
   *Open questions* it closed, and **put its own §11 open questions to the owner** — they are the
   architect's and are **not** answered here.
2. ~~**Verify the idempotency claim against the real profile-server schema**, not against the contract
   comment.~~ ✅ **DONE BY THE ARCHITECT (§4) — the schema enforces it. Struck, not deleted.**
   ⚠️ **What remains for the plan is narrower:** confirm that **both** crediting paths use the **same
   game id**, since a mismatch would defeat the key.
3. **Enumerate every termination path** that must credit, and confirm against the code which of them
   actually still have connected clients and participation data when they run. ⛔ **Do NOT plan around
   `GameServer.end()`** — the report (§3) shows it would credit nobody. **Locate by symbol, not by line
   number.**
4. **Establish how the server could learn about an elimination** — what messages exist today, what a
   new one would cost, and what an attacker can assert. **This is the design question; treat it as
   one.**
5. ⚠️ **Do not re-derive `0206`'s conclusions from its `plan.md` / `worklog.md` / `review.md`.** Those
   files are **untouched by owner ruling** and were **accurate for the work they describe** — but they
   record a design built on a **disproved premise.** Read them as history, not as input.

## What to Build

⛔ **NOTHING until the phase-1 findings are reviewed with the owner.** ✅ **The architect's report has
landed**, which discharges one half of that gate; **the owner review is the half that remains.** This
section states the **goal and the constraints only** — the **design is deliberately left open**, and
the report's recommendation is **the architect's to make and the owner's to accept**, not this brief's
to assert.

**Goal — RESTATED 2026-09-04 after the two owner rulings. This is the scope; the title is narrower:**

> 🔴 **CLOSE THE XP LOSS.** A player who takes part in a match receives their participation XP —
> **whether they are ELIMINATED or they SURVIVE**, **in FFA and in TEAM mode**, **including when the
> match never reaches a normal end** — and **never twice.**

⚠️ **Both halves are required. A design that credits eliminated players and leaves survivors uncovered
does NOT satisfy this task**, and must not be presented as doing so. Owner's reasoning:
*"half a fix leaves you rediscovering this in three months."*

**Constraints that hold regardless of the approach:**

- ⛔ **`creditMatchXp` must be decoupled from `handleWinner`.** Its **sole** call site today is
  `src/server/GameServer.ts:1199`, inside `handleWinner`. ✅ Producer-verified this turn against
  committed `8f6e478`. **Decoupling it is the substance of the work** — a match with no winner must
  still credit.
- ⛔ **A player must never be credited twice** for one match, across any combination of paths.
- ⛔ **The server stays a turn relay.** Nothing here may turn it into a simulator.
- ⛔ **Trust must be designed in, not bolted on** — see *Trust* above; `getCreditableYandexId()` is the
  existing precedent for the seam.
- **All changes in `src/core/` MUST be tested** (project rule). Server changes should be too.
- ⛔ **Do NOT reintroduce `0206`'s fallback award.** The owner ruled that behaviour wrong:
  > *"if a bot has 80 % and a player has 20 %, it's the problem of the player. They need to conquer
  > more territory or they will be defeated by the bot."*
  ⚠️ **A player losing to a bot is a LEGITIMATE OUTCOME, not a defect.** This task is about crediting
  participation XP for a match that happened — **not** about manufacturing a winner.
- 🔴 **SURVIVORS MUST BE CREDITED — owner ruling, 2026-09-04. This is a REQUIREMENT, not a
  preference.** ~~The stall itself is a SEPARATE, still-open problem and is NOT in this scope unless
  the owner rules otherwise.~~ **Struck, not deleted — the owner has now ruled otherwise.** The
  architect's §7 showed that crediting at elimination covers **eliminated** players — *"which was
  crowning's entire stated justification"* — and leaves **survivors of a stalled match with no trigger
  at all.** ⇒ **A survivor of a match that never reaches a normal end must still be credited.**
  ⛔ **`GameServer.end()` is NOT that trigger** (report §3 — it would credit zero in every match that
  ends normally). **The survivor case needs a trigger of its own.**
  ⛔ **THE MECHANISM IS THE PLAN'S TO CHOOSE. This brief states the requirement and prescribes
  nothing.**
- ⚠️ **The considered-but-not-chosen option — get this distinction exactly right, it is easy to get
  half-right.** A third option was on the table when Ruling 1 was made: **fix the stall itself, so
  survivors reach a normal match end and are credited through the existing path.** The owner
  **considered it and chose to widen this task instead.**
  - ⛔ **Do NOT present "just fix the stall" as a fresh, unexplored idea.** It was raised, weighed and
    passed over **as the scope decision** — the owner declined to replace this task with a stall fix.
  - ⛔ **Do NOT treat it as forbidden.** The ruling settled **what must be true**, not **how**.
    ✅ **If the plan concludes the cleanest way to give survivors a trigger is to make the match
    actually end, that mechanism is fully available and satisfies this ruling.** It may legitimately
    come back as the chosen design.
  - ⇒ **Settled: the REQUIREMENT. Open: the MECHANISM.** Do not collapse the two in either direction.
- 🔴 **TEAM MODE IS IN SCOPE — owner ruling, 2026-09-04.** `checkWinnerTeam()` has the same guard
  shape, so a bot-team-led match loses its XP identically. **The fix lives in the CREDITING path, not
  the win check**, which is the owner's stated reason it should be near-free to cover both.
  ⚠️ **"Near-free" is the owner's expectation, not a measurement — if the plan finds it is not, say so
  rather than quietly dropping Team mode.** ⛔ **This does NOT merge this task with
  [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md)**, and ⛔ **do not change
  `0205`'s status, scope or rank** — the owner has not ruled on them.
- ✅ **SINGLEPLAYER IS OUT OF SCOPE — owner ruling, 2026-09-04.** ~~Singleplayer is UNRULED and is NOT
  covered by either ruling. Do not assume it in or out.~~ **Struck, not deleted.** **FFA and Team
  only.** Reasoning: Singleplayer XP is a separate product question, and bundling it risks reading
  [`0210`](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md)'s **leaderboard-points**
  ruling across onto **profile XP**. ~~⛔ **This is NOT a ruling that Singleplayer awards no XP** — the
  owner declined that stronger option. **Settled: `0211` does not cover it. Still open: whether it
  should credit at all.**~~
  ✅ **SUPERSEDED 2026-09-04 — SINGLEPLAYER AWARDS NO XP. Owner ruling, live in session:** *"Solo
  matches shouldn't contribute to the leaderboard. Neither should they contribute to the XP."*
  ⚠️ **The struck sentence is SPENT, NOT WRONG** — the owner really did decline that stronger option
  earlier the same day, then ruled it later. **Struck, not deleted, so the sequence reads honestly.**
  ⛔ **This does NOT widen `0211`. Singleplayer stays out of scope; only the policy changed.**
  🔴 **It changes nothing about today's behaviour — solo already credits zero — but it makes that an
  INTENDED property instead of an accident of architecture** (crediting lives only in
  `src/server/GameServer.ts:1253`; solo runs on `src/client/LocalServer.ts`, which has no crediting
  code — ✅ producer-verified). ⛔ **`0211` moves the crediting trigger, so `0211` is exactly the task
  that could break it. Do not introduce Singleplayer crediting.** ⚠️ **The property is UNENFORCED —
  no guard, no test, no comment** — so a green suite does not prove it survived. See the scope box at
  the top and the *unenforced* note in **Notes**.
- 🔴 **XP AMOUNT: HOLD AT 10 FLAT — owner ruling, 2026-09-04. A deliberate hold, not an oversight.**
  *"Do not change two things at once"* — ship the crediting fix at the existing amount, see the data,
  then tune. ⚠️ **The architect's point stands and is recorded, not dismissed:** the trigger moving
  earlier **changes what the number means** — dying 30 seconds in now pays the same as playing to the
  end. ⛔ **Do not introduce scaling in this task, and do not present the flat 10 as unexamined.**
- 🔴 **THE LEAVER RULE IS DELIBERATELY REVERSED FOR ELIMINATED PLAYERS — owner ruling, 2026-09-04.
  ⛔ DO NOT "FIX" THIS BACK.** Today, `qualifiesForMatchXp` in `src/core/profile/MatchQualification.ts`
  (`:43-45`, doc comment `:35-42`, ✅ producer-verified against committed `8f6e478`) returns
  `p.hasSpawned && (p.isAliveAtEnd || p.killedAt !== undefined)` — so a player who **spawned then
  vanished without dying** is **deliberately excluded**, as *"the participation-derived half of the
  brief's exclusion of players who voluntarily left mid-game."* **Under this task, a player eliminated
  who then closes the tab is PAID AT THE MOMENT OF DEATH.** ✅ **The architect raised it; the owner
  ruled it intended** — *they played the match, they earned the XP, and punishing them for closing a
  tab after they were already dead serves nothing* — and the architect's read was that **this is the
  most valuable part of the change.** ⚠️ **It NARROWS the leaver exclusion; it does not delete it** —
  a player who vanishes **without ever being eliminated** is a different case and **this ruling says
  nothing about them.**

## Verification

1. **A player eliminated mid-match is credited** — proven, not reasoned.
2. **A player who survives to match end is credited** — including on a termination with **no winner**.
3. 🔴 **ADDED 2026-09-04 BY OWNER RULING — A SURVIVOR OF A MATCH THAT NEVER REACHES A NORMAL END IS
   CREDITED.** ⚠️ **This is the half the original scope missed and it is the one most likely to be
   quietly skipped**, because it needs a trigger that does not exist today. **A green suite without
   this case does not verify this task.** ⛔ **Do not report it satisfied by a code trace.**
4. 🔴 **ADDED 2026-09-04 BY OWNER RULING — TEAM MODE credits in both of the cases above**, not FFA
   only. A bot-team-led stalled match must credit its players.
   ~~⚠️ **Singleplayer is OUT of scope** — assert it is unaffected, do not add coverage for it.~~
   ✅ **AMENDED 2026-09-04 BY OWNER RULING — struck, not deleted; it was accurate when written.**
   ⚠️ **Singleplayer is STILL OUT OF SCOPE.** ⛔ **What follows is a VERIFICATION obligation, NOT an
   implementation one. It does not widen this task by one line of behaviour.**

4c. 🔴 **ADDED 2026-09-04 BY OWNER RULING — A SINGLEPLAYER / LOCAL MATCH CREDITS ZERO XP. Assert it in
   a regression test.** *(Numbered `4c` so the step numbers below stay stable.)*

   **The property under test:** a Singleplayer (or archived-replay) match credits **no** participation
   XP to **anyone**. It is true today — see the scope box at the top for the verified mechanism — and
   the owner ruled on 2026-09-04 that it must **stay** true: *"Solo matches shouldn't contribute to the
   leaderboard. Neither should they contribute to the XP."*

   ⛔ **READ THE SCOPE LINE TWICE — a future planner must not misread this as licence.** This task
   still covers **FFA and Team only**. It adds **no Singleplayer behaviour, no Singleplayer code path,
   and no Singleplayer feature.** ⇒ **The policy closed; the scope did not move.** The obligation is
   to **prove `0211` did not break** a property that already holds — nothing more.

   🔴 **Why this test must exist, and why "run the suite" is not a substitute:** `0211` is **the task
   that relocates the crediting trigger**, and the property is **unenforced** — no guard, no test, no
   comment. ⚠️ **"The tests are green" does NOT prove the property was preserved**, because today
   nothing anywhere asserts it. A trigger that moved crediting to somewhere `LocalServer` can reach
   would start paying solo players and **every existing test would still pass.**

   ⛔ **A TEST, NOT A RUNTIME GUARD — the owner adopted this reasoning, not just the conclusion, so a
   future coder who finds the test inconvenient can see why a guard was rejected:**
   - **A guard is dead code that reads as protection.** Solo **never reaches** `creditMatchXp`
     (`src/server/GameServer.ts:1253`) — it runs on `src/client/LocalServer.ts`, which has no crediting
     code at all. A game-type guard added in `GameServer` would sit on a path solo **cannot currently
     take**, so it would never fire, could never be observed failing, and would give a false sense that
     the property is enforced.
   - ⚠️ **And it is worse than merely useless: it is protection pointed the wrong way.**
     `this.gameConfig.gameType` is already in scope in `GameServer`, so adding a guard there is one
     easy line — which is exactly what makes it a trap. **The failure mode this ruling guards against
     is a trigger moving CLIENT-SIDE, where `GameServer` is not involved**, so the cheap, natural-
     looking guard protects against precisely the case that cannot happen and not at all against the
     one that can.
   - ✅ **A test fails loudly the moment a trigger moves** — which is the actual risk, and the only
     mechanism that catches it.

   ⚠️ **State plainly in the worklog what the test drives** — a real local/Singleplayer path, or a
   narrower unit-level stand-in — and **do not claim end-to-end coverage you did not write.**
4b. 🔴 **ADDED 2026-09-04 BY OWNER RULING — A PLAYER ELIMINATED WHO THEN LEAVES IS STILL CREDITED.**
   Today `qualifiesForMatchXp` excludes a player who vanishes with no `killedAt`; **an eliminated
   player who closes the tab must now be paid at the moment of death.** ⛔ **Assert this explicitly in
   a test** — it is a **deliberate reversal of existing behaviour** and, without a test naming it, a
   later reader will read it as a regression and undo it. ⚠️ **Also assert the case the ruling did
   NOT change: a player who vanishes WITHOUT ever being eliminated.** *(Numbered `4b` rather than
   renumbered so the step numbers below stay stable.)*
5. 🔴 **A player eliminated in a match that later ends is credited EXACTLY ONCE.** This is the
   double-credit case and it is the one most likely to regress silently. **Test it explicitly.**
6. **The `maxGameDuration` cap path credits** — the observed failing case
   (`ending game with 11203 turns`, `archiving game`, no `handleWinner`).
7. **Ordinary winner matches are unchanged** — no regression on the path that works today.
8. ⚠️ **A client cannot obtain XP by asserting an elimination it did not suffer.** State what is
   tested and what is merely argued.
9. **`npm test` green, `npm run lint` clean.** ⚠️ If a `supertest` suite fails, check CLAUDE.md's
   known-flake signature first, **rule out `0197`'s `SIGSEGV`**, and **say that you re-ran.**
10. ⚠️ **Crediting was NEVER proven end-to-end locally on `0206`** — `creditMatchXp` returned at
   `credits.length === 0` because no authenticated Yandex ids exist in a local run. **Plan for that
   constraint up front; do not discover it at verification time and then report a code trace as a
   test.**

## Notes

- **Origin:** the revert of `0206`, owner ruling given live in session **2026-09-04**. The replacement
  scope — *credit at elimination OR match end, idempotent* — is the owner's, given in the same ruling.
  📌 **WIDENED LATER THE SAME DAY by two further owner rulings** — **survivors** and **Team mode**.
  **See the scope box at the top of this file; the title was NOT changed.**
- **`0206` is CITED, NOT EDITED by this brief.** Its brief was corrected separately in the same run;
  its `plan.md`, `worklog.md` and `review.md` are **untouched by owner ruling.**
- **Related, none blocking:**
  - [`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md) — the reverted
    predecessor. **Read its STOP box, not its design.**
  - [`0208`](../0208-measure-clientless-leader-at-win-condition-in-production/brief.md) — would measure
    how often this happens in production. ✅ **Its Part A decay clock has STOPPED**, because `0206`
    never deployed; scheduling **this** task is what would restart one.
  - [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md) — the Team-mode form of the
    stall. ~~⚠️ **The XP loss is not FFA-specific**; whether this task covers Team mode is an open
    question below.~~ ✅ **RULED 2026-09-04 — Team mode IS covered by this task. Struck, not deleted.**
    ⛔ **The two tasks are NOT merged and answer different questions:** `0205` is a **resolution
    policy** question (*who should win a stalled Team match?*); `0211` is **crediting** (*do those
    players get their XP?*). ⚠️ **`0211` may make part of `0205`'s justification moot** — if XP is
    credited regardless of who wins, one of `0205`'s reasons to exist weakens — **but it does NOT
    settle `0205`'s own question.** ⛔ **`0205`'s status, scope and rank are UNCHANGED and were not
    touched; the owner has not ruled on them.** ✅ A reciprocal cross-reference was added to `0205`'s
    Notes and **nothing else in that brief was edited.**
  - [`0210`](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md) — Singleplayer
    leaderboard policy. ~~⚠️ **Whether Singleplayer should credit participation XP at all is adjacent to
    `0210`'s ruling and is not settled here.**~~ ✅ **SETTLED 2026-09-04 — struck, not deleted; it was
    accurate when written.** The owner ruled *"Solo matches shouldn't contribute to the leaderboard.
    Neither should they contribute to the XP."* ⇒ **leaderboard and XP now read as ONE policy: solo
    contributes to neither.** ⛔ **The two tasks are still separate and `0210`'s scope, status and
    priority are UNCHANGED** — `0210` implements the leaderboard half (a guard it must **add**);
    the XP half needs no code today. ⛔ **This does not widen `0211` either.**
- 🔴 **THE XP HALF OF THE 2026-09-04 RULING WAS UNENFORCED — producer recommendation, ✅ NOW ADOPTED BY
  OWNER RULING 2026-09-04. It is a VERIFICATION obligation, still NOT a scope change and NOT a task.**
  Solo credits no XP purely because `creditMatchXp` (`src/server/GameServer.ts:1253`) is unreachable
  from `src/client/LocalServer.ts`, which has no crediting code.
  ⚠️ **CORRECTION, made by the producer against its own earlier text:** an earlier revision of this
  bullet claimed `GameServer.ts` contains *"zero occurrences of `GameType`/`gameType`/`Singleplayer`"*.
  **That was WRONG.** ✅ Re-verified 2026-09-04: `GameServer.ts` has **six** `GameType` occurrences
  (`:7`, `:113`, `:194`, `:877`, `:895`, `:933`), **all `GameType.Public` checks and all above the
  crediting path.** The accurate, narrower claim: **the crediting path itself has no game-type check**,
  and `src/core/profile/MatchQualification.ts` genuinely has zero — `selectMatchCredits` takes no
  game-type argument. **No guard, no test, no comment says the solo property is intended.**
  ⚠️ **`0211` relocates the crediting trigger, which is the one change most likely to make it stop
  being true — and nothing would fail.**

  **The producer's recommendation: a regression test rather than a runtime guard.**
  ~~⛔ **NOT ADOPTED — this is a recommendation only. Nobody has ruled on it, no task exists for it,
  and none was filed.**~~ ~~⚠️ **Note for whoever puts it to the owner: adopting it would touch
  Verification step 4, which today says *"assert it is unaffected, do not add coverage for it"* — so it
  IS a scope question for `0211`, not a free addition.**~~
  ✅ **ADOPTED 2026-09-04 — owner ruling, given live in session. Struck, not deleted: the history reads
  honestly as recommended, then ruled.** ⚠️ **The struck text is SPENT, NOT WRONG** — at the time
  nobody had ruled, and the flag that it was a scope question for step 4 is exactly what got it put to
  the owner. **The owner chose to fold it into `0211` and explicitly REJECTED the separate-task
  option** — ⛔ **so do not file one.** Verification **step 4 is amended and step `4c` added**
  accordingly.

  🔴 **The owner adopted the REASONING, not merely the conclusion — it is recorded here so a future
  coder who finds the test inconvenient can see why a guard was rejected rather than re-proposing one:**
  a guard on a path solo cannot currently reach is **dead code that reads as protection**, whereas a
  test **fails loudly the moment a trigger moves.** ⚠️ **Sharpened by the correction above:** because
  `this.gameConfig.gameType` is *already in scope* in `GameServer`, a guard there is one easy line —
  which is what makes it a **trap**, not an argument for it. **The risk is a trigger moving CLIENT-
  SIDE, where `GameServer` is not involved at all**, so that guard would defend the one case that
  cannot happen and none of the case that can. ⚠️ **And "the tests are green" does NOT prove the
  property was preserved** — nothing asserts it today, which is the whole reason this specific test has
  to exist rather than relying on the suite as a whole.
- **ADR-110** (`ai-agents/knowledge-base/decisions/adr-110-ai-player-may-be-declared-winner.md`) is
  **cited, not authored or edited here.** ⚠️ **It is unaffected by the revert as a policy** — it rules
  on the *winner predicate*; only `0206`'s FFA implementation of it was reverted. It carries a
  pre-committed revisit trigger — **read it there.**
- **Row appended, not inserted** on [`backlog.md`](../../../sprints/backlog.md) (ADR-035).
- ⛔ **No secrets in this brief** — no DSNs, endpoints or credentials, and none belong in a plan or
  worklog for this task either. The profile-server connection string lives in `.env*` only.

### 🚩 Open questions — for the owner, none answered here

⚠️ **Two of the four below were RULED on 2026-09-04. Struck, not deleted — the strikes are the record
that they were open and are now answered.**

1. ~~🚩 **STILL OPEN — Scheduling.** Not ruled. This stays on the unscheduled backlog board and the
   rank is the producer's.~~ ✅ **RULED 2026-09-04 — SCHEDULED INTO SPRINT 4.** The owner **declined**
   the producer's "leave it unscheduled" recommendation; their reasoning: **the XP loss is measured
   and live, and the design assessment is already done, so it can start immediately.** ⛔ **They ruled
   scheduling ONLY and explicitly declined "re-rank first" — the rank is HELD at `Medium–High` and is
   still the producer's.** **Struck, not deleted.**
2. ~~**Does this cover Team mode and Singleplayer, or FFA only?** The XP loss is not FFA-specific.~~
   ✅ **PARTLY RULED 2026-09-04 — TEAM MODE: YES.** `checkWinnerTeam()` has the same guard shape; the
   fix lives in the crediting path, so covering both is likely near-free, and it stops `0205` being
   solved twice or forgotten. ⛔ **This does not merge `0211` and `0205`.**
   ~~🚩 **SINGLEPLAYER IS STILL OPEN — explicitly NOT ruled.** … Do not assume Singleplayer in or
   out.~~ ✅ **NOW FULLY RULED 2026-09-04 — SINGLEPLAYER IS OUT OF `0211`'s SCOPE. FFA and Team only.**
   Reasoning: Singleplayer XP is a **separate product question**, and bundling it risks the exact
   confusion flagged here — ⚠️ **the warning is KEPT because it is the reason the ruling was needed:
   [`0210`](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md)'s ruling (*report
   nothing to the platform leaderboard*) is about LEADERBOARD POINTS, not profile XP, and the two must
   not be read across.** ⛔ **This is a DECISION, not a gap** — ~~**but it is NOT a ruling that
   "Singleplayer awards no XP"; the owner was offered that stronger option and DECLINED it.**
   ⇒ **Settled: `0211` does not cover Singleplayer. 🚩 Still open for someone to ask later: whether
   Singleplayer should credit participation XP at all.**~~
   ✅ **AND NOW FULLY CLOSED 2026-09-04 — SINGLEPLAYER AWARDS NO XP.** Owner ruling, live in session:
   *"Solo matches shouldn't contribute to the leaderboard. Neither should they contribute to the XP."*
   ⚠️ **The struck text is SPENT, NOT WRONG** — the owner genuinely declined the stronger option first
   and ruled it later the same day. **Struck, not deleted, so nobody reads this as the owner having
   ruled it at the first asking.** ⛔ **The ruling does NOT widen `0211`** — Singleplayer remains out
   of scope; the *policy* closed, the *scope* did not move. 🔴 **Today's behaviour is unchanged (solo
   already credits zero); what changed is that it is now DELIBERATE rather than an accident of
   architecture, and `0211` — the task that moves the crediting trigger — must not break it.**
   ⚠️ **It is unenforced (no guard, no test, no comment); see the recommendation in Notes.**
3. ~~🔴 **Is the still-open stall in scope — and are SURVIVORS in scope?** A match nobody can win still
   runs to the cap; crediting XP does **not** fix it. ⚠️ **The architect's §7 sharpens this into a
   concrete gap: crediting at elimination covers eliminated players but leaves SURVIVORS of a stalled
   match with no trigger at all.** ⇒ **As scoped, this task does not close the whole XP loss.**
   **Flagged, not assumed either way — this needs a ruling.**~~
   ✅ **RULED 2026-09-04 — SURVIVORS ARE IN SCOPE.** *"half a fix leaves you rediscovering this in
   three months."* **The requirement is settled; the mechanism is not**, and a third option (fix the
   stall so survivors reach a normal match end) was **considered and not chosen as the scope
   decision** — ⛔ **but is NOT forbidden as the plan's mechanism.** See the scope box at the top and
   the constraint in *What to Build*.
   🚩 **What remains open here: whether the stall gets a task of its own.** ⛔ **No separate stall
   brief has been filed, deliberately** — the owner has not ruled on one, and filing one now could be
   read as pre-empting the mechanism choice.
4. ~~🚩 **STILL OPEN — How much XP, and on what basis?** … **undecided** — ⚠️ and Ruling 1 adds the
   same question for SURVIVORS of a match that never ends.~~
   ✅ **ANSWERED 2026-09-04 — HOLD AT 10 FLAT; the decision is DEFERRED, not made.** Owner's reasoning:
   **do not change two things at once** — ship the crediting fix at the existing amount, see the data,
   then tune. ⛔ **Record this as a DELIBERATE HOLD, not an oversight.** ⚠️ **The architect's point
   STANDS and is not dismissed by the hold:** moving the trigger earlier **changes what the number
   means** — a player who dies **30 seconds in** is paid **the same** as one who plays to the end.
   🚩 **Genuinely still open: the tuning itself, after data.** No task exists for it and none was
   filed — the owner has not ruled on one.
5. 🚩 **STILL OPEN — does the stall get a task of its own?** ⛔ **No separate stall brief has been
   filed, deliberately** — the owner has not ruled on one, and filing it now could be read as
   pre-empting the survivor mechanism choice (see the considered-but-not-chosen note above).

📎 **Separately, the architect's report carries its OWN open questions for the owner (its §11).** They
are **not** answered here and **not** duplicated into this list — **the coordinator is putting them to
the owner directly.** **Both lists need answers.**
