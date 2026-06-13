# Task — Personal-Data Compliance (152-ФЗ): Roskomnadzor Operator Notification + Consent Flow

## Sprint
Sprint 4 (parallel legal track — independent of the topology/engineering work).

## Type
**Investigation-first.** Primary effort is legal consultation (personal action, like the VAT
task), with a downstream engineering component (consent flow) scoped only **after** findings.

## Priority
High-attention, investigation-first. Not blocking the *topology/engineering* work, but — per the
interim stance below — treated as **gating the Player Profile Store production go-live** (and
therefore the citizenship launch) until a lawyer says otherwise. The profile store hasn't shipped,
so there is runway: **start the legal consultation now** so it doesn't become the long pole.

## Experiments
❌ Excluded — legal/compliance obligation, not a player-facing A/B.

---

## Context

Flagged by the technical specialist (2026-06-13), to track rather than silently assume:

> "You're not yet a registered Roskomnadzor data operator and don't have a consent flow. That's a
> separate product/legal task, independent of topology. Residency is already satisfied (everything's
> on RU soil); the operator-notification + user-consent obligation rides along with storing Yandex
> IDs + display names."

Under Russian law **152-ФЗ "On Personal Data,"** processing personal data of Russian users triggers
up to three obligations:

| Obligation | Status |
|---|---|
| **Data residency** — store RU citizens' PII on RU soil (Art. 18.5) | ✅ Satisfied — Postgres on the RU game VPS (per the profile-store investigation) |
| **Operator notification** to Roskomnadzor (уведомление об обработке ПДн) | ❌ Not done — not a registered operator |
| **Lawful basis / user consent** (согласие на обработку ПДн) + privacy policy | ❌ No consent flow exists |

**Trigger:** the **Player Profile Store** persists Yandex player IDs + display names (the
`player_profiles` table from `s4-player-profile-store-impl.md` / the profile-store investigation).
That persistence of real users' PII is what makes the notification + consent obligation live. Until
the profile store ships to production with real data, the obligation is not yet active — which is
the runway that lets this be done properly first.

**This is a third, distinct legal track.** It is *not* covered by the already-cleared VAT/tax gate
(`s4-legal-vat-investigation.md`) or the in-progress IP/licensing track
(`s4-licensing-asset-audit.md` + the licensing-compliance posture). Confirmed untracked before this
task — no prior personal-data/Roskomnadzor coverage existed in `ai-agents/` or the wiki.

---

## Interim stance (locked with Mark, 2026-06-13)

- **Investigation-first; the lawyer's findings set the final gate.**
- **Until findings say otherwise, treat compliance as gating the profile-store *production*
  go-live** — do not persist real Yandex IDs + display names in production before operator
  notification is filed and a consent flow is live. Dev/test with internal or non-real data is fine.
- Because the profile store hasn't shipped, **begin the legal consultation immediately** so the
  gate clears in parallel with engineering rather than blocking the citizenship launch at the end.

---

## What needs to be done — legal investigation (personal action)

Mark + a Russian data-protection lawyer / consultant to determine:

1. **Scope of data.** Which stored fields are personal data under 152-ФЗ — Yandex player ID, display
   name, XP/progression, purchase entitlements — and which categories they fall into.
2. **Yandex platform coverage.** Whether Yandex Games' platform terms already designate Yandex as
   operator and/or cover consent for platform-provided identity data (a common shortcut for iframe
   games). This could materially reduce or change our notification/consent obligation — resolve it
   first, as it may shrink the rest.
3. **Operator notification.** Whether and when we must file the Roskomnadzor notification, and what
   it requires (purposes, data categories, retention period, declared security measures, who is the
   operator of record).
4. **Consent flow.** What lawful basis/consent the law requires for our processing: explicit consent
   vs. covered by Yandex auth; privacy-policy requirements; where and how consent must be presented,
   captured, and **recorded** (consent text version + timestamp); and what guests (no Yandex login)
   require, if anything.
5. **Minors.** Additional consent requirements for under-age players (the game has a young audience).
6. **Blocking relationship.** Whether storing PII *before* notification is permissible or whether
   notification/consent must precede the first production PII write — this produces the **final gate**
   that replaces the interim stance above.
7. **Retention & deletion.** User right-to-deletion and retention obligations, and how they interact
   with the profile store and the deferred S3-backed archival (`s4-archive-s3-backed-citizen-gated.md`).

**Deliverable:** findings written to `ai-agents/knowledge-base/personal-data-152fz-findings.md`,
then reviewed with Mark to lock the final gate.

---

## Deferred — engineering (scope ONLY after findings)

Do **not** detail these until the legal findings are in:

- **Consent capture UI + recording** — likely a privacy-policy + consent surface at/near Yandex
  login or first profile creation. Coordinate placement with the AGPL "Source Code" link already
  required by the licensing posture (both are footer/legal links near the existing OpenFront
  attribution).
- **Consent state in the profile store** — store consent given / consent-text version / timestamp;
  feed these fields into the `s4-player-profile-store-impl.md` schema so it's built in, not retrofit.
- **Deletion / retention support** — right-to-be-forgotten across the profile store and archival.

These become a follow-up implementation brief scoped from findings.

---

## Dependencies & sequencing

- **Interim-gates:** Player Profile Store production launch → and therefore the citizenship /
  paid-citizenship launch.
- **Feeds into:** `s4-player-profile-store-impl.md` (consent fields in schema),
  `s4-archive-s3-backed-citizen-gated.md` (retention/deletion).
- **Distinct from:** VAT/tax (cleared) and IP/licensing (separate, in-progress track).

---

## Verification / definition of done

1. Legal findings documented in the knowledge-base file and the **final gate reviewed with Mark**.
2. If notification is required: filed with Roskomnadzor and acknowledgement received.
3. If a consent flow is required: the engineering sub-task is scoped, implemented, and — per the
   analytics-as-shipping-gate rule — **consent capture is verified in production** (real users'
   consent records actually being written before/at first PII persistence).
4. No new analytics event is defined in this investigation task. If the consent flow needs funnel
   instrumentation, define it in the follow-up engineering brief against the canonical event enum —
   never inline an event string here.

---

## Notes
- Non-technical-primary (legal consultation), modeled on `s4-legal-vat-investigation.md`, but with a
  downstream engineering component the VAT task did not have.
- External timeline (lawyer consultation + any Roskomnadzor filing) can run days–weeks — the reason
  to start now while the profile store is still in backlog.
- No secrets, endpoints, or PII in this brief or its findings file.
