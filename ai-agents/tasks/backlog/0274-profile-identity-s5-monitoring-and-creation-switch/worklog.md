# Worklog — 0274 Profile identity S5: monitoring, creation switch, cleanup runbook, disk/growth checks

Run: 2026-09-16, spawned by `/fkit-sprint-ship-loop` (fkit-lead, Sprint 4) as the **Build worker**, under
the approved plan `plan.md` (blob re-hashed before any source was written — it matched). No box deploy,
no SSH, no commit, no task-file move, no wiki write, no `git stash`/`reset`/index change. Step 7 of the
plan (the owner's Uptrace dashboard, the six alert rules, the alert drill and the live-box switch +
cleanup drill) was NOT attempted — it is the owner's, after deploy.

## Headline

- Steps 1–6 built RED-first and all gates are green: `npm test` 134/134 suites, 1692/1692 tests (no
  harness skipped); `npm run test:integration` 10/10 suites, 114/114; `npx tsc --noEmit` clean;
  `npm run lint` clean; profile config parity still **REQUIRED 0 / INFO 0**.
- ⛔ `session.rejected` reason `legacy_fallback_used` was **not** built (0273 deleted the branch). Only
  `expired` and `invalid`, and `RouteMetrics.test.ts` asserts the word "legacy" never appears.
- 22 mutations executed; **every one turned a test red**. Two of them survived on the first attempt
  purely because my `perl` escaping never applied the edit — both were redone properly and then killed.
- One residual worth reading before the deploy: **`Server.ts`'s new wiring is type-checked but not
  executed by any test** (that file binds a port and has never been under test). Details below.

## Pre-flight

- `git hash-object plan.md` = `0f929fca6ad238266edd248b18bb725d3e3673c2` — matched the carried hash.
- `git hash-object src/profile-server/Routes.ts` = `634d1d9092b4c292b79494a8121d61ac8c8628a7` — matched
  the hash the spawn prompt carried, so 0273's tree is the one I edited.
- Read `Routes.ts` in full and confirmed: no legacy branch, no `via`, `CallerResolution` is
  `{status:"ok"; playerId} | CallerFailure`, no-header → 401 `session_invalid`.
- Docker up, `gc-0012-it-pg` up on 5433, `.env.test` present (its value was never printed).

## Change surface

New source:
- `src/profile-server/Telemetry.ts` — the instruments, `metricPlatform`, `metricsExportUrl`,
  `statusClassOf`, `noopProfileMetrics`, `createProfileMetrics`, `startProfileTelemetry`.
- `src/profile-server/LoginCreationSwitch.ts` — `parseLoginCreateEnabled`.

Modified source:
- `src/profile-server/Routes.ts` — **the exact regions touched** (for sequencing `0276`):
  1. the import block (added the `./Telemetry` import);
  2. the `ProfileRepo` interface — added `resolveExistingPlayer`, and corrected the stale
     `findPlayerByIdentity` doc-comment that predicted this task would need it;
  3. a new exported `AppOptions` interface + the `UNMATCHED_ROUTE` constant, next to `BEARER_PREFIX`;
  4. `createApp`'s signature (a 6th optional `options` parameter) and its first two lines;
  5. `resolveCaller` — a new `rejectCaller` helper directly above it, funnelling every 401;
  6. **a new `app.use` timing middleware, mounted between `app.set("trust proxy", 1)` and
     `app.use(express.json())`** — this is the one structural insertion;
  7. the `POST /v1/login` handler body.
  **Nothing else in the file was edited** — not the error handler, not the `/internal` check, not the
  payments / inbox / name-change / profile routes, not the CORS helper.
- `src/profile-server/PlayerIdentityRepository.ts` — `IdentityRepositoryHooks`, an optional 2nd
  constructor argument, `findExisting` made public as `resolveExistingPlayer`, `notifyPlayerCreated`
  called after COMMIT on the created branch only, and the `void source` placeholder removed.
