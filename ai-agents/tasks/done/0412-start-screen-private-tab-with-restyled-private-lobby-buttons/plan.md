# Plan — 0412: a third start-screen tab "Приватная" holding restyled private-lobby buttons

Planning only. No code or files were written.

## Goal
- Move "Создать лобби" and "Присоединиться к лобби" out of the Multiplayer tab into a new third tab, **"Приватная" / "Private"**.
- Restyle both buttons to match the Solo tab rows (`menurow`: icon, title + subtitle, chevron, full width, one above the other).
- Show the tab only under today's rule (`isPrivateLobbyRowEnabled()`). When the rule is off, the screen keeps its two tabs exactly as now.
- Add `UI:Tap:PrivateTab`.
- Remove the browser tooltip from both buttons.

## What the code looks like today (checked 2026-10-08)
- `src/client/StartScreenTabs.ts`: two tabs, `TAB_CONTENT_IDS` map, `onTabTap()` picks the analytics id with a two-way ternary, and `applyTab()` shows or hides the content containers. A tab restored on load fires no analytics.
- `src/client/StartScreenTabStorage.ts`: `getActiveTab()` accepts only `multiplayer` / `singleplayer` and falls back to `multiplayer` for anything else.
- `src/client/PrivateLobbyAccess.ts`: `start()` calls `isPrivateLobbyRowEnabled()` once. If it returns true, it shows `#private-lobby-row`, applies the Create lock and subscribes to citizenship status. If the check fails, it fails closed. `isCreateLocked()` always returns false on the dev build.
- Both templates (`src/client/yandex-games_iframe.html` ~l.316, `src/client/index.html` ~l.204) have `#private-lobby-row` inside `#multiplayer-tab-content`. The two buttons are `secondary` `o-button`s with `title="Create Lobby"` / `title="Join Lobby"`, and that `title` is what produces the native tooltip.
- `o-button` (`components/baseComponents/Button.ts`) already handles `menurow` + `locked`: it shows the icon, then 🔒, then the title, then "Только для граждан" in place of the subtitle, then the chevron, all at 0.75 opacity. Its `title` Lit property does not reflect to an attribute, so dropping the HTML attribute removes the tooltip. The label comes from `translationKey`.
- `src/client/Main.ts` binds the click handlers by element id (`host-lobby-button`, `join-private-lobby-button`) and throws if either id is missing. **Ids stay the same, so Main.ts does not change.**
- `LangSelector` already re-renders `start-screen-tabs` and `o-button` when the language changes, so new labels follow a language switch.
- No code listens to `start-screen-tab-changed` today; only tests do.

## Approach

### 1. Templates (both files, the same change)
- Remove `#private-lobby-row` from `#multiplayer-tab-content`.
- Add a new container after `#singleplayer-tab-content`: `<div id="private-tab-content" class="flex flex-col gap-2.5 hidden">`.
- Inside it, keep the wrapper `<div id="private-lobby-row" class="flex flex-col gap-2.5" style="display: none;">`. Same id, still hidden by default. This keeps `PrivateLobbyAccess` and its tests unchanged, and is a second safety net: even if the tab container were shown by mistake, the buttons stay hidden unless the rule is true.
- The two buttons become:
  `<o-button id="host-lobby-button" translationKey="main.create_lobby" subtitleTranslationKey="main.create_lobby_subtitle" icon="…" chevron menurow block></o-button>`
  and the same for Join, with `main.join_lobby_subtitle`.
  - **No `title` attribute.**
  - **No `secondary`**, so they are the blue primary rows the Solo tab uses.
- Carry over the existing comments, updated to mention 0412.

### 2. `StartScreenTabStorage.ts`
- `StartScreenTab` becomes `"multiplayer" | "singleplayer" | "private"`.
- `getActiveTab()` also accepts `"private"`. Storage stays a plain store; whether the tab is allowed is decided in the component.

### 3. `StartScreenTabs.ts`
- Add `private: "private-tab-content"` to `TAB_CONTENT_IDS`.
- Add a `TAB_UI_ELEMENT_IDS: Record<StartScreenTab, string>` map. It replaces the ternary and adds `private → flashistConstants.uiElementIds.privateTab`.
- New state:
  - `@state() isPrivateTabEnabled = false`
  - `storedTab = getActiveTab()`
  - `hasTappedTab = false`
