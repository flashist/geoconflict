# Plan — 0366: record how old `stale` login signatures are

Planning only. Nothing was written. (I could not enter plan mode because I was spawned, so I followed the written no-edit rule instead.) I read: the brief, including the 2026-10-01 rulings addendum; `src/profile-server/PlayerSignature.ts`, `LoginVerification.ts`, `Telemetry.ts` and `Routes.ts` (the `/v1/login` handler, ~:683–735); and the tests `PlayerSignature.test.ts`, `LoginVerification.test.ts`, `LoginVerificationRoutes.test.ts` and `Telemetry.test.ts`, plus the three hand-written `ProfileMetrics` stand-ins in other tests.

## Summary
- **What it records:** a **new, separate counter**, `geoconflict.profile.login.verification.stale_age`. It has **one label, `bracket`**, with **8 fixed values**. It is recorded only when the outcome is `stale`.
- **Nothing existing changes:** the `outcome` counter keeps its name, its label and its seven values, and nothing about it is touched. The 900 s / 300 s window and the code that decides `stale` stay byte-identical. No client change, no login behaviour change.
- **Cannot cost a login:** the recording sits in its own try/catch in the route, and a test proves it.
- **Privacy:** the label is computed only from the age, using fixed edges. No id, signature, raw age or payload ever becomes a label or a log line.
- **Size:** about 4 source files plus 7 test files. Small.

## Bracket design

The age is `ageMs = nowMs - issuedAt*1000`, the same value the stale check already computes. Positive means past, negative means future. Every bracket has an **open lower edge and a closed upper edge**. That matches the existing rule that "exactly at the limit is still fresh": exactly 900 s old and exactly 300 s ahead stay `ok` and get no bracket.

| `bracket` value | Range of `issuedAt` relative to now | Which cause from the brief's table it separates |
|---|---|---|
| `future_5m_15m` | 300 s < ahead ≤ 900 s | small clock difference somewhere |
| `future_over_15m` | ahead > 900 s | a big error: a seconds/milliseconds mix-up or a whole-hours offset. Clearly different from a small difference |
| `past_15m_20m` | 900 s < age ≤ 1 200 s | just past the window, so the window may be too tight → retune |
| `past_20m_30m` | ≤ 1 800 s | still close enough that a retune could cover it |
| `past_30m_1h` | ≤ 3 600 s | the grey zone |
| `past_1h_6h` | ≤ 21 600 s | "Yandex hands back an old `issuedAt`" → a different fix |
| `past_6h_24h` | ≤ 86 400 s | the same |
| `past_over_24h` | > 86 400 s | the same; also catches a negative or garbage `issuedAt` |

**Why these edges.** The past edges are the brief's starting point, kept as written. Fine steps near 900 s let a retune be sized. Coarse steps above 1 h are enough because anything there means "not a window problem". The only change from the brief: **the future side is split in two** (5–15 min, and over 15 min). That costs one extra series. It separates ordinary clock skew from a gross error, and the two need different fixes. **Number of series: 8, fixed** (by construction, since there is one label).

**Why a new counter, not a label on the existing one or a histogram.** Adding a label to the existing counter would change it, and the brief forbids that. A histogram of the age would mean the raw age becomes the recorded value, and histogram buckets are harder to read in Uptrace than one counter per label value. `0339` read its counter by label value, and this counter is read the same way. Uptrace shows it as `geoconflict_profile_login_verification_stale_age`.

**A rough check when reading the data.** The sum over all brackets should roughly equal the `outcome="stale"` count for the same period: one stale login adds 1 to each counter.

## Files to change

