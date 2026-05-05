# Task — Weird-Setting Modifier in Public Rotation + Badge

## Sprint
Sprint 4b — implement after `sprint4b-compact-map-rotation.md` is done

## Priority
Medium. No investigation dependency — the four modifiers use existing `GameConfig` fields that are already validated and working in singleplayer. Depends on the modifier system being implemented first by the compact map task.

---

## Context

Public matches currently always use default game settings. This task adds four gameplay modifiers to the shared modifier system built in `sprint4b-compact-map-rotation.md`. When one of these modifiers is selected, one game rule is changed from the default and a badge is shown in the lobby card so players know what they are joining.

The four modifiers are:
- Unlimited gold (`infiniteGold: true`)
- Unlimited army (`infiniteTroops: true`)
- No nukes (`disabledUnits: [UnitType.MissileSilo]`)
- No SAM (`disabledUnits: [UnitType.SAMLauncher]`)

**Do not reimplement the modifier selection logic.** It lives in `MapPlaylist.ts` and is owned by the compact map task. This task adds one entry to `MATCH_MODIFIERS` (the `weird_setting` flag) plus a `WEIRD_SETTING_OPTIONS` sub-list that handles the internal random pick between the four gameplay rule changes.

Badge text is chosen by the coder. Mark will review and update wording after testing.

---

## Distribution

The modifier system selects uniformly from the two top-level flags in `MATCH_MODIFIERS`: `mini_map` and `weird_setting`. With 2 flags and `MODIFIED_MATCH_RATE = 0.2`, each flag applies to exactly 10% of all matches. When `weird_setting` is selected, one of the 4 sub-options is chosen at random (each sub-option applies to ~2.5% of all matches). Mutual exclusivity with compact map matches is automatic.

---

## What to Build

### 1. Server — add the `weird_setting` entry to `MATCH_MODIFIERS` in `MapPlaylist.ts`

Define a list of sub-options and add a single `weird_setting` top-level entry whose `apply()` picks one at random:

```ts
const WEIRD_SETTING_OPTIONS: Array<() => Partial<GameConfig>> = [
  () => ({ infiniteGold: true }),
  () => ({ infiniteTroops: true }),
  () => ({ disabledUnits: [UnitType.MissileSilo] }),
  () => ({ disabledUnits: [UnitType.SAMLauncher] }),
];

// Add to MATCH_MODIFIERS (alongside the existing 'mini_map' entry):
{
  id: 'weird_setting',
  apply: () => {
    const option = WEIRD_SETTING_OPTIONS[Math.floor(Math.random() * WEIRD_SETTING_OPTIONS.length)];
    return option();
  },
},
```

No other server changes needed. The top-level selection and application logic is already handled by the modifier system.

### 2. Client — modifier badge in `PublicLobby.ts`

Add a badge after the team-type badge (same style: `text-sm text-blue-600 bg-white rounded-sm px-1`) when a gameplay modifier is active. Derive the badge label from the `GameConfig` fields — the modifier ID is not passed to the client:

```ts
function getWeirdModifierLabel(gameConfig: GameConfig): string | null {
  if (gameConfig.infiniteGold)
    return translateText("public_lobby.modifier_infinite_gold");
  if (gameConfig.infiniteTroops)
    return translateText("public_lobby.modifier_infinite_army");
  if (gameConfig.disabledUnits?.includes(UnitType.MissileSilo))
    return translateText("public_lobby.modifier_no_nukes");
  if (gameConfig.disabledUnits?.includes(UnitType.SAMLauncher))
    return translateText("public_lobby.modifier_no_sam");
  return null;
}
```

Render the badge only when `getWeirdModifierLabel` returns a non-null value.

### 3. Localization

Add to `resources/lang/en.json` and `resources/lang/ru.json` (both files must be updated). Coder picks the initial text; Mark reviews before release:

```json
"public_lobby": {
  "modifier_infinite_gold": "∞ Gold",
  "modifier_infinite_army": "∞ Army",
  "modifier_no_nukes": "No Nukes",
  "modifier_no_sam": "No SAM"
}
```

Russian equivalents chosen by coder — Mark will review.

---

## Verification

1. Run the game locally and observe many public lobbies. The `weird_setting` flag applies to ~10% of matches, with each sub-option getting ~2.5%. Confirm modifier badges appear and all four variants show up across multiple sessions.
2. Join a match with "∞ Gold" — confirm gold does not deplete in-match.
3. Join a match with "∞ Army" — confirm troops do not deplete in-match.
4. Join a match with "No Nukes" — confirm the Missile Silo building option is absent or disabled.
5. Join a match with "No SAM" — confirm the SAM Launcher building option is absent or disabled.
6. Confirm no weird-setting lobby also shows the "Мини" badge (mutual exclusivity).
7. Confirm normal lobbies show neither a modifier badge nor a mini badge.
8. Confirm all four badge label strings are present in both `en.json` and `ru.json`.

---

## Notes

- `disabledUnits` is already validated by the existing Zod schema and enforced by `BuildExecution` — no additional server-side enforcement is needed.
- The `donateGold` and `donateTroops` fields are set based on game mode (Team vs FFA) — leave that logic unchanged regardless of which modifier is applied.
- Mark will review badge wording during staging testing and may change text before release.
- To adjust the overall modified match rate, change `MODIFIED_MATCH_RATE`. To add a new weird-setting sub-option, add an entry to `WEIRD_SETTING_OPTIONS`. To add an entirely new modifier type alongside `mini_map` and `weird_setting`, add a new entry to `MATCH_MODIFIERS` — the top-level distribution rebalances automatically.
