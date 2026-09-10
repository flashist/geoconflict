# Reconcile legacy status markers in the sprint plans to the canonical vocabulary

## ID
0004

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

The sprint plans predate `conventions/task-status-vocabulary.md` and use a status vocabulary that
does not match it. Observed in `plan-sprint-4.md`, `plan-sprint-6.md`, `sprint-backlog.md`, and
`plan-index.md`:

| Used today | Canonical equivalent |
|---|---|
| `⬜ Backlog` | `🔲 Backlog` (different glyph) |
| `🔄 In Progress` | `🔄 In progress` (different casing) |
| `⚠️ Urgent` | **no equivalent** — urgency is not a status |
| `⏸ Parked` | **no equivalent** — see below |
| `⬜ No sprint` | `🔲 Backlog` |
| `⛔ Cancelled` (no date) | `⛔ Cancelled (YYYY-MM-DD) — <reason>` |

**Why this matters.** `dashboard.sh` and both mover skills locate and interpret rows by exact
marker. A near-miss glyph is not a cosmetic difference — it is an unparseable row, and an
unparseable row is silently absent from every board-driven view. The canonical set is also what
makes `✅ Done` and `⛔ Cancelled` mean *"a mover skill set this"* rather than *"someone typed
this"*.

**Two markers have no canonical equivalent, and this task must not paper over them:**

- **`⚠️ Urgent`** (currently on *Yandex Catalog Registration* in Sprint 4) conflates **priority**
  with **status**. The row's actual status is Backlog; its urgency belongs in the Priority column or
  the brief. But that task is also **externally blocked** on Yandex approval — so `🚧 Blocked —
  awaiting Yandex catalog approval` may be the honest status. Decide per row, with evidence.
- **`⏸ Parked`** (Task 5 deep mobile rendering, Task 2i Clarity) encodes *"deferred until a named
  metric is met"* — a real distinction the canonical six cannot express.

⚠️ **If the canonical vocabulary genuinely cannot express a distinction the board needs, the
sanctioned fix is to amend `conventions/task-status-vocabulary.md` — with owner approval — not to
keep an inline invented marker and not to flatten the distinction away silently.** The convention
doc says so itself: it is a starting convention, and it is yours to amend, in exactly one place.
**Raise both cases with the owner before converting them.**

**Ordering.** Run **after** 0002 and 0003. Those tasks rewrite brief links throughout the same
sprint-plan files; doing status reconciliation first means editing every plan twice and risking
merge pain for no benefit.

## ⚠️ Scope widened 2026-08-10 — the status *section* itself, not only the markers inside it

Two additions, **both ruled by the owner on 2026-08-10**. They are recorded here because verification
step 5 ("`dashboard.sh` runs clean over the reconciled plans") is **unachievable without them** — the
script cannot read five of our seven plans at all today, so "reconciled" could otherwise be declared
true over documents no tool has ever parsed.

Measured by running `dashboard.sh` on every board in `ai-agents/sprints/` on 2026-08-10:

| File | `## Status` section | What the script does |
|---|---|---|
| `plan-sprint-4.md` | `## Sprint 4 Status` | dies at `dashboard.sh:206` |
| `plan-sprint-4c.md` | `## Sprint 4c Status` | dies at `dashboard.sh:206` |
| `plan-sprint-6.md` | `## Sprint 6 Status` | dies at `dashboard.sh:206` |
| `plan-sprint-5.md` | **none at all** | dies at `dashboard.sh:206` |
| `plan-index.md` | **none at all** | dies at `dashboard.sh:206` |
| `sprint-backlog.md` | `## Status` ✅ | parses |
| `backlog.md` | `## Status` ✅ | parses |

Also affected in `ai-agents/sprints/done/`: `plan-sprint-3.md` and `plan-sprint-4b.md` carry
`## Sprint <N> Status`; `plan-sprint-1.md`, `plan-sprint-2.md` and `hotfix-post-sprint2.md` have no
status section at all.

**Addition 1 — rename the heading** (owner-ruled 2026-08-10). `## Sprint <N> Status` → `## Status`,
in every plan that has one. `dashboard.sh` matches the heading exactly (`STATUS_HEADING_RE`, checked
at `:206`); a prefixed heading is not a near-miss, it is a hard refusal of the whole file.

**Addition 2 — `plan-sprint-5.md` and `plan-index.md` have no status table to rename**
(owner-ruled 2026-08-10). The owner chose to **widen this task rather than open a separate brief**,
on the grounds that otherwise "fix the sprint docs" completes with two of five plans still
unreadable — which is precisely the kind of board-shaped lie this task exists to end.

