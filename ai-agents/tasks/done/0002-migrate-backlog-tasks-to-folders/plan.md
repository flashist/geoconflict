# Plan — Task 0002: Migrate `tasks/backlog/` to the fkit task-folder convention

> **Approval provenance.** Produced by a spawned `@fkit-coder` (plan step only) and **approved by the
> owner via `AskUserQuestion` on 2026-08-10** in the `fkit-sprint-ship-loop` driving session.
> Owner selected *"Approve as written"* and ratified every decision below: **D2 git-first-commit-date
> ordering**, **D3 wiki-vault verification amendment**, **D5 Brief-cell link conversion**, and the
> coder's defaults for the **5 ambiguous owners**.
>
> ⚠️ Approval leaves no artifact of its own (ADR-021). This file is the driver's verbatim copy of the
> approved text, written at the moment of approval and before the Build spawn.

## 0. Decisions I resolved, and why — read these first

Four of these change what "done" means. Approving this plan ratifies them.

### D1 — IDs start at `0012`, not `0005` and not `0010`

The brief contradicts itself. `## What to build` step 2 says `0005`+; `## Context` says `0010` **and** says *"Do not hardcode that number — derive the maximum from the folder names on disk."*

**I follow the Context rule.** It is the self-aware one (it anticipates its own staleness), and both hardcoded numbers are now stale. Disk right now: `ai-agents/tasks/backlog/` holds folders `0001`–`0011`; `done/` and `cancelled/` hold no numbered folders at all. Derived max = `0011` → allocation starts at **`0012`**, ending at **`0049`**.

### D2 — Ordering by git first-commit date, not by in-file date ⚠️ deviates from the brief's recommendation

The brief *recommends* "oldest-first by the date evidence already in each brief, falling back to filename sort where no date is present." I measured that rule and it produces a bad chronology:

- **21 of 38 briefs contain no date at all** → over half the set falls to filename sort, which is alphabetical noise, not chronology.
- **3 briefs carry a date that postdates their creation.** `s4-player-profile-store-impl.md` reads `2026-06-13` in-file but was added `2026-04-21`; same pattern for `s4-citizenship-earned.md` and `s4-yandex-payments-impl.md`. The in-file date is a later revision note, so the recommended rule would place the three *oldest* Sprint-4 briefs in the middle of the sequence.

`git log --diff-filter=A` gives a real creation date for **all 38**, with zero gaps. I use it, tie-broken by filename for same-day adds.

This matters because **IDs are permanent and never renumbered** — a wrong order is not cheaply undone. The brief says "Recommended", so this is within my discretion, but I am flagging it rather than burying it.

### D3 — `ai-agents/wiki-vault/` is out of my edit surface, so verification step 6 cannot pass as written 🚩

72 of the 269 legacy-filename occurrences live under `wiki-vault/` — 36 in `log.md` alone, plus 8 wiki pages. **Only the `fkit-wiki` role may write there** (hard rule, `CLAUDE.md`). So the brief's verification step 6 — *"a repo-wide grep for the 38 old filenames returns zero hits"* — is **unachievable by this task**. Resolution:

- **Amend verification 6** to: zero hits **outside `ai-agents/wiki-vault/` and outside `git log`**.
- **`wiki-vault/log.md` should stay unedited even by `fkit-wiki`** — it is an append-only record of what happened on a given day. Rewriting yesterday's log entry to today's path falsifies the record.
- **The 8 wiki *pages*** get a follow-up hand-off to `@fkit-wiki` after this task, not before. I will name the exact files in the hand-off report.

### D4 — I update *links inside* `done/`/`cancelled/`, but migrate nothing there

Step 5 ("update every inbound link… anywhere a repo-wide grep finds them") and step 6 ("do not touch `done/` or `cancelled/` — that is 0003") collide: ~40 files in those two folders cite migrated backlog briefs.

**Reading I follow:** step 6 forbids *structurally migrating* those briefs. Step 5 requires *fixing a stale path inside* them. These do not conflict with task 0003 — 0003 will `git mv` those files, and a rename does not clash with a line-level edit already on disk.

### D5 — Sprint-plan brief cells become real markdown links

