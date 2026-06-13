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
T6 (match-end crediting calls the internal endpoint). *(T7 — login reads/migrates via the client endpoints — **cancelled 2026-06-13**; the migration API it needed is dropped — see the decision note below.)*

## Context
This slice puts the actual data layer and HTTP API on the profile box. The DB-touching repository lives **only** on the profile server; the game server never connects to Postgres directly. Resolve the storage-strategy open question (epic Part B) and document the decision **before** writing the migration.

> ✅ **DECISION (2026-06-13, Mark) — migration API dropped from this slice.**
> The guest-first story (T2 guest store + T7 guest→authenticated migration) is cancelled, so there is **no client→server profile upload**. `POST /v1/profile/migrate` and all migrate-specific handling are **removed from T5**. This slice is now **fresh-profile-create + server-side crediting only**:
> - **Endpoints:** `GET /v1/profile` (read) and the internal `POST /internal/v1/credit` (service-token + IP-allowlisted). **No** `/v1/profile/migrate`.
> - **Writes:** `upsertProfile` creates the profile server-side at `xp:0` on first authenticated join; `creditMatchXp` is the only XP writer (atomic, idempotent, flips `is_citizen` at ≥1,000 XP). XP is **authenticated-only** and never client-supplied.
> - **Dropped with the endpoint:** the untrusted-migrate-body forcing, the forged-payload and oversized-XP *migrate* tests, and the migrate XP-clamp — they existed only to defend the upload path.
> - **Retained:** paid state is server-authoritative (set only by the verified Yandex Payments flow) and crediting is internal-endpoint-only — see Notes.
> **If guest-XP is ever revived** (T2 + T7), the migration API (`POST /v1/profile/migrate`) and its untrusted-body hardening must be **re-added to this slice** — they were removed here, not merely deferred. See the cancelled tasks `s4-profile-02-guest-localstorage.md` / `s4-profile-07-guest-migration.md`, the epic cancellation note, and the T2 cancellation report (`ai-agents/knowledge-base/s4-profile-02-guest-localstorage-cancellation-2026-06-13.md`).

## Scope
1. **Decide & document storage strategy** (epic Part B): Option A (single `profile jsonb`) vs Option B (rigid columns + `extra jsonb` overflow). Record the choice and reasoning in the epic or a short ADR before the first migration. *(Recommendation on record: Option B — this data is identity/constraint-heavy, not document-shaped.)*
2. **Migration** `migrations/001_player_profiles.sql` with the tables from epic Part B: `player_profiles`, `player_match_xp_credits`, plus the future-aware `player_name_history` and `player_cosmetic_ownership` (create now, no app logic yet). Run on the box at deploy time.
3. **`PlayerProfileRepository`** (direct `pg`, in `src/profile-server/`):
   - `upsertProfile(yandexPlayerId, persistentId)` — create on first authenticated join; update `persistent_id` linkage if it changes.
   - `creditMatchXp(gameId, yandexPlayerId, xpAwarded)` — insert into `player_match_xp_credits` and increment `player_profiles.xp` **atomically in one transaction**; idempotent on `(game_id, yandex_player_id)` (existing row → no-op). Flip `is_citizen` / set `citizenship_earned_at` when `xp` crosses 1,000.
   - `getProfile(yandexPlayerId)`.
4. **API endpoints:**
   - **Client-facing (player-authenticated):** `GET /v1/profile` only. *(No `POST /v1/profile/migrate` — dropped 2026-06-13; see the decision note above.)*
   - **Internal (service-authenticated via `PROFILE_INTERNAL_TOKEN`, IP-allowlisted to the game server):** `POST /internal/v1/credit` accepting a batch of `{ gameId, yandexPlayerId, xpAwarded }`, performing idempotent crediting.

## Out of scope
- Game-server client / protocol extension / match-end wiring (T6).
- Client login flow (T7).
- Backups (T8).

## Acceptance / Verification
- `curl` exercises both endpoints (`GET /v1/profile`, `POST /internal/v1/credit`) against the live box.
- `upsertProfile` creates a fresh profile at `xp:0` on first authenticated join; `GET /v1/profile` returns it.
- Epic Verification #4 (API level): calling `/internal/v1/credit` twice with the same `game_id` credits XP once.
- Crediting flips `is_citizen` / sets `citizenship_earned_at` when `xp` crosses 1,000; neither endpoint ever sets paid flags.
- Idempotency + transaction integration tests run against a real Postgres (Docker) in CI.

## Notes
- Postgres stays localhost-only; the only network surface is the API.
- Crediting authority is enforced by the internal endpoint's service-token + IP allowlist — never trust a client to credit itself.
- **Paid-citizenship invariants (carried from T1 review, 2026-06-13):** the shared `PlayerProfileSchema` has **no** cross-field invariants. Enforce them at the server **write path**: `is_paid_citizen ⇒ is_citizen`, `citizenship_purchased_at ⇒ is_paid_citizen`, `citizenship_earned_at ⇒ is_citizen`. Paid state is **server-authoritative** — set only by the verified Yandex Payments flow, never derived from any client input; paid verification is finalized in the Yandex Payments task. With the migrate endpoint dropped there is no client write path, but keep these invariants as defense-in-depth on `upsertProfile` / `creditMatchXp`.
- **Forward-version writeback guard (carried from T1 review, 2026-06-13):** never let a stale deploy overwrite/downgrade a row whose stored `schema_version` exceeds this build's `CURRENT_PROFILE_SCHEMA_VERSION`. If Part B Option-B is chosen, its `extra jsonb` column retains unknown future fields instead of dropping them.
- **XP column type:** pick a type that comfortably holds lifetime XP — it accrues server-side at +10/match via `creditMatchXp` (`bigint` if in doubt). The earlier untrusted-oversized-XP clamp is **no longer needed**: with migrate gone, `xp` is never client-supplied, so it cannot arrive forged/oversized.
