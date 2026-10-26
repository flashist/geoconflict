# Worklog — 0494 (B2)

## 2026-10-25 — Build (fkit-coder, spawned Build worker)

**Mode.** Spawned by `fkit-lead` driving `/fkit-sprint-ship-loop` on Sprint 9, under the ADR-055 declared-approval
marker. Plan approved by the owner 2026-10-24 via `AskUserQuestion` in the lead session: "Approve (Recommended)";
OP-1 "Wait for B1's build (Recommended)"; OP-3 "Skip it, same as today (Recommended)"; OP-4 "Only what's needed
(Recommended)". Plan carried verbatim; `plan.md` blob `67ace86c2b53435504adbb3dabc9df8892f138ea` matched on disk
(23284 bytes). `plan.md` not edited. Nothing committed or pushed.

**Preconditions (plan step 0).** B1's `PaymentsContract.ts` hunk is in the tree (`ProductKind`, `PRODUCT_DEFINITIONS`,
optional `becamePaidCitizen`, optional `failedCount`); B2 uses B1's names unchanged. 0488's build is in the tree and
being closed; none of its hunks were edited (`FlashistFacade.ts` diff vs the pre-build copy is the one auth-method
hunk only).

### What changed
New:
- `src/client/PurchaseOffer.ts` — `PurchaseOffer`, `PurchaseProfileSnapshot`, `derivePurchaseOffer` →
  `deriveOfferForKind` (citizenship kind = today's order; durable-item kind = spec §5 order),
  `PURCHASE_OFFER_CHANGED_EVENT` (same string as today).
- `src/client/ProductClientConfig.ts` — per-product analytics (started/completed/abandoned + restart
  shown/restart/later) and restart-popup text keys; citizenship points at the existing enum keys and
  `citizenship_restart_modal.{title,body}`. Keyed `Record<PaymentProductId, …>` (missing product = compile error).
  Read through `getProductClientConfig(id)` (see decision 1).
- `src/client/ProductPurchase.ts` — `runProductPurchase(productId)` → `granted | already_owned | error`; the old
  citizenship flow generalized, same step order, `beginPlatformDialog`, consume not awaited; the only purchase dispatch
  of the restart event, `{source:"purchase", productId, becamePaidCitizen: completed.becamePaidCitizen ?? null}`.
- `src/client/PurchaseCoordinator.ts` — logged-in path: one latch for all products (`busy`, no tap logged), tap logged,
  decide on the current snapshot (OP-3), `paying` → `runProductPurchase`; on grant `markGranted` →
  `PURCHASE_GRANTED_EVENT` → await `reread()`; latch released in `finally`. `PURCHASE_FLOW_STATE_EVENT` on every
  change; `currentState()`; `get/setPurchaseCoordinator()`.

Changed:
- `CitizenshipOffer.ts` — `deriveCitizenshipOffer` is a wrapper over `derivePurchaseOffer` (`owned`→`citizen`, `buy` on a
  citizen → `citizen_buy`, `guest` drops price); new `toPurchaseProfileSnapshot(inputs, grantedThisPage)` is the one
  inputs→snapshot mapping, shared with the card. `CITIZENSHIP_OFFER_CHANGED_EVENT` re-exports the shared string.
- `CitizenshipPurchase.ts` — `runCitizenshipPurchase()` delegates; old body and its dispatch deleted.
- `PaymentsApiClient.ts` — `createPurchaseIntent` → `CreateIntentResult` (`already_owned` only for 409 +
  `{error:"already_owned"}`); `reconcilePurchases` → `ReconcileResult`. `completePurchase` already passes
  `becamePaidCitizen` through (B1's schema); no change needed there.
- `PaymentsReconciliation.ts` — 4-line adapter for the reconcile result.
- `CitizenshipRestartOffer.ts` — detail type `{source:"tenure"} | {source:"purchase", productId?, becamePaidCitizen?}`
  (decision 2); `dispatchCitizenshipGrantedMidSession(source, purchase?)`; `onGranted(productId = "citizenship")`;
  `showPrompt(productId)`; `restart()` logs the offered product's event; once per page across products; a pending offer
  keeps the latest product (decision 3).
- `CitizenshipRestartModal.ts` — `show(onRestart, productId = "citizenship")`; title/body/Shown/Later from the product's
  config. Both buttons kept (RP-1); no outside-click/Esc close.
- `CitizenshipCard.ts` — implements `PurchaseProfileSource` (`snapshot()`, `reread()` = `refreshProfile()` with no
  "checking" publish, `markGranted(id)`); one private `gatherOfferInputs()`; `buyCitizenship(tapId)` keeps its signature
  and routes through the coordinator; `isPurchaseInFlight` removed.
- `flashist/FlashistFacade.ts` — the only B2 hunk: `authDialogInFlight` field + single-flight `openYandexAuthDialog()`;
  old body moved unchanged into private `runAuthDialog()`.
- `Main.ts` — one coordinator (profile source = the `citizenship-card` if it has `snapshot`; `runProductPurchase`;
  catalog price; `logUiTapEvent`), registered at the top of `initialize()`; `showPrompt` passes the product; the grant
  listener passes `detail.productId`.
- `ai-agents/knowledge-base/analytics-event-reference.md` — `CITIZENSHIP_RESTART_PROMPT_SHOWN` row wording names the new
  dispatch site. No enum entries, no lang keys added.

Tests (new files are the four the plan named):
- New: `tests/client/PurchaseOffer.test.ts`, `PurchaseCoordinator.test.ts`, `ProductPurchase.test.ts`,
  `ProductClientConfig.test.ts`.
- `CitizenshipPurchase.test.ts` — only the intent mock shapes, the signal-detail lines, and one comment ("null intent" →
  "failed intent"). Every event-string and sequencing assertion unchanged (OP-2).
- `PaymentsApiClient.test.ts` — new shapes + 409/other/non-JSON/network/reconcile/`becamePaidCitizen` cases.
- `PaymentsReconciliation.test.ts` — mock shapes only.
- `CitizenshipRestartOffer.test.ts`, `CitizenshipRestartModal.test.ts`, `CitizenshipCard.test.ts`,
  `FlashistFacade.test.ts` — additions only (existing lines unchanged; checked with `git diff | grep '^-'`). The card
  suite's one `beforeEach` registers a real coordinator over the existing `runCitizenshipPurchase` mock.

### Checks
| Check | Result |
|---|---|
| Targeted: the 19 suites above + `CitizenshipOffer`, `CitizenshipExplainerModal`, `CitizenshipRestartLang`, `JoinPrivateLobbyModalLeave`, `PreStartModals`, `LangSelectorRerender`, `WinModal`, `NameChangeRequest` | 19 suites, 617/617 pass |
| `npx tsc --noEmit -p tsconfig.json` (includes `tests/**`) | exit 0, no output (baseline before the build was also clean) |
| `npm run lint` | clean |
| `npx prettier --check` on every changed source/test file | clean (two unrelated pre-existing warnings: `tests/client/DaysPlayedAnalytics.test.ts`, `SessionMatchAnalytics.test.ts` — not touched) |
| `npm test` (full, npm script + project lock, once) | 238 suites, **4981/4981** pass, 112 s, no skips, no flake |
| Local `npm run dev` + headless Playwright | **passed, with limits:** start-screen card renders (guest state, "Войдите, чтобы сохранить прогресс"); dispatching `{source:"purchase",productId:"citizenship",becamePaidCitizen:null}` showed "Гражданство активно!" with "Перезапустить" and "Позже"; console logged `Citizenship:RestartPrompt:Shown`, then `…:Later` on Later. First attempt showed nothing because the first-run tutorial auto-started a match (offer correctly went pending); retested with `tutorialCompleted` set. Debug logs added to `Main.ts` for that diagnosis were removed (file restored byte-for-byte). Not checked locally: the logged-in Buy button and a real purchase (no Yandex SDK locally) |
| Skipped | `npm run test:integration` (no server/SQL change), `test:scripts:docker` / `check:config-parity` (no infra/env change), a real purchase (Yandex SDK; `0498` after B3) — per plan |

### Decision log (choices made without asking — ADR-019 §4 / ADR-055)
1. **`ProductClientConfig` is read lazily** (`getProductClientConfig(id)` over a `Record<PaymentProductId, () => …>`),
   not a load-time constant. Answers: plan edge case "Jest facade mocks … if any crashes, fall back to a lazy config
   getter". Why it qualified (in plan): `PaymentsReconciliation.test.ts` mocks the facade with no `flashistConstants` and
   imports `CitizenshipRestartOffer`, which now imports the config — the exact crash the plan named. Compile-time
   "missing product" guarantee kept.
2. **The purchase detail's `productId` / `becamePaidCitizen` are optional in the type** (missing `productId` =
   citizenship). Answers: plan step 6 "keeps its current call shape, so existing tests … stay as they are". Why it
   qualified (obvious winner within intent): the existing test calls `dispatchCitizenshipGrantedMidSession("purchase")`
   with no product and expects `{source:"purchase"}`; a required field would force editing it. `ProductPurchase` always
   sends both.
3. **`onGranted` re-checks `shown` after the kill-switch await.** Answers: plan step 6 "`restart()` logs the shown or
   pending product's restart event" + "once per page across all products". Why it qualified (mechanical, in plan):
   without it, two grants racing the await let the second overwrite the product after the first was shown, so Restart
   would log the wrong product. Test: "two grants racing the kill-switch read".
4. **A throwing post-grant `reread()` keeps the result `granted`** (warned, latch released). Answers: plan step 7 "a
   throw → error". Why it qualified (obvious winner within intent): the server already confirmed the grant; returning
   `error` would contradict "granted == stop offering" and could put the error line under a granted card. Throws before
   the grant still return `error`. Unreachable unless `refreshProfile` breaks its never-throws contract.
5. **`buyCitizenship` with no coordinator also shows the error line** (plus `console.warn`, returns `error`). Answers:
   plan step 8, which names the warn and `"error"` but not the line. Why it qualified (obvious winner): a tap that does
   nothing silently is worse; unreachable in production (Main registers at `initialize()`).
6. **`PurchaseRequestResult` / `PurchaseFlowState` hold only B2's values** (no `login_cancelled`, `needs_tap`,
   `logging_in`). Answers: OP-4 "only what's needed". B3 widens them.

