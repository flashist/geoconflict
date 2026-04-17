# Cancelled Tasks

**Date**: ongoing
**Status**: accepted

## Context

Tasks cancelled and reverted. Documented here so decisions can be revisited with better context.

Source: `ai-agents/sprints/cancelled-tasks.md`, `ai-agents/tasks/cancelled/hotfix-hf5-win-condition-bug.md`, `ai-agents/tasks/cancelled/hf11e-hotfix-build-number-automation.md`

---

## HF-5 — Win Condition Detection Bug Fix

**Sprint:** Post-Sprint 2 Hotfix
**Status:** Cancelled and reverted

**Why cancelled:** ghost-bot logic in `WinCheckExecution.ts` was more entangled than the investigation suggested. Parts A–D touched four separate files plus the archive schema — too large for a hotfix. Contradicting test instructions made it impossible to verify correctness. Merging an unverified win condition change risked breaking win detection for all match types.

**What was learned:**
- Root cause confirmed: ghost bots holding spawn territory block the win condition from reaching 80% tile ownership
- `hasActed()` flag on `Player` interface is the right mechanism to identify ghost bots
- Fix direction is correct but needs cleaner, more isolated implementation

**If revisited:**
- Scope strictly to `WinCheckExecution.ts` only — no bundled analytics or archive changes
- Require a clear, agreed test plan before any code is written
- Run against a local match with deliberately ghost-botted players
- Consider feature flag for last-standing check to enable independent rollback

---

## Feedback — Attach Match History to Submissions

**Sprint:** Sprint 3
**Status:** Cancelled and reverted

**Why cancelled:** too many moving parts — writing structured match records to localStorage on every match end, reading/trimming entries, modifying feedback payload. Not worth the complexity at this stage.

**Replacement:** `task-feedback-match-ids-simple.md` — narrower scope: read last 3 game IDs from existing `localStorage['game-records']` (no new write logic needed; `LocalPersistantStats.ts` already writes this). Match IDs alone are sufficient for archive lookup.

**What was learned:** `localStorage['game-records']` already exists and is keyed by game ID. The simpler approach should have been the starting point.

---

## HF-11e — BUILD_NUMBER Automation

**Sprint:** Sprint 3
**Status:** Cancelled — not needed

**Why cancelled:** HF-11a investigation confirmed BUILD_NUMBER is already fully automated via `scripts/bump-version.js` in `build-deploy.sh`. Hypothesis 4 (manual version error) ruled out. No action needed.

## Related

- [[decisions/product-strategy]] — overall strategic context
- [[decisions/sprint-3]] — sprint where feedback-match-ids and HF-11e were active
- [[decisions/hotfix-post-sprint2]] — sprint where HF-5 was attempted
- [[decisions/stale-build-zombie-tabs]] — HF-11e context
