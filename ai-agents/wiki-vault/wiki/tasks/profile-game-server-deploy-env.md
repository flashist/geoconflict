# Profile API URL Game-Server Deploy Env

**Source**: `ai-agents/tasks/done/s4-profile-04h-game-server-deploy-env.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T4h

## Goal

Propagate `PROFILE_API_URL` into the game-server container environment so `/api/env.profileApiUrl` can expose the live profile API URL to runtime consumers.

## Key Changes

- Added `PROFILE_API_URL=${PROFILE_API_URL}` to the explicit game-server deploy env heredoc in `deploy.sh`.
- Preserved the documented default: if the variable is unset, the container receives an empty value and `/api/env.profileApiUrl` remains `""`.
- Kept the value as public non-secret configuration, distinct from profile-box secrets such as `DATABASE_URL` and `PROFILE_INTERNAL_TOKEN`.

## Outcome

The deploy gap from T4b is closed. T6 match-end crediting and future citizenship/profile client UI no longer silently resolve `profileApiUrl()` to `""` in real game-server deploys when the operator config sets `PROFILE_API_URL`.

## Related

- [[systems/player-profile-store]]
- [[systems/configuration]]
- [[decisions/sprint-4]]
- [[decisions/profile-deploy-hardening-review-loop]]
- [[tasks/profile-api-url-config]]
- [[tasks/profile-deploy-hardening]]
- [[tasks/profile-backend-db-api]]
- [[tasks/profile-match-end-crediting]]
