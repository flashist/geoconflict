# Task 2d — Additional Analytics Events: Session Depth & Spawn Behavior

## Context

Task 1 delivered the core analytics infrastructure and match-level events. However, two gaps remain that block important analysis:

**Gap 1 — Funnels are not possible.** GameAnalytics funnels only support Design Events and Progression Events. The built-in automatic session event that fires on SDK initialization is not available in the funnel builder. This means none of the player-conversion funnels we want to build (new player conversion, ghost player diagnosis, session quality) can be created yet. A custom `Session:Start` Design Event is required as the top step of every funnel.

**Gap 2 — Session depth is invisible.** We know whether a player opened the game and whether they finished a match, but we have no visibility into what happens between those two points. We can't tell whether players who never finish a match are dropping off after 1 minute or after 15 minutes, or whether they are losing interest between matches or during them.

This task is a small, focused addition — 4 new events — that closes both gaps and also adds direct measurement for the spawn confusion problem that Tasks 4a and 4 are addressing.

## Goal

Add 4 Design Events to the existing GameAnalytics implementation. All events must be available for all players. This task has no player-facing changes — it is purely instrumentation.

## Events to Implement

### 1. Session:Start

**When to fire:** once, on game load, immediately after the GameAnalytics SDK initializes.

**Why:** this is the only event that can serve as the top step of a funnel in GameAnalytics. Without it, no conversion funnels can be built. Every funnel we want — new player conversion, ghost player diagnosis, session quality — starts here.

**Important:** the built-in automatic session event that GameAnalytics fires internally is *not* available in the funnel builder. This custom Design Event is a separate, explicit event that must be fired in addition to the SDK's own session handling. They serve different purposes — the SDK's session event powers the Users/Sessions metrics in the dashboard; this custom event powers funnels.

---

### 2. Session:Heartbeat (every 5 minutes)

**When to fire:** on a repeating timer, every 5 minutes, while the player is active. Stop firing when the player closes the game or when the tab becomes inactive.

**Event naming:** use zero-padded minute markers so they sort correctly in the dashboard:
- `Session:Heartbeat:05` — player is still present at 5 minutes
- `Session:Heartbeat:10` — player is still present at 10 minutes
- `Session:Heartbeat:15` — player is still present at 15 minutes
- Continue for as long as is practical (30–60 minutes covers the vast majority of sessions)

**Why:** each event represents a player who is still present at that point in their session. By looking at how many players fire each heartbeat, you get a session depth curve — the drop-off rate over time. This reveals whether players are abandoning early (before 5 minutes, i.e. never even starting a match) or deeper into the session.

**Platform context is required:** attach mobile/desktop to every heartbeat event. Session depth on mobile vs desktop is one of the primary signals used to measure Tasks 3 and 5. Without platform context, the heartbeat data is much less useful.

**Inactivity:** the timer should pause or stop if the tab goes into the background or the player is inactive for an extended period, to avoid counting inactive time as session depth. What counts as "inactive" is left to the developer's judgment — tab visibility API is a reasonable signal.

---

### 3. Session:FirstAction

**When to fire:** once per session, the first time the player interacts with anything meaningful on the start screen — joining a lobby, clicking play mission, clicking singleplayer, opening instructions, or any other interactive element. Only fires once per session even if the player takes multiple actions.

**Why:** players who open the game but never trigger this event represent pure zero-action abandonment — they arrived, saw the start screen, and left without doing anything. This is the exact problem Task 4a (auto-spawn) and Task 4 (tutorial) are targeting. Tracking this event before those tasks ship establishes a baseline, and after they ship it shows whether the rate of zero-action abandonment decreased.

**Do not fire for:** passive events like the page loading, animations playing, or ads appearing. It must be a deliberate player interaction.

---

### 4. Match:SpawnChosen and Match:SpawnAuto

Two mutually exclusive events fired during the spawn phase of every match. Exactly one of these must fire per player per match — never both, never neither.

**Match:SpawnChosen** — the player actively tapped or clicked a spawn location before auto-placement triggered (or before the spawn phase ended). The player made a conscious choice.

**Match:SpawnAuto** — the player was placed automatically by the Task 4a mechanic because they did not interact during the spawn phase window.

**Note on timing with Task 4a:** before Task 4a ships, `Match:SpawnAuto` should never fire (auto-placement doesn't exist yet) and `Match:SpawnChosen` should fire for every player who successfully selected a spawn. Players who missed the spawn phase entirely and entered without a territory represent a third case — the developer should decide whether to add a `Match:SpawnMissed` event for this or handle it as an absence of either event.

**Why:** these two events directly measure the scale of the spawn confusion problem — how many players needed auto-placement vs how many chose their own spot. Over time, as players learn the mechanic through the tutorial and repeated play, `Match:SpawnChosen` should increase relative to `Match:SpawnAuto`. If it doesn't, additional guidance may be needed.

## What "Done" Looks Like

- `Session:Start` fires once on every game load, visible in GameAnalytics as a Design Event
- `Session:Heartbeat:05`, `:10`, `:15` etc. fire at the correct intervals during active sessions, with platform context attached
- `Session:FirstAction` fires once per session on the first meaningful player interaction on the start screen
- `Match:SpawnChosen` and `Match:SpawnAuto` fire correctly during the spawn phase of every match — exactly one per player per match
- All events are visible in GameAnalytics within 24–48 hours of first firing (aggregation delay is normal)
- Funnels using `Session:Start` as the first step can be created in GameAnalytics once the event has been aggregated

## Dependencies and Notes

- Depends on Task 1. The analytics infrastructure and event-sending mechanism from Task 1 must be in place. These events use the same pipeline.
- `Session:Start` and `Session:Heartbeat` must not affect game load time or performance. They are fire-and-forget calls — if the analytics call fails or is slow, it must not block anything.
- The `Session:Heartbeat` timer must be implemented independently of the game loop and rendering cycle. Use `setInterval` outside the render pipeline.
- GameAnalytics aggregates new Design Events within 24–48 hours of first receipt. Funnels cannot be built until the events have been seen and aggregated — this is expected behavior, not a bug.
- This task should ship before Task 2e (performance monitoring). Task 2e is more complex and should not block these simpler behavioral events from going live.
