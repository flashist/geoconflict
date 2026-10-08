# Plan — 0408: put the paid-only ad-free perk under its own "Только для платного гражданства:" sub-heading

Planned by `fkit-coder`, spawned by `fkit-lead` (`fkit-sprint-ship-loop`, Sprint 7, step Plan), 2026-10-08. Planning only. No source and no files were written.

## Goal

In the "What is citizenship?" popup, the ad-free line currently sits under "Что получают граждане" ("What citizens get"), so it looks like every citizen gets it. Only paid citizens do (`0248`). Per the owner's ruling of 2026-10-08 (option 2), the popup gets a small sub-heading **`Только для платного гражданства:`** (the owner's exact words) below the all-citizens list, and the ad-free line moves under it as its own short list.

## What I found in the code

- The whole popup is in `src/client/CitizenshipExplainerModal.ts` (`render()`, about lines 303–317). The benefits are one `<ul id="citizenship-explainer-benefits">` with four `<li>` items. `benefit_no_ads` is the last item. `benefit_private_lobby` is conditional (`showPrivateLobbyLine`, owner ruling Q3).
- Styles live in the same file (`static styles`). Section headings are `h3` (15px bold, top margin 16px). List items are 14px. There is no `h4` rule today.
- `benefits_title` and `benefit_no_ads` appear **only** in this popup (checked with grep across `src/` and `tests/`). No other screen breaks if they change.
- Tests that list the keys: `tests/client/CitizenshipExplainerLang.test.ts` (an explicit `REQUIRED_KEYS` list, en/ru key-set parity, a "promises nothing that is not built" word filter) and `tests/client/CitizenshipExplainerModal.test.ts` ("renders every built benefit", the private-lobby show/hide tests).
- The new strings pass the existing word filters. RU "Только для платного гражданства:" and EN "Paid citizenship only:" contain none of the banned words (emoji/archive/replay/vote/flag/inbox/soon and their RU forms). A key named `paid_only_title` also passes the modal test's key filter.

## Files to change

1. `src/client/CitizenshipExplainerModal.ts`: markup plus one CSS rule.
2. `resources/lang/en.json`: `citizenship_explainer` section.
3. `resources/lang/ru.json`: `citizenship_explainer` section.
4. `tests/client/CitizenshipExplainerLang.test.ts`
5. `tests/client/CitizenshipExplainerModal.test.ts`

No other file. No server, core, nginx, HTML template or analytics change.

## Approach, step by step

1. **Strings (both files, same keys):**
   - New key `citizenship_explainer.paid_only_title`:
     - RU `Только для платного гражданства:` (exact, owner-given, never reworded)
     - EN `<owner-confirmed text, open question 1>` (recommended: `Paid citizenship only:`)
   - `benefit_no_ads`, depending on open question 2:
     - **if the suffix is dropped (recommended):** RU `Без полноэкранной рекламы перед матчами и после них`, EN `No full-screen ads before and after matches`
     - **if it is kept:** both values stay unchanged.
   - Nothing else in either file changes.

2. **Markup (`render()`):**
   - `benefit_badge`, `benefit_name_change` and the conditional `benefit_private_lobby` stay in `<ul id="citizenship-explainer-benefits">`, unchanged.
   - Remove the `benefit_no_ads` `<li>` from that list.
   - Directly after that list, add:
     - `<h4 id="citizenship-explainer-paid-only-title">${translateText("citizenship_explainer.paid_only_title")}</h4>`
     - `<ul id="citizenship-explainer-paid-only"><li id="citizenship-explainer-benefit-no-ads">${translateText("citizenship_explainer.benefit_no_ads")}</li></ul>`
   - `h4` under an `h3` gives the correct heading order for screen readers: a sub-section of "What citizens get", not a new top-level section.
   - Always shown, in every offer state (guest, non-citizen, citizen, checking, failed read), exactly as the ad-free line is shown today.
   - Update the class comment ("The benefit list names only what is built…") with one line: paid-only perks sit under their own sub-heading (task 0408).

3. **Style (one new rule in `static styles`):**
   - `.modal-box h4 { margin: 4px 0 6px; font-size: 13px; font-weight: bold; color: rgba(255,255,255,0.85); }`
   - It is smaller than the 15px `h3` section headings and has a tighter top margin than `h3`'s 16px, so it reads as part of the benefits block, not a new section.
   - The existing `ul` / `li` rules already style the new list. `.modal-box` width, padding and scrolling are not touched; that is `0417`'s job.

4. **Tests:** see *Tests* below.

5. **Verify:** targeted suites, then full `npm test`, `npm run lint`, then the local visual check. Results and screenshots go in the worklog.

## Edge cases and failure modes considered

- **Private-lobby line hidden** (row disabled, or its check throws): the all-citizens list has two items and the paid-only block still renders below it. A test covers this.
- **A missing translation key** would show the raw key on screen. The `REQUIRED_KEYS` entry plus the en/ru key-set parity test catch a key missing from either file.
- **RU text drift:** a test pins RU `paid_only_title` to the exact owner string, so a later "tidy-up" cannot reword it silently.
- **Double wording** ("Paid citizenship only:" followed by "…for bought citizenship only") happens only if the owner keeps the suffix. That is their call (open question 2), not a defect.
- **Phone width (~360px):** the popup box is `width: 360px; max-width: 90vw`. The heading is one short line and wraps naturally if needed. Checked by eye, step 6 of Verification.
- **Russian plural and grammar:** no placeholders in the new strings, so no `{param}` mismatch risk. The placeholder-parity test still runs over the new key.
- **A paid citizen sees "Paid citizenship only:"** too. That is the same as today (the line shows for everyone) and is correct as information. Nothing to change.

