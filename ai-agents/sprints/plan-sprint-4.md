# Geoconflict — Sprint 4 — In-App Monetization & Citizenship

> See [plan-index.md](plan-index.md) for strategic logic, experiments policy, and full priority table.

---

## Sprint 4 Goal

Launch the citizenship system and in-app purchase foundation. Give loyal players a visible long-term goal (1,000 XP, earned at 10 XP per qualifying match), a direct purchase path (99 rubles), and the first meaningful citizenship benefit (name change). Establish the payment infrastructure and player profile store that all future monetization builds on.

**Rewarded ads are explicitly deferred** — no reward mechanic exists yet. Rewarded ads ship in Sprint 5 once citizenship benefits give players something worth watching an ad for.

---

## Sprint 4 Status

| Status | Task | Brief |
|---|---|---|
| ✅ Done | Investigation A — Player Profile Store | `s4-investigation-player-store.md` |
| ✅ Done | Investigation B — Yandex Payments Catalog | `s4-investigation-yandex-payments.md` |
| ✅ Done | 8d-A. Global Announcements Re-enable | `s4-8d-a-task-global-announcements.md` |
| ⚠️ Urgent | Yandex Catalog Registration (manual, non-engineering) | `s4-yandex-catalog-registration.md` |
| ✅ Done | Solo Mode: Opponent Win Condition Not Triggering Loss | `s4-solo-win-condition-fix.md` |
| ✅ Done | Fix: Space Key Blocked in Feedback Modal During Match | `s4-feedback-modal-space-key.md` |
| ✅ Done | Investigation — Missions Mode Difficulty Curve | `s4-missions-difficulty-investigation.md` |
| ✅ Done | Nuke Pre-Launch Trajectory: Increase Line Thickness | `s4-nuke-trajectory-visibility.md` |
| ⬜ Backlog | Map Labels: Show Troops/Max + Attacking Troops | `s4-map-population-army-labels.md` |
| ⬜ Backlog | Public Modifier: Add "5M Starting Gold" *(companion to infinite-gold removal)* | `s4-starting-gold-public-modifier.md` |
| ✅ Done | Teams Mode: Cap Maximum Teams at 4 | `s4-teams-mode-max-teams.md` |
| ✅ Done | Start Screen Redesign — Tab Layout Investigation (design) | `s4-start-screen-redesign-investigation.md` |
| ✅ Done | Start Screen Redesign — Implementation | `s4-start-screen-redesign-impl.md` |
| ⬜ Backlog | App Bootstrap — Single Explicit Entry Point *(client boot-path refactor; investigation done, design locked)* | `s4-app-bootstrap-single-entry-point.md` |
| ⬜ Backlog | Player Profile Store — Implementation | `s4-player-profile-store-impl.md` |
| ⬜ Backlog | PostgreSQL Backup Routine (Profile Store) — off-box, daily *(needs: profile store schema; must be live before Paid Citizenship)* | `s4-postgres-backup-routine.md` |
| ⬜ Backlog | Personal-Data Compliance (152-ФЗ): Roskomnadzor notification + consent flow *(investigation-first; interim-gates profile-store prod launch)* | `s4-personal-data-compliance-investigation.md` |
| ⬜ Backlog | Yandex Payments — Catalog Fetch & Purchase Infrastructure | `s4-yandex-payments-impl.md` |
| ⬜ Backlog | Citizenship Core — XP Counter & Progress UI *(blocked: start screen redesign impl)* | `s4-citizenship-xp-progress-ui.md` |
| ⬜ Backlog | Citizenship Core — Earned Citizenship *(blocked: player profile store)* | `s4-citizenship-earned.md` |
| ⬜ Backlog | Citizenship Core — Paid Citizenship *(blocked: payments + catalog approval)* | `s4-citizenship-paid.md` |
| ⬜ Backlog | 8d-B. Personal Inbox *(blocked: player profile store)* | `s4-8d-b-task-personal-inbox.md` |
| ⬜ Backlog | S3-Backed Match Archival (Citizen-Gated) *(blocked: player profile store + citizenship + S3 infra)* | `s4-archive-s3-backed-citizen-gated.md` |
| ⬜ Backlog | Investigate & Fix Client Null-ID Errors *(stabilization follow-up; needs source maps + deployed archive fix)* | `s4-investigate-null-id-errors.md` |
| ⬜ Backlog | Name Change (Citizens Only) | TBD |
| ⬜ Backlog | Citizen Verified Icon | TBD |
| ⛔ Cancelled | Humans vs Nations — Balance Nation Count | `s4-nations-balance-task.md` |
| ✅ Done | AI Lobby Slot Bug — Always Keep One Slot Free | `s4-ai-lobby-slot-bug.md` |
| ⬜ Backlog | Asset audit: confirm no proprietary/CDN assets in production bundle *(prerequisite: paid citizenship)* | `s4-licensing-asset-audit.md` |
| ⛔ Cancelled | Tutorial — Pause During Action-Required Steps | `s4-tutorial-action-pause.md` |
| ✅ Done | Tutorial — Remove Nations, Keep Only Bots | `s4-tutorial-no-nations.md` |
| ✅ Done | Tutorial — Lock Build Menu to City During Tooltip 5 | `s4-tutorial-build-menu-lock.md` |
| ✅ Done | Tutorial — Reduce Bot Count from 400 to 100 | `s4-tutorial-reduce-bots.md` |
| ✅ Done | Email Subscription Modal | `s4-email-subscribe-task.md` |
| ✅ Done | Telegram Channel Link (start screen, game-end screen) | `s4-telegram-link.md` |
| ✅ Done | VK Channel Link (start screen, game-end screen) | `s4-vk-link.md` |

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
**Brief:** `s4-investigation-player-store.md`
**Blocks:** all citizenship implementation tasks

