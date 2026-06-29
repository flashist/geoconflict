# 152-ФЗ Personal-Data Compliance

**Date**: 2026-06-28
**Status**: accepted

## Context

Sprint 4 profile storage persists real user data such as Yandex player IDs and display names. The first 152-ФЗ investigation briefly concluded that storing an irreversible keyed hash of the Yandex ID could avoid Roskomnadzor notification and consent obligations.

Sources: `ai-agents/knowledge-base/personal-data-152fz-findings.md`, `ai-agents/tasks/done/s4-personal-data-compliance-investigation.md`, `ai-agents/tasks/cancelled/s4-profile-hash-player-ids.md`

## Decision

The hash-based avoidance conclusion is invalidated. Further investigation found that hashing the Yandex ID does **not** remove the 152-ФЗ notification/consent obligation; it adds development and support complexity without the expected legal benefit.

The pseudonymization implementation task is cancelled and PR #127 was reverted. The 152-ФЗ track is deferred out of Sprint 4 to the no-sprint backlog as `ai-agents/tasks/backlog/compliance-152fz-notification-consent.md`, with risk explicitly accepted by Mark on 2026-06-28. The likely remaining work is Roskomnadzor operator notification, consent/privacy-policy coverage, and handling related PII surfaces such as display names and email subscription.

## Consequences

- Sprint 4 no longer treats 152-ФЗ as a profile-store go-live gate.
- The accepted risk is that real PII may persist in production before notification/consent work is complete.
- Future compliance work should start from a v2 findings document; the original `personal-data-152fz-findings.md` is retained only as an overturned decision record.
- Hashing raw Yandex IDs is not the current profile-store plan. If revived, it needs a technical reason independent of the invalidated legal rationale.
- Related PII surfaces include profile display names, Yandex IDs, possible archival fields such as clan tags, and the email subscribe surface.

## Related

- [[decisions/sprint-4]]
- [[decisions/sprint-backlog]]
- [[decisions/cancelled-tasks]]
- [[systems/project-operations]]
- [[systems/player-profile-store]]
- [[systems/player-infrastructure]]
- [[tasks/personal-data-compliance-investigation]]
- [[tasks/profile-backend-db-api]]
- [[tasks/profile-match-end-crediting]]
