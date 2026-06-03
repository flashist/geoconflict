# Task — Disable Compact Maps in Public Rotation

## Sprint
Sprint 4c — Stabilization

## Priority
Medium. Removes a broken, low-value experience from public matchmaking. Compact public
matches carry the unresolvable `isShore` boat-attack defect (see Context), and compact
gameplay is not meaningfully different from normal-size matches — so the variety it adds
does not justify shipping the bug to players who did not opt in.

---

## Context

Compact maps entered public matchmaking in Sprint 4b via a `mini_map` modifier in the
shared match-modifier registry (`src/server/MapPlaylist.ts`). Today ~10% of public
matches are compact (see [[tasks/sprint4b-compact-map-rotation]]).

Compact `map4x.bin` binaries lose `isShore` designations for coastal tiles during
half-resolution downsampling. This disables the transport-boat radial action on
territories that visually border water. The runtime workaround was **cancelled on
2026-06-02** (`cancelled/s4c-fix-compact-map-boat-attack.md`) because live testing showed
it sends boats to semantically wrong coasts — the defect cannot be fixed at runtime
because the data needed is exactly what downsampling destroyed. The only reliable fix is
regenerating all 30 binaries (`s5-fix-compact-map-shore-generation.md`), which is
high-effort Sprint 5 work.

Rather than ship broken boats in public matches or wait on the map regen, this task pulls
compact out of the public rotation now. Private lobbies and singleplayer keep compact as
an explicit opt-in — they are out of scope.

Decisions locked with Mark (2026-06-03):
- **Scope: public rotation only.** Private lobby and singleplayer compact are unchanged.
- **Modifier rate stays `MODIFIED_MATCH_RATE = 0.2`.** With `mini_map` gone, the
  `weird_setting` modifier absorbs the full budget (~20% of public matches), up from
  ~10%. This is intended.

---

## What to Build

### 1. Server — remove `mini_map` from the active public rotation
In `src/server/MapPlaylist.ts`:
- Remove the `mini_map` entry from the active `MATCH_MODIFIERS` list so public matches can
  never be assigned `GameMapSize.Compact`.
- **Disable, do not delete.** Keep the `mini_map` modifier definition in the file (commented
  out or behind a clearly-named flag) so re-enabling after `s5-fix-compact-map-shore-generation.md`
  lands is a one-line change. Add a short comment pointing to this task and to s5.
- Leave `MODIFIED_MATCH_RATE` at `0.2`. `weird_setting` becomes the sole modifier and now
  applies to ~20% of public matches — this is the intended behaviour, not a regression.
- Leave the modifier system (`MatchModifier`, `applyMatchModifier()`, the registry
  scaffolding) intact — `weird_setting` still depends on it.

### 2. Tests
- Update `tests/server/MapPlaylist.test.ts`: the `mini_map` registry entry and the
  "compact modifier application" cases no longer apply. Replace them with assertions that
  no public config is ever assigned `GameMapSize.Compact`, and that `weird_setting` is now
  the only modifier selected within the modified-match rate.

### 3. Client / localization — leave in place
- The `Mini`/`Мини` badge in `src/client/PublicLobby.ts` only renders for compact lobbies;
  with none produced, it becomes dormant. Leave it and the `public_lobby.mini_map` keys in
  `en.json`/`ru.json` untouched — harmless and reversible when compact returns.

### Out of scope
- No changes to `HostLobbyModal.ts` (private lobbies) or `SinglePlayerModal.ts`
  (singleplayer) — compact stays opt-in there.
- No map-generator or binary changes (that is s5).
- Do not delete the modifier system or the badge code.

---

## Verification

1. Across many public lobbies locally, the `Mini`/`Мини` badge never appears and no public
   match starts at `GameMapSize.Compact`.
2. `weird_setting` matches still appear (now ~1 in 5 public matches).
3. Private lobby and singleplayer can still start a compact map (opt-in path unchanged).
4. `tests/server/MapPlaylist.test.ts` passes with the updated assertions.
5. **Analytics gate (production):** confirm compact public matches drop to ~0 after deploy
   using existing game-mode/map-size segmentation. If no compact-specific event exists,
   verify indirectly: compact-tagged public lobbies disappear and weird-setting frequency
   roughly doubles. Flag to the producer if neither signal is observable — we should not
   claim this shipped without a way to confirm compact public matches stopped.

---

## Notes
- This is the interim/public-facing half of retiring broken compact play. The root-cause
  path to ever re-enabling public compact is `s5-fix-compact-map-shore-generation.md`
  (regenerate the 30 binaries). Until that ships and is verified, the `mini_map` modifier
  stays disabled.
- Keep the change reversible and well-commented so re-enabling is trivial once the binaries
  are fixed.
