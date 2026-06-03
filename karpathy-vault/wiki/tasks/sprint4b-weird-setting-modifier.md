# Weird-Setting Public Modifier

**Source**: `ai-agents/tasks/done/sprint4b-weird-setting-modifier.md`
**Status**: done
**Sprint/Tag**: Sprint 4b

## Goal

Add public-match gameplay modifiers to the shared modifier system created by the compact map task, and show a lobby badge when a modified rule set is active.

## Key Changes

`src/server/MapPlaylist.ts` now exports `WEIRD_SETTING_OPTIONS` with four sub-options:

| Badge concept | GameConfig override |
|---|---|
| Unlimited gold | `infiniteGold: true` |
| Unlimited army | `infiniteTroops: true` |
| No nukes | `disabledUnits: [UnitType.MissileSilo]` |
| No SAM | `disabledUnits: [UnitType.SAMLauncher]` |

`MATCH_MODIFIERS` originally contained two top-level entries: `mini_map` and `weird_setting`. `applyMatchModifier()` still gates all modifiers through `MODIFIED_MATCH_RATE = 0.2`; when the weird-setting flag is selected, its `apply()` chooses one sub-option from `WEIRD_SETTING_OPTIONS`.

`src/client/PublicLobby.ts` derives the visible modifier label from `GameConfig` fields using `getWeirdModifierLabel()`, because the modifier ID is not passed to the client. The badge appears next to the existing team/mode badge and before the mini-map badge.

`resources/lang/en.json` and `resources/lang/ru.json` now include localized labels for `modifier_infinite_gold`, `modifier_infinite_army`, `modifier_no_nukes`, and `modifier_no_sam`. `tests/server/MapPlaylist.test.ts` covers the top-level registry, all four weird-setting options, and selecting a weird setting without also making the map compact.

## Outcome

Public matchmaking can produce normal matches or one of four weird-setting matches through the mutually exclusive modifier registry. Sprint 4c disabled `mini_map` in public rotation after compact-map boat targeting was found unsafe, so `weird_setting` is now the only active top-level modifier. With `MODIFIED_MATCH_RATE = 0.2`, weird-setting matches receive about 20% of all public matches; each sub-option receives about 5%.

No schema changes were required. The modified fields already exist in `GameConfig`, and disabled unit enforcement already flows through build validation.

## Related

- [[decisions/sprint-4b]]
- [[tasks/sprint4b-compact-map-rotation]]
- [[tasks/disable-compact-public-maps]]
