# Worklog — 0271 Profile identity S2: `POST /v1/login` + 24 h session token

Run: 2026-09-15, spawned by `/fkit-sprint-ship-loop` (fkit-lead, Sprint 4) as the **Build worker**, under
the approved plan `plan.md` (owner rulings D1–D7). No box deploy, no SSH, no commit, no task-file move,
no wiki write, no `git stash`/`reset`/index change. Other tasks' uncommitted files not touched.

## Headline

- Built per plan §1–§9: `Platform.ts`, `LoginContract.ts`, `SessionToken.ts`, `POST /v1/login`, one
  `resolveCaller` (Bearer → legacy find-only → 401), one `publicCors`, a JSON error handler (closes the
  JSON.parse log leak), 4 request schemas made optional (D3 i), intent `23503` → 404 (D3 iii),
  `hasXpGrant`, `PROFILE_SESSION_SECRET` wired through `Server.ts` / `setup-profile.sh` (generate mode) /
  `build-deploy-profile.sh` / `example.env.profile`, hardening harness T16 + T17 + structural checks.
- All gates green on the final tree. One full `npm test` run went red first (2 failures, both explained
  and fixed below — one of them a supertest-family `401` on a route with no 401 path).
- All 12 planned mutations turned tests red; 3 extra integration mutations give suite F a negative control.
- ⚠️ The §10 box check has NOT been run. It is a separate driver/owner step after review.

## Pre-flight

- Plan blob re-hashed with `git hash-object`: `ac50c43…`, 25093 bytes — matched the carried hash.
- Docker up (`docker info` server version non-empty); `gc-0012-it-pg` up.

## Change surface

New:
- `src/core/profile/Platform.ts` (`PlatformSchema`, D6)
- `src/core/profile/LoginContract.ts`
- `src/profile-server/SessionToken.ts`
- `tests/profile-server/SessionToken.test.ts` (A), `tests/profile-server/LoginRoutes.test.ts` (B),
  `tests/profile-server/SessionRoutes.test.ts` (C, D, E), `tests/integration/Login.it.test.ts` (F)

Modified:
- `src/profile-server/Routes.ts` — login route, `resolveCaller`, `publicCors`, `sendCallerFailure`,
  `SessionConfig` 5th `createApp` arg, `ProfileRepo.hasXpGrant`, `23503` mapping, error handler
- `src/profile-server/Server.ts` — `hasXpGrant` binding; `loadSessionSecret(process.env.PROFILE_SESSION_SECRET, log)`
- `src/profile-server/PlayerProfileRepository.ts` — `hasXpGrant`, `XpGrantKind`
- `src/profile-server/PlayerIdentityRepository.ts` — `Platform` now from `Platform.ts` (re-exported; constant kept)
- `src/core/profile/{PaymentsContract,InboxContract,NameChangeContract}.ts` — `yandexPlayerId` optional (D3 i)
- `setup-profile.sh` — header doc, `persist_or_reuse_secret` generate mode, the session call,
  heredoc line, `report_config_values` row
- `build-deploy-profile.sh` — staged export; `example.env.profile` — secrets-block entry
- `tests/scripts/profile-deploy-hardening.test.sh` — `PERSIST_SPECS`, T15 cases, T16, T17, structural
- `tests/integration/support/db.ts` — `hasXpGrant` binding
- `tests/profile-server/{Routes,InboxRoutes,NameChangeRoutes,PaymentsRoutes}.test.ts` — `hasXpGrant` on
  mocks; D4 400→401 (5 assertions); `Allow-Headers` exact string (2 assertions)
- `tests/core/profile/{InboxContract,PaymentsContract}.test.ts` — D3 i contract change

Not touched (plan §11): game server, client, `CreditContract.ts`, internal routes' behaviour,
`config-parity-allowlist.json` (D5), `profile-checks.sh`, `CLAUDE.md`.

## RED-first evidence

- **A (SessionToken unit)** — run before `SessionToken.ts` existed: suite failed on module-not-found,
  0 tests executed. RED by a missing module, not by assertion; the assertion-level proof is M01–M03.
- **B–E (route tests)** — written against the unchanged `Routes.ts` (contract file already present):
  `Tests: 91 failed, 25 passed, 116 total`. The 25 passing were the legacy-compat regression guards
  (6 routes × 4) and `/internal/*` no-CORS — expected to pass before and after.
- **Hardening harness** — assertions added before any shell change: `SOME FAILED`, 18 `❌` (T17 staged
  export ×3, T15 session rows ×5, T16 generate ×7, structural call/generate/heredoc ×3). T16's
  unreadable-file abort already passed — the existing `-s` branch covers it — so it is a regression guard.
