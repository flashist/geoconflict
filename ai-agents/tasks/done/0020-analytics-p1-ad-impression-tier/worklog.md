# 0020 — worklog

## 2026-09-24 — Build (tier-free baseline), fkit-coder as `fkit-sprint-ship-loop` Build worker

Approved plan: `plan-baseline.md` (blob `d55a28b06ecd4b2492675b17337591dac38096dd`, re-hashed this
turn and matched). The owner approved it 2026-09-24 via `AskUserQuestion` in the lead session:
"Yes, baseline only". Built plan steps 1–5 only. Step 6 (brief bookkeeping) belongs to the producer.

### Progress

1. **Enum:** added `AD_INTERSTITIAL: "Ad:Interstitial"` to `flashistConstants.analyticEvents` in
   `src/client/flashist/FlashistFacade.ts`, as its own commented group right after the paid-citizenship
   purchase funnel group (the other P1 group). The uncommitted `0253` tenure keys above it are untouched.
2. **Instrumented `showInterstitial()`** (same file): a per-call `let impressionLogged = false;` inside
   the Promise executor. `onClose` fires `flashist_logEventAnalytics(AD_INTERSTITIAL)` only when
   `wasShown === true && !impressionLogged`, then resolves as before. Nothing fires from `onError`, the
   `catch`, or the no-SDK early return. The return and resolve behaviour are unchanged, and none of
   the six call sites changed.
3. **Reference doc:** added a new `### Ad Events` section to
   `ai-agents/knowledge-base/analytics-event-reference.md` (after Map Preload Events): the table row,
   a note that the tiered events are task `0299`, and a note that banners are dropped. The uncommitted
   `0253` tenure rows are untouched: `git diff -U0` shows only two hunks, theirs and mine.
4. **Tests:** new `tests/client/InterstitialAnalytics.test.ts` (jsdom, `jest.mock("gameanalytics")`,
   `DEPLOY_ENV=prod` per test and restored afterwards, `Object.create(FlashistFacade.prototype)` facade,
   fake `showFullscreenAdv`). 12 cases: shown → 1 event + resolves true; `onClose(false)` → none;
   `onError` → none; `onError` then `onClose(false)` → none; SDK throws → none; no SDK → none, resolves
   undefined; `onClose(true)` twice → 1; non-boolean truthy `"true"` / `1` / `{}` → none; the fired
   string is the enum's `"Ad:Interstitial"` with no value; two separate shows → 2 events.
5. **Verify:** see below.

### Verification evidence (final tree)

| Gate | Result |
|---|---|
| `npm test -- tests/client/InterstitialAnalytics.test.ts` | PASS, 12/12 |
| full `npm test` | **exit 0: 147/147 suites, 2100/2100 tests, jest 53.2 s (real 54.0 s)**. Run twice: once before the `0299` wording change and once after, with the same totals both times. Neither run was a flake re-run: both passed first time, with no supertest timeout and no `SIGSEGV`. |
| `npx tsc --noEmit` | exit 0 |
| `npm run lint` | exit 0 |
| `npx prettier --check` on the three touched files | clean. I first ran `--write` on the test file and on the reference doc. The doc change was only my new table's column padding: the rest of the doc was already prettier-clean. |
| Manual in-Yandex check | **NOT done, and it cannot be done locally.** A real impression only happens inside Yandex Games (draft or prod). Local dev has no SDK, so it takes the no-SDK early return. Still owed: in a Yandex draft build, trigger a mission start, then confirm one `Ad:Interstitial` console log per shown ad and none when the SDK declines. |

### Mutation proofs

Method: back up `FlashistFacade.ts` to the scratchpad, apply the mutation, run the targeted test, then
restore. The file's sha1 was `253eae52…` before and after, so it came back byte-identical, including
the tenure edits. That hash was taken before the `0299` comment-only change.

| Mutation | Result |
|---|---|
| M1: fire on `wasShown === false` | **RED**, 6 failed (shown→1, false→none, error+false→none, twice→1, enum string, separate shows) |
| M2: drop the double-callback guard (`if (wasShown === true)`) | **RED**, 1 failed ("fires only once when the SDK calls onClose(true) twice") |
| M3: non-strict truthy check (`if (wasShown && !impressionLogged)`) | **RED**, 3 failed (all three non-boolean truthy cases) |
| M4 (extra): fire unconditionally in `onError` | **RED**, 2 failed (onError, onError+onClose(false)) |

### Decision log

- **Plan step 3, "add the key to the `## TypeScript Enum` section": not done (obvious winner).** That
  section says the live enum in `FlashistFacade.ts` "is the authoritative source — do not maintain a
  duplicate here" and lists no keys. Adding one would break the doc's own rule. It already covers the
  new key by pointing to the live enum, so the plan's intent (the key is documented) is met.
