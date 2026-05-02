# Task — Analytics P0: Player Days Played Event

## Sprint
Sprint 4 — must ship before citizenship UI goes live

## Priority
High. Total unique days played is the loyalty-depth dimension missing from the current event set. `Player:New/Returning` tells us "came back or not" — this tells us how deep loyalty runs. Required to answer: how many days does a typical player need to accumulate 100 qualifying matches (the citizenship threshold), and at what day-count do players typically churn?

---

## Context

The session-start sequence fires `Session:Start → Device:[class] → Platform:[os] → Player:New/Returning` but records no loyalty depth beyond first/returning. A returning player on day 2 and a returning player on day 40 both fire `Player:Returning` — they look identical in the data.

This event fills that gap by tracking how many distinct calendar days the player has opened the game, cumulatively. It is not consecutive-day counting and does not penalise gaps: a player who plays on day 1, skips a week, and returns fires the event with value 2 on return.

**Semantics (locked):**
- Value = total unique calendar days the player has ever opened the game
- Multiple sessions on the same calendar day all fire with the same value
- A session after a gap of N days still increments by exactly 1 (not N)
- Day 1 fires with value 1

---

## What to Build

### localStorage keys

| Key | Type | Purpose |
|---|---|---|
| `geoconflict_days_played` | integer (stored as string) | Cumulative unique days count |
| `geoconflict_last_played_date` | string (YYYY-MM-DD) | Last calendar date a session was opened |

> **Implementation note:** The keys above use underscore notation as originally specified. In the actual implementation the dot-notation convention was applied instead, to match the pre-existing key `geoconflict.player.firstSeen` used by the `Player:New/Returning` logic in the same block. The keys as shipped are:
>
> | As specified | As implemented |
> |---|---|
> | `geoconflict_days_played` | `geoconflict.player.daysPlayed` |
> | `geoconflict_last_played_date` | `geoconflict.player.lastPlayedDate` |
>
> Any future keys in this namespace should follow the `geoconflict.player.*` dot-notation pattern.

Use the player's **local calendar date** (not UTC) — a player's "day" should match their wall clock. Derive today's date as:
```ts
const d = new Date();
const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
```

### Logic on session start

1. Read `geoconflict_last_played_date` from localStorage.
2. If absent, or different from today:
   - Read `geoconflict_days_played` (default `0` if absent or unparseable).
   - Increment by 1.
   - Write `geoconflict_days_played` and `geoconflict_last_played_date = today`.
3. Read current `geoconflict_days_played`.
4. Fire `Player:DaysPlayed` with that integer value.

Wrap all localStorage reads/writes in try/catch — storage may be unavailable in restricted browser contexts. If storage fails, skip the event silently rather than breaking the session-start sequence.

### Enum key (add to `flashistConstants.analyticEvents`)

| Enum key | Event string | Value |
|---|---|---|
| `PLAYER_DAYS_PLAYED` | `Player:DaysPlayed` | Integer — cumulative unique calendar days played |

### Session-start sequence placement

Fire immediately after `Player:New/Returning`, before any deferred events:

```
Session:Start → Device:[class] → Platform:[os] → Player:New/Returning → Player:DaysPlayed
```

No multi-tab collision risk: two tabs opening simultaneously on a new day both increment to the same value and fire identically. No UUID or deferred-write complexity required.

---

## Verification

1. First-ever session — confirm `Player:DaysPlayed` fires with value `1`.
2. Second session same calendar day — confirm `Player:DaysPlayed` fires with the same value as session 1 (no increment).
3. Session on the next calendar day — confirm `Player:DaysPlayed` fires with value `2`.
4. Session after a gap of several days — confirm `Player:DaysPlayed` increments by exactly `1` (not by the number of days skipped).
5. Simulate localStorage unavailable (stub to throw) — confirm the session-start sequence completes without error and `Player:DaysPlayed` is silently skipped.
6. Confirm `PLAYER_DAYS_PLAYED` appears in `flashistConstants.analyticEvents`.
7. Confirm the event is documented in `ai-agents/knowledge-base/analytics-event-reference.md`.
8. Confirm no event strings are written inline.

---

## Notes

- This event makes `Player:New/Returning` partially redundant for deeper analysis (day-1 players will always fire value `1`, which implies `Player:New`), but both should continue firing — `Player:New/Returning` is already established in dashboards and funnels.
- Do not derive this value from match count or session count — calendar days are the correct unit.
- This event fires even on sessions where the player plays zero matches (just opens the game). That is intentional — "days played" means days the game was opened, not days a match was completed.
