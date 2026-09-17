# Profile identity S1 — Database + re-keying: migration `006`, internal player id, every repository on `playerId`

## ID
0270

## Parent / Epic
[`0266-profile-identity-internal-player-id-platform-logins-login-endpoint`](../../backlog/0266-profile-identity-internal-player-id-platform-logins-login-endpoint/brief.md)

## Sprint
Sprint 4

## Priority
High *(producer's rank — NOT owner-ruled)*

⚠️ Priority High is append rank, NOT a merit ranking — flagged for owner confirmation.
**On merit this belongs directly below `0217`** (above `0253`), because it is the first of the five
slices `0217` (XP go-live) now waits on, and `0253`'s rework waits on the chain it starts. The row was
**appended at the bottom** of the Sprint 4 board (ADR-035 — a new row never inserts mid-board).

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**Filed 2026-09-15 by a spawned `fkit-producer`, on OWNER RULINGS given via `AskUserQuestion` in the
lead session and relayed by `fkit-lead`:** design approved with the login token in v1 (*"Token now, not
later"*); [ADR-113](../../../knowledge-base/decisions/adr-113-profile-internal-player-id-and-platform-identities.md)
accepted; build *"Split into 4"* (the architect added monitoring as a 5th slice under the owner's
*"monitoring before go-live"* ruling); alerts by email. ADR-112 amended the same day.

**Source of truth:** [`2026-09-15-profile-identity-design.md`](../../../knowledge-base/reports/2026-09-15-profile-identity-design.md)
§1 (id), §3 (schema), §4 (find-or-create), §9 row **S1**. Read those before planning — this brief
does not restate the SQL.

**Why now:** the profile box has applied migrations **001–004 only** and **every table has 0 rows**
(verified read-only by `fkit-lead`, 2026-09-15). Re-keying costs no data migration today. Once `0217`
goes live the guard in `006` refuses and this becomes a real data migration.

**Hard rule from ADR-113:** no public route ever accepts a player id; the internal id never reaches a
client.

⚠️ **Collision with `0253` — serialize, never run concurrently.** `0253`'s uncommitted first-plan code
(untracked `migrations/005_player_xp_grants.sql`, repository and route edits in
`src/profile-server/{Routes,PlayerProfileRepository,Server}.ts`) lives in the **same files** this slice
rewrites. This slice **absorbs the schema and repository re-keying of that code** (the grant table
moves into `006`; `005` is deleted). `0253`'s own rework (route + client logic) runs only after
[`0273`](../../backlog/0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md). Do not start this
slice while anyone is editing `0253`'s code.

## What to build

Per design §9 S1:

1. **`migrations/006_player_identity.sql`** — guard first (`RAISE EXCEPTION` if any of the 7 old tables
   holds a row, so the deploy aborts before anything changes); then `players` (random UUID PK),
   `player_identities` (`(platform, platform_user_id)` PK, `platform` ∈ `yandex_games`),
   `player_xp_grants` (`xp_awarded >= 0`; a 0 row = "checked, nothing granted", final), and every child
   table re-keyed from `yandex_player_id` to `player_id` with its constraints and indexes preserved
   (§3 list). `001`–`004` stay byte-identical.
2. **Delete the untracked `migrations/005_player_xp_grants.sql`** (never deployed).
3. **`PlayerIdentityRepository`** — `resolveOrCreatePlayer` / `findPlayerByIdentity` exactly per §4:
   identity hit → touch `last_login_at` only if older than 1 h; miss → transaction, rollback-and-reread
   on a lost race (no orphan player), retry on a UUID PK collision, max 3 attempts. **Not a single CTE.**
4. **Every repository on `playerId`** (`PlayerProfileRepository`, `InboxRepository`,
   `NameChangeRepository`, `PaymentsRepository`); remove `ENSURE_PROFILE_SQL`.
5. **Drop `persistent_id`** and `PersistentIdConflictError`.
6. **Contracts** (`src/core/profile/{PlayerProfile,InboxContract,NameChangeContract}.ts`) drop
   `yandex_player_id` / `persistent_id` from what clients see.
7. **Routes keep their current request shapes.** A first, find-only `resolveCaller` maps the Yandex id
   to a player; only the internal upsert route temporarily calls `resolveOrCreatePlayer` (it is replaced
   in S3). Operator routes and the Telegram ready-to-paste command take `playerId`.
8. **Integration tests move to one runner-based setup:** reset the schema once, then run the real
   migration runner (extract `migrate.ts`'s apply loop into a callable function). The 7 suites stop
   applying migration files one by one.
9. **CLAUDE.md integration-test subsection:** document the one-time reset for local test/dev databases
   that applied the untracked `005` or hold leftover rows.

**Default unless the owner rules otherwise (design §8 Q2):** 004's `moderation_status` default
`'approved'` is **preserved** in the rebuild — no silent scope.

### Owner steps
- **Profile-box deploy** (`npm run deploy:profile`) — the owner runs profile deploys personally
  (`0214` item 4). Then the three post-deploy checks in verification step 8.
- One-time reset of any local profile DB (per the CLAUDE.md note this slice adds).

## Verification steps

1. `006` applies cleanly on a **fresh** database and on a **001–004 database with 0 rows** (integration
   test).
2. With **1 row** in any old table, `006` **refuses and changes nothing** — schema identical before and
   after (integration test).
3. Two parallel `resolveOrCreatePlayer` calls for the same identity → **exactly 1 player, 0 orphan
   players** (integration test). A forced PK collision retries and succeeds.
4. Every existing repository behaviour is kept, each by a passing test: citizenship flip, idempotent
   match credit, one-pending name change, inbox citizen gate, payments grant.
5. A `player_xp_grants` row with `xp_awarded = 0` is accepted.
6. `grep -rn "yandex_player_id\|persistent_id" src/profile-server src/core/profile` — hits only where the
   design says the platform id survives (identity lookup / legacy `resolveCaller` input); no repository
   query keys on it.
7. `npm test` and `npm run test:integration` green; `npx tsc --noEmit` and `npm run lint` exit 0.
8. **On the box after the owner's deploy:** `schema_migrations` lists `006`; all tables empty; `/ready`
   returns 200.

## Notes

- **Depends on:** nothing — first slice; must not run concurrently with any work on `0253`'s code (same files)
- **Blocks:** [`0271`](../0271-profile-identity-s2-login-endpoint-and-session-token/brief.md) (S2), [`0272`](../../backlog/0272-profile-identity-s3-game-server-resolve-and-credit-by-player-id/brief.md) (S3), [`0217`](../../backlog/0217-profile-p2-wire-game-server-to-profile-box/brief.md) (XP go-live)
- **Effort (design §9):** 2.5–3.5 days. Strictly first; cannot be split.
- **Deploys:** profile box only. Safe alone — game server's profile client is a no-op while
  `PROFILE_INTERNAL_TOKEN` is blank, and routes keep their request shapes.
- **Related:** ADR-113, ADR-112 (amended 2026-09-15), ADR-103, [`0253`](../../backlog/0253-tenure-xp-grant-for-existing-players-at-citizenship-launch-research-and-rule/brief.md).
- 🔒 No secrets, hosts or player ids in any artifact.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.

---

## Closing record — 2026-09-15 (agent-closed — not owner-verified)

Closed by a spawned `fkit-producer` for `/fkit-sprint-ship-loop` (`fkit-lead`). No owner was present at
the close. Evidence as relayed by the lead; sources are this folder's [`plan.md`](plan.md),
[`worklog.md`](worklog.md) and [`review.md`](review.md).

- **Plan:** owner-approved via `AskUserQuestion`, 2026-09-15 — **D1** local-only test-DB guard; **D2**
  backup dry-run deferred ("Later, in 0218" — see the note appended to `0218`).
- **Built:** migration `006`, find-or-create, repositories re-keyed to `player_id`, runner-based
  integration harness, CLAUDE.md subsection.
- **Gates (as reported):** `npm test` 123 suites / 1347 tests; `npm run test:integration` 7 / 94 (run
  twice, plus reruns); `tsc` and lint clean.
  ⚠️ One unexplained `NameChange.it.test.ts` failure on the first build run. The reviewer's Postgres-log
  timing supports the known `supertest` flake — **not proven.**
- **Review:** round 1 (Codex, full coverage) — **R1 accepted residual** (owner: re-raise if
  `PROFILE_INTERNAL_TOKEN` is set or the citizenship card is switched on before S3/S4 deploy); **R2
  fixed**, mutation-proven tests; **R3 carried to [`0272`](../../backlog/0272-profile-identity-s3-game-server-resolve-and-credit-by-player-id/brief.md)**
  (stale comments). Round 2 closed out: *"Ready to merge (validation-gated)"*.
- **Deploy:** the owner ran `npm run deploy:profile` (2026-09-15). The lead then verified the box
  read-only: migrations applied = 001–004 + 006; `players`, `player_identities`, `player_xp_grants` and
  the re-keyed tables exist, all 0 rows; old `player_profiles` gone; both containers healthy, 0 error
  log lines; `/ready` 200; `GET /v1/profile` for a synthetic non-existent id → 404 `not_found` (not
  500) and created no rows.
- ⛔ **Not verified: real player traffic** — there is none until S2–S4 and go-live (`0217`).
