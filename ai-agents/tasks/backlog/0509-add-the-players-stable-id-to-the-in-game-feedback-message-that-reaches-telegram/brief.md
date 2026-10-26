# Add the player's stable id to the in-game feedback message that reaches Telegram

## ID
0509

> ℹ️ **ID allocation, checked 2026-10-26 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/` was
> `0508` (filed earlier the same day); `0509`: no folder and no reference in `ai-agents/tasks/` or `ai-agents/sprints/`.

## Sprint
Sprint 9

> 📌 **Filed on an OWNER RULING of 2026-10-26**, given via `AskUserQuestion` in the `fkit-lead` session and relayed to a
> spawned `fkit-producer` (no owner channel; ADR-021/037). ⛔ Not producer precedent. The owner picked **"Yes, file it
> (Recommended)"** — option text: *"Small change; next report shows exactly who sent it. Sprint 9, nothing waits on it.
> Knock-on: none (checked)."* It follows the owner's earlier words: *"Btw, we might change that too and add the user id
> value to the feedback message too."*

## Priority
36

> ⚠️ Priority 36 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0507`**, because both come from the same incident and are small client/server
> changes; nothing waits on it. Appended after the board's highest rank (35), never inserted (ADR-035); no row
> renumbered.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

- The in-game feedback form (`src/client/FeedbackModal.ts` → `POST /api/feedback` in `src/server/Master.ts`) posts to
  Telegram (and to the optional webhook) with the category, text and the player's **current in-game name** only.
- On 2026-10-25 **the affected player** reported his paid citizenship and nickname gone. All we had to find him was a
  name, which is not unique. Finding his records took a manual hunt (`0502`), and reaching him needs a name-matched
  popup (`0507`).
- With a stable id in each report, the next case goes straight to the right profile record.

### Constraints the plan must respect

- **ADR-113 §3:** the internal player id is **never sent to or accepted from a client**, and **no public route accepts
  a player id.** `/api/feedback` is a public route. So the client cannot send the internal id; options the plan weighs:
  - the platform id the client already has (Yandex `getUniqueID()`), which the owner can map to a record through
    `player_identities`;
  - a short, non-reversible fingerprint of it (enough to match in the database, less exposure in Telegram);
  - a server-side lookup from the player's session, if the plan finds a way that keeps ADR-113 §3 intact.
- **Never a secret token.** The session token (`Authorization: Bearer`) is a credential and must not be sent to
  Telegram, logged, or put in the message.
- **Telegram is a third-party chat.** Whatever id goes there is personal data in someone else's system. The plan states
  what is sent, why it is the least that still identifies the player, and that the owner accepts it.
- **Guests and failed logins** have no stable id: the message says so plainly (e.g. "guest" / "not logged in"), never an
  empty or misleading value.
- **Client-supplied = unverified.** Whatever the client sends can be forged. The message labels it as the id the client
  reported; the owner treats it as a lead, not proof (matching the `0424` "never an automatic merge" rule).

## What to build

1. The feedback request carries the stable id the plan chooses (or the guest marker). Schema change in the `/api/feedback`
   Zod schema, optional field, so an older client still posts.
2. The Telegram message and the webhook payload show it on its own line, labelled.
3. No id in any analytics event. No secret in the message, the server log line, or tests.

## Verification steps

1. Tests: a logged-in feedback post carries the chosen id; the Telegram text and webhook payload contain it on a
   labelled line; a guest post carries the guest marker; an old-format post (no field) is still accepted.
2. A test or grep shows the session token is never read into the feedback payload or message.
3. The plan's choice of id (raw platform id vs fingerprint vs server lookup) and the owner's approval are recorded in
   `worklog.md`, with the ADR-113 §3 reasoning.
4. `npm test` green (full run through the npm script — project lock).
5. Live (owner, after deploy): send one test feedback from the owner's test account; the Telegram message shows the id,
   and it maps to that account's record in a read-only check. Split into a verify task at close, per the build-vs-verify
   rule.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- ⚠️ **Ship-path conflict with the deploy hold (2026-10-26, owner ruled "Hold it" for `0506`).** The held client code
  (`0494`, `0495`, `0488`) is already committed on `dev`, so **any game deploy from `dev` ships it**. Shipping this before
  `0506` needs an owner choice: deploy from a branch without that code, switch the held features off in that build, or
  wait for `0506`. Not decided; the filing ruling's "Knock-on: none (checked)" did not cover this.
- **Related:** `0502` (the manual hunt this avoids next time), `0507` (name-matched popup), `0424`, ADR-113.
- **Ships by:** a game deploy — weekend slot unless urgent (owner rule); committed is not deployed.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
- **No secrets, no personal data** in tests, fixtures or this folder.
