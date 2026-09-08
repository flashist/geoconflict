# Consolidate unsprinted work onto `sprints/backlog.md` and retire `sprint-backlog.md`

## ID
0001

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-producer

---

> # 🔴 UPDATE 2026-09-08 — this task is the OWNER'S CHOSEN ROUTE for the `/fkit-status` blind spot
>
> **Owner ruling, given live in session 2026-09-08 and relayed through the spawning session:**
> **ship `0001`; HOLD on locally patching `/fkit-status`.** Trail: a board-visibility sweep found
> `sprint-backlog.md` unreachable by `/fkit-status`; the producer referred it as a tooling question;
> an **fkit-architect assessment** scoped it; the owner ruled on that assessment. Reasoning is
> recorded in [ADR-108](../../../knowledge-base/decisions/adr-108-owner-set-active-sprint-pointer.md).
>
> ⚠️ **Status and priority are deliberately UNCHANGED (`🔲 Backlog` / `Unscheduled`). The owner ruled
> the ROUTE, not the schedule.** This task is not scheduled by this update.
>
> ## ✅ The scope conflict this ruling created is now SETTLED — no longer blocking
>
> On the **same day**, the owner **ratified `⬜ No sprint` and `⏸ Parked`** as board-level exceptions
> valid on `sprint-backlog.md` **only**
> ([`task-status-vocabulary.md`](../../../knowledge-base/conventions/task-status-vocabulary.md)),
> which contradicted step 2 and verification step 3 below. Three ways out were put to the owner:
> carry the markers over (broke the same-day scope rule), flatten to `🔲 Backlog` (destroyed the
> distinction just ruled worth keeping), or widen the exception to `backlog.md`.
>
> **Owner ruled the same day: WIDEN — both markers are now valid on `sprint-backlog.md` AND
> `backlog.md`**, taken explicitly as a **deliberate re-scoping**, on the reasoning that both values
> describe *unscheduled work* and that after this task `backlog.md` becomes the only board holding it.
>
> ⇒ **Step 2 and verification 3 are UNBLOCKED and rewritten below. This task is executable.** Carry
> both markers across verbatim; do not flatten them. 🚨 The **unpark-condition rule survives** — every
> `⏸ Parked` row must still state its condition.
>
> ✅ **Worth noting: step 2 predicted this and its own escape hatch fired exactly as designed.** It
> said *"If `🔲 Backlog` genuinely cannot express 'parked pending a metric', **raise it with the
> owner** and consider amending the vocabulary doc — that is the sanctioned fix, not an inline
> invented marker."* That is precisely what happened on 2026-09-08. The brief was right; what it did
> not anticipate is that the amendment would scope the new values to the board this task retires.
>
> ## 🚨 The Context section's stated "real reason" is REFUTED — verified live, not reasoned
>
> Lines 30–34 claim `sprint-backlog.md` matches a `sprint-*.md` glob and is therefore *"eligible to be
> picked up and reported as the **active sprint**"*. **That is false.** Run 2026-09-08:
> `bash .claude/skills/fkit-status/dashboard.sh select-active ai-agents/sprints` reports
> `candidate file="sprint-backlog.md" identity="Backlog"` — it resolves to the **`Backlog` identity**,
> not a sprint identity, and `dashboard.sh:274` states the selector will *"Never fall back to a
> `Backlog`-identity board."* **`sprint-backlog.md` cannot be selected as the active sprint.**
>
> ⚠️ **The task is still worth doing — the rationale changes, not the conclusion.** The **real**
> defect, per the 2026-09-08 architect assessment, is **file selection**: `fkit-status/SKILL.md:57`
> names only `ai-agents/sprints/backlog.md` as the Backlog board, singular. `sprint-backlog.md`
> appears **nowhere** in that skill, so **no documented argument reaches it** — it is unreachable by
> every invocation, not merely absent from the default run. Consolidation fixes that by removing the
> second board. **Replace the lines 30–34 rationale with this one when the task is picked up.**
>
> ⚠️ **Two further corrections from the architect assessment, so nobody re-derives them:**
> 1. The two non-canonical values do **not** hide rows. `dashboard.sh` renders all 25 with their
>    status cells verbatim; `marker_key`'s default arm is a **bucket, not a drop**. The cost is a
>    useless summary line plus drift-noise lines — **degraded, not invisible.**
> 2. The default run omitting unscheduled work is **the contract, not a bug** (upstream ADR-041 §3) —
>    `backlog.md`'s own 34 open rows are not in the default run either. **Do not write this up as a
>    defect.**
>
> ## Row count this task must move — measured 2026-09-08, supersedes "~23 entries" at line 23
>
> `sprint-backlog.md` now carries **25 rows** (23 `⬜ No sprint` + 2 `⏸ Parked`), not ~23 — two rows
> (`0026`, `0029`) were appended 2026-09-08 under a separate owner ruling.
>
> **Of the 8 rows carrying no brief, 6 are live work and 2 are residue:**
>
> | Row | Verdict | Evidence |
> |---|---|---|
> | Task 6 — Rewarded Ads: Minimal Version | **LIVE** | `plan-index.md:89` (Sprint 4 column). Open question already recorded in its Items section: whether it merges into Sprint 5 Task 11. |
> | Task 7 — Leaderboard: Core System | **LIVE** | `plan-index.md:90`. Sprint 5's `Leaderboard — Rewards Layer` row depends on it. `0161` (done) and `0210` are both narrower and different. |
> | Task 8b — Private Lobbies (Citizens Only) | **LIVE** | `plan-index.md:92`. No brief anywhere. |
> | Task 8c — Spectating (Citizens Only) | **LIVE** | `plan-index.md:93`. No brief anywhere. |
> | Task 5 — Deep Mobile Rendering Optimization | **LIVE (parked)** | `plan-index.md:76`, condition *mobile DAU > 1,500*. `0031` is related but a different task, and says so. |
> | Task 2i — Microsoft Clarity Session Recordings | **LIVE (parked)** | `plan-index.md:68`, condition *mobile perf confirmed stable*. |
> | **Task 9 — Re-enable Flags** | **⛔ RESIDUE** | Duplicated by open brief [`0010-re-enable-flags-paid-non-country-cosmetic`](../0010-re-enable-flags-paid-non-country-cosmetic/brief.md), **whose title literally reads "(Task 9)"**, tracked on `backlog.md:29` with a live `🚧 Blocked` status and dated reasons. |
> | **Task 9a — Re-enable Territory Patterns** | **⛔ RESIDUE** | Duplicated by open brief [`0011-re-enable-territory-patterns`](../0011-re-enable-territory-patterns/brief.md), **title "(Task 9a)"**, tracked on `backlog.md:30`, live `🚧 Blocked`. |
>
> ⇒ **True unique blind spot: 23 rows, not 25 and not 17.** The two residue rows are duplicates of
> work already visible on `backlog.md`.
>
> 🚨 **Consolidating Task 9 / Task 9a as new rows would CREATE duplicates of `0010` / `0011`.** Line
> 24 lists them as ordinary entries to carry across; **they must be dropped or merged instead.** Their
> `## Items` prose may still hold context worth folding into `0010`/`0011` — check before discarding,
> per step 4.
>
> ⚠️ **Premise correction for the record:** the assessment that prompted this said only Task 5 appears
> in `plan-index.md`, "in passing". **All 8 appear**, 6 of them carrying an explicit `Sprint 4` in the
> plan-index Sprint column. `plan-index.md` is current, not an older planning doc — it marks Sprint 4
> active and 5/6 pre-scoped.

