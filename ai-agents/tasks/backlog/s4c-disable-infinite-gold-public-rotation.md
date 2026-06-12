# Task — Disable Infinite-Gold Weird Mode in Public Rotation

## Sprint
Sprint backlog — no sprint home yet. (Public match-quality fix; same pattern as the Sprint 4c compact-map removal. Drafted under 4c, moved to the backlog 2026-06-12 to keep 4c historically frozen.)

## Priority
Medium — match-quality fix. Same shape as `s4c-disable-compact-public-maps.md`: pull an undesirable modifier out of the public auto-rotation. Not a prod blocker; safe weekend deploy.

## Experiments
❌ Excluded — match-quality fix, ships to all players. No A/B.

---

## Context

Sprint 4b added a public-match "weird setting" modifier system (`sprint4b-weird-setting-modifier.md`). `MATCH_MODIFIERS` applies a modifier to ~20% of public matches (`MODIFIED_MATCH_RATE = 0.2`). With `mini_map` disabled in Sprint 4c, `weird_setting` is the only active top-level modifier, so it absorbs the full 20% budget.

`weird_setting` currently picks one of **four** sub-options uniformly at random (`src/server/MapPlaylist.ts`, `WEIRD_SETTING_OPTIONS`), each landing in ~5% of public matches:

| Sub-option | GameConfig override |
|---|---|
| **Unlimited gold** | `infiniteGold: true` |
| Unlimited army | `infiniteTroops: true` |
| No nukes | `disabledUnits: [UnitType.MissileSilo]` |
| No SAM | `disabledUnits: [UnitType.SAMLauncher]` |

**Problem:** the infinite-gold variant should not appear in public auto-rotation matches. It removes the core economic constraint of the game and is not a desirable random surprise for players who join a normal public lobby.

---

## What to build

Remove the infinite-gold sub-option from the public weird-setting rotation.

**Primary change** — `src/server/MapPlaylist.ts`:
- Delete the `() => ({ infiniteGold: true })` entry from `WEIRD_SETTING_OPTIONS` (currently the first of four).
- The selector (`Math.floor(random() * WEIRD_SETTING_OPTIONS.length)`) is length-driven, so no index logic changes are needed — the array simply becomes three options.

**Resulting behaviour (expected, confirm acceptable):**
- Total weird-match rate stays at **20%** of public matches.
- The 20% is now split across **three** sub-options (unlimited army, no nukes, no SAM) at ~6.67% each, instead of four at ~5%.
- Infinite gold can no longer occur in any public auto-rotation match.

> **One micro-decision to confirm:** the simplest fix keeps the weird budget at 20% and redistributes the freed ~5% across the remaining three weird modes. If instead the intent is for that 5% to return to *normal* matches (weird drops to ~15%), that requires a small additional change. Default in this brief = keep 20%, redistribute. Flag if you want the other behaviour.

---

## Out of scope (leave intact)

- **`infiniteGold` as a GameConfig field** — keep it. This task only removes it from the *public auto-rotation* pool. Any custom/private-lobby path that sets infinite gold deliberately is unaffected.
- **Localization keys** (`modifier_infinite_gold` in `en.json`/`ru.json`) and the client `getWeirdModifierLabel()` case in `src/client/PublicLobby.ts` — leave both in place. They become dead for public rotation but are harmless and remain correct if infinite gold is ever surfaced elsewhere. No localization changes required for this task.

---

## Tests (required)

Update `tests/server/MapPlaylist.test.ts`:
- The existing coverage asserts all four weird-setting options. Update it to expect **three**.
- Add an assertion that public rotation **never** produces `infiniteGold: true` (e.g. run the modifier selection across the option set and confirm no result sets `infiniteGold`).
- Confirm the top-level registry / `MODIFIED_MATCH_RATE` assertions still pass unchanged.

---

## Verification

1. **Unit tests:** `npm test -- tests/server/MapPlaylist.test.ts` passes with the three-option set and the no-infinite-gold assertion.
2. **Code:** `WEIRD_SETTING_OPTIONS` contains exactly three entries; none sets `infiniteGold`.
3. **Live (post-deploy) — public rotation:** over a sample of public matches, confirm weird-setting matches only ever show Unlimited army / No nukes / No SAM badges; the Unlimited-gold badge no longer appears. (~20% of matches still modified.)
4. **No regression:** the other three weird modes and their lobby badges still work; normal matches unaffected.

---

## Notes

- `src/server/` change, not `src/core/`, but `MapPlaylist.test.ts` already exists and the project rule is to keep it green — update it in the same change.
- Effort: ~half a day including the test update and a live public-rotation spot-check.
- **Sprint placement (resolved 2026-06-12):** lives in the **sprint backlog**, not Sprint 4c. It was drafted under 4c because it shares the public match-quality pattern of the compact-map removal, but 4c already shipped (pre-travel, May 15 deadline) and is kept historically frozen. Needs a sprint home before implementation.
