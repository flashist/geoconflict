# Sprint Backlog

**Date**: 2026-06-03
**Status**: accepted

## Context

`ai-agents/sprints/sprint-backlog.md` collects defined work that is worth doing but has no assigned sprint home. These items should not be implemented until they receive a sprint assignment and, where needed, a full task brief.

> ⚠️ **There are now TWO unsprinted boards, and both must be read to see all unsprinted work** (as of 2026-08-08).
>
> A second board, `ai-agents/sprints/backlog.md`, was added as the default home for any brief filed without a named sprint. Its filename is deliberately **not** `sprint-*` — the status tool finds the active sprint by globbing `sprint-*.md`, so a board of explicitly unscheduled work must stay outside that glob or it can be reported as the active sprint. The older `sprint-backlog.md` (~23 entries, described below) **is** inside that glob, which is the defect being retired.
>
> Its Priority column reads `—` on every row: the board is **unranked by design**, and needing a rank is the signal to pull the task into a sprint. See [[systems/agent-conventions]].
>
> **Eleven tasks are filed on the new board** as of 2026-08-09. `0001`–`0004` were written during project initiation (2026-08-08) and are toolkit/process migrations rather than game work; `0005`–`0011` came out of the open-questions interview and its follow-ups on **2026-08-09**, each authorised by an owner ruling recorded in that session.
>
> | ID | Task | Status on the board |
> |---|---|---|
> | `0001` | Consolidate unsprinted work onto `backlog.md` and **retire `sprint-backlog.md`** | 🔲 Backlog |
> | `0002` | Migrate `tasks/backlog/` to the task-folder convention | 🔲 Backlog |
> | `0003` | Migrate `tasks/done/` and `tasks/cancelled/` to the task-folder convention | 🔲 Backlog |
> | `0004` | Reconcile legacy status markers in the sprint plans to the canonical vocabulary | 🔲 Backlog |
> | `0005` | `ADMIN_TOKEN`: fail closed on a missing secret, and compare in constant time | 🔲 Backlog |
> | `0006` | Investigation: `SLOW_TURN_THRESHOLD_MS` vs the 66.7 ms turn interval | 🔲 Backlog |
> | `0007` | Investigation: blast radius of the `src/core` → `src/client` imports | 🔲 Backlog |
> | `0008` | Migrate `PrivilegeRefresher` to fail-closed | 🚧 **Blocked by design** — needs `0009` findings **and** the first paid entitlement |
> | `0009` | Self-host the upstream OpenFront API dependency (findings phase) | 🔲 Backlog — **pull ahead of any cosmetics monetization work** |
> | `0010` | Re-enable flags as a paid non-country cosmetic (Task 9) | 🚧 Blocked — `0009` findings + payment infra + owner decision on the design set |
> | `0011` | Re-enable territory patterns (Task 9a) | 🚧 Blocked — `0009` findings + payment infra + owner rulings (pattern set, ad coupling) |
>
> Execution order for the migration set is **0002 → 0003 → 0001 → 0004** — dependency order, *not* ID order. `0005`–`0009` are independent of it and of each other. IDs were allocated when each brief was written; ordering lives in each brief's `**Depends on:**` line. The board is **unranked by design**, so there is no rank to raise — the owner's ruling is that `0009` is **pulled into a sprint ahead of any cosmetics monetization work**, and that ordering takes effect at pull time.
>
> **None of these eleven briefs have wiki task pages**: the wiki does not page a task until it is done or cancelled. They are summarized here instead. Task `0001` is what eventually collapses these two boards back into one.
>
> **What the new briefs are about, in one line each:**
>
> - **`0005`** — `ADMIN_TOKEN` has two defects, one of which is the real one: a missing or empty value silently falls back to a literal placeholder committed to a **public** repo, so a secret whose absence degrades to a known public value reports itself as protected. The `!==` non-constant-time comparison at all five check sites is the minor second. The profile server's `InternalAuth` already does both correctly and is the pattern to copy.
> - **`0006`** — the slow-turn threshold (100 ms) is *larger than the turn interval* (66.7 ms), leaving a 33 ms band where the server is falling behind and telemetry is silent. Investigation, not a fix: the naive answer of setting it to 66.7 may trade a blind band for alert noise, and the right value depends on the current distribution. See [[decisions/adr-107-turn-interval-1-5x]].
> - **`0007`** — `src/core/GameRunner.ts:1` and `src/core/game/GameImpl.ts:1` import from `src/client/`, undermining the deterministic shared tier that makes hash-based desync detection meaningful. Both inherited from upstream. Owner's ruling was "investigate the blast radius first" — a type-only symbol is a two-line fix and a lint rule; real runtime code needs proper scoping.
> - **`0008`** — the pre-committed fail-closed migration from the [[decisions/adr-102-privilege-refresher-fails-open]] ruling, filed now so the commitment is a scheduled task rather than a promise inside a document. **Deliberately blocked** on two conditions, not one.
> - **`0009`** — identity, archive, and matchmaking still point at an external OpenFront-style service. Owner's ruling: **to be self-hosted eventually** — not a dead leftover, not a permanent dependency. It **grew teeth on 2026-08-09**: cosmetic entitlements (`flares`) come from that upstream API, so it blocks the cosmetics monetization path, not just the archive task. ⚠️ If the call is live it is also a 152-ФЗ question, since the compliance position rests on all infrastructure being RU-resident — **not an accusation that it is live; that is the first thing the task must determine.**
> - **`0010`** — flags as a paid **non-country** cosmetic. The `/flags/*.svg` 404 is **by design** (see [[decisions/adr-106-flags-suppressed]]); do not "fix" it by restoring legacy country flags. Yandex Games bans real-country flags and names, so whatever ships must be non-country designs only.
> - **`0011`** — territory patterns, the highest-visibility cosmetic in the game and the strongest upsell surface. The plumbing already exists (`CosmeticsSchema`, `isPatternAllowed()`, `isColorAllowed()`, `PatternDecoder`) — a re-enable and a content decision, not a build from scratch. ⚠️ **Patterns already control ad revenue:** `src/client/GutterAds.ts:35` suppresses ads for any player holding a `pattern:` flare, so granting a pattern removes that player's gutter ads **today**, before anyone deliberately decided to link the two. Whoever scopes this must rule on whether that coupling is intended.
>
> **The cosmetics monetization chain.** `0010` and `0011` are the **root** of a dependency chain two later sprints already assume is done:
>
> ```
> 0009 (entitlement origin)  →  0010 flags + 0011 patterns
>                                    ↓
>                     Sprint 5 Task 8a (nickname styling)
>                     Sprint 5 Task 15 (custom uploaded flags/patterns)
>                                    ↓
>                     Sprint 6 paid map packs (purchase surface)
> ```
>
> Until 2026-08-09 neither root had a brief, a sprint, or an owner — the chain rested on nothing. `plan-index.md:87-88` assigns both to Sprint 4, but neither appears in the Sprint 4 plan document. Both are now briefed and blocked, which is honest; previously they were invisible. See [[decisions/sprint-5]] and [[decisions/sprint-6]].

