# Drop the unused Yandex HMAC construction

## ID
0310

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021)** — the second half of the
follow-up that [`0297`](../0297-paid-citizenship-owner-run-test-buy-sequence/brief.md) §1 requires
(*"a small `fkit-coder` follow-up that drops the unused construction"*). The first half,
[`0309`](../../done/0309-record-which-yandex-hmac-construction-matches-real-purchases/brief.md), finds out which
construction Yandex actually uses.

`src/profile-server/YandexSignature.ts` accepts an HMAC-SHA256 over either the base64 payload string or
the decoded JSON, because the docs did not say which (`0019` decision). Once `0309` has recorded which one
real purchases match, the other branch is dead code and should go, so the verifier states exactly what
Yandex does.

📌 **GATE RE-POINTED 2026-09-30 — OWNER RULING given live 2026-09-30 via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent. Owner's choice, verbatim: *"Re-point to 0297 (Recommended)"*.** `0309` closed 2026-09-30 on local proof with **NO result** — its log line is built but not deployed, so its `worklog.md` will never hold the answer. **This task's gate is now the recorded label in [`0297`](../0297-paid-citizenship-owner-run-test-buy-sequence/brief.md)'s `worklog.md` for §1 (box 2)**, observed via the profile container log after the profile deploy + a real purchase. ⚠️ **Starting `0310` before that label is recorded could delete the construction real purchases need and reject paid purchases.**

⚠️ ~~**Do not start before `0309`'s result is in its `worklog.md`.**~~ Removing the wrong branch would reject
every real purchase — and real players are paying on this path. A failed verification returns null and
the purchase is not granted (reconciliation can recover it only once the fix is reverted).

## What to build

1. Remove the construction `0309` showed is **not** used; keep the one that is. Update the header comment
   to state which construction Yandex uses and how that was established (date + `0309`).
2. Keep or remove `0309`'s matched-construction log label as the plan decides — if kept, it must still
   log nothing secret.
3. Update tests: the used construction verifies; a payload signed the other way is now **rejected**.
4. Deploy the profile box by the existing pipeline (`build-deploy-profile.sh`), owner-run or approved.

## Verification steps

1. `tests/profile-server/YandexSignature.test.ts`: the kept construction passes; the removed one returns
   null; all other existing cases unchanged.
2. `npm test` and `npm run lint` pass.
3. After deploy: `/health` and `/ready` return 200.
4. **Live proof:** the next real purchase after deploy returns 200 on `/complete` (nginx access log,
   read-only) and the buyer's profile shows the paid grant. Record it in `worklog.md`. A signature
   rejection on a real purchase = revert immediately.

## Notes

- **Depends on:** ~~`0309`~~ → [`0297`](../0297-paid-citizenship-owner-run-test-buy-sequence/brief.md) §1 box 2 — the construction label recorded in `0297`'s `worklog.md` *(📌 re-pointed 2026-09-30 — OWNER RULING given live 2026-09-30 via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent. Owner's choice, verbatim: *"Re-point to 0297 (Recommended)"*. `0309` closed on local proof with NO result; the label arrives only after the profile deploy + a real purchase. ⚠️ Starting before it is recorded could reject paid purchases.)*
- **Blocks:** nothing
- **Related:** [`0297`](../0297-paid-citizenship-owner-run-test-buy-sequence/brief.md) §1,
  [`0309`](../../done/0309-record-which-yandex-hmac-construction-matches-real-purchases/brief.md), `0019`.
- **No secrets in any artifact.**
