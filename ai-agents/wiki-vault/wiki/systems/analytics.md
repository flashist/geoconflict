# Analytics System

**Layer**: client
**Key files**: `src/client/Bootstrap.ts`, `src/client/flashist/FlashistFacade.ts`, `src/client/SignatureAgeAnalytics.ts`, `src/client/StartScreenTabs.ts`, `src/client/CitizenshipCard.ts`, `ai-agents/knowledge-base/analytics-event-reference.md`, `ai-agents/knowledge-base/mentor-monetization-analytics-spec.md`

> 🆕 **2026-10-07 sync (`077c9e3`) — 16 NEW STRINGS for the 23 h refresh popup (task `0404`), committed, NOT
> deployed:** six `Session:LongSessionRefresh:{Due|Shown|Refresh|Waited|DeferredByDialog|PreemptedByStaleBuild}` and a
> new `AfterRefreshPopup` boot kind for the ten `Profile:Login:SignatureAge:*` labels (A1's `<BootKind>` is now
> three-way). See *Long-Session Refresh Events* below and [[tasks/long-session-refresh-popup]].
>
> 🆕 **2026-10-06 sync (`31bfb06`) — FIVE MORE STRINGS for the citizenship explainer popup (task `0301`), committed
> `fc3f539`, NOT deployed:** `Citizenship:Explainer:Opened:{CardLink|Instructions|LockedFeature:PrivateLobby}` and the
> popup tap ids `UI:Tap:PurchaseCitizenshipExplainer` / `UI:Tap:CitizenshipLoginExplainer`. The reference doc also
> **closes the 0021-era accepted cost** "no researched-but-didn't-buy signal": opening the explainer is now that signal
> (`UI:Tap:CitizenshipLearnMore` stays dropped). See *Citizenship Explainer Events* below and
> [[tasks/citizenship-explainer-popup]].
>
> 🆕 **2026-10-06 sync (`036a5c8`) — FOUR NEW EVENTS, all committed, none deployed:**
> - **`Ad:InterstitialSuppressed:PaidCitizen`** (task `0248`, commit `91eb99a`) — one per interstitial **request** the
>   paid-citizen gate suppressed. ⚠️ Counts requests, not ads shown: some would have been declined by Yandex's own cap
>   anyway, so read it as an **upper bound** on impressions given up. `Ad:Interstitial` now also does not fire for a
>   suppressed request. See *Ad Events* below and [[tasks/paid-citizen-ad-free]].
> - **`Citizenship:Status:{Unverified|ReadFailed|Restart}`** (task `0397`, commit `036a5c8`) — the citizenship card's
>   new verification line. See *Citizenship Status Line Events* below and [[tasks/session-verified-status-line]].
>
> 🆕 **2026-10-06 sync (`6f4ab77`) — three reference-doc changes, no event added or renamed:**
> - **§A1 (`Profile:Login:SignatureAge:*`) reworded for `0391`** (deployed 2026-10-06): the server window is now 24 h,
>   but the **client labels stay frozen on `0366`'s 900 s edges** — `Fresh` is "the pre-ADR-121 15-min window, not the
>   server's `ok`", only the future side is still parity-tested, and the "~32 % `stale`" comparison holds **for data
>   before the `0391` deploy only** (expected after: ≈ 2.5 %). See [[tasks/login-signature-24h-window]].
> - **`Citizenship:Earned:XP`:** dormant until the `0250` S3b client **and** profile server are both live; from S3b it
>   fires on **verified** reads only, and not for a paid citizen who crosses 100 XP (bought at or before earning). S3b is
>   built, **not deployed** — [[tasks/authenticated-profile-read]].
> - **Private-lobby flag:** `private_lobbies_all` replaces `private_lobbies` (`0354`, not deployed); testers see the row by
>   the `geoconflict_tester` browser marker, not a flag; a leftover `private_lobbies` value still fires an
>   `Experiment:private_lobbies:*` event that gates nothing. `LockedFeature:Tap:PrivateLobby` reworded to match —
>   [[tasks/private-lobby-tester-default]].
>
> 🆕 **2026-10-02 — 24 new profile-login diagnostic events (task `0372`)**: `Profile:Login:SignatureAge:*` (20) and
> `Profile:Login:Signature:Refetch:*` (4), plus a held-ms value on `Profile:Login:Signature:Ready`. Committed in
> `0c9a620`, **not deployed** (targets the 2026-10-03/04 game deploy). See *Profile Login Signature Age Events* below
> and [[tasks/stale-login-client-diagnostics]].
>
> 🆕 **2026-09-26 — the citizenship and inbox events CAN NOW FIRE in production.** `CITIZENSHIP_CARD_ENABLED`
> is `true` since release `0.0.154` ([[tasks/citizenship-go-live]]); the *"zero citizenship events have ever
> fired"* and *"gated by `false`"* statements below are the pre-launch record. What is known: **one real
> `Citizenship:Earned:XP`** was sent from the owner's own account during `0296` A6
> ([[tasks/after-deploy-production-checks]]). ⚠️ **The paid funnel (`UI:Tap:PurchaseCitizenship`,
> `Purchase:Started` / `Completed:Citizenship`) has NOT yet been checked live** — owed in `0297`.

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
| `Performance` | FPS and memory sampled every **300 s** during gameplay (raised from 60 s by task `0224`, 2026-09-06 — ⛔ **committed in `35afc64`, NOT deployed** as of 2026-09-07) |
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

`Session:PlatformInitTimeout` fires when a blocking platform-init stage exceeds the shared 5-second deadline and the app continues in degraded mode. Degraded mode uses default flags, localStorage username fallback, browser language, and no ads. **It fires at most once per boot (latched):** a stage-1 and a stage-2 deadline on the same boot log **one** event. *(Corrected 2026-09-28 by task `0328`: the reference doc used to say "at most once per stage", which the code never did.)*

### Platform degraded, recovered and loader-retry events (tasks `0328`, `0330` — built 2026-09-28, not yet released)

Added to measure how often the Yandex platform boots degraded, why, and whether the boot followed a match exit ([[tasks/citizenship-card-vanishes-investigation]]). Definitions of record: `ai-agents/knowledge-base/analytics-event-reference.md`.

| Event | When | Value |
|---|---|---|
| `Session:PlatformDegraded:{Cause}` (enum `SESSION_PLATFORM_DEGRADED_FIRST_PART`) | At most **once per page load**, Yandex template only, at the game-init gate after awaiting the same flags load the card awaits, when SDK, player or flags are missing. Causes, **first match wins**: `ScriptFailed` · `ScriptTimeout` · `InitFailed` · `InitTimeout` · `NoSdk` · `NoPlayer` · `NoFlags`. Not fired on a healthy boot or the standalone page | `1` if this load follows a match exit (a `sessionStorage` marker written by `changeHref(rootPathname)`, consumed on every boot), else `0` — count = degraded loads, sum = degraded loads after a match. `reloadApp()` is not a match exit |
| `Session:PlatformRecovered` | At most once per page load, when the degraded event already fired **with the flags missing** and the flags then arrived late. Since `0330` it can also follow `ScriptFailed` (a loader retry that succeeds after the deadline) | same 0/1 after-match value |
| `Session:SdkLoaderRetry:{Recovered\|RecoveredLate\|GaveUp}` (enum `SESSION_SDK_LOADER_RETRY_FIRST_PART`) | At most once per page load, only when the **first** loader download failed. `Recovered` = a retry loaded it before the 5 s deadline (no `ScriptFailed` then); `RecoveredLate` = after the deadline; `GaveUp` = every retry failed | number of re-downloads (1–5; `0` only for a missing loader tag) |

> ⚠️ **`Session:PlatformDegraded:*` is NOT a count of hidden citizenship cards.** The card hides only when the **flags** are missing; `NoPlayer`, and a timeout whose flags arrived before the check, fire with the card shown (task `0328` review R1).
>
> ⚠️ **`Session:SdkLoaderRetry` outcomes undercount failures, and the save rate reads HIGH.** `GaveUp` fires only after the last background retry, about 67 s after the first failure; a page closed earlier sends no outcome at all. And `Recovered` / `RecoveredLate` count **loader downloads, not platform recovery** — `YaGames.init()` can still fail after either.
>
> Since `0330`, `Player:YandexUnknown`'s 1-second window starts once the loader has actually loaded (including after a retry). For a degraded boot's cause, read `Session:PlatformDegraded:*`, not `Player:YandexUnknown`, which remains only an upper bound. See [[tasks/platform-degraded-analytics-event]] and [[tasks/sdk-loader-download-retry]].

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

