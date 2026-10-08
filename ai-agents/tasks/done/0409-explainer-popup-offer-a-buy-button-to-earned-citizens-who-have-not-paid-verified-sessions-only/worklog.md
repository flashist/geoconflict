# Worklog — 0409: explainer popup Buy button for earned, verified, not-paid citizens

Built by `fkit-coder`, spawned by `fkit-lead` (`fkit-sprint-ship-loop`, Sprint 7, step **Build**),
2026-10-08, under the loop's declared-approval marker. Approved plan: `plan.md` in this folder (git blob
`7ba572f89876a62bf83275740d4b68c2cf18bba2`, 17821 bytes — re-hashed at build start, matched; `plan.md`
not touched). Nothing committed.

## Owner answers to the plan's open questions (plan gate — Verification step 1)

Who: the owner. Date: 2026-10-08. Channel: `AskUserQuestion`, live in the lead session (the
`fkit-sprint-ship-loop` driver), relayed verbatim to this build spawn. I did not see the exchange
myself; these are the words as relayed. They also answer the brief's open points 1–6.

| # | Question | Owner's answer |
|---|---|---|
| Q1 | Where does the citizen Buy show? | **Popup only.** No card render change. |
| Q2 | Heading `citizen_buy_title` | RU **`Платное гражданство`**, EN **`Paid citizenship`** |
| Q3 | Button `citizen_buy_cta` | RU **`Купить платное гражданство — {price}`**, EN **`Buy paid citizenship — {price}`** — "use the same price placeholder/format the existing non-citizen CTA uses; if that differs from `{price}`, match the existing mechanism — obvious-winner call, log it" |
| Q4 | Keep "Вы уже гражданин." above the heading? | **Keep.** |
| Q5 | Post-purchase restart popup | **Keep today's**, unchanged (no Files-to-change item 7). |
| Q6 | Hint for an unverified earned citizen? | **Today's text only** — no hint string. |
| Q7 | Has the owner seen the non-citizen popup Buy? | **Yes**, on a non-citizen account. |
| Q8 | Separate tap event? | **Yes** — `UI:Tap:PurchasePaidCitizenshipExplainer` via `flashistConstants`, plus the row in `analytics-event-reference.md`. |
| Q9 | Real purchase anywhere? | **No.** Local stubbed checks only; never tap Buy on any real account. |
| Q10 | Stale verified read gap | **Accept** for now (as today); no follow-up task filed. |

## What changed

- `src/client/CitizenshipOffer.ts` — new offer kind `{ kind: "citizen_buy"; price }`; two new inputs
  `isVerifiedRead`, `isPaidCitizen`; citizen branch returns `citizen_buy` only when **not**
  `paidGrantConfirmed` **and** the read is authoritative **and** verified **and** not paid **and** a
  product exists — every other case `citizen`. Header comment extended (guard now covers citizens;
  ADR-116 Decision 4; server does not refuse a second purchase).
- `src/client/CitizenshipCard.ts` — `getCitizenshipOffer()` feeds
  `getProfileVerificationStatus() === "verified"` and `isCurrentPlayerPaidCitizen()` (same values as
  0397's status line and 0248's ad gate). Comment at the card's `offer.kind === "buy"` check: popup
  only. **No card render change** (Q1).
- `src/client/CitizenshipExplainerModal.ts` — new `case "citizen_buy"` in `renderAction()`:
  `#citizenship-explainer-already-citizen` (Q4) → `<h3 id="citizenship-explainer-citizen-buy-title">` →
  `<button id="citizenship-explainer-citizen-buy" class="primary-btn">` text + ` — {price}` → shared
  error line. Close stays last. `onBuyTap` and new `onCitizenBuyTap` both go through one
  `buyThroughCard(tapElementId)`; the error line moved into `renderPurchaseError()`, used by both Buy
  cases. Non-citizen `buy` case otherwise unchanged. No new CSS. Class comment +1 line.
- `src/client/flashist/FlashistFacade.ts` — `uiElementIds.purchasePaidCitizenshipExplainer =
  "PurchasePaidCitizenshipExplainer"` (Q8).
- `resources/lang/en.json`, `resources/lang/ru.json` — `citizenship_explainer.citizen_buy_title`,
  `citizenship_explainer.citizen_buy_cta` (owner words; price appended in code, see decision log D1).
