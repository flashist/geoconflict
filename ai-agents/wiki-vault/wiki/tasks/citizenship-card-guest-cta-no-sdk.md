# Citizenship Card Guest CTA No-SDK Fix

**Source**: `ai-agents/tasks/done/s4-citizenship-card-guest-cta-no-sdk.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / Citizenship UI follow-up

## Goal

Prevent the citizenship card from showing a Yandex-login button that cannot work when the game is running outside a Yandex SDK context.

## Key Changes

- Confirmed that standalone/local `src/client/index.html` does not load the Yandex SDK and therefore cannot open the Yandex auth dialog.
- Used `FlashistFacade.instance.yaGamesAvailable` as the existing platform-context signal for the card's guest state.
- Updated `src/client/CitizenshipCard.ts` so the guest-state lock icon and subtitle still render, but the login CTA is omitted when `yaGamesAvailable` is `false`.
- Kept real Yandex guest behaviour unchanged: when the SDK context exists and the player is not authorized, the login CTA still renders and calls `openYandexAuthDialog()`.
- Added/updated `tests/client/CitizenshipCard.test.ts` coverage for the no-Yandex-context guest state.

## Outcome

Standalone/dev sessions no longer present a misleading dead login control on the citizenship card. The fix intentionally does not solve Yandex degraded mode, where the SDK context exists but `YaGames.init()` failed or timed out; that broader player-facing treatment moved into Sprint 4 as `ai-agents/tasks/backlog/degraded-mode-full-ux-treatment.md` before earned or paid citizenship ships.

## Related

- [[decisions/sprint-4]]
- [[tasks/citizenship-xp-progress-ui]]
- [[tasks/start-screen-redesign-implementation]]
- [[tasks/app-bootstrap-single-entry-point]]
- [[systems/flashist-init]]
- [[decisions/sprint-backlog]]
