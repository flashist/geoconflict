# Worklog — 0417: Citizenship explainer popup: use more width on larger screens

Build step by fkit-coder, Build worker of `fkit-sprint-ship-loop` (Sprint 7), 2026-10-08. Built from
the approved `plan.md` (blob `b40003529d30e9442939d0c618001abd66ba8d70`, unchanged by this step).

## Plan-gate record (owner answers)

Asked by the lead session (`fkit-sprint-ship-loop` driver) via `AskUserQuestion`, 2026-10-08,
answered by the owner; relayed to this worker in its spawn prompt.

| Q | Question | Owner's answer (words as relayed) |
|---|---|---|
| Q1 | Max width of the popup | **"600 px"** |
| Q2 | Other popups too? | **"File a task for the others"** — this task stays this popup only; the driver routes the new task to a producer. No other popup touched here, no brief written here. |
| Q3 | Fix the light scrollbar here? | **"Yes, fix it here"** — the four scoped `::-webkit-scrollbar` rules; confirm the cause in the browser. |

## Changes

One file, `static styles` only: `src/client/CitizenshipExplainerModal.ts`.

1. `.modal-box`: `width: 360px` → `width: 600px`, with a one-line `Task 0417` comment.
   `max-width: 90vw`, `max-height: 90vh`, `overflow-y: auto`, padding, fonts, colors unchanged.
2. Four new rules beside it: `.modal-box::-webkit-scrollbar` (8px), `-track`, `-thumb`,
   `-thumb:hover`, copied from `src/client/styles.css:22-38`. Comment says why (page styles don't reach
   into the component) and why there is no `scrollbar-color` (in Chromium it turns these rules off).
   Firefox keeps its default scrollbar, same as the rest of the app.

Not touched: `render()`, `renderAction()`, the 0408 `h4` rule, button rules, any text, `en.json` /
`ru.json`. The 0408/0409 hunks in the same file are theirs and were left alone.

## Evidence

### Automated
- `npx jest tests/client/CitizenshipExplainerModal.test.ts tests/client/CitizenshipExplainerLang.test.ts`:
  2/2 suites, **127/127 pass**.
- Full `npm test`: **211/211 suites, 4228/4228 tests pass**, 49.8 s, exit 0 — first run, no re-run, no
  flake, no `SIGSEGV`.
- `npm run lint`: exit 0. `prettier --check` on the file: clean.
- No new test, by plan: jsdom does no layout, so a width test would only check CSS text.

### Local visual check
`npm run dev`, Playwright Chromium, guest session. Method as 0409's D2: stubbed the page's
`<citizenship-card>.getCitizenshipOffer()` per state and set the popup's `isVisible` directly. Price stub
`199 ₽`, XP stub 40. **No Buy tap anywhere.** Baseline measured **before** the edit with the same script.

**Box width (`getBoundingClientRect().width`), px — identical for ru and en, and for all three states
(`buy`, `citizen_buy`, `guest`):**

| Screen | Before | After | Expected |
|---|---|---|---|
| 360×740 | 324 | **324** | 324 (unchanged) ✔ |
| 360×560 | 324 | **324** | 324 (unchanged) ✔ |
| 400×800 | — | 360 | 360 (90vw) ✔ |
| 414×800 | — | 372.6 | ≤ 90vw ✔ |
| 430×900 | — | 387 | ~387 ✔ |
| 667×800 | — | 600 | cap reached ✔ |
| 768×1024 | 360 | **600** | 600 ✔ |
| 1280×800 | 360 | **600** | 600 ✔ |
| 1920×1080 | 360 | **600** | 600 ✔ |
| 1280×600 | 360 | **600** | 600 ✔ |
| 1280×500 | — | 600 | 600 ✔ |

**Per-case checks, after (36 cases: ru+en × 6 screens × 3 states, plus the extra sizes):**