The legacy plans reference briefs as bare code spans (`` `s4-citizenship-earned.md` ``) with no path. Even after migration, a bare span is not addressable — and `dashboard.sh` reads *"the plan and the briefs it links"* (its own contract line, `.claude/skills/fkit-status/dashboard.sh:24`), taking the brief cell from the table row. Bare spans are exactly why the brief says *"none of that machinery can address a task."*

So: **in sprint-plan table Brief cells**, write the linked form already established by `sprints/backlog.md`:
`` [`0017-citizenship-earned`](../tasks/backlog/0017-citizenship-earned/brief.md) ``
**In prose mentions elsewhere**, rewrite the path in place and preserve the existing form (bare span stays a bare span).

**No conflict with task 0004:** 0002 touches the **Brief** column, 0004 touches the **Status** column.

## 1. Files and scope

| Area | Occurrences | Action |
|---|---|---|
| `ai-agents/tasks/backlog/` (38 flat `.md`) | — | `git mv` into `NNNN-slug/brief.md`; add 3 fields |
| `ai-agents/tasks/` (done/cancelled/other briefs) | 94 | link text only (D4) |
| `ai-agents/sprints/` | 61 | `sprint-backlog.md` (15 files), `plan-sprint-4.md` (14), `plan-sprint-4c.md` (4), `done/plan-sprint-4b.md` (1) |
| `ai-agents/knowledge-base/` | 23 | incl. `architecture.md`, 2 ADRs, findings docs |
| `ai-agents/reviews/` | 11 | **not in the brief's list** — 6 files; must be included |
| `src/` + `tests/` | 8 | comment-only, 7 files |
| `profile-backup.sh` (repo root) | 1 | comment-only |
| `ai-agents/wiki-vault/` | 72 | **excluded — hand off to `@fkit-wiki`** (D3) |

**Stale in the brief's step-5 list:** `plan-index.md`, `plan-sprint-5.md`, and `plan-sprint-6.md` contain **zero** references to the 38. I will not touch them.

## 2. The ID table (derived, D1 + D2)

