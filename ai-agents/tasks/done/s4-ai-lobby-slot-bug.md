# Task — AI Player Lobby Slot Bug: AI Players Must Yield to Real Players

## Sprint
Sprint 4

## Priority
High — blocking bug. When it triggers, a lobby reaches max capacity with a mix of real and AI players, the game does not start, and real players cannot join. The lobby is stuck until the timeout expires.

## Bug Description

AI players trickle into lobbies over time (approximately one every N seconds, up to ~8–10 during the 2-minute wait window). Real players also join during this window. If the combined count of real + AI players coincidentally reaches `lobby_max`, the lobby hits 10/10 in a mixed state where:

- Real players cannot join — the lobby appears full
- The game does not start — the "lobby full" start condition does not handle the mixed real+AI state correctly
- The lobby is stuck

## Expected Behaviour

**AI players are soft placeholders.** Whenever a real player joins and the lobby is at `lobby_max`, one AI player must be removed immediately to free a slot. This keeps at least one slot always available for real players as long as any AI players remain.

**Example for a 10-player lobby:**

| Event | Real players | AI players | Total | Action |
|---|---|---|---|---|
| AIs trickle in | 0 | 8 | 8 | — |
| Real player joins | 1 | 8 | 9 | — (slot free) |
| Real player joins | 2 | 8 | 10 | Remove 1 AI → 9/10 |
| Real player joins | 3 | 7 | 10 | Remove 1 AI → 9/10 |
| Real player joins | 4 | 6 | 10 | Remove 1 AI → 9/10 |
| ... | ... | ... | ... | ... |
| Real player joins | 9 | 1 | 10 | Remove last AI → 9/10 |
| Real player joins | 10 | 0 | 10 | Lobby full — game starts |

**Game start conditions:**
- Timeout expires → game starts with whoever is present (real + remaining AI players)
- Lobby reaches `lobby_max` with **zero AI players remaining** → game starts immediately

---

## Part A — Investigation

Before fixing, find the relevant code:

1. **Where does the "lobby full → start game" check happen?** Does it check total player count regardless of type, or does it distinguish real vs AI?
2. **Where is a real player added to the lobby?** This is where the displacement logic needs to be inserted — immediately after a real player joins, check if total is at `lobby_max` and an AI player is present, then remove one.
3. **How are AI players represented in the lobby?** Are they a separate list, flagged entries in the main player list, or something else? This determines how to select and remove one.

**Output:** a short note identifying the three locations above.

---

## Part B — Fix

### Fix 1 — Displace one AI when real player joins at capacity

At the point where a real player is added to the lobby, after the player is added:

```typescript
if (lobby.totalPlayers === lobby.maxPlayers && lobby.aiPlayerCount > 0) {
  removeOneAiPlayer(lobby);
}
```

This runs every time a real player joins. If the lobby was not at capacity before the join, `totalPlayers < maxPlayers` and nothing happens. If it was at capacity (due to AI players), one AI is removed and the slot is freed.

### Fix 2 — Correct the "lobby full → start game" condition

Update the auto-start trigger from:

```typescript
// Current (broken)
if (lobby.totalPlayers === lobby.maxPlayers) startGame();
```

To:

```typescript
// Fixed
if (lobby.totalPlayers === lobby.maxPlayers && lobby.aiPlayerCount === 0) startGame();
```

This ensures the game only auto-starts when the lobby is genuinely full of real players with no AI players left to displace.

---

## Verification

1. Let AI players fill a lobby to 8/10. Join as a real player → lobby goes to 9/10, no displacement (slot was free). Join again → 10/10, one AI removed → 9/10. Confirm.
2. Continue joining real players one by one — confirm one AI is displaced per join until no AIs remain, then the final real player triggers game start.
3. Let timeout expire with a mixed lobby (e.g. 4 real + 4 AI) — confirm game starts normally with both real and AI players present.
4. Fill a lobby with real players only (no AIs involved) — confirm game starts immediately at 10/10 as before.
5. Reproduce the original bug scenario (the specific mix that caused the stuck lobby) — confirm it no longer gets stuck.

## Notes

- **Interaction with Humans vs Nations balance task:** that task targets `nation_count ≈ human_count`. After a displacement, the AI count changes — confirm the Humans vs Nations balance logic doesn't immediately re-add the displaced AI, which would cause an infinite loop. The displacement should take precedence and the re-fill timer should not fire while a real player is actively joining.
- The timeout-based game start (when no more real players arrive) is unchanged — AI players still count toward the match when the timeout fires.
