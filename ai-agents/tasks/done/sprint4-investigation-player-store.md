# Sprint 4 Investigation — Player Profile Store

Status: complete. Findings recorded in `ai-agents/knowledge-base/sprint4-player-profile-store-findings.md`.

## Priority
First task of Sprint 4. All citizenship, name change, and cosmetics tasks depend on this. Do not begin implementation of any citizenship feature until findings are documented and reviewed.

## Context

Sprint 4 introduces server-side per-player persistent state for the first time. The current game server has no persistent database — match records go to the external archive API, but there is no player profile store. This investigation determines what database technology to use, where to host it, and how to structure the initial schema.

The player profile store will be keyed by Yandex player ID (`ysdk.getPlayer().getUniqueID()`) and must support authorized players only — guests have no stable ID and cannot have persistent profiles. The store needs to be designed for the long term: citizenship is the first use case, but name changes, cosmetic ownership, and eventually cross-player queries (name uniqueness) will follow.

---

## Questions to Answer

### 1. Database Technology

Evaluate the options and recommend one:

- **PostgreSQL** — relational, reliable, already familiar from the Uptrace stack on the internal server. Strong choice if relational queries are expected (name uniqueness checks, future leaderboards).
- **MongoDB** — document-oriented, flexible schema, easier to evolve as the data model grows. Good if the player profile structure will change frequently in early sprints.
- **SQLite** — zero-config, file-based. Only appropriate if the load is very low and simplicity is the top priority. Not recommended if concurrent writes are expected.
- **Redis** — fast, but not a primary persistent store. Could complement another database for caching player state per session.

Consider: existing team familiarity, operational overhead, query patterns needed for citizenship and name uniqueness, and how the choice fits with the existing server infrastructure.

**Output:** a recommendation with brief rationale. No need for an exhaustive comparison — pick the best fit and explain why.

---

### 2. Where Does the Store Live?

Three options:

- **On the existing game server** — simplest deployment, no new infrastructure. Adds a database dependency to the production game process. Risk: database issues can affect game server stability.
- **As a separate lightweight service on the same game server VPS** — slightly more complex but isolates the database from the game process. A small Express or Fastify API in front of the database, called by the game server.
- **On the internal Uptrace/tooling server** — clean separation, but adds network hop between game server and player data on every match end. Adds latency to a write that happens at a sensitive moment (match completion).

The game server VPS is the likely answer for simplicity, but the specialist should assess whether adding a database to the production game process introduces unacceptable risk, and whether the disk space on the game server VPS (50GB HDD, already partially used) can comfortably accommodate the database.

**Output:** a recommendation with brief rationale, including an estimate of expected database size at current and 10× scale.

---

### 3. Initial Schema

Design the minimum viable schema for Sprint 4. Must support:

- Player lookup by Yandex player ID
- Match completion count (qualifying matches toward 50)
- `isCitizen` flag
- `isPaidCitizen` flag
- Citizenship earned timestamp
- Citizenship purchased timestamp

Also consider future needs that should inform schema design now even if not implemented in Sprint 4:
- Display name (for name change feature)
- Cosmetic ownership (flag IDs, pattern IDs)
- Name change history (for moderation)

**Output:** proposed schema (table definition for SQL, document shape for MongoDB). Does not need to be final — just needs to be reviewed before implementation begins.

---

### 4. Match Completion Tracking

A qualifying match is one where the player was eliminated or survived to match end — not a voluntary leave or disconnect without return. The server already knows this information (it tracks eliminations, match end, and disconnections).

Determine the simplest reliable implementation:

- **Server-side tracking (preferred):** at match end, the server already knows which players completed the match qualifyingly. Increment their counters directly. No client involvement needed.
- **Client-reported:** client sends a "match completed" signal at match end. Simpler client integration but gameable.

The specialist should confirm whether server-side tracking is feasible given the current match end logic in `GameServer.ts`, and whether the Yandex player ID is available server-side (it may need to be sent from the client during the join flow and stored per-session).

**Output:** recommendation on tracking location and a note on whether Yandex player ID is available server-side or needs to be sent from the client.

---

### 5. Guest Player Handling

Players who are not logged into Yandex have no stable player ID. The citizenship system is for authorized players only.

Confirm:
- How does the client currently detect whether a player is authorized? (`ysdk.getPlayer().getMode()` returns `'lite'` for guests)
- What should happen when a guest visits the citizenship UI — silent hide, or a prompt to log in?

**Output:** confirmation of the authorization detection mechanism and a recommendation on guest UX (the decision itself is a product decision for Mark to make, but the specialist should present the options).

---

## Output Required

A written findings document covering all five questions above, with concrete recommendations. This document gates all Phase 2 Sprint 4 implementation tasks.

Estimated effort: 1–2 days of investigation and codebase review.

## Notes

- Do not begin any implementation in this task — findings only
- The Yandex payments catalog investigation (separate task) runs in parallel with this one
- The findings from both investigations will be reviewed before Sprint 4 Phase 2 briefs are written
