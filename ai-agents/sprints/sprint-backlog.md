# Geoconflict — Sprint Backlog

> Tasks that are defined and worth doing but not assigned to any currently planned sprint (Sprint 4, 5, or 6). Items here need a sprint home before implementation begins. Brief a task before picking it up — most have no implementation brief yet.

---

## Status

| Status | Task | Brief | Depends On |
|---|---|---|---|
| ⬜ No sprint | Task 6 — Rewarded Ads: Minimal Version | None — see plan-index | Citizenship benefits (Sprint 4) |
| ⬜ No sprint | Task 7 — Leaderboard: Core System | None — see plan-index | — |
| ⬜ No sprint | Task 8b — Private Lobbies (Citizens Only) | None — see plan-index | Citizenship (Sprint 4) |
| ⬜ No sprint | Task 8c — Spectating (Citizens Only) | None — see plan-index | Citizenship (Sprint 4) |
| ⬜ No sprint | Task 9 — Re-enable Flags | None — see plan-index | Payment infrastructure (Sprint 4) |
| ⬜ No sprint | Task 9a — Re-enable Territory Patterns | None — see plan-index | Payment infrastructure (Sprint 4) |
| ⬜ No sprint | Monitoring & Alert Bot — Phase 1 (Incident-Preventing Core) | `backlog/monitoring-alert-bot-phase1.md` | — (recommend near-term, weekend deploy) |
| ⬜ No sprint | Monitoring & Alert Bot — Phase 2 (Depth & Hygiene) | `backlog/monitoring-alert-bot-phase2.md` | Phase 1 deployed |
| ⬜ No sprint | Mobile Memory and WebGL Rendering Failures | `backlog/mobile-webgl-rendering.md` | Clearer mobile crash/perf data |
| ⬜ No sprint | sec10 — Remove Password Deploy Fallbacks | `backlog/sec10-remove-password-deploy-fallbacks.md` | — |
| ⬜ No sprint | sec11 — Secret Management Beyond Env Files | `backlog/sec11-secret-management-beyond-env-files.md` | — |
| ⬜ No sprint | Worker Init Timeout — Redundant Map Re-fetch on Join | `backlog/worker-init-timeout-map-refetch.md` | — |
| ⏸ Parked | Task 5 — Deep Mobile Rendering Optimization | None — see plan-index | Mobile DAU > 1,500 |
| ⏸ Parked | Task 2i — Microsoft Clarity Session Recordings | None — see plan-index | Mobile perf confirmed stable |

---

## Items

### Task 6 — Rewarded Ads: Minimal Version

**From plan-index:** Sprint 4 column, explicitly deferred — no reward mechanic exists until citizenship benefits give players something worth watching an ad for.

**Current state:** No brief written. Sprint 5 contains Task 11 (Coin Economy + Rewarded Ads Full Version). Decide whether Task 6 (minimal) is still needed as a separate milestone or rolls into Task 11 before assigning to a sprint.

---

### Task 7 — Leaderboard: Core System

**From plan-index:** Sprint 4 column, but never added to the Sprint 4 plan document. Sprint 5 Task 10 (Leaderboard Rewards Layer) depends on Task 7 being live first.

**Current state:** No brief written. Task 7 is a prerequisite for Sprint 5 Task 10. Assign and brief before Sprint 5 kicks off.

**Effort (from plan-index):** 1–2 weeks.

---

### Task 8b — Private Lobbies (Citizens Only)

**From plan-index:** Sprint 4 column, citizen-only feature. Not included in the Sprint 4 plan document.

**Current state:** No brief written. Depends on citizenship (Sprint 4) being live. Directly requested by players — creates a friend-invite conversion loop.

**Effort (from plan-index):** 1–2 weeks.

---

### Task 8c — Spectating (Citizens Only)

**From plan-index:** Sprint 4 column, citizen-only feature. Not included in the Sprint 4 plan document.

**Current state:** No brief written. Watch any live public match; zero match balance impact. Depends on citizenship (Sprint 4).

**Effort (from plan-index):** 1 week.

---

### Task 9 — Re-enable Flags

**From plan-index:** Sprint 4 column. Not included in the Sprint 4 plan document. Sprint 5 Task 8a (Nickname Styling) and Task 15 (Custom Flags) depend on this cosmetics foundation being live.

**Current state:** No brief written. The flags feature exists in the codebase but is disabled. Requires payment infrastructure from Sprint 4 to be live.

**Effort (from plan-index):** 1 week.

---

### Task 9a — Re-enable Territory Patterns

**From plan-index:** Sprint 4 column. Not included in the Sprint 4 plan document. Sprint 5 Task 15 (Custom Uploaded Patterns) depends on this being live.

**Current state:** No brief written. High-visibility cosmetic, upsell surface. Requires payment infrastructure from Sprint 4 to be live.

**Effort (from plan-index):** 1 week.

---

### Monitoring & Alert Bot — Phase 1 (Incident-Preventing Core)

**Brief:** `backlog/monitoring-alert-bot-phase1.md`