- **F (integration)** — ⚠️ written AFTER the route code existed; no pre-code RED. Negative control instead
  (MF1–MF3 below). The parallel-login race assertion has no negative control in this task; the race itself
  is proven with a forced lock barrier in 0270's `PlayerIdentityRepository.it.test.ts`.

## Mutations (each applied to a backup copy, tests run, file restored byte-identical — sha256 checked)

| # | Mutation | Red |
|---|---|---|
| M01 | remove the unusable-secret guard in `verifySessionToken` | SessionToken: 2 failed (empty + short secret never verifies) |
| M02 | drop the canonical-MAC re-encode check | SessionToken: 1 failed (non-canonical MAC) |
| M03 | check expiry before the MAC | SessionToken: 1 failed (forged past-exp must be `invalid`) |
| M04 | invalid Bearer falls through to legacy | SessionRoutes: 12 failed (never-falls-back + expired, all 6 routes) |
| M05 | legacy fallback calls `resolveOrCreatePlayer` | SessionRoutes + Routes: 21 failed (legacy find-only, all routes) |
| M06 | `profileReadLimiter` on `/v1/login` | LoginRoutes: 1 failed (100 sequential logins) |
| M07 | `Authorization` removed from `Allow-Headers` | 8 failed (every preflight) |
| M08 | log `platformUserId` on the login path | SessionRoutes: 1 failed (no-ids-in-logs) |
| M09 | remove the error handler | 2 failed — malformed JSON 400, and no-ids-in-logs caught `zz0271le…` fragments on stderr (the live leak, reproduced) |
| M10 | remove the `profile.env` heredoc line | ConfigParity real tree: rule B1 "read but absent from profile.env" + harness heredoc check |
| M11 | remove the build-deploy export | ConfigParity real tree: rule B2 "in profile.env but never exported" + harness T17 ×3 |
| M12 | `generate` on `YANDEX_PAYMENTS_SECRET` | harness structural: 1 failed |
| MF1 | `hasXpGrant` never true (integration) | Login.it: tenure `done` test failed |
| MF2 | legacy fallback creates (integration) | Login.it: unknown-id-creates-nothing test failed |
| MF3 | no `23503` → 404 mapping (integration) | Login.it: real-pg intent 404 test failed |

## Verification (final tree)

- `npm test` — run 1: exit 1, `2 failed, 1491 passed` (see **Run-1 failures**). Run 2 (a RE-RUN, after the
  fixes): exit 0, **126 suites / 1495 tests passed**, shell harnesses included.
- `npm run test:integration` — exit 0, **8 suites / 99 tests passed** (re-run on the post-Prettier tree).
- `npx tsc --noEmit` — exit 0. `npm run lint` — exit 0. Prettier `--check` clean on touched TS files
  (4 of mine were reformatted with `--write`; `Routes.ts` at HEAD was already Prettier-clean).
- `npm run check:config-parity` — profile `REQUIRED 0`, `INFO 0`; no allowlist entry (D5).
- Hardening harness standalone — `ALL PASS`, 265 ✅, 24 s wall. CLAUDE.md quotes ~16 s; no pre-change
  baseline was measured this run, so how much of the gap T17's two extra stubbed deploys cost is unknown.

## Run-1 failures

1. `InboxContract.test.ts` asserted `MarkReadRequestSchema` rejects a missing `yandexPlayerId` — the
   deliberate D3 (i) change. Test updated (malformed id still rejected; missing id accepted), and a matching
   case added to `PaymentsContract.test.ts`.
2. `LoginRoutes` "100 sequential logins": one response was **401**. The login route has no 401 path at all
   (503 / 400 / 200 / 500 only), so the 401 came from something other than this app. This matches CLAUDE.md's
   historical supertest shape "`401` on a route with no auth middleware" (mechanism unknown). Plausibly the
   100 ephemeral `request(app)` servers hit a recycled port held by another jest worker's app — **not traced,
   not proven**. The loop (and the 70-OPTIONS loop) now runs over ONE listening server: the assertion is
   unchanged, the exposure is ~170 → 2 listen/close cycles. This is not claimed as a fix; no retry added.

## Decision log (obvious-winner calls, all inside the approved plan's intent)

1. **`loadSessionSecret(raw, log)` instead of `(env, log)`.** Plan §7 requires a literal
   `process.env.PROFILE_SESSION_SECRET` so the parity checker sees the read. Passing `process.env` as an object
   hides the name from the checker (its alias rule only fires on `= process.env`), which would have made B1
   blind to this variable and M10 green. Same behaviour, same warn lines.
2. **Harness naming.** The plan's "T10-style case" is **T17** (T16 is generate mode; the file already has two
   T12 sections). Added `OPTIONAL_SECRET_NAMES` for the "four optional secrets never generate" check, since
   `PERSIST_SPECS` now also holds the session secret.
