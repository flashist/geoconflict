# Player Profile Store Investigation

**Source**: `ai-agents/tasks/done/sprint4-investigation-player-store.md`, `ai-agents/knowledge-base/sprint4-player-profile-store-findings.md`
**Status**: done
**Sprint/Tag**: Sprint 4 investigation

## Goal

Determine the foundation for Sprint 4 persistent player data: database technology, hosting location, initial schema, qualifying-match tracking approach, and guest-player handling.

## Key Changes

- Reviewed the current join/auth flow and confirmed that the server only sees the existing internal `persistentID`; it does not currently receive or verify a Yandex player ID.
- Reviewed the current client Yandex bootstrap and confirmed the game already checks platform authorization for name lookup via `FlashistFacade`, but does not yet expose reusable helpers for Yandex auth mode or unique ID.
- Reviewed the match-end path and confirmed the game server is the right place to write progression data, but that one extra end-of-match per-player state summary is needed because the server does not currently simulate spawn/elimination itself.
- Recommended PostgreSQL on the game VPS as a sibling service/container, not MongoDB/SQLite/Redis and not the Uptrace/tooling VPS.
- Proposed an initial relational schema centered on `player_profiles` plus idempotent `player_match_credits`, with future-safe hooks for display-name uniqueness, name history, and cosmetic ownership.

## Outcome

The investigation recommends PostgreSQL running locally on the game VPS, with the game server crediting qualifying matches at match end in an idempotent transaction. The main architectural gap is identity trust: Sprint 4 should add a verified Yandex identity claim to the existing join/auth path before paid citizenship or Yandex-keyed player profiles ship.

Guest players should not have the citizenship feature silently hidden. The recommended UX is a locked citizenship surface with a Yandex login prompt.

## Related

- [[decisions/sprint-4]] — Sprint 4 roadmap and dependencies for citizenship and payments