No other fix or obvious-winner call.

**Process-review round 1 (2026-10-25, fkit-coder, spawned Process-review worker under fkit-lead's ADR-055 marker):**
7. **R1 fixed without asking.** Answers: review.md R1 (stale `runCitizenshipPurchase()` references). What changed:
   `src/client/PlatformDialogPresence.ts` header comment now says the marker is set by `runProductPurchase()`;
   `analytics-event-reference.md` `CITIZENSHIP_RESTART_PROMPT_SHOWN` row lost the clause "— the flow
   `runCitizenshipPurchase()` delegates to". Why it qualified: verified `CORRECT` (`beginPlatformDialog()` is called at
   `ProductPurchase.ts:36`; production buys go card → coordinator → `runProductPurchase`), mechanical/localized
   (comment + one doc clause), in-plan (plan step 11 names that row; the project rule fixes a comment the change made
   wrong). No other fix or obvious-winner call this round.

### Caveats
- `analytics-event-reference.md`: the edited row is longer; if lint-staged runs Prettier on it at commit, the table may
  re-pad (whitespace-only).
- The coordinator's `cannot_verify` and durable-item paths are exercised only with a test-only product id (no real item
  exists until B4/item builds), as the plan intended.
- Review scope: B2's files above plus the one `openYandexAuthDialog` hunk in `FlashistFacade.ts`; the tree also holds
  0488/0491/0492 uncommitted work.
