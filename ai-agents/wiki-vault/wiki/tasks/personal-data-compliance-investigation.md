# Personal-Data Compliance Investigation

**Source**: `ai-agents/tasks/done/0186-personal-data-compliance-investigation/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / 152-ФЗ

## Goal

Investigate whether storing Yandex player IDs, display names, XP/progression, and future purchase entitlements triggers Russian 152-ФЗ obligations beyond data residency.

## Key Changes

- Captured the legal/compliance question as a distinct track from VAT/tax and OpenFront/IP licensing.
- Identified three obligation areas: RU data residency, Roskomnadzor operator notification, and lawful basis/consent plus privacy-policy coverage.
- Initially treated the investigation as a gate before production profile-store persistence of real Yandex IDs and display names.
- Produced findings in `ai-agents/knowledge-base/personal-data-152fz-findings.md`, later marked invalidated after the hash-based conclusion was overturned.

## Outcome

The investigation is complete, but its first decision was superseded. The final current state is that 152-ФЗ remains unresolved: hashing Yandex IDs does not remove the notification/consent obligation, the hash implementation task is cancelled, and the legal/engineering compliance work moved to the no-sprint backlog with risk explicitly accepted for Sprint 4.

## Related

- [[decisions/personal-data-152fz-compliance]]
- [[decisions/sprint-4]]
- [[decisions/sprint-backlog]]
- [[systems/player-profile-store]]
- [[tasks/profile-backend-db-api]]
