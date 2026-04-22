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
| ✅ Done | Start Screen Redesign — Tab Layout Investigation (design) | `s4-start-screen-redesign-investigation.md` |
| ⬜ Backlog | Start Screen Redesign — Implementation | `s4-start-screen-redesign-impl.md` |
| ⬜ Backlog | Player Profile Store — Implementation | `s4-player-profile-store-impl.md` |
| ⬜ Backlog | Yandex Payments — Catalog Fetch & Purchase Infrastructure | `s4-yandex-payments-impl.md` |
| ⬜ Backlog | Citizenship Core — XP Counter & Progress UI *(blocked: start screen redesign impl)* | `s4-citizenship-xp-progress-ui.md` |
| ⬜ Backlog | Citizenship Core — Earned Citizenship *(blocked: player profile store)* | `s4-citizenship-earned.md` |
| ⬜ Backlog | Citizenship Core — Paid Citizenship *(blocked: payments + catalog approval)* | `s4-citizenship-paid.md` |
| ⬜ Backlog | 8d-B. Personal Inbox *(blocked: player profile store)* | `s4-8d-b-task-personal-inbox.md` |
| ⬜ Backlog | Name Change (Citizens Only) | TBD |
| ⬜ Backlog | Citizen Verified Icon | TBD |
| ⛔ Cancelled | Humans vs Nations — Balance Nation Count | `s4-nations-balance-task.md` |
| ✅ Done | AI Lobby Slot Bug — Always Keep One Slot Free | `s4-ai-lobby-slot-bug.md` |
| ⛔ Cancelled | Tutorial — Pause During Action-Required Steps | `s4-tutorial-action-pause.md` |
| ✅ Done | Tutorial — Remove Nations, Keep Only Bots | `s4-tutorial-no-nations.md` |
| ✅ Done | Tutorial — Lock Build Menu to City During Tooltip 5 | `s4-tutorial-build-menu-lock.md` |
| ✅ Done | Tutorial — Reduce Bot Count from 400 to 100 | `s4-tutorial-reduce-bots.md` |
| ✅ Done | Email Subscription Modal | `s4-email-subscribe-task.md` |

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
