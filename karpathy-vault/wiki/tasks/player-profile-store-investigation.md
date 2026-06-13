# Player Profile Store Investigation

**Source**: `ai-agents/tasks/done/sprint4-investigation-player-store.md`, `ai-agents/knowledge-base/sprint4-player-profile-store-findings.md`, `ai-agents/knowledge-base/s4-profile-02-guest-localstorage-cancellation-2026-06-13.md`
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

The investigation still recommends PostgreSQL, server-side match-end crediting, and an idempotent per-match credit table. Its deployment-location recommendation was superseded on 2026-06-13: profile storage and non-game backend logic should run on a dedicated reg.ru VPS behind `https://api.geoconflict.ru`, not on the game-server VPS. The game server should call the profile API for crediting; it should not receive direct Postgres credentials.

The main architectural gap remains identity trust: Sprint 4 should add a verified Yandex identity claim to the existing join/auth path before paid citizenship or Yandex-keyed player profiles ship. The updated implementation plan also keeps game/profile failures isolated: profile outages must not stop matches, and game-server crashes must not threaten paid data.

Guest players should not have the citizenship feature silently hidden. The recommended UX is a locked citizenship surface with a Yandex login prompt. After the 2026-06-13 cancellation of T2/T7, guest users do not accumulate profile XP before login; profile XP is authenticated-only until the T5/T6 server-side crediting path ships. A future guest-XP retry should be a thin best-effort cache over the server source of truth.

## Related

- [[decisions/sprint-4]] — Sprint 4 roadmap and dependencies for citizenship and payments
- [[tasks/profile-schema-contract]] — first implementation slice produced the shared profile payload and migration contract
- [[tasks/yandex-payments-investigation]] — parallel Sprint 4 investigation; both findings gate the safe paid-citizenship path
- [[decisions/cancelled-tasks]] — cancellation record for T2 guest localStorage and T7 guest migration