1. **`src/profile-server/Telemetry.ts`**
   - Add `export type StaleSignatureAgeBracket` as a union of the 8 values, with a doc comment giving each range. This is the same pattern as `LoginVerificationOutcome`.
   - Add to `ProfileMetrics`: `loginStaleSignatureAge(bracket: StaleSignatureAgeBracket): void`, with the doc comment "once per `POST /v1/login` whose outcome was `stale` (task 0366)".
   - Add `noopProfileMetrics.loginStaleSignatureAge: () => {}` (the matching no-op the brief asks for, ~:217).
   - In `createProfileMetrics`: add `meter.createCounter("geoconflict.profile.login.verification.stale_age", { description: "POST /v1/login stale signatures, by how far issuedAt was from now (past/future bracket)" })`. The implementation is `.add(1, { bracket })`.
   - The existing `loginVerifications` counter is not touched.

2. **`src/profile-server/PlayerSignature.ts`**
   - Change the `stale` member of `PlayerSignatureResult` to `{ status: "stale"; ageBracket: StaleSignatureAgeBracket }`. Add a type-only import from `./Telemetry`; `LoginVerification.ts` already does the same.
   - Add `export function staleSignatureAgeBracket(ageMs: number): StaleSignatureAgeBracket`. It is pure: only number comparisons against named edge constants (`…_SECONDS * 1000`). The doc comment says it is only meaningful for an age outside the window. Negative input goes to the future brackets. Above 24 h goes to `past_over_24h`.
   - In the stale branch (~:90–95), return `{ status: "stale", ageBracket: staleSignatureAgeBracket(ageMs) }`. **The `if` condition stays byte-identical**, so what counts as `stale` does not change.
   - Update the header comment: the result carries a fixed bracket, never the raw age.

3. **`src/profile-server/LoginVerification.ts`**
   - `LoginVerification` gets an optional `staleAgeBracket?: StaleSignatureAgeBracket`, present only when `outcome === "stale"`.
   - In the not-`ok` branch, pass `result.ageBracket` through when the status is `stale`. Everything else is unchanged.

4. **`src/profile-server/Routes.ts`** (the `/v1/login` handler, ~:719–730)
   - Also capture `staleAgeBracket` from the classifier result. The catch fallback stays `bad_signature` and has no bracket.
   - After the existing `metrics.loginVerification(verificationOutcome)`: if a bracket is present, call `metrics.loginStaleSignatureAge(staleAgeBracket)` inside its **own** `try { … } catch { /* never costs a login */ }`.
   - Nothing is logged. The resolve, the response, the status and the `vfy:false` token are unchanged.
   - Add one line to the S2 comment block naming the new counter (task 0366).

## Tests to add or update

- **`tests/profile-server/PlayerSignature.test.ts`**
  - Verification step 1, at the edges, through `verifySignedPlayer`:
    - exactly 900 s old → `ok`, with no `ageBracket` key (assert with `toEqual`);
    - exactly 300 s ahead → the same;
    - 901 s old → `past_15m_20m`;
    - 301 s ahead → `future_5m_15m`;
    - one value inside each bracket goes to that bracket: 25 min, 45 min, 3 h, 12 h, 10 min ahead, 1 h ahead;
    - 30 days old → `past_over_24h`;
    - a milliseconds `issuedAt` → `future_over_15m`.
  - Plus a direct table over `staleSignatureAgeBracket` at every upper edge: exactly 1 200 / 1 800 / 3 600 / 21 600 / 86 400 s and 900 s ahead go to the lower bracket; +1 ms goes to the next one.
  - The existing `.status` assertions keep passing unchanged.
- **`tests/profile-server/LoginVerification.test.ts`**
  - The stale row's expected `toEqual` becomes `{ outcome: "stale", verified: false, staleAgeBracket: "past_15m_20m" }` (at 901 s).
  - New: a 1-day-old signature for *another* id reports `stale` with `past_6h_24h`. The stale check runs before the id check, so this pins the current order. It does not change it.
  - New: non-stale outcomes carry no `staleAgeBracket`.
