# Review — 0270

Task: ai-agents/tasks/backlog/0270-profile-identity-s1-database-and-rekeying/brief.md
File(s) under review: migrations/006_player_identity.sql, src/profile-server/{Migrations,PlayerIdentityRepository,migrate,PlayerProfileRepository,InboxRepository,NameChangeRepository,PaymentsRepository,Routes,Server}.ts, src/core/profile/{PlayerProfile,InboxContract,NameChangeContract,MatchQualification}.ts, tests/integration/** (globalSetup, support/db, Migration006, PlayerIdentityRepository + 5 re-keyed suites), tests/profile-server/** (re-keyed + new PlayerIdentityRepository.test.ts, deleted PlayerProfileRepository.test.ts), tests/core/profile/{PlayerProfile,InboxContract}.test.ts, tests/IntegrationDatabaseGuard.test.ts, fixture keys in tests/client/PlayerProfileView.test.ts + tests/server/ProfileApiClient.test.ts, CLAUDE.md integration subsection
Status: closed-out

## Reviewer findings

Round 1 — 2026-09-15. Reviewers: fkit-reviewer (own pass) + Codex adversarial pass (`codex exec
--sandbox read-only`, completed normally, exit 0). **Coverage: full.** Scope: 0270's working-tree change
only (other uncommitted files belong to 0203 / 0260 and were not reviewed). Design authority: ADR-113,
approved `plan.md` (owner rulings D1, D2), design report §3/§4/§9.

Reviewer-run evidence this round: `npx eslint` on the in-scope TS dirs → exit 0; `npx jest
tests/profile-server tests/core/profile tests/IntegrationDatabaseGuard.test.ts` → 21 suites / 313 tests
passed; `npm run test:integration` ×1 → 7 suites / 94 tests passed. Codex ran `npx tsc --noEmit` → pass.

| #  | Round | Sev | file:line | Claim |
|----|-------|-----|-----------|-------|
| R1 | 1     | low | src/core/profile/PlayerProfile.ts:21, :39-60; src/profile-server/Routes.ts:296, :329; deployed consumers src/client/PlayerProfileView.ts:176, src/server/ProfileApiClient.ts:103 | **The v1 profile shape drops `yandex_player_id` while `CURRENT_PROFILE_SCHEMA_VERSION` stays 1** (raised by Codex, verified). Already-deployed parsers require `yandex_player_id: z.string().nullable()` (required, not optional), so a 200 body from the S1 box fails their parse: the old client card treats it as a failed read; the old game server's `upsertProfile` returns `false` ("not a citizen", fail-soft). **Unreachable today:** the game server makes no profile calls while `PROFILE_INTERNAL_TOKEN` is blank, and with 0 rows every `GET /v1/profile` is a 404, which old parsers never parse. The reverse direction (new parser, old box) is safe: extra keys are stripped. Plan §12 risk 4 already names this, and plan §5 gives the reason for keeping version 1 (bumping it breaks every deployed `z.literal(1)` harder). A cheap alternative exists: send `yandex_player_id: null` in public responses for one release, which old parsers accept and which carries no id. **Frontier-move** (a deliberate shape/version tradeoff, not wrong behaviour). Disposition is the owner's: see question Q1. |
| R2 | 1     | low | tests/integration/globalSetup.ts:66-79; tests/IntegrationDatabaseGuard.test.ts:6 | **The destructive reset's guard wiring is untested; only the predicate is.** `IntegrationDatabaseGuard.test.ts` pins `isLocalDatabase()` and `databaseHost()`. Nothing proves that `prepareIntegrationDatabase()` calls the guard **before** `DROP SCHEMA public CASCADE`. A refactor that moves the pool/DROP above the check, or drops the call, stays green in both `npm test` and `npm run test:integration` (the local DB passes the guard anyway). The worklog's hand check is not a gate. The predicate itself holds: I traced it against `pg-connection-string` 2.14.0. `host=` override, socket paths, empty host, `%2F` socket hosts, lookalike hosts, non-special-scheme IPv4 shorthand (`127.1`) and key=value strings are all refused, and pg takes the URL host over `PGHOST`. Cheap fix direction: a DB-less unit test that mocks `pg` and asserts no `Pool` is constructed for a remote URL. **Defect** (test gap on a destructive path). |
| R3 | 1     | low | src/core/profile/CreditContract.ts:37, :55; src/server/ProfileApiClient.ts:32, :74; src/server/GameServer.ts:104, :1330; tests/server/GameServerParticipation.test.ts:148 | **Comments still describe the dropped schema** ("no `player_profiles` row", "`(game_id, yandex_player_id)` primary key"). After `006` both are false: the table is `players`, and the ledger key is `(game_id, player_id)`. S1 fixed the identical stale line in `MatchQualification.ts` but left these. `src/server` is S1's no-touch zone (plan §11), and S3 (`0272`) rewrites `CreditContract.ts` and the game-server client anyway. Not a behaviour change. Recommended disposition: carry into `0272` rather than widen S1. **Defect** (stale documentation). |

**Owner dispositions — round 1** (the owner answered via `AskUserQuestion` in the lead session on
2026-09-15. The lead relayed the answers and the reviewer recorded them without seeing them first-hand):

| # | Owner ruling | Meaning for the coder |
|---|---|---|
| R1 | **Accept as known risk** | No code change. Recorded under *Accepted residuals* below. |
| R2 | **Coder fixes** | Add a test proving that `globalSetup` runs the host guard **before** `DROP SCHEMA public CASCADE`, so a remote URL never reaches a `Pool` or the DROP. The reviewer re-checks R2 once the coder's round lands. |
| R3 | **Carry into `0272` (S3)** | No change in S1, because `src/server` is off-limits here. The lead will have the producer add the stale comments to `0272`. |

Status stays `in-review` until the coder's round lands and R2 is re-checked.

**Round 2 — 2026-09-15 (re-check only). Reviewer: fkit-reviewer's own pass. Codex was not run: the
change was tests only, and the caller marked Codex optional.** No new findings.

- **R2 re-checked: ✅ fixed.**
  - `tests/IntegrationDatabaseGuard.test.ts` now mocks `pg` and `Migrations` and writes one ordered event
    log. Two refusal cases are covered — a remote host, and a `host=` override hiding behind localhost —
    plus an unset URL. Each throws with **zero** events: no `Pool`, no query, no DROP. The refusal
    message never echoes the URL or the password.
  - A local URL runs exactly `Pool → DROP → CREATE → applyMigrations → end`.
  - Moving the guard below the DROP, or deleting it, would record events and fail these tests. That
    matches the coder's executed mutation run.
  - `globalSetup.ts` is unchanged: the guard at `:66` still runs before `new Pool` at `:76`.
  - Reviewer run: `npx jest tests/IntegrationDatabaseGuard.test.ts` → 18/18 passed.
- **R1:** accepted residual (owner ruling).
- **R3:** carried to `0272` (owner ruling).

**Convergence: closed out** — no confirmed defect remains open. Still pending, and not part of this
review: the owner's box deploy and the post-deploy checks in brief step 8.

### Not recorded as rows (checked, no defect)

- **Migration `006`:**
  - **Guard:** a `DO` loop over all 7 old tables, `to_regclass` + `%I`, raises on any row. The runner's
    `begin` / apply / `commit` makes the refusal atomic. `Migration006.it` proves one refusal per table
    with a before/after schema snapshot.
  - **Columns and constraints:** match 001–004 column for column: `chk_*` names, the partial one-pending
    index, the `(player_id, id desc)` index, both message indexes, `default 'approved'` (kept on purpose,
    design §8 Q2), `xp_awarded default 10`.
  - **Foreign keys:** cascade on every child; `processed_purchases` keeps no FK and `intent_id` stays
    `on delete set null`, as in 002.
  - **`player_xp_grants`:** matches design §3.
  - **`drop … if exists`:** harmless, because the creates stay non-idempotent.
  - **Theoretical gap:** the guard's `select exists` takes no lock, so a writer committing between the
    guard and the `drop` would lose rows. Unreachable: the deploy swaps the container before `migrate`,
    and no running code writes the old tables.
- **`resolveOrCreatePlayer`:**
  - **Lost race:** it rolls back its own player; `ON CONFLICT DO NOTHING` waits on the winner's
    uncommitted identity.
  - **Retry:** only `23505` with `constraint === 'players_pkey'` is retried; 3 attempts.
  - **Release:** the client is released in `finally`.
  - **Pool:** no client is held across the find (`pool.query`) and the create (`pool.connect`), so it
    cannot deadlock the pool.
  - **1-hour throttle:** in SQL for both rows; the data-modifying CTE always runs.
  - **Test strength:** the integration tests force the race with a lock barrier and force a collision
    through a sequence-driven default.
- **Routes:**
  - Every public route resolves find-only via `resolveCaller`; the upsert route is the only creator.
  - Unknown-id answers match the plan table.
  - No player or platform id appears in any response body or in the three rewritten log lines.
  - `formatError` prints only `stack`/`message`, and pg puts key values in `detail`, so no id leaks.
  - Operator routes take a UUID-shaped `playerId`.
  - All caller schemas share `min(1).max(128)`, so no 400→403 drift. zod's UTF-16 length is ≤ Postgres
    `char_length`, so the identity CHECK cannot fire from a validated id.
- **Deploy-order risk (plan §0/§12):** accurate against `setup-profile.sh:941-1016`. The health gate and
  its digest rollback run before `migrate`; a failed migrate exits without rolling the image back.
  - **One nuance the plan omits:** even on the happy path, new code serves the old schema from the
    container swap until `006` commits (up to the 120 s health wait plus migrate). Harmless at zero
    traffic.
  - **Stale message:** the failure text at `:1013` says "migrations are idempotent", which `006` is not.
    A re-run after a refusal is still safe, because nothing was recorded.
  - Out of S1 scope (plan §11 forbids touching `setup-profile.sh`).
- **Builder flag 1 — the `NameChange.it` failure:**
  - **Not code-caused, as far as the evidence reaches.** The integration Postgres log covers all ~54
    runs since the change. It shows no deadlock, lock timeout, cancellation, termination or unexpected
    ERROR; every run's error set is the same expected set.
  - **Timing:** in the **first** run (the failing one), the gap from NameChange's approve-race test
    (`players_display_name_uq`) to the next suite's first DB error is **5.98 s**. The rest of that suite
    normally takes well under 1 s, and that same span is under 1 s in later runs. The ~5 s excess matches
    jest's 5000 ms default timeout, i.e. the **confirmed supertest timeout shape** (CLAUDE.md), not an
    assertion failure (that would be fast).
  - **Checked and ruled out:** truncate vs fire-and-forget inbox sends (lock order cannot cycle; a late
    send only hits an FK and logs), the notify cooldown map (fresh repository per test, no Telegram), the
    rate limiter (fresh app per test), and `ids` staleness (reset in `beforeEach`).
  - **Verdict:** *likely* the known flake, **corroborated but not proven** (the jest message was never
    captured).
- **Builder flag 2 — RED-first skipped: does not block.**
  - **Mutation-by-inspection (not executed):** each key new test fails under the obvious mutation:
    - guard removed → the per-table `rejects` cases fail; guard narrowed → 6 of 7 cases fail;
    - COMMIT instead of ROLLBACK on a lost race → the expected id and the 0-orphan check fail;
    - no retry → the collision test throws;
    - retry on any `23505` → the unit "other constraint rethrown" test fails;
    - `resolveCaller` switched to find-or-create → the route mocks assert no `resolveOrCreatePlayer`
      call, and `Routes.it` asserts no `players` row;
    - 1-hour condition dropped → "under an hour: untouched" fails;
    - identity CTE dropped → "older than an hour" fails.
  - **Why not executed:** a real mutation run means writing modified source, which is outside the
    reviewer's write scope. So the gap is recorded, not closed.
  - **Exception:** R2 is the one guard whose wiring no test would catch.

### Re-litigates settled decisions (suppressed)

- Guard allows any `localhost` database, including a local dev profile DB or an SSH-tunnelled remote on
  a local port → owner ruling **D1** "Local-only check" (`plan.md` approval record).
- `tests/profile-backup-dryrun.sh` still seeds 001's `player_profiles` → owner ruling **D2** "Later, in
  0218".
- Identity is client-asserted; `resolveCaller` adds no verification; payments intent for an unknown id
  now 404s → ADR-113 (re-raise conditions not met) / ADR-103; design §4.
- Internal player id sent in the operator Telegram notification → ADR-113 point 3 (operator tooling).

## Coder response

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT (low; unreachable today) | Frontier | none — the owner ruled "Accept as known risk"; already an accepted residual below. Claim checked in the code: `PlayerProfile.ts` dropped the key and the version stays 1; the deployed parsers (`PlayerProfileView.ts` and `ProfileApiClient.ts`, both on `PublicPlayerProfileSchema`) are off today (blank token, card off, 0 rows ⇒ 404). | won't fix (frontier) |
| R2 | CORRECT (low; test gap on a destructive path) | Defect | Added DB-less wiring tests to `tests/IntegrationDatabaseGuard.test.ts`. `pg` and `Migrations` are mocked and write one ordered event log. The tests prove: a remote URL and a `host=` override both throw with **zero** events (no `Pool`, no query, no DROP); the refusal never echoes the URL or password; an unset URL makes zero DB calls; a local URL runs exactly `Pool → DROP SCHEMA public CASCADE → CREATE SCHEMA public → applyMigrations → end`. **Mutation run (executed):** guard moved below the DROP → 2 tests fail; guard call removed → 3 tests fail; `globalSetup.ts` restored byte-identical (git hash-object match) → 18/18 pass. No source change: `globalSetup.ts` was already correct. | ✅ done |
| R3 | CORRECT (low; comments only) | Defect | none in S1 — the owner ruled "Carry into `0272`". `src/server` is untouched. `CreditContract.ts:37,:55` (src/core, comment-only) are also left for S3, which rewrites that contract. | won't fix (carried to 0272) |

## Accepted residuals (shared, do-not-re-litigate)

- **v1 profile shape without a version bump** (R1, owner "Accept as known risk", 2026-09-15)
  - **What:** the v1 profile shape (`PlayerProfileSchema` / `PublicPlayerProfileSchema`) no longer
    carries `yandex_player_id` or `persistent_id`, and `CURRENT_PROFILE_SCHEMA_VERSION` stays `1`.
    Already-deployed client and game-server parsers, which still require `yandex_player_id`, would
    reject a 200 profile body from the S1 box.
  - **Why (structural):** both old consumers are switched off today.
    - The game server makes no profile calls while `PROFILE_INTERNAL_TOKEN` is blank.
    - The citizenship card is off, and with 0 rows every `GET /v1/profile` is a 404.
  - **Rejected alternatives:**
    - Bumping the version: it breaks every deployed `z.literal(1)` parser outright.
    - Sending `yandex_player_id: null` for one release: not chosen by the owner.
  - **Re-raise only if:** `PROFILE_INTERNAL_TOKEN` is set, or the citizenship card is switched on,
    before S3 (`0272`) and S4 (`0273`) are deployed.
