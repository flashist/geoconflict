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
> 🔴 **RELATED OWNER RULING, 2026-09-10 — THE STALL GETS NO SEPARATE BRIEF, AND THAT IS A DECISION,
> NOT AN OVERSIGHT.** Given live in session and relayed through the spawning session. 🚨 **This
> CONFIRMS the existing deliberate non-filing — ⛔ stop reading the missing stall brief as a gap.**
> **Owner's stated reasoning:** *"fix the stall"* is still a **legitimate candidate mechanism** for the
> survivor-mechanism choice above, and **filing a brief now could pre-empt it.**
> 🔴 **REOPEN CONDITION, RECORDED: file the stall brief IF `0211`'s plan picks a mechanism OTHER THAN
> fixing the stall.** ⚠️ **This changes NOTHING about the requirement/mechanism split above.**
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
> ~~`0205`'s **status, scope and rank are UNCHANGED — the owner has not ruled on them.**~~
> 📌 **CORRECTED 2026-09-11 — struck, not deleted; true when written (2026-09-04).** `0205`'s
> **status, scope and folder ARE still unchanged**, but its **RANK IS NOT**: the owner ruled it be
> re-ranked and signed off `Medium` on **2026-09-11**. Three layers, do not flatten: **THAT it be
> re-ranked** = owner ruling; **THAT the value is `Medium`** = the producer's proposal; **THAT `Medium`
> is approved and in force** = owner sign-off. ⛔ **`0205` ≠ `0211` is unchanged in both directions** —
> `0205` is **resolution policy**, `0211` is **crediting**.
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
> - `creditMatchXp` exists **only** on the game server, in `src/server/GameServer.ts` at its
>   `private creditMatchXp(` declaration (plus the profile-server implementation it calls).
>   Singleplayer never reaches it.
> - Singleplayer runs against `src/client/LocalServer.ts`. Grepping that whole 362-line file for
>   `credit|ProfileApi|xp` returns **nothing** — the only hit is the class name `LocalServer`.
> - `src/client/Transport.ts` sets `isLocal` at its `this.isLocal =` assignment for **Singleplayer
>   *and* archived-game replay**, and `sendMsg` (`src/client/Transport.ts`, the
>   `private sendMsg(msg: ClientMessage)` body) hands every client message to
>   `this.localServer.onMessage(msg)` and `return`s — the WebSocket is never touched.
> - ⚠️ **CORRECTION to a plausible-sounding but wrong reading:** the winner message is **not**
>   suppressed in solo. `onSendWinnerEvent` (`src/client/Transport.ts`, the
>   `private onSendWinnerEvent(` declaration) is `if (this.isLocal || socket open)` — `isLocal`
>   **enables** the send. `LocalServer` receives it and stores it (`src/client/LocalServer.ts`, the
>   `if (clientMsg.type === "winner")` branch) for the game record.
>   **The single reason no XP is credited is that `LocalServer` has no crediting code**, not that the
>   message is dropped. Anyone reasoning about this must reason about **that one seam**, not a guard.
> - ⛔ **There is NO guard, NO test, and NO comment anywhere stating this as intent.** ✅ Re-verified
>   2026-09-04, and stated precisely — ⚠️ **an earlier revision of this brief said `GameServer.ts`
>   contains "zero occurrences of `GameType`/`gameType`/`Singleplayer`". THAT WAS WRONG; the producer
>   caught and corrected it.** The accurate facts:
>   - `src/server/GameServer.ts` has **six** `GameType` occurrences
>     (`src/server/GameServer.ts:7` import, then `src/server/GameServer.ts:113,194,877,895,933` —
>     **line numbers deliberately kept, framed at commit `22bbe39`, because the anchor `GameType`
>     recurs 6× in this file, which is exactly the claim; re-verified by reading the file
>     2026-09-11**) — **all of them `GameType.Public` checks**, and **all of them above the
>     crediting path.**
>   - ⇒ **The precise claim is narrower and is the one that matters: the CREDITING PATH has no
>     game-type check.** `creditMatchXp` (in `src/server/GameServer.ts` — called at
>     `this.creditMatchXp(potentialWinner.winner);`, declared at `private creditMatchXp(`) branches on game type
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
> ## ~~✅ Ruling 3 — the XP amount stays 10 flat. Decision DEFERRED, not made.~~ 🔴 SUPERSEDED 2026-09-10 — THE AMOUNT IS **1 XP**
>
> ~~**Owner's reasoning: do not change two things at once.** Ship the crediting fix with the **existing
> amount**, see the data, then tune.~~
>
> ~~🔴 **This is a DELIBERATE HOLD, NOT AN OVERSIGHT.**~~
>
> 🔴🔴 **SUPERSEDED 2026-09-10 BY THE OWNER'S OWN LATER RULING. THIS REVERSES THEIR EARLIER DECISION.**
> Given live in session and relayed through the spawning session.
> ⛔ **The ruling above is STRUCK, NOT DELETED. It was CORRECT WHEN GIVEN and is now SPENT** — struck-
> don't-delete, so nobody re-derives "hold at 10" from a half-erased record.
> ℹ️ **Numbering note:** this ruling is labelled **Ruling 3** here and **(4)** on the
> [Sprint 4](../../../sprints/plan-sprint-4.md) row. **Same ruling, two numberings — identify it by
> content**, not by number.
>
> **THE NEW RULING — owner, verbatim:**
> *"My decision is that instead of 10, we should give 1 XP. The logic is: if in the future we would
> like to change it, the players will be more willingly accepting if we change the amount of given XP
> in the greater side, rather than in the smaller. If we change it to 1XP, then the amount of XP that
> is needed to be collected to get citizenship also should be 10x smaller."*
>
> 🚨 **RECORD THE REASONING, NOT JUST THE NUMBER.** The reasoning is the justification for the
> **DIRECTION** of any future change: **players accept an award going UP; they do not accept it going
> DOWN. Start low so every later move can be upward.** ⛔ **A future planner must not treat `1` as an
> arbitrary constant and "round it back up" for tidiness.**
>
> 🔴 **THE CITIZENSHIP THRESHOLD — OWNER-RULED, FIRM: DIVIDE IT BY EXACTLY 10.** Time-to-citizenship
> must be **unchanged**. ⛔ **"About 10x" is not the ruling — it is EXACTLY 10x.** ✅ **This is a
> REQUIREMENT OF `0211`**, not a follow-up and not a nice-to-have.
> ⚠️ **The current threshold value still has to be LOCATED IN CONFIG AT PLAN TIME.** 🚨 **The producer
> has NOT touched any config or source and did not go looking — this brief records SCOPE only.**
>
> 🔴 **THE PLAYER-FACING COPY IS PART OF THIS REQUIREMENT — OWNER-RULED 2026-09-11, given live in
> session and relayed through the spawning session.** ✅ **A REQUIREMENT, not a note and not a
> "consider".** **Every user-visible string that STATES the citizenship XP threshold (or the per-match
> XP award) must be rescaled in the SAME change**, in **BOTH** `resources/lang/en.json` **and**
> `resources/lang/ru.json` — which this project's standing rule already requires to be kept in sync.
> **Owner's reasoning, as put and accepted:** `0211` already carries *divide the threshold by exactly
> 10*, so **the strings that state that threshold to players belong in the same change — they ship or
> break together, and splitting them is how one gets forgotten.**
> ⛔ **NO LINE-NUMBER LIST IS GIVEN ON PURPOSE.** Line numbers drift, and the figures in
> [`0017`](../0017-citizenship-earned/brief.md) have already been corrected twice this week. **Find
> the strings by CONTENT/KEY, and SWEEP for the figures at plan time rather than trusting any list.**
> 📍 **Known starting point, not the scope:** the `citizenship_earned` inbox strings (`inbox_body`,
> stating *"1,000 XP"* / *"1 000 XP"* in both languages) are drafted in `0017`'s **Localization**
> section and its **Part B** table. ⚠️ **Sweep both language files for the figures themselves** — any
> string stating the threshold or the award goes wrong the day `0211` ships.
> 🚨 **Producer touched NO localisation file and NO source — this records SCOPE only.**
>
> 🔴 **SCOPE — OWNER-RULED WHEN THE PRODUCER PUT IT TO THEM: FOLD IT INTO `0211`.** `0211` ships the
> **new crediting trigger AND the 1 XP amount TOGETHER**.
> 🚨 **THE COST WAS SHOWN TO THE OWNER BEFORE THEY CHOSE, AND THEY ACCEPTED IT: a post-deploy XP
> anomaly CANNOT BE ATTRIBUTED between the trigger change and the amount change.** ⛔ **That is an
> ACCEPTED COST, NOT A DEFECT, and it is NOT to be re-litigated.** The owner was offered and
> **DECLINED** both alternatives: a separate amount task shipping **before** `0211`, and one shipping
> **after**.
>
> ⚠️ **THE ARCHITECT'S POINT IS NOT DISMISSED BY THIS AND MUST STAY RECORDED:** moving the trigger
> earlier **changes what the number means** — a player who dies **30 seconds in** is paid **the same**
> as one who plays to the end. **That was true at 10 and is equally true at 1.**
> ⛔ **Do not let a plan quietly introduce scaling** — the amount is **flat 1**, and scaling is still
> out of scope.
>
> ## 🔴 Ruling 4 — crediting at elimination DELIBERATELY REVERSES THE LEAVER RULE. This is intended.
>
> ⛔ **READ THIS BEFORE TOUCHING `qualifiesForMatchXp`. A future reader must not "fix" this task back
> into the old rule.**
>
> **The rule TODAY** — `src/core/profile/MatchQualification.ts`, ✅ producer-verified this turn against
> committed `8f6e478` (the `export function qualifiesForMatchXp` declaration in
> `src/core/profile/MatchQualification.ts`, and the doc comment immediately above it):
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
>    `grep -rnoE '\b0(20|21)[0-9]\b' .claude/` ~~returns exactly **two** hits~~
>    🔴 **FIGURE CORRECTED 2026-09-11 (owner ruling, given live in session): it now returns **10** hits
>    — nine `0204` and one `0202`.** ⚠️ **Struck, not deleted: "two" was the count when the sweep was
>    run and is now spent, not wrong-at-the-time.**
>    ✅ **THE CONCLUSIONS BELOW ARE UNAFFECTED — the figure moved, the reasoning did not.** All 10 hits
>    are still in the **same single file**; they are still only `0202` and `0204`; **`0204` is still
>    reserved**; **`0211` is still not among the hits**; and **max in use anywhere is still `0210`.**
>    ⚠️ **Why the count changed: UNKNOWN, and I could not tell cheaply.** That file is **gitignored**
>    (`.gitignore`, its `.claude/skills/fkit-*/` rule) so it has **no git history to diff** — the likeliest
>    explanation is that the file gained `0204` references after the sweep, but **that is a guess and is
>    not recorded as fact.** All 10 hits are in
>    `.claude/skills/fkit-sprint-ship-loop/SKILL.md`: **`0202`**
>    (`.claude/skills/fkit-sprint-ship-loop/SKILL.md:233`) and **`0204`**
>    (`.claude/skills/fkit-sprint-ship-loop/SKILL.md:194`) — **line numbers deliberately kept, because
>    the anchor is the bare token `0204`, which recurs many times in that file. ⚠️ NO COMMIT FRAME IS
>    POSSIBLE: that file is gitignored (`.gitignore`, its `.claude/skills/fkit-*/` rule) and has no git
>    history, so it has no state at any commit. Frame is therefore the WORKING TREE, read 2026-09-11.**
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

