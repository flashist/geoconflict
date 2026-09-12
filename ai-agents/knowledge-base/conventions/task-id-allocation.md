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

## ⚠️ The scan above is NOT sufficient on its own — `.claude/` shares the number space

> **Owner ruling, 2026-09-11, given live in the lead session and relayed here.** This section replaces
> an earlier reservation that was recorded as a **range** and was over-broad.

The installed fkit toolkit under `.claude/` carries **its own** task numbering, written as prose inside
skill files. Those numbers sit in the same four-digit space this project allocates from, but **no task
folder and no board can see them** — the `ls` scan above returns nothing for them. An ID that looks
free on every board can still be spoken for in `.claude/`.

### The check that establishes freedom — run it, do not trust a list

**A recorded list of reserved numbers goes stale the moment the toolkit is upgraded or a number is
spent. The method does not.** Run all four, in this order, for the number you intend to take:

```bash
N=0250                                   # the candidate

# 1. task folders — all three boards share one number space
ls -d ai-agents/tasks/*/${N}-*/ 2>/dev/null

# 2. the `## ID` field, the second carrier
grep -rn "^${N}$" ai-agents/tasks/ --include=brief.md

# 3. ⭐ THE ONE THE BOARDS MISS — upstream toolkit prose
grep -rn "${N}" .claude/

# 4. repo-wide, to catch anything else (expect SVG-coordinate false positives)
grep -rn "${N}" . --exclude-dir=node_modules --exclude-dir=.git
```

**Step 3 is the step this section exists for.** A number is free only when step 3 returns nothing, or
returns only hits that are references to an already-allocated *project* task.

To see the whole upstream-occupied set at once rather than one number at a time:

```bash
# every four-digit token appearing anywhere in .claude/
grep -rhoE '\b0[0-9]{3}\b' .claude/ | sort -u
```

### The set actually occupied upstream — ⛔ number by number, never as a range

Swept 2026-09-11 (re-verified 2026-09-12 by the command above). **Occupied in `.claude/` AND holding no
project task folder** — these are the genuine invisible reservations:

| ID | Where in `.claude/` | What it reserves |
|---|---|---|
| `0204` | `skills/fkit-sprint-ship-loop/SKILL.md` (9 lines) | The `PreToolUse`/`Task` plan-carry-check hook task. Nine sentences name it as the task that lands the hook **and removes their own marker text**. |
| `0243` | `skills/fkit-heal/{SKILL.md,check.sh,repair.sh}` | The heal structure-spec |
| `0244` | `skills/fkit-heal/{SKILL.md,check.sh}` | The heal hash manifest |
| `0245` | `skills/fkit-heal/{check.sh,repair.sh}` | `check.sh` itself, and its R1/R3/R5/R6/R8 residuals |
| `0246` | `skills/fkit-heal/{SKILL.md,check.sh,repair.sh}` | `repair.sh` itself, and its review residuals |
| `0247` | `skills/fkit-heal/SKILL.md` | The launch-time notice / `.fkit-accepted-drift` |
| `0264` | `skills/fkit-status/dashboard.sh` | Referenced as a sibling of `0265` |
| `0265` | `skills/fkit-status/dashboard.sh` | Referenced as having widened a blast radius |

**⛔ Do not rewrite this table as `0243`–`0247`.** Compressing it to a range is the exact defect this
section replaces. If a number is not on this table, it is not reserved by this table.

### Two numbers that are NOT reservations, recorded so nobody re-derives them

- **`0241` — a genuine collision, deliberately left standing.** The number names **two different
  things**: the toolkit's own heal-design task (`.claude/skills/fkit-heal/` × 3) *and* this project's
  [`0241-profile-verify-first-weekly-backup-copy`](../../tasks/backlog/0241-profile-verify-first-weekly-backup-copy/brief.md),
  allocated 2026-09-11. **The owner explicitly declined to renumber it** (2026-09-11): `0241` is already
  a canonical `Depends on` of `0219`, and re-pointing today's inbound links costs more than the
  ambiguity does. ⚠️ **Read `0241` in context** — in `.claude/` prose it means the toolkit's task; on
  this project's boards it means the backup-copy task.
- **`0242` — never reserved at all.** It appears **nowhere** in `.claude/` (verified by the sweep
  above). Its only non-task hits repo-wide are SVG path coordinates in
  `resources/flags_source/sh_yugo.svg` and `resources/images/MushroomCloudIconWhite.svg`. It was
  allocated to
  [`0242-ffa-and-team-match-stall-runs-to-cap-with-no-winner-declared`](../../tasks/backlog/0242-ffa-and-team-match-stall-runs-to-cap-with-no-winner-declared/brief.md)
  on 2026-09-11 and collides with nothing.

**Neither is an error that was tolerated. The finding is that the reservation was over-broad** — it
claimed a range it had not checked, and `0242` was never in it.

### 🚨 Why the range shorthand was dangerous — in the terms it actually bit

A range made a **verifiably free** number look reserved. The cost lands two ways, and the second is the
serious one:

1. **Wasted work.** An allocator who trusts the record skips a free number; an allocator who doubts it
   must re-derive the whole band from scratch, which is exactly what happened when `0242` was filed.
2. 🔴 **Real collisions hide behind a false boundary.** Once a range is known to over-claim, every
   number in it reads as "probably fine, like `0242` was" — and the numbers that *are* genuinely taken
   (`0243`–`0247`, `0264`, `0265`) lose the warning they depend on. **A boundary that is wrong in one
   direction stops being trusted in the other.**

This is the third time this project has been bitten by trusting a recorded pointer over a check — see
[`evidence-before-assertion.md`](evidence-before-assertion.md) and
[`file-line-citations.md`](file-line-citations.md). **Run step 3. Do not read the table and stop.**

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
