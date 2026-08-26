# Task — Force "No Nukes" When the Infinite-Gold Weird Modifier Is Applied (Public Rotation)

## ID
0044

## Sprint
Sprint backlog — no sprint home yet. (Public match-quality fix; same pattern as the Sprint 4c compact-map removal. Originally drafted under 4c as an infinite-gold *removal*; redirected 2026-06-20 to keep infinite gold but pair it with nukes-off — see "Change of direction" below.)

## Priority
Medium — match-quality fix. Pull the degenerate part (nuke-rush) out of the infinite-gold mode while keeping the mode itself. Not a prod blocker; safe weekend deploy.

## Status
🔲 Backlog

## Owner
fkit-coder

## Experiments
❌ Excluded — match-quality fix, ships to all players. No A/B.

---

## Change of direction (2026-06-20, Mark)

**This ticket previously scoped *removing* the infinite-gold sub-option from public rotation.** That is reversed. Infinite gold **stays** in the public weird-setting rotation — but whenever it is applied, the match must **also disable nukes** (the same effect as the existing "No nukes" weird option).

**Why:** with infinite gold, players have unlimited money and the dominant tactic collapses to spamming nukes at each other, which makes those matches chaotic and unfun. Disabling nukes when gold is infinite removes the nuke-rush degeneracy while keeping the "unlimited economy" novelty that makes the mode fun. This addresses the same root problem the old removal plan targeted, but keeps the mode instead of deleting it.

---

## Context

Sprint 4b added a public-match "weird setting" modifier system (`0156-weird-setting-modifier`). `MATCH_MODIFIERS` applies a modifier to ~20% of public matches (`MODIFIED_MATCH_RATE = 0.2`). With `mini_map` disabled in Sprint 4c, `weird_setting` is the only active top-level modifier, so it absorbs the full 20% budget.

`weird_setting` picks one of **four** sub-options uniformly at random (`src/server/MapPlaylist.ts`, `WEIRD_SETTING_OPTIONS`), each landing in ~5% of public matches:

| Sub-option | GameConfig override |
|---|---|
| **Unlimited gold** | `infiniteGold: true` ← **this entry changes** |
| Unlimited army | `infiniteTroops: true` |
| No nukes | `disabledUnits: [UnitType.MissileSilo]` |
| No SAM | `disabledUnits: [UnitType.SAMLauncher]` |

The "No nukes" sub-option already proves the mechanism: disabling **`UnitType.MissileSilo`** (the launch platform for Atom/Hydrogen bombs) prevents nukes entirely. The fix below reuses exactly that.

---

## What to build

Make the infinite-gold weird sub-option also disable nukes — keep `infiniteGold: true`, add `disabledUnits: [UnitType.MissileSilo]`.

**Primary change** — `src/server/MapPlaylist.ts`, `WEIRD_SETTING_OPTIONS` (first entry):

```ts
// before
() => ({ infiniteGold: true }),
// after
() => ({ infiniteGold: true, disabledUnits: [UnitType.MissileSilo] }),
```

`UnitType.MissileSilo` is already imported and used by the "No nukes" entry on the next line — no new imports.

**Resulting behaviour:**
- Weird-match rate stays **20%**; still **four** sub-options at ~5% each. **No rate/redistribution change** (the option count is unchanged — unlike the old removal plan, which dropped to three).
- Infinite-gold public matches now have nukes disabled (no Missile Silo, therefore no Atom/Hydrogen bombs).
- The standalone "No nukes" sub-option is unaffected and still exists independently.

### Player-facing label — one decision to make
The lobby badge for this option today reads "Unlimited gold" (`modifier_infinite_gold`, mapped in `getWeirdModifierLabel()` in `src/client/PublicLobby.ts`). With nukes now off in this mode, players who try to build a silo will be blocked with no on-badge explanation.
- **Recommended:** update the label to signal both effects (e.g. "Unlimited gold · No nukes"). If the copy changes, update **both `resources/lang/en.json` and `ru.json`** in sync (localization rule), and verify the badge isn't truncated in the lobby.
- **Acceptable fallback:** keep the "Unlimited gold" badge as-is (nukes-off as a silent balance tweak). Pick one with Mark if unsure; default to the recommended combined label.

---

## Out of scope (leave intact)

- **`infiniteGold` as a GameConfig field** — unchanged; this task only adjusts the public-rotation entry that sets it.
- **The other three weird sub-options** — unchanged.
- **Any custom/private-lobby path** that sets infinite gold deliberately — unaffected (it does not route through `WEIRD_SETTING_OPTIONS`).

---

## Tests (required)

Update `tests/server/MapPlaylist.test.ts`:
- The weird-setting coverage still expects **four** options (count unchanged).
- Assert that the infinite-gold option now **also** disables nukes: the result that sets `infiniteGold: true` must also include `UnitType.MissileSilo` in `disabledUnits`.
- Assert that no infinite-gold public result leaves nukes enabled.
- Confirm the top-level registry / `MODIFIED_MATCH_RATE` assertions still pass unchanged.

---

## Verification

1. **Unit tests:** `npm test -- tests/server/MapPlaylist.test.ts` passes with the four-option set and the new "infinite gold ⇒ nukes disabled" assertion.
2. **Code:** `WEIRD_SETTING_OPTIONS` has four entries; the infinite-gold entry sets both `infiniteGold: true` and `disabledUnits: [UnitType.MissileSilo]`.
3. **Live (post-deploy) — public rotation:** join/observe an infinite-gold weird match and confirm (a) gold is unlimited, (b) Missile Silo cannot be built and no nukes are launched. ~20% of matches still modified.
4. **No regression:** the standalone "No nukes", "Unlimited army", and "No SAM" modes and their badges still work; normal matches unaffected.

---

## Notes

- `src/server/` change (plus the existing `MapPlaylist.test.ts`, kept green). If the label copy changes, that adds a small `src/client/` + en/ru localization edit.
- Effort: ~half a day including the test update, optional label/localization, and a live public-rotation spot-check.
- **`0042-starting-gold-public-modifier` (5M Starting Gold) is now fully independent of this task** (decoupled by Mark, 2026-06-20). It was previously framed as a *replacement* for infinite gold; that coupling is removed. The 5M starting-gold modifier ships on its own merits as an additional weird sub-option, and infinite gold stays (fixed via no-nukes here). The two tasks no longer depend on or sequence against each other.
