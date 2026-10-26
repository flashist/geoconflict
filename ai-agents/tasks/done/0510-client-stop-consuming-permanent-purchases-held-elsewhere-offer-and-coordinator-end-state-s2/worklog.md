# 0510 worklog — S2 (client) build

## 2026-10-26 — Build worker (fkit-coder, spawned by fkit-lead under the ADR-055 marker)

Built `plan.md` (blob `04e5893f`, verified unchanged before starting) with deviations 1–9 and the proposed
EN/RU wording as approved (owner, 2026-10-26, `AskUserQuestion` in the fkit-lead session: *"Approve
(Recommended)"*, *"Telegram + VK links (Recommended)"*, *"After you commit 0506+0507 (Recommended)"*).
Started on a clean tree at `baaf2f8d` (0506 + 0507 committed locally). Nothing committed or pushed.

### Change surface

- `src/client/PaymentsApiClient.ts` — `postJson` takes optional extra headers; `reconcilePurchases(signature,
  sessionToken)` adds `Authorization: Bearer` only for a non-null token and never uses `profileFetch`;
  `ReconcileResult.ok` gains `grantedTokens` (null = pre-0506 box), `consumeTokens`, `heldElsewhere`
  (absent → `[]`). Bearer comment on `createPurchaseIntent`, and the `completePurchase` /
  `reconcilePurchases` docs, rewritten.
- `src/client/PaymentsReconciliation.ts` — held-elsewhere store (`getHeldElsewhereProducts`, add-only,
  `HeldOnOtherProfile` on each new id, `PURCHASE_OFFER_CHANGED_EVENT` on change, cleared by the test
  reset); boot pass waits `ensureSession()` once (only after a non-empty signed list), sends its token,
  records `heldElsewhere`, fires `PURCHASES_RECONCILED_EVENT` only on a fresh grant (old-box fallback:
  `processedTokens`), consumes only `consumeTokens`; `reconcilePurchasesNow` the same, with result
  precedence `pending_ungranted` > `held_elsewhere` > `processed` (fresh only) > `none`. Header and
  event/result docs rewritten.
- `src/client/ProductPurchase.ts` — consumes only on `consume === true`; header and comments fixed.
- `src/client/PurchaseOffer.ts` — `held_elsewhere` offer; `PurchaseProfileSnapshot.heldElsewhere`
  (required); replaces only a would-be `buy`, both kinds.
- `src/client/CitizenshipOffer.ts` — `heldElsewhere` input passed through; `held_elsewhere` offer.
- `src/client/ProductClientConfig.ts` — `heldOnOtherProfile`, `blockedOtherProfile`.
- `src/client/PurchaseCoordinator.ts` — `held_elsewhere` state/result; `heldElsewhere()` helper
  (`Blocked:OtherProfile`); logged-in case; `PrepareResult` `held_elsewhere` (deviation 2); guest read
  case; a `buy` after a held-elsewhere prepare → `needs_tap` on the automatic path.
- `src/client/CitizenshipCard.ts` — `heldElsewhere` in the offer inputs (so `snapshot()` too); the line
  `#citizenship-held-elsewhere` with `#citizenship-held-elsewhere-telegram` / `-vk`; size-guarded
  `PURCHASE_OFFER_CHANGED_EVENT` listener (added at reveal, removed on disconnect); `buyCitizenship`
  returns `held_elsewhere` without the red error.
- `src/client/CitizenshipExplainerModal.ts` — `held_elsewhere` in `renderAction` and `renderGuestFlow`
  (ids `citizenship-explainer-held-elsewhere[-telegram|-vk]`); `.contact-link` style.
- `src/client/flashist/FlashistFacade.ts` — two event enum entries, two `uiElementIds`.
- `resources/lang/en.json`, `ru.json` — `purchase_flow.held_elsewhere`, `.contact_telegram`, `.contact_vk`
  (approved wording).
- `ai-agents/knowledge-base/analytics-event-reference.md` — rows for the two events and two tap ids;
  `Purchase:Completed` (consume rule), `Continue:NeedsTap` (held-elsewhere case) and the funnel side
  exits updated.
- Tests (existing files only): `PaymentsApiClient`, `PaymentsReconciliation`, `ProductPurchase`,
  `CitizenshipPurchase`, `PurchaseOffer`, `CitizenshipOffer`, `PurchaseCoordinator`, `CitizenshipCard`,
  `CitizenshipExplainerModal`, `ProductClientConfig`, `CitizenshipExplainerLang`.

### Checks

- `npx tsc --noEmit -p tsconfig.json` — clean.
- `npm run lint` — clean. Prettier `--check` on every changed `.ts`/`.json` — clean (three test files
  reformatted with `--write`).
- Targeted: the 11 suites above — 646 tests, all pass (445 + 201 in two runs).
- Full `npm test` (npm script, project lock), once: **241 suites / 5352 tests passed**, 0 skipped, 93 s.
  No supertest flake; `SshAlerts.test.ts` and `InternalPathCase.test.ts` passed (no recurrence for 0500).
- Mutation check of the card's loop guard: with the size guard replaced by `if (true)`, the
  "re-renders once — no event loop" test fails (33 renders instead of 1); guard restored.
- Skipped: `npm run test:integration` (no server or database code changed), `npm run test:scripts:docker`
  (unrelated). No live check — the client is not deployed; 0512 owns T1–T3.

### Decision log

Build worker under the marker: no review fixes were applied in this pass. Calls made inside the plan:

1. **Obvious winner — `prepareAfterLogin` answers `held_elsewhere` before the payments-refresh check.**
   The plan's deviation 2 routes a held-elsewhere answer to the read; whether the refresh landed does
   not matter there, because after `held_elsewhere` the automatic path never pays (a `buy` read →
   `needs_tap`). Qualified: within deviation 2's intent ("still never pays by itself"); test pins the
   no-refresh case.
2. **Obvious winner — `buyCitizenship` return type widened to include `"held_elsewhere"`.** Deviation 9
   needs the card to return something the explainer does not read as `"error"` (the explainer's
   `buyThroughCard` shows its red line only on `"error"`). Only caller: the explainer. Qualified:
   needed to implement deviation 9 on both surfaces; tests on both.
3. **Mechanical — the explainer's links use a new `.contact-link` class in its shadow styles**, sized
   like its other buttons; the card's links reuse the card's existing secondary-button classes. Qualified:
   presentation of the approved Telegram + VK links.
4. **Mechanical — the card draws the line where the Buy CTA would be** (after the status notice, before
   name change). Qualified: the plan replaces Buy with the line.
5. **Mechanical — `completePurchase`'s doc comment rewritten** ("returns the purchaseToken to consume"
   became wrong). Same file and same kind of fix the plan names for `reconcilePurchases`.
