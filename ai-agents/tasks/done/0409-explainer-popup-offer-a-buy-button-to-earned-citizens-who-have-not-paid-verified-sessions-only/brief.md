# Citizenship explainer popup: offer a "buy citizenship" button to earned citizens who have not paid (verified sessions only)

## ID
0409

> ℹ️ **ID allocation, checked 2026-10-08 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/` (folder
> names and `## ID` fields agree) is `0408`, so this is `0409`.

## Sprint
Sprint 7

> 📌 **2026-10-08 — was ~~Backlog~~; moved to [Sprint 7](../../../sprints/plan-sprint-7.md).** OWNER RULING typed directly by the owner in the `fkit lead` session on 2026-10-08 (the owner's own message, not an `AskUserQuestion` answer), relayed verbatim by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent.
> Verbatim: *"0407, 0408, 0409 - shoud be moved into the Sprint 7 (current sprint), we might need to do them today and deliver a new deploy update"*. The [Backlog board](../../../sprints/backlog.md) row is kept as `➡️ Moved`. Status unchanged
> (`🔲 Backlog`); no folder moved, no mover run. Deploy timing: see the dated *Deploy* note under *Notes*.

## Priority
56

> 📌 **2026-10-08 — was ~~Unscheduled~~; 56 is ADR-035 append position on [Sprint 7](../../../sprints/plan-sprint-7.md), NOT a merit rank.**
> The owner named the three tasks (`0407`, `0408`, `0409`, in that order), not ranks. Appended after that board's
> highest (55, `0408`); open for owner confirmation. The paragraph below describes the Backlog board and is history.

⚠️ The owner gave no rank. Filed on the unranked [Backlog board](../../../sprints/backlog.md) as an appended row (ADR-035)
— its place on that board is **append order, not a merit ranking**. Needing a rank is the signal to pull it into a sprint.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

### 🚨 Safety catch — read this first (the double-charge guard)

The client knows "this player paid" **only for a verified session** (`vfy:true`). Since `0250` S3b the server sends the
paid keys (`is_paid_citizen`, `citizenship_purchased_at`) **only in the verified owner view**; an **unverified** session
gets the equalized S1 view where `is_paid_citizen` is simply **absent**. The client then reads it as `false`:
`src/client/PlayerProfileView.ts:136` (`isOwnerView = profile.is_paid_citizen !== undefined`) and `:154`
(`isPaidCitizen: isOwnerView && profile.is_paid_citizen === true`). The field's own comment (`:46-53`) says `false`
means *"not paid, OR unverified, OR unknown"* — fail-closed for entitlement, citing ADR-116 Decision 4.

So a naive rule **"citizen and not `isPaidCitizen` → show Buy"** would show a Buy button to a **paid citizen whose
session happens to be unverified** — inviting **a second real purchase from someone who already paid**. That is exactly
what `deriveCitizenshipOffer()` exists to prevent (its header, `src/client/CitizenshipOffer.ts:7-11`: the double-charge
guard from task `0018`, review R1).

**Required, not optional:** the earned-citizen Buy button shows **only when the session is verified** (the read is the
owner view — `isVerifiedRead`, `PlayerProfileView.ts:55-62`, the same signal `0397`'s session-status line already uses)
**AND** that verified read says **not paid**. For an **unverified** citizen: **no Buy button** (what they see instead is
open point 6 below). Also no Buy while a just-confirmed grant's re-read is pending (`paidGrantConfirmed`, today's
`CitizenshipOffer.ts:58`), and none while checking or on a failed read — every unknown fails **closed** for Buy.

### The request — the owner's words

Owner, 2026-10-08, typed live in the `fkit lead` session with a screenshot of the explainer popup on the owner's
**earned-citizen** test account (game `0.0.157`: the popup ends with "Вы уже гражданин." and only a "Закрыть" button),
relayed by `fkit-lead` to a spawned `fkit-producer` (no owner channel; ADR-021/037). Verbatim:

> *"Anothier thing about the ssame popup: - if the non-paid citizen is seeing this popup, they should have a button "buy
> citizenship" at the bottom, before the close button, the design should be similar to the "login into yandex" button.
> This button should be shown for both not-citizens and citizens who are not paid."*

**Owner ruling in that message (not reopened here):** the button sits at the bottom of the popup, **above "Закрыть"**,
styled **like the "Войти в Яндекс" login button**.

### What is already true today (checked in code by `fkit-lead`, re-checked by the producer 2026-10-08)

- **One shared rule** decides what the card AND the popup offer: `deriveCitizenshipOffer()`
  (`src/client/CitizenshipOffer.ts:48-68`). Order: checking → guest → citizen → not authoritative → no product → buy.
  Its inputs today (`:34-46`) carry `isCitizen`, `isAuthoritative`, `xp` — **no verified/paid signal at all**.
- **Non-citizens already get a Buy button in the popup** (logged in, authoritative read, product in the catalog):
  `src/client/CitizenshipExplainerModal.ts:352-367`, case `"buy"` — heading `citizenship_explainer.buy_title`
  ("Или купите сразу"), button `citizenship_paid.buy_cta` + price, class `primary-btn` — **the same class as the
  "Войти в Яндекс" login button** (case `"guest"`, `:368-384`). **So the "not-citizens" half of the request is already
  live.** ❓ The coder's plan must ask the owner to confirm that is what they saw on a non-citizen account — or report
  where it does not show (e.g. guest, failed read, product missing from the catalog — all deliberately button-less).
- **Earned (non-paid) citizens get NO Buy button:** every citizen hits case `"citizen"` (`:385-388`) → text
  `citizenship_explainer.already_citizen` ("Вы уже гражданин.") only. **This is the real change.**

### Dependencies and conflicts

- **Nothing hard.** `0250` S3b (verified owner view) and `0397` (session-status line) are built and were live as of the
  2026-10-08 deploy.
- [`0408`](../../done/0408-explainer-popup-put-the-paid-only-ad-free-perk-under-its-own-paid-citizenship-sub-heading/brief.md)
  (paid-only sub-heading in **the same popup**) touches the same render and the same language section. **The coder
  should sequence them (either order) or do them together** — and open point 2 below leans on `0408`'s new section.
- [`0407`](../0407-thank-paid-citizens-for-supporting-the-game-on-the-citizenship-card/brief.md) (thank paid citizens on
  the **card**) — design-gated, not waited on. If open point 1 widens this task to the card, the two touch the same
  surface: say so in the plan.
- ⛔ **Keep the owner's earned test account earned.** `0401`'s brief records the owner keeps one **earned** and one
  **paid** test account on purpose; a purchase on the earned one makes it paid for good. **Any test of this button must
  not complete a purchase on the earned account** unless the owner explicitly says so at the plan gate.

## What to build

A client-only change. No server change is expected (see open point 5 — confirm it at planning).

1. **Extend the shared offer rule** (`deriveCitizenshipOffer`) so a citizen can get a buy offer, under the safety catch
   above: verified read **and** not paid **and** no `paidGrantConfirmed` **and** a product in the catalog. Every other
   citizen keeps today's `"citizen"` result. This needs the rule's inputs to carry the verified/paid facts (today they
   do not); feed them from the same values the card already has (`isVerifiedRead`, `isCurrentPlayerPaidCitizen()` —
   the value the `0248` ad gate and `0397` notice read). Keep it **one rule in one place** — whether the card follows it
   too is open point 1.
2. **Popup render:** for that new offer, show a heading (open point 2), then the Buy button **above "Закрыть"**, class
   `primary-btn` (owner ruling: like the login button), wired to the popup's existing purchase handler and its existing
   error line. Plus or minus "Вы уже гражданин." (open point 4).
3. **Non-citizens: unchanged.** Their existing Buy button stays exactly as it is.
4. Text only via `translateText(key)`; every new or changed key in **both** `resources/lang/en.json` and
   `resources/lang/ru.json`. No hardcoded user-visible string.
5. **Tests** — in `tests/client/CitizenshipOffer.test.ts`, `tests/client/CitizenshipExplainerModal.test.ts` and
   `tests/client/CitizenshipExplainerLang.test.ts` (for new keys):
   - verified + citizen + not paid + product → the new buy offer, and the popup renders the Buy button above Close;
   - **unverified citizen (paid key absent) → NO Buy button** — the double-charge guard, as its own named test;
   - verified + paid → no Buy;
   - citizen + `paidGrantConfirmed` (re-read pending) → no Buy;
   - citizen + verified + not paid + **no product** → no Buy;
   - checking / read failed → no Buy;
   - non-citizen cases unchanged (existing tests still pass).
   If open point 1 says the card changes too, `tests/client/CitizenshipCard.test.ts` gets the same cases.

### Open points — the owner decides at the coder's plan gate (NOT decided here)

The producer/lead recommend; the owner decides. Put these to the owner in plain words before writing strings or code.

1. **Popup only, or the card too?** `deriveCitizenshipOffer` is shared on purpose — *"so the two buy buttons cannot
   drift apart"* (`CitizenshipOffer.ts:3-4`). Changing the rule changes the card as well, unless the popup gets its own
   branch. **Recommendation:** decide it explicitly; the owner asked only about the popup. Tradeoff: popup-only keeps
   the card as it is but means the two surfaces no longer offer the same thing, which the shared rule was built to avoid.
2. **Heading above the button for a citizen.** "Или купите сразу" ("Or buy it now") follows "Как получить бесплатно"
   and makes no sense to someone who already is a citizen. Needs RU + EN wording, e.g. framed around the paid-only perk.
   **Recommendation:** tie it to `0408`'s new "Только для платного гражданства:" section (e.g. the button sits right
   after that section, so the reason to buy is the line just above it).
