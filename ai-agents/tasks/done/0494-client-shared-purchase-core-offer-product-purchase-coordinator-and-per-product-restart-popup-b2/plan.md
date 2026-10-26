# Plan — 0494 (B2): shared purchase core + per-product restart popup

**Planning only. No files written.** Plan review was OFF for this run (no switch line), so there were no approver consults and no Codex pass. I consulted nobody.

## Summary (read this first)
- **The lead's overlap premise needs one correction.** In B2, `FlashistFacade.ts` changes in one place only: the single-flight `openYandexAuthDialog`. `refreshPaymentsAfterLogin` belongs to **B3** (spec §4.1, "B3: adds `refreshPaymentsAfterLogin`"), so B2 does not touch it.
- **0488's build is already in the working tree**: facade hunks, `WinModal.ts`, `en.json`/`ru.json`. Its facade hunks do not overlap B2's. B2 changes no lang file, does not touch `WinModal.ts`, and adds no analytics enum entry.
- **Wait for 0488? Yes, but not because of edit collisions.** Wait because both tasks share one uncommitted working tree. B2's full `npm test`/`tsc` run would then include 0488's half-built code, and the reviewer's "working tree" scope would mix the two tasks.
- **A dependency the lead did not list: B2's build needs B1's (0492) `PaymentsContract.ts` change to land first.** That change is `PRODUCT_DEFINITIONS` plus the optional `becamePaidCitizen`. The spec gives both to B1 (§4.1), and B2's offer rule and restart-event detail read them. Only B1's **build** is needed, not its deploy. → OP-1.
- **The brief's "`CitizenshipPurchase.test.ts` unchanged" cannot hold to the byte.** The spec's own contract changes the intent mock's shape and the restart-event detail. My recommendation: change only those mock and detail lines and keep every event-string and sequencing assertion as is. → OP-2.
- **No visible change for citizenship needs two small departures from the spec's wording**, both mine:
  - no profile re-read before the intent on the logged-in path;
  - the post-grant re-read does not show "checking".
  → OP-3.
- **B2 → B3 stays strictly in order**: B3 extends the same new files. B3 also overlaps 0488 (facade enum, lang files, analytics reference).

## Grounding
- Spec `ai-agents/knowledge-base/reports/2026-10-24-design-shared-purchase-flow.md` (REVISION 2, approved), read in full.
- ADR-125 (RP-1 note: keep "Later").
- Brief 0494, brief 0492 (B1 scope: "the diff stays inside the §4.1 B1 components"), 0488's plan Part C and its working-tree diff.
- Wiki index searched: it has no shared-purchase-flow or ADR-125 page yet, so the spec is the newest source.

## Current code, as it stands (working tree, 2026-10-24)
- `FlashistFacade.openYandexAuthDialog` is at `:2495-2512` and has no latch. 0488's facade hunks start at `:245` (enum), `:506` (flags), `:847` (types), `:1744`, `:2614`, `:2679`. None of them touch the auth method.
- `CitizenshipPurchase.ts:104` is today's only purchase dispatch of the restart event, with detail `{source}`. The card's tenure dispatch is at `CitizenshipCard.ts:445`.
- `PaymentsApiClient.createPurchaseIntent` collapses every non-200 to `null` (`:78-80`). `reconcilePurchases` returns `string[] | null`, and its one caller is `PaymentsReconciliation.ts:69`.
- The card owns the latch `isPurchaseInFlight` and `buyCitizenship` (`CitizenshipCard.ts:~1011-1056`). The explainer buys through `card.buyCitizenship(tapId)` (`CitizenshipExplainerModal.ts:~272-285`).
- `Main.ts:197-209` wires the restart offer; `:375-380` is its event listener. 0488 does not touch `Main.ts`.
- `/intent` never answers 409 today. Its errors are 400, 404 and 500 (`Routes.ts:~1028-1049`).
- Jest uses SWC and does **not** type-check. `ts-loader` in webpack does. There is no typecheck npm script.

## Steps

