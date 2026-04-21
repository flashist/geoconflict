# Geoconflict — Producer Knowledge Base

## 1. Project Overview

### What Is Geoconflict

Geoconflict is a browser-based real-time PvP strategy game published on Yandex Games. Players control territories on maps based on real-world geography, expanding by attacking neighbours, building structures, forming alliances, and competing to be the last player standing. It is a fork of the open-source game OpenFront.io, with significant customisations. Local divergences from upstream are marked with `// Flashist Adaptation` comments in the codebase.

### Platform & Distribution

- **Primary platform:** Yandex Games (browser iframe, desktop and mobile)
- **Community:** VKontakte and Telegram
- **Target audience:** Russian-speaking players, desktop-primary
- **URL structure:** `geoconflict.ru/yandex-games_iframe.html`

### Scale (as of April 2026)

- Low-thousands DAU overall
- Desktop is the dominant platform by both audience size and engagement depth
- Mobile is materially smaller and lower-engagement than desktop
- iOS retention is poor relative to desktop
- GameAnalytics is the source of truth for tracked audience and engagement trends

### Revenue Model

- Advertising is currently the primary revenue source
- Rewarded ads remain deferred until there is a meaningful in-game reward loop
- In-app purchases via Yandex Games SDK are planned but not yet live

---

## 2. Team Structure

### Mark (Game Owner / Product Owner)

Makes all product decisions. Sets sprint priorities. Reviews investigation findings before implementation begins. Communicates with community managers. Manages Yandex Games dashboard, analytics dashboards, and deployment decisions.

### Technical Specialist

Claude Code terminal agent with direct access to the full codebase. Implements tasks, writes investigation findings, updates the knowledge base (karpathy-vault). Works from task briefs. Does not make product decisions unilaterally.

### Producer Agent (this role)

Claude web/app agent. Works with Mark to plan sprints, write task briefs, interpret analytics, track task status, and maintain project documentation. Does not write code. Has filesystem read access to the repo for context. Writes to outputs directory, not directly to the repo (except via filesystem tools when available).

### Community Managers

Voluntary role. Active players who help manage VKontakte and Telegram communities. Responsibilities: answer player questions, onboard newcomers, collect feedback, maintain community atmosphere. Communicate in Russian. Managed via the CM Agent (separate Claude instance with Russian-language prompt).

---

## 3. Codebase Structure

### Repository Location

`geoconflict/` repository root

### Three-Tier Architecture

```
src/client/   → Browser frontend (Pixi.js rendering, input handling, UI)
src/core/     → Shared game logic (runs on both client Web Worker and server)
src/server/   → Node.js backend (game lifecycle, networking, WebSocket)
```

### Critical Architectural Facts

- **The server does NOT execute game logic.** `GameImpl.executeNextTick()` runs on the **client** in a Web Worker. The server's per-tick work in `endTurn()` is: assemble Turn object, reset intents, run sync check every 10 turns, JSON.stringify, ws.send to all clients.
- **Tick interval:** ~67ms (100ms / 1.5× speed coefficient, `DefaultConfig.ts:233`)
- **Worker architecture:** master-worker multi-process. Match routing is hash-based: `simpleHash(gameID) % numWorkers()`. No load balancing or rebalancing.
- **Game loop:** tick-based deterministic. Server broadcasts turns, client replays them in a Web Worker. Hash verification detects desync.

### Key Files

| File | Purpose |
|---|---|
| `src/server/GameServer.ts` | Game lifecycle, networking, `endTurn()` |
| `src/server/Master.ts` | Master process, worker routing |
| `src/server/Worker.ts` | Worker process HTTP/WebSocket handler |
| `src/server/Archive.ts` | POSTs full game records to archive endpoint |
| `src/core/GameRunner.ts` | Game tick execution |
| `src/core/game/GameImpl.ts` | Game state container |
| `src/core/execution/ExecutionManager.ts` | Intent → Execution dispatch |
| `src/client/Main.ts` | Client entry point, tutorial eligibility, hash handling |
| `src/client/flashist/FlashistFacade.ts` | Analytics SDK wrapper, experiment flags, `analyticEvents` enum |
| `src/client/TutorialStorage.ts` | Tutorial localStorage persistence |
| `src/client/graphics/layers/TutorialLayer.ts` | Tutorial tooltip UI and game state observation |
| `src/client/LocalServer.ts` | Local mission config builder (tutorial map setup) |
| `src/client/Transport.ts` | WebSocket client |
| `src/client/graphics/GameRenderer.ts` | Rendering orchestration |

### Configuration System

Environment-specific configs in `src/core/configuration/`: `DevConfig.ts`, `PreprodConfig.ts`, `ProdConfig.ts`. Selected via `GAME_ENV` env var. `Config.ts` defines the full interface. `DefaultConfig.ts` provides base values.

### Build & Deploy

- `build-deploy.sh` — production build + deploy. Runs `scripts/bump-version.js` first (auto-increments `BUILD_NUMBER` in `package.json`). BUILD_NUMBER injection is fully automated — never update manually.
- `build-deploy-telemetry.sh` — deploy Uptrace telemetry server
- `npm run dev` — local development with hot reload

---

## 4. Infrastructure

### Game Server

- **Hosting:** self-hosted VPS
- **Specs:** see private operations documentation
- **OS:** Linux
- **Process manager:** supervisord
- **Web server:** nginx (reverse proxy)
- **Archive endpoint:** private internal service; exact address intentionally omitted from git-tracked docs

### Telemetry Server (Uptrace)

