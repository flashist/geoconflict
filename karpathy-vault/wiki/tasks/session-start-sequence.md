# Session Start Analytics Sequence

**Source**: `ai-agents/tasks/done/task-02d-additional-analytics-events.md`, `task-02f-device-type-analytics.md`, `task-02g-new-returning-player.md`
**Status**: done
**Sprint/Tag**: Sprint 1

## Goal

Establish a standardised session-start event sequence that enables funnels segmented by device, OS, and new/returning player status in GameAnalytics.

## Key Changes

### Event Sequence (fires in this order on every session start)

```
Session:Start → Device:{Type} → Platform:{OS} → Player:New / Player:Returning
```

**`Session:Start`** — custom Design Event fired immediately after SDK init. Required as the top step of all funnels; the built-in SDK session event is not available in the funnel builder.

**`Device:{Type}`** — one of `Device:mobile`, `Device:desktop`, `Device:tablet`, `Device:tv`. Detected from user agent. Uses the same detection path as mobile rendering optimizations (Task 3) — the same player classified as mobile in analytics gets mobile rendering.

**`Platform:{OS}`** — one of `Platform:android`, `Platform:ios`, `Platform:windows`, `Platform:macos`, `Platform:linux`, `Platform:other`. Chrome OS → `Platform:other`.

**`Player:New` / `Player:Returning`** — fires once per session. New if first-seen flag absent (then sets flag). Server-side flag preferred; `localStorage` fallback for anonymous players.

### Session Heartbeat

`Session:Heartbeat:05`, `:10`, `:15`, etc. fire every 5 minutes while tab is active (tab visibility API gates the timer). Provides session depth curve — drop-off rate over time.

### First Action

`Session:FirstAction` fires once per session on the player's first meaningful interaction on the start screen. Measures zero-action abandonment rate.

## Outcome

Enables device-segmented and OS-segmented funnels. Critical for:
- Tutorial impact measurement (filter to `Player:New` sessions only)
- Ghost rate by device class
- Session depth comparison (mobile vs desktop)

## Related

- [[systems/analytics]] — full analytics event reference and conventions
- [[decisions/sprint-1]] — sprint where these events were shipped
- [[features/tutorial]] — primary beneficiary of `Player:New` segmentation
