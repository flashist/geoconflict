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
| Enum Key | Event String | When Fired |
|---|---|---|
| `SESSION_START` | `Session:Start` | Once per session, on game load after SDK init. Top step of all funnels. |
| `SESSION_HEARTBEAT` | `Session:Heartbeat:05`, `Session:Heartbeat:10`, ... | Every 5 minutes while player is active. Stops on inactivity or tab close. |
| `SESSION_FIRST_ACTION` | `Session:FirstAction` | Once per session, on first meaningful interaction on the start screen. |

### Device & Platform Segmentation Events
Fired once per session immediately after `Session:Start`, in this order:

| Enum Key | Event String | When Fired |
|---|---|---|
| `DEVICE_MOBILE` | `Device:mobile` | Device class is mobile |
| `DEVICE_DESKTOP` | `Device:desktop` | Device class is desktop |
| `DEVICE_TABLET` | `Device:tablet` | Device class is tablet |
| `DEVICE_TV` | `Device:tv` | Device class is TV/console |
| `PLATFORM_ANDROID` | `Platform:android` | OS is Android |
| `PLATFORM_IOS` | `Platform:ios` | OS is iOS |
| `PLATFORM_WINDOWS` | `Platform:windows` | OS is Windows |
| `PLATFORM_MACOS` | `Platform:macos` | OS is macOS |
| `PLATFORM_LINUX` | `Platform:linux` | OS is Linux |
| `PLATFORM_OTHER` | `Platform:other` | OS is unrecognized (ChromeOS, etc.) |
| `PLAYER_NEW` | `Player:New` | Player's very first session ever |
| `PLAYER_RETURNING` | `Player:Returning` | Every session after the first |

Full session-start sequence:
```
Session:Start → Device:[class] → Platform:[os] → Player:New/Returning
```

### Game Events
Fired for both multiplayer and single-player missions.

| Enum Key | Event String | When Fired |
|---|---|---|
| `GAME_START` | `Game:Start` | Match begins |
| `GAME_END` | `Game:End` | Match ends for any reason |
| `GAME_WIN` | `Game:Win` | Player wins the match |
| `GAME_LOSS` | `Game:Loss` | Player loses the match |
| `GAME_ABANDON` | `Game:Abandon` | Player explicitly abandons |
| `PLAYER_ELIMINATED` | `Player:Eliminated` | Player is eliminated mid-match |

### Spawn Events
| Enum Key | Event String | When Fired |
|---|---|---|
| `MATCH_SPAWN_CHOSEN` | `Match:SpawnChosen` | Player actively selected a spawn location |
| `MATCH_SPAWN_AUTO` | `Match:SpawnAuto` | Player was auto-placed (Task 4a mechanic) |

### Reconnection Events
| Enum Key | Event String | When Fired |
|---|---|---|
| `RECONNECT_PROMPT_SHOWN` | `Reconnect:PromptShown` | Reconnection prompt appears after detected disconnect |
| `RECONNECT_ACCEPTED` | `Reconnect:Accepted` | Player taps "Reconnect" |
| `RECONNECT_DECLINED` | `Reconnect:Declined` | Player taps "Leave" |
| `RECONNECT_SUCCEEDED` | `Reconnect:Succeeded` | Reconnection completes successfully |
| `RECONNECT_FAILED` | `Reconnect:Failed` | Reconnection attempt fails |

### Feedback Events
| Enum Key | Event String | When Fired |
|---|---|---|
| `FEEDBACK_BUTTON_OPENED` | `Feedback:ButtonOpened` | Player opens the feedback form |
| `FEEDBACK_SUBMITTED` | `Feedback:Submitted` | Player submits feedback |

### UI Events
| Enum Key | Event String | When Fired |
|---|---|---|
| `UI_CLICK_MULTIPLAYER` | `UI:ClickMultiplayer` | Player clicks the multiplayer button |
| `UI_CLICK_SINGLE_PLAYER` | `UI:ClickSinglePlayer` | Player clicks the single player button |
| `UI_CLICK_MISSION` | `UI:ClickMission` | Player clicks a specific mission |

### Performance Events
Sampled every 60 seconds during active gameplay via a `setInterval` independent of the render loop.

