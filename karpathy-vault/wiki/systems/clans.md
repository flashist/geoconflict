# Clans System

**Layer**: core / server / client
**Key files**: `src/core/Util.ts`, `src/core/game/Game.ts`, `src/core/game/TeamAssignment.ts`, `src/core/game/GameImpl.ts`, `src/core/Schemas.ts`

## Summary

The clans system lets players self-identify as a group by embedding a short tag in their display name (e.g. `[ABC]MyName`). In team modes (Duos/Trios/Quads), the engine reads these tags and keeps clan members on the same team wherever possible. There is no backend registration, no UI, and no in-game visibility — clan membership is derived entirely from the display name at join time.

## Architecture

### Tag Parsing

`getClanTag(name)` — `src/core/Util.ts:329`

```typescript
export function getClanTag(name: string): string | null {
  if (!name.includes("[") || !name.includes("]")) return null;
  const clanMatch = name.match(/\[([a-zA-Z0-9]{2,5})\]/);
  return clanMatch ? clanMatch[1].toUpperCase() : null;
}
```

- Pattern: `[TAG]` anywhere in the display name, TAG = 2–5 alphanumeric characters, case-insensitive input
- Output: uppercase string or `null`

### Player Model

`PlayerInfo.clan` — `src/core/game/Game.ts:410–421`

A read-only field set once in the `PlayerInfo` constructor via `getClanTag(name)`. It is NOT a Zod schema field — it lives directly on the TypeScript class. Exposed via the `Player.clan()` interface (`Game.ts:605`) and `PlayerImpl.clan()` (`PlayerImpl.ts:208`).

### Team Assignment

`assignTeams(players, teams)` — `src/core/game/TeamAssignment.ts` (full file, 89 lines)

Called only in `GameMode.Team` (`GameImpl.ts:102`). Algorithm:

1. Group players by `player.clan` tag into `Map<string, PlayerInfo[]>`.
2. Players with no clan tag go to a separate `noClanPlayers` list.
3. `maxTeamSize = Math.ceil(players.length / teams.length)`.
4. Sort clans by size (largest first). Assign each clan to the team with the current fewest players.
5. If adding the full clan would exceed `maxTeamSize`, excess members receive `"kicked"`.
6. Non-clan players fill remaining slots: `FakeHuman` (nations) shuffled randomly; human players assigned deterministically.
7. Returns `Map<PlayerInfo, Team | "kicked">`.

In `GameImpl.addPlayers()` (`GameImpl.ts:170–177`): kicked players are skipped with `console.warn` — they are never added to the game.

### Analytics Record

`clanTag: z.string().optional()` in `PlayerRecordSchema` — `src/core/Schemas.ts:567`

This is a separate, analytics-only field populated at game end. Not the same as `PlayerInfo.clan`. Populated at:
- Server: `src/server/GameServer.ts:988` — `clanTag: getClanTag(player.username) ?? undefined`
- Singleplayer: `src/client/LocalServer.ts:265` — same call

Both paths work correctly.

## Gotchas / Known Issues

### Kicked Players Get No Notification (Bug)

`GameImpl.ts:172–174`: A player whose clan overflows a team slot is silently omitted from the game with only `console.warn`. No disconnect message, no toast, no redirect is sent to the client. The player connects and never appears in the game without explanation.

### Clan Tags Are Unverified

Anyone can claim any tag by typing it in their display name. Abuse surface: tag squatting, impersonating known clans, forcing desired team composition via coordinated tag use. No server-side sanitization exists before `getClanTag()` is called.

### FFA Mode — Tag Parsed But Unused

In `GameMode.FFA`, `assignTeams()` is never called (`GameImpl.ts:151–154`). `PlayerInfo.clan` is populated but has no effect on gameplay. The tag IS written to `PlayerRecord` for analytics.

### No Clan UI

Zero instances of clan tag rendering exist anywhere in `src/client/`. Players cannot see who shares their tag in the lobby, on name plates, or on the leaderboard. No analytics events fire for clan membership or team grouping outcomes. The feature is entirely invisible to players.

### Assignment Fairness Gaps

- Excess clan members kicked are those at the tail of the `clanPlayers` array (unsorted input order) — deterministic but arbitrary.
- Competing clans for the same team slot: largest clan wins. No tie-breaking by join order.
- Oversized clans are not split across teams; overflow is kicked rather than placed on a secondary team.

## Related

- [[tasks/investigate-clans-system]] — Investigation findings and recommended next steps
- [[tasks/sprint4b-duos-trios-quads]] — The team modes that currently drive `assignTeams()` usage
- [[decisions/sprint-5]] — Clans is a planned Sprint 5 feature (Task 12): free tag + auto-team placement; paid: banner, stats, match history
- [[systems/execution-pipeline]] — Intent → Execution flow for context on how player actions are processed
