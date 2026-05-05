# Investigate Clans System

**Source**: `ai-agents/tasks/done/investigate-clans-system.md`
**Findings**: `ai-agents/knowledge-base/clans-system-findings.md`
**Status**: done
**Sprint/Tag**: Sprint 4b / pre-Sprint 5

## Goal

Produce a complete picture of the existing (undocumented) clans system: what is implemented, what is broken or incomplete, what players cannot see, and what needs to be built before Clans ships as a Sprint 5 feature.

## Key Changes

No source code was modified. This was a pure investigation.

**Files read:** `src/core/Util.ts:329`, `src/core/game/Game.ts:410–421,605`, `src/core/game/TeamAssignment.ts`, `src/core/game/GameImpl.ts:102–177`, `src/core/game/PlayerImpl.ts:208`, `src/core/Schemas.ts:567`, `src/server/GameServer.ts:988`, `src/client/LocalServer.ts:265`

**All client files in `src/client/`** were searched for clan rendering — zero instances found.

## Outcome

### What Is Implemented (and Working)

- `getClanTag(name)` extracts `[TAG]` (2–5 alphanumeric chars, uppercased) from any display name.
- `PlayerInfo.clan` stores the tag as a read-only field set at construction.
- `assignTeams()` in `TeamAssignment.ts` groups clan members together in `GameMode.Team`, largest clans first, with a `maxTeamSize` cap. Non-clan players fill remaining slots.
- `clanTag` is written to `PlayerRecordSchema` (analytics only — separate from `PlayerInfo.clan`) at game end via both the server and singleplayer paths.
- The singleplayer (`LocalServer.ts`) and server (`GameServer.ts`) paths both correctly parse and pass the clan tag — end-to-end clan grouping works in Duos/Trios/Quads.

### What Is Broken

**Critical — kicked players get no notification.** `GameImpl.ts:172–174`: players whose clan overflows a team slot are silently omitted from the game. Only `console.warn` is emitted. The player's client connects but the player never appears, with no explanation.

### What Is Missing

- No clan UI anywhere in the client — no lobby indicator, no name plate tag, no leaderboard column.
- No analytics events for clan grouping outcomes.
- No server-side sanitization — any player can claim any tag.
- Fairness gaps: excess members of oversized clans are kicked in array order (arbitrary), and competing clans are broken by size only with no tie-breaking.

### Recommended Next Steps (ranked)

1. **Critical:** Surface a kick notification to players removed due to clan overflow (`GameImpl.ts:172`).
2. **High:** Add clan tag indicator to the pre-game lobby UI.
3. **High:** Display clan tag on in-game name plates and leaderboard.
4. **Medium:** Add analytics events for clan grouping (members kept together, members kicked).
5. **Low/Deferred:** Formal clan registration, anti-abuse measures, fair overflow splitting.

### Schema Correction

The investigation task file referenced `PlayerInfoSchema` — the correct schema is `PlayerRecordSchema` (analytics). The `clan` field used during gameplay is a plain TypeScript property on `PlayerInfo`, not Zod-validated.

## Related

- [[systems/clans]] — Full system page for the clans mechanism
- [[tasks/sprint4b-duos-trios-quads]] — The team modes that exercise the clan assignment logic
- [[decisions/sprint-5]] — Clans is Task 12 in Sprint 5 (3–4 weeks; free tag + auto-team; paid: banner, stats, history)
