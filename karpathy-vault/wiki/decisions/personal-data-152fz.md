# Personal-Data 152-ФЗ Profile Identity Decision

**Date**: 2026-06-26
**Status**: accepted

## Context

The Sprint 4 profile store was designed to persist Yandex player IDs and display names for citizenship XP, paid entitlements, and future identity features. Under 152-ФЗ, storing raw identifying data could require Roskomnadzor operator notification, consent/privacy-policy coverage, retention/deletion handling, and special care for minors. Data residency was already satisfied by the RU profile VPS, but notification and consent were not.

Source: `ai-agents/knowledge-base/personal-data-152fz-findings.md`

## Decision

Persist an irreversible, deterministic, server-keyed hash of the Yandex player ID instead of the raw Yandex ID. The raw ID may transit from the Yandex SDK to the server over TLS because the client is where the SDK exposes it, but the backend must hash it at the trust boundary and avoid writing the raw value to DB rows, logs, backups, archival, or error payloads.

The hash must be keyed with a secret server-side pepper, not a plain SHA-style hash. The pepper is long-lived operational secret material: it must not be committed or bundled to the client, and rotation would re-key profiles.

## Consequences

- The profile-store production gate shifts from Roskomnadzor notification plus a consent flow for the raw ID to implementing the hash-keyed design and verifying no raw Yandex ID exists at rest.
- [[tasks/profile-hash-player-ids]] implements the code side; the remaining go-live check is an on-box raw-ID grep after a real login/match path.
- Display names are not solved by ID hashing. If the profile store persists display names, they may independently trigger personal-data handling requirements.
- Email subscription data, clan tags in future archival, minors, other identifying field combinations, and written legal sign-off remain follow-up compliance concerns.

## Related

- [[tasks/personal-data-compliance-investigation]] — investigation task that produced the decision
- [[systems/player-infrastructure]] — pre-S4/Sprint 4 audit that identifies adjacent PII paths
- [[tasks/player-profile-store-investigation]] — original profile-store investigation whose identity plan was revised
- [[tasks/profile-hash-player-ids]] — implementation of the hashed identity key
- [[systems/player-profile-store]] — storage system affected by the decision
- [[decisions/sprint-4]] — sprint gate and citizenship sequence
- [[tasks/email-subscribe-modal]] — separate email PII collection path
