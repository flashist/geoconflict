# 152-ФЗ Personal-Data Compliance

**Date**: 2026-06-28
**Status**: accepted

## Context

Sprint 4 profile storage persists real user data such as Yandex player IDs and display names. The first 152-ФЗ investigation briefly concluded that storing an irreversible keyed hash of the Yandex ID could avoid Roskomnadzor notification and consent obligations.

Sources: `ai-agents/knowledge-base/personal-data-152fz-findings.md`, `ai-agents/tasks/done/s4-personal-data-compliance-investigation.md`, `ai-agents/tasks/cancelled/s4-profile-hash-player-ids.md`

## Decision

The hash-based avoidance conclusion is invalidated. Further investigation found that hashing the Yandex ID does **not** remove the 152-ФЗ notification/consent obligation; it adds development and support complexity without the expected legal benefit.

The pseudonymization implementation task is cancelled and PR #127 was reverted. The 152-ФЗ track is deferred out of Sprint 4 to the no-sprint backlog as task `0048` (`ai-agents/tasks/backlog/0048-compliance-152fz-notification-consent/brief.md`), with risk explicitly accepted by Mark on 2026-06-28. The likely remaining work is Roskomnadzor operator notification, consent/privacy-policy coverage, and handling related PII surfaces such as display names and email subscription.

**Scope grown by owner ruling (2026-08-21):** the **email-subscribe modal** is folded into `0048`'s scope as an explicit item — whether the feature (collects email by design; currently disabled by experiment flag) can lawfully run: consent, privacy-policy, retention, and deletion obligations, or whether it should be dropped, including any emails already collected via Telegram delivery if the flag ever ran on in prod. The trigger was task `0046` (feedback contact-field removal) flagging the modal as a **larger** 152-ФЗ exposure that cannot be fixed by removal — email *is* the feature. Rejected alternatives: a separate task; dropping the feature now.

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
- [[systems/project-brief]] — the accepted-risk deferral stated as a project constraint
- [[decisions/adr-103-identity-trust-seam]] — the identity decision that also rejects the hashing approach
- [[tasks/feedback-remove-contact-field]] — shipped data minimization: the feedback contact field removed under this track's logic; the email-subscribe surface flagged into this scope
- [[tasks/email-subscribe-modal]] — the email-collecting surface folded into task `0048`'s scope by the 2026-08-21 ruling
- [[tasks/yandex-payments-implementation]] — the purchase-receipt FK made erasure-cascade-safe (`ON DELETE SET NULL`) with this track in mind
