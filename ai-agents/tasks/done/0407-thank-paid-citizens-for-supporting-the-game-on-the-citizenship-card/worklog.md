# 0407 — worklog

## 2026-10-08 — Build (fkit-coder, spawned by `fkit-sprint-ship-loop`, Sprint 7)

**Mode:** Build worker under the sprint loop's declared-approval marker. Approved plan: `plan.md`, blob
`1af8db2088267c606f0bb05c07a5d02e4af54fb3` (checked with `git hash-object` before building; 10237 bytes). Built
**plan §3 Option A + §4 tests only**. B and C not built.

### Owner answers (design gate, brief Step 1)

Who: the owner. Date: 2026-10-08. Channel: live `AskUserQuestion` in the lead (`fkit-lead`) session, relayed in the
spawn prompt; already recorded in the brief's `## Design approval (Step 1 gate)` section.

- Q1 placement: **"A: One line, no ✓"** — rewrite `citizenship_status.verified_paid`; this ruling replaces the `0397`
  wording.
- Q2 wording: EN `Thank you for supporting the game! Your paid citizenship benefits are on.` / RU
  `Спасибо, что поддерживаете игру! Преимущества платного гражданства включены.`
- Q3 look: **"Same as status lines"** — no style change.
- Q4 defaults: **"Accept all five"** — no thank-you for unverified paid; hides with the card; paid + earned still
  sees it; start screen only; no analytics event.

### Changes

| File | Change |
|---|---|
| `resources/lang/en.json` | `citizenship_status.verified_paid` → approved EN text (✓ dropped). Key name kept. |
| `resources/lang/ru.json` | `citizenship_status.verified_paid` → approved RU text (✓ dropped). Key name kept. |
| `tests/client/CitizenshipStatusLang.test.ts` | `APPROVED.verified_paid` → new EN/RU text; header comment notes the 0407 ruling (2026-10-08) replaced the 0397 wording. |
| `src/client/CitizenshipCard.ts` | Comments only: class doc + comment above `renderStatusNotice()`. No logic change. |
| `src/client/CitizenshipNotice.ts` | Doc comment for `verified_paid` only. No logic change. |
| `tests/client/CitizenshipCard.test.ts` | New `describe("paid thank-you (task 0407)")` inside the 0397 status-line block, 10 tests (below). |

Not touched: `CitizenshipExplainerModal.ts` (0417), `CitizenshipStatus.ts`, the profile read, the ad gate, analytics,
`plan.md`, the brief. Uncommitted 0408/0409/0416 hunks in the same files were left as they were (checked with
`git diff`: the only new hunks in `CitizenshipCard.ts` are the two comment edits).

### New tests (who sees the thank-you)

Shown: verified paid citizen below the XP threshold (xp 25); verified paid citizen above the threshold (xp 150).
Not shown: verified earned-only; unverified earned; unverified claiming paid; failed read; guest; still checking;
kill switch off (with a verified paid read); `citizenship_ui` off (with a verified paid read).
Already there and still green: the verified-paid line test, the unverified-claiming-paid test, the purchases-reconciled
re-read (failed → verified paid, no reload). `CitizenshipNotice.test.ts` unchanged (no logic change), run as a guard.

### Evidence

- Named suites — `npm test -- tests/client/CitizenshipStatusLang.test.ts tests/client/CitizenshipCard.test.ts
  tests/client/CitizenshipNotice.test.ts tests/client/LangSelectorRerender.test.ts`: **4/4 suites, 276/276 tests
  passed.**
- `npx tsc --noEmit`: exit 0. `npm run lint`: exit 0.
- Full `npm test`: exit 0, **211/211 suites, 4238/4238 tests passed**, 225.9 s, first run (no re-run). No skipped
  suites, so the Docker-probed shell harness ran. No `SIGSEGV`, no `Exceeded timeout`.
- Non-vacuous (each break run, seen red, then restored; `cmp` + `shasum` confirmed byte-identical restore):
  1. `CitizenshipCard.ts`: `verified_paid` branch → `return nothing;` → both "sees it" tests **failed** (2 failed,
     8 passed).
  2. `CitizenshipNotice.ts`: `verified` case → always `"verified_paid"` → "verified earned-only: not shown"
     **failed** (1 failed, 9 passed).
  3. `ru.json`: put the old 0397 text back → `verified_paid equals the owner-approved text exactly` **failed**.
