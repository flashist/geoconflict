# Plan — 0270 Profile identity S1: database and re-keying (approved)

## Approval record

- Written by the driver (`fkit-lead`, `/fkit-sprint-ship-loop`) at approval, 2026-09-15, copied from the
  plan-only `fkit-coder` worker's return. Approved by the owner via `AskUserQuestion` in the lead session:
  **"Approve"**.
- Design authority: ADR-113 (accepted 2026-09-15), `ai-agents/knowledge-base/reports/2026-09-15-profile-identity-design.md` §9, ADR-112 (amended).
- Owner rulings on the plan's NEEDS-DECISION items (2026-09-15):
  - **D1 — "Local-only check"** (option a): the integration reset refuses unless `TEST_DATABASE_URL`'s host
    is localhost / 127.0.0.1 / ::1, with a clear error.
  - **D2 — "Later, in 0218"** (option a): `tests/profile-backup-dryrun.sh` is NOT changed in S1; the producer
    notes in 0218 (restore drill) that the dry-run must be rebuilt on the 006 schema.
- Worker's own reading, not objected to: "touch `last_login_at`" updates both the identity row and the player row.

---

## Summary (from the worker)
- **Deploy risk: the new image goes live before the migration runs.** `setup-profile.sh` swaps the container first, waits for `/health`, and only then runs `npm run migrate`. If migration `006` refuses (a row appeared) or fails, the box is left running new code on the old schema. Every profile route then answers 500 until the previous commit is redeployed. Today there is no traffic, so this is survivable. There is also no path back once `006` has applied: only fixing forward.
- **Local test database, checked read-only:** it holds rows left over from old runs, a `player_xp_grants` table from the parked `005`, and `schema_migrations` listing 001–004. The new test setup wipes and rebuilds the schema on every run, so the test database needs no manual reset. The one-time reset is only for a local *dev* profile database, if the owner has one.
- **The brief's counts are stale in two places:** there are **5** integration suites today, not 7 (`TenureGrant.it.test.ts` left with the parked patch; the "7 tables" count in the guard is correct); brief item 2 (delete `005`) is already done.
- **Known limit in the release:** in S1, a payments intent for an unknown Yandex id answers `404 not_found` instead of silently creating a profile. The design accepts this (§4); the card switch is off, so no player can reach it.

## 0. Pre-flight (checked 2026-09-15)
- `migrations/` = 001–004. `src/profile-server/`, `src/core/profile/`, `tests/integration/` and `tests/profile-server/` have no uncommitted changes, so none of `0253`'s code is in the tree. Serialization with `0253` holds.
- Integration Postgres container `gc-0012-it-pg` is up. The test role is superuser and owns the database, so dropping and recreating the schema works.
- Unrelated uncommitted files exist in the tree (`Dockerfile`, `src/client/OtelBrowserInit.ts`, …). The profile image copies all of `src/`, so a deploy from the working tree would ship them. The owner decides what is committed before `npm run deploy:profile`.

## 1. Migration `migrations/006_player_identity.sql`
**Header comment:**
- The runner wraps the file in one transaction.
- Unlike 001–004, the file is deliberately **not** idempotent: its `create table` statements have no `IF NOT EXISTS`, so a wrongly shaped leftover table fails loudly instead of being silently kept.
- Re-applying is prevented only by the runner's filename bookkeeping.

**Order inside the file:**
1. **Guard.** A `DO $$` block loops over the 7 old tables: `player_profiles`, `player_match_xp_credits`, `player_name_history`, `player_cosmetic_ownership`, `purchase_intents`, `processed_purchases`, `player_messages`.
   - Tables missing per `to_regclass` are skipped; each existing one is checked with `EXECUTE format('select exists (select 1 from %I)', t)`.
   - Any row → `RAISE EXCEPTION` with a message naming ADR-113 and "now a data migration — re-plan, do not bypass". No ids or values in the message.
2. **Drop old tables.** `drop table … cascade` for all 7, children first.
3. **`players`.** Exactly design §3:
   - `id uuid primary key default gen_random_uuid()`, `last_login_at`;
   - the three `chk_*` constraints copied verbatim from 001;
   - `players_display_name_uq` on `lower(display_name)`, partial (only rows with a name).