⚠️ ~~**Scheduled is NOT started.** The status stays `🔲 Backlog` — **nobody is building this.**
`🔄 In progress` would misreport who is doing what. The status changes when a plan is approved and
work actually starts.~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.**

🔴 **2026-09-11 — THE OWNER RULED THE BUILD STARTS, and the status is now `🔄 In progress`.**
⚠️ **The struck reasoning above was RIGHT and has NOT been reversed on its merits** — it is spent
because the condition it named (an owner ruling that the work begins) has now happened, not because it
was wrong. ⚠️ **And its warning still bites:** `🔄 In progress` *does* currently over-state things —
**no session owns this, no plan is approved, no code is written.** It was chosen as the **least
misleading of a two-value vocabulary that has no token for *"scheduled to build, not yet started"*.**
🚨 **Read the token-choice box under `## Status` before citing this value anywhere.**

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
make it less important — it makes it LATER.** ⚠️ **[`0208`](../../done/0208-measure-clientless-leader-at-win-condition-in-production/brief.md)
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
  [`0208`](../../done/0208-measure-clientless-leader-at-win-condition-in-production/brief.md) is the task that
  would answer it and is itself unscheduled. **Do not present this as a widespread field incident.**
- ⚠️ **The design is genuinely unresolved** (see *The central design problem*), and an architect
  assessment had **not landed** when this brief was written. A brief whose approach is open should not
  jump a queue on the strength of its motivation alone.
- **The player-visible harm is soft.** Players lose XP they never saw awarded; nobody has reported it.
  The cost is to the citizenship/XP economy's integrity, not to a visible feature.