First persistent per-player database in the codebase. Findings needed on: database technology, hosting location, initial schema, match completion tracking approach, and guest player handling.

---

### Investigation B — Yandex Payments Catalog Integration
**Effort:** 1 day
**Brief:** `s4-investigation-yandex-payments.md`
**Blocks:** all purchase UI tasks

Findings needed on: Yandex payments SDK API, catalog fetch architecture, dashboard setup requirements and approval timeline, purchase-to-server notification approach.

**Action required immediately:** register catalog items in the Yandex Games dashboard as soon as possible — approval can take several days:
- Citizenship: 99 rubles
- (Cosmetics at 149–199 rubles — Sprint 5, but register early)

---

## Phase 1 — Independent Tasks (no investigation dependency)

### 8d-A. Global Announcements Re-enable
**Effort:** half a day
**Brief:** `s4-8d-a-task-global-announcements.md`
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
**Brief:** `s4-8d-b-task-personal-inbox.md`
Direct messages from game to citizens. Personal tab in announcements popup. Messages stored server-side. Initial triggers: citizenship earned/purchased, name change approved/rejected.

**Depends on:** 8d-A live, player profile store live

---

### Investigate & Fix Client Null-ID Errors
**Brief:** `s4-investigate-null-id-errors.md`
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
**Brief:** `s4-archive-s3-backed-citizen-gated.md`
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
**Interim-gates:** Player Profile Store production launch → citizenship launch.

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

**Status:** ⛔ Cancelled — created too many implementation problems.

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
**Brief:** `s4-map-population-army-labels.md`

Enrich the on-map country labels (`NameLayer.ts`) to mirror the hover info panel: show the troops line as `current / max` (e.g. "10K / 100K") and, when a country is attacking, add a red line below with the total attacking troops. Pure `src/client/` change — all data is already available client-side (`PlayerInfoOverlay` renders the same values today via `player.troops()`, `config.maxTroops(player)`, and summed `outgoingAttacks()`), so no investigation and no `src/core/` work. Visual/live verification at multiple zoom levels and against an attacking country; watch label clutter at mid zoom.

---

## Public Modifier — Add "5M Starting Gold"

**Effort:** ~1 day
**Experiments:** ❌ Excluded — match-quality change, ships to all players.
**Independent** — no dependency on citizenship or payments.
**Companion:** `s4c-disable-infinite-gold-public-rotation.md` (kept separate — removes infinite gold).
**Brief:** `s4-starting-gold-public-modifier.md`

Replace the degenerate infinite-gold public modifier with a bounded one: a one-time **5M starting gold** grant for real players (`Human` + `AiPlayer` only — nations and filler bots stay at 0). Infinite gold makes nuke-rush the only tactic and turns public matches into frustrating chaos for new players; a finite head-start gives an economic boost without the endless free nuking. Adds a new `startGold` `GameConfig` field (schema + every config literal, client and server), a `startGold(playerInfo)` config method mirroring `startManpower`, player-init wiring in `src/core/`, a "5M Starting Gold" lobby badge, and en/ru localization. Recipient predicate matches the existing `infiniteGold` `Human || AiPlayer` gate. Locked with Mark 2026-06-13: recipients = real players only, amount = 5M, public rotation only. `src/core/` desync-sensitive (all config literals must carry the field); live public-rotation spot-check is the verification gate. Sequence after / with the companion infinite-gold removal.

---

## Email Subscription Modal

**Effort:** half a day
**Experiments:** ❌ Excluded — new feature, ships to all players.
**Independent** — no dependencies.

Add a "Subscribe to updates" modal with a single email input field. Entry point buttons added to both the match start and match end modals. On submit, the email is sent to the Telegram bot via the existing feedback pipeline as a new message type. No frequency capping or duplicate checks in v1.

See full brief: `s4-email-subscribe-task.md`

---

## Notes

- **Register Yandex catalog items immediately** — approval takes days and should not block implementation
- **Earned path is independent of payments** — the XP progression path can ship before the Yandex payment catalog is approved
- **Phase 2 briefs will be written** once both investigation findings are reviewed with Mark