- **Plan step 4, two extra test cases beyond the plan's list (obvious winner, within intent).**
  "`onError` then `onClose(false)`" tests the plan's own listed risk, "the SDK calls both onError and
  onClose". "Two separate shows → 2 events" proves the guard is per call and not global, so it cannot
  swallow later real impressions. Both are tests only. No source changed.
- **Plan steps 1 and 3, wording: tiered events → task `0299`; banners → "dropped", not "deferred".**
  Applied after the caller's mid-build correction. The approval note records the owner's rulings
  (tiered: "New task, close 0020", which the producer filed as `0299`; banners: "Drop it"). The change
  is wording only, in the enum comment and the reference-doc note. It is inside the plan's intent as
  amended by its approval note. The full gates were re-run afterwards (results above).
- **Plan step 3, placement: the `### Ad Events` section goes last among the event sections, after Map
  Preload (obvious winner).** No existing section fits ads, and the plan names no position.
- No review findings were processed in this step, so no unattended review fixes were applied.

## 2026-09-24 — Process review, round 1 (fkit-coder as `fkit-sprint-ship-loop` Process-review worker)

Standing approval: the same owner-approved `plan-baseline.md` (blob `d55a28b0…`, re-hashed this turn
and unchanged). Method: `fkit-process-stateful-review` steps 0–7 over `review.md`, with no per-fix
owner gate (standing approval under ADR-032).

- **Loop check:** R1 matches none of the 5 seeded accepted residuals. The residuals cover *when* the
  event fires; R1 is about `resolve` always running. No ADR in `decisions/` covers interstitial resolve
  behaviour. R1 is novel.
- **R1: CORRECT, a latent defect, severity low (my assessment).** Verified: `flashist_logEventAnalytics`
  catches its own error, but its catch calls `flashist_logErrorToAnalytics` → `GameAnalytics.addErrorEvent`
  with no guard (`FlashistFacade.ts:308`). The real SDK calls `onClose` asynchronously, so a throw there
  escapes past the executor's try/catch before `resolve`, and every `await showInterstitial()` hangs.
  It needs both GA calls to throw synchronously, which is near-zero likelihood.
- **Fix:** kept the order (log, then `resolve`) and wrapped only the log call in a local try/catch that
  `console.log`s. I chose this over resolve-first because resolve-first would still let the throw escape
  into the SDK's own callback code. The try/catch keeps it inside our code.
- **Test:** "still resolves wasShown when analytics throws (review R1)". Both GA mocks throw, and the
  fake SDK calls `onClose` in a `setTimeout`, like the real one does. That matters: a synchronous fake
  would let the executor's catch hide the bug. The test asserts it resolves `true` and nothing escapes
  the callback. `beforeEach` now uses `mockReset` on both GA mocks, so the throwing implementations
  cannot leak into other tests.
- **Mutation proofs:**

  | Mutation | Result |
  |---|---|
  | MR1: remove the try/catch | **RED**: the R1 test fails with `Received: "unsettled"` |
  | M1 (re-run against the new code) | still **RED**, 7 failed |
  | M2 (re-run against the new code) | still **RED**, 1 failed |
  | M3 (re-run against the new code) | still **RED**, 3 failed |

  The file was restored byte-identical after each mutation (sha1 `ecf86a57…`).
- **Gates (final tree):**

  | Gate | Result |
  |---|---|
  | Targeted test | 13/13 |
  | Full `npm test` | **exit 0: 147/147 suites, 2101/2101 tests**, jest 53.2 s. Passed first try; not a flake re-run. |
  | `npx tsc --noEmit` | exit 0 |
  | `npm run lint` | exit 0 |
  | prettier | clean on the three touched files |

- **Ledger:** wrote the R1 row in the *Coder response* section (`✅ done`) and set the header
  `Status: closed-out`. `Coverage:` and the *Reviewer findings* section are untouched. No new residual
  was added.

### Decision log (process review, round 1)

- **R1 fix, applied without asking.** It answers finding R1 (analytics throw → the `showInterstitial`
  Promise never settles). What changed: a local try/catch around the `AD_INTERSTITIAL` log call in
  `onClose`, plus one test and a switch to `mockReset` in the test's `beforeEach`. Why it qualified:
  verified CORRECT; mechanical and localized (one call site, one file plus its test); inside the approved
  plan. The plan says "the return value and resolve behaviour stay unchanged", and this fix guarantees
  exactly that.
- **Obvious-winner call:** try/catch instead of resolve-first. Both keep "fires once, only on
  `wasShown === true`". Only the try/catch also stops the throw from reaching SDK code.