- `ai-agents/knowledge-base/analytics-event-reference.md` — new UI:Tap row after
  `PurchaseCitizenshipExplainer` (says `Purchase:*:Citizenship` does not tell an upgrade from a first
  purchase; this tap counts upgrades); funnel-reading line names the new tap.
- Tests:
  - `tests/client/CitizenshipOffer.test.ts` — fixture defaults `isVerifiedRead: false, isPaidCitizen:
    false`; new `citizen_buy (task 0409)` block: verified+not paid+product → `citizen_buy`; **"double-charge
    guard: an unverified citizen never gets a buy offer"**; verified paid → citizen; `paidGrantConfirmed`
    → citizen; no product → citizen; checking beats `citizen_buy`; non-citizen results
    (buy / no_product / read_failed / guest) unchanged for all four flag combinations.
  - `tests/client/CitizenshipExplainerModal.test.ts` — `citizen_buy`: already-citizen line + heading +
    `primary-btn` button with price, no XP line, no non-citizen copy; DOM order paid-only block →
    already-citizen → heading → button → Close; tap → `card.buyCitizenship("PurchasePaidCitizenshipExplainer")`;
    `"error"` → error line, button stays; `"busy"` → nothing; `citizen` has no citizen Buy; live
    appear/disappear on the offer-changed event; "names nothing that is not built" runs for `buy` and
    `citizen_buy`.
  - `tests/client/CitizenshipCard.test.ts` — under the 0301 popup seam: verified earned + product →
    `citizen_buy` **and no `#citizenship-buy-button` on the card**; unverified citizen → citizen;
    verified paid → citizen; after a `"granted"` purchase → citizen when the re-read fails **and** when it
    is stale (still verified, not paid).
  - `tests/client/CitizenshipExplainerLang.test.ts` — both keys appended to `REQUIRED_KEYS` after 0408's
    entries; new test pins the RU and EN strings to the owner's words.

Not touched: `plan.md`, server / profile-server / core / nginx / HTML templates, restart popup (Q5), other
languages. Other uncommitted changes in the tree (0408, 0416, sprint docs) are not this task's — the
diffs of `CitizenshipExplainerModal.ts`, its tests and the lang files also carry 0408's uncommitted
lines.

## Evidence

- **Four targeted suites:** `npx jest tests/client/CitizenshipOffer.test.ts
  tests/client/CitizenshipExplainerModal.test.ts tests/client/CitizenshipCard.test.ts
  tests/client/CitizenshipExplainerLang.test.ts` → 4 suites passed, **337 tests passed**.
- **Mutation check:** removed the `inputs.isVerifiedRead &&` line from `deriveCitizenshipOffer` → 3
  red: `double-charge guard: an unverified citizen never gets a buy offer`, the card's
  `is citizen for an unverified citizen`, and the existing 0301 `citizen for a citizen profile`.
  Restored from a copy; re-run green (22/22 in the offer suite).
- **Lint:** `npm run lint` clean. `npx tsc --noEmit -p .` printed no errors.
- **Full `npm test`:** first run green — **211 suites, 4228 tests passed**, 50.8 s, exit 0. No re-run
  needed; no flake, no `SIGSEGV`.
- **en/ru parity + exact words:** covered by the Lang suite (REQUIRED_KEYS, same key set, pinned strings).
- **Local visual check** (`npm run dev`, Playwright, guest session). Method: stubbed the page's
  `<citizenship-card>.getCitizenshipOffer()` to return each offer and made the popup visible directly
  (see D2). Price stub `199 ₽`. **No purchase, no Buy tap anywhere.** Paid-citizen and
  unverified-citizen states both reach the popup as offer `citizen` (the rule's job, covered by unit
  tests), so they are one visual state here.

  | State (offer) | RU desktop (1200 px) | RU 360 px | EN desktop (1280 px) | EN 360 px |
  |---|---|---|---|---|
  | verified earned (`citizen_buy`) — button above Close, login-button blue | yes | yes | yes | yes |
  | paid / unverified citizen (`citizen`) — no button | yes | yes | yes | yes |
  | non-citizen (`buy`) — unchanged ("Купить гражданство — 199 ₽" / "Buy Citizenship — 199 ₽", XP line) | yes | yes | yes | yes |

  Measured: citizen Buy `background-color` `rgb(37, 99, 235)` = the popup's "Войти в Яндекс" button
  (same `primary-btn`); button bottom above Close top in every width; RU text wraps to two lines inside
  the button at 360 px; popup box has no horizontal overflow. Rendered text: RU "Вы уже гражданин." /
  "Платное гражданство" / "Купить платное гражданство — 199 ₽"; EN "You are already a citizen." /
  "Paid citizenship" / "Buy paid citizenship — 199 ₽".
  Screenshots (local, gitignored): `.playwright-mcp/0409-{ru,en}-{desktop,360}-citizen_buy.png`.
  ⚠️ Side note, not 0409's: at 360 px the **start page behind** the popup is 413 px wide (page-level
  horizontal scroll) in every state, including unchanged ones.
