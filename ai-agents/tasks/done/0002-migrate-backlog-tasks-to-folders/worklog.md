# Worklog — Task 0002: Migrate `tasks/backlog/` to the fkit task-folder convention

Build step run by a spawned `@fkit-coder` under `fkit-sprint-ship-loop`'s declared-approval marker
(owner approved the plan via `AskUserQuestion`, 2026-08-10). Scope: plan §5 steps 1–6, plus the
verification checks that were cheap to run alongside.

**Nothing is committed.** All work is in the working tree.

Plan verified before starting: `git hash-object plan.md` = `80e16b27b205654abe1042d670a3f077d20427a0`
— matches the hash in the spawn prompt.

---

## What was done

| Plan step | Result |
|---|---|
| §5.1 Convention doc | `knowledge-base/conventions/task-id-allocation.md` written; indexed in the conventions `README.md` |
| §5.2 Freeze mapping | Derived by script, diffed against the plan's §2 table — **exact match, all 38 rows** |
| §5.3 `git mv` × 38 | All 38 moved; staged as **R100** (exact renames) — history preserved at commit |
| §5.4 Insert 3 fields | `## ID` / `## Status` / `## Owner` added to all 38 |
| §5.5 Rewrite references | 168 path rewrites across 82 files; `wiki-vault/` untouched |
| §5.6 Brief cells → links | 28 sprint-plan Brief cells converted to real markdown links; all 28 resolve |

---

## Decision log

Every call made without asking, and why it qualified. Autonomy bound: ADR-019 discipline as carried
into this spawn — verified `CORRECT`, mechanical/localized, inside the approved plan, or an obvious
winner within the plan's intent.

### D-1 — Followed the plan's frozen ID table verbatim (in-plan)

Regenerated the mapping independently and diffed it against the plan's §2 table: **all 38 rows match
exactly**, including slugs. Implemented the table as written.

*Qualified:* implementing the owner-ratified table is the approved plan itself, not a judgment call.

### D-2 — 🚩 One row's ordering evidence is method-dependent — FLAGGED, not silently changed

The plan's §2 dates come from `git log --diff-filter=A` **without** `--follow`. Adding `--follow`
changes exactly **one** of the 38:

| Brief | no-`--follow` (plan used) | with `--follow` |
|---|---|---|
| `mobile-webgl-rendering.md` | 2026-06-03 → **0031** | 2026-05-07 |

It was created 2026-05-07 as `s4c-mobile-webgl-rendering.md` and renamed (R089) on 2026-06-03. So its
*content* predates the ID it received; under `--follow` it would sort to roughly `0024`, shifting
seven IDs.

**I did not change it.** The plan's §2 table is explicit and owner-ratified, and D2's own rationale
warns that IDs are permanent. Renumbering against a ratified table is a judgment call, not a
mechanical fix.

*Mitigation:* nothing is committed, so this is still cheap to reverse **now** and expensive after.
Surfaced to the driver for an owner ruling. The convention doc documents the no-`--follow` rule
explicitly, with its limitation, so the behaviour is at least written down rather than accidental.

### D-3 — 🚩 Collision the plan's §7 missed: a review file shares brief 0049's basename

`ai-agents/reviews/degraded-mode-full-ux-treatment.md` is a **review ledger**, not a task brief, and
shares a basename with migrated brief `0049`. Plan §7 checked basename collisions against `done/` and
`cancelled/` — not against `ai-agents/reviews/`.

A blind basename substitution would have rewritten that path to
`ai-agents/tasks/backlog/0049-.../brief.md` in 3 places, silently destroying a live reference to a
real file.

**Handled:** the rewrite is path-aware. The bare-mention rule refuses to match when preceded by `/`,
so any `<dir>/<name>.md` form is left alone unless it is explicitly a `tasks/backlog/` path.
Verified after the run: all 3 `reviews/…` references survive intact; the 2 genuine
`Task: ai-agents/tasks/backlog/…` references in those same files were correctly rewritten to 0049.

