# HF-13 — Map File Preloading on JOIN

## Priority
Sprint 3. Directly reduces the frequency of `Match:SpawnMissed:CatchupTooLong` — the known unresolved case where catch-up outlasts the spawn phase on slow connections. Also improves general match start experience for all players.

## Context

**Current flow:**
```
Click JOIN → wait in lobby → server starts match → client begins loading map files
→ catch-up fast-forward → spawn phase may already be closed
```

**With preloading:**
```
Click JOIN → begin loading map files immediately (in background)
→ wait in lobby → server starts match → catch-up fast-forward
→ files already loaded → spawn phase still open
```

The map identity is known at JOIN time — players see which map they are joining before clicking the button. This means preloading can start with certainty, not speculation.

The reduction in `CatchupTooLong` risk depends on how long map loading currently takes versus the spawn phase window. Measuring this before and after is part of verification.

---

## Part A — Investigation

Before writing any preload logic, answer the following:

1. **What files are loaded when a match starts?** Identify which assets are loaded during match initialisation — map data files, tile textures, other map-specific resources. What is the total size and typical load time on a slow connection (Slow 3G in DevTools)?

2. **Where in the current flow does loading happen?** Find the exact call site where map file loading is triggered today. This is where the preload logic will need to duplicate or reuse the loading logic.

3. **Is the map identifier available on the JOIN button?** Confirm the map name/ID is accessible in the client at the point the JOIN button is clicked — not just displayed visually but available as a value in code.

4. **Is there an existing asset loading/caching layer?** Check whether the codebase already has a mechanism for loading and caching map assets (e.g. a resource manager, asset loader, or similar). If so, preloading may be as simple as calling the existing loader early. If not, a lightweight cache will be needed.

5. **What happens if the user joins a different map than preloaded?** This should not happen (map is shown before JOIN), but confirm there is no scenario where the preloaded map differs from the actual match map — e.g. if the lobby changes map between JOIN click and match start.

**Output:** a short note covering asset sizes, load times on slow connection, and the recommended preload implementation approach given the existing codebase structure.

---

## Part B — Preload Implementation

On JOIN button click, begin loading the map assets for the target map in the background. Do not start the game or change any UI state — purely load files into memory/cache so they are ready when the match actually begins.

**Key requirements:**

- **Fire and forget at JOIN time:** the preload starts when the player clicks JOIN and runs silently in the background. It must not block the lobby UI or delay the JOIN action itself.
- **No duplicate loading:** if the match starts while preloading is still in progress, the match initialisation should detect that loading is already underway and wait for it to complete rather than starting a second parallel load. If loading is already complete, skip it entirely.
- **No wasted work on cancelled joins:** if the player leaves the lobby before the match starts (clicks BACK or the lobby closes), cancel or discard the preloaded assets. Do not hold large map assets in memory indefinitely for a match that never happened.
- **Graceful failure:** if preloading fails (network error, timeout), silently discard and let normal match-start loading proceed as before. Preload failure must never prevent a match from starting.

**Implementation sketch** (adjust based on Part A findings):
```typescript
// On JOIN button click
async function onJoinButtonClicked(mapId: string) {
  // Start join flow as normal
  joinLobby(mapId);
  
  // Begin preloading map assets in parallel — do not await
  preloadMapAssets(mapId).catch(() => {
    // Silently ignore preload failures
  });
}

async function preloadMapAssets(mapId: string): Promise<void> {
  if (mapAssetCache.has(mapId)) return; // already loaded
  if (mapAssetCache.isLoading(mapId)) return; // already in progress
  
  mapAssetCache.markLoading(mapId);
  try {
    const assets = await loadMapFiles(mapId);
    mapAssetCache.set(mapId, assets);
  } catch {
    mapAssetCache.markFailed(mapId);
  }
}
```

**In match initialisation:**
```typescript
async function initMatch(mapId: string) {
  // Use preloaded assets if available, otherwise load normally
  const assets = mapAssetCache.get(mapId) 
    ?? await loadMapFiles(mapId);
  
  // Continue match init with assets...
}
```

---

## Part C — Analytics

Add two events to measure the impact of preloading:

| Event | When fired | Value |
|---|---|---|
| `Match:PreloadStarted` | When preload begins at JOIN click | — |
| `Match:PreloadReady` | When preload completes successfully | Seconds taken to load |
| `Match:PreloadHit` | When match init uses preloaded assets (cache hit) | Seconds saved vs normal load |
| `Match:PreloadMiss` | When match init falls back to normal loading (preload failed or not ready) | — |

`Match:PreloadHit` with its value (seconds saved) directly quantifies the reduction in catch-up window. This is the key metric for evaluating whether preloading meaningfully reduces `Match:SpawnMissed:CatchupTooLong`.

After sufficient data, compare `Match:SpawnMissed:CatchupTooLong` rate before and after this task ships.

---

## Verification

1. Click JOIN on a multiplayer game — confirm map assets begin loading immediately (visible in DevTools Network tab)
2. Throttle to Slow 3G — confirm assets are loading during lobby wait, before match start
3. Match starts — confirm no duplicate network requests for map files that were already preloaded
4. Cancel lobby after JOIN — confirm preloaded assets are released from memory
5. Preload network failure (block the asset URL in DevTools) — confirm match still starts normally via fallback loading
6. `Match:PreloadHit` event appears in GameAnalytics when preload was used successfully
7. Compare catch-up window duration before and after: on a slow connection, measure time from match start to catch-up complete — should be shorter after preloading

## Dependencies

- Map identifier must be accessible in client code at JOIN button click time (confirmed by investigation in Part A)
- HF-6 catch-up fix deployed ✅ — this task reduces how often catch-up outlasts the spawn phase; HF-6 ensures the spawn fires at the right moment once catch-up ends

## Notes

- This task reduces the frequency of `Match:SpawnMissed:CatchupTooLong` but does not eliminate it entirely — a player on an extremely slow connection may still have catch-up outlast the spawn phase even with preloading. A proper recovery path (spawning after the spawn phase expires) remains a separate future task.
- Preloading only helps for the window between JOIN click and match start. If a player joins very late (lobby was already starting as they clicked JOIN), the benefit is minimal. This is acceptable — preloading is a best-effort optimisation, not a guarantee.
- Memory management: map assets can be large. Ensure preloaded assets are released promptly when no longer needed — both on lobby cancel and after the match ends.
