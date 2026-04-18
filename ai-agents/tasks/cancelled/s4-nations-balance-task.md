# Task — Humans vs Nations: Balance Nation Count to Player Count

## Sprint
Sprint 4

## Priority
Medium — quality of life improvement to the recently re-enabled Humans vs Nations mode. Does not block any other Sprint 4 tasks.

## Context

Humans vs Nations mode was re-enabled in Sprint 3 (scope expanded to all team modes). Currently the number of nation bots added to a match is not calibrated to the number of human players, making the mode too easy when few humans join — nations are outnumbered and provide insufficient challenge.

The fix: set the number of nation bots as close to 1:1 with the number of human players as the lobby size allows.

---

## Balancing Rule

**Target:** `nation_count = human_player_count`

**Constraint:** total players (humans + nations) must not exceed the lobby's maximum player count.

**Formula:**
```
nation_count = min(human_player_count, lobby_max_players - human_player_count)
```

**Examples:**

| Humans | Lobby max | Nations added | Total |
|---|---|---|---|
| 4 | 10 | 4 | 8 |
| 4 | 7 | 3 | 7 |
| 4 | 8 | 4 | 8 |
| 1 | 10 | 1 | 2 |
| 6 | 10 | 4 | 10 |
| 8 | 8 | 0 | 8 — lobby full, no nations added |

When the lobby is full with humans, no nations are added. When exact 1:1 would exceed the lobby maximum, use the largest number of nations that fits.

---

## Implementation

### Part A — Investigation

Before changing anything, find where nation count is currently determined for Humans vs Nations mode:

1. Where in the server or lobby setup code is the number of nation bots set?
2. Is there a fixed count, a percentage, or is it currently filling all remaining slots?
3. Is the lobby maximum player count available at the point where nations are assigned?

**Output:** a short note identifying the exact location and current logic.

---

### Part B — Fix

Apply the formula above at the nation assignment point identified in Part A.

The lobby maximum player count and the current human player count must both be available at that point. If either needs to be threaded through, do that as part of this task.

---

## Verification

1. Start a Humans vs Nations lobby with 2 human players in a 10-player lobby — confirm 2 nation bots join
2. Start a Humans vs Nations lobby with 4 human players in a 7-player lobby — confirm 3 nation bots join (not 4, since 4+4 > 7)
3. Fill a lobby to maximum with humans — confirm no nation bots are added
4. Solo player in a standard lobby — confirm 1 nation bot joins
5. Play a match — confirm difficulty feels meaningfully higher than before with the balanced nation count

## Notes

- This only affects Humans vs Nations mode — standard multiplayer lobbies are unchanged
- If the formula produces 0 nations (lobby full with humans), the match starts normally as a human-only match with no nations — this is acceptable behaviour
- The balancing rule is fixed, not configurable per lobby in V1. A host-adjustable ratio could be added later if players request it