- **Hosting:** separate self-hosted VPS
- **Stack:** Uptrace (self-hosted) + ClickHouse + PostgreSQL + Redis via Docker Compose
- **Access:** restricted internal access only
- **Dashboard:** private production service; exact address intentionally omitted from git-tracked docs
- **Data:** production only. Dev server has no `OTEL_EXPORTER_OTLP_ENDPOINT` — sends nothing.
- **Retention:** 90 days for spans and metrics

### Dev Server

- **Hosting:** separate non-production VPS
- **Specs:** intentionally omitted from git-tracked docs
- **Purpose:** development builds and testing only

---

## 5. Observability Stack

### GameAnalytics (Player Behaviour)

Tracks player behaviour events. Free tier. Custom Dimension 01 = build number (must be pre-registered in GA dashboard before deploy). Analytics event strings use `Category:Action` or `Category:Subcategory:Value` PascalCase colon-separated format. TypeScript enum in `FlashistFacade.ts` is the single source of truth — never write event strings inline.

**Key funnels:**
- New player: `Session:Start → Game:Start → Match:SpawnChosen → Session:Heartbeat:05`
- Tutorial experiment group: `Experiment:Tutorial:Enabled → Tutorial:Started → Tutorial:Completed → Game:Start → Match:SpawnChosen → Session:Heartbeat:05`
- Multiplayer join: `UI:ClickMultiplayer → Game:Start → Match:SpawnChosen/SpawnAuto → Session:Heartbeat:05`

Note: `UI:ClickMultiplayer` fires on the JOIN button for a specific lobby in `PublicLobby.ts:228` — not on opening the multiplayer screen. Valid funnel anchor with debounce guard.

### Uptrace (Server Observability)

OTEL-native APM. Receives: Winston log transport (always), slow turn spans (>100ms threshold, `endTurn()` in `GameServer.ts`), system metrics (CPU, memory, event loop lag, network I/O, active games, connected clients — per worker via `worker.id` attribute, every 15 seconds).

**What Uptrace cannot answer:** player intent sequences, ghost player counts, tick-by-tick game state, cross-session player behaviour.

**Slow turn span structure:**
```
server.turn.process
  turn.assembly → synchronization → turn.broadcast
  attributes: game.id, turn.number, intents.count, clients.active, message.size_bytes, turn.duration_ms
```

### Sentry

Client-side error tracking. Was blocked (free tier exhausted). Replaced on server side by Uptrace. Client-side Sentry SDK still present but under review.

---

## 6. Task & Sprint Management

### File Naming Convention

All task brief files are prefixed with sprint number + task ID:
- `s3-hf11d-hotfix-stale-build-modal.md` (Sprint 3, HF-11d)
- `s4-investigation-player-store.md` (Sprint 4, investigation A)
- `s4-8d-a-task-global-announcements.md` (Sprint 4, task 8d-A)

### Sprint Plan Structure

Each sprint plan (`ai-agents/sprints/plan-sprint-N.md`) opens with a status table:

| Icon | Meaning |
|---|---|
| ✅ Done | Shipped and verified |
| 🔄 In Progress | Currently being implemented |
| ⬜ Backlog | Not yet started |
| ⛔ Cancelled | Will not be implemented |
| ➡️ Moved | Deferred to another sprint |

### Task Brief Structure

Every brief contains: priority/sprint, context, what to build (with implementation guidance), verification steps, notes. No reasoning about alternatives — only final decisions. Safe to commit to git (no sensitive data).

### Working Principles

- **Investigation-first:** when significant unknowns exist, create an investigation task before implementation. Do not scope implementation until findings are in.
- **Analytics as verification:** shipping is not done until analytics confirm the fix behaves as expected in production.
- **Production-only telemetry:** dev environments never send data to Uptrace.
- **Never hardcode DSNs or OTEL endpoints** — always from environment variables.
- **Build number pre-registration:** new build values must be registered in GA dashboard before deploying that build.
- **Deployments on weekends** — lowest traffic, minimises player disruption.

### Knowledge Base (karpathy-vault)

Structured wiki at `karpathy-vault/` in the repo following the Karpathy LLM Wiki pattern.

```
karpathy-vault/
  schema.md          ← conventions and templates
  index.md           ← master catalog of all pages
  log.md             ← append-only activity log
  wiki/
    features/        ← game mechanics and feature pages
    systems/         ← technical system pages
    decisions/       ← ADRs and sprint records
    tasks/           ← task summaries
  sources/           ← raw source files for ingestion
```

Three slash commands for Claude Code: `/wiki-ingest`, `/wiki-query`, `/wiki-lint`.

---

## 7. Sprint History

### Sprint 1 — Analytics Baseline (Done ✅)

Established analytics foundation: event naming convention, device/platform segmentation, session heartbeats, Sentry client-side integration, mobile quick wins (retina off, 30fps cap, reduced particles).

### Sprint 2 — Fix Onboarding (Done ✅)

Tutorial: 7-step tooltip sequence, Iceland map, all-Easy bots, Yandex A/B experiment gated. Auto-spawn (Task 4a), zoom-to-territory (Task 4b), spawn indicator (Task 4e), auto-expansion (Task 4c). Global announcements re-enabled (8d-A).

### Post-Sprint 2 Hotfixes (Done ✅)

HF-1 through HF-10, PR #45. Key fixes: experiment flag analytics, tutorial skip button, mobile control panel hit area, double-reload bug (`#refresh` push removed), cache busting, build number tracking (HF-7), tutorial attempt count (HF-8).

