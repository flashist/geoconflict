# Task — AGPL: Build Pipeline Audit for Proprietary Assets

## Sprint
Sprint 4 — prerequisite before paid citizenship goes live

## Priority
Medium. Must be clear before monetization scales. Does not block the Source Code link or public repo tasks.

## Context

GeoConflict may only use assets from OpenFront's `/resources` directory (CC BY-SA 4.0) or original GeoConflict assets. Assets from `/proprietary`, the OpenFront CDN, OpenFront database, or OpenFront API are off-limits (All Rights Reserved). Including them in the production bundle constitutes infringement.

The build pipeline has not been formally audited since the fork. This investigation is a one-time check to confirm no prohibited assets are bundled.

Source: `ai-agents/knowledge-base/GeoConflict-Licensing-Brief.md`

## What to Investigate

**Part 1 — Build pipeline scan**
- Check Webpack config and output bundle for any references to OpenFront CDN domains or external OpenFront URLs loaded at runtime
- Check `src/` for any `fetch` or `import` statements pointing to OpenFront-hosted resources
- Check the `resources/` directory for any assets that originated from `/proprietary` rather than `/resources` (compare against the OpenFront fork's file history if needed)
- Confirm the client does not call any OpenFront API endpoints at runtime

**Part 2 — Asset inventory**
Produce a brief inventory noting:
- Assets in use that came from OpenFront `/resources` (CC BY-SA — allowed with attribution)
- Any original GeoConflict-authored assets
- Any third-party assets and their licenses

**Part 3 — Attribution coverage check**
Verify that assets sourced from OpenFront `/resources` have attribution somewhere in the repository (LICENSE-ASSETS, LICENSING.md, or an in-game credits location).

## Deliverable

A short findings note in `ai-agents/knowledge-base/` (e.g., `s4-licensing-asset-audit-findings.md`) that either:
- Confirms the build is clean and attribution is in place, or
- Lists specific violations with proposed remediation steps

If violations are found, a follow-up implementation task will be scoped from the findings.

## Verification

- The findings document exists and covers all three audit parts
- No OpenFront CDN or API references remain in the production client bundle
- No `/proprietary` assets are present in `resources/` or the build output
- Attribution for CC BY-SA assets is documented

## Notes

- This is an investigation, not an implementation task — scope the fix only after findings are confirmed
- If the audit is clean, no further action is needed beyond recording the outcome
- If any `/proprietary` assets are found, they must be replaced or removed before monetization goes live — do not ship paid citizenship with unlicensed assets
