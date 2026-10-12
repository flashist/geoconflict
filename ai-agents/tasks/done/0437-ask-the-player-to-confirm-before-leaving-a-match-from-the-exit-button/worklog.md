# Worklog — 0437

## 2026-10-11 — build (fkit-coder, spawned by fkit-lead)

**Approval.** Plan `plan.md` (blob `692dc52e118a47d66724b99d47497b97a930fc71`, re-checked unchanged before building)
approved by the owner through a live AskUserQuestion in the fkit lead session, 2026-10-11, relayed by fkit-lead:
"Approve plan (Recommended)"; full test run "Yes, one full run (Recommended)"; buttons "Stay blue, Leave grey
(Recommended)". ⚠️ The spawn message did not name `fkit-sprint-ship-loop` as the caller (marker part (a)); it named the
owner ruling and the exact plan blob, so I built under that declared approval and flag the gap here.

**Built (as planned, no departures).**
- New `src/client/ExitConfirmModal.ts` (`<exit-confirm-modal>`, CitizenshipRestartModal look, z-index 9999).
- New `src/client/MatchExit.ts` — `leaveMatch()` (ad → `clearReconnectSession()` → `changeHref(rootPathname)`) and
  `askToLeaveMatch()`.
- `GameRightSidebar.onExitButtonClick()` and `SettingsModal.onExitButtonClick()` → `askToLeaveMatch()`.
- Element added after `<settings-modal>` in `src/client/index.html` and `src/client/yandex-games_iframe.html`;
  `import "./ExitConfirmModal"` in `Main.ts`; `exit-confirm-modal` in LangSelector's re-render list.
- `exit_confirm_modal.leave|stay` in `en.json` ("Leave"/"Stay") and `ru.json` ("Выйти"/"Остаться").

**Decision log.**
- Outside tap = **Stay** (brief left it to the coder; never Leave). Owner kept it.
- Missing `<exit-confirm-modal>` ⇒ console error + leave at once (today's behaviour), never a dead button. Owner kept it.
- Stay = blue primary (right), Leave = grey (left). Owner ruled "Stay blue, Leave grey".
- Escape handled on `window` in the capture phase with `stopPropagation()` only while the popup is visible, so the
  settings window's own Escape does not also close settings underneath.
- Review fixes applied unattended: **none** (no review has run yet).
- Not reformatted: `GameRightSidebar.ts` and `SettingsModal.ts` already fail `prettier --check` at HEAD; left as is to
  keep the diff minimal (lint-staged formats on commit).

**Verification.**
- Targeted: `npm test -- tests/client/ExitConfirm.test.ts tests/client/LangSelectorRerender.test.ts
  tests/client/NoNativeTooltips.test.ts` → 3 suites, 32 tests passed.
- Mutation checks (reverted): removing the Escape `stopPropagation()` fails the settings-Escape test; removing the
  double-tap guard fails the Leave-once test.
- `npm run lint` → exit 0. `tsc --noEmit` → clean.
- Full `npm test` (one run, alone, through the npm script) → 223 suites, 4549 tests passed, 71.6 s, exit 0.
- **Not verified:** the by-hand check in the dev build (both templates, phone-width window) — no dev server or browser
  was allowed on the Mac. Live Yandex Games phone check belongs to a separate verify task (brief step 8).

## 2026-10-11 — review round 1 + by-hand check (fkit-coder)

**Review R1 (low)** — `hasLeft` never resets; a Yandex ad that never calls back leaves both exit buttons dead.
Verified CORRECT. Owner ruling, live AskUserQuestion in the fkit lead session, 2026-10-11: "Accept the risk" — "Record
it as a known limit. We revisit only if a player is seen stuck after pressing Выйти." → recorded under Accepted
residuals in `review.md`, **no code change**, ledger `Status: closed-out`.
Decision log: fixes applied unattended — **none**; obvious-winner calls — **none**.

**By-hand check** (owner ruling "Yes, check it locally"). Dev client (`webpack serve`, no auto-open) + dev game server,
one headless Chromium (the project's own Playwright 1.61.1), nothing else heavy running. Single-player "Play Mission"
match. 4 runs: `index.html` and `yandex-games_iframe.html`, each at 1280×800 (English) and 390×844 touch (Russian).
All 10 steps passed in all 4 runs:
sidebar exit shows popup (question + Leave/Stay, Выйти/Остаться) · Stay blue `rgb(37, 99, 235)` on the right, Leave grey
on the left · both buttons fully on screen, no `title` attributes · Stay closes · Escape closes · outside tap closes ·
still in the match after those three · Settings → Exit shows popup over Settings · Escape closes only the popup
(Settings stays open) · Leave (from Settings) returns to the start screen (`/` and `/yandex-games_iframe.html`).
- The ad is **not** exercised: locally there is no Yandex SDK, so `showInterstitial()` returns at once (no-SDK path).
- Leave was clicked from the Settings popup only in the browser; the sidebar's Leave runs the same `leaveMatch()` and
  is covered by the unit tests.
- Cosmetic, not changed: over the Settings window, a little of the Settings text shows through the popup box in the
  screenshot (box is 95 % opaque, the same as CitizenshipRestartModal; screenshot taken 0.4 s after the 0.3 s fade).
- Screenshots (session scratchpad, not in the repo): `<scratchpad>/shots/{index,iframe}-{desktop-en,phone-ru}-{1-popup,2-popup-over-settings,3-after-leave}.png`.
- Afterwards: dev client and server stopped; ports 9000/3000/3001/3002 free; no webpack, game-server or headless
  Chromium process left.
