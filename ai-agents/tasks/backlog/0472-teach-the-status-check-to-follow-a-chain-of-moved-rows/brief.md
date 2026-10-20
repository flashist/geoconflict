# Teach the status check to follow a chain of `➡️ Moved` rows, so a task moved twice is not reported as a mismatch

## ID
0472

> ℹ️ **ID allocation, checked 2026-10-20 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names, base-10 arithmetic) was `0471`. `0472`: no task folder and no reference in `ai-agents/tasks/`,
> `ai-agents/sprints/` or `.claude/`.

## Sprint
Backlog

> 📌 **Filed on an OWNER RULING of 2026-10-20**, live `AskUserQuestion` in a Claude Code session, relayed by it to a
> spawned `fkit-producer` (no owner channel); ⛔ not producer precedent. Question: *"The leftover 0385 warning: the check
> script can't follow a task that moved twice (Backlog → Sprint 8 → Sprint 9). What do we do?"* Selected, verbatim:
> **"Task: fix the script (Recommended)"**. Option text: *"File a small Backlog task so the check follows a chain of
> moves. It fixes this one and every future double move. The warning stays until that task is done."*

## Priority
Unscheduled

(Backlog board, unranked by design. ⚠️ The board row is an **append**, not a merit placement; see `## Notes`.)

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**In plain terms.** The status script checks that each board row agrees with the task's own brief. When a task was
moved from the Backlog board to a sprint, and then that sprint closed and moved it on to the next sprint, the script
compares the **first** move's target with where the task is **now** and reports a false mismatch. The history row
is correct and must stay as it is (closed rows are never edited — ADR-035, `/fkit-sprint-done` step 4), so the fix
belongs in the script: it should follow the chain of moves to the task's current board.

**The live example — `0385`.** On `ai-agents/sprints/backlog.md` the row reads `➡️ Moved to [Sprint 8](done/plan-sprint-8.md)
— priority 55` (true on 2026-10-15). Sprint 8 then closed, and its row for `0385` reads `➡️ Moved to [Sprint 9](../plan-sprint-9.md)
— priority 1`. The brief's `## Sprint` reads `Sprint 9`, which is correct. The script reports, on every Backlog-board
run: `drift disagreement 0385 … brief_sprint="Sprint 9" moved_target="Sprint 8"`. It found no mismatch on Sprint 9
or on the closed Sprint 8 board (re-checked 2026-10-20). **`0385`'s history row is left untouched**, by owner ruling —
the warning stays until this task ships.

**Where the logic lives.** `.claude/skills/fkit-status/dashboard.sh`, drift rule 2 (the `key = moved` branch: it
compares `moved_target`, taken from the row's `Moved to [<target>]`, with the brief's `## Sprint` first line, and
fires `drift disagreement` when they differ).

**⚠️ This script is an fkit-framework file, not project code — so the fix may belong upstream. Owner's call.**
- The project copy is installed from the fkit install share (`~/.local/share/fkit/claude/skills/fkit-status/dashboard.sh`).
  `/fkit-heal` checks fkit files against the share's structure-spec and hash manifest.
- The two copies **differ**: the share is newer (2090 lines vs 1773 here; it includes later framework changes). As of
  2026-10-20 **neither** follows a chain of moves — the share's rule 2 is the same comparison.
- So the owner chooses: (a) fix it upstream in fkit and pull it here with a re-install / `/fkit-heal`, or (b) fix the
  project copy only. A project-only edit would make the file read as owner-edited to `/fkit-heal`, and a later update
  from the share could overwrite or conflict with it. The coder's plan must state which route was chosen before
  writing code.

**Related, not dependencies — link, don't merge:**
- `0001` — the second backlog file, `ai-agents/sprints/sprint-backlog.md`, already tracked there (consolidate onto
  `backlog.md`). Not part of this task.
- `0385` — the live example; it closes on its own schedule, whatever happens here.

## What to build

1. **Follow the chain in drift rule 2.** When a `➡️ Moved` row's target board itself holds a `➡️ Moved` row for the
   same task, follow it, hop by hop, to the board where the task's row is not `➡️ Moved`. Compare **that** board's
   identity with the brief's `## Sprint`. Board targets can be live boards (`sprints/*.md`) or archived ones
   (`sprints/done/*.md`), and hrefs are relative to the file holding the row — resolve them the way the script
   already resolves board identity.
2. **Stay honest when the chain breaks.** If a hop's board is missing, has no row for the task, or the chain loops,
   do **not** pass silently and do **not** fall back to a clean result: report a distinct, named drift line (e.g. a
   broken chain) that names the hop where it broke. A cap on hop count is fine; hitting it is reported the same way.
3. **Do not widen what is reported elsewhere.** A real mismatch (the end of the chain differs from the brief) is still
   `drift disagreement`, and should name the final target so the reader sees where the chain ended. Single moves
   behave exactly as today.
4. **Keep the script's read limits.** It reads board files and briefs only; no writes, no network, no git. If
   following the chain needs reads the script's header does not already allow, say so in the plan — it is a scope
   change for the owner to approve.
5. **Tests.** Add fixture-based test cases, at least:
   - **`0385`'s shape:** Backlog board row `Moved to Sprint 8` → archived Sprint 8 row `Moved to Sprint 9` → open row
     on Sprint 9; brief `## Sprint: Sprint 9` → **no drift**.
   - the same chain with the brief saying `Sprint 8` → `drift disagreement`, naming Sprint 9 as the end of the chain;
   - a single move (today's case), both agreeing and disagreeing → unchanged results;
   - a broken chain (target board has no row for the task) and a loop → the named broken-chain line, never a pass.
   Put the tests where the chosen route keeps them (upstream fkit tests, or this repo — the plan says which, and how
   they run).

## Verification steps

1. On this repo's real boards, `bash .claude/skills/fkit-status/dashboard.sh ai-agents/sprints/backlog.md` no longer
   reports `0385` (and reports no new drift), with `0385`'s Backlog-board row byte-for-byte unchanged
   (`git diff -- ai-agents/sprints/backlog.md` shows nothing for that row).
2. The Sprint 9 board and the closed Sprint 8 board render with the same drift lines as before the change.
3. The new tests exist and pass, and fail if chain-following is removed (show one red run).
4. The broken-chain and loop cases produce a named drift line, never a clean result.
5. The worklog says which route was taken (upstream fkit vs project copy) and, for the project-copy route, what
   `/fkit-heal` reports for the file afterwards.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- ⚠️ **Priority is append rank, NOT a merit ranking — flagged for owner confirmation.** The Backlog board is unranked;
  this row was appended at the bottom. **On merit this belongs directly below `0001`**, because both fix how the
  boards are read by the status check, and `0001` is the older, owner-chosen route for its own blind spot. It is small
  and low-risk; it only removes a false warning.
- **Owner decision needed at the plan gate:** upstream fkit fix vs project-copy fix (see Context).
- Do not edit any `✅ Done`, `⛔ Cancelled` or `➡️ Moved` row to make the warning go away — that is the exact thing
  this task exists to avoid.