4. **`player_identities`.** Primary key `(platform, platform_user_id)`; `platform` check `in ('yandex_games')`; `char_length` between 1 and 128; `player_id` references `players` with `on delete cascade`; plus `player_identities_player_idx`.
5. **Child tables re-keyed.** `player_id uuid`; everything else preserved; old names kept, so the constraint names the code relies on stay stable:
   - `player_match_xp_credits`: primary key `(game_id, player_id)`, FK with cascade. `xp_awarded integer not null default 10` stays verbatim (the stale default is not changed here).
   - `player_name_history`: 001's columns plus 004's `rejection_reason` and `decided_at`. **`moderation_status default 'approved'` preserved** (design §8 Q2 default), with the trap comment carried over. Keeps `player_name_history_one_pending_uq` (partial, pending only) and `player_name_history_player_recent_idx (player_id, id desc)`.
   - `player_cosmetic_ownership`: primary key `(player_id, cosmetic_type, cosmetic_id)` plus the type check.
   - `purchase_intents`: uuid primary key, FK with cascade, `purchase_intents_player_idx`.
   - `processed_purchases`: `player_id uuid not null` **with no FK** (the receipt outlives an erasure); `intent_id … on delete set null`.
   - `player_messages`: `chk_message_content`, `chk_read_after_sent`, and both indexes re-keyed.
6. **`player_xp_grants`.** Created here, per design §3: `xp_awarded integer not null check (xp_awarded >= 0)`, `kind in ('tenure')`, primary key `(player_id, kind)`.
- 001–004 are left byte-identical.

## 2. Runner extraction
- **New `src/profile-server/Migrations.ts`:** `export async function applyMigrations(pool, migrationsDir, options?: { filter?: (filename) => boolean }): Promise<string[]>`.
  - It is today's loop moved verbatim: create `schema_migrations` → sorted `.sql` files → skip applied → `begin` / apply / record / `commit`, roll back on error, throw `migration failed: <file>`.
  - It returns the list of files applied.
  - `filter` exists only so tests can build a 001–004 database.
- **`migrate.ts` shrinks to the entry point:** dotenv, `createPool`, `applyMigrations(pool, MIGRATIONS_DIR)`, `pool.end`, exit code. The runner's behaviour is unchanged.
  - The extraction must live in its own module: importing `migrate.ts` runs `run()` and `process.exit`.
  - `import.meta.url` already works under jest (`CosmeticsConfig.ts` precedent).

## 3. `src/profile-server/PlayerIdentityRepository.ts` (new)
- `export const PLATFORM_YANDEX_GAMES = "yandex_games"` and `type Platform`. These stay local to the server in S1: no client sends a platform until S2, whose `LoginContract` can take them over.
- `findPlayerByIdentity(platform, platformUserId): Promise<string | null>`. Find-only; never writes.
- `resolveOrCreatePlayer(platform, platformUserId, source: "login" | "game_server"): Promise<{ playerId; created; profile }>`, exactly per design §4. **Not a single CTE.** Up to 3 attempts:
  1. **Look up the identity.** Hit → one `UPDATE` sets `last_login_at = now()` on the identity row and on the `players` row, but only where it is older than 1 hour (the condition sits in the SQL) → load the profile → return `created: false`.
  2. **Miss.** `pool.connect()`, then `BEGIN`, `INSERT INTO players DEFAULT VALUES RETURNING id`, and `INSERT INTO player_identities … ON CONFLICT (platform, platform_user_id) DO NOTHING RETURNING player_id`.
     - Row returned → `COMMIT` → `created: true`.
     - No row (another tab won the race) → `ROLLBACK`, so no orphan player → next attempt starts at step 1.
     - `23505` with `constraint === 'players_pkey'` → `ROLLBACK`, retry.
     - Any other error → `ROLLBACK` (quietly) and rethrow.
     - `release()` in `finally`.
  3. **Attempts exhausted** → throw a plain error (no ids in the message) → the route answers 500.
- `source` is accepted now and unused until S5 metrics (lint allows unused args).
- "Touch `last_login_at`" updates both the identity and the player row.

## 4. Repositories re-keyed to `playerId`
- **`PlayerProfileRepository`:**
  - `getProfile(playerId)` reads `players where id = $1`.
  - `creditMatchXp(gameId, playerId, xp)`: `CREDIT_SQL` / `GRANT_CITIZENSHIP_SQL` move to `players.id` and `player_id`; the FK violation still maps to `no_profile`.
  - Remove `upsertProfile`, `UPSERT_SQL`, `PersistentIdConflictError` and `PG_UNIQUE_VIOLATION`.
  - `rowToProfile` maps a `players` row.
