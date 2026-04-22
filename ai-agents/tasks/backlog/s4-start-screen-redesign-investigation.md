# Task — Start Screen Redesign Investigation (Tab Layout)

## Sprint
Sprint 4

## Type
Design investigation — requires Mark's decisions, not engineering work.

## Status
✅ Closed — all decisions made 2026-04-22.

## Priority
High — blocks all citizenship UI implementation tasks. Engineering cannot start the citizenship UI until the layout direction is confirmed and fits the smallest supported screen.

## Context

The current start screen has no space left for a citizenship UI element, especially on mobile. On iPhone 12 the usable game area between the Yandex Games header and footer is already fully occupied by: the multiplayer join card, three buttons (mission, singleplayer, tutorial), and the bottom action bar (bell, version, feedback, settings).

The leading candidate for the redesign is a **two-tab layout**:
- **Multiplayer tab:** join card + citizenship UI (+ future: private lobbies)
- **Singleplayer tab:** mission button + tutorial button (+ future: paid campaign packs)

This structure has value beyond the space problem: it cleanly separates two distinct player intents and creates room for planned Sprint 5–6 features without further redesign.

## What Needs to Be Decided

### 1. Confirm the smallest supported screen size

Identify the minimum screen height we need to support (e.g., iPhone SE ~568px, older Android ~550px). Everything else in this investigation is evaluated against that constraint.

### 2. Sketch the tab layout at the smallest supported screen

For the Multiplayer tab, the layout must fit:
- Tab switcher (2 tabs)
- Join game card (map preview + lobby info)
- Citizenship UI element (progress bar or locked state for guests)
- Bottom action bar (bell, feedback, settings)

For the Singleplayer tab:
- Tab switcher (2 tabs)
- Mission button
- Tutorial/instructions button
- Bottom action bar

Sketch both tabs at the minimum screen height. Confirm nothing is cut off or requires scrolling for the primary actions. A rough wireframe or annotated screenshot is sufficient — no visual polish needed at this stage.

### 3. Decide the citizenship UI element size and placement

Within the Multiplayer tab, decide how much vertical space citizenship gets and where it sits relative to the join card. Two likely options:
- **Below the join card:** citizenship as a card/strip between the join card and the bottom bar. Most visible, but takes the most space.
- **Integrated into the join card area:** a compact citizenship indicator below the map preview inside the card. Less space, but risks visual noise.

The guest (locked) state must also be accounted for — it needs enough room to show a login CTA.

### 4. Confirm tab behaviour defaults

- Which tab is shown by default on first visit? (Multiplayer is almost certainly the right default.)
- Does the selected tab persist across sessions?
- What happens on the win screen — does the return-to-menu action land on Multiplayer tab?

## All Decisions

- **Minimum supported screen size:** 360×430px — the usable game area when iPhone SE is used inside the Yandex Games iframe.
- **Tab layout:** confirmed workable at 360×430px via Claude Design prototypes (reviewed 2026-04-22). Two-tab layout adopted.
- **Citizenship UI placement:** above the tabs, full-width card. Guest state: lock icon + "Гражданство" + "Войдите, чтобы сохранить прогресс" + "Войти в Яндекс" button. Citizen state: avatar/flag, "ГРАЖДАНИН" badge, username, XP progress bar.
- **Tab defaults:** Multiplayer tab shown on first visit. Last active tab persists across sessions.
- **Win screen return:** not yet decided — note as open item in the redesign implementation brief.
- **"Инструкции" (Instructions):** shown on both tabs.
- **"Single Player" button renamed:**
  - English: `Custom Game`
  - Russian: `Своя игра`
  - Must be updated in both `en.json` and `ru.json` when implemented.
- **Analytics:** new tab-switch events use `UI:Tap:MultiplayerTab` and `UI:Tap:SingleplayerTab`. Must be added to `ai-agents/knowledge-base/analytics-event-reference.md` when implemented.
