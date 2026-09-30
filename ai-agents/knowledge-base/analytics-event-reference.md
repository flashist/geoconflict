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
| `SESSION_PLATFORM_INIT_TIMEOUT` | `Session:PlatformInitTimeout`                       | When a stage of the blocking platform init (Yandex SDK init, or player-data/experiment-flags loading) exceeds the 5s deadline and the app continues in degraded mode (default flags, localStorage username, browser language, no ads). Fires at most once per boot (latched): a stage-1 and a stage-2 deadline on the same boot log **one** event (task 0328 corrected the old "once per stage" wording). |
| `SESSION_PLATFORM_DEGRADED_FIRST_PART` | `Session:PlatformDegraded:{Cause}` | At most **once per page load**, on the Yandex template only, when the Yandex platform is degraded: SDK, player or flags missing (task 0328). ⚠️ **Not a count of hidden citizenship cards:** the card hides only when the flags are missing, so `NoPlayer`, and a `ScriptTimeout` / `InitTimeout` whose flags arrived before the check, fire with the card shown. Measured at the card's own decision point — the game-init gate — after awaiting the same experiment-flags load the card awaits, so flags that are merely slow do **not** count. Not fired on a healthy boot or on the standalone web page. `{Cause}` is appended at the call site from a closed list, first match wins — see *Platform degraded causes* below. **Value:** `1` when this page load follows a match exit (a `sessionStorage` marker written by `changeHref(rootPathname)`, read and removed on every boot), `0` otherwise — so count = degraded loads, sum = degraded loads after a match. `reloadApp()` (the 0303 restart) is not a match exit and never sets the marker |
| `SESSION_PLATFORM_RECOVERED` | `Session:PlatformRecovered` | At most once per page load, when `Session:PlatformDegraded:*` already fired **with the flags missing** and the flags then arrived late (late-SDK recovery, task 0328). These are the loads task 0329 (card re-checks on late recovery) would rescue. Not fired when the flags were already present at the check. Since task 0330 it can also follow `ScriptFailed`: a loader download retry that succeeds after the 5 s deadline (a background retry, or a quick retry still downloading at 5 s) leads here when `YaGames.init()` then succeeds and the flags arrive after the check. **Value:** the same 0/1 after-match value as the degraded event |
| `SESSION_SDK_LOADER_RETRY_FIRST_PART` | `Session:SdkLoaderRetry:{Outcome}` | At most **once per page load**, on the Yandex template only, and only when the **first** download of the Yandex SDK loader script failed (its `onerror` ran) — task 0330. The download (never `YaGames.init()`) is retried at about +0.5 s and +1.5 s inside the 5 s platform-init deadline, then quietly at about +5 s / +15 s / +45 s in the background, then it stops (5 retries at most). `{Outcome}` is appended at the call site from a closed list: `Recovered` — a retry loaded the loader before the 5 s deadline, so no `ScriptFailed` fires for that load; `RecoveredLate` — a retry loaded it after the deadline, when the boot had already gone degraded (`ScriptFailed` still fires if the check finds anything missing; if `YaGames.init()` then succeeds, the existing late-recovery path runs, see `Session:PlatformRecovered`); `GaveUp` — every retry failed (or the loader tag was missing, value `0`). **Value:** the number of re-downloads made (1–5; `0` only for a missing loader tag). Carries no ids, hosts or URLs. Not fired when the first download succeeded, nor on the standalone web page. ⚠️ **`Recovered` / `RecoveredLate` count loader downloads, not platform recovery:** `YaGames.init()` can still reject or hang after either — read `Session:PlatformDegraded:*` / `Session:PlatformRecovered` for that. ⚠️ **Outcomes undercount failures, and the save rate reads high:** `GaveUp` fires only after the last background retry, about 67 s after the first failure (longer if the downloads are slow, never if one stalls — no per-attempt timeout, by design), so a page closed before then sends **no** `Session:SdkLoaderRetry:*` event. Outcome totals therefore fall short of first-failure pages, and (`Recovered` + `RecoveredLate`) / all outcomes is **higher** than the true save rate |