- `src/profile-server/Server.ts` — the switch is parsed and logged at boot, `countPlayersEstimate`,
  `startProfileTelemetry` inside a try/catch, the repository hook, `resolveExistingPlayer` on the
  `ProfileRepo` binding, and `{ loginCreateEnabled, metrics }` passed to `createApp`.
- `src/core/profile/LoginContract.ts` — `LOGIN_ERROR_CODES` / `LoginErrorCode` added; the header
  comment's "503 creation_paused is S5's — deliberately not declared here" replaced by the real entry.

Deploy / ops:
- `build-deploy-profile.sh` — two `printf "export …=%q\n"` lines added immediately after the
  `PROFILE_SESSION_SECRET` line. **No other region touched.**
- `setup-profile.sh` — **the exact regions touched** (for sequencing `0276`):
  1. the header's "Optional env vars" comment block (two new entries at the end of it);
  2. two `persist_or_reuse_secret` lines immediately after the `PROFILE_SESSION_SECRET` one;
  3. two keys appended to the `profile.env` heredoc;
  4. two new row-blocks inside `report_config_values`, inserted just before its
     "DATABASE_URL / POSTGRES_* are not checked" comment;
  5. a new OTLP-probe block immediately after the `report_config_values` call;
  6. two `printf` lines inside the `checks.env` writer.
  **The nginx block, the compose heredoc, the prune section, the cron file and the TLS section were
  not touched at all** — `0276`'s regions are untouched.
- `profile-checks.sh` — two thresholds + `PROFILE_CHECKS_DISK_PATHS`, two `int_or_default` calls,
  `check_disk_usage` (9) and `check_players_growth` (10), both added to the run list; header comment.
- `example.env.profile` — a new commented block for both variables (commented, not blank: a blank
  assignment here would override a value sourced earlier).
- `scripts/config-parity-allowlist.json` — two inert phase-2 entries.

New docs:
- `ai-agents/knowledge-base/profile-junk-cleanup-runbook.md` — new, separate file. **`0275`'s
  `profile-backup-restore-runbook.md` was not touched.**

Tests:
- New: `tests/profile-server/Telemetry.test.ts`, `tests/profile-server/LoginCreationSwitch.test.ts`,
  `tests/profile-server/RouteMetrics.test.ts`, `tests/core/LoginContract.test.ts`,
  `tests/integration/JunkCleanup.it.test.ts`.
- Modified: `tests/profile-server/LoginRoutes.test.ts` (the switch block),
  `tests/profile-server/PlayerIdentityRepository.test.ts` (the hook + find-only block),
  `tests/integration/Login.it.test.ts` (a paused-app describe), `tests/integration/support/db.ts`,
  `tests/scripts/profile-deploy-hardening.test.sh`, `tests/profile-checks.sh`,
  `tests/scripts/ConfigParity.test.ts` (the pinned inert list), and `resolveExistingPlayer` added to the
  `ProfileRepo` mocks in `Routes/ErrorHandler/InboxRoutes/NameChangeRoutes/PaymentsRoutes/SessionRoutes`.

Not touched, per the plan's "must NOT do": any client file, any rate limiter, nginx `/internal/`, the
collector, `0277`'s delivery channel, any migration, game-server creation, any sprint plan or brief,
`profile-backup-restore-runbook.md`.

## Verification

Every command below was run in this session, on this host (macOS, Docker up).

```
npm test
  Test Suites: 134 passed, 134 total
  Tests:       1692 passed, 1692 total
  Time:        42.761 s
  (ShellHarnesses: all 4 ✓, none skipped — the docker-probed one ran in 3121 ms)

npm run test:integration
  Test Suites: 10 passed, 10 total
  Tests:       114 passed, 114 total
  Time:        4.799 s

npx tsc --noEmit
  (no output)

npm run lint
  > eslint
  (no output)

npm run check:config-parity
  pipeline: profile   REQUIRED 0 / INFO 0 / ALLOWED 0
  INERT 6  … OTEL_EXPORTER_OTLP_ENDPOINT, PROFILE_LOGIN_CREATE_ENABLED
  report-only — exit 0
```

