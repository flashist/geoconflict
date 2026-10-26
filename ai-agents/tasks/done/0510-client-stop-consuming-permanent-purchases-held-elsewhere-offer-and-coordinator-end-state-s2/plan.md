## 0510 (S2, client): implementation plan. Plan only; I wrote no source and no files.

**Summary**
- **The entry gate is not met as written.** The brief says "S1's contract merged (0506)". S1 is built but **uncommitted and still under review**. Also, 0507's client work (also uncommitted) sits in the same working tree, in three files S2 must edit: `FlashistFacade.ts`, `en.json`/`ru.json`, and `analytics-event-reference.md`. Building now would mix three tasks' diffs in one tree and one review scope. The brief's own rule against building 0501 alongside S2 points the same way. → Q3.
- **S2 is client-only.** No `src/core` change, no server change, no new template HTML elements: the new elements are rendered by Lit inside the card and the explainer. No new test files: every test goes into an existing suite.
- **Bound on `ensureSession()` confirmed (spec §14 item 5).**
  - On a guest page it answers null with no network call and no login. `isYandexAuthorized()` awaits the init-player promise, which is already resolved before the boot pass's init gate; it then reads `isAuthorized()` synchronously.
  - On a logged-in page it joins the one login that `startProfileSession()` already started.
  - A failed login stays latched to null (login rule D3) and is never retried.
- **The test copy's API base: the dev and prod env files hold the same profile domain.** Read-only check: `.env.dev` and `.env.prod` carry an identical `PROFILE_API_URL`, and none of `.env`, `.env.secret` or `.env.dev.secret` overrides it. `deploy.sh` loads `.env.$ENV`. **Caveat:** that is the local file. The dev box serves whatever its last dev deploy forwarded, at `/api/env`. The owner can confirm the reconcile POST's host in the network tab during T1.
- **Contact surface: I recommend the Telegram and VK links that 0507 uses** (`TELEGRAM_CHANNEL_URL`/`VK_CHANNEL_URL`, both already committed), but with S2's own text keys. The alternative is the in-game feedback form → Q2.
- **On 0501:** S2 does cover the logged-in path **once the boot pass has answered**: Buy is hidden, and a tap that races the render ends at `held_elsewhere`. It does **not** cover a logged-in tap **before** the boot pass answers (residual R3). That stays 0501's job.
- **Nine small departures from the spec, plus one residual** — listed below, for approval.

---

### Sources read
- Brief.
- Spec rev 2, all of it.
- ADR-126.
- 0506's `plan.md` and `worklog.md`.
- `PaymentsContract.ts` as built.
- `Routes.ts`: the CORS on payments allows `Authorization`, with origin `*`.
- Client: `PaymentsApiClient`, `PaymentsReconciliation`, `ProductPurchase`, `PurchaseCoordinator`, `PurchaseOffer`, `CitizenshipOffer`, `ProductClientConfig`, `CitizenshipCard`, `CitizenshipExplainerModal`, `ProfileSession`, `FlashistFacade` (init, payments, auth, enum), `Main.ts` wiring, `PlayerMessageModal` (0507), `FeedbackModal`.
- The existing client tests.
- Wiki: nothing on ADR-126 yet (not ingested), so the spec and ADR are the ground truth.

### Spec sections implemented
- §4.4 (client half).
- §4.5 (client: optional Bearer).
- §4.6 (store, offer, coordinator, surfaces).
- §5 (client stubs).
- §7 rows 1–8 and 12–14 (client side).
- §9 (B2/B3 edits).
- §11 (analytics).
- §12 S2 and its client *Testing strategy*.

### Step by step

**1. `src/client/PaymentsApiClient.ts`**
- `postJson(path, body, headers?)` gains an optional extra-headers argument.
- `reconcilePurchases(signature, sessionToken: string | null)`:
  - adds `Authorization: Bearer <token>` only when the token is not null;
  - never uses `profileFetch`, so it never re-logs in on a 401 and never starts a login.
- `ReconcileResult` `ok` becomes `{processedTokens, grantedTokens: string[] | null, consumeTokens: string[], heldElsewhere: PaymentProductId[], failedCount}`:
  - absent `grantedTokens` → `null` (an old box);
  - absent `consumeTokens` / `heldElsewhere` → `[]`.