## Win Condition & Leaderboard Award Events (task `0208` — LIVE since build `0.0.141`)

Two event families shipped together in commit `6b30e22` and are **emitting in production**. Full spec:
`ai-agents/knowledge-base/analytics-event-reference.md` (*Win Condition Events*, *Leaderboard Award
Events*). Task detail and the production read: [[tasks/measure-clientless-leader-and-solo-awards]].

| Enum key | Event string | Fires |
|---|---|---|
| `MATCH_WIN_CONDITION` | `Match:WinCondition:{FfaPublic\|FfaPrivate\|TeamPublic\|TeamPrivate}:{Threshold\|Timer}:<leader>` | Once per **client-match**, the first time the win condition is met. **Value:** integer percent of non-fallout land the leader held. Fires for **every** leader, whether or not a winner is then declared |
| `MATCH_LEADERBOARD_AWARD` | `Match:Leaderboard:Award:{Participation\|PlacementWon\|PlacementLost}:{Solo\|SoloTutorial}` | A **Singleplayer** match reports points to the platform leaderboard. **Value:** points the attempt carried — 1 participation, 10/5/2 placement |

**Leader leaves are two DISJOINT sets, not a cross-product.** FFA emits `Bot|Nation|AiPlayer|Human`;
Team emits `BotTeam|NationsTeam|HumanTeam`. ⇒ **21 reachable `Match:WinCondition` ids, not 56** (28
grammatical, minus the seven `…Public:…:Timer` ids that public lobbies can never produce).
**5 of 6 `Match:Leaderboard:Award` ids are reachable** — `…:PlacementLost:SoloTutorial` cannot
currently fire. ⚠️ **Build dashboards from the reachable set** — a panel per grammatical leaf shows
permanently-empty series, which reads as telemetry loss.

**Emitted at the DECISION POINT, above the clientless guard**, so the counter survives `0205` / `0211`
removing that guard — it simply changes meaning. **`Match:WinCondition` carries its own denominator**
(the leader leaf covers every leader), so the clientless rate needs no cross-event join.
**Singleplayer, missions and tutorials emit no `Match:WinCondition`; multiplayer emits no
`Match:Leaderboard:Award`** — both deliberate.

### 🔴 Two caveats that travel with every figure these events produce

1. **`Match:WinCondition`'s denominator is CLIENT-MATCHES, not matches.** The server never simulates,
   so every connected client emits its own copy; the multiplier varies with lobby size and with how
   many clients stayed. ⛔ **Absolute counts are uninterpretable — read only the ratio** against
   `Game:Mode:Multiplayer`, which is already per-client-match. A single elected emitter was
   deliberately **not** used: a clientless leader leads *because* humans died or left, so any election
   picks the client most likely to be gone. **Read every rate as a LOWER BOUND.**
2. **`Match:Leaderboard:Award` counts ATTEMPTS, platform failures included.** The event fires after the
   platform call settles, **whatever it returned, including a rejection**. ⛔ **A rise is not evidence
   any player's leaderboard score moved.** *(Its denominator IS matches — Singleplayer has one client,
   and both call sites are latched once per `ClientGameRunner`. ⛔ **Do not copy caveat 1 onto it.**)*

### 📊 The production read — 4–10 September 2026, full days, read 2026-09-11

⚠️ **Provenance: the GameAnalytics dashboard in the owner's browser, read by the lead session — NOT
reproducible from the repository. Figures as the dashboard rounds them, APPROXIMATE.**

- **`Match:WinCondition`: 6.86K client-matches.** `Threshold` **100 %**; the **timer branch fired zero
  times** — ⚠️ **expected** (public lobbies hardcode `maxTimerValue` `undefined`, and there were **zero
  private-lobby events**), and ⛔ **it must NOT be read as "matches never run out of time"**: three
  termination paths (the 3-hour `maxGameDuration` kill, an all-clients-left stalled match, and a match
  where no leader survives to cross) **emit nothing and are genuinely unmeasured.**
  Clientless-in-front: **FFA ~1.6 % · Team ~53.2 %** (of which **~52.4 %** is the stall-capable all-bot
  team) **· overall ~29.1 %**. `AiPlayer` **89 firings** — these carry a real `clientID` and may
  legitimately win under ADR-110.
  ⛔ ***"52 % of Team matches stalled" is NOT a supported claim*** — a firing records who was **first
  past the post**, not how the match ended. **The defensible sentence, verbatim:** *"in 52 % of
  measured Team-mode client-matches that reached the win condition, the leader at that moment was the
  all-bot team, and no winner could be declared at that moment."*
- **`Match:Leaderboard:Award`: 79.11K award ATTEMPTS** — `Solo` **65.45K** · `SoloTutorial` **13.66K**;
  by kind `Participation` **62.29K** · `PlacementWon` **14.28K** · `PlacementLost` **2.53K**.
  **Non-tutorial match count: `Solo` `Participation` 49.64K, ~7.1K/day.**
- 🔴 **A forbidden shortcut, proved wrong by the cross-tab:** applying the blended **82.7 % `Solo`
  share** to the 62.29K gives **~51.5K** against an actual **49.64K**, because the share is **not
  uniform across award kinds** — **79.7 % / 93 % / 100 %**. ⛔ **Do not multiply a blended marginal
  share into a sub-population unless the share is known to be uniform across it.**
- ✅ **`PlacementLost` was IDENTICAL in both columns (2.53K)** ⇒ the `SoloTutorial` contribution is
  **exactly zero**, **confirming in production data** a prediction previously derived **only from
  reading the code**. ⚠️ **It confirms the zero is real TODAY; it does not make it permanent and does
  not license deleting the leaf.**

⛔ **`0208` closed `(agent-closed — not owner-verified)` and is NOT fully verified** — `V16` (no
emission while watching a replay) and `V17` (exactly one event per path per match) **close UNTESTED**,
argued from source only. 🔴 **The per-match stall rate will NEVER be known** — owner ruling of
2026-09-11 (option B): no server-side counter, and the pre-fix denominator disappears the moment `0211`
ships.

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

The start-screen redesign adds menu-tab and citizenship-surface instrumentation. `UI:Tap:MultiplayerTab` and `UI:Tap:SingleplayerTab` fire on explicit tab taps, including re-taps of the active tab; restoring a persisted tab on load does not fire. `Citizenship:Seen` fires once per page load when the citizenship card is visible, and `UI:Tap:CitizenshipLoginToEarn` tracks the Yandex login CTA. See [[tasks/start-screen-redesign-implementation]]. Since task 0054 the card is hidden behind a default-OFF client flag, so **no citizenship surface events fire in production** until the flag flips ON at citizenship launch; see [[tasks/hide-citizenship-card-flag]].

## Worker Start & Reconnect Events (tasks `0347`, `0348`, `0035` — built 2026-09-30, committed `9cb8ee4`, not yet released)

Source: `ai-agents/knowledge-base/analytics-event-reference.md` § *Worker Initialization Events* and
§ *Reconnection Events*, as changed in the 2026-09-30 sync window.

| Event | What changed |
|---|---|
| `Worker:InitFailedCause:{Timeout\|Crash}` | 🆕 `0348`. Fires right after `Worker:InitFailed`, once per failure; the cause totals add up to `Worker:InitFailed`. `Timeout` = no answer within the **15 s** start limit (`WORKER_INIT_TIMEOUT_MS`, was 5 s); `Crash` = anything else (script failed to load, an error thrown at once, an async start failure the worker now reports as `init_failed`, `new WorkerClient` throwing). **Value:** whole seconds from the worker start to the failure. ⚠️ **Older `Worker:InitFailed` data cannot be split** — before `0348` an async crash was reported as a timeout after 5 s. |
| `Worker:InitFailed` and `…Cause:*` | `0035`: **not logged when the player had already left the join** (nor the popup or the Uptrace line). A `Crash` from a map download now happens only on the no-page-map fallback. |
| `Reconnect:*` (no event added or changed) | `0347`: the Rejoin prompt can now also follow a **failed match start**. ⚠️ `Reconnect:Succeeded` does not prove the player got back in — `Worker:InitFailed` can follow it. ⚠️ **Owner-accepted (Q2):** a rejoin-after-failed-start match emits **no `Game:Start`**, `Game:End` fires more than once (first with `Game:Abandon`), and `Match:Duration` / `Match:Spawned` do not fire. ⚠️ **Owner-accepted (Q1):** a rejoin after the ~20 s spawn phase lands as a spectator. |

