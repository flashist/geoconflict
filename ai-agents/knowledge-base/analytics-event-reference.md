# Geoconflict — Analytics Event Naming Convention & Reference

## Convention

All analytics event strings use `Category:Action` or `Category:Subcategory:Value` format, with PascalCase segments separated by colons. No underscores, no screaming snake case.

**Examples of correct format:**

- `Game:Start`
- `Session:Heartbeat:05`
- `Performance:FPS:Above30`
- `Player:Eliminated`

All future events must follow this convention. The TypeScript enum serves as the single source of truth — event strings are never written inline in game code, always referenced through the enum.

> **Migration note:** Event strings were migrated from `SCREAMING_SNAKE_CASE` values (e.g. `"GAME_START"`) to the `Category:Action` format (e.g. `"Game:Start"`) on 2026-03-01. Historical data collected before this date appears under the old names in the analytics dashboard.

---

## Complete Event Reference

### Session Events

| Enum Key                        | Event String                                        | When Fired                                                                                                                                                                                                                                                                                |
| ------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SESSION_MATCHES_PLAYED`        | `Session:MatchesPlayed`                             | Once per session, **before** `Session:Start`, when a previous session's pending entry is consumed from localStorage; **value** = integer match starts recorded in that prior session (0 if no matches played). Fires once per tab that closed; multi-tab sessions produce one event each. |
| `SESSION_START`                 | `Session:Start`                                     | Once per session, at the very start of bootstrap (Phase 1, before SDK/platform init blocks). Top step of all funnels.                                                                                                                                                                     |
| `SESSION_HEARTBEAT`             | `Session:Heartbeat:05`, `Session:Heartbeat:10`, ... | Every 5 minutes while player is active. Stops on inactivity or tab close.                                                                                                                                                                                                                 |
| `SESSION_FIRST_ACTION`          | `Session:FirstAction`                               | Once per session, on first meaningful interaction on the start screen.                                                                                                                                                                                                                    |
| `SESSION_PLATFORM_INIT_TIMEOUT` | `Session:PlatformInitTimeout`                       | When a stage of the blocking platform init (Yandex SDK init, or player-data/experiment-flags loading) exceeds the 5s deadline and the app continues in degraded mode (default flags, localStorage username, browser language, no ads). Can fire at most once per stage.                   |

### Device & Platform Segmentation Events

Fired once per session immediately after `Session:Start`, in this order:

| Enum Key                  | Event String            | When Fired                                                                                                                                                                                                                                                                                                         |
| ------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DEVICE_MOBILE`           | `Device:mobile`         | Device class is mobile                                                                                                                                                                                                                                                                                             |
| `DEVICE_DESKTOP`          | `Device:desktop`        | Device class is desktop                                                                                                                                                                                                                                                                                            |
| `DEVICE_TABLET`           | `Device:tablet`         | Device class is tablet                                                                                                                                                                                                                                                                                             |
| `DEVICE_TV`               | `Device:tv`             | Device class is TV/console                                                                                                                                                                                                                                                                                         |
| `PLATFORM_ANDROID`        | `Platform:android`      | OS is Android                                                                                                                                                                                                                                                                                                      |
| `PLATFORM_IOS`            | `Platform:ios`          | OS is iOS                                                                                                                                                                                                                                                                                                          |
| `PLATFORM_WINDOWS`        | `Platform:windows`      | OS is Windows                                                                                                                                                                                                                                                                                                      |
| `PLATFORM_MACOS`          | `Platform:macos`        | OS is macOS                                                                                                                                                                                                                                                                                                        |
| `PLATFORM_LINUX`          | `Platform:linux`        | OS is Linux                                                                                                                                                                                                                                                                                                        |
| `PLATFORM_OTHER`          | `Platform:other`        | OS is unrecognized (ChromeOS, etc.)                                                                                                                                                                                                                                                                                |
| `PLAYER_NEW`              | `Player:New`            | Player's very first session ever                                                                                                                                                                                                                                                                                   |
| `PLAYER_RETURNING`        | `Player:Returning`      | Every session after the first                                                                                                                                                                                                                                                                                      |
| `PLAYER_DAYS_PLAYED`      | `Player:DaysPlayed`     | Once per session, immediately after `Player:New/Returning`; **value** = integer cumulative unique calendar days the game was opened (local time, not UTC; a gap of N days still increments by 1, not N)                                                                                                            |
| `PLAYER_YANDEX_LOGGED_IN` | `Player:YandexLoggedIn` | Player is authenticated with Yandex; fires asynchronously after player auth resolves (when SDK ready within 1-second window)                                                                                                                                                                                       |
| `PLAYER_YANDEX_GUEST`     | `Player:YandexGuest`    | Player is in Yandex guest mode (SDK ready, player object fetched, not authorized), or the session is on a non-Yandex/standalone platform (no SDK script)                                                                                                                                                           |
| `PLAYER_YANDEX_UNKNOWN`   | `Player:YandexUnknown`  | On the Yandex platform, but auth state could not be determined by the platform-init deadline: SDK init exceeded the 1-second window, the SDK script failed to load, `YaGames.init()` rejected, or `getPlayer()` did not settle (or rejected) in time. Exactly one `Player:Yandex*` event fires per booted session. |

