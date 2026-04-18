# HF-13 — Map File Preloading on JOIN

**Source**: `ai-agents/tasks/done/hf13-hotfix-map-preload.md`
**Status**: done
**Sprint/Tag**: Sprint 3 / HF-13

## Goal

Reduce `Match:SpawnMissed:CatchupTooLong` by moving terrain-map loading out of the match-start critical path and into the lobby wait window.

## Key Changes

- `src/client/PublicLobby.ts` captures the clicked lobby's `gameMap` and `gameMapSize` and passes them as `preloadMapData` in the `join-lobby` event.
- `src/client/ClientGameRunner.ts` starts `loadTerrainMap()` as soon as that preload metadata is present, reuses the same `terrainLoad` promise on `prestart` and `start`, and resets the preload state if the target map changes or the preload fails.
- The same client path emits preload analytics: `Match:PreloadStarted`, `Match:PreloadReady`, `Match:PreloadHitLoaded`, `Match:PreloadHitNotLoaded`, and `Match:PreloadMiss`.

## Outcome

Terrain loading begins earlier and is reused at match start instead of being duplicated. This reduces the chance that catch-up consumes the entire spawn window, although extremely slow clients can still miss spawn and need a separate recovery path.

## Related

- [[systems/analytics]] — preload event definitions and join-funnel context
- [[decisions/sprint-3]] — sprint that shipped HF-13
- [[tasks/ui-click-multiplayer]] — confirmed the JOIN click is the correct preload trigger
