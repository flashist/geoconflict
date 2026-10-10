# Plan — 0423 Dark thin scrollbar in every game window (shared `o-modal` first)

Planning-only output. No source written. Builds on the **current, uncommitted working tree** (0415's changes in `Modal.ts`, `NewsModal.ts`, `BuildMenu.ts` etc. stay as they are; `o-modal` keeps `heading`; no `title` anywhere — `tests/client/NoNativeTooltips.test.ts` must stay green).

## 1. What the code shows (confirmed)

- The page's dark scrollbar is defined once in `src/client/styles.css:21-38` (`::-webkit-scrollbar` 8 px; track `rgba(0,0,0,0.1)` radius 4 px; thumb `rgba(255,255,255,0.2)` radius 4 px; thumb hover `rgba(255,255,255,0.3)`). Document styles do not reach into shadow roots, so any **shadow-DOM** Lit component that scrolls draws the browser's light default scrollbar.
- **The cause of the owner's screenshot:** `o-modal` (`src/client/components/baseComponents/Modal.ts`) is shadow DOM, and it has two scrolling areas: `.c-modal` (the full-screen backdrop, `overflow-y: auto`) and `.c-modal__content` (`max-height: 60dvh; overflow-y: auto`). Neither has scrollbar rules. Single player's content scrolls in `.c-modal__content`.
- Content **slotted** into `o-modal` from a light-DOM window (SinglePlayerModal, HostLobbyModal, …) is in the document tree, so `styles.css` already styles any scroll area *inside* that content. Only `o-modal`'s own shadow areas are light.
- No `scrollbar-color` anywhere in `src/` (it is inherited, so a document-level one would have disabled the rules inside shadow trees too — there is none). The only `scrollbar-width` is the page's `.hide-scrollbar` utility, which does not apply inside shadow roots.

### Inventory (every scroll area declared in client code)

Method: every `src/client/**/*.ts` file with `overflow(-x|-y): auto|scroll` or a Tailwind `overflow-*-auto|scroll` class, sorted by whether the component renders into a shadow root (no `createRenderRoot`) or into the page (`createRenderRoot() { return this; }`).

| Component | DOM | Scrolls? | Today | Action |
|---|---|---|---|---|
| `o-modal` (`baseComponents/Modal.ts`) — `.c-modal` backdrop + `.c-modal__content` | shadow | yes (content: always when long; backdrop: on short screens) | **light** | **fix** — covers single player, host lobby, join private lobby, news, user settings, account, help, flag input, token login, territory patterns, matchmaking, chat (12 `<o-modal>` callers) |
| `NewsModal.ts` — `.news-container` | shadow | declared `overflow-y: auto`, but no height cap, so in practice `o-modal`'s content scrolls | light *if* it ever scrolls | **fix** (same shared piece, defensive and needed for the guard test below) |
| `graphics/layers/BuildMenu.ts` — `.build-menu` (`max-height` 95vh/80vh/70vh, `overflow-y: auto`) | shadow | yes on short screens / phones (in-game build menu) | **light** | **fix** |
| `CitizenshipExplainerModal.ts` — `.modal-box` | shadow | yes | dark (0417's 4 copied rules) | **swap the copy for the shared piece** (look unchanged; regression-checked) |
| `FlagInputModal`, `LanguageModal`, `ChatDisplay`, `EmojiTable`, `EventsDisplay`, `GameLeftSidebar`, `GameRightSidebar`, `Leaderboard`, `MultiTabModal`, `PlayerPanel`, `SettingsModal`, `TeamStats` | light (page) | various | dark already (`styles.css` reaches them) | **left alone** — confirmed in the browser probe (step 5), each element's `getRootNode()` is `document` |
| Other shadow components (`CitizenshipRestartModal`, `EmailSubscribeModal`, `FeedbackModal`, `GameStartingModal`, `ReconnectModal`, `StaleBuildModal`, `TenureGrantModal`) | shadow | no declared scroll | n/a | **out of scope — owner ruling: they stay with `0419`**, which reuses this task's shared piece |
| `Difficulties`, `Maps`, `ModalOverlay`, stats `DiscordUserHeader`/`GameList`/`PlayerStatsGrid`/`PlayerStatsTable`, `FPSDisplay`, `MainRadialMenu`, `TokenLoginModal` (own styles) | shadow | no declared scroll (`GameList` uses `overflow: hidden`) | n/a | left alone |

Side note, not acted on: `PlayerPanel.ts:563` uses `scrollbar-thin scrollbar-thumb-zinc-600 …` classes, but no Tailwind scrollbar plugin is configured, so those classes do nothing. The element is light DOM and already dark. Out of scope.

## 2. Decision at the plan gate: one shared piece, not per-component copies

**Chosen: one shared Lit `CSSResult`** that every shadow component which scrolls adds to its `static styles`. Why: the brief asks for "done once" and "don't leave four slightly different copies"; four components need it now and `0419` will need it next; a Lit `CSSResult` is the idiomatic way to share styles across shadow roots (no build change). `styles.css` stays the page-level copy. A drift test (step 4) pins the shared piece to the same values, so there are exactly two copies that cannot drift silently. (A single source for both would mean feeding CSS text into Lit through webpack. That is a build change, and too much for a visual polish task.)

**Selector: universal within the component's scope** — `*::-webkit-scrollbar`, `*::-webkit-scrollbar-track`, `*::-webkit-scrollbar-thumb`, `*::-webkit-scrollbar-thumb:hover`. This is exactly what `styles.css` does for the page, now done per shadow root. It covers both `o-modal` areas (backdrop and content), and any scroll area added to those components later, with no selector list to maintain. It does not reach slotted content (that content is styled by its own scope, which is already dark) or the host element. Specificity is the lowest possible (one pseudo-element), so any component-specific rule still wins.

**Trap kept (0417):** no `scrollbar-color` and no `scrollbar-width` in the shared piece or in any component that uses it. Since Chromium 121, either one set to a non-`auto` value turns the `::-webkit-scrollbar` rules off.

## 3. Changes (client-only, CSS-level; no layout, size, text or behaviour change)

1. **New** `src/client/components/baseComponents/DarkScrollbarStyles.ts`: exports `darkScrollbarStyles = css\`…\`` with the four rules above and the exact `styles.css` values. Comment: it copies `styles.css` because page styles do not reach shadow roots; keep both in sync (a test checks this); no `scrollbar-color`/`scrollbar-width` (why); Chromium only, Firefox keeps its default as on the rest of the app; `// Flashist Adaptation` (task 0423).
2. `src/client/components/baseComponents/Modal.ts`: `static styles = [darkScrollbarStyles, css\`…existing…\`]`, plus an import and a short `// Flashist Adaptation: task 0423` comment (upstream `o-modal` has no scrollbar styling). Existing rules untouched. 0415's `heading` comment and property untouched.
3. `src/client/NewsModal.ts`: same `[darkScrollbarStyles, css\`…\`]` change.
4. `src/client/graphics/layers/BuildMenu.ts`: same change (on top of 0415's `title` removal already in the tree).
5. `src/client/CitizenshipExplainerModal.ts`: delete the four `.modal-box::-webkit-scrollbar*` rules and their comment (lines ~93–113); add `darkScrollbarStyles` to `static styles`. Same values, so the look is identical; the 0417 comment's point (the `scrollbar-color` trap) moves to the shared file.

Shared piece first in each array, so a component's own rules can still override it.

## 4. Tests

New `tests/client/components/DarkScrollbar.test.ts` (`@jest-environment jsdom`; mock `Utils.translateText` as `Modal.test.ts` does):

- **(a) Drift guard:** read `src/client/styles.css` with `fs`, pull out the page's four top-level `::-webkit-scrollbar*` blocks, and require `darkScrollbarStyles.cssText` to carry the same declarations (normalized whitespace) for each of the four.
- **(b) No switch-off:** `darkScrollbarStyles.cssText` contains no `scrollbar-color` or `scrollbar-width`.
- **(c) `o-modal` and the citizenship popup really use it:** `[OModal.styles].flat()` and `[CitizenshipExplainerModal.styles].flat()` contain the `darkScrollbarStyles` object (identity check). Plus one render check: open an `o-modal` in jsdom and confirm the shadow root's adopted/`<style>` CSS text includes `::-webkit-scrollbar` (jsdom does not paint scrollbars — the browser check in step 5 covers the look).
- **(d) Future-proof source scan** (same style as `NoNativeTooltips.test.ts`): for every `src/client/**/*.ts` that `extends LitElement`, has no `createRenderRoot`, and declares `overflow…: auto|scroll`, require the file to reference `darkScrollbarStyles`, and to contain no `scrollbar-color` / `scrollbar-width`. Today that matches exactly `Modal.ts`, `NewsModal.ts`, `BuildMenu.ts` and `CitizenshipExplainerModal.ts`. The test asserts the set is non-empty, so the scan can't pass vacuously. Effect: a new shadow window that scrolls fails `npm test` until it takes the shared piece. That includes `0419`'s popups if they gain scrolling. Known limit: a scroll area made purely at runtime (`el.style.overflow = …`) is not caught. Stated in a test comment.

Existing tests that must stay green: `tests/client/components/Modal.test.ts` (0415), `tests/client/NoNativeTooltips.test.ts`, `tests/client/CitizenshipExplainerModal.test.ts`, BuildMenu/News tests if any. Then full `npm test` (through the npm script, which takes the project lock; it can take ~5 min at 1 worker; a `supertest` `Exceeded timeout of 5000 ms` is the known flake → re-run and say so) and `npm run lint`.

## 5. Local visual check (Chromium via Playwright, RU) → screenshots in `ai-agents/tasks/backlog/0423-…/screenshots/`, results in `worklog.md`

Setup: before `npm run dev`, check `lsof -nP -iTCP:3001 -sTCP:LISTEN` (and 3002). Anything already on 3001 silently kills dev worker 0 (Remotion renders have done this), and then there are no lobbies. If the port is taken, stop and report; don't kill someone else's process. Client is on `localhost:9000`. RU via `localStorage.setItem("lang","ru")` + reload (or the language picker).

1. **Before (taken before any edit):** single player window at a short viewport (e.g. 1280×500 and 360×640) so the content scrolls. Screenshot, and record `getComputedStyle(contentEl, "::-webkit-scrollbar").width` (0417 used this probe; it reads `auto` when unstyled).
2. **After**, same viewports. Each window: open it, confirm `scrollHeight > clientHeight` on the area that scrolls, take a screenshot, and record the probe (`8px`). Windows: single player (before + after — the owner's report), host lobby, join private lobby, news, user settings. Also account, help, flag input, territory patterns, matchmaking and token login, where they can be opened as a guest locally. The `o-modal` backdrop scroll: shrink the viewport until the window is taller than the screen, then probe `.c-modal`.
3. **In-game:** start a single-player match, open the build menu at 360×560 (its `max-height: 70vh` path) so `.build-menu` scrolls; open the in-game chat window (`o-modal`).
4. **Regression on 0417:** citizenship explainer popup at 1280×500 — still dark, 8 px (same stub method as 0417's worklog: stub the card's offer, set `isVisible`; **no Buy tap**).
5. **Inventory probe:** walk the document and every open shadow root, list every element with computed `overflow-y` `auto|scroll` and `scrollHeight > clientHeight`, its root (`document` or which shadow host), and its probe width. Anything light-DOM must already read `8px`. Any shadow-DOM area not in the inventory table → report it and stop (no fix outside the plan).
6. Firefox: not checked. By design it keeps its default scrollbar, as the rest of the app does.

Windows that can't be opened locally (for example matchmaking needing a backend, or account needing login): say so in the worklog. They share `o-modal`, so the shared fix and test (c) cover them in code, but their look is unverified.

## 6. Sequencing

1. Start `npm run dev` and take the "before" screenshots/probes (step 5.1) **before editing**.
2. Add `DarkScrollbarStyles.ts`; wire it into `Modal.ts`, `NewsModal.ts`, `BuildMenu.ts`; swap `CitizenshipExplainerModal.ts`.
3. Write `DarkScrollbar.test.ts`; run the targeted tests (`npm test -- tests/client/components tests/client/NoNativeTooltips.test.ts tests/client/CitizenshipExplainerModal.test.ts`).
4. Visual check (steps 5.2–5.5).
5. `npm run lint`, full `npm test`.
6. Worklog: inventory table, before/after probe values, screenshots list, tests and lint results, and anything not verified, with the reason.
7. At close (producer): the live check inside the real Yandex Games iframe becomes a verify step per the build/verify-split rule (see open question).

## 7. Risks / edge cases

- **Rebase with 0415:** the same files carry 0415's uncommitted edits. Edit on top of them; never revert; keep `heading`.
- **`scrollbar-color` inheritance:** if any page-level `scrollbar-color` is added later, it inherits into every shadow tree and silently turns these rules off everywhere. Test (b)/(d) only cover the shadow components. Out of scope to guard the whole page; noted in the shared file's comment.
- **Universal selector reach:** `*::-webkit-scrollbar` styles every scroll area inside these four components. That is intended; none needs a different look today.
- **Mobile Chromium** (Android, Yandex browser) may draw overlay scrollbars and ignore the width. Same behaviour as the page today; not a regression.
- **jsdom and CSS:** Lit in jsdom falls back to `<style>`. `::-webkit-scrollbar` already parses fine there (0417's rules pass in `CitizenshipExplainerModal.test.ts`).
- No analytics, localization, layout, z-index or behaviour change. Client-only. Deploy in the weekend slot.
