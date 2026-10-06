# 0340 — worklog

## 2026-10-05 — Build (fkit-coder, Build worker of `fkit-sprint-ship-loop`)

Built against the owner-approved `plan.md` (blob `c35af5a24be2e7369d23f28b48ee33c6b1bee5a5`,
re-checked with `git hash-object` before starting), on `dev` at `6eef01f`. Nothing committed.
Plan §4 (deploy, ADR-113 note) is **not** part of this build — owner ruling Q1 moved it to a
separate verify task. No deploy entry here.

### Change surface

Code (one real path):
- `src/profile-server/Routes.ts`
  - Step 13: login keeps `let verified = false`, set to `verification.verified === true`
    inside the existing S2 try/catch; a throw leaves it `false`. Passed to
    `signSessionToken(..., { ..., verified })`. Status, body, `no-store` unchanged.
  - Step 14: new exported `SessionCaller` type and pure `callerFromSession(claims)`;
    `resolveCaller`'s `ok` branch returns it, so every `ok` caller now carries `verified`.
    No call site changed — no route reads `verified`.
  - Comments: `CallerResolution` doc, `resolveCaller` doc, profile-read `TODO(0267)`, login
    block (🔓 line, S3a paragraph, Yandex-only line; ⛔ never-log rule kept), payments intent,
    tenure-grant claim.

Comments only:
- `src/profile-server/SessionToken.ts`, `LoginVerification.ts`, `PublicProjection.ts`,
  `Telemetry.ts` (`LoginVerificationOutcome` doc header — see decision log)
- `src/core/profile/LoginContract.ts`, `PlayerProfile.ts`, `InboxContract.ts`,
  `NameChangeContract.ts` (2 sites), `PaymentsContract.ts`
- `src/client/ProfileSession.ts` (comment only; no client behaviour change)

Tests:
- `tests/profile-server/LoginVerificationRoutes.test.ts` — renamed to S2 + S3a; outcome table
  now asserts `vfy === (outcome === "ok")`; forgery with distinct internal players (fresh and
  3-day-old A-signature, B asserted → `vfy:false`, B's `pid`, A's id never resolved); tampered,
  `bad_payload`, stale 30 h old, stale 10 min ahead → `vfy:false`; no secret (absent / `""`),
  bad signature, no signature → `vfy:false` token that still reads `GET /v1/profile` 200;
  classifier throw → `vfy:false`; creation switch off + valid signature (existing → `vfy:true`
  via `resolveExistingPlayer` only; new id → 503, no token, nothing written); no-leak test
  now also asserts the minted token payload has exactly its five claims and no signature part.
- `tests/profile-server/CallerFromSession.test.ts` (new) — `vfy:true`/`false` → `verified`,
  `playerId === pid`, a non-boolean `vfy` is never verified.
- `tests/profile-server/SessionRoutes.test.ts` — `tokenFor` gains `verified`; new
  `describe.each(ROUTES)` case: a `vfy:true` token gets the same status, body and every
  repository call as `vfy:false` (7 routes).
- `tests/profile-server/TenureGrantRoutes.test.ts` — the same parity case for the
  tenure-grant route.
- `tests/profile-server/support/sessionToken.ts` — `bearerFor` gains optional `verified`.
- `tests/integration/Login.it.test.ts` — a valid matching signature → `vfy:true` token →
  Bearer `GET /v1/profile` 200, on real Postgres.

### Step-13 re-grounding (approved with the plan, §6)

Step 13's "resolve by the signed id" is satisfied by resolving by the **asserted** id, as
before. Since ADR-121, `classifyLoginSignature` checks the id first and returns
`verified: true` only when the signed id equals the asserted id
(`LoginVerification.ts:44`), so the two are the same value whenever `verified` is true. The
signed id stays inside the classifier (ADR-121). A one-line comment at the resolve says so.

### Verification

- Targeted: `npm test -- tests/profile-server tests/core/LoginContract.test.ts` →
  32 suites, 1142 tests passed.
- Mutation checks (temporary, reverted, `cmp`-confirmed): forcing `verified = false` at login
  turned 3 login tests red; making `GET /v1/profile` branch on `caller.verified` turned the
  SessionRoutes parity test red. The new tests bite.
- `npx tsc --noEmit` → exit 0. `npm run lint` → clean.
- `npm run test:integration` (local `gc-0012-it-pg`, port 5433, URL from `.env.test`, never
  printed) → 12 suites, 156 tests passed; the new Login case ran and passed (confirmed with a
  verbose single-file re-run, which also rebuilt the throwaway test schema).
