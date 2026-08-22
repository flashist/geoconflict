# Geoconflict — Sprint 4 — In-App Monetization & Citizenship

> See [plan-index.md](plan-index.md) for strategic logic, experiments policy, and full priority table.

---

## Sprint 4 Goal

Launch the citizenship system and in-app purchase foundation. Give loyal players a visible long-term goal (1,000 XP, earned at 10 XP per qualifying match), a direct purchase path (99 rubles), and the first meaningful citizenship benefit (name change). Establish the payment infrastructure and player profile store that all future monetization builds on.

**Rewarded ads are explicitly deferred** — no reward mechanic exists yet. Rewarded ads ship in Sprint 5 once citizenship benefits give players something worth watching an ad for.

---

## Status

> Reconciled 2026-08-14 to the canonical status vocabulary and table shape (task `0004` scope, owner-ruled).
> The Priority column is `—` where the plan never ranked the row. Done/cancelled briefs are still the
> pre-migration flat files (folder migration is task `0003`) — the dashboard reports their location as
> drift until `0003` runs; that is expected. `⚠️ Urgent` on the Yandex Catalog row is a non-canonical
> marker awaiting an owner ruling (see task `0004`), left unconverted on purpose.

| Status | Priority | Task | Brief |
|---|---|---|---|
| ✅ Done | — | Investigation A — Player Profile Store | [`sprint4-investigation-player-store.md`](../tasks/done/sprint4-investigation-player-store.md) |
| ✅ Done | — | Investigation B — Yandex Payments Catalog | [`sprint4-investigation-yandex-payments.md`](../tasks/done/sprint4-investigation-yandex-payments.md) |
| ✅ Done | — | 8d-A. Global Announcements Re-enable | [`8d-a-task-global-announcements.md`](../tasks/done/8d-a-task-global-announcements.md) |
| 🚧 Blocked — awaiting Yandex catalog approval | — | Yandex Catalog Registration (manual, non-engineering; owner-ruled 2026-08-14: was `⚠️ Urgent`, urgency is not a status) | [`0014-yandex-catalog-registration`](../tasks/backlog/0014-yandex-catalog-registration/brief.md) |
| ✅ Done | — | Solo Mode: Opponent Win Condition Not Triggering Loss | [`s4-solo-win-condition-fix.md`](../tasks/done/s4-solo-win-condition-fix.md) |
| ✅ Done | — | Fix: Space Key Blocked in Feedback Modal During Match | [`s4-feedback-modal-space-key.md`](../tasks/done/s4-feedback-modal-space-key.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Feedback Popup: Remove Email/Contact Field *(152-ФЗ data minimization; client + server + en/ru)* | [`0046-feedback-remove-contact-field`](../tasks/done/0046-feedback-remove-contact-field/brief.md) |
| ✅ Done | — | Investigation — Missions Mode Difficulty Curve | [`s4-missions-difficulty-investigation.md`](../tasks/done/s4-missions-difficulty-investigation.md) |
| ✅ Done | — | Nuke Pre-Launch Trajectory: Increase Line Thickness | [`s4-nuke-trajectory-visibility.md`](../tasks/done/s4-nuke-trajectory-visibility.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Map Labels: Show Troops/Max + Attacking Troops *(live-validated singleplayer only — multiplayer parity, exact-zero case, dark-territory legibility not demonstrated live)* | [`0041-map-population-army-labels`](../tasks/done/0041-map-population-army-labels/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Public Modifier: Add "5M Starting Gold" *(standalone variety modifier; decoupled from infinite-gold task 2026-06-20)* | [`0042-starting-gold-public-modifier`](../tasks/done/0042-starting-gold-public-modifier/brief.md) |
| ✅ Done | — | Teams Mode: Cap Maximum Teams at 4 | [`s4-teams-mode-max-teams.md`](../tasks/done/s4-teams-mode-max-teams.md) |
| ✅ Done | — | Start Screen Redesign — Tab Layout Investigation (design) | [`s4-start-screen-redesign-investigation.md`](../tasks/done/s4-start-screen-redesign-investigation.md) |
| ✅ Done | — | Start Screen Redesign — Implementation | [`s4-start-screen-redesign-impl.md`](../tasks/done/s4-start-screen-redesign-impl.md) |
| ✅ Done | — | App Bootstrap — Single Explicit Entry Point *(client boot-path refactor)* | [`s4-app-bootstrap-single-entry-point.md`](../tasks/done/s4-app-bootstrap-single-entry-point.md) |
| 🔄 In progress | — | Player Profile Store — Implementation *(epic; T1 ✅, T3 ✅; T2+T7 ⛔ cancelled 2026-06-13 — guest-first dropped, now authenticated-only; T4 ✅ complete + T5 ✅ done 2026-06-24 (box live at api.geoconflict.ru; profile DB+API PR #126); T6 ✅; T8 ✅ — all slices complete)* | [`0013-player-profile-store-impl`](../tasks/backlog/0013-player-profile-store-impl/brief.md) |
| ✅ Done | — | PostgreSQL Backup Routine (Profile Store) — off-box, daily *(must be live before Paid Citizenship)* | [`s4-postgres-backup-routine.md`](../tasks/done/s4-postgres-backup-routine.md) |
| ✅ Done | — | Personal-Data Compliance (152-ФЗ) — Investigation *(conclusion OVERTURNED 2026-06-28: hashing doesn't remove the obligation. 152-ФЗ work **deferred to backlog** → `0048-compliance-152fz-notification-consent`, risk accepted; no longer gates Sprint 4.)* | [`s4-personal-data-compliance-investigation.md`](../tasks/done/s4-personal-data-compliance-investigation.md) |
| ⛔ Cancelled (2026-06-28) — hashing does not remove the 152-ФЗ obligation; PR #127 reverted | — | Profile Store: Pseudonymize Player Identity — store an irreversible hash, not the raw Yandex ID *(152-ФЗ deferred to backlog → `0048-compliance-152fz-notification-consent`, risk accepted)* | [`s4-profile-hash-player-ids.md`](../tasks/cancelled/s4-profile-hash-player-ids.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Yandex Payments — Catalog Fetch & Purchase Infrastructure | [`0019-yandex-payments-impl`](../tasks/done/0019-yandex-payments-impl/brief.md) |
| ✅ Done | — | Citizenship Core — XP Counter & Progress UI | [`s4-citizenship-xp-progress-ui.md`](../tasks/done/s4-citizenship-xp-progress-ui.md) |
| ✅ Done | — | Citizenship Card: Login CTA Is a Dead Button Outside a Yandex Context | [`s4-citizenship-card-guest-cta-no-sdk.md`](../tasks/done/s4-citizenship-card-guest-cta-no-sdk.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Degraded-Mode UX: Give Yandex SDK Timeout/Failure Its Own Player-Facing Treatment *(moved in from Sprint backlog 2026-07-02 — Mark: must ship before Citizenship Earned/Paid go live)* | [`0049-degraded-mode-full-ux-treatment`](../tasks/done/0049-degraded-mode-full-ux-treatment/brief.md) |
| 🔲 Backlog | — | Citizenship Core — Earned Citizenship *(blocked: player profile store; also gated on degraded-mode UX task above)* | [`0017-citizenship-earned`](../tasks/backlog/0017-citizenship-earned/brief.md) |
| 🔲 Backlog | — | Citizenship Core — Paid Citizenship *(blocked: payments + catalog approval; also gated on degraded-mode UX task above)* | [`0018-citizenship-paid`](../tasks/backlog/0018-citizenship-paid/brief.md) |
| 🔲 Backlog | — | 8d-B. Personal Inbox *(blocked: player profile store)* | [`0012-personal-inbox`](../tasks/backlog/0012-personal-inbox/brief.md) |
| 🔲 Backlog | — | S3-Backed Match Archival (Citizen-Gated) *(blocked: player profile store + citizenship + S3 infra)* | [`0030-archive-s3-backed-citizen-gated`](../tasks/backlog/0030-archive-s3-backed-citizen-gated/brief.md) |
| 🔲 Backlog | — | Investigate & Fix Client Null-ID Errors *(stabilization follow-up; needs source maps + deployed archive fix)* | [`0032-investigate-null-id-errors`](../tasks/backlog/0032-investigate-null-id-errors/brief.md) |
| 🔲 Backlog | — | Name Change (Citizens Only) | TBD |
| 🔲 Backlog | — | Citizen Verified Icon | TBD |
| ⛔ Cancelled (2026-04-21) — created too many bugs; cancelled forever, though a similar task might return someday (owner-supplied reason, 2026-08-14) | — | Humans vs Nations — Balance Nation Count *(date recovered from plan edit `e7e1b12`)* | [`s4-nations-balance-task.md`](../tasks/cancelled/s4-nations-balance-task.md) |
| ✅ Done | — | AI Lobby Slot Bug — Always Keep One Slot Free | [`s4-ai-lobby-slot-bug.md`](../tasks/done/s4-ai-lobby-slot-bug.md) |
| 🔲 Backlog | — | Asset audit: confirm no proprietary/CDN assets in production bundle *(prerequisite: paid citizenship)* | [`0025-licensing-asset-audit`](../tasks/backlog/0025-licensing-asset-audit/brief.md) |
| ⛔ Cancelled (2026-04-18) — created too many implementation problems | — | Tutorial — Pause During Action-Required Steps | [`s4-tutorial-action-pause.md`](../tasks/cancelled/s4-tutorial-action-pause.md) |
| ✅ Done | — | Tutorial — Remove Nations, Keep Only Bots | [`s4-tutorial-no-nations.md`](../tasks/done/s4-tutorial-no-nations.md) |
| ✅ Done | — | Tutorial — Lock Build Menu to City During Tooltip 5 | [`s4-tutorial-build-menu-lock.md`](../tasks/done/s4-tutorial-build-menu-lock.md) |
| ✅ Done | — | Tutorial — Reduce Bot Count from 400 to 100 | [`s4-tutorial-reduce-bots.md`](../tasks/done/s4-tutorial-reduce-bots.md) |
| ✅ Done | — | Email Subscription Modal | [`s4-email-subscribe-task.md`](../tasks/done/s4-email-subscribe-task.md) |
| ✅ Done | — | Telegram Channel Link (start screen, game-end screen) | [`s4-telegram-link.md`](../tasks/done/s4-telegram-link.md) |
| ✅ Done | — | VK Channel Link (start screen, game-end screen) | [`s4-vk-link.md`](../tasks/done/s4-vk-link.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Hide Citizenship Card on Start Screen Behind a Client Config Flag (Default OFF) *(interim until 0017/0018 ship; flag flips ON at citizenship launch)* | [`0054-hide-citizenship-card-behind-client-flag`](../tasks/done/0054-hide-citizenship-card-behind-client-flag/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | `Master.ts`: Serve a Parseable Lobbies Body, and Log Why a Worker Died *(2026-08-22 outage — the unblocked half. First-ever test coverage of `Master.ts`. ⚠️ **Not committed, not deployed** — verified locally and by review only. ⚠️ Codex review coverage was **partial**: findings on the test file only, no opinion on `Master.ts` itself)* | [`0055-master-parseable-lobbies-body-and-worker-exit-diagnostics`](../tasks/done/0055-master-parseable-lobbies-body-and-worker-exit-diagnostics/brief.md) |
| 🔲 Backlog | — | Investigation — Public-Game Routing Can Send Games to a Dead or Unready Worker *(architect-led; **runs BEFORE `0056`** — owner-ruled 2026-08-22; promoted in from the Backlog board the same day)* | [`0057-investigate-worker-routing-to-dead-or-unready-workers`](../tasks/backlog/0057-investigate-worker-routing-to-dead-or-unready-workers/brief.md) |
| 🔲 Backlog | — | Restore Worker Crash Recovery — With a Restart Cap — and Make the Scheduling Gate Survivable *(2026-08-22 outage root-cause fix. **Both owner decisions RULED 2026-08-22** — gate quorum **18 of 20 with a 90 s deadline**; restart cap **5 per worker index per 10-min window, backoff 1s→30s**, then give up and log at error level. ⚠️ Arms worker restarts for the first time in project history — the cap MUST ship in the same change or a repeatedly-crashing worker becomes a fork loop. **Starts after `0057`'s findings.**)* | [`0056-restore-worker-crash-recovery-and-survivable-scheduling-gate`](../tasks/backlog/0056-restore-worker-crash-recovery-and-survivable-scheduling-gate/brief.md) |

> **Addendum — tasks 0055 and 0056 added out of band (2026-08-22), production incident.**
> On 2026-08-22 production lost **all** public multiplayer lobbies for ~3.5 hours. Service was
> recovered by a container restart, but **the root-cause defects are still unfixed in `main` and
> production is running right now with crash recovery disarmed.** Root cause: `src/server/Master.ts`
> reads `worker.process.env.WORKER_ID` in its `cluster.on("exit")` handler, but a Node `ChildProcess`
> has no `.env` property, so the value is always `undefined` and **no worker has ever been restarted
> after a crash** — a defect dating to the repository's first commit (`feea527`), **not** caused by the
> 2026-08-22 deploy. One of 20 workers died at startup; the scheduling gate requires all 20 ready;
> scheduling never started; `/api/public_lobbies` served an empty body until restart. Full record:
> [`incidents/2026-08-22-prod-public-lobbies-empty-outage.md`](../knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md).
> Split into two units on purpose: `0055` is unblocked and ships immediately; `0056` carried both owner
> decisions and the fork-loop risk. Two further follow-ups — `0058` (`Worker.ts` missing
> `server.on("error")`) and `0059` (precompile the server for prod instead of `ts-node/esm`) — sit on
> the **Backlog** board: neither is needed to restore crash recovery. This sprint's Status board is
> unranked, so all three Priority cells read `—` like every other row; no rank was assigned or
> displaced.
>
> **Update, same day — owner rulings and one promotion.** The owner ruled both of `0056`'s blocking
> decisions, so **`0056` moved from `🚧 Blocked` to `🔲 Backlog`**: the readiness gate starts scheduling
> at a quorum of **18 of 20** workers or a **90-second** deadline, whichever comes first; a crashed
> worker is restarted at most **5 times per index per rolling 10-minute window** with exponential
> backoff **1s → 30s**, after which the master gives up on that index and logs at `error` level. The
> fork-loop warning in `0056`'s brief is retained and reworded from an open risk into required
> behaviour — a build that arms restarts without the cap is not a shippable increment.
> The owner also ruled the **ordering: `0057` runs before `0056`**, because quorum size sets the
> misroute rate and the findings are most useful while 18/20 is committed but not yet built.
> `0057` was therefore **promoted from the Backlog board into this sprint** (producer call): a hard
> dependency of a Sprint 4 task belongs on the sprint board, or the blocker is invisible where the
> sprint is read. Outage-track execution order is **`0055` → `0057` → `0056`**; `0055` was independent
> of the other two.
>
> **Update — `0055` closed 2026-08-22, agent-closed.** Implemented, reviewed and review-closed
> (`review.md` `Status: closed-out`; round 1, 2 low defects fixed, 2 frontier-moves accepted as
> residuals by owner ruling). `src/server/Master.ts` only, `+28/−8`; new `tests/server/Master.test.ts`
> is the **first-ever test coverage of `Master.ts`**, 3/3 passing with prove-red confirmed; full suite
> 89 suites / 701 tests green, eslint and `tsc --noEmit` clean. ⚠️ **Closed without owner verification
> and without deployment** — verified locally and by review only, **not committed, not deployed**, so
> the production fix for the empty-body symptom is written but *not yet live*. ⚠️ **Codex review
> coverage was partial**: it returned findings on the test file only and gave no opinion on
> `Master.ts` itself, so the adversarial pass over the changed source did not effectively happen.
> Remaining outage-track order is **`0057` → `0056`**.
>
> ⚠️ **Still open, deliberately unanswered:** four findings from §9 of the incident record — prod
> Telegram feedback delivery broken, short container log retention, `PROFILE_INTERNAL_TOKEN` not
> forwarded by `deploy.sh`, and prod `/api/env` advertising `http` + a raw IP. **No briefs were written
> for these and no decision has been inferred from the silence.** They are unrelated to the outage and
> await an owner ruling on whether they get briefs at all.

> **Addendum — task 0054 added out of band (2026-08-21).** Owner-requested interim fix: the production
> start screen shows the citizenship card in its 0049 degraded "couldn't connect" state while citizenship
> (0017/0018) has not shipped. Owner ruled the mechanism (client config flag, default OFF; rejected
> hard-hide and show-only-when-backend-up) and the timing (ship now). This sprint's Status board is
> unranked, so the Priority cell reads `—` like every other row — no rank was assigned or displaced.

---

## Sprint Structure

Sprint 4 runs in two phases:

**Phase 1 — Investigations (start immediately, run in parallel)**
Two investigation tasks produce findings before implementation begins. 8d-A (global announcements) runs in parallel — it has no dependencies.

**Phase 2 — Implementation (after investigation findings reviewed)**
Full implementation scope locked in based on findings. Briefs written at that point.

---

## Phase 1 — Investigations

### Investigation A — Player Profile Store
**Effort:** 1–2 days
**Brief:** `sprint4-investigation-player-store.md` (in `tasks/done/`)
**Blocks:** all citizenship implementation tasks

First persistent per-player database in the codebase. Findings needed on: database technology, hosting location, initial schema, match completion tracking approach, and guest player handling.

---

### Investigation B — Yandex Payments Catalog Integration
**Effort:** 1 day
**Brief:** `sprint4-investigation-yandex-payments.md` (in `tasks/done/`)
**Blocks:** all purchase UI tasks

Findings needed on: Yandex payments SDK API, catalog fetch architecture, dashboard setup requirements and approval timeline, purchase-to-server notification approach.

**Action required immediately:** register catalog items in the Yandex Games dashboard as soon as possible — approval can take several days:
- Citizenship: 99 rubles
- (Cosmetics at 149–199 rubles — Sprint 5, but register early)

---

## Phase 1 — Independent Tasks (no investigation dependency)

### 8d-A. Global Announcements Re-enable
**Effort:** half a day
**Brief:** `8d-a-task-global-announcements.md` (in `tasks/done/`)
**Status:** Pending

Re-enable the existing OpenFront announcements feature. JSON-driven content, no backend. Provides the communication channel to announce citizenship before it launches. Ship early in Sprint 4 with seed content announcing citizenship is coming.

---

## Phase 2 — Implementation

> **Briefs to be written after investigation findings are reviewed.**
> The tasks below are the confirmed scope — details and effort estimates will be added once findings are in.

### App Bootstrap — Single Explicit Entry Point
**Brief:** `s4-app-bootstrap-single-entry-point.md`
**Design doc (authoritative):** `ai-agents/knowledge-base/app-bootstrap-single-entry-point-findings-and-plan.md`

Client-side refactor giving the app one explicit bootstrap sequence: all external-SDK / experiment-flag / user-data / language init finishes *before* any component code runs, with a bounded wait (~5s) and a degraded-mode failure policy. Replaces today's emergent, race-prone init order (driven by webpack import order + custom-element upgrade timing + a lazy `FlashistFacade` singleton). `src/client/` only — no `src/core/` changes. Investigation complete and design agreed with Mark 2026-06-12 (degraded mode, two-part facade init, one PR).

**Foundational for this sprint's SDK work** (citizenship auth, Yandex payments) — it removes the race-condition class those integrations would keep hitting. **Sequence before / with `s4-citizenship-xp-progress-ui`** — that task binds live data into `CitizenshipCard`, which currently carries its own copy of the init gate that this refactor removes.

Production-risk: touches the prod Yandex-iframe boot path — weekend deploy, live Yandex-iframe verification required. New degraded-mode analytics event must be wired during implementation. Discovered side bugs (dead fuse-tag timer, GutterAds unsubscribe) are tracked as separate tasks, not bundled here.

---

### Player Profile Store — Implementation
Implement the database and schema recommended by Investigation A. Foundation for all citizenship and purchase tasks.

**Status: 🔄 In Progress.** Originally 8 child slices (T1–T8); on 2026-06-19 the monolithic **T4 was reverted (PR #112) and re-decomposed into 9 ops sub-slices (T4a–T4i)** — see the slice tables in `0013-player-profile-store-impl` and `s4-profile-04-backend-infra.md`. **T4 is complete (T4a–T4i all done as of 2026-06-24) — the profile box is live at `api.geoconflict.ru` (200/TLS) — and T5 (DB + API) is done & merged (PR #126).** With T2 and T7 cancelled, the live path is the backend track (T3 ✅ → T4 ✅ → T5 ✅ → T6 ✅ → T8); T6 (match-end crediting) is done — T8 (backups) is now next.
- ✅ **T1 — Schema Contract** (`s4-profile-01-schema-contract.md`) — shared `PlayerProfile` type + pure `migrateProfile()`, done & moved to `done/`. `src/core/profile/PlayerProfile.ts` is kept (it is *not* part of the reverted T2 work). Two boundary notes from its review: (1) `xp` is validated only as a nonnegative int up to `MAX_SAFE_INTEGER` — the persist path (T5) must clamp/reject against the chosen DB column max; (2) the migrate body is untrusted shape-only validation — paid/citizenship fields must be force-cleared/recomputed at the trust boundary in T5, not trusted from the contract.
- ⛔ **T2 — Guest localStorage** — **cancelled 2026-06-13** (Mark); work reverted manually. Report: `ai-agents/knowledge-base/s4-profile-02-guest-localstorage-cancellation-2026-06-13.md`. A client-only, localStorage-authoritative guest-XP store has too much inherent edge surface (idempotency, multi-tab races, partial-write atomicity, platform-auth timing, "eliminated counts" semantics) — four review rounds hardened those and the scope outgrew the intended small client slice. **Steer:** redo guest-XP as a thin best-effort client cache **with/after T5/T6** so the server is the source of truth; carry forward the `MatchQualification.ts` shared-predicate idea into T5/T6 to prevent client/server drift. Net interim baseline: **no one earns profile XP until T5/T6 land** (the only crediting path was this store) — authenticated users and the Yandex leaderboard are unaffected.
- ✅ **T3 — Yandex Identity** (`s4-profile-03-yandex-identity.md`) — verified Yandex identity plumbing on the join/auth path (Part A), done & moved to `done/` (PR #111).
- ✅ **T4 — Backend Infra** — the monolithic T4 (`s4-profile-04-backend-infra.md`, PR #112) was **reverted** and re-decomposed into 9 ops sub-slices on 2026-06-19. **T4a–T4i all done — T4 complete; the box is live at `api.geoconflict.ru`.** The parent `s4-profile-04-backend-infra.md` is retained as the T4 overview:
  - ✅ **T4a — Server skeleton** (PR #115) — Express `/health` skeleton in `src/profile-server/`.
  - ✅ **T4b — Client API-URL config** (PR #116) — `PROFILE_API_URL` via `/api/env`.
  - ✅ **T4c — Dockerfile** (PR #117) — image runs the T4a skeleton.
  - ✅ **T4d — VPS provisioning + DNS** (PR #118) — provisioning *code* (the live box bring-up is T4i).
  - ✅ **T4e — Deploy mechanics** (PR #119/#120/#121) — `setup-profile.sh` + `build-deploy-profile.sh` + compose (split into T4e1/e2/e3).
  - ✅ **T4f — Image secret scan** (PR #123, #124) — build-context secret-leak gate.
  - ✅ **T4g — argv/concurrency hardening** (PR #125) — argv-safety + concurrency lock + atomic deploy record + deploy-target preflight.
  - ✅ **T4h — Game-server deploy env** (`s4-profile-04h-game-server-deploy-env.md`) — game-server `deploy.sh` now propagates `PROFILE_API_URL` into the container (was `""` in prod without it). *Was the runtime gate for T6 + the Citizenship UI.*
  - ✅ **T4i — Operator bring-up runbook** (`s4-profile-04i-server-bring-up-runbook.md`) — box provisioned, DNS pointed, merged deploy run, **200/TLS verified — `api.geoconflict.ru` is live.**
- ⛔ **T7 — Guest→authenticated migration — cancelled 2026-06-13** (Mark), moved to `cancelled/`. With both T2 and T7 gone, the guest-first story (pre-login XP accumulation + migrate-on-login) is dropped: **profile XP is now authenticated-only** — only logged-in Yandex users accrue XP toward citizenship, server-side via T5/T6. Guests still get the locked citizenship card + login prompt (Part G, via T3), just no pre-login XP to carry over. **T5 migration API dropped (decision 2026-06-13):** the `POST /v1/profile/migrate` endpoint and its untrusted-body hardening existed *for* T7 — with no client→server upload, they were **removed** from T5, which is now fresh-profile-create + server-side crediting only. Reviving guest-XP would require re-adding them (recorded on the cancelled T2/T7 files). The guest-XP feature (both slices) can return later as one thin server-authoritative cache; deferred verification: epic #1 (guest XP increments), #2/#3 (migration), local half of #5.

---

### Yandex Payments — Catalog Fetch & Caching
Implement the catalog fetch at session start, caching, and graceful failure handling recommended by Investigation B. All purchase UI depends on this.

---

### Citizenship Core — Match Counter & Progress UI
Track qualifying matches server-side as XP toward the 1,000 XP citizenship threshold. Progress visible to authorized players in the UI. Guest players see no progress UI.

**Qualifying match definition:**
- ✅ Counts: eliminated by another player or bot, survived to match end (any outcome)
- ❌ Does not count: voluntary Leave mid-match, disconnect without return, never spawned

---

### Citizenship Core — Earned Citizenship
When a player reaches 1,000 XP: flip `isCitizen = true`, send personal inbox message ("You've earned Geoconflict Citizenship!"), show real-time in-game notification.

---

### Citizenship Core — Paid Citizenship
Purchase path via Yandex catalog. 99 rubles. On successful purchase: flip `isCitizen = true` and `isPaidCitizen = true`, send personal inbox message. UI only shown if citizenship item exists in Yandex catalog response.

---

### 8d-B. Personal Inbox
**Brief:** `0012-personal-inbox`
Direct messages from game to citizens. Personal tab in announcements popup. Messages stored server-side. Initial triggers: citizenship earned/purchased, name change approved/rejected.

**Depends on:** 8d-A live, player profile store live

---

### Investigate & Fix Client Null-ID Errors
**Brief:** `0032-investigate-null-id-errors`
**Depends on:** source maps live (`s4c-enable-client-source-maps.md`) + archive noise fix deployed (`s4c-reduce-archive-telemetry-noise.md`)

Stabilization follow-up carried in from the Sprint 4c null-id split (2026-06-03). The
triage + fix half of that investigation: a cross-browser cluster of null-access errors
(~1.8/min) that is un-triageable until source maps resolve the minified traces and the
louder archive noise is gone from production telemetry. Both prerequisites land at the
Sprint 4c→4 boundary. With source maps in place this may collapse to a small targeted fix;
otherwise it falls back to structured logging at the high-risk player-lookup flows. Low
urgency relative to the citizenship/payments track.

---

### S3-Backed Match Archival (Citizen-Gated)
**Brief:** `0030-archive-s3-backed-citizen-gated`
**Depends on:** player profile store live, citizenship live, S3 bucket + credentials provisioned

The "build it properly" half of the 2026-06-01 archive task split. The inherited archive
path POSTs every completed game to a non-existent endpoint; the Sprint 4c task
`s4c-reduce-archive-telemetry-noise.md` disables it to clear ~26.6/min of telemetry noise.
This task stands up the real S3-backed store the architecture already expects (empty
`storageEndpoint/Bucket/AccessKey/SecretKey` config slots), gates archival to citizen
games only, and re-enables the path. Schedule it at the tail of the citizenship track —
it has no live consumer until match history (a citizen feature) exists. Primarily infra,
but the citizen-gating and re-enable code are required too.

---

### PostgreSQL Backup Routine (Player Profile Store)
**Brief:** `s4-postgres-backup-routine.md`
**Depends on:** player profile store schema live
**Must be live before:** Paid Citizenship

Data-protection prerequisite for monetization. The profile-store impl creates Postgres on a
Docker volume but nothing backs it up — and once players pay, paid entitlements exist only in
that DB. Daily `pg_dump` + encrypted off-box copy to Reg.ru S3-compatible storage, with a
documented and **tested** restore. Earned XP and display names are also irreplaceable, so
backups must be live by the time Earned/Paid Citizenship ship. Locked with Mark 2026-06-08:
scope = profile store only; RPO ≈ 24h (daily); off-box destination = Reg.ru S3 (confirm in
Part A). Closes the gap behind the Monitoring Phase 2 backup-health check (which assumed a
weekly cron that was never created — corrected to daily here).

---

### Personal-Data Compliance (152-ФЗ) — Roskomnadzor Notification + Consent Flow
**Type:** Investigation-first (legal consultation primary; engineering consent flow deferred to findings)
**Experiments:** ❌ Excluded — legal/compliance obligation.
**Brief:** `s4-personal-data-compliance-investigation.md`
**Status:** ✅ Done (2026-06-26) — see Outcome below. Findings: `ai-agents/knowledge-base/personal-data-152fz-findings.md`.
**Outcome — SUPERSEDED 2026-06-28.** The 2026-06-26 decision (pseudonymize via an irreversible Yandex-ID hash) was **overturned on further investigation: hashing does NOT remove the 152-ФЗ notification/consent obligation** — it only added support/dev complexity for no legal benefit. The hashing task (`s4-profile-hash-player-ids.md`) is **cancelled** and PR #127 was reverted. **152-ФЗ is therefore unresolved** — and per Mark (2026-06-28) the compliance work is **deferred to the backlog sprint** (`0048-compliance-152fz-notification-consent`) with **risk explicitly accepted**. It **no longer gates profile-store production go-live in Sprint 4**; the documented, accepted consequence is that real PII persists in prod before notification/consent exist. The findings doc (`personal-data-152fz-findings.md`) is retained but marked **INVALIDATED**. The historical investigation framing follows for context.

Third, distinct legal track (separate from the cleared VAT gate and the in-progress IP/licensing track), flagged by the technical specialist 2026-06-13. Storing real users' Yandex IDs + display names in the profile store triggers 152-ФЗ obligations: **operator notification** to Roskomnadzor and a **user-consent flow** + privacy policy. Data residency (Art. 18.5) is already satisfied (Postgres on the RU game VPS). Locked with Mark 2026-06-13: scope it investigation-first — a Russian data-protection lawyer determines what notification/consent require, whether Yandex platform terms already cover identity-data consent, the minors angle, retention/deletion duties, and the true blocking relationship; the lawyer's findings set the final gate. **Interim stance until findings:** treat as gating the profile-store *production* go-live (don't persist real PII in prod before notification filed + consent live); dev/test with non-real data is fine. Profile store is still backlog, so **start the legal consultation now** to clear in parallel. Consent fields (given / version / timestamp) should feed the profile-store schema; deletion support interacts with the deferred S3 archival. Engineering consent-flow brief scoped from findings.

---

### Name Change (Citizens Only)
First citizenship benefit. Citizens can change their display name. Requires moderation step (name review). Non-citizens cannot access this feature.

**Details to be scoped in Phase 2 brief** — name validation rules, moderation flow, Yandex player ID vs display name relationship, name uniqueness enforcement.

---

### Citizen Verified Icon
Citizen icon visible in lobbies and match player list. Distinguishes citizens from non-citizens. Visual design to be decided.

---

## Deferred to Sprint 5

- Rewarded ads (no reward mechanic until citizenship benefits are established)
- Cosmetics (flags, patterns) — citizenship must ship first
- Cosmetics purchase flow (depends on citizenship purchase infrastructure)

---


## XP Economy (locked)

| Parameter | Value |
|---|---|
| XP per qualifying match | 10 XP (flat) |
| Citizenship threshold | 1,000 XP (~100 matches) |
| XP past citizenship | Continues accumulating |
| Levels in Sprint 4 | 1 (citizenship is the only milestone) |
| Rewarded ad XP boost | 2× XP for that match — Sprint 5 scope, not Sprint 4 |

## Qualifying Match Definition (locked)

A match awards XP only when all of the following are true:

| Outcome | Awards XP? |
|---|---|
| Eliminated by another player or bot | ✅ Yes |
| Survived to match end (any win condition) | ✅ Yes |
| Voluntary Leave mid-match | ❌ No |
| Disconnected, did not return | ❌ No |
| Never spawned (CatchupTooLong or other) | ❌ No |

## Pricing (locked)

| Item | Price | Notes |
|---|---|---|
| Citizenship | 99 rubles | ~50% to Yandex + taxes |
| Cosmetics (Sprint 5) | 149–199 rubles | Includes citizenship automatically |

## Humans vs Nations — Balance Nation Count to Players

**Effort:** half a day
**Experiments:** ❌ Excluded — balance fix, ships to all players.
**Independent** — no dependency on citizenship or payment tasks.

Humans vs Nations mode currently adds too few nation bots relative to the number of human players, making the mode too easy. Fix: set nation count as close to 1:1 with human players as the lobby maximum allows.

Formula: `nation_count = min(human_player_count, lobby_max_players - human_player_count)`

See full brief: `s4-nations-balance-task.md`

---

## AI Player Lobby Slot Bug — Always Keep One Slot Free

**Effort:** half a day
**Experiments:** ❌ Excluded — bug fix.
**Note:** may interact with the Humans vs Nations balance task — implement together or in sequence.

AI players can currently fill all lobby slots including the last one, causing the lobby to show 10/10 with a mix of real and AI players. The game does not start and real players cannot join — the lobby is stuck.

Fix: enforce `ai_count ≤ lobby_max - 1` at all times. When a real player joins a full-AI lobby, displace one AI to restore the free slot. Update the "lobby full → start" condition to only fire when no AI players remain.

See full brief: `s4-ai-lobby-slot-bug.md`

---

## Tutorial — Pause During Action-Required Steps

**Status:** ⛔ Cancelled (2026-04-18) — created too many implementation problems.

See full brief: `s4-tutorial-action-pause.md`

---

## Tutorial — Remove Nations, Keep Only Bots

**Effort:** 1–2 hours (config change only)
**Experiments:** ❌ Excluded — tutorial improvement.

Tutorial currently includes nation bots which can be aggressive even on Easy difficulty. Remove nations from the tutorial match entirely — keep only regular small bots. Makes the tutorial trivially winnable so new players learn mechanics without frustration.

See full brief: `s4-tutorial-no-nations.md`

---

## Tutorial — Lock Build Menu to City During Tooltip 5

**Effort:** half a day
**Experiments:** ❌ Excluded — tutorial bug fix.
**Interaction:** coordinate with action-pause task (`s4-tutorial-action-pause.md`) — both modify tooltip 5 behaviour.

During tooltip 5 (build a City), all non-City building icons are clickable even if the player can afford them. A player who accidentally builds the wrong structure breaks the tooltip sequence (tooltip 6 only fires on City built). Fix: force all non-City icons into the same disabled state used when a player lacks sufficient gold. City icon remains fully enabled. Normal state restored when tooltip 5 is dismissed, City is built, or tutorial is skipped.

See full brief: `s4-tutorial-build-menu-lock.md`

---

## Tutorial — Reduce Bot Count from 400 to 100

**Effort:** 30 minutes (single config value change)
**Experiments:** ❌ Excluded — tutorial improvement.

Tutorial currently spawns 400 bots — same order of magnitude as a full multiplayer match. Reduces to 100 to make the map less chaotic and give new players more room to learn without being immediately overwhelmed.

See full brief: `s4-tutorial-reduce-bots.md`

---

## Map Labels — Show Troops/Max + Attacking Troops

**Effort:** ~half a day (client rendering change).
**Experiments:** ❌ Excluded — informational UI enhancement, ships to all players.
**Independent** — no dependency on citizenship or payments.
**Brief:** `0041-map-population-army-labels`

Enrich the on-map country labels (`NameLayer.ts`) to mirror the hover info panel: show the troops line as `current / max` (e.g. "10K / 100K") and, when a country is attacking, add a red line below with the total attacking troops. Pure `src/client/` change — all data is already available client-side (`PlayerInfoOverlay` renders the same values today via `player.troops()`, `config.maxTroops(player)`, and summed `outgoingAttacks()`), so no investigation and no `src/core/` work. Visual/live verification at multiple zoom levels and against an attacking country; watch label clutter at mid zoom.

---

## Public Modifier — Add "5M Starting Gold"

**Effort:** ~1 day
**Experiments:** ❌ Excluded — match-quality change, ships to all players.
**Independent** — no dependency on citizenship or payments, and (as of 2026-06-20) decoupled from the infinite-gold modifier task: this is now a standalone weird sub-option that ships on its own.
**Brief:** `0042-starting-gold-public-modifier`

Add a bounded economic-boost weird modifier: a one-time **5M starting gold** grant for real players (`Human` + `AiPlayer` only — nations and filler bots stay at 0). It gives a finite head-start to expand and defend early, then normal economy resumes — broadening public weird-match variety alongside the existing army/nuke/SAM modifiers. Adds a new `startGold` `GameConfig` field (schema + every config literal, client and server), a `startGold(playerInfo)` config method mirroring `startManpower`, player-init wiring in `src/core/`, a "5M Starting Gold" lobby badge, and en/ru localization. Recipient predicate matches the existing `infiniteGold` `Human || AiPlayer` gate. Locked with Mark 2026-06-13: recipients = real players only, amount = 5M, public rotation only. **Adds** (does not replace) a sub-option, so `WEIRD_SETTING_OPTIONS` grows four → five (20% budget split five ways). `src/core/` desync-sensitive (all config literals must carry the field); live public-rotation spot-check is the verification gate.

---

## Email Subscription Modal

**Effort:** half a day
**Experiments:** ❌ Excluded — new feature, ships to all players.
**Independent** — no dependencies.

Add a "Subscribe to updates" modal with a single email input field. Entry point buttons added to both the match start and match end modals. On submit, the email is sent to the Telegram bot via the existing feedback pipeline as a new message type. No frequency capping or duplicate checks in v1.

See full brief: `s4-email-subscribe-task.md`

---

## Feedback Popup — Remove Email/Contact Field (152-ФЗ)

**Effort:** ~half a day
**Experiments:** ❌ Excluded — legal/compliance change, ships to all players.
**Independent** — no dependency on the citizenship/payments track.
**Brief:** `0046-feedback-remove-contact-field`

The feedback popup collects an optional contact field (placeholder *"Email or Telegram (optional)"*). Collecting personal contact data triggers 152-ФЗ obligations for a field we don't need, so remove it entirely — data minimization. Full end-to-end removal across `src/client/FeedbackModal.ts` (state, input, payload), `src/server/Master.ts` (`contact` out of `FeedbackSchema` so Zod strips it even from stale clients, plus the webhook + Telegram message formatting), and the `feedback_modal.contact_placeholder` key in **both** en/ru. Verification is live: field gone from the popup, and the delivered Telegram report no longer carries a Contact line; `Feedback:Submitted` still fires (no new analytics).

**⚠️ Related exposure:** the **Email Subscription Modal** (above) collects email by design — same 152-ФЗ concern, different fix (can't just remove; needs a consent decision). Recommend folding it into the deferred 152-ФЗ backlog task (`0048-compliance-152fz-notification-consent`), which now carries this surface. This feedback-field removal is safe to ship now regardless.

---

## Notes

- **Register Yandex catalog items immediately** — approval takes days and should not block implementation
- **Earned path is independent of payments** — the XP progression path can ship before the Yandex payment catalog is approved
- **Phase 2 briefs will be written** once both investigation findings are reviewed with Mark
