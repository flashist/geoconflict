# Project Brief

**Layer**: shared
**Key files**: `ai-agents/knowledge-base/PROJECT.md`, `ai-agents/knowledge-base/architecture.md`

## Summary

The product ground truth for Geoconflict — what the game is, who it is for, how it earns, and the constraints every agent works inside. Written 2026-08-08 as the prose project brief that replaced an earlier placeholder. Where any other wiki page disagrees with this one on a *product* fact, this page's source wins; for *technical* facts the authority is [[systems/architecture-overview]].

Source: `ai-agents/knowledge-base/PROJECT.md`

## Architecture

### What the product is

Geoconflict is a live, browser-based real-time PvP strategy game with short sessions — a Russian-market adaptation of the open-source OpenFront.io. It ships primarily through **Yandex Games**, is played mainly by Russian-speaking players, and earns today from advertising, with an in-app-purchase layer (the citizenship supporter tier) being built out.

- **Audience** — Russian-speaking players of territorial-control `.io` strategy games. **Desktop-first** by both size and engagement depth; mobile is materially smaller and lower-engagement, and iOS retention is poor. Community lives on VKontakte and Telegram.
- **Business model** — ad impressions (interstitial + sticky banner) are the primary revenue today. The strategic sequence is **retention → monetization → content**; Yandex Games promotes titles that earn more per player, so engagement gains compound into ranking and DAU. IAP via the Yandex Games SDK is planned and partly built, **not yet live**. See [[decisions/product-strategy]].
- **Citizenship** — the supporter tier and the spine of the monetization layer. Two paths: *earned* (1,000 XP at 10 XP per qualifying match) and *paid* (99 ₽). Any purchase grants citizenship. Benefits include no interstitial ads for paid citizens, the full emoji set, and further perks (name change, verified icon, private lobbies, spectating) planned behind it. See [[systems/player-profile-store]].

### Domain vocabulary

| Term | Meaning |
|---|---|
| **Tick** | One deterministic game step (~67 ms — see [[decisions/adr-107-turn-interval-1-5x]]) |
| **Intent** | A Zod-validated, serialized player action; every action goes through the intent pipeline |
| **Ghost player** | A player who joins but never acts |
| **Nations** | AI opponents seeded from real geography |
| **Citizen** | A player on the supporter tier |

### Four tiers

`src/core/` (deterministic shared logic — the contract between tiers), `src/client/` (**Canvas 2D** + Lit web components, simulation in a web worker), `src/server/` (cluster master + N workers; a **turn relay, never a simulator**), `src/profile-server/` (standalone XP/citizenship service, own image/VPS/PostgreSQL). Deployment spans three self-hosted VPS fleets, all in Russia. **There is no CI** — every deploy is a local shell script. Detail lives in [[systems/architecture-overview]]; it is deliberately not duplicated here.

### Constraints that bind every task

**Platform — Yandex Games**
- The production entry template is `src/client/yandex-games_iframe.html`, not `index.html`. Both bundled templates get the same bundle, so **any new HTML element must be added to both**.
- **No real-country flags or names** as cosmetics — Yandex bans them. See [[decisions/adr-106-flags-suppressed]].
- The Yandex SDK **may be absent or time out**; degraded mode is a first-class state, not an error path. See [[systems/flashist-init]].
- Purchase catalog items must be registered in the Yandex dashboard and **approved** — approval takes days and is an external blocker on paid features. There is no purchase webhook; verification is signed, server-side, consume-after-durable-grant.
- Minimum usable start-screen area is **360×430** (iPhone SE-class iframe).
- Yandex's A/B experiments API is the **default rollout gate** for additive, backward-compatible features. Excluded: the analytics layer itself, uniform-by-nature changes, and anything touching economy or pricing.

**Scope** — desktop-first. Deep mobile rendering optimization is **parked** until mobile DAU exceeds 1,500; mobile quick wins and honest expectation-setting are in scope, a mobile rewrite is not.