## Tests

`tests/client/CitizenshipExplainerLang.test.ts`
- Add `["citizenship_explainer", "paid_only_title"]` to `REQUIRED_KEYS`. This gives three checks for free: non-empty in both files, same placeholders, RU differs from EN.
- New test: RU `citizenship_explainer.paid_only_title` equals exactly `Только для платного гражданства:` (owner ruling 2026-10-08).
- If the suffix is dropped: a test that neither file's `benefit_no_ads` still carries the old suffix (RU `только для купленного`, EN `for bought citizenship only`). This guards against half-applying the change to one file.

`tests/client/CitizenshipExplainerModal.test.ts`
- "renders every built benefit": add `citizenship_explainer.paid_only_title` to the key list.
- New test "the ad-free line sits under the paid-only sub-heading, not in the all-citizens list":
  - the `#citizenship-explainer-benefits` text contains badge, name change and private lobby, and does **not** contain `benefit_no_ads`
  - `#citizenship-explainer-paid-only` contains `benefit_no_ads`
  - in page order: the `#citizenship-explainer-benefits` list comes before `#citizenship-explainer-paid-only-title`, which comes before `#citizenship-explainer-paid-only` (checked with `compareDocumentPosition`)
- New test: with the private-lobby row disabled, the paid-only heading and the ad-free line still render, and the private-lobby line is absent.
- The existing private-lobby show/hide tests run unchanged and must still pass.

## Verification

1. **Plan gate:** worklog records the owner's answers to open questions 1 and 2 (who, date, channel, words) before any string is written.
2. `npm test -- tests/client/CitizenshipExplainerLang.test.ts tests/client/CitizenshipExplainerModal.test.ts`: green.
3. Full `npm test`: green. Any red run is judged by CLAUDE.md's flake/`0197` rules and reported as-is.
4. `npm run lint`: clean.
5. RU `paid_only_title` reads exactly `Только для платного гражданства:`; EN carries the owner-confirmed text; both files have the same keys.
6. **Local visual check, `npm run dev`:**
   - in RU and EN, at desktop width and at ~360px phone width
   - open the popup from the card's "What is citizenship?" link (dev is a guest session; the benefits block renders for every offer state)
   - per case: sub-heading and ad-free line fully visible, not clipped, no overlap; the sub-heading visibly smaller than "Что получают граждане" / "Как получить бесплатно"; the popup still scrolls and fits as before
   - screenshots or a yes/no per case in the worklog; dev server stopped afterwards
7. **Live look:** after a later game deploy, by the build/verify split rule (2026-09-29). This task closes on the local evidence above and does not stay open for it.

## Seams with the tasks built next (0409 → 0417 → 0407)

- **0409 (Buy button for earned, unpaid citizens; same `render()`):**
  - Its brief recommends tying the citizen's Buy button to this new paid-only section ("the reason to buy is the line just above it").
  - So 0408 keeps the paid-only block **self-contained, with stable ids**: `citizenship-explainer-paid-only-title`, `citizenship-explainer-paid-only`, `citizenship-explainer-benefit-no-ads`. 0409 can insert directly after `#citizenship-explainer-paid-only` without renaming anything.
  - 0408 does not touch `renderAction()`, `currentOffer()` or `CitizenshipOffer.ts`, which are all 0409's area.
  - 0409 adds keys to the same `citizenship_explainer` section and the same `REQUIRED_KEYS` list, which is a simple append after 0408's entries.
- **0417 (wider popup):**
  - 0408 adds one new CSS rule (`.modal-box h4`) and does **not** touch the `.modal-box` box rule (`width: 360px`, `max-width: 90vw`), which is what 0417 changes.
  - No overlap, apart from both editing the same `static styles` block, one after the other.
  - 0417's visual check should include this sub-heading (its brief already says so).
- **0407 (thank-you on the citizenship card):** a different component (`CitizenshipCard.ts`) and different lang sections. No shared lines with 0408.

## Out of scope

- Options 1 and 3 from the owner's ruling: rejected, not reopened.
- The card (`CitizenshipCard.ts`) and `0397`'s "платного" status line: not touched.
- Popup width, scrollbar and other modals (`0417`); the Buy button for earned citizens (`0409`); the card thank-you text (`0407`).
- Any change to who gets the ad-free perk (`0248` logic) or to the purchase flow.
- Other language files (de, fr, …): project rule says en + ru only.

## Deploy note

Client-only text and layout. It ships in the game image on the next game deploy; no server, profile-server, nginx or migration change. The owner's 2026-10-08 ruling allows a same-day deploy for 0407–0409 (*"might"*, not a commitment). Committing and deploying stay the owner's call. Nothing is committed by this task unless the owner asks.
