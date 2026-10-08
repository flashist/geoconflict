# Worklog — 0408: paid-only ad-free perk under its own sub-heading

Built by `fkit-coder`, spawned by `fkit-lead` (`fkit-sprint-ship-loop`, Sprint 7, step Build), 2026-10-08.
Implements the approved `plan.md` (blob `5fa54193b5fc28338b5a2c85261315e91bc3756b`, 10940 bytes — hash
re-checked before building). `plan.md` not touched. Nothing committed.

## Plan gate — owner answers (Verification step 1)

Both asked by the lead **live via `AskUserQuestion` in the lead session, 2026-10-08, answered by the
owner**; relayed to this worker in the Build spawn prompt. Recorded before any string was written.

| # | Question | Owner's answer (words) |
|---|---|---|
| 1 | EN text for `paid_only_title` | **`Paid citizenship only:`** |
| 2 | Drop the `benefit_no_ads` suffix? | **Yes, drop it.** → RU `Без полноэкранной рекламы перед матчами и после них`, EN `No full-screen ads before and after matches`, plus the "old suffix gone from both files" test |

RU `paid_only_title` = `Только для платного гражданства:` — the owner's exact words from the 2026-10-08
ruling (option 2), unchanged.

## What changed

- `src/client/CitizenshipExplainerModal.ts`
  - `benefit_no_ads` `<li>` removed from `#citizenship-explainer-benefits` (badge, name change and the
    conditional private-lobby line stay there, unchanged).
  - Directly after that list: `<h4 id="citizenship-explainer-paid-only-title">` (`paid_only_title`) and
    `<ul id="citizenship-explainer-paid-only"><li id="citizenship-explainer-benefit-no-ads">`. Always
    rendered, every offer state. Stable ids for `0409`.
  - New style rule `.modal-box h4 { margin: 4px 0 6px; font-size: 13px; font-weight: bold; color: rgba(255,255,255,0.85); }`.
    `.modal-box` box rule untouched (`0417`'s).
  - Class comment: one added sentence ("Paid-only perks sit under their own sub-heading (task 0408).").
- `resources/lang/en.json` — new `citizenship_explainer.paid_only_title` = `Paid citizenship only:`;
  `benefit_no_ads` = `No full-screen ads before and after matches`.
- `resources/lang/ru.json` — new `paid_only_title` = `Только для платного гражданства:`;
  `benefit_no_ads` = `Без полноэкранной рекламы перед матчами и после них`.
- `tests/client/CitizenshipExplainerLang.test.ts` — `paid_only_title` added to `REQUIRED_KEYS`
  (non-empty / placeholder parity / RU≠EN for free); new test pinning RU `paid_only_title` to the exact
  owner string; new test that neither file's `benefit_no_ads` carries the old suffix
  (`for bought citizenship only` / `только для купленного`).
- `tests/client/CitizenshipExplainerModal.test.ts` — `paid_only_title` added to "renders every built
  benefit"; new test "the ad-free line sits under the paid-only sub-heading, not in the all-citizens
  list" (contents of both lists + page order via `compareDocumentPosition`); new test "keeps the
  paid-only block when the private-lobby line is hidden". Existing private-lobby tests unchanged.

No other file. No server/core/nginx/HTML-template/analytics change. Prettier run on all five files.

## Verification evidence

1. **Targeted suites** — `npm test -- tests/client/CitizenshipExplainerLang.test.ts tests/client/CitizenshipExplainerModal.test.ts`:
   2/2 suites, **112/112 tests passed**.
   - **Mutation check:** temporarily put the `benefit_no_ads` `<li>` back into the all-citizens list →
     the new placement test failed (1 failed / 34 passed). Source restored from a copy afterwards; diff
     re-checked.
2. **Full `npm test`, run 1 — RED (1 test):** `tests/scripts/ShellHarnesses.test.ts › profile deploy
   hardening harness` — the wrapper's message: *"did not finish within 150000 ms and was killed"*. Every
   assertion it printed before the kill was ✅ (got as far as T12); no failed check. 210/211 suites,
   4197/4198 tests passed. Not `0197` (no `SIGSEGV`), not the supertest flake (the wrapper says so).
   That harness reads `nginx.conf` and deploy scripts — none touched by 0408 (both `nginx.conf` and the
   harness carry `0416`'s uncommitted edits, not mine).
   - Harness run **standalone**: `ALL PASS`, exit 0, **73 s** wall clock, 0 ❌.
   - **Re-ran the full suite (said so, per CLAUDE.md):** run 2 — **211/211 suites, 4198/4198 tests,
     exit 0**, 269 s.
   - Reading (likely, not proven): the harness is slow (73 s alone) and, under full-suite load with 4
     workers, crossed the 150 s deadline — the timing shape `0399` describes. Not caused by this task.
3. **`npm run lint`** — clean, exit 0.
4. **Strings** — RU `paid_only_title` reads exactly `Только для платного гражданства:`; EN `Paid
   citizenship only:`; en/ru key-set parity test green.
5. **Local visual check** (`npm run dev`, Playwright Chromium, guest session; popup opened by clicking
   the card's `#citizenship-explainer-link`). Screenshots in the gitignored `.playwright-mcp/`
   (`0408-en-desktop.png`, `0408-en-360.png`, `0408-ru-desktop.png`, `0408-ru-360.png`). Measured in
   the shadow DOM per case:

   | Case | Sub-heading + ad-free line fully visible, not clipped | No overlap | `h4` 13px vs `h3` 15px | Fits / scrolls |
   |---|---|---|---|---|
   | EN, 1280×900 | yes (scrollWidth = clientWidth) | yes | yes | fits (box 565px, no scroll needed) |
   | EN, 360×740 | yes | yes | yes | fits (box 605px) |
   | RU, 360×740 | yes | yes | yes | fits (box 665px) |
   | RU, 1280×900 | yes | yes | yes | fits (box 625px) |
   | RU, 360×560 (extra) | — | — | — | **scrolls**: overflow-y auto, scrollHeight 665 > clientHeight 504; Close reachable after scroll |

   All-citizens list in both languages showed exactly badge, name change, private lobby; ad-free line
   only under the new sub-heading. RU sub-heading fits on one line at 360px. Browser console: only the
   known, intentional `/flags/*.svg` 404s. Playwright's `lang` localStorage reset; browser closed; dev
   server stopped, ports 9000/3001/3002 confirmed free.
   - Not checked: a logged-in / citizen / buy-offer state in the browser (dev is a guest session). The
     block renders the same in every offer state — covered by the unit tests, not by eye.
6. **Live look** — after a later game deploy (build/verify split rule, 2026-09-29). Not done here.

## Decision log (calls made without asking)

- **Obvious-winner calls: none.** Every change is a step of the approved plan with the owner's two
  answers applied.
- **Review fixes applied unattended: none** (Build step; no review yet).
- Minor, mechanical, inside the plan: the new tests' exact wording/structure (the plan names their
  assertions, not their code) and running Prettier on the five changed files (no reflow beyond the new
  test).

## Verify (independent re-run)

2026-10-08, spawned Verify worker (fkit-sprint-ship-loop), current working tree. No source written.

1. `npm test -- tests/client/CitizenshipExplainerLang.test.ts tests/client/CitizenshipExplainerModal.test.ts`
   → **2 suites passed, 112 tests passed**, 0 failed.
2. Every other suite under `tests/` that reads `resources/lang/*.json` (grep for `lang/en.json`,
   `lang/ru.json`, `resources/lang`) — 15 suites: `LangCode`, `LangSvg`, `CitizenBadge`,
   `CitizenshipCard`, `CitizenshipRestartLang`, `CitizenshipStatusLang`, `InboxTemplateLang`,
   `LongSessionRefreshLang`, `NameChangeLang`, `NoGameNameInPlayerText`, `PrivateLobbyLang`,
   `TenureGrantLang`, `UsernameInput`, `UsernameLang`, `core/profile/CitizenshipCopy`
   → **15 suites passed, 380 tests passed**, 0 failed. (`LangSvg` prints its pre-existing
   "FLAG TESTS ARE DISABLED FOR NOW" warning — unrelated, by design.)
3. `npm run lint` → **exit 0**, no findings.
4. `node -e` parse of both files → **en.json and ru.json are valid JSON**; `citizenship_explainer`
   has **16 keys in each, identical sets** (none only-en, none only-ru), incl. new `paid_only_title`.

No flakes seen; nothing re-run. Full `npm test` (shell harnesses) **not** run — outside this verify's
scope; the 0416 changes also in the tree are not this task's.

## Process review — Round 1 (unattended fixes)

2026-10-08, spawned Process-review worker (`fkit-sprint-ship-loop`), under the owner's single plan approval.
Ledger: `review.md` Round 1, findings R1–R2 (both low, test hardening in `tests/client/CitizenshipExplainerLang.test.ts`).
No accepted residual or ADR in scope; no loop, no regression risk (tests only, no source or string change).

### Decision log

- **R1, fix applied without asking.** Finding: only RU `paid_only_title` was pinned exactly. Changed: the
  0408 exact-pin test now also asserts EN `paid_only_title` === `Paid citizenship only:`. Why it qualified:
  verified `CORRECT`; one added assertion in one test; in plan §Tests (pin the owner's words) and the string
  is the owner's own 2026-10-08 answer.
- **R2, fix applied without asking.** Finding: the suffix-drop test only rejected the old wording, so a suffix
  re-added in new words passed. Changed: that test's two `not.toMatch` checks became exact `toBe` pins of
  both `benefit_no_ads` values to the owner-approved strings (strictly stronger; renamed the test to match).
  Why it qualified: verified `CORRECT`; one test body; in plan §Tests (guard against half-applying the
  suffix drop) and the strings are the owner's own answer.
- **Obvious-winner calls: none.**

### Evidence

- Mutation check (lang files backed up first, restored after; SHA-1 identical before/after): EN
  `paid_only_title` → `For paid citizens only:` and RU `benefit_no_ads` + `— только для платного
  гражданства` → both 0408 lang tests red (2 failed / 75 passed). The RU mutation would have passed the old
  test. After restore: 77/77.
- `npm test -- tests/client/CitizenshipExplainerLang.test.ts tests/client/CitizenshipExplainerModal.test.ts`
  → 2 suites, 112/112 passed.
- `npm run lint` → exit 0.
- Prettier: file unchanged by `prettier --write`.
- Full `npm test` not re-run (test-only change to one already-green suite).