> ⚠️ **This changes the size of the task, and the estimate should not be carried over.** Renaming a
> heading is a mechanical edit. **Authoring a status table from scratch is not** — it means deciding
> which of each plan's items are tasks, finding or confirming each one's brief link, and assigning
> each a status from the canonical vocabulary. For `plan-index.md` there is a prior question:
> **is it a task board at all, or a navigation document?** An index that merely links to the other
> plans should probably **not** grow a `## Status` table, and "this file is deliberately not a board"
> is a legitimate, complete outcome. **Establish that before authoring anything** — see What to build
> step 3b.

**Downstream:** `0053` tracks a separate, upstream defect in `dashboard.sh` itself (`PLAN_SPRINT`
fails to resolve on our plan filenames). The two are independent — but `0053`'s verification cannot
run until this task makes at least one `plan-sprint-*.md` readable. Nothing here should wait on
`0053`.

## Named line-items added 2026-08-26 — owner-ruled hand-offs from `0003`

`0003` (the `done/` + `cancelled/` folder migration) closed on 2026-08-25 and handed four items to
this task. Each was **ruled by the owner on 2026-08-26**; apply them as written, alongside the
general reconciliation. All four touch files this task already edits.

📌 **UPDATED 2026-09-10 — this section now holds EIGHT numbered items, not four, and item 1 is already
DISCHARGED.** Items **5 through 8 were added on 2026-09-10** and did **not** come from `0003`: **item
5** was folded in on an **owner ruling given live in session**; **items 6, 7 and 8 are recorded only
and NOT ruled by anyone** — read each one's own note before treating it as work, and note that **item
8 records its own weak fit and names a better home.** ⚠️ **Item 1 is ✅ done; it is kept
as the record, not as remaining work.** ⛔ **The numbering of items 1-4 is deliberately
unchanged so existing references to "hand-off item N" still resolve.**