Full session-start sequence:

```
Session:MatchesPlayed (0..N, from prior session) → Session:Start → Device:[class] → Platform:[os]
→ Player:New/Returning → Player:DaysPlayed
→ Player:YandexLoggedIn / Player:YandexGuest / Player:YandexUnknown  (async, after player auth)
```

### Game Events

Fired for first real match starts only. Reconnect handshakes and archived replay views do not emit these events.

| Enum Key                | Event String            | When Fired                                                                   |
| ----------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| `GAME_START`            | `Game:Start`            | First real, non-replay, non-reconnect match start                            |
| `GAME_MODE_MULTIPLAYER` | `Game:Mode:Multiplayer` | Immediately after `Game:Start` for public or private multiplayer lobbies     |
| `GAME_MODE_SOLO`        | `Game:Mode:Solo`        | Immediately after `Game:Start` for solo mode, missions, and tutorial matches |
| `GAME_END`              | `Game:End`              | Match ends for any reason                                                    |
| `GAME_WIN`              | `Game:Win`              | Player wins the match                                                        |
| `GAME_LOSS`             | `Game:Loss`             | Player loses the match                                                       |
| `GAME_ABANDON`          | `Game:Abandon`          | Player explicitly abandons                                                   |
| `PLAYER_ELIMINATED`     | `Player:Eliminated`     | Player is eliminated mid-match                                               |

### Match Duration Events

| Enum Key         | Event String     | When Fired                                                                                                  |
| ---------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `MATCH_DURATION` | `Match:Duration` | Fired alongside `Game:End`; value = integer seconds from fresh `Game:Start` to the player's match end event |

### Match Loss Events

| Enum Key                  | Event String             | When Fired                                     |
| ------------------------- | ------------------------ | ---------------------------------------------- |
| `MATCH_LOSS_OPPONENT_WON` | `Match:Loss:OpponentWon` | Solo loss screen shown because an opponent won |

### Win Condition Events

Spec: `ai-agents/tasks/backlog/0208-measure-clientless-leader-at-win-condition-in-production/brief.md`.

