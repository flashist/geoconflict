# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Knowledge Base & Wiki

A structured wiki lives in `ai-agents/wiki-vault/` following the [Karpathy LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). It contains synthesized knowledge about systems, features, decisions, and tasks — things not easily derived from the code alone.

**Before starting any non-trivial task**, check if relevant wiki pages exist:
```bash
# Search the wiki for a topic — read-only, any role may run it
/fkit-query <your question>
```

**The wiki skills:**

| Skill | Purpose |
|---|---|
| `/fkit-query <question>` | Answer a question from wiki pages + source files. **Read-only — any role.** |
| `/fkit-wiki-ingest <path or keyword>` | Add/update pages from a source. Keywords: `architecture`, `knowledge-base`, `all tasks` |
| `/fkit-wiki-sync [date\|force]` | Ingest only what changed since the last sync (tracked by `.wiki-watermark`) |
| `/fkit-wiki-lint` | Health-check the wiki: broken links, stale claims, missing back-links |

> ⚠️ **Only the `fkit-wiki` agent writes `ai-agents/wiki-vault/`.** Reads are decentralized — run
> `/fkit-query` yourself. Every **write** (ingest, sync, lint) routes through that agent. The
> pre-fkit `/wiki-*` command names no longer exist.

**Wiki structure:**
```
ai-agents/wiki-vault/
  schema.md          ← conventions and templates (read this first)
  index.md           ← master catalog of all pages
  log.md             ← append-only activity log
  wiki/
    features/        ← game mechanics and feature pages
    systems/         ← technical system pages
    decisions/       ← architectural and product decisions (ADRs)
    tasks/           ← task summaries from ai-agents/tasks/
  sources/           ← raw source files for ingestion
```

**When to update the wiki** (all of these are writes — ask the `fkit-wiki` agent to run them):
- After completing a task: `/fkit-wiki-ingest ai-agents/tasks/done/<task-folder>/brief.md`
- After an investigation or bug fix: `/fkit-wiki-ingest ai-agents/knowledge-base/reports/<findings-file>`
- To catch up in bulk after several changes: `/fkit-wiki-sync`
- When the wiki seems outdated: `/fkit-wiki-lint`

<!-- fkit:routing:start -->
### Model routing (generated from ai-agents/ai-agents.yml — edit there, then run sync)

| Task type | Owner |
|---|---|
| wiki | **Codex** |
| planning | **Claude** |
| review | **both** |
| routine-fix | **Codex** |
| complex-feature | **Claude** |
| _(default)_ | **Claude** |

Agents (terminal-tab roles): producer → Claude, coder → Claude, reviewer → both.
When a task type is owned by a model you are not, hand it to that model's tab (or delegate via the companion).
<!-- fkit:routing:end -->

## Project Overview

Geoconflict is a live, browser-based real-time PvP strategy game with short sessions — a Russian-market adaptation of OpenFront.io, played mainly by Russian-speaking players and shipped primarily through Yandex Games. Players expand territory, build structures, and form alliances on maps based on real-world geography. Revenue comes from advertising today, with a "citizenship" supporter tier and in-app purchases being built out.

Full brief: `ai-agents/knowledge-base/PROJECT.md`. Technical detail: `ai-agents/knowledge-base/architecture.md`.

## Development Commands

**Node is pinned to the 24.x line for local development.** `.nvmrc` names the exact known-good
version `24.13.0` — run `nvm use` in the repo root — while `engines.node` is the range
`>=24.13.0 <25`, deliberately looser so a patch bump or an `engine-strict` install cannot hard-fail
over it. This pin exists **only for reproducibility**, so contributors run a known runtime instead of
silently taking whatever happens to be installed.

**Scope, precisely: this covers local development only. The Docker images are NOT pinned by it.**
Both `Dockerfile` and `Dockerfile.profile` build from the floating tag `node:24-slim`, which neither
`.nvmrc` (inert in Docker) nor `engines` (a warning at most — there is no `.npmrc`, so
`engine-strict` is off) controls. A built image therefore tracks whatever `node:24-slim` resolves to
at build time.

