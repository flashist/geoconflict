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
| ✅ Done | — | Investigation A — Player Profile Store | [`0124-investigation-player-store`](../tasks/done/0124-investigation-player-store/brief.md) |
| ✅ Done | — | Investigation B — Yandex Payments Catalog | [`0125-investigation-yandex-payments`](../tasks/done/0125-investigation-yandex-payments/brief.md) |
| ✅ Done | — | 8d-A. Global Announcements Re-enable | [`0126-global-announcements`](../tasks/done/0126-global-announcements/brief.md) |
| 🚧 Blocked — awaiting Yandex catalog approval | — | Yandex Catalog Registration (manual, non-engineering; owner-ruled 2026-08-14: was `⚠️ Urgent`, urgency is not a status) | [`0014-yandex-catalog-registration`](../tasks/backlog/0014-yandex-catalog-registration/brief.md) |
| ✅ Done | — | Solo Mode: Opponent Win Condition Not Triggering Loss | [`0140-solo-win-condition-fix`](../tasks/done/0140-solo-win-condition-fix/brief.md) |
| ✅ Done | — | Fix: Space Key Blocked in Feedback Modal During Match | [`0165-feedback-modal-space-key`](../tasks/done/0165-feedback-modal-space-key/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Feedback Popup: Remove Email/Contact Field *(152-ФЗ data minimization; client + server + en/ru)* | [`0046-feedback-remove-contact-field`](../tasks/done/0046-feedback-remove-contact-field/brief.md) |
| ✅ Done | — | Investigation — Missions Mode Difficulty Curve | [`0142-missions-difficulty-investigation`](../tasks/done/0142-missions-difficulty-investigation/brief.md) |
| ✅ Done | — | Nuke Pre-Launch Trajectory: Increase Line Thickness | [`0143-nuke-trajectory-visibility`](../tasks/done/0143-nuke-trajectory-visibility/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Map Labels: Show Troops/Max + Attacking Troops *(live-validated singleplayer only — multiplayer parity, exact-zero case, dark-territory legibility not demonstrated live)* | [`0041-map-population-army-labels`](../tasks/done/0041-map-population-army-labels/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Public Modifier: Add "5M Starting Gold" *(standalone variety modifier; decoupled from infinite-gold task 2026-06-20)* | [`0042-starting-gold-public-modifier`](../tasks/done/0042-starting-gold-public-modifier/brief.md) |
| ✅ Done | — | Teams Mode: Cap Maximum Teams at 4 | [`0144-teams-mode-max-teams`](../tasks/done/0144-teams-mode-max-teams/brief.md) |
| ✅ Done | — | Start Screen Redesign — Tab Layout Investigation (design) | [`0139-start-screen-redesign-investigation`](../tasks/done/0139-start-screen-redesign-investigation/brief.md) |
| ✅ Done | — | Start Screen Redesign — Implementation | [`0166-start-screen-redesign-impl`](../tasks/done/0166-start-screen-redesign-impl/brief.md) |
| ✅ Done | — | App Bootstrap — Single Explicit Entry Point *(client boot-path refactor)* | [`0167-app-bootstrap-single-entry-point`](../tasks/done/0167-app-bootstrap-single-entry-point/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Player Profile Store — Implementation *(epic; T1 ✅, T3 ✅; T2+T7 ⛔ cancelled 2026-06-13 — guest-first dropped, now authenticated-only; T4 ✅ complete + T5 ✅ done 2026-06-24 (box live at api.geoconflict.ru; profile DB+API PR #126); T6 ✅; T8 ✅ — all slices complete. Closed 2026-08-24 by owner ruling relayed via the lead session; remaining prod substance lives in `0062` and the live tails, not this epic)* | [`0013-player-profile-store-impl`](../tasks/done/0013-player-profile-store-impl/brief.md) |
| ✅ Done | — | PostgreSQL Backup Routine (Profile Store) — off-box, daily *(must be live before Paid Citizenship)* | [`0189-postgres-backup-routine`](../tasks/done/0189-postgres-backup-routine/brief.md) |
| ✅ Done | — | Personal-Data Compliance (152-ФЗ) — Investigation *(conclusion OVERTURNED 2026-06-28: hashing doesn't remove the obligation. 152-ФЗ work **deferred to backlog** → `0048-compliance-152fz-notification-consent`, risk accepted; no longer gates Sprint 4.)* | [`0186-personal-data-compliance-investigation`](../tasks/done/0186-personal-data-compliance-investigation/brief.md) |
| ⛔ Cancelled (2026-06-28) — hashing does not remove the 152-ФЗ obligation; PR #127 reverted | — | Profile Store: Pseudonymize Player Identity — store an irreversible hash, not the raw Yandex ID *(152-ФЗ deferred to backlog → `0048-compliance-152fz-notification-consent`, risk accepted)* | [`0187-profile-hash-player-ids`](../tasks/cancelled/0187-profile-hash-player-ids/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Yandex Payments — Catalog Fetch & Purchase Infrastructure | [`0019-yandex-payments-impl`](../tasks/done/0019-yandex-payments-impl/brief.md) |
| ✅ Done | — | Citizenship Core — XP Counter & Progress UI | [`0191-citizenship-xp-progress-ui`](../tasks/done/0191-citizenship-xp-progress-ui/brief.md) |
| ✅ Done | — | Citizenship Card: Login CTA Is a Dead Button Outside a Yandex Context | [`0190-citizenship-card-guest-cta-no-sdk`](../tasks/done/0190-citizenship-card-guest-cta-no-sdk/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Degraded-Mode UX: Give Yandex SDK Timeout/Failure Its Own Player-Facing Treatment *(moved in from Sprint backlog 2026-07-02 — Mark: must ship before Citizenship Earned/Paid go live)* | [`0049-degraded-mode-full-ux-treatment`](../tasks/done/0049-degraded-mode-full-ux-treatment/brief.md) |
| 🚧 Blocked — built + reviewed (local scope); open pending the `0062`-gated Deferred Live Tail incl. `0054` flip-ON | — | Citizenship Core — Earned Citizenship *(**re-scoped 2026-08-23, owner-ruled: "don't block on Yandex externals" — build + verify against the LOCAL profile stack now** (profile server + Postgres via Docker, `RUN_DB_TESTS=1`). `0062` stays real but gates only the brief's **Deferred Live Tail** (prod XP accrual, live grant, `0054` flip-ON) — ⚠️ the task must not be closed until that tail runs. Never depended on `0014`/Yandex. Degraded-mode gate cleared: `0049` Done)* | [`0017-citizenship-earned`](../tasks/backlog/0017-citizenship-earned/brief.md) |
| 🚧 Blocked — built + reviewed (mock scope); open pending `0065` | — | Citizenship Core — Paid Citizenship *(**re-scoped 2026-08-23, owner-ruled: "don't block on Yandex externals" — now the MOCK-BUILDABLE scope only**: purchase flow, grant, reconciliation UI against a mocked SDK catalog with fake product data on `0019`'s `PaymentsContract`/`PaymentsApiClient` seam, verified by tests + local runs. Both former blockers — `0062` and catalog approval (`0014`) — are real but now gate the split-out live tail `0065`, not this build. Does NOT go live from this task)* | [`0018-citizenship-paid`](../tasks/backlog/0018-citizenship-paid/brief.md) |
| 🚧 Blocked — three conditions: Yandex catalog approval + per-game secret key (`0014`), `0062` (no profile row is ever created in production), **and `0195`** (`YANDEX_PAYMENTS_SECRET` never forwarded to the profile box — every `/v1/payments/*` route returns 503 there); none alone unblocks | — | Paid Citizenship — Live Verification & Go-Live Tail *(**split out of `0018` on 2026-08-23, owner-ruled**, on the `0019` deferred-checklist precedent — and it **absorbs `0019`'s live checklist**: real signed payloads / HMAC-construction confirmation, live catalog fetch, real test purchase, live reconciliation, moderation behavior, `0054` flip-ON at go-live. ⚠️ **Blocker count went two → three on 2026-08-28, owner-ruled** — `0014` issuing the key is necessary but **NOT sufficient**: `build-deploy-profile.sh` omits the variable from its staged-export block, so the key would still never reach the box and steps 1–4 would every one of them fail with 503. Row text updated on explicit owner authorization; status value unchanged)* | [`0065-citizenship-paid-live-verification`](../tasks/backlog/0065-citizenship-paid-live-verification/brief.md) |
| 🚧 Blocked — built + reviewed (local scope) 2026-08-26; open pending the `0062`-gated Deferred Live Tail | — | 8d-B. Personal Inbox *(**built 2026-08-26 via the sprint ship-loop: stateful review ✅ Ready to merge (validation-gated), ledger closed-out; browser leg of the local loop NOT run — owner-side; must not close until the Deferred Live Tail runs.** Re-scoped 2026-08-23, owner-ruled: local-first, same treatment as `0017`** — buildable/verifiable against the local profile stack now; `0062` gates only the brief's Deferred Live Tail. Shipping it retires the no-op inbox seams in `0017`/`0018`/`0019`; name-change triggers stay deferred with that task)* | [`0012-personal-inbox`](../tasks/backlog/0012-personal-inbox/brief.md) |
| 🔲 Backlog | — | S3-Backed Match Archival (Citizen-Gated) *(blocked: player profile store + citizenship + S3 infra)* | [`0030-archive-s3-backed-citizen-gated`](../tasks/backlog/0030-archive-s3-backed-citizen-gated/brief.md) |
| 🔲 Backlog | — | Investigate & Fix Client Null-ID Errors *(stabilization follow-up; needs source maps + deployed archive fix)* | [`0032-investigate-null-id-errors`](../tasks/backlog/0032-investigate-null-id-errors/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Name Change (Citizens Only) *(scoped 2026-08-24, owner-ruled — request → moderation → apply loop; inbox hooks stay seams per `0012`'s deferral. Driven by the sprint ship-loop from the lead session 2026-08-28; the brief's three open questions were owner-ruled that day — see the section below. **Closed 2026-08-28 by a spawned producer — no owner present, no human has checked this work.** ⚠️ **Effective posture is built-awaiting-deploy, the same as `0062`/`0063` — nothing here is verified in production.** Built + stateful-reviewed (Round 1, all five findings dispositioned, ledger closed-out, reviewer re-verified every fix and number in phase 2); green `tsc`/lint/prettier, `npm test` 103 suites / 1039 tests, integration 5 suites / 70 tests on real Postgres, en/ru parity 15/15. **The citizenship card has never been seen in a browser** — `CITIZENSHIP_CARD_ENABLED` is `false`, so the UI is unit-proven only. **The operator Telegram notification is unit-proven only** — profile-VPS proxy reachability is untested and belongs to `0033`. **Open residuals:** (a) a forged client-asserted id can still submit an offensive name in a citizen's name — mitigated by the moderation gate, closes on `0014`; (b) 🚨 **the pending, unmoderated name is publicly readable via the unauthenticated profile endpoint — this passes NO gate at all and is UNMITIGATED** (the moderation gate governs APPLICATION, never PUBLICATION); (c) the notification cooldown is in-process, so a restart or second instance allows one extra message — deliberate, the name-binding carries the safety. Full detail in the brief's close-out section and `review.md`)* | [`0067-name-change-citizens-only`](../tasks/done/0067-name-change-citizens-only/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Citizen Verified Icon *(scoped 2026-08-24, owner-ruled — server-sourced `isCitizen` flag + icon in lobby and match player lists. Driven by the sprint ship-loop from the lead session 2026-08-28; the design open question was owner-ruled that day — placeholder `★` glyph now, real design as a follow-up. **Closed 2026-08-28 by a spawned producer — no owner present, no human has checked this work.** ⚠️ **Effective posture is built-awaiting-deploy, the same as `0067` — nothing here is verified in production.** **PROVEN, not deferred:** the mandatory live multi-client desync check ACTUALLY RAN — 3 real browser clients, mixed citizen/non-citizen/guest, **280 state-hash windows compared across turns 650–3440, 0 mismatches, 0 desync messages**; fail-soft exercised for real (profile server killed → join completed, no badge, warn-level retries, **zero error lines**); the determinism argument verified structurally by the reviewer, all four legs. Green `tsc`/lint/prettier, `npm test` 106 suites / 1072 tests, integration 5 suites / 70 tests; stateful review Round 1 all three findings dispositioned, ledger closed-out, reviewer re-verified in a phase-2 pass and found nothing new. **Nine accepted residuals**, two with conditions that must not be softened: (a) 🚨 **R3 — `isCitizen` is served on the unauthenticated `GET /api/game/:id` lobby poll; that acceptance is valid ONLY while the flag stays purely cosmetic and is VOID the moment anything of value is gated on `isCitizen`, at which point the exposure must be re-decided**; (b) **R2 — the `GameView` wiring line and `PlayerView.isCitizen()` are untested — a coverage GAP, never coverage.** Others: no pre-match icon in public quick-play (amendment 2); placeholder glyph pending a design follow-up (amendment 3); ADR-103 client-asserted-id trust (a forged id can mint a cosmetic icon — gates nothing); flag freshness bounded by last join; singleplayer shows no icon; pre-existing `HostLobbyModal` local-dev URL bug; `NameChangeRoutes` flake. **Two defects found here were routed OUT, not absorbed: `0198` (production) and `0197` (test reliability).** Full detail in the brief's close-out section and `review.md`)* | [`0068-citizen-verified-icon`](../tasks/done/0068-citizen-verified-icon/brief.md) |
| ⛔ Cancelled (2026-04-21) — created too many bugs; cancelled forever, though a similar task might return someday (owner-supplied reason, 2026-08-14) | — | Humans vs Nations — Balance Nation Count *(date recovered from plan edit `e7e1b12`)* | [`0119-nations-balance`](../tasks/cancelled/0119-nations-balance/brief.md) |
| ✅ Done | — | AI Lobby Slot Bug — Always Keep One Slot Free | [`0117-ai-lobby-slot-bug`](../tasks/done/0117-ai-lobby-slot-bug/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Asset audit: confirm no proprietary/CDN assets in production bundle *(**audit complete 2026-08-23** — findings: [`s4-licensing-asset-audit-findings.md`](../knowledge-base/reports/s4-licensing-asset-audit-findings.md) — verdict: 1 confirmed violation (V1: All-Rights-Reserved music ships to the prod web root), 1 trademark item (A1: live favicon is OpenFront's brand mark), 3 hygiene items; remediation filed as `0066`, owner-approved same day — **`0066` shipped to done 2026-08-24 (agent-closed), deployed 2026-08-29 in `362a2f9`**. ✅ **CLOSED 2026-08-31 by a spawned producer on an explicit owner ruling relayed from the lead session (`AskUserQuestion`) — the owner ruled the CLOSE; the owner did NOT themselves sign off on the audit findings, which is exactly what the agent-closed marker says.** **All five findings, with state:** **V1** (All-Rights-Reserved music in the prod web root — the confirmed violation, and the one that gated `0065`) ✅ remediated by `0066`, **verified in production 2026-08-30**; **A1** (OpenFront brand mark as the live favicon — trademark posture) ✅ remediated by `0066`, **verified in production 2026-08-30 on BOTH entry points**; **H1** (`openfront.io`/`openfront.dev` jwt-audience fallback strings in the shipped bundle) ✅ remediated by `0066` Part C, **verified in production 2026-08-31 by the lead** — all three live bundles (`runtime`, `vendors`, `main`) fetched from production and grepped: **0 occurrences in each**; **H2** (`static/LICENSE` collision) ✅ **moot once V1 landed**, exactly as the audit predicted; **H3** (inert commented-out upstream leftovers in HTML, e.g. an `og:url` pointing at openfront.io) ❌ **NOT remediated — explicitly out of `0066`'s scope (its brief says so); audit-rated low risk, no gate — commented markup ships no asset, so there is no licensing consequence.** 📌 **H3 residual is OWNED: task `0073` (`0073-remove-inert-upstream-html-leftovers`) on the unranked Backlog board, `🔲 Backlog`, Unscheduled, filed 2026-08-24 — no new task filed here** (the relay to this close said H3 was unowned; that was wrong, and the correction is recorded rather than acted on). ⚠️ **V1/A1 production method — record the METHOD, not just the verdict**, or a re-run will read a pass as a fail: seven paths checked (3 `sounds/music/*.mp3`, 3 `OpenFrontLogo.*`, upstream `Favicon.svg`); **all seven return `200` and that is a PASS** because this server's `app.get("*")` catch-all never 404s. Proven by controls — a certainly-nonexistent path returns the identical `200`/`10801` bytes/`text/html`, a real asset (`/commit.txt`) returns 41 bytes `text/plain`; all seven are **byte-identical to the nonexistent control**, so none serves real content. The replacement favicon serves for real: hashed `GeoConflictFavicon.svg`, `200`, 445 bytes, `image/svg+xml`, and `yandex-games_iframe.html` links the identical file. **A note saying "expect 404" would make a future re-run read a pass as a fail.** ⚠️ **Gate consequence, stated plainly:** this audit was `0065`'s **licensing prerequisite**, and that prerequisite is now **satisfied and demonstrated**. **`0065` REMAINS BLOCKED on its other three gates — `0014`, `0062`, `0195` — which are untouched. The paid go-live is NOT unblocked, and no other task's status was changed by this close.** Annotation history: corrected 2026-08-23 — this task GATES the paid go-live (`0065`'s flip-ON), it never waited on citizenship. **This row was edited in place, not re-ordered — no row was inserted above a closed row (ADR-035)**)* | [`0025-licensing-asset-audit`](../tasks/done/0025-licensing-asset-audit/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Licensing Remediation: Purge Proprietary Music + Replace OpenFront Favicon + Retarget JWT Fallbacks *(**from the `0025` audit; all three scope items owner-approved 2026-08-23.** Built + review converged 2026-08-24; V1 music purge — zero gameplay impact, game never plays them. ~~**`0065`'s flip-ON gate is "`0066` DEPLOYED to prod" — deployment has NOT happened; closing this row does not clear that gate.** ⚠️ Prod-redeploy checks still pending owner-side (music URLs 404, favicon live, Dockerfile proof) — recorded in the worklog.~~ ✅ **UPDATE 2026-08-30 — the deploy happened and BOTH deferred prod checks were RUN AND PASSED** in the browser against live production by the lead. **`0066`'s licensing gate moves from "shipped, not demonstrated" to DEMONSTRATED** — it is a legal-exposure item and it gates `0065`'s paid go-live. **Step 7's "404" expectation was WRONG for this server and is superseded:** unknown paths hit the `app.get("*")` SPA catch-all, so nothing 404s — the correct test is byte-identity against a known-nonexistent control (`/this-path-cannot-exist-12345.png` → `200`/`10801` bytes/`text/html`; positive control `/commit.txt` → 41 bytes `text/plain`). **All seven** purged paths (3 `.mp3` + `OpenFrontLogo.png`/`.svg` + `OpenFrontLogoDark.svg` + `Favicon.svg`) matched the control → none serves real content. **Seven `200`s here are a PASS, not a failure.** Step 8: `/images/GeoConflictFavicon.7aaf278f4fba2c4b180d.svg` → `200`, 445 bytes, `image/svg+xml`, and `yandex-games_iframe.html` links the identical hashed file — both entry points carry the same original icon. Dockerfile COPY removal ✅ **VERIFIED AT SOURCE 2026-08-30** (upgraded from the producer's honest "by inference" downgrade, which is what prompted the check): `Dockerfile` has **no `COPY proprietary` line at all**, lines 38–43 are an explicit allowlist copy whose own comment says it exists so local files cannot ride along, `proprietary/` is untracked, no `sounds/music` files are tracked, and the only `OpenFrontLogo.svg` hits are the two `resources/claude-design-files/**` design-handoff copies — exactly the residue the owner's 2026-08-23 ruling declared **expected non-empty**. ⚠️ **This changes NO status and clears NO other gate:** `0065` stays as it is, and its other blockers (`0014`, `0062`, `0195`) are untouched. A1 favicon = ORIGINAL placeholder now, proper design later — follow-up noted in brief, no design task)* | [`0066-licensing-remediation-proprietary-purge`](../tasks/done/0066-licensing-remediation-proprietary-purge/brief.md) |
| ⛔ Cancelled (2026-04-18) — created too many implementation problems | — | Tutorial — Pause During Action-Required Steps | [`0120-tutorial-action-pause`](../tasks/cancelled/0120-tutorial-action-pause/brief.md) |
| ✅ Done | — | Tutorial — Remove Nations, Keep Only Bots | [`0122-tutorial-no-nations`](../tasks/done/0122-tutorial-no-nations/brief.md) |
| ✅ Done | — | Tutorial — Lock Build Menu to City During Tooltip 5 | [`0121-tutorial-build-menu-lock`](../tasks/done/0121-tutorial-build-menu-lock/brief.md) |
| ✅ Done | — | Tutorial — Reduce Bot Count from 400 to 100 | [`0123-tutorial-reduce-bots`](../tasks/done/0123-tutorial-reduce-bots/brief.md) |
| ✅ Done | — | Email Subscription Modal | [`0127-email-subscribe`](../tasks/done/0127-email-subscribe/brief.md) |
| ✅ Done | — | Telegram Channel Link (start screen, game-end screen) | [`0141-telegram-link`](../tasks/done/0141-telegram-link/brief.md) |
| ✅ Done | — | VK Channel Link (start screen, game-end screen) | [`0145-vk-link`](../tasks/done/0145-vk-link/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Hide Citizenship Card on Start Screen Behind a Client Config Flag (Default OFF) *(interim until 0017/0018 ship; flag flips ON at citizenship launch)* | [`0054-hide-citizenship-card-behind-client-flag`](../tasks/done/0054-hide-citizenship-card-behind-client-flag/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | `Master.ts`: Serve a Parseable Lobbies Body, and Log Why a Worker Died *(2026-08-22 outage — the unblocked half. First-ever test coverage of `Master.ts`. **Merged to `dev` via PR #133 (`7410bfb`); the original commit `419a116` is an ancestor of the pushed `origin/dev` tip `c86b87d`** — re-verified 2026-08-28 with `git merge-base --is-ancestor`. ⚠️ **Prod deployment UNKNOWN — not confirmed either way from the repo**, owner-side. Closed with no owner verification — verified locally and by review only. ⚠️ Codex review coverage was **partial**: findings on the test file only, no opinion on `Master.ts` itself. **History:** this row originally described the work as sitting unpushed and undeployed on branch `fix/0055-master-parseable-lobbies-and-exit-diagnostics`; the **Correction 2026-08-26, owner-ruled** found that stale, and the push half was re-verified 2026-08-28 — the deploy half has never been asserted since)* | [`0055-master-parseable-lobbies-body-and-worker-exit-diagnostics`](../tasks/done/0055-master-parseable-lobbies-body-and-worker-exit-diagnostics/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Investigation — Public-Game Routing Can Send Games to a Dead or Unready Worker *(architect-led; **ran BEFORE `0056`** — owner-ruled 2026-08-22; promoted in from the Backlog board the same day. Findings reviewed with the owner 2026-08-26; review round 2 ready-to-merge, ledger closed-out; outcome → briefs `0192`/`0193`, ADR-109)* | [`0057-investigate-worker-routing-to-dead-or-unready-workers`](../tasks/done/0057-investigate-worker-routing-to-dead-or-unready-workers/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Prod `/api/env` Advertises `http` on a Raw IP — Login and Profile Fetch Broken for Users *(§9 follow-up. Architect-traced 2026-08-23; **reframed 2026-08-24 at plan**: no auth service exists in this deployment, so no user actually held a token — config still wrong and fixed. Built config-only (six `.env.prod` values → https/apex), formal review skipped by owner ruling; the JWT issuer-claim open question is RESOLVED (vacuous — no tokens can exist). **Closed 2026-08-29 by a spawned producer — no owner present, no human has checked this work.** **Deploy proof exists:** the release landed in production as commit `362a2f9` (`curl https://geoconflict.ru/commit.txt` → `362a2f9`, equal to repo HEAD on `dev`), and live `GET https://geoconflict.ru/api/env` returned `{"publicProtocol":"https","publicHost":"geoconflict.ru","apiBaseUrl":"https://geoconflict.ru",…}` — **brief verification step 2 met in production**. ⚠️ **The close was made on PARTIAL proof — four of the six deploy pendings were unevidenced on 2026-08-29, so the owner's 2026-08-24 "stays open until all six are proven live" condition was NOT met at the moment of closing.** ✅ **All four were subsequently proven, 2026-08-29 → 2026-08-30; the condition is now satisfied — after the close, not before it.** Final state: **1** ✅ full `/api/env` body fetched 2026-08-29 — `gameEnv`, `deploymentId`, `publicHost`, `publicProtocol`, `publicPort`, `apiBaseUrl`, `profileApiUrl`, `jwtIssuer`, `jwtAudience`, every one on `https` + the apex domain; **2** ✅ **owner-verified 2026-08-29** — the owner checked the live game, no console errors (the only pending a human checked); **3** ✅ public lobbies live and filling; **4** ✅ substantially (lobbies filling ⇒ clients connecting and playing); **5** ✅ **vacuous** — owner confirmed no Discord buttons are shown in the product at all; **6** ✅ proven 2026-08-30 by the lead in Uptrace — grouping on the `openfront_host` attribute returns only `geoconflict.ru` + `<null>` for 2026-08-30, while over Aug 24–31 a raw-IP host group (~433k entries) forms a continuous band Aug 24→29 and stops, its last entry `Aug 29 2026 15:43:27.876` — **19 s before the new master booted at 15:43:46**, i.e. the attribute flips at the deploy cutover and the raw IP never returns. **Nothing to reopen.** The `(agent-closed — not owner-verified)` marker stays: the close itself was still made without the owner reviewing the work. Follow-ups filed: `0069` auth-strategy product decision, `0070` token-modal silent failure)* | [`0063-prod-api-env-advertises-http-and-raw-ip`](../tasks/done/0063-prod-api-env-advertises-http-and-raw-ip/brief.md) |
| 🚧 Blocked — built + reviewed 2026-08-24, awaiting deploy proof (D1–D3) | — | `PROFILE_INTERNAL_TOKEN` Is Never Forwarded to Production — the Profile Client Silently No-Ops *(§9 follow-up. **Built 2026-08-24**: deploy.sh one-liner + partial-config warns; review Ready to merge, validation-gated; R1/R2 residuals inherited by `0064`. 🚨 **Verified 2026-08-23: blocks the citizenship go-live — since the same-day mock-first re-scope, that means `0017`'s Deferred Live Tail and `0065`; the `0017`/`0018` builds proceed locally.** `isConfigured()` is false in prod, so `upsertProfile()` and `creditMatch()` both no-op — **no profile row is ever created and no XP is ever credited in production**; the profile server independently fails **closed** on the empty token. Promoted from Backlog once verified. The fix is one line in `deploy.sh`)* | [`0062-forward-profile-internal-token-in-deploy`](../tasks/backlog/0062-forward-profile-internal-token-in-deploy/brief.md) |
| 🔲 Backlog | — | Deploy-Time Config Parity Guard — Catch a Variable That Never Reaches Production *(§9 follow-up, owner-ruled 2026-08-23 as its own task — the `0061`/`0062`/`0063` silent-misconfig class. ⚠️ **HARD sequencing: ships only after `0062` AND `0063` land** — armed earlier it correctly fails every deploy on their known gaps; must land report-only first, enforce second (see the brief's hazard section). **Row added 2026-08-24, owner-ruled** — the brief existed but was board-invisible. Inherits `0062`-review residuals R1/R2 and the merged `0072` specifics; see brief Notes)* | [`0064-deploy-time-config-parity-guard`](../tasks/backlog/0064-deploy-time-config-parity-guard/brief.md) |
| 🔲 Backlog | — | Container Log Retention Is Too Short Now That nginx Access Logs Share the Stream *(§9 follow-up. 150 MB total budget now shared with access logs; **nearly cost us the 2026-08-22 investigation**. Pulled into the sprint because it protects the *next* investigation while the outage track is paused. ⚠️ The log config is **not in this repo** — locating it is step 1, and this may be a server-side change with no commit)* | [`0060-container-log-retention-after-nginx-stream-merge`](../tasks/backlog/0060-container-log-retention-after-nginx-stream-merge/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Restore Worker Crash Recovery — With a Restart Cap — and Make the Scheduling Gate Survivable *(2026-08-22 outage root-cause fix. **Both owner decisions RULED 2026-08-22** — gate quorum **18 of 20 with a 90 s deadline**; restart cap **5 per worker index per 10-min window, backoff 1s→30s**, then give up and log at error level. ⚠️ Arms worker restarts for the first time in project history — the cap MUST ship in the same change or a repeatedly-crashing worker becomes a fork loop. **Closed 2026-08-27** — built + stateful review closed-out (ready to merge, validation-gated); verification 4a PASSED in Uptrace with a caveat (null-valued attributes dropped, message text carries them). **Committed to `dev` at `dc90719`** (verified 2026-08-28: `src/server/WorkerSupervisor.ts` is new in that commit and tracked at HEAD, `src/server/Master.ts` last touched there, working tree clean under `src/`). ⚠️ **Deployment state UNKNOWN — not confirmed; brief step 8 post-deploy check pending by design**)* | [`0056-restore-worker-crash-recovery-and-survivable-scheduling-gate`](../tasks/done/0056-restore-worker-crash-recovery-and-survivable-scheduling-gate/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Public-Game Scheduling: Pick a Game ID That Hashes to a Ready Worker, and Bound the Create Call *(`0057` option (v), **owner-approved 2026-08-26** — master-only, client/worker/nginx contract intact; removes the 18/20 misroute residual `0056` leaves. **Depends on `0056`** (its `markDead`-maintained ready set). Private-lobby exposure accepted as-is, out of scope; the owner's Uptrace §6.3 query re-prioritises this on a `Worker mismatch` hit. **Closed 2026-08-27 via the sprint ship-loop** — plan owner-approved (D1 cap 1000 + unfiltered fallback + warn; D2 skip tick, error once per episode; D3 5 s abort + delete ID + rethrow); review round 1 ready-to-merge, ledger closed-out; `npm test` 96 suites / 862 tests, lint 0, tsc 0; live: dead index 0 misroutes over 51 s, rejoin works, wedged index fails at 5.0 s instead of hanging, healthy 9m41s run 61/60 split. Orphans on wedge recovery unchanged vs `0193` baseline (5) — accepted residual, follow-up brief `0194`; **residual DISCHARGED 2026-08-28 by `0194`** — 0 orphans measured on the wedge run against the recorded baseline of 5. **Committed to `dev` at `dc90719`** (verified 2026-08-28: `src/server/Master.ts` — carrying the ready-set draw and the bounded create — last touched there, working tree clean under `src/`). ⚠️ **Deployment state UNKNOWN — not confirmed; post-deploy check (brief step 7) pending by design**)* | [`0192-schedule-public-games-onto-ready-workers-with-bounded-create`](../tasks/done/0192-schedule-public-games-onto-ready-workers-with-bounded-create/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | `Master.ts`: Guard `fetchLobbies` Against Overlapping Ticks *(standalone defect from `0057` §2.2/§7, **owner-approved 2026-08-26** — no in-flight guard on the 100 ms poll → 50× log amplification per stuck ID, ~21% lobby-list flapping, orphan games + 429s on worker recovery. Independent of routing and of `0056`. Touched the same interval block as `0056` Step 3 — rebase, no dependency. **Built + reviewed 2026-08-26/27 via the sprint ship-loop** — review round 2 ready-to-merge, ledger closed-out; `npm test` 96 suites / 828 tests, lint 0, tsc 0; live targets met: error lines per stuck ID 50 → 1, 0 flaps, 0 × 429. **Committed to `dev` at `dc90719`** (verified 2026-08-28: the `lobbyPollTick` in-flight guard is present in `src/server/Master.ts` at HEAD, last touched in that commit, working tree clean under `src/`). ⚠️ **Deployment state UNKNOWN — not confirmed; post-deploy check (brief step 5) pending**)* | [`0193-guard-fetchlobbies-against-overlapping-ticks`](../tasks/done/0193-guard-fetchlobbies-against-overlapping-ticks/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | `Worker.ts`: Reject a Buffered `create_game` Whose Requester Has Already Gone Away *(the **(A) follow-up from `0192`'s orphan finding, owner-ruled 2026-08-27** via the ship-loop. `0192`'s 5 s abort bounds the master's hang but cannot retract a request already in a `SIGSTOP`ped worker's socket buffer; on `SIGCONT` the worker creates games the master already dropped — 5 orphans per 40 s wedge in dev, unchanged vs the `0193` baseline. **Depends on `0192`** (done). Worker-only; master untouched; ADR-109 placement contract intact. **Closed 2026-08-28 via the sprint ship-loop.** ⚠️ **The plan deliberately supersedes the brief on the central point and the brief was left unedited** — the brief's specified **synchronous** `req.socket.destroyed` / `req.aborted` check was **measured** not to fire (`req.aborted` stays `false`, the request completes out of the kernel buffer; `req.destroyed` is `true` even for healthy creates), so the owner approved D1 (A) instead: a **bounded 10 ms settle wait** (D2) guarding **all** creates, public and private (D3), answering **`503` JSON** (D4); D5 not triggered, D6 route-level test skipped. Read `plan.md` for what shipped. Result: **0 orphans on the wedge run vs the recorded baseline of 5** — this **discharges `0192`'s accepted orphan residual**; guard warns 4, `Too Many Requests` 0, master error lines 13 (vs 16). Healthy 6-min run 74 creates, cadence 4.84 s unchanged, 0 guard warns; private lobby via the real browser client 200 and live, 0 warns; rejection paths 400/401/400 unchanged. Review round 1 both reviewers ran (own pass + Codex `gpt-5.5`): 3 low defects + 1 frontier, **all in the test file — `Worker.ts` had no confirmed defect**; R1–R3 applied per owner ruling, R4 accepted; ledger **closed-out**, confirmed by reviewer phase 2; **two accepted residuals** (`Logger.ts` global side effects in server unit tests; hardcoded `CREATE_GAME_TIMEOUT_MS = 5_000` in the test). `npm test` 97 suites / 874 tests, lint 0, tsc 0, prettier clean, 12/12 randomized ×2 with no open handles. **Committed to `dev` at `c86b87d`** (verified 2026-08-28: `src/server/Worker.ts` and the new `tests/server/Worker.test.ts` are both in that commit and tracked at HEAD, working tree clean under `src/` and `tests/`). ⚠️ **Deployment state UNKNOWN — not confirmed; worklog Step 4 Run 6 (post-deploy) pending by design** — after the next prod deploy carrying this, confirm no guard `warn` lines on a healthy run and that `0192`'s `Failed to schedule public game` count is unchanged; deployment state unknown)* | [`0194-worker-reject-buffered-create-game-from-departed-requester`](../tasks/done/0194-worker-reject-buffered-create-game-from-departed-requester/brief.md) |
| 🔲 Backlog | — | `YANDEX_PAYMENTS_SECRET` Is Never Forwarded to the Profile Box — Paid-Citizenship Payment Routes 503 in Production *(**third instance of the `0062`/`0063` config-parity class — a variable that never reaches production — and the first outside `deploy.sh`.** Found 2026-08-28 during `0067`'s build; owner-approved the same day as its own task rather than a fix folded into `0067`'s review, on the grounds that it is a live money path deserving its own verification. `build-deploy-profile.sh`'s staged-export block omits the variable, so `setup-profile.sh` writes it **empty** into `profile.env` and `Routes.ts`'s `paymentsEnabled` middleware 503s every `/v1/payments/*` request on the real box — true since `0019` shipped. Second gap: `example.env.profile` does not document the variable at all, so the fix is two edits, not one. ⚠️ **Blocks `0065`** (its steps 1–4 all drive `/v1/payments/*`); **`0064` must land after this**, same hard sequencing its hazard section states for `0062`/`0063`. Verification requires a real profile deploy — pending for other reasons too)* | [`0195-forward-yandex-payments-secret-in-profile-deploy`](../tasks/backlog/0195-forward-yandex-payments-secret-in-profile-deploy/brief.md) |
| 🔲 Backlog | — | Sweep Real Dependencies Into the Canonical Declaration So the Board Can See Them *(filed 2026-08-28, owner-approved as one small sweep; **promoted from the Backlog board into Sprint 4 the same day, owner-ruled** via `AskUserQuestion` in the lead session — over the `0050`/`0051`/`0053` `Unscheduled` precedent, on the grounds that those sweeps repair legacy records while this one repairs rows the ship-loop's eligibility check is reading now. **8 board-linked briefs render `none recorded` to `dashboard.sh`** while their real gates sit only in prose — including **`0018` and `0025`, both live Sprint 4 rows**. ⚠️ The error direction is what makes it worth doing: not a missing answer but a **fabricated `ready`** — *"a wrong dependency is visible, a fabricated `ready` is not"* (`dashboard.sh` source). **Scope owner-ruled the same day: all 31 briefs with no declaration**, with the 8 board-visible ones swept and verified first. Documentation-only — no code, no status changes, no file moves. Priority **Medium**, producer's, undisturbed by the owner. 📌 A "14" in the original framing was an **unverified relay from the lead, not a measurement** — corrected in the brief so nobody hunts for its source. **Row appended, not inserted** — this board is unranked, so row order encodes no rank (ADR-035))* | [`0196-sweep-dependency-declarations-into-briefs`](../tasks/backlog/0196-sweep-dependency-declarations-into-briefs/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | Test-Suite Reliability Investigation: the Random Jest-Worker `SIGSEGV`, and the Integration Suite's Real Exit Behaviour *(filed 2026-08-28, owner-approved as one task covering both symptoms; **promoted from the Backlog board into Sprint 4 the same day, owner-ruled** via `AskUserQuestion` in the lead session — priority **Medium** was the producer's rank and the owner **confirmed rather than disturbed** it. **Investigation-first** — the segfault has no known cause and must not be fixed speculatively. ⚠️ **It makes a green suite look red at random, which erodes the signal every review and every ship gate reads**: 🔧 **CORRECTED 2026-08-29 from this task's own build findings — three claims in this cell were wrong; what they said is preserved here so the correction is auditable.** **(1) The count is FOUR distinct suites on 2026-08-28, not FIVE.** This cell previously read *"evidence strengthened 2026-08-28 — FIVE distinct, unrelated, untouched suites in a single day"*, listing `tests/Colors.test.ts`, `tests/core/game/StartGold.test.ts`, `tests/profile-server/NameChangeRoutes.test.ts`, `tests/UnitGrid.test.ts` and `tests/Attack.test.ts`. **`NameChangeRoutes` never segfaulted** — `0068`'s `worklog.md:189` records it as an assertion failure (`got 404`), and `0068`'s `review.md:153` rolled that into the segfault list. Confirmed twice over: macOS holds exactly **four** `node-*.ips` crash reports from that day, and `0197`'s build reproduced the `404` shape 9 times in 170 runs. That flake is now **`0200`**. **(2) The cause is KNOWN and the environmental narrowing was wrong.** This cell previously said the sample *"argues environmental rather than file-specific"* and narrowed toward *"worker/memory/version hypotheses"*. In fact all five crash reports (four historical + one reproduced live 2026-08-29) carry a **byte-identical stack entirely inside V8's garbage collector** — `ClearStaleLeftTrimmedPointerVisitor` dereferencing `0x6` during mark-compact, **no native-addon frame on any of them**. **An upstream V8 bug, not a repository defect**, at ~1 segfault in 170 runs. jsdom/`canvas` was **refuted by experiment** (the reproduction came from the sweep excluding every jsdom suite, in a worker with no `canvas.node`); memory pressure **ruled out** (macOS exhaustion presents as jetsam/`SIGKILL`, not `SIGSEGV`); `jest-worker` mismatch and `@swc/core` also ruled out. **The victim suite carries no information about the cause.** Still open: whether Node 22/20 carry the same V8 bug (the cross-version sweeps are underpowered by ~an order of magnitude), and "machine-local condition" is **untestable** — no CI, one host. **(3) The integration hang DOES NOT REPRODUCE — the title of this row is known-wrong.** This cell previously described it as *"pre-existing, open `pg` handles, currently folklore"*. Both halves were false: `--runInBand` without `--forceExit` exits by itself in ~4 s, **10 runs out of 10**, `--detectOpenHandles` reports **zero**, and every pool is already closed in an `afterAll`. The folklore came from jest printing its force-exit banner unconditionally whenever the flag is set. ~~⚠️ **Not closed:** all measurements were **warm-DB**; a cold first-migration database was never tested.~~ 🔧 **CORRECTED 2026-08-30 at close — that caveat is now superseded and is struck, not deleted, so the correction is auditable.** The **cold-database gap was closed during the build**: 3 runs out of 3 on a genuinely cold first-migration database also exited on their own, alongside the 10 out of 10 warm. **`--forceExit` was therefore REMOVED, not documented**, and `CLAUDE.md` now states that a future hang is a **real regression**. (A stray surviving copy of the superseded warm-only caveat inside the findings report was reviewer finding **R2** and was deleted there.) ✅ **RENAME RULED 2026-08-29** (`AskUserQuestion`, lead session) — **CARRIED OUT 2026-08-30 at close**, exactly as ruled: title and folder were renamed only after the coder released the folder. Before → after: *"…and the Integration Suite That Hangs Without `--forceExit`"* → *"…Investigation: …and the Integration Suite's Real Exit Behaviour"*; folder `0197-test-suite-reliability-segfault-and-integration-hang` → `0197-test-suite-reliability-investigation`. 🏁 **OUTCOME — not what the task was filed expecting.** The segfault is an **upstream V8 GC bug, NOT repository-fixable** (five byte-identical `ClearStaleLeftTrimmedPointerVisitor` stacks, ~1 in 170 runs); the brief's own jsdom/`canvas` and memory-pressure hypotheses were **refuted by experiment**, not merely left unconfirmed; the integration hang **does not reproduce at all**. Phase 2 documentation landed — the suite's correct invocation is now durable, closing the reproducibility gap that cost the `0067` reviewer two failed attempts. ⚠️ **Per owner ruling A2 no segfault mitigation was bought; the accepted cost, on the record, is that a red run stays ambiguous** — re-run and record **both** results, never a silent retry. Six review findings, all verdict **CORRECT**, none disputed; four fixed, **R3/R4 accepted as residuals by owner ruling** (both err conservatively, weakening this task's own evidence rather than strengthening it). Verification at close: `npm test` **107/1075 exit 0**, `npm run test:integration` **5/70 exit 0** with no force-exit line, guard rejects unset/empty/whitespace/tab+newline, `tsc --noEmit` and lint **0**, credential scan clean. Findings: `ai-agents/knowledge-base/reports/2026-08-29-0197-test-suite-reliability-findings.md`. The `supertest` flake split out under amendment **A4** is **`0200`** and remains open. 🔒 Variables and filenames only, never values. **Row appended, not inserted** — this board is unranked, so row order encodes no rank (ADR-035))* | [`0197-test-suite-reliability-investigation`](../tasks/done/0197-test-suite-reliability-investigation/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | — | 🚨 **Private Lobbies Are Silently Broken on Yandex Games** — the Start Game URL Misses the Worker Route Entirely (and Blocks Local Testing Too) *(filed 2026-08-28 as a local-dev bug, **escalated to a PRODUCTION defect the same day** when the producer's own escalation condition fired on measurement. **Player-facing impact today: on Yandex Games — the primary distribution channel — starting a private lobby silently fails, and the host's map, difficulty, bot count and game mode never reach the worker.** Neither fetch checks `response.ok`, so nothing surfaces to the player; public games are unaffected. **Root cause:** `FlashistFacade.windowOrigin` is `origin + pathname` (a Flashist Adaptation — upstream used `origin` alone), and three `HostLobbyModal.ts` sites concatenate onto it. **Measured in Chrome against live prod 2026-08-28:** `geoconflict.ru/` → pathname `/` → harmless `//w1/…`, normalized by nginx `merge_slashes` → **works**; `geoconflict.ru/yandex-games_iframe.html` → served 200, real app → pathname `/yandex-games_iframe.html` → `…/yandex-games_iframe.html/w1/api/start_game/<id>` → **404**. ⚠️ **The prod failure is NOT the double slash** — there is no double slash in that URL at all, so `merge_slashes` is irrelevant; it is a path-prefix miss on `^/w(\d+)`, falling to `location /` → `app.get("*")`. A fix that only de-duplicates slashes passes locally and leaves prod broken. **The owner confirmed 2026-08-28** (via `AskUserQuestion` in the lead session) that the Yandex embed loads that path — the one fact the browser could not supply. Also breaks the same way in local dev (no nginx), which is how `0068`'s coder found it. ✅ **Priority High — the owner confirmed the producer's escalation rule, NOT overriding the rank.** ✅ **SPRINT POSITION OWNER-RULED 2026-08-28** (`AskUserQuestion`, lead session): **`0198` sits at the TOP of Sprint 4's open work, above the whole config track** — execution order **`0198` → `0063` → `0062` → `0195` → `0064` → `0060`**, superseding the order in `0195`'s addendum. The producer's recommendation accepted on its grounds: live player-facing failure vs a launch not yet live, no sequencing hazard, client-only and small. The earlier "recommendation only, not acted on" marker is **CLOSED**. 🚢 **DEPLOY COUPLING, owner-ruled the same day: `0198` is fixed FIRST and ships in the SAME production deploy as `0062` and `0063`** — chosen over *deploy now, fix later*, because one deploy then clears all three and shipping without it would knowingly leave a live player-facing defect out of a release that was right there. `0198`'s own step 8 production check rides that deploy. **Coupling, not a dependency** — `**Depends on:**` still reads *nothing* and no status on `0062`/`0063` changes. **Row appended, not inserted** — this board is unranked, so row order encodes no rank; the ruled position lives in prose (ADR-035). 🛑 **UPDATE 2026-08-30 — step 8's production proof is WAIVED by owner ruling** (`AskUserQuestion`, live lead session): the task may close on the local proof. The check is **unsatisfiable, not merely unrun** — `host-lobby-button` and `join-private-lobby-button` sit inside a `display: none` row in `src/client/yandex-games_iframe.html`, the owner's own deliberate choice to disable private lobbies on Yandex Games, so a private lobby started from the Yandex embed has **no route to being reached in production**. The fix **did ship** — production commit `362a2f9`; the three `HostLobbyModal.ts` sites now build root-absolute worker paths instead of concatenating onto `windowOrigin`. Step 8 kept in the brief, struck through with its reasoning, so nobody reinstates it. ✅ **CLOSED 2026-08-30 by a spawned producer on the owner's R8 ruling** (`AskUserQuestion`, live lead session) — review Round 1/2 closed out ✅ *Ready to merge*, zero code defects, and the waived step 8 was the sole remaining gate. ⚠️ **Closes on LOCAL PROOF ONLY — there is no production evidence and there never can be** for the Yandex path, because those buttons are hidden by the owner's deliberate choice; the fix shipped in `362a2f9`, but **its correctness in production is INFERRED FROM THE CODE, NOT OBSERVED**, and no human has checked the work. 📌 **Status drift at close, recorded not hidden:** this row read `🔲 Backlog` while `worklog.md` read `🚧 Blocked — awaiting deploy proof` — the two disagreed; the owner ruled the drift moot and this close overwrites both)* | [`0198-private-lobby-start-url-double-slash`](../tasks/done/0198-private-lobby-start-url-double-slash/brief.md) |
| 🔲 Backlog | — | Confirm and Fix the `supertest` Profile-Server Flake — 9 Failures in 170 Runs *(filed 2026-08-29 and **promoted from the Backlog board into Sprint 4 the same day, owner-ruled** via `AskUserQuestion` in the lead session, on the producer's recommendation — priority **Medium** was the producer's rank and the owner **confirmed rather than disturbed** it. Split out of `0197` under **owner amendment A4** — *characterize the flake inside `0197`, fix it under a separate brief*. **Investigation-first: the mechanism is localized but NOT proven.** ⚠️ **This is the more actionable of the two test-reliability tasks** — `0197`'s segfault turned out to be an **upstream V8 garbage-collector bug with no repository-side fix**, while this one is in **our own test code at roughly ten times the rate (~5.3 % per run vs ~0.5 %)**. **All 9 failures landed in the four `supertest`-based `tests/profile-server/*` suites** — the only four in the repo using `supertest` — and the one sweep containing no supertest suite is the only one with zero failures. **Reproduces on Node 20, 22 and 24 alike, so it is unrelated to the segfault's Node question.** Four symptoms suspected to be one transient localhost HTTP failure (`socket hang up`, 5-second timeouts, unexpected `404`s, a missing `access-control-allow-origin` — a `404` carries no CORS header either); the `404`s are **not** route-registration bugs, both suites register those routes unconditionally. 📌 **It has already cost a wrong turn: this is the failure that was misrecorded as a `SIGSEGV` in `0068`'s `review.md`**, which put a five-suite count into `0197`'s brief. Phase 1 must confirm the mechanism with a `--runInBand` discriminator and standalone ×100 per-suite loops **before** Phase 2 touches a test file; a *"transient localhost condition, not a repository defect"* finding is a legitimate close. ⚠️ Do not cap workers or force `--runInBand` suite-wide without surfacing the permanent runtime cost, and do not mask it with a retry. **Counter-argument on the record:** test infrastructure, no user-visible benefit, and Phase 1 may end with only a finding. **Row appended, not inserted** — this board is unranked, so row order encodes no rank (ADR-035))* | [`0200-supertest-profile-server-flake-confirm-and-fix`](../tasks/backlog/0200-supertest-profile-server-flake-confirm-and-fix/brief.md) |

> **Addendum — task 0200 added out of band (2026-08-29), split out of `0197` under owner amendment A4.**
>
> ✅ **Owner-ruled 2026-08-29 via `AskUserQuestion` in the `fkit lead` session, taking the producer's
> recommendation on all three points:** `0200` is **promoted from the Backlog board into Sprint 4**
> alongside `0196`/`0197`; its **Medium** priority is the producer's rank and the owner **confirmed
> rather than disturbed** it; and `0197` is **renamed only after it closes**, not now.
> ✅ **That rename was carried out 2026-08-30 as part of `0197`'s close** — folder
> `0197-test-suite-reliability-segfault-and-integration-hang` → `0197-test-suite-reliability-investigation`.
> The ruling above stands as written; this line only records that it was executed.
>
> **Grounds accepted for the promotion:** the same rationale used to promote `0197` here on 2026-08-28
> — a random red run destroys the signal every review and every ship gate reads — plus the argument
> `0197` cannot make for itself. **`0197`'s segfault is an upstream V8 GC bug with no repository-side
> fix available. `0200` is in our own test code, at roughly ten times the rate.** If the test signal is
> to be repaired at all, `0200` is the task that can repair it.
>
> ⚠️ **The row above was APPENDED at the end of the status table, and that encodes no rank.** This board
> is unranked (every Priority cell reads `—`), so row order carries no meaning here. This was an
> **append**, not a mid-board insertion above the `✅ Done` rows — the case fkit's **ADR-035** bars. The
> ruling itself lives in this prose, which is where rank belongs on an unranked board.
>
> 📎 **ADR-035 is cited by name, not linked, on purpose** — it is one of fkit's own upstream ADRs (the
> `adr-0XX` series in the install share). This project's `ai-agents/knowledge-base/decisions/` holds only
> the `adr-1XX` series, so a relative link would not resolve.
>
> 🔗 **`0200` is not blocked by `0197` and does not block it.** `**Depends on:** nothing` — `0197`'s
> characterization work is already complete and recorded in its findings report, so `0200` is pullable
> today. The two share a parent investigation, **not a root cause**: different signal, different family,
> and the crash reports settle that they share no worker state.

> **Addendum — task 0198 added out of band (2026-08-28), PRODUCTION defect on the Yandex Games channel.**
> Filed that morning as a local-dev bug (found by `0068`'s coder during that task's mandatory live
> multi-client desync check, **owner-approved for filing** via `AskUserQuestion` in the lead session) and
> **escalated to a production defect the same day.**
>
> **Player-facing impact, stated plainly: on Yandex Games — the primary distribution channel — starting a
> private lobby silently fails, and the host's map, difficulty, bot count and game mode never reach the
> worker.** Neither fetch checks `response.ok`, so nothing surfaces to the player at all. Public games
> are unaffected. This has been live in shipped code; it was found by accident, by a coder testing
> something else, which is itself the argument for the "make the failure audible" half of the brief.
>
> ✅ **Priority HIGH — and this is the owner CONFIRMING the producer's escalation rule, not overriding
> the producer's rank.** The brief was filed at **Medium** carrying an explicit written condition: *"if
> the production pathname is anything other than `/`, this becomes a production defect and the rank
> becomes High."* The lead then **measured it in Chrome against live production (2026-08-28)** —
> `geoconflict.ru/` gives pathname `/` (the safe case), while `geoconflict.ru/yandex-games_iframe.html`
> is served 200 as the real application and gives pathname `/yandex-games_iframe.html` — and the **owner
> confirmed the same day, via `AskUserQuestion` in the lead session, that the Yandex Games embed loads
> that path.** That was the one fact the browser could not establish. The condition fired; the rank
> follows the rule the producer wrote, on evidence that did not exist when Medium was set.
>
> 🔑 **The production failure is NOT the double-slash bug, and mis-reading this will produce a fix that
> does not work.** At the Yandex path there is **no double slash in the URL at all**, so nginx
> `merge_slashes` is irrelevant; the path simply begins `/yandex-games_iframe.html/w1/…`, never matches
> the `^/w(\d+)(/.*)?$` worker location, falls through to `location /` → the game server, whose only
> catch-all is `app.get("*")` — so the PUT/POST 404s. One root cause (`windowOrigin` carries the document
> path), three surfaces: harmless at the root URL, broken on Yandex, broken in local dev (no nginx).
>
> ✅ **SPRINT POSITION OWNER-RULED 2026-08-28** — ruled by the owner that day via `AskUserQuestion` in
> the lead session, relayed to the producer through the lead. **This is not producer precedent for
> re-ranking.** The producer proposed the merit position and flagged it; the owner accepted it.
>
> > **`0198` sits at the TOP of Sprint 4's open work, above the whole config track.**
> > **Execution order is therefore `0198` → `0063` → `0062` → `0195` → `0064` → `0060`**, superseding the
> > order recorded in `0195`'s addendum above and further down this plan (both omit `0198`). The config
> > track's internal order is otherwise unchanged.
>
> **The owner's reasoning, recorded so it is not re-litigated** — the producer's recommendation accepted
> on its own grounds: the config track blocks a *launch that is not live yet* (`0054`'s flag is OFF,
> `0018` has not shipped), while this is failing for players **now**; it has **no sequencing hazard**
> (unlike `0064`, which must land after `0062`/`0063`/`0195`); and it is **client-only and small**, so it
> costs the config track almost nothing to let it go first. **The earlier "producer RECOMMENDS … the
> owner decides" marker is hereby CLOSED — it is no longer an open question.**
>
> 🚢 **DEPLOY COUPLING — OWNER-RULED 2026-08-28, same session and channel. Read this before running a
> production deploy.** **`0198` is fixed FIRST and ships in the SAME production deploy as `0062` and
> `0063`.** The owner chose this over *deploy now, fix later*. **Reasoning on the record:** it is a small
> client-only change, and one deploy then clears **`0062`, `0063` and `0198`** instead of two — shipping
> a deploy without it would knowingly leave a live player-facing defect out of a release that was right
> there. **`0198`'s own step 8 production check rides that same deploy**, so that one deploy is also what
> lets `0198` move off `🚧 Blocked — awaiting deploy proof`.
>
> ⚠️ **This is a deploy coupling, NOT a dependency, and it changes nothing on `0062` or `0063`.**
> `0198`'s `**Depends on:**` line still reads *nothing*; it remains independently buildable. **No status,
> priority or annotation on the `0062` and `0063` rows was altered** — see the note below.
>
> 📌 **Why the coupling is recorded HERE and not on the `0062`/`0063` rows.** `/fkit-task-brief` step 8
> ends *"Never renumber or alter an existing row,"* with an owner-ruled re-rank as its only exception —
> and the ruling relayed to the producer explicitly left the row annotation to the producer's
> conventions rather than ordering it. So the producer took the cheapest-to-reverse branch and **did not
> touch those rows**. An addendum is an *addition*, not an alteration, and it is this board's established
> carrier for exactly this kind of cross-row ordering information — `0195`'s addendum records the
> config-track execution order the same way. Whoever runs the deploy reads this note.
>
> ⚠️ **The row was appended, not inserted, and the ruled position is carried by this note alone.** This
> board is unranked (every Priority cell reads `—`), so row position encodes no rank, and inserting above
> the `✅ Done` rows is what fkit's **ADR-035** (*a mid-board insertion is not the owner-ruled re-rank
> exception*) bars outright — closed rows are never renumbered, and insertion is not the owner-ruled
> exception's to grant. Same treatment `0195` documents for itself. (ADR-035 is cited by name, not
> linked: it is one of fkit's own upstream `adr-0XX` ADRs, which live in the install share, not in this
> project's `ai-agents/knowledge-base/decisions/`.)

> **Addendum — task 0195 added out of band (2026-08-28), production config defect.**
> Found during `0067`'s build and **owner-approved the same day (via the lead session) as its own
> task**, over the alternative of folding a one-line fix into `0067`'s review round — the owner's
> stated reason: it is a live money path and deserves its own verification.
> ✅ **RANK OWNER-CONFIRMED 2026-08-28** — ruled by the owner that day via `AskUserQuestion` in the
> lead session, relayed to the producer through the lead. **This is not producer precedent for
> re-ranking.** The producer proposed the merit position and flagged it; the owner confirmed it.
> **`0195` sits directly below `0062` on the config track**, and the earlier "append rank, NOT a merit
> ranking — flagged for owner confirmation" marker is hereby **closed — it is no longer an open
> question.**
> **Config-track execution order is therefore `0063` → `0062` → `0195` → `0064` → `0060`**, superseding
> the order recorded further down this plan (which omits `0195`).
>
> **The owner's reasoning, recorded so it is not re-litigated:** `0195` is the same defect as `0062` in
> the *other* deploy pipeline; it carries the same "no player-visible symptom today" discount (`0054`'s
> client flag is OFF and `0018` has not gone live); it must precede `0064` for the same reason `0062`
> and `0063` do — armed earlier, the guard correctly fails the very deploy that ships the fix; and it is
> **not** placed above `0062`, because without a profile row there is no purchase to attach.
>
> ⚠️ **The row itself was NOT physically moved, and that is deliberate — the rank above is carried by
> this note, not by row order.** This board is unranked (every Priority cell reads `—`), so row position
> encodes no rank here and the config-track order lives in prose. Moving the row would mean inserting
> above four `✅ Done` rows (`0056`, `0192`, `0193`, `0194`), which **ADR-035** (*a mid-board insertion
> is not the owner-ruled re-rank exception*) bars outright — closed rows are never renumbered, and
> insertion is not the owner-ruled exception's to grant.
>
> 📎 **ADR-035 is cited by name, not linked, on purpose** *(href removed 2026-08-30, owner-ruled)*. It
> is one of **fkit's own upstream ADRs** — the `adr-0XX` series, which lives in the fkit install share.
> This project's `ai-agents/knowledge-base/decisions/` holds only the `adr-1XX` series, so **no href in
> this repo can ever resolve to it**: the link was not merely broken, it was unfixable as a link. Same
> convention `0198`, `0195`, `0196` and `0197` document for themselves. The producer applying this ruling was also a **spawned** producer with no owner channel, which
> `/fkit-task-brief` step 5 independently bars from re-ranking on a spawn-prompt instruction. If the
> owner wants the physical move, it is one edit in a session where they are present.
> 🔎 **The class named in this plan's §9 pattern note has now bitten a third time** — `0062`
> (`PROFILE_INTERNAL_TOKEN`, profile writes no-op), `0063` (`http` on a raw IP), and now `0195`
> (`YANDEX_PAYMENTS_SECRET`, payments 503). `0064` is the guard built to catch exactly this, and this
> is its first instance in the **profile** pipeline rather than the game-server one — which `0064`'s
> scope already covers via the specifics merged from the cancelled `0072`.

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
> 89 suites / 701 tests green, eslint and `tsc --noEmit` clean.
> **Committed 2026-08-22 after the close**, on branch `fix/0055-master-parseable-lobbies-and-exit-diagnostics`
> (`419a116`, off `dev`; 13 files, +1632/−8 — the code, the tests, the incident record, the `0055`
> folder, briefs `0056`–`0059`, and this plan). ✅ **Correction 2026-08-28 — the "not pushed" claim was
> stale and is now false: the branch was merged via PR #133 (`7410bfb`) and `419a116` is an ancestor of
> the pushed `origin/dev` tip `c86b87d`** (verified: `git rev-parse --abbrev-ref @{u}` → `origin/dev`;
> `git merge-base --is-ancestor 419a116 origin/dev` → yes; `remotes/origin/fix/0055-…` also exists).
> ⚠️ **Deployment state remains UNKNOWN — not confirmed either way from the repo**,
> and the close carries no owner verification — verified locally and by review only. **The production
> fix for the empty-body symptom is on the pushed `dev`; whether it is live in production is UNKNOWN**
> (the earlier "*not live*" wording rested on the now-false "not pushed" premise). ⚠️ **Codex review
> coverage was partial**: it returned findings on the test file only and gave no opinion on
> `Master.ts` itself, so the adversarial pass over the changed source did not effectively happen.
> Remaining outage-track order is **`0057` → `0056`**.
>
> 🚨 **The outage track is PAUSED AT REST by owner ruling (2026-08-23): `0057` is not to be started
> yet.** Both remaining tasks read `🔲 Backlog`, which is accurate — but read the standing position
> plainly: **production is still running without worker crash recovery.** `0055` fixed only the
> unparseable-body symptom, and even that is sitting on an unpushed branch. ✅ **Correction 2026-08-28 —
> "unpushed branch" is stale and false:** `0055` merged via PR #133 (`7410bfb`), an ancestor of the
> pushed `origin/dev` tip `c86b87d` (verified `git merge-base --is-ancestor 7410bfb origin/dev`).
> ⚠️ **Whether it is live in production is UNKNOWN — not confirmed either way from the repo.** The
> point of this note is unchanged: the crash-recovery defect below is what production is exposed to.
> The defect that caused the
> 2026-08-22 total loss of public lobbies — no worker is ever restarted after a crash — is **unchanged
> in production**, and every deploy and every container restart re-runs the 20-worker startup that
> triggered it. This is a deliberate owner decision, recorded here so the pause is visible rather than
> looking like drift.
>
> ✅ **RULED 2026-08-23 — the four §9 findings all get briefs.** Previously carried here as an open
> question. The owner selected all four; they are now `0060`–`0063`. Placement was the producer's:
>
> | Task | Board | Why |
> |---|---|---|
> | `0063` prod `/api/env` `http` + raw IP | **Sprint 4** — ✅ **owner-confirmed 2026-08-23** | ⚠️ Filed as a loose end, but an **architect consult found it is already breaking authentication in production** — login never completes, returning users lose their profile, both silently (the user-facing error at `TokenLoginModal.ts:73` is commented out). Login gates citizenship, this sprint's headline. The producer proposed Sprint 4 against the expected Backlog default; the owner reviewed the evidence and confirmed |
> | `0062` `PROFILE_INTERNAL_TOKEN` not forwarded | **Sprint 4** — promoted after verification | 🚨 Filed to Backlog with the blocking claim flagged **unverified**; **verified the same day and it holds.** `isConfigured()` is false in prod → `upsertProfile()` and `creditMatch()` both no-op → **no profile row is ever created and no XP is ever credited in production.** Blocks `0017` **and** `0018`. Fix is one line in `deploy.sh` |
> | `0060` container log retention | **Sprint 4** | Cheap, and the only one that improves our ability to diagnose the *next* incident — which the pause makes more likely, not less |
> | `0061` prod Telegram feedback broken | Backlog | Real, and the strongest remaining promotion candidate — but broken for an unknown period with nobody noticing |
>
> **Config-track execution order: `0063` → `0062` → `0064` → `0060`** *(corrected 2026-08-24,
> owner-ruled — this note previously omitted `0064`, whose brief carried the ruled order all along)*.
> `0063` is broken for **users right now**; `0062` blocks *future* work but has no current
> player-visible symptom, because `0054`'s flag (default OFF) hides the citizenship card; `0064` is
> prevention and **must** follow the two repairs (its guard would correctly fail every deploy on
> their known gaps if armed first); `0060` is insurance and runs in parallel with any of them.
>
> 🔎 **Pattern worth naming — three of these four are the same defect class.** `0061`, `0062` and
> `0063` are all *"production configuration does not match what the application needs, and nothing
> tells anyone."* Each failed silently: a `debug`-level log, a commented-out error, a fail-soft no-op.
> One of them switched off an entire subsystem for an unknown length of time. **Nothing in the deploy
> checks that a variable the application reads is actually forwarded, or that the values are
> well-formed.** `0062` step 4 asks for a recommendation on such a guard rather than building one
> unbidden — **whether that becomes its own task is an open question for the owner** (see the producer's
> hand-off).
>
> ⚠️ **Two recorded premises turned out to be wrong, and the briefs say so.** `0061`: the incident
> record's *"likely needs `TELEGRAM_PROXY_URL`"* does not survive the code — the proxy is wired
> (`Master.ts:217-218,319`) **and** forwarded by the deploy (`deploy.sh:308`), so `0061` is an
> investigation, not a known fix. `0060`: the log retention setting is **not in this repository** at
> all, so it may not be a code change. Also note the incident record's `Master.ts:237` reference has
> drifted to `Master.ts:328` since `0055` added lines; the record is a finished output and was not
> edited.
>
> ✅ **RULED 2026-08-23 — `0059` stays on Backlog and the outage-track pause covers it.** Reasoning
> recorded in `0059`'s own brief with a "re-raise only if" condition, so it is not re-opened without
> it. ⚠️ The accepted cost: if the crash recurs during the pause it will be **as undiagnosable as
> 2026-08-22 was**, because `0055`'s new diagnostics are on an unpushed branch.
> ✅ **Correction 2026-08-28 — "unpushed branch" is stale and false.** `0055` merged via PR #133
> (`7410bfb`) and its diagnostics are present on the pushed `origin/dev` tip `c86b87d` (verified:
> `git merge-base --is-ancestor 419a116 origin/dev` → yes; the exit-reason logging is in
> `src/server/WorkerSupervisor.ts` at HEAD, having moved there from `Master.ts` with `0056`).
> ⚠️ **Whether those diagnostics are live in production is UNKNOWN — not confirmed either way from the
> repo**, so the undiagnosability risk stands or falls on the deploy, not on the push.

> **Addendum — task 0194 added out of band (2026-08-27), owner-ruled at `0192`'s close.** `0192`
> shipped through the sprint ship-loop (agent-closed 2026-08-27) with one recorded residual: the 5 s
> create abort bounds the master's hang on a wedged worker but does not retract a request already in
> the stopped worker's socket buffer, so on recovery the worker still creates public games the master
> has dropped (worklog run 4: 5 orphans, unchanged vs the `0193` baseline of 5). The owner ruled
> **option (A)** — a separate `Worker.ts` brief, filed by the producer at close — over extending
> `0192` or leaving it unfiled. That brief is **`0194`**: ⚠️ **(superseded at build — see the `0194` row above)** check the request socket's closed/aborted
> state before `gm.createGame` and skip creation; worker-only, master untouched, `0192`'s run-4
> procedure is its acceptance test (expect ≈ 0 orphans). **Depends on `0192`** (done). Filed on this
> board rather than the Backlog because it is small, the reproduction procedure is fresh, and it ends
> the outage track — `0057` → `0056` → `0192` → `0194`. This board is unranked, so the Priority cell
> reads `—` — no rank was assigned or displaced; on merit it sits directly below `0192`. ID per
> `conventions/task-id-allocation.md` (next free above `0193`).
>
> **Addendum — tasks 0192 and 0193 added out of band (2026-08-26), owner-ruled on the `0057` findings;
> outage-track hold LIFTED.** The `0057` routing investigation delivered its findings
> ([`reports/2026-08-26-0057-worker-routing-dead-worker-findings.md`](../knowledge-base/reports/2026-08-26-0057-worker-routing-dead-worker-findings.md))
> and the owner reviewed them the same day, ruling: (1) the `0056` quorum **stays 18 of 20, 90 s** —
> the measured residual is ≈ 11 ms and ≈ 0.33 error lines per scheduled game, player-invisible;
> (2) option (v) — rejection-sample the game ID onto a ready index at `Master.ts:509` plus a bounded
> create timeout — becomes brief **`0192`**, master-only, **depends on `0056`**; (3) the `fetchLobbies`
> overlap defect becomes brief **`0193`**, independent of both; (4) the private-lobby client-side
> exposure is **accepted as-is** (recorded in `0192`'s Notes, no brief); (5) the Uptrace §6.3 query is
> the owner's to run later — a `Worker mismatch` hit re-prioritises `0192`; (6) **the 2026-08-23
> "PAUSED AT REST" hold above is lifted — `0056` is startable.** Outage-track order is now
> **`0057` (closing) → `0056` → `0192`**, with `0193` free to ship at any point. `0056`'s brief was
> corrected: its "`0055` not pushed, not deployed" claim was stale — `0055` is on `dev` via PR #133
> (`7410bfb`); **prod deployment of `0055` is unknown, not asserted**. This board is unranked, so both
> new Priority cells read `—` — no rank was assigned or displaced; on merit both sit directly below
> `0056`. IDs follow `conventions/task-id-allocation.md` (next free above `0191`).
>
> **Addendum — tasks 0067 and 0068 scoped out of band (2026-08-24), owner-ruled.** The two TBD rows
> this plan carried since Phase 2 planning — Name Change (Citizens Only) and Citizen Verified Icon —
> are now real briefs (`0067`, `0068`), scoped on the owner's 2026-08-24 ruling (relayed via the lead
> session) together with the `0013` epic close. Both gate their player-facing ship on live citizenship
> (`0017`'s Deferred Live Tail; `0065` adds paid citizens but is not a dependency) and are buildable
> against the local profile stack in the meantime, the same treatment as `0017`/`0012`. `0067` keeps
> its inbox notification hooks as no-op seams per the deferral recorded in `0012`'s brief. This board
> is unranked, so both Priority cells read `—` — no rank was assigned or displaced. Each brief carries
> open questions for the owner (moderation channel + name-surfacing scope on `0067`; icon design on
> `0068`).
>
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
**Brief:** `0124-investigation-player-store` (in `tasks/done/`)
**Blocks:** all citizenship implementation tasks

First persistent per-player database in the codebase. Findings needed on: database technology, hosting location, initial schema, match completion tracking approach, and guest player handling.

---

### Investigation B — Yandex Payments Catalog Integration
**Effort:** 1 day
**Brief:** `0125-investigation-yandex-payments` (in `tasks/done/`)
**Blocks:** all purchase UI tasks

Findings needed on: Yandex payments SDK API, catalog fetch architecture, dashboard setup requirements and approval timeline, purchase-to-server notification approach.

**Action required immediately:** register catalog items in the Yandex Games dashboard as soon as possible — approval can take several days:
- Citizenship: 99 rubles
- (Cosmetics at 149–199 rubles — Sprint 5, but register early)

---

## Phase 1 — Independent Tasks (no investigation dependency)

### 8d-A. Global Announcements Re-enable
**Effort:** half a day
**Brief:** `0126-global-announcements` (in `tasks/done/`)
**Status:** Pending

Re-enable the existing OpenFront announcements feature. JSON-driven content, no backend. Provides the communication channel to announce citizenship before it launches. Ship early in Sprint 4 with seed content announcing citizenship is coming.

---

## Phase 2 — Implementation

> **Briefs to be written after investigation findings are reviewed.**
> The tasks below are the confirmed scope — details and effort estimates will be added once findings are in.

### App Bootstrap — Single Explicit Entry Point
**Brief:** `0167-app-bootstrap-single-entry-point`
**Design doc (authoritative):** `ai-agents/knowledge-base/app-bootstrap-single-entry-point-findings-and-plan.md`

Client-side refactor giving the app one explicit bootstrap sequence: all external-SDK / experiment-flag / user-data / language init finishes *before* any component code runs, with a bounded wait (~5s) and a degraded-mode failure policy. Replaces today's emergent, race-prone init order (driven by webpack import order + custom-element upgrade timing + a lazy `FlashistFacade` singleton). `src/client/` only — no `src/core/` changes. Investigation complete and design agreed with Mark 2026-06-12 (degraded mode, two-part facade init, one PR).

**Foundational for this sprint's SDK work** (citizenship auth, Yandex payments) — it removes the race-condition class those integrations would keep hitting. **Sequence before / with `s4-citizenship-xp-progress-ui`** — that task binds live data into `CitizenshipCard`, which currently carries its own copy of the init gate that this refactor removes.

Production-risk: touches the prod Yandex-iframe boot path — weekend deploy, live Yandex-iframe verification required. New degraded-mode analytics event must be wired during implementation. Discovered side bugs (dead fuse-tag timer, GutterAds unsubscribe) are tracked as separate tasks, not bundled here.

---

### Player Profile Store — Implementation
Implement the database and schema recommended by Investigation A. Foundation for all citizenship and purchase tasks.

**Status: ✅ Done (agent-closed — not owner-verified).** Originally 8 child slices (T1–T8); on 2026-06-19 the monolithic **T4 was reverted (PR #112) and re-decomposed into 9 ops sub-slices (T4a–T4i)** — see the slice tables in `0013-player-profile-store-impl` and `0172-profile-04-backend-infra`. **T4 is complete (T4a–T4i all done as of 2026-06-24) — the profile box is live at `api.geoconflict.ru` (200/TLS) — and T5 (DB + API) is done & merged (PR #126).** With T2 and T7 cancelled, the live path is the backend track (T3 ✅ → T4 ✅ → T5 ✅ → T6 ✅ → T8); T6 (match-end crediting) and T8 (backups) are done — all slices complete; epic closed 2026-08-24 by owner ruling.
- ✅ **T1 — Schema Contract** (`0168-profile-01-schema-contract`) — shared `PlayerProfile` type + pure `migrateProfile()`, done & moved to `done/`. `src/core/profile/PlayerProfile.ts` is kept (it is *not* part of the reverted T2 work). Two boundary notes from its review: (1) `xp` is validated only as a nonnegative int up to `MAX_SAFE_INTEGER` — the persist path (T5) must clamp/reject against the chosen DB column max; (2) the migrate body is untrusted shape-only validation — paid/citizenship fields must be force-cleared/recomputed at the trust boundary in T5, not trusted from the contract.
- ⛔ **T2 — Guest localStorage** — **cancelled 2026-06-13** (Mark); work reverted manually. Report: `ai-agents/knowledge-base/s4-profile-02-guest-localstorage-cancellation-2026-06-13.md`. A client-only, localStorage-authoritative guest-XP store has too much inherent edge surface (idempotency, multi-tab races, partial-write atomicity, platform-auth timing, "eliminated counts" semantics) — four review rounds hardened those and the scope outgrew the intended small client slice. **Steer:** redo guest-XP as a thin best-effort client cache **with/after T5/T6** so the server is the source of truth; carry forward the `MatchQualification.ts` shared-predicate idea into T5/T6 to prevent client/server drift. Net interim baseline: **no one earns profile XP until T5/T6 land** (the only crediting path was this store) — authenticated users and the Yandex leaderboard are unaffected.
- ✅ **T3 — Yandex Identity** (`0170-profile-03-yandex-identity`) — verified Yandex identity plumbing on the join/auth path (Part A), done & moved to `done/` (PR #111).
- ✅ **T4 — Backend Infra** — the monolithic T4 (`0172-profile-04-backend-infra`, PR #112) was **reverted** and re-decomposed into 9 ops sub-slices on 2026-06-19. **T4a–T4i all done — T4 complete; the box is live at `api.geoconflict.ru`.** The parent `0172-profile-04-backend-infra` is retained as the T4 overview:
  - ✅ **T4a — Server skeleton** (PR #115) — Express `/health` skeleton in `src/profile-server/`.
  - ✅ **T4b — Client API-URL config** (PR #116) — `PROFILE_API_URL` via `/api/env`.
  - ✅ **T4c — Dockerfile** (PR #117) — image runs the T4a skeleton.
  - ✅ **T4d — VPS provisioning + DNS** (PR #118) — provisioning *code* (the live box bring-up is T4i).
  - ✅ **T4e — Deploy mechanics** (PR #119/#120/#121) — `setup-profile.sh` + `build-deploy-profile.sh` + compose (split into T4e1/e2/e3).
  - ✅ **T4f — Image secret scan** (PR #123, #124) — build-context secret-leak gate.
  - ✅ **T4g — argv/concurrency hardening** (PR #125) — argv-safety + concurrency lock + atomic deploy record + deploy-target preflight.
  - ✅ **T4h — Game-server deploy env** (`0184-profile-04h-game-server-deploy-env`) — game-server `deploy.sh` now propagates `PROFILE_API_URL` into the container (was `""` in prod without it). *Was the runtime gate for T6 + the Citizenship UI.*
  - ✅ **T4i — Operator bring-up runbook** (`0182-profile-04i-server-bring-up-runbook`) — box provisioned, DNS pointed, merged deploy run, **200/TLS verified — `api.geoconflict.ru` is live.**
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
**Depends on:** source maps live (`0164-enable-client-source-maps`) + archive noise fix deployed (`0159-reduce-archive-telemetry-noise`)

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
`0159-reduce-archive-telemetry-noise` disables it to clear ~26.6/min of telemetry noise.
This task stands up the real S3-backed store the architecture already expects (empty
`storageEndpoint/Bucket/AccessKey/SecretKey` config slots), gates archival to citizen
games only, and re-enables the path. Schedule it at the tail of the citizenship track —
it has no live consumer until match history (a citizen feature) exists. Primarily infra,
but the citizen-gating and re-enable code are required too.

---

### PostgreSQL Backup Routine (Player Profile Store)
**Brief:** `0189-postgres-backup-routine`
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
**Brief:** `0186-personal-data-compliance-investigation`
**Status:** ✅ Done (2026-06-26) — see Outcome below. Findings: `ai-agents/knowledge-base/personal-data-152fz-findings.md`.
**Outcome — SUPERSEDED 2026-06-28.** The 2026-06-26 decision (pseudonymize via an irreversible Yandex-ID hash) was **overturned on further investigation: hashing does NOT remove the 152-ФЗ notification/consent obligation** — it only added support/dev complexity for no legal benefit. The hashing task (`0187-profile-hash-player-ids`) is **cancelled** and PR #127 was reverted. **152-ФЗ is therefore unresolved** — and per Mark (2026-06-28) the compliance work is **deferred to the backlog sprint** (`0048-compliance-152fz-notification-consent`) with **risk explicitly accepted**. It **no longer gates profile-store production go-live in Sprint 4**; the documented, accepted consequence is that real PII persists in prod before notification/consent exist. The findings doc (`personal-data-152fz-findings.md`) is retained but marked **INVALIDATED**. The historical investigation framing follows for context.

Third, distinct legal track (separate from the cleared VAT gate and the in-progress IP/licensing track), flagged by the technical specialist 2026-06-13. Storing real users' Yandex IDs + display names in the profile store triggers 152-ФЗ obligations: **operator notification** to Roskomnadzor and a **user-consent flow** + privacy policy. Data residency (Art. 18.5) is already satisfied (Postgres on the RU game VPS). Locked with Mark 2026-06-13: scope it investigation-first — a Russian data-protection lawyer determines what notification/consent require, whether Yandex platform terms already cover identity-data consent, the minors angle, retention/deletion duties, and the true blocking relationship; the lawyer's findings set the final gate. **Interim stance until findings:** treat as gating the profile-store *production* go-live (don't persist real PII in prod before notification filed + consent live); dev/test with non-real data is fine. Profile store is still backlog, so **start the legal consultation now** to clear in parallel. Consent fields (given / version / timestamp) should feed the profile-store schema; deletion support interacts with the deferred S3 archival. Engineering consent-flow brief scoped from findings.

---

### Name Change (Citizens Only)
**Brief:** [`0067-name-change-citizens-only`](../tasks/done/0067-name-change-citizens-only/brief.md) *(scoped 2026-08-24, owner-ruled)*
**Status:** ✅ Done (agent-closed — not owner-verified) — closed 2026-08-28 by a spawned producer, no owner present. ⚠️ **Built-awaiting-deploy, the same posture as `0062`/`0063`: nothing here is verified in production.** The citizenship card has never been seen in a browser (`CITIZENSHIP_CARD_ENABLED` is `false` — UI is unit-proven only); the operator Telegram notification is unit-proven only (profile-VPS proxy reachability untested — belongs to `0033`). **Open residuals:** (a) forged client-asserted id can submit an offensive name in a citizen's name — mitigated by the moderation gate, closes on `0014`; (b) 🚨 **the pending, unmoderated name is publicly readable via the unauthenticated profile endpoint — UNMITIGATED, it passes no gate at all**; (c) in-process notification cooldown allows one extra message on restart or a second instance (deliberate). See the brief's close-out section and its `review.md`.

First citizenship benefit. Citizens can change their display name. Requires moderation step (name review). Non-citizens cannot access this feature.

**Owner rulings 2026-08-28** (lead session, `AskUserQuestion`) — these close the brief's three open questions:
- **(a) Moderation channel:** Telegram notification on a new pending request, via the **existing** bot pipeline (feedback-message precedent), **plus** a service-authenticated internal approve/reject endpoint. **No moderation UI.**
- **(b) Scope of the approved name:** **profile/citizenship card only.** Start-screen username prefill/lock, lobby lists and in-match labels are **out of scope** and become a separate follow-up task.
- **(c) Validation:** mirror the **existing** in-game username validation (length/charset) plus the profile schema's case-insensitive uniqueness index. No new bespoke rules.

---

### Citizen Verified Icon
**Brief:** [`0068-citizen-verified-icon`](../tasks/done/0068-citizen-verified-icon/brief.md) *(scoped 2026-08-24, owner-ruled)*

Citizen icon visible in lobbies and match player list. Distinguishes citizens from non-citizens.

**Owner ruling 2026-08-28** (lead session, `AskUserQuestion`) — closes the brief's open question: ship with a **neutral placeholder glyph now**, and file the real icon design as a **follow-up task** (the `0066` favicon precedent). No country or flag imagery either way — Yandex bans it. The design question is no longer a blocker on this task.

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

See full brief: `0119-nations-balance`

---

## AI Player Lobby Slot Bug — Always Keep One Slot Free

**Effort:** half a day
**Experiments:** ❌ Excluded — bug fix.
**Note:** may interact with the Humans vs Nations balance task — implement together or in sequence.

AI players can currently fill all lobby slots including the last one, causing the lobby to show 10/10 with a mix of real and AI players. The game does not start and real players cannot join — the lobby is stuck.

Fix: enforce `ai_count ≤ lobby_max - 1` at all times. When a real player joins a full-AI lobby, displace one AI to restore the free slot. Update the "lobby full → start" condition to only fire when no AI players remain.

See full brief: `0117-ai-lobby-slot-bug`

---

## Tutorial — Pause During Action-Required Steps

**Status:** ⛔ Cancelled (2026-04-18) — created too many implementation problems.

See full brief: `0120-tutorial-action-pause`

---

## Tutorial — Remove Nations, Keep Only Bots

**Effort:** 1–2 hours (config change only)
**Experiments:** ❌ Excluded — tutorial improvement.

Tutorial currently includes nation bots which can be aggressive even on Easy difficulty. Remove nations from the tutorial match entirely — keep only regular small bots. Makes the tutorial trivially winnable so new players learn mechanics without frustration.

See full brief: `0122-tutorial-no-nations`

---

## Tutorial — Lock Build Menu to City During Tooltip 5

**Effort:** half a day
**Experiments:** ❌ Excluded — tutorial bug fix.
**Interaction:** coordinate with action-pause task (`0120-tutorial-action-pause`) — both modify tooltip 5 behaviour.

During tooltip 5 (build a City), all non-City building icons are clickable even if the player can afford them. A player who accidentally builds the wrong structure breaks the tooltip sequence (tooltip 6 only fires on City built). Fix: force all non-City icons into the same disabled state used when a player lacks sufficient gold. City icon remains fully enabled. Normal state restored when tooltip 5 is dismissed, City is built, or tutorial is skipped.

See full brief: `0121-tutorial-build-menu-lock`

---

## Tutorial — Reduce Bot Count from 400 to 100

**Effort:** 30 minutes (single config value change)
**Experiments:** ❌ Excluded — tutorial improvement.

Tutorial currently spawns 400 bots — same order of magnitude as a full multiplayer match. Reduces to 100 to make the map less chaotic and give new players more room to learn without being immediately overwhelmed.

See full brief: `0123-tutorial-reduce-bots`

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

See full brief: `0127-email-subscribe`

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
