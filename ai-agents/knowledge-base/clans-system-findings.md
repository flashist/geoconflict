# Clans System — Investigation Findings

**Date:** 2026-05-05
**Branch investigated:** `codex-sprint4b-duos-trios-quads`

---

## 1. What Is Implemented

The clans system is a lightweight, name-based grouping mechanism. No backend registration exists — clan membership is derived entirely from the player's display name.

### Tag Parsing

**`getClanTag(name)`** — `src/core/Util.ts:329`

```typescript
export function getClanTag(name: string): string | null {
  if (!name.includes("[") || !name.includes("]")) return null;
  const clanMatch = name.match(/\[([a-zA-Z0-9]{2,5})\]/);
  return clanMatch ? clanMatch[1].toUpperCase() : null;
}
```

- Pattern: `[TAG]` anywhere in the display name, TAG = 2–5 alphanumeric characters
- Tag is uppercased on extraction. `[abc]` and `[ABC]` yield the same clan.
- Returns `null` if no match.

### Player Model

**`PlayerInfo.clan`** — `src/core/game/Game.ts:410–421`

```typescript
export class PlayerInfo {
  public readonly clan: string | null;
  constructor(name: string, ...) {
    this.clan = getClanTag(name);
  }
}
```

`clan` is a read-only field set at construction time. It is NOT stored in a Zod schema — it lives directly on the `PlayerInfo` class.

**`Player.clan()` interface** — `src/core/game/Game.ts:605`
**`PlayerImpl.clan()` accessor** — `src/core/game/PlayerImpl.ts:208`

Both return `string | null`.

### Analytics Record

**`clanTag` in `PlayerRecordSchema`** — `src/core/Schemas.ts:567`

```typescript
export const PlayerRecordSchema = PlayerSchema.extend({
  clanTag: z.string().optional(),
  ...
});
```

This is a separate analytics-only field, populated at game end. It is NOT the same as `PlayerInfo.clan`. The task description incorrectly referenced `PlayerInfoSchema` — the actual schema is `PlayerRecordSchema`.

- Server path: `src/server/GameServer.ts:988` — `clanTag: getClanTag(player.username) ?? undefined`
- Local/singleplayer path: `src/client/LocalServer.ts:265` — same call

### Team Assignment

**`assignTeams()`** — `src/core/game/TeamAssignment.ts` (full file, 89 lines)

Called only in `GameMode.Team` (`src/core/game/GameImpl.ts:102`). Logic:

1. Players with a matching `clan` field are grouped together.
2. Clans are sorted by size, largest first.
3. Each clan is assigned to the team with the fewest current players.
4. `maxTeamSize = Math.ceil(players.length / teams.length)` — hard cap per team.
5. If adding the full clan would exceed `maxTeamSize`, excess members receive `"kicked"`.
6. Non-clan players fill remaining slots: `FakeHuman` (nations) are shuffled randomly, human players are assigned deterministically.

---

## 2. What Is Broken or Incomplete

### Critical: Kicked Players Get No Notification

**`src/core/game/GameImpl.ts:172–174`:**

```typescript
if (team === "kicked") {
  console.warn(`Player ${playerInfo.name} was kicked from team`);
  continue;  // player simply never added to game
}
```

A kicked player connects to the lobby, the game starts, and they silently do not appear in the game — no disconnect message, no toast, no redirect. From the player's perspective, the game loads but they are invisible and unable to interact. This is a bug affecting any team game where a clan is oversized.

### High: Fairness Gap in Team Assignment

- Excess clan members kicked are those at the end of the `clanPlayers` array — the order is arbitrary (not shuffled), so the same subset is always kicked from a given clan across reconnections.
- There is no mechanism to fairly split a clan that spans multiple teams (e.g. a 5-player clan in Duos). The whole clan is placed on one team; any overflow is kicked rather than placed on a second team.
- Two clans competing for the same "smallest team" slot: largest clan wins. No tie-breaking by join order or any other fairness criterion.

### High: No Clan UI

A complete UI audit of `src/client/` found **zero** instances of clan tag rendering:

