# Migrate `tasks/backlog/` to the fkit task-folder convention

## ID
0002

## Sprint
Backlog

## Priority
Unscheduled

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

This project's task briefs predate fkit's task-folder model. Today `ai-agents/tasks/backlog/` holds
**38 flat `.md` files** with no IDs and a bespoke section structure (`## Sprint`, `## Priority`,
`## Experiments`, `## Scope`, `## Context`, …). The current fkit scaffold expects **one folder per
task**:

```
ai-agents/tasks/<board>/<NNNN>-<slug>/brief.md
```

with a permanent four-digit global ID carried in **both** the folder name and a `## ID` field, plus
mandatory `## Status` and `## Owner` fields.

The owner approved this migration on 2026-08-08 during project initiation.

**Why it matters.** The folder model is what unlocks per-task `plan.md`, `worklog.md`, and the
two-party `review.md` ledger — the loop-prevention memory that stops reviewers re-litigating settled
tradeoffs. It is also what `dashboard.sh` and the `/fkit-task-done` / `/fkit-task-cancelled` movers
parse. While briefs stay flat and ID-less, none of that machinery can address a task.

**This task defines the ID-allocation scheme** that task 0003 then follows. IDs `0001`–`0009` are
already taken by briefs created during initiation and the 2026-08-09 open-questions interview, so
allocation starts at **`0010`**. ⚠️ Do not hardcode that number — derive the maximum from the folder
names on disk across all three boards at the time you run, since more briefs may have been written
since this one.

**Not a lifecycle move.** The standing rule *"task files move between boards only via the mover
skills"* governs **board transitions** (`backlog/` → `done/`). This is a **within-board structural
migration** — every file stays on the board it is already on. The movers do not apply and must not be
invoked. Nothing here changes any task's status.

**Conflict to respect:** tasks 0003 and 0004 also edit the sprint-plan files. Sequence them; do not
run them concurrently against the same plans.

## What to build

1. **Define and document the ID-allocation scheme.** Write it into
   `ai-agents/knowledge-base/conventions/` (or extend an existing convention doc) so task 0003 and
   every future migration follow the same rule. It must state: allocation order, that IDs are never
   reused or renumbered, and that the folder name is authoritative with `## ID` as the second carrier.
   Recommended order: oldest-first by the date evidence already in each brief, falling back to
   filename sort where no date is present — so the sequence reads chronologically.

2. **Allocate IDs `0005`+ to the 38 backlog briefs** in that order.

3. **Convert each brief to a folder.** `<NNNN>-<kebab-slug>/brief.md`. Derive the slug from the
   existing filename, dropping the legacy `s4-` / `s5-` / `sec12-` sprint prefixes — the sprint now
   lives in the `## Sprint` field, and the ID replaces the prefix as identity. Preserve the file's
   git history (`git mv`).

4. **Add the three mandatory fields** to every migrated brief, without disturbing existing content:
   - `## ID` — immediately after the H1, matching the folder name.
   - `## Status` — `🔲 Backlog` for all 38 (they are all on the backlog board). Use the canonical
     marker from `conventions/task-status-vocabulary.md`; do **not** carry over legacy markers.
   - `## Owner` — immediately after `## Status`, one role from
     `conventions/task-owner-vocabulary.md`. Most are `fkit-coder`; investigation briefs are
     `fkit-producer` or `fkit-architect`. Where a brief's owner is genuinely ambiguous, list it in
     the hand-off report rather than guessing.

   Leave the bespoke extra sections (`## Experiments`, `## Scope`, `## Locked Decisions`) exactly as
   they are — they carry real project meaning and are not scaffold drift.

5. **Update every inbound link** to the 38 migrated briefs across
   `ai-agents/sprints/plan-index.md`, `plan-sprint-4.md`, `plan-sprint-4c.md`, `plan-sprint-5.md`,
   `plan-sprint-6.md`, `sprint-backlog.md`, `ai-agents/sprints/done/`, and anywhere else a repo-wide
   grep finds them (knowledge-base reports and findings docs cite brief filenames too). Do **not**
   change any Status cell — that is task 0004's job.

6. **Do not touch `done/` or `cancelled/`** — that is task 0003.

## Verification steps

1. `ls ai-agents/tasks/backlog/` returns **zero** loose `.md` files — only directories: the 38
   migrated briefs plus the already-foldered `0001`–`0009`.
2. Every folder contains a `brief.md`; no folder is missing one.
3. **No duplicate IDs:** extracting the `NNNN` prefix from every folder across all three boards and
   sorting yields no repeats.
4. **Folder name and `## ID` agree** for all 38 — a scripted comparison reports zero mismatches.
5. Every migrated brief has a `## Status` of exactly `🔲 Backlog` and an `## Owner` drawn from the
   seven valid roles.
6. **No broken links:** a repo-wide grep for the 38 old filenames (`grep -rn` over `ai-agents/` and
   the repo root) returns zero hits outside `git log`.
7. Every rewritten link resolves — a link-checker or scripted `test -f` over each markdown target in
   the sprint plans passes.
8. `git log --follow` on three sampled migrated briefs shows history preserved across the move.
9. The ID-allocation convention doc exists and states allocation order, the never-reuse rule, and the
   folder-name-is-authoritative rule.

## Notes

- **Depends on:** nothing
- **Blocks:** 0003, 0004

- The four initiation briefs (`0001`–`0004`) are already in folder form and need no migration; they
  are the reference example for the target shape.
- Expect the bulk of this to be scriptable, but the `## Owner` assignment needs judgment per brief —
  do not automate that field.
- No secrets: these briefs go to git. Several reference infrastructure; do not introduce endpoints or
  credentials while editing.
