# Tutorial — Lock Build Menu to City During Tooltip 5

**Source**: `ai-agents/tasks/done/s4-tutorial-build-menu-lock.md`
**Status**: done
**Sprint/Tag**: Sprint 4

## Goal

Prevent players from stalling the tutorial by building the wrong structure during tooltip 5, which expects the first City to be constructed.

## Key Changes

- `src/client/graphics/layers/TutorialLayer.ts` exposes `isRestrictedToCityBuild()`, which stays active from the moment tooltip 5 has been shown until the first City is detected or the tutorial is skipped.
- `src/client/graphics/layers/RadialMenuElements.ts` reuses the normal disabled-state path for build items: when the tutorial restriction is active, every non-City structure is marked disabled while the City option remains enabled.
- The implementation intentionally keeps the restriction active after tooltip dismissal; removing it on dismiss would reopen the exact failure path the fix is meant to prevent.

## Outcome

Tooltip 5 can no longer be broken by an accidental non-City build. The tutorial still uses the normal build menu and normal "disabled" feedback, but the only actionable structure during that step is City.

## Related

- [[features/tutorial]] — tutorial flow and tooltip sequencing
- [[decisions/sprint-4]] — sprint that carried this follow-up bug fix
- [[tasks/tutorial-no-nations]] — companion tutorial safety simplification
