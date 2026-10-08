# Plan — 0409: offer a "buy citizenship" button in the explainer popup to earned citizens who have not paid (verified sessions only)

Planned by `fkit-coder`, spawned by `fkit-lead` (`fkit-sprint-ship-loop`, Sprint 7, step Plan), 2026-10-08. Planning only: no source and no files were written.

## Goal

In the "What is citizenship?" popup, a player who **earned** citizenship (did not pay) gets a Buy button at the bottom, **above "Закрыть"**, styled like the "Войти в Яндекс" button (owner ruling, 2026-10-08). Only when we are **sure** they have not paid: the session is verified and the verified read says "not paid". In every unsure case (unverified session, failed read, still checking, a purchase just confirmed, no product in the catalog) there is **no** button. This is the double-charge guard.

Non-citizens: unchanged. They already get the Buy button in the popup today.

## What I found in the code (confirms brief open point 5)

- **The one shared rule** is `deriveCitizenshipOffer()` in `src/client/CitizenshipOffer.ts`. Today every citizen gets `{ kind: "citizen" }`. Its inputs have no verified or paid information.
- **The card feeds the rule** in `CitizenshipCard.getCitizenshipOffer()`. The popup calls it through `currentOffer()`. The card shows its own Buy button **only** for `offer.kind === "buy"` (`renderLoggedIn`).
- **Verified and paid are already published by the card**, from the same profile read and in the same code block (`refreshProfile()`): `getProfileVerificationStatus()` (`"verified"` only for the owner view) and `isCurrentPlayerPaidCitizen()` (true only for a verified read that says paid). `0397`'s status line and `0248`'s ad gate read these two values. A verified read always carries the paid key (`PlayerProfileView.ts`: `isOwnerView = is_paid_citizen !== undefined`), so **verified + not paid** really means the server said "not paid".
- **(a) Nothing on the purchase path stops a citizen.** `runCitizenshipPurchase()` has no citizen check, `card.buyCitizenship()` only has the shared "one purchase at a time" latch, and the server's `/v1/payments/yandex/intent` route does not check citizen or paid. ⚠️ So **the client rule is the only double-charge guard**. The server would sell a second time.
- **(b) Earned → paid works.** The server's grant SQL (`PaymentsRepository.ts`) sets `is_citizen = true`, `is_paid_citizen = true`, `citizenship_purchased_at = coalesce(…, now())`. An earned citizen has no purchase date, so it becomes "now". After `"granted"`, the card sets `paidGrantConfirmed = true` (kept for the whole page), then re-reads the profile. That re-read publishes paid = true if verified, and the `0248` ad-free perk switches on **live, with no restart**.
- **(c) Earned-citizenship event: no false fire.** `reportEarnedCitizenshipTransition()` fires `Citizenship:Earned:XP` only when the stored earned date goes from `""` to a date. An earned citizen's date was already stored, and buying does not change `citizenship_earned_at`. Nothing fires.
- **(d) After the purchase, two messages may read oddly for someone who was already a citizen:**
  - the "restart to apply" popup (`citizenship_restart_modal`: "Гражданство активно! Перезапустите игру, чтобы завершить применение…"), sent by `runCitizenshipPurchase()` for every purchase. The text is still true. The restart is not needed for the ad-free perk, but it does no harm.
  - the server's inbox message "Добро пожаловать, Гражданин! … Вам теперь доступны привилегии граждан." (`inbox.templates.citizenship_paid`). Changing it would be a server/inbox change, out of scope here.
- **Popup today** (`CitizenshipExplainerModal.ts`): the action area (`renderAction`) sits after "Как получить бесплатно" and before the Close button. The non-citizen Buy uses `<h3>` "Или купите сразу" + `<button class="primary-btn">` (the same class as the login button). The "Сейчас у вас X из 100 XP" line shows only for `buy` / `no_product`.
- **0408 seam:** the paid-only block (`#citizenship-explainer-paid-only-title`, `#citizenship-explainer-paid-only`) sits in the benefits area, at the top half of the popup. The owner ruled the button goes **at the bottom, above Close**, so the button stays in `renderAction`. The paid-only block above is the reason to buy. The new heading (open question 2) links the button to it.

## Approach

### 1. The shared rule: a new offer kind `citizen_buy` (`src/client/CitizenshipOffer.ts`)

