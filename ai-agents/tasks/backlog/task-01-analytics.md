# Task 1 — Basic Analytics: Session & Match Event Tracking

## Context

Geoconflict currently has no analytics. We are making a series of improvements to player retention and onboarding, and we need to be able to measure whether those improvements are working. This task establishes the baseline measurement system that all future decisions will rely on.

Without this data we cannot answer basic questions like: how many players who join a lobby actually play through to the end of a match? Are mobile players abandoning more than desktop players? Where exactly do new players drop off?

## Goal

Implement an analytics system that tracks key player and match events, and stores them in a way that allows us to query and analyze the data later. The choice of storage and tooling is up to the developer — a simple self-hosted solution is perfectly fine, we do not need a complex setup at this stage.

## Events to Track

The following events are the minimum we need. If the developer sees other obviously useful events to add along the way, that is welcome.

**Match lifecycle:**
- Match started (including: map name, number of human players, number of bots, game mode)
- Match completed (including: duration, winning player/team, number of players who were still active at the end)

**Player lifecycle within a match:**
- Player joined a match
- Player was eliminated (including: at what point in the match, by whom if available)
- Player abandoned a match (closed the tab or disconnected without being eliminated)

**Session:**
- Session started (player opened the game)
- Session duration (how long the player was active before leaving)

**Device / platform context** (attach to all events where possible):
- Whether the player is on mobile or desktop
- Whether the player is logged in via Yandex or anonymous

## What "Done" Looks Like

- All the above events are being recorded when they occur in live games
- The data is queryable — meaning someone can run a query and answer questions like "what percentage of players who start a match complete it?" or "how does session duration differ between mobile and desktop users?"
- There is a basic README or note explaining how to access and query the data, so that a non-developer can understand what is available
- The implementation does not affect game performance or determinism — analytics must be a side-effect that cannot interfere with the game logic

## Notes

- Geoconflict's game logic is deterministic and tick-based. Any analytics implementation must be careful not to introduce anything into the core game logic (`src/core/`) that could affect this. Analytics should be treated as an outside observer, not a participant.
- Player privacy: we do not need to track personally identifiable information. An anonymous session ID or the existing `persistentID` (already part of the auth system) is sufficient to correlate events from the same player.
- This is a foundation task. It does not need to be perfect or exhaustive — it needs to be working and queryable so that we can start making data-informed decisions.