- ⚠️ **`0206`'s history is a direct argument for caution here.** That task was scheduled on a premise
  that a measurement later disproved. **This brief is investigation-first for exactly that reason.**

## Status
🔄 In progress — 🔴 **PICKED UP / SCHEDULED TO BUILD on an owner ruling given live in the lead session, 2026-09-11.** ⚠️ **READ THE TOKEN-CHOICE BOX BELOW BEFORE TRUSTING THIS VALUE: no session owns this yet, no plan is approved, and NOT ONE LINE OF CODE HAS BEEN WRITTEN.** ~~🔲 Backlog~~ 📌 **struck, not deleted; TRUE WHEN WRITTEN and true for exactly as long as nobody had been put on it.**

> # 🔴 2026-09-11 — OWNER RULING: **BUILD `0211`.**
>
> The owner ruled, live in the lead session: **schedule `0211` to build.** Its ship gate was cleared
> earlier the same day, and it had been sitting `🔲 Backlog` with **nobody on it**.
>
> ## ⚠️ THE STATUS TOKEN IS A COMPROMISE. HERE IS EXACTLY WHAT IT DOES AND DOES NOT ASSERT.
>
> 🔴 **THE VOCABULARY HAS NO TOKEN FOR *"scheduled to build, not yet started"*.** The canonical set
> ([`task-status-vocabulary.md`](../../../knowledge-base/conventions/task-status-vocabulary.md))
> offers only `🔲 Backlog` = *"scoped and filed, **not picked up**"* and `🔄 In progress` = *"a session
> owns it and **work has started**"*. **Today, neither is true.** ⛔ **This is a real gap in the
> vocabulary and it is being reported, not papered over.**
>
> **`🔄 In progress` was chosen as the LEAST MISLEADING of the two. The reasoning, so it can be
> overruled if the owner disagrees:**
>
> | Token | What a board reader would wrongly conclude | How wrong |
> |---|---|---|
> | `🔲 Backlog` | *"Not picked up — still available, nobody has committed to it."* | 🔴 **False BY OWNER RULING as of today.** *"Not picked up"* is the vocabulary's own discriminator for this value, and the owner ruled it **picked up**. |
> | **`🔄 In progress`** ✅ chosen | *"A session owns it and work has started."* | ⚠️ **False by a matter of hours-to-days, and self-correcting** — it becomes true the moment the implementation session opens, and it correctly warns everyone else off picking this up. |
>
> 🚨 **SO, PRECISELY, WHAT THIS TOKEN ASSERTS AND WHAT IT DOES NOT:**
> - ✅ **Asserts:** the owner has ruled that this work starts. It is the live, committed next build.
> - ⛔ **Does NOT assert:** that a session owns it · that a plan exists or is approved · that any code
>   is written · that any verification has been run. **All four are NO as of 2026-09-11.**
>
> ⚠️ **A NAMED OWNER SESSION MUST STILL SET THIS HONESTLY WHEN IT ACTUALLY BEGINS** — and if the build
> does **not** in fact begin, this token becomes the exact lie the vocabulary warns about (*"an
> `In progress` marker left behind on an abandoned task makes the board lie with confidence"*).
> **Revert it to `🔲 Backlog` if the pickup does not hold.**
>
> 📌 **The producer did NOT amend the vocabulary to add a seventh value.** That is a project-wide
> convention change and it is the owner's call — **it is raised as an open question, not taken.**
>
> ## 🚨 THE COST THE OWNER IS KNOWINGLY ACCEPTING — IRREVERSIBLE, AND NOT AN OVERSIGHT
>
> 🔴 **SHIPPING THIS TASK PERMANENTLY DESTROYS `0208`'s PART A PRE-FIX DENOMINATOR.**
>
> You cannot measure how often matches stalled uncredited once they stop stalling uncredited — and
> **this task is precisely what stops them stalling uncredited.** **There is no later opportunity and
> no proxy.** That destruction is the **entire reason** the `0208`-before-`0211` sequencing existed.
>
> ✅ **The sequencing has been served: `0208` was measured (4–10 Sep 2026) and CLOSED on 2026-09-11**
> (`✅ Done (agent-closed — not owner-verified)` — ⚠️ **its close was explicitly not a clean one**).
> 🔴 **The owner is proceeding WITH THIS UNDERSTOOD.** ⛔ **DO NOT LATER RE-RAISE THE LOST DENOMINATOR
> AS A GAP SOMEBODY SHOULD HAVE CLOSED. It was weighed and accepted.**
>
> ⚠️ **And the number that survives is still only directional:** *"in 52 % of measured Team-mode
> client-matches that reached the win condition, the leader at that moment was the all-bot team, and no
> winner could be declared at that moment."* ⛔ ***"52 % of Team matches stalled" remains an
> UNSUPPORTED CLAIM**, and the per-match stall rate will **NEVER** be known* (owner ruling, option B).
>
> ## 📦 WHAT THIS TASK CARRIES INTO THE BUILD — ALL SETTLED RULINGS, ⛔ NONE RE-OPENABLE
>
> **Gathered here so the implementer inherits them in ONE place.** ⛔ **Every row below is a settled
> owner ruling. Do not re-litigate any of them in the plan.** Each is recorded in full elsewhere in
> this brief — this table is a manifest, not the record.
>
> | # | What is settled | ⛔ Not open |
> |---|---|---|
> | 1 | **XP per qualifying match: `1 XP`** — down from 10. Owner-ruled 2026-09-10, **reversing their own earlier ruling.** | The amount |
> | 2 | **Citizenship threshold divided by EXACTLY 10** → `100`, so time-to-citizenship is **UNCHANGED (~100 matches)**. ⛔ *"About 10x"* is **not** the ruling — it is exactly 10 | The divisor |
> | 3 | 🔴 **PLAYER-FACING COPY MUST BE RESCALED IN BOTH [`en.json`](../../../../resources/lang/en.json) AND [`ru.json`](../../../../resources/lang/ru.json)** — this is **verification step `4d`**, not an optional polish item. **The two files must always be kept in sync** | That it ships with the code |
> | 4 | **SURVIVORS ARE IN SCOPE** — a player who survives a match that never reaches a normal match end must still be credited. 🚩 **The MECHANISM IS STILL OPEN and is the PLAN'S to choose** (the architect's report is its input). ⛔ **`GameServer.end()` is verified NOT to be that trigger** — it would credit **zero** in every normally-ending match | That survivors are covered |
> | 5 | **TEAM MODE IS COVERED**, not just FFA | The mode coverage |
> | 6 | **SINGLEPLAYER IS OUT OF SCOPE** | The exclusion |
> | 7 | **The leaver rule is DELIBERATELY REVERSED for ELIMINATED players** — this is intentional, not an inconsistency to "fix" | The reversal |
> | 8 | 🔴 **NO XP MIGRATION. The free citizenship grants are ACCEPTED.** Owner-ruled **2026-09-11**, live in session. Any existing row at **≥ 100 XP becomes a citizen the moment this ships**, on a threshold they never met. ⛔ **NO MIGRATION IS TO BE WRITTEN** — see the full record directly below | That no migration is written, and that the grants are accepted |
>
> ### 🔴 RULING 8, IN FULL — NO XP MIGRATION; THE FREE CITIZENSHIP GRANTS ARE ACCEPTED
>
> **Owner ruling, given live in the lead session on 2026-09-11.** ⛔ **This is a ruling — not a note,
> not a risk, not an open question.**
>
> **The question, raised by the architect while writing [ADR-111](../../../knowledge-base/decisions/adr-111-xp-economy-rescale-awards-move-up-never-down.md)
> and not previously recorded anywhere:** when this task ships the rescale (award `10` → `1`, citizenship
> threshold `1,000` → `100`), any existing player row already at **≥ 100 XP instantly becomes a
> citizen** — a grant roughly **10× easier than intended**. A player sitting at 500 XP is half-way today
> and a citizen the moment it lands.
>
> **Three options were put to the owner:** a divide-by-10 migration preserving every player's progress
> exactly; accepting the free grants; or sequencing `0211` to ship **before** `0217` wires anything, so
> no rows exist to grant. **The owner chose: ACCEPT THE FREE GRANTS.**
>
> 🚨 **THE CONSEQUENCE, STATED PLAINLY AND NOT SOFTENED:** players at **≥ 100 XP when `0211` lands
> become citizens immediately, on a threshold they did not actually meet under the rules in force when
> they earned it.** ⛔ **The owner ruled this acceptable knowingly.** It is an accepted cost, not a
> defect, and not a gap to be closed.
>
> ⛔ **NO MIGRATION IS TO BE WRITTEN.** A future implementer who notices the discrepancy must **not**
> "fix" it by adding one — **that would reverse an owner ruling.** If they believe circumstances have
> changed, they **escalate to the owner**; they do not migrate.
>
> **Evidence available today — a dated observation, NOT a standing fact.** On **2026-09-11** the lead
> read **every profile table on the production box** during task `0218` and found **all zero rows**,
> observed **twice** (Phase A2, and again at Phase E1). ⚠️ **That is a reading taken on one day, not a
> guarantee about ship day.** Task `0217` wires the game server and **will start creating rows**, and
> the owner's own ordering runs `0217` **before** `0211` is likely to ship. **So the population at ship
> time is unknown, and this ruling accepts whatever it turns out to be.**
>
> **Provenance:** question raised by the **architect** while writing **ADR-111**; **ruled by the owner
> the same day (2026-09-11)**. ADR-111 carries the same ruling as a dated clarification in its
> *Consequences* section; ADR-111 remains **`accepted`** and its body is unchanged.
>
> ## ⚠️ FLAG FOR WHOEVER PLANS THIS — A HARD PROJECT RULE APPLIES IN FULL
>
> 🔴 **`0211` lands in `src/core/`, and this project's rule is: *"All code changes in `src/core/` MUST
> be tested."*** No exemption, no partial. Plan the tests as part of the work, not after it.
> ⚠️ Two further cost facts the planner should know up front: `npm test` **runs the shell harnesses
> unconditionally** (~22–25 s, no skip valve by owner ruling), and the `supertest` suites carry a
> **known ~4–7 % flake** — re-run, and **say that you re-ran**, rather than reading it as a regression.
>
> ⛔ **WHAT THIS RULING DID NOT DO:** it did **not** re-rank this task (see *Priority* — `Medium–High`
> stands, and it is **the producer's rank, not the owner's**), did **not** change its scope, and did
> **not** move it off Sprint 4.

