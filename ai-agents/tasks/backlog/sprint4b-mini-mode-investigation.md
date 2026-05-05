# Task — Investigation: Compact Map + Duos/Trios/Quads Compatibility

## Sprint
Sprint 4b — run first, before any implementation begins

## Priority
High — unblocks both `sprint4b-compact-map-rotation.md` and `sprint4b-duos-trios-quads.md`. Should complete in one day.

---

## Context

Sprint 4b introduces two changes to public matchmaking that have not been tested together: compact maps in the public rotation, and re-enabling Duos/Trios/Quads modes. Before implementation, we need to know whether either change introduces map-level or player-count problems that would require scoping adjustments.

`GameMapSize.Compact` already exists and works in private lobbies and singleplayer. Duos/Trios/Quads are commented out in the codebase with the note "too few people might cause errors." AI players now fill public lobbies, which changes the original assumption.

---

## Investigation Questions

### Compact maps — map compatibility

1. **Nation coordinate validity.** `TerrainMapLoader.ts` halves nation coordinates when `GameMapSize.Compact` is set. For every map in the current public rotation (see `MapPlaylist.ts` frequency table), verify that halved nation coordinates still land on valid land tiles and do not cluster unreasonably. Are any maps unsafe to run in compact mode?

2. **Player capacity.** The current `maxPlayers` value is set by `config.lobbyMaxPlayers(map, mode, playerTeams)` and is not adjusted for compact maps. With a smaller playable area, is the default player count still appropriate, or does compact mode produce a significantly overcrowded map for any maps in the rotation?

3. **Any other known rendering or gameplay issues** with compact maps that are not exercised in private lobbies (e.g., minimap display, camera bounds, spawn spacing)?

### Duos/Trios/Quads — mode behaviour

4. **What exactly do Duos/Trios/Quads mean?** Read the upstream logic for these `TeamCountConfig` values. How do they differ from regular `playerTeams: 2 | 3 | 4`? Specifically: do they require a fixed number of human players per team, or is the distinction something else?

5. **AI player compatibility.** Can AI players correctly fill Duos/Trios/Quads lobbies the same way they fill regular team lobbies? Is there any team-assignment or spawning logic that assumes human-only occupancy for these modes?

6. **Original failure mode.** The code comment says "removing the modes when too few people might cause errors." With AI Players now active, is the original failure condition still reachable? What specific error was it?

### Compact + Duos/Trios/Quads interaction

7. Can a compact map run safely with Duos/Trios/Quads? If player capacity is already constrained on compact maps, does adding a Duos/Trios/Quads team structure make it worse?

---

## Output

Write findings as a short document in `ai-agents/knowledge-base/sprint4b-mini-mode-findings.md`. For each question: is there a problem, what is it, and what (if anything) needs to change in the implementation briefs before coding begins.

If any map is unsafe for compact mode, list it explicitly — the implementation brief will exclude it from the compact rotation.

If Duos/Trios/Quads have a remaining failure mode even with AI players, flag it — the re-enable task may need a guard or a staging test plan adjustment.