| Enum Key              | Event String                                                                                                                                                                                                             | When Fired                                                                                                                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MATCH_WIN_CONDITION` | **FFA:** `Match:WinCondition:{FfaPublic\|FfaPrivate}:{Threshold\|Timer}:{Bot\|Nation\|AiPlayer\|Human}`<br>**Team:** `Match:WinCondition:{TeamPublic\|TeamPrivate}:{Threshold\|Timer}:{BotTeam\|NationsTeam\|HumanTeam}` | Once per client-match, the first time the win condition is met — the territory threshold is crossed or the lobby timer expires. **Value:** integer percent of non-fallout land held by the leader at that moment. Fired for **every** leader, whether or not a winner is then declared. |

**The two leaf sets are disjoint — do not read the grammar as a cross-product.** FFA emits only
`Bot|Nation|AiPlayer|Human` (one per `PlayerType`) and team mode emits only
`BotTeam|NationsTeam|HumanTeam` (one per team kind); the branch that emits the event picks the leaf set.
So there are **7 leader leaves, not 7 per mode**, giving **28** grammatically reachable event ids
(`4 FFA + 3 team` × 2 lobby types × 2 branches) — not the 56 a cross-product reading suggests. Of those
28, the **seven** `…Public:…:Timer` ids are **also unreachable** — every leader leaf of both modes
(`FfaPublic:Timer:{Bot|Nation|AiPlayer|Human}` = 4, `TeamPublic:Timer:{BotTeam|NationsTeam|HumanTeam}` = 3),
because public lobbies carry no `maxTimerValue` (see the branch note below). That leaves `28 − 7` =
**21** ids that can actually appear.

⚠️ **Build dashboards from the reachable set, not from the grammar.** A panel per cross-product leaf
would show 35 permanently-empty series, which reads as telemetry loss — or, worse, as evidence that the
clientless case does not occur. That is the exact opposite of what this event is for.

**Fired at the decision point, not at the guard.** The event is emitted inside `WinCheckExecution`'s
`if (thresholdMet || timerMet)` block and **above** the clientless-leader guard, so it counts the case
the guard turns away _and_ keeps working once the guard is removed (tasks `0205` / `0211`) — at which
point the same number stops meaning "how often we stall" and starts meaning "how often the fallback
award fires."

**It carries its own denominator.** The leader-kind leaf covers every leader, so the clientless rate is
`(Bot + Nation + BotTeam + NationsTeam) / all` from one event, with no cross-event join.

**`NationsTeam` is a clientless leaf — do not read it as human.** In the `Humans Vs Nations` team mode
every FakeHuman nation is placed on one team of its own (`ColoredTeams.Nations`), so a leading Nations
team is **100 % clientless**. That mode is live in the public rotation with NPCs deliberately enabled,
and is host-selectable in private lobbies. Every other team configuration mixes nations into the
coloured teams, where `HumanTeam` is a fair label. Leaving `NationsTeam` out of the numerator above
understates the clientless rate in exactly the mode that produces the most of it.

**The `AiPlayer` leaf is ADR-110's re-raise-trigger measurement**
(`ai-agents/knowledge-base/decisions/adr-110-ai-player-may-be-declared-winner.md`): a
`PlayerType.AiPlayer` carries a real `clientID`, never enters the clientless guard, and may legitimately
be declared the winner. This leaf is how often that actually happens.

**Threshold and timer are never pooled.** Public lobbies carry no `maxTimerValue`, so a `Timer` sample is
**private-lobby-only by construction**. Reading the two branches as one population produces a meaningless
denominator.

**Singleplayer, missions and tutorials emit nothing.** They have no public or private lobby leaf, and are
dropped client-side rather than folded into a multiplayer leaf.

> **The denominator is client-matches, not matches.** The multiplier varies with lobby size and with
> how many clients stay to the end, so **absolute counts are uninterpretable** and skew toward large,
> well-attended lobbies. **Read only the ratio against total ended client-matches.**

The natural denominator, `Game:Mode:Multiplayer`, is already per-client-match, so numerator and
denominator sit on the same population and the **ratio** is sound. A single emitter was deliberately
**not** elected: a clientless leader leads precisely because humans died or left, so any election would
pick the client most likely to be gone and under-count the exact population being measured.

**Known under-counts — read the number as a lower bound:**

1. **Clients that are gone emit nothing.** The event is emitted by clients, and the simulation is driven
   off `requestAnimationFrame`, so a closed tab emits nothing. In the stall population humans are
   frequently dead or gone. The direction of the bias is known (under-count); the magnitude is **not**
   establishable without a server-side observer, which is out of scope for `0208`.
2. **Reconnects are suppressed.** A reconnecting client re-simulates from turn 0 with a fresh latch and
   would fire again, while `Game:Start` is not re-fired on reconnect. Suppressing keeps numerator and
   denominator on the same population, at the cost of losing a client that genuinely was present at the
   crossing. Reconnects are rare, so this is small either way.
3. **Matches that end with no winner where the threshold and timer were never met** — everyone quits, or
   the 3-hour cap expires on fragmented territory — are counted by nothing here. That is a different
   question with a different measurement site.

### Leaderboard Award Events

Spec: `ai-agents/tasks/backlog/0208-measure-clientless-leader-at-win-condition-in-production/brief.md`
(Part B).

| Enum Key                  | Event String                                                                                | When Fired                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MATCH_LEADERBOARD_AWARD` | `Match:Leaderboard:Award:{Participation\|PlacementWon\|PlacementLost}:{Solo\|SoloTutorial}` | A Singleplayer match reports points to the platform leaderboard, at the site where the report is made. **Value:** the points the attempt carried — 1 for participation, 10/5/2 for placement. |

**This counts attempts, platform failures included.** The event is emitted after the platform call has
settled, whatever it returned — and also when it rejects, which is exactly what a platform failure
looks like from here. So the value is points _attempted_, never points confirmed as banked. A rise in
this number is not evidence that any player's leaderboard score moved.

**Multiplayer emits nothing.** The measurement is Singleplayer-scoped on purpose: a leaked multiplayer
row would pollute the numbers `Match:WinCondition` exists to produce. The platform award itself is
unchanged in every mode — whether Singleplayer _should_ report at all is task `0210`, and this event
exists to measure the rate before that guard lands.

**Tutorials are marked, not dropped.** `Game:Mode:Solo` covers solo, missions and tutorials together,
so the tutorial share cannot be recovered from it after the fact — subtracting `Tutorial:Started`
over-subtracts, because that event fires before the match starts. The `SoloTutorial` leaf is what makes
this number comparable to `0210`'s non-tutorial scope.

**Five of the six ids are reachable today, not six.** `Match:Leaderboard:Award:PlacementLost:SoloTutorial`
**cannot currently fire.** Tutorials are hard-coded FFA (`Main.ts`) and `LocalServer` forces
`disableNPCs` on for them, so a clientless leader in a tutorial hits `0022`'s guard in
`WinCheckExecution` and returns before `setWinner` — no `Win` update is produced, and the placement
path never runs. Only a human win reaches it. **Build dashboards from the five, and do not read the
sixth's permanent zero as telemetry loss.** ⚠️ The leaf is deliberately kept, not deleted: it becomes
reachable the moment `0205` / `0211` removes that guard, and the composer is swept across all six on
purpose so removing the guard needs no analytics change.