**0. Preconditions at build start**
- B1's `PaymentsContract.ts` hunk is present (`ProductKind`, `PRODUCT_DEFINITIONS`, `becamePaidCitizen: z.boolean().optional()`). If B1 used other names, B2 follows B1.
- 0488's build has reached its own green verify.

**1. `src/client/PurchaseOffer.ts` (new, pure; spec §5)**
- `PurchaseOffer` union, including `cannot_verify` and `xp`.
- `PurchaseProfileSnapshot`, with `entitlements` typed but always `null` until B4.
- `derivePurchaseOffer(productId, snapshot, catalogPrice)` looks up the product's kind in `PRODUCT_DEFINITIONS[productId].kind`, then delegates to an exported `deriveOfferForKind(kind, productId, snapshot, price)`. That split lets tests drive the `durable_item` branch with no real item id, the same approach as B4's.
- Shared start of the rule: checking, then guest (with price).
- **`citizenship` kind**: exactly today's order (`CitizenshipOffer.ts:59-89`). "Citizen" means `isCitizen || paidGrantConfirmed`. An earned citizen gets `buy` only on a verified, not-paid read with a price; any other citizen gets `owned`. Then non-authoritative → `read_failed`; no price → `no_product(xp)`; otherwise `buy(price, xp)`.
- **`durable_item` kind** (spec §5 order):
  1. granted this page → `owned`;
  2. non-authoritative read → `read_failed`;
  3. list known → `owned` if the item is in it, else `buy`;
  4. list unknown, non-citizen → `buy`;
  5. list unknown, citizen → `cannot_verify`.
  `buy` without a price becomes `no_product`.
- `PURCHASE_OFFER_CHANGED_EVENT` is defined here with the same string as today's event.

**2. `src/client/CitizenshipOffer.ts`**
- `deriveCitizenshipOffer` becomes a thin wrapper:
  - `owned` → `citizen`;
  - `buy` on a citizen → `citizen_buy{price}`;
  - `guest` drops its price;
  - every other kind passes through.
- `CITIZENSHIP_OFFER_CHANGED_EVENT` is re-exported from `PURCHASE_OFFER_CHANGED_EVENT`.
- `CitizenshipOffer.test.ts` stays **unchanged** and is the spec for the wrapper.

**3. `src/client/ProductClientConfig.ts` (new)**
- `PRODUCT_CLIENT_CONFIG: Record<PaymentProductId, ProductClientConfig>`. A product with no entry is a compile error.
- Citizenship entry, pointing at **existing** enum keys only:
  - started / completed / abandoned → `PURCHASE_*_CITIZENSHIP`;
  - `restartPrompt` shown / restart / later → `CITIZENSHIP_RESTART_PROMPT_*`;
  - restart text keys → `citizenship_restart_modal.title` and `citizenship_restart_modal.body`;
  - `isUiEnabled: null`.
- **Trimmed against the spec stub (OP-4):**
  - explicit key fields instead of `textKeyPrefix`, because citizenship's existing keys sit under two different prefixes;
  - only the analytics fields B2 fires. B3 adds the login, continue and blocked fields where they can first fire for citizenship.
- **No new enum entries. No lang keys.**

**4. `src/client/PaymentsApiClient.ts` (spec F6)**
- `createPurchaseIntent` → `CreateIntentResult`:
  - `ok{intentId}`;
  - `already_owned` only for a 409 whose body is `{error:"already_owned"}`;
  - `failed` for everything else, including no session, a body that is not JSON, and a 409 with any other body.
- `reconcilePurchases` → `ReconcileResult` (`ok{processedTokens}` | `failed`).
- `completePurchase` passes `becamePaidCitizen` through when the box sends it.
- `PaymentsReconciliation.ts:69` gets a 3-line adapter for the new reconcile shape. No other change there; `reconcilePurchasesNow` is B3.

