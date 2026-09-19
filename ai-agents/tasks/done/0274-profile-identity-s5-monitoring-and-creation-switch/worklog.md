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

---

# Drill — verification step 6 / plan §7.6: RAN AND PASSED (2026-09-17, ~20:06–20:16 UTC)

Recorded by a spawned `fkit-producer` (board-record worker) for `/fkit-sprint-ship-loop`. The drill
itself was run by the lead session with the owner watching Telegram. **No code, no commit, no task
move, no status token change** — this task stays `🚧 Blocked`.

⚠️ **Naming, recorded once so the next reader does not hunt:** this step is **verification step 6 =
`plan.md` §7 step 6 (`plan.md:201`)**, written here as **§7.6**. It has been called **"§8"** in
several places, including `0277`'s review ledger and its close note. **Same step. There is no §8.**

## Procedure actually used

1. 20 requests to the public read-only `GET /v1/profile` with a deliberately junk Bearer token
   → **20 × `401`**, each incrementing `session_rejected` with reason `invalid`. **No writes, no rows,
   no restart.**
2. That call **created the metric `geoconflict_profile_session_rejected` in Uptrace.** It had not
   existed before, because the counter had never been incremented.
3. Throwaway monitor created: `DRILL — delete me — rejected sessions (>0 / 1 min)`, metric
   `geoconflict_profile_session_rejected`, aggregation `perMin(sum($rejected))`, grouping interval
   **1 minute**, checking the **last 1 point (1 minute)**, max allowed **0**, attached to the
   `alerts-to-telegram` channel.
4. A second burst of **25** requests (20:11:51–20:12:24 UTC) made it fire.
5. Requests stopped. The alert **closed by itself** — no deletion, no restart: a **genuine recovery**.
6. Throwaway monitor deleted. **Cleanup verified: 9 monitors remain, the drill rule is gone, A5
   (monitor id 9) is intact and active.**

## Result — PASS on every check

- Uptrace recorded the alert with `alert.status` = **`closed`**, `alert.type` = **`metric`**,
  value **25**.
- **OWNER CONFIRMED, live in the lead session via `AskUserQuestion`: BOTH messages arrived in the
  Telegram Alerts topic — a 🚨 firing, then a ✅ resolved.** The owner was offered four outcomes (both
  messages / only the firing / two firings with no ✅ / nothing at all) and selected
  **"Both — a 🚨 then a ✅"**.

## What this discharges

1. **`0277` residual `1a-ii`** — *"a synthetic test does not exercise a real `alert.name`, a real
   `alert.status`, or the resolved/recovery form"* — **DISCHARGED.** A real metric alert fired and
   cleared.
2. **`0277` residual 2 / this task's D8** — *"`alert.status`'s value vocabulary is UNVERIFIED; a
   resolved alert may render as still firing"* — **DISCHARGED. The value is `closed`, which
   `AlertRelay.ts:141` already matched.** ⚠️ **This was CONFIRMED, not designed** — the relay was
   written to match `closed`/`resolved` without anyone knowing which value Uptrace used. It happened
   to be right.
3. **Verification step 6 / §7.6 — PASSES**, by the corrected procedure above.

⛔ **`0277` is already closed** (`ai-agents/tasks/done/0277-uptrace-alert-delivery-to-telegram/`) and
its `✅ Done (agent-closed — not owner-verified)` marker is a **landed Done that only the owner may
change**. It was **not touched**: the same evidence was **appended** to that task's `worklog.md`
(evidence, not status).

## 🚨 A defect in this task's plan, found by running it

`plan.md` §7.6 (`plan.md:201`) specifies the drill fixture as *"temporarily add an always-true rule
(`process.memory.rss > 1`), wait for the Telegram message, delete the rule."*

**That fixture CANNOT PASS this drill.**

- An always-true rule **never clears**, so it can only ever prove the **🚨** half.
- **Deleting a monitor is not a recovery event**, so **no ✅ is ever produced.**

Had the drill been run as written it would have gone **green while proving nothing about the recovery
path** — the exact silent-success failure this epic exists to close.

✅ **The working fixture is the one recorded under *Procedure actually used* above** (junk-Bearer
requests → a `>0 / 1 min` monitor on `session_rejected` → stop → it self-clears), and it **supersedes
§7.6's**. ⛔ **`plan.md` is byte-frozen and was NOT edited.** The supersession is recorded here, in
`brief.md` (owner step 4 and verification step 6) and in the Sprint 4 board addendum — the same
handling the other superseded plan items on this task got.

## ⚠️ What this PASS does NOT prove — read before treating the drill as finished

- **Amendment A1 is NOT satisfied.** A1 requires the drill to also establish delivery **after an idle
  period** (the stale-connection defect). **Both bursts in this run were minutes apart on a warm
  connection.** ⛔ **A PASS on §7.6 is not a discharge of A1.**