See [[tasks/rejoin-after-failed-match-start]], [[tasks/worker-start-failure-reporting]],
[[tasks/worker-reuses-page-map]]. The `0348` Uptrace warning (`Worker init failed (<cause>): <reason>`) was
checked only at a local fake sink.

## Citizenship Funnel Events (built 2026-08-24 — not yet live)

Tasks 0017 (earned) and 0018 (paid) shipped the citizenship funnel events on local/mock scope; all of them are gated behind the 0054 `CITIZENSHIP_CARD_ENABLED` flag (default OFF), so **none fire in production** until the flip-ON at launch.

> 🚨 **Stronger than "not yet live" — measured 2026-09-02 by task 0021: ZERO citizenship events have ever fired, anywhere.** `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` is `false` at `src/client/flashist/FlashistFacade.ts:182`, and `CitizenshipCard.connectedCallback()` checks it **first, before any analytics call or profile load** (`src/client/CitizenshipCard.ts:76-79` — it adds `hidden` and returns). **No collection window has opened, so none has closed and there is nothing to backfill.** Flipping that flag *is* the citizenship relaunch. See [[tasks/analytics-p1-citizenship-funnel]].

The five events below are the **complete** funnel. 🚫 **A sixth, `UI:Tap:CitizenshipLearnMore`, was DROPPED as obsolete on 2026-09-02 (owner ruling R2) — do not re-add it.** It was specified against a "Learn more" link that **was never designed and does not exist**: the shipped card has exactly three states (guest, authorized non-citizen, citizen) with no room for a fourth affordance, and a grep for `CitizenshipLearnMore` / `LEARN_MORE` / `learnMore` across `src/` and `tests/` returns nothing. **Accepted cost: the funnel has no "researched it but didn't buy" signal** — a player who considered citizenship and declined is indistinguishable from one who never engaged past the impression. If a Learn-more surface is ever designed, the event returns *with* it.

| Event | Owner | When |
|---|---|---|
| `UI:Tap:PurchaseCitizenship` | 0018 (constant registered in 0019) | Player taps "Buy Citizenship" on the card (State 2, non-citizen), before the purchase flow starts. **Naming supersession (corrected 2026-08-24):** replaces the `UI:Tap:CitizenshipBuy` string planned in the 0021 funnel spec — the analytics reference + the 0018 brief are authoritative |
| `Purchase:Started:Citizenship` | 0018 | The flow opens the Yandex payment frame — the last client-controlled moment. NOT fired when the flow dies earlier (no Yandex id, or the server `/intent` call fails): no Started and no Abandoned |
| `Purchase:Completed:Citizenship` | 0018 | The profile server confirmed the grant (`/v1/payments/yandex/complete` success) — never on the client `purchase()` callback alone. Fires before the best-effort `consumePurchase`; a failed consume does not un-fire it |
| `Purchase:Abandoned:Citizenship` | 0018 | A started flow ended without a Completed (frame closed, SDK rejected, no signature, or `/complete` failed). Exactly one of Completed/Abandoned per started flow. Known residual: a real payment whose `/complete` failed logs Abandoned even though next-session reconciliation later lands the grant |
| `Citizenship:Earned:XP` | 0017 | Once per account+device, on the first client observation of `citizenship_earned_at` set after a previous observation without it (fires from `loadPlayerProfileView()`, keyed on `citizenship_earned_at`, not `is_citizen`). Accepted residuals (owner ruling 2026-08-23): under-counts a grant first observed on a fresh device/cleared storage; over-counts a paid citizen later crossing the XP threshold |

An earlier task doc (`ai-agents/tasks/done/0191-citizenship-xp-progress-ui/brief.md`) mentioned a `UI:Tap:CitizenLoginCta` string — superseded by `UI:Tap:CitizenshipLoginToEarn`; the 0021 funnel spec is authoritative for that one.

The five surviving events live in **two** constant maps in `src/client/flashist/FlashistFacade.ts`, not one: `flashistConstants.analyticEvents` carries `CITIZENSHIP_SURFACE_SEEN` (`:118`), `CITIZENSHIP_EARNED_XP` (`:122`) and `PURCHASE_STARTED_CITIZENSHIP` / `PURCHASE_COMPLETED_CITIZENSHIP` / `PURCHASE_ABANDONED_CITIZENSHIP` (`:129-131`), while `flashistConstants.uiElementIds` carries `citizenshipLoginToEarn` (`:150`) and `purchaseCitizenship` (`:152`). Verified 2026-09-02.

> 🚨 **Known risk — `Citizenship:Seen` may UNDER-count, and the error direction matters. Logged 2026-09-02, owner ruling R3: NOT fixed, deliberately.**
>
> `maybeReportSeen()` runs exactly once, from `connectedCallback()` after `await this.updateComplete` (`src/client/CitizenshipCard.ts:114`, defined `:141-149`). If `isCardVisible()` is false at that one moment — the Yandex preload curtain still up, or a slow first paint on a low-end device — it returns without firing and is **never retried**: no observer, no re-check on a later render, so the impression is silently dropped for that page load. The module-scoped `citizenshipSeenReported` one-shot is correct for its purpose and is not the risk.
>
> **This UNDER-counts impressions, which INFLATES every downstream conversion rate.** Tap rate, purchase rate and earn rate all carry impressions in the denominator, so each reads **better than reality**. It cannot err the other way. **Treat citizenship conversion percentages as an upper bound until this is measured.**
>
> **Unproven** — a code-reading conclusion, not an observation. Settling it needs a real Yandex Games context (the preload curtain is exactly what local dev lacks), so it cannot be confirmed or ruled out before citizenship goes live. 📌 **The follow-up brief is deliberately UNFILED, owner-ruled at close**, waiting on the first live day of real `Citizenship:Seen` volume — a recorded non-filing, not a dropped thread. See [[tasks/analytics-p1-citizenship-funnel]].

## Personal Inbox Events (built 2026-08-26 — not yet live)

Task 0012 added four events for the citizens-only Personal tab inside the announcements popup. They sit behind the **same `CITIZENSHIP_CARD_ENABLED` gate** — while the card is unlaunched the inbox fetch never runs, so none of these can fire. The tab strip itself is rendered only when `GET /v1/messages` succeeded, i.e. the server confirmed the viewer is a citizen, so **guests and non-citizens never fire any of them**.

| Event | When |
|---|---|
| `Inbox:Opened` | A citizen selects the Personal tab. Fires on **every** selection of that tab, not just the first |
| `Inbox:LoadFailed` | The inbox fetch failed — network error, 5xx, 5 s timeout, or a body that fails schema validation. Once per failed load (initial load, bell-open refresh, post-reconcile refresh). **Not** fired on a `403`, which is the ordinary non-citizen / no-profile answer; not fired when the profile API is unconfigured; never for guests |
| `UI:Tap:AnnouncementsTabGlobal` | A citizen taps the Global tab. Fires on every tap, including re-taps on the already-active tab |
| `UI:Tap:AnnouncementsTabPersonal` | Same semantics as the Global tab tap; each tap **also** fires `Inbox:Opened` |

See [[features/announcements]] for the surface these attach to.

## Profile Session Events (task `0273`, S4 — built 2026-09-16)

The client's login session against the profile backend — one `POST /v1/login` per logged-in page load
(`src/client/ProfileSession.ts`). See [[decisions/adr-113-internal-player-id]] and
[[tasks/profile-identity-s2-login-and-session-token]].

> ⚠️ **Unlike every citizenship and inbox event above, these are NOT gated by `CITIZENSHIP_CARD_ENABLED`.**
> The login runs on every logged-in page load regardless of that flag, so **these six are the FIRST
> profile events that will fire for real players** — from the S4 game deploy onward, **with the
> citizenship card still hidden**. Nothing about them is player-visible.