### Sprint 3 — Deepen Retention (Done ✅)

Key deliverables:
- **5d-A/B:** Uptrace server metrics + threshold-based turn timing spans
- **HF-11a–d:** Stale build zombie tab detection and blocking refresh modal
- **HF-12:** Spawn camera/animation fires on confirmed placement, not intent-send
- **HF-13:** Map file preloading on JOIN click
- **HF-6:** Auto-spawn catch-up timing race fix (`Match:SpawnRetryAfterCatchup`)
- **Humans vs Nations:** re-enabled, scope expanded to all team modes
- **Feedback match IDs:** last 3 game IDs attached to feedback payload

Moved to Sprint 6: 5b (Server Restart UX), 5c (Mobile Warning Screen).

### Sprint 4 — Monetization & Citizenship (Current)

See Section 9.

### Sprint 5 — Planned

Rewarded ads (citizenship must be live first), cosmetics (flags, patterns), cosmetics purchase flow.

### Sprint 6 — Planned

Server Restart UX (5b), Mobile Warning Screen (5c), historical multiplayer maps (free, 1–2 maps), paid campaign map packs (WW2 first). Depends on Sprint 4/5 payment infrastructure.

---

## 8. Key Technical Decisions & Constraints

### Double-Reload Bug (Fixed)

`#refresh` was pushed to browser history on game start but `#join=gameID` was disabled (Flashist Adaptation). On browser refresh, `handleHash()` in `Main.ts` would navigate to root, triggering a second full page load. Fixed in PR #45 (tutorial) and HF-9 (all game types). Historical analytics before fix are unreliable.

### Stale Build Detection (HF-11)

Zombie tabs (old JS bundle running in memory) caused returning users to persist on old builds. Fix: `/api/version` endpoint + client polls every 5 minutes + checks on startup and tab focus. On mismatch: non-dismissible blocking modal with REFRESH button and "Contact support" text link. Existing modal component reused. `Build:StaleDetected` analytics event fires with value = minutes since page load.

HF-11a confirmed: zombie tabs are sole cause. CDN caching, browser cache, and BUILD_NUMBER issues all ruled out. HF-11e cancelled — BUILD_NUMBER already automated.

### Server Match Logging

Match ID (8-char Base57) generated in `Master.ts`. Full `GameRecord` is POSTed to the internal archive service, which is the authoritative historical store. Retention is managed operationally. `localStorage['game-records']` keyed by game ID exists on client.

What the archive does NOT store: player intent sequences, ghost player counts, tick-by-tick state, win condition evaluation detail.

### `this.turns` Memory Accumulation

`GameServer.ts` retains all Turn objects in memory for the match lifetime (~162,000 objects in a 3-hour match). Primary GC pressure source. Not yet fixed — tracked as technical debt. Cleanup task needed before player counts grow significantly.

### Uptrace Hardware Requirements

The large hardware requirement table on the Uptrace install page is for enterprise-scale deployments (30TB+ of spans). Geoconflict generates orders of magnitude less data. Docker Compose on 4GB RAM is appropriate for current scale.

---

## 9. Sprint 4 — Current Sprint Detail

### Goal

Launch citizenship system and in-app purchase foundation. Rewarded ads deferred to Sprint 5.

### Phase Structure

**Phase 1 (start immediately):**
- Investigation A: Player Profile Store (blocks all citizenship tasks)
- Investigation B: Yandex Payments Catalog (blocks all purchase UI)
- 8d-A Global Announcements: independent, can ship immediately

**Phase 2:** Implementation briefs written after investigation findings reviewed with Mark.

### Locked Decisions

**Qualifying match (counts toward 50):**
- ✅ Eliminated by another player or bot
- ✅ Survived to match end (any win condition)
- ❌ Voluntary Leave mid-match
- ❌ Disconnected without return
- ❌ Never spawned

**Citizenship flags:** `isCitizen` (earned OR paid), `isPaidCitizen` (paid only)

**Pricing:** citizenship 99 RUB, cosmetics 149–199 RUB (includes citizenship automatically). Yandex takes ~50% + taxes.

**Player profile store:** server-side (not Yandex cloud saves). DB technology = investigation item. Authorized players only — `ysdk.getPlayer().getMode() !== 'lite'` for guests. Keyed by Yandex player ID.

**Purchase UI:** data-driven from Yandex catalog response. If item absent from catalog → button not shown. Allows soft-launch by enabling items in dashboard without code deploy.

**Action required now:** register Yandex catalog items in dashboard (citizenship 99 RUB, cosmetics 149–199 RUB). Approval takes days.

### All Sprint 4 Tasks

| Task | Brief | Notes |
|---|---|---|
| Investigation A — Player Profile Store | `s4-investigation-player-store.md` | Blocks citizenship |
| Investigation B — Yandex Payments | `s4-investigation-yandex-payments.md` | Blocks purchase UI |
| 8d-A Global Announcements | `s4-8d-a-task-global-announcements.md` | Independent |
| Player Profile Store — Implementation | TBD | After investigation |
| Yandex Payments — Catalog Fetch | TBD | After investigation |
| Citizenship — Match Counter & Progress UI | TBD | After investigation |
| Citizenship — Earned (50 matches) | TBD | After investigation |
| Citizenship — Paid (99 RUB) | TBD | After investigation |
| 8d-B Personal Inbox | `s4-8d-b-task-personal-inbox.md` | Needs 8d-A + profile store |
| Name Change (citizens only) | TBD | After investigation |
| Citizen Verified Icon | TBD | After investigation |
| Humans vs Nations — Balance Nation Count | `s4-nations-balance-task.md` | Independent |
| AI Lobby Slot Bug | `s4-ai-lobby-slot-bug.md` | Coordinate with nations balance |
| Tutorial — Remove Nations | `s4-tutorial-no-nations.md` | Config only |
| Tutorial — Lock Build Menu (tooltip 5) | `s4-tutorial-build-menu-lock.md` | |
| Tutorial — Reduce Bots 400→100 | `s4-tutorial-reduce-bots.md` | Config only |
| Tutorial — Pause Action Steps | `s4-tutorial-action-pause.md` | ⛔ Cancelled |
| VAT & Tax Investigation | `s4-legal-vat-investigation.md` | Non-technical, Mark only |