`tests/profile-checks.sh` on its own: `94 passed, 0 failed` (was 71 before this task).
`tests/scripts/profile-deploy-hardening.test.sh` on its own: `ALL PASS`.

**No supertest flake was seen in any run** — no `Exceeded timeout of 5000 ms`, no
`Jest did not exit…`, no `socket hang up`, no `SIGSEGV`. Nothing needed re-running, so nothing is
being reported as "re-ran and it passed".

### Mutations executed (22) — each one turned a test red

| # | Mutation | Result |
|---|---|---|
| M1 | `loginCreateEnabled` hard-coded to `true` (switch ignored) | 4 failed |
| M2 | switch checked AFTER `resolveOrCreatePlayer` (creates, then refuses) | 3 failed |
| M3 | `metricPlatform` returns the raw body value | 9 failed |
| M4 | `route` label from `req.path` | 1 failed |
| M4b | `route` label from `req.originalUrl` | 2 failed (incl. the query-string leak) |
| M5 | creation hook fired on the found-player path | 2 failed |
| M6a–g | each `NOT EXISTS` removed one at a time (credits, 0-XP grants, intents, processed purchases, messages, name history, cosmetics) | 1–2 failed each |
| M7a | `min_age` guard removed | 2 failed |
| M7b | "never came back" (`last_login_at`) guard removed | 1 failed |
| M7c | `xp = 0` removed | 2 failed |
| M7d | `display_name is null` removed | 1 failed |
| M8 | disk `-gt` → `-ge` (boundary flip) | 1 failed |
| M9 | growth scaling removed (raw delta) | 3 failed |
| M9b | `check_players_growth` never called | 18 failed |
| M10 | OTLP `persist_or_reuse_secret` line removed | 2 failed |
| M10b | switch persist line put into `generate` mode | 1 failed |
| M11 | OTLP key dropped from the `profile.env` heredoc | 1 failed |
| M12 | switch export dropped from `build-deploy-profile.sh` | 3 failed |
| M12b | OTLP export dropped from `build-deploy-profile.sh` | 3 failed |
| M13 | `POSTGRES_DB` dropped from `checks.env` | 1 failed |
| M14 | the OTLP probe block deleted | 2 failed |

⚠️ **M12 and M13 reported ALL PASS on the first attempt, and that was my bug, not a coverage gap.**
The `perl` one-liners' backslash escaping meant the file was never edited. Both were redone with a
python exact-string replacement that asserts the needle exists, and both then killed tests. Recorded
because "the mutation survived" and "the mutation never happened" look identical in a log.

All mutated files were restored from a pre-mutation copy and verified byte-identical (`diff -q`) before
the final gate run.

Additionally, `Server.ts`'s one new SQL statement (the `pg_class.reltuples` estimate) was executed
directly against the test database to prove it is valid and that `Number()` converts pg's `bigint`
string: it returned `1`, and `1` again after an `ANALYZE`.

## Decision log — calls made without asking

Every item below is in-plan, verified `CORRECT` and mechanical/localized, or an obvious winner within
the plan's intent. Nothing here changed the plan's shape; anything that would have is in **Surfaced**
below instead.

1. **`sessionRejected` also counts "no Authorization header"** (plan §2, `resolveCaller` bullet).
   The plan says the reason set includes "no header (it answers `session_invalid`)". Implementing that
   literally meant the early-return branch had to record too, so I funnelled all three 401 branches
   through one `rejectCaller` helper rather than duplicating the call. In-plan, mechanical. The
   consequence is written into the code comment and is worth knowing: this counter is dominated by
   clients that simply have not logged in yet, so it reads as "sessions refused", not "attacks".
2. **`createProfileMetrics` returns a handle (`{metrics, refreshPlayersTotal, stop}`), not a bare
   `ProfileMetrics`** (plan §1). The plan specifies the 5-minute `reltuples` timer but not how a test
   drives it. A bare return would have forced the tests to wait on a real timer. `ProfileMetrics` itself
   is exactly the interface the plan lists; the two extra members are on the handle only, and
   `startProfileTelemetry` still returns a plain `ProfileMetrics`. Test seam, no behaviour change.
