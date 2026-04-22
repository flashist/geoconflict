# Start Screen Redesign Investigation

**Source**: `ai-agents/tasks/done/s4-start-screen-redesign-investigation.md`
**Status**: done
**Sprint/Tag**: Sprint 4 design investigation

## Goal

Decide a start-screen layout that can fit citizenship UI and future menu growth on the smallest supported Yandex Games mobile viewport before Sprint 4 implementation begins.

## Key Changes

- Set the minimum supported usable start-screen area to `360x430`, based on the Yandex Games iframe on iPhone SE-class screens.
- Adopted a two-tab layout: Multiplayer for the join card plus citizenship UI, and Singleplayer for mission/tutorial actions.
- Locked citizenship placement as a full-width card above the tabs, with a guest login CTA and a richer citizen progress state.
- Locked tab defaults: Multiplayer on first visit, with the last active tab persisted across sessions.
- Recorded required implementation follow-ups: show Instructions on both tabs, rename `Single Player` to `Custom Game` / `Своя игра`, and add `UI:Tap:MultiplayerTab` plus `UI:Tap:SingleplayerTab` analytics when the redesign ships.
- Left one open implementation question: where the win-screen return-to-menu flow should land.

## Outcome

Sprint 4's citizenship UI is now unblocked from a layout-direction standpoint. Engineering still needs a dedicated redesign implementation task, but the layout model, supported viewport target, and citizenship placement decisions are now fixed.

## Related

- [[decisions/sprint-4]] — Sprint 4 roadmap and the redesign dependency for citizenship UI
