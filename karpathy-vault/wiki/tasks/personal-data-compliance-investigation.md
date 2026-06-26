# Personal-Data Compliance Investigation

**Source**: `ai-agents/tasks/done/s4-personal-data-compliance-investigation.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / 152-ФЗ

## Goal

Determine whether storing Yandex player IDs and display names in the profile store requires Roskomnadzor operator notification, explicit consent/privacy-policy coverage, or a different engineering design.

## Key Changes

- Tracked 152-ФЗ as a legal/compliance track distinct from VAT/tax and licensing.
- Recorded the interim gate that real production profile data should not persist raw Yandex IDs plus display names before findings resolve notification and consent requirements.
- Produced `ai-agents/knowledge-base/personal-data-152fz-findings.md` and locked the engineering decision with Mark on 2026-06-26.

## Outcome

The investigation resolved the identity-data gate by choosing pseudonymization: store an irreversible, unique, keyed hash of the Yandex ID and never persist the raw ID. That avoids/reduces the notification and explicit-consent obligation for the identity data if the engineering requirements are honored. Display names, minors, written legal sign-off, email-subscription PII, and other identifying fields still need explicit treatment before relying on this as full production clearance.

## Related

- [[decisions/personal-data-152fz]] — accepted pseudonymization decision
- [[tasks/profile-hash-player-ids]] — implementation task created from the findings
- [[decisions/sprint-4]] — profile-store production gate and citizenship sequence
- [[systems/player-profile-store]] — system that stores the pseudonymized identity
- [[tasks/email-subscribe-modal]] — separate email PII sink that the findings call out
