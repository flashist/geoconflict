# Add the Player's Stable Id to the In-Game Feedback Message That Reaches Telegram (task 0509)

**Source**: `ai-agents/tasks/done/0509-add-the-players-stable-id-to-the-in-game-feedback-message-that-reaches-telegram/brief.md` (`plan.md`, `worklog.md`, `review.md` in the same folder read as evidence)
**Status**: done (agent-closed — not owner-verified) — closed 2026-10-28; committed in `2aa3cefb`, **not deployed** (`git tag --contains 2aa3cefb` → none, checked 2026-10-28)
**Sprint/Tag**: Sprint 9, rank 36 (append rank, flagged) — from the 2026-10-25 lost-citizenship incident / task `0509` / owner `fkit-coder`

> ✅ **Closed 2026-10-28** via `/fkit-task-done` by a spawned `fkit-producer` at the CLOSE step of
> `/fkit-sprint-ship-loop` (driven by `fkit-lead`). Built on the owner-approved plan. Stateful review 1 round — R1
> (medium) fixed; ledger `closed-out`; one accepted residual (the raw Yandex id in Telegram, by owner ruling). Full
> `npm test` green **5435/5435 on a re-run** — run 1 had one `socket hang up` in
> `tests/profile-server/LoginRoutes.test.ts` (untouched by this task; known supertest-flake family — likely, not
> certain; no SIGSEGV). Live check: task `0518` (`🔲 Backlog`, Sprint 9).

## Goal

The 2026-10-25 report from the affected player came through the in-game feedback form with only his current in-game
name, which is not unique — finding his records took a manual hunt (`0502`). Put a stable id in every feedback report
so the next case goes straight to the right profile record. Hub:
[[decisions/incident-2026-10-25-lost-citizenship-player-id-change]].

## Key Changes

- **The id chosen: the player's raw Yandex id** (`getUniqueID()`, read through `FlashistFacade.getYandexUniqueId()`),
  sent by the client and shown on its own labelled line, *"client-reported, unverified"*. Owner rulings 2026-10-28,
  relayed: **"Raw Yandex id"** (option text: *"The id itself in Telegram. Simplest lookup; a real platform id sits in a
  third-party chat."*), then **"Approve plan (Recommended)"**. A short fingerprint (less exposure) and a server-side
  lookup were the options not taken.
- **ADR-113 §3 is untouched** — the internal player id is not involved anywhere; the client sends only the platform id
  it already holds, as `POST /v1/login` already does. A dated **clarification note** was added to ADR-113: its
  Consequences gain *"Yandex ids leave request URLs, logs and Telegram operator commands"* never covered feedback
  messages. See [[decisions/adr-113-internal-player-id]].
- **Code:** `src/core/FeedbackPlayerReference.ts` (new — the id pattern, printable ASCII without spaces, 1–128 chars,
  and a `yandex` / `guest` / `unavailable` schema); `src/client/FeedbackPlayerReference.ts` (new —
  `resolveFeedbackPlayerReference`, never rejects; an id off the pattern or not a string becomes `unavailable`, so a
  real client never gets a 400); `src/client/FeedbackModal.ts` adds `playerReference` to the payload;
  `src/server/Master.ts` (`/api/feedback` only) — optional field, so an older client still posts; a new `Player:` line
  in the Telegram message (id in code font) and a `Player` webhook field (`describePlayerReference`).
- **Guests** get the marker *"none — not logged in (guest)"*; a logged-in player whose id cannot be read gets *"none —
  logged in, but the id could not be read"* — never an empty value (strings matched in `describePlayerReference`,
  `src/server/Master.ts`, at `2aa3cefb`).
- **Where the raw id goes:** the Telegram feedback chat (by design); the webhook **only if one is ever set** (blank in
  production today, as relayed). **Not** in logs — the stdout fallback writes only the reference's kind; error lines
  carry no message content. **Not** in analytics — no event changed. The session token is never read into the payload.
- **R1 fix:** a non-string id from the untyped SDK passed the pattern by coercion (`undefined`, `12345`), which would
  have made the server 400 every logged-in player's feedback; the guard now checks `typeof … !== "string"` first, with
  a test.

## Outcome

- ⚠️ **Accepted trade-off (owner):** a real platform id now sits in a third-party chat. It is client-reported and can
  be forged — a lead, not proof (the `0424` "never an automatic merge" rule). Re-raise only if the id reaches another
  sink (logs, OTEL, analytics).
- ⚠️ **Not deployed.** It reaches players with the next game deploy (weekend slot unless urgent). The held-deploy
  caveat in `0518` — that a game deploy from `dev` also ships held `0488`/`0494`/`0495` client code — may be **out of
  date**: those were deployed 2026-10-27 per [[decisions/sprint-9]]; the producer flagged this as not checked.
- **Live check `0518`** (owner-run): send feedback logged in (Yandex id line) and as a guest (guest marker); watch for
  "id could not be read" on a logged-in player.
- How the owner maps an id to a profile record is in the task worklog (a read-only lookup, placeholders only) — not
  copied here.

## Related

- [[features/feedback-button]] — the form and route this changes
- [[decisions/adr-113-internal-player-id]] — §3 kept; Consequences bullet clarified 2026-10-28
- [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]] — the incident that prompted it
- [[tasks/lost-citizenship-cause-checks]] — task `0502`, the manual hunt this avoids next time
- [[tasks/one-player-message-popup]] — task `0507`, the name-matched popup from the same incident
- [[tasks/feedback-telegram-delivery-failure]] — task `0061`, the same Telegram delivery path
- [[decisions/sprint-9]] — the board (rank 36; live check `0518` at 43)
