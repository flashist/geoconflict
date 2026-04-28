# Task — Teams Mode: Cap Maximum Teams at 4

## Sprint
Sprint 4

## Priority
Medium — player-facing quality of life, independent of all other Sprint 4 tasks.

---

## Context

When the server auto-generates a multiplayer teams-mode lobby, it currently picks a random team count that can reach 6 or 7. With the current player base this produces lobbies that are too fragmented and hard to fill. The fix is to constrain the random range so the team count is always between 2 and 4 inclusive.

**Product decision (locked):**
- Valid team counts: **2, 3, or 4** — chosen uniformly at random by the server when generating a lobby.
- 5+ teams must not be generated.
- No weighting between 2, 3, and 4 is required — equal probability across the three values is correct.

---

## What to Build

### 1. Find the lobby generation logic

Locate the server-side code that generates teams-mode lobbies and selects the team count. The entry point is likely in `src/server/` — search for where lobbies are created automatically and where the team count is randomised. Identify the current range (min and max).

### 2. Change the range

Update the random team count selection so the result is always in `[2, 3, 4]`. If the current implementation is a random integer in a range, change the max to 4 and confirm the min is 2. If it is a weighted or enumerated list, update the list to `[2, 3, 4]` only.

Do not change any other lobby generation parameters.

---

## Verification

1. **Range enforced:** generate or simulate several teams-mode lobbies and confirm no lobby has fewer than 2 or more than 4 teams.
2. **All values reachable:** confirm 2-, 3-, and 4-team lobbies are all generated across a reasonable sample (not artificially biased toward one value).
3. **No regression:** non-teams multiplayer lobbies and all other game modes are unaffected.

---

## Notes

- This is a server-side change only. No client UI changes are needed.
- If the team count range is currently defined as a named constant or config value, keep it as a constant rather than inlining the numbers — makes it easy to adjust again as the player base grows.
