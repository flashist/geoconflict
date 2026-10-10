# Plan — 0415 No native browser tooltips anywhere in the UI

Status: plan only. No code written. Waiting for the owner's approval.

## Summary
- **Core fix (§1):** rename the Lit property `title` to **`label`** on `o-button` and to **`heading`** on `o-modal`, then update every caller. Both components then stop putting a `title` attribute on the page, so the browser has no tooltip to show. Visible text does not change.
- **The rest (§2):** 28 other places in the client set a native tooltip. By default each one is removed. Where removing it leaves a control with no name for screen readers, I add an `aria-label` with the **same existing text**. An `aria-label` never shows a tooltip. This is **owner gate Q1**.
- **Tests:** unit tests for both components, plus a guard test that fails if a `title` comes back, either in the two HTML templates or in any client `.ts` template.
- **One honest limit on proof (Q2):** a screenshot cannot show a native tooltip. The browser draws that box outside the page, and headless Chromium does not draw it at all (the wiki records this from `0412`). So the local proof is a **scan of the live page for `title` attributes** on every screen, with screenshots kept as a record. That differs from the brief's wording, so it needs owner approval.
- **Overlap with `0423`:** both tasks edit `Modal.ts`, but in different parts of the file (details below). Expect an easy rebase.
- **No lang-file edits.** A few keys stop being used. I leave them in place on purpose (details below).

