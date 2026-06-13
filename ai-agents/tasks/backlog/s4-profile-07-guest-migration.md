# Task — Player Profile: Guest→Authenticated Migration (T7)

## Parent / Epic
`ai-agents/tasks/backlog/s4-player-profile-store-impl.md` — child slice 7 of 8. Implements **Part F**.

## Sprint
Sprint 4

## Priority
Medium-High — completes the guest-first story: local progress transfers to the server on login.

## Depends on
T2 (local guest profile exists), T3 (`getYandexUniqueId`), T5 (`GET /v1/profile`, `POST /v1/profile/migrate`).

## Blocks
None.

## Context
When a guest authenticates with Yandex for the first time in a session, their local profile must either yield to an existing server profile (server wins, no merge) or be uploaded to create a new server profile. This runs at the point in `FlashistFacade` where Yandex authentication completes, **before** the UI reflects any profile state.

## Scope
1. Call `getYandexUniqueId()` to get the Yandex player ID.
2. Call the profile API `GET /v1/profile`.
3. **If a server-side profile exists:** use it. Discard the localStorage profile — do **not** merge. Update local state from the server profile.
4. **If no server-side profile exists:** read the localStorage profile and `POST /v1/profile/migrate` (preserving accumulated XP). Clear the localStorage profile after the successful write.
5. **Read-path degradation:** if the profile API is unreachable/slow, fall back to guest/local state and do not block login or play. A profile-backend outage degrades to "progress not loaded," never a broken login.

## Out of scope
- Rendering the citizenship card / locked state (Citizenship Core UI task / Part G).
- Server-side crediting (T6).

## Acceptance / Verification
- Epic Verification #2 (no server profile): accumulate XP as guest, log in → XP transfers to a new server profile; localStorage profile cleared.
- Epic Verification #3 (server profile exists): with a pre-existing server profile, logging in from a guest session with local XP → server profile wins, local data discarded.

## Notes
- Guest XP comes from untrusted localStorage, so migration can carry fabricated XP — accepted for Sprint 4 (citizenship here is *earned*/free; paid flags never come from migration). Revisit if/when this becomes an abuse vector.
- **The entire migrate upload is untrusted (2026-06-13).** This task is the *origin* of the `POST /v1/profile/migrate` body — it reads the guest profile straight from the player's own localStorage and uploads it verbatim. Beyond fabricated `xp`, a forged profile can carry `is_paid_citizen:true`, `citizenship_purchased_at`, `is_citizen:true`, or `citizenship_earned_at`. The T1 Zod contract is pure/never-throw and does **not** strip these (per the 2026-06-13 schema-contract review); the client may upload them but is **never** authoritative. The server (T5) forces paid fields off and recomputes citizenship from the carried XP — only `xp` and identity carry over. See epic Part F.
