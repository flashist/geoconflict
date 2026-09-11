# Credit Participation XP at Elimination or Match End (task 0211)

**Source**: `ai-agents/tasks/backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md`
**Status**: in-progress — 🔴 **`🔄 In progress` on `plan-sprint-4.md` and in the brief, on an OWNER RULING of 2026-09-11: BUILD `0211`.** ⚠️ **READ THE TOKEN-CHOICE BOX BELOW BEFORE TRUSTING THIS VALUE — as of 2026-09-11 NO session owns it, NO plan is approved, and NOT ONE LINE OF CODE IS WRITTEN.** ~~backlog~~ 📌 **struck, not deleted; true until the ruling.**
**Sprint/Tag**: Sprint 4 — scheduled 2026-09-04 by owner ruling; rank `Medium–High` (**the producer's**, held three times that day). ⛔ **The 2026-09-11 ruling did NOT re-rank it** — `Medium–High` still stands, and it is still **the producer's rank, not the owner's**

> # 🔴 2026-09-11 — OWNER RULING: **BUILD `0211`.** Given live in the lead session.
>
> The owner ruled: **schedule `0211` to build.** Its `0208` ship gate had been cleared earlier the same
> day, and it had been sitting `🔲 Backlog` with **nobody on it**.
>
> ## ⚠️ THE STATUS TOKEN IS A COMPROMISE — RECORD IT HONESTLY, DO NOT SMOOTH IT OVER
>
> 🔴 **THE VOCABULARY HAS NO TOKEN FOR *"scheduled to build, not yet started"*.** The canonical set
> (`ai-agents/knowledge-base/conventions/task-status-vocabulary.md`) offers only `🔲 Backlog` =
> *"scoped and filed, **not picked up**"* and `🔄 In progress` = *"a session owns it and **work has
> started**"*. **Today neither is true.** ⛔ **A real gap in the vocabulary, reported rather than
> papered over** — and the producer **did NOT** amend the vocabulary to add a seventh value, because
> that is a project-wide convention change and the **owner's call**. It is raised as an open question.
>
> **`🔄 In progress` was chosen as the LEAST MISLEADING of the two.** `🔲 Backlog` was rejected because
> its own discriminator is *"not picked up"*, which the ruling makes **false by ruling**; the chosen
> token is wrong only *"by a matter of hours-to-days, and self-correcting"*, and it correctly warns
> everyone else off picking this up.
>
> 🚨 **EXACTLY WHAT THE TOKEN ASSERTS AND WHAT IT DOES NOT, as of 2026-09-11:**
> - ✅ **Asserts:** the owner has ruled that this work starts. It is the live, committed next build.
> - ⛔ **Does NOT assert:** that a session owns it · that a plan exists or is approved · that any code
>   is written · that any verification has been run. **All four are NO.**
>
> ⚠️ **A named owner session must still set this honestly when work actually begins** — and if the
> build does not in fact start, **revert it to `🔲 Backlog`**, or the board lies with confidence.
>
> ## 🚨 THE IRREVERSIBLE COST THE OWNER KNOWINGLY ACCEPTED
>
> 🔴 **SHIPPING THIS TASK PERMANENTLY DESTROYS `0208`'s PART A PRE-FIX DENOMINATOR.** You cannot
> measure how often matches stalled uncredited once they stop stalling uncredited — and **this task is
> precisely what stops them.** **No later opportunity, no proxy.** That destruction is the **entire
> reason** the `0208`-before-`0211` sequencing existed.
>
> ✅ **The sequencing has been served:** `0208` was measured (4–10 Sep 2026) and **closed 2026-09-11**
> — ⛔ `(agent-closed — not owner-verified)`, **not a clean close**, `V16`/`V17` untested.
> 🔴 **THE OWNER IS PROCEEDING WITH THIS UNDERSTOOD — it is an accepted cost, NOT an oversight.**
> ⛔ **DO NOT LATER RE-RAISE THE LOST DENOMINATOR AS A GAP SOMEBODY SHOULD HAVE CLOSED**, and do not
> re-propose a server-side *"ended with no winner"* counter.
>
> **The number that survives is directional only. The defensible sentence, VERBATIM:**
>
> > *"in 52 % of measured Team-mode client-matches that reached the win condition, the leader at that
> > moment was the all-bot team, and no winner could be declared at that moment."*
>
> ⛔ ***"52 % of Team matches stalled" remains an UNSUPPORTED CLAIM*** — client-match unit, a **lower
> bound**, latched at the **first crossing** — and 🔴 **the per-match stall rate will NEVER be known**
> (owner ruling, option B, 2026-09-11).
>
> ## 📦 WHAT THIS TASK CARRIES INTO THE BUILD — ⛔ SETTLED RULINGS, NONE RE-OPENABLE
>
> | # | Settled | ⛔ Not open |
> |---|---|---|
> | 1 | **`1 XP` per qualifying match** — down from 10. Owner-ruled 2026-09-10, **reversing their own earlier hold-at-10 ruling**. Reasoning to carry: **players accept an award going UP, not DOWN — start low so every later move is upward.** 📌 **Now recorded as [[decisions/adr-111-xp-economy-rescale]] (accepted 2026-09-11)**, where `1` is a **deliberate FLOOR, not an arbitrary constant** — ⛔ do not round it up, and do not propose moving it **down** without reopening that ADR | The amount |
> | 2 | **Citizenship threshold divided by EXACTLY 10**, so time-to-citizenship is **UNCHANGED**. ⛔ *"About 10×"* is **not** the ruling. ⚠️ **The current threshold value must still be LOCATED IN CONFIG at plan time** — the brief records scope only | The divisor |
> | 3 | 🔴 **Player-facing copy rescaled in BOTH `resources/lang/en.json` AND `resources/lang/ru.json`**, in the **same change** — this is **verification step `4d`**, not optional polish. ⛔ **No line-number list is given on purpose** — find the strings by content/key and **sweep** both files | That it ships with the code |
> | 4 | **SURVIVORS ARE IN SCOPE.** 🚩 **The MECHANISM IS STILL OPEN and is the PLAN'S to choose.** ⛔ `GameServer.end()` is verified **not** to be that trigger — it would credit **zero** in every normally-ending match | That survivors are covered |
> | 5 | **TEAM MODE IS COVERED**, not just FFA | The mode coverage |
> | 6 | **SINGLEPLAYER IS OUT OF SCOPE** | The exclusion |
> | 7 | **The leaver rule is DELIBERATELY REVERSED for ELIMINATED players** — intentional, not an inconsistency to "fix" | The reversal |
> | 8 | 🔴 **NO XP MIGRATION. The free citizenship grants are ACCEPTED.** Owner-ruled **2026-09-11**, live in session. Any existing row at **≥ 100 XP becomes a citizen the moment this ships**, on a threshold they never met. ⛔ **NO MIGRATION IS TO BE WRITTEN** — full record directly below | That no migration is written, and that the grants are accepted |
>
> ### 🔴 RULING 8, IN FULL — NO XP MIGRATION; THE FREE CITIZENSHIP GRANTS ARE ACCEPTED
>
> **Owner ruling, given live in the lead session on 2026-09-11.** ⛔ **This is a RULING — not a note,
> not a risk, not an open question.**
>
> **The question**, raised by the architect while writing [[decisions/adr-111-xp-economy-rescale]] and
> **not previously recorded anywhere:** when this task ships the rescale (award `10` → `1`, threshold
> `1,000` → `100`), any existing player row already at **≥ 100 XP instantly becomes a citizen** — a
> grant roughly **10× easier than intended**. A player sitting at 500 XP is half-way today and a citizen
> the moment it lands.
>
> **Three options were put to the owner:** a **divide-by-10 migration** preserving every player's
> progress exactly; **accepting the free grants**; or **sequencing `0211` to ship before `0217`** wires
> anything, so no rows exist to grant. **The owner chose: ACCEPT THE FREE GRANTS.**
>
> 🚨 **THE CONSEQUENCE, STATED PLAINLY AND NOT SOFTENED:** players at **≥ 100 XP when this task lands
> become citizens immediately, on a threshold they did not actually meet under the rules in force when
> they earned it.** ⛔ **The owner ruled this acceptable KNOWINGLY.** An accepted cost — **not a defect,
> and not a gap to be closed.**
>
> ⛔ **NO MIGRATION IS TO BE WRITTEN.** A future implementer who notices the discrepancy must **NOT**
> "fix" it by adding one — **that would reverse an owner ruling.** If they believe circumstances have
> changed, they **ESCALATE TO THE OWNER; they do not migrate.**
>
> **Evidence available today — A DATED OBSERVATION, NOT A STANDING FACT.** On **2026-09-11** the lead
> read **every profile table on the production box** during task `0218` and found **all zero rows**,
> observed **twice** (Phase A2, and again at Phase E1). ⚠️ **A reading taken on ONE DAY, not a guarantee
> about ship day.** Task `0217` wires the game server and **will start creating rows**, and the owner's
> own ordering runs `0217` **before** this task is likely to ship. **So the population at ship time is
> UNKNOWN, and this ruling accepts whatever it turns out to be.**
>
> **Provenance:** question raised by the **architect** while writing **ADR-111**; **ruled by the owner
> the same day (2026-09-11)**. ADR-111 carries the same ruling as a dated clarification in its
> *Consequences*; **ADR-111 remains `accepted` and its body is unchanged.**
>
> ### 🚩 THE ADR-101 SUPERSEDE GATE — PRE-COMMITTED, AND STILL OPEN
>
> This task **moves the crediting TRIGGER** (credit at elimination, plus a survivor trigger the plan has
> still to choose), which changes **when and how often** the fail-soft path is called — one batch at
> match end today versus calls spread through a match. That bears on **three** things in
> [[decisions/adr-101-fail-soft-xp-crediting]]: its *"blast radius is one match, not a backlog"*
> consequence, the **sizing of the 3-attempt retry budget**, and the **per-item pre-validation
> rationale** (which assumes a multi-item batch).
>
> ⛔ **Whether that warrants a SUPERSEDING ADR is NOT SETTLED** — and ⛔ **neither ADR-111 nor ADR-101's
> 2026-09-11 amendment may be cited as having answered it**; both turn on the **figures**, this turns on
> the **trigger**. **It cannot be judged until this task's plan picks the survivor mechanism**, and this
> task carries a **pre-committed gate** to decide it at exactly that moment.
>
> ## ⚠️ FLAG FOR WHOEVER PLANS THIS — A HARD PROJECT RULE APPLIES IN FULL
>
> 🔴 **`0211` lands in `src/core/`, and the project rule is *"All code changes in `src/core/` MUST be
> tested."*** **No exemption, no partial** — plan the tests as part of the work, not after it.
> ⚠️ Two cost facts up front: `npm test` **runs the shell harnesses unconditionally** (~22–25 s, no
> skip valve by owner ruling), and the `supertest` suites carry a **known ~4–7 % flake** — re-run, and
> **say that you re-ran**, rather than reading it as a regression.
>
> ⛔ **WHAT THIS RULING DID NOT DO:** it did **not** re-rank the task, did **not** change its scope, and
> did **not** move it off Sprint 4.

> ### ✅ THE SHIP GATE IS CLEARED — 2026-09-11, owner ruling. ⚠️ CLEARED IS NOT SCHEDULED.
>
> **`0208` was deployed, collected data, was READ, and was CLOSED on 2026-09-11.** The owner ruled
> **option B** the same day: take the 52 % as **directional evidence** that the Team-mode stall is real
> and common — enough to justify this task — **build no further measurement.** ✅ **`0211` can ship.**
>
> ~~⛔ **NOTHING ELSE ABOUT THIS TASK MOVED.** Status stays **`🔲 Backlog`**; **nobody is building it**;
> rank unchanged. **A cleared gate is not a schedule and not a start.**~~
> 📌 **SUPERSEDED LATER THE SAME DAY — struck, not deleted; TRUE WHEN WRITTEN.** 🔴 **The owner then
> ruled BUILD IT (2026-09-11), and the status is now `🔄 In progress`** — see the ruling box at the top
> of this page, including the honest limits of that token. ✅ **The rank half is STILL TRUE:
> `Medium–High` is unchanged, and it is the producer's.**
>
> 🔴 **THE COST THE OWNER KNOWINGLY ACCEPTED, and it lands ON THIS TASK'S SHIP:** *"You never get a
> precise pre-fix stall rate."* **The per-match stall rate will NEVER be known, and the pre-fix
> denominator DISAPPEARS PERMANENTLY the moment this task ships.** **A deliberate, accepted,
> irreversible loss — not an oversight.** ⛔ **Do not re-propose a server-side "ended with no winner"
> counter as a gap someone should close.**
>
> ⚠️ **The caveat still travels with the number that justified the ship:** *"52 % of Team matches
> stalled"* **remains an UNSUPPORTED claim** — accepted-as-directional is **not**
> accepted-as-a-match-rate. **The defensible sentence, verbatim:** *"in 52 % of measured Team-mode
> client-matches that reached the win condition, the leader at that moment was the all-bot team, and no
> winner could be declared at that moment."*
>
> ⛔ **`0208` closed `(agent-closed — not owner-verified)` and is NOT fully verified** — its `V16` and
> `V17` close untested. ⛔ **Do not cite it as a clean result.**

> ### ~~🔴 SEQUENCING: THIS MUST NOT **SHIP** BEFORE `0208` IS DEPLOYED AND COLLECTING DATA~~ → ✅ SATISFIED 2026-09-11
>
> 📌 **KEPT, NOT DELETED — the ruling was satisfied, not withdrawn, and its reasoning is why the figures
> above exist at all.**
>
> **Owner ruling, 2026-09-04.** [[tasks/measure-clientless-leader-and-solo-awards]] (`0208`) must be
> **deployed AND collecting data** first. ✅ **It was — and it has since been read and closed.**
>
> | | |
> |---|---|
> | ✅ **Satisfies the constraint** | `0208` **deployed AND collecting data** |
> | ⛔ **Does NOT satisfy it** | `0208` merely **merged**, or merely **built** — a merged metric measures nothing |
> | ✅ **Explicitly ALLOWED** | **Planning and building THIS task in parallel is FINE** |
> | ⛔ **What is ordered** | **The SHIP. Only the ship.** |
>
> ⛔ **A blanket "don't start `0211`" would be STRICTER THAN THE OWNER RULED.** ⚠️ **This does NOT make
> either task `🚧 Blocked`** — neither is, and the status must not be flipped on account of it.
>
> **Why:** shipping this first **PERMANENTLY DESTROYS `0208`'s Part A pre-fix denominator.** ⚠️ You
> cannot measure how often matches stalled uncredited once they stop stalling uncredited — and this
> task is precisely what stops them. **No later opportunity, no proxy.** Owner's reasoning: **measure
> before you fix.**
>
> ⚠️ **`0208` was raised to `High` while this holds at `Medium–High`. That gap is SEQUENCE, not
> importance** — `0208`'s answer is destroyed by delay and this task's is not.

## Goal

> 🔴 **CLOSE THE XP LOSS.** A player who takes part in a match receives their participation XP —
> **whether they are ELIMINATED or they SURVIVE**, **in FFA and in TEAM mode**, **including when the
> match never reaches a normal end** — and **never twice.**

**Origin:** the revert of [[tasks/ffa-clientless-leader-fallback-award]] (`0206`), 2026-09-04.
⛔ **This is NOT a revival of `0206`'s award.** `0206` was about *who is crowned*; this task is about
*who gets XP*. It deliberately makes crediting **independent of any winner being declared**, which is
how it solves the problem without settling the winner question at all.

### 🔴 The defect — MEASURED on 2026-09-04, not reasoned

Observed in a single-human private FFA, the human eliminated by a Nation, watched to termination:

1. **Elimination shows the player only a defeat modal** («Вы погибли») with exit/spectate. **No
   match-end screen, no winner, no stats.**
2. 🔴 **The server logged NOTHING at elimination.** Elimination is computed **client-side**; the
   server is a **turn relay** and never learns a player died. **This is the central design problem.**
3. **At match end:** `private game complete` → `ending game with 11203 turns` → `archiving game`.
   **No `handleWinner`, no winner vote, no `creditMatchXp`.** `archiveGame` ran with **no `winner`
   attribute and no player stats.**
4. **Participation XP is genuinely LOST, not delayed.** `creditMatchXp`'s **only** call site is inside
   `handleWinner` (`src/server/GameServer.ts:1199`). No `handleWinner` ⇒ no crediting, ever.
5. **The stall is real and independent of `0206`.** A **Nation reached 100.0 % of the map and the
   match still did not end** — `players()` filters to `isAlive()` (`src/core/game/GameImpl.ts:421-423`),
   so `find` returns `undefined` and the code returns early. **Predates `0206` (`0022`); survives the
   revert.**

### 🔴 Team mode has the same defect — and nobody had connected it

**`checkWinnerTeam()` carries the SAME guard shape as `checkWinnerFFA()`**, so a bot-team-led
multiplayer match stalls and loses its XP identically. Found **independently by the coder performing
the `0206` revert**; it had gone unnoticed across `0022`, `0206` and `0205`.
⚠️ **Reported, NOT re-verified by symbol** — confirm at plan time. 📌 `0206`'s close recorded
`checkWinnerTeam()` as *byte-identical and therefore untouched* — **true, and the right call for that
task's scope** — which is exactly how "untouched" got read as "not affected".

### The two halves of the loss — both in scope

| Who | Trigger today? |
|---|---|
| Players who are **ELIMINATED** | ⛔ No. The server never learns they died. |
| Players who **SURVIVE** a match that never ends | ⛔ No. No winner ⇒ no `handleWinner` ⇒ no `creditMatchXp`. |

## Key Changes

**None yet — nothing is built.** The design is deliberately open; the architect's report is its input.

### 📎 The design input — read it there, not here

`ai-agents/knowledge-base/reports/2026-09-04-elimination-time-xp-crediting-design-assessment.md`
(`fkit-architect`, 2026-09-04). **Headline: feasible, and cheaper than it looks.**
⛔ **That is a pointer, not a summary** — the options, recommendation, cost and risks are the
architect's. Three facts worth carrying because they *remove work* or *bound the design*:

- ✅ **Idempotency ALREADY EXISTS and is VERIFIED at the database layer.**
  `player_match_xp_credits` has **`primary key (game_id, yandex_player_id)`**, the insert is
  `ON CONFLICT … DO NOTHING`, and — the part that matters — **the XP increment is gated on the insert
  having happened**, in one statement. **Proven by integration test against real Postgres, including
  the concurrent case.** ⇒ **No new bookkeeping is needed for correctness.**
  ⚠️ **One condition:** both crediting paths must use the **same `gameId`**. A derived key like
  `${gameId}:elim` would defeat the primary key entirely — **the single easiest way to get this
  wrong.** Assert it in a test.
- 🔴 **The server does not learn a player was eliminated. That is the central design problem**, not a
  detail to route around — the server is a turn relay and never a simulator.
- 🔴 **`GameServer.end()` is the WRONG seam.** Hooking crediting there **would credit ZERO in every
  match that ends the normal way** — `phase()` requires `noActive`, and `selectMatchCredits` excludes
  anyone absent from `activeClients`. *"It would look implemented and do nothing."* **Structural, not
  a preference.** ⛔ Do not plan around `end()`.

## Outcome

🔴 **RULED TO BUILD 2026-09-11 — but NOT started:** ~~**Not started.**~~ no session owns it, no plan is
approved, no code is written. What is settled:

| Ruling | |
|---|---|
| **Survivors are IN SCOPE** | *"half a fix leaves you rediscovering this in three months."* ⛔ The ruling states a **REQUIREMENT, not a mechanism** — 🚩 **the trigger is STILL OPEN and is the plan's to choose** |
| **Team mode is IN SCOPE** | The fix lives in the **crediting path, not the win check**, so covering both is likely near-free — and it stops `0205` being solved twice or forgotten |
| **Singleplayer is OUT of scope** | FFA and Team only |
| ~~**XP amount HOLDS at 10 flat**~~ 🔴 **SUPERSEDED 2026-09-10 — THE AMOUNT IS `1 XP`** | ~~*"Do not change two things at once"* — a **deliberate hold**, decision deferred, not made~~ **Struck, not deleted; true when given.** 🔴 **The owner reversed their own ruling on 2026-09-10: `1 XP`, not 10**, so every future change can move **upward** — players accept an award going up, not down. ⛔ **Do not "round it back up" for tidiness** |
| 🔴 **Citizenship threshold ÷ EXACTLY 10** | Owner-ruled with the amount, **firm**: time-to-citizenship must be **UNCHANGED**. ⛔ *"About 10×"* is not the ruling. ⚠️ **The current value must be located in config at plan time**; the brief records scope only |
| 🔴 **Player-facing copy rescaled with the code** | Owner-ruled **2026-09-11**: every user-visible string stating the threshold or the award, in **BOTH `en.json` and `ru.json`**, in the **same change** — **verification step `4d`**. ⛔ Find them by content/key and **sweep**; no line-number list is given, on purpose |
| **The leaver rule is REVERSED for eliminated players** | Owner-ruled intended — *they played the match, they earned the XP*. ⛔ Not an inconsistency to "fix" back. ⚠️ It **narrows** the leaver exclusion, it does not delete it |
| **Scheduled into Sprint 4** | The owner **declined** the producer's "leave it unscheduled" recommendation |
| **`0208` ships first** | See the sequencing box above. ✅ **SATISFIED 2026-09-11 — `0208` is deployed, read and closed, and the owner cleared this gate** |
| 🔴 **BUILD IT** | **Owner ruling, 2026-09-11** — status now `🔄 In progress`. ⚠️ **Nobody owns it yet; see the token-choice box at the top** |

⚠️ **`0211` lands in `src/core/`** ⇒ the project's *"all code changes in `src/core/` MUST be tested"*
rule applies **in full — no exemption, no partial.**

### ⚠️ Three traps this task's readers keep falling into

1. 🔴 **`0210`'s ruling was about platform LEADERBOARD POINTS, not profile XP. The two must NOT be read
   across.** That confusion is precisely why the Singleplayer ruling was needed.
   ⛔ **"Singleplayer is out of `0211`" is NOT a ruling that "Singleplayer awards no XP"** — the owner
   was offered that stronger option and **declined it.** ⇒ **Settled: this task does not cover it.
   🚩 Still open: whether Singleplayer should credit participation XP at all.**
2. 🔴 **The leaver rule is DELIBERATELY REVERSED for eliminated players. ⛔ Do not "fix" it back.**
   Today `qualifiesForMatchXp` (`src/core/profile/MatchQualification.ts:43-45`) returns
   `p.hasSpawned && (p.isAliveAtEnd || p.killedAt !== undefined)`, so a player who **spawned then
   vanished without dying** is **deliberately excluded**. Under this task, **a player eliminated who
   then closes the tab is PAID AT THE MOMENT OF DEATH** — where today they get nothing. ✅ **The
   architect raised it; the owner ruled it intended** (*they played the match, they earned the XP*),
   and the architect's read was that **this is the most valuable part of the change.**
   ⚠️ **It NARROWS the exclusion; it does not delete it** — a player who vanishes **without ever being
   eliminated** is a different case, and **this ruling says nothing about them.**
3. ⚠️ **"Fix the stall itself" was CONSIDERED and passed over as the SCOPE decision — but it is NOT
   FORBIDDEN as the mechanism.** If the plan concludes the cleanest way to give survivors a trigger is
   to make the match actually end, **that is available and satisfies the ruling.**
   ⇒ **Settled: the REQUIREMENT. Open: the MECHANISM.** Do not collapse the two in either direction.

### 🚩 Open questions

**Two lists, both needing the owner** — this brief's own, and the architect's report §11. They are
deliberately **not** merged.

- 🚩 Whether **Singleplayer** should credit participation XP at all (see trap 1).
- 🚩 Whether **the stall gets a task of its own.** ⛔ **No separate stall brief has been filed,
  deliberately** — filing one could be read as pre-empting the survivor mechanism choice.
- 🚩 **The XP tuning itself, after data.** No task exists for it and none was filed.
- 🚩 From the report: does the stall still need fixing once XP is decoupled? Its remaining costs are
  **memory** (an untrimmed `turns` array for up to 3 h — the observed match logged **11 203 turns in
  ~12 minutes**, extrapolating to on the order of **160 000 turns retained**) and the survivor
  experience — **not XP**.

⚠️ **Trust is a FIRST-CLASS concern, not a hardening pass.** An elimination reported by a client is a
**claim, not a fact**, and crediting on it is a farming surface. The abuse ceiling is bounded by the
same primary key — **one credit per (game, account)**, ~~10 XP~~ 🔴 **`1 XP` since the 2026-09-10
ruling, which lowers the ceiling further** — and the existing precedent for the seam
is `GameServer.getCreditableYandexId()` ([[decisions/adr-103-identity-trust-seam]]).
⚠️ **The architect's decisive point: the identity being credited is itself client-asserted, so
hardening the elimination claim first would be hardening the stronger link.**

## Related

- [[tasks/ffa-clientless-leader-fallback-award]] — task `0206`, the **reverted** predecessor. ⛔ **Read its STOP box, not its design**
- [[tasks/measure-clientless-leader-and-solo-awards]] — task `0208`, ~~which **must be deployed and collecting data before this ships**~~ ✅ **closed 2026-09-11; its ship gate on this task is CLEARED.** ⚠️ **`0208` is NOT fully verified** (`V16`/`V17` untested), and 🔴 **shipping THIS task destroys `0208`'s pre-fix denominator permanently — knowingly accepted**
- [[tasks/teams-bot-team-win-stall]] — task `0205`, the Team-mode **resolution policy** (*who should win?*); ⛔ **not merged with this task** (*do those players get their XP?*). ⚠️ **This task may make PART of `0205`'s justification moot — it does NOT settle `0205`'s own question.** 🔴 **`0205` WAS RE-RANKED ON AN OWNER RULING 2026-09-11** (its old *"nobody re-ranked it"* note is struck): ~~🟡 **the producer proposes `Medium`, awaiting sign-off; ⛔ the rank in force is still `Low–Medium`.**~~ ✅ **SIGNED OFF THE SAME DAY — struck, not deleted: the rank in force is `Medium`.** ⛔ **Three authorship layers, never flattened:** the owner ruled **THAT** it be re-ranked · the producer proposed the **VALUE `Medium`** · the owner **SIGNED `Medium` OFF**. ⛔ **Its status, scope and folder ARE unchanged** — `🔲 Backlog`, unscheduled
- [[tasks/win-check-clientless-leader-guard]] — task `0022`, whose guard is where the stall originates
- [[tasks/singleplayer-leaderboard-reporting-policy]] — task `0210`, whose **leaderboard-points** ruling must **not** be read across onto profile XP
- [[decisions/clientless-leader-win-policy]] — the XP-loss defect this task exists to close
- [[decisions/adr-110-ai-winner-allowed]] — cited, not implemented: this task **expires its T1 argument** by decoupling crediting from the winner, ⛔ **without** firing its re-raise trigger
- [[decisions/adr-101-fail-soft-xp-crediting]] — the fail-soft crediting path this task extends to a second trigger. ⚠️ **Its 2026-09-11 amendment records that the `1 XP` rescale moves NONE of its re-raise triggers, and explicitly LEAVES OPEN the supersede gate above** — that gate is this task's to close
- [[decisions/adr-111-xp-economy-rescale]] — ADR-111, which this task implements: award `10` → `1`, threshold ÷ **exactly** 10, both shipping here, plus the copy rescale (verification step `4d`) and **ruling 8** (no migration; free grants accepted). ⚠️ **The architect's standing point is recorded there and NOT dismissed: this task moves the trigger earlier, so dying 30 s in pays the same as playing to the end — true at `10` and equally true at `1`, and still open as the minimum-participation-floor question**
- [[decisions/adr-103-identity-trust-seam]] — the existing precedent for a client-asserted fact reaching the crediting path
- [[systems/player-profile-store]] — the XP crediting path, its `(game_id, yandex_player_id)` idempotency key, and `creditMatchXp`'s single call site
- [[systems/glossary]] — the clientful/clientless partition and the win-condition vocabulary this turns on
- [[decisions/sprint-4]] — the board this was scheduled onto (2026-09-04)
- [[decisions/sprint-backlog]] — the board it was filed on and moved OFF (its row there reads `➡️ Moved`)
- [[tasks/winmodal-participation-comment-correction]] — task `0207`, 🚩 **a live comment trap aimed at whoever plans THIS task**: `WinModal`'s doc comment claims AI players are skipped from participation; they are not
- [[features/ai-players]] — the player type ADR-110 allows to win; ⚠️ **this task expires that ADR's T1 argument**, which held that an AI winner is valuable because it unblocks everyone's crediting
- [[systems/project-brief]] — product ground truth, whose *Citizenship* line states the earned-XP economy; 🔴 **its `1,000 XP` / `10 XP` figures are annotated against this task's 2026-09-10 ruling** (`1 XP`, threshold ÷ exactly 10) and ⚠️ **remain what the CODE does until this task ships**
- [[tasks/analytics-p0-session-match-count]] — the session-depth analytics whose rationale is the citizenship threshold; ✅ **unaffected by the rescale — the ÷10 is exact, so the ~100-match target is unchanged either way**