- New offer kind: `{ kind: "citizen_buy"; price: string }`: "an earned citizen, verified not paid, may buy".
- Why a **new kind** instead of reusing `"buy"`:
  - the card shows its Buy button only for `"buy"`, so the card stays as it is unless the owner widens this to the card (open question 1). The decision still lives in **one rule in one place**; only the drawing is per surface.
  - the popup must not show the "Сейчас у вас 100 из 100 XP" line or the non-citizen heading/text to a citizen.
  - the popup's `switch` covers every kind, so TypeScript forces every surface to handle the new kind on purpose.
- Two new inputs in `CitizenshipOfferInputs`:
  - `isVerifiedRead: boolean`: the last applied read is the verified owner view
  - `isPaidCitizen: boolean`: that verified read says paid
- New citizen branch (the order of checks is otherwise unchanged):
  ```
  if (profile.isCitizen || inputs.paidGrantConfirmed) {
    if (!inputs.paidGrantConfirmed && profile.isAuthoritative &&
        inputs.isVerifiedRead && !inputs.isPaidCitizen &&
        inputs.productPrice !== null) {
      return { kind: "citizen_buy", price: inputs.productPrice };
    }
    return { kind: "citizen" };
  }
  ```
  Every unknown fails **closed**: `checking` / `guest` are returned earlier, and an unverified read, a paid read, a just-confirmed grant or a missing product all give `"citizen"`.
- Update the file's header comment: the guard now also covers citizens, and the reason (an unverified read cannot say "paid", ADR-116 Decision 4).

### 2. The card feeds the two inputs (`src/client/CitizenshipCard.ts`)

- In `getCitizenshipOffer()`:
  - `isVerifiedRead: getProfileVerificationStatus() === "verified"`
  - `isPaidCitizen: isCurrentPlayerPaidCitizen()`
- These are the same two values `0397`'s status line and `0248`'s ad gate read, so the Buy button can never disagree with the "✓ Подтверждено — преимущества платного гражданства включены" line. No new source of truth. Both imports already exist in the file.
- **Popup-only (recommended, open question 1):** no render change in the card. A `citizen_buy` offer draws exactly what `"citizen"` draws today. Comment at the card's `offer.kind === "buy"` check: "citizen_buy is drawn by the popup only (0409, owner ruling …)".
- **If the owner picks "card too":** the card draws its existing `renderBuyCta()` for `citizen_buy` too, with the citizen button text from open question 3, in the same place as the non-citizen button (under the status line). ⚠️ It then touches the same card render as `0407` (thank-you for paid citizens). Build 0409 first and 0407 after, one after the other.

### 3. The popup (`src/client/CitizenshipExplainerModal.ts`)

- New `case "citizen_buy"` in `renderAction()`, at the bottom, above Close (the Close button stays last):
  - (if kept, open question 4) `<p id="citizenship-explainer-already-citizen">` "Вы уже гражданин."
  - `<h3 id="citizenship-explainer-citizen-buy-title">` new heading (open question 2)
  - `<button id="citizenship-explainer-citizen-buy" class="primary-btn">` new button text + ` — ${offer.price}` (open question 3), price shown as for non-citizens
  - the same error line as today (`citizenship_paid.purchase_error`) under it, on an `"error"` result
- The tap goes through the card (`card.buyCitizenship(...)`), so it uses the same purchase flow, the same "one purchase at a time" latch and the same end state as every other Buy button. The tap id is new or reused, depending on open question 8. Small refactor: `onBuyTap` takes the tap id, and the error line moves into one helper used by both Buy cases. No other change to the non-citizen `"buy"` case.
- "Сейчас у вас X из 100 XP" stays `buy` / `no_product` only, so a citizen never sees it.
- No new CSS. The existing `.modal-box button` (full width) and `.primary-btn` (blue, like the login button) rules style it. The `h3` gives the spacing, as for the non-citizen Buy.
- After a successful purchase: the mid-session grant event already closes the popup, and `paidGrantConfirmed` turns the offer into `"citizen"` at once. The button cannot come back on this page.
- Class comment: one added line about the citizen Buy (task 0409).

### 4. Strings (`resources/lang/en.json` + `resources/lang/ru.json`, same keys)

