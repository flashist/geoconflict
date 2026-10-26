# Plan — 0495 (B3): a guest's "Log in and buy" continues straight into the purchase (citizenship first)

**Planning only. No files written.** Plan review was OFF for this run (no switch line), so there were no approver consults and no Codex pass. I consulted nobody.

## Summary (read first)
- **The plan is built on B2's code as it is in the tree on 2026-10-25.** B2 is still under stateful review. At build start, B3 re-checks B2's files. If review fixes changed the coordinator's shape beyond small mechanical changes, the build worker returns `NEEDS-DECISION`.
- **Only one surface gets "Log in and buy": the "What is citizenship?" explainer popup.** It is the only place a guest can buy today. The guest card's own **Log in** button does not change: it still reloads at once (ADR-125 point 2).
- **The OQ-1 rule is included.** `/reconcile` with `failedCount > 0` maps to `failed`, which leads to `needs_tap`. The flow never opens the payment window by itself after a failed grant.
- **A gap the spec does not name:** today `getSignedPurchases()` returns `null` both for "nothing pending" and for an SDK failure. If B3 kept that, an SDK failure would read as "none" and the flow would continue on its own, which is exactly the F5 risk. Fix: a three-way facade result (`none` / `signed` / `failed`).
- **The §15.2 items:**
  - `AUTO_CONTINUE_DEADLINE_MS = 15 000`; B5 measures the real value.
  - `HANDOFF_DELAY_MS = 5 000`.
  - The `surfaceClosed` hook is `CitizenshipExplainerModal.close()`. It covers the Close tap and Main's pre-start close (`closePreStartModals`) when a match starts.
- **No new test files.** All tests go into existing suites. **No HTML template change**: everything renders inside Lit components that are already in both templates.
- **Recommended order: B3 before B4.** B4 changes one line of `CitizenshipCard.ts` plus test fixtures, so it rebases easily onto B3. B3 is on the path to B5, the live check and the longest pole. See OP-2.
- **Nine small departures from the spec's wording, all mine.** Listed under "Deviations" so the approval covers them.

## Grounding (read this turn)
- Spec `reports/2026-10-24-design-shared-purchase-flow.md` (REV 2), read in full; ADR-125 (including the RP-1 note).
- Brief 0495; B2's `plan.md` and `worklog.md` (decision log items 1–6); B1's worklog, plan and review (`failedCount` sent only when > 0; OQ-1); B4's plan (its card hunk); 0488's `WinModal` guest login.
- B2's built code: `PurchaseCoordinator.ts`, `PurchaseOffer.ts`, `ProductClientConfig.ts`, `ProductPurchase.ts`, `CitizenshipOffer.ts`, `CitizenshipCard.ts`, `PaymentsApiClient.ts`, `PaymentsReconciliation.ts`, `PaymentsContract.ts`, and in the facade `openYandexAuthDialog`/`runAuthDialog` (`:2497-2525`) and payments (`:1814-2045`).
- Also read: `Main.ts` wiring (`:206-267`, `:385-410`), `GameRestart.ts`, `ProfileSession.ts`, `PlayerProfileView.loadPlayerProfileView`, `CitizenshipExplainerModal.ts`, `PreStartModals.ts`, `StartScreenPresence.ts`, `CitizenshipNotice.ts`, the lang sections, and the analytics reference sections.
- Wiki: no page on this flow or ADR-125 yet, so the spec is the newest source.

## How the code works today (facts the plan depends on)
- The coordinator does the logged-in path only. A `guest` offer returns `error` (`PurchaseCoordinator.ts`, the `default` branch).
- `PurchaseFlowState` and `PurchaseRequestResult` hold only B2's values (B2 decision 6).
- The card's `reread()` shows no "checking" (B2 OP-3).
- The card's profile stays `null` (guest) after a Yandex login until a re-read lands. `loadPlayerProfileView()` returns `null` only while `isYandexAuthorized()` is false. So the coordinator cannot rely on the card's offer to see that the player has just logged in. It has to remember that itself.
- `refreshProfile()` → `loadPlayerProfileView()` → `profileFetch` → `ensureSession()`. A guest boot never set the failed-login latch. A guest has no signed-player pre-fetch, so the login makes a fresh signed call, which can hang for up to 60 s.
- A successful `ensureSession()` clears the restart latch (`clearRestartLatch`). So a hand-off reload goes through on a page that has not reloaded yet.
- `CITIZENSHIP_LOGIN_SUCCEEDED_EVENT` is listened for on `document` in `Main.ts:385`. Its detail carries a `fallback`. The card fires `Profile:Login:Restart:Requested` before it dispatches.
- The explainer's guest case shows a hint and **Log in with Yandex** (→ `card.logIn`). It closes on `CITIZENSHIP_GRANTED_MID_SESSION_EVENT`. `close()` is also called by `closePreStartModals()`.
- `CitizenshipOffer`'s `guest` variant drops the price (B2's wrapper).
- `ReconcileResult` is `{ok, processedTokens} | {failed}`. It does not carry `failedCount` yet (the schema already has it, as optional).