| ID | added | legacy file | new folder |
|---|---|---|---|
| 0012 | 04-11 | `8d-b-task-personal-inbox.md` | `0012-personal-inbox` |
| 0013 | 04-21 | `s4-player-profile-store-impl.md` | `0013-player-profile-store-impl` |
| 0014 | 04-21 | `s4-yandex-catalog-registration.md` | `0014-yandex-catalog-registration` |
| 0015 | 04-21 | `sec10-remove-password-deploy-fallbacks.md` | `0015-remove-password-deploy-fallbacks` |
| 0016 | 04-21 | `sec11-secret-management-beyond-env-files.md` | `0016-secret-management-beyond-env-files` |
| 0017 | 04-22 | `s4-citizenship-earned.md` | `0017-citizenship-earned` |
| 0018 | 04-22 | `s4-citizenship-paid.md` | `0018-citizenship-paid` |
| 0019 | 04-22 | `s4-yandex-payments-impl.md` | `0019-yandex-payments-impl` |
| 0020 | 04-29 | `analytics-p1-ad-impression-tier.md` | `0020-analytics-p1-ad-impression-tier` |
| 0021 | 04-29 | `analytics-p1-citizenship-funnel.md` | `0021-analytics-p1-citizenship-funnel` |
| 0022 | 05-01 | `s4-win-check-multiplayer-regression-investigation.md` | `0022-win-check-multiplayer-regression-investigation` |
| 0023 | 05-02 | `streamer-program.md` | `0023-streamer-program` |
| 0024 | 05-07 | `ux-quick-message-access.md` | `0024-ux-quick-message-access` |
| 0025 | 05-09 | `s4-licensing-asset-audit.md` | `0025-licensing-asset-audit` |
| 0026 | 05-11 | `s5-fix-compact-map-shore-generation.md` | `0026-fix-compact-map-shore-generation` |
| 0027 | 05-11 | `s6-new-maps-community-demand.md` | `0027-new-maps-community-demand` |
| 0028 | 05-12 | `content-hint-videos-production.md` | `0028-content-hint-videos-production` |
| 0029 | 05-12 | `s5-hint-videos-in-game.md` | `0029-hint-videos-in-game` |
| 0030 | 06-01 | `s4-archive-s3-backed-citizen-gated.md` | `0030-archive-s3-backed-citizen-gated` |
| 0031 | 06-03 | `mobile-webgl-rendering.md` | `0031-mobile-webgl-rendering` |
| 0032 | 06-03 | `s4-investigate-null-id-errors.md` | `0032-investigate-null-id-errors` |
| 0033 | 06-04 | `monitoring-alert-bot-phase1.md` | `0033-monitoring-alert-bot-phase1` |
| 0034 | 06-04 | `monitoring-alert-bot-phase2.md` | `0034-monitoring-alert-bot-phase2` |
| 0035 | 06-06 | `worker-init-timeout-map-refetch.md` | `0035-worker-init-timeout-map-refetch` |
| 0036 | 06-11 | `bots-skip-sam-when-nukes-disabled.md` | `0036-bots-skip-sam-when-nukes-disabled` |
| 0037 | 06-12 | `fix-fusetag-dead-polling-loop.md` | `0037-fix-fusetag-dead-polling-loop` |
| 0038 | 06-12 | `fix-gutterads-usermeresponse-unsubscribe.md` | `0038-fix-gutterads-usermeresponse-unsubscribe` |
| 0039 | 06-13 | `bots-hydrogen-bomb-sam-penetration-investigation.md` | `0039-bots-hydrogen-bomb-sam-penetration-investigation` |
| 0040 | 06-13 | `bots-nuke-saturation-sam-overwhelm.md` | `0040-bots-nuke-saturation-sam-overwhelm` |
| 0041 | 06-13 | `s4-map-population-army-labels.md` | `0041-map-population-army-labels` |
| 0042 | 06-13 | `s4-starting-gold-public-modifier.md` | `0042-starting-gold-public-modifier` |
| 0043 | 06-20 | `defense-post-range-always-visible.md` | `0043-defense-post-range-always-visible` |
| 0044 | 06-20 | `infinite-gold-force-no-nukes-public-rotation.md` | `0044-infinite-gold-force-no-nukes-public-rotation` |
| 0045 | 06-22 | `sec12-vps-registry-credential-hygiene.md` | `0045-vps-registry-credential-hygiene` |
| 0046 | 06-23 | `s4-feedback-remove-contact-field.md` | `0046-feedback-remove-contact-field` |
| 0047 | 06-24 | `sec13-deploy-transport-secret-hygiene.md` | `0047-deploy-transport-secret-hygiene` |
| 0048 | 06-28 | `compliance-152fz-notification-consent.md` | `0048-compliance-152fz-notification-consent` |
| 0049 | 07-02 | `degraded-mode-full-ux-treatment.md` | `0049-degraded-mode-full-ux-treatment` |

**Slug rule (generalized from the brief).** The brief names only `s4-` / `s5-` / `sec12-`; the real prefix set on disk is wider. I strip, in order: `s4c-`, `s4-`, `s5-`, `s6-`, `sec<NN>-`, `8d-b-task-`. Everything else is kept verbatim.

⚠️ **Consequence: the sec-series numbering disappears from filenames.** `sec10`–`sec13` are cited as a group ("the sec10–sec13 security items") in `0001`'s brief and in `done/sec00-incident-index.md`. After migration only the H1 and body text carry the linkage. The brief explicitly instructs dropping `sec12-`, so I follow it — but this is a real, permanent loss of a human-readable grouping, and I would rather you see it now than discover it later.

## 3. Owner assignment (judgment — not automated, per the brief)

**`fkit-coder` (30):** 0012, 0013, 0015, 0017, 0018, 0019, 0020, 0021, 0022, 0024, 0026, 0029, 0030, 0031, 0032, 0033, 0034, 0035, 0036, 0037, 0038, 0039, 0040, 0041, 0042, 0043, 0044, 0045, 0046, 0047, 0049.

**`fkit-producer` (2):** 0023 (streamer program — product/parking lot), 0027 (new-maps community demand — a demand tracker).

🚩 **Genuinely ambiguous (5) — listed here per the brief's instruction, with my default:**

| ID | Brief | Why ambiguous | Default I'd write |
|---|---|---|---|
| 0014 | Yandex catalog registration | `plan-sprint-4.md:22` calls it *"manual, non-engineering"* — it is your action, and no role in the seven-role vocabulary means "the owner" | `fkit-producer` |
| 0016 | Secret management beyond env files | Strategy/architecture selection, not a build | `fkit-architect` |
| 0025 | AGPL build-pipeline audit | Licensing/legal judgment over a build pipeline — spans architect and producer | `fkit-architect` |
| 0028 | Hint videos content production | *"content production task (Mark), no engineering dependency"* — again a you-task with no role | `fkit-producer` |
| 0048 | 152-ФЗ notification + consent | Section header reads *"legal investigation (personal action)"* | `fkit-producer` |

