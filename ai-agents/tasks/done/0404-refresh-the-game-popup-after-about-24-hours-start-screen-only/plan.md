# Plan — 0404: "Please refresh the game" popup after 23 hours (start screen only)

Planning-only spawn; nothing was written. The brief, its owner rulings (23 h; forced, no close button; everyone, guests included) and the move to Sprint 7 have been read in full and are followed as written.

## Summary
- **One popup element, two messages.** `StaleBuildModal` gets a second message, "long session". Because it is still one element, two refresh popups can never stack (brief item 4). The stale-build path is left unchanged: same message, same button, same event, still shows mid-match (locked decision 0113).
- **The check lives in a new module, `LongSessionRefresh.ts`.** It measures time since page load (wall clock), checks on a timer and when the tab becomes visible again, and fires once at 23 h. It waits until the player is on the start screen (`whenOnStartScreen()`) and no Yandex payment or login dialog is open. The decision logic is unit-tested with a fake clock, following the `ProfileReadRestart.ts` / `GameRestart.ts` pattern.
- **New tiny module `PlatformDialogPresence.ts`** marks a Yandex payment or login dialog as open. It wraps the whole citizenship purchase flow (`runCitizenshipPurchase`) and `FlashistFacade.openYandexAuthDialog()`.
- **Refresh drops the URL hash and keeps the query string.** Finding: the hash is **not** always empty when the popup can appear (details in §2), so a plain `reloadApp()` could replay an old `#join=`. It does not use `changeHref(rootPathname)` either, because that writes the "after match exit" marker and would mislabel the next boot in the `SignatureAge` / `PlatformDegraded` analytics.
- **No HTML template changes**, because no new element is added. New texts go in both `en.json` and `ru.json`. Two new events go through `flashistConstants.analyticEvents` and are documented in the analytics reference.
- **Two owner questions:** the wording (draft below), and whether to add a small marker so the later verify task can actually read whether post-popup players come back verified (`vfy:true`) or not. The marker is scope beyond the brief's build list.

## 1. Findings that shape the plan (checked in the repo, 2026-10-07)
- `BuildVersionChecker.ts:8`: `const PAGE_LOAD_TIMESTAMP = Date.now();` is module-level and not exported. It is evaluated when the Main chunk loads, which is before `startProfileSession()` runs in `startClient()` (`Main.ts:1097-1102`). So page age ≥ login-token age, which is the safe direction.
- `StaleBuildModal.ts`: one element, `@state isVisible`, `show()`, REFRESH → `window.location.reload()` + `UI:ClickStaleBuildRefresh`, plus a "Contact support" link. Registered in `index.html:313` and `yandex-games_iframe.html:443`; z-index 9999.
- `StartScreenPresence.ts`: `isOnStartScreen()` is false while in a lobby, in a match, or while a join is being set up. `whenOnStartScreen()` resolves now or on the next return. The source is registered in `Client.initialize()` (`Main.ts:330`), and `handleLeaveLobby` reports the return (`:1026`).
- **Hash replay risk is real.** `handleHash` (`Main.ts:654-751`) strips `#token-login`, `#affiliate`, failed `#purchase-completed`, and success-with-token. It does **not** strip:
  - `#join=<id>`: standalone opens the join window and leaves the hash; `AccountModal.ts:100-104` even `pushState`s one. On Yandex it is ignored but stays in the URL.
  - `#refresh`, which triggers a `changeHref` on load.
  - `#purchase-completed` success with no pattern name.

  `reloadApp()` keeps the hash, so any of these would replay.
- `changeHref(rootPathname)` calls `markMatchExit()` (`FlashistFacade.ts:1141-1144`), which feeds `bootFollowsMatchExit`. That flag drives `SignatureAge:AfterMatch:*` (`:2103`) and the `PlatformDegraded` / `PlatformRecovered` value. Using it here would put popup reloads into the "after match" analytics.
- Dropping the hash is already proven safe in production: every match exit drops it (`changeHref`, task 0331) and the game boots normally inside the Yandex iframe afterwards.
- **In-flight platform dialogs found:**
  1. The Yandex payment frame, `FlashistFacade.purchaseCatalogItem` (`:1780`). Its only caller is `runCitizenshipPurchase` (`CitizenshipPurchase.ts:28`), which runs intent → frame → server `/complete`.
  2. The Yandex login dialog, `FlashistFacade.openYandexAuthDialog` (`:2155`). Its caller is `CitizenshipCard.logIn` (`:532`).

  Not counted:
  - The legacy Stripe pattern purchase (`Cosmetics.handlePurchase`) navigates the page away itself.
  - Fullscreen ads are a Yandex overlay drawn above our page.
  - `TokenLoginModal` is legacy hash login and reloads itself.