**5. `src/client/ProductPurchase.ts` (new; `CitizenshipPurchase.ts` generalized, same order of steps)**
- `runProductPurchase(productId)` → `"granted" | "already_owned" | "error"`.
- It wraps the flow in `beginPlatformDialog` (0404) and takes analytics from the config.
- Intent `already_owned` → `already_owned`, with no Started event.
- Consume is not awaited.
- **It is the only place a purchase dispatches the restart event.** It dispatches once after every grant: `{source:"purchase", productId, becamePaidCitizen: completed.becamePaidCitizen ?? null}`. `null` means the box did not say. That value never gates the popup.
- `CitizenshipPurchase.ts`: `runCitizenshipPurchase()` delegates to it. `already_owned` maps to `"error"`, which citizenship cannot reach. The old body and its `:104` dispatch are deleted.

**6. `src/client/CitizenshipRestartOffer.ts` + `CitizenshipRestartModal.ts` (per product; RP-1 = keep "Later")**
- The detail type becomes `{source:"tenure"} | {source:"purchase", productId, becamePaidCitizen: boolean|null}`.
- `dispatchCitizenshipGrantedMidSession(source, purchase?)` keeps its current call shape, so existing tests and the tenure call site stay as they are.
- `onGranted(productId = "citizenship")`, and `showPrompt(productId)`.
- `restart()` logs the shown or pending product's restart event.
- Once per page across all products. A pending offer keeps the **latest** product.
- Kill switch, lobby-pending, match-drop and the refused-restart re-arm are unchanged.
- Modal: `show(onRestart, productId = "citizenship")` renders that product's title and body and logs its shown and later events. **Both buttons stay.** No outside-click or Esc close, as today.
- Citizenship renders and logs exactly as today.

