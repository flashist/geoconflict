# Worklog — 0366: record how old `stale` login signatures are

## 2026-10-01 — Build (fkit-coder, Build worker of `fkit-sprint-ship-loop`)

**Authority.** Spawned by `fkit-lead`'s `/fkit-sprint-ship-loop` under its declared-approval marker. The owner
approved `plan.md` (blob `0738bc97…`, 12 204 bytes, checked with `git hash-object` this turn) on 2026-10-01 via
`AskUserQuestion` in the live `fkit lead` session — "build as written, including the future-side split into 2
brackets and 1–6 h kept as one bracket". Built to that plan only. `plan.md` not edited. Nothing committed.

### What changed

Profile server only. No client change, no login behaviour change.

| File | Change |
|---|---|
| `src/profile-server/Telemetry.ts` | New `StaleSignatureAgeBracket` type (8 values, doc'd ranges). `ProfileMetrics.loginStaleSignatureAge(bracket)`. Matching no-op in `noopProfileMetrics`. New counter `geoconflict.profile.login.verification.stale_age`, one label `bracket`. The `outcome` counter is untouched. |
| `src/profile-server/PlayerSignature.ts` | `stale` result now carries `ageBracket`. New pure `staleSignatureAgeBracket(ageMs)` over named edge constants. The stale `if` condition is byte-identical (context lines in the diff). Header comment: the raw age never leaves the module. |
| `src/profile-server/LoginVerification.ts` | `LoginVerification.staleAgeBracket?`, set only for `stale`. |
| `src/profile-server/Routes.ts` | `/v1/login` captures the bracket; after `metrics.loginVerification(...)`, records it inside its own `try/catch`. Nothing logged. The classifier's catch fallback stays `bad_signature` with no bracket. One comment line in the S2 block. |
| `tests/profile-server/PlayerSignature.test.ts` | Edge tests through `verifySignedPlayer` (exactly 900 s old / 300 s ahead → `ok`, no `ageBracket` key; 901 s / 301 s → lowest brackets; one value inside every bracket; 30 days → `past_over_24h`; ms `issuedAt` → `future_over_15m`). Direct table over every upper edge, at the edge and +1 ms. |
| `tests/profile-server/LoginVerification.test.ts` | Stale row expects `staleAgeBracket: "past_15m_20m"`. New: 1-day-old signature for ANOTHER id → `stale` / `past_6h_24h` (pins today's order). New: non-stale outcomes carry no `staleAgeBracket` key. |
| `tests/profile-server/LoginVerificationRoutes.test.ts` | `recordingMetrics()` records brackets. Table: one bracket on the stale row, none elsewhere. New: 45 min old → `["past_30m_1h"]`, 10 min ahead → `["future_5m_15m"]`. Fail-safe: a throwing `loginStaleSignatureAge` leaves the login at 200, same body shape, `vfy:false` token, outcome still `stale`. No-leak test now also sends a stale signature; asserts its parts never reach logs/repo calls and every bracket is one of the 8 values. |
| `tests/profile-server/Telemetry.test.ts` | Allowlist entry for the new counter. New test: one counter, label `bracket`, exactly 8 values. New calls in the allowlist and no-op tests. The seven-outcome test is **unchanged** and passes (brief step 4). |
| `tests/profile-server/{RouteMetrics,InternalPathCase,AlertRoutes}.test.ts` | `loginStaleSignatureAge: () => {}` added to the hand-written `ProfileMetrics` stand-ins. |

### Verification (all run 2026-10-01, this session)

| Command | Result |
|---|---|
| `npm test -- tests/profile-server/{PlayerSignature,LoginVerification,LoginVerificationRoutes,Telemetry,RouteMetrics,InternalPathCase,AlertRoutes}.test.ts` | **7/7 suites, 255/255 tests passed** |
| `npm test` (full) | **186/186 suites, 3 351/3 351 tests passed**, exit 0. No supertest flake, no `0197` segfault — no re-run needed. |
| `npm run lint` | exit 0 |
| `npx tsc --noEmit -p tsconfig.json` | exit 0, **0 errors** (baseline 0). Matters because the profile container's ts-node type-checks at startup. |
| `npx prettier --check src/profile-server tests/profile-server` | clean |
| Privacy grep of added diff lines (URLs, IPv4, host names, `postgres`, `password`, `secret`, `token`, `dsn`) | Only hits: references to the existing synthetic test constants (`SECRET`, `SESSION_SECRET`) and `session.token` field access. No id, signature, host, IP or credential added. |

**One mid-build failure, fixed:** the first targeted run had 8 failures in `LoginVerification.test.ts`. Cause:
I added an optional 6th column to a `test.each` table whose other rows had 5 entries; jest reads a 6th declared
parameter as the `done` callback, so the "bracket" argument was a function on those rows. Fixed by making the
column explicit (`undefined`) in every row. Re-run green (above). Test-only; no source change.

### Deploy (brief step 6)

**Not deployed yet — nothing is committed.** Target: the Saturday 2026-10-03/04 profile deploy, if reviewed and
committed in time; otherwise it waits until after `0297` §1 has read `0309`'s log line (brief *Timing*). Whoever
runs the deploy fills this in: date + profile version, or "missed Saturday because …". Reading the brackets in
Uptrace is **not** this task's close condition (owner ruling Q2 — it folds into the S2-exit re-check before `0340`).

No new env var or config, so `check:config-parity` is unaffected.

### Caveat for whoever reads the brackets

`stale` is decided **before** the id check, so a stale count (and its bracket) can include genuine signatures
issued for a *different* id than the login asserts. Pinned by a test; order unchanged (out of scope).

### Decision log

- **Obvious-winner calls: none.** Every change is a line item of the approved plan.
- **Unattended fixes to review findings: none** (this is the build step; no review has run yet).
- **Test-shape detail inside the plan (not a scope call):** the `LoginVerification.test.ts` stale row gained an
  explicit bracket column on every row rather than an optional one — forced by jest's `done`-callback arity rule
  (see the mid-build failure above). Same assertions the plan specified.

## 2026-10-01 — Process review, round 1 (fkit-coder, Process-review worker of `fkit-sprint-ship-loop`)

Reviewer round 1 (`review.md`): **no findings**, verdict "Ready to merge", coverage "reasoning-only second
opinion" (Codex ran but its jest run was sandbox-blocked; execution evidence is the reviewer's own 255/255 +
`tsc` exit 0). No Accepted residuals; ADR-116 / ADR-103 checked, nothing to close out against. Wrote a
round-1 note in *Coder response* and set the ledger header `Status: closed-out`. No code changed.

### Decision log

- **Unattended fixes to review findings: none** (no findings to fix).
- **Obvious-winner calls: none.**
