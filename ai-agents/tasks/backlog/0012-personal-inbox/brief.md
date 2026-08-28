# Task 8d-B — Personal Inbox (Direct Messages to Citizens)

## ID
0012

## Priority
Sprint 4 — buildable now against the local profile stack. Shipping it retires the no-op inbox seams
carried by `0017`, `0018`, and `0019`.

## Status
🚧 Blocked — built + reviewed (local scope) 2026-08-26; open pending the `0062`-gated Deferred Live Tail

*(Re-scoped 2026-08-23 by owner ruling — same "don't block on Yandex externals / local-first"
treatment as `0017`. The profile store dependency is satisfied **locally** (profile server +
Postgres via Docker; `RUN_DB_TESTS=1` integration path) and that is sufficient to build and verify
everything below. The prod side — `0062`: `PROFILE_INTERNAL_TOKEN` not forwarded, so no profile row
exists in production — gates only the **Deferred Live Tail** at the end of this brief, not the
build.)*

## Owner
fkit-coder

## Context

Citizens need a way to receive system notifications from the game — nickname review results, citizenship confirmations, and future administrative messages. This task adds a personal inbox tab inside the existing announcements popup (8d-A), visible only to citizens.

One-way only — players receive messages, they cannot reply.

---

## What to Build

### Personal inbox tab in announcements popup

Add a second tab to the announcements popup (8d-A must be live):
- **Global** tab — existing announcements (all players)
- **Personal** tab — direct messages (citizens only, requires authorization)

Non-citizens and guests see only the Global tab. The Personal tab is not shown, not greyed out — simply absent.

### Message storage

Messages are stored server-side in the player profile store (Sprint 4 infrastructure task). Minimum schema:

```
messages table:
  id          — unique message ID
  player_id   — Yandex player ID (foreign key to player profiles)
  title       — short message title
  body        — message body text
  sent_at     — timestamp
  read_at     — null if unread, timestamp when read
```

### Server endpoints

Three new endpoints:

**`GET /player/messages`** — fetch the citizen's messages, newest first. Requires Yandex player authorization. Returns array of message objects with read/unread state.

**`PATCH /player/messages/read`** — mark all messages as read (or pass specific IDs). Called when player opens the Personal tab. Updates `read_at` across all devices.

**`POST /admin/player-message`** — send a message to a specific citizen. Admin auth required. Called internally by other server flows (nickname review, citizenship grant) — not a public-facing UI in V1.

### Unread badge

The existing bell icon badge (8d-A) should also reflect unread personal messages. If either global announcements or personal messages have unread content, the badge appears. The badge count (if shown) should combine both.

### Initial message triggers (V1)

Personal messages are sent automatically as side effects of server-side events — no manual compose UI needed:

| Trigger | Message title | Message body |
|---|---|---|
| Citizenship earned (1,000 XP) | "You've earned Geoconflict Citizenship!" | "You've reached 1,000 XP and earned citizenship. You now have access to citizen benefits." |
| Citizenship purchased | "Welcome, Citizen!" | "Your citizenship purchase was successful. You now have access to [citizen benefits]." |
| Name change approved | "Your name change was approved" | "Your new display name '[name]' is now active." |
| Name change rejected | "Your name change request was rejected" | "Your requested name '[name]' was not approved — [reason]. You can submit a new request at any time." |

These are the only triggers in Sprint 4. The `POST /admin/player-message` endpoint supports future manual sends.

---

## What "Done" Looks Like

- Citizens see a Personal tab in the announcements popup
- Non-citizens and guests see no Personal tab
- Messages load from server and display correctly, newest first
- Read state persists across devices — reopening on a different device shows the same read/unread state
- Unread badge accounts for unread personal messages
- Citizenship earned/purchased automatically sends the appropriate message
- Name change approval/rejection automatically sends the appropriate message (hooks added to those flows)
- `POST /admin/player-message` endpoint works and is documented

## Dependencies

*(Restated 2026-08-23, owner-ruled. Nothing here requires Yandex externals or production.)*

- **8d-A** (global announcements) — ✅ Done; the popup this tab lives in exists.
- **Player profile store** — available **locally** (profile server + Postgres via Docker;
  `RUN_DB_TESTS=1`), and that is sufficient. Prod availability is `0062`'s concern → Deferred Live
  Tail.
- **Citizenship trigger seams** — the earned/purchased triggers already exist as **documented no-op
  seams**: `0019`'s post-grant hook (paid path) and the same-pattern seam `0017` wires (earned path).
  **This task's job is to fill those seams with real sends — shipping `0012` retires the no-ops in
  `0017`, `0018`, and `0019`.** It does not wait for the citizenship tasks to be live; the seams are
  the interface.
- **Name change task** — not started (board: TBD). Triggers 3–4 in the V1 table are **deferred**:
  build the send mechanism and `POST /admin/player-message` so the hooks are one call each, but the
  name-change wiring lands with that task, not this one.

## Deferred Live Tail — gated on `0062`; NOT part of the buildable scope

Execute once `0062` has shipped and a deploy has run:

1. Prod profile integration verified on (`0062`'s own verifications 2–3).
2. A real citizenship grant in prod produces the inbox message, visible in the Personal tab in the
   live Yandex iframe, and read-state persists across two devices/sessions against the prod DB.
3. Citizen gating confirmed against prod data (non-citizen sees no Personal tab).

⚠️ Same trap as `0017`: a local pass where the token *is* set proves the feature, not that prod
works. The task is not fully done — and must not be closed — until this tail runs.

## Notes

- Citizen gate must be verified server-side on every `/player/messages` call — do not rely on client-side citizenship state
- V1 has no pagination — fetch all messages. Add pagination if message counts grow significantly (unlikely in Sprint 4)
- The `POST /admin/player-message` endpoint should be internal only — not exposed publicly. Rate-limit or require a server-side secret to prevent abuse.
- Future use cases (tournament invitations, moderation notices, targeted announcements) are out of scope for Sprint 4 but the schema and endpoint support them already
- **Owner-ruled 2026-08-24 (from the `0017` review, residual R1):** filling the inbox no-op seams carries the obligation to harden BOTH post-commit hook call sites — `0017` `PlayerProfileRepository.afterCitizenshipEarned` and `0019` `PaymentsRepository.afterPaidPurchaseGranted` — wrap/guard so a throwing hook cannot misreport a durable grant as a wire error (reference: `0017` review.md residual R1)