| Enum Key | Event String | When Fired |
|---|---|---|
| `PERFORMANCE_FPS_AVERAGE` | `Performance:FPSAverage` | Current average FPS value (will be passed into the analytic event as the value parameter) |
| `PERFORMANCE_FPS_ABOVE30` | `Performance:FPS:Above30` | Current FPS ≥ 30 |
| `PERFORMANCE_FPS_15TO30` | `Performance:FPS:15to30` | Current FPS between 15 and 30 |
| `PERFORMANCE_FPS_BELOW15` | `Performance:FPS:Below15` | Current FPS < 15 — crash risk zone |
| `PERFORMANCE_MEMORY_HIGH` | `Performance:Memory:High` | Heap is healthy (Chrome only, best-effort) |
| `PERFORMANCE_MEMORY_MEDIUM` | `Performance:Memory:Medium` | Heap is under moderate pressure |
| `PERFORMANCE_MEMORY_LOW` | `Performance:Memory:Low` | Heap is heavily constrained — crash risk |

### Worker Initialization Events
Fired once per game session attempt, before gameplay starts.

| Enum Key | Event String | When Fired |
|---|---|---|
| `WORKER_INIT_SUCCESS` | `Worker:InitSuccess` | Web Worker initialized successfully; game will start |
| `WORKER_INIT_FAILED` | `Worker:InitFailed` | Worker construction or initialization failed; error modal shown to user |

### Tutorial Events
Fired during the tutorial match (only for players who see the tutorial experiment).

| Enum Key | Event String | When Fired |
|---|---|---|
| `TUTORIAL_STARTED` | `Tutorial:Started` | Tutorial match begins |
| `TUTORIAL_TOOLTIP_SHOWN_FIRST_PART` | `Tutorial:TooltipShown:` + N | Tooltip N appears (N = 1–7); string is built at runtime by appending the tooltip number |
| `TUTORIAL_TOOLTIP_CLOSED_FIRST_PART` | `Tutorial:TooltipClosed:` + N | Tooltip N is dismissed by the player (N = 1–7); string is built at runtime by appending the tooltip number |
| `TUTORIAL_SKIPPED` | `Tutorial:Skipped` | Player clicks the "Skip tutorial" button |
| `TUTORIAL_COMPLETED` | `Tutorial:Completed` | Tutorial finishes (player wins the mission or closes the final tooltip) |
| `TUTORIAL_DURATION` | `Tutorial:Duration` | Fired alongside `Tutorial:Skipped` or `Tutorial:Completed`; value = seconds elapsed since tutorial started |

### Experiment Events
Fired once per new player session at the point where the experiment flag is evaluated — regardless of which variant the player is assigned to. This gives a clean cohort anchor for both sides of every experiment, enabling proper funnel comparison between groups.

**Convention:** `Experiment:{ExperimentName}:{Variant}`

The event string is built at runtime by combining the experiment name and variant. Both parts are PascalCase. The enum key stores only the prefix; the full string is assembled at the call site — same pattern as `Tutorial:TooltipShown:N`.

**Current experiments:**

| Enum Key | Event String | When Fired |
|---|---|---|
| `EXPERIMENT_TUTORIAL_FIRST_PART` | `Experiment:Tutorial:Enabled` | Player is assigned to the tutorial experiment group |
| `EXPERIMENT_TUTORIAL_FIRST_PART` | `Experiment:Tutorial:Disabled` | Player is assigned to the control group (no tutorial) |

**Firing point:** immediately after the Yandex experiment flag is read in `src/client/Main.ts`, before any branching logic executes. Both variants fire at the same code location — one line apart.

**Required for all future experiments:** every new Yandex experiment must fire a corresponding pair of `Experiment:{Name}:{Variant}` events at the flag evaluation point. This is not optional — without these events, control group behavior is invisible in analytics and experiment results cannot be properly measured.

**Example funnels enabled by experiment events:**

Control group:
```
Experiment:Tutorial:Disabled → Game:Start → Match:SpawnChosen → Session:Heartbeat:05
```

Experiment group:
```
Experiment:Tutorial:Enabled → Tutorial:Started → Tutorial:Completed → Game:Start → Match:SpawnChosen → Session:Heartbeat:05
```

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
