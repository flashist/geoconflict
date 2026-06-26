# Profile Store Hashed Player IDs

**Source**: `ai-agents/tasks/done/s4-profile-hash-player-ids.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / compliance-driven profile-store gate

## Goal

Pseudonymize profile-store identity by storing an irreversible server-keyed hash of the Yandex player ID instead of persisting the raw Yandex ID at rest.

## Key Changes

- Added server-side keyed hashing for raw Yandex IDs using a secret pepper held outside git and outside the client bundle.
- Moved the profile key from raw `yandex_player_id` to the hashed identity value.
- Kept the raw ID as a transit-only client-to-server value from the Yandex SDK path, with the persistence boundary hashing and discarding it.
- Carried the compliance requirement that raw IDs must not appear in DB rows, logs, backups, archival, or error payloads.

## Outcome

The old 152-ФЗ production gate moved from "file Roskomnadzor notification and build consent first" to "pseudonymize identity and verify no raw ID at rest." The code side is done and reviewed, but production go-live still requires an on-box raw-ID grep after a real login/match path. Display-name handling remains a separate open compliance question.

## Related

- [[decisions/personal-data-152fz]] — locked compliance decision behind the hashing task
- [[tasks/personal-data-compliance-investigation]] — investigation task that produced the hashing requirement
- [[tasks/player-profile-store-investigation]] — original profile-store investigation updated by the hashed-ID decision
- [[systems/player-profile-store]] — profile storage and identity architecture
- [[tasks/profile-backend-db-api]] — T5 database/API slice whose identity key was changed
- [[tasks/yandex-identity-plumbing]] — server-visible Yandex ID transit path
- [[decisions/sprint-4]] — current Sprint 4 gate and sequencing