- **`InboxRepository`:** `SendMessageInput.playerId`, `sendTemplate(playerId, …)`, `listMessages(playerId)`, `markRead(playerId, ids)`. The citizen check reads `players where id`. The `no_profile` warning line no longer prints an id.
- **`NameChangeRepository`:**
  - Every SQL statement moves to `player_id` / `players.id`.
  - `DISPLAY_NAME_UNIQUE = "players_display_name_uq"`. `ONE_PENDING_UNIQUE` is unchanged.
  - The notify cooldown map is keyed by `playerId`.
  - Telegram message: `Player: <playerId>`. The paste-ready command sends `{"playerId", "decision", "expectedName"}`. The charset check stays; a uuid always passes it.
  - The approve-conflict log line no longer carries an id.
- **`PaymentsRepository`:**
  - Remove `ENSURE_PROFILE_SQL`.
  - `createIntent(playerId, productId)`.
  - `PurchaseIntent.playerId`, `ProcessedPurchase.playerId`, `PaidPurchaseGrant.playerId`.
  - `GRANT_FLAGS_SQL` targets `players where id`, with a defensive `rowCount === 0` → throw, so the whole grant rolls back instead of recording a receipt without flags. The intent's cascading FK makes that practically unreachable.
  - The post-grant inbox hook uses `playerId`.

## 5. Shared contracts (`src/core/profile/`)
- **`PlayerProfile.ts`:**
  - Drop `yandex_player_id` and `persistent_id` from `PlayerProfileSchema` and `RawProfileSchema`.
  - `PublicPlayerProfileSchema` omits only the paid fields.
  - `createGuestProfile(nowIso?)` loses its argument (it has no caller in `src/`).
  - `CURRENT_PROFILE_SCHEMA_VERSION` **stays 1.** Bumping it would make every deployed client's `z.literal(1)` fail, and no stored consumer of the field exists.
- **`InboxContract.ts`:** `SendMessageRequestSchema.yandexPlayerId` → `playerId`, validated as a UUID shape (same pattern as `UUID_RE`), so garbage gets a 400 rather than a Postgres error surfacing as 500. The public `MarkReadRequestSchema` shape is unchanged.
- **`NameChangeContract.ts`:** `NameChangeDecisionRequestSchema` takes `playerId` (UUID shape). The public request and cancel schemas are unchanged.
- **Left for S3:** `CreditContract.ts` keeps `yandexPlayerId`, `persistentId` and the upsert schema. The game server still sends that shape. One stale comment in `MatchQualification.ts` ("`(game_id, yandex_player_id)`") gets a one-line fix.

## 6. Routes (`Routes.ts`) and `Server.ts`
- **`ProfileRepo` interface:** `ping`, `getProfile(playerId)`, `creditMatchXp(gameId, playerId, xp)`, `findPlayerByIdentity`, `resolveOrCreatePlayer`. `Server.ts` passes a small object binding `PlayerProfileRepository` and `PlayerIdentityRepository`. `createApp`'s positional signature is unchanged, so test mocks only gain two `jest.fn()`s.
- **`resolveCaller(req)`:** async and **find-only**. It replaces `resolvePlayerId`. It reads `yandexPlayerId` from the query on GET and from the body otherwise, and returns `bad_request`, `unknown` or `{ playerId }`.
- **Public routes keep their request shapes and today's answer for an unknown player:**

| Route | Unknown Yandex id |
|---|---|
| `GET /v1/profile` | 404 `not_found` (unchanged) |
| `GET /v1/messages`, `PATCH /v1/messages/read` | 403 `not_citizen` (unchanged) |
| `name-change-request` / `name-change-cancel` | 403 `not_citizen` (unchanged) |
| `POST /v1/payments/yandex/intent` | **404 `not_found`** (was: auto-create; design §4) |
| `complete` / `reconcile` | unchanged (bound via intent → `playerId`) |

- **`toPublicProfile`:** strips only the paid fields. The response never carries a player id or a Yandex id.
- **`POST /internal/v1/profile/upsert`:** the only route that creates. It calls `resolveOrCreatePlayer("yandex_games", yandexPlayerId, "game_server")`. `persistentId` is still required by the schema and is ignored. The 409 branch is removed. S3 replaces this route.
- **`POST /internal/v1/credit`:** request and response shapes unchanged. Each item runs `findPlayerByIdentity`: unknown → `no_profile` with no write; otherwise `creditMatchXp(gameId, playerId, xp)`. The failure log line no longer prints the id.
- **Operator routes** (`/internal/v1/messages/send`, `/internal/v1/name-change/decide`) take `playerId`; the example curl comments are updated. An operator who holds only a Yandex id must look the player up with psql on the box. That follows the brief and is noted, not changed.