- **Test conventions:** jest `testEnvironment: node`; Lit components are tested under `@jest-environment jsdom` with `Utils` and the facade mocked (`tests/client/CitizenshipRestartModal.test.ts`). The language-file test pattern is `tests/client/CitizenshipRestartLang.test.ts`: keys in both files, the same key set, RU translated (not copied from EN), and **the text must not name the game** (rule from 0311).
- **No file overlap with the uncommitted 0332 build.** That build touches `ProfileSession.ts`, `Transport.ts` and their tests; this plan touches none of them.

## 2. Design

### 2.1 `src/client/PlatformDialogPresence.ts` (new)
Same shape as `beginJoiningLobby` in `StartScreenPresence.ts`:
- `beginPlatformDialog(): () => void` increments a counter and returns an end function that can be called more than once safely. When the count reaches 0 it wakes the waiters.
- `isPlatformDialogOpen(): boolean`.
- `whenNoPlatformDialogOpen(): Promise<void>` loops while open, like `whenOnStartScreen`.
- `resetPlatformDialogPresenceForTests()`.

It is deliberately **not** folded into `StartScreenPresence`. Adding dialogs to `isOnStartScreen()` would change what `CitizenshipCard`, `ProfileReadRestart` and `CitizenshipRestartOffer` see.

Wiring:
- `CitizenshipPurchase.ts`: wrap the whole body of `runCitizenshipPurchase()` in `const endDialog = beginPlatformDialog(); try { … } finally { endDialog(); }`. It covers intent through `/complete`, so a reload can never cut off the server-confirm step after the player has paid. The fire-and-forget consume stays outside, as today.
- `FlashistFacade.openYandexAuthDialog()`: same try/finally around `openAuthDialog()` + `getPlayer()`. The no-SDK early return stays before it. A successful login then restarts the page through `requestGameRestart` anyway; the popup showing a moment before that reload is harmless.

