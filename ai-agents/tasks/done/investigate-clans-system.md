# Task — Investigation: Clans System

## Context

The clans system already exists in the codebase but was never formally documented or surfaced as a product feature. It was discovered incidentally during work on the Duos/Trios/Quads team modes. This investigation should produce a clear picture of what is implemented, how it behaves, and what (if anything) needs to be built, fixed, or exposed to players.

---

## What Is Already Known

**Tag parsing** — `getClanTag(name)` in `src/core/Util.ts:329` extracts a clan tag from a player's display name using the pattern `[TAG]` where TAG is 2–5 alphanumeric characters (e.g. `[ABC]MyName` → clan `ABC`). Tags are uppercased on extraction.

**Player model** — `clanTag` is an optional field in `PlayerInfoSchema` (`src/core/Schemas.ts:567`). It is set from the username at join time:
- `src/server/GameServer.ts:988` — server path
- `src/client/LocalServer.ts:265` — local/singleplayer path

`Player` exposes `clan(): string | null` via `PlayerImpl.ts:208`.

**Team assignment** — `assignTeams()` in `src/core/game/TeamAssignment.ts` is the only place clan membership currently affects gameplay. When teams are being formed (Duos/Trios/Quads), players in the same clan are grouped and assigned to the same team where possible. If the team is full, excess clan members are `"kicked"`.

---

## Investigation Goals

### 1. Confirm the full surface area

- Is `clan()` used anywhere beyond `TeamAssignment.ts`? Search for `player.clan` and `.clan()` calls across `src/`.
- Is the clan tag rendered anywhere in the client UI (name plates, lobby, leaderboard, alliance panel)? Search `src/client/` for clan rendering.
- Are there any analytics events fired for clan membership or clan-based team grouping?

### 2. Understand the team assignment logic edge cases

Read `src/core/game/TeamAssignment.ts` carefully:

- What happens when a clan has more members than `maxTeamSize`? (Currently: excess are `"kicked"` — confirm this is intentional and that kicked players see a clear message.)
- What happens when two clans both want the same team and one must be split? Is there a fairness mechanism or is it first-come-first-served by clan size?
- What happens in FFA mode (no teams)? Is `assignTeams()` even called? If not, does the clan tag sit unused in FFA?
- Does clan grouping interact with the `Nation` / `FakeHuman` player paths correctly?

### 3. Clan tag as a user-controlled field

- Clan tags are parsed entirely from the username string. There is no registration, membership, or validation step. Any player can write `[XYZ]` in their name and claim any tag.
- Are there any abuse vectors? (Tag squatting, impersonating a known clan, bypassing kick by using a shared tag to force teammates.)
- Is there any server-side sanitization of the username before `getClanTag` is called?

### 4. Product gap: no clan UI

- Players have no in-game way to see who shares their clan tag — there is no clan roster, no clan indicator on the map or in the lobby, no confirmation that they will be grouped with their clanmates.
- How do players currently know the feature exists? (They likely don't — it is entirely implicit.)
- Is there any design intent documented elsewhere (wiki, task files, Figma) for a clan UI?

### 5. Relation to Duos/Trios/Quads

- The team assignment code that uses clans is exactly the code used by these modes. Confirm: if Duos/Trios/Quads is re-enabled for `geoconflict.ru`, does clan grouping work end-to-end in production?
- Does the local dev path (`LocalServer.ts`) also parse and pass the clan tag correctly for testing?

---

## Deliverables

After the investigation, document findings in `ai-agents/knowledge-base/clans-system-findings.md` covering:

1. **What is implemented** — confirmed behavior with file references.
2. **What is broken or incomplete** — edge cases, missing UI, abuse surface.
3. **What is undocumented** — anything that affects real matches but players have no way to know.
4. **Recommended next steps** — ranked: critical fixes, UX gaps, nice-to-haves.

Then ingest the findings file into the wiki: `/wiki-ingest ai-agents/knowledge-base/clans-system-findings.md`

---

## Files to Read

| File | Reason |
|------|--------|
| `src/core/Util.ts:329` | `getClanTag` implementation |
| `src/core/game/TeamAssignment.ts` | Full team-assignment logic |
| `src/core/game/PlayerImpl.ts` | `clan()` accessor |
| `src/core/Schemas.ts:567` | `clanTag` in `PlayerInfoSchema` |
| `src/server/GameServer.ts` | Server-side clan tag assignment |
| `src/client/LocalServer.ts` | Client-side clan tag assignment |
| `src/core/game/Game.ts` | `Player.clan()` interface declaration |
