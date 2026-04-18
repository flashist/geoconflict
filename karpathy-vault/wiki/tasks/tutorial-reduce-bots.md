# Tutorial — Reduce Bot Count from 400 to 100

**Source**: `ai-agents/tasks/done/s4-tutorial-reduce-bots.md`
**Status**: done
**Sprint/Tag**: Sprint 4

## Goal

Make the tutorial map less crowded so first-time players have enough space to understand the controls and tooltip flow before being overwhelmed.

## Key Changes

- The task brief's original location hint was wrong: `LocalServer.buildMissionConfigIfNeeded()` does not set tutorial bot count.
- The actual shipped change lives in `src/client/Main.ts`, where the tutorial `join-lobby` config now sends `bots: 100` instead of `bots: 400`.
- Non-tutorial matches still use their normal bot-count logic, so the scope stays limited to the tutorial onboarding path.

## Outcome

The Iceland tutorial is materially calmer and easier to read. Together with removing nations and locking tooltip 5 to City-only building, this gives new players more time to follow the scripted tutorial instead of reacting to full-match chaos.

## Related

- [[features/tutorial]]
- [[decisions/sprint-4]]