- No visual check done (text-only change, same element and classes; optional per the spawn prompt). Live check is the
  follow-up verify task (plan §6), not done here.

### Decision log

- **Fix applied without asking:** none (Build step; no review findings processed).
- **Obvious-winner calls:**
  1. *Which "paid and reached the threshold" fixture.* The existing `VERIFIED_PAID` fixture already sits exactly at
     the threshold (xp 100), so plan §4's "paid + reached threshold" case was arguably already covered. I added both a
     below-threshold (xp 25) and an above-threshold (xp 150) case so "paid is a fact either way" is pinned in both
     directions. Why it qualified: test-only, inside plan §4's list, no behaviour change.
  2. *Kill-switch / flag-off tests use a verified paid read.* The existing 0397 tests use `FAILED_READ`; plan §4 asks
     to assert the thank-you is absent, which only means something when the read would otherwise show it. Test-only,
     inside plan §4.

## Verify (independent re-run)

2026-10-08, spawned Verify worker (fkit-sprint-ship-loop, Sprint 7). Wrote no source; working tree as found
(0409 and 0412 edits present alongside).

- `npm test -- tests/client/CitizenshipStatusLang.test.ts tests/client/CitizenshipCard.test.ts tests/client/CitizenshipNotice.test.ts tests/client/LangSelectorRerender.test.ts`
  → 4/4 suites, 276/276 tests passed, first run (no re-run needed, no flake seen).
- `npx tsc --noEmit` → exit 0. `npm run lint` → exit 0.
- `citizenship_status.verified_paid` exact-match checked with node: EN `Thank you for supporting the game! Your paid
  citizenship benefits are on.` = true; RU `Спасибо, что поддерживаете игру! Преимущества платного гражданства
  включены.` = true. Both JSON files parse. `citizenship_status` key sets equal (6 = 6). The only
  `citizenship_status` change in the lang diffs is `verified_paid`.
- `git diff src/client/CitizenshipCard.ts src/client/CitizenshipNotice.ts`: 0407's hunks are comments only (card
  header doc, `renderStatusNotice` comment, Notice `verified_paid` doc). The remaining CitizenshipCard hunks
  (`isVerifiedRead`/`isPaidCitizen` args, `citizen_buy` comment) are 0409's.
- Not done: no live/visual check (out of scope here; follow-up verify task per plan §6).

## Process review — Round 1 (fkit-coder, spawned Process-review worker, `fkit-sprint-ship-loop`, Sprint 7)

**Mode:** under the sprint loop's declared-approval marker (approved plan: `plan.md`, blob
`1af8db2088267c606f0bb05c07a5d02e4af54fb3`). One finding, R1 (reviewer: low, optional test-strength nit).
Ledger `review.md` → *Coder response* R1 written; header `Status: closed-out`. No accepted residuals existed;
no ADR in `decisions/` covers test strength (ADR-116 checked — not a re-raise).

**Verdict R1: PARTIALLY CORRECT, defect (test strength), severity low.** The `it.each` "not shown" rows asserted
only absence. The guest and still-checking cases already had a positive witness (status `"guest"` vs default
`"unknown"`; `checkingLine` not null), so that part of the claim does not hold.

**Change (test-only):** `tests/client/CitizenshipCard.test.ts`, `describe("paid thank-you (task 0407)")` —
verified earned-only split out to its own test (status `"verified"`, no notice); the other three rows carry their
expected status + line. No source change.

**Evidence:** `npm test -- tests/client/CitizenshipCard.test.ts tests/client/CitizenshipStatusLang.test.ts
tests/client/CitizenshipNotice.test.ts` → 3/3 suites, 270/270 passed (first run). `npm run lint` exit 0.
Non-vacuous (each break run, seen red, restored, `cmp` confirmed identical):
1. `CitizenshipCard.ts` `renderStatusNotice()` → `return nothing` first: the three line-bearing not-shown rows
   **failed** (absence-only asserts would have stayed green).
2. Test reads held open with `pendingRead()` (unsettled card): all four not-shown rows **failed**.

### Decision log

- **Fix applied without asking:** R1 (it.each "not shown" rows lacked a witness that the card settled) → added
  expected verification status + expected status line per row, split verified earned-only out. Why it qualified:
  verified CORRECT for that part, mechanical, localized, test-only, inside plan §4's "who sees the line" tests.
- **Obvious-winner calls:** none. (Not adding witnesses to guest / still checking was not a call — they already had
  them.)