---

## 10. Citizenship System Design

### Tier Model

- `isCitizen = true`: earned (50 qualifying matches) OR paid (any purchase)
- `isPaidCitizen = true`: paid path only (ad suppression gated here)

### Earned Path

50 qualifying matches. Server-side tracking (authoritative). Counter survives across devices via player profile store. Guest players (unauthorized Yandex accounts) cannot earn citizenship — no stable player ID.

### Paid Path

- Direct citizenship purchase: 99 RUB
- Any cosmetic purchase (Sprint 5+): 149–199 RUB → grants citizenship automatically
- Purchase UI only shown when item exists in Yandex catalog response

### First Citizenship Benefit

Name change — citizens only, requires moderation step. Non-citizens cannot access.

### Personal Inbox (8d-B)

Direct messages from game to citizens. Tab inside announcements popup. Initial triggers: citizenship earned, citizenship purchased, name change approved/rejected. Messages stored server-side in player profile store. Read state persists across devices.

---

## 11. Tutorial System

### Current Implementation

- Entry point: `Main.ts` — checks Yandex experiment flag (`tutorial = enabled`) AND `localStorage.tutorialCompleted` not set
- Map: Iceland, all-Easy bots, no nations (Sprint 4)
- Bot count: 100 (reduced from 400 in Sprint 4)
- 7-step tooltip sequence
- Near-pause during tooltip display: `ReplaySpeedChangeEvent(100)` (100× tick interval)
- Skip button: corner (always visible) + inline under tooltip (HF-2)
- Attempt counter: `localStorage.tutorialAttemptCount`, incremented on `Tutorial:Started`, sent as event value

### Tooltip Sequence

| # | Trigger | Content |
|---|---|---|
| 1 | Player spawned | Choose starting position |
| 2 | Spawn phase ended | Tap neighbour to attack |
| 3 | Gold ≥ 125,000 | Enough gold to build City |
| 4 | After tooltip 3 dismissed | Right-click / tap your territory |
| 5 | Radial menu opened over own territory | Open build menu → select City |
| 6 | First City built | Cities increase max population |
| 7 | After tooltip 6 dismissed | Ready for real matches |

### Sprint 4 Tutorial Changes

- Remove nations entirely (config change in `LocalServer.ts`)
- Reduce bot count from 400 to 100 (config change)
- Lock build menu to City-only during tooltip 5 (all other icons forced to disabled state, same as insufficient-gold UX)
- Action-pause (keep game paused after tooltip dismiss until action performed): CANCELLED — too many implementation problems

---

## 12. Humans vs Nations & Lobby System

### Mode Re-enable (Sprint 3)

Humans vs Nations re-enabled. Scope expanded — all team modes restored. AI fills empty slots regardless of human count.

### Nation Balance (Sprint 4)

Formula: `nation_count = min(human_count, lobby_max - human_count)`. Target 1:1 nations to humans, capped at lobby maximum.

### AI Lobby Slot Bug (Sprint 4)

AI players trickle in over 2-minute wait window. Can coincidentally combine with real players to hit `lobby_max`. Game gets stuck — lobby shows full, game doesn't start.

Fix: when real player joins at `lobby_max`, immediately displace one AI. Game auto-starts only when `lobby_max` reached with zero AI remaining. Coordinate with nations balance task.

---

## 13. Monetization Roadmap

### Sprint 4

- Citizenship (earned: 50 matches, paid: 99 RUB)
- Yandex in-app purchase infrastructure
- Name change as first citizenship benefit

### Sprint 5

- Rewarded ads (now citizenship benefits exist as rewards)
- Cosmetics: flags, patterns (149–199 RUB, includes citizenship)

### Sprint 6

- Historical multiplayer maps (free, 1–2 maps to validate demand)
- Paid campaign map packs (WW2 first, 149–199 RUB range)
- Free 1–2 maps per pack as taster

### Deferred Indefinitely

Mobile deep rendering optimization (requires 3–6 weeks). Revisit only if the mobile audience grows materially and engagement improves enough to justify the investment.

---

## 14. Analytics Key Decisions

### Event Naming Convention

`Category:Action` or `Category:Subcategory:Value`, PascalCase, colon-separated. Enum keys in `SCREAMING_SNAKE_CASE`. Never write event strings inline — always use enum. Single source of truth: `flashistConstants.analyticEvents` in `FlashistFacade.ts`.

Historical note: migrated from `SCREAMING_SNAKE_CASE` event strings on 2026-03-01. Data before that date uses old names.

### Experiment Events Convention

`Experiment:{flagName}:{flagValue}` — fires automatically for all Yandex flags. Fires for both variants so both sides of every experiment have a clean cohort anchor.

### Build Number Tracking