3. **Button text for a citizen.** "Купить гражданство" to someone who already has citizenship may confuse; e.g.
   "Купить платное гражданство". **The wording is the owner's.** Price shown as for non-citizens (recommendation).
4. **Keep or drop "Вы уже гражданин."** next to the button. No recommendation; owner's call.
5. **What a purchase does for an earned citizen — confirm in code at planning.** What the producer saw (not a full
   trace): the grant SQL (`src/profile-server/PaymentsRepository.ts:46-53`) sets `is_citizen = true`,
   `is_paid_citizen = true` and `citizenship_purchased_at = coalesce(citizenship_purchased_at, now())` — so an earned
   citizen would become paid with a fresh purchase date. `0401`'s brief records that `/v1/payments/yandex/intent` does
   not refuse an existing citizen. **The coder confirms** (a) the client purchase path does not short-circuit for a
   citizen, (b) the earned→paid flags land and the ad-free perk (`0248`) turns on, (c) what the earned-citizenship
   transition reporting (`reportEarnedCitizenshipTransition`, `PlayerProfileView.ts:137-143`) does on earned→paid, and
   (d) the post-purchase **"Гражданство активно!" restart modal** (`citizenship_restart_modal`) reads oddly for someone
   who was already a citizen — propose wording or a different message for this case, owner decides.
