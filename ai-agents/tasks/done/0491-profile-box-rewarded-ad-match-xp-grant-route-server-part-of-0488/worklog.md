# 0491 — worklog

## 2026-10-24 — Build (Part S, steps 1–6, plus the Part S tests)

**Provenance.** Spawned `fkit-coder`, **Build worker**, under the ADR-055 declared-approval marker from `fkit-lead`
(driving `/fkit-sprint-ship-loop` on Sprint 9). Approved plan carried verbatim: `plan.md` in this folder
(blob `3a2e4e5104bd151176219f3d1e0b9b1878df4eaa`, re-hashed this session and matching; byte-identical to `0488/plan.md`).
Owner approval quoted by the lead, 2026-10-24, `AskUserQuestion` in the lead session: *"Approve as planned
(Recommended)"* and *"Split it (Recommended)"*. Scope: Part S only. Nothing committed or pushed.

### Change surface — by plan step

| Step | What | Files |
|---|---|---|
| 1 | Shared contract: `RewardedMatchXpRequestSchema { gameId: string 1..128 }` (the `CreditItemSchema.gameId` bound), `RewardedMatchXpResponseSchema { status, xpAwarded ≥ 0, xp ≥ 0 }`, `REWARDED_MATCH_XP_STATUSES` | `src/core/profile/RewardedMatchXpContract.ts` (new) |
| 2 | Ledger table `player_rewarded_match_xp (game_id, player_id → players(id) ON DELETE CASCADE, xp_awarded ≥ 0, granted_at, PK (game_id, player_id))`. `009` was still free (newest file was `008_tester_role_snapshots.sql`), checked before creating it | `migrations/009_player_rewarded_match_xp.sql` (new) |
| 3 | `grantRewardedMatchXp(gameId, playerId)`: one transaction — lock `players` row FOR UPDATE → read base credit row → none ⇒ `not_credited` (rollback, nothing written) → insert ledger row with the **base row's `xp_awarded`**, conflict ⇒ `duplicate` (reports the stored amount) → add XP → earned-citizenship crossing (same `GRANT_CITIZENSHIP_SQL` and decision as `creditMatchXp`) → post-commit inbox hook. No player row ⇒ `not_found`. New types `RewardedMatchXpGrantStatus`, `RewardedMatchXpOutcome` | `src/profile-server/PlayerProfileRepository.ts` |
| 4 | `POST /v1/profile/rewarded-match-xp`: optional `rewardedMatchXp` repo in `AppOptions` (absent ⇒ `503 rewarded_match_xp_unavailable`), `publicCors("POST")`, `resolveCaller` + `sendCallerFailure`, 400 / 401 / 503 / 404 / 500, 200 `{ status, xpAwarded, xp }` with `xp` through `xpForCaller`. Log line carries outcome and amount only. New `RewardedMatchXpRepo` interface | `src/profile-server/Routes.ts` |
| 5 | Wiring `rewardedMatchXp: profiles`; counter `geoconflict.profile.rewarded_match_xp.grants` by `outcome` (`RewardedMatchXpGrantOutcome`: granted, duplicate, not_credited, not_found, bad_request, unauthorized, unavailable, error) + no-op | `src/profile-server/Server.ts`, `src/profile-server/Telemetry.ts` |
| 6 | **No change, evidence checked:** the profile box's host nginx (written by `setup-profile.sh`) has `location ~* ^/internal/` plus a `location /` catch-all, which reaches `/v1/*`. The route reads no env var; `npm run check:config-parity` reports `REQUIRED 0` on all three pipelines and the profile pipeline `INFO 0`. `Dockerfile.profile` copies `migrations/` whole and `build-deploy-profile.sh` ships `migrations`, so `009` deploys with no script change | — |

