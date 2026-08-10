# Reconcile `## Sprint` field values in task briefs to a parseable form

## ID
0050

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

`## Sprint` is one of the brief fields `dashboard.sh` reads, and in most briefs it does not hold a
sprint name — it holds a paragraph. Verified inventory of the **38 briefs task `0002` migrated**
(`0012`–`0049`), read exactly the way `dashboard.sh` reads the field:

| Shape | Count | Example |
|---|---|---|
| A bare, parseable sprint name | 7 | `Sprint 4` |
| Free-form prose | 23 | `Sprint backlog — no sprint home yet. Bot-behaviour quality improvement; needs a sprint home before implementation.` |
| Missing entirely (no `## Sprint` heading value) | 8 | `0012`, `0015`, `0016`, `0024`, `0035`, `0036`, `0045`, `0047` |

Further real values on disk:

- `Backlog — no sprint. Deferred out of Sprint 4c on 2026-06-03: high implementation` *(and four more lines)*
- `Sprint 4 — implement inside each citizenship UI task, not after`
- `Unscheduled — parking lot. Return to this when citizenship + name rendering (Task 8) are live.`
- `**Backlog (no sprint home).** Deferred out of Sprint 4 on 2026-06-28 (see Risk note). This was the`

The `0001`–`0011` briefs (written under the fkit conventions) all read a bare `Backlog` and are
already correct.

**⚠️ `field_value()` reads only the FIRST non-blank line under the heading.** A multi-line prose
value is silently truncated mid-sentence — `0030`'s value reaches the dashboard as
`Sprint 4 — In-App Monetization & Citizenship (Phase 2). Sequenced **after** the player`. So the
field is not merely untidy; the thing tooling actually sees is a fragment nobody wrote on purpose.

### Why it matters, stated precisely

`dashboard.sh` compares `## Sprint` against the board's own sprint identity (`PLAN_SPRINT`). On the
**Backlog board** the comparison is **exact string equality against `Backlog`**
(`dashboard.sh:796`), and rule 1's usual "brief names another sprint, skip the check" excuse is
deliberately disabled there. **Every value that is not literally `Backlog` fires
`drift disagreement` on that board.**

**But it does not fire today, and the brief must not claim it does.** Verified by running the
dashboard this turn:

- `ai-agents/sprints/backlog.md` — parses fine; its 11 rows all read `Backlog`; the three drifts it
  reports are a *status*-cell issue, unrelated to this field.
- `ai-agents/sprints/plan-sprint-4.md` — `dashboard.sh: no '## Status' section`. The board cannot be
  read at all, so no rule runs on it.
- `PLAN_SPRINT` resolves **empty** for all five `plan-*.md` files and for `sprint-backlog.md`: the H1
  form is `# Geoconflict — Sprint 4 — …` (the regex wants `^# Sprint N`) and the filename form is
  `plan-sprint-4` (the fallback wants `^sprint-N$`). With `PLAN_SPRINT` empty, drift rule 1 is inert
  on every sprint plan in this repo.

**So the real trigger is `0001`.** When `0001` consolidates `sprint-backlog.md`'s rows onto
`backlog.md`, those rows land on the one board where the exact-equality test is live, and the prose
values start reporting as drift *en masse*. `0002` made the briefs addressable; `0001` is what makes
the field's shape start costing something. This task should land **before or alongside `0001`**,
though it is not blocked by it — the inventory and the decision can be made now.

### Not covered elsewhere

- `0004` reconciles **status markers** — a different field, a different vocabulary. No overlap.
- `0002`'s plan §8 flagged this field as *"a gap with no task"* and recommended a brief. This is it.
  `0002` did not create the problem and did not fix it; it made it visible.

### An adjacent finding — raise it, do not silently absorb it

The `PLAN_SPRINT`-resolves-empty defect above is a **board-side** naming/parse mismatch, not a
brief-side one. Reconciling every brief to `Sprint 4` achieves nothing on a board whose identity
never resolves. **Put to the owner whether fixing that belongs in this task or in its own brief** —
do not fix it silently as a side effect, and do not quietly drop it either.

## What to build