### 2.2 `src/client/BuildVersionChecker.ts` (one-word change)
`export const PAGE_LOAD_TIMESTAMP`, reused as the page-age clock (the brief's "ready page-age clock"). Nothing else changes.

### 2.3 `src/client/LongSessionRefresh.ts` (new)
- `export const LONG_SESSION_REFRESH_AFTER_MS = 23 * 60 * 60 * 1000;` with a comment. Owner ruling 1 (2026-10-07). It is one hour under the profile login token's 24 h TTL (`SESSION_TTL_SECONDS = 86_400`, `src/profile-server/SessionToken.ts:36`, which the client cannot import), so a player who obeys the popup never joins with an expired token.
- `const CHECK_INTERVAL_MS = 60_000`. Timers do not run while the laptop sleeps, hence the visibility check as well.
- Pure decision function, exported for tests:
  ```ts
  type LongSessionRefreshStep = "not-yet" | "wait-until-visible" | "wait-for-start-screen" | "wait-for-dialog" | "show";
  decideLongSessionRefresh({ pageAgeMs, isTabVisible, isOnStartScreen, isPlatformDialogOpen }): LongSessionRefreshStep
  ```
  Order: below threshold → `not-yet`; hidden → `wait-until-visible`; not on start screen → `wait-for-start-screen`; dialog open → `wait-for-dialog`; else `show`.
- `startLongSessionRefreshChecker(deps = defaultDeps)`. Every dependency can be injected: `now`, `pageLoadedAt`, `isTabVisible`, `addVisibilityListener`, `setInterval`/`clearInterval`, `isOnStartScreen`, `whenOnStartScreen`, `isPlatformDialogOpen`, `whenNoPlatformDialogOpen`, `showPopup` (returns boolean), `logEvent`.
  - The check runs on the interval and when the tab becomes visible.
  - At the threshold it fires once, the same one-shot shape as `onStaleBuildDetected`: it clears the interval and removes the listener.
  - It then loops: `await whenOnStartScreen(); await whenNoPlatformDialogOpen();` and re-checks both, because the player may have started a join while a dialog was closing, until both are clear.
  - Then `showPopup()`. Only if that returns true does it log `LONG_SESSION_REFRESH_SHOWN` with value = whole minutes since page load. That matches `Build:StaleDetected` and covers the stale-build-already-up case: no second popup, no "shown" event.
  - Visibility is gated only before the threshold trigger. The deferred path (return to the start screen, dialog closed) always follows a player action, so the tab is visible.
- **No reload latch is needed.** A reload resets the page age to 0, so no loop is possible.

### 2.4 `src/client/StaleBuildModal.ts` (extend, one element)
- Add `@state() private reason: "staleBuild" | "longSession" = "staleBuild";`.
- `show()` (the stale path, called by `BuildVersionChecker`) is unchanged in behavior. It now also sets `reason = "staleBuild"`, so stale-build wins and replaces a long-session message that is up (brief item 4). One popup, the stronger message.
- New `showLongSession(): boolean`. If already visible (either reason) it returns false and changes nothing. Otherwise it sets `reason = "longSession"`, `isVisible = true`, calls `requestUpdate()` (the codebase convention) and returns true.
- `render()`:
  - Stale reason: exactly today's markup (message, REFRESH, contact link).
  - Long-session reason: a title, the body, one refresh button, and **no** contact link. The coder's call under brief item 5: the game is not broken, and a "contact support" line would alarm. There is no close button and no outside-click dismiss.
  - New `.title` style matching the box (bold, ~20px, margin-bottom 12px). All other styles are reused.
- Long-session refresh click: log `LONG_SESSION_REFRESH_PRESSED`, then `FlashistFacade.instance.reloadAppWithoutHash()`. The stale-build click stays `window.location.reload()`, untouched (locked).
- `src/client/index.html` / `yandex-games_iframe.html`: **no change.** The element already exists in both.

### 2.5 Reload without the hash
- New in `FlashistFacade.ts` (the "single place for working with URLs"): `public reloadAppWithoutHash()`, which delegates to an exported helper `reloadWithoutHash(target: { location: Pick<Location,"pathname"|"search"|"hash"|"reload">; history: Pick<History,"replaceState"|"state"> } = window)`:
  - if `hash !== ""`: `try { history.replaceState(history.state, "", pathname + search) } catch {}`
  - then `location.reload()`.
- It keeps the query string Yandex needs (task 0331) and drops `#join=` / `#refresh` / leftovers. It writes **no** match-exit marker. If `replaceState` throws, it still reloads; the worst case is today's `reloadApp()` behavior.
- `reloadApp()` itself and its callers are unchanged.

### 2.6 Wiring in `src/client/Main.ts`
In `startClient()`, after `client.initialize()` (so the start-screen source is registered):
```ts
startLongSessionRefreshChecker();
```
The import sits next to `startBuildVersionChecker`. Nothing else changes in `Main.ts`.

### 2.7 Texts — `resources/lang/en.json` + `ru.json`
New section `long_session_refresh_modal` with `title`, `message`, `refresh_button`. Wording is the owner's call (Q1). Draft:

| key | EN | RU |
|---|---|---|
| title | Time to refresh | Пора обновить страницу |
| message | The game has been open for a long time. Please refresh the page so everything keeps working properly. Your progress is saved. | Игра открыта уже долго. Обновите страницу, чтобы всё продолжало работать как надо. Ваш прогресс сохранён. |
| refresh_button | REFRESH | ОБНОВИТЬ |

The draft avoids the game's name (0311 rule) and stays true for guests: it promises no "login" to players who have none. It says "a long time", not "a day", because a tab left hidden overnight can show the popup at, say, 30 h.

### 2.8 Analytics — `flashistConstants.analyticEvents` + `ai-agents/knowledge-base/analytics-event-reference.md`
- `LONG_SESSION_REFRESH_SHOWN: "Session:LongSessionRefresh:Shown"`. Value = minutes since page load (≥ 1380). Fires once per page load, only when the popup actually appeared: start screen, no payment or login dialog, stale-build popup not already up, tab visible at trigger.
- `LONG_SESSION_REFRESH_PRESSED: "Session:LongSessionRefresh:Refresh"`. The player pressed the button, right before the reload.
- Naming follows the `Citizenship:RestartPrompt:Shown/Restart` precedent. Both get rows in the reference doc's Session table, including what they do *not* count: they do not fire mid-match (by design), and a stale-build popup that was up first wins with no event.
- Side finding, **not fixed here**: the existing `Build:StaleDetected` has no row in the reference doc (pre-existing gap).

### 2.9 (Only if Q2 = A) Marker so the verify task can read "verified after refresh?"
- `PlatformDegradedAnalytics.ts`: add `markLongSessionRefresh()` / `consumeLongSessionRefreshMarker()` as twins of `markMatchExit` / `consumeMatchExitMarker`. The sessionStorage key is `geoconflict.session.afterLongSessionRefresh`, value `"1"`, no ids. Read and removed on every boot. Never throws.
- `reloadAppWithoutHash()` writes it right before the reload.
- In the facade, the boot kind becomes `AfterMatch` | `AfterRefreshPopup` | `FirstBoot`. AfterMatch wins if both markers are present, which normal flow cannot produce.
- `SIGNATURE_AGE_EVENTS` gains an `AfterRefreshPopup` row: 10 new enum keys `PROFILE_LOGIN_SIGNATURE_AGE_AFTER_REFRESH_POPUP_*`, e.g. `Profile:Login:SignatureAge:AfterRefreshPopup:Past6h24h`. That is 5 colon parts, the GameAnalytics maximum, same as today. They get 10 reference-doc rows.
- What it answers: `PastOver24h` after a popup refresh means Yandex handed back the same old signed data, so that player came back unverified. ≤ 24 h means within ADR-121's window, so verified.
- Tests: the marker round-trip, and the facade boot-kind choice in the existing `SignedPlayerFacade` / `PlatformDegradedFacade` test style.

## 3. Sequencing
1. `PlatformDialogPresence.ts` + tests.
2. Wrap `runCitizenshipPurchase` and `openYandexAuthDialog`, and extend `CitizenshipPurchase.test.ts` / `FlashistFacade.test.ts`.
3. `reloadWithoutHash` helper + `reloadAppWithoutHash()` + tests.
4. Export `PAGE_LOAD_TIMESTAMP`.
5. `LongSessionRefresh.ts` + tests.
6. `StaleBuildModal` long-session message + jsdom test.
7. Language keys + language test.
8. Enum keys + reference doc.
9. `Main.ts` wiring.
10. (Q2 = A) marker + third boot kind.
11. `npm test`, `npm run lint`, then local manual checks.

## 4. Tests (new / extended)
- `tests/client/PlatformDialogPresence.test.ts`: the counter; the end function is safe to call more than once; waiters wake only at 0; reset.
- `tests/client/LongSessionRefresh.test.ts`, with fake timers and an injected clock (no real waits):
  - threshold constant pinned to exactly 23 h, so a forgotten local 1-minute edit turns `npm test` red;
  - below threshold → nothing;
  - at/after threshold, visible, on start screen → shown once, `Shown` event with the right minutes;
  - hidden tab → nothing until the visibility listener fires "visible";
  - in a lobby / match → waits, shows after `reportBackOnStartScreen()`;
  - join being set up (`beginJoiningLobby`) → waits until its end;
  - payment or login dialog open → waits until it closes;
  - dialog closes but the player has meanwhile joined a lobby → keeps waiting;
  - `showPopup` returns false (stale up) → no `Shown` event;
  - one-shot: interval cleared, listener removed, no second show;
  - a clock jump past the threshold through a single visibility event (the laptop-sleep case) → shown;
  - the pure `decideLongSessionRefresh` table covered row by row.
- `tests/client/StaleBuildModal.test.ts` (jsdom, new — none exists today):
  - stale `show()` renders today's message + contact link and logs `UI:ClickStaleBuildRefresh`;
  - `showLongSession()` renders title/message/button keys with no contact link and no close control; a click logs `Session:LongSessionRefresh:Refresh` and calls `reloadAppWithoutHash`;
  - stale `show()` while long-session is up → one overlay, stale message;
  - `showLongSession()` while stale is up → returns false, still stale.
- `tests/client/LongSessionRefreshLang.test.ts`: mirrors `CitizenshipRestartLang.test.ts` (keys in both, non-empty, same key set, no game name, RU ≠ EN).
- `reloadWithoutHash` with plain objects:
  - a hash present → `replaceState` to `pathname + search`, then reload;
  - no hash → no `replaceState`, just reload;
  - `replaceState` throws → still reloads;
  - query string kept.
- `CitizenshipPurchase.test.ts`: a dialog is open during the frame and closed afterwards on every path (granted / frame abandoned / intent null / complete null / thrown).
- `FlashistFacade.test.ts`: `openYandexAuthDialog` opens and closes the marker on success, on rejection, and when `getPlayer` throws; no marker with no SDK.

## 5. Verification
1. New + extended unit tests green.
2. `npm test` green. A lone `Exceeded timeout of 5000 ms` is judged by the CLAUDE.md supertest-flake rule; I will say so if I re-ran. `npm run lint` clean.
3. Local manual checks (brief steps 3–6) need the threshold temporarily set to ~1 min. This is a local uncommitted edit, reverted before hand-off; the pinned-constant test catches a leftover. The checks:
   - popup on the start screen; refresh reloads inside `yandex-games_iframe.html` with the query intact and no hash replayed (tested by adding `#join=TEST` / `#refresh` by hand first);
   - no popup mid-match;
   - a lobby left with in-page Back → popup on return;
   - stale-build forced by changing `/api/version` → exactly one popup;
   - RU and EN text read correctly.

   ⚠️ The Yandex payment and login dialogs **cannot be opened locally** (they need the real Yandex SDK). The deferral is covered by unit tests only, and I will say so.
4. Production check: a separate verify task filed at close (owner's build/verify split). It covers `Shown` / `Refresh` events arriving, the 0332 `expired` join-vouch count falling, and (only with Q2 = A) the `AfterRefreshPopup` signature-age split. R2 is not to be claimed fixed for *verification* before that is read.

## 6. Edge cases and risks
- **Stale-build first, then long session** → no second popup, no `Shown` event. **Long session first, then stale-build** → the message switches to stale, still one popup.
- **Laptop asleep, or tab in the background for days** → the wall clock plus the visibility check fire on wake. Background-tab timers are throttled, but the visibility event covers it.
- **System clock changed by hand** → the popup may come earlier or later. It cannot loop, because each reload restarts the count.
- **Any open start-screen window** (settings, feedback form, name-change draft, the 0303 "restart to apply" popup, the reconnect banner) is covered by the forced popup. A half-typed feedback or name draft is lost. This follows from owner ruling 2 ("Force"). The reconnect session lives in storage and comes back after the reload.
- **Popup shown at the same moment the player taps a lobby JOIN** → impossible. It shows only once they are back on the start screen and covers the screen at z-index 9999, so nothing underneath can be clicked.
- **Players who play match after match** never reach 23 h (each match exit reloads). As the brief says, their Yandex signed data age is ADR-121's territory, not this task's.
- **The stale-build REFRESH still keeps the hash**, so the same `#join=` replay risk exists there on standalone. Pre-existing, locked (0113), left untouched.
- **Benefit 1 is only partly proven** (brief): a refresh gives a non-expired token, but it may still be unverified if Yandex returns the same signed data within the same visit. That is Q2.

## 7. Files
- New: `src/client/LongSessionRefresh.ts`, `src/client/PlatformDialogPresence.ts`, `tests/client/LongSessionRefresh.test.ts`, `tests/client/PlatformDialogPresence.test.ts`, `tests/client/StaleBuildModal.test.ts`, `tests/client/LongSessionRefreshLang.test.ts`.
- Changed:
  - `src/client/StaleBuildModal.ts`, `src/client/BuildVersionChecker.ts` (export only), `src/client/CitizenshipPurchase.ts`, `src/client/Main.ts`
  - `src/client/flashist/FlashistFacade.ts` (two enum keys, `reloadAppWithoutHash`, auth-dialog marker; plus the boot kind if Q2 = A)
  - `resources/lang/en.json`, `resources/lang/ru.json`, `ai-agents/knowledge-base/analytics-event-reference.md`
  - `tests/client/CitizenshipPurchase.test.ts`, `tests/client/FlashistFacade.test.ts`
  - (Q2 = A) `src/client/PlatformDegradedAnalytics.ts` + its tests.
- Not touched: `index.html`, `yandex-games_iframe.html`, `ProfileSession.ts`, `Transport.ts` (0332's uncommitted files), and `src/core/` (so the core-test rule does not apply).
