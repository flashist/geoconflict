# Task — Compact Map in Public Rotation + Mini Badge

## Sprint
Sprint 4b — after investigation findings reviewed

## Priority
Medium. Depends on `sprint4b-mini-mode-investigation.md` findings. If any maps are flagged as unsafe for compact mode, exclude them from the rotation (see Notes).

---

## Context

`GameMapSize.Compact` already exists and works in private lobbies and singleplayer. The public `MapPlaylist.gameConfig()` always returns `GameMapSize.Normal`. This task adds compact maps to the public rotation and adds a "Мини" badge to the lobby card in `PublicLobby.ts` so players know they are joining a compact match.

**This task also owns the shared modifier system** that the weird-setting task (`sprint4b-weird-setting-modifier.md`) builds on. Implement the modifier system here first; the weird-setting task only adds entries to it.

---

## Modifier System (implement here, reused by weird-setting task)

### Configurable rate

Define a single constant that controls what fraction of all public matches receive any modifier:

```ts
const MODIFIED_MATCH_RATE = 0.2; // 20% of matches get a modifier
```

This constant should be easy to find and change. If it ever needs to move to a config file, the interface is already isolated here.

### Modifier registry

Define a type and a list of top-level modifier flags. Each flag has a unique string ID and a function that returns the `GameConfig` fields it changes. There are exactly two flags: `mini_map` and `weird_setting`. The `weird_setting` flag has its own internal sub-selection (implemented by `sprint4b-weird-setting-modifier.md`).

```ts
type MatchModifier = {
  id: string;
  apply: () => Partial<GameConfig>;
};

const MATCH_MODIFIERS: MatchModifier[] = [
  {
    id: 'mini_map',
    apply: () => ({ gameMapSize: GameMapSize.Compact }),
  },
  // 'weird_setting' entry added by sprint4b-weird-setting-modifier.md
];
```

### Selection logic

In `MapPlaylist.gameConfig()`, after the map is drawn:

```ts
const isModified = Math.random() < MODIFIED_MATCH_RATE;

if (isModified) {
  const modifier = MATCH_MODIFIERS[Math.floor(Math.random() * MATCH_MODIFIERS.length)];
  const overrides = modifier.apply();
  // merge overrides into the returned GameConfig
}
```

One flag is selected uniformly at random from the list. With 2 flags and a 20% rate, each flag applies to exactly 10% of all matches. Mutual exclusivity between compact and weird-setting is automatic — only one flag is ever selected per match.

---

## What to Build

### 1. Server — modifier system + compact entry

Implement `MODIFIED_MATCH_RATE`, `MatchModifier`, `MATCH_MODIFIERS`, and the selection logic in `src/server/MapPlaylist.ts` as described above. The compact map modifier is the first entry in `MATCH_MODIFIERS`.

If the investigation excludes specific maps from compact mode, add a guard: when the drawn map is on the exclusion list and the selected modifier is `mini_map`, skip the modifier and leave the match unmodified. Do not re-roll either the map or the modifier.

```ts
if (modifier.id === 'mini_map' && COMPACT_EXCLUDED_MAPS.includes(map)) {
  // leave config at normal defaults
} else {
  Object.assign(config, modifier.apply());
}
```

### 2. Client — mini badge in `PublicLobby.ts`

The existing team-type badge is a `<span>` with classes `text-sm text-blue-600 bg-white rounded-sm px-1`. Add a second badge of the same style immediately after it when `gameConfig.gameMapSize === GameMapSize.Compact`:

```ts
${lobby.gameConfig.gameMapSize === GameMapSize.Compact
  ? html`<span class="text-sm text-blue-600 bg-white rounded-sm px-1">
      ${translateText("public_lobby.mini_map")}
    </span>`
  : nothing}
```

### 3. Localization

Add to `resources/lang/en.json` and `resources/lang/ru.json` (both files must be updated):

`resources/lang/en.json`:
```json
"public_lobby": {
  "mini_map": "Mini"
}
```

`resources/lang/ru.json`:
```json
"public_lobby": {
  "mini_map": "Мини"
}
```

---

## Verification

1. Run the game locally and observe many public lobbies. With 2 modifier flags at 20% rate, the "Мини" badge should appear on roughly 1 in 10 lobbies (~10%). Confirm it appears and is not zero.
2. Join a compact lobby and confirm the map renders at reduced scale.
3. Join a normal lobby from the same session — confirm no "Мини" badge and normal map scale.
4. Confirm the "Мини" badge appears alongside (not instead of) the team-type badge.
5. Confirm no compact lobby also has a weird-setting modifier badge (mutual exclusivity).
6. Confirm `MODIFIED_MATCH_RATE` is a clearly named constant that is easy to find and change.
7. If any maps were excluded by the investigation: confirm those maps never appear with the compact badge.

---

## Notes

- If the investigation finds that some maps are unsafe for compact mode, the exclusion list goes here as a `const COMPACT_EXCLUDED_MAPS: GameMapType[]` in `MapPlaylist.ts`.
- `gameMapSize` is already part of `GameConfig` and flows through the existing join/start path — no schema changes needed.
- The compact map feature in private lobbies (`HostLobbyModal.ts`) and singleplayer (`SinglePlayerModal.ts`) must remain unchanged.
- Implement this task before `sprint4b-weird-setting-modifier.md` — that task adds entries to `MATCH_MODIFIERS` and expects the system to already exist.