## 7. Tests
**Tests written first, to fail (RED).** Only the new-behaviour tests give a meaningful RED. The re-keyed existing tests simply break wholesale once the schema changes.
1. `tests/integration/Migration006.it.test.ts`. Each case runs in its own Postgres schema (a dedicated pool with `options: -c search_path=<tmp>`), dropped in `afterAll`:
   - a fresh schema applies 001–006;
   - a 001–004 schema with 0 rows applies 006;
   - 001–004 with **1 row** (one case per old table, looped) → the run rejects with the guard message. A before/after snapshot (`information_schema.columns`, `pg_indexes`, `pg_constraint`) is identical, the row is still there, and `schema_migrations` has no `006`;
   - `player_xp_grants` accepts `xp_awarded = 0` and rejects `-1`;
   - the platform check rejects anything but `yandex_games`;
   - `moderation_status` still defaults to `'approved'` (pins the kept trap).
2. `tests/integration/PlayerIdentityRepository.it.test.ts`:
   - **Forced lost race.** A blocker client inserts player and identity without committing. `resolveOrCreatePlayer` blocks on `ON CONFLICT` (waited for via `pg_stat_activity`, the pattern of the existing held-lock test). The blocker commits. Expect the blocker's `playerId`, `created: false`, exactly 1 player and **0 orphans** (`players` with no identity).
   - **Stress.** 20 parallel calls for one identity → 1 player, 0 orphans.
   - **Forced PK collision.** After inserting a player with a fixed uuid, temporarily set the `players.id` default to a test function returning that uuid on its first call (driven by a sequence, which a rollback does not reset) and `gen_random_uuid()` afterwards. The call succeeds on attempt 2. The default is restored in `finally`.
   - **All attempts collide** → throws after 3.
   - **Hit path:** `last_login_at` is untouched when under 1 hour old and touched when older.
   - `findPlayerByIdentity` never creates.
3. `tests/profile-server/PlayerIdentityRepository.test.ts` (fake pool, the `NameChangeRepository.test.ts` harness):
   - statement order `BEGIN` → inserts → `ROLLBACK` on a lost race;
   - `23505` on another constraint is rethrown;
   - at most 3 attempts;
   - the client is released on every path.
4. Route unit tests:
   - public routes with an unknown id never call `resolveOrCreatePlayer` and give the answers in the table above;
   - intent with an unknown id → 404 and `createIntent` not called;
   - upsert calls `resolveOrCreatePlayer`;
   - no response body has `yandex_player_id`, `persistent_id` or a uuid-shaped player id;
   - operator routes with `yandexPlayerId` in the body → 400.
5. `NameChangeRepository.test.ts`: the Telegram text and the command body carry `playerId` and never the Yandex id.
6. `tests/core/profile/PlayerProfile.test.ts`: the public schema's keys exclude both ids.

**Integration harness moved to the runner:**
- **`tests/integration/globalSetup.ts`:** the existing env guard, then a **host guard** (D1: refuse unless the host is localhost / 127.0.0.1 / ::1), then `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`, then `applyMigrations(pool, <repo>/migrations)`. Runs once per `npm run test:integration`.
- **New `tests/integration/support/db.ts`:** `truncateProfileTables(pool)` (one table list) and `createYandexPlayer(pool, yandexId)` (via `PlayerIdentityRepository`, returns `playerId`). It does not match `*.it.test.ts`, so jest won't run it as a suite.
- **All 5 existing suites:** remove the migration-file loops and the inline `TRUNCATE`s; re-key fixtures to player ids; replace `upsertProfile` with the helper. They must keep proving the behaviours:
  - citizenship flip and held-lock credit race (`PlayerProfileRepository.it`);
  - idempotent credit;
  - one pending name change;
  - inbox citizen gate;
  - payments grant and its checks.
  - `Routes.it` also asserts that no public route with an unknown id creates a `players` row.
- **Unit fixtures to update so tsc passes (typed as `PlayerProfile`):**
  - `tests/profile-server/{Routes,RowMapping,NameChangeRoutes,InboxRoutes,PaymentsRoutes,…}.test.ts`;
  - `tests/client/PlayerProfileView.test.ts`;
  - `tests/server/ProfileApiClient.test.ts`.
  - Delete `PersistentIdConflictError` tests.
  - No `src/client` or `src/server` code changes; `ProfileApiClient`'s dead 409 branch stays for S3.