## Steps

**0. Preconditions at build start**
- B2's stateful review is closed.
- Re-check B2's files against what this plan relies on: deps shape, `reread()`, result unions, `getProductClientConfig`.
- `npx tsc --noEmit` is clean on the tree before any edit.

**1. `src/client/flashist/FlashistFacade.ts`**
- (a) **Enum entries**, next to `PURCHASE_*_CITIZENSHIP`:
  - `PURCHASE_LOGIN_REQUESTED_CITIZENSHIP` → `Purchase:Login:Requested:Citizenship`
  - `…_LOGIN_SUCCEEDED_…` → `Purchase:Login:Succeeded:Citizenship`
  - `…_LOGIN_CANCELLED_…` → `Purchase:Login:Cancelled:Citizenship`
  - `…_LOGIN_PROFILE_FAILED_…` → `Purchase:Login:ProfileFailed:Citizenship`
  - `…_CONTINUE_READY_…` → `Purchase:Continue:Ready:Citizenship` (value = ms from the dialog closing)
  - `…_CONTINUE_NEEDS_TAP_…` → `Purchase:Continue:NeedsTap:Citizenship`
  - `…_BLOCKED_ALREADY_OWNED_…` → `Purchase:Blocked:AlreadyOwned:Citizenship`
  - No `Blocked:CannotVerify` for citizenship: the citizenship kind never answers `cannot_verify` (deviation 9).
  - All have 4 parts. The citizenship Started/Completed/Abandoned strings are unchanged.
- (b) **New tap id** `uiElementIds.purchaseLoginCitizenshipExplainer: "PurchaseLoginCitizenshipExplainer"`.
- (c) **`refreshPaymentsAfterLogin(timeoutMs): Promise<void>`**, a separate method that never touches `fetchPaymentsCatalog` or `paymentsInitPromise` (F15):
  - It runs only when the catalog status is `ready` and the SDK is present; otherwise it does nothing. ("Log in and buy" is drawn only with a price, so the status is `ready` whenever this runs.)
  - It calls `getPayments({signed:true})` and then `getCatalog()`, raced against `timeoutMs`.
  - **Within the time**, it swaps in the new payments object and rebuilds the catalog maps.
  - **On failure, timeout or a late answer**, it keeps the old object, and a late answer is thrown away.
  - It never sets the status (so never `failed`), never schedules reconciliation and never throws.
- (d) **`getSignedPurchasesResult()`** → `{kind:"none"} | {kind:"signed", signature} | {kind:"failed"}`:
  - catalog not ready, or a thrown SDK call → `failed`;
  - an empty array → `none`;
  - a non-empty array with no signature → `failed`.
  - `getSignedPurchases()` becomes a thin wrapper over it (`signed` → `{signature}`, otherwise `null`), so the boot pass behaves byte-for-byte as before (deviation 5).

**2. `src/client/PaymentsApiClient.ts`**
- `ReconcileResult.ok` gains `failedCount: number`, set from `parsed.data.failedCount ?? 0`. A box from before B1 never sends it, which reads as 0; an old box answers 500 on a failure, which is already `failed`.

**3. `src/client/PaymentsReconciliation.ts` — new `reconcilePurchasesNow(timeoutMs): Promise<ReconcileNowResult>`**
- `ReconcileNowResult` = `"processed" | "none" | "failed" | "timeout"`.
- It ignores the once-per-session latch and does not wait for the init gate (the init gate is long past when a player taps).
- Kill switch off → `failed`, with no POST. That is the fail-closed choice, and it cannot be reached because the popup refuses to open then.
- The facade's three-way result:
  - `none` → `none`;
  - `failed` → `failed`;
  - `signed` → `reconcilePurchases`.
