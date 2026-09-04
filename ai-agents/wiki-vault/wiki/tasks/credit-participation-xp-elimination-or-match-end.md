# Credit Participation XP at Elimination or Match End (task 0211)

**Source**: `ai-agents/tasks/backlog/0211-credit-participation-xp-at-elimination-or-match-end/brief.md`
**Status**: backlog — ⚠️ **scheduled into Sprint 4, but NOT started. Nobody is building this.**
**Sprint/Tag**: Sprint 4 — scheduled 2026-09-04 by owner ruling; rank `Medium–High` (**the producer's**, held three times that day)

> ### 🔴 SEQUENCING: THIS MUST NOT **SHIP** BEFORE `0208` IS DEPLOYED AND COLLECTING DATA
>
> **Owner ruling, 2026-09-04.** [[tasks/measure-clientless-leader-and-solo-awards]] (`0208`) must be
> **deployed AND collecting data** first.
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

**Not started.** What is settled, by six owner rulings on 2026-09-04:

| Ruling | |
|---|---|
| **Survivors are IN SCOPE** | *"half a fix leaves you rediscovering this in three months."* ⛔ The ruling states a **REQUIREMENT, not a mechanism** — the trigger is the plan's to choose |
| **Team mode is IN SCOPE** | The fix lives in the **crediting path, not the win check**, so covering both is likely near-free — and it stops `0205` being solved twice or forgotten |
| **Singleplayer is OUT of scope** | FFA and Team only |
| **XP amount HOLDS at 10 flat** | *"Do not change two things at once"* — a **deliberate hold**, decision deferred, not made |
| **Scheduled into Sprint 4** | The owner **declined** the producer's "leave it unscheduled" recommendation |
| **`0208` ships first** | See the sequencing box above |

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
same primary key — **one credit per (game, account), 10 XP** — and the existing precedent for the seam
is `GameServer.getCreditableYandexId()` ([[decisions/adr-103-identity-trust-seam]]).
⚠️ **The architect's decisive point: the identity being credited is itself client-asserted, so
hardening the elimination claim first would be hardening the stronger link.**

## Related

- [[tasks/ffa-clientless-leader-fallback-award]] — task `0206`, the **reverted** predecessor. ⛔ **Read its STOP box, not its design**
- [[tasks/measure-clientless-leader-and-solo-awards]] — task `0208`, which **must be deployed and collecting data before this ships**
- [[tasks/teams-bot-team-win-stall]] — task `0205`, the Team-mode **resolution policy** (*who should win?*); ⛔ **not merged with this task** (*do those players get their XP?*), and its status, scope and rank are unchanged
- [[tasks/win-check-clientless-leader-guard]] — task `0022`, whose guard is where the stall originates
- [[tasks/singleplayer-leaderboard-reporting-policy]] — task `0210`, whose **leaderboard-points** ruling must **not** be read across onto profile XP
- [[decisions/clientless-leader-win-policy]] — the XP-loss defect this task exists to close
- [[decisions/adr-110-ai-winner-allowed]] — cited, not implemented: this task **expires its T1 argument** by decoupling crediting from the winner, ⛔ **without** firing its re-raise trigger
- [[decisions/adr-101-fail-soft-xp-crediting]] — the fail-soft crediting path this task extends to a second trigger
- [[decisions/adr-103-identity-trust-seam]] — the existing precedent for a client-asserted fact reaching the crediting path
- [[systems/player-profile-store]] — the XP crediting path, its `(game_id, yandex_player_id)` idempotency key, and `creditMatchXp`'s single call site
- [[systems/glossary]] — the clientful/clientless partition and the win-condition vocabulary this turns on
- [[decisions/sprint-4]] — the board this was scheduled onto (2026-09-04)
- [[decisions/sprint-backlog]] — the board it was filed on and moved OFF (its row there reads `➡️ Moved`)
- [[tasks/winmodal-participation-comment-correction]] — task `0207`, 🚩 **a live comment trap aimed at whoever plans THIS task**: `WinModal`'s doc comment claims AI players are skipped from participation; they are not
- [[features/ai-players]] — the player type ADR-110 allows to win; ⚠️ **this task expires that ADR's T1 argument**, which held that an AI winner is valuable because it unblocks everyone's crediting
