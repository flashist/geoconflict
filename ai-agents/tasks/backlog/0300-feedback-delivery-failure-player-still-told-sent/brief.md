# Feedback delivery fails, but the player is still told "sent" — decide what they should see, then build it

## ID
0300

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021), on an OWNER RULING given
live in the `fkit lead` session via `AskUserQuestion` and relayed by `fkit-lead`:** asked *"When feedback
delivery fails (both tries), the player still sees 'sent' and the message is lost. File a follow-up
task?"*, the owner chose **"File a backlog brief"**. ⚠️ The owner ruled **that it be filed, on the
Backlog board**. They did **not** rule the player-facing behaviour, the rank or the owner field. ⛔ Not
producer precedent.

**Where it comes from.** [`0061`](../../done/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md)
(closed 2026-09-26, agent-closed) had a *What to build* step 4 — *"Decide whether silent failure is
acceptable … This is a product decision — put it to the owner"*. Its close records, as residual (4),
that **this was never put to the owner**. The delivery fix shipped via
[`0277`](../../done/0277-uptrace-alert-delivery-to-telegram/brief.md) ND-2 (the shared helper with
retry-once). The decision did not ship with it.

**What the code does today** (checked 2026-09-26 against the working tree):

- `/api/feedback` is `src/server/Master.ts:239-372`. It calls the shared `sendTelegramMessage` at
  `:336`. On `http_error` it logs `[feedback] telegram responded with <status>` (`:347-350`). On
  `network_error` it logs `[feedback] telegram delivery failed: <CODE>` (`:351-363`). Then, **whatever
  the outcome**, it answers `200 { ok: true }` (`:370`).
- The helper is `src/core/notifications/TelegramNotifier.ts:226-253`. It allows 10 s per attempt
  (`:130`) and makes a second attempt **only after a network-level failure** (`:239-252`).
- The client already has a failure path. `src/client/FeedbackModal.ts:296` throws on a non-OK
  response, and `:305-307` then shows `feedback_modal.error` (*"Failed to send. Please try again."*,
  already in `en.json`). **That path never runs for a delivery failure**, because the server never
  sends a non-OK status for one.

**Three corrections to the framing in the owner question.** None of them changes the ruling:

1. **"Both tries" covers only network failures.** If Telegram answers with a refusal (`http_error` —
   bad token, bad chat, 429), there is **no retry** (`TelegramNotifier.ts:236-238`). The message is lost
   after **one** attempt, and only the `responded with <status>` line records it.
2. **The optional webhook leg is silent too.** When `FEEDBACK_WEBHOOK_URL` is set, a failure there is
   only logged (`Master.ts:302-312`) and the route still answers 200. Whether prod sets it is **not
   known** (`.env*` is gitignored). Check this before designing, because it decides what "delivered"
   means when two channels are configured.
3. **Analytics counts lost feedback as submitted.** `FEEDBACK_SUBMITTED` fires on any 200
   (`FeedbackModal.ts:297-301`), so the event rate over-counts feedback that actually arrived.

**Contrast, already in the tree:** `/api/subscribe` uses the **same** helper and deliberately answers
`500 { error: "Delivery failed" }` on either failure (`Master.ts:393-423`). A comment there says the
two routes differ on purpose. ⛔ Do not "unify" them without the owner decision below.

**How often it happens: rare, and logged.** Since the `0273` deploy (2026-09-26), the owner sent two
test messages and both arrived. There is **no** production measurement of how often delivery fails.
`0061` verification step 5 (a boot-scoped count of failures) was never run.

## What to build

**Step 1 — owner decision first (the producer or coder puts it to the owner at the plan gate; ⛔ do not
pick one).** The options, with the main cost of each:

| # | Option | What the player sees | Cost / risk |
|---|---|---|---|
| A | **Report the failure; the player retries** | *"Failed to send. Please try again."*, with their text kept in the form | Smallest build. Server returns a non-2xx when no configured channel delivered; the client path already exists. Retries hit the 5/min rate limit (`Master.ts:241`). |
| B | **Keep a local copy, resend later** | "Sent" (or "will be sent") | Client-side queue in browser storage. Can be wiped, is per-device, and needs a replay trigger. Risk of duplicates if the first send actually landed. |
| C | **Server-side durable queue** | "Sent" | A new store plus a retry worker on the game box, which today keeps no state for this. Largest build. |
| D | **Accept the loss, keep the log** | "Sent" (today's behaviour) | Zero build. Optionally add a log-based alert on `[feedback] telegram` failures, so *we* know even when the player does not. Close this task with the ruling recorded. |

The ruling must also settle one sub-question: **what counts as delivered when both webhook and
Telegram are configured** (any one channel, or all of them).

**Step 2 — build the chosen option** (skip for D, unless the owner also wants the alert):

- Keep the bounded cause-code logging exactly as it is. Never log `formatError(err)` or the request URL:
  the URL carries the bot token.
- If the response contract changes (option A), update `tests/server/MasterFeedbackRoutes.test.ts`, which
  currently pins the 200-on-failure behaviour.
- Decide, as part of the build, whether `FEEDBACK_SUBMITTED` should fire only after a confirmed delivery.
  If its meaning changes, update `ai-agents/knowledge-base/analytics-event-reference.md`.
- Any new player-visible text goes through `translateText`, in both `en.json` and `ru.json`.

## Verification steps

1. **The ruling is recorded** in this brief: the option chosen, the date, the channel, and the answer
   on multiple channels.
2. **Forced failure behaves as ruled.** In a unit test, simulate (a) `network_error` on both attempts and
   (b) `http_error` on the first attempt. The route's response and the log line match the chosen option.
3. **The success paths are unchanged.** `sent` and `sent_after_retry` still produce a 200 and a
   "sent" UI.
4. **The no-transport path still logs to stdout** (`Master.ts:366-368`). `/api/subscribe`'s 500
   contract is untouched.
5. **For option A: the player's text survives a failed send**, checked in a browser. The modal shows
   the error and keeps the form, and a retry that succeeds shows the success message.
6. **No token or URL appears in any new log line.**
7. For D: only step 1 applies, plus the alert fires on a forced failure if the owner asked for one.

## Notes

- **Depends on:** nothing.
- **Gate:** the owner decision in *What to build* step 1 must precede the build.
- **Blocks:** nothing.
- **Related:** [`0061`](../../done/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md),
  the source (residual 4). [`0277`](../../done/0277-uptrace-alert-delivery-to-telegram/brief.md),
  whose shared helper and retry-once this builds on.
  [`0289`](../0289-prove-a-telegram-alert-arrives-after-an-idle-period-0274-amendment-a1/brief.md),
  which asks whether delivery survives an idle period — the stale-socket case the retry is meant to
  cover. If `0289` shows the retry does **not** cover it, failures are more frequent than assumed here,
  and that strengthens A/B/C over D.
- **Producer's priority read — a recommendation, NOT an owner ruling:** **Low.** Failure is rare since
  the retry shipped, and every failure is logged. On cost, **A** is the natural first choice: a
  server-side status change that turns on a client error path which already exists. **Effort:** A is
  small (hours). B and C are materially larger. D is zero.
- ⚠️ **This board can hold a task forever.** `0061` itself sat here from 2026-08-23 to 2026-09-17.