- Reconcile answer:
  - `failed` → `failed`;
  - `ok` with tokens → dispatch `PURCHASES_RECONCILED_EVENT`, then consume each token in the background (not awaited);
  - **`failedCount > 0` → `failed`** (OQ-1). Any tokens that did succeed are still signalled and consumed, because their grants are committed.
  - otherwise `processed` if any tokens came back, else `none`.
- The whole call is raced against `timeoutMs` → `timeout`. A late finish still dispatches the event and consumes, which is the spec's late re-read path.
- The boot pass `schedulePaymentsReconciliation` is unchanged.

**4. `src/client/ProductPurchase.ts`**
- `runProductPurchase(productId, options?: { mayOpenPaymentWindow?: () => boolean })`.
- The guard runs **after** `/intent` succeeds and **before** `purchaseCatalogItem`. If it returns false, the result is the new `"not_opened"`: no Started, no Abandoned, no frame. The unused intent row is harmless.
- Without the option, behaviour is identical to B2's.
- `CitizenshipPurchase.ts` maps `not_opened` to `"error"`. It cannot be reached without the option.

**5. `src/client/ProductClientConfig.ts`**
- `ProductAnalytics` gains `loginRequested`, `loginSucceeded`, `loginCancelled`, `loginProfileFailed`, `continueReady`, `continueNeedsTap`, `blockedAlreadyOwned`, and `blockedCannotVerify: string | null`. All are filled for citizenship except `blockedCannotVerify: null`.
- New field `alreadyOwnedLineKey`. For citizenship it is `citizenship_explainer.already_citizen`; items will use the generic `purchase_flow.already_owned`.
- It stays a lazy getter (B2 decision 1).

**6. `src/client/PurchaseCoordinator.ts` — the guest path (spec §4.3 steps 3–8 and 12)**
- **New exported constants:** `AUTO_CONTINUE_DEADLINE_MS = 15_000` and `HANDOFF_DELAY_MS = 5_000`.
- **Wider types:** `PurchaseFlowState` gains `logging_in`, `login_cancelled` and `needs_tap`; `PurchaseRequestResult` gains `login_cancelled` and `needs_tap`.
- **New deps:** `openAuthDialog`, `refreshPaymentsAfterLogin`, `ensureSession`, `reconcileNow`, `requestLoginRestart`, `now`, `setTimer` (returns a cancel function), `autoContinueDeadlineMs`, `handOffDelayMs`, `productAnalytics(productId)` and `logEvent(event, value?)`.
- **New method:** `surfaceClosed(productId)`.
- **Guest-flow memory, in memory only:** `{productId, loggedInAt, prepare: Promise, closedDuringRun, handOffCancel, pendingEnd}`. There is at most one, because there is one latch.

**`requestPurchase` order:**
1. `busy` check, take the latch, log the tap. This part is B2's.
2. **Continuation:** if guest-flow memory exists for this product (a tap after `needs_tap` or after `error`):
   - cancel the hand-off timer;
   - set state `preparing`;
   - await `prepare` with **no deadline**: the player has tapped, and the work already started in the background;
   - then go to step 6 below with no deadline, and with `mayOpenPaymentWindow = () => !closedDuringRun`.
3. Otherwise derive the offer from the snapshot:
   - not `guest` → B2's logged-in path, unchanged; it never hands off;
   - `guest` with `!canLogIn` → `error`.
4. **Login:**
   - set state `logging_in` and log `loginRequested`, then `await deps.openAuthDialog()`, which is the facade's single-flight dialog;
   - `false` → log `loginCancelled` and end at `login_cancelled`, with no memory and never a hand-off;
   - `true` → log `loginSucceeded`. **The deadline starts:** `deadlineAt = now() + autoContinueDeadlineMs`. Store the memory and set state `preparing`.
5. **`prepare` starts at once and keeps running in the background:**
   - `Promise.all([refreshPaymentsAfterLogin(5000), ensureSession()])` — run in parallel (deviation 2);
   - a `null` session → `"profile_unavailable"`;
   - otherwise `await reconcileNow(10_000)`.
   - Its inner timeouts are fixed (deviation 3). The coordinator races `prepare` against the time left (`withinDeadline`, built on `setTimer`); a deadline of 0 or less means an immediate `needs_tap`.
   - **Results:**
     - deadline passed → `needs_tap`;
     - `profile_unavailable` → `await reread()` (fast: the session is already latched, so the card shows "couldn't load" with **Restart game**), log `loginProfileFailed`, end at `profile_unavailable`, and clear the memory: no hand-off, ever;
     - reconcile `failed` or `timeout` → `needs_tap` (F5);
     - `processed` or `none` → continue.
   - After every step, if the surface has closed → `needs_tap` (deviation 4).