| Event | When |
|---|---|
| `Profile:Login:Succeeded` | Login returned 200 with a token that parsed. Once per page load per account. **Never** for a guest, for a player with no Yandex id, or when the profile API URL is empty or unreadable |
| `Profile:Login:Created` | **In addition to** Succeeded, when the server reports `created: true`. The closest thing to a "new profile" counter |
| `Profile:Login:Failed:Timeout` | The login did not answer within 5 s and was aborted |
| `Profile:Login:Failed:Unavailable` | The server answered **503** — today `session_unavailable` (no usable session secret), later also S5's `creation_paused`. **The client cannot tell them apart and does not try** |
| `Profile:Login:Failed:Error` | Network failure, any other non-2xx, or a 200 body that failed the schema |
| `Profile:Session:Relogin` | A held token was rejected with 401 (expired past its 24 h TTL, or the box's session secret changed) and a fresh login was started. The request is retried once with the new token |

> ⚠️ **A failed login is FINAL for that page load** (owner ruling, 2026-09-16). **Exactly one `Failed:*`
> event fires per load** — the session latches and never retries, so a second `Failed:*` in one load is
> impossible. ⇒ **Read `Failed:*` over `Player:YandexLoggedIn` as the share of logged-in loads that got NO
> PROFILE AT ALL — not as a retry-adjusted error rate.** ⛔ **`Profile:Session:Relogin` is NOT a retry of a
> failed login**; it only ever follows a token that had worked.

## Profile Login Restart Events (task `0273` — built 2026-09-16)

The restart after an **in-page** login. The citizenship card's guest CTA is the only surface that can open
the Yandex auth dialog, and a login that happens mid-load leaves the page with no session token — so the
page is reloaded and the whole start sequence runs again with the player logged in (`GameRestart.ts`).

⚠️ **Gated by `CITIZENSHIP_CARD_ENABLED: false`** — the login button does not exist anywhere today, dev
included, **so none of these can fire until the `0054` launch flip.**

| Event | When |
|---|---|
| `Profile:Login:Restart:Requested` | The player tapped the card's login button and the Yandex dialog reported success. Exactly one of the four outcomes below follows |
| `Profile:Login:Restart:Performed` | The page is being reloaded (whole URL kept) |
| `Profile:Login:Restart:Cancelled` | The dialog did **not** report success — closed, failed, or no SDK. No reload. **Fires INSTEAD OF `Requested`, not after it** |
| `Profile:Login:Restart:Suppressed:InMatch` | A match was running, so the reload was refused. **Expected to be ~0** — the match canvas covers the card, so the button is unreachable |
| `Profile:Login:Restart:Suppressed:Latched` | This page load already restarted once (a `sessionStorage` latch). The card re-reads its profile instead |
| `Profile:Login:Restart:Suppressed:NoStorage` | `sessionStorage` is missing or threw, so the once-per-load cap cannot be enforced and no reload happens (private mode / iframe storage policy) |

**Reading these:** `Requested` = `Performed` + the three `Suppressed:*`.

- A rising **`Suppressed:Latched`** means players are pressing login again on a page that reloaded and
  **still shows them as a guest** — i.e. **the login is not sticking**, which is worth investigating and is
  **not a bug in the latch**.
- **`Suppressed:NoStorage` is the size of the population that can never get the restart at all** — for them
  the login button behaves exactly as it did before S4.

⚠️ **`Suppressed:NoStorage` is a deliberate, owner-approved deviation from the approved plan, which named
five restart events** (review round 1 finding). Added because S5's monitoring builds on these events, and
the two storage-less paths otherwise fired a `Requested` with **no outcome event at all** — unexplainable
on a dashboard, **and hiding exactly the population most likely to be affected**.

## Profile Login Signature Events (task `0325` S2 — built and deployed 2026-09-29)

Yandex signed player data for the profile login (owner rulings D1 + D2, 2026-09-29; see
[[decisions/adr-116-verified-login]]). Each login asks the facade once for the signature of
`getPlayer({ signed: true })` and sends it with `POST /v1/login`. The server only **counts** what it proves
for now, in its own metric `geoconflict.profile.login.verification` (Uptrace, not GameAnalytics).

- **At most one of these four per take** — once per page load, plus once per `Profile:Session:Relogin`.
- **Guests fire none**, and neither does a load with no SDK. **Not gated** by `CITIZENSHIP_CARD_ENABLED`.
- ⛔ They carry nothing but their name, plus a wait in ms on `Waited` / `Timeout` and (since task `0372`, A3) the ms
  held on `Ready`. **Never the signature.**
- 🆕 Task `0372` adds, on the same take, at most one `Profile:Login:SignatureAge:*` event and (first take of the page
  load only) at most one `Profile:Login:Signature:Refetch:*` event — see the next section. The Refetch events share
  this prefix but are **not** among the four: exclude them when counting takes.
- **No wait limit on a slow answer (D1)** — only a call still silent 60 s after login asked counts as failed.
  In every non-`Ready`/`Waited` case the login is still sent, unsigned, so it is unverified — never refused.

| Event | When |
|---|---|
| `Profile:Login:Signature:Ready` | The boot pre-fetch had already finished when login asked, and was at most 300 s old. No wait. **Value** (task `0372`, A3): ms held — `askedAt − fetchedAt` of the pre-fetch, 0–300 000; before the `0372` build it carried no value |
| `Profile:Login:Signature:Waited` | Login waited and got a usable signature. **Value:** ms waited. Relogins, a held signature over 300 s old, and a degraded boot that recovered late land here |
| `Profile:Login:Signature:Timeout` | The 60 s hang net fired. **Value:** ms waited (≈ 60 000 by construction; the count is what matters) |
| `Profile:Login:Signature:Failed` | The signed call threw, returned no string, or an empty or over-long one (over `SIGNATURE_MAX` = 2932) |

**Reading them:** `Timeout` ÷ (all four) is the share of logged-in logins lost to a hung signed call;
`Waited`'s values show how long the call really takes. Before the S3a gate (`0340`), compare `Timeout` +
`Failed` with the server's `absent` count — the difference is roughly the old bundles still in circulation.
⚠️ **Whether these events arrive in GameAnalytics was not reported** after the 2026-09-29 game deploy
([[systems/weekend-deploy-window]]); `0339` owns that check.
📌 **2026-10-01 — they arrive** (`0339`, [[tasks/verified-login-live-check]]): over 2026-09-29/30, `Ready` ≈ 8,390
(≈ 99.5 %), `Waited` 46 (mean 575 / ≈ 811 ms — **mean only**, GameAnalytics offered no percentile), `Timeout` 0,
`Failed` 0. ⚠️ GameAnalytics showed a *"Demo mode"* banner while read — the data has this project's own events, so it
reads as real; noted, not proven.

## Profile Login Signature Age Events (task `0372` — built 2026-10-02, committed `0c9a620`, NOT deployed)

Client diagnostics for the ~1 in 3 profile logins the server calls `stale` ([[tasks/stale-login-client-diagnostics]];
the reading is task `0373` on [[decisions/sprint-8]] — 📌 moved to Sprint 7, rank 36, on 2026-10-04). **Analytics only: login sends exactly the signature it sent
before, at the same moment.** Fired from `takeYandexPlayerSignature()` in `src/client/flashist/FlashistFacade.ts`;
pure helpers in `src/client/SignatureAgeAnalytics.ts`. ⚠️ Targets the 2026-10-03/04 game deploy; **not yet seen
arriving**.

**A1 — `Profile:Login:SignatureAge:<BootKind>:<Label>`** (20 strings, no value)

- Fires once on **every take that returns a signature** (`Ready` and `Waited` paths — boot login and every relogin),
  never on `Timeout` / `Failed`, never for a guest or with no SDK. Counting relogins keeps it comparable with the
  server's ~32 % `stale` share.
- `<BootKind>`: `AfterMatch` when this page load follows a match exit (`bootFollowsMatchExit`, the same flag as
  `Session:PlatformDegraded`, task `0328`), else `FirstBoot`.
  - 🆕 **2026-10-07 (task `0404`, committed `077c9e3`, not deployed):** a third kind, **`AfterRefreshPopup`** —
    when the boot follows a press of the long-session refresh popup (its own `sessionStorage` marker, read and removed
    on every boot); order `AfterMatch` → `AfterRefreshPopup` → `FirstBoot` (`AfterMatch` wins if both, which normal
    flow cannot produce). Ten more strings, `Profile:Login:SignatureAge:AfterRefreshPopup:<Label>`. **What it answers:**
    whether a refresh inside the same Yandex tab gets new signed data — `PastOver24h` there means the same old data, so
    that player came back **unverified**; `Past6h24h` or younger means inside ADR-121's 24 h window. Before the `0404`
    deploy such boots read as `FirstBoot`.
- `<Label>`: device now − `issuedAt`, bracketed with **exactly the server's edges** (task `0366`,
  [[tasks/stale-login-signature-age]]); a test sweeps every edge against the server's function.
