# Wiki vault follow-up: legacy task filenames left stale by the folder migrations

## ID
0052

## Sprint
Backlog

## Priority
Unscheduled

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-wiki

## ✅ Completion record — verified 2026-09-11 by a spawned `fkit-producer`

🚨 **HOW THIS WAS FOUND DONE — the interesting fact for a future reader: NOBODY RAN THIS TASK.** The
work was **completed incidentally** by `fkit-wiki` lint and ingest runs that were rewriting these pages
for other reasons. ⛔ **Do not read this close as someone deliberately executing the brief above** —
they did not. The brief was never picked up, planned, or worked.

**Provenance of the finding.** A `fkit-wiki` lint on **2026-09-11** checked this task incidentally and
found **zero legacy pointers left in the `wiki/` tree**. ⚠️ **That lint explicitly DECLINED to assert
completion** — it had checked only `wiki/` against this brief's stated pattern and none of the other
acceptance criteria. The owner then ruled, live on 2026-09-11, that **the producer verify the full
acceptance criteria and close it only if genuinely met**. This record is that verification.

**Where the work actually landed** (traced with `git log -S` against the vault pages):

| When | Run | What it swept |
|---|---|---|
| 2026-08-25 | lint — *"task-path sweep for `0003`"* (`log.md:997`) | `0003`'s 119 `done/`+`cancelled/` renames across 89 pages. This is what trimmed this brief's scope on 2026-08-26. |
| 2026-08-30 / 2026-08-31 | ingest (sync) + lint runs, commit `b897811` *"Sprint push and wiki update"* | The bulk of the `0002`-era backlog names — `s4-player-profile-store-impl`, `s4-investigate-null-id-errors`, `mobile-webgl-rendering.md` and the rest — left the vault here. **Not attributed to `0052` anywhere.** |
| 2026-09-02 | lint (`log.md:1316`, residue list at `:1352`) | The last two, both bare *stems* inside prose about what a code comment says: `wiki/tasks/disable-compact-public-maps.md` and `wiki/tasks/archive-endpoint-failures.md`. That entry recorded **"measured today, 0 occurrences remain"**. |

### Criteria, one by one — what was verified and by what means

| # | Criterion | Verdict | Means |
|---|---|---|---|
| — | **Prerequisite: `0003` has landed** | ✅ met | `ai-agents/tasks/done/0003-migrate-done-cancelled-tasks-to-folders/` exists on disk. |
| 1 | `log.md` unedited (or append-only) | ✅ met, **verified stronger than asked** | Not a working-tree `git diff` — there was no run to diff. Instead the **entire commit history** of `ai-agents/wiki-vault/log.md` was walked (`git show --unified=0` per commit, counting removed lines): **zero removed lines in any commit, ever.** The file has only ever been appended to. |
| 2 | Zero stale legacy task filenames under `wiki/` | ✅ met | Two independent greps: (a) the 12 named legacy stems from the table below, **as stems**, not just `.md` filenames — 0 hits as task pointers; (b) a **structural** sweep for any `ai-agents/tasks/(backlog\|done\|cancelled)/<name>` **not** matching the `NNNN-` folder form — **0 hits** across the whole vault excluding `log.md`. |
| 3 | Every path resolves | ✅ met | All **142** distinct `ai-agents/tasks/…` paths cited under `wiki/` were extracted and existence-tested on disk: **all 142 resolve.** No dangling path. |
| 4 | Nothing missed outside `wiki/` and `log.md` | ✅ met | The same greps over `schema.md`, `index.md` and `sources/`: **no matches.** Separately, seven surviving `s3-`/`s4-`-style names were checked and are **not** stale task pointers — they are `ai-agents/knowledge-base/…` **report and ADR filenames that all exist on disk** (e.g. `s4-licensing-asset-audit-findings.md`, `adr-104-match-archiving-disabled-until-s3-citizen-gated.md`), plus two deliberate historical mentions in `wiki/tasks/disable-compact-public-maps.md` and `wiki/tasks/archive-endpoint-failures.md` that explicitly say the code comment names the **folder**, *not* the pre-`0002` flat filename. Those are correct prose, not residue. |
| 5 | `/fkit-wiki-lint` clean on broken links / back-links | ✅ met — ⚠️ **read from the record, not re-run** | The **2026-09-11 lint entry** (`log.md:3176`) reports: 184 pages, **zero** broken `[[wikilinks]]`, **zero** orphans, **zero** one-way links before and after, `index.md` ↔ disk exact in both directions. ⚠️ **The producer did NOT re-run the lint** — lint is a vault **write** and belongs to `fkit-wiki` alone. This criterion rests on that recorded run. |
| 6 | `git diff --stat` touches only the vault | ⚪ **moot as written, met in substance** | ⛔ **Stated honestly: this criterion cannot be checked in its literal form, because no `0052` run exists to diff.** Its substance — that this work must not spill into `knowledge-base/` or source, which is `0051`'s side — **is** satisfied: the vault fixes landed inside `fkit-wiki` lint/ingest commits, and **`0051` is still open and untouched in `ai-agents/tasks/backlog/`**. No knowledge-base or source change was ever made under this task's name, because the task was never run. |
| 7 | Prose still reads correctly on the formerly-stale pages | ✅ met | All 9 pages from the table below were re-read at their pointer sites. The two flagged as easy to break are both clean: `wiki/decisions/sprint-4.md:209` — the long "Follow-up sources" comma-run — is **entirely `NNNN-slug/brief.md` folder paths**, and `wiki/decisions/profile-storage-strategy.md:8,17` — the sentence that mixed a backlog and a done name — now reads `…/done/0013-player-profile-store-impl/brief.md` and `…/done/0185-profile-05-backend-db-api/brief.md`. |

⚠️ **Criterion 6 is the one soft spot and is recorded as such rather than papered over.** Everything
else was verified against the working tree on 2026-09-11.

### 📌 Left undone on purpose — routed, not dropped

Step 7 of *What to build* — *"consider appending one `log.md` entry recording that this reconciliation
happened"* — was **optional** ("consider") and is **NOT done**. ⛔ **The producer may not write
`ai-agents/wiki-vault/` — it is `fkit-wiki`'s exclusive surface.** If the owner wants the record made
visible inside the vault, it is a **one-line append** to `ai-agents/wiki-vault/log.md`, routed to
`fkit-wiki`. **Nothing else in the vault needs changing** — the vault is already correct; that is
precisely what this close established.

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

**Scope trimmed 2026-08-26 (owner-ruled): `0003`'s 119 done/cancelled renames were already swept in
the vault by `fkit-wiki` on 2026-08-25** (89 pages; `log.md` entry `2026-08-25 — lint (task-path
sweep for 0003)`), so this task now covers **only the `0002`-era backlog names** — the wiki role's
skipped list: `s4-player-profile-store-impl.md` at `wiki/decisions/profile-storage-strategy.md:8,17`,
`s4-investigate-null-id-errors.md` at `wiki/decisions/sprint-4.md:21`, `mobile-webgl-rendering.md` at
`wiki/decisions/sprint-backlog.md:96`, plus the earlier-deferred `licensing-compliance` /
`announcements` paths. The table above is a 2026-08-10 snapshot; re-derive at start (step 2).

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