- Fix the comment block that now reads wrong ("`complete` and `reconcile` must NOT [carry a Bearer]"). It should say WHY the Bearer is optional on reconcile and never required.
- Also fix `reconcilePurchases`' "every token now safe to consume" doc.

**2. `src/client/PaymentsReconciliation.ts`**
- **Store.** Add a module-level `heldElsewhereProducts: Set<PaymentProductId>`, plus `getHeldElsewhereProducts(): ReadonlySet` and a private `recordHeldElsewhere(ids)`.
  - The set only grows within a page.
  - On each **new** id it fires `Purchase:HeldOnOtherProfile:<product>` through `getProductClientConfig(id).analytics.heldOnOtherProfile`. The add-only set makes that at most once per page per product, across both passes.
  - Any change dispatches `PURCHASE_OFFER_CHANGED_EVENT`.
  - `resetPaymentsReconciliationForTests` clears the set.
- **Boot pass.**
  - signed list → `null` → return, **before** any session wait (deviation 6);
  - `sessionToken = await ensureSession()` once, in try/catch → null;
  - `reconcilePurchases(sig, token)`;
  - `recordHeldElsewhere`;
  - `hasFreshGrant = grantedTokens === null ? processedTokens.length > 0 : grantedTokens.length > 0`;
  - dispatch `PURCHASES_RECONCILED_EVENT` only when `hasFreshGrant` is true;
  - consume `consumeTokens` only. An old box sends none, so nothing is consumed.
- **`reconcilePurchasesNow` / `runReconcileNow`.**
  - Same session, store, event and consume rules.
  - Result precedence: `pending_ungranted` (failedCount > 0) > `held_elsewhere` (heldElsewhere non-empty) > `processed` (fresh grant only) > `none`.
  - The signature (one `timeoutMs` argument) is unchanged, so `Main.ts` is untouched.
- `ReconcileNowResult` gains `"held_elsewhere"`.
- Fix the header, `PURCHASES_RECONCILED_EVENT` and result-doc comments that now read wrong (they still say "consumed here so they stop reappearing").

**3. `src/client/ProductPurchase.ts`**
- Call `consumePurchase` only when `completed.consume === true`. False or absent consumes nothing.
- The restart prompt and `Completed` are unchanged.
- Fix the header ("→ consume") and the consume comment.

**4. `src/client/PurchaseOffer.ts`**
- `PurchaseOffer` gains `{kind:"held_elsewhere"}`.
- `PurchaseProfileSnapshot` gains `heldElsewhere: ReadonlySet<PaymentProductId>` (required).
- In `deriveOfferForKind`: if the kind-specific answer is `buy` and `heldElsewhere.has(productId)`, answer `held_elsewhere`. This covers both kinds, sits below `owned` / `paidGrantConfirmed`, and is never reached for a guest (deviation 1).

**5. `src/client/CitizenshipOffer.ts`**
- `CitizenshipOfferInputs` gains `heldElsewhere`, passed through by `toPurchaseProfileSnapshot`.
- `CitizenshipOffer` gains `held_elsewhere`.
- This sits above the `citizen_buy` mapping, so an earned citizen whose paid purchase is held elsewhere also gets the line.

**6. `src/client/ProductClientConfig.ts`**
- `ProductAnalytics` gains `heldOnOtherProfile` and `blockedOtherProfile` (citizenship → the two new enum entries).

**7. `src/client/PurchaseCoordinator.ts`**
- `PurchaseFlowState` and `PurchaseRequestResult` gain `"held_elsewhere"`.
- A `heldElsewhere(productId)` helper logs `blockedOtherProfile` and ends at `held_elsewhere`.
- **Logged-in path:** `case "held_elsewhere"` → that helper. Nothing pays.
- **Guest auto-continue:** `PrepareResult` gains `"held_elsewhere"` (deviation 2), which `prepareAfterLogin` returns when `reconcileNow` says so. `continueGuestFlow` lets it through to the fresh read instead of stopping at `needs_tap`. Then:
  - read offer `held_elsewhere` → the end state;
  - `owned` → `already_owned`;
  - `buy` → **`needs_tap`**: a different product is held; never an automatic payment window after a held-elsewhere answer.