> **Board evolution since 2026-08-09** (the eleven-row snapshot above is history, kept as written):
>
> - **Every legacy flat-named brief now lives in an ID-prefixed task folder** (`0012`–`0040` cover the migrated items already described in prose below — personal inbox is `0012`, profile-store epic `0013`, catalog registration `0014`, sec10/sec11 are `0015`/`0016`, citizenship earned/paid `0017`/`0018`, mobile WebGL `0031`, 152-ФЗ compliance `0048`, and so on).
> - **2026-08-14 scoping** added `0043`–`0048` (defense-post range visibility, infinite-gold/no-nukes rotation, VPS registry credential hygiene, feedback contact-field removal — since done, deploy transport secret hygiene, and the 152-ФЗ compliance task).
> - **`0048` scope grew by owner ruling (2026-08-21):** the email-subscribe modal's 152-ФЗ exposure — flagged during `0046` as **larger** than the removed feedback contact field — is folded into `0048` as an in-scope item (consent/privacy-policy/retention/deletion, or drop the feature; the drop-vs-consent product call waits for the findings). Rejected alternatives: a separate task; dropping the feature now.
> - **Project-heal (2026-08-10) added `0050`–`0053`** — sprint-field reconciliation, a bare-legacy-identity sweep of the knowledge-base (`0051`), the wiki-vault legacy-filename follow-up (`0052`, owner-ruled to run after `0003`), and tracking the upstream fkit `dashboard.sh` `PLAN_SPRINT` resolution defect (`0053`, handed to the fkit maintainer — not this repo's fix to make).
> - **The 2026-08-22 outage** ([[decisions/incident-2026-08-22-public-lobbies-outage]]) filed `0057`–`0059` here; `0057` was promoted into Sprint 4 the same day (owner-ruled to run before `0056`), its row kept as `➡️ Moved`; it **closed 2026-08-26** on the Sprint 4 board — see [[tasks/worker-routing-dead-worker-investigation]]. `0058` (`Worker.ts` missing `server.on("error")` — refuted as the outage's cause) and `0059` (precompile the server for prod instead of `ts-node/esm` — the leading unproven hypothesis for the worker death; owner-ruled 2026-08-23 to stay here) remain. Under the ruled 18/20 quorum the misroute exposure `0057` sizes is up to ~2-in-20 (~10%), not the earlier 1-in-20 estimate.
> - **The outage config-drift sweep (2026-08-23)** added `0061` (prod Telegram feedback delivery dead and silent — the "needs `TELEGRAM_PROXY_URL`" diagnosis is disproven, so it is an investigation; strongest promotion candidate on this board), `0062` (filed here, **verified same day as blocking `0017`/`0018`, promoted to Sprint 4** — row kept as `➡️ Moved`), and `0064` (a deploy-time config parity guard). **`0064` is the surviving guard task**: a near-duplicate, `0072`, was approved from the 2026-08-24 interview and cancelled the same day, its specifics merged in — see [[decisions/cancelled-tasks]]. ⚠️ **`0064` ships only after `0062` AND `0063` land**; armed earlier it would correctly fail every deploy on their known gaps. 🔧 **Updated 2026-08-30: `0063` has landed** — fixed and deployed in release `362a2f9` ([[tasks/prod-api-env-https-apex]]). `0062`'s deploy-script fix shipped in the same release **with the token deliberately left blank**, so a `0064` presence check would pass on a variable that is doing nothing — the guard must assert **non-empty**, not merely present.
> - **`0063`'s investigation reframed the auth question and filed two briefs here (2026-08-24).** There is **no auth service on this origin** — no login routes, no JWT signing, and the JWKS URL serves the SPA HTML — so the Discord/token login UI is dead code. `0069` is the **product decision**: build an auth service someday, or commit to Yandex-only and remove the surface. `0070` is the `TokenLoginModal` silent failure (`TokenLoginModal.ts` has its alert commented out, so failures are invisible); whether it is restore-or-remove **follows `0069`'s ruling**, so do not build it first.
> - **`0199` filed 2026-08-28 — the first product question routed here out of a closing review ledger.** (`0198`'s path fix has since **deployed** in `362a2f9`; the host question this brief carries is untouched by that and remains unruled.) A private-lobby invite shared from the Yandex build takes the recipient **outside the portal iframe**; the question is portal-relative vs standalone invite. Surfaced during `0198` (which fixed the **path** on that same line and deliberately left the **host** open), and owner-ruled the same day that it must not stay as an undecided note in a closing ledger. **Backlog / Unscheduled at producer rank, owner-confirmed as explicitly not a Sprint 4 item** — nothing is broken for players, and the shape of the fix is unknown. An investigation-and-decision task: no `src/` change is permitted by its own verification. See [[decisions/yandex-invite-portal-boundary]].
> - **Two further 2026-08-24 additions.** `0071` — map label density tuning at mid-zoom: the owner judged `0041`'s shipped labels too cluttered at mid-zoom, which is exactly the tuning pass `0041`'s own clutter flag anticipated; `src/client/` only, and the owner's eye is the acceptance gate. `0073` — remove inert upstream HTML leftovers (audit §H3: commented `og:` / googletag / Publift fragments plus a dead Steam link); deletion-only, and footer mentions stay per the `0066` ruling.

## Decision

Keep no-sprint work separate from active sprint plans so the active roadmap does not imply these tasks are approved for immediate implementation.

Current no-sprint items include rewarded ads minimal version, leaderboard core, citizen-only private lobbies and spectating, flag and territory-pattern re-enablement, Monitoring & Alert Bot Phase 1/Phase 2, mobile memory/WebGL rendering failures, security follow-ups sec10/sec11/sec12/sec13, 152-ФЗ notification/consent work, Worker Init Timeout map-transfer work, the no-nukes bot SAM launcher fix, two staged bot anti-SAM nuke tactics, forcing no-nukes rules when infinite gold appears in public rotation, removing the dead FuseTag polling loop, and fixing `GutterAds` listener lifetime. Parked items include deep mobile rendering optimization and Microsoft Clarity session recordings.

The degraded-mode citizenship-card UX task is no longer no-sprint backlog as of 2026-07-02. It moved into Sprint 4 because earned and paid citizenship should not launch while Yandex SDK timeout/failure sessions still see a dead auth CTA in the citizenship funnel. See [[decisions/sprint-4]] and [[tasks/citizenship-card-guest-cta-no-sdk]].

The monitoring alert bot phases were added on 2026-06-04 after the telemetry VPS freeze/outage findings. Phase 1 is the near-term incident-prevention slice: external dead-man's-switch heartbeat, telemetry-VPS on-box disk/RAM/swap/OOM/container checks, shared Telegram helper, Russia-proxy routing, and digest/dedup/recovery alert UX. Phase 2 follows only after Phase 1 is deployed and proven, adding game-server VPS coverage plus slower-degradation hygiene such as ClickHouse/file-log growth attribution, TLS/certbot checks, sustained CPU load, backup health, predictive disk growth, and game-server availability heuristics.

The mobile memory/WebGL rendering task was moved out of Sprint 4c on 2026-06-03. It has visible Uptrace signal around low-memory `getImageData` / `createImageData` failures and WebGL context failures, but its fix likely requires profiling, device-specific testing, graceful renderer fallback, and better device context in error logs. It should be scheduled only once mobile crash/performance data is clearer.

Worker Init Timeout is a medium-priority join-path hardening task. The brief records that the Web Worker redundantly re-downloads the already-preloaded map binary during join, creating a latent 5-second timeout risk and wasting about 5.6 MB per match start; the preferred fix is to transfer loaded terrain buffers into the worker, raise the timeout as a fallback, and clean up timed-out workers.

The no-nukes bot SAM launcher fix is a small gameplay-efficiency backlog task. In matches where nukes are disabled, bots still build SAM launchers even though no nuke can exist; the intended fix is to skip the SAM spawn path in `FakeHumanExecution.handleUnits()` when silos are disabled.

The bot anti-SAM work is deliberately split into two no-sprint tasks. The first investigates radius-aware hydrogen-bomb scoring and offset targets outside the 70-tile SAM range but inside the H-bomb's 80-tile total-destruction radius. The second depends on that refactor and adds coordinated `(SAM level + 1)` atom-bomb salvos to exhaust interception capacity. Both affect `FakeHumanExecution`, require `src/core/` tests plus live real-map validation, and should decide difficulty gating before implementation.

The redirected infinite-gold public-rotation task keeps `infiniteGold` in the four-option weird-setting pool but pairs it with `disabledUnits: [UnitType.MissileSilo]`. This preserves the unlimited-economy novelty while removing public nuke spam; the overall weird-mode chance remains 20% across four options.

Two side bugs from the app-bootstrap investigation are now no-sprint backlog items. `initializeFuseTag` starts a perpetual 100ms polling loop even though the Fuse ad script is commented out in both HTML templates. `GutterAds.hide()` removes its `userMeResponse` listener while the element remains connected, so after the first game/lobby leave it stops reacting to login-state changes.

The 152-ФЗ compliance item was deferred out of Sprint 4 on 2026-06-28 with risk explicitly accepted. The prior hash-based avoidance plan was invalidated: hashing the Yandex ID does not remove the notification/consent obligation. The backlog task should produce a v2 findings document and likely cover Roskomnadzor operator notification, consent/privacy-policy text, display-name handling, email-subscribe PII, and future archive PII surfaces. See [[decisions/personal-data-152fz-compliance]].

The sec12/sec13 deploy-security items came from profile-deploy hardening reviews. sec12 narrows registry credential blast radius on public boxes through scoped pull-only credentials and isolated/logout Docker config. sec13 closes transport-layer secret hygiene gaps across profile and telemetry deploys: telemetry local EXIT-trap cleanup parity and 0600 remote env-file creation.

## Consequences

- Backlog task files such as `ai-agents/tasks/backlog/0031-mobile-webgl-rendering/brief.md` remain source briefs, not wiki task pages, until the work is assigned or completed.
- Sprint 4c no longer carries mobile WebGL rendering as an active stabilization item. The lobby/map-fetch investigation shipped; client null-ID triage remains a separate Sprint 4 follow-up that should use deployed symbolicated traces.
- Monitoring & Alert Bot Phase 1 should be treated as unusually high-value no-sprint ops work because it protects the observability stack that stabilization depends on; Phase 2 should not leapfrog Phase 1.
- Deep mobile rendering optimization remains parked until mobile DAU consistently exceeds 1,500, but the WebGL/memory task can be scheduled earlier if crash data justifies it as a targeted stability fix.
- Worker Init Timeout should not block production releases by itself, but before shipping its fix, validate the join path on a valid-TLS host because the dev bare-IP host with a certificate error is not representative of production browser caching.
- The no-nukes SAM fix is backlog, not active sprint work; it should still get `src/core/` tests because it changes bot build execution.
- The H-bomb offset-targeting investigation must land before the multi-nuke saturation task; neither has a sprint home, and synthetic-map tests alone are insufficient for their spatial targeting claims.
- The infinite-gold adjustment is a public-match quality task: keep the mode, force nukes off for that public modifier, and leave the four-option probability split unchanged.
- The FuseTag and GutterAds tasks are independent cleanup bugs from [[tasks/app-bootstrap-single-entry-point]]; they should not be bundled into the bootstrap refactor retroactively.
- The 152-ФЗ backlog item is a conscious accepted-risk deferral, not a resolved legal gate. Do not revive the cancelled Yandex-ID hash implementation as a compliance fix unless new legal findings establish a real benefit.
- sec12/sec13 are hardening follow-ups for live deployment paths; sec12 is more release-adjacent because it concerns registry credentials on the live profile box.
- Degraded-mode citizenship-card UX has moved back into Sprint 4 and should not be treated as unassigned no-sprint work.

## Related

- [[decisions/product-strategy]] — retention-first roadmap and mobile DAU gate for deep mobile work
- [[decisions/sprint-4]] — sprint that deferred 152-ФЗ compliance with accepted risk
- [[decisions/sprint-4c]] — sprint that deferred mobile WebGL rendering to the no-sprint backlog
- [[systems/project-operations]] — sprint/task workflow and rule that work needs a sprint home before implementation
- [[systems/rendering]] — likely technical area for WebGL fallback and ImageData allocation fixes
- [[systems/telemetry]] — monitoring alert bot context and telemetry outage history
- [[systems/flashist-init]] — source investigation that identified the FuseTag and GutterAds side bugs
- [[tasks/app-bootstrap-single-entry-point]] — completed bootstrap task that produced the side-bug backlog items
- [[tasks/mobile-quick-wins]] — prior mobile rendering reductions that may not be enough for low-memory devices
- [[systems/player-profile-store]] — live profile-box context for sec12/sec13 and compliance deferral
- [[decisions/personal-data-152fz-compliance]] — deferred 152-ФЗ notification/consent track
- [[tasks/personal-data-compliance-investigation]] — Sprint 4 investigation that led to the deferred compliance backlog item
- [[tasks/citizenship-card-guest-cta-no-sdk]] — completed Sprint 4 follow-up that exposed the remaining degraded-mode citizenship-card gap
- [[systems/project-brief]] — the project brief that points at both unsprinted boards
- [[decisions/fkit-transfer-blueprint]] — the toolkit migration tasks `0001`–`0004` belong to
- [[decisions/adr-102-privilege-refresher-fails-open]] — the ruling that produced tasks `0008`, and named `0010` / `0011` as trigger-firing entitlements
- [[decisions/adr-107-turn-interval-1-5x]] — the 66.7 ms interval behind task `0006`'s threshold blind band
- [[decisions/adr-106-flags-suppressed]] — the suppression task `0010` reverses into a paid non-country cosmetic
- [[decisions/sprint-6]] — paid map packs, the far end of the cosmetics monetization chain
- [[systems/architecture-overview]] — risks R4 (`0005`), R5 (`0008`), R7 (`0007`), and the open questions these briefs answer
- [[systems/player-infrastructure]] — the system-level record of the live upstream-sourced `flares` path that gave task `0009` its teeth
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the outage that filed `0057`–`0059` and the config-drift sweep behind `0061`/`0062`/`0064`
- [[decisions/cancelled-tasks]] — where the cancelled duplicate guard task `0072` and its merged specifics are recorded
- [[tasks/master-lobbies-worker-exit-diagnostics]] — the shipped Sprint 4 half of the outage track these follow-ups orbit
- [[tasks/feedback-remove-contact-field]] — the done task whose owner flag folded the email-subscribe 152-ФЗ exposure into `0048`
- [[decisions/yandex-invite-portal-boundary]] — task `0199`, filed on this board 2026-08-28 at producer rank with the owner confirming the placement
- [[tasks/prod-api-env-https-apex]] — task `0063`, whose reframe filed `0069` and `0070` onto this board; fixed and deployed 2026-08-29
