# Task — Attach Match History to Feedback Submissions

## Sprint
Sprint 3.

## Context

The server archive already contains rich match data — full config, all players, stats, elimination order, and complete turns log — accessible via `/game/{gameID}`. However, when a player submits feedback there is currently no way to connect that feedback to a specific match. The game ID is only shown in the host lobby modal and on crash screens, not during normal play or on the win/loss screen. Players submitting feedback about a broken experience almost certainly do not have the match ID to hand.

This task automatically attaches the last 3 match IDs to every feedback submission, without requiring any action from the player. When a bug report comes in, the match IDs can be looked up in the archive to see exactly what happened — map, players, stats, elimination order, and full intent log.

**Prerequisite finding from server logging investigation:** the archive is already sufficiently rich for this to be useful immediately. No additional server-side logging is needed before this task is worth implementing.

## What "Done" Looks Like

**Step 1 — Store match history in localStorage**

At the end of each match (on `Game:End`), write the match ID and a minimal summary to localStorage under a `matchHistory` key:

```typescript
// Structure stored per match entry:
{
  gameID: string,          // 8-char nanoid from GameStartInfo
  gameType: string,        // e.g. "singleplayer", "multiplayer"
  gameMap: string,         // map name
  outcome: "win" | "loss" | "abandoned",
  timestamp: number        // Unix ms
}
```

Keep only the last 5 entries — trim oldest on write. The game ID is already sent to the client in `GameStartInfo` at match start, so it is available client-side.

**Step 2 — Attach match history to feedback payload**

When the player submits feedback, read `matchHistory` from localStorage and include the last 3 entries in the feedback payload alongside the existing device info. The player does not need to do anything — this is automatic.

The feedback payload addition:

```typescript
recentMatches: [
  {
    gameID: "abc12345",
    gameType: "singleplayer",
    gameMap: "Iceland",
    outcome: "loss",
    timestamp: 1741234567890
  },
  // ... up to 3 entries, most recent first
]
```

**Step 3 — Surface match IDs in the feedback dashboard**

Wherever feedback submissions are currently viewed (admin panel, email, external service), ensure the `recentMatches` array is visible. If feedback goes to a simple email or webhook, the match IDs should appear in the body as clickable archive lookup links if the archive has a web interface, or as plain text IDs otherwise.

## Implementation Notes

**localStorage key:** use `geoconflict_match_history` to avoid collision with other localStorage keys already in use (`tutorialCompleted`, reconnect session, `game-records`).

**Match ID availability:** `GameStartInfo` already sends `gameID` to the client at match start. The developer should confirm where this is accessible in the client code and store it to localStorage at that point, not wait until match end (in case the player closes the tab before the end event fires — storing on start and updating the outcome on end is safer).

**localStorage['game-records']** already exists in `LocalPersistantStats.ts` keyed by game ID — check whether the needed data can be derived from this existing structure before creating a parallel one. If `game-records` already contains outcome and map data per match, read from there instead of duplicating.

**Feedback form:** the existing feedback form (Task 2b) should be updated to read from localStorage and append match history to the submission. This is a client-side only change.

## Verification

1. Play 3 matches with different outcomes — win, loss, abandon
2. Submit feedback — the payload includes the last 3 match IDs with correct outcomes and maps
3. Check that the match IDs are visible in the feedback submission destination
4. Verify that looking up one of those IDs in the archive returns the correct match data
5. localStorage `geoconflict_match_history` contains at most 5 entries and trims oldest correctly
6. If the player has played fewer than 3 matches, only the available entries are included — no errors on empty or partial history

## Notes

- 3 entries in the feedback payload is the right number — enough to give context for a recent bug without making the payload unwieldy. 5 entries in localStorage gives a buffer in case the most recent match is incomplete.
- Do not show match IDs to the player in the feedback UI — they add no value to the player and may be confusing. They are backend metadata only.
- This task does not require any server-side changes — purely client-side localStorage read/write and feedback payload modification.
