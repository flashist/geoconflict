# Profile Game-Server Deploy Environment

**Source**: `ai-agents/tasks/done/s4-profile-04h-game-server-deploy-env.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T4h

## Goal

Propagate `PROFILE_API_URL` into the game-server container environment so real deploys expose the profile API URL through `/api/env` instead of falling back to an empty string.

## Key Changes

- Added `PROFILE_API_URL=${PROFILE_API_URL}` to the explicit runtime-env allowlist written by `deploy.sh`.
- Kept the value in non-secret `.env.<env>` configuration; it is a public URL, not a secret.
- Preserved the documented empty-string fallback when `PROFILE_API_URL` is unset.

## Outcome

Production deploys can now surface `profileApiUrl` from `/api/env`, unblocking runtime consumers such as T6 match-end crediting and the later citizenship UI. The change is deploy plumbing only; it does not create a profile client or credit XP by itself.

## Related

- [[decisions/sprint-4]] — parent sprint and profile-store sequence
- [[decisions/profile-deploy-hardening-review-loop]] — bounded T4 decomposition that includes T4h
- [[systems/configuration]] — runtime config and `/api/env` exposure
- [[tasks/profile-api-url-config]] — T4b public profile URL contract
- [[tasks/profile-backend-db-api]] — T5 backend endpoint slice that the URL points to
- [[systems/player-profile-store]] — profile API and database system
