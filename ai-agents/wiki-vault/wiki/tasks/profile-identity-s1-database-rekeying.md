# Profile Identity S1 — migration `006`, the internal player id, every repository re-keyed

**Source**: `ai-agents/tasks/done/0270-profile-identity-s1-database-and-rekeying/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task `0270` / slice S1 of epic `0266`

## Goal

Build the database half of [[decisions/adr-113-internal-player-id]]: **our own internal player id, with
platform logins mapped to it, and every repository keyed on it instead of the raw client-asserted Yandex
id.**

**Why then:** the profile box had applied **001–004 only** and **every table held 0 rows** (lead-verified
read-only 2026-09-15). **Re-keying cost no data migration that day.** ⛔ **Once `0217` goes live the guard
in `006` refuses and this becomes a real data migration.**

⚠️ **Collision with `0253` — serialize, never run concurrently.** `0253`'s uncommitted first-plan code
(an untracked `005_player_xp_grants.sql` plus repository and route edits) lived in the **same files** this
slice rewrites. **This slice absorbed the schema and repository re-keying of that code**; `005` was
deleted and the grant table moved into `006`.

## Key Changes

1. **`migrations/006_player_identity.sql`** — **guard first** (`RAISE EXCEPTION` if any of the 7 old
   tables holds a row, so the deploy aborts before anything changes); then `players` (random UUID PK),
   `player_identities` (PK `(platform, platform_user_id)`), `player_xp_grants` (`xp_awarded >= 0`; a 0 row
   = *"checked, nothing granted"*, final), and **every child table re-keyed** from `yandex_player_id` to
   `player_id` with constraints and indexes preserved. **`001`–`004` stay byte-identical.**
2. **The untracked `005_player_xp_grants.sql` deleted** — never deployed. The sequence is now
   `001, 002, 003, 004, 006`.
3. **`PlayerIdentityRepository`** — `resolveOrCreatePlayer` / `findPlayerByIdentity`: identity hit →
   touch `last_login_at` only if older than 1 h; miss → transaction, **rollback-and-reread on a lost race
   (no orphan player)**, retry on a UUID PK collision, max 3 attempts. ⛔ **Deliberately not a single
   CTE.**
4. **Every repository on `playerId`** (profile, inbox, name change, payments); `ENSURE_PROFILE_SQL`
   removed. **`persistent_id` and `PersistentIdConflictError` dropped.**
5. **Contracts drop `yandex_player_id` / `persistent_id`** from what clients see.
6. **Integration tests moved to one runner-based setup** — reset the schema once, then run **the real
   migration runner**. The 7 suites stopped applying migration files one by one. *(This is why the
   integration run is now destructive by design — it DROPs and recreates the `public` schema.)*
7. **A CLAUDE.md subsection** documenting the one-time reset for a local test/dev database that applied
   the untracked `005` or holds leftover rows.

🚩 **`006` is deliberately NOT idempotent, and the runner skips by filename.** Re-application is prevented
only by `schema_migrations` bookkeeping. On the **box**, the guard refuses if any old table holds a row —
**that case is a data migration to re-plan, not a reset.**

## Outcome

✅ **Built, reviewed, deployed and verified on the box 2026-09-15. Closed `(agent-closed — not
owner-verified)`** by a spawned producer with no owner present at the close.

- **Plan owner-approved** 2026-09-15: **D1** local-only test-DB guard; **D2** backup dry-run deferred
  (*"Later, in 0218"*) — ⚠️ **that deferral is what `0275` later had to pick up**, because the dry-run
  then applied only `001` and asserted on tables `006` had dropped.
- **Gates (as reported):** `npm test` 123 suites / 1347 tests; `test:integration` 7 suites / 94 tests,
  run twice; `tsc` and lint clean.
  ⚠️ **One unexplained `NameChange.it.test.ts` failure on the first build run.** The reviewer's Postgres-log
  timing supports the known `supertest` flake — ⛔ **not proven.**
- **Review:** round 1 (Codex, full coverage) — **R1 accepted residual** (owner: re-raise if
  `PROFILE_INTERNAL_TOKEN` is set or the citizenship card is switched on before the S3/S4 deploy);
  **R2 fixed** with mutation-proven tests; **R3 carried to `0272`**. Round 2 closed out.
- **Deploy:** the owner ran `npm run deploy:profile`. Lead-verified read-only: migrations applied =
  `001–004 + 006`; `players`, `player_identities`, `player_xp_grants` and the re-keyed tables exist, **all
  0 rows**; the old `player_profiles` gone; both containers healthy, **0 error log lines**; `/ready` 200;
  a profile GET for a synthetic non-existent id → **404 `not_found`** (not 500) and **created no rows**.

⛔ **Not verified: real player traffic.** There is none until S2–S4 and go-live (`0217`).

## Related

- [[decisions/adr-113-internal-player-id]] — the decision this slice implements
- [[decisions/adr-112-free-xp-grants]] — `player_xp_grants`, created here, is its marker table
- [[tasks/profile-identity-s2-login-and-session-token]] — task `0271` (S2), which this blocks
- [[tasks/profile-backup-restore-reproof-006]] — task `0275`, which re-proved restore on this schema
- [[systems/player-profile-store]] — the store this reshapes
- [[tasks/profile-backend-db-api]] — the original schema and API this supersedes
- [[decisions/profile-storage-strategy]] — the storage choices the re-keying inherits
- [[decisions/sprint-4]] — the sprint that owns it
