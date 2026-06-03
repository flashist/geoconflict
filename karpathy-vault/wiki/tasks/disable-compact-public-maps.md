# Disable Compact Public Maps

**Source**: `ai-agents/tasks/done/s4c-disable-compact-public-maps.md`
**Status**: done
**Sprint/Tag**: Sprint 4c / Sprint 4b regression

## Goal

Remove compact maps from automatic public matchmaking while keeping compact maps available as explicit opt-in choices in private lobbies and singleplayer.

## Key Changes

`src/server/MapPlaylist.ts` keeps `MODIFIED_MATCH_RATE = 0.2` and the shared modifier system, but removes `MINI_MAP_MODIFIER` from the active `MATCH_MODIFIERS` registry. Public configs still start at `GameMapSize.Normal`, and with `mini_map` disabled no public config should be assigned `GameMapSize.Compact`.

The disabled `MINI_MAP_MODIFIER` definition remains in the file with a comment pointing back to this task and to `s5-fix-compact-map-shore-generation.md`, so re-enabling compact public maps after map regeneration is a one-line registry change. `weird_setting` is now the only active modifier, so it absorbs the full 20% modified-match budget.

`tests/server/MapPlaylist.test.ts` now verifies that the public registry contains only `weird_setting`, the disabled mini-map definition still applies `GameMapSize.Compact` when manually called, generated public configs stay normal-sized, and weird-setting selection does not make matches compact.

## Outcome

Public matchmaking no longer exposes players to compact `map4x.bin` shore-bit defects. The `Mini` / `Мини` lobby badge and compact localization keys remain dormant but available for a future re-enable. Private lobbies and singleplayer compact maps were intentionally left unchanged.

Re-enabling compact public maps is gated on regenerating the compact binaries so the shore data needed by transport-boat targeting is preserved. Until that root-cause fix ships, the rejected runtime workaround recorded in [[decisions/cancelled-tasks]] should not be retried.

## Related

- [[decisions/sprint-4b]] — sprint that originally shipped compact public maps as a variety modifier
- [[decisions/sprint-4c]] — stabilization sprint that accepted disabling compact public maps after the runtime fallback was cancelled
- [[tasks/compact-map-click-interaction]] — investigation proving the boat button failure comes from lost compact-map shore bits
- [[decisions/cancelled-tasks]] — records why the runtime boat-attack fallback was rejected
- [[tasks/sprint4b-compact-map-rotation]] — original Sprint 4b compact public modifier, now disabled in public rotation
- [[tasks/sprint4b-weird-setting-modifier]] — remaining public modifier that now receives the full modified-match budget
