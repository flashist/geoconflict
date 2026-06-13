# App Bootstrap: Single Explicit Entry Point

**Source**: `ai-agents/tasks/done/s4-app-bootstrap-single-entry-point.md`, `ai-agents/knowledge-base/app-bootstrap-single-entry-point-findings-and-plan.md`
**Status**: done
**Sprint/Tag**: Sprint 4 infrastructure

## Goal

Replace the client's emergent startup ordering with one explicit bootstrap sequence so external SDK init, experiment flags, player data, and language resolution settle before component code evaluates.

## Key Changes

- Added `src/client/Bootstrap.ts` as the webpack entry point, replacing direct entry through `Main.ts`.
- Split `FlashistFacade` initialization into immediate no-wait analytics/session work and bounded async platform work.
- Kept the singleton facade for compatibility while making construction explicit at boot start.
- Changed the game-ready gate so `flashist_waitGameInitComplete()` resolves from `Bootstrap.ts` after platform init, app chunk load, and client wiring, instead of depending on `lang-selector` DOM state.
- Moved app/component loading behind `await import("./Main")`, preventing custom elements from upgrading before the platform gate.
- Switched the Yandex SDK template flow to tolerate async script loading and stalled SDK delivery; the app proceeds in degraded mode after the shared deadline.
- Added degraded-mode/session timeout analytics through `Session:PlatformInitTimeout` and refined `Player:YandexUnknown` semantics.
- Added app-chunk retry plus one reload for stale content-hashed chunk failures.
- Preserved standalone `src/client/index.html` viability as the no-SDK degraded path.

## Outcome

Local verification covered normal local boot, first-time tutorial launch, standalone boot, permanently stalled SDK script, parent wrapper chunk exclusion, app-chunk 404 recovery, and several adversarial review cases around late SDK recovery, hung `getPlayer()`, hung `getFlags()`, and fast SDK failures.

The remaining human-review item is live Yandex iframe / dev-VPS verification of the real `YaGames.init()` path, including SDK language, player name, experiment flags, and `LoadingAPI.ready()` timing under the actual Yandex container.

## Related

- [[systems/flashist-init]]
- [[systems/analytics]]
- [[systems/localization]]
- [[decisions/sprint-4]]
- [[decisions/sprint-backlog]]
- [[tasks/yandex-payments-investigation]]
- [[tasks/analytics-p0-yandex-login-status]]
