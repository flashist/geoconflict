# Analytics System

**Layer**: client
**Key files**: `src/client/Bootstrap.ts`, `src/client/flashist/FlashistFacade.ts`, `src/client/StartScreenTabs.ts`, `src/client/CitizenshipCard.ts`, `ai-agents/knowledge-base/analytics-event-reference.md`, `ai-agents/knowledge-base/mentor-monetization-analytics-spec.md`

## Summary

GameAnalytics-based player behaviour tracking. Used for A/B experiment evaluation, funnel analysis, session retention, tutorial completion rates, mode-segmented match funnels, public-lobby join/start diagnostics, and bootstrap/degraded-mode measurement. **Not** for server observability — that's Uptrace. See [[systems/telemetry]] for server-side instrumentation.

All event strings follow `Category:Action` or `Category:Subcategory:Value` format (PascalCase, colon-separated — no underscores). The TypeScript enum `flashistConstants.analyticEvents` in `FlashistFacade.ts` is the **single source of truth** — never write event strings inline in game code.

The reference docs are `ai-agents/knowledge-base/analytics-event-reference.md` and the monetization planning spec in `ai-agents/knowledge-base/mentor-monetization-analytics-spec.md`.

## Architecture

- Enum lives in `flashistConstants.analyticEvents` inside `FlashistFacade.ts`
- Fire events via `FlashistFacade.instance.logEventAnalytics(flashistConstants.analyticEvents.KEY)`
- UI:Tap events use `FlashistFacade.instance.logUiTapEvent(flashistConstants.uiElementIds.yourElement)` — opt-in per element
- Experiment events are fired through the idempotent `logExperimentEvents()` path after `loadExperimentFlags()` populates Yandex flags
- Bootstrap/session events are split by `Bootstrap.ts`: immediate no-wait analytics fire before platform init blocks, while degraded-mode and Yandex auth events resolve asynchronously through the bounded platform gate

## Event Categories

| Category | Purpose |
|---|---|
| `Session` | Session lifecycle, heartbeats, first action, platform-init timeout |
| `Device` / `Platform` | Segmentation — fired once per session after `Session:Start` |
| `Player` | New vs. returning, loyalty depth, and identity/session enrichment |
| `Game` | Match start, mode classification, end, win, loss, abandon |
| `Match` | Spawn flow (chosen, auto, missed, retry) and match-specific loss reasons |
| `Reconnect` | Disconnect/reconnect flow |
| `Feedback` | Feedback form interactions |
| `Subscribe` | Email subscription modal open and submit events |
| `UI` | Button clicks; `UI:Tap:{ElementId}` for specific elements and placement-specific CTA tracking |
| `Performance` | FPS and memory sampled every 60s during gameplay |
| `Build` | Stale build detection |
| `Worker` | Web Worker init success/failure |
| `Tutorial` | Tutorial flow — started, tooltips, skipped, completed |
| `Experiment` | Yandex A/B flag values — auto-fired for all flags |

## Build Segmentation

Build numbers are sent through GameAnalytics' native build field via `GameAnalytics.configureBuild(version)`. The deploy/version flow injects the current build automatically, and GameAnalytics auto-ingests new build values from client payloads, so deploys do not require dashboard pre-registration for build values.

This supersedes the original HF-7 implementation, which used GameAnalytics Custom Dimension 01 and required allowed values to be configured manually. Custom Dimension 01 is no longer the build slot; it is used for device type. See [[tasks/build-number-tracking]].

## Session Start Sequence

```
Session:MatchesPlayed (0..N, from prior session) → Session:Start → Device:[class] → Platform:[os]
→ Player:New/Returning → Player:DaysPlayed
→ Player:YandexLoggedIn / Player:YandexGuest / Player:YandexUnknown  (async, after player auth)
```
The baseline events fire once per session from `FlashistFacade`; Yandex login status may arrive asynchronously after player auth resolves.

`Session:MatchesPlayed` fires **before** `Session:Start`, once per pending localStorage entry written by a prior closed tab. Value = integer match starts recorded in that prior session (0 if no matches were played). Multi-tab sessions produce one event per closed tab. Implemented in `src/client/SessionMatchAnalytics.ts`; pending entries are keyed by UUID under `geoconflict.session.pendingEnd:{uuid}`. See [[tasks/analytics-p0-session-match-count]].

