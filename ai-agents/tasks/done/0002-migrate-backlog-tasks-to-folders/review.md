# Review — 0002

Task: ai-agents/tasks/backlog/0002-migrate-backlog-tasks-to-folders/brief.md
File(s) under review: the uncommitted working tree vs `HEAD` (`8a86ee5`) — 38 staged renames (R100) plus 64 modified and 3 untracked files
Status: closed-out (round 1 processed; both defects fixed, all dispositions recorded 2026-08-10)

**Round 1 verdict:** ⚠️ Changes requested — 2 confirmed defects (both low, neither blocking). Codex second opinion **ran** (model-diverse coverage complete); its one finding is disproven below.

## Reviewer findings

| #  | Round | Sev  | file:line | Claim |
|----|-------|------|-----------|-------|
| R1 | 1     | low  | ai-agents/tasks/backlog/0002-migrate-backlog-tasks-to-folders/worklog.md:170 | Verification-6 self-report undercounts residual legacy-filename hits: it states 44 outside `wiki-vault/` (41 in `plan.md` + 3 review-file references); the working tree actually has **51** — the missing 7 are in this task's own `worklog.md`. Every hit is substantively correct, so the migration is sound, but the recorded verification number is wrong and one whole category (the worklog) is unlisted. |
| R2 | 1     | low  | ai-agents/reviews/s4-citizenship-card-guest-cta-no-sdk.md:15 | One inbound reference to a migrated brief was missed: the bare task identity `` `degraded-mode-full-ux-treatment` `` (no `.md` suffix) was not rewritten to `` `0049-degraded-mode-full-ux-treatment` ``. The rewrite matched full filenames including the extension, so the suffix-less prose form slipped through. It does not dangle (it is a name, not a path), but it keeps the legacy identity the task exists to retire, and it contradicts the coder's own D-6 rule. |
| R3 | 1     | low  | ai-agents/sprints/backlog.md:19 | Scope leak into task 0004's column: a sprint-board **Status** cell was changed (`🔲 Backlog` → `🔄 In progress`), mirrored in `0002-migrate-backlog-tasks-to-folders/brief.md:13`. Plan §8 explicitly lists "any Status-cell change in a sprint plan" as out of scope and owned by 0004. Almost certainly the ship-loop's own progress bookkeeping rather than migration work — classified frontier/process, not a defect — but it is in the diff and must be flipped again at close or the board will read `🔄 In progress` on a shipped task. |

### Verified clean (checked, nothing found)

Recorded so a later round does not re-derive these blind.

