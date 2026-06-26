# Profile Backend DB and API

**Source**: `ai-agents/tasks/done/s4-profile-05-backend-db-api.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T5

## Goal

Turn the live profile box into a working Postgres-backed profile service with DB migrations, repository logic, readiness checks, client profile reads, and internal match-XP crediting.

## Key Changes

- Landed the first profile-store migration using the accepted typed-column plus `extra jsonb` storage strategy.
- Added the profile repository on the profile server, keeping direct Postgres access out of the game server.
- Implemented `GET /v1/profile` for authenticated profile reads and `POST /internal/v1/credit` for service-token-protected, idempotent match XP crediting.
- Added DB-backed `GET /ready`, distinct from T4's liveness-only `/health`, so malformed or unreachable `DATABASE_URL` fails at the real `pg` consumer.
- Preserved the post-cancellation scope: no `POST /v1/profile/migrate`, no client-supplied XP, and no guest-first XP upload path.

## Outcome

T5 is the first independently exercisable profile backend. It creates fresh authenticated profiles at `xp: 0`, credits match XP idempotently by `(game_id, player identity)`, flips earned citizenship at the 1,000 XP threshold, and leaves paid state server-authoritative for the later Yandex Payments flow. T6 still has to wire match-end game-server calls into this API.

## Related

- [[systems/player-profile-store]] — profile API, database, identity, and deployment architecture
- [[decisions/profile-storage-strategy]] — T5 storage choice and schema rationale
- [[decisions/profile-deploy-hardening-review-loop]] — T5 owns the `/ready` and database semantics deferred from T4
- [[decisions/sprint-4]] — parent sprint and profile-store sequence
- [[tasks/player-profile-store-investigation]] — original profile DB/API investigation
- [[tasks/profile-schema-contract]] — shared `PlayerProfile` v1 contract consumed by T5
- [[tasks/profile-game-server-deploy-env]] — game-server deploy plumbing needed by runtime consumers
- [[tasks/profile-hash-player-ids]] — compliance-driven identity-key change after T5
- [[tasks/profile-server-bring-up-runbook]] — live profile box bring-up that T5 builds on
