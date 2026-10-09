# Citizenship Explainer Popup: a "Buy paid citizenship" Button for Earned Citizens Who Have Not Paid — Verified Sessions Only (task 0409)

**Source**: `ai-agents/tasks/done/0409-explainer-popup-offer-a-buy-button-to-earned-citizens-who-have-not-paid-verified-sessions-only/brief.md` (`plan.md`, `worklog.md`, `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 56 (ADR-035 append rank; moved in from the Backlog board 2026-10-08) / task `0409`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-08 by `fkit-sprint-ship-loop`. Committed in `a555111`
> (2026-10-08, "Sprint push"); `git tag --contains a555111` → none ⇒ **committed, not deployed** (checked 2026-10-08).
> Cleared for a same-day deploy by owner ruling (*"might"*). Live look → `0420` ([[decisions/sprint-8]]).
> 📌 *2026-10-09 sync: **deployed since** — `a555111` is in deploy tags `0.0.158`–`0.0.161`; `0420`'s worklog records these builds as shipped in game `0.0.160` (2026-10-08 evening).* ⚠️ *The earned-citizen live check (`0420` items 3 (a), 8 (b)) is **blocked** — no earned test account since 2026-10-08 (`0424`); `0425` would provide one. See [[tasks/explainer-popup-shorter-text]] (`0421`) for the text now shown.*

## Goal

Owner, 2026-10-08, on an earned-citizen test account: the popup ended with *"Вы уже гражданин."* and only Close. A
**non-paid citizen** should get a *buy citizenship* button above Close, styled like the *"Войти в Яндекс"* login button.
Non-citizens already had a Buy in the popup (`0301`) — the real change is for earned citizens.

🚨 **The double-charge guard is the core of the task.** The client knows "paid" only on a **verified** read; an
unverified session gets the equalized view where `is_paid_citizen` is absent and reads as `false`. A naive *"citizen and
not paid → Buy"* would ask a **paid** citizen on an unverified session to pay again. So Buy shows only when the read is
verified **and** says not paid — every unknown fails closed (ADR-116 Decision 4; the `0018` guard).

## Key Changes

**Owner answers at the plan gate (2026-10-08, live `AskUserQuestion`, as relayed):** Q1 **popup only** — no card change ·
Q2 heading RU **`Платное гражданство`** / EN **`Paid citizenship`** · Q3 button RU **`Купить платное гражданство — {price}`**
/ EN **`Buy paid citizenship — {price}`** · Q4 keep *"Вы уже гражданин."* · Q5 keep today's post-purchase restart popup ·
Q6 no hint for an unverified earned citizen · Q7 owner had seen the non-citizen Buy · Q8 a separate tap event · Q9 **no
real purchase anywhere** (stubbed checks only) · Q10 the stale-verified-read gap **accepted** for now.

- `src/client/CitizenshipOffer.ts` — new offer kind `citizen_buy`; new inputs `isVerifiedRead`, `isPaidCitizen`. A citizen
  gets `citizen_buy` only when: not `paidGrantConfirmed`, read authoritative, verified, not paid, product in the catalog.
  Still **one rule** shared by card and popup ([[tasks/citizenship-explainer-popup]]).
- `CitizenshipCard.getCitizenshipOffer()` feeds `getProfileVerificationStatus() === "verified"` and
  `isCurrentPlayerPaidCitizen()` — the same values as `0397`'s status line and `0248`'s ad gate. **No card render change.**
- `CitizenshipExplainerModal` — new `case "citizen_buy"`: already-citizen line → heading → `primary-btn` with price →
  shared error line; Close stays last. Both Buy cases go through one `buyThroughCard(tapElementId)`.
- Analytics: `UI:Tap:PurchasePaidCitizenshipExplainer` (`flashistConstants.uiElementIds.purchasePaidCitizenshipExplainer`)
  — the only way to count upgrades, since `Purchase:*:Citizenship` does not tell an upgrade from a first purchase
  ([[systems/analytics]]).
- Tests include a named **"double-charge guard: an unverified citizen never gets a buy offer"**.

## Outcome

- Review round 1: **no confirmed findings.** Codex's X1 (a stale button could start a purchase after a re-read) was
  **disproven** — the card and popup re-render as microtasks before any input event. Owner: *"Ship as is"* (no tap-time
  re-check).
- ⚠️ **Accepted residual `stale-verified-read`:** Buy can show to someone who has just paid when the page's verified read
  is stale (paid on another device/tab, or a confirm that never landed). The server's intent route does **not** refuse a
  second purchase. Same window as the non-citizen Buy today. Re-raise only if a path shows Buy to a paid or unverified
  citizen outside those two cases.
- **Local visual check done** (Playwright, stubbed reads, RU/EN, desktop and 360 px). The live look on the owner's
  earned and paid test accounts is not done — **never tap Buy on the earned account** (it would become paid for good).

## Related

- [[tasks/citizenship-explainer-popup]] — task `0301`, the popup and the shared offer rule
- [[tasks/explainer-paid-only-subheading]] — task `0408`, same popup, built first
- [[tasks/explainer-popup-wider]] — task `0417`, same popup, built after
- [[tasks/paid-citizen-thank-you-line]] — task `0407`, the paid side of the same card
- [[tasks/session-verified-status-line]] — task `0397`, the verified/unverified signal reused here
- [[tasks/paid-citizen-ad-free]] — task `0248`, the perk an upgrade buys
- [[decisions/adr-116-verified-login]] — Decision 4: unverified fails closed for entitlement
- [[systems/analytics]] — `UI:Tap:PurchasePaidCitizenshipExplainer`
- [[decisions/sprint-7]] — the board (rank 56)
- [[decisions/sprint-8]] — `0420`, the live-check checklist
- [[tasks/citizenship-explainer-popup-live]] — task `0401`, whose live check surfaced this
- [[tasks/authenticated-profile-read]] — task `0250` S3b, the verified owner view the Buy guard depends on
