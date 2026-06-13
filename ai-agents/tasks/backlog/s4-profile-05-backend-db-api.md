# Task — Player Profile: Backend DB + API (T5)

## Parent / Epic
`ai-agents/tasks/backlog/s4-player-profile-store-impl.md` — child slice 5 of 8. Implements the **DB half of Part D** and the **profile-server half of Part E**.

## Sprint
Sprint 4

## Priority
High — the working profile backend. Once this is up, it's independently exercisable via `curl` with nothing in the game calling it.

## Depends on
T1 (shared `PlayerProfile` type + `migrateProfile`), T4 (the box, Postgres, deploy pipeline, `PROFILE_INTERNAL_TOKEN`).

## Blocks
T6 (match-end crediting calls the internal endpoint), T7 (login reads/migrates via the client endpoints).

## Context
This slice puts the actual data layer and HTTP API on the profile box. The DB-touching repository lives **only** on the profile server; the game server never connects to Postgres directly. Resolve the storage-strategy open question (epic Part B) and document the decision **before** writing the migration.

## Scope
1. **Decide & document storage strategy** (epic Part B): Option A (single `profile jsonb`) vs Option B (rigid columns + `extra jsonb` overflow). Record the choice and reasoning in the epic or a short ADR before the first migration. *(Recommendation on record: Option B — this data is identity/constraint-heavy, not document-shaped.)*
2. **Migration** `migrations/001_player_profiles.sql` with the tables from epic Part B: `player_profiles`, `player_match_xp_credits`, plus the future-aware `player_name_history` and `player_cosmetic_ownership` (create now, no app logic yet). Run on the box at deploy time.
3. **`PlayerProfileRepository`** (direct `pg`, in `src/profile-server/`):
   - `upsertProfile(yandexPlayerId, persistentId)` — create on first authenticated join; update `persistent_id` linkage if it changes.
   - `creditMatchXp(gameId, yandexPlayerId, xpAwarded)` — insert into `player_match_xp_credits` and increment `player_profiles.xp` **atomically in one transaction**; idempotent on `(game_id, yandex_player_id)` (existing row → no-op). Flip `is_citizen` / set `citizenship_earned_at` when `xp` crosses 1,000.
   - `getProfile(yandexPlayerId)`.
4. **API endpoints:**
   - **Client-facing (player-authenticated):** `GET /v1/profile`, `POST /v1/profile/migrate` (guest upload — body validated with the T1 Zod schema; preserves accumulated XP).
   - **Internal (service-authenticated via `PROFILE_INTERNAL_TOKEN`, IP-allowlisted to the game server):** `POST /internal/v1/credit` accepting a batch of `{ gameId, yandexPlayerId, xpAwarded }`, performing idempotent crediting.

## Out of scope
- Game-server client / protocol extension / match-end wiring (T6).
- Client login flow (T7).
- Backups (T8).

## Acceptance / Verification
- `curl` exercises all three endpoints against the live box.
- Epic Verification #4 (API level): calling `/internal/v1/credit` twice with the same `game_id` credits XP once.
- `POST /v1/profile/migrate` creates a row preserving XP; `GET /v1/profile` returns it; server-wins logic holds.
- Idempotency + transaction integration tests run against a real Postgres (Docker) in CI.

## Notes
- Postgres stays localhost-only; the only network surface is the API.
- Crediting authority is enforced by the internal endpoint's service-token + IP allowlist — never trust a client to credit itself.
- **Carried over from T1 schema-contract review (2026-06-13) — paid-citizenship invariants:** the shared `PlayerProfileSchema` intentionally has **no** cross-field invariants (so `migrateProfile` stays never-throw). Enforce them at the server **write path** instead: `is_paid_citizen ⇒ is_citizen`, `citizenship_purchased_at ⇒ is_paid_citizen`, `citizenship_earned_at ⇒ is_citizen`. The paid flag is server-authoritative — never derive paid state from a client/migration payload (epic Part F); paid verification is finalized in the Yandex Payments task.
- **Carried over from T1 review (2026-06-13) — forward-version writeback guard:** never let a stale deploy overwrite/downgrade a row whose stored `schema_version` exceeds this build's `CURRENT_PROFILE_SCHEMA_VERSION`. If chosen, the Part B Option-B `extra jsonb` column is where unknown future fields are retained instead of dropped.