**Won/lost is decided from the winner tuple's shape, all of it.** `GameImpl.makeWinner()` emits
`["player", …]`, `["team", …]`, `["opponent", …]`, or nothing at all. **Singleplayer Team mode is
user-selectable**, so a solo win arrives as a _team_ tuple whenever the player picked Teams — reading
only the `player` shape reported those wins as `PlacementLost` carrying the first-place value. The
predicate handles every shape (`humanWonPlacement`). `WinModal.isSoloOpponentWin()`'s extra
`isAlive()` / `!hasShownDeathModal` conditions are **not** reused: they are the same bias that makes
`Match:Loss:OpponentWon` a lower bound.

**Won/lost is fused into the award-kind segment** because `Match:Leaderboard:Award` is already three
segments and GameAnalytics allows five. There is no room for a sixth dimension, and one must not be
added.

**Points, not placement.** `placement` never leaves the browser — the reporter passes only `points` to
the platform and `placement` reaches nothing but a `console.debug`. Measuring `placement` would measure
a value that never reaches the platform. Its own defect is task `0209`.

> **The denominator here is matches, not client-matches** — the opposite of `Match:WinCondition` above.
> **Do not copy that event's client-match caveat onto this one.** Singleplayer runs one client against
> the in-browser `LocalServer`, and both call sites are latched once per `ClientGameRunner`
> (`hasReportedParticipation`, `hasProcessedWin`) and already skip replays.

⚠️ **One unverified residual.** A mid-match reload builds a fresh `ClientGameRunner` and resets both
latches. Singleplayer appears unable to resume — the only writer of the reconnect session
(`saveReconnectSession`, one call site) is skipped when the transport is local, and resuming would in
any case need a server-side game that never existed — but that is static analysis, not a play-test. If
a reload is ever shown to double-count participation, it belongs here.

⚠️ **Accepted residual — a broken analytics SDK can mask the platform error.** The event is emitted in
a `finally`, and `flashist_logEventAnalytics` reports its own failures through
`flashist_logErrorToAnalytics`, which calls `GameAnalytics.addErrorEvent` unguarded. If that throws, it
replaces the platform rejection that was propagating. **Accepted by the owner, 2026-09-04, and
deliberately not fixed:** it only bites when the analytics SDK is already broken, and swallowing there
would trade a rare mislabelled error for a permanently silent one.

### Spawn Events

| Enum Key                              | Event String                       | When Fired                                                                                                                                                                                                               |
| ------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `MATCH_SPAWN_CHOSEN`                  | `Match:SpawnChosen`                | Player actively selected a spawn location                                                                                                                                                                                |
| `MATCH_SPAWN_AUTO`                    | `Match:SpawnAuto`                  | Player was auto-placed (Task 4a mechanic)                                                                                                                                                                                |
| `MATCH_SPAWNED_CONFIRMED`             | `Match:Spawned`                    | Server-confirmed spawn is reflected in client state for the first time; value = positive integer seconds from `Game:Start` to confirmed territory ownership                                                              |
| `MATCH_SPAWN_MISSED_TIMING_RACE`      | `Match:SpawnMissed:TimingRace`     | Fired once when spawn phase ends, player never placed, and auto-spawn intent was sent (timing race — intent rejected by server)                                                                                          |
| `MATCH_SPAWN_MISSED_NO_ATTEMPT`       | `Match:SpawnMissed:NoAttempt`      | Fired once when spawn phase ends, player never placed, and auto-spawn never even ran                                                                                                                                     |
| `MATCH_SPAWN_RETRY_AFTER_CATCHUP`     | `Match:SpawnRetryAfterCatchup`     | Auto-spawn was blocked during catch-up and then deferred and retried after catch-up ended — fires at intent-send time, not on confirmed server placement. Always fires together with `Match:SpawnAuto` in the same tick. |
| `MATCH_SPAWN_MISSED_CATCHUP_TOO_LONG` | `Match:SpawnMissed:CatchupTooLong` | Catch-up lasted longer than the entire spawn phase — player never placed, no recovery path (Problem 2, not yet fixed)                                                                                                    |

### Reconnection Events

| Enum Key                 | Event String            | When Fired                                            |
| ------------------------ | ----------------------- | ----------------------------------------------------- |
| `RECONNECT_PROMPT_SHOWN` | `Reconnect:PromptShown` | Reconnection prompt appears after detected disconnect |
| `RECONNECT_ACCEPTED`     | `Reconnect:Accepted`    | Player taps "Reconnect"                               |
| `RECONNECT_DECLINED`     | `Reconnect:Declined`    | Player taps "Leave"                                   |
| `RECONNECT_SUCCEEDED`    | `Reconnect:Succeeded`   | Reconnection completes successfully                   |
| `RECONNECT_FAILED`       | `Reconnect:Failed`      | Reconnection attempt fails                            |

### Feedback Events