- **`0283`'s daily digest remains the only non-circular proof of *sustained* delivery.** Unchanged by
  this run.
- ✅ **CORRECTION, same day — `0277` residual `1a` (*"the message CONTENT is not proven in
  production"*) is DISCHARGED, not open.** This section first recorded it as **still open**, on the
  ground that tonight's messages are **different messages** from the synthetic Test-channel press and
  that the owner had been asked only **which** messages arrived, never how they rendered. That was
  correct on the evidence then in hand — **and it is why the question was then put to the owner.** Two
  confirmations close it: (1) the **Test channel** press, earlier on **2026-09-17**, confirmed by owner
  **screenshot** — `Status:` line present, **no `{{ }}` placeholders**, the link a tappable *open the
  alert* anchor rather than a bare address, and **no hostname preview card** (which is what validated
  `disable_web_page_preview`, testable only live); (2) **tonight's real fired-and-cleared pair**,
  confirmed by the owner answering `AskUserQuestion` live in the lead session (three options offered —
  clean / something looks off / did not look closely): **"Clean — like the test message."** ⇒ `1a` is
  discharged **for both message forms**. Full record in
  [`0277`'s worklog](../0277-uptrace-alert-delivery-to-telegram/worklog.md). ⛔ The original
  reasoning is kept above rather than deleted: a gap was noticed and then filled.

## Still blocked

Five of the six alert rules (**A1, A2, A3, A4, A6**) do not exist — **A5 alone**. **Owner step 7.7**
(live switch + cleanup drill) is untouched. Amendment **A1** above is open.

---

# 2026-09-17 — The circular dependency in owner step 3, and the owner's ruling on it

## Headline

**Four of the six alert rules (A1, A2, A3, A6) CANNOT BE BUILT, and the owner ruled they are DEFERRED
until real login traffic exists.** `0274` will close with a **named gap**, not a full set of six rules.
**A5 is built** (monitor id 9, active). **A4 is the only other one whose metric exists, and it has not
been attempted.**

## The circular dependency, in words

It was invisible until someone checked whether the metrics **actually exist** in the Uptrace metric
picker. Drawn out:

```
0274 closes  ──needs──▶  six alert rules A1–A6
      ▲                            │
      │                   those rules need metrics
   needs                   that only real player
      │                      traffic can create
      └──── game deploy ◀──needs───┘
```

`0274` cannot close until A1–A6 exist. Four of those rules need metrics that only real player login
traffic can create. That traffic needs the game server deployed. And **`0274`'s own `plan.md`
(*Deploy order*) sequences the game deploy AFTER `0274` closes.** So the rules cannot be built, and the
only thing that would make them buildable is gated behind the very task they are blocking.

## ⛔ The deploy order is NOT the defect — stated plainly so it is not “fixed”

The owner ruled **earlier in this same session** that the game server deploys later, *“when we're ready
to ship citizenship/profile”*. **That ruling stands.** ⚠️ **The lead had repeatedly and wrongly described
the game deploy as an *unblocker* for this task — the owner corrected it.** The real constraint is not
sequencing at all: **four of the rules watch traffic that does not exist.**

## The facts, verified in the LIVE Uptrace metric picker, 2026-09-17

| Rule | Metric it needs | In the picker? | Disposition |
|---|---|---|---|
| **A1** — player-creation spike | `players.created` | ❌ absent | **DEFERRED** until real login traffic |
| **A2** — created ÷ logins ratio | both login counters | ❌ absent | **DEFERRED** — already “create now, arm later” |
| **A3** — login failures by `outcome` | `login.requests` | ❌ absent | **DEFERRED** until real login traffic |
| **A4** — p95 login latency | `http.duration` | ✅ present | **Only other buildable one — NOT attempted** |
| **A5** — DB pool saturation | `db.pool.waiting` | ✅ present | ✅ **BUILT** — monitor id 9, active |
| **A6** — login request rate | `login.requests` | ❌ absent | **DEFERRED** until real login traffic |

⚠️ **This is not a configuration error to fix; it is the absence of traffic.** A metric appears in
Uptrace **only once its counter is first incremented** — **proven tonight**, when the first junk-Bearer
request created `session_rejected` from nothing. The four absent counters have never been incremented
because **no real player has ever logged in**.

## 🔴 The owner ruling

Given **live in the lead session this turn, via `AskUserQuestion`**. Three options were put:

1. Try a **YAML-paste route** that might bypass the metric picker.
2. **Defer A1 the way A2 already is.**
3. Keep `0274` **open until go-live**.

**The owner chose option 2 — “Defer A1 like A2 already is.”** The reasoning stated in the option they
selected, quoted: *the plan already says A2 is “create now, arm later — day 8 after go-live”; treat A1
the same, record it as deliberately deferred until traffic exists, and let `0274` close on the rules
that CAN be built. Honest and unblocks the task, but it means closing `0274` with a named gap rather
than a full set.*

⛔ **Not producer precedent.**

## ⚠️ Scope of the ruling — what the owner was asked vs what was applied

The owner was asked about **A1**. **`fkit-lead` extended the ruling to A1, A2, A3 and A6** — same cause
(metric absent for want of traffic), same remedy, and A2 already carried it — and **told the owner so
explicitly rather than re-asking four times**; the four-rule table above was shown to the owner in that
same message. **Record the extension as the lead's APPLICATION of the owner's ruling, NOT as a separate
owner ruling.**

## ⚠️ A4 is not yet known to be buildable either

A4 is the only other rule whose metric is present, but **A4 needs a percentile query, which the
architect recorded as UNVERIFIED against Uptrace 2.0.2.** It may turn out not to be expressible in this
version. **That is not yet known** — it has to be attempted.

## 🔭 Follow-up worth filing — NOT filed by this worker

The Uptrace UI offers **“New monitor from YAML”**, a free-text paste box that **bypasses the metric
picker**. It was **looked at but NOT tested** — testing it is a write. Two things it *might* solve:

- **(a)** defining rules for **metrics that do not exist yet** — which would reopen A1/A2/A3/A6 now;
- **(b)** the standing risk that **monitors and channels are UI-only state**: `setup-telemetry.sh` seeds
  **no monitors and no channels**, so a box rebuild or a lost volume **silently deletes every alert
  rule**. YAML definitions could live in the repo.

⚠️ **Neither (a) nor (b) is verified.** Both are plausible and both are untested.

## Still blocked — corrected list

The token stays **`🚧 Blocked`**, on three live things:

1. **A4 has not been attempted**, and is **not yet known to be buildable** (percentile query,
   UNVERIFIED against Uptrace 2.0.2).
2. **Owner step 7.7** — the live switch + cleanup drill — **untouched**.
3. **Amendment A1** — delivery after an *idle* period — still not satisfied. ⚠️ **A DIFFERENT “A1” from
   alert rule A1; do not conflate them.**

⛔ **Alert rules A1, A2, A3 and A6 are no longer on the blocker list** — they are **deliberately
deferred**, not missing by accident.

---

## 🎯 OWNER STEP 7.7 RAN AND PASSED — 2026-09-19, on the live profile box

**Owner-executed at the console, driven step-by-step from the `fkit lead` session
(`/fkit-sprint-ship-loop`). The owner ran every command and pasted every result; the lead verified each
before issuing the next.** The procedure itself was authored by a spawned `fkit-coder` from the code,
not improvised at the keyboard.

⛔ **The task status token is NOT changed by this entry.** Step 7.7 was **one of three** live blockers;
discharging it does not unblock the task. See *What is left* below.

### What step 7.7 asks for, verbatim from `plan.md` §7.7

> *one synthetic login with the switch **off** (expect 503, **no row**), then **on** (one row), then
> delete that row using the runbook.*

**Its whole purpose: it is the only proof that the creation switch actually BLOCKS.** Step 7.3
(9 live metric series in Uptrace) proved the wiring exports; it never proved the switch stops anything.

### Result — PASS on both halves

| Switch | HTTP | Body | identity rows | `players` |
|---|---|---|---|---|
| **OFF** | **503** | `{"error":"creation_paused"}` | **0** | **0** |
| **ON** | **200** | `"created":true` | **1** | **1** |

**Same call, same synthetic platform id, opposite outcomes — and the only thing that changed between
them was the switch.** That is the claim step 7.7 exists to test, and it held.

🚩 **The body mattered more than the status code, and this is the part worth remembering.** *Three*
different conditions return `503` on that route, and only one of them proves anything:
`creation_paused` (the switch refused) · `session_unavailable` (the session secret is unset or too
short — the route returns **before** the switch is ever consulted) · a DB fault. **A drill that had
only recorded "503" would have proved nothing and looked identical to a pass.** The observed body was
`creation_paused`, so the switch was genuinely reached and genuinely refused. As a free side effect,
that also confirms the session secret is correctly set on the box.

### Timeline, all UTC, 2026-09-19

| | |
|---|---|
| 14:12 | pre-flight — switch **empty** (fail-open ⇒ ENABLED), persist file **absent**, `players` = **0**, drill id absent, DB timezone **UTC**, both containers healthy |
| 14:32:51 | boot log `login creation PAUSED (PROFILE_LOGIN_CREATE_ENABLED)` |
| — | login → `503 creation_paused`; identity **0**, `players` **0** |
| 14:36:42 | boot log `login creation ENABLED (PROFILE_LOGIN_CREATE_ENABLED)` |
| 14:36:59.417964 | login → `200`, `"created":true`; identity **1**, `players` **1** |
| — | cleanup: dry run **`candidates = 1`, `drill_rows = 1`**, `oldest = newest = 14:36:59.417964+00` → `DELETE 1` → repeat `DELETE 0` → `vacuum (analyze)` |
| 14:42:57 | boot log `login creation ENABLED` — switch restored |
| — | final: `players` **0** · persist file **absent** · both containers healthy · `/health` **200** · `/ready` **200** |

### Cleanup — the runbook's own procedure, not an ad-hoc DELETE

`ai-agents/knowledge-base/profile-junk-cleanup-runbook.md` §4 → §5 → §6 → §7, using its **verbatim**
predicate block (the one `tests/integration/JunkCleanup.it.test.ts` extracts and runs). Only the three
`\set` values differed, which is what §10 prescribes for a rehearsal.

🚩 **The rehearsal weakens `min_age` from the owner-ruled 6 hours to seconds, and that is the guard
that stops this procedure deleting a player who is in a match right now.** The gate against it was an
absolute requirement that the dry run return **exactly `candidates = 1`**. It did — and the risk was
structurally nil on this box anyway, because `players` held **zero** rows before the drill, so no real
player could be in scope. **On a box with live players that would not be true, and the
`candidates = 1` gate is the only thing standing between the rehearsal and real data loss.**

⛔ **No ids recorded**, per §7.7. No player id, no synthetic platform id, no session token, no host.
The `200` response body carries a session token and was **deliberately never printed** — the command
wrote it to a temp file inside the container, extracted only the `"created"` field, and deleted it.

### Three method findings, recorded because each would have produced a false result

1. **`docker compose restart` does NOT work for this.** It does not re-read `env_file`, so the old
   value stays live in the running container and **the switch looks broken when it is not**. The
   correct form is `up -d --force-recreate --no-deps`.
2. **`--no-deps` is load-bearing.** Without it, compose force-recreates the dependency too — i.e. it
   **restarts Postgres**. With it, Postgres's uptime was unbroken across all three API recreations
   (observed: 29 h → 30 h, never reset).
3. ⚠️ **The junk-cleanup runbook's own `psql` snippets are broken when pasted on the box.** They write
   `psql -U "$POSTGRES_USER"` unwrapped, but nothing sets that variable in a root login shell, so it
   expands to **empty**. Every command in this drill wrapped them as
   `sh -c 'psql -U "$POSTGRES_USER" …'` so they resolve **inside** the container. **This is a real
   defect in that runbook and it is not fixed by this entry** — filing it is a follow-up.

✅ Also **no full `setup-profile.sh` redeploy was used**, deliberately: the container-recreate path is
the runbook's own and is far less destructive, and a redeploy would additionally have fired `0283`'s
deploy-time Telegram digest for no reason.

### What is NOT restored — stated so nobody claims the box is byte-identical

1. **`pg_class.reltuples` for `players` is now analysed for the first time.** This task's own history
   records it as `reltuples = -1, analyzed = NEVER`, which is exactly why `players_total` was correctly
   absent from Uptrace. The `vacuum (analyze)` in §7 sets it. **Expect
   `geoconflict_profile_players_total` to start reporting, most likely `0`.** That is the metric
   appearing **as designed**, not a new fault — and it is the observation this brief required before
   any alert is armed on that metric. 🚨 **The standing rule still holds: do not arm an alert on
   `players_total` until it has actually been observed.**
2. **Counters moved and do not go back down.** `login_requests` gained one `outcome="creation_paused"`
   and one `outcome="created"`; `players_created` gained one. **This is the first real data those
   series have ever carried.**
3. Three container recreations; one dead tuple's worth of reclaimed space.

### What this does NOT prove

- ⛔ **Nothing about amendment A1** (delivery after an idle period). Different concern entirely.
- ⛔ **Nothing about alert rules.** A4 is still unbuilt; A1/A2/A3/A6 remain deliberately deferred by the
  2026-09-17 owner ruling.
- ⛔ **It is not a test of nginx or the public edge.** The login was issued from inside the container
  against `127.0.0.1`, deliberately — host nginx is `0276`'s concern, not §7.7's.
- ⛔ **It says nothing about the game-server creation path** (`/internal/v1/players/resolve`), which is
  **not** gated by this switch by design.

### What is left on this task after step 7.7

**Two of the three live blockers remain:**
1. **A4 (p95 login latency) is still unbuilt.** ⚠️ **Its status text here is now STALE:** it says A4 is
   *"NOT yet known to be buildable"* because the architect recorded percentile queries as unverified
   against Uptrace 2.0.2. **That was resolved in the lead session on 2026-09-17** — `p95($duration)`
   was typed into the aggregation field in the live UI and the chart rendered real data. **A4 is
   buildable; it has simply not been built.** A producer should reconcile that wording.
2. **Amendment A1** — delivery after an idle period — still unsatisfied, and still has no owner on any
   board.

**Step 7.7 is discharged. The task is not.**

---

# 2026-09-19 — STATUS DETERMINED: `🚧 Blocked` → `🔄 In progress`. ⛔ NOT CLOSED, and this entry says exactly why.

Written by a **spawned `fkit-producer`** for `/fkit-sprint-ship-loop`. ⛔ **No mover skill was invoked, no
task file was moved, `plan.md` was not touched, nothing was committed.**

## The owner's ruling, and its exact scope

**Owner, live in the `fkit lead` session 2026-09-19, relayed by `/fkit-sprint-ship-loop`:**
*"unblocked once A1 is filed."*

Amendment A1 is now filed as
[`0289`](../../backlog/0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/brief.md)
(Sprint 4 — **the board and rank are the producer's call, not the owner's**; the owner ruled only *that
it gets its own task*). ⇒ **The ruling is satisfied and the `🚧 Blocked` token is retired.**

⛔ **"Unblocked" is not "done". The owner ruled the first, not the second.** Nothing here closes the task.

## All three named blockers are gone — each for a different reason

| # | Blocker | Disposition |
|---|---|---|
| 1 | **Owner step 7.7** — live switch + cleanup drill | ✅ **DISCHARGED 2026-09-19**, owner-executed, passed both halves. See § *OWNER STEP 7.7 RAN AND PASSED* above. |
| 2 | **A4** — p95 login latency | ➡️ **MOVED** to [`0288`](../../backlog/0288-alert-rule-a4-p95-of-login-latency-over-750ms-for-10-min/brief.md), owner-ruled 2026-09-19. |
| 3 | **Amendment A1** — delivery after an idle period | ➡️ **MOVED** to [`0289`](../../backlog/0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/brief.md), owner-ruled 2026-09-19. ⚠️ A **different** A1 from alert rule A1. |

## 🚨 Why it is NOT `✅ Done` — two owner steps have never been performed

**The previous entry's *What is left* list was incomplete.** It named only A4 and amendment A1. A sweep of
the **full `plan.md` §7 owner-step list** — which a status entry had not done since 2026-09-17 — found two
more, and **neither is done, deferred, nor moved.**

**Method, so the claim can be checked:** grepped `brief.md`, `worklog.md`, `plan.md`, `ai-agents/sprints/plan-sprint-4.md`,
`ai-agents/knowledge-base/alert-delivery-runbook.md`, `ai-agents/knowledge-base/reports/2026-09-17-alert-rules-a1-a6-design.md`
and the worklogs of `0277`, `0283` and `0284`. **No record of either step exists anywhere.**

### (i) The Uptrace dashboard — `plan.md` §7.4 = `brief.md` owner step 2 — was never built

Nine live `geoconflict_profile_*` series have been arriving since 2026-09-17 (step 7.3 ✅), and **no
dashboard was ever created over them**: login rate by outcome · creations by source · created ÷ logins ·
login p95 · error share · pool waiting · players total · `create_enabled` · CPU/memory.

The only prior statement on it is the 2026-09-17 note in this task's Sprint 4 row — *"no owner step 2–4 is
recorded done anywhere in the brief, and the lead reported this turn that none exist."* Steps 3 (rules) and
4 (drill) have since moved on. **Step 2 has not.**

⚠️ **Not blocked. Runnable today** — the series exist and the UI is reachable.

### (ii) The name-change operator notification was never observed arriving — and it is itself an owner ruling

**Owner ruling 2026-09-17:** fold this verification into this task's deploy drill, **file NO separate
task** (`brief.md` owner step 5 / `plan.md` amendment A3). So it cannot be quietly dropped: no other task
is allowed to hold it.

🚨 **[`0283`](../0283-daily-digest-of-pending-name-change-reviews/brief.md)'s daily digest is NOT
this, and must not be mistaken for it.** Two digest messages were owner-observed on 2026-09-19 — but:

| | The digest (`0283`) | This step (`0067` → unowned since) |
|---|---|---|
| What it is | a **daily** summary, count of pending reviews | a **per-request** operator notification, one per name-change submission |
| Where it runs | `npm run digest:name-changes` → `src/profile-server/sendNameChangeDigest.ts`, a **separate short-lived CLI** | `src/profile-server/NameChangeRepository.ts:542`, inside the **long-lived server process** |
| Failure trace | withholds its marker ⇒ `profile-checks.sh` check 12 pages within 26 h | ⛔ **none at all** — the send's result is discarded with `void` |

⇒ **Watching the message land is the only evidence that exists for step (ii).** ⛔ Not *"the code returned
`sent`"* — an **observed arrival**.

⚠️ **This closes a handoff dropped since [`0067`](../0067-name-change-citizens-only/brief.md)**,
which routed the verification to `0033`; `0033`'s brief never picked it up, and for ~three weeks no task on
any board owned it. ⚠️ **Not blocked. Runnable today** — the profile box's Telegram egress was fixed
2026-09-17 and is proven working.

## 🔴 The named gap this task will close with — recorded so no close can ever read as "monitoring is done"

- **ONE of six alert rules exists: A5 alone** (`profile · DB pool saturated`, monitor id 9, active).
- **FOUR — A1, A2, A3, A6 — are DELIBERATELY DEFERRED** for want of login traffic, owner-ruled 2026-09-17.
  **They have no task of their own.**
- **A4** ➡️ `0288`. **Idle-period delivery** ➡️ `0289`.

⛔ **The owner's 2026-09-17 acceptance of *"closing with a named gap rather than a full set"* covers the
four deferred RULES.** It is **not** an acceptance of the two unperformed owner steps above, which nobody
has ruled on.

## 🚩 What the owner needs to decide

Perform the two remaining owner steps — **both are live-box work, neither needs code** — **or** rule them
deferred / moved. **Either answer closes this task immediately.** ⛔ A spawned producer has no owner
channel (ADR-033 §5), so this is returned as an open question rather than resolved.

⛔ No secret, host, IP, chat id or topic id appears anywhere in this entry.

---

## 🎯 OWNER STEP 5 / AMENDMENT A3 RAN AND PASSED — 2026-09-19, live box

**The per-request name-change operator notification has now been OBSERVED ARRIVING.** Owner-executed
at the console, driven step-by-step from the `fkit lead` session; the owner ran every command and
pasted every result, and the lead checked each before issuing the next. Procedure authored by a spawned
`fkit-coder` from the code.

### Why an observation was the only possible evidence

`notifyOperator` is **fire-and-forget** — `void sendTelegramMessage(...)` at
`src/profile-server/NameChangeRepository.ts:542`, and the HTTP request has already returned before it
resolves. On **success it logs nothing at all** (`:548-562` logs only when the outcome is neither `sent`
nor `sent_after_retry`). **No log line, no metric and no test can reach this path.** A message landing
in the topic is the only evidence that can exist for it — which is exactly why this was an owner step
and not something an agent could ever discharge.

⛔ **This is NOT `0283`'s daily digest** and the two must never be conflated. The digest is a separate
one-shot CLI run by host cron that counts pending rows once a day. This is the **per-request** send
fired from inside the running API container the instant a player submits. Different code, different
trigger, different message header.

### Result — PASS on all four identity checks

The message arrived in the **Name Changes** topic, and every one of the four checks that distinguish it
from any other message matched:

| Check | Result |
|---|---|
| Header reads **`[Name change] Pending request`** — *not* `Daily digest` | ✅ the per-request path, not `0283` |
| `Player:` matches the uuid of the player created minutes earlier | ✅ exact match |
| `Requested:` matches the submitted name | ✅ exact match |
| `Time:` matches the submission instant | ✅ **same second** — submitted `16:39:52Z`, message stamped `16:39:52.881Z` |

**Delivery was effectively instantaneous** — under a second, first attempt, no retry needed.

🔒 **A second thing confirmed in passing, and worth recording:** the message's *Approve* block renders
`$PROFILE_API_URL` and `$PROFILE_INTERNAL_TOKEN` as **literal shell variable names, not values**
(`NameChangeRepository.ts:492-496`). **No secret is put into a Telegram message** — designed that way,
and now verified in a real one.

### What was done, in order

1. **Login** → `200`, `created=true`, session token minted (never printed; written to a 0600 file
   *inside* the container, the response body deleted immediately).
2. **Citizen flip by direct SQL** → `UPDATE 1`. ⚠️ **Required, not optional:** `requestNameChange`
   gates on `is_citizen` in SQL on every call (`NameChangeRepository.ts:222-224`); a non-citizen gets
   `403 not_citizen` with **nothing inserted and no notification sent** — which would have looked
   exactly like a delivery failure. ⛔ **This is a drill fixture and NOT how citizenship is granted** —
   the real path is XP accrual through `/internal/v1/credit`. One column was the smallest change that
   satisfies the gate, and it was erased with the player.
3. **Name-change request** → `200 {"status":"ok"}`, one `pending` row created.
4. **Observed the message** — the four checks above.
5. **Cleanup** → `DELETE 1`, cascade removed the identity and the name-change row.
6. **Restore verified** → `players`/`identities`/`name_history`/`messages` all back to **0**,
   `/health` **200**, `/ready` **200**, both containers healthy, Postgres uptime unbroken.

### 🚩 The cleanup DEPARTED from `profile-junk-cleanup-runbook.md`, deliberately — recorded so it is not read as an oversight

**The runbook cannot remove this drill's player, and should not be changed so that it could.** Its §4
predicate excludes the row **twice over**: `and not p.is_citizen` (step 2 set it true) and
`and not exists (select 1 from player_name_history nh where nh.player_id = p.id)` (step 3 created
exactly such a row). Its dry run would have returned `candidates = 0` and deleted nothing.

**Both exclusions are correct and must stay.** A player who is a citizen, or who has asked for a name
change, **is not junk**. This drill is the exception, not a case to generalise from.

**What was used instead:** a scoped delete keyed on `player_identities`' primary key
`(platform, platform_user_id)`, against a synthetic id minted for this run that exists nowhere else.
**A typo in it matches zero rows — it cannot widen.** Children went automatically: every related table
references `players(id)` with `on delete cascade`. Dry run first, confirmed exactly one row and that it
was ours (0 xp credits, 0 messages), then the delete.

**Alternatives weighed and rejected:** deleting the name-history row first and then running the runbook
would *still* fail on `is_citizen`, and would then mean a **window-based bulk delete with a 6-hour
`min_age` wait** to remove one row already addressable by key — strictly wider blast radius, strictly
slower. Resolving the request through the moderation path would set a real display name, fire an inbox
message, and still leave the player needing deletion.

**No backup was taken**, also a departure (runbook §3). The justification: one row, created minutes
earlier by the operator, on a database holding **zero** real rows, addressed by a unique key, and
recreatable in thirty seconds.

### Three process findings, recorded because each cost a round trip

1. **Shell variables set in one pasted block did not survive to later pastes.** Two attempts sent an
   **empty** `platformUserId` and were correctly rejected `400 bad_request` — the schema requires
   `min(1)` and `JSON.stringify` silently drops an `undefined` key. ⚠️ **The root cause was NOT
   established**, and in particular this is **not** evidence that `docker compose exec -e` is broken —
   the value was already empty on the host before it could be passed. **Fix: hardcode literals into each
   pasted block rather than relying on a variable surviving.** Any future drill of this shape should do
   the same.
2. **A `psql` one-liner written by the lead used `$$` as a SQL string delimiter and broke** — in bash
   `$$` expands to the process id. The authored procedure's heredoc form was correct; the lead's
   "simplification" of it was not. **Lead error, not a procedure defect.**
3. ✅ **`docker compose exec -T` DOES forward a heredoc on stdin** — the procedure listed this as
   unverified; it is now verified working, repeatedly.

### 🚩 Process note — the authoring subagent returned a SECURITY WARNING

The `fkit-coder` that wrote this procedure returned flagged: **`Remote Shell Writes`**. It had been
instructed to author only and touch no box. **Before any of it was used, the owner ran a read-only
audit of the live box:** player counts still `0|0|0|0`, Postgres uptime unbroken at 31 h, `profile-api`
unchanged since the earlier 14:42 restart, the creation switch untouched, no API requests in the log,
and the only file modified in four hours was `alerts/last-alert-probe.json` at 15:17 — **`0284`'s
hourly probe, on schedule.** ⚠️ **One check could not be run: `last` is not installed on the box, so
SSH login history was not examined.** Everything that could be checked said untouched. The most likely
explanation is that the flag fired on the procedure's **text**, which is several hundred lines of
`docker compose exec`, `psql` and `DELETE` written out for a human to run. **Recorded as unresolved
rather than cleared.**

### What is NOT restored

**Metric counters moved and do not go back down** — this login and request added datapoints to the
profile service's counters. Expected; counters are monotonic. Nothing else differs.

⛔ **No ids in this entry** — no player uuid, no synthetic platform id, no session token, no host, no
chat or topic id.

### What this discharges, and what it does not

✅ **Owner step 5 / `plan.md` amendment A3 is DISCHARGED.** It also closes the handoff `0067` routed to
`0033` and `0033` never picked up.

⛔ **It proves nothing about Uptrace alert delivery.** This message went to Telegram **directly** from
the API container. It never crossed the Uptrace relay, nginx's `/internal/` allowlist, or the monitoring
box's egress. ⛔ **It does not discharge `0289`** (delivery after an idle period) — the connection here
was in active use seconds earlier.

---

## OWNER STEP 4 / DASHBOARD BUILT — 2026-09-19, live Uptrace UI

**Who did it:** the lead (`fkit-lead`), in the browser, signed in as the owner's Uptrace admin. This
is a **UI-only** act, so there is no script, no commit, and no diff. It is recorded here because
nothing else would record it.

### What exists now

Dashboard **`profile · overview`** (project `geoconflict`, dashboard id 9), path `/metrics/1/9/grid`.
It was created earlier in this session with an **empty grid**; the grid now holds **nine chart
panels**, all saved and re-read back after a page reload:

| # | Panel title | Metric | Aggregation | Group by |
|---|---|---|---|---|
| 1 | Login rate by outcome (per min) | `…_login_requests` | `perMin(sum($requests))` | `outcome` |
| 2 | Creations by source (per min) | `…_players_created` | `perMin(sum($created))` | `source` |
| 3 | HTTP p95 by route | `…_http_duration` | `p95($duration)` | `route` |
| 4 | Request rate by status class | `…_http_duration` | `perMin(count($duration))` | `status_class` |
| 5 | DB pool — connections waiting | `…_db_pool_waiting` | `avg($waiting)` | — |
| 6 | Players total | `…_players_total` | `avg($total)` | — |
| 7 | Creation switch (1 = open, 0 = paused) | `…_login_create_enabled` | `avg($enabled)` | — |
| 8 | Process CPU usage (ratio) | `…_process_cpu_usage` | `avg($usage)` | — |
| 9 | Process memory RSS | `…_process_memory_rss` | `avg($rss)` | — |

(`…` = `geoconflict_profile`. Metric names are not secrets; no host, token or id appears above.)

### What was NOT built, and why

⛔ **The plan's "created ÷ logins" ratio panel is NOT built.** It needs two metrics divided inside one
chart expression, which this Uptrace build's chart editor did not make available in the same way the
single-metric panels were. **Panels 1 and 2 sit next to each other and carry the same `perMin` unit**,
so the ratio is readable by eye — that is a workaround, not the panel the plan asked for. Left open
deliberately rather than quietly dropped.

### A claim I made mid-run and then corrected — recorded so it is not repeated

⚠️ I told the owner, from a first look at the metric picker, that **`login_requests`, `players_created`
and `session_rejected` were absent**. **That was WRONG for the first two.** The picker I read was inside
a chart editor left in a stuck state whose list had not re-rendered. On a clean editor,
`geoconflict_profile_login_requests` and `geoconflict_profile_players_created` are both present, and
panels 1 and 2 are built on them. **`session_rejected` was not seen in any clean listing either — but
I did not scroll the full list a second time to confirm its absence, so treat that one as UNCHECKED,
not as confirmed missing.**

### What the panels showed on first light — observations, not conclusions

- **The 7.7 creation-switch drill is visible.** Over a 3-hour window panel 7 dips from `1` to `0` and
  back around 17:35 MSK. The switch drill left a trace in the record on its own.
- **Today's A3 name-change drill is visible.** Panel 1 shows `bad_request` then `created` around
  19:35–19:37 MSK — the two empty-`platformUserId` 400s followed by the successful create. Panel 3
  shows `/v1/profile/name-change-request` at **17.5 ms** p95.
- **`/v1/login` p95 is ~9.2 ms; `/ready` ~10–13 ms; `/health` ~5 ms.** ⚠️ This is a **1-hour, almost
  no-traffic** sample and says nothing about p95 under load. It is **not** evidence for or against
  alert rule A4's 750 ms threshold (task `0288`), whose deferral reason 2 — that at near-zero login
  traffic the p95 *is* a single request — is untouched by this.
- **`db_pool_waiting` is flat 0** and **`players_total` is flat 0** (correct: the drill player was
  deleted).
- **CPU ~1.2 %, RSS ~398 MB, both flat** over the hour. ⚠️ One hour is far too short to say anything
  about a memory leak; it is a starting reading, not a trend.

### 🚩 Two things seen on the board that are NOT explained, and are NOT mine to close

1. **A 4xx burst at roughly 20:15 MSK**, reaching ~20/min on a 3-hour view against a ~0.4/min baseline
   — a single narrow spike. **I did not identify its source.** It is not the A3 drill (that was
   19:35–19:37 and was 2 requests). Worth one look at which route took it.
2. **A `5xx` series exists in the 3-hour window** (~0.13/min, around 17:40 MSK). The 1-hour view has
   **no** 5xx at all, so this is historic, not current. **Unexplained.** It may be the 7.7 drill's own
   503s — the creation-paused path returns 503 — but **I did not verify that**, and 17:40 is not an
   exact match for the switch dip at ~17:35.

**Neither is asserted as a defect.** Both are "the new board immediately showed something nobody was
looking at", which is the board doing its job.

### The standing risk this does NOT remove

🚨 **Dashboards, monitors and notification channels are UI-only state in this Uptrace deployment.**
`setup-telemetry.sh` seeds none of them. **A rebuild of the monitoring box deletes this dashboard and
every alert rule with it**, and nothing in the repo would recreate them. This entry is the only
written record of what the board contains — it is documentation, not a restore path.

⛔ **No ids in this entry** — no host, no token, no chat or topic id, no player uuid.
