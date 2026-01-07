# Feature Spec — AI Players (v0 Draft)

## 1) Overview
Introduce **AI Players** that join multiplayer lobbies during the **preparation countdown** to simulate healthy player presence and reduce perceived waiting/emptiness. AI Players must be **indistinguishable from real players in UI/flow**, while remaining **server‑labeled** for analytics and safeguards.

AI Players reuse existing **nation AI** decision logic by binding it to a **player session** control source.

## 2) Scope
### In
- Inject AI Players into the lobby only during **preparation countdown**.
- Show lobby population as **humans + AI**.
- Ensure humans always have priority for slots.
- Start match unchanged (existing countdown rules).
- AI Players participate in match using **nation AI** with **MEDIUM** difficulty.

### Out
- Changing core nation AI behavior, balancing, or decision quality.
- Adding explicit AI markers in client UI.
- Persistent profiles, progression, personalization, or personal data.
- New chat/emote behaviors beyond existing default capability.

## 3) UX & Lobby Flow
- During preparation:
  - Client displays **Players waiting: N** where `N = N_humans + N_ai`.
  - AI join events are broadcast like normal player joins.
  - AI names follow existing `Anon[X]` format and appear identical to human names.
- Humans joining:
  - If lobby is at capacity and AI exists, server removes AI first to free slots.
- Transition to match start:
  - Lobby starts per existing rules. AI Players already in lobby enter match.

Copy rules:
- Do not add any disclosure string in lobby UI.

## 4) Server Rules & Algorithms
### Definitions
- `TIMEOUT_SEC`: preparation countdown duration.
- `tickMs`: server tick cadence for lobby management.
- `t_passed`: seconds elapsed since countdown start.
- `coef = clamp01(t_passed / TIMEOUT_SEC)`.
- `capacity`: lobby/map max players.
- `N_humans`: current human players in lobby.
- `N_ai`: current AI Players in lobby.
- `N_total = N_humans + N_ai`.

### Target curve
Goal: increase **visible total players** over time.

- `targetTotalByTimeout`: desired **total** players (humans+AI) visible by the end of countdown, clamped by capacity.
- `targetTotal(t) = floor(min(capacity, targetTotalByTimeout) * coef)`.

### Hard constraints
- Human priority: never block a human join when AI can be removed.
- Reservation: keep at least `minHumanSlots` available for humans when feasible.
- AI cap: `N_ai <= aiPlayersMax`.

### Core loop (each tick during preparation)
1. Compute `target = targetTotal(t)`.
2. Compute `maxAiAllowedNow = clamp(0, aiPlayersMax, capacity - max(0, minHumanSlots - N_humans))`.
3. Enforce reservation and capacity:
   - If `N_total > capacity`: remove AI until `N_total == capacity`.
   - If `N_ai > maxAiAllowedNow`: remove AI until `N_ai == maxAiAllowedNow`.
4. Inject AI to meet target (within caps):
   - `requiredTotal = max(N_humans, target)`.
   - `desiredAi = clamp(0, maxAiAllowedNow, requiredTotal - N_humans)`.
   - If `N_ai < desiredAi`: add `desiredAi - N_ai` AI Players using jitter scheduling.
5. Never remove AI merely because `N_total > target`.

### Human join handler
On human join request:
- If `N_total < capacity`: accept.
- If `N_total == capacity` and `N_ai > 0`: remove 1 AI (last‑joined) then accept.
- If `N_total == capacity` and `N_ai == 0`: apply existing lobby behavior (reject/queue).

### Jitter scheduling
- Add AI join events with per‑join delay sampled from `joinJitterMs`.
- Use server‑side deterministic RNG keyed by `lobbyId` and `joinIndex` to keep behavior stable across restarts and consistent across clients.

### AI instantiation
- Allocate unique name via `Anon[X]` allocator.
- Create player session with server‑only flag `is_ai_player=true`.
- Bind nation AI control source to that session.
- Set difficulty `MEDIUM`.

### Removal ordering
- Remove **last‑joined AI** first to mimic churn and minimize perceived manipulation.