`Player:DaysPlayed` is the cumulative count of unique local calendar days on which the player opened the game. Same-day repeat sessions fire with the same value; returning after a gap increments by exactly `1`, not by the gap length. The shipped storage keys are `geoconflict.player.daysPlayed` and `geoconflict.player.lastPlayedDate`, matching the existing `geoconflict.player.*` namespace. See [[tasks/analytics-p0-player-days-played]].

`Session:PlatformInitTimeout` fires when a blocking platform-init stage exceeds the shared 5-second deadline and the app continues in degraded mode. Degraded mode uses default flags, localStorage username fallback, browser language, and no ads.

`Player:YandexLoggedIn`, `Player:YandexGuest`, and `Player:YandexUnknown` segment the session by Yandex identity reach. After the bootstrap refactor, exactly one `Player:Yandex*` event fires per booted session. `Player:YandexGuest` means either standalone/non-Yandex context or an actual Yandex guest. `Player:YandexUnknown` means the page is on the Yandex platform, but auth state could not be determined by the bounded platform-init deadline: SDK script failure, `YaGames.init()` rejection, slow SDK init, hung/rejected `getPlayer()`, or timeout. See [[tasks/analytics-p0-yandex-login-status]] and [[tasks/app-bootstrap-single-entry-point]].

## Game Mode Segmentation

First real match starts classify the mode immediately after `Game:Start`, using the `GameConfig.gameType` available in `src/client/ClientGameRunner.ts`:

```
Game:Start → Game:Mode:Multiplayer
Game:Start → Game:Mode:Solo
```

`Game:Mode:Multiplayer` fires for public and private multiplayer lobbies. `Game:Mode:Solo` fires for solo mode, missions, and tutorial matches. Reconnect handshakes and archived replay views are analytics-silent for `Game:Start` and `Game:Mode:*`, so GameAnalytics funnels segment downstream match lifecycle events without counting recovery or replay traffic as fresh starts.

## Match Duration

`Match:Duration` fires alongside `Game:End` when a fresh `Game:Start` timestamp is available. The value is an integer number of seconds from match start to the player's match-end event. Outcome remains segmented by the existing `Game:Win`, `Game:Loss`, and `Game:Abandon` events. See [[tasks/analytics-p0-match-duration]].

## Spawn Flow Events

```
Match:SpawnChosen           — player placed manually
Match:SpawnAuto             — auto-placed
Match:Spawned               — server-confirmed spawn reflected in client state; value = seconds from Game:Start
Match:SpawnRetryAfterCatchup — spawn held during catch-up, fired after retry succeeds (always with SpawnAuto)
Match:SpawnMissed:TimingRace — spawn phase closed before intent was accepted (server-side reject)
Match:SpawnMissed:NoAttempt  — spawn never attempted
Match:SpawnMissed:CatchupTooLong — catch-up outlasted entire spawn phase (Problem 2, unfixed)
```

`Match:Spawned` is the confirmed placement signal for ghost-rate and time-to-spawn analysis. It is emitted at most once per fresh non-reconnect/non-replay match after a server `GameUpdate` makes the local player's spawned state and territory ownership visible in `src/client/ClientGameRunner.ts`; sessions with `Game:Start` and no `Match:Spawned` are treated as ghosts.

See [[decisions/autospawn-late-join-fix]] for the bug fix these events instrument.

## Match Loss Events

`Match:Loss:OpponentWon` fires when a solo-mode loss screen is shown because an opponent met the win condition before the player. This is distinct from `Player:Eliminated`: the player can still have territory, but the match is over because the opponent won. See [[tasks/solo-win-condition-fix]].

## Join Funnel & Map Preload Events

`UI:ClickMultiplayer` fires in `src/client/PublicLobby.ts` when the player clicks JOIN on a specific public lobby entry, before the `join-lobby` event is dispatched. The handler is debounced, so rapid repeat taps collapse into one event, but distinct later join attempts still emit distinct events. This makes it a valid funnel anchor for public-match join attempts.

