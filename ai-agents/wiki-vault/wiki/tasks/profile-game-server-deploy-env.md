# Profile API URL Game-Server Deploy Env

**Source**: `ai-agents/tasks/done/0184-profile-04h-game-server-deploy-env/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T4h

## Goal

Propagate `PROFILE_API_URL` into the game-server container environment so `/api/env.profileApiUrl` can expose the live profile API URL to runtime consumers.

## Key Changes

- Added `PROFILE_API_URL=${PROFILE_API_URL}` to the explicit game-server deploy env heredoc in `deploy.sh`.
- Preserved the documented default: if the variable is unset, the container receives an empty value and `/api/env.profileApiUrl` remains `""`.
- Kept the value as public non-secret configuration, distinct from profile-box secrets such as `DATABASE_URL` and `PROFILE_INTERNAL_TOKEN`.

## Outcome

The deploy gap from T4b is closed. T6 match-end crediting and future citizenship/profile client UI no longer silently resolve `profileApiUrl()` to `""` in real game-server deploys when the operator config sets `PROFILE_API_URL`. 🔴 **2026-09-04: whether the URL this variable carries reaches a working service is UNVERIFIED.** ⚠️ **This supersedes an earlier same-day annotation here reading "points at NOTHING — there is no profile host"; that overstated the owner's position and is withdrawn.** Owner rulings, both live in session and **both standing**: *"We don't have ANY profile-related VPS yet…"*, then *"the VPS and S3 I created will be reused."* 🔴 **Reconciled: the host and the DNS record exist and are reused in place; what is running there is UNKNOWN AND UNVERIFIED.** ⚠️ **A DNS record resolving proves nothing about a server running.** ⛔ **This slice's fix is not in question.** ✅ **The hostname question is SETTLED, not open: reuse the existing record** (`0214`) — 🔴 **the `api.` subdomain is architecturally required, not incidental**, because Yandex Games permits only ONE main domain for an iframe game, so everything routes through subdomains of it. Do not re-open it as a convenience choice. Wipe-and-rebuild onto the existing resources: `0213`–`0222` plus `0201`, Sprint 4.

## Related

- [[systems/player-profile-store]]
- [[systems/configuration]]
- [[decisions/sprint-4]]
- [[decisions/profile-deploy-hardening-review-loop]]
- [[tasks/profile-api-url-config]]
- [[tasks/profile-deploy-hardening]]
- [[tasks/profile-backend-db-api]]
- [[tasks/profile-match-end-crediting]]
