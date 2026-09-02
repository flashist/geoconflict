# Player Profile Store

**Layer**: server
**Key files**: `src/core/profile/PlayerProfile.ts`, `src/profile-server/`, `migrations/001_player_profiles.sql`, `deploy.sh`, `build-deploy-profile.sh`, `setup-profile.sh`

## Summary

The player profile store is the Sprint 4 backend foundation for persistent XP, citizenship state, display names, and future paid entitlements. It runs as a dedicated profile API and Postgres stack on a reg.ru VPS at `api.geoconflict.ru`; game servers call the API instead of connecting to Postgres directly.

Sources: `ai-agents/knowledge-base/s4-preexisting-infra-impact-2026-06-24.md`, `ai-agents/tasks/done/0185-profile-05-backend-db-api/brief.md`, `ai-agents/tasks/done/0188-profile-06-match-end-crediting/brief.md`, `ai-agents/tasks/done/0189-postgres-backup-routine/brief.md`, `ai-agents/knowledge-base/profile-backup-restore-runbook.md`, `ai-agents/tasks/done/0191-citizenship-xp-progress-ui/brief.md`

## Architecture

- **Shared contract**: [[tasks/profile-schema-contract]] defines `PlayerProfile` v1 and `migrateProfile()` in `src/core/profile/PlayerProfile.ts`.
- **Dedicated host**: T4 slices built the profile-service liveness endpoint, public API URL config, Docker image, VPS provisioning, digest-based deploy, on-box compose lifecycle, secret scan, deploy hardening, game-server env propagation, and operator bring-up.
- **DB/API**: T5 adds Postgres migrations, a `PlayerProfileRepository`, client `GET /v1/profile`, internal `POST /internal/v1/credit`, and DB-backed `GET /ready`.
- **Match-end crediting**: [[tasks/profile-match-end-crediting]] adds the game-server T6 path that accepts client participation summaries, applies server-side qualification, and calls the internal profile credit endpoint fail-soft.
- **Backups**: [[tasks/postgres-backup-routine]] adds the T8 daily `pg_dump -Fc` path, age encryption, verified off-box S3 upload, restore command, retention, and machine-readable backup marker.
- **Profile read UI**: [[tasks/citizenship-xp-progress-ui]] reads the public `GET /v1/profile` projection from the client citizenship card and maps it to the XP/citizenship view model.
- **Storage strategy**: [[decisions/profile-storage-strategy]] chose typed Postgres columns plus `extra jsonb`, with `xp bigint`, `persistent_id text`, DB-level paid/citizenship invariants, and future-aware tables for names/cosmetics.
- **Payments endpoints**: [[tasks/yandex-payments-implementation]] (0019) added `POST /v1/payments/yandex/{intent,complete,reconcile}` to the profile server, with migration 002 (`purchase_intents`, `processed_purchases`), HMAC signature verification, and the sole-authority rule that only a verified purchase token can set `is_paid_citizen` — `upsertProfile` and `/internal/v1/credit` never touch paid state. Fail-closed 503 until `YANDEX_PAYMENTS_SECRET` is provisioned (secret issuance blocked on Yandex catalog approval, task 0014).
- **Personal inbox (task `0012`, built 2026-08-26 — not launched)**: migration `003_player_messages.sql` adds `player_messages` (`id bigserial` PK, FK `yandex_player_id` → `player_profiles` `ON DELETE CASCADE`; `template_key` + `template_params jsonb` for system sends rendered client-side from `inbox.templates.<key>`, or literal `title` / `body` for admin sends; `sent_at`, `read_at`; check constraints `chk_message_content` — template **or** title+body — and `chk_read_after_sent`). Routes: `GET /v1/messages?yandexPlayerId=` and `PATCH /v1/messages/read` (both unauthenticated, on the ADR-103 client-asserted-ID funnel, sharing the 60 req/min limiter; **`403 not_citizen`** for non-citizens **and** missing profiles, gated in SQL) plus internal `POST /internal/v1/messages/send`. **`InboxRepository.ts` is the only reader and writer of that table**, and both post-commit citizenship seams — `PlayerProfileRepository.afterCitizenshipEarned` and `PaymentsRepository.afterPaidPurchaseGranted` — send through its `InboxSender` interface, which **contractually never throws**, so an inbox failure cannot break a grant. See [[features/announcements]].
- **Name change (task `0067`, built 2026-08-28; code deployed 2026-08-29 in release `362a2f9`, but nothing about it has run — the UI has still never been seen in a browser, `CITIZENSHIP_CARD_ENABLED` is `false`, and `PROFILE_INTERNAL_TOKEN` was deliberately left blank so the game server's profile calls no-op)**: migration `004_name_change.sql` adds `rejection_reason` + `decided_at` to `player_name_history`, a **partial unique index** enforcing one pending request per player, and a latest-request index. Routes: `POST /v1/profile/name-change-request` and `POST /v1/profile/name-change-cancel` (player, citizen-gated **in SQL**, 30/min per IP) plus internal `POST /internal/v1/name-change/decide` (`internalAuth`, no CORS). `NameChangeRepository.ts` is the data layer; `src/core/validations/usernameRules.ts` is the dependency-free extraction that lets the profile server share the in-game validator; `src/core/notifications/TelegramNotifier.ts` is the shared operator-notification helper. `PublicPlayerProfileSchema` gains an optional `name_change` projection, and `GET /v1/profile` **degrades rather than 500s** if that lookup fails, because it drives the whole citizenship card. See [[tasks/citizenship-name-change]].
- **Citizen flag on the game path (task `0068`, built 2026-08-28; code deployed 2026-08-29 in `362a2f9` — no profile writes reach the DB in production yet, so no player is a citizen there to flag)**: `upsertProfile` on the game server now returns the profile row's `is_citizen`, which `GameServer` attaches to `Client` and freezes onto the match roster at `start()` and onto the 1 Hz lobby-poll payload at `gameInfo()`. **The profile server's SQL is the sole authority for that flag** — never a value read back off a game record. See [[tasks/citizen-verified-icon]].
- **Runtime boundary**: game servers should credit via the profile API using service auth and IP allowlisting; they should not hold direct profile DB credentials.
- **Guest path**: the T2/T7 guest-first flow is cancelled. Profile XP is authenticated-only through the T6 server-side crediting path.

## Gotchas / Known Issues

- The Yandex ID carried through match join is still an unsigned client-provided value. Earned-XP crediting must either accept that risk for non-monetary XP or add signed identity plumbing; paid state relies on Yandex Payments HMAC verification, implemented in 0019 but not yet live-verified (no secret key until catalog approval).
- `PROFILE_API_URL` has to be present in the game-server deploy environment or `/api/env.profileApiUrl` stays empty. T4h is the completed fix for that deploy gap.
- Profile outages must not stop active matches. T6 keeps match-end crediting fail-soft: after bounded retries, credits may be dropped rather than blocking winner handling or cleanup.
- The duplicate backup-task conflict is resolved as of 2026-06-29 and canonical T8 is now done. Off-box backup activation is fail-closed: missing or partial `PROFILE_BACKUP_*` config keeps first deploys on local weekly dumps, but an already off-box-configured box refuses a silent downgrade unless `PROFILE_BACKUP_DISABLE_OFFBOX=1` is explicit.
- The first restore drill used an empty production DB. Restore mechanics were verified, but a non-empty data round-trip should be rerun once real profiles/entitlements exist.
- 152-ФЗ compliance is unresolved after the hash-based avoidance plan was cancelled. See [[decisions/personal-data-152fz-compliance]].
- 🚨 **Every payments route returns 503 on the real box (verified 2026-08-28, task `0195`)**: `build-deploy-profile.sh`'s staged-export block omits `YANDEX_PAYMENTS_SECRET`, so `setup-profile.sh`'s `${YANDEX_PAYMENTS_SECRET:-}` writes it **empty** into `profile.env` and the `paymentsEnabled` middleware 503s `/v1/payments/*` wholesale — true since `0019` shipped. `example.env.profile` does not document the variable at all, so an operator has no way to learn it is a deploy input. **Third instance of the config-parity class and the first outside `deploy.sh`** — see [[decisions/config-parity-failure-class]]. Blocks `0065`. 🔧 **Updated 2026-09-02 — the DEPLOY SCRIPT is fixed; the ROUTES STILL 503.** `0195` shipped 2026-09-01 (the variable joins the staged-export block; `example.env.profile` now documents it) and closed as **built + Deferred Live Tail, agent-closed and not owner-verified**. **`0014` has not issued the per-game key**, so the value lands **empty** on the box and `/v1/payments/*` correctly keeps failing closed. **A profile deploy carried out today changes nothing observable here.** See [[tasks/yandex-payments-secret-forwarding]].
- 🚨 **The pending, unmoderated requested name is publicly readable (task `0067`, UNMITIGATED)**: `GET /v1/profile` is unauthenticated and enumerable by a non-secret player id, and `toPublicProfile` returns `name_change.requested_name` — whatever was submitted, before any operator sees it. **This passes no gate at all.** The moderation gate reviews a name before it is APPLIED, never before it is PUBLISHED. Owner-ruled to keep the field so a player can see their own request. Do not describe it as mitigated or bounded.
- ⚠️ **`is_citizen` is served on the unauthenticated lobby-poll endpoint `GET /api/game/:id` (task `0068`, residual R3)** — accepted **only while the flag stays purely cosmetic, and VOID the moment anything of value is gated on it**, at which point the exposure must be re-decided.
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
- [[tasks/yandex-payments-secret-forwarding]] — task `0195`, the deploy gap that 503s those payments routes; fixed in the repo 2026-09-01, not in production
- [[tasks/supertest-profile-server-flake]] — task `0200`, the flake in this service's route test suites; confirmed as a host-level socket-accept loss, not a repository defect
- [[decisions/profile-storage-strategy]]
- [[decisions/profile-deploy-hardening-review-loop]]
- [[decisions/sprint-4]]
- [[features/announcements]] — the popup surface the task-0012 personal inbox attaches to
- [[decisions/adr-103-identity-trust-seam]] — the client-asserted-ID funnel the inbox read routes share
- [[decisions/sprint-backlog]]
- [[decisions/cancelled-tasks]]
- [[tasks/personal-data-compliance-investigation]]
- [[systems/project-brief]] — citizenship as the product's supporter tier
- [[systems/architecture-overview]] — the profile backend tier in the wider survey
- [[decisions/adr-101-fail-soft-xp-crediting]] — why crediting drops XP rather than blocking a match
- [[decisions/adr-103-identity-trust-seam]] — the single unverified-identity funnel this store is keyed on
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the sweep that exposed the `0062` token-forwarding gap making crediting a prod no-op
- [[tasks/citizenship-name-change]] — 0067's name-change endpoints, migration 004, and the unmitigated pending-name exposure
- [[tasks/citizen-verified-icon]] — 0068's `is_citizen` propagation from `upsertProfile` onto the frozen roster and lobby poll
- [[decisions/config-parity-failure-class]] — the class behind both `0062` and `0195`, the two gaps that keep this store inert in production
