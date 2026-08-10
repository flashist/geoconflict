# Reconcile legacy status markers in the sprint plans to the canonical vocabulary

## ID
0004

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

The sprint plans predate `conventions/task-status-vocabulary.md` and use a status vocabulary that
does not match it. Observed in `plan-sprint-4.md`, `plan-sprint-6.md`, `sprint-backlog.md`, and
`plan-index.md`:

| Used today | Canonical equivalent |
|---|---|
| `⬜ Backlog` | `🔲 Backlog` (different glyph) |
| `🔄 In Progress` | `🔄 In progress` (different casing) |
| `⚠️ Urgent` | **no equivalent** — urgency is not a status |
| `⏸ Parked` | **no equivalent** — see below |
| `⬜ No sprint` | `🔲 Backlog` |
| `⛔ Cancelled` (no date) | `⛔ Cancelled (YYYY-MM-DD) — <reason>` |

**Why this matters.** `dashboard.sh` and both mover skills locate and interpret rows by exact
marker. A near-miss glyph is not a cosmetic difference — it is an unparseable row, and an
unparseable row is silently absent from every board-driven view. The canonical set is also what
makes `✅ Done` and `⛔ Cancelled` mean *"a mover skill set this"* rather than *"someone typed
this"*.

**Two markers have no canonical equivalent, and this task must not paper over them:**

- **`⚠️ Urgent`** (currently on *Yandex Catalog Registration* in Sprint 4) conflates **priority**
  with **status**. The row's actual status is Backlog; its urgency belongs in the Priority column or
  the brief. But that task is also **externally blocked** on Yandex approval — so `🚧 Blocked —
  awaiting Yandex catalog approval` may be the honest status. Decide per row, with evidence.
- **`⏸ Parked`** (Task 5 deep mobile rendering, Task 2i Clarity) encodes *"deferred until a named
  metric is met"* — a real distinction the canonical six cannot express.

⚠️ **If the canonical vocabulary genuinely cannot express a distinction the board needs, the
sanctioned fix is to amend `conventions/task-status-vocabulary.md` — with owner approval — not to
keep an inline invented marker and not to flatten the distinction away silently.** The convention
doc says so itself: it is a starting convention, and it is yours to amend, in exactly one place.
**Raise both cases with the owner before converting them.**

**Ordering.** Run **after** 0002 and 0003. Those tasks rewrite brief links throughout the same
sprint-plan files; doing status reconciliation first means editing every plan twice and risking
merge pain for no benefit.

## What to build

1. **Inventory every status marker** currently in use across `ai-agents/sprints/` (including
   `done/`) and `ai-agents/tasks/`. Produce the full list with counts and locations before changing
   anything — the mapping table above was built from a partial read and may be incomplete.

2. **Put the two unmappable cases to the owner** (`⚠️ Urgent`, `⏸ Parked`) with a recommendation
   each. Get a ruling before converting them.

3. **Convert every mappable marker** to its canonical form across all sprint plans and the backlog
   board.

4. **Backfill dates and reasons on closed rows.** `⛔ Cancelled` rows need
   `(YYYY-MM-DD) — <reason>`; both are mandatory. Recover them from
   `sprints/cancelled-tasks.md` and the plans' own addendum notes. **Never invent a date or a
   reason** — list anything unrecoverable in the hand-off report instead.

5. **Do not change any task's actual state.** This is a *notation* change. A row that means "not
   started" still means "not started" afterwards. If reconciliation reveals a row whose recorded
   status contradicts reality, **report it — do not silently correct it**; a status correction is a
   separate, owner-visible act.

6. **Do not invoke the mover skills.** Rewriting a marker in a plan is not a task close. Any row
   that genuinely needs to become `Done` or `Cancelled` goes through `/fkit-task-done` /
   `/fkit-task-cancelled` as its own act, producer-invoked.

## Verification steps

1. A grep across `ai-agents/sprints/` and `ai-agents/tasks/` for `⬜`, `⏸`, `⚠️ Urgent`, `No sprint`,
   `In Progress` (capital P), `Not started`, `WIP`, and `Todo` returns **zero** hits — or only hits
   the owner explicitly ruled to keep.
2. Every Status cell in every sprint plan and the backlog board matches a value defined in
   `conventions/task-status-vocabulary.md`.
3. Every `⛔ Cancelled` row carries both a date and a reason; spot-check 3 against
   `cancelled-tasks.md`.
4. Every `✅ Done` row corresponds to a brief that actually lives in `ai-agents/tasks/done/`, and
   every `⛔ Cancelled` row to one in `cancelled/`. Mismatches are reported, not fixed.
5. `dashboard.sh` runs clean over the reconciled plans with no unparseable rows.
6. The before/after inventory from step 1 shows a one-to-one row count — **no row was dropped** in
   conversion.
7. If the vocabulary was amended, `conventions/task-status-vocabulary.md` carries the new value and
   the owner's approval is recorded.

## Verification note

Verification step 4 will surface genuine drift — Sprint 4's table currently marks several tasks
`✅ Done` whose briefs are still sitting in `backlog/`, or vice versa. That is expected output of
this task, **not** a reason to move files. Report it; the owner decides.

## Notes

- **Depends on:** 0002, 0003
- **Blocks:** nothing

- Producer-owned: this is status-vocabulary and board curation work, not source code.
- The real deliverable is that board-driven views stop lying. Amending the vocabulary doc is a
  legitimate outcome, not a failure to conform.
- No secrets: these files go to git.
