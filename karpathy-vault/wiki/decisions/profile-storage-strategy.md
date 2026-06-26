# Player Profile Storage Strategy (Option B: typed columns + jsonb overflow)

**Date**: 2026-06-24
**Status**: accepted

## Context

The player profile store (epic `s4-player-profile-store-impl.md`, Part B) left the database storage strategy as an open question for the technical specialist to resolve **before** writing the first migration. T5 (`s4-profile-05-backend-db-api.md`) is where the schema, repository, and API land, so the decision is made here.

Two options were on the table:

- **Option A — single `profile jsonb` column.** The whole versioned `PlayerProfile` payload stored as one JSONB blob keyed by `yandex_player_id`. Flexible, schema-less, trivially extensible. Trade-off: no column-level constraints or indexes without expression indexes; field queries are verbose.
- **Option B — typed columns + `extra jsonb` overflow.** Critical fields (`xp`, `is_citizen`, `display_name`, citizenship timestamps, …) are real typed Postgres columns; an `extra jsonb` column absorbs future fields not yet promoted. Trade-off: promoting a field out of `extra` still needs a migration.

The shared contract (`src/core/profile/PlayerProfile.ts`) is snake_case and maps 1:1 to columns, so neither option needs a field-mapping layer.

Sources: `ai-agents/tasks/backlog/s4-player-profile-store-impl.md` (Part B), `ai-agents/tasks/backlog/s4-profile-05-backend-db-api.md`.

## Decision

**Option B — typed columns + an `extra jsonb` overflow column.** Recorded in `migrations/001_player_profiles.sql`.

This profile data is **identity- and constraint-heavy, not document-shaped**, and the constraints are the product:

- **Uniqueness** — `yandex_player_id` PK, `persistent_id` unique, and a **case-insensitive unique display name** (`unique index on lower(display_name)`). Expression-indexing those out of a JSONB blob is awkward and error-prone.
- **Referential integrity** — the idempotent XP credit ledger (`player_match_xp_credits`) and the future-aware `player_name_history` / `player_cosmetic_ownership` tables FK-reference `player_profiles` with `ON DELETE CASCADE`. FKs need a real keyed column.
- **Invariants** — the paid-citizenship rules (`is_paid_citizen ⇒ is_citizen`, `citizenship_purchased_at ⇒ is_paid_citizen`, `citizenship_earned_at ⇒ is_citizen`) are encoded as DB-level `CHECK` constraints, making an inconsistent row un-writable regardless of which service writes it.
- **Atomic numeric writes** — crediting does `xp = xp + award` plus a citizenship flip in one statement against a typed `bigint` column with a `CHECK (xp >= 0)`.

Two column choices accompany the decision:

- **`xp bigint`** (not `int4`). XP accrues server-side at +10/match for the profile's lifetime; `bigint` comfortably holds it and avoids an `int4` overflow (Postgres error 22003). The JS-side `PlayerProfile.xp` stays a `number` (within `Number.MAX_SAFE_INTEGER`); the repository coerces the bigint-string pg returns back to a number.
- **`persistent_id text`** (not `uuid`). The shared contract types it `z.string()` and the game's `persistentID` (`src/server/jwt.ts`: `claims.sub` or a raw token) is **not guaranteed UUID-formatted**. A `uuid` column would reject a non-UUID value with error 22P02; `text` matches the contract.

The `extra jsonb not null default '{}'` column preserves unknown future fields, which—together with the forward-version writeback guard in `upsertProfile` (never overwrite a row whose stored `schema_version` exceeds this build's `CURRENT_PROFILE_SCHEMA_VERSION`)—keeps a stale deploy from dropping data written by a newer build.

## Consequences

- Adding a brand-new field that needs its own column requires a migration (the accepted Option-B trade-off). Fields can land in `extra` first and be promoted later without data loss.
- The DB enforces the paid-citizenship invariants independently of the application — defense-in-depth against a buggy or future writer (e.g. the Yandex Payments flow).
- Reads go through `migrateProfile` (not a strict `PlayerProfileSchema.parse`) so a row written by a newer schema version normalizes instead of throwing a 500.
- The `player_name_history` and `player_cosmetic_ownership` tables exist now (future-aware) with no Sprint-4 application logic.

## Related

- [[decisions/sprint-4]]
- [[tasks/profile-backend-db-api]]
- [[tasks/profile-schema-contract]]
- [[systems/player-profile-store]]