3. **`metricsExportUrl` / `statusClassOf` / `metricPlatform` exported as pure helpers** (plan §1).
   The plan requires the URL-normalization and `unknown`-platform behaviours to be tested; testing them
   through a live exporter would have meant real network I/O in a unit test. Mechanical.
4. **The repository's creation hook is wrapped in try/catch** (plan §2, the callback bullet). Not
   specified either way. An exporter that throws inside the hook would otherwise turn every brand-new
   player's login into a 500 — monitoring causing the outage it exists to watch for. Obvious winner
   within the plan's intent; a test asserts a throwing callback does not fail the resolve.
5. **`startProfileTelemetry` is called inside a try/catch in `Server.ts`** (plan §1, not specified).
   Same reasoning: metrics must never be why the service will not boot. The warn names the error type
   only.
6. **The players-growth check does not evaluate growth when less than an hour has passed, and does not
   advance its baseline in that case** (plan §5). The plan gives `Δ*24/hours`, which divides by zero on
   a hand-run repeat inside the same hour — and under `set -u`/`set -e` that would abort the script
   *before the ping*, which is the exact failure mode `0219` review R1 already fixed once for junk
   thresholds. Not advancing the baseline keeps the next daily run measuring a real window. In-plan
   (it is the undefined edge of the plan's own formula), localized, and it cannot mask a flood: the
   cron window is ~24 h.
7. **The "too young" survivor moved into its own integration test.** The plan's survivor list for
   `JunkCleanup.it.test.ts` includes "too young", but in the main test the whole window is older than
   `min_age`, so nothing there can exercise that guard — a survivor placed inside that window would
   have been kept by the *window*, not by `min_age`, and the assertion would have been vacuous. It is
   now a dedicated test with a recent window that flips on `min_age` alone (6 h → 0 candidates,
   1 h → 1 candidate). Same coverage the plan asked for, actually load-bearing.
8. **The runbook's predicate is a `create temp view` fed by a `cleanup_window` temp table, and the
   integration test binds parameters into that table rather than into the predicate** (plan §6:
   "`\set` variables swapped for bind parameters"). Postgres does not accept bind parameters in DDL,
   so a parameterised `CREATE VIEW` is impossible. Putting the window in a temp table means the
   predicate text is **byte-identical** between the runbook and the test — which is what the
   single-source-of-truth requirement was actually for — and the only parameterised statement is the
   one-line `INSERT`. Deviation is in the mechanism, not the guarantee.
9. **`tests/scripts/ConfigParity.test.ts`'s pinned inert list updated.** That test pins the exact list
   and its own comment says an entry appearing "is a change someone must have meant". The plan requires
   the two phase-2 entries, so this is that change; the comment was updated to say so.
10. **`run_checks` in `tests/profile-checks.sh` now passes `POSTGRES_USER`/`POSTGRES_DB`, and the
    "missing" case removes `backup.env` too.** `backup.env` is sourced with `set -a` and already
    carries both, so an `env -i` override alone could never produce the missing state. Test-fixture
    honesty; no production behaviour involved.
11. **The `48 h` scaling assertion matches `12[45]xx`, not the exact `12500`.** The script's `NOW` is a
    second or two past the harness's, and the scaling is integer division. Pinning the digit would have
    made the test flaky by construction; what is asserted is that the rate is halved.
12. **Two harness assertions I wrote were themselves wrong and were fixed, not worked around**: the
    OTLP-probe grep assumed the `curl` and the `/v1/metrics` text were on one line (they are not,
    because the command is wrapped), and the `checks.env` POSTGRES grep initially matched
    `backup.env`'s block and would have passed vacuously. Both now scope to the right block. Noted
    because a vacuous assertion is worse than a missing one.

## Surfaced — NOT decided here

Nothing in this build required a judgment call outside the approved plan, so nothing was blocked. The
items below are **facts the owner needs before or during the deploy**, not open decisions:

1. 🚨 **`src/profile-server/Server.ts` is not executed by any test.** It binds a port, and no suite has
   ever imported it — that predates this task, but this task added real logic to it (the switch parse
   and boot log, the `reltuples` query, the telemetry start, the repository hook). It is type-checked,
   its SQL was run by hand against Postgres (above), and every piece of logic in it is unit-tested in
   the module it came from — but **the wiring itself is first exercised on the box**. Concretely: the
   first proof that metrics actually flow is plan step 7.3 (series appear in Uptrace within ~1 minute),
   and the first proof the switch is wired is step 7.7.
2. **The OTLP reachability probe proves the network path, not the pipeline.** Any HTTP status counts as
   "reachable". A collector that answers 200 and then drops the metric would still read as reachable.
   Step 7.3 (seeing `geoconflict_profile_*` series in Uptrace) remains the only real proof.
3. **CORS preflights answered by an `app.use`-mounted handler are labelled `unmatched`.** They have no
   `req.route`, and the plan's rule is explicitly "`req.route` or `unmatched`". Bounded and harmless,
   but it means `unmatched` is not by itself a scanner signal on the `http.duration` panel. Written
   into the code comment.
4. **Aborted requests are not timed at all** — `finish` does not fire for them. Already a plan risk;
   restating it because it is invisible on the dashboard rather than obviously missing.
5. **`session.rejected` will be dominated by benign traffic** (see decision 1). Do not build an alert
   on its raw rate without a baseline.
6. **The daily-checks growth threshold (20000/24h) and disk threshold (80%) are untuned guesses** — the
   plan's defaults. They cannot be validated until real traffic exists; `0217`'s post-go-live
   re-baselining is where they should be revisited, alongside A2.
7. **Everything in plan step 7 is still blocked on `0277`** for anything alert-delivery-shaped. The six
   rules can be *created* without it; they cannot be *proven to arrive*.

---

# Round 2 — stateful review round 1 processed (2026-09-16)

Ledger: `review.md`. Plan re-hashed before editing: `0f929fca…` — matched. 13 findings; **12 acted on,
1 accepted as a residual (R11), 0 disputed**. The reviewer's *Reviewer findings* section and the
`Status:` header were not touched. Owner rulings on R9 (SPLIT) and R10 (KEEP) applied as ruled.

## Headline

- 🛑 **R1 (high) fixed — runbook only, no source change**, exactly as the reviewer scoped it. I
  re-reproduced it independently first and got the reviewer's numbers exactly, then re-ran the same
  script after the fix to prove the operator path works.
- **R1 can no longer regress into the document**: reverting the runbook to its original shape now
  turns **5 tests red** (verified, then restored).
- All five gates green: `npm test` 134 suites / **1697** tests, `test:integration` 10 / **118**,
  `tsc` clean, `lint` clean, profile parity **REQUIRED 0 / INFO 0**. No flake in any run.
- **`0276` is unblocked and its regions are still clean** — I added no new region to either file, and
  the timing middleware was neither moved nor edited.

## Decision log — this round

Each fix below was applied after verifying the claim against the code myself. All are
verified-CORRECT and in-plan (the review is the plan's step 6 gate); the three that go beyond the
literal instruction are called out as such.

13. **R3's throttle state is per repository INSTANCE, not module-level** — beyond the reviewer's
    "four lines". Module-level state leaked across tests: an earlier test in the same file consumed
    the 10-minute budget, so the new assertion saw an empty log and the test failed for a reason
    that had nothing to do with the code. Production constructs exactly one repository, so the
    behaviour there is identical. Obvious winner within the finding's intent.
14. **R4's guard also RESETS the baseline to now**, not only FAILs. The reviewer asked for the
    negative-`elapsed` guard; a FAIL alone would report the problem every day forever and still
    never advance the baseline, so the backstop would stay disabled until a human deleted the state
    file. Self-healing is the difference between "it told you" and "it fixed itself and told you".
    Tested both: the FAIL fires, and the next run evaluates growth normally.
15. **R1's fix uses `create or replace temp view` plus explicit drops, and names the `insert`
    columns.** The reviewer specified "reset or replace the window rows, and make the view creation
    re-runnable". Drop order is load-bearing (the view depends on the table) and is asserted.
    Naming the insert's columns is a small extra: it closes R7's "a swapped column order would turn
    no test red" at the source rather than only in the test.
16. **R7: the window block is executed statement-by-statement in the test**, because that is what
    psql does and it is the only way the runbook's own drops/creates are exercised rather than a
    retyped copy. The split is on `;` at end-of-line — safe for this block (no dollar-quoting, no
    semicolons inside strings), and noted in the test so a future block with a function body is not
    fed to it blindly.
17. **R12 is `0273` residue, fixed here and labelled as such** — not S5 scope creep. Recorded at the
    driver's explicit instruction and for the stated reason: a comment asserting a deleted feature
    still works is actively misleading, and I was already editing that file. **`0273`'s ledger and
    brief were not touched.**
18. **I re-verified the reviewer's disproof of the Codex `req.method` `high` rather than accepting
    it.** Raw request line with a canary method to a plain `http.createServer(app)` → `400 Bad
    Request`, handler never invoked. Agreed, no action. Recorded because accepting a disproof on
    trust is the same failure as accepting a finding on trust.
19. **Two test-fixture corrections of my own making**, neither a product change: the R4 test compares
    against a freshly-read clock rather than the harness's start-of-run constant (the script's `NOW`
    is seconds later, which would have made it flaky), and the R3 rate-limit test drives one
    repository through five creations rather than five repositories through one each, which is both
    the production shape and the only shape that tests the throttle.

**Applied unattended, no owner question raised this round.** Nothing in the batch was a
frontier-move, a regression, a disputed severity or outside the approved plan.

---

# Round 3 — review round 2 processed, review CLOSED (2026-09-16)

One finding (R14), applied unattended. Plan re-hashed: `0f929fca…` — matched.

## Headline

- **R14 fixed — runbook only. NO region of `Routes.ts` or `setup-profile.sh` was touched this
  round**, which is what clears `0276` to start.
- All five gates green and unchanged: `npm test` 134 / **1697** · `test:integration` 10 / **118** ·
  `tsc` clean · `lint` clean · profile parity **REQUIRED 0 / INFO 0**. No flake; nothing re-run.
- 🚨 The standing top residual is unchanged and stays stated plainly: **`Server.ts`'s wiring is
  executed by no test.** Green gates are not evidence it works.

## Decision log — this round

20. **R14: both `drop` statements in the runbook's window block are now `pg_temp.`-qualified.**
    Verified CORRECT and I agree with the reviewer's **low** over Codex's `high`: nothing in
    `migrations/`, `src/` or the live database is named `cleanup_window` or `junk_candidates`, so the
    blast radius is nil today. Fixed anyway — an unqualified `DROP` resolving through `search_path`
    to `public` on the first paste has no business in a block whose next statements delete production
    rows, and the fix is one token. In-plan (review gate), mechanical, obvious winner.
21. **I pre-checked the fix against a real database before applying it**, because `pg_temp.` on a
    session that has created **no temp object yet** is the common case — the first paste — and an
    error there would have broken the runbook for everyone. Both qualified drops succeed in a fresh
    session and still target the temp objects once they exist (0 left afterwards). Recorded because
    "the safer-looking fix breaks the normal path" is exactly the shape this check exists to catch.
22. **The test assertion now pins the qualified form AND rejects the unqualified one.** The existing
    drift guard went red the moment I edited the runbook, before I had touched the test — the
    coupling working as intended. Extending it to reject the unqualified spelling is what stops the
    qualification silently drifting back out later. Verified non-vacuous: un-qualifying the drops
    turns that test red; restored → 10/10.
23. **I re-verified the reviewer's disproof of the Codex `medium` "auth oracle"** rather than
    accepting it: `resolveCaller`'s ordering is byte-identical to round 1 (R9 added only the `reason`
    argument, no wire answer changed), and `POST /v1/login` already answers `503 session_unavailable`
    to a caller with no header at all. No action — same standard I applied to the round-1 `req.method`
    disproof.

**Nothing was disputed, nothing needed the owner, and no judgment call was left open.**
