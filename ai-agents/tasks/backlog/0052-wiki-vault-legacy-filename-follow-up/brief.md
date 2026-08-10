# Wiki vault follow-up: legacy task filenames left stale by the folder migrations

## ID
0052

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-wiki

## Context

`0002` migrated 38 backlog briefs from flat `.md` files into ID-prefixed folders, and **deliberately
excluded `ai-agents/wiki-vault/`** — plan decision **D3**, ratified by the owner at `0002`'s plan
gate. Two reasons: the vault is `fkit-wiki`'s exclusive write surface (no other role may write it),
and `log.md` is an append-only record that must not be rewritten (see the hard constraint below).

That exclusion left real stale pointers. **9 wiki pages carry 12 occurrences** of legacy filenames
that now name nothing on disk. Re-verified against the working tree on 2026-08-10:

| # | Page (under `ai-agents/wiki-vault/`) | Occurrences | Legacy name(s) → now |
|---|---|---|---|
| 1 | `wiki/decisions/licensing-compliance.md` | 1 | `s4-licensing-asset-audit.md` → `0025` |
| 2 | `wiki/decisions/personal-data-152fz-compliance.md` | 1 | `compliance-152fz-notification-consent.md` → `0048` |
| 3 | `wiki/decisions/profile-storage-strategy.md` | 2 | `s4-player-profile-store-impl.md` → `0013` (twice) |
| 4 | `wiki/decisions/sprint-4.md` | 3 | `s4-map-population-army-labels.md` → `0041`; `s4-starting-gold-public-modifier.md` → `0042`; `s4-investigate-null-id-errors.md` → `0032` |
| 5 | `wiki/decisions/sprint-backlog.md` | 1 | `mobile-webgl-rendering.md` → `0031` |
| 6 | `wiki/features/announcements.md` | 1 | `8d-b-task-personal-inbox.md` → `0012` |
| 7 | `wiki/tasks/archive-endpoint-failures.md` | 1 | `s4-archive-s3-backed-citizen-gated.md` → `0030` |
| 8 | `wiki/tasks/citizenship-card-guest-cta-no-sdk.md` | 1 | `degraded-mode-full-ux-treatment.md` → `0049` |
| 9 | `wiki/tasks/disable-compact-public-maps.md` | 1 | `s5-fix-compact-map-shore-generation.md` → `0026` |

All 12 are written as **paths or filenames**, e.g.
`` `ai-agents/tasks/backlog/s4-licensing-asset-audit.md` `` — so a reader following one gets nothing.

### ⚠️ HARD CONSTRAINT — `ai-agents/wiki-vault/log.md` is LEFT UNEDITED

`log.md` holds **60 further occurrences** of these same legacy filenames (counted this turn). **None
of them may be touched.**

`log.md` is an **append-only record of what happened on a given day**. An entry saying a page was
ingested from `s4-citizenship-paid.md` on some date is a statement about that date, and on that date
that path was correct. Rewriting it to `0018-citizenship-paid` asserts a path that **did not exist
then** — it does not update the record, it **falsifies** it.

This was ruled at `0002`'s plan gate as part of D3. **It is a hard constraint, not a preference, and
not a judgement call for whoever runs this task.** It holds whatever the occurrence count turns out
to be on the day.

If the log's staleness ever needs addressing, the sanctioned shape is a **new appended entry**
recording that the migration happened and how to map old names to new — never an edit to a past one.

### Sequencing — SETTLED: this runs after `0003`

**Owner ruling, 2026-08-10 (`AskUserQuestion`): `0052` depends on `0003`.** One pass covering both
migrations, not two. `0003` migrates the `done/` and `cancelled/` briefs, and the vault references
those heavily. The overlap that decided it is not hypothetical:

- `wiki/decisions/sprint-4.md:17` carries a single "Follow-up sources" line citing **roughly 40**
  `ai-agents/tasks/done/…` and `ai-agents/tasks/cancelled/…` paths — and that same line already
  contains one of the 12 backlog occurrences above (`s4-investigate-null-id-errors.md`). Fixing the
  backlog occurrence first means editing that one line again after `0003`.
- `wiki/decisions/profile-storage-strategy.md:17` mixes a backlog name and a done name in one
  sentence: `` `…/backlog/s4-player-profile-store-impl.md` (Part B), `…/done/s4-profile-05-backend-db-api.md` ``.
