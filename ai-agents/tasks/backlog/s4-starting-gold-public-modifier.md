# Task — Add "5M Starting Gold" Public Weird-Setting Modifier

## Sprint
Sprint 4 (independent match-quality task — no dependency on the citizenship/payments track).

## Priority
Medium — match-quality change. Safe weekend deploy. Higher blast radius than a one-line modifier
edit because it adds a new `GameConfig` field (schema + every config literal, client and server).

## Experiments
❌ Excluded — match-quality change, ships to all players. No A/B.

---

## Context

Sprint 4b added the public "weird setting" modifier system (`sprint4b-weird-setting-modifier.md`).
`MATCH_MODIFIERS` applies a modifier to ~20% of public matches (`MODIFIED_MATCH_RATE = 0.2`),
and `weird_setting` is the only active top-level modifier, so it absorbs the full 20%.
`weird_setting` picks one sub-option uniformly from `WEIRD_SETTING_OPTIONS`
(`src/server/MapPlaylist.ts`).

**Why this change:** add a **bounded economic-boost** variety modifier to the public weird-setting
rotation — a one-time **5M starting gold** grant for real players. It gives a head-start to expand
and defend early, while normal economy applies afterward: a finite boost, not an open-ended one. It
broadens the variety of public weird matches alongside the existing army / nuke / SAM modifiers.

This is a **standalone** weird sub-option, independent of any other modifier (see **Independence**
below).

### Relevant costs (for balance context — not a code change)
| Unit | Cost |
|---|---|
| MissileSilo | 1,000,000 |
| AtomBomb | 750,000 |
| HydrogenBomb | 5,000,000 |
| MIRV | 35,000,000 |

5M buys an opening **silo + ~5 atom bombs** immediately — a real opening salvo, but *finite*: the
boost runs out and normal economy resumes. The 5M figure is a single tunable constant; revisit it
after the live check if openings still feel nuke-heavy.

---

## Locked decisions (Mark, 2026-06-13)

1. **Recipients: real players only.** Human players and human-like AI-fill players
   (`PlayerType.Human` and `PlayerType.AiPlayer`) start with 5M. **Nations (`FakeHuman`) and
   filler bots (`Bot`) start at 0** as usual. This is the same predicate `infiniteGold` already
   uses in `costWrapper` (`src/core/configuration/DefaultConfig.ts:644` — gold-free build only
   applies to `Human || AiPlayer`), so it is consistent with existing behaviour.
2. **Amount: 5,000,000** (one-time grant at player creation; normal economy thereafter).
3. **Public rotation only.** No custom/private-lobby UI toggle for starting gold in this task.

---

## What to build