| Enum Key                  | Event String            | When Fired                             |
| ------------------------- | ----------------------- | -------------------------------------- |
| `FEEDBACK_BUTTON_OPENED`  | `Feedback:ButtonOpened` | Player opens the feedback form         |
| `FEEDBACK_SUBMITTED`      | `Feedback:Submitted`    | Player submits feedback                |
| `SUBSCRIBE_BUTTON_OPENED` | `Subscribe:Opened`      | Player opens the email subscribe modal |
| `SUBSCRIBE_SUBMITTED`     | `Subscribe:Submitted`   | Player submits email subscription      |

### UI Events

| Enum Key                       | Event String                | When Fired                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UI_CLICK_MULTIPLAYER`         | `UI:ClickMultiplayer`       | Player clicks the JOIN button on a specific multiplayer lobby entry (fires once per join attempt, debounced)                                                                                                                                                                                                                                                              |
| `UI_CLICK_SINGLE_PLAYER`       | `UI:ClickSinglePlayer`      | Player clicks the single player button                                                                                                                                                                                                                                                                                                                                    |
| `UI_CLICK_MISSION`             | `UI:ClickMission`           | Player clicks a specific mission                                                                                                                                                                                                                                                                                                                                          |
| `UI_CLICK_STALE_BUILD_REFRESH` | `UI:ClickStaleBuildRefresh` | Player clicks the REFRESH button on the stale build modal                                                                                                                                                                                                                                                                                                                 |
| `UI_CLICK_STALE_BUILD_CONTACT` | `UI:ClickStaleBuildContact` | Player clicks the "Contact support" link on the stale build modal                                                                                                                                                                                                                                                                                                         |
| `ANNOUNCEMENTS_OPENED`         | `Announcements:Opened`      | Player opens the announcements popup                                                                                                                                                                                                                                                                                                                                      |
| `ANNOUNCEMENTS_CLOSED`         | `Announcements:Closed`      | Player closes the announcements popup                                                                                                                                                                                                                                                                                                                                     |
| `INBOX_OPENED`                 | `Inbox:Opened`              | A citizen selects the Personal tab inside the announcements popup (task 0012). Fires on every selection of that tab; the tab exists only when `GET /v1/messages` succeeded (citizen confirmed server-side), so guests and non-citizens never fire it. Gated behind `CITIZENSHIP_CARD_ENABLED` (the inbox fetch never runs while the card is unlaunched)                   |
| `INBOX_LOAD_FAILED`            | `Inbox:LoadFailed`          | The inbox fetch (`GET /v1/messages`) FAILED — network error, 5xx, 5 s timeout, or a body that fails schema validation (task 0012). Once per failed load (initial load, bell-open refresh, post-reconcile refresh). NOT fired on 403 (the ordinary non-citizen / no-profile answer), nor when the profile API is unconfigured, nor for guests. Same gate as `Inbox:Opened` |

#### UI:Tap events

| Element ID constant                     | Full event string                 | When fired                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uiElementIds.announcementsBell`        | `UI:Tap:AnnouncementsBell`        | Player clicks or taps the announcements bell on the start screen                                                                                                                                                                                                                                                                                                            |
| `uiElementIds.announcementsTabGlobal`   | `UI:Tap:AnnouncementsTabGlobal`   | Citizen taps the Global tab inside the announcements popup (task 0012). Fires on every tap, including re-taps on the already-active tab. The tab strip is rendered only when the personal inbox is available (citizen confirmed server-side), so guests/non-citizens never fire it                                                                                          |
| `uiElementIds.announcementsTabPersonal` | `UI:Tap:AnnouncementsTabPersonal` | Citizen taps the Personal tab inside the announcements popup (task 0012). Same semantics as `AnnouncementsTabGlobal`; each tap also fires `Inbox:Opened`                                                                                                                                                                                                                    |
| `uiElementIds.telegramLinkStartScreen`  | `UI:Tap:TelegramLinkStartScreen`  | Player clicks the Telegram link on the start screen                                                                                                                                                                                                                                                                                                                         |
| `uiElementIds.telegramLinkGameEnd`      | `UI:Tap:TelegramLinkGameEnd`      | Player clicks the Telegram link on the game-end screen                                                                                                                                                                                                                                                                                                                      |
| `uiElementIds.vkLinkStartScreen`        | `UI:Tap:VkLinkStartScreen`        | Player clicks the VK link on the start screen                                                                                                                                                                                                                                                                                                                               |
| `uiElementIds.vkLinkGameEnd`            | `UI:Tap:VkLinkGameEnd`            | Player clicks the VK link on the game-end screen                                                                                                                                                                                                                                                                                                                            |
| `uiElementIds.tutorialSkipBtnCorner`    | `UI:Tap:TutorialSkipBtnCorner`    | Player clicks the corner skip button during tutorial                                                                                                                                                                                                                                                                                                                        |
| `uiElementIds.tutorialSkipBtnInline`    | `UI:Tap:TutorialSkipBtnInline`    | Player clicks the inline skip link during tutorial                                                                                                                                                                                                                                                                                                                          |
| `uiElementIds.multiplayerTab`           | `UI:Tap:MultiplayerTab`           | Player taps the Multiplayer tab on the start screen. Fires on every tap, including re-taps on the already-active tab; restoring the persisted tab on page load does not fire                                                                                                                                                                                                |
| `uiElementIds.singleplayerTab`          | `UI:Tap:SingleplayerTab`          | Player taps the Singleplayer tab on the start screen. Same semantics as `MultiplayerTab`                                                                                                                                                                                                                                                                                    |
| `uiElementIds.citizenshipLoginToEarn`   | `UI:Tap:CitizenshipLoginToEarn`   | Guest player taps the "Войти в Яндекс" login CTA on the citizenship card (start screen). Note: supersedes the `UI:Tap:CitizenLoginCta` string mentioned in `0191-citizenship-xp-progress-ui` — the citizenship funnel spec (`0021-analytics-p1-citizenship-funnel`) is authoritative                                                                                        |
| `uiElementIds.purchaseCitizenship`      | `UI:Tap:PurchaseCitizenship`      | Player taps the "Buy Citizenship" button on the citizenship card (State 2, non-citizen), before the purchase flow starts and before the Yandex payment frame opens. Constant registered in 0019; button wired in 0018. Note: supersedes the `UI:Tap:CitizenshipBuy` string in `0021-analytics-p1-citizenship-funnel` §2 — this reference + the 0018 brief are authoritative |