- **`tests/profile-server/LoginVerificationRoutes.test.ts`**
  - `recordingMetrics()` also records the stale-age calls.
  - The existing table also asserts: a bracket was recorded exactly once on the stale row, and never on the other rows.
  - New test: a 45-min-old signature records `["past_30m_1h"]`, and a 10-min-ahead one records `["future_5m_15m"]`. These values are well away from the edges, so the gap between when the test computes the time and when the server reads it cannot change the bracket. The existing row uses exactly 3 600 s, which sits on an edge, so it is not used for this check.
  - **Fail-safe (step 2):** `loginStaleSignatureAge` throws. The stale login is still 200 with the same response shape, the `vfy:false` token is unchanged, and the outcome counter still records `stale`.
  - **No-leak (step 3):** the existing test also sends a **stale** signature. The assertion that no log line or repository call contains the signature or its parts now covers the new path. Every recorded bracket must be one of the 8 fixed values.
- **`tests/profile-server/Telemetry.test.ts`**
  - Add `"geoconflict.profile.login.verification.stale_age": ["bracket"]` to `ALLOWED_ATTRIBUTE_KEYS`.
  - New test: one counter, label `bracket`, exactly the 8 values. The pattern copies the existing seven-outcome test.
  - Add one call to the existing allowlist test and to the no-op test.
  - **Step 4:** the existing test "login verification: one counter, label `outcome`, exactly the seven bounded values" stays **unchanged** and must still pass.
- **`tests/profile-server/{RouteMetrics,InternalPathCase,AlertRoutes}.test.ts`**
  - Add `loginStaleSignatureAge: () => {}` to the hand-written `ProfileMetrics` stand-ins. Without it the typecheck fails (see the first risk below).

## How I will verify
1. `npm test -- tests/profile-server/PlayerSignature.test.ts tests/profile-server/LoginVerification.test.ts tests/profile-server/LoginVerificationRoutes.test.ts tests/profile-server/Telemetry.test.ts tests/profile-server/RouteMetrics.test.ts tests/profile-server/InternalPathCase.test.ts tests/profile-server/AlertRoutes.test.ts`
2. `npm test` (full run, step 5). If a known `supertest` flake or `0197`'s segfault appears, check the signature against CLAUDE.md, re-run, and say that I re-ran.
3. `npm run lint`
4. **`npx tsc --noEmit -p tsconfig.json`**. Baseline today (2026-10-01): **0 errors**. This one matters: the profile container runs `node --loader ts-node/esm` with no `transpileOnly`, so **ts-node type-checks when the server starts**. A type error that Jest/SWC would not catch (Jest/SWC skips type-checking) could stop the profile box from starting on Saturday.
5. A grep of the diff for ids, signatures, hosts and secrets: none expected. The fixtures are the existing synthetic `zz0325-*` ones.
6. Worklog: which profile deploy carried it (Saturday 2026-10-03/04), or that it missed and why (step 6). Reading the brackets in Uptrace is **not** the close condition (owner ruling Q2: it folds into the S2-exit re-check).

## Privacy check
- The label value comes from `ageMs` through fixed comparisons. It is never built from player data.
- Nothing new is logged.
- The raw age never leaves `PlayerSignature.ts`; only the bracket does.
- The signature is still never passed beyond the classifier.

## Risks and edge cases
- **Type error stops the profile box starting** (ts-node checks types at startup). Handled by verification step 4.
- **A throw inside the bracket function** would land in `verifySignedPlayer`'s outer catch. That would turn `stale` into `bad_signature` and change the existing counter. The function is pure comparisons on a number already checked to be finite, so it cannot throw. Noted, not guarded further.
- **`stale` is decided before the id check.** A stale count, and so its bracket, can include genuine signatures issued for a *different* id. The brief describes the stale signatures as "for the right player", but the code does not check that for stale ones. This is a caveat for whoever reads the brackets. No code change: the order is out of scope.
- **The two counters are separate calls.** Each Uptrace export window should still show matching sums.
- **Deploy timing:** this rides Saturday's profile deploy or waits until after `0297` §1 has read its log line. Missing Saturday only delays the answer. No new env var or config, so `check:config-parity` is unaffected.
- **Not done here:** no runbook edit. Whoever owns Saturday's slot checklist may want a one-line "the `…_stale_age` metric exists after deploy" check next to N3.1.
