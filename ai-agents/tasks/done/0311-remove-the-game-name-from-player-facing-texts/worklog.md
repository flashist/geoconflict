# 0311 — worklog

## Build (2026-09-28) — fkit-coder, spawned by `fkit-sprint-ship-loop` (Build worker)

Approved plan: `plan.md`, blob `c2a88d6f041e19b6e9596caf7aa26f9ae382907c` (11673 bytes), hash re-checked
before any edit — matches.

### Step 0 — owner rulings, verbatim (recorded before any edit)

Owner rulings (2026-09-28, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead):

- **Q1 (already-sent messages):** "Yes, old ones update too (Recommended)" — Nothing extra to build.
- **Q2 (tab title / header / install name):** "Yes, others fall back to English (Recommended)" — Neutral title; the 31 non-en/ru languages show 'Online strategy'. No unchecked translations. ⇒ all Q2-conditional steps apply; `main.title` is deleted from the 31 other lang files.
- **Q3 (wording):** "Approve all as written (Recommended)" — use exactly the §2 table texts (asked three times; the owner first asked to see all texts in full, which were then shown verbatim in the question).
- **Q4 (guard scope):** "Wide check (Recommended)" — All en/ru texts, titles, install name and news feed. ⇒ the `announcements.json` check applies.
- **Plan approval:** "Approve (Recommended)" — 2026-09-28.

### Decision log

- **Test first.** Added `tests/client/NoGameNameInPlayerText.test.ts` (plan step 1, wide scope per Q2 +
  Q4). Run on the unedited files: **6 failed, 3 passed** — en walk (3 keys), ru walk (3 keys),
  `main.title` across lang files (31 hits incl. en/ru), both `<title>` tags, manifest. Passing on
  today's files, as expected: the matcher self-check, "en/ru still define `main.title`", and the news
  feed (it has no name today — the check is a guard for future entries).
- **Obvious-winner call, within plan intent:** the plan's matcher `/geo[\s-]*conflict|гео[\s-]*конфликт/i`
  does not catch B4 (the upstream name in `ar`/`ko`/`tp` `main.title`), which the plan itself lists
  as a page-title problem and removes. Added a second matcher, applied **only to `main.title`**, for
  the upstream name (`/opent?[\s-]*front|openpon|오픈\s*프론트/i` — `opent?` because `ar` spells it
  "OpentFront"). Not applied to the en/ru-wide walk, so the kept upstream credit ("Based on OpenFront",
  plan §3) is untouched. Without it, putting "OpenFront (ALPHA)" back in `ar` would pass the guard.
- **Added an extra assertion** that en and ru still define `main.title` — the fallback the other 31
  files now rely on (Q2). Deleting it from en would otherwise make the title show the raw key
  `main.title`, and the "absent or name-free" check alone would pass that.
- **Texts:** A1–A4, B1, B2, B6–B8 set to exactly the plan §2 table texts (Q3).
- **`main.title` deletion: 29 files, not 31.** Of the 31 non-en/ru files, `pt-BR.json` and
  `debug.json` never had the key (plan §1 B5). In all 29 others it was the first key of `main` and
  followed by another key, so the single line was deleted with no comma change. Verified: each file
  still parses, and equals its pre-edit JSON minus `main.title`; `git diff --numstat` shows `0 1` for
  all 29.
- **`TenureGrantLang.test.ts`:** the owner-approved-copy assertion updated to the new body (en + ru).
- **Formatting:** prettier flags 26 lang files and both HTML templates — the same 28 files it flags at
  `HEAD`. Pre-existing; not reformatted (key-level edits only, per plan step 3).
- **Uncommitted 0250/0303/0314 work** in `en.json`, `ru.json` and both HTML templates left in place —
  all edits were exact-string replacements on the lines named above.
- **Fixes applied without asking during review processing:** none (build step only).

### Verification

- New guard: red on today's files (6 failed / 3 passed), green after the edits.
- Targeted suites green: `NoGameNameInPlayerText`, `TenureGrantLang`, `InboxTemplateLang`,
  `CitizenshipCopy`, `LangCode`, `LangSvg`, `LangSelectorRerender`, `Inbox`, `NameChangeLang`,
  `PrivateLobbyLang`, `CitizenshipRestartLang`.
- `npm test`: 163/163 suites, 2757/2757 tests, exit 0, first run (no supertest flake, no re-run).
- `npx tsc --noEmit`: exit 0. `eslint` on the two touched test files: clean.
- `npm run lint` (whole repo): 1 error, the known untracked 0325 helper `s0-hmac-check.mjs` parse
  error — not from this task, not fixed.
- Grep over lang files, manifest, news feed and both templates: only the canonical domain
  link and the `GeoConflictFavicon.svg` filename remain (both excluded by plan §3).
- **Not verified:** plan step 8, the by-eye check of an already-sent `citizenship_earned` message and
  the tenure popup in a running client (needs a local profile server and a seeded message; not run by
  this spawned worker). The template-at-view-time path is structural only.

## Review round 1 — process-review (2026-09-28) — fkit-coder, spawned by `fkit-sprint-ship-loop` (Process-review worker)

Approved plan blob re-checked: `c2a88d6f041e19b6e9596caf7aa26f9ae382907c` — matches.

### Decision log

- **Fix applied without asking — answers review R1** (the guard's upstream-name matcher covered only
  `main.title`, so `<title>OpenFront</title>` or manifest `short_name: "OpenFront"` passed).
  - **What changed:** `tests/client/NoGameNameInPlayerText.test.ts` only — the `<title>` check and the
    manifest `name`/`short_name` check now also assert `not.toMatch(UPSTREAM_NAME)`; the comment above
    `UPSTREAM_NAME` now says it covers the page title and install name, and why it is not applied to the
    en/ru walk or the news feed (the kept upstream credit "Based on OpenFront", plan §3). No source,
    lang, HTML or manifest file changed.
  - **Why it qualified:** verified `CORRECT` by reading the test (both checks tested `GAME_NAME` only,
    while its own comment said the page title "must carry neither"); mechanical/localized (two added
    assertions + a comment, one test file); inside the approved plan (step 1 — the guard — and the B4
    upstream-name problem the plan names). Obvious winner: no alternative carries a cost.
  - **Not done, on purpose:** en/ru walk and news feed not extended to `UPSTREAM_NAME` (the reviewer
    disproved that — it would flag the kept upstream credit).
- **Evidence:** scratch mirror of the test + lang files, manifest, news feed and both templates (repo
  files never mutated). 4 mutations each fail exactly their one test (1 failed / 8 passed); the pre-fix
  assertions on the same mutations pass 9/9 (R1 reproduced); restored mirror 9/9. Real repo: suite 9/9;
  eslint and prettier clean on the test file; `npm test` 163/163 suites, 2757/2757 tests, exit 0 on the
  first run (no flake, no re-run).
- **Obvious-winner calls other than the above:** none.
- **Still not verified:** plan step 8, the by-eye check (unchanged from Build).
- Ledger set to `Status: closed-out` — R1 done, nothing blocking remains.
