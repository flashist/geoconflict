# Task 2g — New vs Returning Player Analytics Event

## Context

The session-start event sequence currently fires: `Session:Start` → `Device:Type` → `Platform:OS`.

This gives us funnel segmentation by device class and operating system. One dimension is still missing: whether the player is new or returning. GameAnalytics tracks this automatically in its summary metrics and retention tab, but — same problem as device type — it cannot segment *funnels* by this dimension without a dedicated Design Event.

This matters most for measuring the tutorial (Task 4). New and returning players behave completely differently in the conversion funnel — returning players already know how to play, so mixing them with new players dilutes the signal. To see whether the tutorial specifically improved new player conversion, the funnel needs to be run exclusively on `Player:New` sessions.

This is a half-day task — one event with two possible values, fired once per session.

## Goal

Fire a `Player:New` or `Player:Returning` Design Event once per session, immediately after `Platform:OS`, completing the session-start sequence.

Full sequence after this task ships:
```
Session:Start → Device:Type → Platform:OS → Player:New / Player:Returning
```

## Event to Implement

Exactly one of these fires per session:

- `Player:New` — the player's very first session ever
- `Player:Returning` — every subsequent session after the first

**Detection logic:** check for a first-open flag associated with the player.

- If the flag is absent: fire `Player:New`, then set the flag
- If the flag is present: fire `Player:Returning`

**Where to store the flag:** server-side player record is preferred — it survives browser cache clears and device changes, and ties correctly to the Yandex login identity for logged-in players. For anonymous players (AnonXXXX), localStorage is an acceptable fallback, with the understanding that a cache clear will reset their status to `Player:New`. This is an acceptable edge case — it affects a small proportion of sessions and does not meaningfully distort the data.

## What "Done" Looks Like

- `Player:New` fires on every genuine first session
- `Player:Returning` fires on every subsequent session
- The event appears in GameAnalytics as a Design Event within 24–48 hours of aggregation
- It is possible to build a funnel in GameAnalytics using `Player:New` as the first step, showing only new player sessions
- No visible change to the player experience whatsoever

## How This Data Is Used

**Task 4 (tutorial) measurement:** the primary use case. After the tutorial ships, run the new player conversion funnel filtered to `Player:New` sessions only — before and after. This isolates the tutorial's effect on new players specifically, without returning players obscuring the result.

**Ghost rate diagnosis:** what proportion of `Player:New` sessions result in a ghost player vs `Player:Returning` sessions? If the ghost rate is much higher for new players, the problem is onboarding. If it's similar for both, the problem is something else.

**Retention baseline:** what proportion of `Player:New` sessions are followed by a `Player:Returning` session within D+1 and D+7? This can be approximated from GameAnalytics retention data but the Design Event makes it cross-referenceable with other funnel steps.

**Long-term:** once the citizen tier (Task 8) ships, comparing citizen vs non-citizen players across new/returning segments will reveal whether citizenship is being earned by dedicated returning players as expected, or by a different profile.

## Dependencies and Notes

- Depends on Task 2d — `Session:Start` must exist as this event fires in the same sequence
- Tasks 2f and 2g are independent of each other in terms of implementation but fire in sequence — 2g fires after 2f's `Platform:OS` event
- Server-side flag storage requires coordination with whatever player identity system is already in place. If a server-side flag adds disproportionate complexity, localStorage fallback for all players is acceptable for V1 — the data quality trade-off is minor
- The 24–48 hour GameAnalytics aggregation delay applies here as with all Design Events — new/returning segmented funnels cannot be built until the event has been seen and aggregated
- Do not attempt to retroactively classify existing players as new or returning based on historical data. From the moment this event ships, all sessions are classified going forward. Historical sessions before this task shipped simply have no `Player:New/Returning` dimension — that is expected and fine
