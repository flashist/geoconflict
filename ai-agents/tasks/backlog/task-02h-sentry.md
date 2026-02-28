# Task 2h — Sentry Integration: Error & Crash Monitoring

## Context

We have good visibility into what players are doing (GameAnalytics), but no visibility into what the application is doing wrong. When a mobile player's tab crashes mid-match, we currently have no idea why — no stack trace, no error context, no way to distinguish a rendering crash from a network failure from an unhandled promise rejection.

Sentry fills this gap. It captures unhandled JavaScript exceptions, promise rejections, and runtime errors in real time, with full stack traces, browser context, OS context, and the sequence of events leading up to the error. Combined with the `Platform:OS` and `Device:Type` events already in place (Task 2f), this lets us say "this crash is happening specifically on Android Chrome in the rendering loop" rather than guessing.

This task should ship before Task 3 (mobile quick wins) so that the current error baseline is captured. After Task 3 ships, Sentry will show whether the errors that were causing crashes have been resolved or whether different ones have emerged.

## Goal

Integrate Sentry into the game's frontend so that all unhandled errors and crashes are captured, logged, and viewable in the Sentry dashboard with full context.

## What "Done" Looks Like

- Sentry SDK is initialized on game load, before any game logic runs
- All unhandled JavaScript exceptions are automatically captured and sent to Sentry
- All unhandled Promise rejections are captured
- Each error report includes: browser name and version, OS, device type, Sentry release tag matching the current game version
- The Sentry dashboard is receiving events and errors are visible with stack traces
- Yandex username or AnonXXXX identifier is attached to error reports where available, so errors can be correlated with specific players if needed
- No performance impact on the game — Sentry's SDK is lightweight but the developer should verify it adds no measurable frame timing overhead

## Implementation Notes

**SDK:** use the Sentry Browser SDK (`@sentry/browser`). The free tier allows 5,000 errors per month, which is sufficient at current scale.

**Initialization:** Sentry must be initialized as early as possible in the application bootstrap — before game logic, before the GameAnalytics SDK, before anything else. Errors that occur during initialization of other systems will only be captured if Sentry is already running.

**Release tagging:** configure Sentry with a `release` string matching the current game version. This allows errors to be associated with specific deployments and makes it immediately visible whether a new release introduced new crashes or resolved existing ones.

**Source maps:** upload source maps to Sentry as part of the deployment pipeline. Without source maps, stack traces will point to minified/bundled code which is very hard to read. With source maps, they point to the original source file and line number. This is the difference between a useful error report and an unreadable one. This is a required part of the task, not optional.

**User context:** where the player's identity is known (Yandex username for logged-in players, AnonXXXX for anonymous players), attach it to the Sentry scope using `Sentry.setUser()`. This allows correlating error reports with specific players — useful for following up on feedback reports where a player described a crash.

**Environment tagging:** tag events with `environment: "production"` so that any future staging or development environments can be filtered out of the production error view.

## How This Data Is Used

**Before Task 3 ships:** establishes a baseline of what errors are currently occurring on mobile. The most frequent errors in the Sentry dashboard are the highest-priority things Task 3 should address.

**After Task 3 ships:** compare the error volume and types before and after. If the crashes that were dominant before Task 3 are gone, it worked. If new errors appear, they need investigation.

**Ongoing:** any spike in error volume after a deployment is an immediate signal that something broke. Sentry can be configured to send alerts (email or Slack) when error rates exceed a threshold — recommended.

## Dependencies and Notes

- No dependencies on other tasks — this can be implemented independently and in parallel with anything else in Sprint 1
- Sentry free tier: 5,000 errors/month. At 4,000–4,500 DAU this should be sufficient unless there is a very high crash rate. Monitor usage in the Sentry dashboard and consider error sampling (`sampleRate`) if the quota is being approached
- Do not enable Sentry's session replay feature (it captures screen recordings) — Microsoft Clarity (Task 2i) handles this better and is purpose-built for it
- Source map upload should be automated as part of the existing deployment process, not a manual step
