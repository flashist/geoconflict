# Profile API URL Configuration

**Source**: `ai-agents/tasks/done/s4-profile-04b-client-api-url-config.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Player Profile Store T4b

## Goal

Expose the public profile-service base URL through the existing runtime configuration and `/api/env` path without leaking raw environment state or introducing a premature client consumer.

## Key Changes

- Added `profileApiUrl()` to `ServerConfig` and implemented runtime-config-first, trimmed `PROFILE_API_URL` resolution in `DefaultConfig`.
- Extended `RuntimeConfigData` and browser config loading for both `profileApiUrl` and `profile_api_url` response shapes.
- Added the resolved `profileApiUrl` value to the server's `/api/env` response and documented `PROFILE_API_URL` in `example.env`.
- Added focused resolution tests and the test-config stub; no webpack proxy change was needed because `/api/env` already uses the existing `/api/*` path.

## Outcome

The browser-visible runtime contract now carries a normalized public profile API URL, defaulting to an empty string and preferring a runtime override over the process environment. The value intentionally has no T4 client consumer; database credentials and internal tokens remain outside this public response.

## Related

- [[decisions/sprint-4]] — parent sprint and current profile-store sequence
- [[decisions/profile-deploy-hardening-review-loop]] — bounded T4 decomposition
- [[systems/configuration]] — runtime config and `/api/env` resolution path
