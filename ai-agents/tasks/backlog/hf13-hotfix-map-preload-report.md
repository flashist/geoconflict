# HF-13 Implementation Report — First Attempt

This report documents the full implementation of HF-13 including all edge cases discovered during the session. Use it as a starting specification for the second attempt. **No code was merged.**

---

## What Was Built

Map asset preloading on JOIN click, with analytics, experiment gate, in-flight deduplication, correct cache invalidation, and a composite cache key fix for a pre-existing bug.

---

## Files to Modify

| File | What changes |
|---|---|
| `src/core/game/TerrainMapLoader.ts` | Composite cache key, in-flight deduplication, `isMapCached`, `clearPreloadedMap` |
| `src/client/PublicLobby.ts` | Trigger preload at JOIN, clear only on explicit cancel |
| `src/client/ClientGameRunner.ts` | Fire PreloadHit / PreloadMiss analytics at "prestart" |
| `src/client/flashist/FlashistFacade.ts` | Experiment flag constants + 4 analytics event constants |
| `ai-agents/knowledge-base/analytics-event-reference.md` | Document new events |

---

## TerrainMapLoader.ts — Full Design

### Problem 1 (pre-existing bug): Cache key ignores `GameMapSize`

Original: `new Map<GameMapType, TerrainMapData>()`

If a player plays World (Normal) then joins World (Compact), `loadTerrainMap(World, Compact)` gets a cache hit and returns Normal terrain. The match gets the wrong dimensions — rendering error or crash.

**Fix:** composite key `"${GameMapType}:${GameMapSize}"`:

```typescript
type TerrainCacheKey = `${GameMapType}:${GameMapSize}`;

function terrainCacheKey(map: GameMapType, mapSize: GameMapSize): TerrainCacheKey {
  return `${map}:${mapSize}`;
}

const loadedMaps = new Map<TerrainCacheKey, TerrainMapData>();
const inFlightLoads = new Map<TerrainCacheKey, Promise<TerrainMapData>>();
```

### Problem 2: No in-flight deduplication

`loadTerrainMap` is called at JOIN time (preload) and again at "prestart" time. If both fire before either completes, two parallel fetches start for the same files.

**Fix:** cache the in-flight promise. Return it if a call arrives while loading is already in progress:

```typescript
export async function loadTerrainMap(
  map: GameMapType,
  mapSize: GameMapSize,
  terrainMapFileLoader: GameMapLoader,
): Promise<TerrainMapData> {
  const key = terrainCacheKey(map, mapSize);

  const cached = loadedMaps.get(key);
  if (cached !== undefined) return cached;

  const inFlight = inFlightLoads.get(key);
  if (inFlight !== undefined) return inFlight;

  const promise = (async () => {
    try {
      // ... loading logic ...
      loadedMaps.set(key, result);
      return result;
    } finally {
      inFlightLoads.delete(key); // always remove on completion or failure
    }
  })();

  inFlightLoads.set(key, promise);
  return promise;
}
```

If the preload fails, `inFlightLoads` is cleared by `finally`, so the "prestart" call starts a fresh load normally.

### New exports

```typescript
// Used by ClientGameRunner at "prestart" to fire analytics
export function isMapCached(map: GameMapType, mapSize: GameMapSize): boolean {
  return loadedMaps.has(terrainCacheKey(map, mapSize));
}

// Used by PublicLobby on explicit cancel only (see below)
export function clearPreloadedMap(map: GameMapType, mapSize: GameMapSize): void {
  const key = terrainCacheKey(map, mapSize);
  loadedMaps.delete(key);
  inFlightLoads.delete(key); // must also clear in-flight — see Problem 3 below
}
```

---

## PublicLobby.ts — Full Design

### Preload trigger

In `lobbyClicked()`, after the `"join-lobby"` event is dispatched, fire-and-forget the preload behind an experiment gate:

```typescript
// Begin preloading map assets in the background — fire and forget
if (lobby.gameConfig) {
  const preloadEnabled = await FlashistFacade.instance.checkExperimentFlag(
    flashistConstants.experiments.MAP_PRELOAD_FLAG_NAME,
    flashistConstants.experiments.MAP_PRELOAD_FLAG_VALUE,
  ).catch(() => false);

  if (preloadEnabled) {
    const preloadStart = Date.now();
    flashist_logEventAnalytics(flashistConstants.analyticEvents.MATCH_PRELOAD_STARTED);
    loadTerrainMap(
      lobby.gameConfig.gameMap,
      lobby.gameConfig.gameMapSize,
      terrainMapFileLoader,
    ).then(() => {
      const seconds = (Date.now() - preloadStart) / 1000;
      flashist_logEventAnalytics(flashistConstants.analyticEvents.MATCH_PRELOAD_READY, seconds);
    }).catch(() => {
      // Silently discard — normal loading will proceed at match start
    });
  }
}
```

The `join-lobby` event must be dispatched **before** the experiment check await, so the join is never delayed.

`lobby.gameConfig.gameMap` is `GameMapType` and `lobby.gameConfig.gameMapSize` is `GameMapSize` — both are present on the `GameConfig` object served with public lobby data. No imports are needed beyond what is already in scope except `loadTerrainMap` and `clearPreloadedMap` from `TerrainMapLoader`.

### Problem 3: `clearPreloadedMap` must also clear `inFlightLoads`

