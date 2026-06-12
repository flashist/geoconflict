# Start Screen Redesign Implementation

**Source**: `ai-agents/tasks/done/s4-start-screen-redesign-impl.md`
**Status**: done
**Sprint/Tag**: Sprint 4 UI foundation

## Goal

Implement the Sprint 4 start-screen redesign so citizenship UI has a stable slot and the main menu works on the smallest supported Yandex Games mobile viewport.

## Key Changes

- Replaced the flat start-screen action list with a two-tab layout: Multiplayer and Singleplayer.
- Added a citizenship card shell above the tabs as the future home for XP/progress and login state.
- Moved multiplayer join content into the Multiplayer tab and solo/custom-game/mission/instructions actions into the Singleplayer tab.
- Renamed "Single Player" to `Custom Game` / `Своя игра` through localization.
- Persisted the last active tab in localStorage, defaulting first visits to Multiplayer.
- Applied the HTML-entry changes to both `src/client/index.html` and `src/client/yandex-games_iframe.html`.
- Added tab tap analytics through `UI:Tap:MultiplayerTab` and `UI:Tap:SingleplayerTab`; the citizenship card owns `Citizenship:Seen` and `UI:Tap:CitizenshipLoginToEarn`.

## Outcome

The start screen now has the layout foundation required by Sprint 4 citizenship UI. Live XP values, profile reads, purchase buttons, and earned/paid citizenship flows remain separate Sprint 4 tasks.

## Related

- [[tasks/start-screen-redesign-investigation]]
- [[decisions/sprint-4]]
- [[systems/analytics]]
- [[systems/localization]]