- Full `npm test`, 5 runs:
  - Run 1: 2 failed — `LoginRoutes` "503 session_unavailable › no session config"
    (`Exceeded timeout of 5000 ms` + "worker failed to exit" = the confirmed supertest flake
    shape) and `AlertRoutes` "records too long as `invalid`" (response body `{}` — the
    historical "response carried, mechanism unknown" shape). Neither test touches the
    S3a path; both passed 3/3 in isolated re-runs.
  - Run 2: 1 failed — `SessionRoutes` "70 preflights on /v1/profile never reach the 60/min
    limiter", `Exceeded timeout of 5000 ms` (confirmed flake shape; untouched test).
  - Runs 3, 4, 5: 195 suites, 3609 tests, all passed (shell harnesses included,
    `ShellHarnesses.test.ts` PASS, nothing skipped).
  - 0197 ruled out for every failure: no `SIGSEGV` signal in any log, and the newest
    `node-*.ips` crash report is dated 2026-10-01 (none today).
  - Note: 3 flake hits in 5 full runs is above the ~4–7 % CLAUDE.md records, on a small
    sample; each hit was in a different, untouched test. Not investigated further.
- Secrets scan of the diff and the new test file: only synthetic keys, ids and names
  (`zz0325-*`, `zz0340-*`, made-up UUIDs, synthetic key strings). No real ids, keys,
  signatures, tokens, hosts, IPs or connection strings.

### Decision log (autonomous judgment calls)

- **`Telemetry.ts` `LoginVerificationOutcome` doc header (`:93`)** — not in the plan's named
  list, but it said "S2 — shadow mode: counted, and used for nothing else yet", which turns
  false with this task. Rewritten to say `ok` also mints `vfy:true` since 0340. Qualified as an
  obvious winner inside the plan's intent: the brief's "update every comment that still says
  no verification yet", comment-only, no behaviour change.
- **Left alone, noticed:** the counter's runtime `description` string at `Telemetry.ts:325`
  still says "(shadow mode)". It is OTEL metric metadata, not a comment, and the plan rules out
  metric changes, so it is unchanged. Flag for a later pass.
- **`callerFromSession` test, extra case** — added a fourth case (a non-boolean `vfy` is never
  verified) beside the plan's three. Test-only, inside step 14's "strictly `=== true`" intent.
- **Integration verbose re-run** — after `npm run test:integration` passed, I ran
  `RUN_DB_TESTS=1 npx jest --runInBand tests/integration/Login.it.test.ts --verbose` only to see
  the new case's name in the output. Same throwaway test database (its globalSetup rebuilds the
  schema); no other effect.

### Decision log — process-review Round 1 (2026-10-05, `fkit-sprint-ship-loop` Process-review worker, unattended under the approved plan)

Finding R1 (`review.md` § *Reviewer findings*, "0319 is the name-change gate only"). Verified per
site against the `0250` and `0319` briefs. Verdict PARTIALLY CORRECT; every change below is
comment-only (no behaviour, no test change).

- **`src/core/profile/InboxContract.ts` (trust-model paragraph)** — `(0250 S3b / 0319)` →
  `(0250 S3b)`. Answers R1 as stated: `0319` never names the inbox routes; `0250` S3b does.
  Qualified: verified CORRECT + one-token comment edit + inside plan step 15's sweep.
- **`src/core/profile/PaymentsContract.ts` (trust-model paragraph) and `src/profile-server/Routes.ts`
  (payments-intent comment above `app.post("/v1/payments/yandex/intent"`)** — reworded to "does not
  read `verified` (neither 0250 S3b nor 0319 gates it)". Answers R1, but goes one step past its
  suggested fix: `0250` S3b does not gate the intent route either (no backlog brief names
  `/v1/payments/yandex/intent`), so dropping only `/ 0319` would leave a second wrong pointer.
  Qualified: obvious winner within the plan's intent (step 15: comments must be true); reflowed
  the two comment blocks, prettier-clean.
- **`src/core/profile/PlayerProfile.ts` (public-projection doc)** — **not changed.** R1 is wrong at
  this site: `0319` brief § *What to build* item 1 gates the pending name on `GET /v1/profile` to a
  verified token, so `/ 0319` is a correct pointer here.
- **`src/core/profile/NameChangeContract.ts` (doc above the latest-request projection)** — not in
  R1; the mirror case found while verifying it. `(0250 S3b)` → `(0250 S3b / 0319)`, because `0319`
  item 1 gates exactly this field. Qualified: obvious winner within the plan's intent; one-token
  comment edit. If unwanted, revert that one token.
- **Re-verified:** `npm test -- tests/profile-server tests/core/LoginContract.test.ts` → 32 suites,
  1142 tests passed; `npx tsc --noEmit` exit 0; `npm run lint` exit 0; full `npm test` → 195 suites,
  3609 tests passed on the first run (no flake, `ShellHarnesses.test.ts` PASS). Secrets scan of the
  four-file comment diff: nothing.
