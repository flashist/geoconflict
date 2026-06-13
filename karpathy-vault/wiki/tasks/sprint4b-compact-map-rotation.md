# Compact Public Map Rotation

**Source**: `ai-agents/tasks/done/sprint4b-compact-map-rotation.md`
**Status**: done
**Sprint/Tag**: Sprint 4b

## Goal

Add compact maps to regular public matchmaking and make compact lobbies visible to players with a `Mini` / `Мини` lobby badge. The task also creates the shared public-match modifier registry that the later weird-setting modifier task extends.

## Key Changes

`src/server/MapPlaylist.ts` originally exported `MODIFIED_MATCH_RATE = 0.2`, a `MatchModifier` type, `MATCH_MODIFIERS`, and `applyMatchModifier()`. Public lobby configs start as normal-size maps, then `applyMatchModifier()` may merge one selected modifier override into the returned `GameConfig`. The first registered modifier was `mini_map`, which sets `gameMapSize: GameMapSize.Compact`.

`src/client/PublicLobby.ts` renders a second badge next to the existing team/mode badge when `lobby.gameConfig.gameMapSize === GameMapSize.Compact`. The badge text uses `public_lobby.mini_map`, added to both `resources/lang/en.json` (`Mini`) and `resources/lang/ru.json` (`Мини`).

`tests/server/MapPlaylist.test.ts` covers the isolated match-modifier rate, the `mini_map` registry entry, unchanged normal configs outside the modified-match rate, and compact modifier application.

## Outcome

Compact public matches were initially produced through the shared modifier path, with no schema changes because `gameMapSize` already flows through `GameConfig` to public lobby rendering and match start.

Sprint 4c later disabled `mini_map` in the active public registry after live testing confirmed the compact shore-bit defect cannot be fixed safely at runtime. `MINI_MAP_MODIFIER` is still defined in `MapPlaylist.ts` for a future one-line re-enable, but `MATCH_MODIFIERS` now contains only `weird_setting`, so compact maps are selected for 0% of public matches until the compact binaries are regenerated.

No compact map exclusion list was added. The prior investigation accepted the known water-centered nation-coordinate cases as spawn-distribution risks rather than release blockers.

Follow-up debugging on 2026-05-11 found a separate compact-map regression: some compact `resources/maps/*/map4x.bin` terrain loses `isShore` designations during downsampling, which can disable the transport-boat radial-menu action even when the clicked territory visually borders water. This is distinct from the earlier nation-coordinate audit and is tracked in [[tasks/compact-map-click-interaction]].

## Related

- [[decisions/sprint-4b]]
- [[tasks/sprint4b-mini-mode-investigation]]
- [[tasks/sprint4b-weird-setting-modifier]]
- [[tasks/compact-map-click-interaction]]
- [[tasks/disable-compact-public-maps]]
