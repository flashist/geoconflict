# Cancelled Tasks

**Date**: 2026-04-16
**Status**: accepted

## Context

Tasks cancelled and reverted. Documented here so decisions can be revisited with better context.

Source: `ai-agents/tasks/cancelled/hotfix-hf5-win-condition-bug.md`, `ai-agents/tasks/cancelled/hf11e-hotfix-build-number-automation.md`, `ai-agents/tasks/cancelled/s4-tutorial-action-pause.md`, `ai-agents/tasks/cancelled/s4-nations-balance-task.md`, `ai-agents/tasks/cancelled/s4c-fix-compact-map-boat-attack.md`, `ai-agents/knowledge-base/hvn-balance-pr70-no-ship-review.md`

---

## Decision

Keep cancelled work in one durable page instead of deleting context from the wiki. Each cancelled item records why it stopped, what was learned, and what would need to change before retrying it safely.

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

**Replacement:** `ai-agents/tasks/done/task-feedback-match-ids-simple.md` — narrower scope: read last 3 game IDs from existing `localStorage['game-records']` (no new write logic needed; `LocalPersistantStats.ts` already writes this). Match IDs alone are sufficient for archive lookup.

**What was learned:** `localStorage['game-records']` already exists and is keyed by game ID. The simpler approach should have been the starting point.

---

## HF-11e — BUILD_NUMBER Automation

**Sprint:** Sprint 3
**Status:** Cancelled — not needed

**Why cancelled:** HF-11a investigation confirmed BUILD_NUMBER is already fully automated via `scripts/bump-version.js` in `build-deploy.sh`. Hypothesis 4 (manual version error) ruled out. No action needed.

The earlier HF-7 custom-dimension implementation has also been superseded by GameAnalytics' native build field; see [[tasks/build-number-tracking]].

---

## Tutorial — Pause During Action-Required Steps

**Sprint:** Sprint 4
**Status:** Cancelled

**Why cancelled:** the task file was moved to `ai-agents/tasks/cancelled/`, but it does not record an explicit cancellation rationale. The safe conclusion is that the broader pause-window change was dropped while narrower tutorial fixes shipped separately.

**What was learned:**
- `TutorialLayer.ts` already exposes the core trigger points a future implementation would need: spawn completion, spawn-phase end, radial-menu open, and first-City build
- The shipped Sprint 4 tutorial fixes took the narrower path instead: remove nation opponents from the tutorial and lock tooltip 5 to City-only building
- Current tutorial behaviour still only near-pauses while the tooltip modal is visible; there is no shipped "stay paused until the expected action happens" state machine

**If revisited:**
- Reuse the existing tutorial trigger points in `TutorialLayer.ts` rather than inventing new detection paths
- Tie the unpause moment to the detected action, not tooltip dismissal
- Ensure skip/navigation paths always restore `ReplaySpeedMultiplier.normal` before leaving the tutorial

---

## Humans vs Nations — Balance Nation Count to Player Count

**Sprint:** Sprint 4
**Status:** Cancelled / no-ship

**Why cancelled:** the attempted implementation converted removed nation slots into regular Bots, turning a nominal Humans-vs-Nations mode into a three-faction match. It also only changed public HvN, while private and singleplayer HvN flows still exposed the old behavior.

**What was learned:**
- HvN balancing cannot be treated as a simple slot-fill formula if the result introduces `ColoredTeams.Bot` into a mode that is expected to stay Humans vs Nations.
- Product rules have to be locked before implementation: supported entry points, whether AI Players count toward the human side, and whether regular Bots are allowed at all.
- The current failed implementation is documented in [[decisions/hvn-balance-pr70-no-ship]] and should not be used as the starting point for a retry.

**If revisited:**
- Start from a fresh brief instead of reopening the rejected implementation
- Define whether HvN is strictly two-faction across public, private, and singleplayer flows
- Define the roster-counting rule before any code work starts

---

## Compact Map — Runtime Boat-Attack Fallback

**Sprint:** Sprint 4c
**Status:** Cancelled / no-ship

**Why cancelled:** live testing showed the proposed runtime fallback sends boats to semantically wrong destinations on degraded compact maps. When `closestShoreFromPlayer()` cannot find a target-owned `isShore` border tile, searching outward for the nearest surviving shore tile can select an unrelated coastline, a different territory, the far side of the landmass, or offshore islands. It also risks enabling transport attacks against genuinely landlocked territories.

**What was learned:**
- The compact-map problem is a data-loss issue: downsampling strips the stored `isShore` bit from some real coastlines.
- Runtime code cannot reliably recover the target territory's true coastline from a compact binary that has already lost that information.
- The earlier [[tasks/compact-map-click-interaction]] Option 2 fallback should be treated as rejected; the root-cause fix is to preserve or regenerate shore data for compact map binaries.

**If revisited:**
- Start from the compact map generation/regeneration task, not from the rejected `targetTransportTile()` fallback.
- Verify how `isShore` and live `isOceanShore` behave after downsampling before proposing any runtime mitigation.
- Test destination semantics in real compact matches, not just whether the boat button becomes enabled.

## Consequences

- Future retries should start from the narrower follow-up guidance recorded under each cancelled item, not from the original cancelled scope
- This page is the canonical place to resolve "was this tried already?" questions during planning

## Related

- [[decisions/product-strategy]] — overall strategic context
- [[decisions/sprint-3]] — sprint where feedback-match-ids and HF-11e were active
- [[decisions/sprint-4]] — sprint where the cancelled tutorial pause-window follow-up was planned
- [[decisions/hvn-balance-pr70-no-ship]] — no-ship review for the cancelled HvN balance attempt
- [[decisions/hotfix-post-sprint2]] — sprint where HF-5 was attempted
- [[decisions/stale-build-zombie-tabs]] — HF-11e context
- [[tasks/build-number-tracking]] — HF-7 build segmentation history and current native-build-field implementation
- [[features/tutorial]] — tutorial follow-up work and the narrower fixes that shipped instead
- [[tasks/compact-map-click-interaction]] — investigation whose proposed runtime fallback was rejected by live testing
- [[tasks/disable-compact-public-maps]] — public-rotation mitigation chosen after the runtime compact-map fallback was rejected
