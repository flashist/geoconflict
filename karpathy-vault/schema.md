# Wiki Schema — Geoconflict

This document defines the structure, conventions, and rules for the geoconflict wiki.
The LLM must follow this schema when creating or updating any wiki page.

---

## Directory Structure

```
wiki/
  features/    → Game features (mechanics, units, buildings, modes)
  systems/     → Technical systems (rendering, networking, game loop, etc.)
  decisions/   → Architectural and product decisions (ADRs)
  tasks/       → Summaries of completed/in-progress tasks from ai-agents/tasks/
sources/       → Raw source files (symlinks or copies — LLM reads, never edits)
index.md       → Master catalog of all wiki pages (one line each)
log.md         → Append-only chronological activity log
schema.md      → This file
```

---

## Page Types & Templates

### Feature Page (`wiki/features/<slug>.md`)

```markdown
# <Feature Name>

**Status**: active | deprecated | planned
**Source files**: `src/...`

## Summary
One paragraph overview of what this feature does from a player perspective.

## Implementation
How it works technically. Entry point, key classes, tick behavior.

## Intent → Execution Flow
Which intent schema → which Execution class → what GameUpdates it produces.

## Related
- [[systems/...]]
- [[features/...]]
```

### System Page (`wiki/systems/<slug>.md`)

```markdown
# <System Name>

**Layer**: client | server | core | shared
**Key files**: `src/...`

## Summary
What this system does and why it exists.

## Architecture
Components, data flow, key abstractions.

## Gotchas / Known Issues
Non-obvious behaviors, past bugs, performance notes.

## Related
- [[features/...]]
- [[systems/...]]
```

### Decision Page (`wiki/decisions/<slug>.md`)

```markdown
# <Decision Title>

**Date**: YYYY-MM-DD
**Status**: accepted | superseded | proposed

## Context
What problem or situation prompted this decision.

## Decision
What was decided.

## Consequences
Trade-offs, downstream effects, things to watch.

## Related
```

### Task Page (`wiki/tasks/<slug>.md`)

```markdown
# <Task Title>

**Source**: `ai-agents/tasks/.../filename.md`
**Status**: backlog | in-progress | done | cancelled
**Sprint/Tag**: ...

## Goal
What this task is trying to achieve.

## Key Changes
Files modified, patterns introduced, notable implementation choices.

## Outcome
Result, follow-up items, what was learned.

## Related
```

---

## Cross-Reference Rules

- Use Obsidian wiki-links: `[[systems/game-loop]]`, `[[features/attack]]`
- Always cross-link bidirectionally: if A links to B, B should link back to A
- Link to source files with backtick paths, not wiki-links: `` `src/core/GameRunner.ts` ``

---

## Index Conventions (`index.md`)

One line per page, grouped by category:

```
## Features
- [[features/attack]] — Territory attack execution and front-line calculation
- [[features/alliance]] — Alliance formation, betrayal, and embargo mechanics

## Systems
- [[systems/game-loop]] — Tick-based deterministic game loop
...
```

---

## Log Conventions (`log.md`)

Each entry:

```
## YYYY-MM-DD — <operation>
- Ingested: `sources/<file>` → created/updated [[wiki/...]]
- Query answered: "<question>" → filed as [[wiki/...]] (if valuable)
- Lint: found N issues, fixed M
```

---

## Source Ingestion Rules

1. Raw sources live in `sources/` or are referenced by path (never edited).
2. Prefer referencing project files by path over copying them.
3. When ingesting a task file, create a `wiki/tasks/<slug>.md` and update `index.md`.
4. When ingesting architecture/system docs, create or update the relevant `wiki/systems/` page.
5. Always append to `log.md` after any ingest or lint operation.

---

## Geoconflict Domain Reference

### Key Source Paths (read-only)
- `CLAUDE.md` — project architecture overview
- `ai-agents/knowledge-base/` — existing knowledge base docs
- `ai-agents/tasks/backlog/`, `done/`, `cancelled/` — task history
- `src/core/execution/` — all Execution classes (game mechanics)
- `src/client/graphics/layers/` — all rendering layers
- `src/core/configuration/` — environment configs
- `resources/lang/en.json` — localization keys

### Canonical Systems to Maintain Pages For
- game-loop (tick system, GameRunner, deterministic execution)
- networking (WebSocket, Worker.ts, Transport.ts, Zod validation)
- rendering (Pixi.js layers, GameRenderer)
- execution-pipeline (Intent → Execution → GameUpdate flow)
- configuration (DevConfig/PreprodConfig/ProdConfig, GAME_ENV)
- localization (translateText, en.json/ru.json sync rule)
- analytics (FlashistFacade, event enum, analytics-event-reference.md)
- telemetry (OTEL, Winston transport, build-deploy-telemetry.sh)
- flashist-init (initializationPromise, initExperimentFlags idempotency)
