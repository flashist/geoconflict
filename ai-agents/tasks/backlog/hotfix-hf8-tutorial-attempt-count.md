# HF-8 — Tutorial Attempt Number on Tutorial:Started Event

## Priority
Post-Sprint 2 hotfix. Small task, high analytical value — directly enables distinguishing "player who started once and abandoned" from "player who restarted repeatedly."

## Context

`Tutorial:Started` currently fires with no value, making it impossible to tell whether the gap between 2.9K starts and 731 completions+skips is caused by:
- ~2,200 unique players abandoning the tutorial once, or
- A smaller pool of players restarting the tutorial many times

These require completely different responses. Extending `Tutorial:Started` with a lifetime attempt count resolves the ambiguity without adding a new event or breaking existing funnels.

## What Changes

### localStorage

Add a new key `tutorialAttemptCount` (integer) alongside the existing `tutorialCompleted` key.

- Read the current value on each `Tutorial:Started` fire
- Increment by 1
- Write the incremented value back to localStorage
- Send the incremented value as the event value

```typescript
const ATTEMPT_KEY = "tutorialAttemptCount";

function getTutorialAttemptCount(): number {
  const stored = localStorage.getItem(ATTEMPT_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

function incrementAndGetAttemptCount(): number {
  const next = getTutorialAttemptCount() + 1;
  localStorage.setItem(ATTEMPT_KEY, String(next));
  return next;
}
```

### Tutorial:Started event

At the point where `Tutorial:Started` is currently fired, replace the existing call with:

```typescript
const attemptNumber = incrementAndGetAttemptCount();
GameAnalytics.addDesignEvent("Tutorial:Started", attemptNumber);
```

`attemptNumber` will be 1 on the player's first ever tutorial start, 2 on their second, and so on — persisted across page loads and sessions indefinitely.

## What This Enables in GameAnalytics

**Average value on Tutorial:Started** — if the average value is significantly above 1.0, restart loops are a major factor in the start count inflation.

**Event value distribution** — in GameAnalytics Explorer, filter `Tutorial:Started` and look at the value breakdown:
- Mostly 1s → the gap is dominated by first-time abandonment, not restarts
- Long tail of high values → a subset of players is restarting many times

**Cross-event analysis** — players who fire `Tutorial:Completed` or `Tutorial:Skipped` with a high attempt number had to restart several times before finishing. If completion only happens at attempt 3+ for many players, the tutorial difficulty or flow has a specific failure point worth investigating.

## What This Does NOT Change

- The event name `Tutorial:Started` is unchanged — existing funnels continue to work
- `Tutorial:Completed` and `Tutorial:Skipped` are unchanged — no value needed there since they fire at most once per player in normal flow
- No GameAnalytics dashboard configuration required — design event values are accepted without pre-registration

## Notes

- **localStorage cleared:** if a player clears localStorage, `tutorialAttemptCount` resets to 0 and the next start fires as attempt 1 again. This is acceptable — there is no reliable way to persist across localStorage clears in a browser game without a server-side account system.
- **tutorialCompleted gate:** the tutorial is only shown when `tutorialCompleted` is not set. If `tutorialCompleted` is already set, `Tutorial:Started` will never fire and the attempt counter is irrelevant. The counter only accumulates while the player is still in the tutorial-eligible state.
- **Depends on HF-7:** if HF-7 (build number custom dimension) ships first, the attempt count data will immediately be segmentable by build — recommended deploy order is HF-7 then HF-8.