- Five colon parts — the GameAnalytics maximum (each part ≤ 64 chars).
- ⚠️ **Device-clock caveat:** a wrong device clock lands in the far `Future*` / `Past*` labels and can mark stale a
  signature the server finds fresh. **Check first** that the client's non-`Fresh` share is close to the server's ~32 %.

| Client label | Server (`0366`) | Age = device now − `issuedAt` |
|---|---|---|
| `Fresh` | `ok` | at most 900 s old **and** at most 300 s ahead (both inclusive) |
| `Future5m15m` | `future_5m_15m` | 300 s < ahead ≤ 900 s |
| `FutureOver15m` | `future_over_15m` | ahead > 900 s |
| `Past15m20m` | `past_15m_20m` | 900 s < age ≤ 1 200 s |
| `Past20m30m` | `past_20m_30m` | ≤ 1 800 s |
| `Past30m1h` | `past_30m_1h` | ≤ 3 600 s |
| `Past1h6h` | `past_1h_6h` | ≤ 21 600 s |
| `Past6h24h` | `past_6h_24h` | ≤ 86 400 s |
| `PastOver24h` | `past_over_24h` | > 86 400 s |
| `Unreadable` | — (client only) | `issuedAt` could not be read (no dot, bad base64, not JSON, missing / non-finite, over `SIGNATURE_MAX`) |

**A2 — `Profile:Login:Signature:Refetch:<Result>`** (4 strings, no value) — does a second Yandex call return a newer
signature? Both `issuedAt` values come from Yandex, so **no clock is involved**.

- Only when A1's label is one of the six `Past*`; only on the **page load's first take** (never a relogin); **at most
  one extra `getPlayer({ signed: true })` per page load, never retried**; no cross-load cap (owner ruling 2026-10-02).
- **Login is not held up** — the call is started, not awaited; login sends the **original** signature (owner ruling
  2026-10-02); the second one is used only for the comparison and dropped.
- Exactly one event per comparison started — unless the player leaves the page before it answers (within the 60 s
  net), in which case nothing is counted.

| Event | When |
|---|---|
| `Profile:Login:Signature:Refetch:Newer` | The second `issuedAt` is strictly later |
| `Profile:Login:Signature:Refetch:Same` | Equal |
| `Profile:Login:Signature:Refetch:Older` | Strictly earlier — not expected; its own label (owner ruling Q1) so it never hides inside another |
| `Profile:Login:Signature:Refetch:Failed` | The call threw, returned no usable signature, one whose `issuedAt` is `Unreadable`, or stayed silent 60 s |

**Reading them (task `0373`):** `Newer` ≫ `Same` ⇒ a second call on the same page would fix stale logins; `Same`
dominant ⇒ it would not. ⚠️ `Same` cannot tell Yandex's servers reusing the signed data from the Yandex SDK caching
it in the page — either way a same-page refetch would not fix it. A2's sample can include wrong-clock loads, and A2
does not carry A1's label. ⚠️ **Yandex call limit** (20 player calls per 5 min, documented; whether `getPlayer`
counts is unclear): A2 adds at most one call per page load — if the limit bites, that call counts `Failed`, or a
later load's own call may fail instead. Bounded, not zero.

## Monetization Measurement Baseline

The Sprint 4 monetization analytics spec in [[tasks/monetization-analytics-spec]] defines the measurement gate before citizenship and payments decisions should be treated as validated:

- **P0 identity/session baseline:** record Yandex login status, platform, returning/new status, session depth, and all-time match-count inputs. Yandex login status is now covered by [[tasks/analytics-p0-yandex-login-status]], loyalty depth is covered by [[tasks/analytics-p0-player-days-played]], and per-session match count is covered by [[tasks/analytics-p0-session-match-count]].
- **P0 match lifecycle:** measure match start, player spawned, match completed, outcome, duration, spawn status, and all-time match count so the earned citizenship threshold is grounded in actual retention depth.
- **P1 citizenship funnel:** instrument citizenship surface impressions, CTA clicks, purchase flow start/completion/abandonment, earned citizenship, and high-intent unconverted cohorts. As of 2026-08-24 the funnel events are built (0017/0018 — see the Citizenship Funnel Events section) but fire nowhere in production until the 0054 flag flips ON. 🔧 **Task 0021 closed 2026-09-02 having measured the tree: five of the six spec'd events are shipped, unit-tested and documented, the sixth is dropped as obsolete, and none has ever fired.** The "high-intent unconverted cohort" part of this baseline is the piece the dropped `UI:Tap:CitizenshipLearnMore` would have carried — it is **not measurable** as the funnel now stands. See [[tasks/analytics-p1-citizenship-funnel]].
- **P1 ad impact:** segment ad impressions by player tier (`guest`, `free`, `earned_citizen`, `paid_citizen`) before making citizens ad-free, so the real revenue tradeoff can be modeled.
  📌 **2026-09-24 — only the tier-free baseline shipped** (task `0020`, see *Ad Events* below and [[tasks/analytics-p1-ad-impression-baseline]]); the tiered events are `0299` (Backlog). 🚩 **The premise that citizens are ad-free is not true in code yet** — no tier suppresses interstitials today (suppression is `0248`).

Open implementation questions remain around analytics backend constraints, whether guest `persistentID` is stable enough for match-count attribution, which events need server-side authority, and whether old match history should be backfilled.

## Ad Events (task `0020` — built 2026-09-24, not yet verified in Yandex)

One event, **`Ad:Interstitial`** (enum `AD_INTERSTITIAL`), fired from `FlashistFacade.showInterstitial()`
when the SDK's `onClose` reports `wasShown === true` (strict). **Once per real impression** — not per
attempt, not on `onError`, not when the SDK is missing or declines (`wasShown=false`, e.g. its own
frequency cap). It **under-counts** an ad abandoned by closing the tab mid-ad and **never over-counts**.
No value. Dev/staging builds only log it.

- ⛔ **No tier dimension.** `Ad:Interstitial:{Guest,Free,EarnedCitizen,PaidCitizen}` is task `0299`: the
  client has no synchronous tier at ad time (earned needs the `0273` client deployed plus a profile read
  and cache; paid needs `0250`).
- ⛔ **No banner events — dropped, not deferred** (owner, 2026-09-24): nothing in our code shows a banner,
  so there is no impression point to hook.
- 🚩 **Owed: the in-Yandex check** — exactly one event per ad shown, none when the SDK declines. Cannot be
  run locally. See [[tasks/analytics-p1-ad-impression-baseline]].

### Paid-citizen suppression (task `0248` — built 2026-10-06, committed `91eb99a`, NOT deployed)

**`Ad:InterstitialSuppressed:PaidCitizen`** (enum `AD_INTERSTITIAL_SUPPRESSED_PAID_CITIZEN`), fired from
`FlashistFacade.showInterstitial()` once per request when the SDK is present, citizenship surfaces are on (read at ad
time), and the card's last applied read was a **verified** owner view saying paid. No ad is requested, so
`Ad:Interstitial` does not fire.

- ⚠️ **Requests, not impressions** — an **upper bound** on ads given up (Yandex's own frequency cap would have declined
  some).
- No value and **no placement** (owner default, 2026-10-06 — all six placements are off, so a split decides nothing).
- Deliberately **outside** the `Ad:Interstitial:*` subtree, which `0299` reserves for **shown** ads.
- Not fired with no SDK, for an unknown / unverified / non-paid player, or with citizenship surfaces off.
- 📌 Since `0248`, a verified paid citizen's shown-ad count is nearly always zero — a future `0299` `:PaidCitizen` tier
  would catch only the cases the gate misses (an unverified session, an ad before the first profile read, citizenship
  off).