3. **Extra token invalid cases** beyond §8 A's list: padded MAC, unknown `plt`, extra claim. They test
   the "strict zod schema" §3 step 6 already specifies.
4. **Integration additions:** a real-pg `23503` → intent 404 test (the unit test only assumed pg raises
   `23503` for a deleted player — now proven), and "existing player without a grant → pending". Both inside
   D3 (iii) / §2 step 5.
5. **Loops over one listening server** — see Run-1 failure 2.
6. **Error handler details the plan left open:** `res.headersSent` → log the error name and `res.end()`;
   body-parser `entity.parse.failed` / `entity.too.large` are client errors and are not logged (only "anything
   else" logs, as §6 says).
7. **Test churn beyond the plan's estimate:** D4 changed **5** existing "400 without id" assertions (plan said
   ~2), plus 2 exact `Allow-Headers: Content-Type` assertions and the 2 contract tests above.
8. **`PlayerIdentityRepository`** re-exports `type Platform` and keeps `PLATFORM_YANDEX_GAMES`
   (`satisfies Platform`), so S3's imports do not churn (§1).
9. **`publicCors` on `GET /v1/profile`** now also sends Allow-Methods/Headers/Max-Age on the GET response
   (previously ACAO only) — one CORS shape for every public route, harmless on a non-preflight response.

Review fixes applied unattended: **none** (this is the Build unit, not a review round).

## Residuals / notes for review

- **Every normal redeploy prints `⚠️ Reusing persisted PROFILE_SESSION_SECRET …`** — the function's existing
  reuse line (T12 asserts its exact text). For this box-owned key reuse is the normal case, so the ⚠️ is noise.
  Left unchanged to keep 0220's asserted output stable.
- **Schema before caller on POST routes.** Name-change, mark-read and intent parse the body before
  `resolveCaller`, so a malformed body with an invalid Bearer answers 400, not 401. Pre-existing order; not changed.
