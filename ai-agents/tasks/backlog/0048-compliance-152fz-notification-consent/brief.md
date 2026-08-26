# Task — 152-ФЗ Personal-Data Compliance: Roskomnadzor Notification + Consent Flow

## ID
0048

## Sprint
**Backlog (no sprint home).** Deferred out of Sprint 4 on 2026-06-28 (see Risk note). This was the
Sprint 4 legal gate on profile-store production go-live; that gate is **deliberately lifted for
Sprint 4** and the work re-homed here.

## Type
Investigation-first — legal consultation primary, with a downstream engineering consent flow scoped
**only after** findings. Same shape as the cleared `0128-legal-vat-investigation`.

## Priority
High-attention but deliberately deferred. The obligation is real and **unresolved**; Sprint 4
proceeds without it by accepted risk. Resolve before scaling and, ideally, before significant
real-PII volume accumulates.

## Status
🔲 Backlog

## Owner
fkit-producer

---

## Background — what this is and what was already tried

- The Player Profile Store persists real users' **Yandex player IDs + display names**, which triggers
  **152-ФЗ** obligations: Roskomnadzor **operator notification** + a **user-consent flow** + privacy
  policy. Data residency (Art. 18.5) is already satisfied (Postgres on the RU profile VPS).
- Sprint 4's first investigation (`0186-personal-data-compliance-investigation`, done) concluded we
  could **avoid** the obligation by pseudonymizing the Yandex ID via an irreversible hash.
- **That conclusion was overturned (2026-06-28):** hashing does **not** remove the notification/
  consent obligation — it only added support/development complexity for no legal benefit. The hashing
  task (`0187-profile-hash-player-ids`) is **cancelled** (PR #127 reverted) and the findings doc
  (`ai-agents/knowledge-base/personal-data-152fz-findings.md`) is **INVALIDATED**.
- **Net:** we are back to the original obligation — operator notification + consent — unresolved.

---

## ⚠️ Risk note — deferral with explicitly accepted risk (Mark, 2026-06-28)

This task is **deliberately deferred to the backlog**, and Sprint 4 (profile-store production go-live
and citizenship) proceeds **without 152-ФЗ resolved**. Concretely: **real personal data (Yandex IDs +
display names) will be persisted in production before an operator notification is filed and before a
consent flow exists.** Mark has **explicitly accepted this risk** (2026-06-28, "we fully understand
all the risks"). Recorded here so the deferral is a conscious, documented decision — not an oversight.

---

## What needs to be done — legal investigation (personal action)

Mark + a Russian data-protection lawyer/consultant to determine:

1. **Scope of data.** Which stored fields are personal data under 152-ФЗ — Yandex player ID, display
   name, XP/progression, purchase entitlements — and their categories.
2. **Yandex platform coverage.** Whether Yandex Games' platform terms already designate Yandex as
   operator and/or cover consent for platform-provided identity data (could shrink the obligation).
3. **Operator notification.** Whether/when to file the Roskomnadzor notification and what it requires
   (purposes, data categories, retention, declared security measures, operator of record).
4. **Consent flow.** Lawful basis/consent required; privacy-policy requirements; where/how consent is
   presented, captured, and **recorded** (consent text version + timestamp); what guests require.
5. **Minors.** Additional consent for under-age players (the game has a young audience).
6. **Blocking relationship.** Whether storing PII *before* notification is permissible — this sets the
   real go-live gate (and the size of the accepted risk above).
7. **Retention & deletion.** Right-to-deletion + retention duties, and interaction with the profile
   store and the deferred S3-backed archival (`0030-archive-s3-backed-citizen-gated`).
8. **Email Subscription Modal (in scope — owner-ruled 2026-08-21).** Whether the email-subscribe
   feature (collects email by design; currently disabled by experiment flag) can lawfully run: what
   consent, privacy-policy, retention, and deletion obligations attach — or whether the feature
   should be dropped. Includes any emails already collected (delivered to Telegram) if the flag ever
   ran on in prod.

**Deliverable:** findings → `ai-agents/knowledge-base/personal-data-152fz-findings-v2.md` (the v1
findings are invalidated), reviewed with Mark to lock the real gate.

---

## Carry-forward PII surfaces (resolve as part of this — these were orphaned by the cancellation)

- **Display name** — directly identifying; persisted in the profile store; not addressed by anything.
- **Email Subscription Modal** — collects email by design; currently **disabled (experiment flag
  off)**, so dormant. Must not be re-enabled without a consent path. If the flag ever ran *on* in
  prod, already-collected emails (in Telegram) are a retention/deletion question.
  **Folded into this task's scope (owner-ruled 2026-08-21; see item 8 above):** during
  `0046-feedback-remove-contact-field` (done) the modal was flagged as a **larger** 152-ФЗ exposure
  than the removed feedback contact field — it cannot be fixed by removal (email *is* the feature),
  so the drop-vs-consent-flow product call waits for this task's findings. Rejected alternatives:
  a separate task; dropping the feature now.
- *(The feedback popup contact field is being removed separately — `0046-feedback-remove-contact-field`
  — and is out of scope here.)*

---

## Deferred — engineering (scope ONLY after findings)

- **Consent capture UI + recording** — privacy-policy + consent surface at/near Yandex login or first
  profile creation; consent given / version / timestamp fed into the profile-store schema.
- **Deletion / retention support** — right-to-be-forgotten across the profile store + archival.

---

## References
- Cancelled approach: `ai-agents/tasks/cancelled/0187-profile-hash-player-ids/brief.md`
- Invalidated findings (v1): `ai-agents/knowledge-base/personal-data-152fz-findings.md`
- Original Sprint 4 investigation (done, conclusion overturned): `ai-agents/tasks/done/0186-personal-data-compliance-investigation/brief.md`
- Model: `0128-legal-vat-investigation`

## Notes
- No secrets, endpoints, or PII in this brief or its findings file.
- External timeline (lawyer + any Roskomnadzor filing) runs days–weeks; that, plus the accepted risk,
  is why it's deferred rather than blocking Sprint 4.
