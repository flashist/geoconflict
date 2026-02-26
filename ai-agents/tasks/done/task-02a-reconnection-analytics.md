# Task 2a — Reconnection Analytics Instrumentation

## Context

The tab crash reconnection feature (Task 2) is already implemented. When a player's browser tab crashes or closes unexpectedly mid-match and they reopen the game, they are shown a prompt offering to rejoin their active match.

However, there is currently no tracking on this flow. Without it, we have no way to answer basic questions: how often do players actually encounter the reconnection prompt? Do they use it? Does it work when they do? General match completion analytics (Task 1) are not granular enough to answer these questions — we need events specific to the reconnection flow itself.

## Goal

Add analytics event tracking inside the existing reconnection flow so we can measure how often the problem occurs, how players respond to the prompt, and whether reconnection attempts succeed or fail.

## Events to Track

Five events cover the complete reconnection funnel:

**1. Reconnection prompt shown**
A player opened the game and was shown the rejoin prompt. This is the top of the funnel — it tells us how frequently unexpected exits and crashes actually occur in practice.

**2. Reconnection accepted**
The player tapped or clicked the rejoin button. Combined with the event above, this gives the prompt's conversion rate.

**3. Reconnection declined**
The player dismissed the prompt and went to the main menu instead. Knowing the decline rate helps us understand whether the prompt design or messaging needs improvement.

**4. Reconnection succeeded**
The player accepted the prompt and was confirmed as active in the match. This is distinct from "accepted" — a rejoin attempt could be accepted by the player but still fail on the server side if the match ended in the brief window between prompt display and the actual rejoin request.

**5. Reconnection failed**
The player accepted the prompt but the server reported the match had already ended, or the player had been eliminated by the time the rejoin was attempted.

## What "Done" Looks Like

- All five events above are tracked and appear in the analytics system (Task 1)
- Each event includes the standard platform context: mobile vs desktop, Yandex login status
- It is possible to query the full funnel: how many prompts were shown → how many accepted → how many succeeded
- No changes to the reconnection behavior itself — this task is instrumentation only

## Notes

- The five events form a diagnostic funnel. Without events 4 and 5 specifically, it is impossible to distinguish between "the feature works but players don't use it" and "the feature is broken and rejoin attempts are silently failing." Both of those are critically different problems requiring different fixes.
- This task assumes the analytics infrastructure from Task 1 is already in place. If Task 1 has not shipped yet, the events should be implemented but can be queued or stubbed until the analytics backend is ready.
- No changes to game logic or the reconnection flow itself — purely additive instrumentation.