### 1. New `GameConfig` field — `startGold`
- `src/core/Schemas.ts` (GameConfig schema, near `infiniteGold: z.boolean()` at ~line 169):
  add `startGold: z.number().int().nonnegative()`. 5M is well within `Number.MAX_SAFE_INTEGER`;
  convert to `bigint` at apply time. Mirror how `infiniteGold` is declared.
  - *Lower-edit alternative:* `z.number().int().nonnegative().default(0)` so existing literals
    don't all need the field. Coder's call, but keep it **consistent** with how `infiniteGold`
    is handled (today it's required everywhere).

### 2. Config interface + default
- `src/core/configuration/Config.ts` (near `infiniteGold(): boolean;` at ~line 107): add
  `startGold(playerInfo: PlayerInfo): number;` — mirror the `startManpower(playerInfo)` signature.
- `src/core/configuration/DefaultConfig.ts`: implement, gated on player type:
  ```
  startGold(playerInfo: PlayerInfo): number {
    if (
      playerInfo.playerType === PlayerType.Human ||
      playerInfo.playerType === PlayerType.AiPlayer
    ) {
      return this._gameConfig.startGold; // 0 by default, 5_000_000 under the modifier
    }
    return 0;
  }
  ```

### 3. Apply at player creation (deterministic — `src/core/`)
- Player gold is hardcoded to `0n` in the `PlayerImpl` constructor (`src/core/game/PlayerImpl.ts:119`).
- Grant starting gold where the player is created in `GameImpl` (the same place `startManpower`
  is fetched, ~`src/core/game/GameImpl.ts:451–455`). Recommended: mirror `startTroops` — fetch
  `this.config().startGold(playerInfo)` and either pass it into the constructor (parallel to
  `startTroops`, set `this._gold = toInt(startGold)`), or call
  `player.addGold(BigInt(this.config().startGold(playerInfo)))` right after construction.
  Either is fine; the constructor-param approach keeps init atomic and matches `startTroops`.
- **Determinism note:** this runs in the core sim on both client and server. As long as every
  `GameConfig` literal carries the same `startGold` value (step 4), both sides compute identical
  starting gold — no desync. This is the reason every literal must be updated.

### 4. Populate the field at every `GameConfig` construction site
Add `startGold` (default `0`) so the schema validates everywhere `infiniteGold` already appears:
- `src/server/GameManager.ts:58`
- `src/server/MapPlaylist.ts:158`
- `src/client/Main.ts:823` and `:895`
- `src/client/SinglePlayerModal.ts:566` and `src/client/HostLobbyModal.ts:751` → `startGold: 0`
  (custom lobbies — no new UI toggle this task)
- `src/server/GameServer.ts:131–132`: apply the override when present, parallel to the existing
  `if (gameConfig.infiniteGold !== undefined) { ... }` block.

### 5. The modifier itself
- `src/server/MapPlaylist.ts` `WEIRD_SETTING_OPTIONS`: add `() => ({ startGold: 5_000_000 })` as a
  new sub-option. This **adds** to the existing set (it does not replace any entry), so the rotation
  grows from four sub-options to **five**. The 20% weird-match budget is unchanged — it is now split
  five ways at ~4% each.

### 6. Lobby badge + localization
- `src/client/PublicLobby.ts` `getWeirdModifierLabel()` (~line 24): add a case —
  if `gameConfig.startGold > 0` return the `modifier_starting_gold` label. (The modifier ID is
  not sent to the client, so the label is derived from the config field, same as the others.)
- `resources/lang/en.json` **and** `resources/lang/ru.json` (keep both in sync): add
  `modifier_starting_gold`. Suggested copy — en: `"5M Starting Gold"`, ru: `"Старт: 5М золота"`
  (final RU wording at Mark's discretion).

---

## Independence

- **Standalone task.** This modifier is self-contained, with **no dependency on — and no sequencing
  against — any other modifier task** (including the separate
  `infinite-gold-force-no-nukes-public-rotation.md`). Ship it whenever convenient.
- It only **adds** the `startGold` sub-option; it does **not** touch the `infiniteGold` entry or any
  other existing weird option.

---

## Out of scope (leave intact)
- The `infiniteGold` field and every other existing weird sub-option — untouched by this task.
- Any custom/private-lobby "starting gold" UI option — `startGold: 0` there is enough.
- Rebalancing nuke/silo costs.

---

## Tests (required)

**`src/core/` (mandatory per project rule):**
- With `startGold: 5_000_000` in config, a newly created `Human` **and** `AiPlayer` start with
  exactly `5_000_000` gold.
- A `FakeHuman` (nation) **and** a `Bot` start with `0` gold under the same config.
- With default config (`startGold: 0`), all player types start with `0` gold (no regression).

**`tests/server/MapPlaylist.test.ts`:**
- `WEIRD_SETTING_OPTIONS` includes an entry that sets `startGold: 5_000_000`.
- Selecting that option yields `startGold: 5_000_000` and does not set `infiniteGold`.
- Top-level registry / `MODIFIED_MATCH_RATE` assertions still pass.
  *(Expected `WEIRD_SETTING_OPTIONS` count is **five** once this lands — four existing entries + the new 5M entry.)*

---

## Verification

1. **Unit tests:** core starting-gold tests + `MapPlaylist.test.ts` pass.
2. **Code:** `startGold` present in schema, interface, default, every `GameConfig` literal, and
   the `GameServer` override block; modifier adds the 5M entry.
3. **Live (post-deploy) — per the spatial/gameplay live-test rule, don't trust synthetic tests
   alone:**
   - Force/await a public match with the modifier: the **"5M Starting Gold"** badge shows on the
     lobby, and the human (and AI-fill players) **begin the match with 5M gold**; nations/bots do not.
   - Confirm normal (unmodified) matches are unaffected and the other weird modes still work.
   - Spot-check that openings are bounded — players can buy a silo + a few atom bombs but cannot
     sustain endless nuking. If openings still feel nuke-heavy, flag the 5M constant for tuning.
4. **No new analytics event.** There is no per-modifier analytics dimension today, so the gate is
   the live public-rotation spot-check above (consistent with the sibling modifier tasks).

---

## Notes
- Effort: ~1 day (new field plumbing across client + server, core player-init wiring, badge +
  localization, core & server tests, live spot-check) — driven by the new schema field and
  player-init changes.
- Touches `src/core/` (player init + config) — desync-sensitive; the all-literals rule in step 4
  is what keeps client/server starting gold identical.
- Weekend deploy (low-traffic window). Touches the prod public-rotation path.