---

## Context

There are now **two** boards for unsprinted work, and the older one has a name that actively
misleads the tooling.

- `ai-agents/sprints/sprint-backlog.md` — the project's long-standing board, ~23 entries of defined
  but unsprinted work (Tasks 6/7/8b/8c/9/9a, the sec10–sec13 security items, the monitoring bot
  phases, the 152-ФЗ compliance item, the bot/nuke investigations, and two parked items).
- `ai-agents/sprints/backlog.md` — created 2026-08-08 during project initiation, because the
  `fkit-task-brief` skill files unsprinted briefs there by convention. Currently holds only the four
  migration tasks.

**The unreachable-board bug — this is the real reason to do this task.** `/fkit-status`'s own skill
contract, `fkit-status/SKILL.md:57`, names exactly one Backlog board:
`ai-agents/sprints/backlog.md`, **singular**. `sprint-backlog.md` appears **nowhere in that skill**, so
**no documented argument reaches it** — it is unreachable by *every* invocation, not merely absent from
the default run. 23 rows of live, open work are addressable by no `/fkit-status` command anybody could
be told to type. Consolidation fixes this by removing the second board.

⚠️ **Two things this is NOT, so the rationale is not overstated** (architect assessment, 2026-09-08):
- The board's non-canonical status values do **not** hide its rows — `dashboard.sh` renders all 25 with
  their status cells verbatim; `marker_key`'s default arm is a **bucket, not a drop**. The cost is a
  useless summary line plus drift noise: **degraded, not invisible.**