**7. `src/client/PurchaseCoordinator.ts` (new; logged-in path only)**
- `createPurchaseCoordinator(deps)` with deps `{profileSource, runProductPurchase, catalogPrice, logUiTap}`, plus module `getPurchaseCoordinator()` / `setPurchaseCoordinator()`.
- `requestPurchase({productId, tapElementId})`:
  1. If a purchase is already in flight → `"busy"`, with no tap logged (today's order).
  2. Take the latch for **all** products and log the tap. State → `preparing`.
  3. No profile source → `error`.
  4. Decide with `derivePurchaseOffer` on the **current** snapshot (OP-3):
     - `buy` → go on;
     - `owned` → `already_owned`;
     - `cannot_verify` → `cannot_verify`;
     - `read_failed` → `profile_unavailable`;
     - `checking`, `guest`, `no_product` → `error`. A UI tap cannot reach these in B2; B3 replaces `guest` with the login path.
  5. State → `paying`, then `runProductPurchase`.
  6. On `granted`: `markGranted(productId)`, state `granted`, dispatch `PURCHASE_GRANTED_EVENT {productId}`, then await `reread()`.
  7. A throw → `error`. The latch is always released in `finally`, after the re-read, as the card does today.
- `PURCHASE_FLOW_STATE_EVENT {productId, state}` is dispatched on every change, and `currentState()` is available. No surface renders states in B2; B3 adds the lines and strings.
- **Not in B2 (OP-4):** `surfaceClosed`, deadline and timer deps, auth, session and reconcile deps, the D3 hand-off. These are B3's.

**8. `src/client/CitizenshipCard.ts`**
- Implements `PurchaseProfileSource`:
  - `snapshot()` is built from the same inputs `getCitizenshipOffer()` already gathers (one private gatherer, no second source).
  - `reread()` = today's `refreshProfile()`, with **no** "checking" publish (OP-3).
  - `markGranted(id)` sets `paidGrantConfirmed = true`, adds the id to `grantedThisPage`, publishes the citizenship status and calls `requestUpdate()`. That is today's post-grant block.
- `buyCitizenship(tapId)` keeps its public signature, which the explainer and its tests rely on:
  - it clears the error line, then calls `getPurchaseCoordinator()?.requestPurchase({productId:"citizenship", tapElementId})`;
  - `granted` and `busy` pass through;
  - every other result shows the existing error line and returns `"error"`;
  - with no coordinator registered → `"error"` and a `console.warn`.
- `isPurchaseInFlight` is removed; the latch now lives in the coordinator.
- The login and the "for purchase" mode are B3's and are untouched.

**9. `src/client/flashist/FlashistFacade.ts` — the only B2 hunks**
- (a) One private field: `authDialogInFlight: Promise<boolean> | null`.
- (b) `openYandexAuthDialog()` becomes: no SDK → `false` (no latch); otherwise `this.authDialogInFlight ??= this.runAuthDialog().finally(() => { this.authDialogInFlight = null; })`. Today's body moves unchanged into a private `runAuthDialog()`, keeping `beginPlatformDialog` once per real dialog.
- Nothing else: no enum entry, no `refreshPaymentsAfterLogin`.

**10. `src/client/Main.ts`**
- Next to the restart-offer field (`:197`), create the single coordinator with:
  - `profileSource` → the `citizenship-card` element, if it implements `snapshot`;
  - `runProductPurchase`;
  - `catalogPrice` → `getCatalogProduct(id)?.price ?? null`;
  - `logUiTap` → `logUiTapEvent`.
- Then call `setPurchaseCoordinator(...)`.
- `showPrompt` passes the product id to `modal.show`.
- The listener at `:375` passes `detail.productId` to `onGranted`.

**11. `ai-agents/knowledge-base/analytics-event-reference.md`**
- Only the wording of the `CITIZENSHIP_RESTART_PROMPT_SHOWN` row (line 376, which names `runCitizenshipPurchase()`) changes, to name the new dispatch site. The string itself is unchanged.
- This row is in a different section from 0488's Ad block.

**Not changed in B2:**
- `CitizenshipExplainerModal.ts`: Buy already reaches the coordinator through the card. Its close-on-grant, progress line and `surfaceClosed` are B3's. Only citizenship exists, so its current close-on-mid-session behaviour, tenure included, is unchanged.
- `GameRestart.ts`, `ProfileSession.ts`, `PlatformDialogPresence.ts`, lang files, `WinModal.ts`, `src/core`.

## Hunks in shared files (vs 0488 / B1)

| File | B2 hunk | 0488 hunks | Collision |
|---|---|---|---|
| `FlashistFacade.ts` | 1 field + the `openYandexAuthDialog` method (now `:2495-2512`) | `:245`, `:506`, `:847`, `:1744`, `:2614`, `:2679` | none (disjoint) |
| `tests/client/FlashistFacade.test.ts` | new `describe` next to the 0404 block (`:1234`) | not yet modified by 0488 | likely none |
| `analytics-event-reference.md` | row at line 376 (Citizenship) | new Ad "Rewarded video" block | none |
| `en.json` / `ru.json`, `WinModal.ts` | — | yes | n/a |
| `src/core/profile/PaymentsContract.ts` | **read only** (B1 owns the change) | — | B1 dependency, OP-1 |

**Build timing:**
- B2's build should start after 0488's build is green. The reasons are a clean verify and a clean review scope, not editing.
- B2's build also needs B1's contract hunk (OP-1).
- The B2 reviewer must be scoped to B2's file list plus the one facade method hunk, because nothing gets committed between tasks.

## Tests

**New files** (named here so plan approval covers them):
- `tests/client/PurchaseOffer.test.ts` — the §10 matrix:
  - buyer: guest, non-citizen, earned citizen verified and unverified, paid citizen;
  - ownership: owned, not owned, unknown;
  - catalog: ready, missing;
  - citizen with an unknown list → `cannot_verify`, never `owned`;
  - non-citizen whose known list contains the item → `owned` (tester case);
  - granted this page → `owned`;
  - citizenship-kind parity with today's order.
- `tests/client/PurchaseCoordinator.test.ts` — fake deps, no DOM:
  - latch → `busy` across two product ids;
  - tap logged once, never on `busy`;
  - `buy` → `granted`: `markGranted`, then `PURCHASE_GRANTED_EVENT` exactly once, then `reread` awaited before the latch is released;
  - state sequence `preparing → paying → granted`;
  - `owned` / `cannot_verify` / `read_failed` → `already_owned` / `cannot_verify` / `profile_unavailable`, with no purchase call;
  - purchase result `already_owned` and `error`;
  - a throw → `error` and the latch released;
  - no profile source → `error`.
- `tests/client/ProductPurchase.test.ts` (mocks `ProductClientConfig` to add a test-only product):
  - restart event exactly once per grant for every product;
  - `becamePaidCitizen` true, false **and missing** (null) each still dispatch and return `granted` (brief verify 3);
  - never on `already_owned` or `error`;
  - 409 → `already_owned`, with no Started;
  - analytics come from the config;
  - platform-dialog marker; consume not awaited.
- `tests/client/ProductClientConfig.test.ts` — the citizenship config equals the existing enum strings and lang keys, and every config event is an enum value (no inline strings).

**Changed:**
- `CitizenshipPurchase.test.ts` — **only** the mock shapes (`"intent-uuid"` → `{kind:"ok",intentId}`, `null` → `{kind:"failed"}`) and the signal detail (`{source:"purchase"}` → `{source:"purchase",productId:"citizenship",becamePaidCitizen:null}`). Every event-string and sequencing assertion stays byte-identical (OP-2).
- `PaymentsApiClient.test.ts` — new shapes:
  - 409 `already_owned` → `already_owned`;
  - a 409 with another body, and any other non-200 → `failed`;
  - reconcile enum;
  - `becamePaidCitizen` passed through.
- `PaymentsReconciliation.test.ts` — mock shapes only.
- `CitizenshipRestartOffer.test.ts` — added cases:
  - `onGranted(productId)` hands that product to `showPrompt`;
  - the restart event follows the product;
  - once per page across products;
  - a pending offer keeps the latest product.
  Existing cases unchanged.
- `CitizenshipRestartModal.test.ts` — added cases: a product's title, body and events; both buttons present (RP-1); the default is citizenship. Existing cases unchanged.
- `CitizenshipCard.test.ts` — one `beforeEach` that registers a real coordinator over the existing `runCitizenshipPurchase` mock (setup only; assertions unchanged), plus `snapshot()` / `markGranted()` cases.
- `FlashistFacade.test.ts` — single-flight:
  - two concurrent calls → one `openAuthDialog` and one `getPlayer`, both get the same result;
  - the latch clears after success, rejection and a `getPlayer` throw;
  - a later call opens a fresh dialog;
  - no SDK → `false` and no latch;
  - the 0404 marker opens and closes once.

**Unchanged, but must stay green:** `CitizenshipOffer.test.ts`, `CitizenshipExplainerModal.test.ts`, `CitizenshipRestartLang.test.ts`, `JoinPrivateLobbyModalLeave.test.ts`, `PreStartModals.test.ts`, `LangSelectorRerender.test.ts`.

## Checks to run
1. **Targeted while building** (no lock): `npm test -- <each file above>`.
2. **Type check:** `npx tsc --noEmit -p tsconfig.json`. This is required: jest with SWC does not check types, so the "missing product = compile error" guarantee is checked only here and by webpack. It also covers 0488's files, so it only gives a clean signal once 0488 is green.
3. `npm run lint`.
4. **Full `npm test`, once**, through the npm script (project lock, 1 worker, about 5 min, shell harnesses included). A single `Exceeded timeout of 5000 ms` in a supertest suite is judged by the known-flake rule: re-run and say so.
5. **Local run:** `npm run dev`. The start-screen card should look as before. Then dispatch `geoconflict-citizenship-granted-mid-session` with `{source:"purchase",productId:"citizenship",becamePaidCitizen:null}` from the console. Expected: "Citizenship is active!" with "Restart now" and "Later". If the kill switch reads off locally, I report this check as **not run**, not as passed.
- **Skipped, with reasons:**
  - `npm run test:integration` — no server or SQL change;
  - `test:scripts:docker` and `check:config-parity` — no infra or env change;
  - a real purchase — needs the Yandex SDK; covered live by `0498` (B5) after B3.

## Edge cases / failure modes
- **Auth latch stuck:** if the `finally` were missed, every later login on the page would be dead. Tested for success, rejection and throw.
- **Two callers share one auth dialog:** e.g. the card and 0488's WinModal. Both may then dispatch login-succeeded; `requestGameRestart`'s once-per-page latch already absorbs that.
- **Jest facade mocks:** many suites mock `FlashistFacade` with only a few enum keys. `ProductClientConfig` reads keys when its module loads: a missing key gives `undefined` (harmless), but a mock with no `flashistConstants` at all would crash on import. The plan is to run every suite that imports the changed modules; if any crashes, fall back to a lazy config getter. No production impact.
- **Import cycles:** the coordinator gets everything through deps and must never import the card. The import order is `ProductPurchase → CitizenshipRestartOffer → ProductClientConfig → facade`.
- **Exception path:** today a throw inside the purchase rejects `buyCitizenship` (an unhandled rejection). After B2 it returns `error` and shows the error line. This is reachable only if `profileFetch` or `completePurchase` break their "never throws" contract. It is a tiny change, and an improvement.
- **Card disconnected mid-purchase:** `markGranted` and `reread` still run on the detached element. Harmless, and the result is still `granted`.
- **Tenure grant:** no `productId` → citizenship text, as today.
- **B2 deployed before B1's box deploy:** `becamePaidCitizen` is missing → `null`. The popup still shows and nothing breaks (tested).
- **Kill switch off:** the card is hidden, so there is no tap and no prompt. Unchanged.

## B2 → B3 sequencing
- B3 (0495) edits B2's new files: coordinator guest deps, `surfaceClosed`, the deadline, the hand-off; the card's "for purchase" login mode; explainer progress and close; facade `refreshPaymentsAfterLogin` and the new enum entries; lang and the analytics reference.
- **So B3's build starts only after B2 is built and its stateful review is closed.** B3's plan should be drafted against B2's built code (or re-checked against it).
- B3 also overlaps 0488's files, so it should also come after 0488 is green.
- B2's deploy is not needed before B3's build. B2 can ship alone (no visible change) or together with B3, in a weekend slot unless urgent.
- B5 (0498) verifies B2 and B3 live after B3's deploy.
- Dependency chain: B1 build → B2 build → B3 build. B1's deploy is needed only by B1v and B4, not by B2.

## Open points for the owner (recommendations are mine, the coder's)
- **OP-1 — B2 needs two lines from B1's contract change.**
  - (a) **Rec:** B2's build waits until B1's build has landed `PaymentsContract.ts`. Knock-on: 0494 waits on 0492's **build** (not its deploy); 0495 and 0498 already wait on 0494, so they wait on it too. All in Sprint 9; no cross-sprint knock-on.
  - (b) B2 adds `ProductKind`, `PRODUCT_DEFINITIONS` and `becamePaidCitizen` itself, word for word from spec §5, with a `src/core` test, and B1 skips them. Knock-on: none on order; B1's plan must be told. B2's diff then reaches into a B1 component.
  - (c) B2 avoids the contract entirely. Not recommended: it duplicates the kind list and cannot test `becamePaidCitizen === false`.
- **OP-2 — "`CitizenshipPurchase.test.ts` unchanged."** **Rec:** read it as "same event strings and same order" — the brief's own parenthesis — and change only the mock-shape and signal-detail lines. The only alternative is a compatibility layer that accepts both the old and new intent shapes, which I reject.
- **OP-3 — logged-in path.**
  - **Rec:** decide on the current snapshot, with no re-read before the intent. The post-grant re-read shows no "checking". This keeps citizenship looking and timing exactly as today; B3 adds the "checking" read for the guest path only.
  - Alternative: follow spec §4.3 literally ("logged-in starts at step 6", which publishes "checking"). Every logged-in buyer would then see a "checking" flash and wait up to 5 s more before the payment window. That is a visible change.
- **OP-4 — scope trims.** **Rec:** leave the guest-path pieces out of B2 (`surfaceClosed`, timer deps, the login/continue/blocked analytics fields, explainer changes, state-line strings) and use explicit text keys instead of `textKeyPrefix`. Each lands in B3 or B4 where it is first used. Alternative: build the full spec interfaces now, with stubs.
