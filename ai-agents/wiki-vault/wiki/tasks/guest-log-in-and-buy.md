# Client: A Guest's "Log In and Buy" Continues Straight Into the Purchase — B3 (task 0495)

**Source**: `ai-agents/tasks/done/0495-client-guest-log-in-and-buy-continues-straight-into-the-purchase-citizenship-first-b3/brief.md` (`plan.md`, `review.md`, `worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 24 (ADR-035 append rank; on merit directly below `0494`) / task `0495` / build B3 of the shared purchase flow

> ✅ Closed 2026-10-26. Plan owner-approved 2026-10-25 (incl. 9 deviations, the copy, 15 s auto-continue, 5 s hand-off;
> OP-1 *"Both buttons (Recommended)"*). Stateful review 3 rounds, `closed-out` (R1–R3 fixed on owner rulings, R4 an
> accepted residual). Full `npm test` 5166/5166 on a re-run after one untraced failure (`InternalPathCase`, a supertest
> suite, `401` shape — now tracked in `0500`).
> 🏗️ **2026-10-26 sync (`4e9160a`): committed in `4e9160a` (HEAD); `git tag --contains` → none ⇒ NOT deployed.** The
> brief's "Not committed" note predates that commit. **The guest path was not checked locally** — it cannot appear
> without the Yandex SDK; that is `0498` (B5).

## Goal

The guest path of the shared purchase flow, applied to citizenship first: a guest taps **"Log in and buy — {price}"**,
logs in with Yandex, and the game goes on to the payment window on the **same page** — no reload (ADR-125).

## Key Changes

- `PurchaseCoordinator.ts` — guest path: `AUTO_CONTINUE_DEADLINE_MS = 15_000`, `HANDOFF_DELAY_MS = 5_000`; states
  `logging_in`, `login_cancelled`, `needs_tap`, `earlier_purchase_pending`; `surfaceClosed()`; the D3 hand-off after
  a non-grant end.
- `FlashistFacade.ts` — `refreshPaymentsAfterLogin()` (returns `true` only when the new payments object is in place),
  `getSignedPurchasesResult()`, 7+1 new `Purchase:*:Citizenship` enum entries and the tap id
  `purchaseLoginCitizenshipExplainer`.
- `PaymentsReconciliation.ts` — `reconcilePurchasesNow()`; `PaymentsApiClient.ts` — `failedCount`.
- `ProductPurchase.ts` — optional `mayOpenPaymentWindow` guard checked after `/intent`, before the frame.
- `CitizenshipExplainerModal.ts` — "Log in and buy — {price}" primary plus the plain "Log in with Yandex" secondary;
  progress lines; Restart game on `profile_unavailable`; closes on `PURCHASE_GRANTED_EVENT`.
- `CitizenshipCard.ts` — `reread({showChecking})`, public `requestLoginRestart()`; `CitizenshipOffer.ts` — `guest`
  carries `price`.
- `en.json` + `ru.json` — `citizenship_paid.login_and_buy_cta` and 8 `purchase_flow.*` keys.
- `analytics-event-reference.md` — the guest funnel rows ([[systems/analytics]]).

**Review fixes (owner rulings 2026-10-26, relayed by `fkit-lead`):**
- **R1** *"Check again on the tap"* — a continuing tap re-runs the reconcile; a paid-but-ungranted earlier purchase ⇒
  `earlier_purchase_pending` ("still being processed — restart the game later"), **no payment**.
- **R2** *"Stop and ask for a tap"* — a failed or timed-out payments refresh ⇒ `needs_tap` (no auto-open on the
  guest-time payments object).
- **R3** *"Fix it"* — `requestGameRestart` also refuses while a join is being set up (`!isOnStartScreen()`), re-reading
  the profile instead; covers the hand-off timer and the plain login.

## Outcome

- Blocks `0498` (B5 live check inside Yandex), and with `0496` the item builds `0486`, `0010`, `0011` (owner OD-3).
- **Follow-up filed:** `0501` (Backlog) — the **logged-in** Buy should also re-check for an earlier paid-but-not-granted
  purchase (owner ruling *"File a task for it"*).
- ⚠️ **Residuals for B5 (from the worklog):** `purchase()` always runs after async work, never synchronously inside a
  tap — whether Yandex needs a fresh gesture is what B5 measures; the `AUTO_CONTINUE_DEADLINE_MS = 0` fallback may not
  be enough, because a tap after `needs_tap` still awaits a re-read.
- Unrelated flake seen during the build: `tests/profile-server/SshAlerts.test.ts` failed once under full-suite load,
  passed 5/5 alone — not traced.

## Related

- [[systems/shared-purchase-flow]] — the flow
- [[decisions/adr-125-log-in-and-buy-skips-reload]] — the ADR this implements
- [[tasks/shared-purchase-flow-design]] — task `0484`, the spec
- [[tasks/purchase-core-client]] — task `0494` (B2), extended here
- [[tasks/durable-items-entitlements]] — task `0496` (B4), built before this one
- [[tasks/citizenship-explainer-popup]] — task `0301`, the popup that gains "Log in and buy"
- [[tasks/session-verified-status-line]] — task `0397`, the Restart game button kept on `profile_unavailable`
- [[systems/analytics]] — the `Purchase:Login:*` / `Continue:*` / `Blocked:*` events
- [[decisions/sprint-9]] — the board (rank 24); B5 `0498` at 27
- [[tasks/stop-consuming-client-s2]] — task `0510`, 2026-10-26: adds a `held_elsewhere` end to this flow (no payment window); `0498` now also depends on `0506` and `0510`
