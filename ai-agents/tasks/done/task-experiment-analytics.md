# Task — Experiment Analytics Events

## Priority
**Top priority for Sprint 3.** The tutorial experiment is live right now and control group behavior is currently invisible in analytics. Every day without this fix is a day of control group data that cannot be used for proper experiment comparison.

## Context

The tutorial experiment launched at the start of Sprint 3. Analytics currently show `Tutorial:Started` as a proxy for "player was in the experiment group" — but there is no event for players assigned to the control group. This means:

- Control group funnels cannot be built in GameAnalytics
- There is no way to compare new player behavior between the two groups
- The only data visible is the experiment group, which tells you nothing about whether the tutorial is better or worse than the baseline

The fix is small — a few lines of code — and unblocks all experiment measurement immediately.

## What "Done" Looks Like

**Two new events fired at the experiment flag evaluation point:**

| Event String | When Fired |
|---|---|
| `Experiment:Tutorial:Enabled` | Player is assigned to the tutorial experiment variant |
| `Experiment:Tutorial:Disabled` | Player is assigned to the control variant (no tutorial) |

Both events fire at the same location in `src/client/Main.ts` — immediately after the Yandex experiment flag is read, before any branching logic executes. The only difference is which event fires based on the flag value.

**Enum keys** follow the existing partial-string pattern (same as `Tutorial:TooltipShown:N`):
- Enum prefix: `EXPERIMENT_TUTORIAL_FIRST_PART` with the variant appended at runtime
- Or two separate enum keys if the developer prefers explicit keys over runtime string building — either approach is acceptable as long as the event strings match exactly

## Implementation

The firing point is the same `if` branch that currently decides whether to call `startTutorial()`:

```typescript
if (experimentEnabled && !tutorialCompleted) {
  // Fire: Experiment:Tutorial:Enabled
  startTutorial();
} else {
  // Fire: Experiment:Tutorial:Disabled
  // continue to normal lobby
}
```

This is the only code change required. No new systems, no new files.

## Convention for Future Experiments

This task also establishes a required pattern for all future Yandex experiments. Add the following rule to the analytics event reference and to any internal developer documentation:

> **Every Yandex experiment must fire a pair of `Experiment:{Name}:{Variant}` events at the flag evaluation point, for all variants including control.** This is required — without it, control group behavior is invisible and the experiment cannot be properly evaluated.

The pattern is `Experiment:{ExperimentName}:{Variant}` where both parts are PascalCase. Example for a hypothetical future spawn experiment: `Experiment:AutoSpawn:Enabled` / `Experiment:AutoSpawn:Disabled`.

## Verification

1. Open the game as a new player with the experiment flag enabled — `Experiment:Tutorial:Enabled` appears in GameAnalytics
2. Open the game as a new player with the experiment flag disabled — `Experiment:Tutorial:Disabled` appears in GameAnalytics
3. Verify neither event fires more than once per session
4. Build the following control group funnel in GameAnalytics and confirm it populates with data within 24 hours of deployment:
```
Experiment:Tutorial:Disabled → Game:Start → Match:SpawnChosen → Session:Heartbeat:05
```

## Notes

- This task has no dependencies and no risks — it is a read-only analytics addition with no effect on game logic
- Ship as a hotfix if possible rather than waiting for a full Sprint 3 deployment — the experiment is live now and data is being lost daily
- The `Tutorial:Started` event already serves as an imperfect proxy for `Experiment:Tutorial:Enabled` for historical data before this fix ships. Note this in the analytics event reference so future analysis accounts for the gap.
