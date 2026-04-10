Plan: HF-13 — Map File Preloading on JOIN

 Context

 Players on slow connections sometimes miss the spawn phase because catch-up fast-forward takes longer than
 the spawn window. A key contributor is map file loading happening after the lobby wait, rather than during
 it.

 Map identity (GameMapType) and size (GameMapSize) are both available on the GameConfig object exposed by
 public lobby data at JOIN click time. This means we can start loading the three binary files (map.bin or
 map4x.bin, map4x.bin, manifest.json) immediately on JOIN, before the server sends "prestart". The existing
 loadedMaps cache in TerrainMapLoader.ts means a completed preload is automatically a cache hit when
 "prestart" fires.

 Problem with current loadTerrainMap: It has no in-flight deduplication. If called twice before either
 completes (preload + prestart), it triggers two parallel fetches. Fix: cache the in-flight promise.

 ---
 Investigation Findings

 - Assets loaded: manifest.json + either map.bin (Normal) or map4x.bin (Compact) + mini-map binary. Fetched
 from /maps/{lowercasemapname}/{file}.
 - Current load trigger: ClientGameRunner.ts:101 — inside the "prestart" message handler. loadTerrainMap()
 starts the load but the result isn't awaited until "start" fires at line 117.
 - Map ID available at JOIN: lobby.gameConfig.gameMap (GameMapType enum) and lobby.gameConfig.gameMapSize
 (GameMapSize) are both present on the GameConfig object.
 - Existing cache layer:
   - FetchGameMapLoader caches MapData objects (lazy loader instances) — no binary caching here.
   - TerrainMapLoader.loadedMaps caches the fully-parsed TerrainMapData — this is the reuse point for
 preloading.
 - No cache mismatch risk: The lobby's gameConfig is the actual config the server will use; map identity
 cannot change between JOIN and match start.
 - terrainMapFileLoader is already imported in PublicLobby.ts (line 8).

 ---
 Implementation Plan

 Step 1 — src/core/game/TerrainMapLoader.ts: Add in-flight deduplication + cleanup exports

 Add a second module-level map for in-flight promises so concurrent loadTerrainMap() calls (one from preload,
 one from "prestart") join the same promise rather than spawning duplicate fetches.

 const inFlightLoads = new Map<GameMapType, Promise<TerrainMapData>>();

 Modify loadTerrainMap():
 export async function loadTerrainMap(...): Promise<TerrainMapData> {
   const cached = loadedMaps.get(map);
   if (cached !== undefined) return cached;

   const inFlight = inFlightLoads.get(map);
   if (inFlight !== undefined) return inFlight;

   const promise = (async () => {
     try {
       // ... existing loading logic unchanged ...
       loadedMaps.set(map, result);
       return result;
     } finally {
       inFlightLoads.delete(map);  // remove in-flight reference on completion or failure
     }
   })();

   inFlightLoads.set(map, promise);
   return promise;
 }

 Add two new exports:
 // Used by PublicLobby to discard preloaded data when lobby is cancelled
 export function clearPreloadedMap(map: GameMapType): void {
   loadedMaps.delete(map);
   // Note: in-flight loads are allowed to complete but their result is then
   // orphaned because loadedMaps will be empty again when they try to set it.
   // We deliberately do NOT delete from inFlightLoads — the promise still runs
   // (we can't abort it), and if it completes after clearing it will re-add to
   // loadedMaps (benign: GC pressure only, not a correctness issue).
 }

 // Used by ClientGameRunner to determine PreloadHit vs PreloadMiss
 export function isMapCached(map: GameMapType): boolean {
   return loadedMaps.has(map);
 }

 Step 2 — src/client/PublicLobby.ts: Trigger preload at JOIN click

 Imports to add:
 import { GameMapSize, GameMapType } from "../core/game/Game"; // add GameMapSize
 import { loadTerrainMap, clearPreloadedMap } from "../core/game/TerrainMapLoader";
 (Note: GameMapType is already imported; GameMapSize needs adding to the same import.)

 In lobbyClicked(), after dispatching the "join-lobby" event (line ~243), add preload:
 // Preload map assets in the background — fire and forget
 const preloadStart = Date.now();
 flashist_logEventAnalytics(flashistConstants.analyticEvents.MATCH_PRELOAD_STARTED);
 loadTerrainMap(
   lobby.gameConfig.gameMap,
   lobby.gameConfig.gameMapSize,
   terrainMapFileLoader,
 ).then(() => {
   const seconds = (Date.now() - preloadStart) / 1000;
   flashist_logEventAnalytics(
     flashistConstants.analyticEvents.MATCH_PRELOAD_READY,
     seconds,
   );
 }).catch(() => {
   // Silently discard — normal loading will proceed at match start
 });

 In leaveLobby(), clear preloaded assets:
 leaveLobby() {
   if (this.currLobby?.gameConfig) {
     clearPreloadedMap(this.currLobby.gameConfig.gameMap as GameMapType);
   }
   this.isLobbyHighlighted = false;
   this.currLobby = null;
 }

 Step 3 — src/client/ClientGameRunner.ts: Analytics for hit/miss at prestart

 Import to add:
 import { isMapCached } from "../core/game/TerrainMapLoader"; // already has loadTerrainMap

 In the "prestart" handler (around line 101):
 if (message.type === "prestart") {
   const wasPreloaded = isMapCached(message.gameMap);
   terrainLoad = loadTerrainMap(message.gameMap, message.gameMapSize, terrainMapFileLoader);
   if (wasPreloaded) {
     flashist_logEventAnalytics(flashistConstants.analyticEvents.MATCH_PRELOAD_HIT);
   } else {
     flashist_logEventAnalytics(flashistConstants.analyticEvents.MATCH_PRELOAD_MISS);
   }
   onPrestart();
 }

 Step 4 — src/client/flashist/FlashistFacade.ts: Register new analytics event constants

 Add to flashistConstants.analyticEvents:
 MATCH_PRELOAD_STARTED: "Match:PreloadStarted",
 MATCH_PRELOAD_READY: "Match:PreloadReady",
 MATCH_PRELOAD_HIT: "Match:PreloadHit",
 MATCH_PRELOAD_MISS: "Match:PreloadMiss",

 Check how flashist_logEventAnalytics accepts a value parameter (used for PreloadReady seconds). If the
 current signature doesn't support a value, extend it or use a separate call.

 Step 5 — ai-agents/knowledge-base/analytics-event-reference.md: Update reference doc

 Add the four new events to the reference table per the MEMORY.md requirement.

 ---
 Files Modified

 ┌───────────────────────────────────────────────────────┬─────────────────────────────────────────────────┐
 │                         File                          │                     Change                      │
 ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
 │ src/core/game/TerrainMapLoader.ts                     │ Add inFlightLoads map + deduplication, export   │
 │                                                       │ clearPreloadedMap and isMapCached               │
 ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
 │ src/client/PublicLobby.ts                             │ Trigger preload at JOIN, clear on cancel        │
 ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
 │ src/client/ClientGameRunner.ts                        │ Fire PreloadHit/PreloadMiss analytics at        │
 │                                                       │ "prestart"                                      │
 ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
 │ src/client/flashist/FlashistFacade.ts                 │ Add four new analytics event constants          │
 ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
 │ ai-agents/knowledge-base/analytics-event-reference.md │ Document new events                             │
 └───────────────────────────────────────────────────────┴─────────────────────────────────────────────────┘

 ---
 Verification

 1. Open DevTools → Network tab. Click JOIN — confirm /maps/*/manifest.json and /maps/*/map*.bin requests
 start immediately (before match countdown finishes).
 2. Throttle to Slow 3G. Click JOIN — verify assets are loading during lobby wait.
 3. Match starts — confirm NO second set of network requests for the same files (preload already complete =
 cache hit).
 4. Click JOIN, then cancel (click back) — confirm preloaded assets are removed from the JS heap (via Memory
 snapshot before and after).
 5. Block the map asset URL in DevTools → click JOIN → match starts → confirm fallback loading proceeds and
 match runs normally.
 6. Check GameAnalytics dashboard for Match:PreloadStarted, Match:PreloadReady, Match:PreloadHit events.
 7. Match:PreloadMiss should not appear under normal conditions on fast connections (it's a fallback signal).

 ---
 Notes / Edge Cases

 - flashist_logEventAnalytics value parameter: Before implementing Step 3, check the function signature to
 confirm it accepts a numeric value arg. If not, the MATCH_PRELOAD_READY event may omit the duration until the
  analytics API is confirmed.
 - Private lobby / single-player: lobbyClicked() is only on PublicLobby. Private lobby join and single-player
 do not preload. This is acceptable per task scope.
 - Map size at JOIN time: lobby.gameConfig.gameMapSize comes from the server's public lobby listing and
 matches the actual match config. No mismatch risk.
 - Memory after match ends: The loadedMaps cache persists across matches by design (existing behavior).
 Preloading does not change this. Cleanup on cancel is the only new clearing path.