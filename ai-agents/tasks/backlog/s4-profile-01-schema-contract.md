# Task — Player Profile: Schema Contract (T1)

## Parent / Epic
`ai-agents/tasks/backlog/s4-player-profile-store-impl.md` — child slice 1 of 8. Read the epic's **Infrastructure Decision** and **Part B** before starting.

## Sprint
Sprint 4

## Priority
High — foundation. Both the client guest store (T2) and the backend (T5) consume this contract. Land it first.

## Depends on
None.

## Blocks
T2 (guest localStorage), T5 (backend DB + API).

## Context
The player profile payload is a single **versioned JSON object** used identically on the client (localStorage) and the server (API/DB). This slice defines that shared shape and a pure migration function — and nothing else. No storage, no I/O, no UI. It lives in `src/core/` so client and server share one definition. Per CLAUDE.md, all `src/core/` changes MUST be tested.

## Scope
1. Define the `PlayerProfile` TypeScript type in `src/core/` matching the epic's Part B JSON schema:
   `schema_version`, `yandex_player_id`, `persistent_id`, `xp`, `is_citizen`, `is_paid_citizen`, `citizenship_earned_at`, `citizenship_purchased_at`, `display_name`, `created_at`, `updated_at`.
2. A Zod schema for runtime validation of the payload (used when reading localStorage and when the API parses request bodies).
3. `export const CURRENT_PROFILE_SCHEMA_VERSION = 1;`
4. A pure `migrateProfile(raw: unknown): PlayerProfile` that:
   - validates/normalizes a raw object,
   - detects an older `schema_version` and upgrades it to the current version,
   - fills missing/unknown fields with safe defaults,
   - never throws on a structurally-recognizable profile; returns a valid current-version object.
5. A factory `createGuestProfile(persistentId: string): PlayerProfile` returning a fresh v1 profile (`xp: 0`, `is_citizen: false`, timestamps set) — reused by T2 and the backend.

## Out of scope
- localStorage read/write (T2).
- DB column shape / storage-strategy decision (T5 — that's the *DB* representation, separate from this *wire/JSON* contract).
- **Paid/citizenship invariants and any trusted/untrusted schema split (deferred — a security boundary, NOT enforced here).** Per the schema-contract review (2026-06-13), this stays a pure never-throw validator: `is_paid_citizen`, `citizenship_purchased_at`, `is_citizen`, `citizenship_earned_at` are accepted as ordinary fields with no cross-field invariant. Passing this Zod schema is *not* an authorization check. Forcing paid fields off and recomputing citizenship from XP is the job of the consuming slices at the trust boundary — T5 (`POST /v1/profile/migrate`) and T7 — per epic **Part F** ("paid flags never come from migration").
- Any network or rendering code.

## Acceptance / Verification
- Unit tests cover: a valid v1 profile round-trips unchanged; a hypothetical future-v2 raw object migrates to a valid object without errors (epic Verification #6); missing fields receive documented defaults; malformed input is handled deterministically.
- `npm test` green; lint clean.

## Notes
- `migrateProfile` must be pure (no clocks/IO) so it's trivially testable and reusable on both ends. Where a fresh timestamp is genuinely needed (e.g. `createGuestProfile`), inject it or set it at the call site, not inside `migrateProfile`.