> **Platform degraded causes (task 0328, owner ruling 2026-09-28).** Checked in this order; the first that
> applies is the one reported:
>
> 1. `ScriptFailed` — the Yandex SDK loader script failed to load (its `onerror` ran) **and** the quick download
>    retries (task 0330) had not recovered it **before the 5 s deadline**. A load that a quick retry saved inside the
>    deadline is classified by what is still missing, if anything (`NoPlayer`, `NoFlags`, …), not as `ScriptFailed`;
>    count those saves with `Session:SdkLoaderRetry:Recovered`. A save after the deadline (a background retry, or a
>    quick retry still downloading at 5 s) still reads `ScriptFailed` if anything is still missing at the check, even when it
>    lands before the check: the boot had already gone degraded because of the download.
> 2. `ScriptTimeout` — the loader was still downloading when the 5 s platform-init deadline hit.
> 3. `InitFailed` — `YaGames.init()` rejected.
> 4. `InitTimeout` — the loader had loaded but `YaGames.init()` had not settled at the 5 s deadline.
> 5. `NoSdk` — the loader loaded but left no SDK (for example, the page is not inside Yandex's frame).
> 6. `NoPlayer` — SDK present, no player object.
> 7. `NoFlags` — SDK present, experiment flags missing.
>
> A timeout whose SDK, player and flags all arrived before the check is **not** degraded.
> The card is hidden only when the flags are missing. `NoPlayer` always fires with the card shown, and so
> does a `ScriptTimeout` / `InitTimeout` whose flags arrived before the check but whose player did not.
> A deadline that hit only stage 2 (player/flags) is not reported as a timeout — it reads as `NoPlayer` or
> `NoFlags`.
> The event does not fire if the app chunk never loads (no gate, so no card either).

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
| `PLAYER_YANDEX_UNKNOWN`   | `Player:YandexUnknown`  | On the Yandex platform, but auth state could not be determined by the platform-init deadline: SDK init exceeded the 1-second window, the SDK script failed to load, `YaGames.init()` rejected, or `getPlayer()` did not settle (or rejected) in time. Exactly one `Player:Yandex*` event fires per booted session. For the cause, see `Session:PlatformDegraded:*`. Since task 0330 the 1-second window starts once the loader has actually loaded, including after a download retry, so a retried-then-loaded boot is not counted as unknown for that reason alone. |

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

Spec: `ai-agents/tasks/done/0208-measure-clientless-leader-at-win-condition-in-production/brief.md`.

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

Spec: `ai-agents/tasks/done/0208-measure-clientless-leader-at-win-condition-in-production/brief.md`
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

✅ **CONFIRMED IN PRODUCTION DATA, 2026-09-11 — this was previously a CODE-DERIVED PREDICTION ONLY.**
The `0208` award-kind × mode cross-tab (`Match:Leaderboard:Award`, 4–10 Sep 2026, grouped by Event id 04,
with and without the Event id 05 = `Solo` filter) reads `PlacementLost` as **2.53K in both columns** —
so the `SoloTutorial` contribution over the full 7-day window is **exactly zero**, independently of the
code reading above. ⚠️ **This confirms the zero is real TODAY; it does NOT make it permanent and does
NOT license deleting the leaf** — the paragraph above stands unchanged. ⚠️ **These are award ATTEMPTS,
platform failures included, never points confirmed banked.**

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
latches. Singleplayer appears unable to resume — the reconnect session has two writers
(`saveReconnectSession`, called from `joinLobby` on the server's `start` and again from the runner on
`start`, task `0347`), and both are skipped when the transport is local; resuming would in any case
need a server-side game that never existed — but that is static analysis, not a play-test. If
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

**Since task `0347` (no event added or changed):**

- **The prompt can also follow a failed match start.** The reconnect session is now saved as soon as
  the server's `start` reaches the lobby, before the worker is built. So a refresh after a worker start
  failure (or a failed map load before the worker) now offers Rejoin, where before it offered nothing.
- **`Reconnect:Succeeded` does not prove the player got back in.** It fires when `/api/game/<id>/active`
  said the game is active and the rejoin was sent. The rejoin runs the same worker start, which can fail
  again; that shows up as `Worker:InitFailed` after `Reconnect:Succeeded`. This was already true before
  `0347` — clarified here, not changed.
- ⚠️ **A rejoin-after-failed-start match never emits `Game:Start`.** `Game:Start` is suppressed on a
  reconnect (see *Game Events*), and the first attempt never reached the runner, so for such a match
  neither attempt counts it. `Game:End` still fires for it — **more than once**, against zero
  `Game:Start`: once with `Game:Abandon` when the page is refreshed after the failed start (the lobby's
  `onJoin` already marked the match started, so `beforeunload` logs the abandon; this part predates
  `0347`), and again when the rejoined match ends. `Match:Duration` and `Match:Spawned` do not fire at
  all (both need the `Game:Start` time, which was never set). **Accepted by the owner, 2026-09-30: left
  as is, documented here.**
- ⚠️ **Known limitation — a late rejoin can land as a spectator.** Rejoin puts the player back into the
  same match, but if they rejoin after the spawn phase (~20 s: 300 turns × 66.7 ms) they never placed a
  spawn, so they can only watch. **Accepted by the owner for `0347`, 2026-09-30: documented, not
  widened.**

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

| Enum Key                                | Event String                                                 | When Fired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PURCHASE_STARTED_CITIZENSHIP`          | `Purchase:Started:Citizenship`                               | The paid-citizenship flow opens the Yandex payment frame (`purchaseCatalogItem` about to be called) — the last client-controlled moment (task 0018; spec `0021` §3). NOT fired when the flow dies earlier (no Yandex id, or the server `/intent` call fails): the frame never opened, so no Started and no Abandoned                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `PURCHASE_COMPLETED_CITIZENSHIP`        | `Purchase:Completed:Citizenship`                             | The profile server confirmed the grant (`POST /v1/payments/yandex/complete` returned success) — never on the client-side `purchase()` callback alone (task 0018; spec `0021` §4). Fires before the (best-effort) `consumePurchase` call; a failed consume does not un-fire it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `PURCHASE_ABANDONED_CITIZENSHIP`        | `Purchase:Abandoned:Citizenship`                             | A started flow ended without a Completed: the player closed the payment frame, the SDK rejected, `purchase()` resolved without a signature, or the server `/complete` call failed (task 0018; spec `0021` §5 — cancel and failure both count as abandoned). Exactly one of Completed/Abandoned per started flow. Known residual (0021-as-written): a real payment whose `/complete` failed logs Abandoned even though next-session reconciliation later lands the grant                                                                                                                                                                                                                                                                                                                                                                   |
| `CITIZENSHIP_SURFACE_SEEN`              | `Citizenship:Seen`                                           | Once per page load, when the citizenship card on the start screen is rendered and actually visible (after game init completes — not during the Yandex preload curtain, and not while the card is hidden). The whole card is gated by the `citizenship_ui` experiment flag — players in the disabled cohort never see the card and never fire this event (their cohort anchor is `Experiment:citizenship_ui:{value}`). ⚠️ **Known risk — may under-count; see the note under this table**                                                                                                                                                                                                                                                                                                                                                  |
| `CITIZENSHIP_EARNED_XP`                 | `Citizenship:Earned:XP`                                      | ⚠️ **DORMANT from the task 0250 S1 _profile-server_ deploy until S3b — on old and new clients alike (owner ruling D4).** An unverified profile read now carries `citizenship_earned_at: null` for every player (paid and earned citizens are equalized), so no client can observe the transition: an old client sees `""` forever and never fires; the new client (S1) does not run the detection at all. When S3b lands it fires on **verified** reads only, stored under a fresh key prefix (`geoconflict_citizenship_earned_at_v2:`) so the old prefix's `""` values cannot fire a false Earned event. Definition once re-enabled: once per account+device, when a re-fetched server profile first shows `citizenship_earned_at` set after a previous observation without it — i.e. the first client observation of the server-side 100-XP earned-citizenship grant (task 0017; spec `0021` §6). Fires from `loadPlayerProfileView()` (profile re-fetch on page load / post-match return), never from the local XP display. Keyed on `citizenship_earned_at` (not `is_citizen` — the paid grant sets that too). Known accepted residual (owner ruling 2026-08-23): under-counts a grant first observed on a fresh device/cleared storage. The old "over-counts a paid citizen later crossing the XP threshold" residual is gone with the dormant event; a verified read carries paid state, so S3b can rule that case out. Gated behind `CITIZENSHIP_CARD_ENABLED` (the only caller is the citizenship card's profile load) |
| `CITIZENSHIP_TENURE_GRANT_CLAIMED`      | `Citizenship:TenureGrant:Claimed`                            | The profile server **granted** the one-time tenure XP grant — `POST /v1/profile/tenure-grant` answered 200 `granted` (task 0253; ADR-112 as amended 2026-09-15). Never before the server answer. **Value:** the XP awarded (3–50). Fires from `maybeClaimTenureGrant()` (`src/client/TenureGrantClaim.ts`); the thank-you modal opens right after, from the citizenship card — or once the player is back on the start screen, never over a lobby or match; a match start closes it (task 0336)                                                                                                                                                                                                                                                                                                                                           |
| `CITIZENSHIP_TENURE_GRANT_REJECTED`     | `Citizenship:TenureGrant:Rejected:{BelowMinimum\|Duplicate}` | The server recorded the one-time check without granting; the suffix is added at the call site (the `MATCH_LEADERBOARD_AWARD` pattern). A closed list of two reasons (closes ADR-112 open question 3). `BelowMinimum` = fewer than 3 days, so a final 0-XP check was recorded. `Duplicate` = the player was already checked — in practice only two tabs racing. No modal for either                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `CITIZENSHIP_TENURE_GRANT_CLAIM_FAILED` | `Citizenship:TenureGrant:ClaimFailed`                        | A tenure-grant claim got no usable server answer: network error, 10 s timeout, any non-200 (a 404 while the route is not yet on the box, 400, 401 after the one re-login, 5xx), or a 200 body that does not parse. **Two cases.** If the failure came **before** the server recorded the check (no connection, a refusal, an error the server rolled back), nothing was written: the next page load's login still says `pending` and the claim is **retried**. If it came **after** the server committed (a timeout, a dropped connection, a gateway error or a 200 the client could not read), the check row exists and XP may have been granted: the next login says `done`, so there is **no retry and no popup**. A "ClaimFailed, never Claimed" player is therefore **not** necessarily ungranted — `player_xp_grants` is the record |
| `CITIZENSHIP_RESTART_PROMPT_SHOWN`      | `Citizenship:RestartPrompt:Shown`                            | The "restart to apply" popup actually appeared (task 0303) — after a server-confirmed citizenship purchase (`runCitizenshipPurchase()` returned `granted`), or after the player closed the tenure-gift thank-you popup when that gift made them a citizen. Fires when the popup is **shown**, not when it is only waiting: a grant made while in a lobby waits until the player is back on the start screen, and is dropped (no event) if the match starts first — the page reloads after the match anyway. At most once per page load — a popup that re-appears after a refused Restart (see `Restart`) does not log it again. **Never** fired by session-start reconciliation (decided in the 0303 plan). Behind the citizenship kill switch. **Not split by source:** gift-triggered count ≈ `Shown` − `Purchase:Completed:Citizenship` (approximate: a purchase whose waiting popup was dropped by a match start has a Completed but no Shown) |
| `CITIZENSHIP_RESTART_PROMPT_RESTART`    | `Citizenship:RestartPrompt:Restart`                          | The player tapped **Restart now** on that popup — fired right before the page reload (`reloadApp()`). Not fired if the reload is refused because the player is in a lobby or match. That is reachable only when the grant landed while a lobby join from the start screen was still setting up, so the popup appeared as the player entered the lobby; the popup then hides and re-appears when the player is back on the start screen (or is dropped if the match starts first) — no `Shown` is logged again (0303 review R3). Separate from the login restart funnel (`Profile:Login:Restart:*`) on purpose |
| `CITIZENSHIP_RESTART_PROMPT_LATER`      | `Citizenship:RestartPrompt:Later`                            | The player tapped **Later** — the only way to dismiss the popup (no outside-click or Esc close). The popup is not offered again that page load; everything catches up at the next match end (which reloads) or the next launch. The pre-match close of the popup logs nothing |

> **Counting the tenure-grant events (task 0253): use UNIQUE USERS, not event counts.** `ClaimFailed`
> fires **once per page load** until the check lands, so one player can fire it many times.
> `Claimed` and `Rejected:*` fire at most once per player — the server row is the one-time marker,
> and a later login says `done` so no claim is sent — **unless two tabs race**, which can produce one
> `Claimed` plus one `Rejected:Duplicate`. The claim runs only after a successful `POST /v1/login`
> that reports `grantChecks.tenure = pending`, so guests, degraded boots and failed logins fire none
> of them. All three are gated behind `CITIZENSHIP_CARD_ENABLED` **and** the `citizenship_ui` flag
> (the task 0236 combined gate), so none can fire before `0065` flips the card.

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

### Locked Feature Events

A citizen perk shown **locked** to a non-citizen (task `0302`). One event per tap on the locked control.

| Enum Key / Id                                                   | Event String                   | When Fired                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LOCKED_FEATURE_TAP_FIRST_PART` + `lockedFeatureIds.privateLobby` | `LockedFeature:Tap:PrivateLobby` | Player taps the **locked** "Create Lobby" button on the Multiplayer tab. The button is locked for anything but a confirmed citizen — guest, non-citizen, profile still loading or unreadable. Fires before the "citizens only" popup opens (the popup itself does nothing while the citizenship kill switch is off). Never fires for a citizen, and never while the row is hidden (the `private_lobbies` switch off, or citizenship surfaces off) |

> **Convention:** `LockedFeature:Tap:{FeatureId}`. Prefix `flashistConstants.analyticEvents.LOCKED_FEATURE_TAP_FIRST_PART`; ids in
> `flashistConstants.lockedFeatureIds` (PascalCase). Fire only through `onLockedFeatureTap(featureId)` in
> `src/client/LockedFeature.ts`, which `FlashistFacade.logLockedFeatureTapEvent()` backs. Later perks add their own id. The
> "explainer opened" event belongs to task `0301`.

### Profile Session Events

The client's login session against the profile backend (task `0273`, S4; ADR-113). One
`POST /v1/login` per logged-in page load, fired from `src/client/ProfileSession.ts`.

⚠️ **Unlike the citizenship events above, these are NOT gated by
`CITIZENSHIP_CARD_ENABLED`.** The login runs on every logged-in page load regardless of that
flag, so these six are the FIRST profile events that will fire for real players — from the S4
game deploy onward, with the citizenship card still hidden. Nothing about them is
player-visible.

| Enum Key                           | Event String                       | When Fired                                                                                                                                                                                     |
| ---------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PROFILE_LOGIN_SUCCEEDED`          | `Profile:Login:Succeeded`          | `POST /v1/login` returned 200 with a token that parsed. Once per page load per account. Never fired for a guest, for a player with no Yandex id, or when `profileApiUrl` is empty / unreadable |
| `PROFILE_LOGIN_CREATED`            | `Profile:Login:Created`            | **In addition to** Succeeded, when the server reports `created: true` — the login created the player row. The closest thing to a "new profile" counter                                         |
| `PROFILE_LOGIN_FAILED_TIMEOUT`     | `Profile:Login:Failed:Timeout`     | The login did not answer within 5 s and was aborted                                                                                                                                            |
| `PROFILE_LOGIN_FAILED_UNAVAILABLE` | `Profile:Login:Failed:Unavailable` | The server answered **503** — today `session_unavailable` (no usable `PROFILE_SESSION_SECRET`), later also S5's `creation_paused`. The client cannot tell them apart and does not try          |
| `PROFILE_LOGIN_FAILED_ERROR`       | `Profile:Login:Failed:Error`       | Network failure, any other non-2xx, or a 200 body that failed the schema                                                                                                                       |
| `PROFILE_SESSION_RELOGIN`          | `Profile:Session:Relogin`          | A held token was rejected with 401 (expired past its 24 h TTL, or the box's session secret changed) and a fresh login was started for it. The request is retried once with the new token       |

> **⚠️ A failed login is final for that page load (owner ruling D3, 2026-09-16).** Exactly one
> `Failed:*` event fires per load: the session latches and never retries, so a second
> `Failed:*` in the same load is impossible. Read the ratio of `Failed:*` to
> `Player:YandexLoggedIn` as the share of logged-in loads that got **no profile at all** — not
> as a retry-adjusted error rate. `Profile:Session:Relogin` is **not** a retry of a failed
> login; it only ever follows a token that had worked.

### Profile Login Signature Events

Yandex signed player data for the profile login (task `0325`, S2 — shadow mode; owner rulings
D1 + D2, 2026-09-29). Each login asks the facade once for `getPlayer({ signed: true })`'s
signature (`takeYandexPlayerSignature()` in `src/client/flashist/FlashistFacade.ts`) and sends
it with `POST /v1/login`. The server only **counts** what it proves for now (server metric
`geoconflict.profile.login.verification`, not in this doc).

- **At most one of these four per take.** A take happens once per login — so once per page load,
  plus once per `Profile:Session:Relogin`.
- **Guests fire none**, and neither does a load with no SDK.
- **Not gated by `CITIZENSHIP_CARD_ENABLED`**, like the session events above.
- ⛔ They carry nothing but their name, plus a wait in ms on `Waited` / `Timeout`. **Never the
  signature.**
- **No wait limit on a slow answer (owner ruling D1).** Only a call still silent 60 s after login
  asked counts as failed. That is `Timeout`, the event that sizes the hang problem. A real
  failure falls back at once. In every non-`Ready`/`Waited` case the login is still sent, just
  without a signature, so it is unverified. It is never refused.

| Enum Key                          | Event String                      | When Fired                                                                                                                                                                                 |
| --------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PROFILE_LOGIN_SIGNATURE_READY`   | `Profile:Login:Signature:Ready`   | The boot pre-fetch (started right after the plain `getPlayer()`) had already finished when login asked, and was at most 300 s old (held exactly 300 s still counts). No wait at all                                             |
| `PROFILE_LOGIN_SIGNATURE_WAITED`  | `Profile:Login:Signature:Waited`  | Login waited for the signed call and it answered with a usable signature. **Value:** ms waited, counted from when login asked. A relogin, a held signature over 300 s old, and a degraded boot that recovered late all make a fresh call, so they land here |
| `PROFILE_LOGIN_SIGNATURE_TIMEOUT` | `Profile:Login:Signature:Timeout` | The 60 s hang safety net fired: the signed call never answered. **Value:** ms waited (≈ 60 000 by construction; the count is what matters). The late answer, if any, is thrown away |
| `PROFILE_LOGIN_SIGNATURE_FAILED`  | `Profile:Login:Signature:Failed`  | The signed call threw, returned no string, or returned an empty or over-long one (over `SIGNATURE_MAX` = 2932, which the server would refuse with 400). If the boot pre-fetch had already failed, fires when login asks; otherwise fires when the failed answer comes back while login waits |

> **Reading them.** `Timeout` ÷ (all four) is the share of logged-in logins lost to a hung signed
> call. `Waited`'s value spread shows how long the call really takes on slow connections. Before
> this task's S3a gate, compare the sum of `Timeout` + `Failed` with the server's `absent` count.
> Their difference is roughly the old client bundles still in circulation.

### Profile Login Restart Events

The restart after an in-page login (task `0273`, owner ruling D3). The citizenship card's
guest CTA is the only surface that can open the Yandex auth dialog, and a login that happens
mid-load leaves the page with no session token — so the page is reloaded and the whole start
sequence runs again with the player logged in. `src/client/GameRestart.ts`.

⚠️ **Gated by `CITIZENSHIP_CARD_ENABLED: false`** — the login button does not exist anywhere
today, dev included, so none of these can fire until the `0054` launch flip.

| Enum Key                                      | Event String                                 | When Fired                                                                                                                                                               |
| --------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PROFILE_LOGIN_RESTART_REQUESTED`             | `Profile:Login:Restart:Requested`            | The player tapped the card's login button and the Yandex auth dialog reported success. Exactly one of the four outcomes below follows                                    |
| `PROFILE_LOGIN_RESTART_PERFORMED`             | `Profile:Login:Restart:Performed`            | The page is being reloaded (`window.location.reload()`, whole url kept)                                                                                                  |
| `PROFILE_LOGIN_RESTART_CANCELLED`             | `Profile:Login:Restart:Cancelled`            | The dialog did NOT report success — closed, failed, or no SDK. No reload; the card stays guest. Fires _instead of_ Requested, not after it                               |
| `PROFILE_LOGIN_RESTART_SUPPRESSED_IN_MATCH`   | `Profile:Login:Restart:Suppressed:InMatch`   | A match was running, so the reload was refused. The card re-reads its profile instead. Expected to be ~0: the match canvas covers the card, so the button is unreachable |
| `PROFILE_LOGIN_RESTART_SUPPRESSED_LATCHED`    | `Profile:Login:Restart:Suppressed:Latched`   | This page load already restarted once — the sessionStorage latch is set. The card re-reads its profile instead                                                           |
| `PROFILE_LOGIN_RESTART_SUPPRESSED_NO_STORAGE` | `Profile:Login:Restart:Suppressed:NoStorage` | `sessionStorage` is missing or threw, so the once-per-load cap cannot be enforced and no reload happens. Private mode / iframe storage policy. The card re-reads instead |

> **Reading these:** `Requested` = `Performed` + `Suppressed:InMatch` + `Suppressed:Latched` +
> `Suppressed:NoStorage`.
> A rising `Suppressed:Latched` means players are pressing login again on a page that reloaded
> and still shows them as a guest — i.e. the login is not sticking, which is worth
> investigating, not a bug in the latch.
> `Suppressed:NoStorage` is the size of the population that can never get the restart at all;
> for them the login button behaves exactly as it did before S4 (a profile re-read only).

> ⚠️ **`Suppressed:NoStorage` is a deliberate, owner-approved deviation from the approved plan
> §3.6, which named five restart events** (owner ruling, 2026-09-16, review round 1 finding R4).
> Added because `0274` (S5) builds monitoring on these events, and the two storage-less paths
> otherwise fired a `Requested` with **no** outcome event at all — unexplainable on a dashboard,
> and hiding exactly the population most likely to be affected.

### Performance Events

Sampled every 300 seconds during active gameplay via a `setInterval` independent of the render loop
(`SAMPLE_INTERVAL_MS`, `src/client/PerformanceMonitor.ts`). Raised from 60 s on 2026-09-06 (task
`0224`) to stay under GameAnalytics' 500-events-per-user-per-day limit.

⚠️ **The monitor is match-scoped, not page-scoped** — it starts at game start and stops on
win/leave/unload. The first sample therefore lands 300 s _after the match begins_, so **any match
shorter than 5 minutes now emits no `Performance:*` events at all.** Expect the realised drop to be
**more than 5×**, not exactly 5×; that is the design, not an anomaly.

⚠️ **Samples are only computed over a continuously-visible window.** Hiding the tab suspends
`requestAnimationFrame`, so the sampling window is restarted on every `visibilitychange`. A sample
that would have spanned a hidden period is not emitted with a stale window.

| Enum Key                    | Event String                | When Fired                                                                                         |
| --------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------- |
| `PERFORMANCE_FPS_AVERAGE`   | `Performance:FPSAverage`    | Current average FPS value (will be passed into the analytic event as the value parameter)          |
| `PERFORMANCE_FPS_ABOVE30`   | `Performance:FPS:Above30`   | Current FPS ≥ 30                                                                                   |
| `PERFORMANCE_FPS_15TO30`    | `Performance:FPS:15to30`    | Current FPS between 15 and 30                                                                      |
| `PERFORMANCE_FPS_BELOW15`   | `Performance:FPS:Below15`   | Current FPS < 15 — crash risk zone                                                                 |
| `PERFORMANCE_MEMORY_HIGH`   | `Performance:Memory:High`   | Heap **usage** above 80% of the limit — heavily constrained, crash risk (Chrome only, best-effort) |
| `PERFORMANCE_MEMORY_MEDIUM` | `Performance:Memory:Medium` | Heap **usage** between 50% and 80% of the limit — moderate pressure                                |
| `PERFORMANCE_MEMORY_LOW`    | `Performance:Memory:Low`    | Heap **usage** at or below 50% of the limit — healthy                                              |

🚨 **`High` and `Low` describe heap USAGE, not headroom — `High` is the bad one.** The three rows
above were **inverted in this document until 2026-09-06** (task `0224`): `High` was described as
"healthy" and `Low` as "heavily constrained — crash risk", which is the exact opposite of what the
code emits. The code is the source of truth (`src/client/PerformanceMonitor.ts`: `ratio =
usedJSHeapSize / jsHeapSizeLimit`; `> 0.8` → `High`, `> 0.5` → `Medium`, else → `Low`).

**Historical data is unaffected** — the emitted event names always meant what the code says; only
this document's gloss was wrong. If you previously read a rise in `Performance:Memory:High` as good
news, re-read it: it is memory pressure.

### Build Version Events

| Enum Key               | Event String          | When Fired                                                                                                                                                                                                             |
| ---------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BUILD_STALE_DETECTED` | `Build:StaleDetected` | Client is running an older build than the server. Fired at most once per session. **Value:** minutes since page load (integer). `0` = detected on startup (CDN/cache issue). `>0` = detected mid-session (zombie tab). |

### Worker Initialization Events

Fired once per game session attempt, before gameplay starts.

| Enum Key              | Event String         | When Fired                                                              |
| --------------------- | -------------------- | ----------------------------------------------------------------------- |
| `WORKER_INIT_SUCCESS` | `Worker:InitSuccess` | Web Worker initialized successfully; game will start                    |
| `WORKER_INIT_FAILED`  | `Worker:InitFailed`  | Worker construction or initialization failed; error modal shown to user. Not logged when the player had already left the join (task 0035). |
| `WORKER_INIT_FAILED_CAUSE_FIRST_PART` | `Worker:InitFailedCause:{Cause}` | Fires right after `Worker:InitFailed`, once per failure (task 0348). Not logged when the player had already left the join (task 0035). `{Cause}` is appended at the call site from a closed list: `Timeout` — the worker gave no answer within the 15 s start limit (`WORKER_INIT_TIMEOUT_MS`); `Crash` — anything else: the worker script failed to load, an error thrown straight away (worker `error` event), an async start failure reported by the worker (`init_failed` — e.g. the config fetch or the runner build; a map download only on the no-page-map fallback), or `new WorkerClient` itself throwing. **Value:** whole seconds from the worker start to the failure, so "crashed at once" reads apart from "crashed after a slow step" (e.g. a slow config fetch; a slow map download only on the no-page-map fallback). `Worker:InitFailed` count = failures, and the cause totals add up to it. ⚠️ **History:** before task 0348 an async start crash was only reported after the (then 5 s) limit, as a timeout, so older `Worker:InitFailed` data cannot be split into crash and timeout. |

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

**Flags in use that gate a feature (not an A/B test):** `citizenship_ui` (citizenship kill switch, task `0236`) and
`private_lobbies` (task `0302` — shows the private-lobby row; value `enabled` → `Experiment:private_lobbies:enabled`). The raw flag
name carries an underscore; that is the Yandex key, not an event-naming exception. `private_lobbies` may be enabled only for
testers via the Yandex **client feature** `tester=1`, which the page sends to `getFlags()` only when `localStorage`
`geoconflict_tester` is `"1"` — so its cohort event can be tester-only.

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

### Ad Events

Tier-free impression baseline (task 0020).

| Enum Key          | Event String      | When Fired                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AD_INTERSTITIAL` | `Ad:Interstitial` | A Yandex fullscreen (interstitial) ad was really shown: fired from `FlashistFacade.showInterstitial()` when the SDK's `onClose` reports `wasShown === true` (strict — a non-boolean value does not count). Once per show, even if the SDK calls `onClose` twice. **Not** fired per attempt, on `onError`, when `showFullscreenAdv` throws, when the SDK is missing, or when the SDK declines (`wasShown=false`, e.g. its own frequency cap). Under-counts an ad left by closing the tab mid-ad (no `onClose`) — never over-counts. No value. Dev/staging builds only log it to the console |

> **Tiered events are task `0299`:** the tiered `Ad:Interstitial:{Guest,Free,EarnedCitizen,PaidCitizen}`
> events need a synchronous player tier at ad time, which the client does not have (earned needs the
> `0273` client deployed plus a profile read and cache; paid needs `0250`).
>
> **Banner events are dropped, not deferred** (owner ruling 2026-09-24, task 0020): `Ad:Banner*` is not
> observable from our code — it never shows a banner (Fuse is commented out, `GutterAds` returns inside
> the iframe, nothing calls `showBannerAdv`), so there is no impression point to hook.

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