**Tests (new, as the plan names them):**
- `tests/core/RewardedMatchXpContract.test.ts` — request bounds (1 / 128 / 129 chars, wrong types, empty body), bound equal to `CreditItemSchema.gameId`, client-sent amount and id stripped; response statuses, zero amounts, negative / fractional / missing values refused.
- `tests/profile-server/RewardedMatchXpRoutes.test.ts` (supertest) — 200 for `granted` / `duplicate` / `not_credited`; repository gets the body's game id and the **session's** player id; client-sent amount/id ignored; 400 (4 bodies + malformed JSON); 401 no token / bad token / expired; 503 no session secret; 503 not wired; 404; 500; CORS on preflight and on errors; metric recorded once per request for every outcome, none for a preflight; `xp` equalisation for `vfy:false` citizens and true total for `vfy:true`; **no player id, token or game id in any log line**.
- `tests/integration/RewardedMatchXp.it.test.ts` (real Postgres) — no base row ⇒ `not_credited`, nothing written; granted adds the base row's `xp_awarded` (3 → 6); second call ⇒ `duplicate`; another player's credited game ⇒ `not_credited`; 99 → 101 crosses into earned citizenship, inbox message exactly once (a later grant for the now-citizen sends none); two concurrent grants ⇒ one row, XP once (×5); player erasure cascades the ledger, and the orphaned token then gets 404.

**Existing files my change would otherwise have made wrong (updated):**
- `tests/profile-server/{InternalPathCase,AlertRoutes,RouteMetrics}.test.ts` — their full `ProfileMetrics` literals gained `rewardedMatchXpGrant` (type-correctness only).
- `tests/profile-server/Telemetry.test.ts` — the new counter added to the attribute allowlist and exercised in the existing "every counter", "allowlist" and "no-op" tests.
- `tests/integration/Migration006.it.test.ts` — the exact applied-migrations list gains `009_player_rewarded_match_xp.sql`; the exact `player_id`-column table list gains `player_rewarded_match_xp`.
- `tests/integration/support/db.ts` — the new table added to `PROFILE_TABLES` (the "ONE list" every suite truncates).
- `tests/testdata/profile-restore-drill/verify.sql` — the new table added to the coverage exclusion list and fingerprinted (row count + content digest); header `11 tables` → `12 tables`. Without this the drill's `uncovered_tables: none` check would fail once `009` exists. `tests/profile-backup-dryrun.sh` — its matching `11 tables` message → `12`. Same pattern task 0425 used for `tester_role_snapshots`.

### Commands run and results

| Command | Result |
|---|---|
| `git hash-object plan.md` | `3a2e4e5104bd151176219f3d1e0b9b1878df4eaa` — matches the marker |
| `npm test -- <7 targeted suites>` (contract, new routes, Telemetry, RouteMetrics, AlertRoutes, InternalPathCase, TenureGrantRoutes) | 7/7 suites, 270/270 tests passed |
| `npx tsc --noEmit -p tsconfig.json` (whole project, tests included — integration file type-checked here) | exit 0, 0 errors |
| `npm run lint` | exit 0 |
| `npx prettier --check` on every changed TS file | clean (one new test file reformatted with `--write` first) |
| `npm run check:config-parity` | `REQUIRED 0` on game, profile, client; profile `INFO 0`; report-only exit 0 — no new finding |
| `npm test` (full, through the npm script and project lock) | exit 0 — 230/230 suites, 4811/4811 tests, 101 s. No supertest timeout, no `SIGSEGV`, no re-run needed. Shell harnesses included (Docker was up) |
| after the comment trim: `npm test -- <5 suites>` (contract, new routes, Telemetry, TenureGrantRoutes, Routes) + `npx tsc --noEmit` + `npm run lint` scope re-check on the trimmed files | 5/5 suites, 190/190 tests; tsc exit 0; eslint + prettier clean |

**Skipped — not passed:**
- **`npm run test:integration`** — skipped. `TEST_DATABASE_URL` is not exported in this shell (`.env.test` exists but jest does not load it), and the `gc-0012-it-pg` container exists but is **stopped** (`Exited (0) 9 days ago`; Docker itself is up). The brief allowed the run only if both were available; I did not start the container. **So `RewardedMatchXp.it.test.ts`, the updated `Migration006.it.test.ts` lists, and migration `009` itself have never run against Postgres.** The SQL is type-checked TypeScript around untested SQL text.
- **`tests/profile-backup-dryrun.sh`** (`npm run test:scripts:docker`) — not run; needs Docker plus `age`, `rclone`, `jq` (CLAUDE.md). The `verify.sql` change is therefore unexercised.

