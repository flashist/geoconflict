# Crash Reconnection Feature

**Status**: active
**Source files**: `src/client/ReconnectModal.ts`, `src/client/ReconnectSession.ts`, `src/client/Main.ts`, `src/core/execution/MarkDisconnectedExecution.ts`

## Summary

When a player's browser tab crashes or closes unexpectedly mid-match, reopening the game detects the interrupted session and offers to rejoin if the match is still ongoing and the player's character is still alive. If the match ended or the player was eliminated while disconnected, no prompt is shown.

Source: `ai-agents/tasks/done/task-02-crash-reconnection.md`

## Implementation

**Detection:** on game load, check for a persisted match-in-progress record (match ID + player identity). If found and the server confirms the match is still active and the player is alive, show the reconnection prompt.

**Server-side state:** `MarkDisconnectedExecution` tracks player disconnection server-side. The reconnection check queries whether the player is still present (not yet fully removed).

**Explicit exit vs crash:** only unexpected exits (tab close/crash) trigger the prompt. A player who exits through the normal in-game exit flow does not see a reconnection prompt on next open.

**Edge case:** if a player was eliminated while disconnected, no reconnection is offered — joining a match you've already lost is a worse experience than starting fresh.

## Intent → Execution Flow

This feature spans client session recovery plus one core execution:

1. Unexpected disconnect persists reconnect session state in the client
2. On next load, `ReconnectModal` offers a rejoin if that session exists
3. Accepting the prompt checks `/api/game/{gameID}/active` and dispatches `join-lobby` if still valid
4. During the original disconnect, `MarkDisconnectedExecution` records the player's disconnected state in core game logic

## Analytics Events

Five events covering the complete reconnection funnel:

| Event | Description |
|---|---|
| `Reconnect:PromptShown` | Player saw the rejoin prompt (funnel top) |
| `Reconnect:Accepted` | Player tapped rejoin |
| `Reconnect:Declined` | Player dismissed, went to main menu |
| `Reconnect:Succeeded` | Player accepted and was confirmed active in match |
| `Reconnect:Failed` | Player accepted but match ended or player was eliminated |

Events 4 and 5 distinguish "feature works but players don't use it" from "feature is broken."

Source: `ai-agents/tasks/done/task-02a-reconnection-analytics.md`

## Gotchas / Known Issues

- Reconnection must not affect players who are not in a reconnection scenario — normal game start flow is completely unchanged
- A player eliminated while disconnected must never be reconnected into a lost match

## Related

- [[systems/analytics]] — analytics infrastructure these events flow through
- [[decisions/sprint-1]] — sprint where reconnection was built
- [[decisions/autospawn-late-join-fix]] — related: late-join spawn timing issues