**Legal** — three tracks, two open. VAT is **cleared** ([[tasks/legal-vat-investigation]]). AGPL-3.0 + CC BY-SA asset licensing carries an open gate: a **production asset audit before paid IAP ships** ([[decisions/licensing-compliance]]). 152-ФЗ notification and consent are **deferred to backlog with the risk explicitly accepted by the owner (2026-06-28)**; the pseudonymize-by-hashing approach was investigated and **rejected — do not re-propose it** ([[decisions/personal-data-152fz-compliance]]). All VPS are in Russia, so data residency is already satisfied.

**Working rules for agents** — no secrets in any artifact; investigation before implementation where meaningful unknowns exist; never commit or push unless the owner explicitly asks; only the wiki role writes `ai-agents/wiki-vault/`; task files move only via the producer's movers; spatial gameplay changes must be validated on real maps; reviews are inputs to evaluate, not instructions to apply. The full set is in [[systems/agent-conventions]].

### Standing rulings — do not "clean these up" (owner, 2026-08-09)

Three things look like dead code or half-finished config and are **deliberate**:

- **The non-Yandex web build is dormant, not dead.** The Discord/email account path (`AccountModal`, `jwt.ts`) is wired, but `<account-button>` is absent from the Yandex template. It is kept as a future option. **Do not remove it as dead code.**
- **The `staging` environment is intentionally half-present.** Every deploy script accepts it and `example.env` has a full staging block, but there is no `.env.staging` on disk and no box. Left as-is knowingly — a deploy to `staging` will fail, and that is accepted.
- **The upstream OpenFront API is to be self-hosted eventually** — not a leftover to rip out, and not a permanent dependency. Findings task `0009` scopes it. See [[decisions/sprint-backlog]].

**ADR numbering is a working rule, not just a convention:** `ADR-001`–`ADR-099` are fkit toolkit ADRs; this project's own ADRs start at `ADR-101`. Allocate new project ADRs from 101 up, never from 001. See [[decisions/adr-numbering-two-series]].

### Current focus (2026-08-08)

Sprint 4 — *In-App Monetization & Citizenship*. The player profile store epic is complete and the profile backend is live. The active chain is **degraded-mode UX treatment → Citizenship Earned → Citizenship Paid**, with Yandex payments infrastructure and the externally blocked Yandex catalog registration alongside. The owner's near-term priority is to finish the Sprint 4 monetization lane first. See [[decisions/sprint-4]].

## Gotchas / Known Issues

- **Two ADR series share this repo.** `ADR-001`–`ADR-099` are **fkit toolkit** ADRs and do not live in this repo; **this project's own ADRs start at `ADR-101`**. Always name which series you mean. See [[decisions/adr-numbering-two-series]].
- **Older docs contradict this brief on three points**, and this brief is right: the renderer is Canvas 2D (not Pixi.js), the turn interval is ~66.7 ms (not ~1000 ms), and Duos/Trios/Quads are **live** (not disabled). See [[systems/architecture-overview]] §Documented-but-stale.
- **Verify a fork claim against the code before relying on it.** Divergences from upstream are marked `// Flashist Adaptation`; several older documents describe adaptations that have since changed.
- The brief points at `ai-agents/sprints/plan-index.md` as the strategic spine and priority table. Unsprinted work now lives on **two** boards — see [[decisions/sprint-backlog]].

## Related

- [[systems/architecture-overview]] — the technical counterpart; module map, deploy topology, ranked risks
- [[systems/agent-conventions]] — the standing working agreements this brief summarizes
- [[systems/game-overview]] — game-design reference: modes, maps, units, economy, combat
- [[decisions/product-strategy]] — the retention-first sequence behind the sprint order
- [[decisions/sprint-4]] — the current sprint
- [[systems/player-profile-store]] — the citizenship/XP backend
- [[systems/project-operations]] — operational handbook: roles, environments, release workflow
- [[decisions/adr-numbering-two-series]] — the ADR number-band ruling this brief states
