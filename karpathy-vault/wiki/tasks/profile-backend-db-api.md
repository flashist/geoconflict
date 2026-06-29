# Profile Backend DB And API

**Source**: `ai-agents/tasks/done/s4-profile-05-backend-db-api.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T5

## Goal

Turn the live profile-service shell into a real Postgres-backed profile backend with a repository, migrations, readiness probe, client profile read endpoint, and internal match-XP crediting endpoint.

## Key Changes

- Implemented the first profile DB migration with `player_profiles`, `player_match_xp_credits`, and future-aware name/cosmetic tables.
- Added `PlayerProfileRepository` on the profile server so only the profile service talks to Postgres.
- Added `GET /v1/profile` for authenticated profile reads, `POST /internal/v1/credit` for service-token/IP-allowlisted match crediting, and DB-backed `GET /ready`.
- Kept `POST /v1/profile/migrate` out of scope because T2/T7 guest-first migration was cancelled.
- Enforced idempotent XP crediting by `(game_id, yandex_player_id)` and atomic XP/citizenship updates.
- Carried paid-citizenship invariants as server/DB write-path rules; paid state remains reserved for the later verified Yandex Payments flow.

## Outcome

T5 makes the profile backend independently exercisable with `curl` and unblocks the game-server T6 integration path. T6 later connected match-end winner handling to this internal credit endpoint; see [[tasks/profile-match-end-crediting]]. T5 also locks the storage strategy captured in [[decisions/profile-storage-strategy]]: typed columns plus `extra jsonb`, `xp bigint`, and `persistent_id text`.

The backend still does not by itself solve identity trust or 152-ФЗ compliance. The Yandex ID key is the current server-visible handle, but it is not a signed identity artifact on the match join path, and personal-data notification/consent work is deferred.

## Related

- [[systems/player-profile-store]]
- [[systems/player-infrastructure]]
- [[decisions/profile-storage-strategy]]
- [[decisions/personal-data-152fz-compliance]]
- [[decisions/sprint-4]]
- [[tasks/player-profile-store-investigation]]
- [[tasks/profile-schema-contract]]
- [[tasks/profile-deploy-hardening]]
- [[tasks/profile-game-server-deploy-env]]
- [[tasks/profile-server-bring-up-runbook]]
- [[tasks/profile-match-end-crediting]]
- [[tasks/personal-data-compliance-investigation]]