Scenario: preload is still in-flight when user cancels. `clearPreloadedMap` only deletes from `loadedMaps`. If the user then joins a new lobby for the same map before the old preload completes, `loadTerrainMap` finds the old promise in `inFlightLoads` and returns it. If that old promise was going to fail, the new match terrain load also fails.

**Fix:** `clearPreloadedMap` deletes from both `loadedMaps` and `inFlightLoads`. The abandoned promise continues running in the background (can't be aborted), but its result lands in `loadedMaps` harmlessly. The new `loadTerrainMap` call starts a fresh load.

### Problem 4: `clearPreloadedMap` must NOT fire on match-end

`leaveLobby()` is a public method called from three places:

| Callsite | Context |
|---|---|
| `lobbyClicked()` else branch | User clicks JOIN button again to cancel — match never started |
| `Main.ts:447` | User clicks "Host Lobby" button |
| `Main.ts:901` (`handleLeaveLobby`) | **Match ends, user returns to lobby** |

If `clearPreloadedMap` is inside `leaveLobby()`, it fires on match-end too, wiping terrain data that was just legitimately used. The next JOIN on the same map then re-downloads unnecessarily.

**Fix:** remove `clearPreloadedMap` from `leaveLobby()` entirely. Place it only in the `else` branch of `lobbyClicked()` — the one path that represents genuine pre-match cancellation:

```typescript
// lobbyClicked() — else branch (user cancels from lobby wait)
} else {
  if (this.currLobby?.gameConfig) {
    clearPreloadedMap(
      this.currLobby.gameConfig.gameMap as GameMapType,
      this.currLobby.gameConfig.gameMapSize,
    );
  }
  this.dispatchEvent(new CustomEvent("leave-lobby", { ... }));
  this.leaveLobby();
}

// leaveLobby() — no cache clearing here
leaveLobby() {
  this.isLobbyHighlighted = false;
  this.currLobby = null;
}
```

This means:
- **Explicit cancel during lobby wait** → clears the preloaded assets ✓
- **Match ends normally** → terrain cache survives, next JOIN on same map is a free cache hit ✓
- **Host lobby button clicked** → terrain cache survives ✓

---

## ClientGameRunner.ts — Change at "prestart"

```typescript
if (message.type === "prestart") {
  const wasPreloaded = isMapCached(message.gameMap, message.gameMapSize);
  terrainLoad = loadTerrainMap(message.gameMap, message.gameMapSize, terrainMapFileLoader);
  if (wasPreloaded) {
    flashist_logEventAnalytics(flashistConstants.analyticEvents.MATCH_PRELOAD_HIT);
  } else {
    flashist_logEventAnalytics(flashistConstants.analyticEvents.MATCH_PRELOAD_MISS);
  }
  onPrestart();
}
```

`isMapCached` must be checked **before** `loadTerrainMap` is called, since `loadTerrainMap` would add to `loadedMaps` if the preload just finished.

---

## FlashistFacade.ts — New Constants

```typescript
experiments: {
  MAP_PRELOAD_FLAG_NAME: "map_preload",
  MAP_PRELOAD_FLAG_VALUE: "enabled",
},

analyticEvents: {
  // ... existing ...
  MATCH_PRELOAD_STARTED: "Match:PreloadStarted",
  MATCH_PRELOAD_READY:   "Match:PreloadReady",
  MATCH_PRELOAD_HIT:     "Match:PreloadHit",
  MATCH_PRELOAD_MISS:    "Match:PreloadMiss",
},
```

`checkExperimentFlag` returns `true` in `dev` env automatically — no flag setup needed for local testing.
`flashist_logEventAnalytics(event, value?)` already accepts an optional numeric value — no signature change needed.

---

## Analytics Reference Doc

Add a **Map Preload Events** section to `ai-agents/knowledge-base/analytics-event-reference.md`:

| Enum Key | Event String | When Fired |
|---|---|---|
| `MATCH_PRELOAD_STARTED` | `Match:PreloadStarted` | Preload begins at JOIN click |
| `MATCH_PRELOAD_READY` | `Match:PreloadReady` | Preload completes. **Value:** seconds taken (float) |
| `MATCH_PRELOAD_HIT` | `Match:PreloadHit` | "prestart" fires and map is already cached |
| `MATCH_PRELOAD_MISS` | `Match:PreloadMiss` | "prestart" fires and map is not yet cached |

---

## Edge Cases Summary

| Scenario | Behaviour |
|---|---|
| Preload completes before "prestart" | Cache hit — `loadTerrainMap` at "prestart" returns instantly |
| Preload still in-flight when "prestart" fires | Both calls join the same promise via `inFlightLoads` — no duplicate fetch |
| Preload fails | `inFlightLoads` cleared by `finally`; "prestart" starts a fresh load normally; match unaffected |
| User cancels mid-lobby-wait | `clearPreloadedMap` in `lobbyClicked` else-branch clears both caches |
| User cancels, preload was still in-flight | `inFlightLoads.delete` stops future callers getting the old promise; abandoned promise completes harmlessly |
| User cancels, then rejoins same map | Fresh preload starts correctly — no stale promise returned |
| Match ends, user rejoins same map | `leaveLobby()` does not clear cache; next JOIN is a free cache hit |
| Match ends, user joins different map | New preload starts for new map; old map remains cached (harmless) |
| Same map, different size (e.g. Normal vs Compact) | Composite key `"map:size"` keeps them separate — no cross-contamination |
| Experiment flag off | Preload block skipped entirely; all analytics events suppressed; match-start flow unchanged |
| Dev environment | `checkExperimentFlag` returns `true` — preload always active locally |
