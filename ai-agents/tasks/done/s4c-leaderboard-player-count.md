# Task — Leaderboard: Show Human Player Count in "Players Only" Label

## Sprint
Sprint 4c — Stabilization (small addition)

## Priority
Low / Quick Win — cosmetic UX improvement, ~1 hour of work.

---

## Context

The leaderboard has a "Players only" / "Только игроки" checkbox that filters the list to show only human players. The label gives no indication of how many human players are currently in the match. The request is to show the count: **"Players only (N)"** / **"Только игроки (N)"**.

Screenshot reference: the player is at rank 302 with 302 visible rows — users cannot easily see how many real players vs AI participants are in the match without toggling the filter.

---

## What to Build

In `src/client/graphics/layers/Leaderboard.ts`, update the label at line 212:

```
<span>${translateText("leaderboard.real_players_only")}</span>
```

Change to include the human player count:

```
<span>${translateText("leaderboard.real_players_only")} (${humanPlayerCount})</span>
```

Where `humanPlayerCount` is computed from the current game state as the number of players matching the existing human filter condition (the same `PlayerType.Human || PlayerType.FakeHuman` check used in `_showRealPlayersOnly` filtering at line 95–99). Compute it once in the render method, not inline in the template.

No localization changes required — the count is a number appended in parentheses, which is format-neutral across languages.

---

## Key files

- `src/client/graphics/layers/Leaderboard.ts` — only file that needs changing

---

## Verification

1. The label reads "Players only (N)" / "Только игроки (N)" where N is the correct count of human players in the current match.
2. N updates correctly as players are eliminated.
3. The count is visible regardless of whether the checkbox is checked or unchecked.
4. No change to filter behavior, sort order, or other leaderboard functionality.
