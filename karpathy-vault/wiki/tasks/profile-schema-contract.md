# Player Profile Schema Contract

**Source**: `ai-agents/tasks/done/s4-profile-01-schema-contract.md`
**Status**: done
**Sprint/Tag**: Sprint 4 profile store T1

## Goal

Define the shared, versioned `PlayerProfile` payload contract used by guest localStorage, the profile API, and future Postgres persistence, before storage, networking, or UI slices consume profile data.

## Key Changes

- Added `src/core/profile/PlayerProfile.ts` as the shared profile contract with `CURRENT_PROFILE_SCHEMA_VERSION = 1`, `PlayerProfileSchema`, the `PlayerProfile` type, `migrateProfile(raw)`, and `createGuestProfile(persistentId, nowIso?)`.
- Kept `migrateProfile()` pure and clock-free: malformed or partial objects normalize to a valid v1 profile using deterministic defaults, while `createGuestProfile()` owns fresh timestamp creation.
- Preserved a forward-compatible migration shape: unknown fields are stripped, known fields are carried forward, older versions can be upgraded through the `MIGRATIONS` extension point, and future-version payloads are stamped back to the current v1 shape.
- Added `tests/core/profile/PlayerProfile.test.ts` for valid v1 round-trip, hypothetical v2 normalization, v0 upgrade, missing-field defaults, bad-type fallback, malformed input, large-negative `schema_version` DoS protection, and guest-profile creation.

## Outcome

The first player-profile implementation slice is complete. T2 guest localStorage and T5 backend DB/API can now consume one shared profile payload instead of inventing separate client and server shapes.

Two boundary decisions remain outside this contract by design. First, `xp` is only validated as a nonnegative safe JavaScript integer here; the persistence layer must clamp or reject values above the chosen database column max. Second, this schema is shape validation, not authorization: paid fields and earned-citizenship state from migration bodies must be force-cleared or recomputed at the T5/T7 trust boundary.

## Related

- [[decisions/sprint-4]] — Sprint 4 roadmap and current profile-store implementation state
- [[tasks/player-profile-store-investigation]] — investigation and infrastructure decisions that produced the profile-store implementation epic
