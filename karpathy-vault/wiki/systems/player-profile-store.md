# Player Profile Store

**Layer**: server
**Key files**: `src/core/profile/PlayerProfile.ts`, `src/profile-server/`, `migrations/001_player_profiles.sql`, `deploy.sh`, `build-deploy-profile.sh`, `setup-profile.sh`

## Summary

The player profile store is the Sprint 4 backend foundation for persistent XP, citizenship state, display names, and future paid entitlements. It runs as a dedicated profile API and Postgres stack on a reg.ru VPS at `api.geoconflict.ru`; game servers call the API instead of connecting to Postgres directly.

Sources: `ai-agents/knowledge-base/s4-preexisting-infra-impact-2026-06-24.md`, `ai-agents/tasks/done/s4-profile-05-backend-db-api.md`, `ai-agents/tasks/done/s4-profile-06-match-end-crediting.md`

## Architecture

- **Shared contract**: [[tasks/profile-schema-contract]] defines `PlayerProfile` v1 and `migrateProfile()` in `src/core/profile/PlayerProfile.ts`.
- **Dedicated host**: T4 slices built the profile-service liveness endpoint, public API URL config, Docker image, VPS provisioning, digest-based deploy, on-box compose lifecycle, secret scan, deploy hardening, game-server env propagation, and operator bring-up.
- **DB/API**: T5 adds Postgres migrations, a `PlayerProfileRepository`, client `GET /v1/profile`, internal `POST /internal/v1/credit`, and DB-backed `GET /ready`.
- **Match-end crediting**: [[tasks/profile-match-end-crediting]] adds the game-server T6 path that accepts client participation summaries, applies server-side qualification, and calls the internal profile credit endpoint fail-soft.
- **Storage strategy**: [[decisions/profile-storage-strategy]] chose typed Postgres columns plus `extra jsonb`, with `xp bigint`, `persistent_id text`, DB-level paid/citizenship invariants, and future-aware tables for names/cosmetics.
- **Runtime boundary**: game servers should credit via the profile API using service auth and IP allowlisting; they should not hold direct profile DB credentials.
- **Guest path**: the T2/T7 guest-first flow is cancelled. Profile XP is authenticated-only through the T6 server-side crediting path.

## Gotchas / Known Issues

- The Yandex ID carried through match join is still an unsigned client-provided value. Earned-XP crediting must either accept that risk for non-monetary XP or add signed identity plumbing; paid state must rely on Yandex Payments verification.
- `PROFILE_API_URL` has to be present in the game-server deploy environment or `/api/env.profileApiUrl` stays empty. T4h is the completed fix for that deploy gap.
- Profile outages must not stop active matches. T6 keeps match-end crediting fail-soft: after bounded retries, credits may be dropped rather than blocking winner handling or cleanup.
- 152-ФЗ compliance is unresolved after the hash-based avoidance plan was cancelled. See [[decisions/personal-data-152fz-compliance]].

## Related

- [[systems/player-infrastructure]] — pre-S4 identity/customization substrate
- [[systems/configuration]] — `/api/env` and `PROFILE_API_URL` runtime/deploy configuration
- [[tasks/profile-schema-contract]]
- [[tasks/player-profile-store-investigation]]
- [[tasks/profile-api-url-config]]
- [[tasks/profile-deploy-hardening]]
- [[tasks/profile-game-server-deploy-env]]
- [[tasks/profile-backend-db-api]]
- [[tasks/profile-match-end-crediting]]
- [[decisions/profile-storage-strategy]]
- [[decisions/profile-deploy-hardening-review-loop]]
- [[decisions/sprint-4]]
- [[decisions/sprint-backlog]]
- [[decisions/cancelled-tasks]]
- [[tasks/personal-data-compliance-investigation]]
