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

## Context

There are now **two** boards for unsprinted work, and the older one has a name that actively
misleads the tooling.

- `ai-agents/sprints/sprint-backlog.md` — the project's long-standing board, ~23 entries of defined
  but unsprinted work (Tasks 6/7/8b/8c/9/9a, the sec10–sec13 security items, the monitoring bot
  phases, the 152-ФЗ compliance item, the bot/nuke investigations, and two parked items).
- `ai-agents/sprints/backlog.md` — created 2026-08-08 during project initiation, because the
  `fkit-task-brief` skill files unsprinted briefs there by convention. Currently holds only the four
  migration tasks.

**The naming bug — this is the real reason to do this task.** `/fkit-status` finds the active sprint
by globbing `sprint-*.md`. `sprint-backlog.md` matches that glob. A board of explicitly *unscheduled*
work is therefore eligible to be picked up and reported as the **active sprint**. The filename
`backlog.md` is deliberately outside the glob; `sprint-backlog.md` is deliberately inside it. That is
exactly the failure mode the convention warns about, and it exists here today.

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

2. **Normalise every Status cell to the canonical vocabulary.** The current board uses
   `⬜ No sprint` and `⏸ Parked`, neither of which exists in
   `conventions/task-status-vocabulary.md`. Everything unsprinted becomes `🔲 Backlog`.
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
3. Every Status cell in `backlog.md` is a value present in
   `conventions/task-status-vocabulary.md`; a grep for `⬜`, `⏸`, and `No sprint` across
   `ai-agents/sprints/` returns zero hits.
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
