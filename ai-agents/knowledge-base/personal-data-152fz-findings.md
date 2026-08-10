# 152-ФЗ Personal-Data Compliance — Investigation Findings & Decision

> **⛔ INVALIDATED 2026-06-28 — DO NOT RELY ON THIS DOCUMENT.** Further investigation found the core conclusion below is **wrong**: hashing the Yandex ID does **NOT** remove the 152-ФЗ notification/consent obligation. It only added support/development complexity for no legal benefit. The implementation task is **cancelled** (`ai-agents/tasks/cancelled/s4-profile-hash-player-ids.md`, PR #127 reverted). **152-ФЗ is unresolved; the compliance work is deferred to the backlog sprint** (`ai-agents/tasks/backlog/0048-compliance-152fz-notification-consent/brief.md`) with **risk explicitly accepted** (Mark, 2026-06-28) — likely Roskomnadzor notification + consent. Everything below is kept only as a record of the overturned decision.

**Status:** ~~Investigation complete. Decision locked with Mark 2026-06-26.~~ **Overturned 2026-06-28 — see banner above.**
**Source task:** `ai-agents/tasks/done/s4-personal-data-compliance-investigation.md`
**Implementation task (cancelled):** `ai-agents/tasks/cancelled/s4-profile-hash-player-ids.md`

---

## Decision (one line)

Instead of storing the **raw Yandex Games player ID** (a directly-identifying personal-data field),
the profile store will persist only an **irreversible, unique hash** of it. Pseudonymizing the
identity at ingestion means the stored data cannot be reversed to a Yandex account — which the
investigation concluded **aligns with 152-ФЗ** and materially reduces/removes the Roskomnadzor
operator-notification and explicit-consent obligations that storing the raw ID would have triggered.

---

## Background

The Player Profile Store was designed to persist real users' **Yandex player IDs + display names**
(see `0013-player-profile-store-impl`). Under 152-ФЗ that persistence triggered up to three
obligations:

| Obligation | Pre-decision status |
|---|---|
| Data residency (RU soil) | ✅ Already satisfied — Postgres on the RU profile VPS |
| Roskomnadzor operator notification | ❌ Would be required if storing raw identifying PII |
| Lawful basis / user consent + privacy policy | ❌ No consent flow exists |

The investigation's goal was to determine whether/when notification + consent are required. The
outcome was to **avoid the obligation by design** rather than satisfy it operationally.

---

## The decision in detail

1. **The raw Yandex player ID is never stored at rest** — not in the DB, logs, backups, or archival.
2. The profile store keys each profile on an **irreversible hash** of the Yandex player ID that is:
   - **Deterministic** — the same Yandex ID always produces the same hash, so a returning player is
     recognized across sessions and devices (required for XP crediting and citizenship to work).
   - **Irreversible / non-correlatable** — computed with a **secret, server-side key** so it cannot
     be brute-forced or rainbow-tabled back to a Yandex ID, and cannot be cross-referenced against
     any other system's hashes of the same IDs.
3. The result is a **pseudonym with no practical path back to the natural person**, so the stored
   identifier is not the directly-identifying personal data the obligation targets.

### Why the investigation concluded this aligns with 152-ФЗ
By removing the reversible identifier, the profile store no longer persists directly-identifying
personal data. The legal consultation concluded this removes/reduces the operator-notification and
explicit-consent obligations for the identity data, while data residency remains satisfied (RU box).

> **Scope caveat — read before relying on this.** This conclusion holds **only** if (a) the
> engineering requirements below are honored (a genuinely irreversible, keyed hash; raw ID never
> persisted), and (b) the **open items** below — chiefly the **display name** — are resolved. Hashing
> the ID does **not** by itself address other stored fields that may be personal data.

---

## Engineering requirements the legal conclusion depends on

These are non-negotiable for the pseudonymization to be legally meaningful (carried into the
implementation task):

- **Keyed hash, not a plain hash.** Use an HMAC-style construction with a **secret pepper** held only
  server-side (secret file / env on the backend, never in git, never on the client). A bare
  `sha256(yandex_id)` is reversible by brute force over the ID space and is **not acceptable**.
- **Raw ID hashed at the server trust boundary and discarded** — it may transit client→server in the
  join payload (TLS-protected; the client is the only place the Yandex SDK exposes it), but it is
  hashed server-side and **never written anywhere at rest**.
- **Stable pepper.** Rotating it re-keys every hash and orphans all existing profiles, so it is a
  long-lived secret with its own backup/rotation policy.

---

## Open items — must confirm before profile-store production go-live

1. **Display name (and any other directly-identifying field) — biggest open item.** The original
   obligation cited "Yandex IDs **+ display names**." Hashing the ID does nothing for a stored display
   name, which is itself personal data. **Confirm with the lawyer:** is the display name persisted at
   all? If yes, either it must be excluded from storage, treated under the same avoidance approach, or
   it independently re-triggers the notification/consent obligation. **Do not treat the ID-hashing
   decision as full 152-ФЗ clearance until this is resolved.**
2. **Minors.** Confirm the pseudonymized approach changes (or doesn't) the under-age consent question
   the original task raised.
3. **Written sign-off.** Ensure the legal consultation's conclusion is captured in writing
   (consultant name/date) so the decision has a defensible record.
4. **Other stored fields.** Confirm XP / entitlements / `persistent_id` are not directly identifying
   in combination.

---

## Effect on sequencing — the gate shifts

- The 152-ФЗ **legal/investigation gate is resolved** by this decision (no Roskomnadzor notification
  + consent flow needed for the *hashed* identity, pending the open items).
- The new gate on **profile-store production go-live** becomes **implementing the hashing**
  (`s4-profile-hash-player-ids.md`). Real raw IDs must not be persisted, so hashing must be in place
  **before T6 credits real players in production**. Because the profile box (T4) and DB/API (T5) just
  went live but have little/no real data yet, **this is the cheap moment to make the change** —
  before real profiles accumulate.

---

## Notes
- This supersedes the interim "gating the profile-store prod launch" stance in the investigation task
  with a concrete, locked path: pseudonymize via hashing.
- No secrets, peppers, endpoints, or PII appear in this document or the implementation brief.
