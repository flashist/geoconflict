# Measure how often a clientless leader is in front when the win condition fires — in production

> # 🔴 2026-09-04 — `0206` WAS REVERTED. READ THIS BEFORE PLANNING PART A.
>
> **Owner ruling given live in session, 2026-09-04.** `0206`'s row still reads `✅ Done` — **correctly,
> the work was done** — **but its behaviour was reverted before it ever reached a player and was NEVER
> DEPLOYED.** ⛔ **Do not read `0206` as shipped anywhere in this brief.**
>
> **Why:** the plan's **premise** was disproved by measurement. `0206` was **not** defective, and it did
> **not** cause the stall.
>
> ### What this changes for THIS task — and it is good news, twice over
>
> 1. ✅ **PART A'S CLOCK HAS STOPPED. The decay this brief flags is NOT running.** This brief's
>    *Sequencing* note says Part A's value decays **on deploy** — and `0206` will not deploy. **The
>    pre-fix multiplayer question — *"how often does the stall happen today?"* — is STILL ANSWERABLE,
>    and the denominator is still the pre-fix one.** ⚠️ **The urgency has eased; it has not vanished** —
>    the replacement, [`0211`](../../backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md),
>    ~~is unscheduled but real~~ — ✅ **CORRECTED 2026-09-04: `0211` is SCHEDULED INTO SPRINT 4**
>    (owner ruling, live in session); **struck, not deleted — spent, not wrong** — and it will restart
>    a clock of its own when it ships. 🔴 **AND THAT CLOCK IS THE REASON THIS TASK IS ORDERED FIRST:**
>    ⛔ **`0211` must not SHIP until THIS task is DEPLOYED AND COLLECTING DATA** (owner ruling,
>    2026-09-04) — ⚠️ **"deployed and collecting", NOT merely merged or built.** ✅ **`0211` may be
>    planned and built in parallel.** ~~⚠️ **Neither task is `🚧 Blocked`.**~~ 📌 **AMENDED
>    2026-09-04 — struck, not deleted; TRUE WHEN WRITTEN, and true in the sense it was written in.**
>    ✅ **`0211` is still NOT `🚧 Blocked`, and the SEQUENCING RULING still blocks nothing** — that is
>    the claim this line was making and it is unchanged. ⛔ **But `0208` IS now `🚧 Blocked`, for an
>    UNRELATED reason: it is built and reviewed but NOT DEPLOYED and NOT COMMITTED**, so it cannot
>    proceed without the owner. **See the `## Status` section.**
> 2. 🔴 **THE MEASUREMENT IS NOW MORE VALUABLE, NOT LESS.** `0206` was reverted because a live
>    investigation measured its premise and found it wrong. **This task is that same class of work,
>    done systematically.** The 2026-09-04 finding — a Nation reaching **100.0 %** with the match not
>    ending, because `players()` filters to `isAlive()` (`src/core/game/GameImpl.ts:421-423`) — is
>    exactly the kind of thing production instrumentation would have surfaced before a task was
>    scheduled on a wrong premise.
>
> ### ⚠️ One measurement-design consequence, and it is concrete
>
> **The decision point this brief tells you to instrument is not sufficient on its own.** §1 says
> *"instrument the DECISION POINT, not the guard's early return"* — that instruction still stands and
> is still right. **But the 2026-09-04 finding shows the win condition can fail to fire AT ALL** when
> every clientful player is dead: there is no leader to be "in front", so a decision-point counter
> keyed on *"who leads when the win condition fires"* **would never have counted the 100 % case.**
> ~~⚠️ **Consider whether Part A also needs a counter for matches that terminate with NO winner
> declared** — `GameServer.end()` runs on every termination and is a candidate site. 📌 **This is
> flagged as a design input, NOT a ruling and NOT a scope change** — the owner has not ruled on it and
> this brief's scope is unchanged. Raise it at plan time.~~
>
> ⛔ **CLOSED BY DECISION 2026-09-11 — NOT closed by being answered.** The owner ruled **option B:
> accept `0208` Part A's number as a directional lower bound and BUILD NO SERVER-SIDE COUNTER.**
> 📌 **Struck, not deleted; TRUE WHEN WRITTEN.** This design input, first raised here on
> 2026-09-04, is now settled and ⛔ **must not be re-raised at plan time or re-proposed later as a
> gap someone should close.**
>
> 🚨 **THE COST THE OWNER KNOWINGLY ACCEPTED, in those terms and not softer: the PER-MATCH STALL RATE WILL NEVER BE KNOWN, and the PRE-FIX DENOMINATOR IS GONE THE MOMENT `0211` SHIPS.** This is a **permanent, irreversible loss of a measurement, accepted deliberately — not an oversight.** ⛔ **DO NOT RE-PROPOSE IT LATER AS A GAP SOMEONE SHOULD CLOSE.**
>
> 📎 Full record: the `0206` row on [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md) and the STOP
> box at the top of
> [`0206`'s brief](../0206-ffa-timer-expiry-award-to-top-client-player/brief.md).
> ⚠️ **This box was added by the producer; the rest of this brief below is UNEDITED by it** except for
> two marked spots — the consumer table and the *Sequencing* note — which asserted `0206`'s deploy
> clock and would otherwise mislead.

> 📌 **SCOPE WIDENED 2026-09-03 by owner ruling, given live in session: *"Add it — measure both."***
>
> This task now has **two halves**, and they are **not the same measurement**:
>
> | | Half | Where it lives |
> |---|---|---|
> | **A** | **Multiplayer clientless-leader incidence** — the task as originally filed. FFA and Team, threshold and timer branches. | *What to measure — Part A* |
> | **B** | **Singleplayer platform-leaderboard award incidence** — how often the client awards platform-leaderboard points from **non-tutorial Singleplayer**, via **both** `reportPlacements()` **and** `reportParticipation()`. | *What to measure — Part B* |
>
> **The owner's reasoning, recorded because it is the reason Part B has a closing window:**
> [`0210`](../../backlog/0210-singleplayer-platform-leaderboard-reporting-policy/brief.md) was ruled the same day —
> **Singleplayer reports nothing to the platform leaderboard.** The moment that guard ships, **how often
> it was happening becomes permanently unobservable.** It is the **same value-decay this brief already
> flags against `0206`** (see *Sequencing* in the Notes), now applying to `0210` as well. Measuring first
> tells the owner **how much farming was actually happening** — which is the evidence for whether `0210`
> mattered at all.
>
> 🔴 **This does NOT gate `0210`. Say so out loud wherever this task is discussed.** The owner's `0210`
> ruling was **not conditioned on incidence** — they judged farmability decisive regardless of how rare
> solo play turns out to be (see `0210`'s rejection of option C). The guard is right either way. This is
> **retrospective evidence: valuable, not blocking.** ⛔ **Do not turn `0210` into a dependent task, do
> not add a "blocked by `0208`" marker to it, and do not hold its plan waiting for a number.**
>
> ⚠️ **The folder name was deliberately NOT changed.** It still reads
> `0208-measure-clientless-leader-at-win-condition-in-production`, which now under-describes the task.
> Renaming would break every inbound link — including the ones `0206`'s close re-pointed a few minutes
> before this edit. **The scope is what this section says, not what the folder name says.**

## ID
0208

> ℹ️ **ID allocation, checked 2026-09-03 before filing. `0208` is free.** The full four-check
> procedure was run — the same one `0207` used — **because this project has been bitten by an
> invisible reservation once already** and boards alone cannot see it:
>
> 1. **Task folders.** `ai-agents/tasks/{backlog,done,cancelled}/` — highest ID in use is **`0207`**.
> 2. **All boards.** [`backlog.md`](../../../sprints/backlog.md),
>    [`sprint-backlog.md`](../../../sprints/sprint-backlog.md),
>    [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md) / `-5` / `-6`,
>    [`plan-index.md`](../../../sprints/plan-index.md) — highest referenced is **`0207`**
>    (plus `0204`, which is board-visible only as the reservation note on `0205`/`0207`).
> 3. ⚠️ **`grep -rn` over `.claude/`** — **the check that matters, and the one boards miss.** Hits:
>    `0202` and `0204` in `.claude/skills/fkit-sprint-ship-loop/SKILL.md`, and `0241`–`0247` /
>    `0264` / `0265` in `.claude/skills/fkit-heal/`. ⚠️ **The `024x`/`026x` hits are the fkit
>    toolkit's OWN task numbering inside installed upstream skill files, not this project's board** —
>    they are recorded here so a future allocator does not re-derive that from scratch, **and so
>    nobody quietly treats them as free either.** **No hit on `0208`.**
> 4. **Repo-wide** `grep -rn "0208" .` (excluding `.git/`, `node_modules/`) → **two hits, neither a
>    task ID**: a coordinate substring inside `resources/images/MushroomCloudIconWhite.svg`, and the
>    line in [`0207`'s own brief](../../backlog/0207-winmodal-participation-comment-ai-player-correction/brief.md)
>    recording that `0208` was free when `0207` was filed.
>
> ⛔ **`0204` is NOT free and was NOT considered.** It is reserved **invisibly** by the plan-carry-check
> hook task, which exists only as prose in `.claude/skills/fkit-sprint-ship-loop/SKILL.md` and was
> never filed as a brief, so no board can see it. **Do not allocate `0204` to anything else, and do not
> edit those skill-file references.**

## Sprint
**Sprint 4 — SCHEDULED.** Tracked on [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md).

~~Backlog — **unscheduled**. Filed on [`backlog.md`](../../../sprints/backlog.md).~~

~~**Board chosen honestly, and it is the owner's explicit instruction, not an inference:** the ruling
was *"File a brief, don't schedule."* Filing it on
[`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md) would assert a sprint commitment the owner
deliberately withheld. Same board reasoning as `0203`, `0205` and `0207`.~~
**Row appended, not inserted** (ADR-035) — at filing on `backlog.md`, and again on `plan-sprint-4.md`
at the 2026-09-04 promotion, for the same reason.

➡️ **PROMOTED INTO SPRINT 4 — owner ruling given live in session, 2026-09-04. Struck, not deleted.**

🔴 **THIS REVERSES THE 2026-09-03 RULING ABOVE — say that plainly.** ⛔ **The earlier ruling was NOT
wrong; it is SPENT.** *"File a brief, don't schedule"* was correct for the day it was given, and the
board reasoning built on it was correct too. **What changed is not the judgment — it is what now
depends on this number.**

**The owner's reasoning, recorded because it is why the RANK did not drive this:**

> **`0208` is now load-bearing for THREE separate decisions, not one.**

1. 🔴 **It is ADR-110's RE-RAISE TRIGGER.** The architect corrected that pointer on 2026-09-04 — see
   *ADR-110's re-raise trigger now points here* in the Notes.
2. **It scopes [`0211`](../../backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md)** — by
   answering **whether stalled-match survivors are a real population**, which matters now that
   survivors are in `0211`'s scope.
3. **It caps [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md)'s rank**, which has
   always been held down by unmeasured frequency.

⏳ **Plus the closing window:** **Part B's measurement dies when
[`0210`](../../backlog/0210-singleplayer-platform-leaderboard-reporting-policy/brief.md)'s guard ships.**
📌 **Plus a planning reason:** planning this alongside `0211` **avoids two plans reasoning about the
same crediting path.**

⚠️ **Scheduled is NOT started.** The status stays `🔲 Backlog` — **nobody is building this.**

~~⚠️ **The owner ruled SCHEDULING ONLY, not rank.** See *Priority* — `Medium` is still the producer's,
last set 2026-09-03 on the scope widening and **untouched by this promotion.**~~

✅ **RANK UPDATED 2026-09-04 — struck, not deleted. The struck text was TRUE WHEN WRITTEN and was
SPENT by a SECOND owner ruling later the same day.** It described the **scheduling** ruling correctly:
that ruling did not touch the rank, and **this promotion still did not.** A **separate** ruling that
day did. **The rank is now `High` — see *Priority*, which is authoritative.** ⚠️ **SPLIT
PROVENANCE:** **THAT it be raised = an OWNER RULING**; **THAT the value is `High` = the PRODUCER'S
judgement** — ⛔ **the owner named no value.**

Its row on [`backlog.md`](../../../sprints/backlog.md) is kept as `➡️ Moved`, **not deleted** — the
same treatment `0211`, `0206` and `0200` got.

## Priority

**High — the value is the PRODUCER'S judgement; the instruction to RAISE it is an OWNER RULING.**

> 🔴 **READ THE PROVENANCE — it is a SPLIT, and it is different from every other rank note in this
> repo today.** On 2026-09-04 the producer recorded the ADR-110 re-raise finding as a **rank input**
> and **deliberately did not act on it**, because the owner had ruled scheduling only. **The owner then
> ruled that the rank SHOULD be raised, and left the VALUE to the producer.**
>
> | Part | Whose it is |
> |---|---|
> | **THAT it is raised** | 🔴 **OWNER RULING**, given live in session 2026-09-04 |
> | **THAT the value is `High`** | **THE PRODUCER'S JUDGEMENT.** The owner did not name a value. |
>
> ⚠️ **Do not collapse these into "the owner ranked it High" — they did not.** And ⚠️ **do not read it
> as the three HOLDS recorded today** (`0211` twice, `0208` once), which were the producer declining
> to move a rank the owner had not ruled on. **This one the owner did rule on — partially.**

~~**Medium–low — the producer's rank, not an owner ruling.**~~
~~📌 **RE-RANKED 2026-09-03 to Medium, on the scope widening. This is the PRODUCER'S rank, not the
owner's — they ruled on SCOPE (*"Add it — measure both"*), and said nothing about priority.**~~
**Struck, not deleted — both were correct when written.**
This board is unranked by design, so its Priority column reads `—` and the rank lives here — and
**`plan-sprint-4.md`'s Priority column reads `—` for every row too**, so the rank lives here either
way.

### 📌 RE-RANKED 2026-09-04, `Medium` → `High`. Why `High`, and why not `Medium–High`

**The owner's stated reasoning for raising it:** three decisions now rest on numbers nobody has, one
of which can **reopen an accepted ADR** — and under **Ruling 7** this task is now **gating `0211` in
practice.** `Medium` understates that.

**The producer's reasoning for landing on `High` specifically:**

- 🔴 **THE DECISIVE ARGUMENT IS ASYMMETRIC DECAY, not importance.** `0211` shipping late costs XP that
  is **already being lost** — the same loss, for longer. **`0208` shipping late costs the number
  PERMANENTLY.** Once matches stop stalling uncredited, *"how often did they stall uncredited?"* can
  **never** be answered. **One task's cost is recoverable and the other's is not**, and that is what
  puts this above a task that merely matters more to players.
- **It gates a `Medium–High` task that is scheduled in the same sprint.** ⚠️ **A gate ranked BELOW the
  thing it gates is an invitation to pick up the gated task first** — exactly the accident Ruling 7
  exists to prevent. **The rank and the sequencing must not contradict each other on the board.**
- **It can reopen an ACCEPTED ADR.** ADR-110's re-raise trigger points here; a result showing the T3
  case is effectively unreachable removes *"the strongest argument for allowing it."* **No other task
  on either board can do that.**
- **Two independent closing windows**, not one: Part A's (bounded by `0211`, now sequenced but real)
  and Part B's (`0210`, with **no successor question at all**).
- **It is instrumentation — the cheaper of the two**, which is part of the owner's ordering reasoning.

**Why NOT higher than `High`:** ⚠️ **this task still only MEASURES. It fixes nothing, and no player is
harmed by it landing a week late** — the harm is to decisions, not to people. ⛔ **The
"measuring never outranks fixing" principle recorded below is NARROWED, not abandoned:** it still
holds on player impact, and what overrides it here is **irreversibility**, not importance.

⛔ **The non-gating rule below is NOT softened by this re-rank** — this task still blocks `0210` and
the rest. ⚠️ **The ONE ordering that now exists is Ruling 7's, and it runs the other way: `0211` must
not ship before this task has data.** See *Status*.

⚠️ **Stated plainly so it is not mistaken for an owner ranking:** the owner ruled *that this be filed*,
*that it not be scheduled*, and *that it measure both halves*. ~~They have **never ranked it**.~~
✅ **CORRECTED 2026-09-04 — struck, not deleted. TRUE WHEN WRITTEN, SPENT the same day, and it had
been left CONTRADICTING THE HEADER OF THIS VERY SECTION.** ⛔ **The owner HAS since ruled on the rank:
they ruled THAT it be RAISED and left the VALUE to the producer** — see the split-provenance table at
the top of *Priority*, which is authoritative and unchanged. ℹ️ **The three rulings listed above are a
snapshot as of 2026-09-03; two further rulings landed 2026-09-04.** Everything
below is mine.

**What the rank was, and why it moved — one notch, Medium–low → Medium:**

- **Two decaying windows now, not one.** Previously the only closing window was `0206` (Sprint 4). Part B
  adds a second: `0210` is **unblocked and ready to plan** as of today, and when its guard ships the
  Singleplayer rate is **permanently unobservable**. Two independent clocks running against the same
  task is a materially stronger argument to do it sooner than one was.
- **Part B is cheaper per answer than Part A, and part of it may cost nothing at all.** See
  *Part B — what may already be answerable with no code*: `Game:Mode:Solo` already ships in production.
  Value went up while cost went up less.
- ~~**Still below a fix.** Unchanged reasoning: this only *measures*. `0210` closes a live farmable
  path that reaches a player-visible platform ranking; `0206` closed a silent XP loss. **Measuring
  never outranks fixing** — which is exactly why Medium and not higher, and why the non-gating rule
  above is not softened by this re-rank.~~
  📌 **NARROWED 2026-09-04 at the raise to `High` — struck, NOT deleted, and NOT abandoned.**
  **The principle still holds on PLAYER IMPACT: this only measures, and measuring does not outrank
  fixing.** ⚠️ **What overrides it here is IRREVERSIBILITY, not importance** — this task's answer is
  destroyed by delay and a fix's value is not. ⛔ **The clause *"which is exactly why Medium and not
  higher"* is the only part that is now FALSE**; the rest of the bullet stands. ⚠️ **The non-gating
  rule is still NOT softened** — see the note at the end of the re-rank section above.

**Unchanged from the original rank, and still true:**

- **Above `0207` (Low).** `0207` corrects a comment; this produces the evidence three live tasks are
  currently reasoning without.
- **Cheap for what it settles.** Part A: one instrumentation point in an existing decision path, plus an
  analytics event definition and its reference-doc row.
- ⚠️ **Its value DECAYS** — see *Sequencing — the one real tension* below, which now covers `0210` too.

## Status
✅ Done (agent-closed — not owner-verified) — 📌 **CLOSED 2026-09-11 ON AN OWNER RULING given live in session and relayed through the lead.** 🚨 **⛔ THIS IS NOT A CLEAN CLOSE — read the *🔴 CLOSING RECORD* below before anything else. `V16` and `V17` WERE NEVER TESTED and close UNTESTED, by the owner's knowing choice; the per-match stall rate will NEVER be known; every figure is client-matches and attempts, never matches and never points banked.** ~~🔄 In progress~~ 📌 **struck, not deleted — the token this producer set minutes earlier, TRUE WHEN WRITTEN, superseded the same day by the owner's close ruling.** 🟢 **2026-09-11 — `V18`, THE SOLE REMAINING BLOCKER, WAS RUN AND PASSED. NOTHING BLOCKED THIS TASK AT CLOSE.** ⛔ **Every dashboard read is done, the open owner decision is answered, and `V18` has passed — so there is NO blocker left that an agent or the owner has been asked to clear.** ✅ **The task is READY TO CLOSE, PENDING THE OWNER'S WORD**, which the lead is seeking separately. ⛔ **`✅ Done` has NOT been chosen by the producer and NO mover has been run** — the close is the owner's call, and the producer was told explicitly not to make it.

📌 **TOKEN CHANGE, stated because a reader will ask: ~~`🚧 Blocked`~~ → `🔄 In progress`, 2026-09-11 — struck, not deleted; the old token was TRUE UNTIL `V18` RAN.** The vocabulary reserves `🚧 Blocked` for *started, cannot proceed*; this task **can** proceed — the only step left is the owner's close decision, which **every** task waits on and which is therefore **not a blocker**. ⛔ **`🔲 Backlog` stays wrong** (the work was picked up and built) and **`✅ Done` is not the producer's to set.** 📌 **SUPERSEDED THE SAME DAY: the owner then RULED the close, and the status is now `✅ Done (agent-closed — not owner-verified)`.** ⛔ **Struck-in-effect, kept in full — it records that `🔄 In progress` was a real, reasoned intermediate state and that the producer did NOT choose `✅ Done` on its own.**

⚠️ **`V18` PASSING DOES NOT DISCHARGE `V16` AND `V17`.** Both are **UNCHANGED** and still argued from source, never tested — `V16` (no emission while watching a replay) and `V17` (exactly one event per path per match), and the brief's own **step 17** bars reporting `V17` satisfied by reading the code. ⛔ **Do not read this status, or `V18`'s pass, as full verification.**

---

### 🔴 CLOSING RECORD — read this before reading anything else on this task

📌 **The owner ruled this task CLOSED on 2026-09-11, live in session, relayed to the producer through
the lead.** ⛔ **THIS IS NOT A CLEAN SWEEP, and it must never be summarised as one.** What the close
does and does not carry:

**✅ What was actually delivered**

- **Both deliverable numbers were READ** — **Part A** (the clientless-leader share at the win
  condition) and **Part B** (the Singleplayer platform-leaderboard award incidence), plus the **Event
  id 04 award-kind split** and the **award-kind × mode cross-tab**. All four, 4–10 Sep 2026, full days,
  same session and same window.
- **`V18` was RUN and PASSED on 2026-09-11, by observation** — see *🟢 THE `V18` PLAY-TEST* below.
- **`0211`'s ship gate is CLEARED** (2026-09-11, owner ruling) **and stays cleared.** ⚠️ **Cleared is
  not scheduled** — `0211` stays `🔲 Backlog` and nobody is building it.

**⛔ What this task closes WITHOUT — a knowing choice, not an omission**

- 🚨 **`V16` AND `V17` WERE NEVER TESTED AND REMAIN ARGUED-FROM-SOURCE. THEY CLOSE UNTESTED.**
  **`V16`** — neither Part B event fires while watching a **replay**; **`V17`** — **exactly one event
  per path per match.** ⛔ **The brief's own step 17 explicitly bars reporting `V17` satisfied by
  reading the code**, and it was not tested. 📌 **THE OWNER WAS OFFERED THE OPTION OF TESTING THEM
  FIRST AND CHOSE TO CLOSE INSTEAD.** ⚠️ **Record this as a deliberate choice made with the cost in
  view — NOT as an oversight, and NOT as something a later reader should "discover".**
- 🔴 **THE PER-MATCH STALL RATE WILL NEVER BE KNOWN, and the PRE-FIX DENOMINATOR DISAPPEARS THE MOMENT
  `0211` SHIPS.** The owner's **option-B** ruling of 2026-09-11: accept the figure as a **directional
  lower bound**, ⛔ **build NO server-side counter.** **A permanent, irreversible loss of a
  measurement, accepted deliberately.** ⛔ **DO NOT RE-PROPOSE IT LATER AS A GAP SOMEONE SHOULD
  CLOSE.**

**⚠️ Caveats that travel with every figure, permanently**

- **Every Part A figure is at the CLIENT-MATCH unit, not the match unit** — one event per **client**
  per match, so **absolute counts are uninterpretable** and only ratios are safe.
- **Every leaderboard figure is ATTEMPTS, platform failures included — NEVER points confirmed banked.**
  The 79.11K, the 65.45K, the 62.29K and the 49.64K, all of them.
- **The defensible sentence about the 52 % stays VERBATIM:** *"in 52 % of measured Team-mode
  client-matches that reached the win condition, the leader at that moment was the all-bot team, and no
  winner could be declared at that moment."* ⛔ ***"52 % of Team matches stalled" REMAINS AN UNSUPPORTED
  CLAIM*** — accepted-as-directional is **not** accepted-as-a-match-rate.
- **THREE TERMINATION PATHS REMAIN UNINSTRUMENTED and emit nothing:** the 3-hour `maxGameDuration`
  kill, the ordinary **all-clients-left** end of a stalled match, and a match where **no leader
  survives to cross**. ⛔ **`Timer: 0` MUST NOT be read as "matches never run out of time."**

📌 **Close performed by the `fkit-producer` agent, spawned without an owner channel, so it carries the
`(agent-closed — not owner-verified)` marker required by ADR-033 §5.** ⚠️ **The circumstance is worth
noting either way, and it is better-evidenced than a typical agent close: the OWNER RULED THE CLOSE,
and every measurement in this brief was read from the OWNER'S OWN BROWSER SESSION.** ⛔ **The marker
still applies — the producer that moved the file had no direct owner channel and verified nothing in
production use itself.**

---

✅ **PART A'S DELIVERABLE NUMBER HAS BEEN READ (2026-09-11).** See *The measurement* immediately below; ~~**the deliverable — the clientless-leader share — is STILL NOT READ**~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ⛔ **The task stays `🚧 Blocked`, and THE REASON HAS CHANGED — it is a different blocker, not the same one re-stated:** ~~(1) **Part B's number — the Singleplayer platform-leaderboard award incidence — is STILL UNREAD** (only a single `…:SoloTutorial` occurrence was ever *observed*, never counted);~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **PART B'S NUMBER HAS BEEN READ (2026-09-11): 79.11K award ATTEMPTS — `Solo` 65.45K · `SoloTutorial` 13.66K.** See *🟢 THE MEASUREMENT — PART B'S DELIVERABLE* below, **and read its three caveats BEFORE the figure.** ⚠️ **A NEW, SMALLER BLOCKER CAME OUT OF THAT READ — it is numbered (4) below, it is NOT this one re-stated;** ~~(2) **`V18`, the manual mid-match reload play-test, was NEVER RUN**~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **`V18` WAS RUN 2026-09-11 AND PASSED — blocker (2) is CLOSED BY OBSERVATION. See *🟢 THE `V18` PLAY-TEST* below.**; ~~(3) 🔴 **an OWNER DECISION is open and the data has just made it live** — whether to add a server-side *"ended with no winner"* counter (see *The open owner decision* below).~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **ANSWERED 2026-09-11 by owner ruling (option B — accept as a directional lower bound, build NO counter). See *The open owner decision* below.** ~~⛔ **TWO BLOCKERS STAND, AND THEY ARE WHY THIS TASK IS STILL `🚧 Blocked`:**~~ 📌 **AMENDED 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN. ONE blocker stands now, not two.** ~~⚠️ **(4) THE EVENT id 04 AWARD-KIND SPLIT (`Participation` / `PlacementWon` / `PlacementLost`) WAS NOT CAPTURED** in the Part B read, so **79.11K attempts is NOT 79.11K matches.** ⛔ **This is an ACKNOWLEDGED GAP IN THE READ, NOT a hole in the instrumentation** — the dimension exists and is reachable; **one further dashboard read closes it.**~~ ✅ **BLOCKER (4) IS CLOSED — 2026-09-11. The Event id 04 award-kind split HAS BEEN READ** (same session, same window as Parts A and B): `Participation` **62.29K** · `PlacementWon` **14.28K** · `PlacementLost` **2.53K** · total **79.11K**, reconciling exactly with the Part B total. ⇒ **~62.29K Singleplayer matches reported to the platform leaderboard in the 7-day window, ~8.9K/day.** See *🟢 THE AWARD-KIND SPLIT* below ~~**and read its non-tutorial bar before using it.**~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **THE LAST OPEN READ ON THIS TASK — THE AWARD-KIND × MODE CROSS-TAB — WAS TAKEN 2026-09-11, same session and window:** `Solo` `Participation` **49.64K** · `PlacementWon` **13.28K** · `PlacementLost` **2.53K**, reconciling exactly with the `Solo` 65.45K. 🟢 **⇒ `0210`'s NON-TUTORIAL MATCH COUNT IS 49.64K, ~7.1K/day.** ✅ **The non-tutorial derivation bar is DISCHARGED BY MEASUREMENT — and the measurement PROVED THE BAR RIGHT: the forbidden multiplication gives ~51.5K against an actual 49.64K, because the `Solo` share runs 79.7 % / 93 % / 100 % across the three award kinds, not a uniform 82.7 %.** ✅ **Also confirmed in production data: `PlacementLost` is IDENTICAL in both columns, so the `SoloTutorial` contribution is EXACTLY ZERO — the code-derived "cannot currently fire" prediction, now verified.** ⚠️ **ALL OF IT IS STILL ATTEMPTS, PLATFORM FAILURES INCLUDED — never points banked, the 49.64K included.** See *🟢 THE AWARD-KIND × MODE CROSS-TAB* below. ⛔ **NO READ IS OUTSTANDING ON THIS TASK ANY MORE** — ~~**AND IT IS STILL NOT CLOSEABLE.** 🚨 **SO ONE BLOCKER STANDS, AND IT IS THE ONLY THING BETWEEN THIS TASK AND A CLOSE:** 🔴 **(2) `V18`, THE MANUAL MID-MATCH RELOAD PLAY-TEST, HAS STILL NEVER BEEN RUN.** The no-resume conclusion stays an **inference**, not an observation. ⛔ **It is the SOLE remaining blocker on `0208`.**~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN and true for exactly as long as `V18` was unrun.** 🟢 **`V18` WAS RUN ON 2026-09-11 AND PASSED, and the no-resume conclusion is now an OBSERVATION, not an inference** — see *🟢 THE `V18` PLAY-TEST* immediately below. 🔴 **The 2026-09-11 ruling CLEARS `0211`'s ship gate; it does NOT close `0208`** — that part stands, and the close is still the owner's. ⚠️ **The remaining step belongs to the OWNER, not to an agent** — ~~Part B's dashboard read and~~ 📌 **Part B's read is DONE, the award-kind read is DONE, and `V18` is DONE;** ✅ **what is left is the OWNER'S CLOSE DECISION, and nothing else.** ⛔ **Not `✅ Done`. No mover has been run, and none may be run without the owner.**

### 🟢 THE `V18` PLAY-TEST — RUN 2026-09-11, PASSED. ✅ THIS CLOSES BLOCKER (2)

**`V18` — reload the page mid-Singleplayer match — WAS RUN on 2026-09-11 and PASSED.** Performed by
the **lead via browser automation**, in a tab **the owner brought to the foreground**.

📌 **Why there were two attempts, recorded so a later reader is not puzzled by it:** an earlier attempt
ran in a **backgrounded tab** and was **abandoned** — the browser throttled the game loop, so the match
did not tick at full speed. The run that counts is the foreground one.

**Conditions, exactly as they were:**

| | |
|---|---|
| Site / build | **Production**, build **`0.0.141`** (read off the main-menu footer) |
| Mode | **Singleplayer custom game** ("Своя Игра"), **World** map |
| ⛔ **NOT the tutorial** | The app auto-launches the tutorial on first visit; it was **explicitly skipped**. `SoloTutorial` is a **different leaf** and would have answered a **different question**. |
| Match state at reload | Genuinely **live and ticking** — ~**36 s** elapsed, nations expanding, the player present in the leaderboard as **`Anon551`**, **10.6K troops**, **25.8K gold** |
| Action | A plain **page reload** |

🟢 **RESULT: the reload returned straight to the MAIN MENU.** No rejoin prompt, no resumed match,
nothing to continue.

⇒ ✅ **A Singleplayer match CANNOT be resumed after a reload.** The fresh `ClientGameRunner` a reload
builds — which resets `hasReportedParticipation` and `hasProcessedWin` — therefore has **no earlier
match to double-count against.** ✅ **The no-resume conclusion is now an OBSERVATION, not an
inference.** ⛔ **The brief's standing objection — that it rested on reading one call site
(`saveReconnectSession` skipped when `transport.isLocal`) — is DISCHARGED.**

**Two honest details, recorded rather than glossed:**

1. ⚠️ **The player's area read `0.0 %`** at the moment of reload — in a match with troops and gold, but
   with little or no captured territory. ⛔ **It does not affect what `V18` tests** (whether a reconnect
   session exists), but it is **what was on screen**, and a later reader should not be surprised by it.
2. 📌 **Incidental, recorded because it is adjacent and cheap:** **tutorial completion PERSISTED across
   the reload** (the tutorial did not replay) even though the **match did not**. ⛔ **NOT a finding for
   this task and NOT something to act on** — a fact observed in passing, nothing more.

⚠️ **`V16` AND `V17` ARE UNCHANGED BY THIS.** They remain **argued from source, never tested** — see
the uncovered-steps table below, which is updated **only** in its `V18` row. ⛔ **`V18` passing
discharges `V18` and nothing else.**

### 🟢 THE MEASUREMENT — PART A'S DELIVERABLE, READ 2026-09-11

> 🔴 **THE UNIT IS CLIENT-MATCHES, NOT MATCHES. READ THIS BEFORE ANY FIGURE BELOW.**
>
> One event is emitted per **client** per match (`src/client/ClientGameRunner.ts:577-583`,
> `src/core/execution/WinCheckExecution.ts:83`), so an N-client lobby contributes **N identical rows**.
> ⛔ **Absolute counts are uninterpretable. Only ratios are safe** — and even those are **weighted by
> lobby size and by how many clients stayed to the end.** Already documented at
> [`analytics-event-reference.md:140-147`](../../../knowledge-base/analytics-event-reference.md).

**Provenance — record it as such, it is not reproducible from the repository.** The figures were read
off the **GameAnalytics dashboard in the owner's browser on 2026-09-11** by the lead session. A coder
then verified **every interpretation** against the code, read-only. ⚠️ **The figures are AS THE
DASHBOARD ROUNDS THEM (`3.00K`, `3.72K`, …) — they are APPROXIMATE, not exact.**

**Window:** `Match:WinCondition`, **4–10 September 2026, full days.**

| Dimension | Values (as the dashboard rounds them) |
|---|---|
| **Event id 03 — mode** | `TeamPublic` **3.72K** · `FfaPublic` **3.14K** |
| **Event id 04 — branch** | `Threshold` **6.86K** — **100 %** |
| **Event id 05 — leader** | `Human` **3.00K** · `BotTeam` **1.95K** · `HumanTeam` **1.74K** · `AiPlayer` **89** · `Nation` **50** · `NationsTeam` **29** |
| **Total** | **6.86K** |

#### Derived rates — client-match unit, ⚠️ ALL LOWER BOUNDS

| Rate | Value | Arithmetic |
|---|---|---|
| **FFA clientless-in-front** | **1.6 %** | `Nation` 50 / 3,139 |
| **Team clientless-in-front** | **53.2 %** | (`BotTeam` 1,950 + `NationsTeam` 29) / 3,719 |
| **Team stall-capable** | **52.4 %** | `BotTeam` 1,950 / 3,719 |
| **Overall clientless-in-front** | **29.1 %** | 1,999 / 6,858 |

#### The four findings — the coder's file:line evidence, in its wording because it is precise

**1. `NationsTeam` is clientless in front, but is NOT part of the stall population.**
An all-`FakeHuman` team: every member has `clientID() === null`
(`src/core/game/GameImpl.ts:110-115, 157-163`; `src/core/GameRunner.ts:72-96`), and **no bot or
`AiPlayer` can reach it** (`GameImpl.ts:463-472`; `GameRunner.ts:99-105`). But the Team guard tests
only `ColoredTeams.Bot` (`WinCheckExecution.ts:199-204`), so **a leading Nations team IS declared
winner and the match ENDS** — with a winner tuple carrying **zero client ids**
(`GameImpl.ts:667-677`). ⛔ **53.2 % and 52.4 % are DIFFERENT NUMBERS and must not be substituted for
one another.**

**2. 🔴 A firing records who was FIRST PAST THE POST, not how the match ENDED.**
Once per client per match, **latched at the first crossing** —
`WinCheckExecution.reportedWinCondition` (`:83`, `:235-238`) and `ClientGameRunner` (`:367`,
`:574-586`, `src/client/…/WinConditionAnalytics.ts:20-26`). The check keeps running after a clientless
leader is turned away (`:93-104`), **emitting nothing further.** ⚠️ **A `BotTeam` row where a human
team later won still reads `BotTeam`.**

⛔ **"52 % of Team matches stalled" is NOT a supported claim.** Three biases pull in **both**
directions: client-match weighting and tab-closed clients **UNDER**-state the match rate
([`analytics-event-reference.md:140-154`](../../../knowledge-base/analytics-event-reference.md));
first-crossing latching **OVER**-states it. 🔴 **The NET MAGNITUDE IS NOT ESTABLISHABLE FROM THIS
EVENT.**

> **The defensible sentence — use it verbatim:**
> *"in 52 % of measured Team-mode client-matches that reached the win condition, the leader at that
> moment was the all-bot team, and no winner could be declared at that moment."*

**3. `Timer: 0` is EXPECTED and is NOT a measurement gap.**
The timer branch is instrumented on the **same line** that produced every `Threshold` row
(`WinCheckExecution.ts:245`), but `maxTimerValue` is hardcoded `undefined` in public lobbies
(`src/server/MapPlaylist.ts:162`; no match modifier sets it, `:30-62`) and is settable only by a
**private-lobby host** or **singleplayer** — the latter dropped client-side
(`WinConditionAnalytics.ts:42-44`). It was documented as unreachable **before deploy**
([`analytics-event-reference.md:103-110`](../../../knowledge-base/analytics-event-reference.md)).

⚠️ **DO NOT extend this to "matches never run out of time."** Three termination paths **emit nothing**
and are **genuinely unmeasured**: the 3-hour `maxGameDuration` kill (`src/server/GameServer.ts:56`,
`:867-872`); the ordinary **all-clients-left** end of a stalled match (`:904-906`); and a match where
**no leader survives to cross**, because `players()` filters to `isAlive()` (`GameImpl.ts:421-422` —
the 2026-09-04 100 %-Nation finding).

**4. FFA's zero `Bot` leaders is an AGGREGATION ARTEFACT, not a lobby-population difference.**
Both modes run `bots: 400` (`MapPlaylist.ts:169`). **FFA tests one individual against 80 %**
(`WinCheckExecution.ts:106-122`; `src/core/configuration/DefaultConfig.ts:713-717`); **Team sums all
400 bots into one team** (`GameImpl.ts:463-472`) against 95 %. ⛔ **`Bot` and `BotTeam` are NOT
comparable quantities.** *(A separate, real asymmetry does exist for nations: public Team lobbies
disable NPCs except in the `Humans Vs Nations` slot, **1 of 7** — `MapPlaylist.ts:165`, `:107-115`.)*

#### Also recorded

- **ZERO private-lobby events in the window.** The two public values (`TeamPublic` + `FfaPublic`)
  exhaust the total. Either private lobbies are not being played, or none reached a win condition.
  ⚠️ **This is the SECOND reason `Timer` is zero.**
- **`AiPlayer` 89 is ADR-110's re-raise trigger ACTUALLY FIRING.**
  [`adr-110`](../../../knowledge-base/decisions/adr-110-ai-player-may-be-declared-winner.md) carries a
  **pre-committed expiry** requiring re-examination before any durable player-visible winner record
  ships. **89 occurrences in 7 days is a live input to that.**
- **On ADR-110, stated carefully and NOT overreached:** the **FFA** clientless case is **rare (1.6 %)**,
  which is the direction that **weakens the strongest argument for the `allow` ruling — FOR FFA ONLY.**
  ⛔ **It is emphatically NOT rare in Team mode (53.2 %).** 📌 **Recorded as an INPUT REQUIRING AN
  ARCHITECT'S READ — NOT as a conclusion about ADR-110.**

### 🟢 THE MEASUREMENT — PART B'S DELIVERABLE, READ 2026-09-11

> 🚨 **THREE CAVEATS COME FIRST. THEY ARE NOT FOOTNOTES TO THE FIGURE — THE FIGURE IS MEANINGLESS WITHOUT THEM.**
>
> **1. 🔴 IT COUNTS ATTEMPTS, PLATFORM FAILURES INCLUDED.** Per
> [`analytics-event-reference.md:172-175`](../../../knowledge-base/analytics-event-reference.md), the
> event is emitted **after the platform call has settled, whatever it returned — including when it
> rejects**, which is exactly what a platform failure looks like from here. **These are points
> ATTEMPTED, never points confirmed banked.** ⛔ **A rise in this number is NOT evidence that any
> player's leaderboard score moved.**
>
> **2.** ~~⚠️ **79.11K IS NOT 79.11K MATCHES — AND THE SPLIT THAT WOULD SETTLE IT WAS NOT CAPTURED.**~~
> 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN, and closed later the same session.**
> The event carries **three award kinds** — `Participation`, `PlacementWon`, `PlacementLost`
> ([`analytics-event-reference.md:170`](../../../knowledge-base/analytics-event-reference.md)) — and
> **a single match can emit more than one.** ~~**The Event id 04 breakdown was NOT read.**~~
> ✅ **IT HAS NOW BEEN READ — see *🟢 THE AWARD-KIND SPLIT* below.** ⚠️ **79.11K attempts is still NOT
> 79.11K matches** — **it is ~62.29K matches**, and the other 16.81K are placement awards riding on
> those same matches. ~~🔴 **The split is `Solo` + `SoloTutorial` COMBINED — see the non-tutorial bar in
> that section BEFORE deriving anything from it.**~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE
> WHEN WRITTEN.** ✅ **The award-kind × mode CROSS-TAB was read the same session and window: the
> non-tutorial MATCH count is `Solo` `Participation` **49.64K**, ~7.1K/day. The bar is DISCHARGED BY
> MEASUREMENT — and the measurement proved it right.** See *🟢 THE AWARD-KIND × MODE CROSS-TAB* below.
>
> **3. ✅ "All Singleplayer" is the SCOPE, not a finding.**
> [`analytics-event-reference.md:177-181`](../../../knowledge-base/analytics-event-reference.md) —
> **multiplayer emits nothing, deliberately**, so a leaked multiplayer row could not pollute the
> numbers `Match:WinCondition` exists to produce. ⛔ **Do NOT record the absence of a multiplayer
> value as a discovery.**

**Provenance — record it as such, it is not reproducible from the repository.** Read off the
**GameAnalytics dashboard in the owner's browser on 2026-09-11** by the lead session — **the same
session and the same window as Part A.** ⚠️ **Figures are AS THE DASHBOARD ROUNDS THEM — record them
as APPROXIMATE, not exact.**

**Window:** `Match:Leaderboard:Award`, **4–10 September 2026, full days.**

| Dimension | Values (as the dashboard rounds them) |
|---|---|
| **Event id 05 — mode leaf** | `Solo` **65.45K** · `SoloTutorial` **13.66K** |
| **Event id 04 — award kind** | ~~⛔ **NOT READ.**~~ ✅ **READ 2026-09-11, same session and window:** `Participation` **62.29K** · `PlacementWon` **14.28K** · `PlacementLost` **2.53K**. ~~🔴 **`Solo` + `SoloTutorial` COMBINED — there is NO award-kind × mode cross-tab.**~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **THE CROSS-TAB HAS SINCE BEEN READ** — see *🟢 THE AWARD-KIND × MODE CROSS-TAB* below. |
| **Event id 04 × Event id 05 — the CROSS-TAB** | ✅ **READ 2026-09-11, same session and window** (filtered to `Solo`, grouped by Event id 04): `Participation` **49.64K** · `PlacementWon` **13.28K** · `PlacementLost` **2.53K** ⇒ `Solo` total **65.45K**, reconciling exactly. 🟢 **49.64K is the NON-TUTORIAL MATCH count, ~7.1K/day.** |
| **Total** | **79.11K award ATTEMPTS** |

#### 🟢 THE AWARD-KIND SPLIT — Event id 04, READ 2026-09-11. ✅ THIS CLOSES BLOCKER (4)

**Provenance:** read off the **GameAnalytics dashboard in the owner's browser on 2026-09-11** by the
lead session — **the same session and the same window as Part A and Part B.** `Match:Leaderboard:Award`,
**4–10 September 2026**, grouped by **Event id 04**. ⚠️ **Figures AS THE DASHBOARD ROUNDS THEM —
APPROXIMATE.**

| Award kind | Count |
|---|---:|
| `Participation` | **62.29K** |
| `PlacementWon` | 14.28K |
| `PlacementLost` | 2.53K |
| **Total** | **79.11K** |

✅ **Reconciles exactly with the Part B total already recorded (79.11K).**

**What it establishes — the reasoning, not just the number:**

1. 🟢 **It converts the ATTEMPT count into a defensible MATCH count.** Participation is awarded **once
   per reporting match** ([`analytics-event-reference.md:170`](../../../knowledge-base/analytics-event-reference.md)
   — 1 point for participation, 10/5/2 for placement; the client latches it once per match at
   [`src/client/ClientGameRunner.ts:553-558`](../../../../src/client/ClientGameRunner.ts) via
   `hasReportedParticipation`). ⇒ **~62.29K Singleplayer matches reported to the platform leaderboard
   in the 7-day window — roughly 8.9K/day.** ⛔ **The other 16.81K are placement awards riding on those
   SAME matches — they are NOT additional matches.** ⇒ ✅ **BLOCKER (4) IS CLOSED.**
2. **~27 % of reporting matches reach a placement outcome** (16,810 / 62,290). ⚠️ **Record the rest as
   UNRESOLVED-TO-PLACEMENT, CAUSE NOT ESTABLISHED.** ⛔ **Abandonment is the lead's inference and the
   data does NOT state it — do not write it down as abandonment.**
3. **Among matches that DO place, ~85 % are wins** (14,280 / 16,810).

> ## ~~🔴 THE CAVEAT THAT MUST TRAVEL WITH THE NUMBER — A BAR ON A TEMPTING DERIVATION~~ → ✅ **DISCHARGED 2026-09-11 BY MEASUREMENT**
>
> ✅ **DISCHARGED 2026-09-11 BY MEASUREMENT — struck, NOT deleted. It was RIGHT when written, and the
> measurement that discharged it PROVED it right.** The cross-tab was read the same session and the
> same window; see *🟢 THE AWARD-KIND × MODE CROSS-TAB* immediately below. ⛔ **Do not delete this bar
> and do not read "discharged" as "it was fussy" — the number it forbade (~51.5K) is NOT the number the
> read produced (49.64K).**
>
> ~~**This split is `Solo` + `SoloTutorial` COMBINED. There is NO award-kind × mode cross-tab.**~~
> [`0210`](../../backlog/0210-singleplayer-platform-leaderboard-reporting-policy/brief.md)'s scope is
> **non-tutorial**, so:
>
> ~~⛔ **DO NOT derive a non-tutorial match count by applying the 82.7 % `Solo` share to the 62.29K.**
> Tutorials plausibly skew toward participation-without-placement, so the mode share is **unlikely to
> be uniform across award kinds**, and multiplying would produce **a number that looks precise and is
> unfounded.** 🚨 **This is recorded as a BAR ON A DERIVATION, not merely as a missing datum — the
> whole point is that someone will otherwise do the multiplication.**~~
>
> | | |
> |---|---|
> | ~~✅ **What `0210` can defensibly use today**~~ | ~~`Solo` **65.45K award ATTEMPTS** (all kinds), already recorded.~~ 📌 **SPENT — `0210` can now use the MATCH count, 49.64K.** |
> | ~~⛔ **What it CANNOT**~~ | ~~**A non-tutorial MATCH count.**~~ 📌 **SPENT — it has one.** |
> | ~~⏳ **What would give it**~~ | ~~**One more dashboard read** — Event id 04 split *with* Event id 05 = `Solo`. ⚠️ **That read DIES when `0210`'s guard ships**, exactly as Part B would have.~~ ✅ **THAT READ WAS TAKEN, 2026-09-11 — before the window closed.** |

⚠️ **Still true and unchanged: EVERYTHING HERE IS ATTEMPTS, PLATFORM FAILURES INCLUDED — never points
confirmed banked** (caveat 1 above). **Keep that caveat attached wherever these figures appear —
including the 49.64K below.**

#### 🟢 THE AWARD-KIND × MODE CROSS-TAB — READ 2026-09-11. ✅ THIS WAS THE LAST OPEN READ ON `0208`

> 🔴 **CAVEAT FIRST, BECAUSE EVERY FIGURE IN THIS SECTION IS MEANINGLESS WITHOUT IT: THESE ARE AWARD
> *ATTEMPTS*, PLATFORM FAILURES INCLUDED — NEVER POINTS CONFIRMED BANKED.** The event fires after the
> platform call settles, whatever it returned, **including a rejection**
> ([`analytics-event-reference.md:172-175`](../../../knowledge-base/analytics-event-reference.md)).
> ⛔ **That applies to the 49.64K headline too — it is 49.64K attempts, not 49.64K banked awards.**

**Provenance:** read off the **GameAnalytics dashboard in the owner's browser on 2026-09-11** by the
lead session — **the same session and the same window as Parts A and B and the award-kind split.**
`Match:Leaderboard:Award`, **filtered to Event id 05 = `Solo`**, grouped by **Event id 04**,
**4–10 September 2026, full days.** ⚠️ **Figures AS THE DASHBOARD ROUNDS THEM — APPROXIMATE.**

| Award kind | `Solo` (non-tutorial) | Combined (already recorded) | ⇒ tutorial share |
|---|---:|---:|---:|
| `Participation` | **49.64K** | 62.29K | 12.65K |
| `PlacementWon` | 13.28K | 14.28K | 1.00K |
| `PlacementLost` | **2.53K** | 2.53K | **0** |
| **Total** | **65.45K** | **79.11K** | **13.66K** |

✅ **The `Solo` column reconciles exactly with the `Solo` 65.45K already recorded from the Event id 05
read.** ⚠️ **One rounding artefact, recorded so nobody reads it as an error: the tutorial column sums
to 13.65K against the 13.66K `SoloTutorial` total read separately. The 0.01K gap is the dashboard's
rounding, not a missing row** — every figure here is approximate by construction.

**1. 🟢 `0210`'s NON-TUTORIAL MATCH COUNT IS 49.64K — about 7.1K/day.** Participation is awarded **once
per reporting match** ([`analytics-event-reference.md:170`](../../../knowledge-base/analytics-event-reference.md);
latched once per match at [`src/client/ClientGameRunner.ts:553-558`](../../../../src/client/ClientGameRunner.ts)
via `hasReportedParticipation`), so the non-tutorial `Participation` count **is** the non-tutorial match
count. ⇒ **This is the number [`0210`](../../backlog/0210-singleplayer-platform-leaderboard-reporting-policy/brief.md)'s
scope actually wanted.** ⛔ **The other 15.81K `Solo` rows are placement awards riding on those SAME
matches — NOT additional matches.** ⚠️ **Attempts, not points banked.**

**2. 🔴 WHY THE BAR WAS RIGHT — RECORD THIS, IT IS THE TRANSFERABLE LESSON, NOT A FOOTNOTE.**
Applying the 82.7 % `Solo` share to the 62.29K combined match count would have produced **~51.5K**
against an actual **49.64K** — **overstating by ~1.9K matches (~3.7 %)**, with every appearance of
precision. **The `Solo` share is NOT uniform across award kinds, and the measurement proves it:**

| Award kind | `Solo` share of that kind |
|---|---:|
| `Participation` | **79.7 %** |
| `PlacementWon` | **93 %** |
| `PlacementLost` | **100 %** |
| *(all kinds combined)* | *82.7 %* |

> 🚨 **⇒ THE REFUSAL TO MULTIPLY WAS CORRECT.** The blended 82.7 % is an average over three kinds whose
> real shares run from 79.7 % to 100 %; applying it to a single kind imports the other two kinds' mix.
> ⛔ **DO NOT REPEAT THE SHORTCUT ON SOME OTHER CROSS-TAB.** A marginal share is only safe to multiply
> into a sub-population when the share is known to be uniform across it — and here it demonstrably was
> not. **This is recorded as the lesson, not as trivia about one number.**

**3. 🟢 `PlacementLost` IS IDENTICAL IN BOTH COLUMNS (2.53K), SO THE TUTORIAL CONTRIBUTION IS EXACTLY
ZERO — and that is INDEPENDENT EMPIRICAL CONFIRMATION of a previously code-derived prediction.**
[`analytics-event-reference.md:187-194`](../../../knowledge-base/analytics-event-reference.md) predicts
that `Match:Leaderboard:Award:PlacementLost:SoloTutorial` **cannot currently fire** — tutorials are
hard-coded FFA with `disableNPCs`, so a clientless leader hits `0022`'s guard in `WinCheckExecution`
and returns before `setWinner`, and the placement path never runs. ⚠️ **That claim was derived ONLY
from reading the code; it had never been checked against production data.** ✅ **It now has been, over a
full 7-day window, and the data agrees: zero.** 📌 **Record it as a code-derived prediction now VERIFIED
IN PRODUCTION DATA.**
⚠️ **THE EXISTING NOTE STANDS UNCHANGED AND MUST NOT BE DELETED: the leaf is DELIBERATELY KEPT, and it
becomes reachable the moment [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md) /
[`0211`](../../backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md) removes that guard.**
⛔ **This confirmation does NOT change that** — it confirms the zero is real *today*, not that the zero
is permanent. **Its zero is not telemetry loss. Build dashboards from the five.**

**4. Tutorials resolve to a placement far less often — ~7.9 % versus ~31.8 %.**

| Population | Reaches a placement outcome |
|---|---:|
| `SoloTutorial` | **~7.9 %** (1.00K of 12.65K) |
| `Solo`, non-tutorial | **~31.8 %** (15.81K of 49.64K) |

⛔ **RECORDED AS AN OBSERVATION ONLY. NO CAUSE IS OFFERED, AND NONE MAY BE INFERRED FROM THIS —
NOBODY HAS ESTABLISHED ONE.** ⚠️ **In particular, do NOT write this down as abandonment, as tutorial
length, or as a design difference.** The data states the rates and nothing else.

⚠️ **EVERYTHING IN THIS SECTION IS ATTEMPTS, PLATFORM FAILURES INCLUDED — never points confirmed
banked. The caveat travels with every figure here, the 49.64K included.**

🔴 **THIS READ CHANGES NOTHING ABOUT `0208`'s STATUS.** It closes the last open **read**; ~~⛔ **the task
stays `🚧 Blocked` on `V18`, the manual mid-match reload play-test, which has still never been run.**~~
📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **`V18` HAS SINCE BEEN RUN AND
PASSED (2026-09-11), and the status is now `🔄 In progress` — no blocker remains, and the task is
ready to close pending the owner's word.** ⛔ **The sentence's own point still stands: it was not
*this read* that unblocked the task.**

#### 📌 Why Part B was read now and not ruled out of scope — owner ruling 2026-09-11

**Its window closes PERMANENTLY when [`0210`](../../backlog/0210-singleplayer-platform-leaderboard-reporting-policy/brief.md)'s
guard ships.** The owner ruled the read be taken now rather than deferred. ✅ **It was taken.**

#### 🔴 What it means for `0210` — the number `0210` was waiting for

[`0210`](../../backlog/0210-singleplayer-platform-leaderboard-reporting-policy/brief.md)'s scope is
**non-tutorial**, and the `SoloTutorial` leaf exists precisely so the tutorial share can be separated
([`analytics-event-reference.md:183-187`](../../../knowledge-base/analytics-event-reference.md)).

> ⇒ **`0210`'s IN-SCOPE FIGURES: `Solo` 65.45K award ATTEMPTS** — roughly **83 %** of the total, about
> **9.35K/day** — ✅ **and, since the cross-tab read, `Solo` `Participation` 49.64K NON-TUTORIAL MATCHES,
> about 7.1K/day**, which is the figure `0210`'s scope actually wanted. ⚠️ **Attempts, not points banked
> (caveat 1) — that applies to the 49.64K too.**
>
> ~~🔴 **ADDED 2026-09-11, and it is a BAR, not a footnote: that 65.45K is ATTEMPTS, and it does NOT
> convert into a non-tutorial MATCH count.** The award-kind split read the same day is
> **`Solo` + `SoloTutorial` COMBINED**, with **no award-kind × mode cross-tab.** ⛔ **DO NOT multiply
> the 82.7 % `Solo` share by the 62.29K match count to get a non-tutorial match count** — tutorials
> plausibly skew toward participation-without-placement, so the mode share is unlikely to be uniform
> across award kinds, and the product would **look precise and be unfounded.** ⏳ **Closing it needs
> one more dashboard read (Event id 04 split with Event id 05 = `Solo`), and that read dies when
> `0210`'s guard ships.**~~
>
> ✅ **DISCHARGED 2026-09-11 BY MEASUREMENT — struck, NOT deleted, and it was RIGHT when written.** The
> cross-tab read was taken before the window closed: **`Solo` `Participation` 49.64K**, against the
> **~51.5K** the forbidden multiplication would have produced — **an overstatement of ~1.9K (~3.7 %).**
> 🚨 **The `Solo` share is NOT uniform across award kinds: 79.7 % of `Participation`, 93 % of
> `PlacementWon`, 100 % of `PlacementLost`.** ⛔ **Do not repeat the shortcut on another cross-tab.**
> See *🟢 THE AWARD-KIND × MODE CROSS-TAB* above.

⛔ **THIS CHANGES NOTHING ABOUT `0210`'s STATUS, SCOPE OR RANK.** The owner's `0210` ruling was
**explicitly NOT conditioned on incidence**, and that is unchanged. A pointer to this figure has been
added to `0210`'s brief; **nothing else in `0210` was touched.**

#### Also recorded — five of the six ids are reachable today, not six. ✅ NOW CONFIRMED IN PRODUCTION DATA

From the same reference section
([`analytics-event-reference.md:183-187` and the paragraph following](../../../knowledge-base/analytics-event-reference.md)):
**`Match:Leaderboard:Award:PlacementLost:SoloTutorial` CANNOT CURRENTLY FIRE.** Tutorials are
hard-coded FFA with `disableNPCs`, so a clientless leader hits `0022`'s guard in `WinCheckExecution`
and returns before `setWinner` — no `Win` update is produced and the placement path never runs. Only a
human win reaches it.

✅ **CONFIRMED IN PRODUCTION DATA, 2026-09-11 — the claim was previously derived ONLY from reading the
code.** The cross-tab read shows `PlacementLost` **IDENTICAL in both columns (2.53K `Solo`, 2.53K
combined)**, so **the `SoloTutorial` contribution over the full 7-day window is EXACTLY ZERO.**
📌 **Record it as a code-derived prediction now verified against production data, not as a fresh
finding.** ⛔ **This confirms the zero is real TODAY; it does NOT make the zero permanent, and it does
NOT license deleting the leaf** — see the note immediately below, which is unchanged.

⚠️ **Its permanent zero is NOT telemetry loss.** ⛔ **Do not read it as a gap and do not delete the
leaf** — it is deliberately kept, because it becomes reachable the moment
[`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md) /
[`0211`](../../backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md) removes that guard, and
the composer is swept across all six on purpose so removing the guard needs no analytics change.
**Build dashboards from the five.**

### ~~🔴 THE OPEN OWNER DECISION — UNANSWERED, AND THE DATA HAS NOW MADE IT LIVE~~ ✅ ANSWERED 2026-09-11 — OPTION B

> ✅ **ANSWERED 2026-09-11 — OWNER RULING, given live in the lead session. Option B: ACCEPT `0208` PART A'S NUMBER AS A DIRECTIONAL LOWER BOUND. ⛔ DO NOT BUILD A SERVER-SIDE COUNTER.**
>
> ⛔ **THE SECTION BELOW IS KEPT, NOT DELETED — struck and answered in place, so the reasoning that made this a live question stays visible.**
>
> **The owner's accepted wording, verbatim:** *"Take 52% as directional evidence that the Team-mode stall is real and common — which is enough to justify `0211` — and don't build more measurement. `0211` can ship. You never get a precise pre-fix stall rate."*
>
> 🚨 **THE COST THE OWNER KNOWINGLY ACCEPTED, in those terms and not softer: the PER-MATCH STALL RATE WILL NEVER BE KNOWN, and the PRE-FIX DENOMINATOR IS GONE THE MOMENT `0211` SHIPS.** This is a **permanent, irreversible loss of a measurement, accepted deliberately — not an oversight.** ⛔ **DO NOT RE-PROPOSE IT LATER AS A GAP SOMEONE SHOULD CLOSE.**
>
> ⚠️ **The caveat still travels with the number.** *"52 % of Team matches stalled"* remains an **UNSUPPORTED CLAIM** — **accepted-as-directional is NOT accepted-as-a-match-rate** — and the defensible sentence in *🟢 THE MEASUREMENT* above stays **verbatim**.
>
> ✅ **`0211`'s SHIP GATE IS CLEARED BY THIS RULING.** ⚠️ **Clearing the gate is NOT scheduling the work** — `0211` stays `🔲 Backlog` and nobody is building it.
>
> ⛔ **THIS RULING DOES NOT TOUCH:** Part B ~~(the Singleplayer platform-leaderboard award incidence, still unread and being put to the owner separately)~~ 📌 **AMENDED 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN. Part B HAS SINCE BEEN READ, in the same session and the same window** (see *🟢 THE MEASUREMENT — PART B'S DELIVERABLE* above). ⛔ **The ruling still does not touch it — Part B was never in its scope.** ~~`V18` (still never run), or this task's `🚧 Blocked` status.~~ 📌 **AMENDED 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **`V18` WAS RUN 2026-09-11 AND PASSED, and this task's status is now `🔄 In progress`, not `🚧 Blocked`.** ⛔ **The ruling still touches neither — it did not close `V18` and it did not change the status; a play-test did the first and the producer the second.**

**Raised in this brief's own header box (the *"One measurement-design consequence"* box near the top,
`brief.md:39-47` as filed)** — flagged there as *"a design input, NOT
a ruling"* — and **never ruled on**: whether to add a counter for matches that **terminate with NO
winner declared**.

🔴 **The measurement has made it live.** Per finding 2, **the per-match stall rate is what the owner
actually wants, and it is NOT DERIVABLE from `Match:WinCondition` at any confidence.** A **server-side
"ended with no winner" counter** is the only thing that would close it.

| Option | What it means |
|---|---|
| **A — scope it** | File a new sub-task for the server-side "ended with no winner" counter. |
| **B — accept** | Take the client-side number as a **directional lower bound** and move on. |

~~⛔ **The owner's call. Unanswered as of 2026-09-11.** The producer is putting it to them in parallel.~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **RULED THE SAME DAY: OPTION B.** ⛔ **Option A was NOT taken — no counter is to be scoped, filed, or re-proposed.** 🚨 **THE COST THE OWNER KNOWINGLY ACCEPTED, in those terms and not softer: the PER-MATCH STALL RATE WILL NEVER BE KNOWN, and the PRE-FIX DENOMINATOR IS GONE THE MOMENT `0211` SHIPS.** This is a **permanent, irreversible loss of a measurement, accepted deliberately — not an oversight.** ⛔ **DO NOT RE-PROPOSE IT LATER AS A GAP SOMEONE SHOULD CLOSE.**

> ## ✅ CORRECTED 2026-09-05 — the "UNCOMMITTED" claim below was FALSE
>
> The previous status line, and the `⛔ Committed | NO` row in the table below, said both parts sat
> **uncommitted in the working tree**. **That was wrong.** Verified in the repository 2026-09-05:
>
> - Part A (`src/core/execution/WinCheckExecution.ts`) and Part B
>   (`src/client/leaderboard/LeaderboardReporter.ts`) are **committed together in `6b30e22`**.
> - `6b30e22` is an **ancestor of `HEAD`**, and `HEAD` is the production version bump to **`0.0.141`**.
> - Both files are **clean in the working tree** — nothing of this task is uncommitted.
>
> ⚠️ **One consequence to note, not to re-litigate:** `plan.md:52` / `plan.md:515-518` asked for Part A
> and Part B as **two separate, independently revertable commits**. They landed in **one** commit.
> That mitigation is spent; a revert of `6b30e22` removes both halves together. Recording it as fact —
> the work is deployed and working, so this is not a defect to fix.
>
> ### 🟢 CONFIRMED LIVE IN PRODUCTION — observed on GameAnalytics 2026-09-05, build `0.0.141`
>
> ⚠️ **Source: dashboard observation relayed from the lead session. Not reproducible from the
> repository** — analytics are production-only and no agent has dashboard access.
>
> | Part | What was observed |
> |---|---|
> | **Part A** | `Match:WinCondition` — **177 events on 2026-09-05**, all post-deploy, over roughly **two hours**. |
> | **Part B** | `Match:Leaderboard:Award:Participation:SoloTutorial` observed. 🔴 **The FIRST observed instance is a TUTORIAL match awarding platform-leaderboard points** — direct evidence bearing on the [`0210`](../../backlog/0210-singleplayer-platform-leaderboard-reporting-policy/brief.md) ruling. Carry this to `0210`; it is a finding, not a footnote. |
>
> **Reading artifact:** a saved GameAnalytics custom query named **`0208 Match WinCondition count`**
> (Explore → Design/Count, Past 7 days rolling). Use it for every future read of this metric.
>
> ### ~~🔴 THE TASK IS NOT ANSWERED. ONLY THE INSTRUMENTATION IS PROVEN.~~
>
> 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **PART A IS NOW ANSWERED** — the
> full-day Group-by read this box demanded was taken 2026-09-11 over **4–10 Sep 2026**. See
> *🟢 THE MEASUREMENT* above. ⛔ **PART B IS STILL UNANSWERED** — the Singleplayer award-incidence
> number has never been counted, only one occurrence observed. **The rest of this box is the record of
> what was demanded, kept because it defines the read that was taken.**
>
> ⚠️ **177 events over ~2 hours is a THIN SAMPLE, skewed to whoever happens to play at midday.** It
> proves the events arrive. It does **not** produce this task's deliverable.
>
> **The number `0208` exists to produce is the CLIENTLESS-LEADER SHARE** — the split by leader kind:
>
> | Clientless (the numerator) | Client-backed |
> |---|---|
> | `Bot` · `Nation` · `BotTeam` · `NationsTeam` | `AiPlayer` · `Human` · `HumanTeam` |
>
> That needs the deeper **Group by (Event id 03/04/05)** read, taken over a **FULL DAY**, not a
> two-hour window. ⛔ **[`0211`](../../backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md)
> is blocked on that number** — and merely seeing events arrive does **not** clear its gate.

> # ⛔ BUILT AND REVIEWED IS NOT DONE. DO NOT CLOSE THIS TASK.
>
> **Set by the producer 2026-09-04, on a lead ruling given live in session, overruling the reviewer's
> closing suggestion that the task be handed to the producer to close.** ⛔ **`/fkit-task-done` was NOT
> run and must not be run until the conditions below are met.**
>
> ### What actually exists today
>
> | | |
> |---|---|
> | ✅ **Built** | Part A **and** Part B, both complete in the working tree. |
> | ✅ **Reviewed** | **7 review rounds** (Part A rounds 1–4, Part B rounds 1–3), **10 findings** — **9 fixed and verified** (`R1`–`R6`, `B1`, `B2`, `B4`), **1 owner-accepted residual** (`B3`). Ledger: [`review.md`](review.md). |
> | ~~⛔ **Deployed**~~ ✅ **Deployed** | ~~**NO. Never.**~~ 📌 **CORRECTED 2026-09-05: YES** — in build `0.0.141`. |
> | ~~⛔ **Data collected**~~ ⚠️ **Data collected** | ~~**NO. Zero.**~~ 📌 **CORRECTED 2026-09-05: events ARRIVE** (177 Part A events on 2026-09-05 over ~2h; one Part B `…:SoloTutorial`). ~~⛔ **But the DELIVERABLE NUMBER — the clientless-leader share — is still NOT read.** A thin midday sample is not the answer.~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **BOTH deliverable numbers have now been READ off the dashboard (4–10 Sep 2026): Part A 6.86K client-matches, Part B 79.11K award ATTEMPTS.** ~~⚠️ **Part B's Event id 04 award-kind split was NOT captured — an acknowledged gap in the read, not a hole in the instrumentation.**~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **The split has since been read: `Participation` 62.29K · `PlacementWon` 14.28K · `PlacementLost` 2.53K ⇒ ~62.29K reported MATCHES (~8.9K/day).** ~~⛔ **`Solo`+`SoloTutorial` COMBINED — no mode cross-tab; see the non-tutorial derivation bar.**~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **THE CROSS-TAB HAS SINCE BEEN READ (same session, same window): `Solo` `Participation` 49.64K ⇒ the NON-TUTORIAL MATCH count, ~7.1K/day; the derivation bar is DISCHARGED BY MEASUREMENT and was proved right.** ⚠️ **Attempts, platform failures included — never points banked.** |
> | ~~⛔ **Committed**~~ ✅ **Committed** | ~~**NO.** Both parts sit **uncommitted** in the working tree.~~ 📌 **CORRECTED 2026-09-05: the struck text was FALSE.** Both parts are in **`6b30e22`**, an ancestor of `HEAD`. ⚠️ **One commit, not the two prescribed** — see the correction box above. |
>
> ### 🔴 The four things a later reader will get wrong
>
> **1. A green review is not a deployment.** ~~🔴 **NOTHING HAS BEEN OBSERVED ON A DASHBOARD AT ANY POINT
> IN THIS TASK.**~~ 📌 **SPENT 2026-09-05 — struck, not deleted; TRUE WHEN WRITTEN, overtaken by the
> deploy.** ✅ **Events have now been observed on the dashboard** (see the correction box above). ⚠️ **The
> rest of this item STILL STANDS:** Analytics are **production-only**, so **every figure in `plan.md` and `review.md` is a
> design claim about what *will* be emitted — never a measurement.** The reviewer wrote this into both
> closed-out status lines deliberately, so that quoting either alone could not be read as "done"
> (`review.md:13-25`, `review.md:664-677`). ⚠️ **This task is a MEASUREMENT task: its deliverable is the
> number, not the instrumentation.** Marking it `✅ Done` today would put `Done` on a task whose entire
> purpose is unfulfilled.
>
> **2. ⛔ [`0211`](../../backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md) REMAINS GATED —
> the gate is NOT satisfied.** The owner's 2026-09-04 ruling requires this task **DEPLOYED AND
> COLLECTING DATA**. ⚠️ **Neither "built" nor "reviewed" nor "merged" satisfies it.** Recording this task
> as `✅ Done` would make that gate *read* as cleared while `0211`'s pre-fix denominator is still
> unmeasured — and shipping `0211` first **destroys that denominator permanently**. See the sequencing
> box below, which is unchanged and still governs.
>
> ~~**3. NOTHING IS COMMITTED — and the commit shape is prescribed.**~~ 📌 **CORRECTED 2026-09-05 —
> struck, not deleted, and this one was FALSE, not merely spent.** ✅ **Everything IS committed**
> (`6b30e22`, an ancestor of `HEAD`). 🔴 **The owner commits; no agent does** — that part stands and
> always will. ⚠️ **`plan.md:52` / `plan.md:515-518` asked for TWO SEPARATE, INDEPENDENTLY REVERTABLE
> COMMITS and the work landed in ONE.** The split was the only mitigation for the attribution cost in
> Decision 1 (below); it is **spent**. Recorded as fact, not raised as a defect — the code is live and
> working, and nothing here is worth a re-commit.
>
> ~~**4. THREE VERIFICATION STEPS ARE UNCOVERED — by honest declaration, not oversight.**~~
> 📌 **AMENDED 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** 🚨 **TWO ARE UNCOVERED NOW, NOT
> THREE — `V18` WAS RUN 2026-09-11 AND PASSED.** ⛔ **`V16` AND `V17` ARE UNCHANGED AND STILL
> UNCOVERED; `V18`'s pass discharges `V18` ALONE.** They were
> declared as uncovered in **every** review round (`review.md:676-677`, `review.md:1071-1077`).
> ⛔ **Do not let any status imply full verification.**
>
> | Step | What it is | Coverage |
> |---|---|---|
> | **V16** | Neither Part B event fires while watching a **replay** | ⛔ **UNCOVERED — UNCHANGED.** Argued from source — both call sites are `gameRecord === undefined`-gated — **not proved by test**; the repo has no harness for it. |
> | **V17** | **Exactly one event per path per match** | ⛔ **UNCOVERED — UNCHANGED.** Rests on the **pre-existing** `hasReportedParticipation` / `hasProcessedWin` latches; confirmed by reading, not by test. ⛔ The brief's own step 17 says *do not report it satisfied by reading the code*. |
> | **V18** | **Reload the page mid-Singleplayer match** | ✅ **RUN 2026-09-11 AND PASSED** — production build `0.0.141`, **Singleplayer custom game** on World (⛔ **not** the tutorial), match live and ticking (~36 s, `Anon551`, 10.6K troops, 25.8K gold); the reload returned **straight to the main menu** — no rejoin prompt, no resumed match. ⇒ ✅ **The no-resume conclusion is now an OBSERVATION, not an inference,** and ~~a **manual play-test that was NEVER RUN**~~ 📌 **struck, not deleted — spent 2026-09-11.** Full record in `## Status` → *🟢 THE `V18` PLAY-TEST*. |
>
> ### 📌 The `0022` bundling trade — an ACCEPTED COST, not a defect
>
> **Decision 1, owner ruling given live in session 2026-09-04** (`plan.md:36-54`): **`0022` + Part A +
> Part B ship together.** 🔴 **The owner chose this AGAINST both the coder's and the architect's
> recommendation.** ⛔ **It stands. Do not re-litigate it.** The costs the owner accepted, recorded
> because they asked for them to be recorded:
>
> - A post-deploy **desync or stall regression CANNOT BE ATTRIBUTED** between `0022`'s guard and Part A's
>   instrumentation — they are the only two changes on that path and they land together.
> - **A rollback removes all three together.** ⚠️ **Bisecting therefore needs a SECOND DEPLOY, not a
>   rollback.** *(The prior release was named as `v0.0.140` in the ruling — ⚠️ **relayed, not verified
>   against the repo.**)*
>
> ### ⏭️ REMAINING WORK — the task is NOT finished at deploy either
>
> 📌 **UPDATED 2026-09-05 — steps 1–3 are DONE. Steps 4–6 are the whole of what remains.**
>
> 1. ~~**Owner commits** Part A and Part B as **two separate, independently revertable commits**.~~
>    ✅ **DONE** — in **one** commit (`6b30e22`), not two. See the correction box.
> 2. ~~**Owner deploys to production.**~~ ✅ **DONE** — build `0.0.141`. ⚠️ Bundled with `0022` per Decision 1.
> 3. ~~**Confirm the events actually ARRIVE** on the GameAnalytics dashboard — `Match:WinCondition:*`
>    (Part A) and `Match:Leaderboard:Award:*` (Part B).~~ ✅ **DONE 2026-09-05** — both observed. ⚠️ **This
>    proves the instrumentation, and nothing more.**
> 4. ~~🔴 **READ THE NUMBERS. THIS IS THE DELIVERABLE AND THE STEP THAT COMPLETES THE TASK. STILL NOT DONE.**~~
>    ✅ **PART A DONE 2026-09-11** — the clientless-leader SPLIT via Group by (Event id 03/04/05), read
>    over **4–10 Sep 2026, full days**, off the saved query `0208 Match WinCondition count`. Recorded in
>    *🟢 THE MEASUREMENT* above. ~~⛔ **PART B STILL NOT DONE** — the Singleplayer platform-leaderboard
>    award incidence has **never been counted**.~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN
>    WRITTEN.** ✅ **PART B DONE 2026-09-11** — `Match:Leaderboard:Award`, **4–10 Sep 2026, full days**,
>    same session and same window as Part A: **79.11K award ATTEMPTS** — `Solo` **65.45K** ·
>    `SoloTutorial` **13.66K**. Recorded in *🟢 THE MEASUREMENT — PART B'S DELIVERABLE* above.
>    ⚠️ **ATTEMPTS, NOT POINTS BANKED**, and ~~⛔ **the Event id 04 award-kind split was NOT captured** —
>    **one further dashboard read closes that.**~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN
>    WRITTEN.** ✅ **THE SPLIT HAS SINCE BEEN READ (step 7 below).** The numbers feed
>    **ADR-110's re-raise trigger**, **whether stalled-match survivors are a real population** (`0211`'s
>    scope), and **`0205`'s rank**.
> 5. **Only then** does the `0211` gate clear, and only then may this task be closed. 📌 **2026-09-11:
>    Part A's number is in. ⛔ THE PRODUCER HAS NOT DECLARED THE `0211` GATE CLEARED** — that is the
>    owner's judgement, and it is complicated by the open owner decision above (the per-match stall rate
>    the gate's purpose points at is **not** what this event can give). See the `0211` note below.
> 6. ~~🚨 **STILL OPEN REGARDLESS OF DEPLOY — AND NOW THE *SOLE* REMAINING BLOCKER ON THIS TASK: `V18`**,
>    the manual mid-match reload play-test. ⛔ **IT HAS NEVER BEEN RUN.** The no-resume conclusion is an
>    **inference** (`saveReconnectSession` is skipped when `transport.isLocal`), **not an observation.**
>    🔴 **`V18` IS THE ONE THING STANDING BETWEEN `0208` AND A CLOSE. Nothing else on this list is open.**~~
>    ✅ **DONE 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** **`V18` WAS RUN AND PASSED** —
>    production `0.0.141`, Singleplayer custom game on World (⛔ **not** the tutorial), match live and
>    ticking, plain reload → **straight to the main menu**, no rejoin prompt. ✅ **The no-resume
>    conclusion is now an OBSERVATION.** 🟢 **NOTHING ON THIS LIST IS OPEN, AND NO BLOCKER REMAINS ON
>    THIS TASK.** ⚠️ **`V16` and `V17` are UNCHANGED and still uncovered** — see the table above.
>    Full record in `## Status` → *🟢 THE `V18` PLAY-TEST*.
> 7. ~~⚠️ **NEW, added 2026-09-11: one more dashboard read** — the **Event id 04 award-kind split**
>    (`Participation` / `PlacementWon` / `PlacementLost`) for Part B, without which **79.11K attempts
>    is NOT 79.11K matches.** ⛔ **An acknowledged gap in the read, NOT a hole in the instrumentation.**~~
>    ✅ **DONE 2026-09-11 — struck, not deleted. The split was read in the same session and window:**
>    `Participation` **62.29K** · `PlacementWon` **14.28K** · `PlacementLost` **2.53K**, reconciling
>    exactly with 79.11K. ⇒ **~62.29K reported matches, ~8.9K/day.** **Blocker (4) is CLOSED.** Recorded
>    in *🟢 THE AWARD-KIND SPLIT* above — ~~⛔ **with its non-tutorial derivation bar, which travels with
>    the number.**~~ 📌 **SPENT 2026-09-11 — the bar is DISCHARGED, see step 8.**
> 8. ✅ **DONE 2026-09-11 — THE LAST OPEN READ: the award-kind × mode CROSS-TAB** (`Match:Leaderboard:Award`
>    filtered to Event id 05 = `Solo`, grouped by Event id 04, same session and window):
>    `Participation` **49.64K** · `PlacementWon` **13.28K** · `PlacementLost` **2.53K** ⇒ **65.45K**,
>    reconciling exactly. 🟢 **`0210`'s non-tutorial MATCH count is 49.64K, ~7.1K/day.** ✅ **The
>    derivation bar is DISCHARGED BY MEASUREMENT — and was PROVED RIGHT (~51.5K forbidden estimate vs
>    49.64K actual; the `Solo` share is 79.7 % / 93 % / 100 % by award kind, not a uniform 82.7 %).**
>    ✅ **`PlacementLost` tutorial contribution is EXACTLY ZERO — the code-derived prediction at
>    `analytics-event-reference.md:187-194` now verified in production data.** ⚠️ **Attempts, platform
>    failures included — never points banked.** ⛔ **NO DASHBOARD READ REMAINS OUTSTANDING;** ~~**`V18` is
>    unaffected and still blocks this task.**~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN
>    WRITTEN.** ✅ **`V18` HAS SINCE BEEN RUN AND PASSED — it blocks nothing now.** ⛔ **The point it
>    made stands: no dashboard read could ever have discharged `V18`, and none did — a manual
>    play-test did.**
>
> ⚠️ **Verification steps 11 and 19 of this brief are the production reads** — they were always scoped
> as post-deploy and were never claimable locally. They remain unrun.

~~⚠️ **SCHEDULED INTO SPRINT 4 on 2026-09-04 (owner ruling, live in session) — and the status is
DELIBERATELY still `🔲 Backlog`.** **Scheduled is not started: nobody is building this.** The owner
ruled *when this is worked*, not that it has begun. The status changes when a plan is approved and
work actually starts.~~

📌 **SPENT 2026-09-04 — struck, not deleted. It was TRUE WHEN WRITTEN and was overtaken by events the
same day: work started, and both halves were built and reviewed.** ⛔ **`🔲 Backlog` is now the WRONG
token** — the canonical vocabulary defines it as *"scoped and filed, **not picked up**"*
([`task-status-vocabulary.md`](../../../knowledge-base/conventions/task-status-vocabulary.md)), and
this task has plainly been picked up. **`🚧 Blocked` is the token the convention gives for *started,
cannot proceed*, with a mandatory inline reason** — the same posture and the same token as
[`0062`](../../backlog/0062-forward-profile-internal-token-in-deploy/brief.md), which is likewise built,
reviewed and awaiting deploy proof. ⚠️ **`🚧 Blocked` here does NOT mean anything is wrong with the
work** — it means the next step is the **owner's**, not an agent's.

**Nothing gates it. Nobody is building it.** It does not depend on `0205`, `0206`, `0207`, `0209` or
`0210`, and 🔴 **it blocks none of them — `0210` explicitly included.** ⚠️ **But it is not
order-neutral** — see *Sequencing*.

~~📌 **Added 2026-09-04: it does not depend on
[`0211`](../../backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md) either, and `0211` does
not gate it** — but they are now **in the same sprint**, and the owner's stated reason includes
**planning them together to avoid two plans reasoning about the same crediting path.** ⚠️ **That is a
coordination preference, NOT a dependency.** ⏳ **One direction of ordering DOES matter now:** if
`0211` ships first, Part A's pre-fix denominator is gone. See *Sequencing*.~~

📌 **UPGRADED 2026-09-04 — struck, not deleted; the earlier framing was CORRECT when written and has
been overtaken by a ruling.** What was recorded above as a *coordination preference* is now an
**actual ordering constraint.**

### 🔴 SEQUENCING CONSTRAINT INSIDE SPRINT 4 — OWNER RULING, 2026-09-04. `0208` SHIPS BEFORE `0211`.

> ⛔ **[`0211`](../../backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md) MUST NOT SHIP
> before `0208` has been DEPLOYED and has GATHERED DATA.**

⚠️ **"Before" has a precise meaning here, and a loose reading satisfies it trivially — so read this
line, not just the one above:**

| | |
|---|---|
| ✅ **What satisfies the constraint** | `0208` **deployed AND collecting data.** |
| ⛔ **What does NOT satisfy it** | `0208` merely **merged**, or merely **built**. A merged metric measures nothing. |
| ✅ **Explicitly ALLOWED — do not over-apply this** | **Planning and building `0211` in parallel is FINE.** |
| ⛔ **What is ordered** | **The SHIP. Only the ship.** |

⛔ **A blanket "don't start `0211`" would be STRICTER THAN THE OWNER RULED. Do not impose it.**

**The consequence, stated plainly because it is the whole reason for the ruling:** shipping `0211`
first **PERMANENTLY DESTROYS Part A's pre-fix denominator.** ⚠️ **You cannot measure how often matches
stalled uncredited once they stop stalling uncredited.** There is no later opportunity, no
reconstruction, and no proxy.

**Owner's reasoning, as put and accepted:** **measure before you fix.** The numbers feed three
decisions — **ADR-110's re-raise trigger**, **whether stalled-match survivors are a real population**,
and **`0205`'s rank** — and they become **unrecoverable** the moment `0211` ships. `0208` is
instrumentation, so it should be the quicker of the two.

~~⚠️ **This does NOT make either task `🚧 Blocked`.** Both stay `🔲 Backlog`. `0208` is not gated by
anything, and `0211` can be **planned and built** freely — it is only its **ship** that waits.~~

📌 **AMENDED 2026-09-04 — struck, not deleted. The CLAIM was correct and REMAINS correct; only one
fact around it changed.** ✅ **The sequencing ruling itself still blocks NOTHING** — `0211` is still
`🔲 Backlog`, still not blocked, and may still be planned and built freely. ⛔ **What changed: `0208`
is now `🚧 Blocked`, and NOT because of this ruling.** It was **built and reviewed on 2026-09-04** and
is ~~**uncommitted and undeployed**~~ 📌 **CORRECTED 2026-09-05: committed (`6b30e22`) and DEPLOYED
(`0.0.141`) — the struck words were FALSE. It is blocked on the DASHBOARD READ, not on the owner's
commit or deploy**, so its next step belongs to the **owner**. 📌 **UPDATED 2026-09-11 — PART A'S
DASHBOARD READ HAS NOW BEEN TAKEN.** ⛔ **The task is STILL `🚧 Blocked`, for a CHANGED reason:** ~~Part
B's number unread, `V18` never run, and an open owner decision.~~ 📌 **AMENDED 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **Part B has since been READ and the owner decision ANSWERED (option B).** ~~🔴 **THE REMAINING BLOCKERS ARE: `V18`, the manual mid-match reload play-test, which HAS STILL NEVER BEEN RUN; and the UNCAPTURED Event id 04 award-kind split from the Part B read.**~~ 📌 **AMENDED 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **The award-kind split HAS SINCE BEEN READ — that blocker is CLOSED.** ~~🚨 **THE SOLE REMAINING BLOCKER IS `V18`, THE MANUAL MID-MATCH RELOAD PLAY-TEST, WHICH HAS STILL NEVER BEEN RUN.**~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** 🟢 **`V18` WAS RUN 2026-09-11 AND PASSED — NO BLOCKER REMAINS, and the status is now `🔄 In progress`, ready to close pending the owner's word.** ⚠️ ~~**Do not read `0208`'s
`🚧 Blocked` marker as `0211` gating it — nothing gates `0208`.**~~ 📌 **The `🚧 Blocked` marker is gone; the underlying point is unchanged — nothing gates `0208`, and `0211` never did.** See the `## Status` section.

## Owner
fkit-coder — ⚠️ **with an `fkit-architect` consult expected at plan time.** See *The emission seam* for
why: the instrumentation point is in `src/core/`, and where the event crosses into the client is a
design decision this brief deliberately does not make.

---

## Context

### Why this exists — the gap, stated exactly

Today's evidence for both [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md) and
[`0206`](../0206-ffa-timer-expiry-award-to-top-client-player/brief.md) is a **headless simulator
result, not a field observation.**

**What was actually run** (2026-09-03, at the owner's explicit request, by an `fkit-coder`): the real
**World** map, **400 bots**, **`DefaultConfig` — not `TestConfig`**. With a timer, the bot team topped
the ranking **12/12** and `setWinner` was called **0/12**. The territory route crossed 95 % at
**ticks 6180–9480 ≈ 7–10 minutes** of real play, **12/12**, on the shipped public config.

**And the decisive limit:** **humans were idle by construction** — which was the owner's requested
method, not an oversight. The activity sweep then showed the Team-mode defect is
**passivity-dependent**: **0–20 % active → stalls; 40 % → 1/3; 60–100 % → resolves normally**.
⚠️ **The caveat that must ride with that number, every time:** "active" was `FakeHumanExecution` at
**Medium**, which plays **better than a casual human** — so **the real-world crossover is probably
HIGHER than 40 %.** Do not quote 40 % as the human threshold.

> 🔴 **Nobody knows the production rate. That is the entire gap this task closes.**

### 📌 Why it is a brief and not a conversation — the owner's stated reasoning, recorded

> **Owner ruling, 2026-09-03, given live in session: *"File a brief, don't schedule."***

**Owner's reasoning, recorded because it is the point of the task and not a formality:** filing puts
the question **on a board** instead of leaving it only in a conversation, and it **stops "we never
measured it" being rediscovered in three months.**

~~⚠️ **Read the rank and the board placement together with that reasoning.** Unscheduled here means
*deliberately not committed to a sprint* — it does **not** mean low-value or forgotten. A future
reader finding this sitting unscheduled must not treat it as a scheduling miss, exactly as with
`0205`.~~

✅ **CORRECTED 2026-09-04 — THIS TASK IS NO LONGER UNSCHEDULED.** `0208` was **SCHEDULED INTO SPRINT 4**
by owner ruling given live in session, 2026-09-04; tracked on
[`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md), with its
[`backlog.md`](../../../sprints/backlog.md) row kept as `➡️ Moved`. **Struck, not deleted — the struck
paragraph was accurate for exactly as long as nothing scheduled this task, and is spent, not wrong.**
⚠️ **Status is still `🔲 Backlog` — scheduled is NOT started, nobody is building it.** ~~**Rank is
unchanged at `Medium` and is still the PRODUCER'S, not an owner ruling** — ⛔ **the ruling scheduled
this task; it did not rank it.**~~

🔴 **RANK CLAIM CORRECTED 2026-09-04 — the struck sentence was WRONG WHEN WRITTEN** (added earlier the
same session by the producer while correcting the scheduling staleness). ⛔ **It is NOT "spent, not
wrong" like the other strikes in this brief — it was false on the day it was typed**, on the value and
on the provenance. **The rank is `High`** — see *Priority* above, which is authoritative. ⚠️ **A
SEPARATE owner ruling of 2026-09-04 DID rule on the rank: it ruled THAT the rank be RAISED, and left
the VALUE to the producer, who set `High`.** ⛔ **So "the ruling scheduled this task; it did not rank
it" is false — there were TWO rulings that day, and the second one did.**

### ~~The three consumers~~ → ~~**four**~~ → 📌 **SIX** — who is waiting on this number

> 🔴 **Updated 2026-09-04. The table below lists FOUR; there are now SIX, and the two additions are
> the reason this task was scheduled.** They are recorded here rather than rewritten into the table so
> the growth is visible.
>
> 5. 🔴 **ADR-110 — its RE-RAISE TRIGGER now points at this measurement** (architect's correction,
>    2026-09-04; it previously cited `0206`'s phase-1 investigation, which never ran because `0206`
>    was reverted). ⚠️ **This consumer can REOPEN AN ACCEPTED ADR** — see the ADR-110 entry in *Notes*.
>    **It is materially larger than the four below.**
> 6. **[`0211`](../../backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md)** — needs to know
>    **whether stalled-match survivors are a real population**, now that survivors are in its scope by
>    the 2026-09-04 owner ruling. ⚠️ **`0211` is scheduled in the same sprint and does NOT gate this
>    task, nor this task it.**

| Consumer | What it is currently asserting without production evidence |
|---|---|
| [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md) — ~~**Priority Low–Medium**~~ 📌 **NOW `Medium`, in force 2026-09-11** | The rank was **held by the owner on 2026-09-03** on the reasoning that **busy lobbies are safe** (60 %+ activity → 0/3 stalls) and the realistic trigger is **private and quiet lobbies**. ⚠️ **That is a claim about the real lobby-activity distribution, and the distribution has never been measured.** Real numbers are what would confirm the rank — or overturn it. ✅ **RESOLVED 2026-09-11 — this task's figure overturned the hold and `0205` WAS RE-RANKED to `Medium`.** Three authorship layers, ⛔ not to be flattened: **THAT it be re-ranked** = owner ruling, 2026-09-11; **THAT the value is `Medium`** = the producer's proposal; **THAT `Medium` is approved and in force** = owner sign-off, 2026-09-11. 🚨 **The caveats travel with it and do not weaken:** client-match unit, **lower bound**, latched at the **first crossing**; *"52 % of Team matches stalled"* remains **unsupported**; the per-match rate is **permanently unknowable by owner ruling (option B)** and ⛔ **not a gap to close.** ⛔ `0205`'s status, scope and folder are **unchanged**. |
| [`0206`](../0206-ffa-timer-expiry-award-to-top-client-player/brief.md) — ~~scheduled in Sprint 4~~ ~~📌 **✅ Done, closed 2026-09-03.** ⚠️ **Closed ≠ deployed — production state not verified this turn**~~ 🔴 **REVERTED 2026-09-04 — BEHAVIOUR NOT IN THE GAME, NEVER DEPLOYED.** Still `✅ Done` and still in `tasks/done/` (**correctly** — the work was done); the **effect** was reverted. **Struck, not deleted.** ⚠️ **`0206` is no longer a consumer waiting on this number — it is a cautionary example of what not having it costs.** | Its brief carries an explicit **unmeasured-frequency flag**: whether a clientless leader actually reaches the **80 %** FFA threshold in a real public lobby is recorded as **UNMEASURED, no production observation, no player report on file**. 🔴 **Updated 2026-09-04: that flag was never discharged, and the task built on top of it was reverted when its premise was measured and failed.** The successor consumer is [`0211`](../../backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md). |
| [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md) **investigation step 2** | Marked ✅ done by simulation, **with the residual left open in the same breath**: *"that was a simulator with idle humans on one map. Production frequency is still unmeasured."* This task is that residual. |
| 📌 **NEW — [`0210`](../../backlog/0210-singleplayer-platform-leaderboard-reporting-policy/brief.md)** — **ruled, unblocked, unscheduled** | Its own brief records **"How often non-tutorial Singleplayer ends this way → ⚠️ Unmeasured"**, and its rank line says **"Not ranked on incidence."** ⚠️ **It is a consumer, NOT a dependent.** The ruling was explicitly not conditioned on incidence. What a number buys is **retrospective**: how much farming the guard actually removed. |

⚠️ **This brief cites those four. It does not edit them** — except for one deliberate, owner-instructed
edit to `0210`'s Notes, striking the *"🚩 Open, not ruled — `0208`'s measurement scope"* section, which
**this ruling closes**. `0206` is closed and is in `ai-agents/tasks/done/`; its folder was **not touched**
and its inbound links here were re-pointed by that close, **not by this edit**.

---

## What to measure

📌 **Two halves since 2026-09-03. Part A is the task as filed; Part B is the widening.**
⚠️ **They are different questions on different code in different tiers** — Part A is a
`src/core/` simulation question, Part B is a `src/client/` reporting question. **Do not merge them into
one event.** They share a motive, not a measurement.

---

### Part A — Multiplayer clientless-leader incidence *(as originally filed, unchanged)*

**One question, two modes, two branches:**

> **How often, in live production, is the leader at the moment the win condition fires a player or
> team with no client behind it?**

| Mode | The decision point | What "clientless leader" means there |
|---|---|---|
| **FFA** | `WinCheckExecution.checkWinnerFFA()` | The top player by tiles has **`clientID() === null`** — a **Bot** (`PlayerType.Bot`) or a **Nation** (`PlayerType.FakeHuman`). ⛔ **NOT an AI player** — `PlayerType.AiPlayer` carries a real `clientID` and, per **ADR-110**, may legitimately win. |
| **Team** | `WinCheckExecution.checkWinnerTeam()` | The top team by aggregate tiles is **`ColoredTeams.Bot`**. |

**Both branches of the win condition must be distinguishable in the data, not merged:**

- **Territory threshold** — leader's share exceeds `percentageTilesOwnedToWin()`
  (✅ verified: `src/core/configuration/DefaultConfig.ts:713-718` — **95** for `GameMode.Team`, **80**
  otherwise).
- **Timer expiry** — `maxTimerValue` has elapsed.

⚠️ **The two branches are not equally reachable in public play, which is exactly why merging them
would destroy the answer.** Public lobbies ship `maxTimerValue: undefined`
(✅ `src/server/MapPlaylist.ts:162`), so **the timer branch cannot fire in a public lobby at all** —
public traffic can only ever exercise the threshold branch. A single undifferentiated counter would
therefore read as "the timer route never happens", which is a property of the config, not a finding.

✅ **Producer-verified against the working tree this turn:** both guards exist as described.
`checkWinnerFFA()` guards on `max.clientID() === null` with a `gameType !== Singleplayer ||
isTutorial === true` carve-out (**this is `0022`'s risk-1 fix, already in the tree**);
`checkWinnerTeam()` guards on `max[0] === ColoredTeams.Bot && gameType !== GameType.Singleplayer`.
⚠️ **Locate by symbol, not by line — this file has moved twice in two days.**

### Dimensions the number is useless without

| Dimension | Why |
|---|---|
| **Game mode** — FFA vs Team | The two guards are different code with different thresholds. `0205` and `0206` are separate tasks for this reason. |
| **Lobby type** — public vs private | `0205`'s whole rank rests on "the realistic trigger is private lobbies". Without this split the data cannot confirm or refute that. |
| **Branch** — threshold vs timer | See above. |
| **Leader kind** — Bot / Nation / bot-team | `0205`'s deferred **all-Nations team** plan-time decision is about exactly this distinction. A Nation-led stall and a Bot-led stall are different products. |

⛔ **Do not add a player-count or activity dimension on a guess.** Lobby activity is what the
simulation says the outcome depends on, so it is tempting — but it is high-cardinality and its
definition is not settled. **Raise it at plan time; do not smuggle it in.**

⛔ **No identifiers.** No player IDs, no Yandex IDs, no lobby IDs, no client IDs in the event or its
dimensions. The question is a **rate**, and a rate needs no identity.

---

### Part B — Singleplayer platform-leaderboard award incidence 📌 *added 2026-09-03*

> **How often does the client award platform-leaderboard POINTS out of non-tutorial Singleplayer, and
> by which of the two paths?**

#### 🔴 It is `points`, not `placement`. This distinction was conflated repeatedly and must not be again.

**`placement` never leaves the browser.** ✅ Verified: `reportPlacement()` in
`src/client/leaderboard/LeaderboardReporter.ts` (symbol, not line — the file is short and unstable)
passes **only `params.points`** to `FlashistFacade.instance.increaseCurPlayerLeaderboardScore(...)`.
`params.placement` reaches **nothing but a `console.debug` line.**

⛔ **So a measurement of `placement` measures a value that never reaches the platform, and answers
nobody's question.** Count **points awarded**. `placement`'s own defect is
[`0209`](../../backlog/0209-define-placement-semantics-and-fix-literal-one/brief.md) and is **not this task**.

#### The two award paths — both in scope, and the unguarded one is the farmable one

| Path | Trigger | What is awarded | Why it is in scope |
|---|---|---|---|
| **`reportParticipation()`** | Fires **once per match**, from the game-update handler, the first time `this.myPlayer !== null` and the lobby is not a replay. | `leaderboardPoints.participation` = **1** | 🔴 **This is the farmable path.** It is **unguarded** — no game-type check of any kind. It fires on a match *started*, so it needs **no win, no loss, and no opponent**: start, quit, repeat. **A measurement that only counts `reportPlacements()` misses it entirely.** |
| **`reportPlacements()`** | Fires **once per match**, on the first `Win` update, lobby not a replay. | `awardTable[myIndex]` over `[first, second, third]` = **`[10, 5, 2]`**. In Singleplayer there is exactly **one** `PlayerType.Human`, so `myIndex === 0` unconditionally → **10 points for LOSING to a bot.** | It is the shape `0210` was filed on, and the more offensive number. |

✅ **All of the above is carried from this session's own verification and from the `0206` review — cite
it, do not re-derive it.** The full step-by-step trace lives in
[`0210`'s Context](../../backlog/0210-singleplayer-platform-leaderboard-reporting-policy/brief.md), which is where
it was established. ⚠️ **Locate every symbol by name, not by line number** — `ClientGameRunner.ts` and
`WinCheckExecution.ts` have both moved repeatedly this week.

#### 🟢 The over-count hazard — **VERIFIED, and it does NOT apply to Part B**

⚠️ **This is the single biggest structural difference between the two halves, and it makes Part B much
cheaper than Part A. Verified this turn by reading the code, not assumed.**

| Hazard, as stated for Part A | Does it apply to Part B? |
|---|---|
| **Hazard A — per-tick re-fire** (the guard `return`s above `this.active = false`, so it re-fires ~90×/min for up to 3 hours) | ✅ **NO — already latched, and the latches are pre-existing production code, not something this task must add.** `ClientGameRunner` declares `hasReportedParticipation` and `hasProcessedWin` as fields, and **each is set `true` immediately before its call**, inside the same `if`. Each path therefore fires **at most once per `ClientGameRunner` instance.** |
| **Hazard B — per-client multiplication** (the server never simulates, so every connected client emits its own copy) | ✅ **NO — Singleplayer has exactly one client.** ✅ Verified: `Transport.ts` sets `isLocal = gameRecord !== undefined \|\| gameStartInfo?.config.gameType === GameType.Singleplayer` — a Singleplayer match runs against the in-browser `LocalServer`. And the reporting path only ever reports the **local** player: `reportPlacements()` returns unless `me.type() === PlayerType.Human`, and both `LeaderboardReporter` functions re-check `PlayerType.Human`. |

🔴 **Consequence, and it is the good news of this widening: Part B's denominator is MATCHES, not
client-matches.** Part A's §2 hazard note — *"either de-duplicate to one emitter, or write the
denominator into the reference doc"* — **does not bite here.** ⛔ **Do not copy Part A's denominator
caveat onto Part B's events.** Writing a client-match caveat onto a count that is genuinely per-match
would be its own kind of lie.

**Two residuals on that conclusion, stated honestly:**

- ✅ **Replays are already excluded, cleanly.** Both call sites carry `this.lobby.gameRecord === undefined`.
  Watching a replay awards nothing and will count nothing.
- ⚠️ **UNVERIFIED — a mid-match reload.** A fresh page load builds a fresh `ClientGameRunner`, which
  resets both latches. **I did not verify whether a Singleplayer match can be resumed or rejoined at
  all.** The evidence points strongly at *no* — `ClientGameRunner` calls `saveReconnectSession(...)`
  only `if (!this.transport.isLocal)`, and `isLocal` is **true** for Singleplayer, so no reconnect
  session is ever stored — but that is an inference from one call site, not a test.
  📌 **Leave this to plan time. Do not report it as settled either way.**

#### 🟡 Part of Part B may already be answerable with NO CODE — check before building

⚠️ **Check this first. It could remove half the work, and it is the kind of thing that is embarrassing
to discover after shipping an event.**

- **`Game:Mode:Solo` already ships in production.** ✅ Verified: `MatchStartAnalytics.ts` exports
  `gameModeAnalyticsEvent(gameType)`, which returns `GAME_MODE_SOLO` for
  `GameType.Singleplayer` and `GAME_MODE_MULTIPLAYER` otherwise; `logMatchStartAnalytics()` fires it
  immediately after `GAME_START`, and `ClientGameRunner` already calls that on the `"start"` message.
  **So a count of Singleplayer matches started already exists.**
  ⚠️ **But it is NOT the same number, on two counts, and both push the wrong way:**
  1. 🔴 **It does not exclude the tutorial.** `analytics-event-reference.md` states `Game:Mode:Solo`
     covers *"solo mode, missions, **and tutorial matches**"*. The scope here is **non-tutorial**
     Singleplayer, so the existing count **over-states** it by the whole tutorial share.
  2. ⚠️ **The trigger differs from `reportParticipation()`'s.** `Game:Mode:Solo` fires on the `"start"`
     message and is suppressed on reconnect/replay; `reportParticipation()` fires later, on the first
     update where `myPlayer !== null`. **A player who starts a Singleplayer match and leaves before
     that point gets the analytics event but no point.** Near, not identical.
- **`Match:Loss:OpponentWon` already ships too, and is a PARTIAL proxy for the placement half — biased
  LOW.** ✅ Verified: `WinModal.isSoloOpponentWin()` already carries **exactly the predicate this
  measurement needs** — `gameType !== GameType.Singleplayer || gameConfig.isTutorial → false`, plus a
  tagged-tuple winner check across all three `["opponent"|"team"|"player", …]` shapes.
  🔴 **But it also requires `myPlayer.isAlive()` and `!hasShownDeathModal`, and `reportPlacements()`
  requires neither.** A human who was **eliminated** in Singleplayer still receives the 10 points when
  the `Win` update lands, and fires **no** `Match:Loss:OpponentWon`. ⛔ **So this event cannot be used
  as the answer** — it undercounts by the eliminated-player share, which is plausibly large. It is a
  **lower bound and a cross-check**, nothing more.

📌 **Recommended plan-time step, before writing any event: pull the existing `Game:Mode:Solo` and
`Match:Loss:OpponentWon` production counts and say what they do and do not answer.** ⚠️ **That is a
dashboard read, not a code change** — and per §5 it cannot be done locally.

#### The discriminator must be ADDED — but a ready-made predicate exists two files over

✅ **The carried fact holds, and its scope is exact:** `grep -n "Singleplayer\|gameType\|isTutorial"`
returns **zero hits** across `src/client/ClientGameRunner.ts`, `src/client/leaderboard/` and
`src/client/flashist-game/`. **The leaderboard reporting path has no game-type awareness. The
measurement must add a discriminator, not read an existing one.**

📌 **Refinement, verified this turn, that makes this cheaper than it sounds:** *elsewhere in the client*
the discriminator already exists twice —
`MatchStartAnalytics.gameModeAnalyticsEvent()` (solo vs multiplayer) and
`WinModal.isSoloOpponentWin()` (**non-tutorial** Singleplayer + opponent-won, all three winner shapes).
`ClientGameRunner` **already imports** `MatchStartAnalytics`. ⛔ **This does not weaken the "must be
added" fact** — nothing in the leaderboard path reads either — but a plan that writes a fourth
game-type predicate from scratch, instead of reusing one of these, should say why.

#### Dimensions Part B's data is useless without

| Dimension | Why |
|---|---|
| **Path** — participation vs placement | Different triggers, different point values (**1** vs **10**), different farm rates. **Merging them destroys the farmability answer**, which is the whole point. |
| **Tutorial vs non-tutorial** | 🔴 **The load-bearing split.** `0210`'s scope is non-tutorial. Without this dimension the number is not comparable to anything `0210` says, and the existing `Game:Mode:Solo` count already fails for exactly this reason. |
| **Points awarded** — the value | For placement it should be **10** every time (single human ⇒ `myIndex === 0`). ⚠️ **Record it anyway rather than assuming it** — if a value other than 10 ever appears, an assumption in `0209` or here is wrong, and that is worth knowing. |
| **Outcome** — human won vs human lost, on the placement path | The 10-points-for-losing case is the offensive one. `0210` rejected option B (*report only on a real win*) on the reasoning that **winning against bots is no more leaderboard-worthy than losing** — so this dimension is **evidence about a settled decision, not a reopening of it.** ⛔ **Do not present it as grounds to revisit B.** |

⛔ **No identifiers here either** — same rule as Part A. No player IDs, no Yandex IDs, no lobby IDs, no
client IDs. It is a rate.

⛔ **Do NOT add a "how many Singleplayer matches did this player start" dimension.** It is the obvious
farm-detection instinct and it is **per-player behavioural tracking**. This task measures a **rate**, not
people. If per-player farm detection is ever wanted, it is a separate brief with its own privacy review.

---

## What to Build

**Instrumentation only. This task ships no gameplay change, it does not fix the stall, and it does not
add the Singleplayer guard.** The fixes are `0205` (Team), `0206` (FFA, closed) and `0210`
(Singleplayer). ⛔ **Do not "just fix it while you are in there."** 🔴 **`0210` in particular is a
one-line-shaped temptation and adding its guard here would destroy this task's own measurement** —
the guard makes the rate unobservable, which is the entire reason the owner asked for the measurement
first.

### 🔴 PART A IS EFFECTIVELY THRESHOLD-ONLY IN PRODUCTION — recorded 2026-09-04 on an owner ruling

**In a real public match the 80 % territory threshold is the ONLY branch that can fire.** The timer
branch fires only where a timer is **explicitly set**, i.e. **private lobbies.**

✅ **Both citations verified by the producer this turn, read directly from the working tree** — and
⚠️ **they are NOT equally strong. Read the second row before repeating the claim:**

| Citation | What it actually shows |
|---|---|
| `src/server/MapPlaylist.ts:162` — `maxTimerValue: undefined` | 🔴 **Load-bearing.** Sits in the public playlist config (`gameType: GameType.Public`, `:156`) with **no later override in that object literal** ⇒ **a public match genuinely cannot carry a timer.** |
| `src/server/GameManager.ts:63` — `maxTimerValue: undefined` | ⚠️ **Does NOT support the public-only claim, and was relayed as if it did.** This is the **PRIVATE** path (`gameType: GameType.Private`, `:56`), and the `undefined` is a **DEFAULT that `...gameConfig` at `:68` OVERRIDES** — the spread comes *after* it. **This line is the very mechanism by which a private lobby sets a timer.** |

⇒ **The conclusion stands, but it rests on `MapPlaylist.ts:162` ALONE.** ⛔ **Do not cite
`GameManager.ts:63` as evidence that the timer branch is unreachable — it is evidence of the
opposite for private lobbies.** *(Line numbers verified 2026-09-04; **locate by symbol** if they
drift.)*

**What this means for the design — the owner ruled to INFORM it, not to narrow it:**

- ✅ **Part A's PRODUCTION measurement is effectively threshold-only.** Do not spend design effort
  sampling a branch that cannot occur in a public match.
- ⛔ **This does NOT remove the timer branch from scope.** **Private lobbies can and do set timers**,
  and [`0205`](../../backlog/0205-teams-bot-team-win-stall-resolution-policy/brief.md) names *"private lobbies
  with a timer set"* as its **realistic trigger** — so a timer-branch number has a real consumer.
- 🔴 **If a timer-branch sample is taken, LABEL IT AS PRIVATE-LOBBY-ONLY. Do not pool it with the
  threshold sample.** ⚠️ **Pooling them produces a meaningless denominator** — two different
  populations counted as one.

📌 **Provenance:** the finding came from the **local verification of the `0206` revert**, which
**passed** — threshold branch: a bot crossed at **80.4 %** with humans alive at **0.53 % / 0.52 %** ⇒
**no winner, no modal**, and **288** further win-checks silent; timer branch: same, **274** checks;
**ordinary human wins still work**, observed through to `archiving game`. ⚠️ **The silences are
demonstrated absences, not instrument blind spots** — the run built a positive control from the
pre-revert log. ⛔ **NOT verified by that run, and it matters here:** **Team mode** (untouched by the
diff — `0205`'s ground); a **realistic multi-IP winner-vote quorum**; and 🔴 **the NATION case, which
is INFERRED from the shared `clientID === null` guard and was NOT observed** — only a **Bot** was.
⚠️ **`0208` should treat "a Nation reaches the threshold" as a hypothesis to measure, not an
established fact** — this is the same inference `0206`'s play-test gate made, and it is still
untested.

📌 **§1–§6 below are PART A (multiplayer, `src/core/`). §7 is PART B (Singleplayer, `src/client/`).**
⚠️ **They are separately shippable.** If only one can be built, say which and why — do not silently
half-do both.

~~⚠️ **Both halves are racing a clock, and Part A's is further along.** `0206` was **closed on
2026-09-03** and its brief now sits in `ai-agents/tasks/done/`. 🔴 **Closed is not the same as deployed,
and the decay is caused by DEPLOY, not by the close** — the multiplayer rate stays observable until the
fallback award is actually live in production. ⚠️ **I did not verify `0206`'s production deploy state
this turn, and this brief does not assert it.** Check it at plan time; if it is already live, Part A
measures the post-fix question and the brief must say so rather than quietly reporting a number against
the wrong denominator.~~ Part B's clock (`0210`) has **not** started — `0210` is unscheduled and nobody is
building it.

✅ **UPDATED 2026-09-04 — PART A'S CLOCK HAS STOPPED. Struck, not deleted; the struck text was
CORRECT when written and is now spent.** ⛔ **`0206` was REVERTED on an owner ruling given live in
session and WAS NEVER DEPLOYED** — so the deploy that would have caused Part A's decay **is not
happening.** The struck paragraph was right about the mechanism (decay comes from deploy, not from the
close) and right to refuse to assert the deploy state; **the deploy simply never came.** ⇒ **Part A
still measures the PRE-FIX question — *"how often does the stall happen today?"* — against the
pre-fix denominator.** ⚠️ **Neither half is now racing a clock, and that is a change of urgency, not
of value.** A new clock will start if
[`0211`](../../backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md) — the replacement for
`0206`, ~~unscheduled~~ — is scheduled and ships. ✅ **CORRECTED 2026-09-04: `0211` IS NOW SCHEDULED
(Sprint 4, owner ruling); struck, not deleted — spent, not wrong. So the first half of that condition
is ALREADY MET — only the SHIP is still outstanding.** 🔴 **Which is exactly why the owner ordered the
ship: ⛔ `0211` must not SHIP until THIS task is DEPLOYED AND COLLECTING DATA** — ⚠️ **not merely
merged or built** — ✅ **though `0211` may be planned and built in parallel, and ~~neither task is
`🚧 Blocked`~~.** 📌 **SWEPT 2026-09-04 — struck, not deleted; SPENT, NOT WRONG: accurate when
written, false once this task was built.** ✅ **`0211` is still `🔲 Backlog` and still NOT blocked —
only its SHIP is ordered.** ⛔ **THIS task is now `🚧 Blocked` — built and reviewed,**
~~UNCOMMITTED, UNDEPLOYED, NO DATA~~ 📌 **CORRECTED 2026-09-05: COMMITTED (`6b30e22`), DEPLOYED
(`0.0.141`), EVENTS ARRIVING — ~~but the DELIVERABLE NUMBER IS STILL UNREAD.~~** 📌 **AMENDED 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **BOTH deliverable numbers are now READ (Part A and Part B, 4–10 Sep 2026).** ~~🚨 **Still `🚧 Blocked` — on `V18` ALONE** (the manual mid-match reload play-test, never run).~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** 🟢 **`V18` WAS RUN 2026-09-11 AND PASSED; the status is now `🔄 In progress` and NO BLOCKER REMAINS.** ~~**and the uncaptured award-kind split**~~ 📌 **SPENT 2026-09-11 — that split has been READ; blocker (4) is CLOSED.** ✅ **And the award-kind × mode CROSS-TAB — the last open read — was taken the same day: `0210`'s non-tutorial MATCH count is 49.64K, ~7.1K/day (ATTEMPTS, never points banked). NO READ IS OUTSTANDING.** ~~⛔ **`V18` is untouched by any of it and still blocks this task.**~~ 📌 **SPENT 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **`V18` WAS RUN 2026-09-11 AND PASSED — untouched by the reads, as the struck clause said, and discharged by a manual play-test instead.** 🟢 **NO BLOCKER REMAINS; status `🔄 In progress`, ready to close pending the owner's word.** See `## Status`.
⚠️ **Unrelated to the sequencing ruling; nothing gates this task.** ~~🔴 **`0211`'s gate is therefore STILL NOT CLEAR** — the
owner's ruling requires `0208` *collecting data*, and a two-hour sample is not the split it needs.~~
📌 **UPDATED 2026-09-11 — struck, not deleted; TRUE WHEN WRITTEN.** ✅ **PART A'S NUMBER HAS NOW BEEN
READ** (4–10 Sep 2026, full days — see *🟢 THE MEASUREMENT* in `## Status`). ⛔ **THE GATE IS NOT
DECLARED CLEARED HERE. It is READY FOR THE OWNER'S CALL** — because a live scope question is open:
per finding 2, the **per-match stall rate the gate exists to protect is NOT derivable from this event
at any confidence**, so whether this is the number the owner actually wanted is **the owner's
judgement, not the producer's.** ⚠️ **Still check the production state at plan time
anyway:** this brief asserts what was ruled, not what a server is running.

### 1. Instrument the DECISION POINT, not the guard's early return

🔴 **This is the single most important instruction in this brief, and it is what keeps the metric alive
after `0205`/`0206` ship.**

If the counter is placed inside the guard's `return` path, then the day `0205` and `0206` replace that
`return` with a fallback award, **the metric silently goes to zero and measures nothing** — while
still appearing on a dashboard as a healthy green line. That is the worst possible failure for a
measurement task.

**Instead:** record the fact at the point where the win condition has fired and the leader has been
identified — *before* the disposition is decided. The question *"was the leader clientless when the
win condition fired?"* stays meaningful **and stays comparable** after the fix; it simply changes from
"how often we stall" to "how often the fallback award fires."

### 2. Emit at most ONCE per match — this is not optional

⚠️ **Two independent over-count hazards. Both are real, both are large, and a naive counter hits both
at the same time.**

**Hazard A — per-tick re-fire.** The guard `return`s **above** `this.active = false`, so the check is
never deactivated and re-runs on its next scheduled tick, forever. `tick()` runs every **10 ticks**,
and the turn interval is **~66.7 ms** (`100/1.5`, `DefaultConfig.ts`) — so a stalled match emits
roughly **90 events per minute**, for up to the **3-hour** cap (`GameServer.ts:56`). That is on the
order of **10⁴ events from one match.**

**Hazard B — per-client multiplication.** **The server is a turn relay and never simulates**; the game
loop runs on **every client**. So every connected client in that match runs this same code and emits
its own copy. The two hazards **multiply**.

**Required:** a **latch** — the execution records the fact **at most once per match**. A latch field on
the execution is deterministic (every client computes the same thing from the same turns), so it does
not endanger the state-hash/desync machinery.

🚩 **Hazard B is only half-solved by the latch, and the plan must say which half it accepts.** A latch
makes it **one event per client per match**, not one per match. So the denominator is *client-matches*,
not *matches*. **Either** de-duplicate to one emitter, **or** accept the multiplication and **write the
denominator into the analytics reference doc** so nobody later reads a client-match count as a match
count. ⛔ **Do not leave this implicit** — an unlabelled inflated count is worse than no count, because
it looks authoritative.

### 3. The emission seam — a design decision this brief does NOT make

The instrumentation point is in **`src/core/`**; the analytics client lives in **`src/client/`**
(`flashistConstants.analyticEvents` in `src/client/flashist/FlashistFacade.ts`).

- ⚠️ `src/core/` **already imports** `src/client/` in several places (✅ verified this turn:
  `GameRunner.ts`, `Schemas.ts`, `GameImpl.ts`, `PlayerImpl.ts`, `AttackExecution.ts`,
  `TradeShipExecution.ts`, `validations/username.ts`). So the coupling is **not** a bright line today
  — **but it is the explicit subject of
  [`0007-investigate-core-to-client-import-coupling`](../../backlog/0007-investigate-core-to-client-import-coupling/brief.md),
  and adding one more instance on autopilot would be adding to a known open problem.**
- ⚠️ **There is no existing event seam to reuse here.** `WinCheckExecution.ts:12` declares a
  `WinEvent implements GameEvent` class — ✅ **verified this turn to be referenced nowhere else in
  `src/`.** It is dead code, not a hook. **Do not assume it is wired.**

📌 **Take this to the `fkit-architect` at plan time and get the seam approved before writing it.**
The producer is not choosing between "new `GameUpdate`", "`EventBus` event consumed by a client
layer", and "direct import" — that is a technical call.

### 4. The analytics event itself

- Add the event key to the **enum** in `flashistConstants.analyticEvents`
  (`src/client/flashist/FlashistFacade.ts`). ⛔ **Never write the event string inline** — always
  reference it through the enum key.
- Follow the established naming: `Category:Action` or `Category:Subcategory:Value`, **PascalCase,
  colon-separated, no underscores**. The `Match:` family is the natural home (existing neighbours:
  `Match:Duration`, `Match:Loss:OpponentWon`, `Match:SpawnMissed:TimingRace`).
- 🔴 **Update `ai-agents/knowledge-base/analytics-event-reference.md`** — it is the source of truth for
  events, and the project rule is that it is updated **whenever events are added, renamed or changed.**
  Record the **denominator** decision from §2 there too. ⚠️ **This brief did not write that doc** —
  writing `ai-agents/knowledge-base/` is outside the producer's lane and is the implementer's job.

### 5. ⚠️ A production-only pipeline — plan the verification around it

`GameAnalytics` is initialised **only when `process.env.DEPLOY_ENV === "prod"`**
(✅ `src/client/flashist/FlashistFacade.ts:397`), explicitly to keep dev and staging out of production
analytics.

**That is correct for this task's purpose — production is where the question lives — but it means you
cannot verify the number end to end locally.** Verify the **emission path** locally (the call fires,
once, with the right dimensions) and treat the **dashboard appearance** as a separate post-deploy
check. ⛔ **Do not weaken the `DEPLOY_ENV` gate to make local testing convenient.**

### 6. ⛔ Not in scope

- ⛔ **No server-side OTEL counter.** The existing `geoconflict.server.*` metrics
  (`src/server/WorkerMetrics.ts`) are process/host telemetry, and **the server cannot see this event at
  all** — it never simulates, and when the guard fires **no `winner` message is sent**, which is the
  defect. A server-side metric would require a **new client→server message**, which is a materially
  bigger change than this task. If someone wants it, that is a separate brief.
- ⛔ **No change to `WinCheckExecution`'s behaviour.** No fallback award, no touching the
  `gameType !== GameType.Singleplayer` clause (that is PR #77's Singleplayer fix; removing it
  reintroduces that bug and is marked ⛔ in `0022`, `0205` and here).
- ⛔ **No dashboard build.** Getting the event flowing is this task. Reading it is the follow-up.

### 7. 📌 PART B — the Singleplayer half

**Structurally simpler than Part A, and for a reason worth stating: it is entirely in `src/client/`.**

- ⛔ **None of Part A's `src/core/` complexity applies.** No emission seam to design, so **no
  `fkit-architect` consult is needed for this half**; no determinism/state-hash risk, because nothing
  changes in the simulation; no `src/core/` must-be-tested rule triggered by Part B alone.
  ⚠️ **Part A still carries all of it.** If both halves ship together, the architect consult and the
  determinism check are **still required for Part A** — Part B's simplicity does not discharge them.
- **Emit at the two award call sites**, or at the single chokepoint they both funnel through in
  `LeaderboardReporter.ts`. **Choosing the seam is the plan's call** — the chokepoint is the harder
  place to bypass, but it currently has **no access to game type**, exactly as `0210`'s brief records
  for the guard. ⚠️ **The two tasks face the same seam problem. Coordinate the choice** — if `0210`
  threads game type into `LeaderboardReporter` and this task threads it in separately, the second one
  in will conflict.
- 🔴 **Instrument where the award ACTUALLY HAPPENS, and only when it happens.** This is Part A's §1
  instruction wearing different clothes, and the failure mode is the mirror image: if the event is
  emitted at the *call* to `reportPlacement()` rather than where the platform call is made, then a
  future guard that returns early leaves the counter reading a number that no longer corresponds to
  points awarded. ⚠️ **But note the asymmetry with Part A**: here the question genuinely **dies** when
  `0210` ships — there is no "how often does the fallback fire" successor question, because the ruling
  is *report nothing*. **That is why the owner asked for it first, and it is the honest framing: Part B
  is a snapshot with an expiry date, not an ongoing metric.**
- **Add the event key(s) to the enum** in `flashistConstants.analyticEvents`
  (`src/client/flashist/FlashistFacade.ts`). ⛔ **Never write the event string inline.** Same naming
  rule as Part A — `Category:Action` / `Category:Subcategory:Value`, PascalCase, colon-separated, no
  underscores. Existing neighbours worth matching: the `Game:Mode:*` family and `Match:Loss:OpponentWon`.
- 🔴 **Update `ai-agents/knowledge-base/analytics-event-reference.md`** — project rule, same as Part A.
  Record **that Part B's denominator is matches, not client-matches**, and **why** (single client,
  pre-existing latches). ⚠️ **This brief did not write that doc** — `ai-agents/knowledge-base/` is
  outside the producer's lane and is the implementer's job.
- ⛔ **Do not add the `0210` guard.** ⛔ **Do not change `awardTable` or any point value.** ⛔ **Do not
  touch `placement` or `reportPlacements()`'s `_winUpdate` parameter** — that is `0209`, a separate
  ruled task. ⛔ **Do not touch `WinCheckExecution`** — Part B is downstream of it, in the client.

---

## Verification

1. **The event fires on the FFA threshold branch** with a clientless leader (Bot or Nation) at 80 %,
   and carries mode=FFA, branch=threshold, and the leader kind.
2. **The event fires on the Team threshold branch** with the bot team leading at 95 %.
3. **The event fires on the timer branch** in both modes — a private lobby with `maxTimerValue` set.
   ⚠️ **Test this separately.** A green threshold test does not cover it, and public traffic can never
   exercise it (`maxTimerValue: undefined`, `MapPlaylist.ts:162`).
4. 🔴 **The latch holds — exactly one emission per client per match.** Run a stalled match well past
   the point where the guard has re-fired many times and assert the count is **1**, not ~90/minute.
   **This is the step that catches Hazard A**, and a test that only runs a few ticks will pass
   vacuously. ⛔ **Do not report this satisfied by reading the code.**
5. **It does NOT fire when the leader has a `clientID`** — including when the leader is a
   `PlayerType.AiPlayer`, which has a real `clientID` and per **ADR-110** may legitimately win. An
   AI-player win is a normal win, not a stall.
6. **Singleplayer and tutorial paths are unaffected** — a tutorial is created `gameMode: GameMode.FFA`
   (`src/client/Main.ts:823`) with `isTutorial: true` (`:835`), and the FFA guard already carves those
   out. Confirm the instrumentation does not change what happens there.
7. **Determinism is intact.** ⚠️ **This is the one that would be expensive to discover late.** The
   change lives in the deterministic simulation, and state hashing votes every 10 ticks. Confirm the
   latch and the emission introduce **no divergence** between clients.
8. **`src/core/` changes are tested** — project rule, non-negotiable, and this change is in `src/core/`.
9. `npm test` green, `npm run lint` clean.
   ⚠️ If a `supertest` suite fails, check CLAUDE.md's known-flake signature before treating it as a
   regression, **rule out `0197`'s `SIGSEGV` first**, and **say that you re-ran.**
10. **`analytics-event-reference.md` updated**, including the denominator decision from *What to
    Build* §2.
11. **Post-deploy, separate from the code review:** the event actually appears in production
    analytics. ⚠️ **Cannot be checked locally** — see §5.

### 📌 Part B — Singleplayer half *(added 2026-09-03; steps 1–11 above are Part A)*

12. **The participation event fires on a non-tutorial Singleplayer match start**, carrying
    path=participation, tutorial=false, and points=**1**.
13. **The placement event fires when the match ends with the human LOSING to a bot**, carrying
    path=placement, tutorial=false, and points=**10**. 🔴 **This is the headline case — the one the
    owner asked to measure.** Reproduce it by actually losing, per `0210`'s Verification step 1.
14. **Both events fire on the TUTORIAL too, and are marked `tutorial=true`.** ⚠️ **Do not filter the
    tutorial out at emission time.** The dimension is what makes the number comparable to `0210`'s
    non-tutorial scope; dropping the rows destroys the ability to check the split later.
15. 🔴 **Neither event fires in MULTIPLAYER.** This is the regression step that matters — the mirror of
    `0210`'s own step 3. A discriminator written loosely pollutes the multiplayer numbers Part A exists
    to produce, and the two halves would then corrupt each other.
16. **Neither event fires while watching a REPLAY.** ✅ Both call sites are already
    `gameRecord === undefined`-guarded, so this should hold for free — **confirm it rather than
    assuming it**, because a seam moved into `LeaderboardReporter` sits *below* that guard.
17. **Exactly one event per path per match.** ⚠️ **Weaker than Part A's step 4 and deliberately so:**
    the latches (`hasReportedParticipation`, `hasProcessedWin`) are **pre-existing**, so this confirms
    the new emission sits inside them — it is not testing a latch this task added.
    ⛔ **Still do not report it satisfied by reading the code.**
18. ⚠️ **UNVERIFIED, and this is the step that resolves it: reload the page mid-Singleplayer-match.**
    A fresh `ClientGameRunner` resets both latches. Determine whether Singleplayer can be resumed at
    all — the evidence says no (`saveReconnectSession` is skipped when `transport.isLocal`, and
    `isLocal` is true for Singleplayer), **but that is an inference, not a test.** Record what actually
    happens; if a resume double-counts participation, say so in the reference doc.
19. **Before building: the existing-data check.** Report what the production `Game:Mode:Solo` and
    `Match:Loss:OpponentWon` counts already say, and state plainly what they do **not** answer
    (`Game:Mode:Solo` includes the tutorial; `Match:Loss:OpponentWon` misses eliminated players and so
    is a **lower bound**). ⚠️ **Production read, not local** — see §5.
20. **`analytics-event-reference.md` updated for Part B**, including the **matches-not-client-matches**
    denominator and its reasoning.

⚠️ **A note on scope discipline for whoever verifies this:** steps 12–20 involve running Singleplayer
matches and losing them. ⛔ **The instinct to "just add the guard" while sitting in that code is the
single most likely way this task gets ruined.** The guard is `0210`. **Measure, then leave.**

---

## Notes

- **Origin:** owner ruling *"File a brief, don't schedule"*, given live in session **2026-09-03**,
  during the same session that filed `0207` and recorded the ADR-110 and `HumansVsNations` rulings
  onto `0205`.
- 📌 **Scope widening, 2026-09-03:** owner ruling *"Add it — measure both"*, given live in session,
  adding **Part B** (Singleplayer platform-leaderboard award incidence). Reasoning recorded in the
  banner at the top of this brief and **not repeated here as a summary** — it is the ruling's own
  wording that matters.
- ~~**Rank is the producer's**, not the owner's. The owner has ruled *file*, *do not schedule*, and
  *measure both*; they have **never ranked it**. The 2026-09-03 re-rank to **Medium** is mine — see
  *Priority*.~~
  ✅ **UPDATED 2026-09-04 — struck, not deleted. TRUE WHEN WRITTEN, SPENT by a later owner ruling
  the same day.** The owner **has now ruled on the rank** — ⛔ **so "they have never ranked it" no
  longer holds.** **The rank is `High`.** ⚠️ **The ruling was PARTIAL, and the split is the point:**
  **THAT the rank be RAISED is the OWNER'S**; **THAT the value is `High` is the PRODUCER'S** — the
  owner named no value. ⇒ **"Rank is the producer's" is now only HALF true, which is why the whole
  sentence is struck rather than trimmed.** See *Priority*.
- ~~📌 **Still unscheduled, and that is current as of 2026-09-03.** The owner separately ruled the same
  day that **`0209` and `0210` stay unscheduled** — neither is urgent, and Sprint 4 has a deploy to get
  through. `0208` remains unscheduled alongside them.~~ ⛔ **The widening is NOT a scheduling signal.**

  ✅ **CORRECTED 2026-09-04 — `0208` IS SCHEDULED INTO SPRINT 4.** Owner ruling given live in session,
  2026-09-04, tracked on [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md); this task's row on
  [`backlog.md`](../../../sprints/backlog.md) is kept as `➡️ Moved`. **Struck, not deleted** — the
  struck text was true on 2026-09-03, the date it names, and is **spent, not wrong.**
  - ⚠️ **Status is still `🔲 Backlog` — NOT STARTED. Scheduled is not started; nobody is building it.**
  - ~~**Rank is unchanged at `Medium`, and it is still the PRODUCER'S rank, not an owner ruling.**
    ⛔ **The 2026-09-04 ruling scheduled this task; it did NOT rank it.**~~
    🔴 **CORRECTED 2026-09-04 — WRONG WHEN WRITTEN** (added the same session by the producer). ⛔ **Not
    "spent, not wrong" — false on the day it was typed.** **The rank is `High`** (see *Priority*).
    ⚠️ **A SECOND owner ruling that day DID rule on rank — it ruled THAT it be raised and left the
    VALUE to the producer, who set `High`.** ⛔ **Do not read "the owner ranked it `High`" — they did
    not name a value; and do not read "the owner never ranked it" — they ruled the raise.**
  - ⚠️ **`0209` and `0210` are NOT affected — both remain `🔲 Backlog`, unscheduled** (verified
    2026-09-04 against their briefs and [`backlog.md`](../../../sprints/backlog.md)). **Their
    "stay unscheduled" ruling stands.** Only the `0208` clause above went stale.
  - ⛔ **The struck sentence's point survives its own correction:** the scope widening was still
    **NOT** the scheduling signal — a separate owner ruling was.

### 🚩 Sequencing — the one real tension, flagged rather than resolved

⚠️ **This task's value decays, and the decay is caused by a task that is already scheduled.**

- **`0206` is in Sprint 4.** When it ships, the FFA guard stops stalling. Instrumented **before** that,
  this metric answers *"how often does the stall happen today?"* — the question `0205`'s rank and
  `0206`'s unmeasured-frequency flag are actually waiting on. Instrumented **after**, it answers *"how
  often does the new fallback award fire?"* — useful, but a **different question**, and the original
  one becomes **permanently unanswerable**, because the shape it measured will no longer exist.
- **The owner ruled "don't schedule", so this brief does not schedule it.** ⛔ **That ruling is not
  overridden here, and this note is not an argument to override it.**
- 📌 **It is recorded so the trade-off is visible when someone next looks at the board** — and because
  the design instruction in *What to Build* §1 (instrument the decision point, not the guard's return)
  is precisely what keeps this task **useful in the "after" case** instead of silently reading zero.

#### 📌 The same decay now applies to `0210` — and Part B's version of it is WORSE

**Added 2026-09-03 with the scope widening. This is the owner's stated reason for widening.**

- **`0210` is ruled, unblocked and ready to plan.** When its guard ships, Singleplayer stops awarding
  points, and **how often it was happening becomes permanently unobservable.**
- 🔴 **Part B decays harder than Part A, and the difference is real, not rhetorical.** Part A survives
  `0206` **as a different question** — *"how often does the fallback award fire?"* — because the
  decision point still exists after the fix. **Part B has no successor question.** `0210`'s ruling is
  *report nothing*, so after it ships the counter reads **zero forever, by design**. Part B is a
  **snapshot with an expiry date**, and *What to Build* §7 says so rather than pretending otherwise.
- 🔴 **AND YET IT DOES NOT GATE `0210`. This is the point most likely to be misread, so it is stated
  twice in this brief on purpose.** The owner's `0210` ruling was **not conditioned on incidence** —
  option C (*leave it, accept the inflation*) was rejected on **farmability**, with the explicit
  reasoning that unmeasured incidence does not rescue it. ⛔ **Nobody may hold `0210` waiting for this
  number. If the two collide, `0210` wins and Part B loses its window** — the owner's ruling accepted
  that trade in advance.
- ~~⚠️ **Both tasks are unscheduled, so no sequencing is actually committed today.** This note describes
  a trade-off, **not a plan**, and it does **not** override the owner's "don't schedule" rulings on
  either task.~~

  🔴 **CORRECTED 2026-09-04 — THE STRUCK SENTENCE ABOVE IS NOW FALSE AND IS THE MOST DANGEROUS LINE
  THIS BRIEF HAS EVER CARRIED. READ THE CORRECTION BEFORE ACTING ON ANYTHING IN THIS SECTION.**
  **Struck, not deleted** — it was accurate for exactly as long as nothing was scheduled, and is
  **spent, not wrong.**

  - ⛔ **A SEQUENCING CONSTRAINT *IS* COMMITTED TODAY.** Owner ruling, 2026-09-04, given live in
    session: **`0211` must NOT SHIP until THIS task (`0208`) has been DEPLOYED AND IS COLLECTING
    DATA.** ⚠️ **"Deployed and collecting" — NOT merely merged, NOT merely built; a merged metric
    measures nothing.**
  - 🔴 **Why this correction is urgent, not cosmetic:** a reader who acted on the struck sentence
    could ship `0211` first. `0211` closes the XP loss, which **destroys this task's pre-fix
    denominator permanently** — the "how often does the stall happen today?" question becomes
    **unanswerable forever.** That is precisely the irreversible outcome the owner's ruling exists
    to prevent.
  - ✅ **Planning and building `0211` in parallel remains EXPLICITLY ALLOWED — only its SHIP is
    ordered.** ⚠️ **Neither `0208` nor `0211` is `🚧 Blocked`.**
  - 📌 **"Both tasks" in the struck sentence meant `0208` and `0210` — and only the `0208` half went
    stale.** ✅ **`0208` is SCHEDULED INTO SPRINT 4** (owner ruling, 2026-09-04); the owner's earlier
    *"don't schedule"* ruling on **this** task is **superseded**. ⚠️ **`0210` is still `🔲 Backlog`,
    unscheduled — verified 2026-09-04 — and its "don't schedule" ruling still stands, untouched.**
  - ⚠️ **The `0208`/`0210` decay trade-off the bullets above describe is UNCHANGED and still
    unresolved.** This correction fixes a scheduling fact; it settles none of that reasoning, and
    ⛔ **`0210` is still not gated on this number** (see the bullet two above).

### Related, and none of it blocking

- **`0205` / `0206` / `0207`** — cited above; **none edited by this brief.** `0206` is now **closed** and
  lives in `ai-agents/tasks/done/`; ⛔ **its folder is off-limits and was not touched.** Its inbound
  links here were re-pointed by that close on 2026-09-03 — ✅ **checked, not assumed: they already read
  `../../done/0206-…`, and this edit did not re-point them again.**
- 📌 **`0210`** — [`0210-singleplayer-platform-leaderboard-reporting-policy`](../../backlog/0210-singleplayer-platform-leaderboard-reporting-policy/brief.md).
  **The reason Part B exists.** ⚠️ **One deliberate edit was made to it by this change** — the
  *"🚩 Open, not ruled — `0208`'s measurement scope"* section in its Notes was **struck, not deleted**,
  and the ruling recorded in its place. **Nothing else in `0210` was touched**, and its status,
  priority and scope are unchanged.
- 📌 **`0209`** — [`0209-define-placement-semantics-and-fix-literal-one`](../../backlog/0209-define-placement-semantics-and-fix-literal-one/brief.md).
  **Adjacent, and a live conflation risk rather than a dependency.** It owns `placement`; this task
  counts **`points`**. ⚠️ **`placement` never leaves the browser** — see Part B. ⛔ **Not edited by this
  brief, and not blocked by it.**
- 🔴 **ADR-110's RE-RAISE TRIGGER NOW POINTS AT THIS TASK — added 2026-09-04.**
  `ai-agents/knowledge-base/decisions/adr-110-ai-player-may-be-declared-winner.md`. **Cited, not
  authored or edited here** — ⚠️ **the pointer was corrected by the ARCHITECT, in the knowledge-base,
  not by this brief.** ✅ **Producer-verified this turn by reading the ADR:** its *Re-raise only if*
  section carries the item *"**Measurement** shows the T3 case is effectively unreachable in
  production, which would remove the strongest argument for allowing it"*, with the note:
  *"⚠️ **Pointer corrected 2026-09-04:** this originally cited `0206`'s phase-1 investigation, but
  `0206` was reverted before that measurement ran. The work now lives in `0208`. **This trigger is
  therefore still unfired and still live** — nobody has measured it."*
  🔴 **What that means for this task, stated plainly: THIS MEASUREMENT CAN REOPEN AN ACCEPTED ADR.**
  If it shows the clientless-leader case is effectively unreachable in production, it **removes the
  strongest argument** for ADR-110's `allow` ruling. ⚠️ **That is a materially larger consumer than
  the four in the consumers table above, and it was NOT among them** — the table was written before
  the pointer moved. ⛔ **Whoever plans this task must know a product decision hangs on the result, and
  must not report a number without saying what it implies for ADR-110.**
  ~~⚠️ **This is recorded as a RANK INPUT, and the rank was NOT changed on it** — the owner ruled
  scheduling only, and re-ranking on this is a producer call nobody has made. **Say so rather than
  quietly treating `Medium` as reflecting it.**~~
  ✅ **UPDATED 2026-09-04 — struck, not deleted. TRUE WHEN WRITTEN, SPENT the same day.** It was
  accurate for exactly as long as the scheduling ruling was the only one. **The rank has since MOVED
  to `High`** on a **second** owner ruling — ⛔ **so "the rank was NOT changed on it" and "a producer
  call nobody has made" are both spent.** ⚠️ **The underlying WARNING still stands and is why this is
  struck rather than deleted: the rank input is a RANK INPUT, and ADR-110's re-raise question is
  still OPEN.** ⛔ **Do not read `High` as having settled ADR-110** — whoever plans this task must
  still report the number **and** say what it implies for ADR-110.
- **`0007-investigate-core-to-client-import-coupling`** — relevant to the emission-seam decision in
  *What to Build* §3. Not a blocker, and this task must not wait on it.
- ⛔ **No secrets in this brief, by construction.** Telemetry work attracts them. Variable names
  (`DEPLOY_ENV`, `maxTimerValue`) and metric/event **names** appear here; **no values, no hosts, no
  endpoints, no connection strings, no keys.** This file goes to git. Keep it that way in the plan,
  the worklog, and any findings.