## 5) Config Schema
### JSON (server)
```json
{
  "$schema": "geoconflict://schemas/ai-players-config-v1.json",
  "enabled": true,
  "timeoutSec": 120,
  "tickMs": 500,
  "targetTotalByTimeout": 10,
  "aiPlayersMax": 10,
  "humanPriority": true,
  "minHumanSlots": 1,
  "joinJitterMs": { "min": 300, "max": 2000 },
  "name": { "prefix": "Anon", "start": 1, "reserve": 10000 },
  "difficulty": "MEDIUM"
}
```

Notes:
- `targetTotalByTimeout` and `aiPlayersMax` are intentionally separate:
  - `targetTotalByTimeout` controls perceived fullness.
  - `aiPlayersMax` caps AI injection.

## 6) Data Model & Storage
- Server‑only session flag: `is_ai_player`.
- Do not serialize `is_ai_player` to client payloads.
- Persist nothing beyond existing match telemetry.

## 7) Telemetry & KPIs
### Events
- `lobby_tick` { t, target, humans, ai, capacity }
- `ai_player_added` { name, t, reason }
- `ai_player_removed` { name, t, reason }
- `human_join_displaced_ai` { t }
- `match_start` { humans, ai, capacity }

### KPIs
- Median time‑to‑start vs baseline.
- % lobbies reaching `>= targetTotalByTimeout` visible total by end of countdown.
- Human displacement rate (should be ~0 when AI present).
- Retention uplift on first 1–3 matches (experiment).
- Reports/complaints trend for “fake players” keyword (guardrail).

## 8) Security & Abuse Prevention
- Server‑authoritative injection/removal; client cannot request AI.
- Ignore client claims about AI status.
- Rate‑limit AI add/remove operations per lobby.
- Do not expose AI flags in public APIs.
- Name sanitation and profanity checks.
- Prevent impersonation of human names (name allocator must avoid active human names).

## 9) Performance Budget
- Lobby tick ops O(1) amortized; no per‑tick full scans.
- Maintain a small AI list per lobby for O(1) removal (stack by join order).
- Cap AI joins by `aiPlayersMax`.
- Load test target: 1k concurrent lobbies × `aiPlayersMax` 10.

## 10) Testing Strategy
- Unit:
  - `targetTotal(t)` monotonicity.
  - clamps: capacity, aiPlayersMax, minHumanSlots.
  - name uniqueness in lobby.
- Property:
  - `N_total <= capacity` invariant.
  - `N_ai <= aiPlayersMax` invariant.
  - human join never rejected when `N_ai > 0` at capacity.
- Integration:
  - concurrent human joins while AI is being scheduled.
  - server restart during countdown; deterministic jitter behavior.
- E2E:
  - UI count equals `N_humans + N_ai`.
  - no explicit AI disclosure in client UI.
- Load:
  - 95p tick time within budget under max concurrency.

## 11) Risks & Mitigations
- Perceived deception:
  - keep AI only in preparation; consider TOS disclosure outside gameplay UI.
  - keep telemetry guardrails and fast rollback.
- Slot contention:
  - enforce human priority; reserve `minHumanSlots`.
- Name collisions:
  - allocator with reserve pool; avoid active human names.
- Performance spikes:
  - jittered join scheduling; bounded operations.
- Abuse:
  - rate limits; no client control.

## 12) Rollout Plan
- Feature flag: `feature.aiPlayers`.
- Gradual ramp by region/queue.
- A/B test: enabled vs disabled.
- Guardrails:
  - human displacement rate.
  - crash/tick regressions.
  - complaint spikes.
- Immediate rollback path (disable flag).

## 13) Engineer Task Breakdown
1. Add config loader + schema validation for `ai-players-config-v1`.
2. Implement lobby tick module:
   - compute target
   - enforce clamps
   - schedule jittered joins
   - remove AI on capacity pressure
3. Implement deterministic RNG seed derivation from `lobbyId`.
4. Implement AI session creation:
   - allocate `Anon[X]`
   - create player session
   - attach nation AI (MEDIUM)
5. Implement removal stack (last‑joined AI first).
6. Wire lobby population messages to use `humans + ai`.
7. Add telemetry events and KPI aggregation hooks.
8. Add unit/integration/load tests.
9. Wire feature flag and rollout controls.

## Assumptions (explicit)
- Match start timing is fixed by existing countdown and not accelerated.
- Lobby capacity is authoritative server‑side and already enforced.
- `Anon[X]` allocator exists or can be extended server‑side.
- Nation AI can be bound to a player session without changing its core logic.