- **Legacy id presence** is `yandexPlayerId !== undefined`; `null` counts as present-but-malformed (400).
- **Supertest 401 observation** above is untraced — worth feeding into the flake family record, not acted on here.
- **Harness wall time 24 s** vs CLAUDE.md's ~16 s — not baselined; CLAUDE.md not edited (outside this unit).
- **§10 box check pending** (driver/owner, after review; D1 write steps need the owner's OK).

## Process-review round 1 (2026-09-15) — R1–R4

Spawned by `/fkit-sprint-ship-loop` as the Process-review worker. Owner rulings (via the lead): R1, R2, R4
fix; R3 accepted residual; the `/internal/` case mismatch is a separate task (not touched). 0275's
uncommitted files (`tests/profile-backup-dryrun.sh`, `tests/testdata/profile-restore-drill/*`, the backup
runbook) not touched.

### Changes
- `src/profile-server/Routes.ts` — error handler → exported module-scope `profileErrorHandler`; 4xx kept
  (R1); `next(err)` when headers are sent (R4); helpers `clientErrorStatus`, `clientErrorCode`.
- `setup-profile.sh` — generate-mode refusal of a supplied value under 32 characters, before writing (R2).
- `tests/profile-server/ErrorHandler.test.ts` (new); `tests/scripts/profile-deploy-hardening.test.sh` T16 +7.

### RED-first
- R1/R4: `ErrorHandler.test.ts` against the pre-fix handler (after the pure move): 7 failed / 5 passed.
  The failures include the reviewer's repro (`charset=latin1`, `Content-Encoding: br` → 500, not 415).
- R2: harness, 4 `❌` (short value accepted, key overwritten, `Using` line printed, file created).

### Mutations (byte-identical restore, sha256 checked)
- MR1a client 4xx → 500: 9 red · MR1b ignore `statusCode`: 1 red · MR4 `res.end()` back: 1 red ·
  MR2a no refusal: 4 red · MR2b minimum in every mode: harness aborts in T13 (its rotation value is under
  32 chars) with no marker → `ShellHarnesses.test.ts` red. That one is abort-shaped red, not a named assertion.

### Gates (final)
- `npm test` exit 0 — 127 suites / 1507 tests (harnesses included). No re-run needed this round.
- `npm run test:integration` exit 0 — 8 suites / 99 tests. `tsc` 0, `lint` 0, Prettier clean.
- `check:config-parity` — profile REQUIRED 0, INFO 0.

### Decision log — round 1 (fixes applied without per-fix approval, under the standing approval + owner rulings)
1. **R1 — answers R1.** Changed: 4xx-carrying errors keep their status (JSON, unlogged); others 500 +
   name-only log. Qualified: verified CORRECT, localized to one handler, owner-ruled fix, inside plan §6's intent.
   Obvious-winner sub-calls: (a) honour ANY integer 4xx `status`/`statusCode`, not a body-parser type list —
   one rule covers every client error and matches Express's own default; (b) JSON codes 413 `payload_too_large`
   (unchanged), 415 `unsupported_media_type`, other 4xx `bad_request` (unchanged for 400); (c) a 5xx-carrying
   error is still a logged 500 (owner: "only genuine unknown errors → 500").
2. **Handler moved to module scope and exported — enables R1/R4.** Changed: `profileErrorHandler` exported
   from `Routes.ts`. Qualified: the owner required RED-first tests, and the headers-sent and unknown-error paths
   are unreachable through any route; a pure move with no behaviour change (366/366 before the fix).
3. **R4 — answers R4.** Changed: `next(err)` replaces `res.end()`, checked first. Qualified: verified CORRECT,
   one line, owner-ruled. ⚠️ Side effect: Express's default handler then prints `err.stack` in non-test envs, so this
   (unreachable today) path could log a message unfiltered. Flagged in the ledger, not changed.
4. **R2 — answers R2; the "fail or warn" choice was delegated to me.** Changed: generate mode refuses a supplied value
   under 32 characters before writing and the deploy **aborts**. Why abort over warn-and-continue: it is the
   function's existing fail-closed pattern (unreadable file aborts); warn-and-continue would silently ignore an
   operator's deliberate rotation; the abort happens before `profile.env`/compose are rewritten, so the running
   stack is untouched. Scoped to generate mode so the four optional secrets and 0220's exact-output checks
   are unchanged (asserted).
5. **R3 — no change** (closeout against the accepted residual).

### Residuals added this round
- R4's `next(err)` path hands an error to Express's default handler, which logs `err.stack` outside `test`.
  No current route reaches it.
- R2's abort happens mid-`setup-profile.sh`, after the provisioning steps (swap/Docker/ufw/sshd) have already
  run and before `profile.env` is written. That is the same point as the existing unreadable-file abort.

## Process-review round 2 (2026-09-15) — R5, R6

Spawned by `/fkit-sprint-ship-loop` as the Process-review worker. Owner ruling (via the lead): "Fix both
now". 0275's files not touched.

### Changes
- `src/profile-server/Routes.ts` — headers-sent path logs by name and calls `res.destroy()` instead of
  `next(err)` (R5); name-only log line extracted to `logUnhandledError` and shared with the 500 path.
- `tests/profile-server/ErrorHandler.test.ts` — the R4 unit test is replaced by the R5 destroy test; a new
  real-Express headers-sent test; 4xx rows assert empty logs plus canary absence (R6).

### RED-first
- R5: 2 failed against the round-1 handler. The real-Express test failed on the leak itself: stderr held
  `Error: mid-stream 0271-secret-detail` from finalhandler.
- R6: the tightened assertions passed on current code (4xx is not logged). Proven by mutation MR6 instead.

### Mutations (byte-identical restore, sha256 checked)
- MR5 `next(err)` restored: 2 red (unit + real-Express stderr-leak assertion) · MR5b no `res.destroy()`:
  1 red · MR6 4xx message logged under another prefix: 7 red.

### Gates
- `npm test` run 1: exit 1, 1 failed / 1507 passed. The failure was `NameChangeRoutes.test.ts` "409s a
  name_mismatch…" on an internal route: `Exceeded timeout of 5000 ms` + "worker failed to exit". That is
  CLAUDE.md's confirmed supertest flake signature. 0197 was ruled out first: no `SIGSEGV`, and the newest
  `node-*.ips` crash report predates this run. The suite and route were untouched this round. **Re-ran:** exit 0,
  127 suites / 1508 tests.
- `npm run test:integration` exit 0 — 8 suites / 99. `tsc` 0, `lint` 0, Prettier clean.

### Decision log — round 2 (under the standing approval + owner ruling)
1. **R5 — answers R5.** Changed: headers-sent → `logUnhandledError` + `res.destroy()`, no `next(err)`.
   Qualified: verified CORRECT, one branch, owner-ruled shape. Obvious-winner sub-calls: (a) `res.destroy()`
   rather than `req.socket.destroy()`, since it is the response's own API and closes the same socket;
   (b) extracted `logUnhandledError` so both fault paths share ONE name-only line and cannot drift apart;
   (c) the handler's 4th parameter stays, renamed `_next`, because Express detects error handlers by arity.
2. **R5 test through real Express — answers R5.** Qualified: the owner asked for a mutation that goes red
   on a stack/message-leak assertion. A mocked `next` cannot print a stack, so only a real finalhandler
   run with env `development` makes the leak observable.
3. **R6 — answers R6.** Changed: 4xx assertions are now empty logs + canary absent. Qualified: verified
   CORRECT, test-only.
