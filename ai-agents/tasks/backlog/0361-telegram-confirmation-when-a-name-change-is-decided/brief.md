# Telegram confirmation when a name change is decided (approve / reject / clear)

## ID
0361

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-10-01 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER REQUEST given live
in the `fkit lead` session on 2026-10-01, relayed by `fkit-lead`.** ⛔ Not producer precedent. The owner's words,
verbatim:

> *"I'll just realize that we need a couple of more telegram alerts one of which is the notification that happens
> when a username is approved or rejected. It will be like sign that the approve or reject command was executed
> correctly another one I would like to have is the notification about somebody buying citizenship or somebody
> earning citizenship by XP I don't think the second one should be added to the existing topics, maybe we need to
> new topic related to citizenship. And those notifications should go to that topic. Brief both tasks. Add them to
> backlog."*

This brief is the **first** of the two. The second is [`0362`](../0362-telegram-notification-when-a-player-becomes-a-citizen-in-a-new-citizenship-topic/brief.md).

**Why the owner wants it.** On 2026-10-01 the owner rejected a name with the operator's `name-change:decide` command,
got `HTTP 200: rejected`, and then had to run a hand-written database query to be sure the player's inbox message was
really written. The runbook's *Confirming the outcome (read-only)* section
(`ai-agents/knowledge-base/name-change-digest-runbook.md`) is exactly that manual step. A Telegram message, sent by the
server once the decision is saved, would replace it.

**How deciding works today.**
- The operator SSHes to the profile box and pastes an Approve / Reject line (or builds a Clear line from the runbook).
  It runs `npm run name-change:decide` inside the `profile-api` container, which posts to the internal route
  `POST /internal/v1/name-change/decide` on the same box (`src/profile-server/Routes.ts` ~:1397–:1512;
  `src/profile-server/decideNameChange.ts`).
- Approve / reject: `NameChangeRepository.decideNameChange` (~:386–:466) — one transaction, then, **after COMMIT**,
  `afterNameChangeDecided` sends the `name_change_approved` / `name_change_rejected` inbox template.
- Clear (task `0314`): `NameChangeRepository.clearDisplayName` (~:523–:571) — same shape, `name_change_cleared`.
- `afterNameChangeDecided` (~:642–:660) is **fire-and-forget**: it does not wait for the inbox write and does not
  report whether it worked. `InboxRepository.sendTemplate` returns nothing; a missing profile is only a log line
  (`InboxRepository.ts` ~:172–:186). **So today the server itself does not know, at reply time, whether the inbox
  message was written** — the plan must add a way to learn that before this message can report it.
- The pending-request Telegram message (`notifyOperator`, ~:713–:749) already sends to the **Name Changes topic**
  (`TELEGRAM_TOPIC_NAME_CHANGES`, read in `src/profile-server/Server.ts` ~:159) through `sendTelegramMessage`
  (`src/core/notifications/TelegramNotifier.ts`), with the never-throw pattern this task must copy. No new topic and
  no new env var is needed here.

**Constraints that must hold.**
- **Only after the decision is saved.** Never send when the transaction rolled back (`no_pending`, `name_taken`,
  `name_mismatch`, `no_custom_name`, a thrown error).
- **Telegram must never undo, fail or slow the decision.** The route's HTTP answer must not wait for Telegram. A
  blocked or slow Telegram costs the confirmation, nothing else.
- **No Yandex id in Telegram.** ADR-113 / task `0270` moved operator messages to the internal player uuid
  (`NameChangeRepository.ts` ~:909–:915). Keep it that way.
- **Show names safely.** A name can carry hidden characters; the pending-request message draws them as visible codes
  (task `0307`, the helper near `NameChangeRepository.ts` ~:777–:796). The confirmation must use the same helper, and
  HTML-escape every field (`parse_mode: HTML`), including the operator's reason.
- **Not throttled by the request notify slot.** Task `0313`'s 10-minute per-player slot limits *request* messages.
  A confirmation is one message per decision and must neither use nor claim that slot.
- **Put the hook in the repository (after commit), not in the terminal command.** Then any future way of deciding —
  including [`0350`](../0350-name-change-moderation-without-copy-and-paste/brief.md)'s chosen shape A1, an
  interactive command on the box — gets the confirmation for free.
- en / ru translation is **not** needed — this is an operator message, not player-facing.

## What to build

1. **One confirmation message per successful decision**, sent to the Name Changes topic with the existing Telegram
   config the repository already holds. It says, in plain words:
   - **what was done** — approved, rejected, or name removed (clear);
   - **the player** — internal uuid only;
   - **the name** — the approved name, the rejected name, or the removed name (shown safely, as above);
   - **the reason** — for reject and clear;
   - **whether the player's inbox message was written** — written / not written (no profile) / failed. This is the
     part that replaces the owner's manual query.
   Exact wording and layout are the plan's to propose (see open question 3).
2. **Learn the inbox result before sending.** After commit, wait for the inbox write to finish (in the background —
   never holding the HTTP reply), then send the Telegram message with its result. The inbox write's own contract
   (never throws, never rolls back the decision) is unchanged.