- The default run omitting unscheduled work is **the contract, not a bug** (upstream ADR-041 §3).
  `backlog.md`'s own 34 open rows are not in the default run either. **Do not write that up as a
  defect.**

> 🚨 **REFUTED 2026-09-08 — the original rationale below is FALSE. Kept visible, struck, so nobody
> re-derives it from a clean-looking paragraph.**
>
> ~~**The naming bug — this is the real reason to do this task.** `/fkit-status` finds the active
> sprint by globbing `sprint-*.md`. `sprint-backlog.md` matches that glob. A board of explicitly
> *unscheduled* work is therefore eligible to be picked up and reported as the **active sprint**. The
> filename `backlog.md` is deliberately outside the glob; `sprint-backlog.md` is deliberately inside
> it. That is exactly the failure mode the convention warns about, and it exists here today.~~
>
> **Disproved by running the selector, not by reasoning about it.**
> `bash .claude/skills/fkit-status/dashboard.sh select-active ai-agents/sprints` reports
> `candidate file="sprint-backlog.md" identity="Backlog"` — the board resolves to the **`Backlog`
> identity**, not a sprint identity — and `dashboard.sh:274` states the selector will *"Never fall
> back to a `Backlog`-identity board."* **`sprint-backlog.md` cannot be selected as the active
> sprint.** The conclusion (do this task) survives; the reason does not.
>
> *(Rewritten in place on the coordinator's call, 2026-09-08 — not an owner ruling. Rationale: a
> refuted premise left sitting in Context will be re-read as true.)*

The two-board split also means "what is unsprinted?" has two answers, and a `dashboard.sh` run sees
only one of them.

**Prerequisite ordering.** Do this **after** 0002 and 0003, or the rows moved across will carry
brief links that the migration then has to rewrite twice. Doing it last means each row is written
once, already pointing at its final `<NNNN>-<slug>/brief.md` path.

## What to build

1. **Move all `sprint-backlog.md` rows into `backlog.md`**, conforming each to the required board
   shape — a `## Status` heading over a four-column `Status | Priority | Task | Brief` table.
   `dashboard.sh` and both movers locate rows by exactly that shape; it is load-bearing, not
   cosmetic.

2. ✅ **UNBLOCKED 2026-09-08 by owner ruling — carry both markers across unchanged.** `⬜ No sprint`
   and `⏸ Parked` were ratified that day and their scope was then **widened to `backlog.md`** by the
   same owner, precisely so this step would not have to flatten them. **Do not normalise them away.**
   Move each row's Status cell **verbatim**. 🚨 **Every `⏸ Parked` row must still carry its unpark
   condition** — that rule survives the widening. See
   [`task-status-vocabulary.md`](../../../knowledge-base/conventions/task-status-vocabulary.md).
   ~~**Normalise every Status cell to the canonical vocabulary.** The current board uses
   `⬜ No sprint` and `⏸ Parked`, neither of which exists in
   `conventions/task-status-vocabulary.md`. Everything unsprinted becomes `🔲 Backlog`.~~
   *(original step, superseded 2026-09-08 — kept, not deleted)*