6. **Read:** `reread({ showChecking: true })` within the time left. A timeout → `needs_tap`.
7. **Decide** on the fresh snapshot:
   - `buy` → log `continueReady` with value `now() - loggedInAt` (auto path only);
   - `owned` → `already_owned` and log `blockedAlreadyOwned`;
   - `cannot_verify` → `cannot_verify`, and log `blockedCannotVerify` if it is not null;
   - `read_failed` → `profile_unavailable` (also logs `loginProfileFailed`; deviation 9) and clear the memory;
   - still `checking` → `needs_tap`;
   - `guest` or `no_product` → `error`.
8. **Intent and pay:**
   - set state `paying`, then `runProductPurchase(productId, { mayOpenPaymentWindow: () => !closedDuringRun && now() < deadlineAt })`;
   - `not_opened` → `needs_tap`;
   - `already_owned` (409) → `already_owned` and log `blockedAlreadyOwned`;
   - `error` → `error`;
   - `granted` → B2's grant block (`markGranted` → `PURCHASE_GRANTED_EVENT` → `reread`), then clear the memory.
9. **Whenever the flow ends at `needs_tap`:** log `continueNeedsTap` once.

**Hand-off (step 12), applied when a run ends while guest-flow memory exists:**

| End | Rule |
|---|---|
| `granted` | Clear the memory. No hand-off; the restart popup takes over (B2). |
| `profile_unavailable` | Clear the memory. Never a hand-off. |
| `already_owned`, `cannot_verify`, `error` | If the surface closed during the run → hand off now. Otherwise arm `setTimer(handOff, handOffDelayMs)`. |
| `needs_tap` | If the surface closed → hand off now. Otherwise no timer; wait for `surfaceClosed`. |

- `handOff()`:
  - cancels the timer;
  - clears the memory;
  - sets the state to `idle`;
  - calls `deps.requestLoginRestart()`.
- It runs once.

**`surfaceClosed(productId)`:**
- While a run is in progress → set `closedDuringRun`. This also stops the payment window from opening.
- With memory present in an end state that hands off → `handOff()` now.
- In every case where no run is in progress → set the product's state to `idle`, so a re-opened popup starts clean.

- **Comment:** the file's header line ("the guest path … is task 0495's") is updated.

**7. `src/client/CitizenshipCard.ts`**
- `reread(options?: { showChecking?: boolean })`. With `showChecking`, it first calls `publishProfileVerificationStatus("unknown")` and `requestUpdate()`, exactly like the late-auth path (`rereadWhenYandexAuthorizesLate`), then calls `refreshProfile()`. Without it, behaviour is B2's.
- `PurchaseProfileSource.reread` gains the same optional parameter.
- New public `requestLoginRestart()`:
  - logs `PROFILE_LOGIN_RESTART_REQUESTED`;
  - dispatches `CITIZENSHIP_LOGIN_SUCCEEDED_EVENT` (bubbling, composed) with `fallback: () => void this.refreshProfile()`;
  - `logIn()`'s existing success block calls it, so there is one copy and the plain login behaves identically.
- `logIn()` gets no "for purchase" mode: the coordinator calls the facade's dialog directly (deviation 1).
- The guest card's render does not change.
- The doc comment on `CITIZENSHIP_LOGIN_SUCCEEDED_EVENT` gains "or the purchase flow's hand-off (ADR-125)".

**8. `src/client/CitizenshipOffer.ts`**
- The `guest` variant carries `price: string | null`; the wrapper stops dropping it. That is the only change.

**9. `src/client/CitizenshipExplainerModal.ts`**
- **Guest action area** (OP-1, recommendation a):
  - With `canLogIn` and a price → primary button `citizenship-explainer-login-and-buy`: "Log in and buy — {price}". It calls `getPurchaseCoordinator()?.requestPurchase({productId:"citizenship", tapElementId: purchaseLoginCitizenshipExplainer})` and sets `isGuestFlowFromThisPopup = true`.
  - The plain **Log in with Yandex** button stays underneath as a secondary button, unchanged, and still goes to `card.logIn` (the D3 reload).
  - With no price → today's guest area exactly (deviation 6).