- Starting tab: `storedTab === "private" ? "multiplayer" : storedTab`. Storage is not written, so a stored "private" survives the wait.
- `render()` draws the third button (`private-tab-button`, `main.tab_private`, same classes and `role="tab"` / `aria-selected`) **only when** `isPrivateTabEnabled` is true. When it is false, the third tab element is not in the page at all.
- New `public enablePrivateTab()`. It can be called more than once safely. It sets `isPrivateTabEnabled = true`. If `storedTab === "private"` and the player has not tapped a tab yet, it switches to Private through `applyTab()` (no analytics, no storage write). See open question 2.
- `onTabTap()` sets `hasTappedTab = true`, logs through the map (re-taps log too, as today), saves the tab and applies it.
- `applyTab()` now also handles `#private-tab-content`. Because the private container is hidden unless it is the active tab, it stays hidden while the tab is off.

### 4. `PrivateLobbyAccess.ts`: one rule check feeds both the buttons and the tab
- In `start()`, after the row is revealed and `isRowVisible = true`, call `enablePrivateTab()` on the `<start-screen-tabs>` element. The element is looked up with a loose type and optional chaining, so a missing or not-yet-upgraded element simply means no tab (fails closed).
- **Why here and not a second `isPrivateLobbyRowEnabled()` call inside the tabs:** one check guarantees the tab and its buttons can never disagree. Two separate calls could, in a rare case, produce an empty third tab, which R1 forbids. It stays the same single rule (no copy of it). It now has three users: row, tab, explainer line.
- If the rule is false or throws, nothing changes: two tabs, row hidden.

### 5. Analytics
- `src/client/flashist/FlashistFacade.ts`: add `privateTab: "PrivateTab"` to `uiElementIds`, right after `singleplayerTab`.
- `ai-agents/knowledge-base/analytics-event-reference.md`: add a row after `SingleplayerTab`:
  - `uiElementIds.privateTab` | `UI:Tap:PrivateTab` | "Player taps the Private tab on the start screen (task 0412). Same semantics as `MultiplayerTab` (every tap incl. re-taps; restoring the stored tab on load, or the late switch when the tab appears, does not fire). The tab exists only when the private-lobby rule is on (citizenship surfaces AND (tester OR `private_lobbies_all`)), so other players never fire it."

### 6. Localization (both files, `main` section only)
| Key | EN | RU |
|---|---|---|
| `main.tab_private` | Private | Приватная |
| `main.create_lobby_subtitle` | Play with your friends | Играйте с друзьями |
| `main.join_lobby_subtitle` | Enter a lobby ID from a friend | Введите ID лобби от друга |

- Icons, decided at build time under R7 and recorded in the worklog: Create 🏠, Join 🚪 (may change after the visual check).
- A locked Create shows "Только для граждан" in place of its own subtitle (this is how `o-button` already works). Only citizens and the dev build ever see the Create subtitle.

## Edge cases covered
- Rule false, throws, degraded boot, or no flags: two tabs, no third tab element, buttons hidden.
- Stored "private" + rule off: Multiplayer is shown and selected. Storage is left as "private" (harmless; the next tap overwrites it).
- Stored "private" + rule on: Private is restored with no analytics.
- Stored "private" + the player taps another tab before the answer arrives: their choice wins and there is no late switch.
- `enablePrivateTab()` called twice: no-op.
- Language switch: tab label and subtitles re-render.
- Live citizenship change (e.g. a purchase): Create unlocks in place, unchanged from today.
- Player already sitting in a public lobby taps Create in the new tab: `openHostLobbyFromStartScreen` handles leaving it, unchanged.
- **Timing / visible jump.** The flags are normally loaded during platform init, before `Main.ts` runs, so on the normal path the answer arrives within the same task and the third tab is drawn before the first paint (no jump). Only when the flags arrive late (after the 5 s init deadline) does the third tab appear later. Then the two existing tabs narrow from half to a third of the width, and the new tab is added **at the end**, so the existing tabs do not change position. Hiding the whole strip until the answer arrives would delay the start screen for everyone on slow sessions, so it is rejected. ⚠️ "No jump on the normal path" can only be confirmed live: on the dev build all flags return true instantly.
- **The dev build shows three tabs to everyone**, because `checkExperimentFlag` returns true in dev, exactly as the row is shown to everyone in dev today.

## Tests
1. `tests/client/StartScreenTabs.test.ts` (update the mock with `privateTab`):
   - default: two tabs, no `private-tab-button`.
   - `enablePrivateTab()` → third tab rendered last, with `main.tab_private`.
   - stored "private", never enabled → Multiplayer shown and selected, private content hidden, no analytics, storage still "private".
   - stored "private" + enable → Private shown and selected, no analytics.
   - stored "private" + a tap on Solo before enable → stays on Solo.
   - tap Private → logs `PrivateTab`, saves, shows the private content; a re-tap logs again.
   - calling enable twice is safe.
   - existing tests still pass.
