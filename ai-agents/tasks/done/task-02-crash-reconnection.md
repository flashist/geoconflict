# Task 2 — Tab Crash Reconnection

## Context

A significant portion of players who join a match never complete it. One known cause is browser tab crashes, which are especially common on mobile devices. When this happens, the player currently has no way to get back into their match — reopening the game just takes them to the main menu, and their in-game character eventually gets marked as disconnected and removed.

This is both a retention problem and a fairness problem. A player who wanted to keep playing but lost their connection due to a crash should be given a reasonable chance to return.

## Goal

When a player's browser tab crashes or closes unexpectedly mid-match, and they reopen the game, they should be automatically detected as having an interrupted session and offered the chance to rejoin their active match — if that match is still ongoing and their character is still alive in it.

If the match has already ended, or the player was eliminated while disconnected, they should NOT be reconnected. Instead they should land on the normal main screen (or optionally see a brief summary of what happened to their match).

## What "Done" Looks Like

- If a player closes or crashes their tab mid-match and reopens the game, they see a prompt offering to rejoin their match
- Clicking the prompt reconnects them to the match in progress, in the same state as if they had briefly disconnected
- If the match is no longer active (ended while they were gone), no prompt is shown and they land on the main screen normally
- If the player was eliminated while disconnected, no reconnection prompt is shown
- If the player explicitly exits a match through the normal in-game exit flow, no reconnection prompt appears on next open (this should only trigger for unexpected exits)
- The feature works on both desktop and mobile browsers

## Notes

- The codebase already tracks player disconnection state server-side (`MarkDisconnectedExecution` exists). The developer should look at this as a starting point rather than building disconnection tracking from scratch.
- The match ID and player identity are already available at the point of game join — the developer will know where to find these.
- The reconnection prompt should be unobtrusive. It should not block the player from ignoring it and starting a new game instead.
- Edge case to handle carefully: a player who was eliminated while disconnected should never be reconnected into a match they have already lost. This would be a worse experience than not reconnecting at all.
- This feature must not affect players who are not in a reconnection scenario — the normal game start flow should be completely unchanged for everyone else.