- **While `isGuestFlowFromThisPopup`** and the coordinator's state for citizenship is not `idle`, the action area draws from the flow state:

| State | Shown |
|---|---|
| `logging_in` / `preparing` / `paying` | its line |
| `login_cancelled` | its line + the "Log in and buy" button again |
| `needs_tap` | its line + "Buy Citizenship — {price}" → coordinator (tap id `purchaseCitizenshipExplainer`) |
| `error` | its line + the same Buy button |
| `already_owned` | `alreadyOwnedLineKey` (citizenship: "You are already a citizen.") |
| `cannot_verify` | its line |
| `profile_unavailable` | `citizenship_status.read_failed` + a **Restart game** button that uses the existing `restartAfterProfileReadFailure` (deviation 8) |

- `show()` resets `isGuestFlowFromThisPopup`.
- It listens for `PURCHASE_FLOW_STATE_EVENT`, which triggers `requestUpdate`.
- **`close()` calls `getPurchaseCoordinator()?.surfaceClosed("citizenship")`.** This is the §15.2 item 3 hook: the Close tap, and `closePreStartModals()` when a match starts.
- It closes on `PURCHASE_GRANTED_EVENT` for `productId === "citizenship"`. The mid-session listener stays for tenure and for citizenship purchases, but ignores a purchase whose `productId` is another product (spec §4.1).
- The logged-in Buy and citizen_buy paths (through `card.buyCitizenship`) and their `purchaseError` line are unchanged.

**10. `src/client/Main.ts`**
- New coordinator deps:
  - `openAuthDialog` → the facade;
  - `refreshPaymentsAfterLogin` → the facade;
  - `ensureSession` → `ProfileSession`;
  - `reconcileNow` → `reconcilePurchasesNow`;
  - `requestLoginRestart` → the `citizenship-card` element's `requestLoginRestart()` if present;
  - `now: Date.now`;
  - `setTimer` → `setTimeout` / `clearTimeout`;
  - the two constants;
  - `productAnalytics` → `getProductClientConfig(id).analytics`;
  - `logEvent` → `flashist_logEventAnalytics`.
- The listener at `:385` does not change. Its comment gains "or the purchase hand-off (ADR-125)".

**11. Comment-only fixes made necessary by ADR-125** (code-comments rule)
- The `GameRestart.ts` header line "This can only ever run from the player's OWN press of the card's login button" gains "…or the hand-off after a 'Log in and buy' that ended without a grant (ADR-125)".
- The same addition goes into the D3 block in `ProfileSession.ts`.
- No logic changes in either file.

**12. Lang: `resources/lang/en.json` + `ru.json`** (copy is mine; the plan approval covers it, edit freely)
- `citizenship_paid.login_and_buy_cta`: "Log in and buy" / "Войти и купить" (rendered as "— {price}", like `buy_cta`)
- `purchase_flow.logging_in`: "Logging in…" / "Входим в аккаунт…"
- `purchase_flow.preparing`: "Getting your purchase ready…" / "Готовим покупку…"
- `purchase_flow.paying`: "Waiting for the payment…" / "Ждём оплату…"
- `purchase_flow.login_cancelled`: "Login didn't finish — try again." / "Вход не завершён — попробуйте ещё раз."
- `purchase_flow.needs_tap`: "Tap the button below to continue your purchase." / "Нажмите кнопку ниже, чтобы продолжить покупку."
- `purchase_flow.already_owned`: "You already own this." / "Это у вас уже есть." (items; citizenship uses the existing `already_citizen`)
- `purchase_flow.cannot_verify`: "We couldn't confirm your account this time. Closing and reopening the game usually helps." / "Не удалось подтвердить ваш аккаунт в этот раз. Обычно помогает закрыть игру и открыть её снова."
- `purchase_flow.error`: "Purchase not completed — try again." / "Покупка не завершена — попробуйте ещё раз."

