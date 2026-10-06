# 0248 — Worklog

## 2026-10-06 — Build + verify (fkit-coder, spawned by `fkit-sprint-ship-loop` Build worker)

Implemented `plan.md` (blob `0a19129a…`, owner-approved 2026-10-06 in the lead session) as written.
`plan.md` itself was not edited.

### What changed

- `src/client/CitizenshipStatus.ts` — added `derivePaidCitizenship(profile)` (verified + paid only,
  strict `=== true`), the module-level paid value, `publishPaidCitizenship()`,
  `isCurrentPlayerPaidCitizen()` (the one exported reader; `0397` can reuse it), and the test reset now
  clears it. Doc comment: card is the only writer, verified owner view only (ADR-116 D4), false =
  "not paid or unknown" = show the ad. No subscribe API. `CitizenshipStatus` union unchanged.
- `src/client/CitizenshipCard.ts` — `refreshProfile()` publishes `derivePaidCitizenship(profile)` on
  every applied read (after the `0326` stale-read guard), next to `publishCitizenshipStatus()`.
  `paidGrantConfirmed` is not used for it.
- `src/client/flashist/FlashistFacade.ts` — import `isCurrentPlayerPaidCitizen`; new enum key
  `AD_INTERSTITIAL_SUPPRESSED_PAID_CITIZEN: "Ad:InterstitialSuppressed:PaidCitizen"`; private
  `isInterstitialSuppressedForPaidCitizen()` (= kill-switch snapshot && paid); in `showInterstitial()`,
  after the no-SDK return and before `showFullscreenAdv`: check in try/catch (throw → show the ad),
  on suppress fire the event in its own try/catch, console-log, `return false`.
- `ai-agents/knowledge-base/analytics-event-reference.md` — new row (requests-not-impressions,
  upper-bound caveat), `AD_INTERSTITIAL` "Not fired…" amended, one note on the `0299` blockquote.
- Tests: `tests/client/CitizenshipStatus.test.ts` (+derive cases, store round trip/default/reset),
  `tests/client/CitizenshipCard.test.ts` (new block `publishes paid citizenship (task 0248)`),
  `tests/client/InterstitialPaidCitizenGate.test.ts` (new; both directions).

Untouched: the six call sites, `src/core/`, server code, translations, HTML templates, `PROJECT.md`.

### Verification

- Focused: 4 suites / 181 tests pass (`CitizenshipStatus`, `CitizenshipCard`,
  `InterstitialPaidCitizenGate`, `InterstitialAnalytics` unchanged).
- Mutation check (temporary, reverted): dropping the kill-switch half of the gate, and making the
  card publish only `true` (never republish false), together turned 8 tests red — the new tests do
  catch both.
- `npm test`: 196/196 suites, 3719/3719 tests pass, exit 0, first run (no re-run; no `supertest`
  flake, no `SIGSEGV`). No suite skipped, so the Docker-probed harness ran.
- `npm run lint`: exit 0. `npx tsc --noEmit`: exit 0. Prettier clean on all touched code/test files.
- The analytics doc was already not Prettier-clean before this change; left unformatted to avoid
  reformatting unrelated sections.

### Not verified here (by plan)

- Live per-placement proof on Yandex (needs deployed S3b, a verified paid account, the real SDK) —
  belongs in a verify task after `0396` (producer's call to file).
- The remote `citizenship_ui` half of the kill switch cannot be exercised in `npm run dev` (`0238`);
  unit-proven via the snapshot only.

## Decision log

Fixes applied without asking / obvious-winner calls (ADR-019 / ADR-032 audit record):

1. **Extra card test beyond the plan's list** — `does not publish true on a confirmed grant whose
   re-read is unverified`. Answers no review finding; it pins plan Step 2's stated default (open
   question 1: verified read only, `paidGrantConfirmed` not used). Qualified as obvious-winner within
   intent: test-only, asserts exactly the approved behaviour.
2. **Extra gate tests** — "one suppression event per suppressed request", "snapshot never primed
   (bare facade) → ad requested", and the event-string assertion. Test-only, pin approved behaviour
   (requests-counted, fail-open default). Obvious-winner within intent.
3. **Card "publishes false" cases seed `true` first** and add a "non-authoritative read claiming paid"
   case, so each test proves the card actually overwrote the value rather than reading the default.
   Test-only, within Step 5.2.
4. **Analytics doc not Prettier-formatted** — file was already non-conformant; formatting it would
   touch unrelated sections. Mechanical, localized choice.

No production-code deviation from the plan. No review fixes applied (no review has run yet).

## 2026-10-06 — Process review round 1 (fkit-coder, spawned by `fkit-sprint-ship-loop` Process-review worker)

Ledger: `review.md` (R1, R2; Codex X1 disproven by the reviewer, not re-chased). Header set `Status: closed-out`.

### Decision log (fixes applied without asking / obvious-winner calls)

1. **R1 — applied unattended.** What changed: `src/client/flashist/FlashistFacade.ts`, doc comment on
   `citizenshipSurfacesSnapshot` now names both sync readers (`renderCitizenBadge()` and the 0248 gate
   `isInterstitialSuppressedForPaidCitizen()`) and warns that a change to the false default must be weighed for both
   (badge hides vs ads SHOW); the inline note in `isCitizenshipSurfacesEnabledSync()` now says "both callers behave the
   same either way" instead of "the only caller". Why it qualified: verified `CORRECT` (grep shows exactly two
   production readers: `CitizenBadge.ts` and the new gate), mechanical/localized (comment-only, no code path touched),
   inside the approved plan (Step 3 adds that gate as a reader). Verified: prettier/eslint/`tsc --noEmit` clean;
   `InterstitialPaidCitizenGate`, `InterstitialAnalytics`, `FlashistFacade`, `CitizenBadge` 81/81 pass. Full `npm test`
   not re-run (comment-only change).
2. **R2 — no code change; recorded as accepted residual "Paid store is one boolean".** Not a fix and not an
   obvious-winner call: it keeps the plan's own Step 1 choice (plain boolean, no subscribe API). Residual added because
   the reviewer classified it frontier and the plan chose the shape on purpose.

No obvious-winner calls this round.

## 2026-10-06 — Post-review verify (fkit-coder, spawned by `fkit-sprint-ship-loop` Verify step)

After round-1's comment-only edit to `src/client/flashist/FlashistFacade.ts`. No source written.

- `npm test` (full, shell harnesses included): exit 0 — 196/196 suites, 3719/3719 tests passed, 0 skipped
  (`ShellHarnesses.test.ts` PASS). No flake or SIGSEGV; single run, no re-run.
- `npm run lint`: exit 0, no output.
- `npx tsc --noEmit`: exit 0, no output.
- `git hash-object plan.md`: `0a19129a9abb65856a23210914aecbabe4560a11` — matches expected (plan unchanged).