### Notes for review / deploy
- ⚠️ `verify.sql` now names `player_rewarded_match_xp`, and it runs with `ON_ERROR_STOP`. A restore drill run against a box **before** `009` is deployed there would fail on the missing table. Run any live drill after this deploys.
- The junk-cleanup runbook predicate (`ai-agents/knowledge-base/profile-junk-cleanup-runbook.md`) is **not** changed: it already requires `xp = 0` and no `player_match_xp_credits` row, and a rewarded row can only exist beside a base credit row, so no rewarded player can be a junk candidate. `JunkCleanup.it.test.ts`'s table list is about that predicate and stays correct.
- No index on `player_rewarded_match_xp.player_id`, mirroring `player_match_xp_credits` (same PK shape, same cascade path).
- The route is **not** gated on `verified` (same as tenure-grant, ADR-112 accepted risk): a `vfy:false` token for a player can claim for them, but only the bonus for a match already credited to that player, once.

### Decision log (every autonomous / obvious-winner call)
1. **Test file path `tests/core/RewardedMatchXpContract.test.ts`** — kept exactly as the plan names it, although sibling contract tests live in `tests/core/profile/`. Qualified: the plan names the path; following it is in-plan, no judgment.
2. **`xp` in the response schema is `int().min(0)`** (plan text: `xp: int`). Mirrors `TenureGrantResponseSchema.xp`; XP is never negative. Obvious winner within intent; a one-token tightening of the shared contract.
3. **Ledger `xp_awarded` has `check (xp_awarded >= 0)`**, the `player_xp_grants` check. Plan lists the column without a constraint. Obvious winner: `>= 0` (not `> 0`) so no base row the game server could write is refused.
4. **No rate limiter on the route.** The plan says "mirroring `tenureGrant`" and names none; tenure-grant has none by owner ruling. In-plan reading.
5. **`not_credited` returns the caller's current `xp` (equalised) and `xpAwarded: 0`**; `duplicate` returns the stored ledger amount. Plan gives the response shape but not these values; chose the tenure-grant analogues (`below_minimum` / `duplicate`). Obvious winner within intent.
6. **Updated the five existing test/fixture files listed above** (metric mocks, Telemetry allowlist, Migration006 lists, `PROFILE_TABLES`, restore-drill `verify.sql` + dryrun message). Qualified: each is mechanical and localized, and each would otherwise be wrong (type errors, or a failing exact-list / coverage assertion) because of the planned migration and counter. The drill edit follows task 0425's precedent for `tester_role_snapshots`.
7. **Did not change the junk-cleanup runbook** — reason under *Notes*. Doc under `ai-agents/knowledge-base/`; no change needed for correctness.
8. **Did not start the stopped `gc-0012-it-pg` container** — the brief's condition was "only if … up"; reported skipped instead.
9. **Comments trimmed to the project's 1–2-line why-only rule** after the first draft (comment-only edit, made while the full `npm test` was running; no code changed, targeted suites re-run after — see table).

## 2026-10-24 — Verify (spawned coder, sprint-ship-loop VERIFY step; no source written)

Owner ruling quoted by the lead, 2026-10-24, `AskUserQuestion` in the lead session: *"Yes, start it and
run (Recommended)"*: start the stopped `gc-0012-it-pg` container and run `npm run test:integration`.
Throwaway local test DB only.