6. **Mechanical — the existing "NO Authorization header" API-client test** asserted only the first of its
   two fetches; it now asserts both (the reconcile one with a `null` token). Qualified: the plan names
   this suite's Bearer tests.
7. **Mechanical — a strict-parse test for an unknown `heldElsewhere` id** (`failed`), pinning residual
   R-S2-1 as the plan describes it. No behaviour change.

### Observed, not changed (outside the plan)

- **Explainer "get it free" line for an earned citizen whose purchase is held elsewhere.** The explainer
  hides `free_body` only for offers `citizen` / `citizen_buy` (task 0421). An earned citizen whose paid
  purchase is held elsewhere now gets offer `held_elsewhere` (plan step 5, approved), so that line shows
  for him. The offer carries no citizen flag, so fixing it needs a small shape change. Cosmetic; no
  purchase risk.

## 2026-10-26 — Process-review worker, round 1 (fkit-coder, spawned by fkit-lead under the ADR-055 marker)

Marker checked: caller fkit-lead; plan carried verbatim (blob `04e5893f` matches `plan.md`); owner rulings
quoted with date and channel (R1 "Fix it now in 0510 (Recommended)", R3 "Note it in 0501 (Recommended)");
role Process-review. Nothing committed or pushed.

### Change surface

- `src/client/CitizenshipOffer.ts` — `held_elsewhere` offer carries `isCitizen`; `deriveCitizenshipOffer`
  fills it from the profile.
- `src/client/CitizenshipExplainerModal.ts` — `isCitizenHeldElsewhere()` helper; `free_body` hidden for a
  citizen held elsewhere; `renderHeldElsewhere(isCitizen)` draws the already-citizen line first;
  `renderGuestFlow` takes the flag.
- `tests/client/CitizenshipOffer.test.ts`, `tests/client/CitizenshipExplainerModal.test.ts` — R1 cases.
- `ai-agents/knowledge-base/analytics-event-reference.md` — `Purchase:HeldOnOtherProfile` row (R2).
- `review.md` — Coder response R1–R3, accepted residual (R3), Status `closed-out`.

### Checks

- Targeted (6 suites: CitizenshipOffer, CitizenshipExplainerModal, CitizenshipCard, PurchaseOffer,
  PurchaseCoordinator, CitizenshipExplainerLang) — 546/546 pass.
- Mutation: `isCitizenHeldElsewhere` → `false` and `renderHeldElsewhere(false)` → 3 R1 tests fail; restored.
- `npx tsc --noEmit -p tsconfig.json` — clean. `npm run lint` — clean. Prettier `--check` on the 4 edited
  `.ts` files — clean.
- Full `npm test` (npm script, project lock), once: **241 suites / 5356 tests passed** (+4 vs the build
  run), 92 s. No supertest flake; `SshAlerts.test.ts` and `InternalPathCase.test.ts` passed (no
  recurrence).

### Decision log

1. **R1 — fix applied without per-fix approval: owner ruling "Fix it now in 0510", shape chosen by me.**
   Finding: earned citizen held elsewhere loses "already a citizen" and sees "get it free" in the explainer.
   Changed: `isCitizen` on the citizenship `held_elsewhere` offer; explainer reads it on the offer path and
   the guest-flow end state. Why it qualified: verified `CORRECT`, localized to the citizenship offer
   mapping and the explainer (shared `PurchaseOffer` and the coordinator untouched; card unchanged), and
   inside the owner's ruling; the guest-flow line uses the same helper, so it stays within the fix's intent.
2. **R2 — doc fix applied: verified `CORRECT`, mechanical, docs only.** Finding: the analytics row
   over-claimed that the event means the line was shown. Changed: the row now names the owner-here case
   and points at the closest signals for "saw the line" without claiming they count it.
3. **R3 — no code change; residual recorded per owner ruling "Note it in 0501".** 0501 not edited (the
   producer adds the case).