6. **What an unverified citizen sees.** The safety rule says no Buy. Options: today's "Вы уже гражданин." only, or a
   short hint (e.g. that buying is offered once the session is confirmed — `0397`'s status line already says
   "unverified" on the card). **Recommendation:** keep today's text, no new hint — simplest, and `0397` already explains
   the session state. Owner's call.

## Verification steps

1. **Plan gate:** the coder's plan records the owner's answers to open points 1–6 (who, date, channel, words), and the
   owner's confirmation of what they see as a non-citizen, before any string or code is written.
2. Unit tests above pass, **including the named unverified-citizen no-Buy test**; existing non-citizen tests unchanged
   and green.
3. `ru.json` and `en.json` carry the same keys (language-parity test passes); every new string is the owner-confirmed
   text.
4. `npm test` green for the touched suites; `npm run lint` clean.
5. **Visual check, local dev**, `ru` and `en`, desktop and **phone width** (about 360 px), for: a verified earned
   citizen (Buy shows above "Закрыть", looks like the login button), a paid citizen (no Buy), an unverified citizen (no
   Buy), a non-citizen (unchanged). Stubbed reads are fine; **no purchase on the owner's earned test account**.
   Screenshots or a written yes/no per case in the worklog.
6. **Live check** comes after a later game deploy. Per the owner's build/verify split rule (2026-09-29) this task closes
   on the local evidence above; whether the live look-over is folded into an existing popup live check or filed as its
   own verify task at the top of the next sprint is **left open** — no verify task is filed now.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- Related: `0408` (same popup, same render — sequence or combine), `0407` (thank paid citizens on the card —
  design-gated, not waited on), `0301` (the popup), `0248` (the paid-only ad-free perk), `0250` (verified owner view, S3b),
  `0397` (session-status line — already tells verified from unverified), `0018` (the double-charge guard, review R1),
  `0401` (keep the earned test account earned). ADR-116 Decision 4 (unverified fails closed for entitlement).
- ~~**Deploy:** ships in a later game deploy, in the owner's weekend slot (ruling 2026-09-29) unless the owner says
  otherwise. Committed is not deployed.~~ *(history — true until the 2026-10-08 ruling below)*
- 📌 **Deploy, 2026-10-08 — owner ruling (verbatim under *Sprint*):** this task may be built and shipped **today, in a
  new deploy** — owner's words *"we might need to do them today and deliver a new deploy update"*. The weekend-slot
  rule (2026-09-29) is set aside for `0407`, `0408`, `0409` only; *"might"* is not a commitment to ship today. Committed
  is still not deployed; commit and deploy stay the owner's call.
- No ids, hosts or secrets belong in this brief or its follow-ups.
- **Why one brief, not several:** the rule change, the popup render and its strings cannot ship or be checked apart —
  the button is the rule's only visible effect. If the owner widens it to the card (open point 1), that is still the
  same rule and the same tests.
- Filed 2026-10-08 by a spawned `fkit-producer` on an owner request relayed by `fkit-lead` (ADR-021/037). ⛔ Not producer
  precedent.