*Qualified as an obvious winner:* the alternative is a corruption bug. Fixing it stays inside the
plan's intent ("update every inbound link **to the 38 migrated briefs**") — a review file is not one
of the 38.

### D-4 — 🚩 Second collision: a stale reference embedding brief 0012's filename

Three places cite `s4-8d-b-task-personal-inbox.md`, a filename that **has never existed** on disk
(the real file was `8d-b-task-personal-inbox.md`). It embeds brief 0012's filename as a substring, so
a naive rewrite yields the corrupt `s4-0012-personal-inbox`.

Plan §7's collision check compared the 38 names *against each other* and found none; it did not
consider reference strings that embed a name.

**Handled:** the full stale token is rewritten to `0012-personal-inbox`. Locations:
`ai-agents/sprints/plan-sprint-4.md:44` and `:172`,
`ai-agents/knowledge-base/geoconflict-producer-knowledge-base.md:334`.

*Qualified as an obvious winner:* these are inbound references to a migrated brief (plan step 5's
stated scope), and the change also repairs a pre-existing broken reference.

### D-5 — Ordering bug in my own D5 pass, caught and fixed

My Brief-cell link conversion ran *before* the D-4 stale-name rewrite, so the `0012` cell in
`plan-sprint-4.md:44` was not recognised as a Brief cell and ended up a bare span rather than a link.
Caught by a post-run scan for Brief cells still holding bare `NNNN-slug` spans (exactly 1 hit); fixed
by hand to the D5 form. Re-scanned: zero remaining.

*Qualified:* correcting my own incomplete execution of an approved step.

### D-6 — Bare prose mentions become the folder name

Plan D5 says prose mentions "preserve the existing form (bare span stays a bare span)" but does not
say what text replaces a bare `foo.md`. I used the **folder name** (`` `0017-citizenship-earned` ``),
matching what `sprints/backlog.md` already puts inside its code spans. Path-shaped forms keep their
shape: `` `backlog/foo.md` `` → `` `backlog/0033-…/brief.md` ``.

*Qualified as an obvious winner:* it is the form already established in the repo, and it satisfies
verification 6 (no legacy `.md` filename survives).

### D-7 — Conventions `README.md` index row added

The new convention would otherwise be unlisted in the folder's own index. Added a row under a short
"Added by this project, beyond the scaffold's seven" heading, leaving the scaffold's seven-item table
and its "Seven conventions ship with the scaffold" sentence accurate.

*Qualified as an obvious winner within intent:* a convention nobody can find is not in force.

### D-8 — Plan §3 owner counts: label says 30, list enumerates 31

Plan §3's coder bucket is labelled "(30)" but enumerates **31** IDs. The enumeration is the complete
and non-overlapping one: 31 coder + 2 producer + 5 ambiguous = 38, each ID exactly once. Followed the
**enumeration**; treated "(30)" as a typo in the label.

*Qualified:* the enumerated set is unambiguous and total; no task was left unassigned or double-assigned.

### D-9 — Did NOT fix a pre-existing Prettier warning

`npx prettier --check src/server/MapPlaylist.ts` fails — but on **line 141**
(`constructor(...) { }` vs `{}`), untouched by me and already failing at `HEAD`. My edits are comment
lines 38–50.

*Qualified:* leaving it is the in-scope choice — `CLAUDE.md` forbids reformatting unrelated code in
the same change. Reported rather than silently absorbed.

### D-10 — Verification 8 cannot pass pre-commit; substituted an equivalent

Plan §6.8 asks for `git log --follow` on 3 migrated briefs. Nothing is committed, so `--follow` on the
**new** paths returns 0 commits — not a history loss, just nothing to follow yet.

Substituted: `git diff --cached -M --name-status` shows **38/38 as `R100`** (exact renames), which is
what makes git preserve history at commit; and `--follow` on each **old** path still walks its full
history. Reported as substituted, not as passed-as-written.

---

## Decision log — review round 1 (process-review step, 2026-08-10)