- **Tap re-check:** `held_elsewhere` goes on to the read, which derives `held_elsewhere` for this product → the end state. If another product is held, this product's Buy proceeds; the check is per product.
- **Hand-off:** `settleGuestFlow` already treats every result other than granted / profile_unavailable / needs_tap as "timer, then login restart". So `held_elsewhere` gets exactly `already_owned`'s timing with no code change; tests pin it.

**8. `src/client/CitizenshipCard.ts`**
- `gatherOfferInputs` adds `heldElsewhere: getHeldElsewhereProducts()`, so `snapshot()` carries it too.
- `renderLoggedIn`: `offer.kind === "held_elsewhere"` → `renderHeldElsewhere()`. It draws the line `#citizenship-held-elsewhere` and two links, `#citizenship-held-elsewhere-telegram` and `#citizenship-held-elsewhere-vk`. Each link opens in a new tab with `rel=noopener`, and on click calls `logUiTapEvent(uiElementIds.telegramLinkHeldElsewhere / vkLinkHeldElsewhere)`.
- Listen for `PURCHASE_OFFER_CHANGED_EVENT` with a **size guard**: `requestUpdate()` only when the store's size differs from the last size rendered. The card itself fires that event from `updated()`, so an unguarded listener would loop forever (deviation 3). Remove the listener in `disconnectedCallback`.
- `buyCitizenship`: a `held_elsewhere` result returns without setting `purchaseError` (deviation 9).

**9. `src/client/CitizenshipExplainerModal.ts`**
- `renderAction`: `case "held_elsewhere"` → the line + the same two links, with ids `citizenship-explainer-held-elsewhere[-telegram|-vk]`.
- `renderGuestFlow`: `case "held_elsewhere"` → the same line + links.
- I use the same two UI ids on both surfaces (no per-surface split).

**10. `src/client/flashist/FlashistFacade.ts`** (enum only)
- `PURCHASE_HELD_ON_OTHER_PROFILE_CITIZENSHIP: "Purchase:HeldOnOtherProfile:Citizenship"`
- `PURCHASE_BLOCKED_OTHER_PROFILE_CITIZENSHIP: "Purchase:Blocked:OtherProfile:Citizenship"`
- `uiElementIds.telegramLinkHeldElsewhere: "TelegramLinkHeldElsewhere"` and `vkLinkHeldElsewhere: "VkLinkHeldElsewhere"`. These follow the existing `TelegramLinkStartScreen` pattern.

**11. Text, `resources/lang/en.json` + `ru.json`** (proposed for owner review; deviation 5: S2's own keys, not 0507's `player_message.*`)
- `purchase_flow.held_elsewhere`
  - en: "You already bought this on another game profile. Write to us and we'll move it to this one."
  - ru: "Вы уже купили это на другом игровом профиле. Напишите нам — и мы перенесём покупку на этот профиль."
- `purchase_flow.contact_telegram`
  - en: "Write to us on Telegram"
  - ru: "Написать нам в Telegram"
- `purchase_flow.contact_vk`
  - en: "Write to us on VK"
  - ru: "Написать нам во ВКонтакте"

**12. `ai-agents/knowledge-base/analytics-event-reference.md`**
- New rows for the two events and the two `UI:Tap` ids.
- Changed descriptions:
  - `Purchase:Completed:Citizenship`: no consume for permanent products unless the server's safety setting is on;
  - `Continue:NeedsTap`: adds "a held-elsewhere answer where the read still offers Buy (another product)";
  - the funnel note's side exits gain `Blocked:OtherProfile`.

### Tests (all in existing files)
- `PaymentsApiClient.test.ts`:
  - Bearer header only when a token is given;
  - none when null;
  - new fields parsed;
  - absent fields → `null` / `[]` / `[]`;
  - `ProfileSession` (mocked) is never called by the API client.
