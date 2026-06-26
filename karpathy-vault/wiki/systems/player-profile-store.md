# Player Profile Store

**Layer**: server
**Key files**: `src/core/profile/PlayerProfile.ts`, `src/profile-server/`, `migrations/001_player_profiles.sql`, `build-deploy-profile.sh`, `setup-profile.sh`, `deploy.sh`

## Summary

Dedicated profile API and Postgres storage for citizenship XP, profile state, and future paid entitlements. It runs on the reg.ru RU profile VPS at `api.geoconflict.ru`, keeps Postgres localhost-only on that box, and exposes profile behavior through HTTP rather than giving the game server direct database credentials.

## Architecture

The shared profile shape starts in `src/core/profile/PlayerProfile.ts`: `PlayerProfile` v1, `migrateProfile()`, and `createGuestProfile()`. Guest-first localStorage XP was later cancelled, so this contract now feeds the authenticated backend path rather than a client-authoritative store.

The deployed profile box was built through the T4 slices: skeleton `/health`, public `PROFILE_API_URL` runtime config, standalone Docker image, VPS provisioning, digest-pinned deploy mechanics, on-box compose/Postgres, secret scanning, argv/concurrency hardening, game-server env propagation, and operator bring-up. The profile host is live at `api.geoconflict.ru` with 200/TLS.

T5 added the real DB/API layer. The profile server owns direct `pg` access, migrations, repository methods, `GET /v1/profile`, internal `POST /internal/v1/credit`, and DB-backed `/ready`. Crediting is idempotent by match/player key and is the only XP writer; the removed guest migration endpoint is not part of the current path.

Identity is compliance-sensitive. T3 carries a Yandex unique ID from client join into the server, but the stored profile key is now an irreversible server-keyed hash of that ID, not the raw Yandex ID. Raw IDs are transit-only and must not persist at rest.

## Gotchas / Known Issues

- T6 match-end crediting is still the next production integration gate. Until T6 calls the internal credit endpoint, real matches do not award profile XP.
- The Yandex ID transported by T3 is not a signed paid-identity proof. Payment verification remains a separate Yandex Payments trust boundary.
- Display-name storage is still a 152-ФЗ open item; hashing IDs does not automatically clear all personal-data obligations.
- Backups are not optional once paid citizenship or earned XP matter. The profile Postgres volume needs daily encrypted off-box backup and tested restore before paid citizenship.
- `PROFILE_API_URL` must be forwarded by the game-server deploy env; otherwise runtime config returns an empty `profileApiUrl` and profile consumers silently lack a base URL.

## Related

- [[decisions/sprint-4]] — parent sprint and current profile-store sequence
- [[systems/player-infrastructure]] — pre-S4 baseline this system replaces for persistence
- [[systems/configuration]] — `PROFILE_API_URL` and `/api/env` runtime wiring
- [[tasks/player-profile-store-investigation]] — original DB/hosting/match-crediting investigation
- [[tasks/profile-schema-contract]] — shared profile payload and migration contract
- [[tasks/yandex-identity-plumbing]] — server-visible Yandex ID transit path
- [[tasks/profile-server-skeleton]] — T4a liveness skeleton
- [[tasks/profile-api-url-config]] — T4b public URL contract
- [[tasks/profile-onbox-stack-gate]] — T4e2 on-box compose/Postgres stack
- [[tasks/profile-server-bring-up-runbook]] — T4i live host bring-up
- [[tasks/profile-game-server-deploy-env]] — T4h game-server env propagation
- [[tasks/profile-backend-db-api]] — T5 DB/API implementation
- [[tasks/personal-data-compliance-investigation]] — legal/compliance investigation for identity persistence
- [[tasks/profile-hash-player-ids]] — hashed identity key implementation
- [[decisions/profile-storage-strategy]] — T5 typed-column storage decision
- [[decisions/personal-data-152fz]] — compliance decision for raw Yandex IDs
