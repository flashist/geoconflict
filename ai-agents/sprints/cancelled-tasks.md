# Geoconflict — Cancelled Tasks

Tasks listed here were cancelled and reverted. The reason for cancellation is documented for each task so the decision can be revisited with better context in the future.

---

## HF-5 — Win Condition Detection Bug Fix

**Original brief:** `hotfix-hf5-win-condition-bug.md`
**Status:** Cancelled and reverted
**Sprint:** Post-Sprint 2 Hotfix

### Reason for Cancellation

The implementation became too large and too risky to merge into the main branch safely:

- The ghost-bot logic in `WinCheckExecution.ts` turned out to be more entangled with the rest of the win condition system than the investigation suggested
- The technical specialist provided contradicting instructions about how to test the fix, making it impossible to verify correctness with confidence
- The scope expanded beyond what is appropriate for a hotfix — Parts A through D touched four separate files plus the archive schema
- Merging an unverified change to the win condition check into production risked breaking win detection for all match types, not just the singleplayer ghost-bot case

### What Was Learned

- Root cause is confirmed: ghost bots holding spawn territory prevent the win condition from reaching 80% tile ownership
- The `hasActed()` flag on the `Player` interface is the right mechanism to identify ghost bots
- The fix direction is correct but needs a cleaner, more isolated implementation with unambiguous test coverage before it is attempted again

### If Revisited

- Scope strictly to `WinCheckExecution.ts` only — do not bundle analytics or archive changes in the same PR
- Require a clear, agreed test plan before any code is written
- Run the fix against a local match with deliberately ghost-botted players before merging
- Consider a feature flag to enable/disable the last-standing check independently so it can be rolled back without a full revert

---

## Feedback — Attach Match History to Submissions

**Original brief:** `task-feedback-match-history.md`
**Status:** Cancelled and reverted
**Sprint:** Sprint 3

### Reason for Cancellation

Implementation became messier than expected and was cancelled in favour of a simpler, safer replacement task. The original scope included writing structured match records to localStorage on every match end, reading and trimming entries, and modifying the feedback payload — too many moving parts for the debugging value it provided at this stage.

A replacement task has been created with a narrower scope: attach only the raw match IDs from the existing `localStorage['game-records']` structure without any new write logic. See `task-feedback-match-ids-simple.md`.

### What Was Learned

- `localStorage['game-records']` already exists and is keyed by game ID — new write logic is unnecessary
- Match IDs alone are sufficient for archive lookup and match replay
- The simpler approach should have been the starting point
