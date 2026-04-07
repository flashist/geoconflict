# Task — Attach Last Match IDs to Feedback Submissions

## Sprint
Sprint 3. Replaces the cancelled `task-feedback-match-history.md`.

## Context

When a player submits feedback there is currently no way to connect that report to a specific match. The server archive already contains full match data — config, players, stats, and complete intent log — accessible via `/game/{gameID}`. A match ID is all that is needed to look up the match and attempt to replay or diagnose the reported issue.

`localStorage['game-records']` already exists in `LocalPersistantStats.ts` and is keyed by game ID. No new write logic is needed — match IDs are already being stored.

## What "Done" Looks Like

When the player submits feedback, read the keys from `localStorage['game-records']` and include the last 3 game IDs in the feedback payload. Nothing else — no outcomes, no maps, no structured objects. Just the IDs.

**Feedback payload addition:**

```typescript
recentMatchIds: ["abc12345", "xyz67890", "qrs11223"]  // most recent first, up to 3
```

The most recent match should be first. If fewer than 3 matches exist in storage, include only what is available. If `localStorage['game-records']` is empty or absent, send an empty array — no errors.

**The match IDs are not shown to the player** — they are backend metadata only. No UI changes required beyond the payload.

## Implementation Notes

- Read keys from `localStorage['game-records']` at the moment feedback is submitted — do not add any new localStorage writes
- The keys are game IDs — use them directly. No parsing of the record values is needed.
- Determine sort order (most recent first) from whatever ordering or timestamp information is already available in the existing record structure. If no timestamp is stored, use insertion order as a best-effort approximation.
- This is a client-side only change — no server changes required

## Verification

1. Play 3 matches, then submit feedback — payload contains 3 game IDs
2. Look up one of those IDs in the archive API — correct match data is returned
3. If fewer than 3 matches have been played, payload contains only the available IDs
4. If no matches have been played, payload contains an empty array with no errors
5. Match IDs do not appear anywhere in the feedback UI visible to the player

## Notes

- This task intentionally does not store any new data — it only reads what already exists. Keep it that way.
- If `localStorage['game-records']` turns out not to contain sufficient ordering information to determine recency, use the last 3 keys in whatever order they are available. Approximate recency is good enough — the goal is to give a match ID to look up, not a perfectly ordered history.