| Step | Result |
|---|---|
| `docker start gc-0012-it-pg` (Docker 28.5.1 was up; container was `Exited (0) 9 days ago`) | started, `pg_isready` ok, port 5433 |
| `TEST_DATABASE_URL` loaded from `.env.test` into that one shell only (value never printed) → `npm run test:integration` | **exit 0: 14/14 suites, 188/188 tests, 11.4 s.** Includes `RewardedMatchXp.it.test.ts` PASS and `Migration006.it.test.ts` PASS (with the `009` list entries). Migration `009` applied by the real runner in `globalSetup`. No `Exceeded timeout`, `socket hang up`, `did not exit` or `SIGSEGV` in the output. **No re-run.** |
| `docker stop gc-0012-it-pg` | stopped again (`Exited (0)`), the state it was found in |
| `npm run test:scripts:docker` (`tests/profile-backup-dryrun.sh`): run this time, since `age`, `age-keygen`, `rclone`, `curl`, `jq`, `node` and Docker were all present. Throwaway local compose project (Postgres + MinIO on loopback), cleaned up by its own trap | **exit 0: `RESULT: 55 passed, 0 failed`.** Migration runner applied `009_player_rewarded_match_xp.sql`; `verify.sql covers every source table (uncovered_tables: none)`; restore `fingerprint IDENTICAL (12 tables, …)` |

**Caveat, not a failure:** the drill's `seed.sql` puts no rows in `player_rewarded_match_xp`, so the
restore round-trip proves the table exists and is fingerprinted, but over **0 rows**. Row-level behaviour
of the new table is covered by `RewardedMatchXp.it.test.ts`, not by the drill.

**Still not run:** nothing from the earlier "Skipped" list. Both items there have now run green. No live
box was touched; a live restore drill still has to wait until `009` is deployed (see *Notes for review /
deploy* above).

Decision log (this step): none. No fix applied, no obvious-winner call.

## 2026-10-24 — Process review, round 1 (spawned coder, Process-review worker)

**Provenance.** Spawned `fkit-coder`, **Process-review worker**, under the ADR-055 declared-approval marker
from `fkit-lead` (driving `/fkit-sprint-ship-loop` on Sprint 9). Approved plan carried verbatim
(`plan.md` blob `3a2e4e5104bd151176219f3d1e0b9b1878df4eaa`, re-hashed and matching). Owner approval
quoted by the lead, 2026-10-24, `AskUserQuestion` in the lead session: *"Approve as planned
(Recommended)"*, *"Split it (Recommended)"*; on this review: R2 *"Write a short ADR update
(Recommended)"*, reviewer question 2 *"Accept, no follow-up"*. Nothing committed or pushed.

| Finding | Outcome |
|---|---|
| R1 | Verified (partly): runbook updated, see decision log 1. |
| R2 | Resolved by the owner-ruled ADR-112 amendment (architect). No coder edit. |

**Checks:** `bash tests/scripts/profile-deploy-hardening.test.sh` (the one harness that reads the
runbook) → `ALL PASS`. Full `npm test` **not run**: a docs-only change; no source, test or SQL file was
touched this round. Prettier `--check` flags the runbook, but it flags the `HEAD` version too (the file
was never Prettier-formatted), so this is not new.

### Decision log (this round)
1. **R1 — runbook fix applied without per-fix asking.** Finding: `profile-backup-restore-runbook.md`
   stale for `009`, and the pre-deploy hazard written only in this worklog. Change: ⚠️ note "run a live
   drill only after `009` is deployed" (STOP at P5's migration list, before seeding); inventory 11 → 12
   tables with `player_rewarded_match_xp`; P5 list adds `009_player_rewarded_match_xp.sql`; step 2
   counts add `player_rewarded_match_xp 0` and `schema_migrations 8`; "11 tables" → 12 in step 5 and
   pass criteria; the 30 / 17 constraint / index line marked as a `006` measurement not re-measured
   since `007`–`009`. Qualified: verified `CORRECT` on those parts, mechanical and localized to one doc,
   and in-plan — it is the doc half of the already-applied `verify.sql` change for plan step 2's
   migration, on task 0425's precedent. **Not re-measured:** the constraint / index totals (that would
   need a runner-built DB); stated so in the runbook instead of guessing a number.

## 2026-10-24 — Close (spawned producer, sprint-ship-loop CLOSE step)

Closed via `/fkit-task-done` by a spawned `fkit-producer` (no owner channel), marker
`✅ Done (agent-closed — not owner-verified)` (ADR-033 §5). Brief verification steps 1–7 checked against this
worklog before the move: all met. ⚠️ **Not committed, not deployed.** Deploy order: the profile box first (weekend
slot), then the `0488` client. Live verification belongs to a verify task.