> **UI:Tap convention:** `UI:Tap:{ElementId}` is the standard pattern for tracking specific UI element interactions. The prefix is `flashistConstants.analyticEvents.UI_TAP_FIRST_PART`. Element IDs are registered in `flashistConstants.uiElementIds` (PascalCase, descriptive). Fire via `FlashistFacade.instance.logUiTapEvent(flashistConstants.uiElementIds.yourElement)`. This is opt-in — only elements listed in this document are instrumented.

### Citizenship Events

Part of the citizenship funnel (`ai-agents/tasks/done/0021-analytics-p1-citizenship-funnel/brief.md`).

| Enum Key                         | Event String                     | When Fired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PURCHASE_STARTED_CITIZENSHIP`   | `Purchase:Started:Citizenship`   | The paid-citizenship flow opens the Yandex payment frame (`purchaseCatalogItem` about to be called) — the last client-controlled moment (task 0018; spec `0021` §3). NOT fired when the flow dies earlier (no Yandex id, or the server `/intent` call fails): the frame never opened, so no Started and no Abandoned                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `PURCHASE_COMPLETED_CITIZENSHIP` | `Purchase:Completed:Citizenship` | The profile server confirmed the grant (`POST /v1/payments/yandex/complete` returned success) — never on the client-side `purchase()` callback alone (task 0018; spec `0021` §4). Fires before the (best-effort) `consumePurchase` call; a failed consume does not un-fire it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `PURCHASE_ABANDONED_CITIZENSHIP` | `Purchase:Abandoned:Citizenship` | A started flow ended without a Completed: the player closed the payment frame, the SDK rejected, `purchase()` resolved without a signature, or the server `/complete` call failed (task 0018; spec `0021` §5 — cancel and failure both count as abandoned). Exactly one of Completed/Abandoned per started flow. Known residual (0021-as-written): a real payment whose `/complete` failed logs Abandoned even though next-session reconciliation later lands the grant                                                                                                                                                                                                                                                                                                                                     |
| `CITIZENSHIP_SURFACE_SEEN`       | `Citizenship:Seen`               | Once per page load, when the citizenship card on the start screen is rendered and actually visible (after game init completes — not during the Yandex preload curtain, and not while the card is hidden). The whole card is gated by the `citizenship_ui` experiment flag — players in the disabled cohort never see the card and never fire this event (their cohort anchor is `Experiment:citizenship_ui:{value}`). ⚠️ **Known risk — may under-count; see the note under this table**                                                                                                                                                                                                                                                                                                                    |
| `CITIZENSHIP_EARNED_XP`          | `Citizenship:Earned:XP`          | Once per account+device, when a re-fetched server profile first shows `citizenship_earned_at` set after a previous observation without it — i.e. the first client observation of the server-side 1,000-XP earned-citizenship grant (task 0017; spec `0021` §6). Fires from `loadPlayerProfileView()` (profile re-fetch on page load / post-match return), never from the local XP display. Keyed on `citizenship_earned_at` (not `is_citizen` — the paid grant sets that too). Known accepted residuals (owner ruling 2026-08-23): under-counts a grant first observed on a fresh device/cleared storage; over-counts a paid citizen later crossing the XP threshold. Gated behind `CITIZENSHIP_CARD_ENABLED` (the only caller is the citizenship card's profile load), so it goes live at the 0017 flip-ON |

> **⚠️ Not live yet.** Every event in this table is gated behind
> `flashistConstants.features.CITIZENSHIP_CARD_ENABLED: false`
> (`src/client/flashist/FlashistFacade.ts:182`), checked first thing in
> `CitizenshipCard.connectedCallback()` before any analytics call. **As of 2026-09-02 no citizenship
> event has ever fired for a real player.** Flipping that flag _is_ the citizenship relaunch.

> **⚠️ Known risk (logged 2026-09-02, owner ruling R3 — deliberately NOT fixed): `Citizenship:Seen`
> may under-count on a slow first paint.** > `maybeReportSeen()` runs exactly once, from `connectedCallback()` after `await this.updateComplete`
> (`src/client/CitizenshipCard.ts:114`, `:141-149`). If `isCardVisible()` is false at that one moment
> — the Yandex preload curtain still up, or a slow first paint on a low-end device — it returns
> without firing and is **never retried**: there is no observer and no re-check on a later render, so
> the impression is silently dropped for that page load.
>
> **Direction of error — read the funnel accordingly: this UNDER-counts impressions, which INFLATES
> every downstream conversion rate.** Tap rate, purchase rate and earn rate all carry impressions in
> the denominator, so each reads **better than reality** by however much is dropped. It cannot err the
> other way. Treat citizenship conversion percentages as an **upper bound** until this is measured.
>
> **Unproven.** This is a code-reading conclusion, not an observation. Confirming or ruling it out
> needs a real Yandex Games context — the preload curtain is precisely what local dev lacks — so it
> cannot be settled before citizenship goes live. **Recommended follow-up:** a separate brief, filed
> by the producer once the first live day of `Citizenship:Seen` volume exists to judge whether it
> matters at all. Spec: `0021-analytics-p1-citizenship-funnel`.

> **Recorded as obsolete — `UI:Tap:CitizenshipLearnMore` (dropped 2026-09-02, owner ruling R2). Do not
> re-add it.**
> Originally specified in `0021` §2 as the sixth citizenship funnel event, against a "Learn more" /
> details link on the citizenship card. **That surface was never designed and does not exist.** The
> shipped card has exactly three states — guest (lock + login CTA), authorized non-citizen (XP
> progress + buy CTA), citizen (CITIZEN badge, bar full) — with no room for a fourth affordance. The
> event was spec'd for a UI that was not built; it was **not** stranded by a task that closed. A grep
> for `CitizenshipLearnMore` / `LEARN_MORE` / `learnMore` across `src/` and `tests/` returns nothing.
>
> **Accepted cost, stated plainly: the funnel has no "researched it but didn't buy" signal.** The
> chain runs impression → CTA tap → purchase started → completed/abandoned, so a player who
> considered citizenship and declined is indistinguishable from one who never engaged past the
> impression. If a Learn-more surface is ever designed, the event returns **with** it — and only then.

### Performance Events

Sampled every 60 seconds during active gameplay via a `setInterval` independent of the render loop.

| Enum Key                    | Event String                | When Fired                                                                                |
| --------------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| `PERFORMANCE_FPS_AVERAGE`   | `Performance:FPSAverage`    | Current average FPS value (will be passed into the analytic event as the value parameter) |
| `PERFORMANCE_FPS_ABOVE30`   | `Performance:FPS:Above30`   | Current FPS ≥ 30                                                                          |
| `PERFORMANCE_FPS_15TO30`    | `Performance:FPS:15to30`    | Current FPS between 15 and 30                                                             |
| `PERFORMANCE_FPS_BELOW15`   | `Performance:FPS:Below15`   | Current FPS < 15 — crash risk zone                                                        |
| `PERFORMANCE_MEMORY_HIGH`   | `Performance:Memory:High`   | Heap is healthy (Chrome only, best-effort)                                                |
| `PERFORMANCE_MEMORY_MEDIUM` | `Performance:Memory:Medium` | Heap is under moderate pressure                                                           |
| `PERFORMANCE_MEMORY_LOW`    | `Performance:Memory:Low`    | Heap is heavily constrained — crash risk                                                  |

### Build Version Events

| Enum Key               | Event String          | When Fired                                                                                                                                                                                                             |
| ---------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BUILD_STALE_DETECTED` | `Build:StaleDetected` | Client is running an older build than the server. Fired at most once per session. **Value:** minutes since page load (integer). `0` = detected on startup (CDN/cache issue). `>0` = detected mid-session (zombie tab). |

