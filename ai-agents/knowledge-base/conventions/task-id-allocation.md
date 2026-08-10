# Task ID allocation

> **Every task carries a permanent four-digit ID. The task-folder name is the authoritative carrier;
> the brief's `## ID` field is the second carrier and must agree with it. IDs are allocated from the
> next free number on disk, and are never reused and never renumbered.**
>
> Written by task 0002 (the `tasks/backlog/` folder migration) and approved by the owner on
> 2026-08-10. Task 0003 follows the same rule when it migrates `done/` and `cancelled/`.

## The two carriers

A task lives in `ai-agents/tasks/<board>/<NNNN>-<slug>/`, and its `brief.md` opens with:

```markdown
# <Title>

## ID
<NNNN>
```

- **The folder name is authoritative.** If the folder and the field ever disagree, the folder is
  right and the field is the bug. Tooling reads the folder name first — see
  [`priority-is-rank-not-identity.md`](priority-is-rank-not-identity.md), which already fixes the
  folder-name prefix as the sole permanent identity carrier.
- **`## ID` is mandatory and must match**, zero-padded to four digits, with no prefix and no link.
  It exists so a brief read on its own still knows what it is.

## Allocating a new ID

**Take the next free number: one above the highest `NNNN` on disk, across all three boards.**

```bash
# The next free ID — derive it, never hardcode it.
ls -d ai-agents/tasks/*/[0-9][0-9][0-9][0-9]-*/ 2>/dev/null \
  | sed -E 's#.*/([0-9]{4})-.*#\1#' | sort -n | tail -1
```

All three boards — `backlog/`, `done/`, `cancelled/` — share **one** number space. A closed or
cancelled task still holds its ID forever, so the scan must cover every board or the next allocation
will collide with a task that is merely no longer in the backlog.

**Allocate at creation.** `fkit-task-brief` assigns the ID when it writes the brief; there is no
"number it later" state.

### Allocating a batch (a migration)

When several tasks are numbered in one pass, order them **oldest-first by the date the brief file was
first committed to git**, tie-broken by filename:

```bash
git log --diff-filter=A --format=%ad --date=short -- <path> | tail -1
```

so the ID sequence reads as a rough chronology of when the work was scoped.

Git's add-date is used in preference to any date written *inside* the brief. In-file dates are
unreliable as creation evidence: across the 38 briefs task 0002 migrated, 21 carried no date at all,
and 3 carried a date that **postdated** the file's creation because the line was a later revision
note. The rule is only a tie-breaking convenience for reading the board — it confers no meaning, and
nothing may depend on ID order.

> ⚠️ **The add-date is read without `--follow`** — the date the file first appeared **under its
> current name**. A brief that was renamed reports the rename date, not the date its content was
> first written. This is a deliberate simplification, not an oversight: it keeps the rule a single
> command whose output cannot depend on git's rename-similarity heuristic. Because ID order carries
> no meaning, a brief landing a few places from its true chronological spot costs nothing.

## Never reused, never renumbered

- **An ID is assigned once and belongs to that task forever.** It survives every board move, every
  rename of the slug, and the task's completion or cancellation.
- **A cancelled task's ID is not recycled.** The number is spent. Skipping it is correct; reusing it
  makes every historical reference ambiguous.
- **Do not renumber to close a gap.** Gaps are normal and harmless. Renumbering silently breaks every
  inbound reference — sprint plans, briefs, reports, review ledgers, wiki pages, and git history all
  cite tasks by ID.
- **The slug may be edited; the number may not.** Renaming `0031-mobile-webgl-rendering` to
  `0031-mobile-webgl-renderer` is a normal edit. Changing the `0031` is not.

## The slug

Lowercase kebab-case, derived from the task's subject. It is a human-readable label only — never an
identifier.

**Legacy sprint prefixes are dropped** (`s4-`, `s4c-`, `s5-`, `s6-`, `sec<NN>-`, `8d-b-task-`). The
sprint now lives in the brief's `## Sprint` field, and the ID replaces the prefix as identity.

> ⚠️ **Dropping a prefix can lose a real grouping.** The `sec10`–`sec13` security series was cited as
> a group by its filenames; after migration only each brief's H1 and body text carry that linkage.
> Where a prefix meant something, make sure the meaning survives in the brief's own text before
> dropping it.

## Where this is enforced

- **`fkit-task-brief`** — allocates the ID at creation and writes both carriers.
- **`fkit-status` / `dashboard.sh`** — keys tasks by the folder-name ID prefix.
- **A scripted duplicate-ID check** — extract the `NNNN` prefix from every task folder on all three
  boards; `sort | uniq -d` must be empty:

  ```bash
  ls -d ai-agents/tasks/*/[0-9][0-9][0-9][0-9]-*/ \
    | sed -E 's#.*/([0-9]{4})-.*#\1#' | sort | uniq -d
  ```

- **A scripted folder-vs-field agreement check** — every `brief.md`'s `## ID` value must equal its
  folder's prefix.

## Related

- [`priority-is-rank-not-identity.md`](priority-is-rank-not-identity.md) — the sibling rule: the
  board's Priority cell is mutable **rank** (`P<n>`), and identity is this document's folder-name ID.
- [`task-status-vocabulary.md`](task-status-vocabulary.md) and
  [`task-owner-vocabulary.md`](task-owner-vocabulary.md) — the other two mandatory brief fields that
  sit alongside `## ID`.