- `PaymentsReconciliation.test.ts` (adds `ProfileSession` and analytics mocks):
  - boot pass: `ensureSession` awaited once and its token forwarded; not called when the list is empty;
  - event only on `grantedTokens`; held-only → no event and no consume;
  - consume only `consumeTokens`;
  - old-box fallback: event on `processedTokens`, consume nothing;
  - store filled, offer event fired, `HeldOnOtherProfile` once across both passes;
  - `reconcileNow` precedence table; `processed` = fresh only.
- `ProductPurchase.test.ts` and `CitizenshipPurchase.test.ts`:
  - consume only on `consume:true`;
  - false/absent → no consume, with the restart prompt still dispatched.
  - The existing "consumes tok-1" cases get `consume:true` in their mocks.
- `PurchaseOffer.test.ts`:
  - `held_elsewhere` below owned / paidGrantConfirmed, above buy, for both kinds (via `deriveOfferForKind` for durable items);
  - never for a guest;
  - `read_failed` / `no_product` / `checking` unchanged.
- `CitizenshipOffer.test.ts`: passthrough, including an earned citizen.
- `PurchaseCoordinator.test.ts`:
  - guest auto-continue, tap re-check and logged-in each end at `held_elsewhere` with **no** `runProductPurchase` call, and `Blocked:OtherProfile` logged;
  - hand-off after `handOffDelayMs`, as for `already_owned`;
  - another product held → `needs_tap` on auto-continue.
  - Every snapshot fixture gains `heldElsewhere`.
- `CitizenshipCard.test.ts`:
  - store has citizenship → line and links, no `#citizenship-buy-button`;
  - a store change re-renders once, with no loop;
  - a `held_elsewhere` result shows no red error.
- `CitizenshipExplainerModal.test.ts`: offer line and links; the flow-state line; link taps log the UI ids.
- `ProductClientConfig.test.ts`: the expected object gains the two entries.
- `CitizenshipExplainerLang.test.ts`: the three new keys, in both lang files.

### Checks I will run
- `npx tsc --noEmit -p tsconfig.json`. Jest/SWC does not type-check; tsc is what catches a missed `held_elsewhere` case in an exhaustive switch.
- `npm run lint`.
- The targeted suites above.
- One full `npm test`, through the npm script (project lock).

**Skipped:**
- `npm run test:integration`: S2 changes no server or database code.
- `npm run test:scripts:docker`: unrelated.

If a red full run is traced to another uncommitted task in the tree, I will report it under that task.

### Edge cases covered
- New client with an old box: consumes nothing; signal falls back to today's rule. That fallback means a refresh on every load until S1 is live, which is temporary because S1 deploys first.
- An old client with the new box: unaffected.
- Safety setting on: `consumeTokens` and `consume:true` are consumed as today.
- A guest page: no Bearer, empty store, no login.
- A failed login: latched null; the reconcile goes out without a Bearer.
- A `vfy:false` session: the server answers as "no caller", so a quiet reconcile (residual R2, accepted).
- A slow login on a logged-in page: the boot reconcile waits for it (worst case about 65 s from the signature backstop plus 5 s). The card probably cannot offer Buy to that player before the same session resolves anyway, because its profile read uses the session.
- The surface closes during the flow: unchanged.
- A kill switch that is off: unchanged (no reconcile).
- An unknown product id in `heldElsewhere`: the whole parse fails → the reconcile reads as failed. See residual R-S2-1.

### Deviations from the spec, for approval
1. `held_elsewhere` replaces only a would-be `buy`. `no_product`, `read_failed`, `cannot_verify`, `checking` and `guest` are untouched (the spec says "after owned, before buy").
2. **On the guest path, a held-elsewhere answer goes on to the read, not "not_ready".** The spec says `prepareAfterLogin` returns `not_ready`, but today's code stops at `needs_tap` **before** the read on `not_ready`. So the flow would never reach the `held_elsewhere` end the spec asks for. The new `PrepareResult` reaches it, and still never pays by itself.
3. The store dispatches `PURCHASE_OFFER_CHANGED_EVENT`, as the spec says. The card listens with a size guard, to avoid a dispatch loop.
4. `reconcileNow` also awaits `ensureSession()`. The spec names only the boot pass. In the guest flow the session is already resolved, so this costs nothing and starts no second login.
5. Own lang keys under `purchase_flow.*`, not 0507's `player_message.*`. That keeps S2 off 0507's uncommitted keys and its one-off popup text.
6. The boot pass waits for the session only when `getPurchases()` is non-empty.
7. The store only grows within a page. `HeldOnOtherProfile` fires on the first add.
8. One pair of UI tap ids is shared by the card and the explainer.
9. A card `held_elsewhere` result shows no red purchase-error line.