Run by a spawned `@fkit-coder` under the same declared-approval marker. Both fixes below carry an
**explicit owner disposition** relayed with the spawn, so neither rests on my own judgement; I
re-verified each claim against the working tree before editing. Full verdicts are in `review.md`'s
*Coder response*.

### D-11 — R1: corrected the verification-6 residual count (44 → 51)

**What changed:** the verification-6 section of this file, rewritten to itemise the residual into three
categories, state the exact grep and its exclusions, and disclose two counting variants.

**Which finding it answers:** R1 — the recorded figure of 44 omitted this worklog's own 7 references.

**Verified before applying:** re-derived the 38 legacy filenames from the staged renames and re-ran the
grep. The reviewer's 51 reproduces exactly as 41 + 7 + 3 **on a line count that excludes `review.md`**.
The finding is CORRECT.

**Why it qualified:** verified `CORRECT`; mechanical and localized to one section of my own worklog;
and it is a direct owner disposition ("correct it — the verification record outlives the session").

**One thing I did beyond the literal instruction, deliberately.** The owner said "fix it to 51". A bare
`51` would have been wrong again the moment anyone re-ran the grep, because the live tree now returns
**52 lines** (`review.md` quotes a legacy name) and **55 occurrences** (`grep -o`). Writing a number I
had already measured as not-reproducible would have recreated the exact defect the ruling exists to
prevent. So 51 stands as the ruled figure with its stated basis, and both variants are disclosed
beside it. Flagged to the driver rather than absorbed silently.

### D-12 — R2: rewrote the bare legacy identity to the folder name

**What changed:** `ai-agents/reviews/s4-citizenship-card-guest-cta-no-sdk.md:15` — the bare task
identity became `0049-degraded-mode-full-ux-treatment`.

**Which finding it answers:** R2.

**Verified before applying:** the line calls it "the follow-up task", so it names the migrated brief,
not the similarly-named review ledger. The finding is CORRECT. The same line also points at that
review ledger by path; I checked after editing that the pointer is untouched and still resolves.

**Why it qualified:** verified `CORRECT`; a one-token edit on one line; inside plan step 5 and squarely
inside my own D-6 rule; and an explicit owner disposition ("rewrite it").

### D-13 — 🚩 R2's defect class is bigger than R2 — 10 more occurrences, deliberately NOT fixed

Searching for the bare-identity form generally (the pattern the full-filename matcher could never
catch) found **13** occurrences outside `wiki-vault/` and outside this task's own files. Three are
correct as-is — two are review documents' own H1 titles matching their own filenames, and one was R2.
The remaining **10**, in `knowledge-base/s4-preexisting-infra-impact-2026-06-24.md` (7) and
`knowledge-base/pre-s4-player-infra-audit-2026-06-24.md` (3), are the same defect and remain unfixed.

**No fix applied, and this is a stop rather than an omission.** They are outside the approved plan and
outside the three dispositions — but more importantly they are **not mechanical**: six sit in elided
prose lists where the first token supplies the `s4-` prefix that later `-suffix` entries drop, so
rewriting the head token strands the rest. Some list members are done/cancelled tasks belonging to
task 0003. That is a broad, judgement-bearing edit, which the autonomy bound reserves for the owner.

Recorded in `review.md` as a new residual with the per-file breakdown, and surfaced to the driver.

### D-14 — R3: left the `🔄 In progress` status markers alone

Owner ruled accept-and-flip-at-close, explicitly "do not revert them". No change made. Recorded so the
producer closing this task knows the flip is still outstanding.

### D-15 — The 10 remaining bare identities: owner ruled DEFER (Option B)

**Which finding it answers:** the new residual I surfaced in D-13 (the R2 defect class, 10 occurrences
I stopped rather than fixing).

**Ruling (owner, via the driver, 2026-08-10):** **Option B — defer.** Recorded as an *accepted
residual* of task 0002; a **bare legacy identity sweep** runs as a follow-up **after task 0003**. The
owner accepted the reasoning that nothing dangles in the meantime, because these are prose mentions
rather than links.

