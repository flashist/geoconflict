# Task — Start Screen Redesign: Implementation

## Sprint
Sprint 4

## Priority
High — blocks Citizenship XP Progress UI task.

## Design Handoff

Claude.Design has produced the implementation-ready design file. The coding agent should run this instruction first:

> Fetch this design file, read its readme, and implement the relevant aspects of the design.
> https://api.anthropic.com/v1/design/h/XgbUX_yknD2Nfk4NqJNz2g?open_file=Start+Screen.html
> Implement: Start Screen.html

Read the design file before reading the rest of this brief — the visual spec is authoritative. This brief defines scope boundaries, technical requirements, and what is explicitly out of scope.

---

## Scope

### In scope

- **Two-tab layout:** Мультиплеер / Одиночная (Multiplayer / Singleplayer) tabs replacing the current flat button list.
- **Citizenship card slot:** implement the card container above the tabs in both visual states (guest/locked and citizen). The card renders as a static shell in this task — live data binding (XP bar, login flow, profile reads) is handled in `s4-citizenship-xp-progress-ui.md`.
- **Multiplayer tab content:** join game card (existing), citizenship card above tabs.
- **Singleplayer tab content:** "Своя игра" button, "Играть миссию: 1" button, "Инструкции" button.
- **"Инструкции" button:** present on both tabs (matches current design).
- **Button rename:** "Одиночная игра" → "Своя игра" (EN: "Custom Game"). Must use `translateText()` — update both `en.json` and `ru.json`.
- **Tab persistence:** last active tab is stored in `localStorage` and restored on next session open. First visit defaults to the Multiplayer tab.
- **Analytics:** fire tab-switch events on each tab tap (see Analytics section below).
- **Both HTML entry points:** changes must be applied to both `src/client/index.html` and `src/client/yandex-games_iframe.html`.

### Out of scope (separate tasks)

- Citizenship card live data: XP bar values, profile reads, guest/citizen state logic, login CTA flow → `s4-citizenship-xp-progress-ui.md`
- "Buy Citizenship" purchase button → `s4-citizenship-paid.md`
- Private lobby entry point (reserved space in Multiplayer tab — placeholder only if needed)

---

## Technical Requirements

### Tab component

Follow the existing LitElement `@customElement` pattern. The tab switcher and tab content areas should be a self-contained component. The active tab state drives which content block is visible.

### Tab persistence

```ts
// On tab switch:
localStorage.setItem('geoconflict_active_tab', tabName); // 'multiplayer' | 'singleplayer'

// On component mount:
const saved = localStorage.getItem('geoconflict_active_tab') ?? 'multiplayer';
```

### Citizenship card shell

For this task, render the card as a static placeholder in the correct dimensions and position (above the tabs, full width). It should accept a child slot or property that the citizenship UI task will populate. The guest/locked visual from the design can be the default static state.

### Button rename

In `resources/lang/en.json` — find the existing key for "Single Player" / "Одиночная игра" and update:
- English value: `Custom Game`
- Russian value: `Своя игра`

Check whether the subtitle "Настройте свою игру" / "Set up your game" exists in the localization files; if not, add it under the same section.

### Minimum screen size

The layout must be verified at **360×430px** — the usable game area on iPhone SE inside the Yandex Games iframe. Nothing should be cut off or require scrolling for primary actions at this size.

---

## Analytics

Add to `ai-agents/knowledge-base/analytics-event-reference.md` and implement in the tab component:

- `UI:Tap:MultiplayerTab` — fires when the player taps the Multiplayer tab
- `UI:Tap:SingleplayerTab` — fires when the player taps the Singleplayer tab

Use the existing analytics enum in `flashistConstants.analyticEvents` — do not write event strings inline.

---

## Open Item

**Win screen return tab:** not yet decided. For now, return to Multiplayer tab after a match ends (safest default). Flag for review after the first production release.

---

## Verification

1. **Multiplayer tab:** join card and citizenship card shell render correctly. Bottom action bar intact.
2. **Singleplayer tab:** "Своя игра", "Играть миссию: 1", "Инструкции" render correctly with icons and subtitles.
3. **Tab persistence:** switch to Singleplayer tab, reload the page — confirm Singleplayer tab is still active. Clear localStorage — confirm Multiplayer tab is the default.
4. **Button rename:** confirm "Своя игра" / "Custom Game" appears in the UI (not the old "Одиночная игра" / "Single Player").
5. **360×430px:** open in a browser window constrained to 360×430px. Confirm all elements are visible without scrolling.
6. **Both HTML files:** confirm the redesign renders correctly when loaded from both `index.html` and `yandex-games_iframe.html`.
7. **Analytics:** confirm `UI:Tap:MultiplayerTab` and `UI:Tap:SingleplayerTab` fire correctly in the analytics dashboard or console.
8. **No regression:** existing features (bell, announcements popup, feedback button, settings) work as before.
