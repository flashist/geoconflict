# Migrate `tasks/done/` and `tasks/cancelled/` to the fkit task-folder convention

## ID
0003

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

The second half of the task-folder migration the owner approved on 2026-08-08. Task 0002 converts
the 38 live backlog briefs and **defines the ID-allocation scheme**; this task applies that same
scheme to the closed boards: **111 files in `ai-agents/tasks/done/`** and **8 in
`ai-agents/tasks/cancelled/`**.

**Why this is separate from 0002, and why it is lower priority.** These are closed tasks. Nothing
will ever open a `plan.md`, `worklog.md`, or `review.md` against them, so the folder model buys no
new capability here — the value is purely consistency: one shape across all three boards, IDs that
are genuinely global, and no second convention for a future agent to trip over. 0002 delivers all
the working benefit; this delivers the tidiness. Shipping them separately keeps a 119-file
low-value change from delaying a 38-file high-value one.

**IDs are global across all three boards.** A cancelled task keeps its ID forever. Allocating from
`backlog/` alone would reissue an ID that still exists in `cancelled/` — so this task must continue
0002's sequence, not restart it.

**Not a lifecycle move.** As with 0002, this is a **within-board structural migration** — every file
stays on the board it is already on. The `/fkit-task-done` and `/fkit-task-cancelled` movers must
**not** be invoked, and no task's status changes as a result of this work.

**Conflict to respect:** this task and 0004 both edit the sprint-plan files. Sequence them.

## What to build

1. **Read the ID-allocation convention** written by task 0002 and continue its sequence — do not
   restart numbering, and do not reuse any ID already assigned to a backlog task.

2. **Convert all 119 files to folders** — `<NNNN>-<kebab-slug>/brief.md` under their existing board.
   Drop the legacy `s3-` / `s4-` / `hf-` filename prefixes as in 0002. Preserve git history
   (`git mv`).

3. **Add the mandatory fields** to each migrated brief:
   - `## ID` — immediately after the H1, matching the folder name.
   - `## Status` — the canonical closed marker from `conventions/task-status-vocabulary.md`:
     `✅ Done` for the `done/` board, `⛔ Cancelled (YYYY-MM-DD) — <reason>` for `cancelled/`.
     **Do not invent a date or a reason.** Recover both from the sprint plans and
     `sprints/cancelled-tasks.md`, which already record them. Where a date or reason genuinely
     cannot be recovered from an existing record, leave the task out and list it in the hand-off
     report — a fabricated close reason is worse than a gap.
   - `## Owner` — one role from `conventions/task-owner-vocabulary.md`. For historical tasks
     `fkit-coder` is the sensible default; use `fkit-producer` for investigations and planning docs.

   **These are historical records — do not rewrite their content, tidy their prose, or "correct"
   their conclusions.** Add the fields; change nothing else.

4. **Update every inbound link** to the 119 migrated briefs across `ai-agents/sprints/` (including
   `done/` and `cancelled-tasks.md`), `ai-agents/knowledge-base/`, and anywhere a repo-wide grep
   finds them. Do **not** change any Status cell — that is task 0004.

## Verification steps

1. `ai-agents/tasks/done/` contains 111 directories and zero loose `.md` files;
   `ai-agents/tasks/cancelled/` contains 8 directories and zero loose `.md` files.
2. Every folder contains a `brief.md`.
3. **No duplicate IDs across all three boards** — extract every folder's `NNNN` prefix from
   `backlog/`, `done/`, and `cancelled/` together, sort, confirm no repeats.
4. **No gaps or restarts** in the ID sequence relative to what 0002 allocated.
5. Folder name and `## ID` agree for all 119 — scripted comparison reports zero mismatches.
6. Every `done/` brief reads `✅ Done`; every `cancelled/` brief carries a date **and** a reason,
   each traceable to an existing record (spot-check 3 against `cancelled-tasks.md`).
7. **No broken links:** repo-wide grep for the 119 old filenames returns zero hits outside `git log`.
8. `git log --follow` on three sampled briefs shows history preserved.
9. `git diff` on the migrated briefs shows **only** added `## ID` / `## Status` / `## Owner` blocks —
   no edits to existing body prose.

## Notes

- **Depends on:** 0002 (defines the ID-allocation scheme and consumes the first block of IDs)
- **Blocks:** 0004

- Largest file-count change in the migration but the lowest risk — these tasks are closed and nothing
  actively reads them.
- The `cancelled/` board is the one that needs care: its briefs need a real date and reason, and
  those live in `sprints/cancelled-tasks.md`, not in the briefs themselves.
- No secrets: these go to git.
