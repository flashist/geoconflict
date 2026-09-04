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
>    the replacement, [`0211`](../0211-credit-participation-xp-at-elimination-or-match-end/brief.md),
>    ~~is unscheduled but real~~ — ✅ **CORRECTED 2026-09-04: `0211` is SCHEDULED INTO SPRINT 4**
>    (owner ruling, live in session); **struck, not deleted — spent, not wrong** — and it will restart
>    a clock of its own when it ships. 🔴 **AND THAT CLOCK IS THE REASON THIS TASK IS ORDERED FIRST:**
>    ⛔ **`0211` must not SHIP until THIS task is DEPLOYED AND COLLECTING DATA** (owner ruling,
>    2026-09-04) — ⚠️ **"deployed and collecting", NOT merely merged or built.** ✅ **`0211` may be
>    planned and built in parallel.** ⚠️ **Neither task is `🚧 Blocked`.**
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
> ⚠️ **Consider whether Part A also needs a counter for matches that terminate with NO winner
> declared** — `GameServer.end()` runs on every termination and is a candidate site. 📌 **This is
> flagged as a design input, NOT a ruling and NOT a scope change** — the owner has not ruled on it and
> this brief's scope is unchanged. Raise it at plan time.
>
> 📎 Full record: the `0206` row on [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md) and the STOP
> box at the top of
> [`0206`'s brief](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md).
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
> [`0210`](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md) was ruled the same day —
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
>    line in [`0207`'s own brief](../0207-winmodal-participation-comment-ai-player-correction/brief.md)
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
2. **It scopes [`0211`](../0211-credit-participation-xp-at-elimination-or-match-end/brief.md)** — by
   answering **whether stalled-match survivors are a real population**, which matters now that
   survivors are in `0211`'s scope.
3. **It caps [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md)'s rank**, which has
   always been held down by unmeasured frequency.

⏳ **Plus the closing window:** **Part B's measurement dies when
[`0210`](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md)'s guard ships.**
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
🔲 Backlog

⚠️ **SCHEDULED INTO SPRINT 4 on 2026-09-04 (owner ruling, live in session) — and the status is
DELIBERATELY still `🔲 Backlog`.** **Scheduled is not started: nobody is building this.** The owner
ruled *when this is worked*, not that it has begun. The status changes when a plan is approved and
work actually starts.

**Nothing gates it. Nobody is building it.** It does not depend on `0205`, `0206`, `0207`, `0209` or
`0210`, and 🔴 **it blocks none of them — `0210` explicitly included.** ⚠️ **But it is not
order-neutral** — see *Sequencing*.

~~📌 **Added 2026-09-04: it does not depend on
[`0211`](../0211-credit-participation-xp-at-elimination-or-match-end/brief.md) either, and `0211` does
not gate it** — but they are now **in the same sprint**, and the owner's stated reason includes
**planning them together to avoid two plans reasoning about the same crediting path.** ⚠️ **That is a
coordination preference, NOT a dependency.** ⏳ **One direction of ordering DOES matter now:** if
`0211` ships first, Part A's pre-fix denominator is gone. See *Sequencing*.~~

📌 **UPGRADED 2026-09-04 — struck, not deleted; the earlier framing was CORRECT when written and has
been overtaken by a ruling.** What was recorded above as a *coordination preference* is now an
**actual ordering constraint.**

### 🔴 SEQUENCING CONSTRAINT INSIDE SPRINT 4 — OWNER RULING, 2026-09-04. `0208` SHIPS BEFORE `0211`.

> ⛔ **[`0211`](../0211-credit-participation-xp-at-elimination-or-match-end/brief.md) MUST NOT SHIP
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

⚠️ **This does NOT make either task `🚧 Blocked`.** Both stay `🔲 Backlog`. `0208` is not gated by
anything, and `0211` can be **planned and built** freely — it is only its **ship** that waits.

## Owner
fkit-coder — ⚠️ **with an `fkit-architect` consult expected at plan time.** See *The emission seam* for
why: the instrumentation point is in `src/core/`, and where the event crosses into the client is a
design decision this brief deliberately does not make.

---

## Context

### Why this exists — the gap, stated exactly

Today's evidence for both [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md) and
[`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md) is a **headless simulator
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
> 6. **[`0211`](../0211-credit-participation-xp-at-elimination-or-match-end/brief.md)** — needs to know
>    **whether stalled-match survivors are a real population**, now that survivors are in its scope by
>    the 2026-09-04 owner ruling. ⚠️ **`0211` is scheduled in the same sprint and does NOT gate this
>    task, nor this task it.**

| Consumer | What it is currently asserting without production evidence |
|---|---|
| [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md) — **Priority Low–Medium** | The rank was **held by the owner on 2026-09-03** on the reasoning that **busy lobbies are safe** (60 %+ activity → 0/3 stalls) and the realistic trigger is **private and quiet lobbies**. ⚠️ **That is a claim about the real lobby-activity distribution, and the distribution has never been measured.** Real numbers are what would confirm the rank — or overturn it. |
| [`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md) — ~~scheduled in Sprint 4~~ ~~📌 **✅ Done, closed 2026-09-03.** ⚠️ **Closed ≠ deployed — production state not verified this turn**~~ 🔴 **REVERTED 2026-09-04 — BEHAVIOUR NOT IN THE GAME, NEVER DEPLOYED.** Still `✅ Done` and still in `tasks/done/` (**correctly** — the work was done); the **effect** was reverted. **Struck, not deleted.** ⚠️ **`0206` is no longer a consumer waiting on this number — it is a cautionary example of what not having it costs.** | Its brief carries an explicit **unmeasured-frequency flag**: whether a clientless leader actually reaches the **80 %** FFA threshold in a real public lobby is recorded as **UNMEASURED, no production observation, no player report on file**. 🔴 **Updated 2026-09-04: that flag was never discharged, and the task built on top of it was reverted when its premise was measured and failed.** The successor consumer is [`0211`](../0211-credit-participation-xp-at-elimination-or-match-end/brief.md). |
| [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md) **investigation step 2** | Marked ✅ done by simulation, **with the residual left open in the same breath**: *"that was a simulator with idle humans on one map. Production frequency is still unmeasured."* This task is that residual. |
| 📌 **NEW — [`0210`](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md)** — **ruled, unblocked, unscheduled** | Its own brief records **"How often non-tutorial Singleplayer ends this way → ⚠️ Unmeasured"**, and its rank line says **"Not ranked on incidence."** ⚠️ **It is a consumer, NOT a dependent.** The ruling was explicitly not conditioned on incidence. What a number buys is **retrospective**: how much farming the guard actually removed. |

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
[`0209`](../0209-define-placement-semantics-and-fix-literal-one/brief.md) and is **not this task**.

#### The two award paths — both in scope, and the unguarded one is the farmable one

| Path | Trigger | What is awarded | Why it is in scope |
|---|---|---|---|
| **`reportParticipation()`** | Fires **once per match**, from the game-update handler, the first time `this.myPlayer !== null` and the lobby is not a replay. | `leaderboardPoints.participation` = **1** | 🔴 **This is the farmable path.** It is **unguarded** — no game-type check of any kind. It fires on a match *started*, so it needs **no win, no loss, and no opponent**: start, quit, repeat. **A measurement that only counts `reportPlacements()` misses it entirely.** |
| **`reportPlacements()`** | Fires **once per match**, on the first `Win` update, lobby not a replay. | `awardTable[myIndex]` over `[first, second, third]` = **`[10, 5, 2]`**. In Singleplayer there is exactly **one** `PlayerType.Human`, so `myIndex === 0` unconditionally → **10 points for LOSING to a bot.** | It is the shape `0210` was filed on, and the more offensive number. |

✅ **All of the above is carried from this session's own verification and from the `0206` review — cite
it, do not re-derive it.** The full step-by-step trace lives in
[`0210`'s Context](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md), which is where
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
  and [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md) names *"private lobbies
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
[`0211`](../0211-credit-participation-xp-at-elimination-or-match-end/brief.md) — the replacement for
`0206`, ~~unscheduled~~ — is scheduled and ships. ✅ **CORRECTED 2026-09-04: `0211` IS NOW SCHEDULED
(Sprint 4, owner ruling); struck, not deleted — spent, not wrong. So the first half of that condition
is ALREADY MET — only the SHIP is still outstanding.** 🔴 **Which is exactly why the owner ordered the
ship: ⛔ `0211` must not SHIP until THIS task is DEPLOYED AND COLLECTING DATA** — ⚠️ **not merely
merged or built** — ✅ **though `0211` may be planned and built in parallel, and neither task is
`🚧 Blocked`.** ⚠️ **Still check the production state at plan time
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
  [`0007-investigate-core-to-client-import-coupling`](../0007-investigate-core-to-client-import-coupling/brief.md),
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
- 📌 **`0210`** — [`0210-singleplayer-platform-leaderboard-reporting-policy`](../0210-singleplayer-platform-leaderboard-reporting-policy/brief.md).
  **The reason Part B exists.** ⚠️ **One deliberate edit was made to it by this change** — the
  *"🚩 Open, not ruled — `0208`'s measurement scope"* section in its Notes was **struck, not deleted**,
  and the ruling recorded in its place. **Nothing else in `0210` was touched**, and its status,
  priority and scope are unchanged.
- 📌 **`0209`** — [`0209-define-placement-semantics-and-fix-literal-one`](../0209-define-placement-semantics-and-fix-literal-one/brief.md).
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