- It is the **only** way to check `0248`'s revenue cost afterwards: the owner ruled all six placements off with the
  cost put as a fact, not a figure. See [[tasks/paid-citizen-ad-free]].

## Tenure Grant Events (task `0253` — built 2026-09-24, not yet live)

Three events under *Citizenship Events* in the reference doc, all behind `CITIZENSHIP_CARD_ENABLED`
**and** the `citizenship_ui` flag (task `0236`'s combined gate), so **none can fire before `0065` flips
the card**. They fire only after a successful `POST /v1/login` whose reply says the tenure check is
`pending` — guests, degraded boots and failed logins fire none.

| Event | Meaning |
|---|---|
| `Citizenship:TenureGrant:Claimed` | the server **granted** the one-time grant; value = XP awarded (3–50) |
| `Citizenship:TenureGrant:Rejected:{BelowMinimum\|Duplicate}` | the check was recorded without a grant — fewer than 3 days (a **final** 0-XP check), or already checked (in practice two racing tabs) |
| `Citizenship:TenureGrant:ClaimFailed` | no usable server answer. ⚠️ **Two cases:** before the server recorded → retried next load; **after commit** (timeout, dropped connection, gateway error, unreadable 200) → **no retry, no popup, and the player may in fact be granted** |

🚨 **Count by UNIQUE USERS, not events.** `ClaimFailed` fires once per page load until the check lands;
`Claimed` / `Rejected:*` fire at most once per player except when two tabs race. ⛔ **"ClaimFailed, never
Claimed" does not mean ungranted** — the server's grant table is the truth. See [[tasks/tenure-xp-grant]].

🆕 **2026-09-30 (`0336`, committed `26b85c0`, not yet released):** the `Claimed` row now says the thank-you popup
opens right after the claim **or once the player is back on the start screen — never over a lobby or match — and a
match start closes it.** No event added or renamed. See [[tasks/tenure-popup-never-over-match]].

## Citizenship Restart Prompt Events (task `0303` — built 2026-09-28, not yet seen live)

| Event | When |
|---|---|
| `Citizenship:RestartPrompt:Shown` | The "restart to apply" popup actually appeared — after a server-confirmed purchase (`granted`), or after the tenure-gift thank-you popup when that gift made the player a citizen. At most once per page load; **never** after session-start reconciliation; behind the kill switch. **Not split by source** (gift-triggered ≈ `Shown` − `Purchase:Completed:Citizenship`, approximate) |
| `Citizenship:RestartPrompt:Restart` | The player tapped **Restart now**, right before `reloadApp()`. Separate from the login restart funnel (`Profile:Login:Restart:*`) on purpose |
| `Citizenship:RestartPrompt:Later` | The player tapped **Later** — the only way to dismiss it |

See [[tasks/citizenship-restart-prompt]].

## Citizenship Status Line Events (task `0397` — built 2026-10-06, committed `036a5c8`, NOT deployed)

| Event | When |
|---|---|
| `Citizenship:Status:Unverified` | The card's *not confirmed* line was shown: an authoritative read of a **citizen** that was not the verified owner view. At most once per page load. ⚠️ Counts unverified citizens **paid and earned together** — it cannot count paid ones alone, on purpose (ADR-116 Decision 4). Unverified non-citizens see and log nothing |
| `Citizenship:Status:ReadFailed` | The *couldn't load your profile* line was shown (read not authoritative). At most once per page load. **Includes** the "still not working" variant after a restart, and a failed re-read after a late Yandex login (the folded-in `0278` path) |
| `Citizenship:Status:Restart` | The player pressed **Restart game** on that line, right before the reload. Not fired on a press refused because the player is in a lobby, a join, or a match. Separate from `Profile:Login:Restart:*` and from `Citizenship:RestartPrompt:Restart` on purpose |

All behind the citizenship kill switch; no ids, no paid flag, no value. ⚠️ **Open observation (review, not acted on):**
`Unverified` / `ReadFailed` fire when the card publishes, **whether or not the card is on screen** — unlike
`Citizenship:Seen`. ⚠️ **Before `0395` / `0396` are live, every logged-in citizen would read "not confirmed"**, so
counts from any earlier deploy would be meaningless — `0397`'s deploy rule prevents that. See
[[tasks/session-verified-status-line]]. 📌 *2026-10-07: `0395` is done — `vfy: true` live
([[tasks/verified-login-enforce-live]]); `0396` (S3b) is **not** deployed, so the caveat still holds.*

## Citizenship Explainer Events (task `0301` — built 2026-10-06, committed `fc3f539`, NOT deployed)

The "What is citizenship?" popup. One *opened* event per source; it fires only when the popup actually opens — never
while the citizenship kill switch is off (the popup refuses to open). Each opening counts, so re-opening counts again.

| Event | When fired |
|---|---|
| `Citizenship:Explainer:Opened:CardLink` | From the "What is citizenship?" link on the card — shown in every card state except *checking* (owner ruling Q2), so guests, non-citizens, citizens and failed reads can all fire it |
| `Citizenship:Explainer:Opened:Instructions` | From the Citizenship section at the top of Instructions. Shown only when the citizenship surfaces are on at load; a late flag recovery (`0329`) does not reveal it for that load |
| `Citizenship:Explainer:Opened:LockedFeature:PrivateLobby` | From a tap on the **locked** Create Lobby button, right after `LockedFeature:Tap:PrivateLobby`. Five colon parts — the GameAnalytics maximum. Unreachable in a local dev build (Create is never locked there) |
| `UI:Tap:PurchaseCitizenshipExplainer` | Buy tapped **inside the popup**, before the purchase starts; the existing `Purchase:*:Citizenship` events follow unchanged. A tap while a purchase is already running fires **nothing** (one shared latch with the card, checked before the event — review R1 corrected the doc to match the code) |
| `UI:Tap:CitizenshipLoginExplainer` | A guest taps login **inside the popup** — only where a login can work (Yandex context, SDK not degraded). The `Profile:Login:Restart:*` funnel follows as for the card's login button |

**Funnel reading:** Opened → `UI:Tap:PurchaseCitizenshipExplainer` → `Purchase:Started/Completed/Abandoned:Citizenship`.
The purchase events are **not** split by surface; the tap events are. Fired through
`FlashistFacade.logCitizenshipExplainerOpenedEvent(sourceSuffix)` from `CitizenshipExplainerModal.show()`; callers open
the popup only via `openCitizenshipExplainer()` in `src/client/CitizenshipExplainer.ts`. See
[[tasks/citizenship-explainer-popup]].

## Long-Session Refresh Events (task `0404` — built 2026-10-07, committed `077c9e3`, NOT deployed)

The forced "please refresh the game" popup after **23 h** since page load (`LONG_SESSION_REFRESH_AFTER_MS`), start
screen only. Everyone, guests included; no ids. Enum keys `LONG_SESSION_REFRESH_*` in
`flashistConstants.analyticEvents`.

| Event | When fired |
|---|---|
| `Session:LongSessionRefresh:Due` | At most once per page load: 23 h reached and the check ran with the tab visible (60 s timer + every return to visible). **Value:** whole minutes since page load (≥ 1380) |
| `Session:LongSessionRefresh:Shown` | At most once per page load: the popup actually appeared — start screen only, never in a lobby / join / match, never while a Yandex payment flow or login dialog is open. **Value:** minutes since page load. Not fired if the stale-build popup was already up |
| `Session:LongSessionRefresh:Refresh` | REFRESH pressed, right before the reload (keeps the query string, drops the hash, writes no match-exit marker, writes the `AfterRefreshPopup` marker). No value |
| `Session:LongSessionRefresh:Waited` | Only when the popup could not show at once at `Due`. **Value:** whole minutes `Due` → `Shown` |
| `Session:LongSessionRefresh:DeferredByDialog` | At most once per page load: held back at least once by a payment/login dialog. No value |
| `Session:LongSessionRefresh:PreemptedByStaleBuild` | At most once per page load: due and clear, but the stale-build popup (`Build:StaleDetected`) was already up — not shown. No value |

**Readings (per the reference doc):** `Due − Shown − PreemptedByStaleBuild` ≈ pages that reached 23 h but never got
the popup (a match exit reloaded the page, or the tab closed while waiting); `Shown − Refresh` ≈ tabs closed instead of
refreshed (plus popups switched to the stale message — that press logs `UI:ClickStaleBuildRefresh`). The four extra
events (`Due`, `Waited`, `DeferredByDialog`, `PreemptedByStaleBuild`) were added under the owner's plan-gate ruling
*"also add any other analytic metrics that can be useful here"*. Live read: verify task `0406`. See
[[tasks/long-session-refresh-popup]].

## Locked Feature Events (task `0302` — built 2026-09-27, not yet released)

`LockedFeature:Tap:{FeatureId}` — one event per tap on a citizen perk shown **locked**. Today only `LockedFeature:Tap:PrivateLobby` (the locked "Create Lobby" button; never for a citizen, never while the row is hidden). Fire only through `onLockedFeatureTap(featureId)` in `src/client/LockedFeature.ts`; ids in `flashistConstants.lockedFeatureIds`. The "explainer opened" event belongs to `0301`. See [[tasks/private-lobby-citizen-perk]]. 📌 **2026-10-06:** that
event is now `Citizenship:Explainer:Opened:LockedFeature:{FeatureId}`, fired right after this one (task `0301`,
committed, not deployed — *Citizenship Explainer Events* above). Until `0301` deploys, a locked tap still opens
`0302`'s interim popup. ⚠️ This heading's *"not yet released"* predates the record that `0302`'s code went to
production in `0.0.155` behind the flags ([[tasks/private-lobby-citizen-perk]]); left as written, flagged here.

> ⚠️ **`Citizenship:Earned:XP` is DORMANT** per the reference doc, from task `0250`'s slice S1 profile-server deploy until its slice S3b — an unverified profile read now carries `citizenship_earned_at: null` for every player (owner ruling D4), so no client can observe the transition. In the committed tree (`68303d5`) the client no longer calls `reportEarnedCitizenshipTransition` at all (`src/client/PlayerProfileView.ts`, the "deliberately NOT called (task 0250" comment). ⚠️ `0250` itself is still **🚧 Blocked** (S1 built and reviewed; S3b waits on `0325`), ~~and no S1 deploy is recorded in the repo~~. See [[systems/player-profile-store]]. 📌 **2026-10-02 correction:** S1 **went live in the 2026-09-29 deploy** (commit `68303d5` is in game tag `0.0.155`; the `0250` brief and Sprint 7 row now say so — [[systems/weekend-deploy-window]]), so this event is dormant in production now, not only in the tree. Deployed, **not verified in use**. S3b now waits on `0340`, not `0325`.

## Experiment Event Pattern

`Experiment:{flagName}:{flagValue}` — built at runtime from Yandex flag response. Enables per-cohort funnel comparison:

```
Experiment:Tutorial:Enabled → Tutorial:Started → Tutorial:Completed → Game:Start
Experiment:Tutorial:Disabled → Game:Start → Match:SpawnChosen
```

## The 500-Events-Per-Active-User-Per-Day Limit

**GameAnalytics enforces a limit of 500 events per active user per day, and it was breached on 4 Sep 2026.** 🔴 **Read the limit precisely: it is PER USER PER DAY, not a total-volume limit.** It is a statement about a **chatty client**, not about the game being popular. A response framed as "too much traffic" or "we outgrew the plan" has misread the banner and will chase a bigger plan instead of fewer events per player.

⚠️ **Every figure below is a human reading off the GameAnalytics UI on 2026-09-06.** Reliable enough to direct investigation; **not** reliable enough to quote as exact without re-reading the dashboard.

| Day | Events/user |
|---|---|
| 30 Aug – 2 Sep | ~150–250 |
| 3 Sep | 414.88 |
| **4 Sep** | **1,324.33 — 265 % of the limit** |
| 5 Sep | 162.79 — back under, **with zero code written** |

**Two independent problems, and they must not be conflated:**

1. 🔴 **The SPIKE (3–4 Sep) — `Player` (~34×), `Experiment` (~45×), `Session` (~10×), `Platform` and `Device` (~31× each).** All **once-per-session** categories. It ramped 3 Sep, peaked 4 Sep, and was **entirely gone on 5 Sep**. 🚨 **THE MECHANISM IS UNKNOWN AND UNEXPLAINED.** The owner's read — that it came from their own local/dev testing — is a **plausible hypothesis, never verified**; ⛔ **do not write it down as the cause.** Tracked as task `0230`, **deferred to the Backlog board 2026-09-07, cause unknown**, reopen condition *"if the problem repeats"*.
2. 🔴 **The STANDING baseline — `Performance` is the largest consumer on a normal day**, 109–216 events/user/day, roughly **two-thirds** of a normal ~163 total. On 31 Aug it alone reached 215.87, i.e. **43 % of the whole 500 limit from one category on a day with no spike.** This is what task `0224` cut (60 s → 300 s), and it is the only part addressed.

⛔ **`0224` does not fix the breach and cannot** — none of the categories that breached were touched. **A 4 Sep repeated today would still breach at ~235 % of the limit.** ⛔ **"The banner is gone" is not evidence of anything** — the metric self-resolved on 5 Sep before any code was written.

🟢 **`Match` did not move across the spike** (25.87 → 31.79 → 26.16). **Task `0208`'s `Match:WinCondition` instrumentation is EXONERATED** — that was the first hypothesis on seeing the banner, and the table refutes it. ⛔ Do not re-open it without evidence contradicting the table.

**Other findings from the same audit, none of them resolved:**

- ⚠️ **Only Design events are tracked.** Resource, Progression, Health, Business, Ad and Impression events all read "Not tracking" ⇒ **100 % of the per-user budget is spent on design events**, with no other type to move volume into without building it first.
- ⚠️ **Design-event cardinality is a SECOND, SEPARATE metric and it is TRENDING UP** — ~103–105 distinct names all week, **118 on 5 Sep**, the same day the breached metric went green. 🚨 **Whether a cardinality limit is being breached, and whether anything is being dropped, could NOT be established** — the chart carried no "Limit reached" badge and the "Dropped events" toggle was greyed out. ⛔ Nobody may write "events are being dropped" **or** "cardinality is fine".
- ⚠️ **`Platform` and `Device` are byte-identical on every single day.** Explained (not verified) as both being emitted unconditionally, once per session, from the same consecutive block of session-start code in `FlashistFacade.ts`.
- ⚠️ **Two dashboard figures do not reconcile and neither is being called wrong:** the per-category breakdown does not sum to the reported daily totals, and the brief's "7-day mean 581.97" cannot be reproduced from its own daily rows (which average **378.86**). The second matters: the "mean is above 500" framing is the stated reason the baseline has no headroom, and **if 378.86 is right, that framing is overstated.**

### 🚨 `DEPLOY_ENV` fails open to `prod` — live, unmitigated, unscheduled

The dev/prod separation for GameAnalytics rests on **one environment variable**, and every default in the chain resolves it to `prod`. Any build that does **not** go through `build-deploy.sh` → `build.sh:129` — a direct `docker build`, a hand-rolled local build, a one-off image — **silently writes into the production GameAnalytics game.** There is exactly one key pair, so nothing in the dashboard would distinguish that traffic. `Dockerfile:23` and `webpack.config.js:335-336` are the fail-open defaults.

⚠️ **The wrong outcome is the one you get by omission, and nothing warns you.** The owner knows and chose to defer. Tracked as task `0226` on the Backlog board — ⛔ **a brief on an unranked board is a record, not a mitigation.** The "should dev get its own key pair?" question is **the owner's and is not ruled**.

## Gotchas / Known Issues

- 🔴 **Leaked `PerformanceMonitor`s inflate the `Performance` category, and one of the leaks accumulated.** Ending a game does not reliably stop the monitor. Task `0225` fixed the accumulating one (mid-game lobby join, one permanently unstoppable monitor per join); task `0227` fixed two of three crash paths. **Four sites remain open** — `0231`, `0232`, `0233`, `0228`. ⛔ **None of them explains the 3–4 Sep spike**, which was session-start events. See [[systems/client-game-teardown]].
- **Migration (2026-03-01):** Events migrated from `SCREAMING_SNAKE_CASE` strings to `Category:Action`. Historical data before this date appears under old names in dashboards.
- **Double-reload:** Before HF-9, a browser refresh after any game caused two full initialization sequences, doubling all `Session:Start`, `Device:*`, `Platform:*`, and `Experiment:*` events. Fixed in HF-9. See [[decisions/double-reload-fix]].
- **`Player:New` inflation:** During the double-reload era, new users fired both `Player:New` (first load) and `Player:Returning` (second load). Historical cohort data for new users from before HF-9 is affected.
- **Stale build sessions:** Users on zombie tabs (old builds) still fire analytics — `Build:StaleDetected` identifies them. See [[decisions/stale-build-zombie-tabs]].
- **Bootstrap timing:** `Session:Start` now fires deterministically in the immediate `Bootstrap.ts` phase before the bounded platform gate. Funnel comparisons around the bootstrap refactor should expect slight ordering/timing shifts rather than treating them as regressions by default.
- **Build tracking history:** Older HF-7 docs mention GameAnalytics Custom Dimension 01 and dashboard pre-registration for build values. That was true for the first implementation only; current tracking uses `configureBuild()` and does not require GA pre-registration. See [[tasks/build-number-tracking]].
- **Monetization event naming:** The monetization spec uses product-level event names as requirements, but implementation must still conform to the established `Category:Action` analytics naming convention and the TypeScript enum source-of-truth rule.

## Related

- [[tasks/tutorial-abandonment-platform-segmentation]] — task `0212`, the filed-but-unscheduled investigation into why the tutorial's completion rate reads 9.8 %, and the six code-read corrections that say the headline is probably overstated
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
- [[tasks/analytics-p1-citizenship-funnel]] — task 0021, the shared citizenship funnel spec: the disproved data-loss premise, the dropped sixth event, and the `Citizenship:Seen` under-count risk
- [[tasks/hide-citizenship-card-flag]] — task 0054, the `CITIZENSHIP_CARD_ENABLED` gate that keeps every citizenship event at zero
- [[tasks/gameanalytics-per-user-event-limit]] — task `0224`, the 500-per-user breach, the 60 s → 300 s `Performance` cut, and the two acceptance criteria it closed **unmet**
- [[systems/client-game-teardown]] — the leaked `PerformanceMonitor`s that inflate this category, and which of them are fixed
- [[tasks/orphaned-performance-monitors-lobby-rejoin]] — task `0225`, the accumulating monitor leak, fixed and evidenced
- [[tasks/crashed-game-teardown-seam]] — task `0227`, the crash-path monitor holes; two fixed, one unreachable
- [[tasks/measure-clientless-leader-and-solo-awards]] — task `0208`, exonerated by the category breakdown: `Match` did not move across the spike
- [[tasks/analytics-p0-game-mode-segmentation]] — P0 mode classifier emitted immediately after `Game:Start`
- [[tasks/analytics-p0-spawn-confirmation]] — P0 confirmed-spawn event for time-to-spawn and ghost-rate measurement
- [[tasks/analytics-p0-match-duration]] — P0 duration event emitted alongside `Game:End`
- [[tasks/analytics-p0-player-days-played]] — P0 loyalty-depth event emitted after `Player:New` or `Player:Returning`
- [[tasks/analytics-p0-yandex-login-status]] — P0 identity-reach event emitted as logged-in, guest, or unknown
- [[tasks/analytics-p0-session-match-count]] — P0 per-session match starts recorded via localStorage and consumed on next session open
- [[systems/flashist-init]] — startup ordering, SDK bootstrap, and experiment-flag initialization
- [[features/announcements]] — `UI:Tap:AnnouncementsBell`, `Announcements:Opened`, `Announcements:Closed`, and the task-0012 Personal-tab inbox events
- [[systems/architecture-overview]] — the platform facade that owns the event enum
- [[tasks/measure-clientless-leader-and-solo-awards]] — task `0208`, the two event families above. ✅ **LIVE since `0.0.141` and READ 2026-09-11** — see *Win Condition & Leaderboard Award Events*. ⚠️ **Client-matches and attempts, never matches and never points banked**; ⛔ **closed but NOT fully verified**
- [[tasks/citizenship-kill-switch-coverage]] — task `0236`, which routes every citizenship surface (and the events they emit) through one shared kill-switch helper
- [[decisions/adr-113-internal-player-id]] — the login endpoint and session token the `Profile:Login:*` families measure
- [[tasks/profile-identity-s2-login-and-session-token]] — task `0271`, the server side of those events
- [[systems/player-profile-store]] — the backend the login talks to
- [[tasks/personal-inbox]] — task `0012`, which added the four inbox events
- [[tasks/citizenship-earned]] — task `0017`, which added `Citizenship:Earned:XP`
- [[tasks/tenure-xp-grant]] — task `0253`, the three `Citizenship:TenureGrant:*` events
- [[tasks/analytics-p1-ad-impression-baseline]] — task `0020`, the `Ad:Interstitial` baseline event
- [[tasks/profile-identity-s4-client-login-session]] — task `0273`, which added the client login events; client deployed 2026-09-26
- [[tasks/citizenship-paid]] — task `0018`, the paid-citizenship buy flow — closed 2026-09-26 after the first real purchases returned 200
- [[tasks/platform-degraded-analytics-event]] — task `0328`, `Session:PlatformDegraded:{Cause}`, `Session:PlatformRecovered`, and the `PlatformInitTimeout` "once per boot" correction
- [[tasks/sdk-loader-download-retry]] — task `0330`, `Session:SdkLoaderRetry:{Outcome}`
- [[tasks/citizenship-card-vanishes-investigation]] — task `0318`, the measurement gap these events close
- [[tasks/citizenship-restart-prompt]] — task `0303`, the three `Citizenship:RestartPrompt:*` events
- [[tasks/private-lobby-citizen-perk]] — task `0302`, `LockedFeature:Tap:PrivateLobby` and the `private_lobbies` flag
- [[tasks/citizenship-card-late-recovery-recheck]] — task `0329`, whose effect `Session:PlatformRecovered` sizes
- [[tasks/verified-login-shadow-mode]] — task `0325`, the four `Profile:Login:Signature:*` events
- [[decisions/adr-116-verified-login]] — rulings D1 (no wait limit) and D2 (the four events)
- [[tasks/rejoin-after-failed-match-start]] — task `0347`, the Reconnection Events caveats (Q1, Q2)
- [[tasks/worker-start-failure-reporting]] — task `0348`, `Worker:InitFailedCause:{Cause}`
- [[tasks/worker-reuses-page-map]] — task `0035`, worker-failure telemetry silent after a leave
- [[tasks/tenure-popup-never-over-match]] — task `0336`, the `Citizenship:TenureGrant:Claimed` popup timing
- [[tasks/verified-login-live-check]] — task `0339`: the first live counts of the four `Profile:Login:Signature:*` events
- [[tasks/stale-login-client-diagnostics]] — task `0372`: the 20 `Profile:Login:SignatureAge:*` + 4 `Profile:Login:Signature:Refetch:*` events and `Ready`'s held-ms value (committed, not deployed)
- [[tasks/login-signature-24h-window]] — task `0391`: why the §A1 client labels no longer match the server
- [[tasks/authenticated-profile-read]] — task `0250`: `Citizenship:Earned:XP` dormant from S1, verified-only from S3b
- [[tasks/private-lobby-tester-default]] — task `0354`: the `private_lobbies_all` cohort event
- [[decisions/adr-121-login-signature-24h-window]] — the window change behind the §A1 rewrite
- [[tasks/paid-citizen-ad-free]] — task `0248`: `Ad:InterstitialSuppressed:PaidCitizen` (committed, not deployed)
- [[tasks/session-verified-status-line]] — task `0397`: the three `Citizenship:Status:*` events (committed, not deployed)
- [[tasks/citizenship-explainer-popup]] — task `0301`: the three `Citizenship:Explainer:Opened:*` events and the two popup tap ids (committed, not deployed)
- [[tasks/verified-login-enforce-live]] — task `0395` (2026-10-07): verified logins live; the `Citizenship:Status:*` caveat still waits on `0396`
- [[tasks/long-session-refresh-popup]] — task `0404` (2026-10-07): six `Session:LongSessionRefresh:*` events and the `AfterRefreshPopup` boot kind (committed, not deployed)