- Most `wiki/tasks/*.md` pages carry a `**Source:**` line on line 3 pointing at a `done/` brief.
  Those are **correct today** and go stale the moment `0003` runs.

**Scope consequence: this task covers BOTH rename maps** — `0002`'s 38 backlog briefs *and* `0003`'s
`done/`+`cancelled/` briefs — in a single pass. The 12 occurrences tabled above are therefore the
*lower bound* on the working set, not the whole of it. Re-derive it at start (step 2).

## What to build

1. **Confirm `0003` has landed** before starting. The ruling above makes it a hard prerequisite; the
   scope covers both rename maps in one pass.

2. **Re-derive the occurrence list at start.** The table above is a snapshot of `0002`'s residue
   only; rebuild it from **both** rename maps rather than working from this brief's table.

3. **Rewrite the stale pointers** to the current folder path — `ai-agents/tasks/<board>/<NNNN>-<slug>/brief.md`.
   Keep whatever surrounding prose says; only the path changes.

4. **`log.md` is not in scope. Do not open it for editing.** (See the hard constraint.)

5. **Watch for the same bare-identity and elision grammar `0051` deals with.** `0002`'s
   full-filename matching missed bare stems; the vault may carry them too. Where a list uses the
   elided `-suffix` form, **hand-edit the whole list — never pattern-substitute.**

6. **Re-check `index.md` and any back-links** after the rewrites, per the vault's own `schema.md`
   conventions. A path change that breaks a back-link is a regression, not a fix.

7. **Consider appending one `log.md` entry** recording that this reconciliation happened — an
   *append*, which is exactly what the log is for, and the sanctioned way to make the migration
   visible in the record without touching a past entry.

## Verification steps

1. **`git diff` shows zero changes to `ai-agents/wiki-vault/log.md`** — or, if step 7 was done, shows
   **only appended lines at the end** and no modification to any existing line. This is the single
   most important check in this brief; run it and paste the output.
2. **Zero stale legacy filenames remain under `ai-agents/wiki-vault/wiki/`.** For every name in the
   in-scope rename map(s), a search across `wiki/` returns no match. Paste the (empty) output.
3. **Every rewritten path resolves to a file that exists.** For each new
   `ai-agents/tasks/<board>/<NNNN>-<slug>/brief.md` introduced, the file is present on disk. No
   dangling path.
4. **No occurrence outside `wiki/` and `log.md` was missed** — check `schema.md`, `index.md`, and
   `sources/` for the same names, and report what was found there and what was done about it.
5. **`/fkit-wiki-lint` runs clean** on broken links and back-links, or every remaining finding is
   listed with a reason it was left.
6. **`git diff --stat` touches only files under `ai-agents/wiki-vault/`** — nothing under
   `ai-agents/tasks/`, nothing in `knowledge-base/`, no source file. `0051` owns the knowledge-base
   side; the two tasks must not overlap.
7. **Read each of the 9 edited pages and confirm the surrounding prose still reads correctly** —
   particularly `wiki/decisions/sprint-4.md:17`, where a path sits inside a long comma-run and a
   sloppy edit is easy to miss.

## Notes

- **Depends on:** 0003
- **Blocks:** nothing

- **The `0003` dependency is an owner ruling, decided on evidence — not an accident of drafting.**
  Ruled by the owner on **2026-08-10** via `AskUserQuestion`, accepting the producer's recommendation
  to make **one pass over both migrations** rather than two. The evidence accepted:
  `wiki/decisions/sprint-4.md:17` cites ~40 `done/`+`cancelled/` paths on a single line *alongside*
  one of the 12 backlog occurrences, so fixing it before `0003` means editing that line twice;
  `wiki/decisions/profile-storage-strategy.md:17` mixes a backlog name and a done name in one
  sentence; and most `wiki/tasks/*.md` `**Source:**` lines point at `done/` briefs that go stale the
  moment `0003` runs. This brief was drafted with `Depends on: nothing` so the question would reach
  the owner unsettled; it was answered, and the line now records the answer.
- **`fkit-wiki` is the exclusive write gateway for `ai-agents/wiki-vault/` — no other role may do
  this work.** Reads are decentralized (`/fkit-query`); writes are not.
- Scope boundary with `0051`: `0051` fixes the **knowledge-base** side and is explicitly forbidden to
  touch the vault. This task is the vault side and is explicitly forbidden to touch the
  knowledge-base.
- No secrets: the vault goes to git.
