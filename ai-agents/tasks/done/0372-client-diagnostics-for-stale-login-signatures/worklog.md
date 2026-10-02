# Worklog — 0372 client diagnostics for stale login signatures

## 2026-10-02 — Build + Verify (`fkit-coder`, spawned by `fkit-sprint-ship-loop` as the Build worker)

Implemented the approved `plan.md` (blob `c1c0fd67c86e0e621f57de32e6625de63f711dc0`, owner rulings Q1 =
own `Older` label, Q2 = once per page load only, no sessionStorage throttle). Nothing committed or pushed.

### What changed

| File | Change |
|---|---|
| `src/client/SignatureAgeAnalytics.ts` (new) | Pure helpers: `readSignatureIssuedAtSeconds` (never throws, returns only the number), `signatureAgeLabel` (server's comparisons, in ms), `isPastStale`, `compareIssuedAt` (`Newer`/`Same`/`Older`), `SIGNATURE_AGE_TO_SERVER_BRACKET`. |
| `src/client/flashist/FlashistFacade.ts` | 20 A1 + 4 A2 enum strings; typed lookup records (compile-time completeness); A3 value on `Ready`; first-take flag; `recordSignatureDiagnostics` (A1, starts A2 unawaited); `compareSignatureRefetch` (A2, 60 s net, never rejects). The take's return values and moments are unchanged. |
| `tests/client/SignatureAgeAnalytics.test.ts` (new) | Decoder well-formed / malformed / no-leak; every bracket edge ±1 ms; server parity sweep against `staleSignatureAgeBracket`; `isPastStale`; `compareIssuedAt`. |
| `tests/client/SignedPlayerFacade.test.ts` | `Ready` assertions now carry held ms (0; 300 000). New block: A1 boot kind on Ready + Waited, not on Failed/Timeout/guest/no-SDK; A2 only on past-stale; all four results incl. sync throw, over-long, Unreadable second, 60 s hang (late answer fires nothing); login not held up and gets the original (Ready + Waited); second signature never returned; at most once per load / never on relogin; guest take counts as first; fail-safe (method throwing, GameAnalytics throwing, no unhandled rejection); no leak across A1+A2. |
| `ai-agents/knowledge-base/analytics-event-reference.md` | New "Profile Login Signature Age Events" section (A1 table + 0366 mapping, A2 table, guards, reading notes, clock and call-limit caveats); `Ready` row value; "at most one per take" bullet updated. Only that section was reformatted (the file is not prettier-clean at HEAD; unrelated tables left untouched). |

Not touched: `ProfileSession.ts`, any profile-server file, the board/brief edits already in the working tree.

### Verification evidence

- Targeted: `npm test -- tests/client/SignatureAgeAnalytics.test.ts tests/client/SignedPlayerFacade.test.ts tests/client/ProfileSession.test.ts tests/client/FlashistFacade.test.ts tests/client/PlatformDegradedFacade.test.ts` → 5 suites, 256 tests passed.
- Mutation check of the new facade tests (each mutation reverted, file byte-identical after): drop first-take guard → 4 fail; drop Ready call-site guard → 1 fail; replace the A2 start with a throw → 14 fail; swap boot kind → 10 fail; hang net 10× → 1 fail; never set the first-take flag → 4 fail.
- `npm run lint` → exit 0. `npx tsc --noEmit -p .` → exit 0.
- Full `npm test` (1 run, 2026-10-02): **188/188 suites, 3458/3458 tests passed, 0 skipped, exit 0**, 51 s (shell harnesses included, `ShellHarnesses.test.ts` passed). No flake seen, no re-run needed.
- Optional dev sanity (local boot in a browser) — **not run**; plan marks it not a gate.

### Decision log (autonomous judgment calls, all inside the approved plan)

1. **Diagnostics guarded at the call sites too, not only inside the method.** Plan test 13 spies
   `recordSignatureDiagnostics` to throw; that replaces the method body, bypassing its own try/catch, so the
   take's outer catch would have turned a valid signature into `null` — the exact trap the plan names. A
   `try { … } catch {}` around each of the two calls makes test 13 hold. Qualified: mechanical, localized,
   and the plan's stated intent ("own try/catch, outside the return decision").
2. **Extra `issuedAtSeconds !== null` in the A2 start condition.** Type narrowing only — `isPastStale`
   already excludes `Unreadable`. No behaviour change.
3. **Type name `SignatureRefetchResult`** (plan wrote `RefetchResult`) and a module-level alias
   `analyticEvents` for the lookup records — naming only.
4. **Doc formatting scope.** Running prettier on the whole doc reformatted unrelated tables (HEAD is not
   prettier-clean); reverted all hunks outside the signature section to keep the diff minimal.

No fix outside the plan; no obvious-winner call beyond the above.

### Deploy

Not deployed by this task. Target: the 2026-10-03/04 game deploy — requires review + the owner's commit
first. To be recorded here when known: which game deploy carried it (date and build), or that it missed
and why.

## 2026-10-02 — Process review, round 1 (`fkit-coder`, spawned by `fkit-sprint-ship-loop` as the Process-review worker)

Ledger `review.md` round 1: R1, R2 (both low). Both verified CORRECT, both wording-only defects. Ledger
set to **Status: closed-out**. Nothing committed or pushed.

### Decision log (fixes applied without per-fix owner approval — standing approval of the plan)

1. **R1 — A2 start timing was described wrongly.** What changed: the enum comment above the four
   `PROFILE_LOGIN_SIGNATURE_REFETCH_*` keys in `src/client/flashist/FlashistFacade.ts` ("Login already
   sent the ORIGINAL signature") and the doc bullet "Login is not held up" in
   `ai-agents/knowledge-base/analytics-event-reference.md` ("The second call starts after the take has its
   answer") now say the second call is started inside the take, not awaited, with only the SDK call's
   synchronous start running before the take returns. Why it qualified: verified CORRECT (the call is
   reached synchronously from `recordSignatureDiagnostics` before the take's `return`), mechanical and
   localized (comments/doc only, no behaviour change), inside the plan (plan § 2: "not awaited; the take
   returns the ORIGINAL signature immediately"). The reviewer's alternative — defer the start to a
   macrotask — was **not** taken: it changes timing, i.e. behaviour.
2. **R2 — decoder parity overclaimed.** What changed: the doc comment of `readSignatureIssuedAtSeconds`
   in `src/client/SignatureAgeAnalytics.ts` no longer says "exactly as the server does"; it states the
   shared rules (first dot, URL-safe + unpadded tolerated) and that `atob` is stricter than Node `Buffer`
   on malformed base64, which reads as `Unreadable` here. Why it qualified: verified CORRECT (re-measured
   with `node -e`), mechanical and localized (one comment), inside the plan (plan § 1 lists exactly the
   tolerated forms; it never required decoding malformed base64). Not recorded as an accepted residual —
   the wording now states the behaviour, so there is no overclaim left to accept.

No obvious-winner call.

### Verification after the change

- `npm test -- tests/client/SignatureAgeAnalytics.test.ts tests/client/SignedPlayerFacade.test.ts tests/client/ProfileSession.test.ts` → 3 suites, 173/173 passed.
- `npm run lint` → exit 0. `npx tsc --noEmit -p .` → exit 0. `prettier --check` on the two source files → clean.
- Full `npm test` **not re-run** — comment/doc-only change, no code behaviour changed.