`src/client/ClientGameRunner.ts` then carries the preload instrumentation around a single reusable `terrainLoad` promise:

| Event | When |
|---|---|
| `UI:ClickMultiplayer` | Player clicks JOIN on a specific lobby row |
| `Match:PreloadStarted` | Background terrain preload begins |
| `Match:PreloadReady` | Preload promise resolves successfully; value = seconds from preload start |
| `Match:PreloadHitLoaded` | Match start reuses a completed preload |
| `Match:PreloadHitNotLoaded` | Match start waits on an in-progress preload |
| `Match:PreloadMiss` | Match start falls back to a fresh terrain load |

The analytics reference also defines placement-specific community CTA tap IDs. `UI:Tap:TelegramLinkStartScreen` and `UI:Tap:TelegramLinkGameEnd` are emitted by the shipped [[tasks/telegram-link]] flow; `UI:Tap:VkLinkStartScreen` and `UI:Tap:VkLinkGameEnd` are emitted by [[tasks/vk-link]]. This keeps start-screen and game-end CTA taps segmented separately.

The start-screen redesign adds menu-tab and citizenship-surface instrumentation. `UI:Tap:MultiplayerTab` and `UI:Tap:SingleplayerTab` fire on explicit tab taps, including re-taps of the active tab; restoring a persisted tab on load does not fire. `Citizenship:Seen` fires once per page load when the citizenship card is visible, and `UI:Tap:CitizenshipLoginToEarn` tracks the Yandex login CTA. See [[tasks/start-screen-redesign-implementation]].

## Monetization Measurement Baseline

The Sprint 4 monetization analytics spec in [[tasks/monetization-analytics-spec]] defines the measurement gate before citizenship and payments decisions should be treated as validated:

- **P0 identity/session baseline:** record Yandex login status, platform, returning/new status, session depth, and all-time match-count inputs. Yandex login status is now covered by [[tasks/analytics-p0-yandex-login-status]], loyalty depth is covered by [[tasks/analytics-p0-player-days-played]], and per-session match count is covered by [[tasks/analytics-p0-session-match-count]].
- **P0 match lifecycle:** measure match start, player spawned, match completed, outcome, duration, spawn status, and all-time match count so the earned citizenship threshold is grounded in actual retention depth.
- **P1 citizenship funnel:** instrument citizenship surface impressions, CTA clicks, purchase flow start/completion/abandonment, earned citizenship, and high-intent unconverted cohorts.
- **P1 ad impact:** segment ad impressions by player tier (`guest`, `free`, `earned_citizen`, `paid_citizen`) before making citizens ad-free, so the real revenue tradeoff can be modeled.

Open implementation questions remain around analytics backend constraints, whether guest `persistentID` is stable enough for match-count attribution, which events need server-side authority, and whether old match history should be backfilled.

## Experiment Event Pattern

`Experiment:{flagName}:{flagValue}` — built at runtime from Yandex flag response. Enables per-cohort funnel comparison:

```
Experiment:Tutorial:Enabled → Tutorial:Started → Tutorial:Completed → Game:Start
Experiment:Tutorial:Disabled → Game:Start → Match:SpawnChosen
```

## Gotchas / Known Issues

- **Migration (2026-03-01):** Events migrated from `SCREAMING_SNAKE_CASE` strings to `Category:Action`. Historical data before this date appears under old names in dashboards.
- **Double-reload:** Before HF-9, a browser refresh after any game caused two full initialization sequences, doubling all `Session:Start`, `Device:*`, `Platform:*`, and `Experiment:*` events. Fixed in HF-9. See [[decisions/double-reload-fix]].
- **`Player:New` inflation:** During the double-reload era, new users fired both `Player:New` (first load) and `Player:Returning` (second load). Historical cohort data for new users from before HF-9 is affected.
- **Stale build sessions:** Users on zombie tabs (old builds) still fire analytics — `Build:StaleDetected` identifies them. See [[decisions/stale-build-zombie-tabs]].
- **Bootstrap timing:** `Session:Start` now fires deterministically in the immediate `Bootstrap.ts` phase before the bounded platform gate. Funnel comparisons around the bootstrap refactor should expect slight ordering/timing shifts rather than treating them as regressions by default.
- **Build tracking history:** Older HF-7 docs mention GameAnalytics Custom Dimension 01 and dashboard pre-registration for build values. That was true for the first implementation only; current tracking uses `configureBuild()` and does not require GA pre-registration. See [[tasks/build-number-tracking]].
- **Monetization event naming:** The monetization spec uses product-level event names as requirements, but implementation must still conform to the established `Category:Action` analytics naming convention and the TypeScript enum source-of-truth rule.

