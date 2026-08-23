# Player Profile Store

**Layer**: server
**Key files**: `src/core/profile/PlayerProfile.ts`, `src/profile-server/`, `migrations/001_player_profiles.sql`, `deploy.sh`, `build-deploy-profile.sh`, `setup-profile.sh`

## Summary

The player profile store is the Sprint 4 backend foundation for persistent XP, citizenship state, display names, and future paid entitlements. It runs as a dedicated profile API and Postgres stack on a reg.ru VPS at `api.geoconflict.ru`; game servers call the API instead of connecting to Postgres directly.

Sources: `ai-agents/knowledge-base/s4-preexisting-infra-impact-2026-06-24.md`, `ai-agents/tasks/done/s4-profile-05-backend-db-api.md`, `ai-agents/tasks/done/s4-profile-06-match-end-crediting.md`, `ai-agents/tasks/done/s4-postgres-backup-routine.md`, `ai-agents/knowledge-base/profile-backup-restore-runbook.md`, `ai-agents/tasks/done/s4-citizenship-xp-progress-ui.md`

## Architecture

- **Shared contract**: [[tasks/profile-schema-contract]] defines `PlayerProfile` v1 and `migrateProfile()` in `src/core/profile/PlayerProfile.ts`.
- **Dedicated host**: T4 slices built the profile-service liveness endpoint, public API URL config, Docker image, VPS provisioning, digest-based deploy, on-box compose lifecycle, secret scan, deploy hardening, game-server env propagation, and operator bring-up.
- **DB/API**: T5 adds Postgres migrations, a `PlayerProfileRepository`, client `GET /v1/profile`, internal `POST /internal/v1/credit`, and DB-backed `GET /ready`.
- **Match-end crediting**: [[tasks/profile-match-end-crediting]] adds the game-server T6 path that accepts client participation summaries, applies server-side qualification, and calls the internal profile credit endpoint fail-soft.
- **Backups**: [[tasks/postgres-backup-routine]] adds the T8 daily `pg_dump -Fc` path, age encryption, verified off-box S3 upload, restore command, retention, and machine-readable backup marker.
- **Profile read UI**: [[tasks/citizenship-xp-progress-ui]] reads the public `GET /v1/profile` projection from the client citizenship card and maps it to the XP/citizenship view model.
- **Storage strategy**: [[decisions/profile-storage-strategy]] chose typed Postgres columns plus `extra jsonb`, with `xp bigint`, `persistent_id text`, DB-level paid/citizenship invariants, and future-aware tables for names/cosmetics.
- **Payments endpoints**: [[tasks/yandex-payments-implementation]] (0019) added `POST /v1/payments/yandex/{intent,complete,reconcile}` to the profile server, with migration 002 (`purchase_intents`, `processed_purchases`), HMAC signature verification, and the sole-authority rule that only a verified purchase token can set `is_paid_citizen` — `upsertProfile` and `/internal/v1/credit` never touch paid state. Fail-closed 503 until `YANDEX_PAYMENTS_SECRET` is provisioned (secret issuance blocked on Yandex catalog approval, task 0014).
- **Runtime boundary**: game servers should credit via the profile API using service auth and IP allowlisting; they should not hold direct profile DB credentials.
- **Guest path**: the T2/T7 guest-first flow is cancelled. Profile XP is authenticated-only through the T6 server-side crediting path.

## Gotchas / Known Issues

- The Yandex ID carried through match join is still an unsigned client-provided value. Earned-XP crediting must either accept that risk for non-monetary XP or add signed identity plumbing; paid state relies on Yandex Payments HMAC verification, implemented in 0019 but not yet live-verified (no secret key until catalog approval).
- `PROFILE_API_URL` has to be present in the game-server deploy environment or `/api/env.profileApiUrl` stays empty. T4h is the completed fix for that deploy gap.
- Profile outages must not stop active matches. T6 keeps match-end crediting fail-soft: after bounded retries, credits may be dropped rather than blocking winner handling or cleanup.
- The duplicate backup-task conflict is resolved as of 2026-06-29 and canonical T8 is now done. Off-box backup activation is fail-closed: missing or partial `PROFILE_BACKUP_*` config keeps first deploys on local weekly dumps, but an already off-box-configured box refuses a silent downgrade unless `PROFILE_BACKUP_DISABLE_OFFBOX=1` is explicit.
- The first restore drill used an empty production DB. Restore mechanics were verified, but a non-empty data round-trip should be rerun once real profiles/entitlements exist.
- 152-ФЗ compliance is unresolved after the hash-based avoidance plan was cancelled. See [[decisions/personal-data-152fz-compliance]].
- 🚨 **The whole crediting path is a no-op in production (verified 2026-08-23, task `0062`)**: `deploy.sh` never forwards `PROFILE_INTERNAL_TOKEN`, so `ProfileApiClient.isConfigured()` is false and both `upsertProfile()` and `creditMatch()` silently no-op (the miss is logged at `debug`, invisible in prod logs); the profile server independently fails **closed** on the empty token. Net effect: **no profile row is ever created and no XP is ever credited in production** — this blocks earned (`0017`) and paid (`0018`) citizenship. The fix is one line in `deploy.sh`. Found by the 2026-08-22 outage config-drift sweep; see [[decisions/incident-2026-08-22-public-lobbies-outage]].

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
- [[tasks/postgres-backup-routine]]
- [[tasks/citizenship-xp-progress-ui]]
- [[tasks/yandex-payments-implementation]] — the 0019 payments endpoints and paid-flag grant path hosted here
- [[decisions/profile-storage-strategy]]
- [[decisions/profile-deploy-hardening-review-loop]]
- [[decisions/sprint-4]]
- [[decisions/sprint-backlog]]
- [[decisions/cancelled-tasks]]
- [[tasks/personal-data-compliance-investigation]]
- [[systems/project-brief]] — citizenship as the product's supporter tier
- [[systems/architecture-overview]] — the profile backend tier in the wider survey
- [[decisions/adr-101-fail-soft-xp-crediting]] — why crediting drops XP rather than blocking a match
- [[decisions/adr-103-identity-trust-seam]] — the single unverified-identity funnel this store is keyed on
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the sweep that exposed the `0062` token-forwarding gap making crediting a prod no-op