**What changed:** nothing in the 10 files' content. The ruling is recorded in `review.md` — in the
residual section itself and as a shared *Accepted residuals* entry carrying both paths, the 7/3 counts,
the briefs referenced, and the hazard below, so the follow-up needs no re-derivation.

⚠️ **The hazard the follow-up must not miss.** Six of the ten sit in elided prose lists where only the
head token carries the `s4-` prefix and every later member drops it:

```
**s4 tasks impacted.** s4-yandex-payments-impl (sole writer), -citizenship-paid,
-yandex-catalog-registration, -profile-05, analytics-p1-citizenship-funnel, ...
```

Rewriting the head token to `0019-yandex-payments-impl` **strands every `-suffix` after it** — they are
readable only because the head supplies the prefix they elide. These lists must be rewritten **by hand,
as whole lists**; a pattern substitution corrupts them. And `-profile-05` is a **done-board** name
belonging to **task 0003's** surface, not 0002's — which is exactly why the sweep waits for 0003.

*Qualified:* an explicit owner ruling, recorded rather than decided by me.

### D-16 — R1 record-keeping deviation: escalated, and ratified

The owner's original disposition read "fix it to 51". I wrote 51 as the durable figure **and** disclosed
that a raw grep now returns 53 lines / 56 occurrences, with the reproducible command beside it (D-11).

**This was surfaced to the owner as a deviation, not absorbed silently, and was ratified on
2026-08-10.** The owner endorsed the reasoning: recording a number already measured as irreproducible
would recreate the very defect R1 exists to fix. Noted here and in `review.md` so the audit trail shows
the deviation was raised and ruled on.

### Ledger closed

`review.md` status set to **closed-out**: both defects fixed, R3 accepted, the Codex finding disproven,
and both follow-up dispositions recorded. No further verification run — nothing functional changed.

---

## Verification results

| # | Check | Result |
|---|---|---|
| 1 | No loose `.md` in `backlog/`; 49 dirs | **PASS** (0 loose, 49 dirs) |
| 2 | Every folder has `brief.md` | **PASS** (49/49) |
| 3 | No duplicate IDs across boards | **PASS** (49 folders, 0 dupes) |
| 4 | Folder name == `## ID` | **PASS** (49/49) |
| 5 | Status `🔲 Backlog` ×38; Owner in vocabulary | **PASS** (38/38 status; owners = 37 coder / 7 producer / 5 architect across all 49) |
| 6 | Legacy filenames gone outside `wiki-vault/` | **PASS with 3 documented exceptions** (51 residual lines, all correct) — see below |
| 7 | Sprint-plan links resolve | **PASS** for all 28 new links; 8 **pre-existing** broken links found in files I never touched |
| 8 | `git log --follow` history | **SUBSTITUTED** — see D-10 |
| 9 | Convention doc exists and states the rules | **PASS** |
| 10 | Lint | **eslint PASS (clean)**; Prettier flags one **pre-existing** issue — see D-9 |
| 11 | Tests | **PASS** — `MapPlaylist.test.ts` 11/11; full suite **82 suites / 621 tests, all green** |
| 12 | `git status` has no `wiki-vault/` | **PASS** |
| 13 | `dashboard.sh` before/after | **PARTIAL** — see below |

### On verification 6 — three exceptions, none a broken link

> **Corrected 2026-08-10 by review finding R1.** This section first recorded **44** residual hits. That
> was wrong: it omitted a whole category — **this worklog's own 7 references**. The correct figure is
> **51**. The count below is itemised and the measurement is reproducible, because a bare total in a
> record that outlives the session is what misled the last reader.

**How it is measured.** The 38 legacy filenames (with their `.md` extension) are derived from the
staged renames, then grepped repo-wide, counting **matching lines**:

```bash
git status --porcelain | grep '^R' | sed 's/^R[A-Z ]* //' \
  | awk -F' -> ' '{print $1}' | grep '^ai-agents/tasks/backlog/' \
  | sed 's|.*/||' | sort > legacy38.txt

grep -rnF -f legacy38.txt . \
  --exclude-dir=.git --exclude-dir=node_modules \
  --exclude-dir=wiki-vault --exclude-dir=static
```

