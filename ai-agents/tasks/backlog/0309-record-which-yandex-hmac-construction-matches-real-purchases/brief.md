# Record which of the two HMAC constructions a real Yandex purchase matches

## ID
0309

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021)**, as the follow-up that
[`0297`](../0297-paid-citizenship-owner-run-test-buy-sequence/brief.md) §1 requires (*"Hand the result to
the producer to file a small `fkit-coder` follow-up that drops the unused construction. Filing it is part
of this task's close condition."*). Split into two briefs: this one **finds out**, `0310` **removes**.

**What is known (2026-09-26, from the lead's read-only nginx check on the profile box):** two real signed
Yandex payloads were accepted — `POST /v1/payments/yandex/complete` returned **200** for a real player's
purchase (13:52:34 UTC) and for the owner's test purchase (14:46:24 UTC). So the secret on the box is the
right value and **one** of the two constructions works. **Which one is not observable today**: nothing
logs it.

**Why we care.** `src/profile-server/YandexSignature.ts` (`verifySignedPayload`) accepts an HMAC-SHA256
over **either** the base64 payload string as sent **or** the decoded JSON text, because Yandex's docs do
not say which (`0019` decision). Accepting both costs no security (same key), but it is dead code on one
branch and it hides which form Yandex really uses. Callers: the `/complete` and `/reconcile` routes in
`src/profile-server/Routes.ts`.

⚠️ **Correction to the hand-off's suggested method.** The lead suggested working it out offline from
stored `processed_purchases.raw_payload`. **That cannot work:** `raw_payload` holds only the **decoded
JSON** (`VerifiedPayload.rawPayload`); the **signature part is never stored**, and without it neither
HMAC can be checked. Checked in the code 2026-09-26 (`YandexSignature.ts`, `PaymentsRepository.ts`,
`migrations/006_player_identity.sql`).

**So the answer needs a new real signed payload.** Two ways to get one — the coder's plan picks:
- **(Recommended) Log it.** On a successful verification, emit one log line naming **which construction
  matched** (a fixed label only), then deploy the profile box. The next real purchase (or a signed
  `/reconcile` with a pending purchase) answers the question with no one handling secret material.
- **By hand.** The owner makes another test purchase with devtools open, copies the signed string from
  the `/complete` request, and computes both HMACs on the box. Works without a deploy, but it means
  handling a signed payload and the secret by hand — it must never be pasted into any file, log or chat.

## What to build

1. Make `verifySignedPayload` report **which** construction matched (for example a label on the returned
   result — the plan decides the shape), without changing what it accepts or rejects.
2. In the `/complete` and `/reconcile` routes, log that label on a successful verification, through the
   profile server's own logger (`src/profile-server/Logger.ts`, never `src/server/Logger.ts`).
   ⛔ **Never log the secret, the signature, the signed string, the payload, or the purchase token** —
   the label only (plus fields the route already logs safely).
3. Deploy the profile box by the existing pipeline (`build-deploy-profile.sh`) — the owner runs or
   approves the deploy.
4. After the next real signed payload is verified, read the log line on the box (read-only) and record
   the result — date, which construction, how observed — in this task's `worklog.md` **and** in
   `0297`'s `worklog.md` (§1, second checkbox).

## Verification steps

1. Unit tests in `tests/profile-server/YandexSignature.test.ts`: a payload signed over the base64 string
   reports the base64 label; one signed over the decoded JSON reports the JSON label; a bad signature
   still returns null (unchanged). Existing tests stay green.
2. A route-level test shows the label appears in the log on success, and that no log line contains the
   signed string, signature or secret (grep the captured log output for the test's synthetic values).
3. `npm test` and `npm run lint` pass.
4. After deploy: `/health` and `/ready` return 200 on the profile box.
5. After a real purchase or reconcile: the log line is present on the box and the result is written in
   both worklogs. If the label is **neither** (impossible by construction) or no purchase arrives for a
   long time, record that and ask the owner whether to use the by-hand route.

## Notes

- **Depends on:** nothing — can start now. (Its **result** needs one real signed payload after deploy.)
- **Blocks:** `0310`
- **Related:** [`0297`](../0297-paid-citizenship-owner-run-test-buy-sequence/brief.md) §1 (source; its
  close condition is that this follow-up is **filed**, not done), [`0195`](../../done/0195-forward-yandex-payments-secret-in-profile-deploy/brief.md)
  (secret value — settled by the two 200s), `0019` (the two-construction decision),
  [`0294`](../0294-prove-a-rotated-value-overwrites-the-persisted-one-on-the-live-profile-box/brief.md)
  (rotating `YANDEX_PAYMENTS_SECRET` would break real purchases — do not rotate as part of this task).
- Real players are paying on this path. The change must not alter what is accepted; a regression here
  rejects paid purchases.
- **No secrets in any artifact** — label and status only.
