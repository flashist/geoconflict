# Crash Reconnection Feature

**Status**: active
**Source files**: TBD (reconnection prompt logic, `MarkDisconnectedExecution`)

## Summary

When a player's browser tab crashes or closes unexpectedly mid-match, reopening the game detects the interrupted session and offers to rejoin if the match is still ongoing and the player's character is still alive. If the match ended or the player was eliminated while disconnected, no prompt is shown.

Source: `ai-agents/tasks/done/task-02-crash-reconnection.md`

## Implementation

**Detection:** on game load, check for a persisted match-in-progress record (match ID + player identity). If found and the server confirms the match is still active and the player is alive, show the reconnection prompt.

**Server-side state:** `MarkDisconnectedExecution` tracks player disconnection server-side. The reconnection check queries whether the player is still present (not yet fully removed).

**Explicit exit vs crash:** only unexpected exits (tab close/crash) trigger the prompt. A player who exits through the normal in-game exit flow does not see a reconnection prompt on next open.

**Edge case:** if a player was eliminated while disconnected, no reconnection is offered — joining a match you've already lost is a worse experience than starting fresh.

## Analytics Events

Five events covering the complete reconnection funnel:

| Event | Description |
|---|---|
| `Match:ReconnectPromptShown` | Player saw the rejoin prompt (funnel top) |
| `Match:ReconnectAccepted` | Player tapped rejoin |
| `Match:ReconnectDeclined` | Player dismissed, went to main menu |
| `Match:ReconnectSucceeded` | Player accepted and was confirmed active in match |
| `Match:ReconnectFailed` | Player accepted but match ended or player was eliminated |

Events 4 and 5 distinguish "feature works but players don't use it" from "feature is broken."

Source: `ai-agents/tasks/done/task-02a-reconnection-analytics.md`

## Gotchas / Known Issues

- Reconnection must not affect players who are not in a reconnection scenario — normal game start flow is completely unchanged
- A player eliminated while disconnected must never be reconnected into a lost match

## Related

- [[systems/analytics]] — analytics infrastructure these events flow through
- [[decisions/sprint-1]] — sprint where reconnection was built
- [[decisions/autospawn-late-join-fix]] — related: late-join spawn timing issues