3. **Failure handling.** Telegram unset (no token / chat) ⇒ no message, nothing else changes — the same as the
   request message today. Telegram error ⇒ one warning log line naming the result only (never the token, never the
   name, never the reason), and the decision stands. `sent_after_retry` counts as sent (task `0277`).
4. **Runbook update** (`ai-agents/knowledge-base/name-change-digest-runbook.md`): say a confirmation now lands in the
   Name Changes topic after each successful approve / reject / clear; keep *Confirming the outcome (read-only)* as the
   fallback for when no confirmation arrives (Telegram down, or `HTTP 500` / no answer); update the outcome table and
   the end-to-end check list.
5. **Out of scope:** Telegram buttons or any inbound Telegram path (that is `0350`'s territory); messages for failed
   decisions (unless the owner rules otherwise — open question 1); the daily digest; any player-facing change.

## Verification steps

1. **Repository tests** (`tests/profile-server/NameChangeRepository.test.ts` or a sibling), with the Telegram send
   stubbed through a test seam:
   - approve, reject and clear each send **exactly one** message, to the Name Changes topic, carrying the action, the
     internal uuid, the name and (reject / clear) the reason;
   - `no_pending`, `name_taken`, `name_mismatch`, `no_custom_name` and a thrown transaction error send **nothing**;
   - the message text never contains a Yandex id (assert on a fixture player that has one);
   - a name with hidden characters is drawn with visible codes; `<`, `>` and `&` in a name or reason are escaped.
2. **Inbox result is reported correctly:** inbox write succeeds ⇒ "written"; recipient has no profile ⇒
   "not written"; inbox write rejects ⇒ "failed". In all three the decision outcome returned is unchanged.
3. **Telegram failure never touches the decision:** a stubbed send that returns a failure, throws synchronously, or
   rejects still leaves the outcome `ok` and the database row decided; one warning is logged with no name, reason or
   token in it.
4. **No waiting on Telegram:** a test with a send that never resolves shows the decide call / route still returns
   promptly.
5. **Notify slot untouched:** after a decision plus its confirmation, the player's next request still reaches the
   operator at once (the existing `0313` test keeps passing, and a new case covers it with the confirmation enabled).
6. **Route test** (`tests/profile-server/NameChangeRoutes.test.ts`): `POST /internal/v1/name-change/decide` answers
   exactly as today for every outcome.
7. `npm test` and `npm run lint` pass.
8. **Live check (after a weekend-slot profile deploy):** approve, reject and clear one request each on the real box;
   each time a confirmation appears in the Name Changes topic saying the inbox message was written, matching the
   card in the game. Per the build-vs-verify rule, this is a **separate verify task** filed at the top of the next
   sprint when the build closes — it must not block that sprint's deploy.

## Open questions — for the owner, at the plan step (producer's recommendation marked)

1. **Failed decisions too?** Should a refused decision (`409 name_taken`, `409 name_mismatch`, `404 no_pending`,
   `500`) also post to Telegram? — **Recommend: no.** The terminal already prints those, and the owner asked for a
   sign that the command *worked*. A message only on success keeps the topic quiet and makes "no message" itself a
   warning sign.
2. **Wait for the inbox result, or send at once?** Waiting (a fraction of a second, in the background) lets the
   message say whether the inbox message was written — which is the check the owner did by hand. — **Recommend:
   wait,** with a short upper limit (the plan proposes one) after which the message says "inbox: not confirmed".
3. **Wording.** — **Recommend** a short, scannable layout, for example: first line *"Name approved"* / *"Name
   rejected"* / *"Name removed"*, then *Player*, *Name*, *Reason* (reject / clear), *Inbox message: written*.
   The coder proposes the final text at the plan gate.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Sibling, not a dependency:** [`0362`](../0362-telegram-notification-when-a-player-becomes-a-citizen-in-a-new-citizenship-topic/brief.md)
  (citizenship notifications, new topic). Both copy the same never-throw Telegram pattern; if one extracts a small
  shared "send operator message, never throw" helper, the other should reuse it rather than write a second one.
- **Related:** [`0350`](../0350-name-change-moderation-without-copy-and-paste/brief.md) (moderation without copy and
  paste — shape A1 chosen); hooking this in the repository means `0350`'s command inherits it. `0360` (refuse
  Anon-like names) and `0308` (name charset) touch the same feature, not this message.
- ⚠️ **Deploy timing (Sprint 7, soft):** [`plan-sprint-7.md`](../../../sprints/plan-sprint-7.md) records that there is
  to be **no second profile deploy before `0297` §1 reads `0309`'s log line** (container logs are lost on recreate),
  and that `build-deploy-profile.sh` **refuses to run while any `src/` change is uncommitted**. So this task's code
  must not sit uncommitted in the working tree across that weekend deploy, and it ships in a later profile deploy.
  Not a dependency — a sequencing fact.
- Volume: one message per operator decision — a handful a week at today's rate. No rate limit needed.
- No player id, topic id, chat id, host or IP is recorded here on purpose.
- Size: small — one post-commit hook in the repository (two call sites: decide and clear), inbox result plumbing,
  one message builder, tests, a runbook edit.
