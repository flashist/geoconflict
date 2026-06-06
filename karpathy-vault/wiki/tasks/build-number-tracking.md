# Build Number Tracking

**Source**: `ai-agents/tasks/done/hotfix-hf7-build-number.md`
**Status**: done
**Sprint/Tag**: Post-Sprint 2 hotfix / HF-7

## Goal

Segment GameAnalytics data by deployed build so metric shifts after a release can be attributed to the code version that produced them.

## Key Changes

- The original HF-7 brief shipped build segmentation through GameAnalytics Custom Dimension 01, configured immediately after SDK initialization so subsequent events carried the build value automatically.
- The original implementation required new build values to be registered in the GameAnalytics dashboard before deploy.
- This approach was superseded on 2026-06-04: build tracking now uses GameAnalytics' native build field via `GameAnalytics.configureBuild()`.
- Current build values are injected automatically from the deploy/version flow and auto-ingested by GameAnalytics; Custom Dimension 01 is no longer the build slot and is now used for device type.

## Outcome

Build segmentation remains the release-analysis baseline, but the operational burden changed. Deploys no longer require dashboard pre-registration for build values, and agents should not revive the old custom-dimension requirement when writing release guidance.

## Related

- [[decisions/hotfix-post-sprint2]]
- [[systems/analytics]]
- [[systems/project-operations]]
- [[decisions/cancelled-tasks]] — HF-11e was cancelled because build-number automation already existed