## Context checked
- Brief read in full. Wiki `systems/yandex-games-platform-rules.md` Rule 1 is the owner's own statement ("avoid generic tooltips/hints"), with no Yandex page cited, by owner ruling. Scope stays exactly as the brief sets it: **native** browser tooltips only.
- Out of scope, untouched: tooltips the game draws itself (the radial-menu tooltip in `RadialMenu.ts` / `RadialMenuElements.ts`, and the tutorial's tooltips). They are not browser tooltips. `document.title` (the tab name) is also out of scope, per the brief.
- `0412` (done) already removed the tooltips on the two start-screen private-lobby rows. Its tests (`tests/client/PrivateLobbyAccess.test.ts:322`, `:507-518`) stay as they are and must stay green. This task does not touch those two rows.
- `0413` (done) is already in `JoinPrivateLobbyModal.ts`. I build on the current code.

## Approach for §1 — why a rename

- **Chosen: rename.** `o-button.title` becomes `label`; `o-modal.title` becomes `heading`. Both get a `// Flashist Adaptation` comment, because upstream OpenFront uses `title`.
  - `title` is a built-in HTML attribute that every browser shows as a tooltip. Once the property has a different name, no markup route and no script route can create the attribute through these components.
  - `label` and `heading` clash with nothing: `HTMLElement` has neither property, and neither is a tooltip attribute.
- **Rejected: keep `title` and strip the attribute in `updated()` / `attributeChangedCallback`.** The HTML parser adds the attribute before the element upgrades, so it would exist briefly. Every future caller would also rely on a hidden side effect.
- **Rejected: keep the JS name `title` and map it to a different attribute name.** The property would still hide the native `HTMLElement.title`. Script like `el.title = …` would keep its current, surprising behaviour, which is exactly the `Main.ts` trap below.
- **Cost:** a future upstream merge whose callers still say `title=` would render an **empty** label or heading. The guard tests in step 5 catch that at `npm test`.

## Inventory (full list from `grep`, re-checked 2026-10-09)

### A. `o-modal` `title` → `heading` (all are Lit templates)
| File:line | Current text |
|---|---|
| `FlagInputModal.ts:22` | `flag_input.title` |
| `HostLobbyModal.ts:118` | `host_modal.title` ("Приватное лобби", seen live) |
| `JoinPrivateLobbyModal.ts:108` | `private_lobby.title` |
| `SinglePlayerModal.ts:75` | `single_modal.title` |
| `AccountModal.ts:69` | `account_modal.title` or "Account" |
| `TerritoryPatternsModal.ts:177` | patterns title or the other tab's title (conditional) |
| `Matchmaking.ts:34` | `matchmaking_modal.title` |
| `UserSettingModal.ts:239` | `user_setting.title` |
| `TokenLoginModal.ts:33` | `token_login_modal.title` |
| `NewsModal.ts:215` | `announcements.title` |
| `graphics/layers/ChatModal.ts:76` | `chat.title` |
- `HelpModal.ts:38-41` uses `translationKey` plus a dead `flashistAdaptation_title` attribute. That is not a tooltip. Left as is.

### B. `o-button` `title`
| File:line | Current | Action |
|---|---|---|
| `JoinPrivateLobbyModal.ts:176` | `private_lobby.join_lobby` (seen live) | rename to `label=` |
| `SinglePlayerModal.ts:398` | `single_modal.start` (seen live) | rename to `label=` |
| `index.html:204` `#single-player` | `"Custom Game"`, tooltip only (`translationKey` gives the visible text) | delete the attribute |
| `index.html:232` `#help-button` | `"Instructions"`, tooltip only (`translationKey`) | delete the attribute |
| `index.html:206` and `yandex-games_iframe.html:318` `#single-play-mission` | `title=""` | delete the attribute (`Main.ts` sets the label) |
| `Main.ts:377,384` mission button | `missionButton.title = translateText("main.play_mission", …)` | change to `.label` **and** change the cast type to `{ label: string; disable: boolean }` |
- ⚠️ **Trap in `Main.ts`:** after the rename, TypeScript will **not** flag a leftover `missionButton.title = …`, because `HTMLElement` has its own `title`. That leftover would set the **native** attribute, which means a tooltip **and** an empty button label. I will fix it by hand and grep for it. The source guard (step 5) also catches it.
- Commented-out HTML (`index.html:223-228`, and `yandex-games_iframe.html:315,338,346,370`) is never rendered, so I leave it. The template guard parses the DOM, so it would catch any of these being un-commented with `title` still on it.

### C. Every other native tooltip (§2) — 28 places
**C1 — removed. Visible text already says the same, so nothing is lost.**
| File:line | Element | Text |
|---|---|---|
| `components/ui/ActionButton.ts:60` (used 11× in `PlayerPanel.ts:629-742`) | button with a visible label | chat / emotes / target / send troops / … The existing `aria-label` stays. |
| `PlayerStatsTree.ts:151` | mode buttons | `player_stats_tree.mode` ("Mode") |
| `PlayerStatsTree.ts:170` | difficulty buttons | `difficulty.difficulty` |
| `SendResourceModal.ts:313` | percent preset buttons | `"${pct}%"` |
| `SendResourceModal.ts:277` | "Available" chip | `available_tooltip` ("Your current available troops/gold") |
| `SendResourceModal.ts:393` | cap marker | `cap_tooltip`. It is `pointer-events-none`, so this tooltip could never appear anyway. |
| `PlayerPanel.ts:369` | traitor chip | `player_panel.traitor` (the chip already shows "Traitor") |
| `PlayerPanel.ts:450` | relation chip | the chip already shows its label |
| `Matchmaking.ts:176` | "Matchmaking" button with visible text | `matchmaking_modal.title` |
| `Main.ts:253` | `licenseCredits.title = version` on a plain `div` | the version is already in the visible text on the next line |
| `UsernameInput.ts:255` | locked name input | `username.locked_hint`. The same hint already shows **visibly** under the box on focus (`#username-locked-hint`, `UsernameInput.ts:288`), so nothing is lost. |
| `graphics/layers/BuildMenu.ts:433` | disabled build button | `build_menu.not_enough_money`. The cost is visible on the button. |

**C2 — removed, but a little information is lost (owner may want to know):**
| File:line | Element | Text | Effect |
|---|---|---|---|
| `PlayerPanel.ts:440` | player-name heading (`truncate`) | the full name | Very long names show "…" with no way to read the rest. |
| `PlayerPanel.ts:582` | ally-list item (`truncate`) | the full name | Same. |

**C3 — icon-only controls: the `title` was the only text label (this is Q1).**
| # | File:line | Control | Tooltip text | Screen-reader name after removal |
|---|---|---|---|---|
| 1 | `index.html:245`, `yandex-games_iframe.html:363` | start-screen feedback button | "Feedback" | yes (`img alt`) |
| 2 | `index.html:250` (only in index.html; commented out in the Yandex template) | settings button | "Settings" | yes (`img alt`) |
| 3 | `index.html:186`, `yandex-games_iframe.html:292` | pattern preview button | "Pick a pattern!" (English) | **none** |
| 4 | `FlagInput.ts:79` | flag button (picker currently hidden by design) | `flag_input.button_title` | **none** |
| 5 | `GameRightSidebar.ts:168` | in-game feedback icon (`div`) | `feedback_modal.button_tooltip` | yes (`img alt`) |
| 6 | `components/NewsButton.ts:104` | news bell | `announcements.title` | yes (`aria-label` and `alt`) |
| 7 | `AccountModal.ts:401` | account button (`display:none` in the Yandex template) | "Logged in as {email}" / "Logged in with Discord" | **none** |
| 8 | `HostLobbyModal.ts:620` | remove-player "×" | `"Remove ${username}"` (English, hardcoded) | **only "×"** |
| 9 | `PlayerPanel.ts:831` | close "✕" | `common.close` | yes (`aria-label`) |
| 10 | `SendResourceModal.ts:260` | close "✕" | close label | yes (`aria-label`) |
| 11 | `TerritoryPatternsModal.ts:163` | colour swatches (`div`) | the hex code | none (a plain `div`; `aria-label` has no effect there) |
| 12 | `CitizenBadge.ts:38` | citizen glyph | `citizen_badge.tooltip` ("Citizen") | yes (`aria-label`) |

**Recommendation for C3 (Q1):** remove all 12. Add an `aria-label` with the **same existing text** only where nothing would be left: #3, #4 and #8. For #7, delete the now-unused `buttonTitle` code. The component is hidden in production, and its `title` was already empty when no one is logged in.

**Searched for, none found:** `setAttribute("title", …)`, SVG `<title>` children in client code (the inline lock SVG in `UsernameInput` has none; other SVGs load through `<img>`, which never shows an SVG title), and Lit `.title=${…}` bindings. Chat and event HTML goes through `onlyImages`, which only allows `src/alt/class/style` (`src/core/Util.ts:179`), so no `title` can be injected there.

### Lang keys that become unused — kept on purpose
`citizen_badge.tooltip`, `feedback_modal.button_tooltip` (if nothing else uses it), `send_resource…available_tooltip` / `cap_tooltip`, `player_stats_tree.mode` and similar. **No lang-file edits**, as the brief expects. `tests/client/CitizenBadge.test.ts:41` requires `citizen_badge.tooltip` to exist in en and ru. Unused keys do no harm and are cheap to clean up later. The worklog will list them.

## Steps (in order)
1. **`Button.ts`** — `@property label = ""` (Flashist comment) and render `this.label` at line 52. Nothing else changes: `translationKey`, `locked` (`0302`), `disable` and click behaviour stay the same.
2. **`Modal.ts`** — `@property heading = ""` (Flashist comment) and render `this.heading` at line 97. No CSS changes; that is `0423`'s work.
3. **Callers** — table A (`title=` becomes `heading=`) and table B. Update **both** HTML templates every time.
4. **§2 removals** — tables C1, C2 and C3, as the owner rules on Q1.
5. **Tests**
   - `tests/client/components/Button.test.ts`: replace `element.title =` with `element.label =` (lines 17, 57, 95, 108). Otherwise these tests would set the native attribute and fail. Add a test: with `label` set, the text renders **and** neither the host nor any descendant has `[title]`.
   - New `tests/client/components/Modal.test.ts` (jsdom): open with `heading` set. The heading text is in `shadowRoot` `.c-modal__header`. The host has no `title`, and `shadowRoot.querySelector("[title]")` is null. The `translationKey` path is still covered.
   - New `tests/client/NoNativeTooltips.test.ts`:
     (a) for each of `index.html` and `yandex-games_iframe.html`, `DOMParser` finds **no element in `<body>` with `[title]`**. This covers `o-button` / `o-modal` as the brief asks, and every other element too.
     (b) a source scan of `src/client/**/*.ts`: no template `\stitle=` attribute, and no `.title =` assignment other than `document.title`. This protects against an upstream merge and against `0423` or later tasks bringing one back. I checked the pattern against today's code: CSS `.title {` and `className: "title"` do not match.
   - Update `tests/client/CitizenBadge.test.ts:82`: stop expecting the tooltip key in the rendered HTML, and assert no `title` attribute. The `aria_label` check stays.
   - Update `tests/client/UsernameInput.test.ts:232`: expect **no** `title` when locked. The existing checks on the visible hint stay.
6. **Checks:** `npm run lint`, `npx tsc --noEmit`, the targeted test files, then one full `npm test` through the npm script (project lock, 1 worker). If any `supertest` suite flakes, I judge it against the CLAUDE.md flake rule and say that I re-ran it.
7. **Local live check (Q2):** start `npm run dev` (watch for the port-3001 conflict). With Playwright, on the start screen in RU and EN, then with each window open (host lobby, join private lobby, single player, user settings, help, news, flag input, matchmaking if enabled, territory patterns), then inside a local single-player game (build menu, player panel, send-resources window, chat window, right sidebar): run a JS check that walks the document **and every shadow root** and counts elements with `[title]`, ignoring the `<head>` `<title>`. The expected count is **0** everywhere. Take one screenshot per screen as a record.
8. **Worklog** (`ai-agents/tasks/backlog/0415-…/worklog.md`): the full inventory above, with what happened to each item; the final `grep` showing no `title=` left on rendered elements (except owner-approved exceptions, if any); the scan results per screen; screenshots; test and lint output; the list of keys that became unused.
9. **Live check after deploy:** not filed now, per the brief. The owner's split rule (2026-09-29) applies at close.

## Risks and edge cases
- **`Main.ts` `.title` trap** — see table B. Covered by a hand fix, `grep` and the source guard.
- **Unit tests silently using native `title`** — `Button.test.ts` sets `element.title`. Without the update in step 5 it would fail. That failure is correct, and the update fixes it.
- **Upstream merge** — callers using `title=` would render an empty label or heading. Caught by the guards.
- **`o-modal` uses shadow DOM** — the old attribute sat on the host, so the tooltip covered the whole window, including the dark overlay. The new heading only changes the text node inside the header. Nothing about the layout changes.
- **Long player names** (C2) can no longer be read in full. Accepted unless the owner says otherwise.
- **Hidden or disabled surfaces** (flag picker, account button, matchmaking if switched off) are fixed anyway, so they do not leak a tooltip if they are turned back on.

## Overlap with `0423` (dark scrollbar in `o-modal`, runs after this)
- This task touches `Modal.ts` at **line 8** (the property) and **line 97** (render). `0423` is expected to touch the `static styles` CSS block (`.c-modal`, `.c-modal__content`, lines 12-72). The hunks are separate, so the rebase should be easy.
- `0423` must keep `heading` and must not bring back `title`. The new source guard fails if it does.
- `0426` (news update) depends on `0415`. This task has no other effect on it.

## Not done / not in scope
- No custom in-game tooltips touched. No lang edits. No commit (owner rule). No verify task filed.