- New, in `citizenship_explainer`:
  - `citizen_buy_title`: owner wording (question 2)
  - `citizen_buy_cta`: owner wording (question 3)
- `already_citizen` reused as is. `buy_title` / `citizenship_paid.buy_cta` unchanged (non-citizens).
- Exact text is written only after the owner's answers; RU is pinned by a test.

### 5. Analytics (only if open question 8 = yes)

- `flashistConstants.uiElementIds.purchasePaidCitizenshipExplainer = "PurchasePaidCitizenshipExplainer"` → event `UI:Tap:PurchasePaidCitizenshipExplainer`, fired on the citizen Buy tap (before the purchase flow, not fired when the latch says "busy", the same as the existing popup tap).
- New row in `ai-agents/knowledge-base/analytics-event-reference.md` under *UI:Tap events*, next to `PurchaseCitizenshipExplainer`. It says that `Purchase:Started/Completed/Abandoned:Citizenship` follow unchanged and do **not** tell an upgrade from a first purchase. This tap is how upgrades are counted.

## Edge cases and failure modes

- **Paid citizen on an unverified session** (the case the brief warns about): `isVerifiedRead` false → `"citizen"` → no button. Its own named test.
- **Verified paid citizen** → no button.
- **Purchase just confirmed, re-read pending or failed** (`paidGrantConfirmed`) → no button for the rest of the page.
- **Failed read / still checking / late-login re-read**: `read_failed` / `checking` are decided before the citizen branch, and verification is `"unknown"` during the late-login re-read, which reads as checking → no button.
- **No citizenship product in the catalog** → `"citizen"` (no dead button), the same as the non-citizen `no_product` rule.
- **Two taps / card + popup at once**: the card's shared latch answers `"busy"`; only one purchase runs.
- **Purchase cancelled or failed** → the error line; the button stays (retryable, the same as non-citizens).
- **The popup is open when the read or catalog lands**: it already re-renders on the offer-changed event, so the button appears or disappears live.
- ⚠️ **Known residual, same as non-citizens today, not fixed here:** a *verified* read can be stale:
  - the player paid on another device or tab after this page read the profile
  - a purchase whose server confirm never landed is re-granted only by the session-start check (reconciliation), and until that finishes the read still says "not paid"

  In both cases the button can show to someone who has just paid. The non-citizen button has the same window today. **The server does not refuse a second purchase** (point (a)), so nothing behind the client stops it. A server-side "already paid" refusal would be a separate profile-server task (open question 10). Note that it would not cover the reconciliation case either.
- **Earned date / analytics**: no false `Citizenship:Earned:XP` (point (c)). `Purchase:*:Citizenship` events now include upgrades (see section 5).
- **Phone width (~360px)**: button is full width; long RU text wraps inside the button. Checked by eye.

## Tests

`tests/client/CitizenshipOffer.test.ts`
- Fixture gets `isVerifiedRead: false, isPaidCitizen: false` defaults, so the existing tests are unchanged and must still pass.
- New:
  - verified + citizen + not paid + product → `{ kind: "citizen_buy", price }`
  - **"double-charge guard: an unverified citizen never gets a buy offer"** (unverified, paid unknown, product present) → `"citizen"`
  - verified + paid → `"citizen"`
  - `paidGrantConfirmed` + verified + not paid → `"citizen"`
  - verified + not paid + **no product** → `"citizen"`
  - precedence: `checking` beats `citizen_buy`
  - non-citizen results unchanged whatever the two new flags say

`tests/client/CitizenshipExplainerModal.test.ts` (stubbed card offer, as today)
- `citizen_buy`:
  - heading + Buy button with the price, class `primary-btn`
  - the button comes **before** `#citizenship-explainer-close` (`compareDocumentPosition`)
  - no "your XP" line; "already citizen" line present or absent per question 4
- `citizen_buy` tap → `card.buyCitizenship` with the agreed tap id; an `"error"` result → the error line; `"busy"` → nothing
- `citizen`: still no Buy button (existing test kept)
- "names nothing that is not built" also run with `citizen_buy`
- All existing non-citizen `buy` / guest / read_failed / no_product / checking tests unchanged and green