Custom Dimension 01 in GameAnalytics. Value = `BUILD_NUMBER` (auto-injected from `scripts/bump-version.js`). Must be pre-registered in GA dashboard before deploying. Used to segment metrics by build and detect build transition cliffs (HF-11 effectiveness confirmed by sharp 24h decay vs historical multi-week decay).

### Data Quality Notes

- Analytics before HF-9 (double-reload fix) are unreliable for session-level metrics — `Session:Start` could double-fire
- Tutorial funnel data before HF-11d should be treated as inflated — zombie tabs inflated `Tutorial:Started` counts
- `Player:New` / `Player:Returning` split was corrupted for new users on their second-ever page load before HF-9

---

## 15. Community Management

### CM Agent

Separate Claude instance with Russian-language system prompt. Communicates with community managers on behalf of the Geoconflict team. Tone: friendly but structured. Knowledgeable about current game state, recent updates, and what's in development. Do not disclose confidential analytics, monetisation, or internal operational details.

### Community Channels

- VKontakte: primary Russian-language community
- Telegram: secondary channel
- CMs are volunteers (active players) or potentially paid moderators

---

## 16. Important Don'ts

- **Never auto-reload** during an active match — the stale build modal shows even mid-match but requires user click (REFRESH button), not auto-reload
- **Never expose telemetry dashboards or OTEL ingestion publicly**
- **Never use `docker compose down --volumes`** on Uptrace server — destroys all ClickHouse and PostgreSQL data permanently
- **Never hardcode OTEL DSN** — always from `OTEL_EXPORTER_OTLP_ENDPOINT` env var
- **Never write analytics event strings inline** — always use the TypeScript enum
- **Never send data from dev server to production Uptrace** — env var must be absent on dev
- **Never auto-start a lobby** when it's full of a mix of real + AI players — only start when zero AI remain at capacity, or when timeout expires

---

## 17. Game Mechanics Basics

### Core Loop

Players spawn on a map, expand territory by attacking neighbouring tiles, accumulate gold proportional to territory size, build structures to increase population cap, form and break alliances, and attempt to be the last player (or team) standing.

### Win Conditions

- **Last standing:** all other players eliminated
- **Territory threshold:** player controls ≥80% of all tiles (single-player missions)
- **Timer expiry:** match ends after maximum duration; largest territory wins

### Economy

- **Gold:** accumulates passively based on territory size. Spent on attacks and buildings.
- **Population:** capped by buildings. More population = larger armies = faster expansion.
- **City:** most important building. Increases population cap significantly. Costs 125,000 gold.

### Combat

Players send attacks against neighbouring territory. Attack strength depends on available troops (derived from population). Alliances prevent attacks between allied players. Alliance betrayal is possible.

### Game Modes

- **Singleplayer missions:** player vs bots on specific maps, win conditions by territory threshold or elimination
- **Multiplayer (public lobbies):** all human players + AI fillers, last standing wins
- **Humans vs Nations:** human players vs AI-controlled nation bots, all team slots filled by AI
- **Team modes:** Duos, Trios, Quads — re-enabled in Sprint 3. Teams mode had a lobby composition bug that was investigated and confirmed not a stability issue.
- **Tutorial:** singleplayer on Iceland map, guided 7-step sequence, Easy bots only, no nations

### Maps

Real-world geography maps. Iceland is the tutorial map. Players have repeatedly requested Russia and WW2 maps in feedback — planned for Sprint 6.

### AI Players

- Fill empty lobby slots at a rate of approximately one per N seconds over the 2-minute wait window
- Maximum ~8–10 AIs added during the wait window
- Indistinguishable from human players in UI
- Must never fill the last lobby slot — one slot always reserved for real players

### Nations

AI-controlled large territories representing countries. More aggressive and capable than regular bot players. Used in Humans vs Nations mode. Explicitly removed from the tutorial in Sprint 4 to reduce difficulty.

---

## 18. Product Strategy Principles

### Retention Before Monetisation

The sprint sequencing was deliberately: fix the product first (Sprints 1–3), then monetise (Sprints 4+). Monetising a broken or confusing product produces worse long-term results than waiting. New players who don't understand the game or encounter bugs won't convert to paying players regardless of what you offer them.

### Investigation-First

When significant unknowns exist — architectural decisions, root cause of a bug, feasibility of a feature — create an investigation task before any implementation task. Do not write implementation briefs until findings are in. This rule exists because over-specifying implementation before understanding the codebase leads to wasted work.

### Analytics as Verification

A task is not done until analytics confirm the fix behaves as expected in production. Example: HF-11d (stale build modal) was confirmed effective by observing a sharp 24-hour decay cliff in build 0.0.122 returning users, compared to the multi-week decay of older builds without the fix.

### Parallel Workstreams

Where tasks are independent, run them in parallel. Investigation tasks always run in parallel with independent implementation tasks. Phase 1 (investigations) and Phase 2 (implementation) structure is used whenever unknowns exist.

### Platform-First for Mobile

Desktop is the core audience. Mobile deep optimization is parked until the mobile audience becomes large and engaged enough to justify the investment. The game's UI and complexity are fundamentally mismatched with small touch screens — rendering performance alone won't fix it.

### Citizens-First for New Features

New features that have a citizen/non-citizen distinction default to citizens getting access first. This gives citizenship tangible value and creates a visible reason to earn or pay for it.

### Production-Only Telemetry

Dev environments never send data to production Uptrace. The `OTEL_EXPORTER_OTLP_ENDPOINT` env var is absent on the dev server. This prevents dev noise from corrupting production diagnostics.

### Weekend Deployments

