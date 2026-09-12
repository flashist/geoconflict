# A match nobody can win runs to the 3-hour cap — the win check turns away a clientless leader and never declares a winner (FFA **and** Team)

## ID
0242

> ℹ️ **ID allocation, checked 2026-09-11 before filing. `0242` is free.** The four checks:
>
> 1. **Task folders** — `ai-agents/tasks/{backlog,done,cancelled}/`: highest ID in use is **`0241`**.
> 2. **`## ID` fields** — same three boards, `grep -rhA1 '^## ID'`: highest is **`0241`**. Both
>    carriers agree.
> 3. **All boards** — [`backlog.md`](../../../sprints/backlog.md), `sprint-backlog.md`,
>    `plan-sprint-4.md` / `-5` / `-6`, `plan-index.md`: **zero** occurrences of `0242`.
> 4. **Prose sweep** — `grep -rn "0242" ai-agents/ .claude/ src/ resources/`: three hits, **all three
>    are SVG path coordinates** (`resources/flags_source/sh_yugo.svg`,
>    `resources/images/MushroomCloudIconWhite.svg`). **No task, board, skill or ADR refers to `0242`.**
>
> ✅ **RESOLVED BY OWNER RULING, 2026-09-11 (recorded 2026-09-12) — the flag below was raised here and
> is now settled.** The ruling: **drop the reservation as recorded and replace it with the real set.**
> The **actual** upstream-occupied set is, number by number, ⛔ **not as a range**: **`0243`, `0244`,
> `0245`, `0246`, `0247`, `0264`, `0265`** — plus `0204`, which is a **separate case on separate
> evidence** and still stands. **`0241` and `0242` were both allocated to project tasks on 2026-09-11,
> both verified genuinely unused at allocation, and ⛔ neither is being renumbered** (the owner
> declined; `0241` is already a canonical `Depends on` of `0219`). **The finding is that the
> reservation was OVER-BROAD — not that an error was tolerated.** Canonical record, and the *check*
> that establishes freedom rather than a list to trust:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md).
> **The original flag is preserved verbatim below, struck where it is now wrong.**
>
> 🚩 **ONE THING FLAGGED RATHER THAN SILENTLY RESOLVED — read it before allocating the next ID.**
> Earlier rows on [`backlog.md`](../../../sprints/backlog.md) record `0204` and the band
> ~~**`0241`–`0247`, `0264`, `0265`**~~ as **"not free, not considered"** — the band because those numbers
> are the **fkit toolkit's own task numbering inside installed upstream skill files**
> (`.claude/skills/fkit-heal/`), not this project's board.
> **Two facts about that band, both checked this turn:**
> - ⚠️ **`0241` was allocated to a project task anyway on 2026-09-11**
>   ([`0241`](../0241-profile-verify-first-weekly-backup-copy/brief.md)) — **the recorded reservation
>   was crossed.** ~~⛔ **Recorded here as an observation, NOT resolved:** whether the reservation still
>   stands is a convention question and nobody has ruled on it.~~ ✅ **RULED 2026-09-11: the
>   reservation as recorded is dropped and replaced by the explicit set. `0241` stays where it is —
>   the number now names two things (the toolkit's heal-design task in `.claude/` prose, and this
>   project's backup-copy task on the boards); read it in context.**
> - ✅ **`0242` is not in that band in fact, only in its shorthand.** The band is written as a range;
>   the **actual** `.claude/` hits are `0241`, `0243`, `0244`, `0245`, `0246`, `0247`, `0264`, `0265`.
>   **`0242` appears nowhere in `.claude/`** — verified this turn by
>   `grep -rnoE '\b02[3-6][0-9]\b' .claude/`.
>
> ⇒ **`0242` is the next sequential ID and collides with nothing, in this project or upstream.**

## Sprint
Backlog

⚠️ **The field above is the bare token `Backlog` on purpose** — `dashboard.sh`'s drift rule compares it
against the board's identity, and a decorated value is reported as drift. **Do not decorate it.**

🔴 **BACKLOG BOARD BY OWNER RULING, 2026-09-11, given live in the lead session and relayed through the
spawning session — ⛔ NOT Sprint 4.** The owner ruled **that this be filed, and that it be filed on the
Backlog board.** ⛔ **They did NOT rule what it is worth or when it is worked** — see *Priority*, where
the rank is the **producer's**.

## Priority
**Medium** — *(producer's rank, NOT an owner ruling)*

⚠️ **State the authority before the label, because they differ here.** The **owner** ruled that this
brief be filed, on the Backlog board. The **`Medium`** value is **mine**. ⛔ **Do not cite it as an
owner ruling.**

**Why `Medium` and not higher:**

- 🔴 **The sharpest harm is being closed by someone else.** [`0211`](../0211-credit-participation-xp-at-elimination-or-match-end/brief.md)
  credits the participation XP whether or not a winner is ever declared, so **the silent, whole-match
  XP loss stops** when `0211` ships. ⚠️ **The stall does not stop** — see *What `0211` does and does
  not do*, below — but what remains is **player experience and resource cost**, not lost economy.
- **No incident, no player report, no crash.** The 3-hour cap **does** eventually end the match
  (`src/server/GameServer.ts`, the `private maxGameDuration = 3 * 60 * 60 * 1000; // 3 hours`
  declaration and the `now > this.createdAt + this.maxGameDuration` check). This is a bad, slow
  outcome — **not** an unbounded one.
- ⚠️ **Frequency is directional only.** [`0208`](../../done/0208-measure-clientless-leader-at-win-condition-in-production/brief.md)
  measured that *in 52 % of measured Team-mode client-matches that reached the win condition, the
  leader at that moment was the all-bot team.* ⛔ ***"52 % of Team matches stalled" remains an
  UNSUPPORTED CLAIM***, by owner ruling, and **the per-match stall rate will never be known** — `0211`
  destroys the pre-fix denominator. **Do not rank this on a rate nobody has.**
- **It shares an unresolved policy question with [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md)**
  (`Medium`, producer's value, owner-approved 2026-09-11), and cannot sensibly outrank it while that
  question is open for Team mode.

**The argument for ranking it higher, recorded so nobody has to re-derive it:**
a stalled match holds a server worker and an **unbounded `turns` array** for up to 3 hours (the
architect's §11 q4 residual — see *Notes*), and the players in it sit in a match that visibly cannot
resolve. ⚠️ **If either of those is ever observed as a real production cost, this rank should move.**

🔒 **ADR-035 — this row was APPENDED at the bottom of [`backlog.md`](../../../sprints/backlog.md).**
No row moved, nothing was renumbered, no closed row was touched. **Bottom-of-board means "added
last", and nothing more.**

## Status
🔲 Backlog

## Owner
fkit-producer

⚠️ **`fkit-producer`, not `fkit-coder`, and the reason is the shape of the task.** The **first** unit
of work here is a **decision**, not a fix: *what should a match nobody can win actually do?* Nobody has
ruled that, and it is adjacent to (but **not** the same as) `0205`. ⛔ **Do not open this as an
implementation task.** See *What to build*, which is investigation-first for exactly that reason.

## Context

### 🔴 Why this brief exists, and why it did not exist before — the lineage, recorded so it is not re-litigated

This brief was **deliberately not filed** for a week, and that non-filing was an **owner ruling**, not
an oversight.

| Date | What happened |
|---|---|
| 2026-09-04 | The stall is surfaced during the `0206` revert. The owner **considers** *"fix the stall"* as `0211`'s scope and **passes over it**, widening `0211` to cover survivors instead. ⛔ **Considered and not chosen — never forbidden.** |
| 2026-09-10 | Owner rules a **HOLD**: *no separate stall brief*, because *"fix the stall"* is still a **legitimate candidate mechanism** for `0211`'s own survivor-mechanism choice, and filing a brief could **pre-empt** it. 🔴 **A REOPEN CONDITION IS RECORDED: file the stall brief IF `0211`'s plan picks a mechanism OTHER THAN fixing the stall.** |
| **2026-09-11** | 🔴 **THE CONDITION FIRED.** `0211`'s plan picked **Mechanism A** — credit at the instant the simulation determines *no winner can be declared* — which is **other than fixing the stall**. The owner ruled, live in the lead session: **file it now, on the Backlog board.** |

⇒ 🚨 **This brief's absence was a decision and its presence is a decision. Neither was a gap.**
⛔ **Do not record the week it did not exist as an oversight**, and do not re-open the HOLD: the
condition it named has been met.

### The defect

> **A match that nobody can win is never declared over. It runs until the server's 3-hour cap.**

**Verified this turn by reading `src/core/execution/WinCheckExecution.ts` (working tree, branch `dev`,
commit `7ff60ea`)** — ⛔ **not taken from any earlier brief's description, two of which were wrong; see
the correction note below.**

`WinCheckExecution.tick()` re-tests the win condition every 10 ticks. When the condition is met
(`thresholdMet || timerMet`) it reports the check, then applies a **clientless-leader guard** and, if
that guard fires, **returns without declaring a winner and without deactivating the execution**. The
match therefore continues, the condition keeps being met, and the guard keeps turning it away —
forever, or until the cap.

**⚠️ The two guards are NOT the same predicate. Confirmed by symbol this turn:**

| | The guard, as it is in the tree today | Who it turns away |
|---|---|---|
| **`checkWinnerFFA()`** | `if (max.clientID() === null)` → then returns unless *(singleplayer **and** not a tutorial)* | **Any clientless leader — a `Bot` AND a `FakeHuman` (Nation).** Carries an extra `isTutorial` clause. |
| **`checkWinnerTeam()`** | `if (max[0] === ColoredTeams.Bot && gameType !== Singleplayer)` → return | **Only the `ColoredTeams.Bot` team.** **No `isTutorial` clause.** ⇒ a **`Nations` team leader IS declared the winner and does NOT stall.** |

⇒ 🔴 **The Team-mode stall population is NARROWER than the FFA one** — bot-team-led matches only, not
every clientless-led Team match. **Both modes are in this task's scope**; the difference is recorded so
nobody scopes the fix against the wrong population.

📌 **Returning *before* `this.active = false` is DELIBERATE and is [`0022`](../../done/0022-win-check-multiplayer-regression-investigation/brief.md)'s
behaviour: it keeps the check alive so a human can still come back and win the match later.**
⛔ **Any fix must engage with that intent, not delete it by accident.** The comment stating it is in
`WinCheckExecution.ts` directly above the FFA guard.

### 📌 Correction inherited from `0211`'s plan — do not plan from the older description

⚠️ **[`0211`](../0211-credit-participation-xp-at-elimination-or-match-end/brief.md)'s brief describes
the FFA stall as: *"`players()` filters to `isAlive()`, so dead players are absent from the sorted
list, `find` returns `undefined`, and the code takes an early `return`."* 🔴 **That describes
[`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md)'s REVERTED code, not the
game.** **There is no `find` in `checkWinnerFFA()` today** — it sorts `this.mg.players()` and takes
`sorted[0]`; the early return is the explicit `max.clientID() === null` guard. The `players()` →
`isAlive()` filter **is** real (`src/core/game/GameImpl.ts`, the `players(): Player[]` method) but is
**not what produces the stall.** ✅ **Both halves re-verified in the tree this turn.**
⛔ **Anyone planning from that sentence would go looking for code that is not there.**

### 🔴 What [`0211`](../0211-credit-participation-xp-at-elimination-or-match-end/brief.md) DOES and DOES NOT do for this — state it plainly, in both directions

🚨 **This is the single most misreadable thing about this task. Get it exactly right.**

| | |
|---|---|
| ✅ **What `0211` fixes** | **The XP loss.** Under its Mechanism A, the simulation publishes *"the win condition was met and no winner was declarable"* as an observable fact, and the players in the match are **credited their participation XP at that moment.** ⇒ **Players stop losing XP to this.** |
| ⛔ **What `0211` does NOT fix** | **The stall itself.** After `0211` ships, a match nobody can win **still does not end**, **still runs to the 3-hour cap**, **still holds its server resources**, and **still ends only when everyone leaves or the cap fires.** `0211` changes the guard's behaviour **by not one tick** — that is explicit in its plan and is deliberate. |

⇒ **The defect `0211` closes is the XP LOSS. The defect THIS task is about is the STALL.**
⛔ **Do not close this task because `0211` shipped**, and ⛔ **do not describe `0211` as a partial fix
for it** — `0211` is a complete fix for a *different* defect.

### ⚠️ [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md) IS A DIFFERENT QUESTION AND MUST NOT ABSORB THIS ONE

🚨 **Owner instruction, 2026-09-11, stated explicitly when this brief was ruled.**

| | The question it answers | Modes |
|---|---|---|
| **`0205`** | **Resolution policy** — *who **should win** a stalled Team match?* | **Team only** |
| **`0242`** (this) | **The stall itself** — *why does a match nobody can win never end, and what should it do instead?* | **FFA and Team** |

⛔ **Do not merge them. Do not close this as a duplicate of `0205`. Do not fold `0205` into this.**
⚠️ **They genuinely overlap** — a Team answer to *"who wins"* would resolve the Team half of the stall
— and that overlap is exactly why it must be said out loud rather than discovered mid-plan.
✅ **`0205`'s status, scope, owner and rank are UNCHANGED by this brief.** Nothing in `0205` was edited
to file this. A reciprocal pointer was added to `0205`'s Notes and **nothing else in that brief was
touched.**

## What to build

⛔ **NOTHING yet. Phase 1 is a DECISION, and it has not been made by anybody.**

### Phase 1 — the decision (this is the task's first real unit of work)

> **What should a match that nobody can win actually do?**

This is **not** a technical question with an obvious answer, and it is the reason this brief is owned
by the producer rather than the coder. **At minimum these have to be separated and put to the owner:**

1. **Does the match end at all** — or does it stay alive indefinitely, as `0022` deliberately made it,
   so a human can come back and win?
2. **If it ends: WHEN?** At the first clientless-leader detection (⛔ **this reverses `0022`'s
   deliberate comeback behaviour** — say so, do not do it quietly), after a grace period, on the
   timer, or at the cap?
3. **If it ends: WHO, if anyone, WON?** ⚠️ **For Team mode this IS `0205`'s question** — and this task
   must **consume** `0205`'s answer, not pre-empt it. For FFA the equivalent question is open and
   nobody owns it. ⛔ **[`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md)'s
   fallback award (crown the top *client* player) is FORBIDDEN by owner ruling** — *"if a bot has 80 %
   and a player has 20 %, it's the problem of the player."* **Do not re-propose it.**
4. **What does the player see?** `WinModal`'s `winner === undefined` branch is an **empty stub** — it
   emits no event at all. A *"match over, nobody won"* screen is a **UX change with no approved copy
   and no design**, and it is not free.

⛔ **Do not write an implementation brief for this until phase 1 has an owner ruling.** The
predecessor this whole line of work descends from (`0206`) was built on a premise a measurement later
disproved; **that is the specific mistake this phase exists to avoid repeating.**

### Phase 2 — the fix (shape unknown until phase 1 lands)

Deliberately unspecified. ⚠️ **Whatever it is, it lands in `src/core/execution/WinCheckExecution.ts`
and this project's rule applies in full: *all code changes in `src/core/` MUST be tested.***

### Constraints that hold regardless of the approach

- ⛔ **Do NOT reintroduce `0206`'s fallback award.** Owner-ruled. A player losing to a bot is a
  **legitimate outcome**, not a defect.
- ⛔ **`0022`'s comeback intent is not deleted by accident.** If the chosen answer removes it, that is
  a **reversal to be stated and ruled**, not a side-effect.
- ⛔ **The `WinConditionCheck` update's payload must stay client-free.** It is derived purely from game
  state and config, which is the only reason every client composes the same event; the file's own
  comment says this is secured *by design, not by test*. ⚠️ **`0211` adds a `winnerDeclarable` boolean
  to it — build on that field, do not re-derive the predicate a second time.**
- ⛔ **The server stays a turn relay.** Nothing here may make it a simulator.
- ⛔ **This task must not change what anybody is PAID.** Crediting is `0211`'s, and it ships first.

## Verification steps

⚠️ **These verify the DEFECT, not a chosen fix — the fix's own steps are written when phase 1 lands.**

1. **Phase 1 has a recorded owner ruling** answering questions 1–4 above, and the ruling is written
   into this brief before any code is planned. ⛔ **A plan that picks an answer itself has failed this
   step.**
2. **A reproduction exists**, at unit level, of an FFA match where the leader is a `Bot` **and** one
   where the leader is a `FakeHuman` (Nation): the win condition is met, `setWinner` is **never**
   called, and `isActive()` stays `true` across repeated ticks.
3. **The same reproduction for Team mode, with the narrower population asserted:** a
   `ColoredTeams.Bot` team leader stalls; a **`ColoredTeams.Nations`** team leader **does NOT** — it is
   declared the winner. ⚠️ **Step 3 failing in the "Nations stalls too" direction means the guard
   changed under us; re-read it before changing anything else.**
4. **The chosen resolution is implemented and tested** (`src/core/` rule, no exemption).
5. 🔴 **`0211`'s crediting is not regressed.** A match that resolves under the new rule still credits
   each qualifying player **exactly once**, at **1 XP**, and **not twice** across the old and new
   paths. ⛔ **Assert the game id is the same on both paths** — the double-credit guard is a database
   primary key on `(game_id, yandex_player_id)`, and two paths disagreeing about the game id would
   defeat it.
6. **Singleplayer still credits zero XP** — an unenforced-but-ruled property `0211` adds its first test
   for. ⛔ **Do not break it here either.**
7. **`npm test` green, `npm run lint` clean.** ⚠️ `npm test` runs the shell harnesses unconditionally
   (~22–25 s); on a `supertest` failure check CLAUDE.md's known-flake signature, **rule out `0197`'s
   `SIGSEGV` first**, re-run, and **say that you re-ran**.

## Notes

- **Depends on:** 0211
- **Blocks:** nothing

  ⚠️ **`Depends on: 0211` is a SEQUENCING dependency, not a blocking one in the usual sense.** This
  task is not waiting for information `0211` produces — it is waiting because **`0211` adds the
  `winnerDeclarable` field this task should build on**, and because **`0211` ships the crediting fix
  first**, which is what makes this task's rank `Medium` rather than higher. ⛔ **Do not read it as
  "nothing can start until `0211` lands"** — phase 1 is a product decision and can be taken at any
  time.

- 🔴 **LINEAGE — the reopen condition, recorded in full so it is never re-litigated:** the stall brief
  was **deliberately not filed** under an owner ruling of **2026-09-10** (*"fix the stall" is still a
  candidate mechanism for `0211`; filing could pre-empt it*), which carried the recorded condition
  **"file the stall brief IF `0211`'s plan picks a mechanism OTHER THAN fixing the stall."**
  **The condition FIRED on 2026-09-11** when `0211`'s plan picked **Mechanism A** (credit at *"no
  winner can be declared"*), and the owner ruled the brief be filed. ✅ **Recorded in
  [`0211`](../0211-credit-participation-xp-at-elimination-or-match-end/brief.md) as well, on both
  sides.**

- 🚩 **A RELATED RESIDUAL THAT IS DELIBERATELY *NOT* FOLDED INTO THIS TASK, AND IS *NOT* FILED
  ANYWHERE — flagged for the owner, not decided by the producer.**
  The architect's design assessment (§11 q4, second half) records **memory growth**: a stalled match
  holds an **unbounded `turns` array for up to 3 hours.** The architect's read: *"should not be left
  indefinitely, independent of the winner question."*
  ⚠️ **It is genuinely separable** — the array could be bounded without answering a single question in
  this brief, and shipped and tested on its own. ⛔ **It is also genuinely a consequence of this
  defect** — fix the stall and most 3-hour matches stop existing.
  🔴 **The producer did NOT fold it in and did NOT file it as its own task.** Both are live options and
  **the owner has ruled on neither.** ⛔ **Do not record its absence as an oversight; it is named here
  precisely so it cannot be lost.** **Open question, below.**

- **Related, none blocking:**
  - [`0211`](../0211-credit-participation-xp-at-elimination-or-match-end/brief.md) — credits the XP
    this stall used to lose. **Read the *What `0211` does and does not do* table above before assuming
    either task covers the other.**
  - [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md) — the Team-mode
    **resolution-policy** question. ⛔ **Different question; must not absorb this one.**
  - [`0022`](../../done/0022-win-check-multiplayer-regression-investigation/brief.md) — the task whose
    deliberate *"return before deactivating, so a human can still win"* behaviour is the guard's
    intent. **Any fix engages with it explicitly.**
  - [`0206`](../../done/0206-ffa-timer-expiry-award-to-top-client-player/brief.md) — the **reverted**
    predecessor. **Read its STOP box, not its design.** Its fallback award is **forbidden**.
  - [`0208`](../../done/0208-measure-clientless-leader-at-win-condition-in-production/brief.md) — the
    measurement. ⚠️ **Its number is directional only, and the per-match stall rate can never be
    measured now.**

- **Row appended, not inserted** on [`backlog.md`](../../../sprints/backlog.md) (ADR-035).
- ⛔ **No secrets in this brief** — none belong in a plan or worklog for this task either.

### 🚩 Open questions — for the owner, none answered here

1. 🚩 **The memory residual (unbounded `turns` for up to 3 h): fold it into this task, file it as its
   own task, or leave it recorded and unfiled?** ⛔ **The producer did not decide this.** My
   recommendation: **leave it here, unfiled, until phase 1 lands** — if the chosen answer ends stalled
   matches promptly, the residual mostly evaporates and a separate task would be wasted work; if phase
   1 decides matches **stay** alive indefinitely, it becomes a real, independent bug and should be
   filed then.
2. 🚩 **Phase 1 itself — all four questions in *What to build*.** ⛔ **Not answerable by an agent.**
   Question 3 (*who, if anyone, won*) is where this task must consume
   [`0205`](../0205-teams-bot-team-win-stall-resolution-policy/brief.md)'s answer for Team mode and
   where **FFA has no owner at all.**
3. ~~🚩 **The `0241`–`0247` ID reservation** (see *ID*). `0241` was allocated to a project task on
   2026-09-11 despite being recorded as reserved. **Does the reservation still stand?** ⛔ **Recorded,
   not resolved** — it changes nothing about this brief (`0242` is genuinely free) but the next
   allocator will hit it again.~~

   ✅ **CLOSED BY OWNER RULING 2026-09-11, recorded 2026-09-12.** The range is dropped and replaced
   by the explicit set (**`0243`, `0244`, `0245`, `0246`, `0247`, `0264`, `0265`**, plus `0204`
   separately). `0241` and `0242` stand as allocated — ⛔ no renumbering. The next allocator runs the
   **check**, not the list: [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md).
   **This was raised by this brief and is no longer an open question.**
