# Task — Feedback Popup: Remove the Email/Contact Field (152-ФЗ)

## ID
0046

## Sprint
Sprint 4 (independent — no dependency on the citizenship/payments track).

## Priority
Medium-High — legal/compliance-driven (152-ФЗ personal-data minimization). The change itself is
small and low-risk; the value is reducing personal-data collection exposure. Safe weekend deploy.

## Status
🔲 Backlog

## Owner
fkit-coder

## Experiments
❌ Excluded — compliance change, ships to all players. Not A/B-able.

---

## Why

The in-game feedback popup collects an **optional free-text contact field** — its placeholder is
literally *"Email or Telegram (optional)"* (`feedback_modal.contact_placeholder`). Collecting an
email / personal contact makes that field personal data under **152-ФЗ**, which brings operator-
notification and consent obligations we do not want to take on for an incidental support field.

Feedback works fine without it (reports already carry automatic device/build/match context, and
players who want a reply can reach the Telegram/VK channels). The cleanest compliance move is to
**stop collecting the field entirely** — remove it from the UI, the request payload, the server
schema, and the delivered message. This is data minimization: the safest 152-ФЗ posture for a
field we don't strictly need.

---

## Scope

Three files, full removal of the `contact` field end-to-end:
- **Client:** `src/client/FeedbackModal.ts`
- **Server:** `src/server/Master.ts` (the `/api/feedback` handler)
- **Localization:** `resources/lang/en.json` **and** `resources/lang/ru.json`

The `StaleBuildModal` reuses `FeedbackModal`, so it loses the contact field too — expected and fine.

---

## What to build (removal guidance)

### 1. Client — `src/client/FeedbackModal.ts`
- Remove the `@state() contact = "";` field (line ~34).
- Remove the contact `<input>` render block (the field bound to `feedback_modal.contact_placeholder`,
  ~lines 368–375).
- Remove `contact: this.contact || undefined` from the `/api/feedback` payload (~line 297).
- Remove the two `this.contact = "";` resets (~lines 193, 212).
- Confirm no remaining reference to `contact` in the file after removal.

### 2. Server — `src/server/Master.ts`
- Remove `contact: z.string().max(200).optional()` from `FeedbackSchema` (~line 203). **This is the
  key server change** — Zod strips unknown keys on parse, so once `contact` is out of the schema, a
  stale client that still sends it has the value dropped (not forwarded, not logged via the
  `JSON.stringify(d)` fallback at ~line 315).
- Remove the `Contact` field from the webhook embed (~line 254) and from the Telegram message body
  (~line 284) so neither delivery path renders it.

### 3. Localization — both files in sync
- Remove `feedback_modal.contact_placeholder` from `resources/lang/en.json` (~line 317) **and**
  `resources/lang/ru.json` (~line 321). Remove any contact label key in the same `feedback_modal`
  block if one exists. (Do not touch `stale_build.contact_link` / `contact_support` — those are
  unrelated "contact support" links, not the data field.)

---

## Out of scope (do NOT touch here)

- **The Email Subscription Modal** (`s4-email-subscribe-task.md`) — a *separate* feature whose entire
  purpose is collecting email. Same 152-ФЗ concern applies but the remediation is different (it can't
  just drop the field). Tracked as a separate decision — see **Related / flags** below. Not part of
  this task.
- Other PII surfaces (profile store Yandex IDs/names) — owned by the profile-store + compliance tracks.
- The automatic feedback context (device/build/match IDs) — not personal contact data; leave intact.

---

## Tests

- If a `/api/feedback` server test exists (`tests/server/`), update it so it no longer expects/sends
  `contact` and still passes for a valid bug/suggestion/other submission.
- Confirm a feedback submit with category + text (no contact) validates and delivers.

---

## Verification (live)

1. **UI:** the feedback popup (start screen, battle screen, and the stale-build reuse) no longer
   shows the email/contact input. Category + free text + Send only.
2. **Delivery:** submit a test report; confirm the delivered Telegram message **no longer contains a
   Contact line**, and the report still arrives with its automatic context.
3. **No regression:** `Feedback:Submitted:<screen>` still fires as before (removal does not change
   analytics events — **no new analytics event is needed**; the gate here is the live UI + delivered-
   payload check, not an analytics dimension).
4. **Stale client safety:** (optional) a payload that still includes `contact` is accepted and the
   value is dropped server-side (schema strip), not forwarded.

---

## Related / flags (for Mark)

- **⚠️ The Email Subscription Modal collects email too.** Under the same 152-ФЗ logic it's a *larger*
  exposure than this incidental field, but it can't be fixed by removal (email is the feature). It
  needs a product call: drop the feature, or add a proper consent flow. **Recommend folding it into
  the `s4-personal-data-compliance-investigation.md` scope** so the lawyer's findings cover all PII
  collection points (profile store + feedback contact + email-subscribe), rather than fixing them
  piecemeal. This feedback-field removal is safe to ship now without waiting on that investigation
  (removing data collection is always compliant); the email-subscribe decision should wait for findings.
- Connects to `s4-personal-data-compliance-investigation.md` (the 152-ФЗ track already in Sprint 4).
- Pure client + server + localization change; no `src/core/`, no schema/desync surface.
