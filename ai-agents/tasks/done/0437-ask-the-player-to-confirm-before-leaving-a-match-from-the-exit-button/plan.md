# Plan — 0437: ask before leaving a match from the exit buttons

Status: **awaiting owner approval** (phase 1 — no source edited yet).
Owner rulings applied (2026-10-11, lead session): Q1 popup + Settings exit behaves exactly like the sidebar exit ·
Q2 ask always (alive, dead, spectator; single player and multiplayer) · Q3 question = `help_modal.exit_confirmation`,
buttons "Выйти" / "Остаться" (en "Leave" / "Stay") · Q4+Q5 no pause change, no analytics.

## What the code does today (checked 2026-10-11)

- `src/client/graphics/layers/GameRightSidebar.ts` `onExitButtonClick()` — async; the upstream `confirm()` is commented
  out inside an empty `if (isAlive)`; then `await FlashistFacade.instance.showInterstitial()` →
  `clearReconnectSession()` → `FlashistFacade.instance.changeHref(rootPathname)`.
- `src/client/graphics/layers/SettingsModal.ts` `onExitButtonClick()` — only `changeHref(rootPathname)` (no ad, no
  clear). Settings has its own **window `keydown` Escape listener** (closes settings, unpauses single player) and a
  **window capture-phase click listener** that closes settings when its own overlay is the click target.
- `showInterstitial()` never rejects (every path resolves) — the leave flow cannot get stuck on an ad error.
- The sidebar `<aside>` carries a CSS `transform`, so a `position: fixed` popup rendered **inside** the sidebar would be
  positioned against the sidebar, not the screen. ⇒ the popup must be its own top-level element.
- Closest designed popup: `src/client/CitizenshipRestartModal.ts` (two equal buttons, shadow DOM, `show()`/`hide()`,
  z-index 9999, 320px / `max-width: 90vw`). `ReconnectModal.ts` is the same look family. I copy CitizenshipRestartModal's
  styles.
- Stacking: settings overlay is `z-[2000]`; reconnect / citizenship-restart are 9999; tutorial backdrop 10000 (it
  covers the whole screen with `pointer-events: all`, so the sidebar cannot be tapped while it shows); citizenship
  explainer 10000; long-session popup 10002. ⇒ new popup at **9999**, placed after `<settings-modal>` in the DOM so it
  paints over the settings window.

## Design

### 1. New element `src/client/ExitConfirmModal.ts` — `<exit-confirm-modal>`
LitElement, shadow DOM, styles copied from `CitizenshipRestartModal` (overlay `rgba(0,0,0,0.5)`, z-index 9999, box
320px / `max-width: 90vw`, two `flex: 1` buttons in a row). No `title` attributes anywhere (0415).

- Text: question `help_modal.exit_confirmation`; buttons `exit_confirm_modal.leave` / `exit_confirm_modal.stay`.
- Button look: **Stay** = the blue primary button (the safe choice is the one that stands out), **Leave** = the grey
  secondary button. Order left→right: Leave, Stay. (A look choice, not a ruling — easy to flip.)
- `show(onLeave: () => void)`: no-op if already visible **or** a Leave already happened (no stacked popups; re-tapping
  exit during the ad does not reopen it). Otherwise stores `onLeave`, shows.
- **Leave** tap: if a Leave already happened → ignore (double tap runs the exit once). Else mark leaving, hide the
  popup, call `onLeave()`.
- **Stay** tap → hide. Nothing else.
- **Escape** while visible → Stay. Listener on `window` in the **capture** phase, and it calls `stopPropagation()` +
  `preventDefault()` **only while the popup is visible** — so the Settings window's own Escape listener (window,
  bubble phase) does **not** also fire and close settings underneath. Also means the game's own key handling does not
  see that one Escape.
- **Tap outside the box** (on the dark overlay) → **Stay** (my call per the brief; matches the Settings window, which
  also closes on an outside tap; never Leave). Recorded in the worklog.
- No pause, no analytics.

### 2. New tiny module `src/client/MatchExit.ts` — one exit behaviour for both buttons
```ts
// Ad → clear the reconnect session → back to the start screen (the sidebar's existing order).
export async function leaveMatch(): Promise<void>
// Opens <exit-confirm-modal>; on Leave runs leaveMatch(). If the element is missing from the page
// (template bug), logs console.error and leaves at once — today's behaviour — rather than trap the player.
export function askToLeaveMatch(): void
```
The "only once" guard lives in the popup (it is the only way to reach `leaveMatch()` from either button).