Production deploys are scheduled on weekends when DAU is lowest. This minimises the number of players affected by any post-deploy issues. The stale build detection (HF-11) means players get forced to reload on next session, not immediately — so timing the deploy minimises interruption.

---

## 19. Known Open Issues & Technical Debt

### `this.turns` Memory Accumulation

**Location:** `GameServer.ts:54`
**Issue:** `this.turns` array retains all Turn objects for the entire match lifetime. A 3-hour match accumulates ~162,000 Turn objects. This is the most likely cause of periodic GC pauses affecting all matches on a worker simultaneously. Not yet fixed.
**When to address:** before player counts grow significantly. The Uptrace heap chart (5d-A metrics) will show steady growth — that's the signal to act.
**Constraint:** `pastTurn.intents` holds a reference to the same array, so a naive `this.turns = []` would corrupt turn data. Fix requires careful refactoring.

### `Match:SpawnMissed:CatchupTooLong`

**Issue:** when a player joins a match already in progress and the catch-up fast-forward takes longer than the entire spawn phase, the player cannot spawn at all. No recovery path exists.
**Current state:** HF-13 (map preloading) reduces frequency by shortening the catch-up window. But the problem is not eliminated — a player on a very slow connection can still hit this.
**Future fix:** a recovery path that allows spawning after the spawn phase expires. Tracked as future task, not yet scheduled.

### Ghost Player Tracking Gap

**Issue:** no aggregated ghost player count exists in logs or Uptrace. Only raw `mark_disconnected` intents buried in the turn archive. Ghost players holding spawn tiles was the suspected root cause of the cancelled HF-5 win condition bug.
**Impact:** if HF-5 (win condition bug) is ever reopened, diagnosing it from Uptrace data will be difficult. A per-match ghost count metric would need to be added first.

### Dev Server Disk Pressure

**Issue:** dev server at 88% disk usage (8.2GB / 9.8GB). `npm install` + TypeScript build + Docker layer cache can consume 1–2GB temporarily, causing mid-deploy failures requiring 2–3 retries.
**Plan:** upgrade dev server disk from 10GB HDD to 40GB SSD. Cause confirmed — not a RAM or CPU issue.

### Client-Side Error Tracking Gap

**Issue:** Sentry was the client-side error tracker but account was blocked (free tier). Server-side errors now go to Uptrace via OTEL. Client-side errors are currently not tracked anywhere.
**Future fix:** Task 5d-B C1 covers verifying/adding client-side OTEL error tracking to Uptrace. Not yet implemented.

### Uptrace `[TO VERIFY]` Placeholders

The `uptrace-knowledge-base.md` document has several unverified items:
- Whether Winston metadata fields arrive as queryable attributes in Uptrace (affects Workflow C — match lookup by gameID)
- Exact metric names in Uptrace (may have collector prefix)
- Actual retention period (custom TTL not confirmed configured)
- Client-side error tracking status

These should be verified after 5d-B C1 ships and the knowledge base document updated.

---

## 20. Yandex Games Platform Specifics

### SDK

Yandex Games provides a JavaScript SDK (`ysdk`) injected into the game iframe. Key APIs:
- `ysdk.getPlayer()` — player identity. `.getUniqueID()` = stable player ID for authorized users. `.getMode()` returns `'lite'` for guests (no stable ID).
- `ysdk.getPayments()` — in-app purchases. `.getCatalog()` fetches available items. `.purchase({ id })` initiates purchase.
- `ysdk.getFlags()` / experiment flags — A/B testing via Yandex dashboard. `initExperimentFlags()` in `FlashistFacade.ts` fetches and fires `Experiment:{flagName}:{flagValue}` events automatically.

### Revenue Split

Platform fees and taxes materially reduce net proceeds from in-app purchases. Pricing decisions should assume that the sticker price and the developer's retained amount differ significantly.

### Catalog Pre-Registration

In-app purchase items must be registered and approved in the Yandex Games developer dashboard before the client SDK can surface them. Approval takes days. Always register new catalog items early — do not wait until implementation is complete.

### Experiment Flags

A/B tests are configured in the Yandex Games dashboard. The tutorial experiment (`tutorial = enabled/disabled`) is the primary active experiment. Flags fire automatically via `initExperimentFlags()` — no manual call sites needed when adding new flags.

### Iframe Cache Complexity

Yandex Games loads the game in an iframe. HTML cache-busting (`Cache-Control: no-cache`) was confirmed working — new users receive current builds. However, the platform context makes zombie tab detection more important, since Yandex's navigation patterns may make it harder for players to naturally refresh the page.

### Guest Players

Players not logged into Yandex have no stable ID and cannot use citizenship, name change, or personal inbox features. The client detects guest status via `ysdk.getPlayer().getMode() === 'lite'`. The UI should silently hide citizenship features for guests — not prompt to log in (decision to be confirmed per feature).

---

## 21. Cancelled Tasks Log

### HF-5 — Win Condition Detection Bug

**What it was:** ghost bots holding spawn tiles preventing the 80% tile ownership win condition from firing. Players completing long singleplayer missions reported the win dialogue never appearing.
**Why cancelled:** fix direction was correct (`meaningfulPlayers` filter in `WinCheckExecution.ts`) but implementation was too entangled and contradicted test instructions. Reverted.
**If revisited:** scope strictly to `WinCheckExecution.ts` only, add feature flag for rollback, agree on test plan before coding. Ghost player tracking gap (see Section 19) would need to be addressed first for proper diagnosis.

### Feedback Match History

