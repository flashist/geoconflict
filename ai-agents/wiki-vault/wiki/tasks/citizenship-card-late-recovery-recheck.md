# Citizenship Card Re-Checks Its Gate When the Platform Recovers Late (task 0329)

**Source**: `ai-agents/tasks/done/0329-citizenship-card-re-checks-its-gate-when-the-platform-recovers-late/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 42 / task `0329` (brief B2 of the `0318` report)

> ✅ Done (agent-closed — not owner-verified). Committed in `68303d5`. 🚨 **The reveal after a late recovery is
> proven by unit tests only, never live** — the local harness never recovers, and the page was not opened.

## Goal

Fix the permanence found by `0318`: the card read `citizenship_ui` once; if the SDK recovered late, the facade
recovered flags, payments and player, but **nothing told the card**, so it stayed hidden until the next load —
and because a hidden card publishes no citizenship status, a paying citizen also lost the private-lobby perk
(`unknown` reads as locked) for that page. This is `0049`'s own scheduled *"revisit if …"* — **not a reversal**.

## Key Changes

- **Owner ruling Q1 (verbatim):** **"Always when hidden (Recommended)"** — the card listens whenever the flag
  check hides it; on the signal it re-reads the flag and reveals **only if it is really on** (`0291`
  fail-closed kept).
- **Facade:** a once-only `whenPlatformRecoveredLate()` signal, fired from the late-recovery branch after the
  flags re-fetch and the player recovery (capped at the 5 s deadline) settle, and only after a degraded boot.
- **Card:** the show path moved verbatim into `revealCard()` — **no second code path** for showing the card;
  the re-read goes through `refreshProfile()` (the single read path `0326` requires).
- **Review R1 (owner: *"Fix before closing"*):** a late reveal could open the tenure popup over a live match and
  skip `Citizenship:Seen`. New `src/client/StartScreenPresence.ts`; `Main.ts` registers "away while
  `gameStop` is set" and reports the return; the card waits for the start screen before revealing.
  **R2** (owner: *"Record as accepted"*): the disconnect lifecycle of the late reveal — accepted residual with
  its future fix named. **R3** (owner: *"Accept + file own bug"*): a reveal that starts during a quick-join's
  setup can still open the gift popup as the player enters a lobby — filed as **`0336`**, end of Sprint 7.
  🆕 **`0336` closed 2026-09-30** `(agent-closed — not owner-verified)`, committed, not yet released — the popup now
  waits for the start screen and a match start closes it; it deliberately reversed one of this task's pinned
  gate-reveal test assertions (owner-ruled). See [[tasks/tenure-popup-never-over-match]].

## Outcome

- **Evidence:** the "late recovery → shown" test red on the old code, green after; full `npm test` 173 suites /
  3064 tests after review (first run).
- **Owner, after release (informational):** compare page loads with flags and `Citizenship:Seen` against
  `Session:Start` before and after, with `Session:PlatformRecovered` ([[tasks/platform-degraded-analytics-event]]).
- ⚠️ **Not verified:** any live reveal; the lobby/match wait in a browser.

## Related

- [[tasks/citizenship-card-vanishes-investigation]] — task `0318`, the root cause
- [[tasks/citizenship-card-newest-profile-read]] — task `0326`, the stale-read guard this depended on
- [[tasks/sdk-loader-download-retry]] — task `0330`, whose post-deadline successes this makes visible
- [[tasks/citizenship-card-fail-closed-degraded-sdk]] — task `0291`, fail-closed (kept)
- [[tasks/degraded-mode-ux-treatment]] — task `0049`, whose deferred late-recovery refresh this revisits
- [[tasks/private-lobby-citizen-perk]] — task `0302`, the perk a hidden card left locked
- [[tasks/tenure-xp-grant]] — the gift popup review R1 kept off a live match
- [[systems/flashist-init]] — the late-recovery branch and the new signal
- [[decisions/sprint-7]] — `0336`, the residual review R3 filed
- [[tasks/tenure-popup-never-over-match]] — task `0336`, which fixed review R3 (closed 2026-09-30)
- [[decisions/sprint-6]] — the board carrying this task
- [[systems/analytics]] — the analytics system page; this task's events are listed there
- [[tasks/match-exit-keeps-query-string]] — task `0331`, B4 of the same report