### 3. Wire the two buttons
- `GameRightSidebar.onExitButtonClick()` → `askToLeaveMatch()`. The dead `isAlive` / commented `confirm()` block is
  replaced by a `// Flashist Adaptation (task 0437)` comment naming the change (upstream line kept as a comment, per the
  fork's convention). Imports of `clearReconnectSession` drop out of the sidebar if unused.
- `SettingsModal.onExitButtonClick()` → `askToLeaveMatch()`. Settings stays open (and single player stays paused, as
  today) under the popup; Stay returns to the Settings window; Leave runs the same ad → clear → start screen.

### 4. Page + registration + language
- `<exit-confirm-modal></exit-confirm-modal>` right after `<settings-modal>` in **both** `src/client/index.html` and
  `src/client/yandex-games_iframe.html`.
- `import "./ExitConfirmModal";` in `src/client/Main.ts` beside the other modal imports (MatchExit.ts also imports it,
  so it registers either way).
- `src/client/LangSelector.ts` re-render list: add `"exit-confirm-modal"` (same as `citizenship-restart-modal`).
- `resources/lang/en.json`: `"exit_confirm_modal": { "leave": "Leave", "stay": "Stay" }`;
  `resources/lang/ru.json`: `"exit_confirm_modal": { "leave": "Выйти", "stay": "Остаться" }`. No other language files.

## Consequences the owner already accepted (stated so nothing is a surprise)
- The Settings exit now shows the interstitial ad and clears the reconnect session — so players leaving through
  Settings see more ads than before, and can no longer be offered "reconnect" to the match they just left that way.
- Settings exit in a **tutorial** match now shows the ad too (the sidebar exit already does; `WinModal`'s exit skips the
  ad for tutorials — not touched here).
- Dead players and spectators are asked too (Q2 "Always").

## Tests — new `tests/client/ExitConfirm.test.ts` (jsdom)
Real `GameRightSidebar`, real `SettingsModal`, real `ExitConfirmModal`, real `MatchExit` in the page; only the edges are
mocked: `FlashistFacade.instance` (`showInterstitial` with a promise the test resolves by hand, `changeHref`,
`rootPathname`), `ReconnectSession.clearReconnectSession`, `translateText` (key → key), and whatever heavy imports the
sidebar/settings pull in (Transport, SoundManager, InputHandler — exact list found when writing it).
1. Sidebar exit, player alive → popup visible; interstitial / clear / changeHref **not** called.
2. Stay → popup hidden, none of the three called. Same for Escape, and for a tap on the overlay.
3. Leave → interstitial, then (only after the ad promise resolves) clear, then changeHref — that order, once each — and
   a second Leave tap / second exit tap during the ad changes nothing.
4. Q2: player dead, and `myPlayer()` null (spectator) → popup still shows; nothing called until Leave.
5. Repeated exit taps → one popup, `show` a no-op while visible.
6. Settings exit → popup; Leave → interstitial → clear → changeHref (new). Escape on the popup closes **only** the popup —
   settings stays open and no `PauseGameEvent(false)` is emitted.
7. Both HTML templates contain exactly one `<exit-confirm-modal>`.
8. `en.json` / `ru.json` carry `exit_confirm_modal.leave|stay` with the ruled values, and `help_modal.exit_confirmation`
   exists in both.
Plus: add `"exit-confirm-modal"` to the `it.each` list in `tests/client/LangSelectorRerender.test.ts`.
`tests/client/NoNativeTooltips.test.ts` already scans every client `.ts` and both templates — it covers the new file
automatically.

## Verification run (phase 2)
- Targeted: `npm test -- tests/client/ExitConfirm.test.ts tests/client/LangSelectorRerender.test.ts
  tests/client/NoNativeTooltips.test.ts` (no lock, light).
- `npm run lint`.
- Full `npm test` (one run, through the npm script, under the project lock) **only when the owner says the Mac can take
  it** — otherwise reported as not run. Any `supertest` failure judged by the known-flake rule and re-run, said so.
- **Not done by me:** the by-hand check in the dev build (both templates, phone-width window) — no dev server or browser
  on this Mac right now; reported as unverified. The live Yandex Games phone check is a separate verify task (brief
  step 8), not this one.

## Files touched
New: `src/client/ExitConfirmModal.ts`, `src/client/MatchExit.ts`, `tests/client/ExitConfirm.test.ts`.
Edited: `src/client/graphics/layers/GameRightSidebar.ts`, `src/client/graphics/layers/SettingsModal.ts`,
`src/client/Main.ts`, `src/client/LangSelector.ts`, `src/client/index.html`, `src/client/yandex-games_iframe.html`,
`resources/lang/en.json`, `resources/lang/ru.json`, `tests/client/LangSelectorRerender.test.ts`, plus `worklog.md` in
the task folder. Nothing in `src/core/`.

## Open points (none block; defaults applied unless the owner says otherwise)
- Button look/order (Stay blue on the right, Leave grey on the left) — my choice.
- Outside tap = Stay — my choice (brief allowed Stay or nothing).
- Missing element ⇒ leave at once with a console error — my choice (never traps the player; test 7 guards the
  templates).
