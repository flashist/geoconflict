# Remove the GameAnalytics game ID from tracked task files

## ID
0459

> ℹ️ **ID allocation, checked 2026-10-14 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run: `0457`; `0458` allocated first in the same run, sequentially. `0459`: no task folder, no `## ID`
> hit, no `tasks/*/0459*` path in any branch's history, no other hit under `ai-agents/`.

## Sprint
Sprint 8

> 📌 **OWNER RULING, 2026-10-14**, live `AskUserQuestion` in the `fkit lead` session (driver of `fkit-sprint-ship-loop`),
> relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ **not producer
> precedent.** Question: *"The numeric GameAnalytics game ID is written in 3 task files (backlog.md, 0212 brief, 0439
> brief) of a public repo, against the 'no IDs in files' rule. File a small task to remove it?"* Verbatim selection:
> **"File in Sprint 8"**.

## Priority
51

> ⚠️ **Priority 51 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit its rank barely matters** — it blocks nothing, and the value is already public (public repository, and
> git history keeps the old copies whatever this task does), so a day earlier or later changes little. Appended after
> the [Sprint 8](../../../sprints/done/plan-sprint-8.md) board's highest (50, `0456`), never inserted (ADR-035) — a position,
> not merit.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-producer — three lines of Markdown in task files and a board; no script or source change is needed.

## Context

The project rule is **no keys, secrets or dashboard/game IDs in any artifact** (every GameAnalytics brief repeats it,
e.g. [`0230`](../../backlog/0230-investigate-3-4-sep-gameanalytics-per-user-event-spike/brief.md) and
[`0456`](../0456-investigate-and-plan-the-fix-gameanalytics-500-events-per-user-per-day-limit-exceeded-again/brief.md)).
`0456`'s reviewer found that the **numeric GameAnalytics game ID** (6 digits) is nonetheless written in tracked files —
recorded in `0456`'s [findings report](../../../knowledge-base/reports/2026-10-14-0456-gameanalytics-per-user-event-limit-findings.md)
§13. **The repository is public** (`gh repo view` → `PUBLIC`, checked 2026-10-14), so the value is already published.

**Where it is — re-checked 2026-10-14 by the producer, value read into a shell variable and never printed:**

| File | Line | What the line is |
|---|---|---|
| `ai-agents/sprints/backlog.md` | 61 | the [`0212`](../../backlog/0212-investigate-tutorial-abandonment-by-platform-segment/brief.md) row's description |
| `ai-agents/tasks/backlog/0212-investigate-tutorial-abandonment-by-platform-segment/brief.md` | 58 | a *Source:* line naming the GameAnalytics game |
| `ai-agents/tasks/backlog/0439-verify-0437-live-exit-confirm-popup-inside-yandex-games/brief.md` | 9 | an ID-allocation note that mentions the number |

- One occurrence per file, three in all (the reviewer's "several lines" in `backlog.md` did not hold: one line).
- Nothing else in the working tree outside `node_modules/` and `.git/` contains it; `ai-agents/wiki-vault/` has none.
- **Git history:** 2 commits add it (`git log -S`). Old copies stay in history after this task.

## What to build

1. **Before editing, grep the whole tracked tree once more** (`git grep -F`, the value read from one of the three
   lines into a shell variable — ⛔ **never type, echo, print or paste the value**, in a command, an output, a worklog
   or a report). Handle every hit, not only the three above.
2. **Replace the number outright** with a neutral wording — e.g. *"the game's GameAnalytics dashboard"*, or for
   `0439`'s note *"the GameAnalytics game number (removed by `0459`)"*. Keep the rest of each line as it is.
   ⛔ **Do NOT strike it through** (`~~…~~`): the project's usual strike-don't-delete habit would keep the value in the
   file. This is the one place where the old text must go.
3. **Line numbers may have moved** by the time this runs — find each occurrence by the grep, not by line number.
4. **Git history is out of scope.** Rewriting history would remove the old copies but is a large, risky act on a
   shared public repository; it is done only if the owner asks for it separately.

## Verification steps

1. `git grep -F` with the value (read into a shell variable as above, never shown) returns **nothing** in the tracked
   tree, and a plain `grep -rF` over the working tree (excluding `node_modules/` and `.git/`) returns nothing.
2. The three edited lines still read correctly — only the number changed; `backlog.md`'s `0212` row still has its
   status, priority and brief link unchanged.
3. The value appears in **no** file this task wrote (worklog, report, this brief).
4. The worklog says plainly that **git history still holds the old copies** (not rewritten).

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **One brief:** three one-line edits that are verified together by one grep; nothing ships separately.
- **Out of scope:** the GameAnalytics **game key and secret key** are in the client source by design
  (`src/client/flashist/FlashistFacade.ts`, cited by location only in `0456`) — client keys ship in the bundle; that is
  not this task.
- **Related:** `0456` (where it was found), `0212`, `0439`, [`0458`](../../backlog/0458-monitor-gameanalytics-for-event-volume-spikes/brief.md)
  (future GameAnalytics reads must not write the value either).
- **Do not invoke the mover skills.** Producer-only since ADR-033.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — this brief names files and lines, never the value.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