| Check | Result |
|---|---|
| No horizontal overflow inside the box (`scrollWidth ≤ clientWidth`) | yes, every case |
| 0408's "Только для платного гражданства:" / "Paid citizenship only:" sub-heading visible, list under it | yes, every case |
| Buttons don't overlap; button text fits (`scrollWidth = clientWidth`) | yes, every case |
| Buttons at 600 px box | 552 px wide (Buy, `citizen_buy`'s Buy, Log in, Close) — as the plan predicted |
| Close reachable (scrolled to the end, inside the box) | yes, every case |
| Popup on top (`elementFromPoint` at box centre = the popup) | yes, every case |
| Rendered texts | ru "Купить гражданство — 199 ₽" / "Купить платное гражданство — 199 ₽" / "Войти в Яндекс" / "Закрыть"; en "Buy Citizenship — 199 ₽" / "Buy paid citizenship — 199 ₽" / "Log in with Yandex" / "Close" |

**Scroll case.** 360×560: box scrolls, Close reachable. 1280×600: **no longer scrolls after the change**
(box 537–538 px tall vs a 540 px limit — wider lines made the content shorter), so it could not show the
scrollbar; added 1280×500 (see D1), which scrolls (`scrollHeight > clientHeight`), Close reachable.

**Scrollbar cause: CONFIRMED in the browser.** Before: light, wide default scrollbar inside the popup
(`0417-before-ru-1280x600-buy.png`), computed `::-webkit-scrollbar` width `auto`. After: dark, 8 px,
matching the app (`0417-after-ru-1280x500-buy-scrollbar.png`, `0417-after-ru-360x560-buy-scrollbar.png`),
computed width `8px`, `offsetWidth − clientWidth` = 8. So the page-level rules in `styles.css` were not
reaching the shadow DOM, and the scoped copies fix it. Chromium only; Firefox not checked (by plan).

**Side effect of the scrollbar fix, noted:** when the box scrolls at 360 px, the thinner scrollbar
gives the content ~7 px more room — buttons 261 → 268 px. Box width is unchanged (324). Not when the box
doesn't scroll.

**Instructions case:** opened Instructions (`help-modal.open()`), clicked its "Что такое гражданство?"
link (real `show()` path). Popup visible, 600 px, `elementFromPoint` at its centre = the popup, above the
Instructions window (`0417-after-ru-1280x800-over-instructions.png`).

Note on screenshots: most were taken right after opening, so some show the page faintly through the box
— that is the existing 0.3 s fade-in, not a transparency change (the Instructions shot was retaken after
1 s, overlay opacity 1).

Screenshots (local, gitignored): `.playwright-mcp/0417-{before,after}-{ru,en}-{W}x{H}-{state}.png`
(72) plus the three named above.

Dev server stopped afterwards; ports 9000 / 3001 / 3002 free (`lsof`, no listeners).

### Not done here (by plan)
- The look inside the real Yandex iframe after a deploy — stays open after close, folded into the next
  popup live check. No verify task filed.
- Firefox scrollbar look; other popups (owner Q2: separate task, routed by the driver).
- The start page behind the popup being wider than a 360 px screen — seen again here, not this task's.

## Decision log (obvious-winner calls made without asking)

- **D1 — added 1280×500 to the scroll case.** The plan's 1280×600 scroll case stopped scrolling once the
  box got wider (content now fits: 537 ≤ 540 px), so it could no longer show the scrollbar or Close
  reachability under scroll. Added one shorter desktop size that does scroll. Verification-only, no
  source change. Qualified: within the plan's intent (the scroll case exists to check a scrolling box on
  desktop and the scrollbar look).
- **D2 — extra widths 400 / 414 / 430 / 667.** Measured to check the plan's own stated edge cases (big
  phones grow to at most ~387 px; cap reached at ~667 px). Verification-only. Qualified: checks numbers
  the plan already states.

No review fixes applied (build step; no review yet).

## Verify (independent re-run)

2026-10-08, sprint-ship-loop Verify worker, current working tree, no source touched.

- `npm test -- tests/client/CitizenshipExplainerModal.test.ts tests/client/CitizenshipExplainerLang.test.ts`
  → 2 suites passed, 127/127 tests, first run (no flake, no re-run needed).
- `npx tsc --noEmit` → exit 0. `npm run lint` → exit 0, no output.
- `git diff src/client/CitizenshipExplainerModal.ts`, styles block: 0417's part is only `.modal-box`
  `width: 360px` → `600px` (+ one comment) and the four `.modal-box::-webkit-scrollbar*` rules (+ one
  comment). `max-width: 90vw`, `max-height: 90vh`, `overflow-y: auto`, `padding: 24px` unchanged. No
  `scrollbar-color` / `scrollbar-width` property (grep's only hit is the explaining comment, line 97).
  Other hunks in the same file (`.modal-box h4`, the `citizen_buy` case, `buyThroughCard`,
  `renderPurchaseError`, header comment) belong to 0408/0409, not 0417.
- Result: pass.

## Process review (Round 1)

2026-10-08, fkit-coder as the `fkit-sprint-ship-loop` Process-review worker. Ledger `review.md`
Round 1: reviewer verdict "Ready to merge", no findings. Coder response recorded (no rows), header
`Status:` set to `closed-out`. No source touched.

### Decision log (fixes / obvious-winner calls made without asking)

- none — no finding to fix, no obvious-winner call made.
