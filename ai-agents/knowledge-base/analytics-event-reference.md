# Geoconflict — Analytics Event Naming Convention & Reference

## Convention

All analytics event strings use `Category:Action` or `Category:Subcategory:Value` format, with PascalCase segments separated by colons. No underscores, no screaming snake case.

**Examples of correct format:**
- `Game:Start`
- `Session:Heartbeat:05`
- `Performance:FPS:Above30`
- `Player:Eliminated`

All future events must follow this convention. The TypeScript enum serves as the single source of truth — event strings are never written inline in game code, always referenced through the enum.

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
| `PERFORMANCE_FPS_ABOVE30` | `Performance:FPS:Above30` | Current FPS ≥ 30 |
| `PERFORMANCE_FPS_15TO30` | `Performance:FPS:15to30` | Current FPS between 15 and 30 |
| `PERFORMANCE_FPS_BELOW15` | `Performance:FPS:Below15` | Current FPS < 15 — crash risk zone |
| `PERFORMANCE_MEMORY_HIGH` | `Performance:Memory:High` | Heap is healthy (Chrome only, best-effort) |
| `PERFORMANCE_MEMORY_MEDIUM` | `Performance:Memory:Medium` | Heap is under moderate pressure |
| `PERFORMANCE_MEMORY_LOW` | `Performance:Memory:Low` | Heap is heavily constrained — crash risk |

---

## Updated TypeScript Enum

```typescript
const AnalyticsEvent = {
    // Session
    SESSION_START:              "Session:Start",
    SESSION_HEARTBEAT:          "Session:Heartbeat",        // append :05, :10, :15 etc.
    SESSION_FIRST_ACTION:       "Session:FirstAction",

    // Device segmentation
    DEVICE_MOBILE:              "Device:mobile",
    DEVICE_DESKTOP:             "Device:desktop",
    DEVICE_TABLET:              "Device:tablet",
    DEVICE_TV:                  "Device:tv",

    // Platform segmentation
    PLATFORM_ANDROID:           "Platform:android",
    PLATFORM_IOS:               "Platform:ios",
    PLATFORM_WINDOWS:           "Platform:windows",
    PLATFORM_MACOS:             "Platform:macos",
    PLATFORM_LINUX:             "Platform:linux",
    PLATFORM_OTHER:             "Platform:other",

    // Player segmentation
    PLAYER_NEW:                 "Player:New",
    PLAYER_RETURNING:           "Player:Returning",

    // Game / match
    GAME_START:                 "Game:Start",
    GAME_END:                   "Game:End",
    GAME_WIN:                   "Game:Win",
    GAME_LOSS:                  "Game:Loss",
    GAME_ABANDON:               "Game:Abandon",
    PLAYER_ELIMINATED:          "Player:Eliminated",

    // Spawn
    MATCH_SPAWN_CHOSEN:         "Match:SpawnChosen",
    MATCH_SPAWN_AUTO:           "Match:SpawnAuto",

    // Reconnection
    RECONNECT_PROMPT_SHOWN:     "Reconnect:PromptShown",
    RECONNECT_ACCEPTED:         "Reconnect:Accepted",
    RECONNECT_DECLINED:         "Reconnect:Declined",
    RECONNECT_SUCCEEDED:        "Reconnect:Succeeded",
    RECONNECT_FAILED:           "Reconnect:Failed",

    // Feedback
    FEEDBACK_BUTTON_OPENED:     "Feedback:ButtonOpened",
    FEEDBACK_SUBMITTED:         "Feedback:Submitted",

    // UI
    UI_CLICK_MULTIPLAYER:       "UI:ClickMultiplayer",
    UI_CLICK_SINGLE_PLAYER:     "UI:ClickSinglePlayer",
    UI_CLICK_MISSION:           "UI:ClickMission",

    // Performance
    PERFORMANCE_FPS_ABOVE30:            "Performance:FPS:Above30",
    PERFORMANCE_FPS_15TO30:             "Performance:FPS:15to30",
    PERFORMANCE_FPS_BELOW15:            "Performance:FPS:Below15",
    PERFORMANCE_MEMORY_HIGH:            "Performance:Memory:High",
    PERFORMANCE_MEMORY_MEDIUM:          "Performance:Memory:Medium",
    PERFORMANCE_MEMORY_LOW:             "Performance:Memory:Low",
} as const;
```

---

## Naming Rules for Future Events

1. **Format:** `Category:Action` or `Category:Subcategory:Value` — always PascalCase, always colon-separated
2. **No underscores** anywhere in the event string
3. **Category** should be a noun: `Game`, `Session`, `Player`, `Match`, `UI`, `Performance`, `Reconnect`, `Feedback`
4. **Action** should be PascalCase verb or state: `Start`, `End`, `ButtonOpened`, `SpawnChosen`
5. **Values/buckets** use the same casing as established: `Above30`, `mobile`, `android` (follow existing patterns within the category)
6. **Enum keys** use `SCREAMING_SNAKE_CASE` — this is the internal TypeScript identifier and is independent of the event string
7. **Never write event strings inline** — always use the enum key. This means a rename only requires changing one line.
