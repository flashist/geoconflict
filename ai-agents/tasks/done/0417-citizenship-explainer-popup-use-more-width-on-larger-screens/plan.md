# Plan — 0417: Citizenship explainer popup: use more width on larger screens

## Goal
On tablets and desktops, let the "Что такое гражданство?" popup grow wider than it is today, up to a comfortable reading width. On a phone (~360 px) it must look exactly as it does now. Only the layout changes, in the game client. No text changes.

## What limits the width today (checked in the code)
- File: `src/client/CitizenshipExplainerModal.ts`, the `.modal-box` rule in `static styles`:
  `width: 360px; max-width: 90vw; max-height: 90vh; overflow-y: auto;`
- The fixed `width: 360px` keeps the popup phone-sized on every screen. At 360 px, `90vw` = 324 px, so a phone already shows a 324 px box. The 360 px only applies on screens wider than 400 px.
- The popup is its own standalone LitElement, the same pattern as `GameStartingModal` (which has its own `width: 300px`). It does **not** use the shared `o-modal` (`components/baseComponents/Modal.ts`, max 860 px, used by the Instructions window). So changing it affects no other popup. This answers the brief's pointer.
- **Why the scrollbar is light (likely cause, found in code, not proven in a browser):** the app's dark scrollbar is set once in `src/client/styles.css` (`::-webkit-scrollbar`, `-track`, `-thumb`, `-thumb:hover`). Those page-level rules do not reach inside the popup's shadow DOM, so the popup's scroll box gets the browser's default (light) scrollbar. "Shadow DOM" is the component's private style scope.

## Seams with 0408 and 0409 (same file, uncommitted in the working tree)
- 0408 added `.modal-box h4` (the "paid only" sub-heading). 0409 added no CSS. Its `citizen_buy` Buy button uses the existing full-width `.modal-box button` and `.primary-btn` rules.
- This task edits only the `.modal-box` rule and adds new scrollbar rules beside it. No change to `render()`, `renderAction()`, the h4 rule or the button rules. So no overlap with 0408/0409 logic.
- Build after 0409's review step finishes. If 0409's review changes the styles block, rebase onto that.

## Change (one file)
`src/client/CitizenshipExplainerModal.ts`, `static styles` only:
1. `.modal-box`: `width: 360px` → `width: <owner-confirmed cap>` (recommended **600px**). Keep `max-width: 90vw`, `max-height: 90vh`, `overflow-y: auto`, padding, fonts and colors unchanged.
   - Result with 600px: up to ~400 px screen width the box stays 90% of the screen (today's phone look, pixel for pixel). From there it grows with the screen until it hits 600 px, which happens at ~667 px screen width. A 768 px tablet gets 600 px. Every desktop gets 600 px.
   - Text width at 600 px: 600 − 48 padding − 20 list indent ≈ 530 px of text at 14 px. That is about 70–75 characters a line, the top of the usual comfortable range. Wider would make lines long and hard to read.
   - Inside the Yandex iframe, `vw` is measured on the iframe, not the browser window. So a narrow iframe still caps the box. Correct behavior.
2. (If open question 3 = fix here) Add scrollbar rules scoped to the popup that copy the app's own look from `styles.css`:
   `.modal-box::-webkit-scrollbar { width: 8px }`, `::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 4px }`, `::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px }`, `::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3) }`.
   - This matches the rest of the app and applies in Chromium-based browsers (Chrome, Yandex Browser, Edge) and Safari.
   - Deliberately **no** `scrollbar-color`/`scrollbar-width`: in current Chromium, setting those turns the `::-webkit-scrollbar` rules off. Firefox therefore keeps its default scrollbar, the same as the rest of the app today. This gets noted in the worklog.
   - The comment says why the rules are copied: page styles don't reach into this component.
3. A one-line comment on the width rule pointing to task 0417. Matches the file's existing comment style.

## Edge cases checked in the plan
- Phone 360 px: box stays 324 px (90vw), the same as today. Nothing else changes.
- Big phones 401–430 px wide: the box grows slightly, from 360 px to at most ~387 px. This is the only phone-sized change and it is intended (still 90% of the screen, no sideways scroll).
- Buttons stay `width: 100%`. At 600 px they become ~552 px wide (Buy, Log in, Close, and 0409's citizen Buy). The visual check confirms this looks fine. Capping button width is a separate design call, not taken here.
- Short screens (e.g. 1280×600, 360×560): the box still caps at 90vh and scrolls. Close stays reachable by scrolling.
- Stacking order: `z-index: 10000` on the overlay is untouched, so the popup stays above the Instructions window (9999).
- The private-lobby benefit line's show/hide rule, 0408's sub-heading and every offer state render the same. Only the box width changes.
- No text keys are touched. `en.json` and `ru.json` are not edited.

## Tests and checks
1. **Automated:** jsdom (the test browser) does no layout, so a width test would only check that the CSS text contains "600px", which proves nothing. No new test is planned. Run `npm test -- tests/client/CitizenshipExplainerModal.test.ts tests/client/CitizenshipExplainerLang.test.ts`, then full `npm test` (judge any `supertest` timeout by the known-flake rule and say so if re-run), then `npm run lint`.
2. **Local visual check** (`npm run dev`, Playwright Chromium, guest session). Same method as 0409: stub the page's `<citizenship-card>.getCitizenshipOffer()`, set the popup visible, price stub "199 ₽", **never tap Buy**.
   - **Before editing:** measure today's box width at 360×740 (expected 324 px) and at 1280×800 (expected 360 px), and take screenshots. This gives the baseline for "phone unchanged".
   - **After:** ru and en, at **360×740**, **768×1024**, **1280×800** (plus **1920×1080**). States: `buy` (non-citizen with XP line), `citizen_buy` (0409's button), `guest` (Log in button).
   - Per case, record: box width (`getBoundingClientRect`), equal to the baseline at 360 px, ≤ cap and ≤ screen width elsewhere; no horizontal overflow inside the box (`scrollWidth ≤ clientWidth`); 0408's "paid only" sub-heading and its list visible; all headings, lists and buttons fully visible and not overlapping.
   - **Scroll case:** 1280×600 and 360×560. The box scrolls (`scrollHeight > clientHeight`) and Close is reachable. Screenshot the scrollbar: dark, matching the app, in Chromium.
   - **Instructions case:** open the Instructions window, open the popup from its link, and confirm the popup is on top (`elementFromPoint` at the box centre hits the popup).
   - Screenshots go to the gitignored `.playwright-mcp/0417-*.png`. A yes/no table goes in the worklog. Afterwards stop the dev server and confirm ports 9000/3001/3002 are free.
3. **Not done locally (by design):** the look inside the real Yandex iframe after a deploy. The brief keeps this open after close, folded into the next popup live check. No verify task is filed.

## Out of scope
- Other popups/modals (unless the owner says otherwise in Q2).
- Font sizes, padding, button widths, any text.
- Firefox's scrollbar look.
- The start page behind the popup being ~413 px wide and scrolling sideways at 360 px. Seen during 0409's check, it exists in every state, comes from the page rather than this popup, and is not caused or fixed by this task. It can be filed separately if wanted.

## Deploy note
This ships with a later game deploy in the owner's weekend slot (ruling 2026-09-29). The 2026-10-08 same-day exception covered `0407`–`0409` and `0416`, not this task. Commit and deploy stay the owner's call. Committed is not deployed.

## Plan-gate record
Before building, the owner's answers to Q1–Q3 (who, date, channel, exact words) go into the worklog.