⚠️ ~~**SCHEDULED INTO SPRINT 4 on 2026-09-04 (owner ruling, live in session) — and the status is
DELIBERATELY still `🔲 Backlog`.** **Scheduled is not started: nobody is building this.** The owner
ruled *when this is worked*, not that it has begun. The status changes when a plan is approved and
work actually starts.~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN, and it was the
right call for exactly as long as it held.** 🔴 **The condition it named has now been met by ruling:
the owner has ruled the build STARTS.** See the box above for the token actually chosen and its
honest limits.

### 🔴 SEQUENCING CONSTRAINT INSIDE SPRINT 4 — OWNER RULING, 2026-09-04. READ BEFORE SHIPPING.

> ~~⛔ **THIS TASK MUST NOT SHIP before
> [`0208`](../../done/0208-measure-clientless-leader-at-win-condition-in-production/brief.md) has been
> DEPLOYED and has GATHERED DATA.**~~ ✅ **SATISFIED AND CLEARED 2026-09-11 — see the box
> immediately below.** 📌 **Struck, not deleted; TRUE WHEN WRITTEN.**

> ## ✅ 2026-09-11 — SHIP GATE **CLEARED** BY OWNER RULING
>
> ✅ **CLEARED 2026-09-11 by an owner ruling given live in the lead session.** The owner was put
> the open decision recorded in [`0208`'s brief](../../done/0208-measure-clientless-leader-at-win-condition-in-production/brief.md)
> — that the per-match stall rate is not derivable from `Match:WinCondition` at any confidence, and
> that only a server-side *"ended with no winner"* counter would close it — and **chose to accept
> `0208` Part A's number as a DIRECTIONAL LOWER BOUND and to BUILD NO SERVER-SIDE COUNTER.**
>
> **The owner's accepted wording, verbatim:** *"Take 52% as directional evidence that the Team-mode
> stall is real and common — which is enough to justify `0211` — and don't build more measurement.
> `0211` can ship. You never get a precise pre-fix stall rate."*
>
> 🚨 **THE COST THE OWNER KNOWINGLY ACCEPTED, in those terms and not softer: the PER-MATCH
> STALL RATE WILL NEVER BE KNOWN, and the PRE-FIX DENOMINATOR IS GONE THE MOMENT THIS TASK SHIPS.**
> This is a **permanent, irreversible loss of a measurement, accepted deliberately — not an
> oversight.** ⛔ **DO NOT RE-PROPOSE IT LATER AS A GAP SOMEONE SHOULD CLOSE.**
>
> ⚠️ **THE CAVEAT STILL TRAVELS WITH THE NUMBER WHEREVER THE 52 % GOES.**
> *"52 % of Team matches stalled"* remains an **UNSUPPORTED CLAIM**. **Accepted-as-directional is
> NOT accepted-as-a-match-rate.** The defensible sentence stays **verbatim**: *"in 52 % of measured
> Team-mode client-matches that reached the win condition, the leader at that moment was the all-bot
> team, and no winner could be declared at that moment."*
>
> ⚠️ **CLEARING THE GATE IS NOT SCHEDULING THE WORK.** This task's status stays
> **`🔲 Backlog`** and ⛔ **NOBODY IS BUILDING IT.** The ruling removed a ship constraint; it
> did not start the work, assign it, or change its rank.
>
> ⛔ **WHAT THIS RULING DOES NOT COVER:** `0208`'s **Part B** (the Singleplayer
> platform-leaderboard award incidence — still unread, being put to the owner separately), `0208`'s
> **`V18`** manual mid-match reload play-test (still never run), and `0208`'s own status, which
> **stays `🚧 Blocked`**. **This ruling clears THIS task's gate; it does not close `0208`.**
>
> ⛔ **THE RECORD BELOW IS KEPT, NOT DELETED — struck and answered in place, so the reasoning that
> made this a live question stays visible.**

