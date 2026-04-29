# Telegram Channel Link

**Source**: `ai-agents/tasks/done/s4-telegram-link.md`
**Status**: done
**Sprint/Tag**: Sprint 4

## Goal

Add a Yandex-experiment-gated Telegram channel CTA on the start/loading modal and the game-end modal, near the existing email subscription surfaces. The task keeps coexistence with the subscribe button controlled by experiment configuration rather than hard-coded mutual exclusion.

## Key Changes

- Added `TELEGRAM_CHANNEL_URL` in `src/client/flashist/FlashistFacade.ts` as the single channel URL source (`https://t.me/gameworldwar`).
- Added the `telegram_link = enabled` experiment flag constants and `FlashistFacade.isTelegramLinkEnabled()`.
- Added `telegramLinkStartScreen` and `telegramLinkGameEnd` UI element IDs, producing `UI:Tap:TelegramLinkStartScreen` and `UI:Tap:TelegramLinkGameEnd` through the existing `logUiTapEvent()` path.
- Updated `src/client/GameStartingModal.ts` to load the email-subscribe and Telegram flags together, then render a localized Telegram link when enabled.
- Updated `src/client/graphics/layers/WinModal.ts` with the same gated link near the game-end subscribe button.
- Added `telegram_link.cta_text` localization in `resources/lang/en.json` and `resources/lang/ru.json`.
- Documented the two placement-specific UI tap events in `ai-agents/knowledge-base/analytics-event-reference.md`.

## Outcome

The Telegram CTA can now be turned on or off without a deploy through the Yandex experiment flag. The start-screen and game-end placements are tracked separately, while the email subscribe flow remains unchanged and can be shown alongside or instead of Telegram based on flag setup.

## Related

- [[decisions/sprint-4]] — Sprint 4 community/retention CTA context
- [[systems/analytics]] — `UI:Tap:{ElementId}` convention and Telegram tap events
- [[tasks/email-subscribe-modal]] — adjacent start-screen and game-end opt-in surfaces
- [[tasks/vk-link]] — adjacent VK CTA that mirrors this placement and flag pattern