`tests/client/CitizenshipCard.test.ts` (it already has `VERIFIED_EARNED`, `VERIFIED_PAID`, `UNVERIFIED_CITIZEN` fixtures)
- verified earned citizen + product → `getCitizenshipOffer()` is `citizen_buy`; **card shows no `#citizenship-buy-button`** (popup-only), or shows it with the citizen text if the owner picks "card too"
- unverified citizen → `"citizen"`; verified paid → `"citizen"`
- after a `"granted"` purchase → `"citizen"` even when the re-read fails

`tests/client/CitizenshipExplainerLang.test.ts`
- Add `citizen_buy_title`, `citizen_buy_cta` to `REQUIRED_KEYS` (non-empty in both, same placeholders, RU differs from EN)
- Pin both RU strings to the owner's exact words
- ⚠️ This file is being edited right now by 0408's review fix. Build starts after that lands; the new keys are appended after 0408's entries.

Mutation check: temporarily drop the `isVerifiedRead` condition → the named unverified-citizen test must go red; then restore.

## Verification

1. **Plan gate:** worklog records the owner's answers to every open question (who, date, channel, words) before any string or code is written.
2. Targeted suites green: the four test files above.
3. Full `npm test` green (a red run is judged by CLAUDE.md's flake / `0197` rules, re-run and said so); `npm run lint` clean.
4. en/ru key parity green; RU strings are the owner's exact words.
5. **Local visual check** (`npm run dev`, Playwright). Dev is a guest session, so each state is set by stubbing the card's offer in the page (stubbed reads, allowed by the brief). Cases:
   - verified earned citizen: the button is above "Закрыть" and looks like the login button
   - paid citizen: no button
   - unverified citizen: no button
   - non-citizen: unchanged

   Each in RU and EN, at desktop and ~360px width. Screenshots or a yes/no per case in the worklog. **No real purchase, and no tap on any real account.**
6. **Live look** after a game deploy (build/verify split rule, 2026-09-29): open the popup on the owner's **earned** test account, check that the button is there and **do not tap it** (keeps the account earned, `0401`), plus the paid account (no button). This task closes on the local evidence.

## Seams

- **0408** (just built, same file): untouched by 0409 except `renderAction()` / the class comment. The paid-only ids stay as they are. The REQUIRED_KEYS edit comes after 0408's review fix.
- **0417** (wider popup, next): 0409 adds **no CSS**. The new button uses the existing full-width `.modal-box button` + `.primary-btn` rules, so it grows with 0417's wider box. 0417 does not touch `renderAction()`. 0417's visual check should include the `citizen_buy` state (same stub method as step 5).
- **0407** (card thank-you for paid citizens): no overlap if popup-only. If the owner picks "card too", both edit the card's `renderLoggedIn()`, so build them one after the other.

## Files to change

1. `src/client/CitizenshipOffer.ts`
2. `src/client/CitizenshipCard.ts` (inputs + comment; + render only if "card too")
3. `src/client/CitizenshipExplainerModal.ts`
4. `resources/lang/en.json`, `resources/lang/ru.json`
5. `tests/client/CitizenshipOffer.test.ts`, `tests/client/CitizenshipExplainerModal.test.ts`, `tests/client/CitizenshipCard.test.ts`, `tests/client/CitizenshipExplainerLang.test.ts`
6. Only if question 8 = yes: `src/client/flashist/FlashistFacade.ts` (one constant), `ai-agents/knowledge-base/analytics-event-reference.md` (one row)
7. Only if question 5 = "different message": also `CitizenshipPurchase.ts`, `CitizenshipRestartOffer.ts`, the restart modal and its tests (wider; see question 5)

No server, profile-server, core, nginx or HTML-template change.

## Out of scope

- Any server change: no "already paid" refusal on the intent route; the inbox "Добро пожаловать, Гражданин!" text is unchanged.
- The non-citizen Buy button (unchanged); the card (unless question 1 says otherwise); the restart popup (unless question 5 says otherwise).
- Popup width (`0417`), card thank-you (`0407`), who gets the ad-free perk (`0248`).
- Other language files (en + ru only, project rule).

## Deploy note

Client-only: it ships in the game image on the next game deploy. No server, profile-server, nginx or migration change. The owner's 2026-10-08 ruling allows a same-day deploy for 0407–0409 ("might", not a commitment). Committing and deploying stay the owner's call; nothing is committed by this task unless the owner asks.