- No clan tag display on lobby player list
- No clan indicator on in-game name plates
- No clan column on the leaderboard / end screen
- No clan grouping indicator in the alliance panel
- No analytics events for clan membership or clan-based team grouping

Players have no way to know the feature exists, confirm their tag was recognized, or see who shares their tag before a game starts.

### Medium: No Username Sanitization Before Tag Extraction

`getClanTag` is called directly on the raw username at both entry points:

- `GameServer.ts:988` — called on `player.username` from the join message
- `LocalServer.ts:265` — called on `this.lobbyConfig.playerName`

The username string is not sanitized or trimmed before tag extraction. Any player can claim any tag string by writing it in their name. Abuse surface:

- **Tag squatting**: claiming a tag associated with an established group
- **Impersonation**: copying a known clan's tag to be grouped with them
- **Forced teammate manipulation**: coordinating to use a shared tag to force team composition in public lobbies (particularly relevant when Duos/Trios/Quads is live)

No mitigations exist today.

---

## 3. What Is Undocumented

### Feature Is Entirely Hidden

The clan grouping mechanism has no in-game documentation, tutorial hint, or settings page. Players discover it (if at all) by reading source code or word of mouth. There is no Figma spec, wiki page, or task file describing intended clan UX prior to this investigation.

### FFA Mode — Clan Tag Is Parsed But Unused

In `GameMode.FFA`, `assignTeams()` is never called (`GameImpl.ts:151–154`). `PlayerInfo.clan` is set for every player but has no effect on gameplay. The clan tag IS written to `PlayerRecord` for analytics. This is a silent no-op — a player using `[XYZ]MyName` in FFA gets no team grouping benefit.

### `PlayerInfoSchema` vs `PlayerRecordSchema`

The `clanTag` field in `src/core/Schemas.ts:567` belongs to `PlayerRecordSchema` (analytics). The `clan` field used during actual gameplay is a plain TypeScript property on the `PlayerInfo` class — not schema-validated. This distinction is invisible in the task description and could confuse future contributors.

---

## 4. Recommended Next Steps

### Critical

- **Show a kick notification.** When `assignTeams()` returns `"kicked"` for a player, the server must disconnect them with a visible reason (e.g. "Your team is full — rejoin or reduce your clan's size"). Currently the player is silently dropped. File: `src/core/game/GameImpl.ts:172`.

### High

- **Add clan indicator to the lobby UI.** Show the clan tag next to the player name in the pre-game lobby. Players must be able to confirm that their tag was recognized and see who their clanmates will be.
- **Add clan tag to in-game name plates and the leaderboard / end screen.** Clan membership should be visible throughout the session, not just in analytics.

### Medium

- **Add analytics events for clan grouping.** Fire an event when a clan is kept together and when excess members are kicked. This quantifies adoption and informs product decisions.
- **Sanitize usernames before tag extraction.** At minimum, trim and length-cap the username before `getClanTag()` is called to reduce the attack surface.

### Low / Deferred

- **Fair splitting of oversized clans.** Instead of kicking overflow members, consider placing them on the closest-available team rather than discarding them entirely.
- **Formal clan registration.** Backend-validated clan membership would eliminate tag squatting, but requires significant infrastructure work. Not warranted until the feature has proven player adoption.
- **Anti-abuse measures.** Rate-limit tag changes, restrict known offensive strings, or require a minimum account age to use clan tags in public lobbies.

---

## Files Referenced

| File | Purpose |
|------|---------|
| `src/core/Util.ts:329` | `getClanTag` implementation |
| `src/core/game/Game.ts:410–421` | `PlayerInfo.clan` field |
| `src/core/game/Game.ts:605` | `Player.clan()` interface |
| `src/core/game/PlayerImpl.ts:208` | `clan()` accessor |
| `src/core/game/TeamAssignment.ts` | Full team-assignment logic |
| `src/core/game/GameImpl.ts:102–177` | Where `assignTeams()` is called and "kicked" is handled |
| `src/core/Schemas.ts:567` | `clanTag` in `PlayerRecordSchema` (analytics only) |
| `src/server/GameServer.ts:988` | Server-side `clanTag` population |
| `src/client/LocalServer.ts:265` | Singleplayer `clanTag` population |
