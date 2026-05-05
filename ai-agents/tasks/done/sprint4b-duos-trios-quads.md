# Task — Re-enable Duos/Trios/Quads Modes

## Sprint
Sprint 4b — after investigation findings reviewed

## Priority
Medium. Depends on `sprint4b-mini-mode-investigation.md` findings confirming no remaining failure modes with AI players.

---

## Context

Duos/Trios/Quads are team-mode variants that were disabled with the comment "Removing the modes when too few people might cause errors." The concern was matchmaking: if not enough real players were online to fill these modes, the game could produce an invalid state.

AI Players now populate public lobbies when real players are absent. This removes the original constraint. DAU is 8–9K on weekdays and 7–8K on weekends, which is sufficient. However: confirm the investigation findings before proceeding, and test on staging before shipping.

The code change is small — these modes are commented out in four files. The main implementation question (how Duos/Trios/Quads differ from regular team modes and how AI players interact with them) is answered by the investigation.

---

## What to Build

### 1. Uncomment the mode constants

In `src/core/game/Game.ts`:
```ts
// Remove the Flashist Adaptation comment block:
export const Duos = "Duos" as const;
export const Trios = "Trios" as const;
export const Quads = "Quads" as const;
```

In `src/core/Schemas.ts`:
- Uncomment the imports of `Duos`, `Trios`, `Quads`
- Uncomment the `z.literal(Duos)`, `z.literal(Trios)`, `z.literal(Quads)` entries in the `TeamCountConfig` union schema

In `src/server/MapPlaylist.ts`:
- Uncomment the imports of `Duos`, `Trios`, `Quads`
- Add them back to `TEAM_COUNTS` (alongside `HumansVsNations` and the regular counts)

### 2. Uncomment import in `SinglePlayerModal.ts`

`src/client/SinglePlayerModal.ts` has the same commented-out imports — uncomment them.

### 3. Any AI player or team-assignment guards

If the investigation identifies that AI players have a gap in Duos/Trios/Quads team assignment (question 5 in the investigation brief), fix that gap here before shipping.

### 4. Localization keys for badge labels

Duos/Trios/Quads will display via the existing team-count badge in `PublicLobby.ts`. The badge renderer uses `translateText(`public_lobby.teams_${teamCount}`)` for string `playerTeams` values, which means these three keys must exist in both locale files.

Add to `resources/lang/en.json` and `resources/lang/ru.json`:

`resources/lang/en.json`:
```json
"public_lobby": {
  "teams_Duos": "Duos",
  "teams_Trios": "Trios",
  "teams_Quads": "Quads"
}
```

`resources/lang/ru.json`:
```json
"public_lobby": {
  "teams_Duos": "Дуо",
  "teams_Trios": "Трио",
  "teams_Quads": "Квадро"
}
```

Mark will review the Russian wording before release.

---

## Verification

1. Start a public staging server. Confirm Duos/Trios/Quads lobbies appear in the public rotation.
2. Join a Duos lobby with fewer real players than required — confirm AI players fill the remaining slots and the game starts correctly.
3. Play a Duos/Trios/Quads match to completion — confirm win/loss conditions resolve correctly.
4. Confirm the existing regular Teams (2, 3, 4) and HumansVsNations modes are unaffected.
5. If compact maps are also shipping in this sprint: confirm a Duos/Trios/Quads match on a compact map works (unless the investigation explicitly excludes this combination).

---

## Notes

- Do not change `REGULAR_TEAM_COUNTS` — that constant is used elsewhere and should stay as `[2, 3, 4]`.
- If the investigation finds a remaining failure mode that is not fixed by AI player fill, flag it to Mark before shipping rather than shipping with a known error path.

---

## Follow-up — Singleplayer and Private Lobby Exposure

Duos/Trios/Quads were later exposed in the singleplayer and private lobby team-count selectors for manual testing. This follow-up intentionally did not add a start guard or force Nations on.

Known limitation remains: Duos with 1 participant, Trios with 1-2 participants, and Quads with 1-3 participants still throw `Too few teams: 1`.
