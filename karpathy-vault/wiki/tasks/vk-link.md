# VK Channel Link

**Source**: `ai-agents/tasks/done/s4-vk-link.md`
**Status**: done
**Sprint/Tag**: Sprint 4

## Goal

Add a Yandex-experiment-gated VK community CTA on the start/loading modal and the game-end modal, directly below the existing Telegram CTA, with an independent flag and placement-specific analytics.

## Key Changes

- Added `VK_CHANNEL_URL` in `src/client/flashist/FlashistFacade.ts` as the shared VK URL source (`https://vk.com/gameworldwar`).
- Added the `vk_link = enabled` experiment flag constants and `FlashistFacade.isVkLinkEnabled()`.
- Added `vkLinkStartScreen` and `vkLinkGameEnd` UI element IDs, producing `UI:Tap:VkLinkStartScreen` and `UI:Tap:VkLinkGameEnd` through `logUiTapEvent()`.
- Updated `src/client/GameStartingModal.ts` to load the VK flag alongside the subscribe and Telegram flags, then render a localized VK link when enabled.
- Updated `src/client/graphics/layers/WinModal.ts` with the same gated VK link below Telegram in the game-end modal.
- Added `vk_link.cta_text` localization in `resources/lang/en.json` and `resources/lang/ru.json`.
- Documented the two placement-specific UI tap events in `ai-agents/knowledge-base/analytics-event-reference.md`.

## Outcome

The VK CTA can be enabled independently from Telegram through the `vk_link` Yandex experiment flag. When both community CTAs are enabled, VK renders below Telegram on both start/loading and game-end surfaces, and each placement has separate `UI:Tap:*` analytics.

The VK URL is now set to the live community URL, so the remaining production gate is enabling the `vk_link` experiment flag when ready.

## Related

- [[decisions/sprint-4]] — Sprint 4 community/retention CTA context
- [[systems/analytics]] — `UI:Tap:{ElementId}` convention and VK tap events
- [[tasks/telegram-link]] — adjacent Telegram CTA pattern that VK mirrors