**What it was:** a client-side match history UI showing recent games for context when submitting feedback.
**Why cancelled:** too many moving parts. Replaced by the simpler `task-feedback-match-ids-simple.md` — reads last 3 game IDs from existing `localStorage['game-records']` and attaches to feedback payload. No new UI.

### HF-11e — BUILD_NUMBER Automation

**What it was:** automate BUILD_NUMBER injection from build pipeline via Vite config + env variable.
**Why cancelled:** HF-11a investigation confirmed BUILD_NUMBER is already fully automated via `scripts/bump-version.js` in `build-deploy.sh`. Nothing to do.

### Tutorial Action-Pause (s4-tutorial-action-pause.md)

**What it was:** keep game near-paused (100× tick interval) not just during tooltip display, but until the required action is completed (spawn chosen, attack sent, radial menu opened, city built).
**Why cancelled:** created too many implementation problems. The combination of no-nations + 100 bots (Sprint 4) achieves a similar safety effect with much less complexity.

---

## 22. Data Retention & Backup Policy

### Uptrace ClickHouse (telemetry data)

- **Retention:** 90 days for spans, 90 days for metrics
- **Backup:** regular backups are required; keep exact schedules and procedures in private operations documentation
- **Restore:** if ClickHouse data is lost, game server immediately starts repopulating it. Historical data is lost but monitoring resumes immediately.

### Uptrace PostgreSQL (metadata)

- **Contains:** alert rules, project config, user accounts, metric definitions
- **Backup:** regular metadata backups are required; keep exact schedules, commands, and retention details in private operations documentation
- **Critical:** if PostgreSQL is lost, the entire Uptrace setup must be manually reconfigured from scratch. This is the backup that matters.

### Game Server Archive

- **Contains:** full `GameRecord` per completed match (map config, all players, stats, turns log)
- **Location:** private internal service; exact endpoint intentionally omitted from git-tracked docs
- **Retention policy:** managed operationally
- **Access:** use the internal archive tooling or private endpoint documentation when investigation requires a historical match record

### Client-Side localStorage

- `tutorialCompleted` — boolean, set on tutorial skip or completion
- `tutorialAttemptCount` — integer, lifetime tutorial start count
- `game-records` — keyed by game ID, written by `LocalPersistantStats.ts`
- `[last seen announcement ID]` — for unread badge detection

---

## 23. Production Deployment Checklist

The following steps must be completed in order for every production deploy:

1. **Schedule during a low-traffic window** — minimise player disruption
2. **Update `package.json` version** — `scripts/bump-version.js` runs automatically in `build-deploy.sh`, but confirm the version reflects the intended build number
3. **Register new build value in GameAnalytics dashboard** — Custom Dimension 01. Do this BEFORE deploying. GA rejects unregistered dimension values silently — events appear with no build label.
4. **Run `build-deploy.sh`** — builds and deploys to production
5. **Verify stale build modal** — confirm `/api/version` returns the new build number
6. **Check GameAnalytics** — confirm new build value appearing on new sessions within minutes of deploy
7. **Monitor Uptrace** — check for new unhandled exceptions in the 30 minutes post-deploy
8. **Check for stuck lobbies** — if AI lobby slot bug is not yet fixed, monitor for reports of stuck 10/10 lobbies

**For Uptrace server updates specifically:**
1. Take fresh backups before any upgrade
2. Upgrade one minor version at a time only
3. Do not destroy persistent volumes during routine updates
4. Verify the full telemetry stack is healthy after restart

---

## 24. Player Feedback System

### How It Works

A feedback button is accessible from the start screen and the in-game battle screen. Players can submit text feedback at any time. When submitted, the payload includes:

- Player's text message
- Device and platform information (from the analytics segmentation events)
- Last 3 match IDs from `localStorage['game-records']` (attached in Sprint 3, `task-feedback-match-ids-simple.md`)

### Where Feedback Goes

Feedback submissions are routed to the team's internal support channel. Exact delivery integrations are intentionally omitted from git-tracked docs.

### How to Use Match IDs in Feedback

Given a game ID from a feedback submission, use the internal archive tooling or private endpoint documentation to retrieve the corresponding match record. Historical match records are useful for reproducing player-reported bugs.

### Key Observation

Every feedback submission shows the latest deployed build version. This was noted during the stale build investigation — players on old builds (zombie tabs) were not submitting feedback, suggesting their game was broken in a way that made the feedback form unreachable. This is a known blind spot: silent failures on old builds are not reported.

---

## 25. Spawn System

### Spawn Phase

At the start of every match, there is a **spawn phase** — a window of time during which players choose (or are auto-placed at) their starting position on the map. Once the spawn phase ends, players who have not yet spawned miss their window.

### Auto-Spawn (Task 4a)

If a player does not tap to choose a spawn position within the spawn phase, the client automatically selects a position and sends the spawn intent to the server. This prevents players from accidentally missing the spawn window due to inattention.

### Catch-Up (Fast-Forward)

When a player joins a match that is already in progress, the client must replay all turns that happened before they connected — at 20× speed while showing a loading overlay. This is called **catch-up**. During catch-up, the game is fast-forwarding and the player cannot interact.

### The Catch-Up / Spawn Race Condition (HF-6)

Auto-spawn was originally firing during catch-up, before the client was in sync with the server. The server had already moved past the spawn phase and rejected the intent, while the client marked itself as having attempted — leaving the player permanently stuck. Fixed in HF-6: auto-spawn now waits until catch-up completes before sending the spawn intent. New event `Match:SpawnRetryAfterCatchup` fires when the fix saves a player.