### Worker Initialization Events

Fired once per game session attempt, before gameplay starts.

| Enum Key              | Event String         | When Fired                                                              |
| --------------------- | -------------------- | ----------------------------------------------------------------------- |
| `WORKER_INIT_SUCCESS` | `Worker:InitSuccess` | Web Worker initialized successfully; game will start                    |
| `WORKER_INIT_FAILED`  | `Worker:InitFailed`  | Worker construction or initialization failed; error modal shown to user |

### Tutorial Events

Fired during the tutorial match (only for players who see the tutorial experiment).

| Enum Key                             | Event String                  | When Fired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TUTORIAL_STARTED`                   | `Tutorial:Started`            | Tutorial match begins. **Value:** lifetime attempt count (1 = first ever attempt, 2 = second, etc.), persisted in `localStorage` under `tutorialAttemptCount`. Use this to separate first-time abandonment from repeat attempts. (**Historical note:** before `Experiment:Tutorial:Enabled` shipped, this event served as an imperfect proxy for experiment group assignment; data from that period has no `Experiment:Tutorial:*` events — use `Tutorial:Started` as the cohort anchor for historical comparisons. Events fired before the attempt-count change carry no value.) |
| `TUTORIAL_TOOLTIP_SHOWN_FIRST_PART`  | `Tutorial:TooltipShown:` + N  | Tooltip N appears (N = 1–7); string is built at runtime by appending the tooltip number                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `TUTORIAL_TOOLTIP_CLOSED_FIRST_PART` | `Tutorial:TooltipClosed:` + N | Tooltip N is dismissed by the player (N = 1–7); string is built at runtime by appending the tooltip number                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `TUTORIAL_SKIPPED`                   | `Tutorial:Skipped`            | Player clicks the "Skip tutorial" button                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `TUTORIAL_COMPLETED`                 | `Tutorial:Completed`          | Tutorial finishes (player wins the mission or closes the final tooltip)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `TUTORIAL_DURATION`                  | `Tutorial:Duration`           | Fired alongside `Tutorial:Skipped` or `Tutorial:Completed`; value = seconds elapsed since tutorial started                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### Experiment Events

Fired once per session immediately after Yandex experiment flags are loaded — one event per flag, for every player regardless of variant. This gives a clean cohort anchor for both sides of every experiment, enabling proper funnel comparison between groups.

**Convention:** `Experiment:{flagName}:{flagValue}`

The event string is built at runtime from the raw Yandex flag key and value. No enum constant needed — events fire automatically for all flags returned by Yandex via `FlashistFacade.logExperimentEvent(name, value)`, called inside `initExperimentFlags()` as soon as the flags response arrives.

**Firing point:** inside `FlashistFacade.initExperimentFlags()` in `src/client/flashist/FlashistFacade.ts`, immediately after `this.yandexExperimentFlags` is populated. No manual call sites required — adding a new flag in the Yandex dashboard is sufficient.

**Example funnels enabled by experiment events:**

Control group:

```
Experiment:Tutorial:Disabled → Game:Start → Match:SpawnChosen → Session:Heartbeat:05
```

Experiment group:

```
Experiment:Tutorial:Enabled → Tutorial:Started → Tutorial:Completed → Game:Start → Match:SpawnChosen → Session:Heartbeat:05
```

### Map Preload Events

Fired during the JOIN → match-start flow to measure the impact of background map preloading on `Match:SpawnMissed:CatchupTooLong`.

| Enum Key                       | Event String                | When Fired                                                                            | Value                                 |
| ------------------------------ | --------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------- |
| `MATCH_PRELOAD_STARTED`        | `Match:PreloadStarted`      | `preloadMap()` begins a new terrain load                                              | —                                     |
| `MATCH_PRELOAD_READY`          | `Match:PreloadReady`        | Preload promise resolves successfully                                                 | Seconds taken to load                 |
| `MATCH_PRELOAD_HIT_LOADED`     | `Match:PreloadHitLoaded`    | Match init uses the preloaded assets - loading complete (cache hit)                   | Seconds elapsed since preload started |
| `MATCH_PRELOAD_HIT_NOT_LOADED` | `Match:PreloadHitNotLoaded` | Match init uses the preloaded assets - loading NOT complete (in progress) (cache hit) | Seconds elapsed since preload started |
| `MATCH_PRELOAD_MISS`           | `Match:PreloadMiss`         | Match init falls back to fresh load (no preload or failed)                            | —                                     |

`Match:PreloadHit` value approximates how much loading time was moved to background. Compare `Match:SpawnMissed:CatchupTooLong` rate before and after deploying HF-13 to evaluate impact.

---

## TypeScript Enum

The live enum is in `src/client/flashist/FlashistFacade.ts` (`flashistConstants.analyticEvents`). That file is the authoritative source — do not maintain a duplicate here.

---

## Naming Rules for Future Events

1. **Format:** `Category:Action` or `Category:Subcategory:Value` — always PascalCase, always colon-separated
2. **No underscores** anywhere in the event string
3. **Category** should be a noun: `Game`, `Session`, `Player`, `Match`, `UI`, `Performance`, `Reconnect`, `Feedback`, `Experiment`
4. **Action** should be PascalCase verb or state: `Start`, `End`, `ButtonOpened`, `SpawnChosen`
5. **Values/buckets** use the same casing as established: `Above30`, `mobile`, `android` (follow existing patterns within the category)
6. **Enum keys** use `SCREAMING_SNAKE_CASE` — this is the internal TypeScript identifier and is independent of the event string
7. **Never write event strings inline** — always use the enum key. This means a rename only requires changing one line.
