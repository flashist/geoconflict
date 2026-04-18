# Tutorial — Remove Nations, Keep Only Bots

**Source**: `ai-agents/tasks/done/s4-tutorial-no-nations.md`
**Status**: done
**Sprint/Tag**: Sprint 4

## Goal

Make the tutorial trivially safe to complete by removing nation-controlled opponents and leaving only the smaller tutorial bots.

## Key Changes

- `src/client/LocalServer.ts` handles the tutorial path inside `buildMissionConfigIfNeeded()` and now sets `config.disableNPCs = true`, which removes nation-controlled opponents from tutorial matches.
- The Iceland tutorial map and tutorial-specific onboarding flow stay unchanged; this is a config-only safety adjustment rather than a gameplay-system rewrite.
- Normal non-tutorial singleplayer and public-match setup paths still use their existing mission and nation configuration logic.

## Outcome

The tutorial no longer includes aggressive nation territories, so first-time players are much less likely to lose before they understand the controls. The change pairs with the tooltip-5 City lock as a narrower, lower-risk tutorial polish path than the later-cancelled action-pause idea.

## Related

- [[features/tutorial]] — tutorial feature behavior and follow-up context
- [[decisions/sprint-4]] — sprint that scheduled the tutorial simplification work
- [[tasks/tutorial-build-menu-lock]] — companion tutorial guardrail shipped in the same sprint