`wiki-vault/` is excluded by D3. `static/` and `.fkit/` are excluded because both are **git-ignored**
build/scratch output (`.gitignore:4` and `:28`); `static/` holds stale webpack bundles that happen to
embed two legacy names, and nothing there is tracked.

| # | Category | Lines | Why keeping it is correct |
|---|---|---|---|
| 1 | This task's own `plan.md` | 41 | Its §2 ID table *must* name the old filenames to record what was migrated. I was instructed not to touch `plan.md`. |
| 2 | This task's own `worklog.md` — this file | 7 | Same reason: D-2/D-3/D-4 and this section have to name what moved in order to explain it. **This is the category R1 caught me omitting.** |
| 3 | References to `ai-agents/reviews/degraded-mode-full-ux-treatment.md` | 3 | A **review ledger**, not one of the 38 (D-3). It keeps its name, so pointers to it are live links, not stale ones. |
|   | **Total** | **51** | |

**Three counting caveats, so the next reader's grep agrees with this record:**

- **The count is self-referential.** This task's own artefacts are 48 of the 51. A record of a
  migration must name what it migrated, so this number can never reach zero while these files exist.
  Category 3 — three genuinely external lines — is the only part that describes the wider repo.
- **`review.md` adds more lines, and the number is not stable.** The review ledger has to quote legacy
  names to discuss the collision check and the residuals, so it contributes **2 lines / 3 occurrences
  as of review round 1** — a whole-tree grep therefore returns **53 lines** today, not 51. The ledger
  did not exist when the original count was taken, and it grows with every review round, which is
  precisely why it is kept out of the 51: **51 is the durable figure, 53 is today's raw grep.** A
  future round that pushes the raw number higher is the ledger growing, not the migration regressing.
- **Counting *occurrences* rather than lines gives 56** (`grep -o`) — `plan.md` has 43 on 41 lines and
  `review.md` 3 on 2 lines. The 51/53 figures are line counts.

The plan's amended wording said "zero hits outside `wiki-vault/`". Strictly, that is **still not met**;
substantively, every remaining hit is correct. Flagging rather than reclassifying as a clean pass.

### On verification 13 — the link fix works, but the rows are still not addressable

Before/after on `sprint-backlog.md`, same `dashboard.sh`, HEAD data vs working tree:

- **Before:** `` `backlog/monitoring-alert-bot-phase1.md` `` — a bare span naming a file that no longer exists.
- **After:** `` [`0033-monitoring-alert-bot-phase1`](../tasks/backlog/0033-monitoring-alert-bot-phase1/brief.md) `` — resolves.

So D5 did what it promised at the **cell** level. But the dashboard still reports **23 unrecognized,
0 addressable rows — unchanged before and after**, because it rejects the rows on their *status
marker* (`⬜ No sprint` ×21, `⏸ Parked` ×2) before ever reading the Brief cell.

**The D5 conversion is necessary but not sufficient.** These rows become addressable only once
**task 0004** reconciles the legacy status markers. Nothing here is blocked on 0002.

Separately, `plan-sprint-4.md` cannot be parsed by `dashboard.sh` at all — its heading is
`## Sprint 4 Status`, not `## Status`. Pre-existing, out of this task's scope, and owned by neither
0002 nor (as written) 0004.

---

## Handed off, not done here

- **`wiki-vault/` — 72 occurrences, 10 files.** D3 excludes them; only `@fkit-wiki` may write there.
  The plan estimated "8 wiki pages / 36 in `log.md`"; actual is **9 pages (12 occurrences) + `log.md`
  (60)**. Total 72 matches the plan. Page list is in the hand-off report.
- **`log.md` should stay unedited** per D3 — it is an append-only record of what happened on a day.
- **Plan §8's `## Sprint` free-form problem is real and still unowned** — confirmed on disk: 30 of the
  38 carry prose `## Sprint` values, 8 have none. Every one will read as drift once the rows parse.
