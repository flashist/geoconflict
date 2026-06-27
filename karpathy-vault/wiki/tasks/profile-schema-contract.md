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

The first player-profile implementation slice is complete. T2 guest localStorage was later cancelled, but T5 backend DB/API and any future server-authoritative guest cache can still consume one shared profile payload instead of inventing separate client and server shapes.

Two boundary decisions remain outside this contract by design. First, `xp` is only validated as a nonnegative safe JavaScript integer here; the persistence layer must clamp or reject values above the chosen database column max. Second, this schema is shape validation, not authorization: paid fields and earned-citizenship state from any revived guest-migration body must be force-cleared or recomputed at the server trust boundary. The current T5 path no longer includes `POST /v1/profile/migrate` because T7 was cancelled with the guest-first story.

## Related

- [[decisions/sprint-4]] — Sprint 4 roadmap and current profile-store implementation state
- [[tasks/player-profile-store-investigation]] — investigation and infrastructure decisions that produced the profile-store implementation epic
- [[decisions/cancelled-tasks]] — cancellation record for the T2/T7 guest-first XP slices that originally consumed this contract