Proactive monitoring + Telegram alerting from the 2026-06-04 findings doc. The telemetry VPS
has frozen twice; the June outage went unnoticed for 2–3 weeks. Phase 1 delivers exactly the
signals that would have caught both outages: a free external dead-man's-switch heartbeat
(catches a fully frozen box — both VPS) and a telemetry-VPS on-box agent
(disk/RAM/swap/OOM/containers), plus the shared Telegram helper, Russia-proxy routing, and
the digest/dedup/recovery alert UX. Lightweight bash+cron+Telegram, wired through
`setup-telemetry.sh` / `deploy.sh`. Scope and architecture locked with Mark 2026-06-04.
**High-value ops item — recommend near-term scheduling on a weekend window**, ahead of most
current backlog features, because it protects the observability the whole stabilization
effort depends on.

---

### Monitoring & Alert Bot — Phase 2 (Depth & Hygiene)

**Brief:** `backlog/monitoring-alert-bot-phase2.md`

Builds on Phase 1's machinery (shared Telegram helper, on-box agent framework, alert state).
Extends the on-box agent to the game-server VPS, and adds slower-degradation hygiene:
ClickHouse `system.*_log` / file-log growth with *where-it-grew* attribution, TLS expiry +
certbot-success check, sustained CPU load, weekly-backup-job health, predictive disk-growth
trend, and a game-server availability heuristic. Schedule **after Phase 1 is deployed and
proven**.

---

### Mobile Memory and WebGL Rendering Failures

**Brief:** `backlog/mobile-webgl-rendering.md`

Deferred out of Sprint 4c on 2026-06-03. Low-memory devices and unsupported/unstable
graphics contexts produce uncaught rendering crashes (`getImageData`/`createImageData`
out-of-memory, WebGL context creation failures). Visible Uptrace rate is low (~0.4/min)
but likely under-counts real impact — crashing users generate no further events (silent
mobile abandonment). High complexity: needs profiling, device-specific testing, graceful
canvas/degraded-mode fallback, and device context in error logs. Schedule once mobile
crash/perf data is clearer. Related to the parked Task 5 (Deep Mobile Rendering
Optimization), which is gated on mobile DAU > 1,500.

---

### sec10 — Remove Password Deploy Fallbacks

**Brief:** `backlog/sec10-remove-password-deploy-fallbacks.md`

Security hardening follow-up from the VPS credential leak incident. Remove `sshpass`-based fallback logic and `ALLOW_SSH_PASSWORD_FALLBACK` flags from all deploy scripts. All supported flows must be SSH-key-only. Low risk, no player-facing impact.

---

### sec11 — Secret Management Beyond Env Files

**Brief:** `backlog/sec11-secret-management-beyond-env-files.md`

Security architecture follow-up from the VPS credential leak incident. Inventory secrets by type, choose a target secret-management approach for this team size, and migrate at least one class of secrets out of plaintext local env storage. Produces a documented model and rotation workflow.

---

### Worker Init Timeout — Redundant Map Re-fetch on Join

**Brief:** `backlog/worker-init-timeout-map-refetch.md` (investigation complete, not yet implemented — full root-cause analysis, file map, and acceptance criteria are there).

**Priority:** Medium (producer-confirmed). Not a prod-blocker on its own, but a real latent fragility on the client join path, and the proper fix removes a redundant ~5.6 MB map download on every match start, for every player.

A "Worker initialization timeout" error that stops a match from starting. Root cause: the game-logic Web Worker re-downloads the full map binary (~5.6 MB) from scratch during init, even though the main thread already downloaded the identical files milliseconds earlier during preload — and the worker has a hard **5-second** init timeout. On any connection where that map fetch exceeds 5 s, init fails and the match never starts.

It surfaced on the **dev box** (bare-IP host with an untrusted TLS cert): Chrome will not use its HTTP disk cache over a connection with certificate errors, so the worker's "re-fetch" is a full cold download (~20 s observed) instead of an instant cache hit. **Not expected to break prod** — `geoconflict.ru` has valid TLS and verified-working `.bin` caching, so the worker re-fetch is a cache hit and init completes well under 5 s. Local dev also works. The 5 s timeout predates the 0.0.135 release (it exists since the first fork commit) — this is a latent fragility, not a regression.

**Fix (per the brief):** lead with the **proper fix** — stop the worker re-downloading the map at all (transfer the already-loaded terrain buffers from the main thread into the worker), which also removes the redundant ~5.6 MB download and speeds up match start for every player, including on prod. Add the **cheap belt-and-suspenders fix** (raise the init timeout 5 s → 15 s; the brief traces this as regression-free) and, while in this code, fix a pre-existing worker leak (the init-failure catch never calls `worker.cleanup()`, leaving a timed-out worker running). All `src/core/` changes must be tested (project rule).

**Release-decision note:** does not justify pausing a prod release, but before shipping this, confirm the join flow on a **valid-TLS host** (prod domain or trusted-cert staging) rather than only the bare-IP dev box — that box is not representative for anything that depends on browser HTTP caching. Related to the completed lobby/map-fetch investigation (`tasks/done/s4c-investigate-lobby-map-fetch.md`), which independently verified prod TLS + cache health.

---

### Task 5 — Deep Mobile Rendering Optimization ⏸ Parked

**From plan-index:** Parked until mobile DAU > 1,500. Desktop is the core audience.

**Condition to unpark:** mobile DAU crosses 1,500 in analytics. Do not assign to a sprint until that signal appears.

---

### Task 2i — Microsoft Clarity Session Recordings ⏸ Parked

**From plan-index:** Deferred after Sprint 3 — only useful once mobile performance is confirmed stable.

**Condition to unpark:** mobile performance baseline confirmed stable in Sentry/analytics. Qualitative diagnostic tool, not a sprint priority on its own.