2b. 🚨 **Task 9 and Task 9a: MERGE, THEN DROP — do not carry them across as rows.** They are
   **residue**, duplicated by the open briefs
   [`0010-re-enable-flags-paid-non-country-cosmetic`](../0010-re-enable-flags-paid-non-country-cosmetic/brief.md)
   and [`0011-re-enable-territory-patterns`](../0011-re-enable-territory-patterns/brief.md) — whose
   titles literally read "(Task 9)" and "(Task 9a)" — already tracked on `backlog.md:29-30` with live
   `🚧 Blocked` statuses. Consolidating them as new rows would **create duplicates**. First fold
   anything useful from their `## Items` prose into `0010`/`0011`: those sections carry plan-index
   effort figures and dependency reasoning that the two briefs may lack. Then drop the rows.
   *(Ruled by the coordinator 2026-09-08, taking the producer's recommendation — not an owner ruling.)*
   ⚠️ **The two parked items (Task 5 — deep mobile rendering, Task 2i — Microsoft Clarity) are not
   simply "backlog"** — they carry a real deferral condition (mobile DAU > 1,500; mobile perf
   confirmed stable). Do not lose that. Carry the condition into the Task cell or the item's prose
   section. If `🔲 Backlog` genuinely cannot express "parked pending a metric", **raise it with the
   owner** and consider amending the vocabulary doc — that is the sanctioned fix, not an inline
   invented marker.

3. **Set every Priority cell to `—`.** The backlog board is unranked by design; a number here is a
   commitment nobody made.

4. **Preserve the prose `## Items` sections** from `sprint-backlog.md` — they carry the "from
   plan-index / current state / effort" reasoning for each item and are the only place some of it is
   written down.

5. **Retire `sprint-backlog.md`.** Replace its body with a one-line pointer to `backlog.md` (keeping
   the file so existing inbound links do not 404), or delete it and fix every inbound link. Either
   is acceptable; **decide explicitly and say which**, and if deleting, the link sweep is mandatory.

6. **Update inbound references** in `plan-index.md` (its Sprint Files table lists the backlog) and
   anywhere else a repo-wide grep for `sprint-backlog` finds them.

## Verification steps

1. `ls ai-agents/sprints/sprint-*.md` returns only real sprint plans — **no backlog board in the
   list**.
2. `backlog.md` contains a `## Status` heading followed by a four-column
   `Status | Priority | Task | Brief` table, and every pre-existing `sprint-backlog.md` entry now
   has a row in it (count matches: 23 carried over + the 4 migration tasks).
3. ✅ **UNBLOCKED 2026-09-08 — rewritten to match the ruling.** Every Status cell in `backlog.md` is a
   value present in `conventions/task-status-vocabulary.md` — **which since 2026-09-08 includes
   `⬜ No sprint` and `⏸ Parked` on this board.** The zero-hits grep is **inverted**: after the move,
   `⬜`/`⏸` should appear **on `backlog.md`** and **nowhere else** under `ai-agents/sprints/` except
   the retained `sprint-backlog.md` stub, if step 5 keeps one. Also assert **no `⏸ Parked` row has
   lost its unpark condition**.
   ~~Every Status cell in `backlog.md` is a value present in
   `conventions/task-status-vocabulary.md`; a grep for `⬜`, `⏸`, and `No sprint` across
   `ai-agents/sprints/` returns zero hits.~~ *(original check, superseded 2026-09-08 — kept, not
   deleted)*
4. Every Priority cell in `backlog.md` reads `—`.
5. The deferral conditions for Task 5 and Task 2i are still findable in the file (grep for
   `1,500` and `Clarity`).
6. Every `Brief` link in `backlog.md` resolves to an existing file (scripted `test -f` over each
   target).
7. Repo-wide grep for `sprint-backlog` returns either zero hits or only hits pointing at the
   retained pointer stub.
8. `/fkit-status` run with no argument resolves to a real sprint plan, not the backlog.

## Notes

- **Depends on:** 0002, 0003
- **Blocks:** nothing

- Owner-facing decision embedded in step 5 (stub vs delete) — small, and safe for the producer to
  decide; state the choice in the hand-off.
- Producer-owned because this is board curation and status-vocabulary work, not source code.
- This task does **not** move any task file between boards; no mover skill is involved.
- No secrets: these files go to git.