1. **Inventory the actual values.** Every `## Sprint` value across `ai-agents/tasks/backlog/`,
   `done/`, and `cancelled/`, read the same way `dashboard.sh` reads it (first non-blank line under
   the heading — so the inventory shows what tooling sees, not what a human sees). Report counts and
   locations before changing anything. The table above covers `backlog/` only.

2. **Decide the canonical form, and put it to the owner.** The candidates are a bare sprint name
   (`Sprint 4`) or the bare word `Backlog`, matching what `0001`–`0011` already write and what
   `dashboard.sh:796` tests for. Decide explicitly what an unscheduled-but-not-backlog task writes
   (`0023` currently says `Unscheduled — parking lot…`), and whether `Unscheduled` is a fourth value
   or collapses to `Backlog`.

3. **Decide where the displaced prose goes — this is the load-bearing part.** ⚠️ **The prose carries
   real deferral history and must not be discarded.** `0031` records why mobile WebGL left Sprint 4c
   and what would bring it back; `0048` records a dated owner risk acceptance; `0044` records a
   change of direction. Losing that to make a field parse is a bad trade. Propose a destination — a
   `## Context` paragraph, a dated note, or a `## Notes` bullet — and state it in the plan **before**
   moving anything.

4. **Fill the 8 missing values.** Derive each from the brief's own text and its board row; **never
   invent one.** Where it genuinely cannot be determined, leave it and list it in the hand-off
   report.

5. **Decide whether `conventions/` needs a `## Sprint` vocabulary doc**, the way `## Status` and
   `## Owner` each have one (`task-status-vocabulary.md`, `task-owner-vocabulary.md`). Recommendation
   to the owner either way, with the reason. If yes, write it — it is the artifact that stops this
   drifting back.

6. **Raise the adjacent `PLAN_SPRINT` finding** (see Context) as an in-scope-or-separate-brief
   question. Owner decides.

7. **Change no task's actual sprint assignment.** This is a *notation* change. A brief that means
   "Sprint 4" still means Sprint 4 afterwards. If reconciliation reveals a brief whose recorded
   sprint contradicts its board row, **report it — do not silently correct it.**

## Verification steps

1. The before/after inventory from step 1 shows the **same number of briefs**, with every prose
   value accounted for as either *kept verbatim elsewhere in the same brief* or *explicitly ruled
   droppable by the owner*. No value disappears unaccounted for.
2. Every `## Sprint` value in `ai-agents/tasks/backlog/` reads either a bare `Sprint <N>` or the bare
   word `Backlog` (or another value the owner ruled canonical in step 2) — checkable with:
   `for f in ai-agents/tasks/backlog/*/brief.md; do awk '/^## Sprint$/{getline;print;exit}' "$f"; done | sort -u`
   The output is a short closed set, not 40 distinct paragraphs.
3. **Zero briefs are missing the field.** The same command emits one line per brief.
4. **No value is multi-line** — for every brief, the second non-blank line under `## Sprint` is
   either absent or a `## ` heading. This is what makes the dashboard's first-line read lossless.
5. `bash .claude/skills/fkit-status/dashboard.sh ai-agents/sprints/backlog.md` reports **no**
   `drift disagreement … brief_sprint=` fact attributable to a non-`Backlog` sprint value.
6. Spot-check 3 briefs whose prose was moved (`0031`, `0044`, `0048`) and confirm the deferral
   history is still readable in the brief, in full.
7. If a vocabulary doc was written, it exists under
   `ai-agents/knowledge-base/conventions/`, is linked from that directory's `README.md`, and the
   owner's approval is recorded in it.

## Notes

- **Depends on:** 0002
- **Blocks:** nothing

- **Sequencing:** not blocked by `0001`, but should land **before or alongside** it — `0001` is what
  moves the prose-valued rows onto the one board where the exact-equality check is live. Running this
  after `0001` means a window where the backlog board reports drift on ~23 rows at once.
- Producer-owned: this is field-vocabulary and board curation, not source code. The one script this
  task may touch is a convention doc, not `dashboard.sh`.
- **Do not invoke the mover skills.** Editing a `## Sprint` value is not a task close.
- No secrets: these files go to git.
