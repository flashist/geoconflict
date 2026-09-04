# Player Profile Store Investigation

**Source**: `ai-agents/tasks/done/0124-investigation-player-store/brief.md`, `ai-agents/knowledge-base/sprint4-player-profile-store-findings.md`, `ai-agents/knowledge-base/s4-profile-02-guest-localstorage-cancellation-2026-06-13.md`
**Status**: done
**Sprint/Tag**: Sprint 4 investigation

## Goal

Determine the foundation for Sprint 4 persistent player data: database technology, hosting location, initial schema, qualifying-match tracking approach, and guest-player handling.

## Key Changes

- Reviewed the current join/auth flow and confirmed that the server only sees the existing internal `persistentID`; it does not currently receive or verify a Yandex player ID.
- Reviewed the current client Yandex bootstrap and confirmed the game already checks platform authorization for name lookup via `FlashistFacade`, but does not yet expose reusable helpers for Yandex auth mode or unique ID.
- Reviewed the match-end path and confirmed the game server is the right place to write progression data, but that one extra end-of-match per-player state summary is needed because the server does not currently simulate spawn/elimination itself.
- Recommended PostgreSQL rather than MongoDB/SQLite/Redis, with an idempotent per-match credit ledger. The original hosting recommendation, Postgres as a sibling service on the game-server VPS, is now superseded by a dedicated reg.ru profile/API VPS at `api.geoconflict.ru`, with Postgres localhost-only on that box.
- Proposed an initial relational schema centered on `player_profiles` plus idempotent `player_match_credits`, with future-safe hooks for display-name uniqueness, name history, and cosmetic ownership.

## Outcome

The investigation still recommends PostgreSQL, server-side match-end crediting, and an idempotent per-match credit table. Its deployment-location recommendation was superseded on 2026-06-13: profile storage and non-game backend logic ~~run~~ **are designed to run** (🔴 **2026-09-04: that VPS EXISTS and is reused in place, but whether the stack is running on it is UNVERIFIED** — owner-ruled; ⚠️ *this withdraws an earlier same-day annotation here reading "no such VPS exists"*. The shape is still the plan, and the wipe-and-rebuild `0213`–`0222` stands it up again **on that same box**) on a dedicated reg.ru VPS, not on the game-server VPS. The game server should call the profile API for crediting; it should not receive direct Postgres credentials.

The original server-visible identity gap is now partially closed by [[tasks/yandex-identity-plumbing]]: T3 carries the Yandex unique ID through match join and stores it on the server-side client. The transported value remains unsigned and untrusted, so paid-citizenship verification still requires the separate Yandex Payments trust boundary. The updated implementation plan also keeps game/profile failures isolated: profile outages must not stop matches, and game-server crashes must not threaten paid data.

Guest players should not have the citizenship feature silently hidden. The recommended UX is a locked citizenship surface with a Yandex login prompt. After the 2026-06-13 cancellation of T2/T7, guest users do not accumulate profile XP before login; profile XP is authenticated-only until the T5/T6 server-side crediting path ships. A future guest-XP retry should be a thin best-effort cache over the server source of truth.

## Related

- [[decisions/sprint-4]] — Sprint 4 roadmap and dependencies for citizenship and payments
- [[systems/player-infrastructure]] — pre-S4 identity/customization audit that confirms the no-server-persistence baseline
- [[tasks/profile-schema-contract]] — first implementation slice produced the shared profile payload and migration contract
- [[tasks/yandex-identity-plumbing]] — completed T3 server-visible Yandex unique-ID path
- [[tasks/profile-vps-provisioning]] — completed T4d provisioning for the dedicated reg.ru profile/API host
- [[systems/player-profile-store]] — current profile API/Postgres architecture after T4/T5
- [[decisions/profile-storage-strategy]] — T5 database storage strategy chosen after the investigation
- [[tasks/profile-backend-db-api]] — completed T5 DB/API implementation
- [[tasks/yandex-payments-investigation]] — parallel Sprint 4 investigation; both findings gate the safe paid-citizenship path
- [[decisions/cancelled-tasks]] — cancellation record for T2 guest localStorage and T7 guest migration
