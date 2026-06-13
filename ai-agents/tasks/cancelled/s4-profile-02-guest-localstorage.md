# Task — Player Profile: Guest localStorage Store (T2)

> ⛔ **Cancelled 2026-06-13 (Mark)** — full report: `ai-agents/knowledge-base/s4-profile-02-guest-localstorage-cancellation-2026-06-13.md`.
> **⚠️ Revival note.** Guest-XP is a three-part feature: this guest store (T2), the guest→authenticated migration client (T7, also cancelled), and the **server migration endpoint `POST /v1/profile/migrate`, which was removed from T5 on 2026-06-13** (deleted, not deferred). Reviving guest-XP means bringing back **all three** — do **not** assume the T5 migration API still exists. Strongly prefer the server-authoritative redesign recommended in the cancellation report (thin best-effort client cache over a server source of truth) rather than re-implementing this localStorage-authoritative version, whose edge surface is what drove the cancellation.

## Parent / Epic
`ai-agents/tasks/backlog/s4-player-profile-store-impl.md` — child slice 2 of 8. Implements **Part C**.

## Sprint
Sprint 4

## Priority
High — client-only, ships independently of the backend, and delivers immediate player value (guest XP starts accumulating).

## Depends on
T1 (schema contract — `PlayerProfile`, `migrateProfile`, `createGuestProfile`).

## Blocks
T7 (guest→authenticated migration reads this local profile).

## Context
For players not authenticated with Yandex, the profile lives in localStorage using the same versioned JSON schema from T1. This is fully client-side and needs no server. localStorage clears on browser data wipe — accepted best-effort tradeoff for v1; no server fallback for guests.

## Scope
1. **Storage key:** `geoconflict_profile_<persistentID>` — scoped to the internal persistent ID to avoid collisions on shared devices.
2. **On app init (guest):** read the local profile; if none, `createGuestProfile(persistentID)`; if an older `schema_version` is present, run `migrateProfile` before use; write back the (possibly migrated) profile.
3. **On each qualifying match end (guest):** read → `xp += 10` → update `updated_at` → write back. If `xp >= 1000`, set `is_citizen = true` (local, UI-only state until authenticated).
4. **Qualification rule (client):** a match qualifies only if the local player `hasSpawned`, did not voluntarily leave, and `isAliveAtEnd === true` OR was eliminated after participating (`killedAt` set). The client computes the simulation, so it can determine this locally. Mirror the same semantics the server uses in T6.

## Out of scope
- Any server sync / upload (T7).
- Rendering the citizenship card / locked state (Citizenship Core UI task / Part G).
- Server-side `is_citizen` (T5/T6).

## Acceptance / Verification
- Epic Verification #1: play a qualifying match as a guest → `xp` increments by 10 in localStorage; play a disqualified match (leave mid-game / never spawn) → no increment.
- Epic Verification #5 (local part): reaching 1,000 XP flips the local `is_citizen` to `true`.
- Verifiable entirely in the browser with no server running.

## Notes
- Document the durability tradeoff in code comments near the store.
- Reuse the exact qualification predicate definition with T6 to avoid client/server drift (consider extracting it to `src/core/`).
- **Carried over from T1 schema-contract review (2026-06-13):** `migrateProfile` is forward-tolerant for *reads* but returns a current-shaped object, so migrating a profile whose stored `schema_version` is **newer** than this build downgrades it and strips unknown fields. Before writing a migrated profile back to localStorage, guard the write: if the stored `schema_version > CURRENT_PROFILE_SCHEMA_VERSION`, do **not** overwrite it. Add a test proving a stale client cannot strip/overwrite a newer local profile. (Throwing in `migrateProfile` is intentionally off the table — epic Verification #6 requires it to return without errors; the guard lives at the writeback site, not in the pure migration.)
