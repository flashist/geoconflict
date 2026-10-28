# 0482 — worklog

## 2026-10-24 — Batch 1: work on it now, what brings badges back, earned or sold

**Provenance.** OWNER RULINGS given live via `AskUserQuestion` in the lead's Claude Code session on
2026-10-24, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned
`fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Where the owner typed his
own text it is quoted exactly as relayed. Recorded by a spawned `fkit-producer`.

### 1 — "Leaderboard badges: worth working on now?" (To-discuss 1)

Owner typed, verbatim (#3 = the option **"Talk it through now"**, option text *"Stay on Sprint 9; about 3
more questions. Nothing waits on it."*):

> *"#3, also bring the leaderboard-related task to the current sprint."*

⇒ **The talk continues now**, on Sprint 9. It is not parked before `0234` lands (the brief's guess in
To-discuss 1 — *"Probably: park until `0234` lands"* — is overruled for the **talk**; see answer 2 for the
**build**).
⇒ **"The leaderboard-related task" = [`0234`](../0234-leaderboard-core-system-definition/brief.md)** (the
core leaderboard definition investigation). Checked 2026-10-24 against the other open leaderboard tasks:
[`0210`](../../backlog/0210-singleplayer-platform-leaderboard-reporting-policy/brief.md) and
[`0209`](../../backlog/0209-define-placement-semantics-and-fix-literal-one/brief.md) fix the **existing Yandex
platform** leaderboard and are not what badges wait on; `0234` is the one this brief names as the badge
build's blocker, and the one answer 2's option text names. `0234` moved into Sprint 9 the same day at rank
19 (append rank, ADR-035) — see [`plan-sprint-9.md`](../../../sprints/plan-sprint-9.md) and `0234`'s brief.

### 2 — "What brings badges back?"

Owner picked, verbatim: **"Leaderboard is live (Recommended)"** — option text: *"0234 defined, built,
shipped, and players use it."*

⇒ **This is the BUILD GATE, not a talk gate.** The talk goes on now (answer 1). Any badge **build** waits
until the leaderboard is live: `0234` defined, the core leaderboard built and shipped, and players using
it. Any build brief this talk files carries `0234` as its `Depends on:` (as the brief already required),
and its own gate notes the "live and used" condition, which a `Depends on:` line alone cannot express.

### 3 — "When badges return: earned only, or can something be bought?" (S1, S2, Conflicts, To-discuss 3)

Owner picked, verbatim: **"Earned only (Recommended)"** — option text: *"Badges come only from real
results; never sold. Keeps the leaderboard trusted."*

⇒ **S1 settled: nothing here is sold.** Badges come only from real results.
⇒ **The conflict is settled for badges:** *"earned only, never sold"* wins over Q1's default (*"a paid
option for everybody"*). This is a per-item ruling (Q1: *"Each item should be discussed separately"*); it
does not change Q1 for any other item.
⇒ **S2 / Q2 / Q3 do not apply: there is no price question.** Nothing is sold, so there is no price, no
"above 249 Yan" rule, no paid-citizenship grant, and no grant code (`0019` R2) for this item.
⇒ **To-discuss 3 settled:** never sold. *"Never bought with coins"* is read as covered by "never sold"
(coins are on hold anyway, `0480`); flagged here so it is not treated as a separate open question.
⇒ The standing *"same rules for ALL purchases"* ruling (from `0477`) **does not apply**: there is no
purchase. The guest-login question is moot for this item.
⇒ Verification steps 2 and 3 (who may buy, price): **answered — nothing is sold**, by this ruling.

### Still open after batch 1

- To-discuss 2 — one shared name-drawing path? Technical; for the architect (`0485` is already
  investigating this for nickname styles).
- To-discuss 4 — reward tiers, visuals, who designs them.
- To-discuss 5 — Yandex A/B test or ship to all.
- The outcome: File / Park / Drop.

## 2026-10-24 — Batch 2: reward levels, badge art, test or ship, outcome

**Provenance.** OWNER RULINGS given live via `AskUserQuestion` in the lead's Claude Code session on
2026-10-24, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned
`fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Where the owner typed his
own text it is quoted exactly as relayed. Recorded by a spawned `fkit-producer`.

### 1 — "Badges: which reward levels to start from?" (To-discuss 4, tiers) — ⏳ PENDING

Owner typed, verbatim:

> *"To be honest, I forgot the context of it completely. What I right now want to do is that the producer
> should propose the system that is the best for us. After that ask the question again."*