**Residual R-S2-1 (no change proposed).** `heldElsewhere` parses strictly against the product enum. If the box ever ships a product before the client does, that client's reconcile reads as `failed` for a verified held-elsewhere buyer of it. Re-raise with the first durable-item build. Fix then: parse that field leniently on the client.

### For 0501 (logged-in re-check, Backlog)
- Since S2, `reconcileNow` fills the held-elsewhere store before it returns. So 0501's re-check can block either on a `held_elsewhere` result or by re-deriving the offer, which then says `held_elsewhere`.
- It should end at S2's `held_elsewhere` state with `Blocked:OtherProfile`, exactly as `pending_ungranted` blocks.
- Sequencing per the brief: not in the same uncommitted tree as S2.

### For 0512
- The test copy reaches the live profile domain, provided the dev box was last deployed with today's `.env.dev` (see the summary caveat).
- T1–T3 test purchases land in the **live** database. 0506's plan already says so.

### Open questions

```
NEEDS-DECISION {
  question: "Approve the S2 plan, with deviations 1–9 and the proposed en/ru wording?",
  options: [
    "Approve as written, wording as proposed (Rec)",
    "Approve, but change the wording (type the new lines)",
    "Hold: I want changes (say which)"
  ],
  recommendation: "Approve as written",
  context: "S2 is the game side of 'stop consuming': the game deletes (consumes) a purchase only when our server says so, reloads stay quiet, and a player whose purchase sits on another of his game profiles gets no Buy button, just a line asking him to write to us. Deviations are small gaps the spec left open. The one that changes behaviour is 2: without it, a guest who logs in to buy would end on 'tap to continue' instead of the 'held on another profile' line, because of how the existing flow is ordered. Proposed line: EN 'You already bought this on another game profile. Write to us and we'll move it to this one.' / RU 'Вы уже купили это на другом игровом профиле. Напишите нам — и мы перенесём покупку на этот профиль.' Knock-on: none."
}

NEEDS-DECISION {
  question: "Under the 'held on another profile' line, how should the player contact us?",
  options: [
    "Telegram + VK links, the same channels as the 0507 popup (Rec)",
    "One button that opens the in-game feedback form",
    "Both"
  ],
  recommendation: "Telegram + VK links",
  context: "Links open a two-way chat, so you can talk to the player while you move the purchase. Identifying him is already handled: the server writes a 'sighting' row linking his new profile to the old one, which is what you'd use with the merge tool (0503). The feedback form is one-way (you can't reply). Its message carries only his in-game name until 0509 adds an id. Tagging it as this case would also need a small game-server change, since the server only accepts three fixed screen names. Knock-on: none."
}

NEEDS-DECISION {
  question: "When should S2 be built, given that S1 (0506) and 0507 are both uncommitted in the same working tree?",
  options: [
    "Wait: S1's review closes and you commit S1 and 0507, then build S2 (Rec)",
    "Build now on top of the uncommitted tree; review scoped to S2's hunks"
  ],
  recommendation: "Wait",
  context: "The brief's entry gate is 'S1's contract merged', and S1 is still under review. S2 also edits three files that already hold 0507's uncommitted changes (FlashistFacade.ts, the two lang files, the analytics reference). Building now would mix three tasks in one diff, so the reviewer and the tests can't tell them apart — the reason the brief keeps 0501 out of the same tree. If S1's review changes the contract, S2 would also need rework. Knock-on: S2 then waits on S1's review and your commit. 0512, 0497, 0498 and 0499 already wait on S2, and the held game deploy waits on 0512 (T3 is the release blocker), so they all shift with it."
}
```

**What's next?** The owner answers the three questions above. Building then needs either a spawn carrying the declared-approval marker (Build role, with this plan in full) or a `fkit coder` session. Nothing is committed.
