# Geoconflict — Sprint Backlog

> Tasks that are defined and worth doing but not assigned to any currently planned sprint (Sprint 4, 5, or 6). Items here need a sprint home before implementation begins. Brief a task before picking it up — most have no implementation brief yet.

> ℹ️ **This board's `⬜ No sprint` status is a ratified board-level exception to the canonical status
> vocabulary — owner ruling 2026-09-08, given live in session.** It means *defined, worth doing, no
> sprint home*, which none of the canonical six can express. It is valid **here and nowhere else**:
> not in a task brief's `## Status` field (briefs on this board keep `🔲 Backlog` and record the
> no-sprint fact in their `## Sprint` field), and not on `plan-sprint-N.md` or `backlog.md`. Defined in
> [`task-status-vocabulary.md`](../knowledge-base/conventions/task-status-vocabulary.md), which is the
> single source of truth for status values.
>
> ⚠️ **`/fkit-status` does not render `⬜ No sprint`** — the dashboard knows the canonical set only, so
> **rows on this board are invisible to it.** Read this file directly.
>
> ℹ️ **`⏸ Parked` is the second ratified board-level exception — owner ruling 2026-09-08, given live in
> session** (same sweep, separate ruling). It means *deliberately not scheduled until a named external
> condition is met* — blocked on a **signal**, not on work, which is why `🚧 Blocked` (*started, cannot
> proceed*) is wrong for it. Same scope limit: valid **here and nowhere else**. 🚨 **A `⏸ Parked` row
> MUST state its unpark condition** — a park with no named condition cannot be told apart from an
> abandoned task. Also defined in
> [`task-status-vocabulary.md`](../knowledge-base/conventions/task-status-vocabulary.md).
>
> ⚠️ **Neither exception is rendered by `/fkit-status`**, so **every row on this board — all 25,
> including 23 open tasks — is invisible to the dashboard.** Read this file directly. (Referred to the
> architect 2026-09-08 as a tooling question; no change made here.)

---

## Status