- **No content loss.** Zero pure-delete hunks across all 38 renames. Every one of the 35 changed lines inside migrated briefs is a reference rewrite; all other content is byte-identical. No missing trailing newline, no CRLF, no encoding change.
- **Rewrites are exactly right.** All 38 renames staged `R100`. Independently replayed the intended substitution over every changed line in the diff: **191/191 reconstruct exactly**. No over-matching, no under-matching, no `.md`-suffix damage, no doubled extension, no wrong-ID target.
- **All 70 task paths introduced by the diff resolve on disk.** The 25 dangling `ai-agents/tasks/...` paths that remain were already broken at `HEAD` and point at briefs in `done/`/`cancelled/` (task 0003's surface), not at any of the 38.
- **Collisions.** Repo-wide, exactly one file shares a basename with the 38 (`ai-agents/reviews/degraded-mode-full-ux-treatment.md`) and exactly three strings embed one as a substring (the `s4-8d-b-task-personal-inbox.md` token). Both are the coder's D-3 and D-4; both handled correctly. **No third collision exists.**
- **Ratified table honoured.** The 38 on-disk renames diff **identically** against plan §2's owner-ratified ID table.
- **Field insertion.** 49/49 folders have a `brief.md`; 49/49 `## ID` equals the folder prefix; 38/38 `## Status` is exactly `🔲 Backlog`; every `## Owner` is in `task-owner-vocabulary.md` (37 coder / 7 producer / 5 architect). Field **order** is correct in all 49 — the three shapes present are exactly the three plan §4 predicts.
- **D5 conversion complete.** No sprint-plan Brief cell for any of the 38 still holds a bare span. The 8 broken sprint links are pre-existing in `plan-index.md` and `done/plan-sprint-1..3.md`, files this diff never touched.
- **`ai-agents/wiki-vault/` untouched** — zero entries in `git status`.
- **No secrets introduced.** Every hit for password/secret/token/key on added lines is a task *name*; no credential, DSN, key, or IP.
- **Source edits are comment-only.** All 8 files under `src/`, `tests/`, and `profile-backup.sh` change only comment text; no behavior change.
- **Build gates reproduce the claims.** ESLint clean (exit 0). Full suite **82 suites / 621 tests, all green**. Prettier's single failure is `src/server/MapPlaylist.ts:141` (`{ }` vs `{}`), confirmed present at `HEAD` and untouched by this diff.

### Disproven — do not chase

- **Codex:** "`## ID` is numeric-only in all 38 briefs but the task says it must match the folder name" (`0012-personal-inbox/brief.md:4`, medium). **INCORRECT.** All three pre-existing reference briefs at `HEAD` (`0001`, `0005`, `0010`) carry a bare four-digit `## ID`, plan §4 names exactly those three as the target shape, and the new `task-id-allocation.md:25` codifies "zero-padded to four digits, with no prefix and no link". The brief's "matching the folder name" means agreeing with the folder's ID prefix, which is what 49/49 do. Codex read it hyper-literally against the established repo form.

## Coder response

<!-- CODER-OWNED — the reviewer never writes this section. -->

Round 1 processed 2026-08-10 by a spawned `@fkit-coder` under `fkit-sprint-ship-loop`'s
declared-approval marker. Owner dispositions were relayed with the spawn and are recorded per row.
Each claim was re-verified against the working tree before any edit.

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | **CORRECT** | Defect — in the *record*, not the migration | Rewrote the verification-6 section of `worklog.md`: 44 → **51**, itemised into 3 categories (41 `plan.md` + 7 `worklog.md` + 3 external), with the reproducible grep and its exclusions. Also disclosed two counting variants the reviewer's figure did not carry (see below). | **fixed** (owner ruled: correct it) |
| R2 | **CORRECT** | Defect | Rewrote the bare legacy identity at `ai-agents/reviews/s4-citizenship-card-guest-cta-no-sdk.md:15` to `` `0049-degraded-mode-full-ux-treatment` ``. The same line's pointer to the review ledger of D-3 was left intact — verified still present. | **fixed** (owner ruled: rewrite it) |
| R3 | **CORRECT** | Frontier / process — not a defect | **No change.** The `🔄 In progress` markers are the ship-loop's ownership signal; the producer overwrites them at close. Owner ruled accept-and-flip-at-close, explicitly "do not revert them". | **accepted** — carried to close, not to this diff |
| Codex C1 | **INCORRECT** | — | No action. The reviewer's refutation is correct and I re-checked it: `0001`, `0005` and `0010` at `HEAD` all carry a bare four-digit `## ID`, and `task-id-allocation.md:25` codifies exactly that shape. Acting on it would have broken 49 briefs to satisfy a hyper-literal reading. | **disproven — do not chase** |

> **R1 — deviation from the literal disposition, escalated and ratified.** The owner's disposition said
> "fix it to 51". A raw grep today returns **53 lines / 56 occurrences**, so I kept 51 as the *durable*
> figure and disclosed both variants plus the reproducible command, rather than writing a bare number I
> had already measured as non-reproducible. This was **surfaced to the owner, not taken silently**, and
> **ratified on 2026-08-10**: the owner endorsed the reasoning that recording a number known to be
> irreproducible would recreate the exact defect R1 exists to fix.

### Verification after the fixes

- **Verification 6 re-run** — **53** matching lines repo-wide (`.git`, `node_modules`, `wiki-vault`,
  `static` excluded): 41 `plan.md` + 7 `worklog.md` + 3 external + **2 in this ledger**. The
  owner-ruled figure of **51** is the first three categories. This ledger's own lines are held outside
  the total on purpose: it did not exist when the original count was taken, and it necessarily grows
  each round, since discussing the residuals means naming them. So **51 is the durable figure and 53
  is today's raw grep** — a later round raising the raw number is the ledger growing, not the
  migration regressing. Counting *occurrences* instead of lines gives 56. All figures and the exact
  command are written into the worklog, so a fresh grep cannot read as a new defect.
- **`npm run lint`** — clean, exit 0.
- **`npm test`** — **82 suites / 621 tests, all passing.** Unchanged from the pre-fix baseline, as
  expected: both fixes are markdown-only and touch no source.
- **`ai-agents/wiki-vault/`** — still zero entries in `git status`.
- **Nothing committed.** Both fixes are uncommitted working-tree changes.

### New residual found while verifying R2 — deferred by owner ruling (2026-08-10)

> **Owner ruling — Option B, defer.** Recorded as an **accepted residual of task 0002** (see the
> residuals section). A "bare legacy identity sweep" runs as a **follow-up after task 0003**, so the
> done/cancelled names sharing these same elided lists are settled first and each list is hand-edited
> **once**. The owner accepted the reasoning that nothing dangles meanwhile: these are prose mentions,
> not links. Full detail is kept below so the follow-up is actionable without re-deriving it.

R2 is one instance of a class, and the class is larger than the finding. Searching for **bare legacy
identities** (the stem with no `.md`, which the full-filename matcher structurally could not catch)
turns up **13** occurrences outside `wiki-vault/` and outside this task's own artefacts. Three are
correct as they stand; **10 are the same defect R2 describes and are still unfixed**:

| File | Occurrences | Same class as R2? |
|---|---|---|
| `ai-agents/knowledge-base/s4-preexisting-infra-impact-2026-06-24.md` | 7 | **Yes** — bare identities of migrated briefs 0017, 0018, 0019, 0021 |
| `ai-agents/knowledge-base/pre-s4-player-infra-audit-2026-06-24.md` | 3 | **Yes** — bare identities of migrated briefs 0014, 0018, 0019 |
| `ai-agents/reviews/s4-citizenship-card-guest-cta-no-sdk.md` | 1 | Was R2 — **now fixed** |
| `ai-agents/reviews/degraded-mode-full-ux-treatment.md` | 1 | **No** — the file's own H1, which must match its own filename |
| `ai-agents/reviews/degraded-mode-full-ux-treatment-coder-handoff.md` | 1 | **No** — same, its own H1 |

**I did not fix the 10.** Two reasons, and the second is the substantive one:

1. They are outside the approved plan and outside the owner's three dispositions, and my autonomy here
   is bounded by both.
2. **They are not a mechanical rewrite.** Six sit in elided prose lists where one token establishes the
   `s4-` prefix for the ones that follow — for example `s4-yandex-payments-impl, -citizenship-paid,
   -yandex-catalog-registration, -profile-05`. Rewriting the head token to `0019-yandex-payments-impl`
   strands every `-suffix` after it, because the prefix they elide no longer appears. A correct fix has
   to rewrite the whole list by hand, and some members of these lists are **done/cancelled** tasks
   owned by task 0003, not by 0002. Doing that unattended is exactly the broad, judgment-bearing edit
   the loop's autonomy bound tells me to stop for.

By coder rule D-6 these 10 are in scope for this task; by the reviewer's own framing they are the R2
defect. Put to the owner as three options — fix here / defer / accept permanently — and **ruled
Option B, defer** (above).

## Accepted residuals (shared, do-not-re-litigate)

- **10 bare legacy task identities left unrewritten — swept in a follow-up after task 0003** — What: the R2 defect class (a legacy task identity written *without* the `.md` suffix, which the full-filename matcher structurally could not catch) survives in **7 occurrences** in `ai-agents/knowledge-base/s4-preexisting-infra-impact-2026-06-24.md` (briefs **0017, 0018, 0019, 0021**) and **3** in `ai-agents/knowledge-base/pre-s4-player-infra-audit-2026-06-24.md` (briefs **0014, 0018, 0019**). Why (structural): ⚠️ **the elision-grammar hazard** — six sit in prose lists where only the head token carries the `s4-` prefix and later members elide it (`s4-yandex-payments-impl (sole writer), -citizenship-paid, -yandex-catalog-registration, -profile-05`), so rewriting the head token to `0019-yandex-payments-impl` **strands every `-suffix` after it and corrupts the list**. These lists must be hand-edited as a whole, never pattern-substituted. Compounding it, members such as `-profile-05` are **done-board names owned by task 0003**, so sweeping before 0003 lands means rewriting the same lines twice. Rejected alternatives: fix inside 0002 (double work + corruption risk), or accept permanently (they are genuinely in scope by coder rule D-6). Nothing dangles meanwhile — these are prose mentions, not links. Owner ruled 2026-08-10, **Option B**. Re-raise only if: task 0003 completes and the sweep is never queued.
- **ID ordering by git first-commit date, without `--follow`** — What: IDs 0012–0049 allocated by `git log --diff-filter=A` date, tie-broken by filename. Why (structural): 21 of 38 briefs carry no in-file date and 3 carry a date postdating creation, so the brief's recommended in-file-date rule degenerates to alphabetical noise; rejected alternative was the in-file-date rule. Owner-ratified 2026-08-10 (plan §0 D2). Re-raise only if: IDs have not yet been committed **and** the owner reopens allocation policy.
- **ID `0031` (`mobile-webgl-rendering`) keeps its ratified slot** — What: 0031, despite `--follow` showing true creation 2026-05-07 (would sort near 0024). Why (structural): IDs are permanent and never renumbered; renumbering against a ratified table shifts seven IDs for no functional gain. Owner ruled 2026-08-10 to keep the ratified table. Re-raise only if: never, absent an explicit owner reversal.
- **`ai-agents/wiki-vault/` excluded from the rewrite** — What: 72 legacy-filename occurrences across 10 vault files left as-is; `log.md` (60) stays unedited as append-only history; the 9 wiki pages (12 occurrences) are a separate `@fkit-wiki` follow-up. Why (structural): only the `fkit-wiki` role may write the vault (CLAUDE.md hard rule), and rewriting a dated log entry falsifies the record. Owner-ratified 2026-08-10 (plan §0 D3, verification 6 amended). Re-raise only if: the `@fkit-wiki` follow-up is never queued.
- **Sprint-plan Brief cells converted to real markdown links** — What: bare code spans become `` [`NNNN-slug`](../tasks/backlog/NNNN-slug/brief.md) ``. Why (structural): a bare span is not addressable, which is the defect the task exists to fix; rejected alternative was preserving bare spans. Owner-ratified 2026-08-10 (plan §0 D5). Re-raise only if: a tool is found that breaks on the linked form.
- **The 5 ambiguous task owners** — What: 0014 → `fkit-producer`, 0016 → `fkit-architect`, 0025 → `fkit-architect`, 0028 → `fkit-producer`, 0048 → `fkit-producer`. Why (structural): `task-owner-vocabulary.md` has no value meaning "the owner does this personally", which four of the five need; the defaults are the closest fit. Owner accepted as tabled 2026-08-10 (plan §3). Re-raise only if: the owner vocabulary gains an owner-personal role.
- **Prettier failure at `src/server/MapPlaylist.ts:141`** — What: `constructor(...) { }` left unformatted. Why (structural): pre-existing at `HEAD`, untouched by this diff; CLAUDE.md forbids reformatting unrelated code in the same change. Owner ruled 2026-08-10 to leave it. Re-raise only if: it is raised as a defect *of this task* — it is not one.
- **`sec10`–`sec13` prefix loss from slugs** — What: the sec-series grouping disappears from filenames, surviving only in each brief's H1 and body. Why (structural): the brief explicitly instructs dropping legacy prefixes because the ID replaces the prefix as identity. Re-raise only if: the owner decides the grouping must be machine-readable.