⇒ **NOT an answer — the tiers question is still OPEN.** The owner asked the producer to **propose a
badge system first**, then to **ask the question again**. The proposal was written the same day by this
producer and returned to `fkit-lead` as a `NEEDS-DECISION` for the owner (not recorded here as a ruling;
it is a proposal until the owner picks).
⇒ ⛔ **0482 is NOT closed.** The Park outcome (answer 4) is decided, but the close waits until this
question has an owner answer.

### 2 — "Badges: who makes the badge art?" (To-discuss 4, visuals)

Owner typed, verbatim (#1 = the option **"Placeholders, art later (Recommended)"**, option text *"Build
with placeholder icons; real art is a separate design task. Build doesn't wait on art."*):

> *"#1, but brief a task for the art too, to be sure we don't forget about it."*

⇒ **RULING: placeholders now, real art later.** The badge build uses placeholder icons and **does not
wait on the art**.
⇒ **The art task is filed now:**
[`0489`](../../backlog/0489-design-real-art-for-the-leaderboard-badges/brief.md), on the **Backlog board** — the
owner named no board; the placement is `fkit-lead`'s reading (*"so we don't forget"*), recorded in that
brief. `Depends on:` nothing.

### 3 — "Badges: test on a group, or ship to all?" (To-discuss 5)

Owner picked, verbatim: **"Ship to all + off switch (Recommended)"** — option text: *"Like styles: quick
switch that hides only what players see."*

⇒ **RULING: no A/B test; ship to all players, with a quick off switch.** Switching it off hides **only
what players see** (the badges by names); the backend is not affected (earned badges stay stored). Same
shape as the nickname-styles ruling in
[`0477`'s worklog](../0477-discussion-nickname-styling-who-may-buy-it-price-and-outcome/worklog.md)
answer 4 — here ruled for badges in their own right, not inherited.
⇒ The old prose's *"Test via Yandex experiments API"* is replaced for badges.

### 4 — "Badges talk: what's the outcome?"

Owner picked, verbatim: **"Park (Recommended)"** — option text: *"Keep all answers; write the build task
when the leaderboard is live. Nothing waits on it."*

⇒ **RULING: outcome = Park.** All answers are kept. The badge **build** brief is written when the
leaderboard is live (batch 1, answer 2: `0234` defined, built, shipped, and players use it). Nothing
waits on it.
⇒ **What brings it back** (verification step 7): the leaderboard is live — batch 1, answer 2.
⇒ ⏳ **The close itself waits for answer 1** (the tiers). When the owner picks, record it here, then
close with `/fkit-task-done`.

### Still open after batch 2

- **The tiers** (answer 1) — proposal returned to the owner via `fkit-lead`; waiting for his pick.
- To-discuss 2 — one shared name-drawing path? Technical; carried to the build (and `0485` is already
  investigating it for nickname styles). Not an owner question.

## 2026-10-24 — Batch 3: the badge system (re-asked), the citizen ★ art, and the close

**Provenance.** OWNER ANSWERS given live via `AskUserQuestion` in the lead's Claude Code session on
2026-10-24, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9) to a spawned
`fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. The owner typed both
answers; they are quoted exactly as relayed, typos kept. Recorded by a spawned `fkit-producer`.

### 1 — "Badges: which system do we build when the leaderboard is live?" (re-ask of batch 2, answer 1)

Options put to him: **two badges** (the producer's proposal, recommended) / **the original three tiers** /
**decide after 0234**. Owner typed, verbatim:

> *"It depends on an answers from the producer."*

⇒ **Recorded as "decide after `0234`'s findings".** ⚠️ **This is `fkit-lead`'s reading, not the owner's
words.** The lead read *"answers from the producer"* as the answers of
[`0234`](../0234-leaderboard-core-system-definition/brief.md) — the leaderboard definition investigation,
whose owner is `fkit-producer` and whose questions 2 (one board or several) and 3 (reset cadence) are
exactly what the choice turns on. ⚠️ **Another reading was possible and was not taken:** *"the producer
decides"*. If that is what the owner meant, the producer's pick is candidate 1 below (it was the
recommended option). Either reading leaves the build exactly where it is — not filed, waiting on `0234`.

⇒ **The badge-system question is CARRIED, not answered.** It goes to the **future badge build brief**,
which by the Park ruling (batch 2, answer 4) is written when the leaderboard is live. That brief is not
filed yet, so the question is also written down where it can be read today:
- [`0234`'s brief](../0234-leaderboard-core-system-definition/brief.md) — an input note: the badge choice
  needs to know whether there is a **monthly reset**, and whether there is **one board or both an all-time
  and a monthly board**.
- [`0489`'s brief](../../backlog/0489-design-real-art-for-the-leaderboard-badges/brief.md) (the badge art) — its
  step 1 waits on this choice; a note says the choice now comes after `0234`.

**The two candidates, for the future build brief** (neither is ruled):

1. **Two badges — the producer's proposal (2026-10-24).** In plain words:
   - **"Top 10 now"** — anyone in the top 10 of the main leaderboard has it; drop out and it goes, climb
     back and it returns.
   - **"Month Top 3" trophy** — at each monthly reset, that month's top 3 each get a dated trophy (e.g.
     "October 2026 — Top 3"), **kept forever**.
   - A name shows **only one badge in a match: the best one the player has.** A trophy shelf on a profile
     can come later.
   - **Dropped from the old plan: the separate all-time top 3 icon** — on a points-for-playing board it
     would stay forever with whoever plays most; new players could never reach it.
   - **Only the one main leaderboard counts**, even if `0234` adds more boards.
   - Only logged-in players can earn one (guests are not on the leaderboard).
   - 2 designs. **Needs from `0234`: a monthly reset.** With no reset, the trophy is left out and
     "Top 10 now" still works.
2. **The original three tiers** (`done/plan-sprint-5.md` § 10, copied in this brief's Appendix):
   - Global top 3: a permanent special icon.
   - Monthly top 3: a dated badge kept forever.
   - Global / monthly top 4–10: a smaller icon that changes with rank.
   - 3 designs, a bigger build. **Needs from `0234`: both an all-time board and a monthly board.**

⇒ **Knock-on: none.** No task moves; no `Depends on:` line changes. `0489` step 1 still cannot start until
the choice is made — information it reads, not a dependency.

### 2 — "The citizen ★ is still a placeholder. What about its real art?"

Owner typed, verbatim:

> *"To be honest, I kind of like it. I suggest adding a brief to backlog about INVESTIGATING /
> BRAINSTORMING ideas for the real art: this task is supposed to give us few options to choose from, but
> at the end, it's gonna be my call about using something new or keeping the current star-icon."*

⇒ **RULING: file a brainstorm brief on the Backlog board.** Its output is **a few options to choose from,
with keeping today's ★ as one of them**; **the final call is the owner's.** Filed the same day as
[`0490`](../../backlog/0490-investigate-real-art-ideas-for-the-citizen-star-a-few-options-to-choose-from-or-keep-it/brief.md).
`0489` (badge art) still covers **badges only**; `0490` links it for style. This answer is about the ★,
not about badges; it is recorded here because it was asked in this talk.

### Outcome and close

- **Outcome: Park** (batch 2, answer 4). **What brings it back:** the leaderboard is live and players use
  it — `0234` defined, the core leaderboard built and shipped, and players using it (batch 1, answer 2).
- **Verification steps checked 2026-10-24 before the close:**
  1. Outcome recorded with the owner's words — batch 2, answer 4. ✅
  2. Who may buy — answered: **nothing is sold** (batch 1, answer 3). ✅
  3. Price — does not apply, nothing is sold (batch 1, answer 3). ✅
  4. To-discuss: **1** answered (batch 1, answers 1–2) · **2** (one shared name-drawing path) carried as a
     technical question to the build and to [`0485`](../../backlog/0485-investigate-nickname-styles-one-shared-name-drawing-path-and-a-reusable-readability-approval-solution/brief.md),
     which is investigating it · **3** answered (batch 1, answer 3) · **4** visuals and who designs:
     answered (batch 2, answer 2; `0489`); tiers: **carried** (this batch, answer 1) to the future build
     brief, noted in `0234` and `0489` · **5** answered (batch 2, answer 3). ✅ — ⚠️ the "named follow-up
     brief" for the tiers is not filed yet, by the Park ruling; the named carriers today are `0234` and
     `0489`.
  5. The conflict (earned only vs Q1) — settled, batch 1, answer 3. ✅
  6. File — does not apply (Park).
  7. Park — what brings it back is written above. ✅
  8. Closed with `/fkit-task-done` by a **spawned** producer, so the close is
     `✅ Done (agent-closed — not owner-verified)`.
