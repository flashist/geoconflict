# Task — Tutorial: Pause Game During Action-Required Tooltips

## Sprint
Sprint 4

## Priority
Medium — improves tutorial completion rate by eliminating the risk of a player being killed by bots while reading instructions or performing required actions.

## Context

The tutorial already uses a near-pause mechanic during tooltips — `ReplaySpeedChangeEvent(100)` sets the tick interval to 100× normal, effectively freezing the game while a tooltip is displayed. Speed is restored when the tooltip is dismissed.

However, this near-pause only applies while the tooltip modal is visible. Some tutorial steps require the player to perform an action (e.g. open the build menu, build a city, tap a territory) — and the game resumes at normal speed the moment they dismiss the tooltip to perform that action. If the player is slow or confused, bots can attack and eliminate them during this window.

The fix: keep the game paused (near-paused at 100× interval) not just during tooltip display, but throughout the entire window until the required action is completed.

---

## Which Tooltips Need Action Pausing

Review the 7-step tooltip sequence and identify which steps have a required player action after dismissal:

| Tooltip | Content | Action required after dismiss? |
|---|---|---|
| 1 | Choose starting position | ✅ Yes — player must tap to spawn |
| 2 | Tap neighbour to attack | ✅ Yes — player must attack |
| 3 | Enough gold to build City | No — informational, leads directly to tooltip 4 |
| 4 | Right-click / tap your territory | ✅ Yes — player must open radial menu |
| 5 | Open build menu → select City | ✅ Yes — player must build a city |
| 6 | Cities increase max population | No — informational, leads to tooltip 7 |
| 7 | Ready for real matches | No — final tooltip, no action needed |

Tooltips 1, 2, 4, and 5 should keep the game paused after dismissal until the expected action is detected.

---

## Part A — Investigation

Before implementing, confirm in `TutorialLayer.ts`:

1. Where is `ReplaySpeedChangeEvent(100)` fired (pause) and where is it restored (unpause)?
2. What events/conditions currently advance the tooltip sequence — e.g. what signals "player has spawned" for tooltip 1, "player opened radial menu" for tooltip 5?
3. Is there a single "unpause" call site, or multiple? A single site is easier to gate.

**Output:** a short note on the pause/unpause call sites and the action-detection conditions already in place.

---

## Part B — Fix

For each action-required tooltip (1, 2, 4, 5), keep the game near-paused (`ReplaySpeedChangeEvent(100)`) after the tooltip is dismissed and only unpause when the expected action is detected.

**Implementation pattern:**

```typescript
// On tooltip N dismissed:
// Do NOT call unpause yet
// Set a flag: waitingForAction = true

// In the game state update listener:
// When the expected action is detected (spawn chosen, attack sent, radial menu opened, city built):
//   if (waitingForAction) { unpause(); waitingForAction = false; }
//   advance to next tooltip
```

The action-detection signals are already present in `TutorialLayer.ts` — they currently trigger tooltip advancement. The change is to also trigger unpause at the same moment.

**Edge case — Skip button:** if the player clicks Skip while the game is paused between a dismissed tooltip and their action, unpause immediately before navigating away. Do not leave the game paused on skip.

**Edge case — player already performed the action before dismissing the tooltip:** if the expected action fires before the tooltip is dismissed (e.g. player accidentally spawns before reading tooltip 1), the game should unpause immediately and advance normally. No regression from current behaviour.

---

## Verification

1. Tooltip 1 (spawn): dismiss tooltip, do not tap to spawn — confirm bots cannot attack you during the wait. Tap to spawn — confirm game resumes.
2. Tooltip 2 (attack): dismiss tooltip, wait — confirm bots are near-frozen. Tap a neighbour to attack — confirm game resumes.
3. Tooltip 4 (radial menu): dismiss tooltip, wait — confirm near-frozen. Open radial menu — confirm game resumes.
4. Tooltip 5 (build city): dismiss tooltip, wait — confirm near-frozen. Build city — confirm game resumes.
5. Skip button during paused window: confirm game unpauses before navigation.
6. Tooltips 3, 6, 7: confirm these still unpause immediately on dismiss as before — no regression.

## Notes

- The existing 100× near-pause is sufficient — a full stop (`ReplaySpeedChangeEvent(Infinity)` or equivalent) is not needed. 100× is already imperceptible as movement to the player.
- This task does not change the tooltip content or sequence — only the pause duration.
- Interaction with Tutorial map bots task (no Nations): once both tasks ship, tutorial difficulty is further reduced — players are safer both because the game is paused during actions and because only Easy bots are present.
