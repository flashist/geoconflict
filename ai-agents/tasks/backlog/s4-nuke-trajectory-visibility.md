# Task — Nuke Pre-Launch Trajectory: Increase Line Thickness

## Sprint
Sprint 4

## Priority
Medium — visual polish, independent of all other Sprint 4 tasks.

---

## Context

When a player clicks the nuke button and moves their cursor to select a target, the game renders a trajectory arc. Players find this line hard to see. The goal is to make it more visible, starting with increased thickness. Mark will review the result and decide whether further tuning is needed.

This is an iterative visual task. The first iteration ships a thickness increase. Further changes (color, opacity, glow, etc.) are out of scope until Mark reviews and explicitly requests them.

---

## What to Build

### 1. Find the trajectory render code

Locate where the nuke pre-launch trajectory is drawn. The likely location is in `src/client/graphics/layers/` — search for the rendering layer that handles nuke targeting or attack arc preview. Identify the specific line/graphics call that draws the trajectory and what visual parameters it currently uses (thickness/line width, color, alpha/opacity).

### 2. Increase line thickness

Increase the trajectory line width to make it clearly more visible than the current value. A reasonable starting point is 2–3× the current thickness, but use visual judgment when testing — the goal is "noticeably bolder" without being distracting.

Do not change color, opacity, or any other visual property in this iteration.

### 3. Test in the game

Verify the change by launching a match with nukes available, clicking the nuke button, and moving the cursor across the map. Confirm the trajectory arc is visibly bolder than before and renders cleanly at different zoom levels.

---

## Review Gate

After implementing and testing, flag Mark for a visual review before closing the task. Share a screenshot or short screen recording of the trajectory in action. Mark will confirm whether the result is acceptable or provide feedback for a follow-up tuning pass.

Do not close this task or mark it done until Mark has reviewed the visual result.

---

## Verification

1. **Trajectory visible:** nuke pre-launch arc is clearly more visible than before the change.
2. **Clean rendering:** line renders without artifacts at various zoom levels and map positions.
3. **No regression:** nuke launch behaviour, damage, and all other nuke mechanics are unaffected.
4. **Review done:** Mark has confirmed the visual result is acceptable.

---

## Notes

- This task covers thickness only. Color, opacity, glow, or animation changes are explicitly deferred until Mark requests them after review.
- If the trajectory rendering is shared with other arc/line effects in the game, be careful to change only the nuke trajectory specifically and not affect other visuals.