### CatchupTooLong (Unresolved)

If catch-up itself takes longer than the entire spawn phase (very slow connections, large match already in progress), the player never gets a chance to spawn even after catch-up completes. No recovery path exists. HF-13 (map preloading) reduces frequency but does not eliminate it. Future task required.

### Camera / Animation Timing (HF-12)

Camera zoom and spawn indicator animation previously fired at intent-send time (optimistically), not at confirmed placement time. On slow connections, the server could place the player at a different tile than targeted, leaving the camera pointing at the wrong location. Fixed in HF-12: both now fire only when the server confirms placement.

### Analytics Events

| Event | Meaning |
|---|---|
| `Match:SpawnChosen` | Player manually tapped to select spawn position |
| `Match:SpawnAuto` | Player was auto-placed |
| `Match:SpawnRetryAfterCatchup` | Auto-spawn held during catch-up, retried after — fix working |
| `Match:SpawnMissed:TimingRace` | Spawn intent sent but rejected by server (old race condition, largely fixed) |
| `Match:SpawnMissed:NoAttempt` | Spawn phase ended, auto-spawn never ran |
| `Match:SpawnMissed:CatchupTooLong` | Catch-up outlasted entire spawn phase — unresolved |

---

## 26. Reconnection System

### What It Does

When a player's tab crashes, network drops, or they accidentally close the game mid-match, the reconnection system allows them to rejoin their active match within a 1-minute window. A reconnection prompt appears when they return to the game and detects an active session.

### Events

| Event | When |
|---|---|
| `Reconnect:PromptShown` | Reconnection prompt appears |
| `Reconnect:Accepted` | Player taps "Reconnect" |
| `Reconnect:Declined` | Player taps "Leave" |
| `Reconnect:Succeeded` | Reconnection completes |
| `Reconnect:Failed` | Reconnection attempt fails |

### Important Distinction from Server Restart

The reconnection system handles **individual player disconnects** with a 1-minute match-rejoin window. The planned server restart UX (Task 5b, deferred to Sprint 6) handles **server-wide restarts** with no time limit and no match state restoration — it simply polls until the server is back and reloads. These are separate flows and must not be conflated when implementing either.

### Relevance to AI Lobby Bug

The AI lobby slot bug fix must not interfere with the reconnection flow. A player who disconnects and reconnects is not "leaving" — they should not be treated as vacating their slot for an AI to fill.

---

## 27. Announcements System

### Current State (as of Sprint 4)

The global announcements feature was re-enabled in Sprint 2 (Task 8d-A). It is live in production.

### Architecture

- **Content source:** a JSON file in the repository. Adding new announcements requires a code deploy.
- **Storage:** no backend. Content served from the JSON file. Read state stored in `localStorage` (last seen announcement ID).
- **UI:** bell icon in the main UI. Unread badge appears when new entries exist that the player hasn't seen. Clicking opens a popup with entries in reverse-chronological order.
- **Behaviour:** popup never auto-opens. Unread badge is the only signal. Badge clears when popup is opened.
- **JSON format:** each entry has `id`, `date`, `title`, `body`, `tag` (optional: `"new"`, `"upcoming"`, `"update"`).

### Personal Inbox (8d-B, Sprint 4)

A second tab inside the same announcements popup, visible to citizens only. Unlike global announcements, personal messages are stored server-side in the player profile store (persistent across devices). Messages are one-way (game → player, no replies).

**Initial triggers:**
- Citizenship earned (50 matches)
- Citizenship purchased
- Name change approved
- Name change rejected

**Server endpoints needed:**
- `GET /player/messages` — fetch citizen's messages (auth required)
- `PATCH /player/messages/read` — mark as read
- `POST /admin/player-message` — send message to a citizen (internal only)

### Relationship Between 8d-A and 8d-B

8d-A (global announcements) is independent and already shipped. 8d-B (personal inbox) depends on both 8d-A being live AND the player profile store being implemented. The bell icon badge covers both — if either global or personal has unread content, the badge appears.

---

## 28. Player Naming & Display Names

### Current State

Players currently have no persistent display name in Geoconflict. In matches, players are identified by their Yandex account username (if authorized) or a default identifier. There is no in-game name customisation.

### Planned: Name Change (Sprint 4, Citizens Only)

Name change is the first citizenship benefit. Citizens will be able to set a custom display name. Key constraints:

- **Citizens only** — non-citizens cannot access the feature
- **Moderation required** — name changes go through a review step before becoming active. Inappropriate names must be rejectable.
- **Name uniqueness** — names must be unique across all players. This requires a cross-player query, which is why the player profile store needs a relational database (PostgreSQL preferred over MongoDB for this use case).
- **Name history** — for moderation purposes, name change history should be stored (who changed to what and when).
- **Personal inbox notification** — approval or rejection triggers an automatic personal message to the citizen.

### Name Change Flow (Planned)

1. Citizen submits name change request
2. Request stored as pending in player profile store
3. Admin reviews via admin panel (future tooling)
4. On approval: name becomes active, personal inbox message sent
5. On rejection: request cleared, personal inbox message sent with reason, citizen can resubmit

### Moderation Tooling

No admin panel exists yet. Name review process and admin tooling are out of scope for Sprint 4 — the flow needs to be designed as part of the name change brief when it is written in Phase 2.

### Relationship to Player Profile Store

The player profile store schema must account for display names from the start, even if name change ships later than the store itself. The schema should include: `displayName` (nullable), `pendingDisplayName` (nullable), `displayNameHistory` (array of past names with timestamps).
