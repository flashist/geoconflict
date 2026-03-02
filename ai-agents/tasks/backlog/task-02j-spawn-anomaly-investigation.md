# Task 2j — Spawn Behavior Anomaly Investigation (Urgent)

## Context

Funnel 7 (Spawn Behavior) is showing an unexpected and extreme discrepancy between desktop and mobile spawn completion rates:

- **Desktop:** 8.8% of players who started a match completed the spawn phase (`Match:SpawnChosen`)
- **Mobile:** 78.7% of players who started a match completed the spawn phase

This is a 9x gap in the wrong direction — we expected mobile to perform worse than desktop, not dramatically better. A 91.2% drop-off rate on desktop means that the vast majority of desktop players who join a match are not spawning at all. Either the game has a severe undiscovered UX problem on desktop, or the `Match:SpawnChosen` event is not firing correctly for desktop players.

This must be investigated before drawing any conclusions from Funnel 7 data, and before Task 4a (auto-spawn) is designed around assumptions that may be wrong.

## Hypotheses to Investigate (in priority order)

### Hypothesis 1 — Event listener is touch-only (most likely)

The `Match:SpawnChosen` event may be triggered by a touch event listener (`touchstart`, `touchend`, or `touchmove`) rather than a universal input handler that covers both touch and mouse click. If this is the case:

- Mobile players trigger the event correctly via tap
- Desktop players click with a mouse, which does not trigger a touch event, so the event never fires
- The 9x gap is entirely a measurement artifact — desktop players are spawning normally, we just aren't recording it

**How to verify:** find the code that fires `Match:SpawnChosen` and check which input events trigger it. If it only listens for touch events, add mouse click handling (`click` or `mousedown`) and redeploy. The desktop rate should jump to something comparable to mobile after the fix.

### Hypothesis 2 — Event fires before `Game:Start` on desktop (timing issue)

GameAnalytics funnels require strict chronological ordering. If `Match:SpawnChosen` fires before `Game:Start` on desktop due to a race condition or timing difference in how the game initializes on desktop vs mobile, the funnel will not count it as a completed step 2.

**How to verify:** check the absolute event volume of `Match:SpawnChosen` on desktop in the GameAnalytics Explore tool, independent of the funnel. If the raw event count looks reasonable (similar to mobile proportionally), the event is firing but being excluded from the funnel due to ordering. If the raw count is near zero, the event is not firing at all.

### Hypothesis 3 — Spawn UI is broken or invisible on desktop

The spawn click target may be significantly smaller, mispositioned, or non-functional specifically on desktop screen sizes or with mouse input. This could cause genuine UX failure where desktop players cannot figure out how to spawn.

**How to verify:** manually test the spawn phase on desktop in multiple browsers (Chrome, Firefox, Safari if available). Attempt to spawn using mouse click. If the spawn phase is genuinely broken on desktop, this would be a critical bug independent of the analytics question.

### Hypothesis 4 — Aggregation is incomplete

GameAnalytics states 24–48 hours for full aggregation of new Design Events. If the data was checked at approximately 24 hours, desktop and mobile events may have aggregated at different rates, producing a temporarily skewed picture.

**How to verify:** wait a full 48 hours from when the events first fired and recheck the funnel. If the desktop number moves significantly toward the mobile number, aggregation timing was the cause. If it remains at ~8.8%, the problem is real.

---

## Investigation Steps

The developer should complete the following in order:

1. **Check the `Match:SpawnChosen` trigger code** — identify exactly which input events cause this event to fire. Document whether it handles mouse input, touch input, or both. This is the highest-priority check and takes 5 minutes.

2. **Check raw `Match:SpawnChosen` event volume in Explore** — filter to `Device:desktop` and look at absolute event counts. Compare to `Device:mobile`. If desktop count is near zero in absolute terms, the event is not firing. If it's proportional but the funnel still shows 8.8%, the issue is ordering.

3. **Manually test spawn on desktop** — open the game on desktop in Chrome, join a multiplayer match, and attempt to spawn by clicking. Verify the spawn registers and the player appears on the map. Test in at least one other browser.

4. **Check `Game:Start` and `Match:SpawnChosen` timestamps on desktop** — if possible, look at event logs for a small sample of desktop sessions to verify that `Game:Start` is firing before `Match:SpawnChosen`. If the order is reversed in any sessions, there is a timing issue.

5. **Recheck funnel after 48 hours** — if the investigation finds no code issue, wait for full aggregation and recheck.

---

## What "Done" Looks Like

- The root cause of the desktop/mobile discrepancy is identified and documented
- If the cause is a code bug (touch-only listener, timing issue, broken spawn UI): the bug is fixed and deployed
- After the fix is deployed, `Match:SpawnChosen` fires correctly for desktop mouse clicks
- Funnel 7 desktop rate is rechecked after 48 hours of new data — the rate should move significantly from 8.8% if the fix was correct
- A short written summary of findings is shared with the team regardless of outcome — even if the cause turns out to be aggregation timing, that conclusion should be documented

---

## Why This Is Urgent

If Hypothesis 1 is correct — touch-only event listener — then:
- We have no accurate measurement of desktop spawn behavior at all
- Task 4a (auto-spawn) is being designed without knowing the real desktop spawn drop-off rate
- Every funnel that includes `Match:SpawnChosen` as a step is producing incorrect data for desktop

The fix itself (adding mouse click handling) is likely trivial — an hour of work at most. The investigation is what needs to happen immediately.

## Dependencies and Notes

- This task does not block Task 3 (mobile quick wins) from continuing in parallel
- If the fix requires changes to how `Match:SpawnChosen` is triggered, the event name and enum key must follow the unified naming convention (`Match:SpawnChosen` — already correct)
- After any fix is deployed, allow 48 hours before reading the updated funnel data