## Related

- [[systems/game-overview]] — overall project context
- [[systems/producer-workflow]] — producer release validation depends on these analytics conventions
- [[systems/project-operations]] — operational workflow and release guardrails that depend on analytics
- [[decisions/product-strategy]] — why analytics was built first (Sprint 1)
- [[decisions/sprint-1]] — analytics baseline and session conventions were built here
- [[decisions/sprint-2]] — tutorial and spawn funnels depended on this system
- [[decisions/hotfix-post-sprint2]] — HF-1/3/7/8/9 extended analytics conventions and build tracking
- [[systems/telemetry]] — server observability (Uptrace), complementary to analytics
- [[features/tutorial]] — Tutorial events and completion tracking
- [[decisions/autospawn-late-join-fix]] — spawn analytics used to measure the fix
- [[decisions/double-reload-fix]] — caused analytics double-fire before HF-9
- [[decisions/stale-build-zombie-tabs]] — `Build:StaleDetected` event context
- [[features/reconnection]] — Reconnect event category
- [[features/feedback-button]] — Feedback event category and match ID attachment
- [[tasks/email-subscribe-modal]] — `Subscribe:Opened` and `Subscribe:Submitted` for the email opt-in flow
- [[tasks/start-screen-redesign-implementation]] — tab taps, citizenship surface impression, and login CTA analytics
- [[tasks/app-bootstrap-single-entry-point]] — `Session:PlatformInitTimeout` and refined Yandex auth-status semantics
- [[tasks/telegram-link]] — placement-specific Telegram CTA taps on start and game-end screens
- [[tasks/vk-link]] — placement-specific VK CTA taps on start and game-end screens
- [[tasks/solo-win-condition-fix]] — `Match:Loss:OpponentWon` reason event
- [[tasks/session-start-sequence]] — Session start event sequence and conventions
- [[tasks/mobile-quick-wins]] — `Performance:FPS:*` events measured here
- [[tasks/stale-build-detection]] — `Build:StaleDetected` event implementation
- [[tasks/build-number-tracking]] — HF-7 build segmentation and later native build-field migration
- [[tasks/ui-click-multiplayer]] — confirms the multiplayer JOIN click is the funnel anchor
- [[tasks/map-preload]] — HF-13 preload instrumentation at JOIN and match start
- [[tasks/missions-difficulty-investigation]] — mission-level drop-off cannot be derived from current coarse mission events
- [[tasks/monetization-analytics-spec]] — P0/P1 measurement plan for Sprint 4 citizenship, payments, and ad-tier decisions
- [[tasks/analytics-p0-game-mode-segmentation]] — P0 mode classifier emitted immediately after `Game:Start`
- [[tasks/analytics-p0-spawn-confirmation]] — P0 confirmed-spawn event for time-to-spawn and ghost-rate measurement
- [[tasks/analytics-p0-match-duration]] — P0 duration event emitted alongside `Game:End`
- [[tasks/analytics-p0-player-days-played]] — P0 loyalty-depth event emitted after `Player:New` or `Player:Returning`
- [[tasks/analytics-p0-yandex-login-status]] — P0 identity-reach event emitted as logged-in, guest, or unknown
- [[tasks/analytics-p0-session-match-count]] — P0 per-session match starts recorded via localStorage and consumed on next session open
- [[systems/flashist-init]] — startup ordering, SDK bootstrap, and experiment-flag initialization
- [[features/announcements]] — `UI:Tap:AnnouncementsBell`, `Announcements:Opened`, and `Announcements:Closed`