| Status | Task | Brief | Depends On |
|---|---|---|---|
| ⬜ No sprint | Task 6 — Rewarded Ads: Minimal Version | None — see plan-index | Citizenship benefits (Sprint 4) |
| ⬜ No sprint | Task 7 — Leaderboard: Core System *(**briefed 2026-09-08 on an owner ruling** given live in session and relayed through the spawning session — the one unbriefed row on this board with a known downstream dependency. ⚠️ **Briefed as an INVESTIGATION, not implementation**: the source material is two lines in `plan-index.md` plus this board's own Items section, and six decisions that change what gets built are unmade. Not a duplicate of `0161` (done — player count in a label) or `0210` (Singleplayer platform-reporting policy) — both read and verified. **Status and priority unchanged; this schedules nothing.**)* | [`0234-leaderboard-core-system-definition`](../tasks/backlog/0234-leaderboard-core-system-definition/brief.md) | — |
| ⬜ No sprint | Task 8b — Private Lobbies (Citizens Only) | None — see plan-index | Citizenship (Sprint 4) |
| ⬜ No sprint | Task 8c — Spectating (Citizens Only) | None — see plan-index | Citizenship (Sprint 4) |
| ⬜ No sprint | Task 9 — Re-enable Flags | None — see plan-index | Payment infrastructure (Sprint 4) |
| ⬜ No sprint | Task 9a — Re-enable Territory Patterns | None — see plan-index | Payment infrastructure (Sprint 4) |
| ⬜ No sprint | Monitoring & Alert Bot — Phase 1 (Incident-Preventing Core) | [`0033-monitoring-alert-bot-phase1`](../tasks/backlog/0033-monitoring-alert-bot-phase1/brief.md) | — (recommend near-term, weekend deploy) |
| ⬜ No sprint | Monitoring & Alert Bot — Phase 2 (Depth & Hygiene) | [`0034-monitoring-alert-bot-phase2`](../tasks/backlog/0034-monitoring-alert-bot-phase2/brief.md) | Phase 1 deployed |
| ⬜ No sprint | Mobile Memory and WebGL Rendering Failures | [`0031-mobile-webgl-rendering`](../tasks/backlog/0031-mobile-webgl-rendering/brief.md) | Clearer mobile crash/perf data |
| ⬜ No sprint | sec10 — Remove Password Deploy Fallbacks | [`0015-remove-password-deploy-fallbacks`](../tasks/backlog/0015-remove-password-deploy-fallbacks/brief.md) | — |
| ⬜ No sprint | sec11 — Secret Management Beyond Env Files | [`0016-secret-management-beyond-env-files`](../tasks/backlog/0016-secret-management-beyond-env-files/brief.md) | — |
| ⬜ No sprint | sec12 — VPS Registry Credential Hygiene (scoped pull-only token, no persisted creds) | [`0045-vps-registry-credential-hygiene`](../tasks/backlog/0045-vps-registry-credential-hygiene/brief.md) | Release-adjacent (live profile box); pairs with sec13 |
| ⬜ No sprint | sec13 — Deploy Transport Secret Hygiene (telemetry EXIT-trap parity + remote env 0600) | [`0047-deploy-transport-secret-hygiene`](../tasks/backlog/0047-deploy-transport-secret-hygiene/brief.md) | — *(gate **satisfied**; corrected 2026-09-02)* |
| ⬜ No sprint | 152-ФЗ Personal-Data Compliance — Roskomnadzor Notification + Consent Flow *(deferred from Sprint 4 2026-06-28, risk accepted)* | [`0048-compliance-152fz-notification-consent`](../tasks/backlog/0048-compliance-152fz-notification-consent/brief.md) | Legal/lawyer-led; resolve before scaling |
| ⬜ No sprint | Worker Init Timeout — Redundant Map Re-fetch on Join | [`0035-worker-init-timeout-map-refetch`](../tasks/backlog/0035-worker-init-timeout-map-refetch/brief.md) | — |
| ⬜ No sprint | Bots: Stop Building SAM Launchers When Nukes Are Disabled | [`0036-bots-skip-sam-when-nukes-disabled`](../tasks/backlog/0036-bots-skip-sam-when-nukes-disabled/brief.md) | — |
| ⬜ No sprint | Bots/Nations: Effective Hydrogen-Bomb Use vs SAM Defenses (offset targeting) — investigation | [`0039-bots-hydrogen-bomb-sam-penetration-investigation`](../tasks/backlog/0039-bots-hydrogen-bomb-sam-penetration-investigation/brief.md) | — |
| ⬜ No sprint | Bots/Nations: Saturate SAM Defenses with Multi-Nuke Salvos — investigation + impl | [`0040-bots-nuke-saturation-sam-overwhelm`](../tasks/backlog/0040-bots-nuke-saturation-sam-overwhelm/brief.md) | Offset-targeting task (above) |
| ⬜ No sprint | Force "No Nukes" When the Infinite-Gold Weird Mode Is Applied (Public Rotation) | [`0044-infinite-gold-force-no-nukes-public-rotation`](../tasks/backlog/0044-infinite-gold-force-no-nukes-public-rotation/brief.md) | — |
| ⬜ No sprint | Remove Dead `initializeFuseTag` Polling Loop | [`0037-fix-fusetag-dead-polling-loop`](../tasks/backlog/0037-fix-fusetag-dead-polling-loop/brief.md) | — |
| ⬜ No sprint | Fix GutterAds Unsubscribing from `userMeResponse` After First `hide()` | [`0038-fix-gutterads-usermeresponse-unsubscribe`](../tasks/backlog/0038-fix-gutterads-usermeresponse-unsubscribe/brief.md) | — |
| ⏸ Parked | Task 5 — Deep Mobile Rendering Optimization | None — see plan-index | Mobile DAU > 1,500 |
| ⏸ Parked | Task 2i — Microsoft Clarity Session Recordings | None — see plan-index | Mobile perf confirmed stable |
| ⬜ No sprint | Fix Compact Map Shore Generation (Map Generator) *(**row added 2026-09-08 on an owner ruling given live in session and relayed through the spawning session.** 🚨 **This ruling SUPERSEDES a recorded 2026-08-14 reconciliation decision that deliberately did NOT add this row** — see [`plan-sprint-5.md`](plan-sprint-5.md) line 31, whose note is **deliberately kept** as the record of why the task was parked, now superseded rather than deleted. The brief was **board-invisible**: it appeared in no sprint file's table at all, so nothing rendered it and no status run could see it — the same class as `0022`, `0020` and `0028`. Its own `## Sprint` field reads `Sprint 5 — Backlog (high effort, requires full map regeneration)`, but `plan-sprint-5.md` carries no brief-linked rows and its scope statement excludes this task, so **this** board — "defined and worth doing but not assigned to any currently planned sprint" — is the accurate home. Handled the same way `0027` was for Sprint 6. ⚠️ **The brief's `Low` priority does NOT appear on this board**, which carries no Priority column; the rank lives in the brief. **Status, priority and dependencies are untouched — this is visibility only.** **Row appended, not inserted** (ADR-035); appending places it below the two `⏸ Parked` rows, which is position-by-append, not a grouping judgement)* | [`0026-fix-compact-map-shore-generation`](../tasks/backlog/0026-fix-compact-map-shore-generation/brief.md) | — *(the brief names nothing it waits on; its relationship to `0162-disable-compact-public-maps` is a **Blocks** fact, not a Depends on fact)* |
| ⬜ No sprint | In-Game Hint Display on Match-Start and Win Screens *(**row added 2026-09-08 on the same owner ruling, given live in session and relayed through the spawning session.** 🚨 **Same supersession:** the 2026-08-14 reconciliation deliberately did not add this row; that decision is overturned and [`plan-sprint-5.md`](plan-sprint-5.md) line 31 is **kept** as the superseded record. The brief was **board-invisible** — in no sprint file's table. Its `## Sprint` field reads `Sprint 5 — Backlog`, but `plan-sprint-5.md` has no brief-linked rows and excludes it from scope, so it is homed here. ⚠️ **The brief's `Medium` priority does NOT appear on this board** (no Priority column); the rank lives in the brief. **Status, priority and dependencies are untouched — visibility only.** **Row appended, not inserted** (ADR-035))* | [`0029-hint-videos-in-game`](../tasks/backlog/0029-hint-videos-in-game/brief.md) | `0028-content-hint-videos-production` having produced at least 3–4 clean hint assets before engineering begins |

---

## Items

### Task 6 — Rewarded Ads: Minimal Version

**From plan-index:** Sprint 4 column, explicitly deferred — no reward mechanic exists until citizenship benefits give players something worth watching an ad for.

**Current state:** No brief written. Sprint 5 contains Task 11 (Coin Economy + Rewarded Ads Full Version). Decide whether Task 6 (minimal) is still needed as a separate milestone or rolls into Task 11 before assigning to a sprint.

---

### Task 7 — Leaderboard: Core System

**From plan-index:** Sprint 4 column, but never added to the Sprint 4 plan document. Sprint 5 Task 10 (Leaderboard Rewards Layer) depends on Task 7 being live first.

**Current state:** ✅ **Briefed 2026-09-08** as
[`0234-leaderboard-core-system-definition`](../tasks/backlog/0234-leaderboard-core-system-definition/brief.md),
on an owner ruling. ⚠️ **Scoped as an investigation, not implementation** — the available source
material is `plan-index.md:90` plus this section, and six decisions that change what gets built (ranking
metric, scope, reset cadence, render surface, backing store, anti-cheat posture) are unmade. Task 7 is
still a prerequisite for Sprint 5 Task 10. ~~No brief written. Assign and brief before Sprint 5 kicks
off.~~

**Effort (from plan-index):** 1–2 weeks — ⚠️ that is the estimate for the **whole implementation**, not
for the investigation, and it predates every open question. Unvalidated.

**Not a duplicate** of `0161-leaderboard-player-count` (done — shows a human player count in a "Players
Only" label) or `0210-singleplayer-platform-leaderboard-reporting-policy` (a policy decision about the
existing **Yandex platform** leaderboard). Both were read and verified 2026-09-08; recorded so it is not
re-derived.

> ℹ️ **The other five live-but-unbriefed rows on this board — Task 6, Task 8b, Task 8c, Task 5, Task 2i
> — remain visible-but-unbriefed by the owner's explicit choice, 2026-09-08.** Only Task 7 was briefed,
> because only it has a known downstream dependency. This is a decision, not a gap.

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

**Brief:** `backlog/0033-monitoring-alert-bot-phase1/brief.md`

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

**Brief:** `backlog/0034-monitoring-alert-bot-phase2/brief.md`

Builds on Phase 1's machinery (shared Telegram helper, on-box agent framework, alert state).
Extends the on-box agent to the game-server VPS, and adds slower-degradation hygiene:
ClickHouse `system.*_log` / file-log growth with *where-it-grew* attribution, TLS expiry +
certbot-success check, sustained CPU load, weekly-backup-job health, predictive disk-growth
trend, and a game-server availability heuristic. Schedule **after Phase 1 is deployed and
proven**.

---

### Mobile Memory and WebGL Rendering Failures

**Brief:** `backlog/0031-mobile-webgl-rendering/brief.md`

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

**Brief:** `backlog/0015-remove-password-deploy-fallbacks/brief.md`

Security hardening follow-up from the VPS credential leak incident. Remove `sshpass`-based fallback logic and `ALLOW_SSH_PASSWORD_FALLBACK` flags from all deploy scripts. All supported flows must be SSH-key-only. Low risk, no player-facing impact.

---

### sec11 — Secret Management Beyond Env Files

**Brief:** `backlog/0016-secret-management-beyond-env-files/brief.md`

Security architecture follow-up from the VPS credential leak incident. Inventory secrets by type, choose a target secret-management approach for this team size, and migrate at least one class of secrets out of plaintext local env storage. Produces a documented model and rotation workflow.

---

### sec12 — VPS Registry Credential Hygiene

**Brief:** `backlog/0045-vps-registry-credential-hygiene/brief.md`

Security hardening follow-up, homed from finding **X2** in the `s4-profile-04e3` stateful-review (PR #121). `setup-profile.sh` runs `docker login --password-stdin` so `docker compose pull` can fetch the private image; the token is delivered securely (stdin, 0600 staged env, sourced + `rm`'d), **but there is no `docker logout` and no isolated `DOCKER_CONFIG`**, so the credential persists base64 in `/root/.docker/config.json` on a public box — and the runbook reuses the *game's* broad registry credentials, so a profile-VPS compromise could expose creds able to read/push unrelated production images. Fix: issue a **repository-scoped, pull-only** token for the VPS (or drop the login if the image is anonymously pullable), and run the pull under an isolated `DOCKER_CONFIG` or `docker logout` immediately after — applied repo-wide to the telemetry deploy too. **Hardening, not a regression** (the persistence was an accepted `s4-profile-04e2` design choice); it narrows blast radius. The more release-adjacent of the sec12/sec13 pair (it concerns the live public box). Sibling of `sec13` (deploy transport secret hygiene); architecture-level secret management → `sec11`.

---

### sec13 — Deploy Transport Secret Hygiene

**Brief:** `backlog/0047-deploy-transport-secret-hygiene/brief.md`

Security hardening follow-up (deploy transport), raised by the technical specialist + code-reviewer while reviewing `s4-profile-04g` (PR #125). Closes two transport-layer secret-exposure windows across both deploy pipelines: **(F-NEW-1)** `build-deploy-telemetry.sh` removes its 0600 secret env_file with an inline `rm` after the SCP, so a failed SCP under `set -e` leaves the plaintext secret on the dev host — give telemetry a single unconditional EXIT-trap cleanup mirroring profile's `finalize_deploy`; **(A2)** the remote staging env_file briefly holds scp-default perms before the in-session `chmod 600` — make it 0600 from creation in both the profile and telemetry scripts. Optional C2 parity: telemetry `StrictHostKeyChecking=no → accept-new`. **Low priority, post-release — NOT a citizenship/profile go-live blocker** (marginal exposure: `/root` is 0700 single-root and the secrets already live plaintext in `.env.*.secret` on the dev host). ~~Builds on T4g's transport code, so it lands after T4g (PR #125) merges~~ — 🔧 **CORRECTED 2026-09-02: that gate is ALREADY SATISFIED and this row's "After T4g (PR #125) merges" was stale.** Struck, not deleted, so the correction is auditable. Verified against the brief's own Notes (`ai-agents/tasks/backlog/0047-deploy-transport-secret-hygiene/brief.md:112-120`), which records that `T4g` resolves to the board task `0183-profile-04g-argv-concurrency-hardening` — title ends `(T4g)`, PR #125 — and that it is **already in `ai-agents/tasks/done/`**; the folder's presence there was re-checked on the same date. **Nothing open blocks this task.** The remaining "land alongside `sec12`" note is a coordination suggestion, **not** a prerequisite. Sibling of `sec12` (registry-credential hygiene).

---

### 152-ФЗ Personal-Data Compliance — Roskomnadzor Notification + Consent Flow

**Brief:** `backlog/0048-compliance-152fz-notification-consent/brief.md`

Investigation-first legal track (lawyer-led, like the cleared VAT task), **deferred out of Sprint 4 on 2026-06-28 with risk explicitly accepted by Mark.** Storing real Yandex IDs + display names in the profile store triggers 152-ФЗ: Roskomnadzor **operator notification** + a **consent flow** + privacy policy (residency already satisfied on the RU box). Sprint 4's first investigation concluded hashing the ID would avoid the obligation; that was **overturned** (hashing doesn't remove it) and the hashing task cancelled — so we're back to the original obligation, unresolved. **⚠️ Deferral means real PII is persisted in production before notification/consent exist — a conscious, accepted risk, not an oversight.** Carries forward the still-open **display-name** and **email-subscribe** (currently disabled) PII surfaces. Resolve before scaling / before significant real-PII volume. Findings → `personal-data-152fz-findings-v2.md` (v1 is invalidated).

---

### Worker Init Timeout — Redundant Map Re-fetch on Join

**Brief:** `backlog/0035-worker-init-timeout-map-refetch/brief.md` (investigation complete, not yet implemented — full root-cause analysis, file map, and acceptance criteria are there).

**Priority:** Medium (producer-confirmed). Not a prod-blocker on its own, but a real latent fragility on the client join path, and the proper fix removes a redundant ~5.6 MB map download on every match start, for every player.

A "Worker initialization timeout" error that stops a match from starting. Root cause: the game-logic Web Worker re-downloads the full map binary (~5.6 MB) from scratch during init, even though the main thread already downloaded the identical files milliseconds earlier during preload — and the worker has a hard **5-second** init timeout. On any connection where that map fetch exceeds 5 s, init fails and the match never starts.

It surfaced on the **dev box** (bare-IP host with an untrusted TLS cert): Chrome will not use its HTTP disk cache over a connection with certificate errors, so the worker's "re-fetch" is a full cold download (~20 s observed) instead of an instant cache hit. **Not expected to break prod** — `geoconflict.ru` has valid TLS and verified-working `.bin` caching, so the worker re-fetch is a cache hit and init completes well under 5 s. Local dev also works. The 5 s timeout predates the 0.0.135 release (it exists since the first fork commit) — this is a latent fragility, not a regression.

**Fix (per the brief):** lead with the **proper fix** — stop the worker re-downloading the map at all (transfer the already-loaded terrain buffers from the main thread into the worker), which also removes the redundant ~5.6 MB download and speeds up match start for every player, including on prod. Add the **cheap belt-and-suspenders fix** (raise the init timeout 5 s → 15 s; the brief traces this as regression-free) and, while in this code, fix a pre-existing worker leak (the init-failure catch never calls `worker.cleanup()`, leaving a timed-out worker running). All `src/core/` changes must be tested (project rule).

**Release-decision note:** does not justify pausing a prod release, but before shipping this, confirm the join flow on a **valid-TLS host** (prod domain or trusted-cert staging) rather than only the bare-IP dev box — that box is not representative for anything that depends on browser HTTP caching. Related to the completed lobby/map-fetch investigation (`tasks/done/0163-investigate-lobby-map-fetch/brief.md`), which independently verified prod TLS + cache health.

---

### Bots: Stop Building SAM Launchers When Nukes Are Disabled

**Brief:** `backlog/0036-bots-skip-sam-when-nukes-disabled/brief.md`

Player-reported (2026-06-11): in "no nukes" matches, bots still build SAM launchers — pure
wasted gold, since the modifier disables only `MissileSilo` and no nuke can ever exist.
Fix is a single condition in `FakeHumanExecution.handleUnits()`: skip the SAM spawn step when
silos are disabled; freed gold flows naturally to cities/ports/factories/defense posts via the
existing priority chain (locked: no multiplier rebalance). One change covers both nations and
AI Players. ~Half a day including required `src/core/` tests plus a live no-nukes match check.

---

### Bots/Nations: Effective Hydrogen-Bomb Use vs SAM Defenses (offset targeting)

**Brief:** `backlog/0039-bots-hydrogen-bomb-sam-penetration-investigation/brief.md` — **investigation-first.**

Bots/nations barely exploit hydrogen bombs and, when a target is ringed by SAM launchers, they
**avoid it entirely** instead of penetrating it. The mechanic supports the fix: SAM interception
range is **70** (`defaultSamRange`) while an H-bomb's total-destruction radius is **80** (inner)
/ 100 (outer) (`nukeMagnitudes`) — so detonating ~71–80 tiles from a SAM is outside interception
but still destroys the shielded buildings (the offset tactic). Two concrete defects in
`FakeHumanExecution.nukeTileScore` cause today's behaviour: (1) it scores damage in a hardcoded
25-tile radius regardless of nuke type, so H-bomb value is badly under-credited; (2) it subtracts
50k for any SAM within 50 tiles, so bots steer away from defended targets. The investigation must
confirm the exact interception condition (`SAMLauncherExecution`), design radius-aware scoring and
an offset-targeting algorithm (outside every covering SAM's range ∩ within H-bomb inner radius),
reconcile the mismatched search/scoring/blast radii, and recommend difficulty gating
(*recommend: AI Players + Hard/Impossible nations only*) and scope (*recommend: defer "save up for
an H-bomb" economy behaviour to a follow-up*). One change covers nations + AI Players (both run
`FakeHumanExecution`); adjacent to the SAM-skip task above. Requires `src/core/` tests **and** live
real-map validation (synthetic-map tests can pass while spatial targeting is wrong on real maps).
Rough: ~1 day investigation, ~2–3 days implementation.

---

### Bots/Nations: Saturate SAM Defenses with Multi-Nuke Salvos

**Brief:** `backlog/0040-bots-nuke-saturation-sam-overwhelm/brief.md` — **investigation + implementation.**
**Depends on** the offset-targeting task above (shared SAM mechanics + `FakeHumanExecution` refactor).

The second human anti-SAM tactic bots don't use: send multiple nukes one-by-one at a single
SAM-defended target to overwhelm its interception capacity. Confirmed mechanic — a SAM's missile
queue capacity equals its **level** (`UnitImpl.isInCooldown()` → `queue.length === level`), so a
level-N SAM intercepts N nukes and the **(N+1)th** penetrates while the rest reload (`SAMCooldown`);
level 1 → 2 nukes, level 2 → 3, as Mark described. Atom bombs are **always** intercepted
(`SAMLauncherExecution.isHit`), so a deterministic salvo of (level+1) atom bombs (750k each) is
often cheaper than one 5M H-bomb — the bot should pick the cheaper viable tactic vs. the offset
approach. Bots don't do it today because `maybeSendNuke` fires one nuke per decision and avoids SAM
areas. Kept **separate from** the offset task (Mark, 2026-06-13) but **depends on** it: reuse its SAM
findings + nuke-targeting refactor, then add coordinated-salvo logic (timing within the cooldown
window, launch-capacity needs, overlapping-SAM capacity, penetrator targeting). Open decisions:
defer the proactive "build/level silos to enable a salvo" economy behaviour to a follow-up
(*recommended*); difficulty gating consistent with the offset task (AI Players + Hard/Impossible).
Needs `src/core/` tests **and** live real-map validation. Rough: ~1 day investigation, ~2–4 days impl.

---

### Force "No Nukes" When the Infinite-Gold Weird Mode Is Applied (Public Rotation)

**Brief:** `backlog/0044-infinite-gold-force-no-nukes-public-rotation/brief.md`

Public match-quality fix, same pattern as the Sprint 4c compact-map removal. The Sprint 4b
weird-setting modifier system applies a random rule-set override to ~20% of public matches; one of
its four sub-options is infinite gold (`infiniteGold: true`), which removes the core economic
constraint and collapses the dominant tactic into nuke-spam. Rather than remove the mode, **keep it
but also disable nukes when it is applied** (redirected 2026-06-20, Mark) — so the unlimited-economy
novelty stays but the nuke-rush degeneracy is gone. Fix is one line in `src/server/MapPlaylist.ts` —
the infinite-gold entry in `WEIRD_SETTING_OPTIONS` becomes
`() => ({ infiniteGold: true, disabledUnits: [UnitType.MissileSilo] })`, reusing the exact mechanism
the existing "No nukes" option already uses — plus a `tests/server/MapPlaylist.test.ts` update
(still four options; assert infinite gold now also disables nukes). Total weird rate stays 20% across
four options (no redistribution). Optional client label tweak so the badge signals nukes-off (en/ru
in sync). ~Half a day. Originally drafted under Sprint 4c but moved here 2026-06-12 to keep 4c
historically frozen — needs a sprint home before implementation. Safe weekend deploy.

---

### Remove Dead `initializeFuseTag` Polling Loop

**Brief:** `backlog/0037-fix-fusetag-dead-polling-loop/brief.md`

Side bug found during the app-bootstrap investigation (findings doc §2.6 item 1), independent of
the bootstrap refactor. `Main.ts:950-970` starts a 100ms `setInterval` that waits for
`window.fusetag` before clearing itself — but the Publift/Fuse ad script is commented out in
**both** HTML templates, so `window.fusetag` never exists and the timer runs forever in every
session. Fuse ads are intentionally disabled, so the fix is to remove the dead init call
(`Main.ts:545`) and method. `src/client/` only, ~30 min. One decision flag: confirm ads stay
disabled (vs. a separate deliberate task to re-enable Publift). Safe weekend deploy.

---

### Fix GutterAds Unsubscribing from `userMeResponse` After First `hide()`

**Brief:** `backlog/0038-fix-gutterads-usermeresponse-unsubscribe/brief.md`

Side bug found during the app-bootstrap investigation (findings doc §2.6 item 2), independent of
the bootstrap refactor. `GutterAds` subscribes to `userMeResponse` in `connectedCallback`, but
`hide()` (`GutterAds.ts:77-86`) calls `removeEventListener` — and `hide()` runs on every game
start / lobby leave while the element stays connected. Since `connectedCallback` doesn't re-run,
the element permanently stops reacting to login-state changes after the first `hide()`. Fix:
move listener removal out of `hide()` and into `disconnectedCallback` so the subscription tracks
connect/disconnect, not show/hide. `src/client/GutterAds.ts` only, ~1 hour. The broader
`userMeResponse` fire-once/no-replay concern (§2.6 item 4) is out of scope — revisit after the
bootstrap task lands.

---

### Task 5 — Deep Mobile Rendering Optimization ⏸ Parked

**From plan-index:** Parked until mobile DAU > 1,500. Desktop is the core audience.

**Condition to unpark:** mobile DAU crosses 1,500 in analytics. Do not assign to a sprint until that signal appears.

---

### Task 2i — Microsoft Clarity Session Recordings ⏸ Parked

**From plan-index:** Deferred after Sprint 3 — only useful once mobile performance is confirmed stable.

**Condition to unpark:** mobile performance baseline confirmed stable in Sentry/analytics. Qualitative diagnostic tool, not a sprint priority on its own.

---

### Fix Compact Map Shore Generation (Map Generator)

**Brief:** `backlog/0026-fix-compact-map-shore-generation/brief.md`

Compact maps (`map4x.bin`) lose `isShore` / `isOceanShore` designations for coastal tiles during the
half-resolution downsampling step in the Go map generator, so tiles that clearly touch water in the
full-resolution map have no water-adjacent neighbour in the compact binary.

**Why it is here and not on Sprint 5:** the brief's `## Sprint` field reads *"Sprint 5 — Backlog (high
effort, requires full map regeneration)"*, but `plan-sprint-5.md` carries no brief-linked rows and its
scope statement explicitly excludes this task. This board is the accurate home.

**Depends on:** nothing — the brief names no task it waits on. It is the **prerequisite for** ever
re-enabling compact maps in public matchmaking (`0162-disable-compact-public-maps` pulled them on
2026-06-03; the runtime fallback `0160-fix-compact-map-boat-attack` was cancelled 2026-06-02 because
the data the compact binary destroyed cannot be reconstructed at runtime). That is a **Blocks** fact,
not a Depends on fact.

**Section added 2026-09-08** alongside the table row, on the owner ruling recorded in that row. Content
is derived from the brief; no status, priority or dependency was changed.

---

### In-Game Hint Display on Match-Start and Win Screens

**Brief:** `backlog/0029-hint-videos-in-game/brief.md`

Show the short educational hint clips produced by `0028-content-hint-videos-production` inside the game
— on the game-starting modal and the win screen — as a silent, randomly selected hint with a short text
caption. Both target screens already follow the same LitElement `@customElement` pattern.

**Why it is here and not on Sprint 5:** same reason as the task above — the brief declares Sprint 5, but
`plan-sprint-5.md` has no brief-linked rows and excludes it from scope.

**Depends on:** `0028-content-hint-videos-production` having produced at least 3–4 clean hint assets
before engineering begins.

**Section added 2026-09-08** alongside the table row, on the owner ruling recorded in that row. Content
is derived from the brief; no status, priority or dependency was changed.