1. ✅ **DISCHARGED 2026-09-10 — `0119-nations-balance` cancel date aligned to `2026-04-18`. Nothing
   is left to do on this item; it is kept here as the record, not as work.**

   **What was done:** the Sprint 4 board cell now reads `⛔ Cancelled (2026-04-18)`. **The
   owner-supplied reason text was kept exactly as it was**, and **the brief was not touched** — both
   as this item required. The Task cell's provenance note, which had claimed *"date recovered from
   plan edit `e7e1b12`"* (a statement that was true of the **old** value and false of the new one),
   was rewritten to cite the real source.

   ⚠️ **The line reference in the original item was stale.** It named
   `ai-agents/sprints/plan-sprint-4.md:56`; the row had since moved and was edited at **`:78`**.
   ⛔ **Do not trust any line number in this brief without re-deriving it** — that board is edited
   many times a day. Locate rows by their task link (`0119-nations-balance`), never by line.

   **Authority:** executed under an **owner ruling given live in session on 2026-09-10** and relayed
   through the spawning session, which **matched this task's own standing ruling of 2026-08-26**
   (itself following the owner's option-(C) ruling of 2026-08-25). It was not a producer decision.

   **The evidence, recorded so it is never re-derived:** commit **`1e857a0` (2026-04-18)** does two
   things in one commit — it adds the no-ship review
   (`ai-agents/knowledge-base/hvn-balance-pr70-no-ship-review.md`, itself dated **2026-04-18**, whose
   recommendation is *"Cancel or close the current implementation task/PR as unsuccessful"*) **and**
   renames the brief from `tasks/backlog/` into `tasks/cancelled/` (a 100 %-similarity rename).
   Commit **`e7e1b12` (2026-04-21)** only flipped the board cell from `⬜ Backlog` to `⛔ Cancelled`
   — **the board catching up three days later, not the cancellation.**

2. **Rewrite the `See cancelled-tasks.md` pointers.** `ai-agents/sprints/cancelled-tasks.md` was
   deleted in `6666989`; its content now lives at
   `ai-agents/wiki-vault/wiki/decisions/cancelled-tasks.md`. Re-point the three pointers the owner
   named — `ai-agents/sprints/plan-index.md:71`, `:74`, and
   `ai-agents/sprints/done/hotfix-post-sprint2.md:148` — to that vault page. A fourth occurrence,
   the index-table link at `plan-index.md:34`, is the same class; fix it in the same pass. Read the
   vault page; do not write it (`fkit-wiki` only).

3. **HF-5 record is self-contradictory — brief `0096` is the source of truth.**
   `ai-agents/sprints/done/hotfix-post-sprint2.md:74` says `**Status:** ✅ Done`, while its own
   checklist (`:148`) and `plan-index.md:71` say cancelled & reverted. The brief
   (`ai-agents/tasks/cancelled/0096-win-condition-bug/brief.md`, cancelled per rename commit
   `49f96bc`) carries `⛔ Cancelled (2026-03-10) — cancelled & reverted: ghost-bot logic too entangled, contradicting test instructions`.
   **Reconcile `hotfix-post-sprint2.md:74` to the brief's cancelled status** (canonical form, with the
   brief's date and reason). This is a notation fix on a record that contradicts itself, not a state
   change — the task has been cancelled since March.

4. **Retire the stale "drift until `0003` runs" prose.** `ai-agents/sprints/plan-sprint-4.md:19-20`
   and `ai-agents/sprints/done/plan-sprint-4c.md:26-27` explain that the dashboard reports the
   done/cancelled briefs' location as drift "until `0003` runs — expected". `0003` has run. Rewrite or
   remove that sentence so the note no longer predicts a state that has passed; leave the rest of
   each note (the `⚠️ Urgent` remark, etc.) for the general reconciliation.

5. 🔴 **A CLASS OF DEFECT, NOT TWO INSTANCES — briefs whose `## Status` carries TWO status-shaped
   lines.** *(Folded into this task on an **owner ruling given live in session, 2026-09-10**, relayed
   through the spawning session. The owner ruled it be folded here rather than fixed on the spot or
   filed as a new task, because this task already owns status-marker reconciliation and sits on the
   Backlog board. ⛔ **Nothing was fixed at the time of filing** — deliberately, so the pattern is not
   half-repaired.)*

   **The two known instances:**

   | Task | First line | Second line |
   |---|---|---|
   | `0128-legal-vat-investigation` (in `tasks/done/`) | `✅ Done` | `✅ Done — completed 2026-04-21.` |
   | `0139-start-screen-redesign-investigation` (in `tasks/done/`) | `✅ Done` | `✅ Closed — all decisions made 2026-04-22.` |

   🚨 **`✅ Closed` is NOT a canonical value** — the six canonical values are `🔲 Backlog`,
   `🔄 In progress`, `🚧 Blocked — <reason>`, `✅ Done`, `⛔ Cancelled (YYYY-MM-DD) — <reason>`
   and `➡️ Moved`. `✅ Closed` is not among them.

   🔴 **Why it matters: a mover skill cannot tell which line is the value.** A `## Status` section with
   two status-shaped lines has no single readable value, so any tool that parses it is guessing.

   ✅ **Nothing is live** — both tasks are already closed, so no in-flight work depends on either.
   ⚠️ **That is why it is filed rather than urgent; it is NOT a reason to drop it.**

   🚨 **TREAT THIS AS A CLASS, NOT A PAIR. If two exist, others may.** ⛔ **Do not "fix the two and
   move on."** This task's step 1 inventory must **sweep every `## Status` section under
   `ai-agents/tasks/` for more than one status-shaped line** and report the full count before any are
   changed. **Two is what one sweep found; it is not established as the total.**

   ⚠️ **Deciding which line survives is a judgement, not a mechanical trim** — the second line in each
   case carries a **date the first does not**. ⛔ **Do not discard information to make the field
   parseable.** Recommend a merged canonical value per instance and, where the two lines disagree on
   anything more than formatting, **put it to the owner rather than choosing.**

   ⛔ **The movers are producer-only (ADR-033) and neither task's status is changing** — this is a
   notation fix on records that contradict themselves, not a state change.

6. 📌 **RECORDED, NOT ASSIGNED — a stray `</content>` tag at the end of 14 files.** *(Found during the
   2026-09-10 sweep. ⚠️ **NOT owner-ruled, and NOT ruled by the spawning session either** — it is
   recorded here so it is not rediscovered from scratch. **Whether it belongs to this task at all is
   an OPEN QUESTION for the owner**, since this task's scope is the status *vocabulary*, and this is a
   file-authoring artifact that merely shares the same cause — bulk-authored task briefs.)*

   **What it is:** a literal `</content>` line as the **last line** of the file — an authoring-tool
   artifact, not content. **It is not markdown, and it renders as visible stray text.**

   **Where (14 files, all under `ai-agents/`):** briefs `0199`, `0213`, `0214`, `0215`, `0216`, `0217`,
   `0218`, `0219`, `0220`, `0221`, `0222`, `0223`, `0224`, plus the report
   `knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md`.

   ⛔ **NONE OF THE 14 WAS FIXED, DELIBERATELY.** Fixing one — `0219` was being edited at the time —
   would have left 13 inconsistent and **hidden the pattern**, which is the failure mode worth avoiding
   here. ⚠️ **If this is picked up, fix all 14 in one pass or none.**

   ⚠️ **The count `14` is from one grep on 2026-09-10 and will drift** — re-derive it before acting.

7. **RECORDED ONLY, NOT RULED AS WORK — the Backlog board's `## Sprint` fields are decorated, and
   `dashboard.sh` reports 21 drifted rows because of it.** *(Added 2026-09-10 by a spawned
   `fkit-producer`, on the **coordinator's** instruction to put it on this pile — ⚠️ **not an owner
   ruling**. Same standing as item 6: recorded so it is not rediscovered from scratch.)*

   **What it is:** `dashboard.sh`'s drift rule compares a brief's `## Sprint` field against the
   board's identity, which for [`backlog.md`](../../../sprints/backlog.md) is the bare token
   `Backlog`. **Any decoration fails the match** — `Backlog — unscheduled`, `Backlog board`,
   `**Backlog board.**`, `Backlog — unscheduled. Filed on …`, and longer prose forms all report as
   `drift disagreement`.

   **Scale, measured 2026-09-10:** `bash .claude/skills/fkit-status/dashboard.sh
   ai-agents/sprints/backlog.md` reports **21 drifted tasks**; two of them are a different shape
   (`0057`, `0062` — `moved-without-target`), the rest are this one. **The Sprint 4 board is
   effectively clean by comparison: 1 drifted task (`0230`), same decoration cause.**

   ⚠️ **The fix is one line per brief** — make `## Sprint` the bare token and move any qualifier to
   prose **below** the field. `0237` and `0238` were filed this way deliberately and report no drift;
   `0001`, `0202` and `0229` already conform. ⛔ **Fix all of them in one pass or none** — the same
   reasoning as item 6: a partial pass hides the pattern.

   ⚠️ **The count `21` is from one run on 2026-09-10 and will drift** — re-run the checker before
   acting. **Whether this belongs to this task at all is an OPEN QUESTION for the owner:** this task's
   scope is the status *vocabulary*, and this is the `## Sprint` *field*. It lands here because it is
   the same class of board↔brief reconciliation, not because anyone ruled it in.

8. **RECORDED ONLY, NOT RULED AS WORK — `0236`'s review ledger contradicts itself about R6.** *(Added
   2026-09-10 by a spawned `fkit-producer`, on the **coordinator's** instruction — ⚠️ **not an owner
   ruling**. 🔴 **THE WEAKEST FIT OF THE EIGHT, and said so plainly.**)*

   **What it is:** in
   [`0236/review.md`](../../done/0236-client-kill-switch-for-citizenship-surfaces/review.md), the
   *"Routed out of 0236"* list still carries **R-A (R6)** as routed, while **the coder's amendment at
   the top of the same file and the round-2 disposition table both record R6 as FIXED inside `0236`**.
   ✅ **The disposition table is the correct one.** The stale entry was **flagged in
   [`0237`'s brief](../0237-close-routed-out-test-residuals-from-0236-citizenship-switch/brief.md)**
   rather than edited, because a review ledger belongs to the reviewer.

   ⚠️ **Why the fit is weak:** this is neither a status marker nor a `## Sprint` field — it is a
   *review ledger's* internal consistency. **It lands here only because this is the record-hygiene
   pile.** 📌 **The alternative disposition, which may well be the better one: leave it to
   `fkit-reviewer`, whose ledger it is.** ⛔ **Do not fix it from this task without deciding that
   first.**

## What to build

1. **Inventory every status marker** currently in use across `ai-agents/sprints/` (including
   `done/`) and `ai-agents/tasks/`. Produce the full list with counts and locations before changing
   anything — the mapping table above was built from a partial read and may be incomplete.

2. **Put the two unmappable cases to the owner** (`⚠️ Urgent`, `⏸ Parked`) with a recommendation
   each. Get a ruling before converting them.

3. **Convert every mappable marker** to its canonical form across all sprint plans and the backlog
   board.

3a. **Rename `## Sprint <N> Status` → `## Status`** in every plan that has one, including the
   archived plans in `sprints/done/` (owner ruling 2026-08-10 — see the widened-scope section). This
   is what lets `dashboard.sh` read the file at all; do it **before** step 1's inventory is called
   complete, since the inventory of a file the tooling cannot open is a hand-read.

3b. **Handle the two plans with no status section** — `plan-sprint-5.md` and `plan-index.md`
   (owner ruling 2026-08-10). **Decide first, author second:**
   - For `plan-index.md`, answer *"is this a task board or a navigation document?"* and put the
     answer to the owner with a recommendation. If it is navigation, **record that ruling in the file
     itself** and author no table — that is a complete outcome, not a skipped step.
   - For any plan that genuinely is a board, author the `## Status` table from the plan's own
     content. **Derive every row from what the document already says.** Never invent a status, and
     never invent a brief link — a task with no brief gets an empty Brief cell, which the dashboard
     handles, rather than a guessed path.
   - List in the hand-off every item you could not classify, rather than assigning it a status to
     make the table complete.

4. **Backfill dates and reasons on closed rows.** `⛔ Cancelled` rows need
   `(YYYY-MM-DD) — <reason>`; both are mandatory. Recover them from the migrated briefs in
   `ai-agents/tasks/cancelled/` (each now carries its own `⛔ Cancelled (date) — reason`, sourced by
   `0003` from the records), `ai-agents/wiki-vault/wiki/decisions/cancelled-tasks.md` (read-only —
   the former `sprints/cancelled-tasks.md`, deleted in `6666989`), and the plans' own addendum notes.
   **Never invent a date or a reason** — list anything unrecoverable in the hand-off report instead.

5. **Do not change any task's actual state.** This is a *notation* change. A row that means "not
   started" still means "not started" afterwards. If reconciliation reveals a row whose recorded
   status contradicts reality, **report it — do not silently correct it**; a status correction is a
   separate, owner-visible act.

6. **Do not invoke the mover skills.** Rewriting a marker in a plan is not a task close. Any row
   that genuinely needs to become `Done` or `Cancelled` goes through `/fkit-task-done` /
   `/fkit-task-cancelled` as its own act, producer-invoked.

## Verification steps

1. A grep across `ai-agents/sprints/` and `ai-agents/tasks/` for `⬜`, `⏸`, `⚠️ Urgent`, `No sprint`,
   `In Progress` (capital P), `Not started`, `WIP`, and `Todo` returns **zero** hits — or only hits
   the owner explicitly ruled to keep.
2. Every Status cell in every sprint plan and the backlog board matches a value defined in
   `conventions/task-status-vocabulary.md`.
3. Every `⛔ Cancelled` row carries both a date and a reason; spot-check 3 against the matching
   brief in `ai-agents/tasks/cancelled/` (and `wiki-vault/wiki/decisions/cancelled-tasks.md`).
4. Every `✅ Done` row corresponds to a brief that actually lives in `ai-agents/tasks/done/`, and
   every `⛔ Cancelled` row to one in `cancelled/`. Mismatches are reported, not fixed.
5. **`dashboard.sh` actually reads every plan** — run it on each file in `ai-agents/sprints/` and
   `ai-agents/sprints/done/` and paste the results. **No file may `die` with
   `no '## Status' section`**, except one the owner explicitly ruled is not a board (see step 3b),
   which must be named in the hand-off with the ruling. No unparseable rows.
   ⚠️ Before this task, **five of seven plans died at `dashboard.sh:206`** — so a "clean run" that
   silently covers only the two readable boards is the failure mode this step exists to catch.
   State how many files you ran it on.
6. The before/after inventory from step 1 shows a one-to-one row count — **no row was dropped** in
   conversion.
7. If the vocabulary was amended, `conventions/task-status-vocabulary.md` carries the new value and
   the owner's approval is recorded.

## Verification note

Verification step 4 will surface genuine drift — Sprint 4's table currently marks several tasks
`✅ Done` whose briefs are still sitting in `backlog/`, or vice versa. That is expected output of
this task, **not** a reason to move files. Report it; the owner decides.

## Notes

- **Depends on:** 0002, 0003 — **both satisfied** (0002 closed 2026-08-10, 0003 closed 2026-08-25,
  both agent-closed; this task is pullable)
- **Blocks:** nothing

- Producer-owned: this is status-vocabulary and board curation work, not source code.
- The real deliverable is that board-driven views stop lying. Amending the vocabulary doc is a
  legitimate outcome, not a failure to conform.
- ⚠️ **Scope was widened on 2026-08-10** (two owner rulings — see the widened-scope section after
  Context). Any estimate made before that date is stale: authoring a status table from scratch for
  `plan-sprint-5.md` is materially different work from renaming a heading.
- **Do not touch `.claude/skills/fkit-status/dashboard.sh`.** The reader has its own defect, tracked
  upstream by `0053`. This task changes the plan documents only.
- No secrets: these files go to git.
