# Sprint Backlog

**Date**: 2026-06-03
**Status**: accepted

## Context

`ai-agents/sprints/sprint-backlog.md` collects defined work that is worth doing but has no assigned sprint home. These items should not be implemented until they receive a sprint assignment and, where needed, a full task brief.

## Decision

Keep no-sprint work separate from active sprint plans so the active roadmap does not imply these tasks are approved for immediate implementation.

Current no-sprint items include rewarded ads minimal version, leaderboard core, citizen-only private lobbies and spectating, flag and territory-pattern re-enablement, Monitoring & Alert Bot Phase 1/Phase 2, mobile memory/WebGL rendering failures, security follow-ups sec10/sec11/sec12/sec13, 152-ФЗ notification/consent work, Worker Init Timeout map-transfer work, the no-nukes bot SAM launcher fix, two staged bot anti-SAM nuke tactics, forcing no-nukes rules when infinite gold appears in public rotation, removing the dead FuseTag polling loop, and fixing `GutterAds` listener lifetime. Parked items include deep mobile rendering optimization and Microsoft Clarity session recordings.

The degraded-mode citizenship-card UX task is no longer no-sprint backlog as of 2026-07-02. It moved into Sprint 4 because earned and paid citizenship should not launch while Yandex SDK timeout/failure sessions still see a dead auth CTA in the citizenship funnel, and it later shipped as [[tasks/degraded-mode-full-ux-treatment]]. See [[decisions/sprint-4]] and [[tasks/citizenship-card-guest-cta-no-sdk]].

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

- Backlog task files such as `ai-agents/tasks/backlog/mobile-webgl-rendering.md` remain source briefs, not wiki task pages, until the work is assigned or completed.
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
- Degraded-mode citizenship-card UX moved back into Sprint 4 and shipped; it should not be treated as unassigned no-sprint work.

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
- [[tasks/degraded-mode-full-ux-treatment]] — completed Sprint 4 follow-up that resolved the degraded-mode citizenship-card gap