The pattern behind four of five: **`task-owner-vocabulary.md` has no value for "the owner does this personally."** I am not proposing to amend it inside this task — flagging it as a gap.

> **Owner ruling (2026-08-10, plan gate):** defaults accepted as tabled. All five remain listed as
> ambiguous in the hand-off report.

## 4. Field insertion rule

Target order matches the reference briefs (`0001`, `0005`, `0010`): `# H1` → `## ID` → `## Sprint` → `## Priority` → `## Status` → `## Owner` → body.

None of the 38 has any of the three fields today. 30 have `## Sprint`, 33 have `## Priority`. So:

- `## ID` — inserted immediately after the H1.
- `## Status` + `## Owner` — inserted after `## Priority`; if absent, after `## Sprint`; if both absent (5 files), immediately after `## ID`.
- `## Status` value is exactly `🔲 Backlog` for all 38.
- Every other section is left byte-identical, including the bespoke `## Experiments` / `## Scope` / `## Locked Decisions` / `## Part A–G` blocks.

## 5. Sequencing

1. **Write the convention doc** — `ai-agents/knowledge-base/conventions/task-id-allocation.md`. States: allocation order (git first-commit date, tie-break filename), IDs are never reused or renumbered, folder name is authoritative and `## ID` is the second carrier, and how to derive the next ID from disk. Clears the conventions `README.md` four-part bar: read on a normal run (every new brief), prescriptive, enforceable (scripted duplicate-ID check), not already covered. Adds a "Related" cross-link to `priority-is-rank-not-identity.md`, which already asserts the folder-name ID is identity.
2. **Generate the mapping table** with a script and freeze it to a scratch file — every later step reads the same frozen map, so no step can re-derive a different order.
3. **`git mv` all 38** into `NNNN-slug/brief.md`.
4. **Insert the three fields** into each `brief.md`.
5. **Rewrite references** in the six areas of §1, longest-filename-first, `wiki-vault/` excluded.
6. **Rewrite sprint-plan Brief cells to linked form** (D5).
7. **Verify** (§6).
8. **Hand-off report** — ambiguous owners, the `@fkit-wiki` follow-up list, the amended verification-6 wording.

Steps 1–7 are one uncommitted working-tree change. **No commit, no push** unless you ask.

## 6. Verification

Brief steps 1–9, with 6 amended per D3:

1. `ls ai-agents/tasks/backlog/*.md` → no matches; 49 directories.
2. Every folder has a `brief.md` — scripted `test -f` over all 49.
3. No duplicate IDs — extract `NNNN` from all folders across the three boards, `sort | uniq -d` is empty.
4. Folder name vs `## ID` agree — scripted, zero mismatches across all 49.
5. All 38 have `## Status` exactly `🔲 Backlog`; every `## Owner` is one of the seven roles in `task-owner-vocabulary.md`.
6. **(amended)** Repo-wide grep for the 38 old filenames, excluding `.git/`, `node_modules/`, and **`ai-agents/wiki-vault/`** → zero hits. Wiki-vault's 72 hits are reported, not fixed.
7. Every markdown link target in the sprint plans resolves — scripted `test -f` per extracted link.
8. `git log --follow` on 3 sampled migrated briefs shows preserved history.
9. The convention doc exists and states allocation order, never-reuse, and folder-name-authoritative.

Plus, because §1 touches source:

10. `npm run lint` clean. Changes are comment-only in `src/core/configuration/DefaultConfig.ts`, `src/core/profile/PlayerProfile.ts`, `src/core/profile/Citizenship.ts`, `src/server/MapPlaylist.ts`, `src/server/Archive.ts`, `src/client/LocalServer.ts`, `tests/server/MapPlaylist.test.ts`, `profile-backup.sh` — but Prettier can reflow a comment, so lint runs.
11. `npm test -- tests/server/MapPlaylist.test.ts`, then full `npm test`. I expect no behavior change; I will report the actual result either way.
12. `git status` shows only the intended paths and **no `wiki-vault/` entry**.
13. `bash .claude/skills/fkit-status/dashboard.sh ai-agents/sprints/plan-sprint-4.md` — a before/after comparison, to confirm the D5 link rewrite actually made those rows addressable rather than merely different.

