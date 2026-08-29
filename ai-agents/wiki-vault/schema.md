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

**ADR page naming (owner-ruled 2026-08-23):** vault ADR pages (`wiki/decisions/adr-NNN-<slug>.md`) may carry an **abbreviated slug** relative to their `ai-agents/knowledge-base/decisions/` counterpart — this is the vault's **accepted standing style**, not drift (e.g. `adr-104-archiving-disabled.md` for `adr-104-match-archiving-disabled-until-s3-citizen-gated.md`). The ADR **number** must match its knowledge-base counterpart and stay unique; lint checks numbers (numerically, case-insensitively) and headings, and **must not flag slug abbreviation** against a same-numbered, same-decision counterpart. A same-number page whose content is a *different* decision remains the collision lint exists to catch.

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

## Standing Owner Rulings (binding on lint)

Settled questions live here. A lint run **must read this section before reporting an open owner
question**, and **must not re-raise anything ruled below**. Each ruling records its date, how it
reached the wiki, and what it does *not* cover.

Also binding, recorded in place rather than repeated here: the **ADR page naming** ruling of
2026-08-23 (see the Decision Page section above).

### Public hostnames may remain in vault pages — CLOSED (owner-ruled 2026-08-29)

**Ruling.** Public hostnames may stay in vault pages. Do not strip them. The question is **closed**.

**Provenance.** The owner, 2026-08-29, answering an `AskUserQuestion` put by the fkit-lead session;
recorded here by the wiki role on the lead's instruction.

**Reasoning, on the record.** `api.geoconflict.ru` (8 pages), the bare host `geoconflict.ru`
(3 pages) and the player-facing `t.me` / `vk.com` channel URLs (3 pages) are **public endpoints
already present in the repo and in the shipped client**. None of them is a credential. On at least
one page — [[decisions/yandex-invite-portal-boundary]] — **the hostname *is* the finding**, so
removing it would make the page worse, not safer.

**This ruling supersedes the open-question entries from the three prior lint runs** that raised it
and were relayed to the owner without an answer: the three `log.md` lint entries filed under
2026-08-28 (the first of which the two later entries back-reference as "the 2026-08-27 lint" — the
run's own log header reads 2026-08-28; the discrepancy is noted, not resolved here). Those entries
stay in the append-only log as written; they are **settled, not open**, and a future lint must not
count them as a pending owner question.

**Boundary — this covers PUBLIC HOSTNAMES ONLY.** It is **not** a licence for endpoints in general.
It does **not** permit credentials, tokens, API keys, DSNs, connection strings, private keys, or
private / non-localhost IP addresses in any vault page, and **the secret scan must keep failing on
those**. Read this ruling narrowly: "a public hostname is allowed" never generalizes to "an endpoint
is allowed". When in doubt about a value that is not a plain public hostname, flag it — that question
is not settled by this ruling.

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
- rendering (Canvas 2D layers, GameRenderer; one Pixi/WebGL layer composited in)
- execution-pipeline (Intent → Execution → GameUpdate flow)
- configuration (DevConfig/PreprodConfig/ProdConfig, GAME_ENV)
- localization (translateText, en.json/ru.json sync rule)
- analytics (FlashistFacade, event enum, analytics-event-reference.md)
- telemetry (OTEL, Winston transport, build-deploy-telemetry.sh)
- flashist-init (initializationPromise, initExperimentFlags idempotency)