2. `tests/client/StartScreenTabStorage.test.ts`: "private" round-trips; unknown values still fall back to multiplayer.
3. `tests/client/PrivateLobbyAccess.test.ts`:
   - add a stub `<start-screen-tabs>` to `mountPage()`.
   - rule true → `enablePrivateTab` called once; rule false / a read throws / degraded → never called; no tabs element → no throw.
   - template block (both real templates): the row sits inside `#private-tab-content` and not inside `#multiplayer-tab-content`; `#private-tab-content` is hidden by default; both buttons carry `menurow`, `chevron`, `icon` and `subtitleTranslationKey`; **neither button has a non-empty `title` attribute**.
   - one render check: the rendered inner `<button>` has no `title` either.
   - existing lock and explainer tests unchanged.
4. `tests/client/PrivateLobbyLang.test.ts`: add the three keys (present, non-empty, RU differs from EN, does not name the game). Assert exact `tab_private` values "Private" / "Приватная".
5. `npm test` and `npm run lint` both pass. A single `Exceeded timeout of 5000 ms` in a supertest suite is judged by the known-flake rule: re-run, and say that it was re-run.

## Visual check (local, `npm run dev`, the iframe template)
- **Phone 360×430, RU and EN:**
  - The tab strip "Мультиплеер | Одиночная | Приватная" fits with no clipping, ellipsis or wrapping. Rough estimate: about 92 px of text room per tab, "Мультиплеер" about 85 px. Tight, so it **must be measured**. **If it does not fit, stop and flag it to the owner with a screenshot. No font shrink or abbreviation.**
  - The Private tab with Create unlocked (dev default).
  - The Private tab with Create locked, forced from the browser console with `document.getElementById('host-lobby-button').locked = true`. This is a temporary console toggle, not a code change. Check that it reads clearly as locked.
- **Desktop ~1280×800, RU:** tab strip and Private tab.
- **Hover both buttons in RU and EN:** no browser tooltip.
- Screenshots go into the worklog.
- The two-tab (rule off) case cannot be seen on dev (flags are always on there). It is covered by unit tests and the later live check.

## Files touched
- `src/client/yandex-games_iframe.html`
- `src/client/index.html`
- `src/client/StartScreenTabs.ts`
- `src/client/StartScreenTabStorage.ts`
- `src/client/PrivateLobbyAccess.ts`
- `src/client/flashist/FlashistFacade.ts` (one line)
- `resources/lang/en.json`, `resources/lang/ru.json` (`main` section only)
- `ai-agents/knowledge-base/analytics-event-reference.md` (one row)
- The four test files above

**Not touched:** `Main.ts`, `Button.ts`, CSS, the server, nginx.

⚠️ **Shared files with other uncommitted work.** `en.json`, `ru.json`, `FlashistFacade.ts` and the analytics reference already have uncommitted 0407/0408/0409 edits in **other sections**. Edits will be small and targeted (no whole-file rewrites). When the owner commits, 0412's hunks must be staged apart from the others.

## Seams with the next tasks
- **0413 (join modal paste button):** edits `JoinPrivateLobbyModal`, which 0412 does not touch. 0412 keeps the Join button id and handler, so they do not overlap. Lang: 0413 will likely use the `private_lobby` section; 0412 uses `main`.
- **0382 (Yandex invite link):** opens the join modal straight from `Main.ts` (`joinModal.open(id)`), not through the tab, so the modal appears over whichever tab is active and works even for players who cannot see the Private tab (joining stays free, as today). A later product question, **not in 0412:** should an invite arrival also switch to the Private tab?
- **0401 check 4 (locked tap):** after this ships, the steps need "open the Приватная tab first". Flagged only; 0401 is not edited.

## Out of scope
- The app-wide `title` tooltip issue: other `o-button`s (e.g. `index.html`'s "Custom Game" / "Instructions") and every `o-modal title=`. Left for a separate task if the owner wants one.
- Changes to the join or host modals.
- Invite links.
- Font or label changes to make the strip fit.
- Any "new" badge (R4).
- Re-splitting the task.

## Deploy note
- Client-only: bundle plus both HTML templates. No server, nginx or flag changes.
- Weekend slot, per the 2026-09-29 rule. The same-day exception for 0407–0409 does not cover this task.
- After the deploy, the live check happens in the Yandex shell: a tester or flag-on player sees three tabs, a flag-off player sees two, and hovering both buttons shows no tooltip. Under the build/verify split rule this goes into its own verify task at the top of the next sprint. **No verify task is filed now.**
