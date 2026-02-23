# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenFront is a real-time strategy browser game focused on territorial control and alliance building. Players compete to expand territory, build structures, and form alliances on maps based on real-world geography.

## Development Commands

```bash
npm run dev              # Run client + server with hot reload
npm run dev:staging      # Client + server, API points to api.openfront.dev
npm run dev:prod         # Client + server, API points to api.openfront.io
npm run dev:remote       # Client only, proxies WS/API to remote dev VPS
npm run start:client     # Client only with hot reload
npm run start:server-dev # Server only with dev settings
npm test                 # Run all tests
npm test -- path/to/test # Run specific test file
npm run lint             # Check for lint errors
npm run lint:fix         # Fix lint errors
npm run format           # Format code with Prettier
npm run gen-maps         # Regenerate maps via Go tool in map-generator/
npm run perf             # Run performance benchmarks in tests/perf/
```

## Codebase Context

This is a fork/adaptation of [OpenFront.io](https://openfront.io/). Local divergences from upstream are marked with `// Flashist Adaptation` comments. When reading code, treat these as intentional customizations (e.g., some game modes like Duos/Trios/Quads are disabled).

Feature specifications live in `ai-agents/tasks/`.

## Architecture

### Three-Tier Structure

```
src/client/   → Browser frontend (Pixi.js rendering, input handling)
src/core/     → Shared game logic (runs on both client and server)
src/server/   → Node.js backend (game lifecycle, networking)
```

### Game Loop & Tick System

The game is **tick-based** with deterministic execution:
- Server collects player intents and broadcasts turns (~1000ms intervals)
- Client receives turns, executes in a Web Worker for responsiveness
- Both run identical game logic for consistency; hash verification detects desync

### Intent → Execution Pipeline

All game actions follow this flow:

1. **Input** → User action captured in `InputHandler.ts`
2. **Intent** → Event emitted (e.g., `SendAttackIntentEvent`), sent via `Transport.ts`
3. **Execution** → `ExecutionManager.createExec(intent)` creates execution object
4. **Tick** → Execution's `tick()` method modifies game state, produces `GameUpdate` objects

Key execution types: `AttackExecution`, `SpawnExecution`, `BuildExecution`, `AllianceExecution`

### Key Subsystems

**Networking**: WebSocket with multi-worker load balancing. Messages are Zod-validated JSON. Server at `Worker.ts`, client at `Transport.ts`.

**Rendering**: Pixi.js with layered architecture (~40 layers). See `src/client/graphics/layers/`. `GameRenderer.ts` orchestrates all layers.

**Events**: `EventBus` pattern for decoupled communication throughout client.

**Game State**: `GameImpl.ts` holds players, units (via `UnitGrid`), attacks, alliances, tile ownership.

**Configuration**: `src/core/configuration/` contains environment-specific configs (`DevConfig.ts`, `PreprodConfig.ts`, `ProdConfig.ts`). Selected via `GAME_ENV` env var. `Config.ts` defines the full interface; `DefaultConfig.ts` provides base values.

### Critical Files

| File | Purpose |
|------|---------|
| `src/core/GameRunner.ts` | Game tick execution |
| `src/core/game/GameImpl.ts` | Game state container |
| `src/core/execution/ExecutionManager.ts` | Intent → Execution dispatch |
| `src/server/GameServer.ts` | Game lifecycle & networking |
| `src/client/ClientGameRunner.ts` | Client game orchestration |
| `src/client/Transport.ts` | WebSocket communication |
| `src/client/graphics/GameRenderer.ts` | Rendering orchestration |

## Testing

Tests are in `tests/` directory using Jest with SWC for transforms.

```bash
npm test                          # Run all tests
npm test -- tests/Attack.test.ts  # Run single test file
npm test -- --watch               # Watch mode
npm run test:coverage             # Coverage report
```

**Important**: All code changes in `src/core/` MUST be tested.

## Code Style

- ESLint + Prettier with pre-commit hooks (husky + lint-staged)
- Use `===` (eqeqeq rule enforced)
- Use nullish coalescing (`??`) over logical or (`||`) for defaults
- TypeScript with strict null checks enabled

## Adding New Game Features

1. Define intent schema in `src/core/Schemas.ts`
2. Create execution class in `src/core/execution/` implementing `Execution` interface
3. Register in `ExecutionManager.createExec()`
4. Add UI trigger in `InputHandler.ts` or relevant component
5. Add rendering layer if needed in `src/client/graphics/layers/`
