# Task 8d-B — Personal Inbox (Direct Messages to Citizens)

## Priority
Sprint 4 — ships after player profile store is implemented. Depends on citizenship infrastructure being in place.

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
| Citizenship earned (50 matches) | "You've earned Geoconflict Citizenship!" | "You've completed 50 matches and earned citizenship. You now have access to [citizen benefits]." |
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

- **8d-A** (global announcements) must be live — personal inbox is a tab inside that popup
- **Player profile store** (Sprint 4 infrastructure) must be live — messages are stored there
- **Citizenship core tasks** — earned/purchased triggers need citizenship logic in place to hook into
- **Name change task** — approval/rejection triggers need name change flow in place

## Notes

- Citizen gate must be verified server-side on every `/player/messages` call — do not rely on client-side citizenship state
- V1 has no pagination — fetch all messages. Add pagination if message counts grow significantly (unlikely in Sprint 4)
- The `POST /admin/player-message` endpoint should be internal only — not exposed publicly. Rate-limit or require a server-side secret to prevent abuse.
- Future use cases (tournament invitations, moderation notices, targeted announcements) are out of scope for Sprint 4 but the schema and endpoint support them already
