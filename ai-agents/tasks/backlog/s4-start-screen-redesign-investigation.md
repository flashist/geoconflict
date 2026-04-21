# Task — Start Screen Redesign Investigation (Tab Layout)

## Sprint
Sprint 4

## Type
Design investigation — requires Mark's decisions, not engineering work.

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

## Output

A short written decision (can be a reply in this session or a note added to this file) covering:
- Confirmed minimum screen size
- Tab layout confirmed workable at that size (or an alternative if tabs don't fit)
- Citizenship UI placement and approximate height budget
- Tab default behaviour answers

Engineering does not start citizenship UI or tab implementation until these are answered.

## Notes

- This investigation is design-only. No code changes, no prototypes needed.
- The tab concept also has implications for analytics: `UI:ClickMultiplayer` currently fires on the join card click. If the tab structure changes the funnel, the analytics event map may need updating. Flag this when the layout is confirmed.
- Private lobbies and paid campaign packs do not need to be designed now — reserve space for them in the sketches but leave them as placeholders.
