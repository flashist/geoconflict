# Task — Re-enable Humans vs Nations Mode

## Priority
Sprint 3. Low effort, directly addresses player feedback asking for more play modes.

## Context

Humans vs Nations is an existing play mode where human players compete against AI-controlled nation bots. The mode was disabled early in the game's lifecycle due to insufficient concurrent player counts and some observed errors. It ships to all players — no A/B test.

Unlike Teams mode (which remains disabled), Humans vs Nations does not have a lobby composition problem. AI nations fill all non-human slots regardless of how many humans join — so the match runs correctly even if only one human player is present. This makes it safe to re-enable at current DAU levels (~4,000–4,500).

The errors observed when the mode was disabled were likely related to Teams mode lobby composition (uneven or empty team slots) rather than this mode specifically. This needs to be confirmed during the investigation step below.

## What "Done" Looks Like

**Step 1 — Investigation (do this before any code changes):**
- Identify exactly how the mode was disabled — feature flag, config value, commented-out code, UI-only hide, or server-side gate
- Check git history for the commit that disabled it and read the context — was a reason documented?
- Review whether any errors were logged specifically for Humans vs Nations at the time it was disabled, or whether the errors were Teams-mode-specific
- Confirm the mode still functions correctly in a local environment before re-enabling in production

**Step 2 — Re-enable:**
- Reverse the disable mechanism identified in Step 1
- Humans vs Nations should appear in the game mode selection UI alongside the existing All vs All mode
- No new UI, no new server infrastructure — this is a restoration of existing functionality

**Step 3 — Verify in staging/local before production deploy:**
- Solo human join: one human player joins, all other slots filled by AI nations — match starts and runs correctly
- Multiple human players: 2–3 humans join the same lobby — match starts correctly, nations fill remaining slots
- Match completes normally: win condition triggers, results screen shows correctly
- No errors in Sentry during either scenario
- Ad events fire correctly at match end (interstitial should fire the same as in All vs All)

## Error Handling Requirement

Before re-enabling, confirm there is a graceful handling path for any edge case specific to this mode. The known risk to check: what happens if a human player disconnects mid-match leaving only AI nations? The match should continue to a natural conclusion rather than erroring or hanging. If this case is not handled, add a fallback before shipping.

## Analytics

No new analytics events required — existing game events (`Game:Start`, `Game:End`, `Game:Win`, `Game:Loss`, `Match:SpawnChosen`, etc.) apply to all match types and will cover this mode automatically.

After re-enabling, it is worth monitoring via the Explore tool whether Humans vs Nations sessions show meaningfully different session lengths or win rates compared to All vs All. No new instrumentation needed — the existing events provide sufficient data.

## What Stays Disabled

Teams mode remains disabled. The lobby composition error (match starting with empty or uneven team slots) has not been fixed and requires a separate task before Teams can be safely re-enabled. Do not re-enable Teams as part of this task.

## Notes

- If Step 1 reveals that re-enabling requires more than reversing a single flag or config — for example, if substantial server-side code was removed rather than just gated — escalate before proceeding. The effort estimate assumes restoration of existing code, not a rebuild.
- If any Sentry errors appear in the first 48 hours after re-enabling that are specific to this mode, disable it again immediately and investigate before re-enabling.