> ## ~~📌 2026-09-11 — `0208`'s NUMBER HAS BEEN READ. ⛔ THE GATE IS **NOT** DECLARED CLEARED.~~ 📌 SPENT 2026-09-11 — SUPERSEDED BY THE RULING ABOVE; struck, not deleted; TRUE WHEN WRITTEN.
>
> **What is now fact:** `0208` is **deployed** (build `0.0.141`, 2026-09-05) **and its Part A
> deliverable — the clientless-leader split — was READ on 2026-09-11**, over **4–10 September 2026,
> full days**, off the GameAnalytics dashboard in the owner's browser. Recorded in full in
> [`0208`'s brief](../../done/0208-measure-clientless-leader-at-win-condition-in-production/brief.md),
> `## Status` → *🟢 THE MEASUREMENT*.
>
> 🔴 **THE UNIT IS CLIENT-MATCHES, NOT MATCHES — one event per client per match, so absolute counts are
> uninterpretable and only ratios are safe.** Headline ratios, **all lower bounds**: **Team
> clientless-in-front 53.2 %**, **Team stall-capable 52.4 %**, **FFA clientless-in-front 1.6 %**,
> **overall 29.1 %**. **Figures are as the dashboard rounds them — approximate, not exact.**
>
> ### ~~⛔ WHY THE PRODUCER IS NOT DECLARING THE GATE CLEARED~~ ✅ ANSWERED 2026-09-11 — THE OWNER DECLARED IT CLEARED
>
> ⛔ **The scope question below is CLOSED BY DECISION, not by being answered** — the owner accepted the number as directional and ruled that no further measurement be built. 📌 **Struck, not deleted; TRUE WHEN WRITTEN.**
>
> **A live scope question was raised by the coder and is UNANSWERED:** `Match:WinCondition` latches at
> the **first crossing** and records **who was first past the post, not how the match ENDED**, so
> *"52 % of Team matches stalled"* **is not a supported claim** and **the net bias magnitude is not
> establishable from this event.** ⚠️ **The per-match stall rate — which is what this gate exists to
> protect — is therefore NOT derivable from `0208`'s number at any confidence.** A **server-side
> "ended with no winner" counter** is the only thing that would produce it.
>
> **The defensible sentence, verbatim:** *"in 52 % of measured Team-mode client-matches that reached the
> win condition, the leader at that moment was the all-bot team, and no winner could be declared at that
> moment."*
>
> | | |
> |---|---|
> | ✅ **Satisfied on the letter of the ruling** | `0208` is **deployed** and **has gathered data**, and the deliverable split **has been read**. |
> | ⛔ **NOT settled** | Whether this number is **the one the owner actually wanted**. It is a **client-match, first-past-the-post lower bound**, not a per-match stall rate. |
> | 🔴 **Status of the gate** | ~~**READY FOR THE OWNER'S CALL.** ⛔ **NOT cleared by any agent.**~~ ✅ **CLEARED 2026-09-11 BY OWNER RULING** (accept as a directional lower bound; no server-side counter). ⚠️ **Cleared is not scheduled — status stays `🔲 Backlog`, nobody is building it.** |
>
> ⚠️ **Nothing here changes this task's status** — it remains `🔲 Backlog`, still not `🚧 Blocked`, and
> planning and building it are still explicitly allowed. ~~**Only the SHIP waits, and it waits on the
> owner's ruling now rather than on a dashboard read.**~~ 📌 **SPENT 2026-09-11 — the owner ruled;
> THE SHIP NO LONGER WAITS.** ⚠️ **And still nothing is scheduled: the status stays
> `🔲 Backlog` and nobody is building it.**

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

> ## 🚩 2026-09-11 — THIS PRECONDITION AND THE "BUILD IT" RULING PULL AGAINST EACH OTHER. FLAGGED, NOT RESOLVED.
>
> 🔴 **The owner ruled 2026-09-11 that this task is picked up and the build starts.** ⛔ **They did NOT
> lift the precondition written directly above, and the producer has NOT lifted it either — that is
> not a producer's call to make.**
>
> **What is actually satisfied, checked 2026-09-11:**
>
> | Precondition | State |
> |---|---|
> | Architect's report **read** | ⚠️ **Unknown** — a fact about the implementation session, which has not begun |
> | Owner reviewed the **phase-1 findings** | ⛔ **NO — phase 1 has never been run.** It is part of the work itself (see *Investigation (phase 1)*) |
> | Open questions in **this brief** answered | ✅ **YES.** All five are ruled or closed by decision — see *🚩 Open questions* |
> | Open questions in the report's **§11** answered | ⚠️ **MOSTLY, NOT ENTIRELY — two sub-questions have NO recorded answer:** |
>
> 🚩 **The two §11 residuals, named so they are not lost:**
> 1. **§11 q3's second half — a MINIMUM-PARTICIPATION FLOOR** (*"or should there be a minimum-participation
>    floor, e.g. survived N ticks?"*). ⚠️ **The 2026-09-10 ruling settled the AMOUNT (1 XP); it said
>    NOTHING about a floor.** The architect's own framing stands and was never dismissed: a player who
>    dies **30 seconds in** is paid **the same** as one who plays to the end — **true at 10, equally
>    true at 1.** ⛔ **Nothing in this brief addresses it.**
> 2. **§11 q4's second half — MEMORY GROWTH**: an **unbounded `turns` array for up to 3 hours** in a
>    stalled match. The architect's read: *"should not be left indefinitely, independent of the winner
>    question."* ⚠️ **The 2026-09-10 stall ruling was a HOLD on filing a stall BRIEF; it did not
>    address the memory cost.** ⛔ **Nothing in this brief addresses it either.**
>
> ⚠️ **NEITHER IS A NEW DECISION AN AGENT MAY TAKE, and neither is being presented as blocking.**
> **The honest position:** the *"build it"* ruling is about **when the work starts**; this
> precondition is about **what must be answered first**, and the two have not been reconciled by
> anybody. 🔴 **Put both residuals to the owner at plan time and get an answer before writing code** —
> a floor, in particular, changes what gets built, not just what it is worth.

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
   `handleWinner` — the `this.creditMatchXp(potentialWinner.winner);` line in
   `src/server/GameServer.ts`. No `handleWinner` ⇒ no crediting, ever.
5. **The stall is real and independent of `0206`.** With every human eliminated, a **Nation reached
   100.0 % of the map and the match still did not end.** Mechanism, ✅ **producer-verified this turn
   against committed `8f6e478`**: `players()` filters to `isAlive()`
   (`src/core/game/GameImpl.ts`, the `players(): Player[]` method), so dead players are absent from
   the sorted list, `find`
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

> `src/server/ProfileApiClient.ts`, the file-header contract comment — *"`(game_id,
> yandex_player_id)` idempotency key makes retries safe (a duplicate is …)"*

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

### 🔴 6. REQUIRED — the ADR-101 supersede gate. Owner ruling, 2026-09-11, given live in session.

> **When `0211`'s plan picks the survivor mechanism, re-read ADR-101's "blast radius is one match, not
> a backlog" consequence and its batch/pre-validation rationale, and decide then whether a superseding
> ADR ships with this task.**

⛔ **This is a REQUIREMENT of the plan, not a note and not a "consider".** The plan is not complete
until it states the decision — *superseding ADR ships with `0211`*, or *it does not, and here is why*.
A plan that picks a survivor mechanism and is silent on this has not done the step.

**Why it cannot be answered earlier — the reason is specific, not procedural.** `0211` **moves the
crediting trigger**. Today the fail-soft path is called **once per match, as one batch at match end**.
After `0211` it is called on elimination, plus **whatever the survivor trigger turns out to be** — which
means calls **spread through a match** rather than one batch at the end. That change in *when and how
often* the fail-soft path runs bears directly on three parts of ADR-101
(`ai-agents/knowledge-base/decisions/adr-101-fail-soft-xp-crediting-no-durable-queue.md`):

- the **"blast radius is one match, not a backlog"** consequence,
- the sizing of the **3-attempt retry budget**,
- the **per-item pre-validation rationale**, which assumes a **multi-item batch** — a per-player call
  has no other items to protect.

**The survivor mechanism is open by the owner's own ruling** (Ruling 1 above: *"THIS RULING STATES A
REQUIREMENT, NOT A MECHANISM. The trigger is the PLAN'S to choose"*). The supersede answer **depends on
which mechanism is chosen**, so it cannot be settled before the plan picks one. That is why it is a
pre-committed gate at plan time rather than a decision made now.

⛔ **This is SEPARATE from the ADR-101 clarification applied under the same day's Ruling A.** That
clarification settles the **figures** — that the 10 XP / 1,000 XP numbers in ADR-101's body are the
pre-`0211` economy, that the decision itself is unchanged, and that the ~100-matches-to-citizenship
**ratio** its reasoning rests on is unchanged by design. It **explicitly does NOT settle the trigger
question**, and must not be cited as having done so.

⚠️ **The architect's own framing, inherited here so the implementer has it:** the clarification's text
flags this as *"a candidate for a SUPERSEDING ADR and it is not this one."*

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
  the `this.creditMatchXp(potentialWinner.winner);` line in `src/server/GameServer.ts`, inside
  `handleWinner`. ✅ Producer-verified this turn against
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
  `0205`'s status, scope or rank** — ~~the owner has not ruled on them.~~ 📌 **AMENDED 2026-09-11:
  the instruction STANDS, but its reason is now partly spent — the owner HAS ruled on the rank, which
  is `Medium` since 2026-09-11 (producer's value, owner-approved). Status, scope and folder remain
  unruled and untouched.**
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
  `src/server/GameServer.ts` at its `private creditMatchXp(` declaration; solo runs on
  `src/client/LocalServer.ts`, which has no crediting
  code — ✅ producer-verified). ⛔ **`0211` moves the crediting trigger, so `0211` is exactly the task
  that could break it. Do not introduce Singleplayer crediting.** ⚠️ **The property is UNENFORCED —
  no guard, no test, no comment** — so a green suite does not prove it survived. See the scope box at
  the top and the *unenforced* note in **Notes**.
- ~~🔴 **XP AMOUNT: HOLD AT 10 FLAT — owner ruling, 2026-09-04. A deliberate hold, not an oversight.**
  *"Do not change two things at once"* — ship the crediting fix at the existing amount, see the data,
  then tune.~~
  🔴🔴 **SUPERSEDED 2026-09-10 — XP AMOUNT IS **1 FLAT**, AND IT IS **IN SCOPE OF THIS TASK**.**
  Owner ruling given live in session, **reversing their own 2026-09-04 ruling above** (struck, not
  deleted — it was correct when given and is now spent).
  **Verbatim:** *"My decision is that instead of 10, we should give 1 XP. The logic is: if in the
  future we would like to change it, the players will be more willingly accepting if we change the
  amount of given XP in the greater side, rather than in the smaller. If we change it to 1XP, then the
  amount of XP that is needed to be collected to get citizenship also should be 10x smaller."*
  🚨 **The reasoning is part of the requirement: awards may later move UP, never DOWN. Do not treat
  `1` as an arbitrary constant.**
  🔴 **SECOND, FIRM REQUIREMENT — DIVIDE THE CITIZENSHIP XP THRESHOLD BY EXACTLY 10**, so
  time-to-citizenship is **unchanged**. ⛔ **"Roughly 10x" is not the ruling.**
  📍 **WHERE THEY LIVE — ✅ producer-verified READ-ONLY on 2026-09-10, nothing changed:**
  `src/core/profile/Citizenship.ts` declares `CITIZENSHIP_XP_THRESHOLD = 1000` and
  `XP_PER_MATCH = 10` — those two declaration lines are the anchors. Its own header calls it
  *"the single source of truth"*, shared by the
  client and the profile server. ⇒ **1000 → 100, and 10 → 1.**
  ⚠️ **THAT POINTER IS A STARTING POINT, NOT THE SCOPE.** 🚨 **The producer did NOT trace the
  consumers.** **At plan time, find EVERY reader of both constants** — the crediting SQL, the client
  card, any test fixture or seeded value that hardcodes `10` or `1000` instead of importing them —
  because a hardcoded copy will silently keep the old economy. ⛔ **The producer changed NO config and
  NO source; this bullet records SCOPE.**
  🔴 **THIRD, FIRM REQUIREMENT — ADDED 2026-09-11 BY OWNER RULING (live in session, relayed through
  the spawning session): RESCALE THE PLAYER-FACING COPY IN THE SAME CHANGE.** ✅ **A REQUIREMENT, not
  a note and not a "consider".** **Every user-visible string that STATES the citizenship XP threshold
  (or the per-match award) must be rescaled here**, in **BOTH** `resources/lang/en.json` **and**
  `resources/lang/ru.json` — the project's standing rule already requires those two to stay in sync.
  **Owner's reasoning:** this task already carries *divide the threshold by exactly 10*, so **the
  strings that state that threshold to players belong in the same change — they ship or break
  together, and splitting them is how one gets forgotten.**
  ⛔ **NO LINE-NUMBER LIST, DELIBERATELY.** Line numbers drift and
  [`0017`](../0017-citizenship-earned/brief.md)'s have already been corrected twice this week.
  **Locate the strings by CONTENT/KEY and SWEEP both language files for the figures at plan time** —
  do not trust any enumerated list, including this bullet's pointer.
  📍 **Starting point, NOT the scope:** the `citizenship_earned` inbox copy (`inbox_body`, stating the
  threshold in both languages) is drafted in `0017`'s **Localization** section and its **Part B**
  table. ⚠️ **`0017` still carries other pre-rescale figures in its own prose and SQL snippets; those
  are `0211`'s to correct when it ships — `0017` is NOT being edited to match, by ruling.**
  🚨 **The producer touched NO localisation file and NO source; this records SCOPE only.**
  🔴 **BOTH SHIP INSIDE `0211`, TOGETHER WITH THE TRIGGER CHANGE — owner-ruled when the producer put
  the scope question to them.** 🚨 **ACCEPTED COST, SHOWN TO THE OWNER BEFORE THEY CHOSE: a
  post-deploy XP anomaly CANNOT be attributed between the trigger change and the amount change.**
  ⛔ **That is an ACCEPTED COST, NOT A DEFECT — do not re-litigate it, and do not split the task to
  "make it attributable". The owner declined a separate task both before and after.**
  ⚠️ **The architect's point stands and is recorded, not dismissed:** the trigger moving earlier
  **changes what the number means** — dying 30 seconds in now pays the same as playing to the end.
  **True at 10, equally true at 1.** ⛔ **Do not introduce scaling in this task** — the amount is
  **flat 1**.
- 🔴 **THE LEAVER RULE IS DELIBERATELY REVERSED FOR ELIMINATED PLAYERS — owner ruling, 2026-09-04.
  ⛔ DO NOT "FIX" THIS BACK.** Today, `qualifiesForMatchXp` in `src/core/profile/MatchQualification.ts`
  (the `export function qualifiesForMatchXp` declaration and the doc comment immediately above it,
  ✅ producer-verified against committed `8f6e478`) returns
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

4b. 🔴 **ADDED 2026-09-10 BY OWNER RULING — THE AMOUNT CREDITED IS **1 XP**, AND THE CITIZENSHIP XP
   THRESHOLD IS DIVIDED BY EXACTLY 10.** *(Numbered `4b` so the step numbers below stay stable.)*
   - **Every crediting path in scope pays `1`, not `10`** — proven by test, not by reading the diff.
   - 🔴 **The citizenship threshold is EXACTLY one tenth of its previous value**, so
     **time-to-citizenship is unchanged.** ⛔ **"About a tenth" fails this step.**
   - ⚠️ **State in the worklog WHERE the threshold lives in config and what it moved from and to.**
     🚨 **The producer did NOT locate it — finding it is plan-time work, and the brief deliberately
     does not name a file it has not verified.**
   - 🚨 **ACCEPTED COST, RECORDED SO IT IS NOT REPORTED AS A DEFECT LATER: because the trigger change
     and the amount change ship together, a post-deploy XP anomaly CANNOT be attributed between them.**
     ⛔ **The owner was shown this before choosing and accepted it. Do not re-litigate it and do not
     split the task.**

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
     (`src/server/GameServer.ts`, its `private creditMatchXp(` declaration) — it runs on
     `src/client/LocalServer.ts`, which has no crediting
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
   renumbered so the step numbers below stay stable.)* ⚠️ **Label collision, pre-existing and left
   alone: there are TWO steps labelled `4b` in this section** — this one and the XP-amount step above.
   **Identify them by content, not by label**; renumbering would break the stability the labels exist
   to protect.

4d. 🔴 **ADDED 2026-09-11 BY OWNER RULING — NO USER-VISIBLE STRING STILL STATES A PRE-RESCALE XP
   FIGURE.** *(Numbered `4d` so the step numbers below stay stable. It verifies the copy half of the
   rescale in `4b` above.)*
   - **Sweep BOTH `resources/lang/en.json` AND `resources/lang/ru.json`** for any string stating the
     citizenship XP threshold or the per-match XP award. ⛔ **After this change, NONE may state a
     pre-rescale figure — in either language.**
   - ⚠️ **Both files, every time.** The project's standing rule is that `en.json` and `ru.json` stay
     in sync; 🚨 **a figure corrected in one and missed in the other FAILS this step** — it is not a
     detail to be tidied later. Russian copy may format the number differently (for example a space as
     the thousands separator), so **sweep for the FIGURE, not for an English-formatted literal.**
   - ⛔ **Do NOT verify this against a list of line numbers** — line numbers drift. Sweep the files.
   - ⚠️ **Reading the diff is NOT this step.** The failure mode this step exists to catch is a string
     that was **never touched at all**, which a diff review cannot see.

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
  - [`0208`](../../done/0208-measure-clientless-leader-at-win-condition-in-production/brief.md) — would measure
    how often this happens in production. ✅ **Its Part A decay clock has STOPPED**, because `0206`
    never deployed; scheduling **this** task is what would restart one.
  - [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md) — the Team-mode form of the
    stall. ~~⚠️ **The XP loss is not FFA-specific**; whether this task covers Team mode is an open
    question below.~~ ✅ **RULED 2026-09-04 — Team mode IS covered by this task. Struck, not deleted.**
    ⛔ **The two tasks are NOT merged and answer different questions:** `0205` is a **resolution
    policy** question (*who should win a stalled Team match?*); `0211` is **crediting** (*do those
    players get their XP?*). ⚠️ **`0211` may make part of `0205`'s justification moot** — if XP is
    credited regardless of who wins, one of `0205`'s reasons to exist weakens — **but it does NOT
    settle `0205`'s own question.** ~~⛔ **`0205`'s status, scope and rank are UNCHANGED and were not
    touched; the owner has not ruled on them.**~~ 📌 **CORRECTED 2026-09-11 — struck, not deleted;
    true when written (2026-09-04).** Status, scope and folder are **still** unchanged; the **rank is
    not** — it is **`Medium`** since 2026-09-11, the producer's proposed value approved by the owner
    after the owner ruled that it be re-ranked. ✅ A reciprocal cross-reference was added to `0205`'s
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
  Solo credits no XP purely because `creditMatchXp` (`src/server/GameServer.ts`, its
  `private creditMatchXp(` declaration) is unreachable
  from `src/client/LocalServer.ts`, which has no crediting code.
  ⚠️ **CORRECTION, made by the producer against its own earlier text:** an earlier revision of this
  bullet claimed `GameServer.ts` contains *"zero occurrences of `GameType`/`gameType`/`Singleplayer`"*.
  **That was WRONG.** ✅ Re-verified 2026-09-04: `GameServer.ts` has **six** `GameType` occurrences
  (`src/server/GameServer.ts:7,113,194,877,895,933` — **line numbers deliberately kept here, framed
  at commit `22bbe39`, because the anchor `GameType` recurs 6× in this file, which is exactly the
  claim; re-verified by reading the file 2026-09-11**), **all `GameType.Public` checks and all above the
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

🔴 **UPDATED 2026-09-10 — items 3, 4 and 5 moved again.** **Item 4 (XP amount) was REVERSED by the
owner's own later ruling: the amount is now **1 XP**, not 10, and the tuning question is CLOSED BY
DECISION rather than by filing a task.** **Items 3 and 5 (the match stall) are RULED as a HOLD — no
separate brief, deliberately, with a recorded reopen condition.** ⛔ **All prior text struck, not
deleted.** ✅ **NOTHING IN THIS LIST REMAINS OPEN except the architect's own §11 questions noted at the
foot.**

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
   ~~🚩 **What remains open here: whether the stall gets a task of its own.** ⛔ **No separate stall
   brief has been filed, deliberately** — the owner has not ruled on one, and filing one now could be
   read as pre-empting the mechanism choice.~~
   ✅ **RULED 2026-09-10 — HOLD, no brief; see item 5 below for the ruling and its reopen condition.**
4. ~~🚩 **STILL OPEN — How much XP, and on what basis?** … **undecided** — ⚠️ and Ruling 1 adds the
   same question for SURVIVORS of a match that never ends.~~
   ~~✅ **ANSWERED 2026-09-04 — HOLD AT 10 FLAT; the decision is DEFERRED, not made.** Owner's reasoning:
   **do not change two things at once** — ship the crediting fix at the existing amount, see the data,
   then tune. ⛔ **Record this as a DELIBERATE HOLD, not an oversight.**~~
   🔴🔴 **SUPERSEDED 2026-09-10 — THE ANSWER IS NOW **1 XP**, AND THIS REVERSES THE OWNER'S OWN
   EARLIER RULING.** Given live in session and relayed through the spawning session. ⛔ **The 2026-09-04
   answer is STRUCK, NOT DELETED — it was CORRECT WHEN GIVEN and is now SPENT.**
   **Owner, verbatim:** *"My decision is that instead of 10, we should give 1 XP. The logic is: if in
   the future we would like to change it, the players will be more willingly accepting if we change the
   amount of given XP in the greater side, rather than in the smaller. If we change it to 1XP, then the
   amount of XP that is needed to be collected to get citizenship also should be 10x smaller."*
   🚨 **The REASONING is part of the record, not just the number** — it justifies the **direction** of
   any future change: **awards may go UP, never DOWN.**
   🔴 **THRESHOLD: the citizenship XP requirement is divided by EXACTLY 10** so time-to-citizenship is
   unchanged. **A requirement of `0211`.** ⚠️ **Its current value must be located in config AT PLAN
   TIME — the producer changed no config or source.**
   🔴 **SCOPE, owner-ruled: FOLDED INTO `0211`** — trigger and amount ship together. 🚨 **ACCEPTED
   COST, shown to the owner before they chose: a post-deploy XP anomaly cannot be attributed between
   the two changes. NOT a defect; NOT to be re-litigated.** Both alternatives (a separate task before,
   or after) were **declined**.
   ⚠️ **The architect's point STANDS and is not dismissed:** moving the trigger earlier **changes what
   the number means** — a player who dies **30 seconds in** is paid **the same** as one who plays to
   the end. **True at 10; equally true at 1.**
   ~~🚩 **Genuinely still open: the tuning itself, after data.** No task exists for it and none was
   filed — the owner has not ruled on one.~~
   ✅ **CLOSED 2026-09-10 BY DECISION, NOT BY FILING A TASK.** ⛔ **Do not file an XP-amount tuning
   task and do not report this as an unfiled gap** — the owner decided the amount instead of deferring
   it to data.
5. ~~🚩 **STILL OPEN — does the stall get a task of its own?** ⛔ **No separate stall brief has been
   filed, deliberately** — the owner has not ruled on one, and filing it now could be read as
   pre-empting the survivor mechanism choice (see the considered-but-not-chosen note above).~~
   ✅ **RULED 2026-09-10 — HOLD. NO SEPARATE BRIEF IS FILED, AND THIS IS NOW AN OWNER RULING.** Given
   live in session and relayed through the spawning session. 🚨 **This CONFIRMS the existing deliberate
   non-filing — ⛔ STOP READING THE ABSENT BRIEF AS AN OVERSIGHT OR A GAP. It is a decision.**
   **Owner's stated reasoning:** *"fix the stall"* remains a **legitimate candidate mechanism for
   `0211`'s own survivor-mechanism choice**, and filing a brief now could **pre-empt** that choice.
   🔴 **REOPEN CONDITION, RECORDED: file the stall brief IF `0211`'s plan picks a mechanism OTHER THAN
   fixing the stall.**

📎 **Separately, the architect's report carries its OWN open questions for the owner (its §11).** They
are **not** answered here and **not** duplicated into this list — **the coordinator is putting them to
the owner directly.** **Both lists need answers.**
