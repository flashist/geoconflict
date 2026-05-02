# Analytics P0: Yandex Login Status

**Source**: `ai-agents/tasks/done/analytics-p0-yandex-login-status.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / analytics P0

## Goal

Add Yandex login-status analytics so Sprint 4 citizenship work can measure how much of the player base is actually addressable by Yandex identity-gated earned and paid citizenship flows.

## Key Changes

- Added `Player:YandexLoggedIn`, `Player:YandexGuest`, and `Player:YandexUnknown` enum entries to `flashistConstants.analyticEvents`.
- Added a one-second Yandex SDK readiness window in `FlashistFacade` so slow SDK startup cannot block the baseline `Session:Start` sequence.
- Added `waitForYandexSdkForSession()`, `resolveYandexLoginStatus()`, `logYandexLoginStatusEvent()`, and `scheduleYandexLoginStatusEvent()` helpers.
- Guarded login-status logging with `hasLoggedYandexLoginStatus` so exactly one of the three status events fires per session.
- Treats non-Yandex platforms as `Player:YandexGuest`, authenticated Yandex players as `Player:YandexLoggedIn`, Yandex guests as `Player:YandexGuest`, and SDK timeout on a Yandex surface as `Player:YandexUnknown`.
- Split experiment flag handling into `loadExperimentFlags()` and idempotent `logExperimentEvents()` so deferred login-status logging cannot duplicate `Experiment:*` analytics.
- Documented the three events in `ai-agents/knowledge-base/analytics-event-reference.md`.

## Outcome

The session baseline now records Yandex identity reach without delaying session-start analytics. This lets citizenship planning separate authenticated Yandex players from guests and degraded SDK sessions before the citizenship UI launches.

## Related

- [[systems/analytics]]
- [[systems/flashist-init]]
- [[decisions/sprint-4]]