**13. `ai-agents/knowledge-base/analytics-event-reference.md`**
- Citizenship Events: add rows for the seven new events (when each fires, the ms value on `Continue:Ready`, and that `NeedsTap` also covers "popup closed before the payment window").
- UI:Tap: add a row for `PurchaseLoginCitizenshipExplainer`, and note that the `needs_tap`/retry Buy reuses `PurchaseCitizenshipExplainer`.
- Profile Login Restart: amend the `Requested` row. On the "Log in and buy" path it fires at the hand-off, not when the dialog succeeds, so "exactly one outcome follows" still holds.
- Explainer funnel note: add `Login:Requested → Login:Succeeded → Continue:Ready → Started → Completed`.
- Note that there is no `Blocked:CannotVerify:Citizenship`, and why.

**Not changed:**
- `PurchaseOffer.ts`;
- `src/core`, every server file and migration;
- both HTML templates;
- `GameRestart.ts`/`ProfileSession.ts` logic;
- the `CitizenshipRestartOffer`/`Modal` (B2's popup after every grant already covers the guest path);
- `WinModal.ts`;
- the guest card's render and the plain-login fallback (ADR-125 point 2; the §1b "no checking" gap on that path is left as it is today).

## Deviations from the spec's wording (mine; the approval covers them)
1. **No "for purchase" mode on `card.logIn`.** The coordinator calls `openYandexAuthDialog` directly (the spec's own deps type). Same outcome: the purchase login never dispatches the login-succeeded event by itself.
2. **The payments refresh and `ensureSession` run in parallel**, not one after the other. They are independent, and it saves seconds within the 15 s.
3. **The inner timeouts are fixed** (5 s refresh, 10 s reconcile) and the deadline is raced outside them. The spec bounds them by "min(…, time left)". With fixed timeouts, a tap after `needs_tap` still gets a real reconcile.
4. **Closing the popup before the payment window opens stops the flow at `needs_tap`, and the hand-off runs at once.** The spec is silent on this. It means no payment window opens over a closed popup.
5. **A three-way `getSignedPurchasesResult`**, so an SDK failure is `failed`, not `none` (F5).
6. **"Log in and buy" needs a catalog price.** With no price, the guest area is today's plain login.
7. **`Profile:Login:Restart:Requested` fires at the hand-off**, which keeps its "one outcome follows" contract.
8. **A Restart game button in the popup on `profile_unavailable`**, guest flow only. The spec says "the line with its Restart game button"; today that button lives only on the card, behind the popup.
9. **`Login:ProfileFailed` also fires when the read fails after the login** (the spec names only a null `ensureSession`), and **citizenship gets no `Blocked:CannotVerify` entry** because it can never fire.

## Tests (all in existing files; no new test file)
- **`tests/client/PurchaseCoordinator.test.ts`**
  - `setup()` gains defaults for the new deps (setup only; B2's assertions are unchanged).
  - New `describe("guest path (task 0495)")` with a fake clock and fake timers in the deps:
    - **happy path:** guest buy → `granted`, one dialog, **never `requestLoginRestart`**; event order `Login:Requested → Login:Succeeded → Continue:Ready(value)`; states `logging_in → preparing → paying → granted`.
    - **login:** cancelled → `login_cancelled`, no session or intent, never a hand-off; `!canLogIn` → `error` with no dialog.
    - **deadline:** passing during `ensureSession`, during reconcile, during the read, and **after `/intent` but before `purchase()`** (the guard returns false) → `needs_tap` with no frame. A deadline of 0 → `needs_tap` at once, with `prepare` still started.
    - **reconcile:** `failed`, `timeout` and `failedCount`-driven `failed` → `needs_tap`; `processed` and `none` → continue.
    - **session and read:** `ensureSession` null → `profile_unavailable`, `ProfileFailed`, one re-read, no intent, no hand-off even after the delay or a `surfaceClosed`.
    - **offer after login:** `owned` → `already_owned` and `Blocked:AlreadyOwned`; `cannot_verify` (test durable product) → `cannot_verify`; `read_failed` → `profile_unavailable`; 409 → `already_owned`.
    - **hand-off timing:** `error` → hand-off exactly at `handOffDelayMs`, not before; `surfaceClosed` before that → at once, once. A Buy tap inside the delay cancels the timer and re-runs from the read (no second login, no deadline), and it re-arms when that run ends in `error`. A continuation that ends `granted` → no hand-off.
    - **`needs_tap`:** never a timer; `surfaceClosed` → hand-off once.
    - **popup closed:** during `preparing` → no frame and an immediate hand-off; during `paying` or after the grant → none.
    - **after hand-off and latch:** a hand-off leaves the state `idle` and a new tap starts fresh; a second request during `logging_in` → `busy`; the logged-in path never hands off, even on `error`.
- **`tests/client/ProductPurchase.test.ts`** — the guard: false → `not_opened`, with no Started and no `purchaseCatalogItem`; true or absent → as before.
- **`tests/client/PaymentsReconciliation.test.ts`** — `reconcilePurchasesNow`:
  - kill switch off → `failed` with no POST;
  - catalog not ready or SDK failure → `failed`;
  - nothing pending → `none`;
  - processed → `processed`, the event fires and consumes do not block;
  - `failedCount > 0` → `failed`, with the processed tokens still signalled and consumed;
  - HTTP failure → `failed`;
  - timeout → `timeout`, and the late finish still dispatches;
  - it ignores the boot latch (runs after the boot pass, and twice).
  - The boot-pass tests are unchanged.
- **`tests/client/PaymentsApiClient.test.ts`** — `failedCount` passed through; missing reads as 0.
- **`tests/client/FlashistFacade.test.ts`**
  - `refreshPaymentsAfterLogin`:
    - success swaps the object and catalog while the status stays `ready`, and no reconcile is scheduled;
    - failure keeps the old object and `ready` (never `failed`);
    - a timeout keeps the old object and drops the late answer;
    - catalog not ready, or no SDK → no SDK call.
  - `getSignedPurchasesResult`: all three outcomes.
  - `getSignedPurchases` behaves as before.
- **`tests/client/CitizenshipCard.test.ts`**
  - `reread({showChecking:true})` shows `citizenship-status-checking` during the read, then the real state; without the option, no checking (B2).
  - `requestLoginRestart()` fires `Restart:Requested` and dispatches the event with a fallback that re-reads.
  - The guest-offer assertions gain `price` (2 places).
  - The plain-login tests are unchanged.
- **`tests/client/CitizenshipOffer.test.ts`** — the guest rows carry `price` (2 places).
- **`tests/client/CitizenshipExplainerModal.test.ts`**
  - "Log in and buy — {price}" calls the coordinator with the new tap id; the plain Log in still calls `card.logIn` (the existing test is kept under OP-1a, and changes under OP-1b).
  - No price → today's guest area.
  - Each flow state renders its line and buttons, and their taps go to the coordinator.
  - `close()` calls `surfaceClosed("citizenship")`, for the Close tap and through `closePreStartModals`.
  - `show()` resets the flow view.
  - Closes on `PURCHASE_GRANTED` for citizenship; ignores a mid-session purchase of another product.
- **`tests/client/CitizenshipExplainerLang.test.ts`** — `REQUIRED_KEYS` gains the 9 new keys (en and ru non-empty, matching placeholders).
- **`tests/client/ProductClientConfig.test.ts`** — the new analytics fields equal the new enum strings (no inline strings); citizenship has `blockedCannotVerify === null` and `alreadyOwnedLineKey`.
- **Unchanged, must stay green:** `GameRestart.test.ts`, `CitizenshipPurchase.test.ts`, `PurchaseOffer.test.ts`, `CitizenshipRestartOffer`/`Modal`, `WinModal.test.ts`, `PreStartModals.test.ts`.

## Checks to run
1. Targeted while building (no lock): `npm test -- <each file above>`.
2. `npx tsc --noEmit -p tsconfig.json`. Required, because jest/SWC does not type-check, and this is where the "a missing config field fails to compile" guarantee is enforced. The tree also holds 0488, 0491, 0492 and 0494, so the run must be clean before the build starts (step 0).
3. `npm run lint`, plus `npx prettier --check` on the changed files.
4. Full `npm test`, **once**, through the npm script (project lock, 1 worker, shell harnesses included). A single supertest `Exceeded timeout of 5000 ms` is judged by the flake rule: re-run and say so.
5. Local `npm run dev` with headless Playwright, **limited**: with no Yandex SDK locally the guest has `canLogIn: false`, so no "Log in and buy" can appear. The check only proves that the popup and card render as before (the guest hint, and the logged-in view if dev is authorized). I will report the guest path as **not checked locally**, not as passed.
- **Skipped, with reasons:**
  - `npm run test:integration` and the profile-server suites: no server change;
  - `test:scripts:docker` and `check:config-parity`: no infra or env change;
  - a real login and purchase: needs the Yandex SDK; that is B5 (0498).

## Edge cases / failure modes
- **Late answers:**
  - A late reconcile → `PURCHASES_RECONCILED_EVENT` → the card re-reads, so an earlier grant flips the offer to owned before the tap.
  - A late refresh is thrown away.
- **Read collision:** the card's read guard can drop our re-read in favour of a newer read that is still in flight. The decision then sees `checking` → `needs_tap` (one extra tap). Rare, and safe.
- **Shared dialog:** the facade's single-flight latch would let the card's plain login and the purchase login share one dialog. Then the card would dispatch D3 and the page would reload mid-flow. This cannot be reached through the UI: the popup overlay covers the card, and the WinModal login runs only during a match. Accepted residual.
- **Hand-off at a lobby or match start:** `requestGameRestart`'s match guard falls back to a re-read. The 5 s timer runs only while the popup (an overlay) is open, and closing the popup hands off at once, so the "join being set up" window is not reachable.
- **Account switch:** `ensureSession` drops a token minted for another id. The residual §7 names (a switch made outside the game between the intent and `purchase()`) is unchanged and belongs to 0394.
- **Reconcile racing:** the boot reconcile and `reconcilePurchasesNow` running at once is harmless (idempotent per token).
- **No catalog or kill switch off:** no "Log in and buy" with no price, and no popup at all with the kill switch off. Unchanged.
- **D3's failed-login latch is untouched.** `profile_unavailable` never reloads by itself; the player taps Restart.
- **Old profile box** (B3 deployed before B1's box deploy): `/reconcile` 500s on any failing entry → `failed` → `needs_tap`. Safe. A missing `failedCount` reads as 0.
- **One product today:** a guest-flow memory for product A while product B is tapped cannot happen yet. Item builds revisit it.

## Sequencing, review scope, deploy
- **Order:**
  - B2's build and review close **before** B3's build.
  - **B3 before B4** (OP-2). Never both at once in one tree.
  - 0488 is done and its hunks are disjoint from B3's (facade enum section, lang, analytics reference Ad block).
- **Review scope:** the tree holds uncommitted 0488, 0491, 0492 and 0494 work, and B3 edits B2's still-uncommitted files. The B3 reviewer has to be scoped to B3's hunks unless the owner commits B2 first (OP-3).
- **Deploy:**
  - **game deploy only** (client); **ships with or after B2**, in a **weekend slot** unless urgent;
  - it does **not** need B1's or B4's box deploy;
  - committed is not deployed;
  - **B5 (0498)** is the live check: no second tap, the grant lands on the account that just logged in, the restart popup after the purchase, cancel → message then one reload, and the measured login-to-payment time sets the deadline.
  - If Yandex needs a fresh tap: set `AUTO_CONTINUE_DEADLINE_MS = 0` (one constant, one more tap).

## Open points for the owner (recommendations are mine, the coder's)
- **OP-1 — the guest's buttons in the "What is citizenship?" popup.** Today a guest sees one button, "Log in with Yandex", which logs in and reloads.
  - (a) **Rec:** "Log in and buy — {price}" as the main button, with the plain "Log in with Yandex" kept underneath. A guest who only wants to earn XP for free never sees a payment window.
  - (b) Only "Log in and buy". Simpler, but a guest who only wanted to log in gets a payment window, cancels, sees "Purchase not completed", and then reloads.
  - Knock-on: none (checked). This is not a placement question.
- **OP-2 — build order B3/B4** (they share `CitizenshipCard.ts`).
  - (a) **Rec: B3 first.** Knock-on: 0496 (B4) waits for 0495's build and review, and 0497 (B4v) waits a little longer. 0486, 0010 and 0011 wait on both anyway, so they are unchanged. 0498 (B5, the long pole) is not delayed. All on Sprint 9; no cross-sprint knock-on.
  - (b) B4 first. Knock-on: 0495 waits for 0496's build and review, so 0498 moves later. 0486, 0010 and 0011 are unchanged. All on Sprint 9.
- **OP-3 — commit B2 (with the other closed tasks' work) before B3's build?** Only you authorize commits.
  - (a) **Rec: yes, after B2's review closes.** B3's review diff is then B3 alone.
  - (b) No. The reviewer scopes by hunks, as for B2, which is harder because B3 edits B2's uncommitted files.
  - Knock-on: none (checked).
