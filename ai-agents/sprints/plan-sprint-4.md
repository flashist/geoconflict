# Geoconflict — Sprint 4 — In-App Monetization & Citizenship

> See [plan-index.md](plan-index.md) for strategic logic, experiments policy, and full priority table.

---

## Sprint 4 Goal

Launch the citizenship system and in-app purchase foundation. Give loyal players a visible long-term goal (50 qualifying matches), a direct purchase path (99 rubles), and the first meaningful citizenship benefit (name change). Establish the payment infrastructure and player profile store that all future monetization builds on.

**Rewarded ads are explicitly deferred** — no reward mechanic exists yet. Rewarded ads ship in Sprint 5 once citizenship benefits give players something worth watching an ad for.

---

## Sprint 4 Status

| Status | Task | Brief |
|---|---|---|
| ⬜ Backlog | Investigation A — Player Profile Store | `s4-investigation-player-store.md` |
| ⬜ Backlog | Investigation B — Yandex Payments Catalog | `s4-investigation-yandex-payments.md` |
| ⬜ Backlog | 8d-A. Global Announcements Re-enable | `s4-8d-a-task-global-announcements.md` |
| ⬜ Backlog | Player Profile Store — Implementation | TBD after investigation |
| ⬜ Backlog | Yandex Payments — Catalog Fetch & Caching | TBD after investigation |
| ⬜ Backlog | Citizenship Core — Match Counter & Progress UI | TBD after investigation |
| ⬜ Backlog | Citizenship Core — Earned Citizenship | TBD after investigation |
| ⬜ Backlog | Citizenship Core — Paid Citizenship | TBD after investigation |
| ⬜ Backlog | 8d-B. Personal Inbox | `s4-8d-b-task-personal-inbox.md` |
| ⬜ Backlog | Name Change (Citizens Only) | TBD after investigation |
| ⬜ Backlog | Citizen Verified Icon | TBD after investigation |

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
Track qualifying matches server-side toward the 50-match threshold. Progress visible to authorized players in the UI. Guest players see no progress UI.

**Qualifying match definition:**
- ✅ Counts: eliminated by another player or bot, survived to match end (any outcome)
- ❌ Does not count: voluntary Leave mid-match, disconnect without return, never spawned

---

### Citizenship Core — Earned Citizenship
When a player reaches 50 qualifying matches: flip `isCitizen = true`, send personal inbox message ("You've earned Geoconflict Citizenship!"), show real-time in-game notification.

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

## Qualifying Match Definition (locked)

| Outcome | Counts? |
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

## Notes

- **Register Yandex catalog items immediately** — approval takes days and should not block implementation
- **Earned path is independent of payments** — the 50-match counter can ship before the Yandex payment catalog is approved
- **Phase 2 briefs will be written** once both investigation findings are reviewed with Mark
