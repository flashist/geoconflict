# Game Overview

**Layer**: shared
**Key files**: `src/core/game/Game.ts`, `src/core/configuration/DefaultConfig.ts`, `CLAUDE.md`

## Summary

Geoconflict is a fork/adaptation of OpenFront.io — a real-time territorial strategy browser game. Players expand territory, build structures, form alliances, and deploy weapons to dominate a map. All intentional divergences from upstream are marked `// Flashist Adaptation`.

Source: `ai-agents/knowledge-base/geoconflict-overview.md`, `CLAUDE.md`

## Architecture

Three-tier structure:
- `src/client/` — Browser frontend (Pixi.js rendering, input handling)
- `src/core/` — Shared game logic (runs on both client and server; deterministic)
- `src/server/` — Node.js backend (game lifecycle, networking)

**Technology stack:** TypeScript, Pixi.js (rendering), Lit (web components), Node.js + WebSocket + Express, Zod (message validation), webpack + SWC.

## Game Types & Modes

| Dimension | Values |
|---|---|
| GameType | `Singleplayer`, `Public`, `Private` |
| GameMode | `Free For All (FFA)`, `Team` |
| Disabled | ~~Duos~~, ~~Trios~~, ~~Quads~~ (Flashist Adaptation — too few players) |

## Maps

32 maps total (`GameMapType` enum in `src/core/game/Game.ts`):
- **Continental** (9): World, Giant World Map, North/South America, Europe, Europe Classic, Asia, Africa, Oceania
- **Regional** (17): Black Sea, Britannia, Iceland, East Asia, Japan, Italia, Australia, and others
- **Fantasy** (6): Pangaea, Pluto, Mars, Deglaciated Antarctica, Achiran, Baikal (Nuke Wars)

## Player Types

| Type | Description |
|---|---|
| `Human` | Real player |
| `Bot` | Simple server-spawned bot |
| `AiPlayer` | AI player in public lobbies (indistinguishable from human in UI); see [[features/ai-players]] |
| `FakeHuman` | NPC nation from map data (`clientID === null`) |

## Spawn Phase

- Multiplayer: 300 ticks | Singleplayer: 100 ticks
- Spawn immunity after phase ends: 50 ticks (5 seconds)
- Starting troops: Human = 25k, Bot = 10k, FakeHuman = 2,500–50,000 × nation.strength

## Economy

- Gold/tick: Human/AiPlayer = 100, Bot = 50
- Troop regen: `10 + (troops^0.73) / 4 × (1 - troops/maxTroops)` — bots at 60%
- Max troops: `2 × (tiles^0.6 × 1000 + 50000) + Σ city.level() × 250,000`
- Structure cost scaling (City, Port, Factory): 125k → 250k → 500k → 1M (capped)

## Units & Structures (18 unit types)

**Offensive:** Transport Ship, Warship, Shell, Atom Bomb (750k), Hydrogen Bomb (5M), MIRV (35M), MIRV Warhead, SAM Missile

**Structures:** City (max troops), Port (trade ships), Factory (trains), Defense Post (combat bonus in 30-tile radius), Missile Silo (fires nukes), SAM Launcher (80% intercept on nukes)

**Logistics:** Trade Ship (auto-spawned by ports), Train (by factories), Construction (placeholder)

## Combat System

Land combat: attacker sends `troops/5` (human) or `troops/20` (bot) → tiles conquered from a priority queue. Per-tile: `attackLogic()` computes losses for both sides.

Terrain base values: Plains (mag 80, speed 16.5), Highland (mag 100, speed 20), Mountain (mag 120, speed 25). Higher mag = harder to take.

Key modifiers: Defense Post (mag ×5, speed ×3), Fallout, Traitor debuff (0.5× defense), Large defender sigmoid debuff.

Retreat incurs 25% casualty. Alliance breaks on attack: −80 relation penalty + 3000-tick embargo.

## Alliance & Diplomacy

- Relation value per pair: ranges from hostile to allied
- Nukes break alliance after 100 tiles destroyed (MIRV is exempt)
- Embargo blocks trade income

## Tick System

Server turn interval: ~67ms (100ms / 1.5× speed coefficient — Flashist Adaptation). Both client and server run identical game logic deterministically. Hash verification every 10 turns detects desync.

## Gotchas / Known Issues

- Server turn interval is 1.5× faster than upstream OpenFront.io (Flashist Adaptation)
- Game modes Duos/Trios/Quads are disabled
- `#join=gameID` URL push is disabled (Flashist Adaptation) — see [[decisions/double-reload-fix]]

## Related

- [[systems/analytics]] — player behaviour tracking
- [[systems/telemetry]] — server observability
- [[systems/server-performance]] — server-side lag analysis and endTurn() pipeline
- [[systems/match-logging]] — what is recorded per match
- [[features/ai-players]] — AI Players feature spec (`PlayerType.AiPlayer` documented here)

> **LINT WARNING:** The following related pages are not yet created. Run `/wiki-ingest architecture` to generate them from `CLAUDE.md`:
> - `[[systems/game-loop]]` — tick execution detail
> - `[[systems/networking]]` — WebSocket + intent pipeline
> - `[[systems/execution-pipeline]]` — Intent → Execution → GameUpdate flow
> - `[[systems/rendering]]` — Pixi.js layer architecture
