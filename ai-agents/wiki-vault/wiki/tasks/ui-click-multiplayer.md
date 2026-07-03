# UI:ClickMultiplayer Investigation

**Source**: `ai-agents/tasks/done/s3-investigation-ui-click-multiplayer.md`
**Status**: done
**Sprint/Tag**: Sprint 3 investigation

## Goal

Confirm whether `UI:ClickMultiplayer` is a trustworthy funnel anchor for "player intended to join a specific multiplayer match".

## Key Changes

- Investigation result: `src/client/PublicLobby.ts` fires `UI:ClickMultiplayer` inside `lobbyClicked(lobby)` when the player clicks JOIN on a specific public-lobby row, before the `join-lobby` event is dispatched.
- The same handler debounces rapid repeat clicks with `isButtonDebounced`, so accidental double taps are collapsed, but separate join attempts later in the session can still emit additional events.
- The JOIN path also prepares `preloadMapData`, so this event sits at the earliest stable point in the public-lobby join funnel and lines up with HF-13 map preloading.

## Outcome

`UI:ClickMultiplayer` is a valid denominator for the funnel `UI:ClickMultiplayer → Game:Start → Match:SpawnChosen/SpawnAuto`. No replacement `Match:JoinAttempted` event was needed.

## Related

- [[systems/analytics]] — analytics conventions and event catalog
- [[decisions/sprint-3]] — sprint that tracked this investigation
- [[tasks/map-preload]] — HF-13 uses the same JOIN click path to start terrain preloading