- Dev server stopped afterwards; ports 9000 / 3001 / 3002 free (checked with `lsof`).
- **Not done here (by plan):** Verification step 6, the live look on the owner's earned and paid test
  accounts after a game deploy (build/verify split, 2026-09-29) — and never tapping Buy there (Q9).

## Decision log (obvious-winner calls made without asking)

- **D1 — price format for `citizen_buy_cta` (Q3).** The existing non-citizen CTA has no `{price}`
  placeholder: `citizenship_paid.buy_cta` is "Купить гражданство" and the code appends
  `— ${price}`. Per the owner's own instruction ("match the existing mechanism"), the key holds
  "Купить платное гражданство" / "Buy paid citizenship" and the popup appends ` — ${offer.price}`.
  Rendered text equals the owner's words exactly (checked live above). Qualified: owner pre-authorized
  it as an obvious-winner call; inside the plan.
- **D2 — how the visual check opens the popup.** `show()` waits on the citizenship kill switch /
  surfaces flag; to keep the check independent of that flag's local value (not tested whether it
  passes), the check set the popup's `isVisible` directly after stubbing the card's offer. Verification-only; no source change; the
  plan already allowed stubbed reads. Qualified: within the plan's intent (step 5 checks the render, not
  the opening path, which existing tests cover).

No review fixes applied (this is the build step; no review yet).

**Process review, round 1 (fkit-coder, Process-review worker of `fkit-sprint-ship-loop`, 2026-10-08):**
- Fixes applied without asking: **none**. Obvious-winner calls: **none**. The ledger had no finding rows.
- Codex X1 (tap-time re-check of the live offer): re-verified the reviewer's disproof at file:line and concur — recorded in `review.md` § Coder response; no row, no code change.
- **Owner ruling, live `AskUserQuestion` in the lead session, 2026-10-08 (relayed by the driver): "Ship as is"** — no tap-time re-check is to be added.
- `review.md` header set to `Status: closed-out`.

## Verify (independent re-run)

Sprint-ship-loop Verify worker, 2026-10-08, current working tree (also carries uncommitted 0408/0416 changes). No source written.

- **4 targeted suites** (`CitizenshipOffer`, `CitizenshipExplainerModal`, `CitizenshipCard`, `CitizenshipExplainerLang`): 4/4 suites, **337/337 tests pass**.
- **Every other suite importing `CitizenshipOffer` / `CitizenshipCard` / `CitizenshipExplainerModal` / `FlashistFacade`** (grep of `tests/`, 46 `*.test.ts`): **46/46 suites, 929/929 tests pass**. No flake seen, so no re-run was needed. (My first attempt passed the file list to jest as one argument because zsh does not split words; that was my command's mistake, not a test result. I re-ran it correctly through `xargs`.)
- **`npx tsc --noEmit`**: exit 0. **`npm run lint`**: exit 0.
- **Language files:** `en.json` and `ru.json` are valid JSON. `citizenship_explainer` has the same 18 keys in both (none missing on either side). RU `citizen_buy_title` = `Платное гражданство`. RU `citizen_buy_cta` = `Купить платное гражданство`. The popup template is `${cta} —⏎${offer.price}` (`CitizenshipExplainerModal.ts:427-428`), and HTML collapses whitespace, so the shown text is `Купить платное гражданство — <price>`. I worked that out from the template and did not render it myself. The build step's live check above saw it rendered.
- **Mutation check (step 5): SKIPPED on the driver's order.** A reviewer was reading `CitizenshipOffer.ts` at the same time. I never edited the file. Its sha256 was `7f7e6f96…a5de1bb` both before and after this run, and its `git diff --stat` was the same (+21) both times. That check is covered only by the build step's earlier run, not repeated here.