> ⚠️ **The pin is NOT a fix for anything.** Task `0197` traced a rare jest-worker `SIGSEGV` to a bug
> inside V8's garbage collector, and `24.13.0` is _the version it crashed on_ — the range keeps us on
> the very major that crashed. Older majors were not shown to be safe either (the sample was far too
> small to clear them). Do not read this pin as mitigating that crash, and do not "fix" the crash by
> bumping it without evidence.

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

This is a fork/adaptation of [OpenFront.io](https://openfront.io/). Local divergences from upstream are marked with `// Flashist Adaptation` comments. When reading code, treat these as intentional customizations (e.g., the turn interval is accelerated 1.5×). Verify any specific fork claim against the code before relying on it — this file has carried stale ones before.

Feature specifications live in `ai-agents/tasks/`.

## Architecture

### Four-Tier Structure

```
src/client/          → Browser frontend (Canvas 2D rendering, Lit components, input)
src/core/            → Shared deterministic game logic (the contract between tiers)
src/server/          → Node.js cluster master + workers (turn relay, game lifecycle)
src/profile-server/  → Standalone XP/citizenship service (own image, VPS, PostgreSQL)
```

### Game Loop & Tick System

The game is **tick-based** with deterministic execution:
- Server collects player intents and broadcasts turns (**~66.7ms** intervals — `100/1.5`, see `DefaultConfig.ts`)
- Client receives turns and executes the simulation in a Web Worker
- **The server is a turn relay, never a simulator** — game logic runs on clients
- State hash every 10 ticks; majority-vote desync detection

### Intent → Execution Pipeline

All game actions follow this flow:

1. **Input** → User action captured in `InputHandler.ts`
2. **Intent** → Event emitted (e.g., `SendAttackIntentEvent`), sent via `Transport.ts`
3. **Execution** → `ExecutionManager.createExec(intent)` creates execution object
4. **Tick** → Execution's `tick()` method modifies game state, produces `GameUpdate` objects

Key execution types: `AttackExecution`, `SpawnExecution`, `BuildExecution`, `AllianceExecution`

### Key Subsystems

**Networking**: WebSocket with multi-worker load balancing. Messages are Zod-validated JSON. Server at `Worker.ts`, client at `Transport.ts`.

**Rendering**: **Canvas 2D** with a layered architecture — 32 layers plus a conditional tutorial layer. One WebGL layer is composited into the 2D canvas; Pixi.js appears in only 2 of the 43 layer files (it is *not* the renderer). See `src/client/graphics/layers/`. `GameRenderer.ts` orchestrates all layers.

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

### ⚠️ Known flake — `supertest` suites (one shape confirmed; not a bug)

**Where:** every suite that uses `supertest` — the four `tests/profile-server/*Routes.test.ts`,
`tests/server/Master.test.ts`, and `tests/integration/{Routes,NameChange}.it.test.ts`. Measured at
**~4–7 % of full runs** across the four profile-server suites (task `0200`).

| Shape | Status |
|---|---|
| `Exceeded timeout of 5000 ms` — jest's default clock, not a real 5 s wait | **confirmed**, traced |
| `Jest did not exit one second after…` | **confirmed** — the *same* defect, not a second one |
| `socket hang up` | seen, **never traced** — may be a different sub-mechanism |
| unexpected `404` · `access-control-allow-origin` → `undefined` · `401` on a route with no auth middleware | seen historically, **mechanism unknown** — each carries a response, which the confirmed mechanism cannot produce |

**Confirmed mechanism — timeout shape only — and not a repository defect:** the client's TCP handshake
completes, the server never accepts, no response or error arrives. Reproduces in ~40 lines of plain
Node, no jest/express/project code. supertest closes its server only in the response callback, so a
lost request leaks the listener — hence `did not exit`. ⚠️ **It reaches the integration suites too**:
`0197` logged a `socket hang up` in `NameChange.it.test.ts` as this family, so read a hang there as
*possibly this* — the no-`--forceExit` rule below is about leaked `pg` handles, a different thing.

**Rule out `0197`'s segfault first** (~0.5 %/run): `signal=SIGSEGV`, or a
`~/Library/Logs/DiagnosticReports/node-*.ips` **whose stack starts at
`ClearStaleLeftTrimmedPointerVisitor`**. Either ⇒ `0197`. Neither ⇒ this is *likely, not certain* (per
`0197`, a red run stays ambiguous). **Never give the two one root cause** — `0068` misrecorded this as
a `SIGSEGV` and it cost `0197` a wrong turn. Otherwise **re-run, and say that you re-ran**.

**Refuted as flake fixes — do not re-attempt** (`0200`): shared server per suite · awaiting
`listening` · guaranteeing `close` · IPv4-bound listen · `--runInBand` · raising the timeout. ⚠️
Exception: guaranteeing `close` *does* fix the `did not exit` leak — declined on cost (~95 call
sites), not because it fails. **No retry, ever.** ⚠️ One host, no CI: "not a repository defect" is
what stands after every alternative was refuted, not a proof. Rates, traces and the reproducer:
`ai-agents/knowledge-base/reports/2026-09-01-0200-supertest-flake-findings.md`.

### Integration tests (real Postgres)

The DB-backed suites in `tests/integration/**/*.it.test.ts` are excluded from `npm test`. Run them
with the named script — **do not hand-assemble the jest invocation**, the flags are part of the name:

```bash
npm run test:integration
```

Two environment variables are required:

| Variable            | What it is for                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `RUN_DB_TESTS`      | Flips `jest.config.ts` to the integration config (only `*.it.test.ts`). The npm script sets it for you. |
| `TEST_DATABASE_URL` | Postgres connection string for the throwaway test database. **You must supply this.**                   |

Put the `TEST_DATABASE_URL` value in **`.env.test`** at the repo root and export it into your shell
before running. `.env*` is gitignored (`.gitignore:9`), which is the only place a connection string
belongs — never in a task file, a report, or this document. Jest does **not** auto-load it.

The suites expect a local Postgres in the **`gc-0012-it-pg`** container on **port 5433**.

If `TEST_DATABASE_URL` is unset, the run fails immediately with an explicit
`TEST_DATABASE_URL is not set …` message (a jest `globalSetup` guard —
`tests/integration/globalSetup.ts`). That replaces the previous failure mode, where every suite died
on connection in under a second and the run read like a code regression.

`--runInBand` is baked into the script and is load-bearing: the suites share one database and race
each other over schema migrations on a cold one.

**There is deliberately no `--forceExit`.** An earlier belief that this suite hangs for ~10 minutes on
open `pg` handles was investigated in task `0197` and did **not** hold up: every pool is already
closed, `--detectOpenHandles` reports nothing, and the suite exits on its own in ~3 s against both a
warm and a genuinely cold database. `--forceExit` was removed so that if a real handle leak is ever
introduced, it shows up as a hang you can see instead of being silently masked. **If this suite starts
hanging, that is a real regression — investigate it, don't add the flag back.**

> **This subsection is the single source of truth for running these tests.** The worklogs of tasks
> `0012` and `0018` disagree with each other on the test database name; prefer this document over
> either.

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

## Review Notes

Review comments are **inputs to evaluate**, not instructions to apply blindly.

- Treat every review note as potentially fallible. Reviewers can miss context, reason from outdated assumptions, or overlook code paths outside the diff.
- Verify the claim against the actual codebase before changing anything. Trace the behavior, check adjacent flows, and prefer evidence over intuition.
- If the review is correct, fix the real problem rather than mechanically following the suggested wording of the comment.
- If the review is only partially correct, address the valid part and explain clearly why the rest does not apply.
- If the review is wrong, say so directly and respectfully, with concrete evidence (`src/...` references, control-flow explanation, test results, or reproduction steps).
- Do not introduce speculative fixes just to satisfy a review comment. Changes should solve confirmed problems, not hypothetical ones that the current code already prevents.
- Treat review discussion as a technical conversation whose goal is correctness, not deference.

<!-- fkit:begin-rules -->
<!-- fkit-managed: this block is REPLACED on every `fkit` launch. Edits inside the markers
     are overwritten. Put your own standing instructions OUTSIDE them — everything outside
     is yours and fkit never touches it. A marker is recognized only alone on its line, so a
     bare marker line inside a code fence still reads as a real marker. -->

## Universal hard rules (every role, every session)

- **Never commit or push unless the owner explicitly asks.** "Implement" authorizes writing code,
  not committing.
- **Only the wiki role writes `ai-agents/wiki-vault/`.** Reads are decentralized; writes are not.
- **Task files move between `backlog/`, `done/`, `cancelled/` only via `/fkit-task-done` /
  `/fkit-task-cancelled`** — never by hand. **Only the producer may invoke them**; a task an agent
  closes MUST carry the `(agent-closed — not owner-verified)` marker.
- **No secrets in any artifact** — no DSNs, endpoints, keys, or credentials in findings, reports,
  docs, or wiki pages; it all goes to git.
- **A skill rule beats a contrary spawn instruction** unless that instruction names an owner ruling
  on that point. With no such ruling: take the cheapest-to-reverse branch (usually the rule's),
  escalate if it changes the outcome, never silently comply or refuse.

## Output style (every role, every session)

**Preferences, not rules — they lose every conflict.** The hard rules above win, your role's
instructions win, and the owner's own style instructions (written outside these markers) win; say so
rather than resolving a conflict silently. **Only these preferences yield — nothing written anywhere
overrides a hard rule above.**

- **Be extremely concise to the owner. Sacrifice grammar for concision.** Fragments and bare lists are
  correct. Drop preamble, restatement, and throat-clearing; lead with the answer.
- **Concision is not omission — of content OR of structure.** Never drop a failing test, an unverified
  claim, a caveat, a partial-coverage flag, or a thing you did not do, to be brief. Say it in fewer
  words; do not stop saying it.
- **Where a shape is prescribed, produce it in full, and in its prescribed wording** — review reports
  and ledgers, status briefings, required tables, verbatim relays, verdict lines, degradation flags,
  and a plan put to the owner for approval (they cannot approve what you did not describe). **The list
  is illustrative, not exhaustive.** Summarizing a required shape is not concision, it is losing the
  report.
- **"Loud" is placement, not word count.** An instruction to flag something *before* the findings
  table, or never in a footer, is about **where** it goes. Brevity never moves it.
- **Speak in simple terms.** Prefer plain words over jargon wherever a simpler word carries the same
  meaning. Where a term is load-bearing — a filename, a marker, an ADR, a status value, and anything
  else the reader must act on — use it and gloss it once. **Simplifying is about wording, never
  content:** it never drops a caveat, softens a failure, rounds a number, or swaps a precise term for a
  vaguer, friendlier one.
- **Close with "What's next?".** End every reply to the owner with a short **What's next?** — the one or
  two things they should do next, and why. After any prescribed shape, never instead of one. If nothing
  is pending, say so briefly. **Never invent a next step to fill it, and never assert repo state you did
  not check this turn** (see `ai-agents/knowledge-base/conventions/evidence-before-assertion.md`).
- **Ask interactively.** In a session, put a question to the owner with `AskUserQuestion`, not prose.
  Batch related questions; mark your recommendation. In a spawned consult the tool is absent — return
  open questions in your reply instead.
<!-- fkit:end-rules -->