## 8. CLAUDE.md ("Integration tests (real Postgres)" subsection)
This edits `CLAUDE.md`; brief item 9 asks for it.
- The integration run **drops and recreates the `public` schema** of `TEST_DATABASE_URL` on every run, then applies the real runner. Never point it at a database you care about. State the host guard.
- **One-time reset** for a local **dev** profile database that applied the untracked `005` or holds rows: run `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` on that database, then `npm run migrate`. Placeholders only, no credentials.
- The test database needs no manual reset.

## 9. Verification (brief steps)
- Steps 1–5 are covered by the tests above.
- `npm test` (includes the shell harnesses, ~22–25 s) and `npm run test:integration` run **twice**; the second run proves the reset repeats. Then `npx tsc --noEmit` and `npm run lint`.
- Step 6 grep: expected hits only in route input parsing (`yandexPlayerId` via `resolveCaller` and credit/upsert) and the identity repository. None of them are repository queries.
- If a supertest suite goes red, check the known-flake signature first. Re-run and say so.

## 10. Deploy on the box
- **Immediately before:** re-check read-only that the 7 tables are empty and `schema_migrations` = 001–004. This is a read-only SSH query; an agent runs it itself, no handover.
- **Owner runs `npm run deploy:profile`.** The migration applies in `setup-profile.sh`'s "APPLYING DB MIGRATIONS" step.
- **After, read-only:**
  - `schema_migrations` lists `006`;
  - `players`, `player_identities`, `player_xp_grants` and the re-keyed tables exist, all at 0 rows;
  - `/ready` 200;
  - extra probe: `GET /v1/profile?yandexPlayerId=<synthetic non-existent>` → **404, not 500**. That proves the new code queries the new schema. It creates nothing.
- **Caveat:** `/ready` is `SELECT 1` and proves nothing about the schema, hence the probe.

## 11. What S1 must not do
- **S2:** no `/v1/login`, no session token or `PROFILE_SESSION_SECRET`, no Bearer handling, no CORS `Authorization`.
- **S3:** no `src/server` changes, no `/internal/v1/players/resolve`, no credit-by-`playerId` wire format, `CreditContract` unchanged.
- **S4:** no `src/client` code.
- **S5:** no OTEL, no `PROFILE_LOGIN_CREATE_ENABLED`, no `profile-checks.sh` changes.
- **Other:**
  - no tenure-claim route or logic (`0253`);
  - no removal of the moderation default;
  - no `setup-profile.sh` / `build-deploy-profile.sh` changes (those trip the hardening harness);
  - no `tests/profile-backup-dryrun.sh` change (D2);
  - no applying the parked patch;
  - no commits;
  - no moving task files.

## 12. Risks
1. **Deploy order** (see summary). Guard refusal or SQL failure → the transaction leaves nothing changed. The new image is already serving and profile routes 500 until the previous commit is redeployed; the old image works on the untouched old schema. The pre-deploy 0-row check makes refusal unlikely. `setup-profile.sh`'s automatic image rollback only fires on an unhealthy container, not on a failed migration.
2. **No rollback after `006` applies.** Old code cannot run on the new schema, so a bug means fixing forward. With 0 rows a hand-written reverse is possible, but none is planned.
3. **The runner skips by filename.** Any local database carrying the old untracked `005` has a stray `player_xp_grants`. Plain `create table` then fails 006 loudly → the documented reset.
4. **Contract change vs deployed clients.** Old bundles require `yandex_player_id` when parsing a profile, but the card is off and `GET /v1/profile` 404s for everyone (0 rows). The deployed game server parses the upsert reply but does nothing while `PROFILE_INTERNAL_TOKEN` is blank. Safe today; unsafe if either switch flips before S3/S4.
5. **Destructive test setup** if `TEST_DATABASE_URL` is pointed at a real database. Mitigated by D1.
6. **Parallel-race tests can be flaky.** Timing races are forced with a lock barrier plus `pg_stat_activity`, not sleeps.
7. **The backup dry-run is out of date.** `tests/profile-backup-dryrun.sh` still seeds 001's `player_profiles`. It is not in `npm test`, so nothing turns red; deferred to 0218 (D2).
8. **Uncommitted unrelated files would ship in the image** (§0).

## 13. Effort
| Work | Days |
|---|---|
| `006` + migration tests | 0.5 |
| Runner extraction + test setup + 5 suites moved to it | 0.5 |
| Identity repository + tests | 0.5 |
| Contracts, 4 repositories, routes, `Server.ts`, unit tests re-keyed | 1–1.5 |
| CLAUDE.md, full gates run twice, box verification | 0.25–0.5 |
| **Total** | **2.75–3.5** (plus review) |