## 7. Edge cases and failure modes

**Checked and clear:**

- **Relative links inside the migrated briefs.** Depth increases by one (`backlog/x.md` → `backlog/NNNN-x/brief.md`), so any `../` link inside a brief would silently break. **Verified: zero of the 38 contain a relative or repo-root markdown link.** Risk is nil, not merely unlikely.
- **Filename substring collisions.** A blind rewrite of a stem contained inside another stem would corrupt the longer one. **Verified: zero collisions among the 38.** I still rewrite longest-first as belt-and-braces.
- **Same basename on another board.** A repo-wide rewrite would misfire if e.g. `done/mobile-webgl-rendering.md` existed. **Verified: zero of the 38 basenames appear in `done/` or `cancelled/`.**
- **Case-only renames** (a macOS/git hazard): none — every slug is already lowercase.

**Real risks:**

- **The `.md` suffix moves.** `foo.md` → `0031-foo/brief.md`. A naive `s/foo/0031-foo/` leaves a dangling `.md`. Rewrite matches the **full filename including extension** and substitutes the full new path.
- **Two reference shapes.** Bare code spans dominate the legacy plans; real markdown links dominate `sprints/backlog.md`. Both need handling, and D5 converts one class deliberately.
- **`sprint-backlog.md` is being retired by task 0001** (15 of my 61 sprint-area edits land there). If 0001 runs first that work is wasted; the board's execution order is `0002 → 0003 → 0001 → 0004`, and your 2026-08-10 ruling is `0002 → 0003 → 0004`. Either way 0002 is first, so I update it. Noting it so the redundancy is expected, not surprising.
- **Scripted-then-hand-checked, not blind.** The mapping is generated once and frozen; the `## Owner` field is written by hand per brief, never automated.

## 8. Out of scope — but discovered, and you should know

🚩 **`## Sprint` is free-form prose in 30 of the 38 briefs, and missing entirely in 8.** Real values include *"Sprint backlog — no sprint home yet. Bot-behaviour quality improvement; needs a sprint home before implementation."* and *"Backlog — no sprint. Deferred out of Sprint 4c on 2026-06-03: high implementation"*. `dashboard.sh` drift rule 1 compares a brief's `## Sprint` against the plan's sprint name, so **every one of these will read as drift** once the briefs are addressable. This task does not fix it (it is instructed to leave existing content alone), and it is not task 0004's scope either (0004 is status markers). **This is a gap with no task.** Recommend a new brief.

Also out of scope, correctly:

- Adding the 38 to `sprints/backlog.md` — that is task 0001.
- Any Status-cell change in a sprint plan — task 0004.
- Migrating `done/` or `cancelled/` — task 0003.
- Any `wiki-vault/` write — `fkit-wiki` only (D3).

## 9. Open questions for the owner

The driver has the owner channel; I do not. Four questions, each with a default so the plan can proceed if you simply approve it:

1. **Ordering rule (D2)** — accept git-first-commit-date ordering, or hold to the brief's recommended in-file-date rule despite 21/38 having no date? *Default: git date.* Irreversible once IDs are written.
2. **Verification 6 (D3)** — accept the amended wording excluding `wiki-vault/`, and a separate `@fkit-wiki` follow-up for the 8 wiki pages, leaving `log.md` untouched as history? *Default: yes.*
3. **Sprint-plan Brief cells (D5)** — convert bare code spans to full markdown links so `dashboard.sh` can resolve them? *Default: yes — this is the task's stated purpose.*
4. **The 5 ambiguous owners (§3)** — accept my defaults, or rule on them? *Default: as tabled.* Related: the owner vocabulary has no value for "the owner does this personally," which four of the five need.

> **All four answered by the owner on 2026-08-10 at the plan gate:** (1) git first-commit date;
> (2) yes — amend verification 6, exclude `wiki-vault/`, queue the `@fkit-wiki` follow-up;
> (3) yes — convert Brief cells to real markdown links; (4) accept the tabled defaults.
