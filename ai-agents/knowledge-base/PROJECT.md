# Geoconflict

> The prose project brief for AI agents. Agents read this to understand what this project
> is, who it's for, and how it's built. Keep it current.

## Overview

Geoconflict is a live, browser-based real-time PvP strategy game with short sessions — a
Russian-market adaptation of the open-source game [OpenFront.io](https://openfront.io/). Players
claim and expand territory on maps drawn from real-world geography, build structures, form
alliances, deploy weapons, and compete to be the last player standing. It ships primarily through
**Yandex Games**, is played mainly by Russian-speaking players, and today earns its revenue from
advertising, with an in-app-purchase layer (the "citizenship" supporter tier) being built out.

## Domain & context

**Who it's for.** Russian-speaking players who like territorial-control `.io` strategy games.
Desktop is the core audience by both size and engagement depth; mobile is materially smaller and
lower-engagement, and iOS retention is poor. Community lives on VKontakte and Telegram.

**Fork relationship.** Every intentional divergence from upstream OpenFront.io is marked in code
with a `// Flashist Adaptation` comment. Treat those as deliberate customizations, not accidents —
e.g. the turn interval is accelerated 1.5× (~66.7 ms rather than 100 ms). Note that several older
docs claim Duos/Trios/Quads are disabled; **as of 2026-08-08 all three are live** in the public
rotation. Verify a fork claim against the code before relying on it.

**Business model.** Ad impressions (interstitial + sticky banner) are the primary revenue source
today. The strategic sequence is **retention → monetization → content**: anything that keeps players
in a match longer, brings them back, or converts curious newcomers raises ad revenue without
touching monetization at all. Yandex Games also promotes titles that earn more per player, so
engagement gains compound into ranking and DAU. In-app purchases via the Yandex Games SDK are
planned and partly built, not yet live.

**Citizenship.** The supporter tier and the spine of the monetization layer. Two paths — *earned*
(1,000 XP at 10 XP per qualifying match) and *paid* (99 ₽). Any purchase grants citizenship.
Benefits include no interstitial ads for paid citizens, the full emoji set, and further perks
(name change, verified icon, private lobbies, spectating) planned behind it.

**Key domain terms.** *Tick* — one deterministic game step (~67 ms). *Intent* — a Zod-validated,
serialized player action; every action goes through the intent pipeline. *Ghost player* — a player
who joins but never acts. *Nations* — AI opponents seeded from real geography (`PlayerType.FakeHuman`
in code — see the wiki glossary, `ai-agents/wiki-vault/wiki/systems/glossary.md`). *Citizen* — a player on the supporter tier.

## Architecture

Four tiers in one TypeScript (ESM) repo:

- `src/core/` — deterministic shared game logic; the contract between the other tiers.
- `src/client/` — **Canvas 2D** rendering with Lit web components (one WebGL layer composited in;
  Pixi.js appears in only a couple of layer files, despite what older docs say). Entry point is
  `Bootstrap.ts`, which runs a bounded ~5 s Yandex-SDK init with an explicit degraded mode.
  Simulation runs in a web worker.
- `src/server/` — a cluster master plus N workers. Games are sharded deterministically by
  `simpleHash(gameID) % numWorkers`. The server is a **turn relay, never a simulator** — clients
  execute the game logic, with a state hash every 10 ticks and majority-vote desync detection.
- `src/profile-server/` — a standalone XP/citizenship service with its own image, VPS, and
  PostgreSQL.

Deployment spans three self-hosted VPS fleets — game, profile/API, and telemetry (Uptrace +
ClickHouse) — all in Russia. There is **no CI**; every deploy is a local shell script.

**See [`architecture.md`](architecture.md) for the technical detail** — module map, build/run/test
commands, deploy topology, and the ranked technical risks. Do not duplicate it here.

## Conventions & constraints

### Platform — Yandex Games

- The production entry template is **`src/client/yandex-games_iframe.html`**, not `index.html`.
  There are **two** HTML templates and both get the same bundle — **any new HTML element must be
  added to both**.
- **No real-country flags or names** as cosmetics — Yandex bans them. Flags are a planned *paid,
  non-country* cosmetic; they are currently suppressed on purpose (`/flags/*.svg` 404s **by design**
  after the `flags_source` rename). Do not "fix" that 404 by resurfacing legacy country flags.
- The Yandex SDK **may be absent or time out** (the game also runs outside a Yandex context).
  Degraded mode is a first-class state, not an error path.
- Catalog items for purchases must be registered in the Yandex dashboard and **approved** — approval
  takes days and is an external blocker on paid features. There is no purchase webhook; verification
  is signed, server-side, consume-after-durable-grant.
- Minimum usable start-screen area is **360×430** (iPhone SE-class iframe).
- Yandex's built-in A/B experiments API is the **default rollout gate** for any additive,
  backward-compatible feature. Excluded: the analytics layer itself, uniform-by-nature changes,
  and anything touching economy or pricing (parallel versions would be unfair).

### Audience & scope

- **Desktop-first.** Deep mobile rendering optimization is **parked** until mobile DAU exceeds
  1,500. Mobile quick wins and honest expectation-setting are in scope; a mobile rewrite is not.

### Legal & data

Three separate tracks, two still open:

- **VAT** — cleared.
- **AGPL-3.0 + asset licensing** — source is AGPL v3 with attribution requirements; assets are
  CC BY-SA 4.0. `/proprietary` and upstream OpenFront CDN/API/DB assets are off-limits. ✅ **The
  licensing / asset-audit gate is SATISFIED AND DEMONSTRATED.** The production asset audit is
  `0025`, closed 2026-08-31; its findings were remediated by `0066`, with **V1** (All-Rights-Reserved
  music in the prod web root — the one confirmed violation) and **A1** (upstream brand mark as the
  live favicon) **verified in production 2026-08-30**, and **H1** (upstream jwt-audience fallback
  strings in the shipped bundle) **verified in production 2026-08-31**.
  ⚠️ **This clears the LICENSING gate only — it does NOT mean paid IAP is clear to ship.** `0065`
  (paid citizenship go-live) **remains blocked** on `0014`, `0062` and `0195`. Read this bullet as
  "one of several gates is now open", never as "IAP can ship".
  📌 **Open residual:** **H3** — inert commented-out upstream HTML leftovers — is still open, owned by
  task `0073`, audit-rated **low risk / no gate** (commented markup ships no asset, so there is no
  licensing consequence).
  🔧 *Corrected 2026-08-31 on owner ruling (R13). This bullet previously read: "A **production asset
  audit is an open gate before paid IAP ships**." That became false when `0025` closed and its
  production checks passed — the audit is no longer open or pending.*
  See `GeoConflict-Licensing-Brief.md`.
- **152-ФЗ (Russian personal data)** — Roskomnadzor notification + a consent flow are **deferred to
  the backlog with the risk explicitly accepted by the owner (2026-06-28)**. Real personal data
  (Yandex IDs, display names, email opt-ins) persists in production today. Resolve before scaling.
  The pseudonymize-by-hashing approach was investigated and **rejected** — it does not remove the
  obligation and only adds complexity. Do not re-propose it.
- All VPS are in **Russia (reg.ru, Moscow)**, so data residency is already satisfied. Stale
  `Hetzner` comments in `setup.sh` / `update.sh` are wrong — verify region by IP before making any
  residency or latency claim.

### Localization

- **All user-visible text goes through `translateText(key)`** — never hardcode a string in a
  component.
- Every localization change must land in **both `resources/lang/en.json` and `ru.json`**; these two
  stay in sync always. Other languages are handled externally.

### Release & operations

- **Deploy on weekends**, during lowest traffic, to minimise player disruption.
- Build numbers are auto-incremented by `build-deploy.sh`; never bump manually.
- Telemetry is **production-only** — dev environments send nothing.
- Shipping is not finished until analytics confirm the change behaves as expected in production.
- Analytics event strings live in the `flashistConstants.analyticEvents` enum in
  `FlashistFacade.ts` — the single source of truth. Never write an event string inline. Keep
  `analytics-event-reference.md` updated on every change.

### Standing rulings — do not "clean these up"

Three things look like dead code or half-finished config and are **deliberate**. Owner rulings,
2026-08-09:

- **The non-Yandex web build is dormant, not dead.** The Discord/email account path
  (`AccountModal`, `jwt.ts`) is wired but `<account-button>` is absent from the Yandex template. It
  is kept as a future option. **Do not remove it as dead code.**
- **The `staging` environment is intentionally half-present.** Every deploy script accepts it and
  `example.env` has a full `SERVER_HOST_STAGING` block, but there is no `.env.staging` on disk and no
  box. Left as-is knowingly — a deploy to `staging` will fail, and that is accepted.
- **The upstream OpenFront API is to be self-hosted eventually** — not a leftover to rip out, and not
  a permanent dependency. Findings task `0009` scopes it.

### Working rules for agents

- **No secrets in any artifact.** No DSNs, keys, credentials, or private endpoints (archive
  endpoint, telemetry dashboard, VPS specs) in briefs, findings, docs, or the wiki. Everything here
  goes to git.
- **Investigation before implementation** whenever meaningful unknowns exist. Do not scope an
  implementation brief until findings are reviewed with the owner.
- **Never commit or push unless the owner explicitly asks.**
- **Only the fkit-wiki agent writes `ai-agents/wiki-vault/`.**
- **Task status vocabulary is fixed** — see
  [`conventions/task-status-vocabulary.md`](conventions/task-status-vocabulary.md). Legacy sprint
  plans still carry non-canonical markers (`⬜`, `⚠️ Urgent`, `⏸ Parked`, `No sprint`); these are
  historical drift, not a licence to invent new ones.
- **Task files move only via `/fkit-task-done` and `/fkit-task-cancelled`, and only the producer may
  invoke them.** Owner ruling 2026-08-08: the producer runs the mover and stamps every close it
  performs without the owner present with `(agent-closed — not owner-verified)`. This supersedes the
  earlier "owner moves task files by hand" preference.
- **Two ADR series share this repo — always name which.** `ADR-001`–`ADR-099` are **fkit toolkit**
  ADRs (e.g. fkit ADR-005, the wiki write gateway), cited from `tasks/README.md` and the
  conventions. **This project's own ADRs start at `ADR-101`** and live in
  [`decisions/`](decisions/). Allocate new project ADRs from 101 up; never from 001.
- **Spatial gameplay changes must be validated on real maps** — synthetic-map unit tests can pass
  while the change is semantically wrong in a live match.
- **Reviews are inputs to evaluate, not instructions to apply.** Verify every claim against the code;
  classify defect vs unavoidable-tradeoff; say so plainly when a review is wrong.

## Current focus

Sprint 4 — *In-App Monetization & Citizenship*. The player profile store epic is complete and
~~the profile backend is live~~ 🔴 **CORRECTED 2026-09-04 — that is NOT claimable.** The profile
**code, deploy scripts, migrations and runbook all exist and are merged.** What is unknown is the
**running state**.

> **The reconciliation, from two owner statements the same day — both recorded, neither discarded:**
> first *"We don't have ANY profile-related VPS yet…"*, then, superseding it, *"We don't need to
> cancel any billings, the VPS and S3 I created will be reused"* — confirmed: *"Both exist — reuse
> them in place."*
>
> ⇒ **A profile VPS and an S3 bucket PHYSICALLY EXIST and are being reused in place. Whether the
> stack is provisioned, what is running, and what the bucket holds are UNKNOWN AND UNVERIFIED.**
> ⚠️ **Hardware existence and provisioning state are two different facts, and only the first is
> known.** That gap is the owner's standing complaint — *"I am completely lost about what was done
> and what wasn't"* — not a contradiction.

The work to close it is epic
[`0213`](../tasks/backlog/0213-profile-backend-clean-slate-rebuild/brief.md) — **wipe and rebuild onto
the existing box and bucket** (phases P0–P7, all in Sprint 4 by owner ruling). The survey behind it,
whose §0 answers *"what was done and what wasn't"* directly, is
[`2026-09-04-profile-backend-clean-slate-survey.md`](reports/2026-09-04-profile-backend-clean-slate-survey.md).
The active chain is: **degraded-mode UX treatment → Citizenship Earned →
Citizenship Paid**, with Yandex payments infrastructure and the (externally blocked) Yandex catalog
registration alongside. Owner's near-term priority (2026-08-08): finish the Sprint 4 monetization
lane first.

## Links

- **Repository** — https://github.com/flashist/geoconflict
- **Upstream** — https://github.com/openfrontio/OpenFrontIO
- **Live game** — https://geoconflict.ru (served as the Yandex Games iframe template)
- **Sprint plans** — `ai-agents/sprints/` (`plan-index.md` is the strategic spine and priority table)
- **Task briefs** — `ai-agents/tasks/backlog/`
- **Wiki** — `ai-agents/wiki-vault/` (`index.md` is the catalog)
- **Deep-dive docs** — `ai-agents/knowledge-base/` (`geoconflict-overview.md`,
  `geoconflict-producer-knowledge-base.md`, `analytics-event-reference.md`,
  `uptrace-knowledge-base.md`)
- Community: VKontakte and Telegram (links in-game on the start and game-end screens)
